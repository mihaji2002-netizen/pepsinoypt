const CACHE = "chaos-v23-no-phys-title";
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
  "./js/data/cheers.js",
  "./js/components/timer.js",
  "./js/components/music.js",
  "./js/components/export.js",
  "./js/utils/helpers.js",
  "./js/utils/persian-date.js",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/brand/pepsino-lab-logo.webp",
  "./assets/brand/pepsino-lab-logo-512.png",
  "./assets/brand/pepsino-mark-192.png",
  "./assets/brand/pepsino-mark-96.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(
          ASSETS.map((url) =>
            cache.add(url).catch(() => {
              /* ignore missing optional assets so install still succeeds */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clients) =>
        Promise.all(
          clients.map((client) => {
            if (typeof client.navigate === "function") {
              return client.navigate(client.url);
            }
            client.postMessage({ type: "chaos-force-reload", build: CACHE });
            return undefined;
          })
        )
      )
  );
});

function isNavigation(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

function isShellAsset(url) {
  return (
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/sw.js")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always try network first for app shell so updates show up immediately
  if (isNavigation(request) || isShellAsset(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (isNavigation(request)) {
      return cache.match("./index.html");
    }
    throw new Error("offline");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetching;
}
