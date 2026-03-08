const CACHE_NAME = 'portzot-derech-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/pairing.css',
  './domains/alldomains.html',
  './domains/d1.html',
  './domains/d2.html',
  './domains/d3.html',
  './domains/d4.html',
  './domains/d5.html',
  './domains/d6.html',
  './domains/d7.html',
  './domains/d8.html',
  './domains/d9.html',
  './domains/d10.html',
  './start/quiz.html',
  './pairing/pairing.html',
  './pairing/questionnaire.html',
  './pairing/waiting.html',
  './icon/favicon.png',
  './icon/logo.png',
  './js/scroll-lock.js',
  './js/config.js',
  './js/pairing-algorithm.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }

        return fetch(event.request).then(function(networkResponse) {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(function() {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }

          return caches.match(event.request);
        });
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});
