import { routines, buildPlan, Timer } from './core.js';
import { loadData, saveData, validateData, mergeData } from './storage.js';

const $ = id => document.getElementById(id);
const all = query => [...document.querySelectorAll(query)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt = seconds => `${String(Math.floor(Math.max(0,seconds)/60)).padStart(2,'0')}:${String(Math.ceil(Math.max(0,seconds))%60).padStart(2,'0')}`;
const dateLabel = date => new Intl.DateTimeFormat('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(date));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const domsNames = {none:'沒有痠痛',mild:'微痠',moderate:'明顯痠痛',pain:'疼痛／動作受限'};
const SESSION_KEY = 'leiworkout_active_v3';
const loaded = loadData();
let data = loaded.data, readOnly = loaded.readOnly;
let selected = 'abs', session = null, screen = 'home', readinessMode = 'start', reportTarget = null;
let repRunning = false, accountAt = performance.now(), lastSnapshot = 0, toastTimer;
let audio = null, wake = null, wakePending = false, waitingWorker = null, deferredInstall = null;
let offlineReady = false;

function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 6000);
}
function storageWarning(message) {
  $('storageAlert').textContent = message + ' 可到紀錄頁匯出目前資料，請勿清除網站資料。';
  $('storageAlert').hidden = false;
}
if (loaded.error) storageWarning(loaded.error);
function persist() {
  if (readOnly) { storageWarning('原有資料無法讀取，已停止覆寫。這次變更暫存在記憶體。'); return false; }
  const result = saveData(data);
  if (!result.ok) { storageWarning(result.error || '本機儲存失敗，這次變更暫存在記憶體。'); return false; }
  $('storageAlert').hidden = true; return true;
}
function checkpoint() {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY,JSON.stringify({...session,remaining:timer.remaining}));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { storageWarning('無法保存進行中的訓練，重新整理可能遺失進度。'); }
}
function currentReport() {
  return [...data.reports].sort((a,b) => Date.parse(b.date)-Date.parse(a.date))[0];
}
function effectiveLevel() {
  const report = currentReport();
  if (!report) return 'none';
  // Pain is never silently cleared by passage of time. Starting always requires a fresh report.
  return report.level === 'pain' || Date.now()-Date.parse(report.date)<86400000 ? report.level : 'none';
}
function show(id, focus = true) {
  screen = id;
  all('.screen').forEach(el => { el.hidden = el.id !== id; });
  $('navigation').hidden = ['workout','finish'].includes(id);
  all('nav button').forEach(button => {
    if (button.dataset.route === id) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  if (id === 'history') renderHistory();
  if (id === 'home') renderHome();
  if (focus) { $('main').focus({preventScroll:true}); window.scrollTo({top:0}); }
}
function dose(step) { return step.s ? fmt(step.s) : step.r; }
function renderHome() {
  const plan = buildPlan(selected,effectiveLevel());
  const routine = routines[selected];
  $('today').textContent = new Intl.DateTimeFormat('zh-TW',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
  $('routineTabs').innerHTML = Object.entries(routines).map(([key,r]) => `<button data-key="${key}" aria-pressed="${selected===key}">${escapeHTML(r.label)}</button>`).join('');
  $('routineTitle').textContent = routine.title;
  $('routineDesc').textContent = routine.desc;
  $('equipment').textContent = Array.isArray(routine.equipment) ? routine.equipment.join(' · ') : routine.equipment;
  $('planNumber').textContent = {abs:'A',cardio:'B',full:'C'}[selected];
  $('minutes').textContent = plan.blocked ? '休息日' : `約 ${Math.ceil(plan.estimatedSeconds/60)} 分`;
  $('stepsCount').textContent = plan.steps.length;
  $('intensity').textContent = {none:'基本',mild:'減量',moderate:'輕量',pain:'暫停'}[effectiveLevel()];
  $('adjustment').textContent = plan.adjustment;
  $('routineList').innerHTML = plan.blocked ? '<li><div><strong>今天先恢復</strong><small>目前有疼痛回報。開始前重新確認身體狀態。</small></div></li>' : plan.steps.map(s => `<li class="${['休息','恢復'].includes(s.p)?'rest':''}"><div><strong>${escapeHTML(s.n)}</strong><small>${escapeHTML(s.p)} · ${escapeHTML(s.d)}</small></div><span class="dose">${escapeHTML(dose(s))}</span></li>`).join('');
  const last = currentReport();
  $('lastReport').textContent = last ? `${dateLabel(last.date)} 回報：${domsNames[last.level]}。每次開始前都會重新確認，不把舊回報當成今天的狀態。` : '還沒有痠痛回報。完成訓練後，隔天再回來記一下。';
  $('resumeNotice').hidden = !session;
  $('startBtn').textContent = session ? '回到尚未結束的訓練' : '確認狀態，開始訓練';
}
function applyAvatars() {
  all('.avatar').forEach(el => {
    el.replaceChildren();
    if (data.settings.avatar) { const img = new Image(); img.src = data.settings.avatar; img.alt = '韻東自訂頭像'; el.append(img); }
    else { const span = document.createElement('span'); span.textContent = '韻東'; el.append(span); }
  });
}
async function unlockAudio() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!audio && Audio) audio = new Audio();
    if (audio?.state === 'suspended') await audio.resume();
  } catch { toast('提示音無法啟用，請檢查裝置音量與網站權限。'); }
}
function speak(text, force = false) {
  if (!force && !data.settings.voice) return;
  if (!('speechSynthesis' in window)) { if (force) toast('此瀏覽器不支援語音，仍可使用畫面與提示音。'); return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => /zh[-_]TW/i.test(v.lang)) || voices.find(v => /^zh/i.test(v.lang));
  if (voice) utterance.voice = voice;
  utterance.lang = 'zh-TW'; utterance.rate = 1; utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}
