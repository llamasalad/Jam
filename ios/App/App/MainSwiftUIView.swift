import SwiftUI

struct MainSwiftUIView: View {
    var state = PlaybackStateManager.shared
    @State private var selectedTab: Int = 0
    @State private var searchQuery: String = ""
    @State private var showExpandedPlayer: Bool = false
    @State private var themeChangePulse: Int = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Library", systemImage: "music.house.fill", value: 0) {
                webShell
            }
            Tab("Playlists", systemImage: "list.triangle", value: 1) {
                webShell
            }
            Tab("Search", systemImage: "magnifyingglass", value: 2) {
                searchShell
            }
        }
        .onChange(of: selectedTab) { _, newTab in
            let names = ["library", "playlists", "search"]
            PlaybackStateManager.shared.switchWebTab(tabName: names[newTab])
            if newTab != 2 {
                searchQuery = ""
                PlaybackStateManager.shared.clearSearch()
            }
        }
        .tabViewBottomAccessory {
            if state.hasSong {
                MiniPlayerView(showExpandedPlayer: $showExpandedPlayer)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: state.hasSong)
        .sheet(isPresented: $showExpandedPlayer) {
            ExpandedPlayerView()
                .presentationDragIndicator(.visible)
                .tint(.white)
        }
        .preferredColorScheme(.dark)
        .tint(.white)
    }

    @ViewBuilder
    private var webShell: some View {
        NavigationStack {
            webContent
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { PlaybackStateManager.shared.triggerSort() } label: {
                            Image(systemName: "line.horizontal.3.decrease")
                        }
                    }
                    ToolbarItem(placement: .topBarTrailing) { themePicker }
                }
        }
        .ignoresSafeArea(.keyboard)
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: state.isLiquidThemeActive)
    }

    @ViewBuilder
    private var searchShell: some View {
        NavigationStack {
            webContent
                .searchable(
                    text: $searchQuery,
                    placement: .navigationBarDrawer(displayMode: .always),
                    prompt: "Search library"
                )
                .onChange(of: searchQuery) { _, new in
                    new.isEmpty
                        ? PlaybackStateManager.shared.clearSearch()
                        : PlaybackStateManager.shared.updateSearchQuery(new)
                }
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) { themePicker }
                }
        }
        .ignoresSafeArea(.keyboard)
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: state.isLiquidThemeActive)
    }

    @ViewBuilder
    private var webContent: some View {
        ZStack {
            if state.isLiquidThemeActive {
                LiquidBgView()
                    .ignoresSafeArea()
                    .transition(.opacity)
            } else {
                Color.black.ignoresSafeArea()
            }
            CapacitorWebViewRepresentable()
                .ignoresSafeArea(edges: .top)
        }
    }

    @ViewBuilder
    private var themePicker: some View {
        Menu {
            ForEach([
                ("Aurion", "default"), ("Ember", "ember-theme"),
                ("Glacier", "glacier-theme"), ("Void", "void-theme"),
                ("Blind", "blind-theme"), ("Rosecore", "rosecore-theme"),
                ("Abyss", "abyss-theme"), ("Glass", "liquid-glass-theme")
            ], id: \.1) { name, id in
                Button {
                    PlaybackStateManager.shared.setTheme(id)
                    themeChangePulse += 1
                } label: {
                    Text(name)
                    if state.currentTheme == id { Image(systemName: "checkmark") }
                }
            }
        } label: {
            Image(systemName: "paintpalette")
                .symbolEffect(.bounce, value: themeChangePulse)
        }
    }
}

struct MiniPlayerView: View {
    var state = PlaybackStateManager.shared
    @Binding var showExpandedPlayer: Bool

