import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../../supabase/migrations/20261025170044_inspiration_30_day_private_retention_and_aggregate_counts.sql', import.meta.url);
const baselinePath = new URL('../../supabase/migrations/20261024181538_inspiration_game.sql', import.meta.url);

test('inspiration room codes expire after eight hours', async () => {
  const baseline = await readFile(baselinePath, 'utf8');
  assert.match(baseline, /expires_at[^,\n]*now\(\)\s*\+\s*interval\s*'8 hours'/i);
});

test('retention only deletes classroom sessions after thirty days', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /r\.created_at\s*<\s*now\(\)\s*-\s*interval\s*'30 days'/i);
  assert.match(sql, /delete from public\.inspiration_rooms where id = game\.id/i);
  assert.doesNotMatch(sql, /delete from public\.inspiration_(?:cards|match_groups)/i);
});

test('only anonymous totals survive room deletion', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /create table if not exists inspiration_private\.inspiration_daily_usage/i);
  assert.match(sql, /games_count,\s*participants_count,\s*cards_selected_count/i);
  assert.doesNotMatch(sql, /create table[^\n]*student_name|insert into inspiration_private\.inspiration_daily_usage[^\n]*room_id/i);
  assert.match(sql, /revoke all on table inspiration_private\.inspiration_daily_usage from public, anon, authenticated/i);
});

test('original cleanup still deletes stale rate-limit records', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /delete from inspiration_private\.rate_limits/i);
  assert.match(sql, /window_start < now\(\) - interval '1 day'/i);
});
