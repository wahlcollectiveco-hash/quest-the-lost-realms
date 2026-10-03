// Little creatures who move into the Haven as rewards: a hedgehog, a bunny,
// a frog, a duckling, a snail and a squirrel. Each has a favourite spot and
// its own way of getting about. Tap one and it says hello.
import * as THREE from 'three';
import { toon } from './style.js';
import { easeOut } from './scene.js';
import { visitorById } from '../data/life.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const m = (c, o) => toon(c, o);
function add(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  if (scale) typeof scale === 'number' ? mesh.scale.setScalar(scale) : mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
const sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
function eyes(parent, x, y, z, r = 0.025) {
  const black = m('#2a2420');
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) {
    add(parent, sph(r, 8, 6), black, [x * sx, y, z]);
    add(parent, sph(r * 0.35, 6, 4), white, [x * sx + r * 0.3, y + r * 0.35, z + r * 0.7]);
  }
}

// ---- Models (all facing +z) ----
const MODELS = {
  hedgehog() {
    const g = new THREE.Group();
    const spikes = m('#6b4a32');
    add(g, sph(0.24), spikes, [0, 0.17, -0.03], [0, 0, 0], [1, 0.8, 1.15]);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU * 3.1;
      const up = 0.3 + (i / 26) * 1.1;
      const d = new V(Math.cos(a) * Math.sin(up), Math.cos(up) * 0.9, -Math.abs(Math.sin(a)) * 0.4 - 0.2).normalize();
      const s = add(g, new THREE.ConeGeometry(0.035, 0.16, 5), spikes, [d.x * 0.22, 0.17 + d.y * 0.18, -0.03 + d.z * 0.24]);
      s.quaternion.setFromUnitVectors(new V(0, 1, 0), d);
    }
    add(g, new THREE.ConeGeometry(0.11, 0.24, 10), m('#e6cfa6'), [0, 0.13, 0.2], [Math.PI / 2, 0, 0], [1, 1, 0.8]);
    add(g, sph(0.03, 8, 6), m('#2a2420'), [0, 0.13, 0.33]);
    eyes(g, 0.06, 0.2, 0.2, 0.022);
    return g;
  },
  bunny() {
    const g = new THREE.Group();
    const fur = m('#f3ece0');
    add(g, sph(0.2), fur, [0, 0.18, -0.04], [0, 0, 0], [0.95, 0.95, 1.15]);
    const head = new THREE.Group();
    head.position.set(0, 0.36, 0.13);
    g.add(head);
    add(head, sph(0.13), fur);
    for (const sx of [-1, 1]) {
      add(head, new THREE.CapsuleGeometry(0.035, 0.2, 4, 8), fur, [0.05 * sx, 0.2, -0.03], [-0.25, 0, -0.18 * sx]);
      add(head, new THREE.CapsuleGeometry(0.018, 0.14, 4, 6), m('#f2b8c4'), [0.05 * sx, 0.2, -0.005], [-0.25, 0, -0.18 * sx]);
    }
    add(head, sph(0.02, 8, 6), m('#e88a9c'), [0, -0.01, 0.13]);
    eyes(head, 0.065, 0.03, 0.1, 0.022);
    add(g, sph(0.06, 8, 6), m('#ffffff'), [0, 0.18, -0.26]);
    g.userData.head = head;
    return g;
  },
  frog() {
    const g = new THREE.Group();
    const skin = m('#79b24f');
    add(g, sph(0.2), skin, [0, 0.12, 0], [0, 0, 0], [1.15, 0.6, 1]);
    add(g, sph(0.13), m('#e7efc0'), [0, 0.08, 0.06], [0, 0, 0], [1.2, 0.5, 1]);
    for (const sx of [-1, 1]) {
      add(g, sph(0.065), skin, [0.09 * sx, 0.24, 0.1]);
      add(g, sph(0.045, 10, 8), m('#ffffff'), [0.09 * sx, 0.26, 0.14]);
      add(g, sph(0.025, 8, 6), m('#2a2420'), [0.09 * sx, 0.265, 0.18]);
      add(g, sph(0.08), skin, [0.17 * sx, 0.06, -0.06], [0, 0, 0], [0.7, 0.45, 1.3]);
    }
    add(g, new THREE.TorusGeometry(0.06, 0.008, 4, 12, Math.PI), m('#3f6b2a'), [0, 0.14, 0.19], [0, 0, Math.PI]);
    return g;
  },
  duck() {
    const g = new THREE.Group();
    const down = m('#f6d65e');
    add(g, sph(0.17), down, [0, 0.1, 0], [0, 0, 0], [0.95, 0.8, 1.2]);
    add(g, sph(0.11), down, [0, 0.27, 0.12]);
    add(g, new THREE.ConeGeometry(0.035, 0.09, 8), m('#f08a2a'), [0, 0.25, 0.25], [Math.PI / 2, 0, 0], [1.4, 1, 0.5]);
    eyes(g, 0.05, 0.3, 0.2, 0.018);
    add(g, new THREE.ConeGeometry(0.05, 0.1, 6), down, [0, 0.16, -0.2], [-1.0, 0, 0]);
    return g;
  },
  snail() {
    const g = new THREE.Group();
    const body = m('#d9c9a8');
    add(g, new THREE.CapsuleGeometry(0.06, 0.3, 4, 10), body, [0, 0.055, 0.02], [Math.PI / 2, 0, 0], [1, 1, 0.75]);
    const shell = m('#b57a45');
    add(g, new THREE.TorusGeometry(0.11, 0.07, 10, 18), shell, [0, 0.19, -0.04], [0, Math.PI / 2, 0]);
    add(g, sph(0.08), m('#c98f55'), [0, 0.19, -0.04]);
    for (const sx of [-1, 1]) {
      add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.12, 5), body, [0.03 * sx, 0.14, 0.19], [0.4, 0, 0.2 * sx]);
      add(g, sph(0.018, 8, 6), m('#2a2420'), [0.042 * sx, 0.2, 0.215]);
    }
    return g;
  },
  squirrel() {
    const g = new THREE.Group();
    const fur = m('#c06a34');
    add(g, sph(0.15), fur, [0, 0.17, 0], [0, 0, 0], [0.9, 1.1, 1]);
    add(g, sph(0.1), m('#f0d8b4'), [0, 0.16, 0.08], [0, 0, 0], [0.8, 1, 0.6]);
    const head = new THREE.Group();
    head.position.set(0, 0.34, 0.05);
    g.add(head);
    add(head, sph(0.1), fur);
    for (const sx of [-1, 1]) add(head, new THREE.ConeGeometry(0.03, 0.07, 6), fur, [0.055 * sx, 0.1, -0.01]);
    add(head, sph(0.016, 8, 6), m('#2a2420'), [0, -0.01, 0.1]);
    eyes(head, 0.045, 0.02, 0.075, 0.018);
    const tail = new THREE.Group();
    tail.position.set(0, 0.12, -0.14);
    g.add(tail);
    add(tail, sph(0.1), fur, [0, 0.06, -0.04], [0, 0, 0], [0.8, 1, 0.9]);
    add(tail, sph(0.11), fur, [0, 0.2, -0.08], [0, 0, 0], [0.8, 1, 0.9]);
    add(tail, sph(0.1), m('#d8844a'), [0, 0.33, -0.04], [0, 0, 0], [0.8, 0.9, 0.9]);
    g.userData.tail = tail;
    return g;
  },
};

