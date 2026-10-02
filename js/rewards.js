// What completing a Quest gives back: warmth for the egg, and now and then
// a discovery. Deliberately not a points economy: no numbers to grind,
// just occasional, delightful changes in the world.
import { state, save, uid } from './state.js';
import { CATALOG, byId } from './data/discoveries.js';
import { PALETTES, NAMES } from './data/creatures.js';

// ---- The egg ----
export const eggNeed = () => 10 + 4 * state.hatch.eggIndex;
export const eggFraction = () => Math.min(1, state.hatch.warmth / eggNeed());
export const eggReady = () => state.hatch.phase !== 'raising' && state.hatch.warmth >= eggNeed();

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

// ---- Discoveries ----
// Every other discovery moves the story along (story fragments, map pieces,
// the key, in this order). The rest are surprises for the Haven.
const PROGRESSION = ['story-1', 'map-1', 'story-2', 'map-2', 'mossy-key', 'map-3', 'story-3', 'map-4', 'story-4', 'story-5', 'story-6'];
const KIND_WEIGHTS = { treasure: 30, flower: 24, decoration: 20 };

function pickItem() {
  const nextStory = PROGRESSION.map(byId).find((it) => !state.found[it.id]);
  if (state.discovery.total % 2 === 1 && nextStory) return nextStory;
  const avail = {};
  for (const it of CATALOG) {
    if (it.special || state.found[it.id] || !KIND_WEIGHTS[it.kind]) continue;
    (avail[it.kind] ||= []).push(it);
  }
  const kinds = Object.keys(avail);
  if (!kinds.length) return nextStory || null;
  let r = Math.random() * kinds.reduce((s, k) => s + KIND_WEIGHTS[k], 0);
  let kind = kinds[0];
  for (const k of kinds) if ((r -= KIND_WEIGHTS[k]) <= 0) { kind = k; break; }
  const list = avail[kind];
  return list[Math.floor(Math.random() * list.length)];
}

// Discoveries are occasional: roughly one in three Quests, a little more
// likely after a dry spell or a long focus session. The very first is guaranteed.
function rollDiscovery(focusMinutes) {
  const d = state.discovery;
  const chance = 0.3 + d.miss * 0.18 + (focusMinutes >= 25 ? 0.15 : 0);
  if (d.total > 0 && Math.random() > chance) {
    d.miss++;
    return null;
  }
  const item = pickItem();
  d.miss = 0;
  if (!item) return null;
  d.total++;
  state.found[item.id] = Date.now();
  return item;
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
  const hasEgg = state.hatch.phase !== 'raising';
  if (hasEgg && !wasReady) state.hatch.warmth = Math.min(eggNeed(), state.hatch.warmth + gain);
  const item = rollDiscovery(focusMinutes);
  save();
  return { gain, warmed: hasEgg, nowReady: hasEgg && !wasReady && eggReady(), item };
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
