import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'data/raw';
const resourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=593e3e45-c2ac-4e75-9dfa-95b37931a7cf';

await mkdir(directory, { recursive: true });
const response = await fetch(resourceUrl, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Unable to download cadastral-cleanup auction results: HTTP ${response.status}`);
await writeFile(`${directory}/cadastral-cleanup-land-auction-results.csv`, Buffer.from(await response.arrayBuffer()));
