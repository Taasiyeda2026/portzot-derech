// Existing approved Taasiyeda Dashboard Graph identity. No fallback to payroll
// credentials and no new permission grants. Both sender and recipient are fixed.
const APP_ID = 'b37ae8f7-0b03-4925-b0e4-f5cb8da95238';
const TENANT_ID = 'bb3f0918-c67d-4fee-b2db-e6a8eab891d1';
export const OFFICE = 'office@think.org.il';
export async function graphAccess(readEnv, fetcher = fetch) {
  const client = readEnv('FEEDBACK_STAFF_MS_CLIENT_ID');
  const tenant = readEnv('FEEDBACK_STAFF_MS_TENANT_ID');
  const secret = readEnv('FEEDBACK_STAFF_MS_CLIENT_SECRET');
  if (client?.toLowerCase() !== APP_ID || tenant?.toLowerCase() !== TENANT_ID || !secret) throw new Error('mail_not_configured');
  const response = await fetcher(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: client, client_secret: secret, grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default' }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('mail_not_configured');
  const { access_token: token } = await response.json();
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    if ((claims.appid || claims.azp)?.toLowerCase() !== APP_ID || claims.tid?.toLowerCase() !== TENANT_ID || !claims.roles?.includes('Mail.Send')) throw new Error();
  } catch { throw new Error('mail_not_configured'); }
  return token;
}
export function mailPayload(snapshot, filename, bytes, test = false, reportId = '') {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return {
    message: {
      subject: `${test ? '[בדיקה] ' : ''}פורצות דרך – דיווח קבוצות | ${snapshot.school} | ${snapshot.class_name}`,
      body: { contentType: 'Text', content: [
        'שלום,', '', 'מצורף דוח חלוקת קבוצות במסגרת תוכנית פורצות דרך.', '',
        `בית הספר: ${snapshot.school}`, `כיתה: ${snapshot.class_name}`, `מדריך/ה: ${snapshot.instructor_name}`,
        `תאריך הפעילות: ${snapshot.activity_date}`, `מספר משתתפות: ${snapshot.participant_count}`,
        `מספר קבוצות: ${snapshot.groups.length}`, '', 'הדוח הופק ונשלח אוטומטית ממערכת פורצות דרך.',
      ].join('\n') },
      toRecipients: [{ emailAddress: { address: OFFICE } }],
      internetMessageHeaders: [{ name: 'X-Taasiyeda-Pairing-Report', value: reportId }],
      attachments: [{ '@odata.type': '#microsoft.graph.fileAttachment', name: filename, contentType: 'application/pdf', contentBytes: btoa(binary) }],
    }, saveToSentItems: true,
  };
}
export async function sendGraph(token, payload, fetcher = fetch) {
  try {
    const response = await fetcher(`https://graph.microsoft.com/v1.0/users/${OFFICE}/sendMail`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(25000),
    });
    if (response.status === 202) return 'sent';
    // Only explicit rejections known not to accept a message permit retry.
    return [400, 401, 403, 404, 413, 429].includes(response.status) ? 'failed' : 'unknown';
  } catch { return 'unknown'; }
}
