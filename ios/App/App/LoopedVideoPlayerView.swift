import SwiftUI
import AVFoundation
import UIKit

struct LoopedVideoPlayerView: UIViewRepresentable {
    let urlString: String

    func makeUIView(context: Context) -> UIView {
        let view = PlayerContainerView()
        view.backgroundColor = .clear

        context.coordinator.currentUrl = urlString

        guard let url = URL(string: urlString) else { return view }
        let options: [String: Any] = [
            "AVURLAssetOutOfBandMIMETypeKey": "video/mp4",
            "AVURLAssetOverrideMIMETypeKey": "video/mp4"
        ]
        let asset = AVURLAsset(url: url, options: options)
        
        let player = AVPlayer()
        player.appliesMediaSelectionCriteriaAutomatically = false
        
        let playerLayer = AVPlayerLayer(player: player)
        playerLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(playerLayer)
        view.playerLayer = playerLayer
        context.coordinator.playerLayer = playerLayer
        context.coordinator.player = player

        player.isMuted = true
        player.automaticallyWaitsToMinimizeStalling = false

        asset.loadValuesAsynchronously(forKeys: ["tracks"]) { [weak coordinator = context.coordinator, weak player] in
            guard let coordinator = coordinator, let player = player, coordinator.player === player else { return }
            var error: NSError? = nil
            let status = asset.statusOfValue(forKey: "tracks", error: &error)
            guard status == .loaded else { return }
            
            let composition = AVMutableComposition()
            let videoTracks = asset.tracks(withMediaType: .video)
            if let videoTrack = videoTracks.first {
                guard let compositionTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else { return }
                do {
                    try compositionTrack.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: videoTrack, at: .zero)
                } catch {
                    print("Failed to insert video track: \(error)")
                    return
                }
            }
            
            DispatchQueue.main.async { [weak coordinator, weak player] in
                guard let coordinator = coordinator, let player = player, coordinator.player === player else { return }
                let playerItem = AVPlayerItem(asset: composition)
                player.replaceCurrentItem(with: playerItem)
                setupLoopObserver(for: playerItem, player: player, coordinator: coordinator)
                player.play()
            }
        }

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        if context.coordinator.currentUrl != urlString {
            Self.teardownPlayer(coordinator: context.coordinator)

            context.coordinator.currentUrl = urlString
            guard let url = URL(string: urlString) else { return }
            let options: [String: Any] = [
                "AVURLAssetOutOfBandMIMETypeKey": "video/mp4",
                "AVURLAssetOverrideMIMETypeKey": "video/mp4"
            ]
            let asset = AVURLAsset(url: url, options: options)
            
            let player = AVPlayer()
            player.appliesMediaSelectionCriteriaAutomatically = false
            
            context.coordinator.playerLayer?.player = player
            context.coordinator.player = player
            
            player.isMuted = true
            player.automaticallyWaitsToMinimizeStalling = false

            asset.loadValuesAsynchronously(forKeys: ["tracks"]) { [weak coordinator = context.coordinator, weak player] in
                guard let coordinator = coordinator, let player = player, coordinator.player === player else { return }
                var error: NSError? = nil
                let status = asset.statusOfValue(forKey: "tracks", error: &error)
                guard status == .loaded else { return }
                
                let composition = AVMutableComposition()
                let videoTracks = asset.tracks(withMediaType: .video)
                if let videoTrack = videoTracks.first {
                    guard let compositionTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else { return }
                    do {
                        try compositionTrack.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: videoTrack, at: .zero)
                    } catch {
                        print("Failed to insert video track: \(error)")
                        return
                    }
                }
                
                DispatchQueue.main.async { [weak coordinator, weak player] in
                    guard let coordinator = coordinator, let player = player, coordinator.player === player else { return }
                    let playerItem = AVPlayerItem(asset: composition)
                    player.replaceCurrentItem(with: playerItem)
                    setupLoopObserver(for: playerItem, player: player, coordinator: coordinator)
                    player.play()
                }
            }
        }
        context.coordinator.playerLayer?.frame = uiView.bounds
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator {
        var player: AVPlayer?
        var playerLayer: AVPlayerLayer?
        var loopObserverToken: NSObjectProtocol?
        var foregroundObserverToken: NSObjectProtocol?
        var currentUrl: String = ""
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        teardownPlayer(coordinator: coordinator)
    }

    private func setupLoopObserver(for playerItem: AVPlayerItem, player: AVPlayer, coordinator: Coordinator) {
        if let token = coordinator.loopObserverToken {
            NotificationCenter.default.removeObserver(token)
        }
        if let token = coordinator.foregroundObserverToken {
            NotificationCenter.default.removeObserver(token)
        }

        let token = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: playerItem,
            queue: .main
        ) { [weak player] _ in
            guard let player = player else { return }
            player.seek(to: .zero)
            player.play()
        }
        coordinator.loopObserverToken = token

        let fgToken = NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak player] _ in
            player?.play()
        }
        coordinator.foregroundObserverToken = fgToken
    }

    private static func teardownPlayer(coordinator: Coordinator) {
        if let token = coordinator.loopObserverToken {
            NotificationCenter.default.removeObserver(token)
            coordinator.loopObserverToken = nil
        }
        if let token = coordinator.foregroundObserverToken {
            NotificationCenter.default.removeObserver(token)
            coordinator.foregroundObserverToken = nil
        }
        coordinator.player?.pause()
        coordinator.playerLayer?.player = nil
        coordinator.player = nil
    }
}

private class PlayerContainerView: UIView {
    var playerLayer: AVPlayerLayer?
    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer?.frame = bounds
    }
}
