const mobileQuery = window.matchMedia('(max-width:768px)');
const isMobile = () => mobileQuery.matches;

const TOKEN_KEY = 'music_token';
let token = localStorage.getItem(TOKEN_KEY) || '';
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

const audio = document.getElementById('audio');
if (audio) audio.preload = 'metadata';
const player = document.getElementById('player');
const trackList = document.getElementById('track-list');
const loading = document.getElementById('loading');
const empty = document.getElementById('empty');
const searchEl = document.getElementById('search');
const sortBtn = document.getElementById('sort-btn');
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

// Expanded player refs
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
const expDesktopLyricsPanel = document.getElementById('exp-desktop-lyrics-panel');
const expDesktopLyricsScroll = document.getElementById('exp-desktop-lyrics-scroll');

// SVG Icons for Swipe Actions
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
if (player) new ResizeObserver(updatePlayerHeight).observe(player);

function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) };
}

if (searchEl) searchEl.addEventListener('input', debounce(applyFilter, 120));

if (audio) audio.volume = Math.pow(SAVED_VOL / 100, 3);

function fmt(s) { if (!s || isNaN(s)) return '-'; s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
function hdrs() { return token ? { 'x-auth-token': token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' } }
function hget() { return token ? { 'x-auth-token': token } : {} }
function authQuery() { return token ? '?token=' + encodeURIComponent(token) : '' }

async function checkAuth() {
    try {
        const r = await fetch('/api/status', { headers: hget() });
        if (r.status === 401) { showAuth(); return false }
        return true
    } catch (e) {
        console.error("Auth check failed", e);
        return false;
    }
}
function showAuth() { if (authOverlay) authOverlay.style.display = 'flex' }
function hideAuth() { if (authOverlay) authOverlay.style.display = 'none' }

if (authSubmit) {
    authSubmit.onclick = async () => {
        token = authInput.value.trim();
        if (authError) authError.style.display = 'none';
        const ok = await checkAuth();
        if (ok) {
            localStorage.setItem(TOKEN_KEY, token);
            hideAuth();
            init();
        } else {
            if (authError) authError.style.display = 'block';
        }
    };
}

if (authInput) {
    authInput.addEventListener('keydown', e => { if (e.key === 'Enter') authSubmit.click() });
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const name = tab.dataset.tab;
        const viewLibrary = document.getElementById('view-library');
        const viewPlaylists = document.getElementById('view-playlists');
        const searchWrap = document.getElementById('search-wrap');
        const sortBtn = document.getElementById('sort-btn');

        if (viewLibrary) viewLibrary.classList.toggle('active', name === 'library');
        if (viewPlaylists) viewPlaylists.classList.toggle('active', name === 'playlists');
        if (searchWrap) searchWrap.style.display = name === 'library' ? '' : 'none';
        if (sortBtn) sortBtn.style.display = name === 'library' ? '' : 'none';

        if (name === 'playlists') loadPlaylists();
    }
});

async function loadTracks() {
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
            return
        }
        applyFilter();
    } catch (e) {
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'flex'
    }
}

function applyFilter() {
    const q = searchEl ? searchEl.value.toLowerCase() : '';
    filtered = q ? tracks.filter(t => (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q) || (t.album || '').toLowerCase().includes(q)) : [...tracks];
    sort();
}

const sortModes = ['title', 'artist', 'album'];
const sortLabels = ['A->Z', 'ARTIST', 'ALBUM'];
let sortModeIdx = 0;
if (sortBtn) {
    sortBtn.onclick = () => {
        sortModeIdx = (sortModeIdx + 1) % 3;
        sortMode = sortModes[sortModeIdx];
        sortBtn.textContent = sortLabels[sortModeIdx];
        sort()
    };
}

function sort() {
    filtered.sort((a, b) => { const ka = (a[sortMode] || '').toLowerCase(), kb = (b[sortMode] || '').toLowerCase(); return ka < kb ? -1 : ka > kb ? 1 : 0 });
    renderList();
}

function formatLyricsOffsetLabel() {
    if (Math.abs(lyricsOffset) < 0.001) return 'In sync';
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
            frag.appendChild(h)
        }
        frag.appendChild(makeRow(t, true));
    }
    if (trackList) trackList.appendChild(frag);
}

function bindTapActivation(el, handler, options = {}) {
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let moved = false;
    let handledAt = 0;
    let longPressTimer = null;
    let longPressed = false;
    const longPressMs = options.longPressMs || 420;

    const isNestedControl = target => {
        const control = target.closest('button, input, a, select, textarea, label, .queue-handle');
        return control && control !== el;
    };

    const clearLongPress = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    el.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'touch') return;
        if (isNestedControl(e.target)) return;
        startX = e.clientX;
        startY = e.clientY;
        moved = false;
        longPressed = false;
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
        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = Math.abs(e.clientY - startY);
        if (deltaX > 10 || deltaY > 10) {
            moved = true;
            clearLongPress();
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
        if (Date.now() - handledAt < 500) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        handler(e);
    });
}

