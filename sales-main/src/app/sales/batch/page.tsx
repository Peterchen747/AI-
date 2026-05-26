"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Item = {
  id: number;
  name: string;
  categoryName: string | null;
  typicalCost: number | null;
  typicalPrice: number | null;
};

type CartEntry = {
  item: Item;
  qty: number;
  price: number;
  cost: number;
};

type Phase = "product" | "qty" | "price";

function fmt(n: number) {
  return n.toLocaleString("zh-TW");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function BatchSalesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [phase, setPhase] = useState<Phase>("product");
  const [current, setCurrent] = useState<CartEntry | null>(null);
  const [numStr, setNumStr] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data: Item[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const selectProduct = (item: Item) => {
    setCurrent({
      item,
      qty: 1,
      price: item.typicalPrice ?? 0,
      cost: item.typicalCost ?? 0,
    });
    setNumStr("1");
    setPhase("qty");
  };

  const numPress = useCallback(
    (key: string) => {
      if (key === "⌫") {
        setNumStr((s) => (s.length > 1 ? s.slice(0, -1) : "0"));
        return;
      }
      if (key === "00") {
        setNumStr((s) => (s === "0" ? "0" : s + "00"));
        return;
      }
      if (key === ".") {
        setNumStr((s) => (s.includes(".") ? s : s + "."));
        return;
      }
      setNumStr((s) => {
        if (s === "0" && key !== ".") return key;
        if (s.length >= 8) return s;
        return s + key;
      });
    },
    []
  );

  const numVal = parseFloat(numStr) || 0;

  const goNextStep = () => {
    if (!current) return;
    if (phase === "qty") {
      setCurrent((c) => c ? { ...c, qty: Math.max(1, Math.floor(numVal)) } : c);
      setNumStr(String(current.price || 0));
      setPhase("price");
    } else if (phase === "price") {
      addToCart();
    }
  };

  const addToCart = () => {
    if (!current) return;
    const finalQty = phase === "qty" ? Math.max(1, Math.floor(numVal)) : current.qty;
    const finalPrice = phase === "price" ? numVal : current.price;
    const entry: CartEntry = { ...current, qty: finalQty, price: finalPrice };
    setCart((c) => {
      const idx = c.findIndex((e) => e.item.id === entry.item.id && e.price === entry.price);
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + entry.qty };
        return next;
      }
      return [...c, entry];
    });
    setCurrent(null);
    setNumStr("1");
    setPhase("product");
  };

  const removeFromCart = (idx: number) => {
    setCart((c) => c.filter((_, i) => i !== idx));
  };

  const totalRevenue = cart.reduce((s, e) => s + e.qty * e.price, 0);
  const totalProfit = cart.reduce((s, e) => s + e.qty * (e.price - e.cost), 0);

  const saveAll = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const payload = cart.map((e) => ({
        itemId: e.item.id,
        cost: e.cost,
        actualPrice: e.price,
        qty: e.qty,
        saleDate: today(),
      }));
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "儲存失敗" }));
        throw new Error(err.error ?? "儲存失敗");
      }
      toast.success(`已新增 ${cart.length} 筆銷售紀錄`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const numpadKeys = ["1","2","3","⌫","4","5","6","→","7","8","9","✓",".","0","00"];

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-64px)] md:max-w-lg md:mx-auto md:h-auto">
      {/* 標題 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0"
          aria-label="返回"
        >
          ‹
        </button>
        <div>
          <span className="font-bold text-base">批次輸入</span>
          {cart.length > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">{cart.length} 項待儲存</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="ml-auto text-sm text-muted-foreground"
        >
          取消
        </button>
      </div>

      {/* 已加入清單 */}
      {cart.length > 0 && (
        <div
          className="mb-2 rounded-xl border bg-card overflow-y-auto"
          style={{ maxHeight: 170 }}
        >
          {cart.map((e, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2.5 border-b last:border-0 text-sm"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{e.item.name}</span>
                <span className="text-xs text-muted-foreground">
                  ×{e.qty} · NT${fmt(e.price)}/件
                </span>
              </div>
              <span className="text-emerald-600 font-medium font-mono text-sm shrink-0">
                +{fmt(e.qty * (e.price - e.cost))}
              </span>
              <button
                type="button"
                onClick={() => removeFromCart(i)}
                className="text-muted-foreground text-lg leading-none ml-1"
                aria-label="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 總計列 */}
      {cart.length > 0 && (
        <div className="flex items-center gap-3 bg-foreground text-background rounded-xl px-4 py-3 mb-3">
          <div className="flex-1">
            <div className="text-xs opacity-60">累計</div>
            <div className="font-mono font-semibold text-base">NT$ {fmt(totalRevenue)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-60">預估利潤</div>
            <div className="font-mono text-sm text-emerald-400">+{fmt(totalProfit)}</div>
          </div>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="bg-white text-foreground font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-50 shrink-0"
          >
            {saving ? "儲存中…" : "儲存全部"}
          </button>
        </div>
      )}

      {/* 下半部：商品選擇 或 數字鍵盤 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {phase === "product" ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">選擇商品</p>
            <div
              className="grid grid-cols-2 gap-2 overflow-y-auto flex-1"
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectProduct(item)}
                  className="flex flex-col items-start px-3 py-3 rounded-xl border bg-card text-left hover:bg-muted active:bg-muted/70 transition-colors"
                >
                  <span className="text-sm font-semibold leading-tight">{item.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {item.categoryName ?? "—"}
                  </span>
                  {item.typicalPrice != null && (
                    <span className="text-xs font-mono text-emerald-600 mt-1">
                      NT${item.typicalPrice}
                    </span>
                  )}
                </button>
              ))}
              {items.length === 0 && (
                <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
                  尚無商品，請先至商品分類新增
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1">
            {/* 階段提示 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="font-medium text-sm truncate max-w-[140px]">
                {current?.item.name}
              </span>
              <div className="flex gap-1 ml-auto">
                {(["qty", "price"] as Phase[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      if (p === "qty") setNumStr(String(current?.qty ?? 1));
                      if (p === "price") setNumStr(String(current?.price ?? 0));
                      setPhase(p);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      phase === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    {p === "qty" ? "數量" : "售價"}
                  </button>
                ))}
              </div>
            </div>

            {/* 數字顯示 */}
            <div className="text-right font-mono text-3xl font-semibold px-2 py-2 bg-muted/40 rounded-xl mb-3 tracking-tight">
              {phase === "price" && <span className="text-base text-muted-foreground mr-1">NT$</span>}
              {numStr}
            </div>

            {/* 即時利潤預覽 */}
            {phase === "price" && current && (
              <div className="bg-primary/10 rounded-xl px-3 py-2 mb-3 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">預估利潤（×{current.qty}）</span>
                <span className="font-mono font-semibold text-emerald-700">
                  +NT${fmt(current.qty * (numVal - current.cost))}
                </span>
              </div>
            )}

            {/* 數字鍵盤 4×4 */}
            <div className="grid grid-cols-4 gap-1.5 flex-1">
              {numpadKeys.map((key, i) => {
                const isAction = key === "→" || key === "✓";
                const isAddBtn = false;
                const label =
                  key === "→" ? (phase === "qty" ? "下一步" : "確認") : key === "✓" ? "加入" : key;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (key === "→" || key === "✓") {
                        goNextStep();
                      } else {
                        numPress(key);
                      }
                    }}
                    className={`h-12 rounded-xl font-mono text-base font-semibold transition-colors active:scale-95 ${
                      isAction
                        ? "bg-primary text-primary-foreground"
                        : key === "⌫"
                        ? "bg-muted text-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              {/* 加入清單按鈕佔 2 格 */}
              <button
                type="button"
                onClick={addToCart}
                className="col-span-4 h-12 rounded-xl bg-emerald-600 text-white font-semibold text-sm transition-colors active:bg-emerald-700"
              >
                ＋ 加入清單
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
