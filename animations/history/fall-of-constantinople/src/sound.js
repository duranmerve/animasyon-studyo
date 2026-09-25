// Sound effects and ambience made with Web Audio (no sound files). Effects are ducked while the narrator speaks.
import { SFX } from './scenes.js';

export class Sound {
  constructor(chapters) {
    this.enabled = true;
    this.events = [];
    for (const ch of chapters) for (const [t, type, arg] of (SFX[ch.id]?.(ch.cue, ch) || [])) this.events.push({ t: ch.start + t, type, arg });
    this.events.sort((a, b) => a.t - b.t);
  }
  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.enabled ? 1 : 0; this.master.connect(c.destination);
    this.duck = c.createGain(); this.duck.gain.value = 1; this.duck.connect(this.master);
    // shared noise buffer
    const n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = w; }
    this.noise = buf;
    const bn = c.createBuffer(1, n, c.sampleRate), bd = bn.getChannelData(0);
    for (let i = 0; i < n; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = b * 3.5; }
    this.brown = bn;
    // ambience: sea wash + low drone
    const sea = c.createBufferSource(); sea.buffer = bn; sea.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const sg = c.createGain(); sg.gain.value = 0.11;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.09; const lg = c.createGain(); lg.gain.value = 0.05; lfo.connect(lg); lg.connect(sg.gain); lfo.start();
    sea.connect(lp); lp.connect(sg); sg.connect(this.duck); sea.start();
    this.drone = c.createGain(); this.drone.gain.value = 0.0; this.drone.connect(this.duck);
    for (const [f, g] of [[73.4, 0.05], [110, 0.03], [146.8, 0.012]]) {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8;
      const og = c.createGain(); og.gain.value = g; o.connect(og); og.connect(this.drone); o.start();
    }
    this.drone.gain.setTargetAtTime(0.9, c.currentTime, 3);
    this.ambience = sg;
  }
  set enabled(v) { this._on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 1 : 0, this.ctx.currentTime, 0.1); }
  get enabled() { return this._on; }
  resume() { this.ctx?.resume(); if (this.ambience) this.ambience.gain.setTargetAtTime(0.11, this.ctx.currentTime, 0.4); if (this.drone) this.drone.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.6); }
  pauseAll() { if (!this.ctx) return; this.ambience.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); this.drone.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); }
  jump() { /* events are fired by crossing their time, nothing to reset */ }
  update(prevT, T, narrating, rate) {
    if (!this.ctx || T <= prevT) return;
    this.duck.gain.setTargetAtTime(narrating ? 0.38 : 1, this.ctx.currentTime, 0.25);
    if (T - prevT > 0.5) return;   // a jump: don't fire everything in between
    for (const e of this.events) if (e.t > prevT && e.t <= T) this.play(e.type, e.arg);
  }
  play(type, arg) {
    if (!this.ctx || !this._on) return;
    const f = this[type]; if (f) f.call(this, this.ctx.currentTime + 0.01, arg);
  }
  src(buf) { const s = this.ctx.createBufferSource(); s.buffer = buf; return s; }
  env(t, a, d, peak = 1) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + a + d); return g; }

  // cannon: a thump that drops in pitch plus a rumbling noise tail
  boom(t, k = 1) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.6);
    const og = this.env(t, 0.005, 1.1, 0.9 * k); o.connect(og); og.connect(this.duck); o.start(t); o.stop(t + 1.3);
    const n = this.src(this.brown), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(120, t + 2);
    const ng = this.env(t, 0.01, 2.4, 1.2 * k); n.connect(lp); lp.connect(ng); ng.connect(this.duck); n.start(t, Math.random()); n.stop(t + 2.6);
  }
  // iron chain: a few metallic clinks
  chain(t) {
    const c = this.ctx;
    for (let i = 0; i < 9; i++) {
      const tt = t + i * 0.09 + Math.random() * 0.05;
      for (const f of [2300, 3170, 4410]) {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * (0.9 + Math.random() * 0.2);
        const g = this.env(tt, 0.002, 0.18, 0.05); o.connect(g); g.connect(this.duck); o.start(tt); o.stop(tt + 0.25);
      }
    }
  }
  // kös: big war drum
  drum(t, n = 4) {
    const c = this.ctx;
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.62 + (i % 2) * 0.05;
      const o = c.createOscillator(); o.frequency.setValueAtTime(70, tt); o.frequency.exponentialRampToValueAtTime(45, tt + 0.3);
      const g = this.env(tt, 0.004, 0.55, i % 2 ? 0.5 : 0.8); o.connect(g); g.connect(this.duck); o.start(tt); o.stop(tt + 0.7);
      const s = this.src(this.noise), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 180; bp.Q.value = 1.2;
      const sg = this.env(tt, 0.002, 0.12, 0.25); s.connect(bp); bp.connect(sg); sg.connect(this.duck); s.start(tt, Math.random()); s.stop(tt + 0.2);
    }
  }
  // church bell: inharmonic partials
  bell(t, k = 0.5) {
    const c = this.ctx;
    for (const [r, g, d] of [[1, 0.5, 4], [2.0, 0.3, 3], [2.4, 0.22, 2.6], [3.0, 0.16, 2], [4.2, 0.1, 1.4], [0.5, 0.3, 5]]) {
      const o = c.createOscillator(); o.frequency.value = 294 * r;
      const e = this.env(t, 0.004, d, g * 0.25 * k); o.connect(e); e.connect(this.duck); o.start(t); o.stop(t + d + 0.1);
    }
  }
  // wooden creak and rumble of ships hauled over logs
  creak(t) {
    const c = this.ctx;
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.7;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(120 + Math.random() * 40, tt); o.frequency.linearRampToValueAtTime(90 + Math.random() * 60, tt + 0.5);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 6;
      const g = this.env(tt, 0.08, 0.5, 0.07); o.connect(bp); bp.connect(g); g.connect(this.duck); o.start(tt); o.stop(tt + 0.7);
    }
    const n = this.src(this.brown), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200;
    const ng = this.env(t, 0.4, 2.2, 0.35); n.connect(lp); lp.connect(ng); ng.connect(this.duck); n.start(t, Math.random()); n.stop(t + 2.8);
  }
  // soft stamp when a panel or label settles
  stamp(t) {
    const c = this.ctx;
    const n = this.src(this.noise), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const g = this.env(t, 0.003, 0.14, 0.22); n.connect(lp); lp.connect(g); g.connect(this.duck); n.start(t, Math.random()); n.stop(t + 0.2);
    const o = c.createOscillator(); o.frequency.value = 110; const og = this.env(t, 0.003, 0.18, 0.25); o.connect(og); og.connect(this.duck); o.start(t); o.stop(t + 0.25);
  }
  // paper sweep for page-like panels
  swish(t) {
    const c = this.ctx;
    const n = this.src(this.noise), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(3500, t + 0.35);
    const g = this.env(t, 0.12, 0.3, 0.09); n.connect(bp); bp.connect(g); g.connect(this.duck); n.start(t, Math.random()); n.stop(t + 0.5);
  }
  // crowd roar / battle for the final assault
  roar(t, d = 3) {
    const c = this.ctx;
    const n = this.src(this.noise), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.8); g.gain.linearRampToValueAtTime(0.0, t + d);
    n.loop = true; n.connect(bp); bp.connect(g); g.connect(this.duck); n.start(t, Math.random()); n.stop(t + d + 0.1);
  }
}
