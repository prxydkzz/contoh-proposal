/* service-worker.js — bikin aplikasi tetap bisa dibuka walau tanpa internet
   (data transaksi sendiri sudah tersimpan di localStorage, bukan di sini) */

const CACHE_NAME = "kas-kuliah-v1";
const CORE_FILES = [
  "./",
  "index.html",
  "dashboard.html",
  "css/style.css",
  "js/storage.js",
  "js/auth.js",
  "js/app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Strategi: coba jaringan dulu (biar CDN Chart.js/jsPDF tetap update),
// kalau gagal (offline) baru pakai salinan dari cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
