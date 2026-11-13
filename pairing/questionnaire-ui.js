import { api, code, credential } from './common.js';
import { copy, domains } from './questionnaire-copy.js';
import { arabicQuestions, arabicDomains } from './questionnaire-ar.js';
const arabic = new URLSearchParams(location.search).get('lang') === 'ar';
const tr = (he, ar) => arabic ? ar : he;
const roomQuery = room => '?room=' + encodeURIComponent(room) + '&lang=' + (arabic ? 'ar' : 'he');
const arabicByField = new Map(arabicQuestions.map(q => [q.field,q]));

export function mountQuestionnaire(questions) {
  const roomCode = code();
  if (!/^[0-9a-f]{32}$/.test(roomCode)) { location.replace('pairing.html?lang=' + (arabic ? 'ar' : 'he')); return; }
  const token = credential(roomCode);
  const draftKey = 'pairing-draft:' + roomCode;
  let draft = {};
  try { draft = JSON.parse(sessionStorage.getItem(draftKey)) || {}; } catch {}
  const answers = draft.answers || {}, codes = draft.codes || {};
  let step = Number.isInteger(draft.step) ? Math.min(questions.length - 1, Math.max(0, draft.step)) : 0;
  let busy = false, joined = false, joining;
  const get = id => document.getElementById(id);
  const options = get('options'), input = get('textAnswer'), hint = get('hint');
  const back = get('backBtn'), start = get('nextBtn'), retry = get('retryBtn');
  const persist = () => sessionStorage.setItem(draftKey, JSON.stringify({ answers, codes, step }));

  async function ensureJoined() {
    if (joined) return true;
    joining ||= api('participant.join', { code: roomCode, name: answers.displayName }, token)
      .then(result => {
        if (result.completed || result.manual) {
          sessionStorage.removeItem(draftKey);
          location.replace('waiting.html' + roomQuery(roomCode));
          return false;
        }
        joined = true;
        return true;
      }).finally(() => { joining = null; });
    return joining;
  }

  function lock(value) {
    busy = value;
    window.courseLanguageBusy = value;
    get('questionCard').setAttribute('aria-busy', String(value));
    options.querySelectorAll('button').forEach(button => { button.disabled = value; });
    back.disabled = value || step === 0;
    start.disabled = value;
    retry.disabled = value;
    input.disabled = value;
  }

  function render(focus = false) {
    const q = questions[step], view = copy[q.field], translated = arabicByField.get(q.field);
    get('questionText').textContent = arabic ? translated.text : (view?.text || q.text);
    get('stepLabel').textContent = tr(`שאלה ${step + 1} מתוך ${questions.length}`, `السؤال ${step + 1} من ${questions.length}`);
    const progress = Math.round((step + 1) / questions.length * 100);
    get('progressText').textContent = progress + '%';
    get('progressFill').style.width = progress + '%';
    hint.textContent = '';
    retry.hidden = true;
    back.style.visibility = step === 0 ? 'hidden' : 'visible';
    const isName = q.field === 'displayName';
    input.hidden = !isName;
    input.style.display = isName ? 'block' : 'none';
    input.value = answers.displayName || '';
    start.hidden = !isName;
    options.hidden = isName;
    options.classList.toggle('domain-grid', q.field === 'mainDomain');
    options.replaceChildren();
    q.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      const selected = (codes[q.field] || q.options.find(o => o.label === answers[q.field])?.code) === option.code;
      button.className = 'option-btn' + (selected ? ' active' : '');
      button.dataset.code = option.code;
      button.setAttribute('aria-pressed', String(selected));
      if (q.field === 'mainDomain') {
        button.classList.add('domain-option');
        const icon = document.createElement('span'), label = document.createElement('span');
        icon.className = 'domain-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = domains[index][0];
        label.textContent = arabic ? arabicDomains[index] : domains[index][1];
        button.append(icon, label);
      } else button.textContent = arabic ? translated.options.find(o => o.code === option.code).label : (view?.options?.[index] || option.label);
      options.append(button);
    });
    lock(false);
    if (focus) {
      const card = get('questionCard');
      card.classList.remove('question-enter');
      void card.offsetWidth;
      card.classList.add('question-enter');
      (isName ? input : get('questionText')).focus({ preventScroll: true });
    }
  }

  async function submit() {
    lock(true);
    retry.hidden = true;
    hint.textContent = tr('שומרות את התשובות…','جارٍ حفظ إجاباتكِ…');
    try {
      persist();
      if (!await ensureJoined()) return;
      const payload = {};
      for (const q of questions) {
        // Submit the original server-approved labels, never presentation copy.
        payload[q.field] = answers[q.field];
        if (q.options.length) payload[q.field + 'Code'] = codes[q.field];
      }
      const result = await api('participant.submit', { answers: payload }, token);
      if (!result.completed) throw new Error(tr('השמירה לא אושרה. נסי שוב.','لم يتم تأكيد الحفظ. حاولي مجددًا.'));
      sessionStorage.removeItem(draftKey);
      get('questionCard').hidden = true;
      get('savingMessage').hidden = false;
      location.assign('waiting.html' + roomQuery(roomCode));
    } catch (error) {
      hint.textContent = tr(`${error.message} התשובות נשמרו בכרטיסייה. אפשר לנסות לשמור שוב.`, 'تعذّر حفظ الإجابات. إجاباتكِ محفوظة في هذه الصفحة؛ حاولي مجددًا.');
      retry.hidden = false;
      lock(false);
    }
  }

  options.addEventListener('click', event => {
    const button = event.target.closest('.option-btn');
    if (!button || busy || event.detail > 1 || !options.contains(button)) return;
    const q = questions[step], option = q.options.find(o => o.code === button.dataset.code);
    if (!option) return;
    lock(true); // Synchronous guard: rapid clicks cannot schedule another step.
    answers[q.field] = option.label;
    codes[q.field] = option.code;
    persist();
    hint.textContent = '';
    retry.hidden = true;
    options.querySelectorAll('button').forEach(other => {
      other.classList.toggle('active', other === button);
      other.setAttribute('aria-pressed', String(other === button));
    });
    setTimeout(() => {
      if (step === questions.length - 1) { void submit(); return; }
      step++;
      persist();
      render(true);
    }, 300);
  });

  back.addEventListener('click', () => {
    if (busy || step === 0) return;
    step--;
    persist();
    render(true);
  });
  start.addEventListener('click', async () => {
    if (busy || step !== 0) return;
    answers.displayName = input.value.trim();
    if (!answers.displayName) { hint.textContent = tr('איך לקרוא לך? כתבי שם כדי להתחיל.','اكتبي اسمكِ لنبدأ.'); input.focus(); return; }
    persist();
    lock(true);
    try {
      if (!await ensureJoined()) return;
      step = 1;
      persist();
      render(true);
    } catch (error) { hint.textContent = tr(error.message,'تعذّر الاتصال بالنشاط. تحقّقي من الرابط والاتصال وحاولي مجددًا.'); lock(false); }
  });
  input.addEventListener('input', () => { answers.displayName = input.value; persist(); });
  document.querySelectorAll('[data-pairing-lang]').forEach(link => { link.href = '?room=' + encodeURIComponent(roomCode) + '&lang=' + link.dataset.pairingLang; link.setAttribute('aria-current', String(link.dataset.pairingLang === (arabic?'ar':'he'))); link.addEventListener('click', e => { if (busy) e.preventDefault(); else persist(); }); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); start.click(); }
  });
  retry.addEventListener('click', () => { if (!busy) void submit(); });
  render();
  // A reload revalidates the existing participation, using its original token.
  if (answers.displayName) void ensureJoined().catch(error => { hint.textContent = tr(error.message,'تعذّر الاتصال بالنشاط. تحقّقي من الرابط والاتصال وحاولي مجددًا.'); });
}
