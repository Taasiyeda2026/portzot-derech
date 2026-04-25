import {
  createEditor,
  applyBackground,
  applyVisualSlots,
  applyZoneImage,
  registerFonts
} from '../../canvas/editor.js';

const { useState, useEffect, useRef, useCallback } = React;
const h = React.createElement;

// ══════════════════════════════════════════════════════════════
// POSTER LAYOUT — Extended for Physical v2 (includes feedback fields)
// ══════════════════════════════════════════════════════════════

const DEFAULT_TEXT_FONT   = 'IBM Plex Sans Hebrew';
const DEFAULT_TITLE_COLOR = '#5E2750';
const DEFAULT_TEXT_COLOR  = '#1f2937';
const LIST_SUB_GAP        = 14;
const POSTER_STYLE_STORAGE_KEY = 'physical-flow-poster-style-v1';
const STYLE_FONTS = ['IBM Plex Sans Hebrew', 'Gveret Levin', 'Alef', 'Alice', 'Choco', 'Yehuda'];
const STYLE_SHAPES = [
  { label: 'חד', value: 0 },
  { label: 'מעוגל', value: 10 },
  { label: 'עגול', value: 20 }
];
const PRESET_COLORS = ['#5E2750', '#1a3a6b', '#1a5c3a', '#7a1a1a', '#b5520a', '#1a4a5c', '#2d2d2d', '#1f2937'];

// Portrait A4: 2480 × 3508
// Right column  x:2360  (right edge), width:1080  → spans x:1280–2360
// Left  column  x:1160  (right edge), width:1040  → spans x: 120–1160
// findings reduced + 2 new fields inserted (feedbackReceived right, improvementsAfterFeedback left)
const PHYS2_FIELDS = [
  { id:'projectName',               x:1240, y: 120, width:2200, height:180,  center:true, noLabel:true, fontSize:130, minFontSize:60,  lineHeight:1.1,  fontWeight:700, verticalCenter:true, align:'center', shortLabel:'' },
  { id:'description',               x:1240, y: 320, width:2200, height:110,  center:true, noLabel:true, fontSize:65,  minFontSize:38,  lineHeight:1.15, fontWeight:400, verticalCenter:true, align:'center', shortLabel:'' },
  { id:'problem',                   x:2360, y: 720, width:1080, height:440,  fontSize:42, minFontSize:30, lineHeight:1.3,  align:'right', shortLabel:'הבעיה שזיהינו' },
  { id:'audience',                  x:2360, y:1230, width:1080, height:330,  fontSize:42, minFontSize:30, lineHeight:1.3,  align:'right', shortLabel:'קהל היעד' },
  { id:'researchQuestion',          x:2360, y:1630, width:1080, height:330,  fontSize:42, minFontSize:30, lineHeight:1.3,  align:'right', shortLabel:'שאלת החקר' },
  { id:'research',                  x:2360, y:2030, width:1080, height:570,  fontSize:42, minFontSize:30, lineHeight:1.25, align:'right', shortLabel:'החקר שביצענו',   type:'list', maxCharsPerRow:42 },
  { id:'findings',                  x:2360, y:2610, width:1080, height:240,  fontSize:42, minFontSize:30, lineHeight:1.3,  align:'right', shortLabel:'מה גילינו' },
  { id:'feedbackReceived',          x:2360, y:2860, width:1080, height:220,  fontSize:42, minFontSize:30, lineHeight:1.3,  align:'right', shortLabel:'המשוב שקיבלנו' },
  { id:'requirements',              x:1160, y: 720, width:1040, height:500,  fontSize:42, minFontSize:30, lineHeight:1.25, align:'right', shortLabel:'דרישות הפתרון',  type:'list', maxCharsPerRow:42 },
  { id:'solution',                  x:1160, y:1780, width:1040, height:350,  fontSize:42, minFontSize:30, lineHeight:1.3,  align:'right', shortLabel:'המוצר שפיתחנו' },
  { id:'howItWorks',                x:1160, y:2200, width:1040, height:550,  fontSize:42, minFontSize:30, lineHeight:1.25, align:'right', shortLabel:'איך משתמשים',    type:'list', maxCharsPerRow:42 },
  { id:'value',                     x:1160, y:2760, width:1040, height:240,  fontSize:42, minFontSize:30, lineHeight:1.3,  align:'right', shortLabel:'הערך המרכזי' },
  { id:'improvementsAfterFeedback', x:1160, y:3010, width:1040, height:220,  fontSize:42, minFontSize:30, lineHeight:1.3,  align:'right', shortLabel:'מה שיפרנו' },
  { id:'participants',              x:1240, y:3240, width:2200, height:200,  center:true, noLabel:true, fontSize:46,  minFontSize:30, lineHeight:1.35, fontWeight:400, verticalCenter:true, align:'center', shortLabel:'', type:'participants' }
];

// ── Poster field drawing utilities ───────────────────────────

function fitText(textObj, field, topPadOverride) {
  const topPad    = topPadOverride !== undefined ? topPadOverride : (field.noLabel ? 20 : 80);
  const maxHeight = Math.max(30, field.height - topPad - 10);
  let fontSize    = field.fontSize || 42;
  textObj.set({ fontSize });
  textObj.initDimensions();
  while (textObj.height > maxHeight && fontSize > (field.minFontSize || 30)) {
    fontSize -= 1;
    textObj.set({ fontSize });
    textObj.initDimensions();
  }
  const clipPad  = field.center ? 10 : 18;
  const clipLeft = field.center
    ? field.x - field.width / 2 + clipPad
    : field.x - field.width + clipPad;
  textObj.clipPath = new fabric.Rect({
    left:              clipLeft,
    top:               field.y + topPad,
    width:             Math.max(40, field.width - clipPad * 2),
    height:            maxHeight,
    originX:           'left',
    originY:           'top',
    absolutePositioned: true
  });
}

function drawTextField(canvas, field, text, ts, borderRadius = 20, color = '#1f2937', fontFamily = DEFAULT_TEXT_FONT) {
  const originX      = field.center ? 'center' : 'right';
  const hPad         = field.center ? 0 : 18;
  const isParticipants = field.type === 'participants';

  const container = new fabric.Rect({
    left: field.x, top: field.y,
    width: field.width, height: field.height,
    rx: borderRadius, ry: borderRadius,
    fill: '#ffffff',
    stroke: isParticipants ? '#C4B0D8' : '#D5DDEA',
    strokeWidth: isParticipants ? 1 : 2,
    strokeDashArray: isParticipants ? [16, 8] : null,
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.16)', blur: 28, offsetX: 0, offsetY: 5 }),
    originX, originY: 'top', selectable: false, evented: false
  });
  container._phys2 = true;
  canvas.add(container);

  if (!field.noLabel && field.shortLabel) {
    const tFontSize = 46;
    const titleTop  = field.y + 12;
    const label = new fabric.Text(field.shortLabel, {
      originX, originY: 'top', textAlign: field.align, direction: 'rtl',
      fill: ts.color, fontFamily: ts.fontFamily, fontWeight: 700,
      fontSize: tFontSize, left: field.x - hPad, top: titleTop,
      selectable: false, evented: false
    });
    label._phys2 = true;
    canvas.add(label);
    canvas.bringToFront(label);
  }

  const topPad   = field.noLabel ? 20 : 80;
  const valueTop = field.y + topPad;
  const valueW   = field.center ? field.width - 20 : field.width - 36;

  const textObj = new fabric.Textbox(text || '', {
    originX, originY: 'top', textAlign: field.align, direction: 'rtl',
    fill: color, fontFamily, fontWeight: field.fontWeight || 400,
    fontSize: field.fontSize || 42, left: field.x - hPad, top: valueTop, width: valueW,
    selectable: false, evented: false, editable: false,
    splitByGrapheme: true, lineHeight: field.lineHeight || 1.3
  });

  fitText(textObj, field);

  if (field.verticalCenter) {
    textObj.initDimensions();
    const textH      = textObj.height;
    const centeredTop = field.y + Math.max(0, (field.height - textH) / 2);
    textObj.set({ top: centeredTop });
    if (textObj.clipPath) textObj.clipPath.set({ top: centeredTop, height: Math.max(40, textH + 10) });
  }

  textObj._phys2 = true;
  canvas.add(textObj);
  canvas.bringToFront(textObj);
}

