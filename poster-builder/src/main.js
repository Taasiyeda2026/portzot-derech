import { Header }        from './components/Header.js';
import { Sidebar }       from './components/Sidebar.js';
import { ActionPanel }   from './components/ActionPanel.js';
import { ObjectToolbar } from './components/ObjectToolbar.js';
import {
  normalizePosterSize,
  isBackgroundCompatibleWithSize,
  FIELD_DEFINITIONS,
  getAllContentKeys,
  buildListText,
  buildParticipantsText,
  PARTICIPANTS_SUB_KEYS,
  DEFAULT_FIELD_FONT,
  DEFAULT_FIELD_COLOR
} from './data/config.js';
import {
  registerFonts,
  createEditor,
  addElement,
  applyBackground,
  applyZoneImage,
  applyVisualSlots,
  duplicateActiveObject,
  removeActiveObject,
  resizeCanvas,
  initializePosterFields,
  updatePosterField,
  updateFieldLabels,
  setLock
} from './canvas/editor.js';
import { saveProject, loadProject, clearProject } from './utils/storage.js';
import { exportPDF } from './utils/export.js';

const { useEffect, useRef, useState } = React;
const h = React.createElement;

const SERIALIZE_PROPS = [
  'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation',
  '__posterFixedCredit',
  '__posterFieldObject', '__posterFieldContainer', '__posterFieldTitle', '__posterFieldId',
  '__posterImageZone', '__posterZoneImage', '__posterSlotKey'
];

const ALL_CONTENT_KEYS = getAllContentKeys();

const EMPTY_CONTENT = Object.fromEntries(ALL_CONTENT_KEYS.map((k) => [k, '']));

const DEFAULT_SETTINGS = Object.fromEntries(
  FIELD_DEFINITIONS.map((f) => [f.id, { fontFamily: DEFAULT_FIELD_FONT, color: DEFAULT_FIELD_COLOR }])
);

const EMPTY_SLOT_IMAGES = { visual: null, visual_1: null, visual_2: null, visual_3: null };

function getListParentId(key) {
  const listIds = FIELD_DEFINITIONS.filter((f) => f.type === 'list').map((f) => f.id);
  for (const id of listIds) {
    if (key === `${id}_1` || key === `${id}_2` || key === `${id}_3`) return id;
  }
  if (PARTICIPANTS_SUB_KEYS.includes(key)) return 'participants';
  return null;
}

