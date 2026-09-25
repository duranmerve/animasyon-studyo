// Narration: one recording per chapter, read as a whole paragraph. While it plays it is the clock:
// story time follows the audio (never backwards), so a slow frame never makes the voice skip.
// The current and next chapters' recordings are preloaded and played from their own elements.
export class Narration {
  constructor() {
    this.enabled = true;
    this.pool = new Map(); // url → HTMLAudioElement
    this.ch = null;        // chapter whose recording is loaded in `el`
    this.el = null;
    this.muted = false;
  }

  audioFor(url) {
    let a = this.pool.get(url);
    if (!a) {
      a = new Audio();
      a.preload = 'auto';
      a.preservesPitch = true;
      a.src = url;
      this.pool.set(url, a);
    }
    return a;
  }

  // keep these chapters' recordings loaded; drop the others
  prefetch(chapters) {
    const keep = new Set(chapters.filter(c => c?.voice).map(c => c.voice.url));
    if (this.ch?.voice) keep.add(this.ch.voice.url);
    for (const url of keep) this.audioFor(url);
    for (const [url, a] of this.pool) if (!keep.has(url) && a !== this.el) { a.removeAttribute('src'); a.load(); this.pool.delete(url); }
  }

  get speaking() { return !!this.el && !this.el.paused && !this.el.ended; }
  // asked to play but not enough data yet to move forward
  get waiting() { return this.speaking && (this.el.readyState < 3 || this.el.seeking); }

  // story time as told by the playing recording, or null
  clock() {
    if (!this.speaking || !this.ch) return null;
    return this.ch.voice.start + this.el.currentTime;
  }

  // ch: the chapter whose recording should be sounding at T (or null)
  sync(T, playing, speed, ch) {
    if (!this.enabled || !playing || !ch) {
      if (this.el && !this.el.paused) this.el.pause();
      if (!ch) this.ch = null;
      return;
    }
    const off = T - ch.voice.start;
    if (this.ch !== ch) {
      if (this.el && !this.el.paused) this.el.pause();
      this.ch = ch;
      this.el = this.audioFor(ch.voice.url);
      this.seekTo(off);
    } else if (this.el.paused && !this.el.ended && Math.abs(this.el.currentTime - off) > 0.3) {
      this.seekTo(off); // resumed after a pause or a jump inside the chapter
    }
    this.el.playbackRate = speed;
    this.el.muted = this.muted;
    if (this.el.paused && !this.el.ended) this.el.play().catch(() => {});
  }

  seekTo(sec) {
    const el = this.el;
    const set = () => { try { el.currentTime = Math.max(0, sec); } catch { /* not ready */ } };
    if (sec < 0.05) { if (el.currentTime > 0.05 || el.ended) set(); return; }
    if (el.readyState >= 1) set(); else el.addEventListener('loadedmetadata', set, { once: true });
  }

  // a jump in the story (chapter change, scrubbing): forget the current recording
  reset() { if (this.el && !this.el.paused) this.el.pause(); this.ch = null; }
  stop() { this.reset(); }
}
