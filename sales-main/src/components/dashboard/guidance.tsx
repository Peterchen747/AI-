import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GuidanceItem } from "@/lib/calculations";

export function GuidanceTable({ items }: { items: GuidanceItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>💡 下月備貨建議</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            資料不足，至少需要 1 個月的銷售紀錄
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">本月</TableHead>
                <TableHead className="text-right">前 2 月平均</TableHead>
                <TableHead>趨勢</TableHead>
                <TableHead>建議</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.categoryName}>
                  <TableCell className="font-medium">
                    {i.categoryName}
                  </TableCell>
                  <TableCell className="text-right">{i.recentCount}</TableCell>
                  <TableCell className="text-right">{i.earlierCount}</TableCell>
                  <TableCell>
                    {i.trend === "up"
                      ? "📈 成長"
                      : i.trend === "down"
                      ? "📉 下降"
                      : "→ 持平"}
                  </TableCell>
                  <TableCell className="text-sm">{i.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
