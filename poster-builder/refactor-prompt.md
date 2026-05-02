# פרומפט לסוכן: רפקטורינג שלב הפוסטר — ממעבד קנבס ל-HTML/CSS

## הקשר

אתה עובד על מערכת פורצות דרך — כלי לבניית פוסטר חקר לתלמידות.
המערכת קיימת ופועלת תחת GitHub Pages.

**הבעיה שצריך לפתור:**
שלב הפוסטר (שלב 4) בנוי על Fabric.js + canvas. הבעיה: התיבות לא מתאימות את עצמן נכון לכמות התווים, והטקסט לא ממוקם טוב בתוכן. זו בעיה מובנית בגישת ה-canvas — חישובי `fitText` לא מדויקים ו-`PORTRAIT_RECTS` לא מתאים לכל כמויות תוכן.

**הפתרון שהוחלט עליו:**
להחליף את שלב 4 (בניית הפוסטר על קנבס) בפוסטר HTML/CSS טהור. הדפדפן יטפל בעימוד הטקסט בצורה טבעית — ללא חישובים, ללא ניחושים, ללא `fitText`.

---

## מה לשמור — מה לשנות

### שומרים ללא שינוי:
- **שלב 1** — WizardStep1: בחירת סוג מוצר (physical / website / app)
- **שלב 2** — WizardStep2: בחירת עיצוב (רקע, פונט, צבע כותרות, צורת תיבות)
- **שלב 3** — WizardStep3 + PhysicalStep1/2/3: מילוי שאלות + בניית פרומפטים לתמונות + העלאת תמונות — **לא לגעת בכלל**
- **שלב 5** — WizardStep5: סיום
- `config.js` — כל ההגדרות: FIELD_DEFINITIONS, DYNAMIC_QUESTIONS, BACKGROUNDS, PRODUCT_TYPES, AVAILABLE_FONTS, getVisualSlots
- `storage.js` — שמירה וטעינה ב-localStorage
- `main.js` / `app-shell.js` — ניהול מצב, זרימת שלבים, העלאת תמונות, שמירה
- כל ה-CSS הקיים ל-wizard (`wz-*`, `step4-bar`, `ph-*` וכו׳)

### משנים — שלב 4 בלבד:
- **מוחקים** את `canvas/editor.js` לחלוטין
- **מוחקים** את שימושי Fabric.js מ-`main.js` ומ-`app-shell.js`
- **מוחקים** מ-`index.html` את טעינת `fabric.min.js`
- **מוחקים** את `export.js` הקיים ומחליפים בייצוא HTML→PDF
- **בונים** פוסטר HTML/CSS חדש שמחליף את הקנבס בשלב 4

---

## הפוסטר החדש — מפרט מדויק

### עקרון מרכזי
הפוסטר הוא `div` בגודל 794×1123px (יחס A4).
כל "תיבת תוכן" היא `div` עם CSS — הגובה גדל לפי הטקסט, הטקסט תמיד בפנים, אף פעם לא גולש.

### מבנה HTML של הפוסטר

