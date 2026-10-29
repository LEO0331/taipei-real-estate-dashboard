import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readCsv, convertResidentialPriceQuarterlyIndexRows, buildResidentialPriceQuarterlyIndexSummary,
  convertResidentialRentIndexRows, buildResidentialRentIndexSummary, convertCommercialOfficeRentIndexRows, buildCommercialOfficeRentIndexSummary } from './data.ts';
import { approvedRows, manifestPath, readManifest, sha256, sourcePage, validateContinuity, validateRows, type Source } from './quarterlySources.ts';
import { compare, discover, inspectSource, issueAction, notificationBody, notify, officialUrl, type Finding } from './monitorQuarterlyData.ts';
import { applyStagedFiles, stageImport } from './stageQuarterlyData.ts';
import { latestMarketRows } from '../src/utils/quarterlyMarket.ts';

const liveManifest = await readManifest();
// Synthetic tests pin the retained initial fixture, so a real approved update needs no test edits.
const manifest = { ...liveManifest, sources: liveManifest.sources.map(s => ({...s, approvals:[s.approvals[0]]})) };
const baselineRows = async(s: Source) => validateRows(s,await readCsv(s.approvals[0].file),s.approvals[0].period).rows;
const csv = (rows: Record<string,string>[]) => Buffer.from([Object.keys(rows[0]), ...rows.map(r => Object.values(r))].map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n'));
async function newQuarter(s: Source): Promise<Record<string,string>[]> {
  const rows = await baselineRows(s);
  return rows.filter(r => r['期別'] === '114Q4').map(r => ({...r, '期別':'115Q1', '季指數': '150' }));
}
test('all four approved snapshots pass strict schema, coverage, numeric, identity and hash validation', async () => {
  for (const s of liveManifest.sources) {
    const result = await approvedRows(s.id);
    assert.ok(result.rows.length > 0);
    assert.equal(result.latest, s.approvals.map(a=>a.period).sort().at(-1));
  }
});
test('monitor distinguishes unchanged, new quarters and existing-period revisions', async () => {
  for (const s of manifest.sources.slice(0,3)) {
    const bytes = await readFile(s.approvals[0].file);
    const html = `${s.title} 地政局 <a href="https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=abcd" title="下載">下載</a>`;
    const fetcher = async (url: string) => url === sourcePage(s) ? Buffer.from(html) : bytes;
    const f = await inspectSource(s, '.', fetcher);
    assert.equal(f.status, 'unchanged');
    assert.equal(issueAction(f, []).action, 'none');
    const old = await baselineRows(s);
    const delta = await newQuarter(s);
    assert.deepEqual(compare(s, csv(delta), '2026-Q1', old).newPeriods, ['2026-Q1']);
    assert.equal(compare(s, csv(delta), '2026-Q1', old).revised, 0);
    const revised = old.map(r => ({...r})); revised[0]['季指數'] = '151';
    assert.equal(compare(s, csv(revised), '2025-Q4', old).revised, 1);
  }
});
test('validation rejects schema changes, duplicates, bad values, periods and incomplete categories', async () => {
  const s=manifest.sources[0]; const rows=await newQuarter(s);
  assert.throws(() => validateRows(s, [{ wrong:'1' }], '2026-Q1'), /schema/);
  assert.throws(() => validateRows(s, rows.map(r=>{const next: Record<string,string>={...r,'季指數%':r['季指數']};delete next['季指數'];return next;}), '2026-Q1'), /schema/);
  const rent=manifest.sources[1];const rentRows=await newQuarter(rent);
  assert.throws(() => validateRows(rent,rentRows.map(r=>{const next: Record<string,string>={...r,'季變動率%':r['季變動率']};delete next['季變動率'];return next;}),'2026-Q1'),/schema/);
  assert.throws(() => validateRows(s, [...rows,rows[0]], '2026-Q1'), /Duplicate/);
  assert.throws(() => validateRows(s, rows.slice(1), '2026-Q1'), /coverage/);
  assert.throws(() => validateRows(s, rows.map(r=>({...r,'季指數':'150junk'})), '2026-Q1'), /numeric/);
  assert.throws(() => validateRows(s, rows, '2026-Q2'), /differs/);
  assert.throws(() => validateRows(s, rows.map(r=>({...r,'期別':'115Q5'})), '2026-Q1'), /quarter/);
  assert.throws(() => validateContinuity(['2025-Q4','2026-Q2']), /Missing quarterly/);
});
test('unavailable and incompatible findings retain snapshot, official identity fails closed', async () => {
  const s=manifest.sources[0];
  assert.throws(()=>officialUrl('https://example.com/data.csv'), /origin/);
  assert.throws(()=>discover(s,'Other source'), /identity/);
  const offline=await inspectSource(s,'.', async()=>{throw new Error('HTTP 503');});
  assert.equal(offline.status,'unavailable');
  const bad=await inspectSource(s,'.',async()=>Buffer.from('Not official CSV'));
  assert.equal(bad.status,'incompatible');
});
test('one issue per source is updated, identical open and closed findings never notify again', () => {
  const f: Finding={id:'price',title:'Price',sourceUrl:'https://data.taipei/',status:'updated',previousQuarter:'2025-Q4',latestQuarter:'2026-Q1',hash:'a',previousHash:'b',validation:'passed'};
  assert.equal(issueAction(f,[]).action,'create');
  for (const state of ['open','closed']) {
    const issue={number:9,state,body:notificationBody(f)};
    assert.equal(issueAction(f,[issue]).action,'none');
    assert.equal(issueAction({...f,hash:'revision'},[issue]).action,'update');
  }
  assert.equal(issueAction({...f,status:'unchanged'},[{number:9,state:'open',body:notificationBody(f)}]).action,'close');
});
test('older retained market revisions count changed records in their actual quarter', async () => {
  const s=manifest.sources[3];const rows=await readCsv(s.approvals[0].file);
  const revised=rows.map(r=>({...r}));revised[1]['提供查詢之買賣實價案件數_件']='999';
  const withNewerApproval={...s,approvals:[...s.approvals,{...s.approvals[0],period:'2025-Q3'}]};
  assert.equal(compare(withNewerApproval,csv(revised),'2025-Q2',rows).revised,1);
});
test('notification API paginates closed issues and makes no mutation for an identical finding', async t => {
  const f: Finding={id:'price',title:'Price',sourceUrl:'https://data.taipei/',status:'updated',previousQuarter:'2025-Q4',hash:'a',previousHash:'b',validation:'passed'};
  const calls: string[]=[];
  t.mock.method(globalThis,'fetch',async(input:string,init?:RequestInit)=>{
    calls.push(`${init?.method ?? 'GET'} ${input}`);
    const page=new URL(input).searchParams.get('page');
    const batch=page==='1'?Array.from({length:100},(_,i)=>({number:i,state:'closed',body:'unrelated'})):[{number:101,state:'closed',body:notificationBody(f)}];
    return new Response(JSON.stringify(batch),{status:200});
  });
  await notify([f],'synthetic-test-token','owner/repo');
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.startsWith('GET ')));
});
test('new-quarter series, latest snapshots, ranks and premiums use existing summary functions', async () => {
  const [price,rent,office]=await Promise.all(manifest.sources.slice(0,3).map(async s => [...await baselineRows(s),...await newQuarter(s)]));
  const p=buildResidentialPriceQuarterlyIndexSummary(convertResidentialPriceQuarterlyIndexRows(price));
  assert.equal(p.latestQuarterKey,'2026-Q1'); assert.equal(p.latestDistrictRanking.length,12);
  assert.equal(p.byQuarter.at(-1)?.citywideQuarterlyIndex,150);
  const r=buildResidentialRentIndexSummary(convertResidentialRentIndexRows(rent));
  assert.equal(r.latestQuarterKey,'2026-Q1'); assert.equal(r.latestByCategory.length,3);
  const o=buildCommercialOfficeRentIndexSummary(convertCommercialOfficeRentIndexRows(office));
  assert.equal(o.latestPeriod,'2026Q1'); assert.equal(o.latestByCategory.length,2);
  assert.ok(o.latestMajorRoadPremium);
});
test('staging executes existing converters for all four datasets; failed imports preserve approved bytes', async () => {
  await mkdir('.cache',{recursive:true});
  const root=await mkdtemp(resolve('.cache/quarterly-test-'));
  await cp('public/data',join(root,'public/data'),{recursive:true});
  await mkdir(join(root,'data'),{recursive:true});
  await writeFile(join(root,manifestPath),JSON.stringify(manifest));
  for (const s of manifest.sources) await cp(`data/raw/${s.id}`,join(root,'data/raw',s.id),{recursive:true});
  const before=sha256(await readFile(join(root,'public/data/real-price-summary.json')));
  for (const s of manifest.sources) {
    const rows=s.id==='quarterly-market-analysis' ? await readCsv(s.approvals[0].file) : await newQuarter(s);
    const bytes=csv(rows); const file=join(root,`${s.id}.csv`); await writeFile(file,bytes);
    const provenanceFile=join(root,`${s.id}.metadata.json`);
    const resourceUrl='https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=7465b5ab-58c7-45b9-b7e6-ed87e75892a9';
    await writeFile(provenanceFile,JSON.stringify({sourceUrl:resourceUrl,sha256:sha256(bytes),officialTitle:'臺北市114年第3季實價登錄動態分析'}));
    const options={id:s.id,file,period:s.id==='quarterly-market-analysis'?'2025-Q3':'2026-Q1',hash:sha256(bytes),sourceUrl:s.id==='quarterly-market-analysis'?resourceUrl:sourcePage(s),provenanceFile,root};
    if(s.id==='quarterly-market-analysis') {
      await assert.rejects(stageImport({...options,provenanceFile:undefined}),/provenance/);
      await assert.rejects(stageImport({...options,period:'2025-Q4'}),/metadata/);
    }
    await assert.rejects(stageImport({...options,hash:'bad',apply:true}),/SHA256/);
    const {stage,report}=await stageImport(options);
    assert.equal(report.applied,false);
    assert.equal(sha256(await readFile(join(root,'public/data/real-price-summary.json'))),before);
    const json=async(p:string)=>JSON.parse(await readFile(join(stage,'public/data',p),'utf8'));
    if(s.id==='quarterly-market-analysis') {
      const records=await json('quarterly-market-analysis.json');
      assert.equal(records.length,24);assert.equal(latestMarketRows(records).length,12);
      assert.equal((await json('quarterly-market-summary.json')).latestQuarter,'2025-Q3');
      assert.ok((await json('district-comparison-summary.json')).length);
    } else {
      const summary=await json(`${s.id}-summary.json`);
      assert.equal(summary.latestQuarterKey ?? summary.latestPeriod,s.id==='commercial-office-rent-index'?'2026Q1':'2026-Q1');
      const overview=await json('real-price-summary.json');
      const embedded=s.id==='residential-price-quarterly-index'?overview.residentialPriceQuarterlyIndex:s.id==='residential-rent-index'?overview.residentialRentIndex:overview.commercialOfficeRentIndex;
      assert.equal(embedded.latestQuarterKey ?? embedded.latestPeriod,s.id==='commercial-office-rent-index'?'2026Q1':'2026-Q1');
      const original=JSON.parse(await readFile(join(root,'public/data/real-price-summary.json'),'utf8'));
      const field=s.id==='residential-price-quarterly-index'?'residentialPriceQuarterlyIndex':s.id==='residential-rent-index'?'residentialRentIndex':'commercialOfficeRentIndex';
      delete original[field];delete overview[field];assert.deepEqual(overview,original);
    }
  }
});

