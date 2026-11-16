// The treasure cave at Mossy Hollow. Outside: a mossy rock arch with a warm
// glow inside. Inside: a snug cave with lanterns, a heap of gold, and stone
// shelves where every treasure you've found sits on show. Empty spots wait
// for the ones still out there.
import * as THREE from 'three';
import { mesh, canvas, tex, rng } from './haven.js';
import { toon } from './style.js';
import { CATALOG } from '../data/discoveries.js';
import { state } from '../state.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const rand = rng(57);
const R = (a, b) => a + (b - a) * rand();

export const CAVE_CENTER = new V(-70, -140, 90);
export const CAVE_DOOR = [-4.8, -8.7]; // where the entrance stands at home
const FLOOR_R = 6.2;

export const caveWalkable = (wx, wz) => {
  const x = wx - CAVE_CENTER.x, z = wz - CAVE_CENTER.z;
  return Math.hypot(x, z) < FLOOR_R - 1 && z > -2.4;
};

// Everything that belongs on the shelves.
export const caveTreasures = () => CATALOG.filter((c) => c.kind === 'treasure' || c.kind === 'key');

const glowMat = (color, k = 0.7) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.25, metalness: 0.2 });
const part = (parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = null) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (scale) m.scale.set(...scale);
  parent.add(m);
  return m;
};
// A little model for each treasure (simple shapes, each one different).
function model(it) {
  const g = new THREE.Group();
  const c = it.color;
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b04e', metalness: 0.7, roughness: 0.3 });
  switch (it.id) {
    case 'silver-coin': part(g, new THREE.CylinderGeometry(0.16, 0.16, 0.035, 20), new THREE.MeshStandardMaterial({ color: c, metalness: 0.8, roughness: 0.25 }), [0, 0.17, 0], [Math.PI / 2 - 0.3, 0, 0]); break;
    case 'golden-acorn': part(g, new THREE.SphereGeometry(0.12, 14, 10), gold, [0, 0.14, 0], [0, 0, 0], [1, 1.25, 1]); part(g, new THREE.SphereGeometry(0.13, 12, 6, 0, TAU, 0, Math.PI / 2), toon('#8a6238'), [0, 0.2, 0]); break;
    case 'galaxy-marble': part(g, new THREE.SphereGeometry(0.15, 18, 14), glowMat(c, 0.9), [0, 0.16, 0]); break;
    case 'bronze-bell': part(g, new THREE.ConeGeometry(0.15, 0.22, 14, 1, true), new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }), [0, 0.16, 0]); part(g, new THREE.SphereGeometry(0.04, 8, 6), gold, [0, 0.05, 0]); break;
    case 'dawn-feather': case 'owl-feather': part(g, new THREE.CircleGeometry(0.2, 14), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, emissive: c, emissiveIntensity: 0.25 }), [0, 0.22, 0], [0, 0.5, 0.5], [0.34, 1, 1]); break;
    case 'moon-shell': case 'singing-shell': part(g, new THREE.SphereGeometry(0.17, 14, 8, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, side: THREE.DoubleSide }), [0, 0.03, 0], [0.5, 0, 0], [1, 0.7, 1.2]); break;
    case 'wooden-fox': part(g, new THREE.BoxGeometry(0.2, 0.14, 0.12), toon(c), [0, 0.1, 0]); part(g, new THREE.SphereGeometry(0.08, 10, 8), toon(c), [0.1, 0.22, 0]); for (const z of [-0.04, 0.04]) part(g, new THREE.ConeGeometry(0.03, 0.07, 4), toon(c), [0.1, 0.32, z]); break;
    case 'keepers-compass': part(g, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), gold, [0, 0.06, 0]); part(g, new THREE.ConeGeometry(0.025, 0.2, 4), glowMat('#c9402f', 0.5), [0, 0.1, 0], [Math.PI / 2, 0, 0.6]); break;
    case 'mossy-key': part(g, new THREE.TorusGeometry(0.07, 0.022, 6, 14), toon(c), [-0.08, 0.14, 0], [0, 0, 0]); part(g, new THREE.BoxGeometry(0.2, 0.035, 0.035), toon(c), [0.08, 0.14, 0]); part(g, new THREE.BoxGeometry(0.035, 0.07, 0.035), toon(c), [0.15, 0.11, 0]); break;
    case 'vale-crystal': part(g, new THREE.CylinderGeometry(0, 0.11, 0.36, 6), glowMat(c, 0.9), [0, 0.18, 0]); part(g, new THREE.CylinderGeometry(0, 0.07, 0.22, 6), glowMat(c, 0.9), [0.1, 0.11, 0.04], [0, 0, -0.4]); break;
    case 'star-shard': part(g, new THREE.OctahedronGeometry(0.14, 0), glowMat(c, 1.2), [0, 0.2, 0], [0, 0, 0.3], [0.6, 1.5, 0.6]); break;
    case 'comet-pebble': part(g, new THREE.SphereGeometry(0.13, 14, 10), new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.25 }), [0, 0.11, 0], [0, 0, 0], [1.2, 0.75, 1]); break;
    case 'sea-pearl': case 'great-pearl': part(g, new THREE.SphereGeometry(it.id === 'great-pearl' ? 0.2 : 0.12, 18, 14), new THREE.MeshStandardMaterial({ color: '#fdf6ff', emissive: c, emissiveIntensity: 0.6, roughness: 0.15 }), [0, it.id === 'great-pearl' ? 0.22 : 0.14, 0]); break;
    case 'sea-glass': part(g, new THREE.DodecahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.75, emissive: c, emissiveIntensity: 0.3, roughness: 0.1 }), [0, 0.13, 0], [0.4, 0.3, 0], [1.2, 0.6, 1]); break;
    case 'sun-feather': part(g, new THREE.CircleGeometry(0.2, 14), glowMat(c, 0.8), [0, 0.22, 0], [0, 0.5, 0.5], [0.34, 1, 1]).material.side = THREE.DoubleSide; break;
    default: part(g, new THREE.OctahedronGeometry(0.14, 0), glowMat(c, 0.8), [0, 0.18, 0], [0, 0.4, 0], [1, 1.2, 1]);
  }
  return g;
}

