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
    const object = await env.CANVAS.get(key);
    if (!object) {
      return new Response("Object not found in bucket", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=604800"); // Cache for 7 days

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response(err.message || "Internal Server Error", { status: 500 });
  }
}
