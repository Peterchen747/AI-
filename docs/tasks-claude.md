# Claude Code 任務指令（4.4 起）

> 適用模型：`claude-sonnet-4-6`（官方）  
> 通用禁止清單已移至 `../CLAUDE.md`，此處只列各任務特有的限制。  
> Claude 直接用工具讀檔、改檔，**不需要複製貼上輸出格式**。

---

## 任務 4.4　修正 Dashboard KPI 卡片和六個月圖表

**前置條件：** 任務 4.3 完成（`MonthlySummary` 已含 `netProfit`、`netProfitRate`、`weeklyCostsTotal`）

**涉及檔案：**
```
src/components/dashboard/summary-cards.tsx   ← 修改
src/components/dashboard/revenue-chart.tsx   ← 修改
```

**先讀這兩個檔案**，確認現有 props 介面和 JSX 結構再動手。

---

### summary-cards.tsx

現況：4 張卡片（本月營收、本月成本、本月利潤、毛利率），props 是 `{ current: MonthlySummary, previous: MonthlySummary }`。

要做：
1. 把「本月利潤」卡片標題改為「**本月毛利**」（數字來源維持 `current.profit`）
2. 在毛利率卡片**之後**新增一張「**本月淨利**」卡片：
   - 數字來源：`current.netProfit`
   - `netProfit < 0` → `text-red-500`；`> 0` → `text-emerald-600`
3. 再新增一張「**淨利率**」卡片，顯示 `current.netProfitRate.toFixed(1)%`

注意：
- **不要刪除**任何現有卡片（保留毛利、毛利率）
- `MonthlySummary` type 已有 `netProfit` / `netProfitRate`，props 不需改
- `deltaBadge` helper 可直接複用

---

### revenue-chart.tsx

現況：BarChart，三個 Bar（revenue 營收、cost 成本、profit 利潤）。

要做：
1. 卡片標題改為「**近 6 個月淨利趨勢**」
2. 新增一個 Bar `dataKey="netProfit" name="淨利" fill="#8b5cf6"`（紫色）
3. 原本的 `profit` Bar 改 `name="毛利"`，保留作對比
4. Tooltip 同時顯示：淨利 NT$ XXX / 毛利 NT$ XXX

注意：
- `data` prop 型別是 `MonthlySummary[]`，每個月都已含 `netProfit`，不需改 props
- 不要動 month-picker、guidance、top-categories 等其他 dashboard 元件

**驗證：**
```bash
npx tsc --noEmit
# 啟動 npm run dev，確認首頁有「本月淨利」卡片，六個月圖有淨利紫色 Bar
```

---

## 任務 5.1　建立隱藏成本警示頁面

**前置條件：** Phase 1 全部任務完成

**涉及檔案：**
```
src/app/api/alerts/route.ts              ← 新建
src/app/alerts/page.tsx                  ← 新建
src/components/layout/sidebar.tsx        ← 修改 navItems
```

**先讀 `src/app/api/sales/route.ts`（前 20 行）** 取得標準 import 和 handler 樣式。  
**先讀 `src/components/layout/sidebar.tsx`** 確認現有 navItems 陣列結構。

---

### src/app/api/alerts/route.ts

`GET /api/alerts` → 回傳 `Alert[]`：
```ts
type Alert = {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
};
```

依序檢查四種警示（有警示才加入回傳陣列）：
1. **廣告費異常**：本月 `adCost` 總和 / 本月 `revenue` > 30% → `high`
2. **庫存低警示**：任何 `purchaseBatches.remainingQty <= 3` → `medium`，detail 帶出品項名稱
3. **本月成本未登記**：本月有銷售記錄，但 `weeklyCosts` 中無本月任何週次 → `high`
4. **超過 7 天無新銷售**：最新一筆 `saleDate` 距今 > 7 天 → `low`

---

### src/app/alerts/page.tsx

- `"use client"`，`useEffect` 呼叫 `GET /api/alerts`
- `severity === 'high'` → 紅色卡片（`border-red-500 bg-red-50`）
- `severity === 'medium'` → 橘色（`border-orange-400 bg-orange-50`）
- `severity === 'low'` → 黃色（`border-yellow-400 bg-yellow-50`）
- 無警示 → 綠色「目前一切正常 ✅」

### sidebar.tsx

在 navItems 陣列加入（插在「每週成本」之後）：
```ts
{ href: "/alerts", label: "警示中心", icon: "🚨" }
```

**驗證：**
```bash
npx tsc --noEmit
# 進入 /alerts，確認無 weeklyCosts 時出現「本月成本未登記」高警示
```

---

## 任務 5.2　手機 RWD 優化：三個表單

**前置條件：** Phase 1 全部任務完成

