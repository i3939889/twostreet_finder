# 技術設計

## 1. 技術選型

- 語言：TypeScript
- 執行環境：Node.js
- 瀏覽器自動化：Playwright
- 設定管理：dotenv + zod
- 日誌：pino
- 測試：node:test + tsx

選 TypeScript 的原因是 Playwright 在 Node 生態最完整，locator API、型別提示、模組化結構都比較好維護。

## 2. 現行架構

目前 crawler 已從單流程改成兩階段：

1. Stage 1 `list crawl`
   - 進主分類 / 次分類
   - 滾動列表頁
   - 擷取商品卡
   - 依 `STORE_NAME` 過濾
   - 先輸出中間結果

2. Stage 2 `detail enrich`
   - 讀取 Stage 1 命中的商品 URL
   - 逐筆進詳細頁抓資料
   - 單筆抓完即關閉 page
   - 回填到 final output

這樣做的原因是降低列表頁與詳細頁彼此干擾，改善先前單一流程中 page 狀態污染、長時間不收尾與 `TargetClosedError` 的問題。

## 3. 設定檔管理

設定來源為根目錄 `.env`。

核心欄位：

- `MAIN_CAT`
- `SUB_CAT`
- `STORE_NAME`
- `HEADLESS`
- `BROWSER`
- `TIME_ZONE`
- `OUTPUT_DIR`
- `LOG_LEVEL`
- `MAX_SCROLL_IDLE_ROUNDS`
- `MAX_SCROLL_ROUNDS`
- `SUB_CATEGORY_TIMEOUT_MS`
- `NAVIGATION_TIMEOUT_MS`
- `ACTION_TIMEOUT_MS`
- `SLOW_MO_MS`

規則：

- `MAIN_CAT` 只能是單一值
- `SUB_CAT` 與 `STORE_NAME` 可多值，逗號分隔
- 所有設定在啟動時用 `zod` 驗證
- 驗證失敗直接中止，不進 Playwright

## 4. 目錄結構

```text
src/
  config/
  core/
  infra/
  models/
  output/
  test/
```

責任分工：

- `config`: `.env` 讀取與 schema 驗證
- `core`: navigator / scroller / scraper / crawler / detail scraper
- `infra`: 檔案、logger、clock、Playwright 啟動
- `models`: 型別與錯誤模型
- `output`: JSON 寫出
- `test`: 單元測試

## 5. 兩階段流程細節

### Stage 1

每個 `SUB_CAT`：

- 建立單獨 `page`
- `openHomePage()`
- `openMainCategory()`
- `openSubCategory()`
- `scrollUntilSettled()`
- `collectVisibleProducts()`
- `toMatchedProduct()`
- 關閉 `page`

完成後輸出：

- `output/data/matched-<runId>.json`

### Stage 2

每筆命中商品：

- 建立單獨 `page`
- 開啟詳細頁
- 抓取 `detail`
- 關閉 `page`

完成後輸出：

- `output/data/products-<runId>.json`
- `output/data/latest.json`

## 6. 輸出設計

### Data

- `output/data/matched-<runId>.json`
  - Stage 1 中間結果
  - 只有列表頁資料

- `output/data/products-<runId>.json`
  - 最終結果
  - 包含 detail

- `output/data/latest.json`
  - 最新一次 final 結果

### Logs

- `output/logs/app.log`
- `output/logs/run-<runId>.jsonl`

### Summary

- `output/runs/<runId>-summary.json`

summary 目前包含：

- `totalCollected`
- `totalMatched`
- `totalDeduped`
- `totalDetailed`
- `stagedFile`
- `outputFile`
- `errors`

### Artifacts

- `output/artifacts/<runId>/`

列表頁階段若失敗，會保留：

- screenshot
- HTML dump

## 7. Log 管理

使用 `pino`。

策略：

- `app.log`: 全域 append log
- `run-<runId>.jsonl`: 單次執行 log

主要欄位：

- `runId`
- `module`
- `stage`
- `subCategory`
- `rawCount`
- `matchedCount`
- `err`

目前常見 `stage`：

- `list`
- `detail`

## 8. 穩定性策略

已實作：

- 單一次分類 timeout
- page / browser close timeout
- 成功時清除 timeout timer
- 每個次分類使用獨立 page
- 每筆詳細頁使用獨立 page
- 錯誤時保留 artifact

目前捲動策略：

- 觀察頁高與商品卡數量
- 當商品數沒有再增加時提早停止

## 9. 已知限制

- 重型次分類頁仍可能只抓到「穩定可取得的一部分商品」
- `MAX_SCROLL_*` 策略仍偏保守，目標是可穩定收尾，不是一次吃滿全部頁面
- 詳細頁欄位是寬鬆解析，不保證每筆都有全部 key

## 10. 後續可做

- 將 Stage 1 / Stage 2 拆成兩個獨立 CLI
- 對 Stage 2 加 resume 能力，只補抓缺 detail 的商品
- 在 summary 中加入每個 `SUB_CAT` 的個別統計
- 加入更細的 scroll metrics，觀察每輪新增商品數