test('explicit apply preserves raw history, rejects unreviewed revisions and detects edited approved bytes', async () => {
  const root=await mkdtemp(resolve('.cache/quarterly-apply-test-'));
  await cp('public/data',join(root,'public/data'),{recursive:true});
  await mkdir(join(root,'data'),{recursive:true});
  await writeFile(join(root,manifestPath),JSON.stringify(manifest));
  for (const s of manifest.sources) await cp(`data/raw/${s.id}`,join(root,'data/raw',s.id),{recursive:true});
  const s=manifest.sources[0];const rows=await newQuarter(s);const file=join(root,'candidate.csv');
  await writeFile(file,csv(rows));
  const options={id:s.id,file,period:'2026-Q1',hash:sha256(csv(rows)),sourceUrl:sourcePage(s),root,apply:true};
  await stageImport(options);
  assert.equal((await approvedRows(s.id,root)).rows.length,880);
  assert.equal(sha256(await readFile(join(root,s.approvals[0].file))),s.approvals[0].sha256);
  rows[0]['季指數']='155';await writeFile(file,csv(rows));
  await assert.rejects(stageImport({...options,hash:sha256(csv(rows))}),/allow-revision/);
  await stageImport({...options,hash:sha256(csv(rows)),allowRevision:true});
  assert.equal((await approvedRows(s.id,root)).rows.length,880);
  const current=(await readManifest(root)).sources[0].approvals.at(-1)!;
  await writeFile(join(root,current.file),'corrupted');
  await assert.rejects(approvedRows(s.id,root),/hash mismatch/);
});

