// Discovered flowers and decorations take root in the Haven, plus a small
// glittering pile by the chest that grows with each treasure found.
import * as THREE from 'three';
import { easeOut } from './scene.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;

const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o }));
  return matCache.get(key);
}
function add(parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (scale) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const stemMat = () => mat('#5e8c3c');
let seed = 3;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const R = (a, b) => a + (b - a) * rand();

// Where each discovery lives in the Haven: [x, y, z, rotationY]
const SLOTS = {
  moonpetal: [-3.4, 0, 2.9, 0],
  sunbell: [1.9, 0, -2.0, 0],
  whisperfern: [-1.9, 0, -4.2, 0],
  starblossom: [1.9, 0, 3.0, 0],
  'dewdrop-lily': [5.7, 0.05, 0.9, 0],
  emberbloom: [-4.6, 0, 5.0, 0],
  'paper-lanterns': [0.2, 0, 7.6, 0],
  'mushroom-ring': [3.8, 0, 6.4, 0],
  'stone-bench': [-2.3, 0, -2.4, Math.PI / 2],
  'bird-bath': [4.3, 0, 4.7, 0],
  'wind-chime': [-3.5, 0, -1.3, 0.6],
  'stone-guardian': [-2.7, 0.3, -8.2, 0.3],
  'flower-arch': [0, 0, -5.0, 0],
  'picnic-blanket': [2.4, 0.02, -0.6, 0.4],
  glowcaps: [-1.4, 0, -6.6, 0],
};

// ---- Builders ----
function patch(n, radius, make) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = R(0, TAU), r = Math.sqrt(rand()) * radius;
    const h = R(0.28, 0.55);
    const f = new THREE.Group();
    f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    f.rotation.y = R(0, TAU);
    add(f, new THREE.CylinderGeometry(0.014, 0.018, h, 4), stemMat(), [0, h / 2, 0]);
    make(f, h);
    g.add(f);
  }
  return g;
}

