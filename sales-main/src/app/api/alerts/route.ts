import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, like, lt, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { currentYearMonth } from "@/lib/calculations";
import { getWeekDateRange } from "@/lib/week-utils";
import { DEMO_USER_ID } from "@/lib/mock-session";

type Alert = {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export async function GET(_request: NextRequest) {
  await ensureSchema();
  const userId = DEMO_USER_ID;

  const alerts: Alert[] = [];

  const yearMonth = currentYearMonth();
  const [y, m] = yearMonth.split("-").map(Number);
  const monthStart = `${yearMonth}-01`;
  const nextMonthStart =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const salesRows = await db
    .select({ actualPrice: schema.sales.actualPrice, qty: schema.sales.qty })
    .from(schema.sales)
    .where(
      and(
        eq(schema.sales.userId, userId),
        gte(schema.sales.saleDate, monthStart),
        lt(schema.sales.saleDate, nextMonthStart)
      )
    );

  const revenue = salesRows.reduce((s, r) => s + r.actualPrice * r.qty, 0);

  const weeklyCostRows = await db
    .select({
      weekLabel: schema.weeklyCosts.weekLabel,
      adCost: schema.weeklyCosts.adCost,
    })
    .from(schema.weeklyCosts)
    .where(and(eq(schema.weeklyCosts.userId, userId), like(schema.weeklyCosts.weekLabel, `${y}-W%`)));

  const thisMonthWeeklyCosts = weeklyCostRows.filter((row) => {
    const range = getWeekDateRange(row.weekLabel);
    if (!range) return false;
    const thursday = new Date(range.start);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    return thursday.getUTCFullYear() === y && thursday.getUTCMonth() + 1 === m;
  });

  // Alert 1: 廣告費異常 — adCost / revenue > 30%
  if (revenue > 0) {
    const monthlyAdCost = thisMonthWeeklyCosts.reduce(
      (sum, row) => sum + (row.adCost ?? 0),
      0
    );
    if (monthlyAdCost / revenue > 0.3) {
      const pct = ((monthlyAdCost / revenue) * 100).toFixed(1);
      alerts.push({
        type: "ad_cost_high",
        severity: "high",
        title: "廣告費異常偏高",
        detail: `本月廣告費佔營收 ${pct}%，超過 30% 警戒線（廣告費 NT$${monthlyAdCost}，營收 NT$${revenue}）`,
      });
    }
  }

  // Alert 2: 庫存低警示 — remainingQty <= 3
  const lowBatches = await db
    .select({
      remainingQty: schema.purchaseBatches.remainingQty,
      itemId: schema.purchaseBatches.itemId,
    })
    .from(schema.purchaseBatches)
    .where(and(eq(schema.purchaseBatches.userId, userId), lte(schema.purchaseBatches.remainingQty, 3)));

  if (lowBatches.length > 0) {
    const itemIds = [...new Set(lowBatches.map((b) => b.itemId))];
    const itemRows = await db
      .select({ id: schema.items.id, name: schema.items.name })
      .from(schema.items)
      .where(and(eq(schema.items.userId, userId), inArray(schema.items.id, itemIds)));

    const itemMap = new Map(itemRows.map((i) => [i.id, i.name]));
    const itemNames = lowBatches
      .map(
        (b) =>
          `${itemMap.get(b.itemId) ?? "未知"}（剩 ${b.remainingQty} 件）`
      )
      .join("、");

    alerts.push({
      type: "low_inventory",
      severity: "medium",
      title: "庫存偏低警示",
      detail: `以下進貨批次剩餘數量 ≤ 3：${itemNames}`,
    });
  }

  // Alert 3: 本月成本未登記 — has sales but no weeklyCosts this month
  if (salesRows.length > 0 && thisMonthWeeklyCosts.length === 0) {
    alerts.push({
      type: "no_weekly_costs",
      severity: "high",
      title: "本月成本未登記",
      detail: `本月已有 ${salesRows.length} 筆銷售紀錄，但每週廣告／運費等成本尚未登記，淨利計算可能不準確。`,
    });
  }

  // Alert 4: 超過 7 天無新銷售
  const latestSale = await db
    .select({ saleDate: schema.sales.saleDate })
    .from(schema.sales)
    .where(eq(schema.sales.userId, userId))
    .orderBy(desc(schema.sales.saleDate))
    .limit(1);

  if (latestSale.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    if (latestSale[0].saleDate < sevenDaysAgoStr) {
      alerts.push({
        type: "no_recent_sales",
        severity: "low",
        title: "超過 7 天無新銷售",
        detail: `最後一筆銷售日期為 ${latestSale[0].saleDate}，已超過 7 天未有新訂單。`,
      });
    }
  }

  return NextResponse.json(alerts);
}
