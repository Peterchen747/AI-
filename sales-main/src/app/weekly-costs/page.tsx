"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WeeklyCostForm } from "@/components/weekly-costs/WeeklyCostForm";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

type WeeklyCostRow = {
  id: number;
  weekLabel: string;
  adCost: number;
  shippingCost: number;
  packagingCost: number;
  otherCost: number;
  totalCost: number;
  notes: string | null;
};

type MonthGroup = {
  month: string;
  adCost: number;
  shippingCost: number;
  packagingCost: number;
  otherCost: number;
  totalCost: number;
  notes: string[];
  editableRow: WeeklyCostRow;
};

function weekLabelToMonth(weekLabel: string): string {
  if (/^\d{4}-\d{2}$/.test(weekLabel)) return weekLabel;
  const match = weekLabel.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekLabel;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const weekMonday = new Date(jan4);
  weekMonday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (week - 1) * 7);
  const thursday = new Date(weekMonday);
  thursday.setUTCDate(weekMonday.getUTCDate() + 3);
  const m = String(thursday.getUTCMonth() + 1).padStart(2, "0");
  return `${thursday.getUTCFullYear()}-${m}`;
}

function groupByMonth(rows: WeeklyCostRow[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const row of rows) {
    const month = weekLabelToMonth(row.weekLabel);
    const existing = map.get(month) ?? {
      month,
      adCost: 0,
      shippingCost: 0,
      packagingCost: 0,
      otherCost: 0,
      totalCost: 0,
      notes: [],
      // 預設用月份格式建立合成 row，有 YYYY-MM 記錄時會被覆蓋
      editableRow: { id: 0, weekLabel: month, adCost: 0, shippingCost: 0, packagingCost: 0, otherCost: 0, totalCost: 0, notes: null },
    };
    existing.adCost += row.adCost;
    existing.shippingCost += row.shippingCost;
    existing.packagingCost += row.packagingCost;
    existing.otherCost += row.otherCost;
    existing.totalCost += row.totalCost;
    if (row.notes) existing.notes.push(row.notes);
    // YYYY-MM 格式的 row 優先作為編輯來源
    if (/^\d{4}-\d{2}$/.test(row.weekLabel)) {
      existing.editableRow = row;
    }
    map.set(month, existing);
  }
  // 更新合成 row 的成本為該月合計
  for (const group of map.values()) {
    if (group.editableRow.id === 0) {
      group.editableRow = { ...group.editableRow, adCost: group.adCost, shippingCost: group.shippingCost, packagingCost: group.packagingCost, otherCost: group.otherCost, totalCost: group.totalCost };
    }
  }
  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
}

function formatMonthDisplay(month: string): string {
  const [y, m] = month.split("-");
  return `${y}/${m}`;
}

function CostItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">NT$ {value.toLocaleString()}</span>
    </div>
  );
}

export default function WeeklyCostsPage() {
  const [rows, setRows] = useState<WeeklyCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<WeeklyCostRow | null>(null);
  const formRef = useRef<HTMLElement>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/weekly-costs");
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  function handleEdit(row: WeeklyCostRow) {
    setEditingRow(row);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const groups = groupByMonth(rows);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">每月成本</h1>
        <p className="text-sm text-muted-foreground">記錄每月的廣告、運費、包材等費用</p>
      </div>

      <section ref={formRef} className="rounded-lg border bg-card p-6">
        <h2 className="text-base font-semibold mb-4">
          {editingRow ? `編輯 ${formatMonthDisplay(editingRow.weekLabel)} 成本` : "新增 / 更新月份成本"}
        </h2>
        <WeeklyCostForm
          onSuccess={fetchRows}
          initialData={editingRow ?? undefined}
          onClearEdit={() => setEditingRow(null)}
        />
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">月份成本明細</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">載入中...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚未新增任何月份成本</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.month} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">{formatMonthDisplay(group.month)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(group.editableRow)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    編輯
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <CostItem label="廣告費" value={group.adCost} />
                  <CostItem label="運費" value={group.shippingCost} />
                  <CostItem label="包材費" value={group.packagingCost} />
                  <CostItem label="其他" value={group.otherCost} />
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm text-muted-foreground">合計</span>
                  <span className="font-semibold">NT$ {group.totalCost.toLocaleString()}</span>
                </div>
                {group.notes.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {group.notes.map((note, i) => (
                      <p key={i} className="text-xs text-muted-foreground">備註：{note}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
