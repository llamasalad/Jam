import UIKit
import SwiftUI
import Capacitor
import AVFoundation
import MediaPlayer

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        } catch {
            print("Failed to set audio session category: \(error)")
        }

        let hostingController = UIHostingController(rootView: MainSwiftUIView())
        hostingController.view.backgroundColor = .clear

        let window: UIWindow
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            window = UIWindow(windowScene: windowScene)
            window.frame = windowScene.screen.bounds
        } else {
            window = UIWindow()
            window.frame = window.screen.bounds
        }
        window.rootViewController = hostingController
        window.makeKeyAndVisible()
        self.window = window

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    @available(iOS, deprecated: 26.0)
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

private final class StreamResourceLoader: NSObject, AVAssetResourceLoaderDelegate, URLSessionDataDelegate {
    let originalURL: URL
    let contentTypeUTI: String
    let isTranscoded: Bool
    let loaderQueue: DispatchQueue

    private var session: URLSession?
    private var mainTask: URLSessionDataTask?
    private var mainTaskRequestedOffset: Int = 0
    private var bytesToSkipOnMainTask: Int = 0
    private var mainRetryCount: Int = 0

    private struct AuxTaskInfo {
        let request: AVAssetResourceLoadingRequest
        var expectedOffset: Int64
    }
    private var auxTasks: [Int: AuxTaskInfo] = [:]
    private var pendingRequests: [AVAssetResourceLoadingRequest] = []

    private var buffer = Data()
    private var responseContentLength: Int64 = 0
    private var serverSupportsByteRanges: Bool = false
    private var hasReceivedInitialResponse: Bool = false
    private var isDownloadComplete: Bool = false
    private var isCancelled: Bool = false

    init(originalURL: URL, contentTypeUTI: String) {
        self.originalURL = originalURL
        self.contentTypeUTI = contentTypeUTI
        let urlStr = originalURL.absoluteString
        self.isTranscoded = urlStr.contains("maxBitRate=") || urlStr.contains("format=mp3")
        self.loaderQueue = DispatchQueue(label: "com.jam.streamloader.\(UUID().uuidString)")
        super.init()

        let opQueue = OperationQueue()
        opQueue.maxConcurrentOperationCount = 1
        opQueue.underlyingQueue = self.loaderQueue

        let config = URLSessionConfiguration.ephemeral
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 600
        self.session = URLSession(configuration: config, delegate: self, delegateQueue: opQueue)
    }

    static func makeCustomURL(from url: URL, fileExtension: String) -> URL? {
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let scheme = components.scheme?.lowercased() else {
            return nil
        }
        if scheme == "https" {
            components.scheme = "jamstreams"
        } else if scheme == "http" {
            components.scheme = "jamstream"
        } else {
            return nil
        }
        if !fileExtension.isEmpty && !components.path.lowercased().hasSuffix(".\(fileExtension.lowercased())") {
            components.path += ".\(fileExtension.lowercased())"
        }
        return components.url
    }

