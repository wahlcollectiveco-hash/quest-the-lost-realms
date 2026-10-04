// Story Moments and Quill.
//
// Realm 1 has two Story Moments, both in Dragon Haven:
//   The Egg and the Door — the star on the egg's shell matches the star on
//     the Ancient Door, so the egg must have come from behind it.
//   The Realm of Stars — once the Star on the Door wakes, it opens for a
//     glimpse of the realm the egg came from.
// Quill keeps the old stories: something new to tell when there is one, and
// otherwise a calm word (or the whole story so far, if you'd like it again).
import * as THREE from 'three';
import { state, save } from './state.js';
import { starReady, markDoorOpened } from './realm.js';
import { drawRealm, VALE_CENTER } from './world/haven.js';
import { createHistorian } from './world/npcs.js';
import { talk, letterbox } from './ui/dialogue.js';
import { TREASURE_STORIES } from './data/life.js';

const V = THREE.Vector3;

export const MOMENTS = {
  'egg-and-door': {
    title: 'The Egg and the Door',
    when: () => state.realm.visited && state.creatures.length === 0,
  },
  'new-realm': { title: 'The Realm of Stars' },
};
export const momentSeen = (id) => !!state.story.seen[id] || (id === 'new-realm' && state.realm.doorOpened);

// ---- Quill ----
const QUILL_INTRO = [
  'Ah. A visitor, and a young dragon, no less. I am Quill. I keep the old stories, and I keep an eye on that egg by the Door.',
  'Come and talk to me whenever you like. When something new turns up, I’ll know what it means. Or I’ll find out.',
];
const babyName = () => state.creatures[0]?.name || 'The little one';
const MAPS = ['map-1', 'map-2', 'map-3', 'map-4'];

// The stories Quill has to tell, in order, once each.
function storyList() {
  const maps = MAPS.every((id) => state.found[id]);
  return [
    { key: 'egg', when: momentSeen('egg-and-door') || state.creatures.length > 0, lines: [
      'So you’ve seen it. The star on the shell, and the very same star on the Door.',
      'Long ago, seven doors joined seven realms, and dragons flew between them like birds between trees. That star belongs to one of them: the Realm of Stars.',
      'How an egg from there came to be sitting in our nest, after all this time… I truly don’t know. But I mean to find out.',
    ] },
    { key: 'hatch', when: state.creatures.length > 0, lines: [
      `${babyName()} remembers darkness full of tiny lights, and someone humming?`,
      'Then there’s no doubt. The star-singers of that realm hum to their eggs, so the little ones are never afraid of the dark.',
      'Somewhere behind that Door, someone is still humming.',
    ] },
    { key: 'key', when: !!state.found['mossy-key'], lines: [
      'The Mossy Key! That’s Keeper’s work, I’d know it anywhere.',
      'It fits the old chest beside the Door. Go on, try it.',
    ] },
    { key: 'map', when: maps, lines: [
      'The old map is whole again. Look: a dotted path, from here, through the wood, to the Door.',
      'And beyond the Door, a single star. The map was pointing the way to where your little one came from.',
    ] },
    { key: 'chest', when: state.chestOpened, lines: [
      'You opened the Keeper’s chest. The note inside is a promise: whoever opens it is trusted with the Door.',
      'It seems the Door has chosen you.',
    ] },
    { key: 'ready', when: starReady() && !state.realm.doorOpened, lines: [
      'Do you see it? The Star on the Door is glowing. I think it’s ready to open.',
      'Go on. I’ll be right here.',
    ] },
    { key: 'opened', when: state.realm.doorOpened, lines: [
      'You saw it. The Realm of Stars.',
      'It isn’t time to go through. Not yet. But the Door knows you now, and so do the stars.',
    ] },
    ...Object.keys(TREASURE_STORIES).filter((id) => state.found[id]).map((id) => ({ key: `t-${id}`, when: true, lines: TREASURE_STORIES[id] })),
  ].filter((s) => s.when);
}

