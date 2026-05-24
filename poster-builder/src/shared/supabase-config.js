const runtimeEnv = globalThis.__POSTER_ENV__ || {};
const viteEnv = import.meta.env || {};

function readPublicEnv(key) {
  return (viteEnv[key] || runtimeEnv[key] || '').trim();
}

export const SUPABASE_URL = (window.PORTZOT_SUPABASE_URL || readPublicEnv('VITE_SUPABASE_URL') || '').trim();
export const SUPABASE_ANON_KEY = (window.PORTZOT_SUPABASE_ANON_KEY || readPublicEnv('VITE_SUPABASE_ANON_KEY') || '').trim();
export const POSTER_ADMIN_CODE = readPublicEnv('VITE_POSTER_ADMIN_CODE') || '1234';
export const POSTER_SUBMISSIONS_TABLE = 'poster_submissions';
export const POSTER_ASSETS_TABLE = 'poster_assets';
export const POSTER_SCHOOLS_TABLE = 'poster_schools';
