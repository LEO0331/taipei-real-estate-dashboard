# Session Progress Log

## Current State

**Last Updated:** 2026-10-29 Asia/Taipei
**Active Feature:** feat-022 — Civic Explorer final audit maintenance (in progress)
**Branch:** `codex/civic-explorer-maintenance`, based on merged main `d9c56757e7e01bbf1b6a5790cf7e1524daf15d56`.

Focus/reset/touch repairs, refreshed-data release checks, source-provenance handling and current maintenance documents are being verified. One Draft PR will link Portfolio companion branch `codex/civic-explorer-maintenance-handoff`; no automatic merge. Existing datasets, Urban Renewal analysis and in-memory navigation remain unchanged. Candidate gate passed: 72 unit tests, 44 browser checks, build/audit/source/release validation; final Draft PR delivery pending.

The following checklist preserves earlier session history; current maintenance results are appended below.

## Status

### What's Done

- [x] Added a reproducible minimal project harness.
- [x] Completed the `cadastral_cleanup_land_auction_results` static-data dashboard module.

### What's In Progress

- [x] Completed evidence-based review of decision and technical notes.
- [x] Implemented freshness, privacy-default, and small-sample safeguards.
- [x] Replaced the oversized flat tab treatment with categorized, searchable dashboard navigation.
- [x] Split project landing documentation into English and Traditional Chinese README files.
- [x] Added the `urban_renewal_regulations` static bilingual reference module with preserved source rows, conservative ROC-date conversion, filters, charts, source details, data-quality disclosure, and filtered CSV export.
- [x] Added the `municipal_property_portfolio` static bilingual module with additive-row safeguards, property composition, annual trends, source details, data quality, and filtered CSV export.
- [x] Added the `civil_engineering_price_index` static bilingual construction-cost module with official category mappings, long-term trends, latest YoY ranking, source details, and filtered CSV export.
- [x] Completed a customer-facing whole-dashboard review; updated decision notes for data recency, public-asset interpretation, legal-reference limits, filter scope, directory-status caveats, partial failures, and release checks.
- [x] Added a static bilingual low-income household living-assistance module from the official quarterly Social Affairs source. It preserves each source column and explicitly distinguishes person-times (categories 0/1) from household occurrences (category 2).
- [x] Added a static bilingual MRT joint-development public-property auction module from the official 45-row source. It preserves source fields, calculates reserve price per ping and bid-deposit ratio only from valid inputs, and clearly distinguishes historical reserve prices from transaction prices.
- [x] Added a static bilingual MRT land-development module from the official Taipei Open Data CSV. It expands source-listed sites only at top-level delimiters, preserves raw status/source rows, supports filters and sorting, and presents status, line, and current-stage pipeline analytics without inferring locations.
- [x] Completed a whole-project code review and fixed the verified dashboard-refresh and MRT-module correctness issues.
- [x] Documented the dataset-addition handoff protocol in both README languages and the project harness: every new dataset must be a tracked feature with source, provenance, generated-record, risk, and verification evidence recorded in `feature_list.json` and `progress.md`.
- [x] Scoped real-price transaction filters to the Data Table, added a local district-focus filter to District Comparison, and labelled index/rent controls as table-only filters so overview and chart pages do not suggest unsupported filtering.
- [x] Replaced user-visible internal data-quality keys with human-readable Traditional Chinese labels in Chinese mode, including the methodology sections that previously displayed English keys.
- [x] Removed unnecessary horizontal scrolling from the MRT auction size-distribution and deposit/parking summary tables with card-specific compact spacing.
- [x] Localized every visible control and table header in the Announced Land Expropriation Registry for Chinese mode.
- [x] Localized internal category types and quarter notation in the quarterly residential price-index display.

### What's Next

1. Consider adding automated service-worker and UI interaction tests for the decision safeguards and dashboard navigator.
2. Consider hash-based deep links if users need to share a specific dashboard view.
3. Keep `README.md` and `README-zh-TW.md` aligned whenever project-facing documentation changes.
4. For every new dataset, follow the dataset-addition protocol in `AGENTS.md` and the README before marking the feature complete.

## Blockers / Risks

- [ ] The official auction CSV may change without notice; re-run fetch and conversion before publishing a refresh.
- [ ] Urban-renewal regulation records update irregularly; rerun their fetcher and converter before publishing a refresh.
- [ ] Municipal-property source records update annually; re-run their fetcher and converter before publishing a refresh.
- [ ] Civil-engineering price index updates monthly; re-run its fetcher and converter before publishing a refresh.
- [ ] Low-income household living-assistance data updates quarterly; re-run its fetcher and converter before publishing a refresh.
- [ ] MRT joint-development auction data updates irregularly and is historical; re-run its fetcher and converter before publishing a refresh, and do not treat records as current listings.
- [ ] MRT land-development data updates irregularly; re-run its fetcher and converter before publishing a refresh. The source has no coordinates or addresses, so do not add site markers without a separate authoritative high-confidence location source.

