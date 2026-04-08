const h = React.createElement;

export function ObjectToolbar({ selected, onDelete, onDuplicate, onFront, onBack, onLock, isLocked }) {
  if (!selected) return null;

  return h('div', { className: 'object-toolbar' },
    h('button', { className: 'btn btn-small', onClick: onDelete }, 'מחיקה'),
    h('button', { className: 'btn btn-small', onClick: onDuplicate }, 'שכפול'),
    h('button', { className: 'btn btn-small', onClick: onFront }, 'קדימה'),
    h('button', { className: 'btn btn-small', onClick: onBack }, 'אחורה'),
    h('button', { className: 'btn btn-small', onClick: onLock }, isLocked ? 'שחרור נעילה' : 'נעילה')
  );
}
