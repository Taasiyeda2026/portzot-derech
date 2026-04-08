import { BACKGROUNDS, ELEMENTS, getPosterOrientation } from '../data/config.js';

const h = React.createElement;

export function ActionPanel({ activePanel, posterSize, onClose, onBackground, onElement }) {
  if (!activePanel) return h('aside', { className: 'action-panel empty' });

  const orientation = getPosterOrientation(posterSize);
  const visibleBackgrounds = BACKGROUNDS.filter((bg) => bg.orientation === 'any' || bg.orientation === orientation);

  return h('aside', { className: 'action-panel open' },
    h('div', { className: 'action-panel-header' },
      h('h3', null, activePanel === 'backgrounds' ? 'בחירת רקע' : 'בחירת סמלים'),
      h('button', { className: 'header-control header-btn', onClick: onClose }, 'סגירה')
    ),
    h('div', { className: 'panel-scroll' },
      activePanel === 'backgrounds' && h('div', { className: 'grid grid-2' },
        visibleBackgrounds.map((bg) => h('button', {
          key: bg.id,
          className: 'thumb-btn',
          onClick: () => onBackground(bg.path)
        }, bg.path
          ? h('img', { src: bg.path, alt: bg.name, className: 'thumb' })
          : h('span', { className: 'none-bg' }, 'ללא רקע')))
      ),
      activePanel === 'elements' && h('div', { className: 'grid grid-3' },
        ELEMENTS.map((element) => h('button', {
          key: element.id,
          className: 'icon-btn',
          onClick: () => onElement(element.path)
        }, h('img', { src: element.path, alt: element.name, className: 'icon' })))
      )
    )
  );
}
