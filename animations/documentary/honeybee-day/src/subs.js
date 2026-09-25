// Subtitles: at most two lines, shown in chunks that advance with the voice. Every word is laid
// out from the start (invisible), then fades in as the narrator says it, so lines never reflow.

const MAX_CHUNK = 90, MAX_LINE = 44;

function splitLong(s) {
  if (s.length <= MAX_CHUNK) return [s];
  // prefer: ; : , then conjunctions
  const tryAt = re => {
    const cands = [];
    let m; re.lastIndex = 0;
    while ((m = re.exec(s))) cands.push(m.index + m[0].length);
    const mid = s.length / 2;
    const ok = cands.filter(i => i > 20 && s.length - i > 20);
    if (!ok.length) return null;
    ok.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    return ok[0];
  };
  const cut = tryAt(/[;:]\s/g) ?? tryAt(/,\s/g) ?? tryAt(/\s(?=(ve|ama|çünkü|ise|yani|ya da|bu yüzden)\s)/g) ?? tryAt(/\s/g);
  return [...splitLong(s.slice(0, cut).trim()), ...splitLong(s.slice(cut).trim())];
}

function toLines(words) {
  const text = words.map(w => w.w).join(' ');
  if (text.length <= MAX_LINE) return [words];
  // balanced split into two lines
  let best = 1, bestD = 1e9, acc = 0;
  for (let i = 0; i < words.length - 1; i++) {
    acc += words[i].w.length + 1;
    const d = Math.abs(acc - (text.length - acc));
    if (d < bestD) { bestD = d; best = i + 1; }
  }
  return [words.slice(0, best), words.slice(best)];
}

export function buildSubs(chapters) {
  for (const ch of chapters) {
    const sentences = ch.text.match(/[^.!?]+[.!?]+/g) || [ch.text];
    const chunks = [];
    let pos = 0;
    for (const sen of sentences) for (const part of splitLong(sen.trim())) {
      const start = ch.text.indexOf(part, pos);
      pos = start + part.length;
      const words = [];
      const re = /\S+/g; let m;
      while ((m = re.exec(part))) words.push({ w: m[0], t: ch.atText(start + m.index) });
      chunks.push({ words, lines: toLines(words), t0: words[0].t, t1: words[words.length - 1].t });
    }
    chunks.forEach((c, i) => { c.end = i + 1 < chunks.length ? chunks[i + 1].t0 - 0.05 : Math.min(ch.dur, c.t1 + 1.6); });
    ch.subs = chunks;
  }
}

export class SubtitleView {
  constructor(el) { this.el = el; this.cur = null; this.spans = []; }
  render(ch, u, on) {
    if (!on || !ch.subs) { if (this.cur) { this.el.innerHTML = ''; this.cur = null; } this.el.style.display = on ? '' : 'none'; return; }
    this.el.style.display = '';
    const chunk = ch.subs.find(c => u >= c.t0 - 0.12 && u < c.end) || null;
    if (chunk !== this.cur) {
      this.cur = chunk;
      this.el.innerHTML = '';
      this.spans = [];
      if (chunk) for (const line of chunk.lines) {
        const d = document.createElement('div'); d.className = 'sub-line';
        line.forEach((w, i) => {
          const s = document.createElement('span'); s.className = 'w'; s.textContent = w.w;
          d.appendChild(s); if (i < line.length - 1) d.appendChild(document.createTextNode(' '));
          this.spans.push([s, w.t, -1]);
        });
        this.el.appendChild(d);
      }
    }
    for (const it of this.spans) {
      const k = Math.max(0, Math.min(1, (u - it[1] + 0.06) / 0.22));
      const q = Math.round(k * 20) / 20;
      if (q !== it[2]) {
        it[2] = q;
        it[0].style.opacity = q;
        it[0].style.transform = `translateY(${(1 - q) * 5}px)`;
        it[0].style.filter = q < 1 ? `blur(${(1 - q) * 3}px)` : '';
      }
    }
  }
}
