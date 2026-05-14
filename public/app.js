let resizeObserver = null;
let searchListener = null;
let authKeydownListener = null;
let globalClickListener = null;

function cleanup() {
    if (searchListener && searchEl) {
        searchEl.removeEventListener('input', searchListener);
        searchListener = null;
    }
    if (authKeydownListener && authInput) {
        authInput.removeEventListener('keydown', authKeydownListener);
        authKeydownListener = null;
    }
    if (globalClickListener) {
        document.removeEventListener('click', globalClickListener);
        globalClickListener = null;
    }
}

const mobileQuery = window.matchMedia('(max-width:768px)');
const isMobile = () => mobileQuery.matches;

const TOKEN_KEY = 'music_token';
let token = localStorage.getItem(TOKEN_KEY) || '';
setTokenCookie(token);
let tracks = [], filtered = [], queue = [], qIdx = -1, sortMode = 'title';
let shuffle = localStorage.getItem('music_shuffle') === 'true', seeking = false, muted = false;
const SAVED_VOL = parseInt(localStorage.getItem('music_vol') || '80');
let lastVol = SAVED_VOL;
let playlists = [], currentPlaylist = null, ctxTrack = null, pendingPlaylistTrack = null;
let queueOpen = false, lyricsTrackId = null, lyricsOpen = false;
let isSelecting = false;
let toggleMode = true;
let lastSavedSec = -1;
let lyricsOffset = 0;
let lyricUpdateTimers = { cur: null, next: null };
let lastHeartbeatPos = 0;
let playerExpanded = false;
let desktopExpandedLyricsOpen = false;

function setTokenCookie(t) {
    if (t) document.cookie = `music_token=${encodeURIComponent(t)}; path=/; max-age=31536000; SameSite=Lax; Secure`;
}

function saveQueueState() {
    localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
    localStorage.setItem('music_qidx', qIdx);
}

function updatePlayerMetadata(t) {
    const plTitle = document.getElementById('player-title');
    const plArtist = document.getElementById('player-artist');
    const mobTitle = document.querySelector('#player-meta-mobile .title');
    const mobArtist = document.querySelector('#player-meta-mobile .artist');
    const fullTitle = t.title || 'Unknown';
    const fullArtist = [t.artist, t.album].filter(Boolean).join(' \u00B7 ') || '\u2014';
    if (plTitle) plTitle.textContent = fullTitle;
    if (plArtist) plArtist.textContent = fullArtist;
    if (mobTitle) mobTitle.textContent = fullTitle;
    if (mobArtist) mobArtist.textContent = fullArtist;
}

function setLyricsMessage(msg, curMsg) {
    const scrollEl = document.getElementById('lyrics-scroll');
    const cardScroll = document.getElementById('exp-lyrics-card-scroll');
    const desktopScroll = document.getElementById('exp-desktop-lyrics-scroll');
    const msgHtml = `<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">${msg}</div>`;
    if (scrollEl) scrollEl.innerHTML = msgHtml;
    if (desktopScroll) desktopScroll.innerHTML = msgHtml;
    if (cardScroll) cardScroll.innerHTML = msgHtml;
    if (curMsg !== undefined) {
        if (expLyricCur) {
            if (curMsg === '\u2026') {
                expLyricCur.innerHTML = '<span class="loading-ring"></span>';
            } else {
                expLyricCur.textContent = curMsg;
            }
        }
        if (expLyricNext) expLyricNext.textContent = '';
    }
}

const audio = document.getElementById('audio');
if (audio) audio.preload = 'auto';
const player = document.getElementById('player');
const trackList = document.getElementById('track-list');
const loading = document.getElementById('loading');
const empty = document.getElementById('empty');
const searchEl = document.getElementById('search');
const sortBtn = document.getElementById('sort-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeMenu = document.getElementById('theme-menu');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const progress = document.getElementById('progress');
const timeCur = document.getElementById('time-cur');
const timeTot = document.getElementById('time-tot');
const volumeSlider = document.getElementById('volume');
const volumeIcon = document.getElementById('volume-icon');
const expVolumeSlider = document.getElementById('exp-volume');
const expVolumeIcon = document.getElementById('exp-volume-icon');
const authOverlay = document.getElementById('auth-overlay');
const authInput = document.getElementById('auth-input');
const authSubmit = document.getElementById('auth-submit');
const authError = document.getElementById('auth-error');
const ctxMenu = document.getElementById('ctx-menu');
const ctxPlaylists = document.getElementById('ctx-playlists');
const modalNew = document.getElementById('modal-new');
const modalNameInput = document.getElementById('modal-name-input');
const playlistsContainer = document.getElementById('playlists-container');
const playlistDetail = document.getElementById('playlist-detail');
const playlistsListView = document.getElementById('playlists-list-view');

const expPlayer = document.getElementById('expanded-player');
const expCollapse = document.getElementById('exp-collapse');
const expContent = document.getElementById('exp-content');
const expCover = document.getElementById('exp-cover');
const expCoverIcon = document.getElementById('exp-cover-icon');
const expCoverWrap = document.getElementById('exp-cover-wrap');
const expTitle = document.getElementById('exp-title');
const expArtist = document.getElementById('exp-artist');
const expLyricCur = document.getElementById('exp-lyric-current');
const expLyricNext = document.getElementById('exp-lyric-next');
const expLyricsWrap = document.getElementById('exp-lyrics-wrap');
const expPlay = document.getElementById('exp-play');
const expPrev = document.getElementById('exp-prev');
const expNext = document.getElementById('exp-next');
const expShuffle = document.getElementById('exp-shuffle');
const expRepeat = document.getElementById('exp-repeat');
const expProgress = document.getElementById('exp-progress');
const expTimeCur = document.getElementById('exp-time-cur');
const expTimeTot = document.getElementById('exp-time-tot');
const expIconPlay = document.getElementById('exp-icon-play');
const expIconPause = document.getElementById('exp-icon-pause');
const expLyricsToggle = document.getElementById('exp-lyrics-toggle');
const expAdaptiveBtn = document.getElementById('exp-adaptive-btn');
const dropZone = document.getElementById('drop-zone');
const expDesktopLyricsPanel = document.getElementById('exp-desktop-lyrics-panel');
const expDesktopLyricsScroll = document.getElementById('exp-desktop-lyrics-scroll');
const menuBackdrop = document.getElementById('menu-backdrop');

let adaptiveMode = localStorage.getItem('adaptive_mode') === 'true';
let heartbeatInterval = null;

if (menuBackdrop) {
    menuBackdrop.onclick = () => {
        closeCtxMenu();
        hideThemeMenu();
        const qm = document.getElementById('quick-playlist-menu');
        if (qm) qm.remove();
    };
    menuBackdrop.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeCtxMenu();
        hideThemeMenu();
        const qm = document.getElementById('quick-playlist-menu');
        if (qm) qm.remove();
    }, { passive: false });
}

