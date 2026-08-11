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
import { uploadImage } from "@/lib/image-upload";

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
  orderNo: string | null;
  categoryName: string | null;
};

type OrderGroup = {
  key: string;
  orderNo: string | null;
  lines: Sale[];
};

/** 把銷售列依訂單編號合併；orderNo 為 NULL 的舊資料各自成一張單 */
function groupByOrder(sales: Sale[]): OrderGroup[] {
  const groups: OrderGroup[] = [];
  const byKey = new Map<string, OrderGroup>();

  for (const s of sales) {
    const key = s.orderNo ? `order-${s.orderNo}` : `solo-${s.id}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, orderNo: s.orderNo, lines: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.lines.push(s);
  }

  return groups;
}

function orderTotals(lines: Sale[]) {
  return lines.reduce(
    (acc, s) => {
      const qty = s.qty ?? 1;
      acc.revenue += s.actualPrice * qty;
      acc.cost += s.cost * qty;
      acc.qty += qty;
      return acc;
    },
    { revenue: 0, cost: 0, qty: 0 }
  );
}

/** notes 的格式是「客戶名稱：X\n備註：Y」，取出客戶名稱 */
function customerFrom(notes: string | null) {
  if (!notes) return null;
  const line = notes.split("\n").find((l) => l.startsWith("客戶名稱："));
  return line ? line.replace("客戶名稱：", "").trim() || null : null;
}

export function SalesTable({
  sales,
  categoryFiltered = false,
}: {
  sales: Sale[];
  categoryFiltered?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Sale | null>(null);
  const [cost, setCost] = useState("");
  const [actualPrice, setActualPrice] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const orders = groupByOrder(sales);

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
    e.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      setImageUrl(await uploadImage(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("確定刪除此筆銷售紀錄？")) return;
    const res = await fetch(`/api/sales?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已刪除");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "刪除失敗");
    }
  }

  async function removeOrder(orderNo: string, count: number) {
    if (!confirm(`確定刪除整張訂單？共 ${count} 項商品會一起刪除。`)) return;
    const res = await fetch(`/api/sales?orderNo=${encodeURIComponent(orderNo)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("整張訂單已刪除");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "刪除失敗");
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
      {categoryFiltered && (
        <p className="text-xs text-muted-foreground">
          已套用分類篩選，多商品訂單只會顯示符合該分類的項目。
        </p>
      )}

      {/* 手機卡片列表 — 一張卡 = 一張訂單 */}
      <div className="md:hidden space-y-3">
        {orders.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            沒有符合條件的銷售紀錄
          </div>
        )}
        {orders.map((order) => {
          const head = order.lines[0];
          const totals = orderTotals(order.lines);
          const profit = totals.revenue - totals.cost;
          const margin = totals.revenue > 0 ? (profit / totals.revenue) * 100 : 0;
          const customer = customerFrom(head.notes);
          const multi = order.lines.length > 1;

          return (
            <div key={order.key} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                {head.imageUrl ? (
                  <a href={head.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={head.imageUrl}
                      alt=""
                      className="h-12 w-12 object-cover rounded-lg border"
                    />
                  </a>
                ) : null}
                <div className="flex-1 min-w-0">
                  {multi ? (
                    <p className="font-medium truncate">
                      訂單（{order.lines.length} 項商品）
                    </p>
                  ) : (
                    <p className="font-medium truncate">
                      {head.itemDisplayName || "—"}
                      {head.itemActive === 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">(已封存)</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    {multi ? customer || "—" : head.categoryName || "—"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {head.saleDate}
                </span>
              </div>

              {multi && (
                <div className="divide-y rounded-md border">
                  {order.lines.map((s) => (
                    <div key={s.id} className="p-2 flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate">
                          {s.itemDisplayName || "—"}
                          {s.itemActive === 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">(已封存)</span>
                          )}
                          <span className="text-muted-foreground"> ×{s.qty ?? 1}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.categoryName || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {formatNTD(s.actualPrice * (s.qty ?? 1))}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => openEdit(s)}
                        >
                          編輯
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => remove(s.id)}
                        >
                          刪除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {multi ? "整單營收" : "售價"}
                  </p>
                  <p className="font-semibold">
                    {formatNTD(multi ? totals.revenue : head.actualPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">總毛利</p>
                  <p className={`font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {profit >= 0 ? "+" : ""}
                    {formatNTD(profit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">毛利率</p>
                  <p>{margin.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">數量</p>
                  <p>×{totals.qty}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {multi ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-10"
                    onClick={() => order.orderNo && removeOrder(order.orderNo, order.lines.length)}
                  >
                    刪除整張訂單
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10"
                      onClick={() => openEdit(head)}
                    >
                      編輯
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10"
                      onClick={() => remove(head.id)}
                    >
                      刪除
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 桌機表格 */}
      <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
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
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  沒有符合條件的銷售紀錄
                </TableCell>
              </TableRow>
            )}
            {orders.flatMap((order) => {
              const multi = order.lines.length > 1;
              const head = order.lines[0];
              const totals = orderTotals(order.lines);
              const orderProfit = totals.revenue - totals.cost;
              const customer = customerFrom(head.notes);

              const itemRows = order.lines.map((s) => {
                const qty = s.qty ?? 1;
                const profit = (s.actualPrice - s.cost) * qty;
                return (
                  <TableRow key={s.id} className={multi ? "bg-muted/20" : undefined}>
                    <TableCell>{multi ? "" : s.saleDate}</TableCell>
                    <TableCell>
                      {!multi && s.imageUrl ? (
                        <a href={s.imageUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.imageUrl}
                            alt=""
                            className="h-10 w-10 object-cover rounded border"
                          />
                        </a>
                      ) : (
                        !multi && <span className="text-muted-foreground">—</span>
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
                    <TableCell
                      className={`text-right font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
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
              });

              if (!multi) return itemRows;

              return [
                <TableRow key={`${order.key}-head`} className="border-t-2">
                  <TableCell>{head.saleDate}</TableCell>
                  <TableCell>
                    {head.imageUrl ? (
                      <a href={head.imageUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={head.imageUrl}
                          alt=""
                          className="h-10 w-10 object-cover rounded border"
                        />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell colSpan={2} className="font-medium">
                    訂單（{order.lines.length} 項商品）
                    {customer && (
                      <span className="ml-2 text-xs text-muted-foreground">{customer}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{totals.qty}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatNTD(totals.cost)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatNTD(totals.revenue)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${orderProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatNTD(orderProfit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        order.orderNo && removeOrder(order.orderNo, order.lines.length)
                      }
                    >
                      刪除整張
                    </Button>
                  </TableCell>
                </TableRow>,
                ...itemRows,
              ];
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
                      <img
                        src={imageUrl}
                        alt="預覽"
                        className="h-24 w-24 object-cover rounded border"
                      />
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setImageUrl(null)}
                    >
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
