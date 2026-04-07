const TOKEN_KEY='music_token';
let token=localStorage.getItem(TOKEN_KEY)||'';
let tracks=[],filtered=[],queue=[],qIdx=-1,sortMode='title';
let shuffle=localStorage.getItem('music_shuffle')==='true',seeking=false,muted=false;
const SAVED_VOL=parseInt(localStorage.getItem('music_vol')||'80');
let lastVol=SAVED_VOL;
let playlists=[],currentPlaylist=null,ctxTrack=null,pendingPlaylistTrack=null;

const audio=document.getElementById('audio');
const player=document.getElementById('player');
const trackList=document.getElementById('track-list');
const loading=document.getElementById('loading');
const empty=document.getElementById('empty');
const searchEl=document.getElementById('search');
const sortBtn=document.getElementById('sort-btn');
const btnPlay=document.getElementById('btn-play');
const btnPrev=document.getElementById('btn-prev');
const btnNext=document.getElementById('btn-next');
const btnShuffle=document.getElementById('btn-shuffle');
const iconPlay=document.getElementById('icon-play');
const iconPause=document.getElementById('icon-pause');
const progress=document.getElementById('progress');
const timeCur=document.getElementById('time-cur');
const timeTot=document.getElementById('time-tot');
const volumeSlider=document.getElementById('volume');
const volumeIcon=document.getElementById('volume-icon');
const authOverlay=document.getElementById('auth-overlay');
const authInput=document.getElementById('auth-input');
const authSubmit=document.getElementById('auth-submit');
const authError=document.getElementById('auth-error');
const ctxMenu=document.getElementById('ctx-menu');
const ctxPlaylists=document.getElementById('ctx-playlists');
const modalNew=document.getElementById('modal-new');
const modalNameInput=document.getElementById('modal-name-input');
const playlistsContainer=document.getElementById('playlists-container');
const playlistDetail=document.getElementById('playlist-detail');
const playlistsListView=document.getElementById('playlists-list-view');

// Expanded player refs
const expPlayer=document.getElementById('expanded-player');
const expCollapse=document.getElementById('exp-collapse');
const expCover=document.getElementById('exp-cover');
const expCoverIcon=document.getElementById('exp-cover-icon');
const expCoverWrap=document.getElementById('exp-cover-wrap');
const expTitle=document.getElementById('exp-title');
const expArtist=document.getElementById('exp-artist');
const expLyricCur=document.getElementById('exp-lyric-current');
const expLyricNext=document.getElementById('exp-lyric-next');
const expPlay=document.getElementById('exp-play');
const expPrev=document.getElementById('exp-prev');
const expNext=document.getElementById('exp-next');
const expShuffle=document.getElementById('exp-shuffle');
const expRepeat=document.getElementById('exp-repeat');
const expProgress=document.getElementById('exp-progress');
const expTimeCur=document.getElementById('exp-time-cur');
const expTimeTot=document.getElementById('exp-time-tot');
const expIconPlay=document.getElementById('exp-icon-play');
const expIconPause=document.getElementById('exp-icon-pause');

audio.volume=SAVED_VOL/100;

function fmt(s){if(!s||isNaN(s))return'-';s=Math.round(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function hdrs(){return token?{'x-auth-token':token,'Content-Type':'application/json'}:{'Content-Type':'application/json'}}
function hget(){return token?{'x-auth-token':token}:{}}

async function checkAuth(){
  const r=await fetch('/api/status',{headers:hget()});
  if(r.status===401){showAuth();return false}
  return true
}
function showAuth(){authOverlay.style.display='flex'}
function hideAuth(){authOverlay.style.display='none'}
authSubmit.onclick=async()=>{
  token=authInput.value.trim();authError.style.display='none';
  const ok=await checkAuth();
  if(ok){localStorage.setItem(TOKEN_KEY,token);hideAuth();init()}
  else authError.style.display='block'
};
authInput.addEventListener('keydown',e=>{if(e.key==='Enter')authSubmit.click()});

document.querySelectorAll('.tab').forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const name=tab.dataset.tab;
    document.getElementById('view-library').classList.toggle('active',name==='library');
    document.getElementById('view-playlists').classList.toggle('active',name==='playlists');
    document.getElementById('search-wrap').style.display=name==='library'?'':'none';
    document.getElementById('sort-btn').style.display=name==='library'?'':'none';
    if(name==='playlists')loadPlaylists();
  }
});

async function loadTracks(){
  loading.style.display='flex';empty.style.display='none';trackList.innerHTML='';
  try{
    const r=await fetch('/api/tracks',{headers:hget()});
    if(r.status===401){showAuth();return}
    tracks=await r.json();
    if(!tracks.length){loading.style.display='none';empty.style.display='flex';return}
    applyFilter();
  }catch(e){loading.style.display='none';empty.style.display='flex'}
}

