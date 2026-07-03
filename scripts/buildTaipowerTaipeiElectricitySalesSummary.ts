import { readFile } from 'node:fs/promises';
import type { RealEstateSummary, TaipowerTaipeiElectricitySalesRecord } from '../src/models.ts';
import { writeJson } from './data.ts';
import { buildTaipowerTaipeiElectricitySalesSummary } from './convertTaipowerTaipeiElectricitySales.ts';

export async function buildTaipowerTaipeiElectricitySalesSummaryFile() {
  const records = JSON.parse(await readFile('public/data/taipower-taipei-electricity-sales.json', 'utf8')) as TaipowerTaipeiElectricitySalesRecord[];
  const summary = buildTaipowerTaipeiElectricitySalesSummary(records);
  await writeJson('public/data/taipower-taipei-electricity-sales-summary.json', summary);
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.taipowerTaipeiElectricitySales = {
      latestYear: summary.latestRecord?.gregorianYear,
      latestTotalCustomerCount: summary.latestRecord?.totalCustomerCount,
      latestTotalElectricitySalesThousandKwh: summary.latestRecord?.totalElectricitySalesThousandKwh,
      latestTotalElectricityUsePerCustomerKwh: summary.latestRecord?.totalElectricityUsePerCustomerKwh,
      latestTotalElectricitySalesYearOverYearPercentChange: summary.latestRecord?.totalElectricitySalesYearOverYearPercentChange,
    };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when this builder runs before the main summary exists.
  }
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await buildTaipowerTaipeiElectricitySalesSummaryFile();
  console.log(`Taipower Taipei electricity summary: ${summary.totalRecords} records`);
}
