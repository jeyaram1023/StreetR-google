const CACHE_NAME = "streetr-seller-cache-v1";
const urlsToCache = [
  "/streetr-seller-app/",
  "/streetr-seller-app/index.html",
  "/streetr-seller-app/css/style.css",
  "/streetr-seller-app/manifest.json",
  "/streetr-seller-app/assets/icon-192x192.png",
  "/streetr-seller-app/assets/icon-512x512.png",
  "/streetr-seller-app/js/supabaseClient.js",
  "/streetr-seller-app/js/auth.js",
  "/streetr-seller-app/js/profile.js",
  "/streetr-seller-app/js/menu.js",
  "/streetr-seller-app/js/orders.js",
  "/streetr-seller-app/js/main.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
});
