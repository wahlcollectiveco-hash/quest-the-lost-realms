// Storybook scenes: short animated illustrations for memories and old lore
// (what a hatchling remembers from inside the shell, how the doors were
// closed…). Each is a few painted panels that move gently, with a line of
// text read aloud. Tap Next to move on; Skip to leave.
import { speak, hush } from '../voice.js';

const TAU = Math.PI * 2;
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---- Paint helpers (w, h = canvas size; t = seconds since the panel began) ----
function sky(g, w, h, stops) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}
function glow(g, x, y, r, color, a = 1) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = a;
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}
function stars(g, w, h, t, n = 90, seed = 5, maxY = 0.75) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h * maxY, s = 0.6 + r() * 1.8, ph = r() * 9;
    g.globalAlpha = 0.45 + 0.5 * Math.abs(Math.sin(t * 0.9 + ph));
    g.fillStyle = '#fff8e6';
    g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
function hills(g, w, h, y, color, seed = 3, amp = 0.06) {
  const r = rnd(seed);
  const a = r() * 6, b = r() * 6;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 12) g.lineTo(x, h * (y + Math.sin(x / w * 5 + a) * amp + Math.sin(x / w * 11 + b) * amp * 0.4));
  g.lineTo(w, h);
  g.fill();
}
// A dragon in silhouette, flying. s = size, flap = 0..1
function dragon(g, x, y, s, color, t = 0, dir = 1) {
  const flap = Math.sin(t * 5) * 0.5;
  g.save();
  g.translate(x, y);
  g.scale(dir * s, s);
  g.fillStyle = color;
  g.beginPath(); g.ellipse(0, 0, 26, 11, 0, 0, TAU); g.fill(); // body
  g.beginPath(); g.ellipse(27, -8, 10, 8, -0.3, 0, TAU); g.fill(); // head
  g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(-48, 2, -60, -8); g.quadraticCurveTo(-46, 8, -20, 6); g.fill(); // tail
  g.beginPath(); g.moveTo(-6, -6); g.quadraticCurveTo(-4, -44 - flap * 26, 26, -40 - flap * 30); g.quadraticCurveTo(10, -22, 12, -6); g.fill(); // wing
  g.restore();
}
function doorArch(g, x, y, s, lit, stone = '#5d5a6e') {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = stone;
  g.beginPath(); g.moveTo(-34, 0); g.lineTo(-34, -60); g.arc(0, -60, 34, Math.PI, 0); g.lineTo(34, 0); g.fill();
  if (lit > 0) {
    g.globalAlpha = lit;
    const grad = g.createLinearGradient(0, -90, 0, 0);
    grad.addColorStop(0, '#fff6d8');
    grad.addColorStop(1, '#ffc978');
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(-24, 0); g.lineTo(-24, -60); g.arc(0, -60, 24, Math.PI, 0); g.lineTo(24, 0); g.fill();
    g.globalAlpha = 1;
  } else {
    g.fillStyle = '#2c2a3c';
    g.beginPath(); g.moveTo(-24, 0); g.lineTo(-24, -60); g.arc(0, -60, 24, Math.PI, 0); g.lineTo(24, 0); g.fill();
  }
  g.restore();
}
function egg(g, x, y, s, tint = '#f4ecd8', rock = 0, glowColor = null) {
  g.save();
  g.translate(x, y);
  g.rotate(rock);
  if (glowColor) glow(g, 0, -s * 0.2, s * 2.6, glowColor, 0.7);
  const grad = g.createRadialGradient(-s * 0.3, -s * 0.5, s * 0.1, 0, 0, s * 1.4);
  grad.addColorStop(0, '#fffdf4');
  grad.addColorStop(1, tint);
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(0, 0, s, s * 1.3, 0, 0, TAU); g.fill();
  g.restore();
}
function motes(g, w, h, t, n, color, seed = 9, speed = 12) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r() * w, y0 = r() * h, ph = r() * 9, s = 1 + r() * 2.4;
    const x = (x0 + Math.sin(t * 0.5 + ph) * 18 + t * speed * (0.3 + r())) % w;
    const y = (y0 + Math.cos(t * 0.4 + ph) * 12) % h;
    glow(g, x, y, s * 5, color, 0.5 + 0.4 * Math.sin(t * 1.5 + ph));
  }
}
function rays(g, w, h, t, color = 'rgba(200,255,240,0.13)') {
  for (let i = 0; i < 6; i++) {
    const x = w * (0.1 + i * 0.16) + Math.sin(t * 0.3 + i) * 20;
    g.fillStyle = color;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x - 30 + 110, h); g.lineTo(x - 30, h); g.fill();
  }
}
function bubbles(g, w, h, t, n = 26, seed = 4) {
  const r = rnd(seed);
  g.strokeStyle = 'rgba(230,255,255,0.6)';
  g.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    const x0 = r() * w, sp = 18 + r() * 30, s = 2 + r() * 5, ph = r() * h;
    const y = h - ((t * sp + ph) % (h + 20));
    g.beginPath(); g.arc(x0 + Math.sin(t + ph) * 8, y, s, 0, TAU); g.stroke();
  }
}
function note(g, x, y, s, a) {
  g.globalAlpha = Math.max(0, a);
  g.fillStyle = '#fff3d0';
  g.font = `700 ${s}px Georgia, serif`;
  g.fillText('♪', x, y);
  g.globalAlpha = 1;
}

