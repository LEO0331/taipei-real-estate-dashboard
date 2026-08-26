import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles } from './data.ts';

const directory = 'data/raw/mrt-land-development';
const sourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=ca944216-f679-4db9-9271-0634d31c0ab9';

export async function fetchMrtLandDevelopment() {
  await mkdir(directory, { recursive: true });
  if ((await listCsvFiles(directory)).length && !process.argv.includes('--force')) return;
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`MRT land-development download failed: HTTP ${response.status}`);
  await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer()));
}

if (process.argv[1]?.endsWith('fetchMrtLandDevelopment.ts')) await fetchMrtLandDevelopment();
