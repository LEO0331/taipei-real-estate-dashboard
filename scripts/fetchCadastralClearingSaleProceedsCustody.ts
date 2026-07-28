import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'data/raw/cadastral-clearing-sale-proceeds-custody';
const resourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=2d7e29ad-c7b4-4f0a-bd54-e0bb39c12ce7';

await mkdir(directory, { recursive: true });
const response = await fetch(resourceUrl, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Unable to download cadastral-clearing custody data: HTTP ${response.status}`);
await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer()));
