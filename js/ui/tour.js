// A short first-time welcome tour. Each step can point at something on
// screen (or in the 3D world) with a soft spotlight. Skippable at any time.
import { $, esc } from './common.js';

export function runTour(steps) {
  return new Promise((resolve) => {
    const el = $('#tour');
    const spot = $('.tour-spot', el);
    const card = $('.tour-card', el);
    let i = 0;

    function place() {
      const step = steps[i];
      const r = step.target?.();
      const pad = 8;
      if (r) {
        spot.hidden = false;
        el.classList.remove('dim');
        Object.assign(spot.style, { left: `${r.x - pad}px`, top: `${r.y - pad}px`, width: `${r.w + pad * 2}px`, height: `${r.h + pad * 2}px`, borderRadius: step.round ? '50%' : '18px' });
      } else {
        spot.hidden = true;
        el.classList.add('dim');
      }
      const cw = card.offsetWidth, ch = card.offsetHeight;
      const vw = window.innerWidth, vh = window.innerHeight;
      let x, y;
      if (!r) {
        x = (vw - cw) / 2;
        y = (vh - ch) / 2;
      } else {
        x = Math.min(vw - cw - 16, Math.max(16, r.x + r.w / 2 - cw / 2));
        const below = r.y + r.h + pad + 14;
        y = below + ch < vh - 16 ? below : Math.max(16, r.y - pad - 14 - ch);
      }
      Object.assign(card.style, { left: `${x}px`, top: `${y}px` });
    }

    function draw() {
      const step = steps[i];
      const last = i === steps.length - 1;
      card.innerHTML = `
        <p class="eyebrow">${i + 1} of ${steps.length}</p>
        ${step.title ? `<h3>${esc(step.title)}</h3>` : ''}
        <p class="tour-text">${esc(step.text)}</p>
        <div class="disc-actions">
          ${last ? '' : '<button class="btn ghost small" data-t="skip">Skip tour</button>'}
          <button class="btn primary small" data-t="next">${last ? 'Let’s begin' : 'Next'}</button>
        </div>`;
      requestAnimationFrame(place);
      card.querySelector('[data-t="next"]').focus({ preventScroll: true });
    }

    function end() {
      el.classList.remove('show');
      window.removeEventListener('resize', place);
      document.removeEventListener('keydown', onKey);
      resolve();
    }
    const onKey = (e) => { if (e.key === 'Escape') end(); };
    card.onclick = (e) => {
      const act = e.target.closest('[data-t]')?.dataset.t;
      if (act === 'skip') end();
      if (act === 'next') { if (i >= steps.length - 1) end(); else { i++; draw(); } }
    };
    window.addEventListener('resize', place);
    document.addEventListener('keydown', onKey);
    el.classList.add('show');
    draw();
  });
}

export function rectOf(...els) {
  const rs = els.filter(Boolean).map((e) => e.getBoundingClientRect()).filter((r) => r.width);
  if (!rs.length) return null;
  const x = Math.min(...rs.map((r) => r.left)), y = Math.min(...rs.map((r) => r.top));
  const x2 = Math.max(...rs.map((r) => r.right)), y2 = Math.max(...rs.map((r) => r.bottom));
  return { x, y, w: x2 - x, h: y2 - y };
}
