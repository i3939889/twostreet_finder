# TwoStreet Finder 技術設計

## 1. 技術選型

本專案採用以下技術組合：

- 語言：TypeScript
- 執行環境：Node.js
- 瀏覽器自動化：Playwright
- 設定檔管理：dotenv
- 日誌管理：pino
- 輸入驗證：zod
- 開發期執行：tsx

選擇 TypeScript 的原因：

- Playwright 在 Node.js 生態支援最完整
- Locator API 與型別提示可降低 selector 與資料欄位錯誤
- 模組化、錯誤處理與維護性優於一次性腳本寫法

## 2. 專案目標

專案需完成以下能力：

- 從 `.env` 載入執行設定
- 開啟 2nd STREET 台灣官網
- 導航到指定主分類與多個次分類
- 捲動商品列表直到資料載入完成
- 篩選標題開頭符合分店名稱的商品
- 去重後輸出 JSON
- 產生日誌、錯誤摘要與執行紀錄

## 3. 專案目錄設計

建議目錄結構如下：

```text
twostreet_finder/
├─ docs/
│  ├─ breif.md
│  ├─ spec.md
│  └─ tech-design.md
├─ output/
│  ├─ data/
│  ├─ logs/
│  ├─ artifacts/
│  └─ runs/
├─ src/
│  ├─ config/
│  │  ├─ env.ts
│  │  └─ schema.ts
│  ├─ core/
│  │  ├─ crawler.ts
│  │  ├─ navigator.ts
│  │  ├─ scraper.ts
│  │  ├─ scroller.ts
│  │  ├─ filter.ts
│  │  └─ dedupe.ts
│  ├─ infra/
│  │  ├─ logger.ts
│  │  ├─ fs.ts
│  │  ├─ clock.ts
│  │  └─ playwright.ts
│  ├─ models/
│  │  ├─ config.ts
│  │  ├─ product.ts
│  │  ├─ run-result.ts
│  │  └─ error.ts
│  ├─ output/
│  │  ├─ writer.ts
│  │  └─ manifest.ts
│  ├─ utils/
│  │  ├─ text.ts
│  │  └─ retry.ts
│  ├─ index.ts
│  └─ cli.ts
├─ .env
├─ .env.example
├─ package.json
├─ tsconfig.json
└─ playwright.config.ts
```

設計原則：

- `src/config`：只處理設定讀取與驗證
- `src/core`：只處理業務流程
- `src/infra`：處理 logger、檔案系統、時間、browser 啟動
- `src/models`：統一定義資料型別
- `src/output`：處理輸出檔案與執行報表

## 4. 設定檔管理

### 4.1 設定來源

初版只使用 `.env` 作為主要設定來源。

必要欄位：

- `MAIN_CAT`
- `SUB_CAT`
- `STORE_NAME`

建議追加欄位：

- `HEADLESS`
- `OUTPUT_DIR`
- `LOG_LEVEL`
- `MAX_SCROLL_IDLE_ROUNDS`
- `NAVIGATION_TIMEOUT_MS`
- `ACTION_TIMEOUT_MS`
- `SLOW_MO_MS`

### 4.2 `.env` 範例

```dotenv
MAIN_CAT=服裝
SUB_CAT=短袖T恤,牛仔褲,帽T
STORE_NAME=台北西門店,台中一中店
HEADLESS=true
OUTPUT_DIR=output
LOG_LEVEL=info
MAX_SCROLL_IDLE_ROUNDS=3
NAVIGATION_TIMEOUT_MS=30000
ACTION_TIMEOUT_MS=10000
SLOW_MO_MS=0
```

### 4.3 設定轉換規則

- `MAIN_CAT`：字串，單一值
- `SUB_CAT`：逗號分隔字串轉陣列
- `STORE_NAME`：逗號分隔字串轉陣列
- `HEADLESS`：字串轉布林
- timeout、輪數設定：字串轉數字

### 4.4 設定驗證策略

使用 `zod` 驗證：

- 必要欄位不可缺失
- `MAIN_CAT` 不可包含逗號
- `SUB_CAT` 陣列至少一筆
- `STORE_NAME` 陣列至少一筆
- timeout 與輪數需為正整數

若設定無效：

- 啟動即失敗
- 於 console 與 log 輸出明確錯誤原因
- 不進入 Playwright 執行階段

### 4.5 `.env` 管理策略

- `.env`：本機實際設定，不應提交敏感資料
- `.env.example`：提交到版本庫，提供欄位模板與說明
- 實際執行時只讀取專案根目錄的 `.env`

## 5. 執行模式設計

### 5.1 Headless 模式

用途：

- 正式執行
- 自動化排程
- 降低資源占用

### 5.2 Headed 模式

用途：

- selector 除錯
- 頁面操作驗證
- UI 流程確認

建議由 `HEADLESS` 控制。

### 5.3 單次執行模型

每次執行只完成一次完整工作流：

- 載入設定
- 處理所有 `SUB_CAT`
- 整理結果
- 寫出產物
- 結束

