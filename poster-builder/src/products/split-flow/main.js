import { getVisualSlots, getPosterFields, FIELD_DEFINITIONS } from '../physical/config.js';
import { saveProject, loadProject } from '../../shared/storage.js';

const productType = ['physical', 'website', 'app'].includes(window.__POSTER_SPLIT_PRODUCT__)
  ? window.__POSTER_SPLIT_PRODUCT__
  : 'website';
const root = document.getElementById('root');
const STEP_LABELS = productType === 'physical'
  ? ['שאלות חקר', 'שאלות פרומפט', 'תמונות', 'פוסטר']
  : ['שאלות חקר', 'אבטיפוס', 'תמונות', 'פוסטר'];

const PRODUCT_TITLE = {
  physical: 'מוצר פיזי',
  website: 'אתר',
  app: 'אפליקציה'
};

const QUALITY_REQUIREMENTS = 'poster-friendly composition, high quality, clean composition, no watermark, no text overlay, no logo';

const posterSize = loadProject()?.posterSize || 'A4';
const valueFieldDef = FIELD_DEFINITIONS.find((field) => field.id === 'value');
const valueRect = getPosterFields(posterSize, productType).find((field) => field.id === 'value');

function deriveCharsByFieldPortion(portion) {
  const charsPerLine = Math.floor(valueRect.width / (valueFieldDef.fontSize * 0.55));
  const lines = Math.floor(valueRect.height / (valueFieldDef.fontSize * valueFieldDef.lineHeight));
  return Math.max(42, Math.floor(charsPerLine * lines * portion));
}

const FEEDBACK_MAX = deriveCharsByFieldPortion(0.45);
const IMPROVEMENT_MAX = deriveCharsByFieldPortion(0.4);

const RESEARCH_FIELDS = [
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
  [
    'solution',
    productType === 'physical' ? 'מהו המוצר הפיזי שפיתחתן?' : (productType === 'website' ? 'מהו האתר שפיתחתן?' : 'מהי האפליקציה שפיתחתן?'),
    130
  ],
  [
    'howItWorks_1',
    productType === 'physical' ? 'איך משתמשים במוצר? 1' : (productType === 'website' ? 'מה המשתמשת עושה באתר? 1' : 'איך המשתמשת משתמשת באפליקציה? 1'),
    42
  ],
  [
    'howItWorks_2',
    productType === 'physical' ? 'איך משתמשים במוצר? 2' : (productType === 'website' ? 'מה המשתמשת עושה באתר? 2' : 'איך המשתמשת משתמשת באפליקציה? 2'),
    42
  ],
  [
    'howItWorks_3',
    productType === 'physical' ? 'איך משתמשים במוצר? 3' : (productType === 'website' ? 'מה המשתמשת עושה באתר? 3' : 'איך המשתמשת משתמשת באפליקציה? 3'),
    42
  ],
  ['value', 'מה הערך המרכזי של הפתרון?', 110],
  ['feedback', 'איזה משוב קיבלתן?', FEEDBACK_MAX],
  ['improvement', 'מה שיפרתן בעקבות המשוב?', IMPROVEMENT_MAX]
];

const SCREEN_TYPE_OPTIONS = ['מסך פתיחה', 'מסך בית', 'חיפוש', 'פעולה מרכזית', 'תוצאות', 'אזור אישי', 'פרופיל', 'הרשמה', 'התחברות', 'מעקב', 'אחר'];
const COMPONENT_OPTIONS = ['כותרת', 'תפריט', 'ניווט תחתון', 'כפתור פעולה ראשי', 'כרטיסיות', 'גרף', 'רשימה', 'טופס', 'פרופיל', 'מפה', 'התראות', 'אזור מידע', 'תמונת פתיחה', 'אחר'];
const EMPHASIS_OPTIONS = ['הפעולה המרכזית', 'הכפתור הראשי', 'הניווט', 'המידע המרכזי', 'התוצאה', 'הפשטות', 'העיצוב', 'אחר'];
const STYLE_OPTIONS = ['מודרני', 'נקי', 'טכנולוגי', 'ידידותי', 'צעיר', 'מקצועי', 'מינימליסטי', 'חם אנושי', 'אחר'];
const REALISM_OPTIONS = ['ריאליסטי', 'חצי ריאליסטי', 'אילוסטרטיבי', 'מוקאפ UI/UX', 'אחר'];
const AVOID_OPTIONS = ['עומס', 'טקסט ארוך מדי', 'אלמנטים לא קשורים', 'יותר מדי צבעים', 'לוגואים אמיתיים', 'עיצוב עמוס', 'אחר'];

const PHYSICAL_MAIN_OPTIONS = {
  appearance: ['מונח על משטח', 'מוחזק ביד', 'בתצוגה ישירה', 'בזווית דינמית', 'אחר'],
  highlight: ['המנגנון המרכזי', 'פשטות השימוש', 'החדשנות', 'החומריות', 'הגודל היחסי', 'אחר'],
  material: ['פלסטיק', 'מתכת', 'עץ', 'בד', 'שילוב חומרים', 'אחר'],
  background: ['רקע נקי ובהיר', 'רקע כיתה', 'רקע מעבדה', 'רקע ביתי', 'רקע טכנולוגי', 'אחר'],
  style: STYLE_OPTIONS,
  realism: REALISM_OPTIONS,
  avoid: AVOID_OPTIONS
};

