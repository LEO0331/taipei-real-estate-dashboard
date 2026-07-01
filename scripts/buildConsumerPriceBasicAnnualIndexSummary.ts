import { readFile } from 'node:fs/promises';
import type { ConsumerPriceBasicAnnualIndexRecord, RealEstateSummary } from '../src/models.ts';
import { writeJson } from './data.ts';
import { buildConsumerPriceBasicAnnualIndexSummary } from './convertConsumerPriceBasicAnnualIndex.ts';

export async function buildConsumerPriceBasicAnnualIndexSummaryFile() {
  const records = JSON.parse(await readFile('public/data/consumer-price-basic-annual-index.json', 'utf8')) as ConsumerPriceBasicAnnualIndexRecord[];
  const summary = buildConsumerPriceBasicAnnualIndexSummary(records);
  const latest = records.filter((record) => record.year === summary.latestYear);
  await writeJson('public/data/consumer-price-basic-annual-index-summary.json', summary);
  await writeJson('public/data/consumer-price-basic-annual-index-latest.json', latest);
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.consumerPriceBasicAnnualIndex = {
      latestYear: summary.latestYear,
      latestTotalIndex: summary.latestTotalIndex,
      latestTotalAnnualChangePercent: summary.latestTotalAnnualChangePercent,
      latestHousingIndex: summary.latestHousingIndex,
      latestHousingAnnualChangePercent: summary.latestHousingAnnualChangePercent,
    };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when this builder runs before the main summary exists.
  }
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await buildConsumerPriceBasicAnnualIndexSummaryFile();
  console.log(`annual CPI summary: ${summary.totalRecords} records`);
}
