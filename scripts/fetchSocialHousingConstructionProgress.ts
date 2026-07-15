import { mkdir, writeFile } from 'node:fs/promises';
import { updateConversionReport } from './data.ts';
const url = 'https://hms.udd.gov.taipei/api/BigData/project'; const target = 'data/raw/social-housing-construction-progress/source.json';
await mkdir('data/raw/social-housing-construction-progress', { recursive: true });
let lastError: unknown;
for (let attempt = 1; attempt <= 3; attempt += 1) try { const response = await fetch(url, { signal: AbortSignal.timeout(15_000) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const body = await response.text(); JSON.parse(body); await writeFile(target, body); await updateConversionReport({ dataset: '臺北市社會住宅興建工程進度', file: target, status: 'available', sourceUrl: url, downloadedAt: new Date().toISOString(), notes: ['Official API response staged as static build input.'] }); console.log(`social housing API: ${target}`); process.exit(0); } catch (error) { lastError = error; }
throw new Error(`Unable to fetch social housing API after 3 attempts: ${String(lastError)}`);
