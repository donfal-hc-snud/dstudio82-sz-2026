import test from 'node:test';
import assert from 'node:assert/strict';
import { appendTrace, emptyGallery, galleryLoop, normalizeRhythm } from '../src/shared-model.js';
import { Loop } from '../src/model.js';

test('all writes counted, display remains eight figures by eight curves', () => {
  let gallery = emptyGallery();
  for (let figure = 0; figure < 20; figure++) {
    for (let depth = 0; depth < 12; depth++) {
      gallery = appendTrace(gallery, { id: `${figure}-${depth}`, createdAt: 1000,
        settings: { meter: figure % 10, rhythm: '', helix: false, startRight: true } });
    }
  }
  assert.equal(gallery.sequence, 240);
  assert.equal(gallery.figures.length, 8);
  assert.ok(gallery.figures.every(f => f.traces.length === 8));
  const trace = gallery.figures[0].traces[0];
  assert.equal(appendTrace(gallery, trace), gallery);
  const local = new Loop(0);
  const restored = galleryLoop(local, JSON.parse(JSON.stringify(gallery)), 100, new Set(), new Map());
  assert.equal(restored.figures.length, 7);
  assert.equal(restored.history.length, 7);
  assert.equal(restored.active.settings.meter, trace.settings.meter);
  assert.equal(restored.phase(100), restored.duration);
  assert.equal(local.history.length, 0);
});

test('only applied input publishes, repeats do not publish', () => {
  const loop = new Loop(0, () => 1);
  const events = [];
  loop.onPublish = settings => events.push(settings);
  loop.submit({ ...loop.active.settings, rhythm: '5 3 4' }, 1);
  loop.update(3);
  assert.equal(events.length, 0);
  loop.update(4);
  assert.equal(events.length, 1);
  loop.update(40);
  assert.equal(events.length, 1);
  loop.selectMeter(0, 41);
  loop.update(44);
  assert.equal(events.length, 2);
  assert.equal(events[1].meter, 0);
});

test('a confirmed save keeps the owner curve on the local clock', () => {
  const loop = new Loop(100);
  const id = '11111111-1111-4111-8111-111111111111';
  loop.sharedTraceId = id;
  const gallery = appendTrace(emptyGallery(), { id, createdAt: Date.now(), settings: { ...loop.active.settings } });
  const display = galleryLoop(loop, gallery, 101.5, new Set([id]), new Map());
  assert.equal(display.phase(101.5), loop.phase(101.5));
  assert.equal(display.epoch, loop.epoch);
});

test('remote curves use the server clock offset', () => {
  const loop = new Loop(0);
  const gallery = appendTrace(emptyGallery(), { id: 'remote', createdAt: Date.now() + 10_000, settings: { meter: 6, rhythm: '', helix: false, startRight: true } });
  const ahead = galleryLoop(loop, gallery, 50, new Set(), new Map(), 12_000);
  assert.ok(Math.abs(ahead.epoch - 48) < 0.05);
});

test('a figure keeps its id and colours after more than eight traces', () => {
  let gallery = emptyGallery();
  const ids = [];
  for (let i = 0; i < 12; i++) {
    gallery = appendTrace(gallery, { id: `t${i}`, createdAt: 0, settings: { meter: 6, rhythm: '', helix: false, startRight: true } });
    ids.push(galleryLoop(new Loop(0), gallery, 0, new Set(), new Map()).id);
  }
  assert.deepEqual(new Set(ids), new Set([1]));
  // An index written before figure ids existed adopts its oldest visible trace.
  const legacy = structuredClone(gallery);
  delete legacy.figures[0].id;
  legacy.figures[0].traces = legacy.figures[0].traces.slice(0, 3);
  const migrated = appendTrace(legacy, { id: 'next', createdAt: 0, settings: { meter: 6, rhythm: '', helix: false, startRight: true } });
  assert.equal(migrated.figures[0].id, legacy.figures[0].traces.at(-1).sequence);
});

test('stored rhythms are normalised and still validated', () => {
  assert.equal(normalizeRhythm('  4\t 4    4 ', 6), '4 4 4');
  assert.equal(normalizeRhythm('', 6), '');
  assert.throws(() => normalizeRhythm('7 5', 6));
});

test('a pending save is shown in the shared scene, not a local-only view', async () => {
  globalThis.document ??= { hidden: true, addEventListener() {} };
  globalThis.localStorage ??= { getItem: () => null, setItem() {} };
  const { SharedGallery } = await import('../src/shared.js');
  const loop = new Loop(0);
  const shared = new SharedGallery(loop, () => {});
  clearInterval(shared.timer);
  shared.gallery = appendTrace(appendTrace(emptyGallery(), { id: 'a', createdAt: 0, settings: { meter: 2, rhythm: '', helix: false, startRight: true } }),
    { id: 'b', createdAt: 0, settings: { meter: 9, rhythm: '', helix: false, startRight: true } });
  shared.busy = true; // keep the save pending
  shared.publish({ ...loop.active.settings });
  const pending = shared.display(1);
  assert.notEqual(pending, loop);
  assert.equal(pending.figures.length + 1, 3);
  assert.equal(pending.epoch, loop.epoch);
  // The confirmed index is the same scene: same front figure, revision and clock.
  shared.gallery = appendTrace(shared.gallery, { ...shared.queue[0], createdAt: 5 });
  shared.queue = [];
  const saved = shared.display(1);
  assert.deepEqual([saved.figureId, saved.revision, saved.figures.length, saved.epoch], [pending.figureId, pending.revision, pending.figures.length, pending.epoch]);
});
