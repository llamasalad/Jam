function authed(request, env) {
  if (!env.AUTH_TOKEN) return true;
  const token = request.headers.get("x-auth-token") || new URL(request.url).searchParams.get("token");
  return token === env.AUTH_TOKEN;
}

export async function onRequestGet({ request, env }) {
  if (!authed(request, env)) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "";
  const artist = url.searchParams.get("artist") || "";

  if (!title && !artist) {
    return new Response(JSON.stringify({ error: "title or artist required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // STEP 1: Try LRCLIB
  try {
    const q = new URLSearchParams({ artist_name: artist, track_name: title });
    const r = await fetch(`https://lrclib.net/api/get?${q}`);
    
    if (r.ok) {
      const d = await r.json();
      
      if (d.syncedLyrics) {
        return new Response(JSON.stringify({ source: "lrclib", type: "synced", lyrics: d.syncedLyrics }), { headers: { "Content-Type": "application/json" } });
      }
      if (d.plainLyrics) {
        return new Response(JSON.stringify({ source: "lrclib", type: "plain", lyrics: d.plainLyrics }), { headers: { "Content-Type": "application/json" } });
      }
    }
  } catch (_) {}

  // STEP 2: Fall back to lyrics.ovh
  try {
    const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const r = await fetch(ovhUrl);
    
    if (r.ok) {
      const d = await r.json();
      if (d.lyrics) {
        return new Response(JSON.stringify({ source: "lyricsovh", type: "plain", lyrics: d.lyrics }), { headers: { "Content-Type": "application/json" } });
      }
    }
  } catch (_) {}

  return new Response(JSON.stringify({ source: null, type: null, lyrics: null }), { headers: { "Content-Type": "application/json" } });
}
