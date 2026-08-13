const CACHE = 'taipei-dashboard-v36';
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
  './data/land-use-zoning-control-summary.json',
  './data/land-use-zoning-control-summary-stats.json',
  './data/movable-property-pledge-business-records.json',
  './data/movable-property-pledge-business-summary.json',
  './data/movable-property-pledge-business-annual-summary.json',
  './data/movable-property-secured-transaction-records.json',
  './data/movable-property-secured-transaction-summary.json',
  './data/movable-property-secured-transaction-latest.json',
  './data/real-estate-broker-penalties/records.json',
  './data/real-estate-broker-penalties/summary.json',
  './data/municipal-idle-property-lease-tenders/records.json',
  './data/municipal-idle-property-lease-tenders/summary.json',
  './data/municipal-public-land-inventory/records.json',
  './data/municipal-public-land-inventory/summary.json',
  './data/public-private-partnership-contracts/records.json',
  './data/public-private-partnership-contracts/summary.json',
  './data/rental-housing-service-businesses/records.json',
  './data/rental-housing-service-businesses/summary.json',
  './data/public-works-excellence-award-projects/records.json',
  './data/mrt-joint-development-rents/records.json',
  './data/mrt-joint-development-rents/summary.json',
  './data/real-estate-brokerage-business-directory/records.json',
  './data/real-estate-brokerage-business-directory/summary.json',
  './data/real-estate-consumer-disputes/records.json',
  './data/real-estate-consumer-disputes/summary.json',
  './data/real-estate-appraiser-directory/records.json',
  './data/real-estate-appraiser-directory/summary.json',
  './data/announced-land-expropriation-registry/records.json',
  './data/announced-land-expropriation-registry/summary.json',
  './data/land-readjustment-sale-results/records.json',
  './data/declared-land-value-records/records.json',
  './data/general-expropriation-compensation-custody/records.json',
  './data/consumer-price-nature-monthly-index/records.json',
  './data/consumer-price-nature-monthly-index/metadata.json',
  './data/active-rental-housing-service-providers/records.json',
  './data/cadastral-clearing-sale-proceeds-custody/records.public.json',
  './data/cadastral-clearing-sale-proceeds-custody/metadata.json',
  './data/cadastral-cleanup-land-auction-results/records.json',
  './data/cadastral-cleanup-land-auction-results/metadata.json',
  './data/metro-engineering-milestones/records.json',
  './data/metro-engineering-milestones/metadata.json',
  './data/urban-renewal-regulations/records.json',
  './data/urban-renewal-regulations/summary.json',
  './data/urban-renewal-regulations/metadata.json',
  './data/income-per-earner-by-district-year-records.json',
  './data/income-per-earner-by-district-year-summary.json',
  './data/income-per-earner-by-district-year-latest.json',
  './data/consumer-price-basic-annual-index.json',
  './data/consumer-price-basic-annual-index-summary.json',
  './data/consumer-price-basic-annual-index-latest.json',
  './data/taipower-taipei-electricity-sales.json',
  './data/taipower-taipei-electricity-sales-summary.json',
  './data/land-value-tax-progressive-brackets.json',
  './data/land-value-tax-progressive-bracket-summary.json',
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
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === self.location.origin && requestUrl.pathname.includes('/data/') && requestUrl.pathname.endsWith('.json')) {
    event.respondWith(fetch(event.request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone());
      }
      return response;
    }).catch(async () => (await caches.match(event.request)) ?? Response.error()));
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
