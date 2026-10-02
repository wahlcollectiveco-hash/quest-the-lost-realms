// Story Moments and the three side characters.
// Moments are short and never interrupt: when one is ready, a soft light
// marks where to look, and it plays only when you tap. Characters speak in
// a few lines at a time and reveal the Lost Realms gradually.
import * as THREE from 'three';
import { state, save } from './state.js';
import { eggFraction, eggReady } from './rewards.js';
import { litRunes, stoneState, STONES, valeUnlocked, markDoorOpened } from './realm.js';
import { drawRune, VALE_CENTER } from './world/haven.js';
import { createHistorian, createFox, createMoth } from './world/npcs.js';
import { talk, letterbox } from './ui/dialogue.js';
import { DRAGONS } from './data/dragons.js';
import { HAZEL_BANTER, HAZEL_TRICK, QUILL_BANTER } from './data/moments.js';

const V = THREE.Vector3;
const MAPS = ['map-1', 'map-2', 'map-3', 'map-4'];
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const MOMENTS = {
  'strange-flower': {
    title: 'The Strange Flower',
    when: () => state.stats.completed >= 2,
    announce: 'A little flower on the path to the Door has started to glow…',
  },
  'mysterious-egg': {
    title: 'The Mysterious Egg',
    when: () => eggFraction() >= 0.6 || state.creatures.length > 0,
    announce: 'The symbols on the egg are glowing strangely. Take a closer look?',
  },
  'door-waking': {
    title: 'The Door Stirs',
    when: () => litRunes().filter(Boolean).length >= 4,
    announce: 'The Ancient Door is trembling. Something inside it is stirring.',
  },
  'new-realm': { title: 'A Glimpse Beyond' },
};
export const momentSeen = (id) => !!state.story.seen[id] || (id === 'new-realm' && state.realm.doorOpened);

// ---- What the characters say ----
const QUILL_INTRO = [
  'Ah. A visitor, and with a young dragon, no less. I am Quill. I keep the old stories. What’s left of them.',
  'You came from the Haven, didn’t you? From the Door. Come and talk to me whenever you like.',
];
const QUILL_LORE = [
  { id: 'q1', when: () => true, lines: ['Long ago, the doors stood open. Dragons flew between the realms like birds between trees.', 'Then the Keepers closed them. I have spent a very long time wondering why.'] },
  { id: 'q2', when: () => state.realm.stones.some(Boolean) || state.stats.completed >= 3, lines: ['The rune stones here remember the Door’s song. Wake one, and the Door hears it, all the way across the sky.'] },
  { id: 'q3', when: () => state.creatures.length > 0, lines: ['You have a hatchling now! Eggs from before the closing carry the Door’s symbols.', 'They remember where they came from, even when the rest of us forgot.'] },
  { id: 'q4', when: () => !!state.found['story-mural'], lines: ['The carvings behind me? Dragons flying through a ring of light. Eight symbols. Just like your Door.'] },
  { id: 'q5', when: () => MAPS.every((id) => state.found[id]), lines: ['The old map, whole again! See the dotted path? It leads beyond your Door.', 'To a realm of twilight, if my scrolls are right. And they usually are.'] },
  { id: 'q6', when: () => state.realm.doorOpened, lines: ['You saw it, didn’t you? The twilight realm.', 'Then the Door has chosen you. I have waited a very long time to say that to someone.'] },
];
const QUILL_AMBIENT = [
  'Every great story starts small. Usually with someone doing one small thing.',
  'Mind the leaning column. It’s been leaning since before I hatched.',
  'Rest is part of the journey, young one. Even for dragons.',
  'My eyes are old, but I can still read the stones. They’re in a good mood today.',
  'Go on, then. The world outside is waiting for you. I’ll be here.',
];

const HAZEL_INTRO = [
  'Hi! I’m Hazel. I live nearby, and I visit Verdant Vale almost every day.',
  'Tap me any time and I’ll tell you what’s worth checking out.',
];
const HAZEL_AMBIENT = [
  'Nothing new to report right now. Finish a Quest and I bet something will change!',
  'Your dragon has been napping in the sun today. Looks cozy.',
  'It’s a quiet day in the Vale. The butterflies say hello.',
  'Have you had some water today? I always forget too.',
  'Tip: double-tap the ground and your dragon will walk there.',
];

