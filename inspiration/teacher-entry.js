import { api, dashboardLogin } from './common.js';
import { createInviteTools } from './invite-tools.js';

const dialog = document.querySelector('#inspiration-dialog');
const entry = document.querySelector('#inspiration-entry');
const closeButton = document.querySelector('#inspiration-dialog-close');
const signIn = document.querySelector('#inspiration-teacher-entry');
const authSection = document.querySelector('#inspiration-teacher-auth');
const authStatus = document.querySelector('#inspiration-auth-status');
const workspace = document.querySelector('#inspiration-teacher-workspace');
const welcome = document.querySelector('#inspiration-teacher-welcome');
const form = document.querySelector('#inspiration-teacher-form');
const createButton = document.querySelector('#inspiration-create-room');
const resultSection = document.querySelector('#inspiration-room-created');
const manageRoom = document.querySelector('#inspiration-manage-room');
const qrHost = document.querySelector('#inspiration-room-qr');
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

function showConnecting() {
  authSection.hidden = false;
  workspace.hidden = true;
  resultSection.hidden = true;
  authStatus.textContent = 'מתחברת לדשבורד תעשיידע…';
  signIn.hidden = true;
}

function showSignedOut(message = 'יש להתחבר דרך דשבורד תעשיידע.') {
  authSection.hidden = false;
  workspace.hidden = true;
  resultSection.hidden = true;
  authStatus.textContent = message;
  signIn.hidden = false;
  signIn.disabled = false;
}

function showSignedIn() {
  authSection.hidden = true;
  workspace.hidden = false;
  resultSection.hidden = true;
  welcome.textContent = 'מחוברת דרך דשבורד תעשיידע';
  form.reset();
}

// The game's RPC validates the dashboard user and instructor role on the server.
async function checkInstructor() {
  if (!sessionStorage.getItem(tokenKey)) {
    showSignedOut();
    return false;
  }
  try {
    const profile = await api('teacher.me');
    if (!profile?.can_manage && !profile?.is_admin) {
      showSignedOut('אין הרשאה לניהול המשחק בחשבון זה.');
      return false;
    }
    const catalog = await api('teacher.catalog');
    catalogCapacity = catalog?.capacity || null;
    showSignedIn();
    return true;
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      sessionStorage.removeItem(tokenKey);
      showSignedOut('יש לחדש את ההתחברות דרך דשבורד תעשיידע.');
    } else {
      showSignedOut('לא ניתן לאמת את ההתחברות כרגע.');
      showError(error?.message || 'נסי שוב.');
    }
    return false;
  }
}

// Call dashboardLogin in the original user click, before any await, so the
// cross-origin dashboard bridge is not blocked as an unsolicited popup.
async function connectDashboard() {
  if (pending) return;
  pending = true;
  clearError();
  showConnecting();
  try {
    await dashboardLogin();
    await checkInstructor();
  } catch (error) {
    showSignedOut('לא הצלחנו להתחבר לדשבורד תעשיידע.');
    showError(error?.message || 'נסי שוב.');
  } finally {
    pending = false;
  }
}

function openDialog(fromClick = true) {
  if (dialog.open) return;
  clearError();
  showConnecting();
  dialog.showModal();
  if (sessionStorage.getItem(tokenKey)) {
    void checkInstructor();
  } else if (fromClick) {
    // Open the already-connected dashboard automatically. No extra login
    // button appears before the browser's dashboard session is checked.
    void connectDashboard();
  } else {
    // A hash redirect is not a user gesture; browsers can block its popup.
    showSignedOut();
  }
}

entry.addEventListener('click', () => openDialog(true));
closeButton.addEventListener('click', () => dialog.close());
signIn.addEventListener('click', () => { void connectDashboard(); });

function roomLinkFor(code) {
  const url = new URL('./inspiration/index.html', location.href);
  url.searchParams.set('code', code);
  return url;
}

function showCreatedRoom(room) {
  if (!room?.id || !room?.code) throw new Error('החדר נפתח, אך לא קיבלנו את פרטי ההצטרפות. ניתן לפתוח אותו במסך ניהול המשחקים.');
  const link = roomLinkFor(room.code);
  invitationUrl = link.href;
  manageRoom.href = new URL('./inspiration/teacher.html?room=' + encodeURIComponent(room.id), location.href).href;
  try {
    qrHost.replaceChildren(createInviteTools(invitationUrl, showError));
  } catch {
    qrHost.textContent = 'לא ניתן להציג QR. אפשר לעבור לניהול המשחק.';
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

newRoom.addEventListener('click', () => {
  clearError();
  resultSection.hidden = true;
  workspace.hidden = false;
  form.reset();
});

if (location.hash === '#inspiration') {
  history.replaceState(null, '', location.pathname + location.search);
  openDialog(false);
}
