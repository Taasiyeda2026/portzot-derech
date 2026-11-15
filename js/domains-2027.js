/* Shared article reader. Content remains in static HTML in both languages. */
(() => {
  'use strict';

  // The chapter bar belongs to the sticky header, not the article content.
  // Highlight the currently visible section; the domain index is an exit link.
  const chapterNav = document.querySelector('.chapter-nav');
  const masthead = document.querySelector('.masthead');
  if (chapterNav && masthead) {
    const bar = masthead.querySelector('.bar');
    const tools = bar?.querySelector('.tools');
    if (tools) bar.insertBefore(chapterNav, tools);
    const sections = ['main-article', 'closeup', 'thoughts'].map(id => ({
      element: document.getElementById(id),
      link: chapterNav.querySelector('a[href="#' + id + '"]')
    })).filter(item => item.element && item.link);
    let framePending = false;
    const headerOffset = () => Math.ceil(masthead.getBoundingClientRect().height) + 12;
    function highlightSection() {
      framePending = false;
      if (!sections.length) return;
      let current = sections[0];
      const threshold = headerOffset() + Math.min(220, Math.max(28, (window.innerHeight - headerOffset()) * .32));
      for (const section of sections) {
        if (section.element.getBoundingClientRect().top <= threshold) current = section;
      }
      const root = document.documentElement;
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= root.scrollHeight - 4) current = sections[sections.length - 1];
      for (const section of sections) {
        if (section === current) section.link.setAttribute('aria-current', 'location');
        else section.link.removeAttribute('aria-current');
      }
    }
    function scheduleHighlight() {
      if (!framePending) {
        framePending = true;
        requestAnimationFrame(highlightSection);
      }
    }
    function updateOffset() {
      document.documentElement.style.scrollPaddingTop = headerOffset() + 'px';
      scheduleHighlight();
    }
    window.addEventListener('scroll', scheduleHighlight, {passive:true});
    window.addEventListener('resize', updateOffset);
    window.addEventListener('hashchange', scheduleHighlight);
    if ('ResizeObserver' in window) new ResizeObserver(updateOffset).observe(masthead);
    updateOffset();
    highlightSection();
  }

  // Editorial emphasis: choose existing conceptual language, never invent a solution.
  // A maximum of one phrase per section, chosen from domain-specific vocabulary;
  // unrelated paragraphs and the original text remain untouched.
  const concepts = {
    he: {
      1: ['תחושת האנרגיה','אותות מהגוף','המצב הבריאותי','עייפות מתמשכת','משך השינה','טמפרטורת הגוף','קצב הלב','עומס חום','מדדים','התאוששות','תנועה','שיווי משקל','הרגלי שינה','תחושת רעב','צרכים שונים','מגבלות'],
      2: ['הקשר הנכון','מקור המידע','פרטיות','הטעיה','מקור ועריכות','בינה מלאכותית','מידע אישי','טביעת רגל','כתובת דואר','גישה למידע','זהות דיגיטלית','נגישות','שיתוף מידע','אלגוריתם','אמינות','המידע החסר'],
      3: ['תור לברזייה','שטח פנוי','תכנון החצר','רשימות רצונות שונות','כללים שאינם כתובים','מקום שקט','גישה לשיעורים','תשתיות','זיכרון','עומס','ריכוז','חומר הלימוד','למידה','הפסקה','מרחב','סדר עדיפויות','זמן'],
      4: ['חלוקת המידע','כללי ההשתתפות','כתובת מדויקת','רשימת ציוד','שפת הסימנים','תחושת שייכות','מידע נגיש','כללים שאינם כתובים','מרחב ציבורי','הזדמנות','השתתפות','הזמנה','שייכות','אמון','שמועה'],
      5: ['רשימת הרכיבים','מדע החומרים','החזרת האור','מעבר חום','זווית שונה','שימוש יומיומי','עלות','רכיבים','אלרגנים','שחיקה','חומר','תכונה','אריזה','עמידות','שימוש','מחיר','מידע'],
      6: ['רציפות הנגישות','תחבורה ציבורית','שלוש יציאות','דיוק המיקום','מכשול','החזרי אותות','לוויינים','מסלול','מדרכה','תחנת האוטובוס','המרחק','מפה','ניווט','זמן ההמתנה','עצמאות','דרך'],
      7: ['מרחב אישי','עוצמת האור','החזרת האור','כיוון האור','סביבת העבודה','אקוסטיקה','אור טבעי','השתקפות','אוורור','אחסון','מגירה','רעש','פרטיות','תאורה','מרחב','חומרים'],
      8: ['מקום יבש','זיהוי מצוקה','מצב הקרקע','תנאי הגידול','מגוון ביולוגי','שינוי טמפרטורה','מקור אנרגיה','איכות האוויר','התחממות','מים','מחסה','פסולת','מערכת','סביבה','גידול','מדידה'],
      9: ['כללי המשחק','תהליך פיתוח','חוקי המשחק','ציוד אישי','גרסת ניסיון','משחק אינטראקטיבי','כתב ברייל','קצב','התנסות','אחיזה','תנועה','יצירה','תחביב','משחק','דמיון','שיתוף'],
      10:['בדיקה עצמאית','נקודת מוצא','גרסת ניסיון','מעבר חום','מערכות חכמות','חומר שיכול לשנות צורה','חיישנים','בקרה אנושית','רובוטיקה','חומרים','תנאים','מנגנון','דיוק','טכנולוגיה','אנרגיה','פיתוח','עתיד'],
      common:['צורך שלא','פער בין','צרכים שונים','מגבלות','גישה','תכנון','מידע חסר','תנאים שונים','החלטות','אפשרויות','ניסוי','בחירה','קושי','תסכול','הזדמנות','שימוש','התאמה','מקום','זמן']
    },
    ar: {
      1:['مستوى الطاقة','مؤشرات الساعة','التعب المستمر','الحالة الصحية','درجة حرارة الجسم','معدل ضربات القلب','إشارات الجسم','النوم','الإرهاق','التعافي','التوازن','الحركة','احتياجات مختلفة','قيود'],
      2:['مصدر المعلومات','المعلومات الشخصية','الذكاء الاصطناعي','السياق','الخصوصية','التضليل','الوصول إلى المعلومات','الهوية الرقمية','المعلومات','الخوارزميات','الثقة','التوثيق','التعديلات','المصداقية'],
      3:['مساحة فارغة','تصميم الساحة','مكان هادئ','البنية التحتية','الوصول إلى الدروس','قواعد غير مكتوبة','وقت الاستراحة','الاستراحة','الذاكرة','التركيز','التعلم','المساحة','الوقت','الأولويات','احتياجات'],
      4:['توزيع المعلومات','قواعد المشاركة','عنوانًا دقيقًا','قائمة بالأدوات','لغة الإشارة','الشعور بالانتماء','المشاركة','المعلومات','الانتماء','الدعوة','فرصة','الثقة','الإشاعة','الحيز العام'],
      5:['قائمة المكونات','انعكاس الضوء','انتقال الحرارة','الاستخدام اليومي','مسببات الحساسية','المادة','المواد','المكونات','الملحقات','السعر','التكلفة','التغليف','الاستخدام','الاحتكاك','المعلومات'],
      6:['وسائل النقل العام','دقة الموقع','انعكاس الإشارات','ثلاثة مخارج','المسار','الرصيف','محطة','الانتظار','المسافة','الخريطة','الملاحة','الاستقلالية','العقبات','الطريق'],
      7:['المساحة الشخصية','اتجاه الضوء','انعكاس الضوء','سطح لامع','التهوية','الإضاءة','الانعكاس','الخصوصية','الضجيج','التخزين','المساحة','الأثاث','الظل','المواد'],
      8:['حالة التربة','مكانًا جافًا','التنوع البيولوجي','ظروف النمو','درجة الحرارة','جودة الهواء','الطاقة','الماء','المأوى','النفايات','البيئة','القياس','النمو','المراقبة'],
      9:['قواعد اللعب','عملية التطوير','معدات شخصية','نسخة تجريبية','لعبة تفاعلية','لغة برايل','نقاط برايل','التجربة','الخيال','الإبداع','الحركة','الهوايات','اللعب','المشاركة','التطوير'],
      10:['التحقق المستقل','نقطة بداية','انتقال الحرارة','نسخة تجريبية','مواد ذكية','الاستشعار','حساسات','الروبوتات','الطاقة','الآلية','التكنولوجيا','المواد','الدقة','الظروف','التطوير','المستقبل'],
      common:['احتياجات مختلفة','ظروف مختلفة','المعلومات الناقصة','إمكانية','القيود','الحاجة','التصميم','الاختيار','التجربة','القرار','الفرصة','الصعوبة','الاستخدام','المكان','الوقت']
    }
  };
  // Specific phrases in articles where general vocabulary is not sufficiently precise.
  const articleConcepts = {
  "he": {
    "d1-a01": [
      "השעון הביולוגי",
      "שמונה לעשר שעות",
      "הצלצול הראשון"
    ],
    "d1-a03": [
      "ירידה בשמיעה",
      "תחושות הרטט",
      "להשתתף בה"
    ],
    "d2-a07": [
      "נלקחה ממנה בחירה",
      "משמעות של השיתוף",
      "חוסר הוודאות"
    ],
    "d3-a05": [
      "רשימות רצונות שונות",
      "שטח פנוי",
      "תחושה של מרחב או של זמן"
    ],
    "d4-a03": [
      "מחייה הפרטיים",
      "המקומות החסרים",
      "התפצלה להרבה שיחות קטנות"
    ],
    "d5-a08": [
      "התפקיד שלה השתנה",
      "תפקיד חדש",
      "פתיחה וסגירה"
    ],
    "d7-a06": [
      "קנה מידה",
      "חוסמת את הדרך",
      "המעבר הקטן לידו"
    ]
  },
  "ar": {
    "d1-a03": [
      "الجهد المطلوب لفهم الكلام وسط الضجيج",
      "الإحساس بالاهتزازات",
      "المشاركة فيها"
    ],
    "d1-a05": [
      "اللحظة المناسبة لاستخدامها",
      "تنظيم درجة الحرارة",
      "ما تفعله أيدينا",
      "في متناول يدك"
    ],
    "d2-a01": [
      "اختيارًا صغيرًا",
      "عشرات الانتقالات الصغيرة",
      "كم سيستغرق النظر إليه"
    ],
    "d2-a02": [
      "عمل إبداعي وتضليل",
      "الصورة أصلية",
      "الفرق بين رواية حكاية والادعاء"
    ],
    "d2-a03": [
      "البيانات نفسها",
      "أنماط المشاهدة والبحث والاستخدام",
      "التوصية الشخصية"
    ],
    "d2-a05": [
      "أسماء ملفات",
      "تتوزع الذكريات",
      "مساحة فارغة"
    ],
    "d2-a08": [
      "نماذج مسجلة",
      "انتحال الهوية باستنساخ الصوت",
      "صوت مصنوع اصطناعيًا"
    ],
    "d3-a01": [
      "انتقالات وتغييرات",
      "دون تفكيك بقية المحتويات",
      "مكانًا تتركها فيه"
    ],
    "d3-a02": [
      "معلومة يمكنك إخراجها من الذاكرة",
      "محاولة الاسترجاع",
      "ربط الأفكار"
    ],
    "d3-a03": [
      "الأماكن نفسها التي كانت مشغولة",
      "العثور على شريكات",
      "انتظار الشريكة"
    ],
    "d4-a03": [
      "حياتها الخاصة",
      "تمتلئ الفراغات",
      "الحكاية الأصلية"
    ],
    "d4-a04": [
      "أمر لم تفهميه",
      "مساعدة عن بُعد",
      "العثور على الكلمات"
    ],
    "d4-a06": [
      "إحضار حاسوب محمول",
      "المبتدئتين",
      "الحاسوب الذي لم يكن لديها"
    ],
    "d5-a06": [
      "حساسية غذائية",
      "قائمة المكوّنات",
      "الكلمات الصغيرة"
    ],
    "d5-a08": [
      "الذي تغيّر هو دورها",
      "دورًا جديدًا",
      "مئات الفتحات الأخرى"
    ],
    "d7-a01": [
      "قيمة الأغراض",
      "مساحتك الخاصة",
      "الدرج عميق أكثر مما يلزم"
    ],
    "d8-a03": [
      "الاختفاء من مجال النظر",
      "مسارات حركة",
      "النظافة المرئية"
    ],
    "d8-a04": [
      "مثلّث الظلّ الضيّق",
      "امتصاص الحرارة وتخزينها",
      "المقعد الفارغ"
    ],
    "d9-a06": [
      "هيئة هندسية",
      "استجابتين للتجربة نفسها",
      "نمط اهتزاز"
    ],
    "d9-a07": [
      "كيف ستجدينها",
      "إن كانت هناك مبتدئات",
      "تحب المواد نفسها"
    ],
    "d10-a02": [
      "التفريغ الآلي للكلام",
      "تنوع الأصوات واللهجات",
      "الكلمة الخاطئة في التفريغ"
    ],
    "d10-a04": [
      "نظام الأكسجين",
      "إعادة تدوير المياه",
      "تأخر وصول إشارات الاتصال"
    ]
  }
};
  function emphasizeConcepts() {
    const domain = Number(document.body.dataset.domain);
    if (!domain) return;
    const lang = document.documentElement.lang === 'ar' ? 'ar' : 'he';
    const domainPhrases = [...concepts[lang][domain], ...concepts[lang].common];
    const roots = [document.querySelector('.main-article'), ...document.querySelectorAll('.reader-body')].filter(Boolean);
    for (const root of roots) {
      const articleId = root.closest('dialog')?.id || ('d' + domain + '-main');
      const phrases = [...(articleConcepts[lang][articleId] || []), ...domainPhrases];
      const used = new Set();
      for (const section of root.querySelectorAll(':scope > section')) {
        const ps = [...section.querySelectorAll(':scope > p')];
        let hit = null;
        for (const phrase of phrases) {
          if (used.has(phrase)) continue;
          // Match whole phrases/words, including common attached Hebrew/Arabic prefixes.
          for (const p of ps) {
            if (p.children.length || p.textContent.length < 60 || !p.firstChild) continue;
            const s = p.textContent;
            let from = 0;
            while (from < s.length) {
              const at = s.indexOf(phrase, from);
              if (at < 0) break;
              const end = at + phrase.length;
              const before = at > 0 ? s[at-1] : '';
              const after = s[end] || '';
              const letter = c => /[\p{L}\p{M}]/u.test(c);
              if (!letter(after) && (!letter(before) || (lang === 'he' ? 'ובכלמשה' : 'وفبال').includes(before))) {
                hit = {p, at, end, phrase}; break;
              }
              from = at + 1;
            }
            if (hit) break;
          }
          if (hit) break;
        }
        if (!hit) continue;
        const {p, at, end, phrase} = hit;
        const value = p.textContent;
        const mark = document.createElement('strong');
        mark.className = 'concept-emphasis';
        mark.textContent = value.slice(at, end);
        p.replaceChildren(document.createTextNode(value.slice(0, at)), mark, document.createTextNode(value.slice(end)));
        used.add(phrase);
      }
    }
  }
  emphasizeConcepts();

  const dialogs = [...document.querySelectorAll('dialog[data-article]')];
  let active = null;
  let returnFocus = null;
  let initialHash = '';
  const byId = id => dialogs.find(dialog => dialog.id === id);
  function setHash(hash) {
    const url = new URL(location.href);
    url.hash = hash;
    history.replaceState(history.state, '', url);
  }
  function open(dialog, trigger, fromHash = false) {
    if (!dialog) return;
    if (!active) {
      returnFocus = trigger || document.querySelector(`[aria-controls="${dialog.id}"]`);
      initialHash = fromHash ? '' : location.hash;
    }
    if (active && active !== dialog) {
      const old = active;
      active = dialog;
      old.close();
    } else active = dialog;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('reader-open');
    dialog.scrollTop = 0;
    dialog.querySelector('[data-close]').focus({preventScroll:true});
    setHash(dialog.id);
  }
  function close() {
    if (active) active.close();
  }
  document.querySelectorAll('[data-open-article]').forEach(button => {
    button.addEventListener('click', () => open(byId(button.dataset.openArticle), button));
  });
  dialogs.forEach((dialog, index) => {
    dialog.querySelector('[data-close]').addEventListener('click', close);
    dialog.querySelector('[data-prev]').addEventListener('click', () => open(dialogs[index-1]));
    dialog.querySelector('[data-next]').addEventListener('click', () => open(dialogs[index+1]));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    dialog.addEventListener('close', () => {
      // A close event from the previous article must not close its successor.
      if (active !== dialog || dialog.open) return;
      active = null;
      document.body.classList.remove('reader-open');
      setHash(initialHash);
      returnFocus?.focus({preventScroll:true});
    });
  });
  function readHash() {
    const dialog = byId(location.hash.slice(1));
    if (dialog) open(dialog, null, true);
    else if (active) close();
  }
  window.addEventListener('hashchange', readHash);
  readHash();
  if ('serviceWorker' in navigator) {
    const root = new URL('../', document.currentScript.src);
    window.addEventListener('load', () => navigator.serviceWorker.register(new URL('service-worker.js', root), {updateViaCache:'none'}).catch(() => {}));
  }
})();
