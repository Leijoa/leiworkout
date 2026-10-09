export const STORAGE_KEY = 'leiworkout_v3';
export const LEGACY_STORAGE_KEY = 'leiworkout_history';

const MAX_RECORDS = 5000;
const MAX_STEPS = 500;
const MAX_SHORT_STRING = 200;
const MAX_TEXT = 1000;
const MAX_AVATAR = 200_000;
const ROUTINE_KEYS = new Set(['abs', 'cardio', 'full']);
const DOMS_LEVELS = new Set(['none', 'mild', 'moderate', 'pain']);
const SETTINGS_KEYS = ['avatar', 'sound', 'vibe', 'voice', 'wake'];

const defaultSettings = () => ({ voice: true, sound: true, vibe: true, wake: true, avatar: null });

export function createDefaultData() {
  return { version: 3, history: [], reports: [], settings: defaultSettings() };
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isString = (value, max = MAX_SHORT_STRING) => typeof value === 'string' && value.length <= max;
const isInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const isNullableInteger = (value) => value === null || isInteger(value);
const isDate = (value) => isString(value) && Number.isFinite(Date.parse(value));
const hasExactKeys = (value, keys) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

function validSettings(value) {
  return isObject(value)
    && hasExactKeys(value, SETTINGS_KEYS)
    && typeof value.voice === 'boolean'
    && typeof value.sound === 'boolean'
    && typeof value.vibe === 'boolean'
    && typeof value.wake === 'boolean'
    && (value.avatar === null
      || (isString(value.avatar, MAX_AVATAR)
        && /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+=*$/i.test(value.avatar)));
}

function validStep(value) {
  return isObject(value)
    && hasExactKeys(value, ['name', 'status'])
    && isString(value.name)
    && ['completed', 'skipped', 'pending'].includes(value.status);
}

function validHistory(value) {
  if (!isObject(value) || typeof value.legacy !== 'boolean') return false;
  const common = isString(value.id)
    && isDate(value.date)
    && isString(value.title)
    && (value.key === null || ROUTINE_KEYS.has(value.key))
    && isString(value.effort)
    && isInteger(value.elapsedSeconds)
    && isNullableInteger(value.completed)
    && isNullableInteger(value.skipped)
    && isNullableInteger(value.total)
    && Array.isArray(value.steps)
    && value.steps.length <= MAX_STEPS
    && value.steps.every(validStep);
  if (!common) return false;

  if (value.legacy) {
    return hasExactKeys(value, [
      'id', 'date', 'title', 'key', 'effort', 'elapsedSeconds', 'completed', 'skipped',
      'total', 'steps', 'legacy',
    ]) && value.steps.length === 0;
  }

  return hasExactKeys(value, [
    'id', 'date', 'title', 'key', 'effort', 'elapsedSeconds', 'completed', 'skipped',
    'total', 'steps', 'legacy', 'doms', 'adjustment',
  ])
    && DOMS_LEVELS.has(value.doms)
    && isString(value.adjustment, MAX_TEXT)
    && value.key !== null
    && value.total === value.steps.length
    && value.completed === value.steps.filter((step) => step.status === 'completed').length
    && value.skipped === value.steps.filter((step) => step.status === 'skipped').length;
}

function validReport(value) {
  return isObject(value)
    && hasExactKeys(value, ['id', 'sessionId', 'date', 'level'])
    && isString(value.id)
    && (value.sessionId === null || isString(value.sessionId))
    && isDate(value.date)
    && DOMS_LEVELS.has(value.level);
}

export function validateData(value) {
  try {
    if (!isObject(value)
      || !hasExactKeys(value, ['version', 'history', 'reports', 'settings'])
      || value.version !== 3
      || !Array.isArray(value.history)
      || !Array.isArray(value.reports)
      || value.history.length > MAX_RECORDS
      || value.reports.length > MAX_RECORDS
      || !validSettings(value.settings)
      || !value.history.every(validHistory)
      || !value.reports.every(validReport)) return false;

    return new Set(value.history.map((row) => row.id)).size === value.history.length
      && new Set(value.reports.map((row) => row.id)).size === value.reports.length;
  } catch {
    return false;
  }
}

function errorResult(message) {
  return { data: createDefaultData(), readOnly: true, error: message };
}

function legacyKey(title) {
  if (/腹肌|核心/.test(title)) return 'abs';
  if (/跳繩|有氧/.test(title)) return 'cardio';
  if (/啞鈴|全身/.test(title)) return 'full';
  return null;
}

function hashLegacy(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function migrateLegacy(value) {
  if (!Array.isArray(value) || value.length > MAX_RECORDS) throw new TypeError('舊版訓練紀錄格式無效');
  const ids = new Set();
  const history = value.map((row, index) => {
    if (!isObject(row)
      || !hasExactKeys(row, ['date', 'routine', 'rating', 'duration'])
      || !isDate(row.date)
      || !isString(row.routine)
      || !isString(row.rating)
      || !Number.isFinite(row.duration)
      || row.duration < 0
      || row.duration > 1440) throw new TypeError('舊版訓練紀錄格式無效');
    const seed = `${row.date}\u0000${row.routine}\u0000${row.rating}\u0000${row.duration}\u0000${index}`;
    let id = `legacy-${hashLegacy(seed)}`;
    while (ids.has(id)) id += '-x';
    ids.add(id);
    return {
      id,
      date: row.date,
      title: row.routine,
      key: legacyKey(row.routine),
      effort: row.rating,
      elapsedSeconds: Math.max(0, Math.round(row.duration * 60)),
      completed: null,
      skipped: null,
      total: null,
      steps: [],
      legacy: true,
    };
  });
  return { version: 3, history, reports: [], settings: defaultSettings() };
}

export function loadData(storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return errorResult('v3 資料無法解析；原始資料已保留，請先匯出備份再修復。');
      }
      if (!validateData(parsed)) return errorResult('v3 資料格式無效；原始資料已保留，請先匯出備份再修復。');
      return { data: parsed, readOnly: false, error: null };
    }

    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw === null) return { data: createDefaultData(), readOnly: false, error: null };
    try {
      const data = migrateLegacy(JSON.parse(legacyRaw));
      return { data, readOnly: false, error: null };
    } catch {
      return errorResult('舊版資料無法解析或格式無效；原始資料已保留，請先匯出備份再修復。');
    }
  } catch {
    return errorResult('瀏覽器儲存空間無法讀取；目前以唯讀模式執行。');
  }
}

