(async function(){
  const data = await fetch('assets/js/quiz-data.json').then(r=>r.json());

  const $ = (sel)=>document.querySelector(sel);
  const form = $('#quizForm');
  const wrap = $('#questions');
  const result = $('#result');
  const btnCalc = $('#btnCalc');

  const scaleLabels = [
    {v:1, t:"בכלל לא"},
    {v:2, t:"במידה מועטה"},
    {v:3, t:"במידה בינונית"},
    {v:4, t:"במידה רבה"},
    {v:5, t:"מאוד"}
  ];

  function render(){
    wrap.innerHTML = "";
    data.questions.forEach((q, idx)=>{
      const num = idx+1;
      const card = document.createElement('div');
      card.className = 'card q-card';
      const title = document.createElement('h3');
      title.className = 'q-title';
      title.textContent = `${num}. ${q.text}`;
      card.appendChild(title);

      if(q.type === 'likert'){
        const help = document.createElement('p');
        help.className = 'q-help';
        help.textContent = 'סמני עד כמה זה מתאים לך כרגע:';
        card.appendChild(help);

        const scale = document.createElement('div');
        scale.className = 'scale';
        scaleLabels.forEach(s=>{
          const id = `q${idx}_v${s.v}`;
          const lab = document.createElement('label');
          lab.setAttribute('for', id);

          const inp = document.createElement('input');
          inp.type = 'radio';
          inp.name = `q${idx}`;
          inp.id = id;
          inp.value = String(s.v);

          const txt = document.createElement('div');
          txt.textContent = String(s.v);

          const small = document.createElement('small');
          small.textContent = s.t;

          lab.appendChild(inp);
          lab.appendChild(txt);
          lab.appendChild(small);
          scale.appendChild(lab);
        });
        card.appendChild(scale);
      } else {
        const help = document.createElement('p');
        help.className = 'q-help';
        help.textContent = 'בחרי אפשרות אחת:';
        card.appendChild(help);

        const opts = document.createElement('div');
        opts.className = 'q-options';
        q.options.forEach((o, j)=>{
          const row = document.createElement('label');
          row.className = 'choice';
          const inp = document.createElement('input');
          inp.type = 'radio';
          inp.name = `q${idx}`;
          inp.value = String(j);
          const span = document.createElement('span');
          span.textContent = o.label;
          row.appendChild(inp);
          row.appendChild(span);
          opts.appendChild(row);
        });
        card.appendChild(opts);
      }

      wrap.appendChild(card);
    });
  }

  function readAnswers(){
    const answers = [];
    for(let i=0;i<data.questions.length;i++){
      const el = form.querySelector(`input[name="q${i}"]:checked`);
      answers.push(el ? el.value : null);
    }
    return answers;
  }

  function compute(answers){
    const scores = [0,0,0,0,0]; // domain 1..5
    answers.forEach((ans, idx)=>{
      const q = data.questions[idx];
      if(ans === null) return;

      if(q.type === 'likert'){
        const v = Number(ans); // 1..5
        q.w.forEach((w, di)=>{
          scores[di] += w * v;
        });
      } else {
        const opt = q.options[Number(ans)];
        opt.s.forEach((s, di)=>{ scores[di] += s; });
      }
    });
    return scores;
  }

  function topDomains(scores){
    const pairs = scores.map((s,i)=>({id:i+1, score:s}))
      .sort((a,b)=>b.score-a.score);

    const first = pairs[0];
    const second = pairs[1];

    // If close => return two domains. "close" threshold is 6% of first score (min 10)
    const threshold = Math.max(10, Math.round(first.score * 0.06));
    const close = (first.score - second.score) <= threshold;

    return close ? [first, second] : [first];
  }

  function domainById(id){
    return data.domains.find(d=>d.id===id);
  }

  function ensureAllAnswered(answers){
    const missing = answers
      .map((v,i)=>v===null ? i+1 : null)
      .filter(Boolean);
    return missing;
  }

  btnCalc.addEventListener('click', ()=>{
    const answers = readAnswers();
    const missing = ensureAllAnswered(answers);
    if(missing.length){
      alert(`יש עדיין שאלות שלא סומנו: ${missing.join(', ')}\nכדי לקבל תוצאה מדויקת, כדאי לענות על כולן.`);
      return;
    }

    const scores = compute(answers);
    const tops = topDomains(scores);

    const lines = [];
    lines.push(`<h2>התוצאה שלך</h2>`);
    lines.push(`<p class="muted">זו הכוונה עדינה — לא אבחון, לא ציון, ולא “נכון/לא נכון”.</p>`);

    if(tops.length === 1){
      const d = domainById(tops[0].id);
      lines.push(`<p><strong>כיוון מרכזי:</strong> ${d.title}</p>`);
      lines.push(`<p class="muted">${d.hint}</p>`);
      lines.push(`<div class="flow-nav">
        <a class="btn primary" href="${d.href}">כניסה לתחום</a>
        <a class="btn" href="index.html">חזרה לבית</a>
      </div>`);
    } else {
      const d1 = domainById(tops[0].id);
      const d2 = domainById(tops[1].id);
      lines.push(`<p><strong>שני כיוונים קרובים:</strong></p>`);
      lines.push(`<ul class="list">
        <li><strong>${d1.title}</strong> – <span class="muted">${d1.hint}</span></li>
        <li><strong>${d2.title}</strong> – <span class="muted">${d2.hint}</span></li>
      </ul>`);
      lines.push(`<div class="flow-nav">
        <a class="btn primary" href="${d1.href}">כיוון 1</a>
        <a class="btn primary" href="${d2.href}">כיוון 2</a>
        <a class="btn" href="index.html">חזרה לבית</a>
      </div>`);
    }

    result.innerHTML = `<div class="card result">${lines.join('')}</div>`;
    result.scrollIntoView({behavior:'smooth', block:'start'});
  });

  render();
})();