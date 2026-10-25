import {api,el,clear,button,field,notify,errorText,watchRoom,connection,cardViewer} from './common.js';

const main=document.querySelector('#app');
let code=new URL(location.href).searchParams.get('code')?.trim()||'';
let token=null,stopWatching=null,viewer=null,state=null,lastView='';
const storageKey=()=>`inspiration:participant:${code}`;
function readSaved(){try{return JSON.parse(localStorage.getItem(storageKey())||'null');}catch{return null;}}
function saveSaved(value){try{localStorage.setItem(storageKey(),JSON.stringify(value));return true;}catch{notify('הדפדפן חוסם שמירה במכשיר. השאירי את הדף פתוח כדי לשמור על ההשתתפות שלך.');return false;}}
function resetView(){viewer?.destroy();viewer=null;clear(main);}

function joinScreen() {
  resetView();connection(navigator.onLine?'מוכנה להצטרפות':'אין חיבור לאינטרנט',!navigator.onLine);
  const name=el('input',{name:'name',id:'player-name',maxlength:60,required:true,autocomplete:'given-name',placeholder:'השם הפרטי שלך'});
  const roomCode=el('input',{name:'code',id:'room-code',maxlength:64,required:true,value:code,autocomplete:'off',dir:'ltr',placeholder:'קוד החדר שקיבלת מהמדריכה'});
  const submit=el('button',{type:'submit',class:'primary'},'אני מצטרפת');
  const form=el('form',{},...(code?[]:[field('קוד החדר',roomCode)]),field('מה שמך?',name),el('div',{class:'actions'},submit));
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();if(!form.reportValidity())return;
    if(!code){code=roomCode.value.trim();const url=new URL(location.href);url.searchParams.set('code',code);history.replaceState(null,'',url);}
    const saved=readSaved()||{join_key:crypto.randomUUID()};saveSaved(saved);submit.disabled=true;
    try {
      const joined=await api('participant.join',{code,join_key:saved.join_key,name:name.value.trim()});
      token=joined.token;saveSaved({...saved,token});notify('הצטרפת בהצלחה! עוד רגע מתחילות.','success');
      await refresh();startWatching();
    }catch(error){notify(errorText(error));submit.disabled=false;}
  });
  main.append(el('section',{class:'panel intro'},el('span',{class:'eyebrow'},'קלף אחד. סיפור חדש. חיבור מפתיע.'),el('h1',{},'ברוכה הבאה לנושמות השראה!'),el('p',{class:'lead'},'במשחק הזה תפגשי אישה מעוררת השראה ותגלי מה מחבר את הסיפור שלה לסיפור של אישה אחרת.'),form,el('p',{class:'help'},'השם שלך יוצג למדריכה בלבד. אין צורך בחשבון או בסיסמה.')));
}

function personalCard(card) {
  const section=el('section',{class:'panel'},el('div',{class:'personal-header'},el('span',{class:'eyebrow'},`הקלף האישי שלך · ${card.number}`),el('h2',{},card.woman_name),el('p',{},card.field ? (card.field.startsWith('פורצת דרך ') ? card.field : 'פורצת דרך ב' + card.field) : '')));
  viewer=cardViewer(card,token);section.append(viewer.node);return section;
}

