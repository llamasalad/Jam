function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  if (!env.LYRICS_PICKS) {
    return jsonResponse({ error: 'LYRICS_PICKS KV namespace binding not found' }, { status: 500 });
  }

  if (method === 'GET') {
    const id = url.searchParams.get('id');
    const fallback = url.searchParams.get('fallback') || '';

    if (!id) {
      return jsonResponse({ error: 'id required' }, { status: 400 });
    }

    const key = `playlist_image:${id}`;
    const base64 = await env.LYRICS_PICKS.get(key);

    if (base64) {
      const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, "");
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Response(bytes, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    if (fallback) {
      return Response.redirect(fallback, 302);
    }

    const transparentPng = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 94, 99, 96, 96, 96, 0, 0, 0, 5, 0, 1, 164, 114, 196, 176, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);
    return new Response(transparentPng, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  if (method === 'POST') {
    const body = await request.json();
    const { id, image } = body;
    if (!id || !image) {
      return jsonResponse({ error: 'id and image required' }, { status: 400 });
    }
    const key = `playlist_image:${id}`;
    await env.LYRICS_PICKS.put(key, image);
    return jsonResponse({ success: true });
  }

  if (method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonResponse({ error: 'id required' }, { status: 400 });
    }
    const key = `playlist_image:${id}`;
    await env.LYRICS_PICKS.delete(key);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
}