const PHYSICAL_USAGE_OPTIONS = {
  user: ['ילדה', 'נערה', 'בוגרת', 'צוות תלמידות', 'אחר'],
  peopleCount: ['משתמשת אחת', 'שתיים', 'שלוש ומעלה'],
  location: ['כיתה', 'בית', 'מעבדה', 'חצר בית ספר', 'מרחב קהילתי', 'אחר'],
  props: ['שולחן עבודה', 'מחברת', 'טלפון', 'מחשב נייד', 'כלי כתיבה', 'אחר'],
  highlight: ['אופן השימוש', 'הפעולה המרכזית', 'קלות שימוש', 'הקשר לבעיה', 'האינטראקציה', 'אחר'],
  style: STYLE_OPTIONS,
  realism: REALISM_OPTIONS,
  avoid: AVOID_OPTIONS
};

const state = {
  step: 1,
  research: Object.fromEntries(RESEARCH_FIELDS.map(([key]) => [key, ''])),
  errors: {},
  physicalPrompt: {
    main: { appearance: '', highlight: [], material: '', background: '', style: [], realism: '', description: '', colors: '', avoid: [], avoidOther: '' },
    usage: { user: '', peopleCount: '', location: '', action: '', props: [], propsOther: '', highlight: [], takeaway: '', style: [], realism: '', colors: '', avoid: [], avoidOther: '' }
  },
  prototypeScreens: Array.from({ length: productType === 'website' ? 5 : 3 }, (_, index) => ({
    number: index + 1,
    type: '',
    shortName: '',
    view: '',
    action: '',
    components: [],
    emphasis: []
  })),
  prototypeFlow: { start: '', end: '', summary: '', hasBranch: '', branch: '' },
  selectedWebsiteScreens: ['1', '2', '3'],
  images: Array.from({ length: 3 }, (_, index) => ({
    id: index + 1,
    screenRef: `${index + 1}`,
    emphasis: [],
    takeaway: '',
    style: [],
    realism: '',
    colors: '',
    avoid: [],
    avoidOther: ''
  }))
};

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function statusLabel(value, max) {
  if (!value.trim()) return 'חסר';
  if (value.length >= max) return 'מלא';
  return 'תקין';
}

function validateResearch() {
  const stepErrors = {};
  RESEARCH_FIELDS.forEach(([key, label, max]) => {
    const value = (state.research[key] || '').trim();
    if (!value) stepErrors[key] = `השדה "${label}" הוא שדה חובה.`;
    if ((state.research[key] || '').length > max) stepErrors[key] = `אפשר להזין עד ${max} תווים.`;
  });
  state.errors = stepErrors;
  return Object.keys(stepErrors).length === 0;
}

function validatePhysicalPrompt() {
  const { main, usage } = state.physicalPrompt;
  const errors = {};

  if (!main.appearance) errors.mainAppearance = 'בחרי איך המוצר מופיע.';
  if (main.highlight.length < 1 || main.highlight.length > 3) errors.mainHighlight = 'בחרי בין פריט אחד לשלושה.';
  if (!main.material) errors.mainMaterial = 'בחרי חומר או מרקם.';
  if (!main.background) errors.mainBackground = 'בחרי רקע רצוי.';
  if (main.style.length < 1 || main.style.length > 2) errors.mainStyle = 'בחרי בין סגנון אחד לשניים.';
  if (!main.realism) errors.mainRealism = 'בחרי רמת ריאליזם.';
  if (!main.description.trim()) errors.mainDescription = 'תארי מה צריך לראות בתמונה.';

  if (!usage.user) errors.usageUser = 'בחרי מי משתמשת במוצר.';
  if (!usage.peopleCount) errors.usageCount = 'בחרי כמה אנשים בתמונה.';
  if (!usage.location) errors.usageLocation = 'בחרי איפה מתרחש השימוש.';
  if (!usage.action.trim()) errors.usageAction = 'תארי את הפעולה המוצגת.';
  if (usage.highlight.length < 1 || usage.highlight.length > 3) errors.usageHighlight = 'בחרי בין פריט אחד לשלושה.';
  if (!usage.takeaway.trim()) errors.usageTakeaway = 'תארי מה חשוב שהצופה תבין.';
  if (usage.style.length < 1 || usage.style.length > 2) errors.usageStyle = 'בחרי בין סגנון אחד לשניים.';
  if (!usage.realism) errors.usageRealism = 'בחרי רמת ריאליזם.';

  state.errors = errors;
  return Object.keys(errors).length === 0;
}

function validatePrototype() {
  const errors = {};
  state.prototypeScreens.forEach((screen, idx) => {
    if (!screen.type) errors[`screenType${idx}`] = 'בחרי סוג מסך.';
    if (!screen.view.trim()) errors[`screenView${idx}`] = 'תארי מה המשתמשת רואה.';
    if (!screen.action.trim()) errors[`screenAction${idx}`] = 'תארי מה המשתמשת עושה.';
    if (screen.components.length < 1 || screen.components.length > 5) errors[`screenComponents${idx}`] = 'בחרי בין רכיב אחד לחמישה.';
    if (screen.emphasis.length < 1 || screen.emphasis.length > 3) errors[`screenEmphasis${idx}`] = 'בחרי בין פריט אחד לשלושה.';
  });

  if (productType === 'website') {
    if (!state.prototypeFlow.start) errors.flowStart = 'בחרי מסך התחלה.';
    if (!state.prototypeFlow.end) errors.flowEnd = 'בחרי מסך סיום.';
    if (!state.prototypeFlow.summary.trim()) errors.flowSummary = 'תארי את זרימת השימוש.';
    if (!state.prototypeFlow.hasBranch) errors.flowBranchToggle = 'בחרי האם קיימת הסתעפות.';
    if (state.prototypeFlow.hasBranch === 'כן' && !state.prototypeFlow.branch.trim()) errors.flowBranchText = 'תארי את ההסתעפות.';
  }

  state.errors = errors;
  return Object.keys(errors).length === 0;
}

