const DASHBOARD_ORIGIN = 'https://taasiyeda2026.github.io';
export function embeddedDashboardLogin() {
 if (window.parent === window || new URLSearchParams(location.search).get('embed') !== 'dashboard') return Promise.resolve(false);
 const nonce = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2,'0')).join('');
 return new Promise((resolve,reject) => {
  const timer=setTimeout(()=>finish(new Error('לא ניתן לאמת את ההתחברות. יש לחזור לדשבורד ולהיכנס מחדש.')),15000);
  function finish(error){clearTimeout(timer);window.removeEventListener('message',receive);error?reject(error):resolve(true);}
  function receive(event){
   if(event.origin!==DASHBOARD_ORIGIN||event.source!==window.parent||event.data?.type!=='pairing:dashboard-session'||event.data?.nonce!==nonce)return;
   if(typeof event.data.access_token!=='string'||!event.data.access_token)return finish(new Error('נדרשת התחברות פעילה לדשבורד.'));
   sessionStorage.setItem('inspiration-teacher-access',event.data.access_token);finish();
  }
  window.addEventListener('message',receive);
  window.parent.postMessage({type:'pairing:dashboard-session-request',nonce},DASHBOARD_ORIGIN);
 });
}