const SWIPE_ICONS = {
    queue: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    playlist: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
    trash: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`
};

function updatePlayerHeight() {
    if (player && !player.classList.contains('hidden')) {
        document.documentElement.style.setProperty('--player-h', player.offsetHeight + 'px');
    }
}
if (player && !resizeObserver) {
    resizeObserver = new ResizeObserver(updatePlayerHeight);
    resizeObserver.observe(player);
}

function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) };
}

let audioCtx = null;
let gainNode = null;

function applyVolume(vol) {
    if (gainNode) {
        gainNode.gain.value = vol;
        if (audio) {
            try { audio.volume = 1; } catch (e) { }
        }
    } else if (audio) {
        audio.volume = vol;
    }
}

function startAudioContextHeartbeat(ctx) {
    setInterval(() => {
        if (ctx.state === 'suspended') ctx.resume();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
    }, 25000);
}

function initAudioContext(audioEl) {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    gainNode = audioCtx.createGain();
    const source = audioCtx.createMediaElementSource(audioEl);
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const initialVol = audioEl.volume;
    try { audioEl.volume = 1; } catch (e) { }
    gainNode.gain.value = initialVol;
    startAudioContextHeartbeat(audioCtx);
}

if (audio) applyVolume(Math.pow(SAVED_VOL / 100, 3));

function fmt(s) { if (!s || isNaN(s)) return '-'; s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
function hdrs() { return token ? { 'x-auth-token': token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' } }
function hget() { return token ? { 'x-auth-token': token } : {} }

async function checkAuth() {
    try {
        const r = await fetch('/api/status', { headers: hget() });
        if (r.status === 401) { showAuth(); return false }
        return true;
    } catch (e) {
        console.error("Auth check failed", e);
        return false;
    }
}
function showAuth() { if (authOverlay) authOverlay.style.display = 'flex' }
function hideAuth() { if (authOverlay) authOverlay.style.display = 'none' }

if (authSubmit) {
    authSubmit.onclick = async () => {
        const enteredToken = authInput.value.trim();
        if (authError) authError.style.display = 'none';
        token = enteredToken;
        const r = await fetch('/api/status', { headers: { 'x-auth-token': token } });
        if (r.ok) {
            localStorage.setItem(TOKEN_KEY, token);
            setTokenCookie(token);
            hideAuth();
            init();
        } else {
            token = '';
            if (authError) authError.style.display = 'block';
        }
    };
}

if (authInput && !authKeydownListener) {
    authKeydownListener = (e) => { if (e.key === 'Enter') authSubmit.click() };
    authInput.addEventListener('keydown', authKeydownListener);
}

function switchTab(name) {
    if (typeof saveScroll === 'function') saveScroll();
    const viewLibrary = document.getElementById('view-library');
    const viewPlaylists = document.getElementById('view-playlists');
    const sortBtn = document.getElementById('sort-btn');
    const themeToggle = document.getElementById('theme-toggle');

    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.sidebar-item[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === name));

    if (viewLibrary) viewLibrary.classList.toggle('active', name === 'library');
    if (viewPlaylists) viewPlaylists.classList.toggle('active', name === 'playlists');

    if (sortBtn) sortBtn.style.display = name === 'library' ? '' : 'none';
    if (themeToggle) themeToggle.style.display = '';

    closeDetailView();

    currentPlaylist = null;
    if (playlistDetail) playlistDetail.classList.remove('active');
    if (playlistsListView) playlistsListView.style.display = '';

    if (name === 'playlists') loadPlaylists();
    if (typeof restoreScroll === 'function') restoreScroll();
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => switchTab(tab.dataset.tab);
});

document.querySelectorAll('.sidebar-item[data-tab]').forEach(item => {
    item.onclick = () => switchTab(item.dataset.tab);
});

async function loadTracks() {
    libraryCardsBuilt = false;
    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (trackList) trackList.innerHTML = '';
    try {
        const r = await fetch('/api/tracks', { headers: hget() });
        if (r.status === 401) { showAuth(); return }
        tracks = await r.json();
        if (!tracks.length) {
            if (loading) loading.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }
        renderLibraryCards();
        applyFilter();
        sort();
    } catch (e) {
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'flex';
    }
}

let libraryCardsBuilt = false;
function renderLibraryCards() {
    if (libraryCardsBuilt) return;
    libraryCardsBuilt = true;
    const suggestedContainer = document.getElementById('suggested-container');
    const artistsContainer = document.getElementById('artists-container');
    const albumsContainer = document.getElementById('albums-container');
    if (!artistsContainer || !albumsContainer) return;

    artistsContainer.innerHTML = '';
    albumsContainer.innerHTML = '';

    const artists = new Map();
    const albums = new Map();

    tracks.forEach(t => {
        if (t.artist) {
            if (!artists.has(t.artist)) artists.set(t.artist, { count: 0, artwork: null });
            artists.get(t.artist).count++;
            if (!artists.get(t.artist).artwork && t.id) artists.get(t.artist).artwork = t.id;
        }
        if (t.album) {
            if (!albums.has(t.album)) albums.set(t.album, { count: 0, artist: t.artist, artwork: null });
            albums.get(t.album).count++;
            if (!albums.get(t.album).artwork && t.id) albums.get(t.album).artwork = t.id;
        }
    });

    const coverObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const card = entry.target;
            const id = card.dataset.artworkId;
            if (id) {
                if (coverCacheHas(id) && coverCacheGet(id)) {
                    card.style.backgroundImage = `url(${coverCacheGet(id)})`;
                } else {
                    ensureCoverUrl(id).then(url => {
                        if (url) card.style.backgroundImage = `url(${url})`;
                    });
                }
            }
            coverObserver.unobserve(card);
        });
    }, { rootMargin: '1500px' }); // load covers early to prevent pop-in

    const artistImgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            const name = img.dataset.artistName;
            if (name) loadArtistImage(name, img);
            artistImgObserver.unobserve(img);
        });
    }, { rootMargin: '1500px' });

    const fragA = document.createDocumentFragment();
    Array.from(artists.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([artist, data]) => {
            const card = document.createElement('div');
            card.className = 'artist-card';
            if (data.artwork) card.dataset.artworkId = data.artwork;

            const artistImg = document.createElement('img');
            artistImg.className = 'artist-portrait';
            artistImg.dataset.artistName = artist;
            artistImg.alt = '';
            artistImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;visibility:hidden;';
            artistImg.onerror = () => { artistImg.style.visibility = 'hidden'; };

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:absolute;inset:0;z-index:1';
            const label = document.createElement('span');
            label.textContent = artist;
            card.append(artistImg, overlay, label);
            card.onclick = () => openArtistDetail(artist);
            fragA.appendChild(card);
            if (data.artwork) coverObserver.observe(card);
            artistImgObserver.observe(artistImg);
        });
    artistsContainer.appendChild(fragA);

    const fragB = document.createDocumentFragment();
    Array.from(albums.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([album, data]) => {
            const card = document.createElement('div');
            card.className = 'album-card';
            if (data.artwork) card.dataset.artworkId = data.artwork;
            const overlay = document.createElement('div');
            const label = document.createElement('span');
            label.textContent = album;
            card.append(overlay, label);
            card.onclick = () => openAlbumDetail(album);
            fragB.appendChild(card);
            if (data.artwork) coverObserver.observe(card);
        });
    albumsContainer.appendChild(fragB);

    function renderSuggestedCards(force = false) {
        if (!suggestedContainer || !tracks.length) return;

        let suggestedIds = [];
        const saved = localStorage.getItem('jam_suggested_tracks');
        const savedTime = localStorage.getItem('jam_suggested_time');
        const now = Date.now();

        if (!force && saved && savedTime && now - parseInt(savedTime) < 3600000) {
            try { suggestedIds = JSON.parse(saved); } catch (e) { }
        }

        let suggestedTracks = [];
        if (suggestedIds.length) {
            suggestedTracks = suggestedIds.map(id => tracks.find(t => t.id === id)).filter(Boolean);
        }

        if (suggestedTracks.length < 8) {
            suggestedTracks = [...tracks].sort(() => 0.5 - Math.random()).slice(0, 8);
            localStorage.setItem('jam_suggested_tracks', JSON.stringify(suggestedTracks.map(t => t.id)));
            localStorage.setItem('jam_suggested_time', now.toString());
        }

        suggestedContainer.innerHTML = '';
        const fragS = document.createDocumentFragment();
        suggestedTracks.forEach(t => {
            const card = document.createElement('div');
            card.className = 'suggested-card';
            if (t.id) card.dataset.artworkId = t.id;

            const overlay = document.createElement('div');
            const info = document.createElement('div');
            info.className = 'suggested-info';

            const titleLabel = document.createElement('div');
            titleLabel.className = 'suggested-title';
            titleLabel.textContent = t.title || 'Unknown';

            const artistLabel = document.createElement('div');
            artistLabel.className = 'suggested-artist';
            artistLabel.textContent = t.artist || 'Unknown Artist';

            info.append(titleLabel, artistLabel);
            card.append(overlay, info);

            card.onclick = () => playTrack(t, tracks);
            fragS.appendChild(card);
            if (t.id) coverObserver.observe(card);
        });
        suggestedContainer.appendChild(fragS);
    }

    if (suggestedContainer) {
        renderSuggestedCards();

        const checkAndRefresh = () => {
            const savedTime = localStorage.getItem('jam_suggested_time');
            if (savedTime && Date.now() - parseInt(savedTime) >= 3600000) {
                // Only refresh if no music is playing AND app is in background
                if (audio.paused && document.visibilityState === 'hidden') {
                    renderSuggestedCards(true);
                }
            }
        };

        setInterval(checkAndRefresh, 60000);

        // Catch up if the interval was throttled in background or just now expired
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const savedTime = localStorage.getItem('jam_suggested_time');
                if (savedTime && Date.now() - parseInt(savedTime) >= 3600000 && audio.paused) {
                    renderSuggestedCards(true);
                }
            }
        });

        const refreshBtn = document.getElementById('refresh-suggested-btn');
        if (refreshBtn) {
            refreshBtn.onclick = (e) => {
                e.stopPropagation();
                // Add a quick spin effect for feedback
                refreshBtn.style.transition = 'transform 0.3s ease';
                refreshBtn.style.transform = `rotate(${(refreshBtn._rot || 0) + 360}deg)`;
                refreshBtn._rot = (refreshBtn._rot || 0) + 360;

                renderSuggestedCards(true);
            };
        }
    }
}

const sortModes = ['title', 'artist', 'album'];
const sortLabels = ['VIEWS', 'ARTIST', 'ALBUM'];
let sortModeIdx = 0;
let currentDetailView = null;

let viewScrolls = {};
let lastViewState = 'tab:library:sort:title';

function getViewState() {
    if (currentDetailView) {
        if (currentDetailView.type === 'playlist') return `detail:playlist:${currentPlaylist?.id || currentDetailView.name}`;
        return `detail:${currentDetailView.type}:${currentDetailView.name}`;
    }
    const activeTab = document.querySelector('.sidebar-item.active')?.dataset.tab || 'library';
    if (activeTab === 'library') {
        return `tab:library:sort:${sortMode}`;
    }
    return `tab:${activeTab}`;
}

function saveScroll() {
    viewScrolls[lastViewState] = window.scrollY;
}

function restoreScroll() {
    const newState = getViewState();
    lastViewState = newState;
    const targetY = viewScrolls[newState] || 0;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.scrollTo(0, targetY);
        });
    });
}

function openDetail(type, name) {
    saveScroll();
    currentDetailView = { type, name };
    document.body.classList.add('detail-view');
    const viewLibrary = document.getElementById('view-library');
    const libraryCards = document.getElementById('library-cards');
    const trackList = document.getElementById('track-list');
    const headerTitle = document.getElementById('header-title');

    if (viewLibrary) viewLibrary.classList.add('active');
    if (libraryCards) libraryCards.classList.remove('show');
    if (trackList) trackList.style.display = 'block';
    if (headerTitle) headerTitle.textContent = name;

    const artistsSection = document.getElementById('artists-section');
    const albumsSection = document.getElementById('albums-section');
    if (artistsSection) artistsSection.style.display = 'none';
    if (albumsSection) albumsSection.style.display = 'none';

    searchEl.value = '';
    filtered = tracks.filter(t => t[type] === name);
    renderList();
    restoreScroll();
}

function openArtistDetail(artist) { openDetail('artist', artist); }
function openAlbumDetail(album) { openDetail('album', album); }

function closeDetailView() {
    saveScroll();
    if (currentDetailView?.type === 'playlist') {
        closePlaylistDetail();
        return;
    }
    currentDetailView = null;
    document.body.classList.remove('detail-view');
    const libraryCards = document.getElementById('library-cards');
    const trackList = document.getElementById('track-list');
    const artistsSection = document.getElementById('artists-section');
    const albumsSection = document.getElementById('albums-section');
    const headerTitle = document.getElementById('header-title');

    if (headerTitle) headerTitle.textContent = 'Jam!';

    if (sortMode === 'artist') {
        if (libraryCards) libraryCards.classList.add('show');
        if (artistsSection) artistsSection.style.display = 'block';
        if (trackList) trackList.style.display = 'none';
    } else if (sortMode === 'album') {
        if (libraryCards) libraryCards.classList.add('show');
        if (albumsSection) albumsSection.style.display = 'block';
        if (trackList) trackList.style.display = 'none';
    } else {
        if (libraryCards) libraryCards.classList.remove('show');
        if (trackList) trackList.style.display = 'block';
    }

    searchEl.value = '';
    filtered = [...tracks];
    sort();
    restoreScroll();
}

function cycleSort() {
    saveScroll();
    sortModeIdx = (sortModeIdx + 1) % 3;
    sortMode = sortModes[sortModeIdx];
    if (sortBtn) sortBtn.textContent = sortLabels[sortModeIdx];
    if (sortMode === 'title') filtered = [...tracks];
    sort();
    updateSidebarSortLabel();
    restoreScroll();
}

if (sortBtn) {
    sortBtn.onclick = cycleSort;
}

let currentTheme = localStorage.getItem('music_theme') || 'default';
function applyTheme() {
    document.body.classList.remove('light-theme', 'purple-light-theme', 'ember-theme', 'glacier-theme', 'void-theme', 'black-theme', 'cherry-theme', 'abyss-theme');
    if (currentTheme === 'light') document.body.classList.add('light-theme');
    else if (currentTheme === 'purple-light') document.body.classList.add('purple-light-theme');
    else if (currentTheme === 'ember-theme') document.body.classList.add('ember-theme');
    else if (currentTheme === 'glacier-theme') document.body.classList.add('glacier-theme');
    else if (currentTheme === 'void-theme') document.body.classList.add('void-theme');
    else if (currentTheme === 'black-theme') document.body.classList.add('black-theme');
    else if (currentTheme === 'cherry-theme') document.body.classList.add('cherry-theme');
    else if (currentTheme === 'abyss-theme') document.body.classList.add('abyss-theme');
    updateStatusBar();
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === currentTheme);
    });
    document.querySelectorAll('.sidebar-theme-option').forEach(o => {
        o.classList.toggle('active', o.dataset.theme === currentTheme);
    });
}

function updateStatusBar(overrideColor) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;

    if (overrideColor) {
        meta.setAttribute('content', overrideColor);
        return;
    }



    const themeColors = { 'default': '#0d0d0f', 'light': '#f8f9fa', 'purple-light': '#f0f0ff', 'ember-theme': '#0e0c0b', 'glacier-theme': '#0a0e10', 'void-theme': '#080c09', 'black-theme': '#000000', 'cherry-theme': '#0f0d0e', 'abyss-theme': '#0d0d0f' };
    meta.setAttribute('content', themeColors[currentTheme] || '#0d0d0f');
}

function showThemeMenu() {
    if (!themeMenu) return;
    // Clear inline styles - CSS handles positioning now
    themeMenu.style.left = '';
    themeMenu.style.top = '';
    themeMenu.classList.add('open');
    document.body.classList.add('theme-menu-open');
}

function hideThemeMenu() {
    if (themeMenu) themeMenu.classList.remove('open');
    document.body.classList.remove('theme-menu-open');
    if (menuBackdrop) menuBackdrop.style.display = '';
}

if (themeToggle) {
    themeToggle.onclick = (e) => {
        e.stopPropagation();
        if (themeMenu.classList.contains('open')) {
            hideThemeMenu();
        } else {
            showThemeMenu();
        }
    };
}

if (themeMenu) {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.onclick = () => {
            currentTheme = option.dataset.theme;
            localStorage.setItem('music_theme', currentTheme);
            applyTheme();
            hideThemeMenu();
        };
    });
}

document.addEventListener('click', (e) => {
    if (themeMenu?.classList.contains('open') &&
        !themeMenu.contains(e.target) &&
        !themeToggle.contains(e.target)) {
        hideThemeMenu();
    }
});

applyTheme();

const sidebarSortItem = document.getElementById('sidebar-sort-item');
const sidebarSortLabel = document.getElementById('sidebar-sort-label');
const sidebarSortTrack = document.getElementById('sidebar-sort-marquee-track');

const sortMarqueeLabels = ['Views', 'Artist', 'Album'];

function updateSidebarSortLabel() {
    const label = sortMarqueeLabels[sortModeIdx];
    if (sidebarSortLabel) sidebarSortLabel.textContent = label;
    if (sidebarSortTrack) {
        const repeated = Array(12).fill(label).join(' \u00A0·\u00A0 ') + ' \u00A0·\u00A0 ';
        sidebarSortTrack.textContent = repeated;
    }
}

if (sidebarSortItem) {
    sidebarSortItem.onclick = cycleSort;
}

updateSidebarSortLabel();

const sidebarThemeItem = document.getElementById('sidebar-theme-item');
const sidebarThemeDropdown = document.getElementById('sidebar-theme-dropdown');

if (sidebarThemeItem) {
    sidebarThemeItem.onclick = () => {
        sidebarThemeDropdown.classList.toggle('open');
    };
}

document.querySelectorAll('.sidebar-theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === currentTheme);
    opt.onclick = () => {
        currentTheme = opt.dataset.theme;
        localStorage.setItem('music_theme', currentTheme);
        applyTheme();
        document.querySelectorAll('.sidebar-theme-option').forEach(o => {
            o.classList.toggle('active', o.dataset.theme === currentTheme);
        });
        sidebarThemeDropdown.classList.remove('open');
    };
});

// Sidebar update button handler
const sidebarUpdate = document.getElementById('sidebar-update');
if (sidebarUpdate) {
    sidebarUpdate.onclick = () => {
        if (swRegistration?.waiting) {
            activateUpdate();
        } else {
            checkForUpdate();
        }
    };
}

function applyFilter() {
    const q = searchEl ? searchEl.value.toLowerCase() : '';
    filtered = q ? tracks.filter(t => (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q) || (t.album || '').toLowerCase().includes(q)) : [...tracks];
    sort();
}

function sort() {
    filtered.sort((a, b) => { const ka = (a[sortMode] || '').toLowerCase(), kb = (b[sortMode] || '').toLowerCase(); return ka < kb ? -1 : ka > kb ? 1 : 0 });

    const libraryCards = document.getElementById('library-cards');
    const trackList = document.getElementById('track-list');
    const artistsSection = document.getElementById('artists-section');
    const albumsSection = document.getElementById('albums-section');
    const suggestedSection = document.getElementById('suggested-section');

    if (suggestedSection) {
        const q = searchEl ? searchEl.value.trim() : '';
        suggestedSection.style.display = q ? 'none' : 'block';
    }

    if (libraryCards) {
        if (sortMode === 'title') {
            libraryCards.classList.remove('show');
            if (artistsSection) artistsSection.style.display = 'none';
            if (albumsSection) albumsSection.style.display = 'none';
            if (trackList) trackList.style.display = 'block';
        } else if (sortMode === 'artist') {
            libraryCards.classList.add('show');
            if (artistsSection) artistsSection.style.display = 'block';
            if (albumsSection) albumsSection.style.display = 'none';
            if (trackList) trackList.style.display = 'none';
        } else if (sortMode === 'album') {
            libraryCards.classList.add('show');
            if (artistsSection) artistsSection.style.display = 'none';
            if (albumsSection) albumsSection.style.display = 'block';
            if (trackList) trackList.style.display = 'none';
        }
    }

    if (sortMode === 'title') {
        renderList();
    }
}

function formatLyricsOffsetLabel() {
    if (Math.abs(lyricsOffset) < 0.001) return 'default';
    const amount = Math.abs(lyricsOffset).toFixed(1) + 's';
    return lyricsOffset > 0 ? `${amount} early` : `${amount} late`;
}

function updateLyricsOffsetUI() {
    const hasOffset = Math.abs(lyricsOffset) >= 0.001;
    document.querySelectorAll('.lyrics-offset-display').forEach(el => el.textContent = formatLyricsOffsetLabel());
    document.querySelectorAll('.lyrics-timing').forEach(el => el.classList.toggle('has-offset', hasOffset));
}

function adjustLyricsOffset(delta) {
    lyricsOffset = Math.round((lyricsOffset + delta) * 10) / 10;
    updateLyricsOffsetUI();
    updateSyncedLyricsState(true);
}

function groupKey(t) {
    if (sortMode === 'title') return (t.title || '?')[0].toUpperCase();
    if (sortMode === 'artist') return t.artist || 'Unknown';
    return t.album || 'Unknown';
}

function renderList() {
    if (loading) loading.style.display = 'none';
    if (trackList) trackList.innerHTML = '';
    if (!filtered.length) { if (empty) empty.style.display = 'flex'; return }
    if (empty) empty.style.display = 'none';
    let lastGroup = '';
    const frag = document.createDocumentFragment();
    for (const t of filtered) {
        const g = groupKey(t);
        if (g !== lastGroup) {
            lastGroup = g;
            const h = document.createElement('div');
            h.className = 'group-header';
            h.textContent = g;
            frag.appendChild(h);
        }
        frag.appendChild(makeRow(t, true));
    }
    if (trackList) trackList.appendChild(frag);
}

function bindTapActivation(el, handler, options = {}) {
    if (!el) return;
    let startX = 0, startY = 0, moved = false, handledAt = 0;
    let longPressTimer = null, longPressed = false;
    const longPressMs = options.longPressMs || 420;

    const isNestedControl = target => {
        const control = target.closest('button, input, a, select, textarea, label, .queue-handle');
        return control && control !== el;
    };
    const clearLongPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };

    el.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'touch') return;
        if (isNestedControl(e.target)) return;
        startX = e.clientX; startY = e.clientY;
        moved = false; longPressed = false;
        clearLongPress();
        if (options.onLongPress) {
            longPressTimer = setTimeout(() => {
                longPressed = true;
                handledAt = Date.now();
                if (navigator.vibrate) navigator.vibrate(10);
                options.onLongPress(e);
            }, longPressMs);
        }
    });
    el.addEventListener('pointermove', e => {
        if (e.pointerType !== 'touch') return;
        if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) {
            moved = true; clearLongPress();
        }
    });
    el.addEventListener('pointerup', e => {
        clearLongPress();
        if (e.pointerType !== 'touch' || moved || longPressed) return;
        if (isNestedControl(e.target)) return;
        handledAt = Date.now();
        handler(e);
    });
    el.addEventListener('pointercancel', clearLongPress);
    el.addEventListener('click', e => {
        if (isNestedControl(e.target)) return;
        if (Date.now() - handledAt < 500) { e.preventDefault(); e.stopPropagation(); return; }
        handler(e);
    });
}

function attachSwipeHandlers(container, content, bgElement, handlers) {
    const THRESHOLD = 72;
    const DECIDE_DISTANCE = 14;

    let state = 'idle'; // idle | deciding | swiping | scrolling
    let originX = 0, originY = 0;
    let deltaX = 0;
    let samples = []; // recent touch positions for velocity
    let animating = false;

    function rubberBand(x, limit) {
        // iOS-style: diminishing returns past limit
        if (Math.abs(x) <= limit) return x;
        const sign = x > 0 ? 1 : -1;
        const over = Math.abs(x) - limit;
        return sign * (limit + over / (1 + over / (limit * 0.7)));
    }

    function velocity() {
        if (samples.length < 2) return 0;
        const recent = samples.slice(-4);
        const dt = recent[recent.length - 1].t - recent[0].t;
        const dx = recent[recent.length - 1].x - recent[0].x;
        return dt > 0 ? dx / dt : 0;
    }

    let currentSwipeDir = 0;

    function showAction(dir) {
        if (dir === currentSwipeDir) return;
        currentSwipeDir = dir;
        const h = dir > 0 ? handlers.right : (dir < 0 ? handlers.left : null);
        if (!h) {
            bgElement.className = 'track-actions';
            bgElement.innerHTML = '';
            return;
        }
        bgElement.className = `track-actions ${dir > 0 ? 'right' : 'left'}-active`;
        bgElement.innerHTML = `<div class="action-icon">${h.icon}</div>`;
    }

    function cleanup() {
        currentSwipeDir = 0;
        bgElement.className = 'track-actions';
        bgElement.innerHTML = '';
        bgElement.classList.remove('locked');
        container.classList.remove('swiping');
        content.style.removeProperty('transition');
        content.style.transform = '';
        animating = false;
    }

    function release(fired, dir) {
        state = 'idle';
        animating = true;
        if (fired) {
            // Slide off, then return
            const offX = dir > 0 ? container.offsetWidth : -container.offsetWidth;
            content.style.setProperty('transition', 'transform 0.25s cubic-bezier(0.4, 0, 1, 1)', 'important');
            content.style.transform = `translate3d(${offX}px,0,0)`;
            setTimeout(() => {
                content.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)', 'important');
                content.style.transform = 'translate3d(0,0,0)';
                setTimeout(cleanup, 320);
            }, 260);
        } else {
            // Spring back with slight overshoot
            content.style.setProperty('transition', 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.075)', 'important');
            content.style.transform = 'translate3d(0,0,0)';
            setTimeout(cleanup, 400);
        }
    }

    container.addEventListener('touchstart', e => {
        if (animating) return;
        if (e.target.closest('button, .queue-handle')) return;
        // Give priority to the global back-swipe if touching the left edge
        if (e.touches[0].clientX < 30) return;

        originX = e.touches[0].clientX;
        originY = e.touches[0].clientY;
        deltaX = 0;
        samples = [{ x: originX, t: Date.now() }];
        state = 'deciding';
        content.style.setProperty('transition', 'none', 'important');
    }, { passive: true });

    container.addEventListener('touchmove', e => {
        if (state === 'idle' || state === 'scrolling') return;
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        deltaX = x - originX;
        const deltaY = y - originY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        samples.push({ x, t: Date.now() });
        if (samples.length > 6) samples.shift();

        if (state === 'deciding') {
            if (absX < DECIDE_DISTANCE && absY < DECIDE_DISTANCE) return;
            // Strongly favor scroll: only swipe if horizontal is clearly dominant
            if (absY >= absX * 0.7) {
                state = 'scrolling';
                return;
            }
            state = 'swiping';
            container.classList.add('swiping');
        }

        if (state === 'swiping') {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            showAction(deltaX > 0 ? 1 : (deltaX < 0 ? -1 : 0));

            let efX = deltaX;
            // Strong resistance if no handler in this direction
            if ((efX > 0 && !handlers.right) || (efX < 0 && !handlers.left)) {
                efX = rubberBand(efX, 20);
            } else {
                efX = rubberBand(efX, THRESHOLD * 2.5);
            }

            content.style.transform = `translate3d(${efX}px,0,0)`;

            // Lock state + haptic
            const pastThreshold = Math.abs(deltaX) > THRESHOLD;
            const hasHandler = (deltaX > 0 && handlers.right) || (deltaX < 0 && handlers.left);
            if (pastThreshold && hasHandler) {
                if (!bgElement.classList.contains('locked')) {
                    bgElement.classList.add('locked');
                    if (navigator.vibrate) navigator.vibrate(8);
                }
            } else {
                bgElement.classList.remove('locked');
            }
        }
    }, { passive: false });

    container.addEventListener('touchend', e => {
        if (state !== 'swiping') {
            if (state === 'deciding' || state === 'scrolling') {
                state = 'idle';
                content.style.removeProperty('transition');
            }
            return;
        }
        e.stopPropagation();
        const vel = velocity(); // px/ms
        const dir = deltaX > 0 ? 1 : -1;
        const handler = dir > 0 ? handlers.right : handlers.left;
        const fired = handler && (Math.abs(deltaX) >= THRESHOLD || Math.abs(vel) > 0.5);
        if (fired) handler.action();
        release(fired, dir);
    });

    container.addEventListener('touchcancel', () => {
        if (state === 'swiping') release(false, 0);
        state = 'idle';
    });
}

function makeRow(t, showMenu = false, inPlaylist = false) {
    const div = document.createElement('div');
    div.className = 'track';
    div.dataset.id = t.id;
    if (qIdx >= 0 && queue[qIdx]?.id === t.id) div.classList.add('active');
    if (inPlaylist) div.dataset.inPlaylist = "true";

    const actionsBg = document.createElement('div');
    actionsBg.className = 'track-actions';
    div.appendChild(actionsBg);

    const content = document.createElement('div');
    content.className = 'track-content';

    const thumb = document.createElement('div'); thumb.className = 'thumb';
    const sp = document.createElement('span'); sp.className = 'thumb-icon'; sp.textContent = '\u266A';
    thumb.appendChild(sp);
    loadCover(t.id, thumb);

    const info = document.createElement('div'); info.className = 'track-info';
    const ti = document.createElement('div'); ti.className = 'track-title'; ti.textContent = t.title || 'Unknown';
    const ts = document.createElement('div'); ts.className = 'track-sub'; ts.textContent = [t.artist, t.album].filter(Boolean).join(' \u00B7 ') || '\u2014';
    info.append(ti, ts);

    const right = document.createElement('div'); right.className = 'track-right';
    const dur = document.createElement('div'); dur.className = 'track-dur'; dur.dataset.id = t.id; dur.textContent = fmt(t.duration);
    right.appendChild(dur);

    if (showMenu && !inPlaylist) {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'track-menu-btn';
        menuBtn.textContent = '\u22EF';
        menuBtn.title = 'Options';
        menuBtn.onclick = e => { e.stopPropagation(); openCtxMenu(e, t) };
        right.appendChild(menuBtn);
    }

    content.append(thumb, info, right);
    div.appendChild(content);

    const isTouchScreen = window.matchMedia("(pointer: coarse)").matches;

    if (!isTouchScreen) {
        div.onmousedown = (e) => {
            if (e.button !== 0) return;
            isSelecting = true;
            if (!e.ctrlKey && !e.metaKey) {
                document.querySelectorAll('.track.selected').forEach(el => el.classList.remove('selected'));
            }
            toggleMode = !div.classList.contains('selected');
            div.classList.toggle('selected', toggleMode);
        };
        div.onmouseenter = () => { if (isSelecting) div.classList.toggle('selected', toggleMode); };
        div.ondblclick = () => playTrack(t, filtered);
    } else {
        bindTapActivation(div, () => playTrack(t, filtered), {
            onLongPress: e => openCtxMenu({ clientX: e.clientX, clientY: e.clientY, stopPropagation() { } }, t)
        });

        let rowHandlers = {};
        if (inPlaylist) {
            rowHandlers.left = {
                action: () => {
                    if (currentPlaylist) {
                        removeFromPlaylist(currentPlaylist.id, t.id);
                        showToast(`Removed "${t.title}"`);
                        div.style.opacity = '0.5';
                        setTimeout(() => div.remove(), 300);
                    }
                },
                icon: SWIPE_ICONS.trash
            };
        } else {
            rowHandlers.right = {
                action: () => {
                    queue.splice(qIdx + 1, 0, t);
                    showToast(`Added "${t.title}" to play next`);
                    saveQueueState();
                    if (queueOpen) renderQueue();
                },
                icon: SWIPE_ICONS.queue
            };
            rowHandlers.left = {
                action: () => openQuickPlaylistMenu(div, t),
                icon: SWIPE_ICONS.playlist
            };
        }
        attachSwipeHandlers(div, content, actionsBg, rowHandlers);
    }
    return div;
}

function closeCtxMenu() {
    if (ctxMenu) ctxMenu.classList.remove('open');
    document.body.classList.remove('menu-open');
    if (menuBackdrop) menuBackdrop.style.display = 'none';
    document.querySelectorAll('.track.long-press').forEach(t => t.classList.remove('long-press'));
    ctxTrack = null;
    const quickMenu = document.getElementById('quick-playlist-menu');
    if (quickMenu) quickMenu.remove();
}

async function openQuickPlaylistMenu(trackRow, track) {
    const existing = document.getElementById('quick-playlist-menu');
    if (existing) existing.remove();

    document.body.classList.add('menu-open');
    if (menuBackdrop) menuBackdrop.style.display = 'block';
    trackRow.classList.add('long-press');

    if (playlists.length === 0) await loadPlaylists();

    const menu = document.createElement('div');
    menu.id = 'quick-playlist-menu';
    menu.style.cssText = 'position:fixed;background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:6px;z-index:600;min-width:160px;max-width:220px;box-shadow:0 8px 24px rgba(0,0,0,.4)';

    const rect = trackRow.getBoundingClientRect();
    menu.style.left = Math.min(rect.left + 40, window.innerWidth - 220) + 'px';
    menu.style.top = Math.max(10, rect.top - 10) + 'px';

    const header = document.createElement('div');
    header.style.cssText = 'padding:6px 10px 2px;font-size:10px;letter-spacing:0.08em;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);margin-bottom:4px';
    header.textContent = 'Add to Playlist';
    menu.appendChild(header);

    if (playlists.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.style.cssText = 'padding:8px 10px;font-size:12px;color:var(--muted)';
        emptyEl.textContent = 'No playlists yet';
        menu.appendChild(emptyEl);
    } else {
        playlists.forEach(pl => {
            const item = document.createElement('div');
            item.className = 'quick-pl-item';
            item.style.cssText = 'padding:8px 10px;font-size:13px;cursor:pointer;border-radius:6px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
            item.textContent = pl.name;
            item.onmouseenter = () => item.style.background = 'var(--surface3)';
            item.onmouseleave = () => item.style.background = 'transparent';
            item.ontouchstart = () => item.style.background = 'var(--surface3)';
            item.ontouchend = () => setTimeout(() => item.style.background = 'transparent', 150);
            item.onclick = async () => {
                await addToPlaylist(pl.id, track);
                showToast(`Added "${track.title}" to ${pl.name}`);
                menu.remove();
            };
            menu.appendChild(item);
        });
    }

    const newPl = document.createElement('div');
    newPl.style.cssText = 'padding:8px 10px;font-size:13px;cursor:pointer;border-radius:6px;color:var(--accent);border-top:1px solid var(--border);margin-top:4px;display:flex;align-items:center;gap:6px';
    newPl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg> New Playlist';
    newPl.onclick = () => { pendingPlaylistTrack = track; menu.remove(); openNewPlaylistModal(); };
    menu.appendChild(newPl);
    document.body.appendChild(menu);

    const autoClose = setTimeout(() => menu.remove(), 5000);
    const closeOnTap = e => {
        if (!e.target.closest('#quick-playlist-menu')) {
            menu.remove();
            document.removeEventListener('touchstart', closeOnTap);
            document.removeEventListener('click', closeOnTap);
            clearTimeout(autoClose);
        }
    };
    setTimeout(() => {
        document.addEventListener('touchstart', closeOnTap, { passive: true });
        document.addEventListener('click', closeOnTap);
    }, 100);
}

document.addEventListener('click', e => {
    if (!e.target.closest('#ctx-menu') && !e.target.closest('#quick-playlist-menu')) {
        closeCtxMenu();
    }
});

document.addEventListener('touchstart', e => {
    if (!e.target.closest('#ctx-menu') && !e.target.closest('.track-menu-btn') && !e.target.closest('#quick-playlist-menu')) {
        closeCtxMenu();
    }
}, { passive: true });

function openCtxMenu(e, t) {
    ctxTrack = t;
    document.body.classList.add('menu-open');
    if (menuBackdrop) menuBackdrop.style.display = 'block';
    const row = document.querySelector(`.track[data-id="${t.id}"]`);
    if (row) row.classList.add('long-press');

    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    let targetTracks = [];
    if (!isTouch) {
        targetTracks = Array.from(document.querySelectorAll('.track.selected'))
            .map(el => tracks.find(x => x.id === el.dataset.id))
            .filter(Boolean);
    }
    if (!targetTracks.length || !targetTracks.some(st => st.id === t.id)) targetTracks = [t];

    const trackNameLabel = document.getElementById('ctx-track-name');
    if (trackNameLabel) {
        trackNameLabel.textContent = targetTracks.length > 1 ? `${targetTracks.length} tracks selected` : (t.title || 'Track');
    }

    const ctxEditMetadata = document.getElementById('ctx-edit-metadata');
    if (ctxEditMetadata) {
        ctxEditMetadata.onclick = () => { closeCtxMenu(); openEditMetadataModal(t); };
    }

    const ctxPlayNext = document.getElementById('ctx-play-next');
    if (ctxPlayNext) {
        ctxPlayNext.onclick = () => {
            queue.splice(qIdx + 1, 0, ...targetTracks);
            showToast(`Playing ${targetTracks.length} track(s) next`);
            saveQueueState();
            if (queueOpen) renderQueue();
            closeCtxMenu();
        };
    }

    const ctxAddQueue = document.getElementById('ctx-add-queue');
    if (ctxAddQueue) {
        ctxAddQueue.onclick = () => {
            queue.splice(qIdx + 1, 0, ...targetTracks);
            showToast(`Added ${targetTracks.length} track(s) to play next`);
            saveQueueState();
            if (queueOpen) renderQueue();
            closeCtxMenu();
        };
    }

    const ctxRemoveFromPlaylist = document.getElementById('ctx-remove-from-playlist');
    const ctxRemoveSep = document.getElementById('ctx-remove-sep');
    if (ctxRemoveFromPlaylist && ctxRemoveSep) {
        if (currentPlaylist) {
            ctxRemoveSep.style.display = 'block';
            ctxRemoveFromPlaylist.style.display = 'flex';
            ctxRemoveFromPlaylist.onclick = async () => {
                closeCtxMenu();
                for (const track of targetTracks) await removeFromPlaylist(currentPlaylist.id, track.id);
                showToast(`Removed ${targetTracks.length} song(s)`);
                const updated = await fetchPlaylist(currentPlaylist.id);
                if (updated) { currentPlaylist = updated; renderPlaylistDetail(updated); }
            };
        } else {
            ctxRemoveSep.style.display = 'none';
            ctxRemoveFromPlaylist.style.display = 'none';
        }
    }

    if (ctxPlaylists) {
        ctxPlaylists.innerHTML = '';
        if (playlists.length) {
            playlists.forEach(pl => {
                const item = document.createElement('div');
                item.className = 'ctx-item';
                item.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M15 12h6"/></svg>${pl.name}`;
                item.onclick = async () => {
                    closeCtxMenu();
                    for (const track of targetTracks) await addToPlaylist(pl.id, track);
                    showToast(`Added ${targetTracks.length} song(s) to ${pl.name}`);
                };
                ctxPlaylists.appendChild(item);
            });
        }
    }

    if (ctxMenu) {
        ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
        ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 300) + 'px';
        ctxMenu.classList.add('open');
    }
}

