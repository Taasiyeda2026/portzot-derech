import { POSTER_ADMIN_CODE } from '../shared/supabase-config.js';
import { saveProject } from '../shared/storage.js';
import { BACKGROUNDS, DEFAULT_FIELD_COLOR, DEFAULT_FIELD_FONT, FIELD_DEFINITIONS, POSTER_SIZES } from '../products/physical/config.js';
import { createPosterSubmissions, deletePosterSubmission, fetchPosterSubmission, listPosterSubmissions, normalizePosterData } from '../shared/poster-submissions.js';
import { buildUniqueSchoolSlug, createPosterSchool, deletePosterSchool, DEFAULT_SCHOOL_QUESTIONS, getStudentLink, listPosterSchools, updatePosterSchool } from '../shared/poster-schools.js';

const root = document.getElementById('admin-root');
const SESSION_KEY = 'poster-builder-admin-ok';
const PRODUCT_PATHS = {
  physical: './product/physical.html',
  website: './product/website.html',
  app: './product/app.html',
  digital: './product/digital.html'
};

const TEMPLATE_FILE_NAME = 'poster-import-template.xlsx';
const TEMPLATE_HEADERS = [
  'productType',
  'backgroundId',
  'titleFont',
  'titleColor',
  'textColor',
  'projectName',
  'description',
  'student1',
  'student2',
  'student3',
  'className',
  'schoolName',
  'problem',
  'audience',
  'researchQuestion',
  'research_1',
  'research_2',
  'research_3',
  'findings',
  'requirements_1',
  'requirements_2',
  'requirements_3',
  'solution',
  'howItWorks_1',
  'howItWorks_2',
  'howItWorks_3',
  'value',
  'feedbackReceived',
  'improvementsAfterFeedback',
  'slogan'
];
const CONTENT_HEADERS = TEMPLATE_HEADERS.slice(5);
const PRODUCT_TYPE_OPTIONS = ['physical', 'website', 'app', 'digital'];
const BACKGROUND_ID_OPTIONS = BACKGROUNDS.map((background) => background.id);
const FONT_OPTIONS = ['IBM Plex Sans Hebrew', 'Gveret Levin', 'Alef', 'Alice', 'Choco', 'Yehuda'];
const TITLE_COLOR_OPTIONS = ['#5E2750', '#1a3a6b', '#1a5c3a', '#7a1a1a', '#b5520a', '#1a4a5c', '#2d2d2d'];
const TEXT_COLOR_OPTIONS = ['#1f1030', '#000000', '#1a1a2e', '#1a3a1a', '#2e1a00', '#2a2a2a', '#3a1a3a'];
const DEFAULT_SLOT_IMAGES = { visual: null, visual_1: null, visual_2: null, visual_3: null };
const DEFAULT_FIELD_SETTINGS = Object.fromEntries(
  FIELD_DEFINITIONS.map((field) => [field.id, { fontFamily: DEFAULT_FIELD_FONT, color: DEFAULT_FIELD_COLOR, borderRadius: 20 }])
);
const DROPDOWN_COLUMNS = {
  productType: PRODUCT_TYPE_OPTIONS,
  backgroundId: BACKGROUND_ID_OPTIONS,
  titleFont: FONT_OPTIONS,
  titleColor: TITLE_COLOR_OPTIONS,
  textColor: TEXT_COLOR_OPTIONS
};

