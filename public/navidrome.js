let allTracksCache = null;

async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('music_token') || '';
  const headers = {
    ...options.headers,
    'x-auth-token': token,
  };
  const res = await fetch(`/api/subsonic${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    console.error('Subsonic proxy request unauthorized');
  }
  return res;
}

export async function getTracks(forceRefresh = false) {
  if (allTracksCache && !forceRefresh) {
    return allTracksCache;
  }
  const params = new URLSearchParams();
  params.set('query', '');
  params.set('songCount', '50000');
  if (forceRefresh) {
    params.set('refresh', 'true');
  }
  const token = localStorage.getItem('music_token') || '';
  const res = await fetchWithAuth(`/search3?${params}`);
  const data = await res.json();
  const songs = data['subsonic-response']?.searchResult3?.song || [];
  allTracksCache = songs.map(song => {
    return {
      id: song.id,
      title: song.title || '',
      artist: song.artist || '',
      album: song.album,
      duration: song.duration,
      suffix: song.suffix || 'flac',
      starred: !!song.starred,
      genre: song.genre || '',
      coverUrl: getCoverUrl(song.coverArt),
      streamUrl: getStreamUrl(song.id),
    };
  });
  return allTracksCache;
}

export async function getPlaylists() {
  const res = await fetchWithAuth('/getPlaylists');
  const data = await res.json();
  const playlists = data['subsonic-response']?.playlists?.playlist || [];
  const playlistArray = Array.isArray(playlists) ? playlists : [playlists];
  const token = localStorage.getItem('music_token') || '';
  return playlistArray.filter(Boolean).map(pl => {
    const fallback = pl.coverArt ? getCoverUrl(pl.coverArt) : '';
    return {
      id: pl.id,
      name: pl.name,
      tracks: Array.from({ length: pl.songCount || 0 }),
      image: `/api/playlists/image?id=${pl.id}&fallback=${encodeURIComponent(fallback)}&token=${token}`
    };
  });
}

export async function getPlaylist(id) {
  const res = await fetchWithAuth(`/getPlaylist?id=${id}`);
  const data = await res.json();
  const pl = data['subsonic-response']?.playlist;
  if (!pl) return null;
  const entries = pl.entry || [];
  const entryArray = Array.isArray(entries) ? entries : [entries];
  const token = localStorage.getItem('music_token') || '';
  const fallback = pl.coverArt ? getCoverUrl(pl.coverArt) : '';
  return {
    id: pl.id,
    name: pl.name,
    image: `/api/playlists/image?id=${pl.id}&fallback=${encodeURIComponent(fallback)}&token=${token}`,
    tracks: entryArray.filter(Boolean).map(song => {
      return {
        trackId: song.id,
        title: song.title || '',
        artist: song.artist || '',
        album: song.album,
        suffix: song.suffix || 'flac'
      };
    })
  };
}

export async function createPlaylist(name) {
  const res = await fetchWithAuth(`/createPlaylist?name=${encodeURIComponent(name)}`);
  const data = await res.json();
  const pl = data['subsonic-response']?.playlist;
  if (!pl) return null;
  const token = localStorage.getItem('music_token') || '';
  return {
    id: pl.id,
    name: pl.name,
    image: `/api/playlists/image?id=${pl.id}&token=${token}`,
    tracks: []
  };
}

export async function deletePlaylist(id) {
  await fetchWithAuth(`/deletePlaylist?id=${id}`);
  try {
    const token = localStorage.getItem('music_token') || '';
    const headers = token ? { 'x-auth-token': token } : {};
    await fetch(`/api/playlists/image?id=${id}`, {
      method: 'DELETE',
      headers
    });
  } catch (_) { }
}

export async function addTrackToPlaylist(playlistId, trackId) {
  await fetchWithAuth(`/updatePlaylist?playlistId=${playlistId}&songIdToAdd=${trackId}`);
  return await getPlaylist(playlistId);
}

export async function removeTrackFromPlaylist(playlistId, trackId) {
  const pl = await getPlaylist(playlistId);
  if (!pl) return null;
  const trackIndex = pl.tracks.findIndex(pt => pt.trackId === trackId);
  if (trackIndex === -1) return pl;
  await fetchWithAuth(`/updatePlaylist?playlistId=${playlistId}&songIndexToRemove=${trackIndex}`);
  return await getPlaylist(playlistId);
}

export async function renamePlaylist(id, newName) {
  await fetchWithAuth(`/updatePlaylist?playlistId=${id}&name=${encodeURIComponent(newName)}`);
  return await getPlaylist(id);
}

export function getStreamUrl(id) {
  if (!id) return '';
  if (typeof id === 'string' && (id.startsWith('http://') || id.startsWith('https://') || id.startsWith('deezer:'))) return id;
  const token = localStorage.getItem('music_token') || '';
  const bitrate = localStorage.getItem('jam_bitrate') || 'original';
  let path = `/api/subsonic/stream?id=${id}&token=${token}`;
  if (bitrate !== 'original') {
    path += `&maxBitRate=${bitrate}`;
  }
  return new URL(path, window.location.origin).href;
}

export function getCoverUrl(id) {
  if (!id) return '';
  const token = localStorage.getItem('music_token') || '';
  const path = `/api/subsonic/getCoverArt?id=${id}&token=${token}`;
  return new URL(path, window.location.origin).href;
}

export async function starTrack(id, isStarred) {
  const endpoint = isStarred ? 'star' : 'unstar';
  const res = await fetchWithAuth(`/${endpoint}?id=${id}`);
  if (res.ok && allTracksCache) {
    const track = allTracksCache.find(t => t.id === id);
    if (track) {
      track.starred = isStarred;
    }
  }
  return res.ok;
}

export async function getFavorites() {
  const res = await fetchWithAuth('/getStarred2');
  const data = await res.json();
  const songs = data['subsonic-response']?.starred2?.song || [];
  const songArray = Array.isArray(songs) ? songs : [songs];
  return songArray.filter(Boolean).map(song => ({
    id: song.id,
    title: song.title || '',
    artist: song.artist || '',
    album: song.album,
    duration: song.duration,
    suffix: song.suffix || 'flac',
    starred: true,
    genre: song.genre || '',
    coverUrl: getCoverUrl(song.coverArt),
    streamUrl: getStreamUrl(song.id),
  }));
}

export async function getRecentlyPlayed() {
  let recentIds = [];
  try {
    recentIds = JSON.parse(localStorage.getItem('jam_recently_played') || '[]');
  } catch (_) { }

  if (!recentIds.length) {
    return [];
  }

  try {
    const tracksList = await getTracks();
    const tracksMap = new Map(tracksList.map(t => [t.id, t]));
    return recentIds.map(id => tracksMap.get(id)).filter(Boolean);
  } catch (e) {
    console.error("Failed to load tracks for recently played", e);
    return [];
  }
}

async function getAlbumTracks(albumId) {
  const res = await fetchWithAuth(`/getAlbum?id=${albumId}`);
  const data = await res.json();
  const songs = data['subsonic-response']?.album?.song || [];
  const songArray = Array.isArray(songs) ? songs : [songs];
  return songArray.filter(Boolean).map(song => ({
    id: song.id,
    title: song.title || '',
    artist: song.artist || '',
    album: song.album,
    duration: song.duration,
    suffix: song.suffix || 'flac',
    starred: !!song.starred,
    genre: song.genre || '',
    coverUrl: getCoverUrl(song.coverArt),
    streamUrl: getStreamUrl(song.id),
  }));
}

export async function getRecentlyAdded() {
  const res = await fetchWithAuth('/getAlbumList2?type=newest&size=10');
  const data = await res.json();
  const albums = data['subsonic-response']?.albumList2?.album || [];
  const albumArray = Array.isArray(albums) ? albums : [albums];

  let allTracks = [];
  for (const album of albumArray.filter(Boolean)) {
    if (!album.id) continue;
    try {
      const tracks = await getAlbumTracks(album.id);
      allTracks = allTracks.concat(tracks);
    } catch (_) { }
  }
  return allTracks.slice(0, 50);
}

export async function getRandomDiscovery() {
  const res = await fetchWithAuth('/getRandomSongs?size=50');
  const data = await res.json();
  const songs = data['subsonic-response']?.randomSongs?.song || [];
  const songArray = Array.isArray(songs) ? songs : [songs];
  return songArray.filter(Boolean).map(song => ({
    id: song.id,
    title: song.title || '',
    artist: song.artist || '',
    album: song.album,
    duration: song.duration,
    suffix: song.suffix || 'flac',
    starred: !!song.starred,
    genre: song.genre || '',
    coverUrl: getCoverUrl(song.coverArt),
    streamUrl: getStreamUrl(song.id),
  }));
}