// Unicode fonts and direction-aware shaping for Hebrew, Arabic and Latin names.
// Assets are packaged with this function: no runtime public/CDN dependency.
export async function buildPdf(snapshot, { PDFDocument, rgb, fontkit, bidi, regularBytes, boldBytes, logoBytes }) {
  const pdf = await PDFDocument.create();
  // Force each bidi run's shaping direction; never reverse shaped Arabic letters.
  async function embed(bytes, direction) {
    pdf.registerFontkit({ create(data) {
      const face = fontkit.create(data), layout = face.layout.bind(face);
      face.layout = (text, features) => layout(text, features, undefined, undefined, direction);
      return face;
    }});
    return pdf.embedFont(bytes, { subset: false });
  }
  const font = await embed(regularBytes, 'ltr');
  const rtlFont = await embed(regularBytes, 'rtl');
  const bold = await embed(boldBytes, 'ltr');
  const rtlBold = await embed(boldBytes, 'rtl');
  const supported = new Set(font.getCharacterSet());
  const logo = await pdf.embedPng(logoBytes);
  // Ignore decorative emoji/control characters in the printed copy only.
  const safe = value => Array.from(String(value ?? '').normalize('NFC'))
    .filter(c => !/[\p{Extended_Pictographic}\p{Cf}\uFE0E\uFE0F]/u.test(c))
    .map(c => /\s/u.test(c) ? ' ' : supported.has(c.codePointAt(0)) ? c : '?')
    .join('').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  function runs(text, size, f = font) {
    const source = safe(text);
    if (!source) return [];
    const embedding = bidi.getEmbeddingLevels(source, 'rtl');
    const logical = [];
    const script = c => /\p{Script=Arabic}/u.test(c) ? 'arab' : /\p{Script=Hebrew}/u.test(c) ? 'hebr' : /\p{Script=Latin}/u.test(c) ? 'latn' : null;
    for (let i = 0; i < source.length;) {
      const level = embedding.levels[i]; let end = i + 1;
      let activeScript = script(source[i]);
      while (end < source.length && embedding.levels[end] === level) {
        const nextScript = script(source[end]);
        if (nextScript && activeScript && nextScript !== activeScript) break;
        activeScript ||= nextScript; end++;
      }
      const face = level % 2 ? (f === bold ? rtlBold : rtlFont) : f;
      const value = source.slice(i, end);
      logical.push({ start: i, end, level, value, face, width: face.widthOfTextAtSize(value, size) });
      i = end;
    }
    const indices = Array.from({length: source.length}, (_, i) => i);
    for (const [start, end] of bidi.getReorderSegments(source, embedding))
      indices.splice(start, end-start+1, ...indices.slice(start, end+1).reverse());
    return logical.sort((a,b) => indices.indexOf(a.start) - indices.indexOf(b.start));
  }
  const width = (text, size, f = font) => runs(text, size, f).reduce((sum, run) => sum + run.width, 0);
  let page, y;
  function draw(text, right, at, size = 10, f = font) {
    const visual = runs(text, size, f);
    let x = right - visual.reduce((sum, run) => sum + run.width, 0);
    for (const run of visual) {
      page.drawText(run.value, { x, y: at, size, font: run.face, color: rgb(.12, .1, .2) });
      x += run.width;
    }
  }

  function wrap(text, max, size = 10, f = font) {
    const lines = []; let line = '';
    for (const word of safe(text).split(' ')) {
      if (line && width(line + ' ' + word, size, f) > max) { lines.push(line); line = ''; }
      // Even a single long name is wrapped without clipping or omission.
      for (const char of word) {
        if (width(line + char, size, f) > max && line) { lines.push(line); line = ''; }
        line += char;
      }
      line += ' ';
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  }
  function newPage(first = false) {
    page = pdf.addPage([595.28, 841.89]);
    const dims = logo.scaleToFit(110, 48);
    page.drawImage(logo, { x: 38, y: 774, width: dims.width, height: dims.height });
    draw('פורצות דרך – דוח חלוקת קבוצות', 557, 792, 19, bold);
    y = 752;
    if (first) {
      const metadata = [
        `מדריך/ה: ${snapshot.instructor_name}`,
        `בית הספר: ${snapshot.school}`,
        `כיתה: ${snapshot.class_name}     תאריך הפעילות: ${snapshot.activity_date}`,
        `מספר משתתפות: ${snapshot.participant_count}     מספר קבוצות: ${snapshot.groups.length}`,
      ];
      for (const text of metadata) for (const line of wrap(text, 515)) { draw(line, 557, y); y -= 20; }
      y -= 12;
    }
    page.drawRectangle({ x: 38, y: y - 8, width: 519, height: 28, color: rgb(.93, .89, .97) });
    draw('מספר קבוצה', 545, y, 11, bold);
    draw('שמות המשתתפות בקבוצה', 440, y, 11, bold);
    page.drawLine({ start: { x: 452, y: y - 8 }, end: { x: 452, y: y + 20 }, thickness: .5, color: rgb(.8, .8, .85) });
    y -= 28;
  }
  newPage(true);
  for (const group of snapshot.groups) {
    // One table row per group; names share a single wide cell and wrap together.
    const lines = wrap(group.memberNames.map(safe).filter(Boolean).join('  •  '), 390);
    const height = Math.max(34, lines.length * 20 + 18);
    if (y + 20 - height < 55) newPage();
    const top = y + 20, bottom = top - height;
    draw(`קבוצה ${group.groupNumber}`, 545, y, 11, bold);
    lines.forEach((line, index) => draw(line, 440, y - index * 20));
    for (const x of [38, 452, 557]) page.drawLine({ start: { x, y: top }, end: { x, y: bottom }, thickness: .5, color: rgb(.8, .8, .85) });
    page.drawLine({ start: { x: 38, y: bottom }, end: { x: 557, y: bottom }, thickness: .5, color: rgb(.8, .8, .85) });
    y -= height;
  }
  pdf.getPages().forEach((p, i, pages) => { page = p; draw(`${i + 1} / ${pages.length}`, 310, 27, 9); });
  pdf.setTitle('פורצות דרך – דוח חלוקת קבוצות');
  return pdf.save();
}

