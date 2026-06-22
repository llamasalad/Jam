import SwiftUI
import AVFoundation

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
        let playerItem = AVPlayerItem(asset: asset)
        let player = AVPlayer(playerItem: playerItem)
        player.appliesMediaSelectionCriteriaAutomatically = false
        if let group = asset.mediaSelectionGroup(forMediaCharacteristic: .audible) {
            playerItem.select(nil, in: group)
        }

        let playerLayer = AVPlayerLayer(player: player)
        playerLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(playerLayer)
        view.playerLayer = playerLayer
        context.coordinator.playerLayer = playerLayer
        context.coordinator.player = player

        setupLoopObserver(for: playerItem, player: player, coordinator: context.coordinator)

        player.isMuted = true
        player.automaticallyWaitsToMinimizeStalling = false
        player.play()

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
            let playerItem = AVPlayerItem(asset: asset)
            let player = AVPlayer(playerItem: playerItem)
            player.appliesMediaSelectionCriteriaAutomatically = false
            if let group = asset.mediaSelectionGroup(forMediaCharacteristic: .audible) {
                playerItem.select(nil, in: group)
            }

            context.coordinator.playerLayer?.player = player
            context.coordinator.player = player

            setupLoopObserver(for: playerItem, player: player, coordinator: context.coordinator)

            player.isMuted = true
            player.automaticallyWaitsToMinimizeStalling = false
            player.play()
        }
        context.coordinator.playerLayer?.frame = uiView.bounds
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        teardownPlayer(coordinator: coordinator)
    }

    private func setupLoopObserver(for playerItem: AVPlayerItem, player: AVPlayer, coordinator: Coordinator) {
        if let token = coordinator.loopObserverToken {
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
    }

    private static func teardownPlayer(coordinator: Coordinator) {
        if let token = coordinator.loopObserverToken {
            NotificationCenter.default.removeObserver(token)
            coordinator.loopObserverToken = nil
        }
        coordinator.player?.pause()
        coordinator.playerLayer?.player = nil
        coordinator.player = nil
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator {
        var player: AVPlayer?
        var playerLayer: AVPlayerLayer?
        var loopObserverToken: NSObjectProtocol?
        var currentUrl: String = ""
    }
}

private class PlayerContainerView: UIView {
    var playerLayer: AVPlayerLayer?
    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer?.frame = bounds
    }
}
