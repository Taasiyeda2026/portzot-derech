const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUIRED_COLUMNS = ['group_id', 'symbol', 'size', 'name', 'field', 'front_path'];

// Parse CSV before any API request. Quoted commas, escaped quotes, CRLF and
// multiline cells are supported; malformed quoting is rejected explicitly.
export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false, closed = false;
  text = String(text).replace(/^\uFEFF/, '');
  function endCell() { row.push(cell); cell = ''; closed = false; }
  function endRow() {
    endCell();
    if (row.some(value => value.trim())) rows.push(row);
    row = [];
  }
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') { cell += '"'; index++; }
        else { quoted = false; closed = true; }
      } else cell += character;
    } else if (character === ',') endCell();
    else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index++;
      endRow();
    } else if (closed) throw new Error('מבנה CSV לא תקין: תו לא צפוי אחרי מרכאות סוגרות.');
    else if (character === '"') {
      if (cell) throw new Error('מבנה CSV לא תקין: מרכאות בתוך שדה.');
      quoted = true;
    } else cell += character;
  }
  if (quoted) throw new Error('מבנה CSV לא תקין: חסרות מרכאות סוגרות.');
  endRow();
  if (rows.length < 2) throw new Error('מבנה CSV לא תקין: הקובץ חייב לכלול שורת כותרות וקלף אחד לפחות.');
  const headers = rows.shift().map(value => value.trim());
  if (new Set(headers).size !== headers.length || headers.some(value => !value)) throw new Error('מבנה CSV לא תקין: כותרות העמודות חייבות להיות ייחודיות ולא ריקות.');
  for (const required of REQUIRED_COLUMNS) if (!headers.includes(required)) throw new Error(`חסרה עמודה בקובץ CSV: ${required}`);
  const groups = new Map();
  const boolean = value => !['false', '0', 'לא'].includes(String(value ?? '').trim().toLowerCase());
  for (const values of rows) {
    if (values.length !== headers.length) throw new Error('מבנה CSV לא תקין: מספר העמודות אינו תואם לכותרות.');
    const entry = Object.fromEntries(headers.map((header, index) => [header, values[index].trim()]));
    if (!UUID.test(entry.group_id)) throw new Error('מבנה CSV לא תקין: יש לציין מזהה קבוצה UUID תקין בכל שורה.');
    if (entry.id && !UUID.test(entry.id)) throw new Error('מבנה CSV לא תקין: מזהה קלף קיים חייב להיות UUID תקין.');
    const groupId = entry.group_id.toLowerCase();
    const size = Number(entry.size);
    if (size !== 2 && size !== 3) throw new Error('מבנה CSV לא תקין: קבוצת התאמה חייבת לכלול שניים או שלושה קלפים.');
    const active = boolean(entry.group_active);
    if (!groups.has(groupId)) groups.set(groupId, { id: groupId, symbol: entry.symbol, size, active, cards: [] });
    const group = groups.get(groupId);
    if (group.symbol !== entry.symbol || group.size !== size || group.active !== active) throw new Error('מבנה CSV לא תקין: לאותה קבוצה הוגדרו סמל, גודל או מצב פעילות שונים.');
    group.cards.push({ id: entry.id?.toLowerCase() || crypto.randomUUID(), woman_name: entry.name, field: entry.field, front_path: entry.front_path, back_path: entry.back_path || null, active: boolean(entry.active) });
  }
  return { groups: [...groups.values()] };
}
