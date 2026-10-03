// Calm things the dragon does while you focus. Each activity is a small
// async script; stop() cancels it at the next frame.
import * as THREE from 'three';
import { toon } from './style.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const CANCEL = Symbol('cancel');

export const ACTIVITY_LINES = {
  flowers: (n) => `${n} is gathering wildflowers.`,
  eating: (n) => `${n} is munching on sweet red apples.`,
  flying: (n) => `${n} glides in slow circles over the Vale.`,
  nest: (n) => `${n} is tidying the nest around the egg.`,
  exploring: (n) => `${n} is exploring the paths of Verdant Vale.`,
  reading: (n) => `${n} is reading an old book of star maps.`,
  treasure: (n) => `${n} is admiring a tiny treasure box.`,
  napping: (n) => `${n} curls up for a cozy nap.`,
};

// Each dragon leans toward activities that suit its personality.
const WEIGHTS = {
  pebble: { flowers: 3, exploring: 3, nest: 2, eating: 1, napping: 1, reading: 1, treasure: 1, flying: 1 },
  ember: { flying: 3, exploring: 3, treasure: 3, eating: 2, flowers: 1, napping: 1, nest: 1, reading: 0.5 },
  moon: { reading: 3, napping: 3, nest: 2, flying: 2, flowers: 1, exploring: 1, treasure: 1, eating: 1 },
};

export function chooseActivity(dragonId, avoid) {
  const w = Object.entries(WEIGHTS[dragonId] || WEIGHTS.pebble).filter(([k]) => k !== avoid);
  let r = Math.random() * w.reduce((s, [, n]) => s + n, 0);
  for (const [k, n] of w) if ((r -= n) <= 0) return k;
  return w[0][0];
}

const std = (color, o = {}) => toon(color, o);
function shadowed(g) {
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function makeFlower(color) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), std('#5e8c3c')).translateY(-0.12));
  const petal = std(color);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), petal);
    p.scale.set(1, 0.45, 1);
    p.position.set(Math.cos(a) * 0.05, 0.04, Math.sin(a) * 0.05);
    g.add(p);
  }
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), std('#f2c64e')).translateY(0.05));
  return shadowed(g);
}
const FLOWER_COLORS = ['#f6c7d6', '#f3d46c', '#cdb6ec', '#ffffff', '#f19a78'];

function makeBook() {
  const g = new THREE.Group();
  const cover = std('#5a3d6e');
  const page = std('#f6ecd6', { roughness: 0.95 });
  for (const sx of [-1, 1]) {
    const half = new THREE.Group();
    half.rotation.z = sx * 0.18;
    half.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.44), cover).translateX(sx * 0.17));
    half.add(new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.03, 0.4), page).translateX(sx * 0.16).translateY(0.025));
    g.add(half);
  }
  const flip = new THREE.Group();
  flip.position.y = 0.05;
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.38), std('#fbf3e0', { side: THREE.DoubleSide }));
  leaf.rotation.x = -Math.PI / 2;
  leaf.position.x = 0.15;
  flip.add(leaf);
  g.add(flip);
  g.userData.flip = flip;
  return shadowed(g);
}

function makeBasket() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.22, 16, 1, true), std('#a8773f', { side: THREE.DoubleSide })).translateY(0.11));
  g.add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), std('#8a6238')).rotateX(-Math.PI / 2).translateZ(0.01));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 6, 20, Math.PI), std('#8a6238'));
  handle.position.y = 0.2;
  g.add(handle);
  const apples = [];
  const red = std('#c9402f', { roughness: 0.45 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const ap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), red);
    ap.position.set(Math.cos(a) * 0.1, 0.22 + (i % 2) * 0.04, Math.sin(a) * 0.1);
    g.add(ap);
    apples.push(ap);
  }
  g.userData.apples = apples;
  return shadowed(g);
}

function makeTreasureBox() {
  const g = new THREE.Group();
  const wood = std('#7a4a2c');
  const gold = std('#e0b04e', { metalness: 0.6, roughness: 0.3 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.34), wood).translateY(0.13));
  const coinMat = std('#f4cf6a', { metalness: 0.7, roughness: 0.25, emissive: '#ffbf40', emissiveIntensity: 0 });
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 12), coinMat);
    c.position.set((Math.random() - 0.5) * 0.3, 0.25, (Math.random() - 0.5) * 0.18);
    c.rotation.set(Math.random() * 0.5, 0, Math.random() * 0.5);
    g.add(c);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), std('#9fd3ff', { emissive: '#7fc4ff', emissiveIntensity: 0.4, roughness: 0.1 }));
  gem.position.set(0.05, 0.28, 0);
  g.add(gem);
  const lid = new THREE.Group();
  lid.position.set(0, 0.26, -0.17);
  lid.add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.36), wood).translateZ(0.17));
  lid.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.37), gold).translateZ(0.17));
  g.add(lid);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.27, 0.35), gold).translateY(0.13));
  g.userData = { lid, coinMat };
  return shadowed(g);
}

function makeZzz() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = 'italic 700 48px Georgia, serif';
  g.fillStyle = '#fdf6e4';
  g.strokeStyle = 'rgba(60,70,110,0.5)';
  g.lineWidth = 4;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.strokeText('z', 32, 34);
  g.fillText('z', 32, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  const sprites = [0, 1, 2].map((i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.userData.ph = i / 3;
    group.add(s);
    return s;
  });
  group.userData.sprites = sprites;
  return group;
}

