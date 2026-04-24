import {
  BACKGROUNDS,
  AVAILABLE_FONTS,
  PRODUCT_TYPES,
  DYNAMIC_QUESTIONS,
  VISUAL_ZONE_TITLE,
  getListRowIds,
  getVisualSlots,
  FIELD_DEFINITIONS
} from '../data/config.js';

const h = React.createElement;

const SHAPES = [
  { value: 0,  symbol: '▭', title: 'פינות ישרות' },
  { value: 10, symbol: '▢', title: 'מעוגל קצת'   },
  { value: 20, symbol: '◻', title: 'מעוגל'        }
];

const STEP_LABELS = ['סוג מוצר', 'עיצוב', 'תוכן', 'יצירה', 'סיום'];
const PRESET_COLORS = ['#5E2750','#1a3a6b','#1a5c3a','#7a1a1a','#b5520a','#1a4a5c','#2d2d2d'];

export function StepIndicator({ current }) {
  return h('div', { className: 'wz-indicator' },
    STEP_LABELS.map((label, i) => {
      const num = i + 1;
      const state = num < current ? 'done' : num === current ? 'active' : 'pending';
      return [
        h('div', { key: `dot-${num}`, className: `wz-dot-wrap` },
          h('div', { className: `wz-dot ${state}` }, state === 'done' ? '✓' : num),
          h('span', { className: `wz-dot-label ${state}` }, label)
        ),
        num < STEP_LABELS.length && h('div', { key: `line-${num}`, className: `wz-line ${num < current ? 'done' : ''}` })
      ];
    }).flat()
  );
}

function BgCatalogModal({ bgImages, previewIdx, currentBackground, onPrev, onNext, onSelect, onClose, onDot }) {
  const bg = bgImages[previewIdx];
  const total = bgImages.length;
  const isSelected = bg && bg.path === currentBackground;

  return h('div', {
    className: 'bgm-overlay',
    onClick: e => { if (e.target === e.currentTarget) onClose(); }
  },
    h('div', { className: 'bgm-card' },

      h('div', { className: 'bgm-top' },
        h('span', { className: 'bgm-counter' }, `${previewIdx + 1} / ${total}`),
        h('button', { className: 'bgm-close', onClick: onClose, 'aria-label': 'סגור' }, '✕')
      ),

      h('div', { className: 'bgm-stage' },
        h('button', { className: 'bgm-arrow bgm-arrow-right', onClick: onPrev, 'aria-label': 'הקודם' }, '‹'),

        h('div', { className: 'bgm-img-wrap' },
          bg && h('img', {
            key: bg.id,
            src: bg.path,
            alt: bg.name,
            className: 'bgm-img'
          })
        ),

        h('button', { className: 'bgm-arrow bgm-arrow-left', onClick: onNext, 'aria-label': 'הבא' }, '›')
      ),

      h('div', { className: 'bgm-dots' },
        bgImages.map((b, i) =>
          h('button', {
            key: b.id,
            className: `bgm-dot ${i === previewIdx ? 'active' : ''}`,
            onClick: () => onDot(i)
          })
        )
      ),

      h('div', { className: 'bgm-footer' },
        h('button', {
          className: `bgm-select-btn ${isSelected ? 'selected' : ''}`,
          onClick: onSelect
        }, isSelected ? '✓ רקע זה נבחר' : 'בחרי רקע זה')
      )
    )
  );
}

export function WizardStep1({
  productType, onProductTypeChange, onNext
}) {
  const { useState: useLocalState } = React;
  const [selecting, setSelecting] = useLocalState(null);

  const cards = [
    { id: 'physical', emoji: '📦', label: 'מוצר פיזי',   desc: 'מוצר שניתן לגעת בו, לייצר ולמכור' },
    { id: 'website',  emoji: '🌐', label: 'אתר',         desc: 'פלטפורמה דיגיטלית נגישה בדפדפן'   },
    { id: 'app',      emoji: '📱', label: 'אפליקציה',    desc: 'אפליקציה לטלפון חכם'               }
  ];

  const handleCardClick = (id) => {
    setSelecting(id);
    onProductTypeChange(id);
    setTimeout(onNext, 380);
  };

  return h('div', { className: 'wz-screen wz-screen-step1' },
    h(StepIndicator, { current: 1 }),

    h('div', { className: 'wz-content wz-content-step1' },
      h('div', { className: 'wz-step1-top-banner', role: 'heading', 'aria-level': 2 }, 'ממתגות ומבססות'),
      h('section', { className: 'wz-step1-section' },
        h('div', { className: 'wz-hero wz-step1-hero' },
          h('h1', { className: 'wz-title' }, 'נתחיל מסוג התוצר'),
          h('p', { className: 'wz-subtitle' }, 'בוחרים איזה תוצר יוצרים — הבחירה תשפיע על השאלות והמבנה בהמשך.')
        ),
        h('div', { className: 'wz-cards' },
          cards.map(card =>
            h('button', {
              key: card.id,
              className: `wz-card ${productType === card.id || selecting === card.id ? 'active' : ''} ${selecting === card.id ? 'selecting' : ''}`,
              onClick: () => handleCardClick(card.id)
            },
              h('span', { className: 'wz-card-emoji' }, card.emoji),
              h('span', { className: 'wz-card-label' }, card.label),
              h('span', { className: 'wz-card-desc'  }, card.desc)
            )
          )
        )
      )
    )
  );
}

