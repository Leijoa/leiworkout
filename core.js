const timed = (id, p, n, s, d, c) => ({ id, p, n, s, r: formatTime(s), d, c });
const counted = (id, p, n, reps, sides, d, c, set = 1, setGroup = id) => ({
  id,
  p,
  n,
  reps,
  ...(sides ? { sides: true } : {}),
  r: `${sides ? '左右各 ' : ''}${reps} 下`,
  d,
  c,
  set,
  setGroup,
});

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

const rest = (id, seconds, d = '調整呼吸，準備下一組。', c = ['鼻吸口吐']) =>
  timed(id, '休息', '休息', seconds, d, c);

export const routines = {
  abs: {
    label: '腹肌',
    title: '腹肌訓練 A',
    desc: '核心控制＋健腹輪。保留餘力，不要為了追求次數而失去姿勢。',
    equipment: '瑜珈墊、健腹輪',
    steps: [
      timed('abs-march', '暖身', '原地踏步＋擺臂', 60, '讓心跳慢慢上來，腰腹先不要用力過猛。', ['自然呼吸', '肩膀放鬆', '微微出汗即可']),
      timed('abs-cat-cow', '暖身', '貓牛式', 45, '活動脊椎與核心，慢慢做。', ['不要憋氣', '動作小也沒關係']),
      counted('abs-dead-bug', '主訓練', '死蟲式（Dead Bug）', 8, true, '下背貼地，對側手腳慢慢伸直。', ['腰不要拱起', '每一下都控制回來', '如果腰離地就縮短幅度']),
      rest('abs-rest-1', 40, '甩甩手、調整呼吸。', ['鼻吸口吐', '準備下一組']),
      counted('abs-reverse-crunch-1', '主訓練', '反向捲腹｜第 1 組', 8, false, '骨盆往胸口捲，不是用甩腿的。', ['慢上慢下', '腰部不要猛甩'], 1, 'abs-reverse-crunch'),
      rest('abs-reverse-crunch-rest', 30),
      counted('abs-reverse-crunch-2', '主訓練', '反向捲腹｜第 2 組', 8, false, '骨盆往胸口捲，不是用甩腿的。', ['慢上慢下', '腰部不要猛甩'], 2, 'abs-reverse-crunch'),
      counted('abs-heel-tap', '主訓練', '側腹碰腳跟（Heel Touch）', 10, true, '仰躺屈膝，左右碰腳跟。', ['肩胛微離地', '腹部持續收緊']),
      rest('abs-rest-2', 45, '喝一口水，準備平板。', ['保持走動也可以']),
      timed('abs-plank', '主訓練', '平板撐', 30, '身體維持一直線。', ['屁股不要抬太高', '腰不要塌', '正常呼吸']),
      rest('abs-rest-3', 45, '健腹輪前先把腰腹放鬆。', ['如果腰不舒服，健腹輪直接跳過']),
      counted('abs-wheel-1', '主訓練', '跪姿健腹輪｜第 1 組', 6, false, '只推出能維持核心的位置，寧可短也不要腰塌。', ['臀部微收', '腹部繃緊', '腰一塌立即回來'], 1, 'abs-wheel'),
      rest('abs-wheel-rest', 30),
      counted('abs-wheel-2', '主訓練', '跪姿健腹輪｜第 2 組', 6, false, '只推出能維持核心的位置，寧可短也不要腰塌。', ['臀部微收', '腹部繃緊', '腰一塌立即回來'], 2, 'abs-wheel'),
      timed('abs-cobra', '收操', '眼鏡蛇式輕伸展', 30, '腹部輕微伸展，不追求大幅度。', ['沒有腰痛才做', '不憋氣']),
      timed('abs-child-pose', '收操', '嬰兒式', 45, '放鬆腰背與呼吸。', ['慢慢深呼吸', '今天到這裡就好']),
    ],
  },
  cardio: {
    label: '有氧',
    title: '無繩跳繩有氧 B',
    desc: '以穩定節奏和短時加速交替，以能完成為優先。',
    equipment: '運動鞋、水',
    steps: [
      timed('cardio-march', '暖身', '原地踏步', 90, '先把腳踝、膝蓋與心肺熱起來。', ['手臂自然擺動', '逐漸加快']),
      timed('cardio-mobility', '暖身', '腳踝＋肩膀活動', 60, '腳踝畫圈、肩膀繞圈。', ['左右都做', '不要硬拉']),
      timed('cardio-steady-1', '有氧', '無繩跳繩｜舒服速度', 180, '維持能講短句的速度。', ['前腳掌輕落地', '膝蓋保持彈性']),
      timed('cardio-fast-1', '有氧', '快節奏', 60, '把速度提高一級。', ['不需要全力衝刺', '保持節奏']),
      timed('cardio-recovery-1', '恢復', '原地走', 60, '不要停住，邊走邊恢復。', ['調整呼吸']),
      timed('cardio-steady-2', '有氧', '無繩跳繩｜舒服速度', 180, '回到穩定節奏。', ['肩膀放鬆']),
      timed('cardio-fast-2', '有氧', '快節奏', 75, '第二段稍微延長。', ['微喘即可']),
      timed('cardio-recovery-2', '恢復', '原地走', 60, '邊走邊喝一小口水。', ['不要突然坐下']),
      timed('cardio-side-step', '有氧', '左右小步跳／踏步', 180, '不想跳可改快速踏步。', ['膝蓋朝腳尖方向', '落地輕']),
      timed('cardio-final-fast', '有氧', '最後快節奏', 90, '今天最後一段，提高速度但保留一點餘力。', ['不追求爆掉', '姿勢先顧好']),
      timed('cardio-cool-walk', '收操', '慢走', 120, '讓心率慢慢降下來。', ['深呼吸']),
      timed('cardio-stretch', '收操', '小腿＋大腿伸展', 120, '左右交替，舒服即可。', ['不要彈震式拉伸']),
    ],
  },
  full: {
    label: '全身',
    title: '啞鈴全身 C',
    desc: '使用兩個 7.5 kg 啞鈴，腿、推、拉、核心都帶到。',
    equipment: '7.5 kg 啞鈴兩個、瑜珈墊',
    steps: [
      timed('full-warmup', '暖身', '原地踏步＋肩繞環', 90, '全身熱起來。', ['慢慢加速']),
      counted('full-squat-1', '主訓練', '高腳杯深蹲｜第 1 組', 10, false, '抱一顆啞鈴在胸前，屁股往後坐。', ['膝蓋跟腳尖同方向', '背保持自然'], 1, 'full-squat'),
      rest('full-squat-rest', 45),
      counted('full-squat-2', '主訓練', '高腳杯深蹲｜第 2 組', 10, false, '抱一顆啞鈴在胸前，屁股往後坐。', ['膝蓋跟腳尖同方向', '背保持自然'], 2, 'full-squat'),
      rest('full-rest-1', 45, '調整呼吸。', ['不要坐下']),
      counted('full-row-1', '主訓練', '單臂啞鈴划船｜第 1 組', 10, true, '背部發力把啞鈴拉向腰側。', ['肩膀不要聳起', '身體不要扭轉'], 1, 'full-row'),
      rest('full-row-rest', 45),
      counted('full-row-2', '主訓練', '單臂啞鈴划船｜第 2 組', 10, true, '背部發力把啞鈴拉向腰側。', ['肩膀不要聳起', '身體不要扭轉'], 2, 'full-row'),
      rest('full-rest-2', 45, '放鬆手臂。', ['準備推舉']),
      counted('full-press-1', '主訓練', '啞鈴肩推｜第 1 組', 8, false, '如果 7.5 kg 過重，改用較輕重量、徒手做，或跳過這個動作。', ['核心收緊', '不要用腰甩'], 1, 'full-press'),
      rest('full-press-rest', 45),
      counted('full-press-2', '主訓練', '啞鈴肩推｜第 2 組', 8, false, '如果 7.5 kg 過重，改用較輕重量、徒手做，或跳過這個動作。', ['核心收緊', '不要用腰甩'], 2, 'full-press'),
      rest('full-rest-3', 45),
      counted('full-rdl-1', '主訓練', '羅馬尼亞硬舉｜第 1 組', 10, false, '臀部往後推，感受腿後側。', ['背部自然', '啞鈴貼近腿'], 1, 'full-rdl'),
      rest('full-rdl-rest', 45),
      counted('full-rdl-2', '主訓練', '羅馬尼亞硬舉｜第 2 組', 10, false, '臀部往後推，感受腿後側。', ['背部自然', '啞鈴貼近腿'], 2, 'full-rdl'),
      rest('full-rest-4', 45, '喝水。', ['還有最後核心']),
      counted('full-dead-bug', '核心', '死蟲式（Dead Bug）', 8, true, '用控制完成，不求速度。', ['下背貼地']),
      timed('full-plank', '核心', '平板撐', 30, '穩穩撐住。', ['正常呼吸', '腰不要塌']),
      timed('full-cool-walk', '收操', '全身放鬆走動', 60, '把呼吸放慢。', ['甩甩手腳']),
      timed('full-stretch', '收操', '簡單伸展', 90, '胸、背、腿各伸展一下。', ['舒服就好']),
    ],
  },
};

