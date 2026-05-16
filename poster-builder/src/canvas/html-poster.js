const POSTER_WIDTH_PX = 794;
const POSTER_HEIGHT_PX = 1123;
const IMG_HEIGHTS     = { app: 270, physical: 220, website: 185, digital: 185 };
const IMG_MIN_HEIGHTS = { app: 95,  physical: 90,  website: 75,  digital: 75  };
const POSTER_ICON_BASE = '/poster-builder/assets/pi/';
const posterIconCache = new Map();

export function renderHTMLPoster(contentValues, productType, titleFont, titleColor, textColor, background, slotImages, _schoolLogoImage) {
  // Support legacy calls that pass (background, slotImages) after titleColor.
  if (slotImages === undefined && background && typeof background === 'object') {
    slotImages = background;
    background = textColor;
    textColor = null;
  }

  // ── Background — reuse existing <img> to avoid forced reload ────────────────
  const bgEl = document.getElementById('poster-bg');
  if (bgEl) {
    if (background) {
      let bgImg = bgEl.querySelector('img');
      if (!bgImg) {
        bgEl.innerHTML = '';
        bgImg = document.createElement('img');
        bgImg.crossOrigin = 'anonymous';
        bgImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        bgEl.appendChild(bgImg);
      }
      if (bgImg.getAttribute('src') !== background) bgImg.src = background;
    } else {
      bgEl.innerHTML = '';
    }
  }

  // Keep the legacy parameter for backwards-compatible callers, but do not render
  // a separate school logo on the poster.
  void _schoolLogoImage;

  const setText = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = (t || '').trim(); };
  const setList = (id, items) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.innerHTML = (items || []).filter(i => (i || '').trim()).map(i => `<li>${i.trim()}</li>`).join('');
  };

  // ── Theme tokens (CSS custom properties cascade to pseudo-elements) ─────────
  const resolvedTitle  = titleColor || '#5E2750';
  const resolvedText   = textColor  || '#1f1030';
  const resolvedFont   = titleFont  || 'IBM Plex Sans Hebrew';

  const posterRoot = document.getElementById('poster-html');
  if (posterRoot) {
    posterRoot.style.setProperty('--ph-title-color', resolvedTitle);
    posterRoot.style.setProperty('--ph-text-color',  resolvedText);
    posterRoot.style.fontFamily = `'${resolvedFont}', 'IBM Plex Sans Hebrew', sans-serif`;
    applyExplicitPosterTextStyles(posterRoot);
    applyPosterIcons(posterRoot);
  }

  // ── Title font, size, colour ────────────────────────────────────────────────
  const name = (contentValues.projectName || '').trim();
  const n = document.getElementById('ph-name');
  if (n) {
    n.textContent = name || 'שם המיזם';
    n.style.fontFamily = `'${resolvedFont}', 'IBM Plex Sans Hebrew', sans-serif`;
    n.style.color      = resolvedTitle;
    const l = name.length;
    n.style.fontSize = l <= 6 ? '52px' : l <= 10 ? '44px' : l <= 15 ? '36px' : l <= 18 ? '30px' : '24px';
  }

  // ── Poster card opacity — inline editor CSS used by preview/PDF can override the shared stylesheet.
  applyPosterCardStyles(posterRoot);

  // ── Title underline — measured from the rendered title width ───────────────
  updateTitleUnderline(posterRoot, resolvedTitle);

  // ── Text fields ─────────────────────────────────────────────────────────────
  setText('ph-desc',     contentValues.description);
  setText('ph-problem',  contentValues.problem);
  setText('ph-rq',       contentValues.researchQuestion);
  setText('ph-findings', contentValues.findings);
  setText('ph-solution', contentValues.solution);
  setText('ph-value',    contentValues.value);
  setText('ph-feedback', contentValues.feedbackReceived);
  setText('ph-improved', contentValues.improvementsAfterFeedback);
  setText('ph-slogan',   contentValues.slogan || '');
  setText('ph-audience', (contentValues.audience || '').trim()
    ? `👥 ${(contentValues.audience || '').trim()}` : '');
  setText('ph-names',
    ['student1', 'student2', 'student3']
      .map(k => (contentValues[k] || '').trim()).filter(Boolean).join(' · ') || '—');
  setText('ph-school',
    [contentValues.className, contentValues.schoolName].filter(Boolean).join(' | '));

  setList('ph-research', [contentValues.research_1, contentValues.research_2, contentValues.research_3]);
  setList('ph-reqs',     [contentValues.requirements_1, contentValues.requirements_2, contentValues.requirements_3]);
  setList('ph-usage',    [contentValues.howItWorks_1, contentValues.howItWorks_2, contentValues.howItWorks_3]);

  // ── Card captions (titleColor) ───────────────────────────────────────────────
  setText('ph-solution-cap',
    { physical: 'המוצר שלנו', website: 'האתר שלנו', app: 'האפליקציה שלנו', digital: 'המוצר הדיגיטלי שלנו' }[productType] || 'הפתרון שלנו');
  setText('ph-usage-cap',
    { physical: 'איך משתמשים', website: 'מה עושים באתר', app: 'איך זה עובד', digital: 'איך זה עובד' }[productType] || 'איך זה עובד');
  setText('ph-images-label',
    { physical: 'המוצר שלנו', app: 'מסכי האפליקציה', website: 'מסכי האתר', digital: 'מוצר דיגיטלי' }[productType] || '');

  const resolvedFontStack = `'${resolvedFont}', 'IBM Plex Sans Hebrew', sans-serif`;

  // ── Apply textColor + font to regular body / bullet elements ─────────────────
  document.querySelectorAll('.ph-body, .ph-sub').forEach(el => {
    if (el.closest('.ph-card-accent')) return; // accent cards handled below
    el.style.color      = resolvedText;
    el.style.fontWeight = '400';
    el.style.fontFamily = resolvedFontStack;
  });
  document.querySelectorAll('.ph-bullets li').forEach(el => {
    el.style.color      = resolvedText;
    el.style.fontWeight = '400';
    el.style.fontFamily = resolvedFontStack;
  });
  document.querySelectorAll('#ph-names, #ph-school').forEach(el => {
    el.style.color      = resolvedText;
    el.style.fontWeight = '400';
    el.style.fontFamily = resolvedFontStack;
  });

  // ── ph-desc: larger, bold, themed, subtle background ────────────────────────
  const descEl = document.getElementById('ph-desc');
  if (descEl) {
    descEl.style.color        = resolvedText;
    descEl.style.fontWeight   = '700';
    descEl.style.fontSize     = '15px';
    descEl.style.fontFamily   = resolvedFontStack;
    descEl.style.background   = 'rgba(255,255,255,0.72)';
    descEl.style.padding      = '6px 12px';
    descEl.style.borderRadius = '10px';
    descEl.style.display      = 'inline-block';
  }

  // ── Accent card bodies → title color with regular answer weight ──────────────
  document.querySelectorAll('.ph-card-accent .ph-body').forEach(el => {
    el.style.color      = resolvedTitle;
    el.style.fontWeight = '400';
    el.style.fontFamily = resolvedFontStack;
  });

  // ── Apply titleColor + font to .ph-cap, ph-images-label ─────────────────────
  document.querySelectorAll('.ph-cap').forEach(el => {
    el.style.color      = resolvedTitle;
    el.style.fontFamily = resolvedFontStack;
  });
  const imagesLabel = document.getElementById('ph-images-label');
  if (imagesLabel) imagesLabel.style.color = resolvedTitle;

  // ── Footer background based on titleColor ────────────────────────────────────
  const footer = document.getElementById('ph-footer');
  if (footer) {
    // darken the chosen color slightly for the gradient
    footer.style.background = `linear-gradient(135deg, ${_darken(resolvedTitle, 25)}, ${resolvedTitle}, ${_shiftHue(resolvedTitle, 40)})`;
  }

  // ── Image grids ──────────────────────────────────────────────────────────────
  const imgGrid2   = document.getElementById('ph-images-2');
  const imgGridApp = document.getElementById('ph-images-app');
  const imgGridWeb = document.getElementById('ph-images-web');
  if (imgGrid2)   imgGrid2.style.display   = productType === 'physical' ? 'grid' : 'none';
  if (imgGridApp) imgGridApp.style.display = productType === 'app'      ? 'grid' : 'none';
  if (imgGridWeb) imgGridWeb.style.display = (productType === 'website' || productType === 'digital') ? 'grid' : 'none';

  const frameRatio  = { app: '9 / 16', physical: '4 / 3', website: '16 / 9', digital: '16 / 9' }[productType] || '16 / 9';
  const layoutKey   = productType === 'digital' ? 'website' : productType;
  const objectFit   = 'contain';
  const keys        = productType === 'physical' ? ['visual_1', 'visual_2'] : ['visual_1', 'visual_2', 'visual_3'];

  const fixedImgHeight = IMG_HEIGHTS[productType] || 145;
  document.querySelectorAll(`[data-ph-img][data-layout="${layoutKey}"]`).forEach(frame => {
    frame.style.height = `${fixedImgHeight}px`;
    frame.style.removeProperty('aspect-ratio');
  });

  keys.forEach((k, i) => {
    document.querySelectorAll(`[data-ph-img="${i}"][data-layout="${layoutKey}"]`).forEach(frame => {
      if (slotImages[k]) {
        // Reuse existing <img> — only update src when content actually changed
        let img = frame.querySelector('img');
        if (!img) {
          frame.innerHTML = '';
          img = document.createElement('img');
          img.alt = `תמונה ${i + 1}`;
          img.crossOrigin = 'anonymous';
          img.style.cssText = 'max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;margin:auto;';
          frame.appendChild(img);
        }
        if (img.getAttribute('src') !== slotImages[k]) img.src = slotImages[k];
      } else {
        // Only replace DOM if there was an image before (avoids churn on placeholder)
        if (frame.querySelector('img')) {
          frame.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;color:#c8a8c0;font-size:10px;width:100%;height:100%;">תמונה ${i + 1}</div>`;
        } else if (!frame.hasChildNodes()) {
          frame.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;color:#c8a8c0;font-size:10px;width:100%;height:100%;">תמונה ${i + 1}</div>`;
        }
      }
    });
  });

  schedulePosterFit(posterRoot, resolvedTitle);
}

