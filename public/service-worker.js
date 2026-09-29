/* =========================================================
   NEA'S BOARDING HORSE — SERVICE WORKER

   Kept deliberately simple and safe for a login-gated, live
   social feed:
   - Only the static "shell" (HTML/CSS/JS/icons/fonts) is cached.
   - Anything under /api/ ALWAYS goes to the network, untouched —
     we never want to serve a stale or cached login/feed response.
   - Bump CACHE_NAME (e.g. "nbh-shell-v2") whenever you deploy
     changed frontend files, so old caches are dropped and
     members get the new version instead of a stuck old one.
========================================================= */

const CACHE_NAME = "nbh-shell-v2";
const SHELL_FILES = [
  "/",
  "/index.html",
  "/style.css",
  "/theme.css",
  "/script.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never touch API calls — always live, never cached.
  if (url.pathname.startsWith("/api/")) return;

  // Only handle same-origin GET requests; let everything else
  // (Cloudinary images/videos, cross-origin, POST, etc.) pass through untouched.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/index.html"))
      )
  );
});
