import { getVisualSlots, getPosterFields, FIELD_DEFINITIONS, BACKGROUNDS, AVAILABLE_FONTS } from '../physical/config.js';
import { saveProject, loadProject } from '../../shared/storage.js';

const productType = ['physical', 'website', 'app'].includes(window.__POSTER_SPLIT_PRODUCT__)
  ? window.__POSTER_SPLIT_PRODUCT__
  : 'website';
const root = document.getElementById('root');
const STEP_LABELS = productType === 'physical'
  ? ['שאלות חקר', 'פרומפט ותמונות', 'פוסטר']
  : ['שאלות חקר', 'פרומפט', 'תמונות', 'פוסטר'];
const MAX_STEP = STEP_LABELS.length;

const PRODUCT_TITLE = {
  physical: 'מוצר פיזי',
  website: 'אתר',
  app: 'אפליקציה'
};

const QUALITY_REQUIREMENTS = 'poster-friendly composition, correct image ratio according to the poster visual slot, precise framing, important details inside the safe center area, high quality, clean composition, no watermark, no text overlay, no logo';
const DESIGN_COLORS = ['#5E2750', '#1a3a6b', '#1a5c3a', '#7a1a1a', '#b5520a', '#1a4a5c', '#2d2d2d', '#1f2937'];
const SHAPE_OPTIONS = [
  { value: 0, label: 'חד' },
  { value: 10, label: 'מעוגל' },
  { value: 20, label: 'עגול' }
];

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
  ['studentNames', 'שמות התלמידות', 80],
  ['className', 'כיתה', 30],
  ['schoolName', 'בית הספר', 50],
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
    productType === 'physical' ? 'איך משתמשת במוצר? 1' : (productType === 'website' ? 'מה המשתמשת עושה באתר? 1' : 'איך המשתמשת משתמשת באפליקציה? 1'),
    42
  ],
  [
    'howItWorks_2',
    productType === 'physical' ? 'איך משתמשת במוצר? 2' : (productType === 'website' ? 'מה המשתמשת עושה באתר? 2' : 'איך המשתמשת משתמשת באפליקציה? 2'),
    42
  ],
  [
    'howItWorks_3',
    productType === 'physical' ? 'איך משתמשת במוצר? 3' : (productType === 'website' ? 'מה המשתמשת עושה באתר? 3' : 'איך המשתמשת משתמשת באפליקציה? 3'),
    42
  ],
  ['value', 'מה הערך המרכזי של הפתרון?', 110],
  ['feedbackAndImprovements', 'מה המשוב שקיבלנו ומה שיפרנו', Math.max(FEEDBACK_MAX + IMPROVEMENT_MAX, 170)]
];

const SCREEN_TYPE_OPTIONS = ['מסך פתיחה', 'מסך בית', 'חיפוש', 'פעולה מרכזית', 'תוצאות', 'אזור אישי', 'פרופיל', 'הרשמה', 'התחברות', 'מעקב', 'אחר'];
const COMPONENT_OPTIONS = ['כותרת', 'תפריט', 'ניווט תחתון', 'כפתור פעולה ראשי', 'כרטיסיות', 'גרף', 'רשימה', 'טופס', 'פרופיל', 'מפה', 'התראות', 'אזור מידע', 'תמונת פתיחה', 'אחר'];
const EMPHASIS_OPTIONS = ['הפעולה המרכזית', 'הכפתור הראשי', 'הניווט', 'המידע המרכזי', 'התוצאה', 'הפשטות', 'העיצוב', 'אחר'];
const STYLE_OPTIONS = ['מודרני', 'נקי', 'טכנולוגי', 'ידידותי', 'צעיר', 'מקצועי', 'מינימליסטי', 'חם אנושי', 'אחר'];
const REALISM_OPTIONS = ['ריאליסטי', 'חצי ריאליסטי', 'אילוסטרטיבי', 'מוקאפ UI/UX', 'אחר'];
const AVOID_OPTIONS = ['עומס', 'טקסט ארוך מדי', 'אלמנטים לא קשורים', 'יותר מדי צבעים', 'לוגואים אמיתיים', 'עיצוב עמוס', 'אחר'];
const SHARED_VISUAL_DEFAULTS = {
  style: [],
  styleOther: '',
  realism: '',
  realismOther: '',
  colors: '',
  avoid: [],
  avoidOther: ''
};

const PHYSICAL_MAIN_OPTIONS = {
  appearance: ['מונח על משטח', 'מוחזק ביד', 'בתצוגה ישירה', 'בזווית דינמית', 'אחר'],
  highlight: ['המנגנון המרכזי', 'פשטות השימוש', 'החדשנות', 'החומריות', 'הגודל היחסי', 'אחר'],
  material: ['פלסטיק', 'מתכת', 'עץ', 'בד', 'שילוב חומרים', 'אחר'],
  background: ['רקע נקי ובהיר', 'רקע כיתה', 'רקע מעבדה', 'רקע ביתי', 'רקע טכנולוגי', 'אחר']
};

const PHYSICAL_USAGE_OPTIONS = {
  user: ['ילדה', 'נערה', 'בוגרת', 'צוות תלמידות', 'אחר'],
  peopleCount: ['משתמשת אחת', 'שתיים', 'שלוש ומעלה', 'אחר'],
  location: ['כיתה', 'בית', 'מעבדה', 'חצר בית ספר', 'מרחב קהילתי', 'אחר'],
  props: ['שולחן עבודה', 'מחברת', 'טלפון', 'מחשב נייד', 'כלי כתיבה', 'אחר'],
  highlight: ['אופן השימוש', 'הפעולה המרכזית', 'קלות שימוש', 'הקשר לבעיה', 'האינטראקציה', 'אחר']
};

const state = {
  step: 1,
  research: Object.fromEntries(RESEARCH_FIELDS.map(([key]) => [key, ''])),
  errors: {},
  visibleErrors: [],
  sharedVisualPrompt: { ...SHARED_VISUAL_DEFAULTS },
  physicalPrompt: {
    main: {
      appearance: '', appearanceOther: '', highlight: [], highlightOther: '', material: '', materialOther: '',
      background: '', backgroundOther: '', description: ''
    },
    usage: {
      user: '', userOther: '', peopleCount: '', peopleCountOther: '', location: '', locationOther: '', action: '',
      props: [], propsOther: '', highlight: [], highlightOther: '', takeaway: ''
    }
  },
  prototypeScreens: Array.from({ length: 3 }, (_, index) => ({
    number: index + 1,
    type: '',
    shortName: '',
    view: '',
    action: '',
    components: [],
    componentsOther: '',
    emphasis: [],
    emphasisOther: ''
  })),
  prototypeFlow: { start: '', end: '', summary: '', hasBranch: '', branch: '' },
  images: Array.from({ length: 3 }, (_, index) => ({
    id: index + 1,
    screenRef: `${index + 1}`,
    emphasis: [],
    emphasisOther: '',
    takeaway: ''
  })),
  design: {
    background: loadProject()?.background || null,
    titleFont: AVAILABLE_FONTS[0]?.value || 'IBM Plex Sans Hebrew',
    titleColor: '#5E2750',
    textColor: '#1f2937',
    shape: 20
  }
};

function migrateSharedVisualPrompt(splitFlowState = {}) {
  const nextShared = {
    ...SHARED_VISUAL_DEFAULTS,
    ...(splitFlowState.sharedVisualPrompt || {})
  };
  if (nextShared.style.length && nextShared.realism) return nextShared;

  const oldPhysicalMain = splitFlowState.physicalPrompt?.main || {};
  const oldPhysicalUsage = splitFlowState.physicalPrompt?.usage || {};
  const oldFirstImage = splitFlowState.images?.[0] || {};
  const fallback = oldPhysicalMain.style?.length
    ? oldPhysicalMain
    : (oldPhysicalUsage.style?.length ? oldPhysicalUsage : oldFirstImage);

  return {
    ...nextShared,
    style: nextShared.style.length ? nextShared.style : (fallback.style || []),
    styleOther: nextShared.styleOther || fallback.styleOther || '',
    realism: nextShared.realism || fallback.realism || '',
    realismOther: nextShared.realismOther || fallback.realismOther || '',
    colors: nextShared.colors || fallback.colors || '',
    avoid: nextShared.avoid.length ? nextShared.avoid : (fallback.avoid || []),
    avoidOther: nextShared.avoidOther || fallback.avoidOther || ''
  };
}

