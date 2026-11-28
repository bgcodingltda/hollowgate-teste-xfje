// Network-first service worker: always tries the server so a new build shows up on the next
// open; falls back to the cache only when offline. Build files have hashed names, so old and
// new builds never collide. Old caches are dropped when a new worker activates.
const CACHE = "hollowgate-20261128-0245";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.url.includes("version.json")) return;          // always straight from the network
  if (req.url.includes("/Build/")) return;               // game binaries: leave them to the browser (Safari streams the wasm)
  if (req.url.includes("/StreamingAssets/") || req.headers.has("range")) return; // videos use range requests (206 can't be cached)
  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: "no-cache" });
      if (res.status === 200) (await caches.open(CACHE)).put(req, res.clone()).catch(() => {});
      return res;
    } catch (e) {
      const hit = await caches.match(req);
      if (hit) return hit;
      throw e;
    }
  })());
});
