const CACHE_NAME = "portzot-derech-v26";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./strongermenu-2026.html",
  "./manifest.json",
  "./icon/favicon.png",
  "./icon/generated-icon.png",
  "./icon/logo.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(CORE_ASSETS);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function (cacheName) {
              return cacheName !== CACHE_NAME;
            })
            .map(function (cacheName) {
              return caches.delete(cacheName);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cachedResponse) {
            return cachedResponse || caches.match("./index.html");
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(function (response) {
            if (!response || response.status !== 200) {
              return response;
            }

            const responseClone = response.clone();

            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseClone);
            });

            return response;
          });
      })
  );
});
