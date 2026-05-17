const POSTER_WIDTH_PX = 794;
const POSTER_HEIGHT_PX = 1123;
const PHYSICAL_FRAME_MAX_WIDTH = 375;
const PHYSICAL_FRAME_MAX_HEIGHT = 235;
const PHYSICAL_FRAME_DEFAULT_WIDTH = 365;
const PHYSICAL_FRAME_DEFAULT_HEIGHT = 228;
const PHYSICAL_FRAME_MIN_WIDTH = 330;
const PHYSICAL_FRAME_MIN_HEIGHT = 210;
const PHYSICAL_FRAME_STEPS = [
  { width: PHYSICAL_FRAME_DEFAULT_WIDTH, height: PHYSICAL_FRAME_DEFAULT_HEIGHT },
  { width: 355, height: 222 },
  { width: 343, height: 215 },
  { width: PHYSICAL_FRAME_MIN_WIDTH, height: PHYSICAL_FRAME_MIN_HEIGHT },
];
const PHYSICAL_FRAME_EXPAND_STEPS = [
  { width: PHYSICAL_FRAME_DEFAULT_WIDTH, height: PHYSICAL_FRAME_DEFAULT_HEIGHT },
  { width: PHYSICAL_FRAME_MAX_WIDTH, height: PHYSICAL_FRAME_MAX_HEIGHT },
];
const PHYSICAL_FRAME_WIDTH = PHYSICAL_FRAME_DEFAULT_WIDTH;
const PHYSICAL_FRAME_HEIGHT = PHYSICAL_FRAME_DEFAULT_HEIGHT;
const PHYSICAL_UNDERFLOW_GAP_PX = 20;
const APP_FRAME_HEIGHT_STEPS = [310, 293, 276, 259, 248];
const APP_SCREEN_RATIO = 9 / 16;
const WEB_SCREEN_RATIO = 16 / 9;
const WEB_FRAME_WIDTH_STEPS = [235, 224, 213, 201];
const IMAGE_LAYOUT_FALLBACKS = {
  physical: { fit: 'contain', height: PHYSICAL_FRAME_HEIGHT, width: PHYSICAL_FRAME_WIDTH, background: '#f5eef2', aspectRatio: '30 / 19' },
  app: { fit: 'contain', height: APP_FRAME_HEIGHT_STEPS[0], width: Math.round(APP_FRAME_HEIGHT_STEPS[0] * APP_SCREEN_RATIO), background: 'linear-gradient(180deg, #fbf8fc 0%, #f0e7f5 100%)', aspectRatio: '9 / 16' },
  website: { fit: 'contain', height: Math.round(WEB_FRAME_WIDTH_STEPS[0] / WEB_SCREEN_RATIO), width: WEB_FRAME_WIDTH_STEPS[0], background: 'linear-gradient(180deg, #fbf8ff 0%, #f2edf8 100%)', aspectRatio: '16 / 9' },
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
    n.style.fontSize = l <= 6 ? '62px' : l <= 10 ? '54px' : l <= 15 ? '44px' : l <= 18 ? '36px' : '30px';
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
        renderPosterFrameImage(frame, slotImages[k], i, productType);
      } else {
        frame.style.removeProperty('background-image');
        frame.style.removeProperty('background-size');
        frame.style.removeProperty('background-position');
        frame.style.removeProperty('background-repeat');
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



function renderPosterFrameImage(frame, src, index, productType) {
  if (!frame || !src) return;
  const layoutKey = productType === 'digital' ? 'website' : productType;
  frame.innerHTML = '';
  frame.style.position = 'relative';
  frame.style.overflow = 'hidden';

  if (layoutKey === 'physical') {
    frame.style.backgroundImage = `linear-gradient(rgba(245,238,242,.36), rgba(245,238,242,.36)), url("${src}")`;
    frame.style.backgroundSize = 'cover';
    frame.style.backgroundPosition = 'center';
    frame.style.backgroundRepeat = 'no-repeat';

    const fill = document.createElement('div');
    fill.setAttribute('aria-hidden', 'true');
    fill.style.cssText = 'position:absolute;inset:-8px;background:inherit;filter:blur(7px);opacity:.42;transform:scale(1.05);z-index:0;';
    frame.appendChild(fill);
  } else {
    frame.style.removeProperty('background-image');
    frame.style.removeProperty('background-size');
    frame.style.removeProperty('background-position');
    frame.style.removeProperty('background-repeat');
  }

  // Physical product images fill the frame (cover); screenshots must show in full (contain)
  const imgFit = layoutKey === 'physical' ? 'cover' : 'contain';
  const img = document.createElement('img');
  img.alt = `תמונה ${index + 1}`;
  img.crossOrigin = 'anonymous';
  img.src = src;
  img.style.cssText = `position:relative;z-index:1;width:100% !important;height:100% !important;object-fit:${imgFit} !important;object-position:center !important;display:block !important;margin:0 !important;max-width:none !important;max-height:none !important;`;
  frame.appendChild(img);
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
    grid.style.setProperty('grid-template-columns', `repeat(${frameCount}, ${config.width}px)`, 'important');
    grid.style.setProperty('gap', layoutKey === 'physical' ? '14px' : '11px', 'important');
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
  else if (layoutKey === 'physical') frame.style.aspectRatio = `${width || PHYSICAL_FRAME_WIDTH} / ${height}`;
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
    frame.style.removeProperty('background-image');
    frame.style.removeProperty('background-size');
    frame.style.removeProperty('background-position');
    frame.style.removeProperty('background-repeat');
  });

  const resetStyleProps = {
    '#ph-main': ['gap', 'padding-bottom', 'justify-content'],
    '.ph-images-wrap': ['margin-block'],
    '#ph-images-label': ['margin-bottom'],
    '#ph-images-2, #ph-images-app, #ph-images-web': ['gap'],
    '.ph-card': ['padding', 'border-radius'],
    '.ph-grid-problem, .ph-grid-research, .ph-grid-solution, .ph-grid-process': ['gap', 'margin-top'],
    '.ph-cap': ['font-size', 'line-height', 'margin-bottom', 'letter-spacing'],
    '.ph-body': ['font-size', 'line-height'],
    '.ph-sub': ['font-size', 'line-height', 'margin-top'],
    '.ph-bullets': ['margin-top'],
    '.ph-bullets li': ['font-size', 'line-height', 'margin-bottom'],
    '#ph-footer': ['padding-top', 'padding-bottom'],
  };

  Object.entries(resetStyleProps).forEach(([selector, props]) => {
    posterRoot.querySelectorAll(selector).forEach((el) => {
      props.forEach((prop) => el.style.removeProperty(prop));
    });
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

  if (!isPosterOverflowing(posterRoot)) {
    balancePhysicalPosterUnderflow(posterRoot, titleColor);
    return;
  }

  applyCompactPosterSpacing(posterRoot);
  updateTitleUnderline(posterRoot, titleColor);
  if (!isPosterOverflowing(posterRoot)) {
    balancePhysicalPosterUnderflow(posterRoot, titleColor);
    return;
  }

  shrinkActiveImageFramesToFit(posterRoot, titleColor);
  if (!isPosterOverflowing(posterRoot)) {
    balancePhysicalPosterUnderflow(posterRoot, titleColor);
    return;
  }

  applySecondaryTextCompression(posterRoot);
  updateTitleUnderline(posterRoot, titleColor);
  if (!isPosterOverflowing(posterRoot)) {
    balancePhysicalPosterUnderflow(posterRoot, titleColor);
    return;
  }

  // Final guard: tighten only secondary text/cards after exhausting the allowed
  // image-size floors. Do not resize #poster-html; it must remain a fixed A4 box.
  applyFinalTextCompression(posterRoot);
  updateTitleUnderline(posterRoot, titleColor);
}

function applyCompactPosterSpacing(posterRoot) {
  if (!posterRoot) return;

  const main = posterRoot.querySelector('#ph-main');
  if (main) {
    main.style.setProperty('gap', '3px', 'important');
    main.style.setProperty('padding-bottom', '4px', 'important');
  }

  const imagesWrap = posterRoot.querySelector('.ph-images-wrap');
  if (imagesWrap) imagesWrap.style.setProperty('margin-block', '0 6px', 'important');

  const imageLabel = posterRoot.querySelector('#ph-images-label');
  if (imageLabel) imageLabel.style.setProperty('margin-bottom', '3px', 'important');

  ['#ph-images-2', '#ph-images-app', '#ph-images-web'].forEach((selector) => {
    const grid = posterRoot.querySelector(selector);
    if (!grid) return;
    const gap = selector === '#ph-images-2' ? '14px' : '8px';
    grid.style.setProperty('gap', gap, 'important');
    grid.style.setProperty('justify-content', 'center', 'important');
  });

  posterRoot.querySelectorAll('.ph-card').forEach((card) => {
    card.style.setProperty('padding', '8px 10px', 'important');
  });

  posterRoot.querySelectorAll('.ph-grid-problem, .ph-grid-research, .ph-grid-solution, .ph-grid-process').forEach((grid) => {
    grid.style.setProperty('gap', '5px', 'important');
    grid.style.setProperty('margin-top', '0', 'important');
  });

  const audienceCard = posterRoot.querySelector('.ph-audience-card');
  if (audienceCard) audienceCard.style.setProperty('padding', '5px 10px', 'important');
}

function applySecondaryTextCompression(posterRoot) {
  if (!posterRoot) return;
  posterRoot.querySelectorAll('.ph-body').forEach((el) => {
    if (el.id === 'ph-solution') return;
    el.style.setProperty('font-size', '11.5px', 'important');
    el.style.setProperty('line-height', '1.4', 'important');
  });
  posterRoot.querySelectorAll('.ph-sub').forEach((el) => {
    el.style.setProperty('font-size', '10px', 'important');
    el.style.setProperty('line-height', '1.35', 'important');
    el.style.setProperty('margin-top', '2px', 'important');
  });
  posterRoot.querySelectorAll('.ph-bullets').forEach((el) => {
    el.style.setProperty('margin-top', '1px', 'important');
  });
  posterRoot.querySelectorAll('.ph-bullets li').forEach((el) => {
    el.style.setProperty('font-size', '11.5px', 'important');
    el.style.setProperty('line-height', '1.36', 'important');
    el.style.setProperty('margin-bottom', '0', 'important');
  });
}

function applyFinalTextCompression(posterRoot) {
  if (!posterRoot) return;
  posterRoot.querySelectorAll('.ph-card').forEach((card) => {
    card.style.setProperty('padding', '7px 9px', 'important');
    card.style.setProperty('border-radius', '9px', 'important');
  });
  posterRoot.querySelectorAll('.ph-cap').forEach((el) => {
    el.style.setProperty('font-size', '11px', 'important');
    el.style.setProperty('line-height', '1.25', 'important');
    el.style.setProperty('margin-bottom', '3px', 'important');
    el.style.setProperty('letter-spacing', '0', 'important');
  });
  posterRoot.querySelectorAll('.ph-body').forEach((el) => {
    if (el.id === 'ph-solution') return;
    el.style.setProperty('font-size', '11px', 'important');
    el.style.setProperty('line-height', '1.32', 'important');
  });
  posterRoot.querySelectorAll('.ph-bullets li').forEach((el) => {
    el.style.setProperty('font-size', '11px', 'important');
    el.style.setProperty('line-height', '1.28', 'important');
  });
  const footer = posterRoot.querySelector('#ph-footer');
  if (footer) {
    footer.style.setProperty('padding-top', '6px', 'important');
    footer.style.setProperty('padding-bottom', '6px', 'important');
  }
}

function getActiveImageGrid(posterRoot) {
  if (!posterRoot) return null;
  return ['#ph-images-app', '#ph-images-web', '#ph-images-2']
    .map(selector => posterRoot.querySelector(selector))
    .find(grid => grid && window.getComputedStyle(grid).display !== 'none') || null;
}

function getPosterA4Bottom(posterRoot) {
  if (!posterRoot) return 0;
  return posterRoot.getBoundingClientRect().top + POSTER_HEIGHT_PX;
}

function isFooterOutsidePosterBottom(posterRoot) {
  if (!posterRoot) return false;
  const footer = posterRoot.querySelector('#ph-footer');
  if (!footer) return false;
  return footer.getBoundingClientRect().bottom > getPosterA4Bottom(posterRoot) + 1;
}

function getImageFitSteps(layoutKey) {
  if (layoutKey === 'physical') return PHYSICAL_FRAME_STEPS;
  if (layoutKey === 'app') return APP_FRAME_HEIGHT_STEPS.map(height => ({ height, width: Math.round(height * APP_SCREEN_RATIO) }));
  return WEB_FRAME_WIDTH_STEPS.map(width => ({ width, height: Math.round(width / WEB_SCREEN_RATIO) }));
}

function setImageFrameDimensions(grid, frames, layoutKey, width, height) {
  if (!grid || !frames?.length || !width || !height) return;
  grid.style.setProperty('grid-template-columns', `repeat(${frames.length}, ${width}px)`, 'important');
  grid.style.setProperty('justify-content', 'center', 'important');
  frames.forEach((frame) => applyImageFrameSize(frame, layoutKey, height, width));
}

function getContentFooterGap(posterRoot) {
  if (!posterRoot) return 0;
  const footer = posterRoot.querySelector('#ph-footer');
  if (!footer) return 0;

  const contentEls = [...posterRoot.querySelectorAll('#ph-main > *')]
    .filter((el) => window.getComputedStyle(el).display !== 'none');
  if (!contentEls.length) return 0;

  const lastContentBottom = Math.max(...contentEls.map((el) => el.getBoundingClientRect().bottom));
  return footer.getBoundingClientRect().top - lastContentBottom;
}

function balancePhysicalPosterUnderflow(posterRoot, titleColor) {
  if (!posterRoot || posterRoot.dataset.productType !== 'physical') return;
  if (isPosterOverflowing(posterRoot)) return;

  const activeGrid = getActiveImageGrid(posterRoot);
  if (!activeGrid || activeGrid.id !== 'ph-images-2') return;

  const frames = [...activeGrid.querySelectorAll('[data-layout="physical"]')];
  if (!frames.length) return;

  const currentWidth = parseFloat(frames[0].style.width) || frames[0].getBoundingClientRect().width;
  const currentHeight = parseFloat(frames[0].style.height) || frames[0].getBoundingClientRect().height;

  // Always try to expand physical frames to their maximum safe size.
  // Images may have been shrunk to resolve overflow; recover as much space as possible.
  if (currentWidth < PHYSICAL_FRAME_MAX_WIDTH - 1 || currentHeight < PHYSICAL_FRAME_MAX_HEIGHT - 1) {
    let lastSafeStep = { width: currentWidth, height: currentHeight };

    for (const step of PHYSICAL_FRAME_EXPAND_STEPS) {
      if (step.width <= currentWidth + 1 && step.height <= currentHeight + 1) continue;

      setImageFrameDimensions(activeGrid, frames, 'physical', step.width, step.height);
      updateTitleUnderline(posterRoot, titleColor);

      if (isPosterOverflowing(posterRoot) || isFooterOutsidePosterBottom(posterRoot)) {
        setImageFrameDimensions(activeGrid, frames, 'physical', lastSafeStep.width, lastSafeStep.height);
        updateTitleUnderline(posterRoot, titleColor);
        break;
      }

      lastSafeStep = step;
    }
  }

  // After expanding images as much as safely possible, if significant whitespace
  // still remains inside #ph-main, distribute its children evenly.
  const remainingGap = getContentFooterGap(posterRoot);
  if (remainingGap > PHYSICAL_UNDERFLOW_GAP_PX && !isPosterOverflowing(posterRoot)) {
    const main = posterRoot.querySelector('#ph-main');
    if (main) {
      main.style.setProperty('justify-content', 'space-between', 'important');
      updateTitleUnderline(posterRoot, titleColor);

      if (isPosterOverflowing(posterRoot) || isFooterOutsidePosterBottom(posterRoot)) {
        main.style.removeProperty('justify-content');
        updateTitleUnderline(posterRoot, titleColor);
      }
    }
  }
}

function shrinkActiveImageFramesToFit(posterRoot, titleColor) {
  const activeGrid = getActiveImageGrid(posterRoot);
  if (!activeGrid || !isPosterOverflowing(posterRoot)) return;

  const frames = [...activeGrid.querySelectorAll('[data-ph-img]')];
  if (!frames.length) return;

  const layoutKey = frames[0].dataset.layout;
  const steps = getImageFitSteps(layoutKey);
  const currentWidth = parseFloat(frames[0].style.width) || frames[0].getBoundingClientRect().width;
  const currentHeight = parseFloat(frames[0].style.height) || frames[0].getBoundingClientRect().height;

  for (const step of steps) {
    if (!isPosterOverflowing(posterRoot)) return;
    if (step.width > currentWidth + 1 || step.height > currentHeight + 1) continue;
    setImageFrameDimensions(activeGrid, frames, layoutKey, step.width, step.height);
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
  const raw = error instanceof Error ? error.message : String(error || 'שגיאה לא ידועה בייצוא.');
  // Strip HTML tags in case a proxy returned a raw error page
  const clean = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const message = clean || 'שגיאה בלתי צפויה בייצוא. אנא נסה שנית.';
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
  await waitForAnimationFrame();
  await waitForAnimationFrame();

  poster.style.setProperty('overflow', 'hidden', 'important');

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
      poster.style.removeProperty('overflow');
    }, 1000);
  }
}

