// Dry mechanical sounds made with Web Audio (no files). The same functions run in the live page and in
// an OfflineAudioContext for the video soundtrack. play(ctx, dest, type, when, gain)
let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const b = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
  return (noiseBuf = b);
}
function env(ctx, dest, when, a, peak, d) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + a);
  g.gain.exponentialRampToValueAtTime(0.0001, when + a + d);
  g.connect(dest);
  return g;
}
function burst(ctx, dest, when, { f = 2000, q = 1, type = 'bandpass', a = 0.002, d = 0.05, peak = 0.5, f2 = null, dur = null } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noise(ctx);
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, when); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, when + (dur || a + d));
  src.connect(fl); fl.connect(env(ctx, dest, when, a, peak, d));
  src.start(when); src.stop(when + a + d + 0.05);
}
function tone(ctx, dest, when, { f = 440, type = 'sine', a = 0.004, d = 0.3, peak = 0.3, f2 = null } = {}) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, when);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, when + a + d);
  o.connect(env(ctx, dest, when, a, peak, d));
  o.start(when); o.stop(when + a + d + 0.05);
}

export const SOUNDS = {
  tick: (c, o, w) => burst(c, o, w, { f: 3800, q: 6, d: 0.025, peak: 0.35 }),
  click: (c, o, w) => { burst(c, o, w, { f: 2400, q: 4, d: 0.03, peak: 0.4 }); tone(c, o, w, { f: 1200, d: 0.04, peak: 0.08, type: 'triangle' }); },
  pop: (c, o, w) => tone(c, o, w, { f: 520, f2: 880, d: 0.09, peak: 0.22, type: 'triangle' }),
  thunk: (c, o, w) => { tone(c, o, w, { f: 150, f2: 70, d: 0.18, peak: 0.45 }); burst(c, o, w, { f: 700, q: 1.2, d: 0.05, peak: 0.25 }); },
  whoosh: (c, o, w) => burst(c, o, w, { f: 400, f2: 2600, q: 0.9, a: 0.18, d: 0.32, peak: 0.28, dur: 0.45 }),
  paper: (c, o, w) => { burst(c, o, w, { f: 5000, q: 0.7, type: 'highpass', a: 0.04, d: 0.18, peak: 0.12 }); burst(c, o, w + 0.08, { f: 3000, q: 1, a: 0.02, d: 0.1, peak: 0.08 }); },
  stamp: (c, o, w) => { tone(c, o, w, { f: 110, f2: 55, d: 0.2, peak: 0.55 }); burst(c, o, w, { f: 1200, q: 0.8, d: 0.07, peak: 0.4 }); },
  ding: (c, o, w) => { tone(c, o, w, { f: 988, d: 0.9, peak: 0.16 }); tone(c, o, w, { f: 1976, d: 0.5, peak: 0.05 }); },
  buzz: (c, o, w) => { tone(c, o, w, { f: 110, d: 0.35, peak: 0.12, type: 'sawtooth' }); tone(c, o, w + 0.12, { f: 104, d: 0.3, peak: 0.1, type: 'sawtooth' }); },
  scan: (c, o, w) => { for (let i = 0; i < 6; i++) burst(c, o, w + i * 0.07, { f: 2600 + i * 300, q: 8, d: 0.02, peak: 0.18 }); },
  rewind: (c, o, w) => { tone(c, o, w, { f: 1400, f2: 180, a: 0.02, d: 1.1, peak: 0.1, type: 'triangle' }); burst(c, o, w, { f: 3000, f2: 300, q: 2, a: 0.05, d: 1.1, peak: 0.12, dur: 1.15 }); },
};

export function play(ctx, dest, type, when, gain = 1) {
  const fn = SOUNDS[type];
  if (!fn) return;
  const g = ctx.createGain(); g.gain.value = gain; g.connect(dest);
  fn(ctx, g, Math.max(when, ctx.currentTime || 0));
}