const ctxNewPlaylist = document.getElementById('ctx-new-playlist');
if (ctxNewPlaylist) {
    ctxNewPlaylist.onclick = () => { pendingPlaylistTrack = ctxTrack; closeCtxMenu(); openNewPlaylistModal(); };
}

async function loadPlaylists() {
    try {
        const r = await fetch('/api/playlists', { headers: hget() });
        if (!r.ok) return;
        playlists = await r.json();
        renderPlaylists();
    } catch (e) { console.error("Failed to load playlists", e); }
}

function renderPlaylists() {
    if (!playlistsContainer) return;
    playlistsContainer.innerHTML = '';
    if (!playlists.length) {
        playlistsContainer.innerHTML = '<div style="padding:40px 16px;text-align:center;color:var(--muted);font-size:14px">No playlists yet</div>';
        return;
    }
    playlists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = '<div class="playlist-icon">\u266B</div><div class="playlist-info"><div class="playlist-name">' + pl.name + '</div><div class="playlist-count">' + pl.tracks.length + ' song' + (pl.tracks.length !== 1 ? 's' : '') + '</div></div><button class="playlist-del" title="Delete">\u2715</button>';
        card.querySelector('.playlist-del').onclick = e => { e.stopPropagation(); deletePlaylist(pl.id) };
        bindTapActivation(card, () => openPlaylistDetail(pl));
        playlistsContainer.appendChild(card);
    });
}

function openPlaylistDetail(pl) {
    saveScroll();
    currentPlaylist = pl;
    currentDetailView = { type: 'playlist', name: pl.name };
    document.body.classList.add('detail-view');

    if (playlistsListView) playlistsListView.style.display = 'none';
    if (playlistDetail) playlistDetail.classList.add('active');
    const plName = document.getElementById('playlist-detail-name');
    if (plName) plName.textContent = pl.name;

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = pl.name;

    renderPlaylistDetail(pl);
    restoreScroll();
}

function closePlaylistDetail() {
    if (playlistDetail) playlistDetail.classList.remove('active');
    if (playlistsListView) playlistsListView.style.display = '';
    currentPlaylist = null;
    currentDetailView = null;
    document.body.classList.remove('detail-view');

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = 'Jam!';
    restoreScroll();
}

