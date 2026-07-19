const CACHE = "masir-v5-multi-alts";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/print.css",
  "./js/app.js",
  "./js/core/storage.js",
  "./js/engine/rules.js",
  "./js/engine/planner.js",
  "./js/engine/scenarios.js",
  "./js/data/subjects.js",
  "./js/data/blocks.js",
  "./js/data/flow.js",
  "./js/components/timer.js",
  "./js/components/music.js",
  "./js/components/export.js",
  "./js/utils/helpers.js",
  "./js/utils/persian-date.js",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && (response.type === "basic" || response.type === "cors")) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
