export const SUPABASE_URL = 'https://szinlhjuwyiyszdpsdop.supabase.co';
export const PUBLISHABLE_KEY = 'sb_publishable_k0IbDJlgPA9KTVuDWrCyFw_Zsa5kZIM';
const DASHBOARD_ORIGIN = 'https://taasiyeda2026.github.io';
const ENDPOINT = `${SUPABASE_URL}/functions/v1/inspiration-game`;
const TEACHER_ACCESS_KEY = 'inspiration-teacher-access';
let client;
let noticeTimer;

export function supabaseClient() {
  if (!globalThis.supabase?.createClient) throw new Error('לא ניתן לטעון את רכיב החיבור. נסי לרענן את הדף.');
  return client ||= globalThis.supabase.createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    accessToken: async()=>sessionStorage.getItem(TEACHER_ACCESS_KEY)||null,
    auth: {detectSessionInUrl:false,persistSession:false,autoRefreshToken:false}
  });
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key,value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2),value);
    else if (key === 'value' || key === 'checked' || key === 'disabled') node[key] = value;
    else node.setAttribute(key,value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
export function clear(node) { node.replaceChildren(); return node; }
export function button(label, fn, attrs = {}) {return el('button',{type:'button',class:'primary',...attrs,onclick:fn},label);}
export function field(label,input) {return el('label',{},label,input);}
export function errorText(error) {return error?.message || 'משהו לא הסתדר. נסי שוב בעוד רגע.';}
export function notify(message,type='error') {
  let node = document.querySelector('#notice');
  if (!node) {node = el('div',{id:'notice',class:'notice',role:'alert'});document.body.append(node);}
  clearTimeout(noticeTimer);node.textContent=message;node.className=`notice ${type}`;node.hidden=false;
  noticeTimer=setTimeout(()=>{node.hidden=true;},type==='success'?5000:10000);
}
export function connection(text,offline=false) {const node=document.querySelector('#connection');if(node){node.textContent=text;node.classList.toggle('offline',offline);}}

async function teacherToken() {
  const token=sessionStorage.getItem(TEACHER_ACCESS_KEY);
  if(!token) {
    const expired=new Error('ההתחברות הסתיימה. התחברי שוב דרך הדשבורד.');expired.status=401;throw expired;
  }
  return token;
}
async function readResponse(response,binary=false) {
  if (!response.ok) {
    const data=await response.json().catch(()=>({}));
    const error=new Error(data.error?.message || (response.status===401?'ההתחברות הסתיימה. התחברי שוב.':'לא ניתן לבצע את הפעולה כרגע. נסי שוב.'));
    error.code=data.error?.code;error.status=response.status;throw error;
  }
  return binary ? response.blob() : response.json();
}
export async function api(action,payload={},options={}) {
  const headers={'Content-Type':'application/json',apikey:PUBLISHABLE_KEY};
  const staff=action.startsWith('teacher.') || action.startsWith('admin.');
  if (staff) {
    try {headers.Authorization=`Bearer ${await teacherToken()}`;}
    catch(error) {if(action!=='teacher.me')loginPanel('ההתחברות הסתיימה. התחברי שוב כדי לחזור לחדר שלך.');throw error;}
  }
  let response;
  try {response=await fetch(ENDPOINT,{method:'POST',headers,cache:'no-store',referrerPolicy:'no-referrer',body:JSON.stringify({action,payload,...(options.token?{token:options.token}:{})})});}
  catch {connection('אין חיבור כרגע. ננסה שוב כשיחזור.',true);throw new Error('לא הצלחנו להגיע לחדר. בדקי את החיבור לאינטרנט ונסי שוב.');}
  try {return await readResponse(response,options.binary);}
  catch(error){if(staff&&error.status===401&&action!=='teacher.me')loginPanel('ההתחברות הסתיימה. התחברי שוב כדי לחזור לחדר שלך.');throw error;}
}
export async function upload(file) {
  try {
    const body=new FormData();body.set('action','admin.upload');body.set('file',file);
    const response=await fetch(ENDPOINT,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${await teacherToken()}`},body,cache:'no-store'});
    return await readResponse(response);
  } catch(error) {
    if(error.status===401)loginPanel('ההתחברות הסתיימה. התחברי שוב כדי להמשיך בניהול התוכן.');
    throw error;
  }
}

export function loginPanel(message='כניסה עם חשבון הדשבורד שלך') {
  const main=document.querySelector('#app');if(main.querySelector('[data-login-panel]'))return;clear(main);
  const login=button('כניסה דרך דשבורד תעשיידע',async()=>{
    login.disabled=true;
    try {await dashboardLogin();location.reload();}catch(error){notify(errorText(error));login.disabled=false;}
  });
  const adminPanel=document.body?.dataset?.page==='admin';
  main.append(el('section',{class:'panel intro','data-login-panel':true},
    el('span',{class:'eyebrow'},adminPanel?'לוח האדמין של נושמות השראה':'מרחב המדריכה'),
    el('h1',{},adminPanel?'כניסה ללוח האדמין של המשחק':'מזמינות את ההשראה לכיתה'),
    el('p',{class:'lead'},message),
    el('p',{},'יש להתחבר עם חשבון הדשבורד הקיים. אם החשבון כבר מחובר, אין צורך להזין סיסמה נוספת.'),
    el('div',{class:'actions'},login),
    el('p',{class:'help'},'ההזדהות מתבצעת בחלון הדשבורד. הפעילות וניהול הקלפים נשארים באתר פורצות דרך.')));
}

export async function requireTeacher() {
  try {
    const me=await api('teacher.me');
    if(!me.can_manage && !me.is_admin) {
      clear(document.querySelector('#app')).append(el('section',{class:'panel intro'},el('h1',{},'אין הרשאת ניהול משחק'),el('p',{},'לחשבון הזה לא הוענקה הרשאה לניהול נושמות השראה. פני למנהלת המערכת.')));
      return null;
    }
    const signout=document.querySelector('#signout');
    if(signout){signout.hidden=false;signout.onclick=()=>{sessionStorage.removeItem(TEACHER_ACCESS_KEY);location.reload();};}
    connection('מחוברת בבטחה');return me;
  } catch(error) {loginPanel(error.status===403?'החשבון אינו מורשה לניהול משחק. התחברי עם חשבון מתאים.':undefined);return null;}
}

export async function dashboardLogin() {
  const state=Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
  const url=new URL(`${DASHBOARD_ORIGIN}/dashboard_system/inspiration-bridge.html`);
  url.searchParams.set('origin',location.origin);url.searchParams.set('state',state);
  const popup=window.open(url.href,'inspiration-dashboard-login','popup,width=580,height=760');
  if(!popup)throw new Error('אפשרי חלונות קופצים עבור האתר ולחצי שוב על כניסה.');
  return new Promise((resolve,reject)=>{
    let timer,poll;
    const cleanup=()=>{window.removeEventListener('message',receive);clearTimeout(timer);clearInterval(poll);};
    const receive=async(event)=>{
      if(event.origin!==DASHBOARD_ORIGIN || event.source!==popup || event.data?.type!=='inspiration:session' || event.data?.state!==state)return;
      cleanup();
      if(event.data.error){popup.close();reject(new Error('לא ניתן לאמת את ההתחברות. נסי להיכנס שוב בדשבורד.'));return;}
      if(typeof event.data.access_token!=='string'||!event.data.access_token){popup.close();reject(new Error('הדשבורד לא החזיר התחברות תקפה.'));return;}
      try {sessionStorage.setItem(TEACHER_ACCESS_KEY,event.data.access_token);popup.close();resolve();}
      catch {popup.close();reject(new Error('הדפדפן חוסם את שמירת ההתחברות בכרטיסייה. אפשרי אחסון באתר ונסי שוב.'));}
    };
    window.addEventListener('message',receive);
    timer=setTimeout(()=>{cleanup();popup.close();reject(new Error('חלון ההתחברות פג. לחצי שוב כדי להתחבר.'));},180000);
    poll=setInterval(()=>{if(popup.closed){cleanup();reject(new Error('חלון ההתחברות נסגר. אפשר לנסות שוב.'));}},1000);
  });
}

// Broadcasts carry no private data. They only invalidate a state fetched with
// the verified teacher session or personal participant bearer. A forged message
// cannot change a room or reveal a card.
export function watchRoom(topic,refresh) {
  let stopped=false,running=false,retry=15000,timer,channel;
  const schedule=()=>{clearTimeout(timer);if(!stopped)timer=setTimeout(run,retry);};
  async function run() {
    if(stopped)return;
    if(document.hidden){schedule();return;}
    if(running)return;
    running=true;
    try {await refresh();retry=15000;connection('מעודכן');}
    catch {retry=Math.min(60000,retry*2);connection(navigator.onLine?'החיבור מתחדש…':'אין חיבור כרגע. הבחירה השמורה נשמרת.',true);}
    finally {running=false;schedule();}
  }
  try {
    if(topic)channel=supabaseClient().channel(topic).on('broadcast',{event:'invalidate'},()=>{clearTimeout(timer);timer=setTimeout(run,150);}).subscribe(status=>{if(status==='SUBSCRIBED'){connection('עדכונים בזמן אמת');run();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){connection('החיבור מתחדש…',true);}});
  }catch {connection('החיבור מתחדש…',true);}
  const online=()=>run();const visible=()=>{if(!document.hidden)run();};
  window.addEventListener('online',online);document.addEventListener('visibilitychange',visible);schedule();
  return ()=>{stopped=true;clearTimeout(timer);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible);if(channel)supabaseClient().removeChannel(channel);};
}

export const phaseText={waiting:'ממתינות להצטרפות',choosing:'בוחרות קלפים',matching:'מוצאות חיבור בכיתה',activity:'מפצחות את הקוד',ended:'המשחק הסתיים'};

export function cardViewer(card,token,teacherContext=null) {
  let destroyed=false,currentSide=card.has_front?'front':'back',pageNumber=1,pages=1,pdfDocument=null,currentBlobUrl=null,pdfModule;
  const body=el('div',{class:'card-viewer reveal'});
  const status=el('p',{class:'viewer-status',role:'status'});
  const controls=el('div',{class:'viewer-controls'});
  const outer=el('section',{class:'personal-card'},body,status,controls);
  const sideButton=button('לצד השני',()=>load(currentSide==='front'?'back':'front'),{class:'secondary'});
  const previous=button('העמוד הקודם',()=>{pageNumber--;renderPdf();},{class:'secondary'});
  const next=button('העמוד הבא',()=>{pageNumber++;renderPdf();},{class:'secondary'});
  const zoom=button('הגדלת הקלף',()=>{
    const media=body.querySelector('img,canvas');if(!media)return;
    const dialog=el('dialog',{class:'media-zoom','aria-label':'הקלף בתצוגה מוגדלת'});
    const close=button('סגירה',()=>dialog.close(),{class:'secondary'});
    dialog.append(el('div',{class:'actions'},close));
    if(media.tagName==='CANVAS'){const canvas=el('canvas');canvas.width=media.width;canvas.height=media.height;canvas.getContext('2d').drawImage(media,0,0);dialog.append(canvas);}else dialog.append(el('img',{src:media.src,alt:media.alt}));
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
  },{class:'secondary'});
  if(card.has_front&&card.has_back)controls.append(sideButton);
  controls.append(previous,next,zoom);
  function controlsState(){previous.hidden=next.hidden=!pdfDocument||pages<2;previous.disabled=pageNumber<=1;next.disabled=pageNumber>=pages;sideButton.disabled=false;zoom.disabled=!body.querySelector('img,canvas');}
  async function renderPdf(){
    if(!pdfDocument||destroyed)return;
    try {
      const page=await pdfDocument.getPage(pageNumber);const base=page.getViewport({scale:1});
      const scale=Math.min(2,window.devicePixelRatio||1)*Math.min(560,window.innerWidth-56)/base.width;
      const viewport=page.getViewport({scale});const canvas=el('canvas',{'aria-label':`${card.woman_name} — עמוד ${pageNumber} מתוך ${pages}`,role:'img'});
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      if(destroyed)return;clear(body).append(canvas);status.textContent=`עמוד ${pageNumber} מתוך ${pages}`;controlsState();
    }catch{status.textContent='לא ניתן להציג את הקלף כרגע. נסי שוב כשיש חיבור.';controlsState();}
  }
  async function load(side){
    currentSide=side;pageNumber=1;pdfDocument?.destroy();pdfDocument=null;if(currentBlobUrl){URL.revokeObjectURL(currentBlobUrl);currentBlobUrl=null;}
    sideButton.disabled=true;zoom.disabled=true;clear(body).append(el('p',{class:'info'},'טוענות את הקלף שלך…'));status.textContent='';controlsState();
    try {
      const blob=teacherContext
        ? await api('teacher.asset',{...teacherContext,side},{binary:true})
        : await api('participant.asset',{side},{token,binary:true});
      if(destroyed)return;
      if(blob.type==='application/pdf'){
        pdfModule ||= await import('./vendor/pdf.mjs');pdfModule.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
        pdfDocument=await pdfModule.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false}).promise;pages=pdfDocument.numPages;await renderPdf();
      }else if(/^image\/(png|jpeg|webp)$/.test(blob.type)){
        currentBlobUrl=URL.createObjectURL(blob);clear(body).append(el('img',{src:currentBlobUrl,alt:`הקלף של ${card.woman_name}`,draggable:'false'}));status.textContent=currentSide==='front'?'הצד הקדמי של הקלף':'הצד האחורי של הקלף';controlsState();
      }else throw new Error('unsupported');
    }catch(error){if(!destroyed){clear(body).append(el('p',{class:'error-inline'},errorText(error)),button('ניסיון נוסף',()=>load(currentSide),{class:'secondary'}));controlsState();}}
  }
  load(currentSide);
  return {node:outer,destroy(){destroyed=true;pdfDocument?.destroy();if(currentBlobUrl)URL.revokeObjectURL(currentBlobUrl);}};
}