function applyFilter(){
  const q=searchEl.value.toLowerCase();
  filtered=q?tracks.filter(t=>(t.title||'').toLowerCase().includes(q)||(t.artist||'').toLowerCase().includes(q)||(t.album||'').toLowerCase().includes(q)):[...tracks];
  sort();
}

const sortModes=['title','artist','album'];
const sortLabels=['A->Z','ARTIST','ALBUM'];
let sortModeIdx=0;
sortBtn.onclick=()=>{sortModeIdx=(sortModeIdx+1)%3;sortMode=sortModes[sortModeIdx];sortBtn.textContent=sortLabels[sortModeIdx];sort()};

function sort(){
  filtered.sort((a,b)=>{const ka=(a[sortMode]||'').toLowerCase(),kb=(b[sortMode]||'').toLowerCase();return ka<kb?-1:ka>kb?1:0});
  renderList();
}

function groupKey(t){
  if(sortMode==='title')return(t.title||'?')[0].toUpperCase();
  if(sortMode==='artist')return t.artist||'Unknown';
  return t.album||'Unknown';
}

function renderList(){
  loading.style.display='none';trackList.innerHTML='';
  if(!filtered.length){empty.style.display='flex';return}
  empty.style.display='none';
  let lastGroup='';
  const frag=document.createDocumentFragment();
  for(const t of filtered){
    const g=groupKey(t);
    if(g!==lastGroup){lastGroup=g;const h=document.createElement('div');h.className='group-header';h.textContent=g;frag.appendChild(h)}
    frag.appendChild(makeRow(t,true));
  }
  trackList.appendChild(frag);
}

function makeRow(t, showMenu=false){
  const div=document.createElement('div');div.className='track';div.dataset.id=t.id;
  if(qIdx>=0&&queue[qIdx]?.id===t.id)div.classList.add('active');
  const thumb=document.createElement('div');thumb.className='thumb';
  const sp=document.createElement('span');sp.className='thumb-icon';sp.textContent='\u266A';thumb.appendChild(sp);
  loadCover(t.id,thumb);
  const info=document.createElement('div');info.className='track-info';
  const ti=document.createElement('div');ti.className='track-title';ti.textContent=t.title||'Unknown';
  const ts=document.createElement('div');ts.className='track-sub';ts.textContent=[t.artist,t.album].filter(Boolean).join(' \u00B7 ')||'\u2014';
  info.append(ti,ts);
  const right=document.createElement('div');right.className='track-right';
  const dur=document.createElement('div');dur.className='track-dur';dur.dataset.id=t.id;dur.textContent=fmt(t.duration);
  right.appendChild(dur);
  if(showMenu){
    const menuBtn=document.createElement('button');menuBtn.className='track-menu-btn';menuBtn.textContent='\u2026';menuBtn.title='Add to playlist';
    menuBtn.onclick=e=>{e.stopPropagation();openCtxMenu(e,t)};
    right.appendChild(menuBtn);
  }
  div.append(thumb,info,right);
  div.onclick=()=>playTrack(t,filtered);
  return div;
}

function openCtxMenu(e,t){
  ctxTrack=t;ctxPlaylists.innerHTML='';
  if(playlists.length){
    playlists.forEach(pl=>{
      const item=document.createElement('div');item.className='ctx-item';item.textContent=pl.name;
      item.onclick=()=>{addToPlaylist(pl.id,t);closeCtxMenu()};
      ctxPlaylists.appendChild(item);
    });
  } else {
    const none=document.createElement('div');none.style.cssText='padding:6px 12px;font-size:12px;color:var(--muted);none.textContent='No playlists yet';
    ctxPlaylists.appendChild(none);
  }
  ctxMenu.style.left=Math.min(e.clientX,window.innerWidth-200)+'px';
  ctxMenu.style.top=Math.min(e.clientY,window.innerHeight-200)+'px';
  ctxMenu.classList.add('open');
}
function closeCtxMenu(){ctxMenu.classList.remove('open');ctxTrack=null}
document.addEventListener('click',e=>{if(!ctxMenu.contains(e.target))closeCtxMenu()});
document.getElementById('ctx-new-playlist').onclick=()=>{pendingPlaylistTrack=ctxTrack;closeCtxMenu();openNewPlaylistModal()};

