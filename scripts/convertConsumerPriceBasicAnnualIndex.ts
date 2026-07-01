import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { ConsumerPriceBasicAnnualIndexRecord, ConsumerPriceBasicAnnualIndexSummary, ConsumerPriceClassificationGroup, ConsumerPriceClassificationLevel, RealEstateSummary } from '../src/models.ts';
import { getColumn, listCsvFiles, parseNumber, percentChange, readCsv, updateConversionReport, writeJson, type CsvRow } from './data.ts';

const directory = 'data/raw/consumer-price-basic-annual-index';
const source = '臺北市消費者物價指數基本分類年指數';
const sourceAgency = '臺北市政府主計處';
const sourceUrl = 'https://data.taipei/dataset/detail?id=7ee57050-4d27-482c-bae5-ebd15ca86702';
const module = 'consumer_price_basic_annual_index' as const;

const semanticKeys: Record<string, string> = {
  總指數: 'total_index',
  食物類: 'food',
  衣著類: 'clothing',
  居住類: 'housing',
  交通及通訊類: 'transport_communication',
  醫藥保健類: 'healthcare',
  教養娛樂類: 'education_recreation',
  雜項類: 'miscellaneous',
  房租: 'rent',
  住宅維修費: 'housing_repair',
  水電燃氣: 'utilities_energy',
  外食費: 'food_away_from_home',
  油料費: 'fuel',
  醫療費用: 'medical_services',
};

const mainOrder: Record<string, number> = {
  total_index: 0,
  food: 10,
  clothing: 20,
  housing: 30,
  transport_communication: 40,
  healthcare: 50,
  education_recreation: 60,
  miscellaneous: 70,
};

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return !text || ['-', '--', 'nan', 'null'].includes(text.toLowerCase()) ? undefined : text;
}

export function parseRocYear(raw: unknown) {
  const yearRaw = cleanText(raw);
  const value = Number(yearRaw?.match(/\d+/)?.[0]);
  if (!Number.isFinite(value)) return { yearRaw };
  return value < 1911 ? { yearRaw, rocYear: value, year: value + 1911 } : { yearRaw, year: value };
}

export function parseAnnualChangePercent(raw: unknown) {
  const annualChangeRaw = cleanText(raw);
  return { annualChangeRaw, annualChangePercent: parseNumber(annualChangeRaw?.replace('%', '')) };
}

function semanticLabel(raw: string): string {
  return raw
    .replace(/^[一二三四五六七八九十]+[.．]/, '')
    .replace(/^\([一二三四五六七八九十]+\)/, '')
    .trim();
}

function fallbackKey(label: string): string {
  return `cpi_${createHash('sha1').update(label).digest('hex').slice(0, 8)}`;
}

function classificationKey(raw: string): string {
  const semantic = semanticLabel(raw);
  return semanticKeys[semantic] ?? fallbackKey(semantic || raw);
}

export function classifyConsumerPriceLevel(raw: unknown): ConsumerPriceClassificationLevel {
  const text = cleanText(raw) ?? '';
  if (text === '總指數') return 'total';
  if (/^[一二三四五六七八九十]+[.．]/.test(text)) return 'main_category';
  if (/^\([一二三四五六七八九十]+\)/.test(text)) return 'sub_category';
  return text ? 'sub_category' : 'unknown';
}

export function classifyConsumerPriceGroup(raw: unknown): ConsumerPriceClassificationGroup {
  const text = semanticLabel(cleanText(raw) ?? '');
  if (text === '總指數') return 'total';
  if (/食物|外食|穀類|肉類|水產|蔬菜|水果|蛋類|乳類|飲料|調味/.test(text)) return 'food';
  if (/衣著|成衣|鞋|服飾/.test(text)) return 'clothing';
  if (/居住|房租|住宅|水電|燃氣|家庭設備|修繕/.test(text)) return 'housing';
  if (/交通|通訊|油料|運輸|電話|網路/.test(text)) return 'transport_communication';
  if (/醫藥|醫療|保健/.test(text)) return 'healthcare';
  if (/教養|娛樂|教育|書報|旅遊|休閒/.test(text)) return 'education_recreation';
  if (/雜項|理容|個人照顧/.test(text)) return 'miscellaneous';
  return text ? 'other' : 'unknown';
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T;
}

