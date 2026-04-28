export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Handle CORS preflight requests early - allow OPTIONS without auth check
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin') || url.origin;
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, x-auth-token",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
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

  // 3. Prepare common headers for Safari/CORS stability
  const origin = request.headers.get('Origin') || url.origin;
  const commonHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type, x-auth-token",
    "Access-Control-Allow-Credentials": "true",
    "Accept-Ranges": "bytes"
  };

  // 4. Verify
  if (token !== env.AUTH_TOKEN) {
    return new Response('unauthorized', {
      status: 401,
      headers: {
        ...commonHeaders,
        "Content-Type": "text/plain"
      }
    });
  }

  // 5. Success - proceed to the actual API
  const response = await next();

  // Clone the response to modify headers while preserving status/body
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });

  // Inject our Safari/CORS stability headers
  Object.entries(commonHeaders).forEach(([k, v]) => {
    // Only set if not already present or to ensure our specific values
    newResponse.headers.set(k, v);
  });

  return newResponse;
}