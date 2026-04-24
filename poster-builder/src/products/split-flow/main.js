import { getVisualSlots, getPosterFields, FIELD_DEFINITIONS } from '../physical/config.js';
import { saveProject, loadProject } from '../../shared/storage.js';

const productType = window.__POSTER_SPLIT_PRODUCT__ === 'app' ? 'app' : 'website';
const title = productType === 'app' ? 'אפליקציה' : 'אתר';
const root = document.getElementById('root');

const posterValueField = FIELD_DEFINITIONS.find((field) => field.id === 'value');
const valueRect = getPosterFields('A4', productType).find((field) => field.id === 'value');
const deriveMaxFromPoster = (factor = 1) => {
  const charsPerLine = Math.floor(valueRect.width / (posterValueField.fontSize * 0.52));
  const lines = Math.floor(valueRect.height / (posterValueField.fontSize * posterValueField.lineHeight));
  return Math.max(70, Math.min(160, Math.floor(charsPerLine * lines * factor)));
};
const feedbackMax = deriveMaxFromPoster(0.95);
const improvementsMax = deriveMaxFromPoster(0.9);

const baseResearch = [
  ['projectName', 'שם המיזם', 20],
  ['description', 'תיאור קצר של המיזם', 75],
  ['problem', 'מה הבעיה שזיהיתן?', 130],
  ['audience', 'על מי הבעיה משפיעה?', 75],
  ['researchQuestion', 'מה הייתה שאלת החקר הטכנולוגית?', 90],
  ['research_1', 'איזה חקר ביצעתן? 1', 42],
  ['research_2', 'איזה חקר ביצעתן? 2', 42],
  ['research_3', 'איזה חקר ביצעתן? 3', 42],
  ['findings', 'מה גיליתן בעקבות החקר?', 110],
  ['requirements_1', 'מה היה חשוב שהפתרון יכלול? 1', 42],
  ['requirements_2', 'מה היה חשוב שהפתרון יכלול? 2', 42],
  ['requirements_3', 'מה היה חשוב שהפתרון יכלול? 3', 42],
  ['solution', productType === 'app' ? 'מהי האפליקציה שפיתחתן?' : 'מהו האתר שפיתחתן?', 130],
  ['howItWorks_1', productType === 'app' ? 'איך המשתמשת משתמשת באפליקציה? 1' : 'מה המשתמש עושה באתר? 1', 42],
  ['howItWorks_2', productType === 'app' ? 'איך המשתמשת משתמשת באפליקציה? 2' : 'מה המשתמש עושה באתר? 2', 42],
  ['howItWorks_3', productType === 'app' ? 'איך המשתמשת משתמשת באפליקציה? 3' : 'מה המשתמש עושה באתר? 3', 42],
  ['value', 'מה הערך המרכזי של הפתרון?', 110],
  ['feedback', 'איזה משוב קיבלתן?', feedbackMax],
  ['improvement', 'מה שיפרתן בעקבות המשוב?', improvementsMax]
];

const stepLabels = ['שאלות חקר', 'אבטיפוס', 'תמונות', 'פוסטר'];

const state = {
  step: 1,
  research: {},
  prototypeScreens: [],
  prototypeFlow: { start: '', end: '', summary: '', hasBranch: '', branch: '' },
  selectedWebsiteScreens: ['1', '2', '3'],
  images: Array.from({ length: 3 }, (_, i) => ({
    id: `${i + 1}`,
    screenRef: `${i + 1}`,
    emphasis: [],
    takeaway: '',
    style: [],
    realism: '',
    colors: '',
    avoid: [],
    avoidOther: ''
  }))
};

const protoOptions = productType === 'app'
  ? ['מסך בית', 'מסך פתיחה', 'חיפוש', 'פעולה מרכזית', 'פרופיל', 'מעקב', 'תוצאה', 'הרשמה', 'התחברות', 'אחר']
  : ['דף בית', 'חיפוש', 'תוצאות', 'עמוד תוכן', 'פרופיל', 'הרשמה', 'התחברות', 'אזור אישי', 'דף מידע', 'אחר'];
