import { POSTER_SIZES } from '../products/physical/config.js';

const A4_W = 2480;
const A4_H = 3508;
const A1_W = 7016;
const A1_H = 9933;
const A1_SCALE = A1_W / A4_W;

function buildFilename(contentValues, suffix) {
  const project = (contentValues?.projectName || '').trim().replace(/\s+/g, '-');
  const base = project || 'פוסטר';
  return suffix ? `${base}-${suffix}.pdf` : `${base}.pdf`;
}

function captureOffScreen(canvas, targetW, targetH, scaleX, scaleY) {
  const active = canvas.getActiveObject();
  if (active) canvas.discardActiveObject();

  const wrapEl    = canvas.wrapperEl;
  const prevStyle = wrapEl ? wrapEl.getAttribute('style') : null;
  const prevVP    = canvas.viewportTransform.slice();
  const prevW     = canvas.getWidth();
  const prevH     = canvas.getHeight();

  if (wrapEl) {
    wrapEl.style.cssText =
      `position:fixed;top:-9999px;left:-9999px;` +
      `width:${targetW}px;height:${targetH}px;overflow:hidden;visibility:hidden;`;
  }

  canvas.setDimensions({ width: targetW, height: targetH });
  canvas.viewportTransform = [scaleX, 0, 0, scaleY, 0, 0];
  canvas.renderAll();

  const dataUrl = canvas.lowerCanvasEl.toDataURL('image/png', 1);

  canvas.setDimensions({ width: prevW, height: prevH });
  canvas.viewportTransform = prevVP;
  if (wrapEl) {
    if (prevStyle !== null) wrapEl.setAttribute('style', prevStyle);
    else wrapEl.removeAttribute('style');
  }
  canvas.renderAll();

  return dataUrl;
}

export function exportPDF(canvas, sizeKey, contentValues) {
  const { jsPDF } = window.jspdf;
  const size = POSTER_SIZES[sizeKey];
  const W = size.width;
  const H = size.height;

  const dataUrl = captureOffScreen(canvas, W, H, 1, 1);

  const orientation = W >= H ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [W, H] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, W, H);
  pdf.save(buildFilename(contentValues, null));
}

export function exportPDFA1(canvas, contentValues) {
  const { jsPDF } = window.jspdf;

  const dataUrl = captureOffScreen(canvas, A1_W, A1_H, A1_SCALE, A1_SCALE);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A1_W, A1_H] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, A1_W, A1_H);
  pdf.save(buildFilename(contentValues, 'A1'));
}
