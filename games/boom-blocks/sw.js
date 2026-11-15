// Offline play on the web: everything the game loads is cached on first visit, then served from
// the cache when there's no network (and refreshed from the network when there is).
// The Kid Games app leaves this file out: there, everything is already on the iPad.
// Adding a file? List it here and bump CACHE (test/sw.test.js checks the list).
const CACHE = 'boom-blocks-v3';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'style.css',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/audio.js',
  'js/camera.js',
  'js/destruction.js',
  'js/input.js',
  'js/main.js',
  'js/quality.js',
  'js/settings.js',
  'js/sfx.js',
  'js/ui.js',
  'vendor/LICENSE-rapier.txt',
  'vendor/RoomEnvironment.js',
  'vendor/rapier.module.js',
  'vendor/three.module.min.js',
  'js/core/boxes.js',
  'js/core/budget.js',
  'js/core/builders.js',
  'js/core/carve.js',
  'js/core/chunker.js',
  'js/core/combo.js',
  'js/core/connect.js',
  'js/core/faces.js',
  'js/core/grid.js',
  'js/core/materials.js',
  'js/core/rng.js',
  'js/dev/panel.js',
  'js/dev/stress.js',
  'js/fx/balloons.js',
  'js/fx/bursts.js',
  'js/fx/effects.js',
  'js/fx/gpuParticles.js',
  'js/fx/shake.js',
  'js/physics/pieces.js',
  'js/physics/world.js',
  'js/render/blockMaterial.js',
  'js/render/island.js',
  'js/render/stage.js',
  'js/render/voxels.js',
  'js/tools/bomb.js',
  'js/tools/hammer.js',
  'js/tools/laser.js',
  'js/tools/meteor.js',
  'js/tools/wreckingBall.js',
  'js/tools/cannon.js',
  'js/tools/tornado.js',
  'js/tools/dynamite.js',
  'js/core/scenes/castle.js',
  'js/core/scenes/city.js',
  'js/core/scenes/garden.js',
  'js/core/scenes/index.js',
  'js/core/scenes/tower.js',
  'js/core/scenes/bay.js',
  'js/core/scenes/snow.js',
  'js/core/scenes/space.js',
  'js/core/scenes/fair.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});