const componentsOptions = productType === 'app'
  ? ['כותרת', 'ניווט תחתון', 'כפתור פעולה ראשי', 'כרטיסיות', 'גרף', 'רשימה', 'טופס', 'פרופיל', 'מפה', 'התראות', 'אזור מידע', 'אחר']
  : ['כותרת', 'תפריט עליון', 'שורת חיפוש', 'כפתור פעולה ראשי', 'כרטיסיות', 'רשימה', 'טופס', 'פרופיל', 'תמונת באנר', 'אזור מידע', 'מפה', 'התראות', 'אחר'];
const protoEmphasisOptions = productType === 'app'
  ? ['הפעולה המרכזית', 'הכפתור הראשי', 'הנתונים', 'הניווט', 'הפשטות של המסך', 'התוצאה', 'אחר']
  : ['הפעולה המרכזית', 'הכפתור הראשי', 'אזור המידע', 'התוכן', 'הפשטות של המסך', 'הניווט', 'התוצאה', 'אחר'];

const imageEmphasisOptions = ['הפעולה המרכזית', 'הכפתור הראשי', productType === 'app' ? 'הניווט' : 'התוכן', 'הנתונים', 'הפשטות', 'התוצאה', 'העיצוב', 'אחר'];
const imageStyleOptions = ['מודרני', 'נקי', 'טכנולוגי', 'ידידותי', 'צעיר', 'מקצועי', 'אסתטי', 'מינימליסטי', 'אחר'];
const imageAvoidOptions = ['טקסט ארוך מדי', 'עומס', 'אלמנטים לא קשורים', 'יותר מדי צבעים', 'מראה ילדותי', 'עיצוב עמוס', 'לוגואים אמיתיים', 'אחר'];

const requiredResearchKeys = baseResearch.map(([key]) => key);
const requiredPrototypeFields = ['type', 'view', 'action'];
const qualityLine = 'high quality, clean composition, realistic proportions, no watermark, no text overlay, no logo, poster-friendly composition';

function initializeState() {
  const count = productType === 'app' ? 3 : 5;
  state.prototypeScreens = Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    type: '',
    shortName: '',
    view: '',
    action: '',
    components: [],
    emphasis: []
  }));
  Object.fromEntries(baseResearch.map(([key]) => [key, ''])).forEach(([key, value]) => {
    state.research[key] = value;
  });
}

function fieldStatus(value, max) {
  if (!value) return 'חסר';
  if (value.length >= max) return 'מלא';
  return 'תקין';
}

function validateStep(step) {
  if (step === 1) return requiredResearchKeys.every((key) => (state.research[key] || '').trim());
  if (step === 2) {
    const screensValid = state.prototypeScreens.every((screen) => {
      if (!requiredPrototypeFields.every((key) => (screen[key] || '').trim())) return false;
      return screen.components.length >= 1 && screen.components.length <= 5 && screen.emphasis.length >= 1 && screen.emphasis.length <= 3;
    });
    if (!screensValid) return false;
    if (productType === 'website') {
      if (!state.prototypeFlow.start || !state.prototypeFlow.end || !state.prototypeFlow.summary || !state.prototypeFlow.hasBranch) return false;
      if (state.prototypeFlow.hasBranch === 'כן' && !state.prototypeFlow.branch.trim()) return false;
    }
    return true;
  }
  if (step === 3) {
    if (productType === 'website' && state.selectedWebsiteScreens.length !== 3) return false;
    return state.images.every((image) => {
      const screenOk = Boolean(image.screenRef);
      const emphasisOk = image.emphasis.length >= 1 && image.emphasis.length <= 3;
      const takeawayOk = image.takeaway.trim().length > 0;
      const styleOk = image.style.length >= 1 && image.style.length <= 2;
      const realismOk = Boolean(image.realism);
      const avoidOk = image.avoid.length <= 4;
      return screenOk && emphasisOk && takeawayOk && styleOk && realismOk && avoidOk;
    });
  }
  return true;
}

function pickPromptScreen(image) {
  const index = Number(image.screenRef) - 1;
  return state.prototypeScreens[index] || null;
}

