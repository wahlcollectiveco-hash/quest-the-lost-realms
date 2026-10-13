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

// ---- What the star-singers say ----
// The eldest speaks for them. A new thing to say when there is one; otherwise
// a gentle word about the sky.
export function singerLines() {
  const s = S();
  const lit = s.lit;
  const baby = state.creatures.find((c) => c.realm !== 'stars')?.name;
  if (!s.met.singers) {
    s.met.singers = true;
    save();
    return [
      'A visitor, through the Door… and you carry our song with you. You’ve met one of our little ones, haven’t you?',
      baby ? `${baby}. Yes, we hummed to that egg for a long time, before we sent it through the Door to keep it safe.` : 'We hummed to an egg for a long time, before we sent it through the Door to keep it safe.',
      'Since the doors closed, our stars have been going out, one by one. You can see the dark places in the sky.',
      'And look, in our nest. An egg that isn’t ours. It washed up on our shore one night, on a river of starlight. It carries a wave.',
      'It’s cold. Starlight warms it. Every star you relight will help.',
    ];
  }
  if (s.eggHatched) {
    if (!s.heard.after) { s.heard.after = true; save(); return ['The little one remembered water, didn’t they? Then the Wave was telling the truth.', 'Somewhere behind your Door is a realm of water. The egg was trying to get home.']; }
    return ['Listen. The whole sky is humming now.'];
  }
  if (lit >= STAR_COUNT) return ['The sky is whole again. Can you feel it? The egg is waking.', 'Go to it. It wants to see you.'];
  if (lit >= 6 && !s.heard.half) { s.heard.half = true; save(); return ['Half the sky is lit. The egg turned over last night, in its sleep.', 'It’s listening to the stars.']; }
  const left = STAR_COUNT - lit;
  return [`${left} ${left === 1 ? 'star is' : 'stars are'} still dark. Each thing you finish in your own world lights one more.`];
}

// ---- What Lune says ----
// Time pools in this realm, so here her odd way of talking makes sense.
export function luneLines() {
  const s = S();
  if (!s.met.lune) {
    s.met.lune = true;
    save();
    return [
      'Oh. You found me. Or you’re about to. Here, those are the same thing.',
      'I’m Lune. Time pools in this realm, like water in a bowl. Yesterday and tomorrow sit very close together.',
      'That’s why I say odd things. I’m remembering in both directions.',
    ];
  }
  if (s.eggHatched && !s.heard.luneAfter) { s.heard.luneAfter = true; save(); return ['There. I told you that would happen. Well. I will have told you.']; }
  if (!s.heard.luneEgg) { s.heard.luneEgg = true; save(); return ['The egg on the shore? I saw it arrive. Tomorrow.', 'Light the sky, and the egg will listen.']; }
  const LINES = [
    'The stars here are very old. Some of them remember you.',
    'Don’t stay too long. Your world is waiting, and it’s the one that lights the stars.',
    'I like it here. Nothing is in a hurry, not even time.',
  ];
  return [LINES[Math.floor(Math.random() * LINES.length)]];
}

// What the Wave hatchling remembers from inside the shell.
export const WAVE_MEMORIES = [
  'I remember water all around me. Warm, and moving, like breathing.',
  'And a sound, far away. Like the sea inside a big shell.',
];
