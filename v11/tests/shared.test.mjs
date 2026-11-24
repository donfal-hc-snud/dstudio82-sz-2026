import test from 'node:test';
import assert from 'node:assert/strict';
import { appendTrace, emptyGallery, galleryLoop } from '../src/shared-model.js';
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
