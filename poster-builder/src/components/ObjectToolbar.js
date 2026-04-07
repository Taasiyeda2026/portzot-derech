const { h } = React;

export function ObjectToolbar({
  selected,
  onDelete,
  onDuplicate,
  onFront,
  onBack,
  onLock,
  isLocked,
  onAlign,
  onFontSize
}) {
  if (!selected) return null;

  return h('div', { className: 'object-toolbar' },
    h('button', { className: 'btn btn-small', onClick: onDelete }, 'מחיקה'),
    h('button', { className: 'btn btn-small', onClick: onDuplicate }, 'שכפול'),
    h('button', { className: 'btn btn-small', onClick: onFront }, 'קדימה'),
    h('button', { className: 'btn btn-small', onClick: onBack }, 'אחורה'),
    h('button', { className: 'btn btn-small', onClick: onLock }, isLocked ? 'שחרור נעילה' : 'נעילה'),
    h('button', { className: 'btn btn-small', onClick: () => onAlign('right') }, 'יישור ימין'),
    h('button', { className: 'btn btn-small', onClick: () => onAlign('center') }, 'מרכז'),
    h('button', { className: 'btn btn-small', onClick: () => onAlign('left') }, 'יישור שמאל'),
    h('button', { className: 'btn btn-small', onClick: () => onFontSize(4) }, 'A+'),
    h('button', { className: 'btn btn-small', onClick: () => onFontSize(-4) }, 'A-')
  );
}
