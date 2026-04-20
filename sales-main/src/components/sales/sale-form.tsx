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

type BatchImage = {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  savedSaleId: number | null;
  saving: boolean;
};

function makeImageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  const [categoryId, setCategoryId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState<number | null>(null);
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [actualPrice, setActualPrice] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState("");
  const [orderMemo, setOrderMemo] = useState("");

  const [purchaseBatches, setPurchaseBatches] = useState<PurchaseBatchOption[]>([]);
  const [purchaseBatchId, setPurchaseBatchId] = useState<number | null>(null);

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

  useEffect(() => {
    if (!itemId) {
      setPurchaseBatches([]);
      setPurchaseBatchId(null);
      return;
    }
    fetch(`/api/purchase-batches?itemId=${itemId}`)
      .then((r) => r.json())
      .then((data: PurchaseBatchOption[]) =>
        setPurchaseBatches(data.filter((b) => b.remainingQty > 0))
      )
      .catch(() => setPurchaseBatches([]));
    setPurchaseBatchId(null);
  }, [itemId]);

  function onSelectItem(item: Item) {
    setItemId(item.id);
    if (item.typicalCost != null) setCost(String(item.typicalCost));
    if (item.typicalPrice != null) setActualPrice(String(item.typicalPrice));
  }

  function onSelectPurchaseBatch(batchId: number | null) {
    setPurchaseBatchId(batchId);
    if (batchId === null) return;
    const batch = purchaseBatches.find((b) => b.id === batchId);
    if (batch) setCost(String(batch.unitCost));
  }

  async function onCreateCategory(name: string): Promise<Category | null> {
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
    setCategoryId(String(created.id));
    setItems([]);
    setItemId(null);
    toast.success(`已建立分類：${created.name}`);
    return created;
  }

  async function onCreateItem(name: string): Promise<Item | null> {
    if (!categoryId) {
      toast.error("請先選擇大分類");
      return null;
    }
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: Number(categoryId),
        name,
        typicalCost: cost ? Number(cost) : null,
        typicalPrice: actualPrice ? Number(actualPrice) : null,
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

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || "圖片上傳失敗");
    }
    const data = await res.json();
    return String(data.url);
  }

  function validatePayload() {
    if (!categoryId) return toast.error("請選擇大分類"), null;
    if (!itemId) return toast.error("請選擇商品"), null;
    if (!cost || !actualPrice || !saleDate) return toast.error("請填寫成本、實際銷售金額、日期"), null;

    const costNum = Number(cost);
    const priceNum = Number(actualPrice);
    const qtyNum = Math.max(1, Math.floor(Number(qty) || 1));
    if (!Number.isFinite(costNum) || costNum < 0 || !Number.isFinite(priceNum) || priceNum < 0) {
      return toast.error("成本與實際銷售金額必須是非負數"), null;
    }

    return {
      itemId,
      cost: costNum,
      actualPrice: priceNum,
      qty: qtyNum,
      saleDate,
      notes: buildNotes(customerName, orderMemo),
      purchaseBatchId: purchaseBatchId ?? null,
    };
  }

  async function onSingleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setSingleUploading(true);
      const url = await uploadFile(file);
      setSingleImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "圖片上傳失敗");
    } finally {
      setSingleUploading(false);
    }
  }

  async function onSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = validatePayload();
    if (!payload) return;

    setSingleSaving(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, imageUrl: singleImageUrl }),
    });
    setSingleSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "儲存失敗");
      return;
    }
    toast.success("銷售紀錄已建立");
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
      id: makeImageId(),
      file,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      savedSaleId: null,
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
      if (!images[i].savedSaleId) return i;
    }
    for (let i = 0; i < images.length; i += 1) {
      if (!images[i].savedSaleId) return i;
    }
    return Math.min(currentIndex, Math.max(images.length - 1, 0));
  }

  async function saveCurrentImage() {
    const current = batchImages[batchIndex];
    if (!current) return toast.error("目前沒有圖片"), undefined;
    if (current.savedSaleId) return toast.error("這張已經儲存過"), undefined;

    const payload = validatePayload();
    if (!payload) return;

    setBatchImages((prev) => prev.map((img) => (img.id === current.id ? { ...img, saving: true } : img)));

    try {
      const imageUrl = current.uploadedUrl ?? (await uploadFile(current.file));
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, imageUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "儲存失敗");
      }

      const created = await res.json();
      const id = Array.isArray(created) ? Number(created[0]?.id ?? -1) : Number(created?.id ?? -1);

      setBatchImages((prev) => {
        const updated = prev.map((img) =>
          img.id === current.id
            ? { ...img, saving: false, uploadedUrl: imageUrl, savedSaleId: Number.isFinite(id) ? id : -1 }
            : img
        );
        setBatchIndex(nextPendingIndex(updated, batchIndex));
        return updated;
      });

      toast.success(`第 ${batchIndex + 1} 張已儲存`);
      router.refresh();
    } catch (err) {
      setBatchImages((prev) => prev.map((img) => (img.id === current.id ? { ...img, saving: false } : img)));
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
  const done = batchImages.filter((img) => img.savedSaleId).length;

  function onModeChange(nextMode: string) {
    if (nextMode !== "single" && nextMode !== "batch") return;
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextMode);
    router.replace(`/sales/new?${params.toString()}`);
  }

  return (
    <Tabs value={mode} onValueChange={onModeChange}>
      <TabsList>
        <TabsTrigger value="single">單筆輸入</TabsTrigger>
        <TabsTrigger value="batch">批次看圖輸入</TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="pt-2">
        <form onSubmit={onSingleSubmit} className="space-y-4 max-w-xl">
          <CommonFields
            categoryList={categoryList}
            categoryId={categoryId}
            onSelectCategory={(cat) => setCategoryId(String(cat.id))}
            onCreateCategory={onCreateCategory}
            items={items}
            itemId={itemId}
            onSelectItem={onSelectItem}
            onCreateItem={onCreateItem}
            purchaseBatches={purchaseBatches}
            purchaseBatchId={purchaseBatchId}
            onSelectPurchaseBatch={onSelectPurchaseBatch}
            qty={qty}
            setQty={setQty}
            cost={cost}
            setCost={setCost}
            actualPrice={actualPrice}
            setActualPrice={setActualPrice}
            saleDate={saleDate}
            setSaleDate={setSaleDate}
            customerName={customerName}
            setCustomerName={setCustomerName}
            orderMemo={orderMemo}
            setOrderMemo={setOrderMemo}
          />

          <div>
            <Label htmlFor="single-image">訂單圖片</Label>
            <Input id="single-image" type="file" accept="image/*" onChange={onSingleImageChange} disabled={singleUploading} />
            {singleImageUrl && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={singleImageUrl} alt="訂單圖片" className="h-24 w-24 object-cover rounded border" />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button type="button" variant="outline" className="w-full md:w-auto" onClick={() => router.back()}>取消</Button>
            <Button type="submit" disabled={singleSaving} className="w-full md:w-auto">{singleSaving ? "儲存中..." : "儲存銷售紀錄"}</Button>
          </div>
        </form>
      </TabsContent>

      <TabsContent value="batch" className="pt-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" multiple onChange={onBatchPick} className="max-w-sm" />
            <Button type="button" variant="outline" onClick={clearAllBatchImages} disabled={!batchImages.length}>清空</Button>
            <span className="text-sm text-muted-foreground">共 {batchImages.length} 張，已完成 {done} 張</span>
          </div>

          {!batchImages.length ? (
            <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">先選多張圖，再逐張輸入資料並按「儲存目前這張」。</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded border p-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>第 {batchIndex + 1} / {batchImages.length} 張</span>
                  <span className="text-muted-foreground">{current?.savedSaleId ? "已儲存" : "未儲存"}</span>
                </div>

                <div className="min-h-[320px] rounded border bg-muted/30 p-2 flex items-center justify-center">
                  {current && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.previewUrl} alt={current.file.name} className="max-h-[420px] w-full object-contain rounded" />
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={batchIndex === 0} onClick={() => setBatchIndex((v) => Math.max(v - 1, 0))}>上一張</Button>
                  <Button type="button" variant="outline" disabled={batchIndex >= batchImages.length - 1} onClick={() => setBatchIndex((v) => Math.min(v + 1, batchImages.length - 1))}>下一張</Button>
                  <Button type="button" variant="outline" onClick={removeCurrentImage}>移除目前</Button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {batchImages.map((img, idx) => (
                    <button key={img.id} type="button" className={`rounded border p-1 ${idx === batchIndex ? "border-primary" : "border-border"}`} onClick={() => setBatchIndex(idx)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt={`縮圖${idx + 1}`} className="h-16 w-full object-cover rounded" />
                      <div className="text-[10px] text-muted-foreground mt-1">{img.savedSaleId ? "已存" : img.saving ? "儲存中" : "未存"}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded border p-4 space-y-4">
                <CommonFields
                  categoryList={categoryList}
                  categoryId={categoryId}
                  onSelectCategory={(cat) => setCategoryId(String(cat.id))}
                  onCreateCategory={onCreateCategory}
                  items={items}
                  itemId={itemId}
                  onSelectItem={onSelectItem}
                  onCreateItem={onCreateItem}
                  purchaseBatches={purchaseBatches}
                  purchaseBatchId={purchaseBatchId}
                  onSelectPurchaseBatch={onSelectPurchaseBatch}
                  qty={qty}
                  setQty={setQty}
                  cost={cost}
                  setCost={setCost}
                  actualPrice={actualPrice}
                  setActualPrice={setActualPrice}
                  saleDate={saleDate}
                  setSaleDate={setSaleDate}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  orderMemo={orderMemo}
                  setOrderMemo={setOrderMemo}
                />

                <div className="flex justify-end">
                  <Button type="button" onClick={saveCurrentImage} disabled={!current || current.saving}>
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

function CommonFields(props: {
  categoryList: Category[];
  categoryId: string;
  onSelectCategory: (cat: Category) => void;
  onCreateCategory: (name: string) => Promise<Category | null>;
  items: Item[];
  itemId: number | null;
  onSelectItem: (item: Item) => void;
  onCreateItem: (name: string) => Promise<Item | null>;
  purchaseBatches: PurchaseBatchOption[];
  purchaseBatchId: number | null;
  onSelectPurchaseBatch: (id: number | null) => void;
  qty: string;
  setQty: (v: string) => void;
  cost: string;
  setCost: (v: string) => void;
  actualPrice: string;
  setActualPrice: (v: string) => void;
  saleDate: string;
  setSaleDate: (v: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  orderMemo: string;
  setOrderMemo: (v: string) => void;
}) {
  return (
    <>
      <div>
        <Label>大分類 *</Label>
        <CategoryCombobox
          categories={props.categoryList}
          value={props.categoryId ? Number(props.categoryId) : null}
          onSelect={props.onSelectCategory}
          onCreate={props.onCreateCategory}
          placeholder="選擇或新增大分類"
        />
      </div>

      <div>
        <Label>商品名稱 *</Label>
        <ItemCombobox
          items={props.items}
          value={props.itemId}
          disabled={!props.categoryId}
          onSelect={props.onSelectItem}
          onCreate={props.onCreateItem}
        />
      </div>

      <div>
        <Label>進貨批次</Label>
        <Select
          value={props.purchaseBatchId !== null ? String(props.purchaseBatchId) : "none"}
          onValueChange={(v) => props.onSelectPurchaseBatch(v === "none" ? null : Number(v))}
          disabled={!props.itemId || props.purchaseBatches.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={props.purchaseBatches.length === 0 ? "（無可用批次）" : "請選擇進貨批次"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">不指定批次</SelectItem>
            {props.purchaseBatches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.purchaseDate} - 剩餘 {b.remainingQty} 件 - NT$ {b.unitCost}/件
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>數量 *</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={props.qty}
            onChange={(e) => props.setQty(e.target.value)}
            placeholder="例如：1"
            className="h-11"
          />
        </div>
        <div>
          <Label>成本/件 (NT$) *</Label>
          <Input type="number" inputMode="numeric" value={props.cost} onChange={(e) => props.setCost(e.target.value)} placeholder="例如：150" className="h-11" />
        </div>
        <div>
          <Label>售價/件 (NT$) *</Label>
          <Input type="number" inputMode="numeric" value={props.actualPrice} onChange={(e) => props.setActualPrice(e.target.value)} placeholder="例如：320" className="h-11" />
        </div>
      </div>

      <div>
        <Label>銷售日期 *</Label>
        <Input type="date" value={props.saleDate} onChange={(e) => props.setSaleDate(e.target.value)} className="h-11" />
      </div>

      <div>
        <Label>客戶名稱（寫入備註）</Label>
        <Input value={props.customerName} onChange={(e) => props.setCustomerName(e.target.value)} placeholder="例如：王小明（選填）" className="h-11" />
      </div>

      <div>
        <Label>其他備註</Label>
        <Textarea value={props.orderMemo} onChange={(e) => props.setOrderMemo(e.target.value)} placeholder="例如：客戶要求加強包裝、附贈提袋（選填）" />
      </div>
    </>
  );
}
