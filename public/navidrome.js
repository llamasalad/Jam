const NAVIDROME_URL = 'https://jam-server.webredirect.org';

const USERNAME = 'bobert';
const PASSWORD = 'bobert';
const CLIENT_NAME = 'Jam';

let cachedParams = null;

function getAuthParams() {
  if (!cachedParams) {
    const salt = Math.random().toString(36).substring(2, 10);
    const token = md5(PASSWORD + salt);
    cachedParams = {
      u: USERNAME,
      t: token,
      s: salt,
      v: '1.16.1',
      c: CLIENT_NAME,
      f: 'json',
    };
  }
  return new URLSearchParams(cachedParams);
}

async function fetchWithBypass(url, options = {}) {
  const headers = {
    ...options.headers,
    'Bypass-Tunnel-Reminder': 'true'
  };
  return fetch(url, { ...options, headers });
}

export async function getTracks(forceRefresh = false) {
  const params = getAuthParams();
  params.set('query', '');
  params.set('songCount', '50000');
  if (forceRefresh) {
    params.set('refresh', 'true');
  }
  const res = await fetchWithBypass(`${NAVIDROME_URL}/rest/search3?${params}`);
  const data = await res.json();
  const songs = data['subsonic-response']?.searchResult3?.song || [];
  return songs.map(song => {
    return {
      id: song.id,
      title: song.title || '',
      artist: song.artist || '',
      album: song.album,
      duration: song.duration,
      suffix: song.suffix || 'flac',
      coverUrl: `${NAVIDROME_URL}/rest/getCoverArt?id=${song.coverArt}&${getAuthParams()}`,
      streamUrl: `${NAVIDROME_URL}/rest/stream?id=${song.id}&${getAuthParams()}`,
    };
  });
}

export async function getPlaylists() {
  const params = getAuthParams();
  const res = await fetchWithBypass(`${NAVIDROME_URL}/rest/getPlaylists?${params}`);
  const data = await res.json();
  const playlists = data['subsonic-response']?.playlists?.playlist || [];
  const playlistArray = Array.isArray(playlists) ? playlists : [playlists];
  const token = localStorage.getItem('music_token') || '';
  return playlistArray.filter(Boolean).map(pl => {
    const fallback = pl.coverArt ? `${NAVIDROME_URL}/rest/getCoverArt?id=${pl.coverArt}&${getAuthParams()}` : '';
    return {
      id: pl.id,
      name: pl.name,
      tracks: Array.from({ length: pl.songCount || 0 }),
      image: `/api/playlists/image?id=${pl.id}&fallback=${encodeURIComponent(fallback)}&token=${token}`
    };
  });
}

export async function getPlaylist(id) {
  const params = getAuthParams();
  params.set('id', id);
  const res = await fetchWithBypass(`${NAVIDROME_URL}/rest/getPlaylist?${params}`);
  const data = await res.json();
  const pl = data['subsonic-response']?.playlist;
  if (!pl) return null;
  const entries = pl.entry || [];
  const entryArray = Array.isArray(entries) ? entries : [entries];
  const fallback = pl.coverArt ? `${NAVIDROME_URL}/rest/getCoverArt?id=${pl.coverArt}&${getAuthParams()}` : '';
  const token = localStorage.getItem('music_token') || '';
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
  const params = getAuthParams();
  params.set('name', name);
  const res = await fetchWithBypass(`${NAVIDROME_URL}/rest/createPlaylist?${params}`);
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
  const params = getAuthParams();
  params.set('id', id);
  await fetchWithBypass(`${NAVIDROME_URL}/rest/deletePlaylist?${params}`);
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
  const params = getAuthParams();
  params.set('playlistId', playlistId);
  params.set('songIdToAdd', trackId);
  await fetchWithBypass(`${NAVIDROME_URL}/rest/updatePlaylist?${params}`);
  return await getPlaylist(playlistId);
}

export async function removeTrackFromPlaylist(playlistId, trackId) {
  const pl = await getPlaylist(playlistId);
  if (!pl) return null;
  const trackIndex = pl.tracks.findIndex(pt => pt.trackId === trackId);
  if (trackIndex === -1) return pl;
  const params = getAuthParams();
  params.set('playlistId', playlistId);
  params.set('songIndexToRemove', trackIndex);
  await fetchWithBypass(`${NAVIDROME_URL}/rest/updatePlaylist?${params}`);
  return await getPlaylist(playlistId);
}

export async function renamePlaylist(id, newName) {
  const params = getAuthParams();
  params.set('playlistId', id);
  params.set('name', newName);
  await fetchWithBypass(`${NAVIDROME_URL}/rest/updatePlaylist?${params}`);
  return await getPlaylist(id);
}

export function getStreamUrl(id) {
  const bitrate = localStorage.getItem('jam_bitrate') || 'original';
  const params = getAuthParams();
  if (bitrate !== 'original') {
    params.set('maxBitRate', bitrate);
  }
  return `${NAVIDROME_URL}/rest/stream?id=${id}&${params}`;
}

export function getCoverUrl(id) {
  return `${NAVIDROME_URL}/rest/getCoverArt?id=${id}&${getAuthParams()}`;
}