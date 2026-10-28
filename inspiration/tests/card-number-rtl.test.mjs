import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const participant=await readFile(new URL('../participant.js',import.meta.url),'utf8');
const css=await readFile(new URL('../inspiration.css',import.meta.url),'utf8');

test('personal number is on RTL starting (right) side and digits are isolated LTR',()=>{
  assert.match(participant,/class:'personal-card-number'/);
  assert.match(participant,/class:'personal-card-number-value',dir:'ltr'/);
  assert.match(participant,/class:'personal-card-number-label'/);
  assert.match(css,/\.personal-card-number\{[\s\S]*?direction:rtl/);
  assert.match(css,/\.personal-card-number-value\{[\s\S]*?direction:ltr;unicode-bidi:isolate/);
  assert.ok(participant.indexOf("class:'personal-card-number-value'")<participant.indexOf("class:'personal-card-number-label'"));
});

test('numbers remain prominent on the selection board in desktop and mobile',()=>{
  assert.match(participant,/class:'card-number'/);
  assert.match(css,/\.board \.card-back \.card-number\{font-size:clamp\(2\.8rem,3\.5vw,3\.35rem\)/);
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.board \.card-back \.card-number\{font-size:2\.8rem\}/);
  assert.match(css,/\.personal-card-number-value\{font-size:2\.1rem;/);
});
