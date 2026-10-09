import assert from 'node:assert/strict';
import test from 'node:test';
import { routines, buildPlan, Timer } from '../core.js';

const preserved = new Set(['暖身', '休息', '恢復', '收操']);

test('routines have unique step ids and normalized counted steps', () => {
  const ids = [];
  for (const routine of Object.values(routines)) {
    assert.ok(routine.label && routine.title && routine.desc && routine.equipment);
    for (const step of routine.steps) {
      ids.push(step.id);
      assert.ok(('s' in step) !== ('reps' in step));
      assert.equal(typeof step.r, 'string');
      assert.ok(Array.isArray(step.c));
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.match(routines.full.steps.find((step) => step.id === 'full-press-1').d, /較輕重量.*徒手.*跳過/);
});

test('none keeps the base plan without increasing work', () => {
  for (const key of Object.keys(routines)) {
    const plan = buildPlan(key);
    assert.equal(plan.blocked, false);
    assert.equal(plan.steps.length, routines[key].steps.length);
    assert.deepEqual(plan.steps.map(({ s, reps }) => s ?? reps), routines[key].steps.map(({ s, reps }) => s ?? reps));
    assert.ok(plan.estimatedSeconds > 0);
  }
});

test('mild scales only work to 80 percent', () => {
  const plan = buildPlan('abs', 'mild');
  for (const step of plan.steps) {
    const base = routines.abs.steps.find(({ id }) => id === step.id);
    const value = step.s ?? step.reps;
    const baseValue = base.s ?? base.reps;
    assert.equal(value, preserved.has(step.p) ? baseValue : Math.max(1, Math.round(baseValue * 0.8)));
  }
});

test('moderate scales work to 60 percent and keeps at most one set', () => {
  const plan = buildPlan('full', 'moderate');
  assert.ok(plan.steps.every((step) => !step.set || step.set === 1));
  assert.equal(plan.steps.some((step) => step.id === 'full-squat-2'), false);
  const squat = plan.steps.find((step) => step.id === 'full-squat-1');
  assert.equal(squat.reps, 6);
  const warmup = plan.steps.find((step) => step.id === 'full-warmup');
  assert.equal(warmup.s, 90);
});

test('pain blocks the plan and invalid values are rejected', () => {
  const plan = buildPlan('cardio', 'pain');
  assert.equal(plan.blocked, true);
  assert.deepEqual(plan.steps, []);
  assert.equal(plan.estimatedSeconds, 0);
  assert.throws(() => buildPlan('missing'), RangeError);
  assert.throws(() => buildPlan('abs', 'severe'), RangeError);
});

test('timer uses its monotonic deadline and fires ten/done once', () => {
  let now = 100;
  const ticks = [];
  let tens = 0;
  let dones = 0;
  const timer = new Timer({ now: () => now, onTick: (value) => ticks.push(value), onTen: () => tens += 1, onDone: () => dones += 1 });
  timer.start(12);
  assert.equal(timer.remaining, 12);
  assert.equal(timer.running, true);
  now = 2600;
  timer.poll();
  timer.poll();
  assert.equal(tens, 1);
  now = 12100;
  timer.poll();
  timer.poll();
  assert.equal(dones, 1);
  assert.equal(timer.state, 'done');
  assert.equal(timer.remaining, 0);
  assert.equal(timer.running, false);
  assert.deepEqual(ticks, [12, 10, 10, 0]);
});

test('timer pause/resume excludes paused time', () => {
  let now = 0;
  const ticks = [];
  const timer = new Timer({ now: () => now, onTick: (value) => ticks.push(value) });
  timer.start(20);
  now = 5000;
  assert.equal(timer.pause(), true);
  now = 25000;
  assert.equal(timer.poll(), 15);
  assert.equal(timer.resume(), true);
  now = 30000;
  assert.equal(timer.poll(), 10);
  assert.equal(ticks.at(-1), 10);
});

test('expired timers do not announce that ten seconds remain', () => {
  let now = 0;
  let tens = 0;
  let done = 0;
  const timer = new Timer({ now: () => now, onTen: () => tens++, onDone: () => done++ });
  timer.start(30);
  now = 31000;
  timer.poll();
  assert.equal(tens, 0);
  assert.equal(done, 1);
});

test('stop and callback-triggered restart cannot complete an old run', () => {
  let now = 0;
  let dones = 0;
  const stopped = new Timer({ now: () => now, onDone: () => dones += 1 });
  stopped.start(1);
  stopped.stop();
  now = 5000;
  stopped.poll();
  assert.equal(dones, 0);

  now = 0;
  let restarted;
  restarted = new Timer({
    now: () => now,
    onTick: (remaining) => {
      if (remaining === 0) restarted.start(5);
    },
    onDone: () => dones += 1,
  });
  restarted.start(1);
  now = 1000;
  restarted.poll();
  assert.equal(restarted.state, 'running');
  assert.equal(dones, 0);
});
