/* Keep In Touch — service worker (app-shell cache only; never caches user data).
   CACHE is stamped from VERSION at release time. */
const CACHE = "kit-shell-1.24.0";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./assets/icon-192.png", "./assets/icon-512.png", "./assets/icon.svg"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  // GUARD 1: never touch non-GET — protects Apps Script POST saves.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // GUARD 2: never touch the Apps Script backend. A GET to /exec 302-redirects
  // to script.googleusercontent.com; a SW-issued follow can return an
  // opaqueredirect and break loadFromSheet. True passthrough — no respondWith.
  if (url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com") return;
  // GUARD 3: only handle same-origin shell GETs. Everything else: passthrough.
  if (url.origin !== self.location.origin) return;
  // cache-first, network-fallback.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === "basic") {
        const c = await caches.open(CACHE); c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return (await caches.match("./index.html")) || Response.error();
    }
  })());
});
