import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCsv, type CsvRow } from './data.ts';
import { DISTRICTS } from '../src/models.ts';

export const RAW_DIRECTORY = 'data/raw/urban-renewal-decision';
export const OUTPUT_DIRECTORY = 'public/data/urban-renewal-decision';
export const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
export const SOURCE_SPECS = [
  { id: 'A', datasetId: '7889e8a0-a71e-44e0-95c7-2213a7db1474', resourceId: '53e04f4c-e546-462e-b509-0fc7225a3ebd', title: '臺北市現有營造建築物棟數', publisher: '臺北市政府主計處', resourceUrl: 'https://tsis.dbas.gov.taipei/statis/webMain.aspx?compmode=0&cycle=4&deflst=2&funid=a05019201&kind=21&nzo=1&outkind=1&outmode=12&sys=220&type=0&ymf=6500', publishedAt: null, resourceUpdatedAt: '2026-02-26T10:04:37+08:00', metadataUpdatedAt: '2026-02-26T10:05:18+08:00', geography: 'citywide', unit: 'buildings', suitability: 'context_only', schema: ['統計期','總數量[棟]','樓層別/平房數量[棟]','樓層別/2層數量[棟]','樓層別/3層數量[棟]','樓層別/4層數量[棟]','樓層別/5~6層數量[棟]','樓層別/7~9層數量[棟]','樓層別/10~12層數量[棟]','樓層別/13~15層數量[棟]','樓層別/16層以上數量[棟]','屋齡別/未滿30年數量[棟]','屋齡別/30年以上數量[棟]'] },
  { id: 'B', datasetId: '4bf19a69-86e7-40cb-93e2-a45dc7037f34', resourceId: '8b7a3b60-a45a-4d0f-96df-2529dd04d6cc', title: '臺北市已核准自行劃定更新單元案件', publisher: '都發局更新處', publishedAt: null, resourceUpdatedAt: '2024-06-13T12:19:19+08:00', metadataUpdatedAt: '2026-09-08T14:53:00+08:00', geography: 'district', unit: 'approved_renewal_unit_designation_documents', suitability: 'verified_analysis', schema: ['民國年月','areaName（行政區）','DocNo（文號）','caseName（案名）','Description（內容）'] },
  { id: 'C', datasetId: 'cda6b568-0035-420b-bd05-6ca9bfd4bda0', resourceId: '01dc6879-2e74-4e74-a033-43674c7af019', title: '臺北市都市更新容積獎勵案件統計表', publisher: '都發局更新處', publishedAt: null, resourceUpdatedAt: '2026-03-26T09:32:52+08:00', metadataUpdatedAt: '2026-09-08T15:18:40+08:00', geography: 'citywide', unit: 'approved_incentive_cases_and_bonus_square_metres', suitability: 'context_only', schema: ['Year（西元年）','Quantity（核定案件數量）','Area（總計獲得容積獎勵單位平方公尺）','Region','CountyCode'] },
  { id: 'E', datasetId: 'dbe02285-8d6e-4b3d-97d7-700047cbe4da', resourceId: 'a2aff1bf-3484-449f-9438-167e6a7bce25', title: '臺北市都市更新審議會議程及紀錄', publisher: '都發局更新處', publishedAt: null, resourceUpdatedAt: '2026-07-13T10:49:49+08:00', metadataUpdatedAt: '2026-09-08T13:58:38+08:00', geography: 'document', unit: 'meeting_metadata_rows', suitability: 'context_only', schema: ['民國年','民國年月日（民國日期）','agenda（議程）','record（會議記錄）','CountyCode'] },
] as const;

