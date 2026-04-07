export const POSTER_SIZES = {
  A4: { label: 'A4 לאורך', width: 2480, height: 3508 },
  A3: { label: 'A3 לאורך', width: 3508, height: 4961 }
};

export const BACKGROUNDS = [
  { id: 'none', name: 'ללא רקע', path: null },
  { id: 'bg-tech1', name: 'רקע 1', path: '../assets/backgrounds/bg-tech1.png' },
  { id: 'bg-tech2', name: 'רקע 2', path: '../assets/backgrounds/bg-tech2.png' },
  { id: 'bg-tech3', name: 'רקע 3', path: '../assets/backgrounds/bg-tech3.png' },
  { id: 'bg-tech4', name: 'רקע 4', path: '../assets/backgrounds/bg-tech4.png' },
  { id: 'bg-tech5', name: 'רקע 5', path: '../assets/backgrounds/bg-tech5.png' },
  { id: 'bg-tech6', name: 'רקע 6', path: '../assets/backgrounds/bg-tech6.png' }
];

export const ELEMENTS = Array.from({ length: 56 }, (_, index) => ({
  id: `icon${index + 1}`,
  name: `אלמנט ${index + 1}`,
  path: `../assets/elements/icon${index + 1}.png`
}));

export const FONT_OPTIONS = [
  { id: 'ibm-regular', label: 'IBM Plex Sans Hebrew', family: 'IBMPlexSansHebrew', weight: 400, file: '../assets/fonts/IBMPlexSansHebrew-Regular.ttf' },
  { id: 'ibm-medium', label: 'IBM Plex Sans Hebrew Medium', family: 'IBMPlexSansHebrew', weight: 500, file: '../assets/fonts/IBMPlexSansHebrew-Medium.ttf' },
  { id: 'ibm-bold', label: 'IBM Plex Sans Hebrew Bold', family: 'IBMPlexSansHebrew', weight: 700, file: '../assets/fonts/IBMPlexSansHebrew-Bold.ttf' },
  { id: 'alef-regular', label: 'Alef', family: 'Alef', weight: 400, file: '../assets/fonts/Alef-regular.ttf' },
  { id: 'alef-bold', label: 'Alef Bold', family: 'Alef', weight: 700, file: '../assets/fonts/Alef-bold.ttf' },
  { id: 'gveret', label: 'GveretLevin (עיצובי)', family: 'GveretLevin', weight: 400, file: '../assets/fonts/GveretLevin-Regular.ttf' }
];

export const PALETTES = [
  { name: 'כחול טכנולוגי', colors: ['#1F3A5F', '#3F6EA8', '#8FB7E8', '#DCEBFA', '#F7FAFF'] },
  { name: 'סגול רך', colors: ['#5B4B8A', '#7D6BB3', '#B7A8DD', '#EAE3F8', '#FAF8FE'] },
  { name: 'טורקיז נקי', colors: ['#1D6F78', '#2FA3B1', '#8ED5DB', '#DDF4F6', '#F7FCFD'] },
  { name: 'ורוד מעושן', colors: ['#8F5F73', '#C0869F', '#E2BED0', '#F6E8EF', '#FDF9FB'] },
  { name: 'אפור אלגנטי', colors: ['#495057', '#6C757D', '#ADB5BD', '#E9ECEF', '#F8F9FA'] }
];

export const TEXT_PRESETS = [
  { id: 'title', label: 'כותרת', text: 'כותרת כאן', size: 84, weight: 700 },
  { id: 'subtitle', label: 'תת-כותרת', text: 'תת-כותרת כאן', size: 52, weight: 500 },
  { id: 'body', label: 'גוף טקסט', text: 'הקלידי כאן טקסט', size: 38, weight: 400 },
  { id: 'short', label: 'טקסט קצר', text: 'טקסט קצר', size: 32, weight: 400 },
  { id: 'quote', label: 'ציטוט / הדגשה', text: '"רעיון מרכזי"', size: 44, weight: 500 }
];

export const CONTENT_BOXES = [
  { id: 'header-box', label: 'תיבת כותרת', title: 'כותרת', text: 'כתבי כאן כותרת קצרה' },
  { id: 'content-box', label: 'תיבת תוכן', title: 'תוכן', text: 'כתבי כאן תוכן מפורט יותר' },
  { id: 'question-box', label: 'תיבת שאלה', title: 'שאלה', text: 'מה רצינו לבדוק?' },
  { id: 'insight-box', label: 'תיבת תובנה', title: 'תובנה', text: 'מה למדנו מהחקר?' },
  { id: 'fact-box', label: 'תיבת עובדה', title: 'עובדה', text: 'עובדה חשובה להצגה' },
  { id: 'emphasis-box', label: 'תיבת דגש', title: 'דגש', text: 'מסר חשוב במיוחד' }
];

export const TEMPLATE_LAYOUT = [
  { type: 'title', text: 'כותרת החקר', top: 120, left: 2200, size: 96 },
  { type: 'subtitle', text: 'תת-כותרת קצרה וממוקדת', top: 280, left: 2200, size: 52 },
  { type: 'box', title: 'הבעיה', text: 'מה הבעיה שבחרנו לחקור?', top: 500, left: 2200, width: 2050, height: 560 },
  { type: 'box', title: 'קהל יעד', text: 'למי הפתרון מיועד?', top: 1120, left: 2200, width: 980, height: 540 },
  { type: 'box', title: 'רעיון / פתרון', text: 'מה הרעיון שפיתחנו?', top: 1120, left: 1180, width: 1030, height: 540 },
  { type: 'box', title: 'תמונה / המחשה', text: 'אפשר להוסיף כאן תמונה או אייקונים', top: 1720, left: 2200, width: 2050, height: 920 },
  { type: 'box', title: 'מסקנה / תובנה', text: 'מה המסקנה העיקרית?', top: 2700, left: 2200, width: 2050, height: 520 },
  { type: 'footer', text: 'שם התלמידה / הקבוצה', top: 3320, left: 2200, size: 42 }
];

export const SAFE_MARGIN = 120;
