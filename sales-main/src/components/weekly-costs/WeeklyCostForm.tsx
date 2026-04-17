"use client";

import { useState } from "react";
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
import { formatWeekRange } from "@/lib/week-utils";

/** 計算某日期的 ISO 週標籤，格式 YYYY-WNN */
function getISOWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** 產生最近 n 週的 weekLabel 列表，從本週往前 */
function recentWeekLabels(n: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    labels.push(getISOWeekLabel(d));
  }
  return labels;
}

type Props = {
  onSuccess?: () => void;
};

export function WeeklyCostForm({ onSuccess }: Props) {
  const weeks = recentWeekLabels(4);

  const [weekLabel, setWeekLabel] = useState(weeks[0]);
  const [adCost, setAdCost] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [packagingCost, setPackagingCost] = useState("0");
  const [otherCost, setOtherCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
          weekLabel,
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

      toast.success(`${weekLabel} 成本已儲存`);
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
        <Label>週次</Label>
        <Select value={weekLabel} onValueChange={(v) => v && setWeekLabel(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((w, i) => (
              <SelectItem key={w} value={w}>
                {formatWeekRange(w)}
                {i === 0 ? "（本週）" : i === 1 ? "（上週）" : ""}
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
            className="h-11"
          />
        </div>
      </div>

      <div>
        <Label>備註（選填）</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="例如：本週雙11活動加碼廣告"
          rows={2}
        />
      </div>

      <div className="rounded-md bg-muted px-4 py-2 text-sm font-medium">
        本週合計：NT$ {total.toLocaleString()}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="w-full md:w-auto">
          {saving ? "儲存中..." : "儲存成本"}
        </Button>
      </div>
    </form>
  );
}
