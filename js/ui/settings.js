// Settings: sound, time of day, motion and text size. Saved on this device.
import { state, save } from '../state.js';
import { $$, openModal } from './common.js';

export const DEFAULT_SETTINGS = {
  sfx: true,
  ambient: true,
  ambientVol: 0.5,
  timeOfDay: true,
  clips: true,
  reduceMotion: false,
  largeText: false,
};

export const settings = () => ({ ...DEFAULT_SETTINGS, ...(state.settings || {}) });

export function prefersReducedMotion() {
  return settings().reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function applySettings({ world, audio }) {
  const s = settings();
  const root = document.documentElement;
  root.classList.toggle('large-text', s.largeText);
  root.classList.toggle('reduce-motion', prefersReducedMotion());
  world.setReducedMotion(prefersReducedMotion());
  audio.set({ sfx: s.sfx, ambient: s.ambient, ambientVol: s.ambientVol });
}

const ROWS = [
  ['sfx', 'Sound effects', 'Soft chimes when you finish things and find things.'],
  ['ambient', 'Nature sounds', 'Wind, water, birds by day and crickets by night.'],
  ['timeOfDay', 'Match my time of day', 'The Haven follows your clock: dawn, day, dusk and a cozy night.'],
  ['clips', 'Celebration clips', 'Zoom in on your dragon and your rewards when you finish a Quest.'],
  ['reduceMotion', 'Reduce motion', 'Shorter camera moves, calmer animations, and no celebration clips.'],
  ['largeText', 'Larger text', 'Makes the words throughout the app bigger.'],
];

export function openSettings({ onChange, onTour }) {
  const s = settings();
  const m = openModal(`
    <div class="settings">
      <div class="detail-head">
        <h2>Settings</h2>
        <button class="icon-btn small" data-s="close" aria-label="Close">✕</button>
      </div>
      <ul class="switch-list">
        ${ROWS.map(([k, title, desc]) => `
          <li>
            <label class="switch-row">
              <span class="sw-text"><b>${title}</b><small>${desc}</small></span>
              <input type="checkbox" role="switch" data-k="${k}" ${s[k] ? 'checked' : ''}>
              <span class="sw" aria-hidden="true"></span>
            </label>
            ${k === 'ambient' ? `<label class="volume"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="${s.ambientVol}" data-k="ambientVol" aria-label="Nature sounds volume"></label>` : ''}
          </li>`).join('')}
      </ul>
      <p class="settings-note">Everything is saved in this browser, on this device.</p>
      <div class="detail-actions">
        <button class="btn ghost" data-s="tour">Replay the welcome tour</button>
        <button class="btn primary" data-s="close">Done</button>
      </div>
    </div>`, { className: 'detail', label: 'Settings' });

  const update = (k, v) => {
    state.settings = { ...settings(), [k]: v };
    save();
    onChange();
  };
  $$('input', m.el).forEach((input) => {
    input.addEventListener(input.type === 'range' ? 'input' : 'change', () => {
      update(input.dataset.k, input.type === 'range' ? Number(input.value) : input.checked);
    });
  });
  m.el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-s]')?.dataset.s;
    if (act === 'close') m.close();
    if (act === 'tour') { m.close(); onTour(); }
  });
}