async function loadPlaylists(){
  const r=await fetch('/api/playlists',{headers:hget()});
  if(!r.ok)return;
  playlists=await r.json();renderPlaylists();
}
function renderPlaylists(){
  playlistsContainer.innerHTML='';
  if(!playlists.length){playlistsContainer.innerHTML='<div style="padding:40px 16px;text-align:center;color:var(--muted);font-size:14px">No playlists yet</div>';return}
  playlists.forEach(pl=>{
    const card=document.createElement('div');card.className='playlist-card';
    card.innerHTML='<div class="playlist-icon">\u266B</div><div class="playlist-info"><div class="playlist-name">'+pl.name+'</div><div class="playlist-count">'+pl.tracks.length+' song'+(pl.tracks.length!==1?'s':'')+'</div></div><button class="playlist-del" title="Delete">\u2715</button>';
    card.querySelector('.playlist-del').onclick=e=>{e.stopPropagation();deletePlaylist(pl.id)};
    card.onclick=()=>openPlaylistDetail(pl);playlistsContainer.appendChild(card);
  });
}
function openPlaylistDetail(pl){
  currentPlaylist=pl;playlistsListView.style.display='none';playlistDetail.classList.add('active');
  document.getElementById('playlist-detail-name').textContent=pl.name;renderPlaylistDetail(pl);
}
function renderPlaylistDetail(pl){
  document.getElementById('playlist-detail-count').textContent=pl.tracks.length+' song'+(pl.tracks.length!==1?'s':'');
  const container=document.getElementById('playlist-tracks');container.innerHTML='';
  if(!pl.tracks.length){container.innerHTML='<div style="padding:32px 16px;text-align:center;color:var(--muted);font-size:14px">No songs yet \u2014 use \u2026 on any track to add</div>';return}
  pl.tracks.forEach(pt=>{
    const t=tracks.find(x=>x.id===pt.trackId)||{id:pt.trackId,title:pt.title,artist:pt.artist,album:pt.album};
    const row=makeRow(t,false);
    const removeBtn=document.createElement('button');removeBtn.className='track-menu-btn';removeBtn.textContent='\u2715';removeBtn.style.opacity='0';removeBtn.title='Remove from playlist';
    removeBtn.onclick=e=>{e.stopPropagation();removeFromPlaylist(pl.id,pt.trackId)};
    row.querySelector('.track-right').appendChild(removeBtn);
    row.onmouseenter=()=>removeBtn.style.opacity='1';row.onmouseleave=()=>removeBtn.style.opacity='0';
    container.appendChild(row);
  });
}
document.getElementById('playlist-back').onclick=()=>{playlistDetail.classList.remove('active');playlistsListView.style.display='';currentPlaylist=null};
document.getElementById('playlist-play-btn').onclick=()=>{
  if(!currentPlaylist||!currentPlaylist.tracks.length)return;
  const list=currentPlaylist.tracks.map(pt=>tracks.find(x=>x.id===pt.trackId)).filter(Boolean);
  if(!list.length)return;
  if(shuffle){const first=list[Math.floor(Math.random()*list.length)];playTrack(first,list)}else{playTrack(list[0],list)}
};
async function addToPlaylist(playlistId,t){
  const r=await fetch('/api/playlists/'+playlistId,{method:'POST',headers:hdrs(),body:JSON.stringify({trackId:t.id,title:t.title,artist:t.artist,album:t.album})});
  if(r.ok){const updated=await r.json();playlists=playlists.map(p=>p.id===playlistId?updated:p);if(currentPlaylist?.id===playlistId){currentPlaylist=updated;renderPlaylistDetail(updated)}showToast('Added to '+playlists.find(p=>p.id===playlistId)?.name||'playlist')}}
async function removeFromPlaylist(playlistId,trackId){
  const r=await fetch('/api/playlists/'+playlistID+'?trackId='+encodeURIComponent(trackId),{method:'DELETE',headers:hget()});
  if(r.ok){const updated=await r.json();playlists=playlists.map(p=>p.id===playlistId?updated:p);if(currentPlaylist?.id===playlistId){currentPlaylist=updated;renderPlaylistDetail(updated)}}
}
async function deletePlaylist(id){if(!confirm('Delete this playlist?'))return;await fetch('/api/playlists?id='+id,{method:'DELETE',headers:hget()});playlists=playlists.filter(p=>p.id!==id);renderPlaylists()}
function openNewPlaylistModal(){modalNew.style.display='flex';modalNameInput.value='';setTimeout(()=>modalNameInput.focus(),50)}
document.getElementById('modal-cancel').onclick=()=>{modalNew.style.display='none';pendingPlaylistTrack=null};
document.getElementById('modal-confirm').onclick=async()=>{
  const name=modalNameInput.value.trim();if(!name)return;
  const r=await fetch('/api/playlists',{method:'POST',headers:hdrs(),body:JSON.stringify({name})});
  if(r.ok){const pl=await r.json();playlists.push(pl);if(pendingPlaylistTrack){await addToPlaylist(pl.id,pendingPlaylistTrack);pendingPlaylistTrack=null}renderPlaylists();modalNew.style.display='none'}
};
modalNameInput.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('modal-confirm').click()});
document.getElementById('new-playlist-btn').onclick=openNewPlaylistModal;

function showToast(msg){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;bottom:calc(var(--player-h)+12px);left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:8px 16px;border-radius:8px;font-size:13px;z-index:500;transition:opacity .3s';document.body.appendChild(t)}
  t.textContent=msg;t.style.opacity='1';clearTimeout(t._t);t._t=setTimeout(()=>t.style.opacity='0',2000);
}

