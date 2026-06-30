import { readFile } from 'node:fs/promises';
import type { IncomePerEarnerByDistrictYearRecord } from '../src/models.ts';
import { writeJson } from './data.ts';
import { buildIncomePerEarnerSummary } from './convertIncomePerEarnerByDistrictYear.ts';

export async function buildIncomePerEarnerSummaryFile() {
  const records = JSON.parse(await readFile('public/data/income-per-earner-by-district-year-records.json', 'utf8')) as IncomePerEarnerByDistrictYearRecord[];
  const summary = buildIncomePerEarnerSummary(records);
  const latest = records.filter((record) => record.dataYear === summary.latestYear);
  await writeJson('public/data/income-per-earner-by-district-year-summary.json', summary);
  await writeJson('public/data/income-per-earner-by-district-year-latest.json', latest);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await buildIncomePerEarnerSummaryFile();
  console.log(`income per earner summary: ${summary.totalRecords} records`);
}
