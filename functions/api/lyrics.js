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
  const album = url.searchParams.get("album") || "";

  if (!title && !artist) {
    return new Response(JSON.stringify({ error: "title or artist required" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  // ── 1. Try LRCLIB first ───────────────────────────────────────────────────
  try {
    const q = new URLSearchParams({ artist_name: artist, track_name: title});
    const r = await fetch(`https://lrclib.net/api/get?${q}`);
    if (r.ok) {
      const d = await r.json();
      if (d.syncedLyrics) {
        return new Response(JSON.stringify({ source: "lrclib", type: "synced", lyrics: d.syncedLyrics }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      if (d.plainLyrics) {
        return new Response(JSON.stringify({ source: "lrclib", type: "plain", lyrics: d.plainLyrics }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  } catch(_) {}

  // ── 2. Fall back to Genius ────────────────────────────────────────────────
  if (!env.GENIUS_TOKEN) {
    return new Response(JSON.stringify({"source":null,"type":null,"lyrics":null}), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Search Genius for the song
    const searchQ = encodeURIComponent(`${title} ${artist}`);
    const searchR = await fetch(`https://api.genius.com/search?q=${searchQ}`, {
      headers: { Authorization: `Bearer ${env.GENIUS_TOKEN}` }
    });
    const searchD = await searchR.json();
    const hit = searchD.response?.hits?.find(h =>
      h.type === "song" &&
      h.result.primary_artist.name.toLowerCase().includes(artist.toLowerCase())
    ) || searchD.response?.hits?.[0];

    if (!hit) {
      return new Response(JSON.stringify({ source: null, type: null, lyrics: null }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Fetch the Genius song page and scrape lyrics
    const pageR = await fetch(hit.result.url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html = await pageR.text();

    // Extract lyrics from Genius HTML
    const lyrics = scrapeGeniusLyrics(html);

    if (lyrics) {
      return new Response(JSON.stringify({ source: "genius", type: "plain", lyrics }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch(_) {}

  return new Response(JSON.stringify({ source: null, type: null, lyrics: null }), {
    headers: { "Content-Type": "application/json" }
  });
}

function scrapeGeniusLyrics(html) {
  try {
    // Genius stores lyrics in data-lyrics-container divs
    const matches = [...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g)];
    if (!matches.length) return null;

    let lyrics = matches.map(m => m[1]).join('\n');
    // Convert <br> to newlines
    lyrics = lyrics.replace(/<br\s*\/?>/gi, '\n');
    // Remove all other HTML tags
    lyrics = lyrics.replace(/<[^>]+>/g, '');
    // Decode HTML entities
    lyrics = lyrics.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    // Clean up excess whitespace
    lyrics = lyrics.replace(/\n{3,}/g, '\n\n').trim();
    return lyrics || null;
  } catch(_) { return null; }
}
