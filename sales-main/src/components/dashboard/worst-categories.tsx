import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function WorstCategories({
  data,
  monthRange,
}: {
  data: CategoryPerformance[];
  monthRange?: { from: string; to: string };
}) {
  // Sort by profit asc (lowest first), take bottom 5
  const worst = [...data].sort((a, b) => a.profit - b.profit).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚠️ 表現不佳分類</CardTitle>
      </CardHeader>
      <CardContent>
        {worst.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            本月尚無銷售資料
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">筆數</TableHead>
                <TableHead className="text-right">利潤</TableHead>
                <TableHead className="text-right">毛利率</TableHead>
                <TableHead>建議</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {worst.map((c) => {
                const shouldDrop = c.margin < 10 || c.profit < 0;
                return (
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
                    <TableCell
                      className={`text-right ${
                        c.profit < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {formatNTD(c.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.margin.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {shouldDrop ? (
                        <Badge variant="destructive">考慮停售</Badge>
                      ) : (
                        <Badge variant="secondary">觀察中</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
