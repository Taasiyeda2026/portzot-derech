import {
  POSTER_SIZES,
  normalizePosterSize,
  getPosterFields,
  getVisualSlots,
  buildListText,
  buildParticipantsText,
  DEFAULT_FIELD_FONT
} from '../data/config.js';

const DEFAULT_TEXT_FONT  = DEFAULT_FIELD_FONT;
const DEFAULT_TITLE_COLOR = '#5E2750';
const FIXED_CREDIT_TEXT  = '© 2026 פורצות דרך | תעשיידע';
const LIST_SUB_GAP       = 14;
const LOGO_SRC           = '/poster-builder/assets/logoposter.png';
const TITLE_TOP_GAP      = 6;

function getTitleStyle(canvas) {
  return canvas._titleStyle || { color: DEFAULT_TITLE_COLOR, fontFamily: DEFAULT_TEXT_FONT };
}

export function isPosterManagedObject(obj) {
  return Boolean(
    obj?.__posterManaged       ||
    obj?.__posterFieldObject   ||
    obj?.__posterFieldContainer ||
    obj?.__posterFieldTitle    ||
    obj?.__posterListSubBox    ||
    obj?.__posterListSubIndex !== undefined ||
    obj?.__posterFixedCreditBar ||
    obj?.__posterFixedCredit   ||
    obj?.__posterImageZone     ||
    obj?.__posterZoneImage
  );
}

function markPosterManaged(obj, fieldId = null) {
  if (!obj) return obj;
  obj.__posterManaged = true;
  if (fieldId) obj.__posterFieldId = fieldId;
  return obj;
}

function removeObjects(canvas, predicate) {
  canvas.getObjects().filter(predicate).forEach((o) => canvas.remove(o));
}

function clearPosterFieldObjects(canvas, fieldId) {
  removeObjects(canvas, (o) => (
    (o.__posterFieldId === fieldId && (isPosterManagedObject(o) || (!o.selectable && !o.evented))) ||
    (o.__posterFieldTitle && o.__posterFieldId === fieldId)
  ));
}

function clearListSubBoxes(canvas, fieldId) {
  removeObjects(canvas, (o) => (
    o.__posterFieldId === fieldId &&
    (o.__posterListSubBox || o.__posterListSubIndex !== undefined)
  ));
}

function purgeSystemLikeNonInteractiveObjects(canvas) {
  removeObjects(canvas, (o) => isPosterManagedObject(o) || (!o.selectable && !o.evented));
}

function resolveAssetPath(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return path;
}

function renderCanvas(canvas) {
  canvas.requestRenderAll();
}

function computeTitleTop(field, titleObj, insideBox = false) {
  if (insideBox) return field.y + 12;
  if (!titleObj) return field.y;
  const fontSize = titleObj.fontSize || 52;
  const estimatedHeight = Math.ceil(fontSize * 1.3);
  return field.y - estimatedHeight - TITLE_TOP_GAP;
}

function bringSectionTitlesToFront(canvas) {
  canvas.getObjects()
    .filter((obj) => obj.__posterFieldTitle === true)
    .forEach((titleObj) => canvas.bringToFront(titleObj));
}

function getContentBottomY(canvas) {
  const trackedObjects = canvas.getObjects().filter((obj) => (
    obj.__posterFieldContainer === true ||
    obj.__posterListSubBox === true ||
    obj.__posterFieldObject === true ||
    obj.__posterFieldTitle === true ||
    obj.__posterImageZone === true ||
    obj.__posterZoneImage === true
  ));

  if (!trackedObjects.length) return 0;

  return trackedObjects.reduce((maxBottom, obj) => {
    const bounds = obj.getBoundingRect(true, true);
    const bottom = bounds.top + bounds.height;
    return Math.max(maxBottom, bottom);
  }, 0);
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
  const titleSpacing  = field.noLabel ? 16 : (field.titleSpacing || 80);
  const bottomPad     = 12;
  const available     = field.height - titleSpacing - bottomPad;
  const subBoxH       = Math.floor((available - LIST_SUB_GAP * 2) / 3);
  const subTopPad     = 12;
  clearListSubBoxes(canvas, field.id);

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
    markPosterManaged(subContainer, field.id);

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
      splitByGrapheme: false,
      lineHeight:      field.lineHeight
    });

    fitFieldTextToBox(subText, subField, subTopPad);

    subText.__posterFieldObject  = true;
    subText.__posterListSubIndex = idx;
    markPosterManaged(subText, field.id);

    canvas.add(subContainer, subText);
    canvas.bringToFront(subText);
  });
}

