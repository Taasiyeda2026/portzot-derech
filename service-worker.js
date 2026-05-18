const CACHE_NAME = "portzot-derech-v66";

// ── נכסי ליבה — נטענים מיידית בהתקנה ─────────────────────────────────────
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./strongermenu-2026.html",
  "./manifest.json",
  "./buildingmessage.html",
  "./transition.html",
  "./spich.html",

  // ── אייקונים ──────────────────────────────────────────────────────────────
  "./icon/favicon.png",
  "./icon/favicon.ico",
  "./icon/generated-icon.png",
  "./icon/logo.png",
  "./icon/girl.png",
  "./icon/sdg.png",
  "./icon/brand.svg",
  "./icon/idea.svg",
  "./icon/partner.svg",
  "./icon/start.svg",
  "./icon/stem.svg",
  "./icon/sub.svg",
  "./icon/1.svg",
  "./icon/2.svg",
  "./icon/3.svg",
  "./icon/4.svg",
  "./icon/5.svg",
  "./icon/6.svg",
  "./icon/7.svg",
  "./icon/8.svg",
  "./icon/p1.svg",
  "./icon/p2.svg",

  // ── CSS ראשי ──────────────────────────────────────────────────────────────
  "./css/styles.css",
  "./css/pairing.css",
  "./css/print.css",

  // ── JS ראשי ───────────────────────────────────────────────────────────────
  "./js/config.js",
  "./js/pairing-app.js",
  "./js/pairing-algorithm.js",
  "./js/scroll-lock.js",
  "./js/admin-app.js",
  "./pairing-algorithm.js",

  // ── פונטים גלובליים ───────────────────────────────────────────────────────
  "./fonts/Alef-bold.ttf",
  "./fonts/Alef-bold.woff",
  "./fonts/Alef-regular.ttf",
  "./fonts/Alef-regular.woff",
  "./fonts/Alice-Regular.ttf",
  "./fonts/Choco.otf",
  "./fonts/GveretLevin-Regular.ttf",
  "./fonts/IBMPlexSansHebrew-Bold.ttf",
  "./fonts/IBMPlexSansHebrew-Regular.ttf",
  "./fonts/IBMPlexSansHebrew-Medium.ttf",
  "./fonts/IBMPlexSansHebrew-SemiBold.ttf",
  "./fonts/IBMPlexSansHebrew-Light.ttf",
  "./fonts/IBMPlexSansHebrew-ExtraLight.ttf",
  "./fonts/IBMPlexSansHebrew-Thin.ttf",
  "./fonts/Arimo-Regular.ttf",
  "./fonts/Arimo-Bold.ttf",
  "./fonts/Lora-Regular.ttf",
  "./fonts/Lora-Bold.ttf",
  "./fonts/FtPilKahol2.ttf",
  "./fonts/FtPilKahol2.woff2",
  "./fonts/yehudaclm-bold-webfont.ttf",
  "./fonts/yehudaclm-bold-webfont.woff",
  "./fonts/yehudaclm-light-webfont.ttf",
  "./fonts/yehudaclm-light-webfont.woff",

  // ── שלבי הקורס ────────────────────────────────────────────────────────────
  "./start/quiz.html",
  "./domains/alldomains.html",
  "./domains/d1.html",
  "./domains/d2.html",
  "./domains/d3.html",
  "./domains/d4.html",
  "./domains/d5.html",
  "./domains/d6.html",
  "./domains/d7.html",
  "./domains/d8.html",
  "./domains/d9.html",
  "./domains/d10.html",
  "./domains/d1-dev.html",
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

  // ── p.nativ ───────────────────────────────────────────────────────────────
  "./p.nativ/enter.html",
  "./p.nativ/creative.html",
  "./p.nativ/creativethinking.html",
  "./p.nativ/domain.html",
  "./p.nativ/goals.html",
  "./p.nativ/need.html",
  "./p.nativ/persona.html",
  "./p.nativ/problem.html",
  "./p.nativ/sdg-goals.html",
  "./p.nativ/yaad12.html",
  "./p.nativ/game/index.html",
  "./p.nativ/game/card-generator.html",
  "./p.nativ/game/print-cards.html",
  "./p.nativ/game/kvutza_1.json",
  "./p.nativ/game/kvutza_2.json",

  // ── עורך פוסטרים — דפים ───────────────────────────────────────────────────
  "./poster-builder/index.html",
  "./poster-builder/admin.html",
  "./poster-builder/poster-builder-v2.html",
  "./poster-builder/prd-options.html",
  "./poster-builder/product/editor.html",
  "./poster-builder/product/app.html",
  "./poster-builder/product/physical.html",
  "./poster-builder/product/website.html",
  "./poster-builder/product/digital.html",
  "./poster-builder/product/admin-import.html",

  // ── עורך פוסטרים — JS ─────────────────────────────────────────────────────
  "./poster-builder/src/canvas/html-poster.js",
  "./poster-builder/src/shared/app-shell.js",
  "./poster-builder/src/shared/schools-config.js",
  "./poster-builder/src/shared/storage.js",
  "./poster-builder/src/shared/supabase-config.js",
  "./poster-builder/src/shared/utils.js",
  "./poster-builder/src/shared/validation.js",
  "./poster-builder/src/shared/poster-assets.js",
  "./poster-builder/src/shared/poster-submissions.js",
  "./poster-builder/src/shared/poster-schools.js",
  "./poster-builder/src/shared/prompt-builder.js",
  "./poster-builder/src/admin/main.js",
  "./poster-builder/src/main.js",
  "./poster-builder/src/data/config.js",
  "./poster-builder/src/utils/storage.js",
  "./poster-builder/src/products/split-flow/main.js",
  "./poster-builder/src/products/physical/main.js",
  "./poster-builder/src/products/physical/physical-flow.js",
  "./poster-builder/src/products/physical/config.js",
  "./poster-builder/src/products/physical/questions.js",
  "./poster-builder/src/products/physical/steps.js",
  "./poster-builder/src/products/physical/poster-fields.js",
  "./poster-builder/src/products/physical/prompt-template.js",
  "./poster-builder/src/products/app/main.js",
  "./poster-builder/src/products/app/config.js",
  "./poster-builder/src/products/app/questions.js",
  "./poster-builder/src/products/app/steps.js",
  "./poster-builder/src/products/app/poster-fields.js",
  "./poster-builder/src/products/app/prompt-template.js",
  "./poster-builder/src/products/digital/main.js",
  "./poster-builder/src/products/digital/config.js",
  "./poster-builder/src/products/digital/questions.js",
  "./poster-builder/src/products/digital/steps.js",
  "./poster-builder/src/products/digital/poster-fields.js",
  "./poster-builder/src/products/digital/prompt-template.js",
  "./poster-builder/src/components/ActionPanel.js",
  "./poster-builder/src/components/ContentSidebar.js",
  "./poster-builder/src/components/Header.js",
  "./poster-builder/src/components/ObjectToolbar.js",
  "./poster-builder/src/components/Sidebar.js",
  "./poster-builder/src/components/StartupModal.js",
  "./poster-builder/src/components/WizardSteps.js",

  // ── עורך פוסטרים — CSS ────────────────────────────────────────────────────
  "./poster-builder/src/styles/product-builder.css",
  "./poster-builder/src/styles/app.css",
  "./poster-builder/src/styles/gateway.css",
  "./poster-builder/src/styles/admin.css",

  // ── פוסטר — פונטים ────────────────────────────────────────────────────────
  "./poster-builder/assets/fonts/Alef-bold.ttf",
  "./poster-builder/assets/fonts/Alef-bold.woff",
  "./poster-builder/assets/fonts/Alef-regular.ttf",
  "./poster-builder/assets/fonts/Alice-Regular.ttf",
  "./poster-builder/assets/fonts/Choco.otf",
  "./poster-builder/assets/fonts/GveretLevin-Regular.ttf",
  "./poster-builder/assets/fonts/IBMPlexSansHebrew-Bold.ttf",
  "./poster-builder/assets/fonts/IBMPlexSansHebrew-ExtraLight.ttf",
  "./poster-builder/assets/fonts/IBMPlexSansHebrew-Medium.ttf",
  "./poster-builder/assets/fonts/IBMPlexSansHebrew-Regular.ttf",
  "./poster-builder/assets/fonts/yehudaclm-bold-webfont.ttf",
  "./poster-builder/assets/fonts/yehudaclm-bold-webfont.woff",

  // ── פוסטר — כפתורי שם פונט ────────────────────────────────────────────────
  "./poster-builder/assets/fonts/namebutton/ALEF.png",
  "./poster-builder/assets/fonts/namebutton/ALICE.png",
  "./poster-builder/assets/fonts/namebutton/CHOCO.png",
  "./poster-builder/assets/fonts/namebutton/GVERET.png",
  "./poster-builder/assets/fonts/namebutton/IBM.png",
  "./poster-builder/assets/fonts/namebutton/YEHUDA.png",

  // ── פוסטר — רקעים ────────────────────────────────────────────────────────
  "./poster-builder/assets/backgrounds/bg-tech1.svg",
  "./poster-builder/assets/backgrounds/bg-tech2.svg",
  "./poster-builder/assets/backgrounds/bg-tech3.svg",
  "./poster-builder/assets/backgrounds/bg-tech4.svg",
  "./poster-builder/assets/backgrounds/bg-tech5.svg",
  "./poster-builder/assets/backgrounds/bg-tech6.svg",
  "./poster-builder/assets/backgrounds/bg-tech7.svg",
  "./poster-builder/assets/backgrounds/bg-tech8.svg",
  "./poster-builder/assets/backgrounds/bg-tech9.svg",
  "./poster-builder/assets/backgrounds/bg-tech10.svg",
  "./poster-builder/assets/backgrounds/bg-tech11.svg",

  // ── פוסטר — אייקוני PI ────────────────────────────────────────────────────
  "./poster-builder/assets/pi/aud.svg",
  "./poster-builder/assets/pi/fb.svg",
  "./poster-builder/assets/pi/imp.svg",
  "./poster-builder/assets/pi/ins.svg",
  "./poster-builder/assets/pi/prob.svg",
  "./poster-builder/assets/pi/prod.svg",
  "./poster-builder/assets/pi/req.svg",
  "./poster-builder/assets/pi/res.svg",
  "./poster-builder/assets/pi/rq.svg",
  "./poster-builder/assets/pi/sol.svg",
  "./poster-builder/assets/pi/use.svg",
  "./poster-builder/assets/pi/val.svg",

  // ── פוסטר — לוגו ועצמים ───────────────────────────────────────────────────
  "./poster-builder/assets/logoposter.svg",
  "./poster-builder/btn-prd-poster/app-btn.png",
  "./poster-builder/btn-prd-poster/dig-btn.png",
  "./poster-builder/btn-prd-poster/phy-btn.png",

  // ── פוסטר — אלמנטים (אייקונים 1-56) ──────────────────────────────────────
  "./poster-builder/assets/elements/icon1.png",
  "./poster-builder/assets/elements/icon2.png",
  "./poster-builder/assets/elements/icon3.png",
  "./poster-builder/assets/elements/icon4.png",
  "./poster-builder/assets/elements/icon5.png",
  "./poster-builder/assets/elements/icon6.png",
  "./poster-builder/assets/elements/icon7.png",
  "./poster-builder/assets/elements/icon8.png",
  "./poster-builder/assets/elements/icon9.png",
  "./poster-builder/assets/elements/icon10.png",
  "./poster-builder/assets/elements/icon11.png",
  "./poster-builder/assets/elements/icon12.png",
  "./poster-builder/assets/elements/icon13.png",
  "./poster-builder/assets/elements/icon14.png",
  "./poster-builder/assets/elements/icon15.png",
  "./poster-builder/assets/elements/icon16.png",
  "./poster-builder/assets/elements/icon17.png",
  "./poster-builder/assets/elements/icon18.png",
  "./poster-builder/assets/elements/icon19.png",
  "./poster-builder/assets/elements/icon20.png",
  "./poster-builder/assets/elements/icon21.png",
  "./poster-builder/assets/elements/icon22.png",
  "./poster-builder/assets/elements/icon23.png",
  "./poster-builder/assets/elements/icon24.png",
  "./poster-builder/assets/elements/icon25.png",
  "./poster-builder/assets/elements/icon26.png",
  "./poster-builder/assets/elements/icon27.png",
  "./poster-builder/assets/elements/icon28.png",
  "./poster-builder/assets/elements/icon29.png",
  "./poster-builder/assets/elements/icon30.png",
  "./poster-builder/assets/elements/icon31.png",
  "./poster-builder/assets/elements/icon32.png",
  "./poster-builder/assets/elements/icon33.png",
  "./poster-builder/assets/elements/icon34.png",
  "./poster-builder/assets/elements/icon35.png",
  "./poster-builder/assets/elements/icon36.png",
  "./poster-builder/assets/elements/icon37.png",
  "./poster-builder/assets/elements/icon38.png",
  "./poster-builder/assets/elements/icon39.png",
  "./poster-builder/assets/elements/icon40.png",
  "./poster-builder/assets/elements/icon41.png",
  "./poster-builder/assets/elements/icon42.png",
  "./poster-builder/assets/elements/icon43.png",
  "./poster-builder/assets/elements/icon44.png",
  "./poster-builder/assets/elements/icon45.png",
  "./poster-builder/assets/elements/icon46.png",
  "./poster-builder/assets/elements/icon47.png",
  "./poster-builder/assets/elements/icon48.png",
  "./poster-builder/assets/elements/icon49.png",
  "./poster-builder/assets/elements/icon50.png",
  "./poster-builder/assets/elements/icon51.png",
  "./poster-builder/assets/elements/icon52.png",
  "./poster-builder/assets/elements/icon53.png",
  "./poster-builder/assets/elements/icon54.png",
  "./poster-builder/assets/elements/icon55.png",
  "./poster-builder/assets/elements/icon56.png",
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

  // כל נתיב /api/* חייב תמיד לרוץ מול השרת — לעולם לא לשמור ב-cache
  if (url.pathname.startsWith("/api/")) return;

  // בקשות חיצוניות (CDN, Firebase, Supabase וכד') — לא מטפלים
  if (url.origin !== self.location.origin) return;

  // env.js — תמיד מהרשת (מכיל משתנים דינמיים מהשרת)
  if (url.pathname.endsWith("/env.js")) return;

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

  // כל בקשה אחרת — ישירות לרשת
});
