// What completing a Quest gives back: warmth for the egg, and now and then
// a discovery. Deliberately not a points economy: no numbers to grind,
// just occasional, delightful changes in the world.
import { state, save, uid } from './state.js';
import { CATALOG, byId, inHaven } from './data/discoveries.js';
import { TREATS } from './data/life.js';
import { PALETTES, NAMES } from './data/creatures.js';

// ---- The egg ----
export const eggNeed = () => 10 + 4 * state.hatch.eggIndex;
export const eggFraction = () => Math.min(1, state.hatch.warmth / eggNeed());
// One egg per realm: Realm 1 has the star egg, and once it hatches there's no egg until the next realm.
const eggHere = () => !['raising', 'waiting'].includes(state.hatch.phase) && state.creatures.length === 0;
export const eggReady = () => eggHere() && state.hatch.warmth >= eggNeed();

export function eggPalette() {
  if (!state.hatch.palette) {
    const used = new Set(state.creatures.map((c) => c.palette));
    const free = PALETTES.filter((p) => !used.has(p.id));
    const pool = free.length ? free : PALETTES;
    state.hatch.palette = pool[Math.floor(Math.random() * pool.length)].id;
    save();
  }
  return PALETTES.find((p) => p.id === state.hatch.palette);
}

export function eggStage() {
  const f = eggFraction();
  if (f >= 1) return 'It’s wiggling! Ready to hatch.';
  if (f >= 0.6) return 'Tiny glowing cracks. Something is moving inside!';
  if (f >= 0.3) return 'It feels warm, and hums now and then.';
  return 'Quiet and cozy. Every finished Quest warms it a little.';
}

export function hatchEgg() {
  if (!eggReady()) return null;
  const pal = eggPalette();
  const used = new Set(state.creatures.map((c) => c.name));
  const names = NAMES.filter((n) => !used.has(n));
  const name = names.length ? names[Math.floor(Math.random() * names.length)] : 'Little One';
  const c = { id: uid(), name, palette: pal.id, hatchedAt: Date.now() };
  state.creatures.push(c);
  state.hatch = { warmth: 0, eggIndex: state.hatch.eggIndex + 1, palette: null };
  save();
  eggPalette(); // choose the next egg's look now
  return c;
}

export function renameCreature(id, name) {
  const c = state.creatures.find((x) => x.id === id);
  if (!c || !name.trim()) return;
  c.name = name.trim().slice(0, 24);
  save();
}

// ---- Rewards ----
// Every finished Quest brings one thing, and the kind keeps changing:
//   a treat to feed your dragon, something for your home (you choose where
//   it goes), or a treasure for the pile.
// Every third reward moves the story along instead (story fragments, map
// pieces, the key, in this order).
// Still deliberately not a points economy: nothing to count or spend.
const PROGRESSION = ['story-1', 'map-1', 'story-2', 'map-2', 'mossy-key', 'map-3', 'story-3', 'map-4', 'story-4', 'story-5', 'story-6'];
const WEIGHTS = { treat: 34, haven: 36, treasure: 30 };
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

function pickGift() {
  const log = (state.rewardLog ||= { last: null, count: 0 });
  log.count++;
  const nextStory = PROGRESSION.map(byId).find((it) => !state.found[it.id]);
  if (nextStory && log.count % 3 === 2) return { type: 'item', item: nextStory };
  const free = (kinds) => CATALOG.filter((c) => !c.special && kinds.includes(c.kind) && !state.found[c.id]);
  const havenItems = free(['flower', 'decoration']);
  const treasures = free(['treasure']);
  // The very first reward is something for your home, so it starts to feel like yours.
  if (log.count === 1 && havenItems.length) return { type: 'item', item: pickOne(havenItems) };
  // (Visitors are resting for now; they'll be back in a later realm.)
  const avail = {
    treat: WEIGHTS.treat,
    haven: havenItems.length ? WEIGHTS.haven : 0,
    treasure: treasures.length ? WEIGHTS.treasure : 0,
  };
  if (avail[log.last]) avail[log.last] *= 0.2; // rarely the same kind twice in a row
  let r = Math.random() * Object.values(avail).reduce((a, b) => a + b, 0);
  let kind = 'treat';
  for (const [k, w] of Object.entries(avail)) if ((r -= w) <= 0) { kind = k; break; }
  if (kind === 'haven') return { type: 'item', item: pickOne(havenItems) };
  if (kind === 'treasure') return { type: 'item', item: pickOne(treasures) };
  return { type: 'treat', treat: pickOne(TREATS) };
}

function giveGift(g) {
  const log = state.rewardLog;
  if (g.type === 'treat') {
    state.pantry = state.pantry || {};
    state.pantry[g.treat.id] = (state.pantry[g.treat.id] || 0) + 1;
    log.last = 'treat';
  } else if (g.type === 'visitor') {
    state.visitors = [...(state.visitors || []), g.visitor.id];
    log.last = 'visitor';
  } else {
    state.found[g.item.id] = Date.now();
    // Haven things wait for you to choose where they go.
    if (inHaven(g.item) && g.item.id !== 'dewdrop-lily') state.unplaced = [...(state.unplaced || []), g.item.id];
    log.last = g.item.kind === 'treasure' ? 'treasure' : inHaven(g.item) ? 'haven' : 'story';
  }
}

// Call once when a Quest is completed. Reopening and re-completing a Quest
// doesn't reward it twice.
export function rewardQuest(q, { focusMinutes = 0 } = {}) {
  if (!q || q.rewarded) return null;
  q.rewarded = true;
  state.stats.completed++;
  const wasReady = eggReady();
  let gain = 1;
  if (q.type === 'focus') gain += Math.min(2, Math.floor((focusMinutes || 0) / 25));
  if (q.steps.length >= 3) gain += 1;
  // While a hatchling is still settling in there's no egg to warm.
  const hasEgg = eggHere();
  if (hasEgg && !wasReady) state.hatch.warmth = Math.min(eggNeed(), state.hatch.warmth + gain);
  const gift = pickGift();
  giveGift(gift);
  save();
  return { gain, warmed: hasEgg, nowReady: hasEgg && !wasReady && eggReady(), gift, item: gift.type === 'item' ? gift.item : null };
}

// ---- Treats ----
export const pantryList = () => TREATS.filter((t) => state.pantry?.[t.id] > 0).map((t) => ({ ...t, count: state.pantry[t.id] }));
export function useTreat(id) {
  if (id === 'apple' || !state.pantry?.[id]) return;
  state.pantry[id]--;
  save();
}

// ---- Haven things you place yourself ----
export function placeItem(id, pos) {
  state.placed = { ...(state.placed || {}), [id]: pos };
  state.unplaced = (state.unplaced || []).filter((x) => x !== id);
  save();
}
export function storeItem(id) {
  if (!(state.unplaced || []).includes(id)) state.unplaced = [...(state.unplaced || []), id];
  save();
}

export const isFound = (id) => !!state.found[id];

// Hand over a specific (hidden) discovery once.
export function grant(id) {
  if (state.found[id]) return null;
  state.found[id] = Date.now();
  save();
  return byId(id);
}
export const foundOf = (kind) => CATALOG.filter((c) => c.kind === kind && state.found[c.id]);

// The Mossy Key opens the old chest by the Door.
export function openChest() {
  if (state.chestOpened || !state.found['mossy-key']) return [];
  state.chestOpened = true;
  const items = ['keepers-compass', 'story-chest'].map(byId);
  for (const it of items) state.found[it.id] = Date.now();
  save();
  return items;
}
