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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlySummary } from "@/lib/calculations";

export function RevenueChart({ data }: { data: MonthlySummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>近 6 個月營收 / 成本 / 利潤</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v) => `NT$ ${Number(v).toLocaleString("zh-TW")}`}
            />
            <Legend />
            <Bar dataKey="revenue" name="營收" fill="#3b82f6" />
            <Bar dataKey="cost" name="成本" fill="#ef4444" />
            <Bar dataKey="profit" name="利潤" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
