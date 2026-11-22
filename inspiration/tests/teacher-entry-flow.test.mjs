import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path,import.meta.url),'utf8');

test('shared management replaces the menu dialog without changing activity room creation',async()=>{
  const html=await read('../../strongermenu-2026.html');
  const management=await read('../../management.html');
  const script=await read('../teacher-entry.js');
  const teacher=await read('../teacher.js');
  assert.ok(html.includes('href="management.html"'));
  assert.ok(!html.includes('id="inspiration-entry"'));
  assert.ok(management.includes('data-activity-url="inspiration/teacher.html"'));
  assert.match(management, /<button[^>]*disabled[^>]*data-activity-url="inspiration\/teacher\.html"/);
  assert.ok(!html.includes('id="inspiration-teacher-workspace"'));
  assert.ok(!html.includes('id="inspiration-participant-count"'));
  assert.ok(!html.includes('id="inspiration-room-created"'));
  assert.ok(!html.includes('id="inspiration-room-qr"'));
  assert.ok(!html.includes('id="inspiration-manage-room"'));
  assert.ok(script.includes('dashboardLogin()'));
  assert.ok(script.includes("api('teacher.me')"));
  assert.ok(script.includes("new URL('./inspiration/teacher.html', location.href)"));
  assert.ok(script.includes('location.assign(url.href)'));
  assert.ok(!script.includes("api('teacher.create'"));
  assert.ok(teacher.includes("api('teacher.create',{expected:count})"));
});

test('the room invitation lives only on the management screen',async()=>{
  const invite=await read('../invite-tools.js');
  const teacher=await read('../teacher.js');
  assert.ok(invite.includes('zoomQR'));
  assert.ok(invite.includes('downloadQR'));
  assert.ok(invite.includes("new URL('mailto:')"));
  assert.ok(invite.includes('https://wa.me/?text='));
  assert.ok(invite.includes('navigator.clipboard.writeText(inviteUrl)'));
  assert.ok(teacher.includes('createInviteTools(roomLink(room)'));
  assert.ok(!teacher.includes("class:'join-link'"));
});

test('participant joins only from teacher invitation and keeps original artwork',async()=>{
  const participant=await read('../participant.js');
  assert.ok(participant.includes("searchParams.get('code')"));
  assert.ok(participant.includes("api('participant.join'"));
  assert.ok(participant.includes("api('participant.claim'"));
  assert.ok(participant.includes('cardViewer(card,token)'));
});
