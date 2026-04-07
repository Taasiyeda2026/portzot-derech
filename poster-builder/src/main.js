import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { ObjectToolbar } from './components/ObjectToolbar.js';
import { normalizePosterSize, isBackgroundCompatibleWithSize } from './data/config.js';
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
import { saveProject, loadProject, clearProject } from './utils/storage.js';
import { exportPNG, exportPDF } from './utils/export.js';

const { useEffect, useRef, useState } = React;
const h = React.createElement;

const SERIALIZE_PROPS = [
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation'
];

function App() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const isHydratingRef = useRef(false);

  const [posterSize, setPosterSize] = useState('A4');
  const [activeTab, setActiveTab] = useState('backgrounds');
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedLocked, setSelectedLocked] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(null);
  const [initialMode, setInitialMode] = useState('blank');

  const posterSizeRef = useRef('A4');
  const currentBackgroundRef = useRef(null);
  const initialModeRef = useRef('blank');

  useEffect(() => {
    posterSizeRef.current = posterSize;
  }, [posterSize]);

  useEffect(() => {
    currentBackgroundRef.current = currentBackground;
  }, [currentBackground]);

  useEffect(() => {
    initialModeRef.current = initialMode;
  }, [initialMode]);

  useEffect(() => {
    const onResize = () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      resizeCanvas(canvas, posterSizeRef.current);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    registerFonts();
    document.documentElement.lang = 'he';
    document.documentElement.dir = 'rtl';
  }, []);

  const saveNow = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    saveProject({
      posterSize: posterSizeRef.current,
      mode: initialModeRef.current,
      background: currentBackgroundRef.current,
      canvas: canvas.toJSON(SERIALIZE_PROPS)
    });
  };

  const hydrate = (saved, canvas = fabricRef.current) => {
    if (!canvas || !saved) return;

    const nextSize = normalizePosterSize(saved.posterSize || 'A4');
    const nextMode = saved.mode || 'blank';
    const nextBackground = saved.background || null;

    isHydratingRef.current = true;

    posterSizeRef.current = nextSize;
    currentBackgroundRef.current = nextBackground;
    initialModeRef.current = nextMode;

    setPosterSize(nextSize);
    setInitialMode(nextMode);
    setCurrentBackground(nextBackground);

    resizeCanvas(canvas, nextSize);

    canvas.loadFromJSON(saved.canvas, () => {
      applyBackground(canvas, nextBackground);
      canvas.renderAll();
      console.info('[PosterBuilder] canvas rendered');
      isHydratingRef.current = false;
    });
  };

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const canvas = createEditor(canvasRef.current, posterSizeRef.current);
    if (!canvas) return;

    fabricRef.current = canvas;

    console.info('[PosterBuilder] canvas initialized', {
      width: canvas.width,
      height: canvas.height
    });
    canvas.renderAll();
    console.info('[PosterBuilder] canvas rendered');

    const autoSave = () => {
      if (isHydratingRef.current) return;
      saveNow();
    };

    const onSelectionCreated = ({ selected }) => {
      const active = selected?.[0] ?? null;
      setSelectedObject(active);
      setSelectedLocked(Boolean(active?.lockMovementX));
      if (active) console.log('icon selected');
    };

    const onSelectionUpdated = ({ selected }) => {
      const active = selected?.[0] ?? null;
      setSelectedObject(active);
      setSelectedLocked(Boolean(active?.lockMovementX));
      if (active) console.log('icon selected');
    };

    const onSelectionCleared = () => {
      setSelectedObject(null);
      setSelectedLocked(false);
    };

    canvas.on('selection:created', onSelectionCreated);
    canvas.on('selection:updated', onSelectionUpdated);
    canvas.on('selection:cleared', onSelectionCleared);

    ['object:added', 'object:modified', 'object:removed', 'text:changed'].forEach((evt) => {
      canvas.on(evt, autoSave);
    });

    const saved = loadProject();
    if (saved?.canvas) {
      hydrate(saved, canvas);
    } else {
      resizeCanvas(canvas, posterSizeRef.current);
      canvas.renderAll();
      console.info('[PosterBuilder] canvas rendered');
    }

    return () => {
      ['object:added', 'object:modified', 'object:removed', 'text:changed'].forEach((evt) => {
        canvas.off(evt, autoSave);
      });

      canvas.off('selection:created', onSelectionCreated);
      canvas.off('selection:updated', onSelectionUpdated);
      canvas.off('selection:cleared', onSelectionCleared);

      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  const start = (mode, options = {}) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const nextMode = mode || 'blank';

    initialModeRef.current = nextMode;
    setInitialMode(nextMode);

    if (options.clearBackground) {
      currentBackgroundRef.current = null;
      setCurrentBackground(null);
      applyBackground(canvas, null);
    }

    if (nextMode === 'template') {
      buildTemplate(canvas);
    } else {
      canvas.getObjects().slice().forEach((obj) => {
        if (!obj.excludeFromExport) {
          canvas.remove(obj);
        }
      });
      canvas.renderAll();
      console.info('[PosterBuilder] canvas rendered');
    }

    saveNow();
  };

  const handleSizeChange = (sizeKey) => {
    const nextSize = normalizePosterSize(sizeKey);

    setPosterSize(nextSize);
    posterSizeRef.current = nextSize;

    const canvas = fabricRef.current;
    if (!canvas) return;

    resizeCanvas(canvas, nextSize);

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
    console.info('[PosterBuilder] canvas rendered');
    saveNow();
  };

  const onNew = () => {
    if (!confirm('לפתוח עבודה חדשה?')) return;
    clearProject();
    start('blank', { clearBackground: true });
  };

  const onReset = () => {
    if (!confirm('לאפס את הפוסטר למצב ההתחלתי של התבנית הנוכחית?')) return;

    const canvas = fabricRef.current;
    if (!canvas) return;

    if (initialModeRef.current === 'template') {
      buildTemplate(canvas);
    } else {
      canvas.getObjects().slice().forEach((obj) => {
        if (!obj.excludeFromExport) {
          canvas.remove(obj);
        }
      });
      canvas.renderAll();
      console.info('[PosterBuilder] canvas rendered');
    }

    saveNow();
  };

  const onBackground = (path) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    console.log('background click received', path);
    console.info('[PosterBuilder] background clicked', { path });

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

  return h(
    'div',
    { className: 'app' },
    h(Header, {
      posterSize,
      onSizeChange: handleSizeChange,
      onNew,
      onSave: saveNow,
      onReset,
      onExportPng: () => exportPNG(fabricRef.current, posterSizeRef.current),
      onExportPdf: () => exportPDF(fabricRef.current, posterSizeRef.current)
    }),
    desktopOnly
      ? h('div', { className: 'mobile-msg' }, 'מומלץ לעבוד ממחשב')
      : h(
          'main',
          { className: 'layout' },
          h(Sidebar, {
            activeTab,
            setActiveTab,
            posterSize,
            onBackground,
            onColor: (color) =>
              applyToSelection((obj) => {
                if (obj.type === 'i-text') {
                  obj.set('fill', color);
                } else if (obj.type === 'group') {
                  const bg = obj.item(0);
                  if (bg?.type === 'rect') bg.set('fill', color);
                } else {
                  obj.set('fill', color);
                }
              }),
            onFont: (font) =>
              applyToSelection((obj) =>
                obj.set({ fontFamily: font.family, fontWeight: font.weight })
              ),
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
          h(
            'section',
            { className: 'canvas-area' },
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
              onAlign: (align) =>
                applyToSelection((obj) => {
                  if (obj.type === 'i-text') obj.set('textAlign', align);
                }),
              onFontSize: (delta) =>
                applyToSelection((obj) => {
                  if (obj.type === 'i-text') {
                    obj.set('fontSize', Math.max(20, (obj.fontSize || 36) + delta));
                  }
                })
            }),
            h(
              'div',
              { className: 'canvas-wrapper' },
              h('canvas', { ref: canvasRef })
            )
          )
        )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
