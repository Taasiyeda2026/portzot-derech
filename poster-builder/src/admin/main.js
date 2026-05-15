import { POSTER_ADMIN_CODE } from '../shared/supabase-config.js';
import { saveProject } from '../shared/storage.js';
import { BACKGROUNDS, DEFAULT_FIELD_COLOR, DEFAULT_FIELD_FONT, FIELD_DEFINITIONS, POSTER_SIZES } from '../products/physical/config.js';
import { createPosterSubmissions, deletePosterSubmission, fetchPosterSubmission, listPosterSubmissions, normalizePosterData } from '../shared/poster-submissions.js';
import { listPosterAssets, createPosterAsset, updatePosterAssetImage, deactivatePosterAsset } from '../shared/poster-assets.js';

const root = document.getElementById('admin-root');
const SESSION_KEY = 'poster-builder-admin-ok';
const PRODUCT_PATHS = {
  physical: './product/physical.html',
  website: './product/website.html',
  app: './product/app.html',
  digital: './product/website.html'
};

const TEMPLATE_FILE_NAME = 'poster-import-template.xlsx';
const TEMPLATE_HEADERS = [
  'productType',
  'posterSize',
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
const CONTENT_HEADERS = TEMPLATE_HEADERS.slice(6);
const PRODUCT_TYPE_OPTIONS = ['physical', 'website', 'app'];
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
  posterSize: Object.keys(POSTER_SIZES),
  backgroundId: BACKGROUND_ID_OPTIONS,
  titleFont: FONT_OPTIONS,
  titleColor: TITLE_COLOR_OPTIONS,
  textColor: TEXT_COLOR_OPTIONS
};

