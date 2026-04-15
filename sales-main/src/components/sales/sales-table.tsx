"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatNTD } from "@/lib/utils";

type Sale = {
  id: number;
  categoryId: number | null;
  itemId: number | null;
  itemDisplayName: string | null;
  itemActive?: number;
  cost: number;
  actualPrice: number;
  qty: number;
  saleDate: string;
  source: string;
  notes: string | null;
  imageUrl: string | null;
  categoryName: string | null;
};

export function SalesTable({ sales }: { sales: Sale[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Sale | null>(null);
  const [cost, setCost] = useState("");
  const [actualPrice, setActualPrice] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function openEdit(s: Sale) {
    setEditing(s);
    setCost(String(s.cost));
    setActualPrice(String(s.actualPrice));
    setSaleDate(s.saleDate);
    setNotes(s.notes ?? "");
    setImageUrl(s.imageUrl ?? null);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    e.target.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "圖片上傳失敗");
      return;
    }
    const data = await res.json();
    setImageUrl(data.url);
  }

  async function remove(id: number) {
    if (!confirm("確定刪除此筆銷售紀錄？")) return;
    const res = await fetch(`/api/sales?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已刪除");
      router.refresh();
    }
  }

  async function handleSave() {
    if (!editing) return;
    if (!cost || !actualPrice || !saleDate) {
      toast.error("成本、售價、日期必填");
      return;
    }
    const costNum = Number(cost);
    const priceNum = Number(actualPrice);
    if (!Number.isFinite(costNum) || costNum < 0 || !Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("成本、售價必須是非負數字");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/sales?id=${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cost: costNum,
        actualPrice: priceNum,
        saleDate,
        notes: notes.trim() || null,
        imageUrl,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("已更新");
      setEditing(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "儲存失敗");
    }
  }

  const previewProfit = (() => {
    const c = Number(cost);
    const p = Number(actualPrice);
    if (!cost || !actualPrice || !Number.isFinite(c) || !Number.isFinite(p)) return null;
    return p - c;
  })();

  return (
    <>
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>圖片</TableHead>
              <TableHead>分類</TableHead>
              <TableHead>品名</TableHead>
              <TableHead className="text-right">數量</TableHead>
              <TableHead className="text-right">成本/件</TableHead>
              <TableHead className="text-right">售價/件</TableHead>
              <TableHead className="text-right">總利潤</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  沒有符合條件的銷售紀錄
                </TableCell>
              </TableRow>
            )}
            {sales.map((s) => {
              const qty = s.qty ?? 1;
              const profit = (s.actualPrice - s.cost) * qty;
              return (
                <TableRow key={s.id}>
                  <TableCell>{s.saleDate}</TableCell>
                  <TableCell>
                    {s.imageUrl ? (
                      <a href={s.imageUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.imageUrl} alt="" className="h-10 w-10 object-cover rounded border" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{s.categoryName || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {s.itemDisplayName || "—"}
                    {s.itemActive === 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">(已封存)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{qty}</TableCell>
                  <TableCell className="text-right">{formatNTD(s.cost)}</TableCell>
                  <TableCell className="text-right">{formatNTD(s.actualPrice)}</TableCell>
                  <TableCell className={`text-right font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatNTD(profit)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                      編輯
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(s.id)}>
                      刪除
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯銷售紀錄</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {editing.categoryName || "—"} / {editing.itemDisplayName || "—"}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-cost">實際成本 (NT$) *</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-price">實際售價 (NT$) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={actualPrice}
                    onChange={(e) => setActualPrice(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-date">銷售日期 *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">備註</Label>
                <Textarea
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-image">對照圖片</Label>
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploading}
                />
                {uploading && <p className="text-xs text-muted-foreground mt-1">上傳中...</p>}
                {imageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <a href={imageUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="預覽" className="h-24 w-24 object-cover rounded border" />
                    </a>
                    <Button type="button" variant="outline" size="sm" onClick={() => setImageUrl(null)}>
                      移除
                    </Button>
                  </div>
                )}
              </div>
              {previewProfit !== null && (
                <div className="p-3 rounded-md bg-muted text-sm">
                  預計利潤:
                  <span className="font-bold ml-2">
                    NT$ {previewProfit.toLocaleString("zh-TW")}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
