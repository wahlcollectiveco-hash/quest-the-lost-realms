// Baby dragons that have hatched.
// A new baby starts out curled up in the big nest. Later your dragon builds
// them a small nest of their own, and they potter around it, nap in it, and
// keep whatever they've been given (a flower crown, a treasure, a lantern).
import * as THREE from 'three';
import { createDragon } from './dragon.js';
import { makeCrown } from './activities.js';
import { toon } from './style.js';
import { hatchlingDef, CHIRPS } from '../data/creatures.js';
import { easeOut } from './scene.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;

// Where the little nests go, in the meadow in front of the cottage.
const NEST_SLOTS = [[-3.6, 2.7], [-5.6, 1.7], [-1.9, 4.3], [-4.7, 4.5], [-6.7, 3.6], [-2.9, 6.1]];

function makeNest() {
  const g = new THREE.Group();
  const twig = toon('#8a6238');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 7, 18), twig);
  ring.rotation.x = Math.PI / 2;
  ring.scale.z = 0.8;
  ring.position.y = 0.1;
  g.add(ring);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.1, 14), toon('#e3cf95'));
  straw.position.y = 0.07;
  g.add(straw);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + Math.random();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 4), twig);
    t.position.set(Math.cos(a) * 0.43, 0.16 + Math.random() * 0.05, Math.sin(a) * 0.43);
    t.rotation.set(Math.PI / 2, 0, a + Math.PI / 2 + (Math.random() - 0.5) * 0.9, 'YXZ');
    g.add(t);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function makeGem() {
  const g = new THREE.Group();
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color: '#ffcf5a', emissive: '#ffb53a', emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.3 }));
  gem.position.y = 0.2;
  gem.scale.y = 1.25;
  g.add(gem);
  g.userData.spin = gem;
  return g;
}

function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.62, 6), toon('#6a5a86'));
  post.position.y = 0.31;
  g.add(post);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 5), toon('#6a5a86'));
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.09, 0.61, 0);
  g.add(arm);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffe08a', emissiveIntensity: 1.6, roughness: 0.3 }));
  glow.position.set(0.18, 0.5, 0);
  g.add(glow);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.06, 6), toon('#6a5a86'));
  cap.position.set(0.18, 0.6, 0);
  g.add(cap);
  g.userData.glow = glow;
  return g;
}

