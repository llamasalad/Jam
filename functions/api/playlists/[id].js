function authed(request, env) {
  if (!env.AUTH_TOKEN) return true;
  const token = request.headers.get("x-auth-token") || new URL(request.url).searchParams.get("token");
  return token === env.AUTH_TOKEN;
}

// GET /api/playlists/:id — get playlist with tracks
// POST /api/playlists/:id — add track { trackId, title, artist, album }
// DELETE /api/playlists/:id?trackId=xxx — remove track from playlist
// PATCH /api/playlists/:id — rename playlist { name }
export async function onRequest({ request, params, env }) {
  if (!authed(request, env)) return new Response("Unauthorized", { status: 401 });
  if (!env.PLAYLISTS) return new Response("KV not bound", { status: 500 });

  const id = params.id;
  const key = `playlist:${id}`;
  const method = request.method;

  const playlist = await env.PLAYLISTS.get(key, "json");
  if (!playlist) return new Response(JSON.stringify({ error: "Playlist not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

  if (method === "GET") {
    return new Response(JSON.stringify(playlist), { headers: { "Content-Type": "application/json" } });
  }

  if (method === "POST") {
    const body = await request.json();
    const { trackId, title, artist, album } = body;
    if (!trackId) return new Response(JSON.stringify({ error: "trackId required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (playlist.tracks.some(t => t.trackId === trackId)) {
      return new Response(JSON.stringify({ error: "Already in playlist" }), { status: 409, headers: { "Content-Type": "application/json" } });
    }
    playlist.tracks.push({ trackId, title, artist, album, addedAt: Date.now() });
    await env.PLAYLISTS.put(key, JSON.stringify(playlist));
    return new Response(JSON.stringify(playlist), { headers: { "Content-Type": "application/json" } });
  }

  if (method === "DELETE") {
    const trackId = new URL(request.url).searchParams.get("trackId");
    if (!trackId) return new Response(JSON.stringify({ error: "trackId required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    playlist.tracks = playlist.tracks.filter(t => t.trackId !== trackId);
    await env.PLAYLISTS.put(key, JSON.stringify(playlist));
    return new Response(JSON.stringify(playlist), { headers: { "Content-Type": "application/json" } });
  }

  if (method === "PATCH") {
    const body = await request.json();
    if (body.name) playlist.name = body.name.trim();
    await env.PLAYLISTS.put(key, JSON.stringify(playlist));
    return new Response(JSON.stringify(playlist), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
}
