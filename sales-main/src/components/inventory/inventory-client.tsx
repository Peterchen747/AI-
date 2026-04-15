"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemCombobox } from "@/components/sales/item-combobox";
import { formatNTD } from "@/lib/utils";

type Category = { id: number; name: string };
type Item = {
  id: number;
  categoryId: number;
  name: string;
  typicalCost: number | null;
  typicalPrice: number | null;
};

type InventoryRecord = {
  id: number;
  itemId: number;
  unitCost: number;
  quantity: number;
  remainingQty: number;
  stockDate: string;
  note: string | null;
  isActive: number;
  itemName: string;
  categoryId: number;
  categoryName: string | null;
};

export function InventoryClient({
  categories,
  initialRecords,
}: {
  categories: Category[];
  initialRecords: InventoryRecord[];
}) {
  const router = useRouter();
  const [records, setRecords] = useState<InventoryRecord[]>(initialRecords);
  const [items, setItems] = useState<Item[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [itemId, setItemId] = useState<number | null>(null);
  const [unitCost, setUnitCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [stockDate, setStockDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    if (!categoryId) {
      setItems([]);
      setItemId(null);
      return;
    }
    fetch(`/api/items?categoryId=${categoryId}`)
      .then((r) => r.json())
      .then((data: Item[]) => setItems(data))
      .catch(() => setItems([]));
    setItemId(null);
  }, [categoryId]);

  async function onCreateItem(name: string): Promise<Item | null> {
    if (!categoryId) {
      toast.error("請先選擇分類");
      return null;
    }
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: Number(categoryId),
        name,
        typicalCost: unitCost ? Number(unitCost) : null,
      }),
    });
    if (!res.ok) {
      toast.error("建立商品失敗");
      return null;
    }
    const created: Item = await res.json();
    setItems((prev) => [...prev, created]);
    setItemId(created.id);
    toast.success(`已建立商品：${created.name}`);
    return created;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !itemId) {
      toast.error("請先選分類與商品");
      return;
    }
    const costNum = Number(unitCost);
    const qtyNum = Number(quantity);
    if (!Number.isInteger(costNum) || costNum < 0) {
      toast.error("單位成本需為非負整數");
      return;
    }
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      toast.error("數量需為正整數");
      return;
    }
    if (!stockDate) {
      toast.error("請輸入入庫日期");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        unitCost: costNum,
        quantity: qtyNum,
        stockDate,
        note: note.trim() || null,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "建立入庫紀錄失敗");
      return;
    }

    toast.success("入庫紀錄已建立");
    setUnitCost("");
    setQuantity("1");
    setNote("");
    router.refresh();
  }

  async function saveNote(id: number) {
    const res = await fetch(`/api/inventory?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: editNote }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "更新失敗");
      return;
    }
    toast.success("備註已更新");
    setEditingId(null);
    setEditNote("");
    router.refresh();
  }

  async function removeRecord(record: InventoryRecord) {
    if (!confirm(`確定要刪除入庫紀錄 #${record.id}？`)) return;
    const res = await fetch(`/api/inventory?id=${record.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "刪除失敗");
      return;
    }
    const data = await res.json();
    toast.success(data.mode === "hard" ? "已刪除" : "已有引用，改為停用");
    router.refresh();
  }

  const totalInventoryCost = useMemo(
    () =>
      records
        .filter((r) => r.isActive === 1)
        .reduce((sum, r) => sum + r.unitCost * r.quantity, 0),
    [records]
  );

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded border p-4 space-y-4 bg-card">
        <h2 className="font-semibold">新增入庫</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>分類 *</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="請選擇分類" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>商品 *</Label>
            <ItemCombobox
              items={items}
              value={itemId}
              disabled={!categoryId}
              onSelect={(item) => {
                setItemId(item.id);
                if (item.typicalCost != null) setUnitCost(String(item.typicalCost));
              }}
              onCreate={onCreateItem}
            />
          </div>
          <div>
            <Label>單位成本 (NT$) *</Label>
            <Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </div>
          <div>
            <Label>數量 *</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label>入庫日期 *</Label>
            <Input type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>備註</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "儲存中..." : "儲存入庫紀錄"}
          </Button>
        </div>
      </form>

      <div className="rounded border p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">入庫清單</h2>
          <span className="text-sm text-muted-foreground">
            總入庫成本：{formatNTD(totalInventoryCost)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2">ID</th>
                <th className="text-left py-2">日期</th>
                <th className="text-left py-2">分類</th>
                <th className="text-left py-2">商品</th>
                <th className="text-right py-2">單位成本</th>
                <th className="text-right py-2">數量</th>
                <th className="text-right py-2">剩餘</th>
                <th className="text-left py-2">備註</th>
                <th className="text-right py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">
                    目前沒有入庫紀錄
                  </td>
                </tr>
              )}
              {records.map((record) => (
                <tr key={record.id} className="border-b align-top">
                  <td className="py-2 pr-2">#{record.id}</td>
                  <td className="py-2 pr-2">{record.stockDate}</td>
                  <td className="py-2 pr-2">{record.categoryName ?? "-"}</td>
                  <td className="py-2 pr-2">{record.itemName}</td>
                  <td className="py-2 pr-2 text-right">{formatNTD(record.unitCost)}</td>
                  <td className="py-2 pr-2 text-right">{record.quantity}</td>
                  <td className="py-2 pr-2 text-right">
                    <span className={record.remainingQty === 0 ? "text-red-600" : ""}>
                      {record.remainingQty}
                    </span>
                  </td>
                  <td className="py-2 pr-2 max-w-xs">
                    {editingId === record.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="min-h-16"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNote(record.id)}>
                            儲存
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setEditNote("");
                            }}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span>{record.note || "-"}</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {editingId !== record.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(record.id);
                            setEditNote(record.note ?? "");
                          }}
                        >
                          編修備註
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => removeRecord(record)}>
                        刪除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
