import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = path => readFile(new URL(path,import.meta.url),'utf8');

test('the course tile launches only instructor room creation',async()=>{
  const menu=await load('../../strongermenu-2026.html');
  for(const id of ['inspiration-entry','inspiration-dialog','inspiration-teacher-workspace','inspiration-participant-count','inspiration-room-qr'])
    assert.ok(menu.includes('id="'+id+'"'),id);
  assert.ok(!menu.includes('id="inspiration-join-form"'));
  assert.ok(!menu.includes('id="inspiration-room-link"'));
  assert.ok(!menu.includes('id="inspiration-copy-room"'));
});

test('the instructor uses dashboard SSO and validated server-side permissions',async()=>{
  const source=await load('../teacher-entry.js');
  for(const segment of ["dashboardLogin()","api('teacher.me')","api('teacher.catalog')","api('teacher.create', { expected })","sessionStorage.getItem(tokenKey)"])
    assert.ok(source.includes(segment),segment);
  assert.ok(source.includes("createInviteTools(invitationUrl, showError)"));
});

test('compact QR controls provide zoom, download, copy, email and WhatsApp without showing the URL',async()=>{
  const source=await load('../invite-tools.js');
  const teacher=await load('../teacher.js');
  const menu=await load('../../strongermenu-2026.html');
  for(const segment of ['zoomQR(', 'downloadQR(', 'clipboard.writeText(inviteUrl)', "new URL('mailto:')", 'https://wa.me/?text=', 'scalable:true'])
    assert.ok(source.includes(segment),segment);
  assert.ok(teacher.includes('createInviteTools(roomLink(room)'));
  assert.ok(!teacher.includes("class:'join-link'"));
  assert.ok(!menu.includes('id="inspiration-room-link"'));
});

test('participants arrive with unique room code and join under their own names',async()=>{
  const participant=await load('../participant.js');
  assert.ok(participant.includes("searchParams.get('code')"));
  assert.ok(participant.includes("api('participant.join'"));
  assert.ok(participant.includes("api('participant.claim'"));
});
