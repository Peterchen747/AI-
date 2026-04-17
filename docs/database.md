# 資料庫

**ORM：** Drizzle ORM（turso dialect，LibSQL）  
**DB 檔案：** `sales-main/sales-tracker.db`（本地 SQLite）  
**Schema：** `sales-main/src/db/schema.ts`  
**Migrations：** `sales-main/drizzle/`

---

## 資料表關聯

```
categories
    └── items (categoryId FK)
            ├── inventoryRecords (itemId FK)
            ├── purchaseBatches (itemId FK)
            └── sales (itemId FK)
                    ├── inventoryRecords (inventoryRecordId FK)
                    └── purchaseBatches (purchaseBatchId FK)

weeklyCosts → purchaseBatches (purchaseBatchId FK)

shareTokens（獨立，無 FK，存公開分享 token）
```

## 各表用途

| 資料表 | 用途 |
|--------|------|
| `categories` | 商品分類（手鍊、耳環...） |
| `items` | 個別 SKU，帶預設成本／售價 |
| `sales` | 每筆銷售記錄（含實際成本、售價、數量） |
| `inventoryRecords` | 庫存入帳記錄（記單位成本、剩餘數量） |
| `purchaseBatches` | 批次進貨（P0）：整批進貨的成本與剩餘數量 |
| `weeklyCosts` | 每週營運成本（P0）：廣告、運費、包材等 |
| `shareTokens` | 公開分享連結的 token（`/share/[token]`） |
| `importBatches` | OCR 截圖批次匯入（低優先，v2） |
| `screenshots` | OCR 處理佇列（低優先，v2） |

## 目前整合狀態

- `purchaseBatches` 與 `weeklyCosts` **資料表已建立，但尚未整合進淨利計算**
- 儀表板目前顯示的是「不完整的毛利」，廣告費等隱藏成本未計入
- 修正淨利計算是 P0 最高優先，詳見 `產品框架_Master.md`
