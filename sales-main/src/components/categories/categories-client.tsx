"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatNTD, cn } from "@/lib/utils";

type Category = {
  id: number;
  name: string;
  description: string | null;
  isActive: number;
};

type Item = {
  id: number;
  categoryId: number;
  name: string;
  typicalCost: number | null;
  typicalPrice: number | null;
  isActive: number;
  saleCount: number;
  saleQty: number;
};

export function CategoriesClient({ categories: initialCategories }: { categories: Category[] }) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialCategories.find((c) => c.isActive === 1)?.id ?? initialCategories[0]?.id ?? null
  );
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const visibleCategories = showArchived
    ? categories
    : categories.filter((c) => c.isActive === 1);

  async function loadItems(catId: number | null) {
    if (!catId) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    try {
      const res = await fetch(
        `/api/items?categoryId=${catId}${showArchived ? "&includeArchived=1" : ""}`
      );
      const data = await res.json();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  useEffect(() => {
    loadItems(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, showArchived]);

  // ----- Category actions -----
  async function saveCategory(payload: { id?: number; name: string; description: string | null }) {
    const res = await fetch("/api/categories", {
      method: payload.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("儲存失敗");
      return;
    }
    toast.success(payload.id ? "已更新" : "已新增");
    setCatDialogOpen(false);
    setEditingCat(null);
    router.refresh();
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`確定刪除大分類「${cat.name}」?\n(若有商品或銷售紀錄將自動封存)`)) return;
    const res = await fetch(`/api/categories?id=${cat.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "刪除失敗");
      return;
    }
    toast.success(data.mode === "hard" ? "已刪除" : "已封存");
    router.refresh();
  }

  async function restoreCategory(cat: Category) {
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, isActive: 1 }),
    });
    if (res.ok) {
      toast.success("分類已還原", {
        description: "底下商品仍為封存狀態,請視需要逐個還原",
      });
      router.refresh();
    }
  }

  // ----- Item actions -----
  async function saveItem(payload: {
    id?: number;
    categoryId?: number;
    name: string;
    typicalCost: number | null;
    typicalPrice: number | null;
  }) {
    const res = await fetch("/api/items", {
      method: payload.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("儲存失敗");
      return;
    }
    toast.success(payload.id ? "已更新" : "已新增");
    setItemDialogOpen(false);
    setEditingItem(null);
    loadItems(selectedId);
  }

  async function deleteItem(it: Item) {
    if (!confirm(`確定刪除商品「${it.name}」?\n(若有銷售紀錄將自動封存)`)) return;
    const res = await fetch(`/api/items?id=${it.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "刪除失敗");
      return;
    }
    toast.success(data.mode === "hard" ? "已刪除" : "已封存");
    loadItems(selectedId);
  }

  async function restoreItem(it: Item) {
    const res = await fetch("/api/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: it.id, isActive: 1 }),
    });
    if (res.ok) {
      toast.success("已還原");
      loadItems(selectedId);
    }
  }

  const selectedCat = categories.find((c) => c.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          顯示已封存
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: categories */}
        <div className="lg:col-span-1 rounded-md border bg-card">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-medium">大分類</h2>
            <Button
              size="sm"
              onClick={() => {
                setEditingCat(null);
                setCatDialogOpen(true);
              }}
            >
              + 新增
            </Button>
          </div>
          <div className="divide-y">
            {visibleCategories.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                還沒有大分類
              </div>
            )}
            {visibleCategories.map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  "p-3 cursor-pointer hover:bg-muted/50 flex items-center justify-between",
                  selectedId === cat.id && "bg-muted"
                )}
                onClick={() => setSelectedId(cat.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    <span className="truncate">{cat.name}</span>
                    {cat.isActive === 0 && <Badge variant="secondary">已封存</Badge>}
                  </div>
                  {cat.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {cat.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingCat(cat);
                      setCatDialogOpen(true);
                    }}
                  >
                    編輯
                  </Button>
                  {cat.isActive === 1 ? (
                    <Button size="sm" variant="ghost" onClick={() => deleteCategory(cat)}>
                      刪除
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => restoreCategory(cat)}>
                      還原
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: items */}
        <div className="lg:col-span-2 rounded-md border bg-card">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-medium">
              {selectedCat ? `「${selectedCat.name}」底下的商品` : "請先選擇大分類"}
            </h2>
            {selectedCat && selectedCat.isActive === 1 && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setItemDialogOpen(true);
                }}
              >
                + 新增商品
              </Button>
            )}
          </div>
          <div className="divide-y">
            {loadingItems && (
              <div className="p-6 text-center text-sm text-muted-foreground">載入中...</div>
            )}
            {!loadingItems && selectedCat && items.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                此分類底下還沒有商品
              </div>
            )}
            {!loadingItems &&
              items.map((it) => (
                <div key={it.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      <span className="truncate">{it.name}</span>
                      {it.isActive === 0 && <Badge variant="secondary">已封存</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      成本 {it.typicalCost != null ? formatNTD(it.typicalCost) : "—"} · 售價{" "}
                      {it.typicalPrice != null ? formatNTD(it.typicalPrice) : "—"} · 銷售{" "}
                      <b>{it.saleCount}</b> 次・共 <b>{it.saleQty}</b> 件
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingItem(it);
                        setItemDialogOpen(true);
                      }}
                    >
                      編輯
                    </Button>
                    {it.isActive === 1 ? (
                      <Button size="sm" variant="outline" onClick={() => deleteItem(it)}>
                        刪除
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={selectedCat?.isActive === 0}
                        title={
                          selectedCat?.isActive === 0
                            ? "請先還原所屬大分類"
                            : undefined
                        }
                        onClick={() => restoreItem(it)}
                      >
                        還原
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Category dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "編輯大分類" : "新增大分類"}</DialogTitle>
          </DialogHeader>
          <CategoryEditForm
            initial={editingCat}
            onSave={saveCategory}
            onCancel={() => {
              setCatDialogOpen(false);
              setEditingCat(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "編輯商品" : "新增商品"}</DialogTitle>
          </DialogHeader>
          <ItemEditForm
            initial={editingItem}
            categoryId={selectedCat?.id}
            onSave={saveItem}
            onCancel={() => {
              setItemDialogOpen(false);
              setEditingItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Category | null;
  onSave: (p: { id?: number; name: string; description: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          toast.error("名稱必填");
          return;
        }
        onSave({
          id: initial?.id,
          name: name.trim(),
          description: description.trim() || null,
        });
      }}
      className="space-y-4"
    >
      <div>
        <Label>名稱 *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如:手鐲"
        />
      </div>
      <div>
        <Label>描述</Label>
        <Textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="選填"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存</Button>
      </div>
    </form>
  );
}

function ItemEditForm({
  initial,
  categoryId,
  onSave,
  onCancel,
}: {
  initial: Item | null;
  categoryId?: number;
  onSave: (p: {
    id?: number;
    categoryId?: number;
    name: string;
    typicalCost: number | null;
    typicalPrice: number | null;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [typicalCost, setTypicalCost] = useState(initial?.typicalCost?.toString() ?? "");
  const [typicalPrice, setTypicalPrice] = useState(initial?.typicalPrice?.toString() ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          toast.error("名稱必填");
          return;
        }
        if (!initial && !categoryId) {
          toast.error("請先選擇大分類");
          return;
        }
        onSave({
          id: initial?.id,
          categoryId: initial ? undefined : categoryId,
          name: name.trim(),
          typicalCost: typicalCost ? Number(typicalCost) : null,
          typicalPrice: typicalPrice ? Number(typicalPrice) : null,
        });
      }}
      className="space-y-4"
    >
      <div>
        <Label>商品名稱 *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如:紫玉髓手鐲 #38"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>典型成本 (NT$)</Label>
          <Input
            type="number"
            value={typicalCost}
            onChange={(e) => setTypicalCost(e.target.value)}
          />
        </div>
        <div>
          <Label>典型售價 (NT$)</Label>
          <Input
            type="number"
            value={typicalPrice}
            onChange={(e) => setTypicalPrice(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存</Button>
      </div>
    </form>
  );
}