function schedulePosterFit(posterRoot, titleColor) {
  if (!posterRoot) return;
  const fit = () => {
    updateTitleUnderline(posterRoot, titleColor);
    fitPosterToPage(posterRoot, titleColor);
  };

  requestAnimationFrame(() => {
    fit();
    requestAnimationFrame(fit);
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      updateTitleUnderline(posterRoot, titleColor);
      fitPosterToPage(posterRoot, titleColor);
    });
  }
}

function applyPosterIcons(posterRoot) {
  const root = posterRoot || document;
  root.querySelectorAll?.('[data-icon]').forEach((el) => {
    const iconName = (el.getAttribute('data-icon') || '').trim();
    if (!iconName) return;

    const iconUrl = `${POSTER_ICON_BASE}${iconName}.svg`;
    el.style.setProperty('--ph-icon-url', `url("${iconUrl}")`);

    if (posterIconCache.get(iconUrl) === true) {
      el.setAttribute('data-icon-ok', 'true');
      return;
    }
    if (posterIconCache.get(iconUrl) === false) {
      el.removeAttribute('data-icon-ok');
      return;
    }

    const img = new Image();
    img.onload = () => {
      posterIconCache.set(iconUrl, true);
      root.querySelectorAll?.(`[data-icon="${iconName}"]`).forEach((iconEl) => {
        iconEl.setAttribute('data-icon-ok', 'true');
      });
    };
    img.onerror = () => {
      posterIconCache.set(iconUrl, false);
      el.removeAttribute('data-icon-ok');
    };
    img.src = iconUrl;
  });
}

