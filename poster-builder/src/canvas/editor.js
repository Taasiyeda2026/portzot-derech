import { POSTER_SIZES, normalizePosterSize, getPosterFields } from '../data/config.js';

const DEFAULT_TEXT_FONT = 'IBMPlexSansHebrew';

function resolveAssetPath(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/poster-builder/')) return path.replace('/poster-builder/', './');
  return path;
}

function renderCanvas(canvas) {
  canvas.requestRenderAll();
}

function getPosterDimensions(canvas) {
  return {
    width: canvas._posterWidth || canvas.getWidth(),
    height: canvas._posterHeight || canvas.getHeight()
  };
}

function fitCanvasToViewport(canvas) {
  const container = canvas.wrapperEl?.parentElement;
  if (!container) return;

  const logicalW = canvas._posterWidth;
  const logicalH = canvas._posterHeight;
  const availableWidth = Math.max(420, container.clientWidth - 32);
  const availableHeight = Math.max(420, container.clientHeight - 32);
  const scale = Math.min(1, availableWidth / logicalW, availableHeight / logicalH);

  canvas.setDimensions({ width: logicalW, height: logicalH });
  canvas.setZoom(scale);

  const cssWidth = Math.round(logicalW * scale);
  const cssHeight = Math.round(logicalH * scale);
  canvas.setDimensions({ width: cssWidth, height: cssHeight }, { cssOnly: true });

  if (canvas.wrapperEl) {
    canvas.wrapperEl.style.width = `${cssWidth}px`;
    canvas.wrapperEl.style.height = `${cssHeight}px`;
    canvas.wrapperEl.style.margin = '0 auto';
  }
}

function getFieldById(sizeKey, id) {
  return getPosterFields(sizeKey).find((field) => field.id === id);
}

function truncateValue(field, value) {
  return (value || '').slice(0, field.maxChars);
}

function fitFieldTextToBox(textObj, field) {
  const maxHeight = Math.max(80, field.height - 110);
  let fontSize = field.fontSize;

  textObj.set({ fontSize });
  textObj.initDimensions();

  while (textObj.height > maxHeight && fontSize > field.minFontSize) {
    fontSize -= 1;
    textObj.set({ fontSize });
    textObj.initDimensions();
  }

  const clipWidth = Math.max(40, field.width - 36);
  textObj.clipPath = new fabric.Rect({
    left: field.x - field.width + 18,
    top: field.y + 90,
    width: clipWidth,
    height: maxHeight,
    originX: 'left',
    originY: 'top',
    absolutePositioned: true
  });
}

function buildFieldObjects(canvas, sizeKey, values = {}) {
  getPosterFields(sizeKey).forEach((field) => {
    const container = new fabric.Rect({
      left: field.x,
      top: field.y,
      width: field.width,
      height: field.height,
      rx: 20,
      ry: 20,
      fill: 'rgba(255,255,255,0.84)',
      stroke: '#D5DDEA',
      strokeWidth: 2,
      originX: 'right',
      originY: 'top',
      selectable: false,
      evented: false
    });
    container.__posterFieldContainer = true;

    const title = new fabric.Text(field.shortLabel, {
      originX: 'right',
      originY: 'top',
      textAlign: field.align,
      direction: 'rtl',
      fill: '#5E2750',
      fontFamily: DEFAULT_TEXT_FONT,
      fontWeight: 700,
      fontSize: 42,
      left: field.x - 18,
      top: field.y + 18,
      selectable: false,
      evented: false
    });
    title.__posterFieldTitle = true;

    const sanitized = truncateValue(field, values[field.id]);
    const valueText = new fabric.Textbox(sanitized, {
      originX: 'right',
      originY: 'top',
      textAlign: field.align,
      direction: 'rtl',
      fill: '#1f2937',
      fontFamily: DEFAULT_TEXT_FONT,
      fontWeight: 400,
      fontSize: field.fontSize,
      left: field.x - 18,
      top: field.y + field.titleSpacing,
      width: field.width - 36,
      selectable: false,
      evented: false,
      editable: false,
      splitByGrapheme: true,
      lineHeight: field.lineHeight
    });

    fitFieldTextToBox(valueText, field);

    valueText.__posterFieldObject = true;
    valueText.__posterFieldId = field.id;

    canvas.add(container, title, valueText);
  });
}

