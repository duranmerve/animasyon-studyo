// Sound world, all synthesized: a low "breathing" drone (the star), paper sliding between plates,
// detector ticks, the collapse rush, the bounce, the supernova swell that tears into paper.
// The same functions build the live graph (AudioContext) and the video soundtrack (OfflineAudioContext).

// events on the story timeline: [{ t, kind, p }]
export function sfxPlan(TL) {
  const ev = [];
  const S = Object.fromEntries(TL.sections.map(s => [s.id, s]));
  const cue = (id, k) => S[id].cue[k];
  TL.sections.forEach((s, i) => { if (i > 0 && !s.cont) ev.push({ t: s.start - 0.35, kind: 'rustle', p: i }); });
  ev.push({ t: cue('balance', 'cross'), kind: 'scratch' }, { t: cue('mass', 'twist'), kind: 'scratch' });
  ev.push({ t: cue('balance', 'aha') - 0.2, kind: 'chime', p: 0 });
  ev.push({ t: cue('open', 'burst') - 0.2, kind: 'swell', p: 0.35 });
  ev.push({ t: cue('mass', 'minute') - 0.1, kind: 'chime', p: 1 });
  ev.push({ t: cue('giant', 'mercury'), kind: 'low' }, { t: cue('giant', 'venus'), kind: 'low' });
  ev.push({ t: cue('dwarf', 'end'), kind: 'chime', p: 2 });
  ev.push({ t: cue('onion', 'iron'), kind: 'low' });
  ev.push({ t: cue('collapse', 'fall') - 0.15, kind: 'rush' });
  ev.push({ t: cue('collapse', 'bounce'), kind: 'thud' });
  ev.push({ t: cue('collapse', 'boom') - 2.2, kind: 'swell', p: 1 });
  for (const tk of neutrinoTicks(TL)) ev.push({ t: tk.t, kind: 'tick', p: tk.d });
  ev.push({ t: cue('remnant', 'gone'), kind: 'low' });
  ev.push({ t: cue('us', 'mass'), kind: 'chime', p: 3 });
  return ev.sort((a, b) => a.t - b.t);
}

// the 24 detector events of SN 1987A (Kamiokande-II 12, IMB 8, Baksan 5 → we draw 11 + 8 + 5),
// compressed onto the screen timeline; also used by the scene
export function neutrinoTicks(TL) {
  const s = TL.sections.find(x => x.id === 'sn1987');
  const t0 = s.cue.detect + 0.3, span = Math.max(3, s.cue.twenty - t0 + 0.6);
  const out = [];
  [[0, 11], [1, 8], [2, 5]].forEach(([d, n]) => {
    for (let i = 0; i < n; i++) {
      const h = Math.sin((d * 31 + i * 7.13) * 12.9898) * 43758.5453;
      const r = h - Math.floor(h);
      const f = Math.pow((i + r * 0.8) / n, 1.8);          // most arrive in the first seconds
      out.push({ t: t0 + f * span, d, i, sec: f * 12.4 });
    }
  });
  return out.sort((a, b) => a.t - b.t);
}

// drone level/brightness as a pure function of story time
export function droneAt(TL, t) {
  const S = Object.fromEntries(TL.sections.map(s => [s.id, s]));
  let g = 0.55, f = 1, b = 0.4;
  const iron = S.iron, col = S.collapse;
  // silence before the collapse: the drone drains away while the core loses its support
  if (t > iron.cue.hold && t < col.cue.fall) g *= Math.max(0, 1 - (t - iron.cue.hold) / 2.2);
  if (t >= col.cue.fall && t < col.cue.boom) { g = 0.25; f = 0.8; }
  if (t >= col.cue.boom && t < col.end) { g = 0.75; b = 0.8; f = 0.75; }
  if (t > S.giant.start && t < S.giant.end) { f = 0.82; b = 0.3; }
  if (t > S.dwarf.start && t < S.dwarf.end) { f = 1.25; b = 0.55; g = 0.42; }
  if (t > S.us.cue.final) g *= Math.max(0, 1 - (t - S.us.cue.final) / 4);
  if (t < 1.2) g *= t / 1.2;
  return { g, f, b };
}