```html
<div id="poster-html" style="width:794px; min-height:1123px; position:relative; overflow:hidden; font-family:[titleFont]; direction:rtl; background:#fff; display:flex; flex-direction:column;">

  <!-- רקע -->
  <div id="poster-bg" style="position:absolute; inset:0; z-index:0;">
    <!-- אם נבחר רקע: <img src="[path]" style="width:100%;height:100%;object-fit:cover;"> -->
  </div>

  <!-- תוכן מעל הרקע -->
  <div style="position:relative; z-index:1; display:flex; flex-direction:column; min-height:1123px;">

    <!-- פס עליון -->
    <div style="height:5px; background:linear-gradient(90deg,#5E2750,#d61f8c,#9b40c0,#5E2750); flex-shrink:0;"></div>

    <!-- אזור כותרת -->
    <div style="padding:20px 32px 14px; text-align:center; position:relative; flex-shrink:0;">
      <!-- לוגו — פינה ימין עליון -->
      <div style="position:absolute; top:14px; right:22px;">
        <img src="/poster-builder/assets/logoposter.png"
             alt="פורצות דרך"
             style="height:52px; width:auto; object-fit:contain; filter:drop-shadow(0 2px 6px rgba(255,255,255,.6));">
      </div>
      <!-- תג צוות — פינה שמאל -->
      <div id="ph-team" style="position:absolute; top:18px; left:22px; background:rgba(255,255,255,.88); border:1px solid rgba(94,39,80,.2); border-radius:10px; padding:7px 11px; max-width:165px;">
        <div style="font-size:7.5px; font-weight:700; color:#5E2750; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">הצוות שלנו</div>
        <div id="ph-names" style="font-size:9.5px; color:#2a1a3a; line-height:1.7;"></div>
        <div id="ph-school" style="font-size:8.5px; color:#8a7aa0; margin-top:3px;"></div>
      </div>

      <!-- שם המיזם — גודל גופן אדפטיבי לפי אורך -->
      <div id="ph-name" style="font-family:[titleFont]; font-weight:900; color:[titleColor]; line-height:1.1; margin-bottom:8px; word-break:break-word;"></div>
      <div style="width:52px; height:3px; background:linear-gradient(90deg,#5E2750,#d61f8c); border-radius:2px; margin:0 auto 10px;"></div>
      <div id="ph-desc" style="font-size:13.5px; color:#5a3a5a; max-width:480px; margin:0 auto; line-height:1.65;"></div>
    </div>

    <!-- שורה: בעיה + שאלת חקר -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:9px; padding:0 24px; margin-bottom:9px; flex-shrink:0;">
      <div class="ph-card">
        <div class="ph-cap">הבעיה שזיהינו</div>
        <div id="ph-problem" class="ph-body"></div>
        <div id="ph-audience" class="ph-sub"></div>
      </div>
      <div class="ph-card">
        <div class="ph-cap">שאלת החקר</div>
        <div id="ph-rq" class="ph-body"></div>
      </div>
    </div>

    <!-- אזור תמונות — מרכז הפוסטר -->
    <div style="padding:0 24px; margin-bottom:9px; flex-shrink:0;">
      <div id="ph-images-label" style="font-size:7.5px; font-weight:700; color:#5E2750; text-transform:uppercase; letter-spacing:1.5px; text-align:center; margin-bottom:7px;"></div>

      <!-- מוצר פיזי: 2 תמונות -->
      <div id="ph-images-2" style="display:none; grid-template-columns:1fr 1fr; gap:10px;">
        <div id="ph-img-0" class="ph-img-frame" style="height:205px;"></div>
        <div id="ph-img-1" class="ph-img-frame" style="height:205px;"></div>
      </div>

      <!-- אפליקציה: 3 מסכים (9:16) -->
      <div id="ph-images-app" style="display:none; grid-template-columns:1fr 1fr 1fr; gap:9px;">
        <div id="ph-img-0" class="ph-img-frame ph-notch" style="height:250px;"></div>
        <div id="ph-img-1" class="ph-img-frame ph-notch" style="height:250px;"></div>
        <div id="ph-img-2" class="ph-img-frame ph-notch" style="height:250px;"></div>
      </div>

      <!-- אתר: 3 מסכים (16:9) -->
      <div id="ph-images-web" style="display:none; grid-template-columns:1fr 1fr 1fr; gap:9px;">
        <div id="ph-img-0" class="ph-img-frame" style="height:145px;"></div>
        <div id="ph-img-1" class="ph-img-frame" style="height:145px;"></div>
        <div id="ph-img-2" class="ph-img-frame" style="height:145px;"></div>
      </div>
    </div>

    <!-- שורה: חקר × 3 + תובנות + דרישות -->
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; padding:0 24px; margin-bottom:8px; flex-shrink:0;">
      <div class="ph-card">
        <div class="ph-cap">החקר שביצענו</div>
        <ul id="ph-research" class="ph-bullets"></ul>
      </div>
      <div class="ph-card">
        <div class="ph-cap">מה גילינו</div>
        <div id="ph-findings" class="ph-body"></div>
      </div>
      <div class="ph-card">
        <div class="ph-cap">דרישות הפתרון</div>
        <ul id="ph-reqs" class="ph-bullets"></ul>
      </div>
    </div>

    <!-- שורה: פתרון + שימוש -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:9px; padding:0 24px; margin-bottom:8px; flex-shrink:0;">
      <div class="ph-card">
        <div id="ph-solution-cap" class="ph-cap"></div>
        <div id="ph-solution" class="ph-body"></div>
      </div>
      <div class="ph-card">
        <div id="ph-usage-cap" class="ph-cap"></div>
        <ul id="ph-usage" class="ph-bullets"></ul>
      </div>
    </div>

    <!-- שורה: משוב + שיפור + ערך -->
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; padding:0 24px; margin-bottom:8px; flex-shrink:0;">
      <div class="ph-card ph-card-accent">
        <div class="ph-cap">המשוב שקיבלנו</div>
        <div id="ph-feedback" class="ph-body"></div>
      </div>
      <div class="ph-card ph-card-accent">
        <div class="ph-cap">מה שיפרנו</div>
        <div id="ph-improved" class="ph-body"></div>
      </div>
      <div class="ph-card ph-card-accent">
        <div class="ph-cap">הערך המרכזי</div>
        <div id="ph-value" class="ph-body"></div>
      </div>
    </div>

    <!-- רצועת סיום -->
    <div style="margin-top:auto; background:linear-gradient(135deg,#4a1f40,#5E2750,#9b40c0); padding:10px 30px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
      <div id="ph-slogan" style="font-style:italic; font-size:13px; color:rgba(255,255,255,.95);"></div>
      <div style="font-size:9.5px; color:rgba(255,255,255,.6); font-weight:700; letter-spacing:1.2px;">פורצות דרך ✦ 2026</div>
    </div>

  </div>
</div>
```

