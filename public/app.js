import * as Navidrome from './navidrome.js';

let resizeObserver = null;
let searchListener = null;
let authKeydownListener = null;
let globalClickListener = null;
let _coverObserver = null;
let _artistImgObserver = null;

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
    if (suggestedCardsInterval) {
        clearInterval(suggestedCardsInterval);
        suggestedCardsInterval = null;
    }
}

const mobileQuery = window.matchMedia('(max-width:768px)');
const isMobile = () => mobileQuery.matches;
const coarseQuery = window.matchMedia('(pointer: coarse)');

function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) };
}

function triggerHaptic(type) {
    const Haptics = window.Capacitor?.Plugins?.Haptics;
    if (!Haptics) return;
    try {
        switch (type) {
            case 'IMPACT_LIGHT':
                Haptics.impact({ style: 'LIGHT' });
                break;
            case 'IMPACT_MEDIUM':
                Haptics.impact({ style: 'MEDIUM' });
                break;
            case 'IMPACT_HEAVY':
                Haptics.impact({ style: 'HEAVY' });
                break;
            case 'SELECTION_START':
                Haptics.selectionStart();
                break;
            case 'SELECTION_CHANGED':
                Haptics.selectionChanged();
                break;
            case 'SELECTION_END':
                Haptics.selectionEnd();
                break;
            case 'SUCCESS':
                Haptics.notification({ type: 'SUCCESS' });
                break;
            case 'WARNING':
                Haptics.notification({ type: 'WARNING' });
                break;
            case 'ERROR':
                Haptics.notification({ type: 'ERROR' });
                break;
        }
    } catch (e) {
        console.error('[Haptics] Failed to trigger:', e);
    }
}

const TOKEN_KEY = 'music_token';
let token = localStorage.getItem(TOKEN_KEY) || '';
setTokenCookie(token);
let tracks = [], trackMap = new Map(), filtered = [], detailViewTracks = [], queue = [], qIdx = -1, sortMode = 'title';
let shuffle = localStorage.getItem('music_shuffle') === 'true', seeking = false, muted = false;
const SAVED_VOL = parseInt(localStorage.getItem('music_vol') || '80');
let lastVol = SAVED_VOL;
let playlists = [], currentPlaylist = null, ctxTrack = null, pendingPlaylistTrack = null;
let queueOpen = false, lyricsTrackId = null, lyricsOpen = false;
let isSelecting = false;
let toggleMode = true;
let lastSavedSec = -1;
let lyricUpdateTimers = { cur: null, next: null };
let playerExpanded = false;
let desktopExpandedLyricsOpen = false;
let suggestedCardsInterval = null;

let canvasMap = { tracks: {}, albums: {} };

function getCanvasMapKey(artist, name) {
    function clean(s) {
        if (!s) return '';
        s = s.toLowerCase().trim();
        s = s.replace(/\$/g, 's');
        return s.replace(/\s+/g, ' ');
    }
    return `${clean(artist)} - ${clean(name)}`;
}

function getCanvasForTrack(t) {
    if (!t) return null;
    const artist = t.artist || '';
    const title = t.title || '';
    const album = t.album || '';

    const trackKey = getCanvasMapKey(artist, title);
    const albumKey = getCanvasMapKey(artist, album);

    let path = null;
    if (canvasMap.tracks && canvasMap.tracks[trackKey]) {
        path = `/api/canvas?key=${encodeURIComponent(canvasMap.tracks[trackKey])}`;
    } else if (canvasMap.albums && canvasMap.albums[albumKey]) {
        path = `/api/canvas?key=${encodeURIComponent(canvasMap.albums[albumKey])}`;
    }

    if (path) {
        if (token) {
            path += `&token=${encodeURIComponent(token)}`;
        }
        return new URL(path, window.location.origin).href;
    }
    return null;
}

async function loadCanvasMap() {
    try {
        const response = await fetch('/api/canvas-map', { headers: hget() });
        if (response.ok) {
            canvasMap = await response.json();
            console.log('[Canvas] Loaded canvas map:', canvasMap);
        }
    } catch (e) {
        console.error('[Canvas] Failed to load canvas map', e);
    }
}

function setTokenCookie(t) {
    if (t) document.cookie = `music_token=${encodeURIComponent(t)}; path=/; max-age=31536000; SameSite=Lax; Secure`;
}

const saveQueueState = debounce(() => {
    localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
    localStorage.setItem('music_qidx', qIdx);
}, 300);

function renderArtistAlbumSub(parentEl, t, viewType) {
    if (!parentEl) return;
    parentEl.innerHTML = '';

    const artist = t.artist;
    const album = viewType === 'suggested' ? null : t.album;

    if (!artist && !album) {
        parentEl.textContent = '—';
        return;
    }

    const isTouchScreen = coarseQuery.matches;
    const isInteractionDisabled = isTouchScreen && (viewType !== 'player' && viewType !== 'expanded-player');

    let targetEl = parentEl;
    if (viewType === 'player' && parentEl.id === 'player-artist') {
        const marqueeInner = document.createElement('span');
        marqueeInner.className = 'marquee-inner';
        parentEl.appendChild(marqueeInner);
        targetEl = marqueeInner;
    }

    if (artist) {
        const artistSpan = document.createElement('span');
        artistSpan.className = 'interactive-artist';
        artistSpan.textContent = artist;
        if (!isInteractionDisabled) {
            artistSpan.classList.add('interactable');
            artistSpan.onclick = (e) => {
                e.stopPropagation();
                saveScroll();
                if (typeof closeExpandedPlayer === 'function') closeExpandedPlayer();
                closeCtxMenu();
                openArtistDetail(artist);
            };
        }
        targetEl.appendChild(artistSpan);
    }

    if (artist && album) {
        const dotSpan = document.createElement('span');
        dotSpan.className = 'interactive-separator';
        dotSpan.textContent = ' \u00B7 ';
        targetEl.appendChild(dotSpan);
    }

    if (album) {
        const albumSpan = document.createElement('span');
        albumSpan.className = 'interactive-album';
        albumSpan.textContent = album;
        if (!isInteractionDisabled) {
            albumSpan.classList.add('interactable');
            albumSpan.onclick = (e) => {
                e.stopPropagation();
                saveScroll();
                if (typeof closeExpandedPlayer === 'function') closeExpandedPlayer();
                closeCtxMenu();
                openAlbumDetail(album);
            };
        }
        targetEl.appendChild(albumSpan);
    }
}

function updatePlayerMetadata(t) {
    const plTitle = document.getElementById('player-title');
    const plArtist = document.getElementById('player-artist');
    const mobTitle = document.querySelector('#player-meta-mobile .title');
    const mobArtist = document.querySelector('#player-meta-mobile .artist');
    const fullTitle = t.title || 'Unknown';
    if (plTitle) {
        plTitle.innerHTML = '';
        const inner = document.createElement('span');
        inner.className = 'marquee-inner';
        inner.textContent = fullTitle;
        plTitle.appendChild(inner);
        setTimeout(() => adjustMarquee(plTitle), 50);
        setTimeout(() => adjustMarquee(plTitle), 400);
    }
    if (mobTitle) mobTitle.textContent = fullTitle;
    renderArtistAlbumSub(plArtist, t, 'player');
    if (plArtist) {
        setTimeout(() => adjustMarquee(plArtist), 50);
        setTimeout(() => adjustMarquee(plArtist), 400);
    }
    renderArtistAlbumSub(mobArtist, t, 'player');
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

    const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
    if (plugin && typeof plugin.updateLyrics === 'function') {
        let displayCur = curMsg;
        if (curMsg === '\u2026') displayCur = 'Loading lyrics...';
        else if (!curMsg) displayCur = msg;

        plugin.updateLyrics({ current: displayCur || '', next: '', all: [] });
    }
}

class CapacitorAudioPlayerShim {
    constructor() {
        this._src = '';
        this._volume = 1.0;
        this._currentTime = 0;
        this._duration = 0;
        this._paused = true;
        this.listeners = {};
        this._metadata = null;
        this._lastSyncTime = 0;
        this._lastNativeTime = 0;
        this._tickInterval = null;

        const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
        if (plugin) {
            plugin.addListener('ready', (data) => {
                this._duration = data.duration;
                this.dispatchEvent('loadedmetadata');
                this.dispatchEvent('durationchange');
            });
            plugin.addListener('timeupdate', (data) => {
                this._currentTime = data.currentTime;
                this._lastNativeTime = data.currentTime;
                this._lastSyncTime = performance.now();
                this.dispatchEvent('timeupdate');
            });
            plugin.addListener('ended', () => {
                this._paused = true;
                this.stopJSProgressTicks();
                this.dispatchEvent('ended');
            });
            plugin.addListener('play', () => {
                this._paused = false;
                this._lastSyncTime = performance.now();
                this._lastNativeTime = this._currentTime;
                this.dispatchEvent('play');
                this.dispatchEvent('playing');
                this.startJSProgressTicks();
            });
            plugin.addListener('pause', () => {
                this._currentTime = this.currentTime;
                this._paused = true;
                this.stopJSProgressTicks();
                this.dispatchEvent('pause');
            });
            plugin.addListener('seeked', (data) => {
                this._currentTime = data.currentTime;
                this._lastNativeTime = data.currentTime;
                this._lastSyncTime = performance.now();
                this.dispatchEvent('seeked');
            });
            plugin.addListener('nextTrack', () => {
                if (typeof nextTrack === 'function') {
                    nextTrack();
                }
            });
            plugin.addListener('previousTrack', () => {
                if (typeof prevTrack === 'function') {
                    prevTrack();
                }
            });
            plugin.addListener('trackAdvancedNatively', () => {
                this._currentTime = 0;
                this._lastNativeTime = 0;
                this._lastSyncTime = performance.now();
                this.dispatchEvent('trackAdvancedNatively');
            });
        }
    }

    startJSProgressTicks() {
        this.stopJSProgressTicks();
        this._tickInterval = setInterval(() => {
            if (!this._paused) {
                this.dispatchEvent('timeupdate');
            }
        }, 100);
    }

    stopJSProgressTicks() {
        if (this._tickInterval) {
            clearInterval(this._tickInterval);
            this._tickInterval = null;
        }
    }

    setMetadata(meta) {
        this._metadata = meta;
    }

    syncSourceNatively(src, metadata) {
        this._src = src;
        this._metadata = metadata;
        this._currentTime = 0;
        this._lastNativeTime = 0;
        this._lastSyncTime = 0;
    }

    get src() { return this._src; }
    set src(val) {
        this._src = val;
        this._currentTime = 0;
        this._lastNativeTime = 0;
        this._lastSyncTime = 0;
        const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
        if (plugin) {
            plugin.initPlayer({
                url: val,
                title: this._metadata?.title || 'Unknown',
                artist: this._metadata?.artist || 'Unknown',
                album: this._metadata?.album || 'Unknown',
                coverUrl: this._metadata?.coverUrl || '',
                canvasUrl: getCanvasForTrack(this._metadata) || '',
                duration: this._metadata?.duration || 0,
                suffix: this._metadata?.suffix || 'flac',
                starred: !!this._metadata?.starred
            });
        }
    }

    load() {
    }

    play() {
        const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
        if (plugin) {
            return plugin.play();
        }
        return Promise.resolve();
    }

    pause() {
        const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
        if (plugin) {
            plugin.pause();
        }
    }

    get paused() { return this._paused; }

    get volume() { return this._volume; }
    set volume(val) {
        this._volume = val;
        const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
        if (plugin) {
            plugin.setVolume({ volume: val });
        }
    }

    get currentTime() {
        if (this._paused || this._lastSyncTime === 0) return this._currentTime;
        const now = performance.now();
        const elapsedSeconds = Math.min((now - this._lastSyncTime) / 1000, 1.5);
        const interpolated = this._lastNativeTime + elapsedSeconds;
        return this._duration > 0 ? Math.min(interpolated, this._duration) : interpolated;
    }
    set currentTime(val) {
        this._currentTime = val;
        this._lastNativeTime = val;
        this._lastSyncTime = performance.now();
        const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
        if (plugin) {
            plugin.seek({ to: val });
        }
    }

    get duration() { return this._duration; }

    get readyState() { return 4; }
    get error() { return null; }
    get preload() { return 'auto'; }
    set preload(val) { }

    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    removeEventListener(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    dispatchEvent(event) {
        const list = this.listeners[event];
        if (list) {
            list.forEach(cb => {
                try { cb(); } catch (e) { console.error("Event error:", event, e); }
            });
        }
    }
}

let audio;
if (window.Capacitor && window.Capacitor.getPlatform() === 'ios') {
    audio = new CapacitorAudioPlayerShim();
    document.body.classList.add('ios-native-shell');
    window.webkit?.messageHandlers?.jamNativeReady?.postMessage(null);
} else {
    audio = document.getElementById('audio');
    if (audio) audio.preload = 'auto';
}
const player = document.getElementById('player');
const trackList = document.getElementById('track-list');
const loading = document.getElementById('loading');
const empty = document.getElementById('empty');
const searchEl = document.getElementById('search');
const sortBtn = document.getElementById('sort-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeMenu = document.getElementById('theme-menu');
const settingsToggle = document.getElementById('settings-toggle');
const settingsMenu = document.getElementById('settings-menu');
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
const expDesktopCollapse = document.getElementById('desktop-exp-collapse');
const expContent = document.getElementById('exp-content');
const expCover = document.getElementById('exp-cover');
const expCanvas = document.getElementById('exp-canvas');
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
const expHeartBtn = document.getElementById('exp-heart-btn');
const expAdaptiveBtn = document.getElementById('exp-adaptive-btn');
const expDesktopLyricsPanel = document.getElementById('exp-desktop-lyrics-panel');
const expDesktopLyricsScroll = document.getElementById('exp-desktop-lyrics-scroll');
const menuBackdrop = document.getElementById('menu-backdrop');

let adaptiveMode = localStorage.getItem('adaptive_mode') === 'true';
let canvasDisabled = localStorage.getItem('canvas_disabled') === 'true';

const SMART_PLAYLISTS = [
    { id: 'smart:favorites', name: 'Favorites', image: '', tracks: [] },
    { id: 'smart:recent', name: 'Recently Played', image: '', tracks: [] },
    { id: 'smart:newest', name: 'Recently Added', image: '', tracks: [] },
    { id: 'smart:random', name: 'Discover', image: '', tracks: [] }
];

function updateHeartUI(starred) {
    if (!expHeartBtn) return;
    const svg = expHeartBtn.querySelector('svg');
    if (svg) {
        if (starred) {
            svg.setAttribute('fill', 'currentColor');
            expHeartBtn.style.color = 'var(--accent)';
        } else {
            svg.setAttribute('fill', 'none');
            expHeartBtn.style.color = 'var(--muted)';
        }
    }
}

function syncStarredStateNatively(starred) {
    if (window.Capacitor?.Plugins?.AudioPlayerPlugin) {
        window.Capacitor.Plugins.AudioPlayerPlugin.setPlaybackState({
            shuffle,
            repeatMode,
            starred: starred,
            canvasDisabled: canvasDisabled
        });
    }
}

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

let audioCtx = null;
let gainNode = null;

function applyVolume(vol) {
    if (gainNode) {
        gainNode.gain.value = vol;
        if (audio) { try { audio.volume = 1; } catch (e) { } }
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
    if (window.Capacitor && window.Capacitor.getPlatform() === 'ios') return;
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
    triggerHaptic('IMPACT_LIGHT');
    if (typeof saveScroll === 'function') saveScroll();
    const viewLibrary = document.getElementById('view-library');
    const viewPlaylists = document.getElementById('view-playlists');
    const sortBtn = document.getElementById('sort-btn');
    const themeToggle = document.getElementById('theme-toggle');

    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.sidebar-item[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.dock-item[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === name));

    if (viewLibrary) viewLibrary.classList.toggle('active', name === 'library');
    if (viewPlaylists) viewPlaylists.classList.toggle('active', name === 'playlists');

    if (sortBtn) sortBtn.style.display = name === 'library' ? '' : 'none';
    if (themeToggle) themeToggle.style.display = '';

    closeDetailView(true);

    currentPlaylist = null;
    if (playlistDetail) playlistDetail.classList.remove('active');
    if (playlistsListView) playlistsListView.style.display = '';

    if (name === 'playlists') loadPlaylists();
    if (typeof restoreScroll === 'function') restoreScroll();
}

document.querySelectorAll('.tab').forEach(tab => { tab.onclick = () => switchTab(tab.dataset.tab); });
document.querySelectorAll('.sidebar-item[data-tab]').forEach(item => { item.onclick = () => switchTab(item.dataset.tab); });
document.querySelectorAll('.dock-item[data-tab]').forEach(item => { item.onclick = () => switchTab(item.dataset.tab); });

window.onNativeTabSelected = function (tabName) {
    if (tabName === 'search') {
        switchTab('library');
    } else {
        switchTab(tabName);
    }
};

async function loadTracks(forceRefresh = false) {
    libraryCardsBuilt = false;
    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (trackList) trackList.innerHTML = '';
    try {
        tracks = await Navidrome.getTracks(forceRefresh);
        trackMap.clear();
        for (const t of tracks) trackMap.set(t.id, t);
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
        if (empty) {
            const swActive = !!navigator.serviceWorker?.controller;
            const capActive = !!window.Capacitor;
            const httpActive = !!window.Capacitor?.Plugins?.CapacitorHttp;
            empty.innerHTML = `No tracks found.<br><span style="font-size:10px;color:var(--danger);word-break:break-all">Error: ${e.message || e} (SW: ${swActive}, Cap: ${capActive}, Http: ${httpActive})</span>`;
            empty.style.display = 'flex';
        }
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

    if (_coverObserver) _coverObserver.disconnect();
    if (_artistImgObserver) _artistImgObserver.disconnect();

    _coverObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const card = entry.target;
            const id = card.dataset.artworkId;
            if (id) {
                const size = card.dataset.coverSize ? parseInt(card.dataset.coverSize, 10) : 200;
                const cacheKey = `${id}_${size}`;
                if (coverCacheHas(cacheKey) && coverCacheGet(cacheKey)) {
                    card.style.backgroundImage = `url(${coverCacheGet(cacheKey)})`;
                } else {
                    ensureCoverUrl(id, size).then(url => {
                        if (url) card.style.backgroundImage = `url(${url})`;
                    });
                }
            }
            _coverObserver.unobserve(card);
        });
    }, { rootMargin: '600px' });

