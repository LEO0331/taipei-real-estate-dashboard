# Reviewed rental-business snapshot — 2026-11-02

The existing Rental Housing Service Businesses view referenced an absent snapshot. This restoration uses the exact official source registered by its existing fetcher; it does not substitute the separate Active Rental Housing Service Providers dataset.

- Dataset: [臺北市租賃住宅服務業業者名冊](https://data.taipei/dataset/detail?id=6c1f5836-30fe-43fe-82b0-3f54f0c6c78e), publisher 臺北市政府地政局.
- Advertised CSV resource: `75e116b7-b024-4437-8100-1fa1fcbdbd31`.
- Retained raw files: `data/raw/rental-housing-service-businesses/{source.csv,catalogue.html,provenance.json}`. CSV is Big5,23,221bytes; SHA256 `de2173322c613dd70ce9a3e7d3d08915189d699846adc0bda33b7dcf97d64fe9`. Git attributes preserve original CSV/catalogue bytes.
- Schema: 縣市、機關代碼、登錄號碼、租賃業名稱、執業狀態.415 rows,415 unique registrations,0 missing names/registrations, all source-listed 臺北市 /379700000A /執業中. These are the source's historical statements, not independent checks of present status.
- Catalogue coverage through **2025-06-17**; CSV resource updated **2025-12-30 17:04:22**; catalogue metadata updated **2025-12-30 17:04:37**. Displayed source timestamps have no explicit timezone. First publication unknown/null. Retrieval **2026-11-02T05:54:10.8219747Z** is separate from those dates and does not make the historical data current.
- Generated files: `public/data/rental-housing-service-businesses/{records,summary,metadata}.json`; conversion-report adds only this source. Raw fields are retained verbatim; existing normalization/status labels and registration-based IDs are unchanged. No geocoding, identity joins, legal conclusions, quality rankings or new dataset.

Reproduce offline with `node --import tsx scripts/convertRentalHousingServiceBusinesses.ts`. The converter requires the pinned source hash/identity, nonempty compatible schema and identifiers before writing any output. Absent/changed/malformed inputs fail; update the provenance only after reviewing an authentic new source. Do not resolve a download failure by creating an empty CSV or approving the separate active-provider dataset.

For future acquisition, first download the registered official page/resource into a review staging directory. Verify title/publisher/resource link/schema/date/count/bytes, compare with this edition, explicitly review provenance and retained source bytes, and run the offline converter and release checks on a review branch. The existing fetcher skips retained CSV by default; `--force` replaces its bytes and will intentionally fail conversion until the changed source hash has been reviewed.

Verification for this edition:86 unit tests (including all415 source-row reproduction and missing/empty/hash/schema/identifier failure preservation), TypeScript/Vite build, release validation748JSON/4 disclosed pre-existing duplicate warnings, offline Urban Renewal audit, dependency audit, existing44 browser checks, directory12 state checks, and real415-row directory/Data Status browser checks. Actual logs are in the audit report. The missing-data P1 is resolved in this candidate; merge/deployment and hosted expected-SHA acceptance remain separate.

繁體中文：本次補回既有「租賃住宅服務業者」畫面缺少的官方來源快照，並保留原始 Big5 位元組、欄位、來源日期、雜湊與415筆登錄紀錄。來源涵蓋至2025-06-17，2026-11-02僅為擷取日期，不能解讀為目前仍執業、服務品質或安全保證。未使用另一份「執業租賃住宅服務業者」資料替代。原始檔缺漏、雜湊改變或格式不符時，轉檔會停止並保留最後有效輸出；須先獨立審查新來源，再更新核准的來源紀錄。
