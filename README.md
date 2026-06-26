# Taipei Real Estate & Demographics Dashboard / 台北實價與人口趨勢儀表板

Mobile-first bilingual dashboard for exploring Taipei real-price records, quarterly market analysis, residential rent index trends by category / 住宅租金指數與類別租金趨勢, and demographic context.

## Purpose

The site combines four Taipei public-data sources:

- [臺北市實價周報](https://data.taipei/dataset/detail?id=a9a97996-3a55-46c8-9076-e5ebdefad6dc)
- [臺北市實價登錄每季動態分析](https://data.taipei/dataset/detail?id=53e5ee8d-9a90-42bc-9874-3a8747ae6afa)
- [臺北市住宅租金指數](https://data.taipei/dataset/detail?id=029c6d0d-c880-4de7-b2fb-9e56669a6f20)
- [臺北市各里人口數按年齡分](https://data.taipei/dataset/detail?id=a6394e3f-3514-4542-87bd-de4310a40db3)

It is an informational public-data dashboard, not a property appraisal, rent appraisal, investment recommendation, or price prediction tool. Population data provides district context only and does not imply causation for prices, rent, or transaction volume.

## Data model and limitations

- The frontend reads static JSON from `public/data`; it does not call Taipei Open Data directly.
- Joins are district-level only.
- Residential rent index values are citywide or building-category level only. They are not district-level rent estimates and are not included in district comparison metrics.
- Population files contain city, district, village, male, female, and total rows. Conversion uses district rows where `性別=計` to avoid double counting.
- ROC dates are converted by adding 1911. Failed parses remain in the conversion report.
- Rent index periods parse ROC quarters such as `107Q3` into Gregorian quarters such as `2018-Q3`.
- Weekly sale totals are in NT$10,000 and become NTD. Sale unit prices are NT$10,000/ping and become NTD/ping.
- Weekly rental unit prices remain NTD/ping/month. Rental totals are derived from unit price × area when available because the source total is rounded.
- Residential rent index CSV is UTF-8-SIG today, with Big5/CP950 fallback support. Quarterly change rates are source percent values, standard rent unit prices parse comma-formatted NTD per ping per month values, and year-over-year metrics are derived from same-category same-quarter history.
- Official records may change after publication. Refer to official systems for authoritative information.

## Local workflow

Requirements: Node.js 22 and npm.

```bash
npm install
npm run data:fetch
npm run data:convert
npm test
npm run dev
```

`data:fetch` checks the three raw-data folders and records whether local CSV files are available. Place manually downloaded official files in:

```text
data/raw/real-price-weekly/
data/raw/quarterly-market-analysis/
data/raw/residential-rent-index/
data/raw/population-by-age/
```

Build and preview:

```bash
npm run build
npm run preview
```

Generated files:

```text
public/data/real-price-records.json
public/data/real-price-summary.json
public/data/quarterly-market-analysis.json
public/data/quarterly-market-summary.json
public/data/residential-rent-index-records.json
public/data/residential-rent-index-summary.json
public/data/population-district-summary.json
public/data/district-comparison-summary.json
public/data/conversion-report.json
```

Rent-index-only workflow:

```bash
npm run data:fetch:rent-index
npm run data:convert:rent-index
```

## GitHub Pages

The Vite base path is `/taipei-real-estate-dashboard/`. The included workflow tests, converts, builds, and deploys `dist` to GitHub Pages.

Expected URL:

```text
https://LEO0331.github.io/taipei-real-estate-dashboard/
```

Enable **Settings → Pages → Build and deployment → GitHub Actions** in the repository.
