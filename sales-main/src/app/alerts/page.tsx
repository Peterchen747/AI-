"use client";

import { useEffect, useState } from "react";

type Alert = {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
};

const severityStyles: Record<Alert["severity"], string> = {
  high: "border-red-500 bg-red-50 text-red-900",
  medium: "border-orange-400 bg-orange-50 text-orange-900",
  low: "border-yellow-400 bg-yellow-50 text-yellow-900",
};

const severityLabels: Record<Alert["severity"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => {
        if (!res.ok) throw new Error("載入失敗");
        return res.json();
      })
      .then((data: Alert[]) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">警示中心</h1>

      {loading && (
        <p className="text-muted-foreground">載入中...</p>
      )}

      {error && (
        <p className="text-red-500">{error}</p>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="rounded-lg border border-green-400 bg-green-50 p-4 text-green-900">
          <p className="font-medium text-lg">目前一切正常 ✅</p>
          <p className="text-sm mt-1">沒有任何需要注意的警示。</p>
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg border-2 p-4 ${severityStyles[alert.severity]}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60">
                  {severityLabels[alert.severity]}風險
                </span>
                <span className="font-semibold">{alert.title}</span>
              </div>
              <p className="text-sm">{alert.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
