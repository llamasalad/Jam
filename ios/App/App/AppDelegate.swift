import UIKit
import SwiftUI
import Capacitor
import AVFoundation
import MediaPlayer

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure AVAudioSessionsfor background playback
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to set audio session category: \(error)")
        }

        // Programmatically boot the SwiftUI shell instead of Main.storyboard
        let hostingController = UIHostingController(rootView: MainSwiftUIView())
        hostingController.view.backgroundColor = .black

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = hostingController
        window.makeKeyAndVisible()
        self.window = window

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release sared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
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
    ]

    private var player: AVPlayer?
    private var timeObserverToken: Any?
    private var playerItemStatusObserver: NSKeyValueObservation?

    private var currentTitle: String = ""
    private var currentArtist: String = ""
    private var currentAlbum: String = ""
    private var currentDuration: Double = 0.0

    override public func load() {
        setupRemoteCommands()
        // Register this plugin with PlaybackStateManager for SwiftUI bridging
        Task { @MainActor in
            PlaybackStateManager.shared.audioPlayerPlugin = self
        }
    }

    private func setupRemoteCommands() {
        let commandCenter = MPRemoteCommandCenter.shared()
        
        // Remove existing targets to avoid duplicates
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

        currentTitle = call.getString("title") ?? "Unknown"
        currentArtist = call.getString("artist") ?? "Unknown"
        currentAlbum = call.getString("album") ?? "Unknown"
        currentDuration = call.getDouble("duration") ?? 0.0
        let coverUrl = call.getString("coverUrl") ?? ""
        let suffix = call.getString("suffix") ?? "flac"

        // Update SwiftUI state
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
            mgr.currentTime = 0
            mgr.isPlaying = false
            mgr.coverUrl = coverUrl
        }

        removeObservers()

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
        player = AVPlayer(playerItem: playerItem)

        updateNowPlayingInfo(elapsed: 0.0, rate: 0.0)

        if !coverUrl.isEmpty {
            fetchArtwork(urlString: coverUrl)
        }

        // Add observer to player item status using block KVO
        playerItemStatusObserver = playerItem.observe(\.status, options: [.new]) { [weak self] item, change in
            guard let self = self else { return }
            if item.status == .readyToPlay {
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

        // Add periodic time observer for timeupdate events
        let interval = CMTime(seconds: 0.5, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserverToken = player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self else { return }
            let ct = CMTimeGetSeconds(time)
            if !ct.isNaN {
                self.notifyListeners("timeupdate", data: ["currentTime": ct])
                Task { @MainActor in
                    PlaybackStateManager.shared.currentTime = ct
                }
            }
        }

        // Add end observer
        NotificationCenter.default.addObserver(self, selector: #selector(playerItemDidReachEnd), name: .AVPlayerItemDidPlayToEndTime, object: playerItem)

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

    @objc func setVolume(_ call: CAPPluginCall) {
        guard let volume = call.getFloat("volume") else {
            call.reject("Must provide a volume value")
            return
        }
        player?.volume = volume
        call.resolve()
    }

    @objc func playerItemDidReachEnd(notification: Notification) {
        notifyListeners("ended", data: [:])
        Task { @MainActor in
            PlaybackStateManager.shared.isPlaying = false
        }
    }

    @objc func setTheme(_ call: CAPPluginCall) {
        let theme = call.getString("theme") ?? "default"
        Task { @MainActor in
            PlaybackStateManager.shared.isLiquidThemeActive = (theme == "liquid-glass-theme")
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
            if !all.isEmpty {
                mgr.fullLyrics = all
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
        playerItemStatusObserver?.invalidate()
        playerItemStatusObserver = nil
        NotificationCenter.default.removeObserver(self)
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
}

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AudioPlayerPlugin())
    }
}
