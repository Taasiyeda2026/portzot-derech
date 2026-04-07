const h = React.createElement;

export function Header({ posterSize, onSizeChange, onNew, onSave, onReset, onExportPng, onExportPdf }) {
  return h('header', { className: 'header' },
    h('div', { className: 'header-title' }, 'בונה פוסטר חקר'),
    h('div', { className: 'header-actions' },
      h('select', {
        className: 'select',
        value: posterSize,
        onChange: (e) => onSizeChange(e.target.value)
      },
      h('option', { value: 'A4' }, 'A4 לאורך'),
      h('option', { value: 'A3' }, 'A3 לאורך')),
      h('button', { className: 'btn', onClick: onNew }, 'חדש'),
      h('button', { className: 'btn', onClick: onSave }, 'שמור'),
      h('button', { className: 'btn', onClick: onReset }, 'איפוס'),
      h('button', { className: 'btn btn-primary', onClick: onExportPng }, 'ייצוא PNG'),
      h('button', { className: 'btn btn-primary', onClick: onExportPdf }, 'ייצוא PDF')
    )
  );
}
