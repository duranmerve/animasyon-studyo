// Synthesised machine sounds (Web Audio, no recordings): motors, polygon-mirror whine, fan,
// fuser hiss, scanner stepper, paper swishes, solenoid clicks, lid thud and data blips.
// The same graph runs live in the player or inside an OfflineAudioContext to render the whole
// soundtrack (effects + narration) for a video, sample-accurately at story time.
import { S_WAIT, S_EXIT, LEAD_FINAL } from '../scene/layout.js';

const MASTER = 0.8, DUCKED = 0.42;

export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.duck = false; }

  // live playback
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    this.build(new (window.AudioContext || window.webkitAudioContext)());
  }

  build(C) {
    this.ctx = C;
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    comp.connect(C.destination);
    this.out = comp;
    this.master = C.createGain(); this.master.gain.value = this.muted ? 0 : MASTER;
    this.master.connect(comp);
    this.noise = makeNoise(C);
    const loopNoise = (type, f, q, g0 = 0) => {
      const src = C.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const flt = C.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
      const g = C.createGain(); g.gain.value = g0;
      src.connect(flt).connect(g).connect(this.master); src.start(0);
      return { g, flt };
    };
    this.room = loopNoise('lowpass', 300, 0.5, 0.012);
    this.fan = loopNoise('bandpass', 520, 0.6);
    this.hiss = loopNoise('highpass', 3500, 0.7);
    const mg = C.createGain(); mg.gain.value = 0;
    const mf = C.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 280; mf.Q.value = 2;
    this.motorOsc = [58, 117].map((f, i) => { const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = C.createGain(); g.gain.value = i ? 0.4 : 1; o.connect(g).connect(mf); o.start(0); return o; });
    mf.connect(mg).connect(this.master);
    this.motor = { g: mg };
    const wo = C.createOscillator(); wo.type = 'triangle'; wo.frequency.value = 410;
    const wg = C.createGain(); wg.gain.value = 0; wo.connect(wg).connect(this.master); wo.start(0);
    this.whine = { o: wo, g: wg };
    const po = C.createOscillator(); po.type = 'sine'; po.frequency.value = 1880;
    const lfo = C.createOscillator(); lfo.frequency.value = 5.5; const lg = C.createGain(); lg.gain.value = 7; lfo.connect(lg).connect(po.frequency); lfo.start(0);
    const pg = C.createGain(); pg.gain.value = 0; po.connect(pg).connect(this.master); po.start(0);
    this.poly = { g: pg };
    const so = C.createOscillator(); so.type = 'square'; so.frequency.value = 160;
    const sf = C.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 900;
    const sg = C.createGain(); sg.gain.value = 0; so.connect(sf).connect(sg).connect(this.master); so.start(0);
    this.stepper = { o: so, g: sg };
  }

  now(when) { return when ?? this.ctx.currentTime; }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.duck ? DUCKED : MASTER, this.ctx.currentTime, 0.05);
  }
  // lower the machine while the narrator speaks
  setDuck(d, when) {
    if (d === this.duck || !this.ctx) return;
    this.duck = d;
    if (!this.muted) this.master.gain.setTargetAtTime(d ? DUCKED : MASTER, this.now(when), d ? 0.12 : 0.5);
  }

  // continuous layers follow the machine state; rates are in cm/s of the process
  update(p, when) {
    if (!this.ctx) return;
    const t = this.now(when), k = 0.08;
    const drive = Math.min(1, Math.abs(p.drumSpeed) / 6);
    this.motor.g.gain.setTargetAtTime(p.on ? 0.035 + 0.06 * drive : 0, t, k);
    this.motorOsc[0].frequency.setTargetAtTime(52 + 20 * drive, t, k);
    this.motorOsc[1].frequency.setTargetAtTime(104 + 40 * drive, t, k);
    this.whine.g.gain.setTargetAtTime(p.on ? 0.006 * drive : 0, t, k);
    this.whine.o.frequency.setTargetAtTime(330 + 260 * drive, t, k);
    this.poly.g.gain.setTargetAtTime(p.laser ? 0.006 : 0, t, 0.2);
    this.fan.g.gain.setTargetAtTime(p.on ? 0.05 : 0.0, t, 0.4);
    this.hiss.g.gain.setTargetAtTime(p.fuser ? 0.008 : 0, t, 0.3);
    const sp = Math.abs(p.scanSpeed);
    this.stepper.g.gain.setTargetAtTime(sp > 0.05 ? 0.018 : 0, t, 0.05);
    this.stepper.o.frequency.setTargetAtTime(120 + sp * 40, t, 0.05);
  }

  // one frame of the story: continuous layers + events detected from the state change
  step(st, prev, dt, tl, { playing = true, explore = false, when } = {}) {
    if (!prev || dt <= 0 || !this.ctx) return;
    const jump = Math.abs(st.T - prev.T) > 0.5 || st.T < prev.T;
    const drumSpeed = jump ? 0 : (st.drumTravel - prev.drumTravel) / dt;
    const scanSpeed = jump ? 0 : (st.scanX - prev.scanX) / dt;
    const on = st.T > tl.byId.send.start + 5 && !explore;
    this.update({ on, drumSpeed, laser: st.laserVis > 0 && playing, fuser: st.fuserHeat > 0.5 && on, scanSpeed }, when);
    if (jump || !playing) return;
    if (prev.pickupAngle < 0.05 && st.pickupAngle >= 0.05) { this.click(0.25, when); this.swish(0.7, 0.12, when); }
    const lead = st.job === 2 ? st.sheet2.lead : st.sheet1.lead, plead = prev.job === 2 ? prev.sheet2.lead : prev.sheet1.lead;
    if (plead !== undefined && lead !== undefined) {
      if (plead < S_WAIT + 0.2 && lead >= S_WAIT + 0.2) this.click(0.18, when);
      if (plead < S_EXIT && lead >= S_EXIT) this.swish(0.9, 0.1, when);
      if (plead < LEAD_FINAL - 0.5 && lead >= LEAD_FINAL - 0.5) this.swish(0.35, 0.08, when);
    }
    if (prev.lidAngle > 0.03 && st.lidAngle <= 0.03) this.lid(0.45, when);
    if (prev.lidAngle <= 0.001 && st.lidAngle > 0.001) this.click(0.12, when);
    if (!prev.lampOn && st.lampOn) this.click(0.15, when);
    if (!prev.pressed && st.pressed) this.beep(when);
    if (st.packets > 0 && st.packets < 1) { this.blipAcc = (this.blipAcc || 0) + dt; if (this.blipAcc > 0.07) { this.blipAcc = 0; this.blip(when); } }
  }

  // one-shot events
  click(gain = 0.25, when) { this.burst({ f: 2400, q: 1.2, dur: 0.035, gain }, when); this.thump(90, 0.06, gain * 0.8, when); }
  swish(dur = 0.5, gain = 0.12, when) { this.burst({ f: 2800, q: 0.7, dur, gain, sweep: 0.6 }, when); }
  lid(gain = 0.45, when) { this.thump(70, 0.18, gain, when); this.burst({ f: 900, q: 0.8, dur: 0.08, gain: gain * 0.3 }, when); }
  beep(when) { const t = this.now(when); this.tone(1320, 0.06, 0.05, t); this.tone(1760, 0.08, 0.05, t + 0.07); }
  blip(when) { this.tone(900 + Math.random() * 900, 0.03, 0.02, this.now(when)); }

  burst({ f, q, dur, gain, sweep = 0 }, when) {
    if (!this.ctx || this.muted) return;
    const C = this.ctx, t = this.now(when);
    const s = C.createBufferSource(); s.buffer = this.noise;
    const fl = C.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(f * (1 - sweep * 0.7), t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.05, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(fl).connect(g).connect(this.master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  thump(f, dur, gain, when) {
    if (!this.ctx || this.muted) return;
    const C = this.ctx, t = this.now(when);
    const o = C.createOscillator(); o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  tone(f, dur, gain, t) {
    if (!this.ctx || this.muted) return;
    const C = this.ctx;
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = C.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
}

// Whole soundtrack for a video: effects driven by the story state plus every narration clip.
export async function renderSoundtrack(tl, S, { from = 0, to = tl.total, sampleRate = 48000, effects = true, voice = true } = {}) {
  const len = Math.max(1, to - from);
  const C = new OfflineAudioContext(2, Math.ceil(len * sampleRate), sampleRate);
  const snd = new Sound();
  snd.build(C);
  if (!effects) snd.master.gain.value = 0;
  const vbus = C.createGain(); vbus.gain.value = 1; vbus.connect(snd.out);
  if (voice) {
    for (const c of tl.chapters) {
      const v = c.voice;
      if (!v || v.start + v.dur < from || v.start > to) continue;
      const buf = await C.decodeAudioData(await (await fetch(v.url)).arrayBuffer());
      const src = C.createBufferSource(); src.buffer = buf; src.connect(vbus);
      const at = v.start - from;
      if (at >= 0) src.start(at); else src.start(0, -at);
    }
  }
  const dt = 1 / 30;
  let prev = null;
  for (let t = from; t < to; t += dt) {
    const st = S(t);
    const when = t - from;
    if (effects) {
      snd.setDuck(!!(voice && tl.voiceAt(t)), when);
      snd.step(st, prev, dt, tl, { when });
    }
    prev = st;
  }
  return C.startRendering();
}

// 16-bit PCM WAV bytes of an AudioBuffer
export function wavBytes(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
  w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Uint8Array(out.buffer);
}

function makeNoise(C) {
  const len = C.sampleRate * 2, b = C.createBuffer(1, len, C.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = 0.97 * last + 0.03 * w; d[i] = w * 0.6 + last * 3; }
  return b;
}
