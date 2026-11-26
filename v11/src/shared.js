import { galleryLoop, emptyGallery, appendTrace } from './shared-model.js';

const queueKey = 'rhythm-gallery-pending-v1';
const validTrace = t => t && typeof t.id === 'string' && t.settings && typeof t.settings === 'object';
// The server will never accept these, so retrying them would block every later save.
const permanent = status => status >= 400 && status < 500 && status !== 408 && status !== 429;

export class SharedGallery {
  constructor(loop, status, onRestore = () => {}) {
    this.loop = loop;
    this.status = status;
    this.onRestore = onRestore;
    this.gallery = emptyGallery();
    this.cache = new Map();
    this.ownedIds = new Set();
    this.clockOffset = 0;
    this.clockRtt = Infinity;
    try {
      const stored = JSON.parse(localStorage.getItem(queueKey) || '[]');
      this.queue = Array.isArray(stored) ? stored.filter(validTrace) : [];
    } catch { this.queue = []; }
    loop.onPublish = settings => this.publish(settings);
    this.timer = setInterval(() => this.sync(), 5000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.sync(); });
    this.sync();
  }
  remember() {
    try { localStorage.setItem(queueKey, JSON.stringify(this.queue)); } catch { /* Retry in memory. */ }
  }
  publish(settings) {
    // createdAt is only used for the optimistic view; the server stamps its own time.
    const trace = { id: crypto.randomUUID(), createdAt: Date.now() + this.clockOffset, settings: { ...settings } };
    this.ownedIds.add(trace.id);
    this.loop.sharedTraceId = trace.id;
    this.queue.push(trace);
    this.remember();
    if (this.busy) this.again = true;
    else this.sync();
  }
  // Keep the lowest-latency sample: its server time is the most trustworthy.
  clock(response, sent, received, cached) {
    const serverTime = Number(response.headers.get('x-server-time'));
    if (!Number.isFinite(serverTime) || serverTime <= 0) return;
    const age = cached ? Number(response.headers.get('age')) || 0 : 0;
    const rtt = received - sent;
    this.clockRtt *= 1.05; // Let an old best sample expire slowly.
    if (rtt > this.clockRtt) return;
    this.clockRtt = rtt;
    this.clockOffset = serverTime + age * 1000 + rtt / 2 - received;
  }
  accept(gallery) {
    if (!gallery || gallery.version !== 1 || gallery.sequence < this.gallery.sequence) return;
    const firstRestore = this.gallery.sequence === 0 && gallery.sequence > 0;
    this.gallery = gallery;
    if (firstRestore) this.onRestore();
  }
  async flush() {
    while (this.queue.length) {
      const trace = this.queue[0];
      const sent = Date.now();
      let response;
      try {
        response = await fetch('/api/traces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trace) });
      } catch { throw new Error('Save pending · offline · retrying'); }
      if (permanent(response.status)) {
        // Drop a rejected trace instead of retrying it forever.
        this.queue.shift();
        this.remember();
        this.ownedIds.delete(trace.id);
        this.rejected = true;
        continue;
      }
      if (!response.ok) throw new Error('Save pending · retrying');
      this.clock(response, sent, Date.now(), false);
      this.accept(await response.json());
      this.queue.shift();
      this.remember();
    }
  }
  async sync() {
    if (this.busy || document.hidden) return;
    this.busy = true;
    let saveError = null;
    try {
      do {
        this.again = false;
        try { await this.flush(); } catch (error) { saveError = error; }
      } while (this.again && !saveError);
      // Always read the gallery, even while a save is still pending.
      const sent = Date.now();
      const response = await fetch('/api/traces');
      if (!response.ok) throw new Error('Shared gallery offline · retrying');
      this.clock(response, sent, Date.now(), true);
      this.accept(await response.json());
      const note = this.rejected ? ' · one invalid record skipped' : '';
      this.status(saveError ? saveError.message : `Shared gallery · ${this.gallery.sequence} traces saved · 8 × 8 view${note}`);
    } catch (error) { this.status(saveError ? saveError.message : error.message); }
    finally {
      this.busy = false;
      // A trace published during the read is sent right away, not on the next tick.
      if (this.again && !saveError) { this.again = false; setTimeout(() => this.sync(), 0); }
    }
  }
  // The shared gallery plus this visitor's unsaved traces, as the server will store them.
  // Showing it while a save is pending keeps the same scene before and after the save,
  // instead of switching to the local-only loop and back.
  optimistic() {
    if (!this.queue.length) return this.gallery;
    const key = `${this.gallery.sequence}|${this.queue.map(t => t.id).join(',')}`;
    if (this.optimisticKey !== key) {
      this.optimisticKey = key;
      this.optimisticGallery = this.queue.reduce((g, t) => appendTrace(g, { ...t, createdAt: t.createdAt ?? Date.now() + this.clockOffset }), this.gallery);
    }
    return this.optimisticGallery;
  }
  display(now) {
    return galleryLoop(this.loop, this.optimistic(), now, this.ownedIds, this.cache, this.clockOffset);
  }
}