function drawListField(canvas, field, values, ts, borderRadius = 14, color = '#1f2937', fontFamily = DEFAULT_TEXT_FONT) {
  const originX = field.center ? 'center' : 'right';
  const hPad    = field.center ? 0 : 18;

  if (!field.noLabel && field.shortLabel) {
    const tFontSize    = 46;
    const estimatedH   = Math.ceil(tFontSize * 1.3);
    const titleTop     = field.y - estimatedH - 6;
    const label = new fabric.Text(field.shortLabel, {
      originX, originY: 'top', textAlign: field.align, direction: 'rtl',
      fill: ts.color, fontFamily: ts.fontFamily, fontWeight: 700,
      fontSize: tFontSize, left: field.x - hPad, top: titleTop,
      selectable: false, evented: false
    });
    label._phys2 = true;
    canvas.add(label);
    canvas.bringToFront(label);
  }

  const titleSpacing = Math.min(field.titleSpacing || 80, 58);
  const bottomPad    = 12;
  const available    = field.height - titleSpacing - bottomPad;
  const subBoxH      = Math.floor((available - LIST_SUB_GAP * 2) / 3);
  const subTopPad    = 12;

  [1, 2, 3].forEach((num, idx) => {
    const rawItem  = (values[`${field.id}_${num}`] || '').trim();
    const itemText = `${num}. ${rawItem}`;
    const subY     = field.y + titleSpacing + idx * (subBoxH + LIST_SUB_GAP);

    const subBox = new fabric.Rect({
      left: field.x, top: subY, width: field.width, height: subBoxH,
      rx: borderRadius, ry: borderRadius, fill: '#ffffff',
      stroke: '#D5DDEA', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.12)', blur: 16, offsetX: 0, offsetY: 4 }),
      originX, originY: 'top', selectable: false, evented: false
    });
    subBox._phys2 = true;
    canvas.add(subBox);

    const subField  = { ...field, y: subY, height: subBoxH, noLabel: true };
    const subText   = new fabric.Textbox(itemText, {
      originX, originY: 'top', textAlign: field.align, direction: 'rtl',
      fill: color, fontFamily, fontWeight: 400, fontSize: field.fontSize || 42,
      left: field.x - hPad, top: subY + subTopPad,
      width: field.width - 36, selectable: false, evented: false, editable: false,
      splitByGrapheme: true, lineHeight: field.lineHeight || 1.25
    });
    fitText(subText, subField, subTopPad);
    subText._phys2 = true;
    canvas.add(subText);
    canvas.bringToFront(subText);
  });
}

function buildParticipantsText(v) {
  const names  = ['student1','student2','student3'].map(k => (v[k]||'').trim()).filter(Boolean);
  const cls    = (v.className  || '').trim();
  const school = (v.schoolName || '').trim();
  const line1  = names.length ? `שמות התלמידות: ${names.join(', ')}` : '';
  const line2  = [cls, school].filter(Boolean).join(' | ');
  return [line1, line2].filter(Boolean).join('\n');
}

function clearPhys2Fields(canvas) {
  canvas.getObjects().filter(o => o._phys2).forEach(o => canvas.remove(o));
}

function renderPhys2Poster(canvas, values, style = {}) {
  clearPhys2Fields(canvas);
  const titleStyle = {
    color: style.titleColor || DEFAULT_TITLE_COLOR,
    fontFamily: style.titleFont || DEFAULT_TEXT_FONT
  };
  canvas._titleStyle = titleStyle;
  const textColor = style.textColor || DEFAULT_TEXT_COLOR;
  const borderRadius = Number.isFinite(style.borderRadius) ? style.borderRadius : 20;

  PHYS2_FIELDS.forEach(field => {
    if (field.type === 'list') {
      drawListField(canvas, field, values, titleStyle, Math.max(8, borderRadius - 6), textColor, titleStyle.fontFamily);
    } else {
      const text = field.type === 'participants'
        ? buildParticipantsText(values)
        : (values[field.id] || '');
      drawTextField(canvas, field, text, titleStyle, borderRadius, textColor, titleStyle.fontFamily);
    }
  });

  // Bring labels over containers
  canvas.getObjects().filter(o => o._phys2 && o.type === 'text').forEach(o => canvas.bringToFront(o));
  canvas.requestRenderAll();
}

function exportPhys2PDF(canvas, values) {
  const { jsPDF } = window.jspdf;
  const W = 2480, H = 3508;

  const active = canvas.getActiveObject();
  if (active) canvas.discardActiveObject();

  // Save current display state
  const wrapEl    = canvas.wrapperEl;
  const prevStyle = wrapEl ? wrapEl.getAttribute('style') : null;
  const prevVP    = canvas.viewportTransform.slice();
  const prevW     = canvas.getWidth();
  const prevH     = canvas.getHeight();

  // Move wrapper off-screen so the canvas resize is invisible to the user
  if (wrapEl) {
    wrapEl.style.cssText =
      `position:fixed;top:-9999px;left:-9999px;` +
      `width:${W}px;height:${H}px;overflow:hidden;visibility:hidden;`;
  }

  // Resize to full poster resolution with zoom = 1
  canvas.setDimensions({ width: W, height: H });
  canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
  canvas.renderAll();

  // Capture at full resolution (logo drawn by after:render is included correctly)
  const dataUrl = canvas.lowerCanvasEl.toDataURL('image/png', 1);

  // Restore display state
  canvas.setDimensions({ width: prevW, height: prevH });
  canvas.viewportTransform = prevVP;
  if (wrapEl) {
    if (prevStyle !== null) wrapEl.setAttribute('style', prevStyle);
    else wrapEl.removeAttribute('style');
  }
  canvas.renderAll();

  // Build PDF
  const project = (values.projectName || '').trim().replace(/\s+/g, '-') || 'פוסטר';
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [W, H] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, W, H);
  pdf.save(`${project}.pdf`);
}

