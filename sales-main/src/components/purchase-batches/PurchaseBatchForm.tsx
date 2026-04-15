"use client";

import { useEffect, useState } from "react";
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

type Category = { id: number; name: string };

type Item = {
  id: number;
  categoryId: number;
  name: string;
  typicalCost: number | null;
  typicalPrice: number | null;
};

type Props = {
  onSuccess?: () => void;
};

export function PurchaseBatchForm({ onSuccess }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState<number | null>(null);

  const [purchaseDate, setPurchaseDate] = useState(today);
  const [purchaseQty, setPurchaseQty] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // 載入分類清單
  useEffect(() => {
    fetch("/api/categories?active=1")
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(data))
      .catch(() => toast.error("載入分類清單失敗"));
  }, []);

  // 依分類篩選商品
  useEffect(() => {
    if (!categoryId) {
      setItems([]);
      setItemId(null);
      return;
    }
    fetch(`/api/items?categoryId=${categoryId}`)
      .then((r) => r.json())
      .then((data: Item[]) => setItems(data))
      .catch(() => toast.error("載入商品清單失敗"));
    setItemId(null);
  }, [categoryId]);

  async function handleCreateCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    setCreatingCat(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setCreatingCat(false);
    if (!res.ok) {
      toast.error("建立分類失敗");
      return;
    }
    const created: Category = await res.json();
    setCategories((prev) => [created, ...prev]);
    setCategoryId(String(created.id));
    setNewCatName("");
    setShowNewCatInput(false);
    toast.success(`已建立分類：${created.name}`);
  }

  async function onCreateItem(name: string): Promise<Item | null> {
    if (!categoryId) {
      toast.error("請先選擇大分類");
      return null;
    }
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: Number(categoryId), name }),
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

  const estimatedUnitCost = (() => {
    const qty = Number(purchaseQty);
    const total = Number(totalAmount);
    if (!purchaseQty || !totalAmount || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(total) || total <= 0) {
      return null;
    }
    return Math.round(total / qty);
  })();

  function resetForm() {
    setCategoryId("");
    setItemId(null);
    setPurchaseDate(today);
    setPurchaseQty("");
    setTotalAmount("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!categoryId) return void toast.error("請選擇大分類");
    if (!itemId) return void toast.error("請選擇商品");
    if (!purchaseDate) return void toast.error("請填寫進貨日期");

    const qtyNum = Number(purchaseQty);
    const totalNum = Number(totalAmount);

    if (!purchaseQty || !Number.isFinite(qtyNum) || qtyNum < 1) {
      return void toast.error("進貨數量至少為 1");
    }
    if (!totalAmount || !Number.isFinite(totalNum) || totalNum < 1) {
      return void toast.error("進貨總金額至少為 1");
    }

    setSaving(true);
    const res = await fetch("/api/purchase-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        purchaseDate,
        totalQty: qtyNum,
        totalCost: totalNum,
        notes: notes.trim() || null,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "新增失敗");
      return;
    }

    toast.success("進貨紀錄已建立");
    resetForm();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {/* 大分類 */}
      <div>
        <Label>大分類 *</Label>
        <div className="flex items-center gap-2">
          <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="請選擇大分類" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowNewCatInput((v) => !v)}
          >
            + 新增
          </Button>
        </div>
        {showNewCatInput && (
          <div className="flex items-center gap-2 mt-2">
            <Input
              placeholder="新分類名稱"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateCategory();
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              disabled={creatingCat || !newCatName.trim()}
              onClick={handleCreateCategory}
            >
              {creatingCat ? "建立中..." : "確認"}
            </Button>
          </div>
        )}
      </div>

      {/* 商品（ItemCombobox，支援 inline 新增） */}
      <div>
        <Label>商品 *</Label>
        <ItemCombobox
          items={items}
          value={itemId}
          disabled={!categoryId}
          onSelect={(item) => setItemId(item.id)}
          onCreate={onCreateItem}
        />
      </div>

      {/* 進貨日期 */}
      <div>
        <Label>進貨日期 *</Label>
        <Input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
      </div>

      {/* 數量 + 金額 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>進貨數量 *</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={purchaseQty}
            onChange={(e) => setPurchaseQty(e.target.value)}
            placeholder="例如：10"
          />
        </div>
        <div>
          <Label>進貨總金額 (NT$) *</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="例如：2000"
          />
        </div>
      </div>

      {/* 備註 */}
      <div>
        <Label>備註</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="選填"
        />
      </div>

      {/* 預估單件成本 */}
      {estimatedUnitCost !== null && (
        <div className="rounded-md bg-muted px-4 py-3 text-sm">
          預估單件成本：
          <span className="font-bold ml-1">
            NT$ {estimatedUnitCost.toLocaleString("zh-TW")}
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "儲存中..." : "新增進貨紀錄"}
        </Button>
      </div>
    </form>
  );
}
