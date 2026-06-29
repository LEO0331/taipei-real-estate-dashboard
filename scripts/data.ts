import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import {
  DISTRICTS,
  type BuildingType,
  type CommercialOfficeRentIndexCategory,
  type CommercialOfficeRentIndexRecord,
  type CommercialOfficeRentIndexSummary,
  type District,
  type DistrictComparisonSummary,
  type DistrictRealEstateSummary,
  type MonthlyRealEstateSummary,
  type PopulationDistrictSummary,
  type QuarterlyMarketRecord,
  type ResidentialRentIndexCategory,
  type ResidentialRentIndexRecord,
  type ResidentialRentIndexSummary,
  type ResidentialPriceIndexCategory,
  type ResidentialPriceMonthlyIndexRecord,
  type ResidentialPriceMonthlyIndexSummary,
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
export type ParsedRentIndexPeriod = {
  periodRaw?: string;
  rocYear?: number;
  year?: number;
  quarter?: number;
  quarterKey?: string;
  warning?: string;
};
export type ParsedPriceIndexPeriod = {
  periodRaw?: string;
  period?: string;
  periodDate?: string;
  year?: number;
  month?: number;
  quarter?: string;
  warning?: string;
};
export type ParsedRocQuarter = {
  periodRaw?: string;
  period?: string;
  periodDate?: string;
  rocYear?: number;
  year?: number;
  quarter?: string;
  quarterNumber?: number;
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
export const parseNumericValue = parseNumber;
export const parseAreaSqm = parseNumber;
export const sqmToPing = (sqm: number): number => sqm / SQM_PER_PING;
export const tenThousandNtdToNtd = (value: number | undefined): number | undefined =>
  value === undefined ? undefined : value * 10_000;
export const ntdPerPingToNtdPerSqm = (value: number | undefined): number | undefined =>
  value === undefined ? undefined : value / SQM_PER_PING;

export function parsePercentValue(raw: unknown): number | undefined {
  return parseNumber(typeof raw === 'string' ? raw.replace('%', '') : raw);
}

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

export function classifyResidentialRentIndexCategory(raw: string | undefined): ResidentialRentIndexCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text === '全市') return 'citywide';
  if (text === '大樓') return 'elevator_building';
  if (text === '公寓') return 'apartment';
  return 'other';
}

export function classifyResidentialPriceIndexCategory(raw: string | undefined): ResidentialPriceIndexCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text === '全市') return 'citywide';
  if (text === '全市公寓') return 'citywide_apartment';
  if (text === '全市大樓') return 'citywide_building';
  if (text === '全市小宅') return 'citywide_small_unit';
  return 'other';
}

export function classifyCommercialOfficeRentIndexCategory(raw: string | undefined): CommercialOfficeRentIndexCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text === '全市') return 'citywide';
  if (text === '主要路段') return 'major_roads';
  return 'other';
}

const priceCategoryLabels: Record<ResidentialPriceIndexCategory, { zh: string; en: string }> = {
  citywide: { zh: '全市', en: 'Citywide' },
  citywide_apartment: { zh: '全市公寓', en: 'Citywide apartment' },
  citywide_building: { zh: '全市大樓', en: 'Citywide building' },
  citywide_small_unit: { zh: '全市小宅', en: 'Citywide small unit' },
  other: { zh: '其他', en: 'Other' },
  unknown: { zh: '未知', en: 'Unknown' },
};

const commercialRentCategoryLabels: Record<CommercialOfficeRentIndexCategory, { zh: string; en: string }> = {
  citywide: { zh: '全市', en: 'Citywide' },
  major_roads: { zh: '主要路段', en: 'Major roads' },
  other: { zh: '其他', en: 'Other' },
  unknown: { zh: '未知', en: 'Unknown' },
};

export function parseRentIndexPeriod(raw: unknown): ParsedRentIndexPeriod {
  const periodRaw = raw === null || raw === undefined ? undefined : String(raw).trim();
  if (!periodRaw) return {};
  const compactValue = periodRaw.replace(/\s/g, '').toUpperCase();
  const match = compactValue.match(/^(\d{3,4})(?:年)?(?:第)?Q?([1-4])(?:季)?$/)
    ?? compactValue.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return { periodRaw, warning: `Unable to parse rent index period: ${periodRaw}` };
  const parsedYear = Number(match[1]);
  const quarter = Number(match[2]);
  const rocYear = parsedYear < 1911 ? parsedYear : undefined;
  const year = rocYear ? rocYear + 1911 : parsedYear;
  return { periodRaw, rocYear, year, quarter, quarterKey: `${year}-Q${quarter}` };
}

