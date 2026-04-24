export async function onRequestGet({ params, request, env }) {

  const id = params.id;
  const key = decodeURIComponent(id);

  const rangeHeader = request.headers.get("Range");

  let object;
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? parseInt(match[1]) : undefined;
      const end = match[2] ? parseInt(match[2]) : undefined;
      object = await env.MUSIC_BUCKET.get(key, {
        range: { offset: start, length: end !== undefined && start !== undefined ? end - start + 1 : undefined }
      });
    }
  } else {
    object = await env.MUSIC_BUCKET.get(key);
  }

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  const mimeMap = {
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".aac": "audio/aac",
    ".opus": "audio/ogg",
  };
  const mime = mimeMap[ext] || "audio/mpeg";

  const headers = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
  };

  if (object.range) {
    const size = object.size;
    const { offset = 0, length } = object.range;
    const end = length ? offset + length - 1 : size - 1;
    headers["Content-Range"] = `bytes ${offset}-${end}/${size}`;
    headers["Content-Length"] = String(end - offset + 1);
    return new Response(object.body, { status: 206, headers });
  }

  headers["Content-Length"] = String(object.size);

  const cache = caches.default;
  const cacheKey = new Request(request.url);
  const cachedRes = await cache.match(cacheKey);
  if (cachedRes) return cachedRes;

  const response = new Response(object.body, { status: 200, headers });

  // only cache full requests, not range requests
  if (!rangeHeader) {
    await cache.put(cacheKey, response.clone());
  }

  return response;
}
