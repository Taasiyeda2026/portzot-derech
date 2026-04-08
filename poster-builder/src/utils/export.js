import { POSTER_SIZES } from '../data/config.js';

export function exportPNG(canvas, sizeKey) {
  const active = canvas.getActiveObject();
  if (active) canvas.discardActiveObject();
  canvas.renderAll();
  const zoom = canvas.getZoom() || 1;
  const dataUrl = canvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 1 / zoom
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `poster-${sizeKey.toLowerCase()}.png`;
  link.click();
}

export function exportPDF(canvas, sizeKey) {
  const { jsPDF } = window.jspdf;
  const active = canvas.getActiveObject();
  if (active) canvas.discardActiveObject();
  canvas.renderAll();
  const zoom = canvas.getZoom() || 1;
  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 / zoom });
  const pdf = new jsPDF({
    orientation: POSTER_SIZES[sizeKey].width >= POSTER_SIZES[sizeKey].height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [POSTER_SIZES[sizeKey].width, POSTER_SIZES[sizeKey].height]
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, POSTER_SIZES[sizeKey].width, POSTER_SIZES[sizeKey].height);
  pdf.save(`poster-${sizeKey.toLowerCase()}.pdf`);
}
