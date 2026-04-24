const h = React.createElement;

function AppScaffold() {
  return h('div', { className: 'wz-overlay' },
    h('div', { className: 'wz-screen wz-screen-centered' },
      h('div', { className: 'wz-content wz-content-vcenter' },
        h('h1', { className: 'wz-title' }, 'אפליקציה'),
        h('p', { className: 'wz-subtitle' }, 'עמוד זה הוכן כ-scaffold. הלוגיקה הייעודית עדיין לא הועברה.')
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(AppScaffold));
