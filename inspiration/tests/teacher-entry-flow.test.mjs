import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path,import.meta.url),'utf8');

test('teacher-only modal enters through dashboard and displays QR after opening room',async()=>{
  const html=await read('../../strongermenu-2026.html');
  const script=await read('../teacher-entry.js');
  assert.ok(html.includes('id="inspiration-entry"'));
  assert.ok(html.includes('id="inspiration-participant-count"'));
  assert.ok(html.includes('id="inspiration-room-qr"'));
  assert.ok(!html.includes('id="inspiration-join-form"'));
  assert.ok(!html.includes('id="inspiration-room-link"'));
  assert.ok(script.includes('dashboardLogin()'));
  assert.ok(script.includes("api('teacher.me')"));
  assert.ok(script.includes("api('teacher.create', { expected })"));
  assert.ok(script.includes('createInviteTools(invitationUrl, showError)'));
});

test('the room invitation is an icon toolbar with thumbnail, enlarge, download, mail, WhatsApp and copy',async()=>{
  const invite=await read('../invite-tools.js');
  const teacher=await read('../teacher.js');
  assert.ok(invite.includes("zoomQR"));
  assert.ok(invite.includes("downloadQR"));
  assert.ok(invite.includes("new URL('mailto:')"));
  assert.ok(invite.includes('https://wa.me/?text='));
  assert.ok(invite.includes('navigator.clipboard.writeText(inviteUrl)'));
  assert.ok(teacher.includes('createInviteTools(roomLink(room)'));
  assert.ok(!teacher.includes("class:'join-link'"));
});

test('participant joins only from invitation link with individual code and keeps original art',async()=>{
  const participant=await read('../participant.js');
  assert.ok(participant.includes("searchParams.get('code')"));
  assert.ok(participant.includes("api('participant.join'"));
  assert.ok(participant.includes("api('participant.claim'"));
  assert.ok(participant.includes('cardViewer(card,token)'));
});
