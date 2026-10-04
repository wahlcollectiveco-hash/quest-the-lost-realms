// Dragon Haven: a small floating island in Verdant Vale.
// Style target: simple, soft shapes lit by warm golden light, with magic
// glow used only on the Ancient Door, the egg and a few drifting motes.
import * as THREE from 'three';
import { ENV, ramp, toon, foliageGeo, leafMat, makeGrass, flowerGeo, flowerCentreGeo, makeWater, paintCloud } from './style.js';

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const ISLAND_R = 14;

// Seeded random so the island looks the same every visit.
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(11);
const R = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// Every solid thing in the world uses the shared storybook shading (style.js).
export const mat = (color, o = {}) => toon(color, o);
export function mesh(geo, material, { pos, rot, scale, cast = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale !== undefined) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(...scale);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}
// Soft organic blob: sphere with gentle, seam-safe wobble.
export function blobGeo(r, amt = 0.08, w = 20, h = 14) {
  const g = new THREE.SphereGeometry(r, w, h);
  const p = g.attributes.position;
  const v = new V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 3.1 / r + v.y * 1.7 / r) * Math.cos(v.z * 2.3 / r + v.x / r);
    v.multiplyScalar(1 + n * amt);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
export function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Shared rune language: the Door and the egg use the same symbols.
export function drawRune(ctx, x, y, s, seed) {
  const r = rng(seed * 97 + 13);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = 'round';
  if (r() < 0.6) {
    ctx.beginPath();
    const a = r() * TAU;
    ctx.arc(0, 0, s * 0.46, a, a + Math.PI * (1.2 + r() * 0.8));
    ctx.stroke();
  }
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU;
    const b = a + Math.PI * (0.5 + r());
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * s * 0.36, Math.sin(a) * s * 0.36);
    ctx.lineTo(Math.cos(b) * s * 0.36 * r(), Math.sin(b) * s * 0.36 * r());
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc((r() - 0.5) * s * 0.3, (r() - 0.5) * s * 0.3, s * 0.07, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// The seven realm symbols on the Ancient Door (and on the eggs).
// 0 Star, 1 Wave, 2 Leaf, 3 Crescent, 4 Flame, 5 Spiral, 6 Peak.
export function drawRealm(ctx, x, y, s, i) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.085;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (i === 0) {
    for (let k = 0; k <= 10; k++) {
      const r = k % 2 ? s * 0.2 : s * 0.48;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.07, 0, TAU);
    ctx.fill();
  } else if (i === 1) {
    for (const dy of [-0.22, 0, 0.22]) {
      ctx.moveTo(-s * 0.42, dy * s);
      ctx.bezierCurveTo(-s * 0.2, (dy - 0.16) * s, -s * 0.05, (dy + 0.16) * s, s * 0.12, dy * s);
      ctx.bezierCurveTo(s * 0.24, (dy - 0.12) * s, s * 0.34, (dy - 0.06) * s, s * 0.42, dy * s);
    }
    ctx.stroke();
  } else if (i === 2) {
    ctx.moveTo(0, -s * 0.46);
    ctx.quadraticCurveTo(s * 0.4, -s * 0.05, 0, s * 0.42);
    ctx.quadraticCurveTo(-s * 0.4, -s * 0.05, 0, -s * 0.46);
    ctx.moveTo(0, -s * 0.3);
    ctx.lineTo(0, s * 0.48);
    ctx.stroke();
  } else if (i === 3) {
    ctx.arc(0, 0, s * 0.42, Math.PI * 0.3, Math.PI * 1.7);
    ctx.quadraticCurveTo(-s * 0.05, 0, Math.cos(Math.PI * 0.3) * s * 0.42, Math.sin(Math.PI * 0.3) * s * 0.42);
    ctx.stroke();
  } else if (i === 4) {
    ctx.moveTo(0, -s * 0.48);
    ctx.bezierCurveTo(s * 0.12, -s * 0.2, s * 0.38, -s * 0.02, s * 0.3, s * 0.2);
    ctx.bezierCurveTo(s * 0.24, s * 0.44, -s * 0.24, s * 0.44, -s * 0.3, s * 0.2);
    ctx.bezierCurveTo(-s * 0.36, -s * 0.02, -s * 0.06, -s * 0.12, 0, -s * 0.48);
    ctx.moveTo(0, s * 0.02);
    ctx.quadraticCurveTo(s * 0.14, s * 0.18, 0, s * 0.3);
    ctx.stroke();
  } else if (i === 5) {
    for (let k = 0; k <= 60; k++) {
      const a = k * 0.21;
      const r = s * (0.03 + k * 0.0072);
      k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
  } else {
    ctx.moveTo(-s * 0.46, s * 0.32);
    ctx.lineTo(-s * 0.12, -s * 0.34);
    ctx.lineTo(s * 0.08, s * 0.02);
    ctx.lineTo(s * 0.2, -s * 0.16);
    ctx.lineTo(s * 0.46, s * 0.32);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

// ---- Layout ----
const L = {
  cottage: [-5.6, -2.8],
  nest: [-2.7, -0.3],
  home: [-0.9, 1.3],
  door: [0, -9.4],
  chest: [-3.3, -7.0],
  cliff: [8.2, -7.0],
  pond: [5.2, 1.4],
  pondR: 2.3,
  select: [[-2.8, 4.9], [0, 5.5], [2.8, 4.9]],
};
const pathCurve = new THREE.CatmullRomCurve3([
  new V(0.6, 0, 13.4), new V(0.3, 0, 9), new V(-0.6, 0, 5), new V(-0.3, 0, 1.5), new V(0.1, 0, -3), new V(0, 0, -7.4),
]);
const cottagePath = new THREE.CatmullRomCurve3([
  new V(-0.3, 0, 1.5), new V(-2.2, 0, 1.2), new V(-3.9, 0, 0.2), new V(-4.6, 0, -1.0),
]);
const streamCurve = new THREE.CatmullRomCurve3([
  new V(7.1, 0.035, -5.5), new V(6.4, 0.035, -3.6), new V(5.7, 0.035, -2.0), new V(5.3, 0.035, -0.6),
]);
const samples = (curve, n) => curve.getSpacedPoints(n);
const pathPts = [...samples(pathCurve, 60), ...samples(cottagePath, 24)];
const streamPts = samples(streamCurve, 30);
const minDist = (pts, x, z) => pts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.z - z)), Infinity);

function isOpenGround(x, z, pad = 0) {
  if (Math.hypot(x, z) > ISLAND_R - 0.6) return false;
  const near = (p, r) => Math.hypot(x - p[0], z - p[1]) < r + pad;
  if (near(L.pond, L.pondR + 0.5) || near(L.cottage, 2.4) || near(L.nest, 1.1) || near(L.door, 3.2)) return false;
  if (near(L.cliff, 3.2) || near(L.chest, 0.9) || near(L.home, 1.0)) return false;
  if (minDist(pathPts, x, z) < 0.75 + pad) return false;
  if (minDist(streamPts, x, z) < 1.0 + pad) return false;
  return true;
}

