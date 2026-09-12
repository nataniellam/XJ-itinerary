// Offline cache for the Xinjiang Itinerary page.
// Strategy: cache-first, refreshing in the background (stale-while-revalidate),
// for everything except the live Google Maps / Directions and Open-Meteo APIs —
// those need a real network response, and the app already falls back gracefully
// (straight-line routes, seasonal-average weather) when they're unreachable.

const CACHE_NAME = "xj-itinerary-v1";
const CORE_ASSETS = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Never intercept the map, directions, or weather APIs — always hit the network.
  if (request.url.includes("maps.googleapis.com") || request.url.includes("api.open-meteo.com")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