    var body: some View {
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
                .frame(width: 48, height: 48)
                .glassEffect(in: RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading) {
                MarqueeText(text: state.title.isEmpty ? "Not Playing" : state.title, font: .headline)
                    .fontWeight(.semibold)

                if !state.artist.isEmpty {
                    Text(state.artist)
                        .font(.subheadline)
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

            .contentShape(Rectangle())
            .onTapGesture {
                showExpandedPlayer = true
            }
    }
}

struct ExpandedPlayerView: View {
    var state = PlaybackStateManager.shared
    @State private var showFullLyrics: Bool = false
    @State private var showQueue: Bool = false
    @State private var displayedCurrentLyric: String = ""
    @State private var displayedNextLyric: String = ""
    @State private var lyricOpacity: Double = 1
    @State private var lyricOffset: CGFloat = 0

    var body: some View {
        let _ = state.currentLyric // Force Observation for SwiftUI dependency tracking
        
        ZStack {
            // Blurred Background
            BlurredBackgroundView(url: state.coverUrl)

            VStack(spacing: 16) {
                AsyncImage(url: URL(string: state.coverUrl)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(1, contentMode: .fit)
                            .frame(maxWidth: .infinity)
                    case .failure:
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .glassEffect()
                            .aspectRatio(1, contentMode: .fit)
                            .frame(maxWidth: .infinity)
                            .overlay(
                                Image(systemName: "music.note")
                                    .font(.system(size: 48, weight: .light))
                                    .foregroundStyle(.secondary)
                            )
                    case .empty:
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .glassEffect()
                            .aspectRatio(1, contentMode: .fit)
                            .frame(maxWidth: .infinity)
                            .overlay(ProgressView())
                    @unknown default:
                        EmptyView()
                    }
                }
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
                    .frame(height: 130)
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

                PlaybackProgressView()
                .padding(.horizontal, 24)

                PlaybackControlsView()

                Spacer()

                HStack {
                    Spacer()
                    Button(action: { showQueue = true }) {
                        Image(systemName: "list.dash")
                            .imageScale(.large)
                    }
                    .buttonStyle(.glass)
                }
                padding()
                .sheet(isPresented: $showQueue) {
                    QueueView()
                }
            }
            .padding(.top, 40)
        }
        .onAppear {
            displayedCurrentLyric = state.currentLyric
            displayedNextLyric = state.nextLyric
        }
        .onChange(of: state.currentLyric) { _, _ in
            withAnimation(.easeOut(duration: 0.1)) {
                lyricOpacity = 0
                lyricOffset = 6
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                displayedCurrentLyric = state.currentLyric
                displayedNextLyric = state.nextLyric
                withAnimation(.easeIn(duration: 0.15)) {
                    lyricOpacity = 1
                    lyricOffset = 0
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct PlaybackProgressView: View {
    var state = PlaybackStateManager.shared
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
    var state = PlaybackStateManager.shared
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
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.white.opacity(0.8))
                    }
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
        .preferredColorScheme(.dark)
    }
}

struct QueueView: View {
    var state = PlaybackStateManager.shared
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
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.white.opacity(0.8))
                    }
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
                            HStack(spacing: 12) {
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
                            .padding(.vertical, 10)
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
        .preferredColorScheme(.dark)
    }
}

struct PlaybackControlsView: View {
    var state = PlaybackStateManager.shared
    
    var body: some View {
        GlassEffectContainer(spacing: 24) {
            HStack(spacing: 24) {
                Button(action: { state.toggleShuffle() }) {
                    Image(systemName: "shuffle")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(state.shuffle ? .primary : .secondary)
                        .frame(width: 44, height: 44)
                }
                .glassEffect(state.shuffle ? .regular.interactive() : .clear.interactive(), in: .circle)
                
                Button(action: { state.triggerPrev() }) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 54, height: 54)
                }
                .glassEffect(.regular.interactive(), in: .circle)

                Button(action: { state.togglePlayPause() }) {
                    Image(systemName: state.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.primary)
                        .frame(width: 72, height: 72)
                }
                .glassEffect(.regular.interactive(), in: .circle)

                Button(action: { state.triggerNext() }) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 54, height: 54)
                }
                .glassEffect(.regular.interactive(), in: .circle)

                Button(action: { state.cycleRepeat() }) {
                    Image(systemName: state.repeatMode == "one" ? "repeat.1" : "repeat")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(state.repeatMode == "off" ? .secondary : .primary)
                        .frame(width: 44, height: 44)
                }
                .glassEffect(state.repeatMode != "off" ? .regular.interactive() : .clear.interactive(), in: .circle)
            }
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