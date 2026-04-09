import {
  POSTER_SIZES,
  normalizePosterSize,
  getPosterFields,
  getVisualSlots,
  buildListText,
  DEFAULT_FIELD_FONT
} from '../data/config.js';

const DEFAULT_TEXT_FONT = DEFAULT_FIELD_FONT;
const FIXED_CREDIT_TEXT = '© 2026 פורצות דרך | תעשיידע';
const LIST_SUB_GAP      = 14;
const LOGO_SRC = '/poster-builder/assets/logoposter.png';

function resolveAssetPath(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return path;
}

function renderCanvas(canvas) {
  canvas.requestRenderAll();
}

function getPosterDimensions(canvas) {
  return {
    width:  canvas._posterWidth  || canvas.getWidth(),
    height: canvas._posterHeight || canvas.getHeight()
  };
}

function fitCanvasToViewport(canvas) {
  const container = canvas.wrapperEl?.parentElement;
  if (!container) return;

  const logicalW = canvas._posterWidth;
  const logicalH = canvas._posterHeight;
  const availableWidth  = Math.max(420, container.clientWidth  - 32);
  const availableHeight = Math.max(420, container.clientHeight - 32);
  const scale = Math.min(1, availableWidth / logicalW, availableHeight / logicalH);

  const cssWidth  = Math.round(logicalW * scale);
  const cssHeight = Math.round(logicalH * scale);

  canvas.setDimensions({ width: cssWidth, height: cssHeight });
  canvas.setZoom(scale);

  if (canvas.wrapperEl) {
    canvas.wrapperEl.style.width  = `${cssWidth}px`;
    canvas.wrapperEl.style.height = `${cssHeight}px`;
    canvas.wrapperEl.style.margin = 'auto';
  }
}

function getFieldById(sizeKey, id, productType = 'none') {
  return getPosterFields(sizeKey, productType).find((field) => field.id === id);
}

function truncateValue(field, value) {
  return (value || '').slice(0, field.maxChars);
}

function fitFieldTextToBox(textObj, field, topPadOverride) {
  const topPad    = topPadOverride !== undefined ? topPadOverride : (field.noLabel ? 20 : 80);
  const maxHeight = Math.max(30, field.height - topPad - 10);
  let fontSize = field.fontSize;

  textObj.set({ fontSize });
  textObj.initDimensions();

  while (textObj.height > maxHeight && fontSize > field.minFontSize) {
    fontSize -= 1;
    textObj.set({ fontSize });
    textObj.initDimensions();
  }

  const clipPad  = field.center ? 10 : 18;
  const clipLeft = field.center
    ? field.x - field.width / 2 + clipPad
    : field.x - field.width + clipPad;
  const clipWidth = Math.max(40, field.width - clipPad * 2);

  textObj.clipPath = new fabric.Rect({
    left:              clipLeft,
    top:               field.y + topPad,
    width:             clipWidth,
    height:            maxHeight,
    originX:           'left',
    originY:           'top',
    absolutePositioned: true
  });
}