function loadPosterStylePrefs() {
  try {
    const raw = localStorage.getItem(POSTER_STYLE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (_) {
    return {};
  }
}

function savePosterStylePrefs(prefs) {
  try {
    localStorage.setItem(POSTER_STYLE_STORAGE_KEY, JSON.stringify(prefs));
  } catch (_) {
    // noop
  }
}

// ══════════════════════════════════════════════════════════════
// STATE INITIALIZATION
// ══════════════════════════════════════════════════════════════

const initResearch = () => ({
  projectName: '', description: '', problem: '', audience: '', researchQuestion: '',
  research_1: '', research_2: '', research_3: '',
  findings: '',
  requirements_1: '', requirements_2: '', requirements_3: '',
  solution: '',
  howItWorks_1: '', howItWorks_2: '', howItWorks_3: '',
  value: '',
  feedbackReceived: '', improvementsAfterFeedback: '',
  student1: '', student2: '', student3: '', className: '', schoolName: ''
});

const initHero = () => ({
  appearance: '', appearanceOther: '',
  focus: [], focusOther: '',
  material: '', materialOther: '',
  background: '', backgroundOther: '',
  style: [], styleOther: '',
  realism: '',
  description: '',
  colors: '',
  avoid: [], avoidOther: ''
});

const initUsage = () => ({
  userType: '', userTypeOther: '',
  peopleCount: '',
  location: '', locationOther: '',
  actionDescription: '',
  extraObjects: [], extraObjectsOther: '',
  focus: [], focusOther: '',
  viewerMessage: '',
  style: [], styleOther: '',
  realism: '',
  colors: '',
  avoid: [], avoidOther: ''
});

// ══════════════════════════════════════════════════════════════
// STEP 1 FIELD CONFIG
// ══════════════════════════════════════════════════════════════

const STEP1_FIELDS = [
  { id:'projectName',              label:'שם המיזם',                              hint:'כתבו את שם המיזם בשם קצר, ברור וזכיר.',                                                             maxChars:20,  required:true },
  { id:'description',              label:'תיאור קצר של המיזם',                    hint:'במשפט אחד הסבירו מהו המיזם ומה הרעיון המרכזי שלו.',                                               maxChars:75,  required:true },
  { id:'problem',                  label:'מה הבעיה שזיהיתן?',                     hint:'תארו בקצרה את הקושי, הצורך או המצב שהוביל אתכן לחפש פתרון.',                                     maxChars:130, required:true },
  { id:'audience',                 label:'על מי הבעיה משפיעה?',                   hint:'כתבו מי קהל היעד שסובל מהבעיה או מתמודד איתה ביומיום.',                                           maxChars:75,  required:true },
  { id:'researchQuestion',         label:'מה הייתה שאלת החקר הטכנולוגית?',        hint:'נסחו את שאלת החקר שהובילה את תהליך הבדיקה, ההשוואה או התכנון.',                                   maxChars:90,  required:true },
];

const STEP1_RESEARCH = [
  { id:'research_1', label:'1', maxChars:42, required:true },
  { id:'research_2', label:'2', maxChars:42, required:false },
  { id:'research_3', label:'3', maxChars:42, required:false },
];

const STEP1_MID = [
  { id:'findings',   label:'מה גיליתן בעקבות החקר?',           hint:'סכמו מה למדתן, מה הבנתן, ומה היה חשוב לכן לקחת מהבדיקה אל הפתרון.',   maxChars:110, required:true },
];

const STEP1_REQUIREMENTS = [
  { id:'requirements_1', label:'1', maxChars:42, required:true },
  { id:'requirements_2', label:'2', maxChars:42, required:false },
  { id:'requirements_3', label:'3', maxChars:42, required:false },
];

const STEP1_SOLUTION = [
  { id:'solution', label:'מהו המוצר הפיזי שפיתחתן?', hint:'תארו בקצרה מהו המוצר שפיתחתן, מה הוא עושה, ואיך הוא נותן מענה לבעיה.', maxChars:130, required:true },
];

const STEP1_HOWITWORKS = [
  { id:'howItWorks_1', label:'1', maxChars:42, required:true },
  { id:'howItWorks_2', label:'2', maxChars:42, required:false },
  { id:'howItWorks_3', label:'3', maxChars:42, required:false },
];

const STEP1_END = [
  { id:'value',                     label:'מה הערך המרכזי של הפתרון?',       hint:'כתבו מה התועלת המרכזית של הפתרון ולמה הוא משמעותי עבור המשתמשים.',      maxChars:110, required:true },
  { id:'feedbackReceived',          label:'איזה משוב קיבלתן?',               hint:'תארו את המשוב שקיבלתן מהמשתמשים או מהסביבה על המוצר.',                   maxChars:85,  required:true },
  { id:'improvementsAfterFeedback', label:'מה שיפרתן בעקבות המשוב?',         hint:'תארו מה שינִיתן או שיפרתן במוצר בעקבות המשוב שקיבלתן.',                  maxChars:85,  required:true },
];

// ══════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════

function isStep1Valid(ra) {
  const required = [
    'projectName','description','problem','audience','researchQuestion',
    'research_1','findings','requirements_1','solution','howItWorks_1',
    'value','feedbackReceived','improvementsAfterFeedback'
  ];
  return required.every(k => (ra[k] || '').trim().length > 0);
}

function isHeroValid(ha) {
  if (!ha.appearance) return false;
  if (ha.appearance === 'אחר' && !ha.appearanceOther.trim()) return false;
  if (ha.focus.length < 1) return false;
  if (ha.focus.includes('אחר') && !ha.focusOther.trim()) return false;
  if (!ha.material) return false;
  if ((ha.material === 'שילוב חומרים' || ha.material === 'אחר') && !ha.materialOther.trim()) return false;
  if (!ha.background) return false;
  if (ha.background === 'אחר' && !ha.backgroundOther.trim()) return false;
  if (ha.style.length < 1) return false;
  if (ha.style.includes('אחר') && !ha.styleOther.trim()) return false;
  if (!ha.realism) return false;
  if (!ha.description.trim()) return false;
  return true;
}

function isUsageValid(ua) {
  if (!ua.userType) return false;
  if (ua.userType === 'אחר' && !ua.userTypeOther.trim()) return false;
  if (!ua.peopleCount) return false;
  if (!ua.location) return false;
  if (ua.location === 'אחר' && !ua.locationOther.trim()) return false;
  if (!ua.actionDescription.trim()) return false;
  if (ua.focus.length < 1) return false;
  if (ua.focus.includes('אחר') && !ua.focusOther.trim()) return false;
  if (!ua.viewerMessage.trim()) return false;
  if (ua.style.length < 1) return false;
  if (ua.style.includes('אחר') && !ua.styleOther.trim()) return false;
  if (!ua.realism) return false;
  return true;
}

function isStep2Valid(hero, usage) { return isHeroValid(hero) && isUsageValid(usage); }

// ══════════════════════════════════════════════════════════════
// PROMPT BUILDING
// ══════════════════════════════════════════════════════════════

function resolveOther(val, otherVal) { return val === 'אחר' ? (otherVal || 'אחר') : val; }
function resolveMulti(arr, otherKey) { return arr.map(v => v === 'אחר' ? (otherKey || 'אחר') : v).filter(Boolean); }

function buildHeroPrompt(ra, ha) {
  const name    = ra.projectName || 'המיזם';
  const prob    = ra.problem || '';
  const aud     = ra.audience || '';
  const sol     = ra.solution || '';
  const reqs    = [ra.requirements_1, ra.requirements_2, ra.requirements_3].filter(Boolean).join(', ');
  const val     = ra.value || '';
  const appearance  = resolveOther(ha.appearance, ha.appearanceOther);
  const focus       = resolveMulti(ha.focus, ha.focusOther).join(', ');
  const material    = (ha.material === 'שילוב חומרים' || ha.material === 'אחר') && ha.materialOther
    ? `${ha.material} — ${ha.materialOther}` : ha.material;
  const background  = resolveOther(ha.background, ha.backgroundOther);
  const style       = resolveMulti(ha.style, ha.styleOther).join(', ');
  const avoid       = resolveMulti(ha.avoid, ha.avoidOther).join(', ');
  const L = [];
  L.push('צרי תמונת מוצר מקצועית ואסתטית באיכות גבוהה עבור פוסטר חקר תלמידות.');
  L.push('');
  L.push(`תמונה ראשית — הצגת המוצר הפיזי של מיזם "${name}".`);
  if (ra.description) L.push(`תיאור המיזם: ${ra.description}.`);
  if (prob) L.push(`הבעיה שנפתרת: ${prob}${aud ? ` (עבור ${aud})` : ''}.`);
  if (sol) L.push(`תיאור המוצר: ${sol}.`);
  if (reqs) L.push(`מה חשוב שהמוצר יכלול: ${reqs}.`);
  if (val) L.push(`הערך המרכזי: ${val}.`);
  L.push('');
  if (ha.description)  L.push(`• מה לראות בתמונה: ${ha.description}.`);
  if (appearance)      L.push(`• אופן הצגת המוצר: ${appearance}.`);
  if (focus)           L.push(`• מה חשוב שיבלוט: ${focus}.`);
  if (material)        L.push(`• חומר / מרקם: ${material}.`);
  if (background)      L.push(`• רקע: ${background}.`);
  if (style)           L.push(`• סגנון עיצובי: ${style}.`);
  if (ha.realism)      L.push(`• רמת ריאליזם: ${ha.realism}.`);
  if (ha.colors)       L.push(`• צבעים בולטים: ${ha.colors}.`);
  if (avoid)           L.push(`• ללא: ${avoid}.`);
  L.push('');
  L.push('מפרט טכני: יחס 25:21 (ריבועי), high quality, clean composition, realistic proportions, poster-ready, no text overlay, no watermark, no logo.');
  L.push('');
  L.push('תמונה נקייה, ברורה, אסתטית, חדה, מתאימה לשילוב בפוסטר, ללא טקסט בתמונה.');
  return L.join('\n');
}

function buildUsagePrompt(ra, ua) {
  const name        = ra.projectName || 'המיזם';
  const prob        = ra.problem || '';
  const aud         = ra.audience || '';
  const sol         = ra.solution || '';
  const uses        = [ra.howItWorks_1, ra.howItWorks_2, ra.howItWorks_3].filter(Boolean).join(' / ');
  const userType    = resolveOther(ua.userType, ua.userTypeOther);
  const location    = resolveOther(ua.location, ua.locationOther);
  const extraObjects = resolveMulti(ua.extraObjects, ua.extraObjectsOther).join(', ');
  const focus       = resolveMulti(ua.focus, ua.focusOther).join(', ');
  const style       = resolveMulti(ua.style, ua.styleOther).join(', ');
  const avoid       = resolveMulti(ua.avoid, ua.avoidOther).join(', ');
  const L = [];
  L.push('צרי תמונת שימוש ריאליסטית ואסתטית עבור פוסטר חקר תלמידות.');
  L.push('');
  L.push(`תמונת שימוש — המוצר הפיזי "${name}" בפעולה.`);
  if (prob) L.push(`הבעיה שנפתרת: ${prob}${aud ? ` (עבור ${aud})` : ''}.`);
  if (sol) L.push(`המוצר: ${sol}.`);
  if (uses) L.push(`איך משתמשים: ${uses}.`);
  L.push('');
  if (ua.actionDescription) L.push(`• הפעולה המוצגת: ${ua.actionDescription}.`);
  if (userType)              L.push(`• מי משתמש/ת: ${userType}.`);
  if (ua.peopleCount)        L.push(`• כמה אנשים: ${ua.peopleCount}.`);
  if (location)              L.push(`• מיקום: ${location}.`);
  if (extraObjects)          L.push(`• חפצים נוספים: ${extraObjects}.`);
  if (focus)                 L.push(`• מה צריך לבלוט: ${focus}.`);
  if (ua.viewerMessage)      L.push(`• מה חשוב שהצופה יבין: ${ua.viewerMessage}.`);
  if (style)                 L.push(`• סגנון עיצובי: ${style}.`);
  if (ua.realism)            L.push(`• רמת ריאליזם: ${ua.realism}.`);
  if (ua.colors)             L.push(`• צבעים בולטים: ${ua.colors}.`);
  if (avoid)                 L.push(`• ללא: ${avoid}.`);
  L.push('');
  L.push('מפרט טכני: יחס 25:21 (ריבועי), high quality, clean composition, realistic proportions, poster-ready, no text overlay, no watermark, no logo.');
  L.push('');
  L.push('תמונה אמינה, טבעית, ברורה, אסתטית, מתאימה לשילוב בפוסטר, ללא טקסט בתוך התמונה.');
  return L.join('\n');
}

// ══════════════════════════════════════════════════════════════
// SMALL REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════

function TextareaField({ id, label, hint, maxChars, required, value, onChange, touched }) {
  const len  = (value || '').length;
  const over = len > maxChars;
  const empty = required && touched && !value.trim();
  return h('div', { className:'pf-field-group' },
    h('label', { className:'pf-field-label', htmlFor:id },
      required && h('span', { className:'pf-req' }, '* '),
      label
    ),
    hint && h('p', { className:'pf-field-hint' }, hint),
    maxChars <= 80
      ? h('input', {
          id, type:'text', className:`pf-input${over||empty?' error':''}`,
          value: value||'', maxLength: maxChars,
          onChange: e => onChange(id, e.target.value.slice(0, maxChars)),
          dir:'rtl'
        })
      : h('textarea', {
          id, className:`pf-textarea${over||empty?' error':''}`,
          value: value||'', maxLength: maxChars,
          onChange: e => onChange(id, e.target.value.slice(0, maxChars)),
          dir:'rtl', rows: maxChars > 100 ? 4 : 3
        }),
    h('div', { className:'pf-field-meta' },
      empty ? h('span', { className:'pf-field-error' }, 'שדה חובה') : h('span', null),
      h('span', { className:`pf-counter${over?' warn':''}` }, `${len}/${maxChars}`)
    )
  );
}

function ListGroup({ groupLabel, rows, values, onChange, touched }) {
  return h('div', { className:'pf-field-group' },
    h('div', { className:'pf-list-group' },
      h('p', { className:'pf-list-group-title' }, groupLabel),
      rows.map(row =>
        h('div', { key:row.id, className:'pf-list-item' },
          h('div', { className:'pf-list-badge' }, row.label),
          h('div', { style:{ flex:1 } },
            h('input', {
              type:'text', className:`pf-input${touched && row.required && !(values[row.id]||'').trim()?' error':''}`,
              value: values[row.id]||'', maxLength: row.maxChars,
              placeholder: row.required ? 'חובה' : 'אופציונלי',
              onChange: e => onChange(row.id, e.target.value.slice(0, row.maxChars)),
              dir:'rtl'
            }),
            h('div', { className:'pf-field-meta' },
              h('span', null),
              h('span', { className:'pf-counter' }, `${(values[row.id]||'').length}/${row.maxChars}`)
            )
          )
        )
      )
    )
  );
}

// Single-select chip group (radio behaviour)
function RadioChips({ options, value, onChange, otherValue, onOtherChange }) {
  return h('div', null,
    h('div', { className:'pf-chip-grid' },
      options.map(opt => {
        const active = value === opt;
        return h('button', {
          key: opt, type:'button',
          className:`pf-chip${active?' active':''}`,
          onClick: () => onChange(active ? '' : opt)
        },
          h('span', { className:'pf-chip-check' }, active ? '✓' : ''),
          h('span', { className:'pf-chip-label' }, opt)
        );
      })
    ),
    value === 'אחר' && h('div', { className:'pf-other-input' },
      h('input', {
        type:'text', className:'pf-input', placeholder:'פרטי/י...',
        value: otherValue||'', onChange: e => onOtherChange(e.target.value),
        dir:'rtl'
      })
    )
  );
}

// Multi-select chip group with limit
function MultiChips({ options, values, max, onChange, otherValue, onOtherChange }) {
  const toggle = opt => {
    if (values.includes(opt)) {
      onChange(values.filter(v => v !== opt));
    } else if (values.length < max) {
      onChange([...values, opt]);
    }
  };
  return h('div', null,
    h('div', { className:'pf-chip-grid' },
      options.map(opt => {
        const active   = values.includes(opt);
        const disabled = !active && values.length >= max;
        return h('button', {
          key: opt, type:'button',
          className:`pf-chip${active?' active':''}${disabled?' disabled':''}`,
          onClick: () => !disabled && toggle(opt),
          disabled
        },
          h('span', { className:'pf-chip-check' }, active ? '✓' : ''),
          h('span', { className:'pf-chip-label' }, opt)
        );
      })
    ),
    values.includes('אחר') && h('div', { className:'pf-other-input' },
      h('input', {
        type:'text', className:'pf-input', placeholder:'פרטי/י...',
        value: otherValue||'', onChange: e => onOtherChange(e.target.value),
        dir:'rtl'
      })
    )
  );
}

function CardField({ label, required, multiHint, children }) {
  return h('div', { className:'pf-card-field' },
    h('div', { className:'pf-card-field-label' },
      required && h('span', { className:'pf-req' }, '* '),
      label
    ),
    multiHint && h('div', { className:'pf-multi-hint' }, multiHint),
    children
  );
}

// ══════════════════════════════════════════════════════════════
// STEP 1 — Research Questions
// ══════════════════════════════════════════════════════════════

function Step1({ ra, onChange, touched, setTouched }) {
  return h('div', null,
    h('h2', { className:'pf-section-title' }, 'שאלות חקר'),
    h('p', { className:'pf-section-sub' }, 'מלאי את כל השדות. כל מה שתכתבי כאן יופיע בפוסטר הסופי.'),

    STEP1_FIELDS.map(f =>
      h(TextareaField, { key:f.id, ...f, value:ra[f.id]||'', onChange, touched })
    ),

    h(ListGroup, {
      groupLabel:'איזה חקר ביצעתן?',
      rows: STEP1_RESEARCH, values:ra, onChange, touched
    }),

    STEP1_MID.map(f =>
      h(TextareaField, { key:f.id, ...f, value:ra[f.id]||'', onChange, touched })
    ),

    h(ListGroup, {
      groupLabel:'מה היה חשוב שהפתרון יכלול?',
      rows: STEP1_REQUIREMENTS, values:ra, onChange, touched
    }),

    STEP1_SOLUTION.map(f =>
      h(TextareaField, { key:f.id, ...f, value:ra[f.id]||'', onChange, touched })
    ),

    h(ListGroup, {
      groupLabel:'איך משתמשים במוצר?',
      rows: STEP1_HOWITWORKS, values:ra, onChange, touched
    }),

    STEP1_END.map(f =>
      h(TextareaField, { key:f.id, ...f, value:ra[f.id]||'', onChange, touched })
    ),

    h('hr', { className:'pf-sep' }),
    h('p', { style:{ fontWeight:700, color:'#5e2750', marginBottom:10 } }, 'פרטי המשתתפות (אופציונלי)'),
    h('div', { className:'pf-participants-grid' },
      h(TextareaField, { id:'student1', label:'שם תלמידה 1', maxChars:30, required:false, value:ra.student1||'', onChange, touched }),
      h(TextareaField, { id:'student2', label:'שם תלמידה 2', maxChars:30, required:false, value:ra.student2||'', onChange, touched }),
      h(TextareaField, { id:'student3', label:'שם תלמידה 3', maxChars:30, required:false, value:ra.student3||'', onChange, touched }),
      h(TextareaField, { id:'className', label:'כיתה', maxChars:20, required:false, value:ra.className||'', onChange, touched }),
      h(TextareaField, { id:'schoolName', label:'שם בית הספר', maxChars:40, required:false, value:ra.schoolName||'', onChange, touched })
    )
  );
}

// ══════════════════════════════════════════════════════════════
// STEP 2 — Prompt Questions
// ══════════════════════════════════════════════════════════════

function HeroCard({ hero, onChange, showErrors }) {
  const upd = (key, val) => onChange({ ...hero, [key]: val });
  return h('div', { className:'pf-card' },
    h('div', { className:'pf-card-header' },
      h('div', { className:'pf-card-icon' }, '🖼'),
      h('h3', { className:'pf-card-title' }, 'תמונה ראשית — הצגת המוצר')
    ),
    h('p', { className:'pf-card-sub' }, 'תמונה שמציגה את המוצר עצמו, בצורה ברורה ואסתטית.'),

    h(CardField, { label:'איך המוצר מופיע?', required:true },
      h(RadioChips, {
        options:['סגור','פתוח','פתוח חלקית','פריסה מלאה','מונח על משטח','מוחזק ביד','אחר'],
        value: hero.appearance, onChange: v => upd('appearance', v),
        otherValue: hero.appearanceOther, onOtherChange: v => upd('appearanceOther', v)
      }),
      showErrors && !hero.appearance && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'מה חשוב שיבלוט?', required:true, multiHint:'בחרי 1 עד 3' },
      h(MultiChips, {
        options:['המוצר כולו','הצורה הכללית','התאים הפנימיים','הרוכסן / הסגירה','הלולאה / הידית','החומר / המרקם','הצבעים','הפרטים הקטנים','אחר'],
        values: hero.focus, max:3, onChange: v => upd('focus', v),
        otherValue: hero.focusOther, onOtherChange: v => upd('focusOther', v)
      }),
      showErrors && hero.focus.length < 1 && h('div',{className:'pf-field-error'},'בחרי לפחות אחת')
    ),

    h(CardField, { label:'חומר / מרקם המוצר', required:true },
      h(RadioChips, {
        options:['בד / טקסטיל','פלסטיק','מתכת','עץ','סיליקון','קרטון','שילוב חומרים','אחר'],
        value: hero.material, onChange: v => upd('material', v),
        otherValue: hero.materialOther, onOtherChange: v => upd('materialOther', v)
      }),
      showErrors && !hero.material && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'רקע רצוי', required:true },
      h(RadioChips, {
        options:['לבן נקי','רקע בהיר ורך','סטודיו מקצועי','רקע טכנולוגי עדין','רקע ביתי עדין','שקוף / מנותק רקע','אחר'],
        value: hero.background, onChange: v => upd('background', v),
        otherValue: hero.backgroundOther, onOtherChange: v => upd('backgroundOther', v)
      }),
      showErrors && !hero.background && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'סגנון עיצובי', required:true, multiHint:'בחרי 1 או 2' },
      h(MultiChips, {
        options:['מודרני','מינימליסטי','אסתטי','צעיר','מקצועי','נקי','חם אנושי','טכנולוגי','אחר'],
        values: hero.style, max:2, onChange: v => upd('style', v),
        otherValue: hero.styleOther, onOtherChange: v => upd('styleOther', v)
      }),
      showErrors && hero.style.length < 1 && h('div',{className:'pf-field-error'},'בחרי לפחות אחד')
    ),

    h(CardField, { label:'רמת ריאליזם', required:true },
      h(RadioChips, {
        options:['פוטוריאליסטי','ריאליסטי','אילוסטרטיבי','הדמיית מוצר תלת־ממד','אחר'],
        value: hero.realism, onChange: v => upd('realism', v),
        otherValue: '', onOtherChange: ()=>{}
      }),
      showErrors && !hero.realism && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'מה צריך לראות בתמונה?', required:true },
      h('textarea', {
        className:`pf-textarea${showErrors && !hero.description.trim()?' error':''}`,
        value: hero.description, dir:'rtl', rows:3,
        placeholder:'תארי בחופשיות מה רואים בפועל בתמונה הראשית...',
        onChange: e => upd('description', e.target.value)
      }),
      showErrors && !hero.description.trim() && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'צבעים בולטים', required:false },
      h('input', {
        type:'text', className:'pf-input', dir:'rtl',
        placeholder:'לדוגמה: סגול, לבן, כסוף...',
        value: hero.colors, onChange: e => upd('colors', e.target.value)
      })
    ),

    h(CardField, { label:'מה לא לכלול', required:false, multiHint:'עד 4 בחירות' },
      h(MultiChips, {
        options:['אנשים','טקסט','רקע עמוס','צללים חזקים','לוגואים','מראה ילדותי','חפצים מיותרים','אחר'],
        values: hero.avoid, max:4, onChange: v => upd('avoid', v),
        otherValue: hero.avoidOther, onOtherChange: v => upd('avoidOther', v)
      })
    )
  );
}