export function registerFonts() {}

export function createEditor(element, sizeKey) {
  const safeSizeKey = normalizePosterSize(sizeKey);
  const size = POSTER_SIZES[safeSizeKey];
  element.width = size.width;
  element.height = size.height;

  const canvas = new fabric.Canvas(element, {
    width: size.width,
    height: size.height,
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: '#ffffff'
  });

  canvas._posterWidth = size.width;
  canvas._posterHeight = size.height;
  canvas._posterSizeKey = safeSizeKey;

  fitCanvasToViewport(canvas);
  renderCanvas(canvas);
  return canvas;
}

export function resizeCanvas(canvas, sizeKey) {
  const safeSizeKey = normalizePosterSize(sizeKey);
  const size = POSTER_SIZES[safeSizeKey];
  canvas._posterWidth = size.width;
  canvas._posterHeight = size.height;
  canvas._posterSizeKey = safeSizeKey;
  fitCanvasToViewport(canvas);
  if (canvas.__posterBackgroundPath !== undefined) {
    applyBackground(canvas, canvas.__posterBackgroundPath || null);
  }
  renderCanvas(canvas);
}

export function applyBackground(canvas, path) {
  canvas.__posterBackgroundPath = path || null;
  const resolvedPath = resolveAssetPath(path);
  const { width: posterWidth, height: posterHeight } = getPosterDimensions(canvas);

  if (!resolvedPath) {
    canvas.setBackgroundImage(null, () => renderCanvas(canvas));
    return;
  }

  fabric.Image.fromURL(
    resolvedPath,
    (img) => {
      if (!img) return;

      const scale = Math.max(posterWidth / img.width, posterHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      canvas.setBackgroundImage(img, () => renderCanvas(canvas), {
        originX: 'left',
        originY: 'top',
        left: (posterWidth - scaledWidth) / 2,
        top: (posterHeight - scaledHeight) / 2,
        scaleX: scale,
        scaleY: scale
      });
    },
    { crossOrigin: 'anonymous' }
  );
}

export function initializePosterFields(canvas, values = {}, sizeKey = canvas._posterSizeKey || 'A4') {
  const existing = canvas
    .getObjects()
    .filter((obj) => obj.__posterFieldObject || obj.__posterFieldContainer || obj.__posterFieldTitle);
  existing.forEach((obj) => canvas.remove(obj));

  buildFieldObjects(canvas, sizeKey, values);
  renderCanvas(canvas);
}

export function updatePosterField(canvas, fieldId, rawValue, sizeKey = canvas._posterSizeKey || 'A4') {
  const field = getFieldById(sizeKey, fieldId);
  if (!field) return '';

  const target = canvas.getObjects().find((obj) => obj.__posterFieldObject && obj.__posterFieldId === fieldId);
  const sanitized = truncateValue(field, rawValue);
  if (!target) return sanitized;

  target.set({ text: sanitized });
  fitFieldTextToBox(target, field);
  target.setCoords();
  renderCanvas(canvas);
  return sanitized;
}

export function addElement(canvas, path) {
  const resolvedPath = resolveAssetPath(path);

  fabric.Image.fromURL(
    resolvedPath,
    (img) => {
      if (!img) return;

      const { width, height } = getPosterDimensions(canvas);
      img.set({
        left: width / 2,
        top: height / 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockScalingX: false,
        lockScalingY: false
      });

      img.scaleToWidth(Math.min(440, width / 4));
      img.setCoords();

      canvas.add(img);
      canvas.setActiveObject(img);
      renderCanvas(canvas);
    },
    { crossOrigin: 'anonymous' }
  );
}

export function duplicateActiveObject(canvas) {
  const active = canvas.getActiveObject();
  if (!active) return;

  active.clone((cloned) => {
    cloned.set({ left: active.left - 40, top: active.top + 40 });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    renderCanvas(canvas);
  });
}

export function setLock(canvas, locked) {
  const active = canvas.getActiveObject();
  if (!active) return;

  active.set({
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked
  });

  renderCanvas(canvas);
}

export function removeActiveObject(canvas) {
  const active = canvas.getActiveObject();
  if (!active) return;

  canvas.remove(active);
  canvas.discardActiveObject();
  renderCanvas(canvas);
}
