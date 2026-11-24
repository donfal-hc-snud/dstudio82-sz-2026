import { galleryLoop, emptyGallery } from './shared-model.js';

const queueKey = 'rhythm-gallery-pending-v1';
export class SharedGallery {
  constructor(loop, status, onRestore = () => {}) {
    this.loop = loop;
    this.status = status;
    this.onRestore = onRestore;
    this.gallery = emptyGallery();
    this.cache = new Map();
    this.ownedIds = new Set();
    try { this.queue = JSON.parse(localStorage.getItem(queueKey) || '[]'); }
    catch { this.queue = []; }
    loop.onPublish = settings => this.publish(settings);
    this.timer = setInterval(() => this.sync(), 5000);
    this.sync();
  }
  remember() {
    try { localStorage.setItem(queueKey, JSON.stringify(this.queue)); } catch { /* Retry in memory. */ }
  }
  publish(settings) {
    const trace = { id: crypto.randomUUID(), settings: { ...settings } };
    this.ownedIds.add(trace.id);
    this.loop.sharedTraceId = trace.id;
    this.queue.push(trace);
    this.remember();
    this.sync();
  }
  accept(gallery) {
    if (gallery.version !== 1 || gallery.sequence < this.gallery.sequence) return;
    const firstRestore = this.gallery.sequence === 0 && gallery.sequence > 0;
    this.gallery = gallery;
    if (firstRestore) this.onRestore();
  }
  async sync() {
    if (this.busy || document.hidden) return;
    this.busy = true;
    try {
      while (this.queue.length) {
        const response = await fetch('/api/traces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.queue[0]) });
        if (!response.ok) throw new Error('Save pending · retrying');
        this.accept(await response.json());
        this.queue.shift();
        this.remember();
      }
      const response = await fetch('/api/traces');
      if (!response.ok) throw new Error('Shared gallery offline · retrying');
      this.accept(await response.json());
      this.status(`Shared gallery · ${this.gallery.sequence} traces saved · 8 × 8 view`);
    } catch (error) { this.status(error.message); }
    finally { this.busy = false; }
  }
  display(now) {
    // Keep a just-submitted curve visible while its durable write completes.
    if (this.queue.length) return this.loop;
    return galleryLoop(this.loop, this.gallery, now, this.ownedIds, this.cache);
  }
}
