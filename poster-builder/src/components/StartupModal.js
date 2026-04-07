const h = React.createElement;

export function StartupModal({ hasSaved, onResume, onStart }) {
  return h('div', { className: 'overlay' },
    h('div', { className: 'modal' },
      hasSaved
        ? h('div', null,
          h('h2', null, 'נמצאה עבודה קודמת. האם להמשיך ממנה?'),
          h('div', { className: 'modal-actions' },
            h('button', { className: 'btn btn-primary', onClick: onResume }, 'המשך'),
            h('button', { className: 'btn', onClick: () => onStart(null) }, 'התחל חדש')
          ))
        : h('div', null,
          h('h2', null, 'איך תרצי להתחיל?'),
          h('div', { className: 'modal-actions' },
            h('button', { className: 'btn btn-primary', onClick: () => onStart('template') }, 'תבנית פוסטר חקר'),
            h('button', { className: 'btn', onClick: () => onStart('blank') }, 'פוסטר ריק')
          ))
    )
  );
}
