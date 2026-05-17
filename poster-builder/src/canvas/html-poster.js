const POSTER_WIDTH_PX = 794;
const POSTER_HEIGHT_PX = 1123;
const IMG_HEIGHTS     = { app: 270, physical: 220, website: 185, digital: 185 };
const APP_SCREEN_RATIO = 9 / 16;
const WEB_SCREEN_RATIO = 16 / 9;
const WEB_FRAME_WIDTH  = 205;
const IMAGE_LAYOUT_FALLBACKS = {
  physical: { fit: 'cover', height: IMG_HEIGHTS.physical, background: '#f5eef2' },
  app: { fit: 'contain', height: IMG_HEIGHTS.app, width: Math.round(IMG_HEIGHTS.app * APP_SCREEN_RATIO), background: 'linear-gradient(180deg, #fbf8fc 0%, #f0e7f5 100%)' },
  website: { fit: 'contain', height: Math.round(WEB_FRAME_WIDTH / WEB_SCREEN_RATIO), width: WEB_FRAME_WIDTH, background: 'linear-gradient(180deg, #fbf8ff 0%, #f2edf8 100%)' },
};
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
    applyPosterBackgroundBleedStyles(bgEl);
    if (background) {
      let bgImg = bgEl.querySelector('img');
      if (!bgImg) {
        bgEl.innerHTML = '';
        bgImg = document.createElement('img');
        bgImg.crossOrigin = 'anonymous';
        bgImg.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:center;display:block;';
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
    posterRoot.dataset.productType = productType || '';
    resetPosterFitState(posterRoot);
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
    n.style.fontSize = l <= 6 ? '56px' : l <= 10 ? '48px' : l <= 15 ? '39px' : l <= 18 ? '32px' : '26px';
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
  setText('ph-audience', (contentValues.audience || '').trim());
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
  const audienceEl = document.getElementById('ph-audience');
  if (audienceEl) audienceEl.style.color = resolvedTitle;

  // ── Footer background based on titleColor ────────────────────────────────────
  const footer = document.getElementById('ph-footer');
  if (footer) {
    footer.style.background = `linear-gradient(135deg, ${_darken(resolvedTitle, 18)}, ${resolvedTitle})`;
  }

  // ── Image grids ──────────────────────────────────────────────────────────────
  const imgGrid2   = document.getElementById('ph-images-2');
  const imgGridApp = document.getElementById('ph-images-app');
  const imgGridWeb = document.getElementById('ph-images-web');
  if (imgGrid2)   imgGrid2.style.display   = productType === 'physical' ? 'grid' : 'none';
  if (imgGridApp) imgGridApp.style.display = productType === 'app'      ? 'grid' : 'none';
  if (imgGridWeb) imgGridWeb.style.display = (productType === 'website' || productType === 'digital') ? 'grid' : 'none';

  const layoutKey   = productType === 'digital' ? 'website' : productType;
  const keys        = productType === 'physical' ? ['visual_1', 'visual_2'] : ['visual_1', 'visual_2', 'visual_3'];

  configureImageGrid(productType, layoutKey);

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
          frame.appendChild(img);
        }
        const imageFit = getImageLayoutConfig(productType).fit;
        img.style.cssText = `width:100% !important;height:100% !important;object-fit:${imageFit} !important;object-position:center !important;display:block !important;margin:0 !important;max-width:none !important;max-height:none !important;`;
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


function applyPosterBackgroundBleedStyles(bgEl) {
  if (!bgEl) return;
  bgEl.style.position = 'absolute';
  bgEl.style.inset = '-6px';
  bgEl.style.zIndex = '0';
  bgEl.style.overflow = 'hidden';
  bgEl.style.backgroundColor = '#f5eef8';

  const bgImg = bgEl.querySelector('img');
  if (bgImg) {
    bgImg.style.width = '100%';
    bgImg.style.height = '100%';
    bgImg.style.objectFit = 'cover';
    bgImg.style.objectPosition = 'center';
    bgImg.style.display = 'block';
  }
}

function getImageLayoutConfig(productType) {
  const normalizedType = productType === 'digital' ? 'website' : productType;
  return IMAGE_LAYOUT_FALLBACKS[normalizedType] || IMAGE_LAYOUT_FALLBACKS.website;
}

function configureImageGrid(productType, layoutKey) {
  const config = getImageLayoutConfig(productType);
  const grid = document.getElementById(
    layoutKey === 'physical' ? 'ph-images-2' : layoutKey === 'app' ? 'ph-images-app' : 'ph-images-web'
  );
  const frames = [...document.querySelectorAll(`[data-ph-img][data-layout="${layoutKey}"]`)];
  const frameCount = frames.length || (layoutKey === 'physical' ? 2 : 3);

  if (grid && config.width) {
    grid.style.gridTemplateColumns = `repeat(${frameCount}, ${config.width}px)`;
    grid.style.justifyContent = 'center';
  }

  frames.forEach(frame => {
    applyImageFrameSize(frame, layoutKey, config.height, config.width);
    frame.style.overflow = 'hidden';
    frame.style.background = config.background;
  });
}

function applyImageFrameSize(frame, layoutKey, height, width) {
  if (!frame || !height) return;
  frame.style.height = `${height}px`;
  frame.style.overflow = 'hidden';

  if (width) {
    frame.style.width = `${width}px`;
    frame.style.flex = `0 0 ${width}px`;
  } else {
    frame.style.removeProperty('width');
    frame.style.removeProperty('flex');
  }

  if (layoutKey === 'app') frame.style.aspectRatio = '9 / 16';
  else if (layoutKey === 'website') frame.style.aspectRatio = '16 / 9';
  else frame.style.removeProperty('aspect-ratio');
}

function resetPosterFitState(posterRoot) {
  if (!posterRoot) return;
  posterRoot.classList.remove('ph-space-tight', 'ph-imgfit-1', 'ph-imgfit-2', 'ph-imgfit-3', 'ph-imgfit-4', 'ph-pad-tight', 'ph-line-tight', 'ph-text-tight', 'ph-cap-tight');
  posterRoot.querySelectorAll('[data-ph-img]').forEach((frame) => {
    frame.style.removeProperty('width');
    frame.style.removeProperty('flex');
    frame.style.removeProperty('height');
    frame.style.removeProperty('aspect-ratio');
  });
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

  applyCompactPosterSpacing(posterRoot);
  updateTitleUnderline(posterRoot, titleColor);

  const fitClasses = ['ph-space-tight', 'ph-pad-tight', 'ph-line-tight', 'ph-imgfit-1', 'ph-imgfit-2', 'ph-text-tight', 'ph-imgfit-3', 'ph-cap-tight', 'ph-imgfit-4'];
  for (const className of fitClasses) {
    if (!isPosterOverflowing(posterRoot)) return;
    posterRoot.classList.add(className);
    updateTitleUnderline(posterRoot, titleColor);
  }

  shrinkActiveImageFramesToFit(posterRoot, titleColor);
}

function applyCompactPosterSpacing(posterRoot) {
  if (!posterRoot) return;

  const main = posterRoot.querySelector('#ph-main');
  if (main) main.style.setProperty('gap', '6px', 'important');

  const audienceCard = posterRoot.querySelector('.ph-audience-card');
  if (audienceCard) audienceCard.style.marginBottom = '8px';

  const imagesWrap = posterRoot.querySelector('.ph-images-wrap');
  if (imagesWrap) imagesWrap.style.marginBlock = '0 10px';

  const researchGrid = posterRoot.querySelector('.ph-grid-research');
  if (researchGrid) researchGrid.style.setProperty('gap', '9px', 'important');

  const solutionGrid = posterRoot.querySelector('.ph-grid-solution');
  if (solutionGrid) solutionGrid.style.marginTop = '8px';

  const processGrid = posterRoot.querySelector('.ph-grid-process');
  if (processGrid) {
    processGrid.style.marginTop = '9px';
    processGrid.style.setProperty('gap', '7px', 'important');
  }
}

function shrinkActiveImageFramesToFit(posterRoot, titleColor) {
  const activeGrid = ['#ph-images-app', '#ph-images-web', '#ph-images-2']
    .map(selector => posterRoot.querySelector(selector))
    .find(grid => grid && window.getComputedStyle(grid).display !== 'none');
  if (!activeGrid) return;

  const frames = [...activeGrid.querySelectorAll('[data-ph-img]')];
  if (!frames.length) return;

  const layoutKey = frames[0].dataset.layout;
  const minHeights = { app: 216, website: 96, physical: 165 };
  const minHeight = minHeights[layoutKey] || 96;

  for (let attempt = 0; attempt < 24 && isPosterOverflowing(posterRoot); attempt += 1) {
    const currentHeight = parseFloat(frames[0].style.height) || frames[0].getBoundingClientRect().height;
    const nextHeight = Math.max(minHeight, Math.round(currentHeight - 8));
    if (nextHeight >= currentHeight) break;

    let nextWidth = null;
    if (layoutKey === 'app') nextWidth = Math.round(nextHeight * APP_SCREEN_RATIO);
    if (layoutKey === 'website') nextWidth = Math.round(nextHeight * WEB_SCREEN_RATIO);

    if (nextWidth) {
      activeGrid.style.gridTemplateColumns = `repeat(${frames.length}, ${nextWidth}px)`;
      activeGrid.style.justifyContent = 'center';
    }

    frames.forEach(frame => applyImageFrameSize(frame, layoutKey, nextHeight, nextWidth));
    updateTitleUnderline(posterRoot, titleColor);
  }
}

function isPosterOverflowing(posterRoot) {
  if (!posterRoot) return false;

  const footer = posterRoot.querySelector('#ph-footer');
  const rootRect = posterRoot.getBoundingClientRect();
  const a4Bottom = rootRect.top + POSTER_HEIGHT_PX;

  // True overflow: poster scroll height exceeds A4, which can create a second PDF page.
  if (posterRoot.scrollHeight > POSTER_HEIGHT_PX + 1) return true;

  if (footer) {
    const footerRect = footer.getBoundingClientRect();
    if (footerRect.bottom > a4Bottom + 1) return true;
    if (footerRect.top < rootRect.top - 1) return true;
  }

  const contentEls = [...posterRoot.querySelectorAll('.ph-card, .ph-img-frame')];

  // Any content element visually below A4 bottom.
  if (contentEls.some(el => el.getBoundingClientRect().bottom > a4Bottom + 1)) return true;

  // Any content element intruding into footer space means the footer can be cut or covered.
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

function showPosterExportError(error) {
  const message = error instanceof Error ? error.message : String(error || 'שגיאה לא ידועה בייצוא.');
  console.error('Poster export failed', error);
  if (typeof window.alert === 'function') window.alert(message);
}

function getSafePosterTitle() {
  const renderedName = document.getElementById('ph-name')?.textContent?.trim() || '';
  const projectName = renderedName && renderedName !== 'שם המיזם' ? renderedName : 'פוסטר';
  return projectName
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || 'פוסטר';
}

function buildSafePosterFilename(extension) {
  const safeTitle = getSafePosterTitle();
  return extension ? `${safeTitle}.${extension}` : safeTitle;
}

export async function printPoster() {
  const poster = document.getElementById('poster-html');
  if (!poster) return;
  await waitForPosterAssets(poster);
  updateTitleUnderline(poster);
  fitPosterToPage(poster);
  await waitForAnimationFrame();

  document.body.classList.add('printing-poster');
  const previousTitle = document.title;
  document.title = buildSafePosterFilename('');
  try {
    if (typeof window.print !== 'function') throw new Error('window.print is not available');
    window.print();
  } finally {
    setTimeout(() => {
      document.body.classList.remove('printing-poster');
      document.title = previousTitle;
    }, 1000);
  }
}

export async function exportHTMLPosterToPDF() {
  try {
    await printPoster();
  } catch (error) {
    showPosterExportError(error);
  }
}
