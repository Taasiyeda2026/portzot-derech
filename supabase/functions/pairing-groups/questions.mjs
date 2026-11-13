export const questions = [
  {
    field: 'displayName',
    eyebrow: 'רגע, איך קוראים לך? ✨',
    text: 'איך לקרוא לך בקבוצה?',
    options: []
  },
  {
    field: 'mainDomain',
    eyebrow: 'מה מסקרן אותך? 🔎',
    text: 'איזה עולם הכי בא לך לחקור בלי שזה ירגיש כמו שיעור?',
    options: [
      { label: 'חיים דיגיטליים, טלפונים וכל מה שקורה לנו במסך', code: 'digital_life' },
      { label: 'לחץ, לימודים, התארגנות וכל ה"יש לי מלא דברים לעשות"', code: 'learning_stress_organization' },
      { label: 'חברות, הודעות, שיחות וכל הדרמות הקטנות שבדרך', code: 'social_communication' },
      { label: 'טבע, חיות, סביבה וכל מה שצריך לשמור עליו', code: 'environment_animals' },
      { label: 'הרגלים, בחירות יומיומיות והדברים הקטנים שמשפיעים עלינו', code: 'daily_choices_habits' },
      { label: 'יצירה, תחביבים, פנאי וכל מה שעושה קצת כיף', code: 'leisure_creativity_hobbies' },
      { label: 'גוף, בריאות, ביטחון ותחושה טובה עם עצמי', code: 'health_wellbeing' },
      { label: 'בית, משפחה והסביבה הקרובה', code: 'home_family' },
      { label: 'תנועה, מרחב, בטיחות ואיך מסתדרים בדרך', code: 'space_mobility_safety' },
      { label: 'העתיד, רעיונות חדשים ודברים שעוד לא קיימים', code: 'future_ideas' }
    ]
  },
  {
    field: 'problemType',
    eyebrow: 'איזו בעיה מדגדגת לך? 🧩',
    text: 'איזה סוג בעיה הכי בא לך לפצח?',
    options: [
      { label: 'משהו שמפריע ביום־יום וכולם כבר התרגלו אליו', code: 'daily_life_issue' },
      { label: 'משהו חברתי בין אנשים, הודעות, הבנות ואי־הבנות', code: 'social_issue' },
      { label: 'משהו שקשור ללמידה, בית ספר או עומס', code: 'learning_issue' },
      { label: 'משהו שקשור לבטיחות או לזהירות', code: 'safety_issue' },
      { label: 'משהו שקשור לסביבה, טבע או בעלי חיים', code: 'environment_issue' },
      { label: 'משהו שקשור לזמן, סדר, נוחות או "למה זה כזה מסובך?"', code: 'efficiency_issue' },
      { label: 'משהו שקשור לתקשורת, בלבול או חוסר הבנה', code: 'communication_issue' },
      { label: 'משהו שקשור לביטחון עצמי, אומץ או תחושת מסוגלות', code: 'self_efficacy_issue' }
    ]
  },
  {
    field: 'infoProcessingStyle',
    eyebrow: 'רגע של וואטסאפ 💬',
    text: 'הקבוצה התפוצצה מ־73 הודעות ואין לך מושג מה נסגר. מה הכי את?',
    options: [
      { label: 'חוזרת להתחלה וקוראת הכול כמו בלשית. אין מצב שאני מפספסת פרט.', code: 'thorough_reader' },
      { label: 'כותבת ישר: "רגע, אז מה הוחלט בסוף?"', code: 'decision_focused' },
      { label: 'מחפשת רק את ההודעה החשובה ומדלגת על כל הדרמה.', code: 'key_info_finder' },
      { label: 'מחכה שמישהי תסכם, כי בשביל זה יש חברות טובות.', code: 'summary_dependent' },
      { label: 'נכנסת לתפקיד המסדרת: "בנות, רגע, אני עושה סדר".', code: 'organizer' },
      { label: 'שמה על השתק. אם זה חשוב — כבר ימצאו אותי 😅', code: 'selective_attention' }
    ]
  },
  {
    field: 'planningStyle',
    eyebrow: 'יציאה מהבית ⏰',
    text: 'יש לך 20 דקות לצאת ואת עדיין לא באמת מוכנה. מה הכי את?',
    options: [
      { label: 'הכול כבר מוכן מראש. ברור.', code: 'planner' },
      { label: 'מתארגנת מהר ומסתדרת תוך כדי.', code: 'quick_executor' },
      { label: 'מתחילה ואז נזכרת בעוד חמישה דברים.', code: 'improviser' },
      { label: 'צריכה רשימה, אחרת משהו בטוח נשאר בבית.', code: 'checklist_oriented' },
      { label: 'בודקת עם חברה מה צריך להביא.', code: 'collaborative_planner' },
      { label: 'זורקת הכול לתיק ומקווה שהיקום איתי.', code: 'flexible' },
      { label: 'יושבת על המיטה "שנייה לנשום", ואז מגלה שעברו 21 דקות.', code: 'needs_transition_time' }
    ]
  },
  {
    field: 'choiceDriver',
    eyebrow: 'רגע של סדרה 🎬',
    text: 'כשאת בוחרת מה לראות, מה הכי קונה אותך?',
    options: [
      { label: 'חברה המליצה, וזה מספיק כדי לתת לזה צ׳אנס.', code: 'social_influence' },
      { label: 'הטריילר נראה טוב, אז אני בפנים.', code: 'visual_thinker' },
      { label: 'הסיפור נשמע מעניין, זה מה שתופס אותי.', code: 'concept_oriented' },
      { label: 'הדמויות. אם התחברתי אליהן — הלך עליי.', code: 'empathy_user_focus' },
      { label: 'אם כולן מדברות על זה, אני חייבת להבין על מה הרעש.', code: 'trend_sensitive' },
      { label: 'קודם בודקת ביקורות. לא נופלת בפח כל כך מהר.', code: 'researcher' }
    ]
  },
  {
    field: 'naturalTeamContribution',
    eyebrow: 'הפקת יום הולדת 🎉',
    text: 'מתכננות יום הולדת לחברה. איזה תפקיד נופל עלייך טבעי?',
    options: [
      { label: 'זורקת רעיונות לקונספט כאילו אני משרד פרסום.', code: 'ideas' },
      { label: 'מסדרת מי מביאה מה, כי אחרת זה ייגמר בשלוש עוגות ובלי כוסות.', code: 'organization' },
      { label: 'מעצבת הזמנה / תמונה / משהו שייראה טוב.', code: 'design' },
      { label: 'בודקת שלא שכחו אף אחת, כי זה באמת חשוב.', code: 'empathy_inclusion' },
      { label: 'מכינה פעילות או משחק, שיהיה משהו מעבר ל"יאללה עוגה".', code: 'experience_builder' },
      { label: 'מברכת, מציגה או מובילה את הרגע.', code: 'presentation' },
      { label: 'עושה מאחורי הקלעים את הדברים שאף אחת לא שמה לב אליהם — אבל בלעדיהם כלום לא קורה.', code: 'support' }
    ]
  },
  {
    field: 'problemSolvingStyle',
    eyebrow: 'משבר טלפון 📱',
    text: 'הטלפון החליט לעשות דווקא. מה הצעד הראשון שלך?',
    options: [
      { label: 'מנסה לבד עד שזה מסתדר. אני והטלפון נסגור את זה בינינו.', code: 'persistence_trial_error' },
      { label: 'מחפשת בגוגל או בטיקטוק פתרון. בטוח מישהי כבר סבלה מזה לפניי.', code: 'independent_research' },
      { label: 'שואלת מישהי שמבינה. אין לי כוח להמציא את הגלגל.', code: 'asks_for_help' },
      { label: 'סוגרת, פותחת, מתפללת. הקלאסיקה.', code: 'simple_reset' },
      { label: 'מתעצבנת, עוזבת את זה רגע, וחוזרת כשאני פחות דרמטית.', code: 'needs_pause' },
      { label: 'נכנסת להגדרות ובודקת מה השתנה.', code: 'technical_checking' }
    ]
  },
  {
    field: 'visualCommunicationStyle',
    eyebrow: 'סטורי זה רציני 📸',
    text: 'עלית לסטורי. מה הכי חשוב לך שלא יתפקשש?',
    options: [
      { label: 'שייראה יפה. בואו, יש סטנדרטים.', code: 'aesthetics' },
      { label: 'שיעביר בדיוק את התחושה.', code: 'emotional_message' },
      { label: 'שיהיה מצחיק או מקורי, לא עוד סטורי משעמם.', code: 'originality' },
      { label: 'שיהיה ברור ולא עמוס. אנשים צריכים להבין מהר.', code: 'clarity' },
      { label: 'שיתאים למה שרציתי להגיד.', code: 'message_fit' },
      { label: 'אני לא משקיעה בזה יותר מדי. סטורי זה סטורי.', code: 'practical_minimal' }
    ]
  },
  {
    field: 'groupBehaviorPattern',
    eyebrow: 'עבודה בקבוצה 🤝',
    text: 'כשבאמת מתחילה עבודה בקבוצה, איפה את נכנסת לתמונה?',
    options: [
      { label: 'קודם מבינה מה כולן רוצות לעשות, ואז נכנסת חכם.', code: 'listener' },
      { label: 'מציעה רעיון להתחלה, רק שיהיה מאיפה לזוז.', code: 'initiator' },
      { label: 'שואלת "רגע, מי עושה מה?" כי מישהי צריכה לעשות סדר.', code: 'task_organizer' },
      { label: 'מחכה רגע לראות איפה באמת צריך אותי.', code: 'adaptive' },
      { label: 'לוקחת חלק אחד ועושה אותו טוב עד הסוף.', code: 'focused_executor' },
      { label: 'מחברת בין כולן כשזה מתחיל להתפזר.', code: 'connector' }
    ]
  },
  {
    field: 'conflictStyle',
    eyebrow: 'כשיש קצת בלגן 🌀',
    text: 'יש דעות שונות בקבוצה. מה בדרך כלל עוזר לך?',
    options: [
      { label: 'לדבר רגע ולמצוא פשרה.', code: 'compromise' },
      { label: 'להצביע ולהחליט. דמוקרטיה וזה.', code: 'vote_decision' },
      { label: 'לבדוק מה הכי מתאים למטרה, לא למי צעקה יותר חזק.', code: 'goal_oriented' },
      { label: 'לתת לכל אחת להסביר את עצמה.', code: 'inclusive_discussion' },
      { label: 'לקרוא למדריכה לפני שזה נהיה פרק בסדרה.', code: 'facilitator_help' },
      { label: 'לקחת רגע לחשוב ואז לחזור לשיחה.', code: 'reflection_pause' }
    ]
  },
  {
    field: 'groupNeed',
    eyebrow: 'מה את צריכה שם? 💜',
    text: 'אם כבר להיות בקבוצה — מה הכי חשוב לך להרגיש שם?',
    options: [
      { label: 'שיש מקום לרעיונות שלי.', code: 'voice_space' },
      { label: 'שיש סדר ובהירות, כי כאוס זה לא תחביב.', code: 'clarity_structure' },
      { label: 'שאפשר לשאול בלי להתבייש.', code: 'psychological_safety' },
      { label: 'שכולן באמת משתתפות.', code: 'participation' },
      { label: 'שמתקדמים ולא נתקעים שעה על "מה נעשה?"', code: 'progress' },
      { label: 'שיש אווירה נעימה.', code: 'positive_atmosphere' },
      { label: 'שאני יודעת מה התפקיד שלי ולא מרחפת באוויר.', code: 'role_clarity' }
    ]
  },
  {
    field: 'groupComfortLevel',
    eyebrow: 'קבוצה חדשה ✨',
    text: 'נכנסת לקבוצה חדשה. איך זה מרגיש לך בדרך כלל?',
    options: [
      { label: 'ממש נוח לי. אני נכנסת כאילו הייתי שם מההתחלה.', code: 'high_comfort' },
      { label: 'די נוח לי, לוקח רגע וזה מסתדר.', code: 'medium_high_comfort' },
      { label: 'לוקח לי קצת זמן, אבל בסוף אני משתלבת.', code: 'gradual_comfort' },
      { label: 'אני צריכה שמישהי תעזור לי להיכנס לעניינים.', code: 'needs_inclusion_support' },
      { label: 'תלוי בקבוצה. יש קבוצות שאני זורמת ויש קבוצות שאני על מצב שקט.', code: 'context_dependent' }
    ]
  },
  {
    field: 'neededTeamSupport',
    eyebrow: 'מי עוזרת לך לפרוח? 🌱',
    text: 'איזה סוג של חברה הכי עוזר לך לעבוד טוב?',
    options: [
      { label: 'מישהי שמארגנת ומסדרת.', code: 'needs_organization' },
      { label: 'מישהי שמעלה רעיונות.', code: 'needs_ideas' },
      { label: 'מישהי שמרגיעה כשיש לחץ.', code: 'needs_calm' },
      { label: 'מישהי שמובילה החלטות כשכולן מתלבטות.', code: 'needs_decision_leader' },
      { label: 'מישהי שטובה בהצגה.', code: 'needs_presentation' },
      { label: 'מישהי שטובה בביצוע ובנייה.', code: 'needs_execution' },
      { label: 'מישהי שמקשיבה ועוזרת לכולן להשתלב.', code: 'needs_connector' }
    ]
  },
  {
    field: 'startStyle',
    eyebrow: 'יוצאות לדרך 🚀',
    text: 'יש משימה חדשה על הפרק. מה האינסטינקט הראשון שלך?',
    options: [
      { label: 'להתחיל מהר ולשפר תוך כדי.', code: 'prototype_fast' },
      { label: 'להבין קודם מה המטרה.', code: 'goal_first' },
      { label: 'לראות דוגמה ואז לנסות.', code: 'example_based' },
      { label: 'לדבר עם הקבוצה ולבנות כיוון.', code: 'collaborative_direction' },
      { label: 'לחלק משימות ולהתחיל לעבוד.', code: 'task_execution' },
      { label: 'לחפש רעיונות לפני שמחליטים.', code: 'inspiration_research' }
    ]
  }
];
