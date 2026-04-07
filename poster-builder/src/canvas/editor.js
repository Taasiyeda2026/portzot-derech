import {
  SAFE_MARGIN,
  POSTER_SIZES,
  FONT_OPTIONS,
  TEXT_PRESETS,
  CONTENT_BOXES,
  TEMPLATE_LAYOUT
} from '../data/config.js';

const DEFAULT_TEXT_FONT = 'IBMPlexSansHebrew';

function resolveAssetPath(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/poster-builder/')) return path.replace('/poster-builder/', './');
  return path;
}

function renderCanvas(canvas) {
  canvas.requestRenderAll();
  console.log('canvas rendered');
}

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
  element.width = size.width;
  element.height = size.height;

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

  const centerV = new fabric.Line(
    [size.width / 2, SAFE_MARGIN, size.width / 2, size.height - SAFE_MARGIN],
    {
      stroke: '#EEF2F8',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      excludeFromExport: true
    }
  );

  const centerH = new fabric.Line(
    [SAFE_MARGIN, size.height / 2, size.width - SAFE_MARGIN, size.height / 2],
    {
      stroke: '#EEF2F8',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      excludeFromExport: true
    }
  );

  canvas.add(safeRect, centerV, centerH);
  safeRect.sendToBack();
  centerV.sendToBack();
  centerH.sendToBack();

  canvas.on('object:moving', (e) => {
    if (!e.target) return;
    keepInside(canvas, e.target);
    if (Math.abs(e.target.left - size.width / 2) < 35) {
      e.target.set({ left: size.width / 2 });
    }
  });

  canvas.on('object:scaling', (e) => {
    if (!e.target) return;
    keepInside(canvas, e.target);
  });

  canvas.renderAll();
  return canvas;
}

export function resizeCanvas(canvas, sizeKey) {
  const size = POSTER_SIZES[sizeKey];
  canvas.setDimensions({ width: size.width, height: size.height });
  canvas.renderAll();
}

export function applyBackground(canvas, path) {
  const resolvedPath = resolveAssetPath(path);
  console.log('background image resolved', resolvedPath);

  if (!resolvedPath) {
    canvas.setBackgroundImage(null, () => {
      console.log('background applied');
      console.info('[PosterBuilder] background loaded', { path: null });
      renderCanvas(canvas);
    });
    return;
  }

  fabric.Image.fromURL(
    resolvedPath,
    (img) => {
      if (!img) return;

      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      canvas.setBackgroundImage(
        img,
        () => {
          console.log('background applied');
          console.info('[PosterBuilder] background loaded', { path: resolvedPath });
          renderCanvas(canvas);
        },
        {
          originX: 'left',
          originY: 'top',
          left: (canvas.width - scaledWidth) / 2,
          top: (canvas.height - scaledHeight) / 2,
          scaleX: scale,
          scaleY: scale
        }
      );
    },
    { crossOrigin: 'anonymous' }
  );
}

export function addTextPreset(canvas, presetId) {
  const preset = TEXT_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;

  const text = new fabric.IText(
    preset.text,
    textBase(preset, {
      left: canvas.width - SAFE_MARGIN - 40,
      top: SAFE_MARGIN + 80
    })
  );

  text.setControlsVisibility({ mtr: false });
  canvas.add(text);
  canvas.setActiveObject(text);
  renderCanvas(canvas);
}

export function addElement(canvas, path) {
  const resolvedPath = resolveAssetPath(path);

  fabric.Image.fromURL(
    resolvedPath,
    (img) => {
      if (!img) return;

      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockScalingX: false,
        lockScalingY: false
      });

      img.scaleToWidth(Math.min(440, canvas.width / 4));
      img.setCoords();

      canvas.add(img);
      canvas.setActiveObject(img);

      console.log('icon added', resolvedPath);
      console.log('icon controls enabled');

      renderCanvas(canvas);
    },
    { crossOrigin: 'anonymous' }
  );
}

export function addContentBox(canvas, boxId, color = '#FAF8FE') {
  const config = CONTENT_BOXES.find((box) => box.id === boxId);
  if (!config) return;

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

  const title = new fabric.IText(
    config.title,
    textBase(
      { size: 56, weight: 700 },
      { top: -height / 2 + 40, left: width / 2 - 40 }
    )
  );

  const body = new fabric.IText(
    config.text,
    textBase(
      { size: 38, weight: 400 },
      { top: -height / 2 + 130, left: width / 2 - 40 }
    )
  );

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
  renderCanvas(canvas);
}

export function duplicateActiveObject(canvas) {
  const active = canvas.getActiveObject();
  if (!active) return;

  active.clone((cloned) => {
    cloned.set({
      left: active.left - 40,
      top: active.top + 40
    });
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

export function buildTemplate(canvas) {
  canvas.getObjects().slice().forEach((obj) => {
    if (!obj.excludeFromExport) {
      canvas.remove(obj);
    }
  });

  TEMPLATE_LAYOUT.forEach((item) => {
    if (item.type === 'title' || item.type === 'subtitle' || item.type === 'footer') {
      const text = new fabric.IText(
        item.text,
        textBase(
          { size: item.size, weight: item.type === 'title' ? 700 : 500 },
          {
            left: item.left,
            top: item.top
          }
        )
      );

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

      const title = new fabric.IText(
        item.title,
        textBase(
          { size: 52, weight: 700 },
          { left: item.width - 40, top: 35 }
        )
      );

      const body = new fabric.IText(
        item.text,
        textBase(
          { size: 34, weight: 400 },
          { left: item.width - 40, top: 120 }
        )
      );

      const group = new fabric.Group([rect, title, body], {
        left: item.left,
        top: item.top,
        originX: 'right',
        originY: 'top'
      });

      canvas.add(group);
    }
  });

  renderCanvas(canvas);
  console.info('[PosterBuilder] canvas rendered');
}
