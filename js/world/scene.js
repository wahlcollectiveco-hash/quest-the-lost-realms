// Renderer, camera, orbit controls, post-processing, tap picking and tweens.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const easeOut = (p) => 1 - Math.pow(1 - p, 3);

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 900);
  camera.position.set(18, 14, 26);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.2, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 34;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.4;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.6;
  controls.panSpeed = 0.6;
  controls.screenSpacePanning = false;
  controls.autoRotateSpeed = 0.35;

  // Keep panning inside whichever little world we're looking at.
  const bounds = { center: new THREE.Vector3(), radius: 8 };
  controls.addEventListener('change', () => {
    const t = controls.target;
    const before = t.clone();
    const dx = t.x - bounds.center.x, dz = t.z - bounds.center.z;
    const r = Math.hypot(dx, dz);
    if (r > bounds.radius) { t.x = bounds.center.x + dx * bounds.radius / r; t.z = bounds.center.z + dz * bounds.radius / r; }
    t.y = THREE.MathUtils.clamp(t.y, bounds.center.y + 0.4, bounds.center.y + 6.5);
    camera.position.add(t.clone().sub(before));
  });

  // Bloom needs float render targets; fall back to a plain render without them.
  const gl = renderer.getContext();
  const canBloom = !new URLSearchParams(location.search).has('nobloom')
    && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  let composer = null;
  if (canBloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.6, 0.96));
    composer.addPass(new OutputPass());
  }
  let probeFrames = 5; // check the first frames only; getError stalls the GPU
  const render = () => {
    if (canvas.width < 2 || canvas.height < 2) return; // nothing to draw into (hidden or zero-size window)
    if (composer) {
      composer.render();
      if (probeFrames > 0) {
        probeFrames--;
        if (gl.getError() === gl.INVALID_FRAMEBUFFER_OPERATION) composer = null; // unsupported after all
      }
    } else {
      renderer.render(scene, camera);
    }
  };

  // ---- View offset (keeps the scene centred beside UI panels) ----
  const offset = { x: 0, y: 0, tx: 0, ty: 0 };
  let size = { w: 1, h: 1 };
  function applyOffset() {
    if (Math.abs(offset.x) < 0.5 && Math.abs(offset.y) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(size.w, size.h, offset.x, offset.y, size.w, size.h);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    size = { w, h };
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyOffset();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---- Update loop, tweens ----
  const updaters = new Set();
  const tweens = new Set();
  function tween(dur, fn, ease = easeInOut) {
    return new Promise((res) => tweens.add({ s: 0, dur, fn, ease, res }));
  }

  let flying = 0;
  let reducedMotion = false;
  async function flyTo(pos, target, dur = 1.8) {
    if (reducedMotion) dur = Math.min(dur, 0.45);
    const p0 = camera.position.clone();
    const t0 = controls.target.clone();
    const p1 = new THREE.Vector3(...pos);
    const t1 = new THREE.Vector3(...target);
    flying++;
    await tween(dur, (p) => {
      camera.position.lerpVectors(p0, p1, p);
      controls.target.lerpVectors(t0, t1, p);
      camera.lookAt(controls.target);
    });
    flying--;
  }

  // Gently keep an object (the dragon during focus) in view.
  let followObj = null;
  const followTmp = new THREE.Vector3();
  const followLift = new THREE.Vector3(0, 1, 0);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (const tw of tweens) {
      tw.s += dt;
      const p = Math.min(1, tw.s / tw.dur);
      tw.fn(tw.ease(p));
      if (p >= 1) { tweens.delete(tw); tw.res(); }
    }
    if (followObj && !flying) {
      const want = followObj.getWorldPosition(followTmp).add(followLift);
      const delta = want.sub(controls.target).multiplyScalar(1 - Math.exp(-dt * 1.2));
      controls.target.add(delta);
      camera.position.add(delta);
    }
    if (!flying) controls.update();
    const k = 1 - Math.exp(-dt * 5);
    offset.x += (offset.tx - offset.x) * k;
    offset.y += (offset.ty - offset.y) * k;
    applyOffset();
    for (const fn of updaters) fn(t, dt);
    render();
  });

  // ---- Tap picking ----
  const tappables = new Set();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function hitAt(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([...tappables].filter((o) => o.visible), true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.onTap) o = o.parent;
      if (o) return o;
    }
    return null;
  }

  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const held = performance.now() - down.t;
    down = null;
    if (moved > 8 || held > 600) return;
    const hit = hitAt(e.clientX, e.clientY);
    const now = performance.now();
    // Two quick taps on open ground: ask the dragon to walk there.
    if (!hit && lastTap && now - lastTap.t < 360 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 44) {
      lastTap = null;
      doubleTapHandler?.(e.clientX, e.clientY);
      return;
    }
    lastTap = hit ? null : { x: e.clientX, y: e.clientY, t: now };
    hit?.userData.onTap();
  });
  let lastTap = null;
  let doubleTapHandler = null;
  // Where a screen point meets the ground (a flat plane at height planeY).
  function groundPoint(x, y, planeY = 0) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const t = (planeY - ray.ray.origin.y) / ray.ray.direction.y;
    if (!(t > 0)) return null;
    return ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
  }
  let lastHover = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons || e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - lastHover < 90) return;
    lastHover = now;
    canvas.style.cursor = hitAt(e.clientX, e.clientY) ? 'pointer' : '';
  });

  return {
    scene,
    camera,
    controls,
    renderer,
    tween,
    flyTo,
    get aspect() { return size.w / size.h; },
    setOffset(x, y) { offset.tx = x; offset.ty = y; },
    follow(obj) { followObj = obj; },
    setReducedMotion(v) { reducedMotion = v; },
    onDoubleTap(fn) { doubleTapHandler = fn; },
    groundPoint,
    // Where a point in the world lands on screen (CSS pixels).
    toScreen(v) {
      const p = v.clone().project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height, visible: p.z < 1 };
    },
    setBounds(center, radius) { bounds.center.copy(center); bounds.radius = radius; },
    addUpdater: (fn) => updaters.add(fn),
    removeUpdater: (fn) => updaters.delete(fn),
    onTap(obj, fn) { obj.userData.onTap = fn; tappables.add(obj); },
    removeTap: (obj) => tappables.delete(obj),
  };
}
