// Network first so updates show up right away; fall back to the cache when offline.
// (Only used on the web. The Kid Games app leaves this file out: everything is already on the iPad.)
const CACHE = 'gadget-glam-v2';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/art.js',
  'js/demo.js',
  'js/design.js',
  'js/devices.js',
  'js/editor.js',
  'js/effects.js',
  'js/icons.js',
  'js/items.js',
  'js/main.js',
  'js/paint.js',
  'js/palette.js',
  'js/patterns.js',
  'js/rng.js',
  'js/shapes.js',
  'js/shelf.js',
  'js/sound.js',
  'js/speech.js',
  'js/stage.js',
  'js/storage.js',
  'js/table.js',
  'js/tools.js',
  'js/view.js',
  'js/view3d.js',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