function attachSwipeHandlers(container, content, bgElement, handlers) {
    let startX = 0, startY = 0;
    let isRowSwiping = false, isRowScrolling = false;
    let deltaX = 0;
    const ACTION_THRESHOLD = 70;

    container.addEventListener('touchstart', e => {
        if (e.target.closest('button') || e.target.closest('.queue-handle')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isRowSwiping = false;
        isRowScrolling = false;
        deltaX = 0;
        content.style.transition = 'none';
        bgElement.className = 'track-actions';
        bgElement.innerHTML = '';
    }, { passive: true });

    container.addEventListener('touchmove', e => {
        if (!startX) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (!isRowSwiping && !isRowScrolling) {
            if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
                isRowScrolling = true;
            } else if (Math.abs(deltaX) > 10) {
                isRowSwiping = true;
                if (deltaX > 0 && handlers.right) {
                    bgElement.className = 'track-actions right-active';
                    bgElement.innerHTML = `<div class="action-icon">${handlers.right.icon}</div>`;
                } else if (deltaX < 0 && handlers.left) {
                    bgElement.className = 'track-actions left-active';
                    bgElement.innerHTML = `<div class="action-icon">${handlers.left.icon}</div>`;
                }
            }
        }

        if (isRowScrolling) return;

        if (isRowSwiping) {
            e.stopPropagation();

            if (deltaX > 0 && !handlers.right) deltaX = 0;
            if (deltaX < 0 && !handlers.left) deltaX = 0;

            let translateVal = deltaX;
            if (translateVal > ACTION_THRESHOLD) {
                translateVal = ACTION_THRESHOLD + (translateVal - ACTION_THRESHOLD) * 0.2;
            } else if (translateVal < -ACTION_THRESHOLD) {
                translateVal = -ACTION_THRESHOLD + (translateVal + ACTION_THRESHOLD) * 0.2;
            }

            content.style.transform = `translate3d(${translateVal}px, 0, 0)`;

            if (deltaX > ACTION_THRESHOLD && handlers.right) {
                bgElement.classList.add('locked');
                if (!container.dataset.hapticRight) {
                    if (navigator.vibrate) navigator.vibrate(10);
                    container.dataset.hapticRight = 'true';
                }
            } else if (deltaX < -ACTION_THRESHOLD && handlers.left) {
                bgElement.classList.add('locked');
                if (!container.dataset.hapticLeft) {
                    if (navigator.vibrate) navigator.vibrate(10);
                    container.dataset.hapticLeft = 'true';
                }
            } else {
                bgElement.classList.remove('locked');
                container.dataset.hapticRight = '';
                container.dataset.hapticLeft = '';
            }
        }
    }, { passive: true });

    container.addEventListener('touchend', e => {
        if (!startX) return;
        startX = 0;

        if (isRowSwiping) {
            e.stopPropagation();
            content.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

            if (deltaX >= ACTION_THRESHOLD && handlers.right) {
                handlers.right.action();
            } else if (deltaX <= -ACTION_THRESHOLD && handlers.left) {
                handlers.left.action();
            }

            content.style.transform = `translate3d(0, 0, 0)`;
            setTimeout(() => {
                bgElement.className = 'track-actions';
                bgElement.innerHTML = '';
                container.dataset.hapticRight = '';
                container.dataset.hapticLeft = '';
            }, 300);
        }
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
    const sp = document.createElement('span'); sp.className = 'thumb-icon'; sp.textContent = '\u266A'; thumb.appendChild(sp);
    loadCover(t.id, thumb);

    const info = document.createElement('div'); info.className = 'track-info';
    const ti = document.createElement('div'); ti.className = 'track-title'; ti.textContent = t.title || 'Unknown';
    const ts = document.createElement('div'); ts.className = 'track-sub'; ts.textContent = [t.artist, t.album].filter(Boolean).join(' \u00B7 ') || '\u2014';
    info.append(ti, ts);

    const right = document.createElement('div'); right.className = 'track-right';
    const dur = document.createElement('div'); dur.className = 'track-dur'; dur.dataset.id = t.id; dur.textContent = fmt(t.duration);
    right.appendChild(dur);

    if (showMenu && !inPlaylist) {
        const menuBtn = document.createElement('button'); menuBtn.className = 'track-menu-btn'; menuBtn.textContent = '\u2026'; menuBtn.title = 'Options';
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
        div.onmouseenter = () => {
            if (isSelecting) div.classList.toggle('selected', toggleMode);
        };
        div.ondblclick = () => playTrack(t, filtered);
    } else {
        bindTapActivation(div, () => {
            playTrack(t, filtered);
        }, {
            onLongPress: e => openCtxMenu({
                clientX: e.clientX,
                clientY: e.clientY,
                stopPropagation() {}
            }, t)
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
                    queue.push(t);
                    showToast(`Added "${t.title}" to queue`);
                    localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
                },
                icon: SWIPE_ICONS.queue
            };
            rowHandlers.left = {
                action: () => {
                    openQuickPlaylistMenu(div, t);
                },
                icon: SWIPE_ICONS.playlist
            };
        }
        attachSwipeHandlers(div, content, actionsBg, rowHandlers);
    }
    return div;
}

function hideCtxWithBackdrop() {
    if (ctxMenu) ctxMenu.classList.remove('open');
    document.querySelectorAll('.track.long-press').forEach(t => t.classList.remove('long-press'));
    document.body.classList.remove('menu-open');
    ctxTrack = null;
    const quickMenu = document.getElementById('quick-playlist-menu');
    if (quickMenu) quickMenu.remove();
}

async function openQuickPlaylistMenu(trackRow, track) {
    const existing = document.getElementById('quick-playlist-menu');
    if (existing) existing.remove();

    if (playlists.length === 0) {
        await loadPlaylists();
    }

    const menu = document.createElement('div');
    menu.id = 'quick-playlist-menu';
    menu.style.cssText = 'position:fixed;background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:6px;z-index:400;min-width:160px;max-width:220px;box-shadow:0 8px 24px rgba(0,0,0,.4)';

    const rect = trackRow.getBoundingClientRect();
    menu.style.left = Math.min(rect.left + 40, window.innerWidth - 220) + 'px';
    menu.style.top = Math.max(10, rect.top - 10) + 'px';

    const header = document.createElement('div');
    header.style.cssText = 'padding:6px 10px 2px;font-size:10px;letter-spacing:0.08em;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);margin-bottom:4px';
    header.textContent = 'Add to Playlist';
    menu.appendChild(header);

    if (playlists.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:8px 10px;font-size:12px;color:var(--muted)';
        empty.textContent = 'No playlists yet';
        menu.appendChild(empty);
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
    newPl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> New Playlist';
    newPl.onclick = () => {
        pendingPlaylistTrack = track;
        menu.remove();
        openNewPlaylistModal();
    };
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
        document.body.classList.remove('menu-open');
        document.querySelectorAll('.track.long-press').forEach(t => t.classList.remove('long-press'));
        closeCtxMenu();
        const quickMenu = document.getElementById('quick-playlist-menu');
        if (quickMenu) quickMenu.remove();
    }
});

