import SwiftUI
import UIKit
import Capacitor

struct CapacitorWebViewRepresentable: UIViewControllerRepresentable {

    // Created exactly once for the lifetime of the app
    private static let sharedViewController: ViewController = {
        let vc = ViewController()
        Task { @MainActor in
            PlaybackStateManager.shared.webViewController = vc
        }
        return vc
    }()

    func makeUIViewController(context: Context) -> ViewController {
        return Self.sharedViewController
    }

    func updateUIViewController(_ uiViewController: ViewController, context: Context) {
        if let webView = uiViewController.webView {
            webView.isOpaque = false
            webView.backgroundColor = .clear
            webView.scrollView.backgroundColor = .clear
        }
    }
}