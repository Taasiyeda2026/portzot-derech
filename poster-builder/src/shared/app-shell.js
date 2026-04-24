import {
  WizardStep1, WizardStep2, WizardStep3, WizardStep5,
  StepIndicator,
  PhysicalStepIndicator, PhysicalStep1, PhysicalStep2, PhysicalStep3
} from '../components/WizardSteps.js';
import {
  normalizePosterSize,
  isBackgroundCompatibleWithSize,
  FIELD_DEFINITIONS,
  ELEMENTS,
  getAllContentKeys,
  buildListText,
  buildParticipantsText,
  PARTICIPANTS_SUB_KEYS,
  DEFAULT_FIELD_FONT,
  DEFAULT_FIELD_COLOR,
  BACKGROUNDS
} from '../products/physical/config.js';
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
  updateAllFieldShapes,
  setTitleStyle,
  setLock,
  isPosterManagedObject
} from '../canvas/editor.js';
import { saveProject, loadProject, clearProject } from './storage.js';
import { exportPDF } from './poster-builder.js';

const { useEffect, useRef, useState, useCallback } = React;
const h = React.createElement;
const PRESELECTED_PRODUCT_TYPE = window.__POSTER_BUILDER_PRODUCT_TYPE || null;
const PRESELECTED_START_STEP = Number(window.__POSTER_BUILDER_START_STEP || 0) || null;

const SERIALIZE_PROPS = [
  'lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation',
  '__posterManaged',
  '__posterFixedCreditBar','__posterFixedCredit',
  '__posterFieldObject','__posterFieldContainer','__posterFieldTitle','__posterFieldId',
  '__posterListSubBox','__posterListSubIndex',
  '__posterImageZone','__posterZoneImage','__posterSlotKey'
];

const ALL_CONTENT_KEYS = getAllContentKeys();

const EMPTY_PROMPT_ANSWERS = {
  main_whatToSee: '', main_appearance: '', main_highlight: '',
  main_material: '', main_background: '', main_style: '',
  main_realism: '', main_colors: '', main_exclude: '',
  usage_who: '', usage_howMany: '', usage_action: '',
  usage_where: '', usage_understand: '', usage_highlight: '',
  usage_style: '', usage_realism: '', usage_colors: '', usage_exclude: ''
};
const EMPTY_CONTENT      = Object.fromEntries(ALL_CONTENT_KEYS.map(k => [k, '']));
const DEFAULT_SETTINGS   = Object.fromEntries(
  FIELD_DEFINITIONS.map(f => [f.id, { fontFamily: DEFAULT_FIELD_FONT, color: DEFAULT_FIELD_COLOR, borderRadius: 20 }])
);
const EMPTY_SLOT_IMAGES  = { visual: null, visual_1: null, visual_2: null, visual_3: null };
const DEFAULT_TITLE_FONT  = 'IBM Plex Sans Hebrew';
const DEFAULT_TITLE_COLOR = '#5E2750';