function renderPlaylistDetail(pl) {
    const plCount = document.getElementById('playlist-detail-count');
    if (plCount) plCount.textContent = pl.tracks.length + ' song' + (pl.tracks.length !== 1 ? 's' : '');
    const container = document.getElementById('playlist-tracks');
    if (!container) return;
    container.innerHTML = '';
    if (!pl.tracks.length) {
        container.innerHTML = '<div style="padding:32px 16px;text-align:center;color:var(--muted);font-size:14px">No songs yet</div>';
        return;
    }
    const isTouchScreen = window.matchMedia("(pointer: coarse)").matches;
    pl.tracks.forEach(pt => {
        const t = tracks.find(x => x.id === pt.trackId) || { id: pt.trackId, title: pt.title, artist: pt.artist, album: pt.album };
        const row = makeRow(t, false, true);
        if (!isTouchScreen) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'track-menu-btn';
            removeBtn.textContent = '\u2715';
            removeBtn.title = 'Remove from playlist';
            removeBtn.onclick = e => { e.stopPropagation(); removeFromPlaylist(pl.id, pt.trackId) };
            removeBtn.style.opacity = '0';
            row.onmouseenter = () => removeBtn.style.opacity = '1';
            row.onmouseleave = () => removeBtn.style.opacity = '0';
            const right = row.querySelector('.track-right');
            if (right) right.appendChild(removeBtn);
        }
        container.appendChild(row);
    });
}

const plBack = document.getElementById('playlist-back');
if (plBack) {
    plBack.onclick = () => {
        if (playlistDetail) playlistDetail.classList.remove('active');
        if (playlistsListView) playlistsListView.style.display = '';
        currentPlaylist = null;
    };
}

const libraryBack = document.getElementById('library-back');
if (libraryBack) {
    libraryBack.onclick = () => {
        closeDetailView();
    };
}

const plPlayBtn = document.getElementById('playlist-play-btn');
if (plPlayBtn) {
    plPlayBtn.onclick = () => {
        if (!currentPlaylist || !currentPlaylist.tracks.length) return;
        const list = currentPlaylist.tracks.map(pt => tracks.find(x => x.id === pt.trackId)).filter(Boolean);
        if (!list.length) return;
        if (shuffle) {
            const first = list[Math.floor(Math.random() * list.length)];
            playTrack(first, list);
        } else {
            playTrack(list[0], list);
        }
    };
}

async function addToPlaylist(playlistId, t) {
    try {
        const r = await fetch('/api/playlists/' + playlistId, { method: 'POST', headers: hdrs(), body: JSON.stringify({ trackId: t.id, title: t.title, artist: t.artist, album: t.album }) });
        if (r.ok) {
            const updated = await r.json();
            playlists = playlists.map(p => p.id === playlistId ? updated : p);
            if (currentPlaylist?.id === playlistId) { currentPlaylist = updated; renderPlaylistDetail(updated); }
        }
    } catch (e) { console.error("Failed to add to playlist", e); }
}

async function removeFromPlaylist(playlistId, trackId) {
    try {
        const r = await fetch('/api/playlists/' + playlistId + '?trackId=' + encodeURIComponent(trackId), { method: 'DELETE', headers: hget() });
        if (r.ok) {
            const updated = await r.json();
            playlists = playlists.map(p => p.id === playlistId ? updated : p);
            if (currentPlaylist?.id === playlistId) { currentPlaylist = updated; renderPlaylistDetail(updated); }
        }
    } catch (e) { console.error("Failed to remove from playlist", e); }
}

async function fetchPlaylist(id) {
    try {
        const r = await fetch('/api/playlists/' + id, { headers: hget() });
        if (!r.ok) return null;
        return await r.json();
    } catch (e) {
        console.error("Failed to fetch playlist", e);
        return null;
    }
}

async function deletePlaylist(id) {
    if (!confirm('Delete this playlist?')) return;
    try {
        await fetch('/api/playlists?id=' + id, { method: 'DELETE', headers: hget() });
        playlists = playlists.filter(p => p.id !== id);
        renderPlaylists();
    } catch (e) { console.error("Failed to delete playlist", e); }
}

function openNewPlaylistModal() {
    if (modalNew) modalNew.style.display = 'flex';
    if (modalNameInput) { modalNameInput.value = ''; setTimeout(() => modalNameInput.focus(), 50); }
}

const modalCancel = document.getElementById('modal-cancel');
if (modalCancel) modalCancel.onclick = () => { if (modalNew) modalNew.style.display = 'none'; pendingPlaylistTrack = null; };

const modalConfirm = document.getElementById('modal-confirm');
if (modalConfirm) {
    modalConfirm.onclick = async () => {
        const name = modalNameInput ? modalNameInput.value.trim() : '';
        if (!name) return;
        try {
            const r = await fetch('/api/playlists', { method: 'POST', headers: hdrs(), body: JSON.stringify({ name }) });
            if (r.ok) {
                const pl = await r.json();
                playlists.push(pl);
                if (pendingPlaylistTrack) { await addToPlaylist(pl.id, pendingPlaylistTrack); pendingPlaylistTrack = null; }
                renderPlaylists();
                if (modalNew) modalNew.style.display = 'none';
            }
        } catch (e) { console.error("Failed to create playlist", e); }
    };
}

if (modalNameInput) modalNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('modal-confirm').click() });

const newPlaylistBtn = document.getElementById('new-playlist-btn');
if (newPlaylistBtn) newPlaylistBtn.onclick = openNewPlaylistModal;

function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.style.cssText = 'position:fixed;bottom:calc(var(--player-h) + 16px);left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:8px 16px;border-radius:8px;font-size:13px;z-index:500;transition:opacity .3s;max-width:calc(100vw - 32px)';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._t);
    t._t = setTimeout(() => t.style.opacity = '0', 2000);
}

const MAX_COVER_CACHE = 200;
const coverCacheOrder = [];
const coverCache = {};
const coverRequests = {};

function coverCacheGet(id) {
    if (!(id in coverCache)) return undefined;
    const idx = coverCacheOrder.indexOf(id);
    if (idx !== -1) { coverCacheOrder.splice(idx, 1); coverCacheOrder.push(id); }
    return coverCache[id];
}

function coverCacheSet(id, url) {
    if (id in coverCache) {
        if (coverCache[id]) URL.revokeObjectURL(coverCache[id]);
        const idx = coverCacheOrder.indexOf(id);
        if (idx !== -1) coverCacheOrder.splice(idx, 1);
    }
    coverCache[id] = url;
    coverCacheOrder.push(id);
    while (coverCacheOrder.length > MAX_COVER_CACHE) {
        const evictId = coverCacheOrder[0];
        // Never evict the currently playing track's cover — revoking its
        // object URL would cause visible glitches in the player UI
        if (qIdx >= 0 && queue[qIdx]?.id === evictId) {
            coverCacheOrder.push(coverCacheOrder.shift());
            break;
        }
        coverCacheOrder.shift();
        if (coverCache[evictId]) URL.revokeObjectURL(coverCache[evictId]);
        delete coverCache[evictId];
    }
}

function coverCacheHas(id) { return id in coverCache; }

async function ensureCoverUrl(id) {
    if (coverCacheHas(id)) return coverCacheGet(id);
    if (coverRequests[id]) return coverRequests[id];
    coverRequests[id] = fetch('/api/cover/' + id, { headers: hget() }).then(async r => {
        if (!r.ok) return null;
        const blob = await r.blob();
        const objectUrl = URL.createObjectURL(blob);
        coverCacheSet(id, objectUrl);
        return objectUrl;
    }).catch(() => {
        coverCacheSet(id, null);
        return null;
    }).finally(() => { delete coverRequests[id]; });
    return coverRequests[id];
}

async function loadCover(id, el) {
    if (!el) return;
    const url = await ensureCoverUrl(id);
    if (url) setCover(el, url);
}

const MAX_ARTIST_IMAGE_CACHE = 100;
const artistImageCache = {}; // { name: { url, expires } }

function clearArtistImageCache() {
    Object.keys(artistImageCache).forEach(k => delete artistImageCache[k]);
    console.log('Artist image cache cleared');
}

const artistImageRequests = {};

async function loadArtistImage(name, imgEl) {
    // Prepare for fade-in
    imgEl.style.opacity = '0';
    imgEl.style.visibility = 'visible';
    imgEl.style.transition = 'opacity 0.3s ease-in-out';

    const applyImage = (url) => {
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        imgEl.src = url;
        if (imgEl.complete) imgEl.style.opacity = '1';
    };

    const cached = artistImageCache[name];
    if (cached && cached.expires > Date.now()) {
        applyImage(cached.url);
        return;
    }

    if (!artistImageRequests[name]) {
        artistImageRequests[name] = fetch('/api/artist-image?name=' + encodeURIComponent(name), { headers: hget() })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d && d.picture) {
                    artistImageCache[name] = { url: d.picture, expires: Date.now() + 86400000 };
                    return d.picture;
                }
                return null;
            })
            .catch(() => null)
            .finally(() => { delete artistImageRequests[name]; });
    }

    const pictureUrl = await artistImageRequests[name];
    if (pictureUrl) {
        applyImage(pictureUrl);
    } else {
        imgEl.style.display = 'none';
    }
}

function setCover(el, url) {
    if (el.tagName === 'IMG') {
        el.src = url;
        el.onerror = () => {
            el.src = FALLBACK;
            el.onerror = null;
        };
    } else {
        el.innerHTML = '';
        const img = new Image();
        img.src = url;
        img.alt = '';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = el.classList.contains('thumb') ? 'cover' : 'contain';
        img.onerror = () => {
            img.src = FALLBACK;
            img.onerror = null;
        };
        el.appendChild(img);
    }
}

const FALLBACK = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%2326262e"/><text x="50%25" y="54%25" text-anchor="middle" fill="%237a7a8e" font-size="18">\u266A</text></svg>';

function playTrack(t, list) {
    if (shuffle) {
        let rest = list.filter(x => x.id !== t.id);
        for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        queue = [t, ...rest];
        qIdx = 0;
    } else {
        queue = [...list];
        qIdx = queue.findIndex(x => x.id === t.id);
    }
    play(t);
    document.querySelectorAll('.track.active').forEach(e => e.classList.remove('active'));
    const row = document.querySelector('.track[data-id="' + t.id + '"]');
    if (row) row.classList.add('active');
    if (queueOpen) renderQueue();
}

let _trackTransition = false;
function play(t) {
    seeking = false;
    lyricsOffset = 0;
    updateStatusBar();
    updateLyricsOffsetUI();
    updateMediaSession(t);
    if (audio) {
        initAudioContext(audio);
        if (audioCtx?.state === 'suspended') audioCtx.resume();
        _trackTransition = true;
        audio.src = '/api/stream/' + t.id;
        audio.load();
        audio.play().catch(e => console.error("Playback failed", e));
    }
    if (player) { player.classList.remove('hidden'); updatePlayerHeight(); }
    updatePlayerMetadata(t);
    const pt = document.getElementById('player-thumb');
    if (pt) { pt.src = FALLBACK; loadCover(t.id, pt); }
    document.title = (t.title || '?') + ' \u00B7 ' + (t.artist || '?');
    if (timeTot) timeTot.textContent = '-';
    localStorage.setItem('music_last', JSON.stringify({ id: t.id, title: t.title, artist: t.artist, album: t.album, duration: t.duration }));
    saveQueueState();
    loadLyrics(t);
    updateExpandedNowPlaying(t);
    updateAdaptiveBackground();
    startHeartbeat();

}

function updateExpandedNowPlaying(t) {
    if (!t) return;
    if (expTitle) expTitle.textContent = t.title || 'Unknown';
    if (expArtist) expArtist.textContent = [t.artist, t.album].filter(Boolean).join(' \u00B7 ') || '\u2014';
    if (expCover) expCover.style.display = 'block';
    if (expCoverIcon) expCoverIcon.style.display = 'none';
    if (expCover) {
        loadCover(t.id, expCover);
        expCover.onload = () => updateAdaptiveBackground();
        expCover.onerror = () => { expCover.style.display = 'none'; if (expCoverIcon) expCoverIcon.style.display = 'block'; };
    }
}

if (audio) {
    audio.addEventListener('loadedmetadata', () => {
        const d = getRealDuration();
        const t = queue && queue[qIdx];
        if (d) {
            if (timeTot) timeTot.textContent = fmt(d);
            if (expTimeTot) expTimeTot.textContent = fmt(d);
            if (qIdx >= 0) {
                const dur = document.querySelector('.track-dur[data-id="' + queue[qIdx]?.id + '"]');
                if (dur) dur.textContent = fmt(d);
                try {
                    const last = JSON.parse(localStorage.getItem('music_last') || '{}');
                    if (last && last.id === queue[qIdx].id) {
                        last.duration = d;
                        localStorage.setItem('music_last', JSON.stringify(last));
                    }
                } catch (e) { }
            }
        }
    });
    function syncPlayPause(playing) {
        if (iconPlay) iconPlay.style.display = playing ? 'none' : 'block';
        if (iconPause) iconPause.style.display = playing ? 'block' : 'none';
        if (expIconPlay) expIconPlay.style.display = playing ? 'none' : 'block';
        if (expIconPause) expIconPause.style.display = playing ? 'block' : 'none';
    }
    audio.addEventListener('play', () => {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        syncPlayPause(true);
        updateSyncedLyricsState(true);
        const ct = queue && queue[qIdx];
        if (ct) updateMediaSession(ct);
    });
    audio.addEventListener('playing', () => {
        _trackTransition = false;
        _pendingBackgroundPlay = false;
    });
    audio.addEventListener('pause', () => {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        if (!_trackTransition) {
            syncPlayPause(false);
        }
    });
    audio.addEventListener('ended', () => {
        if (_trackTransition) return;
        nextTrack();
    });
    audio.addEventListener('error', () => {
        _trackTransition = false;
        console.error('Audio error on:', audio.src, audio.error?.message);
    });
    audio.addEventListener('seeked', () => {
        seeking = false;
        updateSyncedLyricsState(true, audio.currentTime);
    });
}

function getRealDuration() {
    if (audio && audio.duration && isFinite(audio.duration)) return audio.duration;
    const t = queue && queue[qIdx];
    return (t && t.duration) ? t.duration : 0;
}

function setupSeekBar(el) {
    if (!el) return;
    let userPct = null;

    el.oninput = () => {
        seeking = true;
        userPct = parseFloat(el.value);
        const d = (audio && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : getRealDuration();
        if (!d) return;
        const v = d * userPct / 100;
        if (progress) progress.value = userPct;
        if (expProgress) expProgress.value = userPct;
        if (timeCur) timeCur.textContent = fmt(v);
        if (expTimeCur) expTimeCur.textContent = fmt(v);
    };

    el.onchange = () => {
        if (userPct === null) return;
        const d = (audio && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : getRealDuration();
        if (audio && d) {
            const target = d * userPct / 100;
            audio.currentTime = target;
            updateSyncedLyricsState(true, target);
        }
        userPct = null;
    };
}

setupSeekBar(progress);
setupSeekBar(expProgress);

function setVolume(value) {
    const v = value / 100;
    if (audio) applyVolume(Math.pow(v, 3));
    muted = v === 0;
    if (v > 0) lastVol = parseInt(value);
    const iconHtml = v === 0 ? volIcons.muted : v < 0.5 ? volIcons.low : volIcons.high;
    if (volumeIcon) volumeIcon.innerHTML = iconHtml;
    if (expVolumeIcon) expVolumeIcon.innerHTML = iconHtml;
    if (volumeSlider) volumeSlider.value = value;
    if (expVolumeSlider) expVolumeSlider.value = value;
    localStorage.setItem('music_vol', value);
}

function toggleMute() {
    if (muted) {
        setVolume(lastVol);
    } else {
        lastVol = parseInt(volumeSlider ? volumeSlider.value : expVolumeSlider ? expVolumeSlider.value : '80');
        setVolume(0);
        muted = true;
    }
}

if (volumeSlider) {
    volumeSlider.addEventListener('input', () => setVolume(volumeSlider.value));
    volumeSlider.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        const newValue = Math.max(0, Math.min(100, parseInt(volumeSlider.value) + delta));
        setVolume(newValue);
    });
}

if (volumeIcon) {
    volumeIcon.addEventListener('click', toggleMute);
}

if (expVolumeSlider) {
    expVolumeSlider.addEventListener('input', () => setVolume(expVolumeSlider.value));
    expVolumeSlider.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        const newValue = Math.max(0, Math.min(100, parseInt(expVolumeSlider.value) + delta));
        setVolume(newValue);
    });
}