// The rocky underside of a floating island: a soft, unlit, painted gradient
// (earthy near the top, deep and cool toward the tip).
export function undersideMat(coneGeo, halfHeight) {
  const p = coneGeo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const a = new THREE.Color('#8a6a4c'), b = new THREE.Color('#4b3d4a'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const k = (p.getY(i) + halfHeight) / (halfHeight * 2); // 0 up by the grass, 1 at the tip
    c.copy(a).lerp(b, Math.min(1, Math.max(0, k * 1.1)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  coneGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
}

// Where a dragon can stand in the Haven (world coordinates).
export function havenWalkable(x, z) {
  if (Math.hypot(x, z) > ISLAND_R - 1.2) return false;
  const near = (p, r) => Math.hypot(x - p[0], z - p[1]) < r;
  if (near(L.pond, L.pondR + 0.5) || near(L.cottage, 2.3) || near(L.cliff, 3.2) || near(L.door, 0.6)) return false;
  return true;
}

// Verdant Vale floats off beyond the Ancient Door (see vale.js).
export const VALE_CENTER = new V(-12, -3, -100);
const VALE_ANGLE = Math.atan2(VALE_CENTER.z, VALE_CENTER.x);
const nearVale = (a, spread) => Math.abs(Math.atan2(Math.sin(a - VALE_ANGLE), Math.cos(a - VALE_ANGLE))) < spread;

// Your home island. The Ancient Door, the egg's nest and the old chest stand
// in Dragon Haven (the other island); `sanctuary` says where, in world space.
export function buildHaven(world, { say, sanctuary }) {
  const { scene } = world;
  const group = new THREE.Group();
  scene.add(group);
  const updaters = [];
  const tap = (obj, fn) => world.onTap(obj, fn);

  let pm = null; // drifting light motes (brighter at night)
  let nightLevel = 0;
  let meadow = null; // wildflower instances, so their density can change
  const cloudMats = [];
  const cloudTint = new THREE.Color('#ffffff');
  updaters.push((t) => { ENV.uTime.value = t; });

  // ---- Sky, fog, light ----
  const skyColors = { top: new THREE.Color('#86add6'), mid: new THREE.Color('#f2d9ae'), low: new THREE.Color('#d8b98c') };
  scene.fog = new THREE.Fog('#ecd4a8', 52, 200);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: skyColors.top },
        mid: { value: skyColors.mid },
        low: { value: skyColors.low },
        glowDir: { value: new V(-0.25, 0.12, -1).normalize() },
        glowColor: { value: new THREE.Color(1.0, 0.8, 0.5) },
        night: { value: 0 },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top, mid, low, glowDir, glowColor; uniform float night; varying vec3 vP;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
        void main(){
          float h = vP.y;
          vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.5, h)) : mix(mid, low, smoothstep(0.0, -0.4, h));
          float g = max(dot(vP, glowDir), 0.0);
          c += glowColor * (pow(g, 10.0) * 0.35 + pow(g, 60.0) * 0.25);
          // stars at night
          vec3 cell = floor(vP * 220.0);
          float s = hash(cell);
          c += vec3(1.0, 0.97, 0.9) * step(0.9965, s) * night * smoothstep(0.05, 0.35, h) * (0.6 + 0.4 * hash(cell + 3.1));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  );
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xfff1d6, 0x6b8a4f, 1.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd49a, 2.7);
  sun.position.set(-16, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 70 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  const sunOffset = sun.position.clone();
  // Time of day: keyframes by hour, blended smoothly. Night stays cozy and readable.
  // `sun` is the warm key light; `sky`/`ground` are the cool fill that colours
  // the shadows; `cloud` tints the painted clouds.
  const NIGHT = { top: '#101a3e', mid: '#2f3f7a', low: '#1d2550', fog: '#2f3a6e', glow: '#8090d0', sun: '#b9c9ff', sunI: 1.5, sky: '#8fa0e6', ground: '#3a4a52', hemiI: 1.25, exp: 1.0, night: 1, cloud: '#56649c' };
  const TIMES = [
    { h: 0, ...NIGHT },
    { h: 4.5, ...NIGHT, night: 0.9 },
    { h: 6, top: '#6f8fd0', mid: '#f9d2b8', low: '#b9b6dc', fog: '#e6cdc4', glow: '#ffb890', sun: '#ffd2b0', sunI: 2.3, sky: '#d9d2f4', ground: '#5c7a4e', hemiI: 1.25, exp: 1.0, night: 0.2, cloud: '#ffd9c8' },
    { h: 9, top: '#4f9ae6', mid: '#d6eefa', low: '#9fcdf0', fog: '#cfe6f2', glow: '#fff0c8', sun: '#fff0cc', sunI: 3.0, sky: '#cfe4ff', ground: '#7fa85a', hemiI: 1.35, exp: 1.0, night: 0, cloud: '#ffffff' },
    { h: 13, top: '#3f8fe6', mid: '#cdeafa', low: '#94c8f0', fog: '#c8e4f2', glow: '#fff6dc', sun: '#fff6e0', sunI: 3.2, sky: '#cfe6ff', ground: '#7fa85a', hemiI: 1.4, exp: 1.0, night: 0, cloud: '#ffffff' },
    { h: 17.5, top: '#4f97e2', mid: '#fbe8c4', low: '#a9cbea', fog: '#e6dfcc', glow: '#ffd08a', sun: '#ffe2b0', sunI: 3.1, sky: '#cfdcff', ground: '#86a85a', hemiI: 1.3, exp: 1.0, night: 0, cloud: '#fff0d4' },
    { h: 19.5, top: '#44529c', mid: '#f3ad92', low: '#7a78b4', fog: '#c9a09a', glow: '#ff9668', sun: '#ff9a6a', sunI: 2.2, sky: '#cdbcf0', ground: '#5a6c50', hemiI: 1.15, exp: 1.0, night: 0.35, cloud: '#f6b0a0' },
    { h: 21.5, ...NIGHT },
    { h: 24, ...NIGHT },
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixC = (a, b, t, out) => out.copy(cA.set(a)).lerp(cB.set(b), t);
  function setTimeOfDay(hour) {
    const h = ((hour % 24) + 24) % 24;
    let i = TIMES.findIndex((k) => k.h > h);
    if (i <= 0) i = 1;
    const a = TIMES[i - 1], b = TIMES[i];
    const t = (h - a.h) / (b.h - a.h);
    const u = sky.material.uniforms;
    mixC(a.top, b.top, t, u.top.value);
    mixC(a.mid, b.mid, t, u.mid.value);
    mixC(a.low, b.low, t, u.low.value);
    mixC(a.glow, b.glow, t, u.glowColor.value).multiplyScalar(1 - 0.6 * (a.night + (b.night - a.night) * t));
    mixC(a.fog, b.fog, t, scene.fog.color);
    mixC(a.sun, b.sun, t, sun.color);
    mixC(a.sky, b.sky, t, hemi.color);
    mixC(a.ground, b.ground, t, hemi.groundColor);
    sun.intensity = a.sunI + (b.sunI - a.sunI) * t;
    hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * t;
    world.renderer.toneMappingExposure = a.exp + (b.exp - a.exp) * t;
    nightLevel = a.night + (b.night - a.night) * t;
    u.night.value = nightLevel;
    windowMat.emissiveIntensity = 2.2 + nightLevel * 1.6;
    lanternMat.emissiveIntensity = 2.4 + nightLevel * 2;
    lamp.intensity = 6 + nightLevel * 10;
    // light for the grass and water shaders, and a tint for the clouds
    ENV.uSun.value.copy(sun.color).multiplyScalar(sun.intensity / 3.2);
    ENV.uAmb.value.copy(hemi.color).multiplyScalar(hemi.intensity / 1.3);
    mixC(a.cloud, b.cloud, t, cloudTint);
    for (const m of cloudMats) m.color.copy(cloudTint);
    return nightLevel;
  }

  function setLightFocus(center) {
    sun.target.position.copy(center);
    sun.position.copy(center).add(sunOffset);
  }
  const fill = new THREE.DirectionalLight(0xb9c8ff, 0.35);
  fill.position.set(14, 8, -10);
  scene.add(fill);

  // ---- Island ----
  const [gc, g] = canvas(1024, 1024);
  const toC = (x, z) => [((x / ISLAND_R) + 1) * 512, ((z / ISLAND_R) + 1) * 512];
  // Painted meadow: a rich green base, big soft patches of light and shade,
  // then lots of small brushy dabs so it never looks flat.
  g.fillStyle = '#7dbe52';
  g.fillRect(0, 0, 1024, 1024);
  const blotch = ['#6fb048', '#8fcd5c', '#9fd866', '#62a242', '#b3e070', '#84c456', '#c4e67e'];
  for (let i = 0; i < 300; i++) {
    const x = R(0, 1024), y = R(0, 1024), r = R(24, 100);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, pick(blotch) + 'aa');
    grad.addColorStop(1, pick(blotch) + '00');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = pick(blotch) + '66';
    g.beginPath();
    g.ellipse(R(0, 1024), R(0, 1024), R(2, 7), R(5, 14), R(0, Math.PI), 0, TAU);
    g.fill();
  }
  const strokeCurve = (pts, w, color, blur) => {
    g.save();
    g.filter = `blur(${blur}px)`;
    g.strokeStyle = color;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    pts.forEach((p, i) => { const [cx, cy] = toC(p.x, p.z); i ? g.lineTo(cx, cy) : g.moveTo(cx, cy); });
    g.stroke();
    g.restore();
  };
  strokeCurve(samples(pathCurve, 60), 46, '#e2cc98dd', 8);
  strokeCurve(samples(cottagePath, 24), 40, '#e2cc98dd', 8);
  strokeCurve(streamPts, 64, '#e0cf9c', 6);
  const disc = (x, z, r, color, blur = 6) => {
    const [cx, cy] = toC(x, z);
    g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = color;
    g.beginPath(); g.arc(cx, cy, (r / ISLAND_R) * 512, 0, TAU); g.fill(); g.restore();
  };
  disc(...L.pond, L.pondR + 0.55, '#e6d49e');
  disc(...L.door, 3.4, '#cdbf9c', 10);
  disc(...L.cottage, 2.6, '#62a242', 14);
  const grassMat = new THREE.MeshToonMaterial({ map: tex(gc), gradientMap: ramp });
  const top = mesh(new THREE.CircleGeometry(ISLAND_R, 96), grassMat, { rot: [-Math.PI / 2, 0, 0], cast: false });
  group.add(top);
  const rim = mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 0.5, 1.1, 96, 1, true), mat('#5f9a40'), { pos: [0, -0.55, 0], cast: false });
  group.add(rim);
  // (a cylinder with a pin-point top: ConeGeometry drops faces when it has height segments)
  const under = new THREE.CylinderGeometry(0.02, ISLAND_R - 0.5, 10, 48, 8, true);
  {
    const p = under.attributes.position;
    const v = new V();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = (v.y + 5) / 10; // 0 at apex, 1 at top
      const n = Math.sin(v.x * 0.9) * Math.cos(v.z * 0.8) * 0.9 + Math.sin(v.y * 2.1 + v.x) * 0.4;
      const s = 1 + (n * 0.12) * (1 - Math.abs(k - 0.5) * 1.4);
      if (k < 0.99) p.setXYZ(i, v.x * s, v.y, v.z * s);
    }
    under.computeVertexNormals();
  }
  group.add(mesh(under, undersideMat(under, 5), { pos: [0, -6.1, 0], rot: [Math.PI, 0, 0], cast: false }));

  // ---- Distant world ----
  const far = new THREE.Group();
  const mountainMat = mat('#8ea2d6', { flatShading: true });
  const snowMat = mat('#fbf6ee', { flatShading: true });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + R(-0.08, 0.08);
    const d = R(110, 170);
    const h = R(34, 70);
    const r = h * R(0.55, 0.8);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (nearVale(a, 0.35)) continue;
    far.add(mesh(new THREE.ConeGeometry(r, h, 7), mountainMat, { pos: [x, h / 2 - 18, z], rot: [0, R(0, TAU), 0], cast: false }));
    far.add(mesh(new THREE.ConeGeometry(r * 0.3, h * 0.3, 7), snowMat, { pos: [x, h - 18 - h * 0.15 + 0.2, z], cast: false }));
  }
  const hillMat = [mat('#6cae62'), mat('#7fbe6c'), mat('#62a070')];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + R(-0.1, 0.1);
    const d = R(58, 80);
    const r = R(10, 18);
    if (nearVale(a, 0.45)) continue;
    far.add(mesh(blobGeo(r, 0.05), pick(hillMat), { pos: [Math.cos(a) * d, -r * 0.55 - 6, Math.sin(a) * d], scale: [1.4, 0.8, 1.4], cast: false }));
  }
  scene.add(far);

  // Big painted cumulus clouds drifting slowly around the horizon.
  const clouds = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const m = new THREE.MeshBasicMaterial({ map: paintCloud(i + 1), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
    cloudMats.push(m);
    const w = R(70, 130);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), m);
    const a = (i / 16) * TAU + R(-0.15, 0.15), d = R(210, 290);
    c.position.set(Math.cos(a) * d, [R(95, 150), R(20, 70), R(-110, -40)][i % 3], Math.sin(a) * d);
    c.lookAt(0, c.position.y * 0.6, 0);
    c.renderOrder = -1;
    clouds.add(c);
  }
  scene.add(clouds);
  updaters.push((t, dt) => { clouds.rotation.y += dt * 0.003; });

  // ---- Water ----
  const [wc, wg] = canvas(64, 256);
  wg.fillStyle = '#5fb2c4';
  wg.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 46; i++) {
    wg.fillStyle = `rgba(255,255,255,${R(0.06, 0.28)})`;
    wg.fillRect(R(0, 64), R(0, 256), R(1, 3), R(10, 44));
  }
  const flowTex = tex(wc);
  flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping;
  // Stylised water: sparkles, foam at the edges, streaks on the falls.
  const waterMat = makeWater(1);
  const fallTex = flowTex.clone();
  const fallMat = makeWater(2);
  const pondTex = flowTex.clone();
  const pondMat = makeWater(0);
  updaters.push((t, dt) => {
    flowTex.offset.y -= dt * 0.35;
    fallTex.offset.y += dt * 0.9;
    pondTex.offset.x += dt * 0.01;
  });

  // Stream ribbon
  function ribbon(curve, width, segs = 60) {
    const pos = [], uv = [], idx = [];
    const len = curve.getLength();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const p = curve.getPointAt(u);
      const tg = curve.getTangentAt(u);
      const n = new V(-tg.z, 0, tg.x).normalize();
      const w = width * (0.85 + 0.15 * Math.sin(u * 9));
      pos.push(p.x + n.x * w / 2, p.y, p.z + n.z * w / 2, p.x - n.x * w / 2, p.y, p.z - n.z * w / 2);
      uv.push(0, u * len * 0.4, 1, u * len * 0.4);
      if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  group.add(mesh(ribbon(streamCurve, 1.0), waterMat, { cast: false }));

  // Pond
  const pond = mesh(new THREE.CircleGeometry(L.pondR, 48), pondMat, { pos: [L.pond[0], 0.04, L.pond[1]], rot: [-Math.PI / 2, 0, 0], cast: false });
  group.add(pond);
  const stoneMats = [mat('#b9b2a2'), mat('#a39d8f'), mat('#cfc7b2')];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + R(-0.1, 0.1);
    if (Math.abs(a - 4.5) < 0.35) continue; // leave a gap where the stream enters
    const r = L.pondR + R(0.05, 0.3);
    group.add(mesh(blobGeo(R(0.2, 0.36), 0.12, 10, 8), pick(stoneMats), {
      pos: [L.pond[0] + Math.cos(a) * r, 0.08, L.pond[1] + Math.sin(a) * r], rot: [R(0, 3), R(0, 3), 0], scale: [1, 0.6, 1],
    }));
  }
  const padMat = mat('#6d9c4a', { side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const a = R(0, TAU), r = R(0.4, 1.6);
    group.add(mesh(new THREE.CircleGeometry(R(0.22, 0.34), 16, 0.35, TAU - 0.7), padMat, {
      pos: [L.pond[0] + Math.cos(a) * r, 0.055, L.pond[1] + Math.sin(a) * r], rot: [-Math.PI / 2, 0, R(0, TAU)], cast: false,
    }));
  }
  const lotus = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const p = mesh(new THREE.SphereGeometry(0.09, 10, 8), mat('#f1b8cf'), { rot: [0, 0, 0], scale: [0.6, 1.4, 0.35] });
    const a = (i / 6) * TAU;
    p.position.set(Math.cos(a) * 0.08, 0.1, Math.sin(a) * 0.08);
    p.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    lotus.add(p);
  }
  lotus.position.set(L.pond[0] + 0.7, 0.05, L.pond[1] - 0.5);
  group.add(lotus);
  // Ripples
  const ripples = [];
  for (let i = 0; i < 3; i++) {
    const rm = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    rm.rotation.x = -Math.PI / 2;
    rm.position.set(L.pond[0] + R(-0.8, 0.8), 0.05, L.pond[1] + R(-0.8, 0.8));
    group.add(rm);
    ripples.push({ m: rm, ph: i / 3 });
  }
  updaters.push((t) => {
    for (const r of ripples) {
      const p = (t * 0.22 + r.ph) % 1;
      r.m.scale.setScalar(0.15 + p * 0.9);
      r.m.material.opacity = 0.35 * (1 - p);
    }
  });
  tap(pond, () => say('The pond is cool and clear. A little fish darts under a lily pad.'));

  // Bridge over the stream
  const bridge = new THREE.Group();
  const bridgeStone = mat('#c4b89c', { flatShading: true });
  bridge.add(mesh(new THREE.TorusGeometry(0.95, 0.2, 8, 20, Math.PI), bridgeStone, { pos: [0, -0.35, 0], scale: [1, 0.7, 3.2] }));
  bridge.add(mesh(new THREE.BoxGeometry(2.3, 0.14, 1.2), bridgeStone, { pos: [0, 0.32, 0] }));
  for (const sx of [-1, 1]) bridge.add(mesh(new THREE.BoxGeometry(2.2, 0.22, 0.12), bridgeStone, { pos: [0, 0.48, 0.55 * sx] }));
  {
    const p = streamCurve.getPointAt(0.45);
    const tg = streamCurve.getTangentAt(0.45);
    bridge.position.set(p.x, 0, p.z);
    bridge.rotation.y = Math.atan2(-tg.z, tg.x) + Math.PI / 2;
  }
  group.add(bridge);

  // Cliff + waterfall
  const cliff = new THREE.Group();
  const cliffMats = [mat('#a9a08c'), mat('#958d7c'), mat('#bcb39c')];
  const rocks = [[0, 1.2, 0, 2.4], [1.4, 0.9, -1.2, 2.0], [-1.3, 0.8, -1.0, 1.8], [0.4, 2.9, -0.9, 1.9], [-0.9, 2.4, 0.2, 1.4], [1.5, 2.3, 0.3, 1.3], [0.2, 4.1, -1.2, 1.4]];
  for (const [x, y, z, s] of rocks) cliff.add(mesh(blobGeo(s, 0.14, 16, 12), pick(cliffMats), { pos: [x, y, z], rot: [R(0, 3), R(0, 3), R(0, 3)], scale: [1, 0.92, 1] }));
  for (const [x, y, z, s] of [[0.3, 5.0, -1.0, 1.0], [-0.9, 3.5, 0.2, 0.8], [1.4, 3.3, 0.2, 0.7]]) {
    cliff.add(mesh(foliageGeo(s, 0.1), leafMat('#6fb44c'), { pos: [x, y, z], scale: [1.2, 0.5, 1.2] }));
  }
  cliff.position.set(...[L.cliff[0], 0, L.cliff[1]]);
  group.add(cliff);
  const fall = mesh(new THREE.PlaneGeometry(1.3, 4.4, 1, 8), fallMat, { cast: false });
  {
    const p = fall.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.pow((p.getY(i) + 2.2) / 4.4, 2) * -0.6);
    fall.geometry.computeVertexNormals();
  }
  const fallBase = streamCurve.getPointAt(0);
  fall.position.set(fallBase.x + 0.35, 2.2, fallBase.z - 0.55);
  fall.lookAt(fallBase.x - 3, 2.2, fallBase.z + 3);
  group.add(fall);
  const splash = [];
  const splashMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 6; i++) {
    const s = mesh(new THREE.SphereGeometry(0.18, 10, 8), splashMat, { pos: [fallBase.x + R(-0.4, 0.4), 0.12, fallBase.z + R(-0.3, 0.3)], cast: false });
    group.add(s);
    splash.push({ s, ph: R(0, TAU) });
  }
  updaters.push((t) => { for (const { s, ph } of splash) s.scale.setScalar(0.7 + 0.45 * Math.abs(Math.sin(t * 3 + ph))); });
  tap(fall, () => say('The waterfall sings softly. Somewhere behind it, stone glints.'));

  // ---- Paths ----
  const pathStone = [mat('#d2c4a4'), mat('#c6b894'), mat('#dccfb0')];
  const placeStones = (curve, n) => {
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n);
      group.add(mesh(new THREE.CylinderGeometry(1, 1.05, 0.08, 9), pick(pathStone), {
        pos: [p.x + R(-0.15, 0.15), 0.035, p.z + R(-0.12, 0.12)], rot: [0, R(0, 3), 0], scale: [R(0.34, 0.46), 1, R(0.3, 0.4)], cast: false,
      }));
    }
  };
  placeStones(pathCurve, 22);
  placeStones(cottagePath, 7);

  // ---- Trees, bushes ----
  // Fluffy storybook trees: a dome of leafy puffs, lighter where the sun
  // catches them. A few are in blossom.
  const LEAF = ['#4f9a3d', '#63ad45', '#3f8a3c', '#7cc04f', '#58a34a'];
  const BLOSSOM = ['#f4b6cf', '#f8cfe0'];
  const trunkMat = mat('#7d5a3c');
  const sway = [];
  function tree(x, z, s = 1, palette = LEAF) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const h = R(1.8, 2.6) * s;
    const trunk = mesh(new THREE.CylinderGeometry(0.15 * s, 0.32 * s, h, 8), trunkMat, { pos: [0, h / 2, 0] });
    trunk.rotation.z = R(-0.06, 0.06);
    g.add(trunk);
    const crown = new THREE.Group();
    crown.position.y = h;
    const base = pick(palette);
    // big body puffs…
    const n = 5 + Math.floor(R(0, 3));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R(-0.4, 0.4);
      const ring = i === 0 ? 0 : R(0.55, 1.0);
      const r = (i === 0 ? R(1.25, 1.5) : R(0.8, 1.15)) * s;
      crown.add(mesh(foliageGeo(r, 0.1), leafMat(rand() < 0.7 ? base : pick(palette)), {
        pos: [Math.cos(a) * ring * s, (i === 0 ? 0.9 : R(0.2, 1.0)) * s, Math.sin(a) * ring * s],
      }));
    }
    // …and a few small bright ones on the sunny side
    const light = new THREE.Color(base).lerp(new THREE.Color(palette === LEAF ? '#b9e06a' : '#fff0f6'), 0.3).getStyle();
    for (let i = 0; i < 3; i++) {
      crown.add(mesh(foliageGeo(R(0.6, 0.85) * s, 0.12, 12, 9), leafMat(light), {
        pos: [R(-0.9, 0.1) * s, R(1.1, 1.7) * s, R(-0.1, 0.8) * s],
      }));
    }
    g.add(crown);
    sway.push({ o: crown, ph: R(0, TAU), a: R(0.012, 0.026) });
    group.add(g);
    return g;
  }
  function pine(x, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.2 * s, 6), trunkMat, { pos: [0, 0.6 * s, 0] }));
    const tiers = ['#2f7a46', '#388650', '#44945a', '#54a465'];
    for (let i = 0; i < 4; i++) {
      const cone = new THREE.ConeGeometry((1.45 - i * 0.3) * s, 1.7 * s, 10);
      g.add(mesh(cone, mat(tiers[i]), { pos: [0, (1.4 + i * 0.85) * s, 0] }));
    }
    group.add(g);
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + R(-0.08, 0.08);
    const fromFront = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));
    if (fromFront < 0.75) continue; // keep the camera side open
    const r = R(11, 12.8);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!isOpenGround(x, z, 0.8) && Math.hypot(x - L.cliff[0], z - L.cliff[1]) < 3.5) continue;
    rand() < 0.3 ? pine(x, z, R(0.9, 1.2)) : tree(x, z, R(0.9, 1.25));
  }
  tree(-9.3, -6.6, 1.2);
  tree(-10.2, 2.8, 1.0, BLOSSOM);
  tree(9.6, 3.6, 0.95, BLOSSOM);
  tree(-3.2, -10.6, 1.1);
  tree(3.8, -10.4, 1.15);
  updaters.push((t) => { for (const s of sway) { s.o.rotation.z = Math.sin(t * 0.8 + s.ph) * s.a; s.o.rotation.x = Math.cos(t * 0.6 + s.ph) * s.a * 0.7; } });

  const bushMats = [leafMat('#58a244'), leafMat('#6bb44c'), leafMat('#4a9440')];
  const blossomMats = [mat('#f9c6da'), mat('#fff6ea'), mat('#f7d774')];
  function bush(x, z, s = 1, blossoms = false) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    for (let i = 0; i < 4; i++) g.add(mesh(foliageGeo(R(0.42, 0.7) * s, 0.1, 14, 10), pick(bushMats), { pos: [R(-0.45, 0.45) * s, R(0.3, 0.5) * s, R(-0.35, 0.35) * s], scale: [1, 0.82, 1] }));
    if (blossoms) {
      const bm = pick(blossomMats);
      for (let i = 0; i < 14; i++) {
        const a = R(0, TAU), e = R(0.2, 1.3);
        g.add(mesh(new THREE.SphereGeometry(0.085 * s, 8, 6), bm, { pos: [Math.cos(a) * Math.cos(e) * 0.68 * s, 0.38 * s + Math.sin(e) * 0.55 * s, Math.sin(a) * Math.cos(e) * 0.68 * s], cast: false }));
      }
    }
    group.add(g);
  }
  [[-8.2, -1.2, 1.1, true], [-7.4, -4.9, 1, false], [-3.8, -4.8, 0.9, true], [2.6, -6.8, 1, true], [-2.2, -7.9, 0.8, false], [8.7, -2.2, 1, true], [3.2, 3.9, 0.7, false], [-6.9, 4.2, 1, true], [7.6, 5.6, 0.9, true], [-4.8, 7.4, 0.8, false]]
    .forEach(([x, z, s, b]) => bush(x, z, s, b));

  // ---- Grass blades + wildflowers (instanced) ----
  {
    // Grass grows almost everywhere: thick in the meadow, thinner on the paths.
    const grassOK = (x, z) => {
      if (Math.hypot(x, z) > ISLAND_R - 0.35) return false;
      const near = (p, r) => Math.hypot(x - p[0], z - p[1]) < r;
      if (near(L.pond, L.pondR + 0.15) || near(L.cottage, 1.75) || near(L.nest, 0.75) || near(L.cliff, 2.7) || near(L.chest, 0.6)) return false;
      if (Math.abs(x - L.door[0]) < 3.3 && z < L.door[1] + 1.7) return false;
      if (minDist(streamPts, x, z) < 0.65) return false;
      const dPath = minDist(pathPts, x, z);
      if (dPath < 0.45) return false;
      if (dPath < 0.9 && rand() < 0.6) return false;
      return true;
    };
    const spots = [];
    for (let tries = 0; spots.length < 3200 && tries < 30000; tries++) {
      const x = R(-ISLAND_R, ISLAND_R), z = R(-ISLAND_R, ISLAND_R);
      if (grassOK(x, z)) spots.push([x, z]);
    }
    group.add(makeGrass(spots, { perTuft: 4, height: 0.4 }));
  }
  {
    // Wildflower patches: little five-petal flowers in soft storybook colours.
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.014, 1, 4);
    stemGeo.translate(0, 0.5, 0);
    const N = 900;
    const heads = new THREE.InstancedMesh(flowerGeo(), toon('#ffffff'), N);
    const centres = new THREE.InstancedMesh(flowerCentreGeo(), toon('#f6c945'), N);
    const stems = new THREE.InstancedMesh(stemGeo, mat('#4f9a3d'), N);
    const palette = ['#f9b8d0', '#f9b8d0', '#f7d35c', '#f7d35c', '#c9b0f0', '#ffffff', '#ffffff', '#f79a70', '#8fc4f4', '#f47a8a'];
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let n = 0;
    for (let c = 0; c < 52 && n < N; c++) {
      let cx, cz, tries = 0;
      do { cx = R(-12.5, 12.5); cz = R(-12.5, 12.5); tries++; } while (!isOpenGround(cx, cz, 0.2) && tries < 30);
      const hue = pick(palette), hue2 = pick(palette);
      const count = Math.floor(R(10, 26));
      for (let k = 0; k < count && n < N; k++) {
        const x = cx + R(-1.5, 1.5), z = cz + R(-1.5, 1.5);
        if (!isOpenGround(x, z)) continue;
        const h = R(0.26, 0.48);
        const sc = R(0.7, 1.15);
        q.setFromEuler(e.set(R(-0.25, 0.25), R(0, TAU), R(-0.25, 0.25)));
        m4.compose(new V(x, h, z), q, new V(sc, sc, sc));
        heads.setMatrixAt(n, m4);
        centres.setMatrixAt(n, m4);
        heads.setColorAt(n, col.set(rand() < 0.75 ? hue : hue2));
        m4.compose(new V(x, 0, z), q.identity(), new V(1, h, 1));
        stems.setMatrixAt(n, m4);
        n++;
      }
    }
    // Shuffle so that showing fewer flowers thins every patch evenly.
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const im of [heads, centres, stems]) {
      const src = im.instanceMatrix.array.slice(0, n * 16);
      order.forEach((from, to) => im.instanceMatrix.array.set(src.subarray(from * 16, from * 16 + 16), to * 16));
      im.instanceMatrix.needsUpdate = true;
    }
    {
      const src = heads.instanceColor.array.slice(0, n * 3);
      order.forEach((from, to) => heads.instanceColor.array.set(src.subarray(from * 3, from * 3 + 3), to * 3));
      heads.instanceColor.needsUpdate = true;
    }
    heads.count = centres.count = stems.count = n;
    meadow = { meshes: [heads, centres, stems], total: n };
    heads.castShadow = true;
    group.add(heads, centres, stems);
  }
  // Sunflowers by the cottage
  for (const [x, z, h] of [[-8.1, 0.3, 1.5], [-7.4, 1.0, 1.25], [-2.6, -3.9, 1.35]]) {
    const sf = new THREE.Group();
    sf.position.set(x, 0, z);
    sf.add(mesh(new THREE.CylinderGeometry(0.035, 0.045, h, 6), mat('#5d8a3a'), { pos: [0, h / 2, 0] }));
    const head = new THREE.Group();
    head.position.y = h;
    head.rotation.x = 0.5;
    head.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16), mat('#6b4526'), { rot: [Math.PI / 2, 0, 0] }));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      head.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), mat('#f2c23e'), { pos: [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0], scale: [1, 1.8, 0.35], rot: [0, 0, a - Math.PI / 2] }));
    }
    head.lookAt(new V(0, h + 1.5, 6));
    sf.add(head);
    group.add(sf);
  }

  // ---- The dragon's cottage (mushroom house) ----
  const cottage = new THREE.Group();
  cottage.position.set(L.cottage[0], 0, L.cottage[1]);
  cottage.add(mesh(new THREE.CylinderGeometry(1.35, 1.62, 2.6, 28), mat('#efe2c4'), { pos: [0, 1.3, 0] }));
  const capR = 2.45;
  const cap = mesh(new THREE.SphereGeometry(capR, 40, 20, 0, TAU, 0, Math.PI / 2), mat('#c9573f', { roughness: 0.7 }), { pos: [0, 2.45, 0], scale: [1, 0.74, 1] });
  cottage.add(cap);
  cottage.add(mesh(new THREE.CircleGeometry(capR - 0.02, 40), mat('#e6d0a6', { side: THREE.DoubleSide }), { pos: [0, 2.46, 0], rot: [Math.PI / 2, 0, 0], cast: false }));
  const spotMat = mat('#fbf3e3', { roughness: 0.6 });
  for (let i = 0; i < 15; i++) {
    const phi = R(0, TAU), th = R(0.2, 1.25);
    const n = new V(Math.sin(th) * Math.cos(phi), Math.cos(th), Math.sin(th) * Math.sin(phi));
    const s = mesh(new THREE.SphereGeometry(R(0.2, 0.34), 14, 10), spotMat, { cast: false });
    s.position.set(n.x * capR, 2.45 + n.y * capR * 0.74, n.z * capR);
    s.lookAt(s.position.clone().add(new V(n.x, n.y / 0.74, n.z)));
    s.scale.set(1, 1, 0.28);
    cottage.add(s);
  }
  {
    const s = new THREE.Shape();
    s.moveTo(-0.4, 0); s.lineTo(0.4, 0); s.lineTo(0.4, 0.9); s.absarc(0, 0.9, 0.4, 0, Math.PI, false); s.lineTo(-0.4, 0);
    const door = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }), mat('#7a4f2e'), { pos: [0, 0.02, 1.5] });
    door.rotation.x = -0.08;
    cottage.add(door);
    cottage.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('#e0b25a', { metalness: 0.5, roughness: 0.3 }), { pos: [0.24, 0.62, 1.64] }));
  }
  const windowMat = mat('#ffcf82', { emissive: '#ffb458', emissiveIntensity: 2.2, fog: true });
  for (const a of [-0.75, 0.75]) {
    const r = 1.45;
    const w = new THREE.Group();
    w.position.set(Math.sin(a) * r, 1.65, Math.cos(a) * r);
    w.rotation.y = a;
    w.add(mesh(new THREE.CircleGeometry(0.26, 24), windowMat, { pos: [0, 0, 0.02], cast: false }));
    w.add(mesh(new THREE.TorusGeometry(0.27, 0.05, 8, 24), mat('#7a4f2e')));
    w.add(mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), mat('#7a4f2e'), { pos: [0, 0, 0.03] }));
    w.add(mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), mat('#7a4f2e'), { pos: [0, 0, 0.03] }));
    cottage.add(w);
  }
  const lamp = new THREE.PointLight('#ffb866', 6, 6, 2);
  lamp.position.set(0, 1.7, 2.1);
  cottage.add(lamp);
  // lantern post
  cottage.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 6), mat('#5b4230'), { pos: [0.95, 0.65, 1.95] }));
  const lanternMat = mat('#ffe2a0', { emissive: '#ffc063', emissiveIntensity: 2.4, fog: true });
  cottage.add(mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), lanternMat, { pos: [0.95, 1.4, 1.95] }));
  cottage.add(mesh(new THREE.ConeGeometry(0.17, 0.14, 4), mat('#5b4230'), { pos: [0.95, 1.6, 1.95], rot: [0, Math.PI / 4, 0] }));
  cottage.lookAt(new V(0, 0, 3.5));
  group.add(cottage);
  tap(cottage, () => say('Home, sweet mossy home. It smells like warm bread and rain.'));

  // ---- Rune textures (shared by Door and egg) ----
  const runeGlow = (ctx, color, blur) => { ctx.strokeStyle = color; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = blur; };

  // ---- Egg nest ----
  const nest = new THREE.Group();
  nest.position.copy(sanctuary.nest);
  nest.add(mesh(new THREE.TorusGeometry(0.55, 0.22, 10, 26), mat('#8a6440', { roughness: 1 }), { pos: [0, 0.17, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.8] }));
  nest.add(mesh(new THREE.CircleGeometry(0.6, 20), mat('#b4905f'), { pos: [0, 0.05, 0], rot: [-Math.PI / 2, 0, 0], cast: false }));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    nest.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, R(0.6, 0.9), 4), mat('#6e4d2f'), {
      pos: [Math.cos(a) * 0.6, 0.2 + R(-0.05, 0.08), Math.sin(a) * 0.6], rot: [Math.PI / 2 + R(-0.3, 0.3), a + R(-0.4, 0.4), R(-0.2, 0.2)],
    }));
  }
  // The egg: its tint hints at who's inside; glowing cracks spread as it warms.
  const [ec, eg] = canvas(512, 256);
  const [erc, erg] = canvas(512, 256);
  const eggRand = rng(5);
  const speckles = Array.from({ length: 90 }, () => [eggRand() * 512, eggRand() * 256, 2 + eggRand() * 5, Math.floor(eggRand() * 3)]);
  const cracks = Array.from({ length: 6 }, (_, i) => {
    const pts = [[i * 85 + eggRand() * 40, 70 + eggRand() * 30]];
    for (let k = 0; k < 5; k++) { const [x, y] = pts[pts.length - 1]; pts.push([x + 8 + eggRand() * 14, y + (k % 2 ? -1 : 1) * (10 + eggRand() * 16)]); }
    return pts;
  });
  const eggMapTex = tex(ec);
  const eggGlowTex = tex(erc);
  function paintEgg(tint, crack) {
    const grad = eg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#fbf6ea');
    grad.addColorStop(1, tint);
    eg.fillStyle = grad;
    eg.fillRect(0, 0, 512, 256);
    for (const [x, y, r, c] of speckles) {
      eg.fillStyle = ['#c9bde6', '#b8cfa8', '#e2c9a0'][c] + '88';
      eg.beginPath(); eg.arc(x, y, r, 0, TAU); eg.fill();
    }
    erg.shadowBlur = 0;
    erg.fillStyle = '#000';
    erg.fillRect(0, 0, 512, 256);
    runeGlow(erg, '#ffd98a', 14);
    for (const x of [64, 192, 320, 448]) drawRealm(erg, x, 128, 96, eggState.realm ?? 0); // all the way round, so one always faces you
    if (crack > 0) {
      const n = Math.ceil(crack * cracks.length);
      erg.lineWidth = 3;
      erg.strokeStyle = '#fff1c4';
      erg.shadowColor = '#ffd98a';
      erg.shadowBlur = 12;
      for (const pts of cracks.slice(0, n)) {
        erg.beginPath();
        pts.forEach(([x, y], i) => (i ? erg.lineTo(x, y) : erg.moveTo(x, y)));
        erg.stroke();
      }
    }
    eggMapTex.needsUpdate = true;
    eggGlowTex.needsUpdate = true;
  }
  const eggMat = new THREE.MeshStandardMaterial({ map: eggMapTex, emissiveMap: eggGlowTex, emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.55 });
  const egg = mesh(new THREE.SphereGeometry(0.34, 32, 24), eggMat, { pos: [0, 0.45, 0], scale: [1, 1.3, 1] });
  nest.add(egg);
  scene.add(nest);
  const eggLight = new THREE.PointLight('#ffd89a', 0, 4, 2);
  eggLight.position.set(0, 0.8, 0.3);
  nest.add(eggLight);

  const eggState = { warmth: 0, tint: '#e8dcc2', pulse: 0, wobble: 0, shake: 0, swell: 0, realm: 0 };
  paintEgg(eggState.tint, 0);
  updaters.push((t, dt) => {
    const w = eggState.warmth;
    eggState.pulse = Math.max(0, eggState.pulse - dt * 0.8);
    eggState.wobble = Math.max(0, eggState.wobble - dt);
    const glow = 0.3 + 0.7 * w;
    eggMat.emissiveIntensity = glow * (0.75 + 0.25 * Math.sin(t * (1.1 + w))) + eggState.pulse * 1.4 + eggState.shake * 2.5 + eggState.swell * 1.6;
    eggLight.intensity = (w >= 1 ? 2.5 + Math.sin(t * 2) : 0) + eggState.pulse * 4 + eggState.shake * 8 + eggState.swell * 5;
    // Idle wiggles get more frequent as it warms; a ready egg wiggles a lot.
    const every = w >= 1 ? 0.9 : 0.985 - w * 0.03;
    const idle = Math.sin(t * (0.5 + w)) > every ? Math.sin(t * 22) * (0.04 + w * 0.05) : 0;
    const tapWob = eggState.wobble > 0 ? Math.sin(eggState.wobble * 24) * 0.14 * eggState.wobble : 0;
    const shakeWob = eggState.shake > 0 ? Math.sin(t * (20 + eggState.shake * 30)) * 0.22 * eggState.shake : 0;
    egg.rotation.z = idle + tapWob + shakeWob;
    egg.position.y = 0.45 + (eggState.shake > 0.5 ? Math.abs(Math.sin(t * 18)) * 0.05 * eggState.shake : 0);
  });

  // Shell pieces for hatching
  const shellMat = new THREE.MeshStandardMaterial({ map: eggMapTex, roughness: 0.6, side: THREE.DoubleSide, transparent: true });
  const shells = [];
  const shellGeo = new THREE.SphereGeometry(0.34, 8, 6, 0, 0.9, 0, 0.9);
  const eggApi = {
    object: egg,
    worldPosition: () => egg.getWorldPosition(new V()),
    setLook(tint, warmth) {
      eggState.tint = tint;
      eggState.warmth = warmth;
      paintEgg(tint, warmth >= 0.6 ? (warmth - 0.6) / 0.4 : 0);
    },
    pulse() { eggState.pulse = 1; eggState.wobble = 0.6; },
    wobble() { eggState.wobble = 1; },
    setVisible(v) { egg.visible = v; },
    isVisible: () => egg.visible,
    // A slow, warm glow that swells and fades over `dur` seconds.
    swell(dur = 3) { return world.tween(dur, (p) => { eggState.swell = Math.sin(Math.PI * p); }, (p) => p).then(() => { eggState.swell = 0; }); },
    // Builds up shaking and glow over `dur` seconds.
    shake(dur) { return world.tween(dur, (p) => { eggState.shake = p; }, (p) => p * p); },
    burst() {
      eggState.shake = 0;
      egg.visible = false;
      const origin = eggApi.worldPosition();
      for (let i = 0; i < 12; i++) {
        const m = new THREE.Mesh(shellGeo, shellMat);
        m.position.copy(origin);
        m.rotation.set(R(0, TAU), R(0, TAU), R(0, TAU));
        const a = R(0, TAU);
        m.userData.v = new V(Math.cos(a) * R(0.8, 1.8), R(1.5, 3), Math.sin(a) * R(0.8, 1.8));
        m.userData.spin = new V(R(-6, 6), R(-6, 6), R(-6, 6));
        scene.add(m);
        shells.push(m);
      }
      shellMat.opacity = 1;
      eggState.pulse = 1;
      world.tween(1.8, (p) => {
        shellMat.opacity = 1 - Math.max(0, (p - 0.5) * 2);
      }, (p) => p).then(() => {
        for (const m of shells) scene.remove(m);
        shells.length = 0;
      });
    },
    // A fresh egg rolls into the nest.
    appear(tint) {
      eggApi.setLook(tint, 0);
      egg.visible = true;
      return world.tween(1.2, (p) => egg.scale.set(p, 1.3 * p, p), (p) => 1 - Math.pow(1 - p, 3));
    },
  };
  updaters.push((t, dt) => {
    for (const m of shells) {
      m.userData.v.y -= 9 * dt;
      m.position.addScaledVector(m.userData.v, dt);
      if (m.position.y < 0.05) { m.position.y = 0.05; m.userData.v.multiplyScalar(0.4); m.userData.v.y = Math.abs(m.userData.v.y) * 0.3; }
      m.rotation.x += m.userData.spin.x * dt;
      m.rotation.y += m.userData.spin.y * dt;
    }
  });

  // ---- The Ancient Door ----
  const door = new THREE.Group();
  door.position.copy(sanctuary.door);
  const doorStone = mat('#a09a88', { flatShading: true });
  const doorStoneDark = mat('#8d8676', { flatShading: true });
  door.add(mesh(new THREE.BoxGeometry(6.4, 0.3, 3.2), doorStoneDark, { pos: [0, 0.15, 0] }));
  door.add(mesh(new THREE.BoxGeometry(5.2, 0.3, 2.3), doorStone, { pos: [0, 0.45, 0] }));
  const pillarH = 4.2;
  for (const sx of [-1, 1]) {
    door.add(mesh(new THREE.BoxGeometry(0.75, pillarH, 0.8), doorStone, { pos: [1.98 * sx, 0.6 + pillarH / 2, 0] }));
    door.add(mesh(new THREE.BoxGeometry(0.95, 0.3, 1.0), doorStoneDark, { pos: [1.98 * sx, 0.75, 0] }));
    door.add(mesh(blobGeo(0.4, 0.1), mat('#6f9c4c'), { pos: [1.98 * sx + 0.2 * sx, 0.8, 0.35], scale: [1.2, 0.6, 1] }));
  }
  door.add(mesh(new THREE.TorusGeometry(1.98, 0.4, 6, 20, Math.PI), doorStone, { pos: [0, 0.6 + pillarH, 0], scale: [1, 1, 2] }));
  door.add(mesh(new THREE.BoxGeometry(0.6, 0.7, 0.9), doorStoneDark, { pos: [0, 0.6 + pillarH + 1.98, 0] }));
  for (const [x, y, s] of [[-1.4, 6.3, 0.5], [0.7, 6.9, 0.55], [1.9, 5.6, 0.4], [-2.1, 5.2, 0.45]]) {
    door.add(mesh(blobGeo(s, 0.12), mat('#6d9a4a'), { pos: [x, y, 0.1], scale: [1.3, 0.6, 1.3] }));
  }
  // Door surface: the seven realm symbols in a ring.
  const [dc, dg] = canvas(512, 928);
  const doorTex = tex(dc);
  let doorFocus = -1; // a symbol singled out (to compare with an egg)
  function paintDoor(lit) {
    const n = lit.filter(Boolean).length;
    dg.shadowBlur = 0;
    dg.fillStyle = '#000';
    dg.fillRect(0, 0, 512, 928);
    const dim = 'rgba(150, 120, 70, 0.5)';
    runeGlow(dg, n ? '#ffd98a' : dim, n ? 10 : 0);
    dg.globalAlpha = 0.4 + n * 0.3;
    dg.lineWidth = 5;
    dg.beginPath(); dg.arc(256, 470, 200, 0, TAU); dg.stroke();
    dg.lineWidth = 2;
    dg.beginPath(); dg.arc(256, 470, 120, 0, TAU); dg.stroke();
    dg.globalAlpha = 1;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU - Math.PI / 2;
      const on = lit[i] || doorFocus === i;
      runeGlow(dg, on ? '#ffe9b0' : dim, on ? 22 : 0);
      drawRealm(dg, 256 + Math.cos(a) * 165, 470 + Math.sin(a) * 165, on ? 74 : 62, i);
    }
    runeGlow(dg, n ? '#fff3cf' : dim, n ? 20 : 0);
    dg.beginPath(); dg.arc(256, 470, 22, 0, TAU); dg.stroke();
    dg.beginPath(); dg.moveTo(256, 20); dg.lineTo(256, 250); dg.stroke();
    doorTex.needsUpdate = true;
  }
  const doorLit = new Array(7).fill(false);
  paintDoor(doorLit);

  // A glimpse of the next realm, shown when the Door opens.
  const [gc2, gg] = canvas(512, 928);
  {
    const sky = gg.createLinearGradient(0, 0, 0, 928);
    sky.addColorStop(0, '#171a45');
    sky.addColorStop(0.45, '#4b3f86');
    sky.addColorStop(0.7, '#b58bb8');
    sky.addColorStop(0.82, '#f0c6c4');
    sky.addColorStop(1, '#2a2a5c');
    gg.fillStyle = sky;
    gg.fillRect(0, 0, 512, 928);
    const gr = rng(77);
    for (let i = 0; i < 160; i++) {
      gg.fillStyle = `rgba(255,255,240,${0.3 + gr() * 0.7})`;
      gg.beginPath(); gg.arc(gr() * 512, gr() * 520, gr() * 1.8 + 0.3, 0, TAU); gg.fill();
    }
    gg.shadowColor = '#fff6dc';
    gg.shadowBlur = 40;
    gg.fillStyle = '#fbf2dc';
    gg.beginPath(); gg.arc(330, 250, 70, 0, TAU); gg.fill();
    gg.shadowBlur = 0;
    // floating islands
    gg.fillStyle = '#35306a';
    for (const [x, y, w] of [[90, 470, 90], [420, 420, 60]]) {
      gg.beginPath(); gg.ellipse(x, y, w, 14, 0, 0, TAU); gg.fill();
      gg.beginPath(); gg.moveTo(x - w, y); gg.lineTo(x, y + w * 0.9); gg.lineTo(x + w, y); gg.fill();
    }
    // crystal spires
    for (const [x, h, w] of [[60, 330, 38], [140, 420, 30], [230, 300, 44], [300, 470, 34], [380, 360, 40], [470, 300, 36]]) {
      const base = 928 - 80;
      gg.fillStyle = '#2c2d63';
      gg.beginPath(); gg.moveTo(x - w, base); gg.lineTo(x, base - h); gg.lineTo(x + w, base); gg.fill();
      gg.fillStyle = 'rgba(190,180,255,0.35)';
      gg.beginPath(); gg.moveTo(x, base - h); gg.lineTo(x + w, base); gg.lineTo(x + w * 0.2, base); gg.fill();
      gg.shadowColor = '#cdbdff'; gg.shadowBlur = 16;
      gg.fillStyle = '#e6dcff';
      gg.beginPath(); gg.arc(x, base - h + 6, 4, 0, TAU); gg.fill();
      gg.shadowBlur = 0;
    }
    gg.fillStyle = '#1f2150';
    gg.fillRect(0, 928 - 90, 512, 90);
    // a path of light leading in
    const path = gg.createLinearGradient(0, 928, 0, 700);
    path.addColorStop(0, 'rgba(255,230,170,0.9)');
    path.addColorStop(1, 'rgba(255,230,170,0)');
    gg.fillStyle = path;
    gg.beginPath(); gg.moveTo(180, 928); gg.lineTo(250, 720); gg.lineTo(262, 720); gg.lineTo(332, 928); gg.fill();
  }
  const glimpseMat = new THREE.MeshBasicMaterial({ map: tex(gc2), transparent: true, opacity: 0, depthWrite: false, fog: false });
  const doorSurfaceMat = new THREE.MeshStandardMaterial({ color: '#3d4a50', roughness: 0.55, emissiveMap: doorTex, emissive: '#ffffff', emissiveIntensity: 1 });
  {
    const s = new THREE.Shape();
    const hw = 1.6, rh = pillarH;
    s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, rh); s.absarc(0, rh, hw, 0, Math.PI, false); s.lineTo(-hw, 0);
    const geo = new THREE.ShapeGeometry(s, 24);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + hw) / (2 * hw), p.getY(i) / (rh + hw));
    const surface = mesh(geo, doorSurfaceMat, { pos: [0, 0.6, 0], cast: false });
    door.add(surface);
    const veil = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffe3a8', transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
    veil.position.set(0, 0.6, 0.08);
    door.add(veil);
    const glimpse = new THREE.Mesh(geo, glimpseMat);
    glimpse.position.set(0, 0.6, 0.05);
    glimpse.renderOrder = 2;
    door.add(glimpse);
  }
  // Glowing pillar symbols
  const [pc, pg] = canvas(128, 384);
  pg.fillStyle = '#000';
  pg.fillRect(0, 0, 128, 384);
  runeGlow(pg, '#d8c6ff', 12);
  for (let i = 0; i < 3; i++) drawRune(pg, 64, 64 + i * 128, 70, 20 + i);
  const pillarRuneMat = new THREE.MeshBasicMaterial({ map: tex(pc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const doorLight = new THREE.PointLight('#ffd89a', 8, 9, 2);
  doorLight.position.set(0, 2.6, 1.4);
  door.add(doorLight);
  door.lookAt(sanctuary.face.x, sanctuary.door.y, sanctuary.face.z);
  scene.add(door);
  let doorPulse = 0;
  let doorAwake = 0; // 0..1, blazes during the opening moment
  updaters.push((t, dt) => {
    doorPulse = Math.max(0, doorPulse - dt * 0.6);
    const n = doorLit.filter(Boolean).length;
    const base = (0.45 + n * 0.09) * (0.8 + 0.2 * Math.sin(t * 0.7));
    doorSurfaceMat.emissiveIntensity = base + doorPulse * 1.6 + doorAwake * 2.5;
    doorLight.intensity = 3 + n * 1.2 + base * 3 + doorPulse * 14 + doorAwake * 25;
    pillarRuneMat.opacity = Math.min(1, 0.35 + n * 0.06 + 0.25 * Math.sin(t * 0.9 + 1) + doorPulse * 0.3 + doorAwake);
  });
  // Two soft eyes that can open inside the stone.
  const [ec2, eg2] = canvas(128, 64);
  {
    const grad = eg2.createRadialGradient(64, 32, 2, 64, 32, 60);
    grad.addColorStop(0, 'rgba(255,250,225,1)');
    grad.addColorStop(0.25, 'rgba(255,215,130,0.9)');
    grad.addColorStop(0.6, 'rgba(230,160,70,0.35)');
    grad.addColorStop(1, 'rgba(200,120,40,0)');
    eg2.fillStyle = grad;
    eg2.beginPath(); eg2.ellipse(64, 32, 62, 30, 0, 0, TAU); eg2.fill();
  }
  const eyeMat = new THREE.MeshBasicMaterial({ map: tex(ec2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const eyes = [-0.55, 0.55].map((x) => {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), eyeMat);
    e.position.set(x, 4.3, 0.12);
    e.scale.set(1, 0.001, 1);
    door.add(e);
    return e;
  });
  const doorBase = door.position.clone();
  const doorApi = {
    object: door,
    rumble(dur) {
      return world.tween(dur, (p) => {
        const a = Math.sin(p * Math.PI) * 0.05;
        door.position.set(doorBase.x + Math.sin(p * 90) * a, doorBase.y, doorBase.z + Math.cos(p * 70) * a * 0.5);
        doorPulse = Math.max(doorPulse, Math.sin(p * Math.PI) * 0.8);
      }, (p) => p).then(() => door.position.copy(doorBase));
    },
    setEyes(open, dur = 1) {
      const from = eyes[0].scale.y;
      const to = open ? 1 : 0.001;
      return world.tween(dur, (p) => {
        const y = from + (to - from) * p;
        eyes.forEach((e) => e.scale.set(1, Math.max(0.001, y), 1));
        eyeMat.opacity = Math.min(1, y * 1.4);
      });
    },
    front: sanctuary.door.clone().add(new V().subVectors(sanctuary.face, sanctuary.door).setY(0).normalize().multiplyScalar(3.4)),
    setLit(lit) { lit.forEach((v, i) => (doorLit[i] = !!v)); paintDoor(doorLit); },
    // Make one symbol glow on its own (or -1 for none).
    setFocus(i) { doorFocus = i; paintDoor(doorLit); },
    pulse() { doorPulse = 1; },
    awaken(dur) { return world.tween(dur, (p) => { doorAwake = p; }); },
    showGlimpse(dur) { return world.tween(dur, (p) => { glimpseMat.opacity = p; doorAwake = 1 - p * 0.6; }); },
    hideGlimpse(dur) { return world.tween(dur, (p) => { glimpseMat.opacity = 1 - p; doorAwake = 0.4 * (1 - p); }); },
  };

  // ---- Treasure chest ----
  const chest = new THREE.Group();
  chest.position.copy(sanctuary.chest);
  const wood = mat('#8a5a34');
  const gold = mat('#d9a948', { metalness: 0.6, roughness: 0.35 });
  chest.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.58), wood, { pos: [0, 0.25, 0] }));
  const lid = new THREE.Group();
  lid.position.set(0, 0.5, -0.29);
  lid.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.9, 16, 1, false, 0, Math.PI), wood, { pos: [0, 0, 0.29], rot: [0, 0, Math.PI / 2] }));
  for (const x of [-0.3, 0.3]) lid.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 16, 1, false, 0, Math.PI), gold, { pos: [x, 0, 0.29], rot: [0, 0, Math.PI / 2] }));
  chest.add(lid);
  for (const x of [-0.3, 0.3]) chest.add(mesh(new THREE.BoxGeometry(0.07, 0.52, 0.6), gold, { pos: [x, 0.25, 0] }));
  chest.add(mesh(new THREE.BoxGeometry(0.14, 0.16, 0.05), gold, { pos: [0, 0.42, 0.3] }));
  chest.rotation.y = Math.atan2(sanctuary.face.x - sanctuary.chest.x, sanctuary.face.z - sanctuary.chest.z);
  scene.add(chest);
  let chestJiggle = 0;
  let chestOpen = 0;
  let chestOpenTarget = 0;
  const chestGlow = new THREE.PointLight('#ffcf7a', 0, 3, 2);
  chestGlow.position.set(0, 0.7, 0);
  chest.add(chestGlow);
  updaters.push((t, dt) => {
    chestJiggle = Math.max(0, chestJiggle - dt * 1.4);
    chestOpen += (chestOpenTarget - chestOpen) * (1 - Math.exp(-dt * 2.5));
    lid.rotation.x = -Math.abs(Math.sin(chestJiggle * 18)) * 0.12 * chestJiggle - 1.9 * chestOpen;
    chestGlow.intensity = chestOpen * (2.5 + 0.5 * Math.sin(t * 2));
  });
  const chestApi = {
    object: chest,
    jiggle() { chestJiggle = 1; },
    setOpen(open) { chestOpenTarget = open ? 1 : 0; },
  };

  // ---- Signpost at the end of the path: the way to Dragon Haven ----
  const signpost = new THREE.Group();
  signpost.position.set(L.door[0] + 0.6, 0, L.door[1] + 1.6);
  {
    const wood = mat('#8a6238');
    signpost.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 8), wood, { pos: [0, 1.1, 0] }));
    const [sc, sg] = canvas(256, 64);
    sg.fillStyle = '#c99a5a';
    sg.fillRect(0, 0, 256, 64);
    sg.fillStyle = '#4a3420';
    sg.font = '700 30px Georgia, serif';
    sg.textAlign = 'center';
    sg.textBaseline = 'middle';
    sg.fillText('Dragon Haven  →', 128, 34);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.07), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: tex(sc), roughness: 0.9 }), wood]);
    board.position.set(0.25, 1.85, 0);
    board.castShadow = true;
    signpost.add(board);
    signpost.add(mesh(blobGeo(0.35, 0.1), mat('#6f9c4c'), { pos: [0, 0.1, 0], scale: [1.3, 0.5, 1.3] }));
  }
  signpost.lookAt(0, 0, 14);
  group.add(signpost);

  // ---- Butterflies ----
  const butterflyColors = ['#7fb6e8', '#f2b36b', '#e9a9c8', '#f5e28a', '#b9a4ef', '#7fb6e8', '#f2b36b'];
  const bflies = butterflyColors.map((c, i) => {
    const b = new THREE.Group();
    const wm = new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.6, emissive: c, emissiveIntensity: 0.15 });
    // a proper wing shape: a big upper lobe and a smaller lower one
    const ws = new THREE.Shape();
    ws.moveTo(0, 0);
    ws.bezierCurveTo(0.04, 0.15, 0.22, 0.2, 0.25, 0.08);
    ws.bezierCurveTo(0.27, 0.0, 0.18, -0.01, 0.13, -0.02);
    ws.bezierCurveTo(0.2, -0.08, 0.12, -0.17, 0.05, -0.12);
    ws.bezierCurveTo(0.02, -0.09, 0.0, -0.04, 0, 0);
    const wg = new THREE.ShapeGeometry(ws, 8);
    wg.rotateX(-Math.PI / 2);
    const wings = [1, -1].map((sx) => {
      const w = new THREE.Mesh(wg, wm);
      w.scale.x = sx;
      b.add(w);
      return w;
    });
    b.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.14, 2, 4), mat('#3b3129')).rotateX(Math.PI / 2));
    group.add(b);
    const cx = R(-8, 8), cz = R(-7, 7);
    return { b, wings, cx, cz, ph: R(0, TAU), sp: R(0.25, 0.45), rx: R(1.5, 3.5), rz: R(1.5, 3.5) };
  });
  const tmp = new V();
  updaters.push((t) => {
    for (const f of bflies) {
      const k = t * f.sp + f.ph;
      const pos = (kk) => tmp.set(f.cx + Math.sin(kk) * f.rx, 0.9 + 0.5 * Math.sin(kk * 2.3) + 0.3 * Math.sin(kk * 5.1), f.cz + Math.sin(kk * 0.7) * f.rz);
      f.b.position.copy(pos(k));
      f.b.lookAt(pos(k + 0.05));
      const flap = 0.25 + 1.0 * Math.abs(Math.sin(t * 13 + f.ph));
      f.wings[0].rotation.z = flap;
      f.wings[1].rotation.z = -flap;
    }
  });

  // ---- Birds, far off ----
  const birds = [0, 1, 2].map((i) => {
    const b = new THREE.Group();
    const wg = new THREE.PlaneGeometry(0.9, 0.22);
    wg.translate(0.45, 0, 0);
    wg.rotateX(-Math.PI / 2);
    const bm = new THREE.MeshBasicMaterial({ color: '#5a5550', side: THREE.DoubleSide, fog: true });
    const wings = [1, -1].map((sx) => { const w = new THREE.Mesh(wg, bm); w.scale.x = sx; b.add(w); return w; });
    scene.add(b);
    return { b, wings, ph: i * 0.7, r: 34 + i * 3, h: 17 + i * 1.5 };
  });
  updaters.push((t) => {
    for (const bd of birds) {
      const a = t * 0.07 + bd.ph;
      bd.b.position.set(Math.cos(a) * bd.r, bd.h + Math.sin(t * 0.5 + bd.ph) * 1.2, Math.sin(a) * bd.r - 10);
      bd.b.rotation.y = -a;
      const f = Math.sin(t * 5 + bd.ph * 3) * 0.5;
      bd.wings[0].rotation.z = f;
      bd.wings[1].rotation.z = -f;
    }
  });

  // ---- Drifting light motes (selective magic) ----
  {
    const N = 70;
    const pos = new Float32Array(N * 3);
    const base = [];
    for (let i = 0; i < N; i++) {
      const nearDoor = i < 40;
      const x = nearDoor ? R(-3.5, 3.5) : R(-11, 11);
      const z = nearDoor ? L.door[1] + R(-1.5, 3.5) : R(-11, 11);
      const y = nearDoor ? R(0.6, 6) : R(0.4, 3);
      base.push([x, y, z, R(0, TAU)]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const [sc, sg] = canvas(64, 64);
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,240,200,0.6)');
    grad.addColorStop(1, 'rgba(255,220,150,0)');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 64, 64);
    pm = new THREE.PointsMaterial({ size: 0.22, map: tex(sc), color: new THREE.Color(1, 0.88, 0.6).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, pm);
    group.add(pts);
    updaters.push((t) => {
      for (let i = 0; i < N; i++) {
        const [x, y, z, ph] = base[i];
        pos[i * 3] = x + Math.sin(t * 0.3 + ph) * 0.5;
        pos[i * 3 + 1] = y + Math.sin(t * 0.5 + ph * 2) * 0.4;
        pos[i * 3 + 2] = z + Math.cos(t * 0.25 + ph) * 0.5;
      }
      geo.attributes.position.needsUpdate = true;
      pm.opacity = (0.75 + 0.25 * Math.sin(t * 0.8)) * (1 + nightLevel * 0.6);
    });
  }

  world.addUpdater((t, dt) => { for (const u of updaters) u(t, dt); });

  const at = ([x, z]) => new V(x, 0, z);
  return {
    group,
    egg: eggApi,
    door: doorApi,
    setLightFocus,
    setTimeOfDay,
    // 0..1: how full the wildflower meadows are
    setFlowerDensity(f) { for (const m of meadow.meshes) m.count = Math.round(meadow.total * f); },
    nest,
    chest: chestApi,
    signpost,
    anchors: {
      home: at(L.home),
      nest: sanctuary.nest.clone(),
      door: sanctuary.door.clone(),
      nestling: at(L.nest), // where a new baby sleeps at home until it has a nest
      select: L.select.map(at),
    },
  };
}
