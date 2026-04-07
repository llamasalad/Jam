function authed(request, env) {
  if (!env.AUTH_TOKEN) return true;
  const token = request.headers.get("x-auth-token") || 
    new URL(request.url).searchParams.get("token");
  return token === env.AUTH_TOKEN;
}

export async function onRequestGet({ request, env }) {
  if (!authed(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "";
  const artist = url.searchParams.get("artist") || "";

  if (!title && !artist) {
    return new Response(
      JSON.stringify({ error: "title or artist required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 1. Try LRCLIB first ──────────────────────────────────────
  try {
    const q = new URLSearchParams({ artist_name: artist, track_name: title });
    const r = await fetch(`https://lrclib.net/api/get?${q}`);
    
    if (r.ok) {
      const d = await r.json();
      
      if (d.syncedLyrics) {
        return response("lrclib", "synced", d.syncedLyrics);
      }
      if (d.plainLyrics) {
        return response("lrclib", "plain", d.plainLyrics);
      }
    }
  } catch(err) {
    console.error('[LYRICS] LRCLIB error:', err);  🔧 LOG ERRORS NOW!
  }

  // ── 2. Fall back to Genius ───────────────────────────────────
  if (!env.GENIUS_TOKEN) {
    🔧 IMPROVED: Log warning instead of silent fail
    console.warn('[LYRICS] No GENIUS_TOKEN configured - skipping Genius fallback');
    
    return response(null, null, null);
  }

  try {
    const searchQ = encodeURIComponent(`${title} ${artist}`);
    const searchR = await fetch(`https://api.genius.com/search?q=${searchQ}`, {
      headers: { Authorization: `Bearer ${env.GENIUS_TOKEN}` }
    });
    
    const searchD = await searchR.json();
    
    🔧 IMPROVED: Better hit selection logic
    const hit = searchD.response?.hits?.find(h =>
      h.type === "song" &&
      h.result.primary_artist.name.toLowerCase() === artist.toLowerCase()
    ) || searchD.response?.hits?.[0];

    if (!hit) {
      console.log('[LYRICS] No results found on Genius');
      return response(null, null, null);
    }

    const pageR = await fetch(hit.result.url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    const html = await pageR.text();
    const lyrics = scrapeGeniusLyrics(html);

    if (lyrics) {
      return response("genius", "plain", lyrics);
    }
  } catch(err) {
    console.error('[LYRICS] Genius error:', err);  🔧 LOG ERRORS!
  }

  return response(null, null, null);
}

🔧 HELPER: Reduce code duplication
function response(source, type, lyrics) {
  return new Response(
    JSON.stringify({ source, type, lyrics }),
    { headers: { "Content-Type": "application/json" } }
  );
}

function scrapeGeniusLyrics(html) {
  try {
    const matches = [...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g)];
    if (!matches.length) return null;

    let lyrics = matches.map(m => m[1]).join('\n');
    lyrics = lyrics.replace(//gi, '\n');
    lyrics = lyrics.replace(/<[^>]+>/g, '');
    lyrics = lyrics.replace(/&/g, '&').replace(/</g, '<')
             .replace(/>/g, '>').replace(/"/g, '"')
             .replace(/'/g, "'");
    lyrics = lyrics.replace(/\n{3,}/g, '\n\n').trim();
    
    return lyrics || null;
  } catch(err) {
    console.error('[LYRICS] Scrape error:', err);  🔧 LOG ERRORS!
    return null;
  }
}
