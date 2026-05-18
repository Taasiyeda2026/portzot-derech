import { BACKGROUNDS as ALL_BACKGROUNDS } from '../products/physical/config.js';

// ─── הוספת בית ספר חדש ───────────────────────────────────────────────────────
//
// 1. הוסיפי ערך ל-SCHOOLS עם slug ייחודי (רק אותיות קטנות, מספרים ומקפים)
// 2. שימי לוגו בתיקייה:  /poster-builder/assets/logos/<slug>.png
// 3. בחרי עד 5 רקעים מתוך הרשימה ב-physical/config.js (bg-tech1 עד bg-tech15)
// 4. הגדירי רשימת שאלות: כל שאלה היא [מזהה-שדה, תווית, מקס-תווים]
//    מזהי שדות חייבים להיות זהים לאלה בראש הרשימה — אל תמציאי מזהים חדשים.
//
// קישור לתלמידות:  /poster-builder/product/physical.html?school=<slug>
// ─────────────────────────────────────────────────────────────────────────────

const SCHOOLS = {
  default: {
    name: 'פורצות דרך',
    logo: null,
    backgroundIds: null,
    questions: null
  }

  // דוגמה — העתיקי והתאימי לכל בית ספר:
  // 'school-a': {
  //   name: 'בית ספר א',
  //   logo: '/poster-builder/assets/logos/school-a.png',
  //   backgroundIds: ['bg-tech1', 'bg-tech2', 'bg-tech3'],
  //   questions: [
  //     ['projectName',                 'שם הפרויקט',               20],
  //     ['studentNames',                'שמות החברות בקבוצה',        80],
  //     ['className',                   'כיתה',                     30],
  //     ['schoolName',                  'בית הספר',                  50],
  //     ['description',                 'תיאור המיזם בקצרה',         75],
  //     ['problem',                     'מה הבעיה שזיהיתן?',        130],
  //     ['audience',                    'מי מושפעת מהבעיה?',         75],
  //     ['researchQuestion',            'שאלת החקר שלנו',            90],
  //     ['research_1',                  'חקר שביצענו 1',             42],
  //     ['research_2',                  'חקר שביצענו 2',             42],
  //     ['research_3',                  'חקר שביצענו 3',             42],
  //     ['findings',                    'מה גיליתן?',               110],
  //     ['requirements_1',              'דרישה מהפתרון 1',           42],
  //     ['requirements_2',              'דרישה מהפתרון 2',           42],
  //     ['requirements_3',              'דרישה מהפתרון 3',           42],
  //     ['solution',                    'מה הפתרון שפיתחתן?',       130],
  //     ['howItWorks_1',                'איך משתמשים? 1',            42],
  //     ['howItWorks_2',                'איך משתמשים? 2',            42],
  //     ['howItWorks_3',                'איך משתמשים? 3',            42],
  //     ['value',                       'הערך המרכזי של הפתרון',    110],
  //     ['feedbackReceived',            'משוב שקיבלנו',             110],
  //     ['improvementsAfterFeedback',   'מה שיפרנו בעקבות המשוב',  110],
  //     ['slogan',                      'סלוגן לפוסטר',              60]
  //   ]
  // }
};

export const KNOWN_SCHOOL_SLUGS = new Set(Object.keys(SCHOOLS));

export function getSchoolConfig(slug) {
  const school = SCHOOLS[slug];
  if (!school) return null;

  const backgrounds = school.backgroundIds
    ? school.backgroundIds.slice(0, 5).map((id) => ALL_BACKGROUNDS.find((bg) => bg.id === id)).filter(Boolean)
    : null;

  return {
    slug,
    name: school.name,
    logo: school.logo,
    backgrounds,
    questions: school.questions
  };
}
