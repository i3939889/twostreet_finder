# TwoStreet Finder

使用 TypeScript 與 Playwright 實作的 2nd STREET Taiwan 商品爬蟲。

目前流程已改成兩階段：
- 第一階段只抓列表頁，篩出符合條件的商品與詳細頁 URL
- 第二階段再逐筆進詳細頁補資料

這樣可以降低單一 page 同時承擔列表滾動與詳細頁抓取的複雜度，穩定性比舊的單流程版本高。

## Requirements

- Node.js 18+
- npm

第一次使用前建議安裝 Playwright browser：

```bash
npx playwright install chromium
npx playwright install firefox
```

Ubuntu 若缺系統相依套件，可再執行：

```bash
npx playwright install-deps
```

## Setup

建立根目錄 `.env`，可參考 [` .env.example`](/D:/Projects/twostreet_finder/.env.example)：

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
SUB_CATEGORY_TIMEOUT_MS=180000
NAVIGATION_TIMEOUT_MS=30000
ACTION_TIMEOUT_MS=10000
SLOW_MO_MS=0
```

重點欄位：

- `MAIN_CAT`: 單一主分類
- `SUB_CAT`: 多個次分類，逗號分隔
- `STORE_NAME`: 多個店名，逗號分隔
- `BROWSER`: `chromium` 或 `firefox`
- `SUB_CATEGORY_TIMEOUT_MS`: 單一次分類最大處理時間

## Commands

```bash
npm run check
npm test
npm run dev
npm run build
npm run start
```

## Current Flow

`npm run dev` 目前會執行：

1. Stage 1: 進入分類列表頁，捲動並抓取符合店名條件的商品
2. 將中間結果寫到 `matched-<runId>.json`
3. Stage 2: 逐筆打開商品詳細頁，抓 `detail` 欄位
4. 輸出 final JSON 與 summary

## Output

所有輸出都在 `output/`：

- [`output/data/latest.json`](/D:/Projects/twostreet_finder/output/data/latest.json)
- `output/data/products-<runId>.json`
- `output/data/matched-<runId>.json`
- [`output/logs/app.log`](/D:/Projects/twostreet_finder/output/logs/app.log)
- `output/logs/run-<runId>.jsonl`
- `output/runs/<runId>-summary.json`
- `output/artifacts/<runId>/`

`matched-<runId>.json` 是第一階段結果。就算詳細頁補資料失敗，列表頁成果仍會保留。

## Recent Validation

最新驗證 run：
- summary: [`20260327-122814-45i-summary.json`](/D:/Projects/twostreet_finder/output/runs/20260327-122814-45i-summary.json)
- staged: [`matched-20260327-122814-45i.json`](/D:/Projects/twostreet_finder/output/data/matched-20260327-122814-45i.json)
- final: [`products-20260327-122814-45i.json`](/D:/Projects/twostreet_finder/output/data/products-20260327-122814-45i.json)

這次結果：
- `POLO衫` 命中 10 筆
- `長褲` 命中 3 筆
- `totalDetailed: 13`
- `errors: []`

## Notes

- 次分類頁很重時，抓到的 `rawCount` 可能不是整站全部商品，而是目前策略下可穩定取得的數量
- 詳細頁欄位是寬鬆解析，原始內容仍保留在 `detail.rawSectionLines` / `detail.featureLines`
- 若未來要更穩，可再把 Stage 1 / Stage 2 拆成兩個獨立 CLI

## Docs

- [`docs/breif.md`](/D:/Projects/twostreet_finder/docs/breif.md)
- [`docs/spec.md`](/D:/Projects/twostreet_finder/docs/spec.md)
- [`docs/tech-design.md`](/D:/Projects/twostreet_finder/docs/tech-design.md)
