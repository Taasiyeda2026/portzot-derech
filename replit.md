# Portzot Derech (פורצות דרך)

## Overview
A Hebrew-language educational course portal website. This is a static HTML/CSS/JavaScript website with multiple pages for course activities including questionnaires, pairing, and matching exercises.

## Project Structure
- `index.html` - Main landing page
- `questionnaire.html` - Course questionnaire
- `pairing.html` - Student pairing interface
- `matching.html` - Matching activities
- `waiting.html` - Waiting room page
- `admin.html` - Admin interface
- `next-steps.html` - Future steps landing page (tech tools theme)
- `js/` - JavaScript modules (config, admin-app, pairing-app, pairing-algorithm)
- `level1/`, `level2/` - Level-specific content
- `exploration/` - Exploration pages (Tailwind CSS design)
  - school.html - בית ספר exploration
  - digital.html - עולם דיגיטלי exploration
  - social.html - חברים וקשרים exploration
- `styles.css`, `pairing.css` - Stylesheets

## Running the Project
The project uses a simple Node.js static file server:
```
node server.js
```
The server runs on port 5000 and serves all static files.

## Technical Details
- Pure HTML/CSS/JavaScript (no build step)
- Uses Firebase/Firestore for data (see `js/config.js` and `firestore.rules`)
- RTL layout for Hebrew language support
- Responsive design with modern CSS
- PWA support for mobile installation and offline access
  - manifest.json: App name, icons, theme colors (#ec4899)
  - service-worker.js: Caches all main pages for offline navigation
  - Apple touch icon and theme-color meta tags on all pages

## User Preferences
- No commas before Hebrew letter "ו" anywhere in text
- Mobile + PWA are critical priorities
- Female-centered language and iconography
- Desktop-first magazine-style design
- Tailwind CSS for styling

## Recent Changes
- 2026-02-09: Post-download empowerment screen + next-steps page
  - After PDF downloads successfully, shows empowering message
  - Button with tech/tool icons only (🔧⚙️💻🛠️🚀📐) links to next-steps.html
  - next-steps.html: placeholder page for all future steps (coming soon)
  - PDF success gated — post-download only shows on successful generation
- 2026-02-09: Added inspiration step (Step 6) + PDF rebuilt to 2 rich pages
  - New Step 6: "נשים שהפכו צורך למוצר" — real product examples by women
  - 3 domain-specific examples per domain (30 total across 10 domains)
  - Products from girls' everyday world (Bumble, Canva, Flo, Spanx, Etsy, etc.)
  - Rich storytelling — conversational, relatable, makes them want to Google
  - Group-oriented messaging ("בדיוק כמוכן")
  - Journey now 9 steps (was 8): steps 6-8 shifted to 7-9
  - PDF rebuilt: 2 rich A4 pages (was 1 cramped page)
  - Page 1: centered logo, title, names+date, 3 large info cards, quote
  - Page 2: journey Q&A with numbered items, decision box, closing quote, credits
  - Fixed title overflow issue next to logo (now centered layout)
- 2026-02-08: Complete 9-step collaborative journey on idea-to-product.html
  - Step 1: Name entry (2-3 participants)
  - Step 2: Topic box selection (6 topics, turn-based)
  - Step 3: Branching questions engine with personal address by name
  - Step 4: Domain identification from accumulated choices
  - Step 5: Sub-domain drill-down
  - Step 6: Inspiration examples (real women-created products, domain-specific)
  - Step 7: Shared decision (3 options)
  - Step 8: Experiential ending with inspiring text
  - Step 9: PDF generation (2-page A4 document with jsPDF + html2canvas)
  - Topics: בחירות יומיומיות, זהות ומי אני, מערכות יחסים, גבולות, קול פנימי, העולם סביבי
  - Questions: provocative, funny, relatable, empowering style
  - Smooth fade transitions between steps with step indicator dots
  - PDF: 2 rich A4 pages — cover+cards and journey+decision+quote
  - Logo preloaded as data URL for reliable PDF rendering
- 2026-01-22: Scroll-lock mechanism for all domain pages (d1-d10)
  - js/scroll-lock.js - reusable script for hero lock/unlock
  - Hero sections locked on page load (scroll disabled)
  - Content unlocks when user clicks "בואי נתחיל" button
  - CSS classes: scroll-locked, scroll-unlocked, content-locked
  - Smooth scroll to content section after unlock
- 2026-01-22: Styled footers for all domain pages (d1-d10)
  - Added "© 2026 פורצות דרך" copyright to all footers
  - d7-d10 footers upgraded from minimal gray to colorful gradients
  - Each domain footer matches its unique color scheme
  - d7: indigo-violet gradient, d8: emerald-teal gradient
  - d9: fuchsia-purple gradient, d10: indigo-purple gradient
- 2026-01-19: Smart pairing algorithm (js/pairing-algorithm.js)
  - calculateScore() - compatibility scoring (max 110 points)
  - Domain matching (30pts): main/secondary domain alignment
  - Life interests (15pts): daily content preferences
  - Work style (25pts): pace, teamwork, approach
  - Team roles (20pts): complementary roles bonus
  - Communication (20pts): pressure, conflict, style
  - Importance multiplier for high-priority matches
  - pickBestPairs() - greedy optimal pairing
  - handleLeftovers() - creates triples for odd numbers
  - getPairingStats() - pairing statistics
- 2026-01-19: Back to domains button on all d1-d10 pages
- 2026-01-18: Complete redesign of opening questionnaire (level1/quiz.html)
  - 21 questions with 4 answer options each
  - Card-based UI with soft purple colors and off-white background
  - One question per screen with smooth fade transitions
  - Weighted scoring: general (1.0), action (1.5), technology (2.0)
  - Special bonuses for broad technology perception (Q16-17)
  - Always shows 2 recommended domains
  - Mobile responsive design
  - No scores/percentages shown to user
- 2026-01-18: Homepage card-style action sections
  - "איך מתחילים?" section with questionnaire button
  - "בחרת תחום?" section with partner matching button
  - Pink gradient title and deep pink accents
- 2026-01-17: Complete magazine-style layout for all domain pages (d1-d10)
  - Hero sections with 3D drop-shadow icons
  - H1 full titles + H2 subtitles (centered)
  - Intro text with right border accent
  - Content sections with hover effects
  - Example boxes integrated throughout (not grouped at end)
  - "Stop moment" reflection sections
  - Unique color scheme per domain
- 2026-01-17: Homepage button hover functionality (short title default, full title on hover)
- 2026-01-17: Female-centered iconography throughout
- 2026-01-17: Initial Replit environment setup, created static file server
