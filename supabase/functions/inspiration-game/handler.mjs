// Transport boundary for the game. SQL remains authoritative for every permission
// and game rule. Participant tokens never become Supabase Auth sessions.
const ACTIONS = new Set([
  'teacher.me', 'teacher.catalog', 'teacher.rooms', 'teacher.create',
  'teacher.state', 'teacher.phase', 'teacher.resize', 'teacher.player_update',
  'teacher.player_remove', 'teacher.manual_join', 'teacher.manual_claim', 'teacher.asset',
  'admin.catalog_import', 'admin.catalog_save', 'admin.catalog_validate', 'admin.cleanup',
  'participant.join', 'participant.state', 'participant.claim', 'participant.asset',
  'participant.verify_match', 'participant.confirm_activity',
]);
const DEFAULT_ORIGINS = ['https://portzot-derech.org', 'https://taasiyeda2026.github.io'];
const MAX_JSON = 512 * 1024;
const MAX_FILE = 12 * 1024 * 1024;
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' };
const MESSAGES = {
  invalid_request: 'הבקשה אינה תקינה. נסי שוב.',
  unauthorized: 'ההתחברות פגה. יש להתחבר שוב דרך הדשבורד.',
  forbidden: 'אין הרשאה לפעולה הזו.',
  room_not_found: 'החדר אינו זמין. בדקי את קישור ההצטרפות.',
  room_expired: 'תוקף החדר הסתיים.',
  room_closed: 'החדר סגור להצטרפות.',
  room_full: 'כל המקומות בחדר תפוסים. פני למדריכה.',
  invalid_token: 'ההשתתפות אינה זמינה. פני למדריכה.',
  card_taken: 'הקלף כבר נבחר. בחרי קלף אחר.',
  already_chosen: 'כבר בחרת קלף. אפשר לחזור לקלף האישי שלך.',
  match_invalid_input: 'בדקי שהזנת את מספרי הקלפים המתאימים.',
  match_not_ready: 'עדיין לא כל הקלפים בקבוצה נבחרו.',
  match_incorrect: 'זה עדיין לא החיבור הנכון. בדקו את הסמל ונסו שוב.',
  match_not_verified: 'תחילה צריך לאמת את החיבור שמצאתן.',
  card_unassigned: 'לא נמצא קלף אישי. פני למדריכה.',
  invalid_phase: 'הפעולה אינה זמינה בשלב הזה של המשחק.',
  roster_incomplete: 'יש להמתין להצטרפות כל המשתתפות.',
  choices_incomplete: 'יש להמתין לבחירת הקלפים של כל המשתתפות.',
  count_below_joined: 'לא ניתן להגדיר פחות מקומות ממספר המשתתפות הרשומות.',
  catalog_invalid: 'מאגר הקלפים אינו שלם. יש לבדוק את הקבוצות והקבצים.',
  insufficient_cards: 'אין מספיק קבוצות מאושרות למספר המשתתפות שבחרת.',
  rate_limited: 'בוצעו בקשות רבות. המתיני רגע ונסי שוב.',
  file_invalid: 'יש לבחור תמונת PNG, JPEG, WebP או קובץ PDF תקין עד 12 מ״ב.',
  file_missing: 'קובץ הקלף אינו זמין כרגע. פני למדריכה.',
  storage_unavailable: 'אחסון הקלפים אינו זמין בבטחה. יש לפנות למנהלת המערכת.',
  server_error: 'לא הצלחנו להשלים את הפעולה. נסי שוב בעוד רגע.',
};

class HttpError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

function databaseError(error, action) {
  const candidate = String(error?.message || '').toLowerCase();
  const aliases = {
    not_authorized: 'forbidden', not_found: 'room_not_found', expired: 'room_expired',
    full: 'room_full', closed: 'room_closed', not_ready: 'roster_incomplete',
    insufficient_catalog: 'insufficient_cards', invalid_catalog: 'catalog_invalid',
    rate_limit: 'rate_limited', conflict: 'card_taken',
    invalid_count: 'invalid_request', catalog_incomplete: 'catalog_invalid',
    capacity_exceeded: 'insufficient_cards', card_group_immutable: 'catalog_invalid',
    room_unavailable: 'room_not_found', join_closed: 'room_closed',
    participation_invalid: 'invalid_token', asset_unavailable: 'file_missing',
    choosing_closed: 'invalid_phase', waiting_for_players: 'roster_incomplete',
    waiting_for_choices: 'choices_incomplete', registration_locked: 'invalid_phase',
    player_unavailable: 'invalid_request', unknown_action: 'invalid_request',
  };
  let code = Object.keys(MESSAGES).find(key => candidate === key || candidate.startsWith(key + ':'));
  code ||= aliases[candidate];
  if (!code && error?.code === '23505') code = action?.startsWith('admin.') ? 'catalog_invalid' : 'card_taken';
  if (!code && ['23514', '23502', '22P02', '22003'].includes(error?.code)) code = 'invalid_request';
  const status = code === 'forbidden' ? 403 : code === 'invalid_token' ? 401 :
    code === 'rate_limited' ? 429 : code === 'file_missing' ? 404 : code === 'card_taken' || code === 'already_chosen' ? 409 :
      code ? 400 : 503;
  return new HttpError(code || 'server_error', status);
}

