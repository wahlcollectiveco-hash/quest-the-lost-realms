// Wishes: small "finish this and here's what happens next" goals.
//
// After the egg hatches, the baby flies home with you and grows up a little,
// one wish at a time:
//   1. nest — the baby sleeps by the cottage; finish 2 Quests and your
//             dragon builds them a nest of their own
//   2. gift — your dragon wants to make them something (a flower crown, a
//             first treasure, a star lantern): 30 minutes of focus, or 4 Quests
// One egg = one realm, so there's no new egg in this realm: the next one
// will come from behind the Door. While there's an egg, the "wish" is just a
// hint about how close it is.
// hatch.phase: undefined/'egg' (warming), 'raising' (wishes), 'waiting' (no egg)
import { state, save } from './state.js';
import { DRAGONS } from './data/dragons.js';
import { eggNeed, eggReady } from './rewards.js';
import { starSteps } from './realm.js';

export const GIFTS = {
  pebble: {
    id: 'crown',
    wish: (b) => `I want to make ${b} a flower crown! I need 30 minutes of focus to get it done.`,
    making: (n) => `${n} weaves the last flower into place…`,
    given: (b) => `${b} loves the flower crown!`,
  },
  ember: {
    id: 'gem',
    wish: (b) => `I want to find ${b} a first treasure! Give me 30 minutes of focus and I’ll dig one up.`,
    making: (n) => `${n} digs, and digs, and…`,
    given: (b) => `${b} has a first treasure! It glows by the nest.`,
  },
  moon: {
    id: 'lantern',
    wish: (b) => `I want to make ${b} a star lantern, for the dark. I need 30 minutes of focus to catch enough starlight.`,
    making: (n) => `${n} pours a little starlight into a lantern…`,
    given: (b) => `${b} has a star lantern now. No more scary dark.`,
  },
};

const NEED = {
  nest: { quests: 2 },
  gift: { focus: 30, quests: 4 },
};

export const raising = () => state.hatch.phase === 'raising' && !!state.wish;
const dragonId = () => (DRAGONS[state.dragon] ? state.dragon : 'pebble');
const dragonName = () => DRAGONS[dragonId()].name;
export const wishBaby = () => state.creatures.find((c) => c.id === state.wish?.creatureId) || null;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Called right after an egg hatches: the baby's first wish begins.
export function startRaising(creature) {
  state.hatch.phase = 'raising';
  state.wish = { step: 'nest', creatureId: creature.id, quests: 0, focus: 0 };
  save();
}

// What the wish says, in your dragon's words.
export function wishText() {
  if (!raising()) return null;
  const b = wishBaby()?.name || 'the little one';
  const step = state.wish.step;
  if (step === 'nest') return `Let’s help ${b} build a nest of their own! Finish 2 Quests and I’ll gather the twigs.`;
  return `${GIFTS[dragonId()].wish(b)} (Any 4 Quests works too.)`;
}

// How close the egg is, as a friendly guess.
export function eggInsight() {
  if (!hasEgg()) return null;
  if (eggReady()) return 'The star egg is ready to hatch! Fly to Dragon Haven to be there when it does.';
  const left = Math.ceil(eggNeed() - state.hatch.warmth);
  if (left <= 1) return 'The star egg is so close to hatching! I think it only needs one more Quest.';
  if (left <= 3) return 'The star egg is nearly ready. Two or three more Quests should do it.';
  return `The star egg in Dragon Haven is warming up. About ${left} more Quests until it hatches. Focus Quests warm it faster.`;
}
export const hasEgg = () => !['raising', 'waiting'].includes(state.hatch.phase) && state.creatures.length === 0;

// For the card at the top of Today's Quests.
export function wishCard() {
  if (raising()) {
    const w = state.wish;
    const need = NEED[w.step];
    const progress = w.step === 'gift'
      ? `${Math.min(need.focus, Math.floor(w.focus))} of ${need.focus} focus minutes · or ${Math.min(need.quests, w.quests)} of ${need.quests} Quests`
      : `${Math.min(need.quests, w.quests)} of ${plural(need.quests, 'Quest')}`;
    return { eyebrow: `${dragonName()}’s wish`, text: wishText(), progress };
  }
  const insight = eggInsight();
  if (insight) return { eyebrow: 'The star egg', text: insight, progress: '' };
  // After the hatch: the next goal is waking the Star on the Ancient Door.
  if (!state.realm.doorOpened) {
    const left = starSteps().filter((x) => !x.done);
    if (!left.length) return { eyebrow: 'The Ancient Door', text: 'The Star on the Door is glowing! Fly to Dragon Haven and open it.', progress: '' };
    return { eyebrow: 'Wake the Star on the Door', text: left.map((x) => x.label + (x.progress ? ` (${x.progress})` : '')).join(' · '), progress: '' };
  }
  return null;
}

// Count a finished Quest and/or some focus minutes toward the wish.
// Returns { step, creatureId } when the wish has just come true (the state
// has already moved on to the next wish), otherwise null.
export function wishProgress({ quests = 0, focus = 0 } = {}) {
  if (!raising()) return null;
  const w = state.wish;
  const need = NEED[w.step];
  w.quests += quests;
  w.focus += focus;
  const done = w.quests >= need.quests || (need.focus && w.focus >= need.focus);
  if (!done) { save(); return null; }
  const c = wishBaby();
  const result = { step: w.step, creatureId: w.creatureId };
  if (w.step === 'nest') {
    if (c) c.nest = state.creatures.filter((x) => x.nest != null).length;
    state.wish = { step: 'gift', creatureId: w.creatureId, quests: 0, focus: 0 };
  } else {
    if (c) c.gift = GIFTS[dragonId()].id;
    state.hatch.phase = 'waiting';
    state.wish = null;
  }
  save();
  return result;
}

// Saves from before one-egg-per-realm: if the star egg already hatched,
// there's no new egg (and no "new egg" wish) until the next realm.
export function settleOldSave() {
  let changed = false;
  if (state.wish?.step === 'egg') { state.wish = null; state.hatch.phase = 'waiting'; changed = true; }
  if (state.creatures.length && !raising() && state.hatch.phase !== 'waiting') { state.hatch.phase = 'waiting'; changed = true; }
  if (changed) save();
}