export function parseEvidenceDate(raw: string, roc = true): string | null {
  const cleaned = raw.trim().replace(/年|月|\./g, '-').replace(/日$/, '');
  const compact = cleaned.match(/^(\d{3})(\d{2})(\d{2})$/);
  const match = compact ?? cleaned.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]) + (roc ? 1911 : 0), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1912 && month >= 1 && month <= 12 && day >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0,10) : null;
}
export function parseEvidenceMonth(raw: string): string | null {
  const match = raw.match(/^(\d{3})(\d{2})$/);
  return match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? `${Number(match[1])+1911}-${match[2]}` : null;
}
export function assertSchema(rows: CsvRow[], expected: readonly string[]) {
  if (!rows.length || JSON.stringify(Object.keys(rows[0])) !== JSON.stringify(expected)) throw new Error('Source schema changed or empty source; audit required');
}
function number(raw: string, integer = true) {
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`Invalid numeric source field: ${raw}`);
  const value = Number(raw);
  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) throw new Error('Invalid numeric unit');
  return value;
}
export function missingEvidenceYears(years: number[]) { const unique = new Set(years); return Array.from({length:Math.max(...years)-Math.min(...years)+1},(_,i)=>Math.min(...years)+i).filter(y=>!unique.has(y)); }
export function convertAgeRows(rows: CsvRow[]) {
  assertSchema(rows, SOURCE_SPECS[0].schema);
  return rows.map(row => {
    const match = row['統計期'].match(/^(\d{2,3})年$/); if (!match) throw new Error('Invalid building stock period');
    const year = Number(match[1])+1911, total = number(row['總數量[棟]']), young = number(row['屋齡別/未滿30年數量[棟]']), old = number(row['屋齡別/30年以上數量[棟]']);
    const issue = young + old === 0 && total > 0 ? 'age_breakdown_unavailable' : young + old !== total ? 'age_categories_do_not_sum_to_total' : null;
    return { year, total, under30: issue ? null : young, age30Plus: issue ? null : old, ageBreakdownValid: !issue, issue };
  }).sort((a,b)=>a.year-b.year);
}
export function convertDesignationRows(rows: CsvRow[]) {
  assertSchema(rows, SOURCE_SPECS[1].schema);
  const records = rows.map(row => {
    const raw = row['DocNo（文號）'].trim();
    const actionDate = parseEvidenceDate(raw.match(/^(\d{3}\.\d{1,2}\.\d{1,2})/)?.[1] ?? '');
    const month = parseEvidenceMonth(row['民國年月']);
    const districtRaw = row['areaName（行政區）'].trim();
    const district = DISTRICTS.find(d => d === districtRaw || d === `${districtRaw}區`) ?? null;
    const identifier = raw.match(/府都新字第(\d{10})號?$/)?.[1] ?? null;
    const signature = JSON.stringify([district, row['caseName（案名）'].trim(),actionDate,month]);
    return {district,actionDate,month,identifier,signature,duplicate:false,identityConflict:false,periodMismatch:Boolean(actionDate && month && !actionDate.startsWith(month)),valid:Boolean(district && actionDate && month && identifier && actionDate.startsWith(month)),currentStatus:'unknown' as const};
  });
  const identifiers = new Set(records.map(row=>row.identifier).filter(Boolean));
  for (const identifier of identifiers) {
    const group = records.filter(row=>row.identifier===identifier);
    const valid = group.filter(row=>row.valid);
    const conflict = new Set(valid.map(row=>row.signature)).size > 1;
    // Invalid rows cannot consume a valid document's identity. Identical valid
    // representatives have the same analytical fields regardless of input order.
    const canonical = [...group].sort((a,b)=>Number(b.valid)-Number(a.valid)||a.signature.localeCompare(b.signature))[0];
    for (const row of group) {
      row.duplicate = row !== canonical;
      row.identityConflict = conflict;
      if (conflict) row.valid = false;
    }
  }
  return records.map(({signature: _signature,...record})=>record);
}
export function convertIncentiveRows(rows: CsvRow[]) {
  assertSchema(rows, SOURCE_SPECS[2].schema);
  return rows.map(row=> {
    if (!['台北市','臺北市'].includes(row.Region) || row.CountyCode !== '63000') throw new Error('Unverified incentive Region: district join prohibited');
    return {year:number(row['Year（西元年）']),approvedCases:number(row['Quantity（核定案件數量）']),bonusFloorAreaSqm:number(row['Area（總計獲得容積獎勵單位平方公尺）'],false)};
  }).sort((a,b)=>a.year-b.year);
}
export type ProvenanceEntry = {id:string;datasetId:string;resourceId:string;resourceUrl:string;file:string;sha256:string;retrievedAt:string;processedAt:string;catalogueSha256:string};
export async function verifySource(spec: typeof SOURCE_SPECS[number], entry: ProvenanceEntry, rawDirectory: string) {
  const expectedUrl = 'resourceUrl' in spec ? spec.resourceUrl : `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${spec.resourceId}`;
  if (!entry) throw new Error(`Source ${spec.id} provenance missing`);
  if (entry.id !== spec.id || entry.datasetId !== spec.datasetId || entry.resourceId !== spec.resourceId || entry.resourceUrl !== expectedUrl || entry.file !== `${spec.id}.csv`) throw new Error(`Source ${spec.id} resource identity changed; audit required`);
  const bytes = await readFile(join(rawDirectory,entry.file));
  if (sha256(bytes) !== entry.sha256) throw new Error(`Source ${spec.id} SHA256 mismatch`);
  const catalogue = await readFile(join(rawDirectory,`${spec.id}-catalogue.html`));
  if (sha256(catalogue) !== entry.catalogueSha256 || !catalogue.includes(Buffer.from(spec.datasetId)) || !catalogue.includes(Buffer.from(spec.resourceId))) throw new Error(`Source ${spec.id} catalogue identity mismatch`);
  const rows = parseCsv(bytes.toString('utf8')); assertSchema(rows,spec.schema); return rows;
}

