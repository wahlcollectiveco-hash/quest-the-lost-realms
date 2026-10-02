// The three side characters, as soft placeholder models:
// Quill the Dragon Historian, Hazel the woodland fox, and Lune, the moth-like
// wanderer who turns up in strange places.
import * as THREE from 'three';
import { toon } from './style.js';
import { createDragon } from './dragon.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const std = (color, o = {}) => toon(color, o);
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

// ---- Quill, the Dragon Historian ----
export function createHistorian() {
  const d = createDragon({
    id: 'quill',
    name: 'Quill',
    scale: 1.2,
    colors: { body: 0x8e9f94, belly: 0xe6dfcc, accent: 0xc9b27a, wing: 0xa3b3a8, eye: 0x2a2a2a },
    build: { round: 1.2, wing: 0.85, tail: 1.1, horn: 'swept' },
  });
  // Round spectacles, just in front of the eyes (placed relative to the mouth anchor on the head)
  const gold = std(0xc9a44e, { metalness: 0.6, roughness: 0.3 });
  const specs = new THREE.Group();
  specs.position.set(0, 0.3, -0.2);
  for (const sx of [-1, 1]) add(specs, new THREE.TorusGeometry(0.1, 0.014, 6, 20), gold, [0.19 * sx, 0, 0]);
  add(specs, new THREE.CylinderGeometry(0.01, 0.01, 0.18, 4), gold, [0, 0.01, 0], [0, 0, Math.PI / 2]);
  add(specs, new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05 }), [0.19, 0, 0], [0, 0, 0], [2.3, 2.3, 0.3]);
  d.mouth.add(specs);
  // A long white beard-tuft
  add(d.mouth, new THREE.ConeGeometry(0.1, 0.35, 8), std(0xf1ece0), [0, -0.12, -0.02], [Math.PI, 0, 0]);
  // An unrolled scroll at its feet
  const scroll = new THREE.Group();
  scroll.position.set(0.1, 0.03, 0.95);
  add(scroll, new THREE.PlaneGeometry(0.6, 0.45), std(0xf3e6c4, { side: THREE.DoubleSide }), [0, 0.005, 0], [-Math.PI / 2, 0, 0]);
  for (const x of [-0.32, 0.32]) add(scroll, new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), std(0xe0cf9f), [x, 0.03, 0], [Math.PI / 2, 0, 0]);
  d.root.add(scroll);
  return d;
}

// ---- Hazel, the woodland fox ----
export function createFox() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const fur = std(0xc8683a);
  const cream = std(0xf4e8d4);
  const dark = std(0x3a2a22);
  const scarf = std(0x6f9c4c);

  const body = add(rig, new THREE.SphereGeometry(0.34, 20, 16), fur, [0, 0.42, -0.05], [0, 0, 0], [0.9, 1.05, 1.2]);
  add(rig, new THREE.SphereGeometry(0.22, 16, 12), cream, [0, 0.48, 0.2], [0, 0, 0], [0.85, 1.1, 0.6]);
  for (const sx of [-1, 1]) {
    add(rig, new THREE.CapsuleGeometry(0.06, 0.24, 4, 8), fur, [0.14 * sx, 0.16, 0.18]);
    add(rig, new THREE.SphereGeometry(0.07, 10, 8), dark, [0.14 * sx, 0.04, 0.22], [0, 0, 0], [1, 0.6, 1.3]);
    add(rig, new THREE.SphereGeometry(0.14, 12, 10), fur, [0.2 * sx, 0.24, -0.25], [0, 0, 0], [0.8, 1, 1.1]);
  }
  add(rig, new THREE.TorusGeometry(0.2, 0.06, 8, 20), scarf, [0, 0.72, 0.05], [Math.PI / 2 - 0.25, 0, 0]);
  add(rig, new THREE.BoxGeometry(0.12, 0.3, 0.04), scarf, [0.12, 0.58, 0.24], [0.2, 0, 0.25]);

  const head = new THREE.Group();
  head.position.set(0, 0.92, 0.1);
  rig.add(head);
  add(head, new THREE.SphereGeometry(0.24, 20, 16), fur, [0, 0, 0], [0, 0, 0], [1.05, 0.95, 1]);
  add(head, new THREE.ConeGeometry(0.13, 0.3, 12), fur, [0, -0.05, 0.28], [Math.PI / 2, 0, 0], [1, 1, 0.8]);
  add(head, new THREE.SphereGeometry(0.1, 12, 10), cream, [0, -0.1, 0.18], [0, 0, 0], [1.2, 0.7, 1]);
  add(head, new THREE.SphereGeometry(0.04, 8, 6), dark, [0, -0.04, 0.43]);
  const ears = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(0.13 * sx, 0.18, -0.02);
    ear.rotation.z = -0.25 * sx;
    add(ear, new THREE.ConeGeometry(0.09, 0.26, 4), fur, [0, 0.11, 0], [0, Math.PI / 4, 0], [1, 1, 0.5]);
    add(ear, new THREE.ConeGeometry(0.045, 0.1, 4), dark, [0, 0.21, 0.005], [0, Math.PI / 4, 0], [1, 1, 0.5]);
    head.add(ear);
    ears.push(ear);
    add(head, new THREE.SphereGeometry(0.045, 10, 8), dark, [0.1 * sx, 0.04, 0.2], [0, 0, 0], [0.9, 1.1, 0.6]);
    add(head, new THREE.SphereGeometry(0.013, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.1 * sx + 0.012, 0.058, 0.226]);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.42);
  rig.add(tail);
  add(tail, new THREE.SphereGeometry(0.17, 14, 10), fur, [0, 0.05, -0.12], [0, 0, 0], [1, 1, 1.6]);
  add(tail, new THREE.SphereGeometry(0.14, 14, 10), fur, [0, 0.16, -0.36], [0, 0, 0], [1, 1, 1.4]);
  add(tail, new THREE.SphereGeometry(0.1, 12, 10), cream, [0, 0.24, -0.55], [0, 0, 0], [1, 1, 1.3]);

  let hop = -1;
  let spin = -1;
  const ph = Math.random() * 10;
  function update(t, dt) {
    const k = t + ph;
    body.scale.y = 1.05 * (1 + 0.02 * Math.sin(k * 2));
    head.rotation.y = 0.3 * Math.sin(k * 0.4);
    head.rotation.z = Math.sin(k * 0.23) > 0.8 ? 0.25 : 0;
    tail.rotation.y = 0.35 * Math.sin(k * 1.6);
    ears.forEach((e, i) => { e.rotation.x = Math.sin(k * 7 + i) > 0.97 ? -0.4 : 0; });
    if (hop >= 0) {
      hop += dt;
      const p = Math.min(1, hop / 0.5);
      rig.position.y = Math.sin(Math.PI * p) * 0.3;
      if (p >= 1) hop = -1;
    }
    if (spin >= 0) {
      // chasing her own tail: two quick turns with a little bounce
      spin += dt;
      const p = Math.min(1, spin / 1.5);
      const e = p * p * (3 - 2 * p);
      rig.rotation.y = e * TAU * 2;
      rig.position.y = Math.abs(Math.sin(p * Math.PI * 4)) * 0.12;
      if (p >= 1) { spin = -1; rig.rotation.y = 0; rig.position.y = 0; }
    }
  }
  root.scale.setScalar(1.35);
  return { root, update, react(kind) { if (kind === 'spin') spin = 0; else hop = 0; } };
}

