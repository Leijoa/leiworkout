import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  createDefaultData,
  loadData,
  mergeData,
  saveData,
  validateData,
} from '../storage.js';

class MemoryStorage {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const session = (id = 'session-1', title = '腹肌訓練 A') => ({
  id,
  date: '2026-10-09T01:02:03.000Z',
  title,
  key: 'abs',
  effort: '剛好',
  elapsedSeconds: 900,
  completed: 1,
  skipped: 0,
  total: 1,
  steps: [{ name: 'Dead Bug', status: 'completed' }],
  legacy: false,
  doms: 'mild',
  adjustment: '工作量 80%',
});

const report = (id = 'report-1') => ({
  id,
  sessionId: 'session-1',
  date: '2026-10-10T01:02:03.000Z',
  level: 'mild',
});

test('returns a fresh v3 data object when storage is empty', () => {
  const first = loadData(new MemoryStorage());
  const second = loadData(new MemoryStorage());
  assert.deepEqual(first, { data: createDefaultData(), readOnly: false, error: null });
  first.data.settings.voice = false;
  assert.equal(second.data.settings.voice, true);
});

test('migrates valid v2 rows without writing or deleting the v2 key', () => {
  const legacy = [{ date: '2025-03-01T12:00:00.000Z', routine: '腹肌訓練 A', rating: '剛好', duration: 18 }];
  const storage = new MemoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(legacy) });
  let writes = 0;
  storage.setItem = () => { writes += 1; };
  const loaded = loadData(storage);

  assert.equal(loaded.readOnly, false);
  assert.equal(loaded.error, null);
  assert.equal(writes, 0);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), JSON.stringify(legacy));
  assert.deepEqual(loaded.data.history[0], {
    id: loaded.data.history[0].id,
    date: legacy[0].date,
    title: '腹肌訓練 A',
    key: 'abs',
    effort: '剛好',
    elapsedSeconds: 1080,
    completed: null,
    skipped: null,
    total: null,
    steps: [],
    legacy: true,
  });
  assert.equal(validateData(loaded.data), true);
});

test('corrupted v3 is recoverable read-only data and is not overwritten by default', () => {
  const original = '{broken-json';
  const storage = new MemoryStorage({ [STORAGE_KEY]: original });
  const loaded = loadData(storage);
  assert.equal(loaded.readOnly, true);
  assert.match(loaded.error, /原始資料已保留/);
  assert.deepEqual(loaded.data, createDefaultData());

  const saved = saveData(createDefaultData(), storage);
  assert.equal(saved.ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), original);
});

test('malformed v2 is read-only and remains untouched', () => {
  const original = '[broken';
  const storage = new MemoryStorage({ [LEGACY_STORAGE_KEY]: original });
  const loaded = loadData(storage);
  assert.equal(loaded.readOnly, true);
  assert.match(loaded.error, /原始資料已保留/);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), original);
});

test('storage read and write exceptions are returned instead of thrown', () => {
  const unreadable = { getItem() { throw new Error('denied'); } };
  assert.equal(loadData(unreadable).readOnly, true);

  const unwritable = {
    getItem() { return null; },
    setItem() { throw new Error('quota'); },
  };
  assert.deepEqual(saveData(createDefaultData(), unwritable), { ok: false, error: '瀏覽器儲存空間無法寫入。' });
});

test('a blocked global localStorage getter cannot abort app initialization', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('blocked', 'SecurityError'); },
  });
  try {
    const loaded = loadData();
    assert.equal(loaded.readOnly, true);
    assert.match(loaded.error, /無法讀取/);
    assert.equal(saveData(createDefaultData()).ok, false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('saves valid data and explicit repair can replace a corrupt v3 value', () => {
  const storage = new MemoryStorage();
  const data = createDefaultData();
  data.history.push(session());
  assert.deepEqual(saveData(data, storage), { ok: true, error: null });
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), data);

  storage.values.set(STORAGE_KEY, 'corrupt');
  assert.equal(saveData(data, storage, { repair: true }).ok, true);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), data);
});

test('accepts the bounded raster avatar used by the local coach profile', () => {
  const data = createDefaultData();
  data.settings.avatar = 'data:image/jpeg;base64,YWJjZA==';
  assert.equal(validateData(data), true);
  data.settings.avatar = 'data:image/svg+xml;base64,PHN2Zz4=';
  assert.equal(validateData(data), false);
  data.settings.avatar = `data:image/jpeg;base64,${'A'.repeat(200_000)}`;
  assert.equal(validateData(data), false);
});

test('merge unions ids, keeps current copies and settings, and deletes nothing', () => {
  const current = createDefaultData();
  current.settings.voice = false;
  current.history.push(session());
  current.reports.push(report());
  const imported = createDefaultData();
  imported.settings.sound = false;
  imported.history.push(session('session-1', '不可覆蓋'), session('session-2', '全身訓練'));
  imported.reports.push(report('report-1'), report('report-2'));

  const merged = mergeData(current, imported);
  assert.deepEqual(merged.settings, current.settings);
  assert.deepEqual(merged.history.map(({ id }) => id), ['session-1', 'session-2']);
  assert.equal(merged.history[0].title, '腹肌訓練 A');
  assert.deepEqual(merged.reports.map(({ id }) => id), ['report-1', 'report-2']);
});

test('merge rejects an over-limit union instead of silently truncating records', () => {
  const current = createDefaultData();
  current.history = Array.from({ length: 5000 }, (_, index) => session(`session-${index}`));
  const imported = createDefaultData();
  imported.history.push(session('session-extra'));
  assert.throws(() => mergeData(current, imported), RangeError);
  assert.equal(current.history.length, 5000);
});

test('rejects invalid, oversized, prototype-shaped, and hostile imports without mutation', () => {
  const current = createDefaultData();
  current.history.push(session());
  const snapshot = JSON.stringify(current);

  const invalid = createDefaultData();
  invalid.history.push({ ...session('bad'), elapsedSeconds: -1 });
  assert.equal(validateData(invalid), false);
  assert.throws(() => mergeData(current, invalid), TypeError);

  const oversized = createDefaultData();
  oversized.history.push(session('x', 'x'.repeat(201)));
  assert.equal(validateData(oversized), false);

  const inconsistent = createDefaultData();
  inconsistent.history.push({ ...session('counts'), completed: 0 });
  assert.equal(validateData(inconsistent), false);

  const polluted = createDefaultData();
  polluted.settings.extra = { __proto__: { admin: true } };
  assert.equal(validateData(polluted), false);

  const hostileButBounded = createDefaultData();
  hostileButBounded.history.push(session('html', '<img src=x onerror=alert(1)>'));
  const merged = mergeData(current, hostileButBounded);
  assert.equal(merged.history[1].title, '<img src=x onerror=alert(1)>');
  assert.equal(JSON.stringify(current), snapshot);
});