const state = {
  authed: sessionStorage.getItem(SESSION_KEY) === '1',
  rows: [],
  loading: false,
  message: '',
  messageType: 'error',
  view: 'posters',
  assets: [],
  assetsLoading: false,
  assetForm: null
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

function assetTypeLabel(type) {
  return ({ school_logo: 'לוגו בית ספר', icon: 'סמל / אייקון', decoration: 'אלמנט עיצובי', other: 'אחר' })[type] || type || '';
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

function buildImportProject(row) {
  if (isBlankImportRow(row)) return null;

  const productType = getValidOption(row, 'productType', PRODUCT_TYPE_OPTIONS, 'physical');
  const posterSize = getValidOption(row, 'posterSize', Object.keys(POSTER_SIZES), 'A4');
  const backgroundId = getValidOption(row, 'backgroundId', BACKGROUND_ID_OPTIONS, 'bg-tech1');
  const titleFont = getValidOption(row, 'titleFont', FONT_OPTIONS, 'IBM Plex Sans Hebrew');
  const titleColor = getValidOption(row, 'titleColor', TITLE_COLOR_OPTIONS, '#5E2750');
  const textColor = getValidOption(row, 'textColor', TEXT_COLOR_OPTIONS, '#1f1030');
  if (!productType || !posterSize || !backgroundId || !titleFont || !titleColor || !textColor) return null;

  const background = BACKGROUNDS.find((item) => item.id === backgroundId) || BACKGROUNDS[0];
  const contentValues = Object.fromEntries(CONTENT_HEADERS.map((header) => [header, getCellValue(row, header)]));
  const design = { background: background.path, titleFont, titleColor, textColor, shape: 20 };

  return {
    posterSize,
    productType,
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

async function importExcelFile(file) {
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
      const project = buildImportProject(row);
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
  render();
}

async function loadRows(options = {}) {
  state.loading = true;
  if (!options.keepMessage) state.message = '';
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

function persistAdminProject(id, project) {
  const nextProject = {
    ...project,
    submissionId: id,
    updatedAt: Date.now()
  };
  saveProject(nextProject);
  return nextProject;
}

// ── Assets Library ────────────────────────────────────────────────────────────

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ.'));
    reader.readAsDataURL(file);
  });
}

async function loadAssets() {
  state.assetsLoading = true;
  state.message = '';
  render();
  try {
    state.assets = await listPosterAssets();
  } catch (err) {
    state.message = 'לא הצלחנו לטעון את ספריית האלמנטים.';
    state.messageType = 'error';
  }
  state.assetsLoading = false;
  render();
}

async function handleSaveAsset() {
  const form = state.assetForm;
  if (!form || form.saving) return;
  if (!form.name.trim()) { showMessage('יש להזין שם לאלמנט.'); return; }
  if (!form.imageData) { showMessage('יש לבחור קובץ תמונה.'); return; }
  if (form.asset_type === 'school_logo' && !form.school_name.trim()) {
    showMessage('יש להזין שם בית ספר עבור לוגו בית ספר.');
    return;
  }
  state.assetForm = { ...form, saving: true };
  state.message = '';
  render();
  try {
    if (form.mode === 'add') {
      await createPosterAsset({
        name: form.name.trim(),
        asset_type: form.asset_type,
        school_name: form.asset_type === 'school_logo' ? form.school_name.trim() : null,
        image_data: form.imageData
      });
    } else {
      await updatePosterAssetImage(form.id, form.imageData);
    }
    state.assetForm = null;
    await loadAssets();
    state.message = form.mode === 'add' ? 'האלמנט נוסף בהצלחה.' : 'האלמנט עודכן בהצלחה.';
    state.messageType = 'ok';
    render();
  } catch (err) {
    state.assetForm = { ...state.assetForm, saving: false };
    showMessage('לא הצלחנו לשמור את האלמנט. ' + (err?.message || ''));
  }
}

async function handleDeleteAsset(id) {
  if (!window.confirm('האם למחוק את האלמנט מהספרייה?')) return;
  try {
    await deactivatePosterAsset(id);
    state.assets = state.assets.filter((a) => a.id !== id);
    render();
  } catch (err) {
    showMessage('לא הצלחנו למחוק את האלמנט.');
  }
}

function renderAssetFormPanel() {
  const form = state.assetForm;
  if (!form) return '';
  const isSchoolLogo = form.asset_type === 'school_logo';
  return `<div class="admin-asset-form">
    <h3 style="margin:0 0 10px;color:#5E2750;font-size:18px">${form.mode === 'add' ? 'הוספת אלמנט חדש' : 'עריכת אלמנט'}</h3>
    <label>שם האלמנט
      <input class="admin-input" type="text" data-asset-name value="${escapeHtml(form.name)}" placeholder="לדוגמה: לוגו בית ספר ביאליק" />
    </label>
    <label>סוג אלמנט
      <select class="admin-input" data-asset-type>
        <option value="school_logo"${form.asset_type === 'school_logo' ? ' selected' : ''}>לוגו בית ספר</option>
        <option value="icon"${form.asset_type === 'icon' ? ' selected' : ''}>סמל / אייקון</option>
        <option value="decoration"${form.asset_type === 'decoration' ? ' selected' : ''}>אלמנט עיצובי</option>
        <option value="other"${form.asset_type === 'other' ? ' selected' : ''}>אחר</option>
      </select>
    </label>
    ${isSchoolLogo ? `<label>שם בית הספר (כפי שמופיע בפוסטר)
      <input class="admin-input" type="text" data-asset-school value="${escapeHtml(form.school_name)}" placeholder="כתיבה מדויקת, תואמת לשדה &#39;בית ספר&#39; בפוסטר" />
    </label>` : ''}
    <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
      <button class="admin-btn ghost compact" type="button" data-asset-file-btn>בחירת קובץ (PNG / JPG / SVG)</button>
      <input class="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-asset-file />
      ${form.imageData
        ? `<div class="admin-asset-preview"><img src="${escapeHtml(form.imageData)}" alt="תצוגה מקדימה" /></div>`
        : '<span style="color:#94a3b8;font-size:13px">לא נבחר קובץ</span>'}
    </div>
    <div class="admin-actions">
      <button class="admin-btn primary" type="button" data-asset-save${form.saving ? ' disabled' : ''}>${form.saving ? 'שומר...' : 'שמירה'}</button>
      <button class="admin-btn ghost" type="button" data-asset-cancel${form.saving ? ' disabled' : ''}>ביטול</button>
    </div>
  </div>`;
}

function renderAssetsGrid() {
  if (state.assetsLoading) return '<p class="admin-empty" style="margin-top:20px">טוען ספריית אלמנטים...</p>';
  if (!state.assets.length) return '<p class="admin-empty" style="margin-top:20px">ספריית האלמנטים ריקה. לחצו על "הוספת אלמנט" כדי להתחיל.</p>';
  return `<div class="admin-assets-grid">
    ${state.assets.map((asset) => `
    <div class="admin-asset-card">
      <div class="admin-asset-thumb">
        <img src="${escapeHtml(asset.image_data)}" alt="${escapeHtml(asset.name)}" />
      </div>
      <p class="admin-asset-name">${escapeHtml(asset.name)}</p>
      <p class="admin-asset-type">${escapeHtml(assetTypeLabel(asset.asset_type))}</p>
      ${asset.school_name ? `<p class="admin-asset-school">${escapeHtml(asset.school_name)}</p>` : ''}
      <div class="admin-asset-actions">
        <button class="admin-btn ghost compact" type="button" data-replace-asset="${escapeHtml(asset.id)}">החלפת קובץ</button>
        <button class="admin-btn danger compact" type="button" data-delete-asset="${escapeHtml(asset.id)}">מחיקה</button>
      </div>
    </div>`).join('')}
  </div>`;
}

function bindAssetsViewEvents() {
  root.querySelector('[data-view-posters]').addEventListener('click', () => {
    state.view = 'posters';
    state.message = '';
    render();
  });

  root.querySelector('[data-add-asset]').addEventListener('click', () => {
    if (state.assetForm) {
      state.assetForm = null;
      render();
      return;
    }
    state.assetForm = { mode: 'add', name: '', asset_type: 'school_logo', school_name: '', imageData: null, saving: false };
    render();
  });

  const form = state.assetForm;
  if (form) {
    const nameInput   = root.querySelector('[data-asset-name]');
    const typeSelect  = root.querySelector('[data-asset-type]');
    const schoolInput = root.querySelector('[data-asset-school]');
    const fileInput   = root.querySelector('[data-asset-file]');
    const fileBtnEl   = root.querySelector('[data-asset-file-btn]');

    nameInput?.addEventListener('input', (e) => { state.assetForm = { ...state.assetForm, name: e.target.value }; });
    typeSelect?.addEventListener('change', (e) => { state.assetForm = { ...state.assetForm, asset_type: e.target.value }; render(); });
    schoolInput?.addEventListener('input', (e) => { state.assetForm = { ...state.assetForm, school_name: e.target.value }; });
    fileBtnEl?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const imageData = await readImageFile(file);
        state.assetForm = { ...state.assetForm, imageData };
        render();
      } catch {
        showMessage('לא הצלחנו לקרוא את הקובץ.');
      }
      fileInput.value = '';
    });
    root.querySelector('[data-asset-save]')?.addEventListener('click', handleSaveAsset);
    root.querySelector('[data-asset-cancel]')?.addEventListener('click', () => { state.assetForm = null; state.message = ''; render(); });
  }

  root.querySelectorAll('[data-delete-asset]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteAsset(btn.dataset.deleteAsset));
  });

  root.querySelectorAll('[data-replace-asset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'file';
      hiddenInput.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      hiddenInput.addEventListener('change', async () => {
        const file = hiddenInput.files?.[0];
        if (!file) return;
        try {
          const imageData = await readImageFile(file);
          await updatePosterAssetImage(btn.dataset.replaceAsset, imageData);
          await loadAssets();
          state.message = 'הקובץ הוחלף בהצלחה.';
          state.messageType = 'ok';
          render();
        } catch {
          showMessage('לא הצלחנו להחליף את הקובץ.');
        }
      });
      hiddenInput.click();
    });
  });
}

