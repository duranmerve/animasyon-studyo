// Chapter timing comes from the recordings: lead-in + clip + breath. Scene events are tied to
// words: a phrase's position in the written text maps (through the spoken words' cumulative
// character ratio) to the moment the narrator says it.
import { CHAPTERS } from './script.js';

const manifests = import.meta.glob('../narration/manifest.json', { eager: true, import: 'default' });
const MANIFEST = Object.values(manifests)[0] || { lines: {} };

export const LEAD = 0.6, BREATH = 0.9;

const letters = s => s.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]/g, '');

// piecewise-linear map from ratio of spoken characters → seconds in the clip
function ratioMap(words, dur) {
  if (!words || !words.length) return r => r * dur;
  const lens = words.map(w => Math.max(1, letters(w[2]).length));
  const total = lens.reduce((a, b) => a + b, 0);
  const pts = [];
  let acc = 0;
  words.forEach((w, i) => { pts.push([acc / total, w[0]]); acc += lens[i]; });
  pts.push([1, words[words.length - 1][1]]);
  return r => {
    if (r <= 0) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (r <= pts[i][0]) {
      const [r0, t0] = pts[i - 1], [r1, t1] = pts[i];
      return t0 + (t1 - t0) * (r - r0) / Math.max(1e-6, r1 - r0);
    }
    return pts[pts.length - 1][1];
  };
}

// ratio (0..1) of a character index in a string, counting letters only
function charRatio(str, idx) {
  const total = letters(str).length || 1;
  return letters(str.slice(0, idx)).length / total;
}

export function buildTimeline() {
  let t = 0;
  const chapters = CHAPTERS.map((c, i) => {
    const clip = MANIFEST.lines[c.id];
    const say = c.say || c.text;
    const clipDur = clip ? clip.dur : 1.3 + say.length / 14.5;
    const head = LEAD + (c.pre || 0);   // picture without narration before the voice
    const dur = head + clipDur + BREATH + (c.post || 0);
    const map = ratioMap(clip && clip.words, clipDur);
    // time (local to chapter) at which the narrator reaches written-text index idx
    const atText = idx => head + map(charRatio(c.text, idx));
    const cues = {};
    for (const [k, phrase] of Object.entries(c.cues || {})) {
      let j = c.text.indexOf(phrase);
      if (j < 0) { console.warn('cue not found', c.id, phrase); j = 0; }
      cues[k] = atText(j);
    }
    const ch = { ...c, index: i, start: t, dur, head, clipDur, clip, atText, cues, voiceEnd: head + clipDur };
    t += dur;
    return ch;
  });
  const total = t;
  const at = time => {
    time = Math.max(0, Math.min(total - 1e-4, time));
    let k = chapters.length - 1;
    for (let i = 0; i < chapters.length; i++) if (time < chapters[i].start + chapters[i].dur) { k = i; break; }
    return { ch: chapters[k], u: time - chapters[k].start };
  };
  return { chapters, total, at, manifest: MANIFEST };
}
