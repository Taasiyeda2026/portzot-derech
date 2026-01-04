// Domain ratings storage
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

// Initialize on page load
// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Run only if rating elements exist on this page
    if (document.querySelector('.star')) {
        initializeStars();
        loadSavedData();
    }
});
    }
});
    loadSavedData();
});

// Initialize star rating functionality
function initializeStars() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const domain = this.getAttribute('data-domain');
            const rating = parseInt(this.getAttribute('data-rating'));
            
            domainRatings[domain] = rating;
            updateStars(domain, rating);
            updateSummary();
            
            this.style.transform = 'scale(1.4)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });

        star.addEventListener('mouseenter', function() {
            const domain = this.getAttribute('data-domain');
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(domain, rating);
        });
    });
    
    document.querySelectorAll('.rating').forEach(ratingDiv => {
        ratingDiv.addEventListener('mouseleave', function() {
            const domain = this.querySelector('.star').getAttribute('data-domain');
            updateStars(domain, domainRatings[domain]);
        });
    });
}

function highlightStars(domain, rating) {
    const stars = document.querySelectorAll(`.star[data-domain="${domain}"]`);
    stars.forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
    });
}

function updateStars(domain, rating) {
    const stars = document.querySelectorAll(`.star[data-domain="${domain}"]`);
    stars.forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
        star.classList.toggle('active', index < rating);
    });
}

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
    } catch(e) {
        console.error(e);
    }
}
