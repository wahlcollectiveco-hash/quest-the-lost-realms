export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Short, low-interruption caption at the bottom of the scene.
let captionTimer;
export function say(text, ms = 4600) {
  const el = $('#caption');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => el.classList.remove('show'), ms);
}

let celebrateTimer;
export function celebrate(title, line, ms = 4200) {
  const el = $('#celebrate');
  $('h3', el).textContent = title;
  $('.line', el).textContent = line;
  el.classList.remove('show');
  void el.offsetWidth; // restart the animation
  el.classList.add('show');
  clearTimeout(celebrateTimer);
  celebrateTimer = setTimeout(() => el.classList.remove('show'), ms);
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