// The story so far, for when you'd like to hear it again.
function recap() {
  const lines = ['Long ago, seven doors joined seven realms, and dragons flew between them like birds between trees.'];
  if (state.found['story-2']) lines.push('Then the Keepers sealed the doors. Not to keep something out, but to keep something safe.');
  if (momentSeen('egg-and-door') || state.creatures.length) lines.push('One day an egg appeared in our nest, with a star on its shell. The same star as on the Door. It came from the Realm of Stars.');
  if (state.creatures.length) lines.push(`${babyName()} hatched, and remembers it: darkness full of tiny lights, and someone humming.`);
  const maps = MAPS.filter((id) => state.found[id]).length;
  if (maps) lines.push(maps === 4 ? 'The old map is whole, and it shows the way: through the Door, to the stars.' : `Pieces of an old map are turning up. You have ${maps} of 4.`);
  if (state.realm.doorOpened) lines.push('And the Door has opened, just for a moment, onto the Realm of Stars.');
  lines.push('And that is where our story is, for now.');
  return lines;
}

function glowSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,230,160,1)');
  grad.addColorStop(0.3, 'rgba(255,230,160,0.55)');
  grad.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
}

// ---- The symbol card: the egg's symbol and the Door's, side by side ----
function symbolFigure(kind) {
  const c = document.createElement('canvas');
  c.width = 220;
  c.height = 240;
  const g = c.getContext('2d');
  g.lineWidth = 4;
  if (kind === 'egg') {
    const grad = g.createRadialGradient(95, 90, 10, 110, 130, 120);
    grad.addColorStop(0, '#fffaf0');
    grad.addColorStop(1, '#e8dcc2');
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(110, 128, 74, 98, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(120,90,40,0.25)';
    g.stroke();
    g.strokeStyle = g.fillStyle = '#d9962a';
    g.shadowColor = '#ffd98a';
    g.shadowBlur = 14;
    drawRealm(g, 110, 128, 92, 0);
  } else {
    g.fillStyle = '#4a5a60';
    g.beginPath(); g.moveTo(20, 236); g.lineTo(20, 110); g.arc(110, 110, 90, Math.PI, 0); g.lineTo(200, 236); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,220,150,0.35)';
    g.beginPath(); g.arc(110, 140, 72, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const on = i === 0;
      g.strokeStyle = g.fillStyle = on ? '#ffe3a0' : 'rgba(200,180,140,0.45)';
      g.shadowColor = '#ffd98a';
      g.shadowBlur = on ? 16 : 0;
      drawRealm(g, 110 + Math.cos(a) * 72, 140 + Math.sin(a) * 72, on ? 40 : 26, i);
    }
    g.shadowBlur = 0;
  }
  return c;
}
function symbolCard() {
  const el = document.createElement('div');
  el.className = 'symbol-card';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return {
    show(parts) {
      el.innerHTML = '';
      const fig = (kind, label) => {
        const f = document.createElement('figure');
        f.appendChild(symbolFigure(kind));
        const cap = document.createElement('figcaption');
        cap.textContent = label;
        f.appendChild(cap);
        el.appendChild(f);
      };
      if (parts.includes('egg')) fig('egg', 'On the egg');
      if (parts.includes('match')) {
        const eq = document.createElement('span');
        eq.className = 'symbol-eq';
        eq.textContent = '=';
        el.appendChild(eq);
      }
      if (parts.includes('door')) fig('door', 'On the Door');
      el.classList.add('show');
    },
    hide() { el.classList.remove('show'); },
  };
}

