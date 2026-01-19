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

## Recent Changes
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