if (expVolumeIcon) {
    expVolumeIcon.addEventListener('click', toggleMute);
}

if (btnPlay) btnPlay.onclick = () => audio && (audio.paused ? audio.play() : audio.pause());
if (btnPrev) btnPrev.onclick = () => { if (audio && audio.currentTime > 3) audio.currentTime = 0; else prevTrack(); };
if (btnNext) btnNext.onclick = () => nextTrack();

if (btnShuffle) {
    btnShuffle.onclick = () => {
        shuffle = !shuffle;
        btnShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
        if (expShuffle) expShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
        localStorage.setItem('music_shuffle', shuffle);
        if (shuffle && queue.length > 1 && qIdx < queue.length - 1) {
            let rest = queue.slice(qIdx + 1);
            for (let i = rest.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [rest[i], rest[j]] = [rest[j], rest[i]];
            }
            queue = [...queue.slice(0, qIdx + 1), ...rest];
            saveQueueState();
            if (queueOpen) renderQueue();
        }
    };
}

const btnRepeat = document.getElementById('btn-repeat');
let repeatMode = localStorage.getItem('music_repeat') || 'off';

const repeatIcons = {
    off: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
    all: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
    one: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15.5" text-anchor="middle" font-size="9" font-weight="bold" fill="currentColor">1</text></svg>`
};

const volIcons = {
    muted: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
    low: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`,
    high: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`
};

function applyRepeat() {
    [btnRepeat, expRepeat].forEach(btn => {
        if (!btn) return;
        btn.dataset.mode = repeatMode;
        btn.innerHTML = repeatIcons[repeatMode];
        btn.title = 'Repeat: ' + repeatMode.charAt(0).toUpperCase() + repeatMode.slice(1);
        btn.classList.toggle('active', repeatMode !== 'off');
        btn.classList.toggle('data-mode-one', repeatMode === 'one');
        btn.style.color = repeatMode !== 'off' ? 'var(--accent)' : 'var(--muted)';
    });
}

applyRepeat();

if (btnRepeat) {
    btnRepeat.onclick = () => {
        const modes = ['off', 'all', 'one'];
        repeatMode = modes[(modes.indexOf(repeatMode) + 1) % 3];
        localStorage.setItem('music_repeat', repeatMode);
        applyRepeat();
    };
}
if (expRepeat) expRepeat.onclick = () => btnRepeat && btnRepeat.onclick();

function nextTrack() {
    if (!queue.length) return;
    if (repeatMode === 'one') { if (audio) { audio.currentTime = 0; audio.play(); } return; }
    const isLast = qIdx >= queue.length - 1;
    if (repeatMode === 'off' && isLast) return;
    qIdx = (qIdx + 1) % queue.length;
    play(queue[qIdx]); updateActive();
}

function prevTrack() {
    if (!queue.length) return;
    qIdx = (qIdx - 1 + queue.length) % queue.length;
    play(queue[qIdx]); updateActive();
}

function updateActive() {
    document.querySelectorAll('.track.active').forEach(e => e.classList.remove('active'));
    if (qIdx >= 0) {
        const row = document.querySelector(`.track[data-id="${queue[qIdx]?.id}"]`);
        if (row) row.classList.add('active');
    }
    if (queueOpen) renderQueue();
}

document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); if (audio) (audio.paused ? audio.play() : audio.pause()); }
    if (e.key === 'ArrowRight') nextTrack();
    if (e.key === 'ArrowLeft') prevTrack();
});

if (expPlay) expPlay.onclick = () => audio && (audio.paused ? audio.play() : audio.pause());
if (expPrev) expPrev.onclick = () => { if (audio && audio.currentTime > 3) audio.currentTime = 0; else prevTrack(); };
if (expNext) expNext.onclick = () => nextTrack();
if (expShuffle) expShuffle.onclick = () => btnShuffle && btnShuffle.onclick();



function scrollExpandedPlayerTo(top, behavior = 'smooth') {
    if (!expPlayer) return;
    expPlayer.scrollTo({ top, behavior });
}

let _savedScrollY = 0;

