// Story timeline: chapter lengths come from the recordings, scene cues and subtitle words
// are tied to the narrator's words (Whisper word timings in the manifest).
import { CHAPTERS, parse } from './story.js';

export const LEAD = 0.6, BREATH = 0.9;
const END_HOLD = { summary: 3.2 };

// Said-text position → seconds into the clip. Piecewise linear over the cumulative character
// ratio of Whisper's words, so it works even when the written and spoken words differ a little.
function positionMap(saidLen, words, clip) {
  if (!words || !words.length) return pos => clip * Math.min(1, pos / Math.max(1, saidLen));
  const toks = words.map(w => String(w[2]).trim());
  const total = toks.reduce((n, s) => n + s.length, 0) + toks.length - 1;
  const pts = [];
  let cum = 0;
  toks.forEach((s, i) => { pts.push([cum / total, words[i][0]]); cum += s.length + 1; });
  pts.push([1, words[words.length - 1][1]]);
  return pos => {
    const r = Math.min(1, Math.max(0, pos / Math.max(1, saidLen)));
    let i = 0;
    while (i < pts.length - 2 && pts[i + 1][0] <= r) i++;
    const [r0, t0] = pts[i], [r1, t1] = pts[i + 1];
    return r1 > r0 ? t0 + (t1 - t0) * (r - r0) / (r1 - r0) : t0;
  };
}

// Subtitle chunks: ≤ ~90 characters, at most two lines of ~44. Break at sentence ends first,
// then commas, then conjunctions, then the middle.
const CONJ = new Set(['ve', 'ama', 'çünkü', 'ise', 'yani', 'ya', 'sonra', 'oysa']);
function chunkWords(words) {
  const len = (a, b) => words.slice(a, b).reduce((n, w) => n + w.w.length + 1, -1);
  const out = [];
  const split = (a, b) => {
    if (len(a, b) <= 90) { out.push([a, b]); return; }
    let best = -1, bestScore = -1;
    for (let i = a + 1; i < b; i++) {
      const prev = words[i - 1].w, l = len(a, i), r = len(i, b);
      if (l < 18 || r < 12) continue;
      const kind = /[.!?:;]$/.test(prev) ? 3 : /,$/.test(prev) ? 2 : CONJ.has(words[i].w.toLowerCase()) ? 1 : 0;
      const score = kind * 1000 - Math.abs(l - r) - (l > 90 ? 500 : 0);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) best = a + Math.ceil((b - a) / 2);
    split(a, best); split(best, b);
  };
  // sentences first, then merge short neighbours (≤ 90 together)
  const sent = [];
  let s = 0;
  words.forEach((w, i) => { if (/[.!?]["”]?$/.test(w.w) || i === words.length - 1) { sent.push([s, i + 1]); s = i + 1; } });
  const merged = [];
  for (const r of sent) {
    const last = merged[merged.length - 1];
    if (last && len(last[0], r[1]) <= 70 && len(last[0], last[1]) < 40) last[1] = r[1];
    else merged.push([...r]);
  }
  for (const [a, b] of merged) split(a, b);
  return out.map(([a, b]) => {
    // two balanced lines
    let br = b, bestMax = len(a, b);
    if (len(a, b) > 40) for (let i = a + 1; i < b; i++) { const m = Math.max(len(a, i), len(i, b)); if (m < bestMax) { bestMax = m; br = i; } }
    return { a, b, br };
  });
}

export function buildTimeline(manifest) {
  let start = 0;
  const chapters = CHAPTERS.map((c, i) => {
    const p = parse(c.text);
    const m = manifest && manifest.lines && manifest.lines[c.id];
    const clip = m && m.dur ? m.dur : 1.3 + p.said.length / 14.5;
    const map = positionMap(p.said.length, m && m.words, clip);
    const ch = { id: c.id, title: c.title, i, n: i + 1, start, clip, file: m ? m.file : null, words: p.words };
    ch.dur = LEAD + clip + BREATH + (END_HOLD[c.id] || 0);
    ch.end = start + ch.dur;
    ch.clipStart = start + LEAD;
    ch.at = pos => ch.clipStart + map(pos);
    ch.cues = {};
    for (const [k, pos] of Object.entries(p.cues)) ch.cues[k] = ch.at(pos);
    ch.wordT = p.words.map(w => ch.at(w.s0));
    ch.chunks = chunkWords(p.words).map(k => ({ ...k, t0: ch.wordT[k.a] }));
    ch.chunks.forEach((k, j, arr) => { k.t1 = j < arr.length - 1 ? arr[j + 1].t0 : ch.clipStart + clip + 0.8; });
    start += ch.dur;
    return ch;
  });
  const byId = Object.fromEntries(chapters.map(c => [c.id, c]));
  const missing = new Set();
  const cue = (id, name) => {
    const c = byId[id];
    const v = c && c.cues[name];
    if (v === undefined) { if (!missing.has(id + '.' + name)) { missing.add(id + '.' + name); console.warn('cue missing', id, name); } return c ? c.start : 0; }
    return v;
  };
  const at = t => { let i = 0; while (i < chapters.length - 1 && t >= chapters[i + 1].start) i++; return chapters[i]; };
  return { chapters, byId, cue, at, duration: start };
}

const pad2 = n => String(n).padStart(2, '0');
const srtTime = s => { const ms = Math.round(s * 1000); return `${pad2(Math.floor(ms / 3600000))}:${pad2(Math.floor(ms / 60000) % 60)}:${pad2(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`; };
export function toSrt(tl, from = 0, to = tl.duration) {
  let n = 0, s = '';
  for (const ch of tl.chapters) for (const k of ch.chunks) {
    if (k.t1 < from || k.t0 > to) continue;
    const txt = ch.words.slice(k.a, k.br).map(w => w.w).join(' ') + (k.br < k.b ? '\n' + ch.words.slice(k.br, k.b).map(w => w.w).join(' ') : '');
    s += `${++n}\n${srtTime(Math.max(0, k.t0 - 0.1 - from))} --> ${srtTime(Math.min(to, k.t1 - 0.05) - from)}\n${txt}\n\n`;
  }
  return s;
}
export function toChapters(tl) {
  return tl.chapters.map(c => { const t = Math.floor(c.start); return `${Math.floor(t / 60)}:${pad2(t % 60)} ${c.title}`; }).join('\n');
}