    _artistImgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            const name = img.dataset.artistName;
            if (name) loadArtistImage(name, img);
            _artistImgObserver.unobserve(img);
        });
    }, { rootMargin: '200px' });

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
            if (data.artwork) _coverObserver.observe(card);
            _artistImgObserver.observe(artistImg);
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
            if (data.artwork) _coverObserver.observe(card);
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
            suggestedTracks = suggestedIds.map(id => trackMap.get(id)).filter(Boolean);
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
            if (t.id) {
                card.dataset.id = t.id;
                card.dataset.artworkId = t.id;
                card.dataset.coverSize = "600";
            }

            const overlay = document.createElement('div');
            const info = document.createElement('div');
            info.className = 'suggested-info';

            const titleLabel = document.createElement('div');
            titleLabel.className = 'suggested-title';
            titleLabel.textContent = t.title || 'Unknown';

            const artistLabel = document.createElement('div');
            artistLabel.className = 'suggested-artist';
            renderArtistAlbumSub(artistLabel, t, 'suggested');

            info.append(titleLabel, artistLabel);
            card.append(overlay, info);

            bindTapActivation(card, () => playTrack(t, tracks), {
                onLongPress: e => openCtxMenu({ clientX: e.clientX, clientY: e.clientY, stopPropagation() { } }, t)
            });
            fragS.appendChild(card);
            if (t.id) _coverObserver.observe(card);
        });
        suggestedContainer.appendChild(fragS);
    }

    if (suggestedContainer) {
        renderSuggestedCards();

        const checkAndRefresh = () => {
            const savedTime = localStorage.getItem('jam_suggested_time');
            if (savedTime && Date.now() - parseInt(savedTime) >= 3600000) {
                if (audio.paused && document.visibilityState === 'hidden') {
                    renderSuggestedCards(true);
                }
            }
        };

        suggestedCardsInterval = setInterval(checkAndRefresh, 60000);

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
                if (refreshBtn._rot == null) {
                    refreshBtn.style.setProperty('transform', 'rotate(0deg)', 'important');
                    refreshBtn.getBoundingClientRect();
                }
                refreshBtn.style.setProperty('transition', 'transform 0.3s ease', 'important');
                refreshBtn.style.setProperty('transform', `rotate(${(refreshBtn._rot || 0) + 360}deg)`, 'important');
                refreshBtn._rot = (refreshBtn._rot || 0) + 360;
                renderSuggestedCards(true);
            };
        }
    }
}

function renderArtistCards() {
    const artistsContainer = document.getElementById('artists-container');
    if (!artistsContainer) return;
    artistsContainer.innerHTML = '';

    const artists = new Map();
    filtered.forEach(t => {
        if (t.artist) {
            if (!artists.has(t.artist)) artists.set(t.artist, { count: 0, artwork: null });
            artists.get(t.artist).count++;
            if (!artists.get(t.artist).artwork && t.id) artists.get(t.artist).artwork = t.id;
        }
    });

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
            if (data.artwork) _coverObserver.observe(card);
            _artistImgObserver.observe(artistImg);
        });
    artistsContainer.appendChild(fragA);
}

function renderAlbumCards() {
    const albumsContainer = document.getElementById('albums-container');
    if (!albumsContainer) return;
    albumsContainer.innerHTML = '';

    const albums = new Map();
    filtered.forEach(t => {
        if (t.album) {
            if (!albums.has(t.album)) albums.set(t.album, { count: 0, artist: t.artist, artwork: null });
            albums.get(t.album).count++;
            if (!albums.get(t.album).artwork && t.id) albums.get(t.album).artwork = t.id;
        }
    });

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
            if (data.artwork) _coverObserver.observe(card);
        });
    albumsContainer.appendChild(fragB);
}