const coverCache={};
function loadCover(id,el){
  if(id in coverCache){if(coverCache[id])setCover(el,coverCache[id]);return}
  coverCache[id]=null;
  const ts=token?'?token='+encodeURIComponent(token):'';
  fetch('/api/cover/'+id+ts).then(r=>{if(r.ok){coverCache[id]=r.url;setCover(el,r.url)}}).catch(_=>{});
}
function setCover(el,url){
  if(el.tagName==='IMG'){el.src=url}else{el.innerHTML='';const img=new Image();img.src=url;img.alt='';el.appendChild(img)}
}
const FALLBACK='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%2326262e"/><text x="50%25" y="54%25" text-anchor="middle" fill="%237a7a8e" font-size="18">\u266A</text></svg>';

function playTrack(t,list){
  queue=[...list];qIdx=queue.findIndex(x=>x.id===t.id);play(t);
  document.querySelectorAll('.track.active').forEach(e=>e.classList.remove('active'));
  const row=document.querySelector('.track[data-id="'+t.id+'"]');if(row)row.classList.add('active');
}

function play(t){
  const ts=token?'?token='+encodeURIComponent(token):'';
  audio.src='/api/stream/'+t.id+ts;audio.play();player.classList.remove('hidden');
  document.getElementById('player-title').textContent=t.title||'Unknown';
  document.getElementById('player-artist').textContent=[t.artist,t.album].filter(Boolean).join(' \u00B7 ')||'\u2014';
  const pt=document.getElementById('player-thumb');pt.src=FALLBACK;loadCover(t.id,pt);
  document.title=(t.title||'?')+' \u2014 '+(t.artist||'?');
  timeTot.textContent='-';
  localStorage.setItem('music_last',JSON.stringify({id:t.id,title:t.title,artist:t.artist,album:t.album}));
  localStorage.setItem('music_queue',JSON.stringify(queue.map(x=>x.id)));
  localStorage.setItem('music_qidx',qIdx);
  loadLyrics(t);updateExpandedNowPlaying(t);
  const tsuf=token?'?token='+encodeURIComponent(token):'';
  const covUrl='/api/cover/'+t.id+tsuf;
  fetch(covUrl,{method:'HEAD'}).then(r=>{if(r.ok)updateMediaSession(t,covUrl);else updateMediaSession(t,null)}).catch(()=>updateMediaSession(t,null)});
}

function updateExpandedNowPlaying(t){
  expTitle.textContent=t.title||'Unknown';
  expArtist.textContent=[t.artist,t.album].filter(Boolean).join(' \u00B7 ')||'\u2014';
  expCover.style.display='block';expCoverIcon.style.display='none';
  loadCover(t.id,expCoverWrap);
  expCover.onerror=()=>{expCover.style.display='none';expCoverIcon.style.display='block'};
}

