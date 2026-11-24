// Sound follows the picture: the jing strikes each time the large ripple is born
// on the newest curve shown on screen (the visitor's own or another visitor's).
// display() returns the loop object that the renderer is drawing right now.
// A long frame can delay the scheduling timer, so look further ahead and still play a
// strike found a little late, skipping its first moments so its tail stays in time.
const lookahead = .35, late = .15, tolerance = .03;

export class AudioEngine {
  constructor(display, onError) {
    this.display = display;
    this.onError = onError;
    this.buffer = null;
    this.jing = true;
    this.volume = 1;
    this.ctx = null;
    this.scheduled = [];
    this.loading = null;
  }
  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      this.updateGains();
      this.ctx.onstatechange = () => this.sync(true);
      this.wake = () => { if (!document.hidden && this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.ctx.resume().catch(() => {}); };
      document.addEventListener('visibilitychange', this.wake);
      this.loading = this.load();
      this.timer = setInterval(() => this.tick(), 25);
    }
    await this.ctx.resume();
    this.sync(true);
    await this.loading;
    // Begin with the next ripple, never one that is already growing.
    this.armTime = performance.now() / 1000;
    return true;
  }
  async load() {
    try {
      const r = await fetch('./sounds/jing.wav');
      if (!r.ok) throw Error('Missing sound: jing');
      this.buffer = await this.ctx.decodeAudioData(await r.arrayBuffer());
    } catch (e) { this.onError(e.message); throw e; }
  }
  // performance.now() and the audio clock drift apart, and the audio clock stops while
  // suspended. Re-measure the offset continuously instead of once at unlock.
  sync(force = false) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    let offset;
    const stamp = this.ctx.getOutputTimestamp?.();
    if (stamp && stamp.performanceTime > 0 && stamp.contextTime > 0) offset = stamp.performanceTime / 1000 - stamp.contextTime;
    else offset = performance.now() / 1000 - this.ctx.currentTime + (this.ctx.outputLatency || this.ctx.baseLatency || 0);
    if (force || this.offset === undefined || Math.abs(offset - this.offset) > .02) this.offset = offset;
    else this.offset += (offset - this.offset) * .05;
  }
  updateGains() {
    if (!this.ctx) return;
    this.gain.gain.setValueAtTime(this.jing ? this.volume : 0, this.ctx.currentTime);
  }
  // Ripple births of the displayed curve inside [now, horizon]. The renderer draws the
  // ripple from cyclePhase = 0, i.e. at epoch + k * duration.
  plan(now, horizon) {
    const d = this.display(now);
    const duration = d?.active?.duration;
    if (!(duration > 0) || !Number.isFinite(d.epoch)) return [];
    const events = [];
    for (let k = Math.max(0, Math.ceil((now - late - d.epoch) / duration)); ; k++) {
      const at = d.epoch + k * duration;
      if (at > horizon) break;
      if (at >= now - late && at > (this.armTime ?? Infinity)) events.push({ at, length: duration });
    }
    return events;
  }
  tick() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.buffer) return;
    this.sync();
    const now = performance.now() / 1000, events = this.plan(now, now + lookahead);
    const near = (a, b) => Math.abs(a - b) < tolerance;
    // Cancel strikes the picture no longer calls for (a new curve took the front).
    this.scheduled = this.scheduled.filter(s => {
      if (s.at < now - .5) return false;
      if (s.at > now + .005 && !events.some(e => near(e.at, s.at))) { try { s.source.stop(); } catch { /* already stopped */ } return false; }
      return true;
    });
    for (const e of events) {
      if (this.scheduled.some(s => near(s.at, e.at))) continue;
      const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
      source.buffer = this.buffer;
      source.connect(gain);
      gain.connect(this.gain);
      const target = e.at - this.offset, when = Math.max(this.ctx.currentTime, target), skip = when - target;
      const duration = Math.min(this.buffer.duration, e.length) - skip;
      if (duration <= .01) continue;
      gain.gain.setValueAtTime(1, when);
      // A long jing fades over the last 5 ms so it never overlaps the next ripple.
      if (this.buffer.duration > e.length) {
        gain.gain.setValueAtTime(1, when + Math.max(0, duration - .005));
        gain.gain.linearRampToValueAtTime(0, when + duration);
      }
      source.start(when, skip);
      source.stop(when + duration);
      this.scheduled.push({ at: e.at, source });
    }
  }
  dispose() {
    clearInterval(this.timer);
    if (this.wake) document.removeEventListener('visibilitychange', this.wake);
    this.ctx?.close();
  }
}
