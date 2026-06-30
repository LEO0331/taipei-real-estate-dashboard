import { readFile } from 'node:fs/promises';
import type { RealEstateSummary, ResidentialPriceQuarterlyIndexRecord } from '../src/models.ts';
import { buildResidentialPriceQuarterlyIndexSummary, writeJson } from './data.ts';

const records = JSON.parse(await readFile('public/data/residential-price-quarterly-index-records.json', 'utf8')) as ResidentialPriceQuarterlyIndexRecord[];
const summary = buildResidentialPriceQuarterlyIndexSummary(records);
const latest = records.filter((record) => record.quarterKey === summary.latestQuarterKey);
await writeJson('public/data/residential-price-quarterly-index-summary.json', summary);
await writeJson('public/data/residential-price-quarterly-index-latest.json', latest);

try {
  const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
  realEstate.residentialPriceQuarterlyIndex = {
    latestQuarterKey: summary.latestCitywide?.quarterKey,
    citywideQuarterlyIndex: summary.latestCitywide?.quarterlyIndex,
    citywideQuarterlyChangePercent: summary.latestCitywide?.quarterlyChangePercent,
    citywideYearOverYearQuarterlyIndexChangePercent: summary.latestCitywide?.quarterlyIndexYoYChangePercent,
    citywideStandardTotalPriceTenThousandNtd: summary.latestCitywide?.standardHousingTotalPriceTenThousandNtd,
    citywideStandardUnitPriceTenThousandNtdPerPing: summary.latestCitywide?.standardHousingUnitPriceTenThousandNtdPerPing,
  };
  await writeJson('public/data/real-price-summary.json', realEstate);
} catch {
  // Existing summary is optional when this module is built alone.
}

console.log('residential price quarterly index summary built');