export async function buildUrbanRenewalDecisionSnapshot(rawDirectory = RAW_DIRECTORY, outputDirectory = OUTPUT_DIRECTORY) {
  const provenance = JSON.parse(await readFile(join(rawDirectory,'provenance.json'),'utf8')) as {sources:ProvenanceEntry[]};
  const inputs = await Promise.all(SOURCE_SPECS.map(async spec=>({spec,entry:provenance.sources.find(e=>e.id===spec.id)!,rows:await verifySource(spec,provenance.sources.find(e=>e.id===spec.id)!,rawDirectory)})));
  const age = convertAgeRows(inputs[0].rows), designations = convertDesignationRows(inputs[1].rows), incentives = convertIncentiveRows(inputs[2].rows);
  if (!designations.some(r=>r.valid)) throw new Error('No valid district evidence; preserve previous snapshot');
  if (new Set(age.map(r=>r.year)).size !== age.length || new Set(incentives.map(r=>r.year)).size !== incentives.length) throw new Error('Duplicated annual statistics; audit required');
  const meetingDates = inputs[3].rows.map(row=>parseEvidenceDate(row['民國年月日（民國日期）']));
  const valid = designations.filter(r=>r.valid && !r.duplicate);
  const dates = valid.map(r=>r.actionDate!).sort();
  const districts = DISTRICTS.flatMap(district=> {
    const records = valid.filter(r=>r.district===district); if (!records.length) return [];
    const actions=records.map(r=>r.actionDate!).sort();
    return [{district,recordCount:records.length,uniqueDocuments:new Set(records.map(r=>r.identifier)).size,earliestActionDate:actions[0],latestActionDate:actions.at(-1)!,unknownCurrentStatusCount:records.length,identityIssueCount:designations.filter(r=>r.district===district && (!r.valid || r.identityConflict || r.periodMismatch || r.duplicate)).length}];
  });
  const limitations = ['Citywide age statistics cannot establish district aging exposure.','Designation approval is not business-plan approval, rights-transformation approval, construction or completion.','Current case status is unknown; absent public linkage does not establish inactivity or absent government records.','Renewal and dangerous/old-building reconstruction have separate legal pathways.','Permit records describe administrative flow, not existing building stock.','Published source coverage is partial; absent district records are unknown, not zero cases.','Citywide incentive counts and designation documents describe different administrative populations.'];
  const sources = inputs.map(({spec,entry,rows})=> {
    const period = spec.id==='A' ? age.map(r=>String(r.year)) : spec.id==='B' ? dates : spec.id==='C' ? incentives.map(r=>String(r.year)) : meetingDates.filter((d):d is string=>Boolean(d)).sort();
    const duplicateCount = spec.id==='B' ? designations.filter(r=>r.duplicate).length : rows.length-new Set(rows.map(r=>JSON.stringify(r))).size;
    return {...spec,url:`https://data.taipei/dataset/detail?id=${spec.datasetId}`,resourceUrl:entry.resourceUrl,retrievedAt:entry.retrievedAt,processedAt:entry.processedAt,sha256:entry.sha256,schema:[...spec.schema],rowCount:rows.length,validRowCount:spec.id==='B'?valid.length:spec.id==='E'?meetingDates.filter(Boolean).length:rows.length,duplicateCount,invalidDateCount:spec.id==='B'?designations.filter(r=>!r.actionDate||!r.month).length:spec.id==='E'?meetingDates.filter(d=>!d).length:0,missingDistrictCount:spec.id==='B'?designations.filter(r=>!r.district).length:null,periodStart:period[0]??null,periodEnd:period.at(-1)??null,limitations:spec.id==='A'?['Citywide only; no district age allocation.',`${age.filter(r=>!r.ageBreakdownValid).length} annual age breakdowns unavailable or non-comparable.`,`Missing years: ${missingEvidenceYears(age.map(r=>r.year)).join(',')||'none'}.`]:spec.id==='B'?['Designation stage only; current later-stage status unknown.','11 published districts; no 信義區 row does not mean zero cases.',`${designations.filter(r=>r.periodMismatch).length} reporting-month/action-date mismatches.`]:spec.id==='C'?['Region is citywide Taipei; not district.','Counts and square metres are separate units.','Not completed housing supply.',`Missing years: ${missingEvidenceYears(incentives.map(r=>r.year)).join(',')||'none'}.`]:['Proceedings metadata only; no final case outcomes inferred.']};
  });
  // Retain the audited bytes independently of platform checkout line endings
  // and subsequent refreshes of the separate dashboard pipelines.
  const permitSummary = JSON.parse(await readFile(join(rawDirectory,'D-summary.json'),'utf8'));
  const permitDistricts = JSON.parse(await readFile(join(rawDirectory,'D-district-summary.json'),'utf8')) as {district:string;recordCount:number}[];
  const referenceFiles = JSON.parse(await readFile(join(rawDirectory,'existing-source-hashes.json'),'utf8')) as {file:string;sha256:string}[];
  for(const file of referenceFiles) {
    const pinnedPath = file.file.startsWith(RAW_DIRECTORY + '/') ? join(rawDirectory,file.file.slice(RAW_DIRECTORY.length + 1)) : file.file;
    if(sha256(await readFile(pinnedPath))!==file.sha256) throw new Error('Existing source bytes changed; re-audit required');
  }
  const referenceSources = JSON.parse(await readFile(join(rawDirectory,'reference-sources.json'),'utf8'));
  for (const [id,file] of [['D',join(rawDirectory,'D-summary.json')],['G',join(rawDirectory,'G.csv')],['F',join(rawDirectory,'F.html')]]) {
    const reference = referenceSources.find((source: {id:string})=>source.id===id);
    if (!reference || sha256(await readFile(file)) !== reference.sha256) throw new Error('Retained reference source hash changed; re-audit required');
  }
  const body = {schemaVersion:'1.0.0',methodologyVersion:'urban-renewal-evidence-review-v1',configurationVersion:'1.0.0',generatedAt:provenance.sources[0].processedAt,analysisAsOf:new Date(Date.parse(provenance.sources[0].processedAt)+8*60*60*1000).toISOString().slice(0,10),sources:[...sources,...referenceSources].sort((a,b)=>a.id.localeCompare(b.id)),buildingAge:{geography:'citywide',districtAgeAvailable:false,unit:'buildings',rows:age},renewalUnits:{sourceId:'B',stage:'renewal_unit_designation_approved',currentStatus:'unknown',totalRows:designations.length,uniqueDocuments:valid.length,periodStart:dates[0],periodEnd:dates.at(-1),districts,unrepresentedDistricts:DISTRICTS.filter(d=>!districts.some(row=>row.district===d))},incentives:{geography:'citywide',unitCases:'approved_incentive_cases',unitArea:'square_metres',rows:incentives},permitContext:{totalRecords:permitSummary.totalRecords,minYear:permitSummary.minPermitYearGregorian,maxYear:permitSummary.maxPermitYearGregorian,latestIssueDate:permitSummary.maxIssueDate,missingDistrictRecords:permitSummary.recordsMissingDistrict,districts:permitDistricts.map(({district,recordCount})=>({district,recordCount}))},limitations};
  const snapshot={snapshotId:`ure-${sha256(JSON.stringify(body)).slice(0,16)}`,...body};
  await mkdir(outputDirectory,{recursive:true});
  // All source reads and validation happen before any public file is touched. Snapshot is the
  // sole browser data dependency and is replaced with a same-directory atomic rename.
  const snapshotText=JSON.stringify(snapshot,null,2)+'\n';
  const temporary=join(outputDirectory,'snapshot.json.tmp');
  const healthTemporary=join(outputDirectory,'source-health.json.tmp');
  await writeFile(temporary,snapshotText);
  await writeFile(healthTemporary,JSON.stringify(snapshot.sources,null,2)+'\n');
  await rename(healthTemporary,join(outputDirectory,'source-health.json'));
  await rename(temporary,join(outputDirectory,'snapshot.json'));
  return snapshot;
}
if (process.argv[1]?.endsWith('buildUrbanRenewalDecisionSnapshot.ts')) {
  const snapshot=await buildUrbanRenewalDecisionSnapshot();
  console.log(`Built ${snapshot.snapshotId}: ${snapshot.renewalUnits.uniqueDocuments} designation documents; ${snapshot.renewalUnits.districts.length} districts; citywide age only.`);
}
