// Absolute timing of chapters and subtitles, plus easing helpers.
// Each chapter is narrated as one continuous recording (narration/manifest.json, made with
// `npm run voice -- laser-printer` at the repository root). Its Whisper word timings decide when
// every sentence starts and when every written word appears; a chapter lasts as long as its
// recording plus a breath. Long subtitles are split into two-line segments that follow the voice.
import { CHAPTERS } from './script.js';
import { spoken } from './spoken.js';
import manifest from '../../narration/manifest.json';

export const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const smoother = t => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const seg = (u, a, b) => clamp01((u - a) / (b - a));

const MAX_SEG = 92;     // characters per subtitle segment (two lines of ~46)

// split a subtitle into readable pieces at sentence, then clause boundaries
export function splitSubtitle(text) {
  if (text.includes('|')) return text.split('|').map(p => p.trim()).flatMap(splitSubtitle);
  if (text.length <= MAX_SEG) return [text];
  const sentences = text.match(/[^.!?;:]+[.!?;:]+(\s|$)|[^.!?;:]+$/g).map(s => s.trim());
  const out = [];
  let cur = '';
  for (const s of sentences) {
    if (!cur) cur = s;
    else if ((cur + ' ' + s).length <= MAX_SEG) cur += ' ' + s;
    else { out.push(cur); cur = s; }
  }
  if (cur) out.push(cur);
  // a single overlong sentence: break at the comma nearest the middle
  return out.flatMap(p => {
    if (p.length <= MAX_SEG) return [p];
    const mid = p.length / 2;
    let best = -1;
    for (let i = p.indexOf(','); i >= 0; i = p.indexOf(',', i + 1)) if (best < 0 || Math.abs(i - mid) < Math.abs(best - mid)) best = i;
    if (best >= 0 && Math.abs(best - mid) < p.length * 0.2) return [p.slice(0, best + 1), p.slice(best + 2)];
    // no comma near the middle: prefer a "ve"/"ya da" joint, else the space nearest the middle
    let sp = -1;
    for (let i = p.indexOf(' '); i >= 0; i = p.indexOf(' ', i + 1)) {
      const joint = /^(ve|ya|ama|sonra|böylece) /.test(p.slice(i + 1)) ? 0.6 : 1;
      if (sp < 0 || Math.abs(i - mid) * joint < Math.abs(sp - mid) * (/^(ve|ya|ama|sonra|böylece) /.test(p.slice(sp + 1)) ? 0.6 : 1)) sp = i;
    }
    return [p.slice(0, sp), p.slice(sp + 1)];
  });
}

// time (in the clip) at which a given fraction of the sentence's characters has started to be spoken
function speechClock(words, dur) {
  if (!words || !words.length) return f => f * dur;
  const total = words.reduce((a, w) => a + w[2].length + 1, 0);
  const pts = [];
  let acc = 0;
  for (const w of words) { pts.push([acc / total, w[0]]); acc += w[2].length + 1; }
  pts.push([1, words[words.length - 1][1]]);
  return f => {
    if (f <= 0) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) {
      const [f0, t0] = pts[i - 1], [f1, t1] = pts[i];
      return t0 + (t1 - t0) * (f - f0) / Math.max(1e-6, f1 - f0);
    }
    return pts[pts.length - 1][1];
  };
}

