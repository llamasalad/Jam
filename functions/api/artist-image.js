async function searchArtistId(name) {
  const cleanName = (name || '').trim();
  if (!cleanName) return { success: true, artist: null };
  const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=musicArtist&limit=1`;
  try {
    const res = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) {
      return { success: false, errorStatus: res.status };
    }
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return {
        success: true,
        artist: {
          id: data.results[0].artistId,
          name: data.results[0].artistName,
          viewUrl: data.results[0].artistLinkUrl || data.results[0].artistViewUrl
        }
      };
    }
    return { success: true, artist: null };
  } catch (err) {
    return { success: false, errorStatus: 502 };
  }
}

function parseJSONLD(html) {
  const scriptRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      if (data && data.image) {
        return data.image;
      }
    } catch (_) { }
  }
  return null;
}

function parseOpenGraphImage(html) {
  const match = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
    html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
  return match ? match[1] : null;
}

const placeholderImageURL = "https://music.apple.com/assets/meta/apple-music.png";

async function scrapeArtistImage(viewUrl) {
  if (!viewUrl) return { success: true, picture: null };
  try {
    const res = await fetch(viewUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) {
      return { success: false, errorStatus: res.status };
    }
    const html = await res.text();

    // Try JSON-LD first
    let imageUrl = parseJSONLD(html);

    // Fallback to OpenGraph
    if (!imageUrl) {
      imageUrl = parseOpenGraphImage(html);
    }

    // Discard generic placeholder image
    if (imageUrl === placeholderImageURL) {
      return { success: true, picture: null };
    }

    return { success: true, picture: imageUrl || null };
  } catch (err) {
    return { success: false, errorStatus: 502 };
  }
}

function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const name = url.searchParams.get('name') || '';

  if (!name) {
    return jsonResponse({ error: 'name required' }, { status: 400 });
  }

  const cleanName = name.toLowerCase().trim();
  const kvKey = `artist_image:${cleanName}`;

  // Step 1: Check KV Namespace if available
  if (env.LYRICS_PICKS) {
    try {
      const cachedStr = await env.LYRICS_PICKS.get(kvKey);
      if (cachedStr) {
        const cachedData = JSON.parse(cachedStr);
        return jsonResponse(cachedData, {
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }
        });
      }
    } catch (e) {
      console.warn('KV read failed:', e);
    }
  }

  // Step 2: Check Cloudflare Cache API for edge caching
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  let cachedResponse = null;
  try {
    cachedResponse = await cache.match(cacheKey);
  } catch (e) {
    console.warn('Cache API match failed:', e);
  }

  if (cachedResponse) {
    return cachedResponse;
  }

  // Step 3: Resolve artist ID from iTunes
  const searchResult = await searchArtistId(name);
  if (!searchResult.success) {
    return jsonResponse(
      { error: 'iTunes search API request failed or was rate-limited' },
      {
        status: searchResult.errorStatus || 502,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      }
    );
  }

  const artistInfo = searchResult.artist;
  if (!artistInfo || !artistInfo.id) {
    const resultBody = { id: null, name: null, picture: null };

    // Store the negative result in KV permanently so we don't query iTunes again for it
    if (env.LYRICS_PICKS) {
      try {
        await env.LYRICS_PICKS.put(kvKey, JSON.stringify(resultBody));
      } catch (e) {
        console.warn('KV write failed:', e);
      }
    }

    const response = jsonResponse(resultBody, {
      headers: { 'Cache-Control': 'public, max-age=7200' }
    });
    try {
      await cache.put(cacheKey, response.clone());
    } catch (e) { }

    return response;
  }

  const artistId = artistInfo.id;

  // Step 4: Scrape the artist page for the portrait image
  const scrapeResult = await scrapeArtistImage(artistInfo.viewUrl);
  if (!scrapeResult.success) {
    return jsonResponse(
      { error: 'Apple Music scraping failed or was rate-limited' },
      {
        status: scrapeResult.errorStatus || 502,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      }
    );
  }

  const picture = scrapeResult.picture;
  const resultBody = {
    id: artistId,
    name: artistInfo.name,
    picture: picture || null
  };

  // Step 5: Store resolved hit (or scrape-miss) in KV permanently
  if (env.LYRICS_PICKS) {
    try {
      await env.LYRICS_PICKS.put(kvKey, JSON.stringify(resultBody));
    } catch (e) {
      console.warn('KV write failed:', e);
    }
  }

  const edgeCacheTime = picture ? 31536000 : 7200;
  const response = jsonResponse(resultBody, {
    headers: { 'Cache-Control': `public, max-age=${edgeCacheTime}${picture ? ', immutable' : ''}` }
  });

  try {
    await cache.put(cacheKey, response.clone());
  } catch (e) { }

  return response;
}