function applyPosterCardStyles(posterRoot) {
  const root = posterRoot || document;
  root.querySelectorAll?.('.ph-card').forEach((card) => {
    card.style.background = 'rgba(255, 255, 255, 0.98)';
  });
  root.querySelectorAll?.('.ph-card-accent').forEach((card) => {
    card.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.99), rgba(250, 244, 255, 0.98))';
  });
  const team = root.querySelector?.('#ph-team') || document.getElementById('ph-team');
  if (team) team.style.background = 'rgba(255, 255, 255, 0.98)';
}

function updateTitleUnderline(posterRoot, titleColor) {
  const root = posterRoot || document;
  const titleEl = root.querySelector?.('#ph-name') || document.getElementById('ph-name');
  const line = root.querySelector?.('#ph-title-line') || document.getElementById('ph-title-line');
  if (!titleEl || !line) return;

  const measure = () => {
    if (titleColor) line.style.background = `linear-gradient(90deg, ${titleColor}, #d61f8c)`;
    const width = titleEl.getBoundingClientRect().width;
    line.style.width = `${Math.min(width, 620)}px`;
    line.style.marginInline = 'auto';
  };

  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(measure);
  measure();

  if (document.fonts?.ready) {
    document.fonts.ready.then(measure).catch(() => {});
  }
}

