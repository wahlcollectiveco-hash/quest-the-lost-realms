// Dragon Haven: the old sanctuary, a larger floating island across the sky
// from your home. The Ancient Door stands here with the egg's nest and the
// Keeper's chest, beside Quill's ruins, a great waterfall, a stone bridge
// and a few hidden spots.
import * as THREE from 'three';
import { rng, mat, mesh, blobGeo, canvas, tex, drawRune, drawRealm, undersideMat, VALE_CENTER } from './haven.js';
import { ramp, toon, foliageGeo, leafMat, makeGrass, flowerGeo, flowerCentreGeo, makeWater, paintPath, paintClover, paintDapples, steppingStone } from './style.js';
import { easeOut } from './scene.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const RI = 18; // island radius

const rand = rng(29);
const R = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---- Layout (local to the island) ----
const L = {
  arrive: [0, 12.4],
  pool: [-8.4, -8.2],
  poolR: 2.3,
  cliff: [-10.8, -11.2],
  ruins: [4, -9.2],
  hollow: [10.6, -7.6],
  glade: [-11.6, 5.2],
  stones: [],
  // the Ancient Door, the egg's nest and the Keeper's chest
  door: [-2.0, -13.2],
  nest: [-4.4, -8.8],
  chest: [-6.0, -11.4],
};

// Where the Door, nest and chest stand, in world space (used by haven.js).
const W = (x, z) => new V(x, 0, z).add(VALE_CENTER);
export const SANCTUARY = {
  door: W(...L.door),
  nest: W(...L.nest),
  chest: W(...L.chest),
  face: W(0, 12),
};
const streamCurve = new THREE.CatmullRomCurve3([
  new V(-7.8, 0.04, -6.8), new V(-6, 0.04, -4.2), new V(-2.4, 0.04, -1.4), new V(1, 0.04, 0.3),
  new V(4.5, 0.04, 2), new V(8.5, 0.04, 3.8), new V(12.5, 0.04, 5.4), new V(17.2, 0.04, 6.8),
]);
const pathCurve = new THREE.CatmullRomCurve3([
  new V(0, 0, 11), new V(0.4, 0, 7), new V(0.9, 0, 3.2), new V(1.2, 0, -1.6), new V(2.2, 0, -4.4), new V(3.4, 0, -6.2),
]);
const streamPts = streamCurve.getSpacedPoints(50);
const pathPts = pathCurve.getSpacedPoints(40);
const minDist = (pts, x, z) => pts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.z - z)), Infinity);

function isOpen(x, z, pad = 0) {
  if (Math.hypot(x, z) > RI - 0.8) return false;
  const near = (p, r) => Math.hypot(x - p[0], z - p[1]) < r + pad;
  if (near(L.pool, L.poolR + 0.6) || near(L.cliff, 3.4) || near(L.ruins, 4) || near(L.arrive, 2)) return false;
  if (near(L.hollow, 2) || near(L.glade, 2.2) || L.stones.some((s) => near(s, 1))) return false;
  if (near(L.door, 4.4) || near(L.nest, 1.6) || near(L.chest, 1.3)) return false;
  if (minDist(streamPts, x, z) < 1.3 + pad) return false;
  if (minDist(pathPts, x, z) < 0.8 + pad) return false;
  return true;
}

// Where a dragon can stand in the Vale (world coordinates).
export function valeWalkable(wx, wz) {
  const x = wx - VALE_CENTER.x, z = wz - VALE_CENTER.z;
  if (Math.hypot(x, z) > RI - 1.6) return false;
  const near = (p, r) => Math.hypot(x - p[0], z - p[1]) < r;
  if (near(L.pool, L.poolR + 0.5) || near(L.cliff, 3.4) || near(L.hollow, 1.9) || near(L.glade, 1.4)) return false;
  if (L.stones.some((s) => near(s, 0.9))) return false;
  if (near(L.nest, 1.0) || near(L.chest, 0.8)) return false;
  if (Math.abs(x - L.door[0]) < 3.5 && z < L.door[1] + 1.9) return false; // the Door and its steps
  return true;
}

