# 臺北實價與人口趨勢儀表板

[English](README.md)

這是一個支援繁體中文與英文、可在各種螢幕尺寸使用的儀表板，整合臺北市房市、租金、土地、開發、公共紀錄與城市背景資料。

**線上網站：** https://LEO0331.github.io/taipei-real-estate-dashboard/

## 用途

本儀表板將不同公開資料集放在一致的探索介面中，並分為五個主題：

- **市場觀察**：市場總覽、房價月/季指數、住宅與商辦租金、行政區比較、實價季動態。
- **土地與開發**：使用執照、土地現值、土地使用管制、地價稅、徵收、市地重劃與地籍清理紀錄。
- **居住與城市**：所得、消費者物價、用電量、社會住宅、人口資料與租賃住宅服務業者。
- **服務與公共紀錄**：不動產經紀、消費爭議、估價師、市有資產、公共工程、捷運聯開與工程大事記。
- **資料工具**：來源資料表、方法說明與資料狀態/涵蓋期間。

請使用主題導覽或資料集搜尋來尋找內容。小螢幕會顯示 **瀏覽資料集** 按鈕，開啟可使用鍵盤操作的資料目錄。

## 重要限制

### 都市更新政策資料查核（政策議題6）

在**土地與開發**開啟**老舊建築與都市更新決策分析**。此延遲載入的研究 POC 將全市建物存量脈絡與行政區行政查核問題分開，支援確定性查核層級、5／10／自訂／不限容量、三種策略、標示證據範圍的敏感度比較，以及具公式注入保護的 JSON／CSV 摘要。

已查核快照包含全市建物存量50年（1976–2025）、11區的75筆更新單元核准公文（2023-02–2024-06）與全市容積獎勵24年（2002–2025）。缺少信義區列不代表零案件。1976–2006屋齡欄位與合計不一致的2012年不可用。目前11個同條件研究問題的策略結果相同；容量5／10選入5／10區。這是文件查核問題，不是建物危險或更新需求評分。

執行 `npm run data:audit:urban-renewal-evidence` 與 `npm run data:convert:urban-renewal-evidence` 可離線查核及重現；刻意擷取來源請用 `npm run data:fetch:urban-renewal-evidence`，版本變更須重新稽核。原始檔與來源證據位於 `data/raw/urban-renewal-decision/`，瀏覽器摘要位於 `public/data/urban-renewal-decision/`。不爬取目前案件狀態，也不做物件層級串聯。詳見[來源查核](docs/urban-renewal-source-audit.md)、[方法說明](docs/urban-renewal-decision-methodology.md)與[實作文件](docs/urban-renewal-decision-mvp.zh-TW.md)。

本網站是公開資料的資訊工具，**不是** 房屋或租金估價、產權查核、使用分區證明、稅額計算、法律意見、投資建議、貸款建議、預測或建築安全評估工具。

- 前端僅讀取 `public/data/` 的靜態 JSON，不會直接呼叫臺北市開放資料 API。
- 資料狀態頁會標示記錄的涵蓋期間與更新資訊；最新且具權威性的資訊仍應以官方系統為準。
- 行政區層級的背景資料不能推論到單一地號、地址或建物。本專案不進行地理編碼，也不推論圖資、所有權、現況出售/出租資訊或法律權利。
- 裁罰、爭議與名冊等行政紀錄不代表目前狀態、服務品質、信用、安全性或官方推薦。
- 地籍清理標售分析保留官方欄位，僅在官方資料明確提供總底價時才比較底價；結果不代表市價或投資適合性。

如需客戶溝通與技術限制的完整說明，請參閱[儀表板決策洞察與技術說明](docs/dashboard-decision-insights-and-technical-notes.md)。

## 資料來源

本專案整合臺北市開放資料與官方公開紀錄，包含：