export function parseRocYearMonth(raw: unknown): ParsedPriceIndexPeriod {
  const periodRaw = raw === null || raw === undefined ? undefined : String(raw).trim();
  if (!periodRaw) return {};
  const match = periodRaw.replace(/\s/g, '').match(/^(\d{2,4})\/(\d{1,2})$/);
  if (!match) return { periodRaw, warning: `Unable to parse residential price index period: ${periodRaw}` };
  const rocYear = Number(match[1]);
  const month = Number(match[2]);
  const year = rocYear < 1911 ? rocYear + 1911 : rocYear;
  if (month < 1 || month > 12) return { periodRaw, warning: `Invalid residential price index month: ${periodRaw}` };
  const period = `${year}-${String(month).padStart(2, '0')}`;
  return { periodRaw, period, periodDate: `${period}-01`, year, month, quarter: `${year}-Q${Math.ceil(month / 3)}` };
}

export function parseRocQuarter(raw: unknown): ParsedRocQuarter {
  const periodRaw = raw === null || raw === undefined ? undefined : String(raw).trim();
  if (!periodRaw) return {};
  const match = periodRaw.replace(/\s/g, '').toUpperCase().match(/^(\d{2,4})(?:年)?(?:第)?Q?([1-4])(?:季)?$/);
  if (!match) return { periodRaw, warning: `Unable to parse commercial office rent index period: ${periodRaw}` };
  const parsedYear = Number(match[1]);
  const quarterNumber = Number(match[2]);
  const rocYear = parsedYear < 1911 ? parsedYear : undefined;
  const year = rocYear ? rocYear + 1911 : parsedYear;
  const month = (quarterNumber - 1) * 3 + 1;
  const period = `${year}Q${quarterNumber}`;
  return { periodRaw, period, periodDate: `${year}-${String(month).padStart(2, '0')}-01`, rocYear, year, quarter: `${year}-Q${quarterNumber}`, quarterNumber };
}