const sortModes = ['title', 'artist', 'album'];
const sortSVGs = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path fill="currentColor" d="m8.19 5l-.22.66L6.03 11H6v.06l-.94 2.6l-.06.15V15h2v-.84L7.41 13h3.18l.41 1.16V15h2v-1.19l-.06-.15l-.94-2.6V11h-.03l-1.94-5.34L9.81 5zM23 5.5l-.72.69L18 10.5l1.41 1.41L22 9.31V28h2V9.31l2.59 2.6L28 10.5l-4.28-4.31zM9 8.66L9.84 11H8.16zM5 17v2h5.56l-5.28 5.28l-.28.31V27h8v-2H7.44l5.28-5.28l.28-.31V17z"/></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M15.725 19.275Q15 18.55 15 17.5t.725-1.775T17.5 15q.2 0 .45.038t.55.162V10H22v2h-2v5.5q0 1.05-.725 1.775T17.5 20t-1.775-.725m-7.55-8.45Q7 9.65 7 8t1.175-2.825T11 4t2.825 1.175T15 8t-1.175 2.825T11 12t-2.825-1.175M3 20v-2.8q0-.875.438-1.575T4.6 14.55q1.55-.775 3.15-1.162T11 13q1.05 0 2.088.163t2.087.487q-1.65 1-2.05 2.863t.65 3.487z"/></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m0 8a2 2 0 1 0 0 4a2 2 0 0 0 0-4m-.56-3.493a1 1 0 0 0-1.276-.61a7.02 7.02 0 0 0-3.73 3.1A1 1 0 0 0 8.166 10a5.02 5.02 0 0 1 2.665-2.216a1 1 0 0 0 .61-1.276Z"/></g></svg>`
];
let sortModeIdx = 0;
let currentDetailView = null;
let detailViewHistory = [];

let viewScrolls = {};
let lastViewState = 'tab:library:sort:title';

function getViewState() {
    if (currentDetailView) {
        if (currentDetailView.type === 'playlist') return `detail:playlist:${currentPlaylist?.id || currentDetailView.name}`;
        return `detail:${currentDetailView.type}:${currentDetailView.name}`;
    }
    const activeTab = document.querySelector('.sidebar-item.active')?.dataset.tab || 'library';
    if (activeTab === 'library') return `tab:library:sort:${sortMode}`;
    return `tab:${activeTab}`;
}

function saveScroll() {
    if (searchEl?.value) return;
    const main = document.getElementById('main');
    viewScrolls[lastViewState] = main ? main.scrollTop : window.scrollY;
}

function restoreScroll() {
    const newState = getViewState();
    lastViewState = newState;
    if (searchEl?.value) return;
    const targetY = viewScrolls[newState] || 0;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const main = document.getElementById('main');
            if (main) main.scrollTop = targetY;
            else window.scrollTo(0, targetY);
        });
    });
}

function openDetail(type, name, isGoingBack = false) {
    if (type === 'playlist') {
        const pl = playlists.find(p => p.name === name);
        if (pl) {
            openPlaylistDetail(pl);
            return;
        }
    }
    saveScroll();
    if (!isGoingBack && currentDetailView) {
        detailViewHistory.push(currentDetailView);
    }
    currentDetailView = { type, name };
    document.body.classList.add('detail-view');
    const viewLibrary = document.getElementById('view-library');
    const viewPlaylists = document.getElementById('view-playlists');
    const libraryCards = document.getElementById('library-cards');
    const trackList = document.getElementById('track-list');
    const headerTitle = document.getElementById('header-title');

    if (viewLibrary) viewLibrary.classList.add('active');
    if (viewPlaylists) viewPlaylists.classList.remove('active');
    if (libraryCards) libraryCards.classList.remove('show');
    if (trackList) trackList.style.display = 'block';
    if (headerTitle) headerTitle.textContent = '';

    const artistsSection = document.getElementById('artists-section');
    const albumsSection = document.getElementById('albums-section');
    if (artistsSection) artistsSection.style.display = 'none';
    if (albumsSection) albumsSection.style.display = 'none';

    searchEl.value = '';
    if (type === 'artist') {
        const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const artistRegex = new RegExp('(?<!\\w)' + escapedName + '(?!\\w)', 'i');
        filtered = tracks.filter(t =>
            ((t.artist && artistRegex.test(t.artist)) ||
                (t.title && artistRegex.test(t.title))) &&
            !(name.toLowerCase() === 'future' && t.title && t.title.toLowerCase().includes('future nostalgia'))
        );
    } else {
        filtered = tracks.filter(t => t[type] === name);
    }
    detailViewTracks = [...filtered];
    renderList();
    restoreScroll();
    notifyNativeDetailView(true, name);
}

function openArtistDetail(artist) { openDetail('artist', artist); }
function openAlbumDetail(album) { openDetail('album', album); }

function closeDetailView(force = false) {
    saveScroll();
    if (force) {
        detailViewHistory = [];
    }
    if (detailViewHistory.length > 0) {
        const prev = detailViewHistory.pop();
        openDetail(prev.type, prev.name, true);
        return;
    }
    if (currentDetailView?.type === 'playlist') {
        closePlaylistDetail();
        if (!force) return;
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
    notifyNativeDetailView(false);
}

function cycleSort() {
    saveScroll();
    sortModeIdx = (sortModeIdx + 1) % 3;
    sortMode = sortModes[sortModeIdx];
    if (sortBtn) sortBtn.innerHTML = sortSVGs[sortModeIdx];
    if (sortMode === 'title') filtered = [...tracks];
    sort();
    updateSidebarSortLabel();
    restoreScroll();
}

if (sortBtn) { sortBtn.onclick = cycleSort; sortBtn.innerHTML = sortSVGs[sortModeIdx]; }

let currentTheme = localStorage.getItem('music_theme') || 'default';
function applyTheme() {
    document.body.classList.remove('ember-theme', 'glacier-theme', 'void-theme', 'blind-theme', 'rosecore-theme', 'abyss-theme', 'aurielle-theme', 'liquid-glass-theme');
    if (currentTheme === 'ember-theme') document.body.classList.add('ember-theme');
    else if (currentTheme === 'glacier-theme') document.body.classList.add('glacier-theme');
    else if (currentTheme === 'void-theme') document.body.classList.add('void-theme');
    else if (currentTheme === 'blind-theme') document.body.classList.add('blind-theme');
    else if (currentTheme === 'rosecore-theme') document.body.classList.add('rosecore-theme');
    else if (currentTheme === 'abyss-theme') document.body.classList.add('abyss-theme');
    else if (currentTheme === 'aurielle-theme') document.body.classList.add('aurielle-theme');
    else if (currentTheme === 'liquid-glass-theme') document.body.classList.add('liquid-glass-theme');
    updateStatusBar();
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === currentTheme);
    });
    document.querySelectorAll('.sidebar-theme-option').forEach(o => {
        o.classList.toggle('active', o.dataset.theme === currentTheme);
    });

    const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
    if (plugin && typeof plugin.setTheme === 'function') {
        plugin.setTheme({ theme: currentTheme });
    }
}

function updateStatusBar(overrideColor) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (overrideColor) { meta.setAttribute('content', overrideColor); return; }
    const themeColors = {
        'default': '#0d0d0f',
        'ember-theme': '#0e0c0b',
        'glacier-theme': '#0a0e10',
        'void-theme': '#080c09',
        'blind-theme': '#000000',
        'rosecore-theme': '#0f0d0e',
        'abyss-theme': '#0d0d0f',
        'aurielle-theme': '#f8f9fa',
        'liquid-glass-theme': '#09090c'
    };
    meta.setAttribute('content', themeColors[currentTheme] || '#0d0d0f');
}

function showThemeMenu() {
    if (!themeMenu) return;
    hideSettingsMenu();
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

function toggleThemeMenu() {
    if (!themeMenu) return;
    if (themeMenu.classList.contains('open')) {
        hideThemeMenu();
    } else {
        showThemeMenu();
    }
}

let currentQuality = localStorage.getItem('jam_bitrate') || 'original';
function applyQuality() {
    document.querySelectorAll('.quality-option').forEach(option => {
        option.classList.toggle('active', option.dataset.quality === currentQuality);
    });
    document.querySelectorAll('.sidebar-quality-option').forEach(option => {
        option.classList.toggle('active', option.dataset.quality === currentQuality);
    });
    const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
    if (plugin && typeof plugin.setQuality === 'function') {
        plugin.setQuality({ quality: currentQuality });
    }
}

function showSettingsMenu() {
    if (!settingsMenu) return;
    hideThemeMenu();
    settingsMenu.classList.add('open');
}

function hideSettingsMenu() {
    if (settingsMenu) settingsMenu.classList.remove('open');
}

if (themeToggle) {
    themeToggle.onclick = (e) => {
        e.stopPropagation();
        if (themeMenu.classList.contains('open')) hideThemeMenu();
        else showThemeMenu();
    };
}

if (themeMenu) {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.onclick = () => {
            triggerHaptic('SUCCESS');
            currentTheme = option.dataset.theme;
            localStorage.setItem('music_theme', currentTheme);
            applyTheme();
            hideThemeMenu();
        };
    });
}

if (settingsToggle) {
    settingsToggle.onclick = (e) => {
        e.stopPropagation();
        if (settingsMenu.classList.contains('open')) hideSettingsMenu();
        else showSettingsMenu();
    };
}

if (settingsMenu) {
    document.querySelectorAll('.quality-option').forEach(option => {
        option.onclick = () => {
            triggerHaptic('SUCCESS');
            currentQuality = option.dataset.quality;
            localStorage.setItem('jam_bitrate', currentQuality);
            applyQuality();
            hideSettingsMenu();
        };
    });
}

document.addEventListener('click', (e) => {
    if (themeMenu?.classList.contains('open') && !themeMenu.contains(e.target) && !themeToggle.contains(e.target)) {
        hideThemeMenu();
    }
    if (settingsMenu?.classList.contains('open') && !settingsMenu.contains(e.target) && !settingsToggle.contains(e.target)) {
        hideSettingsMenu();
    }
});

applyTheme();
applyQuality();

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

if (sidebarSortItem) sidebarSortItem.onclick = cycleSort;
updateSidebarSortLabel();

const sidebarThemeItem = document.getElementById('sidebar-theme-item');
const sidebarThemeDropdown = document.getElementById('sidebar-theme-dropdown');

if (sidebarThemeItem) {
    sidebarThemeItem.onclick = () => { sidebarThemeDropdown.classList.toggle('open'); };
}

document.querySelectorAll('.sidebar-theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === currentTheme);
    opt.onclick = () => {
        triggerHaptic('SUCCESS');
        currentTheme = opt.dataset.theme;
        localStorage.setItem('music_theme', currentTheme);
        applyTheme();
        document.querySelectorAll('.sidebar-theme-option').forEach(o => {
            o.classList.toggle('active', o.dataset.theme === currentTheme);
        });
        sidebarThemeDropdown.classList.remove('open');
    };
});

const sidebarQualityItem = document.getElementById('sidebar-quality-item');
const sidebarQualityDropdown = document.getElementById('sidebar-quality-dropdown');

if (sidebarQualityItem) {
    sidebarQualityItem.onclick = () => { sidebarQualityDropdown.classList.toggle('open'); };
}

document.querySelectorAll('.sidebar-quality-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.quality === currentQuality);
    opt.onclick = () => {
        triggerHaptic('SUCCESS');
        currentQuality = opt.dataset.quality;
        localStorage.setItem('jam_bitrate', currentQuality);
        applyQuality();
        sidebarQualityDropdown.classList.remove('open');
    };
});

const sidebarUpdate = document.getElementById('sidebar-update');
if (sidebarUpdate) {
    sidebarUpdate.onclick = () => {
        if (swRegistration?.waiting) activateUpdate();
        else checkForUpdate();
    };
}

function applyFilter() {
    const q = searchEl ? searchEl.value.toLowerCase() : '';
    let baseTracks = (currentDetailView && currentDetailView.type !== 'playlist') ? detailViewTracks : tracks;

    if (q) {
        if (!currentDetailView) {
            if (sortMode === 'artist') {
                filtered = baseTracks.filter(t => (t.artist || '').toLowerCase().includes(q));
            } else if (sortMode === 'album') {
                filtered = baseTracks.filter(t => (t.album || '').toLowerCase().includes(q));
            } else {
                filtered = baseTracks.filter(t => (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q) || (t.album || '').toLowerCase().includes(q));
            }
        } else {
            filtered = baseTracks.filter(t => (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q) || (t.album || '').toLowerCase().includes(q));
        }
    } else {
        filtered = [...baseTracks];
    }
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
            renderArtistCards();
        } else if (sortMode === 'album') {
            libraryCards.classList.add('show');
            if (artistsSection) artistsSection.style.display = 'none';
            if (albumsSection) albumsSection.style.display = 'block';
            if (trackList) trackList.style.display = 'none';
            renderAlbumCards();
        }
    }

    if (sortMode === 'title') renderList();
}

function groupKey(t) {
    if (sortMode === 'title') return (t.title || '?')[0].toUpperCase();
    if (sortMode === 'artist') return t.artist || 'Unknown';
    return t.album || 'Unknown';
}

let renderGeneration = 0;
function renderList() {
    const gen = ++renderGeneration;
    if (loading) loading.style.display = 'none';
    if (trackList) trackList.innerHTML = '';
    if (!filtered.length) { if (empty) empty.style.display = 'flex'; return }
    if (empty) empty.style.display = 'none';

    if (currentDetailView) {
        const headerContainer = document.createElement('div');
        headerContainer.id = 'playlist-detail';
        headerContainer.className = 'active';

        let coverHtml = '';
        let title = currentDetailView.name;
        let countText = '';
        let buttonsHtml = '';

        if (currentDetailView.type === 'album') {
            countText = `${filtered.length} song${filtered.length !== 1 ? 's' : ''}`;
            const albumTrack = filtered[0];
            const artistName = albumTrack?.artist || 'Unknown Artist';
            coverHtml = `<img id="detail-album-cover-img" />`;

            buttonsHtml = `
                <div class="playlist-detail-buttons">
                    <button id="playlist-play-btn">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 3 21 3 21 8"></polyline>
                            <line x1="4" y1="20" x2="21" y2="3"></line>
                            <polyline points="21 16 21 21 16 21"></polyline>
                            <line x1="15" y1="15" x2="21" y2="21"></line>
                            <line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                        shuffle
                    </button>
                </div>
            `;

            headerContainer.innerHTML = `
                <div id="playlist-detail-header">
                    <div id="playlist-detail-cover" class="playlist-icon">
                        ${coverHtml}
                    </div>
                    <div class="playlist-detail-info">
                        <h2 id="playlist-detail-name">${escHtml(title)}</h2>
                        <div class="playlist-detail-artist">${escHtml(artistName)}</div>
                        <div id="playlist-detail-count">${countText}</div>
                    </div>
                </div>
                ${buttonsHtml}
            `;

            if (albumTrack) {
                setTimeout(() => {
                    const imgEl = headerContainer.querySelector('#detail-album-cover-img');
                    if (imgEl) {
                        imgEl.onload = () => { imgEl.style.opacity = '1'; };
                        loadCover(albumTrack.id, imgEl);
                        if (imgEl.complete) imgEl.style.opacity = '1';
                    }
                }, 0);
            }

            setTimeout(() => {
                const playBtn = headerContainer.querySelector('#playlist-play-btn');
                if (playBtn) {
                    playBtn.onclick = () => {
                        if (filtered.length > 0) playTrack(filtered[0], filtered);
                    };
                }
                const shuffleBtn = headerContainer.querySelector('#playlist-edit-btn');
                if (shuffleBtn) {
                    shuffleBtn.onclick = () => {
                        if (filtered.length > 0) {
                            const list = [...filtered];
                            for (let idx = list.length - 1; idx > 0; idx--) {
                                const j = Math.floor(Math.random() * (idx + 1));
                                [list[idx], list[j]] = [list[j], list[idx]];
                            }
                            playTrack(list[0], list);
                        }
                    };
                }
            }, 0);

        } else if (currentDetailView.type === 'artist') {
            countText = `${filtered.length} song${filtered.length !== 1 ? 's' : ''}`;
            coverHtml = `<img id="detail-artist-image" />`;

            buttonsHtml = `
                <div class="playlist-detail-buttons">
                    <button id="playlist-edit-btn">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 3 21 3 21 8"></polyline>
                            <line x1="4" y1="20" x2="21" y2="3"></line>
                            <polyline points="21 16 21 21 16 21"></polyline>
                            <line x1="15" y1="15" x2="21" y2="21"></line>
                            <line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                        shuffle
                    </button>
                </div>
            `;

            headerContainer.innerHTML = `
                <div id="playlist-detail-header">
                    <div id="playlist-detail-cover" class="playlist-icon">
                        ${coverHtml}
                    </div>
                    <div class="playlist-detail-info">
                        <h2 id="playlist-detail-name">${escHtml(title)}</h2>
                        <div id="playlist-detail-count">${countText}</div>
                    </div>
                </div>
                ${buttonsHtml}
            `;

            setTimeout(() => {
                const imgEl = headerContainer.querySelector('#detail-artist-image');
                if (imgEl) loadArtistImage(currentDetailView.name, imgEl);
            }, 0);

            setTimeout(() => {
                const shuffleBtn = headerContainer.querySelector('#playlist-edit-btn');
                if (shuffleBtn) {
                    shuffleBtn.onclick = () => {
                        if (filtered.length > 0) {
                            const list = [...filtered];
                            for (let idx = list.length - 1; idx > 0; idx--) {
                                const j = Math.floor(Math.random() * (idx + 1));
                                [list[idx], list[j]] = [list[j], list[idx]];
                            }
                            playTrack(list[0], list);
                        }
                    };
                }
            }, 0);
        }

        trackList.appendChild(headerContainer);

        if (currentDetailView.type === 'artist') {
            const artistAlbums = new Map();
            filtered.forEach(t => {
                if (t.album && t.artist === currentDetailView.name) {
                    if (!artistAlbums.has(t.album)) {
                        artistAlbums.set(t.album, { artwork: t.id });
                    }
                }
            });

            if (artistAlbums.size > 0) {
                const albumsSection = document.createElement('div');
                albumsSection.className = 'artist-albums-section';
                albumsSection.innerHTML = `
                    <div id="suggested-container"></div>
                `;
                const cardsContainer = albumsSection.querySelector('#suggested-container');

                Array.from(artistAlbums.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .forEach(([albumName, data]) => {
                        const card = document.createElement('div');
                        card.className = 'album-card';
                        if (data.artwork) card.dataset.artworkId = data.artwork;

                        const overlay = document.createElement('div');
                        const label = document.createElement('span');
                        label.textContent = albumName;

                        card.append(overlay, label);
                        card.onclick = () => openAlbumDetail(albumName);

                        if (data.artwork) _coverObserver.observe(card);
                        cardsContainer.appendChild(card);
                    });

                trackList.appendChild(albumsSection);
            }
        }
    }

    const CHUNK = 50;
    let i = 0, lastGroup = '';
    function renderChunk() {
        if (gen !== renderGeneration) return;
        const frag = document.createDocumentFragment();
        const end = Math.min(i + CHUNK, filtered.length);
        for (; i < end; i++) {
            const t = filtered[i];
            const g = groupKey(t);
            if (!currentDetailView && g !== lastGroup) {
                lastGroup = g;
                const h = document.createElement('div');
                h.className = 'group-header';
                h.textContent = g;
                frag.appendChild(h);
            }
            frag.appendChild(makeRow(t, true));
        }
        if (trackList) trackList.appendChild(frag);
        if (i < filtered.length) requestAnimationFrame(renderChunk);
    }
    renderChunk();
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
                if (typeof triggerHaptic === 'function') triggerHaptic('IMPACT_MEDIUM');
                else if (navigator.vibrate) navigator.vibrate(10);
                options.onLongPress(e);
            }, longPressMs);
        }
    });
    el.addEventListener('pointermove', e => {
        if (e.pointerType !== 'touch') return;
        if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) { moved = true; clearLongPress(); }
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

    let state = 'idle';
    let originX = 0, originY = 0;
    let deltaX = 0;
    let samples = [];
    let animating = false;

    function rubberBand(x, limit) {
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
        if (!h) { bgElement.className = 'track-actions'; bgElement.innerHTML = ''; return; }
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
            const offX = dir > 0 ? container.offsetWidth : -container.offsetWidth;
            content.style.setProperty('transition', 'transform 0.25s cubic-bezier(0.4, 0, 1, 1)', 'important');
            content.style.transform = `translate3d(${offX}px,0,0)`;
            setTimeout(() => {
                content.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)', 'important');
                content.style.transform = 'translate3d(0,0,0)';
                setTimeout(cleanup, 320);
            }, 260);
        } else {
            content.style.setProperty('transition', 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.075)', 'important');
            content.style.transform = 'translate3d(0,0,0)';
            setTimeout(cleanup, 400);
        }
    }

    container.addEventListener('touchstart', e => {
        if (animating) return;
        if (e.target.closest('button, .queue-handle')) return;
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
            if (absY >= absX * 0.7) { state = 'scrolling'; return; }
            state = 'swiping';
            container.classList.add('swiping');
        }

        if (state === 'swiping') {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            showAction(deltaX > 0 ? 1 : (deltaX < 0 ? -1 : 0));
            let efX = deltaX;
            if ((efX > 0 && !handlers.right) || (efX < 0 && !handlers.left)) {
                efX = rubberBand(efX, 20);
            } else {
                efX = rubberBand(efX, THRESHOLD * 2.5);
            }
            content.style.transform = `translate3d(${efX}px,0,0)`;
            const pastThreshold = Math.abs(deltaX) > THRESHOLD;
            const hasHandler = (deltaX > 0 && handlers.right) || (deltaX < 0 && handlers.left);
            if (pastThreshold && hasHandler) {
                if (!bgElement.classList.contains('locked')) {
                    bgElement.classList.add('locked');
                    if (typeof triggerHaptic === 'function') triggerHaptic('IMPACT_LIGHT');
                    else if (navigator.vibrate) navigator.vibrate(8);
                }
            } else {
                bgElement.classList.remove('locked');
            }
        }
    }, { passive: false });

    container.addEventListener('touchend', e => {
        if (state !== 'swiping') {
            if (state === 'deciding' || state === 'scrolling') { state = 'idle'; content.style.removeProperty('transition'); }
            return;
        }
        e.stopPropagation();
        const vel = velocity();
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
    thumb.dataset.coverId = t.id;
    trackCoverObserver.observe(thumb);

    const info = document.createElement('div'); info.className = 'track-info';
    const ti = document.createElement('div'); ti.className = 'track-title';
    const spanTitle = document.createElement('span');
    spanTitle.textContent = t.title || 'Unknown';
    ti.appendChild(spanTitle);

    const bars = document.createElement('div');
    bars.className = 'music-bars';
    bars.innerHTML = '<span></span><span></span><span></span>';
    ti.appendChild(bars);
    const ts = document.createElement('div'); ts.className = 'track-sub';
    renderArtistAlbumSub(ts, t, 'track-list');
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

    const isTouchScreen = coarseQuery.matches;

    const playHandler = () => {
        if (inPlaylist && currentPlaylist) {
            const list = currentPlaylist.tracks.map(pt => trackMap.get(pt.trackId) || { id: pt.trackId, title: pt.title, artist: pt.artist, album: pt.album, suffix: pt.suffix || 'flac' }).filter(Boolean);
            playTrack(t, list);
        } else {
            playTrack(t, filtered);
        }
    };

    if (!isTouchScreen) {
        div.onmousedown = (e) => {
            if (e.button !== 0) return;
            isSelecting = true;
            if (!e.ctrlKey && !e.metaKey) document.querySelectorAll('.track.selected').forEach(el => el.classList.remove('selected'));
            toggleMode = !div.classList.contains('selected');
            div.classList.toggle('selected', toggleMode);
        };
        div.onmouseenter = () => { if (isSelecting) div.classList.toggle('selected', toggleMode); };
        div.ondblclick = playHandler;
    } else {
        bindTapActivation(div, playHandler, {
            onLongPress: e => openCtxMenu({ clientX: e.clientX, clientY: e.clientY, stopPropagation() { } }, t)
        });

        let rowHandlers = {};
        const isSmartPlaylist = currentPlaylist && currentPlaylist.id && currentPlaylist.id.startsWith('smart:');

        rowHandlers.right = {
            action: () => {
                queue.splice(qIdx + 1, 0, t);
                showToast(`Added "${t.title}" to play next`);
                saveQueueState();
                renderQueue();
            },
            icon: SWIPE_ICONS.queue
        };

        if (inPlaylist && !isSmartPlaylist) {
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
        } else if (!inPlaylist) {
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
    ctxPlaylist = null;
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
            if (pl.id.startsWith('smart:')) return;
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
    if (!e.target.closest('#ctx-menu') && !e.target.closest('#quick-playlist-menu')) closeCtxMenu();
});

document.addEventListener('touchstart', e => {
    if (!e.target.closest('#ctx-menu') && !e.target.closest('.track-menu-btn') && !e.target.closest('#quick-playlist-menu')) closeCtxMenu();
}, { passive: true });

let ctxPlaylist = null;
function openPlaylistCtxMenu(e, pl) {
    ctxPlaylist = pl;
    document.body.classList.add('menu-open');
    if (menuBackdrop) menuBackdrop.style.display = 'block';

    const trackNameLabel = document.getElementById('ctx-track-name');
    if (trackNameLabel) trackNameLabel.textContent = pl.name || 'Playlist';

    const trackItems = ['ctx-add-queue', 'ctx-remove-sep', 'ctx-remove-from-playlist', 'ctx-edit-metadata', 'ctx-new-playlist', 'ctx-favorite', 'ctx-unfavorite'];
    trackItems.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

    if (ctxPlaylists) ctxPlaylists.style.display = 'none';

    if (ctxMenu) {
        const addLabel = Array.from(ctxMenu.querySelectorAll('.ctx-label')).find(el => el.textContent === 'Add to Playlist');
        if (addLabel) addLabel.style.display = 'none';
        ctxMenu.querySelectorAll('.ctx-sep').forEach(sep => sep.style.display = 'none');
    }

    const ctxDeletePlaylist = document.getElementById('ctx-delete-playlist');
    if (ctxDeletePlaylist) {
        ctxDeletePlaylist.style.display = 'flex';
        ctxDeletePlaylist.onclick = () => { closeCtxMenu(); deletePlaylist(pl.id); };
    }

    if (ctxMenu) {
        ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
        ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 150) + 'px';
        ctxMenu.classList.add('open');
    }
}

function openCtxMenu(e, t) {
    ctxTrack = t;
    document.body.classList.add('menu-open');
    if (menuBackdrop) menuBackdrop.style.display = 'block';
    const row = document.querySelector(`.track[data-id="${t.id}"]`);
    if (row) row.classList.add('long-press');

    const trackItems = ['ctx-add-queue', 'ctx-new-playlist', t.starred ? 'ctx-unfavorite' : 'ctx-favorite'];
    trackItems.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
    const hideItems = t.starred ? ['ctx-favorite'] : ['ctx-unfavorite'];
    hideItems.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

    if (ctxPlaylists) ctxPlaylists.style.display = 'block';

    if (ctxMenu) {
        const addLabel = Array.from(ctxMenu.querySelectorAll('.ctx-label')).find(el => el.textContent === 'Add to Playlist');
        if (addLabel) addLabel.style.display = 'block';
        ctxMenu.querySelectorAll('.ctx-sep').forEach(sep => { if (sep.id !== 'ctx-remove-sep') sep.style.display = 'block'; });
    }

    const ctxDeletePlaylist = document.getElementById('ctx-delete-playlist');
    if (ctxDeletePlaylist) ctxDeletePlaylist.style.display = 'none';

    const isTouch = coarseQuery.matches;
    let targetTracks = [];
    if (!isTouch) {
        targetTracks = Array.from(document.querySelectorAll('.track.selected'))
            .map(el => trackMap.get(el.dataset.id))
            .filter(Boolean);
    }
    if (!targetTracks.length || !targetTracks.some(st => st.id === t.id)) targetTracks = [t];

    const trackNameLabel = document.getElementById('ctx-track-name');
    if (trackNameLabel) trackNameLabel.textContent = targetTracks.length > 1 ? `${targetTracks.length} tracks selected` : (t.title || 'Track');

    const ctxPlayNext = document.getElementById('ctx-play-next');
    if (ctxPlayNext) {
        ctxPlayNext.onclick = () => {
            queue.splice(qIdx + 1, 0, ...targetTracks);
            showToast(`Playing ${targetTracks.length} track(s) next`);
            saveQueueState();
            renderQueue();
            closeCtxMenu();
        };
    }

    const ctxAddQueue = document.getElementById('ctx-add-queue');
    if (ctxAddQueue) {
        ctxAddQueue.onclick = () => {
            queue.splice(qIdx + 1, 0, ...targetTracks);
            showToast(`Added ${targetTracks.length} track(s) to play next`);
            saveQueueState();
            renderQueue();
            closeCtxMenu();
        };
    }

    const ctxRemoveFromPlaylist = document.getElementById('ctx-remove-from-playlist');
    const ctxRemoveSep = document.getElementById('ctx-remove-sep');
    if (ctxRemoveFromPlaylist && ctxRemoveSep) {
        if (currentPlaylist && !currentPlaylist.id.startsWith('smart:')) {
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
                if (pl.id.startsWith('smart:')) return;
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
if (ctxNewPlaylist) ctxNewPlaylist.onclick = () => { pendingPlaylistTrack = ctxTrack; closeCtxMenu(); openNewPlaylistModal(); };

async function loadPlaylists() {
    try {
        const customPlaylists = await Navidrome.getPlaylists();
        playlists = [...SMART_PLAYLISTS, ...customPlaylists];
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
        const isSmart = pl.id.startsWith('smart:');
        const card = document.createElement('div');
        card.className = 'playlist-card' + (isSmart ? ' smart-playlist-card' : '');
        card.dataset.id = pl.id;

        let playlistIconHtml = '\u266B';
        if (isSmart) {
            if (pl.id === 'smart:favorites') playlistIconHtml = '<span style="font-size:20px;color:var(--accent);display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="m5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275z"/></svg></span>';
            else if (pl.id === 'smart:recent') playlistIconHtml = '<span style="font-size:20px;color:var(--accent);display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M13.5 8H12v5l4.28 2.54l.72-1.21l-3.5-2.08zM13 3a9 9 0 0 0-9 9H1l3.96 4.03L9 12H6a7 7 0 0 1 7-7a7 7 0 0 1 7 7a7 7 0 0 1-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.9 8.9 0 0 0 13 21a9 9 0 0 0 9-9a9 9 0 0 0-9-9"/></svg></span>';
            else if (pl.id === 'smart:newest') playlistIconHtml = '<span style="font-size:20px;color:var(--accent);display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="m21.45 11.11l-3-1.5l-2.7-1.35l-1.35-2.7l-1.5-3c-.34-.68-1.45-.68-1.79 0l-1.5 3l-1.35 2.7l-2.7 1.35l-3 1.5c-.34.17-.55.52-.55.89s.21.72.55.89l3 1.5l2.7 1.35l1.35 2.7l1.5 3c.17.34.52.55.89.55s.73-.21.89-.55l1.5-3l1.35-2.7l2.7-1.35l3-1.5c.34-.17.55-.52.55-.89s-.21-.72-.55-.89Zm-3.89 1.5l-.84.42l-2.16 1.08l-.3.15l-.15.3L12 18.77l-2.11-4.21l-.15-.3l-.3-.15l-2.16-1.08l-.84-.42L5.23 12l1.21-.61l.84-.42l2.16-1.08l.3-.15l.15-.3L12 5.23l2.11 4.21l.15.3l.3.15l2.16 1.08l.84.42l1.21.61z"/></svg></span>';
            else if (pl.id === 'smart:random') playlistIconHtml = '<span style="font-size:20px;color:var(--accent);display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512"><path d="M0 0h512v512H0z" fill="none"/><path fill="currentColor" fill-rule="evenodd" d="M465.023 135.32L376.68 465.023L46.977 376.68L135.32 46.977zM317.08 316.538c-17.071-4.574-34.618 5.557-39.192 22.627c-4.574 17.07 5.556 34.618 22.627 39.192s34.618-5.556 39.192-22.627s-5.557-34.618-22.627-39.192m-52.798-91.448c-17.07-4.574-34.617 5.557-39.192 22.628c-4.574 17.07 5.557 34.618 22.628 39.192s34.617-5.557 39.192-22.628c4.574-17.07-5.557-34.617-22.628-39.192m-52.797-91.447c-17.071-4.574-34.618 5.556-39.192 22.627s5.557 34.618 22.627 39.192c17.071 4.574 34.618-5.556 39.192-22.627s-5.556-34.618-22.627-39.192"/></svg></span>';
        } else if (pl.image) {
            playlistIconHtml = `<img src="${pl.image}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`;
        }

        const deleteBtnHtml = isSmart ? '' : '<button class="playlist-del" title="Delete">\u2715</button>';
        const countHtml = isSmart ? '' : `<div class="playlist-count">${pl.tracks.length} song${pl.tracks.length !== 1 ? 's' : ''}</div>`;

        card.innerHTML = '<div class="playlist-icon">' + playlistIconHtml + '</div><div class="playlist-info"><div class="playlist-name">' + pl.name + '</div>' + countHtml + '</div>' + deleteBtnHtml;

        if (!isSmart) {
            card.querySelector('.playlist-del').onclick = e => { e.stopPropagation(); deletePlaylist(pl.id) };
        }
        bindTapActivation(card, () => openPlaylistDetail(pl), {
            onLongPress: (e) => {
                if (!isSmart) {
                    openPlaylistCtxMenu({ clientX: e.clientX, clientY: e.clientY, stopPropagation() { } }, pl);
                }
            }
        });
        playlistsContainer.appendChild(card);
    });
}

