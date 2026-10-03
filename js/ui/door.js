// The Ancient Door panel: which of its eight symbols glow, and gentle hints
// for the rest. When all eight glow, the Door can be opened.
import { state } from '../state.js';
import { RUNES, litRunes, nextRune, stoneState, questsUntilStone, valeUnlocked } from '../realm.js';
import { RUNE_STORIES } from '../data/life.js';
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

function nextDetail(r) {
  if (r.stone !== undefined) {
    const st = stoneState(r.stone);
    if (st === 'awake') return 'Its stone is already awake. This symbol will light right away.';
    if (st === 'ready') return 'The stone is ready! Fly to Verdant Vale and tap it.';
    const k = questsUntilStone(r.stone);
    return `${r.hint} It wakes after ${k} more finished ${k === 1 ? 'Quest' : 'Quests'}.`;
  }
  if (r.name === 'The Vale Remembers' && !valeUnlocked()) return 'Finish a Quest to clear the mist, then fly to Verdant Vale.';
  return r.hint;
}

// The Door as a journey: the symbols that glow, the one that wakes next
// (with exactly what to do), and the rest still a mystery.
export function openDoorPanel({ onOpen, onVale }) {
  const lit = litRunes();
  const n = lit.filter(Boolean).length;
  const next = nextRune();
  const heard = state.story.heard.quill || {};
  const intro = n === 0
    ? 'The Door is quiet. Eight symbols sleep in the stone, and they wake one at a time.'
    : n < 8
      ? `${n} of 8 symbols glow. When all eight are awake, the Door will open.`
      : state.realm.doorOpened
        ? 'All eight symbols glow. The Door has already shown you a glimpse beyond.'
        : 'All eight symbols glow. The Ancient Door is awake.';
  const row = (r, i) => {
    if (lit[i]) {
      const story = heard[`rune-${i}`] ? RUNE_STORIES[i][1] : 'Quill knows what this symbol means. Ask in Verdant Vale.';
      return `<li class="lit"><img src="${glyph(i, true)}" alt="" width="36" height="36">
        <div class="t-info"><span class="t-name">${esc(r.name)}</span><span class="t-meta">${esc(story)}</span></div></li>`;
    }
    if (i === next) {
      return `<li class="next"><img src="${glyph(i, false)}" alt="" width="36" height="36">
        <div class="t-info"><span class="t-eyebrow">Next to wake</span><span class="t-name">${esc(r.name)}</span><span class="t-meta">${esc(nextDetail(r))}</span></div></li>`;
    }
    return `<li class="later"><img src="${glyph(i, false)}" alt="" width="36" height="36">
      <div class="t-info"><span class="t-name">A sleeping symbol</span><span class="t-meta">It wakes after the ones before it.</span></div></li>`;
  };
  const m = openModal(`
    <div class="door-panel">
      <div class="detail-head">
        <h2>The Ancient Door</h2>
        <button class="icon-btn small" data-d="close" aria-label="Close">✕</button>
      </div>
      <p class="next-intro">${esc(intro)}</p>
      <ol class="rune-list">${RUNES.map(row).join('')}</ol>
      <div class="detail-actions">
        ${valeUnlocked() ? '<button class="btn ghost" data-d="vale">Fly to Verdant Vale</button>' : ''}
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
