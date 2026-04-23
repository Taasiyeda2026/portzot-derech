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

const STEP_LABELS = ['עיצוב', 'סוג מוצר', 'תוכן', 'יצירה', 'סיום'];
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
  currentBackground, currentShape, titleFont, titleColor,
  onBackground, onShape, onTitleFont, onTitleColor, onNext
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
    h(StepIndicator, { current: 1 }),

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
      h('button', { className: 'wz-btn wz-btn-primary', onClick: onNext }, 'הבא ›')
    )
  );
}

export function WizardStep2({ productType, onProductTypeChange, onNext, onBack }) {
  const { useState: useLocalState } = React;
  const [selecting, setSelecting] = useLocalState(null);

  const cards = [
    { id: 'physical', emoji: '📦', label: 'מוצר פיזי',      desc: 'מוצר שניתן לגעת בו, לייצר ולמכור' },
    { id: 'website',  emoji: '🌐', label: 'אתר אינטרנט',    desc: 'פלטפורמה דיגיטלית נגישה בדפדפן'   },
    { id: 'app',      emoji: '📱', label: 'אפליקציה',        desc: 'אפליקציה לטלפון חכם'               }
  ];

  const handleCardClick = (id) => {
    setSelecting(id);
    onProductTypeChange(id);
    setTimeout(onNext, 380);
  };

  return h('div', { className: 'wz-screen wz-screen-centered' },
    h(StepIndicator, { current: 2 }),

    h('div', { className: 'wz-content wz-content-vcenter' },
      h('div', { className: 'wz-hero' },
        h('h1', { className: 'wz-title' }, 'מה פיתחתן?'),
        h('p', { className: 'wz-subtitle' }, 'לחצו על סוג המוצר שיצרתן — תעברו מיד לשלב הבא')
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
    ),

    h('div', { className: 'wz-nav' },
      h('button', { className: 'wz-btn wz-btn-ghost', onClick: onBack }, '‹ חזרה')
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