function validateImagesStep() {
  const errors = {};
  if (productType === 'website' && state.selectedWebsiteScreens.length !== 3) {
    errors.selectedScreens = 'בחרי בדיוק 3 מסכים לפוסטר.';
  }
  state.images.forEach((image, idx) => {
    if (!image.screenRef) errors[`imageScreen${idx}`] = 'בחרי מסך.';
    if (image.emphasis.length < 1 || image.emphasis.length > 3) errors[`imageEmphasis${idx}`] = 'בחרי בין פריט אחד לשלושה.';
    if (!image.takeaway.trim()) errors[`imageTakeaway${idx}`] = 'תארי מה חשוב שהצופה תבין.';
    if (image.style.length < 1 || image.style.length > 2) errors[`imageStyle${idx}`] = 'בחרי בין סגנון אחד לשניים.';
    if (!image.realism) errors[`imageRealism${idx}`] = 'בחרי רמת ריאליזם.';
  });
  state.errors = errors;
  return Object.keys(errors).length === 0;
}

function validateStep(step) {
  if (step === 1) return validateResearch();
  if (step === 2) return productType === 'physical' ? validatePhysicalPrompt() : validatePrototype();
  if (step === 3) return productType === 'physical' ? true : validateImagesStep();
  return true;
}

function slots() {
  return getVisualSlots(posterSize, productType);
}

function basePromptContext(slot, imageRole) {
  return `התמונה מיועדת לפוסטר חקר, עבור ${PRODUCT_TITLE[productType]} בשם "${state.research.projectName}". הבעיה שזיהינו: ${state.research.problem}. קהל יעד: ${state.research.audience}. הפתרון: ${state.research.solution}. הערך המרכזי: ${state.research.value}. התאמה למסגרת בפוסטר: יחס ${slot.width}:${slot.height}, מסגור מדויק, קומפוזיציה שמתאימה למסגרת, פרטים חשובים במרכז הבטוח. ${imageRole}. ${QUALITY_REQUIREMENTS}.`;
}

function buildPhysicalPrompt(kind) {
  const slot = slots()[kind === 'main' ? 0 : 1] || slots()[0];
  const data = state.physicalPrompt[kind];

  if (kind === 'main') {
    const avoidText = [...data.avoid, data.avoidOther].filter(Boolean).join(', ');
    return `${basePromptContext(slot, 'מדובר בתמונה ראשית של המוצר.')}
המוצר מופיע כך: ${data.appearance}. חשוב שיבלוט: ${data.highlight.join(', ')}. חומר/מרקם: ${data.material}. רקע: ${data.background}. סגנון: ${data.style.join(', ')}. רמת ריאליזם: ${data.realism}. צריך לראות בתמונה: ${data.description}. צבעים בולטים: ${data.colors || 'בהתאם לשפה העיצובית של המיזם'}.${avoidText ? ` אל תכלילי: ${avoidText}.` : ''}`;
  }

  const avoidText = [...data.avoid, data.avoidOther].filter(Boolean).join(', ');
  const props = [...data.props, data.propsOther].filter(Boolean).join(', ');
  return `${basePromptContext(slot, 'מדובר בתמונת שימוש שממחישה אינטראקציה עם המוצר.')}
מי משתמשת: ${data.user}. מספר אנשים: ${data.peopleCount}. מיקום: ${data.location}. הפעולה המוצגת: ${data.action}. חפצים נוספים: ${props || 'ללא חפצים נוספים'}.
מה צריך לבלוט: ${data.highlight.join(', ')}. מה חשוב שהצופה תבין: ${data.takeaway}. סגנון: ${data.style.join(', ')}. רמת ריאליזם: ${data.realism}. צבעים בולטים: ${data.colors || 'בהתאם לשפה העיצובית של המיזם'}.${avoidText ? ` אל תכלילי: ${avoidText}.` : ''}`;
}