### CSS הנדרש לפוסטר (להוסיף ל-`product-builder.css` או ל-`app.css`)

```css
/* ===== פוסטר HTML ===== */
.ph-card {
  background: rgba(255,255,255,.86);
  border: 1px solid rgba(94,39,80,.14);
  border-radius: 10px;
  padding: 9px 12px;
}
.ph-card-accent {
  background: linear-gradient(135deg, rgba(94,39,80,.07), rgba(214,31,140,.04));
  border-color: rgba(94,39,80,.2);
}
.ph-cap {
  font-size: 7.5px;
  font-weight: 700;
  color: #5E2750;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.ph-cap::before {
  content: '';
  display: inline-block;
  width: 12px; height: 2px;
  background: #5E2750;
  border-radius: 1px;
}
.ph-body {
  font-size: 10.5px;
  color: #1f1030;
  line-height: 1.65;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.ph-sub {
  font-size: 9.5px;
  color: #8a7aa0;
  margin-top: 4px;
  line-height: 1.5;
}
.ph-bullets {
  list-style: none;
  margin-top: 3px;
  padding: 0;
}
.ph-bullets li {
  font-size: 10px;
  color: #1f1030;
  line-height: 1.55;
  padding-right: 13px;
  position: relative;
  margin-bottom: 3px;
}
.ph-bullets li::before {
  content: '◆';
  position: absolute;
  right: 0; top: 2px;
  font-size: 5.5px;
  color: #5E2750;
}
.ph-img-frame {
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(94,39,80,.18);
  background: #f5eef2;
  box-shadow: 0 4px 16px rgba(94,39,80,.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ph-img-frame img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.ph-notch {
  position: relative;
  border-radius: 16px;
}
.ph-notch::before {
  content: '';
  position: absolute;
  top: 8px; left: 50%;
  transform: translateX(-50%);
  width: 26px; height: 4px;
  background: #d0b0c8;
  border-radius: 2px;
  z-index: 2;
}
```

---

## פונקציית בניית הפוסטר — `renderHTMLPoster()`

פונקציה זו מחליפה את `initializePosterFields()` של editor.js.
היא מקבלת את המצב הנוכחי וממלאת את ה-div.

