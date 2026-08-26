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
npm.cmd test
npm.cmd run build
```

若環境支援 Bash，也可執行 `bash ./init.sh` 來走完整的啟動與驗證流程。

## 部署

Vite 的基礎路徑是 `/taipei-real-estate-dashboard/`。GitHub Actions 會測試、轉換資料、建置並將 `dist` 部署至 GitHub Pages。

請在儲存庫設定中啟用 **Pages → Build and deployment → GitHub Actions**。