function buildListSubBoxes(canvas, field, values, setting) {
  const fontFamily    = (setting && setting.fontFamily) || DEFAULT_TEXT_FONT;
  const color         = (setting && setting.color)      || '#1f2937';
  const borderRadius  = (setting && setting.borderRadius !== undefined) ? setting.borderRadius : 14;
  const hPad          = 18;
  const titleSpacing  = field.noLabel ? 20 : Math.min(field.titleSpacing || 80, 66);
  const bottomPad     = 12;
  const available     = field.height - titleSpacing - bottomPad;
  const subBoxH       = Math.floor((available - LIST_SUB_GAP * 2) / 3);
  const subTopPad     = 14;
  canvas.getObjects()
    .filter((o) => o.__posterFieldId === field.id && (o.__posterListSubBox || o.__posterListSubIndex !== undefined))
    .forEach((o) => canvas.remove(o));

  [1, 2, 3].forEach((num, idx) => {
    const rawItem  = (values[`${field.id}_${num}`] || '').trim();
    const itemText = `${num}. ${rawItem}`;
    const subY     = field.y + titleSpacing + idx * (subBoxH + LIST_SUB_GAP);

    const subContainer = new fabric.Rect({
      left:        field.x,
      top:         subY,
      width:       field.width,
      height:      subBoxH,
      rx: borderRadius, ry: borderRadius,
      fill:        '#ffffff',
      stroke:      '#D5DDEA',
      strokeWidth: 1.5,
      shadow:      new fabric.Shadow({ color: 'rgba(0,0,0,0.12)', blur: 16, offsetX: 0, offsetY: 4 }),
      originX:     'right',
      originY:     'top',
      selectable:  false,
      evented:     false
    });
    subContainer.__posterListSubBox = true;
    subContainer.__posterFieldId    = field.id;

    const subField = { ...field, y: subY, height: subBoxH, noLabel: true };

    const subText = new fabric.Textbox(itemText, {
      originX:         'right',
      originY:         'top',
      textAlign:       field.align,
      direction:       'rtl',
      fill:            color,
      fontFamily,
      fontWeight:      400,
      fontSize:        field.fontSize,
      left:            field.x - hPad,
      top:             subY + subTopPad,
      width:           field.width - 36,
      selectable:      false,
      evented:         false,
      editable:        false,
      splitByGrapheme: true,
      lineHeight:      field.lineHeight
    });

    fitFieldTextToBox(subText, subField, subTopPad);

    subText.__posterFieldObject  = true;
    subText.__posterFieldId      = field.id;
    subText.__posterListSubIndex = idx;

    canvas.add(subContainer, subText);
  });
}

function buildFieldObjects(canvas, sizeKey, values = {}, settings = {}, productType = 'none') {
  getPosterFields(sizeKey, productType).forEach((field) => {
    const s            = settings[field.id] || {};
    const fontFamily   = s.fontFamily || DEFAULT_TEXT_FONT;
    const color        = s.color      || '#1f2937';
    const borderRadius = s.borderRadius !== undefined ? s.borderRadius : 20;
    const originX    = field.center ? 'center' : 'right';
    const hPad       = field.center ? 0 : 18;

    if (field.type === 'list') {
      if (!field.noLabel) {
        const listTitle = new fabric.Text(field.shortLabel, {
          originX,
          originY:    'top',
          textAlign:  field.align,
          direction:  'rtl',
          fill:       '#5E2750',
          fontFamily: DEFAULT_TEXT_FONT,
          fontWeight: 700,
          fontSize:   52,
          left:       field.x - hPad,
          top:        field.y + 14,
          selectable: false,
          evented:    false
        });
        listTitle.__posterFieldTitle = true;
        canvas.add(listTitle);
      }
      buildListSubBoxes(canvas, field, values, settings[field.id] || {});
      return;
    }

    const isParticipants = field.type === 'participants';
    const container = new fabric.Rect({
      left:        field.x,
      top:         field.y,
      width:       field.width,
      height:      field.height,
      rx: borderRadius, ry: borderRadius,
      fill:        '#ffffff',
      stroke:      isParticipants ? '#C4B0D8' : '#D5DDEA',
      strokeWidth: isParticipants ? 1 : 2,
      strokeDashArray: isParticipants ? [16, 8] : null,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.16)', blur: 28, offsetX: 0, offsetY: 5 }),
      originX,
      originY:     'top',
      selectable:  false,
      evented:     false
    });
    container.__posterFieldContainer = true;
    container.__posterFieldId        = field.id;

    const objectsToAdd = [container];

    if (!field.noLabel) {
      const title = new fabric.Text(field.shortLabel, {
        originX,
        originY:   'top',
        textAlign: field.align,
        direction: 'rtl',
        fill:        '#5E2750',
        fontFamily:  DEFAULT_TEXT_FONT,
        fontWeight:  700,
        fontSize:    52,
        left:        field.x - hPad,
        top:         field.y + 14,
        selectable:  false,
        evented:     false
      });
      title.__posterFieldTitle = true;
      objectsToAdd.push(title);
    }

    const valueTop  = field.noLabel ? field.y + 20 : field.y + field.titleSpacing;
    const valueLeft = field.x - hPad;
    const valueW    = field.center ? field.width - 20 : field.width - 36;

    const rawContent = field.type === 'list'
      ? buildListText(field.id, values)
      : truncateValue(field, values[field.id]);

    const valueText = new fabric.Textbox(rawContent, {
      originX,
      originY:         'top',
      textAlign:       field.align,
      direction:       'rtl',
      fill:            color,
      fontFamily,
      fontWeight:      field.fontWeight || 400,
      fontSize:        field.fontSize,
      left:            valueLeft,
      top:             valueTop,
      width:           valueW,
      selectable:      false,
      evented:         false,
      editable:        false,
      splitByGrapheme: true,
      lineHeight:      field.lineHeight
    });

    fitFieldTextToBox(valueText, field);

    if (field.verticalCenter) {
      valueText.initDimensions();
      const textH      = valueText.height;
      const centeredTop = field.y + Math.max(0, (field.height - textH) / 2);
      valueText.set({ top: centeredTop });
      if (valueText.clipPath) {
        valueText.clipPath.set({ top: centeredTop, height: Math.max(40, textH + 10) });
      }
    }

    valueText.__posterFieldObject = true;
    valueText.__posterFieldId     = field.id;
    objectsToAdd.push(valueText);

    canvas.add(...objectsToAdd);
  });
}

