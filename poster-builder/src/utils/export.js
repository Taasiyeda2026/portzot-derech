import { POSTER_SIZES } from '../data/config.js';

function buildFilename(contentValues, sizeKey) {
  const project = (contentValues?.projectName  || '').trim().replace(/\s+/g, '-');
  const school  = (contentValues?.schoolName   || '').trim().replace(/\s+/g, '-');
  const cls     = (contentValues?.className    || '').trim().replace(/\s+/g, '');
  const parts   = [project, school, cls].filter(Boolean);
  const base    = parts.length ? parts.join('_') : `פוסטר-${sizeKey.toLowerCase()}`;
  return `${base}.pdf`;
}

export function exportPNG(canvas, sizeKey) {
  const active = canvas.getActiveObject();
  if (active) canvas.discardActiveObject();
  canvas.renderAll();
  const zoom = canvas.getZoom() || 1;
  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 / zoom });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `poster-${sizeKey.toLowerCase()}.png`;
  link.click();
}

export function exportPDF(canvas, sizeKey, contentValues) {
  const { jsPDF } = window.jspdf;
  const active = canvas.getActiveObject();
  if (active) canvas.discardActiveObject();
  canvas.renderAll();
  const zoom    = canvas.getZoom() || 1;
  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 / zoom });
  const size    = POSTER_SIZES[sizeKey];
  const pdf = new jsPDF({
    orientation: size.width >= size.height ? 'landscape' : 'portrait',
    unit:        'px',
    format:      [size.width, size.height]
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, size.width, size.height);
  pdf.save(buildFilename(contentValues, sizeKey));
}
