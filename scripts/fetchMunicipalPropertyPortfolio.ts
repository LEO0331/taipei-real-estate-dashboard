import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles } from './data.ts';
const directory = 'data/raw/municipal-property-portfolio';
const resourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=ac759fab-abd6-4518-856f-d6814fb8f8ce';
export async function fetchMunicipalPropertyPortfolio() { await mkdir(directory, { recursive: true }); if ((await listCsvFiles(directory)).length && !process.argv.includes('--force')) return; const response = await fetch(resourceUrl, { signal: AbortSignal.timeout(30_000) }); if (!response.ok) throw new Error(`Municipal property download failed: HTTP ${response.status}`); await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer())); }
if (process.argv[1]?.endsWith('fetchMunicipalPropertyPortfolio.ts')) await fetchMunicipalPropertyPortfolio();
