# Urban renewal official-source feasibility audit

Audited 2026-10-19 (Asia/Taipei). Source acquisition is intentionally scoped to A/B/C/E; no full data refresh. Official catalogue URLs A–G and the FAQ were read with the web tool. Resource bytes were acquired directly from the official resource links and retained under `data/raw/urban-renewal-decision/`. Machine-readable provenance and exact hashes/schema/quality counts are generated in `source-health.json` and `provenance.json`.

## Feasibility gate — completed before decision ranking design

- **A: citywide context only.** The actual resource contains 50 annual rows, ROC 65–114 (1976–2025), no district field. Unit is source-labelled 棟 (buildings), not dwellings or permits. Columns distinguish 未滿30年 (under 30) and 30年以上 (30 and over). 1976–2006 publish zero in both age fields despite positive total stock; these are unavailable age breakdowns, never zero old buildings. 2007–2025 contain age values, but 2012 age categories do not sum to total (232005 versus 232783); preserve raw counts and mark that age breakdown non-comparable. No district building-age ranking or allocation is supported.
- **B: verified district administrative evidence with limited scope.** 75 rows, 11 represented districts, reporting months 2023-02–2024-06; no 信義 district row. Missing districts/periods are unknown coverage, never zero real-world cases. The resource has document identifiers and case descriptions but no authoritative current lifecycle field. A designation approval is only designation approval. Later-stage status is unknown. No property descriptions or names enter the public decision snapshot.
- **C: citywide annual administrative context.** 24 rows, 2002–2025. `Region` is consistently 台北市 and `CountyCode` 63000, not a district. Quantity is approved incentive cases; Area is square metres awarded as floor-area incentive. These are separate units, not completed supply, and cannot be reconciled as the denominator of B.
- **D: existing audited permit aggregates only.** 8,855 permit records, 2001–2026; 8,830 attributed to 12 districts and 25 unattributed; recorded issue dates 2001-01-03–2026-05-29. Permit flow is not existing stock; no names/address joins or detailed records are copied.
- **E: context only.** The acquired CSV has 117 meeting rows and agenda/record document links, not case-level final decisions or stable cross-stage case linkage. Meeting mentions cannot establish approval/rejection/completion.
- **F: context only.** The official public lookup describes parcel/address/road queries and warns actual progress controls. No documented supported bulk API or reliable linked case-history source was validated. Human lookup only; no bulk scraping.
- **G: context only.** Existing regulation list and official FAQ explain different legal pathways for urban renewal and accelerated dangerous/old-building reconstruction. Historical regulation rows do not establish current validity, eligibility, owner consent or individual safety.

## Catalogue identity, publisher and dates

|Source|Dataset ID / resource ID|Publisher|Catalogue resource last-modified (first publication unknown)|Catalogue metadata update|Suitability|
|---|---|---|---|---|---|
|A|7889e8a0-a71e-44e0-95c7-2213a7db1474 / 53e04f4c-e546-462e-b509-0fc7225a3ebd (official TSIS a05019201 query)|臺北市政府主計處|System-fed; resource modified 2026-02-26 10:04:37; first publication unavailable|2026-02-26 10:05:18|context_only|
|B|4bf19a69-86e7-40cb-93e2-a45dc7037f34 / 8b7a3b60-a45a-4d0f-96df-2529dd04d6cc|都發局更新處|2024-06-13 12:19:19|2026-09-08 14:53:00|verified_analysis (designation evidence only)|
|C|cda6b568-0035-420b-bd05-6ca9bfd4bda0 / 01dc6879-2e74-4e74-a033-43674c7af019|都發局更新處|2026-03-26 09:32:52|2026-09-08 15:18:40|context_only|
|D|c876ff02-af2e-4eb8-bd33-d444f5052733 / existing pipeline resource|都發局建管處|2026-02-23 15:43:01 catalogue date; existing snapshot retained|2026-07-27 16:22:31|context_only|
|E|dbe02285-8d6e-4b3d-97d7-700047cbe4da / a2aff1bf-3484-449f-9438-167e6a7bce25|都發局更新處|2026-07-13 10:49:49|2026-09-08 13:58:38|context_only|
|F|No dataset/resource ID (public lookup page)|臺北市都市更新處|Page update 2026-09-14; not case freshness|Not applicable|context_only|
|G|6bc30ace-9322-412c-9092-aa151bdf4a03 / 0670e3bd-04a5-4659-99c3-7702f78999d6; separate official FAQ|都發局更新處|2026-07-09 15:48:12 catalogue resource date|2026-09-08 14:09:33|context_only|

## Official links

