import { mkdir, writeFile } from 'node:fs/promises';
import { listCsvFiles, updateConversionReport } from './data.ts';
const directory = 'data/raw/real-estate-brokerage-business-directory';
const sourceUrl = 'https://data.taipei/dataset/detail?id=2f29e848-f27e-45d6-ae5c-9aa49570a2b9';
const downloadUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=ab6f3b0d-053e-4909-b70e-8ecbecf4a7e5';
await mkdir(directory, { recursive: true }); const existing = await listCsvFiles(directory);
if (existing.length && !process.argv.includes('--force')) console.log(`brokerage business directory local file: ${existing.at(-1)}`);
else try { const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(30_000) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); await writeFile(`${directory}/source.csv`, Buffer.from(await response.arrayBuffer())); } catch (error) { const warning = `brokerage business directory download failed: ${error instanceof Error ? error.message : String(error)}`; await updateConversionReport({ dataset: '\u81fa\u5317\u5e02\u4e0d\u52d5\u7522\u7d93\u7d00\u696d\u696d\u8005\u540d\u518a', file: existing.at(-1) ?? directory, status: existing.length ? 'available' : 'failed', sourceUrl, notes: ['Uses local CSV when download fails.'] }, [warning]); console.warn(warning); }
