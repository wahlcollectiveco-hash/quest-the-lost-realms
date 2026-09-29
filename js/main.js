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
import { $, $$, esc, say, celebrate } from './ui/common.js';

const world = createWorld($('#world'));
const haven = buildHaven(world, { say });
const vale = buildVale(world);
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
  select: { dir: [0, 0.3, 1], dist: 11.5, target: [0, 0.35, 5.0], fit: 1.25 },
  haven: { dir: [0.08, 0.5, 0.88], dist: 25, target: [-0.3, 0.9, -1.6], fit: 0.85 },
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
  if (window.innerWidth >= 820) world.setOffset((panel.offsetWidth + 24) / 2, 0);
  else world.setOffset(0, Math.min(panel.offsetHeight, window.innerHeight * 0.6) / 2.2);
}
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

// ---- 2. Choose your companion ----
let chosen = null;
function startSelection() {
  director.stop();
  if (companion) { despawn(companion); companion = null; }
  setScreen('select');
  world.controls.enabled = false;
  world.controls.autoRotate = false;
  const spots = haven.anchors.select;
  lineup = DRAGON_ORDER.map((id, i) => {
    const d = spawn(id, spots[i]);
    d.root.lookAt(spots[i].x * 0.3, 0, 14);
    world.onTap(d.root, () => choose(id));
    return d;
  });
  chosen = null;
  renderCards();
  goTo('select', 2.2);
}

function renderCards() {
  $('#dragon-cards').innerHTML = DRAGON_ORDER.map((id) => {
    const d = DRAGONS[id];
    return `<button class="dragon-card ${chosen === id ? 'on' : ''}" role="radio" aria-checked="${chosen === id}" data-id="${id}">
      <span class="swatch">${d.swatch.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
      <span class="name">${esc(d.name)}</span>
      <span class="trait">${esc(d.trait)}</span>
      <span class="blurb">${esc(d.blurb)}</span>
    </button>`;
  }).join('');
  const btn = $('#confirm-dragon');
  btn.disabled = !chosen;
  btn.textContent = chosen ? `Choose ${DRAGONS[chosen].name}` : 'Choose a dragon';
}
$('#dragon-cards').addEventListener('click', (e) => {
  const card = e.target.closest('.dragon-card');
  if (card) choose(card.dataset.id);
});
function choose(id) {
  if (document.body.dataset.screen !== 'select') return;
  chosen = id;
  renderCards();
  lineup.find((d) => d.def.id === id)?.react('hop');
  say(DRAGONS[id].lines.select, 3000);
}

$('#confirm-dragon').addEventListener('click', async () => {
  if (!chosen) return;
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
    companion.react(Math.random() < 0.5 ? 'hop' : 'tilt');
    say(pickLine(def.lines.tap), 3200);
  });
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
          good: `${n} stretches its wings, ready when you are.`,
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

// Completing a Quest: celebrate, warm the egg, and sometimes discover something.
function onComplete(q, { focusMinutes = 0, prefix = '' } = {}) {
  companion?.react('celebrate');
  sfx.complete();
  if (companion) garden.sparkle(companion.root.position, 20);
  const r = rewardQuest(q, { focusMinutes });
  let eggLine = '';
  if (r) {
    haven.egg.setLook(eggPalette().egg, eggFraction());
    haven.egg.pulse();
    eggLine = r.nowReady ? ' The egg is wiggling. It’s ready to hatch!' : ' The egg glows a little warmer.';
  }
  celebrate(q.title, prefix + completionLine() + eggLine, r?.item ? 3000 : 4200);
  if (r?.item) setTimeout(() => { reveal([r.item]); refreshDoor(true); }, 3200);
  else refreshDoor(true);
}

function reveal(items) {
  for (const it of items) if (inHaven(it)) garden.place(it.id, true);
  garden.setTreasures(foundOf('treasure').length);
  companion?.react('hop');
  sfx.discovery();
  collection.showDiscovery(items, { onSee: (it) => showItem(it.id) });
}

function showItem(id) {
  const pos = garden.positionOf(id);
  if (!pos) return;
  world.flyTo([pos.x + 1.6, pos.y + 2.6, pos.z + 4.6], [pos.x, pos.y + 0.5, pos.z], 1.6);
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
    ? 'All eight symbols on the Ancient Door are glowing. The Door is awake… go and see.'
    : `A symbol on the Ancient Door lights up: “${RUNES[fresh[0]].name}.”`;
  setTimeout(() => say(msg, 5200), 4600);
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
  say(first
    ? `Welcome to Verdant Vale. ${n} sniffs the air. There may be things hidden here… tap around.`
    : `${n} is happy to be back in Verdant Vale.`, 5200);
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
      return say(`The ${name} is cold. Its symbol flickers faintly. It will wake after ${k} more finished ${k === 1 ? 'Quest' : 'Quests'}.`, 5200);
    }
    wakeStone(i);
    say(`The ${name} awakens!`, 2600);
    companion?.react('celebrate');
    await vale.awakenStone(i);
    refreshDoor(false);
    haven.door.pulse();
    say(allLit()
      ? 'Far away, the last symbol on the Ancient Door lights up. The Door is awake… go and see.'
      : 'Far away, a symbol on the Ancient Door begins to glow.', 5200);
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
  say('Another egg has appeared in the nest. This one hums a different tune.', 4500);
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

// ---- Welcome tour ----
let touring = false;
async function startTour() {
  if (touring || document.body.dataset.screen !== 'haven') return;
  touring = true;
  const name = DRAGONS[state.dragon].name;
  $('#quest-panel').dataset.open = 'true';
  const eggRect = () => {
    const p = world.toScreen(haven.egg.worldPosition());
    return p.visible ? { x: p.x - 44, y: p.y - 50, w: 88, h: 88 } : null;
  };
  await runTour([
    { title: `Welcome to Dragon Haven`, text: `This is ${name}’s home. It grows and changes as you get things done in your real life.` },
    { title: 'Quests', text: 'Anything you need to do, big or small, is a Quest. Templates save time for things you do again and again.', target: () => rectOf($('#new-quest')) },
    { title: 'Stuck?', text: 'Choose My Next Quest picks one thing for you, based on how much time and energy you have.', target: () => rectOf($('.choose-next')) || rectOf($('#quest-list')) },
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
