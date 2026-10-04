// The realms behind the Ancient Door.
//
// The Door has seven symbols, one for each realm. Every egg carries one of
// them: the egg came from behind the Door, from that symbol's realm. The
// first egg carries the Star. To wake the Star on the Door (and open the way
// to the Realm of Stars) you hatch the star egg, piece together the old map,
// and open the Keeper's chest.
import { state, save } from './state.js';

// Glyph index i is drawn by drawRealm(…, i) in world/haven.js.
export const REALMS = [
  { id: 'stars', name: 'The Realm of Stars', symbol: 'The Star' },
  { id: 'r2', name: null, symbol: 'The Wave' },
  { id: 'r3', name: null, symbol: 'The Leaf' },
  { id: 'r4', name: null, symbol: 'The Crescent' },
  { id: 'r5', name: null, symbol: 'The Flame' },
  { id: 'r6', name: null, symbol: 'The Spiral' },
  { id: 'r7', name: null, symbol: 'The Peak' },
];

const MAPS = ['map-1', 'map-2', 'map-3', 'map-4'];

// What waking the Star takes, shown as a checklist on the Door.
export function starSteps() {
  const maps = MAPS.filter((id) => state.found[id]).length;
  return [
    { id: 'hatch', label: 'Hatch the star egg', done: state.creatures.length > 0 },
    { id: 'map', label: 'Find the four pieces of the old map', done: maps === 4, progress: `${maps} of 4` },
    { id: 'chest', label: state.found['mossy-key'] ? 'Open the Keeper’s chest with the Mossy Key' : 'Open the Keeper’s chest (it needs a key)', done: state.chestOpened },
  ];
}
export const starReady = () => starSteps().every((s) => s.done);

// Which Door symbols glow.
export const litRunes = () => REALMS.map((r, i) => i === 0 && (starReady() || state.realm.doorOpened));
export const allLit = () => litRunes()[0];

// Dragon Haven is open from the start: the egg is waiting there.
export const valeUnlocked = () => true;

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
