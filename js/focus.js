// Focus Quest session: countdown, pause/resume, pausing when you leave the
// app, the dragon's activity, and the end-of-session moment.
import {
  state, save, getQuest, toggleStep, startFocus, pauseFocus, resumeFocus, extendFocus,
  endFocus, focusElapsed, heartbeatFocus,
} from './state.js';
import { DRAGONS } from './data/dragons.js';
import { ACTIVITY_LINES, chooseActivity } from './world/activities.js';
import { $, esc, say } from './ui/common.js';
import { sfx } from './audio.js';

const RING = 2 * Math.PI * 54;
const ROTATE_MS = 8 * 60000; // switch activities during long sessions
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

function fmt(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? `${h}:` : '') + `${mm}:${String(s).padStart(2, '0')}`;
}
const minutes = (ms) => Math.max(1, Math.round(ms / 60000));
const plural = (n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`;


export function createFocus({ world, director, getCompanion, setScreen, onDone }) {
  const el = {
    card: $('#focus-card'),
    time: $('#focus-time'),
    status: $('#focus-status'),
    bar: $('#focus-ring .bar'),
    title: $('#focus-title'),
    activity: $('#focus-activity'),
    steps: $('#focus-steps'),
    actions: $('#focus-actions'),
    leave: $('#focus-leave'),
  };
  el.bar.style.strokeDasharray = RING;

  let activityStartedAt = 0; // focus-elapsed ms when the current activity began
  let awayPaused = false;
  let lastBeat = 0;

  const dragonName = () => DRAGONS[state.dragon]?.name || 'Your dragon';

  function startActivity(fresh) {
    const f = state.focus;
    const forced = new URLSearchParams(location.search).get('activity'); // for previewing: ?activity=reading
    if (forced && ACTIVITY_LINES[forced]) {
      f.activity = forced;
    } else if (fresh || !f.activity) {
      f.activity = chooseActivity(state.dragon, state.lastActivity);
      state.lastActivity = f.activity;
      save();
    }
    activityStartedAt = focusElapsed();
    director.start(f.activity, getCompanion());
  }

  function renderStatic() {
    const f = state.focus;
    const q = getQuest(f.questId);
    el.title.textContent = q?.title || 'Focus Quest';
    el.steps.innerHTML = (q?.steps || []).map((s) => `
      <li class="${s.done ? 'done' : ''}"><button class="check small" data-step="${s.id}" aria-label="${s.done ? 'Uncheck' : 'Check'} step: ${esc(s.text)}">${CHECK}</button><span>${esc(s.text)}</span></li>`).join('');
    el.steps.hidden = !q?.steps.length;
  }

  function renderControls() {
    const f = state.focus;
    const running = !!f.runningSince;
    const name = dragonName();
    el.card.dataset.state = f.finished ? 'finished' : running ? 'running' : 'paused';
    if (f.finished) {
      el.status.textContent = 'Time!';
      el.activity.textContent = `${plural(minutes(f.durationMs))} of focus. ${name} is so proud of you.`;
      el.actions.innerHTML = `
        <button class="btn ghost" data-f="more">+5 minutes</button>
        <button class="btn primary glow" data-f="complete">${CHECK} Complete Quest</button>`;
      el.leave.textContent = 'Not finished? Save progress for later';
    } else if (running) {
      el.status.textContent = 'Focusing';
      el.activity.textContent = ACTIVITY_LINES[f.activity]?.(name) || '';
      el.actions.innerHTML = `
        <button class="btn ghost" data-f="pause">Pause</button>
        <button class="btn primary" data-f="complete">${CHECK} I'm done</button>`;
      el.leave.textContent = 'End session and save for later';
    } else {
      el.status.textContent = 'Paused';
      el.activity.textContent = awayPaused
        ? `Paused while you were away. ${name} waited for you.`
        : `${name} sits down and waits for you.`;
      el.actions.innerHTML = `
        <button class="btn primary glow" data-f="resume">Resume</button>
        <button class="btn ghost" data-f="complete">${CHECK} I'm done</button>`;
      el.leave.textContent = 'End session and save for later';
    }
  }

  function renderTime() {
    const f = state.focus;
    if (!f) return;
    const elapsed = Math.min(focusElapsed(f), f.durationMs);
    el.time.textContent = f.finished ? 'Done' : fmt(f.durationMs - elapsed);
    el.bar.style.strokeDashoffset = RING * (1 - elapsed / f.durationMs);
  }

  function tick() {
    const f = state.focus;
    if (!f || document.body.dataset.screen !== 'focus') return;
    if (f.runningSince) {
      const elapsed = focusElapsed(f);
      if (elapsed >= f.durationMs) return finish();
      if (elapsed - activityStartedAt > ROTATE_MS) {
        startActivity(true);
        renderControls();
      }
      if (Date.now() - lastBeat > 5000) { heartbeatFocus(); lastBeat = Date.now(); }
    }
    renderTime();
  }
  setInterval(tick, 250);

  function finish() {
    pauseFocus();
    state.focus.finished = true;
    save();
    sfx.chime();
    director.pause(getCompanion());
    setTimeout(() => getCompanion()?.react('celebrate'), 600);
    renderControls();
    renderTime();
  }

  function pause(away = false) {
    awayPaused = away;
    pauseFocus();
    director.pause(getCompanion());
    renderControls();
    renderTime();
  }

  function resume() {
    awayPaused = false;
    resumeFocus();
    startActivity(false);
    renderControls();
  }

  // Leaving the app (switching tabs/apps, locking the phone) pauses the timer.
  document.addEventListener('visibilitychange', () => {
    const f = state.focus;
    if (!f || document.body.dataset.screen !== 'focus') return;
    if (document.hidden) {
      if (f.runningSince) pause(true);
    } else if (awayPaused) {
      say(`Welcome back! The timer paused while you were away.`, 4000);
    }
  });
  window.addEventListener('pagehide', heartbeatFocus);

  el.card.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step) {
      toggleStep(state.focus.questId, step.dataset.step);
      renderStatic();
      return;
    }
    const act = e.target.closest('[data-f]')?.dataset.f;
    if (act === 'pause') pause(false);
    if (act === 'resume') resume();
    if (act === 'more') {
      extendFocus(5);
      startActivity(false);
      renderControls();
      renderTime();
    }
    if (act === 'complete') exit(true);
  });
  el.leave.addEventListener('click', () => exit(false));

  function enter() {
    setScreen('focus');
    const companion = getCompanion();
    if (state.focus.runningSince) startActivity(false);
    else director.pause(companion);
    renderStatic();
    renderControls();
    renderTime();
    director.focusPoint.position.copy(companion.root.position);
    world.follow(director.focusPoint);
    const p = director.focusPoint.position;
    world.flyTo([p.x + 1.2, p.y + 4.6, p.z + 9], [p.x, p.y + 1, p.z], 1.6);
  }

  function begin(questId) {
    startFocus(questId);
    awayPaused = false;
    enter();
  }

  function exit(complete) {
    const f = state.focus;
    if (!f) return;
    const spent = Math.min(focusElapsed(f), f.durationMs);
    const q = endFocus({ complete });
    world.follow(null);
    director.goHome(getCompanion());
    onDone({ quest: q, complete, minutes: minutes(spent) });
  }

  return { begin, resumeSession: enter };
}
