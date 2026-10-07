// Offline support for the web version: the game is one page plus icons. The page is fetched fresh when
// online (so updates arrive at once; the browser's own cache is only asked whether it is still current)
// and served from the cache when offline. version.json and the APK always come from the network. Online
// play itself goes over WebSockets/WebRTC, which a service worker doesn't touch.
const CACHE = 'world48-8bb69118c667';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('world48-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    let fresh = req;
    try {
      fresh = new Request(req, { cache: 'no-cache' });
    } catch {
      // Some browsers can't copy a navigation request with options: the plain one then.
    }
    e.respondWith(
      fetch(fresh)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
