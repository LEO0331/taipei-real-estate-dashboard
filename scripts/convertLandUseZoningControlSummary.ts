import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { DISTRICTS, type DevelopmentIntensityCategory, type LandUseZoningCategory, type LandUseZoningControlRecord, type LandUseZoningControlSummary, type RealEstateSummary } from '../src/models.ts';
import { getColumn, listCsvFiles, readCsv, SQM_PER_PING, updateConversionReport, writeJson, type CsvRow } from './data.ts';

const directory = 'data/raw/land-use-zoning-control-summary';
const source = '臺北市土地使用內容與使用管制彙整表';
const sourceAgency = '臺北市政府都市發展局';
const sourceUrl = 'https://data.taipei/dataset/detail?id=d61ca24b-7b2b-4e75-8004-c568902e6300';
const module = 'land_use_zoning_control_summary' as const;

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return !text || ['-', '--', 'nan', 'null', '尚無資料'].includes(text.toLowerCase()) ? undefined : text;
}

export function classifyLandUseZoningCategory(raw: string | undefined): LandUseZoningCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('住宅')) return 'residential';
  if (text.includes('商業')) return 'commercial';
  if (text.includes('工業') || text.includes('產業')) return 'industrial';
  if (text.includes('機關')) return 'administrative_public_institution';
  if (/國小|國中|高中|大學|學校|文教/.test(text)) return 'school_education';
  if (/公園|綠地|廣場|保護區/.test(text)) return 'park_green_open_space';
  if (/交通|道路|捷運|鐵路/.test(text)) return 'transportation';
  if (text.includes('停車')) return 'parking';
  if (text.includes('市場')) return 'market';
  if (/變電|電信|瓦斯|自來水|污水|抽水|環保/.test(text)) return 'utility_infrastructure';
  if (/河川|水|防洪/.test(text)) return 'river_water';
  if (/社會福利|宗教|文化|殯葬/.test(text)) return 'cultural_religious_social_welfare';
  if (/醫療|醫院/.test(text)) return 'medical';
  if (text.includes('農業')) return 'agriculture';
  if (/特定|特專|\(特\)|（特）/.test(text)) return 'special_district';
  if (text.includes('用地')) return 'public_facility';
  return 'other';
}

export function classifyDevelopmentIntensity(farPercent: number | undefined): DevelopmentIntensityCategory {
  if (farPercent === undefined || !Number.isFinite(farPercent) || farPercent <= 0) return 'no_ratio_or_not_applicable';
  if (farPercent < 120) return 'very_low';
  if (farPercent < 225) return 'low';
  if (farPercent < 400) return 'medium';
  if (farPercent < 630) return 'high';
  return 'very_high';
}

export function parseTaipeiDistrictName(raw: unknown) {
  const districtName = cleanText(raw);
  const districtNameNormalized = districtName?.replace(/台/g, '臺').replace(/^臺北市/, '');
  const isTaipeiDistrict = Boolean(districtNameNormalized && DISTRICTS.includes(districtNameNormalized as never));
  return { districtName, districtNameNormalized, isTaipeiDistrict, warning: districtName && !isTaipeiDistrict ? `Unknown Taipei district: ${districtName}` : undefined };
}

export function parseZoningName(raw: unknown) {
  const zoningName = cleanText(raw);
  const zoningNameNormalized = zoningName?.replace(/\s+/g, ' ');
  const zoningCategory = classifyLandUseZoningCategory(zoningNameNormalized);
  return { zoningName, zoningNameNormalized, zoningCategory, warning: zoningName && zoningCategory === 'unknown' ? `Unknown zoning category: ${zoningName}` : undefined };
}

export function parseNumberField(raw: unknown, fieldName: string) {
  const text = cleanText(raw);
  if (!text) return {};
  const value = Number(text.replace(/[,，\s]/g, ''));
  return Number.isFinite(value) ? { value } : { warning: `Invalid ${fieldName}: ${text}` };
}

export function parseLandUseRecordCount(raw: unknown): { recordCount?: number; warning?: string } {
  const parsed = parseNumberField(raw, 'record count');
  if (parsed.value === undefined) return parsed;
  return Number.isInteger(parsed.value) && parsed.value >= 0 ? { recordCount: parsed.value } : { warning: `Invalid record count: ${parsed.value}` };
}

