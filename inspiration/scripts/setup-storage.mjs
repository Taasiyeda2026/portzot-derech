// Operator tool. No write occurs unless --apply is explicitly supplied.
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

export async function prepareStorage(storage, { apply = false } = {}) {
  const id = 'inspiration-cards';
  const { data, error } = await storage.getBucket(id);
  if (data) {
    if (data.public !== false) throw new Error('The existing inspiration-cards bucket is public. Stop and review it before enabling the game.');
    return { status: 'private-existing', id };
  }
  if (String(error?.status ?? error?.statusCode) !== '404') throw new Error('Unable to verify bucket configuration. No changes were made.');
  if (!apply) return { status: 'missing', id, instruction: 'After approval, repeat with --apply to create the private bucket.' };
  const result = await storage.createBucket(id, {
    public: false,
    fileSizeLimit: 12 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
  });
  if (result.error) throw new Error('Private bucket creation failed. No credentials are included in this error.');
  const verified = await storage.getBucket(id);
  if (verified.error || verified.data?.public !== false) throw new Error('The new bucket could not be verified as private. Do not enable the game.');
  return { status: 'private-created', id };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ref = process.env.INSPIRATION_TARGET_PROJECT_REF || 'szinlhjuwyiyszdpsdop';
    if (!url || !key || url !== `https://${ref}.supabase.co`) throw new Error('Supply the exact approved project SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY through the environment.');
    if (process.argv.slice(2).some(arg => !['--check', '--apply'].includes(arg))) throw new Error('Supported arguments: --check (default), --apply (requires prior approval).');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    console.log(JSON.stringify(await prepareStorage(client.storage, { apply: process.argv.includes('--apply') })));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
