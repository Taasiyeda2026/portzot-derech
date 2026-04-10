export const POSTER_SIZES = {
  A4: { label: 'A4 לאורך', width: 2480, height: 3508 },
  A4_LANDSCAPE: { label: 'A4 לרוחב', width: 3508, height: 2480 }
};

export function normalizePosterSize(sizeKey) {
  return POSTER_SIZES[sizeKey] ? sizeKey : 'A4';
}

export function getPosterOrientation(sizeKey) {
  const size = POSTER_SIZES[normalizePosterSize(sizeKey)];
  return size.width >= size.height ? 'landscape' : 'portrait';
}

export const BACKGROUNDS = [
  { id: 'bg-tech1', name: 'רקע 1', path: '/poster-builder/assets/backgrounds/bg-tech1.png', orientation: 'portrait' },
  { id: 'bg-tech2', name: 'רקע 2', path: '/poster-builder/assets/backgrounds/bg-tech2.png', orientation: 'portrait' },
  { id: 'bg-tech3', name: 'רקע 3', path: '/poster-builder/assets/backgrounds/bg-tech3.png', orientation: 'portrait' },
  { id: 'bg-tech4', name: 'רקע 4', path: '/poster-builder/assets/backgrounds/bg-tech4.png', orientation: 'portrait' },
  { id: 'bg-tech5', name: 'רקע 5', path: '/poster-builder/assets/backgrounds/bg-tech5.png', orientation: 'portrait' },
  { id: 'bg-tech6', name: 'רקע 6', path: '/poster-builder/assets/backgrounds/bg-tech6.png', orientation: 'portrait' },
];

export function isBackgroundCompatibleWithSize(path, sizeKey) {
  if (!path) return true;
  const bg = BACKGROUNDS.find((item) => item.path === path);
  if (!bg || bg.orientation === 'any') return true;
  return bg.orientation === getPosterOrientation(sizeKey);
}

export const ELEMENTS = Array.from({ length: 56 }, (_, index) => ({
  id: `icon${index + 1}`,
  name: `אלמנט ${index + 1}`,
  path: `/poster-builder/assets/elements/icon${index + 1}.png`
}));

export const PRODUCT_TYPES = [
  { id: 'physical', label: 'מוצר פיזי' },
  { id: 'website',  label: 'אתר' },
  { id: 'app',      label: 'אפליקציה' }
];

export const DYNAMIC_QUESTIONS = {
  solution: {
    none:     { question: 'מה הפתרון שפיתחתן?',       shortLabel: 'הפתרון שפיתחנו' },
    physical: { question: 'איזה מוצר פיזי פיתחתן?',   shortLabel: 'המוצר שפיתחנו' },
    website:  { question: 'איזה אתר פיתחתן?',          shortLabel: 'האתר שפיתחנו' },
    app:      { question: 'איזו אפליקציה פיתחתן?',     shortLabel: 'האפליקציה שפיתחנו' }
  },
  howItWorks: {
    none:     { question: 'איך הפתרון עובד?',                  shortLabel: 'איך זה עובד' },
    physical: { question: 'איך משתמשים במוצר?',               shortLabel: 'איך משתמשים' },
    website:  { question: 'מה המשתמש עושה באתר?',             shortLabel: 'מה עושים באתר' },
    app:      { question: 'איך המשתמש משתמש באפליקציה?',      shortLabel: 'איך משתמשים' }
  }
};

export const VISUAL_ZONE_TITLE = {
  none:     'אזור חזותי',
  physical: 'תמונות המוצר',
  website:  'מסכי האתר',
  app:      'מסכי האפליקציה'
};

export const FIELD_DEFINITIONS = [
  {
    id: 'projectName', question: 'שם המיזם', shortLabel: '',
    maxChars: 20, align: 'center', fontSize: 130, minFontSize: 60,
    lineHeight: 1.1, noLabel: true, center: true, fontWeight: 700, verticalCenter: true
  },
  {
    id: 'description', question: 'תיאור קצר של המיזם', shortLabel: '',
    maxChars: 75, align: 'center', fontSize: 65, minFontSize: 38,
    lineHeight: 1.15, noLabel: true, center: true, fontWeight: 400, verticalCenter: true
  },
  { id: 'problem',          question: 'מה הבעיה שזיהיתן?',               shortLabel: 'הבעיה שזיהינו',  maxChars: 130, align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.3 },
  { id: 'audience',         question: 'למי הבעיה הזו מפריעה?',           shortLabel: 'למי זה מפריע',   maxChars: 75,  align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.3 },
  { id: 'researchQuestion', question: 'מה שאלת החקר הטכנולוגית?',        shortLabel: 'שאלת החקר',      maxChars: 90,  align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.3 },
  { id: 'research',         question: 'איזה חקר עשיתן?',                 shortLabel: 'החקר שעשינו',    type: 'list', maxCharsPerRow: 42, align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.25 },
  { id: 'findings',         question: 'מה גיליתן מהחקר?',                shortLabel: 'מה גילינו',       maxChars: 110, align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.3 },
  { id: 'requirements',     question: 'מה היה חשוב שהפתרון יכלול?',      shortLabel: 'דרישות הפתרון',   type: 'list', maxCharsPerRow: 42, align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.25 },
  { id: 'solution',         question: 'מה הפתרון שפיתחתן?',              shortLabel: 'הפתרון שפיתחנו', maxChars: 130, align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.3, dynamic: 'solution' },
  { id: 'howItWorks',       question: 'איך הפתרון עובד?',                shortLabel: 'איך זה עובד',     type: 'list', maxCharsPerRow: 42, align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.25, dynamic: 'howItWorks' },
  { id: 'value',            question: 'מה הערך הסופי של הפתרון?',        shortLabel: 'הערך הסופי',      maxChars: 90,  align: 'right', fontSize: 42, minFontSize: 30, lineHeight: 1.3 },
  {
    id: 'participants', question: 'פרטי המשתתפות', shortLabel: '',
    type: 'participants', maxChars: 200,
    align: 'center', fontSize: 46, minFontSize: 30,
    lineHeight: 1.35, noLabel: true, center: true, fontWeight: 400, verticalCenter: true
  }
];

