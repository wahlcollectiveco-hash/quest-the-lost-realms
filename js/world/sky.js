// Little floating islands and clouds along the way from the Haven to
// Verdant Vale, so the flight between them has things to glide past.
import * as THREE from 'three';
import { toon, paintCloud } from './style.js';

export function buildSkyRoute(world, from, to) {
  const g = new THREE.Group();
  const rock = toon('#9c8f78');
  const grass = toon('#86b45a');
  const leaf = toon('#5f9a46');
  const trunk = toon('#7a5a36');
  const dir = new THREE.Vector3().subVectors(to, from);
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  // [how far along, how far to the side, height, size]
  const ISLETS = [[0.22, 9, 3.5, 1.6], [0.38, -11, 1, 2.2], [0.55, 7, 6, 1.2], [0.68, -6, -1, 1.8], [0.82, 12, 4, 1.4]];
  for (const [k, off, h, s] of ISLETS) {
    const isle = new THREE.Group();
    isle.position.copy(from).addScaledVector(dir, k).addScaledVector(side, off);
    isle.position.y += h;
    const under = new THREE.Mesh(new THREE.CylinderGeometry(0.05, s, s * 2.2, 9, 1), rock);
    under.position.y = -s * 1.1;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s * 1.04, s, 0.25, 12), grass);
    isle.add(under, top);
    const trees = Math.round(s * 1.5);
    for (let i = 0; i < trees; i++) {
      const a = (i / trees) * Math.PI * 2 + k * 9;
      const r = s * 0.45 * (i % 2 ? 1 : 0.4);
      const t = new THREE.Group();
      t.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 6), trunk);
      tr.position.y = 0.35;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.45 + (i % 3) * 0.12, 10, 8), leaf);
      crown.position.y = 0.95;
      t.add(tr, crown);
      isle.add(t);
    }
    isle.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    g.add(isle);
  }
  // soft clouds to fly through
  const CLOUDS = [[0.15, -4, 5, 9], [0.33, 5, 7, 12], [0.47, -3, 4, 8], [0.6, 6, 8, 11], [0.75, -8, 6, 10], [0.9, 3, 7, 9]];
  CLOUDS.forEach(([k, off, h, w], i) => {
    const m = new THREE.MeshBasicMaterial({ map: paintCloud(i + 2), transparent: true, depthWrite: false, opacity: 0.85, side: THREE.DoubleSide });
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), m);
    c.position.copy(from).addScaledVector(dir, k).addScaledVector(side, off);
    c.position.y += h;
    c.userData.billboard = true;
    g.add(c);
  });
  world.scene.add(g);
  // clouds always turn to face the camera
  world.addUpdater(() => {
    for (const c of g.children) if (c.userData.billboard) c.quaternion.copy(world.camera.quaternion);
  });
  return g;
}
