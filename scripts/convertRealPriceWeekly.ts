import { convertRealPriceRows, listCsvFiles, readCsv, updateConversionReport, writeJson } from './data.ts';

const files = await listCsvFiles('data/raw/real-price-weekly');
const warnings: string[] = [];
const records = files.length ? convertRealPriceRows(await readCsv(files.at(-1)!), warnings) : [];

await writeJson('public/data/real-price-records.json', records);
await updateConversionReport({
  dataset: '臺北市實價周報',
  file: files.at(-1) ?? 'data/raw/real-price-weekly',
  status: files.length ? 'converted' : 'missing',
  notes: [`${records.length} normalized records`, 'TPRICE uses NT$10,000; sale unit prices use NT$10,000/ping; rental unit prices use NTD/ping/month.'],
}, warnings);
console.log(`real-price records: ${records.length}`);