## Decisions Made

- **Local static data only**: browser modules load generated JSON from `public/data/`.
  - Context: preserves reproducibility and avoids runtime dependency on Taipei Open Data.
  - Alternatives considered: live Open Data calls; rejected by project requirements.
- **Total reserve is explicit-only**: derived premium metrics use `標售總底價金額` only when the source row provides it.
  - Context: grouped continuation rows omit that field in the official CSV.
- **Decision notes are evidence-led**: consulting guidance records data-period mismatch, cache behavior, privacy posture, and sample-size limits without making investment or legal claims.
  - Context: the dashboard is a research aid, not a decision engine.
- **Freshness over permanent cache-first data**: local JSON uses network-first delivery with cache fallback, while the new Data Status view surfaces coverage and recorded update fields.
  - Context: decision-support data must not appear current merely because an old cache is available.

## Files Modified This Session

- `AGENTS.md` - project operating rules and verification path.
- `feature_list.json` - current feature state and evidence.
- `progress.md` - restartable handoff state.
- `init.sh` and `session-handoff.md` - standard bootstrap and handoff templates.
- `docs/dashboard-decision-insights-and-technical-notes.md` - customer-facing decision guardrails and prioritized technical risks.
- `public/sw.js` and `src/DataFreshness.tsx` - static-data freshness controls and visible data-status view.
- `src/CadastralCleanupLandAuctionResults.tsx` - opt-in name fields and small-sample analytical gates.
- `src/App.tsx` and `src/styles.css` - five-category dataset navigation, desktop catalogue, and mobile browse dialog.
- `README.md` and `README-zh-TW.md` - concise, parallel English and Traditional Chinese project documentation with reciprocal language links.
- `src/UrbanRenewalRegulations.tsx`, `scripts/fetchUrbanRenewalRegulations.ts`, `scripts/convertUrbanRenewalRegulations.ts`, and `public/data/urban-renewal-regulations/` - urban-renewal regulation reference module and static data pipeline.
- `src/MunicipalPropertyPortfolio.tsx`, `scripts/fetchMunicipalPropertyPortfolio.ts`, `scripts/convertMunicipalPropertyPortfolio.ts`, and `public/data/municipal-property-portfolio/` - municipal property portfolio module and static data pipeline.
- `src/CivilEngineeringPriceIndex.tsx`, `scripts/fetchCivilEngineeringPriceIndex.ts`, `scripts/convertCivilEngineeringPriceIndex.ts`, and `public/data/civil-engineering-price-index/` - civil engineering price-index module and static data pipeline.
- `src/LowIncomeHouseholdLivingAssistance.tsx`, `scripts/fetchLowIncomeHouseholdLivingAssistance.ts`, `scripts/convertLowIncomeHouseholdLivingAssistance.ts`, and `public/data/low-income-household-living-assistance/` - quarterly low-income household living-assistance module and static data pipeline.
- `src/MrtJointDevelopmentAuctionProperties.tsx`, `scripts/fetchMrtJointDevelopmentAuctionProperties.ts`, `scripts/convertMrtJointDevelopmentAuctionProperties.ts`, and `public/data/mrt-joint-development-auction-properties/` - MRT joint-development public-property auction module and static data pipeline.
- `src/MrtLandDevelopment.tsx`, `scripts/fetchMrtLandDevelopment.ts`, `scripts/convertMrtLandDevelopment.ts`, and `public/data/mrt-land-development/` - MRT land-development module and static data pipeline.
- `package.json`, `src/DataFreshness.tsx`, and `src/MrtLandDevelopment.tsx` - full refresh coverage and filter-consistent freshness/insight behavior from the code-review pass.
- `README.md`, `README-zh-TW.md`, and `AGENTS.md` - dataset-addition and continuity requirements.
- `docs/dashboard-decision-insights-and-technical-notes.md` - evidence-backed customer decision guidance and operational release risks.
- `src/App.tsx`, `src/i18n.ts`, and `src/dashboard.test.ts` - scoped transaction and district filters, clarified bilingual table-filter labels, and building-type filter coverage.
- `feature_list.json` and `progress.md` - feat-015 status and verification evidence.
- `src/quality.ts`, selected data-quality views, `src/dashboard.test.ts`, `feature_list.json`, and `progress.md` - feat-016 Chinese quality-label rendering and coverage.
- `src/MrtJointDevelopmentAuctionProperties.tsx`, `src/styles.css`, `feature_list.json`, and `progress.md` - feat-017 compact summary-table layout and verification evidence.
- `src/AnnouncedLandExpropriationRegistry.tsx`, `feature_list.json`, and `progress.md` - feat-018 registry localization and verification evidence.
- `src/App.tsx`, `feature_list.json`, and `progress.md` - feat-019 quarterly category and period localization.

