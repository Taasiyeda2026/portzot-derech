import { dashboardLogin, el, clear, button, field, watchRoom } from '../inspiration/common.js';
import { embeddedDashboardLogin } from './dashboard-session.js';
export { dashboardLogin, el, clear, button, field, watchRoom };
export const ENDPOINT='https://szinlhjuwyiyszdpsdop.supabase.co/functions/v1/pairing-groups';
export const KEY='sb_publishable_k0IbDJlgPA9KTVuDWrCyFw_Zsa5kZIM';
export async function api(action,payload={},token=null,binary=false,retried=false){
 const headers={'Content-Type':'application/json',apikey:KEY};
 if(action.startsWith('teacher.')||action.startsWith('admin.')){
  const access=sessionStorage.getItem('inspiration-teacher-access');
  if(!access)throw new Error('יש להתחבר דרך דשבורד תעשיידע.');
  headers.Authorization=`Bearer ${access}`;
 }
 const response=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({action,payload,token}),cache:'no-store',referrerPolicy:'no-referrer'}).catch(()=>{throw new Error('אין חיבור למערכת כרגע. התשובות שמורות בכרטיסייה. נסי שוב.');});
 if(response.status===401&&!retried&&(action.startsWith('teacher.')||action.startsWith('admin.'))&&await embeddedDashboardLogin())return api(action,payload,token,binary,true);
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error?.message||'הפעולה לא הושלמה. נסי שוב.');}
 return binary?response.blob():response.json();
}
export function message(text){const node=document.querySelector('#notice');if(node)node.textContent=text;}
export function code(){return new URLSearchParams(location.search).get('room')||'';}
export function credential(room=code()){
 const key=`pairing:${room}`;
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 if(saved?.expires>Date.now()&&/^[0-9a-f]{64}$/.test(saved.token))return saved.token;
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 localStorage.setItem(key,JSON.stringify({token,expires:Date.now()+8*3600000}));return token;
}
