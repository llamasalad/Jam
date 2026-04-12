export async function onRequestPost({ request, env }) {
  const { token } = await request.json().catch(() => ({}))
  
  if (env.AUTH_TOKEN && token!== env.AUTH_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  const headers = new Headers({ 'Content-Type': 'application/json' })
  
  // Use the SAME name your middleware checks: music_token
  // Use Lax so <audio> and <img> can send it
  headers.append(
    'Set-Cookie',
    `music_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`
  )

  return new Response(JSON.stringify({ ok: true }), { headers })
}
