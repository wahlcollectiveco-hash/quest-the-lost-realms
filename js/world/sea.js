// The Realm of Tides: the second realm, under the sea.
// A sandy reef in warm blue-green water: swaying kelp, drifting bubbles,
// shafts of light from the surface, little fish, a drowned stone door, and a
// giant clam shut tight. Ten corals have lost their glow; every finished
// Quest wakes one. When the whole reef is glowing, the clam opens.
import * as THREE from 'three';
import { rng, mesh, canvas, tex, drawRealm } from './haven.js';
import { ramp, toon, makeGrass } from './style.js';
import { createDragon } from './dragon.js';
import { easeOut } from './scene.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const RI = 14;

export const SEA_CENTER = new V(160, -70, -760);

const rand = rng(113);
const R = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const L = {
  arrive: [0, 9.6],
  clam: [0, -5.6],
  door: [-7.6, -6.4],
  keeper: [3.4, -2.6],
  corals: [[-3.2, 4.6], [3.8, 5.4], [-6.6, 1.2], [6.8, 1.6], [-4.4, -2.6], [7.4, -4.6], [-9.4, -2.2], [2.2, -9.2], [-2.6, -9.6], [9.6, 5.2]],
};
const CORAL_COLORS = ['#ff8fa8', '#ffb36b', '#c79bff', '#6fe0d0', '#ffd86b'];

export function seaWalkable(wx, wz) {
  const x = wx - SEA_CENTER.x, z = wz - SEA_CENTER.z;
  if (Math.hypot(x, z) > RI - 1.2) return false;
  const near = (p, r) => Math.hypot(x - p[0], z - p[1]) < r;
  if (near(L.clam, 2.2) || near(L.door, 2.0)) return false;
  if (L.corals.some((c) => near(c, 0.9))) return false;
  return true;
}

function softTex(inner, mid) {
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.4, mid);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return tex(c);
}

