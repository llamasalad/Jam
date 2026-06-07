import SwiftUI

struct MainSwiftUIView: View {
    @StateObject private var state = PlaybackStateManager.shared
    @State private var selectedTab: String = "library"
    @State private var isSearchActive: Bool = false
    @State private var searchQuery: String = ""
    @State private var showExpandedPlayer: Bool = false
    @FocusState private var isSearchFieldFocused: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                if state.isLiquidThemeActive {
                    LiquidBgView()
                        .transition(.opacity)
                } else {
                    Color.black
                        .ignoresSafeArea()
                }
                CapacitorWebViewRepresentable()
                    .ignoresSafeArea(edges: [.top, .bottom])
            }
            .overlay(alignment: .bottom) {
                if state.hasSong {
                    MiniPlayerView(showExpandedPlayer: $showExpandedPlayer)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        PlaybackStateManager.shared.triggerSort()
                    }) {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        ForEach([
                            ("Aurion", "default"),
                            ("Ember", "ember-theme"),
                            ("Glacier", "glacier-theme"),
                            ("Void", "void-theme"),
                            ("Blind", "blind-theme"),
                            ("Rosecore", "rosecore-theme"),
                            ("Abyss", "abyss-theme"),
                            ("Glass", "liquid-glass-theme"),
                            ("Aurielle", "aurielle-theme")
                        ], id: \.1) { theme in
                            Button(action: {
                                PlaybackStateManager.shared.setTheme(theme.1)
                            }) {
                                Text(theme.0)
                                if (state.currentTheme == theme.1) {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "paintpalette")
                    }
                }
                
                ToolbarItemGroup(placement: .bottomBar) {
                    if isSearchActive {
                        HStack(spacing: 8) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(.secondary)

                            TextField("Search", text: $searchQuery)
                                .focused($isSearchFieldFocused)
                                .font(.body)
                                .foregroundStyle(.primary)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .submitLabel(.search)
                                .onChange(of: searchQuery) { _, newValue in
                                    PlaybackStateManager.shared.updateSearchQuery(newValue)
                                }

                            if !searchQuery.isEmpty {
                                Button(action: {
                                    searchQuery = ""
                                    PlaybackStateManager.shared.clearSearch()
                                }) {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 16))
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        
                        Button(action: {
                            withAnimation {
                                isSearchFieldFocused = false
                                isSearchActive = false
                                searchQuery = ""
                                PlaybackStateManager.shared.clearSearch()
                            }
                        }) {
                            Text("Cancel")
                        }
                    } else {
                        Button(action: {
                            withAnimation {
                                selectedTab = "library"
                                PlaybackStateManager.shared.switchWebTab(tabName: "library")
                            }
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: selectedTab == "library" ? "music.note.house.fill" : "music.note.house")
                                    .font(.system(size: 18))
                                Text("Library").font(.system(size: 10, weight: .medium))
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 12)
                        }
                        .foregroundStyle(selectedTab == "library" ? .primary : .secondary)

                        Button(action: {
                            withAnimation {
                                selectedTab = "playlists"
                                PlaybackStateManager.shared.switchWebTab(tabName: "playlists")
                            }
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: selectedTab == "playlists" ? "music.note.list" : "music.note.list")
                                    .font(.system(size: 18))
                                Text("Playlists").font(.system(size: 10, weight: .medium))
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 12)
                        }
                        .foregroundStyle(selectedTab == "playlists" ? .primary : .secondary)
                        
                        Spacer()
                        
                        Button(action: {
                            withAnimation {
                                isSearchActive = true
                                selectedTab = "library"
                                PlaybackStateManager.shared.switchWebTab(tabName: "library")
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                                isSearchFieldFocused = true
                            }
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 20))
                            }
                        }
                        .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .ignoresSafeArea(.keyboard)
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: state.isLiquidThemeActive)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: state.hasSong)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isSearchActive)
        .sheet(isPresented: $showExpandedPlayer) {
            ExpandedPlayerView()
                .presentationDragIndicator(.visible)
        }
        .preferredColorScheme(.dark)
    }
}

