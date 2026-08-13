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

Use the dashboard’s category navigator or dataset search to find a topic. On smaller screens, **Browse datasets** opens a keyboard-accessible catalogue.

## Important limits

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

## Verification

```bash
npm.cmd test
npm.cmd run build
```

The project’s standard startup and verification path is also available through `bash ./init.sh` on environments with Bash support.
