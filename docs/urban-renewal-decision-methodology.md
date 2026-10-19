# Urban Renewal Evidence Review Methodology

Methodology: `urban-renewal-evidence-review-v1`
Configuration: `1.0.0`

## Decision and analytical unit

The decision is how to allocate a limited number of documentary research reviews. The candidate unit is **district × administrative review question**, not a building, permit, development project, resident or legal application. Selection means that analysts should examine an evidence question; it does not establish a government decision, project outcome or unsafe condition.

Mode A reviews district-level urban-renewal administrative evidence. Mode B displays independently verified building-stock statistics as policy context. A citywide building-age series cannot supply district exposure, create twelve synthetic district observations or contribute to a district demand score. Use permits are administrative issuance flows and cannot substitute for the stock of buildings standing today.

The source feasibility gate precedes candidate generation. The companion [source audit](urban-renewal-source-audit.md) records actual schema, identities, hashes, coverage and suitability. Only facts supported by that audit may become analytical inputs. An inaccessible source remains unavailable; a historical catalogue description does not establish its current contents.

The 2026-10-19 audit validates 75 designation rows across 11 source districts, dated 2023-02 through 2024-06, without an authoritative current lifecycle field. Existing-building source A has 50 citywide annual rows (1976–2025), no district field, unavailable age breakdowns in 1976–2006 and an age-category sum mismatch in 2012. Incentive source C has 24 citywide annual rows (2002–2025); meeting source E has 117 proceedings rows. These populations remain separate. No district-age ranking passes the feasibility gate.

## Source suitability and eligibility

| Classification | Meaning | Permitted use |
| --- | --- | --- |
| `verified_analysis` | Identity, schema, unit, geography and relevant period validated | Analysis within the validated population |
| `context_only` | Useful official reference without a compatible district/question observation | Linked explanation and separate context |
| `limited` | A documented limitation remains, but a bounded question can be supported | Explicitly disclosed permissive-quality review only |
| `unavailable` | Resource cannot be acquired or essential evidence cannot be verified | Disclose the gap; no invented records |
| `excluded` | Source is incompatible with the proposed interpretation | Audit record and exclusion reason |

Essential source identity, district attribution, statistical definition and applicable period must be valid for a district candidate. A specific missing-data question may be eligible only when independent official district evidence establishes its scope. A missing district does not become a district named “Unknown”, and a missing record in a partial publication does not mean zero actual cases.

Insufficient evidence is an explicit exclusion state, not the lowest research priority. Strict quality accepts only verified analytical evidence. Permissive quality may admit explicitly bounded limited evidence, but cannot waive essential identity, geography, definition or period requirements. The quality toggle changes eligibility and therefore changes evidence scope.

## Independent review dimensions

| Identifier | Material question | Guard against double counting |
| --- | --- | --- |
| `source_integrity` | Unresolved source definition, identity duplication or schema inconsistency | Multiple invalid fields from one source problem count once |
| `status_traceability` | Verified designation exists, but a subsequent official stage cannot be established | Several missing stage fields do not become several independent dimensions |
| `temporal_freshness` | A source version or documented source date requires rechecking | Case-action age and retrieval age are not interchangeable |
| `scope_comparability` | Units, legal pathways, periods or administrative populations do not align | Several incompatible counts do not generate additive risk points |
| `geographic_completeness` | A supported district question has uncertain administrative coverage | Missing district records cannot be imputed to every district |

Material dimensions are a set of these five identifiers. Each counts at most once per candidate. Different documents about one case do not create additional cases or independent source types. Case identity normalization remains conservative; ambiguous identity is disclosed rather than repaired using property names, fuzzy addresses or inferred ownership.

No public follow-up data means **unknown in the available evidence**. It does not prove administrative inactivity or that the responsible authority lacks an operational record.

## Transparent tiers

| Tier | Rule |
| --- | --- |
| A — Verify First / 優先複核 | Eligible official district evidence and at least two distinct material review dimensions |
| B — Review / 例行複核 | Eligible evidence and one material dimension |
| C — Contextual Monitoring / 脈絡觀察 | Verified context without a qualifying material review question |
| Insufficient Evidence / 證據不足 | Essential evidence cannot be validated; excluded with reasons |

These tiers describe research work, never physical danger. Capacity and filters operate on eligible candidates after tier assignment. A stricter priority threshold does not change the underlying evidence or invent higher tiers.

## Deterministic priority order

The default comparator uses, in order:

1. Tier A, B, then C.
2. More distinct material dimensions first.
3. More independent verified source types first.
4. More explicit unresolved case-status questions first.
5. Older known resource versions first; unknown ages follow known ages.
6. Stable district identifier.
7. Stable review-question identifier.

