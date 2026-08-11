"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      // updateViaCache: "none" → 瀏覽器不快取 sw.js 本身，
      // 已經裝了舊版 SW 的手機下次開啟才拿得到新版
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        // 主動檢查一次更新，讓舊版 SW 盡快被換掉
        registration.update().catch(() => {/* 離線時會失敗，忽略 */});
      })
      .catch(() => {/* silently ignore in dev */});
  }, []);

  return null;
}
