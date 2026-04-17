# 開發指令

所有指令在 `sales-main/` 目錄下執行。

## 日常開發

```bash
npm run dev        # 啟動開發伺服器 localhost:3000
npm run build      # 生產環境 build
npm run lint       # ESLint 檢查
```

## 測試

```bash
# 需先啟動 dev server（npm run dev）才能跑測試
node test-suite.mjs    # 執行全部 36 個整合測試
```

## 資料庫

```bash
npx drizzle-kit generate   # 根據 schema 變更產生 migration 檔
npx drizzle-kit migrate    # 執行 migration
node seed-data.mjs         # 重新植入測試資料
```
