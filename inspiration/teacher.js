import {api,el,clear,button,field,notify,errorText,requireTeacher,watchRoom,connection,phaseText,cardViewer} from './common.js';
import {createInviteTools} from './invite-tools.js';
import {symbolIcon} from './symbol-icons.js';

const main=document.querySelector('#app');
let me,roomId=new URL(location.href).searchParams.get('room'),state,stopWatching,lastState='';
const phases=['waiting','choosing','matching','activity','ended'];
async function action(name,payload={},message){
  try {const result=await api(name,{room_id:roomId,...payload});if(message)notify(message,'success');await refreshRoom(true);return result;}
  catch(error){notify(errorText(error));return null;}
}
function stat(value,label){return el('div',{class:'stat'},el('b',{},value??0),el('span',{},label));}
function textInput(value='',attrs={}){return el('input',{value,...attrs});}
function roomLink(room){const url=new URL('index.html',location.href);url.searchParams.set('code',room.code);return url.href;}
function stop(){stopWatching?.();stopWatching=null;lastState='';}

async function home(){
  stop();
  roomId=null;
  const url=new URL(location.href);
  url.searchParams.delete('room');
  history.replaceState(null,'',url);
  clear(main).append(el('section',{class:'panel teacher-home-loading'},el('p',{},'טוענות משחקים…')));
  try {
    const [listing,catalog]=await Promise.all([api('teacher.rooms'),api('teacher.catalog')]);
    const capacity=catalog?.capacity||{};
    const evenLimit=Number(capacity.max_even ?? (Number(capacity.pairs||0)*2));
    const oddLimit=Number(capacity.max_odd ?? (Number(capacity.pairs||0)*2+(capacity.triples?3:0)));
    const maximum=Math.max(evenLimit,oddLimit);

    const expected=textInput('',{
      id:'expected',type:'number',min:2,max:maximum||33,step:1,
      required:true,inputmode:'numeric',placeholder:'למשל 27'
    });
    const submit=el('button',{type:'submit',class:'primary'},'פתיחת משחק');
    const form=el('form',{class:'teacher-new-game-form'},
      field('מספר משתתפות',expected),submit);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!form.reportValidity())return;
      const count=Number(expected.value);
      if(!Number.isInteger(count)||count<2||(maximum>=2&&count>(count%2?oddLimit:evenLimit))){
        notify('מספר המשתתפות אינו מתאים למאגר הקלפים.');return;
      }
      submit.disabled=true;
      try {
        const created=await api('teacher.create',{expected:count});
        await openRoom(created.room?.id||created.id);
      }catch(error){
        notify(errorText(error));
        submit.disabled=false;
      }
    });

    const rooms=Array.isArray(listing)?listing:listing?.rooms||[];
    const now=Date.now();
    const active=rooms.filter(room=>
      room.phase!=='ended' &&
      (!room.expires_at||new Date(room.expires_at).getTime()>now)
    );
    const list=el('div',{class:'teacher-room-list'});
    for(const room of active){
      const date=new Date(room.created_at);
      const when=Number.isNaN(date.getTime())?'משחק':date.toLocaleString('he-IL',{
        day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'
      });
      list.append(el('article',{class:'teacher-room-row'},
        el('div',{class:'teacher-room-summary'},
          el('strong',{},when),
          el('span',{},`${room.expected} משתתפות`)),
        el('span',{class:'badge success'},phaseText[room.phase]||'פעיל'),
        button('ניהול',()=>openRoom(room.id),{class:'secondary'})));
    }
    clear(main).append(
      el('section',{class:'panel teacher-home-create'},
        el('h1',{},'ניהול משחקים'),form),
      el('section',{class:'panel teacher-home-rooms'},
        el('h2',{},'חדרים פעילים'),
        active.length?list:el('p',{class:'teacher-empty-rooms'},'אין חדרים פעילים')));
  }catch(error){
    if(error.status===401)return;
    clear(main).append(el('section',{class:'panel'},
      el('h1',{},'לא הצלחנו לטעון את החדרים'),
      el('p',{},errorText(error)),button('ניסיון נוסף',home)));
  }
}

async function openRoom(id){
  stop();roomId=id;const url=new URL(location.href);url.searchParams.set('room',id);history.replaceState(null,'',url);
  try{await refreshRoom(true);stopWatching=watchRoom(state.room.realtime_topic,refreshRoom);}catch(error){if(error.status===401)return;notify(errorText(error));await home();}
}
async function refreshRoom(force=false){
  const next=await api('teacher.state',{room_id:roomId});
  const fingerprint=JSON.stringify(next);state=next;
  const editing=document.activeElement?.matches('input,textarea,select');
  if(force||(!editing&&fingerprint!==lastState)){lastState=fingerprint;renderRoom();}
}

