const CACHE_NAME = 'portzot-derech-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/d1.html',
  '/d2.html',
  '/d3.html',
  '/d4.html',
  '/d5.html',
  '/d6.html',
  '/d7.html',
  '/d8.html',
  '/d9.html',
  '/d10.html',
  '/level1/quiz.html',
  '/pairing.html',
  '/questionnaire.html',
  '/waiting.html',
  '/styles.css',
  '/pairing.css',
  '/js/scroll-lock.js',
  '/js/config.js',
  '/js/pairing-algorithm.js',
  '/favicon.png',
  '/logo.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request).then(function(response) {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          return response;
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
    })
  );
});
