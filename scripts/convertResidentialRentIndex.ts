import { convertResidentialRentIndexRows, listCsvFiles, readCsv, updateConversionReport, writeJson } from './data.ts';

const files = await listCsvFiles('data/raw/residential-rent-index');
const warnings: string[] = [];
const records = files.length ? convertResidentialRentIndexRows(await readCsv(files.at(-1)!), warnings) : [];

await writeJson('public/data/residential-rent-index-records.json', records);
await updateConversionReport({
  dataset: '臺北市住宅租金指數',
  file: files.at(-1) ?? 'data/raw/residential-rent-index',
  status: files.length ? 'converted' : 'missing',
  sourceUrl: 'https://data.taipei/dataset/detail?id=029c6d0d-c880-4de7-b2fb-9e56669a6f20',
  notes: [
    `${records.length} normalized records`,
    'UTF-8-SIG CSV; Big5/CP950 fallback is supported by TextDecoder.',
    'ROC quarter periods are converted to Gregorian quarter keys.',
    'Quarterly change rates remain source percent values, not decimal ratios.',
  ],
}, warnings);
console.log(`residential rent index records: ${records.length}`);
