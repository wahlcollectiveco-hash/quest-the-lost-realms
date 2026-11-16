// Character voices, using the device's built-in speech. Each character gets
// their own pitch and pace. It's a device voice, not a voice actor, and it
// can be turned off in Settings.
import { state } from './state.js';

const CAST = {
  narrator: { pitch: 1.0, rate: 0.92 },
  quill: { pitch: 0.6, rate: 0.82 },
  singer: { pitch: 0.85, rate: 0.8 },
  lune: { pitch: 1.6, rate: 0.95 },
  baby: { pitch: 1.9, rate: 1.0 },
  pearl: { pitch: 1.15, rate: 0.9 },
  nova: { pitch: 1.5, rate: 1.12 },
  orin: { pitch: 0.7, rate: 0.8 },
  bubbles: { pitch: 1.7, rate: 1.1 },
  tide: { pitch: 0.45, rate: 0.72 },
  pebble: { pitch: 1.35, rate: 1.0 },
  ember: { pitch: 1.0, rate: 1.08 },
  moon: { pitch: 1.2, rate: 0.85 },
};

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
function pickVoice() {
  if (!synth) return;
  const all = synth.getVoices().filter((v) => /^en/i.test(v.lang));
  const prefer = ['Samantha', 'Karen', 'Moira', 'Google UK English Female', 'Google US English', 'Daniel'];
  voice = prefer.map((n) => all.find((v) => v.name.includes(n))).find(Boolean) || all.find((v) => v.localService) || all[0] || null;
}
if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

export const voicesOn = () => !!synth && state.settings?.voices !== false;

export function hush() {
  try { synth?.cancel(); } catch { /* ignore */ }
}

export function speak(text, who = 'narrator') {
  if (!voicesOn() || !text) return;
  try {
    synth.cancel();
    const clean = String(text).replace(/[“”"♪✦…]/g, (c) => (c === '…' ? '.' : '')).trim();
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    const c = CAST[who] || CAST.narrator;
    if (voice) u.voice = voice;
    u.pitch = c.pitch;
    u.rate = c.rate;
    u.volume = 0.9;
    synth.speak(u);
  } catch { /* speech isn't available here */ }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) hush(); });