export function WizardStep2({
  currentBackground, currentShape, titleFont, titleColor,
  onBackground, onShape, onTitleFont, onTitleColor, onNext, onBack
}) {
  const { useState: useLocalState } = React;
  const bgImages      = BACKGROUNDS.filter(bg => bg.path);
  const isCustomColor = !PRESET_COLORS.includes(titleColor);
  const [showBgModal, setShowBgModal] = useLocalState(false);
  const [previewIdx,  setPreviewIdx]  = useLocalState(0);

  const openModal = () => {
    const idx = bgImages.findIndex(bg => bg.path === currentBackground);
    setPreviewIdx(idx >= 0 ? idx : 0);
    setShowBgModal(true);
  };

  const selectedBg = bgImages.find(bg => bg.path === currentBackground);

  return h('div', { className: 'wz-screen' },
    h(StepIndicator, { current: 2 }),

    showBgModal && h(BgCatalogModal, {
      bgImages,
      previewIdx,
      currentBackground,
      onPrev:   () => setPreviewIdx(i => (i - 1 + bgImages.length) % bgImages.length),
      onNext:   () => setPreviewIdx(i => (i + 1) % bgImages.length),
      onDot:    i  => setPreviewIdx(i),
      onSelect: () => { onBackground(bgImages[previewIdx].path); setShowBgModal(false); },
      onClose:  () => setShowBgModal(false)
    }),

    h('div', { className: 'wz-content' },
      h('div', { className: 'wz-hero' },
        h('h1', { className: 'wz-title' }, 'עיצוב הפוסטר שלכן'),
        h('p', { className: 'wz-subtitle' }, 'בחרו את הסגנון הויזואלי לפני שתתחילו')
      ),

      h('div', { className: 'wz-section' },
        h('h3', { className: 'wz-section-title' }, 'רקע'),
        h('div', { className: 'wz-bg-picker-col' },
          selectedBg && h('div', { className: 'wz-bg-current-wrap' },
            h('img', { src: selectedBg.path, alt: selectedBg.name, className: 'wz-bg-current-thumb' }),
            h('span', { className: 'wz-bg-current-check' }, '✓')
          ),
          h('button', { className: 'wz-bg-open-btn', onClick: openModal },
            selectedBg ? 'החלפת רקע ›' : 'בחרי רקע ›'
          )
        )
      ),

      h('div', { className: 'wz-section' },
        h('h3', { className: 'wz-section-title' }, 'מסגרת תיבות'),
        h('div', { className: 'wz-shapes' },
          SHAPES.map(s =>
            h('button', {
              key: s.value,
              className: `wz-shape-btn ${currentShape === s.value ? 'active' : ''}`,
              style: { borderRadius: `${s.value * 0.6}px` },
              title: s.title,
              onClick: () => onShape(s.value)
            }, s.symbol)
          )
        )
      ),

      h('div', { className: 'wz-section' },
        h('h3', { className: 'wz-section-title' }, 'פונט כותרות'),
        h('div', { className: 'wz-font-imgs' },
          AVAILABLE_FONTS.map(f =>
            h('button', {
              key: f.value,
              className: `wz-font-img-btn ${titleFont === f.value ? 'active' : ''}`,
              title: f.label,
              onClick: () => onTitleFont(f.value)
            },
              h('img', { src: f.img, alt: f.label, className: 'wz-font-img' })
            )
          )
        )
      ),

      h('div', { className: 'wz-section' },
        h('h3', { className: 'wz-section-title' }, 'צבע כותרות'),
        h('div', { className: 'wz-colors-grid' },
          h('div', { className: 'wz-colors-row' },
            PRESET_COLORS.slice(0, 4).map(color =>
              h('button', {
                key: color,
                className: `wz-color-swatch ${titleColor === color ? 'active' : ''}`,
                style: { background: color },
                title: color,
                onClick: () => onTitleColor(color)
              })
            )
          ),
          h('div', { className: 'wz-colors-row' },
            PRESET_COLORS.slice(4).map(color =>
              h('button', {
                key: color,
                className: `wz-color-swatch ${titleColor === color ? 'active' : ''}`,
                style: { background: color },
                title: color,
                onClick: () => onTitleColor(color)
              })
            ),
            h('label', { className: 'wz-color-custom-wrap', title: 'צבע מותאם אישית' },
              h('div', {
                className: `wz-color-swatch wz-color-swatch-custom ${isCustomColor ? 'active' : ''}`,
                style: { background: isCustomColor ? titleColor : 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)' }
              }),
              h('input', {
                type: 'color',
                className: 'wz-color-input-hidden',
                value: titleColor,
                onChange: e => onTitleColor(e.target.value)
              })
            )
          )
        )
      )
    ),

    h('div', { className: 'wz-nav' },
      h('button', { className: 'wz-btn wz-btn-ghost', onClick: onBack }, '‹ חזרה'),
      h('button', { className: 'wz-btn wz-btn-primary', onClick: onNext }, 'הבא ›')
    )
  );
}

function CharCounter({ count, max }) {
  const cls = count >= max ? 'overflow' : count >= max * 0.9 ? 'near-limit' : 'ok';
  return h('span', { className: `poster-field-counter ${cls}` }, `${count}/${max}`);
}

function RegularField({ field, value, onContentChange }) {
  const count = (value || '').length;
  const max   = field.maxChars;
  const cls   = count >= max ? 'overflow' : count >= max * 0.9 ? 'near-limit' : 'ok';
  return h('div', { className: 'poster-field' },
    h('span', { className: 'poster-field-question' }, field.question),
    field.hint && h('span', { className: 'poster-field-hint' }, field.hint),
    h('textarea', {
      className: `poster-field-input ${cls}`,
      rows: 3,
      maxLength: max,
      value: value || '',
      onChange: e => onContentChange(field.id, e.target.value.slice(0, max))
    }),
    h('div', { className: 'poster-field-meta' },
      h('span', { className: `poster-field-status ${cls}` },
        count >= max ? 'מלא' : cls === 'near-limit' ? 'כמעט מלא' : 'תקין'
      ),
      h(CharCounter, { count, max })
    )
  );
}

function ListField({ field, values, onContentChange }) {
  const rowIds = getListRowIds(field.id);
  const maxRow = field.maxCharsPerRow || 45;
  return h('div', { className: 'poster-field' },
    h('span', { className: 'poster-field-question' }, field.question),
    field.hint && h('span', { className: 'poster-field-hint' }, field.hint),
    h('div', { className: 'list-field-rows' },
      rowIds.map((rowId, idx) => {
        const rowVal = values[rowId] || '';
        const count  = rowVal.length;
        const cls    = count >= maxRow ? 'overflow' : count >= maxRow * 0.9 ? 'near-limit' : 'ok';
        return h('div', { key: rowId, className: 'list-field-row' },
          h('span', { className: 'list-row-num' }, `${idx + 1}.`),
          h('input', {
            type: 'text',
            className: `list-row-input ${cls}`,
            maxLength: maxRow,
            value: rowVal,
            onChange: e => onContentChange(rowId, e.target.value.slice(0, maxRow))
          }),
          h(CharCounter, { count, max: maxRow })
        );
      })
    )
  );
}