function UsageCard({ usage, onChange, showErrors }) {
  const upd = (key, val) => onChange({ ...usage, [key]: val });
  return h('div', { className:'pf-card' },
    h('div', { className:'pf-card-header' },
      h('div', { className:'pf-card-icon' }, '👤'),
      h('h3', { className:'pf-card-title' }, 'תמונת שימוש — המוצר בפעולה')
    ),
    h('p', { className:'pf-card-sub' }, 'תמונה שמציגה את המוצר בסיטואציה אמיתית של שימוש.'),

    h(CardField, { label:'מי משתמש/ת במוצר?', required:true },
      h(RadioChips, {
        options:['ילדה','נערה','נער','מבוגר/ת','הורה','אדם עם מוגבלות','לא רואים פנים','אחר'],
        value: usage.userType, onChange: v => upd('userType', v),
        otherValue: usage.userTypeOther, onOtherChange: v => upd('userTypeOther', v)
      }),
      showErrors && !usage.userType && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'כמה אנשים בתמונה?', required:true },
      h(RadioChips, {
        options:['אדם אחד','שניים','שלושה ויותר','לא חייבים לראות אדם מלא','אחר'],
        value: usage.peopleCount, onChange: v => upd('peopleCount', v),
        otherValue:'', onOtherChange:()=>{}
      }),
      showErrors && !usage.peopleCount && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'איפה מתרחש השימוש?', required:true },
      h(RadioChips, {
        options:['בבית','בחדר','ליד תיק פתוח','בחוץ','ברחוב','במרחב לימודי','בסביבה ניטרלית','אחר'],
        value: usage.location, onChange: v => upd('location', v),
        otherValue: usage.locationOther, onOtherChange: v => upd('locationOther', v)
      }),
      showErrors && !usage.location && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'מה הפעולה המוצגת?', required:true },
      h('textarea', {
        className:`pf-textarea${showErrors && !usage.actionDescription.trim()?' error':''}`,
        value: usage.actionDescription, dir:'rtl', rows:3,
        placeholder:'תארי את הרגע שבתמונה — מה קורה בפועל...',
        onChange: e => upd('actionDescription', e.target.value)
      }),
      showErrors && !usage.actionDescription.trim() && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'אילו חפצים נוספים צריכים להופיע?', required:false, multiHint:'עד 5 בחירות' },
      h(MultiChips, {
        options:['אוזניות','מפתחות','ליפגלוס','מטען','כסף קטן','טלפון','מחברת קטנה','איפור קטן','אחר'],
        values: usage.extraObjects, max:5, onChange: v => upd('extraObjects', v),
        otherValue: usage.extraObjectsOther, onOtherChange: v => upd('extraObjectsOther', v)
      })
    ),

    h(CardField, { label:'מה צריך לבלוט?', required:true, multiHint:'1 עד 3 בחירות' },
      h(MultiChips, {
        options:['המוצר','הידיים','הסיטואציה','הסדר בתוך התיק','שליפה מהירה','תחושת נוחות','אחר'],
        values: usage.focus, max:3, onChange: v => upd('focus', v),
        otherValue: usage.focusOther, onOtherChange: v => upd('focusOther', v)
      }),
      showErrors && usage.focus.length < 1 && h('div',{className:'pf-field-error'},'בחרי לפחות אחת')
    ),

    h(CardField, { label:'מה חשוב שהצופה יבין?', required:true },
      h('textarea', {
        className:`pf-textarea${showErrors && !usage.viewerMessage.trim()?' error':''}`,
        value: usage.viewerMessage, dir:'rtl', rows:3,
        placeholder:'מה הצופה צריך להבין מהתמונה?',
        onChange: e => upd('viewerMessage', e.target.value)
      }),
      showErrors && !usage.viewerMessage.trim() && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'סגנון עיצובי', required:true, multiHint:'1 או 2 בחירות' },
      h(MultiChips, {
        options:['מודרני','חם אנושי','טבעי','צעיר','אסתטי','נקי','דינמי','מקצועי','אחר'],
        values: usage.style, max:2, onChange: v => upd('style', v),
        otherValue: usage.styleOther, onOtherChange: v => upd('styleOther', v)
      }),
      showErrors && usage.style.length < 1 && h('div',{className:'pf-field-error'},'בחרי לפחות אחד')
    ),

    h(CardField, { label:'רמת ריאליזם', required:true },
      h(RadioChips, {
        options:['פוטוריאליסטי','ריאליסטי','אילוסטרטיבי','הדמיה','אחר'],
        value: usage.realism, onChange: v => upd('realism', v),
        otherValue:'', onOtherChange:()=>{}
      }),
      showErrors && !usage.realism && h('div',{className:'pf-field-error'},'שדה חובה')
    ),

    h(CardField, { label:'צבעים בולטים', required:false },
      h('input', {
        type:'text', className:'pf-input', dir:'rtl',
        placeholder:'לדוגמה: כחול, זהב...',
        value: usage.colors, onChange: e => upd('colors', e.target.value)
      })
    ),

    h(CardField, { label:'מה לא לכלול', required:false, multiHint:'עד 4 בחירות' },
      h(MultiChips, {
        options:['פנים מטושטשות','עומס','יותר מדי חפצים','טקסטים','רקע עמוס','מראה מבוים מדי','אחר'],
        values: usage.avoid, max:4, onChange: v => upd('avoid', v),
        otherValue: usage.avoidOther, onOtherChange: v => upd('avoidOther', v)
      })
    )
  );
}

