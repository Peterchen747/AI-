"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemCombobox } from "./item-combobox";
import { CategoryCombobox } from "./category-combobox";
import { uploadImage } from "@/lib/image-upload";
import { formatNTD } from "@/lib/utils";

type Category = { id: number; name: string };
type Item = {
  id: number;
  categoryId: number;
  name: string;
  typicalCost: number | null;
  typicalPrice: number | null;
};

type PurchaseBatchOption = {
  id: number;
  purchaseDate: string;
  remainingQty: number;
  unitCost: number;
};

/** 一張訂單裡的一項商品明細 */
type OrderLine = {
  id: string;
  categoryId: number | null;
  itemId: number | null;
  purchaseBatchId: number | null;
  qty: string;
  cost: string;
  actualPrice: string;
};

type BatchImage = {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  savedOrderNo: string | null;
  saving: boolean;
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyLine(): OrderLine {
  return {
    id: makeId(),
    categoryId: null,
    itemId: null,
    purchaseBatchId: null,
    qty: "1",
    cost: "",
    actualPrice: "",
  };
}

function buildNotes(customerName: string, orderMemo: string) {
  const lines: string[] = [];
  const customer = customerName.trim();
  const memo = orderMemo.trim();
  if (customer) lines.push(`客戶名稱：${customer}`);
  if (memo) lines.push(`備註：${memo}`);
  if (!lines.length) return null;
  return lines.join("\n").slice(0, 500);
}

export function SaleForm({ categories }: { categories: Category[] }) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const initialMode = searchParams.get("tab") === "batch" ? "batch" : "single";
  const [mode, setMode] = useState(initialMode);
  const [categoryList, setCategoryList] = useState<Category[]>(categories);

  // 訂單層級（整張單共用）
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()]);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState("");
  const [orderMemo, setOrderMemo] = useState("");

  const [singleImageUrl, setSingleImageUrl] = useState<string | null>(null);
  const [singleUploading, setSingleUploading] = useState(false);
  const [singleSaving, setSingleSaving] = useState(false);

  const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);

  const imageRef = useRef<BatchImage[]>([]);
  useEffect(() => {
    imageRef.current = batchImages;
  }, [batchImages]);

  useEffect(() => {
    return () => {
      for (const img of imageRef.current) {
        URL.revokeObjectURL(img.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    const nextMode = searchParams.get("tab") === "batch" ? "batch" : "single";
    setMode(nextMode);
  }, [searchParams]);

  function updateLine(lineId: string, patch: Partial<OrderLine>) {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l))
    );
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(lineId: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== lineId)));
  }

  function resetOrder() {
    setLines([emptyLine()]);
    setCustomerName("");
    setOrderMemo("");
  }

  async function onCreateCategory(lineId: string, name: string): Promise<Category | null> {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      toast.error("建立分類失敗");
      return null;
    }
    const created: Category = await res.json();
    setCategoryList((prev) => [...prev, created]);
    updateLine(lineId, { categoryId: created.id, itemId: null, purchaseBatchId: null });
    toast.success(`已建立分類：${created.name}`);
    return created;
  }

  /** 驗證所有明細，回傳可以直接送出的 payload 陣列；有錯誤回 null */
  function validateLines() {
    if (!saleDate) return toast.error("請填寫銷售日期"), null;

    const notes = buildNotes(customerName, orderMemo);
    const payloads = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const label = lines.length > 1 ? `第 ${i + 1} 項商品：` : "";

      if (!line.categoryId) return toast.error(`${label}請選擇大分類`), null;
      if (!line.itemId) return toast.error(`${label}請選擇商品`), null;
      if (!line.cost || !line.actualPrice) {
        return toast.error(`${label}請填寫成本與售價`), null;
      }

      const costNum = Number(line.cost);
      const priceNum = Number(line.actualPrice);
      if (
        !Number.isFinite(costNum) || costNum < 0 ||
        !Number.isFinite(priceNum) || priceNum < 0
      ) {
        return toast.error(`${label}成本與售價必須是非負數`), null;
      }

      payloads.push({
        itemId: line.itemId,
        cost: costNum,
        actualPrice: priceNum,
        qty: Math.max(1, Math.floor(Number(line.qty) || 1)),
        saleDate,
        notes,
        purchaseBatchId: line.purchaseBatchId ?? null,
      });
    }

    return payloads;
  }

  async function onSingleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setSingleUploading(true);
      setSingleImageUrl(await uploadImage(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "圖片上傳失敗");
    } finally {
      setSingleUploading(false);
    }
  }

  async function onSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payloads = validateLines();
    if (!payloads) return;

    setSingleSaving(true);
    // 送陣列 → 後端會產生一個共用的訂單編號，把這些商品串成同一張訂單
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloads.map((p) => ({ ...p, imageUrl: singleImageUrl }))),
    });
    setSingleSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "儲存失敗");
      return;
    }
    toast.success(
      payloads.length > 1 ? `訂單已建立（${payloads.length} 項商品）` : "銷售紀錄已建立"
    );
    router.push("/sales");
    router.refresh();
  }

  function onBatchPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) {
      toast.error("請選擇圖片檔");
      return;
    }

    const next = imageFiles.map((file) => ({
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      savedOrderNo: null,
      saving: false,
    }));

    setBatchImages((prev) => {
      const merged = [...prev, ...next];
      if (!prev.length) setBatchIndex(0);
      return merged;
    });
  }

  function nextPendingIndex(images: BatchImage[], currentIndex: number) {
    for (let i = currentIndex + 1; i < images.length; i += 1) {
      if (!images[i].savedOrderNo) return i;
    }
    for (let i = 0; i < images.length; i += 1) {
      if (!images[i].savedOrderNo) return i;
    }
    return Math.min(currentIndex, Math.max(images.length - 1, 0));
  }

  async function saveCurrentImage() {
    const current = batchImages[batchIndex];
    if (!current) return toast.error("目前沒有圖片"), undefined;
    if (current.savedOrderNo) return toast.error("這張已經儲存過"), undefined;

    const payloads = validateLines();
    if (!payloads) return;

    setBatchImages((prev) =>
      prev.map((img) => (img.id === current.id ? { ...img, saving: true } : img))
    );

    try {
      const imageUrl = current.uploadedUrl ?? (await uploadImage(current.file));
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads.map((p) => ({ ...p, imageUrl }))),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "儲存失敗");
      }

      const created = await res.json();
      const orderNo = Array.isArray(created) ? created[0]?.orderNo ?? null : null;

      setBatchImages((prev) => {
        const updated = prev.map((img) =>
          img.id === current.id
            ? {
                ...img,
                saving: false,
                uploadedUrl: imageUrl,
                savedOrderNo: orderNo ?? "saved",
              }
            : img
        );
        setBatchIndex(nextPendingIndex(updated, batchIndex));
        return updated;
      });

      toast.success(`第 ${batchIndex + 1} 張已儲存（${payloads.length} 項商品）`);
      router.refresh();
    } catch (err) {
      setBatchImages((prev) =>
        prev.map((img) => (img.id === current.id ? { ...img, saving: false } : img))
      );
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  function removeCurrentImage() {
    const current = batchImages[batchIndex];
    if (!current) return;
    URL.revokeObjectURL(current.previewUrl);

    const next = batchImages.filter((img) => img.id !== current.id);
    setBatchImages(next);
    if (!next.length) {
      setBatchIndex(0);
      return;
    }
    setBatchIndex(Math.min(batchIndex, next.length - 1));
  }

  function clearAllBatchImages() {
    for (const img of batchImages) URL.revokeObjectURL(img.previewUrl);
    setBatchImages([]);
    setBatchIndex(0);
  }

  const current = batchImages[batchIndex] ?? null;
  const done = batchImages.filter((img) => img.savedOrderNo).length;

  function onModeChange(nextMode: string) {
    if (nextMode !== "single" && nextMode !== "batch") return;
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextMode);
    router.replace(`/sales/new?${params.toString()}`);
  }

  const orderFields = (
    <OrderFields
      lines={lines}
      categoryList={categoryList}
      onCreateCategory={onCreateCategory}
      updateLine={updateLine}
      addLine={addLine}
      removeLine={removeLine}
      saleDate={saleDate}
      setSaleDate={setSaleDate}
      customerName={customerName}
      setCustomerName={setCustomerName}
      orderMemo={orderMemo}
      setOrderMemo={setOrderMemo}
    />
  );

  return (
    <Tabs value={mode} onValueChange={onModeChange}>
      <TabsList>
        <TabsTrigger value="single">單筆輸入</TabsTrigger>
        <TabsTrigger value="batch">批次看圖輸入</TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="pt-2">
        <form onSubmit={onSingleSubmit} className="space-y-4 max-w-xl">
          {orderFields}

          <div>
            <Label htmlFor="single-image">訂單圖片</Label>
            <Input
              id="single-image"
              type="file"
              accept="image/*"
              onChange={onSingleImageChange}
              disabled={singleUploading}
            />
            {singleUploading && (
              <p className="text-xs text-muted-foreground mt-1">上傳中...</p>
            )}
            {singleImageUrl && (
              <div className="mt-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={singleImageUrl}
                  alt="訂單圖片"
                  className="h-24 w-24 object-cover rounded border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSingleImageUrl(null)}
                >
                  移除
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => router.back()}
            >
              取消
            </Button>
            <Button type="submit" disabled={singleSaving} className="w-full md:w-auto">
              {singleSaving ? "儲存中..." : "儲存訂單"}
            </Button>
          </div>
        </form>
      </TabsContent>

      <TabsContent value="batch" className="pt-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={onBatchPick}
              className="max-w-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={clearAllBatchImages}
              disabled={!batchImages.length}
            >
              清空
            </Button>
            <span className="text-sm text-muted-foreground">
              共 {batchImages.length} 張，已完成 {done} 張
            </span>
          </div>

          {!batchImages.length ? (
            <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
              先選多張圖，再逐張輸入資料並按「儲存目前這張」。一張圖 = 一張訂單，可以放多項不同分類的商品。
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded border p-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    第 {batchIndex + 1} / {batchImages.length} 張
                  </span>
                  <span className="text-muted-foreground">
                    {current?.savedOrderNo ? "已儲存" : "未儲存"}
                  </span>
                </div>

                <div className="min-h-[320px] rounded border bg-muted/30 p-2 flex items-center justify-center">
                  {current && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.previewUrl}
                      alt={current.file.name}
                      className="max-h-[420px] w-full object-contain rounded"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={batchIndex === 0}
                    onClick={() => setBatchIndex((v) => Math.max(v - 1, 0))}
                  >
                    上一張
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={batchIndex >= batchImages.length - 1}
                    onClick={() =>
                      setBatchIndex((v) => Math.min(v + 1, batchImages.length - 1))
                    }
                  >
                    下一張
                  </Button>
                  <Button type="button" variant="outline" onClick={removeCurrentImage}>
                    移除目前
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {batchImages.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      className={`rounded border p-1 ${idx === batchIndex ? "border-primary" : "border-border"}`}
                      onClick={() => setBatchIndex(idx)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.previewUrl}
                        alt={`縮圖${idx + 1}`}
                        className="h-16 w-full object-cover rounded"
                      />
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {img.savedOrderNo ? "已存" : img.saving ? "儲存中" : "未存"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded border p-4 space-y-4">
                {orderFields}

                <div className="flex justify-between gap-2">
                  <Button type="button" variant="outline" onClick={resetOrder}>
                    清空欄位
                  </Button>
                  <Button
                    type="button"
                    onClick={saveCurrentImage}
                    disabled={!current || current.saving}
                  >
                    {current?.saving ? "儲存中..." : "儲存目前這張"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

/** 訂單層級欄位（日期、客戶、備註）＋ 可增減的商品明細 */
function OrderFields(props: {
  lines: OrderLine[];
  categoryList: Category[];
  onCreateCategory: (lineId: string, name: string) => Promise<Category | null>;
  updateLine: (lineId: string, patch: Partial<OrderLine>) => void;
  addLine: () => void;
  removeLine: (lineId: string) => void;
  saleDate: string;
  setSaleDate: (v: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  orderMemo: string;
  setOrderMemo: (v: string) => void;
}) {
  const totals = props.lines.reduce(
    (acc, line) => {
      const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
      const cost = Number(line.cost);
      const price = Number(line.actualPrice);
      if (Number.isFinite(cost)) acc.cost += cost * qty;
      if (Number.isFinite(price)) acc.revenue += price * qty;
      return acc;
    },
    { revenue: 0, cost: 0 }
  );
  const profit = totals.revenue - totals.cost;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">商品明細</Label>
          <span className="text-xs text-muted-foreground">
            共 {props.lines.length} 項，可放不同分類
          </span>
        </div>

        {props.lines.map((line, idx) => (
          <OrderLineFields
            key={line.id}
            line={line}
            index={idx}
            canRemove={props.lines.length > 1}
            categoryList={props.categoryList}
            onCreateCategory={props.onCreateCategory}
            updateLine={props.updateLine}
            removeLine={props.removeLine}
          />
        ))}

        <Button type="button" variant="outline" className="w-full" onClick={props.addLine}>
          + 新增一項商品
        </Button>
      </div>

      {props.lines.length > 1 && (
        <div className="rounded-md border bg-muted/40 p-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">整單營收</div>
            <div className="font-semibold">{formatNTD(totals.revenue)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">整單成本</div>
            <div className="font-semibold">{formatNTD(totals.cost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">整單毛利</div>
            <div className={`font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatNTD(profit)}
            </div>
          </div>
        </div>
      )}

      <div>
        <Label>銷售日期 *</Label>
        <Input
          type="date"
          value={props.saleDate}
          onChange={(e) => props.setSaleDate(e.target.value)}
          className="h-11"
        />
      </div>

      <div>
        <Label>客戶名稱（寫入備註）</Label>
        <Input
          value={props.customerName}
          onChange={(e) => props.setCustomerName(e.target.value)}
          placeholder="例如：王小明（選填）"
          className="h-11"
        />
      </div>

      <div>
        <Label>其他備註</Label>
        <Textarea
          value={props.orderMemo}
          onChange={(e) => props.setOrderMemo(e.target.value)}
          placeholder="例如：客戶要求加強包裝、附贈提袋（選填）"
        />
      </div>
    </>
  );
}

/** 單一商品明細：自己管理該行的商品清單與進貨批次 */
function OrderLineFields({
  line,
  index,
  canRemove,
  categoryList,
  onCreateCategory,
  updateLine,
  removeLine,
}: {
  line: OrderLine;
  index: number;
  canRemove: boolean;
  categoryList: Category[];
  onCreateCategory: (lineId: string, name: string) => Promise<Category | null>;
  updateLine: (lineId: string, patch: Partial<OrderLine>) => void;
  removeLine: (lineId: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [purchaseBatches, setPurchaseBatches] = useState<PurchaseBatchOption[]>([]);

  const categoryId = line.categoryId;
  const itemId = line.itemId;

  // 清空是在下面的事件處理器裡做的（換分類 / 換商品時），
  // effect 只負責抓資料，避免在 effect 內同步 setState
  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    fetch(`/api/items?categoryId=${categoryId}`)
      .then((r) => r.json())
      .then((data: Item[]) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    fetch(`/api/purchase-batches?itemId=${itemId}`)
      .then((r) => r.json())
      .then((data: PurchaseBatchOption[]) => {
        if (!cancelled) {
          setPurchaseBatches(
            Array.isArray(data) ? data.filter((b) => b.remainingQty > 0) : []
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPurchaseBatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  function onSelectCategory(cat: Category) {
    if (cat.id === line.categoryId) return;
    setItems([]);
    setPurchaseBatches([]);
    updateLine(line.id, { categoryId: cat.id, itemId: null, purchaseBatchId: null });
  }

  function onSelectItem(item: Item) {
    if (item.id !== line.itemId) setPurchaseBatches([]);
    updateLine(line.id, {
      itemId: item.id,
      purchaseBatchId: null,
      ...(item.typicalCost != null ? { cost: String(item.typicalCost) } : {}),
      ...(item.typicalPrice != null ? { actualPrice: String(item.typicalPrice) } : {}),
    });
  }

  function onSelectPurchaseBatch(batchId: number | null) {
    if (batchId === null) {
      updateLine(line.id, { purchaseBatchId: null });
      return;
    }
    const batch = purchaseBatches.find((b) => b.id === batchId);
    updateLine(line.id, {
      purchaseBatchId: batchId,
      ...(batch ? { cost: String(batch.unitCost) } : {}),
    });
  }

  async function onCreateItem(name: string): Promise<Item | null> {
    if (!line.categoryId) {
      toast.error("請先選擇大分類");
      return null;
    }
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: line.categoryId,
        name,
        typicalCost: line.cost ? Number(line.cost) : null,
        typicalPrice: line.actualPrice ? Number(line.actualPrice) : null,
      }),
    });
    if (!res.ok) {
      toast.error("建立商品失敗");
      return null;
    }
    const created: Item = await res.json();
    setItems((prev) => [...prev, created]);
    updateLine(line.id, { itemId: created.id, purchaseBatchId: null });
    toast.success(`已建立商品：${created.name}`);
    return created;
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          商品 {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive h-8"
            onClick={() => removeLine(line.id)}
          >
            移除
          </Button>
        )}
      </div>

      <div>
        <Label>大分類 *</Label>
        <CategoryCombobox
          categories={categoryList}
          value={line.categoryId}
          onSelect={onSelectCategory}
          onCreate={(name) => onCreateCategory(line.id, name)}
          placeholder="選擇或新增大分類"
        />
      </div>

      <div>
        <Label>商品名稱 *</Label>
        <ItemCombobox
          items={items}
          value={line.itemId}
          disabled={!line.categoryId}
          onSelect={onSelectItem}
          onCreate={onCreateItem}
        />
      </div>

      <div>
        <Label>進貨批次</Label>
        <Select
          value={line.purchaseBatchId !== null ? String(line.purchaseBatchId) : "none"}
          onValueChange={(v) => onSelectPurchaseBatch(v === "none" ? null : Number(v))}
          disabled={!line.itemId || purchaseBatches.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                purchaseBatches.length === 0 ? "（無可用批次）" : "請選擇進貨批次"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">不指定批次</SelectItem>
            {purchaseBatches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.purchaseDate} - 剩餘 {b.remainingQty} 件 - NT$ {b.unitCost}/件
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>數量 *</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={line.qty}
            onChange={(e) => updateLine(line.id, { qty: e.target.value })}
            placeholder="例如：1"
            className="h-11"
          />
        </div>
        <div>
          <Label>成本/件 (NT$) *</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={line.cost}
            onChange={(e) => updateLine(line.id, { cost: e.target.value })}
            placeholder="例如：150"
            className="h-11"
          />
        </div>
        <div>
          <Label>售價/件 (NT$) *</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={line.actualPrice}
            onChange={(e) => updateLine(line.id, { actualPrice: e.target.value })}
            placeholder="例如：320"
            className="h-11"
          />
        </div>
      </div>
    </div>
  );
}