const adjustments = {
  none: '依原定內容完成，不額外增加重量或次數。',
  mild: '工作時間與次數調整為原定的 80%；暖身、休息與收操保持不變。',
  moderate: '工作時間與次數調整為原定的 60%，每個動作最多一組；暖身、休息與收操保持不變。',
  pain: '今天不啟動訓練計畫。',
};

const preservedPhases = new Set(['暖身', '休息', '恢復', '收操']);

export function buildPlan(key, domsLevel = 'none') {
  const routine = routines[key];
  if (!routine) throw new RangeError(`Unknown routine: ${key}`);
  if (!Object.hasOwn(adjustments, domsLevel)) throw new RangeError(`Unknown DOMS level: ${domsLevel}`);

  if (domsLevel === 'pain') {
    return { key, title: routine.title, steps: [], adjustment: adjustments.pain, blocked: true, estimatedSeconds: 0 };
  }

  const scale = domsLevel === 'mild' ? 0.8 : domsLevel === 'moderate' ? 0.6 : 1;
  const steps = routine.steps
    .filter((step) => domsLevel !== 'moderate' || !step.set || step.set === 1)
    .map((step) => {
      const copy = { ...step, c: [...step.c] };
      if (scale === 1 || preservedPhases.has(step.p)) return copy;
      if ('s' in step) {
        copy.s = Math.max(1, Math.round(step.s * scale));
        copy.r = formatTime(copy.s);
      } else {
        copy.reps = Math.max(1, Math.round(step.reps * scale));
        copy.r = `${step.sides ? '左右各 ' : ''}${copy.reps} 下`;
      }
      return copy;
    });

  const estimatedSeconds = steps.reduce((total, step) => {
    if ('s' in step) return total + step.s;
    return total + step.reps * (step.sides ? 2 : 1) * 3;
  }, 0);

  return { key, title: routine.title, steps, adjustment: adjustments[domsLevel], blocked: false, estimatedSeconds };
}