export function createHatchlings(world, haven, { say, isNestling = () => false, onTap }) {
  const { scene } = world;
  const bigNest = haven.anchors.nest;
  const cottage = new V(-5.6, 0, -2.8);
  const babies = new Map();

  const slotFor = (creature) => {
    const i = creature.nest ?? 0;
    const [x, z] = NEST_SLOTS[i % NEST_SLOTS.length];
    const lap = Math.floor(i / NEST_SLOTS.length); // more babies than slots: tuck in beside
    return new V(x + lap * 0.9, 0, z + lap * 0.7);
  };

  // A spot to wander to: near their own nest if they have one, otherwise
  // around the big nest (clear of the nest itself and the cottage).
  function wanderSpot(b) {
    if (b.nestObj) {
      const c = b.nestObj.position;
      const a = Math.random() * TAU;
      const r = 0.9 + Math.random() * 0.9;
      return new V(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    }
    for (let i = 0; i < 20; i++) {
      const p = new V(-3.8 + Math.random() * 2.6, 0, -1.2 + Math.random() * 2.8);
      if (p.distanceTo(bigNest) > 0.95 && p.distanceTo(cottage) > 2.7) return p;
    }
    return new V(bigNest.x + 1.2, 0, bigNest.z + 1.2);
  }

  function addNest(b, animate) {
    if (b.nestObj) return;
    const n = makeNest();
    n.position.copy(slotFor(b.creature));
    n.rotation.y = Math.random() * TAU;
    scene.add(n);
    b.nestObj = n;
    if (animate) {
      n.scale.setScalar(0.001);
      world.tween(0.9, (p) => n.scale.setScalar(Math.max(0.001, p * (1 + 0.2 * Math.sin(p * Math.PI)))), easeOut);
    }
  }

  function addGift(b, animate) {
    const kind = b.creature.gift;
    if (!kind || b.giftObj) return;
    let obj;
    if (kind === 'crown') {
      obj = makeCrown();
      b.d.head.add(obj);
    } else {
      obj = kind === 'gem' ? makeGem() : makeLantern();
      const c = b.nestObj ? b.nestObj.position : slotFor(b.creature);
      obj.position.set(c.x + 0.62, 0, c.z + 0.18);
      scene.add(obj);
    }
    b.giftObj = obj;
    if (animate) {
      const s = obj.scale.x;
      obj.scale.setScalar(0.001);
      world.tween(0.8, (p) => obj.scale.setScalar(Math.max(0.001, s * p * (1 + 0.3 * Math.sin(p * Math.PI)))), easeOut);
    }
  }

  function spawn(creature, { pop = false } = {}) {
    const d = createDragon(hatchlingDef(creature));
    const b = { d, creature, target: null, wait: 2 + Math.random() * 4, nestObj: null, giftObj: null, napping: 0, moving: false };
    babies.set(creature.id, b);
    if (creature.nest != null) addNest(b, false);
    addGift(b, false);
    const start = isNestling(creature.id) || pop ? new V(bigNest.x, 0.22, bigNest.z + 0.05) : wanderSpot(b);
    d.root.position.copy(start);
    d.root.rotation.y = pop ? 0.4 : Math.random() * TAU;
    scene.add(d.root);
    world.addUpdater(d.update);
    world.onTap(d.root, () => {
      d.react('hop');
      if (onTap?.(b.creature)) return;
      say(`${b.creature.name} ${CHIRPS[Math.floor(Math.random() * CHIRPS.length)]}`, 3000);
    });
    if (pop) {
      const s = d.root.scale.x;
      d.root.scale.setScalar(0.001);
      world.tween(1.4, (p) => d.root.scale.setScalar(Math.max(0.001, s * p)), easeOut).then(() => d.react('celebrate'));
    }
    return b;
  }

  // Hop from wherever they are to a spot, in a few bouncy arcs.
  function hopTo(b, to, dur = 2.6) {
    const from = b.d.root.position.clone();
    b.moving = true;
    b.target = null;
    b.d.setPose({});
    b.d.faceTowards(to.x, to.z);
    return world.tween(dur, (p) => {
      b.d.root.position.lerpVectors(from, to, p);
      b.d.root.position.y = from.y + (to.y - from.y) * p + Math.abs(Math.sin(p * Math.PI * 4)) * 0.3;
    }).then(() => { b.moving = false; b.wait = 3; });
  }

  world.addUpdater((t, dt) => {
    for (const b of babies.values()) {
      const r = b.d.root;
      if (b.giftObj?.userData.spin) b.giftObj.userData.spin.rotation.y = t * 0.8;
      if (b.giftObj?.userData.glow) b.giftObj.userData.glow.material.emissiveIntensity = 1.4 + 0.4 * Math.sin(t * 2.1);
      if (b.moving) continue;
      // A brand-new baby stays curled up in the big nest, dozing and peeking out.
      if (!b.nestObj && isNestling(b.creature.id)) {
        r.position.set(bigNest.x, 0.22, bigNest.z + 0.05);
        const awake = Math.sin(t * 0.21 + 1) > 0.55;
        b.d.setPose(awake ? { lie: 0.5 } : { lie: 1, sleep: 1 });
        continue;
      }
      if (r.position.y > 0) r.position.y = Math.max(0, r.position.y - dt * 0.5);
      if (b.napping > 0) {
        b.napping -= dt;
        if (b.napping <= 0) { b.d.setPose({}); b.wait = 2; }
        continue;
      }
      if (!b.target) {
        b.wait -= dt;
        if (b.wait <= 0) {
          // sometimes head back to their own nest for a nap
          if (b.nestObj && Math.random() < 0.3) { b.target = b.nestObj.position.clone(); b.toNap = true; } else b.target = wanderSpot(b);
        }
        continue;
      }
      const to = new V(b.target.x - r.position.x, 0, b.target.z - r.position.z);
      const dist = to.length();
      if (dist < 0.05) {
        b.target = null;
        if (b.toNap) {
          b.toNap = false;
          b.napping = 12 + Math.random() * 14;
          b.d.setPose({ lie: 1, sleep: 1 });
          continue;
        }
        b.wait = 4 + Math.random() * 8;
        b.d.setPose(Math.random() < 0.3 ? { headDown: 0.8, nibble: 1 } : {});
        continue;
      }
      b.d.setPose({ walk: 1 });
      r.position.addScaledVector(to.normalize(), Math.min(dist, 0.55 * dt));
      const want = Math.atan2(to.x, to.z);
      let diff = want - r.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      r.rotation.y += diff * Math.min(1, dt * 5);
    }
  });

  return {
    spawn,
    rename(id, name) { const b = babies.get(id); if (b) b.creature = { ...b.creature, name }; },
    get(id) { return babies.get(id); },
    position(id) { return babies.get(id)?.d.root.position.clone() ?? bigNest.clone(); },
    // Where this baby's own nest is (or will be).
    nestSpot(creature) { return slotFor(creature); },
    // The little nest appears, and the baby hops over from the big nest.
    async buildNest(creature) {
      const b = babies.get(creature.id);
      if (!b) return;
      b.creature = { ...b.creature, nest: creature.nest };
      b.moving = true;
      addNest(b, true);
      b.d.setPose({});
      b.d.react('celebrate');
      await new Promise((r) => setTimeout(r, 1200));
      const spot = slotFor(b.creature);
      await hopTo(b, new V(spot.x, 0.12, spot.z), 2.8);
      b.d.react('celebrate');
    },
    // The gift appears: on their head, or beside their nest.
    giveGift(creature) {
      const b = babies.get(creature.id);
      if (!b) return;
      b.creature = { ...b.creature, gift: creature.gift };
      b.napping = 0;
      b.d.setPose({});
      addGift(b, true);
      b.d.react('celebrate');
    },
    // Bring the baby to their nest and have them look up (for a clip).
    async gather(creature) {
      const b = babies.get(creature.id);
      if (!b) return;
      b.napping = 0;
      const spot = slotFor(b.creature);
      await hopTo(b, new V(spot.x + 0.1, 0, spot.z + 0.75), 1.6);
    },
  };
}
