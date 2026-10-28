import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const participant=await readFile(new URL('../participant.js',import.meta.url),'utf8');
const styles=await readFile(new URL('../inspiration.css',import.meta.url),'utf8');

test('success moment is only triggered by a verified server response',()=>{
  assert.match(participant,/const result=await api\('participant.verify_match',\{numbers\},\{token\}\);/);
  assert.match(participant,/if\(result\?\.progress\?\.verified===true\)showMatchSuccess\(\);/);
  assert.doesNotMatch(participant,/function render\(next\)[\s\S]{0,200}showMatchSuccess/);
  assert.match(participant,/catch\(error\)\{[\s\S]*?MATCH_INCORRECT/);
});
test('short nonblocking acknowledgment respects reduced-motion preference',()=>{
  assert.match(participant,/מצאתן את החיבור!/);
  assert.match(participant,/matchSuccessTimer=setTimeout/);
  assert.match(styles,/\.match-success-moment\{/);
  assert.match(styles,/pointer-events:none/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});
