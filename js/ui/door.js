// The Ancient Door panel. Seven symbols, one for each realm behind the Door.
// Only the Star is known so far: the star egg came from its realm. The panel
// shows exactly what waking the Star takes, as a short checklist.
import { state } from '../state.js';
import { REALMS, litRunes, starSteps, starReady } from '../realm.js';
import { drawRealm } from '../world/haven.js';
import { esc, openModal } from './common.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

function glyph(i, lit, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.strokeStyle = g.fillStyle = lit ? '#c98f2a' : i === 0 ? '#a88a55' : '#c4baa6';
  if (lit) { g.shadowColor = '#ffd98a'; g.shadowBlur = 8; }
  drawRealm(g, size / 2, size / 2, size * 0.7, i);
  return c.toDataURL();
}

export function openDoorPanel({ onOpen, onVale, here = true }) {
  const lit = litRunes();
  const steps = starSteps();
  const ready = starReady();
  const intro = state.realm.doorOpened
    ? 'The Star glows. The Door has shown you a glimpse of the Realm of Stars.'
    : ready
      ? 'The Star is glowing. The Door is ready to open.'
      : 'Seven symbols, one for each realm behind the Door. Your egg carries the Star. Wake it, and the Door will open the way to the Realm of Stars.';
  const m = openModal(`
    <div class="door-panel">
      <div class="detail-head">
        <h2>The Ancient Door</h2>
        <button class="icon-btn small" data-d="close" aria-label="Close">✕</button>
      </div>
      <p class="next-intro">${esc(intro)}</p>
      <ol class="rune-list">
        <li class="${lit[0] ? 'lit' : 'next'}">
          <img src="${glyph(0, lit[0])}" alt="" width="40" height="40">
          <div class="t-info">
            <span class="t-eyebrow">${lit[0] ? 'Awake' : 'Your egg’s symbol'}</span>
            <span class="t-name">The Star · ${esc(REALMS[0].name)}</span>
            <ul class="star-steps">
              ${steps.map((s) => `<li class="${s.done ? 'done' : ''}"><span class="tick">${s.done ? CHECK : ''}</span>${esc(s.label)}${s.progress && !s.done ? ` <small>(${esc(s.progress)})</small>` : ''}</li>`).join('')}
            </ul>
          </div>
        </li>
        ${REALMS.slice(1).map((r, k) => `
          <li class="later">
            <img src="${glyph(k + 1, false)}" alt="" width="36" height="36">
            <div class="t-info"><span class="t-name">${esc(r.symbol)}</span><span class="t-meta">A realm not yet known.</span></div>
          </li>`).join('')}
      </ol>
      <div class="detail-actions">
        ${!here ? '<button class="btn ghost" data-d="vale">Fly to Dragon Haven</button>' : ''}
        ${ready && here ? `<button class="btn primary glow" data-d="open">${state.realm.doorOpened ? 'Look beyond again' : 'Open the Door'}</button>` : ''}
      </div>
    </div>`, { className: 'detail', label: 'The Ancient Door' });
  m.el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-d]')?.dataset.d;
    if (act === 'close') m.close();
    if (act === 'vale') { m.close(); onVale(); }
    if (act === 'open') { m.close(); onOpen(); }
  });
}
