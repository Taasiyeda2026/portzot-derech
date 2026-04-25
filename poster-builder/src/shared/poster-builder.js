import { POSTER_SIZES } from '../products/physical/config.js';

function buildFilename(contentValues, sizeKey) {
  const project = (contentValues?.projectName || '').trim().replace(/\s+/g, '-');
  const school = (contentValues?.schoolName || '').trim().replace(/\s+/g, '-');
  const cls = (contentValues?.className || '').trim().replace(/\s+/g, '');
  const parts = [project, school, cls].filter(Boolean);
  const base = parts.length ? parts.join('_') : `פוסטר-${sizeKey.toLowerCase()}`;
  return `${base}.pdf`;
}

export function exportPDF(canvas, sizeKey, contentValues) {
  const { jsPDF } = window.jspdf;
  const size = POSTER_SIZES[sizeKey];
  const W = size.width;
  const H = size.height;

  const active = canvas.getActiveObject();
  if (active) canvas.discardActiveObject();

  // Save current display state
  const wrapEl    = canvas.wrapperEl;
  const prevStyle = wrapEl ? wrapEl.getAttribute('style') : null;
  const prevVP    = canvas.viewportTransform.slice();
  const prevW     = canvas.getWidth();
  const prevH     = canvas.getHeight();

  // Move wrapper off-screen so the canvas resize is invisible
  if (wrapEl) {
    wrapEl.style.cssText =
      `position:fixed;top:-9999px;left:-9999px;` +
      `width:${W}px;height:${H}px;overflow:hidden;visibility:hidden;`;
  }

  // Resize to full poster resolution with zoom = 1
  canvas.setDimensions({ width: W, height: H });
  canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
  canvas.renderAll();

  // Capture at full resolution (logo drawn by after:render is included)
  const dataUrl = canvas.lowerCanvasEl.toDataURL('image/png', 1);

  // Restore display state
  canvas.setDimensions({ width: prevW, height: prevH });
  canvas.viewportTransform = prevVP;
  if (wrapEl) {
    if (prevStyle !== null) wrapEl.setAttribute('style', prevStyle);
    else wrapEl.removeAttribute('style');
  }
  canvas.renderAll();

  // Build PDF
  const orientation = W >= H ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [W, H] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, W, H);
  pdf.save(buildFilename(contentValues, sizeKey));
}
