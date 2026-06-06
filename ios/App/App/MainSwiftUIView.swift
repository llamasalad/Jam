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

                // Mini Player (only when a song is loaded)
                if state.hasSong {
                    MiniPlayerView(showExpandedPlayer: $showExpandedPlayer)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                // Floating Dock / Search Bar
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
            .background(Color.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

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
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Button(action: { state.togglePlayPause() }) {
                    Image(systemName: state.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Button(action: { state.triggerNext() }) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.leading, 8)
        .padding(.trailing, 4)
        .padding(.vertical, 6)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().stroke(Color.white.opacity(0.12), lineWidth: 0.5))
        .shadow(color: .black.opacity(0.3), radius: 12, x: 0, y: 4)
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

    var body: some View {
        HStack(spacing: 12) {
            if isSearchActive {
                searchActiveContent
            } else {
                defaultDockContent
            }
        }
        .padding(.horizontal, 16)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isSearchActive)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isSearchFieldFocused)
    }

    // MARK: - Default Dock: Tab Pill + Search Circle

    @ViewBuilder
    private var defaultDockContent: some View {
        // Main Tab Pill
        HStack(spacing: 0) {
            tabButton(label: "Library", icon: "music.note.house", tab: "library")
            tabButton(label: "Playlists", icon: "music.note.list", tab: "playlists")
        }
        .padding(4)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().stroke(Color.white.opacity(0.12), lineWidth: 0.5))
        .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 2)
        .transition(.move(edge: .leading).combined(with: .opacity))

        Spacer()

        // Trailing Search Circle
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
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.primary)
                .frame(width: 48, height: 48)
                .background(.ultraThinMaterial, in: Circle())
                .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 0.5))
                .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 2)
        }
        .buttonStyle(.plain)
        .transition(.move(edge: .trailing).combined(with: .opacity))
    }

    // MARK: - Search Active: Input + Cancel/Back

    @ViewBuilder
    private var searchActiveContent: some View {
        // Unfocused: Show circular back/library button on leading side
        if !isSearchFieldFocused {
            Button(action: {
                exitSearch()
            }) {
                Image(systemName: "music.note.house.fill")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(.primary)
                    .frame(width: 48, height: 48)
                    .background(.ultraThinMaterial, in: Circle())
                    .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 0.5))
                    .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 2)
            }
            .buttonStyle(.plain)
            .transition(.move(edge: .leading).combined(with: .opacity))
        }

        // Search Text Field Pill
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
        .padding(.horizontal, 16)
        .frame(height: 48)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().stroke(Color.white.opacity(0.12), lineWidth: 0.5))
        .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 2)

        // Focused: Show circular "X" cancel button on trailing side
        if isSearchFieldFocused {
            Button(action: {
                exitSearch()
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 48, height: 48)
                    .background(.ultraThinMaterial, in: Circle())
                    .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 0.5))
                    .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 2)
            }
            .buttonStyle(.plain)
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
                Image(systemName: selectedTab == tab ? "\(icon).fill" : icon)
                    .font(.system(size: 14, weight: .medium))
                Text(label)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .foregroundStyle(selectedTab == tab ? .white : .secondary)
            .padding(.vertical, 10)
            .padding(.horizontal, 16)
            .background(selectedTab == tab ? Color.white.opacity(0.1) : Color.clear, in: Capsule())
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
                        .aspectRatio(contentMode: .fit)
                case .failure, .empty:
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white.opacity(0.06))
                        .overlay(
                            Image(systemName: "music.note")
                                .font(.system(size: 48, weight: .light))
                                .foregroundStyle(.secondary)
                        )
                @unknown default:
                    EmptyView()
                }
            }
            .frame(maxWidth: 320, maxHeight: 320)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: .black.opacity(0.4), radius: 20, x: 0, y: 8)

            // Song Info
            VStack(spacing: 4) {
                Text(state.title.isEmpty ? "Not Playing" : state.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Text(state.artist.isEmpty ? " " : state.artist)
                    .font(.subheadline)
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
                .tint(.white)

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
            HStack(spacing: 40) {
                Button(action: { state.triggerPrev() }) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Button(action: { state.togglePlayPause() }) {
                    Image(systemName: state.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 56, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 64, height: 64)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Button(action: { state.triggerNext() }) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }

            Spacer()
        }
        .padding(.top, 40)
        .background(Color(uiColor: .systemBackground))
        .preferredColorScheme(.dark)
    }

    private func formatTime(_ t: Double) -> String {
        guard t.isFinite && t >= 0 else { return "0:00" }
        let mins = Int(t) / 60
        let secs = Int(t) % 60
        return "\(mins):\(String(format: "%02d", secs))"
    }
}

