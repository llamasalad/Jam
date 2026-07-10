function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function searchArtistId(name) {
  const cleanName = (name || '').trim();
  if (!cleanName) return { success: true, artist: null };
  const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=musicArtist&limit=1`;
  try {
    const res = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) {
      let bodySnippet = '';
      try { bodySnippet = (await res.text()).slice(0, 200); } catch (_) { }
      console.warn('iTunes search non-OK:', res.status, bodySnippet);
      return { success: false, errorStatus: res.status, errorDetail: bodySnippet };
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
    console.warn('iTunes search threw:', err && err.message, err && err.stack);
    return { success: false, errorStatus: 502, errorDetail: err && err.message };
  }
}

function parseJSONLD(html) {
  const scriptRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      if (data && typeof data.image === 'string') {
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

    let imageUrl = parseJSONLD(html);
    if (!imageUrl) {
      imageUrl = parseOpenGraphImage(html);
    }

    if (imageUrl === placeholderImageURL) {
      return { success: true, picture: null };
    }

    return { success: true, picture: imageUrl || null };
  } catch (err) {
    return { success: false, errorStatus: 502 };
  }
}

// Runs `fn` over `items` with at most `limit` in flight at once, so a batch of
// misses doesn't fire off a burst of simultaneous iTunes/Apple requests.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

/**
 * Resolves picture/id/name for a list of artist names, KV-first.
 * Returns an array of { queryName, id, name, picture, fromCache, error? }
 * in the same order as the input names (duplicates/blank names filtered out).
 */
async function resolveArtistImages(rawNames, env) {
  const hasKV = !!env.LYRICS_PICKS;

  const entries = rawNames
    .map(raw => ({ queryName: raw, cleanName: (raw || '').toLowerCase().trim() }))
    .filter(e => e.cleanName);

  // --- Step 1: check KV for every requested name up front ---
  const kvChecks = await Promise.all(entries.map(async (entry) => {
    if (!hasKV) return { ...entry, cached: null };
    try {
      const cachedStr = await env.LYRICS_PICKS.get(`artist_image:${entry.cleanName}`);
      return { ...entry, cached: cachedStr ? JSON.parse(cachedStr) : null };
    } catch (err) {
      console.warn('KV read failed for', entry.cleanName, err);
      return { ...entry, cached: null };
    }
  }));

  // --- Step 2: anything already mapped gets served straight away ---
  const resolved = [];
  const misses = [];
  for (const entry of kvChecks) {
    if (entry.cached) {
      resolved.push({
        queryName: entry.queryName,
        id: entry.cached.id,
        name: entry.cached.name,
        picture: entry.cached.picture,
        fromCache: true
      });
    } else {
      misses.push(entry);
    }
  }

  if (misses.length === 0) return resolved;

  // --- Step 3: only the misses touch iTunes + the scraper, and only now ---
  const freshResults = await mapWithConcurrency(misses, 3, async (entry) => {
    const searchResult = await searchArtistId(entry.queryName);

    if (!searchResult.success) {
      // Transient failure (network hiccup / iTunes rate limit) — don't cache this
      // as "no artist", just surface the error so the caller can retry later.
      return {
        queryName: entry.queryName, cleanName: entry.cleanName,
        id: null, name: null, picture: null, error: 'itunes_search_failed',
        errorStatus: searchResult.errorStatus, errorDetail: searchResult.errorDetail
      };
    }

    const artistInfo = searchResult.artist;
    if (!artistInfo || !artistInfo.id) {
      // Confirmed empty result — this is real signal, cache it as null.
      return {
        queryName: entry.queryName, cleanName: entry.cleanName,
        id: null, name: null, picture: null, confirmedEmpty: true
      };
    }

    const artistId = artistInfo.id;
    const artistIdKey = `artist_image_id:${artistId}`;
    let picture;
    let alreadyCachedById = false;

    if (hasKV) {
      try {
        const cachedPic = await env.LYRICS_PICKS.get(artistIdKey);
        if (cachedPic !== null) {
          picture = cachedPic === 'null' ? null : cachedPic;
          alreadyCachedById = true;
        }
      } catch (err) {
        console.warn('KV artist ID read failed:', err);
      }
    }

    // Not cached under this artist ID yet (even though the name itself was a
    // miss) — scrape Apple Music for it.
    if (!alreadyCachedById) {
      const scrapeResult = await scrapeArtistImage(artistInfo.viewUrl);
      if (!scrapeResult.success) {
        return {
          queryName: entry.queryName, cleanName: entry.cleanName,
          id: artistId, name: artistInfo.name, picture: null,
          error: 'scrape_failed'
        };
      }
      picture = scrapeResult.picture || null;
    }

    return {
      queryName: entry.queryName,
      cleanName: entry.cleanName,
      id: artistId,
      name: artistInfo.name,
      picture,
      artistIdKey,
      needsIdWrite: !alreadyCachedById
    };
  });

  // --- Step 4 & 5: persist every fresh result, success or empty, back into KV ---
  if (hasKV) {
    await Promise.all(freshResults.map(async (r) => {
      try {
        if (r.needsIdWrite && r.artistIdKey) {
          await env.LYRICS_PICKS.put(r.artistIdKey, r.picture || 'null');
        }
        // Only skip writing the name-level key on a transient error — everything
        // else (including confirmed-empty / no-image results) gets written.
        if (!r.error) {
          const body = { id: r.id, name: r.name, picture: r.picture || null };
          await env.LYRICS_PICKS.put(`artist_image:${r.cleanName}`, JSON.stringify(body));
        }
      } catch (err) {
        console.warn('KV write failed for', r.cleanName, err);
      }
    }));
  }

  for (const r of freshResults) {
    resolved.push({
      queryName: r.queryName,
      id: r.id,
      name: r.name,
      picture: r.picture,
      fromCache: false,
      error: r.error,
      errorStatus: r.errorStatus,
      errorDetail: r.errorDetail
    });
  }

  return resolved;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.LYRICS_PICKS) {
    return jsonResponse({ error: 'LYRICS_PICKS KV binding not found' }, { status: 500 });
  }

  const namesParam = url.searchParams.get('names');

  // Batch mode: /api/artist-image?names=Artist%20A,Artist%20B
  if (namesParam) {
    const rawNames = namesParam.split(',').map(n => n.trim()).filter(Boolean);
    if (rawNames.length === 0) {
      return jsonResponse({ error: 'names required' }, { status: 400 });
    }
    const results = await resolveArtistImages(rawNames, env);
    const body = {};
    for (const r of results) body[r.queryName] = r;
    return jsonResponse(body, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Single-name mode (backward compatible with the existing app.js caller)
  const name = url.searchParams.get('name') || '';
  if (!name) {
    return jsonResponse({ error: 'name or names required' }, { status: 400 });
  }

  const [result] = await resolveArtistImages([name], env);
  if (result.error) {
    return jsonResponse(
      {
        error: `Artist resolution failed: ${result.error}`,
        upstreamStatus: result.errorStatus,
        upstreamDetail: result.errorDetail
      },
      { status: 502, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }

  return jsonResponse(
    { id: result.id, name: result.name, picture: result.picture },
    {
      headers: {
        'Cache-Control': result.picture
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600'
      }
    }
  );
}

// Batch endpoint — pre-warm or backfill KV for a list of artist names.
// Follows the exact same KV-first resolution as GET, just over a bigger list.
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.LYRICS_PICKS) {
    return jsonResponse({ error: 'LYRICS_PICKS KV binding not found' }, { status: 500 });
  }

  let names = [];
  try {
    const body = await request.json();
    if (Array.isArray(body.names)) {
      names = body.names;
    } else if (typeof body.name === 'string') {
      names = [body.name];
    }
  } catch (_) {
    const url = new URL(request.url);
    const single = url.searchParams.get('name');
    if (single) names = [single];
  }

  if (names.length === 0) {
    return jsonResponse({ error: 'name or names required' }, { status: 400 });
  }

  const results = await resolveArtistImages(names, env);
  return jsonResponse({ results });
}