function renderAssetsView() {
  root.innerHTML = `<main class="admin-shell">
    <section class="admin-card">
      <header class="admin-header">
        <div>
          <h1 class="admin-title">ספריית אלמנטים</h1>
          <p class="admin-subtitle">ניהול לוגואים ואלמנטים גרפיים לשימוש בפוסטרים.</p>
        </div>
        <div class="admin-actions admin-actions-top">
          <button class="admin-btn primary compact" type="button" data-add-asset>+ הוספת אלמנט</button>
          <button class="admin-btn ghost compact" type="button" data-view-posters>חזרה לפוסטרים</button>
        </div>
      </header>
      ${state.message ? `<p class="admin-message ${state.messageType}">${escapeHtml(state.message)}</p>` : ''}
      ${renderAssetFormPanel()}
      ${renderAssetsGrid()}
    </section>
  </main>`;
  bindAssetsViewEvents();
}

function navigateWithProject(posterData, productType, splitFlowState, submissionId) {
  const { schoolLogoImage, ...projectData } = posterData || {};
  void schoolLogoImage;
  saveProject({
    ...projectData,
    productType,
    splitFlowState,
    submissionId
  });
  window.location.href = PRODUCT_PATHS[productType] || PRODUCT_PATHS.physical;
}

// ── Submissions Table ─────────────────────────────────────────────────────────

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
          <button class="admin-btn ghost compact" type="button" data-view-assets>ספריית אלמנטים</button>
          <a class="admin-back" href="./index.html">חזרה</a>
        </div>
      </header>
      ${state.message ? `<p class="admin-message ${state.messageType}">${escapeHtml(state.message)}</p>` : ''}
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>שם מיזם</th><th>תלמידות</th><th>כיתה</th><th>בית ספר</th><th>סוג תוצר</th><th>תאריך שליחה</th><th>פעולות</th></tr></thead>
          <tbody>${state.loading ? `<tr><td colspan="7" class="admin-empty">טוען...</td></tr>` : body}</tbody>
        </table>
      </div>
    </section>
  </main>
  `;

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
  root.querySelector('[data-view-assets]').addEventListener('click', () => {
    state.view = 'assets';
    state.message = '';
    if (!state.assets.length && !state.assetsLoading) loadAssets();
    else render();
  });
}

async function openSubmission(id) {
  try {
    const row = await fetchPosterSubmission(id);
    const posterData = normalizePosterData(row.poster_data || {});
    const productType = posterData.productType || row.product_type || 'physical';
    const splitFlowState = posterData.splitFlowState && typeof posterData.splitFlowState === 'object'
      ? { ...posterData.splitFlowState, productType }
      : buildSplitFlowState(productType, posterData.contentValues || {}, {
          background: posterData.background || null,
          titleFont: posterData.titleStyle?.fontFamily || 'IBM Plex Sans Hebrew',
          titleColor: posterData.titleStyle?.color || '#5E2750',
          textColor: posterData.titleStyle?.textColor || '#1f1030',
          shape: 20
        });

    navigateWithProject(posterData, productType, splitFlowState, id);
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

function render() {
  if (!state.authed) { renderLogin(); return; }
  if (state.view === 'assets') { renderAssetsView(); return; }
  renderTable();
}

if (state.authed) loadRows();
else render();
