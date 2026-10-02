// App flow: Welcome → Choose a dragon → Dragon Haven.
import * as THREE from 'three';
import { createWorld, easeOut } from './world/scene.js';
import { buildHaven, VALE_CENTER } from './world/haven.js';
import { buildVale } from './world/vale.js';
import { openDoorPanel } from './ui/door.js';
import { createStory } from './story.js';
import { audio, sfx } from './audio.js';
import { applySettings, openSettings, settings } from './ui/settings.js';
import { runTour, rectOf } from './ui/tour.js';
import {
  RUNES, STONES, litRunes, allLit, valeUnlocked, stoneState, questsUntilStone, wakeStone, markVisited,
  findHidden, markDoorOpened,
} from './realm.js';
import { createDragon } from './world/dragon.js';
import { createActivityDirector } from './world/activities.js';
import { createFocus } from './focus.js';
import { DRAGONS, DRAGON_ORDER, pickLine } from './data/dragons.js';
import { state, save, setDragon, addQuest, resetAll, todayISO, recoverFocus, subscribe } from './state.js';
import { initQuestUI } from './ui/quests.js';
import { createGarden } from './world/garden.js';
import { createHatchlings } from './world/hatchlings.js';
import { createCollection } from './ui/collection.js';
import { byId, inHaven } from './data/discoveries.js';
import {
  rewardQuest, eggFraction, eggPalette, eggReady, eggStage, hatchEgg, foundOf, openChest, grant,
} from './rewards.js';
import { $, $$, esc, say, tell, celebrate, hideCelebrate } from './ui/common.js';
import { createAbilities, ABILITY_LINES } from './world/abilities.js';
import { createFlowerTrail } from './world/trail.js';
import { havenWalkable } from './world/haven.js';
import { valeWalkable } from './world/vale.js';
import { prefersReducedMotion } from './ui/settings.js';

const world = createWorld($('#world'));
const haven = buildHaven(world, { say });
const vale = buildVale(world);
const abilities = createAbilities(world);
// Each dragon leaves a little trail where they walk and rest: Pebble flowers,
// Ember flames, Moon clouds and sparkles. (Meadows stay calmer for Pebble.)
const trail = createFlowerTrail(world, {
  getDragon: () => {
    const screen = document.body.dataset.screen;
    return companion && screen !== 'select' && screen !== 'welcome' ? companion : null;
  },
  getGroundY: () => (where === 'vale' ? VALE_CENTER.y : 0),
});
function applyMeadow() {
  const f = state.dragon === 'pebble' ? 0.3 : 0.6;
  haven.setFlowerDensity(f);
  vale.setFlowerDensity(f);
}
audio.init(settings());
applySettings({ world, audio });

// Time of day follows the real clock (or stays golden afternoon).
function updateTimeOfDay() {
  const now = new Date();
  const hour = settings().timeOfDay ? now.getHours() + now.getMinutes() / 60 : 17.5;
  audio.setNight(haven.setTimeOfDay(hour) > 0.6);
}
updateTimeOfDay();
setInterval(updateTimeOfDay, 60_000);

// A soft tick for buttons.
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn, .check, .chips button, .seg button, .icon-btn, .time-options button, .energy-options button, .dragon-card, .choose-next, .hatch-ready, .play')) sfx.tap();
}, true);
const director = createActivityDirector(world, haven);
const garden = createGarden(world, haven);
const hatchlings = createHatchlings(world, haven, { say });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Bring back everything discovered so far.
for (const id of Object.keys(state.found)) if (inHaven(byId(id) || {})) garden.place(id);
garden.setTreasures(foundOf('treasure').length);
for (const c of state.creatures) hatchlings.spawn(c);
haven.egg.setLook(eggPalette().egg, eggFraction());
if (state.chestOpened) haven.chest.setOpen(true);
if (state.realm.hidden.grotto) vale.revealCrystals(false);
if (state.realm.hidden.glade) vale.openGlade(false);
STONES.forEach((_, i) => vale.setStone(i, stoneState(i)));

// Camera views. Distance grows on narrow screens so things still fit.
const VIEWS = {
  intro: { dir: [0.55, 0.42, 0.72], dist: 30, target: [0, 1, -1.5], fit: 0.9 },
  select: { dir: [0, 0.2, 1], dist: 9.2, target: [0, 0.75, 5.0], fit: 0.62 },
  haven: { dir: [0.08, 0.38, 0.9], dist: 23, target: [-0.3, 1.1, -1.6], fit: 0.85 },
  vale: { dir: [0.06, 0.55, 0.84], dist: 33, target: [VALE_CENTER.x, VALE_CENTER.y + 0.8, VALE_CENTER.z + 0.5], fit: 0.85 },
};
function view(name) {
  const v = VIEWS[name];
  const dist = v.dist * Math.max(1, v.fit / world.aspect);
  const len = Math.hypot(...v.dir);
  const pos = v.target.map((t, i) => t + (v.dir[i] / len) * dist);
  return { pos, target: v.target, dist };
}
function goTo(name, dur) {
  const v = view(name);
  world.controls.maxDistance = Math.max(34, v.dist * 1.3);
  return world.flyTo(v.pos, v.target, dur);
}