## Evidence of Completion

- [x] Tests pass: `npm.cmd test` — 32 passed on 2026-08-11.
- [x] Type check and production build clean: `npm.cmd run build` — passed on 2026-08-11.
- [x] Data sanity check: 35 source rows; unsuccessful bids did not become zero-valued awards.
- [x] Whole-project review: 0 critical, 1 high, and 3 medium findings documented; test and build passed.
- [x] Safeguard implementation: production build passed on 2026-08-11; final tests pending this session.
- [x] Responsive navigation: `npm.cmd test` passed (32/32) and `npm.cmd run build` passed on 2026-08-11.
- [x] Bilingual README: `npm.cmd test` passed (32/32) and `npm.cmd run build` passed on 2026-08-11.
- [x] Urban renewal regulations: `npm.cmd test` passed (33/33) and `npm.cmd run build` passed on 2026-08-13.
- [x] Municipal property portfolio: `npm.cmd test` passed (34/34) and `npm.cmd run build` passed on 2026-08-13.
- [x] Civil engineering price index: `npm.cmd test` passed (35/35) and `npm.cmd run build` passed on 2026-08-13.
- [x] Low-income household living assistance: `npm.cmd test` passed (36/36) and `npm.cmd run build` passed on 2026-08-14.
- [x] MRT joint-development public-property auctions: source sanity check confirmed 45 valid price-and-area rows with no duplicates or missing addresses/location codes; `npm.cmd test` passed (37/37) and `npm.cmd run build` passed on 2026-08-18.
- [x] MRT land development: official source expanded to 87 site records matching the source-noted stage totals (65 completed, 6 construction, 7 design, 9 investment/preparation); `npm.cmd test` passed (38/38) and `npm.cmd run build` passed on 2026-08-26.
- [x] Whole-project review fixes: aggregate refresh commands include all dedicated modules; filter-dependent insights use the same result set as charts and tables; MRT freshness metadata no longer freezes unavailable upstream timestamps. `npm.cmd test` passed (38/38) and `npm.cmd run build` passed on 2026-08-26.
- [x] Scoped market filters: manual local verification confirmed that Market Overview has no filter controls and the Data Table count changes from 998 to 69 after selecting 中正區. `npm.cmd test` passed (38/38) and `npm.cmd run build` passed on 2026-08-31.
- [x] Chinese data-quality labels: manual local verification of the Civil Engineering Price Index showed human-readable Chinese quality labels and no internal English keys. `npm.cmd test` passed (39/39) and `npm.cmd run build` passed on 2026-08-31.
- [x] MRT auction summary tables: local browser verification confirmed both compact tables have matching client and scroll widths, with no horizontal overflow. `npm.cmd test` passed (39/39) and `npm.cmd run build` passed on 2026-08-31.
- [x] Announced land registry localization: local browser verification confirmed all filter, header, details, and pagination UI is Chinese in Chinese mode. `npm.cmd test` passed (39/39) and `npm.cmd run build` passed on 2026-08-31.
- [x] Quarterly price localization: internal category types now render as Chinese labels and quarters use Chinese notation. `npm.cmd test` passed (39/39) and `npm.cmd run build` passed on 2026-08-31.

## Notes for Next Session

Run `bash ./init.sh` (or its two PowerShell-safe commands) before the next change. In the current desktop sandbox, Bash returned `E_ACCESSDENIED`; use the documented npm test/build commands if that persists. Data freshness delivery, privacy defaults, and small-sample chart gates are implemented; consider automated interaction coverage next. Do not overwrite local source files or generated data without preserving source-field and methodology constraints.

## 2026-10-19 — feat-020: Urban renewal evidence review (complete)

Branch: `codex/urban-renewal-evidence-review`. Scope is one Policy Issue 6 research POC; no Portfolio changes, backend, new dependency, building-risk model, case-level fuzzy join or automatic merge.

### Repository/source baseline