function openExpandedPlayer(options = {}) {
    const { revealLyrics = false } = options;
    playerExpanded = true;

    // Save scroll and lock body
    _savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${_savedScrollY}px`;

    document.body.classList.add('player-open');
    document.documentElement.classList.add('player-open');
    if (expPlayer) expPlayer.classList.add('open');
    if (lyricsPanel) lyricsPanel.classList.remove('open');
    if (lyricsBtn) lyricsBtn.classList.remove('active');
    lyricsOpen = false;
    if (queueOpen) {
        if (queuePanel) queuePanel.classList.remove('open');
        if (queueBtn) queueBtn.classList.remove('active');
        queueOpen = false;
    }
    if (qIdx >= 0 && queue[qIdx]) {
        updateExpandedNowPlaying(queue[qIdx]);
        updateAdaptiveBackground();
    }

    if (!isMobile()) {
        setDesktopExpandedLyricsOpen(revealLyrics);
    }

    if (revealLyrics) {
        if (!isMobile()) return;
        openLyricsCard();
        return;
    }

    closeLyricsCard();
    requestAnimationFrame(() => scrollExpandedPlayerTo(0, 'auto'));
}

function closeExpandedPlayer() {
    playerExpanded = false;

    // Unlock body and restore scroll
    document.body.classList.remove('player-open');
    document.documentElement.classList.remove('player-open');
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, _savedScrollY);

    if (expPlayer) {
        expPlayer.classList.remove('open');
        expPlayer.style.background = '';
    }
    closeLyricsCard();
    setDesktopExpandedLyricsOpen(false);
    updateStatusBar();
}

if (expCollapse) expCollapse.onclick = closeExpandedPlayer;
if (expPlayer) expPlayer.addEventListener('click', e => { if (e.target === expPlayer) closeExpandedPlayer() });

function setDesktopExpandedLyricsOpen(open) {
    desktopExpandedLyricsOpen = !!open;
    if (expPlayer) expPlayer.classList.toggle('desktop-lyrics-open', desktopExpandedLyricsOpen);
    if (expContent) expContent.classList.toggle('desktop-lyrics-open', desktopExpandedLyricsOpen);
    if (expLyricsToggle) expLyricsToggle.classList.toggle('active', desktopExpandedLyricsOpen);
    if (desktopExpandedLyricsOpen) {
        requestAnimationFrame(() => scrollExpandedPlayerTo(0, 'auto'));
    }
}

let swipeStartX = 0, swipeStartY = 0, swipeDeltaY = 0, swipeStartTime = 0, isPanelSwiping = false, swipeTarget = null;
let queueExpanded = false;
const SWIPE_THRESHOLD = 50;

if (player) {
    player.addEventListener('touchstart', e => {
        if (e.target.tagName === 'INPUT' || !isMobile()) return;
        if (window.innerHeight - e.touches[0].clientY < 30) return; // Prevent OS app switcher interference
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeStartTime = Date.now();
        swipeDeltaY = 0;
        isPanelSwiping = true;
        swipeTarget = 'expand';
    }, { passive: true });
}

if (expPlayer) {
    expPlayer.addEventListener('touchstart', e => {
        if (e.target.tagName === 'INPUT' || !isMobile()) return;
        if (expPlayer.scrollTop > 5) {
            swipeTarget = null;
            isPanelSwiping = false;
            return;
        }
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeStartTime = Date.now();
        swipeDeltaY = 0;
        isPanelSwiping = true;
        swipeTarget = 'collapse';
    }, { passive: true });
}

document.addEventListener('touchmove', e => {
    if (!isPanelSwiping) return;
    const deltaX = e.touches[0].clientX - swipeStartX;
    swipeDeltaY = e.touches[0].clientY - swipeStartY;

    if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(swipeDeltaY)) {
        isPanelSwiping = false;
        swipeTarget = null;
        if (expPlayer) { expPlayer.classList.remove('swiping'); expPlayer.style.transform = ''; }
        if (queuePanel) { queuePanel.classList.remove('swiping'); queuePanel.style.transform = ''; }
        return;
    }

    if (swipeTarget === 'expand' && swipeDeltaY < 0) {
        const translate = Math.max(0, 100 + (swipeDeltaY / window.innerHeight) * 100);
        expPlayer.classList.add('swiping');
        expPlayer.style.transform = `translateY(${translate}%)`;
    } else if (swipeTarget === 'collapse' && swipeDeltaY > 0) {
        const translate = Math.min(100, (swipeDeltaY / window.innerHeight) * 100);
        expPlayer.classList.add('swiping');
        expPlayer.style.transform = `translateY(${translate}%)`;
    } else if (swipeTarget === 'queue-swipe' && swipeDeltaY !== 0) {
        let translate;
        if (queueExpanded) {
            translate = Math.max(0, Math.min(100, (swipeDeltaY / window.innerHeight) * 100));
        } else {
            translate = Math.max(0, Math.min(100, 40 + (swipeDeltaY / window.innerHeight) * 100));
        }
        queuePanel.classList.add('swiping');
        queuePanel.style.transform = `translateY(${translate}%)`;
    }
}, { passive: true });

document.addEventListener('touchend', () => {
    if (!isPanelSwiping) return;
    const duration = Date.now() - swipeStartTime;
    const velocity = Math.abs(swipeDeltaY) / duration;
    isPanelSwiping = false;

    if (!isMobile()) { swipeTarget = null; return; }

    const isFlick = velocity > 0.5;
    const isPastThreshold = Math.abs(swipeDeltaY) > SWIPE_THRESHOLD;

    if (swipeTarget === 'expand') {
        expPlayer.classList.remove('swiping');
        expPlayer.style.transform = '';
        if ((isFlick && swipeDeltaY < 0) || (isPastThreshold && swipeDeltaY < -SWIPE_THRESHOLD)) {
            openExpandedPlayer();
        }
    } else if (swipeTarget === 'collapse') {
        expPlayer.classList.remove('swiping');
        expPlayer.style.transform = '';
        if ((isFlick && swipeDeltaY > 0) || (isPastThreshold && swipeDeltaY > SWIPE_THRESHOLD)) {
            closeExpandedPlayer();
        }
    } else if (swipeTarget === 'queue-swipe') {
        queuePanel.classList.remove('swiping');
        queuePanel.style.transform = '';

        const finalTranslate = queueExpanded
            ? (swipeDeltaY / window.innerHeight) * 100
            : 40 + (swipeDeltaY / window.innerHeight) * 100;

        if ((isFlick && swipeDeltaY < 0) || finalTranslate < 20) {
            queueExpanded = true;
            queuePanel.classList.add('expanded');
            queuePanel.classList.add('open');
        } else if ((isFlick && swipeDeltaY > 0 && finalTranslate > 55) || finalTranslate > 70) {
            closeQueuePanel();
        } else {
            queueExpanded = false;
            queuePanel.classList.remove('expanded');
            queuePanel.classList.add('open');
        }
    }
    swipeTarget = null;
}, { passive: true });

document.addEventListener('touchcancel', () => {
    if (!isPanelSwiping) return;
    isPanelSwiping = false;

    if (swipeTarget === 'expand' && expPlayer) {
        expPlayer.classList.remove('swiping');
        expPlayer.style.transform = '';
    } else if (swipeTarget === 'collapse' && expPlayer) {
        expPlayer.classList.remove('swiping');
        expPlayer.style.transform = '';
    } else if (swipeTarget === 'queue-swipe' && queuePanel) {
        queuePanel.classList.remove('swiping');
        queuePanel.style.transform = '';
        if (!queueExpanded) queuePanel.classList.add('open');
    }
    swipeTarget = null;
}, { passive: true });

function bindBackSwipe(el, onBack, shouldStart) {
    if (!el) return;
    let startX = null, startY = null, deltaX = 0, active = false;
    let samples = [];

    function velocity() {
        if (samples.length < 2) return 0;
        const recent = samples.slice(-4);
        const dt = recent[recent.length - 1].t - recent[0].t;
        const dx = recent[recent.length - 1].x - recent[0].x;
        return dt > 0 ? dx / dt : 0;
    }

    el.addEventListener('touchstart', e => {
        if (!isMobile()) return;
        if (shouldStart && !shouldStart()) return;
        if (e.touches[0].clientX > 30) return; // Edge swipe only
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        deltaX = 0;
        active = false;
        samples = [{ x: startX, t: Date.now() }];
    }, { passive: true });

    el.addEventListener('touchmove', e => {
        if (startX === null) return;
        if (shouldStart && !shouldStart()) { startX = null; return; }
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        deltaX = currentX - startX;
        const deltaY = currentY - startY;

        samples.push({ x: currentX, t: Date.now() });
        if (samples.length > 6) samples.shift();

        if (!active) {
            if (Math.abs(deltaY) > 15 && Math.abs(deltaY) > Math.abs(deltaX)) {
                startX = null;
                return;
            }
            if (deltaX > 10) {
                active = true;
                el.style.transition = 'none';
            }
        }
        if (active && deltaX > 0) {
            if (e.cancelable) e.preventDefault();
            el.style.transform = `translate3d(${deltaX}px,0,0)`;
        }
    }, { passive: false });

    el.addEventListener('touchend', () => {
        if (!active) { startX = null; return; }
        active = false;
        const vel = velocity();
        // Trigger if pulled more than 90px OR fast flick > 0.4px/ms
        if (deltaX > 90 || vel > 0.4) {
            el.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 1, 1)';
            el.style.transform = 'translate3d(100vw,0,0)';
            setTimeout(() => {
                onBack();
                el.style.transform = '';
                el.style.transition = '';
            }, 260);
        } else {
            el.style.transition = 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.075)';
            el.style.transform = 'translate3d(0,0,0)';
            setTimeout(() => {
                el.style.transition = '';
                el.style.transform = '';
            }, 400);
        }
        startX = null;
    }, { passive: true });

    el.addEventListener('touchcancel', () => {
        if (active) {
            el.style.transition = 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.075)';
            el.style.transform = 'translate3d(0,0,0)';
            setTimeout(() => { el.style.transform = ''; el.style.transition = ''; }, 400);
        }
        active = false;
        startX = null;
    }, { passive: true });
}

bindBackSwipe(playlistDetail, closePlaylistDetail, () => !!currentPlaylist);
bindBackSwipe(trackList, closeDetailView, () => !!currentDetailView);

function closeQueuePanel() {
    queueOpen = false;
    queueExpanded = false;
    if (queuePanel) { queuePanel.classList.remove('open', 'expanded'); queuePanel.style.transform = ''; }
    if (queueBtn) queueBtn.classList.remove('active');
}

function removeFromQueue(idx) {
    queue.splice(idx, 1);
    if (idx < qIdx) qIdx--;
    else if (idx === qIdx && qIdx >= queue.length) qIdx = queue.length - 1;
    renderQueue();
    saveQueueState();
}

const handle = document.getElementById('expand-handle');
if (handle) {
    handle.addEventListener('click', e => {
        e.preventDefault();
        if (!playerExpanded) openExpandedPlayer();
    });
}

[document.getElementById('player-left'), document.getElementById('player-meta-mobile')].forEach(el => {
    if (el) el.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('input') && isMobile()) openExpandedPlayer();
    });
});

const queuePanel = document.getElementById('queue-panel');
const queueBtn = document.getElementById('queue-btn');
const queueResizer = document.getElementById('queue-resizer');

let isQueueResizing = false;
let queueH = parseInt(localStorage.getItem('queue_h') || '220');

if (queueResizer) {
    queueResizer.onmousedown = e => {
        if (!isMobile()) {
            isQueueResizing = true;
            document.body.classList.add('is-resizing');
            document.addEventListener('mousemove', onQueueResize);
            document.addEventListener('mouseup', endQueueResize);
        }
    };
}

function onQueueResize(e) {
    if (!isQueueResizing || !queuePanel) return;
    const playerStyle = window.getComputedStyle(document.getElementById('player'));
    const playerHeight = parseInt(playerStyle.height) || 0;
    const newH = window.innerHeight - e.clientY - playerHeight;
    queueH = Math.min(window.innerHeight * 0.7, Math.max(100, newH));
    queuePanel.style.height = queueH + 'px';
}

function endQueueResize() {
    isQueueResizing = false;
    document.body.classList.remove('is-resizing');
    localStorage.setItem('queue_h', queueH);
    document.removeEventListener('mousemove', onQueueResize);
    document.removeEventListener('mouseup', endQueueResize);
}

if (queuePanel) {
    queuePanel.style.height = isMobile() ? '' : queueH + 'px';
}

if (queueBtn) {
    queueBtn.onclick = () => {
        queueOpen = !queueOpen;
        if (queueOpen) {
            queueExpanded = false;
            if (queuePanel) { queuePanel.classList.add('open'); queuePanel.classList.remove('expanded'); }
            if (queueBtn) queueBtn.classList.add('active');
            renderQueue();
        } else {
            closeQueuePanel();
        }
    };
}

const expQueueBtn = document.getElementById('exp-queue-btn');
if (expQueueBtn) {
    expQueueBtn.onclick = () => {
        queueOpen = true;
        queueExpanded = false;
        if (queuePanel) { queuePanel.classList.add('open'); queuePanel.classList.remove('expanded'); }
        if (queueBtn) queueBtn.classList.add('active');
        renderQueue();
    };
}

document.addEventListener('click', e => {
    if (isMobile() && queueOpen && queuePanel && !queuePanel.contains(e.target) && !e.target.closest('#queue-btn') && !e.target.closest('#exp-queue-btn') && !e.target.closest('.track') && !e.target.closest('.ctx-item')) {
        closeQueuePanel();
    }
});

if (queuePanel) {
    queuePanel.addEventListener('touchstart', e => {
        if (!isMobile()) return;
        if (e.target.tagName === 'INPUT' || e.target.closest('.queue-handle')) return;
        if (queuePanel.scrollTop > 20 && !e.target.closest('#queue-panel-mobile-handle')) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeStartTime = Date.now();
        swipeDeltaY = 0;
        isPanelSwiping = true;
        swipeTarget = 'queue-swipe';
    }, { passive: true });
}

function renderQueue(skipScroll = false) {
    if (!queuePanel) return;
    queuePanel.querySelectorAll('.queue-item').forEach(e => e.remove());
    const oldEmpty = queuePanel.querySelector('[style*="padding:40px"]');
    if (oldEmpty) oldEmpty.remove();

    if (!queue.length) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'padding:40px 20px;text-align:center;color:var(--muted);font-size:13px';
        emptyDiv.textContent = 'Queue is empty';
        queuePanel.appendChild(emptyDiv);
        return;
    }

    queue.forEach((t, i) => {
        const item = document.createElement('div');
        item.className = 'queue-item' + (i === qIdx ? ' active' : '');
        item.dataset.idx = i;

        const actionsBg = document.createElement('div');
        actionsBg.className = 'track-actions';
        item.appendChild(actionsBg);

        const content = document.createElement('div');
        content.className = 'queue-item-content';
        content.innerHTML = `<span class="queue-handle">\u283f</span><span class="queue-num">${i === qIdx ? '\u25b6' : i + 1}</span><div class="queue-info"><div class="queue-title">${t.title || 'Unknown'}</div><div class="queue-sub">${t.artist || '\u2014'}</div></div><button class="queue-remove" title="remove">\u2715</button>`;
        item.appendChild(content);

        const handle = content.querySelector('.queue-handle');
        if (handle) handle.onpointerdown = e => startQueueDrag(e, item);

        content.querySelector('.queue-remove').onclick = e => {
            e.stopPropagation();
            removeFromQueue(i);
        };

        if (isMobile()) {
            attachSwipeHandlers(item, content, actionsBg, {
                left: {
                    action: () => {
                        item.style.opacity = '0.5';
                        setTimeout(() => removeFromQueue(i), 200);
                    },
                    icon: SWIPE_ICONS.trash
                }
            });
        }

        item.onclick = (e) => {
            if (e.target.closest('.queue-handle') || item.style.opacity === '0.5') return;
            qIdx = i; play(queue[qIdx]); updateActive(); renderQueue();
        };
        queuePanel.appendChild(item);
    });

    if (!skipScroll) {
        const activeEl = queuePanel.querySelector('.queue-item.active');
        if (activeEl) activeEl.scrollIntoView({ block: 'center' });
    }
}

let dragItem = null, dragIdx = -1;
function startQueueDrag(e, item) {
    e.preventDefault();
    document.body.classList.add('is-dragging');
    dragItem = item;
    dragIdx = parseInt(item.dataset.idx);
    item.classList.add('dragging');
    item.setPointerCapture(e.pointerId);

    item.onpointermove = e => {
        if (!dragItem) return;
        const items = [...queuePanel.querySelectorAll('.queue-item')];
        const over = items.find(it => {
            if (it === dragItem) return false;
            const r = it.getBoundingClientRect();
            return e.clientY > r.top && e.clientY < r.bottom;
        });
        items.forEach(it => it.classList.remove('drag-over'));
        if (over) over.classList.add('drag-over');
    };

    item.onpointerup = e => {
        if (!dragItem) return;
        document.body.classList.remove('is-dragging');
        const items = [...queuePanel.querySelectorAll('.queue-item')];
        const over = items.find(it => it.classList.contains('drag-over'));
        if (over) {
            const newIdx = parseInt(over.dataset.idx);
            const [moved] = queue.splice(dragIdx, 1);
            queue.splice(newIdx, 0, moved);
            if (qIdx === dragIdx) qIdx = newIdx;
            else if (dragIdx < qIdx && newIdx >= qIdx) qIdx--;
            else if (dragIdx > qIdx && newIdx <= qIdx) qIdx++;
            saveQueueState();
        }
        dragItem.classList.remove('dragging');
        items.forEach(it => it.classList.remove('drag-over'));
        dragItem.onpointermove = null;
        dragItem.onpointerup = null;
        dragItem.releasePointerCapture(e.pointerId);
        dragItem = null;
        renderQueue(true);
    };
}

const clearQueueBtn = document.getElementById('clear-queue-btn');
if (clearQueueBtn) {
    clearQueueBtn.onclick = e => {
        e.stopPropagation();
        if (!queue.length) return;
        const current = queue[qIdx];
        queue = current ? [current] : [];
        qIdx = 0;
        renderQueue();
        saveQueueState();
    };
}

let _lastMetadataId = null;
function updateMediaSession(t) {
    if (!('mediaSession' in navigator) || !t) return;

    try {
        if (_lastMetadataId !== t.id) {
            _lastMetadataId = t.id;
            const base = window.location.origin;
            let coverUrl = base + '/api/cover/' + t.id;
            if (token) {
                coverUrl += '?token=' + encodeURIComponent(token);
            }

            navigator.mediaSession.metadata = new MediaMetadata({
                title: t.title || 'Unknown',
                artist: t.artist || 'Unknown',
                album: t.album || 'Unknown',
                artwork: [
                    { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
                ]
            });
        }

        navigator.mediaSession.setActionHandler('play', async () => {
            if (!audio) return;
            if (audioCtx?.state === 'suspended') {
                await audioCtx.resume();
            }
            _pendingBackgroundPlay = true;
            audio.play().catch(() => { });
        });
        navigator.mediaSession.setActionHandler('pause', () => { if (audio) audio.pause(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());

        const dur = t.duration || 0;
        if (dur > 0 && navigator.mediaSession.setPositionState) {
            try {
                const pos = (audio && isFinite(audio.currentTime)) ? Math.min(audio.currentTime, dur) : 0;
                navigator.mediaSession.setPositionState({
                    duration: dur,
                    playbackRate: audio ? audio.playbackRate : 1,
                    position: pos
                });
            } catch (e) { }
        }
    } catch (e) {
        console.error('Failed to update MediaSession:', e);
    }
}

const lyricsPanel = document.getElementById('lyrics-panel');
const lyricsBtn = document.getElementById('lyrics-btn');
let syncedLyrics = [], plainLyrics = '';
let lyricsFailed = new Set();
let lyricsFontSize = parseInt(localStorage.getItem('lyrics_font') || '13');
let lyricsRequestSeq = 0;
const LYRICS_OFFSET_STEP = 0.2;

let _lyricScrollEls = null;
function getLyricScrollEls() {
    if (!_lyricScrollEls) {
        _lyricScrollEls = [
            document.getElementById('lyrics-scroll'),
            document.getElementById('exp-lyrics-card-scroll'),
            expDesktopLyricsScroll
        ].filter(Boolean);
    }
    return _lyricScrollEls;
}
function invalidateLyricScrollCache() { _lyricScrollEls = null; }

document.querySelectorAll('[data-offset-action]').forEach(btn => {
    btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.offsetAction;
        if (action === 'earlier') adjustLyricsOffset(LYRICS_OFFSET_STEP);
        else if (action === 'later') adjustLyricsOffset(-LYRICS_OFFSET_STEP);
        else if (action === 'reset') {
            lyricsOffset = 0;
            updateLyricsOffsetUI();
            updateSyncedLyricsState(true);
        }
    });
});

function applyLyricsFontSize() {
    const val = lyricsFontSize + 'px';
    getLyricScrollEls().forEach(el => { el.style.fontSize = val; });
}

function bindLyricsFontChange(btnId, delta) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.onclick = e => {
        e.stopPropagation();
        lyricsFontSize = delta > 0 ? Math.min(30, lyricsFontSize + delta) : Math.max(10, lyricsFontSize + delta);
        localStorage.setItem('lyrics_font', lyricsFontSize);
        applyLyricsFontSize();
    };
}

bindLyricsFontChange('lyrics-font-up', 1);
bindLyricsFontChange('lyrics-font-down', -1);
bindLyricsFontChange('lyrics-font-up-desktop', 1);
bindLyricsFontChange('lyrics-font-down-desktop', -1);

updateLyricsOffsetUI();

const expLyricsCard = document.getElementById('exp-lyrics-card');
const expLyricsCardHeader = document.getElementById('exp-lyrics-card-header');
const expLyricsCardControls = document.getElementById('exp-lyrics-card-controls');
let lyricsCardOpen = false;

function openLyricsCard() {
    if (!expLyricsCard) return;
    lyricsCardOpen = true;
    expLyricsCard.classList.add('open');
    if (expLyricsCardControls) expLyricsCardControls.style.display = 'flex';
    if (isMobile()) {
        setTimeout(() => {
            expLyricsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => {
                const cardScroll = document.getElementById('exp-lyrics-card-scroll');
                const activeLine = cardScroll?.querySelector('.lyric-line.active');
                if (activeLine) {
                    activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if (cardScroll) {
                    cardScroll.scrollTop = 0;
                }
            }, 350);
        }, 100);
    }
    requestAnimationFrame(() => {
        if (expPlayer && expLyricsCard) {
            const top = expLyricsCard.offsetTop - 16;
            expPlayer.scrollTo({ top, behavior: 'smooth' });
        }
    });
}
function closeLyricsCard() {
    if (!expLyricsCard) return;
    lyricsCardOpen = false;
    expLyricsCard.classList.remove('open');
    if (expLyricsCardControls) expLyricsCardControls.style.display = 'none';
}
function toggleLyricsCard() {
    lyricsCardOpen ? closeLyricsCard() : openLyricsCard();
}

if (expLyricsCardHeader) {
    expLyricsCardHeader.addEventListener('click', e => {
        if (e.target.closest('button, #exp-lyrics-card-controls')) return;
        toggleLyricsCard();
    });
}

if (expLyricsCardControls) {
    expLyricsCardControls.addEventListener('click', e => e.stopPropagation());
}

if (expLyricsToggle) {
    expLyricsToggle.onclick = () => {
        if (isMobile()) {
            openLyricsCard();
            return;
        }
        setDesktopExpandedLyricsOpen(!desktopExpandedLyricsOpen);
    };
}

if (lyricsBtn) {
    lyricsBtn.onclick = () => {
        if (window.matchMedia('(max-width:768px)').matches) {
            openExpandedPlayer({ revealLyrics: true });
        } else {
            openExpandedPlayer({ revealLyrics: !desktopExpandedLyricsOpen });
        }
    };
}

const lyricsHeader = document.getElementById('lyrics-panel-header');
if (lyricsHeader && lyricsPanel) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    lyricsHeader.onmousedown = e => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = lyricsPanel.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        lyricsPanel.style.bottom = 'auto';
        lyricsPanel.style.right = 'auto';
        lyricsPanel.style.left = initialLeft + 'px';
        lyricsPanel.style.top = initialTop + 'px';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        lyricsPanel.style.left = (initialLeft + dx) + 'px';
        lyricsPanel.style.top = (initialTop + dy) + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

const lyricsCloseBtn = document.getElementById('lyrics-close-btn');
if (lyricsCloseBtn) {
    lyricsCloseBtn.onclick = () => {
        lyricsOpen = false;
        if (lyricsPanel) lyricsPanel.classList.remove('open');
        if (lyricsBtn) lyricsBtn.classList.remove('active');
    };
}

async function loadLyrics(t) {
    if (lyricsTrackId === t.id && !lyricsFailed.has(t.id)) return;
    lyricsFailed.delete(t.id);

    const requestSeq = ++lyricsRequestSeq;
    lyricsTrackId = t.id;
    syncedLyrics = []; plainLyrics = '';
    lastExpLyricIdx = -1;
    invalidateLyricScrollCache();

    setLyricsMessage("Loading lyrics\u2026", "\u2026");
    if (expLyricsWrap) {
        expLyricsWrap.style.display = 'flex';
    }

    try {
        // Check for curated pick first (server-side, shared across users)
        const cleanTitle = (t.title || '').replace(/^\d{1,3}[\s.\-_]+/, '').trim();
        const cq = new URLSearchParams({ title: cleanTitle, artist: t.artist || '' });
        const cr = await fetch(`/api/lyrics/curated?${cq}`, { headers: token ? { 'x-auth-token': token } : {} });
        if (cr.ok) {
            const cData = await cr.json();
            if (cData.exists && cData.lrclibId) {
                // Fetch the specific curated pick via search
                const sq = new URLSearchParams({ title: cleanTitle, artist: t.artist || '' });
                const sr = await fetch(`/api/lyrics/search?${sq}`, { headers: token ? { 'x-auth-token': token } : {} });
                if (sr.ok) {
                    const sItems = await sr.json();
                    if (requestSeq !== lyricsRequestSeq || lyricsTrackId !== t.id) return;
                    const match = sItems.find(i => i.id === cData.lrclibId);
                    if (match) {
                        applyLyricsPick(match);
                        return;
                    }
                }
                // If curated pick fetch fails, fall through
            }
        }

        // Check for saved lyrics pick (localStorage, per-user)
        const savedPick = getSavedLyricsPick(t.id);
        if (savedPick) {
            const sq = new URLSearchParams({ title: cleanTitle, artist: t.artist || '' });
            const sr = await fetch(`/api/lyrics/search?${sq}`, { headers: token ? { 'x-auth-token': token } : {} });
            if (sr.ok) {
                const sItems = await sr.json();
                if (requestSeq !== lyricsRequestSeq || lyricsTrackId !== t.id) return;
                const match = sItems.find(i => i.id === savedPick.id);
                if (match) {
                    applyLyricsPick(match);
                    return;
                }
            }
            // If saved pick not found, fall through to default fetch
        }

        const q = new URLSearchParams({ title: cleanTitle, artist: t.artist || '', album: t.album || '' });
        const r = await fetch(`/api/lyrics?${q}`, { headers: token ? { 'x-auth-token': token } : {} });

        if (!r.ok) throw new Error('not found');
        const d = await r.json();
        if (requestSeq !== lyricsRequestSeq || lyricsTrackId !== t.id) return;

        const plTitle = document.getElementById('lyrics-panel-title');
        const cardTitle = document.getElementById('exp-lyrics-card-title');
        const desktopTitle = document.getElementById('exp-desktop-lyrics-title');
        if (d.type === 'synced' && d.lyrics) {
            syncedLyrics = parseLRC(d.lyrics);
            renderSyncedLyrics();
            updateSyncedLyricsState(true);
            const titleText = d.source === 'lrclib' ? 'Lyrics' : `Lyrics \u00b7 ${d.source}`;
            if (plTitle) plTitle.textContent = titleText;
            if (cardTitle) cardTitle.textContent = titleText;
            if (desktopTitle) desktopTitle.textContent = titleText;
        } else if (d.type === 'plain' && d.lyrics) {
            plainLyrics = d.lyrics;
            renderPlainLyrics();
            if (expLyricCur) expLyricCur.innerHTML = '<span style="font-size:11px;font-weight:400;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">No synced lyrics available</span>';
            const titleText = d.source === 'lrclib' ? 'Lyrics' : `Lyrics \u00b7 ${d.source}`;
            if (plTitle) plTitle.textContent = titleText;
            if (cardTitle) cardTitle.textContent = titleText;
            if (desktopTitle) desktopTitle.textContent = titleText;
        } else {
            if (expLyricsWrap) {
                expLyricsWrap.style.display = 'none';
                expLyricsWrap.style.flex = '0';
            }
            setLyricsMessage("No lyrics found", "");
            if (plTitle) plTitle.textContent = 'Lyrics';
            if (cardTitle) cardTitle.textContent = 'Lyrics';
            if (desktopTitle) desktopTitle.textContent = 'Lyrics';
        }
    } catch (_) {
        if (requestSeq !== lyricsRequestSeq || lyricsTrackId !== t.id) return;
        lyricsFailed.add(t.id);
        if (expLyricsWrap) {
            expLyricsWrap.style.display = 'none';
            expLyricsWrap.style.flex = '0';
        }
        setLyricsMessage("No lyrics found", "");
    }
}

// ── Lyrics picker (desktop only) ──
const LYRICS_PICK_KEY = 'lyrics_pick';
const lyricsPickerBtn = document.getElementById('lyrics-picker-btn');
const lyricsPickerDropdown = document.getElementById('lyrics-picker-dropdown');
let lyricsPickerOpen = false;

function getSavedLyricsPick(trackId) {
    try {
        const picks = JSON.parse(localStorage.getItem(LYRICS_PICK_KEY) || '{}');
        return picks[trackId] || null;
    } catch (_) { return null; }
}

function saveLyricsPick(trackId, pick) {
    try {
        const picks = JSON.parse(localStorage.getItem(LYRICS_PICK_KEY) || '{}');
        if (pick) {
            picks[trackId] = pick;
        } else {
            delete picks[trackId];
        }
        localStorage.setItem(LYRICS_PICK_KEY, JSON.stringify(picks));
    } catch (_) { }
}

async function saveCuratedPick(artist, title, lrclibId) {
    try {
        console.log('[curated] Saving pick:', { artist, title, lrclibId });
        const q = new URLSearchParams({ artist, title });
        const r = await fetch(`/api/lyrics/curated?${q}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'x-auth-token': token } : {}) },
            body: JSON.stringify({ lrclibId })
        });
        console.log('[curated] Response:', r.status, r.ok);
        return r.ok;
    } catch (e) {
        console.error('[curated] Error:', e);
        return false;
    }
}

