import { api, requireTeacher } from './common.js';

const gallery = document.querySelector('#gallery');
const search = document.querySelector('#card-search');
const count = document.querySelector('#gallery-count');
const error = document.querySelector('#gallery-error');
const imageBase = new URL('./cards/women/', import.meta.url);
let cards = [];

function previewUrl(path) {
  if (typeof path !== 'string') return null;
  const match = /^site:women\/([A-Za-z0-9_-]+\.(?:png|jpg|jpeg|webp))$/.exec(path);
  return match ? new URL(match[1], imageBase).href : null;
}

function text(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

function fieldDescription(value) {
  const field = typeof value === 'string' ? value.trim() : '';
  if (!field) return '';
  return field.startsWith('פורצת דרך ') ? field : 'פורצת דרך ב' + field;
}

function displayCards() {
  const term = search.value.trim().toLocaleLowerCase('he');
  const matching = term
    ? cards.filter(card => [card.woman_name,card.field].join(' ').toLocaleLowerCase('he').includes(term))
    : cards;
  gallery.replaceChildren();
  count.textContent = term ? `${matching.length} מתוך ${cards.length} כרטיסים` : `${cards.length} כרטיסים`;

  for (const card of matching) {
    const item = document.createElement('article');
    item.className = 'gallery-card';
    const artwork = document.createElement('div');
    artwork.className = 'gallery-artwork';
    const src = previewUrl(card.front_path);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'הכרטיס של ' + card.woman_name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => artwork.replaceChildren(text('span','התמונה אינה זמינה כרגע','gallery-missing')));
      artwork.append(img);
    } else {
      artwork.append(text('span', 'התמונה אינה זמינה כרגע', 'gallery-missing'));
    }
    const details = document.createElement('div');
    details.className = 'gallery-details';
    details.append(text('h2', card.woman_name, 'gallery-name'));
    const field = fieldDescription(card.field);
    if (field) details.append(text('p', field, 'gallery-field'));
    item.append(artwork, details);
    gallery.append(item);
  }

  if (!matching.length) gallery.append(text('p', 'לא נמצאו כרטיסים מתאימים.', 'gallery-empty'));
}

async function init() {
  try {
    const account = await requireTeacher();
    if (!account) return;
    // Metadata is supplied by Supabase. Images remain on the GitHub-hosted course website.
    const response = await api('teacher.catalog');
    cards = (response.groups || []).flatMap(group => group.cards || [])
      .filter(card => card && typeof card.woman_name === 'string')
      .sort((a,b) => a.woman_name.localeCompare(b.woman_name,'he'));
    document.querySelector('#auth-panel').hidden = true;
    gallery.hidden = false;
    displayCards();
  } catch (reason) {
    const authPanel = document.querySelector('#auth-panel');
    if (authPanel) authPanel.hidden = true;
    error.textContent = reason?.message || 'לא הצלחנו לטעון את הכרטיסים. נסי לרענן את הדף.';
    error.hidden = false;
  }
}

search.addEventListener('input', displayCards);
init();
