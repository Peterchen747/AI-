"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DashboardMonthPicker({ current }: { current: string }) {
  const router = useRouter();

  function onChange(v: string) {
    if (v) {
      router.push(`/dashboard?month=${v}`);
    } else {
      router.push(`/dashboard`);
    }
  }

  return (
    <div className="flex items-end gap-2">
      <div>
        <Label htmlFor="dashboard-month" className="text-xs">月份</Label>
        <Input
          id="dashboard-month"
          type="month"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
