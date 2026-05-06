const POSTER_HEIGHT_PX = 1123;
const IMG_HEIGHTS     = { app: 250, physical: 205, website: 170, digital: 170 };
const IMG_MIN_HEIGHTS = { app: 95,  physical: 90,  website: 75,  digital: 75  };

export function renderHTMLPoster(contentValues, productType, titleFont, titleColor, textColor, background, slotImages) {
  // Support legacy calls that pass (background, slotImages) after titleColor.
  if (slotImages === undefined && background && typeof background === 'object') {
    slotImages = background;
    background = textColor;
    textColor = null;
  }

  // ── Background ──────────────────────────────────────────────────────────────
  const bgEl = document.getElementById('poster-bg');
  if (bgEl) {
    bgEl.innerHTML = background
      ? `<img src="${background}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;display:block;">`
      : '';
  }

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
    [contentValues.schoolName, contentValues.className].filter(Boolean).join(' | '));

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

  // ── Apply textColor to regular body / bullet elements ────────────────────────
  document.querySelectorAll('.ph-body, .ph-sub').forEach(el => {
    if (el.closest('.ph-card-accent')) return; // accent cards handled below
    el.style.color = resolvedText;
    el.style.fontWeight = '400';
  });
  document.querySelectorAll('.ph-bullets li').forEach(el => {
    el.style.color = resolvedText;
    el.style.fontWeight = '400';
  });
  document.querySelectorAll('#ph-names, #ph-school').forEach(el => {
    el.style.fontWeight = '400';
  });

  // ── Accent card bodies → title color with regular answer weight ──────────────
  document.querySelectorAll('.ph-card-accent .ph-body').forEach(el => {
    el.style.color      = resolvedTitle;
    el.style.fontWeight = '400';
  });

  // ── Apply titleColor to .ph-cap and ::before accent line ─────────────────────
  document.querySelectorAll('.ph-cap').forEach(el => {
    el.style.color = resolvedTitle;
  });

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
        frame.innerHTML = `<img src="${slotImages[k]}" alt="תמונה ${i + 1}" crossorigin="anonymous" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;margin:auto;">`;
      } else {
        frame.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;color:#c8a8c0;font-size:10px;width:100%;height:100%;">תמונה ${i + 1}</div>`;
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
    card.style.background = 'rgba(255, 255, 255, 0.96)';
  });
  root.querySelectorAll?.('.ph-card-accent').forEach((card) => {
    card.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.97), rgba(248, 238, 255, 0.96))';
  });
  const team = root.querySelector?.('#ph-team') || document.getElementById('ph-team');
  if (team) team.style.background = 'rgba(255, 255, 255, 0.96)';
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

export async function exportHTMLPosterToPDF(contentValues) {
  const original = document.getElementById('poster-html');
  if (!original) return;

  // 1. Wait for all fonts declared in @font-face to finish loading
  await document.fonts.ready;

  // 2. Force-load the selected font at the weights used in the poster
  //    (needed because @font-face with font-display:block may not have been
  //    triggered yet if the font wasn't rendered on-screen at those weights)
  const selectedFont = original.style.fontFamily || "'IBM Plex Sans Hebrew'";
  const fontLoadPromises = [];
  for (const weight of ['400', '700', '900']) {
    fontLoadPromises.push(
      document.fonts.load(`${weight} 16px ${selectedFont}`).catch(() => {})
    );
  }
  await Promise.all(fontLoadPromises);
  // One more check after explicit loads
  await document.fonts.ready;

  // 3. Offscreen clone — exact 794×1123, no scale transform, no shadow
  const clone = original.cloneNode(true);
  Object.assign(clone.style, {
    position:  'fixed',
    left:      '-9999px',
    top:       '0',
    width:     '794px',
    height:    '1123px',
    minHeight: '1123px',
    maxHeight: '1123px',
    overflow:  'visible',
    boxShadow: 'none',
    transform: 'none',
    zIndex:    '-1',
  });
  document.body.appendChild(clone);
  applyPosterCardStyles(clone);
  updateTitleUnderline(clone);
  fitPosterToPage(clone);

  // 3. Wait for all <img> to load in clone
  await Promise.all(
    [...clone.querySelectorAll('img')].map(img =>
      img.complete ? Promise.resolve()
        : new Promise(res => { img.onload = res; img.onerror = res; })
    )
  );

  // Layout settle and apply the same image-only fit used by the preview
  await new Promise(r => requestAnimationFrame(r));
  updateTitleUnderline(clone);
  fitPosterToPage(clone);
  await new Promise(r => requestAnimationFrame(r));
  updateTitleUnderline(clone);
  fitPosterToPage(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale:           2,
      useCORS:         true,
      allowTaint:      false,
      backgroundColor: '#ffffff',
      logging:         false,
      width:           794,
      height:          1123,
      windowWidth:     794,
      windowHeight:    1123,
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 210, 297);
    const filename = (contentValues.projectName || 'פוסטר').trim().replace(/\s+/g, '-');
    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(clone);
  }
}
