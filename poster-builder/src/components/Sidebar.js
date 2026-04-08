import { FIELD_DEFINITIONS } from '../data/config.js';

const h = React.createElement;

function getStatus(count, maxChars) {
  const ratio = count / maxChars;
  if (ratio > 1) return { cls: 'overflow', label: 'חורג' };
  if (ratio >= 0.9) return { cls: 'near-limit', label: 'כמעט מלא' };
  return { cls: 'ok', label: 'תקין' };
}

export function Sidebar({ contentValues, onContentChange }) {
  return h('aside', { className: 'sidebar' },
    h('h2', { className: 'poster-content-title' }, 'שאלות הפוסטר'),
    h('div', { className: 'poster-content-panel' },
      FIELD_DEFINITIONS.map((field) => {
        const value = contentValues[field.id] || '';
        const count = value.length;
        const status = getStatus(count, field.maxChars);

        return h('label', { key: field.id, className: 'poster-field' },
          h('span', { className: 'poster-field-question' }, field.question),
          h('textarea', {
            className: 'poster-field-input',
            rows: 3,
            value,
            onChange: (event) => onContentChange(field.id, event.target.value)
          }),
          h('div', { className: 'poster-field-meta' },
            h('span', { className: `poster-field-status ${status.cls}` }, status.label),
            h('span', { className: `poster-field-counter ${status.cls}` }, `${count}/${field.maxChars}`)
          )
        );
      })
    )
  );
}
