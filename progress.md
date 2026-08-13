# Session Progress Log

## Current State

**Last Updated:** 2026-08-13 Asia/Taipei
**Session ID:** Codex desktop
**Active Feature:** feat-011 (complete)

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

### What's Next

1. Consider adding automated service-worker and UI interaction tests for the decision safeguards and dashboard navigator.
2. Consider hash-based deep links if users need to share a specific dashboard view.
3. Keep `README.md` and `README-zh-TW.md` aligned whenever project-facing documentation changes.

## Blockers / Risks

- [ ] The official auction CSV may change without notice; re-run fetch and conversion before publishing a refresh.
- [ ] Urban-renewal regulation records update irregularly; rerun their fetcher and converter before publishing a refresh.
- [ ] Municipal-property source records update annually; re-run their fetcher and converter before publishing a refresh.
- [ ] Civil-engineering price index updates monthly; re-run its fetcher and converter before publishing a refresh.

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
- `docs/dashboard-decision-insights-and-technical-notes.md` - evidence-backed customer decision guidance and operational release risks.

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

## Notes for Next Session

Run `bash ./init.sh` (or its two PowerShell-safe commands) before the next change. Data freshness delivery, privacy defaults, and small-sample chart gates are implemented; consider automated interaction coverage next. Do not overwrite local source files or generated data without preserving source-field and methodology constraints.
