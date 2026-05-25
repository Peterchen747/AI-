/**
 * 整合測試：模擬完整業務流程，驗證所有數字聯動
 * - 每次測試使用獨立的 TEST_USER_ID，不污染正式資料
 * - afterAll 確保清除所有測試資料
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { ensureSchema } from "@/db/ensure-schema";
import {
  getMonthlySummary,
  getCategoryPerformance,
  getWeeklyCostDetail,
} from "@/lib/calculations";
import { generateInsights } from "@/lib/financial-insights";

// ═══════════════════════════════════════════════════════════════
// 測試常數（固定數字，方便人工驗算）
// ═══════════════════════════════════════════════════════════════
const TEST_USER_ID = "__vitest_test_user_do_not_use__";
const TEST_MONTH = "2026-05";

const UNIT_COST = 150; // 進貨單價
const PRICE_FULL = 400; // 正常售價
const PRICE_DISC = 300; // 折扣售價
const STOCK_QTY = 10; // 初始庫存數量

// 預期計算結果（手算驗證）
// 銷售 A: qty=1, price=400, cost=150
// 銷售 B: qty=1, price=400, cost=150
// 銷售 C: qty=1, price=300, cost=150 (折扣，無庫存連結)
const EXPECTED_REVENUE = PRICE_FULL + PRICE_FULL + PRICE_DISC; // 1100
const EXPECTED_COST = UNIT_COST * 3; // 450
const EXPECTED_GROSS_PROFIT = EXPECTED_REVENUE - EXPECTED_COST; // 650
const EXPECTED_GROSS_MARGIN = (EXPECTED_GROSS_PROFIT / EXPECTED_REVENUE) * 100; // 59.09…

// 5 月成本
const AD_COST = 600;
const SHIPPING_COST = 250;
const PACKAGING_COST = 100;
const OTHER_COST = 50;
const TOTAL_MONTHLY_COST = AD_COST + SHIPPING_COST + PACKAGING_COST + OTHER_COST; // 1000
const EXPECTED_NET_PROFIT = EXPECTED_GROSS_PROFIT - TOTAL_MONTHLY_COST; // -350
const EXPECTED_NET_RATE = (EXPECTED_NET_PROFIT / EXPECTED_REVENUE) * 100; // -31.81…

// ═══════════════════════════════════════════════════════════════
// 測試資料 ID（beforeAll 填入）
// ═══════════════════════════════════════════════════════════════
let categoryId: number;
let itemId: number;
let inventoryId: number;

// ═══════════════════════════════════════════════════════════════
// 清理函數
// ═══════════════════════════════════════════════════════════════
async function cleanup() {
  await db.delete(schema.sales).where(eq(schema.sales.userId, TEST_USER_ID));
  await db.delete(schema.weeklyCosts).where(eq(schema.weeklyCosts.userId, TEST_USER_ID));
  await db.delete(schema.inventoryRecords).where(eq(schema.inventoryRecords.userId, TEST_USER_ID));
  await db.delete(schema.purchaseBatches).where(eq(schema.purchaseBatches.userId, TEST_USER_ID));
  await db.delete(schema.items).where(eq(schema.items.userId, TEST_USER_ID));
  await db.delete(schema.categories).where(eq(schema.categories.userId, TEST_USER_ID));
}

// ═══════════════════════════════════════════════════════════════
// 建立測試資料
// ═══════════════════════════════════════════════════════════════
beforeAll(async () => {
  await ensureSchema();
  await cleanup(); // 清除上次可能殘留的測試資料

  // ① 分類
  const [cat] = await db
    .insert(schema.categories)
    .values({
      userId: TEST_USER_ID,
      name: "【測試】飾品類",
      description: "Vitest 自動測試資料，測試完成後自動刪除",
    })
    .returning({ id: schema.categories.id });
  categoryId = cat.id;

  // ② 商品
  const [item] = await db
    .insert(schema.items)
    .values({
      userId: TEST_USER_ID,
      categoryId,
      name: "【測試】玉手環",
      typicalCost: UNIT_COST,
      typicalPrice: PRICE_FULL,
    })
    .returning({ id: schema.items.id });
  itemId = item.id;

  // ③ 庫存（10 件，單價 150）
  const [inv] = await db
    .insert(schema.inventoryRecords)
    .values({
      userId: TEST_USER_ID,
      itemId,
      unitCost: UNIT_COST,
      quantity: STOCK_QTY,
      remainingQty: STOCK_QTY,
      stockDate: "2026-05-01",
    })
    .returning({ id: schema.inventoryRecords.id });
  inventoryId = inv.id;

  // ④ 銷售 A：正常價，連結庫存 → 庫存 -1
  await db.insert(schema.sales).values({
    userId: TEST_USER_ID,
    itemId,
    inventoryRecordId: inventoryId,
    cost: UNIT_COST,
    actualPrice: PRICE_FULL,
    qty: 1,
    saleDate: "2026-05-03",
    source: "manual",
  });
  await db
    .update(schema.inventoryRecords)
    .set({ remainingQty: STOCK_QTY - 1 })
    .where(eq(schema.inventoryRecords.id, inventoryId));

  // ⑤ 銷售 B：正常價，連結庫存 → 庫存再 -1
  await db.insert(schema.sales).values({
    userId: TEST_USER_ID,
    itemId,
    inventoryRecordId: inventoryId,
    cost: UNIT_COST,
    actualPrice: PRICE_FULL,
    qty: 1,
    saleDate: "2026-05-10",
    source: "manual",
  });
  await db
    .update(schema.inventoryRecords)
    .set({ remainingQty: STOCK_QTY - 2 })
    .where(eq(schema.inventoryRecords.id, inventoryId));

  // ⑥ 銷售 C：折扣，無庫存連結（不扣庫存）
  await db.insert(schema.sales).values({
    userId: TEST_USER_ID,
    itemId,
    inventoryRecordId: null,
    cost: UNIT_COST,
    actualPrice: PRICE_DISC,
    qty: 1,
    saleDate: "2026-05-15",
    source: "manual",
  });

  // ⑦ 5 月成本
  await db.insert(schema.weeklyCosts).values({
    userId: TEST_USER_ID,
    weekLabel: TEST_MONTH,
    adCost: AD_COST,
    shippingCost: SHIPPING_COST,
    packagingCost: PACKAGING_COST,
    otherCost: OTHER_COST,
    totalCost: TOTAL_MONTHLY_COST,
  });
});

// ═══════════════════════════════════════════════════════════════
// 清除測試資料（即使測試失敗也會執行）
// ═══════════════════════════════════════════════════════════════
afterAll(async () => {
  await cleanup();

  // 確認清除成功
  const remaining = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(eq(schema.categories.userId, TEST_USER_ID));
  expect(remaining.length, "✅ 所有測試資料應已清除").toBe(0);
});

// ═══════════════════════════════════════════════════════════════
// 測試群組
// ═══════════════════════════════════════════════════════════════

describe("📦 庫存聯動", () => {
  it("初始庫存 quantity 應為 10（不受銷售影響）", async () => {
    const [inv] = await db
      .select()
      .from(schema.inventoryRecords)
      .where(eq(schema.inventoryRecords.id, inventoryId));
    expect(inv.quantity).toBe(STOCK_QTY);
  });

  it("2 筆庫存連結銷售後，remainingQty 應為 8（10 - 2）", async () => {
    const [inv] = await db
      .select()
      .from(schema.inventoryRecords)
      .where(eq(schema.inventoryRecords.id, inventoryId));
    expect(inv.remainingQty).toBe(STOCK_QTY - 2);
  });

  it("無庫存連結的銷售 C 不應扣減庫存（仍為 8，不是 7）", async () => {
    const [inv] = await db
      .select()
      .from(schema.inventoryRecords)
      .where(eq(schema.inventoryRecords.id, inventoryId));
    expect(inv.remainingQty).toBe(8);
    expect(inv.remainingQty).not.toBe(7);
  });
});

describe("💰 月度匯總 — 儀表板數字 (getMonthlySummary)", () => {
  let summary: Awaited<ReturnType<typeof getMonthlySummary>>;

  beforeAll(async () => {
    summary = await getMonthlySummary(TEST_MONTH, TEST_USER_ID);
  });

  it(`銷售筆數 = 3（A + B + C）`, () => {
    expect(summary.count).toBe(3);
  });

  it(`收入 = ${EXPECTED_REVENUE}（400 + 400 + 300）`, () => {
    expect(summary.revenue).toBe(EXPECTED_REVENUE);
  });

  it(`成本 = ${EXPECTED_COST}（150 × 3）`, () => {
    expect(summary.cost).toBe(EXPECTED_COST);
  });

  it(`毛利 = ${EXPECTED_GROSS_PROFIT}（收入 ${EXPECTED_REVENUE} − 成本 ${EXPECTED_COST}）`, () => {
    expect(summary.profit).toBe(EXPECTED_GROSS_PROFIT);
  });

  it(`毛利率 ≈ ${EXPECTED_GROSS_MARGIN.toFixed(2)}%（毛利 ÷ 收入）`, () => {
    expect(summary.margin).toBeCloseTo(EXPECTED_GROSS_MARGIN, 1);
  });

  it(`每月成本合計 = ${TOTAL_MONTHLY_COST}（從 weekly_costs 讀取）`, () => {
    expect(summary.weeklyCostsTotal).toBe(TOTAL_MONTHLY_COST);
  });

  it(`淨利 = ${EXPECTED_NET_PROFIT}（毛利 ${EXPECTED_GROSS_PROFIT} − 每月成本 ${TOTAL_MONTHLY_COST}）`, () => {
    expect(summary.netProfit).toBe(EXPECTED_NET_PROFIT);
  });

  it(`淨利率 ≈ ${EXPECTED_NET_RATE.toFixed(2)}%（淨利 ÷ 收入）`, () => {
    expect(summary.netProfitRate).toBeCloseTo(EXPECTED_NET_RATE, 1);
  });
});

describe("🗂️ 分類表現 (getCategoryPerformance)", () => {
  let categories: Awaited<ReturnType<typeof getCategoryPerformance>>;

  beforeAll(async () => {
    categories = await getCategoryPerformance(TEST_MONTH, TEST_USER_ID);
  });

  it("結果中應包含【測試】飾品類", () => {
    const testCat = categories.find((c) => c.categoryName === "【測試】飾品類");
    expect(testCat).toBeDefined();
  });

  it("分類銷售筆數 = 3", () => {
    const c = categories.find((c) => c.categoryName === "【測試】飾品類");
    expect(c?.count).toBe(3);
  });

  it(`分類收入 = ${EXPECTED_REVENUE}（與月度匯總一致）`, () => {
    const c = categories.find((c) => c.categoryName === "【測試】飾品類");
    expect(c?.revenue).toBe(EXPECTED_REVENUE);
  });

  it(`分類成本 = ${EXPECTED_COST}（與月度匯總一致）`, () => {
    const c = categories.find((c) => c.categoryName === "【測試】飾品類");
    expect(c?.cost).toBe(EXPECTED_COST);
  });

  it(`分類毛利 = ${EXPECTED_GROSS_PROFIT}（與月度匯總一致）`, () => {
    const c = categories.find((c) => c.categoryName === "【測試】飾品類");
    expect(c?.profit).toBe(EXPECTED_GROSS_PROFIT);
  });

  it("分類毛利率與月度匯總毛利率吻合", () => {
    const c = categories.find((c) => c.categoryName === "【測試】飾品類");
    expect(c?.margin).toBeCloseTo(EXPECTED_GROSS_MARGIN, 1);
  });
});

describe("💸 每月成本加總 (weeklyCosts)", () => {
  it(`資料庫 totalCost = ${TOTAL_MONTHLY_COST}（廣告 + 運費 + 包材 + 其他）`, async () => {
    const [row] = await db
      .select()
      .from(schema.weeklyCosts)
      .where(eq(schema.weeklyCosts.userId, TEST_USER_ID));
    expect(row.totalCost).toBe(TOTAL_MONTHLY_COST);
    // 驗算：各項加總必須等於 totalCost
    const calc = row.adCost + row.shippingCost + row.packagingCost + row.otherCost;
    expect(row.totalCost).toBe(calc);
  });

  it(`getWeeklyCostDetail 各項目拆解正確`, async () => {
    const detail = await getWeeklyCostDetail(TEST_MONTH, TEST_USER_ID);
    expect(detail.adCost).toBe(AD_COST);
    expect(detail.shippingCost).toBe(SHIPPING_COST);
    expect(detail.packagingCost).toBe(PACKAGING_COST);
    expect(detail.otherCost).toBe(OTHER_COST);
    expect(detail.totalCost).toBe(TOTAL_MONTHLY_COST);
  });

  it("成本合計：600 + 250 + 100 + 50 = 1000", () => {
    expect(AD_COST + SHIPPING_COST + PACKAGING_COST + OTHER_COST).toBe(1000);
  });
});

describe("📊 財務洞察 (generateInsights) — 使用真實計算資料", () => {
  let insight: ReturnType<typeof generateInsights>;

  beforeAll(async () => {
    const summary = await getMonthlySummary(TEST_MONTH, TEST_USER_ID);
    const cats = await getCategoryPerformance(TEST_MONTH, TEST_USER_ID);
    const weeklyDetail = await getWeeklyCostDetail(TEST_MONTH, TEST_USER_ID);
    // 上月無資料（全零）
    const prevSummary = await getMonthlySummary("2020-01", TEST_USER_ID);
    insight = generateInsights(summary, prevSummary, cats, weeklyDetail);
  });

  it("毛利率 59.09% ≥ 50% → 評等 excellent", () => {
    expect(insight.grossMargin.level).toBe("excellent");
    expect(insight.grossMargin.rate).toBeCloseTo(EXPECTED_GROSS_MARGIN, 1);
  });

  it("淨利率 −31.82% < 0 → 評等 danger", () => {
    expect(insight.netMargin.level).toBe("danger");
    expect(insight.netMargin.rate).toBeCloseTo(EXPECTED_NET_RATE, 1);
  });

  it(`間接費用佔比 ${((TOTAL_MONTHLY_COST / EXPECTED_REVENUE) * 100).toFixed(1)}% ≥ 40% → 評等 critical`, () => {
    const expectedRate = (TOTAL_MONTHLY_COST / EXPECTED_REVENUE) * 100;
    expect(insight.indirectCost.level).toBe("critical");
    expect(insight.indirectCost.rate).toBeCloseTo(expectedRate, 1);
  });

  it(`廣告費佔比 ${((AD_COST / EXPECTED_REVENUE) * 100).toFixed(1)}% ≥ 30% → 評等 danger`, () => {
    const expectedRate = (AD_COST / EXPECTED_REVENUE) * 100;
    expect(insight.adCostRatio.level).toBe("danger");
    expect(insight.adCostRatio.rate).toBeCloseTo(expectedRate, 1);
  });

  it("整體健康度 → danger（淨利為負）", () => {
    expect(insight.overallHealth).toBe("danger");
  });

  it("topIssue 正確指出淨利問題", () => {
    expect(insight.topIssue).toContain("淨利");
  });

  it("行動建議清單不為空", () => {
    expect(insight.actions.length).toBeGreaterThan(0);
  });

  it("行動建議按優先度排序（urgent 在前）", () => {
    const order = { urgent: 0, important: 1, optional: 2 };
    for (let i = 1; i < insight.actions.length; i++) {
      expect(order[insight.actions[i].priority]).toBeGreaterThanOrEqual(
        order[insight.actions[i - 1].priority]
      );
    }
  });
});

describe("🔎 邊界條件", () => {
  it("查詢無資料的月份，所有數值應為零", async () => {
    const empty = await getMonthlySummary("2020-01", TEST_USER_ID);
    expect(empty.revenue).toBe(0);
    expect(empty.cost).toBe(0);
    expect(empty.profit).toBe(0);
    expect(empty.netProfit).toBe(0);
    expect(empty.margin).toBe(0);
    expect(empty.count).toBe(0);
  });

  it("getCategoryPerformance 無資料月份應回傳空陣列", async () => {
    const cats = await getCategoryPerformance("2020-01", TEST_USER_ID);
    // 測試用戶沒有 2020-01 的資料
    const testCat = cats.find((c) => c.categoryName === "【測試】飾品類");
    expect(testCat).toBeUndefined();
  });
});
