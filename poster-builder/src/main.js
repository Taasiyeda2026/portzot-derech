import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { StartupModal } from './components/StartupModal.js';
import { ObjectToolbar } from './components/ObjectToolbar.js';
import { POSTER_SIZES } from './data/config.js';
import {
  createEditor,
  addTextPreset,
  addContentBox,
  addElement,
  applyBackground,
  duplicateActiveObject,
  removeActiveObject,
  resizeCanvas,
  buildTemplate,
  setLock,
  registerFonts
} from './canvas/editor.js';
import { saveProject, loadProject, clearProject, hasSavedProject } from './utils/storage.js';
import { exportPNG, exportPDF } from './utils/export.js';

const { useEffect, useMemo, useRef, useState, h } = React;

function App() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [posterSize, setPosterSize] = useState('A4');
  const [activeTab, setActiveTab] = useState('backgrounds');
  const [showStart, setShowStart] = useState(true);
  const [hasSaved] = useState(hasSavedProject());
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedLocked, setSelectedLocked] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(null);
  const [initialMode, setInitialMode] = useState('blank');

  useEffect(() => {
    registerFonts();
    document.documentElement.lang = 'he';
    document.documentElement.dir = 'rtl';
  }, []);

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;
    const canvas = createEditor(canvasRef.current, posterSize);
    fabricRef.current = canvas;

    const autoSave = () => {
      const state = {
        posterSize,
        background: currentBackground,
        mode: initialMode,
        canvas: canvas.toJSON(['lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation'])
      };
      saveProject(state);
    };

    canvas.on('selection:created', ({ selected }) => {
      setSelectedObject(selected?.[0] ?? null);
      setSelectedLocked(Boolean(selected?.[0]?.lockMovementX));
    });
    canvas.on('selection:updated', ({ selected }) => {
      setSelectedObject(selected?.[0] ?? null);
      setSelectedLocked(Boolean(selected?.[0]?.lockMovementX));
    });
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
      setSelectedLocked(false);
    });

    ['object:added', 'object:modified', 'object:removed', 'text:changed'].forEach((evt) => canvas.on(evt, autoSave));

    return () => canvas.dispose();
  }, [posterSize, currentBackground, initialMode]);

  const scaleStyle = useMemo(() => {
    const size = POSTER_SIZES[posterSize];
    const ratio = Math.min(0.24, window.innerHeight / (size.height + 600));
    return { transform: `scale(${Math.max(0.12, ratio)})`, transformOrigin: 'top center' };
  }, [posterSize]);

  const hydrate = (saved) => {
    const canvas = fabricRef.current;
    if (!canvas || !saved) return;
    setPosterSize(saved.posterSize || 'A4');
    setInitialMode(saved.mode || 'blank');
    resizeCanvas(canvas, saved.posterSize || 'A4');
    canvas.loadFromJSON(saved.canvas, () => {
      applyBackground(canvas, saved.background || null);
      setCurrentBackground(saved.background || null);
      canvas.renderAll();
    });
  };

  const start = (mode) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setShowStart(false);
    setInitialMode(mode || 'blank');
    if (mode === 'template') {
      buildTemplate(canvas);
    } else {
      canvas.getObjects().forEach((obj) => {
        if (!obj.excludeFromExport) canvas.remove(obj);
      });
      canvas.renderAll();
    }
    saveNow();
  };

  const saveNow = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    saveProject({
      posterSize,
      mode: initialMode,
      background: currentBackground,
      canvas: canvas.toJSON(['lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation'])
    });
  };

  const handleSizeChange = (sizeKey) => {
    setPosterSize(sizeKey);
    const canvas = fabricRef.current;
    if (!canvas) return;
    resizeCanvas(canvas, sizeKey);
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

  const onNew = () => {
    if (!confirm('לפתוח עבודה חדשה?')) return;
    clearProject();
    setShowStart(true);
  };

  const onReset = () => {
    if (!confirm('לאפס את הפוסטר למצב ההתחלתי של התבנית הנוכחית?')) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (initialMode === 'template') {
      buildTemplate(canvas);
    } else {
      canvas.getObjects().forEach((obj) => {
        if (!obj.excludeFromExport) canvas.remove(obj);
      });
      canvas.renderAll();
    }
    saveNow();
  };

  const onBackground = (path) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setCurrentBackground(path);
    applyBackground(canvas, path);
    saveNow();
  };

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const onDelete = (event) => {
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
    showStart && h(StartupModal, {
      hasSaved,
      onResume: () => {
        hydrate(loadProject());
        setShowStart(false);
      },
      onStart: start
    }),
    h(Header, {
      posterSize,
      onSizeChange: handleSizeChange,
      onNew,
      onSave: saveNow,
      onReset,
      onExportPng: () => exportPNG(fabricRef.current, posterSize),
      onExportPdf: () => exportPDF(fabricRef.current, posterSize)
    }),
    desktopOnly
      ? h('div', { className: 'mobile-msg' }, 'מומלץ לעבוד ממחשב')
      : h('main', { className: 'layout' },
        h(Sidebar, {
          activeTab,
          setActiveTab,
          onBackground,
          onColor: (color) => applyToSelection((obj) => {
            if (obj.type === 'i-text') {
              obj.set('fill', color);
            } else if (obj.type === 'group') {
              const bg = obj.item(0);
              if (bg?.type === 'rect') bg.set('fill', color);
            } else {
              obj.set('fill', color);
            }
          }),
          onFont: (font) => applyToSelection((obj) => obj.set({ fontFamily: font.family, fontWeight: font.weight })),
          onText: (presetId) => {
            addTextPreset(fabricRef.current, presetId);
            saveNow();
          },
          onElement: (path) => {
            addElement(fabricRef.current, path);
            setTimeout(saveNow, 120);
          },
          onBox: (boxId) => {
            addContentBox(fabricRef.current, boxId);
            saveNow();
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
            onFront: () => {
              applyToSelection((obj) => obj.bringForward());
            },
            onBack: () => {
              applyToSelection((obj) => obj.sendBackwards());
            },
            onLock: () => {
              setLock(fabricRef.current, !selectedLocked);
              setSelectedLocked(!selectedLocked);
              saveNow();
            },
            onAlign: (align) => applyToSelection((obj) => {
              if (obj.type === 'i-text') obj.set('textAlign', align);
            }),
            onFontSize: (delta) => applyToSelection((obj) => {
              if (obj.type === 'i-text') obj.set('fontSize', Math.max(20, (obj.fontSize || 36) + delta));
            })
          }),
          h('div', { className: 'canvas-wrapper' },
            h('div', { style: scaleStyle }, h('canvas', { ref: canvasRef }))
          )
        )
      )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
