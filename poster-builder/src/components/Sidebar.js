import { BACKGROUNDS, PALETTES, FONT_OPTIONS, ELEMENTS, POSTER_FIELDS, getPosterOrientation } from '../data/config.js';

const h = React.createElement;

const TABS = [
  { id: 'backgrounds', label: 'רקעים' },
  { id: 'colors', label: 'צבעים' },
  { id: 'fonts', label: 'פונטים' },
  { id: 'texts', label: 'תוכן הפוסטר' },
  { id: 'elements', label: 'אלמנטים' }
];

export function Sidebar({ activeTab, setActiveTab, posterSize, onBackground, onColor, onFont, onElement, contentValues, onContentChange }) {
  const orientation = getPosterOrientation(posterSize);
  const visibleBackgrounds = BACKGROUNDS.filter((bg) => bg.orientation === 'any' || bg.orientation === orientation);

  return h('aside', { className: 'sidebar' },
    h('div', { className: 'tabs' }, TABS.map((tab) =>
      h('button', {
        key: tab.id,
        className: `tab ${activeTab === tab.id ? 'active' : ''}`,
        onClick: () => setActiveTab(tab.id)
      }, tab.label)
    )),
    h('div', { className: 'panel' },
      activeTab === 'backgrounds' && h('div', { className: 'grid grid-2' },
        visibleBackgrounds.map((bg) => h('button', {
          key: bg.id,
          className: 'thumb-btn',
          onClick: () => onBackground(bg.path)
        }, bg.path
          ? h('img', { src: bg.path, alt: bg.name, className: 'thumb' })
          : h('span', { className: 'none-bg' }, 'ללא רקע')))
      ),
      activeTab === 'colors' && h('div', { className: 'palette-wrap' },
        PALETTES.map((palette) => h('div', { key: palette.name, className: 'palette' },
          h('div', { className: 'palette-name' }, palette.name),
          h('div', { className: 'palette-colors' }, palette.colors.map((color) => h('button', {
            key: color,
            className: 'swatch',
            style: { backgroundColor: color },
            onClick: () => onColor(color)
          })))
        ))
      ),
      activeTab === 'fonts' && h('div', { className: 'list' },
        FONT_OPTIONS.map((font) => h('button', {
          key: font.id,
          className: 'list-item',
          style: { fontFamily: font.family, fontWeight: font.weight },
          onClick: () => onFont(font)
        }, font.label))
      ),
      activeTab === 'texts' && h('div', { className: 'poster-content-panel' },
        h('h3', { className: 'poster-content-title' }, 'שאלות הפוסטר'),
        POSTER_FIELDS.map((field) => {
          const value = contentValues[field.id] || '';
          const count = value.length;
          const ratio = count / field.maxChars;
          const statusClass = ratio > 1 ? 'overflow' : ratio >= 0.9 ? 'near-limit' : 'ok';
          return h('label', { key: field.id, className: 'poster-field' },
            h('span', { className: 'poster-field-question' }, field.question),
            h('textarea', {
              className: 'poster-field-input',
              rows: 3,
              value,
              maxLength: field.maxChars,
              onChange: (event) => onContentChange(field.id, event.target.value)
            }),
            h('span', { className: `poster-field-counter ${statusClass}` }, `${count}/${field.maxChars}`)
          );
        })
      ),
      activeTab === 'elements' && h('div', { className: 'grid grid-3' },
        ELEMENTS.map((element) => h('button', {
          key: element.id,
          className: 'icon-btn',
          onClick: () => onElement(element.path)
        }, h('img', { src: element.path, alt: element.name, className: 'icon' })))
      )
    )
  );
}