export function getListRowIds(fieldId) {
  return [`${fieldId}_1`, `${fieldId}_2`, `${fieldId}_3`];
}

export function buildListText(fieldId, values) {
  return [1, 2, 3].map((i) => {
    const v = (values[`${fieldId}_${i}`] || '').trim();
    return `${i}. ${v}`;
  }).join('\n\n');
}

export const PARTICIPANTS_SUB_KEYS = ['student1', 'student2', 'student3', 'className', 'schoolName'];

export function buildParticipantsText(values) {
  const names = ['student1', 'student2', 'student3']
    .map(k => (values[k] || '').trim())
    .filter(Boolean);
  const className = (values.className  || '').trim();
  const school    = (values.schoolName || '').trim();
  const line1  = names.length ? `שמות התלמידות: ${names.join(', ')}` : '';
  const parts2 = [className, school].filter(Boolean);
  const line2  = parts2.join(' | ');
  return [line1, line2].filter(Boolean).join('\n');
}

export function getAllContentKeys() {
  const keys = [];
  FIELD_DEFINITIONS.forEach((f) => {
    if (f.type === 'list') {
      keys.push(`${f.id}_1`, `${f.id}_2`, `${f.id}_3`);
    } else if (f.type === 'participants') {
      keys.push(...PARTICIPANTS_SUB_KEYS);
    } else {
      keys.push(f.id);
    }
  });
  return keys;
}

export function getFieldDef(fieldId, productType = 'none') {
  const f = FIELD_DEFINITIONS.find((d) => d.id === fieldId);
  if (!f) return null;
  if (f.dynamic && DYNAMIC_QUESTIONS[f.dynamic]) {
    const dq = DYNAMIC_QUESTIONS[f.dynamic][productType] || DYNAMIC_QUESTIONS[f.dynamic].none;
    return { ...f, question: dq.question, shortLabel: dq.shortLabel };
  }
  return f;
}

const PORTRAIT_RECTS = {
  projectName:      { x: 1240, y:  120, width: 2200, height: 180  },
  description:      { x: 1240, y:  320, width: 2200, height: 110  },
  problem:          { x: 2360, y:  720, width: 1080, height: 440  },
  audience:         { x: 2360, y: 1230, width: 1080, height: 330  },
  researchQuestion: { x: 2360, y: 1630, width: 1080, height: 330  },
  research:         { x: 2360, y: 2030, width: 1080, height: 620  },
  findings:         { x: 2360, y: 2720, width: 1080, height: 480  },
  requirements:     { x: 1160, y:  720, width: 1040, height: 500  },
  solution:         { x: 1160, y: 1780, width: 1040, height: 350  },
  howItWorks:       { x: 1160, y: 2200, width: 1040, height: 620  },
  value:            { x: 1160, y: 2890, width: 1040, height: 310  },
  participants:     { x: 1240, y: 3240, width: 2200, height: 200  }
};

const LANDSCAPE_RECTS = {
  projectName:      { x: 2055, y: 24,   width: 2710, height: 140  },
  description:      { x: 2055, y: 174,  width: 2710, height: 98   },
  problem:          { x: 3410, y: 450,  width: 1576, height: 240  },
  audience:         { x: 3410, y: 770,  width: 1576, height: 180  },
  researchQuestion: { x: 3410, y: 1030, width: 1576, height: 200  },
  research:         { x: 3410, y: 1310, width: 1576, height: 380  },
  findings:         { x: 3410, y: 1770, width: 1576, height: 220  },
  requirements:     { x: 1674, y: 450,  width: 1576, height: 380  },
  solution:         { x: 1674, y: 1200, width: 1576, height: 180  },
  howItWorks:       { x: 1674, y: 1440, width: 1576, height: 380  },
  value:            { x: 1674, y: 1880, width: 1576, height: 120  },
  participants:     { x: 1754, y: 2060, width: 3312, height: 140  }
};

