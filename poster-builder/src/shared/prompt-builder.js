function gcdCalc(a, b) {
  return b === 0 ? a : gcdCalc(b, a % b);
}

function slotRatio(slot) {
  const g = gcdCalc(slot.width, slot.height);
  const ratio = `${slot.width / g}:${slot.height / g}`;
  const orientation = slot.width > slot.height ? 'אופקי' : 'אנכי';
  return `${ratio} (${orientation})`;
}

export function buildPhysicalPrompts({ contentValues, promptAnswers, posterSize, getVisualSlots }) {
  const slots = getVisualSlots(posterSize || 'A4', 'physical');
  const mainSl = slots.find((s) => s.key === 'visual_1') || { width: 500, height: 420 };
  const useSl = slots.find((s) => s.key === 'visual_2') || { width: 500, height: 420 };

  const name = (contentValues.projectName || '').trim() || 'המיזם';
  const desc = (contentValues.description || '').trim();
  const prob = (contentValues.problem || '').trim();
  const aud = (contentValues.audience || '').trim();
  const sol = (contentValues.solution || '').trim();
  const val = (contentValues.value || '').trim();

  const ctx = name + (desc ? ` — ${desc}` : '');
  const m = [];
  m.push('צרי תמונת מוצר מקצועית עבור פוסטר חקר תלמידות.', '');
  m.push(`המיזם: "${ctx}".`);
  if (prob) m.push(`הבעיה: ${prob}${aud ? ` (עבור ${aud})` : ''}.`);
  if (sol) m.push(`המוצר: ${sol}.`);
  if (val) m.push(`ערך מרכזי: ${val}.`);
  m.push('');
  if (promptAnswers.main_whatToSee) m.push(`• בתמונה יש להציג: ${promptAnswers.main_whatToSee}.`);
  if (promptAnswers.main_appearance) m.push(`• אופן הצגת המוצר: ${promptAnswers.main_appearance}.`);
  if (promptAnswers.main_highlight) m.push(`• יש להבליט: ${promptAnswers.main_highlight}.`);
  if (promptAnswers.main_exclude) m.push(`ללא: ${promptAnswers.main_exclude}.`);
  m.push(`מפרט: יחס ${slotRatio(mainSl)}, רזולוציה גבוהה.`);

  const u = [];
  u.push('צרי תמונת שימוש ריאליסטית עבור פוסטר חקר תלמידות.', '');
  u.push(`המיזם: "${ctx}".`);
  if (prob) u.push(`הבעיה שנפתרת: ${prob}${aud ? ` עבור ${aud}` : ''}.`);
  if (sol) u.push(`המוצר שמשתמשים בו: ${sol}.`);
  if (promptAnswers.usage_action) u.push(`• הפעולה המוצגת: ${promptAnswers.usage_action}.`);
  if (promptAnswers.usage_where) u.push(`• מיקום: ${promptAnswers.usage_where}.`);
  if (promptAnswers.usage_exclude) u.push(`ללא: ${promptAnswers.usage_exclude}.`);
  u.push(`מפרט: יחס ${slotRatio(useSl)}, רזולוציה גבוהה.`);

  return { mainPrompt: m.join('\n'), usagePrompt: u.join('\n') };
}
