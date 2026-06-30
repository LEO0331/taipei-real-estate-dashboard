import {
  buildResidentialPriceQuarterlyIndexSummary,
  convertResidentialPriceQuarterlyIndexRows,
  listCsvFiles,
  readCsv,
  updateConversionReport,
  writeJson,
} from './data.ts';

const files = await listCsvFiles('data/raw/residential-price-quarterly-index');
const warnings: string[] = [];
const records = files.length ? convertResidentialPriceQuarterlyIndexRows(await readCsv(files.at(-1)!), warnings) : [];
const summary = buildResidentialPriceQuarterlyIndexSummary(records);
const latest = records.filter((record) => record.quarterKey === summary.latestQuarterKey);

await writeJson('public/data/residential-price-quarterly-index-records.json', records);
await writeJson('public/data/residential-price-quarterly-index-summary.json', summary);
await writeJson('public/data/residential-price-quarterly-index-latest.json', latest);
await updateConversionReport({
  dataset: '臺北市住宅價格季指數',
  file: files.at(-1) ?? 'data/raw/residential-price-quarterly-index',
  status: files.length ? 'converted' : 'missing',
  sourceUrl: 'https://data.taipei/dataset/detail?id=954911b5-896d-4ae1-9ebe-87c4ba8a191e',
  notes: [
    `${records.length} normalized records`,
    'UTF-8-SIG CSV is decoded with Big5/CP950 fallback.',
    'Category aliases supported: 住宅價格季指數類別 and 宅價格季指數類別.',
    'ROC quarters are converted to Gregorian quarter keys.',
    'Percent columns remain percentage-point values, not decimal ratios.',
    'District rankings exclude citywide and housing-type rows; stable ordinal ranking is used.',
    'Residential price trend context only; not appraisal, transaction price, advice, mortgage guidance, or prediction.',
  ],
}, warnings);

console.log(`residential price quarterly index records: ${records.length}`);
