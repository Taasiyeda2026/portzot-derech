import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { ActionPanel } from './components/ActionPanel.js';
import { ObjectToolbar } from './components/ObjectToolbar.js';
import { normalizePosterSize, isBackgroundCompatibleWithSize, FIELD_DEFINITIONS } from './data/config.js';
import {
  registerFonts,
  createEditor,
  addElement,
  applyBackground,
  duplicateActiveObject,
  removeActiveObject,
  resizeCanvas,
  initializePosterFields,
  updatePosterField,
  setLock
} from './canvas/editor.js';
import { saveProject, loadProject, clearProject } from './utils/storage.js';
import { exportPDF } from './utils/export.js';

const { useEffect, useRef, useState } = React;
const h = React.createElement;

const SERIALIZE_PROPS = ['lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation'];

const EMPTY_CONTENT = Object.fromEntries(FIELD_DEFINITIONS.map((field) => [field.id, '']));

function App() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const isHydratingRef = useRef(false);

  const [posterSize, setPosterSize] = useState('A4');
  const [activePanel, setActivePanel] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedLocked, setSelectedLocked] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(null);
  const [contentValues, setContentValues] = useState(EMPTY_CONTENT);

  const posterSizeRef = useRef('A4');
  const currentBackgroundRef = useRef(null);
  const contentValuesRef = useRef(EMPTY_CONTENT);

  useEffect(() => {
    posterSizeRef.current = posterSize;
  }, [posterSize]);

  useEffect(() => {
    currentBackgroundRef.current = currentBackground;
  }, [currentBackground]);

  useEffect(() => {
    contentValuesRef.current = contentValues;
  }, [contentValues]);

  const saveNow = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    saveProject({
      posterSize: posterSizeRef.current,
      background: currentBackgroundRef.current,
      contentValues: contentValuesRef.current,
      canvas: canvas.toJSON(SERIALIZE_PROPS)
    });
  };

  const hydrate = (saved, canvas = fabricRef.current) => {
    if (!canvas || !saved) return;

    const nextSize = normalizePosterSize(saved.posterSize || 'A4');
    const nextBackground = saved.background || null;
    const nextValues = { ...EMPTY_CONTENT, ...(saved.contentValues || {}) };

    isHydratingRef.current = true;

    posterSizeRef.current = nextSize;
    currentBackgroundRef.current = nextBackground;

    setPosterSize(nextSize);
    setCurrentBackground(nextBackground);
    setContentValues(nextValues);

    resizeCanvas(canvas, nextSize);

    canvas.loadFromJSON(saved.canvas, () => {
      applyBackground(canvas, nextBackground);
      initializePosterFields(canvas, nextValues, nextSize);
      canvas.renderAll();
      isHydratingRef.current = false;
    });
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
      if (saved?.canvas) {
        hydrate(saved, canvas);
      } else {
        resizeCanvas(canvas, posterSizeRef.current);
        initializePosterFields(canvas, EMPTY_CONTENT, posterSizeRef.current);
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
    initializePosterFields(canvas, contentValuesRef.current, nextSize);

    const backgroundToApply = isBackgroundCompatibleWithSize(currentBackgroundRef.current, nextSize)
      ? currentBackgroundRef.current
      : null;

    currentBackgroundRef.current = backgroundToApply;
    setCurrentBackground(backgroundToApply);
    applyBackground(canvas, backgroundToApply);
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

  const onContentFieldChange = (fieldId, rawValue) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    updatePosterField(canvas, fieldId, rawValue, posterSizeRef.current);
    const nextValues = { ...contentValuesRef.current, [fieldId]: rawValue };
    contentValuesRef.current = nextValues;
    setContentValues(nextValues);
    saveNow();
  };

  const onNew = () => {
    if (!confirm('לפתוח עבודה חדשה?')) return;
    clearProject();
    setCurrentBackground(null);
    currentBackgroundRef.current = null;
    setContentValues(EMPTY_CONTENT);
    contentValuesRef.current = EMPTY_CONTENT;

    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.getObjects().slice().forEach((obj) => {
      if (!obj.__posterFieldObject && !obj.__posterFieldContainer && !obj.__posterFieldTitle) {
        canvas.remove(obj);
      }
    });

    initializePosterFields(canvas, EMPTY_CONTENT, posterSizeRef.current);
    applyBackground(canvas, null);
    saveNow();
  };

  const onReset = () => {
    if (!confirm('לאפס את הפוסטר?')) return;
    const canvas = fabricRef.current;
    if (!canvas) return;

    initializePosterFields(canvas, contentValuesRef.current, posterSizeRef.current);
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

  const desktopOnly = window.innerWidth < 900;

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
    desktopOnly
      ? h('div', { className: 'mobile-msg' }, 'מומלץ לעבוד ממחשב')
      : h('main', { className: `layout ${activePanel ? 'panel-open' : ''}` },
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
              selected: selectedObject,
              isLocked: selectedLocked,
              onDelete: () => {
                removeActiveObject(fabricRef.current);
                saveNow();
              },
              onDuplicate: () => {
                duplicateActiveObject(fabricRef.current);
                saveNow();
              },
              onFront: () => applyToSelection((obj) => obj.bringForward()),
              onBack: () => applyToSelection((obj) => obj.sendBackwards()),
              onLock: () => {
                setLock(fabricRef.current, !selectedLocked);
                setSelectedLocked(!selectedLocked);
                saveNow();
              }
            }),
            h('div', { className: 'canvas-wrapper' }, h('canvas', { ref: canvasRef }))
          ),
          h(Sidebar, {
            contentValues,
            onContentChange: onContentFieldChange
          })
        )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