function renderRoom(){
  const {room,players=[],cards=[],groups=[],stats={}}=state;
  clear(main);
  const steps=el('div',{class:'steps','aria-label':'שלבי המשחק'},...phases.map(phase=>el('span',{class:phase===room.phase?'current':''},phaseText[phase])));
  const header=el('section',{class:'panel'},el('div',{class:'room-head'},el('div',{},el('span',{class:'eyebrow'},'החדר שלך'),el('h1',{},`נושמות השראה · ${room.expected}`)),button('כל החדרים',home,{class:'secondary'})),steps,el('div',{class:'stat-grid'},stat(stats.joined??players.length,'הצטרפו'),stat(stats.chosen??players.filter(p=>p.number).length,'בחרו קלף'),stat(stats.remaining??room.expected-(stats.chosen||0),'טרם בחרו'),stat(stats.complete_groups,'קבוצות עם כל הקלפים שנבחרו')));
  if(room.phase==='matching'||room.phase==='activity') {
    const progress=el('p',{class:'class-progress'},
      `אימתו חיבור: ${stats.verified??0} · המשיכו לפעילות: ${stats.continued??0}`);
    header.append(progress);
  }
  const joined=stats.joined??players.length;const chosen=stats.chosen??players.filter(p=>p.number).length;
  if(room.phase==='waiting')header.append(el('p',{class:'info'},`מחכות לעוד ${Math.max(0,room.expected-joined)} משתתפות. בחירת הקלפים תיפתח רק כאשר ${room.expected} המשתתפות רשומות בחדר.`));

  const controls=el('div',{class:'actions'});
  if(room.phase==='waiting')controls.append(button('מתחילות לבחור קלפים',()=>action('teacher.phase',{phase:'choosing'}),{disabled:joined!==room.expected}));
  if(room.phase==='choosing')controls.append(button('עוברות למציאת החיבורים',()=>action('teacher.phase',{phase:'matching'}),{disabled:chosen!==room.expected}));
  // Each verified participant opens her own hint and confirms continuation.
  if(room.phase!=='ended')controls.append(button('סיום המשחק',()=>{if(confirm('לסיים את המשחק? ההצטרפות ובחירת הקלפים יינעלו.'))action('teacher.phase',{phase:'ended'});},{class:'danger'}));
  header.append(controls);main.append(header);
  if(room.phase!=='ended'){
    const qr=el('div',{class:'qr-wrap','aria-label':'QR וקישור להצטרפות'});
    try { qr.append(createInviteTools(roomLink(room),message=>notify(message))); }
    catch { qr.append(el('p',{},'לא ניתן להציג QR כרגע.')); }
    const join=el('aside',{class:'panel invitation-panel'},el('h2',{},'הזמנת משתתפות'),qr);
    const operation=el('section',{class:'panel'},el('h2',{},'ניהול המשתתפות'));
    if(chosen===0){
      const expected=textInput(room.expected,{type:'number',min:Math.max(2,joined),step:1,required:true,inputmode:'numeric'});
      const resize=el('form',{},field('עדכון מספר המשתתפות לפני הבחירה הראשונה',expected),el('button',{type:'submit',class:'secondary'},'עדכון הכמות והחלוקה'));
      resize.addEventListener('submit',async(event)=>{event.preventDefault();if(resize.reportValidity()&&confirm('לעדכן את הכמות ולהגריל מחדש את הקלפים לפני הבחירה הראשונה?'))await action('teacher.resize',{expected:Number(expected.value)});});operation.append(resize);
    }else operation.append(el('p',{class:'info'},'נבחר קלף ראשון. החלוקה והמספור נעולים ולא ניתן להגריל אותם מחדש.'));
    if(room.phase==='waiting'){
      const name=textInput('',{maxlength:60,required:true,placeholder:'שם המשתתפת'});
      const manual=el('form',{},field('משתתפת ללא טלפון',name),el('button',{type:'submit',class:'secondary'},'הוספת משתתפת ידנית'));
      manual.addEventListener('submit',async(event)=>{event.preventDefault();if(manual.reportValidity())await action('teacher.manual_join',{name:name.value.trim()},'המשתתפת נוספה לחדר.');});operation.append(el('hr'),manual);
    }
    operation.append(el('p',{class:'help'},'לאחר בחירת הקלף, הוא נשמר למשתתפת גם אם יצאה מהמסך.'));
    main.append(el('div',{class:'split'},operation,join));
  }
  main.append(roster(players,cards,room));
  const groupList=el('div',{class:'group-list'});
  for(const group of groups){
    const members=players.filter(player=>player.group_id===group.id);
    groupList.append(el('article',{class:`group-item ${(group.chosen||0)===group.size?'complete':''}`},el('h3',{class:'match-heading'},symbolIcon(group.symbol),el('span',{class:'match-group-type'},group.size===3?'שלישייה':'זוג')),el('p',{class:'match-selection'},`${group.chosen||0} מתוך ${group.size} קלפים נבחרו`),...members.map(player=>el('p',{class:'match-member'},`${player.name} · ${player.woman_name||''}`))));
  }
  main.append(el('section',{class:'panel'},el('h2',{},'מפת הקלפים וההתאמות'),el('p',{},'כאן תוכלי לראות מי שייכת לכל זוג או שלישייה.'),groupList));
}