export function buildTimeline() {
  let T = 0;
  const chapters = CHAPTERS.map((c, i) => {
    const start = T;
    const lead = c.lead ?? 0.6;
    // One recording per chapter, read as a whole paragraph (natural flow between sentences).
    // Where each sentence and each written word falls is found from the recording's word timings.
    const v = manifest.lines[c.id];
    const says = c.cues.map(raw => spoken(raw));
    const sayAll = says.join(' ');
    const offs = []; { let o = 0; for (const x of says) { offs.push(o); o += x.length + 1; } }
    let cues, dur, voice = null;
    if (v) {
      voice = { url: `./${v.file}`, dur: v.dur, start: start + lead };
      const at = speechClock(v.words, v.dur);
      const tAt = f => voice.start + at(Math.min(1, Math.max(0, f)));
      cues = c.cues.map((raw, n) => {
        const text = raw.replace(/\s*\|\s*/g, ' ');
        const f0 = offs[n] / sayAll.length, f1 = (offs[n] + says[n].length) / sayAll.length;
        return { text, say: says[n], start: n === 0 ? voice.start : tAt(f0) - 0.08, f0, f1, raw };
      });
      cues.forEach((q, n) => { q.end = n < cues.length - 1 ? cues[n + 1].start : voice.start + v.dur + 0.35; });
      cues.forEach(q => {
        // a written word takes the time of its place inside its sentence's stretch of the recording
        const parts = splitSubtitle(q.raw), all = parts.join(' ');
        let pos = 0;
        q.segs = parts.map(p => {
          const words = p.split(/\s+/).filter(Boolean).map(w => {
            const i = all.indexOf(w, pos); pos = i + w.length;
            return { w, t: tAt(q.f0 + (q.f1 - q.f0) * (i / all.length)) };
          });
          return { text: p, words, start: words[0].t, end: 0 };
        });
        q.segs[0].start = q.start;
        q.segs.forEach((g, k) => { g.end = k < q.segs.length - 1 ? q.segs[k + 1].start : q.end; });
      });
      dur = lead + v.dur + 0.9;
    } else {
      // no recording: pace by reading time
      let t = lead;
      cues = c.cues.map((raw, n) => {
        const text = raw.replace(/\s*\|\s*/g, ' ');
        const d = 1.3 + text.length / 14.5;
        const q = { text, say: says[n], start: start + t, end: start + t + d };
        const parts = splitSubtitle(raw), all = parts.join(' ');
        let pos = 0;
        q.segs = parts.map(p => {
          const words = p.split(/\s+/).filter(Boolean).map(w => { const i = all.indexOf(w, pos); pos = i + w.length; return { w, t: q.start + (d - 0.4) * i / all.length }; });
          return { text: p, words, start: words[0].t, end: 0 };
        });
        q.segs[0].start = q.start;
        q.segs.forEach((g, k) => { g.end = k < q.segs.length - 1 ? q.segs[k + 1].start : q.end; });
        t += d + 0.12;
        return q;
      });
      dur = t + 0.5;
    }
    T += dur;
    return { ...c, index: i, start, dur, end: start + dur, cues, voice };
  });
  const byId = Object.fromEntries(chapters.map(c => [c.id, c]));
  const allSegs = chapters.flatMap(c => c.cues.flatMap(q => q.segs));
  return {
    chapters, byId, total: T, segments: allSegs,
    chapterAt(t) { for (const c of chapters) if (t < c.end) return c; return chapters[chapters.length - 1]; },
    // chapter progress 0..1 (0 before it starts, 1 after it ends)
    ph(id, t) { const c = byId[id]; return clamp01((t - c.start) / c.dur); },
    cueAt(t) {
      const c = this.chapterAt(t);
      for (const q of c.cues) if (t >= q.start - 0.05 && t < q.end + 0.2) return q;
      return null;
    },
    // the chapter recording that should be sounding at time t
    voiceAt(t) { const c = this.chapterAt(t); return c.voice && t >= c.voice.start && t < c.voice.start + c.voice.dur ? c : null; },
    segAt(t) {
      const q = this.cueAt(t);
      if (!q) return null;
      for (const s of q.segs) if (t < s.end) return s;
      return q.segs[q.segs.length - 1];
    },
    // fraction of a chapter at which its n-th cue starts (for syncing actions to sentences)
    cueU(id, n) { const c = byId[id]; return (c.cues[n].start - c.start) / c.dur; },
  };
}

// break a segment into at most two balanced lines (as on television and in .srt files)
export function twoLines(text) {
  if (text.length <= 44) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = text.indexOf(' '); i >= 0; i = text.indexOf(' ', i + 1)) if (best < 0 || Math.abs(i - mid) < Math.abs(best - mid)) best = i;
  return best < 0 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}