function ParticipantsField({ field, values, onContentChange }) {
  const nameFields = [
    { key: 'student1', placeholder: '' },
    { key: 'student2', placeholder: '' },
    { key: 'student3', placeholder: '' },
  ];
  const MAX_NAME   = 25;
  const MAX_CLASS  = 5;
  const MAX_SCHOOL = 25;

  const inputCls = (val, max) => val.length >= max ? 'overflow' : val.length >= max * 0.85 ? 'near-limit' : 'ok';

  return h('div', { className: 'poster-field participants-field' },
    h('span', { className: 'poster-field-question' }, field.question),

    h('div', { className: 'participants-names-section' },
      h('label', { className: 'participants-label' }, 'שמות התלמידות:'),
      h('div', { className: 'participants-name-inputs' },
        nameFields.map(nf => {
          const val = values[nf.key] || '';
          return h('input', {
            key: nf.key,
            type: 'text',
            className: `participants-name-input ${inputCls(val, MAX_NAME)}`,
            maxLength: MAX_NAME,
            placeholder: nf.placeholder,
            value: val,
            onChange: e => onContentChange(nf.key, e.target.value.slice(0, MAX_NAME))
          });
        })
      )
    ),

    h('div', { className: 'participants-meta-row' },
      h('div', { className: 'participants-class-wrap' },
        h('label', { className: 'participants-label' }, 'כיתה:'),
        h('input', {
          type: 'text',
          className: `participants-class-input ${inputCls(values.className || '', MAX_CLASS)}`,
          maxLength: MAX_CLASS,
          placeholder: '',
          value: values.className || '',
          onChange: e => onContentChange('className', e.target.value.slice(0, MAX_CLASS))
        })
      ),
      h('div', { className: 'participants-school-wrap' },
        h('label', { className: 'participants-label' }, 'שם בית הספר:'),
        h('input', {
          type: 'text',
          className: `participants-school-input ${inputCls(values.schoolName || '', MAX_SCHOOL)}`,
          maxLength: MAX_SCHOOL,
          placeholder: '',
          value: values.schoolName || '',
          onChange: e => onContentChange('schoolName', e.target.value.slice(0, MAX_SCHOOL))
        })
      )
    )
  );
}

function SlotUploadSection({ slots, slotImages, onSlotUpload, onSlotClear }) {
  return h('div', { className: 'slot-upload-section' },
    slots.map(slot => {
      const hasImage = Boolean(slotImages[slot.key]);
      return h('div', { key: slot.key, className: 'slot-upload-item' },
        h('span', { className: 'slot-upload-label' }, slot.label),
        hasImage
          ? h('div', { className: 'zone-image-controls' },
              h('span', { className: 'zone-image-ok' }, '✓ הועלתה'),
              h('button', {
                className: 'btn btn-small zone-image-clear',
                onClick: () => onSlotClear(slot.key)
              }, 'הסרה')
            )
          : h('label', { className: 'zone-image-upload-label' },
              h('input', {
                type: 'file', accept: 'image/*', style: { display: 'none' },
                onChange: e => {
                  const f = e.target.files?.[0];
                  if (f) onSlotUpload(slot.key, f);
                  e.target.value = '';
                }
              }),
              '+ העלאה'
            )
      );
    })
  );
}

function resolveDynamicField(field, productType) {
  if (!field.dynamic || !DYNAMIC_QUESTIONS[field.dynamic]) return field;
  const dynamicBank = DYNAMIC_QUESTIONS[field.dynamic];
  const resolved = dynamicBank[productType] || dynamicBank.none;
  return { ...field, question: resolved.question, hint: resolved.hint || field.hint };
}

function getProductTypeLabel(productType) {
  const type = PRODUCT_TYPES.find(item => item.id === productType);
  return type ? type.label : 'מוצר';
}

function getMissingStep3Fields(contentValues, productType) {
  const textRequired = [
    'projectName', 'description', 'problem', 'audience', 'researchQuestion',
    'findings', 'solution', 'value', 'student1', 'className', 'schoolName'
  ];
  const listRequired = ['research', 'requirements', 'howItWorks'];

  const missing = [];
  const questionById = {};
  FIELD_DEFINITIONS.forEach(field => {
    const resolved = resolveDynamicField(field, productType);
    questionById[field.id] = resolved.question;
  });

  textRequired.forEach(key => {
    const value = (contentValues[key] || '').trim();
    if (!value) {
      if (key === 'student1') missing.push('שמות התלמידות');
      else if (key === 'className') missing.push('כיתה');
      else if (key === 'schoolName') missing.push('שם בית הספר');
      else missing.push(questionById[key] || key);
    }
  });

  listRequired.forEach(fieldId => {
    const hasAtLeastOne = getListRowIds(fieldId).some(rowId => ((contentValues[rowId] || '').trim()));
    if (!hasAtLeastOne) missing.push(questionById[fieldId] || fieldId);
  });

  return missing;
}

