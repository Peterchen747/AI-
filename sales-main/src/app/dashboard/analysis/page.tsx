import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getMonthlySummary,
  getCategoryPerformance,
  getWeeklyCostDetail,
  currentYearMonth,
} from "@/lib/calculations";
import { generateInsights } from "@/lib/financial-insights";
import { ensureSchema } from "@/db/ensure-schema";
import { FinancialAnalysis } from "@/components/dashboard/financial-analysis";

export const dynamic = "force-dynamic";

function previousMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  return `${prevY}-${String(prevM).padStart(2, "0")}`;
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { month } = await searchParams;
  const selectedMonth = month ?? currentYearMonth();
  const prevMonth = previousMonth(selectedMonth);
  const userId = session.user.id;

  const [summary, prevSummary, categories, weeklyDetail] = await Promise.all([
    getMonthlySummary(selectedMonth, userId),
    getMonthlySummary(prevMonth, userId),
    getCategoryPerformance(selectedMonth, userId),
    getWeeklyCostDetail(selectedMonth, userId),
  ]);

  const insights = generateInsights(summary, prevSummary, categories, weeklyDetail);

  return (
    <FinancialAnalysis
      month={selectedMonth}
      summary={summary}
      prevSummary={prevSummary}
      categories={categories}
      weeklyDetail={weeklyDetail}
      insights={insights}
    />
  );
}