function upsertFixedCredit(canvas) {
  const existingBar    = canvas.getObjects().find((obj) => obj.__posterFixedCreditBar  === true);
  const existingCredit = canvas.getObjects().find((obj) => obj.__posterFixedCredit     === true);
  const { width, height } = getPosterDimensions(canvas);
  const barH    = Math.round(height * 0.055);
  const barTop  = height - barH;
  const fontSize = Math.round(Math.max(26, Math.min(width, height) * 0.013));
  const textTop  = height - Math.round(height * 0.018);

  if (existingBar) {
    existingBar.set({ left: 0, top: barTop, width, height: barH });
    existingBar.setCoords();
  } else {
    const bar = new fabric.Rect({
      left:    0, top: barTop,
      width,   height: barH,
      fill:    'rgba(0,0,0,0.38)',
      selectable: false, evented: false,
      excludeFromExport: false, hoverCursor: 'default'
    });
    bar.__posterFixedCreditBar = true;
    canvas.add(bar);
  }

  if (existingCredit) {
    existingCredit.set({ text: FIXED_CREDIT_TEXT, left: width / 2, top: textTop, fontSize });
    existingCredit.setCoords();
  } else {
    const credit = new fabric.Text(FIXED_CREDIT_TEXT, {
      originX: 'center', originY: 'bottom',
      left:    width / 2, top: textTop,
      textAlign: 'center',
      fill:      '#ffffff',
      fontFamily: DEFAULT_TEXT_FONT,
      fontWeight: 400,
      fontSize,
      selectable: false, evented: false,
      excludeFromExport: false, hoverCursor: 'default'
    });
    credit.__posterFixedCredit = true;
    canvas.add(credit);
  }
}

