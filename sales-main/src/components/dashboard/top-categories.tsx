import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNTD } from "@/lib/utils";
import type { CategoryPerformance } from "@/lib/calculations";

export function TopCategoriesChart({
  data,
  monthRange,
}: {
  data: CategoryPerformance[];
  monthRange?: { from: string; to: string };
}) {
  const top = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">筆數</TableHead>
                <TableHead className="text-right">營收</TableHead>
                <TableHead className="text-right">利潤</TableHead>
                <TableHead className="text-right">毛利率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.map((c) => (
                <TableRow key={c.categoryName}>
                  <TableCell className="font-medium">
                    {c.categoryId != null ? (
                      <Link
                        href={
                          monthRange
                            ? `/sales?categoryId=${c.categoryId}&dateFrom=${monthRange.from}&dateTo=${monthRange.to}`
                            : `/sales?categoryId=${c.categoryId}`
                        }
                        className="hover:underline text-primary"
                      >
                        {c.categoryName}
                      </Link>
                    ) : (
                      c.categoryName
                    )}
                  </TableCell>
                  <TableCell className="text-right">{c.count}</TableCell>
                  <TableCell className="text-right">{formatNTD(c.revenue)}</TableCell>
                  <TableCell
                    className={`text-right ${c.profit < 0 ? "text-red-600" : ""}`}
                  >
                    {formatNTD(c.profit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.margin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
