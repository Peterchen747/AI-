"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlySummary } from "@/lib/calculations";

export function RevenueChart({ data }: { data: MonthlySummary[] }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>近 6 個月淨利趨勢</span>
          <span className="text-sm font-normal text-muted-foreground">點擊月份查看財務分析 →</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            style={{ cursor: "pointer" }}
            onClick={(payload) => {
              const month = payload?.activeLabel;
              if (month) router.push(`/dashboard/analysis?month=${month}`);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v, name) => [`NT$ ${Number(v).toLocaleString("zh-TW")}`, name]}
            />
            <Legend />
            <Bar dataKey="revenue" name="營收" fill="#3b82f6" />
            <Bar dataKey="cost" name="成本" fill="#ef4444" />
            <Bar dataKey="profit" name="毛利" fill="#22c55e" />
            <Bar dataKey="netProfit" name="淨利" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
