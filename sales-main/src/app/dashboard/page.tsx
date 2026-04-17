import {
  currentYearMonth,
  getMonthlySummary,
  getLastNMonthsSummary,
  getCategoryPerformance,
  getGuidance,
} from "@/lib/calculations";
import { ensureSchema } from "@/db/ensure-schema";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TopCategoriesChart } from "@/components/dashboard/top-categories";
import { WorstCategories } from "@/components/dashboard/worst-categories";
import { GuidanceTable } from "@/components/dashboard/guidance";
import { DashboardMonthPicker } from "@/components/dashboard/month-picker";

export const dynamic = "force-dynamic";

function monthBounds(ym: string): { from: string; to: string } {
  const [y, m] = ym.split("-").map(Number);
  const from = `${ym}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${ym}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function previousMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  return `${prevY}-${String(prevM).padStart(2, "0")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await ensureSchema();
  const params = await searchParams;
  const defaultMonth = currentYearMonth(0);
  const selectedMonth = params.month && /^\d{4}-\d{2}$/.test(params.month)
    ? params.month
    : defaultMonth;
  const prevMonth = previousMonth(selectedMonth);
  const monthRange = monthBounds(selectedMonth);

  const [current, previous, trend, categoryPerf, guidance] = await Promise.all([
    getMonthlySummary(selectedMonth),
    getMonthlySummary(prevMonth),
    getLastNMonthsSummary(6),
    getCategoryPerformance(selectedMonth),
    getGuidance(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">儀表板</h1>
          <p className="text-sm text-muted-foreground">
            {selectedMonth} 營業狀況總覽
          </p>
        </div>
        <DashboardMonthPicker current={selectedMonth} />
      </div>

      <SummaryCards current={current} previous={previous} />

      <RevenueChart data={trend} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopCategoriesChart data={categoryPerf} monthRange={monthRange} />
        <WorstCategories data={categoryPerf} monthRange={monthRange} />
      </div>

      <GuidanceTable items={guidance} />
    </div>
  );
}
