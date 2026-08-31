# Session Progress Log

## Current State

**Last Updated:** 2026-08-31 Asia/Taipei
**Session ID:** Codex desktop
**Active Feature:** feat-015 (complete)

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

## Notes for Next Session

Run `bash ./init.sh` (or its two PowerShell-safe commands) before the next change. In the current desktop sandbox, Bash returned `E_ACCESSDENIED`; use the documented npm test/build commands if that persists. Data freshness delivery, privacy defaults, and small-sample chart gates are implemented; consider automated interaction coverage next. Do not overwrite local source files or generated data without preserving source-field and methodology constraints.
