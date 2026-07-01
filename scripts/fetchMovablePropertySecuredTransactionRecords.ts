import { copyFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { updateConversionReport } from './data.ts';

const directory = 'data/raw/movable-property-secured-transaction-records';
const fileName = '臺北市動產擔保登記資料.csv';
const sourceFile = `/Users/Leo/Downloads/${fileName}`;
const target = join(directory, fileName);

async function exists(path: string) {
  try { await stat(path); return true; } catch { return false; }
}

await mkdir(directory, { recursive: true });
if (!(await exists(target)) || process.argv.includes('--force')) await copyFile(sourceFile, target);
const info = await stat(target);
await updateConversionReport({
  dataset: '臺北市動產擔保登記資料',
  file: target,
  bytes: info.size,
  status: 'available',
  sourceUrl: 'https://data.taipei/dataset/detail?id=cb964837-c602-4238-b6c0-f63ad1094d5e',
  notes: ['Local uploaded UTF-8-SIG CSV staged for conversion.', 'Converter supports Big5/CP950 fallback through readCsv.'],
}, []);

console.log(`movable-property secured transaction file: ${target}`);