export function makeConsumerPriceBasicAnnualIndexRecord(row: CsvRow, sourceResourceName: string, index: number, warnings: string[]): ConsumerPriceBasicAnnualIndexRecord | undefined {
  const year = parseRocYear(getColumn(row, ['年別']));
  if (!year.year) {
    warnings.push(`Unable to parse CPI year in ${sourceResourceName} row ${index}`);
    return undefined;
  }
  const basicClassificationRaw = cleanText(getColumn(row, ['基本分類'])) ?? '';
  const semanticClassificationLabel = semanticLabel(basicClassificationRaw);
  const key = classificationKey(basicClassificationRaw);
  const level = classifyConsumerPriceLevel(basicClassificationRaw);
  const group = classifyConsumerPriceGroup(basicClassificationRaw);
  const annualChange = parseAnnualChangePercent(getColumn(row, ['年增率[%]', '年增率']));
  const indexValue = parseNumber(getColumn(row, ['原始值[統計數值]', '原始值']));
  return compact({
    id: `${year.year}|${key}|${index}`,
    module,
    source,
    sourceAgency,
    sourceResourceName,
    sourceRecordHash: createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 12),
    cityCodeRaw: cleanText(getColumn(row, ['縣市別代碼'])),
    cityCode: cleanText(getColumn(row, ['縣市別代碼']))?.replace(/\D/g, ''),
    isTaipeiCity: cleanText(getColumn(row, ['縣市別代碼']))?.replace(/\D/g, '') === '63000',
    yearRaw: year.yearRaw,
    rocYear: year.rocYear,
    year: year.year,
    basicClassificationRaw,
    basicClassificationLabel: basicClassificationRaw,
    semanticClassificationLabel,
    classificationKey: key,
    classificationGroup: group,
    classificationLevel: level,
    classificationSortOrder: mainOrder[key] ?? 100 + index,
    indexValue,
    ...annualChange,
    isTotalIndex: level === 'total',
    isMainCategory: level === 'main_category',
    isHousingRelated: group === 'housing',
    isFoodRelated: group === 'food',
    isTransportRelated: group === 'transport_communication',
    isHealthcareRelated: group === 'healthcare',
    indexBaseNote: key === 'total_index' && indexValue === 100 ? 'Uploaded source shows total index 100.00 in 2021; treated as source-defined base.' : undefined,
  } satisfies ConsumerPriceBasicAnnualIndexRecord);
}

export function buildConsumerPriceBasicAnnualIndexSummary(records: ConsumerPriceBasicAnnualIndexRecord[]): ConsumerPriceBasicAnnualIndexSummary {
  const years = [...new Set(records.map((record) => record.year))].sort((a, b) => a - b);
  const latestYear = years.at(-1);
  const latest = records.filter((record) => record.year === latestYear);
  const byYear = years.map((year) => {
    const items = records.filter((record) => record.year === year);
    const byKey = new Map(items.map((record) => [record.classificationKey, record]));
    return {
      year,
      totalIndex: byKey.get('total_index')?.indexValue,
      totalAnnualChangePercent: byKey.get('total_index')?.annualChangePercent,
      housingIndex: byKey.get('housing')?.indexValue,
      rentIndex: byKey.get('rent')?.indexValue,
      foodIndex: byKey.get('food')?.indexValue,
      transportCommunicationIndex: byKey.get('transport_communication')?.indexValue,
    };
  });
  const latestTotal = latest.find((record) => record.classificationKey === 'total_index');
  const latestHousing = latest.find((record) => record.classificationKey === 'housing');
  return {
    totalRecords: records.length,
    minYear: years[0],
    maxYear: latestYear,
    latestYear,
    classificationCount: new Set(records.map((record) => record.basicClassificationLabel)).size,
    semanticClassificationKeyCount: new Set(records.map((record) => record.classificationKey)).size,
    mainCategoryCount: new Set(records.filter((record) => record.isMainCategory).map((record) => record.classificationKey)).size,
    latestTotalIndex: latestTotal?.indexValue,
    latestTotalAnnualChangePercent: latestTotal?.annualChangePercent,
    latestHousingIndex: latestHousing?.indexValue,
    latestHousingAnnualChangePercent: latestHousing?.annualChangePercent,
    baseYearCandidate: records.find((record) => record.classificationKey === 'total_index' && record.indexValue === 100)?.year,
    byYear,
    latestMainCategories: latest.filter((record) => record.isMainCategory).sort((a, b) => a.classificationSortOrder - b.classificationSortOrder).map((record) => ({
      classificationKey: record.classificationKey,
      basicClassificationLabel: record.basicClassificationLabel,
      semanticClassificationLabel: record.semanticClassificationLabel,
      classificationGroup: record.classificationGroup,
      indexValue: record.indexValue,
      annualChangePercent: record.annualChangePercent,
      yearOverYearIndexDelta: record.yearOverYearIndexDelta,
    })),
    byClassificationGroup: [...new Set(records.map((record) => record.classificationGroup))].sort().map((classificationGroup) => {
      const items = records.filter((record) => record.classificationGroup === classificationGroup);
      const latestItem = items.filter((record) => record.year === latestYear).sort((a, b) => a.classificationSortOrder - b.classificationSortOrder)[0];
      return { classificationGroup, recordCount: items.length, latestIndex: latestItem?.indexValue, latestAnnualChangePercent: latestItem?.annualChangePercent };
    }),
    highestLatestAnnualChangeCategories: latest.filter((record) => record.annualChangePercent !== undefined).sort((a, b) => (b.annualChangePercent ?? -Infinity) - (a.annualChangePercent ?? -Infinity)).slice(0, 8).map((record) => ({
      classificationKey: record.classificationKey,
      semanticClassificationLabel: record.semanticClassificationLabel,
      classificationGroup: record.classificationGroup,
      indexValue: record.indexValue,
      annualChangePercent: record.annualChangePercent,
    })),
  };
}