document.addEventListener('touchstart', e => {
    if (!e.target.closest('#ctx-menu') && !e.target.closest('.track-menu-btn') && !e.target.closest('#quick-playlist-menu')) {
        hideCtxWithBackdrop();
    }
}, { passive: true });

function openCtxMenu(e, t) {
    ctxTrack = t;
    let targetTracks = Array.from(document.querySelectorAll('.track.selected'))
        .map(el => tracks.find(x => x.id === el.dataset.id))
        .filter(Boolean);
    if (!targetTracks.some(st => st.id === t.id)) {
        targetTracks = [t];
    }

    const trackNameLabel = document.getElementById('ctx-track-name');
    if (trackNameLabel) {
        trackNameLabel.textContent = targetTracks.length > 1 ? `${targetTracks.length} tracks selected` : (t.title || 'Track');
    }

    const ctxPlayNext = document.getElementById('ctx-play-next');
    if (ctxPlayNext) {
        ctxPlayNext.onclick = () => {
            queue.splice(qIdx + 1, 0, ...targetTracks);
            showToast(`Playing ${targetTracks.length} track(s) next`);
            if (queueOpen) renderQueue();
            closeCtxMenu();
        };
    }

    const ctxAddQueue = document.getElementById('ctx-add-queue');
    if (ctxAddQueue) {
        ctxAddQueue.onclick = () => {
            queue.push(...targetTracks);
            showToast(`Added ${targetTracks.length} track(s) to queue`);
            if (queueOpen) renderQueue();
            closeCtxMenu();
        };
    }

    if (ctxPlaylists) {
        ctxPlaylists.innerHTML = '';
        playlists.forEach(pl => {
            const li = document.createElement('div');
            li.className = 'ctx-item';
            li.textContent = pl.name;
            li.onclick = async () => {
                for (const tr of targetTracks) await addToPlaylist(pl.id, tr);
                showToast(`Added ${targetTracks.length} track(s) to ${pl.name}`);
                closeCtxMenu();
            };
            ctxPlaylists.appendChild(li);
        });
    }

    if (ctxMenu) {
        const x = e.clientX, y = e.clientY;
        const menuW = 220, menuH = ctxMenu.offsetHeight || 300;
        ctxMenu.style.left = Math.min(x, window.innerWidth - menuW - 8) + 'px';
        ctxMenu.style.top = Math.min(y, window.innerHeight - menuH - 8) + 'px';
        ctxMenu.classList.add('open');
        document.body.classList.add('menu-open');
    }

    e.stopPropagation();
}

function closeCtxMenu() {
    if (ctxMenu) ctxMenu.classList.remove('open');
    ctxTrack = null;
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

const FALLBACK = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="%23222"/><text x="28" y="36" text-anchor="middle" font-size="24" fill="%23555">♪</text></svg>';
const coverCache = new Map();

function loadCover(id, target) {
    const qs = authQuery();
    const url = `/api/cover/${id}${qs}`;
    if (coverCache.has(id)) {
        const cached = coverCache.get(id);
        if (target instanceof HTMLImageElement) {
            target.src = cached === 'err' ? FALLBACK : cached;
        } else {
            target.style.backgroundImage = cached === 'err' ? 'none' : `url(${cached})`;
        }
        return;
    }
    const img = new Image();
    img.onload = () => {
        coverCache.set(id, url);
        if (target instanceof HTMLImageElement) {
            target.src = url;
        } else {
            target.style.backgroundImage = `url(${url})`;
        }
    };
    img.onerror = () => {
        coverCache.set(id, 'err');
        if (target instanceof HTMLImageElement) {
            target.src = FALLBACK;
        }
    };
    img.src = url;
}

let repeatMode = parseInt(localStorage.getItem('music_repeat') || '0');
const volIcons = {
    muted: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
    low: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    high: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
};

function applyRepeat() {
    const btn = document.getElementById('btn-repeat') || expRepeat;
    if (!btn) return;
    if (repeatMode === 0) btn.style.color = 'var(--muted)';
    else if (repeatMode === 1) btn.style.color = 'var(--accent)';
    else btn.style.color = 'var(--accent)';
    const icons = document.querySelectorAll('.repeat-one-icon');
    icons.forEach(i => i.style.display = repeatMode === 2 ? 'inline' : 'none');
}

function playTrack(t, trackArray) {
    queue = [...trackArray];
    qIdx = queue.findIndex(x => x.id === t.id);
    if (qIdx < 0) { queue.unshift(t); qIdx = 0; }
    if (shuffle) {
        const current = queue.splice(qIdx, 1)[0];
        queue.sort(() => Math.random() - 0.5);
        queue.unshift(current);
        qIdx = 0;
    }
    play(queue[qIdx]);
    updateActive();
    localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
    localStorage.setItem('music_qidx', qIdx);
}

function play(t) {
    if (!t) return;

    // FIX 1: call updateMediaSession immediately so the OS picks up metadata
    // even before audio starts — it will be re-asserted on the 'play' event too.
    updateMediaSession(t);

    // FIX 5: tell the OS we are now playing
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
    }

    if (player) {
        player.classList.remove('hidden');
        updatePlayerHeight();
    }

    const plTitle = document.getElementById('player-title');
    const plArtist = document.getElementById('player-artist');
    const mobTitle = document.querySelector('#player-meta-mobile .title');
    const mobArtist = document.querySelector('#player-meta-mobile .artist');
    const fullTitle = t.title || 'Unknown';
    const fullArtist = [t.artist, t.album].filter(Boolean).join(' \u00b7') || '\u2014';

    if (plTitle) plTitle.textContent = fullTitle;
    if (plArtist) plArtist.textContent = fullArtist;
    if (mobTitle) mobTitle.textContent = fullTitle;
    if (mobArtist) mobArtist.textContent = fullArtist;

    const pt = document.getElementById('player-thumb');
    if (pt) { pt.src = FALLBACK; loadCover(t.id, pt); }

    document.title = (t.title || '?') + ' \u2014 ' + (t.artist || '?');

    updateExpandedNowPlaying(t);
    loadLyrics(t);

    if (audio) {
        audio.src = '/api/stream/' + t.id;
        audio.play().catch(err => console.warn('play() error:', err));
    }

    localStorage.setItem('music_last', JSON.stringify(t));
    localStorage.setItem('music_pos', '0');
    localStorage.setItem('music_qidx', qIdx);
    lastSavedSec = -1;
}