function fitPosterToPage(posterRoot, titleColor) {
  applyPosterCardStyles(posterRoot);
  updateTitleUnderline(posterRoot, titleColor);

  if (!isPosterOverflowing(posterRoot)) return;

  const appGrid  = posterRoot.querySelector('#ph-images-app');
  const physGrid = posterRoot.querySelector('#ph-images-2');
  const isApp      = appGrid  && appGrid.style.display  !== 'none';
  const isPhysical = physGrid && physGrid.style.display !== 'none';
  const productKey = isApp ? 'app' : isPhysical ? 'physical' : 'website';
  const minHeight  = IMG_MIN_HEIGHTS[productKey];

  const frames = [...posterRoot.querySelectorAll('.ph-img-frame[data-ph-img]')]
    .filter(f => f.offsetParent !== null);
  if (!frames.length) return;

  let currentHeight = frames[0].getBoundingClientRect().height || IMG_HEIGHTS[productKey];

  while (isPosterOverflowing(posterRoot) && currentHeight - 12 >= minHeight) {
    currentHeight -= 12;
    frames.forEach(frame => { frame.style.height = `${currentHeight}px`; });
    updateTitleUnderline(posterRoot, titleColor);
  }
}

function isPosterOverflowing(posterRoot) {
  const footer = posterRoot.querySelector('#ph-footer');
  const rootRect = posterRoot.getBoundingClientRect();
  const a4Bottom = rootRect.top + POSTER_HEIGHT_PX;

  // True overflow: poster scroll height exceeds A4
  if (posterRoot.scrollHeight > POSTER_HEIGHT_PX + 1) return true;

  const contentEls = [...posterRoot.querySelectorAll('.ph-card, .ph-img-frame')];

  // Any content element visually below A4 bottom
  if (contentEls.some(el => el.getBoundingClientRect().bottom > a4Bottom + 1)) return true;

  // Any content element intruding into footer space
  // (ph-main touching footer is intentional and not overflow)
  if (footer) {
    const footerTop = footer.getBoundingClientRect().top;
    if (contentEls.some(el => el.getBoundingClientRect().bottom > footerTop + 1)) return true;
  }

  return false;
}

