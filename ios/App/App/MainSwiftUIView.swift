import SwiftUI

struct MainSwiftUIView: View {
    @StateObject private var state = PlaybackStateManager.shared
    @State private var selectedTab: String = "library"
    @State private var isSearchActive: Bool = false
    @State private var searchQuery: String = ""
    @State private var showExpandedPlayer: Bool = false

    var body: some View {
        ZStack {
            // Layer 1: Background
            if state.isLiquidThemeActive {
                LiquidBgView()
                    .transition(.opacity)
            } else {
                Color.black
                    .ignoresSafeArea()
            }

            // Layer 2: Capacitor Web View
            CapacitorWebViewRepresentable()
                .ignoresSafeArea()

            // Layer 3: Native Header
            VStack {
                HeaderView()
                Spacer()
            }

            // Layer 4: Native Bottom Overlays
            VStack(spacing: 0) {
                Spacer()

                if state.hasSong {
                    MiniPlayerView(showExpandedPlayer: $showExpandedPlayer)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                FloatingDockView(
                    selectedTab: $selectedTab,
                    isSearchActive: $isSearchActive,
                    searchQuery: $searchQuery
                )
                .padding(.bottom, 8)
            }
        }
        .ignoresSafeArea(.keyboard)
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: state.isLiquidThemeActive)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: state.hasSong)
        .sheet(isPresented: $showExpandedPlayer) {
            ExpandedPlayerView()
                .presentationDragIndicator(.visible)
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Mini Player

struct MiniPlayerView: View {
    @ObservedObject private var state = PlaybackStateManager.shared
    @Binding var showExpandedPlayer: Bool

    var body: some View {
        HStack(spacing: 12) {
            // Cover Art
            // Was: .background(Color.white.opacity(0.06)) + .clipShape(...)
            // Now: .glassEffect(in:) handles both fill and clipping in one call
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

            // Song Info
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

            // Playback Controls
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

// MARK: - Floating Dock

struct FloatingDockView: View {
    @Binding var selectedTab: String
    @Binding var isSearchActive: Bool
    @Binding var searchQuery: String
    @FocusState var isSearchFieldFocused: Bool
    @Namespace private var namespace

    var body: some View {
        GlassEffectContainer(spacing: 12.0) {
            HStack(spacing: 12) {
                if isSearchActive {
                    searchActiveContent
                } else {
                    defaultDockContent
                }
            }
        }
        .padding(.horizontal, 16)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isSearchActive)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isSearchFieldFocused)
    }

    // MARK: - Default Dock: Tab Pill + Search Circle

    @ViewBuilder
    private var defaultDockContent: some View {
        HStack(spacing: 0) {
            tabButton(label: "Library", icon: "music.note.house", tab: "library")
            tabButton(label: "Playlists", icon: "music.note.list", tab: "playlists")
        }
        .padding(4)
        .glassEffect()
        .glassEffectID("tabPill", in: namespace)
        .transition(.move(edge: .leading).combined(with: .opacity))

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
            Image(systemName: "magnifyingglass")
                .imageScale(.large)
                .padding()
        }
        .buttonStyle(.glass)
        .glassEffectID("searchCircle", in: namespace)
        .transition(.move(edge: .trailing).combined(with: .opacity))
    }

    // MARK: - Search Active: Input + Cancel/Back

    @ViewBuilder
    private var searchActiveContent: some View {
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
        .padding()
        .glassEffect()
        .glassEffectID("searchCircle", in: namespace)

        Button(action: { exitSearch() }) {
            Image(systemName: "xmark")
                .imageScale(.medium)
                .padding()
        }
        .buttonStyle(.glass)
        .transition(.move(edge: .trailing).combined(with: .opacity))
    }

    // MARK: - Tab Button

    private func tabButton(label: String, icon: String, tab: String) -> some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                selectedTab = tab
                PlaybackStateManager.shared.switchWebTab(tabName: tab)
            }
        }) {
            HStack(spacing: 6) {
                let activeIcon = icon == "music.note.list" ? "music.note.list" : "\(icon).fill"
                Image(systemName: selectedTab == tab ? activeIcon : icon)
                    .font(.system(size: 14, weight: .medium))
                Text(label)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .foregroundStyle(selectedTab == tab ? .primary : .secondary)
            .padding()
            // Was: Color.white.opacity(0.1) background — manual imitation of glass
            // Now: actual glass capsule that inherits the same material as its container
            .background {
                if selectedTab == tab {
                    Capsule().glassEffect()
                }
            }
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Exit Search

    private func exitSearch() {
        withAnimation {
            isSearchFieldFocused = false
            isSearchActive = false
            searchQuery = ""
            PlaybackStateManager.shared.clearSearch()
        }
    }
}

// MARK: - Expanded Player (Sheet)

struct ExpandedPlayerView: View {
    @ObservedObject private var state = PlaybackStateManager.shared
    @State private var seekValue: Double = 0
    @State private var isSeeking: Bool = false
    @State private var showFullLyrics: Bool = false

    var body: some View {
        VStack(spacing: 24) {
            // Cover Art
            AsyncImage(url: URL(string: state.coverUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                case .failure, .empty:
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .glassEffect()
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
                MarqueeText(text: state.title.isEmpty ? "Not Playing" : state.title, font: .title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)

                MarqueeText(text: state.artist.isEmpty ? " " : state.artist, font: .title3)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 24)

            Button(action: {
                showFullLyrics = true
            }) {
                VStack(spacing: 8) {
                    if !state.currentLyric.isEmpty {
                        Text(state.currentLyric)
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                            .animation(.easeInOut, value: state.currentLyric)
                    } else {
                        Text("-")
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                    if !state.nextLyric.isEmpty {
                        Text(state.nextLyric)
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .lineLimit(1)
                            .animation(.easeInOut, value: state.nextLyric)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 60)
                .padding()
                .glassEffect()
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
                }
                .buttonStyle(.glass)

                Button(action: { state.togglePlayPause() }) {
                    Image(systemName: state.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 56, weight: .medium))
                }
                .buttonStyle(.glass)

                Button(action: { state.triggerNext() }) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 28, weight: .medium))
                }
                .buttonStyle(.glass)
            }

            Spacer()
        }
        .padding(.top, 40)
        .background {
            Color.black.opacity(0.7)
        }
        .preferredColorScheme(.dark)
    }

    private func formatTime(_ t: Double) -> String {
        guard t.isFinite && t >= 0 else { return "0:00" }
        let mins = Int(t) / 60
        let secs = Int(t) % 60
        return "\(mins):\(String(format: "%02d", secs))"
    }
}

