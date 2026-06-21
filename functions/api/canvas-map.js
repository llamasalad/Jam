export async function onRequestGet({ request, env }) {
  if (!env.LYRICS_PICKS) {
    return new Response(JSON.stringify({ tracks: {}, albums: {} }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const mapData = await env.LYRICS_PICKS.get('canvas_map');
  return new Response(mapData || JSON.stringify({ tracks: {}, albums: {} }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
