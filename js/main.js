// App flow: Welcome → Choose a dragon → your home island.
// Across the sky is Dragon Haven: the Ancient Door, the star egg and Quill.
import * as THREE from 'three';
import { createWorld, easeOut } from './world/scene.js';
import { buildHaven, VALE_CENTER } from './world/haven.js';
import { buildVale, SANCTUARY } from './world/vale.js';
import { openDoorPanel } from './ui/door.js';
import { createStory } from './story.js';
import { audio, sfx } from './audio.js';
import { applySettings, openSettings, settings } from './ui/settings.js';
import { runTour, rectOf } from './ui/tour.js';
import {
  litRunes, starReady, valeUnlocked, markVisited, findHidden,
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
  rewardQuest, eggFraction, eggPalette, eggReady, eggStage, eggNeed, hatchEgg, foundOf, openChest, grant, placeItem, storeItem,
} from './rewards.js';
import { $, $$, esc, say, tell, ask, celebrate, hideCelebrate, pauseTells, resumeTells } from './ui/common.js';
import { GIFTS, raising, wishText, eggInsight, wishProgress, startRaising, hasEgg, settleOldSave } from './wishes.js';
import { createAbilities, ABILITY_LINES } from './world/abilities.js';
import { createFlowerTrail } from './world/trail.js';
import { havenWalkable } from './world/haven.js';
import { valeWalkable } from './world/vale.js';
import { prefersReducedMotion } from './ui/settings.js';
import { createBubbles } from './ui/bubble.js';
import { createMoments } from './moments.js';
import { createCare } from './care.js';
import { buildSkyRoute } from './world/sky.js';
import { STAR_MEMORIES } from './data/life.js';