// ── Colour helpers ────────────────────────────────────────────────────────────
function _hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function _rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function _darken(hex, amt) {
  try { const [r, g, b] = _hexToRgb(hex); return _rgbToHex(r - amt, g - amt, b - amt); } catch { return hex; }
}
function _shiftHue(hex, deg) {
  try {
    let [r, g, b] = _hexToRgb(hex).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = max ? d / max : 0, v = max;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + deg + 360) % 360;
    }
    const i = Math.floor(h / 60), f = h / 60 - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
    const rgb = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i % 6];
    return _rgbToHex(...rgb.map(c => c * 255));
  } catch { return hex; }
}

// Raster capture is intentionally kept for PNG diagnostics only.
// The final print-shop PDF export must use the browser print pipeline so text/SVG stay vector-sharp.
const RASTER_DEBUG_SCRIPT_URLS = {
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
};
// Scale only increases debug bitmap quality; capture dimensions stay exactly as rendered.
const PNG_DEBUG_EXPORT_SCALE = Math.max(3, Math.min(window.devicePixelRatio || 1, 4));
const PDF_DEBUG_PNG_PARAM = 'debugPdfPng';
const PDF_DEBUG_PNG_FLAG = '__POSTER_PDF_DEBUG_DOWNLOAD_PNG';
const POSTER_RTL_SELECTOR = [
  '#poster-html',
  '#poster-inner',
  '.ph-card',
  '.ph-cap',
  '.ph-body',
  '.ph-sub',
  '.ph-bullets',
  '.ph-bullets li',
  '#ph-name',
  '#ph-desc',
  '#ph-names',
  '#ph-school',
  '#ph-slogan'
].join(',');
const POSTER_TEXT_STYLE_PROPERTIES = [
  'direction',
  'unicode-bidi',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'font-kerning',
  'font-feature-settings',
  'font-variant-ligatures',
  'letter-spacing',
  'line-height',
  'overflow-wrap',
  'text-align',
  'text-align-last',
  'text-decoration',
  'text-transform',
  'white-space',
  'word-break',
  'word-spacing',
  'writing-mode'
];

function loadPdfScript(globalCheck, src) {
  if (globalCheck()) return Promise.resolve();
  const existing = [...document.scripts].find((script) => script.src === src);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load PDF dependency: ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureRasterDebugDependencies() {
  await loadPdfScript(() => typeof window.html2canvas === 'function', RASTER_DEBUG_SCRIPT_URLS.html2canvas);
  if (typeof window.html2canvas !== 'function') {
    throw new Error('PNG debug dependency is not available');
  }
}

function waitForAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitForPosterImage(img) {
  if (!img) return;
  if (typeof img.decode === 'function') {
    try {
      await img.decode();
      return;
    } catch {
      // Fall back to load/error handlers below. Some browsers reject decode() for SVG/data images.
    }
  }
  if (img.complete && img.naturalWidth !== 0) return;
  await new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
  });
}

async function waitForPosterAssets(poster) {
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all([...poster.querySelectorAll('img')].map(waitForPosterImage));
  await waitForAnimationFrame();
  await waitForAnimationFrame();
}


function applyExplicitPosterTextStyles(poster) {
  if (!poster) return;

  poster.style.direction = 'rtl';
  poster.style.unicodeBidi = 'isolate';

  poster.querySelectorAll(POSTER_RTL_SELECTOR).forEach((el) => {
    const computed = window.getComputedStyle(el);
    el.style.direction = 'rtl';
    el.style.unicodeBidi = el === poster ? 'isolate' : 'plaintext';
    el.style.fontFamily = computed.fontFamily;
    el.style.textAlign = computed.textAlign;
    el.style.whiteSpace = computed.whiteSpace;
    el.style.lineHeight = computed.lineHeight;
  });
}

