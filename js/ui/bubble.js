// A thought bubble that floats over a character's head.
// It can simply say something, offer a couple of buttons, or ask a question
// with a box to type a reply in. One bubble shows at a time.
import { $, esc } from './common.js';
import { sfx } from '../audio.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function createBubbles(world) {
  const el = $('#bubble');
  let anchor = null;
  let resolveCur = null;
  let timer = null;

  function place() {
    if (!anchor || !el.classList.contains('show')) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (el.classList.contains('pinned')) {
      // while typing, sit at the top so the keyboard can't cover it
      el.style.transform = `translate(${(window.innerWidth - w) / 2}px, 76px)`;
      el.style.setProperty('--tail', `${w / 2}px`);
      return;
    }
    const p = world.toScreen(anchor());
    el.style.visibility = p.visible ? '' : 'hidden';
    const x = clamp(p.x - w / 2, 12, window.innerWidth - w - 12);
    const y = clamp(p.y - h - 26, 70, window.innerHeight - h - 40);
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.setProperty('--tail', `${clamp(p.x - x, 22, w - 22)}px`);
  }
  world.addUpdater(place);

  // How a bubble ended: 'timeout', 'tap', 'replaced', { action } or { text }.
  function finish(result) {
    clearTimeout(timer);
    const r = resolveCur;
    resolveCur = null;
    if (!r) return;
    el.querySelector('input')?.blur();
    el.classList.remove('show', 'pinned');
    r(result);
  }

  function show(anchorFn, { text, name, actions, input, ms } = {}) {
    finish('replaced');
    anchor = anchorFn;
    const interactive = !!(actions?.length || input);
    el.innerHTML = `
      ${name ? `<p class="b-name">${esc(name)}</p>` : ''}
      <p class="b-text">${esc(text)}</p>
      ${input ? `<form class="b-form"><input type="text" maxlength="80" autocomplete="off" enterkeyhint="send" placeholder="${esc(input.placeholder || 'Type a reply…')}" aria-label="Your reply"><button class="btn primary small" type="submit">Send</button></form>` : ''}
      ${actions?.length ? `<div class="b-actions">${actions.map((a) => `<button class="btn ${a.primary ? 'primary' : 'ghost'} small" data-b="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div>` : ''}
      <i></i><i></i>`;
    el.classList.toggle('interactive', interactive);
    el.classList.remove('pinned');
    el.classList.add('show');
    place();
    sfx.talk();
    const auto = ms ?? (interactive ? 45000 : Math.max(2600, 1300 + text.length * 58));
    return new Promise((res) => {
      resolveCur = res;
      const tick = () => {
        // don't vanish while someone is typing
        if (el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') timer = setTimeout(tick, 5000);
        else finish('timeout');
      };
      timer = setTimeout(tick, auto);
    });
  }

  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-b]')?.dataset.b;
    if (act) return finish({ action: act });
    if (!el.classList.contains('interactive')) finish('tap');
  });
  el.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = el.querySelector('input').value.trim();
    if (text) finish({ text });
  });
  el.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT') { el.classList.add('pinned'); place(); }
  });

  return {
    show,
    hide: () => finish('replaced'),
    isOpen: () => el.classList.contains('show'),
    isAsking: () => el.classList.contains('show') && el.classList.contains('interactive'),
  };
}
