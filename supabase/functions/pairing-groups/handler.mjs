import { generateGroups } from './algorithm.mjs';
import { validName, validatedAnswers, partition, personalProjection, fileName } from './domain.mjs';
import { graphAccess, mailPayload, sendGraph } from './mail.mjs';
const ORIGINS = ['https://portzot-derech.org', 'https://taasiyeda2026.github.io'];
const ACTIONS = new Set(['teacher.delete','admin.answers','teacher.me','teacher.schools','teacher.activities','teacher.create','teacher.state','teacher.resize','teacher.manual.add','teacher.match','teacher.save','teacher.publish','teacher.close','teacher.report','teacher.download','admin.report.resolve','admin.readiness','admin.cleanup','participant.join','participant.submit','participant.state']);
const ERRORS = {
 forbidden:'אין הרשאה לפעולה זו.', unauthorized:'ההתחברות פגה. יש להתחבר שוב דרך הדשבורד.',
 invalid_request:'הפרטים אינם תקינים. בדקי ונסי שוב.', invalid_answers:'יש להשלים את כל התשובות ולנסות שוב.',
 invalid_groups:'לפני הפרסום יש לשייך כל משתתפת פעם אחת לקבוצה של 2–4.',
 incomplete:'נדרשות לפחות שתי משתתפות שהשלימו את השאלון.',
 stale_version:'החלוקה השתנתה בחלון אחר. רענני את הפעילות לפני שמירה.',
 room_closed:'הפעילות סגורה להצטרפות או שתוקפה הסתיים. פני למדריכה.',
 room_full:'כל המקומות בפעילות תפוסים. פני למדריכה.', room_unavailable:'הפעילות אינה זמינה. בדקי את הקישור עם המדריכה.',
 invalid_token:'ההשתתפות אינה זמינה. יש להיכנס מהקישור של המדריכה.',
 invalid_count:'מספר המשתתפות הצפוי צריך להיות 2–40.',
 invalid_phase:'הפעולה אינה זמינה בשלב הזה. לאחר פרסום החלוקה נעולה לעריכה.',
 not_published:'יש לפרסם תחילה את החלוקה הסופית.', busy:'הדוח נמצא בהכנה או בשליחה. המתיני ורענני לפני ניסיון נוסף.',
 mail_not_configured:'שליחת המייל אינה זמינה כרגע. הדוח נשמר וניתן לנסות שוב בהמשך.',
 retention_expired:'תקופת השמירה המאושרת הסתיימה. לא ניתן לפתוח פעילות חדשה.',
 retention_not_configured:'טרם הוגדרה מדיניות שמירת דוחות מאושרת. יש לפנות למנהלת המערכת.',
 rate_limited:'בוצעו בקשות רבות מדי. המתיני ונסי שוב מאוחר יותר.',
 storage_unavailable:'אחסון הדוחות אינו זמין בבטחה. הדוח לא נשלח.',
 server_error:'לא ניתן להשלים את הפעולה כרגע. נסי שוב. הנתונים שכבר נשמרו נשארים במערכת.',
};
function error(code, status) { return Object.assign(new Error(code), { status }); }
async function boundedJson(req) {
 const reader=req.body?.getReader(); if(!reader)throw error('invalid_request',400);
 let length=0;const chunks=[];
 try { while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>32768){await reader.cancel();throw error('invalid_request',413);}chunks.push(value);} }
 finally {reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw error('invalid_request',400);}
}
export function createHandler({client,buildPdf,readEnv=()=>undefined,fetcher=fetch,allowedOrigins=ORIGINS}) {
 async function rpc(action,actor,token,payload={}) {
  const {data,error:e}=await client.rpc('pairing_rpc',{p_action:action,p_actor:actor,p_token:token,p_payload:payload});
  if(e){const code=Object.keys(ERRORS).find(k=>e.message===k);throw error(code||'server_error',code==='forbidden'?403:code==='invalid_token'?401:code?400:503);}
  return data;
 }
 async function privateBucket(){const {data,error:e}=await client.storage.getBucket('pairing-reports');if(e||data?.public!==false)throw error('storage_unavailable',503);}
 async function prepare(actor,payload){
  await privateBucket();
  const claim=crypto.randomUUID();
  let report=await rpc('teacher.report.prepare',actor,null,{activity_id:payload.activity_id,claim});
  if(report.status==='preparing'){
   const bytes=await buildPdf(report.snapshot),path=`${report.activity_id}/${report.id}.pdf`;
   const {error:e}=await client.storage.from('pairing-reports').upload(path,bytes,{contentType:'application/pdf',upsert:true,cacheControl:'0'});
   if(e)throw error('storage_unavailable',503);
   report=await rpc('teacher.report.ready',actor,null,{activity_id:payload.activity_id,claim});
  }
  return report;
 }
 return async req=>{
  const origin=req.headers.get('origin');let cleanup=false;const headers={'Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
   'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(allowedOrigins.includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
  try {
   if(req.headers.has('x-pairing-cleanup-secret')){
    const {data:authorized,error:e}=await client.rpc('pairing_cleanup_auth',{p_secret:req.headers.get('x-pairing-cleanup-secret')});
    if(e||authorized!==true)throw error('forbidden',403);cleanup=true;
   }
   if(!cleanup&&!allowedOrigins.includes(origin))throw error('forbidden',403);
   if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(req.method!=='POST'||!req.headers.get('content-type')?.startsWith('application/json'))throw error('invalid_request',400);
   const body=await boundedJson(req),{action,token}=body;
   if(!ACTIONS.has(action)||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))throw error('invalid_request',400);
   let payload=body.payload,actor=null;
   if(cleanup){if(action!=='admin.cleanup')throw error('forbidden',403);}
   else if(action.startsWith('teacher.')||action.startsWith('admin.')){
    const bearer=/^Bearer ([^\s]+)$/i.exec(req.headers.get('authorization')||'');
    if(!bearer)throw error('unauthorized',401);
    const {data,error:e}=await client.auth.getUser(bearer[1]);
    if(e||!data?.user?.id)throw error('unauthorized',401);
    actor=data.user.id;
    const me=await rpc('teacher.me',actor,null);
    if(action.startsWith('admin.')&&!me.is_admin)throw error('forbidden',403);
   }else if(typeof token!=='string'||!/^[0-9a-f]{64}$/.test(token))throw error('invalid_token',401);
   const ip=req.headers.get('cf-connecting-ip')?.trim()||(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1).trim();
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(actor||ip));
   const key=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
   const {data:permitted,error:rateError}=await client.rpc('pairing_rate_limit',{p_key:key,p_limit:actor?240:1200});
   if(rateError||!permitted)throw error('rate_limited',429);
   if(action==='participant.join'){
    if(!validName(payload.name)||!/^[0-9a-f]{32}$/.test(payload.code||''))throw error('invalid_request',400);
    payload={name:payload.name.trim(),code:payload.code};
   }
   if(action==='participant.submit')payload={answers:validatedAnswers(payload.answers)};
   if(action==='teacher.create'&&(!validName(payload.school,200)||!validName(payload.class_name,40)||!Number.isInteger(payload.expected)||payload.expected<2||payload.expected>40))throw error('invalid_request',400);
   if(action==='teacher.manual.add'&&(!Number.isInteger(payload.group_number)||(!payload.participant_id&&!validName(payload.name))))throw error('invalid_request',400);
   if(action==='teacher.match'){
    const input=await rpc('teacher.match_input',actor,null,{activity_id:payload.activity_id});
    const groups=partition(generateGroups(input.responses),input.responses.map(r=>r.id));
    return json(await rpc('teacher.save',actor,null,{activity_id:payload.activity_id,version:input.version,groups}));
   }
   if(action==='teacher.save'){
    const state=await rpc('teacher.state',actor,null,{activity_id:payload.activity_id});
    payload={activity_id:payload.activity_id,version:payload.version,groups:partition(payload.groups,state.participants.filter(p=>p.completed||p.manual).map(p=>p.id),1)};
   }
   if(action==='admin.readiness'){
    await privateBucket();await graphAccess(readEnv,fetcher);
    const me=await rpc('teacher.me',actor,null);
    return json({storage:true,mail_identity:true,retention_until:me.retention_until});
   }
   if(action==='admin.cleanup'){
    // Delete only expired Pairing data and its exact private PDFs. A failure
    // keeps the database references so the next cleanup can retry safely.
    const {data:expired,error:e}=await client.from('pairing_activities').select('id').lte('retain_until',new Date().toISOString()).limit(100);
    if(e)throw error('server_error',503);
    let removed=0;
    for(const row of expired||[]){
     const {data:reports,error:re}=await client.from('pairing_reports').select('id,pdf_path').eq('activity_id',row.id);
     if(re)throw error('server_error',503);
     const paths=reports.map(r=>r.pdf_path||`${row.id}/${r.id}.pdf`);
     if(paths.length){const {error:se}=await client.storage.from('pairing-reports').remove(paths);if(se)throw error('storage_unavailable',503);}
     const {error:de}=await client.from('pairing_activities').delete().eq('id',row.id);if(de)throw error('server_error',503);removed++;
    }
    return json({removed});
   }
   if(action==='teacher.report'||action==='teacher.download'){
    const report=await prepare(actor,payload);
    if(action==='teacher.download'){
     const {data,error:e}=await client.storage.from('pairing-reports').download(report.pdf_path);
     if(e)throw error('storage_unavailable',503);
     return new Response(data,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(fileName(report.snapshot))}`}});
    }
    if(['sending','sent','unknown'].includes(report.status))return json({status:report.status,report_id:report.id});
    const graphToken=await graphAccess(readEnv,fetcher);
    const {data:blob,error:e}=await client.storage.from('pairing-reports').download(report.pdf_path);
    if(e)throw error('storage_unavailable',503);
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const claim=crypto.randomUUID(),args={activity_id:payload.activity_id,claim};
    const result=await rpc('teacher.report.claim_send',actor,null,args);
    if(!result.claimed)return json({status:result.status,report_id:report.id});
    const status=await sendGraph(graphToken,mailPayload(report.snapshot,fileName(report.snapshot),bytes,report.snapshot.school.startsWith('[בדיקה]'),report.id),fetcher);
    await rpc('teacher.report.finish',actor,null,{...args,status});
    return json({status,report_id:report.id});
   }
   const result=await rpc(action,actor,token,payload);
   return json(action==='participant.state'?personalProjection(result):result);
  }catch(e){const code=ERRORS[e.message]?e.message:'server_error';return json({error:{code,message:ERRORS[code]}},e.status||400);}
 };
}
