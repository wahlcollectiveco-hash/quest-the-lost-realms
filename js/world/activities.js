// Calm things the dragon does while you focus. Each activity is a small
// async script; stop() cancels it at the next frame.
import * as THREE from 'three';

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
  treasure: (n) => `${n} is admiring its tiny treasure box.`,
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

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
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
  props.add(book, basket, box, zzz, bouquet);
  const hideProps = () => { book.visible = basket.visible = box.visible = zzz.visible = false; };
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

    // Fly to another island and land there.
    async travel(tk, target) {
      dragon.setPose({ fly: 1 });
      const p = dragon.root.position;
      await moveTo(tk, p.x, p.z, { y: p.y + 2.5, speed: 2.2 });
      await turnTo(tk, target.x, target.z);
      await moveTo(tk, target.x, target.z, { y: target.y + 3, speed: 16 });
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
    } catch (e) {
      if (e !== CANCEL) console.error(e);
    }
  }

  function stop() {
    if (token) token.cancelled = true;
    token = null;
    boxTarget = 0;
    hideProps();
    if (carried && dragon) { dragon.mouth.remove(carried); carried = null; }
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
    stop,
  };
}
