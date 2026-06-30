import { readFile } from 'node:fs/promises';
import {
  buildCommercialOfficeRentIndexSummary,
  buildRealEstateSummary,
  writeJson,
} from './data.ts';
import type { CommercialOfficeRentIndexRecord, RealEstateSummary, RealPriceRecord } from '../src/models.ts';

const records = JSON.parse(await readFile('public/data/commercial-office-rent-index-records.json', 'utf8')) as CommercialOfficeRentIndexRecord[];
const summary = buildCommercialOfficeRentIndexSummary(records);
await writeJson('public/data/commercial-office-rent-index-summary.json', summary);

try {
  const realPriceRecords = JSON.parse(await readFile('public/data/real-price-records.json', 'utf8')) as RealPriceRecord[];
  const previous = await readFile('public/data/real-price-summary.json', 'utf8')
    .then((text) => JSON.parse(text) as RealEstateSummary)
    .catch(() => undefined);
  const realEstateSummary = {
    ...buildRealEstateSummary(realPriceRecords),
    residentialRentIndex: previous?.residentialRentIndex,
    residentialPriceMonthlyIndex: previous?.residentialPriceMonthlyIndex,
    residentialPriceQuarterlyIndex: previous?.residentialPriceQuarterlyIndex,
    movablePropertyPledgeBusinessStatistics: previous?.movablePropertyPledgeBusinessStatistics,
    incomePerEarnerByDistrictYear: previous?.incomePerEarnerByDistrictYear,
  } as RealEstateSummary;
  const citywide = summary.latestByCategory.find((item) => item.category === 'citywide');
  const majorRoad = summary.latestByCategory.find((item) => item.category === 'major_roads');
  realEstateSummary.commercialOfficeRentIndex = {
    latestPeriod: summary.latestPeriod,
    citywideQuarterlyIndex: citywide?.quarterlyIndex,
    citywideQuarterlyChangePercent: citywide?.quarterlyChangePercent,
    citywideStandardRentNtdPerPingPerMonth: citywide?.standardRentNtdPerPingPerMonth,
    majorRoadQuarterlyIndex: majorRoad?.quarterlyIndex,
    majorRoadQuarterlyChangePercent: majorRoad?.quarterlyChangePercent,
    majorRoadStandardRentNtdPerPingPerMonth: majorRoad?.standardRentNtdPerPingPerMonth,
    majorRoadRentGapNtdPerPingPerMonth: summary.latestMajorRoadPremium?.rentGapNtdPerPingPerMonth,
    majorRoadRentGapPercent: summary.latestMajorRoadPremium?.rentGapPercent,
  };
  await writeJson('public/data/real-price-summary.json', realEstateSummary);
} catch {
  // Existing summary is optional for running this converter in isolation.
}

console.log('commercial office rent index summary built');
