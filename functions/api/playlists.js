export async function onRequest({ request, env }) {
  if (!env.PLAYLISTS) return new Response(JSON.stringify({ error: "PLAYLISTS KV binding not found." }), { status: 500, headers: { "Content-Type": "application/json" } });

  const method = request.method;

  if (method === "GET") {
    const list = await env.PLAYLISTS.list({ prefix: "playlist:" });
    const playlists = await Promise.all(
      list.keys.map(async k => {
        const val = await env.PLAYLISTS.get(k.name, "json");
        return val;
      })
    );
    return new Response(JSON.stringify(playlists.filter(Boolean)), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (method === "POST") {
    const body = await request.json();
    const name = (body.name || "").trim();
    if (!name) return new Response(JSON.stringify({ error: "Name required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const playlist = { id, name, tracks: [], createdAt: Date.now() };
    await env.PLAYLISTS.put(`playlist:${id}`, JSON.stringify(playlist));
    return new Response(JSON.stringify(playlist), { headers: { "Content-Type": "application/json" } });
  }

  if (method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ error: "ID required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    await env.PLAYLISTS.delete(`playlist:${id}`);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
}