const state = {
  authed: sessionStorage.getItem(SESSION_KEY) === '1',
  rows: [],
  schools: [],
  activeTab: 'posters',
  editingSchoolId: null,
  schoolForm: null,
  loading: false,
  schoolsLoading: false,
  message: '',
  messageType: 'error',
  manualOpenUrl: '',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function productLabel(type) {
  return ({ physical: 'מוצר פיזי', website: 'אתר', app: 'אפליקציה', digital: 'מוצר דיגיטלי' })[type] || type || '';
}


function getCellValue(row, key) {
  const value = row[key];
  return value === null || value === undefined ? '' : String(value).trim();
}

function isBlankImportRow(row) {
  return !CONTENT_HEADERS.some((header) => getCellValue(row, header));
}

function getValidOption(row, key, options, fallback) {
  const value = getCellValue(row, key);
  if (!value) return fallback;
  return options.includes(value) ? value : null;
}

function buildSplitFlowState(productType, contentValues, design, step = null) {
  const studentNames = [contentValues.student1, contentValues.student2, contentValues.student3]
    .map((value) => (value || '').trim())
    .filter(Boolean)
    .join(', ');

  return {
    productType,
    step: step || (productType === 'physical' ? 3 : 4),
    research: {
      ...contentValues,
      studentNames
    },
    design: { ...design }
  };
}

function buildImportProject(row, schoolSlug) {
  if (isBlankImportRow(row)) return null;

  const productType = getValidOption(row, 'productType', PRODUCT_TYPE_OPTIONS, 'physical');
  const backgroundId = getValidOption(row, 'backgroundId', BACKGROUND_ID_OPTIONS, 'bg-tech1');
  const titleFont = getValidOption(row, 'titleFont', FONT_OPTIONS, 'IBM Plex Sans Hebrew');
  const titleColor = getValidOption(row, 'titleColor', TITLE_COLOR_OPTIONS, '#5E2750');
  const textColor = getValidOption(row, 'textColor', TEXT_COLOR_OPTIONS, '#1f1030');
  if (!productType || !backgroundId || !titleFont || !titleColor || !textColor) return null;

  const background = BACKGROUNDS.find((item) => item.id === backgroundId) || BACKGROUNDS[0];
  const contentValues = Object.fromEntries(CONTENT_HEADERS.map((header) => [header, getCellValue(row, header)]));
  const design = { background: background.path, titleFont, titleColor, textColor, shape: 20 };

  return {
    posterSize: 'A4',
    productType,
    school_slug: schoolSlug || 'default',
    background: background.path,
    backgroundId: background.id,
    backgroundPath: background.path,
    contentValues,
    fieldSettings: DEFAULT_FIELD_SETTINGS,
    titleStyle: {
      fontFamily: titleFont,
      color: titleColor,
      textColor
    },
    slotImages: { ...DEFAULT_SLOT_IMAGES },
    splitFlowState: buildSplitFlowState(productType, contentValues, design)
  };
}

async function downloadTemplate() {
  if (!window.ExcelJS) {
    showMessage('לא הצלחנו להכין את התבנית כרגע. נסו שוב.');
    return;
  }

  const workbook = new window.ExcelJS.Workbook();
  workbook.creator = 'פורצות דרך';
  const worksheet = workbook.addWorksheet('posters');
  worksheet.addRow(TEMPLATE_HEADERS);
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns = TEMPLATE_HEADERS.map((header) => ({
    key: header,
    width: Math.max(14, Math.min(34, header.length + 4))
  }));

  TEMPLATE_HEADERS.forEach((header, index) => {
    const cell = worksheet.getCell(1, index + 1);
    cell.note = header in DROPDOWN_COLUMNS ? 'יש לבחור ערך מהרשימה.' : 'מלאו טקסט חופשי לפי הצורך.';
    const options = DROPDOWN_COLUMNS[header];
    if (!options) return;
    for (let rowNumber = 2; rowNumber <= 250; rowNumber += 1) {
      worksheet.getCell(rowNumber, index + 1).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${options.join(',')}"`]
      };
    }
  });

  const instructions = workbook.addWorksheet('הנחיות');
  instructions.addRows([
    ['כל שורה בגיליון posters מייצגת פוסטר אחד.'],
    ['אפשר להשאיר עמודות עיצוב ריקות ולקבל ברירות מחדל.'],
    ['אין צורך להוסיף תמונות לקובץ בשלב זה.']
  ]);
  instructions.getColumn(1).width = 72;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = TEMPLATE_FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function downloadSchoolTemplate(school) {
  if (!window.ExcelJS) {
    showMessage('לא הצלחנו להכין את התבנית כרגע. נסו שוב.');
    return;
  }

  const rawQuestions = (Array.isArray(school.questions_config) && school.questions_config.length)
    ? school.questions_config
    : DEFAULT_SCHOOL_QUESTIONS.map(([id, label, maxChars]) => ({ id, label, maxChars }));

  const designHeaders = ['productType', 'backgroundId', 'titleFont', 'titleColor', 'textColor'];
  const designLabels  = ['סוג מוצר', 'רקע', 'פונט כותרת', 'צבע כותרת', 'צבע טקסט'];
  const contentFieldIds = rawQuestions.map((q) => q.id || q[0]);
  const contentLabels   = rawQuestions.map((q) => q.label || q[1]);

  const allHeaders = [...designHeaders, ...contentFieldIds];
  const allLabels  = [...designLabels,  ...contentLabels];

  const allowedBgIds = (school.background_ids && school.background_ids.length)
    ? school.background_ids
    : BACKGROUND_ID_OPTIONS;

  const schoolDropdowns = {
    productType:  PRODUCT_TYPE_OPTIONS,
    backgroundId: allowedBgIds,
    titleFont:    FONT_OPTIONS,
    titleColor:   TITLE_COLOR_OPTIONS,
    textColor:    TEXT_COLOR_OPTIONS
  };

  const workbook = new window.ExcelJS.Workbook();
  workbook.creator = 'פורצות דרך';
  const worksheet = workbook.addWorksheet('posters');
  worksheet.addRow(allHeaders);
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns = allHeaders.map((header, i) => ({
    key: header,
    width: Math.max(14, Math.min(40, (allLabels[i] || header).length + 4))
  }));

  allHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(1, index + 1);
    const hebrewLabel = allLabels[index] || header;
    const isDropdown = header in schoolDropdowns;
    cell.note = `${hebrewLabel}\n${isDropdown ? 'יש לבחור ערך מהרשימה.' : 'מלאו טקסט חופשי לפי הצורך.'}`;
    const options = schoolDropdowns[header];
    if (!options) return;
    for (let rowNumber = 2; rowNumber <= 250; rowNumber += 1) {
      worksheet.getCell(rowNumber, index + 1).dataValidation = {
        type: 'list', allowBlank: true, formulae: [`"${options.join(',')}"`]
      };
    }
  });

  const instructions = workbook.addWorksheet('הנחיות');
  instructions.addRows([
    [`תבנית Excel לבית הספר: ${school.school_name || ''}`],
    ['כל שורה מייצגת פוסטר אחד.'],
    ['אפשר להשאיר עמודות עיצוב ריקות ולקבל ברירות מחדל.'],
    ['אם עדכנת שאלות לבית הספר, יש להוריד תבנית Excel חדשה לפני מילוי נתונים.']
  ]);
  instructions.getColumn(1).width = 72;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `poster-template-${school.school_slug || 'school'}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function importExcelFile(file, schoolSlug) {
  if (!file) return;
  if (!window.XLSX) {
    showMessage('לא הצלחנו לקרוא את הקובץ כרגע. נסו שוב.');
    return;
  }

  state.message = 'מייבא פוסטרים...';
  state.messageType = 'ok';
  render();

  try {
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = window.XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
    let skipped = 0;
    const projects = [];

    rows.forEach((row) => {
      const project = buildImportProject(row, schoolSlug || 'default');
      if (project) projects.push(project);
      else if (!isBlankImportRow(row)) skipped += 1;
    });

    if (projects.length) await createPosterSubmissions(projects);
    const resultMessage = `יובאו ${projects.length} פוסטרים בהצלחה.${skipped > 0 ? ` ${skipped} שורות לא יובאו בגלל נתונים חסרים או לא תקינים.` : ''}`;
    const resultType = skipped > 0 ? 'warning' : 'ok';
    await loadRows();
    state.message = resultMessage;
    state.messageType = resultType;
    render();
  } catch (err) {
    showMessage('לא הצלחנו לייבא את הקובץ. בדקו שהוא קובץ Excel תקין.');
  }
}

function showMessage(text, type = 'error') {
  state.message = text;
  state.messageType = type;
  state.manualOpenUrl = '';
  render();
}

async function loadRows(options = {}) {
  state.loading = true;
  if (!options.keepMessage) {
    state.message = '';
    state.manualOpenUrl = '';
  }
  render();
  try {
    state.rows = await listPosterSubmissions();
  } catch (err) {
    state.message = 'לא הצלחנו לטעון את הפוסטרים כרגע.';
    state.messageType = 'error';
  }
  state.loading = false;
  render();
}

function renderLogin() {
  root.innerHTML = `<section class="admin-login admin-card">
    <div>
      <h1 class="admin-title">כניסת מנהל</h1>
      <p class="admin-subtitle">הכניסו קוד מנהל כדי לצפות בפוסטרים שנשלחו.</p>
    </div>
    <label>קוד מנהל
      <input class="admin-input" type="password" data-admin-code autocomplete="current-password" />
    </label>
    <div class="admin-actions">
      <button class="admin-btn primary" type="button" data-login>כניסה</button>
      <a class="admin-back" href="./index.html">חזרה</a>
    </div>
    ${state.message ? `<p class="admin-message ${state.messageType}">${escapeHtml(state.message)}</p>` : ''}
  </section>`;

  const input = root.querySelector('[data-admin-code]');
  const login = () => {
    if (input.value === POSTER_ADMIN_CODE) {
      sessionStorage.setItem(SESSION_KEY, '1');
      state.authed = true;
      state.message = '';
      state.manualOpenUrl = '';
      loadRows();
      return;
    }
    showMessage('קוד מנהל שגוי.');
  };
  root.querySelector('[data-login]').addEventListener('click', login);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  input.focus();
}

function getAdminStartStep(productType) {
  return productType === 'physical' ? 2 : 3;
}

function buildPosterOpenUrl(productType, schoolSlug) {
  const url = PRODUCT_PATHS[productType] || PRODUCT_PATHS.physical;
  try {
    const adminParams = new URLSearchParams(window.location.search);
    const queryParams = new URLSearchParams();
    if (schoolSlug && schoolSlug !== 'default') queryParams.set('school', schoolSlug);
    if (adminParams.get('debugPdfPng') === '1') queryParams.set('debugPdfPng', '1');
    const query = queryParams.toString();
    return query ? `${url}?${query}` : url;
  } catch {
    return url;
  }
}

function navigateWithProject(posterData, productType, splitFlowState, submissionId, schoolSlug) {
  const projectData = { ...(posterData || {}) };
  delete projectData.schoolLogoImage;
  delete projectData.schoolLogoAssetId;
  saveProject({
    ...projectData,
    productType,
    splitFlowState,
    submissionId,
    school_slug: schoolSlug || 'default'
  });
  const url = buildPosterOpenUrl(productType, schoolSlug);
  const opened = window.open(url, '_blank', 'noopener');
  if (!opened) {
    state.message = 'הפוסטר נשמר, אבל הדפדפן חסם פתיחה בטאב חדש. אפשר לפתוח אותו ידנית מהקישור הבא.';
    state.messageType = 'error';
    state.manualOpenUrl = url;
    render();
  } else {
    state.manualOpenUrl = '';
  }
}

// ── Submissions Table ─────────────────────────────────────────────────────────

function renderTabs() {
  return `<nav class="admin-tabs" aria-label="אזורי ניהול">
    <button class="admin-tab ${state.activeTab === 'posters' ? 'active' : ''}" type="button" data-tab="posters">ניהול פוסטרים</button>
    <button class="admin-tab ${state.activeTab === 'schools' ? 'active' : ''}" type="button" data-tab="schools">ניהול בתי ספר</button>
  </nav>`;
}

function wireTabs() {
  root.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      state.message = '';
      state.manualOpenUrl = '';
      if (state.activeTab === 'schools' && !state.schools.length) loadSchools();
      else render();
    });
  });
}

function renderTable() {
  const body = state.rows.length
    ? state.rows.map((row) => `<tr>
        <td>${escapeHtml(row.project_name || '')}</td>
        <td>${escapeHtml(row.student_names || '')}</td>
        <td>${escapeHtml(row.class_name || '')}</td>
        <td>${escapeHtml(row.school_name || '')}</td>
        <td>${escapeHtml(productLabel(row.product_type))}</td>
        <td>${escapeHtml(formatDate(row.created_at))}</td>
        <td><div class="admin-row-actions">
          <button class="admin-btn primary" type="button" data-open="${escapeHtml(row.id)}">פתיחה</button>
          <button class="admin-btn danger" type="button" data-delete="${escapeHtml(row.id)}">מחק</button>
        </div></td>
      </tr>`).join('')
    : `<tr><td colspan="7" class="admin-empty">אין פוסטרים להצגה.</td></tr>`;

  root.innerHTML = `<main class="admin-shell">
    ${renderTabs()}
    <section class="admin-card">
      <header class="admin-header">
        <div>
          <h1 class="admin-title">ניהול פוסטרים</h1>
          <p class="admin-subtitle">פתיחת פוסטר לעריכה או מחיקה ידנית מהרשימה.</p>
        </div>
        <div class="admin-actions admin-actions-top">
          <button class="admin-btn ghost compact" type="button" data-download-template>הורדת תבנית Excel</button>
          <button class="admin-btn ghost compact" type="button" data-import-excel>ייבוא קובץ Excel</button>
          <input class="admin-file-input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-import-file />
          <button class="admin-btn ghost compact" type="button" data-refresh ${state.loading ? 'disabled' : ''}>רענון</button>
          <a class="admin-back" href="./index.html">חזרה</a>
        </div>
      </header>
      ${state.message ? `<p class="admin-message ${state.messageType}">${escapeHtml(state.message)}${state.manualOpenUrl ? ` <a href="${escapeHtml(state.manualOpenUrl)}" target="_blank" rel="noopener">פתיחה ידנית</a>` : ''}</p>` : ''}
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>שם מיזם</th><th>תלמידות</th><th>כיתה</th><th>בית ספר</th><th>סוג תוצר</th><th>תאריך שליחה</th><th>פעולות</th></tr></thead>
          <tbody>${state.loading ? `<tr><td colspan="7" class="admin-empty">טוען...</td></tr>` : body}</tbody>
        </table>
      </div>
    </section>
  </main>
  `;

  wireTabs();
  root.querySelector('[data-refresh]').addEventListener('click', loadRows);
  const fileInput = root.querySelector('[data-import-file]');
  root.querySelector('[data-download-template]').addEventListener('click', downloadTemplate);
  root.querySelector('[data-import-excel]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    importExcelFile(fileInput.files?.[0]);
    fileInput.value = '';
  });
  root.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', () => openSubmission(button.dataset.open));
  });
  root.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => removeSubmission(button.dataset.delete));
  });
}

async function openSubmission(id) {
  try {
    const row = await fetchPosterSubmission(id);
    const posterData = normalizePosterData(row.poster_data || {});
    const productType = posterData.productType || row.product_type || 'physical';
    const splitFlowState = posterData.splitFlowState && typeof posterData.splitFlowState === 'object'
      ? { ...posterData.splitFlowState, productType, step: getAdminStartStep(productType) }
      : buildSplitFlowState(productType, posterData.contentValues || {}, {
          background: posterData.background || null,
          titleFont: posterData.titleStyle?.fontFamily || 'IBM Plex Sans Hebrew',
          titleColor: posterData.titleStyle?.color || '#5E2750',
          textColor: posterData.titleStyle?.textColor || '#1f1030',
          shape: 20
        }, getAdminStartStep(productType));

    const schoolSlug = posterData.school_slug || 'default';
    navigateWithProject(posterData, productType, splitFlowState, id, schoolSlug);
  } catch (err) {
    showMessage('לא הצלחנו לפתוח את הפוסטר כרגע.');
  }
}

async function removeSubmission(id) {
  if (!window.confirm('האם למחוק את הפוסטר?')) return;
  try {
    await deletePosterSubmission(id);
    await loadRows();
  } catch (err) {
    showMessage('לא הצלחנו למחוק את הפוסטר כרגע.');
  }
}


// ── Schools Management ───────────────────────────────────────────────────────

function defaultSchoolForm() {
  return {
    school_name: '',
    logo_data: '',
    background_ids: [],
    use_default_questions: true,
    questions_config: DEFAULT_SCHOOL_QUESTIONS.map(([id, label, maxChars]) => ({ id, label, maxChars })),
    is_active: true
  };
}

function schoolQuestionsModeLabel(school) {
  return Array.isArray(school.questions_config) && school.questions_config.length ? 'מותאמות' : 'ברירת מחדל';
}

async function loadSchools(options = {}) {
  state.schoolsLoading = true;
  if (!options.keepMessage) state.message = '';
  render();
  try {
    state.schools = await listPosterSchools();
  } catch (err) {
    state.message = 'לא הצלחנו לטעון את בתי הספר כרגע. ודאו שטבלת poster_schools קיימת ב-Supabase.';
    state.messageType = 'error';
  }
  state.schoolsLoading = false;
  render();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('file-read-failed'));
    reader.readAsDataURL(file);
  });
}

function startAddSchool() {
  state.editingSchoolId = null;
  state.schoolForm = defaultSchoolForm();
  state.message = '';
  render();
}

function startEditSchool(id) {
  const school = state.schools.find((item) => item.id === id);
  if (!school) return;
  state.editingSchoolId = id;
  state.schoolForm = {
    school_name: school.school_name || '',
    logo_data: school.logo_data || school.logo_url || '',
    background_ids: Array.isArray(school.background_ids) ? [...school.background_ids] : [],
    use_default_questions: !(Array.isArray(school.questions_config) && school.questions_config.length),
    questions_config: (Array.isArray(school.questions_config) && school.questions_config.length
      ? school.questions_config
      : DEFAULT_SCHOOL_QUESTIONS.map(([qid, label, maxChars]) => ({ id: qid, label, maxChars })))
      .map((question) => ({ id: question.id, label: question.label, maxChars: question.maxChars })),
    is_active: school.is_active !== false
  };
  state.message = '';
  render();
}

function cancelSchoolForm() {
  state.editingSchoolId = null;
  state.schoolForm = null;
  render();
}

function buildSchoolPayload(slug) {
  const form = state.schoolForm || defaultSchoolForm();
  const questions = form.use_default_questions ? null : form.questions_config.map((question) => ({
    id: question.id,
    label: String(question.label || '').trim(),
    maxChars: Number(question.maxChars) || 1
  }));
  return {
    school_name: form.school_name.trim(),
    school_slug: slug,
    logo_data: form.logo_data || null,
    background_ids: form.background_ids || [],
    questions_config: questions,
    is_active: form.is_active !== false
  };
}

async function saveSchoolForm() {
  const form = state.schoolForm;
  if (!form?.school_name?.trim()) {
    showMessage('יש להזין שם בית ספר.');
    state.activeTab = 'schools';
    return;
  }
  try {
    const existing = state.editingSchoolId ? state.schools.find((item) => item.id === state.editingSchoolId) : null;
    const slug = existing && existing.school_name === form.school_name.trim()
      ? existing.school_slug
      : await buildUniqueSchoolSlug(form.school_name, state.editingSchoolId);
    const payload = buildSchoolPayload(slug);
    if (state.editingSchoolId) await updatePosterSchool(state.editingSchoolId, payload);
    else await createPosterSchool(payload);
    state.editingSchoolId = null;
    state.schoolForm = null;
    await loadSchools({ keepMessage: true });
    state.message = 'בית הספר נשמר בהצלחה.';
    state.messageType = 'ok';
    render();
  } catch (err) {
    showMessage('לא הצלחנו לשמור את בית הספר. בדקו חיבור ושהשם לא כבר קיים.');
    state.activeTab = 'schools';
  }
}

async function removeSchool(id) {
  if (!window.confirm('האם למחוק את בית הספר? הקישור של התלמידות לא יטען התאמות לאחר המחיקה.')) return;
  try {
    await deletePosterSchool(id);
    await loadSchools();
  } catch (err) {
    showMessage('לא הצלחנו למחוק את בית הספר כרגע.');
    state.activeTab = 'schools';
  }
}

async function copyStudentLink(slug) {
  const link = getStudentLink(slug);
  try {
    await navigator.clipboard.writeText(link);
    state.message = 'הקישור לתלמידות הועתק.';
    state.messageType = 'ok';
  } catch {
    state.message = `הקישור לתלמידות: ${link}`;
    state.messageType = 'ok';
  }
  render();
}

function renderBackgroundPicker(form) {
  return `<div class="school-bg-picker">
    ${BACKGROUNDS.map((bg) => {
      const checked = form.background_ids.includes(bg.id) ? 'checked' : '';
      return `<label class="school-bg-option">
        <input type="checkbox" data-school-bg="${escapeHtml(bg.id)}" ${checked} />
        <img src="${escapeHtml(bg.path)}" alt="${escapeHtml(bg.name)}" />
        <span>${escapeHtml(bg.name)}</span>
      </label>`;
    }).join('')}
  </div>`;
}

function renderQuestionEditor(form) {
  if (form.use_default_questions) return '<p class="admin-help">ייבחרו שאלות ברירת המחדל הקיימות במערכת.</p>';
  return `<div class="school-question-list">
    ${form.questions_config.map((question, index) => `<div class="school-question-row">
      <strong>שאלה ${index + 1}</strong>
      <input class="admin-input" type="text" data-question-label="${index}" value="${escapeHtml(question.label)}" aria-label="טקסט שאלה" />
      <input class="admin-input small" type="number" min="1" max="500" data-question-max="${index}" value="${escapeHtml(question.maxChars)}" aria-label="מגבלת תווים" />
    </div>`).join('')}
  </div>`;
}

function renderSchoolForm() {
  const form = state.schoolForm;
  if (!form) return '';
  return `<section class="admin-card school-form-card">
    <header class="admin-header compact-header">
      <div>
        <h2 class="admin-title small-title">${state.editingSchoolId ? 'עריכת בית ספר' : 'הוספת בית ספר'}</h2>
        <p class="admin-subtitle">המערכת תיצור את המזהה והקישור אוטומטית לפי שם בית הספר.</p>
      </div>
    </header>
    <div class="school-form-grid">
      <label>שם בית הספר
        <input class="admin-input" type="text" data-school-name value="${escapeHtml(form.school_name)}" />
      </label>
      <label>סטטוס
        <select class="admin-input" data-school-active>
          <option value="1" ${form.is_active ? 'selected' : ''}>פעיל</option>
          <option value="0" ${!form.is_active ? 'selected' : ''}>לא פעיל</option>
        </select>
      </label>
      <label>העלאת לוגו
        <input class="admin-input" type="file" accept="image/*" data-school-logo />
      </label>
      <div class="school-logo-preview">${form.logo_data ? `<img src="${escapeHtml(form.logo_data)}" alt="תצוגת לוגו" /><button class="admin-btn danger compact" type="button" data-remove-logo>הסר לוגו</button>` : '<span>לא נבחר לוגו.</span>'}</div>
    </div>
    <div class="school-section">
      <h3>רקעים שיוצגו לתלמידות</h3>
      <p class="admin-help">אם לא מסמנים רקעים — יוצגו כל הרקעים הרגילים.</p>
      ${renderBackgroundPicker(form)}
    </div>
    <div class="school-section">
      <h3>שאלות</h3>
      <label class="school-toggle"><input type="checkbox" data-default-questions ${form.use_default_questions ? 'checked' : ''} /> להשתמש בשאלות ברירת מחדל</label>
      ${renderQuestionEditor(form)}
    </div>
    <p class="admin-help" style="margin-top:12px;font-style:italic;">אם עדכנת שאלות לבית הספר, יש להוריד תבנית Excel חדשה לפני מילוי נתונים.</p>
    <div class="admin-actions">
      <button class="admin-btn primary" type="button" data-save-school>שמירה</button>
      <button class="admin-btn ghost" type="button" data-cancel-school>ביטול</button>
    </div>
  </section>`;
}

function renderSchools() {
  const body = state.schools.length
    ? state.schools.map((school) => {
      const link = getStudentLink(school.school_slug);
      return `<tr>
        <td>${escapeHtml(school.school_name)}</td>
        <td>${school.logo_data || school.logo_url ? `<img class="school-logo-thumb" src="${escapeHtml(school.logo_data || school.logo_url)}" alt="${escapeHtml(school.school_name)}" />` : '—'}</td>
        <td>${school.background_ids.length || 'כל הרקעים'}</td>
        <td>${schoolQuestionsModeLabel(school)}</td>
        <td><a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(link)}</a></td>
        <td><span class="status-pill ${school.is_active ? 'active' : ''}">${school.is_active ? 'פעיל' : 'לא פעיל'}</span></td>
        <td><div class="admin-row-actions">
          <button class="admin-btn primary" type="button" data-edit-school="${escapeHtml(school.id)}">עריכה</button>
          <button class="admin-btn ghost" type="button" data-copy-school="${escapeHtml(school.school_slug)}">העתק קישור</button>
          <button class="admin-btn ghost compact" type="button" data-dl-school-excel="${escapeHtml(school.id)}">הורדת Excel</button>
          <label class="admin-btn ghost compact" style="cursor:pointer">ייבוא Excel<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-school-file="${escapeHtml(school.id)}" data-school-slug="${escapeHtml(school.school_slug)}" style="display:none" /></label>
          <button class="admin-btn danger" type="button" data-delete-school="${escapeHtml(school.id)}">מחיקה</button>
        </div></td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="7" class="admin-empty">אין בתי ספר להצגה.</td></tr>`;

  root.innerHTML = `<main class="admin-shell">
    ${renderTabs()}
    <section class="admin-card">
      <header class="admin-header">
        <div>
          <h1 class="admin-title">ניהול בתי ספר</h1>
          <p class="admin-subtitle">הגדירו לוגו, רקעים ושאלות לכל קישור בית ספר — בלי עריכת קוד.</p>
        </div>
        <div class="admin-actions admin-actions-top">
          <button class="admin-btn primary compact" type="button" data-add-school>+ הוסף בית ספר</button>
          <button class="admin-btn ghost compact" type="button" data-refresh-schools ${state.schoolsLoading ? 'disabled' : ''}>רענון</button>
          <a class="admin-back" href="./index.html">חזרה</a>
        </div>
      </header>
      ${state.message ? `<p class="admin-message ${state.messageType}">${escapeHtml(state.message)}</p>` : ''}
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>שם בית הספר</th><th>לוגו</th><th>מספר רקעים שנבחרו</th><th>מצב שאלות</th><th>קישור לתלמידות</th><th>סטטוס</th><th>פעולות</th></tr></thead>
          <tbody>${state.schoolsLoading ? `<tr><td colspan="7" class="admin-empty">טוען...</td></tr>` : body}</tbody>
        </table>
      </div>
    </section>
    ${renderSchoolForm()}
  </main>`;

  wireTabs();
  root.querySelector('[data-add-school]')?.addEventListener('click', startAddSchool);
  root.querySelector('[data-refresh-schools]')?.addEventListener('click', loadSchools);
  root.querySelectorAll('[data-edit-school]').forEach((button) => button.addEventListener('click', () => startEditSchool(button.dataset.editSchool)));
  root.querySelectorAll('[data-delete-school]').forEach((button) => button.addEventListener('click', () => removeSchool(button.dataset.deleteSchool)));
  root.querySelectorAll('[data-copy-school]').forEach((button) => button.addEventListener('click', () => copyStudentLink(button.dataset.copySchool)));
  root.querySelectorAll('[data-dl-school-excel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const school = state.schools.find((s) => s.id === btn.dataset.dlSchoolExcel);
      if (school) downloadSchoolTemplate(school);
    });
  });
  root.querySelectorAll('[data-school-file]').forEach((input) => {
    input.addEventListener('change', () => {
      const slug = input.dataset.schoolSlug;
      importExcelFile(input.files?.[0], slug);
      input.value = '';
    });
  });
  wireSchoolForm();
}

function wireSchoolForm() {
  const form = state.schoolForm;
  if (!form) return;
  root.querySelector('[data-school-name]')?.addEventListener('input', (event) => { form.school_name = event.target.value; });
  root.querySelector('[data-school-active]')?.addEventListener('change', (event) => { form.is_active = event.target.value === '1'; });
  root.querySelector('[data-school-logo]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      form.logo_data = await readFileAsDataUrl(file);
      render();
    } catch {
      showMessage('לא הצלחנו לקרוא את קובץ הלוגו.');
      state.activeTab = 'schools';
    }
  });
  root.querySelector('[data-remove-logo]')?.addEventListener('click', () => { form.logo_data = ''; render(); });
  root.querySelectorAll('[data-school-bg]').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.dataset.schoolBg;
      if (input.checked && !form.background_ids.includes(id)) form.background_ids.push(id);
      if (!input.checked) form.background_ids = form.background_ids.filter((item) => item !== id);
    });
  });
  root.querySelector('[data-default-questions]')?.addEventListener('change', (event) => { form.use_default_questions = event.target.checked; render(); });
  root.querySelectorAll('[data-question-label]').forEach((input) => {
    input.addEventListener('input', () => { form.questions_config[Number(input.dataset.questionLabel)].label = input.value; });
  });
  root.querySelectorAll('[data-question-max]').forEach((input) => {
    input.addEventListener('input', () => { form.questions_config[Number(input.dataset.questionMax)].maxChars = Number(input.value) || 1; });
  });
  root.querySelector('[data-save-school]')?.addEventListener('click', saveSchoolForm);
  root.querySelector('[data-cancel-school]')?.addEventListener('click', cancelSchoolForm);
}

function render() {
  if (!state.authed) { renderLogin(); return; }
  if (state.activeTab === 'schools') { renderSchools(); return; }
  renderTable();
}

if (state.authed) loadRows();
else render();