function buildPrompt(imageIndex) {
  const image = state.images[imageIndex];
  const screen = pickPromptScreen(image);
  const slots = getVisualSlots('A4', productType);
  const slot = slots[imageIndex] || slots[0];
  const flowLine = productType === 'website'
    ? `הזרימה מתחילה ב${state.prototypeFlow.start} ומסתיימת ב${state.prototypeFlow.end}. ${state.prototypeFlow.summary}`
    : '';
  const avoidText = [...image.avoid, image.avoidOther].filter(Boolean).join(', ');
  return [
    `צרי תמונת ${productType === 'app' ? 'מסך אפליקציה' : 'מסך אתר'} לפוסטר לימודי עבור "${state.research.projectName}".`,
    `הבעיה: ${state.research.problem}. קהל היעד: ${state.research.audience}.`,
    `הפתרון: ${state.research.solution}. הערך המרכזי: ${state.research.value}.`,
    screen ? `המסך מייצג ${screen.type}${screen.shortName ? ` (${screen.shortName})` : ''}. המשתמשת רואה: ${screen.view}. המשתמשת עושה: ${screen.action}. רכיבים: ${screen.components.join(', ')}.` : '',
    flowLine,
    `מה חשוב שיבלוט: ${image.emphasis.join(', ')}. מה חשוב שיבינו: ${image.takeaway}.`,
    `סגנון: ${image.style.join(', ')}. רמת ריאליזם: ${image.realism}. צבעים בולטים: ${image.colors || 'לפי ההקשר של המיזם'}.`,
    avoidText ? `אל תכלילי: ${avoidText}.` : '',
    `התאימי לקומפוזיציית פוסטר בגודל ${slot.width}x${slot.height} עם מסגור נקי ומרווח פנימי שמכבד שוליים.`,
    qualityLine
  ].filter(Boolean).join(' ');
}

