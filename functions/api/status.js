export async function onRequest({ request, env }) {
  const url = new URL(request.url)
  const token = request.headers.get('x-auth-token') || url.searchParams.get('token')

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  })

  // use append, not object syntax, for Set-Cookie
  headers.append('Set-Cookie', `music_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`)

  return new Response(JSON.stringify({ ok: true }), { headers })
}
