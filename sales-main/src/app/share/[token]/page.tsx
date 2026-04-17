import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import {
  currentYearMonth,
  getMonthlySummary,
  getLastNMonthsSummary,
  getCategoryPerformance,
} from "@/lib/calculations";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TopCategoriesChart } from "@/components/dashboard/top-categories";
import { WorstCategories } from "@/components/dashboard/worst-categories";

export const dynamic = "force-dynamic";

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [tokenRow] = await db
    .select()
    .from(schema.shareTokens)
    .where(eq(schema.shareTokens.token, token))
    .limit(1);

  if (!tokenRow || !tokenRow.userId) {
    notFound();
  }

  const ownerId = tokenRow.userId;
  const thisMonth = currentYearMonth(0);
  const lastMonth = currentYearMonth(-1);

  const [current, previous, trend, categoryPerf] = await Promise.all([
    getMonthlySummary(thisMonth, ownerId),
    getMonthlySummary(lastMonth, ownerId),
    getLastNMonthsSummary(6, ownerId),
    getCategoryPerformance(thisMonth, ownerId),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">💎 銷售營運報告</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {thisMonth} 營業狀況 · 投資人專屬連結
          {tokenRow.label ? ` · ${tokenRow.label}` : ""}
        </p>
      </div>

      <SummaryCards current={current} previous={previous} />

      <RevenueChart data={trend} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopCategoriesChart data={categoryPerf} />
        <WorstCategories data={categoryPerf} />
      </div>

      <div className="text-center text-xs text-muted-foreground pt-8">
        此為唯讀檢視頁面 · 由銷售追蹤系統生成
      </div>
    </div>
  );
}
