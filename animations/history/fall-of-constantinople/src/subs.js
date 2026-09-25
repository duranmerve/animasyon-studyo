// Subtitles: at most two lines, split into chunks that move with the voice; words appear as they are spoken.
// All words of a chunk are laid out from the start (invisible), so lines never re-flow while revealing.

const CONJ = new Set(['ve', 'ama', 'ya', 'ise', 'de', 'da', 'yani', 'çünkü', 'fakat', 'sonra']);

export class Subtitles {
  constructor(root, chapters) {
    this.root = root; this.inner = root.querySelector('.subs-inner'); this.chapters = chapters;
    this.maxChars = 88; this.key = ''; this.spans = [];
  }
  // chunk size from the screen width: two lines of what fits
  layout(W) {
    const px = parseFloat(getComputedStyle(this.inner).fontSize) || 20;
    const lineChars = Math.floor(Math.min(W * 0.92, px * 23) / (px * 0.47));
    this.maxChars = Math.max(46, Math.min(90, lineChars * 2 - 4));
    this.inner.style.maxWidth = Math.min(W * 0.94, px * 24) + 'px';
    for (const ch of this.chapters) ch.chunks = chunk(ch.words, this.maxChars, ch.dur);
    this.key = '';
  }
  render(i, lt, on) {
    const ch = this.chapters[i];
    const c = ch.chunks.find(c => lt >= c.from && lt < c.to);
    this.root.classList.toggle('empty', !c || !on);
    if (!c) return;
    const key = i + ':' + c.from;
    if (key !== this.key) {
      this.key = key;
      this.inner.textContent = '';
      const p = document.createElement('div');
      this.spans = c.words.map((w, k) => {
        const s = document.createElement('span'); s.className = 'w'; s.textContent = w.text;
        p.appendChild(s); if (k < c.words.length - 1) p.appendChild(document.createTextNode(' '));
        return s;
      });
      p.style.textWrap = 'balance';
      this.inner.appendChild(p);
    }
    c.words.forEach((w, k) => this.spans[k].classList.toggle('on', lt >= w.t - 0.06));
  }
}

function chunk(words, max, dur) {
  const out = [];
  let curr = [];
  const len = ws => ws.reduce((a, w) => a + w.text.length + 1, -1);
  const flush = n => { out.push(curr.slice(0, n)); curr = curr.slice(n); };
  for (const w of words) {
    curr.push(w);
    const L = len(curr);
    if (/[.?!]$/.test(w.text) && L >= 38) { flush(curr.length); continue; }
    if (L > max) {
      // best break: sentence end, then comma/colon/semicolon, then before a conjunction
      let cut = -1;
      for (const test of [x => /[.?!]$/.test(x.text), x => /[,;:]$/.test(x.text)])
        for (let k = curr.length - 2; k >= 2 && cut < 0; k--) if (test(curr[k]) && len(curr.slice(0, k + 1)) >= 24) cut = k + 1;
      if (cut < 0) for (let k = curr.length - 1; k >= 3 && cut < 0; k--) if (CONJ.has(curr[k].text.toLowerCase())) cut = k;
      if (cut < 0) cut = curr.length - 1;
      flush(cut);
    }
  }
  if (curr.length) flush(curr.length);
  return out.map((ws, k) => ({
    words: ws, from: ws[0].t - 0.2,
    to: k < out.length - 1 ? out[k + 1][0].t - 0.2 : dur - 0.15,
  }));
}