// ---- The scenes ----
const SCENES = {
  // Long ago: seven doors, and dragons flying between them.
  'old-world': [
    { text: 'Long ago, there were seven doors. Each one led to a different realm.', draw(g, w, h, t) {
      sky(g, w, h, ['#2a2f6e', '#8a6aa8', '#f2b48a']);
      stars(g, w, h, t, 60, 5, 0.5);
      hills(g, w, h, 0.78, '#3a3760', 3);
      for (let i = 0; i < 7; i++) {
        const x = w * (0.1 + i * 0.133), y = h * (0.8 - Math.sin(i / 6 * Math.PI) * 0.1);
        glow(g, x, y - 40, 80, 'rgba(255,220,150,0.5)', 0.5 + 0.3 * Math.sin(t * 1.4 + i));
        doorArch(g, x, y, Math.min(w, h) / 620, 1);
      }
      hills(g, w, h, 0.9, '#25234a', 8, 0.03);
    } },
    { text: 'Dragons flew through the doors whenever they liked, the way birds fly from tree to tree.', draw(g, w, h, t) {
      sky(g, w, h, ['#3b3f86', '#b98ab0', '#ffd0a0']);
      glow(g, w * 0.72, h * 0.3, h * 0.5, 'rgba(255,236,190,0.7)');
      hills(g, w, h, 0.82, '#3a3760', 3);
      doorArch(g, w * 0.2, h * 0.86, Math.min(w, h) / 380, 1);
      doorArch(g, w * 0.82, h * 0.84, Math.min(w, h) / 440, 1);
      const k = Math.min(w, h) / 700;
      for (let i = 0; i < 4; i++) {
        const p = ((t * 0.07 + i * 0.25) % 1);
        dragon(g, w * (0.2 + p * 0.62), h * (0.6 - Math.sin(p * Math.PI) * 0.34 + i * 0.03), k * (0.8 + i * 0.12), '#2a2748', t + i);
      }
    } },
  ],
  // The Keepers close the doors.
  sealing: [
    { text: 'Then one day, the Keepers closed the doors.', draw(g, w, h, t) {
      sky(g, w, h, ['#1a1c3e', '#3a3566', '#6a5a80']);
      stars(g, w, h, t, 40, 7, 0.5);
      const lit = Math.max(0.08, 1 - t / 7);
      glow(g, w * 0.5, h * 0.55, h * 0.5, 'rgba(255,220,150,0.6)', lit);
      doorArch(g, w * 0.5, h * 0.84, Math.min(w, h) / 260, lit);
      const k = Math.min(w, h) / 500;
      for (const [x, s] of [[0.24, 1], [0.34, 0.85], [0.68, 0.9], [0.78, 1.05]]) {
        g.fillStyle = '#16152c';
        g.beginPath(); g.moveTo(w * x - 26 * k * s, h * 0.9); g.quadraticCurveTo(w * x, h * 0.9 - 150 * k * s, w * x + 26 * k * s, h * 0.9); g.fill();
        g.beginPath(); g.arc(w * x, h * 0.9 - 118 * k * s, 15 * k * s, 0, TAU); g.fill();
      }
      hills(g, w, h, 0.92, '#121126', 4, 0.02);
    } },
    { text: 'They weren’t locking something out. They were keeping something safe.', draw(g, w, h, t) {
      sky(g, w, h, ['#141630', '#2a2850', '#3e3660']);
      stars(g, w, h, t, 70, 7, 0.7);
      doorArch(g, w * 0.5, h * 0.84, Math.min(w, h) / 260, 0);
      glow(g, w * 0.5, h * 0.6, 60 + 8 * Math.sin(t * 2), 'rgba(255,225,160,0.9)', 0.8);
      hills(g, w, h, 0.92, '#121126', 4, 0.02);
    } },
  ],
  // One egg from each realm, sent through before the doors closed.
  'seven-eggs': [
    { text: 'Before the doors closed, each realm sent one egg through. Seven eggs, to keep the realms from being forgotten.', draw(g, w, h, t) {
      sky(g, w, h, ['#161a44', '#3c3a78', '#8a6a9a']);
      stars(g, w, h, t, 80, 2, 0.8);
      const tints = ['#f6edc4', '#bfe0f2', '#cfeac0', '#e6dcf6', '#f6c8a8', '#d6f0ec', '#e0e0e8'];
      const s = Math.min(w, h) / 22;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + t * 0.12;
        const x = w * 0.5 + Math.cos(a) * w * 0.3, y = h * 0.5 + Math.sin(a) * h * 0.22;
        egg(g, x, y, s, tints[i], Math.sin(t * 1.5 + i) * 0.12, 'rgba(255,230,170,0.5)');
      }
    } },
  ],
  // A child's drawing: a small dragon by a glowing arch.
  'home-drawing': [
    { text: 'Someone drew this, a long time ago. A little dragon by a glowing door. Underneath, one word: “home.”', draw(g, w, h, t) {
      g.fillStyle = '#f3e7c8';
      g.fillRect(0, 0, w, h);
      const r = rnd(11);
      g.fillStyle = 'rgba(150,120,70,0.08)';
      for (let i = 0; i < 60; i++) g.fillRect(r() * w, r() * h, 40 + r() * 80, 2);
      const k = Math.min(w, h) / 420;
      const wob = (n) => Math.sin(t * 6 + n) * 1.2;
      g.strokeStyle = '#c98a2a';
      g.lineWidth = 6 * k;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(w * 0.62 + wob(1), h * 0.7); g.lineTo(w * 0.62 + wob(2), h * 0.42); g.arc(w * 0.72, h * 0.42, w * 0.1, Math.PI, 0); g.lineTo(w * 0.82 + wob(3), h * 0.7); g.stroke();
      g.strokeStyle = '#e8b84a';
      for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.beginPath(); g.moveTo(w * 0.72 + Math.cos(a) * w * 0.12, h * 0.42 + Math.sin(a) * w * 0.12); g.lineTo(w * 0.72 + Math.cos(a) * w * 0.15 + wob(i), h * 0.42 + Math.sin(a) * w * 0.15); g.stroke(); }
      g.strokeStyle = '#5a8a4a';
      g.beginPath(); g.ellipse(w * 0.36, h * 0.62 + wob(4), 44 * k, 30 * k, 0, 0, TAU); g.stroke();
      g.beginPath(); g.arc(w * 0.44, h * 0.5 + wob(5), 20 * k, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(w * 0.33, h * 0.56); g.lineTo(w * 0.28 + wob(6), h * 0.4); g.lineTo(w * 0.38, h * 0.54); g.stroke();
      g.fillStyle = '#6b5330';
      g.font = `italic ${42 * k}px Georgia, serif`;
      g.textAlign = 'center';
      g.fillText('home', w * 0.5, h * 0.88);
      g.textAlign = 'left';
    } },
  ],
  // What the star hatchling remembers.
  'star-memory': [
    { who: 'baby', text: 'I remember… it was dark, but not scary. There were tiny lights all around me.', draw(g, w, h, t) {
      sky(g, w, h, ['#070b26', '#141a4a', '#232a66']);
      stars(g, w, h, t, 120, 13, 1);
      motes(g, w, h, t, 26, 'rgba(255,240,200,0.9)', 21, 6);
      g.fillStyle = `rgba(4,6,20,${0.5 + 0.1 * Math.sin(t)})`;
      g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.75, h * 0.62, 0, 0, TAU); g.rect(w, 0, -w, h); g.fill('evenodd');
    } },
    { who: 'baby', text: 'Someone was humming. A long, slow song, over and over.', draw(g, w, h, t) {
      sky(g, w, h, ['#0a0e30', '#1c2258', '#343a7c']);
      stars(g, w, h, t, 90, 13, 0.8);
      const k = Math.min(w, h) / 420;
      g.fillStyle = '#10143a';
      g.beginPath(); g.ellipse(w * 0.5, h * 0.72, 190 * k, 70 * k, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(w * 0.3, h * 0.52, 60 * k, 46 * k, -0.4, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(w * 0.5, h * 0.66); g.quadraticCurveTo(w * 0.62, h * 0.2 - Math.sin(t) * 8, w * 0.8, h * 0.4); g.quadraticCurveTo(w * 0.66, h * 0.5, w * 0.6, h * 0.7); g.fill();
      egg(g, w * 0.52, h * 0.7, 26 * k, '#f2e8c8', Math.sin(t * 1.2) * 0.06, 'rgba(255,230,160,0.8)');
      for (let i = 0; i < 4; i++) { const p = (t * 0.22 + i * 0.25) % 1; note(g, w * (0.3 + i * 0.04) + Math.sin(p * 6) * 14, h * (0.42 - p * 0.3), 30 * k, Math.sin(p * Math.PI)); }
    } },
  ],
  // The egg that washed up in the Realm of Stars.
  'egg-river': [
    { text: 'One night, an egg came floating down a river of starlight, and stopped on the star-singers’ shore.', draw(g, w, h, t) {
      sky(g, w, h, ['#0a0e30', '#1c2258', '#2c3476']);
      stars(g, w, h, t, 100, 31, 0.6);
      hills(g, w, h, 0.7, '#161a44', 6, 0.04);
      for (let i = 0; i < 40; i++) {
        const p = ((t * 0.05 + i / 40) % 1);
        glow(g, w * p, h * (0.8 + Math.sin(p * 8 + i) * 0.03), 26, 'rgba(180,200,255,0.8)', 0.5);
      }
      const p = Math.min(1, t / 9);
      egg(g, w * (0.08 + p * 0.5), h * (0.78 + Math.sin(t * 2) * 0.01), Math.min(w, h) / 20, '#bfe0f2', Math.sin(t * 2) * 0.15, 'rgba(160,210,255,0.7)');
    } },
  ],
  // What the sea hatchling remembers.
  'wave-memory': [
    { who: 'baby', text: 'I remember water all around me. Warm, and moving, like breathing.', draw(g, w, h, t) {
      sky(g, w, h, ['#3ab0c0', '#1c7a96', '#0e3f5e']);
      rays(g, w, h, t);
      bubbles(g, w, h, t);
      egg(g, w * 0.5 + Math.sin(t * 0.8) * w * 0.04, h * 0.6 + Math.cos(t * 0.6) * h * 0.02, Math.min(w, h) / 14, '#bfe0f2', Math.sin(t * 0.8) * 0.2, 'rgba(200,255,250,0.5)');
    } },
    { who: 'baby', text: 'And a sound, far away. Like the sea inside a big shell.', draw(g, w, h, t) {
      sky(g, w, h, ['#2a98ae', '#145e7c', '#082c46']);
      rays(g, w, h, t, 'rgba(200,255,240,0.08)');
      const k = Math.min(w, h) / 420;
      dragon(g, (t * 26 * k) % (w + 300 * k) - 150 * k, h * 0.4, 3.2 * k, 'rgba(6,30,48,0.75)', t * 0.25);
      bubbles(g, w, h, t, 18, 8);
      for (let i = 0; i < 3; i++) { const p = (t * 0.25 + i / 3) % 1; g.strokeStyle = `rgba(220,255,250,${0.5 * (1 - p)})`; g.lineWidth = 3; g.beginPath(); g.arc(w * 0.5, h * 0.7, p * w * 0.5, 0, TAU); g.stroke(); }
    } },
  ],
  // Orin: why the stars were hung.
  lanterns: [
    { who: 'orin', text: 'The first dragons hung the stars up like lanterns, so no traveller would ever lose their way home.', draw(g, w, h, t) {
      sky(g, w, h, ['#080c2a', '#161c50', '#2a3070']);
      stars(g, w, h, t, 50, 3, 0.9);
      const k = Math.min(w, h) / 600;
      for (let i = 0; i < 5; i++) {
        const p = Math.min(1, Math.max(0, t / 2 - i * 0.6));
        const x = w * (0.16 + i * 0.17), y = h * (0.7 - p * (0.36 + (i % 2) * 0.1));
        dragon(g, x - 30 * k, y + 26 * k, 0.9 * k, '#0c0e2a', t + i);
        glow(g, x, y, 46 * k, 'rgba(255,232,160,1)', 0.9);
      }
    } },
  ],
  // Old Tide: the door under the sea.
  'sunken-door': [
    { who: 'tide', text: 'There is a door down here too. When the Keepers closed it, the sea rose over it to keep it hidden.', draw(g, w, h, t) {
      sky(g, w, h, ['#2a98ae', '#145e7c', '#07283e']);
      rays(g, w, h, t, 'rgba(200,255,240,0.1)');
      hills(g, w, h, 0.84, '#0a3348', 5, 0.04);
      doorArch(g, w * 0.5, h * 0.88, Math.min(w, h) / 250, 0.12 + 0.08 * Math.sin(t * 1.3), '#31566a');
      bubbles(g, w, h, t, 22, 2);
      hills(g, w, h, 0.93, '#06202e', 9, 0.02);
    } },
  ],
  // The egg in the giant clam remembers leaves.
  'leaf-memory': [
    { text: 'Inside the egg, something stirs, and for a moment you can almost hear it dreaming: wind in the leaves, far away.', draw(g, w, h, t) {
      sky(g, w, h, ['#eaf6c0', '#a8d488', '#3f7a4a']);
      for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(255,250,200,0.16)'; const x = w * (0.1 + i * 0.2) + Math.sin(t * 0.3 + i) * 16; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 50, 0); g.lineTo(x + 130, h); g.lineTo(x + 20, h); g.fill(); }
      const r = rnd(17);
      for (let i = 0; i < 9; i++) { const x = r() * w; g.fillStyle = '#2c5a36'; g.fillRect(x, 0, 14 + r() * 26, h); }
      for (let i = 0; i < 30; i++) {
        const x0 = r() * w, sp = 20 + r() * 30, ph = r() * h;
        const y = (t * sp + ph) % (h + 20), x = x0 + Math.sin(t * 1.4 + ph) * 26;
        g.save(); g.translate(x, y); g.rotate(t * 1.2 + ph); g.fillStyle = i % 3 ? '#7fbf5a' : '#e6c85a';
        g.beginPath(); g.ellipse(0, 0, 8, 4, 0, 0, TAU); g.fill(); g.restore();
      }
    } },
  ],
};

