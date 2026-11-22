import { dashboardLogin, api as inspirationApi } from '../inspiration/common.js';
import { api as pairingApi } from '../pairing/common.js';
import { readActiveDashboardAccount } from './dashboard-account.js';

const checks = {
  inspiration: () => inspirationApi('teacher.me'),
  pairing: () => pairingApi('teacher.me')
};

export function setupManagementEntry(doc = document, dependencies = {}) {
  const login = dependencies.login || dashboardLogin;
  const readAccount = dependencies.readAccount || readActiveDashboardAccount;
  const checkActivity = dependencies.checkActivity || (name => checks[name]());
  const navigate = dependencies.navigate || (url => doc.defaultView.location.assign(url));
  const loginButton = doc.getElementById('management-login');
  const status = doc.getElementById('management-auth-status');
  if (!loginButton || !status) return;
  const activities = [...doc.querySelectorAll('[data-activity-url]')];
  const arabic = doc.documentElement.lang === 'ar';
  const text = arabic ? {
    signedOut: 'سجّلي الدخول عبر لوحة تحكم تعسيدع للدخول إلى واجهة الإدارة.',
    connecting: 'جارٍ الاتصال بلوحة تحكم تعسيدع…',
    checking: 'جارٍ التحقق من الحساب وصلاحيات كل نشاط على حدة…',
    active: 'تم الدخول إلى واجهة الإدارة بحساب لوحة تحكم نشط. صلاحية كل نشاط تُفحص بشكل مستقل.',
    inactive: 'حساب لوحة التحكم غير نشط. لا يمكن الدخول إلى الإدارة بهذا الحساب.',
    accountMissing: 'لم يتم العثور على حساب لوحة تحكم نشط مرتبط بهذه الهوية.',
    unavailable: 'تعذّر التحقق من حساب لوحة التحكم الآن. حاولي مجددًا.',
    loginError: 'لم تكتمل عملية تسجيل الدخول. تحققي من السماح بالنوافذ المنبثقة وحاولي مجددًا.',
    ready: 'الدخول إلى النشاط', denied: 'لا توجد صلاحية لهذا النشاط',
    activityError: 'تعذّر التحقق من الصلاحية — حاولي مجددًا',
    pending: 'جارٍ فحص الصلاحية…', required: 'يلزم تسجيل الدخول',
    retry: 'إعادة التحقق', signIn: 'تسجيل الدخول عبر لوحة تحكم تعسيدع'
  } : {
    signedOut: 'יש להתחבר דרך דשבורד תעשיידע כדי להיכנס לממשק הניהול.',
    connecting: 'מתחברת לדשבורד תעשיידע…',
    checking: 'בודקת את החשבון ואת ההרשאות לכל פעילות בנפרד…',
    active: 'נכנסת לממשק הניהול עם חשבון דשבורד פעיל. ההרשאה לכל פעילות נבדקת בנפרד.',
    inactive: 'חשבון הדשבורד אינו פעיל. לא ניתן להיכנס לניהול באמצעות חשבון זה.',
    accountMissing: 'לא נמצא חשבון דשבורד פעיל המשויך לזהות זו.',
    unavailable: 'לא ניתן לאמת את חשבון הדשבורד כרגע. אפשר לנסות שוב.',
    loginError: 'ההתחברות לא הושלמה. יש לוודא שחלונות קופצים מותרים ולנסות שוב.',
    ready: 'כניסה לפעילות', denied: 'אין הרשאה לפעילות זו',
    activityError: 'לא ניתן לבדוק הרשאה — אפשר לנסות שוב',
    pending: 'בודקת הרשאה…', required: 'נדרשת התחברות',
    retry: 'בדיקה חוזרת', signIn: 'התחברות דרך דשבורד תעשיידע'
  };
  let pending = false;
  let active = false;
  let generation = 0;
  let lastVerification = 0;

  function setActivity(button, enabled, message) {
    button.disabled = !enabled;
    button.setAttribute('aria-disabled', String(!enabled));
    const label = button.querySelector('[data-activity-status]');
    if (label) label.textContent = message;
  }
  function lock(message = text.required) {
    active = false;
    activities.forEach(button => setActivity(button, false, message));
  }
  function accountError(error) {
    lock();
    const code = error?.code;
    const signedOut = code === 'signed_out';
    status.textContent = signedOut ? text.signedOut : code === 'inactive' ? text.inactive :
      ['account_missing', 'identity_mismatch'].includes(code) ? text.accountMissing : text.unavailable;
    doc.documentElement.dataset.accountState = signedOut ? 'signed-out' : 'blocked';
    loginButton.textContent = signedOut ? text.signIn : text.retry;
    loginButton.hidden = false;
  }
  async function permission(button) {
    let timer;
    try {
      const profile = await Promise.race([
        checkActivity(button.dataset.activity),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 12000); })
      ]);
      return profile?.can_manage === true || profile?.is_admin === true ? 'ready' : 'denied';
    } catch (error) {
      return [401, 403].includes(error?.status) || ['forbidden', 'unauthorized'].includes(error?.code)
        || /forbidden|unauthorized/i.test(error?.message || '') ? 'denied' : 'activityError';
    } finally {
      clearTimeout(timer);
    }
  }
  async function verify() {
    const current = ++generation;
    lock(text.pending);
    status.textContent = text.checking;
    doc.documentElement.dataset.accountState = 'checking';
    try {
      await readAccount();
      if (current !== generation) return;
      active = true;
      doc.documentElement.dataset.accountState = 'active';
      status.textContent = text.active;
      // The account has already been admitted even if both activities deny access.
      loginButton.textContent = text.retry;
      loginButton.hidden = false;
      await Promise.all(activities.map(async button => {
        const outcome = await permission(button);
        if (current === generation && active) setActivity(button, outcome === 'ready', text[outcome]);
      }));
      lastVerification = Date.now();
    } catch (error) {
      if (current === generation) accountError(error);
    }
  }
  async function connect() {
    if (pending) return;
    pending = true;
    loginButton.disabled = true;
    try {
      if (!active && doc.documentElement.dataset.accountState === 'signed-out') {
        lock();
        status.textContent = text.connecting;
        await login();
      }
      await verify();
    } catch {
      lock();
      doc.documentElement.dataset.accountState = 'signed-out';
      status.textContent = text.loginError;
    } finally {
      pending = false;
      loginButton.disabled = false;
    }
  }
  loginButton.addEventListener('click', connect);
  activities.forEach(button => button.addEventListener('click', async () => {
    if (!active || pending || button.disabled) return;
    pending = true;
    loginButton.disabled = true;
    activities.forEach(item => { item.disabled = true; });
    try {
      // Recheck current account and this activity before leaving the page.
      await readAccount();
      const outcome = await permission(button);
      if (outcome === 'ready') navigate(new URL(button.dataset.activityUrl, doc.baseURI).href);
      else await verify();
    } catch (error) {
      accountError(error);
    } finally {
      pending = false;
      loginButton.disabled = false;
      // On return/back navigation the same independent checks are required.
      if (active) await verify();
    }
  }));
  const refresh = () => {
    if (!pending && doc.visibilityState !== 'hidden' && Date.now() - lastVerification > 15000) {
      ready = verify();
    }
  };
  doc.addEventListener('visibilitychange', refresh);
  doc.defaultView?.addEventListener('focus', refresh);
  doc.defaultView?.addEventListener('pagehide', () => { ++generation; lock(); });
  doc.defaultView?.addEventListener('pageshow', event => { if (event.persisted) ready = verify(); });
  let ready = verify();
  return { get ready() { return ready; }, refresh: verify };
}

if (typeof document !== 'undefined') setupManagementEntry();