function updateActive() {
    document.querySelectorAll('.track').forEach(el => {
        el.classList.toggle('active', queue[qIdx] && el.dataset.id === queue[qIdx].id);
    });
}

function nextTrack() {
    if (!queue.length) return;
    if (repeatMode === 2) {
        if (audio) { audio.currentTime = 0; audio.play(); }
        return;
    }
    if (qIdx < queue.length - 1) {
        qIdx++;
    } else if (repeatMode === 1) {
        qIdx = 0;
    } else {
        return;
    }
    play(queue[qIdx]);
    updateActive();
    if (queueOpen) renderQueue();
    localStorage.setItem('music_qidx', qIdx);
}

function prevTrack() {
    if (!queue.length) return;
    if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    if (qIdx > 0) {
        qIdx--;
    } else if (repeatMode === 1) {
        qIdx = queue.length - 1;
    } else {
        if (audio) audio.currentTime = 0;
        return;
    }
    play(queue[qIdx]);
    updateActive();
    if (queueOpen) renderQueue();
    localStorage.setItem('music_qidx', qIdx);
}

if (btnPlay) {
    btnPlay.onclick = () => {
        if (!audio) return;
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    };
}

if (expPlay) {
    expPlay.onclick = () => {
        if (!audio) return;
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    };
}

if (btnNext) btnNext.onclick = nextTrack;
if (btnPrev) btnPrev.onclick = prevTrack;
if (expNext) expNext.onclick = nextTrack;
if (expPrev) expPrev.onclick = prevTrack;

if (btnShuffle) {
    btnShuffle.onclick = () => {
        shuffle = !shuffle;
        localStorage.setItem('music_shuffle', shuffle);
        btnShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
        if (expShuffle) expShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
    };
}
if (expShuffle) {
    expShuffle.onclick = () => {
        shuffle = !shuffle;
        localStorage.setItem('music_shuffle', shuffle);
        expShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
        if (btnShuffle) btnShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
    };
}

const repeatBtns = [document.getElementById('btn-repeat'), expRepeat].filter(Boolean);
repeatBtns.forEach(btn => {
    btn.onclick = () => {
        repeatMode = (repeatMode + 1) % 3;
        localStorage.setItem('music_repeat', repeatMode);
        applyRepeat();
    };
});

if (audio) {
    audio.addEventListener('play', () => {
        if (iconPlay) iconPlay.style.display = 'none';
        if (iconPause) iconPause.style.display = '';
        if (expIconPlay) expIconPlay.style.display = 'none';
        if (expIconPause) expIconPause.style.display = '';

        // FIX 2a: re-assert metadata and playbackState whenever audio actually starts playing.
        // The browser can reset MediaMetadata when src changes, so this is the safest place.
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
            if (queue[qIdx]) updateMediaSession(queue[qIdx]);
        }
    });

    audio.addEventListener('pause', () => {
        if (iconPlay) iconPlay.style.display = '';
        if (iconPause) iconPause.style.display = 'none';
        if (expIconPlay) expIconPlay.style.display = '';
        if (expIconPause) expIconPause.style.display = 'none';

        // FIX 2b: tell the OS we are paused
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
    });

    audio.addEventListener('ended', () => {
        // FIX 5: clear playback state on track end
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
        }
        nextTrack();
    });

    audio.addEventListener('loadedmetadata', () => {
        if (timeTot) timeTot.textContent = fmt(audio.duration);
        if (expTimeTot) expTimeTot.textContent = fmt(audio.duration);

        // FIX 4: reset position state when a new track loads so the lock screen
        // scrub bar starts from 0 with the correct duration
        if ('mediaSession' in navigator && audio.duration && !isNaN(audio.duration)) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: audio.duration,
                    playbackRate: audio.playbackRate,
                    position: 0
                });
            } catch (_) {}
        }
    });

    audio.addEventListener('volumechange', () => {
        if (!volumeSlider) return;
        const v = audio.volume;
        const pct = Math.round(Math.pow(v, 1 / 3) * 100);
        volumeSlider.value = pct;
        if (volumeIcon) {
            volumeIcon.innerHTML = (audio.muted || v === 0) ? volIcons.muted : v < 0.5 ? volIcons.low : volIcons.high;
        }
    });
}

if (volumeSlider) {
    volumeSlider.oninput = () => {
        const pct = parseInt(volumeSlider.value);
        localStorage.setItem('music_vol', pct);
        if (audio) {
            audio.muted = false;
            audio.volume = Math.pow(pct / 100, 3);
        }
        muted = false;
        if (volumeIcon) {
            volumeIcon.innerHTML = pct === 0 ? volIcons.muted : pct < 50 ? volIcons.low : volIcons.high;
        }
    };
}

