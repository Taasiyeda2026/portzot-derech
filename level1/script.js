// ===============================
// Script.js – תקין, נקי ומאוחד
// פורצות דרך
// ===============================

// ===== Scroll lock for Hero =====
document.addEventListener('DOMContentLoaded', () => {
  const heroBtn = document.querySelector('.hero-btn');
  const introSection = document.querySelector('#intro');

  // נועל גלילה בכניסה לעמוד הראשי
  // נועל גלילה רק אם קיים Hero (עמוד כניסה)
  if (document.querySelector('.hero')) {
    document.body.classList.add('locked');
  }

  if (heroBtn && introSection) {
    heroBtn.addEventListener('click', (e) => {
      e.preventDefault();

      // שחרור גלילה
      document.body.classList.remove('locked');

      // גלילה חלקה לתוכן
      introSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  // הפעלת מערכת דירוג רק אם קיימת בעמוד
  if (document.querySelector('.star')) {
    initializeStars();
    loadSavedData();
  }
});

// ===============================
// Domain ratings storage
// ===============================
let domainRatings = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0
};

const domainNames = {
  1: 'הייטק ליבה – תשתיות, פיתוח ומערכות מורכבות',
  2: 'העצמי והחוסן בעידן טכנולוגי',
  3: 'סביבה, קיימות וטכנולוגיה',
  4: 'חברה, קהילה והשפעה דיגיטלית',
  5: 'עתיד, יזמות וטכנולוגיה'
};

// ===============================
// Star rating logic
// ===============================
function initializeStars() {
  const stars = document.querySelectorAll('.star');

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const domain = star.dataset.domain;
      const rating = parseInt(star.dataset.rating);

      domainRatings[domain] = rating;
      updateStars(domain, rating);
      updateSummary();

      star.style.transform = 'scale(1.4)';
      setTimeout(() => star.style.transform = 'scale(1)', 200);
    });

    star.addEventListener('mouseenter', () => {
      highlightStars(star.dataset.domain, parseInt(star.dataset.rating));
    });
  });

  document.querySelectorAll('.rating').forEach(group => {
    group.addEventListener('mouseleave', () => {
      const domain = group.querySelector('.star').dataset.domain;
      updateStars(domain, domainRatings[domain]);
    });
  });
}

function highlightStars(domain, rating) {
  document.querySelectorAll(`.star[data-domain="${domain}"]`)
    .forEach((star, i) => star.textContent = i < rating ? '★' : '☆');
}

function updateStars(domain, rating) {
  document.querySelectorAll(`.star[data-domain="${domain}"]`)
    .forEach((star, i) => {
      star.textContent = i < rating ? '★' : '☆';
      star.classList.toggle('active', i < rating);
    });
}

// ===============================
// Summary
// ===============================
function updateSummary() {
  const summaryBox = document.getElementById('summaryBox');
  if (!summaryBox) return;

  const rated = Object.entries(domainRatings).filter(([_, r]) => r > 0);
  if (!rated.length) {
    summaryBox.innerHTML = '<p class="empty-state">עדיין לא דירגתן אף תחום ⭐</p>';
    return;
  }

  rated.sort((a, b) => b[1] - a[1]);

  summaryBox.innerHTML = rated.map(([id, rating]) => `
    <div class="domain-summary">
      <h4>${domainNames[id]}</h4>
      <div>${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
    </div>
  `).join('');
}

// ===============================
// Storage
// ===============================
function saveSelection() {
  const notes = document.getElementById('personalNotes')?.value || '';

  localStorage.setItem('potzotDerechSelection', JSON.stringify({
    ratings: domainRatings,
    notes,
    timestamp: new Date().toISOString()
  }));

  alert('✔ הבחירה נשמרה בהצלחה');
}

function loadSavedData() {
  const saved = localStorage.getItem('potzotDerechSelection');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    domainRatings = data.ratings || domainRatings;
    Object.entries(domainRatings).forEach(([d, r]) => updateStars(d, r));
    updateSummary();
  } catch (e) {
    console.error(e);
  }
}
