import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import { routines } from '../core.js';
import { guideForStep } from '../guides.js';

const root = new URL('../', import.meta.url);
const videoId = /^[A-Za-z0-9_-]{11}$/;

test('every non-rest workout step has a complete, locally available guide', async () => {
  const steps = Object.values(routines).flatMap((routine) => routine.steps).filter((step) => step.p !== '休息');
  assert.ok(steps.length > 0);
  for (const step of steps) {
    const guide = guideForStep(step);
    assert.ok(guide, `${step.id} has a guide`);
    assert.ok(guide.images.length, `${step.id} has an image`);
    assert.ok(guide.video, `${step.id} has a video`);
    assert.match(guide.video.id, videoId, `${step.id} has an eleven-character YouTube id`);
    for (const film of guide.extraVideos ?? []) assert.match(film.id, videoId, `${step.id} extra video id`);
    for (const image of guide.images) {
      assert.match(image.src, /^\.\/media\/[A-Za-z0-9._-]+$/);
      await access(new URL(image.src.slice(2), root));
      assert.ok(image.alt && image.caption, `${step.id} image has accessible text`);
    }
  }
});

test('guide images are listed in the service worker precache', async () => {
  const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const images = new Set(Object.values(routines).flatMap((routine) => routine.steps)
    .filter((step) => step.p !== '休息')
    .flatMap((step) => guideForStep(step).images.map((image) => image.src)));
  for (const image of images) assert.match(worker, new RegExp(image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('Heel Touch describes feet planted and same-side hand-to-heel contact', () => {
  const step = routines.abs.steps.find((item) => item.id === 'abs-heel-tap');
  const guide = guideForStep(step);
  assert.match(guide.how.join(''), /雙腳平放地面/);
  assert.match(guide.how.join(''), /右手.*右腳跟/);
  assert.match(guide.how.join(''), /左手.*左腳跟/);
  assert.match(guide.how.join(''), /腳掌始終踩地/);
  assert.match(guide.caution, /手碰腳跟/);
});
