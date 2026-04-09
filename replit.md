# פורצות דרך (Portzot Derech)

פלטפורמת קורס לחיזוק נשים צעירות בתחום הטכנולוגיה, היזמות והשפעה חברתית.

## מבנה הפרויקט

- `index.html` — דף כניסה ראשי (מוגן בקוד `1234`)
- `strongermenu-2026.html` — תפריט ראשי של הקורס
- `server.js` — שרת Node.js סטטי פשוט (ללא תלויות npm)
- `js/` — לוגיקת ה-Pairing ו-Firebase
- `css/` — עיצוב גלובלי
- `pairing/` — מסכי התאמת זוגות (שאלון, ממתין, אדמין)
- `poster-builder/` — עורך פוסטרים מבוסס React (CDN) + Fabric.js
- `domains/`, `idea/`, `steps/`, `final/` — תוכן לשלבי הקורס
- `fonts/`, `icon/` — נכסי עיצוב

## טכנולוגיות

- **Frontend:** HTML5, CSS3, Vanilla JS (ES6 Modules), React 18 (CDN), Fabric.js (CDN)
- **Backend:** Node.js — שרת קבצים סטטי פשוט (`server.js`)
- **Database:** Firebase Firestore (עבור מערכת ה-Pairing)
- **PWA:** Service Worker + manifest.json

## הפעלה

```bash
node server.js
```

השרת רץ על פורט 5000.

## עורך פוסטרים — מבנה מפורט

קוד ב-`poster-builder/src/`:
- `main.js` — App ראשי עם אשף 4 שלבים
- `components/WizardSteps.js` — קומפוננטות: `WizardStep1`, `WizardStep2`, `WizardStep3`, `StepIndicator`
- `canvas/editor.js` — כל לוגיקת Fabric.js: יצירה, שדות, עיצוב, ייצוא
- `utils/export.js` — ייצוא PDF עם שם קובץ חכם (`שם-פרויקט_בית-ספר_כיתה.pdf`)
- `utils/storage.js` — שמירה וטעינה ב-localStorage
- `data/config.js` — הגדרות שדות, סוגי מוצר, רקעים, פונטים
- `styles/app.css` — עיצוב מלא כולל מחלקות `.wz-*` (אשף) ו-`.step4-*` (בד ציור)

### זרימת האשף:
1. **שלב 1 — עיצוב**: רקע, מסגרת (border-radius), פונט כותרות, צבע כותרות
2. **שלב 2 — סוג מוצר**: אפליקציה / אתר / מוצר פיזי (משפיע על שדות)
3. **שלב 3 — תוכן**: שאלון דינמי לפי סוג מוצר + העלאת תמונות
4. **שלב 4 — יצירה**: עורך הבד עם הוספת אלמנטים + ייצוא PDF

## הערות חשובות

- הפרויקט מנוהל ב-GitHub ועובד ישירות מהריפו — ללא תלות ב-Replit.
- אין `package.json` — כל התלויות נטענות דרך CDN.
- הכל בעברית עם `dir="rtl"`.
- `canvas._titleStyle` — שומר את פונט/צבע הכותרות הגלובלי.
- אזהרות `alphabetical textBaseline` — מקורן ב-Fabric.js, לא משפיעות על פונקציונליות.