function setScreen(name) {
  document.body.dataset.screen = name;
  updateOffset();
}

// Keep the scene centred in the space the UI leaves free.
function updateOffset() {
  const panel = $('#quest-panel');
  const screen = document.body.dataset.screen;
  if (screen === 'focus') return world.setOffset(0, $('#focus-card').offsetHeight / 2.2);
  if (screen !== 'haven') return world.setOffset(0, 0);
  const tucked = panel.dataset.sheet === 'peek';
  if (window.innerWidth >= 820) world.setOffset(tucked ? 0 : (panel.offsetWidth + 24) / 2, 0);
  else world.setOffset(0, tucked ? 0 : Math.min(panel.offsetHeight, window.innerHeight * 0.6) / 2.2);
}
new MutationObserver(updateOffset).observe($('#quest-panel'), { attributes: true, attributeFilter: ['data-sheet'] });
const panelObserver = new ResizeObserver(updateOffset);
panelObserver.observe($('#quest-panel'));
panelObserver.observe($('#focus-card'));
window.addEventListener('resize', updateOffset);

// ---- Dragons in the world ----
let companion = null;
let lineup = [];

function spawn(id, pos) {
  const d = createDragon(DRAGONS[id]);
  d.root.position.copy(pos);
  world.scene.add(d.root);
  world.addUpdater(d.update);
  return d;
}
function despawn(d) {
  world.scene.remove(d.root);
  world.removeUpdater(d.update);
  world.removeTap(d.root);
}
function faceCamera(d) {
  const c = world.camera.position;
  d.faceTowards(c.x, c.z);
}

// ---- 1. Welcome ----
function showWelcome() {
  setScreen('welcome');
  const v = view('intro');
  world.camera.position.set(...v.pos);
  world.controls.target.set(...v.target);
  world.controls.enabled = false;
  world.controls.autoRotate = true;
}
$('#begin').addEventListener('click', () => {
  world.controls.autoRotate = false;
  startSelection();
});

// ---- 2. Choose your companion: a carousel, one dragon at a time ----
const SLIDE_GAP = 7; // world distance between dragons on the row
const MOVE_NAMES = { pebble: 'Flower bloom', ember: 'Fire breath', moon: 'Starlight float' };
let slideIndex = 0; // which dragon is in front
let slide = 0; // the same, but fractional while sliding
const inSelect = () => document.body.dataset.screen === 'select';

function placeLineup() {
  lineup.forEach((d, i) => d.root.position.set((i - slide) * SLIDE_GAP, 0, 5));
}

function startSelection() {
  director.stop();
  trail.clear();
  if (companion) { despawn(companion); companion = null; }
  setScreen('select');
  world.controls.enabled = false;
  world.controls.autoRotate = false;
  slideIndex = Math.max(0, DRAGON_ORDER.indexOf(state.dragon));
  slide = slideIndex;
  lineup = DRAGON_ORDER.map((id) => {
    const d = spawn(id, new THREE.Vector3());
    d.root.rotation.y = 0;
    world.onTap(d.root, () => { if (lineup[slideIndex] === d) showOff(); });
    return d;
  });
  placeLineup();
  renderDragonInfo();
  goTo('select', 2.2).then(showOff);
}

function renderDragonInfo() {
  const d = DRAGONS[DRAGON_ORDER[slideIndex]];
  $('#dragon-info').innerHTML = `
    <span class="name">${esc(d.name)}</span>
    <span class="trait">${esc(d.trait)}</span>
    <span class="blurb">${esc(d.blurb)}</span>
    <span class="move">Special move: <b>${MOVE_NAMES[d.id]}</b></span>
    <span class="pager">${slideIndex + 1} of ${DRAGON_ORDER.length}</span>`;
  $('#prev-dragon').disabled = slideIndex === 0;
  $('#next-dragon').disabled = slideIndex === DRAGON_ORDER.length - 1;
  $('#confirm-dragon').textContent = `Choose ${d.name}`;
}

// The dragon in front shows what it can do.
function showOff() {
  if (!inSelect() || !lineup.length) return;
  const d = lineup[slideIndex];
  abilities.perform(d);
  say(ABILITY_LINES[d.def.id](d.def.name), 3400);
}