if (volumeIcon) {
    volumeIcon.onclick = () => {
        if (!audio) return;
        muted = !muted;
        audio.muted = muted;
        if (muted) {
            lastVol = parseInt(volumeSlider?.value || '80');
            if (volumeSlider) volumeSlider.value = 0;
            volumeIcon.innerHTML = volIcons.muted;
        } else {
            if (volumeSlider) volumeSlider.value = lastVol;
            audio.volume = Math.pow(lastVol / 100, 3);
            volumeIcon.innerHTML = lastVol < 50 ? volIcons.low : volIcons.high;
        }
    };
}

if (progress) {
    progress.addEventListener('mousedown', () => { seeking = true; });
    progress.addEventListener('touchstart', () => { seeking = true; }, { passive: true });
    progress.addEventListener('input', () => {
        if (audio && audio.duration) {
            audio.currentTime = (progress.value / 100) * audio.duration;
        }
    });
    progress.addEventListener('change', () => { seeking = false; });
    progress.addEventListener('mouseup', () => { seeking = false; });
    progress.addEventListener('touchend', () => { seeking = false; });
}

if (expProgress) {
    expProgress.addEventListener('mousedown', () => { seeking = true; });
    expProgress.addEventListener('touchstart', () => { seeking = true; }, { passive: true });
    expProgress.addEventListener('input', () => {
        if (audio && audio.duration) {
            audio.currentTime = (expProgress.value / 100) * audio.duration;
            if (timeCur) timeCur.textContent = fmt(audio.currentTime);
            if (expTimeCur) expTimeCur.textContent = fmt(audio.currentTime);
        }
    });
    expProgress.addEventListener('change', () => { seeking = false; });
    expProgress.addEventListener('mouseup', () => { seeking = false; });
    expProgress.addEventListener('touchend', () => { seeking = false; });
}

// Expanded player open/close
let playerExpanded = false;
let desktopExpandedLyricsOpen = false;

function setDesktopExpandedLyricsOpen(open) {
    desktopExpandedLyricsOpen = open;
    if (expDesktopLyricsPanel) expDesktopLyricsPanel.classList.toggle('open', open);
    if (expLyricsToggle) expLyricsToggle.classList.toggle('active', open);
}

function openExpandedPlayer(opts = {}) {
    if (!expPlayer) return;
    playerExpanded = true;
    expPlayer.classList.add('open');
    document.body.classList.add('exp-open');

    if (opts.revealLyrics !== undefined && !isMobile()) {
        setDesktopExpandedLyricsOpen(opts.revealLyrics);
    } else if (opts.revealLyrics && isMobile()) {
        setTimeout(() => openLyricsCard(), 200);
    }
}

function closeExpandedPlayer() {
    if (!expPlayer) return;
    playerExpanded = false;
    expPlayer.classList.remove('open');
    document.body.classList.remove('exp-open');
}

function updateExpandedNowPlaying(t) {
    if (expTitle) expTitle.textContent = t.title || 'Unknown';
    if (expArtist) expArtist.textContent = [t.artist, t.album].filter(Boolean).join(' \u00b7 ') || '\u2014';
    if (expCover) {
        expCover.src = FALLBACK;
        loadCover(t.id, expCover);
    }
    if (expCoverIcon) expCoverIcon.style.display = 'none';
}

if (expCollapse) {
    expCollapse.addEventListener('click', e => {
        e.preventDefault();
        closeExpandedPlayer();
    });
}

// Swipe to open/close expanded player
let swipeStartX = 0, swipeStartY = 0, swipeDeltaY = 0;
let swipeTarget = null;
let isPanelSwiping = false;
const SWIPE_THRESHOLD = 60;

if (player) {
    player.addEventListener('touchstart', e => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeDeltaY = 0;
        isPanelSwiping = false;
        swipeTarget = null;
    }, { passive: true });

    player.addEventListener('touchmove', e => {
        swipeDeltaY = e.touches[0].clientY - swipeStartY;
        const dX = Math.abs(e.touches[0].clientX - swipeStartX);
        if (!isPanelSwiping) {
            if (Math.abs(swipeDeltaY) > 10 && Math.abs(swipeDeltaY) > dX) {
                isPanelSwiping = true;
                swipeTarget = 'expand';
            }
        }
    }, { passive: true });

    player.addEventListener('touchend', () => {
        if (!swipeTarget) return;
        if (swipeTarget === 'expand' && swipeDeltaY < -SWIPE_THRESHOLD && !playerExpanded) {
            openExpandedPlayer();
        } else if (swipeTarget === 'expand' && swipeDeltaY > SWIPE_THRESHOLD && playerExpanded) {
            closeExpandedPlayer();
        } else if (swipeTarget === 'queue-close' && swipeDeltaY > SWIPE_THRESHOLD && queueOpen) {
            closeQueuePanel();
        }
        swipeTarget = null;
    }, { passive: true });
}

function closeQueuePanel() {
    queueOpen = false;
    if (queuePanel) queuePanel.classList.remove('open');
    if (queueBtn) queueBtn.classList.remove('active');
}

