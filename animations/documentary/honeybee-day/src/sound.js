// Sound world, synthesised (no files). Outside: wind in the grass, sparse birds (a dawn chorus
// early), the buzz of a bee passing the microphone (sawtooth near 230 Hz with Doppler). Inside:
// the thick hum of the colony and, during the dance, the ~250 Hz pulses of the dancer's wings.
// Night: crickets. Under everything one slow drone. Same code for a live AudioContext and an
// OfflineAudioContext (video soundtrack).
import { rng } from './noise.js';

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const INSIDE = new Set(['kovan', 'dans', 'okumak', 'bal']);
// drone voicings (MIDI): open fifths, darker inside, warmer at the end
const DRONE = { out: [45, 52, 57, 64], in: [38, 45, 50, 53], night: [40, 47, 52, 59] };

export function scoreEvents(tl) {
  const ev = [];
  const R = rng(77);
  for (const ch of tl.chapters) {
    const inside = INSIDE.has(ch.id);
    const night = ch.id === 'gece';
    const start = ch.start, dur = ch.dur;
    const cue = k => ch.cues[k] != null ? start + ch.cues[k] : null;
    ev.push({ t: start, dur: dur + 1.5, type: 'drone', notes: inside ? DRONE.in : night ? DRONE.night : DRONE.out, vol: inside ? 0.035 : 0.028 });
    if (!inside) ev.push({ t: start, dur: dur + 0.5, type: 'wind', vol: ch.id === 'gok' || ch.id === 'cayir' ? 0.05 : 0.035 });
    if (inside) ev.push({ t: start, dur: dur + 0.5, type: 'hum', vol: ch.id === 'kovan' ? 0.05 : 0.06, seed: ch.index });
    if (!inside && !night) {
      const dens = ch.id === 'safak' || ch.id === 'hafta' ? 2.2 : 7;
      for (let t = 1 + R() * 3; t < dur - 1; t += dens + R() * dens * 1.2) ev.push({ t: start + t, dur: 1.4, type: 'bird', seed: Math.floor(R() * 1e6), vol: ch.id === 'safak' ? 0.016 : 0.011 });
    }
    if (night) {
      const from = cue('sleep') ?? start + 8;
      ev.push({ t: start, dur: dur, type: 'crickets', vol: 0.012, seed: 5 });
      ev.push({ t: from, dur: start + dur - from, type: 'hum', vol: 0.03, seed: 9 });
    }
    // bees passing the microphone
    const buzz = (t, len = 1.6, vol = 0.05, pitch = 1) => t != null && ev.push({ t, dur: len, type: 'buzz', vol, pitch, seed: Math.floor(R() * 1e6) });
    if (ch.id === 'safak') { buzz(cue('nomap'), 2.4, 0.04); }
    if (ch.id === 'hafta') { buzz(cue('orient'), 3.5, 0.035, 0.97); buzz(cue('forage') + 1.5, 2.0, 0.04); }
    if (ch.id === 'gok') { buzz(start + 1.0, 2.2, 0.05); buzz(cue('wings'), 3.6, 0.03, 0.5); }
    if (ch.id === 'cayir') { buzz(cue('constancy') + 0.4, 1.8, 0.035); }
    if (ch.id === 'yuk') { buzz(cue('load'), 2.2, 0.05, 0.94); }
    if (ch.id === 'donus') { buzz(cue('eye'), 2.6, 0.045); buzz(cue('tell') + 0.6, 2.0, 0.04); }
    if (ch.id === 'gece') { buzz(start + 1.2, 2.2, 0.04, 0.96); }
    // the dance: wing pulses during each waggle run
    if (ch.id === 'dans' || ch.id === 'okumak') {
      const t0 = ch.id === 'dans' ? (cue('eight') ?? start + 3) : start;
      const t1 = start + dur - 0.5;
      for (let t = t0; t < t1; t += DANCE.cycle) ev.push({ t, dur: DANCE.run, type: 'waggle', vol: ch.id === 'dans' ? 0.03 : 0.022 });
    }
    // one-shots on scene cues
    const fx = (k, type, extra = {}) => { const t = cue(k); if (t != null) ev.push({ t: t - 0.15, dur: 1.6, type, ...extra }); };
    if (ch.id === 'gok') fx('beeview', 'shimmer');
    if (ch.id === 'cayir') { fx('theirs', 'shimmer'); fx('target', 'shimmer'); }
    if (ch.id === 'kovan') fx('nolight', 'swell');
    if (ch.id === 'bal') fx('cap', 'wax');
    ev.push({ t: start + 0.02, dur: 2.5, type: 'swell', vol: 0.02 });
  }
  return ev.sort((a, b) => a.t - b.t);
}
// the dancer's rhythm (seconds): a waggle run of ~1.5 s then a return loop
export const DANCE = { run: 1.5, cycle: 3.4 };

