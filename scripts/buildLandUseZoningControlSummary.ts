import { readFile } from 'node:fs/promises';
import type { LandUseZoningControlRecord, RealEstateSummary } from '../src/models.ts';
import { writeJson } from './data.ts';
import { buildLandUseZoningControlSummary } from './convertLandUseZoningControlSummary.ts';

export async function buildLandUseZoningControlSummaryFile() {
  const records = JSON.parse(await readFile('public/data/land-use-zoning-control-summary.json', 'utf8')) as LandUseZoningControlRecord[];
  const summary = buildLandUseZoningControlSummary(records);
  await writeJson('public/data/land-use-zoning-control-summary-stats.json', summary);
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.landUseZoningControlSummary = { totalRecords: summary.totalRecords, districtCount: summary.districtCount, uniqueZoningNameCount: summary.uniqueZoningNameCount, totalAreaSquareMeters: summary.totalAreaSquareMeters, maxFloorAreaRatioUpperLimitPercent: summary.maxFloorAreaRatioUpperLimitPercent, maxBuildingCoverageRatioPercent: summary.maxBuildingCoverageRatioPercent, largestZoningCategoryByArea: summary.largestZoningCategoryByArea, largestDistrictByArea: summary.largestDistrictByArea };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when run before the main real-estate summary exists.
  }
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await buildLandUseZoningControlSummaryFile();
  console.log(`Land-use zoning summary rebuilt: ${summary.totalRecords} records`);
}
