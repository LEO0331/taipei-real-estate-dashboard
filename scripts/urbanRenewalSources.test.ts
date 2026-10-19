import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, mkdtemp, cp, rm, mkdir } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { parseCsv } from './data.ts';
import { SOURCE_SPECS, RAW_DIRECTORY, sha256, parseEvidenceDate, parseEvidenceMonth, assertSchema, convertAgeRows, convertDesignationRows, convertIncentiveRows, buildUrbanRenewalDecisionSnapshot, verifySource, missingEvidenceYears } from './buildUrbanRenewalDecisionSnapshot.ts';

async function cleanTestDirectory(directory:string) {
  const root=resolve('.omx/source-tests'),target=resolve(directory);
  if(!target.startsWith(root+sep))throw new Error('Unsafe source-test cleanup target');
  await rm(target,{recursive:true,force:true});
}
const readRows = async(id:string)=>parseCsv(await readFile(`${RAW_DIRECTORY}/${id}.csv`,'utf8'));

test('official provenance pins dataset/resource identity, catalogue identity, schema and original SHA256',async()=> {
  const provenance=JSON.parse(await readFile(`${RAW_DIRECTORY}/provenance.json`,'utf8'));
  for(const spec of SOURCE_SPECS) {
    const entry=provenance.sources.find((source:{id:string})=>source.id===spec.id);
    assert.ok((await verifySource(spec,entry,RAW_DIRECTORY)).length);
    await assert.rejects(verifySource(spec,{...entry,resourceId:'different-resource'},RAW_DIRECTORY),/identity/);
    await assert.rejects(verifySource(spec,{...entry,sha256:'0'.repeat(64)},RAW_DIRECTORY),/SHA256/);
  }
});
test('strict calendar validation handles ROC/Gregorian dates and month-only precision',()=> {
  assert.equal(parseEvidenceDate('113.2.29'),'2024-02-29');
  assert.equal(parseEvidenceDate('112.2.29'),null);
  assert.equal(parseEvidenceDate('1131332'),null);
  assert.equal(parseEvidenceDate('2024-02-29',false),'2024-02-29');
  assert.equal(parseEvidenceMonth('11306'),'2024-06');
  assert.equal(parseEvidenceMonth('11313'),null);
  assert.equal(parseEvidenceMonth('1136'),null);
});
test('schema drift and empty resources require re-audit',async()=> {
  const rows=await readRows('B');
  assert.throws(()=>assertSchema([{renamed:'value'}],SOURCE_SPECS[1].schema),/schema/);
  assert.throws(()=>assertSchema([],SOURCE_SPECS[1].schema),/schema/);
  assert.doesNotThrow(()=>assertSchema(rows,SOURCE_SPECS[1].schema));
});
test('citywide age coverage is never converted into district exposure',async()=> {
  const rows=convertAgeRows(await readRows('A'));
  assert.equal(rows.length,50);assert.equal(rows[0].year,1976);assert.equal(rows.at(-1)?.year,2025);
  assert.equal(rows.filter(row=>row.ageBreakdownValid).length,18);
  assert.equal(rows.find(row=>row.year===2006)?.age30Plus,null);
  assert.equal(rows.find(row=>row.year===2012)?.issue,'age_categories_do_not_sum_to_total');
  assert.equal(rows.at(-1)?.total,222459);assert.equal(rows.at(-1)?.age30Plus,202224);
  assert.ok(rows.every(row=>!('district'in row)&&!('riskTier'in row)));
});
test('real designation records establish 75 unique documents across 11 districts, current status unknown',async()=> {
  const rows=convertDesignationRows(await readRows('B'));
  assert.equal(rows.length,75);assert.equal(rows.filter(row=>row.valid).length,75);
  assert.equal(new Set(rows.map(row=>row.district)).size,11);
  assert.ok(rows.every(row=>row.currentStatus==='unknown'));
  assert.equal(rows.filter(row=>row.duplicate).length,0);
});
test('duplicate document identifiers are deduplicated; conflicting identity invalidates both records',async()=> {
  const [first]=await readRows('B');
  const identical=convertDesignationRows([first,first]);assert.equal(identical.filter(row=>row.duplicate).length,1);
  const conflicting=convertDesignationRows([first,{...first,'caseName（案名）':'different case'}]);
  assert.ok(conflicting.every(row=>!row.valid&&row.identityConflict));
});
test('missing district and invalid dates remain excluded instead of inferred from case descriptions',async()=> {
  const [first]=await readRows('B');
  const [missing]=convertDesignationRows([{...first,'areaName（行政區）':''}]);
  assert.equal(missing.district,null);assert.equal(missing.valid,false);
  const [badDate]=convertDesignationRows([{...first,'DocNo（文號）':'112.2.30府都新字第1126017199號'}]);
  assert.equal(badDate.actionDate,null);assert.equal(badDate.valid,false);
});
test('incentive Region is citywide; case and square-metre units remain separate',async()=> {
  const rows=await readRows('C'), converted=convertIncentiveRows(rows);
  assert.equal(converted.length,24);assert.equal(converted[0].year,2002);assert.equal(converted.at(-1)?.year,2025);
  assert.equal(converted.at(-1)?.approvedCases,36);assert.equal(converted.at(-1)?.bonusFloorAreaSqm,150927.7);
  assert.throws(()=>convertIncentiveRows([{...rows[0],Region:'大安區'}]),/Region/);
});
test('offline conversion reproduces byte-identical immutable snapshot for the same audited input',async()=> {
  await mkdir('.omx/source-tests',{recursive:true});
  const dir=await mkdtemp(join('.omx/source-tests','reproduction-'));
  try {
    const one=await buildUrbanRenewalDecisionSnapshot(RAW_DIRECTORY,dir);const text=await readFile(join(dir,'snapshot.json'),'utf8');
    const two=await buildUrbanRenewalDecisionSnapshot(RAW_DIRECTORY,dir);
    assert.equal(await readFile(join(dir,'snapshot.json'),'utf8'),text);assert.deepEqual(one,two);
    assert.equal(one.buildingAge.districtAgeAvailable,false);
    assert.deepEqual(one.renewalUnits.unrepresentedDistricts,['信義區']);
    assert.equal(one.renewalUnits.stage,'renewal_unit_designation_approved');
    assert.equal(one.renewalUnits.currentStatus,'unknown');
    assert.equal(one.permitContext.totalRecords,8855);
    const analyticalText=JSON.stringify({...one,sources:[]});
    assert.ok(!analyticalText.includes('caseName')&&!analyticalText.includes('Description')&&!analyticalText.includes('latitude')&&!analyticalText.includes('longitude'));
    assert.ok(!text.includes('立農段')&&!text.includes('401地號'));
  } finally { await cleanTestDirectory(dir); }
});
test('failed refresh, changed source bytes and schema drift preserve the last-known-good public snapshot',async()=> {
  await mkdir('.omx/source-tests',{recursive:true});
  const dir=await mkdtemp(join('.omx/source-tests','preservation-'));
  try {
    const raw=join(dir,'raw'),out=join(dir,'output');await cp(RAW_DIRECTORY,raw,{recursive:true});
    await buildUrbanRenewalDecisionSnapshot(raw,out);const before=await readFile(join(out,'snapshot.json'),'utf8');
    await writeFile(join(raw,'B.csv'),'invalid refresh');
    await assert.rejects(buildUrbanRenewalDecisionSnapshot(raw,out),/SHA256/);
    assert.equal(await readFile(join(out,'snapshot.json'),'utf8'),before);
    const provenance=JSON.parse(await readFile(join(raw,'provenance.json'),'utf8'));
    provenance.sources.find((row:{id:string})=>row.id==='B').sha256=sha256('invalid refresh');
    await writeFile(join(raw,'provenance.json'),JSON.stringify(provenance));
    await assert.rejects(buildUrbanRenewalDecisionSnapshot(raw,out),/schema/);
    assert.equal(await readFile(join(out,'snapshot.json'),'utf8'),before);
  } finally {await cleanTestDirectory(dir);}
});

test('missing reporting years are explicitly identified rather than imputed',()=>{assert.deepEqual(missingEvidenceYears([2020,2022,2023]),[2021]);});

test('a malformed duplicate cannot consume the valid identity in either input order',async()=> {
  const [first]=await readRows('B');
  const invalid={...first,'DocNo（文號）':first['DocNo（文號）'].replace('112.11.20','112.2.30')};
  const retained=(rows:ReturnType<typeof convertDesignationRows>)=>rows.filter(row=>row.valid&&!row.duplicate);
  const forward=retained(convertDesignationRows([invalid,first]));
  const reverse=retained(convertDesignationRows([first,invalid]));
  assert.equal(forward.length,1);assert.deepEqual(forward,reverse);
  const mismatch=convertDesignationRows([{...first,'民國年月':'11210'}])[0];
  assert.equal(mismatch.periodMismatch,true);assert.equal(mismatch.valid,false);
});
