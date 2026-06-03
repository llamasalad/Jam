const NAVIDROME_URL = 'https://jam-server.loca.lt';

const USERNAME = 'bobert';                        // Your Navidrome username
const PASSWORD = 'bobert';                 // Your Navidrome password
const CLIENT_NAME = 'Jam';

let cachedParams = null;

const PROTECTED_ARTISTS = [
  "Tyler, The Creator",
  "Lil Nas X",
  "Tay-K",
  "Earth, Wind & Fire",
  "Simon & Garfunkel",
  "Florence + The Machine",
  "Florence and the Machine",
  "Mumford & Sons",
  "Marina & the Diamonds",
  "Earth, Wind and Fire"
];

export function formatTrackMeta(song) {
  let artist = (song.artist || '').replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-');
  let title = song.title || '';

  const lowerArtist = artist.toLowerCase();
  let matchedProtected = null;

  for (const name of PROTECTED_ARTISTS) {
    if (lowerArtist.startsWith(name.toLowerCase())) {
      matchedProtected = artist.slice(0, name.length);
      break;
    }
  }

  if (matchedProtected) {
    const remaining = artist.slice(matchedProtected.length).trim();
    if (remaining) {
      const remMatch = remaining.match(/^(?:(?:feat\.?|ft\.?|&|,|\+)\s*|\s+(?:x)\s+)(.*)$/i);
      if (remMatch) {
        artist = matchedProtected;
        title = `${title} (feat. ${remMatch[1].trim()})`;
      } else {
        // Remaining text is not a separator (e.g. "Tay-K 47" -> remaining is "47").
        // This is a prefix match false positive. Do not split.
        matchedProtected = null;
      }
    } else {
      artist = matchedProtected;
    }
  }

  if (!matchedProtected) {
    const match = artist.match(/^(.*?)\s*(?:(feat\.?|ft\.?|&|,|\+)\s*|\s+(?:x)\s+)(.*)$/i);
    if (match) {
      const primaryArtist = match[1].trim();
      const featured = match[3].trim();
      artist = primaryArtist;
      title = `${title} (feat. ${featured})`;
    }
  }

  return { artist, title };
}


/**
 * Generates the authentication parameters required by Navidrome.
 * These must be appended to every API request.
 */
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

/**
 * Custom fetch wrapper to append LocalTunnel skip warning headers.
 */
async function fetchWithBypass(url, options = {}) {
  const headers = {
    ...options.headers,
    'Bypass-Tunnel-Reminder': 'true'
  };
  return fetch(url, { ...options, headers });
}

/**
 * Fetch all tracks from Navidrome.
 * Replaces your old: GET /api/tracks
 */
export async function getTracks(forceRefresh = false) {
  const params = getAuthParams();
  params.set('query', '');       // Empty query returns everything
  params.set('songCount', '50000'); // Increased limit from 500 to support larger libraries
  if (forceRefresh) {
    params.set('refresh', 'true');
  }

  const res = await fetchWithBypass(`${NAVIDROME_URL}/rest/search3?${params}`);
  const data = await res.json();

  // Navidrome returns: { subsonic-response: { searchResult3: { song: [...] } } }
  const songs = data['subsonic-response']?.searchResult3?.song || [];

  // Remap to the same shape your frontend already expects
  return songs.map(song => {
    const meta = formatTrackMeta(song);
    return {
      id: song.id,
      title: meta.title,
      artist: meta.artist,
      album: song.album,
      duration: song.duration,
      // Cover art URL — drop-in replacement for your old /api/cover/[id]
      coverUrl: `${NAVIDROME_URL}/rest/getCoverArt?id=${song.coverArt}&${getAuthParams()}`,
      // Stream URL — drop-in replacement for your old /api/stream/[id]
      streamUrl: `${NAVIDROME_URL}/rest/stream?id=${song.id}&${getAuthParams()}`,
    };
  });
}

/**
 * Fetch all playlists.
 * Replaces your old: GET /api/playlists
 */
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

/**
 * Fetch a single playlist with its tracks.
 * Replaces your old: GET /api/playlists/[id]
 */
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
      const meta = formatTrackMeta(song);
      return {
        trackId: song.id,
        title: meta.title,
        artist: meta.artist,
        album: song.album
      };
    })
  };
}

/**
 * Create a new playlist.
 * Replaces your old: POST /api/playlists
 */
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

/**
 * Delete a playlist.
 * Replaces your old: DELETE /api/playlists?id=
 */
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

/**
 * Add a track to a playlist.
 * Replaces your old: POST /api/playlists/[id]
 */
export async function addTrackToPlaylist(playlistId, trackId) {
  const params = getAuthParams();
  params.set('playlistId', playlistId);
  params.set('songIdToAdd', trackId);
  await fetchWithBypass(`${NAVIDROME_URL}/rest/updatePlaylist?${params}`);
  return await getPlaylist(playlistId);
}

/**
 * Remove a track from a playlist by its trackId.
 * Replaces your old: DELETE /api/playlists/[id]?trackId=
 */
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

/**
 * Rename a playlist.
 * Replaces your old: PATCH /api/playlists/[id] with { name }
 */
export async function renamePlaylist(id, newName) {
  const params = getAuthParams();
  params.set('playlistId', id);
  params.set('name', newName);
  await fetchWithBypass(`${NAVIDROME_URL}/rest/updatePlaylist?${params}`);
  return await getPlaylist(id);
}

/**
 * Get the stream URL for a track ID.
 */
export function getStreamUrl(id) {
  return `${NAVIDROME_URL}/rest/stream?id=${id}&${getAuthParams()}`;
}

/**
 * Get the cover art URL for a coverArt ID or track ID.
 */
export function getCoverUrl(id) {
  return `${NAVIDROME_URL}/rest/getCoverArt?id=${id}&${getAuthParams()}`;
}