function getPosterVisibilityIssue(poster) {
  if (!poster) return 'לא נמצא האלמנט #poster-html.';
  if (poster.id !== 'poster-html') return 'האלמנט שנשלח לייצוא אינו #poster-html.';
  if (!poster.isConnected) return '#poster-html אינו מחובר למסמך.';

  const rect = poster.getBoundingClientRect();
  const width = rect.width || poster.offsetWidth;
  const height = rect.height || poster.offsetHeight;
  if (width <= 0 || height <= 0) return '#poster-html במידות 0 ולכן לא ניתן לצלם אותו.';

  const ownerWindow = poster.ownerDocument?.defaultView || window;
  for (let el = poster; el && el.nodeType === 1; el = el.parentElement) {
    const computed = ownerWindow.getComputedStyle(el);
    if (computed.display === 'none') return `#poster-html או אחד ההורים שלו מוסתר עם display:none (${el.id || el.className || el.tagName}).`;
    if (computed.visibility === 'hidden' || computed.visibility === 'collapse') return `#poster-html או אחד ההורים שלו מוסתר עם visibility:hidden (${el.id || el.className || el.tagName}).`;
    if (Number(computed.opacity) === 0) return `#poster-html או אחד ההורים שלו מוסתר עם opacity:0 (${el.id || el.className || el.tagName}).`;
  }

  return '';
}

function assertOriginalPosterReadyForExport(poster) {
  const currentPoster = document.getElementById('poster-html');
  if (!currentPoster) throw new Error('ייצוא PDF נכשל: לא נמצא #poster-html במסך.');
  if (poster !== currentPoster) throw new Error('ייצוא PDF נכשל: הפוסטר שנשלח לייצוא אינו #poster-html הפעיל במסך.');

  const visibilityIssue = getPosterVisibilityIssue(poster);
  if (visibilityIssue) throw new Error(`ייצוא PDF נכשל: ${visibilityIssue}`);
}

function assertClonedPosterReadyForCapture(clonedPoster) {
  if (!clonedPoster) throw new Error('ייצוא PDF נכשל: לא נוצר clone ל-#poster-html.');
  if (clonedPoster.id !== 'poster-html') throw new Error('ייצוא PDF נכשל: ה-clone שנשלח לצילום אינו #poster-html.');
  if (clonedPoster.dataset.posterExportClone !== '1') {
    throw new Error('ייצוא PDF נכשל: ניסיון לצלם פוסטר שאינו עותק הייצוא הנקי.');
  }

  const visibilityIssue = getPosterVisibilityIssue(clonedPoster);
  if (visibilityIssue) throw new Error(`ייצוא PDF נכשל: clone לא תקין - ${visibilityIssue}`);
}

function copyComputedStyles(source, target) {
  if (!source || !target) return;

  const computed = window.getComputedStyle(source);
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed[index];
    target.style.setProperty(property, computed.getPropertyValue(property));
  }

  const sourceChildren = [...source.children];
  const targetChildren = [...target.children];
  sourceChildren.forEach((sourceChild, index) => {
    copyComputedStyles(sourceChild, targetChildren[index]);
  });
}

function applyFixedExportBoxStyles(element) {
  if (!element) return;
  element.style.width = `${POSTER_WIDTH_PX}px`;
  element.style.height = `${POSTER_HEIGHT_PX}px`;
  element.style.minHeight = `${POSTER_HEIGHT_PX}px`;
  element.style.maxHeight = `${POSTER_HEIGHT_PX}px`;
  element.style.transform = 'none';
  element.style.overflow = 'hidden';
  element.style.background = '#ffffff';
  element.style.boxShadow = 'none';
  element.style.direction = 'rtl';
  element.style.unicodeBidi = 'isolate';
}

