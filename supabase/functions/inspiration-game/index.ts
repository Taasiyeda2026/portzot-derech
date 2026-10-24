import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { createHandler } from './handler.mjs';
import { prepareStorage } from './storage-bootstrap.mjs';

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) throw new Error('Missing game runtime configuration');

const allowedOrigins = ['https://portzot-derech.org', 'https://taasiyeda2026.github.io'];
// Development origin opt-in is an exact origin, never a wildcard or suffix match.
const devOrigin = Deno.env.get('INSPIRATION_DEV_ORIGIN');
if (devOrigin) {
  const dev = new URL(devOrigin);
  if (['localhost', '127.0.0.1', '[::1]'].includes(dev.hostname) && dev.protocol === 'http:') allowedOrigins.push(dev.origin);
}
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
// Deploying this function authorizes creation of the game's exact private bucket.
// No client route can trigger arbitrary bucket creation or change bucket privacy.
await prepareStorage(client.storage, { apply: true });
Deno.serve(createHandler({ client, allowedOrigins }));
