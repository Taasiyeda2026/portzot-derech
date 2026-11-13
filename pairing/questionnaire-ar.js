// Arabic presentation only; submissions use the canonical Hebrew labels and codes.
export const arabicQuestions = [
  {
    field: 'displayName',
    eyebrow: 'لحظة، ما اسمكِ؟ ✨',
    text: 'بأيّ اسم نناديكِ في المجموعة؟',
    options: []
  },
  {
    field: 'mainDomain',
    eyebrow: 'ما الذي يثير فضولكِ؟ 🔎',
    text: 'أيّ عالم ترغبين في استكشافه دون أن تشعري أنّكِ في درس؟',
    options: [
      { label: 'الحياة الرقمية والهواتف وكلّ ما يحدث لنا عبر الشاشة', code: 'digital_life' },
      { label: 'الضغط والدراسة والتنظيم وكلّ شعور «لديّ أشياء كثيرة أفعلها»', code: 'learning_stress_organization' },
      { label: 'الصديقات والرسائل والمحادثات وكلّ المواقف الصغيرة في الطريق', code: 'social_communication' },
      { label: 'الطبيعة والحيوانات والبيئة وكلّ ما ينبغي الحفاظ عليه', code: 'environment_animals' },
      { label: 'العادات والاختيارات اليومية والأشياء الصغيرة التي تؤثّر فينا', code: 'daily_choices_habits' },
      { label: 'الإبداع والهوايات ووقت الفراغ وكلّ ما يضيف بعض المتعة', code: 'leisure_creativity_hobbies' },
      { label: 'الجسم والصحّة والثقة والشعور بالرضا عن نفسي', code: 'health_wellbeing' },
      { label: 'البيت والعائلة والبيئة القريبة', code: 'home_family' },
      { label: 'الحركة والمكان والسلامة وكيف نتدبّر أمورنا في الطريق', code: 'space_mobility_safety' },
      { label: 'المستقبل والأفكار الجديدة والأشياء التي لم توجد بعد', code: 'future_ideas' }
    ]
  },
  {
    field: 'problemType',
    eyebrow: 'أيّ مشكلة تشدّ اهتمامكِ؟ 🧩',
    text: 'أيّ نوع من المشكلات ترغبين أكثر في حلّه؟',
    options: [
      { label: 'شيء يزعجنا يوميًا وقد اعتاد الجميع عليه', code: 'daily_life_issue' },
      { label: 'أمر اجتماعي بين الناس والرسائل والتفاهم وسوء الفهم', code: 'social_issue' },
      { label: 'شيء يتعلّق بالتعلّم أو المدرسة أو كثرة الأعباء', code: 'learning_issue' },
      { label: 'شيء يتعلّق بالسلامة أو الحذر', code: 'safety_issue' },
      { label: 'شيء يتعلّق بالبيئة أو الطبيعة أو الحيوانات', code: 'environment_issue' },
      { label: 'شيء يتعلّق بالوقت أو الترتيب أو الراحة أو «لماذا كلّ هذا التعقيد؟»', code: 'efficiency_issue' },
      { label: 'شيء يتعلّق بالتواصل أو الارتباك أو عدم الفهم', code: 'communication_issue' },
      { label: 'شيء يتعلّق بالثقة بالنفس أو الشجاعة أو الشعور بالقدرة', code: 'self_efficacy_issue' }
    ]
  },
  {
    field: 'infoProcessingStyle',
    eyebrow: 'لحظة واتساب 💬',
    text: 'امتلأت المجموعة بـ73 رسالة ولا تعرفين ما الذي جرى. أيّ ردّ يشبهكِ أكثر؟',
    options: [
      { label: 'أعود إلى البداية وأقرأ كلّ شيء كمحقّقة. لن تفوتني أيّ تفصيلة.', code: 'thorough_reader' },
      { label: 'أكتب فورًا: «لحظة، ماذا قرّرتنّ في النهاية؟»', code: 'decision_focused' },
      { label: 'أبحث فقط عن الرسالة المهمّة وأتجاوز كلّ الدراما.', code: 'key_info_finder' },
      { label: 'أنتظر أن تلخّص إحداهنّ، فلهذا وُجدت الصديقات المقرّبات.', code: 'summary_dependent' },
      { label: 'أتولّى التنظيم: «يا بنات، لحظة، سأرتّب الأمور».', code: 'organizer' },
      { label: 'أكتم الإشعارات. إن كان الأمر مهمًا فسيجدنني 😅', code: 'selective_attention' }
    ]
  },
  {
    field: 'planningStyle',
    eyebrow: 'الخروج من البيت ⏰',
    text: 'بقيت لكِ 20 دقيقة للخروج ولستِ جاهزة فعلًا بعد. ما الأقرب إليكِ؟',
    options: [
      { label: 'كلّ شيء جاهز مسبقًا. طبعًا.', code: 'planner' },
      { label: 'أستعدّ بسرعة وأتدبّر الأمور في أثناء ذلك.', code: 'quick_executor' },
      { label: 'أبدأ ثمّ أتذكّر خمسة أشياء أخرى.', code: 'improviser' },
      { label: 'أحتاج إلى قائمة، وإلّا سيبقى شيء في البيت بالتأكيد.', code: 'checklist_oriented' },
      { label: 'أسأل صديقة عمّا يجب إحضاره.', code: 'collaborative_planner' },
      { label: 'أرمي كلّ شيء في الحقيبة وآمل أن يحالفني الحظّ.', code: 'flexible' },
      { label: 'أجلس على السرير «لألتقط أنفاسي لحظة»، ثمّ أكتشف أنّ 21 دقيقة مرّت.', code: 'needs_transition_time' }
    ]
  },
  {
    field: 'choiceDriver',
    eyebrow: 'لحظة مسلسل 🎬',
    text: 'حين تختارين ما تشاهدينه، ما أكثر ما يجذبكِ؟',
    options: [
      { label: 'أوصت به صديقة، وهذا يكفي لأعطيه فرصة.', code: 'social_influence' },
      { label: 'الإعلان التشويقي يبدو جيّدًا، لذا سأشاهده.', code: 'visual_thinker' },
      { label: 'تبدو القصّة مثيرة للاهتمام، وهذا ما يشدّني.', code: 'concept_oriented' },
      { label: 'الشخصيات. إن تعلّقتُ بها فلا مجال للتراجع.', code: 'empathy_user_focus' },
      { label: 'إن كانت الجميع تتحدّث عنه، فلا بدّ أن أفهم سبب الضجّة.', code: 'trend_sensitive' },
      { label: 'أقرأ التقييمات أوّلًا. لا أُخدع بهذه السرعة.', code: 'researcher' }
    ]
  },
  {
    field: 'naturalTeamContribution',
    eyebrow: 'تنظيم عيد ميلاد 🎉',
    text: 'تخطّطن لعيد ميلاد صديقة. أيّ دور تتولّينه بطبيعتكِ؟',
    options: [
      { label: 'أطرح أفكارًا للفكرة العامّة وكأنّني وكالة إعلانات.', code: 'ideas' },
      { label: 'أنظّم من تُحضر ماذا، وإلّا سننتهي بثلاث كعكات ودون أكواب.', code: 'organization' },
      { label: 'أصمّم دعوة أو صورة أو شيئًا يبدو جميلًا.', code: 'design' },
      { label: 'أتأكّد أنّنا لم ننسَ إحداهنّ، فهذا مهمّ فعلًا.', code: 'empathy_inclusion' },
      { label: 'أحضّر نشاطًا أو لعبة، ليكون هناك ما هو أكثر من «هيا نأكل الكعكة».', code: 'experience_builder' },
      { label: 'ألقي التهنئة أو أقدّم الفقرة أو أقود اللحظة.', code: 'presentation' },
      { label: 'أنجز خلف الكواليس ما لا تلاحظه إحداهنّ، لكن من دونه لا يحدث شيء.', code: 'support' }
    ]
  },
  {
    field: 'problemSolvingStyle',
    eyebrow: 'أزمة هاتف 📱',
    text: 'قرّر الهاتف أن يعاندكِ. ما خطوتكِ الأولى؟',
    options: [
      { label: 'أحاول وحدي حتى يعمل. سأحلّ الأمر بيني وبين الهاتف.', code: 'persistence_trial_error' },
      { label: 'أبحث عن حلّ في جوجل أو تيك توك. بالتأكيد عانت إحداهنّ من هذا قبلي.', code: 'independent_research' },
      { label: 'أسأل من تفهم في الأمر. لا طاقة لي لإعادة اختراع العجلة.', code: 'asks_for_help' },
      { label: 'أغلقه، أفتحه، وأدعو. الطريقة الكلاسيكية.', code: 'simple_reset' },
      { label: 'أنزعج وأتركه قليلًا ثمّ أعود حين أكون أهدأ.', code: 'needs_pause' },
      { label: 'أدخل إلى الإعدادات وأفحص ما الذي تغيّر.', code: 'technical_checking' }
    ]
  },
  {
    field: 'visualCommunicationStyle',
    eyebrow: 'الستوري أمر جدّي 📸',
    text: 'تنشرين ستوري. ما أهمّ شيء لا تريدين أن يفسد؟',
    options: [
      { label: 'أن يبدو جميلًا. مهلًا، لدينا معايير.', code: 'aesthetics' },
      { label: 'أن ينقل الإحساس بدقّة.', code: 'emotional_message' },
      { label: 'أن يكون مضحكًا أو مبتكرًا، لا ستوري مملًا آخر.', code: 'originality' },
      { label: 'أن يكون واضحًا وغير مزدحم. يجب أن يفهم الناس بسرعة.', code: 'clarity' },
      { label: 'أن يعبّر عمّا أردتُ قوله.', code: 'message_fit' },
      { label: 'لا أبذل فيه جهدًا كبيرًا. الستوري يبقى ستوري.', code: 'practical_minimal' }
    ]
  },
  {
    field: 'groupBehaviorPattern',
    eyebrow: 'العمل في مجموعة 🤝',
    text: 'حين يبدأ العمل الجماعي فعلًا، أين تجدين دوركِ؟',
    options: [
      { label: 'أفهم أوّلًا ما ترغب الجميع في فعله ثمّ أشارك بذكاء.', code: 'listener' },
      { label: 'أقترح فكرة للبداية، ليكون لدينا من أين ننطلق.', code: 'initiator' },
      { label: 'أسأل «لحظة، من تفعل ماذا؟» فلا بدّ أن تنظّم إحدانا الأمور.', code: 'task_organizer' },
      { label: 'أنتظر قليلًا لأرى أين تحتاجني المجموعة فعلًا.', code: 'adaptive' },
      { label: 'أتولّى جزءًا واحدًا وأنجزه جيّدًا حتى النهاية.', code: 'focused_executor' },
      { label: 'أربط بين الجميع حين تبدأ الأمور بالتشتّت.', code: 'connector' }
    ]
  },
  {
    field: 'conflictStyle',
    eyebrow: 'حين تعمّ بعض الفوضى 🌀',
    text: 'تختلف الآراء في المجموعة. ما الذي يساعدكِ عادةً؟',
    options: [
      { label: 'نتحدّث قليلًا ونجد حلًا وسطًا.', code: 'compromise' },
      { label: 'نصوّت ونقرّر. فهذه هي الديمقراطية.', code: 'vote_decision' },
      { label: 'نفحص ما يناسب الهدف أكثر، وليس من رفعت صوتها أكثر.', code: 'goal_oriented' },
      { label: 'نمنح كلّ واحدة فرصة لتشرح رأيها.', code: 'inclusive_discussion' },
      { label: 'ننادي المرشدة قبل أن يتحوّل الأمر إلى حلقة مسلسل.', code: 'facilitator_help' },
      { label: 'آخذ لحظة للتفكير ثمّ أعود إلى النقاش.', code: 'reflection_pause' }
    ]
  },
  {
    field: 'groupNeed',
    eyebrow: 'ماذا تحتاجين هناك؟ 💜',
    text: 'ما دمتِ في مجموعة، ما أهمّ شعور بالنسبة لكِ فيها؟',
    options: [
      { label: 'أن تكون هناك مساحة لأفكاري.', code: 'voice_space' },
      { label: 'أن يكون هناك ترتيب ووضوح، فالفوضى ليست هواية.', code: 'clarity_structure' },
      { label: 'أن أستطيع السؤال دون خجل.', code: 'psychological_safety' },
      { label: 'أن تشارك الجميع فعلًا.', code: 'participation' },
      { label: 'أن نتقدّم ولا نتوقّف ساعة عند «ماذا سنفعل؟»', code: 'progress' },
      { label: 'أن تكون الأجواء لطيفة.', code: 'positive_atmosphere' },
      { label: 'أن أعرف دوري وألّا أشعر بأنّني تائهة.', code: 'role_clarity' }
    ]
  },
  {
    field: 'groupComfortLevel',
    eyebrow: 'مجموعة جديدة ✨',
    text: 'تنضمّين إلى مجموعة جديدة. كيف تشعرين عادةً؟',
    options: [
      { label: 'أشعر براحة كبيرة. أنضمّ وكأنّني معهنّ منذ البداية.', code: 'high_comfort' },
      { label: 'أشعر براحة نسبيًا، أحتاج لحظة ثمّ تسير الأمور.', code: 'medium_high_comfort' },
      { label: 'أحتاج بعض الوقت، لكنّني أندمج في النهاية.', code: 'gradual_comfort' },
      { label: 'أحتاج إلى من تساعدني في الدخول في الأجواء.', code: 'needs_inclusion_support' },
      { label: 'يتوقّف الأمر على المجموعة. مع بعضها أنطلق ومع بعضها أبقى هادئة.', code: 'context_dependent' }
    ]
  },
  {
    field: 'neededTeamSupport',
    eyebrow: 'من تساعدكِ على الازدهار؟ 🌱',
    text: 'أيّ نوع من الصديقات يساعدكِ أكثر على العمل جيّدًا؟',
    options: [
      { label: 'من تنظّم وترتّب.', code: 'needs_organization' },
      { label: 'من تطرح الأفكار.', code: 'needs_ideas' },
      { label: 'من تهدّئ الأجواء عند الضغط.', code: 'needs_calm' },
      { label: 'من تقود القرارات حين تتردّد الجميع.', code: 'needs_decision_leader' },
      { label: 'من تجيد العرض والتقديم.', code: 'needs_presentation' },
      { label: 'من تجيد التنفيذ والبناء.', code: 'needs_execution' },
      { label: 'من تستمع وتساعد الجميع على الاندماج.', code: 'needs_connector' }
    ]
  },
  {
    field: 'startStyle',
    eyebrow: 'ننطلق 🚀',
    text: 'هناك مهمّة جديدة. ما ردّكِ التلقائي الأوّل؟',
    options: [
      { label: 'أن أبدأ بسرعة وأحسّن في أثناء العمل.', code: 'prototype_fast' },
      { label: 'أن أفهم الهدف أوّلًا.', code: 'goal_first' },
      { label: 'أن أرى مثالًا ثمّ أجرّب.', code: 'example_based' },
      { label: 'أن أتحدّث مع المجموعة ونحدّد اتّجاهًا.', code: 'collaborative_direction' },
      { label: 'أن نوزّع المهامّ ونبدأ العمل.', code: 'task_execution' },
      { label: 'أن أبحث عن أفكار قبل أن نقرّر.', code: 'inspiration_research' }
    ]
  }
];
export const arabicDomains = ['الحياة على الشبكة','مدرستي','نحن والمجتمع','العالم من حولي','التسوّق وأسلوب الحياة','ما يُمتعني','جسمي','مكاني','في طريقي','العالم الذي أتمناه'];