// narration ducking: effects sit lower while the voice speaks
export function duckAt(TL, t) {
  for (const s of TL.sections) if (t > s.vs - 0.2 && t < s.ve + 0.3) return 0.5;
  return 1;
}

// ---- synthesis (works on AudioContext and OfflineAudioContext) ----------------------------
function noiseBuf(ac) {
  if (ac.__noise) return ac.__noise;
  const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
  return (ac.__noise = b);
}
function noise(ac, when, dur) { const n = ac.createBufferSource(); n.buffer = noiseBuf(ac); n.loop = true; n.start(when, Math.random() * 0 + (when * 0.37) % 1.5); n.stop(when + dur + 0.05); return n; }
function envGain(ac, when, pts) { const g = ac.createGain(); g.gain.setValueAtTime(0, when); for (const [dt, v] of pts) g.gain.linearRampToValueAtTime(v, when + dt); return g; }

export function playEvent(ac, dest, when, e) {
  const k = e.kind;
  if (k === 'rustle') {          // a paper sheet sliding over another
    const n = noise(ac, when, 0.9), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2200, when); bp.frequency.linearRampToValueAtTime(3800, when + 0.7); bp.Q.value = 0.7;
    const g = envGain(ac, when, [[0.08, 0.07], [0.25, 0.11], [0.45, 0.06], [0.6, 0.09], [0.85, 0]]);
    n.connect(bp).connect(g).connect(dest);
  } else if (k === 'scratch') {  // pencil strike-through
    const n = noise(ac, when, 0.45), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 2;
    const g = envGain(ac, when, [[0.03, 0.09], [0.18, 0.05], [0.24, 0.08], [0.4, 0]]);
    n.connect(bp).connect(g).connect(dest);
  } else if (k === 'chime') {    // soft glass tone for the quiet "aha" moments
    const base = [392, 349.2, 293.7, 392][e.p || 0];
    [1, 1.5, 2.01].forEach((m, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = base * m;
      const g = envGain(ac, when, [[0.12, 0.05 / (i + 1)], [2.8, 0]]);
      o.connect(g).connect(dest); o.start(when); o.stop(when + 3);
    });
  } else if (k === 'tick') {     // a detector registering one neutrino
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = [1760, 1480, 1245][e.p || 0];
    const g = envGain(ac, when, [[0.004, 0.16], [0.09, 0]]);
    o.connect(g).connect(dest); o.start(when); o.stop(when + 0.12);
    const n = noise(ac, when, 0.02), hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g2 = envGain(ac, when, [[0.002, 0.12], [0.015, 0]]);
    n.connect(hp).connect(g2).connect(dest);
  } else if (k === 'low') {      // something swallowed / gone
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(98, when); o.frequency.exponentialRampToValueAtTime(62, when + 2.2);
    const g = envGain(ac, when, [[0.4, 0.13], [2.4, 0]]);
    o.connect(g).connect(dest); o.start(when); o.stop(when + 2.5);
  } else if (k === 'rush') {     // infall: a rising, narrowing whoosh
    const n = noise(ac, when, 1.2), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
    bp.frequency.setValueAtTime(300, when); bp.frequency.exponentialRampToValueAtTime(5200, when + 1.0);
    const g = envGain(ac, when, [[0.7, 0.16], [1.05, 0.2], [1.12, 0]]);
    n.connect(bp).connect(g).connect(dest);
  } else if (k === 'thud') {     // the core bounce
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(130, when); o.frequency.exponentialRampToValueAtTime(38, when + 0.6);
    const g = envGain(ac, when, [[0.01, 0.55], [1.2, 0]]);
    o.connect(g).connect(dest); o.start(when); o.stop(when + 1.3);
  } else if (k === 'swell') {    // overexposure: noise rises, then tears like paper, then a long low tail
    const big = e.p >= 1, up = big ? 2.2 : 1.3, amp = big ? 0.32 : 0.12;
    const n = noise(ac, when, up + 0.1), lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(180, when); lp.frequency.exponentialRampToValueAtTime(7000, when + up);
    const g = envGain(ac, when, [[up * 0.9, amp * 0.7], [up, amp], [up + 0.06, 0]]);
    n.connect(lp).connect(g).connect(dest);
    if (big) {
      const tear = noise(ac, when + up, 1.4), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.5;
      const gt = envGain(ac, when + up, [[0.01, 0.22], [0.12, 0.08], [0.2, 0.17], [0.5, 0.05], [1.3, 0]]);
      tear.connect(bp).connect(gt).connect(dest);
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(48, when + up); o.frequency.exponentialRampToValueAtTime(30, when + up + 7);
      const go = envGain(ac, when + up, [[0.05, 0.4], [7.5, 0]]);
      o.connect(go).connect(dest); o.start(when + up); o.stop(when + up + 7.6);
    }
  }
}