function hydrateStateFromStorage() {
  const project = loadProject();
  const stored = project?.splitFlowState;
  if (!stored || stored.productType !== productType) return;

  Object.assign(state.research, stored.research || {});
  if (!state.research.feedbackAndImprovements) {
    const mergedFeedback = [state.research.feedback || '', state.research.improvement || ''].filter(Boolean).join('\n');
    if (mergedFeedback) state.research.feedbackAndImprovements = mergedFeedback;
  }
  if (!state.research.studentNames) {
    const names = [project?.contentValues?.student1, project?.contentValues?.student2, project?.contentValues?.student3]
      .filter((value) => typeof value === 'string' && value.trim())
      .join(', ');
    state.research.studentNames = names;
  }
  if (!state.research.className && typeof project?.contentValues?.className === 'string') state.research.className = project.contentValues.className;
  if (!state.research.schoolName && typeof project?.contentValues?.schoolName === 'string') state.research.schoolName = project.contentValues.schoolName;
  Object.assign(state.design, stored.design || {});
  if (stored.physicalPrompt?.main) Object.assign(state.physicalPrompt.main, stored.physicalPrompt.main);
  if (stored.physicalPrompt?.usage) Object.assign(state.physicalPrompt.usage, stored.physicalPrompt.usage);
  if (Array.isArray(stored.prototypeScreens)) {
    state.prototypeScreens = state.prototypeScreens.map((screen, idx) => ({ ...screen, ...(stored.prototypeScreens[idx] || {}) }));
  }
  Object.assign(state.prototypeFlow, stored.prototypeFlow || {});
  if (Array.isArray(stored.images)) {
    state.images = state.images.map((image, idx) => ({ ...image, ...(stored.images[idx] || {}) }));
  }
  state.sharedVisualPrompt = migrateSharedVisualPrompt(stored);
}

function splitStudentNames(rawNames) {
  const names = (rawNames || '')
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [names[0] || '', names[1] || '', names[2] || ''];
}

function buildPosterContentValues() {
  const [student1, student2, student3] = splitStudentNames(state.research.studentNames);
  const feedbackSummary = state.research.feedbackAndImprovements || '';
  return {
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
    value: state.research.value,
    feedbackReceived: feedbackSummary,
    improvementsAfterFeedback: feedbackSummary,
    student1,
    student2,
    student3,
    className: state.research.className || '',
    schoolName: state.research.schoolName || ''
  };
}