function upsertFixedLogo(canvas) {
  if (!canvas.__posterFixedLogoImage) {
    const nativeImg = new Image();
    nativeImg.onload = () => renderCanvas(canvas);
    nativeImg.src = LOGO_SRC;
    canvas.__posterFixedLogoImage = nativeImg;
  }

  if (canvas.__posterFixedLogoRenderBound) return;

  const drawFixedLogo = () => {
    const logoImg = canvas.__posterFixedLogoImage;
    if (!logoImg || !logoImg.complete || !logoImg.naturalWidth || !logoImg.naturalHeight) return;

    const { width, height } = getPosterDimensions(canvas);
    const margin       = Math.round(Math.min(width, height) * 0.03);
    const desiredWidth = Math.round(width * 0.14);
    const backPad      = Math.round(desiredWidth * 0.12);
    const logoHeight   = Math.round((desiredWidth / logoImg.naturalWidth) * logoImg.naturalHeight);

    const bx = Math.round(margin * 0.35);
    const by = Math.round(margin * 0.3);
    const bw = desiredWidth + backPad * 2;
    const bh = logoHeight + backPad * 2;
    const radius = 20;
    const zoom = canvas.getZoom() || 1;
    const retina = canvas.getRetinaScaling ? canvas.getRetinaScaling() : 1;
    const [,, , , offsetX = 0, offsetY = 0] = canvas.viewportTransform || [];
    const scale = zoom * retina;
    const dx = bx * scale + offsetX * retina;
    const dy = by * scale + offsetY * retina;
    const dw = bw * scale;
    const dh = bh * scale;
    const lx = (bx + backPad) * scale + offsetX * retina;
    const ly = (by + backPad) * scale + offsetY * retina;
    const lw = desiredWidth * scale;
    const lh = logoHeight * scale;

    const ctx = canvas.getContext();
    ctx.save();
    ctx.fillStyle = '#ffffff';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(dx, dy, dw, dh, radius * scale);
      ctx.fill();
    } else {
      const r = radius * scale;
      ctx.beginPath();
      ctx.moveTo(dx + r, dy);
      ctx.arcTo(dx + dw, dy, dx + dw, dy + dh, r);
      ctx.arcTo(dx + dw, dy + dh, dx, dy + dh, r);
      ctx.arcTo(dx, dy + dh, dx, dy, r);
      ctx.arcTo(dx, dy, dx + dw, dy, r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.drawImage(logoImg, lx, ly, lw, lh);
    ctx.restore();
  };

  canvas.on('after:render', drawFixedLogo);
  canvas.__posterFixedLogoRenderBound = drawFixedLogo;
  renderCanvas(canvas);
}

function ensureFixedTemplateDecorations(canvas) {
  upsertFixedCredit(canvas);
  upsertFixedLogo(canvas);

  const creditBar = canvas.getObjects().find((obj) => obj.__posterFixedCreditBar === true);
  if (creditBar) canvas.bringToFront(creditBar);
  const credit = canvas.getObjects().find((obj) => obj.__posterFixedCredit === true);
  if (credit) canvas.bringToFront(credit);
}

function buildSlotPlaceholder(canvas, slot) {
  const rect = new fabric.Rect({
    left:          slot.left,
    top:           slot.top,
    width:         slot.width,
    height:        slot.height,
    rx: 24, ry: 24,
    fill:          'rgba(255,255,255,0.45)',
    stroke:        '#b87ac8',
    strokeWidth:   4,
    strokeDashArray: [20, 12],
    selectable:    false,
    evented:       false
  });
  rect.__posterImageZone = true;
  rect.__posterSlotKey   = slot.key;

  const fontSize = Math.min(56, slot.width * 0.055);
  const label = new fabric.Text(`${slot.label} +`, {
    left:      slot.left + slot.width / 2,
    top:       slot.top  + slot.height / 2,
    originX:   'center',
    originY:   'center',
    textAlign: 'center',
    direction: 'rtl',
    fill:      '#9b5fa8',
    fontFamily: DEFAULT_TEXT_FONT,
    fontWeight: 500,
    fontSize,
    selectable: false,
    evented:    false
  });
  label.__posterImageZone = true;
  label.__posterSlotKey   = slot.key;

  canvas.add(rect, label);
}

function applySlotImage(canvas, slot, dataUrl) {
  fabric.Image.fromURL(dataUrl, (img) => {
    if (!img) return;
    const scale = Math.min(slot.width / img.width, slot.height / img.height);
    const sw = img.width  * scale;
    const sh = img.height * scale;

    img.set({
      left:      slot.left + (slot.width  - sw) / 2,
      top:       slot.top  + (slot.height - sh) / 2,
      scaleX:    scale,
      scaleY:    scale,
      selectable: true,
      evented:    true,
      hasControls: true,
      hasBorders:  true
    });
    img.__posterZoneImage = true;
    img.__posterSlotKey   = slot.key;
    img.setCoords();
    canvas.add(img);
    canvas.setActiveObject(img);
    renderCanvas(canvas);
  });
}

export function applyVisualSlots(canvas, sizeKey, productType, slotImages = {}) {
  canvas.getObjects()
    .filter((o) => o.__posterImageZone || o.__posterZoneImage)
    .forEach((o) => canvas.remove(o));

  const slots = getVisualSlots(sizeKey, productType);
  slots.forEach((slot) => {
    const img = slotImages[slot.key];
    if (img) {
      applySlotImage(canvas, slot, img);
    } else {
      buildSlotPlaceholder(canvas, slot);
    }
  });

  renderCanvas(canvas);
}

export function applyZoneImage(canvas, slotKey, dataUrl, sizeKey, productType) {
  const slots = getVisualSlots(sizeKey || canvas._posterSizeKey || 'A4', productType || canvas._productType || 'none');
  const slot  = slots.find((s) => s.key === slotKey);
  if (!slot) return;

  canvas.getObjects()
    .filter((o) => (o.__posterImageZone || o.__posterZoneImage) && o.__posterSlotKey === slotKey)
    .forEach((o) => canvas.remove(o));

  if (dataUrl) {
    applySlotImage(canvas, slot, dataUrl);
  } else {
    buildSlotPlaceholder(canvas, slot);
    renderCanvas(canvas);
  }
}

export async function registerFonts() {
  if (typeof document === 'undefined') return;
  await document.fonts.ready;
  const families = ['IBM Plex Sans Hebrew', 'Gveret Levin', 'Alice', 'Choco'];
  await Promise.all(
    families.map((f) => document.fonts.load(`700 16px "${f}"`).catch(() => {}))
  );
}

export function createEditor(element, sizeKey) {
  const safeSizeKey = normalizePosterSize(sizeKey);
  const size = POSTER_SIZES[safeSizeKey];
  element.width  = size.width;
  element.height = size.height;

  const canvas = new fabric.Canvas(element, {
    width:    size.width,
    height:   size.height,
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: '#ffffff'
  });

  canvas._posterWidth    = size.width;
  canvas._posterHeight   = size.height;
  canvas._posterSizeKey  = safeSizeKey;
  canvas._productType    = 'none';

  fitCanvasToViewport(canvas);
  ensureFixedTemplateDecorations(canvas);
  renderCanvas(canvas);
  return canvas;
}

export function resizeCanvas(canvas, sizeKey) {
  const safeSizeKey = normalizePosterSize(sizeKey);
  const size = POSTER_SIZES[safeSizeKey];
  canvas._posterWidth   = size.width;
  canvas._posterHeight  = size.height;
  canvas._posterSizeKey = safeSizeKey;
  fitCanvasToViewport(canvas);
  if (canvas.__posterBackgroundPath !== undefined) {
    applyBackground(canvas, canvas.__posterBackgroundPath || null);
  }
  ensureFixedTemplateDecorations(canvas);
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
      const scale        = Math.max(posterWidth / img.width, posterHeight / img.height);
      const scaledWidth  = img.width  * scale;
      const scaledHeight = img.height * scale;

      canvas.setBackgroundImage(img, () => renderCanvas(canvas), {
        originX: 'left',
        originY: 'top',
        left:    (posterWidth  - scaledWidth)  / 2,
        top:     (posterHeight - scaledHeight) / 2,
        scaleX:  scale,
        scaleY:  scale
      });
    }
  );
}