function getListParentId(key) {
  const listIds = FIELD_DEFINITIONS.filter(f => f.type === 'list').map(f => f.id);
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

  const [wizardStep,   setWizardStep]   = useState(PRESELECTED_START_STEP || (PRESELECTED_PRODUCT_TYPE === 'physical' ? 2 : 1));
  const [posterSize,   setPosterSize]   = useState('A4');
  const [productType,  setProductType]  = useState(PRESELECTED_PRODUCT_TYPE || 'physical');
  const [currentBackground, setCurrentBackground] = useState(BACKGROUNDS[0].path);
  const [contentValues,    setContentValues]    = useState(EMPTY_CONTENT);
  const [fieldSettings,    setFieldSettings]    = useState(DEFAULT_SETTINGS);
  const [slotImages,       setSlotImages]       = useState(EMPTY_SLOT_IMAGES);
  const [selectedObject,   setSelectedObject]   = useState(null);
  const [selectedLocked,   setSelectedLocked]   = useState(false);
  const [titleFont,    setTitleFont]    = useState(DEFAULT_TITLE_FONT);
  const [titleColor,   setTitleColor]   = useState(DEFAULT_TITLE_COLOR);
  const [currentShape,     setCurrentShape]     = useState(20);
  const [physicalSubStep,  setPhysicalSubStep]  = useState(1);
  const [promptAnswers,    setPromptAnswers]    = useState(EMPTY_PROMPT_ANSWERS);

  const posterSizeRef        = useRef('A4');
  const productTypeRef       = useRef('physical');
  const currentBackgroundRef = useRef(BACKGROUNDS[0].path);
  const contentValuesRef     = useRef(EMPTY_CONTENT);
  const fieldSettingsRef     = useRef(DEFAULT_SETTINGS);
  const slotImagesRef        = useRef(EMPTY_SLOT_IMAGES);

  useEffect(() => { posterSizeRef.current        = posterSize;       }, [posterSize]);
  useEffect(() => { productTypeRef.current       = productType;      }, [productType]);
  useEffect(() => { currentBackgroundRef.current = currentBackground; }, [currentBackground]);
  useEffect(() => { contentValuesRef.current     = contentValues;    }, [contentValues]);
  useEffect(() => { fieldSettingsRef.current     = fieldSettings;    }, [fieldSettings]);
  useEffect(() => { slotImagesRef.current        = slotImages;       }, [slotImages]);

  const saveNow = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const userObjects = canvas.getObjects().filter(obj => !isPosterManagedObject(obj) && (obj.selectable || obj.evented));
    saveProject({
      posterSize:    posterSizeRef.current,
      productType:   productTypeRef.current,
      background:    currentBackgroundRef.current,
      contentValues: contentValuesRef.current,
      fieldSettings: fieldSettingsRef.current,
      slotImages:    slotImagesRef.current,
      userObjects:   { objects: userObjects.map(o => o.toObject(SERIALIZE_PROPS)) }
    });
  }, []);

  const hydrate = useCallback((saved, canvas = fabricRef.current) => {
    if (!canvas || !saved) return;
      const validTypes   = ['physical','website','app'];
    const nextSize     = normalizePosterSize(saved.posterSize || 'A4');
      const nextTypeRaw  = validTypes.includes(saved.productType) ? saved.productType : 'physical';
      const nextType     = PRESELECTED_PRODUCT_TYPE || nextTypeRaw;
    const nextBg       = saved.background || BACKGROUNDS[0].path;
    const nextValues   = { ...EMPTY_CONTENT, ...(saved.contentValues || {}) };
    const nextSettings = { ...DEFAULT_SETTINGS, ...(saved.fieldSettings || {}) };
    const nextSlots    = { ...EMPTY_SLOT_IMAGES, ...(saved.slotImages || {}) };

    isHydratingRef.current = true;
    posterSizeRef.current        = nextSize;
    productTypeRef.current       = nextType;
    currentBackgroundRef.current = nextBg;
    fieldSettingsRef.current     = nextSettings;
    slotImagesRef.current        = nextSlots;

    setPosterSize(nextSize);
    setProductType(nextType);
    setCurrentBackground(nextBg);
    setContentValues(nextValues);
    setFieldSettings(nextSettings);
    setSlotImages(nextSlots);
    resizeCanvas(canvas, nextSize);

    const afterLoad = () => {
      applyBackground(canvas, nextBg);
      initializePosterFields(canvas, nextValues, nextSize, nextSettings, nextSlots, nextType);
      canvas.renderAll();
      isHydratingRef.current = false;
    };

    if (saved.userObjects) {
      canvas.loadFromJSON(saved.userObjects, afterLoad);
    } else {
      canvas.clear();
      afterLoad();
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;
    let disposed = false;

    registerFonts().finally(() => {
      if (disposed || !canvasRef.current || fabricRef.current) return;

      const canvas = createEditor(canvasRef.current, posterSizeRef.current);
      if (!canvas) return;
      fabricRef.current = canvas;

      const autoSave = () => { if (!isHydratingRef.current) saveNow(); };
      const onSelChanged = ({ selected }) => {
        const active = selected?.[0] ?? null;
        setSelectedObject(active);
        setSelectedLocked(Boolean(active?.lockMovementX));
      };
      const onSelCleared = () => { setSelectedObject(null); setSelectedLocked(false); };

      canvas.on('selection:created', onSelChanged);
      canvas.on('selection:updated', onSelChanged);
      canvas.on('selection:cleared', onSelCleared);
      ['object:added','object:modified','object:removed'].forEach(evt => canvas.on(evt, autoSave));

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
      if (canvas) resizeCanvas(canvas, posterSizeRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleProductTypeChange = type => {
    if (PRESELECTED_PRODUCT_TYPE) return;
    setProductType(type);
    productTypeRef.current = type;
    const canvas = fabricRef.current;
    if (canvas) {
      initializePosterFields(canvas, contentValuesRef.current, posterSizeRef.current, fieldSettingsRef.current, slotImagesRef.current, type);
      saveNow();
    }
  };

  const handleBackground = path => {
    const canvas = fabricRef.current;
    currentBackgroundRef.current = path;
    setCurrentBackground(path);
    if (canvas) applyBackground(canvas, path);
    saveNow();
  };

  const handleShape = borderRadius => {
    setCurrentShape(borderRadius);
    const canvas = fabricRef.current;
    const nextSettings = Object.fromEntries(
      FIELD_DEFINITIONS.map(f => [f.id, { ...(fieldSettingsRef.current[f.id] || {}), borderRadius }])
    );
    fieldSettingsRef.current = nextSettings;
    setFieldSettings(nextSettings);
    if (canvas) updateAllFieldShapes(canvas, borderRadius);
    saveNow();
  };

  const handleTitleFont = font => {
    setTitleFont(font);
    const canvas = fabricRef.current;
    if (canvas) setTitleStyle(canvas, { fontFamily: font });
  };

  const handleTitleColor = color => {
    setTitleColor(color);
    const canvas = fabricRef.current;
    if (canvas) setTitleStyle(canvas, { color });
  };

  const onContentFieldChange = (keyOrRowId, rawValue) => {
    const canvas     = fabricRef.current;
    const nextValues = { ...contentValuesRef.current, [keyOrRowId]: rawValue };
    contentValuesRef.current = nextValues;
    setContentValues(nextValues);

    if (!canvas) { saveNow(); return; }

    const parentId = getListParentId(keyOrRowId);
    if (parentId === 'participants') {
      const combined = buildParticipantsText(nextValues);
      updatePosterField(canvas, 'participants', combined, posterSizeRef.current, fieldSettingsRef.current['participants'] || {});
    } else if (parentId) {
      const combined = buildListText(parentId, nextValues);
      updatePosterField(canvas, parentId, combined, posterSizeRef.current, fieldSettingsRef.current[parentId] || {});
    } else {
      updatePosterField(canvas, keyOrRowId, rawValue, posterSizeRef.current, fieldSettingsRef.current[keyOrRowId] || {});
    }
    saveNow();
  };

  const onSlotUpload = (slotKey, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl   = e.target.result;
      const nextSlots = { ...slotImagesRef.current, [slotKey]: dataUrl };
      slotImagesRef.current = nextSlots;
      setSlotImages(nextSlots);
      applyZoneImage(fabricRef.current, slotKey, dataUrl, posterSizeRef.current, productTypeRef.current);
      setTimeout(saveNow, 120);
    };
    reader.readAsDataURL(file);
  };

  const onSlotClear = slotKey => {
    const nextSlots = { ...slotImagesRef.current, [slotKey]: null };
    slotImagesRef.current = nextSlots;
    setSlotImages(nextSlots);
    applyZoneImage(fabricRef.current, slotKey, null, posterSizeRef.current, productTypeRef.current);
    saveNow();
  };

  const handleExportPdf = () => exportPDF(fabricRef.current, posterSizeRef.current, contentValuesRef.current);

  const goToStep = step => {
    const nextStep = PRESELECTED_PRODUCT_TYPE === 'physical' && step === 1 ? 2 : step;
    setWizardStep(nextStep);
    if (nextStep === 4) {
      setTimeout(() => {
        const canvas = fabricRef.current;
        if (canvas) resizeCanvas(canvas, posterSizeRef.current);
      }, 60);
    }
  };

  const applyToSelection = fn => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    fn(active);
    canvas.renderAll();
    saveNow();
  };

  const isStep4 = wizardStep === 4;

  return h('div', { className: 'app' },

    h('div', {
      className: 'step4-wrapper',
      style: { display: isStep4 ? 'flex' : 'none' }
    },
      h('div', { className: 'step4-bar' },
        h('div', { className: 'step4-bar-start' },
          h('button', {
            className: 'step4-back-btn',
            onClick: () => {
              if (productType === 'physical') {
                setPhysicalSubStep(2);
              }
              goToStep(3);
            }
          }, '‹ חזרה')
        ),
        h('div', { className: 'step4-bar-center' },
          productType === 'physical'
            ? h(PhysicalStepIndicator, { current: 4 })
            : h(StepIndicator, { current: 4 })
        ),
        h('div', { className: 'step4-bar-end' },
          h('button', {
            className: 'step4-export-btn',
            onClick: handleExportPdf
          }, 'ייצוא PDF'),
          h('button', {
            className: 'step4-finish-btn',
            onClick: () => goToStep(5)
          }, 'סיום ›')
        )
      ),

      h('div', { className: 'step4-body' },
        h('aside', { className: 'step4-elements' },
          h('h3', { className: 'step4-elements-title' }, 'הוספת אלמנטים'),
          h('div', { className: 'grid grid-3' },
            ELEMENTS.map(el =>
              h('button', {
                key: el.id,
                className: 'icon-btn',
                onClick: () => { addElement(fabricRef.current, el.path); setTimeout(saveNow, 120); }
              }, h('img', { src: el.path, alt: el.name, className: 'icon' }))
            )
          ),

          selectedObject && h('div', { className: 'step4-obj-toolbar' },
            h('p', { className: 'step4-obj-title' }, 'אלמנט נבחר'),
            h('div', { className: 'step4-obj-actions' },
              h('button', { className: 'btn btn-small', onClick: () => { removeActiveObject(fabricRef.current); saveNow(); } }, 'מחיקה'),
              h('button', { className: 'btn btn-small', onClick: () => { duplicateActiveObject(fabricRef.current); saveNow(); } }, 'שכפול'),
              h('button', { className: 'btn btn-small', onClick: () => applyToSelection(obj => obj.bringForward()) }, 'קדימה'),
              h('button', { className: 'btn btn-small', onClick: () => applyToSelection(obj => obj.sendBackwards()) }, 'אחורה'),
              h('button', {
                className: `btn btn-small ${selectedLocked ? 'btn-locked' : ''}`,
                onClick: () => {
                  setLock(fabricRef.current, !selectedLocked);
                  setSelectedLocked(!selectedLocked);
                  saveNow();
                }
              }, selectedLocked ? 'שחרור נעילה' : 'נעילה')
            )
          )
        ),

        h('section', { className: 'canvas-area' },
          h('div', { className: 'canvas-wrapper' },
            h('canvas', { ref: canvasRef })
          )
        )
      )
    ),

    (wizardStep < 4 || wizardStep === 5) && h('div', { className: 'wz-overlay' },

      // ── Step 1: product type selection (all types) ──────────
      !PRESELECTED_PRODUCT_TYPE && wizardStep === 1 && h(WizardStep1, {
        productType,
        onProductTypeChange: handleProductTypeChange,
        onNext: () => goToStep(2)
      }),

      // ── Physical product 4-step flow ────────────────────────
      wizardStep === 2 && productType === 'physical' && h(PhysicalStep1, {
        contentValues,
        onContentChange: onContentFieldChange,
        onBack: () => {
          if (PRESELECTED_PRODUCT_TYPE === 'physical') {
            window.location.href = '../index.html';
            return;
          }
          goToStep(1);
        },
        onNext: () => { setPhysicalSubStep(1); goToStep(3); }
      }),

      wizardStep === 3 && productType === 'physical' && physicalSubStep === 1 && h(PhysicalStep2, {
        promptAnswers,
        onPromptChange: (key, val) => setPromptAnswers(prev => ({ ...prev, [key]: val })),
        contentValues,
        onBack: () => goToStep(2),
        onNext: () => setPhysicalSubStep(2)
      }),

      wizardStep === 3 && productType === 'physical' && physicalSubStep === 2 && h(PhysicalStep3, {
        contentValues,
        promptAnswers,
        posterSize,
        slotImages,
        onSlotUpload,
        onSlotClear,
        onBack: () => setPhysicalSubStep(1),
        onNext: () => goToStep(4)
      }),

      // ── Non-physical 5-step flow ────────────────────────────
      wizardStep === 2 && productType !== 'physical' && h(WizardStep2, {
        currentBackground,
        currentShape,
        titleFont,
        titleColor,
        onBackground:  handleBackground,
        onShape:       handleShape,
        onTitleFont:   handleTitleFont,
        onTitleColor:  handleTitleColor,
        onNext: () => goToStep(3),
        onBack: () => goToStep(1)
      }),

      wizardStep === 3 && productType !== 'physical' && h(WizardStep3, {
        productType,
        contentValues,
        slotImages,
        posterSize,
        onContentChange: onContentFieldChange,
        onSlotUpload,
        onSlotClear,
        onNext: () => goToStep(4),
        onBack: () => goToStep(2)
      }),

      // ── Completion (all types) ──────────────────────────────
      wizardStep === 5 && h(WizardStep5, {
        onExportPdf: handleExportPdf,
        onBack: () => goToStep(4)
      })
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