function withLayout(layoutRects, productType = 'none') {
  return FIELD_DEFINITIONS.map((field) => {
    const rect = layoutRects[field.id];
    const dynField = getFieldDef(field.id, productType);
    return {
      id:             field.id,
      type:           field.type || 'text',
      question:       dynField.question,
      shortLabel:     dynField.shortLabel,
      maxChars:       field.maxChars,
      maxCharsPerRow: field.maxCharsPerRow,
      dynamic:        field.dynamic || null,
      x:              rect.x,
      y:              rect.y,
      width:          rect.width,
      height:         rect.height,
      align:          field.align,
      fontSize:       field.fontSize    || 42,
      minFontSize:    field.minFontSize || 30,
      lineHeight:     field.lineHeight  || 1.3,
      titleSpacing:   field.titleSpacing || 80,
      noLabel:        field.noLabel        || false,
      center:         field.center         || false,
      fontWeight:     field.fontWeight     || 400,
      verticalCenter: field.verticalCenter || false
    };
  });
}

export function getPosterFields(sizeKey, productType = 'none') {
  const safe = normalizePosterSize(sizeKey);
  const rects = safe === 'A4_LANDSCAPE' ? LANDSCAPE_RECTS : PORTRAIT_RECTS;
  return withLayout(rects, productType);
}

export function getVisualSlots(sizeKey, productType = 'none') {
  const safe = sizeKey === 'A4_LANDSCAPE' ? 'A4_LANDSCAPE' : 'A4';
  const gap  = 40;

  if (safe === 'A4_LANDSCAPE') {
    const left   = 98;
    const totalW = 1576;
    const top    = 890;
    const h      = 250;
    if (productType === 'physical') {
      const w = Math.floor((totalW - gap) / 2);
      return [
        { key: 'visual_1', label: 'תמונה ראשית', left: left + w + gap, top, width: w, height: h },
        { key: 'visual_2', label: 'תמונת שימוש', left,                  top, width: w, height: h }
      ];
    }
    if (productType === 'website' || productType === 'app') {
      const g = 30;
      const w = Math.floor((totalW - g * 2) / 3);
      return [
        { key: 'visual_1', label: 'מסך 1', left: left + 2 * (w + g), top, width: w, height: h },
        { key: 'visual_2', label: 'מסך 2', left: left + w + g,        top, width: w, height: h },
        { key: 'visual_3', label: 'מסך 3', left,                       top, width: w, height: h }
      ];
    }
    return [{ key: 'visual', label: 'אזור חזותי', left, top, width: totalW, height: h }];
  }

  const left   = 120;
  const totalW = 1040;
  const top    = 1290;
  const h      = 420;

  if (productType === 'physical') {
    const w = Math.floor((totalW - gap) / 2);
    return [
      { key: 'visual_1', label: 'תמונה ראשית', left: left + w + gap, top, width: w, height: h },
      { key: 'visual_2', label: 'תמונת שימוש', left,                  top, width: w, height: h }
    ];
  }
  if (productType === 'website' || productType === 'app') {
    const g = 30;
    const w = Math.floor((totalW - g * 2) / 3);
    return [
      { key: 'visual_1', label: 'מסך 1', left: left + 2 * (w + g), top, width: w, height: h },
      { key: 'visual_2', label: 'מסך 2', left: left + w + g,        top, width: w, height: h },
      { key: 'visual_3', label: 'מסך 3', left,                       top, width: w, height: h }
    ];
  }
  return [{ key: 'visual', label: 'אזור חזותי', left, top, width: totalW, height: h }];
}

export const AVAILABLE_FONTS = [
  { label: 'IBM Plex Sans Hebrew', value: 'IBM Plex Sans Hebrew', img: '/poster-builder/assets/fonts/namebutton/IBM.png'    },
  { label: 'Gveret Levin',         value: 'Gveret Levin',         img: '/poster-builder/assets/fonts/namebutton/GVERET.png' },
  { label: 'Alef',                 value: 'Alef',                 img: '/poster-builder/assets/fonts/namebutton/ALEF.png'   },
  { label: 'Alice',                value: 'Alice',                img: '/poster-builder/assets/fonts/namebutton/ALICE.png'  },
  { label: 'Choco',                value: 'Choco',                img: '/poster-builder/assets/fonts/namebutton/CHOCO.png'  },
  { label: 'Yehuda',               value: 'Yehuda',               img: '/poster-builder/assets/fonts/namebutton/YEHUDA.png' },
];

export const DEFAULT_FIELD_FONT  = 'IBM Plex Sans Hebrew';
export const DEFAULT_FIELD_COLOR = '#1f2937';
