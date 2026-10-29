import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseCsv, readCsv } from './data.ts';
import { approvedRows, canonicalRow, identity, localPath, manifestPath, readManifest, sha256, sourcePage, validateRows } from './quarterlySources.ts';
import { decodeCsv, discover, officialFetch, officialUrl } from './monitorQuarterlyData.ts';

const scriptsDirectory = fileURLToPath(new URL('.', import.meta.url));
const pipelines: Record<string, string[]> = {
  'residential-price-quarterly-index': ['convertResidentialPriceQuarterlyIndex.ts', 'buildResidentialPriceQuarterlyIndexSummary.ts'],
  'residential-rent-index': ['convertResidentialRentIndex.ts', 'buildResidentialRentIndexSummary.ts'],
  'commercial-office-rent-index': ['convertCommercialOfficeRentIndex.ts', 'buildCommercialOfficeRentIndexSummary.ts'],
  'quarterly-market-analysis': ['convertQuarterlyMarketAnalysis.ts', 'buildDistrictComparison.ts'],
};
export const outputs: Record<string, string[]> = {
  'residential-price-quarterly-index': ['residential-price-quarterly-index-records.json', 'residential-price-quarterly-index-summary.json', 'residential-price-quarterly-index-latest.json', 'real-price-summary.json'],
  'residential-rent-index': ['residential-rent-index-records.json', 'residential-rent-index-summary.json', 'real-price-summary.json'],
  'commercial-office-rent-index': ['commercial-office-rent-index-records.json', 'commercial-office-rent-index-summary.json', 'commercial-office-rent-index-category-series.json', 'real-price-summary.json'],
  'quarterly-market-analysis': ['quarterly-market-analysis.json', 'quarterly-market-summary.json', 'district-comparison-summary.json'],
};
export type ImportOptions = { id: string; file: string; period: string; hash: string; sourceUrl: string; provenanceFile?: string; allowRevision?: boolean; apply?: boolean; root?: string };
export async function stageImport(options: ImportOptions) {
  const root = resolve(options.root ?? '.');
  const manifest = await readManifest(root);
  const s = manifest.sources.find(s => s.id === options.id);
  if (!s || !pipelines[s.id]) throw new Error('Unknown quarterly dataset');
  const url = new URL(officialUrl(options.sourceUrl));
  if (url.href !== sourcePage(s) && !(url.pathname === '/api/frontstage/tpeod/dataset/resource.download' && /^[a-f0-9-]{36}$/.test(url.searchParams.get('rid') ?? ''))) {
    throw new Error('Use the registered official dataset page or its reviewed resource download URL');
  }
  const bytes = await readFile(resolve(options.file));
  if (sha256(bytes) !== options.hash) throw new Error('Candidate SHA256 does not match reviewed hash');
  let provenance: Buffer | undefined;
  if (s.id === 'quarterly-market-analysis') {
    if (!options.provenanceFile) throw new Error('Market imports require --provenance metadata from the official download');
    provenance = await readFile(resolve(options.provenanceFile));
    const metadata = JSON.parse(provenance.toString());
    const title = String(metadata.officialTitle ?? '');
    const match = title.match(/臺北市(\d{3})年第([1-4])季實價登錄動態分析/);
    if (metadata.sha256 !== options.hash || metadata.sourceUrl !== options.sourceUrl || !match ||
      `${Number(match[1])+1911}-Q${match[2]}` !== options.period) throw new Error('Market period, hash or URL differs from official resource metadata');
  }
  const candidate = validateRows(s, parseCsv(decodeCsv(bytes)), options.period);
  const approved = await approvedRows(s.id, root);
  if (candidate.latest < approved.latest && !(options.allowRevision && s.approvals.some(a => a.period === candidate.latest))) {
    throw new Error('Import would regress the approved latest period');
  }
  let oldRows = approved.rows;
  if (s.id === 'quarterly-market-analysis') {
    const prior = s.approvals.filter(a => a.period === candidate.latest).at(-1);
    oldRows = prior ? await readCsv(localPath(root, prior.file)) : [];
  }
  const old = new Map(oldRows.map(r => [identity(s, r, options.period), canonicalRow(r)]));
  const revisions = candidate.rows.filter(r => old.has(identity(s,r,options.period)) && old.get(identity(s,r,options.period)) !== canonicalRow(r)).length;
  if (revisions && !options.allowRevision) throw new Error(`${revisions} official revisions require --allow-revision after reviewing the diff`);
  const previous = s.approvals.at(-1)!;
  if (previous.sha256 === options.hash) throw new Error('Candidate is already approved; no import required');
  await mkdir(join(root, '.cache'), { recursive: true });
  const stage = await mkdtemp(join(root, '.cache', 'quarterly-stage-'));
  await cp(join(root, 'public/data'), join(stage, 'public/data'), { recursive: true });
  for (const source of manifest.sources) {
    await cp(join(root, 'data/raw', source.id), join(stage, 'data/raw', source.id), { recursive: true });
  }
  const rawFile = `data/raw/${s.id}/${options.period}-${options.hash}.csv`;
  await writeFile(localPath(stage, rawFile), bytes);
  if (provenance) await writeFile(localPath(stage, `${rawFile}.json`), provenance);
  s.approvals.push({ file: rawFile, sha256: options.hash, period: options.period, sourceUrl: options.sourceUrl });
  await writeFile(join(stage, manifestPath), JSON.stringify(manifest, null, 2) + '\n');
  for (const script of pipelines[s.id]) {
    const run = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(scriptsDirectory, script)], { cwd: stage, encoding: 'utf8' });
    if (run.status !== 0) throw new Error(`Staged converter failed (${script}): ${run.stderr || run.error || run.stdout}`);
  }
  const files = [...outputs[s.id].map(p => `public/data/${p}`), 'public/data/conversion-report.json', rawFile, ...(provenance ? [`${rawFile}.json`] : []), manifestPath];
  const staged = new Map<string, Buffer>();
  const originals = new Map<string, Buffer | undefined>();
  for (const file of files) {
    const value = await readFile(localPath(stage, file));
    if (file.endsWith('.json')) JSON.parse(value.toString());
    staged.set(file, value);
    try { originals.set(file, await readFile(localPath(root, file))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; originals.set(file, undefined); }
  }
  const report = { dataset: s.id, latestQuarter: candidate.latest, candidateRecords: candidate.count, revisions,
    validation: candidate.validation, rawFile, sha256: options.hash, sourceUrl: options.sourceUrl,
    files: Object.fromEntries([...staged].map(([p,b]) => [p, sha256(b)])), applied: !!options.apply };
  await writeFile(join(stage, 'validation.json'), JSON.stringify(report, null, 2));
  if (options.apply) {
    // Everything is converted and validated before the first approved file is touched.
    // Roll back all writes if a filesystem write fails; no network or conversion occurs here.
    await applyStagedFiles(root, staged, originals);
  }
  return { stage, report };
}
export async function applyStagedFiles(root: string, staged: Map<string, Buffer>, originals: Map<string, Buffer | undefined>, write: (path: string, bytes: Buffer) => Promise<unknown> = writeFile) {
  const written: string[] = [];
  try {
    for (const [file, value] of staged) {
      written.push(file);
      await write(localPath(root, file), value);
    }
  } catch (error) {
    const failures: unknown[] = [error];
    for (const file of written.reverse()) {
      const original = originals.get(file);
      try {
        if (original) await write(localPath(root,file), original);
        else await rm(localPath(root,file), { force: true });
      } catch (restoreError) { failures.push(restoreError); }
    }
    throw new AggregateError(failures, 'Import apply failed; rollback attempted for every touched file. Inspect git diff before retrying.');
  }
}
export async function stageOfficialSource(id: string) {
  const s = (await readManifest()).sources.find(s => s.id === id)!;
  const resources = discover(s, new TextDecoder().decode(await officialFetch(sourcePage(s))));
  await mkdir(`.cache/quarterly-downloads/${id}`, { recursive: true });
  for (const resource of resources) {
    const bytes = await officialFetch(resource.url);
    const hash = sha256(bytes);
    const file = `.cache/quarterly-downloads/${id}/${hash}.csv`;
    await writeFile(file, bytes);
    await writeFile(`${file}.json`, JSON.stringify({ sourceUrl: resource.url, officialTitle: resource.title, sha256: hash }, null, 2));
    console.log(`Staged only: ${file}; SHA256 ${hash}; official title: ${resource.title}`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (flag: string) => { const i = process.argv.indexOf(flag); if (i < 0 || !process.argv[i+1]) throw new Error(`Required: ${flag}`); return process.argv[i+1]; };
  const id = arg('--dataset');
  if (process.argv.includes('--download')) await stageOfficialSource(id);
  else {
    const result = await stageImport({ id, file: arg('--file'), period: arg('--period'), hash: arg('--sha256'), sourceUrl: arg('--source-url'),
      provenanceFile: process.argv.includes('--provenance') ? arg('--provenance') : undefined,
      allowRevision: process.argv.includes('--allow-revision'), apply: process.argv.includes('--apply') });
    console.log(JSON.stringify(result, null, 2));
  }
}
