const TOKEN_KEY = 'music_token';
let token = localStorage.getItem(TOKEN_KEY) || '';
let tracks = [], filtered = [], queue = [], qIdx = -1, sortMode = 'title';
let shuffle = localStorage.getItem('music_shuffle') === 'true', seeking = false, muted = false;
const SAVED_VOL = parseInt(localStorage.getItem('music_vol') || '80');
let lastVol = SAVED_VOL;
let playlists = [], currentPlaylist = null, ctxTrack = null, pendingPlaylistTrack = null;

const audio = document.getElementById('audio');
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

if (audio) audio.volume = SAVED_VOL / 100;

function fmt(s) { if (!s || isNaN(s)) return '-'; s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
function hdrs() { return token ? { 'x-auth-token': token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' } }
function hget() { return token ? { 'x-auth-token': token } : {} }

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

function makeRow(t, showMenu = false) {
    const div = document.createElement('div'); div.className = 'track'; div.dataset.id = t.id;
    if (qIdx >= 0 && queue[qIdx]?.id === t.id) div.classList.add('active');
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
    if (showMenu) {
        const menuBtn = document.createElement('button'); menuBtn.className = 'track-menu-btn'; menuBtn.textContent = '\u2026'; menuBtn.title = 'Add to playlist';
        menuBtn.onclick = e => { e.stopPropagation(); openCtxMenu(e, t) };
        right.appendChild(menuBtn);
    }
    div.append(thumb, info, right);
    div.onclick = () => playTrack(t, filtered);
    return div;
}

function openCtxMenu(e, t) {
    ctxTrack = t; 
    const trackNameLabel = document.getElementById('ctx-track-name');
    if (trackNameLabel) trackNameLabel.textContent = t.title || 'Track';

    const ctxPlayNext = document.getElementById('ctx-play-next');
    if (ctxPlayNext) {
        ctxPlayNext.onclick = () => {
            if (!ctxTrack) return;
            queue.splice(qIdx + 1, 0, ctxTrack);
            showToast('Playing next');
            if (queueOpen) renderQueue();
            closeCtxMenu();
        };
    }

    if (ctxPlaylists) {
        ctxPlaylists.innerHTML = '';
        if (playlists.length) {
            playlists.forEach(pl => {
                const item = document.createElement('div'); 
                item.className = 'ctx-item'; 
                item.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M15 12h6"/></svg>${pl.name}`;
                item.onclick = () => { addToPlaylist(pl.id, t); closeCtxMenu() };
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
function closeCtxMenu() { if (ctxMenu) ctxMenu.classList.remove('open'); ctxTrack = null }
document.addEventListener('click', e => { if (ctxMenu && !ctxMenu.contains(e.target)) closeCtxMenu() });
const ctxNewPlaylist = document.getElementById('ctx-new-playlist');
if (ctxNewPlaylist) {
    ctxNewPlaylist.onclick = () => { pendingPlaylistTrack = ctxTrack; closeCtxMenu(); openNewPlaylistModal() };
}

async function loadPlaylists() {
    try {
        const r = await fetch('/api/playlists', { headers: hget() });
        if (!r.ok) return;
        playlists = await r.json(); renderPlaylists();
    } catch (e) {
        console.error("Failed to load playlists", e);
    }
}
function renderPlaylists() {
    if (!playlistsContainer) return;
    playlistsContainer.innerHTML = '';
    if (!playlists.length) { playlistsContainer.innerHTML = '<div style="padding:40px 16px;text-align:center;color:var(--muted);font-size:14px">No playlists yet</div>'; return }
    playlists.forEach(pl => {
        const card = document.createElement('div'); card.className = 'playlist-card';
        card.innerHTML = '<div class="playlist-icon">\u266B</div><div class="playlist-info"><div class="playlist-name">' + pl.name + '</div><div class="playlist-count">' + pl.tracks.length + ' song' + (pl.tracks.length !== 1 ? 's' : '') + '</div></div><button class="playlist-del" title="Delete">\u2715</button>';
        card.querySelector('.playlist-del').onclick = e => { e.stopPropagation(); deletePlaylist(pl.id) };
        card.onclick = () => openPlaylistDetail(pl); playlistsContainer.appendChild(card);
    });
}
function openPlaylistDetail(pl) {
    currentPlaylist = pl; 
    if (playlistsListView) playlistsListView.style.display = 'none'; 
    if (playlistDetail) playlistDetail.classList.add('active');
    const plName = document.getElementById('playlist-detail-name');
    if (plName) plName.textContent = pl.name; 
    renderPlaylistDetail(pl);
}
function renderPlaylistDetail(pl) {
    const plCount = document.getElementById('playlist-detail-count');
    if (plCount) plCount.textContent = pl.tracks.length + ' song' + (pl.tracks.length !== 1 ? 's' : '');
    const container = document.getElementById('playlist-tracks'); 
    if (!container) return;
    container.innerHTML = '';
    if (!pl.tracks.length) { container.innerHTML = '<div style="padding:32px 16px;text-align:center;color:var(--muted);font-size:14px">No songs yet \u2014 use \u2026 on any track to add</div>'; return }
    pl.tracks.forEach(pt => {
        const t = tracks.find(x => x.id === pt.trackId) || { id: pt.trackId, title: pt.title, artist: pt.artist, album: pt.album };
        const row = makeRow(t, false);
        const removeBtn = document.createElement('button'); removeBtn.className = 'track-menu-btn'; removeBtn.textContent = '\u2715'; removeBtn.style.opacity = '0'; removeBtn.title = 'Remove from playlist';
        removeBtn.onclick = e => { e.stopPropagation(); removeFromPlaylist(pl.id, pt.trackId) };
        const right = row.querySelector('.track-right');
        if (right) right.appendChild(removeBtn);
        row.onmouseenter = () => removeBtn.style.opacity = '1'; row.onmouseleave = () => removeBtn.style.opacity = '0';
        container.appendChild(row);
    });
}
const plBack = document.getElementById('playlist-back');
if (plBack) {
    plBack.onclick = () => { 
        if (playlistDetail) playlistDetail.classList.remove('active'); 
        if (playlistsListView) playlistsListView.style.display = ''; 
        currentPlaylist = null 
    };
}
const plPlayBtn = document.getElementById('playlist-play-btn');
if (plPlayBtn) {
    plPlayBtn.onclick = () => {
        if (!currentPlaylist || !currentPlaylist.tracks.length) return;
        const list = currentPlaylist.tracks.map(pt => tracks.find(x => x.id === pt.trackId)).filter(Boolean);
        if (!list.length) return;
        if (shuffle) { const first = list[Math.floor(Math.random() * list.length)]; playTrack(first, list) } else { playTrack(list[0], list) }
    };
}
async function addToPlaylist(playlistId, t) {
    try {
        const r = await fetch('/api/playlists/' + playlistId, { method: 'POST', headers: hdrs(), body: JSON.stringify({ trackId: t.id, title: t.title, artist: t.artist, album: t.album }) });
        if (r.ok) { 
            const updated = await r.json(); 
            playlists = playlists.map(p => p.id === playlistId ? updated : p); 
            if (currentPlaylist?.id === playlistId) { 
                currentPlaylist = updated; 
                renderPlaylistDetail(updated) 
            } 
            showToast('Added to ' + (playlists.find(p => p.id === playlistId)?.name || 'playlist')) 
        }
    } catch (e) {
        console.error("Failed to add to playlist", e);
    }
}
async function removeFromPlaylist(playlistId, trackId) {
    try {
        const r = await fetch('/api/playlists/' + playlistId + '?trackId=' + encodeURIComponent(trackId), { method: 'DELETE', headers: hget() });
        if (r.ok) { 
            const updated = await r.json(); 
            playlists = playlists.map(p => p.id === playlistId ? updated : p); 
            if (currentPlaylist?.id === playlistId) { 
                currentPlaylist = updated; 
                renderPlaylistDetail(updated) 
            } 
        }
    } catch (e) {
        console.error("Failed to remove from playlist", e);
    }
}
async function deletePlaylist(id) { 
    if (!confirm('Delete this playlist?')) return; 
    try {
        await fetch('/api/playlists?id=' + id, { method: 'DELETE', headers: hget() }); 
        playlists = playlists.filter(p => p.id !== id); 
        renderPlaylists() 
    } catch (e) {
        console.error("Failed to delete playlist", e);
    }
}
function openNewPlaylistModal() { 
    if (modalNew) modalNew.style.display = 'flex'; 
    if (modalNameInput) {
        modalNameInput.value = ''; 
        setTimeout(() => modalNameInput.focus(), 50) 
    }
}
const modalCancel = document.getElementById('modal-cancel');
if (modalCancel) {
    modalCancel.onclick = () => { if (modalNew) modalNew.style.display = 'none'; pendingPlaylistTrack = null };
}
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
                if (pendingPlaylistTrack) { 
                    await addToPlaylist(pl.id, pendingPlaylistTrack); 
                    pendingPlaylistTrack = null 
                } 
                renderPlaylists(); 
                if (modalNew) modalNew.style.display = 'none' 
            }
        } catch (e) {
            console.error("Failed to create playlist", e);
        }
    };
}
if (modalNameInput) {
    modalNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('modal-confirm').click() });
}
const newPlaylistBtn = document.getElementById('new-playlist-btn');
if (newPlaylistBtn) newPlaylistBtn.onclick = openNewPlaylistModal;

function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) { 
        t = document.createElement('div'); 
        t.id = 'toast'; 
        t.style.cssText = 'position:fixed;bottom:calc(var(--player-h)+12px);left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:8px 16px;border-radius:8px;font-size:13px;z-index:500;transition:opacity .3s'; 
        document.body.appendChild(t) 
    }
    t.textContent = msg; t.style.opacity = '1'; clearTimeout(t._t); t._t = setTimeout(() => t.style.opacity = '0', 2000);
}

