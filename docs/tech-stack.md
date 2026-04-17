# 技術細節

## 前端

| 項目 | 技術 |
|------|------|
| Framework | Next.js 16 App Router + React 19 |
| 樣式 | Tailwind CSS v4 + PostCSS |
| UI 元件 | shadcn/ui（Base UI 封裝） |
| 圖表 | Recharts |
| 表單 | React Hook Form + Zod |
| URL 狀態 | nuqs（query params） |
| 模糊搜尋 | Fuse.js |
| 日期 | date-fns |
| Toast 通知 | Sonner |

> ⚠️ **Next.js 16 有 breaking changes**，API、慣例與檔案結構可能和訓練資料不同。
> 寫 code 前先讀 `sales-main/node_modules/next/dist/docs/`。

### Component 分層

```
src/app/*/page.tsx          → Server Components（預設，直接查 DB 或呼叫 API）
src/components/*/           → Client Components（需要互動的加 "use client"）
src/components/ui/          → shadcn/ui 基礎元件（不要直接改）
src/components/layout/      → AppShell + Sidebar
src/components/dashboard/   → 儀表板專用元件（圖表、卡片、建議）
```

**路徑 alias：** `@/*` → `./src/*`

---

## 後端

- API Routes 放在 `src/app/api/*/route.ts`，全部 Server-side，直接用 Drizzle 查 DB
- 沒有獨立 API server，也沒有 GraphQL 層
- `src/lib/calculations.ts` 是核心商業邏輯（毛利、淨利、分類績效、智慧建議）
- `src/lib/utils.ts` 放通用工具（`cn()`、`formatNTD()`、`calculateProfit()`）

---

## 部署 & 環境

- 目前：純本地開發，SQLite 檔案 `sales-tracker.db` 直接在專案內
- 無 `.env` 設定、無 Docker、無 auth 系統
- 單一使用者設計（不需登入）
