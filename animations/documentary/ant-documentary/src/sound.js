// Sound world, synthesised (no files): wind through grass, sparse distant birds, a slow warm
// string-like pad (the documentary score), and small effects tied to scene cues. The same code
// schedules into a live AudioContext or an OfflineAudioContext (video soundtrack).
import { rng } from './noise.js';

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
// D major-ish, calm and warm; each chord: MIDI notes
const CHORDS = {
  surface: [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 64], [45, 52, 57, 61, 64]],
  lab: [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64]],
  nest: [[38, 45, 50, 53, 57], [36, 43, 48, 51, 55], [41, 48, 53, 57, 60]],
  end: [[50, 57, 62, 66, 69, 74], [43, 50, 55, 59, 62, 71], [45, 52, 57, 61, 64, 69], [50, 57, 62, 66, 69, 78]],
};
const MOOD = { kisayol: 'lab', yuva: 'nest', kapanis: 'end' };

// build the list of sound events for the whole film (story seconds)
export function scoreEvents(tl) {
  const ev = [];
  const R = rng(99);
  for (const ch of tl.chapters) {
    const mood = MOOD[ch.id] || 'surface';
    const chords = CHORDS[mood];
    const len = mood === 'end' ? 5.5 : 7.5;
    for (let t = 0, k = ch.index; t < ch.dur - 0.5; t += len, k++) {
      ev.push({ t: ch.start + t, dur: Math.min(len + 2.5, ch.dur - t + 2), type: 'pad', notes: chords[k % chords.length], mood });
    }
    ev.push({ t: ch.start, dur: ch.dur, type: 'wind', mood });
    if (mood === 'surface' || mood === 'end') {
      for (let t = 2 + R() * 6; t < ch.dur - 1; t += 5 + R() * 9) ev.push({ t: ch.start + t, dur: 1.2, type: 'bird', seed: Math.floor(R() * 1e6) });
    }
    ev.push({ t: ch.start + 0.05, dur: 2.5, type: 'swell' });
    // cue effects
    const fx = (name, type, extra = {}) => ch.cues[name] != null && ev.push({ t: ch.start + ch.cues[name], dur: 1.5, type, ...extra });
    if (ch.id === 'gozler') fx('mosaic', 'shimmer');
    if (ch.id === 'koku') fx('map', 'shimmer');
    if (ch.id === 'kimlik') { fx('touch', 'tick'); fx('mate', 'tick'); }
    if (ch.id === 'fizik') { fx('fall', 'whoosh'); fx('rain', 'plop'); }
    if (ch.id === 'ciftlik') fx('drop', 'drip');
    if (ch.id === 'iz') fx('trail', 'shimmer');
  }
  return ev.sort((a, b) => a.t - b.t);
}

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
  if (e.type === 'pad') {
    const g = ctx.createGain(); const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = e.mood === 'nest' ? 700 : 1400; f.Q.value = 0.4;
    f.connect(g); g.connect(dest);
    env(g, e.mood === 'end' ? 0.07 : 0.05, 2.2, 2.4, rem);
    e.notes.forEach((n, i) => {
      for (const det of [-6, 5]) {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = NOTE(n); o.detune.value = det + i * 1.3;
        const og = ctx.createGain(); og.gain.value = (i === 0 ? 0.9 : 0.55) / e.notes.length;
        o.connect(og); og.connect(f); o.start(t0); o.stop(t0 + rem + 0.1); nodes.push(o);
      }
    });
  } else if (e.type === 'wind') {
    const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = e.mood === 'nest' ? 180 : e.mood === 'lab' ? 900 : 520; f.Q.value = 0.6;
    const g = ctx.createGain();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 260;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(t0); lfo.stop(t0 + rem + 0.1);
    src.connect(f); f.connect(g); g.connect(dest);
    env(g, e.mood === 'lab' ? 0.012 : e.mood === 'nest' ? 0.05 : 0.035, 1.2, 1.2, rem);
    src.start(t0, (skip * 0.37) % 3.9); src.stop(t0 + rem + 0.1); nodes.push(src, lfo);
  } else if (e.type === 'bird') {
    const R = rng(e.seed);
    const n = 2 + Math.floor(R() * 4);
    const g = ctx.createGain(); g.gain.value = 0.012 + R() * 0.01; g.connect(dest);
    const base = 2600 + R() * 1800;
    for (let i = 0; i < n; i++) {
      if (skip > 0) break;
      const o = ctx.createOscillator(); o.type = 'sine';
      const st = t0 + i * (0.09 + R() * 0.08), len = 0.05 + R() * 0.07;
      o.frequency.setValueAtTime(base * (0.9 + R() * 0.3), st);
      o.frequency.exponentialRampToValueAtTime(base * (1.2 + R() * 0.4), st + len);
      const og = ctx.createGain(); og.gain.setValueAtTime(0, st); og.gain.linearRampToValueAtTime(1, st + 0.01); og.gain.linearRampToValueAtTime(0, st + len);
      o.connect(og); og.connect(g); o.start(st); o.stop(st + len + 0.02); nodes.push(o);
    }
  } else if (skip < 0.2) {
    // one-shot effects
    const g = ctx.createGain(); g.connect(dest);
    if (e.type === 'swell' || e.type === 'whoosh') {
      const src = ctx.createBufferSource(); src.buffer = noise(ctx);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(e.type === 'whoosh' ? 1800 : 300, t0); f.frequency.exponentialRampToValueAtTime(e.type === 'whoosh' ? 300 : 900, t0 + 1.2);
      src.connect(f); f.connect(g);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(e.type === 'whoosh' ? 0.08 : 0.03, t0 + 0.4); g.gain.linearRampToValueAtTime(0, t0 + 1.6);
      src.start(t0); src.stop(t0 + 1.7); nodes.push(src);
    } else if (e.type === 'shimmer') {
      [76, 81, 83, 88].forEach((n, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = NOTE(n);
        const og = ctx.createGain(); const st = t0 + i * 0.07;
        og.gain.setValueAtTime(0, st); og.gain.linearRampToValueAtTime(0.02, st + 0.05); og.gain.exponentialRampToValueAtTime(0.0005, st + 1.4);
        o.connect(og); og.connect(g); o.start(st); o.stop(st + 1.5); nodes.push(o);
      });
      g.gain.value = 1;
    } else if (e.type === 'tick') {
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 2200 + i * 300;
        const og = ctx.createGain(); const st = t0 + i * 0.11;
        og.gain.setValueAtTime(0.025, st); og.gain.exponentialRampToValueAtTime(0.0004, st + 0.04);
        o.connect(og); og.connect(g); o.start(st); o.stop(st + 0.05); nodes.push(o);
      }
      g.gain.value = 1;
    } else if (e.type === 'plop' || e.type === 'drip') {
      const o = ctx.createOscillator(); o.type = 'sine';
      const f0 = e.type === 'plop' ? 240 : 900;
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 2.4, t0 + 0.12);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(e.type === 'plop' ? 0.09 : 0.04, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.3);
      o.connect(g); o.start(t0); o.stop(t0 + 0.32); nodes.push(o);
    }
  }
  return nodes;
}
