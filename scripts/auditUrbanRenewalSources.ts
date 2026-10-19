import { readFile } from 'node:fs/promises';
import { SOURCE_SPECS, RAW_DIRECTORY, verifySource, type ProvenanceEntry } from './buildUrbanRenewalDecisionSnapshot.ts';

export async function auditUrbanRenewalSources() {
  const provenance=JSON.parse(await readFile(`${RAW_DIRECTORY}/provenance.json`,'utf8')) as {sources:ProvenanceEntry[]};
  const report=await Promise.all(SOURCE_SPECS.map(async spec=> {
    const entry=provenance.sources.find(source=>source.id===spec.id);
    if(!entry)throw new Error(`Missing source identity: ${spec.id}`);
    const rows=await verifySource(spec,entry,RAW_DIRECTORY);
    return {id:spec.id,datasetId:spec.datasetId,resourceId:spec.resourceId,sha256:entry.sha256,rowCount:rows.length,schema:Object.keys(rows[0]),geography:spec.geography,suitability:spec.suitability};
  }));
  console.log(JSON.stringify(report,null,2)); return report;
}
if(process.argv[1]?.endsWith('auditUrbanRenewalSources.ts'))await auditUrbanRenewalSources();
