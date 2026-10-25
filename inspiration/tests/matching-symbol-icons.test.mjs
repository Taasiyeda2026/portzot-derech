import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=path=>readFile(new URL(path,import.meta.url),'utf8');
const groups=[
  ['גלגל שיניים','gear'],['כוכב','star'],['טיל','rocket'],
  ['תו מוזיקלי','note'],['שפירית','dragonfly'],['קלאפר קולנוע','clapper'],
  ['מיקרופון','microphone'],['פלטת צבעים','palette'],['כובע בוגרים','cap'],
  ['אטום','atom'],['לב','heart'],['אוזניות','headphones'],
  ['מצלמה','camera'],['זכוכית מגדלת','magnifier'],
  ['גביע','trophy'],['שרביט ניצוח','conductor']
];
test('all 16 canonical Supabase labels map to individual line-art SVG symbols',async()=>{
  const script=await source('../symbol-icons.js');
  const sprite=await source('../symbol-icons.svg');
  for(const [label,id] of groups){
    assert.ok(script.includes("'"+label+"':'"+id+"'"),'Missing database label: '+label);
    assert.ok(sprite.includes('<symbol id="'+id+'"'),'Missing icon: '+id);
  }
  assert.equal((sprite.match(/<symbol id="/g)||[]).length,16);
  assert.match(script,/setAttribute\('aria-label',String\(name\|\|'סמל'\)\)/);
  assert.match(script,/new URL\('\.\/symbol-icons\.svg#'\+id,import\.meta\.url\)/);
});
test('teacher map and roster use icons instead of visual symbol names',async()=>{
  const teacher=await source('../teacher.js');
  const css=await source('../inspiration.css');
  assert.match(teacher,/symbolIcon\(group\.symbol\)/);
  assert.match(teacher,/symbolIcon\(player\.symbol,true\)/);
  assert.doesNotMatch(teacher,/el\('span',\{class:'symbol'\},group\.symbol\)/);
  assert.doesNotMatch(teacher,/el\('td',\{\},player\.symbol\|\|'—'\)/);
  assert.match(css,/\.group-symbol-icon/);
  assert.match(css,/\.match-group-type/);
});
test('participant phase does not receive the mapping or added graphic clues',async()=>{
  const participant=await source('../participant.js');
  assert.doesNotMatch(participant,/symbol-icons\.(?:js|svg)|symbolIcon\(/);
});
