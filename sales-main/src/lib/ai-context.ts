import { and, desc, eq, inArray, gte, lt, lte, like } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  currentYearMonth,
  getMonthlySummary,
  getCategoryPerformance,
  getWeeklyCostDetail,
} from "@/lib/calculations";
import { generateInsights } from "@/lib/financial-insights";
import { getWeekDateRange } from "@/lib/week-utils";

async function buildAlertSummary(userId: string): Promise<string[]> {
  const yearMonth = currentYearMonth();
  const [y, m] = yearMonth.split("-").map(Number);
  const monthStart = `${yearMonth}-01`;
  const nextMonthStart =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const prevMonthStr = `${prevY}-${String(prevM).padStart(2, "0")}`;
  const prevMonthStart = `${prevMonthStr}-01`;

  const [salesRows, prevSalesRows, weeklyCostRows, lowBatches, latestSale] =
    await Promise.all([
      db
        .select({ actualPrice: schema.sales.actualPrice, qty: schema.sales.qty })
        .from(schema.sales)
        .where(
          and(
            eq(schema.sales.userId, userId),
            gte(schema.sales.saleDate, monthStart),
            lt(schema.sales.saleDate, nextMonthStart)
          )
        ),
      db
        .select({ actualPrice: schema.sales.actualPrice, qty: schema.sales.qty })
        .from(schema.sales)
        .where(
          and(
            eq(schema.sales.userId, userId),
            gte(schema.sales.saleDate, prevMonthStart),
            lt(schema.sales.saleDate, monthStart)
          )
        ),
      db
        .select({
          weekLabel: schema.weeklyCosts.weekLabel,
          adCost: schema.weeklyCosts.adCost,
        })
        .from(schema.weeklyCosts)
        .where(
          and(
            eq(schema.weeklyCosts.userId, userId),
            like(schema.weeklyCosts.weekLabel, `${y}-W%`)
          )
        ),
      db
        .select({
          remainingQty: schema.purchaseBatches.remainingQty,
          itemId: schema.purchaseBatches.itemId,
        })
        .from(schema.purchaseBatches)
        .where(
          and(
            eq(schema.purchaseBatches.userId, userId),
            lte(schema.purchaseBatches.remainingQty, 3)
          )
        ),
      db
        .select({ saleDate: schema.sales.saleDate })
        .from(schema.sales)
        .where(eq(schema.sales.userId, userId))
        .orderBy(desc(schema.sales.saleDate))
        .limit(1),
    ]);

  const revenue = salesRows.reduce((s, r) => s + r.actualPrice * r.qty, 0);
  const prevRevenue = prevSalesRows.reduce(
    (s, r) => s + r.actualPrice * r.qty,
    0
  );

  const thisMonthWeeklyCosts = weeklyCostRows.filter((row) => {
    const range = getWeekDateRange(row.weekLabel);
    if (!range) return false;
    const thursday = new Date(range.start);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    return thursday.getUTCFullYear() === y && thursday.getUTCMonth() + 1 === m;
  });

  const alerts: string[] = [];

  if (revenue > 0) {
    const monthlyAdCost = thisMonthWeeklyCosts.reduce(
      (sum, row) => sum + (row.adCost ?? 0),
      0
    );
    if (monthlyAdCost / revenue > 0.3) {
      const pct = ((monthlyAdCost / revenue) * 100).toFixed(1);
      alerts.push(
        `[高] 廣告費異常偏高：本月廣告費 NT$${monthlyAdCost.toLocaleString()} 佔營收 ${pct}%（警戒線 30%）`
      );
    }
  }

  if (lowBatches.length > 0) {
    const itemIds = [...new Set(lowBatches.map((b) => b.itemId))];
    const itemRows = await db
      .select({ id: schema.items.id, name: schema.items.name })
      .from(schema.items)
      .where(and(eq(schema.items.userId, userId), inArray(schema.items.id, itemIds)));
    const itemMap = new Map(itemRows.map((i) => [i.id, i.name]));
    const summary = lowBatches
      .slice(0, 3)
      .map((b) => `${itemMap.get(b.itemId) ?? "未知"}（剩 ${b.remainingQty} 件）`)
      .join("、");
    alerts.push(
      `[中] 庫存偏低：${lowBatches.length} 筆批次剩餘 ≤ 3 件，包括 ${summary}`
    );
  }

  if (salesRows.length > 0 && thisMonthWeeklyCosts.length === 0) {
    alerts.push(
      `[高] 本月成本未登記：已有 ${salesRows.length} 筆銷售但廣告／運費等週費用尚未登記，淨利計算不準確`
    );
  }

  if (latestSale.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    if (latestSale[0].saleDate < sevenDaysAgoStr) {
      alerts.push(
        `[低] 超過 7 天無新銷售：最後一筆銷售日期為 ${latestSale[0].saleDate}`
      );
    }
  }

  if (prevRevenue > 0 && revenue < prevRevenue * 0.85) {
    const dropPct = (((prevRevenue - revenue) / prevRevenue) * 100).toFixed(1);
    alerts.push(
      `[高] 營收明顯下滑：本月 NT$${revenue.toLocaleString()} vs 上月 NT$${prevRevenue.toLocaleString()}，下滑 ${dropPct}%`
    );
  }

  return alerts;
}

