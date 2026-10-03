// Looking after your dragon, just for fun: there are no needs that run
// down and nothing bad ever happens. A small button shows how they're
// feeling today (hungry, sleepy, adventurous…); doing the thing they're in
// the mood for makes them extra happy.
import * as THREE from 'three';
import { state, save, todayISO } from './state.js';
import { DRAGONS } from './data/dragons.js';
import { FEELINGS, HAPPY, CARE_ACTIONS, APPLE, FAVORITE_TREAT, treatById } from './data/life.js';
import { pantryList, useTreat } from './rewards.js';
import { SCENES } from './data/moments.js';
import { $, esc, openModal } from './ui/common.js';

const KEYS = Object.keys(FEELINGS);

// The same feeling all day, different from yesterday's.
function feelingFor(day, dragon) {
  let h = 7;
  for (const ch of `${day}:${dragon}`) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return KEYS[h % KEYS.length];
}
function today() {
  const day = todayISO();
  if (state.care?.day !== day || state.care?.dragon !== state.dragon) {
    let feeling = feelingFor(day, state.dragon);
    if (feeling === state.care?.feeling) feeling = KEYS[(KEYS.indexOf(feeling) + 1) % KEYS.length];
    state.care = { day, dragon: state.dragon, feeling, happy: false };
    save();
  }
  return state.care;
}

function heartTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ff8fb0';
  g.shadowColor = 'rgba(255,255,255,0.8)';
  g.shadowBlur = 6;
  g.beginPath();
  g.moveTo(32, 54);
  g.bezierCurveTo(4, 34, 10, 8, 32, 22);
  g.bezierCurveTo(54, 8, 60, 34, 32, 54);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createCare({ world, director, abilities, getCompanion, getWhere, isBusy, think, walkable, pond, splash, travelToVale, canTravel }) {
  const btn = $('#feel-btn');
  const heartTex = heartTexture();
  const name = () => DRAGONS[state.dragon]?.name || 'Your dragon';
  const id = () => (DRAGONS[state.dragon] ? state.dragon : 'pebble');

  function render() {
    if (!state.dragon) return;
    const c = today();
    const f = c.happy ? HAPPY : FEELINGS[c.feeling];
    btn.innerHTML = `<span class="feel-icon" aria-hidden="true">${f.icon}</span><span class="feel-text"><small>${esc(name())} feels</small>${esc(f.label)}</span>`;
    btn.setAttribute('aria-label', `${name()} is feeling ${f.label.toLowerCase()} today. Tap to look after them.`);
  }

  // Little hearts that float up from the dragon.
  function hearts(d, n = 7) {
    const base = d.head.getWorldPosition(new THREE.Vector3());
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
      s.scale.setScalar(0.001);
      world.scene.add(s);
      const ox = (Math.random() - 0.5) * 0.9, oz = (Math.random() - 0.5) * 0.6;
      setTimeout(() => world.tween(1.8, (p) => {
        s.position.set(base.x + ox + Math.sin(p * 6 + i) * 0.1, base.y + 0.2 + p * 1.2, base.z + oz);
        s.scale.setScalar(0.22 * Math.sin(Math.PI * Math.min(1, p * 1.4)) + 0.001);
        s.material.opacity = 1 - p * p;
      }, (p) => p).then(() => world.scene.remove(s)), i * 140);
    }
  }

  // Doing what they wanted today: an extra happy moment.
  function maybeDelight(action, d) {
    const c = today();
    if (c.happy || FEELINGS[c.feeling].want !== action) return false;
    c.happy = true;
    save();
    render();
    setTimeout(() => {
      d.react('celebrate');
      hearts(d, 10);
      think('That’s exactly what I needed today. Thank you!', { ms: 5000 });
    }, 600);
    return true;
  }

  const sceneCtx = (d, extra = {}) => ({
    think: (text, ms) => { think(text, { ms }); },
    sparkle: () => {},
    splash,
    ability: () => abilities.perform(d),
    walkable,
    showoffLine: '',
    ...extra,
  });

  async function act(action, treatId) {
    const d = getCompanion();
    if (!d || isBusy()) return;
    if (action === 'feed') {
      const t = treatById(treatId) || APPLE;
      useTreat(t.id);
      const fav = FAVORITE_TREAT[id()] === t.id;
      await director.scene('feed', d, sceneCtx(d, { treatColor: t.color, line: fav ? `${t.name}! My favourite in the whole world!` : `Mmm, ${t.name.toLowerCase()}. Thank you!` }));
      if (fav) hearts(d, 8);
      maybeDelight('feed', d);
    } else if (action === 'pet') {
      director.pause(d);
      d.react('tilt');
      hearts(d);
      think(pickPet(), { ms: 3600 });
      setTimeout(() => d.react('hop'), 1600);
      maybeDelight('pet', d);
    } else if (action === 'play') {
      const scenes = SCENES[id()].filter((s) => !s.haven || getWhere() === 'haven').filter((s) => s.id !== 'showoff');
      const s = scenes[Math.floor(Math.random() * scenes.length)];
      const done = director.scene(s.id, d, sceneCtx(d, {
        chest: new THREE.Vector3(-3.3, 0, -7.0), chestOpen: state.chestOpened, door: new THREE.Vector3(0, 0, -9.4),
      }));
      maybeDelight('play', d);
      await done;
    } else if (action === 'nap') {
      maybeDelight('nap', d);
      await director.scene('shortnap', d, sceneCtx(d));
    } else if (action === 'swim') {
      if (getWhere() !== 'haven') return think('The pond’s back home in the Haven. Let’s swim there later!', { ms: 4000 });
      await director.scene('swim', d, sceneCtx(d, { pond }));
      maybeDelight('swim', d);
    } else if (action === 'explore') {
      maybeDelight('explore', d);
      if (canTravel()) {
        think('Adventure! To Verdant Vale!', { ms: 2600 });
        setTimeout(travelToVale, 1200);
      } else {
        think(getWhere() === 'vale' ? 'Let’s see what’s over here…' : 'Let’s explore every corner of the Haven!', { ms: 3200 });
        director.start('exploring', d);
      }
    }
  }

  const PET = {
    pebble: ['Hehe. That tickles!', 'Right behind the ears. Perfect.', '*happy little purr*'],
    ember: ['Okay, okay, that’s nice. Don’t stop.', 'I’m a fearsome dragon. *leans in*', 'Hehe. Fine. You win.'],
    moon: ['Mmm. That’s lovely.', 'Your hands are warm.', '*a soft, sleepy hum*'],
  };
  const pickPet = () => { const l = PET[id()]; return l[Math.floor(Math.random() * l.length)]; };

  // The little panel: how they feel, and what you can do together.
  function open() {
    if (isBusy()) return;
    const c = today();
    const f = c.happy ? HAPPY : FEELINGS[c.feeling];
    const quote = c.happy ? 'I’m having a really good day.' : FEELINGS[c.feeling].say[id()];
    const m = openModal(`
      <div class="care">
        <div class="detail-head">
          <h2>${esc(name())} today</h2>
          <button class="icon-btn small" data-k="close" aria-label="Close">✕</button>
        </div>
        <div class="care-feel"><span class="care-icon">${f.icon}</span><div><p class="eyebrow">Feeling ${esc(f.label.toLowerCase())}</p><p class="care-quote">“${esc(quote)}”</p></div></div>
        <div class="care-actions">
          ${CARE_ACTIONS.map((a) => `<button class="care-btn ${!c.happy && FEELINGS[c.feeling].want === a.id ? 'wanted' : ''}" data-k="${a.id}"><span>${a.icon}</span>${esc(a.label)}</button>`).join('')}
        </div>
        <div class="care-treats" hidden></div>
        <p class="settings-note">Just for fun. ${esc(name())} never gets hungry or sad if you don’t.</p>
      </div>`, { className: 'detail care-modal', label: `Look after ${name()}` });
    m.el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]')?.dataset.k;
      const treat = e.target.closest('[data-treat]')?.dataset.treat;
      if (treat) { m.close(); act('feed', treat); return; }
      if (!k) return;
      if (k === 'close') return m.close();
      if (k === 'feed') {
        const box = m.el.querySelector('.care-treats');
        const list = [{ ...APPLE, count: null }, ...pantryList()];
        box.innerHTML = `<p class="eyebrow">Pick a treat</p><div class="treat-grid">${list.map((t) => `
          <button class="treat-btn ${FAVORITE_TREAT[id()] === t.id ? 'fav' : ''}" data-treat="${t.id}"><span>${t.icon}</span>${esc(t.name)}${t.count ? ` <small>×${t.count}</small>` : ''}</button>`).join('')}</div>
          ${pantryList().length ? '' : '<p class="settings-note">Finish Quests to find more treats.</p>'}`;
        box.hidden = false;
        return;
      }
      m.close();
      act(k);
    });
  }
  btn.addEventListener('click', open);
  // A new day can start while the app is open.
  setInterval(render, 60000);

  return { render, open, act, hearts };
}
