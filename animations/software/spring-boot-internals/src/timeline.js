// Story timeline: section lengths come from the recordings; markers and subtitle words are tied to
// the moment they are spoken, using Whisper's word timings in the manifest.
import { SECTIONS, parseSection } from './narration.js';

export const LEAD = 0.6, TAIL = 0.9;
const letters = s => (s.toLowerCase().match(/[a-zçğıöşüâîû0-9]/g) || []).length;

// written-text position (fraction of the spoken letters) → seconds into the clip
function timeMap(say, clip) {
  const total = letters(say) || 1;
  const words = clip && clip.words && clip.words.length ? clip.words : null;
  if (!words) {
    const dur = clip ? clip.dur : 1.3 + say.length / 14.5;
    return { at: pos => letters(say.slice(0, pos)) / total * dur, dur };
  }
  const wl = words.map(w => letters(w[2]));
  const sum = wl.reduce((a, b) => a + b, 0) || 1;
  const xs = [], ts = [];
  let acc = 0;
  words.forEach((w, i) => { xs.push(acc / sum); ts.push(w[0]); acc += wl[i]; });
  xs.push(1); ts.push(words[words.length - 1][1]);
  const at = pos => {
    const f = letters(say.slice(0, pos)) / total;
    let i = 1;
    while (i < xs.length - 1 && xs[i] < f) i++;
    const x0 = xs[i - 1], x1 = xs[i];
    return ts[i - 1] + (x1 > x0 ? (f - x0) / (x1 - x0) : 0) * (ts[i] - ts[i - 1]);
  };
  return { at, dur: clip.dur };
}

// splits a sentence into ≤ 2-line chunks: sentence ends, then commas, then conjunctions, then words
const MAXC = 88, LINE = 44;
function chunkWords(words) {
  const out = [];
  let cur = [];
  const len = ws => ws.reduce((a, w) => a + w.w.length + 1, -1);
  for (let i = 0; i < words.length; i++) {
    cur.push(words[i]);
    const rest = words.slice(i + 1);
    if (!rest.length) break;
    const L = len(cur);
    const w = words[i].w;
    const hardEnd = /[.?!:;]$/.test(w) && L > 26;
    const comma = /,$/.test(w) && L > 40;
    const conj = /^(ve|ama|ya|çünkü|sonra|yani)$/i.test(rest[0].w) && L > 50;
    if ((hardEnd || comma || conj) && len(rest) > 12 || L + 1 + rest[0].w.length > MAXC) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out.map(ws => {
    // two balanced lines
    const total = len(ws);
    if (total <= LINE) return [ws];
    let best = 1, bestD = 1e9, acc = 0;
    for (let i = 0; i < ws.length - 1; i++) { acc += ws[i].w.length + 1; const d = Math.abs(acc - total / 2); if (d < bestD) { bestD = d; best = i + 1; } }
    return [ws.slice(0, best), ws.slice(best)];
  });
}

export function buildTimeline(manifest) {
  let t = 0;
  const secs = SECTIONS.map((sec, index) => {
    const p = parseSection(sec);
    const clip = manifest && manifest.lines ? manifest.lines[sec.id] : null;
    const map = timeMap(p.say, clip);
    const dur = LEAD + map.dur + TAIL;
    const marks = {};
    for (const [k, pos] of Object.entries(p.marks)) marks[k] = LEAD + map.at(pos);
    // subtitle chunks with a time per written word
    const chunks = [];
    for (const s of p.sentences) {
      const ws = [];
      const re = /\S+/g; let m;
      while ((m = re.exec(s.tx))) {
        const pos = s.from + Math.round(m.index / Math.max(1, s.tx.length) * (s.to - s.from));
        ws.push({ w: m[0], t: LEAD + map.at(pos) });
      }
      for (const lines of chunkWords(ws)) chunks.push({ lines, t0: lines[0][0].t });
    }
    chunks.forEach(c => { c.t0 = Math.max(0, c.t0 - 0.12); });
    chunks.forEach((c, i) => { c.t1 = i + 1 < chunks.length ? chunks[i + 1].t0 : dur - 0.35; });
    const s = { ...sec, index, start: t, dur, clip, marks, chunks, say: p.say };
    t += dur;
    return s;
  });
  return { secs, duration: t };
}

export function sectionAt(tl, t) {
  const { secs } = tl;
  for (let i = secs.length - 1; i >= 0; i--) if (t >= secs[i].start) return secs[i];
  return secs[0];
}