```javascript
function renderHTMLPoster(contentValues, productType, titleFont, titleColor, slotImages, background) {

  // רקע
  const bgEl = document.getElementById('poster-bg');
  if (background) {
    bgEl.innerHTML = `<img src="${background}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
  } else {
    bgEl.innerHTML = '';
  }

  // לוגו — הלוגו מוטמע ב-HTML כ-<img> קבועה, אין צורך לטפל בו פה.
  // הנתיב: /poster-builder/assets/logoposter.png
  // הוא כבר בתוך ה-div של אזור הכותרת כאלמנט סטטי.

  // שם המיזם — גודל גופן לפי אורך
  const name = (contentValues.projectName || '').trim();
  const nameEl = document.getElementById('ph-name');
  if (nameEl) {
    nameEl.textContent = name || 'שם המיזם';
    nameEl.style.fontFamily = titleFont || 'IBM Plex Sans Hebrew';
    nameEl.style.color = titleColor || '#5E2750';
    const len = name.length;
    nameEl.style.fontSize = len <= 6  ? '52px' :
                            len <= 10 ? '44px' :
                            len <= 15 ? '36px' :
                            len <= 18 ? '30px' : '24px';
  }

  // שאר הכותרת
  setText('ph-desc', contentValues.description);

  // צוות
  const names = ['student1','student2','student3']
    .map(k => (contentValues[k] || '').trim())
    .filter(Boolean).join(' · ');
  setText('ph-names', names || '—');
  const school = [contentValues.schoolName, contentValues.className]
    .filter(Boolean).join(' | ');
  setText('ph-school', school);

  // בעיה
  setText('ph-problem', contentValues.problem);
  const aud = (contentValues.audience || '').trim();
  setText('ph-audience', aud ? '👥 ' + aud : '');
  setText('ph-rq', contentValues.researchQuestion);

  // חקר
  setList('ph-research', [
    contentValues.research_1,
    contentValues.research_2,
    contentValues.research_3
  ]);
  setText('ph-findings', contentValues.findings);

  // דרישות
  setList('ph-reqs', [
    contentValues.requirements_1,
    contentValues.requirements_2,
    contentValues.requirements_3
  ]);

  // פתרון — כותרות דינמיות
  const solutionLabels = {
    physical: 'המוצר שלנו',
    website:  'האתר שלנו',
    app:      'האפליקציה שלנו',
  };
  const usageLabels = {
    physical: 'איך משתמשים',
    website:  'מה עושים באתר',
    app:      'איך זה עובד',
  };
  setText('ph-solution-cap', solutionLabels[productType] || 'הפתרון שלנו');
  setText('ph-usage-cap', usageLabels[productType] || 'איך זה עובד');
  setText('ph-solution', contentValues.solution);
  setList('ph-usage', [
    contentValues.howItWorks_1,
    contentValues.howItWorks_2,
    contentValues.howItWorks_3
  ]);

  // ערך + משוב
  setText('ph-value', contentValues.value);
  setText('ph-feedback', contentValues.feedbackReceived);
  setText('ph-improved', contentValues.improvementsAfterFeedback);

  // תמונות — הגדרת הצגה לפי סוג
  const imagesLabel = {
    physical: 'המוצר שלנו',
    app:      'מסכי האפליקציה',
    website:  'מסכי האתר',
  };
  setText('ph-images-label', imagesLabel[productType] || '');

  document.getElementById('ph-images-2').style.display   = productType === 'physical' ? 'grid' : 'none';
  document.getElementById('ph-images-app').style.display = productType === 'app'      ? 'grid' : 'none';
  document.getElementById('ph-images-web').style.display = productType === 'website'  ? 'grid' : 'none';

  // מיפוי תמונות לפי סוג
  const slotKeys = productType === 'physical'
    ? ['visual_1', 'visual_2']
    : ['visual_1', 'visual_2', 'visual_3'];

  slotKeys.forEach((key, i) => {
    const frame = document.getElementById(`ph-img-${i}`);
    if (!frame) return;
    const src = slotImages[key];
    if (src) {
      frame.innerHTML = `<img src="${src}" alt="תמונה ${i+1}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    } else {
      const icon = productType === 'physical' ? (i === 0 ? '📷' : '🤝') : '📱';
      const label = productType === 'physical'
        ? (i === 0 ? 'תמונה ראשית' : 'תמונת שימוש')
        : `מסך ${i+1}`;
      frame.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#c8a8c0;font-size:10px;width:100%;height:100%;"><span style="font-size:24px;">${icon}</span><small>${label}</small></div>`;
    }
  });
}

// עזר: set text
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = (text || '').trim();
}

