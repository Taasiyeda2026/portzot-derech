# דוח בדיקת Service Worker ו־Cache Paths

## 1) מיקום קובץ ה־Service Worker
- מיקום בפועל: `service-worker.js` (בשורש הפרויקט).

## 2) התאמת המיקום ל־scope
- אם הקובץ נרשם כ־`./service-worker.js` מתוך דף בתוך פרויקט GitHub Pages (`https://<user>.github.io/<repo>/`), ה־scope יהיה `<repo>/` וזה תקין.
- אם הקובץ נרשם כ־`/service-worker.js`, זה פונה לשורש הדומיין ועלול להישבר ב־project deployment.

## 3) סטטוס כל ערכי `urlsToCache` שהיו לפני התיקון

| path קודם | סטטוס | הערה |
|---|---|---|
| `/` | outdated | עלול להפנות לשורש דומיין במקום לשורש הפרויקט ב־GitHub Pages. |
| `/index.html` | outdated | צריך להיות יחסי לפרויקט (`./index.html`). |
| `/d1.html` | broken | הקובץ עבר ל־`domains/d1.html`. |
| `/d2.html` | broken | הקובץ עבר ל־`domains/d2.html`. |
| `/d3.html` | broken | הקובץ עבר ל־`domains/d3.html`. |
| `/d4.html` | broken | הקובץ עבר ל־`domains/d4.html`. |
| `/d5.html` | broken | הקובץ עבר ל־`domains/d5.html`. |
| `/d6.html` | broken | הקובץ עבר ל־`domains/d6.html`. |
| `/d7.html` | broken | הקובץ עבר ל־`domains/d7.html`. |
| `/d8.html` | broken | הקובץ עבר ל־`domains/d8.html`. |
| `/d9.html` | broken | הקובץ עבר ל־`domains/d9.html`. |
| `/d10.html` | broken | הקובץ עבר ל־`domains/d10.html`. |
| `/start/quiz.html` | outdated | קיים, אך עדיף נתיב יחסי (`./start/quiz.html`) ל־GitHub Pages project path. |
| `/pairing.html` | broken | הקובץ עבר ל־`pairing/pairing.html`. |
| `/questionnaire.html` | broken | הקובץ עבר ל־`pairing/questionnaire.html`. |
| `/waiting.html` | broken | הקובץ עבר ל־`pairing/waiting.html`. |
| `/styles.css` | broken | הקובץ עבר ל־`css/styles.css`. |
| `/pairing.css` | broken | הקובץ עבר ל־`css/pairing.css`. |
| `/js/scroll-lock.js` | outdated | קיים, אך עדיף נתיב יחסי לפרויקט (`./js/scroll-lock.js`). |
| `/js/config.js` | outdated | קיים, אך עדיף נתיב יחסי לפרויקט (`./js/config.js`). |
| `/js/pairing-algorithm.js` | outdated | קיים, אך עדיף נתיב יחסי לפרויקט (`./js/pairing-algorithm.js`). |
| `/favicon.png` | broken | הקובץ עבר ל־`icon/favicon.png`. |
| `/logo.png` | broken | הקובץ עבר ל־`icon/logo.png`. |

## 4) נתיבים שצריך לעדכן
- כל הנתיבים המוחלטים שמתחילים ב־`/` לנתיבים יחסיים (`./...`).
- דפים: `d1..d10` ל־`domains/d1..d10.html`.
- pairing pages לשמות תחת `pairing/`.
- CSS תחת `css/`.
- אייקונים תחת `icon/`.

## 5) קבצים שצריך להוסיף ל־cache
- `manifest.json`
- `domains/alldomains.html` (דף ניווט מרכזי קיים)

## 6) קבצים שצריך להסיר מה־cache
- `d1.html` עד `d10.html` בשורש
- `pairing.html`, `questionnaire.html`, `waiting.html` בשורש
- `styles.css`, `pairing.css` בשורש
- `favicon.png`, `logo.png` בשורש

## 7) בעיית root absolute paths ב־GitHub Pages
- כן. שימוש ב־`/path` ב־Service Worker מסוכן ב־project deployment כי הוא פונה לשורש הדומיין ולא לשורש ה־repo.

## 8) המלצה על סוג נתיב
- להשתמש ב־`./` (או נתיבים יחסיים שקולים) בתוך `urlsToCache`.
- להימנע מ־`/` ב־GitHub Pages project deployment.

## 9) גרסה מתוקנת של `urlsToCache`
```js
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/pairing.css',
  './domains/alldomains.html',
  './domains/d1.html',
  './domains/d2.html',
  './domains/d3.html',
  './domains/d4.html',
  './domains/d5.html',
  './domains/d6.html',
  './domains/d7.html',
  './domains/d8.html',
  './domains/d9.html',
  './domains/d10.html',
  './start/quiz.html',
  './pairing/pairing.html',
  './pairing/questionnaire.html',
  './pairing/waiting.html',
  './icon/favicon.png',
  './icon/logo.png',
  './js/scroll-lock.js',
  './js/config.js',
  './js/pairing-algorithm.js'
];
```

## 10) קובץ Service Worker מתוקן
- עודכן הקובץ `service-worker.js` לגרסה שמתאימה למבנה התיקיות הנוכחי ולנתיבים יחסיים לפרויקט.
