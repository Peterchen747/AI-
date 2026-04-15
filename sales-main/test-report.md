# Sales Tracker 測試報告

- 執行時間: 2026-04-07T04:23:03.652Z
- 測試對象: http://localhost:3000
- 總測試項: **36**
- ✅ 通過: **36**
- ❌ 失敗: **0**
- 通過率: **100.0%**

## 測試範圍
1. **首頁健康檢查** — 伺服器是否啟動
2. **分類 API CRUD** — GET / POST / PUT / DELETE，含驗證錯誤情境
3. **銷售 API CRUD** — 批次插入、月份過濾、邊界值（零成本、虧本、無分類、12 月邊界）
4. **分享 token API** — 建立 / 列表 / 公開頁面 / 無效 token / 刪除
5. **頁面 SSR 渲染** — 所有主要路由是否回傳 200
6. **壓力測試** — 100 筆批次插入效能
7. **資料清理** — 移除測試資料

## 詳細結果

| # | 項目 | 結果 | 備註 |
|---|------|------|------|
| 1 | GET / 回應 200 | ✅ | status=200 |
| 2 | GET /api/categories 回應陣列 | ✅ |  |
| 3 | POST 建立分類「飲料」 | ✅ | {"id":1,"name":"飲料","description":"手搖杯","typicalCost":20,"typicalPrice":60,"isActive":1,"createdAt":"2026-04-07 04:22:54","updatedAt":"2026-04-07 04:22:54"} |
| 4 | POST 建立分類「便當」 | ✅ | {"id":2,"name":"便當","description":"午餐主餐","typicalCost":60,"typicalPrice":110,"isActive":1,"createdAt":"2026-04-07 04:22:54","updatedAt":"2026-04-07 04:22:54"} |
| 5 | POST 建立分類「甜點」 | ✅ | {"id":3,"name":"甜點","description":"蛋糕點心","typicalCost":35,"typicalPrice":90,"isActive":1,"createdAt":"2026-04-07 04:22:54","updatedAt":"2026-04-07 04:22:54"} |
| 6 | POST 建立分類「零食」 | ✅ | {"id":4,"name":"零食","description":null,"typicalCost":10,"typicalPrice":30,"isActive":1,"createdAt":"2026-04-07 04:22:54","updatedAt":"2026-04-07 04:22:54"} |
| 7 | POST 缺名稱應 400 | ✅ |  |
| 8 | POST 名稱型別錯誤應 400 | ✅ |  |
| 9 | PUT 更新分類 | ✅ |  |
| 10 | PUT 缺 id 應 400 | ✅ |  |
| 11 | 批次 POST 28 筆銷售 | ✅ |  |
| 12 | POST 缺必填欄位應 500/錯誤 | ✅ |  |
| 13 | GET /api/sales 回傳陣列 | ✅ |  |
| 14 | GET ?month=2026-04 過濾正確 | ✅ |  |
| 15 | GET ?month=YYYY-12 不報錯 | ✅ |  |
| 16 | DELETE 銷售 | ✅ |  |
| 17 | DELETE 缺 id 應 400 | ✅ |  |
| 18 | 本月計算: 營收=1470, 成本=790, 毛利=680 | ✅ |  |
| 19 | POST 建立 token | ✅ |  |
| 20 | POST 無 label 也可建立 | ✅ |  |
| 21 | GET token 列表 | ✅ |  |
| 22 | GET /share/{token} 公開頁面 200 | ✅ |  |
| 23 | 公開頁面包含儀表板內容 | ✅ |  |
| 24 | 無效 token 應 404 | ✅ |  |
| 25 | DELETE token | ✅ |  |
| 26 | 首頁 / | ✅ | status=200 |
| 27 | 儀表板 /dashboard | ✅ | status=200 |
| 28 | 銷售列表 /sales | ✅ | status=200 |
| 29 | 新增銷售 /sales/new | ✅ | status=200 |
| 30 | 分類管理 /categories | ✅ | status=200 |
| 31 | 匯入 /import | ✅ | status=200 |
| 32 | 分享管理 /share | ✅ | status=200 |
| 33 | 批次插入 100 筆 (47ms) | ✅ |  |
| 34 | 月份格式無效仍回應 (不崩潰) | ✅ |  |
| 35 | 刪除 128/128 筆銷售 | ✅ |  |
| 36 | 刪除 4/4 個分類 | ✅ |  |

## 結論

🎉 所有測試通過，系統功能正常。
