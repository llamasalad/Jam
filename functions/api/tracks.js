export async function onRequestGet({ env }) {
  if (!env.MUSIC_BUCKET) {
    return new Response(JSON.stringify({ error: "MUSIC_BUCKET binding not found." }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  try {
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
        let title = filename.slice(0, filename.length - ext.length);

        // Strip leading track numbers: "01 - Title", "01. Title", "01 Title", "1 - Title"
        title = title.replace(/^\d{1,3}[\s.\-_]+/, '').trim();

        const artist = parts.length >= 3 ? parts[parts.length - 3] : "Unknown";
        const album = parts.length >= 2 ? parts[parts.length - 2] : "Unknown";
        const id = encodeURIComponent(key).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));
        return { id, key, title, artist, album };
      });

    return new Response(JSON.stringify(tracks), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
