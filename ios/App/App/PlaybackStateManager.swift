import SwiftUI
import Capacitor
import Combine

@MainActor
class PlaybackStateManager: ObservableObject {
    static let shared = PlaybackStateManager()

    // MARK: - Playback State
    @Published var isPlaying: Bool = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var title: String = ""
    @Published var artist: String = ""
    @Published var album: String = ""
    @Published var coverUrl: String = ""

    // MARK: - Theme State
    @Published var isLiquidThemeActive: Bool = false

    // MARK: - References
    weak var webViewController: CAPBridgeViewController?
    weak var audioPlayerPlugin: CAPPlugin?

    var hasSong: Bool {
        !title.isEmpty
    }

    private init() {}

    // MARK: - Web View JavaScript Evaluation

    func switchWebTab(tabName: String) {
        evaluateJS("if(typeof window.onNativeTabSelected==='function'){window.onNativeTabSelected('\(tabName)')}")
    }

    func updateSearchQuery(_ query: String) {
        let escaped = query
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "")
        evaluateJS("""
            (function(){
                var s=document.getElementById('search');
                if(s){s.value='\(escaped)';if(typeof applyFilter==='function')applyFilter();}
            })()
        """)
    }

    func clearSearch() {
        evaluateJS("""
            (function(){
                var s=document.getElementById('search');
                if(s){s.value='';if(typeof applyFilter==='function')applyFilter();}
            })()
        """)
    }

    // MARK: - Playback Control Helpers

    func togglePlayPause() {
        evaluateJS("if(typeof audio!=='undefined'&&audio){audio.paused?audio.play():audio.pause()}")
    }

    func triggerNext() {
        evaluateJS("if(typeof nextTrack==='function')nextTrack()")
    }

    func triggerPrev() {
        evaluateJS("""
            (function(){
                if(typeof audio!=='undefined'&&audio&&audio.currentTime>3){audio.currentTime=0}
                else if(typeof prevTrack==='function'){prevTrack()}
            })()
        """)
    }

    func performSeek(to time: Double) {
        evaluateJS("if(typeof audio!=='undefined'&&audio){audio.currentTime=\(time)}")
    }

    // MARK: - Private

    private func evaluateJS(_ js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webViewController?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}
