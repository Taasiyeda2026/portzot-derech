import { api, dashboardLogin, el, clear, button, field, watchRoom, message } from './common.js?v=f505500';
const app=document.querySelector('#app');
let me,activities=[],selected=null,stopWatching,stopHistory,dirty=false,working=false;
const phaseText={collecting:'השאלון פתוח',draft:'עריכת הקבוצות',published:'החלוקה פורסמה',closed:'הפעילות הסתיימה'};
const reportText={preparing:'הדוח בהכנה',ready:'טרם דווח',sending:'הדיווח בשליחה',sent:'דווח בהצלחה',failed:'השליחה נכשלה',unknown:'סטטוס השליחה אינו ידוע'};
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):'—';
let view=new URLSearchParams(location.search).get('view')==='groups'?'groups':'manage';
async function perform(fn){
 if(working)return;working=true;message('');app.setAttribute('aria-busy','true');
 const buttons=new Map([...document.querySelectorAll('button')].map(b=>[b,b.disabled]));buttons.forEach((_,b)=>b.disabled=true);
 try{await fn();}catch(error){message(error.message);}finally{working=false;app.setAttribute('aria-busy','false');buttons.forEach((disabled,b)=>{if(b.isConnected)b.disabled=disabled;});}
}
function login(){document.querySelector('#user-area').replaceChildren();clear(app).append(el('section',{class:'panel login-panel'},el('h2',{},'כניסה לניהול הפעילות'),button('כניסה דרך דשבורד תעשיידע',()=>perform(async()=>{await dashboardLogin();await boot();}),{class:'primary'})));}
function updateAddress(){const params=new URLSearchParams({view});if(selected)params.set('activity',selected.id);history.replaceState(null,'','?'+params);}
function showView(next){if(dirty&&next!==view){message('יש לשמור את השינויים לפני מעבר בין האזורים.');return;}view=next;document.querySelector('#manage-view').hidden=view!=='manage';document.querySelector('#groups-view').hidden=view!=='groups';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.view===view)));updateAddress();if(selected)renderRoom();}
function table(headings,rows){return el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},headings.map(h=>el('th',{scope:'col'},h)))),el('tbody',{},rows)));}
async function boot(){
 try{me=await api('teacher.me');}catch{login();return;}
 document.querySelector('#user-area').replaceChildren(el('span',{class:'user-name'},me.name),button('יציאה',()=>{sessionStorage.removeItem('inspiration-teacher-access');stopWatching?.();stopHistory?.();selected=null;login();},{class:'quiet'}));
 clear(app);
 const nav=el('nav',{class:'view-tabs','aria-label':'ניהול מציאת שותפות'},...['manage','groups'].map(v=>button(v==='manage'?'ניהול פעילות':'הקבוצות שלי',()=>showView(v),{'data-view':v,class:'quiet'})));
 const manage=el('section',{id:'manage-view'}),groups=el('section',{id:'groups-view'});
 app.append(nav,manage,groups);
 const canCreate=Date.parse(me.retention_until)>Date.now();
 const school=el('input',{required:true,maxlength:200,list:'schools',placeholder:'בחירת בית ספר','aria-label':'בית הספר'});
 const list=el('datalist',{id:'schools'});let schoolRows=[],searchTimer;
 school.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{try{schoolRows=(await api('teacher.schools',{query:school.value})).schools;list.replaceChildren(...schoolRows.map(s=>el('option',{value:`${s.school_name}${s.city?' · '+s.city:''}`})));}catch(error){message(error.message);}},300);});
 const klass=el('input',{required:true,maxlength:40,placeholder:'ח׳1','aria-label':'כיתה'}),count=el('input',{type:'number',required:true,min:2,max:40,value:24,'aria-label':'מספר משתתפות צפוי'});
 const form=el('form',{class:'create-form'},field('בית ספר',school),list,field('כיתה',klass),field('משתתפות צפויות',count),el('button',{type:'submit',class:'primary',disabled:!canCreate},'פתיחת פעילות'));
 form.addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{
  if(dirty&&!confirm('יש שינויים שלא נשמרו. לפתוח פעילות חדשה?'))return;
  const choice=schoolRows.find(s=>`${s.school_name}${s.city?' · '+s.city:''}`===school.value);
  const room=await api('teacher.create',{school:choice?.school_name||school.value,class_name:klass.value,expected:Number(count.value),school_id:choice?.id||null});
  dirty=false;await reloadList();await openActivity(room.id);
 });});
 manage.append(el('section',{class:'panel create-panel'},el('h2',{},'פתיחת פעילות'),...(!canCreate?[el('p',{role:'alert'},'לא ניתן לפתוח פעילות חדשה לאחר תום תקופת השמירה.')]:[]),form),el('div',{id:'activity-panel'}));
 const schoolFilter=el('input',{placeholder:'בית ספר','aria-label':'סינון לפי בית ספר'}),classFilter=el('input',{placeholder:'כיתה','aria-label':'סינון לפי כיתה'}),dateFilter=el('input',{type:'date','aria-label':'סינון לפי תאריך'}),teacherFilter=el('input',{placeholder:'מדריך/ה','aria-label':'סינון לפי מדריך'});
 const scope=el('select',{'aria-label':'היקף הפעילויות'},el('option',{value:'mine'},'הפעילויות שלי'),el('option',{value:'all'},'כל פעילויות המדריכים'));
 const rows=el('div',{id:'history'});
 const filters=el('div',{class:'filters'},schoolFilter,classFilter,field('תאריך',dateFilter),...(me.is_admin?[scope,teacherFilter]:[]),button('ניקוי סינון',()=>{for(const input of [schoolFilter,classFilter,dateFilter,teacherFilter])input.value='';renderHistory();},{class:'quiet'}));
 groups.append(el('section',{class:'panel'},el('h2',{},'הקבוצות שלי'),filters,rows),el('div',{id:'history-activity-panel'}));
 function renderHistory(){
  const matching=activities.filter(a=>a.school.includes(schoolFilter.value)&&a.class_name.includes(classFilter.value)&&(!dateFilter.value||a.activity_date===dateFilter.value)&&(!me.is_admin||((scope.value==='all'||a.owner_id===me.user_id)&&a.instructor_name.includes(teacherFilter.value))));
  clear(rows).append(matching.length?table(['תאריך','בית ספר','כיתה',...(me.is_admin?['מדריך/ה']:[]),'משתתפות','קבוצות','סטטוס פעילות','דיווח',''],matching.map(a=>el('tr',{},el('td',{},date(a.activity_date)),el('td',{},a.school),el('td',{},a.class_name),...(me.is_admin?[el('td',{},a.instructor_name)]:[]),el('td',{},a.participants.filter(p=>p.completed||p.manual).length),el('td',{},a.groups.length),el('td',{},phaseText[a.phase]),el('td',{},reportText[a.report?.status]||'טרם דווח'),el('td',{},button('צפייה',()=>perform(()=>openActivity(a.id,'groups')),{class:'quiet'}))))):el('p',{class:'empty'},'אין פעילויות להצגה בסינון הזה.'));
 }
 for(const control of [schoolFilter,classFilter,dateFilter,teacherFilter,scope])control.addEventListener('input',renderHistory);
 app._renderHistory=renderHistory;
 await reloadList();
 const requested=new URLSearchParams(location.search).get('activity');
 if(requested)await openActivity(requested,view);else{showView(view);if(selected)renderRoom();}
 stopHistory?.();stopHistory=watchRoom(null,async()=>{if(!working&&!dirty)await reloadList();});
}
async function reloadList(){activities=(await api('teacher.activities')).activities;app._renderHistory?.();}
async function openActivity(id,next='manage'){
 if(dirty&&!confirm('יש שינויים שלא נשמרו. לעבור לפעילות אחרת?'))return;
 stopWatching?.();dirty=false;selected=await api('teacher.state',{activity_id:id});
 view=next;document.querySelector('#manage-view').hidden=view!=='manage';document.querySelector('#groups-view').hidden=view!=='groups';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.view===view)));updateAddress();renderRoom();
 stopWatching=watchRoom(selected.topic,async()=>{if(working||dirty)return;const state=await api('teacher.state',{activity_id:id});if(JSON.stringify(state)!==JSON.stringify(selected)){selected=state;renderRoom();await reloadList();}});
}
function makeQR(target,url){const generator=globalThis.qrcode(0,'M');generator.addData(url);generator.make();const doc=new DOMParser().parseFromString(generator.createSvgTag({scalable:true,margin:2}),'image/svg+xml');target.append(document.importNode(doc.documentElement,true));}
function projectQR(url){
 if(document.querySelector('#qr-dialog'))return;
 const qr=el('div',{class:'projected-qr'}),dialog=el('dialog',{id:'qr-dialog',class:'qr-dialog','aria-label':'קוד QR להצטרפות לכיתה'},el('h2',{},'סרקי כדי להצטרף'),qr,button('סגירה',async()=>{if(document.fullscreenElement===dialog)await document.exitFullscreen().catch(()=>{});dialog.close();},{class:'quiet'}));
 document.body.append(dialog);makeQR(qr,url);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();dialog.requestFullscreen?.().catch(()=>{});
}
function confirmFinish(a,completed){
 if(document.querySelector('#finish-dialog'))return;
 const dialog=el('dialog',{id:'finish-dialog',class:'confirm-dialog','aria-labelledby':'finish-title'},el('h2',{id:'finish-title'},'סיום השאלון וחלוקה לקבוצות'),el('p',{},`${completed} מתוך ${a.expected} משתתפות סיימו את השאלון. להמשיך לחלוקה לקבוצות?`),el('p',{class:'muted'},'מילוי השאלון ייסגר. ניתן יהיה לצרף משתתפות ידנית ולערוך לפני הפרסום.'),el('div',{class:'actions'},button('המשך לחלוקה',()=>{dialog.close();void mutate('teacher.match');},{class:'primary'}),button('חזרה',()=>dialog.close(),{class:'quiet'})));
 dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}
