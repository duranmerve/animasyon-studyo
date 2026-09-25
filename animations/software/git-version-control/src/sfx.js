// Small synthesized sound effects (Web Audio): nothing is loaded from files.
// synth() works on any context, so the same effects go into the live page and the offline film soundtrack.
export function synth(ac, out, type, t, gain = 1) {
  const noise = dur => {
    const b = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate), d = b.getChannelData(0);
    let x = 12345;
    for (let i = 0; i < d.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = x / 0x3fffffff - 1; }
    const s = ac.createBufferSource(); s.buffer = b; return s;
  };
  const env = (node, t0, a, peak, d) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * gain), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g); g.connect(out); return g;
  };
  const tone = (f, t0, a, peak, d, kind = 'sine', f2) => {
    const o = ac.createOscillator(); o.type = kind; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + a + d);
    env(o, t0, a, peak, d); o.start(t0); o.stop(t0 + a + d + 0.05);
  };
  const band = (src, t0, f, q, a, peak, d, f2) => {
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t0); bp.Q.value = q;
    if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t0 + a + d);
    src.connect(bp); env(bp, t0, a, peak, d); src.start(t0); src.stop(t0 + a + d + 0.05);
  };
  const play = {
    tick() { tone(1800, t, 0.002, 0.12, 0.04, 'square'); },
    pop() { tone(520, t, 0.005, 0.35, 0.12, 'sine', 900); },
    chime() { [660, 990, 1320].forEach((f, i) => tone(f, t + i * 0.07, 0.01, 0.18, 0.7)); },
    whoosh() { band(noise(0.7), t, 400, 1.2, 0.18, 0.35, 0.45, 2400); },
    shutter() { band(noise(0.08), t, 3000, 0.8, 0.002, 0.6, 0.05); band(noise(0.1), t + 0.09, 2200, 0.8, 0.002, 0.45, 0.07); },
    roll() { for (let i = 0; i < 14; i++) tone(1200 + (i % 3) * 300, t + i * 0.1, 0.002, 0.06, 0.03, 'square'); },
    alert() { tone(330, t, 0.01, 0.22, 0.18, 'triangle'); tone(247, t + 0.2, 0.01, 0.22, 0.26, 'triangle'); },
    stamp() { tone(90, t, 0.003, 0.6, 0.18, 'sine', 50); band(noise(0.1), t, 800, 1, 0.002, 0.3, 0.08); },
    rail() { for (let i = 0; i < 4; i++) band(noise(0.06), t + i * 0.12, 1500, 3, 0.002, 0.15, 0.04); },
  };
  if (play[type]) play[type]();
}

export function createSfx() {
  let ac = null, master = null, duck = 1;
  const ensure = () => {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    return ac;
  };
  return {
    unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    setDuck(on) { duck = on ? 0.4 : 1; },
    fire(type, delay = 0) { if (!ac || ac.state !== 'running') return; synth(ac, master, type, ac.currentTime + 0.01 + delay, duck); },
  };
}
