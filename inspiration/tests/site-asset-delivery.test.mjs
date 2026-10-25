import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const client = await readFile(new URL('../common.js',import.meta.url),'utf8');
const participant = await readFile(new URL('../participant.js',import.meta.url),'utf8');
const edge = await readFile(new URL('../../supabase/functions/inspiration-game/handler.mjs',import.meta.url),'utf8');

function clientHarness({ assetName='Misty.png', contentType='image/png', status=200 }={}) {
  const requests=[];
  const jsonResponse=new Response(JSON.stringify({site_asset:assetName}),{
    status:200,headers:{'Content-Type':'application/json'}
  });
  const artResponse=new Response(new Blob(['original GitHub card'],{type:contentType}),{
    status,headers:{'Content-Type':contentType}
  });
  const fetchStub=async(url,options)=>{
    requests.push({url:String(url),options});
    return requests.length===1?jsonResponse:artResponse;
  };
  const context={fetch:fetchStub,Response,Blob,URL,sessionStorage:{getItem:()=>null},
    document:{querySelector:()=>null},location:{},navigator:{},console};
  vm.runInNewContext(client.replace(/\bexport\s+/g,'').replaceAll('import.meta.url',"'https://portzot-derech.org/inspiration/common.js'"),context);
  return {call:(action,token)=>vm.runInNewContext(`api('${action}',{side:'front'},{binary:true,token:'${token}'})`,context),requests};
}

test('authorized front image is fetched as a same-origin GET after server validates ownership',async()=>{
  const {call,requests}=clientHarness();
  const blob=await call('participant.asset','a'.repeat(64));
  assert.equal(blob.type,'image/png');
  assert.equal(requests.length,2);
  assert.match(requests[0].url,/supabase\.co\/functions\/v1\/inspiration-game/);
  assert.equal(requests[0].options.method,'POST');
  assert.equal(requests[1].url,'https://portzot-derech.org/inspiration/cards/women/Misty.png');
  assert.equal(requests[1].options.method,'GET');
  assert.equal(requests[1].options.mode,'same-origin');
});
test('unapproved site paths are never requested by browser',async()=>{
  const {call,requests}=clientHarness({assetName:'../secret.png'});
  await assert.rejects(()=>call('participant.asset','a'.repeat(64)),/לא ניתן לטעון/);
  assert.equal(requests.length,1);
});
test('failed image GET is clearly distinct from a room connection failure',async()=>{
  const {call,requests}=clientHarness({status:404});
  await assert.rejects(()=>call('participant.asset','a'.repeat(64)),/תמונת הקלף אינה זמינה/);
  assert.equal(requests.length,2);
});
test('server exposes an authorized filename, not a cross-origin 303 redirect',()=>{
  assert.match(edge,/return json\(\{ site_asset: siteCard\[1\] \}\)/);
  assert.doesNotMatch(edge,/status:\s*303/);
  assert.match(edge,/\^site:women/);
});
test('completion copy follows actual saved group size',()=>{
  assert.match(participant,/function activityPanel\(progress\)/);
  assert.match(participant,/progress\.group_size===3\?'עכשיו ממשיכות יחד כשלישייה לדף הפעילות\.'/);
  assert.match(participant,/'עכשיו ממשיכות יחד עם בת הזוג לדף הפעילות\.'/);
  assert.match(participant,/activityPanel\(progress\)/);
  assert.doesNotMatch(participant,/בת הזוג או השלישייה/);
});
