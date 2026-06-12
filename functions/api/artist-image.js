async function fetchDeezerArtist(name) {
  try {
    const cleanName = (name || '').trim();
    const q = new URLSearchParams({ q: cleanName || '', limit: '10' });
    const r = await fetch(`https://api.deezer.com/search/artist?${q}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.data && d.data.length > 0) {
      const normalize = (str) => (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\p{M}]/gu, '');

      const normalizedQuery = normalize(cleanName);
      const sorted = d.data.sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));

      const exactMatch = normalizedQuery
        ? sorted.find(a => normalize(a.name) === normalizedQuery)
        : null;

      const substringMatch = normalizedQuery
        ? sorted.find(a => {
          const normalizedArtist = normalize(a.name);
          return normalizedArtist.includes(normalizedQuery) || normalizedQuery.includes(normalizedArtist);
        })
        : null;

      const match = exactMatch || substringMatch || sorted[0];
      return {
        id: match.id,
        name: match.name,
        picture: match.picture_big || match.picture_medium || match.picture
      };
    }
  } catch (_) { }
  return null;
}

function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name') || '';

  if (!name) {
    return jsonResponse({ error: 'name required' }, { status: 400 });
  }

  const result = await fetchDeezerArtist(name);

  if (result && result.picture) {
    return jsonResponse(result, {
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' }
    });
  }

  return jsonResponse(
    { id: null, name: null, picture: null },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } }
  );
}