function flowTexture(base = '#62b3c4') {
  const [c, g] = canvas(64, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 50; i++) {
    g.fillStyle = `rgba(255,255,255,${R(0.06, 0.3)})`;
    g.fillRect(R(0, 64), R(0, 256), R(1, 3), R(10, 44));
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function ribbon(curve, width, segs = 80) {
  const pos = [], uv = [], idx = [];
  const len = curve.getLength();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const p = curve.getPointAt(u);
    const tg = curve.getTangentAt(u);
    const n = new V(-tg.z, 0, tg.x).normalize();
    const w = width * (0.85 + 0.15 * Math.sin(u * 11));
    pos.push(p.x + n.x * w / 2, p.y, p.z + n.z * w / 2, p.x - n.x * w / 2, p.y, p.z - n.z * w / 2);
    uv.push(0, u * len * 0.4, 1, u * len * 0.4);
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function runeCanvas(seed, size = 128) {
  const [c, g] = canvas(size, size);
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.strokeStyle = g.fillStyle = '#ffe3a0';
  g.shadowColor = '#ffd98a';
  g.shadowBlur = 14;
  drawRune(g, size / 2, size / 2, size * 0.62, seed);
  return tex(c);
}

export function buildVale(world) {
  const { scene } = world;
  const group = new THREE.Group();
  group.position.copy(VALE_CENTER);
  scene.add(group);
  const updaters = [];
  let meadow = null; // wildflower instances, so their density can change
  const at = (x, z, y = 0) => new V(x, y, z).add(VALE_CENTER);

  // ---- Ground ----
  const [gc, g] = canvas(1024, 1024);
  const toC = (x, z) => [((x / RI) + 1) * 512, ((z / RI) + 1) * 512];
  g.fillStyle = '#74b84e';
  g.fillRect(0, 0, 1024, 1024);
  const blotch = ['#66a845', '#86c658', '#96d262', '#5a9a3f', '#aadb6c', '#7abd52', '#bce27a'];
  for (let i = 0; i < 340; i++) {
    const x = R(0, 1024), y = R(0, 1024), r = R(24, 100);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, pick(blotch) + 'aa');
    grad.addColorStop(1, pick(blotch) + '00');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = pick(blotch) + '66';
    g.beginPath();
    g.ellipse(R(0, 1024), R(0, 1024), R(2, 7), R(5, 14), R(0, Math.PI), 0, TAU);
    g.fill();
  }
  const stroke = (pts, w, color, blur) => {
    g.save(); g.filter = `blur(${blur}px)`; g.strokeStyle = color; g.lineWidth = w; g.lineCap = g.lineJoin = 'round';
    g.beginPath(); pts.forEach((p, i) => { const [cx, cy] = toC(p.x, p.z); i ? g.lineTo(cx, cy) : g.moveTo(cx, cy); }); g.stroke(); g.restore();
  };
  const disc = (x, z, r, color, blur = 6) => {
    const [cx, cy] = toC(x, z);
    g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = color; g.beginPath(); g.arc(cx, cy, (r / RI) * 512, 0, TAU); g.fill(); g.restore();
  };
  paintDapples(g, 1024, rand);
  for (let i = 0; i < 12; i++) paintClover(g, R(60, 964), R(60, 964), R(18, 34), rand);
  paintPath(g, pathPts, toC, 40, rand);
  stroke(streamPts, 70, '#e0cf9c', 6);
  disc(...L.pool, L.poolR + 0.6, '#e6d49e');
  disc(...L.ruins, 3.9, '#cdc2a6', 10);
  disc(...L.door, 3.8, '#cdbf9c', 10);
  disc(...L.arrive, 1.9, '#d8ccb0', 6);
  const ground = mesh(new THREE.CircleGeometry(RI, 110), new THREE.MeshToonMaterial({ map: tex(gc), gradientMap: ramp }), { rot: [-Math.PI / 2, 0, 0], cast: false });
  group.add(ground);
  group.add(mesh(new THREE.CylinderGeometry(RI, RI - 0.5, 1.2, 110, 1, true), mat('#5f9a40'), { pos: [0, -0.6, 0], cast: false }));
  const under = new THREE.CylinderGeometry(0.02, RI - 0.5, 13, 52, 8, true);
  {
    const p = under.attributes.position;
    const v = new V();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = (v.y + 6.5) / 13;
      const n = Math.sin(v.x * 0.7) * Math.cos(v.z * 0.6) * 0.9 + Math.sin(v.y * 1.7 + v.x) * 0.4;
      const s = 1 + n * 0.12 * (1 - Math.abs(k - 0.5) * 1.4);
      if (k < 0.99) p.setXYZ(i, v.x * s, v.y, v.z * s);
    }
    under.computeVertexNormals();
  }
  group.add(mesh(under, undersideMat(under, 6.5), { pos: [0, -7.7, 0], rot: [Math.PI, 0, 0], cast: false }));

  // ---- Water ----
  const flow = flowTexture();
  const waterMat = makeWater(1);
  group.add(mesh(ribbon(streamCurve, 1.4), waterMat, { cast: false }));
  const poolTex = flow.clone();
  poolTex.repeat.set(3, 0.6);
  const pool = mesh(new THREE.CircleGeometry(L.poolR, 40), makeWater(0), { pos: [L.pool[0], 0.05, L.pool[1]], rot: [-Math.PI / 2, 0, 0], cast: false });
  group.add(pool);
  const fallTex = flow.clone();
  fallTex.repeat.set(1, 2.4);
  const fallMat = makeWater(2);
  const edgeFallTex = flow.clone();
  const edgeFallMat = makeWater(2);
  updaters.push((t, dt) => {
    flow.offset.y -= dt * 0.4;
    fallTex.offset.y += dt * 1.0;
    edgeFallTex.offset.y += dt * 0.8;
    poolTex.offset.x += dt * 0.01;
  });

  // Stones around the pool
  const stoneMats = [mat('#b9b2a2'), mat('#a39d8f'), mat('#cfc7b2')];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + R(-0.1, 0.1);
    if (Math.abs(Math.atan2(Math.sin(a - 0.9), Math.cos(a - 0.9))) < 0.35) continue; // where the stream leaves
    const r = L.poolR + R(0.05, 0.3);
    group.add(mesh(blobGeo(R(0.22, 0.42), 0.12, 10, 8), pick(stoneMats), {
      pos: [L.pool[0] + Math.cos(a) * r, 0.1, L.pool[1] + Math.sin(a) * r], rot: [R(0, 3), R(0, 3), 0], scale: [1, 0.6, 1],
    }));
  }

  // Great cliff and waterfall
  const cliff = new THREE.Group();
  cliff.position.set(L.cliff[0], 0, L.cliff[1]);
  const cliffMats = [mat('#a9a08c'), mat('#958d7c'), mat('#bcb39c')];
  for (const [x, y, z, s] of [[0, 1.5, 0, 3], [2.2, 1.2, -1.4, 2.4], [-2, 1.2, 1.2, 2.4], [0.4, 4, -0.8, 2.6], [-1.4, 3.6, 0.6, 2], [1.8, 3.6, 0.2, 1.8], [0.2, 6.2, -1.2, 2], [-1, 7.4, -0.6, 1.4], [1.2, 7.2, -0.8, 1.4]]) {
    cliff.add(mesh(blobGeo(s, 0.14, 16, 12), pick(cliffMats), { pos: [x, y, z], rot: [R(0, 3), R(0, 3), R(0, 3)], scale: [1, 0.92, 1] }));
  }
  for (const [x, y, z, s] of [[0.2, 8.6, -1, 1.2], [-1.6, 5.4, 0.8, 0.9], [2, 5.2, 0.4, 0.8], [-2.4, 2.6, 1.6, 0.8]]) {
    cliff.add(mesh(foliageGeo(s, 0.1), leafMat('#6fb44c'), { pos: [x, y, z], scale: [1.3, 0.5, 1.3] }));
  }
  group.add(cliff);
  const fall = mesh(new THREE.PlaneGeometry(2.2, 8.4, 1, 10), fallMat, { cast: false });
  {
    const p = fall.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.pow((p.getY(i) + 4.2) / 8.4, 2) * -1.2);
    fall.geometry.computeVertexNormals();
  }
  fall.position.set(L.pool[0] - 1.4, 4.2, L.pool[1] - 1.5);
  fall.lookAt(at(L.pool[0] + 2, L.pool[1] + 3, 4.2));
  group.add(fall);
  const mist = [];
  const mistMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 8; i++) {
    const m = mesh(new THREE.SphereGeometry(0.28, 10, 8), mistMat, { pos: [L.pool[0] - 1.2 + R(-0.6, 0.6), 0.15, L.pool[1] - 1.2 + R(-0.5, 0.5)], cast: false });
    group.add(m);
    mist.push({ m, ph: R(0, TAU) });
  }
  updaters.push((t) => { for (const { m, ph } of mist) m.scale.setScalar(0.7 + 0.5 * Math.abs(Math.sin(t * 3 + ph))); });

  // Where the stream spills off the edge of the island
  {
    const end = streamCurve.getPointAt(1);
    const edge = mesh(new THREE.PlaneGeometry(1.2, 9), edgeFallMat, { cast: false });
    edge.position.set(end.x, -4.4, end.z);
    edge.lookAt(at(end.x * 2, end.z * 2, -4.4));
    group.add(edge);
  }

  // Bridge
  {
    const bridge = new THREE.Group();
    const stone = mat('#c4b89c', { flatShading: true });
    bridge.add(mesh(new THREE.TorusGeometry(1.2, 0.24, 8, 20, Math.PI), stone, { pos: [0, -0.4, 0], scale: [1, 0.75, 3.4] }));
    bridge.add(mesh(new THREE.BoxGeometry(2.9, 0.16, 1.4), stone, { pos: [0, 0.42, 0] }));
    for (const sx of [-1, 1]) {
      bridge.add(mesh(new THREE.BoxGeometry(2.8, 0.26, 0.14), stone, { pos: [0, 0.6, 0.64 * sx] }));
      for (const x of [-1.3, 1.3]) bridge.add(mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), stone, { pos: [x, 0.62, 0.64 * sx] }));
    }
    bridge.add(mesh(blobGeo(0.3, 0.1), mat('#6f9c4c'), { pos: [-1.2, 0.72, 0.6], scale: [1.2, 0.5, 1] }));
    const u = 0.43;
    const p = streamCurve.getPointAt(u);
    const tg = streamCurve.getTangentAt(u);
    bridge.position.set(p.x, 0, p.z);
    bridge.rotation.y = Math.atan2(-tg.z, tg.x) + Math.PI / 2;
    group.add(bridge);
  }

  // ---- Path stones ----
  const pathStone = [mat('#d2c4a4'), mat('#c6b894'), mat('#dccfb0')];
  for (let i = 0; i <= 20; i++) {
    const p = pathCurve.getPointAt(i / 20);
    if (minDist(streamPts, p.x, p.z) < 1.1) continue;
    const st = steppingStone(pick(pathStone), rand);
    st.position.set(p.x + R(-0.15, 0.15), 0.01, p.z + R(-0.12, 0.12));
    st.rotation.y = R(0, 3);
    st.scale.set(R(0.38, 0.5), 1, R(0.32, 0.44));
    group.add(st);
  }

  // ---- Arrival waystone circle ----
  const way = new THREE.Group();
  way.position.set(L.arrive[0], 0, L.arrive[1]);
  way.add(mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.14, 24), mat('#c9bea4', { flatShading: true }), { pos: [0, 0.07, 0], cast: false }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    way.add(mesh(new THREE.BoxGeometry(0.28, R(0.6, 1.0), 0.22), mat('#a9a391', { flatShading: true }), { pos: [Math.cos(a) * 1.9, 0.4, Math.sin(a) * 1.9], rot: [0, -a, R(-0.1, 0.1)] }));
  }
  const wayRune = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ map: runeCanvas(40, 256), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  wayRune.rotation.x = -Math.PI / 2;
  wayRune.position.y = 0.16;
  way.add(wayRune);
  group.add(way);
  updaters.push((t) => { wayRune.material.opacity = 0.55 + 0.25 * Math.sin(t * 1.3); wayRune.rotation.z = t * 0.05; });

  // ---- Ruins ----
  const ruins = new THREE.Group();
  ruins.position.set(L.ruins[0], 0, L.ruins[1]);
  const ruinStone = mat('#b9b09a', { flatShading: true });
  const ruinDark = mat('#9e9582', { flatShading: true });
  ruins.add(mesh(new THREE.CylinderGeometry(3.5, 3.6, 0.14, 12), ruinDark, { pos: [0, 0.07, 0], cast: false }));
  for (let i = 0; i < 16; i++) {
    const a = R(0, TAU), r = R(0.4, 3.2);
    ruins.add(mesh(new THREE.BoxGeometry(R(0.5, 0.9), 0.06, R(0.5, 0.9)), ruinStone, { pos: [Math.cos(a) * r, 0.16, Math.sin(a) * r], rot: [0, R(0, 3), 0], cast: false }));
  }
  const heights = [3.2, 1.2, 2.6, 0.6, 3.2, 1.8, 2.3];
  heights.forEach((h, i) => {
    const a = (i / heights.length) * TAU + 0.2;
    const c = new THREE.Group();
    c.position.set(Math.cos(a) * 2.9, 0, Math.sin(a) * 2.9);
    c.add(mesh(new THREE.BoxGeometry(0.75, 0.3, 0.75), ruinDark, { pos: [0, 0.15, 0] }));
    c.add(mesh(new THREE.CylinderGeometry(0.28, 0.3, h, 10), ruinStone, { pos: [0, 0.3 + h / 2, 0], rot: [0, 0, h < 1.5 ? R(-0.08, 0.08) : 0] }));
    if (h >= 3) c.add(mesh(new THREE.BoxGeometry(0.72, 0.24, 0.72), ruinDark, { pos: [0, 0.42 + h, 0] }));
    if (rand() < 0.6) c.add(mesh(blobGeo(0.3, 0.12), mat('#6f9c4c'), { pos: [0.1, 0.3 + h, 0], scale: [1.2, 0.5, 1.2] }));
    ruins.add(c);
  });
  ruins.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.4, 10), ruinStone, { pos: [0.6, 0.3, 1.6], rot: [0, 0.6, Math.PI / 2] }));
  // Broken arch at the back
  const arch = new THREE.Group();
  arch.position.set(0, 0, -2.2);
  for (const sx of [-1, 1]) arch.add(mesh(new THREE.BoxGeometry(0.55, 3, 0.6), ruinStone, { pos: [1.5 * sx, 1.5, 0] }));
  arch.add(mesh(new THREE.TorusGeometry(1.5, 0.28, 6, 16, Math.PI * 0.62), ruinStone, { pos: [0, 3, 0], scale: [1, 1, 1.8] }));
  ruins.add(arch);
  // Mural wall with carvings: the eight symbols of the Door
  const mural = new THREE.Group();
  mural.position.set(0, 0, -3.4);
  mural.add(mesh(new THREE.BoxGeometry(3.4, 2.4, 0.4), ruinDark, { pos: [0, 1.2, 0] }));
  const [mc, mg] = canvas(512, 360);
  mg.fillStyle = '#000';
  mg.fillRect(0, 0, 512, 360);
  mg.strokeStyle = mg.fillStyle = '#ffe3a0';
  mg.shadowColor = '#ffd98a';
  mg.shadowBlur = 10;
  mg.lineWidth = 3;
  mg.beginPath(); mg.arc(256, 200, 110, 0, TAU); mg.stroke();
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU - Math.PI / 2; drawRealm(mg, 256 + Math.cos(a) * 110, 200 + Math.sin(a) * 110, 40, i); }
  // little dragons flying through the ring
  for (const [x, y, s] of [[110, 90, 1], [400, 70, -1], [256, 200, 1]]) {
    mg.beginPath(); mg.moveTo(x - 22 * s, y); mg.quadraticCurveTo(x, y - 18, x + 22 * s, y); mg.quadraticCurveTo(x, y - 4, x - 22 * s, y); mg.fill();
  }
  const muralMat = new THREE.MeshBasicMaterial({ map: tex(mc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 });
  mural.add(mesh(new THREE.PlaneGeometry(3.1, 2.2), muralMat, { pos: [0, 1.2, 0.21], cast: false }));
  ruins.add(mural);
  ruins.lookAt(at(0, 6));
  group.add(ruins);
  updaters.push((t) => { muralMat.opacity = 0.45 + 0.2 * Math.sin(t * 0.8); });

  // ---- Rune stones ----
  const stones = L.stones.map(([x, z], i) => {
    const s = new THREE.Group();
    s.position.set(x, 0, z);
    s.add(mesh(new THREE.CylinderGeometry(0.42, 0.62, 2.5, 5), mat('#a39d8b', { flatShading: true }), { pos: [0, 1.25, 0], rot: [R(-0.05, 0.05), 0.3, R(-0.05, 0.05)] }));
    for (let k = 0; k < 4; k++) s.add(mesh(new THREE.DodecahedronGeometry(R(0.18, 0.3), 0), pick(stoneMats), { pos: [R(-0.8, 0.8), 0.1, R(-0.8, 0.8)] }));
    s.add(mesh(blobGeo(0.28, 0.12), mat('#6f9c4c'), { pos: [0.1, 2.45, 0], scale: [1.4, 0.45, 1.2] }));
    const glyphMat = new THREE.MeshBasicMaterial({ map: runeCanvas(30 + i), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.12 });
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), glyphMat);
    glyph.position.set(0, 1.5, 0.52);
    s.add(glyph);
    const beamMat = new THREE.MeshBasicMaterial({ color: '#ffe6ad', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 14, 16, 1, true), beamMat);
    beam.position.y = 7;
    s.add(beam);
    s.lookAt(at(0, 8));
    group.add(s);
    return { object: s, glyphMat, beamMat, state: 'dormant', ph: i * 1.3 };
  });
  updaters.push((t) => {
    for (const st of stones) {
      const k = st.state === 'awake' ? 0.95 : st.state === 'ready' ? 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2 + st.ph)) : 0.1 + 0.05 * Math.sin(t + st.ph);
      st.glyphMat.opacity = k;
    }
  });

  // ---- Hollow tree ----
  const hollow = new THREE.Group();
  hollow.position.set(L.hollow[0], 0, L.hollow[1]);
  const bark = mat('#6f5139');
  hollow.add(mesh(new THREE.CylinderGeometry(0.95, 1.5, 4.6, 12), bark, { pos: [0, 2.3, 0] }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    hollow.add(mesh(new THREE.CylinderGeometry(0.18, 0.34, 1.6, 6), bark, { pos: [Math.cos(a) * 1.3, 0.3, Math.sin(a) * 1.3], rot: [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2] }));
  }
  const holeMat = mat('#2a1d13', { roughness: 1 });
  const hole = mesh(new THREE.CircleGeometry(0.42, 20), holeMat, { pos: [0, 1.4, 1.36], rot: [-0.18, 0, 0], scale: [1, 1.35, 1], cast: false });
  hollow.add(hole);
  const LEAF = ['#3f8a3c', '#4f9a3d', '#63ad45', '#58a34a', '#7cc04f'];
  const leafMats = LEAF.map((c) => leafMat(c));
  const crownH = new THREE.Group();
  crownH.position.y = 4.6;
  for (let i = 0; i < 8; i++) crownH.add(mesh(foliageGeo(R(1.3, 2), 0.1), pick(leafMats), { pos: [R(-1.6, 1.6), R(0.2, 1.9), R(-1.6, 1.6)] }));
  hollow.add(crownH);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff6d0' }));
  glint.position.set(0.12, 1.3, 1.3);
  hollow.add(glint);
  hollow.lookAt(at(0, 4));
  group.add(hollow);
  updaters.push((t) => { glint.visible = Math.sin(t * 1.7) > 0.7; });

  // ---- Hidden glade behind bushes ----
  const glade = new THREE.Group();
  glade.position.set(L.glade[0], 0, L.glade[1]);
  const glowcapMat = mat('#a9f0e0', { emissive: '#5fe0c8', emissiveIntensity: 1.1 });
  const caps = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = R(0, TAU), r = R(0, 0.9), sc = R(0.7, 1.3);
    const m = new THREE.Group();
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 0.4);
    m.scale.setScalar(sc);
    m.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8), mat('#eef2e6'), { pos: [0, 0.11, 0] }));
    m.add(mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, TAU, 0, Math.PI / 2), glowcapMat, { pos: [0, 0.2, 0], scale: [1, 0.7, 1] }));
    caps.add(m);
  }
  glade.add(caps);
  const bushMats = [leafMat('#4a9440'), leafMat('#58a244'), leafMat('#3f8a3c')];
  const bushL = new THREE.Group();
  const bushR = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    bushL.add(mesh(foliageGeo(R(0.6, 0.85), 0.1, 14, 10), pick(bushMats), { pos: [-0.4 - i * 0.45, 0.5, 0.9 + R(-0.2, 0.2)], scale: [1, 0.9, 1] }));
    bushR.add(mesh(foliageGeo(R(0.6, 0.85), 0.1, 14, 10), pick(bushMats), { pos: [0.4 + i * 0.45, 0.5, 0.9 + R(-0.2, 0.2)], scale: [1, 0.9, 1] }));
  }
  glade.add(bushL, bushR);
  glade.lookAt(at(0, 8));
  group.add(glade);
  updaters.push((t) => { glowcapMat.emissiveIntensity = 0.9 + 0.3 * Math.sin(t * 1.4); });

  // ---- Grotto crystals behind the waterfall (hidden until found) ----
  const crystals = new THREE.Group();
  crystals.position.set(L.pool[0] - 1.9, 0, L.pool[1] + 0.2);
  const crystalMat = mat('#bcd7ff', { emissive: '#8fb8ff', emissiveIntensity: 1.2, roughness: 0.15, metalness: 0.1 });
  for (let i = 0; i < 6; i++) {
    const c = mesh(new THREE.OctahedronGeometry(R(0.18, 0.34), 0), crystalMat, { pos: [R(-0.4, 0.4), 0.3, R(-0.4, 0.4)], rot: [R(-0.3, 0.3), R(0, 3), R(-0.3, 0.3)], scale: [0.6, R(1.4, 2.2), 0.6] });
    crystals.add(c);
  }
  crystals.scale.setScalar(0.001);
  crystals.visible = false;
  group.add(crystals);

  // ---- Forest ----
  const trunkMat = mat('#7b5a3e');
  const birchMat = mat('#e8e2d4');
  const sway = [];
  function roundTree(x, z, s) {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const h = R(1.9, 2.8) * s;
    t.add(mesh(new THREE.CylinderGeometry(0.17 * s, 0.32 * s, h, 7), rand() < 0.2 ? birchMat : trunkMat, { pos: [0, h / 2, 0] }));
    const crown = new THREE.Group();
    crown.position.y = h;
    const base = rand() < 0.08 ? leafMat('#f4b6cf') : pick(leafMats);
    const n = 5 + Math.floor(R(0, 3));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R(-0.4, 0.4);
      const ring = i === 0 ? 0 : R(0.55, 1.0);
      const r = (i === 0 ? R(1.25, 1.5) : R(0.8, 1.15)) * s;
      crown.add(mesh(foliageGeo(r, 0.1, 22, 15), rand() < 0.7 ? base : pick(leafMats), { pos: [Math.cos(a) * ring * s, (i === 0 ? 0.9 : R(0.2, 1.0)) * s, Math.sin(a) * ring * s] }));
    }
    crown.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
    t.add(crown);
    sway.push({ o: crown, ph: R(0, TAU), a: R(0.012, 0.026) });
    group.add(t);
  }
  function pineTree(x, z, s) {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 1.3 * s, 6), trunkMat, { pos: [0, 0.65 * s, 0] }));
    const tiers = ['#2f7a46', '#388650', '#44945a', '#54a465'];
    for (let i = 0; i < 4; i++) t.add(mesh(new THREE.ConeGeometry((1.5 - i * 0.32) * s, 1.8 * s, 10), mat(tiers[i]), { pos: [0, (1.5 + i * 0.95) * s, 0] }));
    group.add(t);
  }
  for (let ring = 0; ring < 2; ring++) {
    const count = ring ? 34 : 26;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + R(-0.06, 0.06) + ring * 0.1;
      const fromFront = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));
      if (fromFront < (ring ? 0.55 : 0.75)) continue;
      const r = ring ? R(15.4, 17.2) : R(12.6, 14.4);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!isOpen(x, z, 0.4) && ring === 0) continue;
      rand() < 0.4 ? pineTree(x, z, R(1, 1.4)) : roundTree(x, z, R(1, 1.35));
    }
  }
  for (const [x, z, s] of [[8, -12.5, 1.1], [-13, -2, 1.2], [13, 1, 1.1], [6.5, 8.8, 0.9], [-7.8, 9.8, 1]]) roundTree(x, z, s);
  updaters.push((t) => { for (const s of sway) { s.o.rotation.z = Math.sin(t * 0.8 + s.ph) * s.a; s.o.rotation.x = Math.cos(t * 0.6 + s.ph) * s.a * 0.7; } });
  for (let i = 0; i < 16; i++) {
    let x, z, tries = 0;
    do { x = R(-15, 15); z = R(-15, 12); tries++; } while (!isOpen(x, z, 0.5) && tries < 30);
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    for (let k = 0; k < 4; k++) b.add(mesh(foliageGeo(R(0.42, 0.7), 0.1, 14, 10), pick(bushMats), { pos: [R(-0.45, 0.45), R(0.3, 0.5), R(-0.35, 0.35)], scale: [1, 0.82, 1] }));
    group.add(b);
  }

  // ---- Grass + wildflowers ----
  {
    const grassOK = (x, z) => {
      if (Math.hypot(x, z) > RI - 0.4) return false;
      const near = (p, r) => Math.hypot(x - p[0], z - p[1]) < r;
      if (near(L.pool, L.poolR + 0.2) || near(L.cliff, 2.9) || near(L.ruins, 3.6) || near(L.arrive, 1.75) || near(L.hollow, 1.5)) return false;
      if (near(L.nest, 0.9) || near(L.chest, 0.7) || (Math.abs(x - L.door[0]) < 3.3 && z < L.door[1] + 1.7)) return false;
      if (minDist(streamPts, x, z) < 0.85) return false;
      const dPath = minDist(pathPts, x, z);
      if (dPath < 0.45 || (dPath < 0.9 && rand() < 0.6)) return false;
      return true;
    };
    const spots = [];
    for (let tries = 0; spots.length < 4200 && tries < 40000; tries++) {
      const x = R(-RI, RI), z = R(-RI, RI);
      if (grassOK(x, z)) spots.push([x, z]);
    }
    group.add(makeGrass(spots, { perTuft: 4, height: 0.42 }));
  }
  {
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.014, 1, 4);
    stemGeo.translate(0, 0.5, 0);
    const N = 1100;
    const heads = new THREE.InstancedMesh(flowerGeo(), toon('#ffffff'), N);
    const centres = new THREE.InstancedMesh(flowerCentreGeo(), toon('#f6c945'), N);
    const stems = new THREE.InstancedMesh(stemGeo, mat('#4f9a3d'), N);
    const palette = ['#f9b8d0', '#f7d35c', '#c9b0f0', '#ffffff', '#f79a70', '#8fc4f4', '#f9b8d0', '#ffffff', '#f47a8a'];
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let n = 0;
    for (let c = 0; c < 60 && n < N; c++) {
      let cx, cz, tries = 0;
      do { cx = R(-14.5, 14.5); cz = R(-14.5, 14.5); tries++; } while (!isOpen(cx, cz, 0.2) && tries < 30);
      const hue = pick(palette), hue2 = pick(palette);
      const count = Math.floor(R(10, 26));
      for (let k = 0; k < count && n < N; k++) {
        const x = cx + R(-1.6, 1.6), z = cz + R(-1.6, 1.6);
        if (!isOpen(x, z)) continue;
        const h = R(0.26, 0.48);
        const sc = R(0.7, 1.15);
        q.setFromEuler(e.set(R(-0.25, 0.25), R(0, TAU), R(-0.25, 0.25)));
        m4.compose(new V(x, h, z), q, new V(sc, sc, sc));
        heads.setMatrixAt(n, m4);
        centres.setMatrixAt(n, m4);
        heads.setColorAt(n, col.set(rand() < 0.75 ? hue : hue2));
        m4.compose(new V(x, 0, z), q.identity(), new V(1, h, 1));
        stems.setMatrixAt(n, m4);
        n++;
      }
    }
    // Shuffle so that showing fewer flowers thins every patch evenly.
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const im of [heads, centres, stems]) {
      const src = im.instanceMatrix.array.slice(0, n * 16);
      order.forEach((from, to) => im.instanceMatrix.array.set(src.subarray(from * 16, from * 16 + 16), to * 16));
      im.instanceMatrix.needsUpdate = true;
    }
    {
      const src = heads.instanceColor.array.slice(0, n * 3);
      order.forEach((from, to) => heads.instanceColor.array.set(src.subarray(from * 3, from * 3 + 3), to * 3));
      heads.instanceColor.needsUpdate = true;
    }
    heads.count = centres.count = stems.count = n;
    meadow = { meshes: [heads, centres, stems], total: n };
    group.add(heads, centres, stems);
  }

  // ---- Butterflies ----
  const bflies = ['#7fb6e8', '#f2b36b', '#e9a9c8', '#f5e28a', '#b9a4ef'].map((c) => {
    const b = new THREE.Group();
    const wm = new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.6, emissive: c, emissiveIntensity: 0.15 });
    const wg = new THREE.PlaneGeometry(0.26, 0.22);
    wg.translate(0.13, 0, 0);
    wg.rotateX(-Math.PI / 2);
    const wings = [1, -1].map((sx) => { const w = new THREE.Mesh(wg, wm); w.scale.x = sx; b.add(w); return w; });
    group.add(b);
    return { b, wings, cx: R(-9, 9), cz: R(-8, 8), ph: R(0, TAU), sp: R(0.25, 0.45), rx: R(2, 4), rz: R(2, 4) };
  });
  const tmp = new V();
  updaters.push((t) => {
    for (const f of bflies) {
      const k = t * f.sp + f.ph;
      const pos = (kk) => tmp.set(f.cx + Math.sin(kk) * f.rx, 1 + 0.5 * Math.sin(kk * 2.3), f.cz + Math.sin(kk * 0.7) * f.rz);
      f.b.position.copy(pos(k));
      f.b.lookAt(pos(k + 0.05).clone().add(VALE_CENTER));
      const flap = 0.25 + Math.abs(Math.sin(t * 13 + f.ph));
      f.wings[0].rotation.z = flap;
      f.wings[1].rotation.z = -flap;
    }
  });

  // ---- Atmosphere: mist rising off the waterfall's pool ----
  {
    const [mc2, mg2] = canvas(128, 128);
    const grad = mg2.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.7)');
    grad.addColorStop(0.55, 'rgba(245,248,255,0.3)');
    grad.addColorStop(1, 'rgba(240,245,255,0)');
    mg2.fillStyle = grad;
    mg2.fillRect(0, 0, 128, 128);
    const mistTex = tex(mc2);
    const mist = Array.from({ length: 12 }, (_, i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, color: '#f4f2ff' }));
      sp.userData = { ph: i / 12, a: R(0, TAU), r: R(0.4, 2.4) };
      group.add(sp);
      return sp;
    });
    updaters.push((t) => {
      for (const sp of mist) {
        const u = sp.userData;
        const p = (t * 0.035 + u.ph) % 1;
        const a = u.a + t * 0.05;
        sp.position.set(L.pool[0] + Math.cos(a) * (u.r + p * 1.8), 0.3 + p * 2.6, L.pool[1] + Math.sin(a) * (u.r + p * 1.4) + p * 1.2);
        sp.scale.setScalar(2.2 + p * 3.4);
        sp.material.opacity = Math.sin(Math.PI * p) * 0.42;
      }
    });
  }

  world.addUpdater((t, dt) => { for (const u of updaters) u(t, dt); });

  // ---- API ----
  const grow = (obj, dur = 1.2) => world.tween(dur, (p) => obj.scale.setScalar(Math.max(0.001, p)), easeOut);
  return {
    group,
    setFlowerDensity(f) { for (const m of meadow.meshes) m.count = Math.round(meadow.total * f); },
    center: VALE_CENTER.clone(),
    arrive: at(L.arrive[0], L.arrive[1]),
    // Where the dragon should stand to look at something
    spot: (name) => ({
      waterfall: at(L.pool[0] + 2.6, L.pool[1] + 2.4),
      hollow: at(L.hollow[0] - 1.6, L.hollow[1] + 2.4),
      glade: at(L.glade[0] + 1.6, L.glade[1] + 1.8),
      mural: at(L.ruins[0] - 0.4, L.ruins[1] + 1.2),
      bridge: at(0.3, 2.2),
    }[name]),
    targets: { waterfall: fall, hollow, glade, mural, pool, stones: stones.map((s) => s.object), crystals },
    world: (name) => ({ waterfall: at(L.pool[0] - 1.2, L.pool[1] - 1.2, 1), hollow: at(L.hollow[0], L.hollow[1], 1.4), glade: at(L.glade[0], L.glade[1]), mural: at(L.ruins[0], L.ruins[1] - 2) }[name]),
    setStone(i, state) { stones[i].state = state; },
    async awakenStone(i) {
      const st = stones[i];
      st.state = 'awake';
      await world.tween(0.6, (p) => { st.beamMat.opacity = p * 0.6; });
      await world.tween(2.2, (p) => { st.beamMat.opacity = 0.6 * (1 - p); }, (p) => p);
    },
    revealCrystals(animate = true) {
      crystals.visible = true;
      if (animate) return grow(crystals, 1.4);
      crystals.scale.setScalar(1);
      return Promise.resolve();
    },
    openGlade(animate = true) {
      const d = animate ? 1.2 : 0.001;
      return world.tween(d, (p) => { bushL.position.x = -1.1 * p; bushR.position.x = 1.1 * p; }, easeOut);
    },
  };
}