function App() {
  const canvasRef      = useRef(null);
  const fabricRef      = useRef(null);
  const isHydratingRef = useRef(false);

  const [posterSize,       setPosterSize]       = useState('A4');
  const [productType,      setProductType]      = useState('physical');
  const [activePanel,      setActivePanel]      = useState(null);
  const [selectedObject,   setSelectedObject]   = useState(null);
  const [selectedLocked,   setSelectedLocked]   = useState(false);
  const [currentBackground, setCurrentBackground] = useState(null);
  const [contentValues,    setContentValues]    = useState(EMPTY_CONTENT);
  const [fieldSettings,    setFieldSettings]    = useState(DEFAULT_SETTINGS);
  const [slotImages,       setSlotImages]       = useState(EMPTY_SLOT_IMAGES);

  const posterSizeRef        = useRef('A4');
  const productTypeRef       = useRef('physical');
  const currentBackgroundRef = useRef(null);
  const contentValuesRef     = useRef(EMPTY_CONTENT);
  const fieldSettingsRef     = useRef(DEFAULT_SETTINGS);
  const slotImagesRef        = useRef(EMPTY_SLOT_IMAGES);

  useEffect(() => { posterSizeRef.current        = posterSize;       }, [posterSize]);
  useEffect(() => { productTypeRef.current       = productType;      }, [productType]);
  useEffect(() => { currentBackgroundRef.current = currentBackground; }, [currentBackground]);
  useEffect(() => { contentValuesRef.current     = contentValues;    }, [contentValues]);
  useEffect(() => { fieldSettingsRef.current     = fieldSettings;    }, [fieldSettings]);
  useEffect(() => { slotImagesRef.current        = slotImages;       }, [slotImages]);

  const isPosterManagedObject = (obj) =>
    obj.__posterFieldObject    ||
    obj.__posterFieldContainer ||
    obj.__posterFieldTitle     ||
    obj.__posterFixedCredit    ||
    obj.__posterImageZone      ||
    obj.__posterZoneImage;

  const saveNow = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const allObjects  = canvas.getObjects();
    const userObjects = allObjects.filter((obj) => !isPosterManagedObject(obj));
    const tempCanvas  = { objects: userObjects.map((o) => o.toObject(SERIALIZE_PROPS)) };

    saveProject({
      posterSize:       posterSizeRef.current,
      productType:      productTypeRef.current,
      background:       currentBackgroundRef.current,
      contentValues:    contentValuesRef.current,
      fieldSettings:    fieldSettingsRef.current,
      slotImages:       slotImagesRef.current,
      userObjects:      tempCanvas
    });
  };

  const hydrate = (saved, canvas = fabricRef.current) => {
    if (!canvas || !saved) return;

    const nextSize        = normalizePosterSize(saved.posterSize || 'A4');
    const validTypes = ['physical', 'website', 'app'];
    const nextProductType = validTypes.includes(saved.productType) ? saved.productType : 'physical';
    const nextBackground  = saved.background || null;
    const nextValues      = { ...EMPTY_CONTENT, ...(saved.contentValues || {}) };
    const nextSettings    = { ...DEFAULT_SETTINGS, ...(saved.fieldSettings || {}) };
    const nextSlotImages  = { ...EMPTY_SLOT_IMAGES, ...(saved.slotImages || {}) };

    isHydratingRef.current = true;

    posterSizeRef.current        = nextSize;
    productTypeRef.current       = nextProductType;
    currentBackgroundRef.current = nextBackground;
    fieldSettingsRef.current     = nextSettings;
    slotImagesRef.current        = nextSlotImages;

    setPosterSize(nextSize);
    setProductType(nextProductType);
    setCurrentBackground(nextBackground);
    setContentValues(nextValues);
    setFieldSettings(nextSettings);
    setSlotImages(nextSlotImages);

    resizeCanvas(canvas, nextSize);

    const afterLoad = () => {
      applyBackground(canvas, nextBackground);
      initializePosterFields(canvas, nextValues, nextSize, nextSettings, nextSlotImages, nextProductType);
      canvas.renderAll();
      isHydratingRef.current = false;
    };

    if (saved.userObjects) {
      canvas.loadFromJSON(saved.userObjects, afterLoad);
    } else {
      canvas.clear();
      afterLoad();
    }
  };

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    let disposed = false;

    registerFonts().finally(() => {
      if (disposed || !canvasRef.current || fabricRef.current) return;

      const canvas = createEditor(canvasRef.current, posterSizeRef.current);
      if (!canvas) return;

      fabricRef.current = canvas;

      const autoSave = () => {
        if (!isHydratingRef.current) saveNow();
      };

      const onSelectionChanged = ({ selected }) => {
        const active = selected?.[0] ?? null;
        setSelectedObject(active);
        setSelectedLocked(Boolean(active?.lockMovementX));
      };

      const onSelectionCleared = () => {
        setSelectedObject(null);
        setSelectedLocked(false);
      };

      canvas.on('selection:created', onSelectionChanged);
      canvas.on('selection:updated', onSelectionChanged);
      canvas.on('selection:cleared', onSelectionCleared);
      ['object:added', 'object:modified', 'object:removed'].forEach((evt) => canvas.on(evt, autoSave));

      const saved = loadProject();
      if (saved?.userObjects || saved?.contentValues) {
        hydrate(saved, canvas);
      } else {
        resizeCanvas(canvas, posterSizeRef.current);
        initializePosterFields(canvas, EMPTY_CONTENT, posterSizeRef.current, DEFAULT_SETTINGS, EMPTY_SLOT_IMAGES, 'none');
        applyBackground(canvas, null);
        saveNow();
      }
    });

    return () => {
      disposed = true;
      const canvas = fabricRef.current;
      if (!canvas) return;
      canvas.off('selection:created');
      canvas.off('selection:updated');
      canvas.off('selection:cleared');
      canvas.off('object:added');
      canvas.off('object:modified');
      canvas.off('object:removed');
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      resizeCanvas(canvas, posterSizeRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSizeChange = (sizeKey) => {
    const nextSize = normalizePosterSize(sizeKey);
    setPosterSize(nextSize);
    posterSizeRef.current = nextSize;

    const canvas = fabricRef.current;
    if (!canvas) return;

    resizeCanvas(canvas, nextSize);
    initializePosterFields(canvas, contentValuesRef.current, nextSize, fieldSettingsRef.current, slotImagesRef.current, productTypeRef.current);

    const backgroundToApply = isBackgroundCompatibleWithSize(currentBackgroundRef.current, nextSize)
      ? currentBackgroundRef.current
      : null;

    currentBackgroundRef.current = backgroundToApply;
    setCurrentBackground(backgroundToApply);
    applyBackground(canvas, backgroundToApply);
    saveNow();
  };

  const handleProductTypeChange = (newType) => {
    setProductType(newType);
    productTypeRef.current = newType;

    const canvas = fabricRef.current;
    if (!canvas) return;

    initializePosterFields(
      canvas,
      contentValuesRef.current,
      posterSizeRef.current,
      fieldSettingsRef.current,
      slotImagesRef.current,
      newType
    );
    saveNow();
  };

  const applyToSelection = (fn) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    fn(active);
    canvas.renderAll();
    saveNow();
  };

  const onContentFieldChange = (keyOrRowId, rawValue) => {
    const canvas = fabricRef.current;

    const nextValues = { ...contentValuesRef.current, [keyOrRowId]: rawValue };
    contentValuesRef.current = nextValues;
    setContentValues(nextValues);

    if (!canvas) { saveNow(); return; }

    const parentId = getListParentId(keyOrRowId);
    if (parentId === 'participants') {
      const combinedText = buildParticipantsText(nextValues);
      const setting = fieldSettingsRef.current['participants'] || {};
      updatePosterField(canvas, 'participants', combinedText, posterSizeRef.current, setting);
    } else if (parentId) {
      const combinedText = buildListText(parentId, nextValues);
      const setting = fieldSettingsRef.current[parentId] || {};
      updatePosterField(canvas, parentId, combinedText, posterSizeRef.current, setting);
    } else {
      const setting = fieldSettingsRef.current[keyOrRowId] || {};
      updatePosterField(canvas, keyOrRowId, rawValue, posterSizeRef.current, setting);
    }

    saveNow();
  };

  const onFieldSettingChange = (fieldId, newSetting) => {
    const canvas = fabricRef.current;
    const nextSettings = { ...fieldSettingsRef.current, [fieldId]: newSetting };
    fieldSettingsRef.current = nextSettings;
    setFieldSettings(nextSettings);

    if (canvas) {
      const parentId = getListParentId(fieldId);
      const actualId = parentId || fieldId;
      const fieldDef  = FIELD_DEFINITIONS.find((f) => f.id === actualId);
      let displayValue;
      if (fieldDef?.type === 'participants') {
        displayValue = buildParticipantsText(contentValuesRef.current);
      } else if (fieldDef?.type === 'list') {
        displayValue = buildListText(actualId, contentValuesRef.current);
      } else {
        displayValue = contentValuesRef.current[actualId] || '';
      }
      updatePosterField(canvas, actualId, displayValue, posterSizeRef.current, newSetting);
    }
    saveNow();
  };

  const onSlotUpload = (slotKey, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl    = e.target.result;
      const nextSlots  = { ...slotImagesRef.current, [slotKey]: dataUrl };
      slotImagesRef.current = nextSlots;
      setSlotImages(nextSlots);
      applyZoneImage(fabricRef.current, slotKey, dataUrl, posterSizeRef.current, productTypeRef.current);
      setTimeout(saveNow, 120);
    };
    reader.readAsDataURL(file);
  };

  const onSlotClear = (slotKey) => {
    const nextSlots = { ...slotImagesRef.current, [slotKey]: null };
    slotImagesRef.current = nextSlots;
    setSlotImages(nextSlots);
    applyZoneImage(fabricRef.current, slotKey, null, posterSizeRef.current, productTypeRef.current);
    saveNow();
  };

  const onNew = () => {
    if (!confirm('לפתוח עבודה חדשה?')) return;
    clearProject();
    setCurrentBackground(null);
    currentBackgroundRef.current = null;
    setProductType('physical');
    productTypeRef.current = 'physical';
    setContentValues(EMPTY_CONTENT);
    contentValuesRef.current = EMPTY_CONTENT;
    setFieldSettings(DEFAULT_SETTINGS);
    fieldSettingsRef.current = DEFAULT_SETTINGS;
    setSlotImages(EMPTY_SLOT_IMAGES);
    slotImagesRef.current = EMPTY_SLOT_IMAGES;

    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.getObjects().slice().forEach((obj) => {
      if (!isPosterManagedObject(obj)) canvas.remove(obj);
    });

    initializePosterFields(canvas, EMPTY_CONTENT, posterSizeRef.current, DEFAULT_SETTINGS, EMPTY_SLOT_IMAGES, 'none');
    applyBackground(canvas, null);
    saveNow();
  };

  const onReset = () => {
    if (!confirm('לאפס את הפוסטר?')) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    initializePosterFields(canvas, contentValuesRef.current, posterSizeRef.current, fieldSettingsRef.current, slotImagesRef.current, productTypeRef.current);
    applyBackground(canvas, currentBackgroundRef.current);
    saveNow();
  };

  const onBackground = (path) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    currentBackgroundRef.current = path;
    setCurrentBackground(path);
    applyBackground(canvas, path);
    saveNow();
  };

  useEffect(() => {
    const onDelete = (event) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && canvas.getActiveObject()) {
        removeActiveObject(canvas);
        saveNow();
      }
    };
    window.addEventListener('keydown', onDelete);
    return () => window.removeEventListener('keydown', onDelete);
  }, []);

  return h('div', { className: 'app' },
    h(Header, {
      posterSize,
      onSizeChange: handleSizeChange,
      onNew,
      onReset,
      onExportPdf: () => exportPDF(fabricRef.current, posterSizeRef.current),
      activePanel,
      onPanelToggle: (panelId) => setActivePanel((prev) => (prev === panelId ? null : panelId))
    }),
    h('main', { className: `layout ${activePanel ? 'panel-open' : ''}` },
          h(ActionPanel, {
            activePanel,
            posterSize,
            onClose: () => setActivePanel(null),
            onBackground,
            onElement: (path) => {
              addElement(fabricRef.current, path);
              setTimeout(saveNow, 120);
            }
          }),
          h('section', { className: 'canvas-area' },
            h(ObjectToolbar, {
              selected:    selectedObject,
              isLocked:    selectedLocked,
              onDelete:    () => { removeActiveObject(fabricRef.current); saveNow(); },
              onDuplicate: () => { duplicateActiveObject(fabricRef.current); saveNow(); },
              onFront:     () => applyToSelection((obj) => obj.bringForward()),
              onBack:      () => applyToSelection((obj) => obj.sendBackwards()),
              onLock:      () => {
                setLock(fabricRef.current, !selectedLocked);
                setSelectedLocked(!selectedLocked);
                saveNow();
              }
            }),
            h('div', { className: 'canvas-wrapper' }, h('canvas', { ref: canvasRef }))
          ),
          h(Sidebar, {
            productType,
            onProductTypeChange: handleProductTypeChange,
            contentValues,
            fieldSettings,
            slotImages,
            onContentChange: onContentFieldChange,
            onSettingChange: onFieldSettingChange,
            onSlotUpload,
            onSlotClear,
            posterSize
          })
        )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
