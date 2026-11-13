import { api, dashboardLogin, el, clear, button, field, watchRoom, message } from './common.js';
const app=document.querySelector('#app');
let me,activities=[],selected=null,stopWatching,dirty=false,working=false;
const statusText={preparing:'בהכנה',ready:'דוח מוכן',sending:'בשליחה – אין ללחוץ שוב',sent:'השליחה אושרה',failed:'השליחה נדחתה – אפשר לנסות שוב',unknown:'תוצאת שליחה לא ידועה – נדרש בירור במשרד'};
async function perform(fn){if(working)return;working=true;document.querySelectorAll('button').forEach(b=>{b.dataset.previouslyDisabled=String(b.disabled);b.disabled=true;});message('');try{await fn();}catch(e){message(e.message);}finally{working=false;document.querySelectorAll('button').forEach(b=>{if(b.dataset.previouslyDisabled!==undefined){b.disabled=b.dataset.previouslyDisabled==='true';delete b.dataset.previouslyDisabled;}});}}
function login(){clear(app).append(el('section',{class:'panel'},el('h2',{},'כניסה אישית לניהול הפעילות'),button('כניסה דרך דשבורד תעשיידע',()=>perform(async()=>{await dashboardLogin();await boot();}))));}
async function boot(){
 try{me=await api('teacher.me');}catch{login();return;}
 clear(app);
 app.append(el('p',{},`מחוברת: ${me.name}`),button('יציאה',()=>{sessionStorage.removeItem('inspiration-teacher-access');stopWatching?.();login();},{class:'secondary'}));
 if(!me.retention_days)app.append(el('p',{role:'alert'},'פתיחת פעילות תתאפשר לאחר הגדרת מדיניות שמירת דוחות מאושרת.'));
 const school=el('input',{required:true,maxlength:200,list:'schools',placeholder:'הקלידי לבחירה או הזיני בית ספר אחר','aria-label':'בית הספר'});
 const list=el('datalist',{id:'schools'});let schoolRows=[],searchTimer;
 school.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{try{schoolRows=(await api('teacher.schools',{query:school.value})).schools;list.replaceChildren(...schoolRows.map(s=>el('option',{value:`${s.school_name}${s.city?' · '+s.city:''}`})));}catch(e){message(e.message);}},300);});
 const klass=el('input',{required:true,maxlength:40,placeholder:'למשל ח׳1'}),count=el('input',{type:'number',required:true,min:2,max:40,value:24});
 const form=el('form',{},field('בית ספר',school),list,field('כיתה',klass),field('מספר משתתפות צפוי (2–40)',count),el('button',{type:'submit',class:'primary',disabled:!me.retention_days},'פתיחת פעילות'));
 form.addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{
  const choice=schoolRows.find(s=>`${s.school_name}${s.city?' · '+s.city:''}`===school.value);
  const room=await api('teacher.create',{school:choice?.school_name||school.value,class_name:klass.value,expected:Number(count.value),school_id:choice?.id||null});
  await reloadList();await open(room.id);
 });});
 app.append(el('section',{class:'panel'},el('h2',{},'פתיחת פעילות'),el('p',{},`מדריך/ה: ${me.name} · התאריך נקבע אוטומטית לפי שעון ישראל`),form));
 app.append(el('section',{id:'activity-panel'}));
 const schoolFilter=el('input',{placeholder:'סינון לפי בית ספר','aria-label':'סינון לפי בית ספר'}),classFilter=el('input',{placeholder:'סינון לפי כיתה','aria-label':'סינון לפי כיתה'}),teacherFilter=el('input',{placeholder:'סינון לפי מדריך','aria-label':'סינון לפי מדריך'});
 const filters=el('div',{class:'filters'},schoolFilter,classFilter,...(me.is_admin?[teacherFilter]:[]));
 const history=el('div',{id:'history'});
 for(const input of [schoolFilter,classFilter,teacherFilter])input.addEventListener('input',renderHistory);
 function renderHistory(){
  const rows=[];
  for(const a of activities){
   if(!a.school.includes(schoolFilter.value)||!a.class_name.includes(classFilter.value)||(me.is_admin&&!a.instructor_name.includes(teacherFilter.value)))continue;
   const groups=a.groups.length?a.groups:[null];
   for(const g of groups)rows.push(el('tr',{},el('td',{},a.activity_date),el('td',{},a.school),el('td',{},a.class_name),...(me.is_admin?[el('td',{},a.instructor_name)]:[]),el('td',{},g?.groupNumber||'—'),el('td',{class:'names'},g?.memberNames.join(', ')||'טרם נוצרו קבוצות'),el('td',{},statusText[a.report?.status]||'טרם דווח'),el('td',{},button('פתיחה',()=>perform(()=>open(a.id))))));
  }
  clear(history).append(table(['תאריך','בית ספר','כיתה',...(me.is_admin?['מדריך/ה']:[]),'קבוצה','משתתפות','דיווח',''],rows));
 }
 app.append(el('section',{class:'panel'},el('h2',{},me.is_admin?'כל הקבוצות · ניהול אדמין':'הקבוצות שלי'),filters,history));
 app._renderHistory=renderHistory;
 await reloadList();
 const requested=new URLSearchParams(location.search).get('activity');if(requested)await open(requested);
}
function table(headings,rows){return el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},headings.map(h=>el('th',{scope:'col'},h)))),el('tbody',{},rows)));}
async function reloadList(){activities=(await api('teacher.activities')).activities;app._renderHistory?.();}
async function open(id){
 if(dirty&&!confirm('יש שינויים שלא נשמרו. לעבור לפעילות אחרת?'))return;
 stopWatching?.();dirty=false;selected=await api('teacher.state',{activity_id:id});renderRoom();
 history.replaceState(null,'',`?activity=${encodeURIComponent(id)}`);
 stopWatching=watchRoom(selected.topic,async()=>{
  if(working||dirty)return;
  const state=await api('teacher.state',{activity_id:id});
  if(JSON.stringify(state)!==JSON.stringify(selected)){selected=state;renderRoom();await reloadList();}
 });
}
function renderRoom(){
 const a=selected,panel=document.querySelector('#activity-panel');clear(panel);if(!a)return;
 const participants=a.participants,completed=participants.filter(p=>p.completed).length;
 const content=el('section',{class:'panel'},el('h2',{},`${a.school} · ${a.class_name}`),el('p',{},`${a.instructor_name} · ${a.activity_date}`),el('p',{},`צפויות: ${a.expected} | הצטרפו: ${participants.length} | סיימו: ${completed}`));
 content.append(el('div',{class:'roster'},participants.map(p=>el('p',{},`${p.name} — ${p.completed?'סיימה':'ממלאת שאלון'}`))));
 if(a.phase==='collecting'){
  const join=new URL('questionnaire.html',location.href);join.search='';join.searchParams.set('room',a.code);
  const invite=el('a',{id:'invite',href:join.href,target:'_blank',rel:'noopener noreferrer'},join.href);
  const qr=el('div',{id:'qr','aria-label':'קוד QR להצטרפות לפעילות'});
  content.append(invite,qr,el('p',{class:'muted'},'קישור זה מיועד לכיתה זו בלבד. אין להעבירו מחוץ לפעילות.'),button('העתקת הקישור',()=>perform(async()=>{await navigator.clipboard.writeText(join.href);message('הקישור הועתק.');})));
  queueMicrotask(()=>{const generator=globalThis.qrcode(0,'M');generator.addData(join.href);generator.make();const doc=new DOMParser().parseFromString(generator.createSvgTag({scalable:true,margin:2}),'image/svg+xml');qr.append(document.importNode(doc.documentElement,true));});
  const n=el('input',{type:'number',min:Math.max(2,participants.length),max:40,value:a.expected,'aria-label':'מספר משתתפות צפוי'});
  content.append(el('div',{class:'actions'},n,button('עדכון מספר משתתפות',()=>mutate('teacher.resize',{expected:Number(n.value)}))));
 }
 const actions=el('div',{class:'actions'});
 if(['collecting','draft'].includes(a.phase))actions.append(button('יצירת חלוקה אוטומטית',()=>mutate('teacher.match')));
 if(a.phase!=='closed')actions.append(button('סיום פעילות',()=>{if(confirm('לסגור את הפעילות להצטרפות ולשינויים? הקבוצות והדוח יישמרו.'))mutate('teacher.close');},{class:'secondary'}));
 content.append(actions);
 if(a.groups.length){
  const edit=a.phase==='draft';
  const draft=a.groups.map(g=>({...g,members:[...g.members]}));
  const names=new Map(participants.map(p=>[p.id,p.name]));
  const rows=el('div');
  function renderGroups(){
   clear(rows).append(table(['קבוצה','שמות המשתתפות','מספר'],draft.map((g,i)=>el('tr',{},el('td',{},i+1),el('td',{class:'names'},g.members.map(id=>{
    if(!edit)return el('div',{},names.get(id));
    const select=el('select',{'aria-label':`העברת ${names.get(id)} לקבוצה`},draft.map((_,index)=>el('option',{value:index},`קבוצה ${index+1}`)));select.value=String(i);
    select.addEventListener('change',()=>{g.members.splice(g.members.indexOf(id),1);draft[Number(select.value)].members.push(id);dirty=true;renderGroups();});
    return el('div',{class:'member'},el('span',{},names.get(id)),select);
   })),el('td',{},g.members.length)))));
  }
  renderGroups();content.append(el('h2',{},`חלוקת קבוצות · ${participants.length} משתתפות · ${a.groups.length} קבוצות`),rows);
  if(edit)content.append(el('p',{class:'muted'},'אפשר להעביר משתתפות בין קבוצות ולשמור. כל קבוצה חייבת לכלול 2–4 משתתפות. הפרסום נועל את החלוקה לעריכה.'),el('div',{class:'actions'},
   button('הוספת קבוצה',()=>{draft.push({members:[]});dirty=true;renderGroups();},{class:'secondary'}),
   button('שמירת השינויים',()=>perform(async()=>{selected=await api('teacher.save',{activity_id:a.id,version:a.version,groups:draft.filter(g=>g.members.length)});dirty=false;renderRoom();await reloadList();})),
   button('פרסום החלוקה הסופית',()=>{if(dirty){message('יש לשמור את השינויים לפני הפרסום.');return;}if(confirm('לפרסם למשתתפות את החלוקה? לאחר הפרסום לא ניתן לערוך אותה.'))mutate('teacher.publish',{version:a.version});})
  ));
 }
 if(a.published_at){
  content.append(el('p',{role:'status'},statusText[a.report?.status]||'החלוקה פורסמה. הדוח טרם נשלח.'),el('div',{class:'actions'},
   button('דיווח הקבוצות',()=>perform(async()=>{const result=await api('teacher.report',{activity_id:a.id});message(result.status==='sent'?'מנגנון הדואר אישר את השליחה למשרד.':statusText[result.status]||'הדוח נשמר.');selected=await api('teacher.state',{activity_id:a.id});renderRoom();await reloadList();}),{class:'primary',disabled:['sent','sending','unknown'].includes(a.report?.status)}),
   button('הורדת PDF',()=>perform(async()=>{const blob=await api('teacher.download',{activity_id:a.id},null,true);const url=URL.createObjectURL(blob),link=el('a',{href:url,download:`פורצות דרך_${a.school}_${a.class_name}_${a.activity_date}.pdf`});link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}),{class:'secondary'})
  ));
  if(me.is_admin&&a.report?.status==='unknown')content.append(button('תיעוד בירור סטטוס שליחה',()=>perform(async()=>{
   const verification=prompt('לאחר בדיקה בפועל בתיבת המשרד: תארי מה נבדק ומה נמצא (לפחות 10 תווים).');if(!verification)return;
   const sent=confirm('האם אושרה קבלת הדוח במשרד? אישור = התקבל; ביטול = נבדק ואושר שלא נשלח.');
   await api('admin.report.resolve',{activity_id:a.id,status:sent?'sent':'failed',verification});selected=await api('teacher.state',{activity_id:a.id});renderRoom();await reloadList();
  }),{class:'secondary'}));
 }
 panel.append(content);
}
function mutate(action,payload={}){return perform(async()=>{selected=await api(action,{activity_id:selected.id,...payload});dirty=false;renderRoom();await reloadList();});}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
void boot().catch(e=>message(e.message));
