const CACHE = 'taipei-dashboard-v2';
const ASSETS = [
  './',
  './manifest.webmanifest',
  './icon.svg',
  './data/real-price-summary.json',
  './data/real-price-records.json',
  './data/quarterly-market-analysis.json',
  './data/quarterly-market-summary.json',
  './data/population-district-summary.json',
  './data/district-comparison-summary.json',
  './data/conversion-report.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./')));
    return;
  }
  event.respondWith(caches.match(event.request).then(async (cached) => {
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
      const cache = await caches.open(CACHE);
      cache.put(event.request, response.clone());
    }
    return response;
  }));
});