export function parsePercentRatio(raw: unknown, fieldName: string) {
  const parsed = parseNumberField(raw, fieldName);
  if (parsed.value === undefined) return { hasValue: false, warning: parsed.warning };
  const warning = parsed.value < 0 ? `Negative ${fieldName}: ${parsed.value}` : fieldName.includes('建蔽') && parsed.value > 100 ? `Suspicious ${fieldName}: ${parsed.value}` : fieldName.includes('容積') && parsed.value > 1500 ? `Suspicious ${fieldName}: ${parsed.value}` : undefined;
  return { percent: parsed.value, decimal: parsed.value / 100, hasValue: true, warning };
}

export function parseAreaSquareMeters(raw: unknown) {
  const parsed = parseNumberField(raw, 'area square meters');
  if (parsed.value === undefined) return { warning: parsed.warning };
  return parsed.value >= 0 ? { areaSquareMeters: parsed.value, areaHectares: parsed.value / 10_000, areaPing: parsed.value / SQM_PER_PING } : { warning: `Invalid area square meters: ${parsed.value}` };
}

const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T;
const sum = <T>(items: T[], pick: (item: T) => number | undefined) => items.reduce((total, item) => total + (pick(item) ?? 0), 0);
const avg = (values: Array<number | undefined>) => {
  const nums = values.filter((value): value is number => value !== undefined);
  return nums.length ? sum(nums, (value) => value) / nums.length : undefined;
};
const share = (value: number | undefined, total: number | undefined) => value === undefined || total === undefined || total === 0 ? undefined : value / total;

function makeRecord(row: CsvRow, sourceResourceName: string, index: number, warnings: string[]): LandUseZoningControlRecord | undefined {
  const district = parseTaipeiDistrictName(getColumn(row, ['行政區']));
  const zoning = parseZoningName(getColumn(row, ['分區']));
  const count = parseLandUseRecordCount(getColumn(row, ['筆數']));
  const bcr = parsePercentRatio(getColumn(row, ['建蔽率/百分比']), '建蔽率/百分比');
  const far = parsePercentRatio(getColumn(row, ['容積率上限/百分比']), '容積率上限/百分比');
  const area = parseAreaSquareMeters(getColumn(row, ['面積/平方公尺']));
  for (const warning of [district.warning, zoning.warning, count.warning, bcr.warning, far.warning, area.warning].filter(Boolean)) warnings.push(`${warning} in ${sourceResourceName} row ${index}`);
  if (!district.districtName || !zoning.zoningName || count.recordCount === undefined || area.areaSquareMeters === undefined) return undefined;
  const isPublicFacilityZoning = !['residential', 'commercial', 'industrial', 'other'].includes(zoning.zoningCategory);
  return compact({
    id: `land-use-zoning-control-${district.districtNameNormalized}-${zoning.zoningNameNormalized}`,
    module,
    districtName: district.districtName,
    districtNameNormalized: district.districtNameNormalized,
    isTaipeiDistrict: district.isTaipeiDistrict,
    zoningName: zoning.zoningName,
    zoningNameNormalized: zoning.zoningNameNormalized,
    zoningCategory: zoning.zoningCategory,
    zoningUseFamily: zoning.zoningCategory,
    recordCount: count.recordCount,
    isResidentialZoning: zoning.zoningCategory === 'residential',
    isCommercialZoning: zoning.zoningCategory === 'commercial',
    isIndustrialZoning: zoning.zoningCategory === 'industrial',
    isPublicFacilityZoning,
    isTransportationZoning: zoning.zoningCategory === 'transportation',
    isOpenSpaceOrGreenZoning: zoning.zoningCategory === 'park_green_open_space',
    isRiverOrWaterZoning: zoning.zoningCategory === 'river_water',
    buildingCoverageRatioPercent: bcr.percent,
    buildingCoverageRatioDecimal: bcr.decimal,
    hasBuildingCoverageRatio: bcr.hasValue,
    floorAreaRatioUpperLimitPercent: far.percent,
    floorAreaRatioUpperLimitDecimal: far.decimal,
    hasFloorAreaRatioUpperLimit: far.hasValue,
    areaSquareMeters: area.areaSquareMeters,
    areaHectares: area.areaHectares,
    areaPing: area.areaPing,
    developmentIntensityCategory: classifyDevelopmentIntensity(far.percent),
    estimatedMaxFloorAreaSquareMeters: far.decimal === undefined ? undefined : area.areaSquareMeters * far.decimal,
    estimatedMaxFloorAreaHectares: far.decimal === undefined ? undefined : area.areaSquareMeters * far.decimal / 10_000,
    estimatedMaxFloorAreaPing: far.decimal === undefined ? undefined : area.areaSquareMeters * far.decimal / SQM_PER_PING,
    estimatedBuildingFootprintLimitSquareMeters: bcr.decimal === undefined ? undefined : area.areaSquareMeters * bcr.decimal,
    estimatedBuildingFootprintLimitHectares: bcr.decimal === undefined ? undefined : area.areaSquareMeters * bcr.decimal / 10_000,
    estimatedBuildingFootprintLimitPing: bcr.decimal === undefined ? undefined : area.areaSquareMeters * bcr.decimal / SQM_PER_PING,
    sourceRecordHash: createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 12),
    source,
    sourceAgency,
  } satisfies LandUseZoningControlRecord);
}

