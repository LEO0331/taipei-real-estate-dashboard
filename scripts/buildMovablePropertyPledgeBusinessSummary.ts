import { readFile } from 'node:fs/promises';
import { buildMovablePropertyPledgeBusinessSummary } from './convertMovablePropertyPledgeBusinessStatistics.ts';
import { writeJson } from './data.ts';
import type { MovablePropertyPledgeBusinessRecord } from '../src/models.ts';

const records = JSON.parse(await readFile('public/data/movable-property-pledge-business-records.json', 'utf8')) as MovablePropertyPledgeBusinessRecord[];
const summary = buildMovablePropertyPledgeBusinessSummary(records);
await writeJson('public/data/movable-property-pledge-business-summary.json', summary);
await writeJson('public/data/movable-property-pledge-business-annual-summary.json', summary.byYear);
console.log('movable-property pledge summary built');