    func cancel() {
        loaderQueue.async { [weak self] in
            guard let self = self, !self.isCancelled else { return }
            self.isCancelled = true
            self.mainTask?.cancel()
            self.mainTask = nil
            self.auxTasks.removeAll()
            for req in self.pendingRequests where !req.isFinished && !req.isCancelled {
                req.finishLoading(with: NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled, userInfo: nil))
            }
            self.pendingRequests.removeAll()
            self.session?.invalidateAndCancel()
            self.session = nil
            self.buffer.removeAll(keepingCapacity: false)
        }
    }

    // MARK: - AVAssetResourceLoaderDelegate

    func resourceLoader(_ resourceLoader: AVAssetResourceLoader, shouldWaitForLoadingOfRequestedResource loadingRequest: AVAssetResourceLoadingRequest) -> Bool {
        guard !isCancelled else { return false }
        pendingRequests.append(loadingRequest)
        startMainDownloadIfNeeded()
        processPendingRequests()
        return true
    }

    func resourceLoader(_ resourceLoader: AVAssetResourceLoader, didCancel loadingRequest: AVAssetResourceLoadingRequest) {
        pendingRequests.removeAll { $0 === loadingRequest }
        if let entry = auxTasks.first(where: { $0.value.request === loadingRequest }) {
            let taskId = entry.key
            auxTasks.removeValue(forKey: taskId)
            session?.getAllTasks { tasks in
                tasks.first(where: { $0.taskIdentifier == taskId })?.cancel()
            }
        }
    }

    // MARK: - Network Download Management

    private func startMainDownloadIfNeeded() {
        guard mainTask == nil && !isDownloadComplete && !isCancelled else { return }
        startMainDownload(fromOffset: buffer.count)
    }

    private func startMainDownload(fromOffset offset: Int) {
        guard !isCancelled, let session = session else { return }
        var request = URLRequest(url: originalURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("identity", forHTTPHeaderField: "Accept-Encoding")
        mainTaskRequestedOffset = offset
        bytesToSkipOnMainTask = 0

        if offset > 0 {
            if !isTranscoded {
                request.setValue("bytes=\(offset)-", forHTTPHeaderField: "Range")
            }
        } else if !isTranscoded {
            request.setValue("bytes=0-", forHTTPHeaderField: "Range")
        }

        let task = session.dataTask(with: request)
        mainTask = task
        task.resume()
    }

    private func startAuxRangeTask(for loadingRequest: AVAssetResourceLoadingRequest, startOffset: Int64, endOffset: Int64) {
        guard !isCancelled, let session = session else { return }
        if auxTasks.values.contains(where: { $0.request === loadingRequest }) {
            return
        }
        var request = URLRequest(url: originalURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("identity", forHTTPHeaderField: "Accept-Encoding")
        if endOffset < Int64.max && endOffset > startOffset {
            request.setValue("bytes=\(startOffset)-\(endOffset - 1)", forHTTPHeaderField: "Range")
        } else {
            request.setValue("bytes=\(startOffset)-", forHTTPHeaderField: "Range")
        }
        let task = session.dataTask(with: request)
        auxTasks[task.taskIdentifier] = AuxTaskInfo(request: loadingRequest, expectedOffset: startOffset)
        task.resume()
    }

    private static func parseContentRange(_ response: HTTPURLResponse) -> (start: Int64?, total: Int64?) {
        guard let header = response.value(forHTTPHeaderField: "Content-Range") else {
            return (nil, nil)
        }
        let trimmed = header.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.lowercased().hasPrefix("bytes") else { return (nil, nil) }
        let rangeAndTotal = trimmed.dropFirst(5).trimmingCharacters(in: .whitespaces)
        let slashParts = rangeAndTotal.split(separator: "/", maxSplits: 1)
        var startVal: Int64? = nil
        var totalVal: Int64? = nil
        if let rangePart = slashParts.first {
            let dashParts = rangePart.split(separator: "-", maxSplits: 1)
            if let first = dashParts.first, let parsedStart = Int64(first.trimmingCharacters(in: .whitespaces)) {
                startVal = parsedStart
            }
        }
        if slashParts.count > 1 {
            let totalStr = slashParts[1].trimmingCharacters(in: .whitespaces)
            if totalStr != "*", let parsedTotal = Int64(totalStr), parsedTotal > 0 {
                totalVal = parsedTotal
            }
        }
        return (startVal, totalVal)
    }

    private func fillContentInfoIfNeeded(for loadingRequest: AVAssetResourceLoadingRequest) {
        guard let infoRequest = loadingRequest.contentInformationRequest, infoRequest.contentType == nil else {
            return
        }
        infoRequest.contentType = contentTypeUTI
        if responseContentLength > 0 {
            infoRequest.contentLength = responseContentLength
            infoRequest.isByteRangeAccessSupported = true
        } else if isDownloadComplete {
            infoRequest.contentLength = Int64(buffer.count)
            infoRequest.isByteRangeAccessSupported = true
        } else {
            infoRequest.isByteRangeAccessSupported = false
        }
    }

    private func finishPendingRequest(_ loadingRequest: AVAssetResourceLoadingRequest, error: Error? = nil) {
        pendingRequests.removeAll { $0 === loadingRequest }
        guard !loadingRequest.isFinished && !loadingRequest.isCancelled else { return }
        if let error = error {
            loadingRequest.finishLoading(with: error)
        } else {
            loadingRequest.finishLoading()
        }
    }

    private func processPendingRequests() {
        guard hasReceivedInitialResponse, !isCancelled else { return }
        pendingRequests.removeAll { $0.isCancelled || $0.isFinished }

        var completedRequests: [AVAssetResourceLoadingRequest] = []

        for loadingRequest in pendingRequests {
            fillContentInfoIfNeeded(for: loadingRequest)

            guard let dataRequest = loadingRequest.dataRequest else {
                completedRequests.append(loadingRequest)
                continue
            }

            let requestedEndOffset: Int64
            if dataRequest.requestsAllDataToEndOfResource {
                if isDownloadComplete {
                    requestedEndOffset = Int64(buffer.count)
                } else if responseContentLength > 0 {
                    requestedEndOffset = responseContentLength
                } else {
                    requestedEndOffset = Int64.max
                }
            } else {
                requestedEndOffset = dataRequest.requestedOffset + Int64(dataRequest.requestedLength)
            }

            let currentOffset = dataRequest.currentOffset

            // Check if an auxiliary range task is currently handling this request
            if let auxEntry = auxTasks.first(where: { $0.value.request === loadingRequest }) {
                if Int64(buffer.count) >= requestedEndOffset && currentOffset < requestedEndOffset {
                    let taskId = auxEntry.key
                    auxTasks.removeValue(forKey: taskId)
                    session?.getAllTasks { tasks in
                        tasks.first(where: { $0.taskIdentifier == taskId })?.cancel()
                    }
                } else {
                    continue
                }
            }

            if currentOffset < Int64(buffer.count) {
                let availableEnd = min(Int64(buffer.count), requestedEndOffset)
                if availableEnd > currentOffset {
                    let sliceRange = Int(currentOffset)..<Int(availableEnd)
                    dataRequest.respond(with: buffer.subdata(in: sliceRange))
                }
            }

            let updatedOffset = dataRequest.currentOffset
            if updatedOffset >= requestedEndOffset || (isDownloadComplete && updatedOffset >= Int64(buffer.count)) {
                completedRequests.append(loadingRequest)
            } else if !isDownloadComplete && serverSupportsByteRanges && !isTranscoded && updatedOffset > Int64(buffer.count) + 262_144 {
                startAuxRangeTask(for: loadingRequest, startOffset: updatedOffset, endOffset: requestedEndOffset)
            }
        }

        for req in completedRequests {
            finishPendingRequest(req)
        }
    }

    // MARK: - URLSessionDataDelegate

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard !isCancelled, let httpResponse = response as? HTTPURLResponse else {
            completionHandler(.cancel)
            return
        }

        if let auxInfo = auxTasks[dataTask.taskIdentifier] {
            let parsed = Self.parseContentRange(httpResponse)
            if httpResponse.statusCode == 206, parsed.start == auxInfo.expectedOffset {
                if let total = parsed.total, responseContentLength <= 0 {
                    responseContentLength = total
                }
                fillContentInfoIfNeeded(for: auxInfo.request)
                completionHandler(.allow)
            } else {
                // Server returned 200 OK (byte 0) or mismatched range instead of 206 at expectedOffset.
                // Cancel immediately so byte 0 is never fed into a non-zero timeline offset.
                auxTasks.removeValue(forKey: dataTask.taskIdentifier)
                serverSupportsByteRanges = false
                completionHandler(.cancel)
                processPendingRequests()
            }
            return
        }

        guard dataTask.taskIdentifier == mainTask?.taskIdentifier else {
            completionHandler(.cancel)
            return
        }

        if httpResponse.statusCode >= 400 {
            completionHandler(.cancel)
            let err = NSError(domain: NSURLErrorDomain, code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode)"])
            for req in pendingRequests {
                finishPendingRequest(req, error: err)
            }
            return
        }

        let parsedRange = Self.parseContentRange(httpResponse)

        if mainTaskRequestedOffset == 0 {
            hasReceivedInitialResponse = true
            bytesToSkipOnMainTask = 0
            if let total = parsedRange.total, total > 0 {
                responseContentLength = total
            } else if httpResponse.expectedContentLength > 0 {
                responseContentLength = httpResponse.expectedContentLength
            }
            let acceptRanges = httpResponse.value(forHTTPHeaderField: "Accept-Ranges")?.lowercased() ?? ""
            if !isTranscoded && (httpResponse.statusCode == 206 || (acceptRanges == "bytes" && responseContentLength > 0)) {
                serverSupportsByteRanges = true
            } else {
                serverSupportsByteRanges = false
            }
        } else {
            // Reconnected at mainTaskRequestedOffset > 0.
            // Only append directly if the server returned 206 starting at mainTaskRequestedOffset.
            // If the server returned 200 OK from byte 0, skip the first mainTaskRequestedOffset bytes!
            if httpResponse.statusCode == 206, parsedRange.start == Int64(mainTaskRequestedOffset) {
                bytesToSkipOnMainTask = 0
            } else {
                bytesToSkipOnMainTask = mainTaskRequestedOffset
            }
        }

        processPendingRequests()
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard !isCancelled, !data.isEmpty else { return }

        if var auxInfo = auxTasks[dataTask.taskIdentifier] {
            let req = auxInfo.request
            guard !req.isCancelled, !req.isFinished, let dataRequest = req.dataRequest else {
                auxTasks.removeValue(forKey: dataTask.taskIdentifier)
                dataTask.cancel()
                return
            }
            let requestedEndOffset: Int64
            if dataRequest.requestsAllDataToEndOfResource {
                requestedEndOffset = responseContentLength > 0 ? responseContentLength : Int64.max
            } else {
                requestedEndOffset = dataRequest.requestedOffset + Int64(dataRequest.requestedLength)
            }
            let currentOffset = dataRequest.currentOffset
            guard currentOffset == auxInfo.expectedOffset else {
                auxTasks.removeValue(forKey: dataTask.taskIdentifier)
                dataTask.cancel()
                processPendingRequests()
                return
            }
            let remainingNeeded = requestedEndOffset - currentOffset
            if remainingNeeded <= 0 {
                auxTasks.removeValue(forKey: dataTask.taskIdentifier)
                dataTask.cancel()
                finishPendingRequest(req)
                return
            }
            let bytesToRespond = min(Int(remainingNeeded), data.count)
            let chunk = bytesToRespond == data.count ? data : Data(data.prefix(bytesToRespond))
            dataRequest.respond(with: chunk)
            auxInfo.expectedOffset += Int64(bytesToRespond)
            if auxInfo.expectedOffset >= requestedEndOffset {
                auxTasks.removeValue(forKey: dataTask.taskIdentifier)
                dataTask.cancel()
                finishPendingRequest(req)
            } else {
                auxTasks[dataTask.taskIdentifier] = auxInfo
            }
            return
        }

        guard dataTask.taskIdentifier == mainTask?.taskIdentifier else { return }

        if bytesToSkipOnMainTask > 0 {
            if data.count <= bytesToSkipOnMainTask {
                bytesToSkipOnMainTask -= data.count
                return
            } else {
                let remainingData = Data(data.dropFirst(bytesToSkipOnMainTask))
                bytesToSkipOnMainTask = 0
                buffer.append(remainingData)
                mainRetryCount = 0
            }
        } else {
            buffer.append(data)
            mainRetryCount = 0
        }

        processPendingRequests()
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard !isCancelled else { return }

        if let auxInfo = auxTasks.removeValue(forKey: task.taskIdentifier) {
            let req = auxInfo.request
            if !req.isCancelled && !req.isFinished, let dataRequest = req.dataRequest {
                let requestedEndOffset: Int64
                if dataRequest.requestsAllDataToEndOfResource {
                    requestedEndOffset = responseContentLength > 0 ? responseContentLength : Int64.max
                } else {
                    requestedEndOffset = dataRequest.requestedOffset + Int64(dataRequest.requestedLength)
                }
                if dataRequest.currentOffset >= requestedEndOffset || (error == nil && responseContentLength > 0 && dataRequest.currentOffset >= responseContentLength) {
                    finishPendingRequest(req)
                    return
                }
            }
            processPendingRequests()
            return
        }

        guard task.taskIdentifier == mainTask?.taskIdentifier else { return }
        mainTask = nil

        let nsError = error as NSError?
        if nsError?.code == NSURLErrorCancelled {
            return
        }

        let isPrematureEOF = (error == nil && responseContentLength > 0 && Int64(buffer.count) < responseContentLength)
        if (error != nil || isPrematureEOF) && mainRetryCount < 3 {
            mainRetryCount += 1
            let resumeOffset = buffer.count
            loaderQueue.asyncAfter(deadline: .now() + 0.4) { [weak self] in
                guard let self = self, !self.isCancelled else { return }
                self.startMainDownload(fromOffset: resumeOffset)
            }
            return
        }

        if let error = error, buffer.isEmpty {
            for req in pendingRequests {
                finishPendingRequest(req, error: error)
            }
            return
        }

        isDownloadComplete = true
        processPendingRequests()
    }
}

