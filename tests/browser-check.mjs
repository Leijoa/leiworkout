import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.env.APP_URL || 'http://127.0.0.1:8765/leiworkout/';
const shots = process.env.SCREENSHOT_DIR || '../../work/qa/screenshots';
await mkdir(shots,{recursive:true});
let passed=0;
const check = (value,message) => { assert.ok(value,message); passed++; };
for (const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]) {
  if (process.env.BROWSER && process.env.BROWSER !== engine) continue;
  const browser = await browserType.launch({headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
    const page=await context.newPage(); const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.clock.install(); await page.goto(base);
    await page.locator('#routineTitle').waitFor();
    check(await page.locator('#routineTabs button').count()===3,`${engine}: three routines`);
    await page.screenshot({path:`${shots}/${engine}-desktop-home.png`,fullPage:true});
    for (const key of ['abs','cardio','full']) {
      await page.locator(`[data-key=${key}]`).click();
      check(await page.locator('#routineList li').count()>10,`${engine}: ${key} full plan`);
    }
    await page.locator('[data-key=abs]').click();
    await page.locator('#startBtn').click(); await page.locator('input[name=doms][value=none]').check(); await page.locator('#confirmReadiness').click();
    check(await page.locator('#workout').isVisible(),`${engine}: start`);
    await page.clock.fastForward(1200); await page.locator('#mainBtn').click();
    const paused=await page.locator('#timerBox').textContent();
    await page.clock.fastForward(5000);
    check(await page.locator('#timerBox').textContent()===paused,`${engine}: pause freezes deadline`);
    await page.locator('#mainBtn').click(); await page.clock.fastForward(50000);
    check((await page.locator('#coachLine').textContent()).includes('10'),`${engine}: crossed ten seconds reminder`);
    await page.locator('#skipBtn').click(); await page.clock.fastForward(1200);
    check((await page.locator('#counter').textContent()).startsWith('2 /'),`${engine}: no stale next-step race`);
    await page.locator('#skipBtn').click();
    check((await page.locator('#repBox').textContent()).includes('8'),`${engine}: counted step`);
    await page.locator('#repPauseBtn').click();
    check(await page.locator('#mainBtn').textContent()==='繼續',`${engine}: reps can pause`);
    await page.locator('#mainBtn').click();
    await page.locator('#mainBtn').click();
    check(await page.locator('#phase').textContent()==='休息',`${engine}: counted completion starts timed rest`);
    await page.locator('#prevBtn').click();
    check(await page.locator('#mainBtn').textContent()==='繼續',`${engine}: previous pauses`);
    await page.locator('#mainBtn').click(); await page.locator('#mainBtn').click();
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
    check(await page.locator('#mainBtn').textContent()==='繼續',`${engine}: background pauses`);
    await page.locator('#mainBtn').click();
    await page.locator('#exitBtn').click(); await page.locator('#cancelExit').click();
    check(await page.locator('#mainBtn').textContent()==='繼續',`${engine}: cancel exit remains valid pause`);
    await page.locator('#mainBtn').click();
    const beforeReload=await page.locator('#counter').textContent();
    await page.reload(); await page.locator('#resumeBtn').click();
    check(await page.locator('#counter').textContent()===beforeReload,`${engine}: reload restores step`);
    check(await page.locator('#mainBtn').textContent()==='繼續',`${engine}: reload never silently resumes`);
    await page.locator('#mainBtn').click();
    let guard=0;
    while(await page.locator('#workout').isVisible()&&guard++<50){
      if(await page.locator('#timerBox').isVisible()){
        const [m,s]=(await page.locator('#timerBox').textContent()).split(':').map(Number);
        await page.clock.fastForward((m*60+s)*1000+250);
      } else await page.locator('#mainBtn').click();
    }
    check(await page.locator('#finish').isVisible(),`${engine}: whole training ends`);
    await page.locator('#saveBtn').click();
    check(await page.locator('.history-item').count()===1,`${engine}: one saved history`);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('leiworkout_v3')));
    check(stored.history[0].skipped===2&&stored.history[0].completed===stored.history[0].total-2,`${engine}: skipped not completed`);
    await page.locator('[data-report]').click(); await page.locator('input[name=doms][value=mild]').check(); await page.locator('#confirmReadiness').click();
    await page.locator('nav [data-route=home]').click();
    check(await page.locator('#intensity').textContent()==='減量',`${engine}: DOMS report adjusts next preview`);
    check((await page.locator('#routineList').textContent()).includes('00:24'),`${engine}: adjusted plank preview`);
    await page.locator('#startBtn').click(); await page.locator('input[name=doms][value=pain]').check(); await page.locator('#confirmReadiness').click();
    check(await page.locator('#home').isVisible()&&await page.locator('#intensity').textContent()==='暫停',`${engine}: pain blocks session`);
    await page.locator('#startBtn').click(); await page.locator('input[name=doms][value=moderate]').check(); await page.locator('#confirmReadiness').click();
    await page.locator('#exitBtn').click(); await page.locator('#confirmExit').click(); await page.locator('#saveBtn').click();
    check(await page.locator('.history-item').count()===2,`${engine}: early finish saved`);
    await page.locator('nav [data-route=home]').click(); await page.locator('[data-key=full]').click();
    check(!(await page.locator('#routineList').textContent()).includes('第 2 組'),`${engine}: moderate one set preview`);
    await page.locator('nav [data-route=history]').click();
    const backup=await page.evaluate(()=>JSON.parse(localStorage.getItem('leiworkout_v3')));
    await page.locator('#importFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    check(await page.locator('.history-item').count()===2,`${engine}: import deduplicates`);
    // Every remaining routine is also completed end-to-end, including auto rests.
    for (const key of ['cardio','full']) {
      await page.locator('nav [data-route=home]').click(); await page.locator(`[data-key=${key}]`).click();
      await page.locator('#startBtn').click(); await page.locator('input[name=doms][value=none]').check(); await page.locator('#confirmReadiness').click();
      let count=0;
      while(await page.locator('#workout').isVisible()&&count++<50){
        if(await page.locator('#timerBox').isVisible()){
          const [m,s]=(await page.locator('#timerBox').textContent()).split(':').map(Number);
          await page.clock.fastForward((m*60+s)*1000+250);
        }else await page.locator('#mainBtn').click();
      }
      check(await page.locator('#finishTitle').textContent()==='今天，完成了。',`${engine}: ${key} all steps completed`);
      await page.locator('#saveBtn').click();
      const last=await page.evaluate(()=>JSON.parse(localStorage.getItem('leiworkout_v3')).history.at(-1));
      check(last.key===key&&last.completed===last.total&&last.skipped===0,`${engine}: ${key} correct completion stored`);
    }
    await page.locator('nav [data-route=settings]').click();
    await page.locator('#avatarFile').setInputFiles(new URL('../icon-192.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
    try {
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('leiworkout_v3')).settings.avatar?.startsWith('data:image/jpeg'),null,{polling:100});
    } catch(error) {
      console.error(await page.evaluate(()=>({toast:document.getElementById('toast').textContent,storage:document.getElementById('storageAlert').textContent,avatar:JSON.parse(localStorage.getItem('leiworkout_v3')).settings.avatar?.slice(0,40)})));
      throw error;
    }
    check(await page.locator('.avatar img').count()===2,`${engine}: local avatar saves`);
    await page.locator('nav [data-route=home]').click();
    await page.clock.fastForward(6100);
    await page.setViewportSize({width:390,height:844}); await page.screenshot({path:`${shots}/${engine}-mobile-home.png`,fullPage:true});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${engine}: mobile no overflow`);
    await page.locator('#startBtn').click();await page.locator('input[name=doms][value=none]').check();await page.locator('#confirmReadiness').click();
    await page.screenshot({path:`${shots}/${engine}-mobile-workout.png`,fullPage:true});
    await page.locator('#exitBtn').click();await page.locator('#confirmExit').click();await page.locator('#saveBtn').click();
    await page.locator('nav [data-route=home]').click();
    // Offline restart must load the real shell and modules at a subpath.
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await context.setOffline(true); await page.reload(); await page.locator('#routineTitle').waitFor();
    check(await page.locator('#routineTabs button').count()===3,`${engine}: offline shell`);
    await page.locator('#startBtn').click();await page.locator('input[name=doms][value=none]').check();await page.locator('#confirmReadiness').click();
    check(await page.locator('#workout').isVisible(),`${engine}: offline training`);
    await context.setOffline(false);
    check(errors.length===0,`${engine}: no page errors ${errors.join(';')}`);
    await context.close();

    const legacyContext=await browser.newContext(); const legacyPage=await legacyContext.newPage();
    await legacyPage.goto(base); await legacyPage.evaluate(()=>localStorage.setItem('leiworkout_history',JSON.stringify([{date:'2026-10-08T02:00:00.000Z',routine:'腹肌訓練 A',rating:'剛好',duration:18}])));
    await legacyPage.reload(); await legacyPage.locator('nav [data-route=history]').click();
    check((await legacyPage.locator('#historyList').textContent()).includes('v2 舊紀錄'),`${engine}: v2 migration`);
    check(await legacyPage.evaluate(()=>!!localStorage.getItem('leiworkout_history')),`${engine}: old key preserved`);
    await legacyPage.evaluate(()=>localStorage.setItem('leiworkout_v3','{bad json')); await legacyPage.reload();
    check(await legacyPage.locator('#storageAlert').isVisible(),`${engine}: corrupt data warning`);
    await legacyPage.locator('#startBtn').click(); await legacyPage.locator('input[name=doms][value=none]').check(); await legacyPage.locator('#confirmReadiness').click();
    check(await legacyPage.evaluate(()=>localStorage.getItem('leiworkout_v3'))==='{bad json',`${engine}: corrupt data never overwritten`);
    await legacyContext.close();
    console.log(`${engine}: main workflow, persistence, DOMS, local avatar, responsive and offline checks passed`);
  } finally { await browser.close(); }
}
console.log(`Browser assertions: ${passed} passed, 0 failed`);