- `npm.cmd ci` completed. Baseline `npm.cmd test`: 39/39; `npm.cmd run build`: passed.
- Existing permits verified: 8,855 records, 2001–2026, 12 represented districts, 25 without district, latest issue 2026-05-29. These are issuance flows, not current stock.
- Source feasibility gate completed in `docs/urban-renewal-source-audit.md` before ranking. A is citywide only; district-age ranking rejected.
- Official A: https://data.taipei/dataset/detail?id=7889e8a0-a71e-44e0-95c7-2213a7db1474 — 50 annual stock rows1976–2025; 18 comparable age years2007–2025 excluding2012. Latest2025:222,459 total;20,235 under30;202,224 age30+. Earlier zeros mask unavailable age fields;2012 categories disagree with total.
- Official B: https://data.taipei/dataset/detail?id=4bf19a69-86e7-40cb-93e2-a45dc7037f34 — 75 valid unique designation documents,11 districts,2023-02-01–2024-06-05; no duplicate IDs, missing districts or invalid dates. No Xinyi row and no current-stage field. Document identity is not a universal case identity.
- Official C: https://data.taipei/dataset/detail?id=cda6b568-0035-420b-bd05-6ca9bfd4bda0 —24 annual rows2002–2025, Region台北市/CountyCode63000; city context only, separate case and m² units.
- Official E: https://data.taipei/dataset/detail?id=dbe02285-8d6e-4b3d-97d7-700047cbe4da —117 meeting rows2024-01-08–2026-07-13, contextual proceedings only.
- D existing permits and G historical regulation/FAQ evidence retained with hashes. F https://gis.uro.taipei/r_progress.aspx is human lookup only; no supported bulk API or current-status linkage was verified. A/C/D/E/F/G are excluded from district priority inputs because their units, geography or process semantics do not corroborate B follow-up status.

### Implementation and actual scenario

- Raw audited source bytes/catalogues/provenance: `data/raw/urban-renewal-decision/`; generated `public/data/urban-renewal-decision/{snapshot,source-health}.json`. Snapshot `ure-c81e4ef44e6c9868`, methodology `urban-renewal-evidence-review-v1`, configuration/schema1.0.0, fixed analysis2026-10-19.
- Source publication unknown is null; resource version update, catalogue metadata date, action date, retrieval and processing remain distinct. B resource update2024-06-13 is858 days before analysis.
- One aggregate question per supported district:11 TierA questions; each has traceability+freshness, one verified source type and one explicit unresolved status question. No case-volume rank multiplier.
- Capacity5:中正、大同、中山、松山、大安. Capacity10 adds萬華、士林、北投、內湖、南港. 文山 remains11th. Unlimited selects11. All3 strategies agree because there is one equally qualified question per district; quality-toggle results also agree for this verified source. Fixed identifiers break ties, without a substantive district-demand claim.
- Pure engine supports tiers, source-quality/selection, district/category, threshold, capacity and round-robin/reconciliation. Comparisons label changed evidence scopes. JSON and formula-safe CSV preserve complete briefing metadata even with zero selections.
- Lazy bilingual UI preserves existing modules, offers city stock/administrative context, source health, definitions, exclusions, scenario/sensitivity and exports. Navigation, Data Status, aggregate commands and PWA cache v41 aligned. New chunk38.30kB (14.02kB gzip), snapshot~28kB. Reuses static delivery and existing design; no new abstraction/dependency infrastructure.

### Final verification

- `npm.cmd test`:63 passed,0 failed (39 baseline+11 engine+12 source+1 service-worker delivery).
- `npm.cmd run build`: TypeScript and Vite production build passed with GitHub Pages base path.
- `git diff --check`:passed. No separate lint/static-analysis script is configured; TypeScript is the available static check.
- Dedicated fetch command verified existing audited files without network refresh; dedicated audit/convert passed. Source tests reproduce byte-identical snapshots and preserve last-known-good output on changed bytes/schema. Invalid-first duplicate order regression fixed and passed.
- `bash ./init.sh`: host Bash/E_ACCESSDENIED; documented PowerShell-equivalent test/build commands passed.
- Browser: Chinese default/English, desktop390px mobile, no whole-page horizontal overflow (client/scroll375px); capacity5/10/custom3, invalid0 disables export, balanced strategy, missing-Xinyi empty result, city-only age mode, isolated missing snapshot and Retry recovery; JSON/CSV downloads succeeded and final downloaded JSON has snapshot `ure-c81e4ef44e6c9868` and5 questions.
- Existing market overview(998 records), permit explorer(8,855), district comparison, Data Status(new entry loaded), regulation directory(37) remain accessible. PWA network-first changed snapshot and offline last-good fallback executed in VM delivery regression.
- Screenshots: `docs/evidence/urban-renewal-desktop-zh.png`, `urban-renewal-mobile-en.png`, `urban-renewal-mobile-zh.png`. Browser review detail in `docs/urban-renewal-browser-review.md`.