function Step2({ hero, usage, onHeroChange, onUsageChange, showErrors }) {
  return h('div', null,
    h('h2', { className:'pf-section-title' }, 'שאלות פרומפט'),
    h('p', { className:'pf-section-sub' }, 'בחרי העדפות ויזואליות לכל תמונה. המידע שמילאת בשלב 1 ישולב אוטומטית.'),
    showErrors && h('div', { className:'pf-error-banner' }, '⚠ יש למלא את כל שדות החובה בשני הכרטיסים לפני המשך.'),
    h(HeroCard,  { hero,  onChange: onHeroChange,  showErrors }),
    h(UsageCard, { usage, onChange: onUsageChange, showErrors })
  );
}

// ══════════════════════════════════════════════════════════════
// STEP 3 — Prompts
// ══════════════════════════════════════════════════════════════

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return h('button', { type:'button', className:`pf-copy-btn${copied?' copied':''}`, onClick },
    copied ? '✓ הועתק!' : 'העתק פרומפט'
  );
}

function Step3({ heroPrompt, usagePrompt }) {
  const both = heroPrompt + '\n\n' + '─'.repeat(60) + '\n\n' + usagePrompt;
  const [copiedBoth, setCopiedBoth] = useState(false);

  return h('div', null,
    h('h2', { className:'pf-section-title' }, 'הפרומפטים מוכנים'),
    h('p', { className:'pf-section-sub' }, 'העתיקי כל פרומפט ל-Midjourney, DALL·E, או כל כלי יצירת תמונות. לאחר שיצרת את התמונות, המשיכי לשלב הפוסטר.'),

    h('div', { className:'pf-prompt-block' },
      h('div', { className:'pf-prompt-header' },
        h('span', { className:'pf-prompt-title' }, 'פרומפט לתמונה ראשית'),
        h(CopyButton, { text: heroPrompt })
      ),
      h('textarea', { className:'pf-prompt-text', value:heroPrompt, readOnly:true, rows:14 })
    ),

    h('div', { className:'pf-prompt-block' },
      h('div', { className:'pf-prompt-header' },
        h('span', { className:'pf-prompt-title' }, 'פרומפט לתמונת שימוש'),
        h(CopyButton, { text: usagePrompt })
      ),
      h('textarea', { className:'pf-prompt-text', value:usagePrompt, readOnly:true, rows:14 })
    ),

    h('div', { className:'pf-copy-all' },
      h('button', {
        type:'button',
        className:`pf-btn pf-btn-secondary${copiedBoth?' copied':''}`,
        onClick: () => {
          navigator.clipboard.writeText(both).then(() => {
            setCopiedBoth(true);
            setTimeout(() => setCopiedBoth(false), 2000);
          });
        }
      }, copiedBoth ? '✓ שני הפרומפטים הועתקו!' : 'העתיקי את שני הפרומפטים')
    )
  );
}