export async function exportHTMLPosterToPDF() {
  const poster = document.getElementById('poster-html');
  if (!poster) return;

  try {
    await waitForPosterAssets(poster);
    updateTitleUnderline(poster);
    fitPosterToPage(poster);
    await waitForAnimationFrame();
    await waitForAnimationFrame();
    await waitForAnimationFrame();

    poster.style.setProperty('overflow', 'hidden', 'important');

    const baseUrl = `${location.protocol}//${location.host}`;
    const fontFaceCSS = `
      @font-face { font-family: 'Gveret Levin'; src: url('${baseUrl}/poster-builder/assets/fonts/GveretLevin-Regular.ttf') format('truetype'); font-weight: 400 700 900; font-style: normal; }
      @font-face { font-family: 'Alef'; src: url('${baseUrl}/poster-builder/assets/fonts/Alef-regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
      @font-face { font-family: 'Alef'; src: url('${baseUrl}/poster-builder/assets/fonts/Alef-bold.ttf') format('truetype'); font-weight: 700 900; font-style: normal; }
      @font-face { font-family: 'Alice'; src: url('${baseUrl}/poster-builder/assets/fonts/Alice-Regular.ttf') format('truetype'); font-weight: 400 700 900; font-style: normal; }
      @font-face { font-family: 'Choco'; src: url('${baseUrl}/poster-builder/assets/fonts/Choco.otf') format('opentype'); font-weight: 400 700 900; font-style: normal; }
      @font-face { font-family: 'Yehuda'; src: url('${baseUrl}/poster-builder/assets/fonts/yehudaclm-bold-webfont.woff') format('woff'), url('${baseUrl}/poster-builder/assets/fonts/yehudaclm-bold-webfont.ttf') format('truetype'); font-weight: 400 700 900; font-style: normal; }
    `;

    const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;700;900&family=Rubik:wght@400;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${baseUrl}/poster-builder/src/styles/product-builder.css">
  <style>
    ${fontFaceCSS}
    *, *::before, *::after { box-sizing: border-box; }
    html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; background: white; overflow: hidden; }
    @page { size: 210mm 297mm; margin: 0; }
    #poster-html {
      position: relative !important;
      /* 794px = 210mm at 96 dpi — keeps pixel-based child layout intact */
      width: 794px !important;
      height: 1123px !important;
      min-height: 1123px !important;
      max-height: 1123px !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      box-shadow: none !important;
      transform: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #poster-inner {
      width: 794px !important;
      height: 1123px !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    .ph-card, .ph-grid-problem, .ph-grid-research, .ph-grid-solution, .ph-grid-process {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  </style>
</head>
<body>${poster.outerHTML}</body>
</html>`;

    poster.style.removeProperty('overflow');

    const filename = buildSafePosterFilename('pdf');
    const response = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, filename })
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      const isHtml = text.trim().startsWith('<');
      let msg;
      if (status === 405 || (isHtml && text.includes('405'))) {
        msg = `ייצוא PDF נכשל (שגיאה 405). ה-endpoint ‎/api/export-pdf אינו זמין בכתובת זו. יש לוודא שהאתר רץ דרך שרת Node.js ולא אחסון סטטי בלבד.`;
      } else if (isHtml) {
        msg = `ייצוא PDF נכשל. השרת החזיר שגיאה ${status}. אנא נסה שנית או פנה לתמיכה.`;
      } else {
        msg = text || `שגיאת שרת ${status}`;
      }
      throw new Error(msg);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    poster.style.removeProperty('overflow');
    showPosterExportError(error);
  }
}
