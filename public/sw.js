const CACHE = 'jam-v2';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js', '/manifest.json',
  '/fonts/subset-SFProDisplay-Regular.woff2',
  '/fonts/subset-SFProDisplay-Medium.woff2',
  '/fonts/subset-SFProDisplay-Bold.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
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

  // Helper to normlize cache keys by stripping dynamic Subsonic authentication params (t, s)
  const getCacheKey = (request) => {
    const u = new URL(request.url);
    u.searchParams.delete('t');
    u.searchParams.delete('s');
    return u.toString();
  };

  // Add ngrok skip warning headers to any request going to ngrok to prevent CORS preflight blocking
  let requestToFetch = e.request;
  const isNgrok = url.hostname.endsWith('ngrok-free.dev') || url.hostname.endsWith('ngrok-free.app');
  if (isNgrok) {
    const newHeaders = new Headers(e.request.headers);
    newHeaders.set('ngrok-skip-browser-warning', 'true');
    try {
      requestToFetch = new Request(e.request, { headers: newHeaders });
    } catch (_) { }
  }

  if ((url.pathname === '/api/tracks' || url.pathname.endsWith('/rest/search3')) && e.request.method === 'GET' && !url.searchParams.has('refresh')) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cacheKey = getCacheKey(requestToFetch);
      const cached = await cache.match(cacheKey);
      if (cached) {
        fetch(requestToFetch).then(res => {
          if (res.ok) cache.put(cacheKey, res.clone());
        }).catch(() => { });
        return cached;
      }
      return fetch(requestToFetch).then(res => {
        if (res.ok) cache.put(cacheKey, res.clone());
        return res;
      });
    }));
    return;
  }

  if (url.pathname.startsWith('/api/stream/') || url.pathname.endsWith('/rest/stream')) return;

  if (url.pathname.startsWith('/api/cover/') || url.pathname.endsWith('/rest/getCoverArt')) {
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