function removeFromQueue(idx) {
    queue.splice(idx, 1);
    if (idx < qIdx) qIdx--;
    else if (idx === qIdx && qIdx >= queue.length) qIdx = queue.length - 1;
    renderQueue();
    localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
    localStorage.setItem('music_qidx', qIdx);
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
if (queueBtn) {
    queueBtn.onclick = () => {
        queueOpen = !queueOpen;
        if (queuePanel) queuePanel.classList.toggle('open', queueOpen);
        queueBtn.classList.toggle('active', queueOpen);
        if (queueOpen) { closeExpandedPlayer(); renderQueue() }
    };
}

const queuePanelHandle = document.getElementById('queue-panel-mobile-handle');
if (queuePanel) {
    queuePanel.addEventListener('touchstart', e => {
        if (!isMobile()) return;
        if (e.target.tagName === 'INPUT' || e.target.closest('.queue-handle')) return;
        if (queuePanel.scrollTop > 20 && !e.target.closest('#queue-panel-mobile-handle')) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeDeltaY = 0;
        isPanelSwiping = true;
        swipeTarget = 'queue-close';
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
        content.innerHTML = `
            <span class="queue-handle" title="Drag to reorder">&#x283f;</span>
            <span class="queue-num">${i === qIdx ? '\u25b6' : i + 1}</span>
            <span class="queue-info">
                <span class="queue-title">${t.title || 'Unknown'}</span>
                <span class="queue-artist">${t.artist || '\u2014'}</span>
            </span>
            <button class="queue-remove" title="Remove">\u2715</button>
        `;
        item.appendChild(content);

        const handleEl = content.querySelector('.queue-handle');
        if (handleEl) handleEl.onpointerdown = e => startQueueDrag(e, item);

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
            qIdx = i;
            play(queue[qIdx]);
            updateActive();
            renderQueue()
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
            localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
            localStorage.setItem('music_qidx', qIdx);
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
        localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
        localStorage.setItem('music_qidx', qIdx);
    };
}

// FIX: use direct /api/cover/ URL — blob: URLs are silently rejected by OS lock screens,
// Control Center (iOS), and the macOS Now Playing widget.
function updateMediaSession(t) {
    if (!('mediaSession' in navigator) || !t) return;
    const base = window.location.origin;
    const qs = token ? '?token=' + encodeURIComponent(token) : '';
    navigator.mediaSession.metadata = new MediaMetadata({
        title:  t.title  || 'Unknown',
        artist: t.artist || 'Unknown',
        album:  t.album  || 'Unknown',
        artwork: [
            { src: base + '/api/cover/' + t.id + qs, sizes: '512x512', type: 'image/jpeg' }
        ]
    });
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
        }
    });
});

function applyLyricsFontSize() {
    const val = lyricsFontSize + 'px';
    getLyricScrollEls().forEach(el => { el.style.fontSize = val; });
}

const lyricsFontUp = document.getElementById('lyrics-font-up');
if (lyricsFontUp) {
    lyricsFontUp.onclick = e => {
        e.stopPropagation();
        lyricsFontSize = Math.min(22, lyricsFontSize + 1);
        localStorage.setItem('lyrics_font', lyricsFontSize);
        applyLyricsFontSize();
    };
}

const lyricsFontDown = document.getElementById('lyrics-font-down');
if (lyricsFontDown) {
    lyricsFontDown.onclick = e => {
        e.stopPropagation();
        lyricsFontSize = Math.max(10, lyricsFontSize - 1);
        localStorage.setItem('lyrics_font', lyricsFontSize);
        applyLyricsFontSize();
    };
}

