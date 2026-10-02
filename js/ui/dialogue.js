// Short conversations with the side characters, and the letterbox used for
// Story Moments. Everything is brief and can be skipped.
import { $, esc } from './common.js';
import { sfx } from '../audio.js';

export const PORTRAITS = {
  quill: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#dfe6df"/>
    <path d="M18 14l6 10M46 14l-6 10" stroke="#c9b27a" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="32" cy="36" rx="17" ry="15" fill="#8e9f94"/><ellipse cx="32" cy="45" rx="10" ry="7" fill="#9fb0a6"/>
    <circle cx="25" cy="33" r="5.5" fill="none" stroke="#c9a44e" stroke-width="2"/><circle cx="39" cy="33" r="5.5" fill="none" stroke="#c9a44e" stroke-width="2"/>
    <circle cx="25" cy="33" r="2.2" fill="#2a2a2a"/><circle cx="39" cy="33" r="2.2" fill="#2a2a2a"/>
    <path d="M28 52l4 8 4-8z" fill="#f1ece0"/></svg>`,
  hazel: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#f3e7d2"/>
    <path d="M16 12l6 16 8-6zM48 12l-6 16-8-6z" fill="#c8683a"/><path d="M17 13l3 7 3-3zM47 13l-3 7-3-3z" fill="#3a2a22"/>
    <ellipse cx="32" cy="34" rx="16" ry="14" fill="#c8683a"/><path d="M20 38q12 16 24 0q-12 6-24 0z" fill="#f4e8d4"/>
    <circle cx="26" cy="32" r="2.6" fill="#3a2a22"/><circle cx="38" cy="32" r="2.6" fill="#3a2a22"/><circle cx="32" cy="41" r="2.4" fill="#3a2a22"/>
    <path d="M18 50q14 8 28 0" stroke="#6f9c4c" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  lune: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="lw"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9d6ff"/></radialGradient></defs>
    <circle cx="32" cy="32" r="32" fill="#2e2b5a"/>
    <path d="M30 36q-16 4-24 18q14-2 24-10z" fill="url(#lw)" opacity="0.9"/>
    <path d="M28 30q-12-14-22-12q6 4 8 10q-6 0-8 4q10 4 22 2z" fill="url(#lw)"/>
    <ellipse cx="36" cy="34" rx="12" ry="9" fill="#ffffff"/><circle cx="46" cy="26" r="8" fill="#ffffff"/>
    <path d="M53 25l8 2-8 3z" fill="#f2c96a"/><circle cx="48" cy="24" r="1.8" fill="#2a2440"/>
    <path d="M44 18l2-6 2 6z" fill="#f2c96a"/></svg>`,
};

// Show a few lines, one at a time. Resolves when closed.
export function talk({ who, name, lines }) {
  return new Promise((resolve) => {
    const box = $('#dialogue');
    let i = 0;
    function draw() {
      const last = i >= lines.length - 1;
      box.innerHTML = `
        <div class="dlg-portrait">${PORTRAITS[who] || ''}</div>
        <div class="dlg-body">
          <p class="dlg-name">${esc(name)}</p>
          <p class="dlg-text">${esc(lines[i])}</p>
          <div class="dlg-actions">
            <button class="btn ${last ? 'ghost' : 'primary'} small" data-dlg="${last ? 'close' : 'next'}">${last ? 'Got it' : 'Next'}</button>
          </div>
        </div>`;
      box.querySelector('button').focus({ preventScroll: true });
      sfx.talk();
    }
    function close() {
      box.classList.remove('show');
      document.removeEventListener('keydown', onKey);
      box.onclick = null;
      resolve();
    }
    function advance() {
      if (i >= lines.length - 1) return close();
      i++;
      draw();
    }
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    box.onclick = (e) => {
      if (e.target.closest('[data-dlg="close"]')) return close();
      advance();
    };
    document.addEventListener('keydown', onKey);
    draw();
    box.classList.add('show');
  });
}

export const isTalking = () => $('#dialogue').classList.contains('show');

// ---- Letterbox for Story Moments ----
// Story text stays on screen until you tap Next, so there's time to read.
let pendingNext = null;
export const letterbox = {
  on(onSkip) {
    const el = $('#story-bars');
    $('#story-text').textContent = '';
    $('#story-next').hidden = true;
    el.classList.add('show');
    $('#story-skip').onclick = () => {
      onSkip();
      pendingNext?.();
    };
    $('#story-next').onclick = () => pendingNext?.();
  },
  text(t) {
    const p = $('#story-text');
    p.classList.remove('in');
    void p.offsetWidth;
    p.textContent = t;
    p.classList.add('in');
  },
  // Resolves when the reader taps Next.
  next() {
    return new Promise((resolve) => {
      const btn = $('#story-next');
      btn.hidden = false;
      btn.focus({ preventScroll: true });
      pendingNext = () => {
        pendingNext = null;
        btn.hidden = true;
        sfx.talk();
        resolve();
      };
    });
  },
  off() {
    pendingNext = null;
    $('#story-bars').classList.remove('show');
  },
};