async function openPlaylistDetail(pl) {
    saveScroll();
    currentPlaylist = pl;
    currentDetailView = { type: 'playlist', name: pl.name };
    document.body.classList.add('detail-view');

    const viewLibrary = document.getElementById('view-library');
    if (viewLibrary) viewLibrary.classList.remove('active');
    const viewPlaylists = document.getElementById('view-playlists');
    if (viewPlaylists) viewPlaylists.classList.add('active');

    if (playlistsListView) playlistsListView.style.display = 'none';
    if (playlistDetail) playlistDetail.classList.add('active');
    const plName = playlistDetail ? playlistDetail.querySelector('#playlist-detail-name') : null;
    if (plName) plName.textContent = pl.name;

    const plCover = playlistDetail ? playlistDetail.querySelector('#playlist-detail-cover') : null;
    let iconSymbol = '♫';
    if (pl.id === 'smart:favorites') iconSymbol = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="m5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275z"/></svg>';
    else if (pl.id === 'smart:recent') iconSymbol = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M13.5 8H12v5l4.28 2.54l.72-1.21l-3.5-2.08zM13 3a9 9 0 0 0-9 9H1l3.96 4.03L9 12H6a7 7 0 0 1 7-7a7 7 0 0 1 7 7a7 7 0 0 1-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.9 8.9 0 0 0 13 21a9 9 0 0 0 9-9a9 9 0 0 0-9-9"/></svg>';
    else if (pl.id === 'smart:newest') iconSymbol = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="m21.45 11.11l-3-1.5l-2.7-1.35l-1.35-2.7l-1.5-3c-.34-.68-1.45-.68-1.79 0l-1.5 3l-1.35 2.7l-2.7 1.35l-3 1.5c-.34.17-.55.52-.55.89s.21.72.55.89l3 1.5l2.7 1.35l1.35 2.7l1.5 3c.17.34.52.55.89.55s.73-.21.89-.55l1.5-3l1.35-2.7l2.7-1.35l3-1.5c.34-.17.55-.52.55-.89s-.21-.72-.55-.89Zm-3.89 1.5l-.84.42l-2.16 1.08l-.3.15l-.15.3L12 18.77l-2.11-4.21l-.15-.3l-.3-.15l-2.16-1.08l-.84-.42L5.23 12l1.21-.61l.84-.42l2.16-1.08l.3-.15l.15-.3L12 5.23l2.11 4.21l.15.3l.3.15l2.16 1.08l.84.42l1.21.61z"/></svg>';
    else if (pl.id === 'smart:random') iconSymbol = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512"><path d="M0 0h512v512H0z" fill="none"/><path fill="currentColor" fill-rule="evenodd" d="M465.023 135.32L376.68 465.023L46.977 376.68L135.32 46.977zM317.08 316.538c-17.071-4.574-34.618 5.557-39.192 22.627c-4.574 17.07 5.556 34.618 22.627 39.192s34.618-5.556 39.192-22.627s-5.557-34.618-22.627-39.192m-52.798-91.448c-17.07-4.574-34.617 5.557-39.192 22.628c-4.574 17.07 5.557 34.618 22.628 39.192s34.617-5.557 39.192-22.628c4.574-17.07-5.557-34.617-22.628-39.192m-52.797-91.447c-17.071-4.574-34.618 5.556-39.192 22.627s5.557 34.618 22.627 39.192c17.071 4.574 34.618-5.556 39.192-22.627s-5.556-34.618-22.627-39.192"/></svg>';

    if (plCover) {
        plCover.innerHTML = pl.id.startsWith('smart:') ? `<span style="font-size:100px;color:var(--accent);display:flex;align-items:center;justify-content:center;">${iconSymbol}</span>` : (pl.image ? `<img src="${pl.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />` : '\u266B');
    }

    const plEditBtn = document.getElementById('playlist-edit-btn');
    if (plEditBtn) {
        plEditBtn.style.display = pl.id.startsWith('smart:') ? 'none' : 'inline-block';
    }

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = pl.name;

    renderPlaylistDetail(pl);
    restoreScroll();
    notifyNativeDetailView(true, pl.name);

    try {
        let fullPl;
        if (pl.id === 'smart:favorites') {
            const tracksList = await Navidrome.getFavorites();
            fullPl = { ...pl, tracks: tracksList.map(t => ({ trackId: t.id, title: t.title, artist: t.artist, album: t.album })) };
        } else if (pl.id === 'smart:recent') {
            const tracksList = await Navidrome.getRecentlyPlayed();
            fullPl = { ...pl, tracks: tracksList.map(t => ({ trackId: t.id, title: t.title, artist: t.artist, album: t.album })) };
        } else if (pl.id === 'smart:newest') {
            const tracksList = await Navidrome.getRecentlyAdded();
            fullPl = { ...pl, tracks: tracksList.map(t => ({ trackId: t.id, title: t.title, artist: t.artist, album: t.album })) };
        } else if (pl.id === 'smart:random') {
            const tracksList = await Navidrome.getRandomDiscovery();
            fullPl = { ...pl, tracks: tracksList.map(t => ({ trackId: t.id, title: t.title, artist: t.artist, album: t.album })) };
        } else {
            fullPl = await fetchPlaylist(pl.id);
        }

        if (fullPl) {
            currentPlaylist = fullPl;
            const idx = playlists.findIndex(p => p.id === pl.id);
            if (idx !== -1) playlists[idx] = fullPl;
            renderPlaylistDetail(fullPl);
        } else {
            renderPlaylistDetail({ ...pl, tracks: [] });
            showToast('Failed to load playlist songs');
        }
    } catch (e) {
        console.error("Failed to load playlist tracks", e);
        renderPlaylistDetail({ ...pl, tracks: [] });
        showToast('Failed to load playlist songs');
    }
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
    notifyNativeDetailView(false);
}

function renderPlaylistDetail(pl) {
    const plCount = playlistDetail ? playlistDetail.querySelector('#playlist-detail-count') : null;
    if (plCount) plCount.textContent = pl.tracks.length + ' song' + (pl.tracks.length !== 1 ? 's' : '');
    const container = playlistDetail ? playlistDetail.querySelector('#playlist-tracks') : null;
    if (!container) return;
    container.innerHTML = '';
    if (!pl.tracks.length) {
        container.innerHTML = '<div style="padding:32px 16px;text-align:center;color:var(--muted);font-size:14px">No songs yet</div>';
        return;
    }
    if (pl.tracks.length && pl.tracks[0] === undefined) {
        container.innerHTML = '<div style="padding:32px 16px;text-align:center;color:var(--muted);font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;"><div class="spinner"></div>Loading songs...</div>';
        return;
    }
    const isTouchScreen = coarseQuery.matches;
    pl.tracks.forEach(pt => {
        const t = trackMap.get(pt.trackId) || { id: pt.trackId, title: pt.title, artist: pt.artist, album: pt.album, suffix: pt.suffix || 'flac' };
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
if (libraryBack) libraryBack.onclick = () => closeDetailView();

const plPlayBtn = document.getElementById('playlist-play-btn');
if (plPlayBtn) {
    plPlayBtn.onclick = () => {
        if (!currentPlaylist || !currentPlaylist.tracks.length) return;
        const list = currentPlaylist.tracks.map(pt => trackMap.get(pt.trackId)).filter(Boolean);
        if (!list.length) return;
        if (shuffle) {
            const first = list[Math.floor(Math.random() * list.length)];
            playTrack(first, list);
        } else {
            playTrack(list[0], list);
        }
    };
}

const plAddQueueBtn = document.getElementById('playlist-add-queue-btn');
if (plAddQueueBtn) {
    plAddQueueBtn.onclick = () => {
        if (!currentPlaylist || !currentPlaylist.tracks.length) return;
        const list = currentPlaylist.tracks.map(pt => trackMap.get(pt.trackId) || { id: pt.trackId, title: pt.title, artist: pt.artist, album: pt.album, suffix: pt.suffix || 'flac' });
        if (!list.length) return;
        queue.push(...list);
        showToast(`Added ${list.length} song(s) to queue`);
        saveQueueState();
        renderQueue();
    };
}

const playlistEditBtn = document.getElementById('playlist-edit-btn');
if (playlistEditBtn) playlistEditBtn.onclick = () => { if (currentPlaylist) openEditPlaylistModal(currentPlaylist); };

let editPlaylistImageBase64 = null;

function openEditPlaylistModal(pl) {
    const modal = document.getElementById('modal-edit-playlist');
    const nameInput = document.getElementById('edit-pl-name-input');
    const preview = document.getElementById('edit-pl-preview');
    const fileInput = document.getElementById('edit-pl-image-input');
    if (!modal) return;
    editPlaylistImageBase64 = pl.image || null;
    if (nameInput) nameInput.value = pl.name || '';
    if (preview) {
        if (pl.image) preview.innerHTML = `<img src="${pl.image}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`;
        else preview.textContent = '♫';
    }
    if (fileInput) fileInput.value = '';
    modal.style.display = 'flex';
}

const editPlUploadBtn = document.getElementById('edit-pl-upload-btn');
const editPlImageInput = document.getElementById('edit-pl-image-input');
const editPlPreview = document.getElementById('edit-pl-preview');

if (editPlUploadBtn && editPlImageInput) editPlUploadBtn.onclick = () => editPlImageInput.click();
if (editPlPreview && editPlImageInput) editPlPreview.onclick = () => editPlImageInput.click();

if (editPlImageInput) {
    editPlImageInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 300; canvas.height = 300;
                ctx.drawImage(img, 0, 0, 300, 300);
                editPlaylistImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                if (editPlPreview) editPlPreview.innerHTML = `<img src="${editPlaylistImageBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`;
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    };
}

const editPlCancel = document.getElementById('modal-edit-cancel');
const editPlConfirm = document.getElementById('modal-edit-confirm');

if (editPlCancel) {
    editPlCancel.onclick = () => {
        const modal = document.getElementById('modal-edit-playlist');
        if (modal) modal.style.display = 'none';
        editPlaylistImageBase64 = null;
    };
}

if (editPlConfirm) {
    editPlConfirm.onclick = async () => {
        if (!currentPlaylist) return;
        const nameInput = document.getElementById('edit-pl-name-input');
        const newName = nameInput ? nameInput.value.trim() : '';
        if (!newName) { alert('Playlist name required'); return; }
        try {
            const updated = await Navidrome.renamePlaylist(currentPlaylist.id, newName);
            if (updated) {
                if (editPlaylistImageBase64 && editPlaylistImageBase64.startsWith('data:image/')) {
                    await fetch('/api/playlists/image', {
                        method: 'POST',
                        headers: hdrs(),
                        body: JSON.stringify({ id: currentPlaylist.id, image: editPlaylistImageBase64 })
                    });
                }
                const timestamp = Date.now();
                if (updated.image) {
                    updated.image = updated.image + `&t=${timestamp}`;
                }

                const idx = playlists.findIndex(p => p.id === currentPlaylist.id);
                if (idx !== -1) playlists[idx] = updated;
                currentPlaylist = updated;
                const plName = playlistDetail ? playlistDetail.querySelector('#playlist-detail-name') : null;
                if (plName) plName.textContent = updated.name;
                const headerTitle = document.getElementById('header-title');
                if (headerTitle) headerTitle.textContent = updated.name;
                if (currentDetailView) currentDetailView.name = updated.name;
                const plCover = playlistDetail ? playlistDetail.querySelector('#playlist-detail-cover') : null;
                if (plCover) plCover.innerHTML = updated.image ? `<img src="${updated.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />` : '\u266B';
                renderPlaylists();
                renderPlaylistDetail(updated);
                const modal = document.getElementById('modal-edit-playlist');
                if (modal) modal.style.display = 'none';
                showToast('Playlist updated');
            } else {
                showToast('Failed to update playlist');
            }
        } catch (e) { console.error(e); showToast('Error updating playlist'); }
    };
}

async function addToPlaylist(playlistId, t) {
    if (playlistId === 'smart:favorites') {
        if (!t.starred) {
            t.starred = true;
            try {
                const ok = await Navidrome.starTrack(t.id, true);
                if (ok) {
                    const currentTrack = queue[qIdx];
                    if (currentTrack && currentTrack.id === t.id) {
                        updateHeartUI(true);
                        syncStarredStateNatively(true);
                    }
                }
            } catch (e) { console.error(e); }
        }
        return;
    }
    try {
        const updated = await Navidrome.addTrackToPlaylist(playlistId, t.id);
        if (updated) {
            playlists = playlists.map(p => p.id === playlistId ? updated : p);
            if (currentPlaylist?.id === playlistId) { currentPlaylist = updated; renderPlaylistDetail(updated); }
        }
    } catch (e) { console.error("Failed to add to playlist", e); }
}

async function removeFromPlaylist(playlistId, trackId) {
    try {
        const updated = await Navidrome.removeTrackFromPlaylist(playlistId, trackId);
        if (updated) {
            playlists = playlists.map(p => p.id === playlistId ? updated : p);
            if (currentPlaylist?.id === playlistId) { currentPlaylist = updated; renderPlaylistDetail(updated); }
        }
    } catch (e) { console.error("Failed to remove from playlist", e); }
}

async function fetchPlaylist(id) {
    try {
        return await Navidrome.getPlaylist(id);
    } catch (e) { console.error("Failed to fetch playlist", e); return null; }
}

async function deletePlaylist(id) {
    if (!confirm('Delete this playlist?')) return;
    try {
        await Navidrome.deletePlaylist(id);
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
            const pl = await Navidrome.createPlaylist(name);
            if (pl) {
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
        document.body.appendChild(t);
    }
    t.classList.remove('clickable');
    t.onclick = null;
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._t);
    t._t = setTimeout(() => t.style.opacity = '0', 2000);
}

const MAX_COVER_CACHE = 50;
const coverCacheOrder = [];
const coverCache = {};
const coverRequests = {};

function coverCacheGet(key) {
    if (!(key in coverCache)) return undefined;
    const idx = coverCacheOrder.indexOf(key);
    if (idx !== -1) { coverCacheOrder.splice(idx, 1); coverCacheOrder.push(key); }
    return coverCache[key];
}

function coverCacheSet(key, url) {
    if (key in coverCache) {
        if (coverCache[key]) URL.revokeObjectURL(coverCache[key]);
        const idx = coverCacheOrder.indexOf(key);
        if (idx !== -1) coverCacheOrder.splice(idx, 1);
    }
    coverCache[key] = url;
    coverCacheOrder.push(key);
    while (coverCacheOrder.length > MAX_COVER_CACHE) {
        const evictKey = coverCacheOrder[0];
        const evictId = evictKey.split('_')[0];
        if (qIdx >= 0 && queue[qIdx]?.id === evictId) {
            coverCacheOrder.push(coverCacheOrder.shift());
            continue;
        }
        coverCacheOrder.shift();
        if (coverCache[evictKey]) URL.revokeObjectURL(coverCache[evictKey]);
        delete coverCache[evictKey];
    }
}

function coverCacheHas(key) { return key in coverCache; }

async function ensureCoverUrl(id, size = 200) {
    const cacheKey = `${id}_${size}`;
    if (coverCacheHas(cacheKey)) return coverCacheGet(cacheKey);
    if (coverRequests[cacheKey]) return coverRequests[cacheKey];
    const track = trackMap.get(id);
    let coverUrl = track?.coverUrl || Navidrome.getCoverUrl(id);
    if (coverUrl.includes('getCoverArt')) {
        coverUrl += `&size=${size}`;
    }
    coverRequests[cacheKey] = fetch(coverUrl).then(async r => {
        if (!r.ok) return null;
        const blob = await r.blob();
        const objectUrl = URL.createObjectURL(blob);
        coverCacheSet(cacheKey, objectUrl);
        return objectUrl;
    }).catch(() => { coverCacheSet(cacheKey, null); return null; }).finally(() => { delete coverRequests[cacheKey]; });
    return coverRequests[cacheKey];
}

async function loadCover(id, el, size = 200) {
    if (!el) return;
    const url = await ensureCoverUrl(id, size);
    if (url) setCover(el, url);
}

const trackCoverObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const id = el.dataset.coverId;
        if (id) loadCover(id, el);
        trackCoverObserver.unobserve(el);
    });
}, { rootMargin: '400px' });

