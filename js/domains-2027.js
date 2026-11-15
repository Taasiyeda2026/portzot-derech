/* Shared article reader. Content remains in static HTML in both languages. */
(() => {
  'use strict';

  // The chapter bar belongs to the sticky header, not the article content.
  // Highlight the currently visible section; the domain index is an exit link.
  const chapterNav = document.querySelector('.chapter-nav');
  const masthead = document.querySelector('.masthead');
  if (chapterNav && masthead) {
    const bar = masthead.querySelector('.bar');
    const tools = bar?.querySelector('.tools');
    if (tools) bar.insertBefore(chapterNav, tools);
    const sections = ['main-article', 'closeup', 'thoughts'].map(id => ({
      element: document.getElementById(id),
      link: chapterNav.querySelector('a[href="#' + id + '"]')
    })).filter(item => item.element && item.link);
    let framePending = false;
    const headerOffset = () => Math.ceil(masthead.getBoundingClientRect().height) + 12;
    function highlightSection() {
      framePending = false;
      if (!sections.length) return;
      let current = sections[0];
      const threshold = headerOffset() + 28;
      for (const section of sections) {
        if (section.element.getBoundingClientRect().top <= threshold) current = section;
      }
      const root = document.documentElement;
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= root.scrollHeight - 4) current = sections[sections.length - 1];
      for (const section of sections) {
        if (section === current) section.link.setAttribute('aria-current', 'location');
        else section.link.removeAttribute('aria-current');
      }
    }
    function scheduleHighlight() {
      if (!framePending) {
        framePending = true;
        requestAnimationFrame(highlightSection);
      }
    }
    function updateOffset() {
      document.documentElement.style.scrollPaddingTop = headerOffset() + 'px';
      scheduleHighlight();
    }
    window.addEventListener('scroll', scheduleHighlight, {passive:true});
    window.addEventListener('resize', updateOffset);
    window.addEventListener('hashchange', scheduleHighlight);
    if ('ResizeObserver' in window) new ResizeObserver(updateOffset).observe(masthead);
    updateOffset();
    highlightSection();
  }

  const dialogs = [...document.querySelectorAll('dialog[data-article]')];
  let active = null;
  let returnFocus = null;
  let initialHash = '';
  const byId = id => dialogs.find(dialog => dialog.id === id);
  function setHash(hash) {
    const url = new URL(location.href);
    url.hash = hash;
    history.replaceState(history.state, '', url);
  }
  function open(dialog, trigger, fromHash = false) {
    if (!dialog) return;
    if (!active) {
      returnFocus = trigger || document.querySelector(`[aria-controls="${dialog.id}"]`);
      initialHash = fromHash ? '' : location.hash;
    }
    if (active && active !== dialog) {
      const old = active;
      active = dialog;
      old.close();
    } else active = dialog;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('reader-open');
    dialog.scrollTop = 0;
    dialog.querySelector('[data-close]').focus({preventScroll:true});
    setHash(dialog.id);
  }
  function close() {
    if (active) active.close();
  }
  document.querySelectorAll('[data-open-article]').forEach(button => {
    button.addEventListener('click', () => open(byId(button.dataset.openArticle), button));
  });
  dialogs.forEach((dialog, index) => {
    dialog.querySelector('[data-close]').addEventListener('click', close);
    dialog.querySelector('[data-prev]').addEventListener('click', () => open(dialogs[index-1]));
    dialog.querySelector('[data-next]').addEventListener('click', () => open(dialogs[index+1]));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    dialog.addEventListener('close', () => {
      // A close event from the previous article must not close its successor.
      if (active !== dialog || dialog.open) return;
      active = null;
      document.body.classList.remove('reader-open');
      setHash(initialHash);
      returnFocus?.focus({preventScroll:true});
    });
  });
  function readHash() {
    const dialog = byId(location.hash.slice(1));
    if (dialog) open(dialog, null, true);
    else if (active) close();
  }
  window.addEventListener('hashchange', readHash);
  readHash();
  if ('serviceWorker' in navigator) {
    const root = new URL('../', document.currentScript.src);
    window.addEventListener('load', () => navigator.serviceWorker.register(new URL('service-worker.js', root), {updateViaCache:'none'}).catch(() => {}));
  }
})();
