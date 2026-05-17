# פורצות דרך — אתר קורס

אתר קורס אינטראקטיבי בעברית עבור תוכנית "פורצות דרך", הכולל תהליך למידה, איתור אתגר, שותפה לדרך, פיתוח רעיון למוצר, תהליך טכנולוגי, פוסטר והצגה מסכמת.

## מבנה האתר
- `index.html` — דף כניסה ראשי עם קוד גישה
- `strongermenu-2026.html` — תפריט ראשי של הקורס
- `start/` — פתיחת התהליך / שאלון פתיחה
- `domains/` — איתור תחומי עניין ואתגרים
- `pairing/` — מערכת שותפה לדרך
- `idea/` — מעבר מרעיון למוצר
- `steps/` — שלבי התהליך הטכנולוגי
- `final/` — שלב סיום, פוסטר והצגה
- `poster-builder/` — עורך פוסטרים
- `p.nativ/` — נתיב החדשנות, אם פעיל
- `css/` — קבצי עיצוב
- `js/` — קבצי JavaScript
- `icon/` — לוגו ואייקונים
- `fonts/` — פונטים
- `manifest.json` — הגדרות PWA
- `service-worker.js` — Service Worker
- `server.js` — שרת Node.js פשוט לפיתוח מקומי

---

## הפעלה מקומית

### דרישות
- Node.js 18 ומעלה

### התקנה והפעלה
```bash
git clone https://github.com/your-org/portzot-derech.git
cd portzot-derech

# הגדר משתני סביבה
cp .env.example .env
# ערוך את .env עם הערכים שלך

# הפעל את השרת
npm start
# או ישירות:
node server.js
```

כתובת מקומית: `http://localhost:5000`

ניתן לשנות את הפורט באמצעות משתנה סביבה:
```bash
PORT=3000 npm start
```

---

## משתני סביבה

| משתנה | תיאור | נדרש |
|---|---|---|
| `VITE_SUPABASE_URL` | כתובת URL של פרויקט Supabase | כן (לעורך פוסטרים) |
| `VITE_SUPABASE_ANON_KEY` | מפתח anon ציבורי של Supabase | כן (לעורך פוסטרים) |
| `VITE_POSTER_ADMIN_CODE` | קוד גישה לממשק הניהול של הפוסטרים | לא (ברירת מחדל: 1234) |
| `PORT` | פורט השרת | לא (ברירת מחדל: 5000) |

---

## פריסה

### GitHub Pages (אתר סטטי)
האתר מיועד לפריסה כאתר סטטי ב-GitHub Pages. אין צורך בשרת Node.js לפריסה זו — `server.js` משמש לפיתוח מקומי בלבד.

כדי לפרוס ב-GitHub Pages:
1. דחוף את הקוד ל-branch `main`
2. הפעל GitHub Pages מהגדרות הריפו (Settings → Pages → branch: main)
3. עורך הפוסטרים ייפגע ללא `window.__POSTER_ENV__` — ראה אפשרות להוסיף Edge Function של Supabase להזרקת ה-env

### פריסה על שרת Node.js (Heroku, Railway, Render וכו')
```bash
npm start
```
קבע את משתני הסביבה בפלטפורמת הפריסה שלך. הפורט נקרא אוטומטית מ-`process.env.PORT`.

### Replit (פיתוח בלבד)
הפרויקט עובד על Replit עם לחיצה על Run. משתני הסביבה מוגדרים דרך לשונית Secrets ב-Replit.
> `.replit` הוא קובץ הגדרות Replit בלבד ואינו משפיע על הרצה מקומית.

---

## הערות תחזוקה
- `main` הוא המקור היחיד והסופי.
- אין להחזיר תיקיות `old` או גרסאות ניסוי.
- בכל שינוי משמעותי ב-`service-worker.js` יש לעדכן את `CACHE_NAME`.
- לאחר שינויי PWA מומלץ לבדוק בדפדפן נקי או לבצע hard refresh.
- לעולם אל תכלול ערכים אמיתיים ב-`.env.example` — השתמש בפלייסהולדרים בלבד.
