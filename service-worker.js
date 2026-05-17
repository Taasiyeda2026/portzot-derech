const CACHE_NAME = "portzot-derech-v54";

// ── נכסי ליבה — נטענים מיידית בהתקנה ─────────────────────────────────────
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./strongermenu-2026.html",
  "./manifest.json",

  // אייקונים
  "./icon/favicon.png",
  "./icon/generated-icon.png",
  "./icon/logo.png",

  // CSS ראשי
  "./css/styles.css",
  "./css/pairing.css",
  "./css/print.css",

  // JS ראשי
  "./js/config.js",
  "./js/pairing-app.js",
  "./js/pairing-algorithm.js",
  "./js/scroll-lock.js",
  "./js/admin-app.js",

  // ── שלבי הקורס ─────────────────────────────────────────────────────────
  "./start/quiz.html",
  "./domains/alldomains.html",
  "./pairing/pairing.html",
  "./pairing/questionnaire.html",
  "./pairing/matching.html",
  "./pairing/waiting.html",
  "./pairing/admin.html",
  "./idea/idea-to-product.html",
  "./steps/entrepreneurship-steps.html",
  "./steps/flow.html",
  "./steps/go.html",
  "./steps/mvp.html",
  "./steps/mvp3p.html",
  "./steps/persona.html",
  "./steps/prd.html",
  "./steps/tree.html",
  "./final/final.html",
  "./final/FinalPitch.html",
  "./final/pitch-activity.html",

  // ── עורך פוסטרים — דפים ─────────────────────────────────────────────────
  "./poster-builder/index.html",
  "./poster-builder/poster-builder-v2.html",
  "./poster-builder/product/editor.html",
  "./poster-builder/product/app.html",
  "./poster-builder/product/physical.html",
  "./poster-builder/product/website.html",
  "./poster-builder/product/digital.html",

  // ── עורך פוסטרים — JS ────────────────────────────────────────────────────
  "./poster-builder/src/canvas/html-poster.js",
  "./poster-builder/src/shared/app-shell.js",
  "./poster-builder/src/shared/storage.js",
  "./poster-builder/src/shared/supabase-config.js",
  "./poster-builder/src/shared/utils.js",
  "./poster-builder/src/shared/validation.js",
  "./poster-builder/src/shared/poster-assets.js",
  "./poster-builder/src/shared/poster-submissions.js",
  "./poster-builder/src/shared/prompt-builder.js",
  "./poster-builder/src/products/split-flow/main.js",
  "./poster-builder/src/products/physical/main.js",
  "./poster-builder/src/products/physical/physical-flow.js",
  "./poster-builder/src/products/physical/config.js",
  "./poster-builder/src/products/physical/questions.js",
  "./poster-builder/src/products/physical/steps.js",
  "./poster-builder/src/products/physical/poster-fields.js",
  "./poster-builder/src/products/app/main.js",
  "./poster-builder/src/products/app/config.js",
  "./poster-builder/src/products/app/questions.js",
  "./poster-builder/src/products/app/steps.js",
  "./poster-builder/src/products/app/poster-fields.js",
  "./poster-builder/src/products/digital/main.js",
  "./poster-builder/src/products/digital/config.js",
  "./poster-builder/src/products/digital/questions.js",
  "./poster-builder/src/products/digital/steps.js",
  "./poster-builder/src/products/digital/poster-fields.js",
  "./poster-builder/src/data/config.js",

  // ── עורך פוסטרים — CSS ──────────────────────────────────────────────────
  "./poster-builder/src/styles/product-builder.css",
  "./poster-builder/src/styles/app.css",
  "./poster-builder/src/styles/gateway.css",
];

// ── הרחבות שנשמרות ב־Cache לפי דרישה ────────────────────────────────────
const CACHEABLE_EXTS = new Set([
  ".js", ".css", ".html", ".json",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
  ".woff", ".woff2", ".ttf", ".otf",
]);

// ── התקנה — מטעין את נכסי הליבה ─────────────────────────────────────────
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return Promise.allSettled(
          CORE_ASSETS.map(function (asset) {
            return cache.add(asset).catch(function (err) {
              console.warn("[SW] Failed to cache:", asset, err);
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// ── הפעלה — מוחק Caches ישנים ───────────────────────────────────────────
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function (name) { return name !== CACHE_NAME; })
            .map(function (name) { return caches.delete(name); })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// ── Fetch — אסטרטגיית Cache חכמה ────────────────────────────────────────
self.addEventListener("fetch", function (event) {
  // POST ובקשות שאינן GET עוברות ישירות לשרת — לא נשמרות ב-cache
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // /api/export-pdf חייב תמיד לרוץ מול השרת — לא לשמור ב-cache
  if (url.pathname.includes("/api/export-pdf")) return;

  // בקשות חיצוניות (CDN, Firebase, Supabase וכד') — לא מטפלים
  if (url.origin !== self.location.origin) return;

  const ext = url.pathname.substring(url.pathname.lastIndexOf(".")).toLowerCase();
  const isNavigate = event.request.mode === "navigate";
  const isStaticAsset = CACHEABLE_EXTS.has(ext) && !isNavigate;

  if (isNavigate) {
    // דפי HTML: Network-first, נכשל → Cache → fallback לדף הבית
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
          }
          return response;
        })
        .catch(function () {
          return caches.match(event.request)
            .then(function (cached) { return cached || caches.match("./index.html"); });
        })
    );
    return;
  }

  if (isStaticAsset) {
    // נכסים סטטיים: Cache-first, נכשל → Network ושמור
    event.respondWith(
      caches.match(event.request)
        .then(function (cached) {
          if (cached) return cached;

          return fetch(event.request)
            .then(function (response) {
              if (!response || response.status !== 200) return response;
              const clone = response.clone();
              caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
              return response;
            });
        })
    );
    return;
  }

  // כל בקשה אחרת (env.js וכד') — ישירות לרשת
});
