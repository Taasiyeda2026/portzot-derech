import { api, dashboardLogin } from './common.js';

const dialog = document.querySelector('#inspiration-dialog');
const entry = document.querySelector('#inspiration-entry');
const closeButton = document.querySelector('#inspiration-dialog-close');
const signIn = document.querySelector('#inspiration-teacher-entry');
const authSection = document.querySelector('#inspiration-teacher-auth');
const workspace = document.querySelector('#inspiration-teacher-workspace');
const welcome = document.querySelector('#inspiration-teacher-welcome');
const form = document.querySelector('#inspiration-teacher-form');
const createButton = document.querySelector('#inspiration-create-room');
const resultSection = document.querySelector('#inspiration-room-created');
const manageRoom = document.querySelector('#inspiration-manage-room');
const qrHost = document.querySelector('#inspiration-room-qr');
const copyButton = document.querySelector('#inspiration-copy-room');
const newRoom = document.querySelector('#inspiration-new-room');
const errorMessage = document.querySelector('#inspiration-entry-error');
const tokenKey = 'inspiration-teacher-access';

let catalogCapacity = null;
let pending = false;
let invitationUrl = '';

function showError(message) {
  errorMessage.textContent = message || 'לא הצלחנו להשלים את הפעולה. נסי שוב.';
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

function showSignedOut() {
  authSection.hidden = false;
  workspace.hidden = true;
  resultSection.hidden = true;
  signIn.disabled = false;
}

function showSignedIn(profile) {
  authSection.hidden = true;
  workspace.hidden = false;
  resultSection.hidden = true;
  welcome.textContent = 'מחוברת דרך תעשיידע';
  form.reset();
}

async function checkInstructor() {
  if (!sessionStorage.getItem(tokenKey)) {
    showSignedOut();
    return;
  }
  try {
    const profile = await api('teacher.me');
    if (!profile?.can_manage && !profile?.is_admin) {
      showSignedOut();
      showError('החשבון הזה אינו מורשה לניהול המשחק.');
      return;
    }
    const catalog = await api('teacher.catalog');
    catalogCapacity = catalog?.capacity || null;
    showSignedIn(profile);
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      sessionStorage.removeItem(tokenKey);
      showSignedOut();
      showError('יש להתחבר מחדש לחשבון המדריכה.');
    } else {
      showSignedOut();
      showError(error?.message || 'לא הצלחנו לבדוק את ההתחברות. נסי שוב.');
    }
  }
}

async function openDialog() {
  if (dialog.open) return;
  clearError();
  showSignedOut();
  dialog.showModal();
  signIn.disabled = true;
  await checkInstructor();
  if (authSection.hidden === false) signIn.disabled = false;
}

entry.addEventListener('click', openDialog);
closeButton.addEventListener('click', () => dialog.close());

signIn.addEventListener('click', async () => {
  if (pending) return;
  pending = true;
  signIn.disabled = true;
  clearError();
  try {
    await dashboardLogin();
    await checkInstructor();
  } catch (error) {
    showError(error?.message || 'ההתחברות לא הושלמה. נסי שוב.');
  } finally {
    pending = false;
    signIn.disabled = false;
  }
});

function roomLinkFor(code) {
  const url = new URL('./inspiration/index.html', location.href);
  url.searchParams.set('code', code);
  return url;
}

function showCreatedRoom(room) {
  if (!room?.id || !room?.code) throw new Error('החדר נפתח, אך לא קיבלנו את פרטי ההצטרפות. ניתן לפתוח אותו במסך ניהול המשחקים.');
  const link = roomLinkFor(room.code);
  invitationUrl = link.href;
  copyButton.textContent = 'העתקת קישור';
  manageRoom.href = new URL('./inspiration/teacher.html?room=' + encodeURIComponent(room.id), location.href).href;
  qrHost.replaceChildren();
  try {
    const qr = globalThis.qrcode(0, 'M');
    qr.addData(link.href);
    qr.make();
    const svg = new DOMParser().parseFromString(qr.createSvgTag({ scalable: true, margin: 2 }), 'image/svg+xml');
    const image = svg.documentElement;
    if (image.nodeName.toLowerCase() !== 'svg') throw new Error('QR');
    qrHost.append(document.importNode(image, true));
  } catch {
    qrHost.textContent = 'קישור ההצטרפות זמין להעתקה למטה.';
  }
  workspace.hidden = true;
  resultSection.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (pending || !form.reportValidity()) return;
  const expected = Number(form.elements.expected.value);
  if (!Number.isInteger(expected) || expected < 2) {
    showError('הזיני מספר משתתפות תקין.');
    return;
  }
  if (catalogCapacity) {
    const maximum = expected % 2 ? Number(catalogCapacity.max_odd || 0) : Number(catalogCapacity.max_even || 0);
    if (expected > maximum || (expected % 2 && Number(catalogCapacity.triples || 0) === 0)) {
      showError('אין מספיק קלפים למספר המשתתפות הזה. בחרי מספר קטן יותר.');
      return;
    }
  }
  pending = true;
  createButton.disabled = true;
  clearError();
  try {
    const created = await api('teacher.create', { expected });
    showCreatedRoom(created?.room || created);
  } catch (error) {
    showError(error?.message || 'לא הצלחנו לפתוח את המשחק. נסי שוב.');
  } finally {
    pending = false;
    createButton.disabled = false;
  }
});

copyButton.addEventListener('click', async () => {
  try {
    if (!invitationUrl) throw new Error('קישור לא זמין');
    await navigator.clipboard.writeText(invitationUrl);
    copyButton.textContent = 'הקישור הועתק';
  } catch {
    showError('ההעתקה לא הצליחה. נסי שוב או פתחי את ניהול המשחק.');
  }
});

newRoom.addEventListener('click', () => {
  clearError();
  resultSection.hidden = true;
  workspace.hidden = false;
  form.reset();
});

if (location.hash === '#inspiration') {
  history.replaceState(null, '', location.pathname + location.search);
  openDialog();
}
