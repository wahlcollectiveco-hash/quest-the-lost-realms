// The Ancient Door panel: which of its eight symbols glow, and gentle hints
// for the rest. When all eight glow, the Door can be opened.
import { state } from '../state.js';
import { RUNES, litRunes, stoneState, questsUntilStone, valeUnlocked } from '../realm.js';
import { drawRune } from '../world/haven.js';
import { esc, openModal } from './common.js';

const glyphCache = new Map();
function glyph(i, lit) {
  const key = `${i}-${lit}`;
  if (!glyphCache.has(key)) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.strokeStyle = g.fillStyle = lit ? '#c98f2a' : '#b9ae98';
    if (lit) { g.shadowColor = '#ffd98a'; g.shadowBlur = 8; }
    drawRune(g, 32, 32, 44, i + 1);
    glyphCache.set(key, c.toDataURL());
  }
  return glyphCache.get(key);
}

function detail(r, i, lit) {
  if (lit) return 'Glowing';
  if (r.stone !== undefined) {
    const st = stoneState(r.stone);
    if (st === 'ready') return 'The stone is ready. Visit Verdant Vale and touch it.';
    const k = questsUntilStone(r.stone);
    return `${r.hint} It wakes after ${k} more finished ${k === 1 ? 'Quest' : 'Quests'}.`;
  }
  if (i === 2 && !valeUnlocked()) return 'Finish a Quest to clear the mist, then visit Verdant Vale.';
  return r.hint;
}

export function openDoorPanel({ onOpen, onVale }) {
  const lit = litRunes();
  const n = lit.filter(Boolean).length;
  const intro = n === 0
    ? 'The Door is quiet. Eight symbols wait in the stone.'
    : n < 8
      ? `${n} of 8 symbols glow. Something on the other side is stirring.`
      : state.realm.doorOpened
        ? 'All eight symbols glow. The Door has already shown you a glimpse beyond.'
        : 'All eight symbols glow. The Ancient Door is awake.';
  const m = openModal(`
    <div class="door-panel">
      <div class="detail-head">
        <h2>The Ancient Door</h2>
        <button class="icon-btn small" data-d="close" aria-label="Close">✕</button>
      </div>
      <p class="next-intro">${esc(intro)}</p>
      <ol class="rune-list">
        ${RUNES.map((r, i) => `
          <li class="${lit[i] ? 'lit' : ''}">
            <img src="${glyph(i, lit[i])}" alt="" width="36" height="36">
            <div class="t-info"><span class="t-name">${esc(r.name)}</span><span class="t-meta">${esc(detail(r, i, lit[i]))}</span></div>
          </li>`).join('')}
      </ol>
      <div class="detail-actions">
        ${valeUnlocked() ? '<button class="btn ghost" data-d="vale">Travel to Verdant Vale</button>' : ''}
        ${n === 8 ? `<button class="btn primary glow" data-d="open">${state.realm.doorOpened ? 'Look beyond again' : 'Open the Door'}</button>` : ''}
      </div>
    </div>`, { className: 'detail', label: 'The Ancient Door' });
  m.el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-d]')?.dataset.d;
    if (act === 'close') m.close();
    if (act === 'vale') { m.close(); onVale(); }
    if (act === 'open') { m.close(); onOpen(); }
  });
}
