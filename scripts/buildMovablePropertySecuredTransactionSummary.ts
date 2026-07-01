import { readFile } from 'node:fs/promises';
import type { MovablePropertySecuredTransactionRecord, RealEstateSummary } from '../src/models.ts';
import { writeJson } from './data.ts';
import { buildMovablePropertySecuredTransactionSummary } from './convertMovablePropertySecuredTransactionRecords.ts';

const records = JSON.parse(await readFile('public/data/movable-property-secured-transaction-records.json', 'utf8')) as MovablePropertySecuredTransactionRecord[];
const summary = buildMovablePropertySecuredTransactionSummary(records);
const latest = records.filter((record) => record.registrationMonthKey === summary.latestRegistrationMonth);
await writeJson('public/data/movable-property-secured-transaction-summary.json', summary);
await writeJson('public/data/movable-property-secured-transaction-latest.json', latest);

try {
  const realEstate = JSON.parse(await readFile('public/data/real-price-summary.json', 'utf8')) as RealEstateSummary;
  realEstate.movablePropertySecuredTransactionRecords = {
    totalRecords: summary.totalRecords,
    latestRegistrationMonth: summary.latestRegistrationMonth,
    totalCollateralAmountNtd: summary.totalCollateralAmountNtd,
    totalSecuredDebtAmountNtd: summary.totalSecuredDebtAmountNtd,
  };
  await writeJson('public/data/real-price-summary.json', realEstate);
} catch {
  // Existing summary is optional when this module is built alone.
}

console.log('movable-property secured transaction summary built');