const LUNE_LORE = [
  { id: 'l1', when: () => true, lines: ['You can see me? How unusual.', 'No matter. I only came to look at the Door.'] },
  { id: 'l2', when: () => true, lines: ['Seven doors. Your dragon is standing near the first.'] },
  { id: 'l3', when: () => true, lines: ['Names are doors too. You may call me Lune.'] },
  { id: 'l4', when: () => state.creatures.length > 0 || eggFraction() > 0.5, lines: ['The egg is listening. So is the Door. So am I.'] },
  { id: 'l5', when: () => state.realm.doorOpened, lines: ['You’ve seen the twilight. I was born there, I think. Or I will be.'] },
  { id: 'l6', when: () => true, lines: ['Finish what’s in front of you. Doors open in the strangest order.'] },
];
const LUNE_AMBIENT = [
  'Shh. The stones are dreaming.',
  'I’ve been here before. Or after. It’s hard to say.',
  'Your list is shorter than you think.',
  'Don’t stay too long. The world out there needs you too.',
  'Look closer at the things you walk past every day.',
];

function glowSprite(color = 'rgba(255,230,160,1)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.3, 'rgba(255,230,160,0.55)');
  grad.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
}

export function createStory({ world, haven, vale, director, getCompanion, getWhere, say, tell, whenCalm, bubbles, overHead, sparkle, onBegin, onEnd }) {
  const { scene } = world;
  const S = state.story;
  const comp = () => getCompanion();

  // ---- The flower on the path to the Door ----
  const flower = new THREE.Group();
  flower.position.set(1.6, 0, -6.5);
  const petalMat = new THREE.MeshStandardMaterial({ color: '#fbf6ea', emissive: '#ffd98a', emissiveIntensity: 0, roughness: 0.6 });
  {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 5), new THREE.MeshStandardMaterial({ color: '#5e8c3c' }));
    stem.position.y = 0.27;
    flower.add(stem);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), petalMat);
      p.scale.set(1, 0.4, 0.6);
      p.position.set(Math.cos(a) * 0.09, 0.56, Math.sin(a) * 0.09);
      p.rotation.y = -a;
      flower.add(p);
    }
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: '#f6d15c', emissive: '#ffcf6a', emissiveIntensity: 0.4 }));
    c.position.y = 0.58;
    flower.add(c);
    flower.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  flower.scale.setScalar(1.4);
  scene.add(flower);
  let flowerGlow = 0;
  let flowerTarget = 0;

  // A drifting Door symbol for the flower moment
  const [runeC, runeG] = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; return [c, c.getContext('2d')]; })();
  runeG.strokeStyle = runeG.fillStyle = '#fff0c4';
  runeG.shadowColor = '#ffd98a';
  runeG.shadowBlur = 14;
  drawRune(runeG, 64, 64, 80, 5);
  const runeTex = new THREE.CanvasTexture(runeC);
  runeTex.colorSpace = THREE.SRGBColorSpace;
  const runeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: runeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  runeSprite.scale.setScalar(0.7);
  runeSprite.visible = false;
  scene.add(runeSprite);

  // Soft markers that show where a moment is waiting
  const markerPos = {
    'strange-flower': () => flower.position.clone().add(new V(0, 1.1, 0)),
    'mysterious-egg': () => haven.egg.worldPosition().add(new V(0, 1.0, 0)),
    'door-waking': () => haven.door.object.position.clone().add(new V(0, 8.0, 0.4)),
  };
  const markers = {};
  for (const id of Object.keys(markerPos)) {
    const m = glowSprite();
    m.scale.setScalar(0.9);
    m.visible = false;
    scene.add(m);
    markers[id] = m;
  }

  // ---- Characters ----
  const hazel = createFox();
  hazel.root.position.set(4.4, 0, -3.0);
  hazel.root.rotation.y = Math.atan2(2 - 4.4, 16 + 3.0);
  hazel.root.visible = false;
  scene.add(hazel.root);
  world.addUpdater(hazel.update);

  const quill = createHistorian();
  quill.root.position.copy(VALE_CENTER).add(new V(2.2, 0.08, -6.4));
  quill.faceTowards(VALE_CENTER.x, VALE_CENTER.z + 12);
  scene.add(quill.root);
  world.addUpdater(quill.update);

  const lune = createMoth();
  lune.setFade(0);
  scene.add(lune.root);
  world.addUpdater(lune.update);
  const LUNE_SPOTS = {
    haven: [[0, 7.3, -9.2], [-5.6, 4.5, -2.8], [-2.2, 0.8, -0.3], [-3.3, 1.0, -7.0], [5.2, 0.7, 1.4], [-8.1, 2.0, 0.3]].map((p) => new V(...p)),
    vale: [[0, 1.3, 12.4], [-5.6, 3.0, 5.4], [9.4, 3.6, -6.4], [-6.8, 0.8, -6.4], [4, 4.0, -11.4], [-5.2, 3.0, -10.8]].map((p) => new V(...p).add(VALE_CENTER)),
  };
  const luneState = { visible: false, where: null, since: 0, gone: 0, base: new V() };

  world.addUpdater((t, dt) => {
    flowerGlow += (flowerTarget - flowerGlow) * (1 - Math.exp(-dt * 2));
    petalMat.emissiveIntensity = flowerGlow * (0.8 + 0.3 * Math.sin(t * 2.2));
    for (const [id, m] of Object.entries(markers)) {
      if (!m.visible) continue;
      m.position.copy(markerPos[id]());
      m.position.y += 0.12 * Math.sin(t * 2);
      m.material.opacity = 0.65 + 0.35 * Math.sin(t * 2.6);
    }
    if (luneState.visible) {
      lune.root.position.copy(luneState.base).add(new V(Math.sin(t * 0.7) * 0.25, 0, Math.cos(t * 0.5) * 0.2));
    }
  });

  // ---- Moment state ----
  const pending = (id) => !momentSeen(id) && !!MOMENTS[id].when?.();

  // News worth reading waits its turn (after any celebration) and stays until tapped.
  const announce = (msg) => whenCalm(() => { if (getWhere() === 'haven') tell(msg); });

  function check() {
    for (const id of Object.keys(markers)) {
      const p = pending(id);
      markers[id].visible = p && getWhere() === 'haven' && !playing;
      if (p && !S.announced[id]) {
        S.announced[id] = true;
        save();
        announce(MOMENTS[id].announce);
      }
    }
    flowerTarget = momentSeen('strange-flower') ? 0.35 : pending('strange-flower') ? 1 : 0;
    // Hazel shows up after your first finished Quest.
    const hazelHere = state.stats.completed >= 1;
    if (hazelHere && !hazel.root.visible) {
      hazel.root.visible = true;
      if (!S.announced.hazel) {
        S.announced.hazel = true;
        save();
        sparkle(hazel.root.position, 24);
        announce('A fox is peeking out from the bushes by the stream. Tap her to say hello!');
      }
    }
  }

  // ---- Running a moment ----
  let playing = false;
  let skipping = false;
  const wait = (ms) => (skipping ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));
  const d = (sec) => (skipping ? 0.05 : sec);
  const cam = (pos, target, sec) => world.flyTo(pos, target, d(sec));
  // Story text waits for the reader to tap Next (the old timings are ignored).
  const text = async (t) => { letterbox.text(t); if (!skipping) await letterbox.next(); };
  const doorPos = () => haven.door.object.position;

  const SCRIPTS = {
    async 'strange-flower'() {
      const f = flower.position;
      director.visit(comp(), new V(f.x - 1.9, 0, f.z + 1.2), f);
      await cam([f.x - 0.5, 1.0, f.z + 1.9], [f.x - 0.1, 0.75, f.z - 0.6], 2);
      flowerTarget = 1.6;
      await text('A small white flower on the path has begun to glow…', 3400);
      await text('…with the very same light as the Ancient Door.', 3400);
      const start = f.clone().add(new V(0, 1.0, 0));
      const end = new V(0, 3.4, -9.1);
      runeSprite.visible = true;
      const drift = world.tween(d(2.8), (p) => {
        runeSprite.position.lerpVectors(start, end, p);
        runeSprite.position.y += Math.sin(p * Math.PI) * 1.2;
        runeSprite.scale.setScalar(0.5 + p * 0.8);
        runeSprite.material.opacity = 1 - Math.max(0, (p - 0.85) / 0.15);
      });
      cam([2.6, 3.6, -1.4], [0.4, 2.6, -8], 2.8);
      letterbox.text('A symbol rises from its petals and drifts toward the Door…');
      await drift;
      runeSprite.visible = false;
      haven.door.pulse();
      if (!skipping) await letterbox.next();
      await text('…and settles into the stone, as if it had always belonged there.', 3400);
    },

    async 'mysterious-egg'() {
      const e = haven.egg.worldPosition();
      director.visit(comp(), new V(e.x + 1.3, 0, e.z + 1.2), e);
      await cam([e.x - 1.8, 1.5, e.z + 2.6], [e.x, 0.5, e.z], 2);
      haven.egg.pulse();
      haven.egg.wobble();
      await text('The symbols on the egg shimmer, one after another…', 3400);
      await cam([2.4, 3.6, -0.6], [0, 3.2, -9.4], 2.2);
      haven.door.pulse();
      await text('They match the symbols around the Ancient Door. Exactly.', 3600);
      await cam([e.x - 1.8, 1.5, e.z + 2.6], [e.x, 0.5, e.z], 2);
      haven.egg.pulse();
      await text('Whoever is inside has been here before. Long, long ago.', 3600);
    },

    async 'door-waking'() {
      director.visit(comp(), haven.door.front, doorPos());
      await cam([1.8, 3.4, 0.4], [0, 3.3, -9.4], 2.2);
      const r = haven.door.rumble(d(2.4));
      await text('The Door trembles. Deep in the stone, something stirs…', 3400);
      await r;
      await haven.door.setEyes(true, d(1.4));
      await text('…and for a heartbeat, it seems to open its eyes.', 3600);
      await haven.door.setEyes(false, d(1.2));
      await text('Then it is quiet again. Waking, but not awake. Not yet.', 3600);
    },

    async 'new-realm'() {
      director.visit(comp(), haven.door.front, doorPos());
      await cam([2.4, 3.4, 0.8], [0, 3.1, -9.4], 2.2);
      const a = haven.door.awaken(d(2.4));
      await text('All eight symbols blaze with light…', 2600);
      await a;
      await haven.door.showGlimpse(d(1.8));
      await text('Beyond the Door: a twilight realm of silver light and sleeping crystals.', 5200);
      await text('Somewhere far off, something small and bright is waiting.', 3600);
      await text('Then, softly, the Door closes. Not yet… but soon.', 3600);
      await haven.door.hideGlimpse(d(1.8));
      markDoorOpened();
    },
  };

  async function play(id) {
    if (playing || !SCRIPTS[id]) return;
    playing = true;
    skipping = false;
    Object.values(markers).forEach((m) => (m.visible = false));
    onBegin(id);
    letterbox.on(() => { skipping = true; });
    try {
      await SCRIPTS[id]();
    } catch (e) {
      console.error(e);
    }
    // Leave things tidy if the moment was skipped partway.
    runeSprite.visible = false;
    if (id === 'door-waking') haven.door.setEyes(false, 0.05);
    if (id === 'new-realm') { haven.door.hideGlimpse(0.05); markDoorOpened(); }
    S.seen[id] = Date.now();
    save();
    letterbox.off();
    playing = false;
    onEnd();
    check();
  }

  // ---- Characters talking ----
  function nextLore(key, lore) {
    S.heard[key] ||= {};
    const l = lore.find((x) => !S.heard[key][x.id] && x.when());
    if (!l) return null;
    S.heard[key][l.id] = true;
    save();
    return l.lines;
  }

  // What Hazel does when tapped: the first time she introduces herself;
  // after that it's a useful hint, or a little scene with your dragon.
  function hazelLines() {
    if (!S.met.hazel) { S.met.hazel = true; save(); return HAZEL_INTRO; }
    const hint = hazelHint();
    return hint && Math.random() < 0.6 ? [hint] : null;
  }
  function hazelHint() {
    const hints = [
      [pending('strange-flower'), 'The little white flower on the path to the Door has started glowing. Tap the flower to take a closer look!'],
      [pending('mysterious-egg'), 'The symbols on your egg are glowing. Tap the egg to see what’s happening.'],
      [pending('door-waking'), 'The Ancient Door is shaking! Tap the Door to see why.'],
      [eggReady(), 'Your egg is ready to hatch! Tap the egg in the nest.'],
      [state.found['mossy-key'] && !state.chestOpened, 'You found the Mossy Key! Tap the old chest next to the Door to open it.'],
      [!valeUnlocked(), 'Verdant Vale is covered in mist right now. Finish one Quest and the way will open.'],
      [!state.realm.visited, 'You can visit Verdant Vale now. Tap the mountain button at the top of the screen and your dragon will fly you there.'],
      [!S.met.quill, 'An old dragon named Quill lives in the ruins in Verdant Vale. Tap Quill to hear stories about the Door.'],
      [STONES.some((_, i) => stoneState(i) === 'ready'), 'One of the rune stones in Verdant Vale is ready to wake up. Fly there and tap the glowing stone.'],
      [!state.realm.hidden.grotto, 'Something is hidden behind the big waterfall in Verdant Vale. Try tapping the waterfall.'],
      [!state.realm.hidden.hollow, 'There’s something shiny inside the big hollow tree in Verdant Vale. Tap the tree to look inside.'],
      [!state.realm.hidden.glade, 'A thick wall of bushes on the left side of Verdant Vale is hiding something. Tap the bushes.'],
      [!state.found['story-mural'], 'The carvings in the Vale ruins tell an old story. Tap them to read it.'],
    ];
    return hints.find(([ok]) => ok)?.[1] || null;
  }

  function quillLines() {
    if (!S.met.quill) { S.met.quill = true; save(); return QUILL_INTRO; }
    return nextLore('quill', QUILL_LORE);
  }

  function luneLines() {
    return nextLore('lune', LUNE_LORE) || [pickOne(LUNE_AMBIENT)];
  }
  const luneName = () => (S.heard.lune?.l3 ? 'Lune' : '???');

  let talking = false;
  async function converse(who, name, lines) {
    if (talking || playing) return;
    talking = true;
    await talk({ who, name, lines });
    talking = false;
  }

  // ---- Little scenes: bubbles over the characters' heads ----
  const dragonId = () => DRAGONS[state.dragon]?.id || 'pebble';
  const dragonName = () => DRAGONS[state.dragon]?.name || 'Your dragon';
  const hazelHead = () => hazel.root.position.clone().add(new V(0, 1.75, 0));
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  // Give the dragon a moment to walk over, but never wait long.
  const arrive = (walk) => Promise.race([walk, pause(5000)]);

  // A short back-and-forth between a character and your dragon.
  // Returns false if it was cut short (something else took the bubble).
  async function banter(name, anchor, react, lines) {
    for (const [who, text] of lines) {
      const d = comp();
      if (!d) return false;
      let r;
      if (who === 'you') {
        d.react(Math.random() < 0.5 ? 'hop' : 'tilt');
        r = await bubbles.show(overHead(d), { name: dragonName(), text });
      } else {
        react();
        r = await bubbles.show(anchor, { name, text });
      }
      if (r === 'replaced') return false;
      await pause(250);
    }
    return true;
  }

  async function act(fn) {
    if (talking || playing) return;
    talking = true;
    try { await fn(); } catch (e) { console.error(e); }
    talking = false;
  }

  world.onTap(hazel.root, () => {
    if (getWhere() !== 'haven' || !hazel.root.visible || talking || playing) return;
    hazel.react();
    const p = hazel.root.position;
    const walk = director.visit(comp(), new V(p.x - 1.3, 0, p.z + 1.2), p);
    const lines = hazelLines();
    if (lines) return converse('hazel', 'Hazel', lines);
    const id = dragonId();
    const kind = pickOne(['banter', 'banter', 'trick', 'toYou']);
    act(async () => {
      if (kind === 'toYou') {
        await bubbles.show(hazelHead, { name: 'Hazel', text: pickOne(HAZEL_AMBIENT) });
        return;
      }
      await arrive(walk);
      if (kind === 'banter') {
        await banter('Hazel', hazelHead, () => hazel.react(), pickOne(HAZEL_BANTER[id]));
        return;
      }
      // Hazel shows off: a quick spin chasing her own tail.
      const r = await bubbles.show(hazelHead, { name: 'Hazel', text: 'Watch this!', ms: 1600 });
      if (r === 'replaced') return;
      hazel.react('spin');
      await pause(1700);
      sparkle(p, 14);
      const d = comp();
      if (!d) return;
      d.react('celebrate');
      await bubbles.show(overHead(d), { name: dragonName(), text: HAZEL_TRICK[id] });
    });
  });
  world.onTap(quill.root, () => {
    if (getWhere() !== 'vale' || talking || playing) return;
    quill.react('tilt');
    const p = quill.root.position;
    const walk = director.visit(comp(), new V(p.x + 1.4, p.y - 0.14, p.z + 1.6), p);
    const lines = quillLines();
    if (lines) return converse('quill', 'Quill, the Dragon Historian', lines);
    // Nothing new to tell: a quiet word for you, or a chat with your dragon.
    act(async () => {
      if (Math.random() < 0.5) {
        await bubbles.show(overHead(quill), { name: 'Quill', text: pickOne(QUILL_AMBIENT) });
        return;
      }
      await arrive(walk);
      await banter('Quill', overHead(quill), () => quill.react('tilt'), pickOne(QUILL_BANTER[dragonId()]));
    });
  });
  world.onTap(flower, () => {
    if (getWhere() !== 'haven') return;
    if (pending('strange-flower')) return play('strange-flower');
    say(momentSeen('strange-flower') ? 'The little flower still glows faintly, as if it remembers.' : 'A small white flower. It seems to be listening.');
  });

  // ---- Lune comes and goes ----
  function showLune() {
    const spots = LUNE_SPOTS[getWhere()];
    if (!spots) return;
    const spot = spots[Math.floor(Math.random() * spots.length)];
    luneState.base.copy(spot);
    luneState.where = getWhere();
    luneState.visible = true;
    luneState.since = Date.now();
    lune.root.position.copy(spot);
    sparkle(spot.clone().add(new V(0, -0.3, 0)), 14);
    world.tween(1.2, (p) => lune.setFade(p));
    if (!S.announced.lune) {
      S.announced.lune = true;
      save();
      announce('A small glowing moth has appeared somewhere nearby. See if you can spot it, then tap it!');
    }
  }
  function hideLune(flyAway = true) {
    if (!luneState.visible) return;
    luneState.visible = false;
    luneState.gone = Date.now();
    if (!flyAway) { lune.setFade(0); return; }
    const from = lune.root.position.clone();
    world.tween(1.6, (p) => {
      lune.root.position.copy(from).add(new V(p * 1.5, p * 2.5, -p));
      lune.setFade(1 - p);
    }, (p) => p);
  }
  world.onTap(lune.root, async () => {
    if (!luneState.visible || luneState.where !== getWhere()) return;
    await converse('lune', luneName(), luneLines());
    hideLune(true);
  });
  setInterval(() => {
    if (playing || talking || document.hidden) return;
    const where = getWhere();
    if (where !== 'haven' && where !== 'vale') return;
    if (luneState.visible) {
      if (luneState.where !== where || Date.now() - luneState.since > 4 * 60000) hideLune(luneState.where === where);
      return;
    }
    if (state.stats.completed < 2 || Date.now() - luneState.gone < 90000) return;
    const firstTime = !S.announced.lune;
    if (Math.random() < (firstTime ? 0.5 : 0.12)) showLune();
  }, 20000);

  return {
    check,
    play,
    pending,
    replay: (id) => play(id),
    isPlaying: () => playing,
    setLocation() { if (luneState.visible) hideLune(false); check(); },
    // for local testing
    _showLune: showLune,
  };
}
