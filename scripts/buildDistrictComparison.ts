import { readFile } from 'node:fs/promises';
import { buildDistrictComparisonSummary, writeJson } from './data.ts';
import type {
  PopulationDistrictSummary,
  QuarterlyMarketRecord,
  RealEstateSummary,
} from '../src/models.ts';

const [realEstate, population, quarterly] = await Promise.all([
  readFile('public/data/real-price-summary.json', 'utf8').then((value) => JSON.parse(value) as RealEstateSummary),
  readFile('public/data/population-district-summary.json', 'utf8').then((value) => JSON.parse(value) as PopulationDistrictSummary[]),
  readFile('public/data/quarterly-market-analysis.json', 'utf8').then((value) => JSON.parse(value) as QuarterlyMarketRecord[]),
]);

await writeJson(
  'public/data/district-comparison-summary.json',
  buildDistrictComparisonSummary(realEstate.byDistrict, population, quarterly),
);
console.log('district comparison built');
