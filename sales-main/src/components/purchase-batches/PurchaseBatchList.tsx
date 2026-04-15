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

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
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
          {loading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                載入中...
              </TableCell>
            </TableRow>
          )}
          {!loading && batches.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                尚無進貨紀錄
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            batches.map((b) => (
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
  );
}