let artistImageCache = {};
try {
    artistImageCache = JSON.parse(localStorage.getItem('jam_artist_image_cache') || '{}');
} catch (e) {
    artistImageCache = {};
}
const artistImageRequests = {};

async function performArtistImageFetch(name) {
    if (!artistImageRequests[name]) {
        artistImageRequests[name] = fetch('/api/artist-image?name=' + encodeURIComponent(name), { headers: hget() })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d && d.picture) {
                    artistImageCache[name] = { url: d.picture, expires: Date.now() + 7 * 86400000 };
                    try {
                        localStorage.setItem('jam_artist_image_cache', JSON.stringify(artistImageCache));
                    } catch (e) { }
                    return d.picture;
                }
                return null;
            })
            .catch(() => null)
            .finally(() => { delete artistImageRequests[name]; });
    }
    return artistImageRequests[name];
}

function clearArtistImageCache() {
    Object.keys(artistImageCache).forEach(k => delete artistImageCache[k]);
    try {
        localStorage.removeItem('jam_artist_image_cache');
    } catch (e) { }
    console.log('Artist image cache cleared');
}

async function loadArtistImage(name, imgEl) {
    imgEl.style.opacity = '0';
    imgEl.style.visibility = 'visible';
    imgEl.style.transition = 'opacity 0.3s ease-in-out';

    const applyImage = (url) => {
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        imgEl.src = url;
        if (imgEl.complete) imgEl.style.opacity = '1';
    };

    const cached = artistImageCache[name];
    if (cached && cached.expires > Date.now()) { applyImage(cached.url); return; }

    const pictureUrl = await performArtistImageFetch(name);
    if (pictureUrl) {
        applyImage(pictureUrl);
    } else {
        imgEl.style.display = 'none';
    }
}

function setCover(el, url) {
    if (el.tagName === 'IMG') {
        el.src = url;
        el.onerror = () => { el.src = FALLBACK; el.onerror = null; };
    } else {
        el.innerHTML = '';
        const img = new Image();
        img.src = url;
        img.alt = '';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = el.classList.contains('thumb') ? 'cover' : 'contain';
        img.onerror = () => { img.src = FALLBACK; img.onerror = null; };
        el.appendChild(img);
    }
}

const FALLBACK = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%2326262e"/><text x="50%25" y="54%25" text-anchor="middle" fill="%237a7a8e" font-size="18">\u266A</text></svg>';

function playTrack(t, list) {
    triggerHaptic('IMPACT_LIGHT');
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
    renderQueue();
}

function setAudioMetadata(t) {
    if (audio && typeof audio.setMetadata === 'function') {
        audio.setMetadata({
            title: t.title,
            artist: t.artist,
            album: t.album,
            coverUrl: t.coverUrl || Navidrome.getCoverUrl(t.id),
            duration: t.duration,
            suffix: currentQuality === 'original' ? (t.suffix || 'flac') : 'mp3'
        });
    }
}

let _trackTransition = false;
let _lastKnownTime = 0;
let _retryCount = 0;

function play(t) {
    _lastKnownTime = 0;
    _retryCount = 0;
    seeking = false;
    updateStatusBar();
    updateMediaSession(t);
    if (audio) {
        initAudioContext(audio);
        if (audioCtx?.state === 'suspended') audioCtx.resume();
        _trackTransition = true;
        setAudioMetadata(t);
        audio.src = Navidrome.getStreamUrl(t.id);
        audio.load();
        audio.play().catch(e => console.error("Playback failed", e));
    }
    if (player) { player.classList.remove('hidden'); updatePlayerHeight(); }
    updatePlayerMetadata(t);
    updateHeartUI(t.starred);
    const pt = document.getElementById('player-thumb');
    if (pt) { pt.src = FALLBACK; loadCover(t.id, pt); }
    document.title = (t.title || '?') + ' \u00B7 ' + (t.artist || '?');
    if (timeTot) timeTot.textContent = '-';
    localStorage.setItem('music_last', JSON.stringify({ id: t.id, title: t.title, artist: t.artist, album: t.album, duration: t.duration, suffix: t.suffix || 'flac' }));
    try {
        let recent = JSON.parse(localStorage.getItem('jam_recently_played') || '[]');
        recent = recent.filter(id => id !== t.id);
        recent.unshift(t.id);
        if (recent.length > 50) recent = recent.slice(0, 50);
        localStorage.setItem('jam_recently_played', JSON.stringify(recent));
    } catch (_) { }
    saveQueueState();
    loadLyrics(t);
    updateExpandedNowPlaying(t);
    updateAdaptiveBackground();
    preloadNextTrack();
}

let nextAudio = null;
function preloadNextTrack() {
    if (qIdx + 1 < queue.length) {
        let t = queue[qIdx + 1];
        const canvasUrl = getCanvasForTrack(t);
        if (canvasUrl) fetch(canvasUrl, { method: 'HEAD' }).catch(() => { });
        let streamUrl = Navidrome.getStreamUrl(t.id);
        if (window.Capacitor?.Plugins?.AudioPlayerPlugin) {
            window.Capacitor.Plugins.AudioPlayerPlugin.preloadNext({
                url: streamUrl,
                title: t.title || '',
                artist: t.artist || '',
                album: t.album || '',
                duration: t.duration || 0,
                coverUrl: Navidrome.getCoverUrl(t.id),
                canvasUrl: canvasUrl || '',
                suffix: currentQuality === 'original' ? (t.suffix || 'flac') : 'mp3',
                starred: !!t.starred
            });
        } else {
            if (!nextAudio) {
                nextAudio = new Audio();
                nextAudio.preload = 'auto';
            }
            nextAudio.src = streamUrl;
            nextAudio.load();
        }
    }
}

function syncGaplessNextTrack() {
    if (qIdx < queue.length - 1) {
        qIdx++;
        let t = queue[qIdx];

        if (audio && typeof audio.syncSourceNatively === 'function') {
            audio.syncSourceNatively(Navidrome.getStreamUrl(t.id), {
                title: t.title,
                artist: t.artist,
                album: t.album,
                coverUrl: t.coverUrl || Navidrome.getCoverUrl(t.id),
                duration: t.duration,
                suffix: t.suffix || 'flac'
            });
        }

        _lastKnownTime = 0;
        _retryCount = 0;
        seeking = false;
        updateStatusBar();
        updateMediaSession(t);

        if (player) { player.classList.remove('hidden'); updatePlayerHeight(); }
        updatePlayerMetadata(t);
        const pt = document.getElementById('player-thumb');
        if (pt) { pt.src = FALLBACK; loadCover(t.id, pt); }
        document.title = (t.title || '?') + ' \u00B7 ' + (t.artist || '?');
        if (timeTot) timeTot.textContent = '-';
        localStorage.setItem('music_last', JSON.stringify({ id: t.id, title: t.title, artist: t.artist, album: t.album, duration: t.duration, suffix: t.suffix || 'flac' }));
        saveQueueState();
        loadLyrics(t);
        updateExpandedNowPlaying(t);
        updateAdaptiveBackground();
        updateActive();
        renderQueue();

        preloadNextTrack();
    }
}

function adjustMarquee(el) {
    if (!el) return;
    const inner = el.querySelector('.marquee-inner');
    if (!inner) return;
    el.classList.remove('marquee-bouncy');
    el.style.removeProperty('--scroll-amount');
    el.style.removeProperty('--scroll-duration');
    const containerWidth = el.clientWidth;
    const textWidth = inner.offsetWidth;
    if (textWidth > containerWidth) {
        const diff = textWidth - containerWidth;
        const speed = 40;
        const duration = Math.max(4, diff / speed) + 2;
        el.style.setProperty('--scroll-amount', `${diff}px`);
        el.style.setProperty('--scroll-duration', `${duration}s`);
        el.classList.add('marquee-bouncy');
    }
}

function adjustExpTitleMarquee() {
    adjustMarquee(expTitle);
}

window.addEventListener('resize', () => {
    if (playerExpanded) {
        adjustExpTitleMarquee();
    } else {
        adjustMarquee(document.getElementById('player-title'));
        adjustMarquee(document.getElementById('player-artist'));
    }
});

function updateExpandedNowPlaying(t) {
    if (!t) return;
    if (expTitle) {
        expTitle.innerHTML = `<span class="marquee-inner">${t.title || 'Unknown'}</span>`;
        setTimeout(adjustExpTitleMarquee, 50);
        setTimeout(adjustExpTitleMarquee, 400);
    }
    if (expArtist) renderArtistAlbumSub(expArtist, t, 'expanded-player');

    const canvasUrl = getCanvasForTrack(t);
    if (canvasUrl && !canvasDisabled && !(window.Capacitor && window.Capacitor.getPlatform() === 'ios')) {
        if (expPlayer) expPlayer.classList.add('has-canvas');
        if (expCover) expCover.style.display = 'none';
        if (expCanvas) {
            expCanvas.style.display = 'block';
            if (expCanvas.src !== canvasUrl) {
                expCanvas.src = canvasUrl;
                expCanvas.load();
                if (audio && !audio.paused) {
                    expCanvas.play().catch(e => console.log('[Canvas] Play failed:', e));
                }
            } else {
                if (audio && !audio.paused) {
                    expCanvas.play().catch(e => console.log('[Canvas] Play failed:', e));
                }
            }
        }
    } else {
        if (expPlayer) expPlayer.classList.remove('has-canvas');
        if (expCanvas) {
            expCanvas.style.display = 'none';
            expCanvas.src = '';
        }
        if (expCover) expCover.style.display = 'block';
    }

    if (expAdaptiveBtn) {
        if (canvasUrl) {
            expAdaptiveBtn.classList.toggle('active', !canvasDisabled);
        } else {
            expAdaptiveBtn.classList.toggle('active', adaptiveMode);
        }
    }

    updateHeartUI(t.starred);
    if (expCoverIcon) expCoverIcon.style.display = 'none';
    if (expCover) {
        loadCover(t.id, expCover, 600);
        expCover.onload = () => updateAdaptiveBackground();
        expCover.onerror = () => {
            if (!canvasUrl) {
                expCover.style.display = 'none';
                if (expCoverIcon) expCoverIcon.style.display = 'block';
            }
        };
    }
}

