import { POSTER_SIZES } from '../data/config.js';

export function exportPNG(canvas, sizeKey) {
  const active = canvas.getActiveObject();
  if (active) canvas.discardActiveObject();
  canvas.renderAll();
  const dataUrl = canvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 1,
    width: POSTER_SIZES[sizeKey].width,
    height: POSTER_SIZES[sizeKey].height,
    left: 0,
    top: 0
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
  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [POSTER_SIZES[sizeKey].width, POSTER_SIZES[sizeKey].height]
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, POSTER_SIZES[sizeKey].width, POSTER_SIZES[sizeKey].height);
  pdf.save(`poster-${sizeKey.toLowerCase()}.pdf`);
}