// ---- Lune, the moth-like wanderer ----
function wingTexture(front) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(20, 64, 4, 40, 64, 110);
  grad.addColorStop(0, '#fff6ff');
  grad.addColorStop(0.45, front ? '#cdb8f5' : '#b9c8f5');
  grad.addColorStop(1, 'rgba(150,130,220,0.15)');
  g.fillStyle = grad;
  g.beginPath();
  if (front) g.ellipse(64, 64, 62, 42, -0.2, 0, TAU);
  else g.ellipse(60, 64, 46, 38, 0.3, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,245,210,0.95)';
  g.shadowColor = '#fff0c0';
  g.shadowBlur = 10;
  g.beginPath(); g.arc(front ? 78 : 64, 58, front ? 10 : 7, 0, TAU); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createMoth() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const glow = new THREE.MeshStandardMaterial({ color: 0xe8ddff, emissive: 0xb9a4ff, emissiveIntensity: 1.2, roughness: 0.4 });
  add(body, new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), glow, [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(body, new THREE.SphereGeometry(0.04, 10, 8), glow, [0, 0.01, 0.11]);
  for (const sx of [-1, 1]) {
    add(body, new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), glow, [0.03 * sx, 0.07, 0.16], [0.9, 0, -0.35 * sx]);
  }
  const wings = [];
  for (const [front, z, w, h] of [[true, 0.02, 0.34, 0.26], [false, -0.08, 0.24, 0.2]]) {
    const mat = new THREE.MeshStandardMaterial({ map: wingTexture(front), transparent: true, side: THREE.DoubleSide, depthWrite: false, emissive: 0xcbb8ff, emissiveMap: wingTexture(front), emissiveIntensity: 0.9, roughness: 0.5 });
    for (const sx of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(w, h);
      geo.translate(w / 2, 0, 0);
      geo.rotateX(-Math.PI / 2);
      const wing = new THREE.Mesh(geo, mat);
      wing.position.z = z;
      wing.scale.x = sx;
      body.add(wing);
      wings.push({ wing, sx, front });
    }
  }
  const light = new THREE.PointLight(0xcdb8ff, 2.5, 5, 2);
  root.add(light);
  root.scale.setScalar(2.1);

  let fade = 1;
  function update(t) {
    body.position.y = 0.05 * Math.sin(t * 1.8);
    body.rotation.y = 0.4 * Math.sin(t * 0.5);
    const f = 0.25 + 0.7 * Math.abs(Math.sin(t * 5));
    for (const w of wings) w.wing.rotation.z = w.sx * (w.front ? f : f * 0.8);
    light.intensity = (2.2 + 0.5 * Math.sin(t * 2)) * fade;
  }
  return {
    root,
    update,
    setFade(v) {
      fade = v;
      root.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = v; } });
      root.visible = v > 0.01;
    },
  };
}
