import { db, schema } from "@/db";
import { eq, gte, lt, and, sql } from "drizzle-orm";

export type MonthlySummary = {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  count: number;
};

function monthRange(yearMonth: string): [string, string] {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const nextMonth =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return [start, nextMonth];
}

export function currentYearMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getMonthlySummary(
  yearMonth: string
): Promise<MonthlySummary> {
  const [start, end] = monthRange(yearMonth);
  const rows = await db
    .select({
      cost: schema.sales.cost,
      actualPrice: schema.sales.actualPrice,
    })
    .from(schema.sales)
    .where(
      and(gte(schema.sales.saleDate, start), lt(schema.sales.saleDate, end))
    );

  const revenue = rows.reduce((s, r) => s + r.actualPrice, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const profit = revenue - cost;
  const margin = revenue === 0 ? 0 : (profit / revenue) * 100;
  return { month: yearMonth, revenue, cost, profit, margin, count: rows.length };
}

export async function getLastNMonthsSummary(
  n: number
): Promise<MonthlySummary[]> {
  // 限制最多查 24 個月，避免過度查詢
  const safeN = Math.min(Math.max(1, Math.floor(n)), 24);
  const months = Array.from({ length: safeN }, (_, i) =>
    currentYearMonth(-(safeN - 1 - i))
  );
  // 並行查詢提升效能
  return Promise.all(months.map((m) => getMonthlySummary(m)));
}

export type CategoryPerformance = {
  categoryId: number | null;
  categoryName: string;
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

export async function getCategoryPerformance(
  yearMonth?: string
): Promise<CategoryPerformance[]> {
  const filters = [];
  if (yearMonth) {
    const [start, end] = monthRange(yearMonth);
    filters.push(gte(schema.sales.saleDate, start));
    filters.push(lt(schema.sales.saleDate, end));
  }

  const rows = await db
    .select({
      categoryId: schema.items.categoryId,
      categoryName: schema.categories.name,
      cost: schema.sales.cost,
      actualPrice: schema.sales.actualPrice,
    })
    .from(schema.sales)
    .innerJoin(schema.items, eq(schema.sales.itemId, schema.items.id))
    .leftJoin(
      schema.categories,
      eq(schema.items.categoryId, schema.categories.id)
    )
    .where(filters.length ? and(...filters) : undefined);

  const map = new Map<string, CategoryPerformance>();
  for (const r of rows) {
    const key = r.categoryId != null ? String(r.categoryId) : "none";
    const name = r.categoryName || "未分類";
    const existing =
      map.get(key) ??
      {
        categoryId: r.categoryId,
        categoryName: name,
        count: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
      };
    existing.count++;
    existing.revenue += r.actualPrice;
    existing.cost += r.cost;
    existing.profit = existing.revenue - existing.cost;
    existing.margin =
      existing.revenue === 0
        ? 0
        : (existing.profit / existing.revenue) * 100;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export type GuidanceItem = {
  categoryName: string;
  recentCount: number;
  earlierCount: number;
  trend: "up" | "down" | "stable";
  margin: number;
  recommendation: string;
};

export async function getGuidance(): Promise<GuidanceItem[]> {
  const thisMonth = currentYearMonth(0);
  const prevMonth = currentYearMonth(-1);
  const twoMonthsAgo = currentYearMonth(-2);

  const [recentPerf, earlierMonth1, earlierMonth2] = await Promise.all([
    getCategoryPerformance(thisMonth),
    getCategoryPerformance(prevMonth),
    getCategoryPerformance(twoMonthsAgo),
  ]);

  const earlierMap = new Map<string, number>();
  for (const p of earlierMonth1) {
    earlierMap.set(p.categoryName, (earlierMap.get(p.categoryName) ?? 0) + p.count);
  }
  for (const p of earlierMonth2) {
    earlierMap.set(p.categoryName, (earlierMap.get(p.categoryName) ?? 0) + p.count);
  }

  const items: GuidanceItem[] = [];
  for (const p of recentPerf) {
    const earlierTotal = earlierMap.get(p.categoryName) ?? 0;
    const earlierAvg = earlierTotal / 2;
    let trend: "up" | "down" | "stable" = "stable";
    let recommendation = "維持現狀";
    if (p.count > earlierAvg * 1.3 && p.margin > 20) {
      trend = "up";
      recommendation = "📈 建議增加備貨";
    } else if (p.count < earlierAvg * 0.7) {
      trend = "down";
      recommendation = "📉 建議減少備貨";
    } else if (p.margin < 10) {
      recommendation = "⚠️ 毛利過低，考慮調價或停售";
    }
    items.push({
      categoryName: p.categoryName,
      recentCount: p.count,
      earlierCount: Math.round(earlierAvg),
      trend,
      margin: p.margin,
      recommendation,
    });
  }
  return items;
}

// Suppress unused warning for sql import
export { sql };