function applyComputedTextStylesToClone(originalPoster, clonedPoster) {
  if (!originalPoster || !clonedPoster) return;

  const originalTextElements = [originalPoster, ...originalPoster.querySelectorAll('*')];
  const clonedTextElements = [clonedPoster, ...clonedPoster.querySelectorAll('*')];

  originalTextElements.forEach((sourceEl, index) => {
    const targetEl = clonedTextElements[index];
    if (!targetEl) return;

    const hasText = [...sourceEl.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    const isKnownTextElement = sourceEl.matches?.(POSTER_RTL_SELECTOR);
    if (!hasText && !isKnownTextElement) return;

    const computed = window.getComputedStyle(sourceEl);
    targetEl.style.direction = 'rtl';
    targetEl.style.unicodeBidi = targetEl === clonedPoster ? 'isolate' : 'plaintext';
    for (const property of POSTER_TEXT_STYLE_PROPERTIES) {
      targetEl.style.setProperty(property, computed.getPropertyValue(property));
    }
  });
}

function lockCloneForA4Export(originalPoster, clonedPoster) {
  copyComputedStyles(originalPoster, clonedPoster);
  applyFixedExportBoxStyles(clonedPoster);
  clonedPoster.dataset.posterExportClone = '1';
  clonedPoster.style.position = 'fixed';
  clonedPoster.style.left = '-10000px';
  clonedPoster.style.top = '0';
  clonedPoster.style.margin = '0';
  clonedPoster.style.display = 'block';
  clonedPoster.style.visibility = 'visible';
  clonedPoster.style.opacity = '1';

  const clonedInner = clonedPoster.querySelector('#poster-inner');
  const originalInner = originalPoster.querySelector('#poster-inner');
  if (clonedInner && originalInner) copyComputedStyles(originalInner, clonedInner);

  clonedPoster.querySelectorAll('#poster-html, #poster-inner').forEach((el) => {
    el.style.transform = 'none';
    el.style.boxShadow = 'none';
    el.style.direction = 'rtl';
    el.style.unicodeBidi = 'isolate';
  });

  applyComputedTextStylesToClone(originalPoster, clonedPoster);
}

function createPosterExportClone(originalPoster) {
  assertOriginalPosterReadyForExport(originalPoster);

  const container = document.createElement('div');
  container.dataset.posterExportContainer = '1';
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${POSTER_WIDTH_PX}px`;
  container.style.height = `${POSTER_HEIGHT_PX}px`;
  container.style.minHeight = `${POSTER_HEIGHT_PX}px`;
  container.style.maxHeight = `${POSTER_HEIGHT_PX}px`;
  container.style.transform = 'none';
  container.style.overflow = 'hidden';
  container.style.background = '#ffffff';
  container.style.boxShadow = 'none';
  container.style.direction = 'rtl';
  container.style.unicodeBidi = 'isolate';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '0';

  const clonedPoster = originalPoster.cloneNode(true);
  container.appendChild(clonedPoster);
  document.body.appendChild(container);

  lockCloneForA4Export(originalPoster, clonedPoster);
  applyPosterCardStyles(clonedPoster);
  updateTitleUnderline(clonedPoster);

  return { container, clonedPoster };
}

function isCanvasEmptyOrWhite(canvas) {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return true;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return true;

  const sampleColumns = Math.min(80, canvas.width);
  const sampleRows = Math.min(80, canvas.height);
  const stepX = Math.max(1, Math.floor(canvas.width / sampleColumns));
  const stepY = Math.max(1, Math.floor(canvas.height / sampleRows));
  let coloredPixels = 0;
  let sampledPixels = 0;

  try {
    for (let y = 0; y < canvas.height; y += stepY) {
      for (let x = 0; x < canvas.width; x += stepX) {
        const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
        sampledPixels += 1;
        const transparent = alpha === 0;
        const white = alpha > 0 && red >= 248 && green >= 248 && blue >= 248;
        if (!transparent && !white) coloredPixels += 1;
        if (coloredPixels >= 8) return false;
      }
    }
  } catch (error) {
    console.warn('Could not inspect poster canvas pixels before PDF export', error);
    return false;
  }

  return sampledPixels > 0 && coloredPixels === 0;
}

function assertCanvasHasDimensions(canvas) {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
    throw new Error('ייצוא PNG debug נכשל: html2canvas החזיר canvas ריק או במידות 0.');
  }
}

function assertCanvasReadyForExport(canvas) {
  assertCanvasHasDimensions(canvas);
  if (isCanvasEmptyOrWhite(canvas)) {
    throw new Error('ייצוא PNG debug הופסק: התמונה שנוצרה ריקה/לבנה.');
  }
}

function showPosterExportError(error) {
  const message = error instanceof Error ? error.message : String(error || 'שגיאה לא ידועה בייצוא.');
  console.error('Poster export failed', error);
  if (typeof window.alert === 'function') window.alert(message);
}

function shouldDownloadDebugPng() {
  if (window[PDF_DEBUG_PNG_FLAG]) return true;
  try {
    return new URLSearchParams(window.location.search).get(PDF_DEBUG_PNG_PARAM) === '1';
  } catch {
    return false;
  }
}

function downloadCanvasPng(canvas, filename) {
  if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function capturePosterToCanvas(clonedPoster) {
  assertClonedPosterReadyForCapture(clonedPoster);
  await waitForPosterAssets(clonedPoster);

  const canvas = await window.html2canvas(clonedPoster, {
    scale: PNG_DEBUG_EXPORT_SCALE,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    width: POSTER_WIDTH_PX,
    height: POSTER_HEIGHT_PX,
    windowWidth: POSTER_WIDTH_PX,
    windowHeight: POSTER_HEIGHT_PX,
    scrollX: 0,
    scrollY: 0,
    foreignObjectRendering: false,
    imageTimeout: 15000
  });

  assertCanvasHasDimensions(canvas);
  return canvas;
}

function buildSafePosterFilename(extension) {
  const projectName = document.getElementById('ph-name')?.textContent?.trim() || 'פוסטר';
  const safeTitle = projectName
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safeTitle || 'פוסטר'}.${extension}`;
}

function buildPosterPngFilename() {
  return buildSafePosterFilename('png');
}

export async function printPoster() {
  const poster = document.getElementById('poster-html');
  if (!poster) return;
  await waitForPosterAssets(poster);
  updateTitleUnderline(poster);
  fitPosterToPage(poster);
  await waitForAnimationFrame();

  document.body.classList.add('printing-poster');
  try {
    if (typeof window.print !== 'function') throw new Error('window.print is not available');
    window.print();
  } finally {
    setTimeout(() => document.body.classList.remove('printing-poster'), 1000);
  }
}

export async function exportHTMLPosterDebugPng() {
  const poster = document.getElementById('poster-html');
  if (!poster) {
    showPosterExportError(new Error('ייצוא PNG debug נכשל: לא נמצא #poster-html במסך.'));
    return;
  }

  let exportContainer = null;
  try {
    await ensureRasterDebugDependencies();
    assertOriginalPosterReadyForExport(poster);
    await waitForPosterAssets(poster);
    updateTitleUnderline(poster);
    applyExplicitPosterTextStyles(poster);

    const { container, clonedPoster } = createPosterExportClone(poster);
    exportContainer = container;
    await waitForPosterAssets(clonedPoster);

    const canvas = await capturePosterToCanvas(clonedPoster);
    assertCanvasReadyForExport(canvas);
    downloadCanvasPng(canvas, buildPosterPngFilename());
  } catch (error) {
    showPosterExportError(error);
  } finally {
    exportContainer?.remove();
  }
}

export async function exportHTMLPosterToPDF() {
  try {
    await printPoster();

    if (shouldDownloadDebugPng()) {
      await exportHTMLPosterDebugPng();
    }
  } catch (error) {
    showPosterExportError(error);
  }
}
