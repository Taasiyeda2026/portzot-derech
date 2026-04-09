import { FIELD_DEFINITIONS, AVAILABLE_FONTS, PRODUCT_TYPES, DYNAMIC_QUESTIONS, VISUAL_ZONE_TITLE, getListRowIds, getVisualSlots, PARTICIPANTS_SUB_KEYS } from '../data/config.js';

const h = React.createElement;
const { useState } = React;

function CharCounter({ count, max }) {
  const cls = count >= max ? 'overflow' : count >= max * 0.9 ? 'near-limit' : 'ok';
  return h('span', { className: `poster-field-counter ${cls}` }, `${count}/${max}`);
}

function FontColorControls({ fieldId, setting, onSettingChange }) {
  return h('div', { className: 'poster-field-controls' },
    h('select', {
      className: 'poster-field-font-select',
      value: setting.fontFamily || 'IBM Plex Sans Hebrew',
      onChange: (e) => onSettingChange(fieldId, { ...setting, fontFamily: e.target.value })
    },
      AVAILABLE_FONTS.map((f) => h('option', { key: f.value, value: f.value }, f.label))
    ),
    h('div', { className: 'poster-field-color-wrap' },
      h('span', { className: 'poster-field-color-label' }, 'צבע'),
      h('input', {
        type: 'color',
        className: 'poster-field-color',
        value: setting.color || '#1f2937',
        onChange: (e) => onSettingChange(fieldId, { ...setting, color: e.target.value })
      })
    )
  );
}

function RegularField({ field, value, setting, onContentChange, onSettingChange }) {
  const count = (value || '').length;
  const max   = field.maxChars;
  const cls   = count >= max ? 'overflow' : count >= max * 0.9 ? 'near-limit' : 'ok';

  return h('div', { className: 'poster-field' },
    h('span', { className: 'poster-field-question' }, field.question),
    h('textarea', {
      className: `poster-field-input ${cls}`,
      rows: 3,
      maxLength: max,
      value: value || '',
      onChange: (e) => {
        const v = e.target.value.slice(0, max);
        onContentChange(field.id, v);
      }
    }),
    h(FontColorControls, { fieldId: field.id, setting, onSettingChange }),
    h('div', { className: 'poster-field-meta' },
      h('span', { className: `poster-field-status ${cls}` }, count >= max ? 'מלא' : cls === 'near-limit' ? 'כמעט מלא' : 'תקין'),
      h(CharCounter, { count, max })
    )
  );
}

function ListField({ field, values, setting, onContentChange, onSettingChange }) {
  const rowIds = getListRowIds(field.id);
  const maxRow = field.maxCharsPerRow || 45;

  return h('div', { className: 'poster-field' },
    h('span', { className: 'poster-field-question' }, field.question),
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
            onChange: (e) => {
              const v = e.target.value.slice(0, maxRow);
              onContentChange(rowId, v);
            }
          }),
          h(CharCounter, { count, max: maxRow })
        );
      })
    ),
    h(FontColorControls, { fieldId: field.id, setting, onSettingChange }),
  );
}

function SlotUploadSection({ slots, slotImages, onSlotUpload, onSlotClear }) {
  return h('div', { className: 'slot-upload-section' },
    slots.map((slot) => {
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
                type: 'file',
                accept: 'image/*',
                style: { display: 'none' },
                onChange: (e) => {
                  const file = e.target.files?.[0];
                  if (file) onSlotUpload(slot.key, file);
                  e.target.value = '';
                }
              }),
              '+ העלאה'
            )
      );
    })
  );
}

function ParticipantsField({ field, values, setting, onContentChange, onSettingChange }) {
  const maxStudents = 80;
  const maxClass    = 20;
  const maxSchool   = 40;

  const rows = [
    { key: 'students',   label: 'שמות התלמידות:',  max: maxStudents, placeholder: 'נועה קירל, מאיה בוסקילה ואנה זאק' },
    { key: 'className',  label: 'כיתה:',             max: maxClass,    placeholder: "ט'5" },
    { key: 'schoolName', label: 'שם בית הספר:',      max: maxSchool,   placeholder: 'רבין מודיעין' }
  ];

  return h('div', { className: 'poster-field participants-field' },
    h('span', { className: 'poster-field-question' }, field.question),
    h('div', { className: 'participants-inputs' },
      rows.map((row) => {
        const val   = values[row.key] || '';
        const count = val.length;
        const cls   = count >= row.max ? 'overflow' : count >= row.max * 0.9 ? 'near-limit' : 'ok';
        return h('div', { key: row.key, className: 'participants-row' },
          h('label', { className: 'participants-label' }, row.label),
          h('div', { className: 'participants-input-wrap' },
            h('input', {
              type: 'text',
              className: `list-row-input ${cls}`,
              maxLength: row.max,
              placeholder: row.placeholder,
              value: val,
              onChange: (e) => onContentChange(row.key, e.target.value.slice(0, row.max))
            }),
            h(CharCounter, { count, max: row.max })
          )
        );
      })
    ),
    h(FontColorControls, { fieldId: field.id, setting, onSettingChange })
  );
}

export function Sidebar({
  productType,
  onProductTypeChange,
  contentValues,
  fieldSettings,
  slotImages,
  onContentChange,
  onSettingChange,
  onSlotUpload,
  onSlotClear,
  posterSize
}) {
  const sizeKey = posterSize || 'A4';
  const slots   = getVisualSlots(sizeKey, productType);

  const getFieldQuestion = (field) => {
    if (field.dynamic && DYNAMIC_QUESTIONS[field.dynamic]) {
      const dq = DYNAMIC_QUESTIONS[field.dynamic][productType] || DYNAMIC_QUESTIONS[field.dynamic].none;
      return { ...field, question: dq.question };
    }
    return field;
  };

  return h('aside', { className: 'sidebar' },
    h('h2', { className: 'poster-content-title' }, 'שאלות הפוסטר'),

    h('div', { className: 'product-type-selector' },
      h('p', { className: 'product-type-label' }, 'סוג התוצר:'),
      h('div', { className: 'product-type-buttons' },
        PRODUCT_TYPES.map((pt) =>
          h('button', {
            key: pt.id,
            className: `product-type-btn ${productType === pt.id ? 'active' : ''}`,
            onClick: () => onProductTypeChange(pt.id)
          }, pt.label)
        )
      )
    ),

    h('div', { className: 'poster-content-panel' },
      h('div', { className: 'zone-image-section' },
        h('span', { className: 'zone-image-section-title' }, VISUAL_ZONE_TITLE[productType] || 'אזור חזותי'),
        h(SlotUploadSection, { slots, slotImages, onSlotUpload, onSlotClear })
      ),
      FIELD_DEFINITIONS.map((field) => {
        const resolvedField = getFieldQuestion(field);
        const setting = fieldSettings[field.id] || {};

        if (field.type === 'participants') {
          return h(ParticipantsField, {
            key:            field.id,
            field:          resolvedField,
            values:         contentValues,
            setting,
            onContentChange,
            onSettingChange
          });
        }

        if (field.type === 'list') {
          return h(ListField, {
            key:             field.id,
            field:           resolvedField,
            values:          contentValues,
            setting,
            onContentChange,
            onSettingChange
          });
        }

        return h(RegularField, {
          key:            field.id,
          field:          resolvedField,
          value:          contentValues[field.id] || '',
          setting,
          onContentChange,
          onSettingChange
        });
      })
    )
  );
}
