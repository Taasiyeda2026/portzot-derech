/**
 * Scroll Lock Mechanism for Domain Pages
 * - Locks scroll on page load, showing only hero section
 * - Unlocks when user clicks the "בואי נתחיל" button
 * - Relocks on page exit (via navigation)
 */

(function() {
  // Lock scroll on page load
  document.body.classList.add('scroll-locked');
  
  // Find the unlock button - look for buttons with text containing "בואי"
  const buttons = document.querySelectorAll('a.inline-flex');
  let unlockBtn = null;
  
  buttons.forEach(function(btn) {
    if (btn.textContent.includes('בואי') && btn.getAttribute('href') && btn.getAttribute('href').startsWith('#')) {
      unlockBtn = btn;
    }
  });
  
  if (unlockBtn) {
    const targetId = unlockBtn.getAttribute('href').substring(1);
    
    unlockBtn.addEventListener('click', function(e) {
      e.preventDefault();
      // Unlock scroll
      document.body.classList.remove('scroll-locked');
      document.body.classList.add('scroll-unlocked');
      // Scroll to the target section
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
})();
