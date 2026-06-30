import { copyFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { updateConversionReport } from './data.ts';

const directory = 'data/raw/income-per-earner-by-district-year';
const fileName = 'fi00122y12ac.csv';
const localUpload = '/Users/Leo/Downloads/fi00122y12ac.csv';
const target = join(directory, fileName);
const source = '臺北市所得收入者每人所得－行政區別按年別';
const sourceUrl = 'https://data.taipei/dataset/detail?id=33da4ba0-c366-45eb-a71f-1991e6455ed6';

async function exists(path: string) {
  try { await stat(path); return true; } catch { return false; }
}

export async function fetchIncomePerEarnerByDistrictYear() {
  await mkdir(directory, { recursive: true });
  const force = process.argv.includes('--force');
  const alreadyAvailable = await exists(target);
  if (!alreadyAvailable || force) await copyFile(localUpload, target);
  const info = await stat(target);
  await updateConversionReport({
    dataset: source,
    file: target,
    bytes: info.size,
    sourceUrl,
    status: 'available',
    notes: ['Local uploaded CSV staged for conversion.', 'Source encoding is Big5/CP950; converter decodes Big5 first and falls back to UTF-8.'],
  }, []);
  return target;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`income per earner file: ${await fetchIncomePerEarnerByDistrictYear()}`);
}
