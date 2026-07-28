# Taipei Real Estate & Demographics Dashboard / 台北實價與人口趨勢儀表板

Mobile-first bilingual dashboard for exploring Taipei real-price records, residential price trends: monthly and quarterly residential price indexes, including district-level quarterly comparison / 住宅價格趨勢：住宅價格月指數與季指數，包含行政區季資料比較, commercial office rent index trends for citywide and major-road categories / 全市與主要路段商辦租金指數趨勢, quarterly market analysis, residential rent index trends, building use-permit summary trends, land-stock and announced land-value context by district / 各行政區土地存量與公告土地現值背景, land-use and development-control context / 土地使用內容與使用管制背景, land value tax bracket and holding-cost policy context / 地價稅級距與持有成本政策背景, income-per-earner affordability context / 所得收入與負擔能力背景, prices and affordability context: annual CPI by basic classification / 物價與居住負擔背景：消費者物價指數基本分類年指數, urban electricity and economic activity indicators: Taipower Taipei electricity sales / 城市用電與經濟活動指標：台灣電力公司臺北市售電量, financing and collateral context: movable property secured transaction registration records / 融資與擔保背景：動產擔保登記資料, demographic context, and socioeconomic context: annual movable-property pledge business statistics / 社會經濟背景：年度動產質借處營業概況.

## Purpose

The site combines Taipei public-data sources:

