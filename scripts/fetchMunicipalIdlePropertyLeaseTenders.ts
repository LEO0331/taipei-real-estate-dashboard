import { mkdir, writeFile } from 'node:fs/promises';
import { updateConversionReport } from './data.ts';

const directory = 'data/raw/municipal-idle-property-lease-tenders';
const target = `${directory}/source.csv`;
const sourceUrl = 'https://data.taipei/dataset/detail?id=be46d539-5a32-4d12-9022-76228006b0e8';
const url = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=d912c17a-35a1-4382-a2aa-2862729fcacf';

await mkdir(directory, { recursive: true });
const response = await fetch(url);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
await writeFile(target, Buffer.from(await response.arrayBuffer()));
await updateConversionReport({ dataset: '臺北市市有閒置房地出租招標結果', file: target, status: 'available', sourceUrl, downloadedAt: new Date().toISOString(), notes: ['Official CSV staged for static conversion. Source response advertises BIG-5; conversion reads UTF-8 first with Big5 fallback.'] });
console.log(`municipal idle-property lease tenders CSV: ${target}`);
