function authed(request, env) {
  return true; // TEMP: bypass for debugging - RESTORE AFTER
}

export async function onRequestGet({ request, env }) {
  const debug = { steps: [] };
  const log = (msg) => debug.steps.push(msg);

  if (!authed(request, env)) {
    log('AUTH FAIL');
    return new Response(JSON.stringify({ error: "Unauthorized", _debug: debug }), { status: 401 });
  }

  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "";
  const artist = url.searchParams.get("artist") || "";

  log(`title="${title}" artist="${artist}"`);

  if (!title && !artist) {
    return new Response(JSON.stringify({ error: "title/artist required", _debug: debug }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // LRCLIB
  log('trying lrclib...');
  try {
    const q = new URLSearchParams({ artist_name: artist, track_name: title });
    const r = await fetch(`https://lrclib.net/api/get?${q}`);
    log(`lrclib status=${r.status} ok=${r.ok}`);
    
    if (r.ok) {
      const d = await r.json();
      log(`lrclib keys=[${Object.keys(d).join(',')}] synced=!!${!!d.syncedLyrics} plain=!!${!!d.plainLyrics}`);
      
      if (d.syncedLyrics) return new Response(JSON.stringify({ source: "lrclib", type: "synced", lyrics: d.syncedLyrics, _debug: debug }), { headers: { "Content-Type": "application/json" } });
      if (d.plainLyrics) return new Response(JSON.stringify({ source: "lrclib", type: "plain", lyrics: d.plainLyrics, _debug: debug }), { headers: { "Content-Type": "application/json" } });
      log('lrclib no lyrics -> fall through');
    } else {
      log('lrclib !ok -> fall through');
    }
  } catch (e) {
    log(`lrclib threw: ${e.message}`);
  }

  // GENIUS CHECK
  log(`GENIUS_TOKEN exists=${!!env.GENIUS_TOKEN}`);
  
  if (!env.GENIUS_TOKEN) {
    log('NO TOKEN -> returning null');
    return new Response(JSON.stringify({ source: null, type: null, lyrics: null, _debug: debug }), { headers: { "Content-Type": "application/json" } });
  }

  log('CALLING GENIUS...');
  
  try {
    const searchQ = encodeURIComponent(`${title} ${artist}`);
    const searchR = await fetch(`https://api.genius.com/search?q=${searchQ}`, {
      headers: { Authorization: `Bearer ${env.GENIUS_TOKEN}` }
    });
    log(`genius status=${searchR.status}`);
    
    const searchD = await searchR.json();
    const hit = searchD.response?.hits?.find(h => h.type === "song" && h.result.primary_artist.name.toLowerCase().includes(artist.toLowerCase())) || searchD.response?.hits?.[0];

    if (!hit) {
      log('genius no hit');
      return new Response(JSON.stringify({ source: null, type: null, lyrics: null, _debug: debug }), { headers: { "Content-Type": "application/json" } });
    }

    log(`genius hit: ${hit.result.title}`);

    const pageR = await fetch(hit.result.url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await pageR.text();
    const lyrics = scrapeGeniusLyrics(html);

    if (lyrics) {
      log('genius SUCCESS');
      return new Response(JSON.stringify({ source: "genius", type: "plain", lyrics, _debug: debug }), { headers: { "Content-Type": "application/json" } });
    }
    log('genius scrape failed');
  } catch (e) {
    log(`genius threw: ${e.message}`);
  }

  log('END -> null');
  return new Response(JSON.stringify({ source: null, type: null, lyrics: null, _debug: debug }), { headers: { "Content-Type": "application/json" } });
}

function scrapeGeniusLyrics(html) {
  try {
    const matches = [...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g)];
    if (!matches.length) return null;
    let lyrics = matches.map(m => m[1]).join('\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
    return lyrics || null;
  } catch (e) { return null; }
}