struct MiniPlayerView: View {
    @ObservedObject private var state = PlaybackStateManager.shared
    @Binding var showExpandedPlayer: Bool

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: state.coverUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure, .empty:
                    Image(systemName: "music.note")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(.secondary)
                @unknown default:
                    Image(systemName: "music.note")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 44, height: 44)
            .glassEffect(in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                MarqueeText(text: state.title.isEmpty ? "Not Playing" : state.title, font: .subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)

                if !state.artist.isEmpty {
                    Text(state.artist)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()
            HStack(spacing: 4) {
                Button(action: { state.triggerPrev() }) {
                    Image(systemName: "backward.fill")
                        .imageScale(.large)
                }
                .buttonStyle(.glass)

                Button(action: { state.togglePlayPause() }) {
                    Image(systemName: state.isPlaying ? "pause.fill" : "play.fill")
                        .font(.title2)
                }
                .buttonStyle(.glass)

                Button(action: { state.triggerNext() }) {
                    Image(systemName: "forward.fill")
                        .imageScale(.large)
                }
                .buttonStyle(.glass)
            }
        }
        .padding()
        .glassEffect()
        .contentShape(Rectangle())
        .onTapGesture {
            showExpandedPlayer = true
        }
    }
}

struct ExpandedPlayerView: View {
    @ObservedObject private var state = PlaybackStateManager.shared
    @State private var seekValue: Double = 0
    @State private var isSeeking: Bool = false
    @State private var showFullLyrics: Bool = false
    @State private var showQueue: Bool = false

