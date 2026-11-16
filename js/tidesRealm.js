// The Realm of Tides (under the sea): what's happening there, and what
// Pearl the reef-keeper says. It opens once the Wave hatchling is born.
// Ten corals have lost their glow; every finished Quest wakes one. When the
// whole reef glows, the giant clam opens.
import { state, save } from './state.js';
import { starEggHatched } from './starsRealm.js';

export const CORAL_COUNT = 10;

const S = () => (state.sea ||= { lit: 0, shown: 0, met: {}, heard: {}, clamOpened: false });

export const seaOpen = () => starEggHatched();
export const coralsLit = () => S().lit;
export const clamReady = () => seaOpen() && S().lit >= CORAL_COUNT && !S().clamOpened;
export const clamOpened = () => !!S().clamOpened;

export function wakeCoral() {
  if (!seaOpen() || S().lit >= CORAL_COUNT) return null;
  S().lit++;
  save();
  return S().lit;
}
export function unseenCorals() {
  const s = S();
  return { from: Math.min(s.shown, s.lit), to: s.lit };
}
export function markCoralsSeen() { S().shown = S().lit; save(); }
export function markClamOpened() { S().clamOpened = true; save(); }

export function pearlLines() {
  const s = S();
  const baby = state.creatures.find((c) => c.realm === 'stars')?.name;
  if (!s.met.pearl) {
    s.met.pearl = true;
    save();
    return [
      'Oh! A visitor from above the water! Welcome to the Realm of Tides. I’m Pearl. I look after this reef.',
      baby ? `And you know ${baby}? That was our egg! A big storm carried it away. We thought it was lost.` : 'We lost an egg in a big storm once. We never found it.',
      'Our corals used to glow, every one. When the doors closed, they went grey and fell asleep.',
      'Each time you finish a Quest, one coral wakes up. And see the giant clam? It only opens when the whole reef is glowing.',
    ];
  }
  if (s.clamOpened) {
    if (!s.heard.after) { s.heard.after = true; save(); return ['An egg with a leaf on it! It must come from a realm of forests.', 'It’s not ready to hatch yet. But when the forest realm is found, it will be.']; }
    return ['The whole reef is glowing. I haven’t seen it like this since I was small.'];
  }
  if (s.lit >= CORAL_COUNT) return ['Every coral is awake! Quick, go and look at the giant clam!'];
  const left = CORAL_COUNT - s.lit;
  return [`${left} ${left === 1 ? 'coral is' : 'corals are'} still asleep. Each Quest you finish wakes one up.`];
}
