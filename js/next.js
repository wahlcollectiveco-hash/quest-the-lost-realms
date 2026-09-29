// "Choose My Next Quest": simple, explainable suggestion logic.
// Looks at priority, what's carried over or due, how long things take,
// the time you have, and today's energy. Suggests one manageable thing;
// when a Quest is too big for the moment, it suggests just the next step.
import { state, todayISO, isOverdue } from './state.js';

export const TIME_OPTIONS = [
  { v: 5, label: '5 min' },
  { v: 15, label: '15 min' },
  { v: 30, label: '30 min' },
  { v: 60, label: '1 hour' },
  { v: Infinity, label: 'Plenty' },
];

// Rough size of a Quest in minutes, from its length or its remaining steps.
function estimate(q) {
  const left = q.steps.filter((s) => !s.done).length;
  if (q.minutes) return q.steps.length ? Math.max(5, Math.round((q.minutes * left) / q.steps.length)) : q.minutes;
  return left ? 10 + left * 5 : 15;
}

function daysOld(q) {
  return Math.floor((Date.now() - q.createdAt) / 86400000);
}

function scoreQuest(q, { available, energy }) {
  const est = estimate(q);
  const nextStep = q.steps.find((s) => !s.done) || null;
  const stepEst = q.steps.length ? Math.max(5, Math.round(est / Math.max(1, q.steps.filter((s) => !s.done).length))) : est;
  const reasons = [];
  let score = { high: 30, normal: 15, low: 6 }[q.priority] ?? 15;
  let asStep = false;

  if (q.priority === 'high') reasons.push({ w: 3, text: 'it’s marked Important' });
  if (isOverdue(q)) { score += 22; reasons.push({ w: 4, text: 'it’s been waiting a little while' }); }
  else if (q.due === todayISO()) { score += 16; reasons.push({ w: 3, text: 'it’s planned for today' }); }
  score += Math.min(8, daysOld(q) * 2);

  // Time you have
  if (available !== Infinity) {
    if (est <= available) {
      score += 14;
      reasons.push({ w: 2, text: `it fits in your ${available} minutes` });
    } else if (nextStep && stepEst <= available) {
      score += 4;
      asStep = true;
      reasons.push({ w: 2, text: 'its next step fits the time you have' });
    } else {
      score -= 40;
    }
  }

  // Energy shapes the kind of thing suggested, never a judgement.
  const small = est <= 15 || asStep;
  if (energy === 'low') {
    if (small) {
      score += 20;
      reasons.push({ w: 3, text: asStep ? 'one small step is plenty on a low-energy day' : 'it’s small, perfect for a low-energy day' });
    } else if (est > 30) score -= 18;
    if (q.type === 'focus' && !asStep) score -= 8;
    if (!small && nextStep) {
      asStep = true;
      score += 6;
      reasons.push({ w: 3, text: 'one small step is plenty on a low-energy day' });
    }
  } else if (energy === 'okay') {
    if (est <= 30) score += 8;
  } else if (energy === 'good') {
    if (q.type === 'focus') score += 5;
  } else if (energy === 'full') {
    if (est >= 30) { score += 14; reasons.push({ w: 2, text: 'you’ve got the energy for something bigger' }); }
    if (q.type === 'focus') score += 8;
  }

  // Momentum: something already started is easier to pick up.
  const doneSteps = q.steps.filter((s) => s.done).length;
  if (doneSteps > 0) { score += 8; reasons.push({ w: 2, text: 'you’ve already started it' }); }

  score += Math.random() * 3; // gentle tie-breaker
  reasons.sort((a, b) => b.w - a.w);
  return { quest: q, score, est, step: asStep ? nextStep : null, reasons: reasons.slice(0, 2).map((r) => r.text) };
}

// Ranked suggestions for open Quests due today or earlier (or undated).
export function rankQuests({ available = Infinity, energy = null } = {}) {
  const t = todayISO();
  return state.quests
    .filter((q) => !q.done && (!q.due || q.due <= t))
    .map((q) => scoreQuest(q, { available, energy }))
    .sort((a, b) => b.score - a.score);
}

export function reasonText(s) {
  if (!s.reasons.length) return 'It’s a good, manageable next step.';
  const joined = s.reasons.length === 2 ? `${s.reasons[0]}, and ${s.reasons[1]}` : s.reasons[0];
  return `Because ${joined}.`;
}
