import { database,ACTOR_A,ACTOR_B,ADMIN,DISABLED } from './database.mjs';
import { createHandler } from '../../supabase/functions/pairing-groups/handler.mjs';
import { buildPdf } from '../../supabase/functions/pairing-groups/pdf.mjs';
import { PDFDocument,rgb } from 'pdf-lib';import fontkit from '@pdf-lib/fontkit';import bidiFactory from 'bidi-js';
import { regular,bold,logo } from '../../supabase/functions/pairing-groups/assets.mjs';
export const pdfDependencies={PDFDocument,rgb,fontkit,bidi:bidiFactory(),regularBytes:Uint8Array.from(atob(regular),c=>c.charCodeAt(0)),boldBytes:Uint8Array.from(atob(bold),c=>c.charCodeAt(0)),logoBytes:Uint8Array.from(atob(logo),c=>c.charCodeAt(0))};
export async function harness(){
 const {db,rpc}=await database();
 await db.exec("update public.pairing_policy set retention_days=30,approved_by='TEST ONLY',approved_at=now()");
 const files=new Map();let sends=0,mailStatus=202,mailPayload,authStatus=200;
 const client={
  auth:{getUser:async(token)=>({data:{user:{id:({a:ACTOR_A,b:ACTOR_B,admin:ADMIN,disabled:DISABLED})[token]||null}}})},
  rpc:async(name,args)=>{try{
   if(name==='pairing_rpc')return {data:await rpc(args.p_action,args.p_actor,args.p_token,args.p_payload)};
   if(name==='pairing_rate_limit')return {data:true};
   if(name==='pairing_cleanup_auth')return {data:false};
   return {error:{message:'invalid_request'}};
  }catch(e){return {error:{message:e.message}};}},
  storage:{getBucket:async()=>({data:{public:false}}),from:()=>({
   upload:async(path,bytes)=>{files.set(path,new Blob([bytes],{type:'application/pdf'}));return {};},
   download:async path=>files.has(path)?{data:files.get(path)}:{error:{message:'missing'}},
   remove:async paths=>{paths.forEach(p=>files.delete(p));return {};},
  })},
 };
 const readEnv=name=>({FEEDBACK_STAFF_MS_CLIENT_ID:'b37ae8f7-0b03-4925-b0e4-f5cb8da95238',FEEDBACK_STAFF_MS_TENANT_ID:'bb3f0918-c67d-4fee-b2db-e6a8eab891d1',FEEDBACK_STAFF_MS_CLIENT_SECRET:'TEST ONLY'})[name];
 const fetcher=async(url,init)=>{
  if(url.includes('oauth2'))return new Response(JSON.stringify({access_token:'x.'+btoa(JSON.stringify({appid:readEnv('FEEDBACK_STAFF_MS_CLIENT_ID'),tid:readEnv('FEEDBACK_STAFF_MS_TENANT_ID'),roles:['Mail.Send']})).replace(/=/g,'')+'.x'}),{status:authStatus});
  sends++;mailPayload=JSON.parse(init.body);if(mailStatus===0)throw new Error('timeout');return new Response(null,{status:mailStatus});
 };
 const handler=createHandler({client,buildPdf:s=>buildPdf(s,pdfDependencies),readEnv,fetcher,allowedOrigins:['https://portzot-derech.org','http://127.0.0.1:4173']});
 async function call(action,payload={},token=null,staff='a'){
  const response=await handler(new Request('http://127.0.0.1:4173/api',{method:'POST',headers:{Origin:'https://portzot-derech.org','Content-Type':'application/json',Authorization:`Bearer ${staff}`},body:JSON.stringify({action,payload,token})}));
  if(response.headers.get('content-type')==='application/pdf')return {status:response.status,bytes:new Uint8Array(await response.arrayBuffer())};
  return {status:response.status,body:await response.json()};
 }
 return {db,rpc,handler,call,files,get sends(){return sends;},get mail(){return mailPayload;},set mailStatus(v){mailStatus=v;},set authStatus(v){authStatus=v;}};
}
