export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Handle CORS preflight requests early - allow OPTIONS without auth check
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, x-auth-token",
        "Access-Control-Cache-Max-Age": "31536000",
      }
    });
  }

  // 2. Get the token from all possible sources
  const headerToken = request.headers.get('x-auth-token');
  const queryToken = url.searchParams.get('token');
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|; )music_token=([^;]*)/);
  const cookieToken = match ? decodeURIComponent(match[1]).replace(/^"|"$/g, '') : null;

  const token = (headerToken || queryToken || cookieToken || '').trim();

  // 3. Verify
  if (token !== env.AUTH_TOKEN) {
    return new Response('unauthorized', { status: 401 });
  }

  // 4. Important for Safari: If this is a streaming request, 
  // we MUST NOT buffer the response. 
  return next();
}