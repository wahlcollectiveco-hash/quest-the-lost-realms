// Realm progress: the eight symbols on the Ancient Door and the three rune
// stones in Verdant Vale. Each symbol lights for a meaningful milestone,
// never for a score.
import { state, save } from './state.js';

export const STONES = [
  { name: 'Stone of Roots', needs: 3 },
  { name: 'Stone of Water', needs: 10 },
  { name: 'Stone of Sky', needs: 20 },
];

const MAPS = ['map-1', 'map-2', 'map-3', 'map-4'];

// The symbols wake one at a time, in this order, so there's always one
// clear next step. (A symbol whose milestone is already done lights as soon
// as its turn comes.) Quill can tell the story of each one.
export const RUNES = [
  { name: 'The First Step', hint: 'Finish your first Quest.', lit: (s) => s.stats.completed >= 1 },
  { name: 'The Vale Remembers', hint: 'Fly to Verdant Vale.', lit: (s) => s.realm.visited },
  { name: 'Stone of Roots', hint: 'Wake the Stone of Roots in Verdant Vale.', lit: (s) => s.realm.stones[0], stone: 0 },
  { name: 'A Friend’s Warmth', hint: 'Hatch the egg in the nest.', lit: (s) => s.creatures.length >= 1 },
  { name: 'Stone of Water', hint: 'Wake the Stone of Water in Verdant Vale.', lit: (s) => s.realm.stones[1], stone: 1 },
  { name: 'Stone of Sky', hint: 'Wake the Stone of Sky in Verdant Vale.', lit: (s) => s.realm.stones[2], stone: 2 },
  { name: 'The Keeper’s Promise', hint: 'Find the key to the old chest by the Door, and open it.', lit: (s) => s.chestOpened },
  { name: 'The Old Map', hint: 'Find all four pieces of the old map.', lit: (s) => MAPS.every((id) => s.found[id]) },
];

export function litRunes() {
  let open = true;
  return RUNES.map((r) => (open = open && !!r.lit(state)));
}
// The symbol that wakes next (or -1 when all are lit).
export const nextRune = () => litRunes().indexOf(false);
export const allLit = () => litRunes().every(Boolean);

export const valeUnlocked = () => state.stats.completed >= 1;

export function stoneState(i) {
  if (state.realm.stones[i]) return 'awake';
  return state.stats.completed >= STONES[i].needs ? 'ready' : 'dormant';
}
export const questsUntilStone = (i) => Math.max(0, STONES[i].needs - state.stats.completed);

export function wakeStone(i) {
  state.realm.stones[i] = true;
  save();
}

export function markVisited() {
  if (state.realm.visited) return false;
  state.realm.visited = true;
  save();
  return true;
}

export function findHidden(key) {
  if (state.realm.hidden[key]) return false;
  state.realm.hidden[key] = true;
  save();
  return true;
}

export function markDoorOpened() {
  state.realm.doorOpened = true;
  save();
}
