/* Slip service worker: keep the running version until the user taps Update. */
const VERSION = "2026.10.12.14";

self.addEventListener("install", (event) => {
  // Do not skipWaiting here — stay in "waiting" until the Update button
  // posts SKIP_WAITING so the open app never swaps mid-session.
  event.waitUntil(
    caches.open(`slip-${VERSION}`).then((cache) =>
      cache.addAll([
        "./",
        "./index.html",
        `./styles.css?v=${VERSION}`,
        `./app.js?v=${VERSION}`,
        `./version.js?v=${VERSION}`,
        "./whats-new.json",
        "./manifest.json",
      ]).catch(() => undefined),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("slip-") && key !== `slip-${VERSION}`)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Always hit the network for release notes so the Update banner can show
  // what’s new while the user is still on the older cached Slip.
  if (url.pathname.endsWith("/whats-new.json")) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => {
        const cached = await caches.match("./whats-new.json");
        if (cached) return cached;
        throw new Error("Offline and not cached");
      }),
    );
    return;
  }

  // Cache-first so a waiting newer build cannot replace the UI until Update.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(`slip-${VERSION}`);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        if (request.mode === "navigate") {
          const fallback = await caches.match("./index.html");
          if (fallback) return fallback;
        }
        throw new Error("Offline and not cached");
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
