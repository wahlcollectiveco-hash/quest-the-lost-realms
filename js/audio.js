// Gentle sound, generated on the fly (no audio files).
// Ambience: soft wind, running water, birds by day and crickets by night.
// Effects: quiet chimes for finishing Quests, discoveries, hatching, the Door.
// Audio starts on the first tap (browsers require a gesture) and goes quiet
// whenever the app is in the background.

let ctx = null;
let master, sfxBus, ambBus, windGain, waterGain, waterFilter;
let settings = { sfx: true, ambient: true, ambientVol: 0.5 };
let night = false;
let muted = false; // the quick mute on the focus timer
let location = 'haven';
let critterTimer = null;

function noiseBuffer(seconds = 2) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    // gently brown-ish noise: softer than white noise
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

function loop(buffer) {
  const s = ctx.createBufferSource();
  s.buffer = buffer;
  s.loop = true;
  s.start();
  return s;
}

function start() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.connect(master);
  ambBus = ctx.createGain();
  ambBus.gain.value = 0;
  ambBus.connect(master);

  const noise = noiseBuffer(3);

  // Wind: low, slowly breathing
  const wind = loop(noise);
  const windLP = ctx.createBiquadFilter();
  windLP.type = 'lowpass';
  windLP.frequency.value = 380;
  windGain = ctx.createGain();
  windGain.gain.value = 0.18;
  const lfo = ctx.createOscillator();
  const lfoAmt = ctx.createGain();
  lfo.frequency.value = 0.06;
  lfoAmt.gain.value = 0.1;
  lfo.connect(lfoAmt).connect(windGain.gain);
  lfo.start();
  wind.connect(windLP).connect(windGain).connect(ambBus);

  // Water: a brighter band of noise for the stream (louder by the Vale's falls)
  const water = loop(noise);
  waterFilter = ctx.createBiquadFilter();
  waterFilter.type = 'bandpass';
  waterFilter.frequency.value = 1100;
  waterFilter.Q.value = 0.6;
  waterGain = ctx.createGain();
  waterGain.gain.value = 0.12;
  water.connect(waterFilter).connect(waterGain).connect(ambBus);

  scheduleCritters();
  applySettings();
}

// A few birds by day, crickets by night, spaced out and quiet.
function scheduleCritters() {
  clearTimeout(critterTimer);
  const next = night ? 1800 + Math.random() * 3000 : 3500 + Math.random() * 8000;
  critterTimer = setTimeout(() => {
    if (ctx && settings.ambient && ctx.state === 'running') night ? cricket() : bird();
    scheduleCritters();
  }, next);
}

function panner(x) {
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) p.pan.value = x;
  return p;
}

function bird() {
  const t0 = ctx.currentTime;
  const notes = 2 + Math.floor(Math.random() * 3);
  const base = 2300 + Math.random() * 1200;
  const out = ctx.createGain();
  out.gain.value = 0.05 + Math.random() * 0.03;
  const p = panner(Math.random() * 1.6 - 0.8);
  (p ? out.connect(p).connect(ambBus) : out.connect(ambBus));
  for (let i = 0; i < notes; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const s = t0 + i * 0.16;
    o.type = 'sine';
    o.frequency.setValueAtTime(base, s);
    o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), s + 0.05);
    o.frequency.exponentialRampToValueAtTime(base * 0.9, s + 0.11);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(1, s + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.12);
    o.connect(g).connect(out);
    o.start(s);
    o.stop(s + 0.14);
  }
}

function cricket() {
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.018;
  const p = panner(Math.random() * 1.6 - 0.8);
  (p ? out.connect(p).connect(ambBus) : out.connect(ambBus));
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const s = t0 + i * 0.09;
    o.frequency.value = 4400;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(1, s + 0.01);
    g.gain.linearRampToValueAtTime(0, s + 0.05);
    o.connect(g).connect(out);
    o.start(s);
    o.stop(s + 0.06);
  }
}

function applySettings() {
  if (!ctx) return;
  const now = ctx.currentTime;
  master.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.15);
  const amb = settings.ambient ? 0.35 * settings.ambientVol : 0;
  ambBus.gain.setTargetAtTime(amb, now, 0.8);
  sfxBus.gain.setTargetAtTime(settings.sfx ? 1 : 0, now, 0.05);
  const vale = location === 'vale';
  waterGain.gain.setTargetAtTime(vale ? 0.3 : 0.12, now, 1.2);
  waterFilter.frequency.setTargetAtTime(vale ? 800 : 1100, now, 1.2);
  windGain.gain.setTargetAtTime(night ? 0.12 : 0.18, now, 1.5);
}

// ---- A tiny synth for effects ----
function tone(freq, { at = 0, dur = 1.2, vol = 0.1, type = 'sine', attack = 0.01 } = {}) {
  if (!ctx || !settings.sfx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}
const notes = (list, step, opts) => list.forEach((f, i) => tone(f, { ...opts, at: i * step }));

export const sfx = {
  tap: () => tone(880, { dur: 0.12, vol: 0.025, type: 'triangle' }),
  complete: () => notes([523.25, 659.25, 783.99, 1046.5], 0.09, { dur: 1.1, vol: 0.06 }),
  chime: () => notes([659.25, 987.77, 1318.51], 0.2, { dur: 2, vol: 0.08 }),
  discovery: () => notes([1318.5, 1567.98, 1975.5, 2637], 0.07, { dur: 1.4, vol: 0.045 }),
  hatch: () => { notes([392, 523.25, 659.25, 783.99, 1046.5, 1318.5], 0.11, { dur: 1.6, vol: 0.06 }); tone(196, { dur: 2.4, vol: 0.05, attack: 0.3 }); },
  door: () => { tone(98, { dur: 4, vol: 0.09, attack: 0.8 }); tone(147, { dur: 4, vol: 0.05, attack: 1 }); notes([587.33, 880, 1174.66], 0.5, { at: 0.8, dur: 2.5, vol: 0.04 }); },
  moment: () => notes([440, 659.25, 880], 0.25, { dur: 2.2, vol: 0.045, attack: 0.08 }),
  talk: () => tone(620 + Math.random() * 120, { dur: 0.09, vol: 0.03, type: 'triangle' }),
  whoosh: () => {
    if (!ctx || !settings.sfx) return;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer(1.6);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    const t = ctx.currentTime;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1600, t + 0.8);
    f.frequency.exponentialRampToValueAtTime(400, t + 1.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.4);
    g.gain.linearRampToValueAtTime(0, t + 1.5);
    s.connect(f).connect(g).connect(sfxBus);
    s.start(t);
  },
};

export const audio = {
  // Call once; audio begins at the first user gesture.
  init(initial) {
    Object.assign(settings, initial);
    const kick = () => {
      start();
      ctx?.resume?.();
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      document.hidden ? ctx.suspend() : ctx.resume();
    });
  },
  set(next) { Object.assign(settings, next); applySettings(); },
  // Silence everything for now, without changing the saved sound settings.
  mute(v) { muted = !!v; applySettings(); },
  setNight(v) { if (night !== v) { night = v; applySettings(); scheduleCritters(); } },
  setLocation(v) { location = v; applySettings(); },
};
