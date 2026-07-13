import { readFile } from 'node:fs/promises';
import type { RealEstateBrokerPenaltyRecord, RealEstateBrokerPenaltySummary, RealEstateSummary } from '../src/models.ts';
import { buildRealEstateBrokerPenaltySummary } from './convertRealEstateBrokerPenalties.ts';
import { writeJson } from './data.ts';

const records = JSON.parse(await readFile('public/data/real-estate-broker-penalties/records.json', 'utf8')) as RealEstateBrokerPenaltyRecord[];
let previous: RealEstateBrokerPenaltySummary | undefined;
try { previous = JSON.parse(await readFile('public/data/real-estate-broker-penalties/summary.json', 'utf8')) as RealEstateBrokerPenaltySummary; } catch { /* Rebuild may run before a conversion. */ }
const summary = buildRealEstateBrokerPenaltySummary(records, previous?.dataQuality ?? { invalidDateCount: 0, invalidAmountCount: 0, missingFieldCount: 0, duplicateCount: 0, recordsWithParsedDate: records.filter((record) => record.dispositionDate).length, recordsWithParsedAmount: records.filter((record) => record.penaltyAmount !== undefined).length });
await writeJson('public/data/real-estate-broker-penalties/summary.json', summary);
try {
  const overview = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
  overview.realEstateBrokerPenalties = { totalRecords: summary.totalRecords, latestYear: summary.latestYear, totalPenaltyAmount: summary.totalPenaltyAmount };
  await writeJson('public/data/real-price-summary.json', overview);
} catch { /* Overview is optional for standalone summary builds. */ }
console.log('real-estate broker penalty summary built');