**涉及檔案：**
```
src/components/sales/sale-form.tsx                   ← 修改 className
src/components/purchase-batches/PurchaseBatchForm.tsx ← 修改 className
src/components/weekly-costs/WeeklyCostForm.tsx        ← 修改 className
```

**先讀這三個檔案**，確認現有 className 結構後統一套用以下規則（只動 Tailwind class，不動邏輯）：

1. 多欄佈局改為 `grid grid-cols-1 md:grid-cols-2 gap-4`（手機單欄）
2. Input 高度至少 `h-11`
3. 送出按鈕加 `w-full md:w-auto`
4. 數字 Input 加 `inputMode="numeric"`
5. 日期 Input 確認 `type="date"`

注意：**只調 className，不動任何業務邏輯或 state**

**驗證：**
```bash
# F12 → 切換 iPhone 375px 模式，確認三表單單欄、按鈕全寬、數字鍵盤彈出
npx tsc --noEmit
```

---

## 任務 5.3　月度報告 PDF 匯出

**前置條件：** 任務 4.3 完成

**涉及檔案：**
```
src/app/api/report/[year]/[month]/route.ts  ← 新建
src/components/dashboard/summary-cards.tsx  ← 加「匯出 PDF」按鈕
```

**安裝套件（你自己跑）：**
```bash
npm install @react-pdf/renderer
```

**先讀 `src/app/api/sales/route.ts`（前 20 行）** 取得 import 樣式。  
**先讀 `src/components/dashboard/summary-cards.tsx`** 確認現有 props 結構。

---

### src/app/api/report/[year]/[month]/route.ts

```ts
export async function GET(
  request: NextRequest,
  { params }: { params: { year: string; month: string } }
)
```

- 從 `getMonthlySummary(`${year}-${month}`)` 取得月度資料
- 用 `@react-pdf/renderer` 的 `renderToBuffer` 產生 PDF（server-side，不能在 client 用）
- PDF 內容：標題「{year} 年 {month} 月 財務報告」、KPI 區（月營收 / 毛利 / 每週成本 / 淨利 / 淨利率）、報告產生時間
- 回傳：`new NextResponse(buffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=report-YYYY-MM.pdf' } })`

注意：
- `renderToBuffer` 是 server-side only，**不要** import 進任何 client component
- PDF 暫不放中文字型，先用英數字代替月份數字（避免亂碼）

### summary-cards.tsx 加按鈕

在現有卡片群組下方新增一個「匯出本月 PDF」Button：
- 點擊後 `fetch('/api/report/{year}/{month}')` → `blob()` → `URL.createObjectURL()` → 觸發 `<a>` 下載
- 需要改為 `"use client"` 並加入 `useState` 管理 loading 狀態

**驗證：**
```bash
npx tsc --noEmit
# 點「匯出 PDF」，確認瀏覽器下載 PDF 且內容含正確月份與淨利
```

---

## 任務 6.1　每週 Email 提醒

**前置條件：** Phase 1 全部任務完成

**涉及檔案：**
```
src/app/api/cron/weekly-reminder/route.ts  ← 新建
.env.local                                  ← 加環境變數說明
```

**安裝套件（你自己跑）：**
```bash
npm install resend
```

**先讀 `src/app/api/sales/route.ts`（前 20 行）** 取得 import 樣式。

---

### src/app/api/cron/weekly-reminder/route.ts

```ts
export async function GET(request: NextRequest)
```

1. 驗證 `request.headers.get('x-cron-secret') === process.env.CRON_SECRET`
   → 不符合回傳 `{ error: 'unauthorized' }` status 401
2. 查本週銷售筆數（`saleDate >= 本週一 ISO 日期`）
3. 查本週 weekLabel 是否已在 `weeklyCosts`
4. 用 Resend 發 Email：
   ```ts
   import { Resend } from 'resend';
   const resend = new Resend(process.env.RESEND_API_KEY!);
   ```
   subject: `本週帳務提醒 - {今天日期}`  
   html: 本週 X 筆訂單 / 本週成本[已/未]登記
5. 回傳 `{ ok: true }`

注意：
- **不要 hardcode** 任何金鑰，全用 `process.env`
- `CRON_SECRET` 驗證是**必要的**，任何人可呼叫會被濫用

### .env.local

在檔案末尾加入說明（不填真實值，讓使用者自己填）：
```
# 每週提醒設定
RESEND_API_KEY=     # 去 resend.com 申請免費 API Key
REMINDER_EMAIL=     # 收提醒的 Email 地址
CRON_SECRET=        # 自訂隨機字串，例如用 openssl rand -hex 32 產生
```

**驗證：**
```bash
npx tsc --noEmit
# 填好 .env.local，重啟 dev server
# curl -H 'x-cron-secret: YOUR_SECRET' http://localhost:3000/api/cron/weekly-reminder
# 確認收到 Email
```