// עזר: set bullet list
function setList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = (items || [])
    .filter(item => (item || '').trim())
    .map(item => `<li>${item.trim()}</li>`)
    .join('');
}
```

---

## פונקציית ייצוא PDF — `exportHTMLPosterToPDF()`

מחליפה את `exportPDF()` הקיים.

```javascript
async function exportHTMLPosterToPDF(contentValues) {
  const poster = document.getElementById('poster-html');
  if (!poster) return;

  const canvas = await html2canvas(poster, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: 794,
    height: poster.scrollHeight,
    windowWidth: 794,
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/jpeg', 0.96);
  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

  const name = (contentValues.projectName || 'פוסטר').trim().replace(/\s+/g, '-');
  pdf.save(`${name}.pdf`);
}
```

**שים לב:** html2canvas כבר מוטען ב-index.html. אם לא — להוסיף:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

---

## שינויים ב-`main.js` / `app-shell.js`

### להסיר:
- כל import מ-`canvas/editor.js`
- כל קריאה ל: `createEditor`, `registerFonts`, `initializePosterFields`, `updatePosterField`, `applyBackground`, `applyZoneImage`, `applyVisualSlots`, `resizeCanvas`, `setTitleStyle`, `updateAllFieldShapes`, `addElement`, `duplicateActiveObject`, `removeActiveObject`, `setLock`, `isPosterManagedObject`
- כל הקוד הקשור ל: `fabricRef`, `canvasRef`, `canvas.on(...)`, `saveNow` (הקנבס בחלק)
- כפתורי עריכה בשלב 4: "הוספת אלמנטים", "שכפול", "נעילה", "קדימה/אחורה" — **אינם רלוונטיים לפוסטר HTML**

### לשמור ולהתאים:
- `contentValues` state — ממשיך לפעול כרגיל
- `slotImages` state — ממשיך לפעול כרגיל
- `fieldSettings` state (titleFont, titleColor, shape) — ממשיך, ישמש ב-`renderHTMLPoster`
- `currentBackground` state — ממשיך כרגיל
- `saveProject` / `loadProject` — שומרים כרגיל (ללא userObjects)

### שלב 4 החדש:
```javascript
// כשמגיעים לשלב 4 (goToStep(4)):
// 1. להציג את div#poster-html (לא canvas)
// 2. לקרוא ל: renderHTMLPoster(contentValues, productType, titleFont, titleColor, slotImages, currentBackground)
// 3. בכל פעם שמשתנה תוכן/עיצוב/תמונה — לקרוא שוב ל-renderHTMLPoster

// כפתור ייצוא:
// לקרוא ל: exportHTMLPosterToPDF(contentValues)
```

---

## שינויים ב-`index.html` / `product-builder.css`

### ב-`index.html`:
- **להסיר** את שורת טעינת `fabric.min.js`
- **לוודא** שקיים: `html2canvas`, `jspdf`, `react`, `react-dom`

### ב-CSS:
- **להוסיף** את כל `.ph-*` classes המפורטות למעלה
- **לשמור** את כל CSS הקיים של ה-wizard

---

## מה לא לגעת בו

- `config.js` — אסור לשנות
- `storage.js` — אסור לשנות
- `WizardSteps.js` (שלבים 1–3, 5) — אסור לשנות, **כולל PhysicalStep2 שבונה פרומפטים לתמונות ו-PhysicalStep3 שמציג אותם**
- `Sidebar.js` — אסור לשנות
- `gateway.css` — אסור לשנות
- כל קבצי ה-assets (רקעים, פונטים, אייקונים, `logoposter.png`)
- `prd-options.html`, `index.html` (שער הכניסה)

**הדגשה על שלב הפרומפטים:**
שלב 3 כולל זרימה שלמה של בניית פרומפטים לתמונות AI (PhysicalStep2, buildPhysicalPrompts, buildDigitalPrompt וכו׳) והעלאת התמונות שנוצרו (PhysicalStep3, SlotUploadSection).
זרימה זו **נשמרת לחלוטין** — כולל כל פונקציות בניית הפרומפטים, כפתורי ההעתקה, ותצוגת הפרומפטים המוכנים.
השינוי היחיד הוא שלאחר העלאת התמונות, הן מוצגות בפוסטר HTML במקום בקנבס.

---

## סדר ביצוע מומלץ

1. הוסף את ה-CSS של `.ph-*` ל-`product-builder.css`
2. בנה את `div#poster-html` ב-`WizardSteps.js` (או קומפוננט נפרד) כ-JSX/`h()` מלא
3. כתוב `renderHTMLPoster()` ו-`exportHTMLPosterToPDF()` כ-utilities נפרדים בקובץ חדש: `src/canvas/html-poster.js`
4. עדכן את `main.js`/`app-shell.js`: הסר Fabric.js, חבר את `renderHTMLPoster` לשלב 4
5. הסר את `canvas/editor.js` מה-imports
6. הסר את `fabric.min.js` מ-`index.html`
7. בדוק שהפוסטר מתעדכן בזמן אמת כשמשנים עיצוב (titleFont, titleColor, background)
8. בדוק שייצוא PDF עובד

---

## בדיקות קבלה

לאחר הביצוע, ודא:

- [ ] הטקסט בכל כרטיס נמצא בתוך הכרטיס ולא גולש החוצה
- [ ] כרטיסים עם טקסט קצר נראים קומפקטיים; עם טקסט ארוך — גדלים בהתאם
- [ ] שלבים 1–3 ו-5 עובדים בדיוק כמו קודם
- [ ] בחירת רקע מעדכנת את הפוסטר בזמן אמת
- [ ] שינוי פונט/צבע כותרת מעדכן את שם המיזם בפוסטר
- [ ] העלאת תמונה מעדכנת את הפוסטר בזמן אמת
- [ ] PDF יוצא ונראה זהה למה שמוצג
- [ ] localStorage שומר וטוען כרגיל
- [ ] אין שגיאות console הקשורות ל-Fabric.js
