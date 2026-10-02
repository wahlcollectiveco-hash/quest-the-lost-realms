// Procedural placeholder dragons built from soft primitives.
// Everything the rest of the app touches is on the returned object
// (root, update, react, faceTowards), so a real rigged model can replace
// this file later without changing callers.
import * as THREE from 'three';
import { toon } from './style.js';

const V = THREE.Vector3;
const std = (color, o = {}) => toon(color, o);

function limb(a, b, r, material) {
  const dir = new V().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, dir.length(), 4, 10), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.normalize());
  return m;
}

function wingMembrane() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.35, 0.75, 0.9, 0.95);
  s.quadraticCurveTo(1.35, 1.05, 1.72, 0.82);
  s.quadraticCurveTo(1.38, 0.55, 1.32, 0.25);
  s.quadraticCurveTo(1.08, 0.38, 0.92, 0.04);
  s.quadraticCurveTo(0.68, 0.2, 0.5, -0.14);
  s.quadraticCurveTo(0.25, 0.02, 0, 0);
  return new THREE.ShapeGeometry(s, 10);
}

function buildWing(M) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(wingMembrane(), M.wing));
  const pts = [new V(0, 0, 0), new V(0.35, 0.62, 0.01), new V(0.9, 0.95, 0.01), new V(1.35, 1.02, 0.01), new V(1.72, 0.82, 0)];
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.045, 6), M.accentSoft));
  g.add(limb(new V(0.9, 0.95, 0.01), new V(0.92, 0.1, 0.01), 0.022, M.accentSoft));
  g.add(limb(new V(1.35, 1.02, 0.01), new V(1.32, 0.3, 0.01), 0.02, M.accentSoft));
  return g;
}

function flower(scale = 1) {
  const g = new THREE.Group();
  const petal = std(0xfbe3ec, { roughness: 0.6 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), petal);
    p.scale.set(1, 0.45, 1);
    p.position.set(Math.cos(a) * 0.055, 0, Math.sin(a) * 0.055);
    g.add(p);
  }
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std(0xf2c64e));
  c.position.y = 0.015;
  g.add(c);
  g.scale.setScalar(scale);
  return g;
}