if (audio) {
    audio.addEventListener('loadedmetadata', () => {
        const d = getRealDuration();
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

    audio.addEventListener('durationchange', () => {
        if (!audio.duration || !isFinite(audio.duration)) return;
        const d = audio.duration;
        if (timeTot) timeTot.textContent = fmt(d);
        if (expTimeTot) expTimeTot.textContent = fmt(d);
    });

    function syncPlayPause(playing) {
        if (iconPlay) iconPlay.style.display = playing ? 'none' : 'block';
        if (iconPause) iconPause.style.display = playing ? 'block' : 'none';
        if (expIconPlay) expIconPlay.style.display = playing ? 'none' : 'block';
        if (expIconPause) expIconPause.style.display = playing ? 'block' : 'none';
    }

    audio.addEventListener('timeupdate', () => { _lastKnownTime = audio.currentTime; });
    audio.addEventListener('play', () => {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        syncPlayPause(true);
        updateSyncedLyricsState(true);
        const ct = queue && queue[qIdx];
        if (ct) updateMediaSession(ct);
        if (expCanvas && expCanvas.src && expCanvas.style.display !== 'none') {
            expCanvas.play().catch(e => console.log('[Canvas] Play failed:', e));
        }
    });
    audio.addEventListener('playing', () => {
        _trackTransition = false;
        _pendingBackgroundPlay = false;
        _retryCount = 0;
    });
    audio.addEventListener('pause', () => {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        if (!_trackTransition) syncPlayPause(false);
        if (expCanvas && expCanvas.style.display !== 'none') {
            expCanvas.pause();
        }
    });
    audio.addEventListener('ended', () => {
        const wasTransitioning = _trackTransition;
        _trackTransition = false;
        if (wasTransitioning) return;
        const dur = getRealDuration();
        const cur = _lastKnownTime;
        if (dur > 10 && cur < dur * 0.95) {
            if (_retryCount < 3) {
                _retryCount++;
                console.warn('[Audio] Premature stream end at', Math.round(cur) + 's', '/', Math.round(dur) + 's — retrying stream (attempt ' + _retryCount + '/3)');
                const savedPos = cur;
                const baseUrl = Navidrome.getStreamUrl(queue[qIdx].id);
                const retryUrl = `${baseUrl}&_r=${Date.now()}`;
                _trackTransition = true;
                audio.src = retryUrl;
                audio.load();
                audio.addEventListener('loadedmetadata', () => {
                    try { audio.currentTime = savedPos; } catch (e) { }
                    audio.play().catch(e => console.error("Playback retry failed:", e));
                }, { once: true });
                return;
            } else {
                console.warn('[Audio] Premature stream end retry limit reached. Advancing track.');
            }
        }
        nextTrack();
    });
    audio.addEventListener('error', () => {
        _trackTransition = false;
        console.error('Audio error on:', audio.src, audio.error?.message);
        const dur = getRealDuration();
        const cur = _lastKnownTime;
        if (dur > 10 && cur < dur * 0.95) {
            if (_retryCount < 3) {
                _retryCount++;
                console.warn('[Audio] Error mid-stream. Retrying stream (attempt ' + _retryCount + '/3)...');
                const savedPos = cur;
                const prevVol = gainNode ? gainNode.gain.value : audio.volume;
                applyVolume(0);
                const baseUrl = Navidrome.getStreamUrl(queue[qIdx].id);
                const retryUrl = `${baseUrl}&_r=${Date.now()}`;
                _trackTransition = true;
                audio.src = retryUrl;
                audio.load();

                const volRestoreTimer = setTimeout(() => applyVolume(prevVol), 5000);
                audio.addEventListener('loadedmetadata', () => {
                    clearTimeout(volRestoreTimer);
                    try { audio.currentTime = savedPos; } catch (e) { }
                    setTimeout(() => applyVolume(prevVol), 80);
                    audio.play().catch(e => console.error("Playback retry failed:", e));
                }, { once: true });
                return;
            } else {
                console.warn('[Audio] Error retry limit reached. Advancing track.');
            }
        }
        nextTrack();
    });
    audio.addEventListener('seeked', () => { seeking = false; _lastKnownTime = audio.currentTime; updateSyncedLyricsState(true, audio.currentTime); });
}

function getRealDuration() {
    const shimDur = audio?._duration;
    if (shimDur && shimDur > 0) return shimDur;
    if (audio?.duration && isFinite(audio.duration) && audio.duration > 0) return audio.duration;
    const t = queue?.[qIdx];
    return t?.duration ?? 0;
}

function setupSeekBar(el) {
    if (!el) return;
    let userPct = null;
    let lastHapticPct = -1;

    el.addEventListener('touchstart', () => { lastHapticPct = -1; triggerHaptic('SELECTION_START'); }, { passive: true });
    el.addEventListener('mousedown', () => { lastHapticPct = -1; triggerHaptic('SELECTION_START'); });

    el.oninput = () => {
        seeking = true;
        userPct = parseFloat(el.value);
        const rounded = Math.round(userPct);
        if (rounded !== lastHapticPct) {
            lastHapticPct = rounded;
            triggerHaptic('SELECTION_CHANGED');
        }
        const d = (audio && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : getRealDuration();
        if (!d) return;
        const v = d * userPct / 100;
        if (progress) progress.value = userPct;
        if (expProgress) expProgress.value = userPct;
        if (timeCur) timeCur.textContent = fmt(v);
        if (expTimeCur) expTimeCur.textContent = fmt(v);
    };

    el.onchange = () => {
        triggerHaptic('SELECTION_END');
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

[progress, expProgress].forEach(el => {
    if (!el) return;
    el.addEventListener('touchend', () => {
        setTimeout(() => { if (seeking) seeking = false; }, 300);
    });
    el.addEventListener('touchcancel', () => { seeking = false; });
    el.addEventListener('pointercancel', () => { seeking = false; });
});

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

let lastHapticVol = -1;
if (volumeSlider) {
    volumeSlider.addEventListener('touchstart', () => { lastHapticVol = -1; triggerHaptic('SELECTION_START'); }, { passive: true });
    volumeSlider.addEventListener('mousedown', () => { lastHapticVol = -1; triggerHaptic('SELECTION_START'); });
    volumeSlider.addEventListener('input', () => {
        const val = parseInt(volumeSlider.value, 10);
        if (val !== lastHapticVol) {
            lastHapticVol = val;
            triggerHaptic('SELECTION_CHANGED');
        }
        setVolume(val);
    });
    volumeSlider.addEventListener('change', () => triggerHaptic('SELECTION_END'));
    volumeSlider.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        setVolume(Math.max(0, Math.min(100, parseInt(volumeSlider.value) + delta)));
    });
}
if (volumeIcon) volumeIcon.addEventListener('click', toggleMute);

let lastHapticExpVol = -1;
if (expVolumeSlider) {
    expVolumeSlider.addEventListener('touchstart', () => { lastHapticExpVol = -1; triggerHaptic('SELECTION_START'); }, { passive: true });
    expVolumeSlider.addEventListener('mousedown', () => { lastHapticExpVol = -1; triggerHaptic('SELECTION_START'); });
    expVolumeSlider.addEventListener('input', () => {
        const val = parseInt(expVolumeSlider.value, 10);
        if (val !== lastHapticExpVol) {
            lastHapticExpVol = val;
            triggerHaptic('SELECTION_CHANGED');
        }
        setVolume(val);
    });
    expVolumeSlider.addEventListener('change', () => triggerHaptic('SELECTION_END'));
    expVolumeSlider.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        setVolume(Math.max(0, Math.min(100, parseInt(expVolumeSlider.value) + delta)));
    });
}
if (expVolumeIcon) expVolumeIcon.addEventListener('click', toggleMute);

if (expHeartBtn) {
    expHeartBtn.onclick = async () => {
        const t = queue[qIdx];
        if (!t) return;
        triggerHaptic('IMPACT_MEDIUM');
        const nextStarredState = !t.starred;
        t.starred = nextStarredState;
        updateHeartUI(nextStarredState);
        syncStarredStateNatively(nextStarredState);

        try {
            const ok = await Navidrome.starTrack(t.id, nextStarredState);
            if (ok) {
                showToast(nextStarredState ? 'Added to Favorites' : 'Removed from Favorites');
                if (currentPlaylist && currentPlaylist.id === 'smart:favorites') {
                    const tracksList = await Navidrome.getFavorites();
                    currentPlaylist.tracks = tracksList.map(x => ({ trackId: x.id, title: x.title, artist: x.artist, album: x.album }));
                    renderPlaylistDetail(currentPlaylist);
                }
            } else {
                t.starred = !nextStarredState;
                updateHeartUI(!nextStarredState);
                syncStarredStateNatively(!nextStarredState);
                showToast('Failed to update favorite status');
            }
        } catch (e) {
            console.error(e);
            t.starred = !nextStarredState;
            updateHeartUI(!nextStarredState);
            syncStarredStateNatively(!nextStarredState);
            showToast('Error updating favorite status');
        }
    };
}

const ctxFavorite = document.getElementById('ctx-favorite');
const ctxUnfavorite = document.getElementById('ctx-unfavorite');

if (ctxFavorite) {
    ctxFavorite.onclick = async () => {
        if (!ctxTrack) return;
        const t = ctxTrack;
        closeCtxMenu();
        t.starred = true;

        const currentTrack = queue[qIdx];
        if (currentTrack && currentTrack.id === t.id) {
            updateHeartUI(true);
            syncStarredStateNatively(true);
        }

        try {
            const ok = await Navidrome.starTrack(t.id, true);
            if (ok) {
                showToast('Added to Favorites');
                if (currentPlaylist && currentPlaylist.id === 'smart:favorites') {
                    const tracksList = await Navidrome.getFavorites();
                    currentPlaylist.tracks = tracksList.map(x => ({ trackId: x.id, title: x.title, artist: x.artist, album: x.album }));
                    renderPlaylistDetail(currentPlaylist);
                }
            } else {
                t.starred = false;
                if (currentTrack && currentTrack.id === t.id) {
                    updateHeartUI(false);
                    syncStarredStateNatively(false);
                }
                showToast('Failed to update favorite status');
            }
        } catch (e) {
            console.error(e);
            t.starred = false;
            if (currentTrack && currentTrack.id === t.id) {
                updateHeartUI(false);
                syncStarredStateNatively(false);
            }
            showToast('Error updating favorite status');
        }
    };
}

if (ctxUnfavorite) {
    ctxUnfavorite.onclick = async () => {
        if (!ctxTrack) return;
        const t = ctxTrack;
        closeCtxMenu();
        t.starred = false;

        const currentTrack = queue[qIdx];
        if (currentTrack && currentTrack.id === t.id) {
            updateHeartUI(false);
            syncStarredStateNatively(false);
        }

        try {
            const ok = await Navidrome.starTrack(t.id, false);
            if (ok) {
                showToast('Removed from Favorites');
                if (currentPlaylist && currentPlaylist.id === 'smart:favorites') {
                    const tracksList = await Navidrome.getFavorites();
                    currentPlaylist.tracks = tracksList.map(x => ({ trackId: x.id, title: x.title, artist: x.artist, album: x.album }));
                    renderPlaylistDetail(currentPlaylist);
                }
            } else {
                t.starred = true;
                if (currentTrack && currentTrack.id === t.id) {
                    updateHeartUI(true);
                    syncStarredStateNatively(true);
                }
                showToast('Failed to update favorite status');
            }
        } catch (e) {
            console.error(e);
            t.starred = true;
            if (currentTrack && currentTrack.id === t.id) {
                updateHeartUI(true);
                syncStarredStateNatively(true);
            }
            showToast('Error updating favorite status');
        }
    };
}

window.toggleStarCurrent = async function () {
    const t = queue[qIdx];
    if (!t) return;
    const nextStarredState = !t.starred;
    t.starred = nextStarredState;
    updateHeartUI(nextStarredState);
    syncStarredStateNatively(nextStarredState);
    try {
        const ok = await Navidrome.starTrack(t.id, nextStarredState);
        if (ok) {
            showToast(nextStarredState ? 'Added to Favorites' : 'Removed from Favorites');
            if (currentPlaylist && currentPlaylist.id === 'smart:favorites') {
                const tracksList = await Navidrome.getFavorites();
                currentPlaylist.tracks = tracksList.map(x => ({ trackId: x.id, title: x.title, artist: x.artist, album: x.album }));
                renderPlaylistDetail(currentPlaylist);
            }
        } else {
            t.starred = !nextStarredState;
            updateHeartUI(!nextStarredState);
            syncStarredStateNatively(!nextStarredState);
        }
    } catch (e) {
        t.starred = !nextStarredState;
        updateHeartUI(!nextStarredState);
        syncStarredStateNatively(!nextStarredState);
    }
};

if (btnPlay) btnPlay.onclick = () => { triggerHaptic('IMPACT_MEDIUM'); audio && (audio.paused ? audio.play() : audio.pause()); };
if (btnPrev) btnPrev.onclick = () => { triggerHaptic('IMPACT_LIGHT'); if (audio && audio.currentTime > 3) audio.currentTime = 0; else prevTrack(); };
if (btnNext) btnNext.onclick = () => { triggerHaptic('IMPACT_LIGHT'); nextTrack(); };

if (btnShuffle) {
    btnShuffle.onclick = () => {
        triggerHaptic('IMPACT_LIGHT');
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
    muted: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 8 8"><path fill="currentColor" d="M0 5V3h2l2-2v6L2 5m3-3h1l2 3H7m0-3h1L6 5H5"/></svg>`,
    low: `<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`,
    high: `<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`
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
        triggerHaptic('IMPACT_LIGHT');
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
    play(queue[qIdx]); updateActive(); renderQueue();
}

function prevTrack() {
    if (!queue.length) return;
    qIdx = (qIdx - 1 + queue.length) % queue.length;
    play(queue[qIdx]); updateActive(); renderQueue();
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

if (expPlay) expPlay.onclick = () => { triggerHaptic('IMPACT_MEDIUM'); audio && (audio.paused ? audio.play() : audio.pause()); };
if (expPrev) expPrev.onclick = () => { triggerHaptic('IMPACT_LIGHT'); if (audio && audio.currentTime > 3) audio.currentTime = 0; else prevTrack(); };
if (expNext) expNext.onclick = () => { triggerHaptic('IMPACT_LIGHT'); nextTrack(); };
if (expShuffle) expShuffle.onclick = () => btnShuffle && btnShuffle.onclick();

function scrollExpandedPlayerTo(top, behavior = 'smooth') {
    if (!expPlayer) return;
    expPlayer.scrollTo({ top, behavior });
}

let _savedScrollY = 0;

function openExpandedPlayer(options = {}) {
    const { revealLyrics = false } = options;
    playerExpanded = true;
    invalidateLyricScrollCache();

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
        if (!isMobile()) {
            updateSyncedLyricsState(true);
            return;
        }
        openLyricsCard();
        updateSyncedLyricsState(true);
        return;
    }

    closeLyricsCard();
    requestAnimationFrame(() => scrollExpandedPlayerTo(0, 'auto'));
    updateSyncedLyricsState(true);
}

function closeExpandedPlayer() {
    playerExpanded = false;
    invalidateLyricScrollCache();

    document.body.classList.remove('player-open');
    document.documentElement.classList.remove('player-open');
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, _savedScrollY);

    if (expPlayer) { expPlayer.classList.remove('open'); expPlayer.style.background = ''; }
    closeLyricsCard();
    setDesktopExpandedLyricsOpen(false);
    updateStatusBar();
}

if (expCollapse) expCollapse.onclick = closeExpandedPlayer;
if (expDesktopCollapse) expDesktopCollapse.onclick = closeExpandedPlayer;
if (expPlayer) expPlayer.addEventListener('click', e => { if (e.target === expPlayer) closeExpandedPlayer() });

function setDesktopExpandedLyricsOpen(open) {
    desktopExpandedLyricsOpen = !!open;
    invalidateLyricScrollCache();
    if (expPlayer) expPlayer.classList.toggle('desktop-lyrics-open', desktopExpandedLyricsOpen);
    if (expContent) expContent.classList.toggle('desktop-lyrics-open', desktopExpandedLyricsOpen);
    if (expLyricsToggle) expLyricsToggle.classList.toggle('active', desktopExpandedLyricsOpen);
    if (desktopExpandedLyricsOpen) {
        if (expDesktopLyricsScroll && !expDesktopLyricsScroll.querySelector('.lyric-line')) {
            if (syncedLyrics.length) renderSyncedLyrics();
            else if (plainLyrics) renderPlainLyrics();
        }
        updateSyncedLyricsState(true);
        requestAnimationFrame(() => scrollExpandedPlayerTo(0, 'auto'));
        setTimeout(() => {
            if (expDesktopLyricsScroll) {
                const activeLine = expDesktopLyricsScroll.querySelector('.lyric-line.active');
                if (activeLine) {
                    const top = activeLine.offsetTop - expDesktopLyricsScroll.clientHeight / 2 + activeLine.offsetHeight / 2;
                    expDesktopLyricsScroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                }
            }
        }, 400);
    }
}

let swipeStartX = 0, swipeStartY = 0, swipeDeltaY = 0, swipeStartTime = 0, isPanelSwiping = false, swipeTarget = null;
const SWIPE_THRESHOLD = 50;

if (player) {
    player.addEventListener('touchstart', e => {
        if (e.target.tagName === 'INPUT' || !isMobile()) return;
        if (window.innerHeight - e.touches[0].clientY < 30) return;
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
        if (expPlayer.scrollTop > 5) { swipeTarget = null; isPanelSwiping = false; return; }
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
    } else if (swipeTarget === 'queue-swipe' && swipeDeltaY > 0) {
        const translate = Math.max(0, Math.min(100, 40 + (swipeDeltaY / window.innerHeight) * 100));
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
        if ((isFlick && swipeDeltaY < 0) || (isPastThreshold && swipeDeltaY < -SWIPE_THRESHOLD)) openExpandedPlayer();
    } else if (swipeTarget === 'collapse') {
        expPlayer.classList.remove('swiping');
        expPlayer.style.transform = '';
        if ((isFlick && swipeDeltaY > 0) || (isPastThreshold && swipeDeltaY > SWIPE_THRESHOLD)) closeExpandedPlayer();
    } else if (swipeTarget === 'queue-swipe') {
        queuePanel.classList.remove('swiping');
        queuePanel.style.transform = '';
        const finalTranslate = 40 + (swipeDeltaY / window.innerHeight) * 100;
        if ((isFlick && swipeDeltaY > 0 && finalTranslate > 55) || finalTranslate > 70) closeQueuePanel();
    }
    swipeTarget = null;
}, { passive: true });

document.addEventListener('touchcancel', () => {
    if (!isPanelSwiping) return;
    isPanelSwiping = false;
    if (swipeTarget === 'expand' && expPlayer) { expPlayer.classList.remove('swiping'); expPlayer.style.transform = ''; }
    else if (swipeTarget === 'collapse' && expPlayer) { expPlayer.classList.remove('swiping'); expPlayer.style.transform = ''; }
    else if (swipeTarget === 'queue-swipe' && queuePanel) { queuePanel.classList.remove('swiping'); queuePanel.style.transform = ''; }
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
        if (e.touches[0].clientX > 30) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        deltaX = 0; active = false;
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
            if (Math.abs(deltaY) > 15 && Math.abs(deltaY) > Math.abs(deltaX)) { startX = null; return; }
            if (deltaX > 10) { active = true; el.style.transition = 'none'; }
        }
        if (active && deltaX > 0) { if (e.cancelable) e.preventDefault(); el.style.transform = `translate3d(${deltaX}px,0,0)`; }
    }, { passive: false });

    el.addEventListener('touchend', () => {
        if (!active) { startX = null; return; }
        active = false;
        const vel = velocity();
        if (deltaX > 90 || vel > 0.4) {
            el.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 1, 1)';
            el.style.transform = 'translate3d(100vw,0,0)';
            setTimeout(() => { onBack(); el.style.transform = ''; el.style.transition = ''; }, 260);
        } else {
            el.style.transition = 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.075)';
            el.style.transform = 'translate3d(0,0,0)';
            setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 400);
        }
        startX = null;
    }, { passive: true });

    el.addEventListener('touchcancel', () => {
        if (active) {
            el.style.transition = 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.075)';
            el.style.transform = 'translate3d(0,0,0)';
            setTimeout(() => { el.style.transform = ''; el.style.transition = ''; }, 400);
        }
        active = false; startX = null;
    }, { passive: true });
}

bindBackSwipe(playlistDetail, closePlaylistDetail, () => !!currentPlaylist);
bindBackSwipe(trackList, closeDetailView, () => !!currentDetailView);

function closeQueuePanel() {
    queueOpen = false;
    if (queuePanel) { queuePanel.classList.remove('open'); queuePanel.style.transform = ''; }
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
const queueScrollArea = document.getElementById('queue-scroll-area');
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

if (queuePanel) queuePanel.style.height = isMobile() ? '' : queueH + 'px';

if (queueBtn) {
    queueBtn.onclick = () => {
        queueOpen = !queueOpen;
        if (queueOpen) {
            if (queuePanel) queuePanel.classList.add('open');
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
        if (queuePanel) queuePanel.classList.add('open');
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
        if (queueScrollArea && queueScrollArea.scrollTop > 20 && !e.target.closest('#queue-panel-mobile-handle')) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeStartTime = Date.now();
        swipeDeltaY = 0;
        isPanelSwiping = true;
        swipeTarget = 'queue-swipe';
    }, { passive: true });
}

function renderQueue(skipScroll = false) {
    if (window.Capacitor?.Plugins?.AudioPlayerPlugin) {
        window.Capacitor.Plugins.AudioPlayerPlugin.updateQueue({ queue: queue, queueIndex: qIdx });
    }
    if (!queueScrollArea) return;
    queueScrollArea.innerHTML = '';

    if (!queue.length) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'padding:40px 20px;text-align:center;color:var(--muted);font-size:13px';
        emptyDiv.textContent = 'Queue is empty';
        queueScrollArea.appendChild(emptyDiv);
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
        content.innerHTML = `<span class="queue-handle">\u283f</span><span class="queue-num">${i === qIdx ? '\u25b6' : i + 1}</span><div class="queue-info"><div class="queue-title">${t.title || 'Unknown'}</div><div class="queue-sub"></div></div><button class="queue-remove" title="remove">\u2715</button>`;
        const qSub = content.querySelector('.queue-sub');
        renderArtistAlbumSub(qSub, t, 'queue');
        item.appendChild(content);

        const handle = content.querySelector('.queue-handle');
        if (handle) handle.onpointerdown = e => startQueueDrag(e, item);

        content.querySelector('.queue-remove').onclick = e => { e.stopPropagation(); removeFromQueue(i); };

        if (isMobile()) {
            attachSwipeHandlers(item, content, actionsBg, {
                left: {
                    action: () => { item.style.opacity = '0.5'; setTimeout(() => removeFromQueue(i), 200); },
                    icon: SWIPE_ICONS.trash
                }
            });
        }

        item.onclick = (e) => {
            if (e.target.closest('.queue-handle') || item.style.opacity === '0.5') return;
            qIdx = i; play(queue[qIdx]); updateActive(); renderQueue();
        };
        queueScrollArea.appendChild(item);
    });

    if (!skipScroll) {
        const scrollToActive = () => {
            const activeEl = queueScrollArea.querySelector('.queue-item.active');
            if (activeEl && queueScrollArea.clientHeight > 0) {
                const top = activeEl.offsetTop - queueScrollArea.clientHeight / 2 + activeEl.offsetHeight / 2;
                queueScrollArea.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
            }
        };
        setTimeout(scrollToActive, 350);
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
        const items = [...queueScrollArea.querySelectorAll('.queue-item')];
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
        const items = [...queueScrollArea.querySelectorAll('.queue-item')];
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
            let coverUrl = t.coverUrl || Navidrome.getCoverUrl(t.id);
            navigator.mediaSession.metadata = new MediaMetadata({
                title: t.title || 'Unknown',
                artist: t.artist || 'Unknown',
                album: t.album || 'Unknown',
                artwork: [{ src: coverUrl, sizes: '512x512', type: 'image/jpeg' }]
            });
        }
        navigator.mediaSession.setActionHandler('play', async () => {
            if (!audio) return;
            if (audioCtx?.state === 'suspended') await audioCtx.resume();
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
                navigator.mediaSession.setPositionState({ duration: dur, playbackRate: audio ? audio.playbackRate : 1, position: pos });
            } catch (e) { }
        }
    } catch (e) { console.error('Failed to update MediaSession:', e); }
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
            lyricsOpen ? document.getElementById('lyrics-scroll') : null,
            (playerExpanded && lyricsCardOpen) ? document.getElementById('exp-lyrics-card-scroll') : null,
            (playerExpanded && desktopExpandedLyricsOpen) ? expDesktopLyricsScroll : null,
        ].filter(Boolean);
    }
    return _lyricScrollEls;
}

