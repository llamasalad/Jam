import SwiftUI
import UIKit
import Capacitor

struct CapacitorWebViewRepresentable: UIViewControllerRepresentable {

    func makeUIViewController(context: Context) -> ViewController {
        let vc = ViewController()
        // Store reference so PdlaybackStateManager can evaluate JS
        PlaybackStateManager.shared.webViewController = vc
        return vc
    }

    func updateUIViewController(_ uiViewController: ViewController, context: Context) {
        // Make the web viw transparent so native background shows through
        if let webView = uiViewController.webView {
            webView.isOpaque = false
            webView.backgroundColor = .clear
            webView.scrollView.backgroundColor = .clear
        }
    }
}