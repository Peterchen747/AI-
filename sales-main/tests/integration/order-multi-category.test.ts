/**
 * 一張訂單放多個分類的商品（order_no）。
 *
 * 這支測試會實際寫入資料，所以**只在本機 file: SQLite 上執行**，
 * 指向 Turso 雲端時會自動整組 skip，不會碰到正式資料。
 *
 * 本機跑法：
 *   TURSO_CONNECTION_URL="file:./sales-tracker.db" npx vitest run tests/integration/order-multi-category.test.ts
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const TEST_USER_ID = "__vitest_order_user__";
const LOCAL_DB = String(process.env.TURSO_CONNECTION_URL ?? "").startsWith("file:");

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: TEST_USER_ID, email: "t@t.local" } }),
}));

import { db, schema, client } from "@/db";
import { eq, and } from "drizzle-orm";
import { ensureSchema } from "@/db/ensure-schema";
import { POST, GET, DELETE } from "@/app/api/sales/route";
import { NextRequest } from "next/server";

let catA = 0;
let catB = 0;
let itemA = 0;
let itemB = 0;
let batchB = 0;

beforeAll(async () => {
  if (!LOCAL_DB) return;
  await ensureSchema();

  const [a] = await db
    .insert(schema.categories)
    .values({ userId: TEST_USER_ID, name: "測試飾品" })
    .returning();
  const [b] = await db
    .insert(schema.categories)
    .values({ userId: TEST_USER_ID, name: "測試包包" })
    .returning();
  catA = a.id;
  catB = b.id;

  const [ia] = await db
    .insert(schema.items)
    .values({ userId: TEST_USER_ID, categoryId: catA, name: "耳環" })
    .returning();
  const [ib] = await db
    .insert(schema.items)
    .values({ userId: TEST_USER_ID, categoryId: catB, name: "側背包" })
    .returning();
  itemA = ia.id;
  itemB = ib.id;

  const [pb] = await db
    .insert(schema.purchaseBatches)
    .values({
      userId: TEST_USER_ID,
      itemId: itemB,
      purchaseDate: "2026-08-01",
      totalQty: 10,
      remainingQty: 10,
      totalCost: 2000,
      unitCost: 200,
    })
    .returning();
  batchB = pb.id;
});

afterAll(async () => {
  if (!LOCAL_DB) return;
  await db.delete(schema.sales).where(eq(schema.sales.userId, TEST_USER_ID));
  await db
    .delete(schema.purchaseBatches)
    .where(eq(schema.purchaseBatches.userId, TEST_USER_ID));
  await db.delete(schema.items).where(eq(schema.items.userId, TEST_USER_ID));
  await db.delete(schema.categories).where(eq(schema.categories.userId, TEST_USER_ID));
});

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe.skipIf(!LOCAL_DB)("一張訂單多分類", () => {
  let orderNo = "";

  it("送陣列 → 兩個不同分類的商品共用同一個訂單編號", async () => {
    const res = await post([
      { itemId: itemA, cost: 100, actualPrice: 300, qty: 2, saleDate: "2026-08-05", notes: "客戶名稱：王小明" },
      { itemId: itemB, cost: 0, actualPrice: 900, qty: 1, saleDate: "2026-08-05", notes: "客戶名稱：王小明", purchaseBatchId: batchB },
    ]);
    expect(res.status).toBe(200);
    const rows = await res.json();

    expect(rows).toHaveLength(2);
    expect(rows[0].orderNo).toBeTruthy();
    expect(rows[1].orderNo).toBe(rows[0].orderNo);
    orderNo = rows[0].orderNo;

    // 進貨批次成本會覆蓋掉送進來的 cost
    expect(rows[1].cost).toBe(200);
  });

  it("兩筆分屬不同分類，分析用的 join 仍然各自成立", async () => {
    const res = await GET(new NextRequest("http://localhost/api/sales?month=2026-08"));
    const rows = (await res.json()) as Array<{
      orderNo: string | null;
      categoryId: number;
    }>;
    const mine = rows.filter((r) => r.orderNo === orderNo);
    expect(mine).toHaveLength(2);
    expect(new Set(mine.map((r) => r.categoryId))).toEqual(new Set([catA, catB]));
  });

  it("進貨批次庫存已扣掉 1 件", async () => {
    const [pb] = await db
      .select()
      .from(schema.purchaseBatches)
      .where(eq(schema.purchaseBatches.id, batchB));
    expect(pb.remainingQty).toBe(9);
  });

  it("單一物件送出（AI／舊呼叫端）維持 orderNo = null", async () => {
    const res = await post({
      itemId: itemA,
      cost: 50,
      actualPrice: 120,
      saleDate: "2026-08-06",
    });
    expect(res.status).toBe(200);
    const row = await res.json();
    expect(row.orderNo).toBeNull();
  });

  it("DELETE ?orderNo 一次刪掉整張訂單，並把批次庫存還回去", async () => {
    const res = await DELETE(
      new NextRequest(`http://localhost/api/sales?orderNo=${orderNo}`, { method: "DELETE" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, deleted: 2 });

    const left = await db
      .select()
      .from(schema.sales)
      .where(and(eq(schema.sales.userId, TEST_USER_ID), eq(schema.sales.orderNo, orderNo)));
    expect(left).toHaveLength(0);

    const [pb] = await db
      .select()
      .from(schema.purchaseBatches)
      .where(eq(schema.purchaseBatches.id, batchB));
    expect(pb.remainingQty).toBe(10);

    // 單筆那列（orderNo = null）不受影響
    const solo = await db
      .select()
      .from(schema.sales)
      .where(eq(schema.sales.userId, TEST_USER_ID));
    expect(solo).toHaveLength(1);
    expect(solo[0].orderNo).toBeNull();
  });

  it("找不到的訂單編號回 404", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/sales?orderNo=does-not-exist", { method: "DELETE" })
    );
    expect(res.status).toBe(404);
  });
});

describe.skipIf(!LOCAL_DB)("環境檢查", () => {
  it("確認跑在本機檔案資料庫", async () => {
    const r = await client.execute("SELECT 1 AS ok");
    expect(r.rows[0].ok).toBe(1);
  });
});
