import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const raw = await readFile(new URL('../teacher-entry.js', import.meta.url), 'utf8');
const code = raw.replace(/^import\s+[^\n]+\n/g, '');

async function runEntry({tokenPresent=false,canManage=true,expired=false}={}) {
  const visits=[],actions=[],elements=new Map();
  const session=new Map(tokenPresent?[['inspiration-teacher-access','existing-token']]:[]);
  const node=id=>{
    if(!elements.has(id))elements.set(id,{
      open:false,hidden:false,disabled:false,textContent:'',handlers:{},
      addEventListener(name,callback){this.handlers[name]=callback;},
      showModal(){this.open=true;},
      close(){this.open=false;}
    });
    return elements.get(id);
  };
  const context={
    document:{querySelector:node},
    sessionStorage:{
      getItem(key){return session.get(key)||null;},
      setItem(key,value){session.set(key,value);},
      removeItem(key){session.delete(key);}
    },
    location:{
      href:'https://portzot-derech.org/strongermenu-2026.html',hash:'',
      assign(url){visits.push(url);}
    },
    history:{replaceState(){}},
    URL,
    api:async action=>{
      actions.push(action);
      if(expired){const error=new Error('expired');error.status=401;throw error;}
      return canManage?{can_manage:true}:{can_manage:false,is_admin:false};
    },
    dashboardLogin:async()=>{
      actions.push('dashboardLogin');
      session.set('inspiration-teacher-access','new-token');
    }
  };
  runInNewContext(code,context,{filename:'inspiration/teacher-entry.js'});
  node('#inspiration-entry').handlers.click();
  await new Promise(resolve=>setImmediate(resolve));
  return {
    visits,actions,
    signInVisible:node('#inspiration-teacher-entry').hidden===false,
    status:node('#inspiration-auth-status').textContent
  };
}
const management='https://portzot-derech.org/inspiration/teacher.html';

test('existing valid instructor session routes directly to management',async()=>{
  const result=await runEntry({tokenPresent:true});
  assert.deepEqual(result.visits,[management]);
  assert.deepEqual(result.actions,['teacher.me']);
});
test('dashboard SSO routes directly to management with no room creation',async()=>{
  const result=await runEntry();
  assert.deepEqual(result.visits,[management]);
  assert.deepEqual(result.actions,['dashboardLogin','teacher.me']);
});
test('insufficient permissions never navigate into management',async()=>{
  const result=await runEntry({tokenPresent:true,canManage:false});
  assert.deepEqual(result.visits,[]);
  assert.equal(result.signInVisible,true);
  assert.match(result.status,/אין הרשאה/);
});
test('expired session prompts sign-in instead of navigating',async()=>{
  const result=await runEntry({tokenPresent:true,expired:true});
  assert.deepEqual(result.visits,[]);
  assert.equal(result.signInVisible,true);
  assert.match(result.status,/לחדש את ההתחברות/);
});
