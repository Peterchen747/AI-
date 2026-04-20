"use client";

import { useState, useEffect } from "react";
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

function recentMonthLabels(n: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    labels.push(`${y}-${m}`);
  }
  return labels;
}

function formatMonthLabel(label: string): string {
  const [y, m] = label.split("-");
  return `${y}年${m}月`;
}

type InitialData = {
  weekLabel: string;
  adCost: number;
  shippingCost: number;
  packagingCost: number;
  otherCost: number;
  notes: string | null;
};

type Props = {
  onSuccess?: () => void;
  initialData?: InitialData;
  onClearEdit?: () => void;
};

export function WeeklyCostForm({ onSuccess, initialData, onClearEdit }: Props) {
  const recentMonths = recentMonthLabels(6);
  const months = initialData && !recentMonths.includes(initialData.weekLabel) && /^\d{4}-\d{2}$/.test(initialData.weekLabel)
    ? [initialData.weekLabel, ...recentMonths]
    : recentMonths;

  const [monthLabel, setMonthLabel] = useState(months[0]);
  const [adCost, setAdCost] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [packagingCost, setPackagingCost] = useState("0");
  const [otherCost, setOtherCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    setMonthLabel(initialData.weekLabel);
    setAdCost(String(initialData.adCost));
    setShippingCost(String(initialData.shippingCost));
    setPackagingCost(String(initialData.packagingCost));
    setOtherCost(String(initialData.otherCost));
    setNotes(initialData.notes ?? "");
  }, [initialData]);

  const total =
    (Number(adCost) || 0) +
    (Number(shippingCost) || 0) +
    (Number(packagingCost) || 0) +
    (Number(otherCost) || 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const adCostNum = Number(adCost) || 0;
    const shippingCostNum = Number(shippingCost) || 0;
    const packagingCostNum = Number(packagingCost) || 0;
    const otherCostNum = Number(otherCost) || 0;

    if (
      adCostNum < 0 || shippingCostNum < 0 ||
      packagingCostNum < 0 || otherCostNum < 0
    ) {
      toast.error("費用不能為負數");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/weekly-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekLabel: monthLabel,
          adCost: adCostNum,
          shippingCost: shippingCostNum,
          packagingCost: packagingCostNum,
          otherCost: otherCostNum,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "儲存失敗");
        return;
      }

      toast.success(`${formatMonthLabel(monthLabel)} 成本已儲存`);
      setMonthLabel(months[0]);
      setAdCost("0");
      setShippingCost("0");
      setPackagingCost("0");
      setOtherCost("0");
      setNotes("");
      onClearEdit?.();
      onSuccess?.();
    } catch {
      toast.error("網路錯誤，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div>
        <Label>月份</Label>
        <Select value={monthLabel} onValueChange={(v) => v && setMonthLabel(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={m} value={m}>
                {formatMonthLabel(m)}
                {i === 0 ? "（本月）" : i === 1 ? "（上個月）" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>廣告費 (NT$)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={adCost}
            onChange={(e) => setAdCost(e.target.value)}
            placeholder="例如：1500（LINE/IG 廣告投放）"
            className="h-11"
          />
        </div>
        <div>
          <Label>運費 (NT$)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            placeholder="例如：300（超商/黑貓寄送費用）"
            className="h-11"
          />
        </div>
        <div>
          <Label>包材費 (NT$)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={packagingCost}
            onChange={(e) => setPackagingCost(e.target.value)}
            placeholder="例如：200（紙盒、緞帶、防撞泡棉）"
            className="h-11"
          />
        </div>
        <div>
          <Label>其他費用 (NT$)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={otherCost}
            onChange={(e) => setOtherCost(e.target.value)}
            placeholder="例如：100（平台手續費、其他雜支）"
            className="h-11"
          />
        </div>
      </div>

      <div>
        <Label>備註（選填）</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="例如：本月雙11活動加碼廣告"
          rows={2}
        />
      </div>

      <div className="rounded-md bg-muted px-4 py-2 text-sm font-medium">
        本月合計：NT$ {total.toLocaleString()}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={saving} className="w-full md:w-auto">
          {saving ? "儲存中..." : initialData ? "更新成本" : "儲存成本"}
        </Button>
        {initialData && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMonthLabel(months[0]);
              setAdCost("0");
              setShippingCost("0");
              setPackagingCost("0");
              setOtherCost("0");
              setNotes("");
              onClearEdit?.();
            }}
          >
            取消編輯
          </Button>
        )}
      </div>
    </form>
  );
}
