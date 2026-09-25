// Narration markup shared by the page and tools/lines.mjs.
//   {shown|spoken}  text on screen vs. text the narrator reads ("{1453|bin dört yüz elli üç}")
//   @cue            a zero-width marker; scene events are tied to the moment it is spoken
// compile() returns both texts, the cue offsets in the spoken text and anchor pairs that map
// any position of the shown text to the matching position of the spoken text.

export function compile(src) {
  let shown = '', said = '';
  const cues = {}, anchors = [[0, 0]];
  const re = /\{([^|}]*)\|([^}]*)\}|@([a-z0-9]+)\s?/g;
  let last = 0, m;
  const plain = s => { shown += s; said += s; };
  while ((m = re.exec(src))) {
    plain(src.slice(last, m.index));
    anchors.push([shown.length, said.length]);
    if (m[3]) cues[m[3]] = said.length;
    else { shown += m[1]; said += m[2]; anchors.push([shown.length, said.length]); }
    last = re.lastIndex;
  }
  plain(src.slice(last));
  anchors.push([shown.length, said.length]);
  return { shown, said, cues, anchors };
}


// position in the shown text → position in the spoken text (piecewise linear between anchors)
export function shownToSaid(anchors, p) {
  for (let i = 1; i < anchors.length; i++) {
    const [a0, b0] = anchors[i - 1], [a1, b1] = anchors[i];
    if (p <= a1) return a1 === a0 ? b0 : b0 + (b1 - b0) * (p - a0) / (a1 - a0);
  }
  return anchors[anchors.length - 1][1];
}

// Clock of one recording: position in the spoken text (0..1) → seconds into the clip.
// Built from Whisper's word times; the cumulative character share of the heard words is
// matched to the share of the written text, so spelled-out numbers still line up.
export function makeClock(saidText, words, dur) {
  const letters = s => s.replace(/[^\p{L}\p{N}]/gu, '').length;
  if (!words || !words.length) {
    const total = letters(saidText) || 1;
    return frac => Math.max(0, Math.min(1, frac)) * dur * 0.97;
  }
  const lens = words.map(w => Math.max(1, letters(w[2])));
  const total = lens.reduce((a, b) => a + b, 0);
  const pts = [];
  let acc = 0;
  words.forEach((w, i) => { pts.push([acc / total, w[0]]); acc += lens[i]; pts.push([acc / total, w[1]]); });
  return frac => {
    const f = Math.max(0, Math.min(1, frac));
    for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return x1 === x0 ? y0 : y0 + (y1 - y0) * (f - x0) / (x1 - x0);
    }
    return pts[pts.length - 1][1];
  };
}

// share of letters before a character offset (letters only, so spaces and punctuation don't count)
export function letterShare(text, offset) {
  const count = s => s.replace(/[^\p{L}\p{N}]/gu, '').length;
  return count(text.slice(0, offset)) / Math.max(1, count(text));
}