export function addLandUseZoningDerivedFields(records: LandUseZoningControlRecord[]) {
  const cityArea = sum(records, (record) => record.areaSquareMeters);
  for (const districtName of new Set(records.map((record) => record.districtName))) {
    const items = records.filter((record) => record.districtName === districtName);
    const districtArea = sum(items, (record) => record.areaSquareMeters);
    const districtRecordCount = sum(items, (record) => record.recordCount);
    items.forEach((record) => {
      record.areaShareWithinDistrict = share(record.areaSquareMeters, districtArea);
      record.areaShareCitywide = share(record.areaSquareMeters, cityArea);
      record.recordCountShareWithinDistrict = share(record.recordCount, districtRecordCount);
    });
  }
  return records;
}

export function convertLandUseZoningControlRows(rows: CsvRow[], sourceResourceName = 'inline.csv', warnings: string[] = []) {
  const seen = new Set<string>();
  const records: LandUseZoningControlRecord[] = [];
  rows.forEach((row, index) => {
    const record = makeRecord(row, sourceResourceName, index + 1, warnings);
    if (!record) return;
    const key = `${record.districtNameNormalized}|${record.zoningNameNormalized}`;
    if (seen.has(key)) warnings.push(`Duplicate land-use district-zoning key preserved: ${key}`);
    seen.add(key);
    records.push(record);
  });
  return addLandUseZoningDerivedFields(records);
}

function summarizeGroup<T extends string>(records: LandUseZoningControlRecord[], key: (record: LandUseZoningControlRecord) => T) {
  return [...new Set(records.map(key))].map((groupKey) => {
    const items = records.filter((record) => key(record) === groupKey);
    return { groupKey, items };
  });
}