// ══════════════════════════════════════════════════════════════
// STEP 4 — Poster Builder
// ══════════════════════════════════════════════════════════════

const BACKGROUNDS_LIST = Array.from({ length: 11 }, (_, i) => ({
  id: `bg-tech${i+1}`,
  path: `/poster-builder/assets/backgrounds/bg-tech${i+1}.png`
}));

function Step4({ ra }) {
  const stylePrefs = loadPosterStylePrefs();
  const canvasRef  = useRef(null);
  const fabricRef  = useRef(null);
  const [bg, setBg]         = useState(stylePrefs.bg || null);
  const [slot1, setSlot1]   = useState(null);
  const [slot2, setSlot2]   = useState(null);
  const [titleFont, setTitleFont] = useState(stylePrefs.titleFont || DEFAULT_TEXT_FONT);
  const [titleColor, setTitleColor] = useState(stylePrefs.titleColor || DEFAULT_TITLE_COLOR);
  const [textColor, setTextColor] = useState(stylePrefs.textColor || DEFAULT_TEXT_COLOR);
  const [boxRadius, setBoxRadius] = useState(Number.isFinite(stylePrefs.boxRadius) ? stylePrefs.boxRadius : 20);
  const [ready, setReady]   = useState(false);
  const slot1Ref = useRef(null);
  const slot2Ref = useRef(null);

  // Initialize canvas once
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    registerFonts().then(() => {
      const canvas = createEditor(canvasRef.current, 'A4');
      canvas._productType = 'physical';
      fabricRef.current   = canvas;
      renderPhys2Poster(canvas, ra, { titleFont, titleColor, textColor, borderRadius: boxRadius });
      applyVisualSlots(canvas, 'A4', 'physical', {});
      applyBackground(canvas, bg);
      setReady(true);
    });

    return () => {
      if (fabricRef.current) {
        try { fabricRef.current.dispose(); } catch(e) {}
        fabricRef.current = null;
      }
    };
  }, []);

  // Re-render poster when research answers change (fields from step 1)
  useEffect(() => {
    if (!fabricRef.current || !ready) return;
    renderPhys2Poster(fabricRef.current, ra, { titleFont, titleColor, textColor, borderRadius: boxRadius });
    applyVisualSlots(fabricRef.current, 'A4', 'physical', {
      visual_1: slot1,
      visual_2: slot2
    });
    applyBackground(fabricRef.current, bg);
  }, [ra, ready, slot1, slot2, bg, titleFont, titleColor, textColor, boxRadius]);

  useEffect(() => {
    savePosterStylePrefs({ bg, titleFont, titleColor, textColor, boxRadius });
  }, [bg, titleFont, titleColor, textColor, boxRadius]);

  const handleBg = useCallback((path) => {
    const newBg = path === bg ? null : path;
    setBg(newBg);
    if (fabricRef.current) applyBackground(fabricRef.current, newBg);
  }, [bg]);

  const handleSlotUpload = useCallback((slotKey, file, setSlot) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      setSlot(dataUrl);
      if (fabricRef.current) applyZoneImage(fabricRef.current, slotKey, dataUrl, 'A4', 'physical');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleExport = useCallback(() => {
    if (fabricRef.current) exportPhys2PDF(fabricRef.current, ra);
  }, [ra]);

  return h('div', null,
    h('h2', { className:'pf-section-title' }, 'בניית הפוסטר'),
    h('p', { className:'pf-section-sub' }, 'כל התשובות מולאו אוטומטית. העלי תמונות, בחרי רקע, וייצאי לPDF.'),

    h('div', { className:'pf-poster-layout' },

      // Sidebar
      h('div', { className:'pf-poster-sidebar' },

        // Background picker
        h('div', { className:'pf-sidebar-panel' },
          h('p', { className:'pf-sidebar-panel-title' }, 'רקע'),
          h('div', { className:'pf-bg-grid' },
            h('div', {
              className:`pf-bg-none${!bg?' active':''}`,
              onClick: () => handleBg(null)
            }, 'ללא'),
            BACKGROUNDS_LIST.map(b =>
              h('img', {
                key: b.id, src: b.path,
                className:`pf-bg-thumb${bg===b.path?' active':''}`,
                onClick: () => handleBg(b.path),
                alt: b.id
              })
            )
          )
        ),

        h('div', { className:'pf-sidebar-panel' },
          h('p', { className:'pf-sidebar-panel-title' }, 'פונט'),
          h('div', { className:'pf-chip-grid' },
            STYLE_FONTS.map(font =>
              h('button', {
                key: font,
                type: 'button',
                className: `pf-chip${titleFont === font ? ' active' : ''}`,
                onClick: () => setTitleFont(font),
                style: { fontFamily: font }
              },
              h('span', { className:'pf-chip-label' }, font))
            )
          )
        ),

        h('div', { className:'pf-sidebar-panel' },
          h('p', { className:'pf-sidebar-panel-title' }, 'צבעים'),
          h('div', { className:'pf-chip-grid' },
            PRESET_COLORS.map(color =>
              h('button', {
                key: `title-${color}`,
                type: 'button',
                className: `pf-chip${titleColor === color ? ' active' : ''}`,
                onClick: () => setTitleColor(color)
              },
              h('span', { className:'pf-chip-label' }, 'כותרת'),
              h('span', { style: { width: 18, height: 18, borderRadius: '50%', background: color, border: '1px solid #cbd5e1' } }))
            ),
            h('label', { className:'pf-chip', style: { gap: 8 } },
              h('span', { className:'pf-chip-label' }, 'מותאם'),
              h('input', { type:'color', value:titleColor, onInput: e => setTitleColor(e.target.value) })
            )
          ),
          h('div', { className:'pf-chip-grid', style: { marginTop: 8 } },
            PRESET_COLORS.map(color =>
              h('button', {
                key: `text-${color}`,
                type: 'button',
                className: `pf-chip${textColor === color ? ' active' : ''}`,
                onClick: () => setTextColor(color)
              },
              h('span', { className:'pf-chip-label' }, 'טקסט'),
              h('span', { style: { width: 18, height: 18, borderRadius: '50%', background: color, border: '1px solid #cbd5e1' } }))
            )
          )
        ),

        h('div', { className:'pf-sidebar-panel' },
          h('p', { className:'pf-sidebar-panel-title' }, 'עיצוב תיבות'),
          h('div', { className:'pf-chip-grid' },
            STYLE_SHAPES.map(shape =>
              h('button', {
                key: shape.value,
                type: 'button',
                className: `pf-chip${boxRadius === shape.value ? ' active' : ''}`,
                onClick: () => setBoxRadius(shape.value)
              },
              h('span', { className:'pf-chip-label' }, shape.label))
            )
          )
        ),

        // Image slots
        h('div', { className:'pf-sidebar-panel' },
          h('p', { className:'pf-sidebar-panel-title' }, 'תמונות'),

          h('div', { className:'pf-slot-upload' },
            h('div', { className:'pf-slot-label' }, 'תמונה ראשית'),
            h('input', {
              type:'file', accept:'image/*', className:'pf-upload-input',
              ref: slot1Ref,
              onChange: e => handleSlotUpload('visual_1', e.target.files[0], setSlot1)
            }),
            h('button', {
              type:'button', className:'pf-upload-btn',
              onClick: () => slot1Ref.current && slot1Ref.current.click()
            }, '+ העלי תמונה ראשית'),
            slot1 && h('img', { src:slot1, className:'pf-slot-preview', alt:'תמונה ראשית' })
          ),

          h('div', { className:'pf-slot-upload' },
            h('div', { className:'pf-slot-label' }, 'תמונת שימוש'),
            h('input', {
              type:'file', accept:'image/*', className:'pf-upload-input',
              ref: slot2Ref,
              onChange: e => handleSlotUpload('visual_2', e.target.files[0], setSlot2)
            }),
            h('button', {
              type:'button', className:'pf-upload-btn',
              onClick: () => slot2Ref.current && slot2Ref.current.click()
            }, '+ העלי תמונת שימוש'),
            slot2 && h('img', { src:slot2, className:'pf-slot-preview', alt:'תמונת שימוש' })
          )
        ),

        // Export
        h('div', { className:'pf-sidebar-panel' },
          h('button', { type:'button', className:'pf-export-btn', onClick:handleExport }, 'ייצוא PDF')
        )
      ),

      // Canvas area
      h('div', { className:'pf-canvas-wrap' },
        h('canvas', { ref:canvasRef })
      )
    )
  );
}