function buildFieldObjects(canvas, sizeKey, values = {}, settings = {}, productType = 'none') {
  const ts = getTitleStyle(canvas);
  getPosterFields(sizeKey, productType).forEach((field) => {
    clearPosterFieldObjects(canvas, field.id);

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
          fill:       ts.color,
          fontFamily: ts.fontFamily,
          fontWeight: 700,
          fontSize:   46,
          left:       field.x - hPad,
          top:        field.y,
          selectable: false,
          evented:    false
        });
        listTitle.set({ top: computeTitleTop(field, listTitle, true) });
        listTitle.__posterFieldTitle = true;
        markPosterManaged(listTitle, field.id);
        canvas.add(listTitle);
        canvas.bringToFront(listTitle);
      }
      buildListSubBoxes(canvas, field, values, settings[field.id] || {});
      return;
    }

    const isParticipants = field.type === 'participants';
    const isProjectName  = field.id === 'projectName';

    const objectsToAdd = [];

    if (!isProjectName) {
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
      markPosterManaged(container, field.id);
      objectsToAdd.push(container);
    }

    if (!field.noLabel) {
      const title = new fabric.Text(field.shortLabel, {
        originX,
        originY:   'top',
        textAlign: field.align,
        direction: 'rtl',
        fill:       ts.color,
        fontFamily: ts.fontFamily,
        fontWeight: 700,
        fontSize:   46,
        left:       field.x - hPad,
        top:        field.y,
        selectable: false,
        evented:    false
      });
      title.set({ top: computeTitleTop(field, title, true) });
      title.__posterFieldTitle = true;
      markPosterManaged(title, field.id);
      objectsToAdd.push(title);
    }

    const valueTop  = field.noLabel ? field.y + 20 : field.y + field.titleSpacing;
    const valueLeft = field.x - hPad;
    const valueW    = field.center ? field.width - 20 : field.width - 36;

    const rawContent = field.type === 'list'
      ? buildListText(field.id, values)
      : field.type === 'participants'
        ? buildParticipantsText(values)
        : truncateValue(field, values[field.id]);

    const textFill = field.id === 'projectName' ? ts.color : color;

    const valueText = new fabric.Textbox(rawContent, {
      originX,
      originY:         'top',
      textAlign:       field.align,
      direction:       'rtl',
      fill:            textFill,
      fontFamily,
      fontWeight:      field.fontWeight || 400,
      fontSize:        field.fontSize,
      left:            valueLeft,
      top:             valueTop,
      width:           valueW,
      selectable:      false,
      evented:         false,
      editable:        false,
      splitByGrapheme: false,
      lineHeight:      field.lineHeight
    });

    fitFieldTextToBox(valueText, field);

    if (field.verticalCenter) {
      valueText.initDimensions();
      const textH     = valueText.height;
      const topOffset = field.noLabel ? 0 : (field.titleSpacing || 80);
      const contentH  = field.height - topOffset;
      const centeredTop = field.y + topOffset + Math.max(0, (contentH - textH) / 2);
      valueText.set({ top: centeredTop });
      if (valueText.clipPath) {
        valueText.clipPath.set({ top: centeredTop, height: Math.max(40, textH + 10) });
      }
    }

    valueText.__posterFieldObject = true;
    markPosterManaged(valueText, field.id);
    objectsToAdd.push(valueText);

    canvas.add(...objectsToAdd);
    canvas.bringToFront(valueText);
  });
  bringSectionTitlesToFront(canvas);
}

