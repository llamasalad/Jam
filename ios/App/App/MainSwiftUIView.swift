import SwiftUI

struct MainSwiftUIView: View {
    private var state: PlaybackStateManager { .shared }
    @State private var selectedTab: String = "library"
    @State private var isSearchActive: Bool = false
    @State private var searchQuery: String = ""
    @State private var showExpandedPlayer: Bool = false
    @FocusState private var isSearchFieldFocused: Bool
    @State private var themeChangePulse: Int = 0
    @Namespace private var playerNamespace

    var body: some View {
        NavigationStack {
            CapacitorWebViewRepresentable()
                .ignoresSafeArea(edges: [.top, .bottom])
                .safeAreaInset(edge: .bottom) {
                    if state.hasSong {
                        MiniPlayerView(showExpandedPlayer: $showExpandedPlayer)
                            .padding(.horizontal, 12)
                            .padding(.bottom, 8)
                            .background(GeometryReader { geo in
                                Color.clear.preference(key: MiniPlayerHeightPreferenceKey.self, value: geo.size.height)
                            })
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                            .matchedTransitionSource(id: "expandedPlayer", in: playerNamespace)
                    } else {
                        Color.clear.frame(height: 0)
                            .preference(key: MiniPlayerHeightPreferenceKey.self, value: 0)
                    }
                }
                .onPreferenceChange(MiniPlayerHeightPreferenceKey.self) { height in
                    let bottomSafeArea = (UIApplication.shared.connectedScenes
                        .compactMap { $0 as? UIWindowScene }
                        .first?.windows.first { $0.isKeyWindow }?
                        .safeAreaInsets.bottom) ?? 0
                    let bottomBarHeight: CGFloat = 49 + bottomSafeArea
                    let totalInset = height > 0 ? height + bottomBarHeight : bottomBarHeight
                    PlaybackStateManager.shared.updateMiniPlayerHeight(totalInset)
                }
                .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if state.isInDetailView {
                        Button(action: {
                            PlaybackStateManager.shared.navigateBack()
                        }) {
                            Image(systemName: "chevron.left")
                                .frame(width: 44, height: 44)
                        }
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        PlaybackStateManager.shared.triggerSort()
                    }) {
                        Image(systemName: "line.horizontal.3.decrease")
                            .frame(width: 44, height: 44)
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
                            ("Glass", "liquid-glass-theme")
                        ], id: \.1) { theme in
                            Button(action: {
                                PlaybackStateManager.shared.setTheme(theme.1)
                                themeChangePulse += 1
                            }) {
                                Text(theme.0)
                                if state.currentTheme == theme.1 {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "paintpalette")
                            .symbolEffect(.bounce, value: themeChangePulse)
                            .frame(width: 44, height: 44)
                    }
                }

                ToolbarItemGroup(placement: .bottomBar) {
                    if isSearchActive {
                        HStack(spacing: 8) {
                            Image(systemName: "magnifyingglass")
                                .frame(width: 44, height: 44)
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

                                Button(action: {
                                    isSearchFieldFocused = false
                                    isSearchActive = false
                                    searchQuery = ""
                                    PlaybackStateManager.shared.clearSearch()
                                }) {
                                    Image(systemName: "xmark")
                                        .foregroundStyle(.secondary)
                                        .frame(width: 44, height: 44)
                                }
                                .buttonStyle(.plain)
                        }

                    } else {
                        Button(action: {
                            withAnimation {
                                selectedTab = "library"
                                PlaybackStateManager.shared.switchWebTab(tabName: "library")
                            }
                        }) {
                            Image(systemName: selectedTab == "library" ? "house.fill" : "house")
                                .imageScale(.large)
                                .frame(width: 44, height: 44)
                                .padding(.horizontal, 6)
                        }
                        .foregroundStyle(selectedTab == "library" ? .primary : .secondary)

                        Button(action: {
                            withAnimation {
                                selectedTab = "playlists"
                                PlaybackStateManager.shared.switchWebTab(tabName: "playlists")
                            }
                        }) {
                            Image(systemName: "list.triangle")
                                .imageScale(.large)
                                .frame(width: 44, height: 44)
                                .padding(.horizontal, 6)
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
                            Image(systemName: "magnifyingglass")
                                .frame(width: 44, height: 44)
                        }
                        .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .ignoresSafeArea(.keyboard)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: state.hasSong)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isSearchActive)
        .sheet(isPresented: $showExpandedPlayer) {
            ExpandedPlayerView()
                .presentationDragIndicator(.visible)
                .navigationTransition(.zoom(sourceID: "expandedPlayer", in: playerNamespace))
        }
    }
}

