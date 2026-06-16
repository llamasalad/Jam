function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''

  if (id) {
    try {
      const r = await fetch(`https://lrclib.net/api/get/${id}`, {
        headers: {
          'User-Agent': 'jam/1.0',
          'Accept': 'application/json'
        }
      })
      if (!r.ok) return jsonResponse([], { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } })

      const item = await r.json()
      const mapped = {
        id: item.id,
        trackName: item.trackName || item.name || '',
        artistName: item.artistName || '',
        albumName: item.albumName || '',
        duration: item.duration || 0,
        instrumental: !!item.instrumental,
        hasSynced: !!item.syncedLyrics,
        hasPlain: !!item.plainLyrics,
        syncedLyrics: item.syncedLyrics || null,
        plainLyrics: item.plainLyrics || null
      }

      return jsonResponse([mapped], {
        headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=86400' }
      })
    } catch (_) {
      return jsonResponse([], { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } })
    }
  }

  const rawTitle = url.searchParams.get('title') || ''
  const title = rawTitle.split('(')[0].trim()
  const artist = url.searchParams.get('artist') || ''

  if (!title && !artist) {
    return jsonResponse({ error: 'title or artist required' }, { status: 400 })
  }

  try {
    const q = new URLSearchParams({
      q: `${artist} ${title}`.trim()
    })
    const r = await fetch(`https://lrclib.net/api/search?${q}`, {
      headers: {
        'User-Agent': 'jam/1.0',
        'Accept': 'application/json'
      }
    })
    if (!r.ok) return jsonResponse([], { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } })

    const results = await r.json()
    const items = (Array.isArray(results) ? results : []).map(item => ({
      id: item.id,
      trackName: item.trackName || item.name || '',
      artistName: item.artistName || '',
      albumName: item.albumName || '',
      duration: item.duration || 0,
      instrumental: !!item.instrumental,
      hasSynced: !!item.syncedLyrics,
      hasPlain: !!item.plainLyrics,
      syncedLyrics: item.syncedLyrics || null,
      plainLyrics: item.plainLyrics || null
    }))

    return jsonResponse(items, {
      headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=86400' }
    })
  } catch (_) {
    return jsonResponse([], { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } })
  }
}