function cue() {
  if (data.settings.sound && audio?.state === 'running') {
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = 760;
    gain.gain.setValueAtTime(0.001,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.18,audio.currentTime+.025);
    gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.35);
    oscillator.start(); oscillator.stop(audio.currentTime+.36);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  if (data.settings.vibe && navigator.vibrate) navigator.vibrate([120,60,120]);
}
function stopSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
async function releaseWake() {
  if (wake) { const previous = wake; wake = null; try { await previous.release(); } catch {} }
  $('wakeBtn').textContent = data.settings.wake ? '常亮：暫停' : '常亮：關閉';
}
async function acquireWake() {
  if (!data.settings.wake || !session || session.finished || !(timer.running || repRunning) || document.hidden) return;
  if (!navigator.wakeLock) { $('wakeBtn').textContent = '常亮：不支援'; return; }
  if (wake || wakePending) return;
  wakePending = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!session || session.finished || !data.settings.wake || document.hidden || !(timer.running || repRunning)) { await lock.release(); return; }
    wake = lock; $('wakeBtn').textContent = '常亮：已開啟';
    lock.addEventListener('release',() => { if (wake === lock) { wake = null; $('wakeBtn').textContent = '常亮：已釋放'; } });
  } catch { $('wakeBtn').textContent = '常亮：無法啟用'; }
  finally { wakePending = false; }
}
function accountTime() {
  const now = performance.now();
  if (session && !session.finished && (timer.running || repRunning)) session.elapsedMs += Math.max(0,now-accountAt);
  accountAt = now;
}
const timer = new Timer({
  now: () => performance.now(),
  onTick: seconds => { $('timerBox').textContent = fmt(seconds); $('timerBox').classList.toggle('urgent',seconds<=10); },
  onTen: () => { $('coachLine').textContent = '剩 10 秒。維持呼吸，穩穩完成。'; speak('剩十秒，保持呼吸。'); cue(); },
  onDone: () => { if (session && !session.finished) { cue(); advance('completed'); } }
});
function pause(message = '已暫停。準備好再繼續。') {
  accountTime(); timer.pause(); repRunning = false; stopSpeech();
  if (session && !session.finished) { $('mainBtn').textContent = '繼續'; $('coachLine').textContent = message; checkpoint(); }
  releaseWake();
}
function enterStep(auto = true, restoredRemaining = null) {
  timer.stop(); repRunning = false; accountAt = performance.now();
  const step = session.plan.steps[session.index];
  $('counter').textContent = `${session.index+1} / ${session.plan.steps.length}`;
  $('progress').max = session.plan.steps.length;
  $('progress').value = session.outcomes.filter(Boolean).length;
  $('phase').textContent = step.p;
  $('exercise').textContent = step.n;
  $('description').textContent = step.d;
  $('cues').innerHTML = step.c.map(c => `<li>${escapeHTML(c)}</li>`).join('');
  $('timerBox').hidden = !step.s; $('repBox').hidden = !!step.s;
  $('repPauseBtn').hidden = !!step.s;
  $('repPauseBtn').disabled = !auto;
  $('repBox').textContent = step.r || '';
  $('prevBtn').disabled = session.index===0;
  const next = session.plan.steps[session.index+1];
  $('nextExercise').textContent = next ? `下一個：${next.n} · ${dose(next)}` : '這是最後一個步驟。';
  if (step.s) {
    timer.start(restoredRemaining ?? step.s);
    if (!auto) timer.pause();
  } else repRunning = auto;
  $('mainBtn').textContent = auto ? (step.s ? '暫停' : '完成這一組') : '繼續';
  $('coachLine').textContent = auto ? (['休息','恢復'].includes(step.p) ? '放鬆一下，下一組我會提醒你。' : step.s ? '我來計時，你顧好姿勢。' : '依自己的節奏做，完成後按下方按鈕。') : '已暫停，按繼續後再開始。';
  if (auto) speak(`${step.p}，${step.n}。${step.s ? `${step.s}秒` : step.r}`);
  checkpoint(); acquireWake();
}
function advance(outcome) {
  if (!session || session.finished) return;
  accountTime(); timer.stop(); repRunning = false; stopSpeech();
  session.outcomes[session.index] = outcome;
  if (session.index === session.plan.steps.length-1) { finishSession(); return; }
  session.index++; enterStep(true);
}
function finishSession() {
  accountTime(); timer.stop(); repRunning = false; session.finished = true;
  checkpoint(); releaseWake(); cue();
  speak('今天先到這裡。記下感覺，明天再回報恢復狀態。');
  renderFinish(); show('finish');
}
function renderFinish() {
  const completed = session.outcomes.filter(x => x === 'completed').length;
  const skipped = session.outcomes.filter(x => x === 'skipped').length;
  $('finishTitle').textContent = completed === session.plan.steps.length ? '今天，完成了。' : '今天先到這裡。';
  $('finishText').textContent = `${session.plan.title} · ${session.plan.adjustment}`;
  $('finishStats').textContent = `${fmt(Math.floor(session.elapsedMs/1000))} 實際進行時間 · ${completed} 完成 · ${skipped} 跳過 · ${session.plan.steps.length-completed-skipped} 未完成`;
  $('saveBtn').disabled = false;
}
function resumeSession() {
  if (!session) return;
  if (session.finished) { renderFinish(); show('finish'); }
  else show('workout');
}
function openReadiness(mode, sessionId = null) {
  readinessMode = mode; reportTarget = sessionId;
  $('readinessForm').reset();
  $('readinessTitle').textContent = mode === 'start' ? '現在的身體狀態？' : '訓練後，恢復得如何？';
  $('readinessHint').textContent = mode === 'start' ? '以現在全身的感覺回答。有其他部位痠痛也請算進來。' : '填目前的痠痛，不是運動當下的累。DOMS 常在訓練後一至三天出現；可以再次更新。';
  $('confirmReadiness').textContent = mode === 'start' ? '套用並開始' : '儲存回報';
  $('readinessPreview').textContent = '選擇後會顯示調整內容。';
  $('readinessDialog').showModal();
}
function renderHistory() {
  const records = [...data.history].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  const seconds = records.reduce((sum,row)=>sum+(row.elapsedSeconds || 0),0);
  $('historySummary').textContent = records.length ? `${records.length} 次紀錄 · 累計約 ${Math.round(seconds/60)} 分鐘` : '從今天開始，留下自己的節奏。';
  $('historyList').innerHTML = records.length ? records.map(row => {
    const report = data.reports.filter(r=>r.sessionId===row.id).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0];
    const progress = row.legacy ? 'v2 舊紀錄 · 無逐步完成資料' : `${row.completed}/${row.total} 步完成 · ${row.skipped} 步跳過`;
    return `<article class="history-item"><div><h2>${escapeHTML(row.title)}</h2><p>${escapeHTML(dateLabel(row.date))} · ${Math.round(row.elapsedSeconds/60)} 分鐘 · 當下${escapeHTML(row.effort)}</p><p>${progress}</p><p class="status">${report ? `痠痛：${domsNames[report.level]} · ${dateLabel(report.date)}` : '尚未回報隔天痠痛'}</p></div><button data-report="${escapeHTML(row.id)}">${report?'更新痠痛':'回報痠痛'}</button>${row.steps?.length ? `<details><summary>查看動作紀錄</summary><ul>${row.steps.map(s=>`<li>${escapeHTML(s.name)}：${({completed:'完成',skipped:'跳過',pending:'未完成'})[s.status] || '未完成'}</li>`).join('')}</ul><p>${escapeHTML(row.adjustment || '')}</p></details>`:''}</article>`;
  }).join('') : '<div class="empty"><h2>第一筆紀錄，等你開始。</h2><p>完成整堂或提早結束，都能記下實際完成的部分。</p><button data-route="home" class="primary">選一套訓練</button></div>';
}
function downloadJSON(value, name) {
  const blob = new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener('click',event => {
  const route = event.target.closest('[data-route]');
  if (route) { show(route.dataset.route); return; }
  const tab = event.target.closest('[data-key]');
  if (tab) { selected = tab.dataset.key; renderHome(); return; }
  const report = event.target.closest('[data-report]');
  if (report) openReadiness('report',report.dataset.report);
});
$('startBtn').onclick = () => session ? resumeSession() : openReadiness('start');
$('resumeBtn').onclick = resumeSession;
$('cancelReadiness').onclick = () => $('readinessDialog').close();
$('readinessForm').onchange = () => {
  const value = new FormData($('readinessForm')).get('doms');
  if (value) {
    $('readinessPreview').textContent = buildPlan(selected,value).adjustment;
    $('confirmReadiness').textContent = readinessMode==='report' ? '儲存回報' : value==='pain' ? '記下狀態，今天休息' : '套用並開始';
  }
};
$('readinessForm').onsubmit = event => {
  event.preventDefault();
  const level = new FormData(event.currentTarget).get('doms');
  if (!(level in domsNames)) return;
  const report = {id:uid(),sessionId:reportTarget,date:new Date().toISOString(),level};
  data.reports.push(report); persist(); $('readinessDialog').close();
  if (readinessMode==='report') { renderHistory(); toast('已記下恢復狀態。下次開始仍會再確認一次。'); return; }
  const plan = buildPlan(selected,level);
  if (plan.blocked) { renderHome(); toast('今天先休息。有嚴重或持續疼痛，請尋求醫療評估。'); return; }
  unlockAudio();
  session = {id:uid(),date:new Date().toISOString(),key:selected,doms:level,plan,index:0,outcomes:Array(plan.steps.length).fill(null),elapsedMs:0,finished:false};
  show('workout'); enterStep(true);
};
$('mainBtn').onclick = () => {
  if (!session || session.finished) return;
  unlockAudio(); const step = session.plan.steps[session.index];
  if (step.s) {
    if (timer.running) pause();
    else { accountAt = performance.now(); timer.resume(); $('mainBtn').textContent='暫停'; $('coachLine').textContent='繼續。照自己的節奏。'; speak('繼續'); acquireWake(); checkpoint(); }
  } else if (repRunning) advance('completed');
  else { accountAt=performance.now(); repRunning=true; $('repPauseBtn').disabled=false; $('mainBtn').textContent='完成這一組'; $('coachLine').textContent='完成後，再按一次確認。'; speak(`${step.n}，${step.r}`); acquireWake(); checkpoint(); }
};
$('repPauseBtn').onclick = () => { pause(); $('repPauseBtn').disabled=true; };
$('skipBtn').onclick = () => { unlockAudio(); advance('skipped'); };
$('prevBtn').onclick = () => {
  if (!session || session.finished || session.index===0) return;
  accountTime(); timer.stop(); repRunning=false;
  session.index--; session.outcomes[session.index]=null;
  enterStep(false); releaseWake();
};
$('exitBtn').onclick = () => { pause(); $('exitDialog').showModal(); };
$('cancelExit').onclick = () => { $('exitDialog').close(); };
$('confirmExit').onclick = () => { $('exitDialog').close(); finishSession(); };
$('saveBtn').onclick = () => {
  if (!session?.finished) return;
  $('saveBtn').disabled=true;
  const row = {id:session.id,date:session.date,key:session.key,title:session.plan.title,effort:document.querySelector('input[name=effort]:checked').value,elapsedSeconds:Math.round(session.elapsedMs/1000),completed:session.outcomes.filter(x=>x==='completed').length,skipped:session.outcomes.filter(x=>x==='skipped').length,total:session.plan.steps.length,steps:session.plan.steps.map((s,i)=>({name:s.n,status:session.outcomes[i] || 'pending'})),doms:session.doms,adjustment:session.plan.adjustment,legacy:false};
  if (!data.history.some(x=>x.id===row.id)) data.history.push(row);
  const saved = persist();
  if (!saved) { $('saveBtn').disabled=false; toast('尚未寫入本機。可重試儲存，或到紀錄頁匯出備份。'); show('history'); return; }
  session=null; checkpoint(); show('history'); toast('訓練已儲存。明天再回來回報痠痛。');
};
$('exportBtn').onclick = () => {
  downloadJSON(data,`雷爪獅訓練備份-${new Date().toISOString().slice(0,10)}.json`);
  if (readOnly) {
    try { const raw = {v3:localStorage.getItem('leiworkout_v3'),v2:localStorage.getItem('leiworkout_history')}; downloadJSON(raw,'雷爪獅原始資料-保留修復.json'); } catch {}
  }
};
$('importFile').onchange = async event => {
  const file=event.target.files[0]; if (!file) return;
  try {
    if (file.size>8_000_000) throw new Error('檔案超過 8 MB。');
    const imported = JSON.parse(await file.text());
    if (!validateData(imported)) throw new Error('不是有效的雷爪獅 v3 備份。');
    data = mergeData(data,imported);
    const saved=persist(); renderHistory(); toast(saved?'已合併備份，原有紀錄保留。':'已合併到記憶體，請立即匯出；本機寫入仍失敗。');
  } catch(error) { toast(`無法匯入：${error.message}`); }
  event.target.value='';
};
for (const [id,key] of [['voiceOn','voice'],['soundOn','sound'],['vibeOn','vibe'],['wakeOn','wake']]) {
  $(id).checked=data.settings[key];
  $(id).onchange = () => { data.settings[key]=$(id).checked; persist(); if (key==='voice'&&!data.settings.voice) stopSpeech(); if(key==='wake') data.settings.wake?acquireWake():releaseWake(); };
}
$('wakeBtn').onclick = () => { data.settings.wake=!data.settings.wake; $('wakeOn').checked=data.settings.wake; persist(); if (data.settings.wake) acquireWake(); else releaseWake(); };
$('voiceTest').onclick = () => { unlockAudio(); speak('雷爪獅，韻東在。今天照狀態練，不准逞強。',true); };
$('soundTest').onclick = async () => { await unlockAudio(); cue(); speak('聲音測試。訓練時請保持畫面開啟。'); toast('已依設定播放測試；請確認你有聽見。'); };
$('capabilities').textContent = `語音：${'speechSynthesis' in window?'可用':'不支援'} · 震動：${navigator.vibrate?'可用（依裝置）':'不支援'} · 常亮：${navigator.wakeLock?'可用（依系統狀態）':'不支援'}`;
$('avatarFile').onchange = async event => {
  const file=event.target.files[0]; if (!file) return;
  try {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10_000_000) throw new Error('請選擇 10 MB 以內的 JPG、PNG 或 WebP。');
    // FileReader + Image also work on WebKit versions with unreliable ImageBitmap decoding.
    const source=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(new Error('圖片無法讀取，請重新選擇。'));
      reader.readAsDataURL(file);
    });
    const picture=await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('圖片格式無法解碼，請改用另一張 JPG 或 PNG。'));
      img.src=source;
    });
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=256;
    const context=canvas.getContext('2d'); const size=Math.min(picture.naturalWidth,picture.naturalHeight);
    context.drawImage(picture,(picture.naturalWidth-size)/2,(picture.naturalHeight-size)/2,size,size,0,0,256,256);
    data.settings.avatar=canvas.toDataURL('image/jpeg',.86);
    const saved=persist(); applyAvatars();
    toast(saved?'頭像已更新，只保存在本機。':'頭像暫時更新，但本機儲存失敗，重新整理可能遺失。');
  } catch(error) { toast(error.message || '圖片無法讀取。'); }
  event.target.value='';
};
$('resetAvatar').onclick = () => { data.settings.avatar=null; persist(); applyAvatars(); };
function updateConnection() {
  $('connection').textContent = navigator.onLine ? (offlineReady?'離線已備妥':'連線中') : (offlineReady?'離線使用中':'目前離線');
  $('connection').classList.toggle('ready',offlineReady);
}
window.addEventListener('online',updateConnection); window.addEventListener('offline',updateConnection);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;$('installBtn').hidden=false;});
$('installBtn').onclick=async()=>{if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;$('installBtn').hidden=true;}};
$('updateBtn').onclick=()=>{if(session){toast('請先完成或結束並儲存目前的訓練。');return;}waitingWorker?.postMessage({type:'SKIP_WAITING'});};
if ('serviceWorker' in navigator && location.protocol!=='file:') {
  let updating=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating)location.reload();});
  navigator.serviceWorker.register('./sw.js').then(registration=>{
    const offerUpdate=()=>{waitingWorker=registration.waiting;if(waitingWorker){$('updateNotice').hidden=false;updating=true;}};
    offerUpdate();
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate();});});
    return navigator.serviceWorker.ready;
  }).then(()=>{offlineReady=true;updateConnection();$('offlineStatus').textContent='離線資源已備妥。連網開啟一次後，三套訓練、計時與紀錄可離線使用。語音是否可離線取決於裝置已安裝的聲音。';}).catch(()=>{$('offlineStatus').textContent='離線準備失敗，請保持連線並重新整理。PWA 需要 HTTPS 或 localhost。';});
} else $('offlineStatus').textContent='此環境無法啟用離線。請使用 HTTPS 網址或本機 localhost 開啟。';
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session&&!session.finished)pause('已因切換 App 或鎖屏暫停。回來後按繼續。');});
window.addEventListener('pagehide',()=>{if(session&&!session.finished)pause();});
setInterval(()=>{
  accountTime(); timer.poll();
  if(session&&!session.finished&&performance.now()-lastSnapshot>1000){checkpoint();lastSnapshot=performance.now();}
},200);
try {
  const raw=sessionStorage.getItem(SESSION_KEY);
  if(raw){
    const saved=JSON.parse(raw), plan=buildPlan(saved.key,saved.doms);
    if(!plan.blocked && saved.id && Number.isInteger(saved.index)&&saved.index>=0&&saved.index<plan.steps.length&&Array.isArray(saved.outcomes)&&saved.outcomes.length===plan.steps.length&&saved.outcomes.every(s=>s===null||s==='completed'||s==='skipped')&&Number.isFinite(saved.elapsedMs)&&saved.elapsedMs>=0&&!data.history.some(r=>r.id===saved.id)){
      session={...saved,plan};
      if(!session.finished)enterStep(false,Number.isFinite(saved.remaining)&&saved.remaining>0?Math.min(saved.remaining,plan.steps[saved.index].s||0):null);
    }
  }
} catch { toast('未能恢復上次進度，已保留原始進度資料。'); }
applyAvatars(); updateConnection(); show('home',false);
