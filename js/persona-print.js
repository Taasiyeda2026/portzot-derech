/* Text-only native printing. Draft persistence and form summaries stay separate. */
function syncPersonaPrint(){
 document.querySelectorAll('[data-print]').forEach(el=>{
  el.textContent=document.getElementById(el.dataset.print).value;
 });
}
async function preparePersonaPrint(){
 const sheet=document.getElementById('printSheet');
 // Hidden print text does not trigger font loading on screen.
 await Promise.all([
  document.fonts.load('11pt PersonaAlef'),
  document.fonts.load('700 11pt PersonaAlef'),
  ...[...sheet.querySelectorAll('img')].map(img=>img.decode())
 ]);
 await document.fonts.ready;
}
async function printPersona(){
 if(!validatePersona())return;
 const button=document.getElementById('print');
 button.disabled=true;
 try{
  await preparePersonaPrint();
  syncPersonaPrint();
  window.print();
 }catch(error){
  document.getElementById('formStatus').textContent=document.documentElement.lang==='ar'
   ? 'تعذّر تجهيز الخطوط أو الشعار للطباعة. يُرجى إعادة المحاولة.'
   : 'לא ניתן להכין את הגופנים או הלוגו להדפסה. נסו שוב.';
  console.error('Persona print preparation failed',error);
 }finally{button.disabled=false}
}
// Native menu / keyboard printing cannot await promises; preload its assets.
// beforeprint always reads live inputs, including changes without input events.
window.addEventListener('beforeprint',syncPersonaPrint);
document.addEventListener('DOMContentLoaded',()=>{
 syncPersonaPrint();
 preparePersonaPrint().catch(error=>console.warn('Persona print preload failed',error));
});