- [實價登錄交易資料](https://data.taipei/dataset/detail?id=a9a97996-3a55-46c8-9076-e5ebdefad6dc)
- [住宅價格月指數](https://data.taipei/dataset/detail?id=ce4ea2c6-6334-44f8-945a-5705492b187d)
- [住宅價格季指數](https://data.taipei/dataset/detail?id=954911b5-896d-4ae1-9ebe-87c4ba8a191e)
- [住宅租金指數](https://data.taipei/dataset/detail?id=53e5ee8d-9a90-42bc-9874-3a8747ae6afa)
- [商辦租金指數](https://data.taipei/dataset/detail?id=8a3d1df7-9169-4dd0-ae0a-949d970e9bb3)
- [建築物使用執照](https://data.taipei/dataset/detail?id=c876ff02-af2e-4eb8-bd33-d444f5052733)
- [土地使用管制彙整](https://data.taipei/dataset/detail?id=cb964837-c602-4238-b6c0-f63ad1094d5e)
- [各行政區每戶所得](https://data.taipei/dataset/detail?id=33da4ba0-c366-45eb-a71f-1991e6455ed6)
- [臺北市消費者物價指數](https://data.taipei/dataset/detail?id=7ee57050-4d27-482c-bae5-ebd15ca86702)
- [臺北市售電量](https://data.taipei/dataset/detail?id=9bfb5424-1996-461a-b19b-f75101e2f459)
- [臺北捷運聯合開發公有不動產標售物件資料](https://data.taipei/dataset/detail?id=9527ea34-7c55-4c23-9f0e-80164f888f06)
- [臺北捷運土地開發作業](https://data.taipei/dataset/detail?id=0b5048f7-1608-4da4-ac30-4e26f3f452f2)

各資料集的可用性與涵蓋期間不同。儀表板會在必要處保留原始字串，並在對應視圖中說明衍生指標。

## 本機開發

需求：Node.js 22 與 npm。

```bash
npm install
npm test
npm run build
npm run dev
```

更新資料時，依需要執行擷取與轉換指令：

```bash
npm run data:fetch
npm run data:convert
```

原始資料放在 `data/raw/`；提供給瀏覽器的產出放在 `public/data/`。請勿在瀏覽器程式碼中加入即時呼叫臺北市開放資料的功能。

## 新增資料集

每個資料集新增都是可追蹤的功能，而不只是新增檔案。結束工作前請完成：

- 建立靜態擷取與轉換流程、保留重要原始欄位，並記錄所有衍生指標；
- 視需要將資料集納入完整 `data:fetch`／`data:convert` 流程、PWA 快取、導覽、資料狀態頁與雙語文件；
- 加入聚焦的回歸測試，並執行必要的測試與正式建置；
- 在 `feature_list.json` 與 `progress.md` 同時記錄來源網址、涵蓋／更新限制、產出筆數佐證、風險與驗證結果。

請讓 `README.md`、`README-zh-TW.md`、`feature_list.json` 與 `progress.md` 始終和已發布的資料集一致。

## 驗證

```bash
npm ci
npm audit
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

發布前，先擷取並轉換本次要使用的來源，再重跑測試與都市更新來源稽核，接著執行 `npm run release:verify`，最後建置。驗證會產生不納入版本控制的 `public/release-manifest.json`，記錄程式提交 SHA 與實際資料雜湊；缺少必要產出時會失敗。剛取得的儲存庫不能取代完整資料流程，處理時間也不代表來源資料已更新。

[Explorer API 與責任邊界](docs/civic-explorer-api.md) 說明本專案獨立的資料介接與數字分頁導覽介面。[2026-10-29 維護報告](docs/civic-explorer-maintenance.md) 記錄鍵盤／觸控修正、保留來源處理、資料更新後的發布檢查及部署後瀏覽器檢查。Playwright 僅供開發與驗證，不會加入應用程式執行時。

若環境支援 Bash，也可執行 `bash ./init.sh` 來走啟動與驗證流程。

## 部署

Vite 的基礎路徑是 `/taipei-real-estate-dashboard/`。GitHub Actions 會在擷取／轉換後重新測試並驗證資料，建置及部署 `dist`，再依預期程式 SHA 執行已部署網站的瀏覽器檢查。PR 合併或建置成功，不能單獨證明部署或正式網站驗收成功；請分別查看部署與部署後檢查結果。

請在儲存庫設定中啟用 **Pages → Build and deployment → GitHub Actions**。

## 可選的資料探索與維護範圍

「探索資料」使用既有五個主題與 46 個導覽目標。SVG 六角主題僅供裝飾與導覽；使用一般 HTML 清單即可開啟所有項目，無須操作圖形。返回儀表板時，原本已掛載的篩選狀態會保留。導覽仍使用記憶體中的分頁狀態；重新整理回到預設頁面，瀏覽器上一頁／下一頁不會追蹤資料集分頁。

完成審查後，本計畫維持僅維護狀態：相依套件與安全更新、實際錯誤、事實／來源更正及發布佐證。新增政策案例、大幅重新設計、強制 3D 引擎、共享套件或其他儀表板整合，都需要另外提出有依據的決定。既有附日期的稽核與瀏覽器報告保留為歷史佐證，不代表較新版本已通過同樣驗收。