function buildImagePromptBlocks(productType, contentValues) {
  const productLabel = getProductTypeLabel(productType);
  const fallback = (val, txt) => (val || '').trim() || txt;
  const projectName = fallback(contentValues.projectName, 'מיזם תלמידות');
  const problem = fallback(contentValues.problem, 'צורך יומיומי שדורש פתרון');
  const audience = fallback(contentValues.audience, 'קהל יעד מוגדר');
  const solution = fallback(contentValues.solution, 'פתרון מרכזי למענה');
  const value = fallback(contentValues.value, 'שיפור משמעותי למשתמשות');
  const usageStep = getListRowIds('howItWorks')
    .map(rowId => (contentValues[rowId] || '').trim())
    .find(Boolean) || 'שימוש פשוט וברור בפתרון';

  return [
    {
      title: 'פרומפט 1 — הבעיה',
      text: `צרי אילוסטרציה מקצועית בסגנון נקי לפוסטר תלמידות בנושא "${projectName}". להמחיש בעיה מרכזית: ${problem}. קהל היעד: ${audience}. סוג התוצר: ${productLabel}. קומפוזיציה ברורה, צבעים נעימים, ללא טקסט בתוך התמונה.`
    },
    {
      title: 'פרומפט 2 — רגע השימוש',
      text: `צרי סצנה שמציגה רגע שימוש ב${productLabel} במסגרת המיזם "${projectName}". לתאר פעולה מרכזית: ${usageStep}. להדגיש את הפתרון: ${solution}. אווירה חיובית, זווית ברורה, פרטים שימושיים, ללא טקסט.`
    },
    {
      title: 'פרומפט 3 — התוצאה',
      text: `צרי תמונת תוצאה לאחר שימוש ב${productLabel} מתוך "${projectName}". להדגיש את הערך: ${value}. להראות שיפור אמיתי עבור ${audience}. סגנון מציאותי-ידידותי, תאורה טבעית, עומק ויזואלי, ללא טקסט.`
    }
  ];
}

export function WizardStep3({
  productType, contentValues, slotImages, posterSize,
  onContentChange, onSlotUpload, onSlotClear, onNext, onBack
}) {
  const { useState: useLocalState } = React;
  const slots = getVisualSlots(posterSize || 'A4', productType);
  const [toolsUnlocked, setToolsUnlocked] = useLocalState(false);
  const [validationMessage, setValidationMessage] = useLocalState(null);
  const [promptBlocks, setPromptBlocks] = useLocalState([]);

  const handleFinishQuestions = () => {
    const missing = getMissingStep3Fields(contentValues, productType);
    if (missing.length) {
      setToolsUnlocked(false);
      setPromptBlocks([]);
      setValidationMessage({
        text: 'כדי להמשיך, צריך להשלים כמה תשובות חסרות',
        missing: missing.slice(0, 4)
      });
      return;
    }
    setValidationMessage(null);
    setToolsUnlocked(true);
  };

  const handleBuildPrompts = () => {
    setPromptBlocks(buildImagePromptBlocks(productType, contentValues));
  };

  const copyText = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
  };

  const productTypeLabel = getProductTypeLabel(productType);

  return h('div', { className: 'wz-screen wz-screen-form' },
    h(StepIndicator, { current: 3 }),
    h('div', { className: 'wz-form-layout' },
      h('div', { className: 'wz-form-sidebar' },
        h('div', { className: 'wz-form-side-text' },
          h('h2', { className: 'wz-title wz-title-sm' }, 'עכשיו ממלאים שאלות'),
          h('p', { className: 'wz-subtitle wz-subtitle-sm' }, 'אחרי שבחרתן סוג תוצר, ממלאים את שאלות הפוסטר. רק בסיום אפשר לעבור לתוצרים.'),
          h('div', { className: 'wz-side-helper' }, `סוג התוצר שנבחר: ${productTypeLabel}`)
        ),
        h('div', { className: 'wz-form-side-nav' },
          h('button', { className: 'wz-btn wz-btn-ghost wz-btn-full', onClick: onBack  }, '‹ חזרה'),
          h('button', { className: 'wz-btn wz-btn-primary wz-btn-full', onClick: handleFinishQuestions }, 'סיימנו למלא שאלות')
        )
      ),

      h('div', { className: 'wz-form-fields' },
        validationMessage && h('div', { className: 'wz-validation-box' },
          h('div', null, validationMessage.text),
          validationMessage.missing.length > 0 && h('ul', { className: 'wz-validation-list' },
            validationMessage.missing.map((item, idx) => h('li', { key: `${item}-${idx}` }, item))
          )
        ),
        h('div', { className: 'zone-image-section' },
          h('span', { className: 'zone-image-section-title' }, VISUAL_ZONE_TITLE[productType] || 'אזור חזותי'),
          h(SlotUploadSection, { slots, slotImages, onSlotUpload, onSlotClear })
        ),
        FIELD_DEFINITIONS.map(field => {
          const resolved = resolveDynamicField(field, productType);
          if (field.type === 'participants') {
            return h(ParticipantsField, { key: field.id, field: resolved, values: contentValues, onContentChange });
          }
          if (field.type === 'list') {
            return h(ListField, { key: field.id, field: resolved, values: contentValues, onContentChange });
          }
          return h(RegularField, {
            key: field.id,
            field: resolved,
            value: contentValues[field.id] || '',
            onContentChange
          });
        }),

        toolsUnlocked && h('div', { className: 'wz-after-fill' },
          h('div', { className: 'wz-after-fill-head' },
            h('div', { className: 'wz-after-fill-title' }, 'מעולה. עכשיו אפשר לעבור לתוצרים'),
            h('div', { className: 'wz-after-fill-subtitle' }, 'מכאן אפשר לעבור לבנייה, להפיק פרומפטים לתמונה, ובהמשך גם ספיץ\'.')
          ),
          h('div', { className: 'wz-output-cards' },
            h('div', { className: 'wz-output-card' },
              h('div', { className: 'wz-output-card-title' }, 'לבנייה'),
              h('div', { className: 'wz-output-card-desc' }, 'מעבר לעורך הבנייה של הפוסטר.'),
              h('button', { className: 'wz-btn wz-btn-primary wz-btn-full', onClick: onNext }, 'לבנייה')
            ),
            h('div', { className: 'wz-output-card' },
              h('div', { className: 'wz-output-card-title' }, 'פרומפט לתמונה'),
              h('div', { className: 'wz-output-card-desc' }, '3 פרומפטים: הבעיה, רגע השימוש והתוצאה.'),
              h('button', { className: 'wz-btn wz-btn-ghost wz-btn-full', onClick: handleBuildPrompts }, 'פרומפט לתמונה')
            ),
            h('div', { className: 'wz-output-card wz-output-card-disabled' },
              h('div', { className: 'wz-output-card-title' }, 'ספיץ\''),
              h('div', { className: 'wz-output-card-desc' }, 'בקרוב.'),
              h('button', { className: 'wz-btn wz-btn-ghost wz-btn-full', disabled: true }, 'ספיץ\' (בקרוב)')
            )
          ),

          promptBlocks.length > 0 && h('div', { className: 'wz-prompt-results' },
            h('div', { className: 'wz-prompt-results-head' },
              h('div', { className: 'wz-prompt-results-title' }, 'פרומפטים מוכנים לתמונה'),
              h('button', {
                className: 'wz-btn wz-btn-ghost',
                onClick: () => copyText(promptBlocks.map(block => `${block.title}\n${block.text}`).join('\n\n'))
              }, 'העתקת הכול')
            ),
            promptBlocks.map((block, index) =>
              h('div', { key: `${block.title}-${index}`, className: 'wz-prompt-block' },
                h('div', { className: 'wz-prompt-block-top' },
                  h('div', { className: 'wz-prompt-block-title' }, block.title),
                  h('button', {
                    className: 'wz-btn wz-btn-ghost',
                    onClick: () => copyText(block.text)
                  }, 'העתקה')
                ),
                h('div', { className: 'wz-prompt-block-text' }, block.text)
              )
            )
          )
        )
      )
    )
  );
}

