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
document.addEventListener('DOMContentLoaded', function() {
    initializeStars();
    loadSavedData();
});

// Initialize star rating functionality
function initializeStars() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const domain = this.getAttribute('data-domain');
            const rating = parseInt(this.getAttribute('data-rating'));
            
            // Update rating
            domainRatings[domain] = rating;
            
            // Update visual state
            updateStars(domain, rating);
            
            // Update summary
            updateSummary();
            
            // Visual feedback
            this.style.transform = 'scale(1.5)';
            setTimeout(() => {
                this.style.transform = 'scale(1.2)';
            }, 200);
        });
        
        // Hover effect
        star.addEventListener('mouseenter', function() {
            const domain = this.getAttribute('data-domain');
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(domain, rating);
        });
    });
    
    // Reset hover effect when leaving rating area
    document.querySelectorAll('.rating').forEach(ratingDiv => {
        ratingDiv.addEventListener('mouseleave', function() {
            const domain = this.querySelector('.star').getAttribute('data-domain');
            const currentRating = domainRatings[domain];
            updateStars(domain, currentRating);
        });
    });
}

// Highlight stars on hover
function highlightStars(domain, rating) {
    const stars = document.querySelectorAll(`.star[data-domain="${domain}"]`);
    stars.forEach((star, index) => {
        if (index < rating) {
            star.textContent = '★';
            star.style.color = '#FFD700';
        } else {
            star.textContent = '☆';
            star.style.color = '#DDD';
        }
    });
}

// Update star display
function updateStars(domain, rating) {
    const stars = document.querySelectorAll(`.star[data-domain="${domain}"]`);
    stars.forEach((star, index) => {
        if (index < rating) {
            star.textContent = '★';
            star.classList.add('active');
        } else {
            star.textContent = '☆';
            star.classList.remove('active');
        }
    });
}

// Explore domain (placeholder for future expansion)
function exploreDomain(domainId) {
    alert(`חקירת תחום ${domainNames[domainId]}\n\nבקרוב יתווסף תוכן מפורט על תחום זה!`);
    
    // Scroll to rating section
    const domainCard = document.querySelector(`.domain-card[data-domain="${domainId}"]`);
    const ratingSection = domainCard.querySelector('.interest-level');
    ratingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Update summary box
function updateSummary() {
    const summaryBox = document.getElementById('summaryBox');
    
    // Check if any ratings exist
    const hasRatings = Object.values(domainRatings).some(rating => rating > 0);
    
    if (!hasRatings) {
        summaryBox.innerHTML = '<p class="empty-state">עדיין לא דירגתן אף תחום. התחילו לחקור את התחומים ולדרג אותם! ⭐</p>';
        return;
    }
    
    // Sort domains by rating
    const sortedDomains = Object.entries(domainRatings)
        .filter(([_, rating]) => rating > 0)
        .sort(([_, a], [__, b]) => b - a);
    
    let summaryHTML = '';
    
    sortedDomains.forEach(([domain, rating]) => {
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        summaryHTML += `
            <div class="domain-summary">
                <h4>${domainNames[domain]}</h4>
                <div class="domain-rating">${stars}</div>
            </div>
        `;
    });
    
    summaryBox.innerHTML = summaryHTML;
    
    // Highlight top choice
    if (sortedDomains.length > 0) {
        const topChoice = sortedDomains[0];
        if (topChoice[1] >= 4) {
            summaryBox.innerHTML = `
                <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                    <h3 style="color: white; margin-bottom: 10px;">🎯 התחום המוביל שלך:</h3>
                    <h2 style="color: white;">${domainNames[topChoice[0]]}</h2>
                    <p style="color: white; margin-top: 10px;">דירוג: ${'★'.repeat(topChoice[1])}</p>
                </div>
            ` + summaryHTML;
        }
    }
}

// Save selection
function saveSelection() {
    const notes = document.getElementById('personalNotes').value;
    
    // Check if any ratings exist
    const hasRatings = Object.values(domainRatings).some(rating => rating > 0);
    
    if (!hasRatings && !notes) {
        alert('נראה שעדיין לא דירגת אף תחום ולא כתבת הערות.\n\nדרגי לפחות תחום אחד או כתבי את המחשבות שלך לפני השמירה!');
        return;
    }
    
    // Save to localStorage
    const selectionData = {
        ratings: domainRatings,
        notes: notes,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('potzotDerechSelection', JSON.stringify(selectionData));
    
    // Show success message
    const saveBtn = document.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '✓ נשמר בהצלחה!';
    saveBtn.style.background = '#4CAF50';
    
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
    }, 2000);
    
    // Show detailed summary
    showDetailedSummary();
}

// Show detailed summary
function showDetailedSummary() {
    const sortedDomains = Object.entries(domainRatings)
        .filter(([_, rating]) => rating > 0)
        .sort(([_, a], [__, b]) => b - a);
    
    if (sortedDomains.length === 0) return;
    
    let message = '📊 סיכום הבחירה שלך:\n\n';
    
    sortedDomains.forEach(([domain, rating], index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
        message += `${medal} ${domainNames[domain]}\n   דירוג: ${'★'.repeat(rating)}${'☆'.repeat(5-rating)}\n\n`;
    });
    
    const notes = document.getElementById('personalNotes').value;
    if (notes) {
        message += `\n💭 ההערות שלך:\n${notes}`;
    }
    
    alert(message);
}

// Load saved data
function loadSavedData() {
    const saved = localStorage.getItem('potzotDerechSelection');
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            domainRatings = data.ratings || domainRatings;
            
            // Restore ratings visually
            Object.entries(domainRatings).forEach(([domain, rating]) => {
                if (rating > 0) {
                    updateStars(domain, rating);
                }
            });
            
            // Restore notes
            if (data.notes) {
                document.getElementById('personalNotes').value = data.notes;
            }
            
            // Update summary
            updateSummary();
        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }
}

// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Auto-save notes
let notesTimeout;
document.getElementById('personalNotes').addEventListener('input', function() {
    clearTimeout(notesTimeout);
    notesTimeout = setTimeout(() => {
        const saved = localStorage.getItem('potzotDerechSelection');
        const data = saved ? JSON.parse(saved) : { ratings: domainRatings };
        data.notes = this.value;
        data.timestamp = new Date().toISOString();
        localStorage.setItem('potzotDerechSelection', JSON.stringify(data));
    }, 1000);
});
