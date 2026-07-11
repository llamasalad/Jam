export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return new Response("Missing key parameter", { status: 400 });
  }

  if (!env.CANVAS) {
    return new Response("R2 binding CANVAS is not configured", { status: 500 });
  }

  try {
    const rangeHeader = request.headers.get("range");
    const options = {};
    if (rangeHeader) {
      options.range = request.headers;
    }

    const object = await env.CANVAS.get(key, options);
    if (!object) {
      return new Response("Object not found in bucket", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=604800");
    headers.set("Accept-Ranges", "bytes");

    let status = 200;
    if (rangeHeader && object.range) {
      status = 206;
      const offset = object.range.offset;
      const length = object.range.length;
      const end = offset + length - 1;
      headers.set("Content-Range", `bytes ${offset}-${end}/${object.size}`);
      headers.set("Content-Length", String(length));
    } else {
      headers.set("Content-Length", String(object.size));
    }

    return new Response(object.body, { status, headers });
  } catch (err) {
    return new Response(err.message || "Internal Server Error", { status: 500 });
  }
}
