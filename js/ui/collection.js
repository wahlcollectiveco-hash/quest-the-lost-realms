// Hatch & Treasures: the egg, hatched friends, and everything discovered.
// Also the small cards that reveal a new discovery or a new hatchling.
import { state } from '../state.js';
import { CATALOG, KINDS, inHaven } from '../data/discoveries.js';
import { paletteById } from '../data/creatures.js';
import { eggFraction, eggNeed, eggPalette, eggReady, eggStage, renameCreature } from '../rewards.js';
import { $, esc, openModal } from './common.js';
import { raising, wishCard, wishBaby } from '../wishes.js';
import { TREASURE_STORIES, TREATS } from '../data/life.js';
import { hasEgg } from '../wishes.js';
import { MOMENTS, momentSeen } from '../story.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

// Small hand-drawn-style icons, one shape per kind of discovery.
export function iconFor(item, found = true) {
  const c = found ? item.color : '#d8d0bf';
  const ink = found ? 'rgba(60,45,20,0.35)' : 'rgba(60,45,20,0.18)';
  const q = found ? '' : '<text x="24" y="30" text-anchor="middle" font-size="16" font-weight="800" fill="#a79d88" font-family="Nunito, sans-serif">?</text>';
  const shapes = {
    treasure: `<path d="M24 8l12 9-4 17H16l-4-17z" fill="${c}" stroke="${ink}" stroke-width="1.5"/><path d="M18 16l6-4 6 4-6 5z" fill="#fff" opacity="${found ? 0.45 : 0.25}"/>`,
    flower: `${[0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return `<circle cx="${24 + Math.cos(a) * 8}" cy="${22 + Math.sin(a) * 8}" r="6.5" fill="${c}" stroke="${ink}" stroke-width="1"/>`; }).join('')}<circle cx="24" cy="22" r="4.5" fill="${found ? '#f5d15c' : '#e6dfcf'}"/><path d="M24 30v12" stroke="${found ? '#6f9c4c' : '#cfc7b4'}" stroke-width="2.5"/>`,
    decoration: `<path d="M24 6v5" stroke="${ink}" stroke-width="2"/><rect x="15" y="11" width="18" height="4" rx="2" fill="${ink}"/><ellipse cx="24" cy="25" rx="10" ry="11" fill="${c}" stroke="${ink}" stroke-width="1.5"/><rect x="15" y="35" width="18" height="4" rx="2" fill="${ink}"/>`,
    key: `<circle cx="17" cy="24" r="8" fill="none" stroke="${c}" stroke-width="4"/><path d="M24 24h17M35 24v6M40 24v5" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
    map: `<path d="M8 12l10-4 12 4 10-4v28l-10 4-12-4-10 4z" fill="${found ? '#f1e2bd' : '#ece5d6'}" stroke="${ink}" stroke-width="1.5"/><path d="M13 30c5-8 10 2 15-6s8-4 9-8" fill="none" stroke="${found ? '#b0703f' : '#cfc7b4'}" stroke-width="1.6" stroke-dasharray="2.5 2.5"/>`,
    story: `<rect x="12" y="10" width="24" height="28" rx="2" fill="${found ? '#f6ebcf' : '#ece5d6'}" stroke="${ink}" stroke-width="1.5"/><path d="M17 18h14M17 23h14M17 28h9" stroke="${found ? '#b49a6a' : '#d6cdb9'}" stroke-width="1.6" stroke-linecap="round"/><rect x="9" y="7" width="30" height="5" rx="2.5" fill="${found ? '#d9c08a' : '#ddd5c4'}"/>`,
  };
  const body = shapes[item.kind] || shapes.treasure;
  return `<svg class="icon" viewBox="0 0 48 48" aria-hidden="true">${body}${item.kind === 'key' || item.kind === 'flower' ? '' : q}</svg>`;
}

// ---- The Old Map ----
// One drawing in four pieces. Each fragment you find reveals its quarter;
// missing quarters stay blank. `fresh` is the piece that was just found.
const MAP_PIECES = [
  { id: 'map-2', x: 0, y: 0 },    // mountains and the river (top left)
  { id: 'map-4', x: 100, y: 0 },  // the arch with a star (top right)
  { id: 'map-1', x: 0, y: 75 },   // the Vale (bottom left)
  { id: 'map-3', x: 100, y: 75 }, // the forest (bottom right)
];
const tree = (x, y, s = 1) => `<path d="M${x} ${y - 9 * s}l${5 * s} ${9 * s}h${-10 * s}z" fill="#7d9c5c" stroke="#5c7a42" stroke-width="0.6"/><path d="M${x} ${y}v${3 * s}" stroke="#7a5a36" stroke-width="1"/>`;
const peak = (x, y, s = 1) => `<path d="M${x - 11 * s} ${y}l${11 * s} ${-18 * s}l${11 * s} ${18 * s}z" fill="#c9bfa6" stroke="#8a7a5c" stroke-width="0.8"/><path d="M${x - 3.5 * s} ${y - 12 * s}l${3.5 * s} ${-6 * s}l${3.5 * s} ${6 * s}l${-3.5 * s} ${-2 * s}z" fill="#fbf6ea"/>`;
const MAP_ART = `
  <!-- the river, winding north from the Vale's pool -->
  <path d="M38 118c-6-14 10-20 4-34s-16-18-8-34s6-22 2-36" fill="none" stroke="#8fb9d6" stroke-width="3.2" stroke-linecap="round"/>
  <!-- the Vale -->
  <path d="M14 122c0-16 14-24 30-22s28 6 30 18s-12 20-30 20s-30-4-30-16z" fill="#b9d49a" stroke="#6f9156" stroke-width="1"/>
  <circle cx="40" cy="120" r="5" fill="#8fb9d6" stroke="#6a9bbd" stroke-width="0.7"/>
  ${tree(24, 122, 0.8)}${tree(58, 118, 0.8)}${tree(52, 132, 0.7)}
  <path d="M62 126h7v-5h-7zM64 121v-3M67 121v-4" fill="#d9cdb0" stroke="#8a7a5c" stroke-width="0.7"/>
  <text x="44" y="146" text-anchor="middle" font-size="6.5" font-style="italic" fill="#6b5330" font-family="Georgia, serif">Dragon Haven</text>
  <!-- mountains -->
  ${peak(70, 46, 1)}${peak(52, 52, 0.75)}${peak(86, 54, 0.7)}${peak(16, 40, 0.6)}
  <!-- the forest -->
  ${[[118, 96], [130, 90], [142, 98], [124, 108], [137, 110], [150, 106], [160, 96], [112, 118], [148, 120], [162, 114], [172, 104], [134, 124]].map(([x, y]) => tree(x, y)).join('')}
  <!-- the arch, the star, and somewhere beyond -->
  <path d="M146 50v-18a11 11 0 0122 0v18h-5v-18a6 6 0 00-12 0v18z" fill="#cfc6ae" stroke="#8a7a5c" stroke-width="0.8"/>
  <path d="M157 8l1.8 4.4 4.7.4-3.6 3 1.1 4.6-4-2.5-4 2.5 1.1-4.6-3.6-3 4.7-.4z" fill="#e9bf55" stroke="#b98a2c" stroke-width="0.6"/>
  <text x="157" y="62" text-anchor="middle" font-size="5.5" font-style="italic" fill="#6b5330" font-family="Georgia, serif">The Ancient Door</text>
  <text x="186" y="14" text-anchor="middle" font-size="9" fill="#b0703f" font-family="Georgia, serif">?</text>
  <!-- the dotted path: from the Vale, through the wood, to the Door and beyond -->
  <path d="M70 124c16 4 26-10 42-8s18-18 30-22s10-20 14-36" fill="none" stroke="#b0703f" stroke-width="1.5" stroke-dasharray="3 3" stroke-linecap="round"/>
  <path d="M157 30c4-8 14-10 24-16" fill="none" stroke="#b0703f" stroke-width="1.5" stroke-dasharray="3 3" stroke-linecap="round"/>
  <!-- compass -->
  <g transform="translate(184 132)" stroke="#8a7a5c" stroke-width="0.7" fill="none"><circle r="8"/><path d="M0-10v20M-10 0h20"/><path d="M0-8l2 8-2 8-2-8z" fill="#b0703f" stroke="none"/></g>
  <text x="184" y="120" text-anchor="middle" font-size="5" fill="#6b5330" font-family="Georgia, serif">N</text>`;

export function mapSVG(fresh = null) {
  const found = MAP_PIECES.filter((p) => state.found[p.id]);
  const clips = MAP_PIECES.map((p, i) => `<clipPath id="mapc${i}"><rect x="${p.x}" y="${p.y}" width="100" height="75"/></clipPath>`).join('');
  const pieces = MAP_PIECES.map((p, i) => {
    if (!state.found[p.id]) {
      return `<rect x="${p.x + 3}" y="${p.y + 3}" width="94" height="69" rx="4" fill="rgba(120,100,60,0.07)" stroke="rgba(120,100,60,0.35)" stroke-width="1" stroke-dasharray="4 4"/>
        <text x="${p.x + 50}" y="${p.y + 44}" text-anchor="middle" font-size="18" font-weight="800" fill="rgba(120,100,60,0.35)" font-family="Nunito, sans-serif">?</text>`;
    }
    return `<g clip-path="url(#mapc${i})" class="${p.id === fresh ? 'map-fresh' : ''}">
      <rect x="${p.x}" y="${p.y}" width="100" height="75" fill="#f1e2bd"/>${MAP_ART}
      <rect x="${p.x + 0.75}" y="${p.y + 0.75}" width="98.5" height="73.5" fill="none" stroke="${p.id === fresh ? '#c99a3e' : 'rgba(120,90,40,0.3)'}" stroke-width="${p.id === fresh ? 2.5 : 1}"/>
    </g>`;
  }).join('');
  return `<svg class="old-map" viewBox="0 0 200 150" role="img" aria-label="The old map: ${found.length} of ${MAP_PIECES.length} pieces found">
    <defs>${clips}</defs>
    <rect width="200" height="150" rx="5" fill="#e9dfc6"/>
    ${pieces}
  </svg>`;
}

function eggSVG(tint, warmth) {
  const cracks = warmth >= 0.6 ? `<path d="M22 50l6-5-3-6 7-4-2-6" fill="none" stroke="#e7b347" stroke-width="2" opacity="${Math.min(1, (warmth - 0.6) * 2.5)}"/>` : '';
  return `<svg class="egg-svg" viewBox="0 0 80 100" aria-hidden="true">
    <defs><radialGradient id="eggGrad" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="${tint}"/></radialGradient>
    <radialGradient id="eggGlow"><stop offset="0" stop-color="#ffe3a0" stop-opacity="${0.15 + warmth * 0.55}"/><stop offset="1" stop-color="#ffe3a0" stop-opacity="0"/></radialGradient></defs>
    <circle cx="40" cy="55" r="48" fill="url(#eggGlow)"/>
    <ellipse cx="40" cy="56" rx="27" ry="36" fill="url(#eggGrad)" stroke="rgba(90,70,30,0.15)"/>
    <path d="M20 58c7 3 13-3 20 0s13 3 20 0" fill="none" stroke="#e0b95a" stroke-width="1.6" opacity="${0.3 + warmth * 0.6}"/>
    ${cracks}
  </svg>`;
}

export function createCollection({ getDragonName, onHatch, onShowItem, onReplay, onPlace }) {
  let tab = 'eggs';

  function eggsTab() {
    if (raising()) return raisingTab();
    if (!hasEgg()) {
      return `<div class="egg-card"><div class="egg-info">
          <p class="eyebrow">No egg right now</p>
          <p class="egg-stage">The star egg has hatched. One egg comes from each realm, so the next one will come from behind the Door.</p>
        </div></div>
        <h3 class="coll-h">Hatched friends</h3>
        <ul class="template-list">${friendsHTML()}</ul>
        ${extrasHTML()}`;
    }
    const pal = eggPalette();
    const f = eggFraction();
    const ready = eggReady();
    const warmthPct = Math.round(f * 100);
    const friends = state.creatures.map((c) => {
      const p = paletteById(c.palette);
      const date = new Date(c.hatchedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `<li data-creature="${c.id}">
        <span class="baby-dot" style="background:${hex(p.body)}"></span>
        <div class="t-info"><span class="t-name">${esc(c.name)}</span><span class="t-meta">${p.label} dragon · hatched ${date}</span></div>
        <button class="btn ghost small" data-c="rename" data-id="${c.id}">Rename</button>
      </li>`;
    }).join('');
    return `
      <div class="egg-card">
        ${eggSVG(pal.egg, f)}
        <div class="egg-info">
          <p class="eyebrow">The star egg, in Dragon Haven</p>
          <p class="egg-stage">${esc(eggStage())}</p>
          <div class="warmth" role="img" aria-label="Warmth ${warmthPct}%"><i style="width:${warmthPct}%"></i></div>
          <p class="t-meta">Warmth ${Math.round(state.hatch.warmth)} of ${eggNeed()}</p>
          ${ready ? '<button class="btn primary glow" data-c="hatch">Hatch the egg</button>' : ''}
        </div>
      </div>
      <h3 class="coll-h">Hatched friends</h3>
      ${friends ? `<ul class="template-list">${friends}</ul>` : '<p class="coll-empty">No one yet. Finish Quests to keep the egg warm.</p>'}
      ${extrasHTML()}`;
  }

  function friendsHTML() {
    return state.creatures.map((c) => {
      const p = paletteById(c.palette);
      const date = new Date(c.hatchedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `<li data-creature="${c.id}">
        <span class="baby-dot" style="background:${hex(p.body)}"></span>
        <div class="t-info"><span class="t-name">${esc(c.name)}</span><span class="t-meta">${p.label} dragon · hatched ${date}</span></div>
        <button class="btn ghost small" data-c="rename" data-id="${c.id}">Rename</button>
      </li>`;
    }).join('');
  }

  // Visitors who moved in, and the treats saved for your dragon.
  function extrasHTML() {
    const pantry = TREATS.filter((t) => state.pantry?.[t.id] > 0);
    return `<h3 class="coll-h">Treats</h3>
      ${pantry.length ? `<ul class="treat-list">${pantry.map((t) => `<li><span aria-hidden="true">${t.icon}</span>${esc(t.name)} <small>×${state.pantry[t.id]}</small></li>`).join('')}</ul>` : '<p class="coll-empty">No treats saved right now. Finish Quests to find some.</p>'}`;
  }

  // No egg yet: the newest baby is still settling in.
  function raisingTab() {
    const w = wishCard();
    const baby = wishBaby();
    return `
      <div class="egg-card">
        <span class="baby-dot big" style="background:${hex(paletteById(baby?.palette).body)}"></span>
        <div class="egg-info">
          <p class="eyebrow">${esc(baby?.name || 'The little one')} is settling in</p>
          <p class="egg-stage">${esc(w.text)}</p>
          <p class="t-meta">${esc(w.progress)}</p>
          <p class="t-meta">A new egg will appear once ${esc(baby?.name || 'the little one')} is all settled.</p>
        </div>
      </div>
      <h3 class="coll-h">Hatched friends</h3>
      <ul class="template-list">${friendsHTML()}</ul>
      ${extrasHTML()}`;
  }

  function gridTab(kinds, { showHaven = false } = {}) {
    return kinds.map((kind) => {
      const items = CATALOG.filter((c) => c.kind === kind && (!c.special || state.found[c.id]));
      const n = items.filter((c) => state.found[c.id]).length;
      return `<h3 class="coll-h">${KINDS[kind].label} <span>${n} of ${items.length}</span></h3>
        <ul class="coll-grid">
          ${items.map((it) => {
            const found = !!state.found[it.id];
            return `<li class="${found ? 'found' : ''}">
              ${iconFor(it, found)}
              <span class="c-name">${found ? esc(it.name) : 'Not yet found'}</span>
              ${found ? `<span class="c-desc">${esc(it.desc)}</span>` : ''}
              ${found && it.kind === 'treasure' && TREASURE_STORIES[it.id] ? `<span class="c-tale">${esc(state.story.heard.quill?.[`t-${it.id}`] ? `Quill says: “${TREASURE_STORIES[it.id][TREASURE_STORIES[it.id].length - 1]}”` : 'Quill knows its story. Ask in Dragon Haven.')}</span>` : ''}
              ${found && showHaven && inHaven(it) && (state.unplaced || []).includes(it.id) ? `<button class="btn primary small" data-c="place" data-id="${it.id}">Place it</button>` : ''}
              ${found && showHaven && inHaven(it) && !(state.unplaced || []).includes(it.id) ? `<span class="c-links"><button class="link-btn" data-c="show" data-id="${it.id}">See it</button>${it.id !== 'dewdrop-lily' ? `<button class="link-btn" data-c="place" data-id="${it.id}">Move it</button>` : ''}</span>` : ''}
            </li>`;
          }).join('')}
        </ul>`;
    }).join('');
  }

  function loreTab() {
    const maps = CATALOG.filter((c) => c.kind === 'map');
    const mapsFound = maps.filter((m) => state.found[m.id]).length;
    const keys = CATALOG.filter((c) => c.kind === 'key');
    const stories = CATALOG.filter((c) => c.kind === 'story' && (!c.special || state.found[c.id]));
    return `
      <h3 class="coll-h">The Old Map <span>${mapsFound} of ${maps.length}</span></h3>
      ${mapSVG()}
      <p class="coll-note">${mapsFound === maps.length
        ? 'The map is complete. A dotted path leads from the Ancient Door toward somewhere new…'
        : 'Pieces of an old map. What does it show when it’s whole?'}</p>
      <h3 class="coll-h">Keys</h3>
      <ul class="coll-grid">${keys.map((k) => `<li class="${state.found[k.id] ? 'found' : ''}">${iconFor(k, !!state.found[k.id])}<span class="c-name">${state.found[k.id] ? esc(k.name) : 'Not yet found'}</span>${state.found[k.id] ? `<span class="c-desc">${esc(state.chestOpened ? 'It opened the old chest by the Door.' : k.desc)}</span>` : ''}</li>`).join('')}</ul>
      <h3 class="coll-h">Story Moments <span>${Object.keys(MOMENTS).filter(momentSeen).length} of ${Object.keys(MOMENTS).length}</span></h3>
      <ul class="template-list moments">
        ${Object.entries(MOMENTS).map(([id, mo]) => (momentSeen(id)
          ? `<li><div class="t-info"><span class="t-name">${esc(mo.title)}</span></div><button class="btn ghost small" data-c="replay" data-id="${id}">Watch again</button></li>`
          : '<li class="locked"><div class="t-info"><span class="t-name">…</span><span class="t-meta">Not yet seen</span></div></li>')).join('')}
      </ul>
      <h3 class="coll-h">Story Fragments <span>${stories.filter((s) => state.found[s.id]).length} of ${stories.length}</span></h3>
      <ol class="story-list">
        ${stories.map((s) => (state.found[s.id]
          ? `<li class="found"><span class="c-name">${esc(s.name)}</span><p>${esc(s.text)}</p></li>`
          : '<li><span class="c-name">…</span><p>A page still waiting to be found.</p></li>')).join('')}
      </ol>`;
  }

  function open(startTab = tab) {
    tab = startTab;
    const m = openModal('<div class="collection"></div>', { className: 'collection-modal', label: 'Hatch and Treasures' });
    const root = $('.collection', m.el);
    const TABS = [['eggs', 'Friends'], ['treasures', 'Treasures'], ['garden', 'Garden'], ['lore', 'Lore']];
    function draw() {
      const body = tab === 'eggs' ? eggsTab()
        : tab === 'treasures' ? gridTab(['treasure'])
          : tab === 'garden' ? gridTab(['flower', 'decoration'], { showHaven: true })
            : loreTab();
      root.innerHTML = `
        <div class="detail-head">
          <h2>Hatch &amp; Treasures</h2>
          <button class="icon-btn small" data-c="close" aria-label="Close">✕</button>
        </div>
        <div class="tabs" role="tablist">
          ${TABS.map(([id, label]) => `<button role="tab" aria-selected="${tab === id}" class="${tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}
        </div>
        <div class="tab-body">${body}</div>`;
    }
    draw();
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.tab) { tab = b.dataset.tab; draw(); return; }
      const act = b.dataset.c;
      if (act === 'close') m.close();
      if (act === 'hatch') { m.close(); onHatch(); }
      if (act === 'show') { m.close(); onShowItem(b.dataset.id); }
      if (act === 'place') { m.close(); onPlace?.(b.dataset.id); }
      if (act === 'replay') { m.close(); onReplay?.(b.dataset.id); }
      if (act === 'rename') {
        const li = b.closest('li');
        const c = state.creatures.find((x) => x.id === b.dataset.id);
        li.querySelector('.t-info').innerHTML = `<input class="rename-input" value="${esc(c.name)}" maxlength="24" aria-label="New name">`;
        b.textContent = 'Save';
        b.dataset.c = 'save-name';
        li.querySelector('input').focus();
      } else if (act === 'save-name') {
        const input = b.closest('li').querySelector('input');
        renameCreature(b.dataset.id, input.value);
        draw();
      }
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('.rename-input')) e.target.closest('li').querySelector('[data-c="save-name"]').click();
    });
  }

  // ---- Discovery reveal ----
  const card = $('#discovery');
  let resolveCard = null;
  function hideDiscovery() {
    card.classList.remove('show');
    resolveCard?.();
    resolveCard = null;
  }
  // Shows one discovery and waits until it's tapped. The card sits low on the
  // screen so the thing itself stays visible in the world above it.
  function showDiscovery(it, { more = false, placeLater = false } = {}) {
    hideDiscovery();
    const name = getDragonName();
    const eyebrow = {
      treasure: `${name} found a treasure!`,
      flower: 'Something new is blooming',
      decoration: 'Something new for your home',
      key: `${name} dug up a key!`,
      map: 'A piece of an old map!',
      story: 'A story fragment',
    }[it.kind];
    const mapDone = it.kind === 'map' && CATALOG.filter((c) => c.kind === 'map').every((c) => state.found[c.id]);
    card.classList.toggle('with-map', it.kind === 'map');
    card.innerHTML = `
      ${it.kind === 'map' ? mapSVG(it.id) : iconFor(it)}
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h3>${esc(it.name)}</h3>
      <p class="disc-desc ${it.kind === 'story' ? 'story' : ''}">${esc(it.kind === 'story' ? it.text : it.desc)}</p>
      ${mapDone ? '<p class="disc-desc">The map is complete! A dotted path leads beyond the Ancient Door…</p>' : ''}
      ${TREASURE_STORIES[it.id] ? '<p class="disc-note">Quill in Dragon Haven knows the story behind this one. Go and ask!</p>' : ''}
      <div class="disc-actions">
        <button class="btn primary" data-disc="ok">${more ? 'Next' : inHaven(it) ? (placeLater ? 'Choose a spot' : 'Nice!') : 'Collect'}</button>
      </div>`;
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');
    return new Promise((resolve) => {
      resolveCard = resolve;
      card.onclick = (e) => {
        if (e.target.closest('[data-disc="ok"]')) hideDiscovery();
      };
    });
  }

  // A general reward card (treats, visitors, Haven things). Waits for a tap.
  function showCard({ icon, eyebrow, title, desc, note, button = 'Nice!' }) {
    hideDiscovery();
    card.classList.remove('with-map');
    card.innerHTML = `
      ${icon.startsWith('<') ? icon : `<span class="card-emoji" aria-hidden="true">${icon}</span>`}
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h3>${esc(title)}</h3>
      ${desc ? `<p class="disc-desc">${esc(desc)}</p>` : ''}
      ${note ? `<p class="disc-note">${esc(note)}</p>` : ''}
      <div class="disc-actions"><button class="btn primary" data-disc="ok">${esc(button)}</button></div>`;
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');
    return new Promise((resolve) => {
      resolveCard = resolve;
      card.onclick = (e) => { if (e.target.closest('[data-disc="ok"]')) hideDiscovery(); };
    });
  }

  // ---- New hatchling card ----
  function showHatchling(creature) {
    return new Promise((resolve) => {
      const p = paletteById(creature.palette);
      const el = $('#hatch-card');
      el.innerHTML = `
        <p class="eyebrow">The egg hatched!</p>
        <span class="baby-dot big" style="background:${hex(p.body)}"></span>
        <h3>Meet <span class="baby-name">${esc(creature.name)}</span></h3>
        <p class="disc-desc">A tiny ${p.label.toLowerCase()} dragon, blinking at the world for the first time.</p>
        <label class="field"><span class="label">Give them a different name? <small>optional</small></span>
          <input class="rename-input" value="${esc(creature.name)}" maxlength="24"></label>
        <div class="disc-actions"><button class="btn primary" data-h="ok">Welcome home</button></div>`;
      el.classList.add('show');
      const input = el.querySelector('input');
      const done = () => {
        const name = input.value.trim() || creature.name;
        renameCreature(creature.id, name);
        el.classList.remove('show');
        resolve(name);
      };
      el.querySelector('[data-h="ok"]').onclick = done;
      input.onkeydown = (e) => { if (e.key === 'Enter') done(); };
    });
  }

  return { open, showDiscovery, showCard, hideDiscovery, showHatchling };
}
