// Offline support: the app shell is cached so chamapp opens with no connection.
const CACHE = "chamapp-v14";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Pages: open the copy saved on the phone straight away and fetch any update in the background,
  // so a slow connection never holds up opening the app. Updates show the next time it's opened.
  if (req.mode === "navigate"){
    const fresh = fetch(req, {cache:"no-store"}).then(r => {
      if (r.ok){ const copy = r.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put("./index.html", copy))); }
      return r;
    });
    e.waitUntil(fresh.catch(() => {}));
    e.respondWith(caches.match("./index.html").then(hit => hit || fresh.catch(() => caches.match("./"))));
    return;
  }
  // Everything else (icons, fonts): cached copy first, refreshed in the background.
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque"){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