function render(next) {
  state=next;
  const fingerprint=JSON.stringify({room:next.room,player:next.player,taken:next.player?.card?null:next.taken});
  if(fingerprint===lastView)return;lastView=fingerprint;resetView();
  const {room,player,taken=[]}=next;
  const card=player?.card;
  if(room.phase==='ended') {
    main.append(el('section',{class:'panel waiting'},el('div',{class:'orbit','aria-hidden':'true'},'✧'),el('h1',{},'החיבור ממשיך איתך'),el('p',{},'המשחק הסתיים. תודה שהיית חלק מנושמות השראה!'),el('p',{},'ההצטרפות ובחירת הקלפים בחדר הזה סגורות.')));return;
  }
  if(room.phase==='waiting') {
    main.append(el('section',{class:'panel waiting'},el('span',{class:'badge'},'הצטרפת בהצלחה'),el('div',{class:'orbit','aria-hidden':'true'},'✧'),el('h1',{},'עוד רגע מגלות מי מחכה לכן!'),el('p',{},`${player.name}, המקום שלך בחדר שמור. המדריכה תפתח את בחירת הקלפים כשכולן יהיו כאן.`),el('p',{class:'help'},'אפשר להשאיר את המסך פתוח. הוא יתעדכן אוטומטית.')));return;
  }
  if(card) {
    if(room.phase==='matching') {
      main.append(el('section',{class:'panel'},el('span',{class:'badge'},'מוצאות חיבור בכיתה'),el('h1',{},'עכשיו תורך למצוא את החיבור!'),el('p',{class:'lead'},'הביטי בסמל שמופיע בקלף שלך. איפשהו בכיתה נמצאת משתתפת נוספת עם אותו הסמל. אולי אפילו שתיים!'),el('p',{},'קומי, הכירי את המשתתפות האחרות ומצאי את מי שקיבלה את הסמל התואם לשלך.')));
    }else if(room.phase==='activity') {
      main.append(el('section',{class:'panel'},el('span',{class:'badge'},'מפצחות את הקוד'),el('h1',{},'מצאתן את החיבור? נהדר!'),el('p',{class:'lead'},'עכשיו זה הזמן להכיר את הסיפורים שמאחורי הקלפים ולגלות מה משותף לנשים שפגשתן.'),el('p',{},'ממשיכות יחד עם דפי העבודה וההנחיות של המדריכה. הקלף שלך נשאר כאן בשבילך.')));
    }else main.append(el('div',{class:'personal-header'},el('span',{class:'badge success'},'הקלף שלך נשמר'),el('h1',{},'איזו אישה מעוררת השראה קיבלת?')));
    main.append(personalCard(card));return;
  }
  if(room.phase!=='choosing') {
    main.append(el('section',{class:'panel waiting'},el('h1',{},'המדריכה איתך'),el('p',{},'לא שויך לך קלף בחדר הזה. פני למדריכה כדי להמשיך יחד.')));return;
  }
  const board=el('div',{class:'board','aria-label':'לוח הקלפים לבחירה'});
  main.append(el('section',{class:'panel'},el('span',{class:'eyebrow'},`שלום ${player.name}`),el('h1',{},'איזו השראה מחכה לך?'),el('p',{},'לפנייך קלפים מסתוריים. בחרי קלף אחד וגלי איזו אישה מעוררת השראה מחכה לך. זכרי: אפשר לבחור רק פעם אחת!'),board));
  const unavailable=new Set(taken.map(Number));
  for(let number=1;number<=room.expected;number++) {
    const taken=unavailable.has(number);
    const cardButton=el('button',{type:'button',class:`card-back${taken?' taken':''}`,disabled:taken,'aria-label':taken?`קלף ${number} כבר נבחר`:`בחירת קלף ${number}`,'data-number':number},el('span',{class:'card-number'},number),...(taken?[el('small',{},'נבחר')]:[]));
    cardButton.addEventListener('click',async()=>{
      // A local pending state never declares ownership. Only the stored RPC
      // response below can reveal a personal card.
      board.querySelectorAll('button').forEach(node=>node.disabled=true);cardButton.classList.add('pending');
      try {render(await api('participant.claim',{number},{token}));}
      catch(error){notify(errorText(error));lastView='';try{await refresh();}catch{lastView='';render(state);}}
    });board.append(cardButton);
  }
}

async function refresh(){const next=await api('participant.state',{}, {token});render(next);}
function startWatching(){stopWatching?.();stopWatching=watchRoom(state?.room?.realtime_topic,refresh);}

async function start(){
  const saved=code?readSaved():null;
  if(!saved?.token){joinScreen();return;}
  token=saved.token;
  try {await refresh();startWatching();}
  catch(error){
    resetView();main.append(el('section',{class:'panel waiting'},el('h1',{},'חוזרות לחדר שלך'),el('p',{},errorText(error)),el('p',{},'ההשתתפות השמורה במכשיר עדיין כאן.'),el('div',{class:'actions'},button('ניסיון נוסף',start),button('חזרה למסך ההצטרפות',joinScreen,{class:'secondary'}))));
  }
}
window.addEventListener('pagehide',()=>{stopWatching?.();viewer?.destroy();});
start();
