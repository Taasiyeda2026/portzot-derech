import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { wowImageUrl } from '../common.js';

const base=new URL('../cards/women/',import.meta.url);
const cards=JSON.parse(await readFile(new URL('manifest.json',base),'utf8')).files;

test('all 33 approved cards resolve to their own uploaded WOW image without a database change',async()=>{
  assert.equal(cards.length,33);
  const paths=new Set();
  for(const filename of cards){
    const resolved=wowImageUrl({front_path:'site:women/'+filename});
    assert.ok(resolved,filename);
    assert.match(resolved,/\/inspiration\/cards\/wow\/[a-z0-9_-]+-wow\.png$/);
    const file=await stat(new URL(resolved));
    assert.ok(file.isFile() && file.size>1024,filename);
    paths.add(resolved);
  }
  assert.equal(paths.size,33);
  assert.match(wowImageUrl({front_path:'site:women/zahaa.png'}),/\/zaha-wow\.png$/);
  assert.match(wowImageUrl({front_path:'site:women/Kylie.png'}),/\/kylie-wow\.png$/);
  // The real participant API deliberately strips front_path.
  assert.match(wowImageUrl({woman_name:'ג׳וי',has_front:true},'joy.png'),/\/joy-wow\.png$/);
  assert.match(wowImageUrl({woman_name:'זאהה',has_front:true},'zahaa.png'),/\/zaha-wow\.png$/);
  assert.match(wowImageUrl({woman_name:'קיילי',has_front:true},'Kylie.png'),/\/kylie-wow\.png$/);
});

test('a WOW image can only be resolved from an approved site card filename',()=>{
  for(const path of [null,'../joy.png','site:women/../../joy.png','site:women/joy.svg','https://example.com/joy.png','site:other/joy.png']){
    assert.equal(wowImageUrl({front_path:path}),null);
  }
  for (const unsafe of ['../joy.png','joy.svg','sneaky.exe','joy.png/other','a?b.png']) {
    assert.equal(wowImageUrl({has_front:true},unsafe),null);
  }
  assert.equal(wowImageUrl({has_front:true}),null);
});

test('the thumbnail overlay is anchored to the personal image rather than the PNG itself',async()=>{
  const common=await readFile(new URL('../common.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../inspiration.css',import.meta.url),'utf8');
  assert.match(common,/const artwork=el\('div',\{class:'card-artwork'\}/);
  assert.match(common,/if\(currentSide==='front'\)/);
  assert.match(common,/authorizedCardFilename\.set\(blob,filename\)/);
  assert.match(common,/wowImageUrl\(card,authorizedCardFilename\.get\(blob\)\)/);
  assert.match(common,/artwork\.append\(wowHotspot\(wowUrl\)\)/);
  assert.match(common,/dialog\.addEventListener\('click'/);
  assert.match(common,/event\.target===dialog\|\|event\.target===image/);
  assert.match(css,/\.card-viewer \.card-artwork\{position:relative/);
  assert.match(css,/\.card-viewer \.wow-hit-area\{[\s\S]*?position:absolute;right:1\.2%;bottom:3\.7%/);
  assert.match(css,/min-width:44px;min-height:44px/);
  assert.match(css,/color:#563072;cursor:pointer;/);
  assert.match(css,/width:18px;height:18px/);
  assert.match(css,/width:12px;height:12px/);
  assert.match(css,/transform:translateY\(-11px\)/);
});