export function buildLandUseZoningControlSummary(records: LandUseZoningControlRecord[]): LandUseZoningControlSummary {
  const totalAreaSquareMeters = sum(records, (record) => record.areaSquareMeters);
  const bcrs = records.map((record) => record.buildingCoverageRatioPercent).filter((value): value is number => value !== undefined);
  const fars = records.map((record) => record.floorAreaRatioUpperLimitPercent).filter((value): value is number => value !== undefined);
  const byDistrict = summarizeGroup(records, (record) => record.districtName).map(({ groupKey, items }) => {
    const itemBcrs = items.map((record) => record.buildingCoverageRatioPercent).filter((value): value is number => value !== undefined);
    const itemFars = items.map((record) => record.floorAreaRatioUpperLimitPercent).filter((value): value is number => value !== undefined);
    return {
      districtName: groupKey,
      recordRows: items.length,
      sourceRecordCount: sum(items, (record) => record.recordCount),
      uniqueZoningNameCount: new Set(items.map((record) => record.zoningName)).size,
      totalAreaSquareMeters: sum(items, (record) => record.areaSquareMeters),
      totalAreaHectares: sum(items, (record) => record.areaSquareMeters) / 10_000,
      citywideAreaShare: share(sum(items, (record) => record.areaSquareMeters), totalAreaSquareMeters) ?? 0,
      averageBuildingCoverageRatioPercent: avg(itemBcrs),
      averageFloorAreaRatioUpperLimitPercent: avg(itemFars),
      maxBuildingCoverageRatioPercent: itemBcrs.length ? Math.max(...itemBcrs) : undefined,
      maxFloorAreaRatioUpperLimitPercent: itemFars.length ? Math.max(...itemFars) : undefined,
      recordsWithBuildingCoverageRatio: items.filter((record) => record.hasBuildingCoverageRatio).length,
      recordsWithFloorAreaRatioUpperLimit: items.filter((record) => record.hasFloorAreaRatioUpperLimit).length,
    };
  }).sort((a, b) => b.totalAreaSquareMeters - a.totalAreaSquareMeters);
  const byZoningCategory = summarizeGroup(records, (record) => record.zoningCategory).map(({ groupKey, items }) => ({
    zoningCategory: groupKey,
    recordRows: items.length,
    sourceRecordCount: sum(items, (record) => record.recordCount),
    districtCount: new Set(items.map((record) => record.districtName)).size,
    uniqueZoningNameCount: new Set(items.map((record) => record.zoningName)).size,
    totalAreaSquareMeters: sum(items, (record) => record.areaSquareMeters),
    totalAreaHectares: sum(items, (record) => record.areaSquareMeters) / 10_000,
    citywideAreaShare: share(sum(items, (record) => record.areaSquareMeters), totalAreaSquareMeters) ?? 0,
    averageBuildingCoverageRatioPercent: avg(items.map((record) => record.buildingCoverageRatioPercent)),
    averageFloorAreaRatioUpperLimitPercent: avg(items.map((record) => record.floorAreaRatioUpperLimitPercent)),
  })).sort((a, b) => b.totalAreaSquareMeters - a.totalAreaSquareMeters);
  const byDevelopmentIntensityCategory = summarizeGroup(records, (record) => record.developmentIntensityCategory).map(({ groupKey, items }) => ({ developmentIntensityCategory: groupKey, recordRows: items.length, totalAreaSquareMeters: sum(items, (record) => record.areaSquareMeters), citywideAreaShare: share(sum(items, (record) => record.areaSquareMeters), totalAreaSquareMeters) ?? 0 })).sort((a, b) => b.totalAreaSquareMeters - a.totalAreaSquareMeters);
  const topZoningNamesByArea = summarizeGroup(records, (record) => record.zoningName).map(({ groupKey, items }) => ({ zoningName: groupKey, zoningCategory: items[0].zoningCategory, totalAreaSquareMeters: sum(items, (record) => record.areaSquareMeters), districtCount: new Set(items.map((record) => record.districtName)).size, sourceRecordCount: sum(items, (record) => record.recordCount) })).sort((a, b) => b.totalAreaSquareMeters - a.totalAreaSquareMeters).slice(0, 20);
  const duplicateDistrictZoningKeyCount = records.length - new Set(records.map((record) => `${record.districtNameNormalized}|${record.zoningNameNormalized}`)).size;
  const publicFacilityOpenSpaceArea = sum(records.filter((record) => record.isPublicFacilityZoning || record.isOpenSpaceOrGreenZoning), (record) => record.areaSquareMeters);
  return {
    totalRecords: records.length,
    districtCount: new Set(records.map((record) => record.districtName)).size,
    uniqueZoningNameCount: new Set(records.map((record) => record.zoningName)).size,
    totalSourceRecordCount: sum(records, (record) => record.recordCount),
    totalAreaSquareMeters,
    totalAreaHectares: totalAreaSquareMeters / 10_000,
    totalAreaPing: totalAreaSquareMeters / SQM_PER_PING,
    recordsWithBuildingCoverageRatio: records.filter((record) => record.hasBuildingCoverageRatio).length,
    recordsWithoutBuildingCoverageRatio: records.filter((record) => !record.hasBuildingCoverageRatio).length,
    recordsWithFloorAreaRatioUpperLimit: records.filter((record) => record.hasFloorAreaRatioUpperLimit).length,
    recordsWithoutFloorAreaRatioUpperLimit: records.filter((record) => !record.hasFloorAreaRatioUpperLimit).length,
    minBuildingCoverageRatioPercent: bcrs.length ? Math.min(...bcrs) : undefined,
    maxBuildingCoverageRatioPercent: bcrs.length ? Math.max(...bcrs) : undefined,
    averageBuildingCoverageRatioPercent: avg(bcrs),
    minFloorAreaRatioUpperLimitPercent: fars.length ? Math.min(...fars) : undefined,
    maxFloorAreaRatioUpperLimitPercent: fars.length ? Math.max(...fars) : undefined,
    averageFloorAreaRatioUpperLimitPercent: avg(fars),
    totalEstimatedMaxFloorAreaSquareMeters: sum(records, (record) => record.estimatedMaxFloorAreaSquareMeters),
    totalEstimatedBuildingFootprintLimitSquareMeters: sum(records, (record) => record.estimatedBuildingFootprintLimitSquareMeters),
    largestZoningCategoryByArea: byZoningCategory[0]?.zoningCategory,
    largestDistrictByArea: byDistrict[0]?.districtName,
    highestAverageFarDistrict: [...byDistrict].sort((a, b) => (b.averageFloorAreaRatioUpperLimitPercent ?? -1) - (a.averageFloorAreaRatioUpperLimitPercent ?? -1))[0]?.districtName,
    highestAverageBcrDistrict: [...byDistrict].sort((a, b) => (b.averageBuildingCoverageRatioPercent ?? -1) - (a.averageBuildingCoverageRatioPercent ?? -1))[0]?.districtName,
    publicFacilityOpenSpaceAreaShare: share(publicFacilityOpenSpaceArea, totalAreaSquareMeters),
    byDistrict,
    byZoningCategory,
    byDevelopmentIntensityCategory,
    topZoningNamesByArea,
    topDistrictZoningCombinationsByArea: [...records].sort((a, b) => b.areaSquareMeters - a.areaSquareMeters).slice(0, 20).map((record) => ({ districtName: record.districtName, zoningName: record.zoningName, zoningCategory: record.zoningCategory, areaSquareMeters: record.areaSquareMeters, areaShareWithinDistrict: record.areaShareWithinDistrict, buildingCoverageRatioPercent: record.buildingCoverageRatioPercent, floorAreaRatioUpperLimitPercent: record.floorAreaRatioUpperLimitPercent })),
    dataQuality: { missingDistrictCount: 0, unknownDistrictCount: records.filter((record) => !record.isTaipeiDistrict).length, missingZoningNameCount: 0, missingRecordCountCount: 0, invalidRecordCountCount: 0, missingBuildingCoverageRatioCount: records.filter((record) => !record.hasBuildingCoverageRatio).length, invalidBuildingCoverageRatioCount: 0, missingFloorAreaRatioUpperLimitCount: records.filter((record) => !record.hasFloorAreaRatioUpperLimit).length, invalidFloorAreaRatioUpperLimitCount: 0, missingAreaCount: 0, invalidAreaCount: 0, duplicateDistrictZoningKeyCount, zeroAreaCount: records.filter((record) => record.areaSquareMeters === 0).length, zeroBuildingCoverageRatioCount: records.filter((record) => record.buildingCoverageRatioPercent === 0).length, zeroFloorAreaRatioCount: records.filter((record) => record.floorAreaRatioUpperLimitPercent === 0).length },
  };
}

