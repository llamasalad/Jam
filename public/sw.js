const CACHE = 'jam-v86';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  // Don't skipWaiting here — wait for app to tell us
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Listen for app telling us to activate
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/font/')) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  if (url.pathname.startsWith('/api/stream/')) return; // never cache audio
  if (url.pathname.startsWith('/api/cover/')) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      const res = await fetch(e.request);
      cache.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