// ════════════════════════════════════════════════════════════
//  PHYSICAL PRODUCT 4-STEP FLOW
// ════════════════════════════════════════════════════════════

const PHYSICAL_STEP_LABELS = ['שאלות חקר', 'שאלות פרומפט', 'תמונות', 'פוסטר'];

export function PhysicalStepIndicator({ current }) {
  return h('div', { className: 'wz-indicator' },
    PHYSICAL_STEP_LABELS.map((label, i) => {
      const num = i + 1;
      const state = num < current ? 'done' : num === current ? 'active' : 'pending';
      return [
        h('div', { key: `pdot-${num}`, className: 'wz-dot-wrap' },
          h('div', { className: `wz-dot ${state}` }, state === 'done' ? '✓' : num),
          h('span', { className: `wz-dot-label ${state}` }, label)
        ),
        num < PHYSICAL_STEP_LABELS.length &&
          h('div', { key: `pline-${num}`, className: `wz-line ${num < current ? 'done' : ''}` })
      ];
    }).flat()
  );
}

// ── Helper UI components for PhysicalStep2 ──────────────────

function PhysicalChipGroup({ label, hint, options, value, onChange }) {
  const { useState: useLocalState } = React;
  const isKnown = options.includes(value);
  const isOther = Boolean(value) && !isKnown;
  const [otherMode, setOtherMode] = useLocalState(isOther);

  const handleKnown = opt => {
    setOtherMode(false);
    onChange(value === opt ? '' : opt);
  };
  const handleOther = () => {
    setOtherMode(true);
    if (!isOther) onChange('');
  };

  return h('div', { className: 'ph-field' },
    h('label', { className: 'ph-field-label' }, label),
    hint && h('span', { className: 'ph-field-hint' }, hint),
    h('div', { className: 'ph-chips' },
      options.map(opt =>
        h('button', {
          key: opt, type: 'button',
          className: `ph-chip ${value === opt ? 'active' : ''}`,
          onClick: () => handleKnown(opt)
        }, opt)
      ),
      h('button', {
        type: 'button',
        className: `ph-chip ph-chip-other ${otherMode || isOther ? 'active' : ''}`,
        onClick: handleOther
      }, 'אחר...')
    ),
    (otherMode || isOther) && h('input', {
      type: 'text', className: 'ph-other-input',
      placeholder: 'הכניסי כאן...',
      value: isOther ? value : '',
      autoFocus: !isOther,
      onChange: e => onChange(e.target.value)
    })
  );
}

function PhysicalTextField({ label, hint, value, onChange, placeholder }) {
  return h('div', { className: 'ph-field' },
    h('label', { className: 'ph-field-label' }, label),
    hint && h('span', { className: 'ph-field-hint' }, hint),
    h('input', {
      type: 'text', className: 'ph-text-input',
      placeholder: placeholder || '',
      value: value || '',
      onChange: e => onChange(e.target.value)
    })
  );
}

// ── Prompt builder ──────────────────────────────────────────

function gcdCalc(a, b) { return b === 0 ? a : gcdCalc(b, a % b); }
function slotRatio(slot) {
  const w = slot.width, hh = slot.height;
  const g = gcdCalc(w, hh);
  return `${w / g}:${hh / g} (${w > hh ? 'אופקי' : 'אנכי'})`;
}