### Remaining evidence limits

No district-age stock, official cross-stage identity/current status, complete district/period census or historical audited source versions. Request these plus a2012 stock correction and clearer case denominators from the authority. Changed upstream bytes/dates fail closed pending explicit re-audit; full refresh may intentionally require review if retained permit/regulation hashes change. npm ci reports5 pre-existing dependency vulnerabilities(1 moderate,4 high); live npm audit was unavailable due sandbox DNS. Dependencies were not changed. Automatic approval rejected0.0.0.0 test-server binding; loopback-only verification succeeded. No blocked feature work remains.

Final packaging check: retained D/G inputs were frozen inside the feature raw directory and Git attributes preserve exact raw source bytes across checkout. This corrected CRLF/LF hash drift without changing the analytical snapshot ID or results. Offline conversion and63 tests passed again; staged raw bytes are checked against originals before committing.


## 2026-10-29 — Optional Civic Explorer (feat-021)

- Based on dashboard main e3f37ff; Portfolio v3.0.1 merged in [PR #43](https://github.com/LEO0331/portfolio/pull/43), merge 632b81a. Adapted HexIsland geometry with MIT notice; host adapter uses the dashboard catalog and numeric tab state, not Portfolio case studies or its controlled generic API.
- Five existing categories and 46 targets, bilingual search, hub and list views, keyboard focus, reduced motion, responsive styles, and link to existing Data Status & Coverage. Positions are decorative. Dashboard remains mounted to retain filter state. Refresh resets to default, as existing state is not URL-backed; browser history does not track sections. Coverage is available in the existing status view for its supported datasets; it is not duplicated per item.
- Baseline: 63 tests passed; build initial index JS 451.24 kB / 106.70 kB gzip. Bash launcher unavailable (E_ACCESSDENIED); equivalent npm.cmd commands used. Browser baseline showed 998 overview records.
- Verification: 65 tests including catalog target and search tests; production build and git diff --check. Browser: Chinese and English, category selection and English search in Chinese, list mode at 390px, dataset navigation to use permits, entry and return focus, refresh to default and no console errors observed. No official snapshots, ETL, analytics or exports changed. Service worker cache version bumped; existing delivery regression exercises network-first data and offline fallback.
- npm audit found one existing high-severity Vite advisory group; dependencies unchanged. Browser back does not navigate in-memory sections; source/freshness coverage is limited to existing Data Status entries. No WebGL or new dependency.
- Final production build: initial index JS 453.27 kB / 107.45 kB gzip; explorer lazy chunk 4.93 kB / 2.26 kB gzip plus CSS 4.01 kB / 1.34 kB gzip. Production preview loaded the explorer under the Pages base path with no observed console errors. Browser service-worker registration and offline navigation were not independently exercised; the existing automated service-worker delivery test passed.

### Civic Explorer entry layout follow-up

Moved Explore Data into the navigation toolbar beside search on wide screens and Browse datasets on mobile. Added an ink-colored button, decorative compass icon, 44px target and intermediate-width wrapping. Existing focus return uses the same button ref. Browser checked 1510px desktop and 390px mobile; relocated entry opens explorer. npm.cmd test: 65 passed; npm.cmd run build and git diff --check passed.

## 2026-10-29 — Final audit maintenance (feat-022)

Authorized the final severity-table repairs. Focus/touch/release/provenance fixes and dedicated API/maintenance guides; candidate tests and single Draft PR delivery pending. Retain exact code/data identity and actual hosted access limits.

### 2026-10-29 — Executed maintenance verification

Dashboard gate: 72 unit / 44 browser, build/source audit, dependency audit zero and release validation of747 actual staged JSON files passed. All business source/data/Urban Renewal snapshots remain unchanged; four duplicate warnings retained. New browser tool is development-only.

On 2026-10-29 the Playwright fallback successfully rendered both published mains: 43/43 live checks passed across English/Traditional Chinese and 390/1440px. Portfolio covered six domains, thirteen-item HTML navigation, selected evidence, Back/Forward/reload, search and core routes; Dashboard covered five groups, 46 items, HTML fallback, bilingual search and dataset navigation. No page errors were observed. This supersedes the earlier browser-access limitation for these published versions only; the maintenance candidate remains unmerged and its expected-SHA hosted job must run after deployment.

Commit-bound release acceptance: 45/45 checks passed for implementation `8d71ca6`; a preview with the correct code SHA but tampered real-price-summary bytes failed exactly the data-hash identity check. Original preview bytes restored. Candidate hosting still requires manual merge and the actual post-deploy job.
