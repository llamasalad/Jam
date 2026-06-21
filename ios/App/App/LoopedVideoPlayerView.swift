import SwiftUI
import AVFoundation

struct LoopedVideoPlayerView: UIViewRepresentable {
    let urlString: String

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear

        context.coordinator.currentUrl = urlString

        guard let url = URL(string: urlString) else { return view }
        let asset = AVURLAsset(url: url)
        let playerItem = AVPlayerItem(asset: asset)
        let queuePlayer = AVQueuePlayer(playerItem: playerItem)

        context.coordinator.looper = AVPlayerLooper(player: queuePlayer, templateItem: playerItem)

        let playerLayer = AVPlayerLayer(player: queuePlayer)
        playerLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(playerLayer)
        context.coordinator.playerLayer = playerLayer

        queuePlayer.isMuted = true
        queuePlayer.automaticallyWaitsToMinimizeStalling = false
        queuePlayer.play()

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        if context.coordinator.currentUrl != urlString {
            context.coordinator.looper = nil
            context.coordinator.playerLayer?.player?.pause()
            context.coordinator.playerLayer?.player = nil

            context.coordinator.currentUrl = urlString
            guard let url = URL(string: urlString) else { return }
            let asset = AVURLAsset(url: url)
            let playerItem = AVPlayerItem(asset: asset)
            let queuePlayer = AVQueuePlayer(playerItem: playerItem)

            context.coordinator.looper = AVPlayerLooper(player: queuePlayer, templateItem: playerItem)
            context.coordinator.playerLayer?.player = queuePlayer

            queuePlayer.isMuted = true
            queuePlayer.automaticallyWaitsToMinimizeStalling = false
            queuePlayer.play()
        }

        DispatchQueue.main.async {
            context.coordinator.playerLayer?.frame = uiView.bounds
        }
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        coordinator.looper = nil
        coordinator.playerLayer?.player?.pause()
        coordinator.playerLayer?.player = nil
        coordinator.playerLayer = nil
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator {
        var looper: AVPlayerLooper?
        var playerLayer: AVPlayerLayer?
        var currentUrl: String = ""
    }
}
