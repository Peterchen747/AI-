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

const severityIcons: Record<Alert["severity"], string> = {
  high: "🔴",
  medium: "🟠",
  low: "🟡",
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
      <h1 className="text-2xl font-bold mb-2">警示中心</h1>

      {/* AI upgrade banner */}
      <div className="mb-6 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-blue-800 text-sm flex gap-3 items-start">
        <span className="text-lg mt-0.5">🤖</span>
        <div>
          <p className="font-semibold">目前採用規則引擎分析</p>
          <p className="mt-0.5 text-blue-700">
            警示邏輯由預設規則判斷（如廣告費率、庫存閾值、月比月變化）。
            <br />
            <span className="font-medium">下一版將整合 AI 大型語言模型</span>，自動識別異常趨勢、提供原因推測與行動建議，讓分析更智慧。
          </p>
        </div>
      </div>

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
        <>
          <p className="text-sm text-muted-foreground mb-3">
            共發現 <span className="font-semibold text-foreground">{alerts.length}</span> 個警示
          </p>
          <div className="space-y-4">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`rounded-lg border-2 p-4 ${severityStyles[alert.severity]}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{severityIcons[alert.severity]}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60">
                    {severityLabels[alert.severity]}風險
                  </span>
                  <span className="font-semibold">{alert.title}</span>
                </div>
                <p className="text-sm">{alert.detail}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
