export function renderHTMLPoster(contentValues, productType, titleFont, titleColor, background, slotImages) {
  const bgEl = document.getElementById('poster-bg');
  if (bgEl) bgEl.innerHTML = background ? `<img src="${background}" style="width:100%;height:100%;object-fit:cover;display:block;">` : '';
  const setText=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=(t||'').trim();};
  const setList=(id,items)=>{const e=document.getElementById(id);if(!e)return;e.innerHTML=(items||[]).filter(i=>(i||'').trim()).map(i=>`<li>${i.trim()}</li>`).join('');};
  const name=(contentValues.projectName||'').trim();const n=document.getElementById('ph-name');
  if(n){n.textContent=name||'שם המיזם';n.style.fontFamily=titleFont||'IBM Plex Sans Hebrew';n.style.color=titleColor||'#5E2750';const l=name.length;n.style.fontSize=l<=6?'52px':l<=10?'44px':l<=15?'36px':l<=18?'30px':'24px';}
  setText('ph-desc',contentValues.description); setText('ph-problem',contentValues.problem); setText('ph-rq',contentValues.researchQuestion); setText('ph-findings',contentValues.findings); setText('ph-solution',contentValues.solution); setText('ph-value',contentValues.value); setText('ph-feedback',contentValues.feedbackReceived); setText('ph-improved',contentValues.improvementsAfterFeedback); setText('ph-slogan',contentValues.slogan||'');
  setText('ph-audience',(contentValues.audience||'').trim()?`👥 ${(contentValues.audience||'').trim()}`:'');
  setText('ph-names',['student1','student2','student3'].map(k=>(contentValues[k]||'').trim()).filter(Boolean).join(' · ')||'—');
  setText('ph-school',[contentValues.schoolName,contentValues.className].filter(Boolean).join(' | '));
  setList('ph-research',[contentValues.research_1,contentValues.research_2,contentValues.research_3]); setList('ph-reqs',[contentValues.requirements_1,contentValues.requirements_2,contentValues.requirements_3]); setList('ph-usage',[contentValues.howItWorks_1,contentValues.howItWorks_2,contentValues.howItWorks_3]);
  setText('ph-solution-cap',{physical:'המוצר שלנו',website:'האתר שלנו',app:'האפליקציה שלנו'}[productType]||'הפתרון שלנו');
  setText('ph-usage-cap',{physical:'איך משתמשים',website:'מה עושים באתר',app:'איך זה עובד'}[productType]||'איך זה עובד');
  setText('ph-images-label',{physical:'המוצר שלנו',app:'מסכי האפליקציה',website:'מסכי האתר'}[productType]||'');
  document.getElementById('ph-images-2').style.display=productType==='physical'?'grid':'none'; document.getElementById('ph-images-app').style.display=productType==='app'?'grid':'none'; document.getElementById('ph-images-web').style.display=productType==='website'?'grid':'none';
  (productType==='physical'?['visual_1','visual_2']:['visual_1','visual_2','visual_3']).forEach((k,i)=>document.querySelectorAll(`#ph-img-${i}`).forEach(f=>f.innerHTML=slotImages[k]?`<img src="${slotImages[k]}" alt="תמונה ${i+1}" style="width:100%;height:100%;object-fit:cover;display:block;">`:`<div style="display:flex;align-items:center;justify-content:center;color:#c8a8c0;font-size:10px;width:100%;height:100%;">תמונה ${i+1}</div>`));
}

export async function exportHTMLPosterToPDF(contentValues) {
  const poster = document.getElementById('poster-html'); if (!poster) return;
  const canvas = await html2canvas(poster,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:794,height:poster.scrollHeight,windowWidth:794});
  const { jsPDF } = window.jspdf; const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  pdf.addImage(canvas.toDataURL('image/jpeg',0.96),'JPEG',0,0,210,297);
  pdf.save(`${((contentValues.projectName||'פוסטר').trim().replace(/\s+/g,'-'))}.pdf`);
}
