// The Realm of Stars: the first realm behind the Ancient Door.
// A cozy night island under a huge starry sky: glowing crystal spires,
// star-flowers, a still lake full of reflected stars, and the star-singers
// humming round their nest, where a cold egg waits. Twelve stars in the sky
// have gone dark; every finished Quest relights one, and together they draw
// a dragon.
import * as THREE from 'three';
import { rng, mesh, canvas, tex, undersideMat, drawRealm } from './haven.js';
import { ramp, toon, foliageGeo, leafMat, makeGrass } from './style.js';
import { createDragon } from './dragon.js';
import { createLune } from './npcs.js';
import { easeOut } from './scene.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const RI = 14; // island radius

export const STARS_CENTER = new V(0, -30, -430);

const rand = rng(71);
const R = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---- Layout (local to the island) ----
const L = {
  arrive: [0, 10.4],
  nest: [0, -4.2],
  lake: [5.6, 2.4],
  lakeR: 2.8,
  spires: [[-6.4, -3.6, 1.3], [-4.2, -8.4, 1.0], [6.8, -5.6, 1.15], [-8.6, 3.6, 0.85], [9.2, -1.0, 0.75]],
  lune: [-6.4, -3.6], // perched on the tallest spire
};

// The dragon constellation: 12 stars (x, y on the sky) and the lines between them.
const STAR_POINTS = [
  [12, 9.6], [9.4, 8.4], [6.4, 9.2], [3.0, 8.6], [-0.6, 7.8], [-4.4, 8.4],
  [-8.0, 9.8], [-11.4, 12.2], [4.6, 13.6], [7.8, 15.0], [8.8, 5.0], [0.2, 4.6],
];
const STAR_LINES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [3, 8], [8, 9], [2, 10], [4, 11], [9, 2]];

export function starsWalkable(wx, wz) {
  const x = wx - STARS_CENTER.x, z = wz - STARS_CENTER.z;
  if (Math.hypot(x, z) > RI - 1.6) return false;
  const near = (p, r) => Math.hypot(x - p[0], z - p[1]) < r;
  if (near(L.lake, L.lakeR + 0.4) || near(L.nest, 1.6)) return false;
  if (L.spires.some(([sx, sz]) => near([sx, sz], 1.0))) return false;
  return true;
}

function glowTex(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,240,200,0.5)') {
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, mid);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return tex(c);
}
// A four-point twinkle for the constellation stars.
function twinkleTex() {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,245,1)');
  grad.addColorStop(0.18, 'rgba(255,240,200,0.75)');
  grad.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,250,235,0.9)';
  for (const [w, h] of [[4, 120], [120, 4]]) {
    g.beginPath();
    g.ellipse(64, 64, w / 2, h / 2, 0, 0, TAU);
    g.fill();
  }
  return tex(c);
}