export function convertConsumerPriceBasicAnnualIndexRows(rows: CsvRow[], sourceResourceName = 'inline.csv', warnings: string[] = []) {
  const records = rows.map((row, index) => makeConsumerPriceBasicAnnualIndexRecord(row, sourceResourceName, index + 1, warnings)).filter(Boolean) as ConsumerPriceBasicAnnualIndexRecord[];
  const seen = new Map<string, ConsumerPriceBasicAnnualIndexRecord>();
  for (const record of records) {
    const key = `${record.year}|${record.classificationKey}`;
    if (seen.has(key)) warnings.push(`Duplicate annual CPI row skipped: ${key}`);
    else seen.set(key, record);
  }
  const deduped = [...seen.values()];
  for (const key of new Set(deduped.map((record) => record.classificationKey))) {
    const items = deduped.filter((record) => record.classificationKey === key).sort((a, b) => a.year - b.year);
    items.forEach((record, index) => {
      const previous = items[index - 1];
      record.yearOverYearIndexDelta = record.indexValue !== undefined && previous?.indexValue !== undefined ? Number((record.indexValue - previous.indexValue).toFixed(2)) : undefined;
    });
  }
  for (const year of new Set(deduped.map((record) => record.year))) {
    let parent: string | undefined;
    for (const record of deduped.filter((item) => item.year === year)) {
      if (record.isMainCategory) parent = record.classificationKey;
      if (record.classificationLevel === 'sub_category') record.parentClassificationKey = parent;
    }
  }
  return deduped.sort((a, b) => a.year - b.year || a.classificationSortOrder - b.classificationSortOrder || a.semanticClassificationLabel.localeCompare(b.semanticClassificationLabel, 'zh-Hant'));
}

async function updateRealEstateSummary(summary: ConsumerPriceBasicAnnualIndexSummary) {
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
    // Optional when this converter is run before the main real-estate summary exists.
  }
}

export async function convertConsumerPriceBasicAnnualIndex() {
  const files = await listCsvFiles(directory);
  const warnings: string[] = [];
  const records = (await Promise.all(files.map(async (file) => convertConsumerPriceBasicAnnualIndexRows(await readCsv(file), basename(file), warnings)))).flat();
  const summary = buildConsumerPriceBasicAnnualIndexSummary(records);
  const latest = records.filter((record) => record.year === summary.latestYear);
  await writeJson('public/data/consumer-price-basic-annual-index.json', records);
  await writeJson('public/data/consumer-price-basic-annual-index-summary.json', summary);
  await writeJson('public/data/consumer-price-basic-annual-index-latest.json', latest);
  await updateRealEstateSummary(summary);
  await updateConversionReport({
    dataset: source,
    file: files[0] ?? directory,
    sourceUrl,
    status: files.length ? 'converted' : 'missing',
    notes: [
      `${records.length} normalized annual CPI records`,
      `${summary.minYear}-${summary.maxYear}`,
      'Big5/CP950 CSV decoded via shared CSV reader.',
      'ROC years converted to Gregorian years; classification keys use semantic labels instead of ordinal prefixes.',
      'City-level annual CPI context only; not personal inflation, realtime prices, housing/rent forecasts, purchasing ability, investment, mortgage, policy, or financial advice.',
    ],
  }, warnings);
  return { records, summary, latest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { records, summary } = await convertConsumerPriceBasicAnnualIndex();
  console.log(`annual CPI records: ${records.length}; latest year: ${summary.latestYear}`);
}
