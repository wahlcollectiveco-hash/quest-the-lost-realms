// The Realm of Stars: what's happening there, and what its people say.
//
// It opens once the Star on the Ancient Door is awake and the Door has
// opened. Twelve stars over the realm have gone dark; every finished Quest
// relights one. The star-singers are keeping a cold egg that washed up on
// their shore. It carries the Wave, and starlight warms it: when the sky is
// whole again, it hatches.
import { state, save, uid } from './state.js';
import { NAMES } from './data/creatures.js';

export const STAR_COUNT = 12;

const S = () => (state.stars ||= { lit: 0, shown: 0, met: {}, heard: {}, eggHatched: false, babyId: null });

export const starsOpen = () => !!state.realm.doorOpened;
export const starsLit = () => S().lit;
export const starEggReady = () => starsOpen() && S().lit >= STAR_COUNT && !S().eggHatched;
export const starEggHatched = () => !!S().eggHatched;
export const starsVisited = () => !!S().met.realm;

// A finished Quest relights a star (returns how many are lit, or null).
export function relightStar() {
  if (!starsOpen() || S().lit >= STAR_COUNT) return null;
  S().lit++;
  save();
  return S().lit;
}

// How many stars were relit since you were last there (to light them as you arrive).
export function unseenStars() {
  const s = S();
  return { from: Math.min(s.shown, s.lit), to: s.lit };
}
export function markStarsSeen() {
  S().shown = S().lit;
  save();
}

export function hatchStarEgg() {
  const used = new Set(state.creatures.map((c) => c.name));
  const names = NAMES.filter((n) => !used.has(n));
  const c = { id: uid(), name: names.length ? names[Math.floor(Math.random() * names.length)] : 'Little One', palette: 'teal', hatchedAt: Date.now(), realm: 'stars' };
  state.creatures.push(c);
  S().eggHatched = true;
  S().babyId = c.id;
  save();
  return c;
}

// ---- What the star-singers say (kept short and plain) ----
export function singerLines() {
  const s = S();
  const lit = s.lit;
  const baby = state.creatures.find((c) => c.realm !== 'stars')?.name;
  if (!s.met.singers) {
    s.met.singers = true;
    save();
    return [
      'Hello, traveller. You know our song! You’ve met one of our babies, haven’t you?',
      baby ? `${baby}! We sang to that egg for a long time. Then we sent it through the Door, to keep it safe.` : 'We sang to an egg for a long time. Then we sent it through the Door, to keep it safe.',
      'Ever since the doors closed, our stars have been going out. Look up, and you’ll see the dark ones.',
      'And see the egg in our nest? It isn’t ours. It floated here one night. It has a wave on its shell.',
      'It’s cold, and starlight warms it. Every star you light will help.',
    ];
  }
  if (s.eggHatched) {
    if (!s.heard.after) { s.heard.after = true; save(); return ['The little one remembers water. So the wave on the shell was a clue!', 'Behind your Door, there must be a realm under the sea. Go and look.']; }
    return ['Listen. Every star is singing again. Thank you.'];
  }
  if (lit >= STAR_COUNT) return ['All the stars are shining again! The egg is waking up.', 'Go and see it. Tap the nest.'];
  if (lit >= 6 && !s.heard.half) { s.heard.half = true; save(); return ['Half the stars are lit! The egg moved last night, in its sleep.']; }
  const left = STAR_COUNT - lit;
  return [`${left} ${left === 1 ? 'star is' : 'stars are'} still dark. Each time you finish a Quest, one more lights up.`];
}

// ---- What Lune says ----
// Time is mixed up in this realm, so Lune remembers things before they happen.
export function luneLines() {
  const s = S();
  if (!s.met.lune) {
    s.met.lune = true;
    save();
    return [
      'Oh, hello! I’m Lune. I knew you were coming.',
      'Time is a bit mixed up in this realm. Sometimes I remember things before they happen.',
      'So if I say something strange, that’s why. I’m not being mysterious. I’m just early.',
    ];
  }
  if (s.eggHatched && !s.heard.luneAfter) { s.heard.luneAfter = true; save(); return ['See? I told you the egg would hatch. I remembered it last week.']; }
  if (!s.heard.luneEgg) { s.heard.luneEgg = true; save(); return ['That egg in the nest is going to hatch. I’ve already seen it!', 'Light all the stars, and you’ll see it too.']; }
  const LINES = [
    'I remember you finishing something tomorrow. Well done, in advance.',
    'The stars like you. They told me. Or they’re going to.',
    'Don’t stay too long. The stars light up when you get things done at home.',
  ];
  return [LINES[Math.floor(Math.random() * LINES.length)]];
}
