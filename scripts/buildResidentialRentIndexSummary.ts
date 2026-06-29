import { readFile } from 'node:fs/promises';
import {
  buildResidentialRentIndexSummary,
  buildRealEstateSummary,
  writeJson,
} from './data.ts';
import type { RealEstateSummary, RealPriceRecord, ResidentialRentIndexRecord } from '../src/models.ts';

const records = JSON.parse(await readFile('public/data/residential-rent-index-records.json', 'utf8')) as ResidentialRentIndexRecord[];
const summary = buildResidentialRentIndexSummary(records);
await writeJson('public/data/residential-rent-index-summary.json', summary);

try {
  const realPriceRecords = JSON.parse(await readFile('public/data/real-price-records.json', 'utf8')) as RealPriceRecord[];
  const previous = await readFile('public/data/real-price-summary.json', 'utf8')
    .then((text) => JSON.parse(text) as RealEstateSummary)
    .catch(() => undefined);
  const realEstateSummary = { ...buildRealEstateSummary(realPriceRecords), residentialPriceMonthlyIndex: previous?.residentialPriceMonthlyIndex } as RealEstateSummary;
  const citywide = summary.latestByCategory.find((item) => item.rentIndexCategory === 'citywide');
  realEstateSummary.residentialRentIndex = {
    latestQuarterKey: citywide?.quarterKey,
    citywideRentIndex: citywide?.quarterlyRentIndex,
    citywideQuarterlyChangeRatePercent: citywide?.quarterlyChangeRatePercent,
    citywideStandardRentUnitPriceNtdPerPingMonthly: citywide?.standardRentUnitPriceNtdPerPingMonthly,
    citywideYearOverYearRentIndexChangePercent: citywide?.yearOverYearRentIndexChangePercent,
    citywideYearOverYearStandardRentUnitPriceChangePercent: citywide?.yearOverYearStandardRentUnitPriceChangePercent,
  };
  await writeJson('public/data/real-price-summary.json', realEstateSummary);
} catch {
  // Existing summary is optional for running this converter in isolation.
}

console.log('residential rent index summary built');
