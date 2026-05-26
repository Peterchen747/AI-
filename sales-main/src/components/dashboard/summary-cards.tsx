"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNTD } from "@/lib/utils";
import type { MonthlySummary } from "@/lib/calculations";

function deltaBadge(current: number, previous: number) {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = pct >= 0;
  return (
    <span
      className={`text-xs ml-2 ${isUp ? "text-green-600" : "text-red-600"}`}
    >
      {isUp ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function SummaryCards({
  current,
  previous,
}: {
  current: MonthlySummary;
  previous: MonthlySummary;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function downloadPdf() {
    const [year, month] = current.month.split("-");
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/report/${year}/${month}`);
      if (!res.ok) throw new Error("PDF 產生失敗");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${year}-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — user can retry
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
        {/* 本月淨利：手機優先顯示（order-first），桌機維持第5位 */}
        <Card className="order-first md:order-0 col-span-2 md:col-span-1 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              本月淨利
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                current.netProfit < 0 ? "text-red-500" : "text-emerald-600"
              }`}
            >
              {formatNTD(current.netProfit)}
            </div>
            {deltaBadge(current.netProfit, previous.netProfit)}
          </CardContent>
        </Card>
        <Card className="order-2 md:order-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              本月營收
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNTD(current.revenue)}</div>
            {deltaBadge(current.revenue, previous.revenue)}
          </CardContent>
        </Card>
        <Card className="order-3 md:order-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              本月成本
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNTD(current.cost)}</div>
            {deltaBadge(current.cost, previous.cost)}
          </CardContent>
        </Card>
        <Card className="order-4 md:order-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              本月毛利
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                current.profit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatNTD(current.profit)}
            </div>
            {deltaBadge(current.profit, previous.profit)}
          </CardContent>
        </Card>
        <Card className="order-5 md:order-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              毛利率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {current.margin.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              共 {current.count} 筆交易
            </div>
          </CardContent>
        </Card>
        <Card className="order-6 md:order-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              淨利率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {current.netProfitRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadPdf}
          disabled={pdfLoading}
        >
          {pdfLoading ? "產生中..." : "匯出本月 PDF"}
        </Button>
      </div>
    </div>
  );
}
