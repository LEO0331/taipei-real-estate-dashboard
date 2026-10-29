import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { convertQuarterlyRows, normalizeColumnName, parseRocQuarter, readCsv, type CsvRow } from './data.ts';

export const manifestPath = 'data/quarterly-approved.json';
export type Approval = { file: string; sha256: string; period: string; sourceUrl: string };
export type Source = {
  id: string; title: string; datasetId: string; category: string; columns: string[];
  categories: string[]; approvals: Approval[];
};
export type Manifest = { version: 1; sources: Source[] };
export const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export const sourcePage = (s: Source) => `https://data.taipei/dataset/detail?id=${s.datasetId}`;
export const column = (s: string) => {
  const name = normalizeColumnName(s).replace(/^宅價格/, '住宅價格');
  return name.includes('變動率') ? name.replace(/%/g, '') : name;
};
export async function readManifest(root = '.') : Promise<Manifest> {
  return JSON.parse(await readFile(resolve(root, manifestPath), 'utf8'));
}
export function localPath(root: string, file: string) {
  const base = resolve(root);
  const path = resolve(base, file);
  if (!path.startsWith(base + sep)) throw new Error('Path must stay within staging root');
  return path;
}
export function quarter(value: string) {
  if (!/^\d{4}-Q[1-4]$/.test(value)) throw new Error(`Invalid quarter: ${value}`);
  const now = new Date();
  const currentQuarter = `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
  if (value < '1912-Q1' || value > currentQuarter) throw new Error(`Quarter outside published-data range: ${value}`);
  return value;
}
export function rowPeriod(s: Source, row: CsvRow, period: string) {
  return s.id === 'quarterly-market-analysis' ? quarter(period) : parseRocQuarter(row['期別']).quarter ?? '';
}
export function identity(s: Source, row: CsvRow, period: string) {
  return `${rowPeriod(s, row, period)}|${row[s.category]?.trim()}`;
}
export function validateContinuity(periods: string[]) {
  const sorted = [...new Set(periods)].sort();
  for (let i=1;i<sorted.length;i++) {
    const [year,q] = sorted[i-1].split('-Q').map(Number);
    const expected = q === 4 ? `${year+1}-Q1` : `${year}-Q${q+1}`;
    if (sorted[i] !== expected) throw new Error(`Missing quarterly coverage: ${expected}`);
  }
}
export function canonicalRow(row: CsvRow) {
  return JSON.stringify(Object.entries(row).map(([k, v]) => [column(k), v.trim()]).sort(([a], [b]) => a.localeCompare(b)));
}
export function validateRows(s: Source, rows: CsvRow[], declaredPeriod: string) {
  quarter(declaredPeriod);
  if (!rows.length || rows.length > 100_000) throw new Error('Invalid record count');
  const schemaColumn = (key: string) => {
    const name = normalizeColumnName(key).replace(/^宅價格/, '住宅價格');
    // Only aliases explicitly supported by the corresponding existing converter.
    if ((s.id === 'residential-price-quarterly-index' && name === '季指數變動率%') ||
      (s.id === 'commercial-office-rent-index' && name === '季變動率%')) return name.replace('%','');
    return name;
  };
  const expected = s.columns.map(schemaColumn).sort().join('|');
  if (Object.keys(rows[0]).map(schemaColumn).sort().join('|') !== expected) throw new Error('Incompatible CSV schema');
  // Normalize the single known historical typo, preserving all source values.
  if (s.category === '住宅價格季指數類別') rows = rows.map(r => {
    const next = { ...r, [s.category]: r[s.category] ?? r['宅價格季指數類別'] };
    delete next['宅價格季指數類別'];
    return next;
  });
  const groups = new Map<string, Set<string>>();
  const seen = new Set<string>();
  for (const row of rows) {
    const p = rowPeriod(s, row, declaredPeriod);
    quarter(p);
    if (p > declaredPeriod) throw new Error('Source period exceeds declared latest quarter');
    const category = row[s.category]?.trim();
    if (!s.categories.includes(category)) throw new Error(`Unknown category/district: ${category}`);
    const key = identity(s, row, declaredPeriod);
    if (seen.has(key)) throw new Error(`Duplicate source identity: ${key}`);
    seen.add(key);
    groups.set(p, (groups.get(p) ?? new Set()).add(category));
    for (const [name, raw] of Object.entries(row)) {
      if ([s.category, '期別', '實價登錄動態分析'].includes(name)) continue;
      const value = raw.replace(/[,，%\s]/g, '');
      if (/^-{1,2}$/.test(value) && column(name).includes('變動率')) continue;
      if (!/^-?\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw new Error(`Invalid numeric value in ${name}: ${raw}`);
      if (!column(name).includes('變動率') && Number(value) < 0) throw new Error(`Negative value in ${name}`);
      if (s.id === 'quarterly-market-analysis' && !Number.isInteger(Number(value))) throw new Error('Case counts must be integers');
      if (column(name) === '季指數' && Number(value) <= 0) throw new Error('Index must be positive');
    }
  }
  const latest = [...groups.keys()].sort().at(-1)!;
  if (latest !== declaredPeriod) throw new Error(`Declared period ${declaredPeriod} differs from source ${latest}`);
  for (const [p, categories] of groups) {
    if (categories.size !== s.categories.length) throw new Error(`Incomplete category/district coverage in ${p}`);
  }
  validateContinuity([...groups.keys()]);
  return { rows, latest, count: rows.length, periods: [...groups.keys()].sort(), validation: 'schema, numeric values, unique identities, periods and complete coverage passed' };
}
export async function approvedRows(id: string, root = '.') {
  const manifest = await readManifest(root);
  const source = manifest.sources.find(s => s.id === id);
  if (!source) throw new Error(`Unknown monitored source: ${id}`);
  const merged = new Map<string, CsvRow>();
  for (const approval of source.approvals) {
    const path = localPath(root, approval.file);
    if (sha256(await readFile(path)) !== approval.sha256) throw new Error(`Approved hash mismatch: ${approval.file}`);
    const result = validateRows(source, await readCsv(path), approval.period);
    for (const row of result.rows) merged.set(identity(source, row, approval.period), row);
  }
  if (!merged.size) throw new Error('No approved data');
  const latest = source.approvals.map(a => a.period).sort().at(-1)!;
  if (id !== 'quarterly-market-analysis') validateContinuity([...merged.keys()].map(k => k.split('|')[0]));
  // Market CSV has no period column; retained historical quarters are converted individually.
  return { source, rows: [...merged.values()], latest };
}

export async function approvedMarketRecords(root = '.') {
  const { sources } = await readManifest(root);
  const s = sources.find(s => s.id === 'quarterly-market-analysis')!;
  validateContinuity(s.approvals.map(a => a.period));
  const records = new Map<string, ReturnType<typeof convertQuarterlyRows>[number]>();
  for (const a of s.approvals) {
    const file = localPath(root, a.file);
    if (sha256(await readFile(file)) !== a.sha256) throw new Error('Approved market hash mismatch');
    const { rows } = validateRows(s, await readCsv(file), a.period);
    const [year, q] = a.period.split('-Q').map(Number);
    for (const r of convertQuarterlyRows(rows, year, q)) records.set(`${r.quarterLabel}|${r.district}`, r);
  }
  return [...records.values()].sort((a, b) => (a.quarterLabel ?? '').localeCompare(b.quarterLabel ?? '') || a.district.localeCompare(b.district));
}

