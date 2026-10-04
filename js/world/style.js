// The look of the world, in one place.
// Target: simple storybook shapes (bright, clean, a little anime) lit by warm
// golden light with cool, soft shadows. Lush, painterly, never neon.
//
//   toon()        — soft cel shading for everything solid
//   foliageGeo()  — leafy blobs, lighter on top and cooler underneath
//   makeGrass()   — thousands of blades that sway in the wind
//   flowerGeo()   — a little five-petal flower for meadows
//   makeWater()   — stylised water with sparkles and foam
//   paintCloud()  — big painted cumulus clouds
//   ENV           — light + time shared by the custom shaders
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;

// Shared by the grass and water shaders; updated with the time of day.
export const ENV = {
  uTime: { value: 0 },
  uSun: { value: new THREE.Color(1, 0.9, 0.7) },
  uAmb: { value: new THREE.Color(0.8, 0.9, 1) },
};

// ---- Soft cel shading ----
// Four gentle bands, blended a little at the edges so it reads as painted
// rather than hard-edged cartoon.
export const ramp = new THREE.DataTexture(new Uint8Array([78, 86, 128, 188, 232, 250, 255, 255]), 8, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.LinearFilter;
ramp.needsUpdate = true;

const cache = new Map();
export function toon(color, o = {}) {
  const key = (color?.isColor ? color.getHexString() : String(color)) + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  let m;
  if ((o.metalness ?? 0) >= 0.4) {
    // real shine for gold and metal
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...o });
  } else {
    const { roughness, metalness, flatShading, ...rest } = o;
    m = new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...rest });
  }
  cache.set(key, m);
  return m;
}

// ---- Characters: soft cel shading plus a warm rim of light ----
// The rim catches the edges of a character so they glow softly against the
// world, like the backlit figures in a storybook illustration.
export function rimToon(color, { rim = '#ffe7bf', strength = 0.42, power = 2.4, ...o } = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...o });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: new THREE.Color(rim) };
    sh.uniforms.rimStrength = { value: strength };
    sh.uniforms.rimPower = { value: power };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;\nuniform float rimPower;')
      .replace('#include <opaque_fragment>', `
        float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), rimPower);
        outgoingLight += rimColor * rimStrength * rimF;
        #include <opaque_fragment>`);
  };
  return m;
}

// ---- Painted ground ----
// A worn dirt path: dark soft edges where grass meets earth, a sandy middle
// and a pale trodden centre, with pebbles scattered along it.
export function paintPath(g, pts, toC, w, rand) {
  const stroke = (width, color, blur) => {
    g.save();
    g.filter = `blur(${blur}px)`;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = g.lineJoin = 'round';
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = toC(p.x, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
    g.restore();
  };
  stroke(w * 1.5, 'rgba(86,120,52,0.35)', 14); // trampled grass along the edges
  stroke(w * 1.18, 'rgba(176,142,92,0.85)', 9);
  stroke(w * 0.92, 'rgba(214,190,140,0.95)', 6);
  stroke(w * 0.45, 'rgba(236,220,178,0.75)', 5);
  for (const p of pts) {
    const [x, y] = toC(p.x, p.z);
    for (let k = 0; k < 3; k++) {
      g.fillStyle = rand() < 0.5 ? 'rgba(160,136,98,0.7)' : 'rgba(244,234,208,0.8)';
      g.beginPath();
      g.ellipse(x + (rand() - 0.5) * w * 1.1, y + (rand() - 0.5) * w * 1.1, 1.5 + rand() * 2.5, 1.2 + rand() * 1.8, rand() * 3, 0, TAU);
      g.fill();
    }
  }
}
// A patch of clover: little three-leaf sprigs and a few white flowers.
export function paintClover(g, x, y, r, rand) {
  for (let i = 0; i < 26; i++) {
    const a = rand() * TAU, d = Math.sqrt(rand()) * r;
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
    const s = 2.4 + rand() * 1.6;
    for (let k = 0; k < 3; k++) {
      const b = (k / 3) * TAU + rand();
      g.fillStyle = rand() < 0.5 ? 'rgba(70,128,52,0.85)' : 'rgba(92,150,62,0.85)';
      g.beginPath();
      g.arc(cx + Math.cos(b) * s, cy + Math.sin(b) * s, s, 0, TAU);
      g.fill();
    }
    if (rand() < 0.18) {
      g.fillStyle = 'rgba(255,252,240,0.95)';
      g.beginPath();
      g.arc(cx, cy, 2.6, 0, TAU);
      g.fill();
    }
  }
}
// Soft warm patches where the sun lands, and cool moss in the shade.
export function paintDapples(g, size, rand) {
  for (let i = 0; i < 16; i++) {
    const x = rand() * size, y = rand() * size, r = 60 + rand() * 120;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const warm = i % 3 !== 0;
    grad.addColorStop(0, warm ? 'rgba(246,226,140,0.22)' : 'rgba(46,92,60,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
// A pebble-ish stepping stone, sometimes with a little cushion of moss.
const mossMat = new THREE.MeshToonMaterial({ color: '#6aa646', gradientMap: ramp });
export function steppingStone(stoneMat, rand) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI / 2);
  const stone = new THREE.Mesh(geo, stoneMat);
  stone.scale.set(1, 0.09, 1);
  stone.receiveShadow = true;
  g.add(stone);
  if (rand() < 0.45) {
    const moss = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 6, 0, TAU, 0, Math.PI / 2), mossMat);
    const a = rand() * TAU;
    moss.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
    moss.scale.set(1, 0.32, 0.8);
    g.add(moss);
  }
  return g;
}

