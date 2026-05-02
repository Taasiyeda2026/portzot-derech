import { renderHTMLPoster, exportHTMLPosterToPDF } from '../../canvas/html-poster.js';

const { useEffect } = React;
const h = React.createElement;

function PhysicalFlowFallback() {
  const contentValues = {};
  useEffect(() => {
    renderHTMLPoster(contentValues, 'physical', 'IBM Plex Sans Hebrew', '#5E2750', '', { visual_1: null, visual_2: null, visual_3: null });
  }, []);

  return h('div', { className: 'step4-wrapper', style: { display: 'flex' } },
    h('div', { className: 'step4-bar' },
      h('div', { className: 'step4-bar-start' }),
      h('div', { className: 'step4-bar-center' }, 'פוסטר מוצר פיזי'),
      h('div', { className: 'step4-bar-end' },
        h('button', { className: 'step4-export-btn', onClick: () => exportHTMLPosterToPDF(contentValues) }, 'ייצוא PDF')
      )
    ),
    h('div', { className: 'step4-body' },
      h('div', { className: 'html-poster-area' },
        h('div', { id: 'poster-html' }, h('div', { id: 'poster-bg' }))
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(PhysicalFlowFallback));
