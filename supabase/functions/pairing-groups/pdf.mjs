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
    draw('קבוצה', 550, y, 11, bold); draw('שמות המשתתפות', 490, y, 11, bold); draw('מספר', 88, y, 11, bold);
    y -= 32;
  }
  newPage(true);
  for (const group of snapshot.groups) {
    const lines = group.memberNames.flatMap(name => wrap(name, 370));
    const height = Math.max(30, lines.length * 17 + 12);
    if (y - height < 55) newPage();
    draw(String(group.groupNumber), 545, y, 12, bold);
    draw(String(group.memberNames.length), 80, y, 12);
    for (const line of lines) { draw(line, 490, y); y -= 17; }
    y -= 12;
    page.drawLine({ start: { x: 38, y: y + 15 }, end: { x: 557, y: y + 15 }, thickness: .5, color: rgb(.8, .8, .85) });
  }
  pdf.getPages().forEach((p, i, pages) => { page = p; draw(`${i + 1} / ${pages.length}`, 310, 27, 9); });
  pdf.setTitle('פורצות דרך – דוח חלוקת קבוצות');
  return pdf.save();
}
