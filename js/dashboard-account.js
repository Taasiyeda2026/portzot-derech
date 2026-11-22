import { SUPABASE_URL, PUBLISHABLE_KEY } from '../inspiration/common.js';

const accessKey = 'inspiration-teacher-access';

export class DashboardAccountError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Use the same authenticated identity and current-profile lookup as the
// dashboard. Activity RPCs and role/permission flags are deliberately absent.
export async function readActiveDashboardAccount({
  token = sessionStorage.getItem(accessKey),
  request = fetch,
  baseUrl = SUPABASE_URL,
  publishableKey = PUBLISHABLE_KEY
} = {}) {
  if (!token) throw new DashboardAccountError('signed_out');
  const headers = { apikey: publishableKey, Authorization: `Bearer ${token}` };
  const options = { headers, cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) };
  const identityResponse = await request(`${baseUrl}/auth/v1/user`, options);
  if (!identityResponse.ok) {
    throw new DashboardAccountError([401, 403].includes(identityResponse.status) ? 'signed_out' : 'unavailable');
  }
  const identity = await identityResponse.json();
  if (typeof identity?.id !== 'string' || !identity.id) throw new DashboardAccountError('signed_out');

  const profileResponse = await request(`${baseUrl}/rest/v1/rpc/get_current_app_user`, {
    ...options, method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}'
  });
  if ([401].includes(profileResponse.status)) throw new DashboardAccountError('signed_out');
  if (!profileResponse.ok) throw new DashboardAccountError('unavailable');
  const result = await profileResponse.json();
  const rows = Array.isArray(result) ? result : result ? [result] : [];
  if (rows.length !== 1) throw new DashboardAccountError('account_missing');
  const profile = rows[0];
  // The RPC is bound to the authenticated caller, not a caller-supplied ID.
  // Reject conflicting mappings when it also returns an explicit Auth ID.
  if (profile.auth_user_id && profile.auth_user_id !== identity.id) {
    throw new DashboardAccountError('identity_mismatch');
  }
  if (profile.is_active !== true) throw new DashboardAccountError('inactive');
  // Do not retain names, roles, permissions or any other profile information.
  return { id: identity.id, active: true };
}
