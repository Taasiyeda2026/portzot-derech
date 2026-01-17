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
