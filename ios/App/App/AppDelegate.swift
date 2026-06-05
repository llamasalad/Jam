import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        
        // Configure AVAudioSession for background playback
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to set audio session category: \(error)")
        }
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
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
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise)
    ]

    private var player: AVPlayer?
    private var timeObserverToken: Any?
    private var playerItemStatusObserver: NSKeyValueObservation?

    @objc func initPlayer(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Must provide a valid URL")
            return
        }

        removeObservers()

        let playerItem = AVPlayerItem(url: url)
        player = AVPlayer(playerItem: playerItem)

        // Add observer to player item status using block KVO
        playerItemStatusObserver = playerItem.observe(\.status, options: [.new]) { [weak self] item, change in
            guard let self = self else { return }
            if item.status == .readyToPlay {
                let duration = CMTimeGetSeconds(item.duration)
                if !duration.isNaN {
                    self.notifyListeners("ready", data: ["duration": duration])
                }
            }
        }

        // Add periodic time observer for timeupdate events
        let interval = CMTime(seconds: 0.5, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserverToken = player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self else { return }
            let currentTime = CMTimeGetSeconds(time)
            if !currentTime.isNaN {
                self.notifyListeners("timeupdate", data: ["currentTime": currentTime])
            }
        }

        // Add end observer
        NotificationCenter.default.addObserver(self, selector: #selector(playerItemDidReachEnd), name: .AVPlayerItemDidPlayToEndTime, object: playerItem)

        call.resolve()
    }

    @objc func play(_ call: CAPPluginCall) {
        player?.play()
        notifyListeners("play", data: [:])
        call.resolve()
    }

    @objc func pause(_ call: CAPPluginCall) {
        player?.pause()
        notifyListeners("pause", data: [:])
        call.resolve()
    }

    @objc func seek(_ call: CAPPluginCall) {
        guard let to = call.getDouble("to") else {
            call.reject("Must provide a time to seek to")
            return
        }
        let time = CMTime(seconds: to, preferredTimescale: 1000)
        player?.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
            if finished {
                self?.notifyListeners("seeked", data: ["currentTime": to])
            }
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
}
