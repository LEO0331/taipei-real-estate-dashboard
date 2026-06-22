import { readFile } from 'node:fs/promises';
import { buildRealEstateSummary, writeJson } from './data.ts';
import type { RealPriceRecord } from '../src/models.ts';

const records = JSON.parse(await readFile('public/data/real-price-records.json', 'utf8')) as RealPriceRecord[];
await writeJson('public/data/real-price-summary.json', buildRealEstateSummary(records));
console.log('real-price summary built');
