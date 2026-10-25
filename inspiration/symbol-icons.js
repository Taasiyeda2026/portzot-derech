// This presentation-only map uses the original group labels stored in Supabase.
// Icons are never sent to participants, and group data stays unchanged.
const SYMBOL_IDS=Object.freeze({
  'גלגל שיניים':'gear',
  'כוכב':'star',
  'טיל':'rocket',
  'תו מוזיקלי':'note',
  'שפירית':'dragonfly',
  'קלאפר קולנוע':'clapper',
  'מיקרופון':'microphone',
  'פלטת צבעים':'palette',
  'כובע בוגרים':'cap',
  'אטום':'atom',
  'לב':'heart',
  'אוזניות':'headphones',
  'מצלמה':'camera',
  'זכוכית מגדלת':'magnifier',
  'גביע':'trophy',
  'שרביט ניצוח':'conductor'
});
const SVG_NS='http://www.w3.org/2000/svg';

export function symbolIcon(name,compact=false){
  const wrapper=document.createElement('span');
  wrapper.className=compact?'group-symbol-icon compact':'group-symbol-icon';
  wrapper.setAttribute('role','img');
  wrapper.setAttribute('aria-label',String(name||'סמל'));
  wrapper.title=String(name||'סמל');

  const id=SYMBOL_IDS[name];
  if(!id){
    wrapper.classList.add('unknown');
    wrapper.textContent='?';
    return wrapper;
  }
  const svg=document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox','0 0 64 64');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  const use=document.createElementNS(SVG_NS,'use');
  use.setAttribute('href',new URL('./symbol-icons.svg#'+id,import.meta.url).href);
  svg.append(use);
  wrapper.append(svg);
  return wrapper;
}