const world = createWorld($('#world'));
const haven = buildHaven(world, { say, sanctuary: SANCTUARY });
const vale = buildVale(world);
const abilities = createAbilities(world);
// Each dragon leaves a little trail where they walk and rest: Pebble flowers,
// Ash flames, Moon clouds and sparkles. (Meadows stay calmer for Pebble.)
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
const hatchlings = createHatchlings(world, haven, {
  say,
  // the newest baby stays in the big nest until their own is built
  isNestling: (id) => raising() && state.wish.creatureId === id,
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
buildSkyRoute(world, new THREE.Vector3(0, 2, 0), VALE_CENTER.clone().add(new THREE.Vector3(0, 2, 0)));

// Thought bubbles, and what happens when you tap your dragon.
const bubbles = createBubbles(world);
const moments = createMoments({
  world, director, abilities, bubbles, haven,
  news: () => havenNews(),
  sparkle: garden.sparkle,
  getCompanion: () => companion,
  getWhere: () => where,
  isBusy: () => busy || touring,
  walkable: (x, z) => (where === 'vale' ? valeWalkable(x, z) : havenWalkable(x, z)),
  onStartFocus: (id) => focus.begin(id),
  onNewQuest: () => $('#new-quest').click(),
  // Helping your dragon warms the egg a little (once a day).
  onFavor() {
    if (eggReady() || hatching || !hasEgg()) return;
    state.hatch.warmth = Math.min(eggNeed(), state.hatch.warmth + 1);
    save();
    haven.egg.setLook(eggPalette().egg, eggFraction());
    say(eggReady() ? 'Far away in Dragon Haven, the star egg felt that kindness. It’s ready to hatch!' : 'Far away in Dragon Haven, the star egg feels a little warmer.', 4600);
  },
});

// Saves from before the move to Dragon Haven: one egg per realm now.
settleOldSave();

// Bring back everything discovered so far.
for (const id of Object.keys(state.found)) if (inHaven(byId(id) || {}) && !(state.unplaced || []).includes(id)) garden.place(id);
garden.setTreasures(foundOf('treasure').length);
for (const c of state.creatures) hatchlings.spawn(c);
haven.egg.setLook(eggPalette().egg, eggFraction());
if (!hasEgg()) haven.egg.setVisible(false); // the star egg has hatched; the next egg comes from another realm
if (state.chestOpened) haven.chest.setOpen(true);
if (state.realm.hidden.grotto) vale.revealCrystals(false);
if (state.realm.hidden.glade) vale.openGlade(false);

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
  if (name !== document.body.dataset.screen) bubbles.hide();
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
  world.onTap(companion.root, () => moments.tap());
  applyMeadow();
  care.render();
  $('#haven-sub').textContent = `${def.name}’s home`;
  document.body.dataset.dragonName = def.name;
  if (!questUIReady) {
    questUIReady = true;
    questUI = initQuestUI({
      onComplete,
      onStartFocus: (id) => focus.begin(id),
      onHatch: () => (where === 'vale' ? hatchSequence() : travelToVale().then(hatchSequence)),
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
let hatching = false;
let clipPlaying = false;
let clipsWaiting = 0; // clips playing or queued
let clipSkip = false;
let clipChain = Promise.resolve();
const calmQueue = [];
// Run something once no clip is playing (so news never talks over a clip).
function whenCalm(fn) {
  if (clipsWaiting > 0 || hatching) calmQueue.push(fn);
  else setTimeout(() => (clipsWaiting > 0 || hatching ? calmQueue.push(fn) : fn()), 500);
}
function flushCalm() {
  if (clipsWaiting > 0 || hatching) return;
  while (calmQueue.length) setTimeout(calmQueue.shift(), 900);
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
      await cfly(...lookAtSpot(garden.positionOf(it.id)), 2.0);
      await cwait(500);
      garden.place(it.id, true);
    } else if (cinematic && it.kind === 'treasure') {
      await cfly(...lookAtSpot(garden.pilePosition(), 3.8), 2.0);
      await cwait(500);
      garden.setTreasures(foundOf('treasure').length);
      garden.popTreasure(it.color);
    } else if (cinematic && companion) {
      // keys, map pieces and story fragments: the dragon digs them up
      const p = companion.root.position;
      await cfly(...lookAtSpot(p, 4.2), 1.8);
      companion.setPose({ headDown: 1, nibble: 1 });
      await cwait(2400);
      companion.setPose({});
      companion.react('hop');
      garden.sparkle(p, 30);
    } else if (inHaven(it)) {
      garden.place(it.id, true);
    }
    sfx.discovery();
    await cwait(cinematic ? 2400 : 900);
    await collection.showDiscovery(it, { more: i < items.length - 1 });
  }
  garden.setTreasures(foundOf('treasure').length);
}

// Rewards found outside of finishing a Quest (the chest, hidden spots in Dragon Haven).
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
  pauseTells();
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
  goTo('haven', clipSkip ? 0.4 : 2.2);
  if (companion) faceCamera(companion);
  busy = false;
  clipPlaying = false;
  clipsWaiting = Math.max(0, clipsWaiting - 1);
  refreshDoor(true);
  if (clipsWaiting === 0) {
    setTimeout(resumeTells, 700);
    setTimeout(placeNext, 2400);
    while (calmQueue.length) setTimeout(calmQueue.shift(), 900);
  }
}

async function completionClip(q, r, prefix) {
  beginClip();
  celebrate(q.title, prefix.trim(), 0);
  // 1. your dragon, up close, celebrating (a different way each time)
  const p = companion.root.position;
  const ry = companion.root.rotation.y;
  const f = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
  await cfly([p.x + f.x * 5 + f.z * 0.9, p.y + 2.0, p.z + f.z * 5 - f.x * 0.9], [p.x, p.y + 1.15, p.z], 1.6);
  const how = ['celebrate', 'move', 'stretch'].filter((k) => k !== lastCheer)[Math.floor(Math.random() * 2)];
  lastCheer = how;
  garden.sparkle(p, 20);
  if (how === 'move') {
    const ms = abilities.perform(companion);
    await cwait(ms + 600);
  } else {
    companion.react(how);
    await cwait(2200);
  }
  if (r?.warmed) haven.egg.setLook(eggPalette().egg, eggFraction());
  hideCelebrate();
  // 3. the reward, in action
  if (r?.gift) await showGift(r.gift);
  endClip();
}
let lastCheer = null;

// Each kind of reward gets its own little moment, then a card.
async function showGift(g, { zoom = true } = {}) {
  const cinematic = zoom && where === 'haven' && companion;
  const n = DRAGONS[state.dragon].name;
  if (g.type === 'item') {
    const it = g.item;
    if (inHaven(it) && garden.canPlace(it.id)) {
      // Something for the Haven: you decide where it goes, right after.
      sfx.discovery();
      await collection.showDiscovery(it, { placeLater: true });
      pendingPlace.push(it.id);
      return;
    }
    return showRewards([it], { zoom });
  }
  if (g.type === 'treat') {
    const t = g.treat;
    if (cinematic) {
      const p = companion.root.position;
      const ry = companion.root.rotation.y;
      const at = p.clone().add(new THREE.Vector3(Math.sin(ry) * 0.9, 0, Math.cos(ry) * 0.9));
      companion.setPose({ headDown: 1, nibble: 1 });
      await cwait(1400);
      companion.setPose({});
      garden.popTreasure(t.color, at);
      companion.react('hop');
      await cwait(1800);
    }
    sfx.discovery();
    await collection.showCard({
      icon: t.icon, eyebrow: `${n} found a treat!`, title: t.name, desc: t.desc,
      note: `Saved for later. Feed it to ${n} from the button at the top left.`, button: 'Yum!',
    });
    care.render();
    return;
  }
}

// ---- Choosing where Haven things go ----
// Tap the ground to move it, turn it if you like, then put it there (or
// save it for later in Hatch & Treasures).
const pendingPlace = [];
let placing = null; // { id, obj, ry }
function placeNext() {
  if (!pendingPlace.length || placing || busy || document.body.dataset.screen !== 'haven') return;
  startPlacing(pendingPlace.shift());
}
function startPlacing(id) {
  if (placing || busy) return;
  const it = byId(id);
  if (!it || !garden.canPlace(id)) return;
  questUI?.setSheet('peek');
  garden.remove(id);
  garden.place(id, true);
  const obj = garden.objectOf(id);
  placing = { id, obj, ry: obj.rotation.y };
  busy = true;
  setScreen('place');
  world.controls.enabled = true;
  goTo('haven', 1.4);
  $('#place-name').textContent = it.name;
}
function finishPlacing(keep) {
  if (!placing) return;
  const { id, obj } = placing;
  if (keep) {
    placeItem(id, [obj.position.x, obj.position.y, obj.position.z, obj.rotation.y]);
    garden.sparkle(obj.position, 30);
    sfx.discovery();
    companion?.react('hop');
  } else {
    storeItem(id);
    garden.remove(id);
    tell('It’s saved in Hatch & Treasures, under Garden. Place it whenever you like.');
  }
  placing = null;
  busy = false;
  setScreen('haven');
  setTimeout(placeNext, 600);
}
$('#place-turn').addEventListener('click', () => { if (placing) placing.obj.rotation.y += Math.PI / 4; });
$('#place-ok').addEventListener('click', () => finishPlacing(true));
$('#place-later').addEventListener('click', () => finishPlacing(false));
{
  // a tap (not a drag) on the ground moves the thing being placed
  let down = null;
  $('#world').addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  $('#world').addEventListener('pointerup', (e) => {
    if (!placing || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    const pt = world.groundPoint(e.clientX, e.clientY, 0);
    if (!pt) return;
    const ok = Math.hypot(pt.x, pt.z) < 11.5 && Math.hypot(pt.x + 5.6, pt.z + 2.8) > 2.3 && Math.hypot(pt.x - 5.2, pt.z - 1.4) > 2.5 && !(Math.abs(pt.x) < 3.4 && pt.z < -7.6);
    if (!ok) return say('That spot’s taken. Try somewhere on the grass.', 2400);
    placing.obj.position.set(pt.x, placing.obj.position.y, pt.z);
    garden.sparkle(pt, 8);
  });
}

// Completing a Quest: celebrate, warm the egg, and sometimes discover something.
function onComplete(q, { focusMinutes = 0, prefix = '' } = {}) {
  const canClip = clipsOn() && where === 'haven' && companion && document.body.dataset.screen === 'haven' && !hatching;
  const willClip = canClip || clipPlaying;
  if (willClip) clipsWaiting++; // counted before rewards are saved, so news waits for the clip
  const r = rewardQuest(q, { focusMinutes });
  const granted = r ? wishProgress({ quests: 1, focus: focusMinutes }) : null;
  sfx.complete();
  if (clipPlaying) clipSkip = true; // finishing several in a row: hurry the earlier clip along
  if (!willClip) {
    // The simple version: a banner, a hop, and the reward card.
    companion?.react('celebrate');
    if (companion) garden.sparkle(companion.root.position, 20);
    let eggLine = '';
    if (r?.warmed) haven.egg.setLook(eggPalette().egg, eggFraction());
    if (r?.nowReady) eggLine = ' The star egg is ready to hatch!';
    celebrate(q.title, prefix + completionLine() + eggLine, 4200);
    if (r?.gift) setTimeout(() => showGift(r.gift, { zoom: false }).then(() => { refreshDoor(true); placeNext(); }), 2600);
    else refreshDoor(true);
    queueWish(granted);
    return;
  }
  clipChain = clipChain.then(() => completionClip(q, r, prefix)).catch((e) => { console.error(e); endClip(); });
  queueWish(granted);
  // The egg is in Dragon Haven: when it's ready, say so (and you can fly over).
  if (r?.nowReady) clipChain = clipChain.then(() => whenCalm(() => (where === 'vale' ? hatchSequence() : tell('The star egg is ready to hatch! Fly to Dragon Haven to be there when it does.'))));
}

// ---- Wishes coming true ----
// (See wishes.js.) Each one plays as a short clip in the Haven; elsewhere, or
// with clips turned off, it simply happens and you're told about it.
function applyWish(g) {
  const c = state.creatures.find((x) => x.id === g.creatureId);
  if (g.step === 'nest') hatchlings.buildNest(c);
  else hatchlings.giveGift(c);
}
function nextWishNote() {
  const next = wishText();
  if (next) tell(`${DRAGONS[state.dragon].name}: “${next}”`);
  else if (eggInsight()) tell(eggInsight());
}
function queueWish(g) {
  if (!g) return;
  const baby = state.creatures.find((x) => x.id === g.creatureId)?.name || 'The little one';
  if (!(clipsOn() && where === 'haven' && companion && !hatching)) {
    applyWish(g);
    whenCalm(() => {
      tell({
        nest: `${baby} has a nest of their own now, in the meadow by the cottage.`,
        gift: GIFTS[state.dragon].given(baby),
      }[g.step]);
      nextWishNote();
    });
    return;
  }
  clipsWaiting++;
  clipChain = clipChain.then(() => wishClip(g, baby)).catch((e) => { console.error(e); endClip(); });
}

async function wishClip(g, baby) {
  beginClip();
  const c = state.creatures.find((x) => x.id === g.creatureId);
  const n = DRAGONS[state.dragon].name;
  if (g.step === 'nest') {
    const spot = hatchlings.nestSpot(c);
    celebrate(`A nest for ${baby}`, '', 0, 'A wish come true');
    director.visit(companion, new THREE.Vector3(spot.x - 1.5, 0, spot.z - 0.5), spot); // behind the nest, out of the camera's way
    await cfly(...lookAtSpot(spot, 4.8, true), 2.2);
    say(`${n} gathers twigs and soft moss…`, 4600);
    await cwait(2800);
    companion.setPose({ headDown: 0.9, sweep: 1 });
    await cwait(2800);
    companion.setPose({});
    sfx.discovery();
    garden.sparkle(spot, 30);
    const built = hatchlings.buildNest(c);
    await cwait(1500);
    say(`${baby} hops over to try it out…`, 3600);
    await built;
    companion.react('celebrate');
    say(`${baby} has a nest of their own!`, 4400);
    await cwait(4000);
  } else if (g.step === 'gift') {
    const gift = GIFTS[state.dragon];
    const spot = hatchlings.nestSpot(c);
    celebrate(`A gift for ${baby}`, '', 0, 'A wish come true');
    director.visit(companion, new THREE.Vector3(spot.x - 1.5, 0, spot.z - 0.5), spot);
    hatchlings.gather(c);
    await cfly(...lookAtSpot(spot, 4.4, true), 2.2);
    say(gift.making(n), 5000);
    await cwait(2600);
    companion.setPose({ headDown: 0.8, sweep: 1 });
    await cwait(3200);
    companion.setPose({});
    sfx.discovery();
    hatchlings.giveGift(c);
    garden.sparkle(hatchlings.position(c.id).add(new THREE.Vector3(0, 0.6, 0)), 30);
    companion.react('celebrate');
    await cwait(900);
    say(gift.given(baby), 4800);
    await cwait(4600);
  }
  hideCelebrate();
  endClip();
  whenCalm(nextWishNote);
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
  onHatch: () => (where === 'vale' ? hatchSequence() : travelToVale().then(hatchSequence)),
  onShowItem: showItem,
  onPlace: (id) => { if (document.body.dataset.screen === 'haven' && where === 'haven') startPlacing(id); },
});
$('#collection-btn').addEventListener('click', () => collection.open(eggReady() ? 'eggs' : undefined));

world.onTap(haven.nest, () => {
  if (where !== 'vale' || busy) return;
  if (!haven.egg.isVisible()) {
    const b = state.creatures[0];
    return say(b ? `The nest where ${b.name} hatched. It’s empty now, and still a little warm.` : 'An empty nest.', 4500);
  }
  if (story.pending('egg-and-door')) return story.play('egg-and-door');
  if (eggReady()) return hatchSequence();
  haven.egg.wobble();
  say(`${eggStage()} A star is carved into its shell, just like the one on the Door.`, 4800);
});

world.onTap(haven.chest.object, () => {
  if (where !== 'vale' || busy) return;
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
  if (!fresh.length || !announce) return;
  haven.door.pulse();
  whenCalm(() => tell(state.realm.doorOpened
    ? 'The Star on the Ancient Door is glowing.'
    : 'The Star on the Ancient Door is glowing! Fly to Dragon Haven and tap the Door.'));
}

function showDoorPanel() {
  haven.door.pulse();
  openDoorPanel({ onOpen: openDoorSequence, onVale: travelToVale, here: where === 'vale' });
}
world.onTap(haven.door.object, () => {
  if (where !== 'vale' || busy) return;
  showDoorPanel();
});
world.onTap(haven.signpost, () => { if (where === 'haven' && !busy) travelToVale(); });

function openDoorSequence() {
  return story.play('new-realm');
}

// ---- Flying between home and Dragon Haven ----
let where = 'haven';
let busy = false;
const HAVEN_CENTER = new THREE.Vector3(0, 0, 0);

// While flying, the camera rides just behind and above your dragon.
let chase = null;
world.addUpdater((t, dt) => {
  if (!chase || !companion) return;
  const d = companion.root;
  const fwd = new THREE.Vector3(Math.sin(d.rotation.y), 0, Math.cos(d.rotation.y));
  // far enough back to see the dragon, the sky and where you're headed
  // (a tall phone screen sees less side to side, so the camera sits further back there)
  const back = Math.min(2.1, Math.max(1, 0.95 / world.aspect));
  const want = d.position.clone().addScaledVector(fwd, -11 * back).add(new THREE.Vector3(0, 4.2 * Math.sqrt(back), 0));
  const k = 1 - Math.exp(-dt * chase.stiff);
  world.camera.position.lerp(want, k);
  world.controls.target.lerp(d.position.clone().addScaledVector(fwd, 5).add(new THREE.Vector3(0, 0.6, 0)), k);
  world.camera.lookAt(world.controls.target);
  chase.stiff = Math.min(3.2, chase.stiff + dt * 1.2); // ease into the chase
  // a hatchling flying home with you keeps close, just behind and to the side
  if (chase.baby) {
    const b = chase.baby.d.root;
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const spot = d.position.clone().addScaledVector(fwd, -1.6).addScaledVector(side, 1.3).add(new THREE.Vector3(0, 0.5 + Math.sin(t * 3) * 0.15, 0));
    b.position.lerp(spot, 1 - Math.exp(-dt * 4));
    b.rotation.y = d.rotation.y;
  }
});
async function flyAlong(trip, lightFocus, bounds, radius) {
  chase = { stiff: 0.4 };
  world.holdCamera(true); // the orbit controls mustn't tug the camera back mid-flight
  updateNews();
  sfx.whoosh();
  // halfway there, the light moves to where you're going
  setTimeout(() => { haven.setLightFocus(lightFocus); world.setBounds(bounds, radius); }, 3500);
  try {
    await trip;
  } finally {
    chase = null;
    world.holdCamera(false);
  }
}

async function travelToVale() {
  if (busy || where === 'vale' || !companion) return;
  if (!valeUnlocked()) return;
  busy = true;
  collection.hideDiscovery();
  questUI?.setSheet('peek');
  setScreen('travel');
  world.controls.enabled = false;
  audio.setLocation('vale');
  const v = view('vale');
  world.controls.maxDistance = Math.max(40, v.dist * 1.3);
  await flyAlong(director.travel(companion, vale.arrive), VALE_CENTER, VALE_CENTER, 11);
  await world.flyTo(v.pos, v.target, 2.4);
  where = 'vale';
  story.setLocation();
  setScreen('vale');
  world.controls.enabled = true;
  busy = false;
  const first = markVisited();
  const n = DRAGONS[state.dragon].name;
  if (first) tell('Welcome to Dragon Haven! The Ancient Door stands here, and Quill keeps the old stories in the ruins. Tap anything that looks interesting.');
  else say(`${n} is happy to be back in Dragon Haven.`);
  refreshDoor(true);
  story.check();
  updateNews();
}

// `baby`: a hatchling coming home with you for the first time.
async function returnToHaven({ baby = null } = {}) {
  if (busy || where !== 'vale') return;
  busy = true;
  setScreen('travel');
  world.controls.enabled = false;
  audio.setLocation('haven');
  const v = view('haven');
  const b = baby && hatchlings.get(baby);
  if (b) b.d.setPose({ fly: 1 });
  const trip = director.travel(companion, haven.anchors.home);
  const fly = flyAlong(trip, HAVEN_CENTER, HAVEN_CENTER, 8);
  if (chase && b) chase.baby = b;
  await fly;
  if (b) { b.d.setPose({}); hatchlings.setAway(baby, false); } // settles in by the cottage
  await world.flyTo(v.pos, v.target, 2.4);
  where = 'haven';
  story.setLocation();
  setScreen('haven');
  world.controls.enabled = true;
  busy = false;
  if (!b) say('Home again. Your Quests are right where you left them.', 3600);
  updateNews();
}
$('#vale-btn').addEventListener('click', travelToVale);
$('#return-btn').addEventListener('click', () => returnToHaven());

// ---- Exploring Dragon Haven ----
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
    say('The great falls of Dragon Haven. Crystals glow softly in the grotto behind the water.');
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
// ---- Story Moments and Quill ----
const story = createStory({
  world,
  haven,
  director,
  getCompanion: () => companion,
  getWhere: () => where,
  tell,
  whenCalm,
  onBegin(id) {
    id === 'new-realm' ? sfx.door() : sfx.moment();
    busy = true;
    collection.hideDiscovery();
    setScreen('story');
    world.controls.enabled = false;
  },
  onEnd() {
    setScreen(where);
    world.controls.enabled = true;
    goTo(where, 1.8);
    if (where === 'haven') director.goHome(companion);
    busy = false;
    refreshDoor(true);
    updateNews();
  },
});
subscribe(() => { story.check(); updateNews(); });

// A small glowing dot on the Dragon Haven button when something is waiting
// there: the egg is ready, Quill has news, the egg's moment, the Door or the chest.
function havenNews() {
  if (!state.realm.visited) return 'There’s an egg waiting in Dragon Haven. Shall we fly over and see?';
  if (eggReady()) return 'The star egg is ready to hatch! Let’s fly to Dragon Haven.';
  if (story.pending('egg-and-door')) return 'Let’s go and look at the egg in Dragon Haven.';
  if (starReady() && !state.realm.doorOpened) return 'The Star on the Door is glowing! Let’s fly to Dragon Haven.';
  if (state.found['mossy-key'] && !state.chestOpened) return 'We have the Mossy Key! Let’s go and open the chest in Dragon Haven.';
  if (story.quillHasStory()) return 'I think Quill has something new to tell us. Shall we fly to Dragon Haven?';
  return null;
}
function updateNews() {
  $('#vale-btn').classList.toggle('has-news', where === 'haven' && !!havenNews());
}

async function hatchSequence() {
  if (hatching || !eggReady() || !companion) return;
  if (where !== 'vale') return tell('The star egg is ready to hatch! Fly to Dragon Haven to be there when it does.');
  hatching = true;
  busy = true;
  collection.hideDiscovery();
  setScreen('hatch');
  world.controls.enabled = false;
  director.stop();
  const e = haven.egg.worldPosition();
  companion.faceTowards(e.x, e.z);
  // Unhurried, and each bit of text waits for a tap, so nothing is missed.
  await world.flyTo([e.x - 2.2, e.y + 1.6, e.z + 3.0], [e.x, e.y + 0.15, e.z], 2.4);
  haven.egg.wobble();
  await ask('The star egg is wiggling… it’s about to hatch!', 'Watch');
  await haven.egg.shake(4.2);
  const c = hatchEgg();
  startRaising(c);
  haven.egg.burst();
  haven.egg.setLook(eggPalette().egg, 0); // the nest's warm glow settles
  sfx.hatch();
  garden.sparkle(e, 60);
  hatchlings.spawn(c, { pop: true, at: new THREE.Vector3(e.x, VALE_CENTER.y + 0.2, e.z) });
  companion.react('celebrate');
  await wait(3200);
  await ask('A tiny dragon tumbles out of the shell, blinking at the world for the first time.');
  const name = await collection.showHatchling(c);
  hatchlings.rename(c.id, name);
  await wait(600);
  // What they remember from inside the shell: the first clue to where they came from.
  await ask(`${name} looks up at you. “${STAR_MEMORIES[0]}”`);
  await ask(`“${STAR_MEMORIES[1]}”`);
  await ask(`${name} wants to see your home.`, 'Fly home together');
  refreshDoor(true);
  hatching = false;
  busy = false;
  await returnToHaven({ baby: c.id });
  nextWishNote();
  flushCalm(); // news that arrived during the hatching comes after it
  setTimeout(placeNext, 3000); // and anything waiting to be placed
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
      // focus time counts toward your dragon's wish even if the Quest isn't finished yet
      setTimeout(() => queueWish(wishProgress({ focus: minutes })), 1200);
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

// ---- How your dragon is feeling (just for fun) ----
const care = createCare({
  world, director, abilities,
  getCompanion: () => companion,
  getWhere: () => where,
  isBusy: () => busy || touring || hatching,
  think: (text, opts) => moments.think(text, opts),
  walkable: (x, z) => (where === 'vale' ? valeWalkable(x, z) : havenWalkable(x, z)),
  pond: { x: 5.2, z: 1.4, r: 2.3 },
  splash: (pos) => garden.sparkle(pos, 16, '#9fd3ff'),
  canTravel: () => where === 'haven' && valeUnlocked(),
  travelToVale,
});

// ---- Welcome tour ----
let touring = false;
async function startTour() {
  if (touring || document.body.dataset.screen !== 'haven') return;
  touring = true;
  const name = DRAGONS[state.dragon].name;
  questUI?.setSheet('half');
  await runTour([
    { title: 'Welcome home', text: `This is where ${name} lives. It grows and changes as you get things done in your real life.` },
    { title: 'Quests', text: 'Anything you need to do, big or small, is a Quest. Templates save time for things you do again and again.', target: () => rectOf($('#new-quest')) },
    { title: 'Stuck?', text: 'Choose My Next Quest picks one thing for you, based on how much time you have.', target: () => rectOf($('.choose-next')) || rectOf($('#quest-list')) },
    { title: 'Dragon Haven', text: 'Across the sky is Dragon Haven, where a mysterious egg waits beside the Ancient Door. Fly there any time. A little dot appears here when something new is waiting.', target: () => rectOf($('#vale-btn')) },
    { title: `How ${name} feels`, text: `See how ${name} is feeling today, and feed, play or nap together. Just for fun.`, target: () => rectOf($('#feel-btn')) },
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
updateNews();

if (location.hostname === 'localhost') window.quest = { story, world, director, moments, bubbles, focus, hatchlings, onComplete, care, startPlacing, updateNews, garden, haven, vale, state, reveal, hatchSequence, refreshDoor, travelToVale, returnToHaven, openDoorSequence, get companion() { return companion; } };
