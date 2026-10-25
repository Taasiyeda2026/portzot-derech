import { api, dashboardLogin } from './common.js';

const dialog = document.querySelector('#inspiration-dialog');
const entry = document.querySelector('#inspiration-entry');
const closeButton = document.querySelector('#inspiration-dialog-close');
const signIn = document.querySelector('#inspiration-teacher-entry');
const authStatus = document.querySelector('#inspiration-auth-status');
const errorMessage = document.querySelector('#inspiration-entry-error');
const tokenKey = 'inspiration-teacher-access';

// Only the management screen creates or manages rooms. This entry checks SSO.
let pending = false;

function showError(message) {
  errorMessage.textContent = message || 'לא הצלחנו להשלים את הפעולה. נסי שוב.';
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

function showConnecting() {
  authStatus.textContent = 'מתחברת לדשבורד תעשיידע…';
  signIn.hidden = true;
}

function showSignedOut(message = 'יש להתחבר דרך דשבורד תעשיידע.') {
  authStatus.textContent = message;
  signIn.hidden = false;
  signIn.disabled = false;
}

function openManagement() {
  const url = new URL('./inspiration/teacher.html', location.href);
  location.assign(url.href);
}

// Verify the signed-in staff identity and permission before redirecting.
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
    // Do not create a second room; existing and new games are managed there.
    openManagement();
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

// Open the cross-origin SSO bridge while still handling an actual user click.
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
    void connectDashboard();
  } else {
    // Hash redirects lack a user gesture: popup login needs a real click.
    showSignedOut();
  }
}

entry.addEventListener('click', () => openDialog(true));
closeButton.addEventListener('click', () => dialog.close());
signIn.addEventListener('click', () => { void connectDashboard(); });

if (location.hash === '#inspiration') {
  history.replaceState(null, '', location.pathname + location.search);
  openDialog(false);
}
