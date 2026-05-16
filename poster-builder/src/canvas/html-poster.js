const POSTER_WIDTH_PX = 794;
const POSTER_HEIGHT_PX = 1123;
const IMG_HEIGHTS     = { app: 270, physical: 220, website: 185, digital: 185 };
const IMG_MIN_HEIGHTS = { app: 95,  physical: 90,  website: 75,  digital: 75  };

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

const PDF_SCRIPT_URLS = {
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
};
const PDF_A4_MM = { width: 210, height: 297 };
// Scale only increases bitmap quality; capture dimensions stay exactly as rendered.
const PDF_EXPORT_SCALE = Math.max(3, Math.min(window.devicePixelRatio || 1, 4));
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

async function ensurePdfDependencies() {
  await loadPdfScript(() => typeof window.html2canvas === 'function', PDF_SCRIPT_URLS.html2canvas);
  await loadPdfScript(() => Boolean(window.jspdf?.jsPDF), PDF_SCRIPT_URLS.jspdf);
  if (typeof window.html2canvas !== 'function' || !window.jspdf?.jsPDF) {
    throw new Error('PDF dependencies are not available');
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

function preserveRenderedPosterInClone(originalPoster, clonedDocument) {
  const clonedPoster = clonedDocument.getElementById('poster-html');
  if (!originalPoster || !clonedPoster) return;

  copyComputedStyles(originalPoster, clonedPoster);
  const clonedInner = clonedDocument.getElementById('poster-inner');
  if (clonedInner) copyComputedStyles(originalPoster.querySelector('#poster-inner'), clonedInner);

  clonedPoster.style.direction = 'rtl';
  clonedPoster.style.unicodeBidi = 'isolate';
  clonedPoster.style.width = `${originalPoster.offsetWidth || POSTER_WIDTH_PX}px`;
  clonedPoster.style.height = `${originalPoster.offsetHeight || POSTER_HEIGHT_PX}px`;
  clonedPoster.style.minHeight = `${originalPoster.offsetHeight || POSTER_HEIGHT_PX}px`;
  clonedPoster.style.maxHeight = `${originalPoster.offsetHeight || POSTER_HEIGHT_PX}px`;

  clonedPoster.querySelectorAll(POSTER_RTL_SELECTOR).forEach((el) => {
    const computed = clonedDocument.defaultView.getComputedStyle(el);
    el.style.direction = 'rtl';
    el.style.unicodeBidi = el === clonedPoster ? 'isolate' : 'plaintext';
    for (const property of POSTER_TEXT_STYLE_PROPERTIES) {
      el.style.setProperty(property, computed.getPropertyValue(property));
    }
  });
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

async function capturePosterToCanvas(poster) {
  const posterWidth = poster.offsetWidth || POSTER_WIDTH_PX;
  const posterHeight = poster.offsetHeight || POSTER_HEIGHT_PX;
  return window.html2canvas(poster, {
    scale: PDF_EXPORT_SCALE,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    width: posterWidth,
    height: posterHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    foreignObjectRendering: true,
    imageTimeout: 15000,
    onclone: (clonedDocument) => preserveRenderedPosterInClone(poster, clonedDocument)
  });
}

function buildSafePosterFilename(extension) {
  const projectName = document.getElementById('ph-name')?.textContent?.trim() || 'פוסטר';
  const safeTitle = projectName
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safeTitle || 'פוסטר'}.${extension}`;
}

function buildPosterPdfFilename() {
  return buildSafePosterFilename('pdf');
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

export async function exportHTMLPosterToPDF() {
  const poster = document.getElementById('poster-html');
  if (!poster) return;

  await ensurePdfDependencies();
  await waitForPosterAssets(poster);
  updateTitleUnderline(poster);
  applyExplicitPosterTextStyles(poster);
  await waitForPosterAssets(poster);

  const canvas = await capturePosterToCanvas(poster);
  if (shouldDownloadDebugPng()) {
    downloadCanvasPng(canvas, buildPosterPngFilename());
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
  const imageData = canvas.toDataURL('image/png');
  pdf.addImage(imageData, 'PNG', 0, 0, PDF_A4_MM.width, PDF_A4_MM.height);

  const pageCount = typeof pdf.getNumberOfPages === 'function' ? pdf.getNumberOfPages() : 1;
  for (let page = pageCount; page > 1; page -= 1) pdf.deletePage(page);

  pdf.save(buildPosterPdfFilename());
}
