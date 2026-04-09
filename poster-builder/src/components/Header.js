import { POSTER_SIZES } from '../data/config.js';

const h = React.createElement;

export function Header({ posterSize, onSizeChange, onNew, onSave, onReset, onExportPdf }) {
  return h('header', { className: 'header' },
    h('div', { className: 'header-logo' },
      h('div', { className: 'header-logo-mark' }, '✦'),
      h('div', { className: 'header-title' }, 'בונות פוסטר חקר')
    ),
    h('div', { className: 'header-actions' },
      h('select', {
        className: 'select',
        value: posterSize,
        onChange: (e) => onSizeChange(e.target.value)
      },
      Object.entries(POSTER_SIZES).map(([key, size]) =>
        h('option', { key, value: key }, size.label)
      )),
      h('button', { className: 'btn', onClick: onNew }, 'חדש'),
      h('button', { className: 'btn', onClick: onSave }, 'שמור'),
      h('button', { className: 'btn', onClick: onReset }, 'איפוס'),
      h('button', { className: 'btn btn-primary', onClick: onExportPdf }, 'ייצוא PDF')
    )
  );
}
