const CACHE = 'taipei-dashboard-v10';
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
  './data/residential-price-monthly-index-records.json',
  './data/residential-price-monthly-index-summary.json',
  './data/residential-price-monthly-index-category-series.json',
  './data/residential-price-quarterly-index-records.json',
  './data/residential-price-quarterly-index-summary.json',
  './data/residential-price-quarterly-index-latest.json',
  './data/commercial-office-rent-index-records.json',
  './data/commercial-office-rent-index-summary.json',
  './data/commercial-office-rent-index-category-series.json',
  './data/residential-rent-index-records.json',
  './data/residential-rent-index-summary.json',
  './data/land-parcel-assessed-value-records.json',
  './data/land-parcel-assessed-value-summary.json',
  './data/land-parcel-assessed-value-district-year-summary.json',
  './data/movable-property-pledge-business-records.json',
  './data/movable-property-pledge-business-summary.json',
  './data/movable-property-pledge-business-annual-summary.json',
  './data/income-per-earner-by-district-year-records.json',
  './data/income-per-earner-by-district-year-summary.json',
  './data/income-per-earner-by-district-year-latest.json',
  './data/building-use-permits/manifest.json',
  './data/building-use-permits/summary.json',
  './data/building-use-permits/yearly-summary.json',
  './data/building-use-permits/district-summary.json',
  './data/building-use-permits/construction-type-summary.json',
  './data/building-use-permits/structure-type-summary.json',
  './data/building-use-permits/zoning-summary.json',
  './data/building-use-permits/parking-summary.json',
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
