import SwiftUI
import Capacitor
import Combine
import WebKit

import Observation

// Explicitly disambiguate KeyPath to prevent macro expansion shadowing
// from external C/Objective-C frameworks or plugins
typealias KeyPath<Root, Value> = Swift.KeyPath<Root, Value>

@Observable
@MainActor
final class PlaybackStateManager {
    static let shared = PlaybackStateManager()

    var isPlaying: Bool = false
    var currentTime: Double = 0
    var duration: Double = 0
    var title: String = ""
    var artist: String = ""
    var album: String = ""
    var coverUrl: String = ""
    var shuffle: Bool = false
    var repeatMode: String = "off"  // "off", "all", "one"
    var starred: Bool = false

    func toggleShuffle() {
        evaluateJS("if(typeof window.toggleShuffle==='function')window.toggleShuffle()")
    }

    func cycleRepeat() {
        evaluateJS("if(typeof window.toggleRepeat==='function')window.toggleRepeat()")
    }

    func toggleStar() {
        evaluateJS("if(typeof window.toggleStarCurrent==='function')window.toggleStarCurrent()")
    }

    var currentTheme: String = "default"
    var currentQuality: String = "original"
    var isInDetailView: Bool = false
    var detailViewTitle: String = ""
    var currentLyric: String = ""
    var nextLyric: String = ""
    var fullLyrics: [[String: Any]] = []
    var activeLyricIndex: Int? = nil

    private func updateActiveLyricIndex(for time: Double) {
        if fullLyrics.isEmpty {
            if activeLyricIndex != nil { activeLyricIndex = nil }
            currentLyric = ""
            nextLyric = ""
            return
        }
        for index in 0..<fullLyrics.count {
            if isActiveLyric(index: index, currentTime: time) {
                if activeLyricIndex != index {
                    activeLyricIndex = index
                    currentLyric = (fullLyrics[index]["text"] as? String) ?? ""
                    if index + 1 < fullLyrics.count {
                        nextLyric = (fullLyrics[index + 1]["text"] as? String) ?? ""
                    } else {
                        nextLyric = ""
                    }
                }
                return
            }
        }
        if activeLyricIndex != nil {
            activeLyricIndex = nil
            currentLyric = ""
            nextLyric = ""
        }
    }

    /// Called at full 20 Hz from AVPlayer observer — updates lyric index without writing currentTime.
    func updateActiveLyricIndexOnly(_ time: Double) {
        updateActiveLyricIndex(for: time)
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

    var queue: [[String: Any]] = []
    var queueIndex: Int = -1

    func updateCurrentTime(_ time: Double) {
        self.currentTime = time
        self.updateActiveLyricIndex(for: time)
    }

    func updateFullLyrics(_ lyrics: [[String: Any]]) {
        self.fullLyrics = lyrics
        self.updateActiveLyricIndex(for: self.currentTime)
    }

    @ObservationIgnored weak var webViewController: CAPBridgeViewController?
    @ObservationIgnored weak var audioPlayerPlugin: CAPPlugin?

    var hasSong: Bool {
        !title.isEmpty
    }

    private init() {}

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
    }

    func setQuality(_ quality: String) {
        let js = """
        (function() {
            var opt = document.querySelector('.quality-option[data-quality="\(quality)"]');
            if (opt) {
                opt.click();
            } else {
                if (typeof currentQuality !== 'undefined') currentQuality = '\(quality)';
                localStorage.setItem('jam_bitrate', '\(quality)');
                if (typeof applyQuality === 'function') applyQuality();
            }
        })();
        """
        evaluateJS(js)
        self.currentQuality = quality
    }

    func navigateBack() {
        evaluateJS("if(typeof window.navigateBack==='function')window.navigateBack()")
    }

    func openAlbumDetail() {
        if !album.isEmpty {
            evaluateJS("if(typeof window.openAlbumDetail==='function')window.openAlbumDetail('\(album.replacingOccurrences(of: "'", with: "\\'"))')")
        }
    }

    func openArtistDetail() {
        if !artist.isEmpty {
            evaluateJS("if(typeof window.openArtistDetail==='function')window.openArtistDetail('\(artist.replacingOccurrences(of: "'", with: "\\'"))')")
        }
    }

    @ObservationIgnored private var lastKnownInset: CGFloat = 0

    private var insetJS: String {
        "document.documentElement.style.setProperty('--native-bottom-inset', '\(lastKnownInset)px');"
    }

    func updateMiniPlayerHeight(_ height: CGFloat) {
        guard height != lastKnownInset else { return }
        lastKnownInset = height
        evaluateJS(insetJS)
    }

    func reapplyInset() {
        evaluateJS(insetJS)
    }

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
        if let plugin = audioPlayerPlugin as? AudioPlayerPlugin {
            plugin.seekNatively(to: time)
        } else {
            evaluateJS("if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AudioPlayerPlugin) { window.Capacitor.Plugins.AudioPlayerPlugin.seek({to:\(time)}); } else if(typeof audio!=='undefined'&&audio) { audio.currentTime=\(time); }")
        }
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

    func removeQueueItem(at index: Int) {
        guard index >= 0 && index < queue.count else { return }
        queue.remove(at: index)
        if index < queueIndex {
            queueIndex -= 1
        } else if index == queueIndex && queueIndex >= queue.count {
            queueIndex = queue.count - 1
        }
        evaluateJS("if(typeof window.removeFromQueue==='function')window.removeFromQueue(\(index))")
    }

    private func evaluateJS(_ js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webViewController?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}