function upsertFixedCredit(canvas) {
  const existingBar    = canvas.getObjects().find((obj) => obj.__posterFixedCreditBar  === true);
  const existingCredit = canvas.getObjects().find((obj) => obj.__posterFixedCredit     === true);
  const { width, height } = getPosterDimensions(canvas);

  const fontSize  = Math.round(Math.min(width, height) * 0.010);
  const bottomPad = Math.round(height * 0.012);
  const textTop   = height - bottomPad;

  if (existingBar) canvas.remove(existingBar);

  const creditProps = {
    text:        FIXED_CREDIT_TEXT,
    left:        width / 2,
    top:         textTop,
    fontSize,
    fill:        '#1f2937',
    stroke:      '#ffffff',
    strokeWidth: 5,
    paintFirst:  'stroke',
  };

  if (existingCredit) {
    existingCredit.set(creditProps);
    existingCredit.setCoords();
  } else {
    const credit = new fabric.Text(FIXED_CREDIT_TEXT, {
      originX:    'center',
      originY:    'bottom',
      left:       width / 2,
      top:        textTop,
      textAlign:  'center',
      fill:       '#1f2937',
      stroke:     '#ffffff',
      strokeWidth: 5,
      paintFirst: 'stroke',
      fontFamily: DEFAULT_TEXT_FONT,
      fontWeight: 400,
      fontSize,
      selectable: false, evented: false,
      excludeFromExport: false, hoverCursor: 'default'
    });
    credit.__posterFixedCredit = true;
    markPosterManaged(credit);
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
    const margin       = Math.round(width * 0.03);
    const desiredWidth = Math.round(width * 0.14);
    const logoHeight   = Math.round((desiredWidth / logoImg.naturalWidth) * logoImg.naturalHeight);

    const lx0 = Math.round(margin * 0.35);
    const ly0 = Math.round(height * 0.087) - Math.round(logoHeight * 0.3);
    const zoom = canvas.getZoom() || 1;
    const [,,,, offsetX = 0, offsetY = 0] = canvas.viewportTransform || [];
    const lx = lx0 * zoom + offsetX;
    const ly = ly0 * zoom + offsetY;
    const lw = desiredWidth * zoom;
    const lh = logoHeight * zoom;

    const glowRadius = Math.round(desiredWidth * 0.18 * zoom);

    const ctx = canvas.getContext();
    ctx.save();
    ctx.shadowColor  = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowBlur   = glowRadius;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.drawImage(logoImg, lx, ly, lw, lh);
    ctx.drawImage(logoImg, lx, ly, lw, lh);
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
  bringSectionTitlesToFront(canvas);

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
  markPosterManaged(rect);

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
  markPosterManaged(label);

  canvas.add(rect, label);
}

function applySlotImage(canvas, slot, dataUrl) {
  fabric.Image.fromURL(dataUrl, (img) => {
    if (!img) return;
    const scale = Math.max(slot.width / img.width, slot.height / img.height);

    const clipRadius = Math.round(Math.min(slot.width, slot.height) * 0.06);
    img.set({
      left:        slot.left + slot.width  / 2,
      top:         slot.top  + slot.height / 2,
      originX:     'center',
      originY:     'center',
      scaleX:      scale,
      scaleY:      scale,
      selectable:  true,
      evented:     true,
      hasControls: true,
      hasBorders:  true,
      clipPath: new fabric.Rect({
        left:               slot.left,
        top:                slot.top,
        width:              slot.width,
        height:             slot.height,
        rx:                 clipRadius,
        ry:                 clipRadius,
        absolutePositioned: true
      }),
      shadow: new fabric.Shadow({
        color:   'rgba(0,0,0,0.18)',
        blur:    Math.round(Math.min(slot.width, slot.height) * 0.04),
        offsetX: 0,
        offsetY: 0
      })
    });
    img.__posterZoneImage = true;
    img.__posterSlotKey   = slot.key;
    markPosterManaged(img);
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
  const families = ['IBM Plex Sans Hebrew', 'Gveret Levin', 'Alice', 'Choco', 'Alef', 'Yehuda'];
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
  canvas._titleStyle     = { color: DEFAULT_TITLE_COLOR, fontFamily: DEFAULT_TEXT_FONT };

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

  purgeSystemLikeNonInteractiveObjects(canvas);

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
    bringSectionTitlesToFront(canvas);
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
    const textH     = target.height;
    const topOffset = field.noLabel ? 0 : (field.titleSpacing || 80);
    const contentH  = field.height - topOffset;
    const centeredTop = field.y + topOffset + Math.max(0, (contentH - textH) / 2);
    target.set({ top: centeredTop });
    if (target.clipPath) {
      target.clipPath.set({ top: centeredTop, height: Math.max(40, textH + 10) });
    }
  }

  target.setCoords();
  canvas.bringToFront(target);
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

export function setTitleStyle(canvas, style) {
  canvas._titleStyle = { ...(canvas._titleStyle || {}), ...style };
  const sizeKey     = canvas._posterSizeKey  || 'A4';
  const productType = canvas._productType    || 'none';
  canvas.getObjects()
    .filter(o => o.__posterFieldTitle)
    .forEach(o => {
      if (style.color      !== undefined) o.set({ fill:       style.color });
      if (style.fontFamily !== undefined) o.set({ fontFamily: style.fontFamily });
      const fieldId = o.__posterFieldId;
      const field   = getFieldById(sizeKey, fieldId, productType);
      if (field) o.set({ top: computeTitleTop(field, o, field.type !== 'list') });
    });
  canvas.getObjects()
    .filter(o => o.__posterFieldObject && o.__posterFieldId === 'projectName')
    .forEach(o => {
      if (style.color      !== undefined) o.set({ fill:       style.color });
      if (style.fontFamily !== undefined) o.set({ fontFamily: style.fontFamily });
    });
  renderCanvas(canvas);
}
