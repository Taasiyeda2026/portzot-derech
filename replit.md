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

## הערות חשובות

- הפרויקט מנוהל ב-GitHub ועובד ישירות מהריפו — ללא תלות ב-Replit.
- אין `package.json` — כל התלויות נטענות דרך CDN.
- הכל בעברית עם `dir="rtl"`.