@objc(AudioPlayerPlugin)
public class AudioPlayerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioPlayerPlugin"
    public let jsName = "AudioPlayerPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initPlayer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTheme", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateLyrics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPlaybackState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateDetailView", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "preloadNext", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setQuality", returnType: CAPPluginReturnPromise),
    ]

    struct TrackMetadata {
        let title: String
        let artist: String
        let album: String
        let duration: Double
        let coverUrl: String
        let canvasUrl: String
        let starred: Bool
        let isPreview: Bool
    }

    private var player: AVQueuePlayer?
    private var timeObserverToken: Any?
    private var uiTimeObserverToken: Any?
    private var playerItemStatusObservers: [ObjectIdentifier: NSKeyValueObservation] = [:]
    private var currentItemObserver: NSKeyValueObservation?
    private var metadataMap: [ObjectIdentifier: TrackMetadata] = [:]
    private var resourceLoaders: [ObjectIdentifier: StreamResourceLoader] = [:]
    private var isManuallyChangingItem = false
    private var artworkGeneration: Int = 0

    private var currentTitle: String = ""
    private var currentArtist: String = ""
    private var currentAlbum: String = ""
    private var currentDuration: Double = 0.0
    private var uiTimeTickCount = 0

    private var timeControlStatusObserver: NSKeyValueObservation?

    override public func load() {
        setupRemoteCommands()
        setupAudioSessionObservers()
        Task { @MainActor in
            PlaybackStateManager.shared.audioPlayerPlugin = self
        }
    }

    private func setupAudioSessionObservers() {
        NotificationCenter.default.addObserver(self, selector: #selector(handleAudioInterruption), name: AVAudioSession.interruptionNotification, object: AVAudioSession.sharedInstance())
        NotificationCenter.default.addObserver(self, selector: #selector(handleRouteChange), name: AVAudioSession.routeChangeNotification, object: AVAudioSession.sharedInstance())
    }

    @objc private func handleAudioInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

        switch type {
        case .began:
            DispatchQueue.main.async { [weak self] in
                self?.player?.pause()
                self?.notifyListeners("pause", data: [:])
                Task { @MainActor in
                    PlaybackStateManager.shared.isPlaying = false
                }
                self?.updateNowPlayingInfo(rate: 0.0)
            }
        case .ended:
            guard let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt else { return }
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            if options.contains(.shouldResume) {
                DispatchQueue.main.async { [weak self] in
                    try? AVAudioSession.sharedInstance().setActive(true)
                    self?.player?.play()
                    self?.notifyListeners("play", data: [:])
                    Task { @MainActor in
                        PlaybackStateManager.shared.isPlaying = true
                    }
                    self?.updateNowPlayingInfo(rate: 1.0)
                }
            }
        @unknown default:
            break
        }
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else { return }

        if reason == .oldDeviceUnavailable {
            DispatchQueue.main.async { [weak self] in
                self?.player?.pause()
                self?.notifyListeners("pause", data: [:])
                Task { @MainActor in
                    PlaybackStateManager.shared.isPlaying = false
                }
                self?.updateNowPlayingInfo(rate: 0.0)
            }
        }
    }

    private func setupRemoteCommands() {
        let commandCenter = MPRemoteCommandCenter.shared()
        
        commandCenter.playCommand.removeTarget(nil)
        commandCenter.pauseCommand.removeTarget(nil)
        commandCenter.togglePlayPauseCommand.removeTarget(nil)
        commandCenter.nextTrackCommand.removeTarget(nil)
        commandCenter.previousTrackCommand.removeTarget(nil)
        commandCenter.changePlaybackPositionCommand.removeTarget(nil)
        
        commandCenter.playCommand.addTarget { [weak self] event in
            guard let self = self, let player = self.player, player.currentItem != nil else { return .commandFailed }
            try? AVAudioSession.sharedInstance().setActive(true)
            player.play()
            self.updateNowPlayingInfo(rate: 1.0)
            self.notifyListeners("play", data: [:])
            Task { @MainActor in
                PlaybackStateManager.shared.isPlaying = true
            }
            return .success
        }
        
        commandCenter.pauseCommand.addTarget { [weak self] event in
            self?.player?.pause()
            self?.updateNowPlayingInfo(rate: 0.0)
            self?.notifyListeners("pause", data: [:])
            Task { @MainActor in
                PlaybackStateManager.shared.isPlaying = false
            }
            return .success
        }

        commandCenter.togglePlayPauseCommand.addTarget { [weak self] event in
            guard let self = self, let player = self.player, player.currentItem != nil else { return .commandFailed }
            if player.timeControlStatus == .paused || player.rate == 0 {
                try? AVAudioSession.sharedInstance().setActive(true)
                player.play()
                self.updateNowPlayingInfo(rate: 1.0)
                self.notifyListeners("play", data: [:])
                Task { @MainActor in
                    PlaybackStateManager.shared.isPlaying = true
                }
            } else {
                player.pause()
                self.updateNowPlayingInfo(rate: 0.0)
                self.notifyListeners("pause", data: [:])
                Task { @MainActor in
                    PlaybackStateManager.shared.isPlaying = false
                }
            }
            return .success
        }
        
        commandCenter.nextTrackCommand.addTarget { [weak self] event in
            self?.notifyListeners("nextTrack", data: [:])
            return .success
        }
        
        commandCenter.previousTrackCommand.addTarget { [weak self] event in
            guard let self = self, let player = self.player else { return .commandFailed }
            let currentSeconds = player.currentTime().seconds
            if !currentSeconds.isNaN && currentSeconds > 3.0 {
                let zero = CMTime.zero
                player.seek(to: zero, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
                    guard let self = self else { return }
                    if finished {
                        self.updateNowPlayingInfo(elapsed: 0.0)
                        self.notifyListeners("seeked", data: ["currentTime": 0.0])
                        Task { @MainActor in
                            PlaybackStateManager.shared.currentTime = 0.0
                        }
                    }
                }
                return .success
            }
            self.notifyListeners("previousTrack", data: [:])
            return .success
        }
        
        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self = self, let player = self.player,
                  let positionEvent = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            let time = CMTime(seconds: positionEvent.positionTime, preferredTimescale: 1000)
            player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
                guard let self = self else { return }
                if finished {
                    self.updateNowPlayingInfo(elapsed: positionEvent.positionTime)
                    self.notifyListeners("seeked", data: ["currentTime": positionEvent.positionTime])
                    Task { @MainActor in
                        PlaybackStateManager.shared.currentTime = positionEvent.positionTime
                    }
                }
            }
            return .success
        }
    }

    private func updateNowPlayingInfo(elapsed: Double? = nil, rate: Float? = nil) {
        var nowPlayingInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [String: Any]()
        nowPlayingInfo[MPMediaItemPropertyTitle] = currentTitle
        nowPlayingInfo[MPMediaItemPropertyArtist] = currentArtist
        nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = currentAlbum
        
        if currentDuration > 0 {
            nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = currentDuration
        } else if let duration = player?.currentItem?.duration.seconds, !duration.isNaN {
            nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration
        }
        
        let currentElapsed = elapsed ?? (player?.currentTime().seconds ?? 0.0)
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentElapsed.isNaN ? 0.0 : currentElapsed
        
        let currentRate = rate ?? (player?.rate ?? 0.0)
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = currentRate
        
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
    }

    private func fetchArtwork(urlString: String) {
        guard let url = URL(string: urlString) else { return }
        let expectedGeneration = self.artworkGeneration
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil, let image = UIImage(data: data) else { return }
            DispatchQueue.main.async { [weak self] in
                guard let self = self, self.artworkGeneration == expectedGeneration else { return }
                let artwork = MPMediaItemArtwork(boundsSize: image.size) { size in
                    return image
                }
                var nowPlayingInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [String: Any]()
                nowPlayingInfo[MPMediaItemPropertyArtwork] = artwork
                MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
            }
        }.resume()
    }

    @objc func initPlayer(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Must provide a valid URL")
            return
        }

        let title = call.getString("title") ?? "Unknown"
        let artist = call.getString("artist") ?? "Unknown"
        let album = call.getString("album") ?? "Unknown"
        let duration = call.getDouble("duration") ?? 0.0
        let coverUrl = call.getString("coverUrl") ?? ""
        let canvasUrl = call.getString("canvasUrl") ?? ""
        let suffix = call.getString("suffix") ?? "flac"
        let starred = call.getBool("starred") ?? false
        let autoPlay = call.getBool("autoPlay") ?? false
        let isRestore = call.getBool("isRestore") ?? false
        let isPreview = call.getBool("isPreview") ?? (urlString.contains("dzcdn.net") || urlString.contains("deezer:"))

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("Plugin instance is nil")
                return
            }

            if isRestore, let existingPlayer = self.player, existingPlayer.currentItem != nil,
               (existingPlayer.rate > 0 || existingPlayer.timeControlStatus == .playing) {
                let ct = CMTimeGetSeconds(existingPlayer.currentTime())
                if self.currentDuration > 0 {
                    self.notifyListeners("ready", data: ["duration": self.currentDuration])
                }
                if !ct.isNaN && ct >= 0 {
                    self.notifyListeners("timeupdate", data: ["currentTime": ct])
                }
                self.notifyListeners("play", data: [:])
                call.resolve()
                return
            }

            self.isManuallyChangingItem = true
            defer { self.isManuallyChangingItem = false }
            self.artworkGeneration += 1

            self.currentTitle = title
            self.currentArtist = artist
            self.currentAlbum = album
            self.currentDuration = duration

            Task { @MainActor in
                let mgr = PlaybackStateManager.shared
                mgr.title = title
                mgr.artist = artist
                mgr.album = album
                mgr.duration = duration
                mgr.updateCurrentTime(0)
                mgr.isPlaying = false
                mgr.coverUrl = coverUrl
                mgr.canvasUrl = canvasUrl
                mgr.starred = starred
                mgr.isPreview = isPreview
                mgr.isFetchingLyrics = false
                mgr.lyricsFetchFailed = false
            }

            self.uiTimeTickCount = 0

            self.removeObservers()
            self.metadataMap.removeAll()
            self.playerItemStatusObservers.removeAll()

            let (playerItem, _) = self.createPlayerItem(url: url, suffix: suffix)

            self.metadataMap[ObjectIdentifier(playerItem)] = TrackMetadata(title: title, artist: artist, album: album, duration: duration, coverUrl: coverUrl, canvasUrl: canvasUrl, starred: starred, isPreview: isPreview)

            self.player = AVQueuePlayer(playerItem: playerItem)
            self.player?.automaticallyWaitsToMinimizeStalling = true
            if autoPlay {
                try? AVAudioSession.sharedInstance().setActive(true)
                self.player?.play()
                self.updateNowPlayingInfo(rate: 1.0)
                self.notifyListeners("play", data: [:])
                Task { @MainActor in
                    PlaybackStateManager.shared.isPlaying = true
                }
            } else {
                self.updateNowPlayingInfo(elapsed: 0.0, rate: 0.0)
            }

            if !coverUrl.isEmpty {
                self.fetchArtwork(urlString: coverUrl)
            }

            let statusObserver = playerItem.observe(\.status, options: [.new]) { [weak self] item, change in
                guard let self = self else { return }
                if item.status == .readyToPlay, self.player?.currentItem == item {
                    let rawDur = CMTimeGetSeconds(item.duration)
                    let dur = (!rawDur.isNaN && rawDur > 0) ? rawDur : self.currentDuration
                    if dur > 0 {
                        self.currentDuration = dur
                        self.updateNowPlayingInfo()
                        self.notifyListeners("ready", data: ["duration": dur])
                        Task { @MainActor in
                            PlaybackStateManager.shared.duration = dur
                        }
                    }
                } else if item.status == .failed {
                    self.notifyListeners("error", data: ["message": item.error?.localizedDescription ?? "Playback failed"])
                }
            }
            self.playerItemStatusObservers[ObjectIdentifier(playerItem)] = statusObserver

            let interval = CMTime(seconds: 0.5, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
            self.timeObserverToken = self.player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
                guard let self = self else { return }
                let ct = CMTimeGetSeconds(time)
                if !ct.isNaN {
                    self.notifyListeners("timeupdate", data: ["currentTime": ct])
                }
            }

            let uiInterval = CMTime(seconds: 0.05, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
            self.uiTimeObserverToken = self.player?.addPeriodicTimeObserver(forInterval: uiInterval, queue: .main) { [weak self] time in
                guard let self = self else { return }
                let ct = CMTimeGetSeconds(time)
                if !ct.isNaN {
                    Task { @MainActor in
                        PlaybackStateManager.shared.updateActiveLyricIndexOnly(ct)
                    }
                    self.uiTimeTickCount += 1
                    if self.uiTimeTickCount % 5 == 0 {
                        Task { @MainActor in
                            PlaybackStateManager.shared.currentTime = ct
                        }
                    }
                }
            }

            self.timeControlStatusObserver?.invalidate()
            self.timeControlStatusObserver = self.player?.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
                guard self != nil else { return }
                let playing = player.timeControlStatus == .playing
                Task { @MainActor in
                    if PlaybackStateManager.shared.isPlaying != playing && player.timeControlStatus != .waitingToPlayAtSpecifiedRate {
                        PlaybackStateManager.shared.isPlaying = playing
                    }
                }
            }

            self.currentItemObserver = self.player?.observe(\.currentItem, options: [.new, .old]) { [weak self] player, change in
                guard let self = self else { return }
                if self.isManuallyChangingItem { return }
                if let oldItem = change.oldValue as? AVPlayerItem {
                    self.cleanupPlayerItem(oldItem)
                }
                if let newItem = change.newValue as? AVPlayerItem, let meta = self.metadataMap[ObjectIdentifier(newItem)] {
                    let rawDur = CMTimeGetSeconds(newItem.duration)
                    let effectiveDur = (!rawDur.isNaN && rawDur > 0) ? rawDur : meta.duration

                    self.currentTitle = meta.title
                    self.currentArtist = meta.artist
                    self.currentAlbum = meta.album
                    self.currentDuration = effectiveDur
                    
                    Task { @MainActor in
                        let mgr = PlaybackStateManager.shared
                        mgr.title = meta.title
                        mgr.artist = meta.artist
                        mgr.album = meta.album
                        mgr.duration = effectiveDur
                        mgr.coverUrl = meta.coverUrl
                        mgr.canvasUrl = meta.canvasUrl
                        mgr.updateCurrentTime(0)
                        mgr.isPlaying = true
                        mgr.starred = meta.starred
                        mgr.isPreview = meta.isPreview
                        mgr.isFetchingLyrics = false
                        mgr.lyricsFetchFailed = false
                    }
                    
                    self.artworkGeneration += 1
                    self.updateNowPlayingInfo(elapsed: 0.0, rate: 1.0)
                    if !meta.coverUrl.isEmpty { self.fetchArtwork(urlString: meta.coverUrl) }
                    self.notifyListeners("trackAdvancedNatively", data: ["duration": effectiveDur])
                    if effectiveDur > 0 {
                        self.notifyListeners("ready", data: ["duration": effectiveDur])
                    }
                }
            }

            NotificationCenter.default.addObserver(self, selector: #selector(self.playerItemDidReachEnd), name: .AVPlayerItemDidPlayToEndTime, object: playerItem)
            NotificationCenter.default.addObserver(self, selector: #selector(self.playerItemFailedToPlay), name: .AVPlayerItemFailedToPlayToEndTime, object: playerItem)

            call.resolve()
        }
    }

    @objc func preloadNext(_ call: CAPPluginCall) {
        // `clear: true` drops any queued "next" item (e.g. repeat mode changed so
        // nothing should follow the current trac).
        if call.getBool("clear") == true {
            DispatchQueue.main.async { [weak self] in
                guard let self = self, let queuePlayer = self.player else {
                    call.resolve()
                    return
                }
                for item in queuePlayer.items().dropFirst() {
                    self.cleanupPlayerItem(item)
                    queuePlayer.remove(item)
                }
                call.resolve()
            }
            return
        }

        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.resolve()
            return
        }

        let title = call.getString("title") ?? "Unknown"
        let artist = call.getString("artist") ?? "Unknown"
        let album = call.getString("album") ?? "Unknown"
        let duration = call.getDouble("duration") ?? 0.0
        let coverUrl = call.getString("coverUrl") ?? ""
        let canvasUrl = call.getString("canvasUrl") ?? ""
        let suffix = call.getString("suffix") ?? "flac"
        let starred = call.getBool("starred") ?? false
        let isPreview = call.getBool("isPreview") ?? (urlString.contains("dzcdn.net") || urlString.contains("deezer:"))

        DispatchQueue.main.async { [weak self] in
            guard let self = self, let queuePlayer = self.player else {
                call.resolve()
                return
            }

            let (playerItem, asset) = self.createPlayerItem(url: url, suffix: suffix)

            self.metadataMap[ObjectIdentifier(playerItem)] = TrackMetadata(title: title, artist: artist, album: album, duration: duration, coverUrl: coverUrl, canvasUrl: canvasUrl, starred: starred, isPreview: isPreview)

            if queuePlayer.items().count > 1 {
                for item in queuePlayer.items().dropFirst() {
                    self.cleanupPlayerItem(item)
                    queuePlayer.remove(item)
                }
            }

            let statusObserver = playerItem.observe(\.status, options: [.new]) { [weak self] item, change in
                guard let self = self else { return }
                if item.status == .readyToPlay, self.player?.currentItem == item {
                    let dur = CMTimeGetSeconds(item.duration)
                    if !dur.isNaN && dur > 0 {
                        self.currentDuration = dur
                        self.updateNowPlayingInfo()
                        self.notifyListeners("ready", data: ["duration": dur])
                        Task { @MainActor in
                            PlaybackStateManager.shared.duration = dur
                        }
                    }
                } else if item.status == .failed {
                    self.player?.remove(item)
                    self.cleanupPlayerItem(item)
                }
            }
            self.playerItemStatusObservers[ObjectIdentifier(playerItem)] = statusObserver

            NotificationCenter.default.addObserver(self, selector: #selector(self.playerItemDidReachEnd), name: .AVPlayerItemDidPlayToEndTime, object: playerItem)
            NotificationCenter.default.addObserver(self, selector: #selector(self.playerItemFailedToPlay), name: .AVPlayerItemFailedToPlayToEndTime, object: playerItem)

            asset.loadValuesAsynchronously(forKeys: ["playable", "duration"]) {
                DispatchQueue.main.async {
                    var error: NSError?
                    if asset.statusOfValue(forKey: "playable", error: &error) == .loaded {
                        // preloading warm
                    }
                }
            }

            queuePlayer.insert(playerItem, after: nil)
            call.resolve()
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("Plugin instance is nil")
                return
            }
            guard let player = self.player, player.currentItem != nil else {
                call.resolve()
                return
            }
            try? AVAudioSession.sharedInstance().setActive(true)
            player.play()
            self.updateNowPlayingInfo(rate: 1.0)
            self.notifyListeners("play", data: [:])
            Task { @MainActor in
                PlaybackStateManager.shared.isPlaying = true
            }
            call.resolve()
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("Plugin instance is nil")
                return
            }
            self.player?.pause()
            self.updateNowPlayingInfo(rate: 0.0)
            self.notifyListeners("pause", data: [:])
            Task { @MainActor in
                PlaybackStateManager.shared.isPlaying = false
            }
            call.resolve()
        }
    }

    @objc func seek(_ call: CAPPluginCall) {
        guard let to = call.getDouble("to") else {
            call.reject("Must provide a time to seek to")
            return
        }
        DispatchQueue.main.async { [weak self] in
            Task { @MainActor in
                PlaybackStateManager.shared.currentTime = to
            }
            guard let self = self, let player = self.player else {
                self?.notifyListeners("seeked", data: ["currentTime": to])
                call.resolve()
                return
            }
            let time = CMTime(seconds: to, preferredTimescale: 1000)
            player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
                guard let self = self else { return }
                if finished {
                    self.updateNowPlayingInfo(elapsed: to)
                    self.notifyListeners("seeked", data: ["currentTime": to])
                }
                call.resolve(["finished": finished])
            }
        }
    }

    public func seekNatively(to time: Double) {
        DispatchQueue.main.async { [weak self] in
            Task { @MainActor in
                PlaybackStateManager.shared.currentTime = time
            }
            guard let self = self, let player = self.player else {
                self?.notifyListeners("seeked", data: ["currentTime": time])
                return
            }
            let cmTime = CMTime(seconds: time, preferredTimescale: 1000)
            player.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
                guard let self = self else { return }
                if finished {
                    self.updateNowPlayingInfo(elapsed: time)
                    self.notifyListeners("seeked", data: ["currentTime": time])
                }
            }
        }
    }

    public func togglePlayPauseNatively() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let player = self.player, player.currentItem != nil else {
                Task { @MainActor in
                    PlaybackStateManager.shared.evaluateJS("if(typeof audio!=='undefined'&&audio){audio.paused?audio.play():audio.pause()}")
                }
                return
            }
            if player.timeControlStatus == .paused || player.rate == 0 {
                try? AVAudioSession.sharedInstance().setActive(true)
                player.play()
                self.updateNowPlayingInfo(rate: 1.0)
                self.notifyListeners("play", data: [:])
                Task { @MainActor in
                    PlaybackStateManager.shared.isPlaying = true
                }
            } else {
                player.pause()
                self.updateNowPlayingInfo(rate: 0.0)
                self.notifyListeners("pause", data: [:])
                Task { @MainActor in
                    PlaybackStateManager.shared.isPlaying = false
                }
            }
        }
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        guard let volume = call.getFloat("volume") else {
            call.reject("Must provide a volume value")
            return
        }
        DispatchQueue.main.async { [weak self] in
            self?.player?.volume = volume
            call.resolve()
        }
    }

    @objc func setTheme(_ call: CAPPluginCall) {
        let theme = call.getString("theme") ?? "default"
        Task { @MainActor in
            PlaybackStateManager.shared.currentTheme = theme
        }
        call.resolve()
    }

    @objc func setQuality(_ call: CAPPluginCall) {
        let quality = call.getString("quality") ?? "original"
        Task { @MainActor in
            PlaybackStateManager.shared.currentQuality = quality
        }
        call.resolve()
    }

    @objc func updateLyrics(_ call: CAPPluginCall) {
        let current = call.getString("current") ?? ""
        let next = call.getString("next") ?? ""
        let all = call.getArray("all", [String: Any].self) ?? []
        
        Task { @MainActor in
            let mgr = PlaybackStateManager.shared
            mgr.currentLyric = current
            mgr.nextLyric = next
            if current == "Loading lyrics..." {
                mgr.isFetchingLyrics = true
                mgr.lyricsFetchFailed = false
            } else if current == "No lyrics found" || (current.isEmpty && all.isEmpty) {
                mgr.isFetchingLyrics = false
                mgr.lyricsFetchFailed = true
            } else {
                mgr.isFetchingLyrics = false
                mgr.lyricsFetchFailed = false
            }
            mgr.updateFullLyrics(all)
        }
        call.resolve()
    }

    @objc func updateQueue(_ call: CAPPluginCall) {
        let queue = call.getArray("queue", [String: Any].self) ?? []
        let queueIndex = call.getInt("queueIndex") ?? -1
        Task { @MainActor in
            PlaybackStateManager.shared.queue = queue
            PlaybackStateManager.shared.queueIndex = queueIndex
        }
        call.resolve()
    }

    private func createPlayerItem(url: URL, suffix: String) -> (AVPlayerItem, AVURLAsset) {
        let urlStr = url.absoluteString
        let isTranscodedMP3 = urlStr.contains("maxBitRate=") || urlStr.contains("format=mp3")
        let lowerSuffix = isTranscodedMP3 ? "mp3" : suffix.lowercased()

        var mimeType = "audio/flac"
        var contentTypeUTI = "org.xiph.flac"
        var fileExtension = "flac"

        if lowerSuffix == "mp3" {
            mimeType = "audio/mpeg"
            contentTypeUTI = "public.mp3"
            fileExtension = "mp3"
        } else if lowerSuffix == "m4a" || lowerSuffix == "mp4" || lowerSuffix == "aac" {
            mimeType = "audio/mp4"
            contentTypeUTI = "public.mpeg-4-audio"
            fileExtension = "m4a"
        } else if lowerSuffix == "wav" {
            mimeType = "audio/wav"
            contentTypeUTI = "com.microsoft.waveform-audio"
            fileExtension = "wav"
        } else if lowerSuffix == "ogg" || lowerSuffix == "oga" {
            mimeType = "audio/ogg"
            contentTypeUTI = "org.xiph.ogg-audio"
            fileExtension = "ogg"
        }

        let options: [String: Any] = [
            AVURLAssetPreferPreciseDurationAndTimingKey: true,
            "AVURLAssetOutOfBandMIMETypeKey": mimeType,
            "AVURLAssetOverrideMIMETypeKey": mimeType
        ]

        let asset: AVURLAsset
        var loader: StreamResourceLoader? = nil
        if let customURL = StreamResourceLoader.makeCustomURL(from: url, fileExtension: fileExtension) {
            let streamLoader = StreamResourceLoader(originalURL: url, contentTypeUTI: contentTypeUTI)
            let customAsset = AVURLAsset(url: customURL, options: options)
            customAsset.resourceLoader.setDelegate(streamLoader, queue: streamLoader.loaderQueue)
            asset = customAsset
            loader = streamLoader
        } else {
            asset = AVURLAsset(url: url, options: options)
        }

        let playerItem = AVPlayerItem(asset: asset)
        playerItem.preferredForwardBufferDuration = 0
        playerItem.canUseNetworkResourcesForLiveStreamingWhilePaused = true

        if let loader = loader {
            self.resourceLoaders[ObjectIdentifier(playerItem)] = loader
        }

        return (playerItem, asset)
    }

    private func cleanupPlayerItem(_ item: AVPlayerItem) {
        let id = ObjectIdentifier(item)
        self.playerItemStatusObservers.removeValue(forKey: id)
        self.metadataMap.removeValue(forKey: id)
        if let loader = self.resourceLoaders.removeValue(forKey: id) {
            loader.cancel()
        }
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: item)
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemFailedToPlayToEndTime, object: item)
    }

    private func removeObservers() {
        let block = { [weak self] in
            guard let self = self else { return }
            if let token = self.timeObserverToken {
                self.player?.removeTimeObserver(token)
                self.timeObserverToken = nil
            }
            if let uiToken = self.uiTimeObserverToken {
                self.player?.removeTimeObserver(uiToken)
                self.uiTimeObserverToken = nil
            }
            self.player?.pause()
            self.player?.replaceCurrentItem(with: nil)
            self.uiTimeTickCount = 0
            self.playerItemStatusObservers.removeAll()
            for loader in self.resourceLoaders.values {
                loader.cancel()
            }
            self.resourceLoaders.removeAll()
            self.timeControlStatusObserver?.invalidate()
            self.timeControlStatusObserver = nil
            self.currentItemObserver?.invalidate()
            self.currentItemObserver = nil
            NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
            NotificationCenter.default.removeObserver(self, name: .AVPlayerItemFailedToPlayToEndTime, object: nil)
        }
        
        if Thread.isMainThread {
            block()
        } else {
            DispatchQueue.main.async(execute: block)
        }
    }

    @objc func playerItemDidReachEnd(_ notification: Notification) {
        guard let endedItem = notification.object as? AVPlayerItem,
              let player = self.player else { return }
        let items = player.items()
        // If another item is queued after the one that just ended, or if AVQueuePlayer
        // has already advanced currentItem to the next item, let currentItemObserver
        // handle the native gapless transition instead of firing "ended".
        if items.count > 1 && items.first === endedItem {
            return
        }
        if let current = player.currentItem, current !== endedItem {
            return
        }
        notifyListeners("ended", data: [:])
        Task { @MainActor in
            PlaybackStateManager.shared.isPlaying = false
        }
    }

    @objc func playerItemFailedToPlay(_ notification: Notification) {
        guard let failedItem = notification.object as? AVPlayerItem else { return }
        guard let player = self.player, player.currentItem == nil || player.currentItem === failedItem else {
            self.player?.remove(failedItem)
            self.cleanupPlayerItem(failedItem)
            return
        }
        notifyListeners("error", data: ["message": "Failed to play to end time"])
    }

    deinit {
        removeObservers()
    }

    @objc func setPlaybackState(_ call: CAPPluginCall) {
        let shuffleVal = call.getBool("shuffle")
        let repeatVal = call.getString("repeatMode")
        let starredVal = call.getBool("starred")
        let isPreviewVal = call.getBool("isPreview")
        let canvasDisabledVal = call.getBool("canvasDisabled")
        Task { @MainActor in
            let mgr = PlaybackStateManager.shared
            if let s = shuffleVal { mgr.shuffle = s }
            if let r = repeatVal { mgr.repeatMode = r }
            if let st = starredVal { mgr.starred = st }
            if let p = isPreviewVal { mgr.isPreview = p }
            if let c = canvasDisabledVal { mgr.canvasDisabled = c }
        }
        call.resolve()
    }

    @objc func updateDetailView(_ call: CAPPluginCall) {
        let isActive = call.getBool("isActive") ?? false
        let title = call.getString("title") ?? ""
        let type = call.getString("type") ?? ""
        Task { @MainActor in
            PlaybackStateManager.shared.detailViewType = type
            PlaybackStateManager.shared.detailViewTitle = title
            PlaybackStateManager.shared.isInDetailView = isActive
        }
        call.resolve()
    }
}

private class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?
    init(_ delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AudioPlayerPlugin())
        webView?.configuration.userContentController.add(WeakScriptMessageHandler(self), name: "jamNativeReady")
    }
}

extension ViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "jamNativeReady" else { return }
        PlaybackStateManager.shared.reapplyInset()
    }
}
