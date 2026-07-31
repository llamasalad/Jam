function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

const KV_KEY = 'jam_wishlist_items';

export async function onRequest({ request, env }) {
  if (!env.LYRICS_PICKS) {
    return jsonResponse({ error: 'LYRICS_PICKS KV binding not found' }, { status: 500 })
  }

  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET') {
    try {
      const data = await env.LYRICS_PICKS.get(KV_KEY, { type: 'json' });
      return jsonResponse(data || [], {
        headers: { 'Cache-Control': 'no-cache' }
      });
    } catch (e) {
      return jsonResponse([], { status: 500 });
    }
  }

  if (method === 'POST') {
    try {
      const body = await request.json();
      if (!body || !body.id) {
        return jsonResponse({ error: 'Track id required' }, { status: 400 });
      }

      let current = (await env.LYRICS_PICKS.get(KV_KEY, { type: 'json' })) || [];
      if (!Array.isArray(current)) current = [];

      const exists = current.some(item => item.id === body.id);
      if (!exists) {
        current.push({
          id: body.id,
          title: body.title || '',
          artist: body.artist || '',
          album: body.album || '',
          coverUrl: body.coverUrl || '',
          streamUrl: body.streamUrl || '',
          link: body.link || body.streamUrl || '',
          addedAt: Date.now()
        });
        await env.LYRICS_PICKS.put(KV_KEY, JSON.stringify(current));
      }

      return jsonResponse({ success: true, wishlist: current });
    } catch (e) {
      return jsonResponse({ error: 'Failed to add item to wishlist' }, { status: 500 });
    }
  }

  if (method === 'DELETE') {
    try {
      const id = url.searchParams.get('id');
      let bodyIds = [];
      if (request.headers.get('content-type')?.includes('application/json')) {
        try {
          const body = await request.json();
          if (Array.isArray(body.ids)) bodyIds = body.ids;
          else if (body.id) bodyIds = [body.id];
        } catch (_) { }
      }
      if (id && !bodyIds.includes(id)) bodyIds.push(id);

      if (!bodyIds.length) {
        return jsonResponse({ error: 'Track id required' }, { status: 400 });
      }

      let current = (await env.LYRICS_PICKS.get(KV_KEY, { type: 'json' })) || [];
      if (!Array.isArray(current)) current = [];

      current = current.filter(item => !bodyIds.includes(item.id));
      await env.LYRICS_PICKS.put(KV_KEY, JSON.stringify(current));

      return jsonResponse({ success: true, wishlist: current });
    } catch (e) {
      return jsonResponse({ error: 'Failed to remove item from wishlist' }, { status: 500 });
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
}
