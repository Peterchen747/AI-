# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 模型規範

| 用途 | 模型 |
|------|------|
| 日常 coding（填入實作、調樣式、改小功能） | qwen2.5-coder:7b（本地） |
| 架構設計、複雜 debug、正式交付前總檢 | claude-sonnet-4-6（官方） |

**預設用本地模型；只有我明確說「用官方」時才切換。**

工作流程：官方負責需求分析 + 骨架 + TODO 註解 → 本地模型填入實作 → 每次改 1-2 個檔案 → 自動跑 test/build。

---

## 專案簡介

**AI 財務助手**：幫透過 LINE/IG 賣飾品的小賣家，追蹤銷售收入與隱藏成本，算出真正的每月淨利。

程式碼在 `sales-main/`，單一使用者、本地 SQLite 資料庫、無登入機制。

**目前狀態（MVP）：** 銷售記錄、分類管理、毛利計算已完成；**P0 待做：** 批次進貨成本 + 每週廣告/運費整合進淨利計算。

---

## 細節文件

- [開發指令](docs/commands.md) — dev、build、test、migration
- [技術細節](docs/tech-stack.md) — 前端、後端、元件架構
- [資料庫](docs/database.md) — Schema、資料表關聯、整合狀態
- [Claude 任務指令（4.4 起）](docs/tasks-claude.md) — 給官方模型的精簡任務格式

---

## 通用禁止清單（所有任務適用，不在任務裡重複）

### API Route

- `db` 從 `@/db` import，**不是** `@/db/schema`
- 錯誤回應用 `NextResponse.json({ error: "..." }, { status: NNN })`，不要 `NextResponse.error(...)`
- 每個 handler **第一行**必須 `await ensureSchema()`
- 動態路由 ID 從 `{ params }` 取得，不要 `request.url.split('/')`

### Client Component

- `"use client"` 在檔案第一行（有 useState / useEffect 必加）
- Toast 通知用 `toast` from `"sonner"`，不要 `alert()`
- shadcn/ui 元件從 `@/components/ui/...` import，**不要重新安裝套件**
- 表單驗證統一用 react-hook-form

### 通用

- 不要發明不存在的 schema 名稱（現有 table 見 `docs/database.md`）
- 不要動未被任務指定修改的檔案
