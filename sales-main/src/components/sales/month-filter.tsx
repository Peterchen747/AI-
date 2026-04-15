"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MonthFilter({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    // Q6: month 與日期區間互斥 — 選月份時清掉 dateFrom/dateTo
    params.delete("dateFrom");
    params.delete("dateTo");
    if (v) params.set("month", v);
    else params.delete("month");
    router.push(`/sales?${params.toString()}`);
  }

  return (
    <div className="flex items-end gap-2">
      <div>
        <Label htmlFor="month">月份</Label>
        <Input
          id="month"
          type="month"
          value={current}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
