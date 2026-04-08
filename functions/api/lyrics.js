function authed(request, env) {
  if (!env.AUTH_TOKEN) return true;
  const token = request.headers.get("x-auth-token") || new URL(request.url).searchParams.get("token");
  return token === env.AUTH_TOKEN;
}

// 1. Helper function to handle the API request so we don't repeat code
async function fetchLyrics(artist, title) {
  try {
    const q = new URLSearchParams({ artist_name: artist, track_name: title });
    const r = await fetch(`https://lrclib.net/api/get?${q}`);
    
    if (r.ok) {
      const d = await r.json();
      if (d.syncedLyrics) {
        return { source: "lrclib", type: "synced", lyrics: d.syncedLyrics };
      }
      if (d.plainLyrics) {
        return { source: "lrclib", type: "plain", lyrics: d.plainLyrics };
      }
    }
  } catch (_) {}
  
  return null; // Return null if nothing was found
}

export async function onRequestGet({ request, env }) {
  if (!authed(request, env)) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "";
  const artist = url.searchParams.get("artist") || "";

  if (!title && !artist) {
    return new Response(JSON.stringify({ error: "title or artist required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // --- ATTEMPT 1: Try the exact title first ---
  let result = await fetchLyrics(artist, title);

  // --- ATTEMPT 2: Fallback with a cleaned title ---
  if (!result) {
    // This Regex removes strings like "(feat. Wizkid)", "[ft Drake]", "(featuring Tyla)" etc.
    const cleanTitle = title.replace(/\s*[\(\[](feat\.?|ft\.?|featuring)[^\)\]]*[\)\]]/gi, '').trim();
    
    // Only try again if the regex actually changed the title to avoid duplicate requests
    if (cleanTitle !== title && cleanTitle.length > 0) {
      result = await fetchLyrics(artist, cleanTitle);
    }
  }

  // --- RETURN RESULTS ---
  if (result) {
    // We found lyrics in either attempt 1 or attempt 2
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  }

  // Nothing was found in either attempt
  return new Response(JSON.stringify({ source: null, type: null, lyrics: null }), { headers: { "Content-Type": "application/json" } });
}