audio.addEventListener('loadedmetadata',()=>{
  if(audio.duration){timeTot.textContent=fmt(audio.duration);expTimeTot.textContent=fmt(audio.duration);if(qIdx>=0){const dur=document.querySelector('.track-dur[data-id="'+queue[qIdx]?.id+"']');if(dur)dur.textContent=fmt(audio.duration)}}
});
audio.addEventListener('timeupdate',()=>{
  if(audio.currentTime>0&&Math.round(audio.currentTime)%5===0)localStorage.setItem('music_pos',audio.currentTime);
  if(seeking||!audio.duration)return;
  const pct=(audio.currentTime/audio.duration)*100;
  progress.value=pct;expProgress.value=pct;
  timeCur.textContent=fmt(audio.currentTime);expTimeCur.textContent=fmt(audio.currentTime);
});
audio.addEventListener('play',()=>{iconPlay.style.display='none';iconPause.style.display='block';expIconPlay.style.display='none';expIconPause.style.display='block'});
audio.addEventListener('pause',()=>{iconPlay.style.display='block';iconPause.style.display='none';expIconPlay.style.display='block';expIconPause.style.display='none'});
audio.addEventListener('ended',()=>nextTrack());

progress.addEventListener('mousedown',()=>seeking=true);
progress.addEventListener('touchstart',()=>seeking=true,{passive:true});
progress.addEventListener('input',()=>{if(audio.duration){const v=audio.duration*progress.value/100;timeCur.textContent=fmt(v);expTimeCur.textContent=fmt(v)}});
progress.addEventListener('change',()=>{if(audio.duration)audio.currentTime=audio.duration*progress.value/100;seeking=false});
expProgress.addEventListener('input',()=>{if(audio.duration){const v=audio.duration*expProgress.value/100;expTimeCur.textContent=fmt(v)}});
expProgress.addEventListener('change',()=>{if(audio.duration)audio.currentTime=audio.duration*expProgress.value/100});

volumeSlider.addEventListener('input',()=>{
  const v=volumeSlider.value/100;audio.volume=v;muted=v===0;
  volumeIcon.textContent=v===0?'\uD83D\uDD07':v<0.5?'\uD83D\uDD09':'\uD83D\uDCA0';
  localStorage.setItem('music_vol',volumeSlider.value)
});
volumeIcon.addEventListener('click',()=>{
  if(muted){audio.volume=lastVol/100;volumeSlider.value=lastVol;muted=false;volumeIcon.textContent=lastVol<50?'\uD83D\uDD09':'\uD83D\uDCA0'}
  else{lastVol=parseInt(volumeSlider.value);audio.volume=0;volumeSlider.value=0;muted=true;volumeIcon.textContent='\uD83D\uDD07'}
});

btnPlay.onclick=()=>audio.paused?audio.play():audio.pause();
btnPrev.onclick=()=>{if(audio.currentTime>3)audio.currentTime=0;else prevTrack()};
btnNext.onclick=()=>nextTrack();
btnShuffle.onclick=()=>{shuffle=!shuffle;btnShuffle.style.color=shuffle?'var(--accent)':'var(--muted)';expShuffle.style.color=shuffle?'var(--accent)':'var(--muted)';localStorage.setItem('music_shuffle',shuffle)};

// Repeat modes - FIXED: uses template literals for clean SVG handling
const btnRepeat=document.getElementById('btn-repeat');
let repeatMode=localStorage.getItem('music_repeat')||'off';

// Using template literals (backticks) so we can use quotes freely inside
const repeatIcons = {
  off: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
  all: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
  one: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15.5" text-anchor="middle" font-size="9" font-weight="bold" fill="currentColor">1</text></svg>`
};

function applyRepeat(){
  btnRepeat.dataset.mode = repeatMode;
  btnRepeat.innerHTML = repeatIcons[repeatMode];
  btnRepeat.title = 'Repeat: ' + repeatMode.charAt(0).toUpperCase() + repeatMode.slice(1);
  btnRepeat.classList.toggle('active', repeatMode !== 'off');
  btnRepeat.classList.toggle('data-mode-one', repeatMode === 'one');

  // Sync expanded button
  expRepeat.dataset.mode = repeatMode;
  expRepeat.innerHTML = repeatIcons[repeatMode];
  expRepeat.classList.toggle('active', repeatMode !== 'off');
  expRepeat.classList.toggle('data-mode-one', repeatMode === 'one');
}

applyRepeat();

btnRepeat.onclick = () => {
  const modes = ['off', 'all', 'one'];
  repeatMode = modes[(modes.indexOf(repeatMode) + 1) % 3];
  localStorage.setItem('music_repeat', repeatMode);
  applyRepeat();
};

expRepeat.onclick = () => btnRepeat.onclick();

function nextTrack(){
  if(!queue.length)return;
  if(repeatMode==='one'){audio.currentTime=0;audio.play();return}
  const isLast=qIdx>=queue.length-1;
  if(repeatMode==='off'&&isLast)return;
  qIdx=shuffle?Math.floor(Math.random()*queue.length):(qIdx+1)%queue.length;
  play(queue[qIdx]);updateActive()
}
function prevTrack(){if(!queue.length)return;qIdx=(qIdx-1+queue.length)%queue.length;play(queue[qIdx]);updateActive()}
function updateActive(){
  document.querySelectorAll('.track.active').forEach(e=>e.classList.remove('active'));
  if(qIdx>=0){const row=document.querySelector(`.track[data-id="${queue[qIdx]?.id}"]`);if(row)row.classList.add('active')}
  if(queueOpen)renderQueue();
}

searchEl.addEventListener('input',applyFilter);
document.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key===' '){e.preventDefault();audio.paused?audio.play():audio.pause()}
  if(e.key==='ArrowRight')nextTrack();
  if(e.key==='ArrowLeft')prevTrack();
});

// Expanded player controls
expPlay.onclick=()=>audio.paused?audio.play():audio.pause();
expPrev.onclick=()=>{if(audio.currentTime>3)audio.currentTime=0;else prevTrack()};
expNext.onclick=()=>nextTrack();
expShuffle.onclick=()=>btnShuffle.onclick();

// Expanded player swipe up/down
let playerExpanded=false;
let touchStartY=0,touchCurrentY=0,playerSwiping=false;

