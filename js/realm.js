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

export const RUNES = [
  { name: 'The First Step', hint: 'Finish your first Quest.', lit: (s) => s.stats.completed >= 1 },
  { name: 'A Friend’s Warmth', hint: 'Hatch an egg.', lit: (s) => s.creatures.length >= 1 },
  { name: 'The Vale Remembers', hint: 'Visit Verdant Vale.', lit: (s) => s.realm.visited },
  { name: 'Stone of Roots', hint: 'Wake the Stone of Roots in Verdant Vale.', lit: (s) => s.realm.stones[0], stone: 0 },
  { name: 'Stone of Water', hint: 'Wake the Stone of Water in Verdant Vale.', lit: (s) => s.realm.stones[1], stone: 1 },
  { name: 'Stone of Sky', hint: 'Wake the Stone of Sky in Verdant Vale.', lit: (s) => s.realm.stones[2], stone: 2 },
  { name: 'The Old Map', hint: 'Find all four pieces of the old map.', lit: (s) => MAPS.every((id) => s.found[id]) },
  { name: 'The Keeper’s Promise', hint: 'Open the old chest by the Door.', lit: (s) => s.chestOpened },
];

export const litRunes = () => RUNES.map((r) => !!r.lit(state));
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
