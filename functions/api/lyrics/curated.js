function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

// Normalize key to avoid duplicates from different formatting
function makeKey(artist, title) {
  const cleanArtist = (artist || '').toLowerCase().trim();
  const cleanTitle = (title || '').toLowerCase().trim();
  return `curated:${cleanArtist}:${cleanTitle}`;
}

export async function onRequest({ request, env }) {
  // auth already checked by functions/api/_middleware.js
  if (!env.LYRICS_PICKS) {
    return jsonResponse({ error: 'LYRICS_PICKS KV binding not found' }, { status: 500 })
  }

  const method = request.method;
  const url = new URL(request.url);
  const artist = url.searchParams.get('artist') || '';
  const title = url.searchParams.get('title') || '';

  // GET: Check if a curated pick exists
  if (method === 'GET') {
    if (!artist || !title) {
      return jsonResponse({ error: 'artist and title required' }, { status: 400 })
    }
    const key = makeKey(artist, title);
    const lrclibId = await env.LYRICS_PICKS.get(key);
    if (lrclibId) {
      return jsonResponse({ exists: true, lrclibId: parseInt(lrclibId, 10) })
    }
    return jsonResponse({ exists: false })
  }

  // POST: Save a curated pick
  if (method === 'POST') {
    const body = await request.json();
    const lrclibId = body.lrclibId;
    if (!artist || !title || !lrclibId) {
      return jsonResponse({ error: 'artist, title, and lrclibId required' }, { status: 400 })
    }
    const key = makeKey(artist, title);
    await env.LYRICS_PICKS.put(key, lrclibId.toString());
    return jsonResponse({ success: true })
  }

  // DELETE: Remove a curated pick
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