export const hasVignette = (id) => !!SCENES[id];

// Play a scene. Resolves when it ends (or is skipped).
export function playVignette(id) {
  const panels = SCENES[id];
  if (!panels) return Promise.resolve();
  return new Promise((resolve) => {
    const el = document.getElementById('vignette');
    const cv = el.querySelector('canvas');
    const cap = el.querySelector('.vg-text');
    const g = cv.getContext('2d');
    let i = 0;
    let t0 = performance.now();
    let alive = true;
    function size() {
      const r = cv.getBoundingClientRect();
      const d = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(2, Math.round(r.width * d));
      cv.height = Math.max(2, Math.round(r.height * d));
    }
    function show() {
      t0 = performance.now();
      cap.textContent = panels[i].text;
      cap.classList.remove('in');
      void cap.offsetWidth;
      cap.classList.add('in');
      el.querySelector('[data-vg="next"]').textContent = i === panels.length - 1 ? 'Done' : 'Next';
      speak(panels[i].text, panels[i].who || 'narrator');
    }
    function frame() {
      if (!alive) return;
      const t = (performance.now() - t0) / 1000;
      if (cv.width > 2) {
        panels[i].draw(g, cv.width, cv.height, t);
        // a soft storybook edge, and a fade-in for each panel
        const v = g.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * 0.35, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * 0.75);
        v.addColorStop(0, 'rgba(20,14,6,0)');
        v.addColorStop(1, 'rgba(20,14,6,0.7)');
        g.fillStyle = v;
        g.fillRect(0, 0, cv.width, cv.height);
        if (t < 0.8) { g.fillStyle = `rgba(16,12,8,${1 - t / 0.8})`; g.fillRect(0, 0, cv.width, cv.height); }
      }
      requestAnimationFrame(frame);
    }
    function end() {
      alive = false;
      hush();
      el.classList.remove('show');
      el.onclick = null;
      window.removeEventListener('resize', size);
      resolve();
    }
    el.onclick = (e) => {
      const act = e.target.closest('[data-vg]')?.dataset.vg;
      if (act === 'skip') return end();
      if (act === 'next') { if (i >= panels.length - 1) return end(); i++; show(); }
    };
    el.classList.add('show');
    size();
    window.addEventListener('resize', size);
    show();
    requestAnimationFrame(frame);
  });
}