const coverCache = {};
function loadCover(id, el) {
    if (id in coverCache) { if (coverCache[id]) setCover(el, coverCache[id]); return }
    coverCache[id] = null;
    const ts = token ? '?token=' + encodeURIComponent(token) : '';
    fetch('/api/cover/' + id + ts).then(r => { if (r.ok) { coverCache[id] = r.url; setCover(el, r.url) } }).catch(_ => { });
}
function setCover(el, url) {
    if (el.tagName === 'IMG') { 
        el.src = url; 
    } else { 
        el.innerHTML = ''; 
        const img = new Image(); 
        img.src = url; 
        img.alt = ''; 
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = el.classList.contains('thumb') ? 'cover' : 'contain';
        el.appendChild(img); 
    }
}
const FALLBACK = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%2326262e"/><text x="50%25" y="54%25" text-anchor="middle" fill="%237a7a8e" font-size="18">\u266A</text></svg>';

function playTrack(t, list) {
    queue = [...list]; qIdx = queue.findIndex(x => x.id === t.id); play(t);
    document.querySelectorAll('.track.active').forEach(e => e.classList.remove('active'));
    const row = document.querySelector('.track[data-id="' + t.id + '"]'); if (row) row.classList.add('active');
}

function play(t) {
    const ts = token ? '?token=' + encodeURIComponent(token) : '';
    if (audio) {
        audio.src = '/api/stream/' + t.id + ts; 
        audio.play().catch(e => console.error("Playback failed", e));
    }
    if (player) player.classList.remove('hidden');
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

    const pt = document.getElementById('player-thumb'); 
    if (pt) {
        pt.src = FALLBACK; 
        loadCover(t.id, pt);
    }
    document.title = (t.title || '?') + ' \u2014 ' + (t.artist || '?');
    if (timeTot) timeTot.textContent = '-';
    localStorage.setItem('music_last', JSON.stringify({ id: t.id, title: t.title, artist: t.artist, album: t.album }));
    localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
    localStorage.setItem('music_qidx', qIdx);
    loadLyrics(t); updateExpandedNowPlaying(t);
    const tsuf = token ? '?token=' + encodeURIComponent(token) : '';
    const covUrl = '/api/cover/' + t.id + tsuf;
    fetch(covUrl, { method: 'HEAD' }).then(r => { if (r.ok) updateMediaSession(t, covUrl); else updateMediaSession(t, null) }).catch(() => updateMediaSession(t, null));
}