struct MiniPlayerView: View {
    private var state: PlaybackStateManager { .shared }
    @Binding var showExpandedPlayer: Bool

    var body: some View {
        HStack(spacing: 12) {
            Button {
                showExpandedPlayer = true
            } label: {
                HStack(spacing: 12) {
                    AsyncImage(url: URL(string: state.coverUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure:
                            Image(systemName: "music.note")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundStyle(.secondary)
                        case .empty:
                            ProgressView()
                        @unknown default:
                            ProgressView()
                        }
                    }
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .glassEffect(in: RoundedRectangle(cornerRadius: 8, style: .continuous))

                    VStack(alignment: .leading, spacing: 2) {
                        MarqueeText(text: state.title.isEmpty ? "Not Playing" : state.title, font: .headline)
                            .fontWeight(.semibold)

                        if !state.artist.isEmpty {
                            Text(state.artist)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            HStack(spacing: 4) {
                Button(action: { state.triggerPrev() }) {
                    Image(systemName: "backward.fill")
                        .imageScale(.large)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)

                Button(action: { state.togglePlayPause() }) {
                    Image(systemName: state.isPlaying ? "pause.fill" : "play.fill")
                        .font(.title2)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)

                Button(action: { state.triggerNext() }) {
                    Image(systemName: "forward.fill")
                        .imageScale(.large)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
            }
            .fixedSize()
        }
        .padding(.horizontal)
        .padding(.vertical, 6)
        .glassEffect()
        .contentShape(Rectangle())
        .onTapGesture {
            showExpandedPlayer = true
        }
    }
}

struct ExpandedPlayerView: View {
    private var state: PlaybackStateManager { .shared }
    @Environment(\.dismiss) private var dismiss
    @State private var showQueue: Bool = false

    var body: some View {
        ZStack {
            BlurredBackgroundView(url: state.coverUrl)

            VStack(spacing: 16) {
                Spacer()
                AlbumArtView()
                TrackInfoView()
                LyricSnippetView()

                PlaybackProgressView()
                    .padding(.horizontal, 24)

                PlaybackControlsView()

                HStack {
                    Button(action: { showQueue = true }) {
                        Image(systemName: "list.dash")
                            .imageScale(.large)
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(.regular.interactive(), in: .circle)
                }
                .padding()
                .sheet(isPresented: $showQueue) {
                    QueueView()
                }
            }
            .padding(.top, 50)
        }
    }
}

private struct AlbumArtView: View {
    private var state: PlaybackStateManager { .shared }

    var body: some View {
        AsyncImage(url: URL(string: state.coverUrl)) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(1, contentMode: .fill)
                    .frame(maxWidth: .infinity)
            case .failure:
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .glassEffect()
                    .aspectRatio(1, contentMode: .fill)
                    .frame(maxWidth: .infinity)
                    .overlay(
                        Image(systemName: "music.note")
                            .font(.system(size: 48, weight: .light))
                            .foregroundStyle(.secondary)
                    )
            case .empty:
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .glassEffect()
                    .aspectRatio(1, contentMode: .fill)
                    .frame(maxWidth: .infinity)
                    .overlay(ProgressView())
            @unknown default:
                EmptyView()
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(.horizontal, 32)
        .shadow(color: .black.opacity(0.3), radius: 24, x: 0, y: 16)
    }
}

private struct TrackInfoView: View {
    private var state: PlaybackStateManager { .shared }
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 4) {
            Button(action: {
                state.openAlbumDetail()
                dismiss()
            }) {
                MarqueeText(text: state.title.isEmpty ? "Not Playing" : state.title, font: .title2, alignment: .center)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)
            }
            .buttonStyle(.plain)

            Button(action: {
                state.openArtistDetail()
                dismiss()
            }) {
                MarqueeText(text: state.artist.isEmpty ? " " : state.artist, font: .title3, alignment: .center)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 24)
    }
}

private struct LyricSnippetView: View {
    private var state: PlaybackStateManager { .shared }
    @State private var showFullLyrics: Bool = false
    @State private var displayedCurrentLyric: String = ""
    @State private var displayedNextLyric: String = ""
    @State private var lyricOpacity: Double = 1
    @State private var lyricOffset: CGFloat = 0

    var body: some View {
        Button(action: { showFullLyrics = true }) {
            VStack(spacing: 10) {
                Text(displayedCurrentLyric.isEmpty ? "..." : displayedCurrentLyric)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(nil)

                Text(displayedNextLyric.isEmpty ? " " : displayedNextLyric)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(nil)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 100)
            .clipped()
            .opacity(lyricOpacity)
            .offset(y: lyricOffset)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 24)
        .sheet(isPresented: $showFullLyrics) {
            FullLyricsView()
        }
        .task {
            displayedCurrentLyric = state.currentLyric
            displayedNextLyric = state.nextLyric
        }
        .onChange(of: state.activeLyricIndex) { _, _ in
            withAnimation(.snappy(duration: 0.15)) {
                lyricOpacity = 0
                lyricOffset = 6
            } completion: {
                displayedCurrentLyric = state.currentLyric
                displayedNextLyric = state.nextLyric

                withAnimation(.bouncy(duration: 0.25)) {
                    lyricOpacity = 1
                    lyricOffset = 0
                }
            }
        }
    }
}

struct PlaybackProgressView: View {
    private var state: PlaybackStateManager { .shared }
    @State private var localTime: Double = 0
    @State private var isDragging: Bool = false

    var body: some View {
        VStack(spacing: 6) {
            Slider(
                value: $localTime,
                in: 0...max(state.duration, 1),
                onEditingChanged: { editing in
                    isDragging = editing
                    if !editing {
                        state.performSeek(to: localTime)
                    }
                }
            )
            .tint(.primary)
            .onChange(of: state.currentTime, initial: true) { _, newTime in
                if !isDragging {
                    localTime = newTime
                }
            }

            HStack {
                Text(formatTime(localTime))
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
        .onChange(of: state.title) { _, _ in
            localTime = 0
            isDragging = false
        }
    }

    private func formatTime(_ t: Double) -> String {
        guard t.isFinite && t >= 0 else { return "0:00" }
        let mins = Int(t) / 60
        let secs = Int(t) % 60
        return "\(mins):\(String(format: "%02d", secs))"
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

class VisibleLinesTracker {
    var lines: Set<Int> = []
}

struct FullLyricsView: View {
    private var state: PlaybackStateManager { .shared }
    @Environment(\.dismiss) private var dismiss
    @State private var visibleTracker = VisibleLinesTracker()

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
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 20))
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                }
                .padding()

                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        LazyVStack(alignment: .leading, spacing: 24) {
                            if state.fullLyrics.isEmpty {
                                Text(state.currentLyric == "Loading lyrics..." ? "Loading lyrics..." : "No lyrics available")
                                    .font(.title2)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white.opacity(0.6))
                            } else {
                                ForEach(Array(state.fullLyrics.enumerated()), id: \.offset) { index, lyricDict in
                                    if let time = lyricDict["time"] as? Double,
                                       let text = lyricDict["text"] as? String {

                                        let isActive = state.activeLyricIndex == index

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
                                                visibleTracker.lines.insert(index)
                                            }
                                            .onDisappear {
                                                visibleTracker.lines.remove(index)
                                            }
                                            .onChange(of: isActive) { _, new in
                                                if new {
                                                    let isPreviousVisible = index > 0 && visibleTracker.lines.contains(index - 1)
                                                    let isCurrentVisible = visibleTracker.lines.contains(index)
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
                    .onChange(of: state.fullLyrics.count) { _, newCount in
                        if newCount > 0 {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                if let activeIndex = state.activeLyricIndex {
                                    withAnimation(.easeInOut(duration: 0.5)) {
                                        proxy.scrollTo(activeIndex, anchor: .center)
                                    }
                                }
                            }
                        }
                    }
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            if let activeIndex = state.activeLyricIndex {
                                proxy.scrollTo(activeIndex, anchor: .center)
                            }
                        }
                    }
                }
            }
        }
    }
}

struct QueueView: View {
    private var state: PlaybackStateManager { .shared }
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            BlurredBackgroundView(url: state.coverUrl)

            VStack {
                HStack {
                    Text("Up Next")
                        .font(.title2.bold())
                    Spacer()
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 20))
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                }
                .padding()
                ScrollViewReader { proxy in
                    List {
                    if state.queue.isEmpty {
                        Text("Queue is empty")
                            .foregroundStyle(.secondary)
                            .padding(.top, 40)
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    } else {
                        ForEach(Array(state.queue.enumerated()), id: \.offset) { index, item in
                            let isPlaying = index == state.queueIndex
                            HStack(spacing: 6) {
                                if isPlaying {
                                    Image(systemName: "waveform")
                                        .symbolEffect(.variableColor.iterative, options: .repeating, isActive: state.isPlaying)
                                        .foregroundStyle(.white)
                                        .frame(width: 24)
                                } else {
                                    Color.clear
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
                            .id(index)
                            .padding(.horizontal)
                            .padding(.vertical, 6)
                            .glassEffect(isPlaying ? .regular.tint(.white.opacity(0.1)) : .clear, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .contentShape(Rectangle())
                            .onTapGesture {
                                state.playQueueItem(at: index)
                            }
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                        }
                        .onMove { source, destination in
                            state.moveQueueItem(from: source, to: destination)
                        }
                        .deleteDisabled(true)
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .environment(\.editMode, .constant(.active))
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        if state.queueIndex >= 0 && state.queueIndex < state.queue.count {
                            withAnimation {
                                proxy.scrollTo(state.queueIndex, anchor: .center)
                            }
                        }
                    }
                }
                .onChange(of: state.queueIndex) { _, newIndex in
                    if newIndex >= 0 && newIndex < state.queue.count {
                        withAnimation {
                            proxy.scrollTo(newIndex, anchor: .center)
                        }
                    }
                }
                }
            }
        }
    }
}

struct PlaybackControlsView: View {
    private var state: PlaybackStateManager { .shared }