const BUILDERS = {
  moonpetal() {
    const glow = mat('#dfe5ff', { emissive: '#aeb9ff', emissiveIntensity: 1.1 });
    const g = patch(9, 0.6, (f, h) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        add(f, new THREE.SphereGeometry(0.06, 8, 6), glow, [Math.cos(a) * 0.06, h, Math.sin(a) * 0.06], [0, 0, 0], [1, 0.4, 1]);
      }
    });
    g.userData.glow = glow;
    return g;
  },
  sunbell() {
    const bell = mat('#f6cf4a', { side: THREE.DoubleSide });
    return patch(8, 0.55, (f, h) => {
      add(f, new THREE.ConeGeometry(0.08, 0.13, 10, 1, true), bell, [0.04, h - 0.04, 0], [Math.PI, 0, 0.3]);
    });
  },
  whisperfern() {
    const g = new THREE.Group();
    const leaf = mat('#6fa65a', { side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + R(-0.2, 0.2);
      const frond = new THREE.Group();
      frond.rotation.y = a;
      add(frond, new THREE.ConeGeometry(0.09, 0.8, 5), leaf, [0, 0.36, 0.25], [0.7, 0, 0], [1, 1, 0.25]);
      g.add(frond);
    }
    return g;
  },
  starblossom() {
    const petal = mat('#f3b6d8');
    const center = mat('#f7df7a');
    return patch(9, 0.6, (f, h) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        add(f, new THREE.ConeGeometry(0.035, 0.1, 4), petal, [Math.cos(a) * 0.05, h, Math.sin(a) * 0.05], [0, -a, Math.PI / 2]);
      }
      add(f, new THREE.SphereGeometry(0.028, 8, 6), center, [0, h + 0.01, 0]);
    });
  },
  'dewdrop-lily'() {
    const g = new THREE.Group();
    add(g, new THREE.CircleGeometry(0.42, 20, 0.3, TAU - 0.6), mat('#6d9c4a', { side: THREE.DoubleSide }), [0, 0.01, 0], [-Math.PI / 2, 0, 0]);
    const white = mat('#f4fbff');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      add(g, new THREE.SphereGeometry(0.08, 10, 8), white, [Math.cos(a) * 0.09, 0.1, Math.sin(a) * 0.09], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], [0.5, 1.3, 0.35]);
    }
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: '#dff6ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75, emissive: '#bfefff', emissiveIntensity: 0.6 }));
    drop.position.y = 0.2;
    g.add(drop);
    return g;
  },
  emberbloom() {
    const cup = mat('#f08a4b', { emissive: '#e8641f', emissiveIntensity: 0.35, side: THREE.DoubleSide });
    return patch(8, 0.55, (f, h) => {
      add(f, new THREE.SphereGeometry(0.075, 10, 8, 0, TAU, 0, Math.PI * 0.6), cup, [0, h + 0.02, 0], [Math.PI, 0, 0], [1, 1.3, 1]);
    });
  },

  glowcaps() {
    const glow = mat('#a9f0e0', { emissive: '#5fe0c8', emissiveIntensity: 1.1 });
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = R(0, TAU), r = R(0, 0.5), s = R(0.7, 1.3);
      const m = new THREE.Group();
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      m.scale.setScalar(s);
      add(m, new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8), mat('#eef2e6'), [0, 0.11, 0]);
      add(m, new THREE.SphereGeometry(0.12, 12, 8, 0, TAU, 0, Math.PI / 2), glow, [0, 0.2, 0], [0, 0, 0], [1, 0.7, 1]);
      g.add(m);
    }
    return g;
  },
  'paper-lanterns'() {
    const g = new THREE.Group();
    const wood = mat('#6b4a31');
    const posts = [new V(-1.75, 0, 0.15), new V(1.75, 0, -0.15)];
    for (const p of posts) add(g, new THREE.CylinderGeometry(0.05, 0.07, 2.4, 6), wood, [p.x, 1.2, p.z]);
    const curve = new THREE.QuadraticBezierCurve3(new V(-1.75, 2.35, 0.15), new V(0, 1.75, 0), new V(1.75, 2.35, -0.15));
    add(g, new THREE.TubeGeometry(curve, 20, 0.012, 4), mat('#3d3228'));
    const colors = ['#f7b267', '#f4d58d', '#f28f8f', '#f7b267', '#f4d58d'];
    g.userData.lanterns = [];
    colors.forEach((c, i) => {
      const p = curve.getPoint((i + 1) / 6);
      const l = new THREE.Group();
      l.position.copy(p);
      add(l, new THREE.SphereGeometry(0.13, 12, 10), mat(c, { emissive: c, emissiveIntensity: 1.4 }), [0, -0.16, 0], [0, 0, 0], [1, 1.25, 1]);
      add(l, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), wood, [0, -0.01, 0]);
      g.add(l);
      g.userData.lanterns.push(l);
    });
    const light = new THREE.PointLight('#ffc27a', 3, 5, 2);
    light.position.set(0, 1.6, 0);
    g.add(light);
    return g;
  },
  'mushroom-ring'() {
    const g = new THREE.Group();
    const stem = mat('#f1e6cc');
    const caps = [mat('#d8674e'), mat('#e0836a'), mat('#c9573f')];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const s = R(0.7, 1.2);
      const m = new THREE.Group();
      m.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95);
      m.scale.setScalar(s);
      add(m, new THREE.CylinderGeometry(0.04, 0.05, 0.18, 8), stem, [0, 0.09, 0]);
      add(m, new THREE.SphereGeometry(0.1, 12, 8, 0, TAU, 0, Math.PI / 2), caps[i % 3], [0, 0.17, 0], [0, 0, 0], [1, 0.7, 1]);
      g.add(m);
    }
    return g;
  },
  'stone-bench'() {
    const g = new THREE.Group();
    const stone = mat('#a9a391', { flatShading: true });
    add(g, new THREE.BoxGeometry(1.3, 0.14, 0.42), stone, [0, 0.42, 0]);
    for (const x of [-0.48, 0.48]) add(g, new THREE.BoxGeometry(0.2, 0.36, 0.36), stone, [x, 0.18, 0]);
    add(g, new THREE.SphereGeometry(0.16, 10, 8), mat('#6f9c4c'), [-0.5, 0.5, 0.05], [0, 0, 0], [1.2, 0.35, 1]);
    return g;
  },
  'bird-bath'() {
    const g = new THREE.Group();
    const stone = mat('#bdb5a0', { flatShading: true });
    add(g, new THREE.CylinderGeometry(0.25, 0.32, 0.12, 10), stone, [0, 0.06, 0]);
    add(g, new THREE.CylinderGeometry(0.09, 0.12, 0.7, 8), stone, [0, 0.45, 0]);
    add(g, new THREE.CylinderGeometry(0.45, 0.3, 0.14, 14), stone, [0, 0.85, 0]);
    add(g, new THREE.CircleGeometry(0.38, 16), mat('#8fd0e0', { roughness: 0.1 }), [0, 0.93, 0], [-Math.PI / 2, 0, 0]);
    const bird = new THREE.Group();
    bird.position.set(0.3, 0.95, 0.1);
    add(bird, new THREE.SphereGeometry(0.07, 10, 8), mat('#8a6f5a'), [0, 0.06, 0], [0, 0, 0], [1, 0.9, 1.3]);
    add(bird, new THREE.SphereGeometry(0.05, 10, 8), mat('#8a6f5a'), [0, 0.13, 0.06]);
    add(bird, new THREE.SphereGeometry(0.035, 8, 6), mat('#e98d5a'), [0, 0.07, 0.07]);
    add(bird, new THREE.ConeGeometry(0.015, 0.04, 4), mat('#e0b25a'), [0, 0.13, 0.12], [Math.PI / 2, 0, 0]);
    g.add(bird);
    g.userData.bird = bird;
    return g;
  },
  'wind-chime'() {
    const g = new THREE.Group();
    const iron = mat('#4a4038', { metalness: 0.4, roughness: 0.5 });
    add(g, new THREE.CylinderGeometry(0.03, 0.035, 2.1, 6), iron, [0, 1.05, 0]);
    add(g, new THREE.TorusGeometry(0.22, 0.025, 6, 12, Math.PI), iron, [0.22, 2.1, 0]);
    const chime = new THREE.Group();
    chime.position.set(0.44, 2.05, 0);
    add(chime, new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), mat('#8a6440'), [0, -0.2, 0]);
    const tube = mat('#9fc8d8', { metalness: 0.5, roughness: 0.25 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const len = 0.25 + i * 0.05;
      add(chime, new THREE.CylinderGeometry(0.018, 0.018, len, 6), tube, [Math.cos(a) * 0.09, -0.24 - len / 2, Math.sin(a) * 0.09]);
    }
    g.add(chime);
    g.userData.chime = chime;
    return g;
  },
  'stone-guardian'() {
    const g = new THREE.Group();
    const stone = mat('#9a9483', { flatShading: true });
    add(g, new THREE.BoxGeometry(0.5, 0.35, 0.5), stone, [0, 0.175, 0]);
    add(g, new THREE.SphereGeometry(0.22, 10, 8), stone, [0, 0.55, 0], [0, 0, 0], [1, 1.25, 0.95]);
    add(g, new THREE.SphereGeometry(0.17, 10, 8), stone, [0, 0.86, 0.02]);
    for (const x of [-0.07, 0.07]) {
      add(g, new THREE.SphereGeometry(0.05, 8, 6), mat('#d8c6ff', { emissive: '#b9a4ff', emissiveIntensity: 1.2 }), [x, 0.88, 0.15]);
      add(g, new THREE.ConeGeometry(0.04, 0.1, 4), stone, [x * 1.4, 1.02, 0], [0, 0, x > 0 ? -0.3 : 0.3]);
    }
    add(g, new THREE.SphereGeometry(0.1, 8, 6), mat('#6f9c4c'), [0.15, 0.36, 0.1], [0, 0, 0], [1.3, 0.4, 1]);
    return g;
  },
  'flower-arch'() {
    const g = new THREE.Group();
    const wood = mat('#8a6440');
    const curve = new THREE.CatmullRomCurve3([new V(-1.0, 0, 0), new V(-1.0, 1.6, 0), new V(-0.6, 2.3, 0), new V(0.6, 2.3, 0), new V(1.0, 1.6, 0), new V(1.0, 0, 0)]);
    add(g, new THREE.TubeGeometry(curve, 40, 0.05, 6), wood);
    const leaf = mat('#5f8f42');
    const roses = [mat('#e79ab4'), mat('#f3c1d3'), mat('#d9708f')];
    for (let i = 0; i < 26; i++) {
      const p = curve.getPoint(0.05 + (i / 26) * 0.9);
      add(g, new THREE.SphereGeometry(0.09, 8, 6), leaf, [p.x + R(-0.08, 0.08), p.y + R(-0.08, 0.08), R(-0.08, 0.08)], [0, 0, 0], [1.2, 0.8, 1]);
      if (i % 2 === 0) add(g, new THREE.SphereGeometry(0.07, 8, 6), roses[i % 3], [p.x + R(-0.1, 0.1), p.y + R(-0.05, 0.1), R(-0.12, 0.12)]);
    }
    return g;
  },
  'picnic-blanket'() {
    const g = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#f4e6d4';
    x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(217,119,106,0.75)';
    for (let i = 0; i < 4; i++) { x.fillRect(i * 16, 0, 8, 64); x.fillRect(0, i * 16, 64, 8); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    add(g, new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), [0, 0.01, 0], [-Math.PI / 2, 0, 0]);
    add(g, new THREE.CylinderGeometry(0.14, 0.12, 0.14, 12), mat('#a8773f'), [0.4, 0.08, -0.2]);
    add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), mat('#f2f0ea'), [-0.3, 0.05, 0.2]);
    add(g, new THREE.SphereGeometry(0.06, 10, 8), mat('#c9402f', { roughness: 0.45 }), [0.1, 0.06, 0.25]);
    return g;
  },
};

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,240,200,0.6)');
  grad.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createGarden(world, haven) {
  const { scene } = world;
  const placed = new Map();
  const sparkTex = glowTexture();

  // A soft burst of light motes.
  function sparkle(pos, count = 36) {
    const N = count;
    const positions = new Float32Array(N * 3);
    const vel = [];
    for (let i = 0; i < N; i++) {
      positions.set([pos.x, pos.y + 0.3, pos.z], i * 3);
      const a = Math.random() * TAU;
      const s = 0.4 + Math.random() * 1.2;
      vel.push(new V(Math.cos(a) * s, 0.8 + Math.random() * 1.6, Math.sin(a) * s));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const m = new THREE.PointsMaterial({ size: 0.28, map: sparkTex, color: new THREE.Color(1, 0.9, 0.6).multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, m);
    scene.add(pts);
    let last = 0;
    world.tween(1.8, (p) => {
      const dt = (p - last) * 1.8;
      last = p;
      for (let i = 0; i < N; i++) {
        vel[i].y -= 1.2 * dt;
        positions[i * 3] += vel[i].x * dt;
        positions[i * 3 + 1] += vel[i].y * dt;
        positions[i * 3 + 2] += vel[i].z * dt;
      }
      geo.attributes.position.needsUpdate = true;
      m.opacity = 1 - p;
    }, (p) => p).then(() => { scene.remove(pts); geo.dispose(); m.dispose(); });
  }

  function positionOf(id) {
    const s = SLOTS[id];
    return s ? new V(s[0], s[1], s[2]) : null;
  }

  function place(id, animate = false) {
    if (placed.has(id) || !BUILDERS[id]) return;
    const obj = BUILDERS[id]();
    const [x, y, z, ry] = SLOTS[id];
    obj.position.set(x, y, z);
    obj.rotation.y = ry;
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(obj);
    placed.set(id, obj);
    if (animate) {
      // Pop in with a bounce, a wobble and a warm glow, so it's easy to spot.
      obj.scale.setScalar(0.001);
      const light = new THREE.PointLight('#ffd98a', 0, 7, 2);
      light.position.set(x, y + 1.2, z + 0.6);
      scene.add(light);
      world.tween(1.6, (p) => {
        const pop = p < 0.6 ? easeOut(p / 0.6) * 1.15 : 1.15 - 0.15 * ((p - 0.6) / 0.4);
        obj.scale.setScalar(Math.max(0.001, pop));
        obj.rotation.z = Math.sin(p * 26) * 0.07 * (1 - p);
        light.intensity = Math.sin(Math.PI * p) * 9;
      }, (p) => p).then(() => { obj.rotation.z = 0; obj.scale.setScalar(1); scene.remove(light); });
      sparkle(obj.position, 44);
    }
  }

  // A treasure pops up out of the pile by the chest, glints, and settles.
  function popTreasure(color = '#f2b441') {
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.3 })
    );
    const light = new THREE.PointLight('#ffd98a', 0, 6, 2);
    const base = pile.position.clone();
    scene.add(gem, light);
    sparkle(base, 40);
    return world.tween(2.6, (p) => {
      const up = p < 0.35 ? easeOut(p / 0.35) : 1;
      gem.position.set(base.x, base.y + 0.25 + up * 1.0 + Math.sin(p * 9) * 0.04, base.z);
      gem.rotation.y = p * 9;
      gem.scale.setScalar(p > 0.85 ? Math.max(0.001, 1 - (p - 0.85) / 0.15) : 1);
      light.position.copy(gem.position);
      light.intensity = Math.sin(Math.PI * p) * 8;
    }, (p) => p).then(() => { scene.remove(gem, light); });
  }

  // Treasure pile by the old chest.
  const pile = new THREE.Group();
  const chestPos = haven.chest.object.position;
  pile.position.set(chestPos.x + 0.75, 0, chestPos.z + 0.35);
  scene.add(pile);
  const coinMat = mat('#f1c75a', { metalness: 0.65, roughness: 0.3, emissive: '#b8862a', emissiveIntensity: 0.2 });
  function setTreasures(n) {
    pile.clear();
    let s = 11;
    const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n * 3; i++) {
      const a = rr() * TAU, r = rr() * 0.28;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), coinMat);
      c.position.set(Math.cos(a) * r, 0.02 + (i % 3) * 0.022, Math.sin(a) * r);
      c.rotation.set((rr() - 0.5) * 0.3, 0, (rr() - 0.5) * 0.3);
      c.castShadow = true;
      pile.add(c);
    }
  }

  // Gentle life for a few decorations
  world.addUpdater((t) => {
    const lan = placed.get('paper-lanterns');
    if (lan) lan.userData.lanterns.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.3 + i) * 0.08; });
    const chime = placed.get('wind-chime');
    if (chime) chime.userData.chime.rotation.z = Math.sin(t * 1.7) * 0.12;
    const moon = placed.get('moonpetal');
    if (moon) moon.userData.glow.emissiveIntensity = 0.8 + 0.4 * Math.sin(t * 1.2);
    const bath = placed.get('bird-bath');
    if (bath) bath.userData.bird.rotation.y = Math.sin(t * 0.7) > 0.6 ? 0.8 : -0.3;
  });

  return { place, positionOf, sparkle, setTreasures, popTreasure, pilePosition: () => pile.position.clone() };
}