const handle=document.getElementById('expand-handle');
handle.addEventListener('touchstart',e=>{touchStartY=e.touches[0].clientY;playerSwiping=true},{passive:true});
handle.addEventListener('mousedown',e=>{touchStartY=e.clientY;playerSwiping=true});
document.addEventListener('touchmove',e=>{if(!playerSwiping)return;touchCurrentY=e.touches[0].clientY},{passive:true});
document.addEventListener('mousemove',e=>{if(!playerSwiping)return;touchCurrentY=e.clientY});
document.addEventListener('touchend',e=>{
  if(!playerSwiping)return;playerSwiping=false;
  const diff=touchStartY-touchCurrentY;
  if(diff>30&&!playerExpanded)openExpandedPlayer();
  else if(diff<-30&&playerExpanded)closeExpandedPlayer();
},{passive:true});
document.addEventListener('mouseup',()=>{
  if(!playerSwiping)return;playerSwiping=false;
  const diff=touchStartY-touchCurrentY;
  if(diff>30&&!playerExpanded)openExpandedPlayer();
  else if(diff<-30&&playerExpanded)closeExpandedPlayer();
});

function openExpandedPlayer(){
  playerExpanded=true;expPlayer.classList.add('open');
  lyricsPanel.classList.remove('open');lyricsBtn.classList.remove('active');lyricsOpen=false;
  if(queueOpen){queuePanel.classList.remove('open');queueBtn.classList.remove('active');queueOpen=false}
  if(qIdx>=0)updateExpandedNowPlaying(queue[qIdx]);
}
function closeExpandedPlayer(){playerExpanded=false;expPlayer.classList.remove('open')}
expCollapse.onclick=closeExpandedPlayer;
expPlayer.addEventListener('click',e=>{if(e.target===expPlayer)closeExpandedPlayer()});

// Queue
const queuePanel = document.getElementById('queue-panel');
const queueBtn = document.getElementById('queue-btn');
let queueOpen = false;

queueBtn.onclick = () => {
  queueOpen = !queueOpen;
  queuePanel.classList.toggle('open', queueOpen);
  queueBtn.classList.toggle('active', queueOpen);
  if(queueOpen){closeExpandedPlayer();renderQueue()}
};

function renderQueue() {
  queuePanel.querySelectorAll('.queue-item').forEach(e => e.remove());
  const oldEmpty = queuePanel.querySelector('[style*="padding:40px"]');
  if(oldEmpty) oldEmpty.remove();

  if (!queue.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:40px 20px;text-align:center;color:var(--muted);font-size:13px';
    empty.textContent = 'Queue is empty';
    queuePanel.appendChild(empty);
    return;
  }

  queue.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = 'queue-item' + (i === qIdx ? ' active' : '');
    item.draggable = true;
    item.dataset.idx = i;
    item.innerHTML = `<span class="queue-handle">⠿</span><span class="queue-num">${i === qIdx ? '▶' : i + 1}</span><div class="queue-info"><div class="queue-title">${t.title || 'Unknown'}</div><div class="queue-sub">${t.artist || '—'}</div></div><button class="queue-remove" title="remove">✕</button>`;
    
    item.querySelector('.queue-remove').onclick = e => {
      e.stopPropagation();
      queue.splice(i, 1);
      if (i < qIdx) qIdx--;
      renderQueue();
    };

    item.onclick = () => { qIdx = i; play(queue[qIdx]); updateActive(); renderQueue() };

    // Desktop drag
    item.addEventListener('dragstart', e => {
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', i);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const d = document.querySelector('.dragging');
      if (d && d !== item) item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));

    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');

      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));

      if (fromIdx === i || isNaN(fromIdx)) return;

      const [moved] = queue.splice(fromIdx, 1);
      queue.splice(i, 0, moved);

      if (qIdx === fromIdx) qIdx = i;
      else if (fromIdx < qIdx && i >= qIdx) qIdx--;
      else if (fromIdx > qIdx && i <= qIdx) qIdx++;

      renderQueue();
    });

    // Mobile long-press drag
    initTouchDrag(item, i);
    queuePanel.appendChild(item);
  });

  const activeEl = queuePanel.querySelector('.queue-item.active');
  if(activeEl) activeEl.scrollIntoView({ block: 'center' });
}