function renderRoom(){
 clear(document.querySelector('#activity-panel'));clear(document.querySelector('#history-activity-panel'));
 const a=selected;if(!a)return;
 const participants=a.participants,completed=participants.filter(p=>p.completed).length;
 const content=el('section',{class:'panel activity-card'},el('header',{class:'activity-heading'},el('div',{},el('h2',{},`${a.school} · ${a.class_name}`),el('span',{class:'muted'},date(a.activity_date))),el('span',{class:'phase-badge'},phaseText[a.phase])));
 const metrics=el('div',{class:'metrics'},...[[a.expected,'צפויות'],[participants.length,'הצטרפו'],[completed,'סיימו']].map(([n,label])=>el('div',{class:'metric'},el('strong',{},n),el('span',{},label))));
 if(a.phase==='collecting'){
  const edit=el('details',{class:'expected-edit'},el('summary',{'aria-label':'עריכת מספר המשתתפות הצפוי'},'עריכה'));
  const number=el('input',{type:'number',min:2,max:40,value:a.expected,'aria-label':'עדכון מספר משתתפות צפוי'}),form=el('form',{},number,el('button',{type:'submit',class:'quiet'},'עדכון'));
  form.addEventListener('submit',e=>{e.preventDefault();void mutate('teacher.resize',{expected:Number(number.value)});});edit.append(form);metrics.firstChild.append(edit);
 }
 const progress=el('div',{class:'completion'},el('label',{for:'completion-progress'},`${completed} מתוך ${a.expected} סיימו`),el('progress',{id:'completion-progress',max:a.expected,value:completed}));
 const overview=el('div',{class:'activity-overview'},el('div',{},metrics,progress));
 if(a.phase==='collecting'){
  const url=new URL('questionnaire.html',location.href);url.search='';url.searchParams.set('room',a.code);url.searchParams.set('v','f505500');
  const qr=el('div',{id:'qr','aria-label':'קוד QR להצטרפות לפעילות'});
  overview.append(el('div',{class:'qr-side'},qr,el('div',{class:'invite-actions'},button('העתקת קישור',()=>perform(async()=>{await navigator.clipboard.writeText(url.href);message('הקישור הועתק.');}),{id:'copy-invite',class:'quiet'}),button('הצגת QR לכיתה',()=>projectQR(url.href),{class:'quiet'})),el('a',{id:'invite',href:url.href,hidden:true},'קישור הצטרפות')));
  queueMicrotask(()=>makeQR(qr,url.href));
 }
 content.append(overview,el('details',{class:'roster'},el('summary',{},`רשימת משתתפות (${participants.length})`),el('ul',{},participants.map(p=>el('li',{},el('span',{},p.name),el('span',{class:'muted'},p.completed?'סיימה':p.manual?'צורפה ידנית':a.phase==='collecting'?'ממלאת שאלון':'לא השלימה'))))));
 if(a.phase==='collecting')content.append(el('div',{class:'actions'},button('סיום השאלון וחלוקה לקבוצות',()=>confirmFinish(a,completed),{class:'primary',disabled:completed<2}),...(completed<2?[el('span',{class:'muted'},'נדרשות לפחות שתי משתתפות שסיימו.')]:[])));
 if(a.phase==='draft'&&!a.groups.length)content.append(button('המשך חלוקה לקבוצות',()=>mutate('teacher.match'),{class:'primary'}));
 if(a.groups.length)renderGroups(a,content);
 if(a.published_at)renderReporting(a,content);
 document.querySelector(view==='groups'?'#history-activity-panel':'#activity-panel').append(content);
}
function renderGroups(a,content){
 const editable=a.phase==='draft',draft=a.groups.map(g=>({...g,members:[...g.members]}));
 const names=new Map(a.participants.map(p=>[p.id,p.name])),cards=el('div',{class:'group-grid'}),warning=el('p',{class:'muted'});
 const publish=button('פרסום החלוקה הסופית',()=>{if(dirty){message('יש לשמור את השינויים לפני הפרסום.');return;}if(confirm('לפרסם את החלוקה? לאחר הפרסום לא ניתן לערוך אותה.'))void mutate('teacher.publish',{version:a.version});},{class:'primary'});
 function render(){
  cards.replaceChildren(...draft.map((g,index)=>el('section',{class:'group-card'},el('header',{},el('h3',{},`קבוצה ${index+1}`),el('span',{class:'group-count'},`${g.members.length} משתתפות`)),el('ul',{},g.members.map(id=>{
   const member=el('li',{class:'member'},el('span',{},names.get(id)));
   if(editable){const target=el('select',{'aria-label':`העברת ${names.get(id)} לקבוצה`},draft.map((_,i)=>el('option',{value:i},`קבוצה ${i+1}`)));target.value=String(index);target.addEventListener('change',()=>{const destination=draft[Number(target.value)];if(destination.members.length>=4){message('בקבוצה יכולות להיות עד ארבע משתתפות.');target.value=String(index);return;}g.members.splice(g.members.indexOf(id),1);destination.members.push(id);dirty=true;render();});member.append(target);}return member;
  })))));
  const invalid=draft.some(g=>g.members.length>0&&(g.members.length<2||g.members.length>4));
  warning.textContent=invalid?'לפני הפרסום יש להשאיר 2–4 משתתפות בכל קבוצה.':dirty?'יש שינויים שלא נשמרו.':'';
  publish.disabled=invalid||dirty;
 }
 content.append(el('h2',{},'הרכב הקבוצות'),cards);render();
 if(editable){
  content.append(warning,el('div',{class:'actions'},button('הוספת קבוצה',()=>{draft.push({members:[]});dirty=true;render();},{class:'quiet'}),button('שמירת השינויים',()=>perform(async()=>{selected=await api('teacher.save',{activity_id:a.id,version:a.version,groups:draft.filter(g=>g.members.length)});dirty=false;renderRoom();await reloadList();}),{class:'secondary'}),publish));
  const person=el('select',{'aria-label':'משתתפת לצירוף ידני'},el('option',{value:''},'משתתפת חדשה'),...a.participants.filter(p=>!p.completed&&!p.manual).map(p=>el('option',{value:p.id},p.name+' · לא השלימה')));
  const name=el('input',{maxlength:100,placeholder:'שם המשתתפת','aria-label':'שם משתתפת לצירוף ידני',required:true});
  person.addEventListener('change',()=>{name.hidden=!!person.value;name.required=!person.value;});
  const group=el('select',{'aria-label':'קבוצה לצירוף ידני'},...a.groups.map((g,i)=>el('option',{value:i+1,disabled:g.members.length>=4},`קבוצה ${i+1}${g.members.length>=4?' · מלאה':''}`)),el('option',{value:a.groups.length+1},'קבוצה חדשה'));
  group.value=String(a.groups.findIndex(g=>g.members.length<4)+1||a.groups.length+1);
  const form=el('form',{class:'manual-form'},field('צירוף ידני',person),name,field('שיוך לקבוצה',group),el('button',{type:'submit',class:'secondary'},'הוספה לקבוצה'));
  form.addEventListener('submit',event=>{event.preventDefault();if(dirty){message('יש לשמור את שינויי הקבוצות לפני צירוף משתתפת.');return;}void mutate('teacher.manual.add',{version:a.version,participant_id:person.value||null,name:name.value.trim(),group_number:Number(group.value)});});
  content.append(el('details',{class:'manual-panel'},el('summary',{},'צירוף משתתפת ידנית'),form));
 }
}
function renderReporting(a,content){
 content.append(el('div',{class:'report-actions'},el('p',{role:'status'},reportText[a.report?.status]||'טרם דווח'),el('div',{class:'actions'},button('הורדת PDF',()=>perform(async()=>{const blob=await api('teacher.download',{activity_id:a.id},null,true);const url=URL.createObjectURL(blob),link=el('a',{href:url,download:`פורצות דרך_${a.school}_${a.class_name}_${a.activity_date}.pdf`});link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}),{class:'secondary'}),button('דיווח הקבוצות',()=>perform(async()=>{const result=await api('teacher.report',{activity_id:a.id});message(result.status==='sent'?'השליחה למשרד אושרה.':reportText[result.status]||'הדוח נשמר.');selected=await api('teacher.state',{activity_id:a.id});renderRoom();await reloadList();}),{class:'primary',disabled:['sent','sending','unknown'].includes(a.report?.status)}))));
 if(me.is_admin&&a.report?.status==='unknown')content.append(button('תיעוד בירור סטטוס שליחה',()=>perform(async()=>{const verification=prompt('לאחר בדיקה בתיבת המשרד: מה נבדק ומה נמצא? (לפחות 10 תווים)');if(!verification)return;const sent=confirm('אושרה קבלת הדוח במשרד? אישור = התקבל; ביטול = נבדק ואושר שלא נשלח.');await api('admin.report.resolve',{activity_id:a.id,status:sent?'sent':'failed',verification});selected=await api('teacher.state',{activity_id:a.id});renderRoom();await reloadList();}),{class:'quiet'}));
}
function mutate(action,payload={}){return perform(async()=>{selected=await api(action,{activity_id:selected.id,...payload});dirty=false;renderRoom();await reloadList();});}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
void boot().catch(error=>message(error.message));