function goToSlide(i) {
  i = Math.max(0, Math.min(DRAGON_ORDER.length - 1, i));
  const changed = i !== slideIndex;
  slideIndex = i;
  renderDragonInfo();
  const from = slide;
  world.tween(0.45, (p) => { slide = from + (i - from) * p; placeLineup(); }, easeOut).then(() => { if (changed) showOff(); });
}
$('#prev-dragon').addEventListener('click', () => goToSlide(slideIndex - 1));
$('#next-dragon').addEventListener('click', () => goToSlide(slideIndex + 1));
document.addEventListener('keydown', (e) => {
  if (!inSelect()) return;
  if (e.key === 'ArrowLeft') goToSlide(slideIndex - 1);
  if (e.key === 'ArrowRight') goToSlide(slideIndex + 1);
});

// Swipe left or right, on the scene or on the info card.
let swipe = null;
for (const el of [$('#world'), $('#dragon-info')]) {
  el.addEventListener('pointerdown', (e) => { if (inSelect()) swipe = { x: e.clientX, start: slide }; });
}
window.addEventListener('pointermove', (e) => {
  if (!swipe || !inSelect()) return;
  const dx = e.clientX - swipe.x;
  if (Math.abs(dx) < 6) return;
  slide = Math.max(-0.25, Math.min(DRAGON_ORDER.length - 0.75, swipe.start - dx / (window.innerWidth * 0.7)));
  placeLineup();
});
window.addEventListener('pointerup', (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  swipe = null;
  if (!inSelect() || Math.abs(dx) < 6) return;
  // a decent flick moves one dragon over; otherwise settle on the nearest
  goToSlide(Math.abs(dx) > 50 ? slideIndex + (dx < 0 ? 1 : -1) : Math.round(slide));
});

$('#confirm-dragon').addEventListener('click', async () => {
  if (!lineup.length) return;
  const chosen = DRAGON_ORDER[slideIndex];
  const first = !state.dragon && state.quests.length === 0;
  setDragon(chosen);
  const keep = lineup.find((d) => d.def.id === chosen);
  for (const d of lineup) {
    if (d === keep) continue;
    const s0 = d.root.scale.x;
    world.tween(0.5, (p) => d.root.scale.setScalar(s0 * (1 - p)), easeOut).then(() => despawn(d));
  }
  lineup = [];
  world.removeTap(keep.root);
  companion = keep;
  keep.react('celebrate');
  if (first) addQuest({ title: 'Drink a glass of water', minutes: 2, priority: 'low' });
  await moveCompanionHome(1.6);
  enterHaven(false);
});

async function moveCompanionHome(dur) {
  const from = companion.root.position.clone();
  const to = haven.anchors.home;
  companion.faceTowards(to.x, to.z);
  setScreen('haven');
  const fly = goTo('haven', dur + 0.4);
  await world.tween(dur, (p) => {
    companion.root.position.lerpVectors(from, to, p);
    companion.root.position.y = Math.abs(Math.sin(p * Math.PI * 3)) * 0.25;
  });
  await fly;
  faceCamera(companion);
}

// ---- 3. Dragon Haven ----
let questUIReady = false;
let questUI = null;
function enterHaven(flyIn = true) {
  setScreen('haven');
  const def = DRAGONS[state.dragon];
  if (!companion) {
    companion = spawn(state.dragon, haven.anchors.home);
  }
  world.onTap(companion.root, () => {
    if (busy) return;
    // Sometimes it shows off its special move; otherwise a little reaction.
    if (where === 'haven' && Math.random() < 0.4) {
      abilities.perform(companion);
      say(ABILITY_LINES[def.id](def.name), 3400);
    } else {
      companion.react(Math.random() < 0.5 ? 'hop' : 'tilt');
      say(pickLine(def.lines.tap), 3400);
    }
  });
  applyMeadow();
  $('#haven-sub').textContent = `Verdant Vale · with ${def.name}`;
  document.body.dataset.dragonName = def.name;
  if (!questUIReady) {
    questUIReady = true;
    questUI = initQuestUI({
      onComplete,
      onStartFocus: (id) => focus.begin(id),
      onHatch: () => hatchSequence(),
      onEnergy(level) {
        const n = DRAGONS[state.dragon].name;
        const line = {
          low: `${n} curls up beside you. Small steps count today.`,
          okay: `${n} nods. A steady day it is.`,
          good: `${n} stretches, ready when you are.`,
          full: `${n} is buzzing with excitement. Let's go!`,
        }[level];
        companion?.react(level === 'low' ? 'tilt' : 'hop');
        say(line);
      },
      onGo(quest, step) {
        const n = DRAGONS[state.dragon].name;
        companion?.react('hop');
        say(step
          ? `Just “${step.text}” for now. ${n} will be right here when you get back.`
          : `Go for it! ${n} will be right here when you get back.`, 5000);
      },
    });
  }
  const arrive = () => {
    faceCamera(companion);
    world.controls.enabled = true;
    if (!state.onboarded) setTimeout(startTour, 900);
    else setTimeout(() => say(pickLine(def.lines.greet)), 500);
  };
  if (flyIn) goTo('haven', 2.4).then(arrive);
  else arrive();
}

