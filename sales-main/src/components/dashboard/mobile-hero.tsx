"use client";

import Link from "next/link";
import type { MonthlySummary } from "@/lib/calculations";

function formatCompact(n: number) {
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}萬`;
  return n.toLocaleString("zh-TW");
}

export function MobileDashboardHero({
  current,
  previous,
}: {
  current: MonthlySummary;
  previous: MonthlySummary;
}) {
  const netProfit = current.netProfit;
  const prevNetProfit = previous.netProfit;
  const deltaNet =
    prevNetProfit !== 0
      ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100
      : null;
  const isUp = deltaNet !== null && deltaNet >= 0;

  return (
    <div className="md:hidden space-y-3 mb-4">
      {/* 快速動作 chip 列 */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <Link
          href="/sales/new"
          className="flex-none px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold whitespace-nowrap"
        >
          ＋ 新增銷售
        </Link>
        <Link
          href="/sales/batch"
          className="flex-none px-3 py-2 rounded-full border bg-card text-xs font-medium whitespace-nowrap"
        >
          批次
        </Link>
        <Link
          href="/ai"
          className="flex-none px-3 py-2 rounded-full border bg-card text-xs font-medium whitespace-nowrap"
        >
          問 AI
        </Link>
        <Link
          href="/inventory"
          className="flex-none px-3 py-2 rounded-full border bg-card text-xs font-medium whitespace-nowrap"
        >
          入庫
        </Link>
        <Link
          href="/alerts"
          className="flex-none px-3 py-2 rounded-full border bg-card text-xs font-medium whitespace-nowrap"
        >
          警示
        </Link>
      </div>

      {/* Hero 淨利卡 */}
      <div className="rounded-2xl bg-foreground text-background p-4 relative overflow-hidden">
        <div className="text-xs opacity-60 font-medium tracking-wide mb-1">本月淨利</div>
        <div
          className={`text-3xl font-bold font-mono tracking-tight ${
            netProfit < 0 ? "text-red-300" : "text-white"
          }`}
        >
          NT$ {formatCompact(netProfit)}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {deltaNet !== null ? (
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                isUp ? "bg-emerald-800/60 text-emerald-300" : "bg-red-800/60 text-red-300"
              }`}
            >
              {isUp ? "▲" : "▼"} {Math.abs(deltaNet).toFixed(1)}%
            </span>
          ) : null}
          {prevNetProfit !== 0 && (
            <span className="text-xs opacity-50">
              vs. 上月 NT$ {formatCompact(prevNetProfit)}
            </span>
          )}
        </div>

        {/* 2×2 KPI 摘要 */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[10px] opacity-60">本月營收</div>
            <div className="font-mono text-sm font-semibold mt-0.5">
              NT$ {formatCompact(current.revenue)}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[10px] opacity-60">本月毛利</div>
            <div className="font-mono text-sm font-semibold mt-0.5">
              NT$ {formatCompact(current.profit)}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[10px] opacity-60">毛利率</div>
            <div className="font-mono text-sm font-semibold mt-0.5">
              {current.margin.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[10px] opacity-60">淨利率</div>
            <div className="font-mono text-sm font-semibold mt-0.5">
              {current.netProfitRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
