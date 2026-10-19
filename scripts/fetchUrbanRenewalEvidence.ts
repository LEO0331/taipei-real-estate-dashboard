import { mkdir, readFile, writeFile, rename, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { SOURCE_SPECS, RAW_DIRECTORY, sha256, verifySource, type ProvenanceEntry } from './buildUrbanRenewalDecisionSnapshot.ts';

// Intentional acquisition only: never runs unrelated dashboard fetchers. Every staged
// resource is checked against its official catalogue, expected identity and exact schema.
export async function fetchUrbanRenewalEvidence() {
  await mkdir(RAW_DIRECTORY,{recursive:true});
  const existing=JSON.parse(await readFile(join(RAW_DIRECTORY,'provenance.json'),'utf8')) as {sources:ProvenanceEntry[]};
  if(!process.argv.includes('--force')) {
    for(const spec of SOURCE_SPECS) await verifySource(spec,existing.sources.find(source=>source.id===spec.id)!,RAW_DIRECTORY);
    console.log('Audited raw sources are present and valid; use --force for intentional refresh.'); return;
  }
  const staging=await mkdtemp(join(RAW_DIRECTORY,'.refresh-'));
  try {
    const timestamp=new Date().toISOString(); const sources:ProvenanceEntry[]=[];
    for(const spec of SOURCE_SPECS) {
      const resourceUrl='resourceUrl'in spec?spec.resourceUrl:`https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${spec.resourceId}`;
      const download=async(url:string)=> {
        const response=await fetch(url,{signal:AbortSignal.timeout(45_000)});
        if(!response.ok) throw new Error(`${spec.id}: HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
      };
      const catalogue=await download(`https://data.taipei/dataset/detail?id=${spec.datasetId}`);
      const bytes=await download(resourceUrl);
      const audited=existing.sources.find(source=>source.id===spec.id);
      if(!audited || sha256(bytes)!==audited.sha256) throw new Error('Official resource version changed; re-audit before replacing pinned evidence');
      for(const date of [spec.resourceUpdatedAt,spec.metadataUpdatedAt]) {
        if(date && !catalogue.toString('utf8').includes(date.replace('T',' ').replace('+08:00',''))) throw new Error('Official source date changed; re-audit required');
      }
      await writeFile(join(staging,`${spec.id}.csv`),bytes);
      await writeFile(join(staging,`${spec.id}-catalogue.html`),catalogue);
      const entry={id:spec.id,datasetId:spec.datasetId,resourceId:spec.resourceId,resourceUrl,file:`${spec.id}.csv`,sha256:sha256(bytes),catalogueSha256:sha256(catalogue),retrievedAt:timestamp,processedAt:timestamp};
      await verifySource(spec,entry,staging); sources.push(entry);
    }
    await writeFile(join(staging,'provenance.json'),JSON.stringify({schemaVersion:'1.0.0',sources},null,2)+'\n');
    for(const entry of sources) {
      for(const file of [entry.file,`${entry.id}-catalogue.html`]) await rename(join(staging,file),join(RAW_DIRECTORY,file));
    }
    // Metadata is committed last; an interrupted acquisition cannot silently validate
    // mixed versions. Public conversion remains a separate all-inputs-validated step.
    await rename(join(staging,'provenance.json'),join(RAW_DIRECTORY,'provenance.json'));
    console.log(`Acquired ${sources.length} official evidence sources. Run the offline snapshot converter.`);
  } finally {
    const root=resolve(RAW_DIRECTORY),target=resolve(staging);
    if(!target.startsWith(root+sep)) throw new Error('Unsafe refresh cleanup target');
    await rm(target,{recursive:true,force:true});
  }
}
if(process.argv[1]?.endsWith('fetchUrbanRenewalEvidence.ts')) await fetchUrbanRenewalEvidence();