function buildPhysicalPrompts(contentValues, promptAnswers, posterSize) {
  const slots  = getVisualSlots(posterSize || 'A4', 'physical');
  const mainSl = slots.find(s => s.key === 'visual_1') || { width: 500, height: 420 };
  const useSl  = slots.find(s => s.key === 'visual_2') || { width: 500, height: 420 };

  const v = contentValues;
  const p = promptAnswers;

  const name   = (v.projectName  || '').trim() || 'המיזם';
  const desc   = (v.description  || '').trim();
  const prob   = (v.problem      || '').trim();
  const aud    = (v.audience     || '').trim();
  const sol    = (v.solution     || '').trim();
  const val    = (v.value        || '').trim();
  const reqs   = [1,2,3].map(i => (v[`requirements_${i}`] || '').trim()).filter(Boolean);
  const how    = [1,2,3].map(i => (v[`howItWorks_${i}`]   || '').trim()).filter(Boolean);

  // ── Main image prompt ──
  const mLines = [`צרי תמונת מוצר מקצועית עבור פוסטר חקר תלמידות.`, ''];
  const ctx = name + (desc ? ` — ${desc}` : '');
  mLines.push(`המיזם: "${ctx}".`);
  if (prob) mLines.push(`הבעיה: ${prob}${aud ? ` (עבור ${aud})` : ''}.`);
  if (sol)  mLines.push(`המוצר: ${sol}.`);
  if (val)  mLines.push(`ערך מרכזי: ${val}.`);
  if (reqs.length) mLines.push(`דרישות הפתרון: ${reqs.join('; ')}.`);
  mLines.push('');
  mLines.push('הנחיות לתמונה:');
  if (p.main_whatToSee)  mLines.push(`• בתמונה יש להציג: ${p.main_whatToSee}.`);
  if (p.main_appearance) mLines.push(`• אופן הצגת המוצר: ${p.main_appearance}.`);
  if (p.main_highlight)  mLines.push(`• יש להבליט: ${p.main_highlight}.`);
  if (p.main_material)   mLines.push(`• חומר/מרקם: ${p.main_material}.`);
  if (p.main_background) mLines.push(`• רקע: ${p.main_background}.`);
  if (p.main_style)      mLines.push(`• סגנון עיצובי: ${p.main_style}.`);
  if (p.main_realism)    mLines.push(`• רמת ריאליזם: ${p.main_realism}.`);
  if (p.main_colors)     mLines.push(`• צבעים: ${p.main_colors}.`);
  mLines.push('');
  mLines.push('ללא טקסט, כיתובים או לוגואים בתוך התמונה.');
  if (p.main_exclude)    mLines.push(`ללא: ${p.main_exclude}.`);
  mLines.push(`מפרט: יחס ${slotRatio(mainSl)}, רזולוציה גבוהה, רקע אחיד או מוגדר.`);

  // ── Usage image prompt ──
  const uLines = [`צרי תמונת שימוש ריאליסטית עבור פוסטר חקר תלמידות.`, ''];
  uLines.push(`המיזם: "${ctx}".`);
  if (prob) uLines.push(`הבעיה שנפתרת: ${prob}${aud ? ` עבור ${aud}` : ''}.`);
  if (sol)  uLines.push(`המוצר שמשתמשים בו: ${sol}.`);
  const act = how[0] || '';
  if (act) uLines.push(`הפעולה המרכזית: ${act}.`);
  if (val) uLines.push(`הערך להמחיש: ${val}.`);
  uLines.push('');
  uLines.push('הנחיות לתמונה:');
  if (p.usage_who)       uLines.push(`• המשתמש/ת: ${p.usage_who}.`);
  if (p.usage_howMany)   uLines.push(`• מספר אנשים: ${p.usage_howMany}.`);
  if (p.usage_action)    uLines.push(`• הפעולה המוצגת: ${p.usage_action}.`);
  if (p.usage_where)     uLines.push(`• מיקום: ${p.usage_where}.`);
  if (p.usage_understand)uLines.push(`• מה הצופה צריך להבין: ${p.usage_understand}.`);
  if (p.usage_highlight) uLines.push(`• מה להבליט: ${p.usage_highlight}.`);
  if (p.usage_style)     uLines.push(`• סגנון: ${p.usage_style}.`);
  if (p.usage_realism)   uLines.push(`• רמת ריאליזם: ${p.usage_realism}.`);
  if (p.usage_colors)    uLines.push(`• צבעים: ${p.usage_colors}.`);
  uLines.push('');
  uLines.push('ללא טקסט, כיתובים או לוגואים בתוך התמונה.');
  if (p.usage_exclude)   uLines.push(`ללא: ${p.usage_exclude}.`);
  uLines.push(`מפרט: יחס ${slotRatio(useSl)}, תמונה חמה ואנושית, רזולוציה גבוהה.`);

  return {
    mainPrompt:  mLines.join('\n'),
    usagePrompt: uLines.join('\n')
  };
}

// ════════════════════════════════════════════════════════════
//  PhysicalStep1 — שאלות חקר
// ════════════════════════════════════════════════════════════

