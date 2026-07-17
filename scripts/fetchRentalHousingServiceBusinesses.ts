import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles, updateConversionReport } from './data.ts';

const directory = 'data/raw/rental-housing-service-businesses';
const sourceUrl = 'https://data.taipei/dataset/detail?id=6c1f5836-30fe-43fe-82b0-3f54f0c6c78e';
const downloadUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=75e116b7-b024-4437-8100-1fa1fcbdbd31';
await mkdir(directory, { recursive: true });
const existing = await listCsvFiles(directory);
if (existing.length && !process.argv.includes('--force')) {
  console.log(`rental housing service businesses local file: ${existing.at(-1)}`);
} else try {
  const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const file = `${directory}/source.csv`;
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  console.log(`rental housing service businesses CSV: ${file}`);
} catch (error) {
  const warning = `rental housing service businesses download failed: ${error instanceof Error ? error.message : String(error)}`;
  await updateConversionReport({ dataset: '臺北市租賃住宅服務業業者名冊', file: existing.at(-1) ?? directory, status: existing.length ? 'available' : 'failed', sourceUrl, notes: existing.length ? ['Download failed; continuing with local CSV.'] : ['Download failed and no local CSV is available.'] }, [warning]);
  console.warn(warning);
}