function invalidateLyricScrollCache() { _lyricScrollEls = null; }

function applyLyricsFontSize() {
    const val = lyricsFontSize + 'px';
    getLyricScrollEls().forEach(el => { el.style.fontSize = val; });
}

function bindLyricsFontChange(btnId, delta) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.onclick = e => {
        e.stopPropagation();
        lyricsFontSize = delta > 0 ? Math.min(40, lyricsFontSize + delta) : Math.max(16, lyricsFontSize + delta);
        localStorage.setItem('lyrics_font', lyricsFontSize);
        applyLyricsFontSize();
    };
}

bindLyricsFontChange('lyrics-font-up', 1);
bindLyricsFontChange('lyrics-font-down', -1);
bindLyricsFontChange('lyrics-font-up-desktop', 1);
bindLyricsFontChange('lyrics-font-down-desktop', -1);

const expLyricsCard = document.getElementById('exp-lyrics-card');
const expLyricsCardHeader = document.getElementById('exp-lyrics-card-header');
const expLyricsCardControls = document.getElementById('exp-lyrics-card-controls');
let lyricsCardOpen = false;

function openLyricsCard(open) {
    lyricsCardOpen = open !== undefined ? !!open : true;
    invalidateLyricScrollCache();
    if (expLyricsCard) expLyricsCard.classList.toggle('open', lyricsCardOpen);
    if (expLyricsCardControls) expLyricsCardControls.style.display = lyricsCardOpen ? 'flex' : 'none';
    if (expLyricsWrap) expLyricsWrap.style.display = lyricsCardOpen ? 'none' : '';

    if (lyricsCardOpen) {
        const cardScroll = document.getElementById('exp-lyrics-card-scroll');

        if (cardScroll && !cardScroll.querySelector('.lyric-line')) {
            if (syncedLyrics.length) renderSyncedLyrics();
            else if (plainLyrics) renderPlainLyrics();
        }
        updateSyncedLyricsState(true);
        requestAnimationFrame(() => {
            if (expPlayer && expLyricsCard) {
                const top = expLyricsCard.offsetTop - 16;
                expPlayer.scrollTo({ top, behavior: isMobile() ? 'smooth' : 'auto' });
            }
        });

        setTimeout(() => {
            if (cardScroll) {
                const activeLine = cardScroll.querySelector('.lyric-line.active');
                if (activeLine) {
                    const lineTop = activeLine.offsetTop - cardScroll.clientHeight / 2 + activeLine.offsetHeight / 2;
                    cardScroll.scrollTo({ top: Math.max(0, lineTop), behavior: 'smooth' });
                } else {
                    cardScroll.scrollTop = 0;
                }
            }
        }, isMobile() ? 400 : 100);
    }
}

function closeLyricsCard() {
    if (!expLyricsCard) return;
    lyricsCardOpen = false;
    invalidateLyricScrollCache();
    expLyricsCard.classList.remove('open');
    if (expLyricsCardControls) expLyricsCardControls.style.display = 'none';
    if (expLyricsWrap) expLyricsWrap.style.display = 'flex';
}

function toggleLyricsCard() { lyricsCardOpen ? closeLyricsCard() : openLyricsCard(); }

if (expLyricsCardHeader) {
    expLyricsCardHeader.addEventListener('click', e => {
        if (e.target.closest('button, #exp-lyrics-card-controls')) return;
        toggleLyricsCard();
    });
}

if (expLyricsCardControls) expLyricsCardControls.addEventListener('click', e => e.stopPropagation());

if (expLyricsToggle) {
    expLyricsToggle.onclick = () => {
        if (isMobile()) { openLyricsCard(); return; }
        setDesktopExpandedLyricsOpen(!desktopExpandedLyricsOpen);
    };
}

if (lyricsBtn) {
    lyricsBtn.onclick = () => {
        if (mobileQuery.matches) {
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
        startX = e.clientX; startY = e.clientY;
        const rect = lyricsPanel.getBoundingClientRect();
        initialLeft = rect.left; initialTop = rect.top;
        lyricsPanel.style.bottom = 'auto'; lyricsPanel.style.right = 'auto';
        lyricsPanel.style.left = initialLeft + 'px'; lyricsPanel.style.top = initialTop + 'px';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    function onMouseMove(e) {
        if (!isDragging) return;
        lyricsPanel.style.left = (initialLeft + e.clientX - startX) + 'px';
        lyricsPanel.style.top = (initialTop + e.clientY - startY) + 'px';
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
        invalidateLyricScrollCache();
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
    if (expLyricsWrap) { expLyricsWrap.style.display = 'flex'; expLyricsWrap.style.flex = ''; }

    try {
        const rawTitle = (t.title || '').trim();
        const cq = new URLSearchParams({ title: rawTitle, artist: t.artist || '' });
        const cr = await fetch(`/api/lyrics/curated?${cq}`, { headers: token ? { 'x-auth-token': token } : {} });
        if (cr.ok) {
            const cData = await cr.json();
            if (cData.exists && cData.lrclibId) {
                const sq = new URLSearchParams({ id: cData.lrclibId });
                const sr = await fetch(`/api/lyrics/search?${sq}`, { headers: token ? { 'x-auth-token': token } : {} });
                if (sr.ok) {
                    const sItems = await sr.json();
                    if (requestSeq !== lyricsRequestSeq || lyricsTrackId !== t.id) return;
                    const match = sItems.find(i => i.id === cData.lrclibId);
                    if (match) { applyLyricsPick(match); return; }
                }
            }
        }

        const savedPick = getSavedLyricsPick(t.id);
        if (savedPick) {
            const sq = new URLSearchParams({ title: rawTitle, artist: t.artist || '' });
            const sr = await fetch(`/api/lyrics/search?${sq}`, { headers: token ? { 'x-auth-token': token } : {} });
            if (sr.ok) {
                const sItems = await sr.json();
                if (requestSeq !== lyricsRequestSeq || lyricsTrackId !== t.id) return;
                const match = sItems.find(i => i.id === savedPick.id);
                if (match) { applyLyricsPick(match); return; }
            }
        }

        const q = new URLSearchParams({ title: rawTitle, artist: t.artist || '', album: t.album || '' });
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
            if (expLyricsWrap) { expLyricsWrap.style.display = 'none'; expLyricsWrap.style.flex = '0'; }
            setLyricsMessage("No lyrics found", "");
            if (plTitle) plTitle.textContent = 'Lyrics';
            if (cardTitle) cardTitle.textContent = 'Lyrics';
            if (desktopTitle) desktopTitle.textContent = 'Lyrics';
        }
    } catch (_) {
        if (requestSeq !== lyricsRequestSeq || lyricsTrackId !== t.id) return;
        lyricsFailed.add(t.id);
        if (expLyricsWrap) { expLyricsWrap.style.display = 'none'; expLyricsWrap.style.flex = '0'; }
        setLyricsMessage("No lyrics found", "");
    }
}

const LYRICS_PICK_KEY = 'lyrics_pick';
const lyricsPickerBtn = document.getElementById('lyrics-picker-btn');
const lyricsPickerDropdown = document.getElementById('lyrics-picker-dropdown');
let lyricsPickerOpen = false;

function getSavedLyricsPick(trackId) {
    try { const picks = JSON.parse(localStorage.getItem(LYRICS_PICK_KEY) || '{}'); return picks[trackId] || null; }
    catch (_) { return null; }
}

function saveLyricsPick(trackId, pick) {
    try {
        const picks = JSON.parse(localStorage.getItem(LYRICS_PICK_KEY) || '{}');
        if (pick) picks[trackId] = pick; else delete picks[trackId];
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
    } catch (e) { console.error('[curated] Error:', e); return false; }
}

function applyLyricsPick(item, manual = false) {
    if (!audio) return;
    const t = trackMap.get(lyricsTrackId);
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
    if (manual) saveCuratedPick(t.artist || '', t.title || '', item.id);
}

function closeLyricsPicker() {
    lyricsPickerOpen = false;
    if (lyricsPickerBtn) lyricsPickerBtn.classList.remove('open');
    if (lyricsPickerDropdown) { lyricsPickerDropdown.classList.remove('open'); lyricsPickerDropdown.innerHTML = ''; }
}

async function openLyricsPicker() {
    if (lyricsPickerOpen) { closeLyricsPicker(); return; }
    lyricsPickerOpen = true;
    if (lyricsPickerBtn) lyricsPickerBtn.classList.add('open');
    if (!lyricsPickerDropdown) return;

    lyricsPickerDropdown.innerHTML = '<div class="lyrics-picker-loading">Searching\u2026</div>';
    lyricsPickerDropdown.classList.add('open');

    const t = trackMap.get(lyricsTrackId);
    if (!t) { closeLyricsPicker(); return; }

    try {
        const rawTitle = (t.title || '').trim();
        const q = new URLSearchParams({ title: rawTitle, artist: t.artist || '' });
        const r = await fetch(`/api/lyrics/search?${q}`, { headers: token ? { 'x-auth-token': token } : {} });
        if (!r.ok) throw new Error('search failed');
        const items = await r.json();
        if (!lyricsPickerOpen) return;
        if (!items.length) { lyricsPickerDropdown.innerHTML = '<div class="lyrics-picker-empty">No results found</div>'; return; }

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
                if (item) applyLyricsPick(item, true);
                closeLyricsPicker();
            });
        });
    } catch (_) {
        if (lyricsPickerOpen) lyricsPickerDropdown.innerHTML = '<div class="lyrics-picker-empty">Search failed</div>';
    }
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

if (lyricsPickerBtn) lyricsPickerBtn.addEventListener('click', (e) => { e.stopPropagation(); openLyricsPicker(); });

document.addEventListener('click', (e) => {
    if (lyricsPickerOpen && !lyricsPickerDropdown?.contains(e.target)) closeLyricsPicker();
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
            div.onclick = (function (t) { return function () { if (audio) { seeking = true; audio.currentTime = t; updateSyncedLyricsState(true, t); } }; })(l.time);
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
    if (!syncedLyrics.length && !plainLyrics && !force) return;

    const anyVisible = playerExpanded || lyricsOpen;

    if (!anyVisible && !force && syncedLyrics.length) {
        const baseTime = atTime !== null ? atTime : (audio?.currentTime || 0);
        const t = baseTime;
        lastExpLyricIdx = syncedLyrics.findIndex((l, i) => {
            const n = syncedLyrics[i + 1];
            return t >= l.time && (!n || t < n.time);
        });
        return;
    }

    if (!syncedLyrics.length) {
        if (plainLyrics) return;
        const isLoading = expLyricCur && expLyricCur.querySelector('.loading-ring, .loading-dots');
        if (expLyricCur && !isLoading) {
            clearTimeout(lyricUpdateTimers.cur);
            expLyricCur.style.opacity = '0';
            lyricUpdateTimers.cur = setTimeout(() => { expLyricCur.innerHTML = '<span class="loading-dots"></span>'; expLyricCur.style.opacity = '1' }, 100);
        }
        if (expLyricNext) {
            clearTimeout(lyricUpdateTimers.next);
            expLyricNext.style.opacity = '0';
            lyricUpdateTimers.next = setTimeout(() => { expLyricNext.textContent = ''; expLyricNext.style.opacity = '1' }, 100);
        }
        return;
    }

    const FADE_LOOKAHEAD = force ? 0 : 0.10;
    const baseTime = atTime !== null ? atTime : (audio?.currentTime || 0);
    const t = baseTime + FADE_LOOKAHEAD;
    const idx = syncedLyrics.findIndex((l, i) => { const n = syncedLyrics[i + 1]; return t >= l.time && (!n || t < n.time) });
    if (!force && idx === lastExpLyricIdx) return;
    lastExpLyricIdx = idx;

    const curText = idx >= 0 ? (syncedLyrics[idx].text || '<span class="loading-dots"></span>') : '<span class="loading-dots"></span>';
    const nextText = idx >= 0 && syncedLyrics[idx + 1] ? (syncedLyrics[idx + 1].text || '·') : '';

    const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
    if (plugin && typeof plugin.updateLyrics === 'function') {
        let plainCur = idx >= 0 ? (syncedLyrics[idx].text || '') : '';
        let plainNext = idx >= 0 && syncedLyrics[idx + 1] ? (syncedLyrics[idx + 1].text || '') : '';
        if (!syncedLyrics.length && plainLyrics) {
            plainCur = "No synced lyrics available";
            plainNext = "";
        }
        plugin.updateLyrics({ current: plainCur, next: plainNext, all: syncedLyrics });
    }

    if (expLyricCur) {
        clearTimeout(lyricUpdateTimers.cur);
        if (force) {
            expLyricCur.innerHTML = curText; expLyricCur.style.opacity = '1'; expLyricCur.style.transform = 'translateY(0)';
        } else {
            expLyricCur.style.opacity = '0'; expLyricCur.style.transform = 'translateY(6px)';
            lyricUpdateTimers.cur = setTimeout(() => { expLyricCur.innerHTML = curText; expLyricCur.style.opacity = '1'; expLyricCur.style.transform = 'translateY(0)' }, 100);
        }
    }
    if (expLyricNext) {
        clearTimeout(lyricUpdateTimers.next);
        if (force) {
            expLyricNext.textContent = nextText; expLyricNext.style.opacity = '1'; expLyricNext.style.transform = 'translateY(0)';
        } else {
            expLyricNext.style.opacity = '0'; expLyricNext.style.transform = 'translateY(6px)';
            lyricUpdateTimers.next = setTimeout(() => { expLyricNext.textContent = nextText; expLyricNext.style.opacity = '1'; expLyricNext.style.transform = 'translateY(0)' }, 100);
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
            if (elBottom >= scrollTop && elTop <= scrollBottom) shouldScroll = true;
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
            if (timeCur) timeCur.textContent = fmt(audio.currentTime);
            if (expTimeCur) expTimeCur.textContent = fmt(audio.currentTime);
        }
        updateSyncedLyricsState();
    });

    let rafId = null;
    let _lastRafTime = 0;
    const tickProgress = (timestamp) => {
        if (timestamp - _lastRafTime >= 33) {
            _lastRafTime = timestamp;
            const d = getRealDuration();
            if (!seeking && d && !audio.paused) {
                const pct = (audio.currentTime / d) * 100;
                if (progress) progress.value = pct;
                if (expProgress) expProgress.value = pct;
            }
        }
        rafId = requestAnimationFrame(tickProgress);
    };

    audio.addEventListener('trackAdvancedNatively', () => {
        if (_trackTransition) return;
        syncGaplessNextTrack();
    });

    audio.addEventListener('play', () => {
        cancelAnimationFrame(rafId);
        _lastRafTime = 0;
        rafId = requestAnimationFrame(tickProgress);
    });
    audio.addEventListener('pause', () => cancelAnimationFrame(rafId));
    audio.addEventListener('ended', () => cancelAnimationFrame(rafId));
}

function escAttr(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }


const MAX_DOMINANT_COLOR_CACHE = 50;
const _dominantColorCache = new Map();
let _dominantColorCanvas = null;
let _dominantColorCtx = null;

function getDominantColor(img) {
    const key = img.src || img.currentSrc;
    if (key && _dominantColorCache.has(key)) return _dominantColorCache.get(key);

    if (!_dominantColorCanvas) {
        _dominantColorCanvas = document.createElement('canvas');
        _dominantColorCanvas.width = 64;
        _dominantColorCanvas.height = 64;
        _dominantColorCtx = _dominantColorCanvas.getContext('2d', { willReadFrequently: true });
    }
    const canvas = _dominantColorCanvas;
    const ctx = _dominantColorCtx;
    const size = 64;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    const BUCKETS = 12;
    const buckets = Array.from({ length: BUCKETS }, () => ({ r: 0, g: 0, b: 0, count: 0 }));
    let fallR = 0, fallG = 0, fallB = 0, fallCount = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const delta = max - min;
        const lightness = (max + min) / 2;
        if (lightness < 20 || lightness > 240 || delta < 25) continue;
        let hue = 0;
        if (delta > 0) {
            if (max === r) hue = ((g - b) / delta + 6) % 6;
            else if (max === g) hue = (b - r) / delta + 2;
            else hue = (r - g) / delta + 4;
        }
        const bucketIdx = Math.min(Math.floor(hue / 6 * BUCKETS), BUCKETS - 1);
        buckets[bucketIdx].r += r; buckets[bucketIdx].g += g; buckets[bucketIdx].b += b; buckets[bucketIdx].count++;
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
        let tr = 0, tg = 0, tb = 0, tc = data.length / 4;
        for (let i = 0; i < data.length; i += 4) { tr += data[i]; tg += data[i + 1]; tb += data[i + 2]; }
        bestR = Math.round(tr / tc); bestG = Math.round(tg / tc); bestB = Math.round(tb / tc);
    }

    const lum = (0.299 * bestR + 0.587 * bestG + 0.114 * bestB) / 255;
    const factor = 0.25 + lum * 0.25;
    const result = `rgb(${Math.round(bestR * factor)}, ${Math.round(bestG * factor)}, ${Math.round(bestB * factor)})`;

    if (key) {
        if (_dominantColorCache.size >= MAX_DOMINANT_COLOR_CACHE) {
            _dominantColorCache.delete(_dominantColorCache.keys().next().value);
        }
        _dominantColorCache.set(key, result);
    }
    return result;
}