// ---- Props for the little scenes dragons act out when tapped ----
function makeButterfly() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const wingMat = std('#f6a9cc', { side: THREE.DoubleSide });
  const wings = [-1, 1].map((sx) => {
    const geo = new THREE.CircleGeometry(0.09, 12);
    geo.scale(1, 1.25, 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0.085, 0, 0);
    const w = new THREE.Mesh(geo, wingMat);
    w.scale.x = sx;
    body.add(w);
    return w;
  });
  body.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.09, 3, 6), std('#4a3528')).rotateX(Math.PI / 2));
  g.userData = { body, wings };
  g.scale.setScalar(1.5);
  return g;
}

function makeBloom(color, r = 0.05) {
  const g = new THREE.Group();
  const petal = std(color);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const p = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), petal);
    p.scale.set(1, 0.45, 1);
    p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.add(p);
  }
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.6, 8, 6), std('#f2c64e')).translateY(r * 0.3));
  return g;
}

// A ring of little flowers that sits on a dragon's head.
export function makeCrown() {
  const g = new THREE.Group();
  const colors = ['#f6c7d6', '#f3d46c', '#cdb6ec', '#ffffff', '#f19a78', '#a9d6f7'];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const b = makeBloom(colors[i % colors.length], 0.045);
    b.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
    b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    g.add(b);
  }
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.016, 5, 28), std('#5e8c3c')).rotateX(Math.PI / 2));
  g.position.set(0, 0.36, 0);
  g.rotation.x = -0.12;
  return shadowed(g);
}

function makeBeetle() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), std('#2f9e8f', { emissive: '#1f7f72', emissiveIntensity: 0.5, roughness: 0.2 }));
  shell.scale.set(1, 0.65, 1.3);
  g.add(shell);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), std('#2b2320')).translateZ(0.07));
  return g;
}

function makeCampfire() {
  const g = new THREE.Group();
  const log = std('#7a4a2c');
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 6), log);
    l.rotation.set(Math.PI / 2 - 0.5, (i / 4) * TAU, 0, 'YXZ');
    l.position.set(Math.sin((i / 4) * TAU) * 0.1, 0.12, Math.cos((i / 4) * TAU) * 0.1);
    g.add(l);
  }
  const stone = std('#9a968c');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const st = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), stone);
    st.scale.y = 0.6;
    st.position.set(Math.cos(a) * 0.36, 0.03, Math.sin(a) * 0.36);
    g.add(st);
  }
  shadowed(g);
  const flames = new THREE.Group();
  flames.position.y = 0.14;
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 9), new THREE.MeshBasicMaterial({ color: '#ff7a1a' }));
  outer.position.y = 0.25;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 9), new THREE.MeshBasicMaterial({ color: '#ffd45a' }));
  inner.position.y = 0.18;
  flames.add(outer, inner);
  g.add(flames);
  const light = new THREE.PointLight('#ff9a3c', 0, 7, 2);
  light.position.y = 0.6;
  g.add(light);
  g.userData = { flames, outer, inner, light, level: 0, target: 0, until: 0 };
  return g;
}

// Pillows that pile up into a nest around a sleepy dragon.
function makeBed() {
  const g = new THREE.Group();
  const colors = ['#b7a6e8', '#f3e6c8', '#9fb9ec', '#e7b9d6', '#f3e6c8', '#b7a6e8'];
  const cushions = colors.map((c, i) => {
    const a = (i / colors.length) * TAU + 0.4;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), std(c, { roughness: 0.95 }));
    m.position.set(Math.cos(a) * 0.82, 0.1, Math.sin(a) * 0.82);
    m.rotation.y = -a;
    m.userData.size = [1.15, 0.42, 0.8];
    m.scale.setScalar(0.001);
    g.add(m);
    return m;
  });
  g.userData.cushions = cushions;
  return shadowed(g);
}

