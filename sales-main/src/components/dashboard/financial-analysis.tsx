"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { MonthlySummary, CategoryPerformance, WeeklyCostDetail } from "@/lib/calculations";
import type { FinancialInsight } from "@/lib/financial-insights";

const ntd = (n: number) => `NT$${Math.round(n).toLocaleString("zh-TW")}`;

const healthConfig = {
  excellent: { label: "優秀", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  healthy:   { label: "健康", className: "bg-blue-100 text-blue-800 border-blue-200" },
  warning:   { label: "警示", className: "bg-amber-100 text-amber-800 border-amber-200" },
  danger:    { label: "危險", className: "bg-red-100 text-red-800 border-red-200" },
  ok:        { label: "正常", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  critical:  { label: "嚴重", className: "bg-red-100 text-red-800 border-red-200" },
  low:       { label: "分散", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  medium:    { label: "中等", className: "bg-amber-100 text-amber-800 border-amber-200" },
  high:      { label: "高風險", className: "bg-red-100 text-red-800 border-red-200" },
} as const;

const priorityConfig = {
  urgent:    { label: "緊急", dot: "bg-red-500" },
  important: { label: "重要", dot: "bg-amber-500" },
  optional:  { label: "建議", dot: "bg-slate-400" },
} as const;

type Props = {
  month: string;
  summary: MonthlySummary;
  prevSummary: MonthlySummary;
  categories: CategoryPerformance[];
  weeklyDetail: WeeklyCostDetail;
  insights: FinancialInsight;
};

export function FinancialAnalysis({
  month,
  summary,
  prevSummary,
  categories,
  weeklyDetail,
  insights,
}: Props) {
  const [year, mon] = month.split("-");
  const { grossMargin, netMargin, indirectCost, adCostRatio, cogRatio, monthTrend, concentration, overallHealth, topIssue, actions } = insights;

  // 費用分解比例條資料
  const { revenue, cost, profit, weeklyCostsTotal, netProfit } = summary;
  const segments =
    revenue > 0
      ? [
          { label: "進貨成本", value: cost, color: "bg-red-400", pct: (cost / revenue) * 100 },
          { label: "廣告", value: weeklyDetail.adCost, color: "bg-orange-400", pct: (weeklyDetail.adCost / revenue) * 100 },
          { label: "運費", value: weeklyDetail.shippingCost, color: "bg-yellow-400", pct: (weeklyDetail.shippingCost / revenue) * 100 },
          { label: "包材", value: weeklyDetail.packagingCost, color: "bg-amber-300", pct: (weeklyDetail.packagingCost / revenue) * 100 },
          { label: "其他", value: weeklyDetail.otherCost, color: "bg-slate-300", pct: (weeklyDetail.otherCost / revenue) * 100 },
          { label: netProfit >= 0 ? "淨利" : "虧損", value: Math.abs(netProfit), color: netProfit >= 0 ? "bg-emerald-400" : "bg-red-200", pct: Math.abs((netProfit / revenue) * 100) },
        ].filter((s) => s.pct > 0)
      : [];

  const hc = healthConfig[overallHealth];
  const prevMonth = `${prevSummary.month.split("-")[0]}/${prevSummary.month.split("-")[1]}`;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5">
      {/* 頁首 */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 返回儀表板
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-xl font-semibold">
          {year} 年 {mon} 月・財務分析
        </h1>
      </div>

      {/* 整體健康度 */}
      <Card className={`border-2 ${overallHealth === "danger" ? "border-red-300" : overallHealth === "warning" ? "border-amber-300" : overallHealth === "excellent" ? "border-emerald-300" : "border-blue-300"}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Badge className={`text-sm px-3 py-1 ${hc.className}`}>{hc.label}</Badge>
            <p className="text-sm leading-relaxed text-foreground">{topIssue}</p>
          </div>
        </CardContent>
      </Card>

      {/* 核心指標 4 卡 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          title="毛利率"
          value={`${grossMargin.rate.toFixed(1)}%`}
          level={grossMargin.level}
          sub={`毛利 ${ntd(profit)}`}
        />
        <MetricCard
          title="淨利率"
          value={`${netMargin.rate.toFixed(1)}%`}
          level={netMargin.level}
          sub={`淨利 ${ntd(netProfit)}`}
        />
        <MetricCard
          title="間接費用率"
          value={`${indirectCost.rate.toFixed(1)}%`}
          level={indirectCost.level}
          sub={`共 ${ntd(weeklyCostsTotal)}`}
        />
        <MetricCard
          title="廣告費率"
          value={`${adCostRatio.rate.toFixed(1)}%`}
          level={adCostRatio.level}
          sub={`廣告 ${ntd(weeklyDetail.adCost)}`}
        />
      </div>

      {/* 指標說明 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <InsightRow label="毛利率" text={grossMargin.text} level={grossMargin.level} />
        <InsightRow label="淨利率" text={netMargin.text} level={netMargin.level} />
        <InsightRow label="間接費用" text={indirectCost.text} level={indirectCost.level} />
        <InsightRow label="廣告費" text={adCostRatio.text} level={adCostRatio.level} />
        <InsightRow label="月環比" text={monthTrend.text} level={monthTrend.direction === "up" ? "excellent" : monthTrend.direction === "down" ? "warning" : "healthy"} />
        <InsightRow label="類別集中度" text={concentration.text} level={concentration.level === "low" ? "excellent" : concentration.level === "medium" ? "warning" : "danger"} />
      </div>

      {/* 費用分解視覺化 */}
      {revenue > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">營收分配（{ntd(revenue)}）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 比例條 */}
            <div className="flex w-full h-7 rounded-md overflow-hidden">
              {segments.map((seg) => (
                <div
                  key={seg.label}
                  className={`${seg.color} flex items-center justify-center text-xs font-medium text-white`}
                  style={{ width: `${seg.pct}%`, minWidth: seg.pct > 3 ? undefined : 0 }}
                  title={`${seg.label}: ${ntd(seg.value)} (${seg.pct.toFixed(1)}%)`}
                >
                  {seg.pct > 8 ? `${seg.pct.toFixed(0)}%` : ""}
                </div>
              ))}
            </div>
            {/* 圖例 */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {segments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`inline-block w-3 h-3 rounded-sm ${seg.color}`} />
                  {seg.label} {ntd(seg.value)} ({seg.pct.toFixed(1)}%)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 月環比 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">與上月比較（vs {prevMonth}）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            <CompareItem label="營收" curr={ntd(summary.revenue)} prev={ntd(prevSummary.revenue)} change={monthTrend.revenueChange} />
            <CompareItem label="毛利" curr={ntd(summary.profit)} prev={ntd(prevSummary.profit)} change={prevSummary.profit > 0 ? ((summary.profit - prevSummary.profit) / prevSummary.profit) * 100 : 0} />
            <CompareItem label="淨利" curr={ntd(summary.netProfit)} prev={ntd(prevSummary.netProfit)} change={prevSummary.netProfit !== 0 ? ((summary.netProfit - prevSummary.netProfit) / Math.abs(prevSummary.netProfit)) * 100 : 0} />
            <CompareItem label="筆數" curr={`${summary.count} 筆`} prev={`${prevSummary.count} 筆`} change={monthTrend.countChange} />
          </div>
        </CardContent>
      </Card>

      {/* 類別表現 */}
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">類別表現</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.slice(0, 5).map((cat, i) => (
              <div key={cat.categoryId ?? "none"} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4">{i + 1}.</span>
                  <span>{cat.categoryName}</span>
                  {i === 0 && <Badge className="text-xs bg-amber-100 text-amber-800">最高營收</Badge>}
                  {cat.margin === Math.max(...categories.map((c) => c.margin)) && (
                    <Badge className="text-xs bg-emerald-100 text-emerald-800">最高毛利率</Badge>
                  )}
                </div>
                <div className="flex gap-4 text-right">
                  <span className="text-muted-foreground">{ntd(cat.revenue)}</span>
                  <span className={`font-medium ${cat.margin >= 30 ? "text-emerald-600" : cat.margin >= 10 ? "text-amber-600" : "text-red-600"}`}>
                    毛利率 {cat.margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 行動建議 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">行動建議</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map((action, i) => {
            const pc = priorityConfig[action.priority];
            return (
              <div key={i} className="flex gap-3 text-sm">
                <div className="flex items-start gap-1.5 shrink-0 pt-0.5">
                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${pc.dot}`} />
                  <span className="text-xs text-muted-foreground w-8 shrink-0">{pc.label}</span>
                </div>
                <p className="leading-relaxed">{action.text}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 直接成本備註 */}
      <p className="text-xs text-muted-foreground text-center pb-4">{cogRatio.text}・數據來源：本月銷售記錄 + 週成本紀錄</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  level,
  sub,
}: {
  title: string;
  value: string;
  level: keyof typeof healthConfig;
  sub: string;
}) {
  const cfg = healthConfig[level];
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{sub}</p>
          <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightRow({
  label,
  text,
  level,
}: {
  label: string;
  text: string;
  level: keyof typeof healthConfig;
}) {
  const cfg = healthConfig[level];
  return (
    <div className="flex gap-2 text-sm">
      <Badge className={`text-xs shrink-0 self-start mt-0.5 ${cfg.className}`}>{label}</Badge>
      <p className="text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function CompareItem({
  label,
  curr,
  prev,
  change,
}: {
  label: string;
  curr: string;
  prev: string;
  change: number;
}) {
  const isUp = change > 2;
  const isDown = change < -2;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold">{curr}</p>
      <p className="text-xs text-muted-foreground">{prev}</p>
      {Math.abs(change) > 2 && (
        <p className={`text-xs font-medium ${isUp ? "text-emerald-600" : isDown ? "text-red-500" : "text-muted-foreground"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
        </p>
      )}
    </div>
  );
}