async function updateRealEstateSummary(summary: LandUseZoningControlSummary) {
  try {
    const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
    realEstate.landUseZoningControlSummary = { totalRecords: summary.totalRecords, districtCount: summary.districtCount, uniqueZoningNameCount: summary.uniqueZoningNameCount, totalAreaSquareMeters: summary.totalAreaSquareMeters, maxFloorAreaRatioUpperLimitPercent: summary.maxFloorAreaRatioUpperLimitPercent, maxBuildingCoverageRatioPercent: summary.maxBuildingCoverageRatioPercent, largestZoningCategoryByArea: summary.largestZoningCategoryByArea, largestDistrictByArea: summary.largestDistrictByArea };
    await writeJson('public/data/real-price-summary.json', realEstate);
  } catch {
    // Optional when run before the main real-estate summary exists.
  }
}

export async function convertLandUseZoningControlSummary() {
  const files = await listCsvFiles(directory);
  const warnings: string[] = [];
  const records = (await Promise.all(files.map(async (file) => convertLandUseZoningControlRows(await readCsv(file), basename(file), warnings)))).flat().sort((a, b) => a.districtName.localeCompare(b.districtName) || b.areaSquareMeters - a.areaSquareMeters);
  const summary = buildLandUseZoningControlSummary(records);
  await writeJson('public/data/land-use-zoning-control-summary.json', records);
  await writeJson('public/data/land-use-zoning-control-summary-stats.json', summary);
  await updateRealEstateSummary(summary);
  await updateConversionReport({ dataset: source, file: files[0] ?? directory, sourceUrl, status: files.length ? 'converted' : 'missing', notes: [`${records.length} land-use zoning rows`, `${summary.districtCount} districts`, 'UTF-8-SIG CSV supported via shared reader with Big5 fallback.', 'District and zoning-level summary only; no parcel lookup, geocoding, zoning boundaries, development-right guarantees, legal advice, or investment advice.'] }, warnings);
  return { records, summary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { records, summary } = await convertLandUseZoningControlSummary();
  console.log(`Land-use zoning records: ${records.length}; districts: ${summary.districtCount}`);
}
