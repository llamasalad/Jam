export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/font/')) {
    return await next();
  }

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

  const headerToken = request.headers.get('x-auth-token');
  const queryToken = url.searchParams.get('token');
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|; )music_token=([^;]*)/);
  const cookieToken = match ? decodeURIComponent(match[1]).replace(/^"|"$/g, '') : null;

  const token = (headerToken || queryToken || cookieToken || '').trim();

  const origin = request.headers.get('Origin') || url.origin;
  const commonHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type, x-auth-token",
    "Access-Control-Allow-Credentials": "true",
    "Accept-Ranges": "bytes"
  };

  if (token !== env.AUTH_TOKEN) {
    return new Response('unauthorized', {
      status: 401,
      headers: {
        ...commonHeaders,
        "Content-Type": "text/plain"
      }
    });
  }

  const response = await next();

  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });

  Object.entries(commonHeaders).forEach(([k, v]) => {
    newResponse.headers.set(k, v);
  });

  return newResponse;
}