function updateExpandedNowPlaying(t) {
    if (expTitle) expTitle.textContent = t.title || 'Unknown';
    if (expArtist) expArtist.textContent = [t.artist, t.album].filter(Boolean).join(' \u00B7 ') || '\u2014';
    if (expCover) expCover.style.display = 'block'; 
    if (expCoverIcon) expCoverIcon.style.display = 'none';
    if (expCover) loadCover(t.id, expCover);
    if (expCover) {
        expCover.onerror = () => { 
            expCover.style.display = 'none'; 
            if (expCoverIcon) expCoverIcon.style.display = 'block' 
        };
    }
}

if (audio) {
    audio.addEventListener('loadedmetadata', () => {
        if (audio.duration) {
            if (timeTot) timeTot.textContent = fmt(audio.duration);
            if (expTimeTot) expTimeTot.textContent = fmt(audio.duration);
            if (qIdx >= 0) {
                const dur = document.querySelector('.track-dur[data-id="' + queue[qIdx]?.id + '"]');
                if (dur) dur.textContent = fmt(audio.duration)
            }
        }
    });

    audio.addEventListener('play', () => { 
        if (iconPlay) iconPlay.style.display = 'none'; 
        if (iconPause) iconPause.style.display = 'block'; 
        if (expIconPlay) expIconPlay.style.display = 'none'; 
        if (expIconPause) expIconPause.style.display = 'block' 
    });
    audio.addEventListener('pause', () => { 
        if (iconPlay) iconPlay.style.display = 'block'; 
        if (iconPause) iconPause.style.display = 'none'; 
        if (expIconPlay) expIconPlay.style.display = 'block'; 
        if (expIconPause) expIconPause.style.display = 'none' 
    });
    audio.addEventListener('ended', () => nextTrack());
}