不設計為常駐服務。

## 6. 核心流程設計

### 6.1 高階流程

```text
load config
-> validate config
-> create run context
-> launch browser
-> open homepage
-> open main category
-> for each sub category
   -> navigate to sub category
   -> scroll and collect products
   -> filter by store name
   -> dedupe
-> write outputs
-> close browser
```

### 6.2 主分類處理策略

由於 `MAIN_CAT` 固定單一值：

- 瀏覽器啟動後只需展開一次主分類
- 每次切換 `SUB_CAT` 時需重新確認目前選單狀態是否仍可操作
- 若網站切頁後選單結構消失，可回到首頁或重新打開分類選單

### 6.3 次分類處理策略

每個 `SUB_CAT` 為獨立工作單元，執行內容包括：

- 切換至該次分類頁
- 掃描已載入商品
- 滾動至無新資料
- 過濾與去重
- 回傳該次分類結果與錯誤資訊

這樣可以在後續擴充：

- 每個次分類獨立重試
- 每個次分類輸出執行統計

## 7. Playwright 導航設計

### 7.1 Browser 啟動策略

建議封裝統一 browser factory：

- `chromium.launch()`
- 支援 `headless`
- 支援 `slowMo`
- 設定預設 timeout

### 7.2 Page 設定

建議在建立 page 後設定：

- `page.setDefaultTimeout(ACTION_TIMEOUT_MS)`
- `page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)`

### 7.3 Selector 策略

優先順序：

1. 文字內容
2. `role`/可存取屬性
3. 穩定結構定位
4. 最後才考慮 CSS class

理由：

- 電商站 class name 常變動
- 文字與結構通常更穩定

### 7.4 等待策略

避免單純 `waitForTimeout`。

優先使用：

- `locator.waitFor()`
- 頁面文字出現
- 商品卡片數量增加
- URL 或內容變化

只有在網站本身動畫或 lazy render 很明顯時，才輔助少量固定等待。

## 8. 商品擷取與資料模型

### 8.1 Product 資料模型

建議型別：

```ts
type Product = {
  title: string;
  url: string;
  storeName: string;
  mainCategory: string;
  subCategory: string;
  price?: string;
  imageUrl?: string;
  productId?: string;
  scrapedAt: string;
};
```

### 8.2 Raw Product 與 Normalized Product

建議分兩階段：

- `RawProduct`：直接從 DOM 抽出的原始欄位
- `Product`：清理、補欄位、比對成功後的標準資料

好處：

- DOM 抓取與業務判定分離
- 除錯時能看出是抓取問題還是過濾問題

### 8.3 比對規則

- 先清理 title 空白
- 用 `STORE_NAME` 陣列依序檢查
- 第一個命中的 `storeName` 寫入資料
- 無命中則捨棄

## 9. 捲動策略設計

### 9.1 停止條件

初版使用雙條件策略：

- 商品數量無增加
- 頁面高度無增加

若連續 `MAX_SCROLL_IDLE_ROUNDS` 次都沒有變化，停止捲動。

### 9.2 每輪捲動流程

1. 記錄目前商品數量與頁面高度
2. 滾動到頁面底部
3. 等待新的商品或高度變化
4. 再次讀取商品數量與高度
5. 判斷是否進入 idle

### 9.3 捲動安全機制

避免無限迴圈，建議加上：

- 最大捲動輪數，例如 200 輪
- 若超過上限，記錄 warning 並結束該次分類

## 10. 去重策略

### 10.1 主鍵

首選：

- `url`

備援：

- `title + price`

### 10.2 去重範圍

需至少支援兩層：

- 同一個 `SUB_CAT` 內去重
- 全部 `SUB_CAT` 合併後再去重

### 10.3 保留策略

若發生重複：

- 預設保留第一筆
- 不覆蓋已存在資料
- 可記錄 `duplicateCount` 到 run summary，但不必寫進 product 本體

## 11. Log 管理設計

### 11.1 Log 套件

建議使用 `pino`：

- 效能穩定
- 結構化 JSON log 容易後續分析
- 可同時輸出到 console 與檔案

### 11.2 Log 等級

建議使用：

- `debug`
- `info`
- `warn`
- `error`

### 11.3 Log 內容

每筆 log 建議包含：

- `timestamp`
- `level`
- `runId`
- `module`
- `message`
- `mainCategory`
- `subCategory`
- `storeName` 或 `storeNames`
- `count` 類統計欄位
- `error` 物件

### 11.4 Log 類型

建議拆成兩種：

- Console log：給人直接閱讀
- File log：JSON 結構化紀錄

### 11.5 Log 路徑設計

建議路徑：

- `output/logs/app.log`
- `output/logs/run-<runId>.jsonl`

說明：

- `app.log`：滾動累積，可快速查看最近執行
- `run-<runId>.jsonl`：每次執行一份，方便追查問題

### 11.6 重要事件記錄

至少需記錄：