The implementation uses `resourceUpdatedAt` (the catalogue resource's `last_modified`), not catalogue metadata update or individual case-action dates. Publication is independently unknown (`publishedAt: null`); a resource version date must not be relabelled as publication. A missing resource update or one more than 365 days before the fixed `analysisAsOf` date produces one freshness dimension. Known source age is calendar days between ISO date portions; missing/invalid/future values remain null. In the age tie-break, known older versions precede younger ones and unknown ages sort after known ages. Browser time does not alter results. For B, resource update 2024-06-13 and analysis date 2026-10-19 give 858 days.

Stable district order is the repository's `DISTRICTS`: 中正區、大同區、中山區、松山區、大安區、萬華區、信義區、士林區、北投區、內湖區、南港區、文山區. Unknown identifiers follow those districts, then lexical district and question identifiers break ties. The actual validated population excludes 信義區 because the published B resource has no row for it; that absence does not establish zero real cases.

Raw approved-case counts alone never determine priority. A district with more published records is not thereby older, more dangerous, less desirable or more in need of redevelopment.

## Capacity and strategies

Capacity is unlimited, 5, 10 or a custom positive integer. It counts review questions, not projects or buildings. Capacity exceeding eligibility selects all eligible questions; an empty population produces a disclosed empty result.

**Evidence Gaps First** takes the first N candidates in the deterministic priority order.

**Balanced District Coverage** groups the globally sorted candidates by district. District queues are traversed in the order of their highest-priority candidate; ties therefore follow the comparator's stable district order. It preserves priority within each district and takes one question per district per round until capacity is exhausted. This distributes research attention geographically; it does not measure equitable redevelopment, protected residents or service outcomes.

**Source Reconciliation Focus** selects candidates carrying a concrete source-definition, case-identity or administrative-stage reconciliation question, preserves deterministic ordering and applies capacity. It does not fall back silently to unrelated questions. When none qualify, the result explains why reconciliation is unavailable.

Report eligible and selected questions, represented districts, the union of material dimensions, independent source types, exclusions with reasons and changes between strategies. Never sum per-candidate dimension counts and label the result “distinct dimensions”.

## Comparisons and sensitivity

A same-scope comparison fixes the source snapshot, legal-process definitions, geography, candidate population, category mapping and eligibility rules. Capacity 5 versus 10 and priority versus balanced selection may be compared on that common population. Stable, newly selected and removed IDs are set comparisons; ranking changes refer to the recorded strategy order and require an explanation.

Strict versus permissive quality, optional source changes, category population changes and genuine source-version changes are **different evidence scopes**. Such changes must not be presented as a pure strategy effect. A different snapshot is not simulated by changing a date label. If no historical audited version exists, older/newer source sensitivity is unavailable.

Selection changes measure analytical assumptions and review allocation. They do not show changes in building condition, consent, feasibility or legal entitlement.

## Actual audited scenario

The current snapshot creates exactly one `designation_follow_up` question per represented B district: 11 candidates, all A, each with `status_traceability` and `temporal_freshness`. Each has one independent verified source type (B) and one unresolved status question regardless of source-row volume. There are no artificial extra district questions or inferred case totals.

With all districts/categories, strict quality, priority threshold C, source B included and analysis date 2026-10-19:

| Capacity | Selected districts in order | Excluded by capacity |
| --- | --- | --- |
| 5 | 中正區、大同區、中山區、松山區、大安區 | 6 questions |
| 10 | The first five, then 萬華區、士林區、北投區、內湖區、南港區 | 1 question (文山區) |
| Unlimited | All 11 represented districts | None |

At capacities 5 and 10, selected-question count equals represented-district count; selected questions address two distinct dimensions and one source type. Capacity 10 retains all five capacity-5 questions and adds five; full ranking does not change. Balanced and gaps strategies return exactly the same selection and ranking because every district has one question. This is an observed equality, not a demonstrated benefit of geographic balancing. Reconciliation also selects the same candidates because each has a concrete missing later-stage linkage question.

Strict and permissive quality select the same actual population because B is verified. Changing the quality assumption is still labelled a different evidence scope; no changed selection is claimed. Removing optional permit context changes briefing scope but not ranking. Excluding B yields no eligible questions. Only one audited source version exists, so historical-version sensitivity remains unavailable.

The functions are `buildReviewCandidates`, `runReviewScenario`, `compareReviewScenarios`, `buildReviewBriefing` and `briefingToCsv`. `DEFAULT_SCENARIO_OPTIONS` fixes capacity 5, strategy `gaps`, all districts/categories, strict quality, threshold C, permit context included and `sourceIds: ['B']`. Run `node --import tsx --test scripts/urbanRenewalDecision.test.ts` for the actual-snapshot scenario assertions, then the repository-wide verification.

## Reproduction, exports and refresh

The offline pipeline validates official inputs, normalizes dates/units/geography, constructs safe aggregates and produces static JSON. Browser code reads this snapshot and runs deterministic TypeScript selection. It does not fetch Taipei Open Data directly or download full permit detail for this feature.

Preserve source dataset/resource identifiers, URLs, original-file SHA256, source publication/update dates, retrieval and processing timestamps, coverage, units, exclusions, schema version, methodology/configuration versions and candidate population. Same audited input plus the same fixed configuration must produce the same analytical output. Failed acquisition or validation must preserve the last known valid snapshot.

JSON and CSV briefings include source/version provenance, applied filters, capacity, strategy, selected questions, reasons, comparison scope, unresolved discrepancies and limitations. CSV cells beginning with spreadsheet formula characters require formula-injection protection. Exports contain no unnecessary addresses, owner identities, professionals' names or inferred coordinates.

## Legal and safety boundaries

An approved self-designated renewal unit establishes that administrative designation stage only. It does not establish approval of a business plan or rights-transformation plan, a building permit, commencement, completion, current legal status, feasibility or owner consent. Deliberation mentions are proceedings, not inferred final outcomes.

Urban renewal and dangerous/old-building accelerated reconstruction remain distinct legal and statistical pathways. Historical regulation listings are references for further verification, not a determination of present legal validity or individual eligibility. No building-age value, permit date, floor count, land value or district statistic produces a structural-risk score, demolition recommendation, legal opinion or investment recommendation.

## Verification evidence

The implementation must test date parsing and invalid dates, identity/schema/hash validation, duplicate handling, citywide-only context, absent status, distinct legal stages/units, source-quality scope changes, tiers, dimension deduplication, tie stability, capacities, round-robin selection, reconciliation emptiness, immutable snapshots, deterministic reproduction and CSV protection. Final executed commands and actual outcomes are recorded in [the implementation guide](urban-renewal-decision-mvp.zh-TW.md) and the session progress log; this methodological specification is not evidence that a test ran.