export function createDragon(def) {
  const c = def.colors;
  const b = def.build;
  const M = {
    body: std(c.body),
    belly: std(c.belly, { roughness: 0.85 }),
    accent: std(c.accent, { roughness: 0.4, metalness: 0.15 }),
    accentSoft: std(new THREE.Color(c.accent).lerp(new THREE.Color(c.body), 0.35), { roughness: 0.6 }),
    wing: std(c.wing, { side: THREE.DoubleSide, roughness: 0.9 }),
    eye: std(c.eye, { roughness: 0.12 }),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    dark: std(0x2b2320),
  };

  const root = new THREE.Group();
  root.name = def.id;
  const rig = new THREE.Group(); // hops and wiggles happen on the rig
  root.add(rig);

  // Torso (sitting pose, facing +z)
  const torso = new THREE.Group();
  torso.position.set(0, 0.95, 0);
  rig.add(torso);
  const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), M.body);
  bodyMesh.scale.set(b.round, 1.2, 1.05);
  bodyMesh.rotation.x = -0.18;
  torso.add(bodyMesh);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 20), M.belly);
  belly.scale.set(0.9 * b.round, 1.1, 0.62);
  belly.position.set(0, -0.04, 0.34);
  belly.rotation.x = -0.18;
  torso.add(belly);

  // Back spikes
  for (let i = 0; i < 6; i++) {
    const th = 0.55 + i * 0.3;
    const s = 1 - i * 0.12;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07 * s, 0.2 * s, 8), M.accent);
    spike.position.set(0, 0.95 + 0.72 * Math.cos(th), -0.66 * Math.sin(th));
    spike.rotation.x = -th;
    rig.add(spike);
  }

  // Neck + head
  rig.add(limb(new V(0, 1.35, 0.02), new V(0, 1.92, 0.24), 0.21 * Math.min(1.05, b.round), M.body));
  const head = new THREE.Group();
  head.position.set(0, 1.98, 0.26);
  rig.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24), M.body);
  skull.scale.set(1.04, 0.92, 1);
  skull.position.set(0, 0.1, 0.02);
  head.add(skull);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 20), M.body);
  snout.scale.set(0.95, 0.72, 1.15);
  snout.position.set(0, -0.02, 0.33);
  head.add(snout);
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), M.belly);
  chin.scale.set(0.9, 0.45, 1.1);
  chin.position.set(0, -0.12, 0.3);
  head.add(chin);
  for (const sx of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M.dark);
    n.position.set(0.075 * sx, 0.06, 0.62);
    head.add(n);
  }

  // Things the dragon carries (a flower, say) attach here.
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.12, 0.6);
  head.add(mouth);

  // Eyes (grouped so they can blink)
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(0.19 * sx, 0.18, 0.31);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), M.eye);
    eye.scale.set(0.85, 1.08, 0.6);
    eg.add(eye);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), M.shine);
    hl.position.set(0.025 * sx, 0.045, 0.05);
    eg.add(hl);
    const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.shine);
    hl2.position.set(-0.03 * sx, -0.035, 0.055);
    eg.add(hl2);
    head.add(eg);
    eyes.push(eg);
  }

  // Horns and head details per dragon
  for (const sx of [-1, 1]) {
    if (b.horn === 'nub') {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 10), M.accent);
      h.position.set(0.17 * sx, 0.44, -0.04);
      h.rotation.set(-0.45, 0, -0.2 * sx);
      head.add(h);
    } else if (b.horn === 'swept') {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.55, 10), M.accent);
      h.position.set(0.18 * sx, 0.42, -0.14);
      h.rotation.set(-1.05, 0, -0.25 * sx);
      head.add(h);
    } else {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.52, 10), M.accent);
      h.position.set(0.15 * sx, 0.44, -0.12);
      h.rotation.set(-0.75, 0, -0.12 * sx);
      head.add(h);
    }
    if (b.frill) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 8), M.wing);
      f.scale.set(1, 1, 0.3);
      f.position.set(0.36 * sx, 0.2, -0.08);
      f.rotation.set(-0.3, 0, -1.2 * sx);
      head.add(f);
    }
  }
  if (b.flower) {
    const fl = flower(1.1);
    fl.position.set(-0.12, 0.47, 0.08);
    fl.rotation.set(0.2, 0, 0.25);
    head.add(fl);
  }
  let crystal = null;
  if (b.crystal) {
    crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07, 0),
      std(0xcbbcf5, { emissive: 0xb9a4ff, emissiveIntensity: 1.6, roughness: 0.2 })
    );
    crystal.scale.set(0.7, 1.2, 0.7);
    crystal.position.set(0, 0.4, 0.2);
    head.add(crystal);
  }

  // Legs
  for (const sx of [-1, 1]) {
    rig.add(limb(new V(0.25 * sx, 0.75, 0.36), new V(0.27 * sx, 0.14, 0.44), 0.11, M.body));
    const ff = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), M.body);
    ff.scale.set(1, 0.55, 1.3);
    ff.position.set(0.27 * sx, 0.07, 0.5);
    rig.add(ff);
    const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), M.body);
    haunch.scale.set(0.8, 1, 1.1);
    haunch.position.set(0.44 * b.round * sx, 0.42, -0.06);
    rig.add(haunch);
    const bf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), M.body);
    bf.scale.set(1, 0.5, 1.5);
    bf.position.set(0.52 * b.round * sx, 0.08, 0.26);
    rig.add(bf);
  }

  // Tail: a chain of joints so it can sway
  const tailJoints = [];
  const segs = Math.round(10 * b.tail);
  const segLen = 0.2;
  let parent = rig;
  for (let i = 0; i < segs; i++) {
    const j = new THREE.Group();
    if (i === 0) j.position.set(0, 0.32, -0.55);
    else j.position.set(0, 0, -segLen);
    j.rotation.x = i === 0 ? -0.35 : 0.04;
    parent.add(j);
    const r = 0.2 * (1 - i / (segs + 2)) + 0.03;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), M.body);
    seg.scale.set(1, 0.85, 1.7);
    seg.position.z = -segLen / 2;
    j.add(seg);
    tailJoints.push(j);
    parent = j;
  }
  const tip = new THREE.Mesh(
    b.crystal ? new THREE.OctahedronGeometry(0.1, 0) : new THREE.ConeGeometry(0.12, 0.3, 4),
    b.crystal ? std(0xcbbcf5, { emissive: 0xb9a4ff, emissiveIntensity: 1.4, roughness: 0.2 }) : M.accent
  );
  tip.rotation.x = -Math.PI / 2;
  tip.scale.set(1, 1, 0.45);
  tip.position.z = -segLen - 0.08;
  parent.add(tip);

  // Wings (left side mirrored by negative scale)
  const wings = [];
  for (const sx of [-1, 1]) {
    const side = new THREE.Group();
    side.scale.x = sx;
    const pivot = new THREE.Group();
    pivot.position.set(0.28, 1.42, -0.32);
    pivot.scale.setScalar(b.wing);
    pivot.add(buildWing(M));
    side.add(pivot);
    rig.add(side);
    wings.push(pivot);
  }
  const WING_BASE = { x: 0.35, y: 1.25, z: 0.3 };

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.scale.setScalar(def.scale);

  // ---- Behaviour ----
  // Poses blend smoothly toward their targets; activities set them.
  const pose = { walk: 0, headDown: 0, nibble: 0, sweep: 0, lie: 0, sleep: 0, fly: 0, bank: 0 };
  const poseTarget = { ...pose };
  function setPose(p = {}) {
    for (const k in poseTarget) poseTarget[k] = p[k] ?? 0;
  }

  let blinkIn = 2 + Math.random() * 3;
  let blinkT = -1;
  let action = null; // { kind, t }
  const phase = Math.random() * 10;

  function react(kind = 'hop') {
    action = { kind, t: 0 };
  }

  function update(time, dt) {
    const t = time + phase;
    const k = 1 - Math.exp(-dt * 4);
    for (const key in pose) pose[key] += (poseTarget[key] - pose[key]) * k;
    const { walk, headDown, nibble, sweep, lie, sleep, fly, bank } = pose;

    const breath = Math.sin(t * (1.7 - sleep * 0.9));
    torso.scale.set(1 + 0.012 * breath, (1 + 0.022 * breath) * (1 - 0.12 * lie), 1 + 0.012 * breath);

    let hop = 0;
    let flap = 0;
    let tilt = 0;
    let nod = 0;
    if (action) {
      action.t += dt;
      const a = action.t;
      if (action.kind === 'hop') {
        const p = Math.min(1, a / 0.55);
        hop = Math.sin(Math.PI * p) * 0.4;
        flap = Math.sin(a * 16) * 0.35 * (1 - p);
        if (p >= 1) action = null;
      } else if (action.kind === 'celebrate') {
        const p = Math.min(1, a / 1.5);
        hop = Math.abs(Math.sin(a * Math.PI / 0.62)) * 0.45 * (1 - p * 0.4);
        flap = Math.sin(a * 13) * 0.6 * (1 - p);
        tilt = Math.sin(a * 5) * 0.15;
        if (p >= 1) action = null;
      } else if (action.kind === 'tilt') {
        const p = Math.min(1, a / 1.2);
        tilt = Math.sin(Math.PI * p) * 0.35;
        if (p >= 1) action = null;
      } else if (action.kind === 'breathe') {
        // rear back, then lean forward and blow
        const p = Math.min(1, a / 1.8);
        nod = p < 0.25 ? -0.45 * (p / 0.25) : -0.45 + 0.7 * Math.min(1, (p - 0.25) / 0.15);
        if (p > 0.85) nod *= (1 - p) / 0.15;
        flap = 0.25 * Math.sin(Math.PI * p);
        if (p >= 1) action = null;
      } else if (action.kind === 'float') {
        const p = Math.min(1, a / 2.6);
        hop = Math.sin(Math.PI * p) * 0.7 + Math.sin(a * 3) * 0.04;
        flap = Math.sin(a * 6) * 0.3 * Math.sin(Math.PI * p);
        tilt = Math.sin(a * 1.5) * 0.08;
        if (p >= 1) action = null;
      }
    }
    rig.position.y = hop + Math.abs(Math.sin(t * 9)) * 0.07 * walk - 0.42 * lie;
    rig.rotation.z = Math.sin(t * 9) * 0.035 * walk + bank;
    rig.rotation.x = 0.5 * fly + 0.22 * lie;

    const wander = 1 - Math.min(1, Math.max(headDown, lie, fly * 0.7));
    head.position.y = 1.98 + 0.025 * Math.sin(t * 1.7 - 0.6) - 0.38 * headDown - 0.22 * lie;
    head.position.z = 0.26 + 0.22 * headDown + 0.15 * lie;
    head.rotation.y = (0.28 * Math.sin(t * 0.33) + 0.12 * Math.sin(t * 0.91)) * wander + Math.sin(t * 1.6) * 0.45 * sweep;
    head.rotation.x = 0.04 * Math.sin(t * 1.7 - 0.6) - 0.05 + 0.75 * headDown + 0.5 * lie
      + Math.max(0, Math.sin(t * 7)) * 0.14 * nibble - 0.35 * fly + nod;
    head.rotation.z = tilt;

    tailJoints.forEach((j, i) => {
      j.rotation.y = (0.2 + 0.12 * Math.sin(t * 1.4 - i * 0.45)) * (1 - fly * 0.8) + walk * 0.1 * Math.sin(t * 9 - i * 0.5);
    });

    const flapAll = flap + Math.sin(t * 7) * 0.75 * fly;
    for (const w of wings) {
      w.rotation.set(
        WING_BASE.x * (1 - fly) + 0.1 * fly,
        WING_BASE.y * (1 - fly) + 0.35 * fly,
        WING_BASE.z * (1 - fly) + 0.15 * fly - 0.45 * lie + 0.06 * Math.sin(t * 1.3) * (1 - sleep * 0.7) + flapAll
      );
    }

    if (crystal) crystal.rotation.y += dt * 0.8;

    blinkIn -= dt;
    if (blinkIn <= 0 && blinkT < 0) blinkT = 0;
    let eyeY = 1;
    if (blinkT >= 0) {
      blinkT += dt;
      if (blinkT < 0.14) eyeY = 0.12;
      else { blinkT = -1; blinkIn = 2.5 + Math.random() * 4; }
    }
    if (sleep > 0.5) eyeY = 0.1;
    eyes.forEach((e) => (e.scale.y = eyeY));
  }

  function faceTowards(x, z) {
    root.rotation.y = Math.atan2(x - root.position.x, z - root.position.z);
  }

  return { def, root, mouth, update, react, setPose, faceTowards };
}