// MARK: - Header View

struct HeaderView: View {
    @ObservedObject private var state = PlaybackStateManager.shared
    
    let themes = [
        ("Aurion", "default"),
        ("Ember", "ember-theme"),
        ("Glacier", "glacier-theme"),
        ("Void", "void-theme"),
        ("Blind", "blind-theme"),
        ("Rosecore", "rosecore-theme"),
        ("Abyss", "abyss-theme"),
        ("Glass", "liquid-glass-theme"),
        ("Aurielle", "aurielle-theme")
    ]
    
    var body: some View {
        HStack {
            Spacer()
            
            Button(action: {
                PlaybackStateManager.shared.triggerSort()
            }) {
                Image(systemName: "arrow.up.arrow.down")
                    .imageScale(.large)
                    .padding()
            }
            .buttonStyle(.glass)
            
            Menu {
                ForEach(themes, id: \.1) { theme in
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
                    .imageScale(.large)
                    .padding()
            }
            .buttonStyle(.glass)
        }
        .padding()
    }
}

// MARK: - Marquee Text

struct MarqueeText: View {
    let text: String
    let font: Font
    
    @State private var animate = false
    @State private var textWidth: CGFloat = 0
    
    var body: some View {
        ZStack(alignment: .leading) {
            Text(text)
                .font(font)
                .lineLimit(1)
                .opacity(0)
            
            GeometryReader { geometry in
                Text(text)
                    .font(font)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                    .background(GeometryReader {
                        Color.clear.preference(key: ViewWidthKey.self, value: $0.frame(in: .local).width)
                    })
                    .onPreferenceChange(ViewWidthKey.self) {
                        textWidth = $0
                    }
                    .offset(x: animate && textWidth > geometry.size.width ? -(textWidth - geometry.size.width) : 0)
                    .animation(
                        textWidth > geometry.size.width ?
                        Animation.linear(duration: Double(textWidth) * 0.03).delay(1.0).repeatForever(autoreverses: true) :
                        .default,
                        value: animate
                    )
            }
            .clipped()
        }
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

// MARK: - Full Lyrics View

struct FullLyricsView: View {
    @ObservedObject private var state = PlaybackStateManager.shared
    @Environment(\.dismiss) private var dismiss
    @State private var visibleLines: Set<Int> = []
    
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
            .ignoresSafeArea()
            .overlay(Color.black.opacity(0.6))
            .blur(radius: 40)
            .ignoresSafeArea()
            
            VStack {
                // Header
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
                                            .font(.system(size: isActive ? 28 : 24, weight: isActive ? .bold : .medium))
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
                                                    // Auto-scroll ONLY when active line is visible
                                                    if visibleLines.contains(index) || (index > 0 && visibleLines.contains(index - 1)) || visibleLines.isEmpty {
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
                        .padding(.horizontal, 24)
                        .padding(.bottom, 120)
                        .padding(.top, 40)
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
