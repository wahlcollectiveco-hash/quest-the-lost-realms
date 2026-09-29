// All player data lives here and is saved to this device (localStorage).
// Shape is versioned so later builds can migrate it.

import { DEFAULT_TEMPLATES } from './data/templates.js';

const KEY = 'quest-lost-realms/v1';
const listeners = new Set();

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

function defaults() {
  return {
    version: 1,
    dragon: null,
    quests: [],
    focus: null,
    lastActivity: null,
    templates: DEFAULT_TEMPLATES.map((t) => ({ ...t, id: uid(), steps: [...t.steps] })),
    energy: null, // { date: 'YYYY-MM-DD', level: 'low' | 'okay' | 'good' | 'full' | null }
    hatch: { warmth: 0, eggIndex: 0, palette: null }, // the egg in the nest
    creatures: [], // hatched: { id, name, palette, hatchedAt }
    found: {}, // discovery id -> timestamp
    discovery: { miss: 0, total: 0 },
    chestOpened: false,
    stats: { completed: 0 },
    realm: { visited: false, stones: [false, false, false], hidden: {}, doorOpened: false },
    story: { seen: {}, announced: {}, heard: {}, met: {} },
    settings: {},
    onboarded: false,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Saves from before Build 5 didn't count finished Quests yet.
      if (!saved.stats) saved.stats = { completed: (saved.quests || []).filter((q) => q.rewarded).length };
      return { ...defaults(), ...saved };
    }
  } catch { /* private mode or corrupt data: start fresh */ }
  return defaults();
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(state));
}

// Save without notifying listeners (used for the focus heartbeat).
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function todayISO(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + n));
}

// ---- Dragon ----
export function setDragon(id) {
  state.dragon = id;
  save();
}

// ---- Quests ----
export function getQuest(id) {
  return state.quests.find((q) => q.id === id);
}

export function addQuest(data) {
  const q = {
    id: uid(),
    title: '',
    type: 'action', // 'action' | 'focus'
    minutes: null, // focus length, or an estimate for action quests
    priority: 'normal', // 'low' | 'normal' | 'high'
    due: null, // 'YYYY-MM-DD' or null
    steps: [],
    done: false,
    completedAt: null,
    createdAt: Date.now(),
    ...data,
  };
  state.quests.push(q);
  save();
  return q;
}

export function updateQuest(id, patch) {
  const q = getQuest(id);
  if (!q) return null;
  Object.assign(q, patch);
  save();
  return q;
}

export function deleteQuest(id) {
  state.quests = state.quests.filter((q) => q.id !== id);
  save();
}

export const completeQuest = (id) => updateQuest(id, { done: true, completedAt: Date.now() });
export const reopenQuest = (id) => updateQuest(id, { done: false, completedAt: null });

export function toggleStep(qid, sid) {
  const q = getQuest(qid);
  const s = q?.steps.find((x) => x.id === sid);
  if (!s) return;
  s.done = !s.done;
  save();
}

export function addStep(qid, text) {
  const q = getQuest(qid);
  if (!q || !text.trim()) return;
  q.steps.push({ id: uid(), text: text.trim(), done: false });
  save();
}

// ---- Focus sessions ----
// state.focus = { questId, durationMs, elapsedMs, runningSince, finished, activity }
// Elapsed time only accrues while runningSince is set, so pausing is exact.
export function focusElapsed(f = state.focus) {
  if (!f) return 0;
  return f.elapsedMs + (f.runningSince ? Date.now() - f.runningSince : 0);
}

export function startFocus(questId) {
  const q = getQuest(questId);
  state.focus = { questId, durationMs: (q?.minutes || 25) * 60000, elapsedMs: 0, runningSince: Date.now(), finished: false, activity: null };
  save();
}

export function pauseFocus() {
  const f = state.focus;
  if (!f?.runningSince) return;
  f.elapsedMs = Math.min(focusElapsed(f), f.durationMs);
  f.runningSince = null;
  save();
}

export function resumeFocus() {
  const f = state.focus;
  if (!f || f.runningSince) return;
  f.runningSince = Date.now();
  f.finished = false;
  save();
}

export function extendFocus(minutes) {
  const f = state.focus;
  if (!f) return;
  f.durationMs = Math.max(f.durationMs, focusElapsed(f)) + minutes * 60000;
  resumeFocus();
}

// Record the time on the Quest and close the session.
export function endFocus({ complete }) {
  const f = state.focus;
  if (!f) return null;
  const q = getQuest(f.questId);
  if (q) {
    q.focusMs = (q.focusMs || 0) + Math.min(focusElapsed(f), f.durationMs);
    q.focusSessions = (q.focusSessions || 0) + 1;
    if (complete) { q.done = true; q.completedAt = Date.now(); }
  }
  state.focus = null;
  save();
  return q;
}

// Heartbeat: fold running time into elapsedMs so a closed tab loses at most a few seconds.
export function heartbeatFocus() {
  const f = state.focus;
  if (!f?.runningSince) return;
  f.elapsedMs = Math.min(focusElapsed(f), f.durationMs);
  f.runningSince = Date.now();
  persist();
}

// On launch, a session that was running when the app closed comes back paused.
export function recoverFocus() {
  const f = state.focus;
  if (!f) return false;
  if (!getQuest(f.questId)) { state.focus = null; save(); return false; }
  f.runningSince = null;
  save();
  return true;
}

// ---- Templates ----
// A template stores step text only; each Quest made from it gets fresh, editable steps.
export function getTemplate(id) {
  return state.templates.find((t) => t.id === id);
}

export function saveTemplate(data, id) {
  const clean = {
    name: data.name.trim(),
    type: data.type,
    minutes: data.minutes,
    priority: data.priority,
    steps: data.steps.map((s) => (typeof s === 'string' ? s : s.text).trim()).filter(Boolean),
  };
  const existing = id && getTemplate(id);
  if (existing) Object.assign(existing, clean);
  else state.templates.push({ id: uid(), ...clean });
  save();
}

export function deleteTemplate(id) {
  state.templates = state.templates.filter((t) => t.id !== id);
  save();
}

export function questDraftFromTemplate(t) {
  return {
    title: t.name,
    type: t.type,
    minutes: t.minutes,
    priority: t.priority,
    due: null,
    steps: t.steps.map((text) => ({ id: uid(), text, done: false })),
    templateId: t.id,
  };
}

// ---- Energy check-in (only ever used to shape suggestions) ----
export function todaysEnergy() {
  return state.energy?.date === todayISO() ? state.energy : null;
}

export function setEnergy(level) {
  state.energy = { date: todayISO(), level };
  save();
}

export const isOverdue = (q) => !q.done && !!q.due && q.due < todayISO();

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  Object.assign(state, defaults());
  save();
}