if (progress) {
    progress.addEventListener('mousedown', () => seeking = true);
    progress.addEventListener('touchstart', () => seeking = true, { passive: true });
    progress.addEventListener('input', () => { if (audio && audio.duration) { const v = audio.duration * progress.value / 100; if (timeCur) timeCur.textContent = fmt(v); if (expTimeCur) expTimeCur.textContent = fmt(v) } });
    progress.addEventListener('change', () => { if (audio && audio.duration) audio.currentTime = audio.duration * progress.value / 100; seeking = false });
}

if (expProgress) {
    expProgress.addEventListener('input', () => { if (audio && audio.duration) { const v = audio.duration * expProgress.value / 100; if (expTimeCur) expTimeCur.textContent = fmt(v) } });
    expProgress.addEventListener('change', () => { if (audio && audio.duration) audio.currentTime = audio.duration * expProgress.value / 100 });
}

if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
        const v = volumeSlider.value / 100; if (audio) audio.volume = v; muted = v === 0;
        if (volumeIcon) volumeIcon.textContent = v === 0 ? '\uD83D\uDD07' : v < 0.5 ? '\uD83D\uDD09' : '\uD83D\uDCA0';
        localStorage.setItem('music_vol', volumeSlider.value)
    });
}
if (volumeIcon) {
    volumeIcon.addEventListener('click', () => {
        if (muted) { 
            if (audio) audio.volume = lastVol / 100; 
            if (volumeSlider) volumeSlider.value = lastVol; 
            muted = false; 
            volumeIcon.textContent = lastVol < 50 ? '\uD83D\uDD09' : '\uD83D\uDCA0' 
        } else { 
            lastVol = parseInt(volumeSlider ? volumeSlider.value : '80'); 
            if (audio) audio.volume = 0; 
            if (volumeSlider) volumeSlider.value = 0; 
            muted = true; 
            volumeIcon.textContent = '\uD83D\uDD07' 
        }
    });
}

