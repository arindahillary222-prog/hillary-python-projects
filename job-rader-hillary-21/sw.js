self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(() => {
      if (request.mode === "navigate") {
        return new Response("<!doctype html><title>Offline</title><p>Connect to the internet to open JOB RADER HILLARY.21.</p>", {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return Response.error();
    })
  );
});
