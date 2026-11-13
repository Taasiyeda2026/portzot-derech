// Same proven Alef/fontkit/bidi pipeline as payroll-attendance-pdf-dispatch.
// Assets are packaged with this function: no runtime public/CDN dependency.
export async function buildPdf(snapshot, { PDFDocument, rgb, fontkit, bidi, regularBytes, boldBytes, logoBytes }) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const logo = await pdf.embedPng(logoBytes);
  const safe = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const rendered = value => {
    const source = safe(value);
    // Numeral-only cells are LTR; fontkit does not apply Hebrew ordering there.
    if (!/[\u0590-\u05ff]/u.test(source)) return source;
    const chars = source.split('');
    const levels = bidi.getEmbeddingLevels(source, 'rtl');
    for (const [start, end] of bidi.getReorderSegments(source, levels)) {
      let left = start, right = end;
      while (left < right) { [chars[left], chars[right]] = [chars[right], chars[left]]; left++; right--; }
    }
    return Array.from(chars.join('')).reverse().join('');
  };
  const width = (text, size, f = font) => f.widthOfTextAtSize(rendered(text), size);
  let page, y;
  function draw(text, right, at, size = 11, f = font) {
    const value = rendered(text);
    page.drawText(value, { x: right - f.widthOfTextAtSize(value, size), y: at, size, font: f, color: rgb(.12, .1, .2) });
  }
  function wrap(text, max, size = 11, f = font) {
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
      for (const text of metadata) for (const line of wrap(text, 515)) { draw(line, 557, y); y -= 19; }
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
    const lines = wrap(group.memberNames.join(', '), 390);
    const height = Math.max(34, lines.length * 17 + 18);
    if (y + 20 - height < 55) newPage();
    const top = y + 20, bottom = top - height;
    draw(`קבוצה ${group.groupNumber}`, 545, y, 11, bold);
    lines.forEach((line, index) => draw(line, 440, y - index * 17));
    for (const x of [38, 452, 557]) page.drawLine({ start: { x, y: top }, end: { x, y: bottom }, thickness: .5, color: rgb(.8, .8, .85) });
    page.drawLine({ start: { x: 38, y: bottom }, end: { x: 557, y: bottom }, thickness: .5, color: rgb(.8, .8, .85) });
    y -= height;
  }
  pdf.getPages().forEach((p, i, pages) => { page = p; draw(`${i + 1} / ${pages.length}`, 310, 27, 9); });
  pdf.setTitle('פורצות דרך – דוח חלוקת קבוצות');
  return pdf.save();
}
