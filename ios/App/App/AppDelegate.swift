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
            try AVAudioSession.sharedInstance().setActive(true)
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
    ]

    struct TrackMetadata {
        let title: String
        let artist: String
        let album: String
        let duration: Double
        let coverUrl: String
    }

    private var player: AVQueuePlayer?
    private var timeObserverToken: Any?
    private var uiTimeObserverToken: Any?
    private var playerItemStatusObservers: [Int: NSKeyValueObservation] = [:]
    private var currentItemObserver: NSKeyValueObservation?
    private var metadataMap: [Int: TrackMetadata] = [:]
    private var isManuallyChangingItem = false

    private var currentTitle: String = ""
    private var currentArtist: String = ""
    private var currentAlbum: String = ""
    private var currentDuration: Double = 0.0

    override public func load() {
        setupRemoteCommands()
        Task { @MainActor in
            PlaybackStateManager.shared.audioPlayerPlugin = self
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
            self?.player?.play()
            self?.updateNowPlayingInfo(rate: 1.0)
            self?.notifyListeners("play", data: [:])
            return .success
        }
        
        commandCenter.pauseCommand.addTarget { [weak self] event in
            self?.player?.pause()
            self?.updateNowPlayingInfo(rate: 0.0)
            self?.notifyListeners("pause", data: [:])
            return .success
        }

        commandCenter.togglePlayPauseCommand.addTarget { [weak self] event in
            guard let self = self, let player = self.player else { return .commandFailed }
            if player.rate == 0 {
                player.play()
                self.updateNowPlayingInfo(rate: 1.0)
                self.notifyListeners("play", data: [:])
            } else {
                player.pause()
                self.updateNowPlayingInfo(rate: 0.0)
                self.notifyListeners("pause", data: [:])
            }
            return .success
        }
        
        commandCenter.nextTrackCommand.addTarget { [weak self] event in
            self?.notifyListeners("nextTrack", data: [:])
            return .success
        }
        
        commandCenter.previousTrackCommand.addTarget { [weak self] event in
            self?.notifyListeners("previousTrack", data: [:])
            return .success
        }
        
        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self = self, let player = self.player,
                  let positionEvent = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            let time = CMTime(seconds: positionEvent.positionTime, preferredTimescale: 1000)
            player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
                self?.updateNowPlayingInfo(elapsed: positionEvent.positionTime)
                self?.notifyListeners("seeked", data: ["currentTime": positionEvent.positionTime])
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
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil, let image = UIImage(data: data) else { return }
            DispatchQueue.main.async {
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

        isManuallyChangingItem = true

        currentTitle = call.getString("title") ?? "Unknown"
        currentArtist = call.getString("artist") ?? "Unknown"
        currentAlbum = call.getString("album") ?? "Unknown"
        currentDuration = call.getDouble("duration") ?? 0.0
        let coverUrl = call.getString("coverUrl") ?? ""
        let suffix = call.getString("suffix") ?? "flac"

        let title = currentTitle
        let artist = currentArtist
        let album = currentAlbum
        let duration = currentDuration
        Task { @MainActor in
            let mgr = PlaybackStateManager.shared
            mgr.title = title
            mgr.artist = artist
            mgr.album = album
            mgr.duration = duration
            mgr.updateCurrentTime(0)
            mgr.isPlaying = false
            mgr.coverUrl = coverUrl
        }

        removeObservers()
        metadataMap.removeAll()
        playerItemStatusObservers.removeAll()

        var mimeType = "audio/flac"
        let lowerSuffix = suffix.lowercased()
        if lowerSuffix == "mp3" {
            mimeType = "audio/mpeg"
        } else if lowerSuffix == "m4a" || lowerSuffix == "mp4" {
            mimeType = "audio/mp4"
        } else if lowerSuffix == "wav" {
            mimeType = "audio/wav"
        } else if lowerSuffix == "ogg" || lowerSuffix == "oga" {
            mimeType = "audio/ogg"
        }

        let options: [String: Any] = [
            AVURLAssetPreferPreciseDurationAndTimingKey: true,
            "AVURLAssetOutOfBandMIMETypeKey": mimeType,
            "AVURLAssetOverrideMIMETypeKey": mimeType
        ]
        let asset = AVURLAsset(url: url, options: options)
        let playerItem = AVPlayerItem(asset: asset)
        
        metadataMap[playerItem.hash] = TrackMetadata(title: title, artist: artist, album: album, duration: duration, coverUrl: coverUrl)
        
        player = AVQueuePlayer(playerItem: playerItem)

        updateNowPlayingInfo(elapsed: 0.0, rate: 0.0)

        if !coverUrl.isEmpty {
            fetchArtwork(urlString: coverUrl)
        }

        let statusObserver = playerItem.observe(\.status, options: [.new]) { [weak self] item, change in
            guard let self = self else { return }
            if item.status == .readyToPlay, self.player?.currentItem == item {
                let dur = CMTimeGetSeconds(item.duration)
                if !dur.isNaN {
                    self.currentDuration = dur
                    self.updateNowPlayingInfo()
                    self.notifyListeners("ready", data: ["duration": dur])
                    Task { @MainActor in
                        PlaybackStateManager.shared.duration = dur
                    }
                }
            }
        }
        playerItemStatusObservers[playerItem.hash] = statusObserver

        let interval = CMTime(seconds: 0.5, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserverToken = player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self else { return }
            let ct = CMTimeGetSeconds(time)
            if !ct.isNaN {
                self.notifyListeners("timeupdate", data: ["currentTime": ct])
            }
        }

        let uiInterval = CMTime(seconds: 0.05, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        uiTimeObserverToken = player?.addPeriodicTimeObserver(forInterval: uiInterval, queue: .main) { [weak self] time in
            let ct = CMTimeGetSeconds(time)
            if !ct.isNaN {
                Task { @MainActor in
                    PlaybackStateManager.shared.updateCurrentTime(ct)
                }
            }
        }

        currentItemObserver = player?.observe(\.currentItem, options: [.new]) { [weak self] player, change in
            guard let self = self else { return }
            if self.isManuallyChangingItem { return }
            if let newItem = change.newValue as? AVPlayerItem, let meta = self.metadataMap[newItem.hash] {
                self.currentTitle = meta.title
                self.currentArtist = meta.artist
                self.currentAlbum = meta.album
                self.currentDuration = meta.duration
                Task { @MainActor in
                    let mgr = PlaybackStateManager.shared
                    mgr.title = meta.title
                    mgr.artist = meta.artist
                    mgr.album = meta.album
                    mgr.duration = meta.duration
                    mgr.coverUrl = meta.coverUrl
                    mgr.updateCurrentTime(0)
                    mgr.isPlaying = true
                }
                self.updateNowPlayingInfo(elapsed: 0.0, rate: 1.0)
                if !meta.coverUrl.isEmpty { self.fetchArtwork(urlString: meta.coverUrl) }
                self.notifyListeners("trackAdvancedNatively", data: [:])
                
                let dur = CMTimeGetSeconds(newItem.duration)
                if !dur.isNaN {
                    self.currentDuration = dur
                    self.updateNowPlayingInfo()
                    Task { @MainActor in PlaybackStateManager.shared.duration = dur }
                }
            }
        }

        NotificationCenter.default.addObserver(self, selector: #selector(playerItemDidReachEnd), name: .AVPlayerItemDidPlayToEndTime, object: playerItem)

        isManuallyChangingItem = false
        call.resolve()
    }

    @objc func preloadNext(_ call: CAPPluginCall) {
        guard let queuePlayer = player,
              let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.resolve()
            return
        }

        let title = call.getString("title") ?? "Unknown"
        let artist = call.getString("artist") ?? "Unknown"
        let album = call.getString("album") ?? "Unknown"
        let duration = call.getDouble("duration") ?? 0.0
        let coverUrl = call.getString("coverUrl") ?? ""
        let suffix = call.getString("suffix") ?? "flac"

        var mimeType = "audio/flac"
        let lowerSuffix = suffix.lowercased()
        if lowerSuffix == "mp3" {
            mimeType = "audio/mpeg"
        } else if lowerSuffix == "m4a" || lowerSuffix == "mp4" {
            mimeType = "audio/mp4"
        } else if lowerSuffix == "wav" {
            mimeType = "audio/wav"
        } else if lowerSuffix == "ogg" || lowerSuffix == "oga" {
            mimeType = "audio/ogg"
        }

        let options: [String: Any] = [
            AVURLAssetPreferPreciseDurationAndTimingKey: true,
            "AVURLAssetOutOfBandMIMETypeKey": mimeType,
            "AVURLAssetOverrideMIMETypeKey": mimeType
        ]
        let asset = AVURLAsset(url: url, options: options)
        let playerItem = AVPlayerItem(asset: asset)

        metadataMap[playerItem.hash] = TrackMetadata(title: title, artist: artist, album: album, duration: duration, coverUrl: coverUrl)

        if queuePlayer.items().count > 1 {
            for item in queuePlayer.items().dropFirst() {
                queuePlayer.remove(item)
            }
        }

        let statusObserver = playerItem.observe(\.status, options: [.new]) { [weak self] item, change in
            guard let self = self else { return }
            if item.status == .readyToPlay, self.player?.currentItem == item {
                let dur = CMTimeGetSeconds(item.duration)
                if !dur.isNaN {
                    self.currentDuration = dur
                    self.updateNowPlayingInfo()
                    Task { @MainActor in PlaybackStateManager.shared.duration = dur }
                }
            }
        }
        playerItemStatusObservers[playerItem.hash] = statusObserver
        
        NotificationCenter.default.addObserver(self, selector: #selector(playerItemDidReachEnd), name: .AVPlayerItemDidPlayToEndTime, object: playerItem)

        queuePlayer.insert(playerItem, after: nil)
        call.resolve()
    }

    @objc func play(_ call: CAPPluginCall) {
        player?.play()
        updateNowPlayingInfo(rate: 1.0)
        notifyListeners("play", data: [:])
        Task { @MainActor in
            PlaybackStateManager.shared.isPlaying = true
        }
        call.resolve()
    }

    @objc func pause(_ call: CAPPluginCall) {
        player?.pause()
        updateNowPlayingInfo(rate: 0.0)
        notifyListeners("pause", data: [:])
        Task { @MainActor in
            PlaybackStateManager.shared.isPlaying = false
        }
        call.resolve()
    }

    @objc func seek(_ call: CAPPluginCall) {
        guard let to = call.getDouble("to") else {
            call.reject("Must provide a time to seek to")
            return
        }
        guard let player = player else {
            self.notifyListeners("seeked", data: ["currentTime": to])
            call.resolve()
            return
        }
        let time = CMTime(seconds: to, preferredTimescale: 1000)
        player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
            self?.updateNowPlayingInfo(elapsed: to)
            self?.notifyListeners("seeked", data: ["currentTime": to])
        }
        call.resolve()
    }

    public func seekNatively(to time: Double) {
        guard let player = player else {
            self.notifyListeners("seeked", data: ["currentTime": time])
            return
        }
        let cmTime = CMTime(seconds: time, preferredTimescale: 1000)
        player.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
            self?.updateNowPlayingInfo(elapsed: time)
            self?.notifyListeners("seeked", data: ["currentTime": time])
        }
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        guard let volume = call.getFloat("volume") else {
            call.reject("Must provide a volume value")
            return
        }
        player?.volume = volume
        call.resolve()
    }

    @objc func setTheme(_ call: CAPPluginCall) {
        let theme = call.getString("theme") ?? "default"
        Task { @MainActor in
            PlaybackStateManager.shared.currentTheme = theme
        }
        call.resolve()
    }

    @objc func updateLyrics(_ call: CAPPluginCall) {
        let current = call.getString("current") ?? ""
        let next = call.getString("next") ?? ""
        
        Task { @MainActor in
            let mgr = PlaybackStateManager.shared
            mgr.currentLyric = current
            mgr.nextLyric = next
            if let all = call.getArray("all", [String: Any].self) {
                mgr.updateFullLyrics(all)
            }
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
    private func removeObservers() {
        if let token = timeObserverToken {
            player?.removeTimeObserver(token)
            timeObserverToken = nil
        }
        if let uiToken = uiTimeObserverToken {
            player?.removeTimeObserver(uiToken)
            uiTimeObserverToken = nil
        }
        playerItemStatusObservers.removeAll()
        currentItemObserver?.invalidate()
        currentItemObserver = nil
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
    }

    @objc func playerItemDidReachEnd(_ notification: Notification) {
        if let player = player, player.items().count > 1 {
            return
        }
        notifyListeners("ended", data: [:])
        Task { @MainActor in
            PlaybackStateManager.shared.isPlaying = false
        }
    }

    deinit {
        removeObservers()
    }

    @objc func setPlaybackState(_ call: CAPPluginCall) {
        let shuffleVal = call.getBool("shuffle") ?? false
        let repeatVal = call.getString("repeatMode") ?? "off"
        Task { @MainActor in
            PlaybackStateManager.shared.shuffle = shuffleVal
            PlaybackStateManager.shared.repeatMode = repeatVal
        }
        call.resolve()
    }

    @objc func updateDetailView(_ call: CAPPluginCall) {
        let isActive = call.getBool("isActive") ?? false
        let title = call.getString("title") ?? ""
        Task { @MainActor in
            PlaybackStateManager.shared.isInDetailView = isActive
            PlaybackStateManager.shared.detailViewTitle = title
        }
        call.resolve()
    }
}

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AudioPlayerPlugin())
    }
}
