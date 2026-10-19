// Math, easing, seeded randomness and the story timeline (sections, voice windows, cue times).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = k => k * k * (3 - 2 * k);
export const ease = {
  inOut: k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  expoOut: k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k),
  quadIn: k => k * k,
  back: k => { const s = 1.8; k -= 1; return 1 + k * k * ((s + 1) * k + s); },
  sine: k => 0.5 - 0.5 * Math.cos(Math.PI * k),
};
// 0→1 from t0 over d seconds
export const ramp = (t, t0, d, e = ease.inOut) => e(clamp((t - t0) / Math.max(1e-6, d)));
// envelope: in a→b, hold, out c→d
export const env = (t, a, b, c, d, e = ease.inOut) => Math.min(ramp(t, a, b - a, e), 1 - ramp(t, c, d - c, e));
// log-space interpolation for zooms
export const lerpLog = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));

export function hash(n) { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// smooth 1D value noise
export function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; const a = hash(i * 7919 + seed * 104729), b = hash((i + 1) * 7919 + seed * 104729); return lerp(a, b, smooth(f)); }

// ---------------------------------------------------------------------------
// Timeline. Section = lead-in (0.6 s + pre) + recording + breath (0.9 s + post).
export const LEAD = 0.6, BREATH = 0.9, CUE_LEAD = 0.35;

export function buildTimeline(sections, manifest) {
  let t = 0;
  const out = sections.map((s, i) => {
    const m = manifest.lines[s.id];
    const dur = m ? m.dur : 1.3 + s.text.length / 14.5;
    const start = t, vs = start + LEAD + (s.pre || 0), ve = vs + dur, end = ve + BREATH + (s.post || 0);
    t = end;
    const sec = { ...s, index: i, start, vs, ve, end, dur, file: m ? `${m.file}?v=${m.hash}` : null, words: (m && m.words) || [] };
    sec.charTime = makeCharTime(sec);
    sec.cue = {};
    for (const [k, p] of Object.entries(s.cues || {})) {
      const idx = s.text.indexOf(p);
      sec.cue[k] = sec.charTime(idx / s.text.length);
    }
    return sec;
  });
  return { sections: out, duration: t };
}

// fraction of the written text → absolute time, through the spoken words' cumulative characters
function makeCharTime(sec) {
  const w = sec.words;
  if (!w.length) return f => sec.vs + f * sec.dur;
  const cum = [];
  let c = 0;
  for (const [, , word] of w) { cum.push(c); c += word.length + 1; }
  return f => {
    const p = clamp(f) * c;
    let i = 0;
    while (i < w.length - 1 && cum[i + 1] <= p) i++;
    const k = clamp((p - cum[i]) / (w[i][2].length + 1));
    return sec.vs + lerp(w[i][0], w[i][1], k);
  };
}

export function sectionAt(tl, t) {
  const s = tl.sections;
  for (let i = 0; i < s.length; i++) if (t < s[i].end) return i;
  return s.length - 1;
}