if (btnPlay) btnPlay.onclick = () => audio && (audio.paused ? audio.play() : audio.pause());
if (btnPrev) btnPrev.onclick = () => { if (audio && audio.currentTime > 3) audio.currentTime = 0; else prevTrack() };
if (btnNext) btnNext.onclick = () => nextTrack();
if (btnShuffle) {
    btnShuffle.onclick = () => { 
        shuffle = !shuffle; 
        btnShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)'; 
        if (expShuffle) expShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)'; 
        localStorage.setItem('music_shuffle', shuffle) 
    };
}

const btnRepeat = document.getElementById('btn-repeat');
let repeatMode = localStorage.getItem('music_repeat') || 'off';

const repeatIcons = {
    off: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
    all: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
    one: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15.5" text-anchor="middle" font-size="9" font-weight="bold" fill="currentColor">1</text></svg>`
};

function applyRepeat() {
    if (btnRepeat) {
        btnRepeat.dataset.mode = repeatMode;
        btnRepeat.innerHTML = repeatIcons[repeatMode];
        btnRepeat.title = 'Repeat: ' + repeatMode.charAt(0).toUpperCase() + repeatMode.slice(1);
        btnRepeat.classList.toggle('active', repeatMode !== 'off');
        btnRepeat.classList.toggle('data-mode-one', repeatMode === 'one');
    }

    if (expRepeat) {
        expRepeat.dataset.mode = repeatMode;
        expRepeat.innerHTML = repeatIcons[repeatMode];
        expRepeat.classList.toggle('active', repeatMode !== 'off');
        expRepeat.classList.toggle('data-mode-one', repeatMode === 'one');
    }
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
    if (repeatMode === 'one') { if (audio) { audio.currentTime = 0; audio.play() } return }
    const isLast = qIdx >= queue.length - 1;
    if (repeatMode === 'off' && isLast) return;
    qIdx = shuffle ? Math.floor(Math.random() * queue.length) : (qIdx + 1) % queue.length;
    play(queue[qIdx]); updateActive()
}
function prevTrack() { if (!queue.length) return; qIdx = (qIdx - 1 + queue.length) % queue.length; play(queue[qIdx]); updateActive() }
function updateActive() {
    document.querySelectorAll('.track.active').forEach(e => e.classList.remove('active'));
    if (qIdx >= 0) { const row = document.querySelector(`.track[data-id="${queue[qIdx]?.id}"]`); if (row) row.classList.add('active') }
    if (queueOpen) renderQueue();
}

if (searchEl) searchEl.addEventListener('input', applyFilter);
document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); if (audio) (audio.paused ? audio.play() : audio.pause()) }
    if (e.key === 'ArrowRight') nextTrack();
    if (e.key === 'ArrowLeft') prevTrack();
});

if (expPlay) expPlay.onclick = () => audio && (audio.paused ? audio.play() : audio.pause());
if (expPrev) expPrev.onclick = () => { if (audio && audio.currentTime > 3) audio.currentTime = 0; else prevTrack() };
if (expNext) expNext.onclick = () => nextTrack();
if (expShuffle) expShuffle.onclick = () => btnShuffle && btnShuffle.onclick();

let playerExpanded = false;
let touchStartY = 0, touchCurrentY = 0, playerSwiping = false;

