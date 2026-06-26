import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const root = join(process.cwd(), 'public/data/building-use-permits');
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const years = await readdir(join(root, 'chunks/by-year-district'));
let count = 0;
for (const year of years) { const records = JSON.parse(await readFile(join(root, 'chunks/by-year-district', year), 'utf8')); assert.ok(records.every((record: { id?: string }) => record.id), `${year} has a record without id`); count += records.length; }
assert.equal(count, manifest.totalRecords, 'year chunks must add up to manifest total');
console.log(`Validated ${count} use-permit records across ${years.length} chunks.`);
