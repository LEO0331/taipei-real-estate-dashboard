import { approvedMarketRecords, readManifest, sourcePage } from './quarterlySources.ts';
import { updateConversionReport, writeJson } from './data.ts';
import { latestMarketRows, marketSummary } from '../src/utils/quarterlyMarket.ts';

const records = await approvedMarketRecords();
const latest = latestMarketRows(records);
const source = (await readManifest()).sources.find(s => s.id === 'quarterly-market-analysis')!;
await writeJson('public/data/quarterly-market-analysis.json', records);
await writeJson('public/data/quarterly-market-summary.json', marketSummary(latest));
await updateConversionReport({ dataset: source.title, file: source.approvals.at(-1)!.file,
  sourceUrl: sourcePage(source), status: 'converted',
  notes: [`${records.length} retained district records; ${latest.length} latest-quarter districts`, 'Quarter validated from explicit approved source metadata; no filename fallback.'],
});
console.log(`quarterly records: ${records.length}`);
