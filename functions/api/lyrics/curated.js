function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

function makeKey(artist, title) {
  const cleanArtist = (artist || '').toLowerCase().trim();
  const cleanTitle = (title || '').toLowerCase().trim();
  return `curated:${cleanArtist}:${cleanTitle}`;
}

async function fetchLrclibById(id) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 600));
      }
      const res = await fetch(`https://lrclib.net/api/get/${id}`, {
        headers: {
          'User-Agent': 'jam/1.0',
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const item = await res.json();
        return {
          success: true,
          status: res.status,
          data: {
            id: item.id,
            trackName: item.trackName || item.name || '',
            artistName: item.artistName || '',
            albumName: item.albumName || '',
            duration: item.duration || 0,
            instrumental: !!item.instrumental,
            hasSynced: !!item.syncedLyrics,
            hasPlain: !!item.plainLyrics,
            syncedLyrics: item.syncedLyrics || null,
            plainLyrics: item.plainLyrics || null
          }
        };
      }
      if (res.status !== 503 && res.status !== 429) {
        return { success: false, status: res.status };
      }
    } catch (err) {
      if (attempt === 1) return { success: false, status: 502 };
    }
  }
  return { success: false, status: 503 };
}

export async function onRequest({ request, env }) {
  if (!env.LYRICS_PICKS) {
    return jsonResponse({ error: 'LYRICS_PICKS KV binding not found' }, { status: 500 })
  }

  const method = request.method;
  const url = new URL(request.url);
  const artist = url.searchParams.get('artist') || '';
  const title = url.searchParams.get('title') || '';

  if (method === 'GET') {
    if (!artist || !title) {
      return jsonResponse({ error: 'artist and title required' }, { status: 400 })
    }
    const key = makeKey(artist, title);
    const raw = await env.LYRICS_PICKS.get(key);
    if (!raw) {
      return jsonResponse({ exists: false })
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) { }

    if (parsed && typeof parsed === 'object' && (parsed.syncedLyrics !== undefined || parsed.plainLyrics !== undefined)) {
      return jsonResponse({ exists: true, data: parsed }, {
        headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' }
      })
    }

    const lrclibId = typeof parsed === 'number' ? parsed : parseInt(raw, 10);
    if (!isNaN(lrclibId)) {
      const res = await fetchLrclibById(lrclibId);
      if (res.success && res.data) {
        await env.LYRICS_PICKS.put(key, JSON.stringify(res.data));
        return jsonResponse({ exists: true, data: res.data }, {
          headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' }
        })
      }

      if (res.status === 429 || res.status === 503 || res.status === 502) {
        return jsonResponse({ exists: true, lrclibId }, {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        })
      }

      if (res.status === 404) {
        await env.LYRICS_PICKS.delete(key);
        return jsonResponse({ exists: false }, {
          headers: { 'Cache-Control': 'public, max-age=3600' }
        })
      }

      return jsonResponse({ exists: true, lrclibId }, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
    }

    return jsonResponse({ exists: false })
  }

  if (method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse({ error: 'invalid JSON body' }, { status: 400 });
    }
    const lrclibId = body.lrclibId;
    if (!artist || !title || (!lrclibId && !body.lyricsData)) {
      return jsonResponse({ error: 'artist, title, and lyricsData or lrclibId required' }, { status: 400 })
    }

    let payload = null;
    if (body.lyricsData && typeof body.lyricsData === 'object') {
      const d = body.lyricsData;
      payload = {
        id: d.id || lrclibId || null,
        trackName: d.trackName || title,
        artistName: d.artistName || artist,
        albumName: d.albumName || '',
        duration: d.duration || 0,
        instrumental: !!d.instrumental,
        hasSynced: !!d.syncedLyrics,
        hasPlain: !!d.plainLyrics,
        syncedLyrics: d.syncedLyrics || null,
        plainLyrics: d.plainLyrics || null,
        curatedAt: Date.now()
      };
    } else if (lrclibId) {
      const res = await fetchLrclibById(lrclibId);
      if (res.success && res.data) {
        payload = { ...res.data, curatedAt: Date.now() };
      }
    }

    const key = makeKey(artist, title);
    if (payload) {
      await env.LYRICS_PICKS.put(key, JSON.stringify(payload));
    } else if (lrclibId) {
      await env.LYRICS_PICKS.put(key, lrclibId.toString());
    }

    return jsonResponse({ success: true, savedFull: !!payload })
  }

  if (method === 'DELETE') {
    if (!artist || !title) {
      return jsonResponse({ error: 'artist and title required' }, { status: 400 })
    }
    const key = makeKey(artist, title);
    await env.LYRICS_PICKS.delete(key);
    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
}
