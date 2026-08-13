const CACHE_NAME = "kitty-ledger-shell-v2";
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/theme/kitty-heart.png",
  "/theme/category-food.png",
  "/theme/category-shopping.png",
  "/theme/category-traffic.png",
  "/theme/category-housing.png",
  "/theme/category-other.png",
  "/theme/records-year.png",
  "/theme/records-month.png",
  "/theme/records-day.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;
  const safeUrls = event.data.urls.filter((url) => {
    try { return new URL(url).origin === self.location.origin; } catch { return false; }
  });
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(safeUrls.map((url) => cache.add(url)))));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/").then((response) => response || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