export function createVisitors(world, { say }) {
  const { scene } = world;
  const all = new Map();

  function spawn(id, { arrive = false } = {}) {
    const def = visitorById(id);
    if (!def || all.has(id)) return null;
    const obj = MODELS[id]();
    const home = new V(def.home[0], 0, def.home[1]);
    obj.position.copy(home);
    obj.rotation.y = Math.random() * TAU;
    obj.scale.setScalar(1.7);
    scene.add(obj);
    const v = { def, obj, home, target: null, wait: 1 + Math.random() * 3, hopT: -1, from: new V(), ang: Math.random() * TAU };
    all.set(id, v);
    world.onTap(obj, () => {
      v.hopT = 0;
      v.from.copy(obj.position);
      v.target = null;
      say(def.lines[Math.floor(Math.random() * def.lines.length)], 3400);
    });
    if (arrive) {
      obj.scale.setScalar(0.001);
      world.tween(1.0, (p) => obj.scale.setScalar(Math.max(0.001, 1.7 * p)), easeOut);
      v.wait = 8; // stay put for a moment to say hello
    }
    return v;
  }

  function nextTarget(v) {
    const r = v.def.kind === 'slow' ? 0.9 : 1.7;
    const a = Math.random() * TAU;
    return new V(v.home.x + Math.cos(a) * r * Math.random(), 0, v.home.z + Math.sin(a) * r * Math.random());
  }

  world.addUpdater((t, dt) => {
    for (const v of all.values()) {
      const o = v.obj;
      if (v.def.kind === 'swim') {
        // the duckling paddles slow circles on the pond
        v.ang += dt * 0.25;
        o.position.set(v.home.x + Math.cos(v.ang) * 1.1, 0.02 + Math.sin(t * 2) * 0.012, v.home.z + Math.sin(v.ang) * 1.1);
        o.rotation.y = -v.ang;
        if (v.hopT >= 0) { v.hopT += dt; o.position.y += Math.sin(Math.min(1, v.hopT / 0.4) * Math.PI) * 0.12; if (v.hopT > 0.4) v.hopT = -1; }
        continue;
      }
      if (v.def.id === 'squirrel') v.obj.userData.tail.rotation.x = 0.15 * Math.sin(t * 3);
      if (v.hopT >= 0) {
        // a happy little hop in place when tapped
        v.hopT += dt;
        const p = Math.min(1, v.hopT / 0.45);
        o.position.y = Math.sin(Math.PI * p) * 0.25;
        if (p >= 1) { v.hopT = -1; o.position.y = 0; }
        continue;
      }
      if (!v.target) {
        v.wait -= dt;
        if (v.wait <= 0) { v.target = nextTarget(v); v.start = o.position.clone(); v.k = 0; }
        continue;
      }
      const to = new V(v.target.x - o.position.x, 0, v.target.z - o.position.z);
      const dist = to.length();
      const want = Math.atan2(to.x, to.z);
      let diff = want - o.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      o.rotation.y += diff * Math.min(1, dt * 4);
      if (dist < 0.04) {
        v.target = null;
        o.position.y = 0;
        v.wait = v.def.kind === 'slow' ? 6 + Math.random() * 8 : 2 + Math.random() * 6;
        continue;
      }
      const speed = { walk: 0.35, hop: 0.7, slow: 0.05 }[v.def.kind];
      o.position.addScaledVector(to.normalize(), Math.min(dist, speed * dt));
      // hoppers bounce as they go
      o.position.y = v.def.kind === 'hop' ? Math.abs(Math.sin(t * 7)) * 0.14 : 0;
    }
  });

  return {
    spawn,
    position: (id) => all.get(id)?.obj.position.clone() ?? null,
    homeOf: (id) => { const d = visitorById(id); return d ? new V(d.home[0], 0, d.home[1]) : null; },
    hop(id) { const v = all.get(id); if (v) v.hopT = 0; },
    face(id, x, z) { const v = all.get(id); if (v) v.obj.rotation.y = Math.atan2(x - v.obj.position.x, z - v.obj.position.z); },
  };
}