export function percentChange(current: number | undefined, previous: number | undefined): number | undefined {
  if (current === undefined || previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
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

export function convertResidentialRentIndexRows(rows: CsvRow[], warnings: string[] = []): ResidentialRentIndexRecord[] {
  const records: ResidentialRentIndexRecord[] = [];
  const seen = new Map<string, ResidentialRentIndexRecord>();

  rows.forEach((row, index) => {
    const rentIndexCategoryRaw = getColumn(row, ['住宅租金指數類別']) ?? '';
    const period = parseRentIndexPeriod(getColumn(row, ['期別']));
    if (period.warning) warnings.push(period.warning);
    const key = `${rentIndexCategoryRaw.trim()}|${period.quarterKey ?? period.periodRaw ?? ''}`;
    const record = compact({
      id: `residential-rent-index-${index + 1}`,
      source: '臺北市住宅租金指數',
      sourceAgency: '臺北市政府地政局',
      rentIndexCategoryRaw,
      rentIndexCategory: classifyResidentialRentIndexCategory(rentIndexCategoryRaw),
      periodRaw: period.periodRaw ?? '',
      rocYear: period.rocYear,
      year: period.year,
      quarter: period.quarter,
      quarterKey: period.quarterKey,
      quarterlyRentIndex: parseNumericValue(getColumn(row, ['季指數'])),
      quarterlyChangeRatePercent: parseNumericValue(getColumn(row, ['季變動率'])),
      standardRentUnitPriceNtdPerPingMonthly: parseNumericValue(getColumn(row, ['標準租金單價（新台幣元每坪每月）', '標準租金單價新台幣元每坪每月'])),
    } satisfies ResidentialRentIndexRecord);
    if (seen.has(key)) {
      warnings.push(`Duplicate residential rent index row skipped: ${key}`);
      return;
    }
    seen.set(key, record);
    records.push(record);
  });

  const byCategory = new Map<ResidentialRentIndexCategory, ResidentialRentIndexRecord[]>();
  for (const record of records) {
    byCategory.set(record.rentIndexCategory, [...(byCategory.get(record.rentIndexCategory) ?? []), record]);
  }
  for (const group of byCategory.values()) {
    group.sort((a, b) => (a.quarterKey ?? '').localeCompare(b.quarterKey ?? ''));
    const byQuarter = new Map(group.map((record) => [record.quarterKey, record]));
    for (const record of group) {
      if (!record.year || !record.quarter || !record.quarterKey) continue;
      const previousQuarter = record.quarter === 1 ? `${record.year - 1}-Q4` : `${record.year}-Q${record.quarter - 1}`;
      const previousYear = `${record.year - 1}-Q${record.quarter}`;
      record.previousQuarterKey = byQuarter.has(previousQuarter) ? previousQuarter : undefined;
      record.previousYearSameQuarterKey = byQuarter.has(previousYear) ? previousYear : undefined;
      const sameQuarterLastYear = byQuarter.get(previousYear);
      record.yearOverYearRentIndexChangePercent = percentChange(record.quarterlyRentIndex, sameQuarterLastYear?.quarterlyRentIndex);
      record.yearOverYearStandardRentUnitPriceChangePercent = percentChange(record.standardRentUnitPriceNtdPerPingMonthly, sameQuarterLastYear?.standardRentUnitPriceNtdPerPingMonthly);
    }
  }
  return records.sort((a, b) =>
    (a.quarterKey ?? '').localeCompare(b.quarterKey ?? '') || a.rentIndexCategoryRaw.localeCompare(b.rentIndexCategoryRaw, 'zh-Hant'));
}

export function convertResidentialPriceMonthlyIndexRows(rows: CsvRow[], warnings: string[] = []): ResidentialPriceMonthlyIndexRecord[] {
  const records: ResidentialPriceMonthlyIndexRecord[] = [];
  const seen = new Map<string, ResidentialPriceMonthlyIndexRecord>();

  rows.forEach((row, index) => {
    const categoryRaw = getColumn(row, ['住宅價格月指數類別']) ?? '';
    const category = classifyResidentialPriceIndexCategory(categoryRaw);
    const labels = priceCategoryLabels[category];
    const period = parseRocYearMonth(getColumn(row, ['期別']));
    if (period.warning) warnings.push(period.warning);
    if (!period.period || !period.periodDate || !period.year || !period.month || !period.quarter) return;
    const standardTotalPriceTenThousandNtd = parseNumericValue(getColumn(row, ['標準住宅總價（新台幣萬元）', '標準住宅總價新台幣萬元']));
    const standardUnitPriceTenThousandNtdPerPing = parseNumericValue(getColumn(row, ['標準住宅單價（新台幣萬元每坪）', '標準住宅單價新台幣萬元每坪']));
    const standardUnitPriceNtdPerPing = tenThousandNtdToNtd(standardUnitPriceTenThousandNtdPerPing);
    const record = compact({
      id: `residential-price-monthly-index-${index + 1}`,
      source: '臺北市住宅價格月指數',
      sourceAgency: '臺北市政府地政局',
      categoryRaw,
      category,
      categoryLabelZh: labels.zh,
      categoryLabelEn: labels.en,
      periodRaw: period.periodRaw,
      period: period.period,
      periodDate: period.periodDate,
      year: period.year,
      month: period.month,
      quarter: period.quarter,
      monthlyIndex: parseNumericValue(getColumn(row, ['月指數'])),
      threeMonthMovingAverageIndex: parseNumericValue(getColumn(row, ['季移動平均數'])),
      sixMonthMovingAverageIndex: parseNumericValue(getColumn(row, ['半年移動平均數'])),
      monthlyIndexChangePercent: parsePercentValue(getColumn(row, ['月指數變動率(%)', '月指數變動率'])),
      threeMonthMovingAverageChangePercent: parsePercentValue(getColumn(row, ['季移動平均數變動率(%)', '季移動平均數變動率'])),
      sixMonthMovingAverageChangePercent: parsePercentValue(getColumn(row, ['半年移動平均數變動率(%)', '半年移動平均數變動率'])),
      standardTotalPriceTenThousandNtd,
      standardTotalPriceNtd: tenThousandNtdToNtd(standardTotalPriceTenThousandNtd),
      standardUnitPriceTenThousandNtdPerPing,
      standardUnitPriceNtdPerPing,
      standardUnitPriceNtdPerSqm: ntdPerPingToNtdPerSqm(standardUnitPriceNtdPerPing),
      isLatestPeriod: false,
    } satisfies ResidentialPriceMonthlyIndexRecord);
    const key = `${categoryRaw.trim()}|${period.periodRaw ?? period.period}`;
    if (seen.has(key)) {
      warnings.push(`Duplicate residential price monthly index row skipped: ${key}`);
      return;
    }
    seen.set(key, record);
    records.push(record);
  });

  const byCategory = new Map<ResidentialPriceIndexCategory, ResidentialPriceMonthlyIndexRecord[]>();
  for (const record of records) byCategory.set(record.category, [...(byCategory.get(record.category) ?? []), record]);
  for (const group of byCategory.values()) {
    group.sort((a, b) => a.period.localeCompare(b.period));
    const first = group.find((record) => record.monthlyIndex !== undefined);
    const byPeriod = new Map(group.map((record) => [record.period, record]));
    const latestPeriod = group.at(-1)?.period;
    for (const record of group) {
      const previousYear = `${record.year - 1}-${String(record.month).padStart(2, '0')}`;
      const sameMonthLastYear = byPeriod.get(previousYear);
      record.yearOverYearMonthlyIndexChangePercent = percentChange(record.monthlyIndex, sameMonthLastYear?.monthlyIndex);
      record.yearOverYearStandardUnitPriceChangePercent = percentChange(record.standardUnitPriceTenThousandNtdPerPing, sameMonthLastYear?.standardUnitPriceTenThousandNtdPerPing);
      record.indexFromStartChangePercent = percentChange(record.monthlyIndex, first?.monthlyIndex);
      record.isLatestPeriod = record.period === latestPeriod;
    }
  }
  return records.sort((a, b) => a.period.localeCompare(b.period) || a.categoryRaw!.localeCompare(b.categoryRaw!, 'zh-Hant'));
}

export function convertCommercialOfficeRentIndexRows(rows: CsvRow[], warnings: string[] = []): CommercialOfficeRentIndexRecord[] {
  const records: CommercialOfficeRentIndexRecord[] = [];
  const seen = new Map<string, CommercialOfficeRentIndexRecord>();

  rows.forEach((row, index) => {
    const categoryRaw = getColumn(row, ['商辦租金指數類別']) ?? '';
    const category = classifyCommercialOfficeRentIndexCategory(categoryRaw);
    const labels = commercialRentCategoryLabels[category];
    const period = parseRocQuarter(getColumn(row, ['期別']));
    if (period.warning) warnings.push(period.warning);
    if (!period.period || !period.periodDate || !period.year || !period.quarter || !period.quarterNumber) return;
    const standardRentNtdPerPingPerMonth = parseNumericValue(getColumn(row, ['標準租金單價（元/坪/月）', '標準租金單價元坪月']));
    const record = compact({
      id: `commercial-office-rent-index-${index + 1}`,
      source: '臺北市商辦租金指數',
      sourceAgency: '臺北市政府地政局',
      categoryRaw,
      category,
      categoryLabelZh: labels.zh,
      categoryLabelEn: labels.en,
      periodRaw: period.periodRaw,
      period: period.period,
      periodDate: period.periodDate,
      rocYear: period.rocYear,
      year: period.year,
      quarter: period.quarter,
      quarterNumber: period.quarterNumber,
      quarterlyIndex: parseNumericValue(getColumn(row, ['季指數'])),
      quarterlyChangePercent: parsePercentValue(getColumn(row, ['季變動率（%）', '季變動率(%)', '季變動率'])),
      standardRentNtdPerPingPerMonth,
      standardRentNtdPerSqmPerMonth: ntdPerPingToNtdPerSqm(standardRentNtdPerPingPerMonth),
      isLatestPeriod: false,
    } satisfies CommercialOfficeRentIndexRecord);
    const key = `${categoryRaw.trim()}|${period.periodRaw ?? period.period}`;
    if (seen.has(key)) {
      warnings.push(`Duplicate commercial office rent index row skipped: ${key}`);
      return;
    }
    seen.set(key, record);
    records.push(record);
  });

  const byCategory = new Map<CommercialOfficeRentIndexCategory, CommercialOfficeRentIndexRecord[]>();
  for (const record of records) byCategory.set(record.category, [...(byCategory.get(record.category) ?? []), record]);
  for (const group of byCategory.values()) {
    group.sort((a, b) => a.period.localeCompare(b.period));
    const first = group.find((record) => record.quarterlyIndex !== undefined);
    const byQuarter = new Map(group.map((record) => [record.quarter, record]));
    const latestPeriod = group.at(-1)?.period;
    for (const record of group) {
      const previousYear = `${record.year - 1}-Q${record.quarterNumber}`;
      const sameQuarterLastYear = byQuarter.get(previousYear);
      record.yearOverYearQuarterlyIndexChangePercent = percentChange(record.quarterlyIndex, sameQuarterLastYear?.quarterlyIndex);
      record.yearOverYearStandardRentChangePercent = percentChange(record.standardRentNtdPerPingPerMonth, sameQuarterLastYear?.standardRentNtdPerPingPerMonth);
      record.indexFromStartChangePercent = percentChange(record.quarterlyIndex, first?.quarterlyIndex);
      record.isLatestPeriod = record.period === latestPeriod;
    }
  }

  const byPeriod = new Map<string, CommercialOfficeRentIndexRecord[]>();
  for (const record of records) byPeriod.set(record.period, [...(byPeriod.get(record.period) ?? []), record]);
  for (const group of byPeriod.values()) {
    const citywide = group.find((record) => record.category === 'citywide')?.standardRentNtdPerPingPerMonth;
    const major = group.find((record) => record.category === 'major_roads')?.standardRentNtdPerPingPerMonth;
    const gap = citywide !== undefined && major !== undefined ? major - citywide : undefined;
    const gapPercent = percentChange(major, citywide);
    for (const record of group) {
      record.rentGapNtdPerPingPerMonth = gap;
      record.rentGapPercent = gapPercent;
    }
  }

  return records.sort((a, b) => a.period.localeCompare(b.period) || a.categoryRaw!.localeCompare(b.categoryRaw!, 'zh-Hant'));
}

export function buildResidentialRentIndexSummary(records: ResidentialRentIndexRecord[]): ResidentialRentIndexSummary {
  const quarterKeys = records.map((record) => record.quarterKey).filter((value): value is string => !!value).sort();
  const categories = [...new Set(records.map((record) => record.rentIndexCategory))];
  const latestQuarterKey = quarterKeys.at(-1);
  const latestByCategory = categories.flatMap((category) => {
    const latest = records
      .filter((record) => record.rentIndexCategory === category && record.quarterKey)
      .sort((a, b) => (b.quarterKey ?? '').localeCompare(a.quarterKey ?? ''))[0];
    return latest?.quarterKey ? [compact({
      rentIndexCategory: latest.rentIndexCategory,
      rentIndexCategoryRaw: latest.rentIndexCategoryRaw,
      quarterKey: latest.quarterKey,
      quarterlyRentIndex: latest.quarterlyRentIndex,
      quarterlyChangeRatePercent: latest.quarterlyChangeRatePercent,
      standardRentUnitPriceNtdPerPingMonthly: latest.standardRentUnitPriceNtdPerPingMonthly,
      yearOverYearRentIndexChangePercent: latest.yearOverYearRentIndexChangePercent,
      yearOverYearStandardRentUnitPriceChangePercent: latest.yearOverYearStandardRentUnitPriceChangePercent,
    })] : [];
  });

  const byCategory = categories.map((category) => {
    const group = records.filter((record) => record.rentIndexCategory === category && record.quarterKey)
      .sort((a, b) => (a.quarterKey ?? '').localeCompare(b.quarterKey ?? ''));
    const first = group[0];
    const latest = group.at(-1);
    return compact({
      rentIndexCategory: category,
      rentIndexCategoryRaw: latest?.rentIndexCategoryRaw ?? first?.rentIndexCategoryRaw ?? '',
      recordCount: group.length,
      minQuarterKey: first?.quarterKey,
      maxQuarterKey: latest?.quarterKey,
      firstRentIndex: first?.quarterlyRentIndex,
      latestRentIndex: latest?.quarterlyRentIndex,
      firstStandardRentUnitPrice: first?.standardRentUnitPriceNtdPerPingMonthly,
      latestStandardRentUnitPrice: latest?.standardRentUnitPriceNtdPerPingMonthly,
      rentIndexChangeSinceFirstPercent: percentChange(latest?.quarterlyRentIndex, first?.quarterlyRentIndex),
      standardRentUnitPriceChangeSinceFirstPercent: percentChange(latest?.standardRentUnitPriceNtdPerPingMonthly, first?.standardRentUnitPriceNtdPerPingMonthly),
    });
  });

  const byQuarter = [...new Set(quarterKeys)].map((quarterKey) => {
    const items = records.filter((record) => record.quarterKey === quarterKey);
    const byType = new Map(items.map((record) => [record.rentIndexCategory, record]));
    const [yearText, quarterText] = quarterKey.split('-Q');
    return compact({
      quarterKey,
      year: Number(yearText),
      quarter: Number(quarterText),
      citywideRentIndex: byType.get('citywide')?.quarterlyRentIndex,
      elevatorBuildingRentIndex: byType.get('elevator_building')?.quarterlyRentIndex,
      apartmentRentIndex: byType.get('apartment')?.quarterlyRentIndex,
      citywideStandardRentUnitPrice: byType.get('citywide')?.standardRentUnitPriceNtdPerPingMonthly,
      elevatorBuildingStandardRentUnitPrice: byType.get('elevator_building')?.standardRentUnitPriceNtdPerPingMonthly,
      apartmentStandardRentUnitPrice: byType.get('apartment')?.standardRentUnitPriceNtdPerPingMonthly,
    });
  });

  return compact({
    totalRecords: records.length,
    categoryCount: categories.length,
    minQuarterKey: quarterKeys[0],
    maxQuarterKey: quarterKeys.at(-1),
    latestQuarterKey,
    latestByCategory,
    byCategory,
    byQuarter,
  });
}

export function buildResidentialPriceMonthlyIndexSummary(records: ResidentialPriceMonthlyIndexRecord[]): ResidentialPriceMonthlyIndexSummary {
  const periods = [...new Set(records.map((record) => record.period))].sort();
  const categories = [...new Set(records.map((record) => record.category))];
  const latestByCategory = categories.flatMap((category) => {
    const latest = records.filter((record) => record.category === category).sort((a, b) => b.period.localeCompare(a.period))[0];
    return latest ? [compact({
      category: latest.category,
      categoryLabelZh: latest.categoryLabelZh,
      categoryLabelEn: latest.categoryLabelEn,
      period: latest.period,
      monthlyIndex: latest.monthlyIndex,
      monthlyIndexChangePercent: latest.monthlyIndexChangePercent,
      yearOverYearMonthlyIndexChangePercent: latest.yearOverYearMonthlyIndexChangePercent,
      threeMonthMovingAverageIndex: latest.threeMonthMovingAverageIndex,
      sixMonthMovingAverageIndex: latest.sixMonthMovingAverageIndex,
      standardTotalPriceTenThousandNtd: latest.standardTotalPriceTenThousandNtd,
      standardUnitPriceTenThousandNtdPerPing: latest.standardUnitPriceTenThousandNtdPerPing,
    })] : [];
  });
  return compact({
    totalRecords: records.length,
    categoryCount: categories.length,
    periodCount: periods.length,
    minPeriod: periods[0],
    maxPeriod: periods.at(-1),
    latestPeriod: periods.at(-1),
    latestByCategory,
    byCategory: categories.map((category) => {
      const group = records.filter((record) => record.category === category).sort((a, b) => a.period.localeCompare(b.period));
      const first = group[0];
      const latest = group.at(-1);
      return compact({
        category,
        categoryLabelZh: latest?.categoryLabelZh ?? first?.categoryLabelZh ?? category,
        categoryLabelEn: latest?.categoryLabelEn ?? first?.categoryLabelEn ?? category,
        recordCount: group.length,
        minPeriod: first?.period,
        maxPeriod: latest?.period,
        startMonthlyIndex: first?.monthlyIndex,
        latestMonthlyIndex: latest?.monthlyIndex,
        indexFromStartChangePercent: latest?.indexFromStartChangePercent,
        latestStandardTotalPriceTenThousandNtd: latest?.standardTotalPriceTenThousandNtd,
        latestStandardUnitPriceTenThousandNtdPerPing: latest?.standardUnitPriceTenThousandNtdPerPing,
      });
    }),
    byPeriod: periods.map((period) => {
      const items = records.filter((record) => record.period === period);
      const byType = new Map(items.map((record) => [record.category, record]));
      return compact({
        period,
        citywideMonthlyIndex: byType.get('citywide')?.monthlyIndex,
        citywideApartmentMonthlyIndex: byType.get('citywide_apartment')?.monthlyIndex,
        citywideBuildingMonthlyIndex: byType.get('citywide_building')?.monthlyIndex,
        citywideSmallUnitMonthlyIndex: byType.get('citywide_small_unit')?.monthlyIndex,
        citywideStandardUnitPriceTenThousandNtdPerPing: byType.get('citywide')?.standardUnitPriceTenThousandNtdPerPing,
      });
    }),
  });
}

export function buildCommercialOfficeRentIndexSummary(records: CommercialOfficeRentIndexRecord[]): CommercialOfficeRentIndexSummary {
  const periods = [...new Set(records.map((record) => record.period))].sort();
  const categories = [...new Set(records.map((record) => record.category))];
  const latestPeriod = periods.at(-1);
  const latestByCategory = categories.flatMap((category) => {
    const latest = records.filter((record) => record.category === category).sort((a, b) => b.period.localeCompare(a.period))[0];
    return latest ? [compact({
      category: latest.category,
      categoryLabelZh: latest.categoryLabelZh,
      categoryLabelEn: latest.categoryLabelEn,
      period: latest.period,
      quarterlyIndex: latest.quarterlyIndex,
      quarterlyChangePercent: latest.quarterlyChangePercent,
      yearOverYearQuarterlyIndexChangePercent: latest.yearOverYearQuarterlyIndexChangePercent,
      standardRentNtdPerPingPerMonth: latest.standardRentNtdPerPingPerMonth,
      standardRentNtdPerSqmPerMonth: latest.standardRentNtdPerSqmPerMonth,
      indexFromStartChangePercent: latest.indexFromStartChangePercent,
    })] : [];
  });
  const latestRows = latestPeriod ? records.filter((record) => record.period === latestPeriod) : [];
  const latestCitywide = latestRows.find((record) => record.category === 'citywide');
  const latestMajor = latestRows.find((record) => record.category === 'major_roads');
  return compact({
    totalRecords: records.length,
    categoryCount: categories.length,
    periodCount: periods.length,
    minPeriod: periods[0],
    maxPeriod: latestPeriod,
    latestPeriod,
    latestByCategory,
    latestMajorRoadPremium: latestPeriod ? compact({
      period: latestPeriod,
      citywideRentNtdPerPingPerMonth: latestCitywide?.standardRentNtdPerPingPerMonth,
      majorRoadRentNtdPerPingPerMonth: latestMajor?.standardRentNtdPerPingPerMonth,
      rentGapNtdPerPingPerMonth: latestMajor?.rentGapNtdPerPingPerMonth,
      rentGapPercent: latestMajor?.rentGapPercent,
    }) : undefined,
    byCategory: categories.map((category) => {
      const group = records.filter((record) => record.category === category).sort((a, b) => a.period.localeCompare(b.period));
      const first = group[0];
      const latest = group.at(-1);
      return compact({
        category,
        categoryLabelZh: latest?.categoryLabelZh ?? first?.categoryLabelZh ?? category,
        categoryLabelEn: latest?.categoryLabelEn ?? first?.categoryLabelEn ?? category,
        recordCount: group.length,
        minPeriod: first?.period,
        maxPeriod: latest?.period,
        startQuarterlyIndex: first?.quarterlyIndex,
        latestQuarterlyIndex: latest?.quarterlyIndex,
        indexFromStartChangePercent: latest?.indexFromStartChangePercent,
        latestStandardRentNtdPerPingPerMonth: latest?.standardRentNtdPerPingPerMonth,
        latestStandardRentNtdPerSqmPerMonth: latest?.standardRentNtdPerSqmPerMonth,
      });
    }),
    byPeriod: periods.map((period) => {
      const items = records.filter((record) => record.period === period);
      const byType = new Map(items.map((record) => [record.category, record]));
      return compact({
        period,
        citywideQuarterlyIndex: byType.get('citywide')?.quarterlyIndex,
        majorRoadQuarterlyIndex: byType.get('major_roads')?.quarterlyIndex,
        citywideStandardRentNtdPerPingPerMonth: byType.get('citywide')?.standardRentNtdPerPingPerMonth,
        majorRoadStandardRentNtdPerPingPerMonth: byType.get('major_roads')?.standardRentNtdPerPingPerMonth,
        rentGapNtdPerPingPerMonth: byType.get('major_roads')?.rentGapNtdPerPingPerMonth,
        rentGapPercent: byType.get('major_roads')?.rentGapPercent,
      });
    }),
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