function completionLine() {
  const def = DRAGONS[state.dragon];
  const remaining = state.quests.filter((x) => !x.done && (!x.due || x.due <= todayISO())).length;
  return remaining === 0
    ? `${pickLine(def.lines.complete)} That's everything for today. Go enjoy the real world.`
    : pickLine(def.lines.complete);
}

// ---- Celebration clips ----
// Finishing a Quest plays a short "clip": the camera zooms in on your dragon
// doing its special move, then on the egg warming, then on any reward as it
// appears. Clips can be skipped, and can be turned off in Settings.
let clipPlaying = false;
let clipsWaiting = 0; // clips playing or queued
let clipSkip = false;
let clipChain = Promise.resolve();
const calmQueue = [];
// Run something once no clip is playing (so news never talks over a clip).
function whenCalm(fn) {
  if (clipsWaiting > 0) calmQueue.push(fn);
  else setTimeout(fn, 500);
}
const clipsOn = () => settings().clips !== false && !prefersReducedMotion();
const cwait = (ms) => (clipSkip ? Promise.resolve() : wait(ms));
const cfly = (pos, target, dur) => world.flyTo(pos, target, clipSkip ? 0.05 : dur);
$('#clip-skip').addEventListener('click', () => { clipSkip = true; });

// Camera spot for looking at something in the Haven: from the front of the
// island (the open side), a little to the right, looking slightly down.
// It tries a few angles and takes the first with a clear line of sight (not
// through your dragon, the cottage, or off the island).
function lookAtSpot(pos, dist = 5, ignoreDragon = false) {
  const k = dist / 5;
  const angles = [[1.0, 4.5], [-2.4, 4.0], [3.2, 3.4], [-3.8, 2.8], [4.2, 2.0], [0, 4.6]];
  const blockers = [{ x: -5.6, z: -2.8, r: 2.9 }]; // the cottage
  if (companion && !ignoreDragon) blockers.push({ x: companion.root.position.x, z: companion.root.position.z, r: 1.5 });
  const clear = (cx, cz) => {
    if (Math.hypot(cx, cz) > 13) return false;
    return blockers.every((b) => {
      // distance from the blocker to the camera→target line
      const dx = pos.x - cx, dz = pos.z - cz;
      const t = Math.max(0, Math.min(1, ((b.x - cx) * dx + (b.z - cz) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(cx + dx * t - b.x, cz + dz * t - b.z) > b.r || Math.hypot(pos.x - b.x, pos.z - b.z) < 0.5;
    });
  };
  const [ox, oz] = angles.find(([x, z]) => clear(pos.x + x * k, pos.z + z * k)) || angles[0];
  return [[pos.x + ox * k, pos.y + 2.1 * k, pos.z + oz * k], [pos.x, pos.y + 0.55, pos.z]];
}

// Show each reward "in action", then its card (which waits for a tap).
async function showRewards(items, { zoom = true } = {}) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const cinematic = zoom && where === 'haven';
    if (cinematic && inHaven(it)) {
      await cfly(...lookAtSpot(garden.positionOf(it.id)), 1.2);
      garden.place(it.id, true);
    } else if (cinematic && it.kind === 'treasure') {
      await cfly(...lookAtSpot(garden.pilePosition(), 3.8), 1.2);
      garden.setTreasures(foundOf('treasure').length);
      garden.popTreasure(it.color);
    } else if (cinematic && companion) {
      // keys, map pieces and story fragments: the dragon digs them up
      const p = companion.root.position;
      await cfly(...lookAtSpot(p, 4.2), 1.0);
      companion.setPose({ headDown: 1, nibble: 1 });
      await cwait(1300);
      companion.setPose({});
      companion.react('hop');
      garden.sparkle(p, 30);
    } else if (inHaven(it)) {
      garden.place(it.id, true);
    }
    sfx.discovery();
    await cwait(900);
    await collection.showDiscovery(it, { more: i < items.length - 1 });
  }
  garden.setTreasures(foundOf('treasure').length);
}

// Rewards found outside of finishing a Quest (the chest, hidden spots in the Vale).
async function reveal(items) {
  if (!items.length) return;
  if (where !== 'haven') return showRewards(items, { zoom: false });
  clipsWaiting++;
  clipChain = clipChain.then(async () => {
    beginClip();
    await showRewards(items);
    endClip();
  });
  return clipChain;
}

function beginClip() {
  clipPlaying = true;
  clipSkip = false;
  busy = true;
  setScreen('clip');
  world.controls.enabled = false;
  director.stop();
}
function endClip() {
  hideCelebrate();
  setScreen('haven');
  world.controls.enabled = true;
  goTo('haven', clipSkip ? 0.4 : 1.4);
  if (companion) faceCamera(companion);
  busy = false;
  clipPlaying = false;
  clipsWaiting = Math.max(0, clipsWaiting - 1);
  refreshDoor(true);
  if (clipsWaiting === 0) while (calmQueue.length) setTimeout(calmQueue.shift(), 900);
}

async function completionClip(q, r, prefix) {
  beginClip();
  celebrate(q.title, prefix.trim(), 0);
  const def = DRAGONS[state.dragon];
  // 1. your dragon, up close, doing its special move
  const p = companion.root.position;
  const ry = companion.root.rotation.y;
  const f = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
  await cfly([p.x + f.x * 5 + f.z * 0.9, p.y + 2.0, p.z + f.z * 5 - f.x * 0.9], [p.x, p.y + 1.15, p.z], 1.0);
  const ms = abilities.perform(companion);
  garden.sparkle(p, 20);
  say(ABILITY_LINES[def.id](def.name), ms + 400);
  await cwait(ms + 500);
  // 2. the egg gets a little warmer
  if (r) {
    const e = haven.egg.worldPosition();
    await cfly([e.x - 1.9, 1.6, e.z + 2.9], [e.x, 0.55, e.z], 0.9);
    haven.egg.setLook(eggPalette().egg, eggFraction());
    haven.egg.pulse();
    say(r.nowReady ? 'The egg is wiggling. It’s ready to hatch!' : 'The egg glows a little warmer.', 2400);
    await cwait(1900);
  }
  hideCelebrate();
  // 3. the reward, in action
  if (r?.item) await showRewards([r.item]);
  endClip();
}

// Completing a Quest: celebrate, warm the egg, and sometimes discover something.
function onComplete(q, { focusMinutes = 0, prefix = '' } = {}) {
  const canClip = clipsOn() && where === 'haven' && companion && document.body.dataset.screen === 'haven' && !hatching;
  const willClip = canClip || clipPlaying;
  if (willClip) clipsWaiting++; // counted before rewards are saved, so news waits for the clip
  const r = rewardQuest(q, { focusMinutes });
  sfx.complete();
  if (clipPlaying) clipSkip = true; // finishing several in a row: hurry the earlier clip along
  if (!willClip) {
    // The simple version: a banner, a hop, and the reward card.
    companion?.react('celebrate');
    if (companion) garden.sparkle(companion.root.position, 20);
    let eggLine = '';
    if (r) {
      haven.egg.setLook(eggPalette().egg, eggFraction());
      haven.egg.pulse();
      eggLine = r.nowReady ? ' The egg is ready to hatch!' : ' The egg glows a little warmer.';
    }
    celebrate(q.title, prefix + completionLine() + eggLine, 4200);
    if (r?.item) setTimeout(() => showRewards([r.item], { zoom: false }).then(() => refreshDoor(true)), 2600);
    else refreshDoor(true);
    return;
  }
  clipChain = clipChain.then(() => completionClip(q, r, prefix)).catch((e) => { console.error(e); endClip(); });
}

// "See it in the Haven" from the collection.
function showItem(id) {
  const pos = garden.positionOf(id);
  if (!pos) return;
  questUI?.setSheet('peek');
  world.flyTo(...lookAtSpot(pos), 1.6);
  garden.sparkle(pos, 20);
}

// ---- Eggs and hatching ----
const collection = createCollection({
  onReplay: (id) => story.replay(id),
  getDragonName: () => DRAGONS[state.dragon]?.name || 'Your dragon',
  onHatch: () => hatchSequence(),
  onShowItem: showItem,
});
$('#collection-btn').addEventListener('click', () => collection.open(eggReady() ? 'eggs' : undefined));

world.onTap(haven.nest, () => {
  if (where !== 'haven' || busy) return;
  if (story.pending('mysterious-egg')) return story.play('mysterious-egg');
  if (eggReady()) return hatchSequence();
  haven.egg.wobble();
  say(`${eggStage()} The shell’s symbols match the ones on the Ancient Door.`, 4500);
});

world.onTap(haven.chest.object, () => {
  if (where !== 'haven') return;
  if (state.chestOpened) return say('The old chest stands open. Its treasures are safe in your collection.');
  if (!state.found['mossy-key']) {
    haven.chest.jiggle();
    return say('An old chest, sealed tight. Maybe a key is out there somewhere.');
  }
  haven.chest.setOpen(true);
  const items = openChest();
  garden.sparkle(haven.chest.object.position, 50);
  say('The Mossy Key turns with a soft click…', 2500);
  companion?.react('celebrate');
  setTimeout(() => { reveal(items); refreshDoor(true); }, 1400);
});

// ---- The Ancient Door ----
let lastLit = litRunes();
haven.door.setLit(lastLit);
// Light any newly earned symbols; optionally tell the player about it.
function refreshDoor(announce = true) {
  const lit = litRunes();
  const fresh = lit.map((v, i) => v && !lastLit[i]).map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  lastLit = lit;
  haven.door.setLit(lit);
  STONES.forEach((_, i) => vale.setStone(i, stoneState(i)));
  if (!fresh.length || !announce) return;
  haven.door.pulse();
  const msg = allLit()
    ? 'All eight symbols on the Ancient Door are glowing. The Door is awake! Tap it to see.'
    : `A new symbol on the Ancient Door just lit up: “${RUNES[fresh[0]].name}.” Tap the Door to see them all.`;
  whenCalm(() => tell(msg));
}

function showDoorPanel() {
  haven.door.pulse();
  openDoorPanel({ onOpen: openDoorSequence, onVale: travelToVale });
}
world.onTap(haven.door.object, () => {
  if (where !== 'haven' || busy) return;
  if (story.pending('door-waking')) return story.play('door-waking');
  showDoorPanel();
});

function openDoorSequence() {
  return story.play('new-realm');
}

// ---- Traveling between the Haven and Verdant Vale ----
let where = 'haven';
let busy = false;
const HAVEN_CENTER = new THREE.Vector3(0, 0, 0);

async function travelToVale() {
  if (busy || where === 'vale' || !companion) return;
  if (!valeUnlocked()) return say('The path to the Vale is still misty. Finish a Quest to clear it.', 4200);
  busy = true;
  collection.hideDiscovery();
  setScreen('travel');
  world.controls.enabled = false;
  const trip = director.travel(companion, vale.arrive);
  sfx.whoosh();
  audio.setLocation('vale');
  const v = view('vale');
  const mid = world.camera.position.clone().lerp(new THREE.Vector3(...v.pos), 0.5).add(new THREE.Vector3(0, 10, 0));
  const midTarget = world.controls.target.clone().lerp(new THREE.Vector3(...v.target), 0.5);
  await world.flyTo(mid.toArray(), midTarget.toArray(), 2);
  haven.setLightFocus(VALE_CENTER);
  world.setBounds(VALE_CENTER, 11);
  world.controls.maxDistance = Math.max(40, v.dist * 1.3);
  await world.flyTo(v.pos, v.target, 2.6);
  await trip;
  where = 'vale';
  story.setLocation();
  setScreen('vale');
  world.controls.enabled = true;
  busy = false;
  const first = markVisited();
  const n = DRAGONS[state.dragon].name;
  if (first) tell(`Welcome to Verdant Vale! Things are hidden here. Tap anything that looks interesting, and double-tap the ground to send ${n} walking.`);
  else say(`${n} is happy to be back in Verdant Vale.`);
  refreshDoor(true);
}

async function returnToHaven() {
  if (busy || where !== 'vale') return;
  busy = true;
  setScreen('travel');
  world.controls.enabled = false;
  const trip = director.travel(companion, haven.anchors.home);
  sfx.whoosh();
  audio.setLocation('haven');
  const v = view('haven');
  const mid = world.camera.position.clone().lerp(new THREE.Vector3(...v.pos), 0.5).add(new THREE.Vector3(0, 10, 0));
  const midTarget = world.controls.target.clone().lerp(new THREE.Vector3(...v.target), 0.5);
  await world.flyTo(mid.toArray(), midTarget.toArray(), 2);
  haven.setLightFocus(HAVEN_CENTER);
  world.setBounds(HAVEN_CENTER, 8);
  await world.flyTo(v.pos, v.target, 2.6);
  await trip;
  where = 'haven';
  story.setLocation();
  setScreen('haven');
  world.controls.enabled = true;
  busy = false;
  say('Home again. Your Quests are right where you left them.', 3600);
}
$('#vale-btn').addEventListener('click', travelToVale);
$('#return-btn').addEventListener('click', returnToHaven);

// ---- Exploring the Vale ----
function valeTap(obj, spotName, lookAt, fn) {
  world.onTap(obj, () => {
    if (where !== 'vale' || busy) return;
    director.visit(companion, vale.spot(spotName), lookAt);
    fn();
  });
}
const dragonName = () => DRAGONS[state.dragon]?.name || 'Your dragon';
function grantAndReveal(id, delay = 1400) {
  const item = grant(id);
  if (item) setTimeout(() => reveal([item]), delay);
  refreshDoor(true);
}

valeTap(vale.targets.waterfall, 'waterfall', vale.world('waterfall'), async () => {
  if (findHidden('grotto')) {
    say(`${dragonName()} peeks behind the waterfall… there's a hidden grotto!`, 3600);
    await vale.revealCrystals();
    grantAndReveal('vale-crystal', 600);
  } else {
    say('The great falls of Verdant Vale. Crystals glow softly in the grotto behind the water.');
  }
});
valeTap(vale.targets.hollow, 'hollow', vale.world('hollow'), () => {
  if (findHidden('hollow')) {
    say(`${dragonName()} reaches into the hollow tree… something silver!`, 3600);
    grantAndReveal('owl-feather', 1800);
  } else {
    say('A cozy hollow. Whoever lives here is shy.');
  }
});
valeTap(vale.targets.glade, 'glade', vale.world('glade'), async () => {
  if (findHidden('glade')) {
    say('The bushes rustle… and part to reveal a hidden glade!', 3600);
    await vale.openGlade();
    grantAndReveal('glowcaps', 600);
  } else {
    say('The hidden glade glows softly with little mushrooms.');
  }
});
valeTap(vale.targets.mural, 'mural', vale.world('mural'), () => {
  if (!state.found['story-mural']) {
    say('Old carvings in the ruins. They look like the Ancient Door…', 3200);
    grantAndReveal('story-mural', 1600);
  } else {
    say('The mural shows dragons flying through a door of light.');
  }
});
valeTap(vale.targets.pool, 'waterfall', vale.world('waterfall'), () => say('The pool is cold and clear, and very, very deep.'));
vale.targets.stones.forEach((obj, i) => {
  valeTap(obj, `stone${i}`, obj.getWorldPosition(new THREE.Vector3()), async () => {
    const st = stoneState(i);
    const name = STONES[i].name;
    if (st === 'awake') return say(`The ${name} glows steadily, humming with the Door.`);
    if (st === 'dormant') {
      const k = questsUntilStone(i);
      return tell(`The ${name} is still asleep. It will wake up after you finish ${k} more ${k === 1 ? 'Quest' : 'Quests'}.`);
    }
    wakeStone(i);
    say(`The ${name} awakens!`, 2600);
    companion?.react('celebrate');
    sfx.moment();
    await vale.awakenStone(i);
    refreshDoor(false);
    haven.door.pulse();
    tell(allLit()
      ? 'Back in the Haven, the last symbol on the Ancient Door just lit up. The Door is awake! Go home and tap it.'
      : `Back in the Haven, a new symbol on the Ancient Door just lit up: “${name}.”`);
  });
});

// ---- Story Moments and the side characters ----
const story = createStory({
  world,
  haven,
  vale,
  director,
  getCompanion: () => companion,
  getWhere: () => where,
  say,
  tell,
  whenCalm,
  sparkle: garden.sparkle,
  onBegin(id) {
    id === 'door-waking' || id === 'new-realm' ? sfx.door() : sfx.moment();
    busy = true;
    collection.hideDiscovery();
    setScreen('story');
    world.controls.enabled = false;
  },
  onEnd() {
    setScreen('haven');
    world.controls.enabled = true;
    goTo('haven', 1.8);
    director.goHome(companion);
    busy = false;
  },
});
subscribe(() => story.check());

let hatching = false;
async function hatchSequence() {
  if (hatching || !eggReady() || !companion) return;
  hatching = true;
  collection.hideDiscovery();
  setScreen('hatch');
  world.controls.enabled = false;
  director.stop();
  const e = haven.egg.worldPosition();
  companion.faceTowards(e.x, e.z);
  await world.flyTo([e.x - 2.2, 2.0, e.z + 3.0], [e.x, 0.6, e.z], 1.6);
  say('The egg is hatching…', 3000);
  await haven.egg.shake(2.6);
  const c = hatchEgg();
  haven.egg.burst();
  sfx.hatch();
  garden.sparkle(e, 60);
  hatchlings.spawn(c, { pop: true });
  companion.react('celebrate');
  await wait(1400);
  const name = await collection.showHatchling(c);
  hatchlings.rename(c.id, name);
  await wait(500);
  await haven.egg.appear(eggPalette().egg);
  tell('A new egg has appeared in the nest. Keep finishing Quests to warm this one too.');
  refreshDoor(true);
  setScreen('haven');
  world.controls.enabled = true;
  goTo('haven', 1.8);
  hatching = false;
}

// ---- Focus Quests ----
const focus = createFocus({
  world,
  director,
  getCompanion: () => companion,
  setScreen,
  onDone({ quest, complete, minutes }) {
    setScreen('haven');
    goTo('haven', 1.8);
    if (!quest) return;
    if (complete) {
      setTimeout(() => onComplete(quest, { focusMinutes: minutes, prefix: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} of focus. ` }), 900);
    } else {
      say(`Saved ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} of focus on “${quest.title}”. Pick it up anytime.`, 5000);
    }
  },
});

// ---- Double-tap the ground: your dragon walks there ----
const ripple = new THREE.Mesh(
  new THREE.RingGeometry(0.34, 0.42, 32),
  new THREE.MeshBasicMaterial({ color: '#fff0c2', transparent: true, opacity: 0, depthWrite: false })
);
ripple.rotation.x = -Math.PI / 2;
world.scene.add(ripple);

world.onDoubleTap((sx, sy) => {
  const screen = document.body.dataset.screen;
  if (busy || touring || !companion || (screen !== 'haven' && screen !== 'vale')) return;
  const inVale = where === 'vale';
  const groundY = inVale ? VALE_CENTER.y : 0;
  const walkable = inVale ? valeWalkable : havenWalkable;
  const target = world.groundPoint(sx, sy, groundY);
  if (!target) return;
  // If that exact spot isn't somewhere a dragon can stand (the pond, a
  // building, off the edge), go as close as possible along the way there.
  const from = companion.root.position;
  let spot = null;
  for (let k = 1; k >= 0.1; k -= 0.05) {
    const x = from.x + (target.x - from.x) * k, z = from.z + (target.z - from.z) * k;
    if (walkable(x, z)) { spot = new THREE.Vector3(x, groundY, z); break; }
  }
  if (!spot) return;
  director.walkTo(companion, spot);
  ripple.position.set(spot.x, groundY + 0.05, spot.z);
  world.tween(0.9, (p) => {
    ripple.scale.setScalar(0.6 + p * 1.6);
    ripple.material.opacity = 0.9 * (1 - p);
  }, (p) => p);
});

// ---- Welcome tour ----
let touring = false;
async function startTour() {
  if (touring || document.body.dataset.screen !== 'haven') return;
  touring = true;
  const name = DRAGONS[state.dragon].name;
  questUI?.setSheet('half');
  const eggRect = () => {
    const p = world.toScreen(haven.egg.worldPosition());
    return p.visible ? { x: p.x - 44, y: p.y - 50, w: 88, h: 88 } : null;
  };
  await runTour([
    { title: `Welcome to Dragon Haven`, text: `This is ${name}’s home. It grows and changes as you get things done in your real life.` },
    { title: 'Quests', text: 'Anything you need to do, big or small, is a Quest. Templates save time for things you do again and again.', target: () => rectOf($('#new-quest')) },
    { title: 'Stuck?', text: 'Choose My Next Quest picks one thing for you, based on how much time you have.', target: () => rectOf($('.choose-next')) || rectOf($('#quest-list')) },
    { title: 'The egg', text: 'Finishing Quests warms the egg and sometimes uncovers treasures. No points, no streaks. Just little surprises.', target: eggRect, round: true },
    { title: 'Exploring', text: 'Fly to Verdant Vale, see your treasures, and find settings up here.', target: () => rectOf($('#vale-btn'), $('#collection-btn'), $('#menu-btn')) },
    { title: 'One rule', text: `This works best when you leave the app and go do the thing. ${name} will be right here when you get back.` },
  ]);
  state.onboarded = true;
  save();
  touring = false;
  say(pickLine(DRAGONS[state.dragon].lines.greet));
}

// ---- Menu ----
const menu = $('#menu');
const menuBtn = $('#menu-btn');
function setMenu(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.addEventListener('click', (e) => { e.stopPropagation(); setMenu(menu.hidden); });
document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setMenu(false); });
menu.addEventListener('click', (e) => {
  const act = e.target.closest('[data-menu]')?.dataset.menu;
  setMenu(false);
  if (act === 'recenter') goTo('haven', 1.4);
  if (act === 'templates') questUI?.openTemplates();
  if (act === 'collection') collection.open();
  if (act === 'settings') openSettings({ onChange: () => { applySettings({ world, audio }); updateTimeOfDay(); }, onTour: startTour });
  if (act === 'door') showDoorPanel();
  if (act === 'vale') travelToVale();
  if (act === 'companion') startSelection();
  if (act === 'reset' && window.confirm('Start over? This erases your dragon and all your Quests on this device.')) {
    resetAll();
    location.reload();
  }
});

// ---- Boot ----
if (state.dragon && DRAGONS[state.dragon]) {
  const v = view('intro');
  world.camera.position.set(...v.pos);
  world.controls.target.set(...v.target);
  if (recoverFocus()) {
    enterHaven(false);
    focus.resumeSession(); // a session left open comes back paused
  } else {
    enterHaven(true);
  }
} else {
  showWelcome();
}
const hideLoading = () => $('#loading').classList.add('done');
requestAnimationFrame(() => requestAnimationFrame(hideLoading));
setTimeout(hideLoading, 2500); // in case frames are throttled

// Debug handle for local development only.
story.check();

if (location.hostname === 'localhost') window.quest = { story, world, director, garden, haven, vale, state, reveal, hatchSequence, refreshDoor, travelToVale, returnToHaven, openDoorSequence, get companion() { return companion; } };
