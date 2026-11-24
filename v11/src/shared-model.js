import { generate, parseRhythm, meters } from './model.js';

export const emptyGallery = () => ({ version: 1, sequence: 0, figures: [], recentIds: [] });

// One canonical spelling per rhythm, so stored text never carries extra whitespace.
export function normalizeRhythm(text, meter) {
  if (typeof text !== 'string' || !text.trim()) return '';
  return parseRhythm(text, meters[meter]).join(' ');
}

// A figure keeps the sequence of its first trace for life. Older indexes had no
// id, so their oldest visible trace stands in until the figure next changes.
export const figureId = figure => figure.id ?? figure.traces.at(-1)?.sequence ?? 0;

// Archive entries are permanent. Only this small presentation index is bounded.
export function appendTrace(gallery, trace) {
  if (gallery.recentIds.includes(trace.id)) return gallery;
  const next = structuredClone(gallery);
  next.sequence++;
  if (next.figures[0]?.meter !== trace.settings.meter) {
    next.figures.unshift({ id: next.sequence, meter: trace.settings.meter, traces: [] });
  } else if (next.figures[0].id == null) {
    next.figures[0].id = figureId(next.figures[0]);
  }
  next.figures[0].traces.unshift({ ...trace, sequence: next.sequence });
  next.figures[0].traces = next.figures[0].traces.slice(0, 8);
  next.figures = next.figures.slice(0, 8);
  next.recentIds = [trace.id, ...next.recentIds].slice(0, 512);
  return next;
}

// clockOffset: estimated server Date.now() minus this browser's Date.now(), in ms.
export function galleryLoop(local, gallery, now, ownedIds, cache, clockOffset = 0) {
  if (!gallery.figures.length) return local;
  const geometry = trace => {
    if (!cache.has(trace.id)) cache.set(trace.id, generate(trace.settings));
    return cache.get(trace.id);
  };
  const figure = item => ({
    id: figureId(item),
    active: geometry(item.traces[0]),
    revision: item.traces[0].sequence,
    history: item.traces.slice(1).map(t => ({ geometry: geometry(t), id: t.sequence }))
  });
  const newest = gallery.figures[0].traces[0];
  const display = Object.create(local);
  Object.assign(display, figure(gallery.figures[0]));
  display.figureId = display.id;
  display.figures = gallery.figures.slice(1).map(figure);
  display.layoutRevision = gallery.sequence;
  display.layoutAt = -1e30;
  const owned = ownedIds.has(newest.id) && newest.id === local.sharedTraceId;
  if (owned) {
    // The visitor's own curve keeps the local clock that also drives its sound,
    // so a confirmed save never restarts the drawing.
    display.epoch = local.epoch;
    display.revealEpoch = local.revealEpoch;
    display.lastBoundary = local.lastBoundary;
  } else {
    // Remote work stays fully drawn. Only the owner's current curve has a moving gap.
    const age = Math.max(0, (Date.now() + clockOffset - newest.createdAt) / 1000);
    display.epoch = display.revealEpoch = now - age;
    display.lastBoundary = -1e30;
    display.phase = () => display.duration;
    display.repeating = () => false;
  }
  const visibleIds = new Set(gallery.figures.flatMap(f => f.traces.map(t => t.id)));
  for (const id of cache.keys()) if (!visibleIds.has(id)) cache.delete(id);
  return display;
}
