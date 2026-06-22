import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import {
  DISTRICTS,
  type BuildingType,
  type District,
  type DistrictComparisonSummary,
  type DistrictRealEstateSummary,
  type MonthlyRealEstateSummary,
  type PopulationDistrictSummary,
  type QuarterlyMarketRecord,
  type RealEstateSummary,
  type RealPriceRecord,
  type RealPriceRecordType,
} from '../src/models.ts';

export type CsvRow = Record<string, string>;
export type ParsedDate = {
  date?: string;
  year?: number;
  month?: number;
  quarter?: string;
  warning?: string;
};

export type ConversionReport = {
  generatedAt: string;
  sources: Array<{
    dataset: string;
    file: string;
    bytes?: number;
    sourceUrl?: string;
    downloadedAt?: string;
    status: 'converted' | 'available' | 'missing' | 'failed';
    notes?: string[];
  }>;
  warnings: string[];
};

export const SQM_PER_PING = 3.305785;

export function normalizeColumnName(raw: string): string {
  return raw.replace(/^\uFEFF/, '').trim().replace(/[\s_（）()/-]+/g, '').toLowerCase();
}

export function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    rows.push(row);
  }

  const [header = [], ...body] = rows;
  const keys = header.map((key) => key.replace(/^\uFEFF/, '').trim());
  return body
    .filter((values) => values.some(Boolean))
    .map((values) => Object.fromEntries(keys.map((key, index) => [key, values[index] ?? ''])));
}

export async function readCsv(path: string): Promise<CsvRow[]> {
  const bytes = await readFile(path);
  const utf8 = new TextDecoder('utf-8', { fatal: true });
  let text: string;
  try {
    text = utf8.decode(bytes);
  } catch {
    text = new TextDecoder('big5').decode(bytes);
  }
  return parseCsv(text);
}

export function getColumn(row: CsvRow, aliases: string[]): string | undefined {
  const entries = new Map(Object.entries(row).map(([key, value]) => [normalizeColumnName(key), value.trim()]));
  for (const alias of aliases) {
    const value = entries.get(normalizeColumnName(alias));
    if (value) return value;
  }
  return undefined;
}

export function normalizeDistrict(raw: string | undefined): District | undefined {
  if (!raw) return undefined;
  const normalized = raw.replace(/臺北市|台北市|\d+/g, '').replace(/\s/g, '');
  return DISTRICTS.find((district) => normalized.includes(district) || normalized.includes(district.slice(0, -1)));
}

export function parseNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const cleaned = String(raw).trim().replace(/[,，\s]/g, '').replace(/^(NT\$|NTD|\$)/i, '');
  if (!cleaned || cleaned === '-' || cleaned === '--') return undefined;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

export const parsePriceNtd = parseNumber;
export const parseAreaSqm = parseNumber;
export const sqmToPing = (sqm: number): number => sqm / SQM_PER_PING;

export function parseTaiwanDate(raw: string | undefined): ParsedDate {
  if (!raw?.trim()) return {};
  const value = raw.trim();
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;

  if (/^\d{7}$/.test(value)) {
    year = Number(value.slice(0, 3)) + 1911;
    month = Number(value.slice(3, 5));
    day = Number(value.slice(5, 7));
  } else if (/^\d{8}$/.test(value)) {
    year = Number(value.slice(0, 4));
    month = Number(value.slice(4, 6));
    day = Number(value.slice(6, 8));
  } else if (numbers.length >= 2) {
    [year, month, day] = numbers;
    if (year < 1911) year += 1911;
  }

  if (!year || !month || month < 1 || month > 12 || (day !== undefined && (day < 1 || day > 31))) {
    return { warning: `Unable to parse date: ${value}` };
  }
  const paddedMonth = String(month).padStart(2, '0');
  const date = day
    ? `${year}-${paddedMonth}-${String(day).padStart(2, '0')}`
    : `${year}-${paddedMonth}`;
  return { date, year, month, quarter: `${year}-Q${Math.ceil(month / 3)}` };
}

export function classifyBuildingType(raw: string | undefined): BuildingType {
  if (!raw?.trim()) return 'unknown';
  if (raw.includes('公寓')) return 'apartment';
  if (/華廈|住宅大樓|大樓|電梯/.test(raw)) return 'elevator_building';
  if (raw.includes('透天')) return 'house';
  if (raw.includes('辦公')) return 'office';
  if (/店面|商業/.test(raw)) return 'shop';
  if (raw.includes('工廠')) return 'factory';
  if (raw.includes('車位')) return 'parking';
  if (raw.includes('土地')) return 'land';
  return 'other';
}