export function buildStars(world) {
  const { scene } = world;
  const group = new THREE.Group();
  group.position.copy(STARS_CENTER);
  scene.add(group);
  const updaters = [];
  const at = (x, z, y = 0) => new V(x, y, z).add(STARS_CENTER);

  // ---- Ground: deep blue-green, sprinkled with glints ----
  const [gc, g] = canvas(1024, 1024);
  const toC = (x, z) => [((x / RI) + 1) * 512, ((z / RI) + 1) * 512];
  g.fillStyle = '#2f5a62';
  g.fillRect(0, 0, 1024, 1024);
  const blotch = ['#2a525c', '#386a6c', '#3f7472', '#285058', '#46807a'];
  for (let i = 0; i < 260; i++) {
    const x = R(0, 1024), y = R(0, 1024), r = R(30, 110);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, pick(blotch) + 'aa');
    grad.addColorStop(1, pick(blotch) + '00');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(220,230,255,${R(0.2, 0.7)})`;
    g.beginPath();
    g.arc(R(0, 1024), R(0, 1024), R(0.8, 2.2), 0, TAU);
    g.fill();
  }
  // a pale path of light from where you arrive to the nest
  g.save();
  g.filter = 'blur(10px)';
  g.strokeStyle = 'rgba(190,200,255,0.45)';
  g.lineWidth = 46;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(...toC(...L.arrive));
  g.quadraticCurveTo(...toC(-1.6, 3), ...toC(...L.nest));
  g.stroke();
  g.restore();
  const groundMat = new THREE.MeshToonMaterial({ map: tex(gc), gradientMap: ramp, emissive: '#1a2a48', emissiveIntensity: 0.6 });
  group.add(mesh(new THREE.CircleGeometry(RI, 96), groundMat, { rot: [-Math.PI / 2, 0, 0], cast: false }));
  group.add(mesh(new THREE.CylinderGeometry(RI, RI - 0.5, 1.1, 96, 1, true), toon('#2c4f58'), { pos: [0, -0.55, 0], cast: false }));
  const under = new THREE.CylinderGeometry(0.02, RI - 0.5, 11, 48, 8, true);
  group.add(mesh(under, undersideMat(under, 5.5), { pos: [0, -6.6, 0], rot: [Math.PI, 0, 0], cast: false }));

  // ---- Night grass ----
  {
    const spots = [];
    for (let tries = 0; spots.length < 2600 && tries < 30000; tries++) {
      const x = R(-RI + 0.5, RI - 0.5), z = R(-RI + 0.5, RI - 0.5);
      if (Math.hypot(x, z) > RI - 0.6) continue;
      if (Math.hypot(x - L.lake[0], z - L.lake[1]) < L.lakeR + 0.3) continue;
      if (Math.hypot(x - L.nest[0], z - L.nest[1]) < 1.6) continue;
      if (Math.hypot(x - L.arrive[0], z - L.arrive[1]) < 1.8) continue;
      spots.push([x, z]);
    }
    group.add(makeGrass(spots, { perTuft: 3, height: 0.4, shades: ['#3f8a86', '#4c9a92', '#367a7a', '#5aa8a0', '#2f6e74'] }));
  }

  // ---- Star-flowers: little lights scattered through the grass ----
  {
    const flowerTex = glowTex('rgba(255,255,255,1)', 'rgba(200,215,255,0.55)');
    const N = 140;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const tints = [[0.8, 0.88, 1.6], [1.5, 1.35, 0.8], [1.2, 1.0, 1.6], [1.4, 1.4, 1.5]];
    const base = [];
    for (let i = 0; i < N; i++) {
      let x, z;
      do { x = R(-RI + 1, RI - 1); z = R(-RI + 1, RI - 1); } while (Math.hypot(x, z) > RI - 1 || Math.hypot(x - L.lake[0], z - L.lake[1]) < L.lakeR + 0.4);
      base.push([x, R(0.15, 0.4), z, R(0, TAU)]);
      col.set(pick(tints), i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.32, map: flowerTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(pts);
    updaters.push((t) => {
      for (let i = 0; i < N; i++) {
        const [x, y, z, ph] = base[i];
        pos.set([x, y + Math.sin(t * 0.8 + ph) * 0.03, z], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
      pts.material.opacity = 0.85 + 0.15 * Math.sin(t * 1.3);
    });
  }

  // ---- The lake: still, dark, full of reflected stars ----
  let lakeObj = null;
  {
    const [lc, lg] = canvas(512, 512);
    const grad = lg.createRadialGradient(256, 256, 40, 256, 256, 256);
    grad.addColorStop(0, '#16224e');
    grad.addColorStop(0.85, '#1e3466');
    grad.addColorStop(1, '#3a5c8a');
    lg.fillStyle = grad;
    lg.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 220; i++) {
      lg.fillStyle = `rgba(230,236,255,${R(0.3, 0.95)})`;
      lg.beginPath();
      lg.arc(R(30, 482), R(30, 482), R(0.6, 2.2), 0, TAU);
      lg.fill();
    }
    lg.fillStyle = 'rgba(255,248,225,0.85)';
    lg.beginPath(); lg.arc(330, 170, 26, 0, TAU); lg.fill(); // the moon's reflection
    const lake = mesh(new THREE.CircleGeometry(L.lakeR, 48), new THREE.MeshBasicMaterial({ map: tex(lc) }), { pos: [L.lake[0], 0.03, L.lake[1]], rot: [-Math.PI / 2, 0, 0], cast: false });
    group.add(lake);
    const shore = mesh(new THREE.RingGeometry(L.lakeR - 0.05, L.lakeR + 0.35, 48), toon('#8fa0b8'), { pos: [L.lake[0], 0.02, L.lake[1]], rot: [-Math.PI / 2, 0, 0], cast: false });
    group.add(shore);
    lakeObj = lake;
  }

  // ---- Silver-blue trees ----
  const leafMats = [leafMat('#4f6fa8'), leafMat('#5d80b8'), leafMat('#6a8cc4')];
  const trunkMat = toon('#4a4058');
  function tree(x, z, s) {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const h = R(1.8, 2.6) * s;
    t.add(mesh(new THREE.CylinderGeometry(0.14 * s, 0.28 * s, h, 7), trunkMat, { pos: [0, h / 2, 0] }));
    const crown = new THREE.Group();
    crown.position.y = h;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + R(-0.4, 0.4);
      const ring = i === 0 ? 0 : R(0.5, 0.9);
      const r = (i === 0 ? R(1.1, 1.35) : R(0.7, 1.0)) * s;
      const puff = mesh(foliageGeo(r, 0.1, 20, 14), pick(leafMats), { pos: [Math.cos(a) * ring * s, (i === 0 ? 0.8 : R(0.2, 0.9)) * s, Math.sin(a) * ring * s] });
      puff.receiveShadow = false;
      crown.add(puff);
    }
    t.add(crown);
    group.add(t);
  }
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + R(-0.08, 0.08);
    const front = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));
    if (front < 0.8) continue; // keep the front open
    const r = R(11, 13);
    tree(Math.cos(a) * r, Math.sin(a) * r, R(0.9, 1.25));
  }

  // ---- Crystal spires, softly pulsing ----
  const crystalMat = new THREE.MeshStandardMaterial({ color: '#cbbcff', emissive: '#9f8cff', emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 });
  const spires = L.spires.map(([x, z, s], i) => {
    const sp = new THREE.Group();
    sp.position.set(x, 0, z);
    for (let k = 0; k < 4; k++) {
      const h = (k === 0 ? 3.4 : R(1.2, 2.2)) * s;
      const c = mesh(new THREE.CylinderGeometry(0, 0.34 * s * (k === 0 ? 1 : 0.6), h, 6), crystalMat, { pos: [k === 0 ? 0 : R(-0.5, 0.5) * s, h / 2, k === 0 ? 0 : R(-0.5, 0.5) * s], rot: [k === 0 ? 0 : R(-0.3, 0.3), R(0, 3), k === 0 ? 0 : R(-0.3, 0.3)] });
      sp.add(c);
    }
    sp.add(mesh(new THREE.CylinderGeometry(0.7 * s, 0.9 * s, 0.25, 7), toon('#5d5a78'), { pos: [0, 0.12, 0] }));
    group.add(sp);
    sp.userData.ph = i * 1.3;
    return sp;
  });
  const crystalLight = new THREE.PointLight('#b9a6ff', 6, 14, 2);
  crystalLight.position.set(-5.2, 2.6, -5.8);
  group.add(crystalLight);
  updaters.push((t) => {
    crystalMat.emissiveIntensity = 0.8 + 0.25 * Math.sin(t * 0.9);
    crystalLight.intensity = 5 + 1.5 * Math.sin(t * 0.9);
  });

  // ---- A background of countless small stars, and the moon ----
  {
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = R(0, TAU), el = R(-0.15, 1.2), d = R(110, 150);
      pos.set([Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const field = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.1, map: glowTex(), color: '#e8ecff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true }));
    group.add(field);
    updaters.push((t) => { field.material.opacity = 0.75 + 0.15 * Math.sin(t * 0.7); });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,250,230,1)', 'rgba(255,240,200,0.45)'), transparent: true, depthWrite: false, fog: false }));
    moon.position.set(34, 40, -90);
    moon.scale.setScalar(26);
    group.add(moon);
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#fff6dc', fog: false }));
    disc.position.copy(moon.position);
    disc.scale.setScalar(7);
    group.add(disc);
  }

  // ---- The dragon constellation ----
  const twTex = twinkleTex();
  const sky = new THREE.Group();
  sky.position.set(0, 1.2, -40);
  group.add(sky);
  const S = 1.05; // across
  const SY = 0.66; // up (kept low enough to sit in view above the trees)
  const starSprites = STAR_POINTS.map(([x, y], i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: twTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, color: '#6a6f8a' }));
    s.position.set(x * S, y * SY, 0);
    s.scale.setScalar(1.6);
    s.userData = { lit: 0, ph: i * 0.7 };
    sky.add(s);
    return s;
  });
  const lines = STAR_LINES.map(([a, b]) => {
    const pa = starSprites[a].position, pb = starSprites[b].position;
    const len = pa.distanceTo(pb);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.09), new THREE.MeshBasicMaterial({ color: '#ffe3a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    l.position.copy(pa).lerp(pb, 0.5);
    l.rotation.z = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    l.userData = { a, b };
    sky.add(l);
    return l;
  });
  let litCount = 0;
  updaters.push((t) => {
    for (const s of starSprites) {
      const k = s.userData.lit;
      s.material.color.setRGB(0.42 + 0.9 * k, 0.43 + 0.82 * k, 0.54 + 0.5 * k);
      s.scale.setScalar((1.4 + 0.9 * k) * (1 + 0.12 * k * Math.sin(t * 2.2 + s.userData.ph)));
    }
    for (const l of lines) {
      const k = Math.min(starSprites[l.userData.a].userData.lit, starSprites[l.userData.b].userData.lit);
      l.material.opacity = 0.9 * k;
    }
  });
  // Light the first n stars; `animateFrom` lights the newer ones one by one.
  function setLit(n, animateFrom = n) {
    litCount = n;
    starSprites.forEach((s, i) => {
      if (i < Math.min(n, animateFrom)) s.userData.lit = 1;
      else if (i >= n) s.userData.lit = 0;
    });
    const fresh = [];
    for (let i = animateFrom; i < n; i++) fresh.push(i);
    return fresh.reduce((p, i, k) => p.then(() => new Promise((res) => setTimeout(res, k ? 700 : 0))).then(() =>
      world.tween(1.2, (q) => { starSprites[i].userData.lit = q; }, easeOut)), Promise.resolve());
  }

  // ---- The star nest, and the cold egg it holds ----
  const nest = new THREE.Group();
  nest.position.set(L.nest[0], 0, L.nest[1]);
  nest.add(mesh(new THREE.TorusGeometry(0.7, 0.24, 10, 26), toon('#5e5a86'), { pos: [0, 0.18, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.8] }));
  nest.add(mesh(new THREE.CircleGeometry(0.72, 24), toon('#8d86c0'), { pos: [0, 0.06, 0], rot: [-Math.PI / 2, 0, 0], cast: false }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    nest.add(mesh(new THREE.OctahedronGeometry(0.12, 0), crystalMat, { pos: [Math.cos(a) * 0.85, 0.3, Math.sin(a) * 0.85], scale: [0.7, 1.4, 0.7] }));
  }
  const [ec, eg] = canvas(512, 256);
  {
    const grad = eg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#f2f8ff');
    grad.addColorStop(1, '#9fc4e6');
    eg.fillStyle = grad;
    eg.fillRect(0, 0, 512, 256);
    eg.strokeStyle = eg.fillStyle = '#4a86b8';
    for (const x of [64, 192, 320, 448]) drawRealm(eg, x, 128, 90, 1); // the Wave
  }
  const eggMat = new THREE.MeshStandardMaterial({ map: tex(ec), roughness: 0.5, emissive: '#7fb8ff', emissiveIntensity: 0.05 });
  const egg = mesh(new THREE.SphereGeometry(0.36, 32, 24), eggMat, { pos: [0, 0.5, 0], scale: [1, 1.3, 1] });
  nest.add(egg);
  const eggGlow = new THREE.PointLight('#9fd0ff', 0, 5, 2);
  eggGlow.position.set(0, 0.9, 0.4);
  nest.add(eggGlow);
  group.add(nest);
  let warmth = 0;
  let shake = 0;
  updaters.push((t) => {
    eggMat.emissiveIntensity = 0.05 + warmth * 0.55 * (0.8 + 0.2 * Math.sin(t * 1.6));
    eggGlow.intensity = warmth * 3 * (0.85 + 0.15 * Math.sin(t * 1.6));
    const wob = warmth >= 1 ? Math.sin(t * 9) * 0.05 * (Math.sin(t * 0.8) > 0.6 ? 1 : 0) : 0;
    egg.rotation.z = wob + (shake > 0 ? Math.sin(t * (18 + shake * 30)) * 0.22 * shake : 0);
  });

  // ---- The star-singers, humming round the nest ----
  const singerDef = (id, body, scale) => ({
    id, name: 'Star-singer', scale,
    colors: { body, belly: 0xdfe6ff, accent: 0xffe6a0, wing: 0x8a9be0, eye: 0x1c1a3a },
    build: { round: 1.05, wing: 1.1, tail: 1.2, horn: 'thin', crystal: true },
  });
  const singers = [
    [singerDef('singer-elder', 0x3e4f9e, 1.25), [-2.4, -6.2]],
    [singerDef('singer-2', 0x4a5fae, 1.0), [2.6, -6.0]],
    [singerDef('singer-3', 0x56589c, 0.9), [0.2, -7.9]],
  ].map(([def, [x, z]], i) => {
    const d = createDragon(def);
    d.root.position.set(x, 0, z);
    group.add(d.root);
    d.faceTowards(L.nest[0] + (i === 2 ? 0 : x * 0.2), L.nest[1] + 2);
    world.addUpdater(d.update);
    d.setPose({ sweep: 0.25 });
    return d;
  });
  // little musical notes drifting up while they hum
  const [nc, ng] = canvas(64, 64);
  ng.font = '700 46px Georgia, serif';
  ng.textAlign = 'center';
  ng.textBaseline = 'middle';
  ng.fillStyle = '#fff3d0';
  ng.shadowColor = '#ffd98a';
  ng.shadowBlur = 8;
  ng.fillText('♪', 32, 34);
  const noteTex = tex(nc);
  const notes = Array.from({ length: 6 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, transparent: true, depthWrite: false, fog: false }));
    s.userData = { ph: i / 6, who: i % 3 };
    group.add(s);
    return s;
  });
  updaters.push((t) => {
    for (const n of notes) {
      const p = (t * 0.12 + n.userData.ph) % 1;
      const sg = singers[n.userData.who].root.position;
      n.position.set(sg.x + Math.sin(p * 6 + n.userData.ph * 9) * 0.4, sg.y + 2.6 + p * 2.2, sg.z + 0.3);
      n.scale.setScalar(0.35 + p * 0.25);
      n.material.opacity = Math.sin(Math.PI * p) * 0.85;
    }
  });

  // ---- Lune, on the tallest crystal spire ----
  const lune = createLune();
  lune.root.position.set(L.lune[0], 4.9, L.lune[1]);
  group.add(lune.root);
  world.addUpdater(lune.update);
  lune.setFade(1);

  world.addUpdater((t, dt) => { for (const u of updaters) u(t, dt); });

  return {
    group,
    center: STARS_CENTER.clone(),
    arrive: at(...L.arrive),
    spot: (name) => ({
      nest: at(L.nest[0] + 1.3, L.nest[1] + 1.6),
      singers: at(-0.6, -3.0),
      lune: at(L.lune[0] + 1.6, L.lune[1] + 1.8),
      lake: at(L.lake[0] - 3.4, L.lake[1] + 0.6),
    }[name]),
    targets: { nest, egg, singers: singers.map((s) => s.root), lune: lune.root, lake: lakeObj, spires },
    eggPosition: () => egg.getWorldPosition(new V()),
    setWarmth(f) { warmth = Math.max(0, Math.min(1, f)); },
    shakeEgg(dur) { return world.tween(dur, (p) => { shake = p; }, (p) => p * p); },
    hideEgg() { shake = 0; egg.visible = false; eggGlow.intensity = 0; },
    showEgg(v = true) { egg.visible = v; },
    setLit,
    litCount: () => litCount,
    skyCentre: () => sky.getWorldPosition(new V()).add(new V(0, 9.5 * SY, 0)),
    hum(on) { singers.forEach((s) => s.setPose(on ? { sweep: 0.25 } : {})); },
    singers,
  };
}
