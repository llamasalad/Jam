function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*'
}

async function fetchAppleFeed() {
  const urls = [
    'https://rss.marketingtools.apple.com/api/v2/us/music/most-played/50/songs.json',
    'https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json'
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.feed?.results?.length) {
          return data.feed.results
        }
      }
    } catch (_) { }
  }

  return null
}

async function lookupItunes(ids) {
  if (!ids || ids.length === 0) return new Map()
  const lookupMap = new Map()

  const chunkSize = 50
  const chunks = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize))
  }

  await Promise.all(chunks.map(async (chunk) => {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${chunk.join(',')}&country=us`, {
        headers: BROWSER_HEADERS
      })
      if (res.ok) {
        const data = await res.json()
        if (data && Array.isArray(data.results)) {
          for (const item of data.results) {
            if (item.trackId) {
              lookupMap.set(String(item.trackId), item)
            }
          }
        }
      }
    } catch (_) { }
  }))

  return lookupMap
}

async function searchDeezer(title, artist) {
  const query = `${title || ''} ${artist || ''}`.trim()
  if (!query) return null
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    })
    if (res.ok) {
      const data = await res.json()
      return data?.data?.[0] || null
    }
  } catch (_) { }
  return null
}

async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length)
  let currentIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const limitParam = url.searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 50

  try {
    let feedResults = await fetchAppleFeed()
    if (!feedResults || feedResults.length === 0) {
      return jsonResponse({ error: 'Failed to fetch Apple Music chart' }, { status: 502 })
    }

    if (!isNaN(limit) && limit > 0) {
      feedResults = feedResults.slice(0, limit)
    }

    const ids = feedResults.map(song => song.id).filter(Boolean)
    const lookupMap = await lookupItunes(ids)

    // Process with a concurrency limit of 4 to avoid hitting Deezer's burst rate limit
    const tracks = await mapConcurrent(feedResults, 4, async (song) => {
      const itunesItem = lookupMap.get(String(song.id))
      let preview = itunesItem?.previewUrl || ''
      let deezerMatch = null

      if (!preview) {
        const trackName = itunesItem?.trackName || song.name || ''
        const artistName = itunesItem?.artistName || song.artistName || ''
        deezerMatch = await searchDeezer(trackName, artistName)
        if (deezerMatch?.preview) {
          preview = deezerMatch.preview
        }
      }

      const title = itunesItem?.trackName || song.name || deezerMatch?.title || ''
      const artistName = itunesItem?.artistName || song.artistName || deezerMatch?.artist?.name || ''
      const albumTitle = itunesItem?.collectionName || deezerMatch?.album?.title || song.name || ''

      const artworkRaw = itunesItem?.artworkUrl100 || song.artworkUrl100 || ''
      const artworkMedium = artworkRaw ? artworkRaw.replace(/\/\d+x\d+bb\./, '/500x500bb.') : (deezerMatch?.album?.cover_medium || deezerMatch?.album?.cover || '')
      const artworkLarge = artworkRaw ? artworkRaw.replace(/\/\d+x\d+bb\./, '/1000x1000bb.') : (deezerMatch?.album?.cover_big || artworkMedium)
      const artworkSmall = artworkRaw || deezerMatch?.album?.cover_small || artworkMedium

      let duration = 0
      if (itunesItem?.trackTimeMillis) {
        duration = Math.round(itunesItem.trackTimeMillis / 1000)
      } else if (deezerMatch?.duration) {
        duration = deezerMatch.duration
      }

      return {
        id: song.id || itunesItem?.trackId || deezerMatch?.id,
        title,
        preview,
        duration,
        artist: {
          id: itunesItem?.artistId || song.artistId || deezerMatch?.artist?.id || null,
          name: artistName
        },
        album: {
          id: itunesItem?.collectionId || deezerMatch?.album?.id || null,
          title: albumTitle,
          cover: artworkMedium,
          cover_small: artworkSmall,
          cover_medium: artworkMedium,
          cover_big: artworkLarge,
          cover_xl: artworkLarge
        }
      }
    })

    return jsonResponse({ data: tracks }, {
      headers: {
        'Cache-Control': 'public, max-age=1800, s-maxage=3600'
      }
    })
  } catch (err) {
    return jsonResponse({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