    var body: some View {
        HStack(spacing: 24) {
            Button(action: { state.toggleShuffle() }) {
                Image(systemName: "shuffle")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(state.shuffle ? .primary : .secondary)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .glassEffect(state.shuffle ? .regular.interactive() : .clear.interactive(), in: .circle)
                
            Button(action: { state.triggerPrev() }) {
                Image(systemName: "backward.fill")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(.primary)
                    .frame(width: 54, height: 54)
            }
            .buttonStyle(.plain)
            .glassEffect(.regular.interactive(), in: .circle)

            Button(action: { state.togglePlayPause() }) {
                Image(systemName: state.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(.primary)
                    .frame(width: 72, height: 72)
            }
            .buttonStyle(.plain)
            .glassEffect(.regular.interactive(), in: .circle)

            Button(action: { state.triggerNext() }) {
                Image(systemName: "forward.fill")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(.primary)
                    .frame(width: 54, height: 54)
            }
            .buttonStyle(.plain)
            .glassEffect(.regular.interactive(), in: .circle)

            Button(action: { state.cycleRepeat() }) {
                Image(systemName: state.repeatMode == "one" ? "repeat.1" : "repeat")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(state.repeatMode == "off" ? .secondary : .primary)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .glassEffect(state.repeatMode != "off" ? .regular.interactive() : .clear.interactive(), in: .circle)
        }
    }
}

struct BlurredBackgroundView: View {
    let url: String
    
    var body: some View {
        AsyncImage(url: URL(string: url)) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            case .failure:
                Color.black
            case .empty:
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
    }
}

struct MiniPlayerHeightPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}