const lyricsFontUpDesktop = document.getElementById('lyrics-font-up-desktop');
if (lyricsFontUpDesktop) {
    lyricsFontUpDesktop.onclick = e => {
        e.stopPropagation();
        lyricsFontSize = Math.min(22, lyricsFontSize + 1);
        localStorage.setItem('lyrics_font', lyricsFontSize);
        applyLyricsFontSize();
    };
}
const lyricsFontDownDesktop = document.getElementById('lyrics-font-down-desktop');
if (lyricsFontDownDesktop) {
    lyricsFontDownDesktop.onclick = e => {
        e.stopPropagation();
        lyricsFontSize = Math.max(10, lyricsFontSize - 1);
        localStorage.setItem('lyrics_font', lyricsFontSize);
        applyLyricsFontSize();
    };
}

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

    const loadingMsg = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">Loading lyrics\u2026</div>';
    const cardLoadingMsg = '<div style="padding:20px 14px;text-align:center;color:var(--muted);font-size:12px">Loading lyrics\u2026</div>';
    const scrollEl = document.getElementById('lyrics-scroll');
    const cardScroll = document.getElementById('exp-lyrics-card-scroll');
    const desktopScroll = expDesktopLyricsScroll;
    if (scrollEl) scrollEl.innerHTML = loadingMsg;
    if (cardScroll) cardScroll.innerHTML = cardLoadingMsg;
    if (desktopScroll) desktopScroll.innerHTML = loadingMsg;
    if (expLyricCur) expLyricCur.textContent = '\u2026';
    if (expLyricNext) expLyricNext.textContent = '';

    try {
        const cleanTitle = (t.title || '').replace(/^\d{1,3}[\s.\-_]+/, '').trim();
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
            const titleText = d.source === 'lrclib' ? 'Lyrics' : `Lyrics \u00b7 ${d.source}`;
            if (plTitle) plTitle.textContent = titleText;
            if (cardTitle) cardTitle.textContent = titleText;
            if (desktopTitle) desktopTitle.textContent = titleText;
        } else {
            const noLyricsMsg = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">No lyrics found</div>';
            const noLyricsMsgCard = '<div style="padding:20px 14px;text-align:center;color:var(--muted);font-size:12px">No lyrics found</div>';
            if (scrollEl) scrollEl.innerHTML = noLyricsMsg;
            if (cardScroll) cardScroll.innerHTML = noLyricsMsgCard;
            if (desktopScroll) desktopScroll.innerHTML = noLyricsMsg;
            if (plTitle) plTitle.textContent = 'Lyrics';
            if (cardTitle) cardTitle.textContent = 'Lyrics';
            if (desktopTitle) desktopTitle.textContent = 'Lyrics';
            if (expLyricCur) expLyricCur.textContent = '\u2014';
            if (expLyricNext) expLyricNext.textContent = '';
        }
    } catch (_) {
        if (requestSeq !== lyricsRequestSeq || lyricsTrackId !== t.id) return;
        lyricsFailed.add(t.id);
        const errMsg = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">No lyrics found</div>';
        const errMsgCard = '<div style="padding:20px 14px;text-align:center;color:var(--muted);font-size:12px">No lyrics found</div>';
        if (scrollEl) scrollEl.innerHTML = errMsg;
        const cardScroll2 = document.getElementById('exp-lyrics-card-scroll');
        if (cardScroll2) cardScroll2.innerHTML = errMsgCard;
        if (desktopScroll) desktopScroll.innerHTML = errMsg;
        if (expLyricCur) expLyricCur.textContent = '-';
        if (expLyricNext) expLyricNext.textContent = '';
    }
}

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
            div.onclick = (function (t) { return function () { if (audio) audio.currentTime = t; }; })(l.time);
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
function updateSyncedLyricsState(force = false) {
    if (!audio) return;
    if (!syncedLyrics.length) {
        if (expLyricCur) { expLyricCur.style.opacity = '0'; setTimeout(() => { expLyricCur.textContent = '—'; expLyricCur.style.opacity = '1' }, 120) }
        if (expLyricNext) { expLyricNext.style.opacity = '0'; setTimeout(() => { expLyricNext.textContent = ''; expLyricNext.style.opacity = '1' }, 120) }
        return;
    }
    const t = audio.currentTime + lyricsOffset;
    const idx = syncedLyrics.findIndex((l, i) => { const n = syncedLyrics[i + 1]; return t >= l.time && (!n || t < n.time) });
    if (!force && idx === lastExpLyricIdx) return;
    lastExpLyricIdx = idx;

    const curText = idx >= 0 ? (syncedLyrics[idx].text || '·') : '—';
    const nextText = idx >= 0 && syncedLyrics[idx + 1] ? (syncedLyrics[idx + 1].text || '·') : '';

    if (expLyricCur) {
        expLyricCur.style.opacity = '0'; expLyricCur.style.transform = 'translateY(6px)';
        setTimeout(() => { expLyricCur.textContent = curText; expLyricCur.style.opacity = '1'; expLyricCur.style.transform = 'translateY(0)' }, 120)
    }
    if (expLyricNext) {
        expLyricNext.style.opacity = '0'; expLyricNext.style.transform = 'translateY(6px)';
        setTimeout(() => { expLyricNext.textContent = nextText; expLyricNext.style.opacity = '1'; expLyricNext.style.transform = 'translateY(0)' }, 120)
    }

    getLyricScrollEls().forEach(scroll => {
        scroll.querySelectorAll('.lyric-line').forEach((el, i) => el.classList.toggle('active', i === idx));
        if (idx >= 0) {
            const el = scroll.querySelector(`[data-idx="${idx}"]`);
            if (el) {
                const top = el.offsetTop - scroll.clientHeight / 2 + el.offsetHeight / 2;
                scroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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
        if (!seeking && audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            if (progress)    progress.value    = pct;
            if (expProgress) expProgress.value = pct;
            if (timeCur)    timeCur.textContent    = fmt(audio.currentTime);
            if (expTimeCur) expTimeCur.textContent = fmt(audio.currentTime);
        }

        updateSyncedLyricsState();

        // FIX 3: update the lock screen / Control Centre scrub bar position
        if ('mediaSession' in navigator && audio.duration && !isNaN(audio.duration)) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: audio.duration,
                    playbackRate: audio.playbackRate,
                    position: audio.currentTime
                });
            } catch (_) {}
        }
    });
}