export function PhysicalStep1({ contentValues, onContentChange, onNext, onBack, productType }) {
  const { useState: useLocalState } = React;
  const [validationMsg, setValidationMsg] = useLocalState(null);
  const formFieldsRef = React.useRef(null);

  const handleNext = () => {
    const missing = getMissingStep3Fields(contentValues, 'physical');
    if (missing.length) {
      setValidationMsg({ text: 'יש למלא את כל השדות לפני המעבר לשלב הבא', missing: missing.slice(0, 5) });
      if (formFieldsRef.current) {
        formFieldsRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    setValidationMsg(null);
    onNext();
  };

  return h('div', { className: 'wz-screen wz-screen-form' },
    h(PhysicalStepIndicator, { current: 1 }),

    h('div', { className: 'wz-form-layout' },

      h('aside', { className: 'wz-form-sidebar' },
        h('div', { className: 'wz-form-side-text' },
          h('h2', { className: 'wz-title wz-title-sm' }, 'שאלות חקר'),
          h('p', { className: 'wz-subtitle wz-subtitle-sm' },
            'מלאי את כל השדות לפי מה שפיתחתן. כל שדה יוצג בפוסטר הסופי.'
          ),
          h('div', { className: 'wz-side-helper' }, 'שלב 1 מתוך 4 — מוצר פיזי')
        ),
        h('div', { className: 'wz-form-side-nav' },
          h('button', { className: 'wz-btn wz-btn-ghost', onClick: onBack }, '‹ חזרה'),
          h('button', { className: 'wz-btn wz-btn-primary', onClick: handleNext }, 'הבא ›')
        )
      ),

      h('div', { className: 'wz-form-fields', ref: formFieldsRef },
        validationMsg && h('div', { className: 'wz-validation-box' },
          h('div', null, validationMsg.text),
          validationMsg.missing.length > 0 && h('ul', { className: 'wz-validation-list' },
            validationMsg.missing.map((item, idx) =>
              h('li', { key: `${item}-${idx}` }, item)
            )
          )
        ),

        FIELD_DEFINITIONS.map(field => {
          const resolved = resolveDynamicField(field, 'physical');
          if (field.type === 'participants') {
            return h(ParticipantsField, {
              key: field.id, field: resolved,
              values: contentValues, onContentChange
            });
          }
          if (field.type === 'list') {
            return h(ListField, {
              key: field.id, field: resolved,
              values: contentValues, onContentChange
            });
          }
          return h(RegularField, {
            key: field.id, field: resolved,
            value: contentValues[field.id] || '',
            onContentChange
          });
        })
      )
    )
  );
}

// ════════════════════════════════════════════════════════════
//  PhysicalStep2 — שאלות פרומפט
// ════════════════════════════════════════════════════════════

const MAIN_IMAGE_FIELDS = [
  { key: 'main_appearance', label: 'איך המוצר מופיע?',
    type: 'chips', options: ['מונח על משטח', 'אוחז ביד', 'פריסה מלאה', 'קלוז-אפ'] },
  { key: 'main_highlight', label: 'מה חשוב שיבלוט?',
    type: 'chips', options: ['המוצר כולו', 'חומר ומרקם', 'פרטים טכניים', 'צבע המוצר'] },
  { key: 'main_material', label: 'חומר / מרקם המוצר',
    type: 'chips', options: ['פלסטיק', 'מתכת', 'עץ', 'בד / טקסטיל', 'קרטון / נייר', 'מעורב'] },
  { key: 'main_background', label: 'רקע רצוי',
    type: 'chips', options: ['לבן נקי', 'אפור מינימלי', 'חוץ / טבע', 'סטודיו מקצועי', 'מופשט'] },
  { key: 'main_style', label: 'סגנון עיצובי',
    type: 'chips', options: ['מינימליסטי', 'מקצועי / תעשייתי', 'חם ואנושי', 'מודרני', 'צבעוני'] },
  { key: 'main_realism', label: 'רמת ריאליזם',
    type: 'chips', options: ['פוטוריאליסטי', 'אילוסטרציה', 'תלת-ממד (3D)'] },
  { key: 'main_whatToSee', label: 'מה צריך לראות בתמונה?', type: 'text',
    placeholder: 'תארי בחופשיות מה המוצר שמוצג ואיפה...' },
  { key: 'main_colors', label: 'צבעים בולטים', type: 'text',
    placeholder: 'לדוגמה: כחול ולבן, כתום, טונות אדמה...' },
  { key: 'main_exclude', label: 'מה לא לכלול', type: 'text',
    placeholder: 'לדוגמה: אנשים, טקסט, צללים חזקים...' }
];

const USAGE_IMAGE_FIELDS = [
  { key: 'usage_who', label: 'מי משתמש/ת במוצר?',
    type: 'chips', options: ['ילד / ילדה', 'נוער', 'מבוגר/ת', 'קשיש/ה', 'קבוצה'] },
  { key: 'usage_howMany', label: 'כמה אנשים בתמונה?',
    type: 'chips', options: ['אדם אחד', 'שניים', 'שלושה ויותר'] },
  { key: 'usage_where', label: 'איפה מתרחש השימוש?',
    type: 'chips', options: ['בבית', 'בחוץ', 'בכיתה / לימודים', 'בציבור', 'במשרד'] },
  { key: 'usage_highlight', label: 'מה צריך לבלוט?',
    type: 'chips', options: ['פני האדם', 'הידיים', 'המוצר', 'הסביבה', 'הרגש'] },
  { key: 'usage_style', label: 'סגנון עיצובי',
    type: 'chips', options: ['ריאליסטי / דוקומנטרי', 'חם ואנושי', 'מינימליסטי', 'דינמי'] },
  { key: 'usage_realism', label: 'רמת ריאליזם',
    type: 'chips', options: ['פוטוריאליסטי', 'אילוסטרציה', 'תלת-ממד (3D)'] },
  { key: 'usage_action', label: 'מה הפעולה המוצגת?', type: 'text',
    placeholder: 'תארי את הרגע שמוצג בתמונה...' },
  { key: 'usage_understand', label: 'מה חשוב שהצופה יבין?', type: 'text',
    placeholder: 'המסר שיעבור מהתמונה...' },
  { key: 'usage_colors', label: 'צבעים בולטים', type: 'text',
    placeholder: 'לדוגמה: חמים, כחולים, טבעיים...' },
  { key: 'usage_exclude', label: 'מה לא לכלול', type: 'text',
    placeholder: 'לדוגמה: פנים מטושטשות, עמוס מדי...' }
];

function PhysicalImageSection({ title, fields, promptAnswers, onPromptChange }) {
  return h('div', { className: 'ph-image-section' },
    h('h3', { className: 'ph-image-section-title' }, title),
    h('div', { className: 'ph-image-section-fields' },
      fields.map(f =>
        f.type === 'chips'
          ? h(PhysicalChipGroup, {
              key: f.key, label: f.label, hint: f.hint,
              options: f.options,
              value: promptAnswers[f.key] || '',
              onChange: v => onPromptChange(f.key, v)
            })
          : h(PhysicalTextField, {
              key: f.key, label: f.label, hint: f.hint,
              placeholder: f.placeholder,
              value: promptAnswers[f.key] || '',
              onChange: v => onPromptChange(f.key, v)
            })
      )
    )
  );
}

export function PhysicalStep2({ promptAnswers, onPromptChange, contentValues, onNext, onBack }) {
  const projectName = (contentValues.projectName || '').trim();
  const solution    = (contentValues.solution    || '').trim();

  return h('div', { className: 'wz-screen wz-screen-form' },
    h(PhysicalStepIndicator, { current: 2 }),

    h('div', { className: 'wz-form-layout' },

      h('aside', { className: 'wz-form-sidebar' },
        h('div', { className: 'wz-form-side-text' },
          h('h2', { className: 'wz-title wz-title-sm' }, 'שאלות פרומפט'),
          h('p', { className: 'wz-subtitle wz-subtitle-sm' },
            'בחרי את הסגנון הוויזואלי לכל תמונה. הבחירות ישמשו לבניית הפרומפט אוטומטית.'
          ),
          projectName && h('div', { className: 'wz-side-helper' },
            `המיזם: ${projectName}${solution ? ` — ${solution.slice(0, 50)}` : ''}`
          ),
          h('div', { className: 'wz-side-helper', style: { marginTop: 6 } },
            'שלב 2 מתוך 4 — מוצר פיזי'
          )
        ),
        h('div', { className: 'wz-form-side-nav' },
          h('button', { className: 'wz-btn wz-btn-ghost', onClick: onBack }, '‹ חזרה'),
          h('button', { className: 'wz-btn wz-btn-primary', onClick: onNext }, 'הבא ›')
        )
      ),

      h('div', { className: 'wz-form-fields' },
        h(PhysicalImageSection, {
          title: 'תמונה ראשית — הצגת המוצר',
          fields: MAIN_IMAGE_FIELDS,
          promptAnswers, onPromptChange
        }),
        h('div', { className: 'ph-section-divider' }),
        h(PhysicalImageSection, {
          title: 'תמונת שימוש — המוצר בפעולה',
          fields: USAGE_IMAGE_FIELDS,
          promptAnswers, onPromptChange
        })
      )
    )
  );
}

// ════════════════════════════════════════════════════════════
//  PhysicalStep3 — תמונות (פרומפטים + העלאה)
// ════════════════════════════════════════════════════════════

export function PhysicalStep3({
  contentValues, promptAnswers, posterSize,
  slotImages, onSlotUpload, onSlotClear,
  onNext, onBack
}) {
  const { useState: useLocalState } = React;
  const [copied, setCopied] = useLocalState(null);

  const { mainPrompt, usagePrompt } = buildPhysicalPrompts(contentValues, promptAnswers, posterSize);
  const slots = getVisualSlots(posterSize || 'A4', 'physical');

  const copyText = (text, id) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
      });
    }
  };

  const copyBoth = () => copyText(`תמונה ראשית:\n${mainPrompt}\n\n---\n\nתמונת שימוש:\n${usagePrompt}`, 'both');

  const PromptBlock = ({ id, title, text }) =>
    h('div', { className: 'ph-prompt-block' },
      h('div', { className: 'ph-prompt-block-head' },
        h('div', { className: 'ph-prompt-block-title' }, title),
        h('button', {
          className: `wz-btn wz-btn-ghost ph-copy-btn ${copied === id ? 'ph-copy-btn-done' : ''}`,
          onClick: () => copyText(text, id)
        }, copied === id ? '✓ הועתק' : 'העתק פרומפט')
      ),
      h('pre', { className: 'ph-prompt-text' }, text)
    );

  return h('div', { className: 'wz-screen wz-screen-form' },
    h(PhysicalStepIndicator, { current: 3 }),

    h('div', { className: 'wz-form-layout' },

      h('aside', { className: 'wz-form-sidebar' },
        h('div', { className: 'wz-form-side-text' },
          h('h2', { className: 'wz-title wz-title-sm' }, 'תמונות'),
          h('p', { className: 'wz-subtitle wz-subtitle-sm' },
            'העתיקי את הפרומפטים, צרי תמונות בכלי AI, ואז העלי אותן כאן לפני שתמשיכי לפוסטר.'
          ),
          h('div', { className: 'wz-side-helper', style: { marginTop: 6 } },
            'שלב 3 מתוך 4 — מוצר פיזי'
          )
        ),

        h('div', { className: 'ph-slot-upload-sidebar' },
          h('div', { className: 'ph-slot-upload-title' }, 'העלאת תמונות לפוסטר'),
          h(SlotUploadSection, { slots, slotImages, onSlotUpload, onSlotClear })
        ),

        h('div', { className: 'wz-form-side-nav' },
          h('button', { className: 'wz-btn wz-btn-ghost', onClick: onBack }, '‹ חזרה'),
          h('button', { className: 'wz-btn wz-btn-primary', onClick: onNext }, 'לפוסטר ›')
        )
      ),

      h('div', { className: 'wz-form-fields' },
        h('div', { className: 'ph-prompts-head' },
          h('div', { className: 'ph-prompts-head-text' },
            h('div', { className: 'ph-prompts-head-title' }, 'פרומפטים מוכנים ליצירת תמונה'),
            h('div', { className: 'ph-prompts-head-sub' },
              'העתיקי כל פרומפט לכלי AI כמו Midjourney, DALL·E או Firefly.'
            )
          ),
          h('button', {
            className: `wz-btn wz-btn-ghost ${copied === 'both' ? 'ph-copy-btn-done' : ''}`,
            onClick: copyBoth
          }, copied === 'both' ? '✓ הועתק' : 'העתק שניהם')
        ),

        h(PromptBlock, { id: 'main',  title: 'תמונה ראשית — הצגת המוצר', text: mainPrompt }),
        h(PromptBlock, { id: 'usage', title: 'תמונת שימוש — המוצר בפעולה', text: usagePrompt })
      )
    )
  );
}

export function WizardStep5({ onExportPdf, onBack }) {
  return h('div', { className: 'wz-screen wz5-screen' },
    h(StepIndicator, { current: 5 }),

    h('div', { className: 'wz-content wz5-content' },
      h('div', { className: 'wz-hero' },
        h('h1', { className: 'wz-title' }, 'הפוסטר שלכן מוכן!'),
        h('p',  { className: 'wz-subtitle' }, 'שמרו את הפוסטר ועברו לשלב ההצגה')
      ),

      h('div', { className: 'wz5-actions' },
        h('button', {
          className: 'wz5-btn wz5-btn-pdf',
          onClick: onExportPdf
        },
          h('span', { className: 'wz5-btn-icon' }, '⬇'),
          h('span', null, 'שמירה כ-PDF')
        ),

        h('a', {
          className: 'wz5-btn wz5-btn-present',
          href: 'https://portzot-derech.org/final/final.html',
          target: '_blank',
          rel: 'noopener noreferrer'
        },
          h('span', { className: 'wz5-btn-icon' }, '▶'),
          h('span', null, 'מציגות ומשכנעות')
        )
      ),

      h('button', {
        className: 'wz5-back',
        onClick: onBack
      }, '‹ חזרה לעריכה')
    )
  );
}