    var body: some View {
        ZStack {
            // Blurred Background
            AsyncImage(url: URL(string: state.coverUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure, .empty:
                    Color.black
                @unknown default:
                    Color.black
                }
            }
            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
            .scaleEffect(1.2)
            .ignoresSafeArea()
            .overlay(Color.black.opacity(0.6))
            .blur(radius: 40)
            .ignoresSafeArea()
            
            VStack(spacing: 16) {
                AsyncImage(url: URL(string: state.coverUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(1, contentMode: .fit)
                        .frame(maxWidth: .infinity)
                case .failure, .empty:
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .glassEffect()
                        .aspectRatio(1, contentMode: .fit)
                        .frame(maxWidth: .infinity)
                        .overlay(
                            Image(systemName: "music.note")
                                .font(.system(size: 48, weight: .light))
                                .foregroundStyle(.secondary)
                        )
                @unknown default:
                    EmptyView()
                }
            }
            .backgroundExtensionEffect()
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .padding(.horizontal, 32)
            .shadow(color: .black.opacity(0.3), radius: 24, x: 0, y: 16)

            VStack(spacing: 4) {
                MarqueeText(text: state.title.isEmpty ? "Not Playing" : state.title, font: .title2, alignment: .center)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)

                MarqueeText(text: state.artist.isEmpty ? " " : state.artist, font: .title3, alignment: .center)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 24)

            Button(action: {
                showFullLyrics = true
            }) {
                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 8) {
                            if state.fullLyrics.isEmpty {
                                Text(state.currentLyric.isEmpty ? "-" : state.currentLyric)
                                    .font(.body.weight(.medium))
                                    .foregroundStyle(.primary)
                            } else {
                                ForEach(Array(state.fullLyrics.enumerated()), id: \.offset) { index, lyricDict in
                                    if let text = lyricDict["text"] as? String {
                                        let isActive = isActiveLyric(index: index, currentTime: state.currentTime)
                                        Text(text.isEmpty ? "•" : text)
                                            .font(isActive ? .body : .callout)
                                            .fontWeight(isActive ? .bold : .regular)
                                            .foregroundStyle(isActive ? .primary : .secondary)
                                            .multilineTextAlignment(.center)
                                            .id(index)
                                            .onChange(of: isActive) { _, new in
                                                if new {
                                                    withAnimation(.easeInOut(duration: 0.5)) {
                                                        proxy.scrollTo(index, anchor: .center)
                                                    }
                                                }
                                            }
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 40)
                    }
                    .onChange(of: state.title) { _, _ in
                        if !state.fullLyrics.isEmpty {
                            withAnimation {
                                proxy.scrollTo(0, anchor: .center)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 120)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24)
            .sheet(isPresented: $showFullLyrics) {
                FullLyricsView()
            }

            VStack(spacing: 6) {
                Slider(
                    value: Binding(
                        get: { isSeeking ? seekValue : state.currentTime },
                        set: { newValue in
                            seekValue = newValue
                            isSeeking = true
                        }
                    ),
                    in: 0...max(state.duration, 1),
                    onEditingChanged: { editing in
                        if !editing {
                            state.performSeek(to: seekValue)
                            isSeeking = false
                        }
                    }
                )
                .tint(.primary)

                HStack {
                    Text(formatTime(isSeeking ? seekValue : state.currentTime))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                    Spacer()
                    Text(formatTime(state.duration))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            }
            .padding(.horizontal, 24)
            HStack(spacing: 40) {
                Button(action: { state.triggerPrev() }) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(.primary)
                }

                Button(action: { state.togglePlayPause() }) {
                    Image(systemName: state.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 56, weight: .medium))
                        .foregroundStyle(.primary)
                }

                Button(action: { state.triggerNext() }) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(.primary)
                }
            }

            Spacer()

            HStack {
                Spacer()
                Button(action: {
                    showQueue = true
                }) {
                    Image(systemName: "list.bullet")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(.primary)
                        .padding(12)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 24)
            .sheet(isPresented: $showQueue) {
                QueueView()
            }
        }
        .padding(.top, 40)
        }
        .preferredColorScheme(.dark)
    }

    private func formatTime(_ t: Double) -> String {
        guard t.isFinite && t >= 0 else { return "0:00" }
        let mins = Int(t) / 60
        let secs = Int(t) % 60
        return "\(mins):\(String(format: "%02d", secs))"
    }

    private func isActiveLyric(index: Int, currentTime: Double) -> Bool {
        let currentDict = state.fullLyrics[index]
        guard let time = currentDict["time"] as? Double else { return false }
        
        let nextTime: Double
        if index + 1 < state.fullLyrics.count {
            let nextDict = state.fullLyrics[index + 1]
            if let nt = nextDict["time"] as? Double {
            nextTime = nt
        } else {
            nextTime = .infinity
        }
        
        return currentTime >= time && currentTime < nextTime
    }

    private func getActiveLyricIndex() -> Int? {
        for index in 0..<state.fullLyrics.count {
            if isActiveLyric(index: index, currentTime: state.currentTime) {
                return index
            }
        }
        return nil
    }
}

struct MarqueeText: View {
    let text: String
    let font: Font
    var alignment: Alignment = .leading
    
    @State private var animate = false
    @State private var textWidth: CGFloat = 0
    
    var body: some View {
        Text(text)
            .font(font)
            .lineLimit(1)
            .opacity(0)
            .frame(maxWidth: .infinity, alignment: alignment)
            .overlay(
                GeometryReader { geometry in
                    let isOversized = textWidth > geometry.size.width
                    
                    Text(text)
                        .font(font)
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                        .background(
                            GeometryReader { innerGeo in
                                Color.clear.preference(key: ViewWidthKey.self, value: innerGeo.frame(in: .local).width)
                            }
                        )
                        .onPreferenceChange(ViewWidthKey.self) {
                            textWidth = $0
                        }
                        .frame(width: geometry.size.width, alignment: isOversized ? .leading : alignment)
                        .offset(x: animate && isOversized ? -(textWidth - geometry.size.width) : 0)
                        .animation(
                            isOversized ?
                            Animation.linear(duration: Double(textWidth) * 0.03).delay(1.0).repeatForever(autoreverses: true) :
                            .default,
                            value: animate
                        )
                }
                .clipped()
            )
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { animate = true }
            }
            .onChange(of: text) { _, _ in
                animate = false
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { animate = true }
            }
    }
}

struct ViewWidthKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

struct FullLyricsView: View {
    @ObservedObject private var state = PlaybackStateManager.shared
    @Environment(\.dismiss) private var dismiss
    @State private var visibleLines: Set<Int> = []
    
