// Each starter dragon's signature move.
//   Ember  — rears back and breathes a little plume of fire
//   Pebble — makes wildflowers pop up in a ring around it
//   Moon   — floats up on a swirl of starlight
// Hatchlings and others just do a happy hop.
import * as THREE from 'three';
import { easeOut } from './scene.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const ABILITY_LINES = {
  ember: (n) => `${n} puffs out a proud little flame!`,
  pebble: (n) => `${n} makes wildflowers pop up all around her.`,
  moon: (n) => `${n} drifts up on a swirl of starlight.`,
};

export function createAbilities(world) {
  const { scene } = world;
  const tex = glowTexture();

  // A small pool of glowing particles driven by a per-frame callback.
  function particles(count, size, life, spawnFn) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    const ps = Array.from({ length: count }, () => ({ age: Infinity, life: 1, p: new V(), v: new V(), c: new THREE.Color() }));
    let elapsed = 0;
    let next = 0;
    const tick = (t, dt) => {
      elapsed += dt;
      // spawn while within the emitter's lifetime
      if (elapsed < life) {
        const want = Math.floor((elapsed / life) * count);
        while (next < want && next < count) spawnFn(ps[next++], elapsed);
      }
      let alive = false;
      ps.forEach((q, i) => {
        if (q.age < q.life) {
          alive = true;
          q.age += dt;
          q.p.addScaledVector(q.v, dt);
          const k = 1 - q.age / q.life;
          pos.set([q.p.x, q.p.y, q.p.z], i * 3);
          col.set([q.c.r * k, q.c.g * k, q.c.b * k], i * 3);
        } else {
          col.set([0, 0, 0], i * 3);
        }
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      if (!alive && elapsed > life) {
        world.removeUpdater(tick);
        scene.remove(pts);
        geo.dispose();
        mat.dispose();
      }
    };
    world.addUpdater(tick);
  }

  function fire(d) {
    d.react('breathe');
    const light = new THREE.PointLight('#ff9a3c', 0, 6, 2);
    scene.add(light);
    const mouth = new V();
    const fwd = new V();
    // flames start after the wind-up
    setTimeout(() => {
      particles(90, 0.5 * d.root.scale.x + 0.15, 0.9, (q) => {
        d.mouth.getWorldPosition(mouth);
        fwd.set(0, 0.12, 1).applyQuaternion(d.mouth.getWorldQuaternion(new THREE.Quaternion())).normalize();
        q.age = 0;
        q.life = 0.5 + Math.random() * 0.35;
        q.p.copy(mouth);
        q.v.copy(fwd).multiplyScalar(2.6 + Math.random() * 1.6).add(new V((Math.random() - 0.5) * 0.9, (Math.random() - 0.3) * 0.9, (Math.random() - 0.5) * 0.9));
        q.c.setRGB(1.6, 0.5 + Math.random() * 0.7, 0.1);
      });
      world.tween(1.3, (p) => {
        d.mouth.getWorldPosition(light.position);
        light.intensity = Math.sin(Math.PI * Math.min(1, p * 1.2)) * 10;
      }, (p) => p).then(() => scene.remove(light));
    }, 480);
  }

  function bloom(d) {
    d.react('hop');
    const center = d.root.position.clone();
    const colors = ['#f6c7d6', '#f3d46c', '#cdb6ec', '#ffffff', '#f19a78', '#9ec5f0'];
    const group = new THREE.Group();
    group.position.copy(center);
    scene.add(group);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#5e8c3c' });
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.3;
      const r = 1.05 + Math.random() * 0.35;
      const f = new THREE.Group();
      f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const h = 0.28 + Math.random() * 0.2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, h, 4), stemMat);
      stem.position.y = h / 2;
      f.add(stem);
      const pm = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.7 });
      for (let k = 0; k < 5; k++) {
        const pa = (k / 5) * TAU;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), pm);
        petal.scale.set(1, 0.45, 1);
        petal.position.set(Math.cos(pa) * 0.06, h, Math.sin(pa) * 0.06);
        f.add(petal);
      }
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: '#f2c64e' }));
      c.position.y = h + 0.02;
      f.add(c);
      f.scale.setScalar(0.001);
      group.add(f);
      // pop up one after another
      setTimeout(() => world.tween(0.5, (p) => f.scale.setScalar(Math.max(0.001, p * (1 + 0.25 * Math.sin(p * Math.PI)))), easeOut), i * 70);
    }
    particles(40, 0.22, 0.8, (q) => {
      const a = Math.random() * TAU;
      q.age = 0;
      q.life = 0.9 + Math.random() * 0.6;
      q.p.copy(center).add(new V(Math.cos(a) * 1.1, 0.2, Math.sin(a) * 1.1));
      q.v.set(Math.cos(a) * 0.2, 0.7 + Math.random() * 0.6, Math.sin(a) * 0.2);
      q.c.setRGB(1.2, 1.1, 0.6);
    });
    setTimeout(() => {
      world.tween(0.8, (p) => group.scale.setScalar(Math.max(0.001, 1 - p))).then(() => scene.remove(group));
    }, 3600);
  }

  function starlight(d) {
    d.react('float');
    const light = new THREE.PointLight('#c9b8ff', 0, 6, 2);
    scene.add(light);
    const c = new V();
    particles(110, 0.26, 2.2, (q, t) => {
      c.copy(d.root.position);
      const a = t * 5 + Math.random() * 0.6;
      const r = 0.9 + Math.random() * 0.3;
      q.age = 0;
      q.life = 0.9 + Math.random() * 0.7;
      q.p.set(c.x + Math.cos(a) * r, c.y + 0.2 + (t / 2.2) * 1.8 * d.root.scale.x + Math.random() * 0.3, c.z + Math.sin(a) * r);
      q.v.set(-Math.sin(a) * 0.5, 0.35, Math.cos(a) * 0.5);
      Math.random() < 0.5 ? q.c.setRGB(1.1, 1.0, 1.6) : q.c.setRGB(1.5, 1.4, 1.0);
    });
    world.tween(2.6, (p) => {
      light.position.copy(d.root.position).add(new V(0, 1.4, 0.6));
      light.intensity = Math.sin(Math.PI * p) * 7;
    }, (p) => p).then(() => scene.remove(light));
  }

  const MOVES = { ember: fire, pebble: bloom, moon: starlight };

  return {
    // Returns how long the move takes, in ms.
    perform(d) {
      const move = MOVES[d.def.id];
      if (!move) { d.react('celebrate'); return 1500; }
      move(d);
      return { ember: 2000, pebble: 2200, moon: 2800 }[d.def.id];
    },
    has: (d) => !!MOVES[d.def.id],
  };
}