function buildDigitalPrompt(index) {
  const image = state.images[index];
  const slot = slots()[index] || slots()[0];
  const screen = state.prototypeScreens[Number(image.screenRef) - 1];
  const flowLine = productType === 'website'
    ? `זרימת השימוש מתחילה ב-${state.prototypeFlow.start} ומסתיימת ב-${state.prototypeFlow.end}. סיכום זרימה: ${state.prototypeFlow.summary}. ${state.prototypeFlow.hasBranch === 'כן' ? `הסתעפות: ${state.prototypeFlow.branch}.` : 'אין הסתעפות.'}`
    : '';
  const avoidText = [...image.avoid, image.avoidOther].filter(Boolean).join(', ');

  return `${basePromptContext(slot, `מדובר בתמונת מסך מספר ${index + 1} לפוסטר.`)}
המסך המיוצג: ${screen?.type || 'לא הוגדר'}${screen?.shortName ? ` (${screen.shortName})` : ''}. מה המשתמשת רואה במסך: ${screen?.view || ''}. מה המשתמשת עושה במסך: ${screen?.action || ''}. רכיבים חשובים: ${screen?.components?.join(', ') || ''}. מה חשוב שיבלוט: ${image.emphasis.join(', ')}. מה חשוב שהצופה תבין: ${image.takeaway}. סגנון: ${image.style.join(', ')}. רמת ריאליזם: ${image.realism}. צבעים בולטים: ${image.colors || 'בהתאם לשפה העיצובית של המיזם'}. ${flowLine}${avoidText ? ` אל תכלילי: ${avoidText}.` : ''}`;
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
    value: `${state.research.value}\nמשוב שקיבלנו: ${state.research.feedback}\nמה שיפרנו: ${state.research.improvement}`,
    student1: '',
    student2: '',
    student3: '',
    className: '',
    schoolName: ''
  };

  const stored = loadProject() || {};
  saveProject({
    ...stored,
    posterSize: stored.posterSize || posterSize,
    productType,
    contentValues
  });
}

function renderError(key) {
  return state.errors[key] ? `<small class="split-error">${state.errors[key]}</small>` : '';
}

function renderTags(tagName, options, selected, max) {
  return `<div class="split-tags">${options.map((option) => {
    const active = selected.includes(option);
    return `<button type="button" class="split-tag ${active ? 'active' : ''}" data-tag="${tagName}" data-value="${escapeHtml(option)}" data-max="${max}">${option}</button>`;
  }).join('')}</div>`;
}

function renderStep1() {
  return `<section class="split-card">${RESEARCH_FIELDS.map(([key, label, max]) => {
    const value = state.research[key] || '';
    const rows = max <= 42 ? 2 : 3;
    return `<label class="split-field">
      <span>${label} <em>*</em></span>
      <textarea data-research="${key}" maxlength="${max}" rows="${rows}" placeholder="כתבי כאן" dir="rtl">${escapeHtml(value)}</textarea>
      <small>${value.length}/${max} · ${statusLabel(value, max)}</small>
      ${renderError(key)}
    </label>`;
  }).join('')}</section>`;
}

function renderPrototypeScreens() {
  return state.prototypeScreens.map((screen, index) => `
    <article class="split-card">
      <h3>כרטיס מסך ${screen.number}</h3>
      <label class="split-field"><span>מה סוג המסך? <em>*</em></span><select data-screen="${index}" data-key="type"><option value="">בחרי</option>${SCREEN_TYPE_OPTIONS.map((option) => `<option ${screen.type === option ? 'selected' : ''}>${option}</option>`).join('')}</select>${renderError(`screenType${index}`)}</label>
      <label class="split-field"><span>שם קצר למסך</span><input data-screen="${index}" data-key="shortName" maxlength="30" value="${escapeHtml(screen.shortName)}" /></label>
      <label class="split-field"><span>מה המשתמשת רואה במסך? <em>*</em></span><textarea data-screen="${index}" data-key="view" maxlength="220">${escapeHtml(screen.view)}</textarea>${renderError(`screenView${index}`)}</label>
      <label class="split-field"><span>מה המשתמשת עושה במסך? <em>*</em></span><textarea data-screen="${index}" data-key="action" maxlength="220">${escapeHtml(screen.action)}</textarea>${renderError(`screenAction${index}`)}</label>
      <div class="split-field"><span>אילו רכיבים חייבים להופיע? <em>*</em></span>${renderTags(`components-${index}`, COMPONENT_OPTIONS, screen.components, 5)}${renderError(`screenComponents${index}`)}</div>
      <div class="split-field"><span>מה חשוב שיבלוט? <em>*</em></span>${renderTags(`emphasis-${index}`, EMPHASIS_OPTIONS, screen.emphasis, 3)}${renderError(`screenEmphasis${index}`)}</div>
    </article>
  `).join('');
}

