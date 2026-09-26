/**
 * Scroll Lock Mechanism for Domain Pages
 * - On load the page shows only the hero (body.scroll-locked hides #locked-content)
 * - The hero CTA marked with [data-unlock-content] releases the page and
 *   smooth-scrolls to its target chapter
 * - Chapter links in the header (or any in-page link into the locked content)
 *   also release the page, so anchor navigation always works
 * - Legacy fallback: an a.inline-flex link containing "בואי"
 */

(function() {
  var body = document.body;
  body.classList.add('scroll-locked');

  function findUnlockButton() {
    var explicit = document.querySelector('a[data-unlock-content][href^="#"]');
    if (explicit) return explicit;
    var legacy = null;
    document.querySelectorAll('a.inline-flex').forEach(function(btn) {
      var href = btn.getAttribute('href');
      if (btn.textContent.indexOf('בואי') !== -1 && href && href.charAt(0) === '#') {
        legacy = btn;
      }
    });
    return legacy;
  }

  function unlock() {
    body.classList.remove('scroll-locked');
    body.classList.add('scroll-unlocked');
  }

  function unlockAndScroll(targetId) {
    unlock();
    var target = document.getElementById(targetId);
    if (!target) return;

    // Wait for the previously hidden article area and chapter nav to take
    // their final dimensions before calculating the anchor position.
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        var header = document.querySelector('.master-header');
        var headerHeight = header ? header.getBoundingClientRect().height : 0;
        var top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 18;

        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

        if (history.replaceState) {
          history.replaceState(null, '', '#' + targetId);
        }
      });
    });
  }

  var unlockBtn = findUnlockButton();
  var locked = document.getElementById('locked-content');

  if (unlockBtn) {
    unlockBtn.addEventListener('click', function(e) {
      e.preventDefault();
      unlockAndScroll(unlockBtn.getAttribute('href').substring(1));
    });
  }

  // In-page links whose target lives inside the locked content
  document.addEventListener('click', function(e) {
    if (!body.classList.contains('scroll-locked')) return;
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link || link === unlockBtn || !locked) return;
    var id = link.getAttribute('href').substring(1);
    var target = id && document.getElementById(id);
    if (target && locked.contains(target)) {
      e.preventDefault();
      unlockAndScroll(id);
    }
  });

  // Direct visit with a chapter hash (e.g. d1.html#hunger)
  if (location.hash && locked) {
    var initial = document.getElementById(location.hash.substring(1));
    if (initial && locked.contains(initial)) {
      unlock();
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          var header = document.querySelector('.master-header');
          var headerHeight = header ? header.getBoundingClientRect().height : 0;
          var top = initial.getBoundingClientRect().top + window.pageYOffset - headerHeight - 18;
          window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
        });
      });
    }
  }
})();
