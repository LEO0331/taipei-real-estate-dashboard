# Taipei Real Estate & Demographics Dashboard

[繁體中文](README-zh-TW.md)

A bilingual, responsive dashboard for exploring Taipei public data on housing, prices, rents, land, development, public records, and city context.

## What it is for

The dashboard makes public datasets easier to browse together. Its five topic groups are:

- **Market insights** — market overview, monthly and quarterly price indexes, residential and office rents, district comparisons, and quarterly transaction analysis.
- **Land & development** — use permits, land values, land-use controls, land-value tax, expropriation, land readjustment, and cadastral-cleanup records.
- **Housing & city** — income, consumer prices, electricity sales, social housing, demographics, and rental-housing providers.
- **Services & public records** — brokerage records, consumer disputes, appraisers, public assets, public works, MRT development, and engineering milestones.
- **Data tools** — source tables, methodology notes, and data-status coverage.

Use the dashboard’s category navigator or dataset search to find a topic. On smaller screens, **Browse datasets** opens a keyboard-accessible catalogue. **Explore Data** is an optional navigation mode for the same five groups and 46 existing targets. Its ordinary HTML catalogue is available without interacting with the decorative SVG hubs; returning to the dashboard retains its mounted filter state.

## Important limits

### Urban renewal evidence review (Policy Issue 6)

Under **Land & development**, open **Aging Buildings & Urban Renewal Decision Support**. This lazy-loaded research POC separates citywide building-stock context from district administrative follow-up questions. It offers deterministic review tiers, capacity 5/10/custom/unlimited, three strategies, scope-aware sensitivity, and reproducible JSON/CSV briefings with formula protection.

The audited snapshot contains 50 citywide building-stock years (1976–2025), 75 designation-approval documents in 11 districts (2023-02–2024-06), and 24 citywide incentive years (2002–2025). Missing Xinyi rows do not mean zero cases. Age breakdowns for 1976–2006 and inconsistent 2012 are unavailable. Eleven equally qualified research questions yield identical strategy results; capacity 5/10 selects 5/10 districts. These are documentary questions, never building-risk or redevelopment-demand scores.

Use `npm run data:audit:urban-renewal-evidence` and `npm run data:convert:urban-renewal-evidence` for offline verification/reproduction. Intentional acquisition is `npm run data:fetch:urban-renewal-evidence`; source changes require re-audit. Raw audited bytes/provenance are in `data/raw/urban-renewal-decision/`, browser aggregates in `public/data/urban-renewal-decision/`. No current-status scraping or property-level joins are performed. See the [source audit](docs/urban-renewal-source-audit.md), [methodology](docs/urban-renewal-decision-methodology.md), and [Traditional Chinese implementation guide](docs/urban-renewal-decision-mvp.zh-TW.md).

This is an informational public-data dashboard, not a property or rent appraisal, title check, zoning certificate, tax calculation, legal opinion, investment recommendation, lending advice, forecast, or safety assessment.

- Static JSON is served from `public/data/`; the browser does not call Taipei Open Data directly.
- The data-status view shows recorded coverage and freshness information. Refer to the official source for the latest authoritative information.
- District-level context is not a parcel, address, or building-level conclusion. The project does not geocode records or infer geometry, ownership, current listings, or legal rights.
- Administrative records such as penalties, disputes, and directories do not establish current status, quality, creditworthiness, safety, or an official recommendation.
- Cadastral-cleanup auction analytics preserve source fields and use reserve-price comparisons only where the official source explicitly supplies a total reserve. They do not indicate market value or investment suitability.

For detailed customer-facing interpretation and technical caveats, see [Dashboard decision insights and technical notes](docs/dashboard-decision-insights-and-technical-notes.md).

## Data sources

The project combines Taipei City Open Data and official public records, including:

