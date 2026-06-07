import SwiftUI
import Capacitor
import Combine

import Observation

// Explicitly disambiguate KeyPath to prevent macro expansion shadowing
// from external C/Objective-C frameworks or plugins
typealias KeyPath<Root, Value> = Swift.KeyPath<Root, Value>

@Observable
@MainActor
final class PlaybackStateManager {
    static let shared = PlaybackStateManager()

    // MARK: - Playback State
    var isPlaying: Bool = false
    var currentTime: Double = 0
    var duration: Double = 0
    var title: String = ""
    var artist: String = ""
    var album: String = ""
    var coverUrl: String = ""

    // MARK: - Playback Mode State
    var shuffle: Bool = false
    var repeatMode: String = "off"  // "off", "all", "one"

    func toggleShuffle() {
        evaluateJS("if(typeof window.toggleShuffle==='function')window.toggleShuffle()")
    }

    func cycleRepeat() {
        evaluateJS("if(typeof window.toggleRepeat==='function')window.toggleRepeat()")
    }

    // MARK: - Theme State
    var isLiquidThemeActive: Bool = false
    var currentTheme: String = "default"

    // MARK: - Lyrics State
    var currentLyric: String = ""
    var nextLyric: String = ""
    var fullLyrics: [[String: Any]] = []
    var activeLyricIndex: Int? = nil

    private func updateActiveLyricIndex() {
        if fullLyrics.isEmpty {
            if activeLyricIndex != nil { activeLyricIndex = nil }
            return
        }
        for index in 0..<fullLyrics.count {
            if isActiveLyric(index: index, currentTime: currentTime) {
                if activeLyricIndex != index {
                    activeLyricIndex = index
                }
                return
            }
        }
        if activeLyricIndex != nil { activeLyricIndex = nil }
    }

    private func isActiveLyric(index: Int, currentTime: Double) -> Bool {
        let currentDict = fullLyrics[index]
        guard let time = currentDict["time"] as? Double else { return false }

        let nextTime: Double
        if index + 1 < fullLyrics.count,
           let nt = fullLyrics[index + 1]["time"] as? Double {
            nextTime = nt
        } else {
            nextTime = .infinity
        }

        return currentTime >= time && currentTime < nextTime
    }

    // MARK: - Queue State
    var queue: [[String: Any]] = []
    var queueIndex: Int = -1

    func updateCurrentTime(_ time: Double) {
        self.currentTime = time
        self.updateActiveLyricIndex()
    }

    func updateFullLyrics(_ lyrics: [[String: Any]]) {
        self.fullLyrics = lyrics
        self.updateActiveLyricIndex()
    }

    // MARK: - References
    @ObservationIgnored weak var webViewController: CAPBridgeViewController?
    @ObservationIgnored weak var audioPlayerPlugin: CAPPlugin?

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

    func triggerSort() {
        evaluateJS("if(typeof document !== 'undefined' && document.getElementById('sort-btn')){document.getElementById('sort-btn').click();}")
    }

    func setTheme(_ theme: String) {
        let js = """
        (function() {
            var opt = document.querySelector('.theme-option[data-theme="\(theme)"]') || document.querySelector('.sidebar-theme-option[data-theme="\(theme)"]');
            if (opt) {
                opt.click();
            } else {
                if (typeof currentTheme !== 'undefined') currentTheme = '\(theme)';
                localStorage.setItem('music_theme', '\(theme)');
                if (typeof applyTheme === 'function') applyTheme();
            }
        })();
        """
        evaluateJS(js)
        self.currentTheme = theme
        self.isLiquidThemeActive = (theme == "liquid-glass-theme")
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
        evaluateJS("if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AudioPlayerPlugin) { window.Capacitor.Plugins.AudioPlayerPlugin.seek({to:\(time)}); } else if(typeof audio!=='undefined'&&audio) { audio.currentTime=\(time); }")
    }

    func playQueueItem(at index: Int) {
        evaluateJS("if(typeof playQueueIndex==='function')playQueueIndex(\(index))")
    }

    func moveQueueItem(from source: IndexSet, to destination: Int) {
        queue.move(fromOffsets: source, toOffset: destination)
        
        if let sourceIdx = source.first {
            let actualDest = sourceIdx < destination ? destination - 1 : destination
            if queueIndex == sourceIdx {
                queueIndex = actualDest
            } else if queueIndex > sourceIdx && queueIndex <= actualDest {
                queueIndex -= 1
            } else if queueIndex < sourceIdx && queueIndex >= actualDest {
                queueIndex += 1
            }
            evaluateJS("if(typeof window.moveQueueItem==='function')window.moveQueueItem(\(sourceIdx), \(actualDest))")
        }
    }

    // MARK: - Private

    private func evaluateJS(_ js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webViewController?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}
