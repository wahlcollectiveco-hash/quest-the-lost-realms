// Each starter dragon leaves something of themselves where they walk and rest.
//   Pebble — flowers sprout in her footsteps and bloom in a ring where she sits
//   Ember  — little flames and glowing embers flicker in his footprints
//   Moon   — soft cloud puffs and twinkling sparkles drift where she's been
// Everything fades after a while, so the world never fills up.
import * as THREE from 'three';
import { toon, flowerGeo, flowerCentreGeo } from './style.js';

const TAU = Math.PI * 2;
const POOL = 56;
const rnd = (a, b) => a + Math.random() * (b - a);

// A four-point sparkle, for Moon's stars and Ember's sparks.
function sparkleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,0.95)';
  for (const [w, h] of [[30, 3], [3, 30]]) {
    g.beginPath();
    g.ellipse(32, 32, w, h, 0, 0, TAU);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createFlowerTrail(world, { getDragon, getGroundY }) {
  const { scene } = world;
  const sparkTex = sparkleTexture();
  const additive = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, ...opts });
  const sprite = (color, size) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size);
    s.userData.size = size;
    return s;
  };

  // ---- What each dragon leaves behind ----
  const head = flowerGeo();
  const centre = flowerCentreGeo();
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.016, 1, 4);
  stemGeo.translate(0, 0.5, 0);
  const FLOWER_COLORS = ['#f9b8d0', '#f7d35c', '#c9b0f0', '#ffffff', '#f79a70', '#8fc4f4', '#f47a8a'];

  // A teardrop flame: round at the base, curling to a point; golden low down,
  // red-orange at the tip.
  const flameGeo = new THREE.LatheGeometry(
    [[0, 0], [0.085, 0.03], [0.125, 0.11], [0.12, 0.2], [0.085, 0.31], [0.045, 0.41], [0, 0.52]].map(([x, y]) => new THREE.Vector2(x, y)),
    10
  );
  {
    const p = flameGeo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const lo = new THREE.Color('#ffe27a'), mid = new THREE.Color('#ff9a2a'), hi = new THREE.Color('#ff4a1a'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const k = p.getY(i) / 0.52;
      if (k < 0.45) c.copy(lo).lerp(mid, k / 0.45); else c.copy(mid).lerp(hi, (k - 0.45) / 0.55);
      col.set([c.r, c.g, c.b], i * 3);
      p.setX(i, p.getX(i) + 0.035 * k * k); // a slight lean, like a real flame
    }
    flameGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const emberDisc = new THREE.CircleGeometry(0.2, 14);
  emberDisc.rotateX(-Math.PI / 2);
  // solid, storybook flames (additive ones wash out against bright grass)
  const flameMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const emberGlow = additive('#ff5a14', { opacity: 0.6 });

  const puffGeo = new THREE.SphereGeometry(0.13, 10, 8);
  const cloudMat = toon('#f6f2ff', { emissive: '#b9a8f0', emissiveIntensity: 0.35, transparent: true, opacity: 0.92 });

  const STYLES = {
    pebble: {
      step: 0.55, trailLife: 26, ringLife: 18, ringMax: 9, ringEvery: 0.9, ringRadius: [0.95, 1.4], light: null,
      make() {
        const g = new THREE.Group();
        const h = rnd(0.2, 0.36);
        const stem = new THREE.Mesh(stemGeo, toon('#4f9a3d'));
        stem.scale.y = h;
        const petals = new THREE.Mesh(head, toon(FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)]));
        petals.position.y = h;
        petals.rotation.set(rnd(-0.2, 0.2), rnd(0, TAU), rnd(-0.2, 0.2));
        petals.castShadow = true;
        const mid = new THREE.Mesh(centre, toon('#f6c945'));
        mid.position.y = h;
        g.add(stem, petals, mid);
        return g;
      },
      size: () => rnd(1.05, 1.55),
      animate(f, t, k) {
        f.g.scale.setScalar(k);
        f.g.rotation.z = Math.sin(t * 1.4 + f.ph) * 0.06;
      },
    },

    ember: {
      step: 0.5, trailLife: 11, ringLife: 9, ringMax: 8, ringEvery: 0.7, ringRadius: [1.0, 1.35], light: { color: '#ff8a3c', intensity: 3.2 },
      make() {
        const g = new THREE.Group();
        const disc = new THREE.Mesh(emberDisc, emberGlow);
        disc.position.y = 0.03;
        const outer = new THREE.Mesh(flameGeo, flameMat);
        // a second, smaller tongue of flame beside the first
        const inner = new THREE.Mesh(flameGeo, flameMat);
        inner.position.set(0.1, 0, 0.04);
        inner.rotation.y = 2.2;
        const spark = sprite('#ffd27a', 0.2);
        g.add(disc, outer, inner, spark);
        g.userData = { disc, outer, inner, spark };
        return g;
      },
      size: (ring) => (ring ? rnd(1.25, 1.6) : rnd(0.75, 1.15)),
      animate(f, t, k) {
        const { disc, outer, inner, spark } = f.g.userData;
        f.g.scale.setScalar(k);
        // flames lick and flicker; they die down before the embers do
        const flick = 1 + 0.3 * Math.sin(t * 15 + f.ph) + 0.15 * Math.sin(t * 23 + f.ph * 2);
        const flame = f.ring ? 1 : Math.min(1, Math.max(0, (f.life - f.age) / (f.life * 0.6)));
        outer.scale.set(0.9 + 0.12 * Math.sin(t * 11 + f.ph), flick * flame, 0.9 + 0.12 * Math.cos(t * 9 + f.ph));
        const flick2 = 1 + 0.3 * Math.sin(t * 13 + f.ph * 3);
        inner.scale.set(0.6, 0.6 * flick2 * flame, 0.6);
        outer.rotation.y = t * 1.5 + f.ph; // the lean swirls around, so it dances
        disc.scale.setScalar(1 + 0.12 * Math.sin(t * 5 + f.ph));
        // a spark drifts up now and then
        const p = (t * 0.55 + f.ph) % 1;
        spark.position.set(Math.sin(f.ph * 5 + p * 4) * 0.08, 0.2 + p * 0.75, Math.cos(f.ph * 3 + p * 3) * 0.08);
        spark.scale.setScalar(spark.userData.size * (1 - p) * flame);
      },
    },

    moon: {
      step: 0.6, trailLife: 20, ringLife: 14, ringMax: 8, ringEvery: 0.8, ringRadius: [1.0, 1.5], light: { color: '#c9b8ff', intensity: 3 },
      make() {
        const g = new THREE.Group();
        const cloud = new THREE.Group();
        for (const [x, y, z, s] of [[0, 0, 0, 1], [0.13, -0.02, 0.03, 0.75], [-0.12, -0.03, -0.02, 0.8], [0.03, 0.07, -0.03, 0.7]]) {
          const puff = new THREE.Mesh(puffGeo, cloudMat);
          puff.position.set(x, y, z);
          puff.scale.set(s, s * 0.72, s);
          cloud.add(puff);
        }
        const stars = [sprite('#fff3c8', 0.2), sprite('#d9ccff', 0.15), sprite('#ffffff', 0.12)];
        stars.forEach((s, i) => { s.userData.at = [rnd(-0.28, 0.28), 0.22 + i * 0.16 + rnd(0, 0.1), rnd(-0.28, 0.28)]; g.add(s); });
        g.add(cloud);
        g.userData = { cloud, stars };
        return g;
      },
      size: (ring) => (ring ? rnd(1.1, 1.5) : rnd(0.8, 1.2)),
      animate(f, t, k, dt) {
        const { cloud, stars } = f.g.userData;
        f.g.scale.setScalar(k);
        // clouds hover just above the ground and drift a little
        cloud.position.y = 0.16 + 0.05 * Math.sin(t * 1.1 + f.ph);
        cloud.rotation.y = t * 0.2 + f.ph;
        stars.forEach((s, i) => {
          const tw = Math.abs(Math.sin(t * (2.2 + i * 0.7) + f.ph + i * 2.1));
          s.scale.setScalar(s.userData.size * (0.25 + tw));
          const [x, y, z] = s.userData.at;
          s.position.set(x, y + 0.06 * Math.sin(t * 0.9 + f.ph + i), z);
        });
        // the resting ring drifts slowly around her
        if (f.ring) {
          f.ang += dt * 0.16;
          f.g.position.x = f.cx + Math.cos(f.ang) * f.rad;
          f.g.position.z = f.cz + Math.sin(f.ang) * f.rad;
        }
      },
    },
  };

  // ---- Pools: built the first time a dragon needs them ----
  const pools = {};
  function poolFor(id) {
    if (!pools[id]) {
      const style = STYLES[id];
      pools[id] = {
        next: 0,
        items: Array.from({ length: POOL }, () => {
          const g = style.make();
          g.visible = false;
          scene.add(g);
          return { g, style, age: 0, life: 0, alive: false, ring: false, size: 1, ph: rnd(0, TAU), cx: 0, cz: 0, ang: 0, rad: 0 };
        }),
      };
    }
    return pools[id];
  }

  function sprout(id, x, y, z, life, ring, centre) {
    const pool = poolFor(id);
    const f = pool.items[pool.next];
    pool.next = (pool.next + 1) % POOL;
    f.g.position.set(x, y, z);
    f.g.rotation.set(0, rnd(0, TAU), 0);
    f.age = 0;
    f.life = life;
    f.alive = true;
    f.ring = ring;
    f.size = f.style.size(ring);
    if (centre) {
      f.cx = centre.x;
      f.cz = centre.z;
      f.ang = Math.atan2(z - centre.z, x - centre.x);
      f.rad = Math.hypot(x - centre.x, z - centre.z);
    }
    f.g.scale.setScalar(0.001);
    f.g.visible = true;
  }

  // One soft light for the glow of a resting ring (fire or starlight).
  const ringLight = new THREE.PointLight('#ffffff', 0, 6, 2);
  scene.add(ringLight);

  const last = new THREE.Vector3(); // where the last footstep mark went
  const prev = new THREE.Vector3(); // where the dragon was a frame ago
  let hasLast = false;
  let still = 0; // seconds settled in one place
  let ringTimer = 0;
  let ringCount = 0;
  let current = null;

  world.addUpdater((t, dt) => {
    // grow in, hold, then shrink away
    let ringAlive = 0;
    for (const pool of Object.values(pools)) {
      for (const f of pool.items) {
        if (!f.alive) continue;
        f.age += dt;
        const grow = Math.min(1, f.age / 0.7);
        const fade = Math.min(1, Math.max(0, (f.life - f.age) / 1.6));
        const pop = grow < 1 ? grow * (1 + 0.3 * Math.sin(grow * Math.PI)) : 1;
        f.style.animate(f, t, Math.max(0.001, pop * fade * f.size), dt);
        if (f.ring) ringAlive += fade * Math.min(1, grow);
        if (f.age >= f.life) { f.alive = false; f.g.visible = false; }
      }
    }

    const d = getDragon();
    if (d !== current) { current = d; hasLast = false; still = 0; ringCount = 0; }
    const style = d && STYLES[d.def.id];
    // the ring's glow follows the dragon and fades with the ring
    const wantLight = style?.light ? Math.min(1, ringAlive / 4) * style.light.intensity : 0;
    ringLight.intensity += (wantLight - ringLight.intensity) * Math.min(1, dt * 3);
    if (!style) return;
    const p = d.root.position;
    if (style.light) { ringLight.color.set(style.light.color); ringLight.position.set(p.x, p.y + 0.5, p.z + 1.1); }
    const id = d.def.id;
    const groundY = getGroundY();
    if (p.y > groundY + 0.15) { hasLast = false; still = 0; ringCount = 0; return; } // flying: nothing left behind
    if (!hasLast) { last.copy(p); prev.copy(p); hasLast = true; return; }

    // moving right now, or settled?
    const frame = Math.hypot(p.x - prev.x, p.z - prev.z);
    prev.copy(p);
    still = frame > 0.0005 ? 0 : still + dt;

    const moved = Math.hypot(p.x - last.x, p.z - last.z);
    if (moved > style.step) {
      // a mark just behind the dragon, a little to one side
      const dx = (p.x - last.x) / moved, dz = (p.z - last.z) / moved;
      const side = rnd(-0.45, 0.45);
      sprout(id, p.x - dx * 0.75 - dz * side, groundY, p.z - dz * 0.75 + dx * side, style.trailLife, false);
      last.copy(p);
      ringCount = 0;
      // the ring from the last resting spot starts fading once the dragon walks off
      for (const f of pools[id].items) if (f.alive && f.ring && f.life - f.age > style.ringLife) f.life = f.age + style.ringLife;
    }
    if (still > 2.5 && ringCount < style.ringMax) {
      ringTimer -= dt;
      if (ringTimer <= 0) {
        ringTimer = style.ringEvery;
        const a = ringCount * 2.4 + rnd(0, 0.4); // spread evenly around
        const r = rnd(...style.ringRadius);
        sprout(id, p.x + Math.cos(a) * r, groundY, p.z + Math.sin(a) * r, 600, true, p); // stays while the dragon rests
        ringCount++;
      }
    }
  });

  return {
    // Clear everything at once (e.g. when the companion changes).
    clear() {
      for (const pool of Object.values(pools)) for (const f of pool.items) { f.alive = false; f.g.visible = false; }
      hasLast = false;
      ringCount = 0;
    },
  };
}
