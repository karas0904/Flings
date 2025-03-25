// Service Worker for caching and improving performance
const CACHE_NAME = "flings-cache-v1";
const AUTH_CACHE_NAME = "flings-auth-cache-v1";

const urlsToCache = [
  "/",
  "/css/navbar.css",
  "/css/style.css",
  "/js/performance.js",
  "/js/auth.js",
  "/assets/icons/Frame 1.svg",
  "/assets/icons/rose-icon.svg",
  "/assets/images/Couple1-image.jpg",
  "/assets/images/couple2-image.jpg",
  "/login.html",
  "/discover.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  // Special handling for auth endpoints
  if (event.request.url.includes("/auth/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const responseToCache = response.clone();
          caches.open(AUTH_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Handle regular requests with network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
