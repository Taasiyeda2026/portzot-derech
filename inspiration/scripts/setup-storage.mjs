// Operator tool. No write occurs unless --apply is explicitly supplied.
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';
import { prepareStorage } from '../../supabase/functions/inspiration-game/storage-bootstrap.mjs';
export { prepareStorage };

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
