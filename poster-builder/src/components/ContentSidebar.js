const h = React.createElement;

export function ContentSidebar({ isOpen, fields, onToggle, onChange }) {
  return h(
    'aside',
    { className: `content-sidebar ${isOpen ? 'open' : 'closed'}` },
    h(
      'button',
      {
        className: 'content-toggle',
        onClick: onToggle,
        type: 'button',
        'aria-expanded': isOpen
      },
      isOpen ? 'סגירה ←' : 'שאלות הפוסטר'
    ),
    isOpen &&
      h(
        'div',
        { className: 'content-sidebar-inner' },
        h('h3', { className: 'content-sidebar-title' }, 'שאלות הפוסטר'),
        h(
          'div',
          { className: 'content-fields' },
          fields.length
            ? fields.map((field) =>
                h(
                  'label',
                  { key: field.id, className: 'content-field' },
                  h('span', { className: 'content-field-label' }, field.label),
                  h('textarea', {
                    className: 'content-field-input',
                    rows: 3,
                    value: field.value,
                    onChange: (event) => onChange(field.id, event.target.value)
                  })
                )
              )
            : h('div', { className: 'content-empty' }, 'עדיין אין שדות טקסט בפוסטר.')
        )
      )
  );
}
