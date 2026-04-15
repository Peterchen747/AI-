"use client";

import { useState } from "react";
import { PurchaseBatchForm } from "@/components/purchase-batches/PurchaseBatchForm";
import { PurchaseBatchList } from "@/components/purchase-batches/PurchaseBatchList";

export default function PurchaseBatchesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSuccess() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">進貨管理</h1>

      <section className="rounded-md border bg-card p-4">
        <h2 className="text-base font-semibold mb-4">新增進貨批次</h2>
        <PurchaseBatchForm onSuccess={handleSuccess} />
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">進貨記錄</h2>
        <PurchaseBatchList key={refreshKey} />
      </section>
    </div>
  );
}