let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const n = ctx.sampleRate * 4;
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  const R = rng(3);
  let last = 0;
  for (let i = 0; i < n; i++) { const w = R() * 2 - 1; last = last * 0.97 + w * 0.03; d[i] = w * 0.5 + last * 3; }
  noiseBuf = b;
  return b;
}

// play one event into dest. `at` = context time of the event's start, `skip` = seconds already elapsed
export function playEvent(ctx, dest, e, at, skip = 0) {
  const nodes = [];
  const rem = e.dur - skip;
  if (rem <= 0.05) return nodes;
  const t0 = Math.max(ctx.currentTime, at + skip);
  const env = (g, peak, a, r, len) => {
    g.gain.setValueAtTime(0, t0);
    const aa = skip > 0 ? 0.3 : a;
    g.gain.linearRampToValueAtTime(peak, t0 + aa);
    g.gain.setValueAtTime(peak, t0 + Math.max(aa, len - r));
    g.gain.linearRampToValueAtTime(0, t0 + len);
  };
  const osc = (type, f, g, start = t0, stop = t0 + rem + 0.1) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g); o.start(start); o.stop(stop); nodes.push(o); return o; };
  if (e.type === 'drone') {
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.3;
    f.connect(g); g.connect(dest); env(g, e.vol, 3, 3, rem);
    e.notes.forEach((n, i) => { for (const det of [-5, 4]) { const og = ctx.createGain(); og.gain.value = (i === 0 ? 0.9 : 0.5) / e.notes.length; og.connect(f); const o = osc(i === 0 ? 'sine' : 'triangle', NOTE(n), og); o.detune.value = det + i; } });
  } else if (e.type === 'wind') {
    const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.55;
    const g = ctx.createGain();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = ctx.createGain(); lg.gain.value = 240;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(t0); lfo.stop(t0 + rem + 0.1);
    src.connect(f); f.connect(g); g.connect(dest); env(g, e.vol, 1.5, 1.5, rem);
    src.start(t0, (skip * 0.37) % 3.9); src.stop(t0 + rem + 0.1); nodes.push(src, lfo);
  } else if (e.type === 'hum') {
    // many wings far away: detuned saws around 230–260 Hz, low-passed, slowly breathing
    const R = rng(e.seed + 1);
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 0.7;
    f.connect(g); g.connect(dest); env(g, e.vol, 1.8, 1.5, rem);
    for (let i = 0; i < 7; i++) {
      const og = ctx.createGain(); og.gain.value = 0.11; og.connect(f);
      const o = osc('sawtooth', 215 + R() * 50, og); o.detune.value = (R() - 0.5) * 30;
      const l = ctx.createOscillator(); l.frequency.value = 0.1 + R() * 0.3; const lg = ctx.createGain(); lg.gain.value = 0.05; l.connect(lg); lg.connect(og.gain); l.start(t0); l.stop(t0 + rem + 0.1); nodes.push(l);
    }
    const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 160; const ng = ctx.createGain(); ng.gain.value = 0.5;
    src.connect(nf); nf.connect(ng); ng.connect(g); src.start(t0, (skip * 0.41) % 3.9); src.stop(t0 + rem + 0.1); nodes.push(src);
  } else if (e.type === 'crickets') {
    const R = rng(e.seed);
    const g = ctx.createGain(); g.connect(dest); env(g, e.vol, 1.5, 1.5, rem);
    for (let t = 0.3; t < rem - 0.3; t += 0.9 + R() * 0.5) {
      const st = t0 + t;
      for (let k = 0; k < 3; k++) {
        const s2 = st + k * 0.06;
        const og = ctx.createGain(); og.gain.setValueAtTime(0, s2); og.gain.linearRampToValueAtTime(1, s2 + 0.008); og.gain.linearRampToValueAtTime(0, s2 + 0.04); og.connect(g);
        osc('sine', 4300 + R() * 200, og, s2, s2 + 0.05);
      }
    }
  } else if (e.type === 'bird') {
    const R = rng(e.seed);
    const n = 2 + Math.floor(R() * 4);
    const g = ctx.createGain(); g.gain.value = e.vol; g.connect(dest);
    const base = 2400 + R() * 2000;
    for (let i = 0; i < n; i++) {
      if (skip > 0) break;
      const st = t0 + i * (0.09 + R() * 0.1), len = 0.05 + R() * 0.08;
      const og = ctx.createGain(); og.gain.setValueAtTime(0, st); og.gain.linearRampToValueAtTime(1, st + 0.01); og.gain.linearRampToValueAtTime(0, st + len); og.connect(g);
      const o = osc('sine', base, og, st, st + len + 0.02);
      o.frequency.setValueAtTime(base * (0.9 + R() * 0.3), st); o.frequency.exponentialRampToValueAtTime(base * (1.15 + R() * 0.4), st + len);
    }
  } else if (e.type === 'buzz') {
    // a bee crossing the microphone: approach, pass (Doppler drop), fade
    if (skip > e.dur * 0.6) return nodes;
    const R = rng(e.seed);
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.8;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    f.connect(g); if (pan) { g.connect(pan); pan.connect(dest); } else g.connect(dest);
    const L = rem, mid = t0 + L * 0.5;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(e.vol * 0.35, t0 + L * 0.25); g.gain.linearRampToValueAtTime(e.vol, mid); g.gain.linearRampToValueAtTime(0, t0 + L);
    f.frequency.setValueAtTime(900, t0); f.frequency.linearRampToValueAtTime(2600, mid); f.frequency.linearRampToValueAtTime(700, t0 + L);
    if (pan) { const side = R() < 0.5 ? -1 : 1; pan.pan.setValueAtTime(-0.7 * side, t0); pan.pan.linearRampToValueAtTime(0.7 * side, t0 + L); }
    const f0 = 232 * e.pitch;
    for (const [type, mul, v] of [['sawtooth', 1, 0.6], ['sawtooth', 1.004, 0.35], ['triangle', 2, 0.2]]) {
      const og = ctx.createGain(); og.gain.value = v; og.connect(f);
      const o = osc(type, f0 * mul, og, t0, t0 + L + 0.05);
      o.frequency.setValueAtTime(f0 * mul * 1.04, t0); o.frequency.linearRampToValueAtTime(f0 * mul, mid); o.frequency.linearRampToValueAtTime(f0 * mul * 0.95, t0 + L);
      // wing-beat tremolo
      const l = ctx.createOscillator(); l.frequency.value = 11 + R() * 6; const lg = ctx.createGain(); lg.gain.value = v * 0.25; l.connect(lg); lg.connect(og.gain); l.start(t0); l.stop(t0 + L + 0.05); nodes.push(l);
    }
  } else if (e.type === 'waggle') {
    // ~250 Hz bursts, pulsed at the waggle rate (~13 Hz)
    if (skip > 0.3) return nodes;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 260; f.Q.value = 2;
    f.connect(g); g.connect(dest); env(g, e.vol, 0.08, 0.15, rem);
    const og = ctx.createGain(); og.gain.value = 0.5; og.connect(f);
    osc('sawtooth', 255, og);
    const l = ctx.createOscillator(); l.type = 'square'; l.frequency.value = 13; const lg = ctx.createGain(); lg.gain.value = 0.5; l.connect(lg); lg.connect(og.gain); l.start(t0); l.stop(t0 + rem + 0.1); nodes.push(l);
  } else if (skip < 0.2) {
    const g = ctx.createGain(); g.connect(dest);
    if (e.type === 'swell') {
      const src = ctx.createBufferSource(); src.buffer = noise(ctx);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
      f.frequency.setValueAtTime(260, t0); f.frequency.exponentialRampToValueAtTime(800, t0 + 1.3);
      src.connect(f); f.connect(g);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(e.vol ?? 0.025, t0 + 0.5); g.gain.linearRampToValueAtTime(0, t0 + 1.8);
      src.start(t0); src.stop(t0 + 1.9); nodes.push(src);
    } else if (e.type === 'shimmer') {
      [79, 84, 86, 91].forEach((n, i) => {
        const og = ctx.createGain(); const st = t0 + i * 0.06;
        og.gain.setValueAtTime(0, st); og.gain.linearRampToValueAtTime(0.014, st + 0.05); og.gain.exponentialRampToValueAtTime(0.0004, st + 1.5); og.connect(g);
        osc('sine', NOTE(n), og, st, st + 1.6);
      });
    } else if (e.type === 'wax') {
      const src = ctx.createBufferSource(); src.buffer = noise(ctx);
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      src.connect(f); f.connect(g);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.01, t0 + 0.2); g.gain.linearRampToValueAtTime(0, t0 + 1.2);
      src.start(t0); src.stop(t0 + 1.3); nodes.push(src);
    }
  }
  return nodes;
}