const handle = document.getElementById('expand-handle');
if (handle) {
    handle.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; playerSwiping = true }, { passive: true });
    handle.addEventListener('mousedown', e => { touchStartY = e.clientY; playerSwiping = true });
}
document.addEventListener('touchmove', e => { if (!playerSwiping) return; touchCurrentY = e.touches[0].clientY }, { passive: true });
document.addEventListener('mousemove', e => { if (!playerSwiping) return; touchCurrentY = e.clientY });
document.addEventListener('touchend', e => {
    if (!playerSwiping) return; playerSwiping = false;
    const diff = touchStartY - touchCurrentY;
    if (diff > 30 && !playerExpanded) openExpandedPlayer();
    else if (diff < -30 && playerExpanded) closeExpandedPlayer();
}, { passive: true });
document.addEventListener('mouseup', () => {
    if (!playerSwiping) return; playerSwiping = false;
    const diff = touchStartY - touchCurrentY;
    if (diff > 30 && !playerExpanded) openExpandedPlayer();
    else if (diff < -30 && playerExpanded) closeExpandedPlayer();
});

function openExpandedPlayer() {
    playerExpanded = true; if (expPlayer) expPlayer.classList.add('open');
    if (lyricsPanel) lyricsPanel.classList.remove('open'); 
    if (lyricsBtn) lyricsBtn.classList.remove('active'); 
    lyricsOpen = false;
    if (queueOpen) { 
        if (queuePanel) queuePanel.classList.remove('open'); 
        if (queueBtn) queueBtn.classList.remove('active'); 
        queueOpen = false 
    }
    if (qIdx >= 0) updateExpandedNowPlaying(queue[qIdx]);
}
function closeExpandedPlayer() { playerExpanded = false; if (expPlayer) expPlayer.classList.remove('open') }
if (expCollapse) expCollapse.onclick = closeExpandedPlayer;
if (expPlayer) expPlayer.addEventListener('click', e => { if (e.target === expPlayer) closeExpandedPlayer() });

const queuePanel = document.getElementById('queue-panel');
const queueBtn = document.getElementById('queue-btn');
let queueOpen = false;

if (queueBtn) {
    queueBtn.onclick = () => {
        queueOpen = !queueOpen;
        if (queuePanel) queuePanel.classList.toggle('open', queueOpen);
        queueBtn.classList.toggle('active', queueOpen);
        if (queueOpen) { closeExpandedPlayer(); renderQueue() }
    };
}

function renderQueue() {
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
        item.innerHTML = `<span class="queue-handle">⠿</span><span class="queue-num">${i === qIdx ? '▶' : i + 1}</span><div class="queue-info"><div class="queue-title">${t.title || 'Unknown'}</div><div class="queue-sub">${t.artist || '—'}</div></div><button class="queue-remove" title="remove">✕</button>`;

        const handle = item.querySelector('.queue-handle');
        handle.onpointerdown = e => startQueueDrag(e, item);

        item.querySelector('.queue-remove').onclick = e => {
            e.stopPropagation();
            queue.splice(i, 1);
            if (i < qIdx) qIdx--;
            renderQueue();
            localStorage.setItem('music_queue', JSON.stringify(queue.map(x => x.id)));
            localStorage.setItem('music_qidx', qIdx);
        };

        item.onclick = () => { qIdx = i; play(queue[qIdx]); updateActive(); renderQueue() };
        queuePanel.appendChild(item);
    });

    const activeEl = queuePanel.querySelector('.queue-item.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'center' });
}

let dragItem = null, dragIdx = -1, dragStartPos = 0;
function startQueueDrag(e, item) {
    e.preventDefault();
    document.body.classList.add('is-dragging');
    dragItem = item;
    dragIdx = parseInt(item.dataset.idx);
    dragStartPos = e.clientY;
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
            
            // Adjust qIdx
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
        renderQueue();
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
    };
}

const ctxAddQueue = document.getElementById('ctx-add-queue');
if (ctxAddQueue) {
    ctxAddQueue.onclick = () => {
        if (!ctxTrack) return;
        queue.push(ctxTrack);
        showToast('Added to queue');
        if (queueOpen) renderQueue();
        closeCtxMenu();
    };
}

