const CACHE_NAME = "streetr-seller-cache-v1";
const URLS_TO_CACHE = [
  "/StreetR-seller-app/",
  "/StreetR-seller-app/index.html",
  "/StreetR-seller-app/manifest.json",
  "https://assets.onecompiler.app/42q5e2pr5/43mm8muqm/1000131397.png",
  "https://assets.onecompiler.app/42q5e2pr5/43mm88v46/1000131390.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
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
