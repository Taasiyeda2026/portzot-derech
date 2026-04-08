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
  { id: 'none', name: 'ללא רקע', path: null, orientation: 'any' },
  { id: 'bg-tech1', name: 'רקע 1', path: '/poster-builder/assets/backgrounds/bg-tech1.png', orientation: 'portrait' },
  { id: 'bg-tech2', name: 'רקע 2', path: '/poster-builder/assets/backgrounds/bg-tech2.png', orientation: 'portrait' },
  { id: 'bg-tech3', name: 'רקע 3', path: '/poster-builder/assets/backgrounds/bg-tech3.png', orientation: 'portrait' },
  { id: 'bg-tech4', name: 'רקע 4', path: '/poster-builder/assets/backgrounds/bg-tech4.png', orientation: 'portrait' },
  { id: 'bg-tech5', name: 'רקע 5', path: '/poster-builder/assets/backgrounds/bg-tech5.png', orientation: 'portrait' },
  { id: 'bg-tech6', name: 'רקע 6', path: '/poster-builder/assets/backgrounds/bg-tech6.png', orientation: 'portrait' },
  { id: 'bg-tech-lan1', name: 'רקע רוחבי 1', path: '/poster-builder/assets/backgrounds/bg-tech-lan1.png.png', orientation: 'landscape' },
  { id: 'bg-tech-lan2', name: 'רקע רוחבי 2', path: '/poster-builder/assets/backgrounds/bg-tech-lan2.png.png', orientation: 'landscape' },
  { id: 'bg-tech-lan3', name: 'רקע רוחבי 3', path: '/poster-builder/assets/backgrounds/bg-tech-lan3.png.png', orientation: 'landscape' },
  { id: 'bg-tech-lan4', name: 'רקע רוחבי 4', path: '/poster-builder/assets/backgrounds/bg-tech-lan4.png.png', orientation: 'landscape' },
  { id: 'bg-tech-lan5', name: 'רקע רוחבי 5', path: '/poster-builder/assets/backgrounds/bg-tech-lan5.png.png', orientation: 'landscape' },
  { id: 'bg-tech-lan6', name: 'רקע רוחבי 6', path: '/poster-builder/assets/backgrounds/bg-tech-lan6.png.png', orientation: 'landscape' }
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

export const FIELD_DEFINITIONS = [
  { id: 'projectName', question: 'מה שם המיזם?', shortLabel: 'שם המיזם', maxChars: 60, align: 'right', fontSize: 66, minFontSize: 42, lineHeight: 1.05 },
  { id: 'problem', question: 'מה הבעיה שבגללה החלטתן לפתח את המוצר?', shortLabel: 'הבעיה', maxChars: 260, align: 'right' },
  { id: 'audience', question: 'מי קהל היעד שלכן?', shortLabel: 'קהל היעד', maxChars: 200, align: 'right' },
  { id: 'importance', question: 'למה זה חשוב עכשיו?', shortLabel: 'למה זה חשוב', maxChars: 200, align: 'right' },
  { id: 'solution', question: 'מה הפתרון שלכן?', shortLabel: 'הפתרון שלנו', maxChars: 240, align: 'right' },
  { id: 'howItWorks', question: 'איך הפתרון עובד?', shortLabel: 'איך זה עובד', maxChars: 240, align: 'right' },
  { id: 'unique', question: 'מה מייחד אתכן לעומת פתרונות אחרים?', shortLabel: 'מה מייחד אותנו', maxChars: 180, align: 'right' },
  { id: 'benefit', question: 'מה התועלת המרכזית למשתמש?', shortLabel: 'מה התועלת', maxChars: 180, align: 'right' },
  { id: 'team', question: 'מי בצוות שלכן?', shortLabel: 'צוות', maxChars: 120, align: 'right', fontSize: 30, minFontSize: 24 }
];

const PORTRAIT_RECTS = {
  projectName: { x: 2360, y: 120, width: 1040, height: 320 },
  problem: { x: 2360, y: 470, width: 1040, height: 540 },
  audience: { x: 2360, y: 1040, width: 500, height: 520 },
  importance: { x: 1840, y: 1040, width: 500, height: 520 },
  solution: { x: 2360, y: 1590, width: 1040, height: 500 },
  howItWorks: { x: 2360, y: 2120, width: 1040, height: 500 },
  unique: { x: 2360, y: 2650, width: 500, height: 500 },
  benefit: { x: 1840, y: 2650, width: 500, height: 500 },
  team: { x: 2360, y: 3180, width: 1040, height: 210 }
};

const LANDSCAPE_RECTS = {
  projectName: { x: 3390, y: 90, width: 1470, height: 250 },
  problem: { x: 3390, y: 370, width: 1060, height: 430 },
  audience: { x: 2280, y: 370, width: 1060, height: 430 },
  importance: { x: 1170, y: 370, width: 1060, height: 430 },
  solution: { x: 3390, y: 840, width: 1470, height: 430 },
  howItWorks: { x: 3390, y: 1310, width: 1470, height: 430 },
  unique: { x: 1860, y: 1310, width: 1470, height: 430 },
  benefit: { x: 3390, y: 1780, width: 1060, height: 430 },
  team: { x: 2280, y: 1780, width: 2170, height: 430 }
};

function withLayout(layoutRects) {
  return FIELD_DEFINITIONS.map((field) => {
    const rect = layoutRects[field.id];
    return {
      id: field.id,
      question: field.question,
      shortLabel: field.shortLabel,
      maxChars: field.maxChars,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      align: field.align,
      fontSize: field.fontSize || 34,
      minFontSize: field.minFontSize || 24,
      lineHeight: field.lineHeight || 1.2,
      titleSpacing: field.titleSpacing || 68
    };
  });
}

export const POSTER_FIELDS_BY_SIZE = {
  A4: withLayout(PORTRAIT_RECTS),
  A4_LANDSCAPE: withLayout(LANDSCAPE_RECTS)
};

export function getPosterFields(sizeKey) {
  return POSTER_FIELDS_BY_SIZE[normalizePosterSize(sizeKey)] || POSTER_FIELDS_BY_SIZE.A4;
}
