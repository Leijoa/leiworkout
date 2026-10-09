import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const base = process.env.APP_URL || 'http://127.0.0.1:8765/leiworkout/';
let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed += 1; };

async function decodedImages(page, selector) {
  return page.locator(selector).evaluateAll(async (images) => {
    await Promise.all(images.map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); })));
    return images.every((image) => image.naturalWidth > 0);
  });
}

for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  if (process.env.BROWSER && process.env.BROWSER !== engine) continue;
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ status: 204, body: '' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.install();
    await page.goto(base);
    await page.locator('#routineTitle').waitFor();

    for (const key of ['abs', 'cardio', 'full']) {
      await page.locator(`[data-key=${key}]`).click();
      const demos = page.locator('[data-guide-step]');
      check(await demos.count() > 0, `${engine}: ${key} exposes guide links`);
      for (let index = 0; index < await demos.count(); index += 1) {
        await demos.nth(index).click();
        await page.locator('#guideDialog[open]').waitFor();
        check(await decodedImages(page, '#guideImages img'), `${engine}: ${key} guide ${index + 1} images decode`);
        check(await page.locator('#guideVideo iframe').count() === 0, `${engine}: video is lazy before click`);
        await page.locator('#closeGuide').click();
      }
    }

    await page.locator('[data-key=abs]').click();
    await page.locator('[data-guide-step]').first().click();
    await page.locator('#guideVideoButtons [data-guide-video]').first().click();
    check(await page.locator('#guideVideo iframe').count() === 1, `${engine}: video iframe created on click`);
    check((await page.locator('#guideVideo iframe').getAttribute('src')).includes('youtube-nocookie.com/embed/'), `${engine}: privacy embed URL`);
    await page.locator('#closeGuide').click();
    await page.locator('#guideVideo iframe').waitFor({ state: 'detached' });
    check(await page.locator('#guideVideo iframe').count() === 0, `${engine}: closing guide removes iframe`);

    await page.locator('#startBtn').click();
    await page.locator('input[name=doms][value=none]').check();
    await page.locator('#confirmReadiness').click();
    await page.locator('#currentGuideBtn').click();
    check(await page.locator('#guideDialog[open]').count() === 1, `${engine}: current-step guide opens`);
    check(await page.locator('#guidePaused').isVisible(), `${engine}: opening guide announces pause`);
    const pausedAtOpen = await page.locator('#timerBox').textContent();
    await page.clock.fastForward(5000);
    check(await page.locator('#timerBox').textContent() === pausedAtOpen, `${engine}: guide keeps timer paused while open`);
    await page.locator('#closeGuide').click();
    check(await page.locator('#mainBtn').textContent() === '繼續', `${engine}: closing guide preserves paused workout`);
    await page.clock.fastForward(5000);
    check(await page.locator('#timerBox').textContent() === pausedAtOpen, `${engine}: closed guide does not resume timer`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#currentGuideBtn').click();
    check(await decodedImages(page, '#guideImages img'), `${engine}: mobile guide images decode`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${engine}: mobile guide has no horizontal overflow`);
    check(await page.locator('#guideDialog').evaluate((dialog) => dialog.scrollHeight >= dialog.clientHeight), `${engine}: mobile guide can scroll when content needs it`);
    await page.locator('#closeGuide').click();

    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await page.locator('#routineTitle').waitFor();
    for (const key of ['abs', 'cardio', 'full']) {
      await page.locator(`[data-key=${key}]`).click();
      const offlineDemos = page.locator('[data-guide-step]');
      for (let index = 0; index < await offlineDemos.count(); index += 1) {
        await offlineDemos.nth(index).click();
        check(await decodedImages(page, '#guideImages img'), `${engine}: ${key} offline guide ${index + 1} images decode`);
        await page.locator('#guideVideoButtons [data-guide-video]').first().click();
        check(await page.locator('#guideVideo iframe').count() === 0, `${engine}: ${key} offline guide ${index + 1} blocks video`);
        await page.locator('#closeGuide').click();
      }
    }
    await context.setOffline(false);
    check(errors.length === 0, `${engine}: no page errors: ${errors.join('; ')}`);
    await context.close();
  } finally {
    await browser.close();
  }
}

console.log(`Guide browser assertions: ${passed} passed, 0 failed`);