    var body: some View {
        ZStack {
            AsyncImage(url: URL(string: state.coverUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure, .empty:
                    Color.black
                @unknown default:
                    Color.black
                }
            }
            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
            .scaleEffect(1.2)
            .ignoresSafeArea()
            .overlay(Color.black.opacity(0.6))
            .blur(radius: 40)
            .ignoresSafeArea()
            
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        dismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
                .padding()
                
                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 24) {
                            if state.fullLyrics.isEmpty {
                                Text("No lyrics available")
                                    .font(.title2)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white.opacity(0.6))
                            } else {
                                ForEach(Array(state.fullLyrics.enumerated()), id: \.offset) { index, lyricDict in
                                    if let time = lyricDict["time"] as? Double,
                                       let text = lyricDict["text"] as? String {
                                        
                                        let isActive = isActiveLyric(index: index, currentTime: state.currentTime)
                                        
                                        Text(text.isEmpty ? "•" : text)
                                            .font(.system(size: isActive ? 24 : 20, weight: isActive ? .bold : .medium))
                                            .foregroundStyle(isActive ? .white : .white.opacity(0.5))
                                            .multilineTextAlignment(.leading)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .id(index)
                                            .animation(.easeInOut(duration: 0.3), value: isActive)
                                            .onTapGesture {
                                                state.performSeek(to: time)
                                            }
                                            .onAppear {
                                                visibleLines.insert(index)
                                            }
                                            .onDisappear {
                                                visibleLines.remove(index)
                                            }
                                            .onChange(of: isActive) { _, new in
                                                if new {
                                                    let isPreviousVisible = index > 0 && visibleLines.contains(index - 1)
                                                    let isCurrentVisible = visibleLines.contains(index)
                                                    if index == 0 || isPreviousVisible || isCurrentVisible {
                                                        withAnimation(.easeInOut(duration: 0.5)) {
                                                            proxy.scrollTo(index, anchor: .center)
                                                        }
                                                    }
                                                }
                                            }
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 32)
                        .padding(.bottom, 120)
                        .padding(.top, 40)
                    }
                    .onChange(of: state.title) { _, _ in
                        if !state.fullLyrics.isEmpty {
                            withAnimation {
                                proxy.scrollTo(0, anchor: .top)
                            }
                        }
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    private func isActiveLyric(index: Int, currentTime: Double) -> Bool {
        guard let currentDict = state.fullLyrics[index] as? [String: Any],
              let time = currentDict["time"] as? Double else { return false }
        
        let nextTime: Double
        if index + 1 < state.fullLyrics.count,
           let nextDict = state.fullLyrics[index + 1] as? [String: Any],
           let nt = nextDict["time"] as? Double {
            nextTime = nt
        } else {
            nextTime = .infinity
        }
        
        return currentTime >= time && currentTime < nextTime
    }
}

struct QueueView: View {
    @ObservedObject private var state = PlaybackStateManager.shared
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            Color(white: 0.1).ignoresSafeArea()
            
            VStack {
                HStack {
                    Text("Up Next")
                        .font(.title2.bold())
                    Spacer()
                    Button(action: {
                        dismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
                .padding()
                
                ScrollView {
                    VStack(spacing: 8) {
                        if state.queue.isEmpty {
                            Text("Queue is empty")
                                .foregroundStyle(.secondary)
                                .padding(.top, 40)
                        } else {
                            ForEach(Array(state.queue.enumerated()), id: \.offset) { index, item in
                                let isPlaying = index == state.queueIndex
                                HStack(spacing: 12) {
                                    if isPlaying {
                                        Image(systemName: "waveform")
                                            .foregroundStyle(.white)
                                            .frame(width: 24)
                                    } else {
                                        Text("\\(index + 1)")
                                            .font(.subheadline)
                                            .foregroundStyle(.secondary)
                                            .frame(width: 24)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item["title"] as? String ?? "Unknown")
                                            .font(.body)
                                            .fontWeight(isPlaying ? .semibold : .regular)
                                            .foregroundStyle(.primary)
                                            .opacity(isPlaying ? 1.0 : 0.8)
                                            .lineLimit(1)
                                        
                                        Text(item["artist"] as? String ?? "Unknown")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                    Spacer()
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(isPlaying ? Color.white.opacity(0.1) : Color.clear)
                                .cornerRadius(8)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    state.playQueueItem(at: index)
                                }
                            }
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