export function buildSea(world) {
  const { scene } = world;
  const group = new THREE.Group();
  group.position.copy(SEA_CENTER);
  scene.add(group);
  const updaters = [];
  const at = (x, z, y = 0) => new V(x, y, z).add(SEA_CENTER);

  // ---- Sandy seabed with rippling light ----
  const [gc, g] = canvas(1024, 1024);
  g.fillStyle = '#d9c79a';
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 240; i++) {
    const x = R(0, 1024), y = R(0, 1024), r = R(30, 110);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const c = pick(['#e6d6a8', '#cdb888', '#c2b48e', '#eadcb4']);
    grad.addColorStop(0, c + 'aa');
    grad.addColorStop(1, c + '00');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.strokeStyle = 'rgba(255,255,240,0.35)';
  g.lineWidth = 3;
  for (let i = 0; i < 90; i++) { // wavy lines of light on the sand
    const x = R(0, 1024), y = R(0, 1024);
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + 30, y - 16, x + 60, y + 16, x + 90, y);
    g.stroke();
  }
  const sandTex = tex(gc);
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(3, 3);
  group.add(mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshToonMaterial({ map: sandTex, gradientMap: ramp }), { rot: [-Math.PI / 2, 0, 0], cast: false }));

  // ---- Sea grass ----
  {
    const spots = [];
    for (let tries = 0; spots.length < 900 && tries < 20000; tries++) {
      const x = R(-RI, RI), z = R(-RI, RI);
      if (Math.hypot(x, z) > RI || Math.hypot(x - L.clam[0], z - L.clam[1]) < 2.4 || Math.hypot(x - L.arrive[0], z - L.arrive[1]) < 1.6) continue;
      if (rand() < 0.55) continue; // patchy
      spots.push([x, z]);
    }
    group.add(makeGrass(spots, { perTuft: 3, height: 0.55, shades: ['#3fae8c', '#58c49c', '#2f9a84', '#7ad6a8'] }));
  }

  // ---- Kelp, swaying ----
  const kelpMat = toon('#2f8a5e', { side: THREE.DoubleSide });
  const kelp = [];
  for (let i = 0; i < 34; i++) {
    const a = Math.PI / 2 + R(0.9, TAU - 0.9), r = R(10.5, 17); // (the front is kept clear)
    const k = new THREE.Group();
    k.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    const h = R(4, 8);
    let parent = k;
    const segs = [];
    for (let s = 0; s < 5; s++) {
      const j = new THREE.Group();
      j.position.y = s === 0 ? 0 : h / 5;
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.5 - s * 0.06, h / 5), kelpMat);
      leaf.position.y = h / 10;
      j.add(leaf);
      parent.add(j);
      parent = j;
      segs.push(j);
    }
    k.rotation.y = R(0, TAU);
    k.userData = { segs, ph: R(0, 9) };
    group.add(k);
    kelp.push(k);
  }
  updaters.push((t) => {
    for (const k of kelp) k.userData.segs.forEach((j, s) => { j.rotation.z = Math.sin(t * 0.8 + k.userData.ph + s * 0.6) * 0.12; });
  });

  // ---- Rocks ----
  const rockMats = [toon('#6f8a94'), toon('#5d7a86'), toon('#8098a0')];
  for (let i = 0; i < 16; i++) {
    const a = R(0, TAU), r = R(10.5, 15);
    group.add(mesh(new THREE.DodecahedronGeometry(R(0.6, 1.6), 1), pick(rockMats), { pos: [Math.cos(a) * r, R(0.1, 0.5), Math.sin(a) * r], rot: [R(0, 3), R(0, 3), 0], scale: [1, R(0.6, 1), 1] }));
  }

  // ---- The ten corals: grey and sleeping, or awake and glowing ----
  const corals = L.corals.map(([x, z], i) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    const color = new THREE.Color(CORAL_COLORS[i % CORAL_COLORS.length]);
    const m = new THREE.MeshStandardMaterial({ color: '#8f9aa0', emissive: color, emissiveIntensity: 0, roughness: 0.7 });
    const branch = (px, pz, h, lean, depth) => {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 + depth * 0.03, h, 4, 8), m);
      b.position.set(px, h / 2, pz);
      b.rotation.set(lean[0], 0, lean[1]);
      b.castShadow = true;
      c.add(b);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.15 + depth * 0.03, 10, 8), m);
      tip.position.set(px - Math.sin(lean[1]) * h * 0.55, h * 0.98, pz + Math.sin(lean[0]) * h * 0.55);
      c.add(tip);
    };
    for (let k = 0; k < 6; k++) branch(R(-0.3, 0.3), R(-0.3, 0.3), R(0.6, 1.5), [R(-0.5, 0.5), R(-0.5, 0.5)], k % 2);
    const light = new THREE.PointLight(color, 0, 5, 2);
    light.position.y = 1.2;
    c.add(light);
    c.userData = { m, light, color, lit: 0, ph: i };
    group.add(c);
    return c;
  });
  let litCount = 0;
  updaters.push((t) => {
    for (const c of corals) {
      const u = c.userData;
      u.m.color.set('#8f9aa0').lerp(u.color, u.lit * 0.85);
      u.m.emissiveIntensity = u.lit * (0.75 + 0.2 * Math.sin(t * 1.6 + u.ph));
      u.light.intensity = u.lit * 2.2;
    }
  });
  function setLit(n, animateFrom = n) {
    litCount = n;
    corals.forEach((c, i) => {
      if (i < Math.min(n, animateFrom)) c.userData.lit = 1;
      else if (i >= n) c.userData.lit = 0;
    });
    const fresh = [];
    for (let i = animateFrom; i < n; i++) fresh.push(i);
    return fresh.reduce((p, i, k) => p.then(() => new Promise((res) => setTimeout(res, k ? 600 : 0))).then(() =>
      world.tween(1.4, (q) => { corals[i].userData.lit = q; }, easeOut)), Promise.resolve());
  }

  // ---- Bubbles and shafts of light ----
  {
    const N = 90;
    const pos = new Float32Array(N * 3);
    const base = Array.from({ length: N }, () => [R(-15, 15), R(0, 14), R(-15, 15), R(0.4, 1.1)]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, map: softTex('rgba(255,255,255,0.2)', 'rgba(230,255,255,0.9)'), transparent: true, depthWrite: false, opacity: 0.8 }));
    group.add(pts);
    updaters.push((t) => {
      for (let i = 0; i < N; i++) {
        const [x, y, z, sp] = base[i];
        pos.set([x + Math.sin(t + i) * 0.15, (y + t * sp) % 14, z], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
    });
    const [rc, rg] = canvas(64, 256);
    const grad = rg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(220,255,245,0.5)');
    grad.addColorStop(1, 'rgba(220,255,245,0)');
    rg.fillStyle = grad;
    rg.fillRect(12, 0, 40, 256);
    const rayTex = tex(rc);
    const rays = [[-6, -4], [2, -8], [7, 0], [-2, 3], [10, -6], [-10, 2]].map(([x, z], i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: rayTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: 0.25 }));
      s.position.set(x, 8, z);
      s.scale.set(3.4, 18, 1);
      s.userData.ph = i * 1.4;
      group.add(s);
      return s;
    });
    updaters.push((t) => { for (const s of rays) s.material.opacity = 0.2 + 0.1 * Math.sin(t * 0.5 + s.userData.ph); });
  }

  // ---- A little school of fish ----
  {
    const fishMat = [toon('#ffb36b'), toon('#ffe07a'), toon('#ff8fa8')];
    const fish = Array.from({ length: 14 }, (_, i) => {
      const f = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), fishMat[i % 3]);
      body.scale.set(0.6, 0.8, 1.5);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4), fishMat[i % 3]);
      tail.rotation.x = Math.PI / 2;
      tail.position.z = -0.24;
      tail.scale.x = 0.3;
      f.add(body, tail);
      f.userData = { ph: i * 0.45, r: 5 + (i % 4) * 0.7, y: 3 + (i % 5) * 0.5 };
      group.add(f);
      return f;
    });
    updaters.push((t) => {
      for (const f of fish) {
        const a = t * 0.25 + f.userData.ph;
        f.position.set(Math.cos(a) * f.userData.r - 2, f.userData.y + Math.sin(t + f.userData.ph) * 0.3, Math.sin(a) * f.userData.r);
        f.rotation.y = -a;
        f.children[1].rotation.y = Math.sin(t * 9 + f.userData.ph) * 0.5;
      }
    });
  }

  // ---- The drowned door: an old stone arch, half buried ----
  const door = new THREE.Group();
  door.position.set(L.door[0], -0.6, L.door[1]);
  {
    const stone = toon('#5f8490');
    for (const sx of [-1, 1]) door.add(mesh(new THREE.BoxGeometry(0.7, 4.2, 0.8), stone, { pos: [1.7 * sx, 2.1, 0] }));
    door.add(mesh(new THREE.TorusGeometry(1.7, 0.36, 6, 18, Math.PI), stone, { pos: [0, 4.2, 0], scale: [1, 1, 2] }));
    door.add(mesh(new THREE.SphereGeometry(0.5, 10, 8), toon('#3fae8c'), { pos: [-1.6, 4.9, 0.2], scale: [1.3, 0.5, 1.2] }));
    door.rotation.set(0.1, 0.7, -0.14);
  }
  group.add(door);

  // ---- The giant clam, and what it holds ----
  const clam = new THREE.Group();
  clam.position.set(L.clam[0], 0, L.clam[1]);
  const shellMat = toon('#e8dff0', { side: THREE.DoubleSide });
  const shellGeo = new THREE.SphereGeometry(1.7, 24, 12, 0, TAU, 0, Math.PI / 2);
  const lower = mesh(shellGeo, shellMat, { rot: [Math.PI, 0, 0], scale: [1, 0.45, 0.85], pos: [0, 0.75, 0] });
  const lid = new THREE.Group();
  lid.position.set(0, 0.75, -1.4);
  lid.add(mesh(shellGeo, shellMat, { scale: [1, 0.45, 0.85], pos: [0, 0, 1.4] }));
  clam.add(lower, lid);
  // inside: a great pearl, and an egg carved with a leaf
  const pearl = mesh(new THREE.SphereGeometry(0.34, 20, 16), new THREE.MeshStandardMaterial({ color: '#fdf6ff', emissive: '#e6d8ff', emissiveIntensity: 0.8, roughness: 0.2 }), { pos: [-0.6, 0.95, 0.2] });
  const [ec, eg] = canvas(512, 256);
  {
    const grad = eg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#fbfff0');
    grad.addColorStop(1, '#bfe6a8');
    eg.fillStyle = grad;
    eg.fillRect(0, 0, 512, 256);
    eg.strokeStyle = eg.fillStyle = '#4a8a48';
    for (const x of [64, 192, 320, 448]) drawRealm(eg, x, 128, 90, 2); // the Leaf
  }
  const leafEgg = mesh(new THREE.SphereGeometry(0.36, 28, 20), new THREE.MeshStandardMaterial({ map: tex(ec), roughness: 0.5, emissive: '#bfffa0', emissiveIntensity: 0.15 }), { pos: [0.45, 1.15, 0.1], scale: [1, 1.3, 1] });
  clam.add(pearl, leafEgg);
  const clamLight = new THREE.PointLight('#f0e0ff', 0, 7, 2);
  clamLight.position.set(0, 1.6, 0.6);
  clam.add(clamLight);
  group.add(clam);
  let open = 0;
  updaters.push((t) => {
    lid.rotation.x = -open * 1.15 - (open < 0.05 ? Math.max(0, Math.sin(t * 0.7)) * 0.03 : 0);
    pearl.visible = leafEgg.visible = open > 0.02;
    clamLight.intensity = open * 4;
  });

  // ---- Pearl, the reef-keeper ----
  const keeper = createDragon({
    id: 'reef-keeper', name: 'Pearl', scale: 1.15,
    colors: { body: 0x3fb8b0, belly: 0xf6e6d8, accent: 0xff9aa8, wing: 0x7fd8d0, eye: 0x14323a },
    build: { round: 1.1, wing: 0.9, tail: 1.3, horn: 'nub', frill: true },
  });
  keeper.root.position.set(L.keeper[0], 0, L.keeper[1]);
  group.add(keeper.root);
  keeper.faceTowards(L.arrive[0], L.arrive[1] + 4);
  world.addUpdater(keeper.update);

  world.addUpdater((t, dt) => { for (const u of updaters) u(t, dt); });

  return {
    group,
    center: SEA_CENTER.clone(),
    arrive: at(...L.arrive),
    spot: (name) => ({
      clam: at(L.clam[0] - 2.9, L.clam[1] + 1.2),
      keeper: at(L.keeper[0] - 1.6, L.keeper[1] + 1.8),
      door: at(L.door[0] + 2.4, L.door[1] + 2.4),
    }[name]),
    targets: { clam, keeper: keeper.root, door, corals },
    keeper,
    setLit,
    litCount: () => litCount,
    clamPosition: () => clam.getWorldPosition(new V()),
    coralPosition: (i) => corals[Math.max(0, Math.min(corals.length - 1, i))].getWorldPosition(new V()),
    openClam(animate = true) {
      if (!animate) { open = 1; return Promise.resolve(); }
      return world.tween(3.2, (p) => { open = p; }, easeOut);
    },
    hidePearl() { pearl.scale.setScalar(0.001); },
  };
}
