import { readFile } from 'node:fs/promises';
import type { LandValueTaxProgressiveBracketRecord, RealEstateSummary } from '../src/models.ts';
import { writeJson } from './data.ts';
import { buildLandValueTaxProgressiveBracketSummary } from './convertLandValueTaxProgressiveBrackets.ts';

export async function buildLandValueTaxProgressiveBracketSummaryFile() {
  const records = JSON.parse(await readFile('public/data/land-value-tax-progressive-brackets.json', 'utf8')) as LandValueTaxProgressiveBracketRecord[];
  const summary = buildLandValueTaxProgressiveBracketSummary(records);
  await writeJson('public/data/land-value-tax-progressive-bracket-summary.json', summary);
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.landValueTaxProgressiveBrackets = {
      latestYear: summary.latestRecord?.gregorianYear,
      latestProgressiveStartingPointLandValue: summary.latestRecord?.generalLandProgressiveStartingPointLandValue,
      latestGeneralLandHighestRatePermille: summary.latestRecord?.generalLandHighestRatePermille,
      latestGeneralLandTaxBracketCount: summary.latestRecord?.generalLandTaxBracketCount,
      latestYearOverYearProgressiveStartingPointPercentChange: summary.latestRecord?.yearOverYearProgressiveStartingPointPercentChange,
    };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when run before the main real-estate summary exists.
  }
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await buildLandValueTaxProgressiveBracketSummaryFile();
  console.log(`Land value tax bracket summary rebuilt: ${summary.totalRecords} records`);
}
