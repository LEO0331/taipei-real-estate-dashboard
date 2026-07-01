import { readFile } from 'node:fs/promises';
import {
  buildRealEstateSummary,
  buildResidentialPriceMonthlyIndexSummary,
  writeJson,
} from './data.ts';
import type { RealEstateSummary, RealPriceRecord, ResidentialPriceMonthlyIndexRecord } from '../src/models.ts';

const records = JSON.parse(await readFile('public/data/residential-price-monthly-index-records.json', 'utf8')) as ResidentialPriceMonthlyIndexRecord[];
const summary = buildResidentialPriceMonthlyIndexSummary(records);
await writeJson('public/data/residential-price-monthly-index-summary.json', summary);

try {
  const realPriceRecords = JSON.parse(await readFile('public/data/real-price-records.json', 'utf8')) as RealPriceRecord[];
  const previous = await readFile('public/data/real-price-summary.json', 'utf8')
    .then((text) => JSON.parse(text) as RealEstateSummary)
    .catch(() => undefined);
  const realEstateSummary = {
    ...buildRealEstateSummary(realPriceRecords),
    residentialPriceQuarterlyIndex: previous?.residentialPriceQuarterlyIndex,
    residentialRentIndex: previous?.residentialRentIndex,
    commercialOfficeRentIndex: previous?.commercialOfficeRentIndex,
    movablePropertyPledgeBusinessStatistics: previous?.movablePropertyPledgeBusinessStatistics,
    movablePropertySecuredTransactionRecords: previous?.movablePropertySecuredTransactionRecords,
    incomePerEarnerByDistrictYear: previous?.incomePerEarnerByDistrictYear,
    consumerPriceBasicAnnualIndex: previous?.consumerPriceBasicAnnualIndex,
  } as RealEstateSummary;
  const citywide = summary.latestByCategory.find((item) => item.category === 'citywide');
  realEstateSummary.residentialPriceMonthlyIndex = {
    latestPeriod: citywide?.period,
    citywideMonthlyIndex: citywide?.monthlyIndex,
    citywideMonthlyIndexChangePercent: citywide?.monthlyIndexChangePercent,
    citywideYearOverYearMonthlyIndexChangePercent: citywide?.yearOverYearMonthlyIndexChangePercent,
    citywideStandardTotalPriceTenThousandNtd: citywide?.standardTotalPriceTenThousandNtd,
    citywideStandardUnitPriceTenThousandNtdPerPing: citywide?.standardUnitPriceTenThousandNtdPerPing,
  };
  await writeJson('public/data/real-price-summary.json', realEstateSummary);
} catch {
  // Existing summary is optional for running this converter in isolation.
}

console.log('residential price monthly index summary built');