// ══════════════════════════════════════════════════════════════
// STEPPER
// ══════════════════════════════════════════════════════════════

const STEPS = [
  { id:1, label:'שאלות חקר' },
  { id:2, label:'שאלות פרומפט' },
  { id:3, label:'תמונות' },
  { id:4, label:'פוסטר' }
];

function Stepper({ current, completedUpTo, onGoTo }) {
  return h('div', { className:'pf-stepper' },
    STEPS.map((s, i) => {
      const status = s.id === current ? 'active' : s.id <= completedUpTo ? 'completed' : 'locked';
      const canClick = s.id <= completedUpTo + 1;
      return h('div', { key:s.id, className:'pf-step-item' },
        i > 0 && h('div', { className:`pf-step-connector${s.id <= completedUpTo?' done':''}` }),
        h('button', {
          type:'button',
          className:`pf-step-btn ${status}`,
          onClick: () => canClick && status !== 'locked' && onGoTo(s.id),
          disabled: status === 'locked'
        },
          h('span', { className:'pf-step-num' }, status === 'completed' ? '✓' : s.id),
          h('span', null, s.label)
        )
      );
    })
  );
}

// ══════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════

function App() {
  const [step,    setStep]    = useState(1);
  const [highest, setHighest] = useState(0);    // highest step reached (0 = none completed)
  const [ra,      setRa]      = useState(initResearch);
  const [hero,    setHero]    = useState(initHero);
  const [usage,   setUsage]   = useState(initUsage);
  const [heroPrompt,  setHeroPrompt]  = useState('');
  const [usagePrompt, setUsagePrompt] = useState('');
  const [touched, setTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const handleRaChange = useCallback((id, val) => {
    setRa(prev => ({ ...prev, [id]: val }));
  }, []);

  const goTo = useCallback(targetStep => {
    setTouched(false);
    setShowErrors(false);
    setStep(targetStep);
  }, []);

  const handleNext = () => {
    if (step === 1) {
      if (!isStep1Valid(ra)) { setTouched(true); return; }
      setHighest(prev => Math.max(prev, 1));
      goTo(2);
    } else if (step === 2) {
      if (!isStep2Valid(hero, usage)) { setShowErrors(true); return; }
      const hp = buildHeroPrompt(ra, hero);
      const up = buildUsagePrompt(ra, usage);
      setHeroPrompt(hp);
      setUsagePrompt(up);
      setHighest(prev => Math.max(prev, 2));
      goTo(3);
    } else if (step === 3) {
      setHighest(prev => Math.max(prev, 3));
      goTo(4);
    }
  };

  const handleBack = () => {
    if (step > 1) goTo(step - 1);
  };

  const step1Valid = isStep1Valid(ra);
  const step2Valid = isStep2Valid(hero, usage);

  const nextDisabled = (step === 1 && !step1Valid) || (step === 2 && !step2Valid);

  return h('div', { className:'pf-page' },
    h('div', { className:'pf-header' },
      h('div', null,
        h('h1', null, 'מוצר פיזי'),
        h('div', { className:'pf-header-sub' }, 'בונות פוסטר | פורצות דרך')
      )
    ),

    h(Stepper, { current:step, completedUpTo:highest, onGoTo:goTo }),

    h('div', { className:'pf-content' },
      step === 1 && h(Step1, {
        ra, onChange:handleRaChange, touched, setTouched
      }),

      step === 2 && h(Step2, {
        hero, usage,
        onHeroChange:  setHero,
        onUsageChange: setUsage,
        showErrors
      }),

      step === 3 && h(Step3, { heroPrompt, usagePrompt }),

      step === 4 && h(Step4, { ra }),

      // Navigation
      h('div', { className:'pf-nav' },
        step > 1
          ? h('button', { type:'button', className:'pf-btn pf-btn-ghost', onClick:handleBack }, '→ חזרה')
          : h('div'),

        step < 4 && h('button', {
          type:'button',
          className:'pf-btn pf-btn-primary',
          onClick: handleNext,
          disabled: nextDisabled
        }, step === 3 ? 'בניית פוסטר ←' : 'הבא ←')
      )
    )
  );
}

// Mount
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(h(App));