- [Real-price transaction records](https://data.taipei/dataset/detail?id=a9a97996-3a55-46c8-9076-e5ebdefad6dc)
- [Residential price monthly index](https://data.taipei/dataset/detail?id=ce4ea2c6-6334-44f8-945a-5705492b187d)
- [Residential price quarterly index](https://data.taipei/dataset/detail?id=954911b5-896d-4ae1-9ebe-87c4ba8a191e)
- [Residential rent index](https://data.taipei/dataset/detail?id=53e5ee8d-9a90-42bc-9874-3a8747ae6afa)
- [Commercial office rent index](https://data.taipei/dataset/detail?id=8a3d1df7-9169-4dd0-ae0a-949d970e9bb3)
- [Building use permits](https://data.taipei/dataset/detail?id=c876ff02-af2e-4eb8-bd33-d444f5052733)
- [Land-use control summary](https://data.taipei/dataset/detail?id=cb964837-c602-4238-b6c0-f63ad1094d5e)
- [Income per earner by district](https://data.taipei/dataset/detail?id=33da4ba0-c366-45eb-a71f-1991e6455ed6)
- [Taipei consumer price index](https://data.taipei/dataset/detail?id=7ee57050-4d27-482c-bae5-ebd15ca86702)
- [Taipei electricity sales](https://data.taipei/dataset/detail?id=9bfb5424-1996-461a-b19b-f75101e2f459)
- [Taipei urban renewal regulations](https://data.taipei/dataset/detail?id=6bc30ace-9322-412c-9092-aa151bdf4a03)
- [Taipei municipal property inventory (past five years)](https://data.taipei/dataset/detail?id=fb19bfcb-33e5-4f82-8d0e-2460152282c4)
- [Taipei civil engineering price index](https://data.taipei/dataset/detail?id=e0cfb477-9dbd-4af2-a0a6-6cb132821584)
- [MRT joint-development public-property auction records](https://data.taipei/dataset/detail?id=9527ea34-7c55-4c23-9f0e-80164f888f06)
- [Taipei MRT land-development operations](https://data.taipei/dataset/detail?id=0b5048f7-1608-4da4-ac30-4e26f3f452f2)

Source availability and coverage vary by dataset. The dashboard preserves raw source strings where material and documents derived metrics in the corresponding view.

## Local development

Requirements: Node.js 22 and npm.

```bash
npm install
npm test
npm run build
npm run dev
```

To refresh data, run the appropriate fetcher and converter:

```bash
npm run data:fetch
npm run data:convert
```

Raw inputs belong under `data/raw/`; generated browser data belongs under `public/data/`. Do not add live Taipei Open Data calls to browser code.

## Adding a dataset

Each dataset addition is a tracked feature, not just a new file. Before closing the work:

- add a static fetcher and converter, preserve material raw fields, and document every derived metric;
- register the dataset in the full `data:fetch` and `data:convert` workflows, PWA cache, navigation, data-status view, and bilingual documentation where applicable;
- add focused regression coverage and run the required test and production-build checks;
- record the source URL, coverage/freshness limits, generated-record evidence, risks, and verification result in both `feature_list.json` and `progress.md`.

Keep `README.md`, `README-zh-TW.md`, `feature_list.json`, and `progress.md` aligned with the published dataset set.

## Verification

```bash
npm ci
npm audit
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

For a release, acquire and convert the intended sources, rerun tests and the Urban Renewal source audit, then run `npm run release:verify` before building. This generates the ignored `public/release-manifest.json` with the code SHA and actual data hashes. Missing required data fails validation; a fresh checkout does not replace the data pipeline. Processing time does not establish source freshness.

[Explorer API and ownership](docs/civic-explorer-api.md) documents the local adapter and numeric navigation contract. The [2026-10-29 maintenance report](docs/civic-explorer-maintenance.md) records keyboard/touch fixes, source handling, post-refresh release validation, hosted smoke checks and remaining acceptance limits. Playwright is a development-only verification dependency, not an application runtime dependency.

The project’s standard startup and verification path is also available through `bash ./init.sh` where Bash is supported.

## Release and maintenance

GitHub Pages uses `/taipei-real-estate-dashboard/`. The deployment workflow checks the refreshed data before uploading `dist`, then runs a hosted browser smoke check against the expected code SHA. A successful merge or build alone does not establish a successful deployment or hosted acceptance. Review the deploy and hosted-check jobs separately.

After review, keep this initiative in maintenance-only scope: dependency/security updates, actual defects, factual/source corrections and release evidence. Do not add policy cases, introduce a mandatory 3D engine, publish a shared package or integrate another dashboard without a separate justified decision. Existing dated source audits and browser reports remain historical evidence, not a claim about a newer release.