function persistSplitFlowState() {
  const stored = loadProject() || {};
  saveProject({
    ...stored,
    productType,
    contentValues: {
      ...(stored.contentValues || {}),
      ...buildPosterContentValues()
    },
    splitFlowState: {
      ...(stored.splitFlowState || {}),
      productType,
      research: { ...state.research },
      sharedVisualPrompt: JSON.parse(JSON.stringify(state.sharedVisualPrompt)),
      physicalPrompt: JSON.parse(JSON.stringify(state.physicalPrompt)),
      prototypeScreens: JSON.parse(JSON.stringify(state.prototypeScreens)),
      prototypeFlow: { ...state.prototypeFlow },
      images: JSON.parse(JSON.stringify(state.images)),
      design: { ...state.design }
    }
  });
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const COUNTER_NEAR_LIMIT_RATIO = 0.85;

function getCounterState(length, max) {
  if (!Number.isFinite(max) || max <= 0) return { key: 'ok', label: 'תקין' };
  if (length > max) return { key: 'overflow', label: 'חריגה מהמותר' };
  if (length === max) return { key: 'full', label: 'מלא' };
  if (length >= Math.ceil(max * COUNTER_NEAR_LIMIT_RATIO)) return { key: 'near-limit', label: 'קרוב למגבלה' };
  return { key: 'ok', label: 'תקין' };
}

function renderCounter(value, max) {
  const { key, label } = getCounterState(value.length, max);
  return `<small class="split-counter ${key}">${label} ${value.length}/${max}</small>`;
}

function updateCounterForInput(input) {
  if (!input || input.maxLength <= 0) return;
  const max = Number(input.maxLength);
  const length = input.value.length;
  const stateInfo = getCounterState(length, max);
  input.classList.remove('char-state-ok', 'char-state-near-limit', 'char-state-full', 'char-state-overflow');
  input.classList.add(`char-state-${stateInfo.key}`);

  const container = input.closest('.split-field');
  if (container) {
    container.classList.remove('counter-ok', 'counter-near-limit', 'counter-full', 'counter-overflow');
    container.classList.add(`counter-${stateInfo.key}`);
  }

  const parent = input.parentElement;
  if (!parent) return;

  const existingCounters = Array.from(parent.querySelectorAll('.split-counter'));
  let counter = existingCounters.find((node) => node.dataset.counterFor === input.dataset.counterId)
    || existingCounters[0];

  if (!counter) {
    counter = document.createElement('small');
    counter.className = 'split-counter';
    input.insertAdjacentElement('afterend', counter);
  }

  if (!input.dataset.counterId) {
    const counterId = `${input.dataset.research || ''}-${input.dataset.physical || ''}-${input.dataset.screen || ''}-${input.dataset.flow || ''}-${input.dataset.image || ''}-${input.dataset.key || ''}-${Math.random().toString(36).slice(2, 8)}`;
    input.dataset.counterId = counterId;
  }
  counter.dataset.counterFor = input.dataset.counterId;

  existingCounters.forEach((node) => {
    if (node !== counter) node.remove();
  });

  counter.className = `split-counter ${stateInfo.key}`;
  counter.textContent = `${stateInfo.label} ${length}/${max}`;
}

function initializeCounters() {
  root.querySelectorAll('input[maxlength], textarea[maxlength]').forEach((input) => updateCounterForInput(input));
}

function validateResearch() {
  const stepErrors = {};
  RESEARCH_FIELDS.forEach(([key, label, max]) => {
    const value = (state.research[key] || '').trim();
    if (!value) stepErrors[key] = `השדה "${label}" הוא שדה חובה.`;
    if ((state.research[key] || '').length > max) stepErrors[key] = `אפשר להזין עד ${max} תווים.`;
  });
  state.errors = stepErrors;
  return stepErrors;
}

function resolveOtherValue(value, otherValue) {
  return value === 'אחר' ? (otherValue || '').trim() : value;
}

function resolveOtherList(values, otherValue) {
  const filtered = (values || []).filter((item) => item && item !== 'אחר');
  if ((values || []).includes('אחר') && (otherValue || '').trim()) filtered.push(otherValue.trim());
  return filtered;
}

function clearWhenOtherNotSelected(container, listKey, otherKey) {
  const selected = container[listKey];
  const hasOther = Array.isArray(selected) ? selected.includes('אחר') : selected === 'אחר';
  if (!hasOther && container[otherKey]) container[otherKey] = '';
}

function sanitizeOtherFields() {
  const { main, usage } = state.physicalPrompt;
  const shared = state.sharedVisualPrompt;
  clearWhenOtherNotSelected(main, 'appearance', 'appearanceOther');
  clearWhenOtherNotSelected(main, 'highlight', 'highlightOther');
  clearWhenOtherNotSelected(main, 'material', 'materialOther');
  clearWhenOtherNotSelected(main, 'background', 'backgroundOther');

  clearWhenOtherNotSelected(usage, 'user', 'userOther');
  clearWhenOtherNotSelected(usage, 'peopleCount', 'peopleCountOther');
  clearWhenOtherNotSelected(usage, 'location', 'locationOther');
  clearWhenOtherNotSelected(usage, 'props', 'propsOther');
  clearWhenOtherNotSelected(usage, 'highlight', 'highlightOther');
  clearWhenOtherNotSelected(shared, 'style', 'styleOther');
  clearWhenOtherNotSelected(shared, 'realism', 'realismOther');
  clearWhenOtherNotSelected(shared, 'avoid', 'avoidOther');

  state.prototypeScreens.forEach((screen) => {
    clearWhenOtherNotSelected(screen, 'type', 'shortName');
    clearWhenOtherNotSelected(screen, 'components', 'componentsOther');
    clearWhenOtherNotSelected(screen, 'emphasis', 'emphasisOther');
  });

  state.images.forEach((image) => {
    clearWhenOtherNotSelected(image, 'emphasis', 'emphasisOther');
  });
}

function validatePhysicalPrompt() {
  const { main, usage } = state.physicalPrompt;
  const errors = {};

  if (!main.appearance) errors.mainAppearance = 'בחרי איך המוצר מופיע.';
  if (main.highlight.length < 1 || main.highlight.length > 3) errors.mainHighlight = 'בחרי בין פריט אחד לשלושה.';
  if (!main.material) errors.mainMaterial = 'בחרי חומר או מרקם.';
  if (!main.background) errors.mainBackground = 'בחרי רקע רצוי.';
  if (!main.description.trim()) errors.mainDescription = 'תארי מה צריך לראות בתמונה.';

  if (!usage.user) errors.usageUser = 'בחרי מי משתמשת במוצר.';
  if (!usage.peopleCount) errors.usageCount = 'בחרי כמה אנשים בתמונה.';
  if (!usage.location) errors.usageLocation = 'בחרי איפה מתרחש השימוש.';
  if (!usage.action.trim()) errors.usageAction = 'תארי את הפעולה המוצגת.';
  if (usage.highlight.length < 1 || usage.highlight.length > 3) errors.usageHighlight = 'בחרי בין פריט אחד לשלושה.';
  if (!usage.takeaway.trim()) errors.usageTakeaway = 'תארי מה חשוב שהצופה תבין.';

  if (main.appearance === 'אחר' && !main.appearanceOther.trim()) errors.mainAppearanceOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (main.highlight.includes('אחר') && !main.highlightOther.trim()) errors.mainHighlightOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (main.material === 'אחר' && !main.materialOther.trim()) errors.mainMaterialOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (main.background === 'אחר' && !main.backgroundOther.trim()) errors.mainBackgroundOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (usage.user === 'אחר' && !usage.userOther.trim()) errors.usageUserOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (usage.peopleCount === 'אחר' && !usage.peopleCountOther.trim()) errors.usageCountOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (usage.location === 'אחר' && !usage.locationOther.trim()) errors.usageLocationOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (usage.props.includes('אחר') && !usage.propsOther.trim()) errors.usagePropsOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (usage.highlight.includes('אחר') && !usage.highlightOther.trim()) errors.usageHighlightOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  Object.assign(errors, validateSharedVisualPrompt({}));

  state.errors = errors;
  return errors;
}

function validateSharedVisualPrompt(errors = {}) {
  const shared = state.sharedVisualPrompt;
  if (shared.style.length < 1 || shared.style.length > 2) errors.sharedStyle = 'בחרי בין סגנון אחד לשניים.';
  if (!shared.realism) errors.sharedRealism = 'בחרי רמת ריאליזם.';
  if (shared.style.includes('אחר') && !shared.styleOther.trim()) errors.sharedStyleOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (shared.realism === 'אחר' && !shared.realismOther.trim()) errors.sharedRealismOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  if (shared.avoid.includes('אחר') && !shared.avoidOther.trim()) errors.sharedAvoidOther = 'נבחר "אחר" – השלימי פירוט קצר.';
  return errors;
}

function validatePrototype() {
  const errors = validateSharedVisualPrompt({});
  state.prototypeScreens.forEach((screen, idx) => {
    if (!screen.type) errors[`screenType${idx}`] = 'בחרי סוג מסך.';
    if (screen.type === 'אחר' && !screen.shortName.trim()) errors[`screenShortName${idx}`] = 'נבחר "אחר" – השלימי שם קצר.';
    if (!screen.view.trim()) errors[`screenView${idx}`] = 'תארי מה המשתמשת רואה.';
    if (!screen.action.trim()) errors[`screenAction${idx}`] = 'תארי מה המשתמשת עושה.';
    if (screen.components.length < 1 || screen.components.length > 5) errors[`screenComponents${idx}`] = 'בחרי בין רכיב אחד לחמישה.';
    if (screen.emphasis.length < 1 || screen.emphasis.length > 3) errors[`screenEmphasis${idx}`] = 'בחרי בין פריט אחד לשלושה.';
    if (screen.components.includes('אחר') && !screen.componentsOther.trim()) errors[`screenComponentsOther${idx}`] = 'נבחר "אחר" – השלימי רכיב נוסף.';
    if (screen.emphasis.includes('אחר') && !screen.emphasisOther.trim()) errors[`screenEmphasisOther${idx}`] = 'נבחר "אחר" – השלימי דגש נוסף.';
  });

  if (productType === 'website') {
    if (!state.prototypeFlow.start) errors.flowStart = 'בחרי מסך התחלה.';
    if (!state.prototypeFlow.end) errors.flowEnd = 'בחרי מסך סיום.';
    if (!state.prototypeFlow.summary.trim()) errors.flowSummary = 'תארי את זרימת השימוש.';
    if (!state.prototypeFlow.hasBranch) errors.flowBranchToggle = 'בחרי האם קיימת הסתעפות.';
    if (state.prototypeFlow.hasBranch === 'כן' && !state.prototypeFlow.branch.trim()) errors.flowBranchText = 'תארי את ההסתעפות.';
  }

  state.errors = errors;
  return errors;
}

function validateImagesStep() {
  const errors = {};
  if (productType !== 'physical') {
    state.images.forEach((image, idx) => {
      image.screenRef = `${idx + 1}`;
    });
  }
  state.errors = errors;
  return errors;
}

function validateStep(step) {
  if (step === 1) return validateResearch();
  if (step === 2) return productType === 'physical' ? validatePhysicalPrompt() : validatePrototype();
  if (step === 3) return productType === 'physical' ? {} : validateImagesStep();
  return {};
}

const VALIDATION_ORDER = {
  1: RESEARCH_FIELDS.map(([key]) => key),
  2: productType === 'physical'
    ? ['mainAppearance', 'mainAppearanceOther', 'mainHighlight', 'mainHighlightOther', 'mainMaterial', 'mainMaterialOther', 'mainBackground', 'mainBackgroundOther', 'mainDescription', 'usageUser', 'usageUserOther', 'usageCount', 'usageCountOther', 'usageLocation', 'usageLocationOther', 'usageAction', 'usagePropsOther', 'usageHighlight', 'usageHighlightOther', 'usageTakeaway', 'sharedStyle', 'sharedStyleOther', 'sharedRealism', 'sharedRealismOther', 'sharedAvoidOther']
    : [
      ...state.prototypeScreens.flatMap((_, idx) => [`screenType${idx}`, `screenShortName${idx}`, `screenView${idx}`, `screenAction${idx}`, `screenComponents${idx}`, `screenComponentsOther${idx}`, `screenEmphasis${idx}`, `screenEmphasisOther${idx}`]),
      'flowStart', 'flowEnd', 'flowSummary', 'flowBranchToggle', 'flowBranchText', 'sharedStyle', 'sharedStyleOther', 'sharedRealism', 'sharedRealismOther', 'sharedAvoidOther'
    ],
  3: ['selectedScreens', ...state.images.flatMap((_, idx) => [`imageScreen${idx}`])]
};

function firstErrorKey(step, errors) {
  const ordered = VALIDATION_ORDER[step] || [];
  return ordered.find((key) => errors[key]) || Object.keys(errors)[0] || null;
}

function focusFirstInvalidField(step, errors) {
  const key = firstErrorKey(step, errors);
  if (!key) return;
  state.visibleErrors = [key];
  const field = root.querySelector(`[data-error-key="${key}"]`);
  if (!field) return;
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = field.querySelector('textarea, input, select, button, [tabindex]');
  if (focusable) focusable.focus({ preventScroll: true });
}

function slots() {
  return getVisualSlots(posterSize, productType);
}

function basePromptContext(slot, imageRole) {
  return `Create a clear, high-quality poster-ready image based on the following project context and image-specific details.
Project: ${state.research.projectName}
Product type: ${PRODUCT_TITLE[productType]}
Project description: ${state.research.description}
Problem: ${state.research.problem}
Audience: ${state.research.audience}
Solution: ${state.research.solution}
Core value: ${state.research.value}
Requirements: ${state.research.requirements_1}; ${state.research.requirements_2}; ${state.research.requirements_3}
How it works: ${state.research.howItWorks_1}; ${state.research.howItWorks_2}; ${state.research.howItWorks_3}
Poster visual slot ratio: ${slot.width}:${slot.height}
Image role: ${imageRole}
Technical requirements (must follow): ${QUALITY_REQUIREMENTS}.`;
}

function sharedVisualPromptText() {
  const shared = state.sharedVisualPrompt;
  const styleText = resolveOtherList(shared.style, shared.styleOther).join(', ');
  const realismText = resolveOtherValue(shared.realism, shared.realismOther);
  const avoidText = resolveOtherList(shared.avoid, shared.avoidOther).join(', ');
  return `Shared visual settings for all images:
Visual style: ${styleText}
Realism level: ${realismText}
Preferred colors: ${shared.colors || 'match the project visual language'}
Avoid: ${avoidText || 'none specified'}`;
}

function buildPhysicalPrompt(kind) {
  const slot = slots()[kind === 'main' ? 0 : 1] || slots()[0];
  const data = state.physicalPrompt[kind];
  const sharedBlock = sharedVisualPromptText();

  if (kind === 'main') {
    const appearanceText = resolveOtherValue(data.appearance, data.appearanceOther);
    const highlightText = resolveOtherList(data.highlight, data.highlightOther).join(', ');
    const materialText = resolveOtherValue(data.material, data.materialOther);
    const backgroundText = resolveOtherValue(data.background, data.backgroundOther);
    return `${basePromptContext(slot, 'מדובר בתמונה ראשית של המוצר.')}
${sharedBlock}
Image-specific details:
המוצר מופיע כך: ${appearanceText}. חשוב שיבלוט: ${highlightText}. חומר/מרקם: ${materialText}. רקע: ${backgroundText}. צריך לראות בתמונה: ${data.description}.`;
  }

  const props = resolveOtherList(data.props, data.propsOther).join(', ');
  const userText = resolveOtherValue(data.user, data.userOther);
  const countText = resolveOtherValue(data.peopleCount, data.peopleCountOther);
  const locationText = resolveOtherValue(data.location, data.locationOther);
  const highlightText = resolveOtherList(data.highlight, data.highlightOther).join(', ');
  return `${basePromptContext(slot, 'מדובר בתמונת שימוש שממחישה אינטראקציה עם המוצר.')}
${sharedBlock}
Image-specific details:
מי משתמשת: ${userText}. מספר אנשים: ${countText}. מיקום: ${locationText}. הפעולה המוצגת: ${data.action}. חפצים נוספים: ${props || 'ללא חפצים נוספים'}.
מה צריך לבלוט: ${highlightText}. מה חשוב שהצופה תבין: ${data.takeaway}.`;
}

function buildDigitalPrompt(index) {
  const slot = slots()[index] || slots()[0];
  const mappedScreenRef = index + 1;
  const screen = state.prototypeScreens[mappedScreenRef - 1];
  const flowLine = productType === 'website'
    ? `זרימת השימוש מתחילה ב-${state.prototypeFlow.start} ומסתיימת ב-${state.prototypeFlow.end}. סיכום זרימה: ${state.prototypeFlow.summary}. ${state.prototypeFlow.hasBranch === 'כן' ? `הסתעפות: ${state.prototypeFlow.branch}.` : 'אין הסתעפות.'}`
    : '';
  const emphasisText = resolveOtherList(screen?.emphasis || [], screen?.emphasisOther || '').join(', ');
  const screenType = resolveOtherValue(screen?.type || '', screen?.shortName || '');
  const screenComponents = resolveOtherList(screen?.components || [], screen?.componentsOther || '').join(', ');
  const sharedBlock = sharedVisualPromptText();

  return `${basePromptContext(slot, `מדובר בתמונת מסך מספר ${index + 1} לפוסטר.`)}
${sharedBlock}
Screen-specific details:
המסך המיוצג: ${screenType || 'לא הוגדר'}. מה המשתמשת רואה במסך: ${screen?.view || ''}. מה המשתמשת עושה במסך: ${screen?.action || ''}. רכיבים חשובים: ${screenComponents}. מה חשוב שיבלוט: ${emphasisText}. ${flowLine}`;
}

function normalizeAppImageMapping() {
  if (productType !== 'app') return;
  state.images.forEach((image, index) => {
    image.screenRef = `${index + 1}`;
  });
}

function seedPosterBuilderState() {
  const contentValues = buildPosterContentValues();

  const stored = loadProject() || {};
  const nextFieldSettings = Object.fromEntries(
    FIELD_DEFINITIONS.map((field) => [
      field.id,
      {
        ...(stored.fieldSettings?.[field.id] || {}),
        fontFamily: state.design.titleFont,
        color: state.design.textColor,
        borderRadius: state.design.shape
      }
    ])
  );
  saveProject({
    ...stored,
    posterSize: stored.posterSize || posterSize,
    productType,
    background: state.design.background || null,
    fieldSettings: nextFieldSettings,
    titleStyle: {
      fontFamily: state.design.titleFont,
      color: state.design.titleColor
    },
    contentValues,
    splitFlowState: {
      productType,
      research: { ...state.research },
      sharedVisualPrompt: JSON.parse(JSON.stringify(state.sharedVisualPrompt)),
      physicalPrompt: JSON.parse(JSON.stringify(state.physicalPrompt)),
      prototypeScreens: JSON.parse(JSON.stringify(state.prototypeScreens)),
      prototypeFlow: { ...state.prototypeFlow },
      images: JSON.parse(JSON.stringify(state.images)),
      design: { ...state.design }
    }
  });
}

function renderError(key) {
  return state.errors[key] && state.visibleErrors.includes(key) ? `<small class="split-error">${state.errors[key]}</small>` : '';
}
function fieldClass(key) { return `split-field ${state.errors[key] && state.visibleErrors.includes(key) ? 'error' : ''}`; }

function renderTags(tagName, options, selected, max) {
  return `<div class="split-tags">${options.map((option) => {
    const active = selected.includes(option);
    return `<button type="button" class="split-tag ${active ? 'active' : ''}" data-tag="${tagName}" data-value="${escapeHtml(option)}" data-max="${max}">${option}</button>`;
  }).join('')}</div>`;
}

function renderStep1() {
  return `<section class="split-card">${RESEARCH_FIELDS.map(([key, label, max]) => {
    const value = state.research[key] || '';
    const rows = max <= 42 ? 1 : 2;
    return `<label class="${fieldClass(key)}" data-error-key="${key}">
      <span>${label} <em>*</em></span>
      <textarea data-research="${key}" maxlength="${max}" rows="${rows}" placeholder="כתבי כאן" dir="rtl">${escapeHtml(value)}</textarea>
      ${renderCounter(value, max)}
      ${renderError(key)}
    </label>`;
  }).join('')}</section>`;
}

function renderSharedVisualSection() {
  const shared = state.sharedVisualPrompt;
  return `
    <article class="split-card">
      <h3>הגדרות עיצוב לכל התמונות</h3>
      <div class="${fieldClass('sharedStyle')}" data-error-key="sharedStyle"><span>באיזה סגנון חזותי להשתמש בכל התמונות? <em>*</em></span>${renderTags('shared-style', STYLE_OPTIONS, shared.style, 2)}${renderError('sharedStyle')}</div>
      ${shared.style.includes('אחר') ? `<label class="${fieldClass('sharedStyleOther')}" data-error-key="sharedStyleOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-shared="styleOther" maxlength="60" value="${escapeHtml(shared.styleOther)}"/>${renderCounter(shared.styleOther, 60)}${renderError('sharedStyleOther')}</label>` : ''}
      <label class="${fieldClass('sharedRealism')}" data-error-key="sharedRealism"><span>מה רמת הריאליזם הרצויה? <em>*</em></span><select data-shared="realism"><option value="">בחרי</option>${REALISM_OPTIONS.map((o) => `<option ${shared.realism === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('sharedRealism')}</label>
      ${shared.realism === 'אחר' ? `<label class="${fieldClass('sharedRealismOther')}" data-error-key="sharedRealismOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-shared="realismOther" maxlength="60" value="${escapeHtml(shared.realismOther)}"/>${renderCounter(shared.realismOther, 60)}${renderError('sharedRealismOther')}</label>` : ''}
      <label class="split-field"><span>האם יש צבעים או צבעוניות שחשוב לשמור?</span><input data-shared="colors" maxlength="80" value="${escapeHtml(shared.colors)}"/>${renderCounter(shared.colors, 80)}</label>
      <div class="split-field"><span>מה חשוב שלא יופיע בתמונות?</span>${renderTags('shared-avoid', AVOID_OPTIONS, shared.avoid, 4)}</div>
      ${shared.avoid.includes('אחר') ? `<label class="${fieldClass('sharedAvoidOther')}" data-error-key="sharedAvoidOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-shared="avoidOther" maxlength="80" value="${escapeHtml(shared.avoidOther)}"/>${renderCounter(shared.avoidOther, 80)}${renderError('sharedAvoidOther')}</label>` : ''}
    </article>`;
}

function renderPrototypeScreens() {
  return state.prototypeScreens.map((screen, index) => `
    <article class="split-card">
      <h3>כרטיס מסך ${screen.number}</h3>
      <label class="${fieldClass(`screenType${index}`)}" data-error-key="screenType${index}"><span>מה סוג המסך? <em>*</em></span><select data-screen="${index}" data-key="type"><option value="">בחרי</option>${SCREEN_TYPE_OPTIONS.map((option) => `<option ${screen.type === option ? 'selected' : ''}>${option}</option>`).join('')}</select>${renderError(`screenType${index}`)}</label>
      ${screen.type === 'אחר' ? `<label class="${fieldClass(`screenShortName${index}`)}" data-error-key="screenShortName${index}"><span>אם נבחר \"אחר\" – שם קצר למסך <em>*</em></span><input data-screen="${index}" data-key="shortName" maxlength="30" value="${escapeHtml(screen.shortName)}" />${renderCounter(screen.shortName, 30)}${renderError(`screenShortName${index}`)}</label>` : ''}
      <label class="${fieldClass(`screenView${index}`)}" data-error-key="screenView${index}"><span>מה המשתמשת רואה במסך? <em>*</em></span><textarea data-screen="${index}" data-key="view" maxlength="220">${escapeHtml(screen.view)}</textarea>${renderCounter(screen.view, 220)}${renderError(`screenView${index}`)}</label>
      <label class="${fieldClass(`screenAction${index}`)}" data-error-key="screenAction${index}"><span>מה המשתמשת עושה במסך? <em>*</em></span><textarea data-screen="${index}" data-key="action" maxlength="220">${escapeHtml(screen.action)}</textarea>${renderCounter(screen.action, 220)}${renderError(`screenAction${index}`)}</label>
      <div class="${fieldClass(`screenComponents${index}`)}" data-error-key="screenComponents${index}"><span>אילו רכיבים חייבים להופיע? <em>*</em></span>${renderTags(`components-${index}`, COMPONENT_OPTIONS, screen.components, 5)}${renderError(`screenComponents${index}`)}</div>
      ${screen.components.includes('אחר') ? `<label class="${fieldClass(`screenComponentsOther${index}`)}" data-error-key="screenComponentsOther${index}"><span>אם נבחר \"אחר\" – פירוט רכיב נוסף <em>*</em></span><input data-screen="${index}" data-key="componentsOther" maxlength="60" value="${escapeHtml(screen.componentsOther)}" />${renderCounter(screen.componentsOther, 60)}${renderError(`screenComponentsOther${index}`)}</label>` : ''}
      <div class="${fieldClass(`screenEmphasis${index}`)}" data-error-key="screenEmphasis${index}"><span>מה חשוב שיבלוט? <em>*</em></span>${renderTags(`emphasis-${index}`, EMPHASIS_OPTIONS, screen.emphasis, 3)}${renderError(`screenEmphasis${index}`)}</div>
      ${screen.emphasis.includes('אחר') ? `<label class="${fieldClass(`screenEmphasisOther${index}`)}" data-error-key="screenEmphasisOther${index}"><span>אם נבחר \"אחר\" – פירוט דגש נוסף <em>*</em></span><input data-screen="${index}" data-key="emphasisOther" maxlength="60" value="${escapeHtml(screen.emphasisOther)}" />${renderCounter(screen.emphasisOther, 60)}${renderError(`screenEmphasisOther${index}`)}</label>` : ''}
    </article>
  `).join('');
}

function renderStep2Physical() {
  const { main, usage } = state.physicalPrompt;
  return `
    <article class="split-card">
      <h3>כרטיס תמונה ראשית</h3>
      <label class="${fieldClass('mainAppearance')}" data-error-key="mainAppearance"><span>איך המוצר מופיע? <em>*</em></span><select data-physical="main" data-key="appearance"><option value="">בחרי</option>${PHYSICAL_MAIN_OPTIONS.appearance.map((o) => `<option ${main.appearance === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('mainAppearance')}</label>
      ${main.appearance === 'אחר' ? `<label class="${fieldClass('mainAppearanceOther')}" data-error-key="mainAppearanceOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-physical="main" data-key="appearanceOther" maxlength="60" value="${escapeHtml(main.appearanceOther)}"/>${renderCounter(main.appearanceOther, 60)}${renderError('mainAppearanceOther')}</label>` : ''}
      <div class="${fieldClass('mainHighlight')}" data-error-key="mainHighlight"><span>מה חשוב שיבלוט? <em>*</em></span>${renderTags('main-highlight', PHYSICAL_MAIN_OPTIONS.highlight, main.highlight, 3)}${renderError('mainHighlight')}</div>
      ${main.highlight.includes('אחר') ? `<label class="${fieldClass('mainHighlightOther')}" data-error-key="mainHighlightOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-physical="main" data-key="highlightOther" maxlength="60" value="${escapeHtml(main.highlightOther)}"/>${renderCounter(main.highlightOther, 60)}${renderError('mainHighlightOther')}</label>` : ''}
      <label class="${fieldClass('mainMaterial')}" data-error-key="mainMaterial"><span>חומר / מרקם המוצר <em>*</em></span><select data-physical="main" data-key="material"><option value="">בחרי</option>${PHYSICAL_MAIN_OPTIONS.material.map((o) => `<option ${main.material === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('mainMaterial')}</label>
      ${main.material === 'אחר' ? `<label class="${fieldClass('mainMaterialOther')}" data-error-key="mainMaterialOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-physical="main" data-key="materialOther" maxlength="60" value="${escapeHtml(main.materialOther)}"/>${renderCounter(main.materialOther, 60)}${renderError('mainMaterialOther')}</label>` : ''}
      <label class="${fieldClass('mainBackground')}" data-error-key="mainBackground"><span>רקע רצוי <em>*</em></span><select data-physical="main" data-key="background"><option value="">בחרי</option>${PHYSICAL_MAIN_OPTIONS.background.map((o) => `<option ${main.background === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('mainBackground')}</label>
      ${main.background === 'אחר' ? `<label class="${fieldClass('mainBackgroundOther')}" data-error-key="mainBackgroundOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-physical="main" data-key="backgroundOther" maxlength="60" value="${escapeHtml(main.backgroundOther)}"/>${renderCounter(main.backgroundOther, 60)}${renderError('mainBackgroundOther')}</label>` : ''}
      <label class="${fieldClass('mainDescription')}" data-error-key="mainDescription"><span>מה צריך לראות בתמונה? <em>*</em></span><textarea data-physical="main" data-key="description" maxlength="220">${escapeHtml(main.description)}</textarea>${renderCounter(main.description, 220)}${renderError('mainDescription')}</label>
    </article>

    <article class="split-card">
      <h3>כרטיס תמונת שימוש</h3>
      <label class="${fieldClass('usageUser')}" data-error-key="usageUser"><span>מי משתמשת במוצר? <em>*</em></span><select data-physical="usage" data-key="user"><option value="">בחרי</option>${PHYSICAL_USAGE_OPTIONS.user.map((o) => `<option ${usage.user === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('usageUser')}</label>
      ${usage.user === 'אחר' ? `<label class="${fieldClass('usageUserOther')}" data-error-key="usageUserOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-physical="usage" data-key="userOther" maxlength="60" value="${escapeHtml(usage.userOther)}" />${renderCounter(usage.userOther, 60)}${renderError('usageUserOther')}</label>` : ''}
      <label class="${fieldClass('usageCount')}" data-error-key="usageCount"><span>כמה אנשים בתמונה? <em>*</em></span><select data-physical="usage" data-key="peopleCount"><option value="">בחרי</option>${PHYSICAL_USAGE_OPTIONS.peopleCount.map((o) => `<option ${usage.peopleCount === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('usageCount')}</label>
      ${usage.peopleCount === 'אחר' ? `<label class="${fieldClass('usageCountOther')}" data-error-key="usageCountOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-physical="usage" data-key="peopleCountOther" maxlength="60" value="${escapeHtml(usage.peopleCountOther)}" />${renderCounter(usage.peopleCountOther, 60)}${renderError('usageCountOther')}</label>` : ''}
      <label class="${fieldClass('usageLocation')}" data-error-key="usageLocation"><span>איפה מתרחש השימוש? <em>*</em></span><select data-physical="usage" data-key="location"><option value="">בחרי</option>${PHYSICAL_USAGE_OPTIONS.location.map((o) => `<option ${usage.location === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${renderError('usageLocation')}</label>
      ${usage.location === 'אחר' ? `<label class="${fieldClass('usageLocationOther')}" data-error-key="usageLocationOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-physical="usage" data-key="locationOther" maxlength="60" value="${escapeHtml(usage.locationOther)}" />${renderCounter(usage.locationOther, 60)}${renderError('usageLocationOther')}</label>` : ''}
      <label class="${fieldClass('usageAction')}" data-error-key="usageAction"><span>מה הפעולה המוצגת? <em>*</em></span><textarea data-physical="usage" data-key="action" maxlength="220">${escapeHtml(usage.action)}</textarea>${renderCounter(usage.action, 220)}${renderError('usageAction')}</label>
      <div class="split-field"><span>אילו חפצים נוספים צריכים להופיע?</span>${renderTags('usage-props', PHYSICAL_USAGE_OPTIONS.props, usage.props, 4)}</div>
      ${usage.props.includes('אחר') ? `<label class="${fieldClass('usagePropsOther')}" data-error-key="usagePropsOther"><span>פירוט נוסף לחפצים</span><input data-physical="usage" data-key="propsOther" maxlength="80" value="${escapeHtml(usage.propsOther)}" />${renderCounter(usage.propsOther, 80)}${renderError('usagePropsOther')}</label>` : ''}
      <div class="${fieldClass('usageHighlight')}" data-error-key="usageHighlight"><span>מה צריך לבלוט? <em>*</em></span>${renderTags('usage-highlight', PHYSICAL_USAGE_OPTIONS.highlight, usage.highlight, 3)}${renderError('usageHighlight')}</div>
      ${usage.highlight.includes('אחר') ? `<label class="${fieldClass('usageHighlightOther')}" data-error-key="usageHighlightOther"><span>אם נבחר \"אחר\" – פירוט</span><input data-physical="usage" data-key="highlightOther" maxlength="60" value="${escapeHtml(usage.highlightOther)}" />${renderCounter(usage.highlightOther, 60)}${renderError('usageHighlightOther')}</label>` : ''}
      <label class="${fieldClass('usageTakeaway')}" data-error-key="usageTakeaway"><span>מה חשוב שהצופה תבין? <em>*</em></span><textarea data-physical="usage" data-key="takeaway" maxlength="220">${escapeHtml(usage.takeaway)}</textarea>${renderCounter(usage.takeaway, 220)}${renderError('usageTakeaway')}</label>
    </article>
    ${renderSharedVisualSection()}`;
}

function renderStep2() {
  if (productType === 'physical') {
    const mainPrompt = buildPhysicalPrompt('main');
    const usagePrompt = buildPhysicalPrompt('usage');
    return `${renderStep2Physical()}
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

  const flowCard = productType === 'website' ? `
    <article class="split-card">
      <h3>כרטיס תרשים זרימה</h3>
      <label class="${fieldClass('flowStart')}" data-error-key="flowStart"><span>מאיזה מסך מתחיל השימוש? <em>*</em></span><select data-flow="start"><option value="">בחרי</option>${[1, 2, 3].map((num) => `<option ${state.prototypeFlow.start === `מסך ${num}` ? 'selected' : ''}>מסך ${num}</option>`).join('')}</select>${renderError('flowStart')}</label>
      <label class="${fieldClass('flowEnd')}" data-error-key="flowEnd"><span>באיזה מסך מסתיים השימוש? <em>*</em></span><select data-flow="end"><option value="">בחרי</option>${[1, 2, 3].map((num) => `<option ${state.prototypeFlow.end === `מסך ${num}` ? 'selected' : ''}>מסך ${num}</option>`).join('')}</select>${renderError('flowEnd')}</label>
      <label class="${fieldClass('flowSummary')}" data-error-key="flowSummary"><span>תארי בקצרה את זרימת השימוש <em>*</em></span><textarea data-flow="summary" maxlength="260">${escapeHtml(state.prototypeFlow.summary)}</textarea>${renderCounter(state.prototypeFlow.summary, 260)}${renderError('flowSummary')}</label>
      <label class="${fieldClass('flowBranchToggle')}" data-error-key="flowBranchToggle"><span>האם יש הסתעפות? <em>*</em></span><select data-flow="hasBranch"><option value="">בחרי</option><option ${state.prototypeFlow.hasBranch === 'כן' ? 'selected' : ''}>כן</option><option ${state.prototypeFlow.hasBranch === 'לא' ? 'selected' : ''}>לא</option></select>${renderError('flowBranchToggle')}</label>
      ${state.prototypeFlow.hasBranch === 'כן' ? `<label class="${fieldClass('flowBranchText')}" data-error-key="flowBranchText"><span>אם כן: תארי את ההסתעפות <em>*</em></span><textarea data-flow="branch" maxlength="220">${escapeHtml(state.prototypeFlow.branch)}</textarea>${renderCounter(state.prototypeFlow.branch, 220)}${renderError('flowBranchText')}</label>` : ''}
    </article>
  ` : '';

  const helperIntro = `<article class="split-card"><p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6">מלאו את שלושת המסכים המרכזיים שיופיעו בפוסטר.<br><small>בחרו מראש את שלושת המסכים שהכי מסבירים את המיזם: מסך פתיחה, מסך פעולה מרכזית ומסך תוצאה או ערך למשתמשת.</small></p></article>`;
  return `${helperIntro}${renderPrototypeScreens()}${flowCard}${renderSharedVisualSection()}`;
}

function renderStep3() {
  const cards = state.images.map((image, index) => `
    <article class="split-card">
      <h3>תמונה ${index + 1} (מסך ${index + 1})</h3>
      <pre class="split-prompt" id="prompt-${index}">${escapeHtml(buildDigitalPrompt(index))}</pre>
      <button type="button" class="split-btn ghost" data-copy-image="${index}">העתיקי פרומפט</button>
    </article>
  `).join('');

  return `${cards}<article class="split-card"><button type="button" class="split-btn primary" data-copy-all-images>העתיקי את כל הפרומפטים</button></article>`;
}

function renderStep4() {
  seedPosterBuilderState();
  const fontTiles = AVAILABLE_FONTS.map((font) => `
    <button type="button" class="split-font-tile ${state.design.titleFont === font.value ? 'active' : ''}" data-design="titleFont" data-value="${escapeHtml(font.value)}" title="${escapeHtml(font.label)}">
      <img src="${escapeHtml(font.img)}" alt="${escapeHtml(font.label)}" />
    </button>
  `).join('');
  const titleColorButtons = DESIGN_COLORS.map((color) => `
    <button type="button" class="split-tag split-color-tag ${state.design.titleColor === color ? 'active' : ''}" data-design="titleColor" data-value="${color}" title="${color}">
      <span class="split-color-dot" style="background:${color}"></span>
    </button>
  `).join('');
  const textColorButtons = DESIGN_COLORS.map((color) => `
    <button type="button" class="split-tag split-color-tag ${state.design.textColor === color ? 'active' : ''}" data-design="textColor" data-value="${color}" title="${color}">
      <span class="split-color-dot" style="background:${color}"></span>
    </button>
  `).join('');
  const titleColorPicker = `<input type="color" class="split-color-picker" data-design="titleColor" value="${state.design.titleColor}" title="בחירת צבע חופשי לכותרות" />`;
  const textColorPicker  = `<input type="color" class="split-color-picker" data-design="textColor"  value="${state.design.textColor}"  title="בחירת צבע חופשי לטקסט" />`;
  const bgTiles = `
    <button type="button" class="split-bg-tile ${!state.design.background ? 'active' : ''}" data-design="background" data-value="">
      <span class="split-bg-none">ללא רקע</span>
    </button>
    ${BACKGROUNDS.map((bg) => `
      <button type="button" class="split-bg-tile ${state.design.background === bg.path ? 'active' : ''}" data-design="background" data-value="${escapeHtml(bg.path)}" title="${escapeHtml(bg.name)}">
        <img src="${escapeHtml(bg.path)}" alt="${escapeHtml(bg.name)}" />
        <span>${escapeHtml(bg.name)}</span>
      </button>
    `).join('')}`;

  return `<article class="split-card">
    <h3>מיפוי ועיצוב לפוסטר</h3>
    <div class="split-design-layout">
      <div class="split-field"><span>רקע לפוסטר</span><div class="split-bg-grid">${bgTiles}</div></div>
      <div class="split-field"><span>פונט</span><div class="split-font-grid">${fontTiles}</div></div>
      <div class="split-field"><span>צבע כותרות</span><div class="split-tags">${titleColorButtons}${titleColorPicker}</div></div>
      <div class="split-field"><span>צבע טקסט</span><div class="split-tags">${textColorButtons}${textColorPicker}</div></div>
      <div class="split-field"><span>עיצוב תיבות</span><div class="split-tags">${SHAPE_OPTIONS.map((shape) => `<button type="button" class="split-tag ${state.design.shape === shape.value ? 'active' : ''}" data-design="shape" data-value="${shape.value}">${shape.label}</button>`).join('')}</div></div>
    </div>
    <a class="split-btn primary" href="./editor.html?type=${productType}">יצירת הפוסטר</a>
  </article>`;
}

function renderBody() {
  if (state.step === 1) return renderStep1();
  if (state.step === 2) return renderStep2();
  if (state.step === MAX_STEP) return renderStep4();
  return renderStep3();
}

function renderStepper() {
  return `<div class="split-stepper">${STEP_LABELS.map((label, index) => {
    const stepNo = index + 1;
    const cls = stepNo < state.step ? 'completed' : (stepNo === state.step ? 'active' : '');
    return `<button type="button" class="split-step ${cls}" data-step="${stepNo}">${stepNo}. ${label}</button>`;
  }).join('')}</div>`;
}

function render() {
  normalizeAppImageMapping();
  sanitizeOtherFields();
  root.innerHTML = `
  <style>
    html,body,#root{height:auto;min-height:100%}
    body{overflow-y:auto;overflow-x:hidden;background:radial-gradient(circle at top,#f8f3ff 0%,#f6f8fc 45%,#f2f5fb 100%)}
    .split-shell{max-width:980px;margin:0 auto;padding:30px 18px 42px;font-family:'IBM Plex Sans Hebrew','Rubik',sans-serif;color:#1f2937;direction:rtl}
    .split-header{margin-bottom:14px;text-align:center;padding:18px 22px;border-radius:20px;background:linear-gradient(155deg,#fff 0%,#f6f0ff 100%);border:1px solid rgba(196,181,253,.5);box-shadow:0 8px 32px rgba(94,39,80,.12),0 2px 6px rgba(94,39,80,.06)}
    .split-title{margin:0;font-size:1.7rem;color:#5E2750}
    .split-sub{margin:8px 0 0;color:#59657a}
    .split-stepper{display:grid;grid-template-columns:repeat(${MAX_STEP},minmax(0,1fr));gap:9px;margin:20px 0}
    .split-step{border:1.5px solid #d8b4d8;background:linear-gradient(180deg,#fff,#fdfaff);border-radius:999px;padding:10px 6px;cursor:pointer;font:inherit;font-weight:500;color:#5E2750;box-shadow:0 2px 8px rgba(94,39,80,.08);transition:.2s ease}
    .split-step:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(94,39,80,.18);border-color:#b07ad0}
    .split-step.active{background:linear-gradient(135deg,#5E2750,#7c3aed);color:#fff;border-color:transparent;box-shadow:0 6px 18px rgba(94,39,80,.34)}
    .split-step.completed{background:linear-gradient(135deg,#f3e8ff,#ede9fe);border-color:#c084fc;color:#6d28d9}
    .split-body{display:grid;gap:16px;padding:2px}
    .split-card{background:linear-gradient(160deg,#ffffff 0%,#faf8ff 100%);border:1px solid #e2d4fb;border-radius:18px;padding:18px 20px;display:grid;gap:13px;box-shadow:0 6px 24px rgba(94,39,80,.09),0 2px 6px rgba(15,23,42,.05);position:relative;overflow:hidden}
    .split-card::before{content:'';position:absolute;top:0;right:0;left:0;height:3px;background:linear-gradient(90deg,#7c3aed,#5E2750,#b45ead);border-radius:18px 18px 0 0}
    .split-card h3{margin:0;color:#4c1d95;font-size:1rem;font-weight:700;padding-top:2px}
    .split-field{display:grid;gap:8px}
    .split-field>span,.split-field label>span{font-weight:600;font-size:14.5px;color:#3b1f5c}
    .split-field span em{color:#b91c1c;font-style:normal}
    .split-field textarea,.split-field input,.split-field select{border:1.5px solid #d5c5f0;border-radius:12px;padding:10px 12px;font:inherit;direction:rtl;background:linear-gradient(180deg,#fff,#fdfcff);transition:border-color .18s ease,box-shadow .18s ease;box-shadow:0 1px 4px rgba(94,39,80,.06)}
    .split-field input,.split-field textarea{width:min(640px,100%)}
    .split-field select{width:min(430px,100%);min-width:220px}
    .split-field-compact{justify-items:start}
    .split-field textarea:focus,.split-field input:focus,.split-field select:focus{outline:none;border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.16),0 2px 8px rgba(94,39,80,.08)}
    .split-field.error textarea,.split-field.error input,.split-field.error select,.split-card.error{border-color:#dc2626;box-shadow:0 0 0 2px rgba(220,38,38,.08)}
    .split-field textarea{min-height:43px;line-height:1.5;font-size:15px}
    .split-counter{font-size:12px;color:#2f855a;line-height:1.2}
    .split-counter.near-limit{color:#b7791f}
    .split-counter.full,.split-counter.overflow{color:#c53030}
    .split-field :is(textarea,input).char-state-near-limit{border-color:#d97706;box-shadow:0 0 0 2px rgba(217,119,6,.08)}
    .split-field :is(textarea,input).char-state-full,.split-field :is(textarea,input).char-state-overflow{border-color:#dc2626;box-shadow:0 0 0 2px rgba(220,38,38,.1)}
    .split-error{color:#b91c1c;font-weight:600}
    .split-tags{display:flex;gap:8px;flex-wrap:wrap}
    .split-tag{border:1.5px solid #d5c5f0;border-radius:999px;padding:8px 14px;background:linear-gradient(180deg,#fff,#faf7ff);cursor:pointer;transition:.18s ease;color:#4c1d95;font-size:14px;box-shadow:0 1px 4px rgba(94,39,80,.07)}
    .split-tag:hover{border-color:#9d6be0;background:linear-gradient(180deg,#f5f0ff,#ede9fe);transform:translateY(-1px);box-shadow:0 4px 12px rgba(94,39,80,.15)}
    .split-tag.active{background:linear-gradient(135deg,#5E2750,#7c3aed);color:#fff;border-color:transparent;box-shadow:0 5px 14px rgba(94,39,80,.3);transform:translateY(-1px)}
    .split-color-tag{display:flex;align-items:center;gap:0;padding:5px}
    .split-color-dot{width:22px;height:22px;border-radius:50%;border:2px solid rgba(0,0,0,.16)}
    .split-bg-grid{display:grid;grid-template-columns:repeat(6,auto);gap:8px;justify-content:start}
    .split-bg-tile{border:2px solid #ddd0f5;border-radius:12px;padding:3px;cursor:pointer;background:linear-gradient(180deg,#fff,#fdfcff);transition:.18s ease;display:flex;flex-direction:column;align-items:center;box-shadow:0 1px 4px rgba(94,39,80,.06)}
    .split-bg-tile:hover{border-color:#8b5cf6;transform:translateY(-2px);box-shadow:0 6px 16px rgba(94,39,80,.18)}
    .split-bg-tile.active{border-color:#5E2750;box-shadow:0 0 0 2px rgba(94,39,80,.28),0 4px 12px rgba(94,39,80,.14)}
    .split-bg-tile img{width:64px;height:82px;object-fit:cover;border-radius:8px;display:block}
    .split-bg-tile span{font-size:10px;color:#4c1d95;margin-top:3px;line-height:1}
    .split-bg-none{width:64px;height:82px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-radius:8px;color:#6b7280;font-size:11px;text-align:center}
    .split-font-grid{display:grid;grid-template-columns:repeat(3,auto);gap:8px;justify-content:start}
    .split-font-tile{border:2px solid #ddd0f5;border-radius:12px;padding:6px 10px;cursor:pointer;background:linear-gradient(180deg,#fff,#fdfcff);transition:.18s ease;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(94,39,80,.06)}
    .split-font-tile:hover{border-color:#8b5cf6;transform:translateY(-2px);box-shadow:0 6px 16px rgba(94,39,80,.18)}
    .split-font-tile.active{border-color:#5E2750;box-shadow:0 0 0 2px rgba(94,39,80,.28),0 4px 12px rgba(94,39,80,.12)}
    .split-font-tile img{height:34px;max-width:130px;object-fit:contain;display:block}
    .split-color-picker{-webkit-appearance:none;appearance:none;width:36px;height:36px;border-radius:50%;border:2px solid #ddd0f5;padding:2px;cursor:pointer;background:none;flex-shrink:0;transition:border-color .18s;box-shadow:0 1px 4px rgba(94,39,80,.1)}
    .split-color-picker:hover{border-color:#8b5cf6}
    .split-color-picker::-webkit-color-swatch-wrapper{padding:0;border-radius:50%}
    .split-color-picker::-webkit-color-swatch{border-radius:50%;border:none}
    .split-color-picker::-moz-color-swatch{border-radius:50%;border:none}
    @media(max-width:600px){.split-bg-grid{grid-template-columns:repeat(3,auto)}.split-font-grid{grid-template-columns:repeat(2,auto)}}
    .split-design-layout{display:grid;gap:12px;padding:14px;border-radius:16px;background:linear-gradient(155deg,rgba(248,245,255,.9),rgba(237,233,254,.6));border:1px solid #ddd0f5;box-shadow:0 2px 10px rgba(94,39,80,.06)}
    .split-nav{display:flex;justify-content:space-between;gap:10px;margin-top:18px}
    .split-btn{border:none;border-radius:12px;padding:11px 24px;cursor:pointer;font:inherit;font-weight:600;box-shadow:0 4px 14px rgba(15,23,42,.12);transition:.18s ease;width:fit-content;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .split-btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(15,23,42,.16)}
    .split-btn.primary{background:linear-gradient(135deg,#5E2750,#7c3aed);color:#fff;box-shadow:0 6px 18px rgba(94,39,80,.3)}
    .split-btn.primary:hover{box-shadow:0 10px 26px rgba(94,39,80,.4)}
    .split-btn.ghost{background:linear-gradient(135deg,#ede9fe,#f3e8ff);color:#5E2750;border:1.5px solid #d5c5f0}
    .split-btn:disabled{opacity:.5;cursor:not-allowed}
    .split-nav .split-btn{width:auto}
    .split-alert{background:linear-gradient(135deg,#fee2e2,#fef3c7);color:#991b1b;border:1px solid #fecaca;border-radius:12px;padding:10px 14px;box-shadow:0 2px 8px rgba(220,38,38,.1)}
    .split-prompt{white-space:pre-wrap;direction:ltr;text-align:left;background:linear-gradient(155deg,#f8fafc,#f0eeff);border:1.5px dashed #b9a5f8;border-radius:14px;padding:14px;line-height:1.62;box-shadow:inset 0 2px 6px rgba(94,39,80,.06),0 2px 8px rgba(94,39,80,.05);font-size:13.5px}
    .split-link{display:inline-block;background:linear-gradient(135deg,#5E2750,#7c3aed);color:#fff;text-decoration:none;border-radius:12px;padding:11px 16px;box-shadow:0 8px 18px rgba(94,39,80,.28)}
    .split-picks{display:flex;gap:8px;flex-wrap:wrap}
    .split-check{display:flex;gap:6px;align-items:center}
    @media (max-width:900px){.split-shell{max-width:780px}}
    @media (max-width:800px){.split-stepper{grid-template-columns:1fr 1fr}.split-shell{padding:20px 12px 34px}.split-field select,.split-field input,.split-field textarea{width:100%;min-width:0}}
  </style>
  <main class="split-shell">
    <header class="split-header">
      <h1 class="split-title">בונות פוסטר חקר — ${PRODUCT_TITLE[productType]}</h1>
      <p class="split-sub">כל הזרימה מותאמת לשלב החקר, הפרומפט והתמונות, עם מיפוי לפוסטר הקיים.</p>
    </header>
    ${renderStepper()}
    ${state.visibleErrors.length ? '<div class="split-alert">יש להשלים את השדות החסרים לפני מעבר לשלב הבא.</div>' : ''}
    <section class="split-body">${renderBody()}</section>
    <nav class="split-nav">
      <button type="button" class="split-btn ghost" data-nav="back" ${state.step === 1 ? 'disabled' : ''}>חזרה</button>
      <button type="button" class="split-btn primary" data-nav="next">${state.step === MAX_STEP ? 'סיום' : 'המשיכי לשלב הבא'}</button>
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
  if (tag === 'shared-style') return toggleArray(state.sharedVisualPrompt.style, value, max);
  if (tag === 'shared-avoid') return toggleArray(state.sharedVisualPrompt.avoid, value, max);
  if (tag === 'main-highlight') return toggleArray(state.physicalPrompt.main.highlight, value, max);
  if (tag === 'usage-props') return toggleArray(state.physicalPrompt.usage.props, value, max);
  if (tag === 'usage-highlight') return toggleArray(state.physicalPrompt.usage.highlight, value, max);
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  const original = button.textContent;
  button.textContent = 'הועתק';
  setTimeout(() => { button.textContent = original; }, 1200);
}

function wireEvents() {
  const OTHER_TRIGGER_KEYS = new Set([
    'appearance', 'highlight', 'material', 'background', 'style', 'realism', 'avoid',
    'user', 'peopleCount', 'location', 'props',
    'type', 'components', 'emphasis'
  ]);

  root.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.step);
      if (target < state.step) {
        state.errors = {};
        state.visibleErrors = [];
        state.step = target;
        render();
      }
    });
  });

  root.querySelectorAll('[data-research]').forEach((input) => {
    input.addEventListener('input', () => {
      state.research[input.dataset.research] = input.value;
      state.errors[input.dataset.research] = '';
      state.visibleErrors = state.visibleErrors.filter((key) => key !== input.dataset.research);
      updateCounterForInput(input);
      persistSplitFlowState();
    });
  });

  root.querySelectorAll('[data-physical]').forEach((input) => {
    input.addEventListener('input', () => {
      const block = input.dataset.physical;
      const key = input.dataset.key;
      state.physicalPrompt[block][key] = input.value;
      state.visibleErrors = state.visibleErrors.filter((err) => !err.toLowerCase().includes(key.toLowerCase()));
      persistSplitFlowState();
      if (OTHER_TRIGGER_KEYS.has(key)) return render();
      updateCounterForInput(input);
    });
  });

  root.querySelectorAll('[data-screen]').forEach((input) => {
    input.addEventListener('input', () => {
      const screen = state.prototypeScreens[Number(input.dataset.screen)];
      screen[input.dataset.key] = input.value;
      state.visibleErrors = [];
      persistSplitFlowState();
      if (OTHER_TRIGGER_KEYS.has(input.dataset.key)) return render();
      updateCounterForInput(input);
    });
  });

  root.querySelectorAll('[data-shared]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.shared;
      state.sharedVisualPrompt[key] = input.value;
      state.visibleErrors = state.visibleErrors.filter((err) => !err.startsWith('shared'));
      persistSplitFlowState();
      if (OTHER_TRIGGER_KEYS.has(key)) return render();
      updateCounterForInput(input);
    });
  });

  root.querySelectorAll('[data-flow]').forEach((input) => {
    input.addEventListener('input', () => {
      state.prototypeFlow[input.dataset.flow] = input.value;
      state.visibleErrors = state.visibleErrors.filter((key) => !key.startsWith('flow'));
      updateCounterForInput(input);
      persistSplitFlowState();
      if (input.dataset.flow === 'hasBranch') render();
    });
  });

  root.querySelectorAll('[data-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTag(button.dataset.tag, button.dataset.value, Number(button.dataset.max));
      state.visibleErrors = [];
      persistSplitFlowState();
      render();
    });
  });

  root.querySelectorAll('[data-design]').forEach((input) => {
    const eventName = (input.tagName === 'SELECT' || (input.tagName === 'INPUT' && input.type === 'color')) ? 'change' : 'click';
    input.addEventListener(eventName, () => {
      const key = input.dataset.design;
      const value = input.dataset.value ?? input.value;
      state.design[key] = key === 'shape' ? Number(value) : value;
      persistSplitFlowState();
      seedPosterBuilderState();
      render();
    });
  });

  root.querySelectorAll('[data-copy-image]').forEach((button) => {
    button.addEventListener('click', () => {
      const errors = validateStep(3);
      if (Object.keys(errors).length) {
        render();
        focusFirstInvalidField(3, errors);
        return;
      }
      copyText(buildDigitalPrompt(Number(button.dataset.copyImage)), button);
    });
  });

  const copyAllImages = root.querySelector('[data-copy-all-images]');
  if (copyAllImages) {
    copyAllImages.addEventListener('click', () => {
      const errors = validateStep(3);
      if (Object.keys(errors).length) {
        render();
        focusFirstInvalidField(3, errors);
        return;
      }
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


  initializeCounters();

  root.querySelector('[data-nav="back"]').addEventListener('click', () => {
    if (state.step > 1) {
      state.step = Math.max(1, state.step - 1);
      state.errors = {};
      state.visibleErrors = [];
      persistSplitFlowState();
      render();
    }
  });

  root.querySelector('[data-nav="next"]').addEventListener('click', () => {
    if (state.step < MAX_STEP) {
      const errors = validateStep(state.step);
      if (Object.keys(errors).length) {
        render();
        focusFirstInvalidField(state.step, errors);
        return;
      }
      state.errors = {};
      state.visibleErrors = [];
      state.step = Math.min(MAX_STEP, state.step + 1);
      persistSplitFlowState();
      render();
    }
  });
}

hydrateStateFromStorage();
render();
