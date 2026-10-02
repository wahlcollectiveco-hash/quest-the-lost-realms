// Pebble's flower trail: little flowers sprout in her footsteps as she walks,
// and a ring slowly blooms around her when she settles down. They fade after
// a while, so the meadow never fills up.
import * as THREE from 'three';
import { toon, flowerGeo, flowerCentreGeo } from './style.js';

const TAU = Math.PI * 2;
const COLORS = ['#f9b8d0', '#f7d35c', '#c9b0f0', '#ffffff', '#f79a70', '#8fc4f4', '#f47a8a'];
const POOL = 64;
const TRAIL_LIFE = 26; // seconds a footstep flower lasts
const RING_LIFE = 18; // how long sitting flowers linger after she leaves
const STEP = 0.55; // distance walked between flowers

export function createFlowerTrail(world, { getDragon, getGroundY }) {
  const { scene } = world;
  const head = flowerGeo();
  const centre = flowerCentreGeo();
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.016, 1, 4);
  stemGeo.translate(0, 0.5, 0);
  const stemMat = toon('#4f9a3d');
  const centreMat = toon('#f6c945');

  const flowers = Array.from({ length: POOL }, () => {
    const g = new THREE.Group();
    const h = 0.2 + Math.random() * 0.16;
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.scale.y = h;
    const petals = new THREE.Mesh(head, toon(COLORS[Math.floor(Math.random() * COLORS.length)]));
    petals.position.y = h;
    petals.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * TAU, (Math.random() - 0.5) * 0.4);
    const mid = new THREE.Mesh(centre, centreMat);
    mid.position.y = h;
    petals.castShadow = true;
    g.add(stem, petals, mid);
    g.visible = false;
    scene.add(g);
    return { g, age: 0, life: 0, alive: false, ring: false, size: 1 };
  });
  let next = 0;

  function sprout(x, y, z, life, ring = false) {
    const f = flowers[next];
    next = (next + 1) % POOL;
    f.g.position.set(x, y, z);
    f.g.rotation.y = Math.random() * TAU;
    f.age = 0;
    f.life = life;
    f.alive = true;
    f.ring = ring;
    f.size = 1.05 + Math.random() * 0.5;
    f.g.scale.setScalar(0.001);
    f.g.visible = true;
  }

  const last = new THREE.Vector3(); // where the last footstep flower went
  const prev = new THREE.Vector3(); // where she was a frame ago
  let hasLast = false;
  let still = 0; // seconds she has been sitting in one place
  let ringTimer = 0;
  let ringCount = 0;
  let current = null;

  world.addUpdater((t, dt) => {
    // grow in, hold, then shrink away
    for (const f of flowers) {
      if (!f.alive) continue;
      f.age += dt;
      const grow = Math.min(1, f.age / 0.7);
      const fade = Math.min(1, Math.max(0, (f.life - f.age) / 1.6));
      const pop = grow < 1 ? grow * (1 + 0.3 * Math.sin(grow * Math.PI)) : 1;
      f.g.scale.setScalar(Math.max(0.001, pop * fade * f.size));
      f.g.rotation.z = Math.sin(t * 1.4 + f.g.position.x * 3) * 0.06;
      if (f.age >= f.life) { f.alive = false; f.g.visible = false; }
    }

    const d = getDragon();
    if (d !== current) { current = d; hasLast = false; still = 0; ringCount = 0; }
    if (!d) return;
    const p = d.root.position;
    const groundY = getGroundY();
    if (p.y > groundY + 0.15) { hasLast = false; still = 0; ringCount = 0; return; } // flying: no flowers
    if (!hasLast) { last.copy(p); prev.copy(p); hasLast = true; return; }

    // is she moving right now, or settled?
    const frame = Math.hypot(p.x - prev.x, p.z - prev.z);
    prev.copy(p);
    still = frame > 0.0005 ? 0 : still + dt;

    const moved = Math.hypot(p.x - last.x, p.z - last.z);
    if (moved > STEP) {
      // a flower just behind her, a little to one side
      const dx = (p.x - last.x) / moved, dz = (p.z - last.z) / moved;
      const side = (Math.random() - 0.5) * 0.9;
      sprout(p.x - dx * 0.75 - dz * side, groundY, p.z - dz * 0.75 + dx * side, TRAIL_LIFE);
      last.copy(p);
      ringCount = 0;
      // flowers from the last sitting spot start fading once she walks off
      for (const f of flowers) if (f.alive && f.ring && f.life - f.age > RING_LIFE) f.life = f.age + RING_LIFE;
    }
    if (still > 2.5 && ringCount < 9) {
      ringTimer -= dt;
      if (ringTimer <= 0) {
        ringTimer = 0.9;
        const a = ringCount * 2.4 + Math.random() * 0.4; // spread evenly around her
        const r = 0.95 + Math.random() * 0.45;
        sprout(p.x + Math.cos(a) * r, groundY, p.z + Math.sin(a) * r, 600, true); // stay while she sits
        ringCount++;
      }
    }
  });

  return {
    // Clear everything at once (e.g. when the companion changes).
    clear() { for (const f of flowers) { f.alive = false; f.g.visible = false; } hasLast = false; },
  };
}
