// 版本號改變時，activate 會自動刪掉所有舊快取。
// v1 曾經把「未登入的 /dashboard（= 登入頁 HTML，沒有導覽列）」存進快取，
// 導致早上冷開機網路還沒起來時，會拿到沒有導覽列的畫面。改版即可一次清掉。
const CACHE_NAME = "ai-financial-v3";

// 只預快取「不會因為登入狀態而改變」的靜態資源。
// 絕對不要放 HTML 頁面（/ 或 /dashboard）。
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// 可以快取的靜態資源路徑前綴
const CACHEABLE_PREFIXES = ["/_next/static/", "/icons/", "/uploads/"];

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (PRECACHE_URLS.includes(url.pathname)) return true;
  return CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // 單一資源失敗不要讓整個 install 掛掉（addAll 是 all-or-nothing）
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined))
        )
      )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 非 GET（POST 上傳、PATCH 等）完全不攔截，交給瀏覽器自己處理
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // 頁面導覽：永遠只走網路，絕不回快取的 HTML。
  // 離線時寧可顯示瀏覽器原生的離線頁，也不要顯示一個沒有導覽列的舊畫面。
  if (request.mode === "navigate") return;

  // API 一律走網路
  if (url.pathname.startsWith("/api/")) return;

  // 其餘非靜態資源（含任何 HTML）不攔截
  if (!isCacheableAsset(url)) return;

  // 靜態資源：Network First，失敗才用快取
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && !response.redirected) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // 沒有快取就照實回一個錯誤，不要把 undefined 丟給 respondWith
          return new Response("", { status: 504, statusText: "Offline" });
        })
      )
  );
});