- [臺北市實價周報](https://data.taipei/dataset/detail?id=a9a97996-3a55-46c8-9076-e5ebdefad6dc)
- [臺北市住宅價格月指數](https://data.taipei/dataset/detail?id=ce4ea2c6-6334-44f8-945a-5705492b187d)
- [臺北市住宅價格季指數](https://data.taipei/dataset/detail?id=954911b5-896d-4ae1-9ebe-87c4ba8a191e)
- [臺北市商辦租金指數](https://data.taipei/dataset/detail?id=8a3d1df7-9169-4dd0-ae0a-949d970e9bb3)
- [臺北市實價登錄每季動態分析](https://data.taipei/dataset/detail?id=53e5ee8d-9a90-42bc-9874-3a8747ae6afa)
- [臺北市住宅租金指數](https://data.taipei/dataset/detail?id=029c6d0d-c880-4de7-b2fb-9e56669a6f20)
- [臺北市歷年使用執照摘要](https://data.taipei/dataset/detail?id=c876ff02-af2e-4eb8-bd33-d444f5052733)
- [臺北市115年度使用執照摘要](https://data.taipei/dataset/detail?id=0816f991-e6c8-4da0-a789-d022fee1462b)
- [臺北市土地筆數面積及公告土地現值統計](https://data.taipei/dataset/detail?id=68c439fc-877a-42bb-9c35-a3701e8fc9c3)
- [臺北市土地使用內容與使用管制彙整表](https://data.taipei/dataset/detail?id=d61ca24b-7b2b-4e75-8004-c568902e6300)
- [臺北市所得收入者每人所得－行政區別按年別](https://data.taipei/dataset/detail?id=33da4ba0-c366-45eb-a71f-1991e6455ed6)
- [臺北市消費者物價指數基本分類年指數](https://data.taipei/dataset/detail?id=7ee57050-4d27-482c-bae5-ebd15ca86702)
- [台灣電力公司臺北市售電量](https://data.taipei/dataset/detail?id=9bfb5424-1996-461a-b19b-f75101e2f459)
- [地價稅累進起點地價及課稅級距](https://data.taipei/dataset/detail?id=60e5f439-0cc0-4163-a91e-98241b6846c3)
- [臺北市各里人口數按年齡分](https://data.taipei/dataset/detail?id=a6394e3f-3514-4542-87bd-de4310a40db3)
- [臺北市動產質借處營業概況](https://data.taipei/dataset/detail?id=da9ed005-8f06-446a-b61a-d46e7d8d6ac9)
- [臺北市動產擔保登記資料](https://data.taipei/dataset/detail?id=cb964837-c602-4238-b6c0-f63ad1094d5e)
- [臺北市違反不動產經紀業管理條例裁罰名單](https://data.taipei/dataset/detail?id=f1f30ba1-f081-47f3-b7a6-e38721f5600c)
- [臺北市市有閒置房地出租招標結果](https://data.taipei/dataset/detail?id=be46d539-5a32-4d12-9022-76228006b0e8)
- [臺北市政府財政局促參案件簽約概況](https://data.taipei/dataset/detail?id=55e72e92-61ae-49e4-81f3-a6c17a07f51d)

It is an informational public-data dashboard, not a property appraisal, rent appraisal, building-safety assessment, title verification, legal-use determination, zoning certificate, building permit, development-right determination, tax judgment, tax advice, filing guidance, transaction advice, investment recommendation, lending advice, financial advice, energy-efficiency assessment, electricity price analysis, outage-risk determination, or price prediction tool. Population, income, CPI, electricity, land-use control, land-value tax, use-permit, land-value, pledge-business, rent-index, and price-index data provide context only and do not imply causation.

## Data model and limitations

- The frontend reads static JSON from `public/data`; it does not call Taipei Open Data directly.
- The use-permit XML files are parsed with a Node stream at build time. The raw XML remains under `data/raw/building-use-permits/`, including current-year files such as `data/raw/building-use-permits/115/Taipei02.xml`, and is never served to the browser.
- Generated use-permit records are chunked by issue year; the dashboard loads a year chunk only when the table needs it and loads detailed records on demand.
- ROC permit dates become Gregorian ISO dates. Districts are extracted from source addresses; no geocoding or exact-map markers are used in v1.
- Floor summaries and parking descriptions are parsed for aggregate context only. They do not support safety, legal-use, appraisal, or investment claims.
- Joins are district-level only.
- Residential rent index values are citywide or building-category level only. They are not district-level rent estimates and are not included in district comparison metrics.
- Commercial office rent index values are citywide or major-road category level only. The `主要路段` category is not a list of mappable roads; no district, coordinate, geocoding, or map-marker behavior is generated.
- Commercial office rent index CSV files are UTF-8-SIG today, with Big5/CP950 fallback. ROC quarter values such as `103Q2` become Gregorian quarters such as `2014Q2`.
- Commercial office rent conversion parses quarterly index, quarterly change, standard rent unit price in NTD per ping per month, derives NTD per square meter per month, year-over-year metrics, and major-road premium over citywide rent. It is not office lease appraisal, leasing advice, investment advice, or rent prediction.
- Residential price monthly index values are citywide or housing-category level only: citywide, citywide apartment, citywide building, and citywide small unit. They are not individual-home appraisals, listing prices, district estimates, investment advice, or forecasts.
- Residential price monthly index CSV files are CP950 / Big5-family today, with UTF-8-SIG fallback. ROC year/month values such as `101/08` become Gregorian periods such as `2012-08`.
- Residential price index conversion parses monthly index, 3-month moving average, 6-month moving average, source percent-change fields, standard residential total price in NTD 10,000, and standard residential unit price in NTD 10,000 per ping. It derives NTD, NTD per square meter, year-over-year metrics, and change since the first available category period.
- Residential price quarterly index is a separate `residential_price_quarterly_index` module. It parses UTF-8-SIG CSV with Big5/CP950 fallback, supports both `住宅價格季指數類別` and uploaded `宅價格季指數類別`, and converts ROC quarters such as `114Q4` to Gregorian quarters such as `2025-Q4`.
- Residential price quarterly index classifies rows as citywide, housing type, or district; parses quarterly index, quarterly change percentage, standard housing total price, and standard housing unit price; derives year-over-year metrics, change from first available quarter, and district rankings.
- Residential price quarterly district rankings exclude citywide and housing-type rows. The source has no exact address or coordinate fields, so the dashboard uses district-level charts only and does not create point markers or geocoding.
- Residential price quarterly index can be compared with monthly price index, rent index, income, and land-value modules as context only. It is not individual-home appraisal, actual transaction price, buy/sell advice, investment advice, mortgage advice, or price prediction.
- Population files contain city, district, village, male, female, and total rows. Conversion uses district rows where `性別=計` to avoid double counting.
- ROC dates are converted by adding 1911. Failed parses remain in the conversion report.
- Land-value CSV resource names provide ROC years. Source thousand-NTD values become NTD; per-hectare and urban public/private/joint ownership metrics are derived for district context only. No parcel-level map, market-price, appraisal, or investment claim is made.
- Land-use and development-control summary is a separate `land_use_zoning_control_summary` module. Its UTF-8-SIG CSV is decoded with Big5/CP950 fallback and parses district, zoning name, source record count, building coverage ratio, FAR upper limit, and area.
- Land-use conversion preserves missing BCR/FAR as missing while explicit `0` remains a real source value. It derives hectares, ping, district/city area shares, development-intensity buckets, and visualization-only estimated maximum floor area or footprint when source ratios exist.
- Land-use data has no address, parcel number, coordinate, or geometry fields. It does not create map markers, zoning boundaries, parcel lookup, geocoding, legal zoning certificates, parcel capacity guarantees, building-permit conclusions, legal advice, or development-right guarantees.
- Movable-property pledge business CSV resources are annual Big5 files. ROC resource years such as `112年度` become Gregorian years such as `2023`; branch, item, pledge-loan case count, pledge principal, cash interest income, sale total, sale principal, sale interest, and sale profit are parsed into annual records and summaries.
- Movable-property pledge business statistics are socioeconomic background only. They are not real-estate price, rent, mortgage-stress, individual-credit, poverty, investment, lending, financial-advice, or forecast signals.
- Movable-property pledge business statistics provide no branch addresses or coordinates, so no map markers or geocoding are generated.
- Movable property secured transaction records are a separate `movable_property_secured_transaction_records` module. The CSV is UTF-8-SIG with Big5/CP950 fallback; ROC dates such as `0901102` become Gregorian dates such as `2001-11-02`.
- Movable property secured transaction conversion parses registration number, approval dates, secured transaction type, contract period, debtor, secured party, collateral owner, masked business numbers, collateral type, collateral location, collateral value, secured debt amount, currency, maximum-limit flag, item count, and floating-charge flag.
- The collateral value column supports both official `標的物總價格` and uploaded `標的物總金額`. NTD-derived amount fields are populated only when the source currency is `NTD`; non-NTD source values are preserved but not converted.
- Districts are parsed from debtor address, secured party address, and collateral location text. The source has no official coordinates, so no geocoding or exact markers are generated.
- Movable property secured transaction records are financing and collateral context only. They are not real-estate mortgage, housing loan, credit rating, default-risk, legal advice, investment advice, real-time rights status, or complete debt-registry data.
- Real-estate brokerage penalty records are a separate `real_estate_broker_penalties` module. The CSV preserves the source fields for city, disposition date, brokerage/name, penalty amount, and violation rule, with UTF-8-SIG, Big5, and CP950 support. ROC and Gregorian dates and formatted amounts are normalized while raw values remain available.
- Brokerage penalty records are historical public records for regulatory-compliance and public-data analysis only. They do not establish current non-compliance, operating status, service quality, creditworthiness, transaction safety, or official recommendation. The module has no address or coordinate data, creates no map markers, blacklist, risk score, or trust ranking, and does not provide legal, investment, or property-purchase advice.
- Income-per-earner CSV is Big5/CP950 today, with UTF-8-SIG fallback for future files. ROC years such as `113年` become Gregorian years such as `2024`.
- Income-per-earner conversion parses all source income, transfer, non-consumption expenditure, and disposable-income fields; derives composition ratios, disposable-income ratios, year-over-year metrics, and district rankings.
- Income rankings exclude `總平均` and compare district-level rows only. The income module is affordability and socioeconomic context only; it is not individual income, tax, lending, financial, investment, appraisal, or prediction advice.
- Income-per-earner data has district labels only and no exact address or coordinate fields, so no geocoding or point markers are generated.
- Annual CPI by basic classification CSV is Big5/CP950 today, with UTF-8 fallback. ROC years such as `114年` become Gregorian years such as `2025`.
- Annual CPI conversion parses city code, year, basic classification, index value, and source year-over-year percent. It derives stable semantic classification keys because source labels can change ordinal prefixes over time.
- Annual CPI is city-level price, income, rent, and housing-affordability context only. It is not personal inflation, realtime prices, housing price forecast, rent forecast, purchase-capacity determination, investment advice, mortgage advice, policy-effectiveness determination, financial advice, or official endorsement.
- Annual CPI has no district, address, or coordinate fields, so no geocoding or point markers are generated.
- Taipower Taipei electricity sales is a separate `taipower_taipei_electricity_sales` module. Its UTF-8-SIG CSV is decoded with Big5/CP950 fallback, ROC years such as `114年` become Gregorian years such as `2025`, `[千度]` electricity sales are preserved as thousand kWh and derived into kWh, and `[度]` per-customer values remain kWh.
- Taipower electricity conversion parses total, lighting, power, flat-rate, metered, business, non-business, and Taipower self-use fields; derives lighting/power shares and year-over-year changes.
- Taipower electricity data is annual citywide time-series context only. It has no address, district, or coordinate fields, so no map markers, geocoding, district-level values, real-time demand, building-level use, outage, price, emissions, or energy-efficiency claims are generated.
- Land value tax progressive brackets is a separate `land_value_tax_progressive_brackets` module. Its UTF-8-SIG CSV is decoded with Big5/CP950 fallback; ROC years become Gregorian years; payment dates become ISO dates; source formulas are preserved while general-land brackets, tax rates, progressive differences, half-period flags, and year-over-year progressive-starting-point changes are derived for visualization only.
- Land value tax bracket data has no address, district, land section, parcel number, or coordinates. It is not an official tax calculator, tax bill, parcel valuation, tax advice, legal advice, tax planning, filing guidance, investment advice, or official calculation result, so no map markers, district distributions, parcel lookup, owner-specific analysis, or payable-tax guarantee is generated.
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

`data:fetch` checks/downloads local raw-data inputs and records whether official files are available. Place manually downloaded official files in:

```text
data/raw/real-price-weekly/
data/raw/quarterly-market-analysis/
data/raw/residential-price-monthly-index/
data/raw/residential-price-quarterly-index/
data/raw/commercial-office-rent-index/
data/raw/residential-rent-index/
data/raw/population-by-age/
data/raw/building-use-permits/
data/raw/land-parcel-assessed-value-statistics/
data/raw/land-use-zoning-control-summary/
data/raw/income-per-earner-by-district-year/
data/raw/consumer-price-basic-annual-index/
data/raw/taipower-taipei-electricity-sales/
data/raw/land-value-tax-progressive-brackets/
data/raw/movable-property-pledge-business-statistics/
data/raw/movable-property-secured-transaction-records/
data/raw/real-estate-broker-penalties/
data/raw/municipal-idle-property-lease-tenders/
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
public/data/residential-price-monthly-index-records.json
public/data/residential-price-monthly-index-summary.json
public/data/residential-price-monthly-index-category-series.json
public/data/residential-price-quarterly-index-records.json
public/data/residential-price-quarterly-index-summary.json
public/data/residential-price-quarterly-index-latest.json
public/data/commercial-office-rent-index-records.json
public/data/commercial-office-rent-index-summary.json
public/data/commercial-office-rent-index-category-series.json
public/data/residential-rent-index-records.json
public/data/residential-rent-index-summary.json
public/data/population-district-summary.json
public/data/district-comparison-summary.json
public/data/conversion-report.json
public/data/building-use-permits/
public/data/land-parcel-assessed-value-records.json
public/data/land-parcel-assessed-value-summary.json
public/data/land-use-zoning-control-summary.json
public/data/land-use-zoning-control-summary-stats.json
public/data/income-per-earner-by-district-year-records.json
public/data/income-per-earner-by-district-year-summary.json
public/data/income-per-earner-by-district-year-latest.json
public/data/consumer-price-basic-annual-index.json
public/data/consumer-price-basic-annual-index-summary.json
public/data/consumer-price-basic-annual-index-latest.json
public/data/taipower-taipei-electricity-sales.json
public/data/taipower-taipei-electricity-sales-summary.json
public/data/land-value-tax-progressive-brackets.json
public/data/land-value-tax-progressive-bracket-summary.json
public/data/movable-property-pledge-business-records.json
public/data/movable-property-pledge-business-summary.json
public/data/movable-property-pledge-business-annual-summary.json
public/data/movable-property-secured-transaction-records.json
public/data/movable-property-secured-transaction-summary.json
public/data/movable-property-secured-transaction-latest.json
public/data/mrt-joint-development-rents/records.json
public/data/mrt-joint-development-rents/summary.json
public/data/real-estate-brokerage-business-directory/records.json
public/data/real-estate-brokerage-business-directory/summary.json
public/data/real-estate-consumer-disputes/records.json
public/data/real-estate-consumer-disputes/summary.json
public/data/real-estate-appraiser-directory/records.json
public/data/real-estate-appraiser-directory/summary.json
public/data/real-estate-broker-penalties/records.json
public/data/real-estate-broker-penalties/summary.json
public/data/municipal-idle-property-lease-tenders/records.json
public/data/municipal-idle-property-lease-tenders/summary.json
public/data/cadastral-clearing-sale-proceeds-custody/records.public.json
public/data/cadastral-clearing-sale-proceeds-custody/metadata.json
```

Rent-index-only workflow:

```bash
npm run data:fetch:price-index
npm run data:convert:price-index
npm run data:fetch:residential-price-quarterly
npm run data:convert:residential-price-quarterly
npm run data:fetch:commercial-rent
npm run data:convert:commercial-rent
npm run data:fetch:rent-index
npm run data:convert:rent-index
npm run data:convert:building-use-permits
npm run data:convert:land-value
npm run data:fetch:income
npm run data:convert:income
npm run data:fetch:cpi-annual-basic
npm run data:convert:cpi-annual-basic
npm run data:fetch:taipower-electricity
npm run data:convert:taipower-electricity
npm run data:fetch:land-value-tax-brackets
npm run data:convert:land-value-tax-brackets
npm run data:fetch:land-use-zoning
npm run data:convert:land-use-zoning
npm run data:fetch:pledge-business
npm run data:convert:pledge-business
npm run data:fetch:movable-secured-transactions
npm run data:convert:movable-secured-transactions
npm run data:fetch:real-estate-broker-penalties
npm run data:convert:real-estate-broker-penalties
npm run data:fetch:municipal-idle-property-lease-tenders
npm run data:convert:municipal-idle-property-lease-tenders
npm run data:fetch:cadastral-clearing-sale-proceeds-custody
npm run data:convert:cadastral-clearing-sale-proceeds-custody
```

### Cadastral-clearing custody privacy and reconciliation

`data/raw/cadastral-clearing-sale-proceeds-custody/` is a local protected ingestion location and is intentionally ignored by Git because the official CSV contains recipient names. The converter writes only `records.public.json`: recipient values are masked, non-personal fields are preserved, and the public export excludes full names. Reconciliation is a derived review aid (`sale − taxes − administrative fee − reward` versus deposited and source-recorded claimable amounts, with an NT$1 tolerance); it does not correct source records or determine current claimability, account balances, eligibility, or legal entitlement.

## GitHub Pages

The Vite base path is `/taipei-real-estate-dashboard/`. The included workflow tests, converts, builds, and deploys `dist` to GitHub Pages.

Expected URL:

```text
https://LEO0331.github.io/taipei-real-estate-dashboard/
```

Enable **Settings → Pages → Build and deployment → GitHub Actions** in the repository.
