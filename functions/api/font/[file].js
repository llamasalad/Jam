export async function onRequestGet({ params, env }) {
  if (!env.MUSIC_BUCKET) return new Response("No bucket", { status: 500 });

  const file = params.file;
  const object = await env.MUSIC_BUCKET.get(`fonts/${file}`);
  if (!object) return new Response("Not found", { status: 404 });

  const ext = file.split('.').pop().toLowerCase();
  const mimeMap = {
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
  };

  return new Response(object.body, {
    headers: {
      'Content-Type': mimeMap[ext] || 'font/otf',
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*',
    }
  });
}