export async function onRequest(context) {
  const { request, env, next } = context
  const url = new URL(request.url)

  // FIX 1: Allow all OPTIONS requests to pass. 
  // Browsers don't send auth headers/cookies with preflights.
  if (request.method === "OPTIONS") {
    return next()
  }

  // let login and status through without a token
  if (url.pathname === '/api/status' || url.pathname === '/api/login') {
    return next()
  }

  const headerToken = request.headers.get('x-auth-token')
  const cookie = request.headers.get('Cookie') || ''
  const cookieMatch = cookie.match(/(?:^|;\s*)music_token=([^;]+)/)
  const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
  const queryToken = url.searchParams.get('token')

  const token = headerToken || cookieToken || queryToken

  // Debugging: This allows you to see in the Network tab which token was found
  // (Remove this after it works)
  const response = await (async () => {
    if (token !== env.AUTH_TOKEN) {
      return new Response('unauthorized', { 
        status: 401,
        headers: { 'X-Debug-Reason': 'Token-Mismatch' } 
      })
    }
    return next()
  })()

  return response
}