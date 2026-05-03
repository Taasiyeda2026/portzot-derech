export function renderHTMLPoster(contentValues, productType, titleFont, titleColor, background, slotImages) {
  // Background
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

  // Project name / title
  const name = (contentValues.projectName || '').trim();
  const n = document.getElementById('ph-name');
  if (n) {
    n.textContent = name || 'שם המיזם';
    n.style.fontFamily = titleFont || 'IBM Plex Sans Hebrew';
    n.style.color = titleColor || '#5E2750';
    const l = name.length;
    n.style.fontSize = l <= 6 ? '52px' : l <= 10 ? '44px' : l <= 15 ? '36px' : l <= 18 ? '30px' : '24px';
  }

  // Text fields
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

  setText('ph-solution-cap',
    { physical: 'המוצר שלנו', website: 'האתר שלנו', app: 'האפליקציה שלנו', digital: 'המוצר הדיגיטלי שלנו' }[productType] || 'הפתרון שלנו');
  setText('ph-usage-cap',
    { physical: 'איך משתמשים', website: 'מה עושים באתר', app: 'איך זה עובד', digital: 'איך זה עובד' }[productType] || 'איך זה עובד');
  setText('ph-images-label',
    { physical: 'המוצר שלנו', app: 'מסכי האפליקציה', website: 'מסכי האתר', digital: 'מוצר דיגיטלי' }[productType] || '');

  // Show correct image grid
  const imgGrid2   = document.getElementById('ph-images-2');
  const imgGridApp = document.getElementById('ph-images-app');
  const imgGridWeb = document.getElementById('ph-images-web');
  if (imgGrid2)   imgGrid2.style.display   = productType === 'physical' ? 'grid' : 'none';
  if (imgGridApp) imgGridApp.style.display = productType === 'app'      ? 'grid' : 'none';
  if (imgGridWeb) imgGridWeb.style.display = (productType === 'website' || productType === 'digital') ? 'grid' : 'none';

  // Aspect ratio per type
  const frameRatio = { app: '9 / 16', physical: '4 / 3', website: '16 / 9', digital: '16 / 9' }[productType] || '16 / 9';
  // digital → website for data-layout attribute matching
  const layoutKey = productType === 'digital' ? 'website' : productType;

  document.querySelectorAll(`[data-ph-img][data-layout="${layoutKey}"]`).forEach(frame => {
    frame.style.aspectRatio = frameRatio;
    frame.style.height = 'auto';
  });

  // object-fit: contain for app/website/digital, cover for physical
  const objectFit = productType === 'physical' ? 'cover' : 'contain';
  const keys = productType === 'physical' ? ['visual_1', 'visual_2'] : ['visual_1', 'visual_2', 'visual_3'];

  keys.forEach((k, i) => {
    document.querySelectorAll(`[data-ph-img="${i}"][data-layout="${layoutKey}"]`).forEach(frame => {
      if (slotImages[k]) {
        frame.innerHTML = `<img src="${slotImages[k]}" alt="תמונה ${i + 1}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:${objectFit};display:block;">`;
      } else {
        frame.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;color:#c8a8c0;font-size:10px;width:100%;height:100%;">תמונה ${i + 1}</div>`;
      }
    });
  });
}

export async function exportHTMLPosterToPDF(contentValues) {
  const original = document.getElementById('poster-html');
  if (!original) return;

  // 1. Wait for all fonts to be ready
  await document.fonts.ready;

  // 2. Create an offscreen clone — fixed 794×1123, no scale transform
  const clone = original.cloneNode(true);
  Object.assign(clone.style, {
    position:  'fixed',
    left:      '-9999px',
    top:       '0',
    width:     '794px',
    height:    '1123px',
    minHeight: '1123px',
    maxHeight: '1123px',
    overflow:  'hidden',
    boxShadow: 'none',
    transform: 'none',
    zIndex:    '-1',
  });
  document.body.appendChild(clone);

  // 3. Wait for all <img> elements inside the clone to finish loading
  await Promise.all(
    [...clone.querySelectorAll('img')].map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(res => { img.onload = res; img.onerror = res; })
    )
  );

  // Two frames so layout is fully settled
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));

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