function applyLyricsPick(item, manual = false) {
    if (!audio) return;
    const t = tracks.find(tr => tr.id === lyricsTrackId);
    if (!t) return;

    const plTitle = document.getElementById('lyrics-panel-title');
    const cardTitle = document.getElementById('exp-lyrics-card-title');
    const desktopTitle = document.getElementById('exp-desktop-lyrics-title');

    if (item.syncedLyrics) {
        syncedLyrics = parseLRC(item.syncedLyrics);
        plainLyrics = item.plainLyrics || '';
        renderSyncedLyrics();
        updateSyncedLyricsState(true);
        if (plTitle) plTitle.textContent = 'Lyrics';
        if (cardTitle) cardTitle.textContent = 'Lyrics';
        if (desktopTitle) desktopTitle.textContent = 'Lyrics';
    } else if (item.plainLyrics) {
        syncedLyrics = [];
        plainLyrics = item.plainLyrics;
        renderPlainLyrics();
        if (expLyricCur) expLyricCur.innerHTML = '<span style="font-size:11px;font-weight:400;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">No synced lyrics available</span>';
        if (plTitle) plTitle.textContent = 'Lyrics';
        if (cardTitle) cardTitle.textContent = 'Lyrics';
        if (desktopTitle) desktopTitle.textContent = 'Lyrics';
    }

    saveLyricsPick(lyricsTrackId, { id: item.id, trackName: item.trackName, artistName: item.artistName, albumName: item.albumName });

    // Only save to curated KV when user manually picks (not when loading from curated)
    if (manual) {
        saveCuratedPick(t.artist || '', t.title || '', item.id);
    }
}

function closeLyricsPicker() {
    lyricsPickerOpen = false;
    if (lyricsPickerBtn) lyricsPickerBtn.classList.remove('open');
    if (lyricsPickerDropdown) {
        lyricsPickerDropdown.classList.remove('open');
        lyricsPickerDropdown.innerHTML = '';
    }
}

