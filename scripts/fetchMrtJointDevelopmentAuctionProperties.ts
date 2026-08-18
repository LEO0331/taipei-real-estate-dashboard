import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles } from './data.ts';

const directory = 'data/raw/mrt-joint-development-auction-properties';
const sourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=f3f1b2a4-b7e6-4e40-a644-f6295446b72f';

export async function fetchMrtJointDevelopmentAuctionProperties() {
  await mkdir(directory, { recursive: true });
  if ((await listCsvFiles(directory)).length && !process.argv.includes('--force')) return;
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`MRT joint-development auction-property download failed: HTTP ${response.status}`);
  await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer()));
}

if (process.argv[1]?.endsWith('fetchMrtJointDevelopmentAuctionProperties.ts')) await fetchMrtJointDevelopmentAuctionProperties();