function seedPosterBuilderState() {
  const contentValues = {
    projectName: state.research.projectName,
    description: state.research.description,
    problem: state.research.problem,
    audience: state.research.audience,
    researchQuestion: state.research.researchQuestion,
    research_1: state.research.research_1,
    research_2: state.research.research_2,
    research_3: state.research.research_3,
    findings: state.research.findings,
    requirements_1: state.research.requirements_1,
    requirements_2: state.research.requirements_2,
    requirements_3: state.research.requirements_3,
    solution: state.research.solution,
    howItWorks_1: state.research.howItWorks_1,
    howItWorks_2: state.research.howItWorks_2,
    howItWorks_3: state.research.howItWorks_3,
    value: `${state.research.value}\nמשוב: ${state.research.feedback}\nשיפור: ${state.research.improvement}`,
    student1: '', student2: '', student3: '', className: '', schoolName: ''
  };

  const loaded = loadProject() || {};
  saveProject({
    ...loaded,
    posterSize: loaded.posterSize || 'A4',
    productType,
    contentValues
  });
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderStepper() {
  return `<div class="split-stepper">${stepLabels.map((label, index) => {
    const step = index + 1;
    const stateClass = step < state.step ? 'completed' : step === state.step ? 'active' : (validateStep(step - 1) ? '' : 'locked');
    return `<button class="split-step ${stateClass}" data-step="${step}" ${step > state.step && !validateStep(step - 1) ? 'disabled' : ''}>${step}. ${label}</button>`;
  }).join('')}</div>`;
}

function renderResearch() {
  return `<section class="split-card">${baseResearch.map(([key, label, max]) => {
    const value = state.research[key] || '';
    const status = fieldStatus(value.trim(), max);
    return `<label class="split-field"><span>${label}</span><textarea data-research="${key}" maxlength="${max}" rows="${max <= 42 ? 2 : 3}" placeholder="מלאי כאן" dir="rtl">${escapeHtml(value)}</textarea><small>${value.length}/${max} · ${status}</small></label>`;
  }).join('')}</section>`;
}

function selectOptions(name, options, selected, max, multi = true) {
  return `<div class="split-tags">${options.map((option) => {
    const isActive = selected.includes(option);
    return `<button type="button" data-tag="${name}" data-value="${option}" class="split-tag ${isActive ? 'active' : ''}" data-multi="${multi ? '1' : '0'}" data-max="${max}">${option}</button>`;
  }).join('')}</div>`;
}

function renderPrototype() {
  const screensHtml = state.prototypeScreens.map((screen) => `
    <article class="split-card">
      <h3>מסך ${screen.number}</h3>
      <label class="split-field"><span>מה סוג המסך?</span><select data-screen="${screen.number}" data-key="type"><option value="">בחרי</option>${protoOptions.map((option) => `<option ${screen.type === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label class="split-field"><span>שם קצר למסך</span><input data-screen="${screen.number}" data-key="shortName" value="${escapeHtml(screen.shortName)}" maxlength="30" /></label>
      <label class="split-field"><span>מה המשתמשת רואה במסך?</span><textarea data-screen="${screen.number}" data-key="view" maxlength="220" rows="3">${escapeHtml(screen.view)}</textarea></label>
      <label class="split-field"><span>מה המשתמשת עושה במסך?</span><textarea data-screen="${screen.number}" data-key="action" maxlength="220" rows="3">${escapeHtml(screen.action)}</textarea></label>
      <div class="split-field"><span>אילו רכיבים חייבים להופיע?</span>${selectOptions(`components-${screen.number}`, componentsOptions, screen.components, 5)}</div>
      <div class="split-field"><span>מה חשוב שיבלוט?</span>${selectOptions(`emphasis-${screen.number}`, protoEmphasisOptions, screen.emphasis, 3)}</div>
    </article>
  `).join('');

  const flowHtml = productType === 'website' ? `
  <article class="split-card">
    <h3>תרשים זרימה</h3>
    <label class="split-field"><span>מאיזה מסך מתחיל השימוש?</span><select data-flow="start"><option value="">בחרי</option>${[1,2,3,4,5].map((num) => `<option ${state.prototypeFlow.start === `מסך ${num}` ? 'selected' : ''}>מסך ${num}</option>`).join('')}</select></label>
    <label class="split-field"><span>באיזה מסך מסתיים השימוש?</span><select data-flow="end"><option value="">בחרי</option>${[1,2,3,4,5].map((num) => `<option ${state.prototypeFlow.end === `מסך ${num}` ? 'selected' : ''}>מסך ${num}</option>`).join('')}</select></label>
    <label class="split-field"><span>תארי בקצרה את זרימת השימוש</span><textarea data-flow="summary" maxlength="260">${escapeHtml(state.prototypeFlow.summary)}</textarea></label>
    <label class="split-field"><span>האם יש הסתעפות או בחירה בדרך?</span><select data-flow="hasBranch"><option value="">בחרי</option><option ${state.prototypeFlow.hasBranch === 'כן' ? 'selected' : ''}>כן</option><option ${state.prototypeFlow.hasBranch === 'לא' ? 'selected' : ''}>לא</option></select></label>
    ${state.prototypeFlow.hasBranch === 'כן' ? `<label class="split-field"><span>תארי את ההסתעפות</span><textarea data-flow="branch" maxlength="220">${escapeHtml(state.prototypeFlow.branch)}</textarea></label>` : ''}
  </article>` : '';

  return `${screensHtml}${flowHtml}`;
}

function renderImages() {
  const websitePickHtml = productType === 'website' ? `
  <section class="split-card"><h3>בחרי 3 מסכים לפוסטר</h3>
    ${[1,2,3,4,5].map((num) => `<label class="split-checkbox"><input type="checkbox" data-website-pick="${num}" ${state.selectedWebsiteScreens.includes(String(num)) ? 'checked' : ''}/>מסך ${num}</label>`).join('')}
    <small>נבחרו ${state.selectedWebsiteScreens.length}/3</small>
  </section>` : '';

  const allowed = productType === 'website' ? state.selectedWebsiteScreens : ['1', '2', '3'];
  const imageCards = state.images.map((image, index) => `
    <article class="split-card">
      <h3>${productType === 'app' ? `תמונה למסך ${index + 1}` : `תמונה ${index + 1} לפוסטר`}</h3>
      ${productType === 'website' ? `<label class="split-field"><span>איזה מסך האבטיפוס התמונה מייצגת?</span><select data-image="${index}" data-key="screenRef"><option value="">בחרי</option>${allowed.map((screenNo) => `<option value="${screenNo}" ${image.screenRef === screenNo ? 'selected' : ''}>מסך ${screenNo}</option>`).join('')}</select></label>` : ''}
      <div class="split-field"><span>מה חשוב שיבלוט?</span>${selectOptions(`image-emphasis-${index}`, imageEmphasisOptions, image.emphasis, 3)}</div>
      <label class="split-field"><span>${productType === 'app' ? 'מה חשוב שהצופה יבין מהמסך?' : 'מה חשוב שהצופה יבין מהתמונה?'}</span><textarea data-image="${index}" data-key="takeaway" maxlength="220">${escapeHtml(image.takeaway)}</textarea></label>
      <div class="split-field"><span>סגנון עיצובי</span>${selectOptions(`image-style-${index}`, imageStyleOptions, image.style, 2)}</div>
      <label class="split-field"><span>רמת ריאליזם</span><select data-image="${index}" data-key="realism"><option value="">בחרי</option>${['UI/UX ריאליסטי', 'מוקאפ מסך ריאליסטי', 'אילוסטרטיבי', 'חצי ריאליסטי', 'אחר'].map((option) => `<option ${image.realism === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label class="split-field"><span>צבעים בולטים</span><input data-image="${index}" data-key="colors" maxlength="80" value="${escapeHtml(image.colors)}" /></label>
      <div class="split-field"><span>מה לא לכלול</span>${selectOptions(`image-avoid-${index}`, imageAvoidOptions, image.avoid, 4)}</div>
      <label class="split-field"><span>פירוט נוסף למה לא לכלול</span><input data-image="${index}" data-key="avoidOther" maxlength="80" value="${escapeHtml(image.avoidOther)}" /></label>
      <div class="prompt-box"><strong>פרומפט מוכן:</strong><p id="prompt-${index}">${escapeHtml(buildPrompt(index))}</p><button type="button" data-copy-prompt="${index}">העתיקי פרומפט</button></div>
    </article>
  `).join('');

  return `${websitePickHtml}${imageCards}<section class="split-card"><button type="button" data-copy-all>העתיקי את כל הפרומפטים</button></section>`;
}

function renderPosterStep() {
  seedPosterBuilderState();
  return `<section class="split-card"><h3>הכול מוכן לפוסטר</h3><p>התשובות, המשוב, השיפור והמסכים הוכנו והוזרמו לבונה הפוסטר הקיים. עכשיו אפשר להמשיך לעיצוב הסופי.</p><a class="split-link" href="./editor.html?type=${productType}" target="_blank" rel="noopener">פתחי את Gateway בונת הפוסטר</a></section>`;
}

function renderStepBody() {
  if (state.step === 1) return renderResearch();
  if (state.step === 2) return renderPrototype();
  if (state.step === 3) return renderImages();
  return renderPosterStep();
}

function render() {
  root.innerHTML = `
  <style>
    .split-shell{max-width:1040px;margin:0 auto;padding:24px 20px 40px;color:#1f2937;font-family:"Rubik",sans-serif}
    .split-title{margin:0 0 18px;text-align:center}
    .split-stepper{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:22px}
    .split-step{border:1px solid #d4d4d8;background:#fff;border-radius:999px;padding:8px 14px;cursor:pointer}
    .split-step.active{background:#5E2750;color:#fff}.split-step.completed{background:#ecfdf3;border-color:#16a34a}
    .split-step.locked{opacity:.45;cursor:not-allowed}
    .split-body{display:grid;gap:14px}.split-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:14px;display:grid;gap:10px}
    .split-field{display:grid;gap:6px}.split-field textarea,.split-field input,.split-field select{border:1px solid #d4d4d8;border-radius:10px;padding:10px;font:inherit}
    .split-field small{color:#4b5563}.split-tags{display:flex;flex-wrap:wrap;gap:8px}.split-tag{border:1px solid #cbd5e1;background:#f8fafc;padding:6px 10px;border-radius:999px;cursor:pointer}
    .split-tag.active{background:#5E2750;color:#fff;border-color:#5E2750}.split-nav{display:flex;justify-content:space-between;margin-top:18px}
    .split-btn{border:none;border-radius:10px;padding:10px 16px;cursor:pointer}.split-btn.primary{background:#5E2750;color:#fff}.split-btn.ghost{background:#f3f4f6}
    .split-checkbox{display:flex;gap:8px;align-items:center}.prompt-box p{white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:10px}
    .split-link{display:inline-block;background:#5E2750;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none}
  </style>
  <main class="split-shell">
    <h1 class="split-title">${title}</h1>
    ${renderStepper()}
    <section class="split-body">${renderStepBody()}</section>
    <nav class="split-nav">
      <button class="split-btn ghost" data-nav="back" ${state.step === 1 ? 'disabled' : ''}>חזרה</button>
      <button class="split-btn primary" data-nav="next">${state.step === 4 ? 'סיום' : 'אפשר להמשיך לשלב הבא'}</button>
    </nav>
  </main>`;

  wireEvents();
}

function toggleTag(button) {
  const tag = button.dataset.tag;
  const max = Number(button.dataset.max);
  const value = button.dataset.value;
  let target;

  if (tag.startsWith('components-')) {
    const number = Number(tag.replace('components-', ''));
    target = state.prototypeScreens[number - 1].components;
  }
  if (tag.startsWith('emphasis-')) {
    const number = Number(tag.replace('emphasis-', ''));
    target = state.prototypeScreens[number - 1].emphasis;
  }
  if (tag.startsWith('image-emphasis-')) {
    const index = Number(tag.replace('image-emphasis-', ''));
    target = state.images[index].emphasis;
  }
  if (tag.startsWith('image-style-')) {
    const index = Number(tag.replace('image-style-', ''));
    target = state.images[index].style;
  }
  if (tag.startsWith('image-avoid-')) {
    const index = Number(tag.replace('image-avoid-', ''));
    target = state.images[index].avoid;
  }
  if (!target) return;
  const found = target.indexOf(value);
  if (found >= 0) target.splice(found, 1);
  else if (target.length < max) target.push(value);
}

function wireEvents() {
  root.querySelectorAll('[data-step]').forEach((button) => button.addEventListener('click', () => {
    const target = Number(button.dataset.step);
    if (target <= state.step || validateStep(target - 1)) {
      state.step = target;
      render();
    }
  }));

  root.querySelectorAll('[data-research]').forEach((input) => input.addEventListener('input', () => {
    state.research[input.dataset.research] = input.value;
    input.nextElementSibling.textContent = `${input.value.length}/${input.maxLength} · ${fieldStatus(input.value.trim(), Number(input.maxLength))}`;
  }));

  root.querySelectorAll('[data-screen]').forEach((input) => input.addEventListener('input', () => {
    const screen = state.prototypeScreens[Number(input.dataset.screen) - 1];
    screen[input.dataset.key] = input.value;
  }));

  root.querySelectorAll('[data-flow]').forEach((input) => input.addEventListener('input', () => {
    state.prototypeFlow[input.dataset.flow] = input.value;
    if (input.dataset.flow === 'hasBranch') render();
  }));

  root.querySelectorAll('[data-tag]').forEach((button) => button.addEventListener('click', () => {
    toggleTag(button);
    render();
  }));

  root.querySelectorAll('[data-website-pick]').forEach((checkbox) => checkbox.addEventListener('change', () => {
    const value = checkbox.dataset.websitePick;
    if (checkbox.checked && state.selectedWebsiteScreens.length < 3) state.selectedWebsiteScreens.push(value);
    if (!checkbox.checked) state.selectedWebsiteScreens = state.selectedWebsiteScreens.filter((item) => item !== value);
    if (state.selectedWebsiteScreens.length > 3) state.selectedWebsiteScreens = state.selectedWebsiteScreens.slice(0, 3);
    render();
  }));

  root.querySelectorAll('[data-image]').forEach((input) => input.addEventListener('input', () => {
    const image = state.images[Number(input.dataset.image)];
    image[input.dataset.key] = input.value;
    const prompt = root.querySelector(`#prompt-${input.dataset.image}`);
    if (prompt) prompt.textContent = buildPrompt(Number(input.dataset.image));
  }));

  root.querySelectorAll('[data-copy-prompt]').forEach((button) => button.addEventListener('click', async () => {
    const index = Number(button.dataset.copyPrompt);
    await navigator.clipboard.writeText(buildPrompt(index));
    button.textContent = 'הועתק בהצלחה';
  }));

  const copyAll = root.querySelector('[data-copy-all]');
  if (copyAll) {
    copyAll.addEventListener('click', async () => {
      const all = state.images.map((_, index) => `פרומפט ${index + 1}:\n${buildPrompt(index)}`).join('\n\n');
      await navigator.clipboard.writeText(all);
      copyAll.textContent = 'כל הפרומפטים הועתקו';
    });
  }

  root.querySelector('[data-nav="back"]').addEventListener('click', () => {
    if (state.step > 1) {
      state.step -= 1;
      render();
    }
  });

  root.querySelector('[data-nav="next"]').addEventListener('click', () => {
    if (state.step < 4 && !validateStep(state.step)) {
      alert('השלימי את כל שדות החובה לפני ההמשך.');
      return;
    }
    if (state.step < 4) {
      state.step += 1;
      render();
    }
  });
}

initializeState();
render();
