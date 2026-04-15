"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { id: number; name: string; isActive?: number };

export function SalesFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [dateFrom, setDateFrom] = useState(params.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(params.get("dateTo") ?? "");
  const [categoryId, setCategoryId] = useState(params.get("categoryId") ?? "");
  const [q, setQ] = useState(params.get("q") ?? "");

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sp = new URLSearchParams();
      // preserve month if no explicit dates
      const month = params.get("month");
      if (!dateFrom && !dateTo && month) sp.set("month", month);
      if (dateFrom) sp.set("dateFrom", dateFrom);
      if (dateTo) sp.set("dateTo", dateTo);
      if (categoryId) sp.set("categoryId", categoryId);
      if (q.trim()) sp.set("q", q.trim());
      router.push(`/sales?${sp.toString()}`);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, categoryId, q]);

  function clearAll() {
    setDateFrom("");
    setDateTo("");
    setCategoryId("");
    setQ("");
    router.push("/sales");
  }

  const hasFilter = dateFrom || dateTo || categoryId || q;

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-md border bg-card">
      <div>
        <Label className="text-xs">起始日</Label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
        />
      </div>
      <div>
        <Label className="text-xs">結束日</Label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
        />
      </div>
      <div>
        <Label className="text-xs">大分類</Label>
        <Select
          value={categoryId || "__all__"}
          onValueChange={(v) => setCategoryId(v === "__all__" ? "" : (v ?? ""))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
                {c.isActive === 0 ? "(已封存)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-48">
        <Label className="text-xs">商品名稱</Label>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="模糊搜尋商品名稱..."
        />
      </div>
      {hasFilter && (
        <Button variant="outline" onClick={clearAll}>
          清除篩選
        </Button>
      )}
    </div>
  );
}
