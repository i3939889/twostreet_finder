# TwoStreet Finder

使用 TypeScript 與 Playwright 撰寫的 2nd STREET 台灣官網商品爬蟲。

目前功能：

- 從 `.env` 讀取主分類、次分類、分店名稱
- 進入指定主分類與多個次分類
- 自動捲動商品列表直到沒有新資料
- 篩選商品標題開頭符合指定分店的商品
- 輸出 JSON、run summary 與 log
- 支援 `chromium` 與 `firefox`

## 需求環境

- Node.js 18+
- npm

已在本機驗證可用：

- `chromium`
- `firefox`

## 安裝

```bash
npm install
```

如果未來搬到新機器，第一次使用指定瀏覽器前可先安裝 Playwright browser：

```bash
npx playwright install chromium
npx playwright install firefox
```

在 Ubuntu 上如果偏好 Firefox，通常只要：

```bash
npx playwright install firefox
```

若 Ubuntu 缺少系統依賴，可再執行：

```bash
npx playwright install-deps
```

## 設定檔

請在專案根目錄建立 `.env`，可參考 [` .env.example`](/D:/Projects/twostreet_finder/.env.example)。

範例：

```dotenv
MAIN_CAT=男裝
SUB_CAT=POLO衫,長褲
STORE_NAME=環球板橋車站店,誠品生活板橋店
HEADLESS=true
BROWSER=chromium
TIME_ZONE=Asia/Taipei
OUTPUT_DIR=output
LOG_LEVEL=info
MAX_SCROLL_IDLE_ROUNDS=3
MAX_SCROLL_ROUNDS=200
NAVIGATION_TIMEOUT_MS=30000
ACTION_TIMEOUT_MS=10000
SLOW_MO_MS=0
```

### 欄位說明

- `MAIN_CAT`
  單一主分類，例如 `男裝`

- `SUB_CAT`
  多個次分類，使用逗號分隔，例如 `POLO衫,長褲`

- `STORE_NAME`
  多個分店名稱，使用逗號分隔，例如 `環球板橋車站店,誠品生活板橋店`

- `HEADLESS`
  `true` 或 `false`

- `BROWSER`
  可選 `chromium` 或 `firefox`

- `TIME_ZONE`
  run id 與輸出檔名使用的時區，例如 `Asia/Taipei`
  若未提供，預設使用機器目前時區

- `OUTPUT_DIR`
  輸出根目錄，預設 `output`

- `LOG_LEVEL`
  可選 `debug`、`info`、`warn`、`error`

- `MAX_SCROLL_IDLE_ROUNDS`
  連續幾輪沒有新資料就停止捲動

- `MAX_SCROLL_ROUNDS`
  最大捲動輪數，避免無限迴圈

- `NAVIGATION_TIMEOUT_MS`
  頁面導航 timeout

- `ACTION_TIMEOUT_MS`
  元素操作 timeout

- `SLOW_MO_MS`
  Playwright 操作減速毫秒數，除錯時可加大

## 常用指令

型別檢查：

```bash
npm run check
```

單元測試：

```bash
npm test
```

直接執行 crawler：

```bash
npm run dev
```

編譯：

```bash
npm run build
```

執行編譯後版本：

```bash
npm run start
```

## 輸出位置

所有輸出都放在 `output/` 下。

### 商品資料

- [`output/data/latest.json`](/D:/Projects/twostreet_finder/output/data/latest.json)
- `output/data/products-<runId>.json`

### 日誌

- [`output/logs/app.log`](/D:/Projects/twostreet_finder/output/logs/app.log)
- `output/logs/run-<runId>.jsonl`

### 執行摘要

- `output/runs/<runId>-summary.json`

### 除錯產物

- `output/artifacts/<runId>/`

當某個次分類失敗時，會在這裡產生：

- screenshot
- HTML dump

而且 summary 的 `errors` 欄位會記錄對應路徑。

## 檔名格式

目前 `runId` 已改為簡化格式，並使用本地時區時間：

```text
YYYYMMDD-HHMMSS-xxx
```

例如：

```text
20260318-164133-pk8
```

## 瀏覽器切換

### 使用 Chromium

```dotenv
BROWSER=chromium
```

### 使用 Firefox

```dotenv
BROWSER=firefox
```

這個設定只需要改 `.env`，不需要改程式碼。

## 目前驗證過的流程

已實際驗證以下情境可運作：

- `MAIN_CAT=男裝`
- `SUB_CAT=POLO衫,長褲`
- `STORE_NAME=環球板橋車站店,誠品生活板橋店`

目前最新成功執行可參考：

- [`output/runs/20260318T082648Z-m4tuzy-summary.json`](/D:/Projects/twostreet_finder/output/runs/20260318T082648Z-m4tuzy-summary.json)

較新的簡化檔名 run 也已驗證：

- [`output/runs/20260318-164133-pk8-summary.json`](/D:/Projects/twostreet_finder/output/runs/20260318-164133-pk8-summary.json)

該次為 Firefox 測試，但因命令列臨時覆寫 `SUB_CAT` 時發生終端編碼問題，summary 中保留了失敗 artifact，可用來驗證錯誤輸出流程。

## 開發建議

日常開發流程建議：

1. 先修改 `.env`
2. 跑 `npm run check`
3. 跑 `npm test`
4. 跑 `npm run dev`
5. 看 `output/data/latest.json`
6. 若失敗再看 `output/runs/*.json` 與 `output/logs/*.jsonl`

## 已知限制

- 次分類網址目前是從頁面內嵌資料中解析，不是透過穩定公開 API
- 目標站 DOM 與內嵌資料格式若大幅變動，可能需要調整 `navigator`
- 大分類商品量很大時，完整跑完可能需要數分鐘

## 相關文件

- [`docs/breif.md`](/D:/Projects/twostreet_finder/docs/breif.md)
- [`docs/spec.md`](/D:/Projects/twostreet_finder/docs/spec.md)
- [`docs/tech-design.md`](/D:/Projects/twostreet_finder/docs/tech-design.md)