async function openLyricsPicker() {
    if (lyricsPickerOpen) { closeLyricsPicker(); return; }
    lyricsPickerOpen = true;
    if (lyricsPickerBtn) lyricsPickerBtn.classList.add('open');
    if (!lyricsPickerDropdown) return;

    lyricsPickerDropdown.innerHTML = '<div class="lyrics-picker-loading">Searching\u2026</div>';
    lyricsPickerDropdown.classList.add('open');

    const t = tracks.find(tr => tr.id === lyricsTrackId);
    if (!t) { closeLyricsPicker(); return; }

    try {
        const cleanTitle = (t.title || '').replace(/^\d{1,3}[\s.\-_]+/, '').trim();
        const q = new URLSearchParams({ title: cleanTitle, artist: t.artist || '' });
        const r = await fetch(`/api/lyrics/search?${q}`, { headers: token ? { 'x-auth-token': token } : {} });
        if (!r.ok) throw new Error('search failed');
        const items = await r.json();

        if (!lyricsPickerOpen) return; // closed while fetching

        if (!items.length) {
            lyricsPickerDropdown.innerHTML = '<div class="lyrics-picker-empty">No results found</div>';
            return;
        }

        const savedPick = getSavedLyricsPick(lyricsTrackId);
        lyricsPickerDropdown.innerHTML = items.map(item => {
            const badges = [];
            if (item.hasSynced) badges.push('<span class="lyrics-picker-item-badge synced">synced</span>');
            else if (item.hasPlain) badges.push('<span class="lyrics-picker-item-badge">plain</span>');
            else badges.push('<span class="lyrics-picker-item-badge">none</span>');
            if (item.instrumental) badges.push('<span class="lyrics-picker-item-badge">instr.</span>');

            const duration = item.duration ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}` : '';
            const isSelected = savedPick && savedPick.id === item.id;
            const name = `${item.trackName || ''} \u00B7 ${item.artistName || 'Unknown'}`;

            return `<div class="lyrics-picker-item${isSelected ? ' selected' : ''}" data-pick-id="${item.id}">
                <div class="lyrics-picker-item-name">${escHtml(name)}</div>
                <div class="lyrics-picker-item-meta">
                    ${item.albumName ? `<span>${escHtml(item.albumName)}</span>` : ''}
                    ${duration ? `<span>${duration}</span>` : ''}
                    ${badges.join('')}
                </div>
            </div>`;
        }).join('');

        lyricsPickerDropdown.querySelectorAll('.lyrics-picker-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.pickId);
                const item = items.find(i => i.id === id);
                if (item) applyLyricsPick(item, true); // manual pick
                closeLyricsPicker();
            });
        });
    } catch (_) {
        if (lyricsPickerOpen) {
            lyricsPickerDropdown.innerHTML = '<div class="lyrics-picker-empty">Search failed</div>';
        }
    }
}

function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

if (lyricsPickerBtn) {
    lyricsPickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLyricsPicker();
    });
}

// Close picker on outside click
document.addEventListener('click', (e) => {
    if (lyricsPickerOpen && !lyricsPickerDropdown?.contains(e.target)) {
        closeLyricsPicker();
    }
});

function parseLRC(lrc) {
    return lrc.split('\n').map(function (line) {
        var m = line.match(/^\[(\d+):(\d+\.\d+)\](.*)/);
        if (!m) return null;
        return { time: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text: m[3].trim() };
    }).filter(Boolean);
}

function renderSyncedLyrics() {
    invalidateLyricScrollCache();
    const targets = getLyricScrollEls();
    for (var i = 0; i < targets.length; i++) {
        var scroll = targets[i];
        if (!scroll) continue;
        scroll.innerHTML = '';
        for (var j = 0; j < syncedLyrics.length; j++) {
            var l = syncedLyrics[j];
            var div = document.createElement('div');
            div.className = 'lyric-line';
            div.textContent = l.text || '\u00b7';
            div.dataset.idx = j;
            div.onclick = (function (t) { return function () { if (audio) { seeking = true; audio.currentTime = t - lyricsOffset; updateSyncedLyricsState(true, t - lyricsOffset); } }; })(l.time);
            scroll.appendChild(div);
        }
    }
    applyLyricsFontSize();
}

function renderPlainLyrics() {
    invalidateLyricScrollCache();
    const targets = getLyricScrollEls();
    for (var i = 0; i < targets.length; i++) {
        var scroll = targets[i];
        if (!scroll) continue;
        scroll.innerHTML = '';
        var lines = plainLyrics.split('\n');
        for (var j = 0; j < lines.length; j++) {
            var div = document.createElement('div');
            div.className = 'lyric-line';
            div.textContent = lines[j] || ' ';
            scroll.appendChild(div);
        }
    }
    applyLyricsFontSize();
}

let lastExpLyricIdx = -1;
function updateSyncedLyricsState(force = false, atTime = null) {
    if (!audio) return;
    if (!syncedLyrics.length) {
        // Don't overwrite if plain lyrics are loaded
        if (plainLyrics) return;
        // Don't overwrite loading indicator if lyrics are still being fetched
        const isLoading = expLyricCur && expLyricCur.querySelector('.loading-ring, .loading-dots');
        if (expLyricCur && !isLoading) {
            clearTimeout(lyricUpdateTimers.cur);
            expLyricCur.style.opacity = '0';
            lyricUpdateTimers.cur = setTimeout(() => { expLyricCur.innerHTML = '<span class="loading-dots"></span>'; expLyricCur.style.opacity = '1' }, 120);
        }
        if (expLyricNext) {
            clearTimeout(lyricUpdateTimers.next);
            expLyricNext.style.opacity = '0';
            lyricUpdateTimers.next = setTimeout(() => { expLyricNext.textContent = ''; expLyricNext.style.opacity = '1' }, 120);
        }
        return;
    }

    const FADE_LOOKAHEAD = (force || isMobile()) ? 0 : 0.12;
    const baseTime = atTime !== null ? atTime : (audio?.currentTime || 0);
    const t = baseTime + FADE_LOOKAHEAD + lyricsOffset;
    const idx = syncedLyrics.findIndex((l, i) => { const n = syncedLyrics[i + 1]; return t >= l.time && (!n || t < n.time) });
    if (!force && idx === lastExpLyricIdx) return;
    lastExpLyricIdx = idx;

    const curText = idx >= 0 ? (syncedLyrics[idx].text || '<span class="loading-dots"></span>') : '<span class="loading-dots"></span>';
    const nextText = idx >= 0 && syncedLyrics[idx + 1] ? (syncedLyrics[idx + 1].text || '·') : '';

    if (expLyricCur) {
        clearTimeout(lyricUpdateTimers.cur);
        if (force) {
            expLyricCur.innerHTML = curText; expLyricCur.style.opacity = '1'; expLyricCur.style.transform = 'translateY(0)';
        } else {
            expLyricCur.style.opacity = '0'; expLyricCur.style.transform = 'translateY(6px)';
            lyricUpdateTimers.cur = setTimeout(() => { expLyricCur.innerHTML = curText; expLyricCur.style.opacity = '1'; expLyricCur.style.transform = 'translateY(0)' }, 120);
        }
    }
    if (expLyricNext) {
        clearTimeout(lyricUpdateTimers.next);
        if (force) {
            expLyricNext.textContent = nextText; expLyricNext.style.opacity = '1'; expLyricNext.style.transform = 'translateY(0)';
        } else {
            expLyricNext.style.opacity = '0'; expLyricNext.style.transform = 'translateY(6px)';
            lyricUpdateTimers.next = setTimeout(() => { expLyricNext.textContent = nextText; expLyricNext.style.opacity = '1'; expLyricNext.style.transform = 'translateY(0)' }, 120);
        }
    }

    getLyricScrollEls().forEach(scroll => {
        const oldActive = scroll.querySelector('.lyric-line.active');

        let shouldScroll = force;
        if (!force && oldActive) {
            const elTop = oldActive.offsetTop;
            const elBottom = elTop + oldActive.offsetHeight;
            const scrollTop = scroll.scrollTop;
            const scrollBottom = scrollTop + scroll.clientHeight;
            if (elBottom >= scrollTop && elTop <= scrollBottom) {
                shouldScroll = true;
            }
        } else if (!force && !oldActive) {
            shouldScroll = true;
        }

        if (oldActive) oldActive.classList.remove('active');

        if (idx >= 0) {
            const el = scroll.querySelector(`[data-idx="${idx}"]`);
            if (el) {
                el.classList.add('active');
                if (shouldScroll) {
                    const top = el.offsetTop - scroll.clientHeight / 2 + el.offsetHeight / 2;
                    scroll.scrollTo({ top: Math.max(0, top), behavior: force ? 'auto' : 'smooth' });
                }
            }
        }
    });
}

if (audio) {
    audio.addEventListener('timeupdate', () => {
        const sec = Math.floor(audio.currentTime);
        if (sec > 0 && sec % 5 === 0 && sec !== lastSavedSec) {
            lastSavedSec = sec;
            localStorage.setItem('music_pos', audio.currentTime);
        }
        const d = getRealDuration();
        if (!seeking && d) {
            const pct = (audio.currentTime / d) * 100;
            if (progress) progress.value = pct;
            if (expProgress) expProgress.value = pct;
            if (timeCur) timeCur.textContent = fmt(audio.currentTime);
            if (expTimeCur) expTimeCur.textContent = fmt(audio.currentTime);
        }
        updateSyncedLyricsState();
    });
}

function escAttr(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function openEditMetadataModal(t) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3>Edit Metadata</h3>
            <input id="edit-title" value="${escAttr(t.title)}" placeholder="Title" />
            <input id="edit-artist" value="${escAttr(t.artist)}" placeholder="Artist" />
            <input id="edit-album" value="${escAttr(t.album)}" placeholder="Album" />
            <div class="modal-btns">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.btn-cancel').onclick = () => modal.remove();
    modal.querySelector('.btn-confirm').onclick = async () => {
        const title = document.getElementById('edit-title').value;
        const artist = document.getElementById('edit-artist').value;
        const album = document.getElementById('edit-album').value;
        showToast('Saving...');
        try {
            await fetch('/api/tracks', {
                method: 'PUT',
                headers: hdrs(),
                body: JSON.stringify({ key: t.key, title, artist, album, duration: t.duration })
            });
            t.title = title; t.artist = artist; t.album = album;
            renderList();
            libraryCardsBuilt = false;
            renderLibraryCards();
            modal.remove();
            showToast('Metadata updated!');
            if (queue[qIdx]?.id === t.id) updateMediaSession(t);
        } catch (e) {
            console.error('Update error:', e);
            showToast('Save failed');
        }
    };
}

const _dominantColorCache = new Map();
function getDominantColor(img) {
    const key = img.src || img.currentSrc;
    if (key && _dominantColorCache.has(key)) return _dominantColorCache.get(key);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    // Bucket pixels by hue (12 buckets of 30°)
    const BUCKETS = 12;
    const buckets = Array.from({ length: BUCKETS }, () => ({ r: 0, g: 0, b: 0, count: 0 }));
    let fallR = 0, fallG = 0, fallB = 0, fallCount = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const delta = max - min;
        const lightness = (max + min) / 2;

        // Skip very dark, very bright, or desaturated pixels
        if (lightness < 20 || lightness > 240 || delta < 25) continue;

        let hue = 0;
        if (delta > 0) {
            if (max === r) hue = ((g - b) / delta + 6) % 6;
            else if (max === g) hue = (b - r) / delta + 2;
            else hue = (r - g) / delta + 4;
        }
        const bucketIdx = Math.min(Math.floor(hue / 6 * BUCKETS), BUCKETS - 1);
        buckets[bucketIdx].r += r;
        buckets[bucketIdx].g += g;
        buckets[bucketIdx].b += b;
        buckets[bucketIdx].count++;

        fallR += r; fallG += g; fallB += b; fallCount++;
    }

    let bestR, bestG, bestB;
    const best = buckets.reduce((a, b) => b.count > a.count ? b : a, buckets[0]);

    if (best.count > 0) {
        bestR = Math.round(best.r / best.count);
        bestG = Math.round(best.g / best.count);
        bestB = Math.round(best.b / best.count);
    } else if (fallCount > 0) {
        bestR = Math.round(fallR / fallCount);
        bestG = Math.round(fallG / fallCount);
        bestB = Math.round(fallB / fallCount);
    } else {
        // Completely uniform image — just average everything
        let tr = 0, tg = 0, tb = 0, tc = data.length / 4;
        for (let i = 0; i < data.length; i += 4) { tr += data[i]; tg += data[i + 1]; tb += data[i + 2]; }
        bestR = Math.round(tr / tc); bestG = Math.round(tg / tc); bestB = Math.round(tb / tc);
    }

    // Adaptive darkening based on luminance (darker colors get less darkening)
    const lum = (0.299 * bestR + 0.587 * bestG + 0.114 * bestB) / 255;
    const factor = 0.25 + lum * 0.25; // range: 0.25 (dark art) → 0.50 (bright art)
    const result = `rgb(${Math.round(bestR * factor)}, ${Math.round(bestG * factor)}, ${Math.round(bestB * factor)})`;

    if (key) _dominantColorCache.set(key, result);
    return result;
}

async function updateAdaptiveBackground() {
    if (!adaptiveMode || !playerExpanded || !expCover || expCover.style.display === 'none') {
        if (expPlayer) {
            expPlayer.classList.remove('adaptive');
            expPlayer.style.background = '';  // clear inline override
        }
        updateStatusBar();
        return;
    }

    const imgEl = expCover.tagName === 'IMG' ? expCover : expCover.querySelector('img');
    if (!imgEl) return;

    const apply = () => {
        if (!adaptiveMode) return;
        try {
            const color = getDominantColor(imgEl);
            expPlayer.style.setProperty('--adaptive-color', color);
            expPlayer.style.background = `linear-gradient(${color} 0%, var(--bg) 80%)`;
            expPlayer.classList.add('adaptive');
            updateStatusBar(color);
        } catch (e) { /* tainted canvas, skip */ }
    };

    if (imgEl.complete && imgEl.naturalWidth !== 0) {
        apply();
    } else {
        imgEl.addEventListener('load', apply, { once: true });
    }
}

if (expAdaptiveBtn) {
    expAdaptiveBtn.classList.toggle('active', adaptiveMode);
    expAdaptiveBtn.onclick = () => {
        adaptiveMode = !adaptiveMode;
        localStorage.setItem('adaptive_mode', adaptiveMode);
        expAdaptiveBtn.classList.toggle('active', adaptiveMode);
        updateAdaptiveBackground();
    };
}

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        if (!audio) return;

        if (audio.duration && audio.currentTime > 0 && !audio.paused) {
            const remaining = audio.duration - audio.currentTime;
            if (remaining < 0.5) {
                nextTrack();
                return;
            }
        }

        if (!audio.paused && audio.readyState >= 3) {
            const currentTime = audio.currentTime;
            if (currentTime > 0 && Math.abs(currentTime - lastHeartbeatPos) < 0.05) {
                audio.play().catch(() => { });
            }
            lastHeartbeatPos = currentTime;
        }
    }, 750);
}

async function uploadTrack(file) {
    if (!token) { showAuth(); return; }
    const formData = new FormData();
    formData.append('file', file);
    showToast(`Uploading ${file.name}...`);
    try {
        const r = await fetch('/api/tracks', {
            method: 'POST',
            headers: { 'x-auth-token': token },
            body: formData
        });
        if (r.ok) {
            showToast(`Uploaded ${file.name} successfully!`);
            loadTracks();
        } else {
            const err = await r.json();
            showToast(`Upload failed: ${err.error || 'Unknown error'}`);
        }
    } catch (e) {
        console.error('Upload error:', e);
        showToast('Upload failed. Check console.');
    }
}

function handleDrop(e) {
    e.preventDefault();
    if (dropZone) dropZone.classList.remove('active');
    const files = Array.from(e.dataTransfer.files).filter(f =>
        f.type.startsWith('audio/') ||
        f.name.endsWith('.mp3') || f.name.endsWith('.flac') ||
        f.name.endsWith('.m4a') || f.name.endsWith('.ogg') ||
        f.name.endsWith('.wav') || f.name.endsWith('.opus')
    );
    if (files.length > 0) files.forEach(uploadTrack);
}

window.addEventListener('dragover', e => {
    e.preventDefault();
    if (dropZone && !document.body.classList.contains('menu-open')) dropZone.classList.add('active');
});
window.addEventListener('dragleave', e => {
    if (e.relatedTarget === null) {
        if (dropZone) dropZone.classList.remove('active');
    }
});
window.addEventListener('drop', handleDrop);

async function init() {
    // Set high-priority audio category for iOS (Crucial for PWA background stability)
    if (navigator.audioSession) {
        try {
            navigator.audioSession.type = 'playback';
        } catch (e) { console.error('[AudioSession] Failed to set type:', e); }
    }

    cleanup();
    if (searchEl && !searchListener) {
        searchListener = debounce(applyFilter, 120);
        searchEl.addEventListener('input', searchListener);
    }
    const sidebarSearchEl = document.getElementById('sidebar-search');
    if (sidebarSearchEl && !sidebarSearchEl._listenerAttached) {
        sidebarSearchEl._listenerAttached = true;
        sidebarSearchEl.addEventListener('input', debounce(() => {
            if (searchEl) searchEl.value = sidebarSearchEl.value;
            applyFilter();
        }, 120));
    }

    if (isMobile()) {
        const mainEl = document.getElementById('main');
        const headerTitle = document.getElementById('header-title');
        const searchWrap = document.getElementById('search-wrap');
        const headerEl = document.getElementById('header');

        if (mainEl && headerTitle && headerEl) {
            const updatePadding = () => {
                const wasCollapsed = headerEl.classList.contains('collapsed');

                if (wasCollapsed) {
                    headerEl.classList.remove('collapsed');
                    if (searchWrap) searchWrap.classList.remove('hidden');
                    headerTitle.classList.remove('collapsed');
                }

                const fullH = headerEl.offsetHeight;
                mainEl.style.paddingTop = fullH + 'px';

                const shrinkAmount = 10 + (searchWrap ? 60 : 0);
                const collapsedH = fullH - shrinkAmount;

                if (wasCollapsed) {
                    headerEl.classList.add('collapsed');
                    if (searchWrap) searchWrap.classList.add('hidden');
                    headerTitle.classList.add('collapsed');
                }

                mainEl.style.setProperty('--header-full', fullH + 'px');
                mainEl.style.setProperty('--header-collapsed', collapsedH + 'px');
                mainEl.style.setProperty('--header-h', wasCollapsed ? collapsedH + 'px' : fullH + 'px');
            };

            requestAnimationFrame(updatePadding);

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((m) => {
                    if (m.attributeName === 'class') updatePadding();
                });
            });
            observer.observe(document.body, { attributes: true });

            mainEl.addEventListener('scroll', () => {
                const scrolled = mainEl.scrollTop > 40;
                headerTitle.classList.toggle('collapsed', scrolled);
                headerEl.classList.toggle('collapsed', scrolled);
                if (searchWrap) searchWrap.classList.toggle('hidden', scrolled);
                mainEl.style.setProperty('--header-h', scrolled ? 'var(--header-collapsed)' : 'var(--header-full)');
            }, { passive: true });
        }
    }

    setTokenCookie(token);
    if (queuePanel && !isMobile()) queuePanel.style.height = queueH + 'px';
    if (queuePanel) queuePanel.classList.remove('open');
    if (btnShuffle) btnShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
    if (expShuffle) expShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
    applyRepeat();
    if (volumeSlider) volumeSlider.value = SAVED_VOL;
    if (expVolumeSlider) expVolumeSlider.value = SAVED_VOL;
    const sv = SAVED_VOL / 100;
    if (audio) applyVolume(Math.pow(sv, 3));
    if (volumeIcon) volumeIcon.innerHTML = sv === 0 ? volIcons.muted : sv < 0.5 ? volIcons.low : volIcons.high;
    if (expVolumeIcon) expVolumeIcon.innerHTML = sv === 0 ? volIcons.muted : sv < 0.5 ? volIcons.low : volIcons.high;

    await Promise.all([loadTracks(), loadPlaylists()]);

    try {
        const last = JSON.parse(localStorage.getItem('music_last') || 'null');
        const pos = parseFloat(localStorage.getItem('music_pos') || '0');
        const savedQueueIds = JSON.parse(localStorage.getItem('music_queue') || '[]');
        const savedQIdx = parseInt(localStorage.getItem('music_qidx') || '0');

        if (last && last.id) {
            const t = tracks.find(x => x.id === last.id) || last;
            if (savedQueueIds.length) {
                queue = savedQueueIds.map(id => tracks.find(x => x.id === id)).filter(Boolean);
                qIdx = Math.min(savedQIdx, queue.length - 1);
                if (!queue.length) { queue = [t]; qIdx = 0; }
            } else {
                queue = [t]; qIdx = 0;
            }
            if (player) { player.classList.remove('hidden'); updatePlayerHeight(); }

            updatePlayerMetadata(t);

            const pt = document.getElementById('player-thumb');
            if (pt) { pt.src = FALLBACK; loadCover(t.id, pt); }
            document.title = (t.title || '?') + ' \u00B7 ' + (t.artist || '?');

            // Immediately populate duration/scrubber UI from saved data
            const savedDur = t.duration || 0;
            if (savedDur > 0) {
                if (timeTot) timeTot.textContent = fmt(savedDur);
                if (expTimeTot) expTimeTot.textContent = fmt(savedDur);
                if (pos > 0 && pos < savedDur) {
                    const pct = (pos / savedDur) * 100;
                    if (progress) progress.value = pct;
                    if (expProgress) expProgress.value = pct;
                    if (timeCur) timeCur.textContent = fmt(pos);
                    if (expTimeCur) expTimeCur.textContent = fmt(pos);
                }
            }

            updateExpandedNowPlaying(t);
            loadLyrics(t);

            if (audio) {
                audio.preload = 'auto';
                audio.src = '/api/stream/' + t.id;
                audio.load();

                // Set media session after audio.src so iOS has a valid audio context
                updateMediaSession(t);

                let restored = false;
                const restorePos = () => {
                    if (restored) return;
                    if (!audio.src.includes(t.id)) {
                        cleanupRestore();
                        return;
                    }
                    const d = (audio.duration && isFinite(audio.duration)) ? audio.duration : (t.duration || 0);
                    if (pos > 0 && d && pos < d - 5) {
                        try { audio.currentTime = pos; } catch (e) { }
                    }
                    restored = true;
                    cleanupRestore();
                };
                const cleanupRestore = () => {
                    audio.removeEventListener('playing', restorePos);
                };
                audio.addEventListener('playing', restorePos);
            } else {
                updateMediaSession(t);
            }
        }
    } catch (_) { }
}

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const trackRow = e.target.closest('.track');
    if (trackRow) {
        const trackId = trackRow.dataset.id;
        const trackData = tracks.find(x => x.id === trackId);
        if (trackData) openCtxMenu(e, trackData);
    } else {
        closeCtxMenu();
    }
});

document.addEventListener('mouseup', () => { isSelecting = false; });

window.addEventListener('beforeunload', cleanup);

// AFTER
let wasPlayingBeforeHidden = false;
let _pendingBackgroundPlay = false;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        wasPlayingBeforeHidden = audio && !audio.paused;
        return;
    }

    // Recover if play was triggered from lock screen but audio didn't actually start
    if (_pendingBackgroundPlay && audio && audio.paused && audio.src) {
        const pos = parseFloat(localStorage.getItem('music_pos') || '0');
        audio.play().catch(() => {
            // Pipeline is dead — reload and restore
            const src = audio.src;
            audio.src = src;
            audio.load();
            if (pos > 0) {
                audio.addEventListener('loadedmetadata', () => {
                    audio.currentTime = pos;
                }, { once: true });
            }
            audio.play().catch(e => console.error('Recovery after foreground failed:', e));
        });
    }
    _pendingBackgroundPlay = false;

    if (wasPlayingBeforeHidden && audio && audio.paused && audio.src) {
        audio.play().catch(e => console.error('Resume after visibility change failed:', e));
    }
    wasPlayingBeforeHidden = false;

    if (audio && !audio.paused) startHeartbeat();

    if ('mediaSession' in navigator && audio) {
        navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
    }

    const ep = document.getElementById('expanded-player');
    if (ep && !ep.classList.contains('open')) {
        ep.style.transition = 'none';
        ep.style.transform = 'translateY(110%)';
        ep.style.visibility = 'hidden';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                ep.style.transition = '';
                ep.style.transform = '';
                ep.style.visibility = '';
            });
        });
    }
});

document.addEventListener('freeze', () => {
    wasPlayingBeforeHidden = audio && !audio.paused;
});

document.addEventListener('resume', () => {
    if (wasPlayingBeforeHidden && audio && audio.paused && audio.src) {
        audio.play().catch(e => console.error('Resume after freeze failed:', e));
    }
    wasPlayingBeforeHidden = false;
    if (audio && !audio.paused) startHeartbeat();
});

window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return; // only care about BFCache restores
    if (wasPlayingBeforeHidden && audio && audio.paused && audio.src) {
        audio.play().catch(e => console.error('Resume after BFCache restore failed:', e));
    }
    if (audio && !audio.paused) startHeartbeat();
});

// Service Worker registration with deferred updates
const APP_VERSION = '2026.04.24'; // Bump this when deploying to verify update worked
let swRegistration = null;

console.log('[App] Version:', APP_VERSION);

function activateUpdate() {
    if (!swRegistration?.waiting) {
        console.log('[SW] No update waiting');
        return;
    }
    console.log('[SW] Activating update...');
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

window.getSWStatus = function () {
    if (!swRegistration) return { error: 'No SW registration' };
    return {
        appVersion: APP_VERSION,
        swScope: swRegistration.scope,
        installing: swRegistration.installing ? true : false,
        waiting: swRegistration.waiting ? true : false,
        active: swRegistration.active ? true : false,
        updatePending: !!swRegistration.waiting
    };
};

function showUpdateUI() {
    // Desktop: show in sidebar
    const sidebarUpdate = document.getElementById('sidebar-update');
    if (sidebarUpdate) sidebarUpdate.style.display = 'flex';

    // Mobile: persistent toast notification
    if (isMobile()) {
        let t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.style.cssText = 'position:fixed;bottom:calc(var(--player-h) + 16px);left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:8px 16px;border-radius:8px;font-size:13px;z-index:500;transition:opacity .3s;max-width:calc(100vw - 32px);cursor:pointer';
            document.body.appendChild(t);
        }
        t.textContent = 'tap to update ↻';
        t.style.opacity = '1';
        t.onclick = () => {
            activateUpdate();
            t.onclick = null;
        };
        // Don't auto-hide this toast — stays until clicked or page reload
        clearTimeout(t._t);
    }
}

function hideUpdateUI() {
    const sidebarUpdate = document.getElementById('sidebar-update');
    if (sidebarUpdate) sidebarUpdate.style.display = 'none';
}

async function checkForUpdate() {
    if (!swRegistration) return;
    await swRegistration.update();

    if (swRegistration.waiting) {
        showUpdateUI();
    } else {
        showToast('No updates available');
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            swRegistration = reg;
            console.log('[SW] Registered, scope:', reg.scope);
            console.log('[SW] Status:', window.getSWStatus());

            // Poll for updates every 60s (important for Safari)
            setInterval(() => {
                console.log('[SW] Checking for updates...');
                reg.update();
            }, 60000);

            // New SW found
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                console.log('[SW] Update found, installing...');
                newWorker.addEventListener('statechange', () => {
                    console.log('[SW] Worker state:', newWorker.state);
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[SW] Update ready — showing UI');
                        showUpdateUI();
                    }
                });
            });

            // SW was already waiting when page loaded
            if (reg.waiting && navigator.serviceWorker.controller) {
                console.log('[SW] Update was already waiting');
                showUpdateUI();
            }
        }).catch(err => console.error('[SW] Registration failed:', err));

        // Reload when new SW takes control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[SW] New controller, reloading...');
            window.location.reload();
        });
    });
}

(async () => { const ok = await checkAuth(); if (ok) init() })();