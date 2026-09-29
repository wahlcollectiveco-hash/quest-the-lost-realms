// Baby dragons that have hatched. They potter around the nest, pausing,
// looking about, and hopping when tapped.
import * as THREE from 'three';
import { createDragon } from './dragon.js';
import { hatchlingDef, CHIRPS } from '../data/creatures.js';
import { easeOut } from './scene.js';

const V = THREE.Vector3;

export function createHatchlings(world, haven, { say }) {
  const { scene } = world;
  const nest = haven.anchors.nest;
  const cottage = new V(-5.6, 0, -2.8);
  const babies = new Map();

  // A spot near the nest that's clear of the nest itself and the cottage.
  function wanderSpot() {
    for (let i = 0; i < 20; i++) {
      const p = new V(-3.8 + Math.random() * 2.6, 0, -1.2 + Math.random() * 2.8);
      if (p.distanceTo(nest) > 0.95 && p.distanceTo(cottage) > 2.7) return p;
    }
    return new V(nest.x + 1.2, 0, nest.z + 1.2);
  }

  function spawn(creature, { pop = false } = {}) {
    const d = createDragon(hatchlingDef(creature));
    const start = pop ? new V(nest.x, 0.25, nest.z) : wanderSpot();
    d.root.position.copy(start);
    d.root.rotation.y = Math.random() * Math.PI * 2;
    scene.add(d.root);
    const b = { d, creature, target: null, wait: 2 + Math.random() * 4 };
    babies.set(creature.id, b);
    world.addUpdater(d.update);
    world.onTap(d.root, () => {
      d.react('hop');
      say(`${b.creature.name} ${CHIRPS[Math.floor(Math.random() * CHIRPS.length)]}`, 3000);
    });
    if (pop) {
      const s = d.root.scale.x;
      d.root.scale.setScalar(0.001);
      world.tween(0.9, (p) => d.root.scale.setScalar(Math.max(0.001, s * p)), easeOut).then(() => {
        d.react('celebrate');
        b.target = new V(nest.x + 0.9, 0, nest.z + 0.9);
      });
    }
    return b;
  }

  world.addUpdater((t, dt) => {
    for (const b of babies.values()) {
      const r = b.d.root;
      if (r.position.y > 0) r.position.y = Math.max(0, r.position.y - dt * 0.5);
      if (!b.target) {
        b.wait -= dt;
        if (b.wait <= 0) b.target = wanderSpot();
        continue;
      }
      const to = new V(b.target.x - r.position.x, 0, b.target.z - r.position.z);
      const dist = to.length();
      if (dist < 0.05) {
        b.target = null;
        b.wait = 4 + Math.random() * 8;
        b.d.setPose(Math.random() < 0.3 ? { headDown: 0.8, nibble: 1 } : {});
        continue;
      }
      b.d.setPose({ walk: 1 });
      r.position.addScaledVector(to.normalize(), Math.min(dist, 0.55 * dt));
      const want = Math.atan2(to.x, to.z);
      let diff = want - r.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      r.rotation.y += diff * Math.min(1, dt * 5);
    }
  });

  return {
    spawn,
    rename(id, name) { const b = babies.get(id); if (b) b.creature = { ...b.creature, name }; },
    get(id) { return babies.get(id); },
  };
}
