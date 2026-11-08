async function md5(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
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

  const salt = Math.random().toString(36).substring(2, 10);
  const token = await md5(password + salt);
  const targetUrl = new URL(`${navidromeUrl}/rest${pathname}`);

  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'token') {
      targetUrl.searchParams.set(key, value);
    }
  }

  targetUrl.searchParams.set('u', username);
  targetUrl.searchParams.set('t', token);
  targetUrl.searchParams.set('s', salt);
  targetUrl.searchParams.set('v', '1.16.1');
  targetUrl.searchParams.set('c', 'Jam');
  targetUrl.searchParams.set('f', 'json');

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('Bypass-Tunnel-Reminder', 'true');
  if (pathname === '/stream') {
    headers.set('Accept-Encoding', 'identity');
  }

  const upstreamResponse = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  if (pathname === '/stream') {
    responseHeaders.set('Accept-Ranges', 'bytes');
  }

  if (pathname === '/stream' && upstreamResponse.status === 200 && upstreamResponse.body) {
    const rangeHeader = request.headers.get('range');
    const match = rangeHeader && /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader.trim());
    if (match) {
      const rangeStart = parseInt(match[1], 10);
      const rangeEnd = match[2] ? parseInt(match[2], 10) : null;
      if (rangeStart > 0) {
        let bytesSkipped = 0;
        let bytesSent = 0;
        const maxBytesToSend = (rangeEnd !== null && rangeEnd >= rangeStart)
          ? (rangeEnd - rangeStart + 1)
          : Infinity;

        const { readable, writable } = new TransformStream({
          transform(chunk, controller) {
            if (bytesSent >= maxBytesToSend) {
              return;
            }
            let offset = 0;
            if (bytesSkipped < rangeStart) {
              const remainingToSkip = rangeStart - bytesSkipped;
              if (chunk.byteLength <= remainingToSkip) {
                bytesSkipped += chunk.byteLength;
                return;
              }
              offset = remainingToSkip;
              bytesSkipped = rangeStart;
            }
            let available = chunk.byteLength - offset;
            const remainingToSend = maxBytesToSend - bytesSent;
            if (available > remainingToSend) {
              available = remainingToSend;
            }
            if (available > 0) {
              controller.enqueue(chunk.subarray(offset, offset + available));
              bytesSent += available;
            }
            if (bytesSent >= maxBytesToSend) {
              controller.terminate();
            }
          }
        });

        upstreamResponse.body.pipeTo(writable).catch(() => { });
        responseHeaders.delete('content-length');
        return new Response(readable, {
          status: 200,
          statusText: upstreamResponse.statusText,
          headers: responseHeaders
        });
      }
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders
  });
}