async function updateAdaptiveBackground() {
    if (!adaptiveMode || !playerExpanded || !expCover || expCover.style.display === 'none') {
        if (expPlayer) { expPlayer.classList.remove('adaptive'); expPlayer.style.background = ''; }
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
        } catch (e) { }
    };
    if (imgEl.complete && imgEl.naturalWidth !== 0) apply();
    else imgEl.addEventListener('load', apply, { once: true });
}

if (expAdaptiveBtn) {
    expAdaptiveBtn.classList.toggle('active', adaptiveMode);
    expAdaptiveBtn.onclick = () => {
        const currentTrack = qIdx >= 0 ? queue[qIdx] : null;
        const canvasUrl = currentTrack ? getCanvasForTrack(currentTrack) : null;
        if (canvasUrl) {
            canvasDisabled = !canvasDisabled;
            localStorage.setItem('canvas_disabled', canvasDisabled);
            expAdaptiveBtn.classList.toggle('active', !canvasDisabled);
            updateExpandedNowPlaying(currentTrack);
            updateAdaptiveBackground();
            notifyNativePlaybackState();
        } else {
            adaptiveMode = !adaptiveMode;
            localStorage.setItem('adaptive_mode', adaptiveMode);
            expAdaptiveBtn.classList.toggle('active', adaptiveMode);
            updateAdaptiveBackground();
        }
    };
}

async function init() {
    try {
        const last = JSON.parse(localStorage.getItem('music_last') || 'null');
        if (last && last.id && (last.id.includes('/') || last.id.includes('%') || /\.(mp3|flac|wav|m4a|ogg)$/i.test(last.id))) {
            console.log('[App] Stale R2 track ID detected in localStorage, clearing saved queue/playback state');
            localStorage.removeItem('music_last');
            localStorage.removeItem('music_queue');
            localStorage.removeItem('music_pos');
            localStorage.removeItem('music_qidx');
        }
    } catch (_) { }

    if (navigator.audioSession) {
        try { navigator.audioSession.type = 'playback'; }
        catch (e) { console.error('[AudioSession] Failed to set type:', e); }
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
        const dockSearch = document.getElementById('dock-search');
        const floatingSearchWrap = document.getElementById('floating-search-wrap');
        const floatingSearchClose = document.getElementById('floating-search-close');
        if (dockSearch) {
            dockSearch.onclick = (e) => {
                e.stopPropagation();
                floatingSearchWrap.style.display = 'flex';
                if (searchEl) searchEl.focus();
            };
        }
        if (floatingSearchClose) {
            floatingSearchClose.onclick = (e) => {
                e.stopPropagation();
                floatingSearchWrap.style.display = 'none';
                if (searchEl && searchEl.value !== '') { searchEl.value = ''; applyFilter(); }
            };
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

    const lastTrackData = JSON.parse(localStorage.getItem('music_last') || 'null');

    await Promise.all([loadTracks(), loadPlaylists(), loadCanvasMap()]);

    if (lastTrackData?.id) {
        ensureCoverUrl(lastTrackData.id);
        if (audio) {
            const alreadySet = audio.src?.includes(lastTrackData.id);
            if (!alreadySet) {
                audio.preload = 'auto';
                setAudioMetadata(lastTrackData);
                audio.src = Navidrome.getStreamUrl(lastTrackData.id);
                audio.load();
            }
        }
    }

    try {
        const last = JSON.parse(localStorage.getItem('music_last') || 'null');
        const pos = parseFloat(localStorage.getItem('music_pos') || '0');
        const savedQueueIds = JSON.parse(localStorage.getItem('music_queue') || '[]');
        const savedQIdx = parseInt(localStorage.getItem('music_qidx') || '0');

        if (last && last.id) {
            const t = trackMap.get(last.id) || last;
            if (savedQueueIds.length) {
                queue = savedQueueIds.map(id => trackMap.get(id)).filter(Boolean);
                qIdx = Math.min(savedQIdx, queue.length - 1);
                if (!queue.length) { queue = [t]; qIdx = 0; }
            } else {
                queue = [t]; qIdx = 0;
            }
            if (player) { player.classList.remove('hidden'); updatePlayerHeight(); }
            updatePlayerMetadata(t);
            updateHeartUI(t.starred);
            const pt = document.getElementById('player-thumb');
            if (pt) { pt.src = FALLBACK; loadCover(t.id, pt); }
            document.title = (t.title || '?') + ' \u00B7 ' + (t.artist || '?');

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
                const alreadyBuffering = audio.src && audio.src.includes(t.id);
                if (!alreadyBuffering) {
                    audio.preload = 'auto';
                    setAudioMetadata(t);
                    audio.src = Navidrome.getStreamUrl(t.id);
                    audio.load();
                }
                updateMediaSession(t);
                let restored = false;
                const restorePos = () => {
                    if (restored) return;
                    if (!audio.src.includes(t.id)) { cleanupRestore(); return; }
                    const d = (audio.duration && isFinite(audio.duration)) ? audio.duration : (t.duration || 0);
                    if (pos > 0 && d && pos < d - 5) { try { audio.currentTime = pos; } catch (e) { } }
                    restored = true;
                    cleanupRestore();
                };
                const cleanupRestore = () => { audio.removeEventListener('playing', restorePos); };
                audio.addEventListener('playing', restorePos);
            } else {
                updateMediaSession(t);
            }
        }
    } catch (_) { }

    renderQueue(true);
    notifyNativePlaybackState();
}

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const trackRow = e.target.closest('.track');
    const playlistCard = e.target.closest('.playlist-card');
    const suggestedCard = e.target.closest('.suggested-card');
    if (trackRow) {
        const trackId = trackRow.dataset.id;
        const trackData = trackMap.get(trackId);
        if (trackData) openCtxMenu(e, trackData);
    } else if (suggestedCard) {
        const trackId = suggestedCard.dataset.id;
        const trackData = trackMap.get(trackId);
        if (trackData) openCtxMenu(e, trackData);
    } else if (playlistCard) {
        const plId = playlistCard.dataset.id;
        const plData = playlists.find(x => x.id === plId);
        if (plData) openPlaylistCtxMenu(e, plData);
    } else {
        closeCtxMenu();
    }
});

document.addEventListener('mouseup', () => { isSelecting = false; });
window.addEventListener('beforeunload', cleanup);

let wasPlayingBeforeHidden = false;
let _pendingBackgroundPlay = false;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) { wasPlayingBeforeHidden = audio && !audio.paused; return; }

    if (_pendingBackgroundPlay && audio && audio.paused && audio.src) {
        const pos = parseFloat(localStorage.getItem('music_pos') || '0');
        audio.play().catch(() => {
            const src = audio.src;
            audio.src = src; audio.load();
            if (pos > 0) audio.addEventListener('loadedmetadata', () => { audio.currentTime = pos; }, { once: true });
            audio.play().catch(e => console.error('Recovery after foreground failed:', e));
        });
    }
    _pendingBackgroundPlay = false;

    if (wasPlayingBeforeHidden && audio && audio.paused && audio.src) {
        audio.play().catch(e => console.error('Resume after visibility change failed:', e));
    }
    wasPlayingBeforeHidden = false;

    if ('mediaSession' in navigator && audio) navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';

    const ep = document.getElementById('expanded-player');
    if (ep && !ep.classList.contains('open')) {
        ep.style.transition = 'none';
        ep.style.transform = 'translateY(110%)';
        ep.style.visibility = 'hidden';
        requestAnimationFrame(() => { requestAnimationFrame(() => { ep.style.transition = ''; ep.style.transform = ''; ep.style.visibility = ''; }); });
    }
});

document.addEventListener('freeze', () => { wasPlayingBeforeHidden = audio && !audio.paused; });

document.addEventListener('resume', () => {
    if (wasPlayingBeforeHidden && audio && audio.paused && audio.src) audio.play().catch(e => console.error('Resume after freeze failed:', e));
    wasPlayingBeforeHidden = false;
});

window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    if (wasPlayingBeforeHidden && audio && audio.paused && audio.src) audio.play().catch(e => console.error('Resume after BFCache restore failed:', e));
});

const APP_VERSION = '2026.04.24';
let swRegistration = null;

console.log('[App] Version:', APP_VERSION);

function activateUpdate() {
    if (!swRegistration?.waiting) { console.log('[SW] No update waiting'); return; }
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

window.removeTrack = async function (query) {
    if (!query) { console.error("Please provide a track title, artist, album, key, or ID to match."); return; }
    const queryStr = String(query).toLowerCase();
    const matches = tracks.filter(t => {
        return t.key.toLowerCase().includes(queryStr) || t.id.toLowerCase() === queryStr ||
            (t.title && t.title.toLowerCase().includes(queryStr)) ||
            (t.artist && t.artist.toLowerCase().includes(queryStr)) ||
            (t.album && t.album.toLowerCase().includes(queryStr));
    });
    if (matches.length === 0) { console.warn("No tracks found matching query:", query); return; }
    console.log(`Found ${matches.length} matching track(s):`);
    matches.forEach(t => console.log(` - [${t.id}] ${t.title} by ${t.artist} (${t.key})`));
    if (!confirm(`Are you sure you want to remove these ${matches.length} track(s) from your library?`)) { console.log("Removal cancelled."); return; }
    let successCount = 0;
    for (const track of matches) {
        try {
            const res = await fetch(`/api/tracks?key=${encodeURIComponent(track.key)}`, { method: 'DELETE', headers: hget() });
            if (res.ok) { console.log(`Successfully removed: ${track.title}`); successCount++; }
            else console.error(`Failed to remove ${track.title}:`, await res.text());
        } catch (err) { console.error(`Error removing track ${track.title}:`, err); }
    }
    if (successCount > 0) {
        const currentTrack = queue[qIdx];
        const isPlayingRemoved = currentTrack && matches.some(t => t.id === currentTrack.id);
        if (isPlayingRemoved) {
            if (queue.length > 1) nextTrack();
            else { if (audio) audio.pause(); queue = []; qIdx = -1; updateActive(); }
        }
        queue = queue.filter(q => !matches.some(t => t.id === q.id));
        if (queue.length === 0) qIdx = -1;
        else if (qIdx >= queue.length) qIdx = 0;
        saveQueueState();
        if (queueOpen) renderQueue();
        updateActive();
        await loadTracks(true);
        if (currentPlaylist) {
            const updated = await fetchPlaylist(currentPlaylist.id);
            if (updated) { currentPlaylist = updated; renderPlaylistDetail(updated); }
        }
        console.log(`Successfully removed ${successCount} track(s) from library.`);
    }
};

window.restoreTrack = async function (query) {
    if (!query) { console.error("Please provide a track title, artist, album, key, or ID to match."); return; }
    const queryStr = String(query).toLowerCase();
    let allTracks = [];
    try {
        const r = await fetch('/api/tracks?include_hidden=true', { headers: hget() });
        if (r.ok) allTracks = await r.json();
        else { console.error("Failed to load tracks list from API."); return; }
    } catch (err) { console.error("Error loading tracks:", err); return; }
    const matches = allTracks.filter(t => {
        return t.key.toLowerCase().includes(queryStr) || t.id.toLowerCase() === queryStr ||
            (t.title && t.title.toLowerCase().includes(queryStr)) ||
            (t.artist && t.artist.toLowerCase().includes(queryStr)) ||
            (t.album && t.album.toLowerCase().includes(queryStr));
    });
    if (matches.length === 0) { console.warn("No tracks found matching query:", query); return; }
    console.log(`Found ${matches.length} matching track(s) to restore:`);
    matches.forEach(t => console.log(` - [${t.id}] ${t.title} by ${t.artist} (${t.key})`));
    if (!confirm(`Are you sure you want to restore these ${matches.length} track(s) to your library?`)) { console.log("Restore cancelled."); return; }
    let successCount = 0;
    for (const track of matches) {
        try {
            const res = await fetch(`/api/tracks?key=${encodeURIComponent(track.key)}&unhide=true`, { method: 'DELETE', headers: hget() });
            if (res.ok) { console.log(`Successfully restored: ${track.title}`); successCount++; }
            else console.error(`Failed to restore ${track.title}:`, await res.text());
        } catch (err) { console.error(`Error restoring track ${track.title}:`, err); }
    }
    if (successCount > 0) {
        await loadTracks(true);
        if (currentPlaylist) {
            const updated = await fetchPlaylist(currentPlaylist.id);
            if (updated) { currentPlaylist = updated; renderPlaylistDetail(updated); }
        }
        console.log(`Successfully restored ${successCount} track(s) to library.`);
    }
};

function showUpdateUI() {
    const sidebarUpdate = document.getElementById('sidebar-update');
    if (sidebarUpdate) sidebarUpdate.style.display = 'flex';
    if (isMobile()) {
        let t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            document.body.appendChild(t);
        }
        t.classList.add('clickable');
        t.textContent = 'tap to update ↻';
        t.style.opacity = '1';
        t.onclick = () => { activateUpdate(); t.onclick = null; };
        clearTimeout(t._t);
    }
}

function hideUpdateUI() {
    const sidebarUpdate = document.getElementById('sidebar-update');
    if (sidebarUpdate) sidebarUpdate.style.display = 'none';
}

async function checkForUpdate() {
    if (!swRegistration) {
        console.log('[SW] No active service worker registration found');
        return;
    }
    console.log('[SW] Checking for service worker updates...');
    try {
        await swRegistration.update();
        if (swRegistration.waiting) {
            console.log('[SW] Update found and is waiting. Showing update UI.');
            showUpdateUI();
        } else {
            console.log('[SW] No updates found. Already running the latest version.');
            showToast('No updates available');
        }
    } catch (e) {
        console.error('[SW] Manual update check failed:', e);
    }
}

if ('serviceWorker' in navigator) {
    if (window.Capacitor && window.Capacitor.getPlatform() === 'ios') {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for (let reg of regs) {
                reg.unregister();
                console.log('[SW] Unregistered active service worker for Capacitor');
            }
        });
    } else {
        setTimeout(() => {
            navigator.serviceWorker.register('/sw.js').then(reg => {
                swRegistration = reg;
                console.log('[SW] Registered, scope:', reg.scope);
                console.log('[SW] Status:', window.getSWStatus());
                const checkUpdate = () => {
                    if (document.visibilityState === 'visible') {
                        console.log('[SW] Checking for updates...');
                        reg.update().catch(() => { });
                    }
                };
                document.addEventListener('visibilitychange', checkUpdate);
                setTimeout(checkUpdate, 10000);
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
                if (reg.waiting && navigator.serviceWorker.controller) { console.log('[SW] Update was already waiting'); showUpdateUI(); }
            }).catch(err => console.error('[SW] Registration failed:', err));
            navigator.serviceWorker.addEventListener('controllerchange', () => { console.log('[SW] New controller, reloading...'); window.location.reload(); });
        }, 2000);
    }
}

window.nextTrack = nextTrack;
window.showThemeMenu = showThemeMenu;
window.toggleThemeMenu = toggleThemeMenu;
window.prevTrack = prevTrack;
window.openArtistDetail = openArtistDetail;
window.openAlbumDetail = openAlbumDetail;
window.removeFromQueue = removeFromQueue;
window.checkForUpdate = checkForUpdate;

window.applyFilter = applyFilter;
Object.defineProperty(window, 'audio', {
    get: function () { return audio; }
});

window.playQueueIndex = function (idx) {
    if (idx < 0 || idx >= queue.length) return;
    qIdx = idx;
    play(queue[qIdx]);
    updateActive();
    renderQueue();
};

window.moveQueueItem = function (from, to) {
    if (from === to) return;
    const item = queue.splice(from, 1)[0];
    queue.splice(to, 0, item);
    if (qIdx === from) qIdx = to;
    else if (qIdx > from && qIdx <= to) qIdx--;
    else if (qIdx < from && qIdx >= to) qIdx++;
    saveQueueState();
    if (queueOpen) renderQueue();
};

function notifyNativePlaybackState() {
    const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
    if (plugin && typeof plugin.setPlaybackState === 'function') {
        const currentTrack = queue[qIdx];
        plugin.setPlaybackState({
            shuffle,
            repeatMode,
            starred: currentTrack ? !!currentTrack.starred : false,
            canvasDisabled: canvasDisabled
        });
    }
}

window.toggleShuffle = function () {
    if (btnShuffle) btnShuffle.onclick();
    notifyNativePlaybackState();
};

window.toggleRepeat = function () {
    if (btnRepeat) btnRepeat.onclick();
    notifyNativePlaybackState();
};

function notifyNativeDetailView(isActive, title) {
    const plugin = window.Capacitor?.Plugins?.AudioPlayerPlugin;
    if (plugin && typeof plugin.updateDetailView === 'function') {
        plugin.updateDetailView({ isActive: !!isActive, title: title || '' });
    }
}

window.navigateBack = function () {
    if (currentDetailView) {
        closeDetailView();
    } else if (currentPlaylist) {
        closePlaylistDetail();
    }
};

(async () => { const ok = await checkAuth(); if (ok) init() })();