// Single canonical block for all Media Session action handlers
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play',          () => audio && audio.play());
    navigator.mediaSession.setActionHandler('pause',         () => audio && audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
    navigator.mediaSession.setActionHandler('nexttrack',     () => nextTrack());
    navigator.mediaSession.setActionHandler('seekbackward', d => {
        if (audio) audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler('seekforward', d => {
        if (audio) audio.currentTime = Math.min(audio.duration, audio.currentTime + (d.seekOffset || 10));
    });
    // FIX 3: enable seek via scrub bar on lock screen / Control Centre
    try {
        navigator.mediaSession.setActionHandler('seekto', d => {
            if (audio && d.seekTime != null) {
                audio.currentTime = d.seekTime;
            }
        });
    } catch (_) {}
}

async function loadPlaylists() {
    try {
        const r = await fetch('/api/playlists', { headers: hget() });
        if (!r.ok) return;
        playlists = await r.json();
        renderPlaylists();
    } catch (_) {}
}

async function addToPlaylist(playlistId, track) {
    try {
        await fetch(`/api/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: hdrs(),
            body: JSON.stringify({ trackId: track.id })
        });
    } catch (_) {}
}

async function removeFromPlaylist(playlistId, trackId) {
    try {
        await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, {
            method: 'DELETE',
            headers: hget()
        });
    } catch (_) {}
}

function openNewPlaylistModal() {
    if (modalNew) {
        modalNew.style.display = 'flex';
        if (modalNameInput) { modalNameInput.value = ''; modalNameInput.focus(); }
    }
}

function closeNewPlaylistModal() {
    if (modalNew) modalNew.style.display = 'none';
    pendingPlaylistTrack = null;
}

const modalCancel = document.getElementById('modal-cancel');
const modalCreate = document.getElementById('modal-create');
if (modalCancel) modalCancel.onclick = closeNewPlaylistModal;
if (modalNew) {
    modalNew.addEventListener('click', e => { if (e.target === modalNew) closeNewPlaylistModal(); });
}
if (modalNameInput) {
    modalNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') modalCreate && modalCreate.click(); });
}
if (modalCreate) {
    modalCreate.onclick = async () => {
        const name = modalNameInput ? modalNameInput.value.trim() : '';
        if (!name) return;
        try {
            const r = await fetch('/api/playlists', {
                method: 'POST',
                headers: hdrs(),
                body: JSON.stringify({ name })
            });
            const pl = await r.json();
            playlists.push(pl);
            if (pendingPlaylistTrack) {
                await addToPlaylist(pl.id, pendingPlaylistTrack);
                showToast(`Added "${pendingPlaylistTrack.title}" to ${pl.name}`);
            } else {
                showToast(`Created "${pl.name}"`);
            }
            closeNewPlaylistModal();
            renderPlaylists();
        } catch (_) { }
    };
}

const newPlaylistBtn = document.getElementById('new-playlist-btn');
if (newPlaylistBtn) newPlaylistBtn.onclick = openNewPlaylistModal;

function renderPlaylists() {
    if (!playlistsContainer) return;
    playlistsContainer.innerHTML = '';
    if (!playlists.length) {
        playlistsContainer.innerHTML = '<div style="padding:32px 16px;text-align:center;color:var(--muted);font-size:13px">No playlists yet</div>';
        return;
    }
    playlists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `
            <div class="playlist-card-name">${pl.name}</div>
            <div class="playlist-card-count">${pl.trackCount ?? pl.tracks?.length ?? 0} tracks</div>
        `;
        card.onclick = () => openPlaylistDetail(pl);
        playlistsContainer.appendChild(card);
    });
}

async function openPlaylistDetail(pl) {
    currentPlaylist = pl;
    if (playlistsListView) playlistsListView.style.display = 'none';
    if (playlistDetail) playlistDetail.style.display = '';

    const nameEl = document.getElementById('playlist-detail-name');
    if (nameEl) nameEl.textContent = pl.name;

    const listEl = document.getElementById('playlist-track-list');
    if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">Loading\u2026</div>';

    try {
        const r = await fetch(`/api/playlists/${pl.id}`, { headers: hget() });
        const full = await r.json();
        currentPlaylist = full;

        if (listEl) {
            listEl.innerHTML = '';
            if (!full.tracks || !full.tracks.length) {
                listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">No tracks yet</div>';
                return;
            }
            full.tracks.forEach(t => listEl.appendChild(makeRow(t, false, true)));
        }

        const playAllBtn = document.getElementById('playlist-play-all');
        if (playAllBtn) {
            playAllBtn.onclick = () => {
                if (full.tracks && full.tracks.length) {
                    playTrack(full.tracks[0], full.tracks);
                }
            };
        }
    } catch (_) {
        if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">Failed to load</div>';
    }
}

const backBtn = document.getElementById('playlist-back-btn');
if (backBtn) {
    backBtn.onclick = () => {
        currentPlaylist = null;
        if (playlistDetail) playlistDetail.style.display = 'none';
        if (playlistsListView) playlistsListView.style.display = '';
    };
}

const deletePlaylistBtn = document.getElementById('delete-playlist-btn');
if (deletePlaylistBtn) {
    deletePlaylistBtn.onclick = async () => {
        if (!currentPlaylist) return;
        if (!confirm(`Delete "${currentPlaylist.name}"?`)) return;
        try {
            await fetch(`/api/playlists/${currentPlaylist.id}`, { method: 'DELETE', headers: hget() });
            playlists = playlists.filter(p => p.id !== currentPlaylist.id);
            currentPlaylist = null;
            if (playlistDetail) playlistDetail.style.display = 'none';
            if (playlistsListView) playlistsListView.style.display = '';
            renderPlaylists();
        } catch (_) {}
    };
}

async function init() {
    if (btnShuffle) btnShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
    if (expShuffle) expShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
    applyRepeat();

    if (volumeSlider) volumeSlider.value = SAVED_VOL;
    const sv = SAVED_VOL / 100;
    if (audio) audio.volume = Math.pow(sv, 3);
    if (volumeIcon) volumeIcon.innerHTML = sv === 0 ? volIcons.muted : sv < 0.5 ? volIcons.low : volIcons.high;

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

            if (player) {
                player.classList.remove('hidden');
                updatePlayerHeight();
            }

            const plTitle = document.getElementById('player-title');
            const plArtist = document.getElementById('player-artist');
            const mobTitle = document.querySelector('#player-meta-mobile .title');
            const mobArtist = document.querySelector('#player-meta-mobile .artist');
            const fullTitle = t.title || 'Unknown';
            const fullArtist = [t.artist, t.album].filter(Boolean).join(' \u00b7 ') || '\u2014';

            if (plTitle) plTitle.textContent = fullTitle;
            if (plArtist) plArtist.textContent = fullArtist;
            if (mobTitle) mobTitle.textContent = fullTitle;
            if (mobArtist) mobArtist.textContent = fullArtist;

            const pt = document.getElementById('player-thumb');
            if (pt) {
                pt.src = FALLBACK;
                loadCover(t.id, pt);
            }
            document.title = (t.title || '?') + ' \u2014 ' + (t.artist || '?');

            updateExpandedNowPlaying(t);
            // updateMediaSession is intentionally NOT called here during init —
            // the browser ignores it before audio has started. It fires correctly
            // in play() and on the audio 'play' event instead.
            loadLyrics(t);

            if (audio) {
                audio.src = '/api/stream/' + t.id;
                audio.addEventListener('loadedmetadata', () => {
                    if (pos > 0 && pos < audio.duration - 5) audio.currentTime = pos;
                }, { once: true });
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
        if (trackData) { openCtxMenu(e, trackData); }
    } else {
        closeCtxMenu();
    }
});

document.addEventListener('mouseup', () => { isSelecting = false; });

(async () => { const ok = await checkAuth(); if (ok) init() })();
