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

            // Layer 3: Native Bottom Overlays
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
                Text(state.title.isEmpty ? "Not Playing" : state.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                    .lineLimit(1)

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
        }
        .buttonStyle(.glass)
        .glassEffectID("searchCircle", in: namespace)
        .transition(.move(edge: .trailing).combined(with: .opacity))
    }

    // MARK: - Search Active: Input + Cancel/Back

    @ViewBuilder
    private var searchActiveContent: some View {
        if !isSearchFieldFocused {
            Button(action: { exitSearch() }) {
                Image(systemName: "music.note.house.fill")
                    .imageScale(.large)
            }
            .buttonStyle(.glass)
            .glassEffectID("tabPill", in: namespace)
            .transition(.move(edge: .leading).combined(with: .opacity))
        }

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

        if isSearchFieldFocused {
            Button(action: { exitSearch() }) {
                Image(systemName: "xmark")
                    .imageScale(.medium)
            }
            .buttonStyle(.glass)
            .transition(.move(edge: .trailing).combined(with: .opacity))
        }
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

    var body: some View {
        VStack(spacing: 24) {
            // Cover Art
            AsyncImage(url: URL(string: state.coverUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure, .empty:
                    // Was: RoundedRectangle.fill(Color.white.opacity(0.06)) — manual dim fill
                    // Now: glassEffect on the shape itself
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
            .shadow(color: .black.opacity(0.3), radius: 24, x: 0, y: 16)

            // Song Info
            VStack(spacing: 4) {
                Text(state.title.isEmpty ? "Not Playing" : state.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Text(state.artist.isEmpty ? " " : state.artist)
                    .font(.title3)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .padding(.horizontal, 24)

            // Seeker
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
                // Was: .tint(.white) — hardcoded, ignores environment
                // Now: .tint(.primary) — adapts correctly
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

            // Playback Controls
            // Was: .buttonStyle(.plain) + manual .foregroundStyle(.primary) on each image
            // Now: .buttonStyle(.glass) to match mini player, foreground inherited from env
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
        // Was: .background(.ultraThinMaterial) — grey/white tint washes out colour behind it
        // Now: dark translucent — lets the mesh gradient bleed through the sheet
        .background(Color.black.opacity(0.7))
        .preferredColorScheme(.dark)
    }

    private func formatTime(_ t: Double) -> String {
        guard t.isFinite && t >= 0 else { return "0:00" }
        let mins = Int(t) / 60
        let secs = Int(t) % 60
        return "\(mins):\(String(format: "%02d", secs))"
    }
}