export function saveData(data, storage, { repair = false } = {}) {
  if (!validateData(data)) return { ok: false, error: '資料格式無效，未儲存。' };
  try {
    storage ??= globalThis.localStorage;
    const existing = storage.getItem(STORAGE_KEY);
    if (!repair && existing !== null) {
      let parsed;
      try {
        parsed = JSON.parse(existing);
      } catch {
        return { ok: false, error: '現有 v3 資料已損壞，為避免覆寫，未儲存。' };
      }
      if (!validateData(parsed)) return { ok: false, error: '現有 v3 資料格式無效，為避免覆寫，未儲存。' };
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: '瀏覽器儲存空間無法寫入。' };
  }
}

export function mergeData(current, imported) {
  if (!validateData(current) || !validateData(imported)) throw new TypeError('無法合併格式無效的資料');

  const historyIds = new Set(current.history.map((row) => row.id));
  const reportIds = new Set(current.reports.map((row) => row.id));
  const history = [...current.history, ...imported.history.filter((row) => !historyIds.has(row.id))];
  const reports = [...current.reports, ...imported.reports.filter((row) => !reportIds.has(row.id))];
  if (history.length > MAX_RECORDS || reports.length > MAX_RECORDS) {
    throw new RangeError('合併後的紀錄超過上限，資料未被截斷或修改');
  }

  return JSON.parse(JSON.stringify({ version: 3, history, reports, settings: current.settings }));
}
