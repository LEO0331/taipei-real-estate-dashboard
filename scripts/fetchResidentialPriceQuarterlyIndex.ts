import { copyFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { updateConversionReport } from './data.ts';

const directory = 'data/raw/residential-price-quarterly-index';
const fileName = '114年第4季住宅價格指數.csv';
const sourceFile = `/Users/Leo/Downloads/${fileName}`;
const target = join(directory, fileName);

async function exists(path: string) {
  try { await stat(path); return true; } catch { return false; }
}

await mkdir(directory, { recursive: true });
if (!(await exists(target)) || process.argv.includes('--force')) await copyFile(sourceFile, target);
const info = await stat(target);
await updateConversionReport({
  dataset: '臺北市住宅價格季指數',
  file: target,
  bytes: info.size,
  status: 'available',
  sourceUrl: 'https://data.taipei/dataset/detail?id=954911b5-896d-4ae1-9ebe-87c4ba8a191e',
  notes: ['Local uploaded UTF-8-SIG CSV staged for conversion.', 'Converter also supports Big5/CP950 fallback through readCsv.'],
}, []);

console.log(`residential price quarterly index file: ${target}`);
