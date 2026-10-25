import { api, requireTeacher, upload } from './common.js';
import { parseCSV } from './catalog-import.js';

const $ = (selector) => document.querySelector(selector);
let catalog = { groups: [], capacity: {} };
let editingCardGroup = null;
let busy = false;
let siteFiles = [];
async function loadSiteFiles() {
  const response = await fetch(new URL('./cards/women/manifest.json', import.meta.url), { cache: 'no-store' });
  if (!response.ok) throw new Error('לא הצלחנו לטעון את רשימת הכרטיסים מאתר פורצות דרך.');
  const manifest = await response.json();
  if (!Array.isArray(manifest.files)) throw new Error('רשימת קובצי הכרטיסים באתר אינה תקינה.');
  siteFiles = manifest.files.filter((name) => typeof name === 'string' && /^[A-Za-z0-9_-]+\.(?:png|jpg|jpeg|webp|pdf)$/.test(name));
  const select = $('#site-card-file');
  select.replaceChildren();
  const first = node('option', 'בחרי כרטיס מתיקיית women');
  first.value = '';
  select.append(first);
  for (const name of siteFiles) {
    const option = node('option', name); option.value = name; select.append(option);
  }
  select.addEventListener('change', updateSitePreview);
}
function updateSitePreview() {
  const filename = $('#site-card-file').value;
  const preview = $('#site-card-preview');
  if (!preview) return;
  if (!filename || !siteFiles.includes(filename) || !/\.(png|jpg|jpeg|webp)$/i.test(filename)) {
    preview.hidden = true; preview.removeAttribute('src'); return;
  }
  preview.src = new URL('./cards/women/' + filename, import.meta.url).href;
  preview.hidden = false;
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function message(text, bad = false) {
  const notice = $('#notice');
  notice.textContent = text;
  notice.className = `notice ${bad ? 'error' : 'success'}`;
  notice.hidden = false;
}
function failure(error) {
  message(error?.message || 'לא הצלחנו להשלים את הפעולה. נסי שוב בעוד רגע.', true);
}
async function task(operation) {
  if (busy) return;
  busy = true;
  const buttons = [...document.querySelectorAll('#admin-workspace button')];
  buttons.forEach((button) => { button.disabled = true; });
  try { await operation(); } catch (error) { failure(error); }
  finally { busy = false; buttons.forEach((button) => { button.disabled = false; }); }
}
const copy = (value) => JSON.parse(JSON.stringify(value));
const groupById = (id) => catalog.groups.find((group) => group.id === id);
function cardName(card) { return card.woman_name || card.name || ''; }

function resetGroup() {
  $('#group-form').reset();
  $('#group-form').elements.id.value = '';
  $('#group-form').elements.active.checked = false;
}
function resetCard() {
  $('#card-form').reset();
  $('#card-group').disabled = false;
  $('#card-form').elements.id.value = '';
  $('#site-card-file').value = '';
  updateSitePreview();
  $('#card-form').elements.front_path.value = '';
  $('#card-form').elements.back_path.value = '';
  $('#front-status').textContent = 'טרם נבחר קובץ קדמי';
  $('#back-status').textContent = 'ללא צד אחורי';
  editingCardGroup = null;
}
function editGroup(group) {
  const fields = $('#group-form').elements;
  fields.id.value = group.id;
  fields.symbol.value = group.symbol;
  fields.size.value = group.size;
  fields.active.checked = group.active;
  $('#group-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  fields.symbol.focus({ preventScroll: true });
}
function editCard(group, card) {
  resetCard();
  editingCardGroup = group.id;
  const fields = $('#card-form').elements;
  fields.id.value = card.id;
  fields.name.value = cardName(card);
  fields.field.value = card.field || '';
  fields.group_id.value = group.id;
  fields.group_id.disabled = true;
  fields.front_path.value = card.front_path || '';
  const linkedName = typeof card.front_path === 'string' && card.front_path.startsWith('site:women/') ? card.front_path.slice('site:women/'.length) : '';
  fields.site_file.value = siteFiles.includes(linkedName) ? linkedName : '';
  updateSitePreview();
  fields.back_path.value = card.back_path || '';
  fields.active.checked = card.active;
  $('#front-status').textContent = card.front_path ? `קובץ שמור: ${card.front_path}` : 'טרם נבחר קובץ קדמי';
  $('#back-status').textContent = card.back_path ? `קובץ שמור: ${card.back_path}` : 'ללא צד אחורי';
  $('#card-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  fields.name.focus({ preventScroll: true });
}
function actionButton(text, onClick) {
  const button = node('button', text, 'secondary');
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}
function renderCards() {
  const container = $('#cards-list');
  container.replaceChildren();
  const search = $('#card-search').value.trim().toLocaleLowerCase('he');
  for (const group of catalog.groups) {
    for (const card of group.cards || []) {
      if (search && !`${cardName(card)} ${card.field || ''}`.toLocaleLowerCase('he').includes(search)) continue;
      const item = node('article', undefined, 'catalog-item');
      const description = node('div');
      description.append(node('strong', cardName(card)), node('p', `${card.field || 'ללא תחום'} · ${group.symbol} · ${card.active ? 'קלף פעיל' : 'קלף מושבת'}`, 'hint'));
      item.append(description, actionButton('עריכת הקלף', () => editCard(group, card)));
      container.append(item);
    }
  }
  if (!container.childElementCount) container.append(node('p', search ? 'לא נמצאו קלפים שתואמים לחיפוש.' : 'המאגר עדיין ריק. אפשר להוסיף כאן את הקלפים המאושרים.', 'empty-state'));
}
function render() {
  const list = $('#groups-list');
  const select = $('#card-group');
  const selected = select.value;
  list.replaceChildren();
  select.replaceChildren();
  const placeholder = node('option', 'בחרי קבוצת התאמה');
  placeholder.value = '';
  select.append(placeholder);
  for (const group of catalog.groups) {
    const option = node('option', `${group.symbol} · ${Number(group.size) === 3 ? 'שלישייה' : 'זוג'}${group.active ? '' : ' · מושבתת'}`);
    option.value = group.id;
    select.append(option);
    const item = node('article', undefined, 'catalog-item');
    const description = node('div');
    description.append(node('strong', `${group.symbol} · ${Number(group.size) === 3 ? 'שלישייה' : 'זוג'}`), node('p', `${(group.cards || []).length} קלפים · ${group.active ? 'פעילה' : 'טיוטה / מושבתת'}`, 'hint'));
    item.append(description, actionButton('עריכת הקבוצה', () => editGroup(group)));
    list.append(item);
  }
  select.value = selected;
  if (!list.childElementCount) list.append(node('p', 'טרם הוגדרו קבוצות התאמה.', 'empty-state'));
  const totalCards = catalog.groups.reduce((sum, group) => sum + (group.cards || []).length, 0);
  const activeGroups = catalog.groups.filter((group) => group.active).length;
  $('#catalog-summary').textContent = `${catalog.groups.length} קבוצות התאמה · ${totalCards} קלפים · ${activeGroups} קבוצות פעילות`;
  renderCards();
}
function showValidation(result) {
  const list = $('#catalog-errors');
  list.replaceChildren();
  const errors = result?.errors || result?.issues || [];
  for (const issue of errors) {
    const messages = {
      BUCKET_MISSING: 'אחסון הקלפים טרם הוגדר. יש לפנות למנהלת המערכת לפני פתיחת משחק.',
      BUCKET_NOT_PRIVATE: 'אחסון הקלפים חייב להיות פרטי. יש לפנות למנהלת המערכת.',
      GROUP_INCOMPLETE: `קבוצת הסמל ${issue.symbol || ''} אינה שלמה. בדקי את מספר הקלפים הפעילים ואת קובצי התוכן.`,
    };
    list.append(node('li', typeof issue === 'string' ? issue : issue.message || messages[issue.error] || 'נמצאה בעיה בהגדרת מאגר הקלפים. בדקי את הקבוצות והקבצים.'));
  }
  if (!errors.length) list.append(node('li', catalog.groups.length ? 'הבדיקה הושלמה. רק קבוצות שלמות ותקינות זמינות לפתיחת משחק.' : 'אין עדיין קלפים זמינים לפתיחת משחק. טעני את הקבצים המאושרים.'));
}
async function refresh() {
  const result = await api('teacher.catalog');
  catalog = { ...result, groups: result.groups || [] };
  render();
  showValidation(await api('admin.catalog_validate'));
}

$('#group-form').addEventListener('submit', (event) => {
  event.preventDefault();
  task(async () => {
    const fields = event.currentTarget.elements;
    const previous = groupById(fields.id.value);
    const group = { id: fields.id.value || crypto.randomUUID(), symbol: fields.symbol.value.trim(), size: Number(fields.size.value), active: fields.active.checked, cards: copy(previous?.cards || []) };
    await api('admin.catalog_save', { groups: [group] });
    await refresh();
    resetGroup();
    message('קבוצת ההתאמה נשמרה.');
  });
});
$('#card-form').addEventListener('submit', (event) => {
  event.preventDefault();
  task(async () => {
    const fields = event.currentTarget.elements;
    const target = groupById(fields.group_id.value);
    if (!target) throw new Error('יש לבחור קבוצת התאמה לקלף.');
    const front = fields.front_file.files[0];
    const back = fields.back_file.files[0];
    if (fields.site_file.value && (front || back)) throw new Error('בחרי כרטיס קיים באתר או העלי קובץ ישן, לא את שניהם.');
    let frontPath = fields.site_file.value ? 'site:women/' + fields.site_file.value : fields.front_path.value;
    let backPath = fields.back_path.value;
    if (front) { $('#front-status').textContent = 'מעלות את הקובץ הקדמי…'; frontPath = (await upload(front)).path; }
    if (back) { $('#back-status').textContent = 'מעלות את הקובץ האחורי…'; backPath = (await upload(back)).path; }
    if (!frontPath && !backPath) throw new Error('יש להעלות לפחות קובץ תמונה או PDF אחד לפני שמירת הקלף.');
    const card = { id: fields.id.value || crypto.randomUUID(), woman_name: fields.name.value.trim(), field: fields.field.value.trim(), front_path: frontPath, back_path: backPath || null, active: fields.active.checked };
    const affected = new Map();
    if (editingCardGroup && editingCardGroup !== target.id) {
      const previous = copy(groupById(editingCardGroup));
      previous.cards = previous.cards.filter((item) => item.id !== card.id);
      affected.set(previous.id, previous);
    }
    const updated = copy(target);
    updated.cards = [...updated.cards.filter((item) => item.id !== card.id), card];
    affected.set(updated.id, updated);
    await api('admin.catalog_save', { groups: [...affected.values()] });
    await refresh();
    resetCard();
    message('הקלף נשמר. חדרים קיימים ממשיכים להציג את הגרסה המקורית שלהם.');
  });
});
$('#clear-group').addEventListener('click', resetGroup);
$('#clear-card').addEventListener('click', resetCard);
$('#card-search').addEventListener('input', renderCards);
$('#refresh-catalog').addEventListener('click', () => task(async () => { await refresh(); message('המאגר נבדק והנתונים עודכנו.'); }));

$('#import-form').addEventListener('submit', (event) => {
  event.preventDefault();
  task(async () => {
    const file = $('#import-file').files[0];
    const text = file ? await file.text() : $('#import-text').value;
    if (!text.trim()) throw new Error('יש לבחור קובץ או להדביק JSON.');
    let data;
    try { data = file?.name.toLowerCase().endsWith('.csv') ? parseCSV(text) : JSON.parse(text); }
    catch (error) { throw new Error(error.message?.startsWith('מבנה CSV') || error.message?.startsWith('חסרה עמודה') ? error.message : 'לא ניתן לקרוא את הקובץ. בדקי שמבנה JSON או CSV תקין.'); }
    if (!Array.isArray(data.groups) || !data.groups.length) throw new Error('קובץ היבוא צריך לכלול לפחות קבוצת התאמה אחת ברשימת groups.');
    await api('admin.catalog_import', data);
    await refresh();
    message('הרשימה יובאה בהצלחה. בדקי את תקינות המאגר לפני פתיחת משחק.');
    $('#import-form').reset();
  });
});

async function init() {
  try {
    const account = await requireTeacher();
    if (!account) return;
    if (!account.is_admin) throw new Error('ניהול תוכן זמין לאדמין מורשה בלבד.');
    await loadSiteFiles();
    await api('admin.catalog_validate');
    await refresh();
    $('#auth-panel').hidden = true;
    $('#admin-workspace').hidden = false;
    resetGroup();
    resetCard();
  } catch (error) {
    $('#auth-panel')?.replaceChildren(node('h2', 'נדרשת הרשאת ניהול תוכן'), node('p', error?.message || 'המאגר פתוח לעריכה למנהלת מורשית בלבד.'));
  }
}
init();
