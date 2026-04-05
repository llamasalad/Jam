export async function onRequestGet({ request, env }) {
  const AUTH_TOKEN = env.AUTH_TOKEN;
  if (!AUTH_TOKEN) return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });

  const token = request.headers.get("x-auth-token") ||
    new URL(request.url).searchParams.get("token");

  if (token !== AUTH_TOKEN) {
    return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
