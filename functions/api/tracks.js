export async function onRequestGet({ env }) {
  const AUTH_TOKEN = env.AUTH_TOKEN;
 
  if (!env.MUSIC_BUCKET) {
    return new Response(JSON.stringify({ error: "MUSIC_BUCKET binding not found. Check R2 binding in Pages settings." }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  const listed = await env.MUSIC_BUCKET.list({ limit: 1000 });

  const SUPPORTED = new Set([".mp3", ".flac", ".ogg", ".m4a", ".wav", ".aac", ".opus"]);

  const tracks = listed.objects
    .filter(obj => {
      const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
      return SUPPORTED.has(ext);
    })
    .map(obj => {
      const key = obj.key;
      const parts = key.split("/");
      const filename = parts[parts.length - 1];
      const ext = filename.slice(filename.lastIndexOf("."));
      const title = filename.slice(0, filename.length - ext.length);
      const artist = parts.length >= 3 ? parts[parts.length - 3] : "Unknown";
      const album = parts.length >= 2 ? parts[parts.length - 2] : "Unknown";
      const id = btoa(key).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" }[c]));
      return { id, key, title, artist, album };
    });

  return new Response(JSON.stringify(tracks), {
    headers: { "Content-Type": "application/json" }
  });
}