export function createStory({ world, haven, director, getCompanion, getWhere, tell, whenCalm, onBegin, onEnd }) {
  const { scene } = world;
  const S = state.story;
  const comp = () => getCompanion();
  const card = symbolCard();

  // A soft light over the egg while its moment is waiting.
  const marker = glowSprite();
  marker.scale.setScalar(0.9);
  marker.visible = false;
  scene.add(marker);
  world.addUpdater((t) => {
    if (!marker.visible) return;
    marker.position.copy(haven.egg.worldPosition()).add(new V(0, 1.0 + 0.12 * Math.sin(t * 2), 0));
    marker.material.opacity = 0.65 + 0.35 * Math.sin(t * 2.6);
  });

  // ---- Quill, in the ruins beside the Door ----
  const quill = createHistorian();
  quill.root.position.copy(VALE_CENTER).add(new V(2.2, 0.08, -6.4));
  quill.faceTowards(VALE_CENTER.x, VALE_CENTER.z + 12);
  scene.add(quill.root);
  world.addUpdater(quill.update);

  // ---- Moment state ----
  const pending = (id) => !momentSeen(id) && !!MOMENTS[id].when?.();
  const quillHasStory = () => storyList().some((s) => !S.heard.quill?.[s.key]);

  let playing = false;
  function check() {
    marker.visible = pending('egg-and-door') && getWhere() === 'vale' && !playing && haven.egg.isVisible();
    if (pending('egg-and-door') && getWhere() === 'vale' && !S.announced['egg-and-door']) {
      S.announced['egg-and-door'] = true;
      save();
      whenCalm(() => tell('There’s an egg in the nest beside the Ancient Door. Tap it to take a closer look.'));
    }
  }

  // ---- Running a moment ----
  let skipping = false;
  const d = (sec) => (skipping ? 0.05 : sec);
  const cam = (pos, target, sec) => world.flyTo(pos, target, d(sec));
  // Story text waits for the reader to tap Next.
  const text = async (t) => { letterbox.text(t); if (!skipping) await letterbox.next(); };
  const doorPos = () => haven.door.object.position;
  // The middle of the symbol ring on the Door, and the direction it faces.
  const doorFacing = () => new V().subVectors(haven.door.front, doorPos()).setY(0).normalize();
  const ringCentre = () => doorPos().clone().add(new V(0, 3.45, 0)).addScaledVector(doorFacing(), 0.1);

  const SCRIPTS = {
    async 'egg-and-door'() {
      const e = haven.egg.worldPosition();
      const hidden = !haven.egg.isVisible();
      if (hidden) haven.egg.setVisible(true); // replaying after the hatch: a memory of the egg
      const f = doorFacing();
      director.visit(comp(), e.clone().addScaledVector(f, 1.6).add(new V(1.5, 0, 0)).setY(e.y - 0.45), e);
      // 1. the egg, close up, with its one symbol
      await cam([e.x - 1.2, e.y + 0.7, e.z + 1.7], [e.x, e.y + 0.05, e.z], 2.4);
      haven.egg.pulse();
      card.show(['egg']);
      await text('Look closely at the egg. A single symbol is carved into its shell: a star.');
      // 2. the Door, with the same star glowing
      const c = ringCentre();
      // framed so the ring sits low on screen, below the symbol card
      const camPos = c.clone().addScaledVector(f, 10.5).add(new V(0, 0.6, 0));
      await cam(camPos.toArray(), c.clone().add(new V(0, 1.7, 0)).toArray(), 2.8);
      haven.door.setFocus(0);
      haven.door.pulse();
      card.show(['egg', 'door']);
      await text('Now look at the Ancient Door. Seven symbols sit in a ring, one for each realm behind it. One of them is the very same star.');
      card.show(['egg', 'match', 'door']);
      await text('They match. This egg came from behind the Door, from the realm the star belongs to: the Realm of Stars.');
      // 3. both together
      card.hide();
      const mid = e.clone().lerp(doorPos(), 0.5);
      await cam([mid.x + 6.5, mid.y + 4.2, mid.z + 7.5], [mid.x, mid.y + 1.4, mid.z], 2.6);
      haven.egg.pulse();
      await text('But the doors have been sealed for a very long time. So how did the egg get all the way here?');
      await text('Nobody knows. Not yet. Quill might have some ideas.');
      haven.door.setFocus(-1);
      if (hidden) haven.egg.setVisible(false);
    },

    async 'new-realm'() {
      director.visit(comp(), haven.door.front, doorPos());
      const c = ringCentre();
      const f = doorFacing();
      await cam(c.clone().addScaledVector(f, 8).add(new V(1.2, -0.4, 0)).toArray(), c.toArray(), 2.4);
      const a = haven.door.awaken(d(2.4));
      await text('The Star on the Door blazes with light…');
      await a;
      await haven.door.showGlimpse(d(1.8));
      await text('Beyond the Door: the Realm of Stars. Tiny lights drift everywhere, like slow snow, and somewhere far off, someone is humming.');
      if (state.creatures.length) await text(`Back home, ${babyName()} looks up at the sky and chirps, as if they heard it too.`);
      await text('Then, softly, the Door closes. Not yet… but soon.');
      await haven.door.hideGlimpse(d(1.8));
      markDoorOpened();
    },
  };

  async function play(id) {
    if (playing || !SCRIPTS[id]) return;
    playing = true;
    skipping = false;
    marker.visible = false;
    onBegin(id);
    letterbox.on(() => { skipping = true; });
    try {
      await SCRIPTS[id]();
    } catch (e) {
      console.error(e);
    }
    // Leave things tidy if the moment was skipped partway.
    card.hide();
    haven.door.setFocus(-1);
    if (id === 'egg-and-door' && state.creatures.length) haven.egg.setVisible(false);
    if (id === 'new-realm') { haven.door.hideGlimpse(0.05); markDoorOpened(); }
    S.seen[id] = Date.now();
    save();
    letterbox.off();
    playing = false;
    onEnd();
    check();
  }

  // ---- Talking with Quill ----
  let talking = false;
  async function quillTalk() {
    if (talking || playing) return;
    talking = true;
    const name = 'Quill, the Dragon Historian';
    try {
      // The first time, Quill says hello (and goes straight on to any news).
      const hello = S.met.quill ? [] : QUILL_INTRO;
      S.met.quill = true;
      const next = storyList().find((s) => !S.heard.quill?.[s.key]);
      if (next || hello.length) {
        S.heard.quill ||= {};
        if (next) S.heard.quill[next.key] = true;
        save();
        const more = storyList().some((s) => !S.heard.quill[s.key]);
        const lines = [...hello, ...(next ? next.lines : [])];
        await talk({ who: 'quill', name, lines: more ? [...lines, 'There’s more I could tell you. Come back and ask me again.'] : lines });
        return;
      }
      // Nothing new: a calm word, or the whole story again if you'd like it.
      S.quillTurn = (S.quillTurn || 0) + 1;
      save();
      if (S.quillTurn % 2 === 1) {
        const choice = await talk({ who: 'quill', name, lines: ['Would you like to hear the story of the old world again?'], choices: [{ id: 'yes', label: 'Yes, please' }, { id: 'no', label: 'Not now' }] });
        if (choice === 'yes') await talk({ who: 'quill', name, lines: recap() });
      } else {
        await talk({ who: 'quill', name, lines: ['Nothing new to report today. I’m sure I’ll have something soon, though.'] });
      }
    } finally {
      talking = false;
    }
  }

  world.onTap(quill.root, () => {
    if (getWhere() !== 'vale') return;
    quill.react('tilt');
    const p = quill.root.position;
    director.visit(comp(), new V(p.x + 1.4, p.y - 0.14, p.z + 1.6), p);
    quillTalk();
  });

  return {
    check,
    play,
    pending,
    quillHasStory,
    replay: (id) => play(id),
    isPlaying: () => playing,
    setLocation() { check(); },
  };
}