export function initializePosterFields(canvas, values = {}, sizeKey = canvas._posterSizeKey || 'A4', settings = {}, slotImages = null, productType = canvas._productType || 'none') {
  canvas._productType = productType;

  const existing = canvas.getObjects().filter((obj) =>
    obj.__posterFieldObject    ||
    obj.__posterFieldContainer ||
    obj.__posterFieldTitle     ||
    obj.__posterListSubBox     ||
    obj.__posterFixedLogo      ||
    obj.__posterLogoBacking    ||
    obj.__posterFixedCreditBar ||
    obj.__posterFixedCredit    ||
    obj.__posterImageZone      ||
    obj.__posterZoneImage
  );
  existing.forEach((obj) => canvas.remove(obj));

  buildFieldObjects(canvas, sizeKey, values, settings, productType);
  applyVisualSlots(canvas, sizeKey, productType, slotImages || {});
  ensureFixedTemplateDecorations(canvas);
  renderCanvas(canvas);
}

export function updatePosterField(canvas, fieldId, rawValue, sizeKey = canvas._posterSizeKey || 'A4', setting = {}) {
  const productType = canvas._productType || 'none';
  const field = getFieldById(sizeKey, fieldId, productType);
  if (!field) return rawValue || '';

  if (field.type === 'list') {
    const parts = (rawValue || '').split('\n\n');
    const fakeValues = {};
    [1, 2, 3].forEach((num, idx) => {
      fakeValues[`${fieldId}_${num}`] = (parts[idx] || '').replace(/^\d+\.\s*/, '').trim();
    });

    buildListSubBoxes(canvas, field, fakeValues, setting);
    renderCanvas(canvas);
    return rawValue || '';
  }

  const target = canvas.getObjects().find((obj) => obj.__posterFieldObject && obj.__posterFieldId === fieldId);
  if (!target) return rawValue || '';

  const updates = { text: rawValue || '' };
  if (setting.fontFamily) updates.fontFamily = setting.fontFamily;
  if (setting.color)      updates.fill       = setting.color;

  target.set(updates);

  if (setting.borderRadius !== undefined) {
    const containerObj = canvas.getObjects().find(
      (o) => o.__posterFieldContainer && o.__posterFieldId === fieldId
    );
    if (containerObj) containerObj.set({ rx: setting.borderRadius, ry: setting.borderRadius });
  }
  fitFieldTextToBox(target, field);

  if (field.verticalCenter) {
    target.initDimensions();
    const textH      = target.height;
    const centeredTop = field.y + Math.max(0, (field.height - textH) / 2);
    target.set({ top: centeredTop });
    if (target.clipPath) {
      target.clipPath.set({ top: centeredTop, height: Math.max(40, textH + 10) });
    }
  }

  target.setCoords();
  renderCanvas(canvas);
  return rawValue || '';
}

