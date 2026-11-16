// Treasure flights: a short, calm mini-game. Your dragon glides a loop
// around wherever you are (a night flight in the Realm of Stars, a deep dive
// in the Realm of Tides…) while glowing things drift by. Tap them to gather
// them. Nothing can go wrong: anything you miss just floats past, and the
// ones right in your dragon's path are gathered for you.
import * as THREE from 'three';
import { $ } from './ui/common.js';
import { sfx } from './audio.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;

function orbTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,1)');
  grad.addColorStop(0.36, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [w, h] of [[5, 116], [116, 5]]) { g.beginPath(); g.ellipse(64, 64, w / 2, h / 2, 0, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createFlight({ world, sparkle }) {
  const tex = orbTexture();
  const hud = $('#flight-hud');
  let run = null;

  world.addUpdater((t, dt) => {
    if (!run) return;
    const r = run;
    r.time += dt;
    const d = r.dragon.root;
    // 1. rise to the loop, 2. glide round it, 3. come back down
    const RISE = 2.6, LAND = 2.6;
    let pos;
    const a = r.a0 + r.dir * Math.max(0, Math.min(r.time - RISE, r.dur)) * r.speed;
    const onLoop = new V(r.center.x + Math.cos(a) * r.radius, r.center.y + r.height + Math.sin(a * 3) * 0.7, r.center.z + Math.sin(a) * r.radius);
    if (r.time < RISE) {
      const p = r.time / RISE, e = p * p * (3 - 2 * p);
      pos = r.start.clone().lerp(onLoop, e);
    } else if (r.time < RISE + r.dur && !r.ending) {
      pos = onLoop;
    } else {
      if (!r.ending) { r.ending = true; r.endAt = r.time; r.endFrom = d.position.clone(); }
      const p = Math.min(1, (r.time - r.endAt) / LAND), e = p * p * (3 - 2 * p);
      pos = r.endFrom.clone().lerp(r.start, e);
      if (p >= 1) return finish();
    }
    const move = pos.clone().sub(d.position);
    d.position.copy(pos);
    if (move.lengthSq() > 1e-6) {
      const want = Math.atan2(move.x, move.z);
      let diff = want - d.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      d.rotation.y += diff * Math.min(1, dt * 4);
    }
    // the camera rides behind and a little above
    const fwd = new V(Math.sin(d.rotation.y), 0, Math.cos(d.rotation.y));
    const back = Math.min(1.9, Math.max(1, 0.95 / world.aspect));
    const camWant = d.position.clone().addScaledVector(fwd, -9 * back).add(new V(0, 3.2 * Math.sqrt(back), 0));
    world.camera.position.lerp(camWant, 1 - Math.exp(-dt * 3));
    world.controls.target.lerp(d.position.clone().addScaledVector(fwd, 6).add(new V(0, 0.4, 0)), 1 - Math.exp(-dt * 3));
    world.camera.lookAt(world.controls.target);

    // the things to gather
    for (const o of r.orbs) {
      if (o.done) continue;
      o.sprite.material.rotation = t * 0.6 + o.ph;
      const pulse = 1 + 0.15 * Math.sin(t * 4 + o.ph);
      if (o.taken) {
        o.k += dt * 2.4;
        o.sprite.position.lerp(d.position.clone().add(new V(0, 1, 0)), Math.min(1, o.k));
        o.sprite.scale.setScalar(Math.max(0.01, r.size * (1 - o.k)));
        if (o.k >= 1) { o.done = true; o.sprite.visible = false; }
        continue;
      }
      o.sprite.position.y = o.y + Math.sin(t * 1.3 + o.ph) * 0.25;
      o.hit.position.copy(o.sprite.position);
      o.sprite.scale.setScalar(r.size * pulse);
      const dist = o.sprite.position.distanceTo(d.position);
      if (dist < 2.2) take(o); // right in your path: gathered for you
      // once it's well behind you, let it fade away
      const behind = a * r.dir > o.a * r.dir + 0.45; // the dragon has flown past it
      if (behind) { o.sprite.material.opacity -= dt * 1.5; if (o.sprite.material.opacity <= 0) { o.done = true; o.sprite.visible = false; world.removeTap(o.hit); } }
    }
  });

  function take(o) {
    if (o.taken || o.done || !run) return;
    o.taken = true;
    o.k = 0;
    world.removeTap(o.hit);
    run.count++;
    sfx.discovery();
    sparkle(o.sprite.position, 10, run.skin.color);
    $('#flight-count').textContent = String(run.count);
  }

  function finish() {
    const r = run;
    run = null;
    for (const o of r.orbs) { world.removeTap(o.hit); world.scene.remove(o.sprite, o.hit); o.sprite.material.dispose(); }
    hud.classList.remove('show');
    r.dragon.setPose({});
    world.holdCamera(false);
    r.resolve(r.count);
  }

  $('#flight-end').addEventListener('click', () => { if (run && !run.ending) run.dur = Math.max(0, run.time - 2.6); });

  return {
    active: () => !!run,
    // skin: { color, noun, hint }. Resolves with how many were gathered.
    play({ dragon, center, radius, height, skin, count = 11, seconds = 34 }) {
      return new Promise((resolve) => {
        const start = dragon.root.position.clone();
        const a0 = Math.atan2(start.z - center.z, start.x - center.x);
        const dir = 1;
        const total = TAU * 1.08;
        const orbs = [];
        for (let i = 0; i < count; i++) {
          const a = a0 + dir * ((i + 1.4) / (count + 1.2)) * total;
          const easy = i % 3 === 0; // these sit right on the path
          const rr = radius + (easy ? 0 : (Math.random() - 0.5) * 7);
          const y = center.y + height + Math.sin(a * 3) * 0.7 + (easy ? 0.6 : (Math.random() - 0.3) * 4);
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: skin.color, transparent: true, depthWrite: false, fog: false }));
          sprite.position.set(center.x + Math.cos(a) * rr, y, center.z + Math.sin(a) * rr);
          const hit = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
          hit.position.copy(sprite.position);
          world.scene.add(sprite, hit);
          const o = { sprite, hit, y, a, ph: Math.random() * 9, taken: false, done: false, k: 0 };
          world.onTap(hit, () => take(o));
          orbs.push(o);
        }
        dragon.setPose({ fly: 1 });
        world.holdCamera(true);
        $('#flight-hint').textContent = skin.hint;
        $('#flight-noun').textContent = skin.noun;
        $('#flight-count').textContent = '0';
        hud.classList.add('show');
        run = { dragon, center, radius, height, skin, orbs, start, a0, dir, speed: total / seconds, dur: seconds, time: 0, count: 0, size: 3.4, ending: false, resolve };
      });
    },
  };
}
