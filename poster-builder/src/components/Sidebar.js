import { BACKGROUNDS, PALETTES, FONT_OPTIONS, TEXT_PRESETS, ELEMENTS, CONTENT_BOXES } from '../data/config.js';

const { h } = React;

const TABS = [
  { id: 'backgrounds', label: 'רקעים' },
  { id: 'colors', label: 'צבעים' },
  { id: 'fonts', label: 'פונטים' },
  { id: 'texts', label: 'טקסטים' },
  { id: 'elements', label: 'אלמנטים' }
];

export function Sidebar({ activeTab, setActiveTab, onBackground, onColor, onFont, onText, onElement, onBox }) {
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
        BACKGROUNDS.map((bg) => h('button', {
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
      activeTab === 'texts' && h('div', { className: 'list' },
        TEXT_PRESETS.map((item) => h('button', { key: item.id, className: 'list-item', onClick: () => onText(item.id) }, item.label)),
        h('div', { className: 'list-title' }, 'תיבות תוכן מוכנות'),
        CONTENT_BOXES.map((item) => h('button', { key: item.id, className: 'list-item', onClick: () => onBox(item.id) }, item.label))
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
