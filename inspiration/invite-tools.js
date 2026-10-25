// Compact classroom invitation controls. The long, private room URL stays off screen.
const SVG_NS = 'http://www.w3.org/2000/svg';
const SHAPES = {
  zoom: [['circle',{cx:10,cy:10,r:7}],['path',{d:'m15 15 5 5 M10 7v6 M7 10h6'}]],
  download: [['path',{d:'M12 3v12 m-5-5 5 5 5-5 M5 17v3h14v-3'}]],
  copy: [['rect',{x:8,y:8,width:12,height:12,rx:2}],['path',{d:'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2'}]],
  check: [['path',{d:'m5 12 4 4L19 6'}]],
  mail: [['rect',{x:3,y:5,width:18,height:14,rx:2}],['path',{d:'m3 7 9 7 9-7'}]],
  whatsapp: [['path',{d:'M20.2 11.5a8.3 8.3 0 0 1-12 7.4L4 20l1.1-4a8.3 8.3 0 1 1 15.1-4.5Z'}],['path',{d:'M9 8.4c-.5.4-.8 1.1-.6 1.8a7.3 7.3 0 0 0 5.5 5.4c.7.1 1.4-.2 1.8-.8l.3-.6-2-1-1.1 1c-1.2-.5-2-1.3-2.5-2.5l1-1.1-1-2-.6.2',transform:'translate(1.8 2.1) scale(.86)'}]],
  close: [['path',{d:'M18 6 6 18 M6 6l12 12'}]],
};
function icon(name) {
  const svg = document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('width','21');
  svg.setAttribute('height','21');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  svg.setAttribute('aria-hidden','true');
  for(const [tag,attrs] of SHAPES[name]) {
    const shape = document.createElementNS(SVG_NS,tag);
    for(const [key,value] of Object.entries(attrs)) shape.setAttribute(key,String(value));
    svg.append(shape);
  }
  return svg;
}
function control(label, glyph, callback) {
  const button=document.createElement('button');
  button.type='button';
  button.className='invite-icon';
  button.title=label;
  button.setAttribute('aria-label',label);
  button.append(icon(glyph));
  button.addEventListener('click',callback);
  return button;
}
function linkControl(label,glyph,href,external=false) {
  const a=document.createElement('a');
  a.className='invite-icon';
  a.href=href;
  a.title=label;
  a.setAttribute('aria-label',label);
  if(external){a.target='_blank';a.rel='noopener noreferrer';}
  a.append(icon(glyph));
  return a;
}
function zoomQR(qrSvg) {
  const dialog=document.createElement('dialog');
  dialog.className='invite-zoom';
  dialog.setAttribute('aria-label','QR להצטרפות למשחק');
  const close=control('סגירה','close',()=>dialog.close());
  close.classList.add('invite-zoom-close');
  dialog.append(close,qrSvg.cloneNode(true));
  document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  dialog.showModal();
}
function downloadQR(svgMarkup) {
  const blob=new Blob([svgMarkup],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='noshmot-hashraa-qr.svg';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function createInviteTools(inviteUrl,onError=()=>{}) {
  if(typeof inviteUrl!=='string'||!inviteUrl.startsWith('https://'))throw Error('קישור הצטרפות לא תקין.');
  const qr=globalThis.qrcode(0,'M');
  qr.addData(inviteUrl);
  qr.make();
  const svgMarkup=qr.createSvgTag({scalable:true,margin:2});
  const doc=new DOMParser().parseFromString(svgMarkup,'image/svg+xml');
  if(doc.documentElement.nodeName.toLowerCase()!=='svg')throw Error('לא ניתן להציג QR כרגע.');
  const image=document.importNode(doc.documentElement,true);
  image.setAttribute('aria-hidden','true');

  const wrap=document.createElement('div');
  wrap.className='invite-tools';
  const thumbnail=control('הגדלת QR','zoom',()=>zoomQR(image));
  thumbnail.className='invite-qr-thumb';
  thumbnail.replaceChildren(image);
  wrap.append(thumbnail);

  const actions=document.createElement('div');
  actions.className='invite-actions';
  actions.setAttribute('aria-label','שיתוף המשחק');
  actions.append(control('הורדת QR','download',()=>downloadQR(svgMarkup)));

  const mail=new URL('mailto:');
  mail.searchParams.set('subject','נושמות השראה – קישור למשחק');
  mail.searchParams.set('body',inviteUrl);
  actions.append(linkControl('שליחה במייל','mail',mail.href));

  const whatsapp='https://wa.me/?text='+encodeURIComponent('נושמות השראה – קישור למשחק:\n'+inviteUrl);
  actions.append(linkControl('שליחה ב־WhatsApp','whatsapp',whatsapp,true));

  const copy=control('העתקת קישור','copy',async()=>{
    try{
      await navigator.clipboard.writeText(inviteUrl);
      copy.replaceChildren(icon('check'));
      copy.setAttribute('aria-label','הקישור הועתק');
      copy.title='הקישור הועתק';
      status.textContent='הקישור הועתק';
    }catch{onError('לא ניתן להעתיק את הקישור. נסי שוב.')}
  });
  actions.append(copy);
  const status=document.createElement('span');
  status.className='invite-visually-hidden';
  status.setAttribute('aria-live','polite');
  wrap.append(actions,status);
  return wrap;
}