function updateMediaSession(t, coverUrl) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title || 'Unknown',
        artist: t.artist || 'Unknown',
        album: t.album || 'Unknown',
        artwork: coverUrl ? [{ src: coverUrl, sizes: '256x256' }] : []
    });

    navigator.mediaSession.setActionHandler('play', () => audio && audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio && audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
}

const lyricsPanel = document.getElementById('lyrics-panel');
const lyricsBtn = document.getElementById('lyrics-btn');
let syncedLyrics = [], plainLyrics = '', lyricsTrackId = null, lyricsOpen = false;
let lyricsFontSize = parseInt(localStorage.getItem('lyrics_font') || '13');

function applyLyricsFontSize() {
    document.querySelectorAll('.lyric-line').forEach(el => el.style.fontSize = lyricsFontSize + 'px');
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

if (lyricsBtn) {
    lyricsBtn.onclick = () => {
        lyricsOpen = !lyricsOpen;
        if (lyricsPanel) lyricsPanel.classList.toggle('open', lyricsOpen);
        lyricsBtn.classList.toggle('active', lyricsOpen);
        if (lyricsOpen) closeExpandedPlayer();
    };
}

// Lyrics Panel Dragging
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
    if (lyricsTrackId === t.id) return;
    lyricsTrackId = t.id;
    syncedLyrics = []; plainLyrics = '';

    const scroll = lyricsScroll();
    if (scroll) scroll.innerHTML = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">Loading lyrics…</div>';
    if (expLyricCur) expLyricCur.textContent = '…';
    if (expLyricNext) expLyricNext.textContent = '';

    try {
        const cleanTitle = (t.title || '').replace(/^\d{1,3}[\s.\-_]+/, '').trim();
        const q = new URLSearchParams({ title: cleanTitle, artist: t.artist || '', album: t.album || '' });
        const r = await fetch(`/api/lyrics?${q}`, { headers: token ? { 'x-auth-token': token } : {} });

        if (!r.ok) throw new Error('not found');
        const d = await r.json();

        const plTitle = document.getElementById('lyrics-panel-title');
        if (d.type === 'synced' && d.lyrics) {
            syncedLyrics = parseLRC(d.lyrics);
            renderSyncedLyrics();
            if (plTitle) plTitle.textContent = d.source === 'lrclib' ? 'Lyrics' : `Lyrics · ${d.source}`;
        } else if (d.type === 'plain' && d.lyrics) {
            plainLyrics = d.lyrics;
            renderPlainLyrics();
            if (plTitle) plTitle.textContent = d.source === 'lrclib' ? 'Lyrics' : `Lyrics · ${d.source}`;
        } else {
            if (scroll) scroll.innerHTML = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">No lyrics found</div>';
            if (plTitle) plTitle.textContent = 'Lyrics';
            if (expLyricCur) expLyricCur.textContent = '—';
            if (expLyricNext) expLyricNext.textContent = '';
        }
    } catch (_) {
        if (scroll) scroll.innerHTML = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">No lyrics found</div>';
        if (expLyricCur) expLyricCur.textContent = '-';
        if (expLyricNext) expLyricNext.textContent = '';
    }
}

function parseLRC(lrc) {
    return lrc.split('\n').map(line => {
        const m = line.match(/^\[(\d+):(\d+\.\d+)\](.*)/);
        if (!m) return null;
        return { time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() };
    }).filter(Boolean);
}

function lyricsScroll() { return document.getElementById('lyrics-scroll'); }

function renderSyncedLyrics() {
    const scroll = lyricsScroll();
    if (!scroll) return;
    scroll.innerHTML = '';
    syncedLyrics.forEach((l, i) => {
        const div = document.createElement('div');
        div.className = 'lyric-line';
        div.textContent = l.text || '\u00B7';
        div.dataset.idx = i;
        div.onclick = () => { if (audio) audio.currentTime = l.time };
        scroll.appendChild(div);
    });
    applyLyricsFontSize();
}

