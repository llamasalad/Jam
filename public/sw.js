const CACHE = 'jam-v0';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js', '/navidrome.js', '/manifest.json',
  '/favicon.ico', '/32x32.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png',
  '/fonts/begav-subset.woff2',
  '/fonts/SFUIText-Regular-subset.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await Promise.all(ASSETS.map(async url => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await c.put(url, res);
      } catch (_) {
        await c.add(url);
      }
    }));
  }));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  const getCacheKey = (request) => {
    const u = new URL(request.url);
    u.searchParams.delete('t');
    u.searchParams.delete('s');
    u.searchParams.delete('token');
    return u.toString();
  };

  let requestToFetch = e.request;
  const isLocalTunnel = url.hostname.endsWith('loca.lt') || url.hostname.endsWith('localtunnel.me');
  if (isLocalTunnel) {
    const newHeaders = new Headers(e.request.headers);
    newHeaders.set('Bypass-Tunnel-Reminder', 'true');
    try {
      requestToFetch = new Request(e.request, { headers: newHeaders });
    } catch (_) { }
  }

  if ((url.pathname.endsWith('/rest/search3') || url.pathname === '/api/subsonic/search3') && e.request.method === 'GET' && !url.searchParams.has('refresh')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cacheKey = getCacheKey(requestToFetch);
      const cachedPromise = cache.match(cacheKey);

      const networkPromise = fetch(requestToFetch).then(res => {
        if (res.ok) cache.put(cacheKey, res.clone());
        return res;
      });

      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2500));

      try {
        const result = await Promise.race([networkPromise, timeoutPromise]);
        if (result) {
          return result;
        }
        const cached = await cachedPromise;
        if (cached) return cached;
        return await networkPromise;
      } catch (err) {
        const cached = await cachedPromise;
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/api/stream/') || url.pathname.endsWith('/rest/stream') || url.pathname === '/api/subsonic/stream') {
    return;
  }

  if (url.pathname.startsWith('/api/cover/') || url.pathname.endsWith('/rest/getCoverArt') || url.pathname === '/api/subsonic/getCoverArt') {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cacheKey = getCacheKey(requestToFetch);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      const res = await fetch(requestToFetch);
      if (res.ok) cache.put(cacheKey, res.clone());
      return res;
    }));
    return;
  }

  e.respondWith(caches.match(e.request).then(r => r || fetch(requestToFetch)));
});
