// Today's Quests panel, energy check-in, Choose My Next Quest, Quest detail,
// the create/edit form (also used for templates), and the template manager.
import {
  state, subscribe, addQuest, updateQuest, deleteQuest, completeQuest, reopenQuest,
  toggleStep, addStep, getQuest, todayISO, addDays, isOverdue, uid,
  getTemplate, saveTemplate, deleteTemplate, questDraftFromTemplate, todaysEnergy, setEnergy,
} from '../state.js';
import { rankQuests, reasonText, TIME_OPTIONS } from '../next.js';
import { eggReady } from '../rewards.js';
import { $, $$, esc, openModal, fmtDate, say } from './common.js';

const PRI = { high: 0, normal: 1, low: 2 };
const MINUTES = [5, 10, 15, 25, 45, 60];
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/></svg>';

export const ENERGY = [
  { v: 'low', label: 'Low', n: 1 },
  { v: 'okay', label: 'Okay', n: 2 },
  { v: 'good', label: 'Good', n: 3 },
  { v: 'full', label: 'Full Power', n: 4 },
];
const energyLabel = (v) => ENERGY.find((e) => e.v === v)?.label;
const pips = (n) => `<span class="pips" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

function sortQuests(a, b) {
  return (isOverdue(b) - isOverdue(a))
    || (PRI[a.priority] - PRI[b.priority])
    || ((a.due ? 0 : 1) - (b.due ? 0 : 1))
    || (a.createdAt - b.createdAt);
}

function badges(q) {
  const out = [];
  if (q.type === 'focus') out.push(`<span class="badge focus">Focus · ${q.minutes || 25} min</span>`);
  else if (q.minutes) out.push(`<span class="badge">~${q.minutes} min</span>`);
  if (q.priority === 'high') out.push('<span class="badge important">Important</span>');
  if (!q.done) {
    if (isOverdue(q)) out.push('<span class="badge carried">Carried over</span>');
    else if (q.due === todayISO()) out.push('<span class="badge">Today</span>');
    else if (q.due) out.push(`<span class="badge">${fmtDate(q.due)}</span>`);
  }
  if (q.focusMs) out.push(`<span class="badge focus-time">${Math.max(1, Math.round(q.focusMs / 60000))} min focused</span>`);
  if (q.steps.length) {
    const d = q.steps.filter((s) => s.done).length;
    out.push(`<span class="badge steps">${d}/${q.steps.length} steps</span>`);
  }
  return out.join('');
}

function templateMeta(t) {
  const bits = [t.type === 'focus' ? `Focus · ${t.minutes || 25} min` : t.minutes ? `~${t.minutes} min` : 'Action'];
  if (t.steps.length) bits.push(`${t.steps.length} steps`);
  return bits.join(' · ');
}

function questItem(q) {
  return `<li class="quest ${q.done ? 'done' : ''} pri-${q.priority}" data-id="${q.id}">
    <button class="check" data-act="toggle" aria-label="${q.done ? 'Mark not done' : 'Complete'}: ${esc(q.title)}">${CHECK}</button>
    <button class="quest-main" data-act="open">
      <span class="q-title">${esc(q.title)}</span>
      <span class="q-meta">${badges(q)}</span>
    </button>
    ${q.type === 'focus' && !q.done ? `<button class="play" data-act="focus" aria-label="Start Focus Quest: ${esc(q.title)}">${PLAY}</button>` : ''}
  </li>`;
}

export function initQuestUI({ onComplete, onStartFocus, onEnergy, onGo, onHatch }) {
  const list = $('#quest-list');
  const panel = $('#quest-panel');
  const openSections = { later: false, done: false };

  $('#today-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // (The daily energy check-in used to live here. It now only appears, as an
  // optional question, inside Choose My Next Quest, where it actually matters.)
  function toolsHTML(openCount) {
    let html = '';
    if (eggReady()) {
      html += `<button class="hatch-ready" data-tool="hatch">${SPARK}<span>Your egg is ready to hatch!</span></button>`;
    }
    if (openCount) {
      html += `<button class="choose-next" data-tool="next">${SPARK}<span>Choose My Next Quest</span></button>`;
    }
    return html ? `<div class="panel-tools">${html}</div>` : '';
  }

  function render() {
    const t = todayISO();
    const open = state.quests.filter((q) => !q.done);
    const today = open.filter((q) => !q.due || q.due <= t).sort(sortQuests);
    const later = open.filter((q) => q.due && q.due > t).sort((a, b) => a.due.localeCompare(b.due));
    const doneToday = state.quests
      .filter((q) => q.done && q.completedAt && todayISO(new Date(q.completedAt)) === t)
      .sort((a, b) => b.completedAt - a.completedAt);

    let html = toolsHTML(today.length);
    if (today.length) {
      html += `<ul class="quest-list">${today.map(questItem).join('')}</ul>`;
    } else if (doneToday.length) {
      html += `<div class="empty"><p class="empty-title">All of today's Quests are done.</p><p>Go enjoy the real world. Your dragon will keep the Haven warm.</p></div>`;
    } else {
      html += `<div class="empty"><p class="empty-title">No Quests yet.</p><p>Add something small. Even “drink a glass of water” counts.</p></div>`;
    }
    if (later.length) {
      html += `<details class="section" data-sec="later" ${openSections.later ? 'open' : ''}><summary>Later <span>${later.length}</span></summary><ul class="quest-list">${later.map(questItem).join('')}</ul></details>`;
    }
    if (doneToday.length) {
      html += `<details class="section" data-sec="done" ${openSections.done ? 'open' : ''}><summary>Completed today <span>${doneToday.length}</span></summary><ul class="quest-list">${doneToday.map(questItem).join('')}</ul></details>`;
    }
    list.innerHTML = html;
    $('#quests-title').dataset.count = today.length ? String(today.length) : '';
  }

  // Bring one Quest into view with a soft glow.
  function spotlight(id) {
    if (getSheet() === 'peek') setSheet('half');
    const li = list.querySelector(`.quest[data-id="${id}"]`);
    if (!li) return;
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    li.classList.remove('spotlight');
    void li.offsetWidth;
    li.classList.add('spotlight');
  }

  list.addEventListener('toggle', (e) => {
    const d = e.target.closest('details[data-sec]');
    if (d) openSections[d.dataset.sec] = d.open;
  }, true);

  list.addEventListener('click', (e) => {
    if (e.target.closest('[data-tool="next"]')) return openNext();
    if (e.target.closest('[data-tool="hatch"]')) return onHatch?.();

    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const li = btn.closest('.quest');
    const q = getQuest(li.dataset.id);
    if (!q) return;
    if (btn.dataset.act === 'open') return openDetail(q.id);
    if (btn.dataset.act === 'focus') return onStartFocus(q.id);
    if (q.done) return reopenQuest(q.id);
    li.classList.add('completing');
    setTimeout(() => { completeQuest(q.id); onComplete(q); }, 420);
  });

  $('#new-quest').addEventListener('click', () => openForm());

  // ---- The panel as a sheet you can pull up, down, or out of the way ----
  //   peek — tucked away so the world is in full view
  //   half — the usual size
  //   full — tall, for long lists (phones only)
  const toggle = $('#panel-toggle');
  const isPhone = () => window.innerWidth < 820;
  const getSheet = () => panel.dataset.sheet || 'half';
  function setSheet(s) {
    if (s === 'full' && !isPhone()) s = 'half';
    panel.dataset.sheet = s;
    document.body.dataset.sheet = s;
    panel.style.height = '';
    toggle.setAttribute('aria-expanded', String(s !== 'peek'));
  }
  setSheet(getSheet());
  $('#panel-reopen').addEventListener('click', () => setSheet('half'));

  // Drag the top of the panel (phones). A simple tap toggles it.
  const head = $('.panel-head', panel);
  let drag = null;
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button:not(.panel-grip)')) return;
    drag = { y: e.clientY, h: panel.offsetHeight, moved: false, onGrip: !!e.target.closest('.panel-grip') };
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', (e) => {
    if (!drag || !isPhone()) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    panel.classList.add('dragging');
    panel.style.height = `${Math.max(44, Math.min(window.innerHeight * 0.9, drag.h - dy))}px`;
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    panel.classList.remove('dragging');
    if (!d.moved || !isPhone()) {
      // tap: tuck away, or bring back
      // (on a computer only the little handle does this, not the whole header)
      if (e.type === 'pointerup' && (isPhone() || d.onGrip)) setSheet(getSheet() === 'peek' ? 'half' : 'peek');
      return;
    }
    const h = panel.offsetHeight;
    const vh = window.innerHeight;
    const snaps = { peek: 48, half: vh * 0.46, full: vh * 0.88 };
    const nearest = Object.entries(snaps).sort((a, b) => Math.abs(a[1] - h) - Math.abs(b[1] - h))[0][0];
    setSheet(nearest);
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);

  // ---- Choose My Next Quest ----
  function openNext() {
    const m = openModal('<div class="next-quest"></div>', { className: 'next', label: 'Choose My Next Quest' });
    const root = $('.next-quest', m.el);
    let available = null;
    let ranked = [];
    let idx = 0;

    function askView() {
      const e = todaysEnergy();
      root.innerHTML = `
        <div class="detail-head">
          <h2>Choose My Next Quest</h2>
          <button class="icon-btn small" data-n="close" aria-label="Close">✕</button>
        </div>
        <p class="next-intro">Too many choices? Answer one quick question and ${esc(dragonName())} will pick one thing for you.</p>
        ${e?.level ? '' : `
          <div class="field">
            <span class="label">How's your energy? <small>optional</small></span>
            <div class="chips energy-chips" data-group="energy">
              ${ENERGY.map((x) => `<button type="button" data-v="${x.v}" class="${e?.level === x.v ? 'on' : ''}">${pips(x.n)} ${x.label}</button>`).join('')}
            </div>
          </div>`}
        <div class="field">
          <span class="label">How much time do you have?</span>
          <div class="time-options" data-group="time">
            ${TIME_OPTIONS.map((o, i) => `<button type="button" data-i="${i}">${o.label}</button>`).join('')}
          </div>
        </div>`;
    }

    function suggestionView() {
      const s = ranked[idx];
      if (!s) {
        root.innerHTML = `
          <div class="detail-head"><h2>That's everything</h2><button class="icon-btn small" data-n="close" aria-label="Close">✕</button></div>
          <p class="next-intro">You've seen every open Quest. Maybe the best next step is a little rest. ${esc(dragonName())} thinks so too.</p>
          <div class="detail-actions"><button class="btn ghost" data-n="restart">Start over</button><button class="btn primary" data-n="close">Okay</button></div>`;
        return;
      }
      const q = s.quest;
      const tooBig = available !== Infinity && s.est > available && !s.step;
      const reason = tooBig
        ? `Nothing fits perfectly in ${available} minutes, so this is the closest.`
        : reasonText(s);
      const goLabel = q.type === 'focus' && !s.step ? `${PLAY} Start Focus · ${q.minutes || 25} min` : `${CHECK} Let's go`;
      root.innerHTML = `
        <div class="detail-head">
          <p class="eyebrow">Your next Quest</p>
          <button class="icon-btn small" data-n="close" aria-label="Close">✕</button>
        </div>
        <h2 class="detail-title">${esc(q.title)}</h2>
        ${s.step ? `<p class="just-step">Just this step: <b>${esc(s.step.text)}</b></p>` : ''}
        <div class="q-meta">${badges(q)}</div>
        <p class="reason">${esc(reason)}</p>
        <div class="detail-actions">
          <button class="btn ghost" data-n="other">Something else</button>
          <button class="btn primary" data-n="go">${goLabel}</button>
        </div>
        <button class="link-btn" data-n="restart">Change my answers</button>`;
    }

    function find() {
      ranked = rankQuests({ available, energy: todaysEnergy()?.level || null });
      idx = 0;
      suggestionView();
    }

    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const group = b.parentElement.dataset.group;
      if (group === 'energy') {
        setEnergy(b.dataset.v);
        $$('[data-group="energy"] button', root).forEach((x) => x.classList.toggle('on', x === b));
        return;
      }
      if (group === 'time') {
        available = TIME_OPTIONS[Number(b.dataset.i)].v;
        return find();
      }
      const act = b.dataset.n;
      if (act === 'close') m.close();
      if (act === 'restart') askView();
      if (act === 'other') { idx++; suggestionView(); }
      if (act === 'go') {
        const s = ranked[idx];
        m.close();
        if (s.quest.type === 'focus' && !s.step) return onStartFocus(s.quest.id);
        spotlight(s.quest.id);
        onGo?.(s.quest, s.step);
      }
    });
    askView();
  }

  // ---- Quest detail ----
  function openDetail(id) {
    const m = openModal('<div class="quest-detail"></div>', { className: 'detail', label: 'Quest' });
    const root = $('.quest-detail', m.el);
    function draw() {
      const q = getQuest(id);
      if (!q) return m.close();
      const done = q.steps.filter((s) => s.done).length;
      const allSteps = q.steps.length > 0 && done === q.steps.length;
      root.innerHTML = `
        <div class="detail-head">
          <span class="kind ${q.type}">${q.type === 'focus' ? 'Focus Quest' : 'Action Quest'}</span>
          <button class="icon-btn small" data-d="close" aria-label="Close">✕</button>
        </div>
        <h2 class="detail-title">${esc(q.title)}</h2>
        <div class="q-meta">${badges(q)}</div>
        <section class="steps">
          <h3>Quest Steps ${q.steps.length ? `<span>${done} of ${q.steps.length}</span>` : ''}</h3>
          ${q.steps.length ? `<div class="progress"><i style="width:${(done / q.steps.length) * 100}%"></i></div>` : ''}
          <ul class="step-list">
            ${q.steps.map((s) => `<li class="${s.done ? 'done' : ''}"><button class="check small" data-step="${s.id}" aria-label="${s.done ? 'Uncheck' : 'Check'} step: ${esc(s.text)}">${CHECK}</button><span>${esc(s.text)}</span></li>`).join('')}
          </ul>
          <form class="add-step-inline"><input name="step" placeholder="Add a step" maxlength="120" aria-label="New step"><button class="btn ghost small" type="submit">Add</button></form>
        </section>
        <div class="detail-actions">
          <button class="btn ghost" data-d="edit">Edit</button>
          ${q.done
            ? '<button class="btn ghost" data-d="reopen">Not done yet</button>'
            : q.type === 'focus'
              ? `<button class="btn ghost" data-d="complete">${CHECK} Complete</button>
                 <button class="btn primary" data-d="focus">${PLAY} Start Focus · ${q.minutes || 25} min</button>`
              : `<button class="btn primary ${allSteps ? 'glow' : ''}" data-d="complete">${CHECK} Complete Quest</button>`}
        </div>
        ${q.steps.length ? '<button class="link-btn" data-d="template">Save as a reusable template</button>' : ''}`;
    }
    draw();
    const unsub = subscribe(draw);
    m.onClose = unsub;
    root.addEventListener('click', (e) => {
      const step = e.target.closest('[data-step]');
      if (step) return toggleStep(id, step.dataset.step);
      const act = e.target.closest('[data-d]')?.dataset.d;
      if (act === 'close') m.close();
      if (act === 'edit') { m.close(); openForm(getQuest(id)); }
      if (act === 'reopen') reopenQuest(id);
      if (act === 'focus') { m.close(); onStartFocus(id); }
      if (act === 'template') {
        const q = getQuest(id);
        const same = state.templates.find((t) => t.name.toLowerCase() === q.title.trim().toLowerCase());
        saveTemplate({ name: q.title, type: q.type, minutes: q.minutes, priority: q.priority, steps: q.steps }, same?.id);
        say(same ? `Updated the “${q.title}” template.` : `Saved “${q.title}” as a template. Find it under New Quest.`);
      }
      if (act === 'complete') {
        const q = getQuest(id);
        m.close();
        completeQuest(id);
        onComplete(q);
      }
    });
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.elements.step;
      addStep(id, input.value);
      requestAnimationFrame(() => $('.add-step-inline input', root)?.focus());
    });
  }

  // ---- Create / edit a Quest or a template ----
  // openForm()                          new Quest
  // openForm(quest)                     edit Quest
  // openForm(null, { from: template })  new Quest prefilled from a template
  // openForm(template?, { template: true })  new/edit template
  function openForm(existing, opts = {}) {
    const isT = !!opts.template;
    const editing = !!existing;
    let d;
    if (isT && existing) {
      d = { title: existing.name, type: existing.type, minutes: existing.minutes, priority: existing.priority, due: null, steps: existing.steps.map((text) => ({ id: uid(), text, done: false })) };
    } else if (existing) {
      d = structuredClone(existing);
    } else if (opts.from) {
      d = questDraftFromTemplate(opts.from);
    } else {
      d = { title: '', type: 'action', minutes: isT ? 30 : null, priority: 'normal', due: null, steps: [] };
    }
    const noun = isT ? 'Template' : 'Quest';
    const showTemplates = !isT && !editing && state.templates.length > 0;
    const t = todayISO();
    const m = openModal(`
      <form class="quest-form" novalidate>
        <div class="detail-head">
          <h2>${editing ? `Edit ${noun}` : `New ${noun}`}</h2>
          <button type="button" class="icon-btn small" data-f="cancel" aria-label="Close">✕</button>
        </div>
        ${showTemplates ? `
          <div class="field">
            <span class="label">Start from a template <small>optional</small></span>
            <div class="chips template-chips" data-group="template">
              ${state.templates.map((tp) => `<button type="button" data-v="${tp.id}" class="${d.templateId === tp.id ? 'on' : ''}">${esc(tp.name)}</button>`).join('')}
            </div>
          </div>` : ''}
        ${isT ? '<p class="next-intro">Set up the steps once, then reuse them any time. Each new Quest gets its own fresh copy you can edit.</p>' : ''}
        <label class="field">
          <span class="label">${isT ? 'Template name' : "What's the Quest?"}</span>
          <input name="title" maxlength="120" placeholder="${isT ? 'e.g. Etsy Listing' : 'e.g. Return the package'}" value="${esc(d.title)}" autocomplete="off">
          <small class="error" hidden>Give your ${noun} a name.</small>
        </label>
        <div class="field">
          <span class="label">Kind of Quest</span>
          <div class="seg" data-group="type">
            <button type="button" data-v="action"><b>Action Quest</b><small>Just get it done</small></button>
            <button type="button" data-v="focus"><b>Focus Quest</b><small>A timed block of work</small></button>
          </div>
        </div>
        <div class="field">
          <span class="label" data-minutes-label></span>
          <div class="chips" data-group="minutes">
            ${MINUTES.map((n) => `<button type="button" data-v="${n}">${n} min</button>`).join('')}
            <input type="number" min="1" max="480" inputmode="numeric" placeholder="Other" aria-label="Other length in minutes" class="chip-input">
          </div>
        </div>
        <div class="field">
          <span class="label">How important?</span>
          <div class="seg small" data-group="priority">
            <button type="button" data-v="low">Gentle</button>
            <button type="button" data-v="normal">Normal</button>
            <button type="button" data-v="high">Important</button>
          </div>
        </div>
        ${isT ? '' : `
        <div class="field">
          <span class="label">When?</span>
          <div class="chips" data-group="due">
            <button type="button" data-v="">Anytime</button>
            <button type="button" data-v="${t}">Today</button>
            <button type="button" data-v="${addDays(t, 1)}">Tomorrow</button>
            <input type="date" class="chip-input date" aria-label="Pick a date">
          </div>
        </div>`}
        <div class="field">
          <span class="label">${isT ? 'Steps' : 'Quest Steps <small>optional</small>'}</span>
          <ol class="steps-edit"></ol>
          <div class="add-step"><input placeholder="Add a step, then press Enter" maxlength="120" aria-label="New step"><button type="button" class="btn ghost small" data-f="add-step">Add</button></div>
        </div>
        <div class="form-actions">
          ${editing ? '<button type="button" class="btn ghost danger" data-f="delete">Delete</button>' : ''}
          <span class="spacer"></span>
          <button type="button" class="btn ghost" data-f="cancel">Cancel</button>
          <button type="submit" class="btn primary">${isT ? 'Save Template' : editing ? 'Save' : 'Add Quest'}</button>
        </div>
      </form>`, { className: 'form', label: editing ? `Edit ${noun}` : `New ${noun}` });

    const f = $('form', m.el);
    const title = f.elements.title;
    const minutesInput = $('[data-group="minutes"] .chip-input', f);
    const dateInput = $('[data-group="due"] .date', f);
    const stepInput = $('.add-step input', f);

    function sync() {
      $$('[data-group="type"] button', f).forEach((b) => b.classList.toggle('on', b.dataset.v === d.type));
      $$('[data-group="priority"] button', f).forEach((b) => b.classList.toggle('on', b.dataset.v === d.priority));
      $$('[data-group="template"] button', f).forEach((b) => b.classList.toggle('on', b.dataset.v === d.templateId));
      let preset = false;
      $$('[data-group="minutes"] button', f).forEach((b) => { const on = Number(b.dataset.v) === d.minutes; preset ||= on; b.classList.toggle('on', on); });
      minutesInput.classList.toggle('on', !!d.minutes && !preset);
      if (!preset && d.minutes && document.activeElement !== minutesInput) minutesInput.value = d.minutes;
      if (preset || !d.minutes) minutesInput.value = document.activeElement === minutesInput ? minutesInput.value : '';
      $('[data-minutes-label]', f).innerHTML = d.type === 'focus' ? 'Focus time' : 'About how long? <small>optional</small>';
      if (dateInput) {
        let duePreset = false;
        $$('[data-group="due"] button', f).forEach((b) => { const on = (b.dataset.v || null) === d.due; duePreset ||= on; b.classList.toggle('on', on); });
        dateInput.classList.toggle('on', !duePreset);
        dateInput.value = duePreset ? '' : d.due || '';
      }
    }

    function drawSteps() {
      $('.steps-edit', f).innerHTML = d.steps.map((s, i) => `
        <li data-i="${i}">
          <input value="${esc(s.text)}" maxlength="120" aria-label="Step ${i + 1}">
          <button type="button" class="icon-btn small" data-remove="${i}" aria-label="Remove step ${i + 1}">✕</button>
        </li>`).join('');
    }

    function addDraftStep() {
      const text = stepInput.value.trim();
      if (!text) return;
      d.steps.push({ id: uid(), text, done: false });
      stepInput.value = '';
      drawSteps();
      stepInput.focus();
    }

    f.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const group = b.parentElement.dataset.group;
      if (group === 'template') {
        const tp = getTemplate(b.dataset.v);
        if (tp) {
          Object.assign(d, questDraftFromTemplate(tp), { due: d.due });
          title.value = d.title;
          $('.error', f).hidden = true;
          drawSteps();
        }
      } else if (group === 'type') {
        d.type = b.dataset.v;
        if (d.type === 'focus' && !d.minutes) d.minutes = 25;
      } else if (group === 'minutes') {
        const v = Number(b.dataset.v);
        d.minutes = d.minutes === v && d.type !== 'focus' ? null : v;
      } else if (group === 'priority') {
        d.priority = b.dataset.v;
      } else if (group === 'due') {
        d.due = b.dataset.v || null;
      } else if (b.dataset.remove !== undefined) {
        d.steps.splice(Number(b.dataset.remove), 1);
        drawSteps();
      } else if (b.dataset.f === 'add-step') {
        addDraftStep();
      } else if (b.dataset.f === 'cancel') {
        m.close();
      } else if (b.dataset.f === 'delete') {
        if (b.dataset.armed) {
          if (isT) deleteTemplate(existing.id);
          else deleteQuest(existing.id);
          m.close();
          if (isT) openTemplates();
        } else {
          b.dataset.armed = '1';
          b.textContent = 'Tap again to delete';
          setTimeout(() => { delete b.dataset.armed; b.textContent = 'Delete'; }, 3000);
        }
      }
      sync();
    });

    minutesInput.addEventListener('input', () => {
      const v = parseInt(minutesInput.value, 10);
      d.minutes = v > 0 ? Math.min(v, 480) : (d.type === 'focus' ? 25 : null);
      sync();
    });
    dateInput?.addEventListener('change', () => { d.due = dateInput.value || null; sync(); });
    stepInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addDraftStep(); } });
    $('.steps-edit', f).addEventListener('input', (e) => {
      const li = e.target.closest('li');
      if (li) d.steps[Number(li.dataset.i)].text = e.target.value;
    });
    $('.steps-edit', f).addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      d.title = title.value.trim();
      if (!d.title) {
        $('.error', f).hidden = false;
        title.focus();
        return;
      }
      if (stepInput.value.trim()) addDraftStep();
      d.steps = d.steps.filter((s) => s.text.trim());
      if (d.type === 'focus' && !d.minutes) d.minutes = 25;
      const { title: tt, type, minutes, priority, due, steps, templateId } = d;
      if (isT) {
        saveTemplate({ name: tt, type, minutes, priority, steps }, existing?.id);
        m.close();
        openTemplates();
        return;
      }
      if (editing) updateQuest(existing.id, { title: tt, type, minutes, priority, due, steps });
      else addQuest({ title: tt, type, minutes, priority, due, steps, templateId: templateId || null });
      m.close();
    });
    title.addEventListener('input', () => { $('.error', f).hidden = true; });

    sync();
    drawSteps();
    requestAnimationFrame(() => title.focus());
  }

  // ---- Template manager ----
  function openTemplates() {
    const m = openModal('<div class="templates"></div>', { className: 'detail', label: 'Quest Templates' });
    const root = $('.templates', m.el);
    function draw() {
      root.innerHTML = `
        <div class="detail-head">
          <h2>Quest Templates</h2>
          <button class="icon-btn small" data-t="close" aria-label="Close">✕</button>
        </div>
        <p class="next-intro">Set up a Quest once and reuse it any time. Each new Quest gets its own fresh steps.</p>
        ${state.templates.length ? `<ul class="template-list">
          ${state.templates.map((tp) => `
            <li>
              <div class="t-info"><span class="t-name">${esc(tp.name)}</span><span class="t-meta">${templateMeta(tp)}</span></div>
              <button class="btn ghost small" data-t="edit" data-id="${tp.id}">Edit</button>
              <button class="btn primary small" data-t="use" data-id="${tp.id}">Use</button>
            </li>`).join('')}
        </ul>` : '<div class="empty"><p>No templates yet.</p></div>'}
        <div class="detail-actions"><button class="btn primary" data-t="new">+ New Template</button></div>`;
    }
    draw();
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-t]');
      if (!b) return;
      const tp = b.dataset.id && getTemplate(b.dataset.id);
      if (b.dataset.t === 'close') m.close();
      if (b.dataset.t === 'new') { m.close(); openForm(null, { template: true }); }
      if (b.dataset.t === 'edit' && tp) { m.close(); openForm(tp, { template: true }); }
      if (b.dataset.t === 'use' && tp) { m.close(); openForm(null, { from: tp }); }
    });
  }

  function dragonName() {
    return document.body.dataset.dragonName || 'your dragon';
  }

  subscribe(render);
  render();
  // Roll "today" over at midnight (also brings back the energy check-in).
  let day = todayISO();
  setInterval(() => {
    if (todayISO() === day) return;
    day = todayISO();
    $('#today-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    render();
  }, 60_000);

  return { openTemplates, openNext, setSheet, getSheet };
}
