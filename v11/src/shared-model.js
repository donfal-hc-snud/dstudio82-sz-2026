import { generate } from './model.js';

export const emptyGallery = () => ({ version: 1, sequence: 0, figures: [], recentIds: [] });

// Archive entries are permanent. Only this small presentation index is bounded.
export function appendTrace(gallery, trace) {
  if (gallery.recentIds.includes(trace.id)) return gallery;
  const next = structuredClone(gallery);
  if (next.figures[0]?.meter !== trace.settings.meter) {
    next.figures.unshift({ meter: trace.settings.meter, traces: [] });
  }
  next.sequence++;
  next.figures[0].traces.unshift({ ...trace, sequence: next.sequence });
  next.figures[0].traces = next.figures[0].traces.slice(0, 8);
  next.figures = next.figures.slice(0, 8);
  next.recentIds = [trace.id, ...next.recentIds].slice(0, 512);
  return next;
}

export function galleryLoop(local, gallery, now, ownedIds, cache) {
  if (!gallery.figures.length) return local;
  const geometry = trace => {
    if (!cache.has(trace.id)) cache.set(trace.id, generate(trace.settings));
    return cache.get(trace.id);
  };
  const figure = item => ({
    id: item.traces.at(-1).sequence,
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
  display.lastBoundary = display.layoutAt = -1e30;
  display.epoch = display.revealEpoch = now - Math.max(0, (Date.now() - newest.createdAt) / 1000);
  // Remote work stays fully drawn. Only the owner's current curve has a moving gap.
  if (!ownedIds.has(newest.id) || newest.id !== local.sharedTraceId) {
    display.phase = () => display.duration;
    display.repeating = () => false;
  }
  const visibleIds = new Set(gallery.figures.flatMap(f => f.traces.map(t => t.id)));
  for (const id of cache.keys()) if (!visibleIds.has(id)) cache.delete(id);
  return display;
}
