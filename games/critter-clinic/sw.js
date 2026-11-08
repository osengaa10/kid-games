// Network first so updates show up right away; fall back to the cache when offline.
// (Only used on the web. The Kid Games app leaves this file out: everything is already on the iPad.)
const CACHE = 'critter-clinic-v2';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/bandages.js',
  'js/book.js',
  'js/card.js',
  'js/checklist.js',
  'js/effects.js',
  'js/exam.js',
  'js/icons.js',
  'js/layout.js',
  'js/lineup.js',
  'js/main.js',
  'js/monitor.js',
  'js/patient-art.js',
  'js/patients.js',
  'js/rig.js',
  'js/rng.js',
  'js/sickness.js',
  'js/room.js',
  'js/sound.js',
  'js/speech.js',
  'js/stage.js',
  'js/steps.js',
  'js/stickers.js',
  'js/storage.js',
  'js/style.js',
  'js/tool-art.js',
  'js/waiting.js',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
  'voice/clips.js',
];

// The voice clips too, so every line works offline: their names are in voice/clips.js.
const clips = () =>
  fetch('voice/clips.js')
    .then((res) => res.text())
    .then((js) => [...new Set([...js.matchAll(/"([\w-]+\.mp3)"/g)].map((m) => `voice/${m[1]}`))])
    .catch(() => []);

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => clips().then((voice) => c.addAll([...SHELL, ...voice])))
      .then(() => self.skipWaiting()),
  );
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
