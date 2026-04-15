import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
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
      <Card>
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            本月利潤
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
      <Card>
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
    </div>
  );
}