// ---- Foliage ----
// A wobbly sphere with baked colour: sunlit yellow-green on top, cool and a
// little darker underneath. Use with a material that has vertexColors: true.
export function foliageGeo(r, amt = 0.1, w = 28, h = 20) {
  const g = new THREE.SphereGeometry(r, w, h);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 3.1 / r + v.y * 1.7 / r) * Math.cos(v.z * 2.3 / r + v.x / r)
      + 0.5 * Math.sin(v.x * 6.3 / r) * Math.sin(v.z * 5.7 / r + v.y * 4.1 / r);
    v.multiplyScalar(1 + n * amt);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = nrm.getY(i) * 0.5 + 0.5; // 0 underneath … 1 on top
    const k = t * t;
    col[i * 3] = 0.6 + 0.62 * k; // golden on top
    col[i * 3 + 1] = 0.7 + 0.42 * k;
    col[i * 3 + 2] = 0.9 - 0.3 * k; // cool and blue underneath
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const leafCache = new Map();
export function leafMat(color) {
  if (!leafCache.has(color)) leafCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: ramp, vertexColors: true }));
  return leafCache.get(color);
}

// ---- Grass ----
// Instanced blades with a base-to-tip gradient and a gentle wind sway.
// `spots` is a list of [x, z] tuft positions; each tuft gets a few blades.
export function makeGrass(spots, { y = 0, shades = ['#69a84a', '#7dbb54', '#8fc95f', '#5a9842', '#a3d268'], perTuft = 4, height = 0.5 } = {}) {
  const geo = new THREE.PlaneGeometry(0.11, 1, 1, 3);
  geo.translate(0, 0.5, 0);
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: ENV.uTime, uSun: ENV.uSun, uAmb: ENV.uAmb },
    vertexShader: `
      uniform float uTime;
      varying float vH;
      varying vec3 vCol;
      #include <fog_pars_vertex>
      void main() {
        vH = uv.y;
        vCol = instanceColor;
        vec3 p = position;
        p.x *= 1.0 - uv.y * 0.88;                 // taper to a point
        p.z += uv.y * uv.y * 0.18;                // a slight natural bend
        vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
        float sway = sin(uTime * 1.5 + wp.x * 0.6 + wp.z * 0.8) * 0.08 + sin(uTime * 0.6 + wp.z * 0.25) * 0.05;
        wp.x += sway * uv.y * uv.y;
        wp.z += sway * 0.6 * uv.y * uv.y;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uSun;
      uniform vec3 uAmb;
      varying float vH;
      varying vec3 vCol;
      #include <fog_pars_fragment>
      void main() {
        vec3 c = mix(vCol * 0.55, vCol * 1.15 + vec3(0.06, 0.06, 0.0), vH);
        c *= uSun * 0.62 + uAmb * 0.5;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const count = spots.length * perTuft;
  const im = new THREE.InstancedMesh(geo, material, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  const pos = new THREE.Vector3(), scl = new THREE.Vector3();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let n = 0;
  for (const [x, z] of spots) {
    const tint = shades[Math.floor(rnd() * shades.length)];
    for (let k = 0; k < perTuft; k++) {
      e.set((rnd() - 0.5) * 0.5, rnd() * TAU, (rnd() - 0.5) * 0.5);
      const h = height * (0.55 + rnd() * 0.9);
      pos.set(x + (rnd() - 0.5) * 0.3, y, z + (rnd() - 0.5) * 0.3);
      scl.set(0.8 + rnd() * 0.8, h, 1);
      m4.compose(pos, q.setFromEuler(e), scl);
      im.setMatrixAt(n, m4);
      im.setColorAt(n, col.set(rnd() < 0.7 ? tint : shades[Math.floor(rnd() * shades.length)]));
      n++;
    }
  }
  im.frustumCulled = false;
  return im;
}

// ---- Wildflower: five petals and a centre, as one small mesh ----
export function flowerGeo() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const petal = new THREE.SphereGeometry(0.075, 7, 5);
    petal.scale(1, 0.38, 0.72);
    petal.rotateY(-a);
    petal.translate(Math.cos(a) * 0.085, 0, Math.sin(a) * 0.085);
    parts.push(petal);
  }
  const g = mergeGeometries(parts);
  return g;
}
export function flowerCentreGeo() {
  const c = new THREE.SphereGeometry(0.05, 7, 5);
  c.scale(1, 0.7, 1);
  c.translate(0, 0.02, 0);
  return c;
}

// ---- Water ----
// mode 0: pond (foam around the rim)   mode 1: stream (flows along its length)
// mode 2: waterfall (white streaks rushing down)
export function makeWater(mode, { deep = '#3f93b8', shallow = '#7fd0dc' } = {}) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: ENV.uTime, uSun: ENV.uSun, uAmb: ENV.uAmb,
      uMode: { value: mode },
      cDeep: { value: new THREE.Color(deep) },
      cShallow: { value: new THREE.Color(shallow) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform int uMode;
      uniform vec3 uSun, uAmb, cDeep, cShallow;
      varying vec2 vUv;
      varying vec3 vW;
      #include <fog_pars_fragment>
      void main() {
        vec3 light = uSun * 0.6 + uAmb * 0.55;
        vec3 c;
        if (uMode == 2) {
          // waterfall: soft white streaks sliding down
          float s = sin(vUv.x * 17.0 + sin(vUv.y * 4.0 + vUv.x * 3.0) * 2.2) * 0.5 + 0.5;
          float run = sin(vUv.y * 13.0 + uTime * 5.0 + sin(vUv.x * 11.0) * 2.0) * 0.5 + 0.5;
          c = mix(cShallow * 1.08, vec3(1.0), smoothstep(0.55, 1.0, s * 0.55 + run * 0.55) * 0.75);
          c = mix(c, vec3(1.0), smoothstep(0.75, 1.0, 1.0 - vUv.y) * 0.6); // froth at the bottom
        } else {
          // broad, slow bands of lighter and deeper water
          float n = sin(vW.x * 1.9 + uTime * 0.5) * sin(vW.z * 2.3 - uTime * 0.4);
          c = mix(cDeep, cShallow, smoothstep(-0.7, 0.9, n));
          float edge;
          if (uMode == 0) {
            float d = length(vUv - 0.5) * 2.0;
            float a = atan(vUv.y - 0.5, vUv.x - 0.5);
            edge = smoothstep(0.80, 0.97, d + 0.035 * sin(a * 14.0 + uTime * 1.2));
            c = mix(c, cShallow * 1.15, smoothstep(0.45, 0.85, d) * 0.5); // shallows near the bank
          } else {
            float e = abs(vUv.x - 0.5) * 2.0;
            edge = smoothstep(0.72, 0.98, e + 0.06 * sin(vUv.y * 9.0 - uTime * 2.0));
            float flow = sin(vUv.y * 11.0 - uTime * 2.6 + sin(vUv.x * 7.0) * 1.2) * 0.5 + 0.5;
            c = mix(c, vec3(1.0), smoothstep(0.86, 1.0, flow) * 0.35);
          }
          c = mix(c, vec3(1.0), edge * 0.75); // foam
          // sun sparkles
          float sp = sin(vW.x * 9.0 + uTime * 1.4) * sin(vW.z * 11.0 - uTime * 1.1) * sin((vW.x + vW.z) * 5.0 + uTime * 0.7);
          c += vec3(1.0, 0.97, 0.88) * smoothstep(0.86, 1.0, sp) * 0.7;
        }
        gl_FragColor = vec4(c * light, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// ---- Painted clouds ----
// A cumulus built from many soft dabs: bright where the sun hits, warm and
// shadowed underneath. Returns a texture for a large billboard.
export function paintCloud(seed = 1) {
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  let s = seed * 9973 + 17;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // puffs along a low base line, taller in the middle
  const puffs = [];
  const n = 10 + Math.floor(rnd() * 6);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const hump = Math.sin(t * Math.PI);
    puffs.push({ x: 60 + t * (W - 120) + (rnd() - 0.5) * 30, y: 178 - hump * (50 + rnd() * 50), r: 34 + hump * (36 + rnd() * 26) });
  }
  for (let i = 0; i < 9; i++) puffs.push({ x: 110 + rnd() * (W - 220), y: 150 - rnd() * 80, r: 30 + rnd() * 34 });
  const dab = (x, y, r, inner, outer) => {
    const grad = g.createRadialGradient(x, y, r * 0.1, x, y, r);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.75, inner);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  };
  // shadowed underside first, then the sunlit body, then bright top highlights
  for (const p of puffs) dab(p.x + 4, p.y + 14, p.r, 'rgba(206,196,222,0.95)', 'rgba(206,196,222,0)');
  for (const p of puffs) dab(p.x, p.y, p.r * 0.94, 'rgba(255,250,240,0.97)', 'rgba(255,250,240,0)');
  for (const p of puffs) dab(p.x - p.r * 0.2, p.y - p.r * 0.28, p.r * 0.55, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  // flatten the base into a soft warm edge
  const base = g.createLinearGradient(0, 185, 0, 235);
  base.addColorStop(0, 'rgba(0,0,0,0)');
  base.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = base;
  g.fillRect(0, 185, W, 71);
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
