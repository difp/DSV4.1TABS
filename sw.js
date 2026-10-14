// RiffHero — service worker: офлайн-режим (network-first, кэш как запасной вариант).
const CACHE = 'riffhero-v1';
const ASSETS = [
  './', 'index.html', 'styles.css', 'manifest.json',
  'icons/favicon-64.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'src/main.js', 'src/i18n.js', 'src/parser-catalog.js', 'src/profile.js',
  'src/engine/audio.js', 'src/engine/pitch.js', 'src/engine/spectral.js',
  'src/engine/renderer.js', 'src/engine/game.js', 'src/engine/theory.js',
  'src/parsers/index.js', 'src/parsers/native.js', 'src/parsers/midi.js',
  'src/parsers/guitarpro.js', 'src/parsers/zip.js', 'src/songs/demos.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .catch(() => { /* не все ресурсы доступны — переживём */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // сторонние запросы (noembed и пр.) не трогаем
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const shell = (await cache.match('index.html')) || (await cache.match('./'));
      if (shell) return shell;
    }
    throw err;
  }
}