export function buildCave(world, homeGroup, { say }) {
  const { scene } = world;
  const rock = toon('#857c6c');
  const rockDark = toon('#6a6256');

  // ---- Outside, at home: a mossy rock arch with a glow inside ----
  const entrance = new THREE.Group();
  entrance.position.set(CAVE_DOOR[0], 0, CAVE_DOOR[1]);
  for (const [x, y, z, s] of [[-1.5, 0.9, 0, 1.3], [1.5, 0.9, 0, 1.25], [0, 2.3, -0.2, 1.5], [-0.9, 1.9, -0.3, 1.1], [0.9, 1.9, -0.3, 1.1], [0, 1.1, -1.4, 1.9]]) {
    entrance.add(mesh(new THREE.DodecahedronGeometry(s, 1), rand() < 0.5 ? rock : rockDark, { pos: [x, y, z], rot: [R(0, 3), R(0, 3), 0], scale: [1, 0.9, 1] }));
  }
  entrance.add(mesh(new THREE.CircleGeometry(1.05, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#1c1410' }), { pos: [0, 0.02, 1.06], scale: [1, 1.55, 1], cast: false }));
  const mouthGlow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#ffb866', transparent: true, opacity: 0.55 }));
  mouthGlow.position.set(0, 0.02, 1.08);
  mouthGlow.scale.set(1, 1.2, 1);
  entrance.add(mouthGlow);
  for (const [x, y, s] of [[-1.3, 2.2, 0.7], [0.4, 3.4, 0.9], [1.6, 1.9, 0.6]]) entrance.add(mesh(new THREE.SphereGeometry(s, 12, 8), toon('#6aa646'), { pos: [x, y, 0.3], scale: [1.2, 0.45, 1.1] }));
  entrance.add(mesh(new THREE.OctahedronGeometry(0.16, 0), glowMat('#ffd77a', 1.4), { pos: [1.5, 0.4, 1.3], scale: [0.8, 1.4, 0.8] }));
  const outLight = new THREE.PointLight('#ffb866', 4, 6, 2);
  outLight.position.set(0, 1, 1.8);
  entrance.add(outLight);
  entrance.lookAt(0, 0, 0);
  homeGroup.add(entrance);

  // ---- Inside ----
  const group = new THREE.Group();
  group.position.copy(CAVE_CENTER);
  scene.add(group);
  const [fc, fg] = canvas(512, 512);
  fg.fillStyle = '#7a6c5a';
  fg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) {
    fg.fillStyle = ['rgba(60,48,36,0.25)', 'rgba(170,150,120,0.22)'][i % 2];
    fg.beginPath(); fg.ellipse(R(0, 512), R(0, 512), R(10, 46), R(6, 26), R(0, 3), 0, TAU); fg.fill();
  }
  group.add(mesh(new THREE.CircleGeometry(FLOOR_R + 3, 40), new THREE.MeshStandardMaterial({ map: tex(fc), roughness: 1 }), { rot: [-Math.PI / 2, 0, 0], cast: false }));
  // the cave walls: a rocky dome all around
  const dome = new THREE.Mesh(new THREE.SphereGeometry(FLOOR_R + 3, 28, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5e5346', roughness: 1, side: THREE.BackSide }));
  dome.scale.y = 0.75;
  group.add(dome);
  for (let i = 0; i < 26; i++) { // lumpy rocks round the edge, and a few hanging from the roof
    const a = (i / 26) * TAU;
    group.add(mesh(new THREE.DodecahedronGeometry(R(0.9, 1.7), 1), i % 2 ? rock : rockDark, { pos: [Math.cos(a) * (FLOOR_R + 0.9), R(0.3, 1.2), Math.sin(a) * (FLOOR_R + 0.9)], rot: [R(0, 3), R(0, 3), 0], cast: false }));
  }
  for (let i = 0; i < 9; i++) group.add(mesh(new THREE.ConeGeometry(R(0.2, 0.4), R(0.8, 1.6), 6), rockDark, { pos: [R(-4, 4), 5.6, R(-4, 3)], rot: [Math.PI, 0, 0], cast: false }));

  // lanterns
  const lamps = [[-4.4, 2.6, -1.2], [4.4, 2.6, -1.2], [0, 3.6, -5]].map(([x, y, z]) => {
    const l = new THREE.PointLight('#ffbf70', 16, 16, 1.6);
    l.position.set(x, y, z);
    group.add(l);
    group.add(mesh(new THREE.SphereGeometry(0.16, 12, 10), glowMat('#ffd98a', 2.2), { pos: [x, y, z], cast: false }));
    group.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 4), rockDark, { pos: [x, y + 1.6, z], cast: false }));
    return l;
  });
  group.add(new THREE.HemisphereLight('#ffd6a0', '#5a4634', 0.9));
  world.addUpdater((t) => { lamps.forEach((l, i) => { l.intensity = 15 + Math.sin(t * 3 + i * 2) * 1.5; }); });

  // a heap of gold to curl up on
  const heap = new THREE.Group();
  heap.position.set(-4.0, 0, -0.2);
  const coin = new THREE.MeshStandardMaterial({ color: '#f1c75a', metalness: 0.7, roughness: 0.3, emissive: '#b8862a', emissiveIntensity: 0.25 });
  heap.add(mesh(new THREE.SphereGeometry(1.1, 16, 10, 0, TAU, 0, Math.PI / 2), coin, { scale: [1, 0.42, 1], cast: false }));
  for (let i = 0; i < 40; i++) {
    const a = R(0, TAU), r = Math.sqrt(rand()) * 1.2;
    heap.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), coin, { pos: [Math.cos(a) * r, 0.05 + (1.2 - r) * 0.36, Math.sin(a) * r], rot: [R(-0.5, 0.5), 0, R(-0.5, 0.5)], cast: false }));
  }
  group.add(heap);

  // ---- The shelves along the back wall ----
  const wood = toon('#7a5236');
  const slots = [];
  const ROWS = [[1.0, 7], [2.0, 7], [3.0, 6]];
  ROWS.forEach(([y, n], row) => {
    const rr = FLOOR_R - 0.6 - row * 0.12;
    const span = 1.9; // radians of back wall
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 - span / 2 + ((i + 0.5) / n) * span;
      slots.push(new V(Math.cos(a) * (rr - 0.12), y, Math.sin(a) * (rr - 0.12)));
      const plank = mesh(new THREE.BoxGeometry(span * rr / n + 0.06, 0.1, 0.62), wood, { pos: [Math.cos(a) * (rr - 0.05), y - 0.06, Math.sin(a) * (rr - 0.05)], cast: false });
      plank.rotation.y = -a + Math.PI / 2;
      group.add(plank);
    }
  });

  const shown = new Map();
  const spots = [];
  const dustMat = new THREE.MeshBasicMaterial({ color: '#3a3026', transparent: true, opacity: 0.55 });
  function refresh() {
    const all = caveTreasures();
    all.forEach((it, i) => {
      const slot = slots[i % slots.length];
      if (!spots[i]) {
        const d = mesh(new THREE.CircleGeometry(0.16, 16), dustMat, { pos: [slot.x, slot.y + 0.005, slot.z], rot: [-Math.PI / 2, 0, 0], cast: false });
        group.add(d);
        spots[i] = d;
      }
      const have = !!state.found[it.id];
      spots[i].visible = !have;
      if (have && !shown.has(it.id)) {
        const m = model(it);
        m.position.copy(slot);
        m.scale.setScalar(2.3);
        m.lookAt(0, slot.y, 0.5);
        m.userData.base = slot.y;
        group.add(m);
        shown.set(it.id, m);
        world.onTap(m, () => tapTreasure?.(it, m));
      }
    });
  }
  let tapTreasure = null;
  world.addUpdater((t) => {
    let i = 0;
    for (const m of shown.values()) { m.position.y = m.userData.base + Math.sin(t * 1.4 + i) * 0.015; m.rotation.y += 0.003; i++; }
  });
  void say;

  return {
    entrance,
    group,
    center: CAVE_CENTER.clone(),
    arrive: new V(0.6, 0, 2.6).add(CAVE_CENTER),
    heapSpot: new V(-2.6, 0, -0.6).add(CAVE_CENTER),
    refresh,
    onTapTreasure(fn) { tapTreasure = fn; },
    positionOf: (id) => shown.get(id)?.getWorldPosition(new V()) ?? null,
    counts: () => ({ have: caveTreasures().filter((c) => state.found[c.id]).length, all: caveTreasures().length }),
  };
}
