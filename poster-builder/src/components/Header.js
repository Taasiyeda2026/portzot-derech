import { POSTER_SIZES } from '../data/config.js';

const h = React.createElement;

const HEADER_ACTIONS = [
  { id: 'backgrounds', label: 'רקעים' },
  { id: 'elements', label: 'סמלים' }
];

export function Header({ posterSize, onSizeChange, onNew, onReset, onExportPdf, activePanel, onPanelToggle }) {
  return h('header', { className: 'header' },
    h('div', { className: 'header-title' }, 'בונות פוסטר חקר'),
    h('div', { className: 'header-actions' },
      h('select', {
        className: 'header-control',
        value: posterSize,
        onChange: (e) => onSizeChange(e.target.value)
      },
      Object.entries(POSTER_SIZES).map(([key, size]) =>
        h('option', { key, value: key }, size.label)
      )),
      HEADER_ACTIONS.map((action) =>
        h('button', {
          key: action.id,
          className: `header-control header-btn ${activePanel === action.id ? 'is-active' : ''}`,
          onClick: () => onPanelToggle(action.id)
        }, action.label)
      ),
      h('button', { className: 'header-control header-btn', onClick: onNew }, 'חדש'),
      h('button', { className: 'header-control header-btn', onClick: onReset }, 'איפוס'),
      h('button', { className: 'header-control header-btn header-btn-primary', onClick: onExportPdf }, 'ייצוא PDF')
    )
  );
}