function renderPlainLyrics() {
    const scroll = lyricsScroll();
    if (!scroll) return;
    scroll.innerHTML = '';
    plainLyrics.split('\n').forEach(line => {
        const div = document.createElement('div');
        div.className = 'lyric-line';
        div.textContent = line || ' ';
        scroll.appendChild(div);
    });
    applyLyricsFontSize();
}

let lastExpLyricIdx = -1;
if (audio) {
    audio.addEventListener('timeupdate', () => {
        // 1. Progress Bar Logic
        if (audio.currentTime > 0 && Math.round(audio.currentTime) % 5 === 0) {
            localStorage.setItem('music_pos', audio.currentTime);
        }
        if (!seeking && audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            if (progress) progress.value = pct; 
            if (expProgress) expProgress.value = pct;
            if (timeCur) timeCur.textContent = fmt(audio.currentTime); 
            if (expTimeCur) expTimeCur.textContent = fmt(audio.currentTime);
        }

        // 2. Lyrics Logic
        if (!syncedLyrics.length) return;
        const t = audio.currentTime;
        let idx = syncedLyrics.findIndex((l, i) => {
            const next = syncedLyrics[i + 1];
            return t >= l.time && (!next || t < next.time);
        });

        if (idx === lastExpLyricIdx) return;
        lastExpLyricIdx = idx;

        if (idx >= 0) {
            const curText = syncedLyrics[idx].text || '\u00B7';
            const nxt = syncedLyrics[idx + 1];
            const nextText = nxt ? (nxt.text || '\u00B7') : '';

            if (expLyricCur) {
                expLyricCur.style.opacity = '0';
                expLyricCur.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    expLyricCur.textContent = curText;
                    expLyricCur.style.opacity = '1';
                    expLyricCur.style.transform = 'translateY(0)';
                }, 150);
            }
            if (expLyricNext) {
                expLyricNext.style.opacity = '0';
                expLyricNext.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    expLyricNext.textContent = nextText;
                    expLyricNext.style.opacity = '1';
                    expLyricNext.style.transform = 'translateY(0)';
                }, 150);
            }

            const scroll = lyricsScroll();
            if (scroll) {
                scroll.querySelectorAll('.lyric-line').forEach((el, i) => {
                    el.classList.toggle('active', i === idx);
                });

                if (lyricsOpen) {
                    const el = scroll.querySelector(`[data-idx="${idx}"]`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    });
}

async function init() {
    if (btnShuffle) btnShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
    if (expShuffle) expShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
    applyRepeat();

    if (volumeSlider) volumeSlider.value = SAVED_VOL;
    const sv = SAVED_VOL / 100;
    if (audio) audio.volume = sv;
    if (volumeIcon) volumeIcon.textContent = sv === 0 ? '\uD83D\uDD07' : sv < 0.5 ? '\uD83D\uDD09' : '\uD83D\uDCA0';

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

            if (player) player.classList.remove('hidden');
            const plTitle = document.getElementById('player-title');
            const plArtist = document.getElementById('player-artist');
            if (plTitle) plTitle.textContent = t.title || 'Unknown';
            if (plArtist) plArtist.textContent = [t.artist, t.album].filter(Boolean).join(' · ') || '—';
            const pt = document.getElementById('player-thumb');
            if (pt) {
                pt.src = FALLBACK;
                loadCover(t.id, pt);
            }
            document.title = (t.title || '?') + ' · Jam!';

            const ts = token ? '?token=' + encodeURIComponent(token) : '';
            if (audio) {
                audio.src = '/api/stream/' + t.id + ts;
                audio.addEventListener('loadedmetadata', () => {
                    if (pos > 0 && pos < audio.duration - 5) audio.currentTime = pos;
                }, { once: true });
            }
        }
    } catch (_) { }
}

(async () => { const ok = await checkAuth(); if (ok) init() })();