export function classifyRealPriceRecordType(raw: string | undefined): RealPriceRecordType {
  if (!raw?.trim()) return 'unknown';
  if (raw.includes('預售')) return 'pre_sale';
  if (/租賃|租/.test(raw)) return 'rent';
  if (raw.includes('買賣')) return 'sale';
  return 'unknown';
}

const age = (row: CsvRow, value: number): number =>
  parseNumber(getColumn(row, [`${value}歲數量`, `${value}歲`])) ?? 0;

function sumAgeBand(row: CsvRow, start: number, end: number): number {
  let sum = 0;
  for (let value = start; value <= end; value += 1) sum += age(row, value);
  return sum;
}

export function aggregatePopulationRows(rows: CsvRow[]): PopulationDistrictSummary[] {
  const grouped = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const area = getColumn(row, ['區域別', '行政區', 'area']);
    const district = normalizeDistrict(area);
    const rocYear = parseNumber(getColumn(row, ['年份', '年', 'year']));
    const month = parseNumber(getColumn(row, ['月份', '月', 'month']));
    const code = getColumn(row, ['區域代碼', 'area code', 'code']);
    const exactDistrict = area?.replace(/臺北市|台北市|\s/g, '') === district;
    if (!district || !rocYear || !month || (!exactDistrict && code?.length !== 8)) continue;
    const key = `${rocYear}-${month}-${district}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  const summaries: PopulationDistrictSummary[] = [];
  for (const [key, group] of grouped) {
    const [, , district] = key.split('-') as [string, string, District];
    const totalSexRows = group.filter((row) => /^(計|合計|總計)$/.test(getColumn(row, ['性別', 'sex']) ?? ''));
    const selected = totalSexRows.length ? totalSexRows : group;
    if (!selected.length) continue;

    const sum = (selector: (row: CsvRow) => number) => selected.reduce((total, row) => total + selector(row), 0);
    const totalPopulation = sum((row) => parseNumber(getColumn(row, ['總計', '總人口', 'total'])) ?? 0);
    const age0To14 = sum((row) => sumAgeBand(row, 0, 14));
    const age15To19 = sum((row) => sumAgeBand(row, 15, 19));
    const age20To34 = sum((row) => sumAgeBand(row, 20, 34));
    const age35To44 = sum((row) => sumAgeBand(row, 35, 44));
    const age45To64 = sum((row) => sumAgeBand(row, 45, 64));
    const age65Plus = sum((row) => sumAgeBand(row, 65, 99) + (parseNumber(getColumn(row, ['100歲以上'])) ?? 0));
    const [rocYear, month] = key.split('-').map(Number);
    const workingAge = age20To34 + age35To44 + age45To64;
    const age15To64 = age15To19 + workingAge;

    summaries.push({
      id: `${rocYear + 1911}-${String(month).padStart(2, '0')}-${district}`,
      year: rocYear < 1911 ? rocYear + 1911 : rocYear,
      month,
      district,
      totalPopulation,
      age0To14,
      age15To19,
      age20To34,
      age35To44,
      age45To64,
      age65Plus,
      youthShare: totalPopulation ? age0To14 / totalPopulation : 0,
      workingAgeShare: totalPopulation ? workingAge / totalPopulation : 0,
      seniorShare: totalPopulation ? age65Plus / totalPopulation : 0,
      dependencyRatio: age15To64 ? (age0To14 + age65Plus) / age15To64 : undefined,
      source: '臺北市各里人口數按年齡分',
    });
  }
  return summaries.sort((a, b) => a.year - b.year || a.month - b.month || a.district.localeCompare(b.district, 'zh-Hant'));
}

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function average(values: number[]): number | undefined {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

export function percentile(values: number[], p: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

const compact = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== '')) as T;

export function convertRealPriceRows(rows: CsvRow[], warnings: string[] = []): RealPriceRecord[] {
  return rows.map((row, index) => {
    const recordTypeRaw = getColumn(row, ['CASE_T', '交易類型', '案件類型']);
    const recordType = classifyRealPriceRecordType(recordTypeRaw);
    const districtRaw = getColumn(row, ['DISTRICT', '鄉鎮市區', '行政區']);
    const district = normalizeDistrict(districtRaw);
    if (districtRaw && !district) warnings.push(`Unknown district: ${districtRaw}`);
    const transactionDateRaw = getColumn(row, ['SDATE', '交易年月日', '交易日期']);
    const parsedDate = parseTaiwanDate(transactionDateRaw);
    if (parsedDate.warning) warnings.push(parsedDate.warning);
    const buildingTypeRaw = getColumn(row, ['BUITYPE', '建物型態', '建物類型']);
    const buildingAreaPing = parseNumber(getColumn(row, ['FAREA', '建物移轉總面積坪', '建物面積坪']));
    const landAreaPing = parseNumber(getColumn(row, ['LANDA', '土地移轉總面積坪', '土地面積坪']));
    const parkingAreaPing = parseNumber(getColumn(row, ['PAREA', '車位移轉總面積坪', '車位面積坪']));
    const totalWan = parseNumber(getColumn(row, ['TPRICE', '總價萬元', '總價']));
    const unitRaw = parseNumber(getColumn(row, ['UPRICE', '單價萬元坪', '單價']));
    const parkingWan = parseNumber(getColumn(row, ['PPRICE', '車位總價萬元', '車位總價']));
    const completionDateRaw = getColumn(row, ['FDATE', '建築完成年月', '完成日期']);
    const completion = parseTaiwanDate(completionDateRaw);
    const buildingAgeYears = parsedDate.year && completion.year
      ? Math.max(0, parsedDate.year - completion.year)
      : undefined;
    const unitPricePerPingNtd = unitRaw === undefined
      ? undefined
      : recordType === 'rent' ? unitRaw : unitRaw * 10_000;
    const totalPriceNtd = totalWan === undefined ? undefined : totalWan * 10_000;
    const rentPriceNtd = recordType === 'rent'
      ? unitRaw && buildingAreaPing ? Math.round(unitRaw * buildingAreaPing) : totalPriceNtd
      : undefined;

    return compact({
      id: `weekly-${index + 1}`,
      district,
      recordType,
      transactionTargetRaw: getColumn(row, ['TRANS_TARGET', 'CASE_F', '交易標的']),
      locationText: getColumn(row, ['LOCATION', '土地位置建物門牌', '位置']),
      transactionDateRaw,
      transactionYear: parsedDate.year,
      transactionMonth: parsedDate.month,
      transactionQuarter: parsedDate.quarter,
      buildingTypeRaw,
      buildingType: classifyBuildingType(buildingTypeRaw),
      mainUse: getColumn(row, ['PBUILD', '主要用途']),
      mainMaterial: getColumn(row, ['MBUILD', '主要建材']),
      completionDateRaw,
      buildingAgeYears,
      landAreaSqm: landAreaPing === undefined ? undefined : landAreaPing * SQM_PER_PING,
      buildingAreaSqm: buildingAreaPing === undefined ? undefined : buildingAreaPing * SQM_PER_PING,
      buildingAreaPing,
      totalPriceNtd,
      unitPricePerSqmNtd: unitPricePerPingNtd === undefined ? undefined : unitPricePerPingNtd / SQM_PER_PING,
      unitPricePerPingNtd,
      parkingAreaSqm: parkingAreaPing === undefined ? undefined : parkingAreaPing * SQM_PER_PING,
      parkingPriceNtd: parkingWan === undefined ? undefined : parkingWan * 10_000,
      rentPriceNtd,
      remarks: getColumn(row, ['RMNOTE', '備註']),
      source: '臺北市實價周報',
    } satisfies RealPriceRecord);
  });
}

export function convertQuarterlyRows(
  rows: CsvRow[],
  year: number,
  quarter: number,
  warnings: string[] = [],
): QuarterlyMarketRecord[] {
  return rows.flatMap((row, index) => {
    const raw = getColumn(row, ['行政區', 'DISTRICT']);
    if (!raw || raw === '全市') return [];
    const district = normalizeDistrict(raw);
    if (!district) {
      warnings.push(`Unknown quarterly district: ${raw}`);
      return [];
    }
    return [compact({
      id: `${year}-Q${quarter}-${district}-${index}`,
      year,
      quarter,
      quarterLabel: `${year}-Q${quarter}`,
      district,
      totalSaleCaseCount: parseNumber(getColumn(row, ['提供查詢之買賣實價案件數_件', '買賣實價案件數'])),
      residentialZoneCaseCount: parseNumber(getColumn(row, ['住宅區房地買賣實價案件數_件', '住宅區案件數'])),
      commercialZoneCaseCount: parseNumber(getColumn(row, ['商業區房地買賣實價案件數_件', '商業區案件數'])),
      industrialZoneCaseCount: parseNumber(getColumn(row, ['工業區房地買賣實價案件數_件', '工業區案件數'])),
      analysisText: getColumn(row, ['實價登錄動態分析', '分析']),
      source: '臺北市實價登錄每季動態分析',
    } satisfies QuarterlyMarketRecord)];
  });
}

export function aggregateRealPriceByDistrict(records: RealPriceRecord[]): DistrictRealEstateSummary[] {
  return DISTRICTS.map((district) => {
    const items = records.filter((record) => record.district === district);
    const sales = items.filter((item) => item.recordType === 'sale' || item.recordType === 'pre_sale');
    const numbers = (source: RealPriceRecord[], key: keyof RealPriceRecord) =>
      source.map((record) => record[key]).filter((value): value is number => typeof value === 'number' && value > 0);
    const counts = new Map<BuildingType, number>();
    for (const item of items) counts.set(item.buildingType, (counts.get(item.buildingType) ?? 0) + 1);
    return compact({
      district,
      transactionCount: items.length,
      saleCount: sales.length,
      rentCount: items.filter((item) => item.recordType === 'rent').length,
      medianTotalPriceNtd: median(numbers(sales, 'totalPriceNtd')),
      averageTotalPriceNtd: average(numbers(sales, 'totalPriceNtd')),
      medianUnitPricePerPingNtd: median(numbers(sales, 'unitPricePerPingNtd')),
      averageUnitPricePerPingNtd: average(numbers(sales, 'unitPricePerPingNtd')),
      medianBuildingAreaPing: median(numbers(items, 'buildingAreaPing')),
      medianBuildingAgeYears: median(numbers(items, 'buildingAgeYears')),
      byBuildingType: [...counts].map(([buildingType, count]) => ({ buildingType, count })).sort((a, b) => b.count - a.count),
    } satisfies DistrictRealEstateSummary);
  });
}

export function aggregateRealPriceByMonth(records: RealPriceRecord[]): MonthlyRealEstateSummary[] {
  const grouped = new Map<string, RealPriceRecord[]>();
  for (const record of records) {
    if (!record.transactionYear || !record.transactionMonth) continue;
    const period = `${record.transactionYear}-${String(record.transactionMonth).padStart(2, '0')}`;
    grouped.set(period, [...(grouped.get(period) ?? []), record]);
  }
  return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([period, items]) => ({
    period,
    transactionCount: items.length,
    saleCount: items.filter((item) => item.recordType === 'sale' || item.recordType === 'pre_sale').length,
    rentCount: items.filter((item) => item.recordType === 'rent').length,
    medianUnitPricePerPingNtd: median(items
      .filter((item) => item.recordType === 'sale' || item.recordType === 'pre_sale')
      .map((item) => item.unitPricePerPingNtd)
      .filter((value): value is number => !!value)),
  }));
}

function bands(values: number[], limits: number[], labels: string[]): Array<{ label: string; count: number }> {
  return labels.map((label, index) => ({
    label,
    count: values.filter((value) => value >= (limits[index - 1] ?? 0) && value < (limits[index] ?? Infinity)).length,
  }));
}

export function buildRealEstateSummary(records: RealPriceRecord[]): RealEstateSummary {
  const byDistrict = aggregateRealPriceByDistrict(records);
  const typeCounts = new Map<BuildingType, number>();
  for (const record of records) typeCounts.set(record.buildingType, (typeCounts.get(record.buildingType) ?? 0) + 1);
  const byBuildingType = [...typeCounts].map(([buildingType, count]) => ({ buildingType, count })).sort((a, b) => b.count - a.count);
  const sales = records.filter((record) => record.recordType === 'sale' || record.recordType === 'pre_sale');
  const prices = sales.map((record) => record.totalPriceNtd).filter((value): value is number => !!value && value > 0);
  const unitPrices = sales
    .map((record) => record.unitPricePerPingNtd)
    .filter((value): value is number => !!value && value > 0);
  const latestDataPeriod = records
    .map((record) => record.transactionYear && record.transactionMonth
      ? `${record.transactionYear}-${String(record.transactionMonth).padStart(2, '0')}`
      : undefined)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1);
  return compact({
    latestDataPeriod,
    totalRecords: records.length,
    saleRecordCount: records.filter((record) => record.recordType === 'sale' || record.recordType === 'pre_sale').length,
    rentalRecordCount: records.filter((record) => record.recordType === 'rent').length,
    medianUnitPricePerPingNtd: median(unitPrices),
    medianTotalPriceNtd: median(prices),
    mostActiveDistrict: [...byDistrict].sort((a, b) => b.transactionCount - a.transactionCount)[0]?.district,
    highestMedianUnitPriceDistrict: [...byDistrict].sort((a, b) => (b.medianUnitPricePerPingNtd ?? 0) - (a.medianUnitPricePerPingNtd ?? 0))[0]?.district,
    mostCommonBuildingType: byBuildingType[0]?.buildingType,
    byDistrict,
    byMonth: aggregateRealPriceByMonth(records),
    byBuildingType,
    totalPriceBands: bands(prices, [10_000_000, 20_000_000, 40_000_000, 80_000_000], ['<1,000萬', '1,000–2,000萬', '2,000–4,000萬', '4,000–8,000萬', '8,000萬+']),
    unitPriceBands: bands(unitPrices, [500_000, 800_000, 1_200_000, 1_800_000], ['<50萬', '50–80萬', '80–120萬', '120–180萬', '180萬+']),
  } satisfies RealEstateSummary);
}

export function buildDistrictComparisonSummary(
  realEstateSummaries: DistrictRealEstateSummary[],
  populationSummaries: PopulationDistrictSummary[],
  quarterlyRecords: QuarterlyMarketRecord[],
): DistrictComparisonSummary[] {
  const latestPopulation = [...populationSummaries]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .reduce((map, item) => map.has(item.district) ? map : map.set(item.district, item), new Map<District, PopulationDistrictSummary>());
  const latestQuarterly = [...quarterlyRecords]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.quarter ?? 0) - (a.quarter ?? 0))
    .reduce((map, item) => map.has(item.district) ? map : map.set(item.district, item), new Map<District, QuarterlyMarketRecord>());

  return DISTRICTS.map((district) => {
    const realEstate = realEstateSummaries.find((item) => item.district === district);
    const population = latestPopulation.get(district);
    const quarterly = latestQuarterly.get(district);
    const denominator = population?.totalPopulation;
    return compact({
      district,
      realEstate,
      population,
      quarterly,
      transactionsPer1000Residents: denominator && realEstate ? realEstate.transactionCount / denominator * 1000 : undefined,
      salesPer1000Residents: denominator && realEstate ? realEstate.saleCount / denominator * 1000 : undefined,
      medianUnitPricePerPingNtd: realEstate?.medianUnitPricePerPingNtd,
      seniorShare: population?.seniorShare,
      workingAgeShare: population?.workingAgeShare,
      youthShare: population?.youthShare,
      dependencyRatio: population?.dependencyRatio,
    } satisfies DistrictComparisonSummary);
  });
}

export async function listCsvFiles(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory))
      .filter((file) => file.toLowerCase().endsWith('.csv'))
      .sort()
      .map((file) => join(directory, file));
  } catch {
    return [];
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`);
}

export async function updateConversionReport(
  source: ConversionReport['sources'][number],
  warnings: string[] = [],
): Promise<void> {
  const path = 'public/data/conversion-report.json';
  let report: ConversionReport = { generatedAt: new Date().toISOString(), sources: [], warnings: [] };
  try {
    report = JSON.parse(await readFile(path, 'utf8')) as ConversionReport;
  } catch {
    // First converter creates the report.
  }
  const bytes = source.file ? await stat(source.file).then((value) => value.size).catch(() => undefined) : undefined;
  report.generatedAt = new Date().toISOString();
  const previous = report.sources.find((item) => item.dataset === source.dataset);
  report.sources = [
    ...report.sources.filter((item) => item.dataset !== source.dataset),
    { ...previous, ...source, file: basename(source.file), bytes },
  ];
  report.warnings = [...new Set([...report.warnings, ...warnings])].slice(0, 200);
  await writeJson(path, report);
}