- 啟動設定摘要
- Browser 啟動成功
- 進入主分類
- 切換次分類
- 每輪捲動新增商品數
- 命中商品數
- 輸出檔案路徑
- 任何例外與 stack trace

## 12. 輸出資料放置方式

### 12.1 輸出根目錄

由 `OUTPUT_DIR` 控制，預設為：

- `output`

### 12.2 產物分類

建議拆成以下子目錄：

- `output/data`
- `output/logs`
- `output/artifacts`
- `output/runs`

### 12.3 各目錄用途

`output/data`

- 存最終商品 JSON
- 可保留 latest 與歷史版本

`output/logs`

- 存應用程式 log 與每次執行 log

`output/artifacts`

- 存錯誤截圖
- 存 HTML dump
- 存除錯用頁面快照

`output/runs`

- 存每次執行的 manifest 或 summary

### 12.4 檔名策略

建議每次執行產生唯一 `runId`：

- 格式可用 UTC 時間戳搭配隨機短碼
- 例如：`20260318T072233Z-a1b2c3`

### 12.5 輸出檔案範例

```text
output/
├─ data/
│  ├─ latest.json
│  └─ products-20260318T072233Z-a1b2c3.json
├─ logs/
│  ├─ app.log
│  └─ run-20260318T072233Z-a1b2c3.jsonl
├─ artifacts/
│  └─ 20260318T072233Z-a1b2c3/
│     ├─ error-homepage.png
│     └─ error-subcat-短袖T恤.html
└─ runs/
   └─ 20260318T072233Z-a1b2c3-summary.json
```

## 13. Run Summary 設計

每次執行建議額外產出一份 summary：

```ts
type RunSummary = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  mainCategory: string;
  subCategories: string[];
  storeNames: string[];
  totalCollected: number;
  totalMatched: number;
  totalDeduped: number;
  outputFile: string;
  logFile: string;
  errors: Array<{
    subCategory?: string;
    message: string;
  }>;
};
```

用途：

- 讓每次執行有明確結果摘要
- 方便排查哪個次分類失敗
- 可作為未來排程整合輸入

## 14. 錯誤處理設計

### 14.1 錯誤分類

建議分為：

- `ConfigError`
- `NavigationError`
- `SelectorError`
- `ScrapeError`
- `OutputError`

### 14.2 錯誤處理原則

- 設定錯誤：立即停止
- Browser 啟動失敗：立即停止
- 單一 `SUB_CAT` 錯誤：記錄後繼續下一個
- 輸出失敗：視為整體失敗

### 14.3 除錯產物

當發生重要錯誤時，建議自動輸出：

- 當前頁面截圖
- 當前 HTML 內容
- 錯誤 stack

存放位置：

- `output/artifacts/<runId>/`

## 15. CLI 與啟動方式

### 15.1 建議 scripts

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "check": "tsc --noEmit"
  }
}
```

### 15.2 CLI 擴充方向

初版可先不做複雜 CLI，但建議保留擴充空間，例如：

- `--headless=false`
- `--log-level=debug`
- `--sub-cat=短袖T恤`
- `--output-dir=output`

原則：

- 初版以 `.env` 為主
- CLI 可覆蓋 `.env` 設定

## 16. 測試策略

### 16.1 單元測試

適合測的內容：

- `.env` 解析
- 分店名稱比對
- 去重函式
- runId 生成

### 16.2 整合測試

適合測的內容：

- 進入首頁
- 展開主分類
- 點擊次分類
- 抽取商品資料結構

### 16.3 實務建議

由於目標站可能變動頻繁，初版先以：

- 核心 pure functions 做單元測試
- 實站驗證靠 headed 模式與 log/artifact 輔助

## 17. 版本 1 實作邊界

初版建議先做到以下範圍：

- `.env` 讀取與驗證
- 單一 `MAIN_CAT`
- 多個 `SUB_CAT`
- 多個 `STORE_NAME`
- 商品標題、網址、價格、圖片
- JSON 輸出
- log 與 run summary
- 錯誤截圖與 HTML dump

初版可暫不處理：

- 代理 IP
- 驗證碼繞過
- 分散式執行
- 資料庫儲存
- 雲端部署
- 增量同步策略

## 18. 建議實作順序

1. 初始化 Node.js + TypeScript + Playwright 專案
2. 建立 `.env` schema 與設定讀取模組
3. 建立 logger 與 output 目錄管理
4. 先完成首頁到單一次分類的導航
5. 完成商品擷取與過濾
6. 加入捲動與停止條件
7. 加入去重與 JSON 輸出
8. 補上 summary、artifact 與錯誤處理

## 19. 結論

這份技術設計的核心方向是：

- 使用 TypeScript 與 Playwright 作為主軸
- 用 `.env + zod` 管理設定
- 用 `pino` 管理結構化 log
- 用 `output/` 統一管理資料、log、artifact 與 run summary
- 用單次執行模型保持流程清晰，方便除錯與後續擴充

這樣的設計足以支撐目前需求，也保留了後續擴充空間，不會過度工程化。
