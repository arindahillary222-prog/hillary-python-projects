const HILLGRAM_CACHE = "hillgram-static-v1";
const STATIC_ASSETS = [
  "/app/static/manifest.json",
  "/app/static/hillgram-icon-192.png",
  "/app/static/hillgram-icon-512.png",
  "/app/static/hillgram-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(HILLGRAM_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== HILLGRAM_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
