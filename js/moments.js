// Tap your dragon and something happens: they act out a little scene, share
// a thought, nudge you toward a Quest, ask you a question, or ask for a
// small favor. What they say appears in a thought bubble over their head.
import * as THREE from 'three';
import { state, save, todayISO } from './state.js';
import { rankQuests } from './next.js';
import { eggReady } from './rewards.js';
import { wishText, eggInsight } from './wishes.js';
import {
  SCENES, SHOWOFF, QUIPS, NUDGES, NUDGE_STEP, NO_QUESTS, GO_LINES, LATER_LINES, QUESTIONS, FAVORS, HINTS,
  FOCUS_LINES, BUSY_LINES,
} from './data/moments.js';

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weighted(list) {
  let r = Math.random() * list.reduce((s, x) => s + x.w, 0);
  for (const x of list) if ((r -= x.w) <= 0) return x;
  return list[0];
}

export function createMoments({
  world, director, abilities, bubbles, sparkle, haven,
  getCompanion, getWhere, isBusy, walkable,
  onStartFocus, onNewQuest, onFavor,
}) {
  const v = new THREE.Vector3();
  // Where the bubble floats: just above the dragon's head.
  const overHead = (d) => () => d.head.getWorldPosition(v).add(new THREE.Vector3(0, 0.62 * d.root.scale.x, 0));
  const think = (text, opts) => {
    const d = getCompanion();
    return d ? bubbles.show(overHead(d), { text, ...opts }) : Promise.resolve('replaced');
  };

  let acting = false;
  let last = { kind: null, scene: null, quip: null, question: null };
  let taps = 0;

  // ---- The different things a tap can lead to ----
  async function scene(d) {
    const here = getWhere();
    const options = SCENES[d.def.id].filter((s) => (!s.haven || here === 'haven') && s.id !== last.scene && director.hasScene(s.id));
    const pick = weighted(options);
    last.scene = pick.id;
    acting = true;
    await director.scene(pick.id, d, {
      think: (text, ms) => { think(text, { ms }); },
      sparkle,
      ability: () => abilities.perform(d),
      walkable: (x, z) => walkable(x, z),
      chest: haven.chest.object.position,
      chestOpen: state.chestOpened,
      door: haven.anchors.door,
      showoffLine: SHOWOFF[d.def.id],
    });
    acting = false;
  }

  function quip(d) {
    const options = QUIPS[d.def.id].filter((q) => q !== last.quip);
    last.quip = pickOne(options);
    d.react(Math.random() < 0.5 ? 'hop' : 'tilt');
    think(last.quip);
  }

  async function nudge(d) {
    const id = d.def.id;
    const top = rankQuests()[0];
    if (!top) {
      const r = await think(NO_QUESTS[id], { actions: [{ id: 'new', label: 'New Quest', primary: true }, { id: 'no', label: 'Not now' }] });
      if (r?.action === 'new') onNewQuest();
      else if (r?.action === 'no') think(LATER_LINES[id]);
      return;
    }
    d.react('hop');
    const step = top.step || (top.quest.steps.length ? top.quest.steps.find((s) => !s.done) : null);
    let text = pickOne(NUDGES[id]).replace('{q}', top.quest.title);
    if (step) text += ' ' + NUDGE_STEP.replace('{q}', step.text);
    const focusQuest = top.quest.type === 'focus';
    const r = await think(text, { actions: [{ id: 'go', label: focusQuest ? 'Start the timer' : 'Let’s go', primary: true }, { id: 'no', label: 'Not now' }] });
    if (r?.action === 'go') {
      d.react('celebrate');
      if (focusQuest) onStartFocus(top.quest.id);
      else think(GO_LINES[id], { ms: 5000 });
    } else if (r?.action === 'no') {
      d.react('tilt');
      think(LATER_LINES[id]);
    }
  }

  async function question(d) {
    const options = QUESTIONS[d.def.id].filter((q) => q.q !== last.question);
    const q = pickOne(options);
    last.question = q.q;
    d.react('tilt');
    const r = await think(q.q, { input: { placeholder: 'Type a reply…' }, actions: [{ id: 'skip', label: 'Skip' }] });
    if (r?.text) {
      const hasNumber = /\d/.test(r.text);
      const reply = ((hasNumber && q.num) || q.any).replace('{a}', r.text.replace(/[.!?]+$/, ''));
      d.react('hop');
      sparkle(d.root.position, 10);
      think(reply, { ms: 7000 });
    } else if (r?.action === 'skip') {
      think(LATER_LINES[d.def.id]);
    }
  }

  async function favor(d) {
    const f = pickOne(FAVORS[d.def.id]);
    d.setPose({ headDown: 0.4 });
    const r = await think(f.ask, { actions: [{ id: 'help', label: f.btn, primary: true }] });
    d.setPose({});
    if (r?.action !== 'help') return;
    acting = true;
    d.react('tilt');
    sparkle(d.root.position, 12);
    await new Promise((res) => setTimeout(res, 900));
    d.react('celebrate');
    sparkle(d.head.getWorldPosition(new THREE.Vector3()), 22);
    think(f.thanks, { ms: 4200 });
    acting = false;
    // A kindness warms the egg a little, once a day.
    if (state.favorDay !== todayISO()) {
      state.favorDay = todayISO();
      save();
      setTimeout(onFavor, 2600);
    }
  }

  function hint() {
    if (getWhere() !== 'haven') return null;
    if (eggReady()) return HINTS.eggReady;
    if (state.found['mossy-key'] && !state.chestOpened) return HINTS.chestKey;
    // what they're wishing for, or how close the egg is (now and then)
    if (wishText()) return wishText();
    if (eggInsight() && Math.random() < 0.4) return eggInsight();
    return null;
  }

  // ---- A tap ----
  function tap() {
    const d = getCompanion();
    if (!d || isBusy()) return;
    const id = d.def.id;
    const screen = document.body.dataset.screen;
    if (screen === 'focus') {
      // mid-Focus: a quick word, nothing that interrupts either of you
      d.react('hop');
      think(pickOne(FOCUS_LINES[id]), { ms: 3200 });
      return;
    }
    if (bubbles.isAsking()) return; // waiting on an answer; leave the bubble be
    if (acting) {
      d.react('hop');
      return;
    }
    taps++;
    const h = hint();
    if (h && Math.random() < 0.4) {
      d.react('hop');
      think(h, { ms: 8000 });
      return;
    }
    // The first tap is always a scene, so there's something to see straight away.
    const kinds = [
      { kind: 'scene', w: 46 },
      { kind: 'quip', w: 18 },
      { kind: 'nudge', w: 14 },
      { kind: 'question', w: 12 },
      { kind: 'favor', w: 10 },
    ].filter((k) => k.kind === 'scene' || k.kind !== last.kind);
    const kind = taps === 1 ? 'scene' : weighted(kinds).kind;
    last.kind = kind;
    ({ scene, quip, nudge, question, favor })[kind](d);
  }

  return {
    tap,
    think,
    overHead,
    // for local testing: play one kind (or one named scene) on demand
    _play(kind, sceneId) {
      const d = getCompanion();
      if (sceneId) { last.scene = null; const keep = SCENES[d.def.id]; SCENES[d.def.id] = [{ id: sceneId, w: 1 }]; const p = scene(d); SCENES[d.def.id] = keep; return p; }
      return ({ scene, quip, nudge, question, favor })[kind](d);
    },
  };
}
