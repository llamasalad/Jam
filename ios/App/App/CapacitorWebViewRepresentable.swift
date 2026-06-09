import SwiftUI
import UIKit
import Capacitor

struct CapacitorWebViewRepresentable: UIViewControllerRepresentable {

    func makeUIViewController(context: Context) -> ViewController {
        let vc = ViewController()
        PlaybackStateManager.shared.webViewController = vc
        return vc
    }

    func updateUIViewController(_ uiViewController: ViewController, context: Context) {
        if let webView = uiViewController.webView {
            webView.isOpaque = false
            webView.backgroundColor = .clear
            webView.scrollView.backgroundColor = .clear
        }
    }
}