test('deployment uses committed data and freshness/market charts consume dynamic latest periods', async () => {
  const deploy=await readFile('.github/workflows/deploy.yml','utf8');
  assert.doesNotMatch(deploy,/npm run data:(fetch|convert)/);
  assert.match(deploy,/npm run release:verify/);
  const app=await readFile('src/App.tsx','utf8');
  assert.match(app,/latestMarketRows\(data.quarterly\)/);
  const freshness=await readFile('src/DataFreshness.tsx','utf8');
  assert.match(freshness,/quarterly-market-summary.json.*s.latestQuarter/);
});

test('apply failure restores earlier files even when restoring the failed path also fails', async () => {
  const root=await mkdtemp(resolve('.cache/quarterly-rollback-'));
  await writeFile(join(root,'first.json'),'old'); await writeFile(join(root,'locked.json'),'old');
  const originals=new Map([['first.json',Buffer.from('old')],['locked.json',Buffer.from('old')]]);
  const staged=new Map([['first.json',Buffer.from('new')],['locked.json',Buffer.from('new')]]);
  const writer=async(path:string, bytes:Buffer) => {if(path.endsWith('locked.json'))throw new Error('EACCES');await writeFile(path,bytes);};
  await assert.rejects(applyStagedFiles(root,staged,originals,writer),/rollback attempted/);
  assert.equal(await readFile(join(root,'first.json'),'utf8'),'old');
  assert.equal(await readFile(join(root,'locked.json'),'utf8'),'old');
});