// the continuous drone: two sines + breathing noise; returns setters
export function makeDrone(ac, dest) {
  const g = ac.createGain(); g.gain.value = 0;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.frequency.value = 55; o2.frequency.value = 82.6;
  const g1 = ac.createGain(); g1.gain.value = 0.11; const g2 = ac.createGain(); g2.gain.value = 0.05;
  o1.connect(g1).connect(lp); o2.connect(g2).connect(lp);
  const n = ac.createBufferSource(); n.buffer = noiseBuf(ac); n.loop = true;
  const nb = ac.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 320; nb.Q.value = 0.8;
  const ng = ac.createGain(); ng.gain.value = 0.05;
  n.connect(nb).connect(ng).connect(lp);
  lp.connect(g).connect(dest);
  o1.start(); o2.start(); n.start();
  return {
    g: g.gain, lp: lp.frequency, f1: o1.frequency, f2: o2.frequency, ng: ng.gain,
    stop(when) { o1.stop(when); o2.stop(when); n.stop(when); },
  };
}

// the full soundtrack for [from, to): narration buffers + effects, rendered offline → 16-bit stereo PCM
export async function renderSoundtrack(TL, from, to, voiceBuffers, rate = 44100) {
  const len = Math.max(1, Math.ceil((to - from) * rate));
  const ac = new OfflineAudioContext(2, len, rate);
  const master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  const fx = ac.createGain(); fx.connect(master);
  // ducking + drone automation sampled at 20 Hz
  const d = makeDrone(ac, fx);
  for (let t = from; t <= to + 0.05; t += 0.05) {
    const at = Math.max(0, t - from), p = droneAt(TL, t), k = duckAt(TL, t);
    d.g.linearRampToValueAtTime(p.g * 0.9, at); d.lp.linearRampToValueAtTime(220 + 900 * p.b, at);
    d.f1.linearRampToValueAtTime(55 * p.f, at); d.f2.linearRampToValueAtTime(82.6 * p.f, at);
    d.ng.linearRampToValueAtTime(0.03 + 0.04 * (0.5 + 0.5 * Math.sin(t * 0.55)), at);
    fx.gain.linearRampToValueAtTime(k, at);
  }
  for (const e of sfxPlan(TL)) if (e.t >= from - 8 && e.t < to) { const at = e.t - from; if (at >= 0) playEvent(ac, fx, at, e); }
  for (const s of TL.sections) {
    const buf = voiceBuffers[s.id];
    if (!buf || s.ve < from || s.vs > to) continue;
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain(); g.gain.value = 1.0;
    src.connect(g).connect(master);
    if (s.vs >= from) src.start(s.vs - from); else src.start(0, from - s.vs);
  }
  const out = await ac.startRendering();
  const L = out.getChannelData(0), R = out.getChannelData(1);
  const pcm = new Int16Array(len * 2);
  for (let i = 0; i < len; i++) { pcm[i * 2] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[i * 2 + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  return { pcm, rate };
}

export function wavHeader(frames, rate) {
  const b = new ArrayBuffer(44), v = new DataView(b), bytes = frames * 4;
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, bytes, true);
  return new Uint8Array(b);
}
