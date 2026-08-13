import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles } from './data.ts';

const directory = 'data/raw/urban-renewal-regulations';
const resourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=0670e3bd-04a5-4659-99c3-7702f78999d6';

export async function fetchUrbanRenewalRegulations() {
  await mkdir(directory, { recursive: true });
  if ((await listCsvFiles(directory)).length && !process.argv.includes('--force')) return;
  const response = await fetch(resourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Urban renewal regulations download failed: HTTP ${response.status}`);
  await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer()));
}

if (process.argv[1]?.endsWith('fetchUrbanRenewalRegulations.ts')) await fetchUrbanRenewalRegulations();