export function updateFieldLabels(canvas, sizeKey, productType) {
  canvas._productType = productType;
  const fields = getPosterFields(sizeKey, productType);
  const titleObjs = canvas.getObjects().filter((o) => o.__posterFieldTitle);

  titleObjs.forEach((titleObj) => {
    const parentField = canvas.getObjects().find(
      (o) => o.__posterFieldObject && Math.abs(o.top - titleObj.top) < 100
    );
    if (!parentField) return;
    const fieldId = parentField.__posterFieldId;
    const fieldDef = fields.find((f) => f.id === fieldId);
    if (fieldDef && !fieldDef.noLabel) {
      titleObj.set({ text: fieldDef.shortLabel });
    }
  });

  renderCanvas(canvas);
}

export function addElement(canvas, path) {
  const resolvedPath = resolveAssetPath(path);

  fabric.Image.fromURL(
    resolvedPath,
    (img) => {
      if (!img) return;
      const { width, height } = getPosterDimensions(canvas);
      img.set({
        left:    width  / 2,
        top:     height / 2,
        originX: 'center',
        originY: 'center',
        selectable:  true,
        evented:     true,
        hasControls: true,
        hasBorders:  true,
        lockScalingX: false,
        lockScalingY: false
      });
      img.scaleToWidth(Math.min(440, width / 4));
      img.setCoords();
      canvas.add(img);
      canvas.setActiveObject(img);
      renderCanvas(canvas);
    }
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

export function removeActiveObject(canvas) {
  const active = canvas.getActiveObject();
  if (!active || active.__posterFixedLogo || active.__posterFixedCredit) return;
  canvas.remove(active);
  canvas.discardActiveObject();
  renderCanvas(canvas);
}

export function setLock(canvas, lock) {
  const active = canvas.getActiveObject();
  if (!active) return;
  active.set({
    lockMovementX: lock,
    lockMovementY: lock,
    lockScalingX:  lock,
    lockScalingY:  lock,
    lockRotation:  lock,
    hasControls:   !lock,
    hasBorders:    !lock
  });
  active.setCoords();
  renderCanvas(canvas);
}

export function updateAllFieldShapes(canvas, borderRadius) {
  canvas.getObjects().forEach((obj) => {
    if (obj.__posterFieldContainer || obj.__posterListSubBox) {
      obj.set({ rx: borderRadius, ry: borderRadius });
    }
  });
  renderCanvas(canvas);
}
