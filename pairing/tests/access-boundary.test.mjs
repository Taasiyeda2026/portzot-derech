import test from 'node:test';
import assert from 'node:assert/strict';
import { database, ACTOR_A, ACTOR_B, ADMIN, DISABLED } from './database.mjs';

// This database is a new PGlite instance in memory. No Supabase connection,
// account change, activity creation or report delivery is involved.
test('pairing independently accepts active employee, instructor and admin identities', async () => {
  const { db, rpc } = await database();
  try {
    for (const actor of [ACTOR_A, ACTOR_B, ADMIN]) {
      const identity = await rpc('teacher.me', actor);
      assert.equal(identity.can_manage, true);
      assert.equal(identity.is_admin, actor === ADMIN);
    }
  } finally {
    await db.close();
  }
});

test('pairing independently denies inactive, missing and unknown dashboard identities', async () => {
  const { db, rpc } = await database();
  try {
    for (const actor of [DISABLED, null, '55555555-5555-4555-8555-555555555555']) {
      await assert.rejects(() => rpc('teacher.me', actor), /forbidden/i);
    }
  } finally {
    await db.close();
  }
});
