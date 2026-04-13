export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 1. ALWAYS let OPTIONS through (Safari pre-flight)
  if (request.method === "OPTIONS") return next();

  // 2. Public routes
  if (url.pathname === '/api/status' || url.pathname === '/api/login') {
    return next();
  }

  const headerToken = request.headers.get('x-auth-token');
  const queryToken = url.searchParams.get('token');
  
  // 3. Robust Cookie Parsing (handles Safari's double quotes)
  const cookieHeader = request.headers.get('Cookie') || '';
  let cookieToken = null;
  const match = cookieHeader.match(/(?:^|; )music_token=([^;]*)/);
  if (match) {
    // Strip potential quotes that Safari/Cloudflare might add
    cookieToken = decodeURIComponent(match[1]).replace(/^"|"$/g, '');
  }

  const token = (headerToken || queryToken || cookieToken || '').trim();

  // 4. Verification
  if (token !== env.AUTH_TOKEN.trim()) {
    // If it's a media request, Safari is very picky about 401s.
    // We return a clear 401.
    return new Response('unauthorized', { status: 401 });
  }

  return next();
}