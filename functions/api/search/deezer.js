export async function onRequest({ request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const limit = url.searchParams.get('limit') || '30';

  if (!q.trim()) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const targetUrl = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Deezer API request failed', status: res.status }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800, s-maxage=3600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
