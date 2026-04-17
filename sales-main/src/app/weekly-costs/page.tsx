"use client";

import { useCallback, useEffect, useState } from "react";
import { WeeklyCostForm } from "@/components/weekly-costs/WeeklyCostForm";
import { formatWeekRange } from "@/lib/week-utils";

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

export default function WeeklyCostsPage() {
  const [rows, setRows] = useState<WeeklyCostRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">每週成本</h1>
        <p className="text-sm text-muted-foreground">記錄每週的廣告、運費、包材等費用</p>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-base font-semibold mb-4">新增 / 更新週次成本</h2>
        <WeeklyCostForm onSuccess={fetchRows} />
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">最近 8 週紀錄</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">載入中...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無資料</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">日期區間</th>
                  <th className="px-4 py-2 text-right font-medium">廣告費</th>
                  <th className="px-4 py-2 text-right font-medium">運費</th>
                  <th className="px-4 py-2 text-right font-medium">包材</th>
                  <th className="px-4 py-2 text-right font-medium">其他</th>
                  <th className="px-4 py-2 text-right font-medium">合計</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2" title={row.weekLabel}>
                      {formatWeekRange(row.weekLabel)}
                    </td>
                    <td className="px-4 py-2 text-right">{row.adCost.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.shippingCost.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.packagingCost.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.otherCost.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-semibold">{row.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