- [A — existing buildings](https://data.taipei/dataset/detail?id=7889e8a0-a71e-44e0-95c7-2213a7db1474)
- [B — approved self-designated units](https://data.taipei/dataset/detail?id=4bf19a69-86e7-40cb-93e2-a45dc7037f34)
- [C — incentive statistics](https://data.taipei/dataset/detail?id=cda6b568-0035-420b-bd05-6ca9bfd4bda0)
- [D — use permits](https://data.taipei/dataset/detail?id=c876ff02-af2e-4eb8-bd33-d444f5052733)
- [E — meeting proceedings](https://data.taipei/dataset/detail?id=dbe02285-8d6e-4b3d-97d7-700047cbe4da)
- [F — human progress lookup](https://gis.uro.taipei/r_progress.aspx)
- [G — regulations](https://data.taipei/dataset/detail?id=6bc30ace-9322-412c-9092-aa151bdf4a03)
- [Official explanation of renewal versus dangerous/old building reconstruction](https://uro.gov.taipei/News_Content.aspx?n=5E79553CBBAE8DFB&s=0245995C5DF74EF8&sms=87415A8B9CE81B16)

## Reproducibility and interpretation

Source catalogue update ≠ resource publication ≠ case action date ≠ retrieval ≠ processing date. Retrieval and processing timestamps are frozen in provenance rather than regenerated during offline conversion. SHA256 validates original bytes; source and resource IDs plus exact ordered headers guard identity and schema. The public snapshot contains district aggregates and annual city context only. Raw CSV files preserve official strings, including administrative descriptions, solely for auditable offline conversion. No fuzzy matching, geocoding, ownership inference, structural-risk tier or legal eligibility model is used.

The conversion validates all sources before atomically replacing the last good snapshot. Failure must throw and leave the public snapshot byte-for-byte unchanged. Unknown current status is a public-data linkage gap, not evidence that the authority lacks operational records or that a case is inactive.


## Audited integrity and quality results

Retrieval / frozen processing: 2026-10-19T06:32:25.000Z. For retained D/G, original retrieval is unknown; this timestamp documents inspection of the retained file, as explicitly stated in source limitations.

|Source|Original source SHA256|Rows|Valid rows|Exact / identity duplicates|Invalid dates|Geography / coverage|
|---|---|---:|---:|---:|---:|---|
|A|8f471e3d2ab5ef6e17d5b7408a74b370458cc12870de57e0dced2fc086c2bde4|50|50 total-stock observations; 18 comparable age breakdowns|0|0|City, 1976–2025; age 2007–2025 excluding 2012|
|B|a75b1c4cb6bd10e73267683addfaa357c5c94ef32d32e9b6692aa257cfca131b|75|75|0 document IDs; 75 distinct exact case labels|0|11 districts, 2023-02-01–2024-06-05|
|C|700ededa40e0e2c073ff53c750593528c2b605d3cc51f71b567fd0840b74fb62|24|24|0|0|City, 2002–2025; no missing annual years|
|D|Multiple retained XML originals: see existing-source-hashes.json; source-health SHA256 pins safe aggregate|8855|8830 district-attributed; 25 unattributed|Unknown (not recomputed from originals)|Unknown (aggregate summary only)|12 districts, permit years 2001–2026|
|E|464fbfdcdf39051fe8ca2b6e2212b334b0dc6b1a6d928be1a2916b030eca8cfe|117|117 dated meeting rows|0 exact rows|0|Document/city metadata, 2024-01-08–2026-07-13|
|F|See source-health.json for retained page hash|Not applicable|Not applicable|Not applicable|Not applicable|Human lookup only; no case-period completeness claim|
|G|See source-health.json and existing-source-hashes.json for retained regulation/FAQ hashes|37 regulation rows|37 date-valid rows|0 sequence IDs|0|Historical regulatory list, 2008-07-30–2024-11-26|

B has no invalid/missing district, no missing document ID, and no reporting-month/action-date mismatch in this version. It has no current-status field at all; all 75 later-stage status questions remain unknown. Distinct exact case labels do not provide authoritative linkage across future renamed cases; no fuzzy matching is performed. E contains three literal-null meeting-record entries; proceedings remain context even when links are present. Missing B months such as 2024-04 are not imputed; no resource claim establishes a complete census of renewal cases.

## Refresh / offline reproduction

The retained G raw CSV has 37 dated rows (2008-07-30–2024-11-26), while the pre-existing generated regulation-directory module has a separately shipped 37-row snapshot (1997-07-30–2023-06-16). These are different retained versions, not a synchronized legal-status register. This feature pins its inspected G raw reference and does not silently regenerate the existing directory. Neither version establishes current validity; reconciliation with the authority remains a research question.

- Intentional acquisition: `npx tsx scripts/fetchUrbanRenewalEvidence.ts`. Valid existing audited files are retained; `--force` permits an intentional acquisition, but changed bytes or catalogue source dates require a new explicit audit and fail closed. This avoids attaching old audited date semantics to a new resource version.
- Integrity/schema audit: `npx tsx scripts/auditUrbanRenewalSources.ts`.
- Offline conversion: `npx tsx scripts/buildUrbanRenewalDecisionSnapshot.ts`.
- Focused verification: `node --import tsx --test scripts/urbanRenewalSources.test.ts`.

Twelve focused source tests passed, including missing-year coverage. The OS sandbox denied atomic rename under the machine temporary directory; workspace-local temporary test artifacts resolved that environment restriction. Source acquisition required the authorized network execution path because default sandbox DNS could not resolve the official domains. No alternative, unofficial resource was substituted.

### Checkout byte preservation

`.gitattributes` disables Git newline conversion and text diffing only for audited raw CSV/HTML and the retained D aggregate JSON bytes. D-summary, D-district-summary and G.csv are frozen copies from the inspected existing pipelines, so subsequent unrelated conversions and cross-platform CRLF/LF checkout cannot silently change this snapshot's inputs. Their hashes remain exactly the audited hashes. Metadata JSON remains reviewable text. XML dependency byte hashes were compared against the repository blobs. Offline conversion after this packaging correction still produces `ure-c81e4ef44e6c9868` and all63 tests pass.
