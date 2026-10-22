function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

function makeLyricsKey(artist, title) {
  const cleanArtist = (artist || '').toLowerCase().trim()
  const cleanTitle = (title || '').toLowerCase().trim()
  return `lyrics:${cleanArtist}:${cleanTitle}`
}

function makeCuratedKey(artist, title) {
  const cleanArtist = (artist || '').toLowerCase().trim()
  const cleanTitle = (title || '').toLowerCase().trim()
  return `curated:${cleanArtist}:${cleanTitle}`
}

function formatLyricPayload(d) {
  if (!d) return null
  const synced = d.syncedLyrics || (d.type === 'synced' ? d.lyrics : null) || null
  const plain = d.plainLyrics || (d.type === 'plain' ? d.lyrics : null) || null
  const type = synced ? 'synced' : (plain ? 'plain' : null)
  const lyrics = synced || plain || null
  if (!lyrics && !d.instrumental) return null

  return {
    id: d.id || null,
    source: d.source || 'lrclib',
    type,
    lyrics,
    trackName: d.trackName || d.name || '',
    artistName: d.artistName || '',
    albumName: d.albumName || '',
    duration: d.duration || 0,
    instrumental: !!d.instrumental,
    hasSynced: !!synced,
    hasPlain: !!plain,
    syncedLyrics: synced,
    plainLyrics: plain
  }
}

async function fetchLyrics(artist, title) {
  let hadTransient = false
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 500))
      }
      const q = new URLSearchParams({
        artist_name: artist || '',
        track_name: title || ''
      })
      const r = await fetch(`https://lrclib.net/api/get?${q}`, {
        headers: {
          'User-Agent': 'jam/1.0',
          'Accept': 'application/json'
        }
      })
      if (r.ok) {
        const d = await r.json()
        return formatLyricPayload(d)
      }
      if (r.status === 503 || r.status === 429) {
        hadTransient = true
      } else {
        return null
      }
    } catch (_) {
      if (attempt === 1) {
        if (hadTransient) return { transient: true }
        return null
      }
    }
  }
  if (hadTransient) return { transient: true }
  return null
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const rawTitle = url.searchParams.get('title') || ''
  const title = rawTitle.split('(')[0].trim()
  const artist = url.searchParams.get('artist') || ''

  if (!title && !artist) {
    return jsonResponse({ error: 'title or artist required' }, { status: 400 })
  }

  const cleanArtist = (artist || '').toLowerCase().trim()
  const cleanRawTitle = (rawTitle || '').toLowerCase().trim()
  const cleanTitle = (title || '').toLowerCase().trim()

  if (env && env.LYRICS_PICKS) {
    const keysToCheck = [
      makeLyricsKey(cleanArtist, cleanRawTitle),
      makeCuratedKey(cleanArtist, cleanRawTitle)
    ]
    if (cleanTitle && cleanTitle !== cleanRawTitle) {
      keysToCheck.push(makeLyricsKey(cleanArtist, cleanTitle))
      keysToCheck.push(makeCuratedKey(cleanArtist, cleanTitle))
    }

    for (const key of keysToCheck) {
      try {
        const cached = await env.LYRICS_PICKS.get(key)
        if (cached) {
          const parsed = JSON.parse(cached)
          const formatted = formatLyricPayload(parsed)
          if (formatted) {
            return jsonResponse(formatted, {
              headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' }
            })
          }
        }
      } catch (_) { }
    }
  }

  let result = await fetchLyrics(artist, title)

  if (result && result.transient) {
    return jsonResponse(
      { error: 'Transient upstream error', source: null, type: null, lyrics: null },
      { status: 503, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  }

  if (result) {
    if (env && env.LYRICS_PICKS) {
      try {
        const jsonStr = JSON.stringify(result)
        await env.LYRICS_PICKS.put(makeLyricsKey(cleanArtist, cleanRawTitle), jsonStr)
      } catch (_) { }
    }

    return jsonResponse(result, {
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' }
    })
  }

  return jsonResponse(
    { source: null, type: null, lyrics: null },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800' } }
  )
}