function roster(players,cards,room){
  const table=el('table',{},el('thead',{},el('tr',{},...['שם','קלף','האישה','סמל','מצב','פעולות'].map(text=>el('th',{scope:'col'},text)))));
  const body=el('tbody');const chosen=players.some(player=>player.number);
  for(const player of players){
    const controls=el('div',{class:'actions'});
    if(room.phase==='waiting'){
      controls.append(button('תיקון שם',async()=>{const name=prompt('השם המעודכן של המשתתפת:',player.name);if(name?.trim())await action('teacher.player_update',{player_id:player.id,name:name.trim()});},{class:'text-button'}));
      if(!chosen)controls.append(button('הסרת רישום',async()=>{if(confirm(`להסיר את הרישום של ${player.name}?`))await action('teacher.player_remove',{player_id:player.id});},{class:'text-button'}));
    }
    // Manual allocation uses the same atomic server claim as a phone choice.
    if(room.phase==='choosing'&&player.manual&&!player.number){
      const available=cards.filter(card=>!card.player_id);
      const select=el('select',{'aria-label':`בחירת קלף עבור ${player.name}`},el('option',{value:''},'מספר קלף'),...available.map(card=>el('option',{value:card.number},card.number)));
      controls.append(select,button('הקצאה ידנית',async()=>{if(select.value)await action('teacher.manual_claim',{player_id:player.id,number:Number(select.value)},'הקלף הוקצה וננעל.');},{class:'secondary'}));
    }
    if(player.number&&room.phase!=='ended'){
      controls.append(button('הצגת קלף',()=>{
        const card=cards.find(card=>card.number===player.number)||player;
        const media=cardViewer({...card,woman_name:player.woman_name,has_front:card.has_front??true,has_back:card.has_back??false},null,{room_id:room.id,number:player.number});
        const dialog=el('dialog',{class:'media-zoom','aria-label':`הקלף של ${player.name}`},el('div',{class:'actions'},button('סגירה',()=>dialog.close(),{class:'secondary'})),el('h2',{},`${player.name} · ${player.woman_name}`),media.node);
        dialog.addEventListener('close',()=>{media.destroy();dialog.remove();},{once:true});document.body.append(dialog);dialog.showModal();
      },{class:'text-button'}));
    }
    const lastSeen=player.last_seen?new Date(player.last_seen):null;
    const stale=lastSeen&&Date.now()-lastSeen.getTime()>90000;
    body.append(el('tr',{},el('td',{},player.name),el('td',{},player.number||'—'),el('td',{},player.woman_name||'—'),el('td',{},player.symbol?symbolIcon(player.symbol,true):'—'),el('td',{},el('span',{class:`badge ${player.number?'success':''}`},player.number?'הקלף נשמר':'טרם בחרה'),stale?el('small',{},' · החיבור לא עודכן לאחרונה'):null),el('td',{},controls)));
  }
  table.append(body);
  return el('section',{class:'panel'},el('h2',{},'המשתתפות בחדר'),players.length?el('div',{class:'table-wrap'},table):el('p',{class:'empty'},'מחכות למשתתפת הראשונה. הציגי את קוד ה־QR או שתפי את הקישור.'));
}

async function start(){me=await requireTeacher();if(!me)return;if(roomId)await openRoom(roomId);else await home();}
window.addEventListener('pagehide',stop);start();
