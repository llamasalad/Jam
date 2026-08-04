function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const limit = url.searchParams.get('limit') || '100'

  try {
    const res = await fetch(`https://api.deezer.com/playlist/3155776842/tracks?limit=${limit}`, {
      headers: {
        'User-Agent': 'jam/1.0',
        'Accept': 'application/json'
      }
    })

    if (!res.ok) {
      return jsonResponse({ error: 'Failed to fetch Deezer chart' }, { status: res.status })
    }

    const data = await res.json()
    return jsonResponse(data, {
      headers: {
        'Cache-Control': 'public, max-age=1800, s-maxage=3600'
      }
    })
  } catch (err) {
    return jsonResponse({ error: 'Internal server error' }, { status: 500 })
  }
}
