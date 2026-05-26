"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PurchaseBatch = {
  id: number;
  itemName: string;
  purchaseDate: string;
  totalQty: number;
  remainingQty: number;
  unitCost: number;
  totalCost: number;
};

export function PurchaseBatchList() {
  const [batches, setBatches] = useState<PurchaseBatch[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchBatches() {
    setLoading(true);
    const res = await fetch("/api/purchase-batches");
    if (res.ok) {
      const data = await res.json();
      setBatches(data);
    } else {
      toast.error("載入進貨批次失敗");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBatches();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("確定刪除此筆進貨紀錄？")) return;
    const res = await fetch(`/api/purchase-batches/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已刪除");
      fetchBatches();
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "刪除失敗");
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">載入中...</div>;
  }

  if (batches.length === 0) {
    return <div className="text-center text-muted-foreground py-8">尚無進貨紀錄</div>;
  }

  return (
    <>
      {/* 手機卡片列表 */}
      <div className="md:hidden space-y-3">
        {batches.map((b) => (
          <div key={b.id} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{b.itemName}</p>
              <span className="text-xs text-muted-foreground shrink-0">{b.purchaseDate}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">進貨數量</p>
                <p>{b.totalQty}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">剩餘庫存</p>
                <p className={b.remainingQty <= 3 ? "text-orange-500 font-medium" : ""}>
                  {b.remainingQty <= 3 ? `⚠️ ${b.remainingQty}` : b.remainingQty}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">單件成本</p>
                <p>NT$ {b.unitCost.toLocaleString("zh-TW")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">進貨總額</p>
                <p>NT$ {b.totalCost.toLocaleString("zh-TW")}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-10"
              onClick={() => handleDelete(b.id)}
            >
              刪除
            </Button>
          </div>
        ))}
      </div>

      {/* 桌機表格 */}
      <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow>
              <TableHead>品項名稱</TableHead>
              <TableHead>進貨日期</TableHead>
              <TableHead className="text-right">進貨數量</TableHead>
              <TableHead className="text-right">剩餘庫存</TableHead>
              <TableHead className="text-right">單件成本</TableHead>
              <TableHead className="text-right">進貨總額</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.itemName}</TableCell>
                <TableCell>{b.purchaseDate}</TableCell>
                <TableCell className="text-right">{b.totalQty}</TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    b.remainingQty <= 3 ? "text-orange-500" : ""
                  }`}
                >
                  {b.remainingQty <= 3 ? `⚠️ ${b.remainingQty}` : b.remainingQty}
                </TableCell>
                <TableCell className="text-right">
                  NT$ {b.unitCost.toLocaleString("zh-TW")}
                </TableCell>
                <TableCell className="text-right">
                  NT$ {b.totalCost.toLocaleString("zh-TW")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(b.id)}
                  >
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