// Mobile long-press drag for queue items
function initTouchDrag(item, idx) {
  let pressTimer = null, longPress = false,
      touchStartX = 0, touchStartY = 0,
      clone = null, placeholder = null, dragOverIdx = null;

  item.addEventListener('touchstart', e => {
    longPress = false;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    pressTimer = setTimeout(() => {
      longPress = true;

      clone = item.cloneNode(true);
      clone.classList.add('dragging');
      clone.style.position = 'fixed';
      clone.style.width = item.offsetWidth + 'px';
      clone.style.zIndex = '999';
      document.body.appendChild(clone);

      placeholder = document.createElement('div');
      placeholder.style.height = item.offsetHeight + 'px';
      placeholder.style.background = 'var(--accent)';
      placeholder.style.opacity = '.3';
      placeholder.style.borderRadius = '6px';

      item.parentNode.insertBefore(placeholder, item);
      item.style.display = 'none';

      if (navigator.vibrate) navigator.vibrate(10);
    }, 350);

  }, { passive: true });

  item.addEventListener('touchmove', e => {
    if (!longPress || !clone) return;
    e.preventDefault();

    const tx = e.touches[0].clientX - touchStartX;
    const ty = e.touches[0].clientY - touchStartY;

    clone.style.transform = `translate(${tx}px,${ty}px)`;
    clone.style.pointerEvents = 'none';

    clone.hidden = true;
    const elBelow = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    clone.hidden = false;

    const target = elBelow && elBelow.closest && elBelow.closest('.queue-item');

    if (target && target !== item) {
      const targetIdx = parseInt(target.dataset.idx);
      if (dragOverIdx !== targetIdx) {
        if (placeholder && placeholder.parentNode) {
          const sibling = placeholder.nextSibling;
          if (sibling === item) {
            target.parentNode.insertBefore(placeholder, sibling);
          } else {
            target.parentNode.insertBefore(placeholder, target.nextSibling);
          }
        }

        dragOverIdx = targetIdx;
      }
    }

  }, { passive: false });

  item.addEventListener('touchend', e => {
    clearTimeout(pressTimer);

    if (!longPress) return;
    e.preventDefault();

    const dropIdx = dragOverIdx !== null ? dragOverIdx : idx;

    if (dropIdx !== idx && dropIdx >= 0 && dropIdx <= queue.length) {
      const [moved] = queue.splice(idx, 1);
      queue.splice(dropIdx, 0, moved);

      if (qIdx === idx) qIdx = dropIdx;
      else if (idx < qIdx && dropIdx >= qIdx) qIdx--;
      else if (idx > qIdx && dropIdx <= qIdx) qIdx++;
    }

    if (clone) clone.remove();
    if (placeholder && placeholder.parentNode) placeholder.remove();
    item.style.display = '';
    item.classList.remove('dragging');

    longPress = false;
    dragOverIdx = null;
    clone = null;
    placeholder = null;

    renderQueue();
  }, { passive: true });

  item.addEventListener('touchcancel', () => {
    clearTimeout(pressTimer);
    if (longPress) {
      if (clone) clone.remove();
      if (placeholder && placeholder.parentNode) placeholder.remove();
      item.style.display = '';
      item.classList.remove('dragging');
    }

    longPress = false;
    clone = null;
    placeholder = null;
  });
}

// Clear queue
document.getElementById('clear-queue-btn').onclick = e => {
  e.stopPropagation();
  if (!queue.length) return;
  const current = queue[qIdx];
  queue = current ? [current] : [];
  qIdx = 0;
  renderQueue();
};

// Add to queue from context menu
document.getElementById('ctx-add-queue').onclick = () => {
  if (!ctxTrack) return;
  queue.push(ctxTrack);
  showToast('Added to queue');
  if(queueOpen) renderQueue();
  closeCtxMenu();
};

// Media Session API
function updateMediaSession(t, coverUrl) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title || 'Unknown',
    artist: t.artist || 'Unknown',
    album: t.album || 'Unknown',
    artwork: coverUrl ? [{ src: coverUrl, sizes: '256x256' }] : []
  });

  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
  navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
  navigator.mediaSession.setActionHandler('seekto', e => { if (e.seekTime) audio.currentTime = e.seekTime; });
}

// Lyrics
const lyricsPanel = document.getElementById('lyrics-panel');
const lyricsBtn = document.getElementById('lyrics-btn');
let syncedLyrics = [], plainLyrics = '', lyricsTrackId = null, lyricsOpen = false;
let lyricsFontSize = parseInt(localStorage.getItem('lyrics_font') || '13');

function applyLyricsFontSize() {
  document.querySelectorAll('.lyric-line').forEach(el => el.style.fontSize = lyricsFontSize + 'px');
}

document.getElementById('lyrics-font-up').onclick = e => {
  e.stopPropagation();
  lyricsFontSize = Math.min(22, lyricsFontSize + 1);
  localStorage.setItem('lyrics_font', lyricsFontSize);
  applyLyricsFontSize();
};

document.getElementById('lyrics-font-down').onclick = e => {
  e.stopPropagation();
  lyricsFontSize = Math.max(10, lyricsFontSize - 1);
  localStorage.setItem('lyrics_font', lyricsFontSize);
  applyLyricsFontSize();
};

lyricsBtn.onclick = () => {
  lyricsOpen = !lyricsOpen;
  lyricsPanel.classList.toggle('open', lyricsOpen);
  lyricsBtn.classList.toggle('active', lyricsOpen);
  if (lyricsOpen) closeExpandedPlayer();
};

document.getElementById('lyrics-close-btn').onclick = () => {
  lyricsOpen = false;
  lyricsPanel.classList.remove('open');
  lyricsBtn.classList.remove('active');
};

(() => {
  const el = lyricsPanel;
  const header = document.getElementById('lyrics-panel-header');
  let dragging = false, ox = 0, oy = 0;

  header.addEventListener('mousedown', e => {
    dragging = true;
    const r = el.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = r.left + 'px';
    el.style.top = r.top + 'px';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    el.style.left = (e.clientX - ox) + 'px';
    el.style.top = (e.clientY - oy) + 'px';
  });

  document.addEventListener('mouseup', () => { dragging = false; });
})();

