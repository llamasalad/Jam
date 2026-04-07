function authed(request, env) {
  if (!env.AUTH_TOKEN) return true;
  const token = request.headers.get("x-auth-token") || new URL(request.url).searchParams.get("token");
  return token === env.AUTH_TOKEN;
}

export async function onRequestGet({ request, env }) {
  console.log('[lyrics] === START ===');
  
  if (!authed(request, env)) {
    console.log('[lyrics] AUTH FAIL');
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "";
  const artist = url.searchParams.get("artist") || "";

  console.log(`[lyrics] title="${title}" artist="${artist}"`);

  if (!title && !artist) {
    console.log('[lyrics] NO TITLE/ARTIST');
    return new Response(JSON.stringify({ error: "title or artist required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // LRCLIB
  console.log('[lyrics] trying lrclib...');
  try {
    const q = new URLSearchParams({ artist_name: artist, track_name: title });
    const r = await fetch(`https://lrclib.net/api/get?${q}`);
    console.log(`[lyrics] lrclib status=${r.status} ok=${r.ok}`);
    
    if (r.ok) {
      const d = await r.json();
      console.log(`[lyrics] lrclib response keys=[${Object.keys(d).join(',')}] hasSynced=!!${!!d.syncedLyrics} hasPlain=!!${!!d.plainLyrics}`);
      
      if (d.syncedLyrics) {
        console.log('[lyrics] RETURNING from lrclib synced');
        return new Response(JSON.stringify({ source: "lrclib", type: "synced", lyrics: d.syncedLyrics }), { headers: { "Content-Type": "application/json" } });
      }
      if (d.plainLyrics) {
        console.log('[lyrics] RETURNING from lrclib plain');
        return new Response(JSON.stringify({ source: "lrclib", type: "plain", lyrics: d.plainLyrics }), { headers: { "Content-Type": "application/json" } });
      }
      console.log('[lyrics] lrclib had no lyrics -> falling through');
    } else {
      console.log(`[lyrics] lrclib returned !ok -> falling through`);
    }
  } catch (e) {
    console.log(`[lyrics] lrclib threw: ${e.message}`);
  }

  // GENIUS CHECK
  console.log(`[lyrics] checking GENIUS_TOKEN... exists=${!!env.GENIUS_TOKEN}`);
  
  if (!env.GENIUS_TOKEN) {
    console.log('[lyrics] NO TOKEN -> returning null');
    return new Response(JSON.stringify({"source":null,"type":null,"lyrics":null}), { headers: { "Content-Type": "application/json" } });
  }

  console.log('[lyrics] CALLING GENIUS API NOW...');
  
  try {
    const searchQ = encodeURIComponent(`${title} ${artist}`);
    const searchR = await fetch(`https://api.genius.com/search?q=${searchQ}`, {
      headers: { Authorization: `Bearer ${env.GENIUS_TOKEN}` }
    });
    console.log(`[lyrics] genius status=${searchR.status}`);
    
    const searchD = await searchR.json();
    const hit = searchD.response?.hits?.find(h => h.type === "song" && h.result.primary_artist.name.toLowerCase().includes(artist.toLowerCase())) || searchD.response?.hits?.[0];

    if (!hit) {
      console.log('[lyrics] genius no hit');
      return new Response(JSON.stringify({ source: null, type: null, lyrics: null }), { headers: { "Content-Type": "application/json" } });
    }

    console.log(`[lyrics] genius hit: ${hit.result.title}`);

    const pageR = await fetch(hit.result.url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await pageR.text();
    const lyrics = scrapeGeniusLyrics(html);

    if (lyrics) {
      console.log('[lyrics] RETURNING from genius');
      return new Response(JSON.stringify({ source: "genius", type: "plain", lyrics }), { headers: { "Content-Type": "application/json" } });
    }
    console.log('[lyrics] genius scrape failed');
  } catch (e) {
    console.log(`[lyrics] genius threw: ${e.message}`);
  }

  console.log('[lyrics] === END null ===');
  return new Response(JSON.stringify({ source: null, type: null, lyrics: null }), { headers: { "Content-Type": "application/json" } });
}

function scrapeGeniusLyrics(html) {
  try {
    const matches = [...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g)];
    if (!matches.length) return null;
    let lyrics = matches.map(m => m[1]).join('\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
    return lyrics || null;
  } catch (e) { return null; }
}
