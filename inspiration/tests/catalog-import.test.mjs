import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../catalog-import.js';

const group = 'a53e37d0-b8c8-4a36-a11a-a9ce50b777ba';
const other = 'ef67b644-9771-4e11-8b93-4270fc0c51ca';
const header = 'group_id,symbol,size,name,field,front_path';
const row = (name='בדיקה',id=group,symbol='◆',size=2) => `${id},${symbol},${size},${name},תחום בדיקה,cards/test.png`;

test('CSV combines rows into groups and maps card names to the API contract', () => {
  const result = parseCSV(`${header}\n${row('אישה א')}\n${row('אישה ב')}\n${row('אישה ג',other,'●')}`);
  assert.equal(result.groups.length,2);
  assert.equal(result.groups[0].cards.length,2);
  assert.equal(result.groups[0].cards[1].woman_name,'אישה ב');
  assert.equal(result.groups[0].cards[1].back_path,null);
  assert.match(result.groups[0].cards[0].id,/^[0-9a-f-]{36}$/);
});

test('CSV handles BOM, CRLF, quoted commas, escaped quotes and multiline cells', () => {
  const result = parseCSV(`\uFEFF${header}\r\n${group},◆,2,"אישה, ""מיוחדת""",תחום בדיקה,cards/a.png\r\n${group},◆,2,"שורה ראשונה\r\nשורה שנייה",תחום בדיקה,cards/b.png\r\n`);
  assert.equal(result.groups[0].cards[0].woman_name,'אישה, "מיוחדת"');
  assert.equal(result.groups[0].cards[1].woman_name,'שורה ראשונה\r\nשורה שנייה');
});

test('CSV preserves explicit IDs and interprets inactive cards and groups', () => {
  const id='4dc73363-c0cc-4b1d-98ea-a6383c670224';
  const result=parseCSV(`${header},id,back_path,active,group_active\n${row()},${id},cards/back.pdf,false,0`);
  assert.equal(result.groups[0].active,false);
  assert.equal(result.groups[0].cards[0].active,false);
  assert.equal(result.groups[0].cards[0].back_path,'cards/back.pdf');
  assert.equal(result.groups[0].cards[0].id,id);
});

test('UUID group identifiers are normalized without creating duplicate groups', () => {
  const result=parseCSV(`${header}\n${row('א',group.toUpperCase())}\n${row('ב')}`);
  assert.equal(result.groups.length,1);
  assert.equal(result.groups[0].id,group);
});

test('CSV ignores empty lines and keeps HTML as plain content', () => {
  const result=parseCSV(`${header}\n\n${row('<script>alert(1)</script>')}\n,,,,,\n`);
  assert.equal(result.groups[0].cards[0].woman_name,'<script>alert(1)</script>');
});

test('CSV rejects missing required columns and empty files', () => {
  assert.throws(()=>parseCSV('group_id,name\n'+group+',בדיקה'),/חסרה עמודה/);
  assert.throws(()=>parseCSV(header),/שורת כותרות וקלף/);
});

test('CSV rejects duplicate headers and row width mismatch', () => {
  assert.throws(()=>parseCSV(`${header},name\n${row()},עוד שם`),/ייחודיות/);
  assert.throws(()=>parseCSV(`${header}\n${row()},עמודה מיותרת`),/מספר העמודות/);
  assert.throws(()=>parseCSV(`${header}\n${group},◆,2,שם,תחום`),/מספר העמודות/);
});

test('CSV rejects missing or malformed group UUIDs before a server request', () => {
  assert.throws(()=>parseCSV(`${header}\n${row('שם','approved-group')}`),/מזהה קבוצה UUID תקין/);
  assert.throws(()=>parseCSV(`${header}\n${row('שם','')}`),/מזהה קבוצה UUID תקין/);
});

test('CSV rejects malformed existing card UUIDs', () => {
  assert.throws(()=>parseCSV(`${header},id\n${row()},card-one`),/מזהה קלף קיים/);
});

test('CSV rejects contradictory metadata for one group', () => {
  assert.throws(()=>parseCSV(`${header}\n${row()}\n${row('שם',group,'●')}`),/לאותה קבוצה/);
  assert.throws(()=>parseCSV(`${header}\n${row()}\n${row('שם',group,'◆',3)}`),/לאותה קבוצה/);
  assert.throws(()=>parseCSV(`${header},group_active\n${row()},true\n${row()},false`),/לאותה קבוצה/);
});

test('CSV only accepts pairs or triples', () => {
  assert.throws(()=>parseCSV(`${header}\n${row('שם',group,'◆',4)}`),/שניים או שלושה/);
});

test('CSV rejects unclosed quotes and text after a closing quote', () => {
  assert.throws(()=>parseCSV(`${header}\n${group},◆,2,"שם,תחום,cards/a.png`),/חסרות מרכאות סוגרות/);
  assert.throws(()=>parseCSV(`${header}\n${group},◆,2,"שם"המשך,תחום,cards/a.png`),/אחרי מרכאות סוגרות/);
  assert.throws(()=>parseCSV(`${header}\n${group},◆,2,ש"ם,תחום,cards/a.png`),/מרכאות בתוך שדה/);
});
