"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryPerformance } from "@/lib/calculations";

export function TopCategoriesChart({
  data,
  monthRange,
}: {
  data: CategoryPerformance[];
  monthRange?: { from: string; to: string };
}) {
  const top = data.slice(0, 10);
  return (
    <Card>
      <CardHeader>
        <CardTitle>🔥 爆款分類 Top 10（本月）</CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            本月尚無銷售資料
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, top.length * 40)}>
            <BarChart
              data={top}
              layout="vertical"
              margin={{ left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="categoryName"
                width={80}
              />
              <Tooltip
                formatter={(v) => `NT$ ${Number(v).toLocaleString("zh-TW")}`}
              />
              <Bar dataKey="revenue" name="營收" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        )}
        {top.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground">查看明細:</span>
            {top.map((c) =>
              c.categoryId != null ? (
                <Link
                  key={c.categoryId}
                  href={
                    monthRange
                      ? `/sales?categoryId=${c.categoryId}&dateFrom=${monthRange.from}&dateTo=${monthRange.to}`
                      : `/sales?categoryId=${c.categoryId}`
                  }
                  className="text-primary hover:underline"
                >
                  {c.categoryName}
                </Link>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
