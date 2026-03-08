(function(){
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if(navToggle && nav){
    navToggle.addEventListener('click', ()=>{
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Mark current page link
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.main-nav a').forEach(a=>{
    const href = (a.getAttribute('href')||'').toLowerCase();
    if(href === path){
      a.setAttribute('aria-current','page');
    }
  });
})();