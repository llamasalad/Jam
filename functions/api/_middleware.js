export async function onRequest(context) {
  const { request, env, next } = context
  const url = new URL(request.url)

  // let login and status through without a token
  if (url.pathname === '/api/status' || url.pathname === '/api/login') {
    return next()
  }

  const headerToken = request.headers.get('x-auth-token')
  const cookie = request.headers.get('Cookie') || ''
  const cookieMatch = cookie.match(/(?:^|;\s*)music_token=([^;]+)/)
  const cookieToken = cookieMatch? decodeURIComponent(cookieMatch[1]) : null
  const queryToken = url.searchParams.get('token')

  const token = headerToken || cookieToken || queryToken

  if (token!== env.AUTH_TOKEN) {
    return new Response('unauthorized', { status: 401 })
  }

  return next()
}
