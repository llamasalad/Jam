async function md5(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Extract subsonic path (e.g., /search3, /getCoverArt, /stream)
  const pathname = url.pathname.replace(/^\/api\/subsonic/, '');

  const navidromeUrl = env.NAVIDROME_URL;
  const username = env.NAVIDROME_USERNAME;
  const password = env.NAVIDROME_PASSWORD;

  if (!navidromeUrl || !username || !password) {
    return new Response(
      JSON.stringify({ error: 'Server is missing Navidrome configuration.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Generate Subsonic auth params
  const salt = Math.random().toString(36).substring(2, 10);
  const token = await md5(password + salt);

  const targetUrl = new URL(`${navidromeUrl}/rest${pathname}`);

  // Forward incoming search params, excluding client-side auth tokens
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'token') {
      targetUrl.searchParams.set(key, value);
    }
  }

  // Inject secure authentication parameters
  targetUrl.searchParams.set('u', username);
  targetUrl.searchParams.set('t', token);
  targetUrl.searchParams.set('s', salt);
  targetUrl.searchParams.set('v', '1.16.1');
  targetUrl.searchParams.set('c', 'Jam');
  targetUrl.searchParams.set('f', 'json');

  const headers = new Headers(request.headers);
  headers.set('Bypass-Tunnel-Reminder', 'true');

  const upstreamResponse = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers
  });
}