export function createActivityDirector(world, haven) {
  const { scene } = world;
  const A = haven.anchors;
  const home = A.home;
  const nest = A.nest;

  // Places the dragon likes to go
  const meadow = [new V(-4.4, 0, 5.6), new V(3.6, 0, 6.6), new V(-6.4, 0, 2.4), new V(2.2, 0, 3.6), new V(-2.6, 0, 8.2)];
  const trail = [new V(2.4, 0, 0.8), new V(4.8, 0, -3.2), new V(5.0, 0, -5.8), new V(0.2, 0, -5.8), new V(-2.4, 0, -6.0), new V(-5.2, 0, 4.0), new V(3.2, 0, 8.4)];

  // Props
  const props = new THREE.Group();
  scene.add(props);
  const book = makeBook();
  const basket = makeBasket();
  const box = makeTreasureBox();
  const zzz = makeZzz();
  const bouquet = new THREE.Group();
  bouquet.position.set(home.x + 1.0, 0.12, home.z + 0.4);
  const butterfly = makeButterfly();
  const sniff = makeFlower('#f3d46c');
  sniff.scale.setScalar(1.7);
  const beetle = makeBeetle();
  const camp = makeCampfire();
  camp.visible = false;
  const bed = makeBed();
  const snack = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), std('#d2453a'));
  snack.castShadow = true;
  props.add(book, basket, box, zzz, bouquet, butterfly, sniff, camp, bed, snack);
  const hideProps = () => { book.visible = basket.visible = box.visible = zzz.visible = butterfly.visible = sniff.visible = bed.visible = snack.visible = false; };
  // The butterfly drifts toward wherever it's headed (or rides on a nose).
  const fly = { target: new V(), onNose: false };
  let crown = null; // { obj, until }
  let now = 0;
  hideProps();
  let carried = null;

  let dragon = null;
  let token = null;
  let groundY = 0; // 0 in the Haven; the Vale sits a little lower
  const drivers = new Set();
  let boxOpen = 0;
  let boxTarget = 0;
  let flipT = -1;

  // What the camera should watch: the dragon, or the whole sky while it flies.
  const focusPoint = new THREE.Object3D();
  scene.add(focusPoint);
  const skyCenter = new V(0, 2.2, -1);

  world.addUpdater((t, dt) => {
    if (dragon) {
      const airborne = Math.max(0, Math.min(1, (dragon.root.position.y - groundY) / 2));
      focusPoint.position.copy(dragon.root.position).lerp(skyCenter, airborne);
    }
    for (const d of drivers) {
      if (d.tk.cancelled) { drivers.delete(d); d.rej(CANCEL); continue; }
      if (d.fn(dt)) { drivers.delete(d); d.res(); }
    }
    now = t;
    if (butterfly.visible) {
      if (fly.onNose && dragon) dragon.mouth.getWorldPosition(fly.target).add(tmp.set(0, 0.2 * dragon.root.scale.x, 0));
      butterfly.position.lerp(fly.target, 1 - Math.exp(-dt * (fly.onNose ? 5 : 1.9)));
      const u = butterfly.userData;
      u.body.position.y = fly.onNose ? 0 : Math.sin(t * 6) * 0.07;
      const flap = fly.onNose ? 0.35 + 0.3 * Math.sin(t * 3) : 0.15 + 0.95 * Math.abs(Math.sin(t * 13));
      u.wings[0].rotation.z = -flap;
      u.wings[1].rotation.z = flap;
      u.body.rotation.y = t * 0.6;
    }
    if (camp.visible) {
      const u = camp.userData;
      if (t > u.until) u.target = 0;
      u.level += (u.target - u.level) * (1 - Math.exp(-dt * 2.2));
      const f = 0.85 + 0.15 * Math.sin(t * 17) + 0.08 * Math.sin(t * 29);
      u.flames.visible = u.level > 0.02;
      u.outer.scale.set(u.level * (1.05 - 0.1 * f), u.level * f, u.level * (1.05 - 0.1 * f));
      u.inner.scale.set(u.level, u.level * (0.8 + 0.3 * Math.sin(t * 23)), u.level);
      u.light.intensity = u.level * 5 * f;
      if (u.target === 0 && u.level < 0.02 && t > u.until + 6) camp.visible = false;
    }
    if (crown && t > crown.until) {
      const c = crown;
      crown = null;
      world.tween(0.8, (p) => c.obj.scale.setScalar(Math.max(0.001, 1 - p))).then(() => c.obj.parent?.remove(c.obj));
    }
    // Prop animation
    boxOpen += (boxTarget - boxOpen) * (1 - Math.exp(-dt * 3));
    box.userData.lid.rotation.x = -1.2 * boxOpen;
    box.userData.coinMat.emissiveIntensity = 0.9 * boxOpen * (0.8 + 0.2 * Math.sin(t * 3));
    if (flipT >= 0) {
      flipT += dt;
      const p = Math.min(1, flipT / 0.9);
      book.userData.flip.rotation.z = Math.PI * p;
      if (p >= 1) { flipT = -1; book.userData.flip.rotation.z = 0; }
    }
    if (zzz.visible && dragon) {
      const s = dragon.root.scale.x;
      zzz.position.copy(dragon.root.position).add(new V(0.1, 1.5 * s, 0.3));
      for (const sp of zzz.userData.sprites) {
        const p = (t * 0.25 + sp.userData.ph) % 1;
        sp.position.set(Math.sin(p * 5) * 0.15 + p * 0.3, p * 1.1, 0);
        sp.scale.setScalar(0.18 + p * 0.22);
        sp.material.opacity = Math.sin(p * Math.PI) * 0.9;
      }
    }
  });

  // ---- Motion primitives ----
  const drive = (tk, fn) => new Promise((res, rej) => drivers.add({ tk, fn, res, rej }));
  const sleep = (tk, s) => { let e = 0; return drive(tk, (dt) => (e += dt) >= s); };
  const tmp = new V();

  function turnStep(x, z, dt, rate = 5) {
    const p = dragon.root.position;
    if (Math.hypot(x - p.x, z - p.z) < 0.01) return 0;
    const want = Math.atan2(x - p.x, z - p.z);
    let diff = want - dragon.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    dragon.root.rotation.y += diff * Math.min(1, dt * rate);
    return Math.abs(diff);
  }
  const turnTo = (tk, x, z) => drive(tk, (dt) => turnStep(x, z, dt) < 0.05);
  function moveTo(tk, x, z, { speed = 1.3, y = null } = {}) {
    return drive(tk, (dt) => {
      const p = dragon.root.position;
      tmp.set(x - p.x, (y ?? p.y) - p.y, z - p.z);
      const d = tmp.length();
      if (d < 0.04) return true;
      p.addScaledVector(tmp.normalize(), Math.min(d, speed * dt));
      turnStep(x, z, dt);
      return false;
    });
  }
  async function walk(tk, target) {
    dragon.setPose({ walk: 1 });
    await moveTo(tk, target.x, target.z);
    dragon.setPose({});
  }
  const faceCamera = (tk) => turnTo(tk, world.camera.position.x, world.camera.position.z);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const between = (a, b) => a + Math.random() * (b - a);
  // A spot a little way in front of the dragon.
  const front = (d) => {
    const ry = dragon.root.rotation.y;
    const s = dragon.root.scale.x;
    return new V(dragon.root.position.x + Math.sin(ry) * d * s, groundY, dragon.root.position.z + Math.cos(ry) * d * s);
  };
  // Somewhere nearby that a dragon can stand.
  function near(ctx, c, rMin, rMax) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      const r = between(rMin, rMax);
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      if (!ctx.walkable || ctx.walkable(x, z)) return new V(x, groundY, z);
    }
    return c.clone();
  }

  // Put the dragon back on the ground wherever it is.
  async function settle(tk) {
    if (dragon.root.position.y > groundY + 0.01) {
      dragon.setPose({ fly: 1 });
      await moveTo(tk, dragon.root.position.x, dragon.root.position.z, { y: groundY, speed: 1.6 });
    }
    dragon.setPose({});
  }

  // ---- Activities ----
  const ACT = {
    async napping(tk) {
      await walk(tk, new V(home.x - 0.4, 0, home.z - 0.2));
      await faceCamera(tk);
      dragon.setPose({ lie: 1, sleep: 1 });
      zzz.visible = true;
      for (;;) {
        await sleep(tk, between(25, 45));
        zzz.visible = false;
        dragon.setPose({ lie: 0.6 }); // a sleepy stretch
        await sleep(tk, 2.5);
        dragon.setPose({ lie: 1, sleep: 1 });
        zzz.visible = true;
      }
    },

    async flying(tk) {
      const c = new V(0, 0, -1);
      for (;;) {
        dragon.setPose({ fly: 1 });
        const p = dragon.root.position;
        await moveTo(tk, p.x, p.z, { y: 1.6, speed: 1.2 });
        const r = 6.5;
        let a = Math.atan2(p.z - c.z, p.x - c.x);
        await moveTo(tk, c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, { y: 5, speed: 2.4 });
        const laps = 1 + Math.floor(Math.random() * 2);
        const end = a + TAU * laps;
        dragon.setPose({ fly: 1, bank: -0.25 });
        await drive(tk, (dt) => {
          a += dt * 1.6 / r;
          dragon.root.position.set(c.x + Math.cos(a) * r, 5 + Math.sin(a * 2) * 0.6, c.z + Math.sin(a) * r);
          dragon.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
          return a >= end;
        });
        dragon.setPose({ fly: 1 });
        await moveTo(tk, home.x, home.z, { y: 1.4, speed: 2.4 });
        await moveTo(tk, home.x, home.z, { y: 0, speed: 1.0 });
        dragon.setPose({});
        await faceCamera(tk);
        await sleep(tk, between(15, 30));
      }
    },

    async flowers(tk) {
      bouquet.visible = true;
      for (;;) {
        const spot = pick(meadow);
        await walk(tk, spot);
        dragon.setPose({ headDown: 1, nibble: 1 });
        await sleep(tk, 2.6);
        carried = makeFlower(pick(FLOWER_COLORS));
        carried.rotation.x = Math.PI / 2;
        dragon.mouth.add(carried);
        dragon.setPose({});
        await sleep(tk, 0.8);
        await walk(tk, new V(bouquet.position.x - 0.5, 0, bouquet.position.z - 0.3));
        await turnTo(tk, bouquet.position.x, bouquet.position.z);
        dragon.setPose({ headDown: 1 });
        await sleep(tk, 1.2);
        dragon.mouth.remove(carried);
        const n = bouquet.children.length;
        if (n >= 9) bouquet.clear();
        const a = n * 2.4;
        carried.position.set(Math.cos(a) * 0.07 * Math.sqrt(n), 0, Math.sin(a) * 0.07 * Math.sqrt(n));
        carried.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
        bouquet.add(carried);
        carried = null;
        dragon.setPose({});
        dragon.react('hop');
        await sleep(tk, between(4, 8));
      }
    },

    async eating(tk) {
      await walk(tk, home);
      await faceCamera(tk);
      const f = new V(0, 0, 0.95).applyAxisAngle(new V(0, 1, 0), dragon.root.rotation.y);
      basket.position.set(home.x + f.x, 0, home.z + f.z);
      basket.userData.apples.forEach((ap) => (ap.visible = true));
      basket.visible = true;
      let left = 5;
      for (;;) {
        dragon.setPose({ headDown: 1, nibble: 1 });
        await sleep(tk, 3);
        dragon.setPose({ nibble: 1 });
        await sleep(tk, between(4, 7));
        dragon.setPose({});
        left--;
        basket.userData.apples[left].visible = false;
        if (left === 0) {
          await sleep(tk, 6);
          basket.userData.apples.forEach((ap) => (ap.visible = true)); // found more
          left = 5;
        }
        await sleep(tk, between(6, 12));
      }
    },

    async nest(tk) {
      await walk(tk, new V(nest.x + 1.0, 0, nest.z + 0.6));
      await turnTo(tk, nest.x, nest.z);
      for (;;) {
        dragon.setPose({ headDown: 0.8, sweep: 1 });
        await sleep(tk, between(6, 9));
        dragon.setPose({});
        dragon.react('tilt');
        await sleep(tk, between(4, 7));
      }
    },

    async exploring(tk) {
      for (;;) {
        let i = Math.floor(Math.random() * trail.length);
        const hops = 2 + Math.floor(Math.random() * 3);
        for (let h = 0; h < hops; h++) {
          await walk(tk, trail[i]);
          if (Math.random() < 0.5) {
            dragon.setPose({ headDown: 0.9, nibble: 0.5 });
            await sleep(tk, 1.8);
            dragon.setPose({});
          } else {
            dragon.react('tilt');
          }
          await sleep(tk, between(2, 5));
          i = (i + (Math.random() < 0.5 ? 1 : trail.length - 1)) % trail.length;
        }
        await walk(tk, home);
        await faceCamera(tk);
        await sleep(tk, between(8, 14));
      }
    },

    async reading(tk) {
      await walk(tk, home);
      await faceCamera(tk);
      const f = new V(0, 0, 0.72).applyAxisAngle(new V(0, 1, 0), dragon.root.rotation.y);
      book.position.set(home.x + f.x, 0.04, home.z + f.z);
      book.scale.setScalar(1.5 * dragon.root.scale.x);
      book.rotation.y = dragon.root.rotation.y + Math.PI / 2;
      book.visible = true;
      for (;;) {
        dragon.setPose({ headDown: 0.6 });
        await sleep(tk, between(7, 12));
        flipT = 0;
        if (Math.random() < 0.3) {
          dragon.setPose({});
          dragon.react('tilt');
          await sleep(tk, 2);
        }
      }
    },

    async treasure(tk) {
      await walk(tk, home);
      await faceCamera(tk);
      const f = new V(0, 0, 0.9).applyAxisAngle(new V(0, 1, 0), dragon.root.rotation.y);
      box.position.set(home.x + f.x, 0, home.z + f.z);
      box.rotation.y = dragon.root.rotation.y + Math.PI;
      box.visible = true;
      for (;;) {
        dragon.setPose({ headDown: 0.4 });
        await sleep(tk, 1);
        boxTarget = 1;
        await sleep(tk, 1.2);
        dragon.react('tilt');
        await sleep(tk, between(5, 8));
        boxTarget = 0;
        dragon.setPose({});
        await sleep(tk, between(6, 10));
      }
    },

    // ---- Little scenes, acted out when you tap your dragon ----
    // ctx: { think(text, ms), sparkle(pos, n), ability(), walkable(x, z), chest, chestOpen, door }

    // Pebble chases a butterfly, which ends up landing on her nose.
    async butterfly(tk, ctx) {
      await settle(tk);
      const p = dragon.root.position;
      const p0 = p.clone();
      const first = near(ctx, p0, 1.3, 2.0);
      fly.onNose = false;
      butterfly.position.set(first.x + 1.5, groundY + 3.2, first.z - 1);
      fly.target.set(first.x, groundY + 1.2, first.z);
      butterfly.visible = true;
      await turnTo(tk, first.x, first.z);
      dragon.react('tilt');
      ctx.think('Ooh. A butterfly!', 2400);
      await sleep(tk, 2.0);
      for (let i = 0; i < 3; i++) {
        const pt = near(ctx, p0, 1.8, 3.4);
        fly.target.set(pt.x, groundY + 1.0 + Math.random() * 0.5, pt.z);
        await sleep(tk, 0.6);
        const d = Math.hypot(pt.x - p.x, pt.z - p.z) || 1;
        const k = Math.max(0, (d - 0.9) / d); // stop just short of it
        dragon.setPose({ walk: 1 });
        await moveTo(tk, p.x + (pt.x - p.x) * k, p.z + (pt.z - p.z) * k, { speed: 2.2 });
        dragon.setPose({});
        dragon.react('hop');
        if (i === 1) ctx.think('Wait for me!', 2000);
        await sleep(tk, 1.0);
      }
      await faceCamera(tk);
      fly.onNose = true;
      await sleep(tk, 1.8);
      ctx.think('…it landed on my nose. Nobody move.', 3800);
      await sleep(tk, 4.0);
      fly.onNose = false;
      fly.target.set(p.x + 2.5, groundY + 5, p.z - 2);
      dragon.react('tilt');
      ctx.think('Bye, butterfly!', 2200);
      await sleep(tk, 2.4);
      butterfly.visible = false;
    },

    // Pebble picks flowers and weaves them into a crown.
    async crown(tk, ctx) {
      await settle(tk);
      const p0 = dragon.root.position.clone();
      ctx.think('I’m making a flower crown. Hold on.', 3000);
      await sleep(tk, 1.2);
      for (let i = 0; i < 2; i++) {
        await walk(tk, near(ctx, p0, 1.3, 2.6));
        dragon.setPose({ headDown: 1, nibble: 1 });
        await sleep(tk, 1.7);
        if (carried) dragon.mouth.remove(carried);
        carried = makeFlower(pick(FLOWER_COLORS));
        carried.rotation.x = Math.PI / 2;
        dragon.mouth.add(carried);
        dragon.setPose({});
        await sleep(tk, 0.5);
      }
      await walk(tk, p0);
      await faceCamera(tk);
      dragon.setPose({ headDown: 0.7, sweep: 1 });
      ctx.think('Over, under, over, under…', 2800);
      await sleep(tk, 3.0);
      dragon.mouth.remove(carried);
      carried = null;
      if (crown) crown.obj.parent?.remove(crown.obj);
      const obj = makeCrown();
      dragon.head.add(obj);
      crown = { obj, until: now + 150 };
      world.tween(0.6, (q) => obj.scale.setScalar(Math.max(0.001, q * (1 + 0.3 * Math.sin(q * Math.PI)))));
      dragon.setPose({});
      dragon.react('celebrate');
      ctx.sparkle(dragon.head.getWorldPosition(new V()), 18);
      ctx.think('Ta-da! How do I look?', 4200);
      await sleep(tk, 3.0);
    },

    // Pebble sniffs a flower a little too hard.
    async sneeze(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      const f = front(0.95);
      sniff.position.set(f.x, groundY + 0.5, f.z);
      sniff.visible = true;
      dragon.setPose({ headDown: 0.75 });
      ctx.think('Mmm. This one smells like…', 2600);
      await sleep(tk, 2.6);
      dragon.setPose({});
      dragon.react('sneeze');
      await sleep(tk, 0.8);
      sniff.visible = false;
      ctx.sparkle(new V(f.x, groundY + 0.6, f.z), 28);
      ctx.think('ACHOO!', 1800);
      await sleep(tk, 1.9);
      dragon.react('tilt');
      ctx.think('…pollen. Worth it.', 3000);
      await sleep(tk, 2.2);
    },

    // Pebble finds a beetle and shows it to you.
    async beetle(tk, ctx) {
      await settle(tk);
      dragon.setPose({ headDown: 1, nibble: 1 });
      ctx.think('Ooh, what’s under here…', 2600);
      await sleep(tk, 2.6);
      carried = beetle;
      beetle.position.set(0, 0.2, -0.08);
      dragon.mouth.add(beetle);
      dragon.setPose({});
      await faceCamera(tk);
      dragon.react('tilt');
      ctx.think('Look! A beetle. I’m naming him Gerald.', 4400);
      await sleep(tk, 4.4);
      ctx.sparkle(beetle.getWorldPosition(new V()), 8);
      dragon.mouth.remove(beetle);
      carried = null;
      ctx.think('Bye, Gerald.', 2200);
      await sleep(tk, 1.6);
    },

    // Ash lights a campfire. Second try.
    async campfire(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      const f = front(1.5);
      const u = camp.userData;
      camp.position.set(f.x, groundY, f.z);
      u.level = 0;
      u.target = 0;
      u.until = Infinity;
      camp.visible = true;
      camp.scale.setScalar(0.001);
      world.tween(0.5, (q) => camp.scale.setScalar(Math.max(0.001, q * 1.6)));
      ctx.think('Watch this. One campfire, coming up.', 3000);
      await sleep(tk, 2.4);
      dragon.react('breathe');
      await sleep(tk, 1.0);
      ctx.sparkle(new V(f.x, groundY + 0.3, f.z), 6);
      await sleep(tk, 1.2);
      dragon.react('tilt');
      ctx.think('…that was a warm-up.', 2400);
      await sleep(tk, 2.4);
      ctx.ability();
      await sleep(tk, 1.1);
      u.target = 1;
      await sleep(tk, 1.6);
      dragon.react('celebrate');
      ctx.think('Ha! Nailed it.', 3600);
      u.until = now + 45; // burns for a while, then dies down
      await sleep(tk, 2.6);
    },

    // Ash checks on the old chest.
    async chest(tk, ctx) {
      await settle(tk);
      const c = ctx.chest;
      ctx.think(ctx.chestOpen ? 'Let’s go admire our treasure.' : 'I just want to check on that chest.', 3000);
      await sleep(tk, 0.8);
      await walk(tk, new V(c.x + 0.75, 0, c.z + 1.35));
      await turnTo(tk, c.x, c.z);
      dragon.setPose({ headDown: 0.8, nibble: 0.5 });
      await sleep(tk, 2.4);
      dragon.setPose({});
      dragon.react('tilt');
      ctx.think(ctx.chestOpen ? 'Still the best treasure ever.' : 'Still locked. One day, chest. One day.', 3800);
      await sleep(tk, 3.0);
      await faceCamera(tk);
    },

    // Ash marches a quick loop to make sure all is well.
    async patrol(tk, ctx) {
      await settle(tk);
      const p0 = dragon.root.position.clone();
      ctx.think('Perimeter check!', 2400);
      for (let i = 0; i < 3; i++) {
        const pt = near(ctx, p0, 1.8, 3.2);
        dragon.setPose({ walk: 1 });
        await moveTo(tk, pt.x, pt.z, { speed: 2.0 });
        dragon.setPose({});
        dragon.react('tilt');
        await sleep(tk, 0.9);
      }
      await walk(tk, p0);
      await faceCamera(tk);
      dragon.react('hop');
      ctx.think('All clear. You’re safe.', 3400);
      await sleep(tk, 2.4);
    },

    async stretch(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      dragon.react('stretch');
      ctx.think('Check out this wingspan.', 3200);
      await sleep(tk, 2.8);
      dragon.react('hop');
      await sleep(tk, 0.9);
    },

    // Moon builds the perfect cozy bed, pillow by pillow, then tries it out.
    async bed(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      const p = dragon.root.position;
      const s = dragon.root.scale.x;
      bed.position.set(p.x, groundY, p.z);
      bed.rotation.y = dragon.root.rotation.y;
      bed.scale.setScalar(s / 0.84);
      const cushions = bed.userData.cushions;
      cushions.forEach((c) => c.scale.setScalar(0.001));
      bed.visible = true;
      const pop = (c) => world.tween(0.5, (q) => {
        const k = Math.max(0.001, q * (1 + 0.25 * Math.sin(q * Math.PI)));
        c.scale.set(c.userData.size[0] * k, c.userData.size[1] * k, c.userData.size[2] * k);
      });
      ctx.think('I’m building the perfect cozy bed.', 3200);
      for (let i = 0; i < 5; i++) {
        dragon.setPose({ headDown: 0.7, sweep: 1 });
        await sleep(tk, 1.0);
        pop(cushions[i]);
        await sleep(tk, 0.5);
      }
      dragon.setPose({ headDown: 1 });
      await sleep(tk, 1.3);
      dragon.setPose({});
      dragon.react('tilt');
      ctx.think('Hmm. One more pillow.', 2400);
      await sleep(tk, 2.0);
      pop(cushions[5]);
      await sleep(tk, 0.9);
      dragon.setPose({ lie: 1 });
      await sleep(tk, 1.5);
      ctx.think('…perfect.', 2800);
      await sleep(tk, 1.4);
      dragon.setPose({ lie: 1, sleep: 1 });
      zzz.visible = true;
      await sleep(tk, 7);
      zzz.visible = false;
      dragon.setPose({ lie: 0.6 });
      await sleep(tk, 1.6);
      dragon.setPose({});
    },

    async clouds(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      dragon.setPose({ lookUp: 1 });
      ctx.think('One cloud… two clouds… three…', 3400);
      await sleep(tk, 3.6);
      dragon.react('tilt');
      ctx.think('That one looks like a teapot.', 3400);
      await sleep(tk, 3.2);
      dragon.setPose({});
    },

    // Moon reads something interesting in her star book.
    async starbook(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      const f = front(0.86);
      book.position.set(f.x, groundY + 0.04, f.z);
      book.scale.setScalar(1.5 * dragon.root.scale.x);
      book.rotation.y = dragon.root.rotation.y + Math.PI / 2;
      book.visible = true;
      dragon.setPose({ headDown: 0.6 });
      await sleep(tk, 2.0);
      flipT = 0;
      ctx.think('This book says stars are just very far-away lanterns.', 4200);
      await sleep(tk, 4.0);
      flipT = 0;
      dragon.setPose({});
      dragon.react('tilt');
      ctx.think('I believe it.', 2600);
      await sleep(tk, 2.4);
    },

    async hum(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      dragon.setPose({ sweep: 0.6 });
      ctx.think('♪ hmm, hmm-hmm, hmm ♪', 4000);
      for (let i = 0; i < 4; i++) {
        ctx.sparkle(dragon.head.getWorldPosition(new V()).add(new V(between(-0.5, 0.5), 0.4, 0)), 5);
        await sleep(tk, 1.0);
      }
      dragon.setPose({});
    },

    // Moon listens to the Ancient Door.
    async door(tk, ctx) {
      await settle(tk);
      await turnTo(tk, ctx.door.x, ctx.door.z);
      dragon.setPose({ lookUp: 0.5 });
      ctx.think('The Door is humming again. Can you hear it?', 4200);
      await sleep(tk, 4.0);
      dragon.setPose({});
      await faceCamera(tk);
    },

    // ---- Looking after your dragon (from the feelings button) ----
    async feed(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      const f = front(0.85);
      snack.material.color.set(ctx.treatColor || '#d2453a');
      snack.position.set(f.x, groundY + 0.1, f.z);
      snack.scale.setScalar(0.001);
      snack.visible = true;
      world.tween(0.4, (q) => snack.scale.setScalar(Math.max(0.001, q)));
      await sleep(tk, 0.7);
      dragon.react('tilt');
      await sleep(tk, 0.8);
      for (let i = 0; i < 3; i++) {
        dragon.setPose({ headDown: 1, nibble: 1 });
        await sleep(tk, 1.1);
        snack.scale.setScalar(Math.max(0.001, 1 - (i + 1) / 3));
        dragon.setPose({ nibble: 0.6 });
        await sleep(tk, 0.5);
      }
      snack.visible = false;
      dragon.setPose({});
      dragon.react('hop');
      ctx.think(ctx.line, 3800);
      await sleep(tk, 1.5);
    },

    async shortnap(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      ctx.think('Just a little nap…', 2600);
      dragon.setPose({ lie: 1 });
      await sleep(tk, 1.6);
      dragon.setPose({ lie: 1, sleep: 1 });
      zzz.visible = true;
      await sleep(tk, 16);
      zzz.visible = false;
      dragon.setPose({ lie: 0.6 });
      await sleep(tk, 1.4);
      dragon.setPose({});
      dragon.react('stretch');
      ctx.think('Ahh. Much better.', 3000);
      await sleep(tk, 2.0);
    },

    // A paddle around the pond, then a big shake.
    async swim(tk, ctx) {
      await settle(tk);
      const c = ctx.pond;
      const p = dragon.root.position;
      const a0 = Math.atan2(p.z - c.z, p.x - c.x);
      const edge = new V(c.x + Math.cos(a0) * (c.r + 0.6), 0, c.z + Math.sin(a0) * (c.r + 0.6));
      ctx.think('Last one in is a soggy egg!', 2800);
      await walk(tk, edge);
      await turnTo(tk, c.x, c.z);
      dragon.react('hop');
      await sleep(tk, 0.3);
      const r = Math.max(0.6, c.r - 1.2);
      await moveTo(tk, c.x + Math.cos(a0) * r, c.z + Math.sin(a0) * r, { y: -0.55, speed: 1.8 });
      ctx.splash(new V(dragon.root.position.x, 0.1, dragon.root.position.z));
      let a = a0;
      let next = 0.6;
      dragon.setPose({ walk: 0.4 });
      await drive(tk, (dt) => {
        a += dt * 0.55;
        dragon.root.position.set(c.x + Math.cos(a) * r, -0.55 + Math.sin(a * 6) * 0.04, c.z + Math.sin(a) * r);
        dragon.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
        next -= dt;
        if (next <= 0) { next = 0.9; ctx.splash(new V(dragon.root.position.x, 0.1, dragon.root.position.z)); }
        return a > a0 + TAU * 1.25;
      });
      dragon.setPose({});
      ctx.think('Wheee!', 1800);
      const out = new V(c.x + Math.cos(a) * (c.r + 0.7), 0, c.z + Math.sin(a) * (c.r + 0.7));
      await moveTo(tk, out.x, out.z, { y: 0, speed: 1.8 });
      await faceCamera(tk);
      dragon.react('celebrate'); // a big shake
      ctx.splash(new V(out.x, 0.6, out.z));
      ctx.think('That was the best swim ever.', 3400);
      await sleep(tk, 2.0);
    },

    // Just the special move, with a line.
    async showoff(tk, ctx) {
      await settle(tk);
      await faceCamera(tk);
      ctx.think(ctx.showoffLine, 3200);
      await sleep(tk, 0.6);
      await sleep(tk, ctx.ability() / 1000);
    },

    // Fly to another island and land there: take off, a long gentle glide
    // along a curve (swooping a little), then circle down to land.
    async travel(tk, target) {
      camp.visible = false;
      dragon.setPose({ fly: 1 });
      const p = dragon.root.position;
      await moveTo(tk, p.x, p.z, { y: p.y + 2.2, speed: 2.4 });
      await turnTo(tk, target.x, target.z);
      const a = p.clone();
      const b = new V(target.x, target.y + 3.2, target.z);
      const dir = new V().subVectors(b, a);
      const side = new V(-dir.z, 0, dir.x).normalize().multiplyScalar(dir.length() * 0.18);
      const curve = new THREE.CubicBezierCurve3(
        a,
        a.clone().addScaledVector(dir, 0.3).add(side).add(new V(0, 6, 0)),
        a.clone().addScaledVector(dir, 0.7).sub(side).add(new V(0, 4, 0)),
        b,
      );
      const len = curve.getLength();
      let u = 0;
      const tan = new V();
      dragon.setPose({ fly: 1 });
      await drive(tk, (dt) => {
        // ease in and out of the glide
        const speed = 10 * Math.min(1, 0.3 + u * 4, 0.3 + (1 - u) * 4);
        u = Math.min(1, u + (speed * dt) / len);
        curve.getPoint(u, dragon.root.position);
        curve.getTangent(Math.min(0.999, u), tan);
        const want = Math.atan2(tan.x, tan.z);
        let diff = want - dragon.root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        dragon.root.rotation.y += diff * Math.min(1, dt * 3);
        dragon.setPose({ fly: 1, bank: Math.max(-0.4, Math.min(0.4, -diff * 1.5)) });
        return u >= 1;
      });
      dragon.setPose({ fly: 1 });
      await moveTo(tk, target.x, target.z, { y: target.y, speed: 1.8 });
      groundY = target.y;
      dragon.setPose({});
      await faceCamera(tk);
    },

    // Walk over to something and take a curious look.
    async visit(tk, { to, look }) {
      await settle(tk);
      await walk(tk, to);
      await turnTo(tk, look.x, look.z);
      dragon.react('tilt');
      dragon.setPose({ headDown: 0.3 });
    },

    async settle(tk) {
      await settle(tk);
      await faceCamera(tk);
    },

    // Walk to a spot the player double-tapped, then wait there.
    async walkTo(tk, point) {
      await settle(tk);
      await walk(tk, point);
      await sleep(tk, 0.4);
      await faceCamera(tk);
    },

    async home(tk) {
      await settle(tk);
      await walk(tk, home);
      await faceCamera(tk);
    },
  };

  async function run(name, d, arg) {
    stop();
    dragon = d;
    const tk = { cancelled: false };
    token = tk;
    try {
      await ACT[name](tk, arg);
      return true;
    } catch (e) {
      if (e !== CANCEL) console.error(e);
      return false;
    }
  }

  function stop() {
    if (token) token.cancelled = true;
    token = null;
    boxTarget = 0;
    hideProps();
    if (carried && dragon) { dragon.mouth.remove(carried); carried = null; }
    fly.onNose = false;
    dragon?.setPose({});
  }

  return {
    focusPoint,
    start: (name, d) => run(name, d),
    pause: (d) => run('settle', d),
    goHome: (d) => run('home', d),
    travel: (d, target) => run('travel', d, target),
    visit: (d, to, look) => run('visit', d, { to, look }),
    walkTo: (d, point) => run('walkTo', d, point),
    // Act out a little scene; resolves true if it finished, false if interrupted.
    scene: (name, d, ctx) => run(name, d, ctx),
    hasScene: (name) => !!ACT[name],
    stop,
  };
}