async function boundedBytes(request, max) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) throw new HttpError('invalid_request', 413);
  if (!request.body) throw new HttpError('invalid_request');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) { await reader.cancel(); throw new HttpError('invalid_request', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

function detectedExtension(bytes) {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && new TextDecoder().decode(bytes.slice(1, 8)) === 'PNG\r\n\x1a\n') return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'webp';
  if (new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-') return 'pdf';
  return null;
}

function personalResult(data) {
  // This explicit projection prevents a future SQL addition from exposing names,
  // group maps or file paths to participants by accident.
  const room = data?.room || {};
  const player = data?.player || {};
  const card = player.card;
  const result = {
    room: Object.fromEntries(['id', 'code', 'phase', 'expected', 'expires_at', 'realtime_topic']
      .filter(key => room[key] !== undefined).map(key => [key, room[key]])),
    player: {
      id: player.id,
      name: player.name,
      card: card ? {
        number: card.number, woman_name: card.woman_name, field: card.field,
        has_front: Boolean(card.front_path), has_back: Boolean(card.back_path),
      } : null,
    },
    progress: {
      verified: data?.progress?.verified === true,
      confirmed: data?.progress?.confirmed === true,
      group_size: [2,3].includes(data?.progress?.group_size) ? data.progress.group_size : null,
      hint: data?.progress?.verified === true && typeof data?.progress?.hint === 'string' ? data.progress.hint : null,
    },
    taken: Array.isArray(data?.taken) ? data.taken.filter(Number.isInteger) : [],
  };
  if (typeof data?.token === 'string') result.token = data.token;
  return result;
}

function payloadFor(action, value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError('invalid_request');
  const payload = { ...value };
  // Only the gateway may set rate-limit identity. Never pass actor/session claims.
  for (const key of ['_rate_key', 'actor', 'actor_id', 'p_actor', 'role', 'user_id']) delete payload[key];
  if ('name' in payload && (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 60 || /[<>\u0000-\u001f\u007f]/u.test(payload.name))) {
    throw new HttpError('invalid_request');
  }
  if (action === 'participant.join' && (typeof payload.join_key !== 'string' || !/^[a-zA-Z0-9_-]{32,128}$/.test(payload.join_key))) throw new HttpError('invalid_request');
  if (action.endsWith('.asset') && !['front', 'back'].includes(payload.side)) throw new HttpError('invalid_request');
  if (action === 'participant.verify_match' &&
      (!Array.isArray(payload.numbers) || payload.numbers.length < 1 || payload.numbers.length > 2 ||
       payload.numbers.some(n => !Number.isInteger(n) || n < 1 || n > 250))) throw new HttpError('match_invalid_input');
  return payload;
}

export function createHandler({ client, allowedOrigins = DEFAULT_ORIGINS, crypto = globalThis.crypto }) {
  const origins = new Set(allowedOrigins);
  async function actorFor(request) {
    const header = request.headers.get('authorization') || '';
    const match = /^Bearer ([^\s]+)$/i.exec(header);
    if (!match) throw new HttpError('unauthorized', 401);
    const { data, error } = await client.auth.getUser(match[1]);
    if (error || !data?.user?.id) throw new HttpError('unauthorized', 401);
    return data.user.id;
  }
  async function rpc(action, actor, token, payload) {
    const { data, error } = await client.rpc('inspiration_rpc', {
      p_action: action, p_actor: actor, p_token: token, p_payload: payload,
    });
    if (error) throw databaseError(error, action);
    return data;
  }
  async function requirePrivateBucket() {
    const { data, error } = await client.storage.getBucket('inspiration-cards');
    if (error || !data || data.public !== false) throw new HttpError('storage_unavailable', 503);
  }
  return async function handler(request) {
    const origin = request.headers.get('origin');
    const allowed = origin && origins.has(origin);
    const headers = new Headers({
      'Cache-Control': 'no-store, private', Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      Vary: 'Origin',
    });
    if (allowed) headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    function json(value, status = 200) {
      const h = new Headers(headers); h.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify(value), { status, headers: h });
    }
    try {
      if (!allowed) throw new HttpError('forbidden', 403);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (request.method !== 'POST') return json({ error: { code: 'invalid_request', message: MESSAGES.invalid_request } }, 405);
      const type = request.headers.get('content-type') || '';
      if (type.startsWith('multipart/form-data;')) {
        const actor = await actorFor(request);
        const identity = await rpc('teacher.me', actor, null, {});
        if (!identity?.is_admin) throw new HttpError('forbidden', 403);
        await requirePrivateBucket();
        const bytes = await boundedBytes(request, MAX_FILE + 16 * 1024);
        const form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': type }, body: bytes }).formData();
        const file = form.get('file');
        if (form.get('action') !== 'admin.upload' || !file || typeof file === 'string' || file.size < 12 || file.size > MAX_FILE) throw new HttpError('file_invalid');
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const extension = detectedExtension(fileBytes);
        if (!extension || file.type !== MIME[extension]) throw new HttpError('file_invalid');
        const path = `${crypto.randomUUID()}.${extension}`;
        const { error } = await client.storage.from('inspiration-cards').upload(path, fileBytes, { contentType: MIME[extension], upsert: false, cacheControl: '0' });
        if (error) throw new HttpError('server_error', 503);
        return json({ path, mime: MIME[extension] });
      }
      if (!type.startsWith('application/json')) throw new HttpError('invalid_request', 415);
      const bytes = await boundedBytes(request, MAX_JSON);
      let body;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError('invalid_request'); }
      if (!body || typeof body !== 'object' || !ACTIONS.has(body.action)) throw new HttpError('invalid_request');
      const { action } = body;
      const participant = action.startsWith('participant.');
      const actor = participant ? null : await actorFor(request);
      // Cloudflare overwrites CF-Connecting-IP. For an appended forwarding chain,
      // use its last hop rather than a client-supplied leading address. Deployments
      // must retain the platform proxy; these headers are not client identity.
      const ip = request.headers.get('cf-connecting-ip')?.trim() ||
        (request.headers.get('x-forwarded-for') || 'unknown').split(',').at(-1).trim();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
      const requestHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      if (participant) {
        // A separate committed transaction counts invalid room/token/claim attempts
        // even if the authoritative game RPC subsequently rolls back.
        const { data: permitted, error } = await client.rpc('inspiration_rate_limit', {
          p_key: `${action === 'participant.join' ? 'join' : 'public'}:${requestHash}`,
          p_limit: action === 'participant.join' ? 240 : 2000,
        });
        if (error) throw new HttpError('server_error', 503);
        if (permitted !== true) throw new HttpError('rate_limited', 429);
      }
      const token = participant && action !== 'participant.join' ? body.token : null;
      if (participant && action !== 'participant.join' && (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{32,256}$/.test(token))) throw new HttpError('invalid_token', 401);
      const payload = payloadFor(action, body.payload);
      payload._rate_key = requestHash;
      const data = await rpc(action, actor, token, payload);
      if (action.endsWith('.asset')) {
        const path = data?.path;
        // Public, immutable-by-path artwork lives on the existing course website.
        // RPC authorization still runs before the redirect. The allowlisted
        // relative path cannot be used to redirect to an arbitrary origin.
        const siteCard = typeof path === 'string'
          ? /^site:women\/([A-Za-z0-9_-]+\.(?:png|jpg|jpeg|webp|pdf))$/.exec(path)
          : null;
        if (siteCard) {
          const mediaHeaders = new Headers(headers);
          mediaHeaders.set('Location', new URL('./cards/women/' + siteCard[1], 'https://portzot-derech.org/inspiration/').href);
          // 303 converts the authenticated POST to a GET on GitHub Pages.
          // The public artwork is not mirrored to Supabase Storage.
          return new Response(null, { status: 303, headers: mediaHeaders });
        }
        const extension = typeof path === 'string' ? path.split('.').pop().toLowerCase() : '';
        if (!path || !MIME[extension] || path.includes('..') || path.startsWith('/') || /[?#\\]/.test(path)) throw new HttpError('file_missing', 404);
        await requirePrivateBucket();
        const { data: blob, error } = await client.storage.from('inspiration-cards').download(path);
        if (error || !blob) throw new HttpError('file_missing', 404);
        const mediaHeaders = new Headers(headers);
        mediaHeaders.set('Content-Type', MIME[extension]);
        mediaHeaders.set('Content-Disposition', 'inline');
        return new Response(blob, { status: 200, headers: mediaHeaders });
      }
      return json(participant ? personalResult(data) : data);
    } catch (error) {
      const safe = error instanceof HttpError ? error : new HttpError('server_error', 503);
      if (safe.status === 429) headers.set('Retry-After', '60');
      return json({ error: { code: safe.code, message: MESSAGES[safe.code] || MESSAGES.server_error } }, safe.status);
    }
  };
}
