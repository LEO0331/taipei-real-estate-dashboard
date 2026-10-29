import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseCsv, parseRocQuarter, readCsv } from './data.ts';
import { approvedRows, canonicalRow, identity, localPath, readManifest, sha256, sourcePage, validateContinuity, validateRows, type Source } from './quarterlySources.ts';

export type Finding = {
  id: string; title: string; sourceUrl: string; status: 'unchanged' | 'updated' | 'unavailable' | 'incompatible';
  previousQuarter: string; latestQuarter?: string; hash?: string; previousHash: string;
  validation: string; newPeriods?: string[]; revisedRecords?: number;
};
export function officialUrl(raw: string) {
  const url = new URL(raw);
  if (url.origin !== 'https://data.taipei' || url.username || url.password) throw new Error('Unapproved official source origin');
  return url.href;
}
export async function officialFetch(url: string) {
  let target = officialUrl(url);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      target = officialUrl(new URL(r.headers.get('location') ?? '', target).href);
      continue;
    }
    if (!r.ok) throw new Error(`Official source HTTP ${r.status}`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length > 10_000_000) throw new Error('Source exceeds expected size');
    return bytes;
  }
  throw new Error('Too many source redirects');
}
export function decodeCsv(bytes: Uint8Array) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('big5', { fatal: true }).decode(bytes); }
}
export function discover(s: Source, html: string) {
  if (!html.includes(s.title) || !html.includes('地政局')) throw new Error('Official dataset identity/agency could not be verified');
  const resources = [...html.matchAll(/<a\b[^>]*href="([^"]*resource\.download\?rid=[a-f0-9-]+)"[^>]*title="([^"]+)"[^>]*>/g)]
    .map(m => ({ url: officialUrl(m[1]), title: m[2] }));
  const unique = [...new Map(resources.map(r => [r.url, r])).values()];
  if (!unique.length) throw new Error('No verifiable official CSV download advertised');
  if (s.id !== 'quarterly-market-analysis' && unique.length !== 1) throw new Error('Ambiguous official resources; manual source review required');
  return unique;
}
export function compare(s: Source, bytes: Uint8Array, declaredPeriod: string, approved: Awaited<ReturnType<typeof approvedRows>>['rows']) {
  const candidate = validateRows(s, parseCsv(decodeCsv(bytes)), declaredPeriod);
  const previous = s.approvals.map(a => a.period).sort().at(-1)!;
  const baselinePeriod = s.id === 'quarterly-market-analysis' ? declaredPeriod : previous;
  const old = new Map(approved.map(r => [identity(s, r, baselinePeriod), canonicalRow(r)]));
  const revised = candidate.rows.filter(r => old.has(identity(s, r, declaredPeriod)) && old.get(identity(s, r, declaredPeriod)) !== canonicalRow(r)).length;
  const oldPeriods = new Set(approved.map(r => identity(s, r, previous).split('|')[0]));
  return { ...candidate, revised, newPeriods: candidate.periods.filter(p => !oldPeriods.has(p)) };
}
export async function inspectSource(s: Source, root = '.', acquire = officialFetch): Promise<Finding> {
  const approval = [...s.approvals].sort((a, b) => a.period.localeCompare(b.period)).at(-1)!;
  const base = { id: s.id, title: s.title, sourceUrl: sourcePage(s), previousQuarter: approval.period, previousHash: approval.sha256 };
  let acquired = false;
  let latestQuarter: string | undefined;
  let hash: string | undefined;
  try {
    const html = new TextDecoder().decode(await acquire(sourcePage(s)));
    acquired = true;
    const resources = discover(s, html);
    const approved = (await approvedRows(s.id, root)).rows;
    const results = [];
    for (const resource of resources) {
      const match = resource.title.match(/(\d{3})年第([1-4])季/);
      const marketPeriod = match ? `${Number(match[1]) + 1911}-Q${match[2]}` : '';
      if (s.id === 'quarterly-market-analysis') {
        if (!marketPeriod) throw new Error('Official market resource has no validated period');
        if (marketPeriod < s.approvals.map(a => a.period).sort()[0]) continue;
      }
      acquired = false;
      const bytes = await acquire(resource.url);
      acquired = true;
      hash = sha256(bytes);
      const rows = parseCsv(decodeCsv(bytes));
      const period = s.id === 'quarterly-market-analysis'
        ? marketPeriod
        : rows.map(r => parseRocQuarter(r['期別']).quarter ?? '').sort().at(-1) ?? '';
      latestQuarter = period;
      const prior = s.approvals.filter(a => a.period === period).at(-1);
      const baseline = s.id === 'quarterly-market-analysis'
        ? (prior ? await readCsv(localPath(root, prior.file)) : []) : approved;
      const result = compare(s, bytes, period, baseline);
      // Retained market downloads older than our coverage are context, not newly published quarters.
      const changed = s.id === 'quarterly-market-analysis' ? (period > approval.period || !!prior && prior.sha256 !== hash) : hash !== approval.sha256;
      results.push({ period, hash, changed, result });
    }
    results.sort((a, b) => a.period.localeCompare(b.period));
    if (!results.length) throw new Error('Official resources no longer cover approved periods');
    if (s.id === 'quarterly-market-analysis') {
      const advertised = new Set(results.map(r => r.period));
      if (s.approvals.some(a => !advertised.has(a.period))) throw new Error('An approved market period is no longer advertised by the official source');
      validateContinuity(results.map(r => r.period));
    }
    latestQuarter = results.at(-1)!.period;
    hash = sha256(results.map(r => `${r.period}:${r.hash}`).join('\n'));
    if (latestQuarter < approval.period) throw new Error('Official coverage regressed; retained snapshot is newer');
    return { ...base, latestQuarter, hash, status: results.some(r => r.changed) ? 'updated' : 'unchanged',
      newPeriods: [...new Set(results.flatMap(r => r.result.newPeriods).filter(p => p > approval.period))].sort(),
      revisedRecords: results.reduce((n, r) => n + r.result.revised, 0),
      validation: `${results.length} official resource(s): schema, periods, counts, coverage, numeric values and SHA256 validated. Resource SHA256: ${results.map(r => `${r.period}=${r.hash} (${r.result.count} source rows)`).join(', ')}` };
  } catch (error) {
    return { ...base, latestQuarter, hash, status: acquired ? 'incompatible' : 'unavailable', validation: error instanceof Error ? error.message : String(error) };
  }
}
export const fingerprint = (finding: Finding) => sha256(JSON.stringify(finding));
export function notificationBody(f: Finding) {
  return `<!-- quarterly-monitor:${f.id} -->\n<!-- finding:${fingerprint(f)} -->\n${f.title}: **${f.status}**\n\nSource: ${f.sourceUrl}\n\nLatest quarter: ${f.latestQuarter ?? 'unknown'}; previous approved quarter: ${f.previousQuarter}\n\nSHA256: ${f.hash ?? 'unavailable'}\nPrevious approved SHA256: ${f.previousHash}\n\nValidation: ${f.validation}\n\nNew periods: ${f.newPeriods?.join(', ') || 'none confirmed'}; revised records: ${f.revisedRecords ?? 'unknown'}.\n\nDetection only. Production data was not changed. Follow docs/quarterly-data-updates.md on a review branch; retain the approved snapshot if acquisition or validation fails.`;
}
export type MonitorIssue = { number: number; body: string | null; state: string };
export function issueAction(f: Finding, issues: MonitorIssue[]) {
  const marker = `<!-- quarterly-monitor:${f.id} -->`;
  const existing = issues.filter(i => i.body?.includes(marker)).sort((a,b) => Number(b.state === 'open') - Number(a.state === 'open') || b.number-a.number)[0];
  if (f.status === 'unchanged') return { action: existing?.state === 'open' ? 'close' : 'none', existing };
  if (existing?.body?.includes(`<!-- finding:${fingerprint(f)} -->`)) return { action: 'none', existing };
  return { action: existing ? 'update' : 'create', existing };
}
export async function notify(findings: Finding[], token: string, repository: string) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  const request = async (path: string, method = 'GET', body?: unknown) => {
    const r = await fetch(`https://api.github.com/repos/${repository}${path}`, { method,
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) throw new Error(`GitHub issue request failed: ${r.status}`);
    return r.json();
  };
  const issues: MonitorIssue[] = [];
  for (let page = 1; ; page++) {
    const batch = await request(`/issues?state=all&per_page=100&page=${page}`);
    issues.push(...batch.filter((i: { pull_request?: unknown }) => !i.pull_request));
    if (batch.length < 100) break;
  }
  for (const f of findings) {
    const { action, existing } = issueAction(f, issues);
    if (action === 'none') continue;
    if (action === 'close') { await request(`/issues/${existing!.number}`, 'PATCH', { state: 'closed' }); continue; }
    const body = { title: `[Quarterly data] ${f.title}: ${f.status}`, body: notificationBody(f), state: 'open' };
    await request(existing ? `/issues/${existing.number}` : '/issues', existing ? 'PATCH' : 'POST', body);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = await readManifest();
  const findings = [];
  for (const s of manifest.sources) findings.push(await inspectSource(s));
  await mkdir('.cache/quarterly-monitor', { recursive: true });
  await writeFile('.cache/quarterly-monitor/report.json', JSON.stringify({ checkedAt: new Date().toISOString(), findings }, null, 2));
  console.log(findings.map(f => `${f.id}: ${f.status}; ${f.latestQuarter ?? 'unknown'}; ${f.validation}`).join('\n'));
  if (process.argv.includes('--notify')) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) throw new Error('Notification credentials missing');
    await notify(findings, process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY);
  }
}
