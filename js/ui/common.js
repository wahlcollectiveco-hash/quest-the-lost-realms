export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Captions at the edge of the scene. Two kinds:
//   say(text)  — a passing remark. Fades on its own (longer text stays longer); tap to dismiss.
//   tell(text) — something worth reading. Stays until you tap Next; several queue up in order.
let captionTimer;
let stickyShowing = false;
const tellQueue = [];

function showCaption(text, sticky) {
  const el = $('#caption');
  const more = tellQueue.length > 0;
  el.innerHTML = `<span class="cap-text">${esc(text)}</span>${sticky ? `<button class="btn primary small cap-next">${more ? 'Next' : 'Got it'}</button>` : ''}`;
  el.classList.toggle('sticky', sticky);
  el.classList.add('show');
  stickyShowing = sticky;
  clearTimeout(captionTimer);
}

function hideCaption() {
  $('#caption').classList.remove('show');
  stickyShowing = false;
  clearTimeout(captionTimer);
}

function nextTell() {
  if (!tellQueue.length) return hideCaption();
  showCaption(tellQueue.shift(), true);
}

export function say(text, ms) {
  if (stickyShowing || tellQueue.length) return; // never talk over something you're still reading
  showCaption(text, false);
  captionTimer = setTimeout(hideCaption, ms ?? Math.max(4200, 1800 + text.length * 70));
}

export function tell(text) {
  tellQueue.push(text);
  if (!stickyShowing) nextTell();
}

document.addEventListener('click', (e) => {
  if (!e.target.closest?.('#caption')) return;
  if (stickyShowing) nextTell();
  else hideCaption();
});

// A small "Quest Complete" banner shown over the celebration clip.
let celebrateTimer;
export function celebrate(title, line = '', ms = 4200) {
  const el = $('#celebrate');
  $('h3', el).textContent = title;
  $('.line', el).textContent = line;
  $('.line', el).hidden = !line;
  el.classList.remove('show');
  void el.offsetWidth; // restart the animation
  el.classList.add('show');
  clearTimeout(celebrateTimer);
  if (ms) celebrateTimer = setTimeout(() => el.classList.remove('show'), ms);
}
export function hideCelebrate() {
  clearTimeout(celebrateTimer);
  $('#celebrate').classList.remove('show');
}

export function openModal(html, { className = '', label = 'Dialog' } = {}) {
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal-backdrop"></div><div class="modal ${className}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const prevFocus = document.activeElement;
  const api = {
    el: $('.modal', wrap),
    onClose: null,
    close() {
      wrap.classList.remove('show');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => wrap.remove(), 220);
      api.onClose?.();
      prevFocus?.focus?.();
    },
  };
  const onKey = (e) => { if (e.key === 'Escape') api.close(); };
  document.addEventListener('keydown', onKey);
  $('.modal-backdrop', wrap).addEventListener('click', () => api.close());
  return api;
}

export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