export class Timer {
  constructor({ now = () => performance.now(), onTick = () => {}, onTen = () => {}, onDone = () => {} } = {}) {
    this.now = now;
    this.onTick = onTick;
    this.onTen = onTen;
    this.onDone = onDone;
    this.state = 'stopped';
    this.deadline = 0;
    this.remainingMs = 0;
    this.previousRemainingMs = 0;
    this.tenFired = false;
    this.runId = 0;
  }

  get remaining() {
    return Math.ceil(this.remainingMs / 1000);
  }

  get running() {
    return this.state === 'running';
  }

  start(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Timer seconds must be a non-negative number');
    this.runId += 1;
    this.remainingMs = seconds * 1000;
    this.previousRemainingMs = this.remainingMs;
    this.deadline = this.now() + this.remainingMs;
    this.tenFired = false;
    this.state = 'running';
    return this.poll();
  }

  pause() {
    if (this.state !== 'running') return false;
    this.remainingMs = Math.max(0, this.deadline - this.now());
    this.previousRemainingMs = this.remainingMs;
    this.state = 'paused';
    return true;
  }

  resume() {
    if (this.state !== 'paused') return false;
    this.deadline = this.now() + this.remainingMs;
    this.previousRemainingMs = this.remainingMs;
    this.state = 'running';
    return true;
  }

  stop() {
    this.runId += 1;
    this.state = 'stopped';
    this.remainingMs = 0;
    this.previousRemainingMs = 0;
    return true;
  }

  poll() {
    if (this.state !== 'running') return this.remaining;

    const activeRun = this.runId;
    const remainingMs = Math.max(0, this.deadline - this.now());
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    this.remainingMs = remainingMs;
    this.onTick(remainingSeconds);
    if (this.runId !== activeRun || this.state !== 'running') return remainingSeconds;

    if (!this.tenFired && this.previousRemainingMs >= 10000 && remainingMs > 0 && remainingMs <= 10000) {
      this.tenFired = true;
      this.onTen();
      if (this.runId !== activeRun || this.state !== 'running') return remainingSeconds;
    }

    this.previousRemainingMs = remainingMs;
    if (remainingMs === 0) {
      this.state = 'done';
      this.onDone();
    }
    return remainingSeconds;
  }
}
