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
    let cleanTitle = title;

    // Step 1: Remove features inside parentheses or brackets 
    // Example: "DYNAMITE (feat. Wizkid & Tems)" -> "DYNAMITE"
    cleanTitle = cleanTitle.replace(/\s*[\(\[](feat\.?|ft\.?|featuring)[^\)\]]*[\)\]]/gi, '');

    // Step 2: Remove features without parentheses (assumes they go to the end of the title)
    // Example: "DYNAMITE feat. Wizkid & Someone" -> "DYNAMITE"
    cleanTitle = cleanTitle.replace(/\s+(feat\.?|ft\.?|featuring).*$/gi, '');

    cleanTitle = cleanTitle.trim();
    
    // Only try again if the cleaner actually changed something
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