async function loadLyrics(t) {
  if (lyricsTrackId === t.id) return;
  lyricsTrackId = t.id;
  syncedLyrics = []; plainLyrics = '';

  lyricsScroll().innerHTML = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">Loading lyrics…</div>';
  expLyricCur.textContent = '…';
  expLyricNext.textContent = '';

  try {
    const cleanTitle = (t.title || '').replace(/^\d{1,3}[\s.\-_]+/, '').trim();
    const q = new URLSearchParams({ title: cleanTitle, artist: t.artist || '', album: t.album || '' });
    const r = await fetch(`/api/lyrics?${q}`, { headers: token ? { 'x-auth-token': token } : {} });

    if (!r.ok) throw new Error('not found');
    const d = await r.json();

    if (d.type === 'synced' && d.lyrics) {
      syncedLyrics = parseLRC(d.lyrics);
      renderSyncedLyrics();
      document.getElementById('lyrics-panel-title').textContent = d.source === 'lrclib' ? 'Lyrics' : `Lyrics · ${d.source}`;
    } else if (d.type === 'plain' && d.lyrics) {
      plainLyrics = d.lyrics;
      renderPlainLyrics();
      document.getElementById('lyrics-panel-title').textContent = d.source === 'lrclib' ? 'Lyrics' : `Lyrics · ${d.source}`;
    } else {
      lyricsScroll().innerHTML = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">No lyrics found</div>';
      document.getElementById('lyrics-panel-title').textContent = 'Lyrics';
      expLyricCur.textContent = '—';
      expLyricNext.textContent = '';
    }
  } catch (_) {
    lyricsScroll().innerHTML = '<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px">No lyrics found</div>';
    expLyricCur.textContent = '-';
    expLyricNext.textContent = '';
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
  scroll.innerHTML = '';
  syncedLyrics.forEach((l, i) => {
    const div = document.createElement('div');
    div.className = 'lyric-line';
    div.textContent = l.text || '\u00B7';
    div.dataset.idx = i;
    div.onclick = () => { audio.currentTime = l.time };
    scroll.appendChild(div);
  });

  applyLyricsFontSize();
}

function renderPlainLyrics() {
  const scroll = lyricsScroll();
  scroll.innerHTML = '';
  plainLyrics.split('\n').forEach(line => {
    const div = document.createElement('div');
    div.className = 'lyric-line';
    div.textContent = line || ' ';
    scroll.appendChild(div);
  });

  applyLyricsFontSize();
}

// Update expanded player lyrics (2-line display)
let lastExpLyricIdx = -1;
audio.addEventListener('timeupdate', () => {
  if (!syncedLyrics.length) return;
  const t = audio.currentTime;
  let idx = syncedLyrics.findIndex((l, i) => {
    const next = syncedLyrics[i + 1];
    return t >= l.time && (!next || t < next.time);
  });

  if (idx === lastExpLyricIdx) return;
  lastExpLyricIdx = idx;

  if (idx >= 0) {
    expLyricCur.textContent = syncedLyrics[idx].text || '\u00B7';
    const nxt = syncedLyrics[idx + 1];
    expLyricNext.textContent = nxt ? (nxt.text || '\u00B7') : '';

    lyricsScroll().querySelectorAll('.lyric-line').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });

    if (idx >= 0 && lyricsOpen) {
      const el = lyricsScroll().querySelector(`[data-idx="${idx}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

// Init
async function init() {
  btnShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
  expShuffle.style.color = shuffle ? 'var(--accent)' : 'var(--muted)';
  applyRepeat();

  volumeSlider.value = SAVED_VOL;
  const sv = SAVED_VOL / 100;
  audio.volume = sv;
  volumeIcon.textContent = sv === 0 ? '\uD83D\uDD07' : sv < 0.5 ? '\uD83D\uDD09' : '\uD83D\uDCA0';

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

      player.classList.remove('hidden');
      document.getElementById('player-title').textContent = t.title || 'Unknown';
      document.getElementById('player-artist').textContent = [t.artist, t.album].filter(Boolean).join(' · ') || '—';
      const pt = document.getElementById('player-thumb');
      pt.src = FALLBACK;
      loadCover(t.id, pt);
      document.title = (t.title || '?') + ' · Jam!';

      const ts = token ? '?token=' + encodeURIComponent(token) : '';
      audio.src = '/api/stream/' + t.id + ts;
      audio.addEventListener('loadedmetadata', () => {
        if (pos > 0 && pos < audio.duration - 5) audio.currentTime = pos;
      }, { once: true });
    }
  } catch (_) {}
}

(async () => { const ok = await checkAuth(); if (ok) init() })();