export async function buildFinancialContext(userId: string): Promise<string> {
  const currentMonth = currentYearMonth();
  const prevMonth = currentYearMonth(-1);

  const [currentSummary, prevSummary, categories, weeklyDetail, alertSummary] =
    await Promise.all([
      getMonthlySummary(currentMonth, userId),
      getMonthlySummary(prevMonth, userId),
      getCategoryPerformance(currentMonth, userId),
      getWeeklyCostDetail(currentMonth, userId),
      buildAlertSummary(userId),
    ]);

  const insights = generateInsights(
    currentSummary,
    prevSummary,
    categories,
    weeklyDetail
  );

  const topCategories = categories
    .slice(0, 5)
    .map(
      (c, i) =>
        `  ${i + 1}. ${c.categoryName}：營收 NT$${c.revenue.toLocaleString()}，毛利率 ${c.margin.toFixed(1)}%`
    )
    .join("\n");

  const actionLines = insights.actions
    .slice(0, 3)
    .map((a) => `  [${a.priority}] ${a.text}`)
    .join("\n");

  return `你是這位店主的專屬 AI 財務顧問。以下是截至今日從資料庫讀取的真實財務數據，請只根據這些數字回答問題，不要捏造或推測任何未列出的數字。回答請用繁體中文，語氣親切專業。

=== 本月財務摘要（${currentMonth}）===
- 總營收：NT$${currentSummary.revenue.toLocaleString()}
- 直接成本（進貨）：NT$${currentSummary.cost.toLocaleString()}
- 毛利：NT$${currentSummary.profit.toLocaleString()}（毛利率 ${currentSummary.margin.toFixed(1)}%）
- 間接費用：NT$${currentSummary.weeklyCostsTotal.toLocaleString()}
- 淨利：NT$${currentSummary.netProfit.toLocaleString()}（淨利率 ${currentSummary.netProfitRate.toFixed(1)}%）
- 銷售筆數：${currentSummary.count} 筆

=== 間接費用明細（本月）===
- 廣告費：NT$${weeklyDetail.adCost.toLocaleString()}
- 運費：NT$${weeklyDetail.shippingCost.toLocaleString()}
- 包材：NT$${weeklyDetail.packagingCost.toLocaleString()}
- 其他：NT$${weeklyDetail.otherCost.toLocaleString()}
- 合計：NT$${weeklyDetail.totalCost.toLocaleString()}

=== 上月比較（${prevMonth}）===
- 上月營收：NT$${prevSummary.revenue.toLocaleString()}
- 上月淨利：NT$${prevSummary.netProfit.toLocaleString()}
- 月環比趨勢：${insights.monthTrend.text}

=== 品類績效（本月前 5 名，依營收排序）===
${topCategories || "  本月尚無銷售紀錄"}

=== 財務健康診斷 ===
- 整體健康度：${insights.overallHealth}
- 毛利率：${insights.grossMargin.text}
- 淨利率：${insights.netMargin.text}
- 間接費用率：${insights.indirectCost.text}
- 廣告費率：${insights.adCostRatio.text}
- 最主要問題：${insights.topIssue}

=== 系統建議行動（前 3 項）===
${actionLines || "  整體狀況良好，持續記錄即可"}

=== 目前警示（${alertSummary.length} 項）===
${alertSummary.length === 0 ? "  無警示，目前狀況良好" : alertSummary.map((a) => `  ${a}`).join("\n")}`;
}