function renderStep2Physical() {
  const { main, usage } = state.physicalPrompt;
  return `
    <article class="split-card">
      <h3>כרטיס תמונה ראשית</h3>
      <label class="split-field"><span>איך המוצר מופיע? <em>*</em></span><select data-physical="main" data-key="appearance"><option value="">בחרי</option>${PHYSICAL_MAIN_OPTIONS.appearance.map((o) => `<option ${main.appearance === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('mainAppearance')}</label>
      <div class="split-field"><span>מה חשוב שיבלוט? <em>*</em></span>${renderTags('main-highlight', PHYSICAL_MAIN_OPTIONS.highlight, main.highlight, 3)}${renderError('mainHighlight')}</div>
      <label class="split-field"><span>חומר / מרקם המוצר <em>*</em></span><select data-physical="main" data-key="material"><option value="">בחרי</option>${PHYSICAL_MAIN_OPTIONS.material.map((o) => `<option ${main.material === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('mainMaterial')}</label>
      <label class="split-field"><span>רקע רצוי <em>*</em></span><select data-physical="main" data-key="background"><option value="">בחרי</option>${PHYSICAL_MAIN_OPTIONS.background.map((o) => `<option ${main.background === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('mainBackground')}</label>
      <div class="split-field"><span>סגנון עיצובי <em>*</em></span>${renderTags('main-style', PHYSICAL_MAIN_OPTIONS.style, main.style, 2)}${renderError('mainStyle')}</div>
      <label class="split-field"><span>רמת ריאליזם <em>*</em></span><select data-physical="main" data-key="realism"><option value="">בחרי</option>${PHYSICAL_MAIN_OPTIONS.realism.map((o) => `<option ${main.realism === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('mainRealism')}</label>
      <label class="split-field"><span>מה צריך לראות בתמונה? <em>*</em></span><textarea data-physical="main" data-key="description" maxlength="220">${escapeHtml(main.description)}</textarea>${renderError('mainDescription')}</label>
      <label class="split-field"><span>צבעים בולטים</span><input data-physical="main" data-key="colors" maxlength="80" value="${escapeHtml(main.colors)}" /></label>
      <div class="split-field"><span>מה לא לכלול</span>${renderTags('main-avoid', PHYSICAL_MAIN_OPTIONS.avoid, main.avoid, 4)}</div>
      <label class="split-field"><span>פירוט נוסף למה לא לכלול</span><input data-physical="main" data-key="avoidOther" maxlength="80" value="${escapeHtml(main.avoidOther)}" /></label>
    </article>

    <article class="split-card">
      <h3>כרטיס תמונת שימוש</h3>
      <label class="split-field"><span>מי משתמשת במוצר? <em>*</em></span><select data-physical="usage" data-key="user"><option value="">בחרי</option>${PHYSICAL_USAGE_OPTIONS.user.map((o) => `<option ${usage.user === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('usageUser')}</label>
      <label class="split-field"><span>כמה אנשים בתמונה? <em>*</em></span><select data-physical="usage" data-key="peopleCount"><option value="">בחרי</option>${PHYSICAL_USAGE_OPTIONS.peopleCount.map((o) => `<option ${usage.peopleCount === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('usageCount')}</label>
      <label class="split-field"><span>איפה מתרחש השימוש? <em>*</em></span><select data-physical="usage" data-key="location"><option value="">בחרי</option>${PHYSICAL_USAGE_OPTIONS.location.map((o) => `<option ${usage.location === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('usageLocation')}</label>
      <label class="split-field"><span>מה הפעולה המוצגת? <em>*</em></span><textarea data-physical="usage" data-key="action" maxlength="220">${escapeHtml(usage.action)}</textarea>${renderError('usageAction')}</label>
      <div class="split-field"><span>אילו חפצים נוספים צריכים להופיע?</span>${renderTags('usage-props', PHYSICAL_USAGE_OPTIONS.props, usage.props, 4)}</div>
      <label class="split-field"><span>פירוט נוסף לחפצים</span><input data-physical="usage" data-key="propsOther" maxlength="80" value="${escapeHtml(usage.propsOther)}" /></label>
      <div class="split-field"><span>מה צריך לבלוט? <em>*</em></span>${renderTags('usage-highlight', PHYSICAL_USAGE_OPTIONS.highlight, usage.highlight, 3)}${renderError('usageHighlight')}</div>
      <label class="split-field"><span>מה חשוב שהצופה תבין? <em>*</em></span><textarea data-physical="usage" data-key="takeaway" maxlength="220">${escapeHtml(usage.takeaway)}</textarea>${renderError('usageTakeaway')}</label>
      <div class="split-field"><span>סגנון עיצובי <em>*</em></span>${renderTags('usage-style', PHYSICAL_USAGE_OPTIONS.style, usage.style, 2)}${renderError('usageStyle')}</div>
      <label class="split-field"><span>רמת ריאליזם <em>*</em></span><select data-physical="usage" data-key="realism"><option value="">בחרי</option>${PHYSICAL_USAGE_OPTIONS.realism.map((o) => `<option ${usage.realism === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('usageRealism')}</label>
      <label class="split-field"><span>צבעים בולטים</span><input data-physical="usage" data-key="colors" maxlength="80" value="${escapeHtml(usage.colors)}" /></label>
      <div class="split-field"><span>מה לא לכלול</span>${renderTags('usage-avoid', PHYSICAL_USAGE_OPTIONS.avoid, usage.avoid, 4)}</div>
      <label class="split-field"><span>פירוט נוסף למה לא לכלול</span><input data-physical="usage" data-key="avoidOther" maxlength="80" value="${escapeHtml(usage.avoidOther)}" /></label>
    </article>`;
}

function renderStep2() {
  if (productType === 'physical') return renderStep2Physical();

  const flowCard = productType === 'website' ? `
    <article class="split-card">
      <h3>כרטיס תרשים זרימה</h3>
      <label class="split-field"><span>מאיזה מסך מתחיל השימוש? <em>*</em></span><select data-flow="start"><option value="">בחרי</option>${[1, 2, 3, 4, 5].map((num) => `<option ${state.prototypeFlow.start === `מסך ${num}` ? 'selected' : ''}>מסך ${num}</option>`).join('')}</select>${renderError('flowStart')}</label>
      <label class="split-field"><span>באיזה מסך מסתיים השימוש? <em>*</em></span><select data-flow="end"><option value="">בחרי</option>${[1, 2, 3, 4, 5].map((num) => `<option ${state.prototypeFlow.end === `מסך ${num}` ? 'selected' : ''}>מסך ${num}</option>`).join('')}</select>${renderError('flowEnd')}</label>
      <label class="split-field"><span>תארי בקצרה את זרימת השימוש <em>*</em></span><textarea data-flow="summary" maxlength="260">${escapeHtml(state.prototypeFlow.summary)}</textarea>${renderError('flowSummary')}</label>
      <label class="split-field"><span>האם יש הסתעפות? <em>*</em></span><select data-flow="hasBranch"><option value="">בחרי</option><option ${state.prototypeFlow.hasBranch === 'כן' ? 'selected' : ''}>כן</option><option ${state.prototypeFlow.hasBranch === 'לא' ? 'selected' : ''}>לא</option></select>${renderError('flowBranchToggle')}</label>
      ${state.prototypeFlow.hasBranch === 'כן' ? `<label class="split-field"><span>אם כן: תארי את ההסתעפות <em>*</em></span><textarea data-flow="branch" maxlength="220">${escapeHtml(state.prototypeFlow.branch)}</textarea>${renderError('flowBranchText')}</label>` : ''}
    </article>
  ` : '';

  return `${renderPrototypeScreens()}${flowCard}`;
}

function renderStep3() {
  if (productType === 'physical') {
    const mainPrompt = buildPhysicalPrompt('main');
    const usagePrompt = buildPhysicalPrompt('usage');

    return `
      <article class="split-card">
        <h3>פרומפט לתמונה ראשית</h3>
        <pre class="split-prompt" id="prompt-main">${escapeHtml(mainPrompt)}</pre>
        <button type="button" class="split-btn ghost" data-copy-physical="main">העתיקי פרומפט</button>
      </article>
      <article class="split-card">
        <h3>פרומפט לתמונת שימוש</h3>
        <pre class="split-prompt" id="prompt-usage">${escapeHtml(usagePrompt)}</pre>
        <button type="button" class="split-btn ghost" data-copy-physical="usage">העתיקי פרומפט</button>
      </article>
      <article class="split-card">
        <button type="button" class="split-btn primary" data-copy-physical="all">העתיקי את שני הפרומפטים</button>
      </article>`;
  }

  const screenPicker = productType === 'website' ? `
    <article class="split-card">
      <h3>בחירת 3 מסכים לפוסטר</h3>
      <div class="split-picks">${[1, 2, 3, 4, 5].map((num) => `<label class="split-check"><input type="checkbox" data-website-pick="${num}" ${state.selectedWebsiteScreens.includes(String(num)) ? 'checked' : ''}/> מסך ${num}</label>`).join('')}</div>
      <small>נבחרו ${state.selectedWebsiteScreens.length}/3</small>
      ${renderError('selectedScreens')}
    </article>` : '';

  const allowedScreens = productType === 'website' ? state.selectedWebsiteScreens : ['1', '2', '3'];
  const cards = state.images.map((image, index) => `
    <article class="split-card">
      <h3>${productType === 'website' ? `תמונה ${index + 1}` : `תמונה ${index + 1} (מסך ${index + 1})`}</h3>
      <label class="split-field"><span>איזה מסך האבטיפוס התמונה מייצגת? <em>*</em></span>
        <select data-image="${index}" data-key="screenRef" ${productType === 'app' ? 'disabled' : ''}>
          <option value="">בחרי</option>
          ${allowedScreens.map((screenNo) => `<option value="${screenNo}" ${image.screenRef === screenNo ? 'selected' : ''}>מסך ${screenNo}</option>`).join('')}
        </select>
        ${renderError(`imageScreen${index}`)}
      </label>
      <div class="split-field"><span>מה חשוב שיבלוט? <em>*</em></span>${renderTags(`image-emphasis-${index}`, EMPHASIS_OPTIONS, image.emphasis, 3)}${renderError(`imageEmphasis${index}`)}</div>
      <label class="split-field"><span>${productType === 'app' ? 'מה חשוב שהצופה תבין מהמסך?' : 'מה חשוב שהצופה תבין מהתמונה?'} <em>*</em></span><textarea data-image="${index}" data-key="takeaway" maxlength="220">${escapeHtml(image.takeaway)}</textarea>${renderError(`imageTakeaway${index}`)}</label>
      <div class="split-field"><span>סגנון עיצובי <em>*</em></span>${renderTags(`image-style-${index}`, STYLE_OPTIONS, image.style, 2)}${renderError(`imageStyle${index}`)}</div>
      <label class="split-field"><span>רמת ריאליזם <em>*</em></span><select data-image="${index}" data-key="realism"><option value="">בחרי</option>${REALISM_OPTIONS.map((option) => `<option ${image.realism === option ? 'selected' : ''}>${option}</option>`).join('')}</select>${renderError(`imageRealism${index}`)}</label>
      <label class="split-field"><span>צבעים בולטים</span><input data-image="${index}" data-key="colors" maxlength="80" value="${escapeHtml(image.colors)}" /></label>
      <div class="split-field"><span>מה לא לכלול</span>${renderTags(`image-avoid-${index}`, AVOID_OPTIONS, image.avoid, 4)}</div>
      <label class="split-field"><span>פירוט נוסף למה לא לכלול</span><input data-image="${index}" data-key="avoidOther" maxlength="80" value="${escapeHtml(image.avoidOther)}" /></label>
      <pre class="split-prompt" id="prompt-${index}">${escapeHtml(buildDigitalPrompt(index))}</pre>
      <button type="button" class="split-btn ghost" data-copy-image="${index}">העתיקי פרומפט</button>
    </article>
  `).join('');

  return `${screenPicker}${cards}<article class="split-card"><button type="button" class="split-btn primary" data-copy-all-images>העתיקי את כל הפרומפטים</button></article>`;
}

function renderStep4() {
  seedPosterBuilderState();
  return `<article class="split-card"><h3>מיפוי לפוסטר הושלם</h3><p>כל תשובות שלב 1, כולל המשוב והשיפור, הוזרמו לבונת הפוסטר הקיימת. מכאן אפשר להמשיך לעיצוב, לבדיקת גלישה נכונה של טקסט, ולייצוא.</p><a class="split-link" href="./editor.html?type=${productType}" target="_blank" rel="noopener">פתחי את gateway של הפוסטר</a></article>`;
}

function renderBody() {
  if (state.step === 1) return renderStep1();
  if (state.step === 2) return renderStep2();
  if (state.step === 3) return renderStep3();
  return renderStep4();
}

function renderStepper() {
  return `<div class="split-stepper">${STEP_LABELS.map((label, index) => {
    const stepNo = index + 1;
    const cls = stepNo < state.step ? 'completed' : (stepNo === state.step ? 'active' : '');
    return `<button type="button" class="split-step ${cls}" data-step="${stepNo}">${stepNo}. ${label}</button>`;
  }).join('')}</div>`;
}

function render() {
  root.innerHTML = `
  <style>
    .split-shell{max-width:1020px;margin:0 auto;padding:20px 16px 36px;font-family:'IBM Plex Sans Hebrew','Rubik',sans-serif;color:#1f2937;direction:rtl}
    .split-header{margin-bottom:12px;text-align:center}
    .split-title{margin:0;font-size:1.7rem;color:#5E2750}
    .split-sub{margin:6px 0 0;color:#64748b}
    .split-stepper{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:18px 0}
    .split-step{border:1px solid #d8b4d8;background:#fff;border-radius:999px;padding:10px 6px;cursor:pointer;font:inherit}
    .split-step.active{background:#5E2750;color:#fff;border-color:#5E2750}
    .split-step.completed{background:#f3e8ff;border-color:#c084fc}
    .split-body{display:grid;gap:12px}
    .split-card{background:#fff;border:1px solid #e9d5ff;border-radius:16px;padding:14px;display:grid;gap:10px}
    .split-field{display:grid;gap:6px}
    .split-field span em{color:#b91c1c;font-style:normal}
    .split-field textarea,.split-field input,.split-field select{border:1px solid #d4d4d8;border-radius:10px;padding:10px;font:inherit;direction:rtl}
    .split-field textarea{min-height:86px;line-height:1.5}
    .split-field small{color:#6b7280}
    .split-error{color:#b91c1c;font-weight:600}
    .split-tags{display:flex;gap:7px;flex-wrap:wrap}
    .split-tag{border:1px solid #d4d4d8;border-radius:999px;padding:6px 10px;background:#f8fafc;cursor:pointer}
    .split-tag.active{background:#5E2750;color:#fff;border-color:#5E2750}
    .split-nav{display:flex;justify-content:space-between;gap:10px;margin-top:18px}
    .split-btn{border:none;border-radius:10px;padding:10px 14px;cursor:pointer;font:inherit}
    .split-btn.primary{background:#5E2750;color:#fff}
    .split-btn.ghost{background:#ede9fe;color:#4c1d95}
    .split-btn:disabled{opacity:.5;cursor:not-allowed}
    .split-alert{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:10px;padding:8px 10px}
    .split-prompt{white-space:pre-wrap;direction:ltr;text-align:left;background:#f8fafc;border:1px dashed #c4b5fd;border-radius:10px;padding:10px;line-height:1.55}
    .split-link{display:inline-block;background:#5E2750;color:#fff;text-decoration:none;border-radius:10px;padding:10px 14px}
    .split-picks{display:flex;gap:8px;flex-wrap:wrap}
    .split-check{display:flex;gap:6px;align-items:center}
    @media (max-width:800px){.split-stepper{grid-template-columns:1fr 1fr}}
  </style>
  <main class="split-shell">
    <header class="split-header">
      <h1 class="split-title">בונות פוסטר חקר — ${PRODUCT_TITLE[productType]}</h1>
      <p class="split-sub">כל הזרימה מותאמת לשלב החקר, האבטיפוס/הפרומפט והתמונות, עם מיפוי לפוסטר הקיים.</p>
    </header>
    ${renderStepper()}
    ${Object.keys(state.errors).length ? '<div class="split-alert">יש שדות חובה שעדיין לא הושלמו. השלימי אותן כדי להמשיך.</div>' : ''}
    <section class="split-body">${renderBody()}</section>
    <nav class="split-nav">
      <button type="button" class="split-btn ghost" data-nav="back" ${state.step === 1 ? 'disabled' : ''}>חזרה</button>
      <button type="button" class="split-btn primary" data-nav="next">${state.step === 4 ? 'סיום' : 'המשיכי לשלב הבא'}</button>
    </nav>
  </main>`;
  wireEvents();
}

function toggleArray(target, value, max) {
  const idx = target.indexOf(value);
  if (idx >= 0) target.splice(idx, 1);
  else if (target.length < max) target.push(value);
}

function applyTag(tag, value, max) {
  if (tag.startsWith('components-')) {
    const i = Number(tag.replace('components-', ''));
    toggleArray(state.prototypeScreens[i].components, value, max);
    return;
  }
  if (tag.startsWith('emphasis-')) {
    const i = Number(tag.replace('emphasis-', ''));
    toggleArray(state.prototypeScreens[i].emphasis, value, max);
    return;
  }
  if (tag.startsWith('image-emphasis-')) {
    const i = Number(tag.replace('image-emphasis-', ''));
    toggleArray(state.images[i].emphasis, value, max);
    return;
  }
  if (tag.startsWith('image-style-')) {
    const i = Number(tag.replace('image-style-', ''));
    toggleArray(state.images[i].style, value, max);
    return;
  }
  if (tag.startsWith('image-avoid-')) {
    const i = Number(tag.replace('image-avoid-', ''));
    toggleArray(state.images[i].avoid, value, max);
    return;
  }
  if (tag === 'main-highlight') return toggleArray(state.physicalPrompt.main.highlight, value, max);
  if (tag === 'main-style') return toggleArray(state.physicalPrompt.main.style, value, max);
  if (tag === 'main-avoid') return toggleArray(state.physicalPrompt.main.avoid, value, max);
  if (tag === 'usage-props') return toggleArray(state.physicalPrompt.usage.props, value, max);
  if (tag === 'usage-highlight') return toggleArray(state.physicalPrompt.usage.highlight, value, max);
  if (tag === 'usage-style') return toggleArray(state.physicalPrompt.usage.style, value, max);
  if (tag === 'usage-avoid') return toggleArray(state.physicalPrompt.usage.avoid, value, max);
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  const original = button.textContent;
  button.textContent = 'הועתק';
  setTimeout(() => { button.textContent = original; }, 1200);
}

function wireEvents() {
  root.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.step);
      if (target < state.step) {
        state.errors = {};
        state.step = target;
        render();
      }
    });
  });

  root.querySelectorAll('[data-research]').forEach((input) => {
    input.addEventListener('input', () => {
      state.research[input.dataset.research] = input.value;
      state.errors[input.dataset.research] = '';
      const counter = input.nextElementSibling;
      if (counter) counter.textContent = `${input.value.length}/${input.maxLength} · ${statusLabel(input.value, Number(input.maxLength))}`;
    });
  });

  root.querySelectorAll('[data-physical]').forEach((input) => {
    input.addEventListener('input', () => {
      const block = input.dataset.physical;
      const key = input.dataset.key;
      state.physicalPrompt[block][key] = input.value;
    });
  });

  root.querySelectorAll('[data-screen]').forEach((input) => {
    input.addEventListener('input', () => {
      const screen = state.prototypeScreens[Number(input.dataset.screen)];
      screen[input.dataset.key] = input.value;
    });
  });

  root.querySelectorAll('[data-flow]').forEach((input) => {
    input.addEventListener('input', () => {
      state.prototypeFlow[input.dataset.flow] = input.value;
      if (input.dataset.flow === 'hasBranch') render();
    });
  });

  root.querySelectorAll('[data-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTag(button.dataset.tag, button.dataset.value, Number(button.dataset.max));
      render();
    });
  });

  root.querySelectorAll('[data-website-pick]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const value = checkbox.dataset.websitePick;
      if (checkbox.checked && !state.selectedWebsiteScreens.includes(value) && state.selectedWebsiteScreens.length < 3) {
        state.selectedWebsiteScreens.push(value);
      }
      if (!checkbox.checked) {
        state.selectedWebsiteScreens = state.selectedWebsiteScreens.filter((item) => item !== value);
      }
      if (state.selectedWebsiteScreens.length > 3) {
        state.selectedWebsiteScreens = state.selectedWebsiteScreens.slice(0, 3);
      }
      state.images.forEach((image, idx) => {
        if (!state.selectedWebsiteScreens.includes(image.screenRef)) {
          image.screenRef = state.selectedWebsiteScreens[idx] || '';
        }
      });
      render();
    });
  });

  root.querySelectorAll('[data-image]').forEach((input) => {
    input.addEventListener('input', () => {
      const image = state.images[Number(input.dataset.image)];
      image[input.dataset.key] = input.value;
      const promptNode = root.querySelector(`#prompt-${input.dataset.image}`);
      if (promptNode) promptNode.textContent = buildDigitalPrompt(Number(input.dataset.image));
    });
  });

  root.querySelectorAll('[data-copy-image]').forEach((button) => {
    button.addEventListener('click', () => copyText(buildDigitalPrompt(Number(button.dataset.copyImage)), button));
  });

  const copyAllImages = root.querySelector('[data-copy-all-images]');
  if (copyAllImages) {
    copyAllImages.addEventListener('click', () => {
      const text = state.images.map((_, idx) => `פרומפט ${idx + 1}:\n${buildDigitalPrompt(idx)}`).join('\n\n');
      copyText(text, copyAllImages);
    });
  }

  root.querySelectorAll('[data-copy-physical]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.copyPhysical;
      if (mode === 'main') return copyText(buildPhysicalPrompt('main'), button);
      if (mode === 'usage') return copyText(buildPhysicalPrompt('usage'), button);
      return copyText(`פרומפט תמונה ראשית:\n${buildPhysicalPrompt('main')}\n\nפרומפט תמונת שימוש:\n${buildPhysicalPrompt('usage')}`, button);
    });
  });

  root.querySelector('[data-nav="back"]').addEventListener('click', () => {
    if (state.step > 1) {
      state.step -= 1;
      state.errors = {};
      render();
    }
  });

  root.querySelector('[data-nav="next"]').addEventListener('click', () => {
    if (state.step < 4) {
      const valid = validateStep(state.step);
      if (!valid) return render();
      state.errors = {};
      state.step += 1;
      render();
    }
  });
}

render();
