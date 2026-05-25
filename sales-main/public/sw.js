const CACHE_NAME = "ai-financial-v1";

// 靜態資源預快取（App Shell）
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
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
  const url = new URL(request.url);

  // API 請求：永遠走網路，失敗時不快取
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // 頁面與靜態資源：Network First（有網路用最新，離線用快取）
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 只快取成功的 GET 請求
        if (request.method === "GET" && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
