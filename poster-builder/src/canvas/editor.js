import {
  SAFE_MARGIN,
  POSTER_SIZES,
  FONT_OPTIONS,
  TEXT_PRESETS,
  CONTENT_BOXES,
  TEMPLATE_LAYOUT
} from '../data/config.js';

const DEFAULT_TEXT_FONT = 'IBMPlexSansHebrew';

function textBase(preset, overrides = {}) {
  return {
    originX: 'right',
    originY: 'top',
    textAlign: 'right',
    direction: 'rtl',
    fill: '#1F3A5F',
    fontFamily: DEFAULT_TEXT_FONT,
    fontWeight: preset.weight ?? 400,
    fontSize: preset.size,
    editable: true,
    ...overrides
  };
}

function keepInside(canvas, obj) {
  const bounds = obj.getBoundingRect(true);
  let left = obj.left;
  let top = obj.top;
  const maxX = canvas.width - SAFE_MARGIN;
  const minX = SAFE_MARGIN;
  const minY = SAFE_MARGIN;
  const maxY = canvas.height - SAFE_MARGIN;

  if (bounds.left < minX) left += minX - bounds.left;
  if (bounds.top < minY) top += minY - bounds.top;
  if (bounds.left + bounds.width > maxX) left -= bounds.left + bounds.width - maxX;
  if (bounds.top + bounds.height > maxY) top -= bounds.top + bounds.height - maxY;
  obj.set({ left, top });
}

export function registerFonts() {
  FONT_OPTIONS.forEach((font) => {
    const fontFace = new FontFace(font.family, `url(${font.file})`, { weight: `${font.weight}` });
    fontFace.load().then((loaded) => document.fonts.add(loaded)).catch(() => null);
  });
}

export function createEditor(element, sizeKey) {
  const size = POSTER_SIZES[sizeKey];
  const canvas = new fabric.Canvas(element, {
    width: size.width,
    height: size.height,
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: '#ffffff'
  });

  const safeRect = new fabric.Rect({
    left: SAFE_MARGIN,
    top: SAFE_MARGIN,
    width: size.width - SAFE_MARGIN * 2,
    height: size.height - SAFE_MARGIN * 2,
    stroke: '#D9DEE8',
    strokeDashArray: [18, 12],
    fill: 'transparent',
    selectable: false,
    evented: false,
    excludeFromExport: true
  });
  canvas.add(safeRect);
  safeRect.sendToBack();

  const centerV = new fabric.Line([size.width / 2, SAFE_MARGIN, size.width / 2, size.height - SAFE_MARGIN], {
    stroke: '#EEF2F8',
    strokeWidth: 2,
    selectable: false,
    evented: false,
    excludeFromExport: true
  });
  const centerH = new fabric.Line([SAFE_MARGIN, size.height / 2, size.width - SAFE_MARGIN, size.height / 2], {
    stroke: '#EEF2F8',
    strokeWidth: 2,
    selectable: false,
    evented: false,
    excludeFromExport: true
  });
  canvas.add(centerV, centerH);
  centerH.sendToBack();
  centerV.sendToBack();

  canvas.on('object:moving', (e) => {
    keepInside(canvas, e.target);
    if (Math.abs(e.target.left - size.width / 2) < 35) e.target.set({ left: size.width / 2 });
  });

  canvas.on('object:scaling', (e) => keepInside(canvas, e.target));

  return canvas;
}

export function resizeCanvas(canvas, sizeKey) {
  const size = POSTER_SIZES[sizeKey];
  canvas.setDimensions({ width: size.width, height: size.height });
  canvas.renderAll();
}

export function applyBackground(canvas, path) {
  if (!path) {
    canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
    return;
  }
  fabric.Image.fromURL(path, (img) => {
    img.scaleToWidth(canvas.width);
    img.scaleToHeight(canvas.height);
    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
      originX: 'left',
      originY: 'top'
    });
  }, { crossOrigin: 'anonymous' });
}

export function addTextPreset(canvas, presetId) {
  const preset = TEXT_PRESETS.find((p) => p.id === presetId);
  const text = new fabric.IText(preset.text, textBase(preset, {
    left: canvas.width - SAFE_MARGIN - 40,
    top: SAFE_MARGIN + 80
  }));
  text.setControlsVisibility({ mtr: false });
  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.renderAll();
}

export function addElement(canvas, path) {
  fabric.Image.fromURL(path, (img) => {
    img.set({ left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center' });
    img.scaleToWidth(Math.min(440, canvas.width / 4));
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }, { crossOrigin: 'anonymous' });
}

export function addContentBox(canvas, boxId, color = '#FAF8FE') {
  const config = CONTENT_BOXES.find((box) => box.id === boxId);
  const width = 940;
  const height = 420;

  const rect = new fabric.Rect({
    width,
    height,
    rx: 24,
    ry: 24,
    fill: color,
    stroke: '#D5DDEA',
    strokeWidth: 2,
    originX: 'center',
    originY: 'center'
  });
  const title = new fabric.IText(config.title, textBase({ size: 56, weight: 700 }, { top: -height / 2 + 40, left: width / 2 - 40 }));
  const body = new fabric.IText(config.text, textBase({ size: 38, weight: 400 }, { top: -height / 2 + 130, left: width / 2 - 40 }));

  [title, body].forEach((item) => item.setControlsVisibility({ mtr: false }));

  const group = new fabric.Group([rect, title, body], {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: 'center',
    originY: 'center'
  });
  group.set({ subTargetCheck: true });
  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.renderAll();
}

export function duplicateActiveObject(canvas) {
  const active = canvas.getActiveObject();
  if (!active) return;
  active.clone((cloned) => {
    cloned.set({ left: active.left - 40, top: active.top + 40 });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.renderAll();
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
  canvas.renderAll();
}

export function removeActiveObject(canvas) {
  const active = canvas.getActiveObject();
  if (!active) return;
  canvas.remove(active);
  canvas.discardActiveObject();
  canvas.renderAll();
}

export function buildTemplate(canvas) {
  canvas.getObjects().forEach((obj) => {
    if (!obj.excludeFromExport) canvas.remove(obj);
  });

  TEMPLATE_LAYOUT.forEach((item) => {
    if (item.type === 'title' || item.type === 'subtitle' || item.type === 'footer') {
      const text = new fabric.IText(item.text, textBase({ size: item.size, weight: item.type === 'title' ? 700 : 500 }, {
        left: item.left,
        top: item.top
      }));
      text.setControlsVisibility({ mtr: false });
      canvas.add(text);
    }

    if (item.type === 'box') {
      const rect = new fabric.Rect({
        width: item.width,
        height: item.height,
        fill: '#F7FAFF',
        stroke: '#D5DDEA',
        strokeWidth: 2,
        rx: 20,
        ry: 20,
        originX: 'right',
        originY: 'top'
      });
      const title = new fabric.IText(item.title, textBase({ size: 52, weight: 700 }, { left: item.width - 40, top: 35 }));
      const body = new fabric.IText(item.text, textBase({ size: 34, weight: 400 }, { left: item.width - 40, top: 120 }));
      const group = new fabric.Group([rect, title, body], {
        left: item.left,
        top: item.top,
        originX: 'right',
        originY: 'top'
      });
      canvas.add(group);
    }
  });
  canvas.renderAll();
}
