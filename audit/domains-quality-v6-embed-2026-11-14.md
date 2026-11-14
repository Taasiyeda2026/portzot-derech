# הטמעת סבב איכות v6 (6 העשרות + 10 שאלות בחירה)

מקור מחייב: `portzot_2027_quality_v6_delta.json`  
ייחוס מלא: `portzot_2027_final_content_patch_v6.json`  
דוח: `portzot_2027_quality_v6_report.md`

v6 גובר על ניסוחים קודמים. לא נגע בפריטים מחוץ לשש הכתבות ולמערכי שאלות המחשבה.

## היקף
- כתבות: `d3-a02`, `d3-a06`, `d4-a02`, `d4-a04`, `d7-a02`, `d7-a07`
- שאלות בחירה (שאלה רביעית בכל תחום): `d1`–`d10`
- HE מילה במילה + AR נאמן
- מקורות `q6-enrich-*` + תקצירי כרטיסים + התאמת תמונות

## בדיקות
- `domains-2027.test.cjs` 8/8
- `domains-2027-browser.cjs` PASS (`CHROME_BIN=/usr/bin/google-chrome`)
- `course-language*.test.cjs` 7/7
- השוואת עברית מדויקת לדלתא v6
