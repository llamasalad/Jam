async function fetchLyrics(artist, title) {
  try {
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
    if (!r.ok) return null
    const d = await r.json()
    if (d.syncedLyrics) return { source: 'lrclib', type: 'synced', lyrics: d.syncedLyrics }
    if (d.plainLyrics) return { source: 'lrclib', type: 'plain', lyrics: d.plainLyrics }
  } catch (_) { }
  return null
}

function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

function normalizeTitle(title) {
  return (title || '')
    .replace(/^\d{1,3}[\s.\-_]+/, '')
    .replace(/\s*[\(\[](feat\.?|ft\.?|featuring)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s+(feat\.?|ft\.?|featuring).*$/gi, '')
    .replace(/\s*-\s*(remaster(ed)?|live|edit|mono|stereo|version|radio edit|explicit|clean).*$/gi, '')
    .trim()
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const title = url.searchParams.get('title') || ''
  const artist = url.searchParams.get('artist') || ''

  if (!title && !artist) {
    return jsonResponse({ error: 'title or artist required' }, { status: 400 })
  }

  let result = await fetchLyrics(artist, title)

  if (!result) {
    const cleanTitle = normalizeTitle(title)
    if (cleanTitle && cleanTitle !== title) {
      result = await fetchLyrics(artist, cleanTitle)
    }
  }

  if (result) {
    return jsonResponse(result, {
      headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=86400' }
    })
  }

  return jsonResponse(
    { source: null, type: null, lyrics: null },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800' } }
  )
}
