import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../inspiration.css',import.meta.url),'utf8');

test('compact mobile full-card close does not inherit expanding button flex',()=>{
  assert.match(css,/\/\* Compact zoom controls on phones:/);
  assert.match(css,/\.media-zoom \.actions button\{\s*flex:0 0 auto;width:auto/);
  assert.match(css,/\.media-zoom \.actions\{\s*justify-content:flex-start/);
  assert.match(css,/\.media-zoom img,\.media-zoom canvas\{\s*display:block;width:100%;max-width:100%;height:auto/);
});

test('mobile magnifier stays visually small with independent touch area',()=>{
  assert.match(css,/\.card-viewer \.wow-zoom-icon\{\s*width:16px;height:16px/);
  assert.match(css,/\.card-viewer \.wow-hit-area svg\{width:11px;height:11px\}/);
  assert.match(css,/min-width:44px;min-height:44px/);
  assert.match(css,/color:#563072;cursor:pointer/);
});