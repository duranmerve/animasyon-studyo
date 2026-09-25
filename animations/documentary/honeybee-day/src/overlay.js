// Field-guide layer (SVG over the canvas): a thin leader line from a point in the scene to a name
// (and its Latin name), scale bars, the hour stamp, the chapter title, and small line diagrams.
// Elements are pooled by id; each frame the director re-declares what is visible.
//
// Layout register (craft.md → 12): every piece of text claims its box; the subtitle band and the
// screen margin are kept areas. A new label is placed at the first free candidate position
// (placeFree); if none is free it is not drawn. Earlier claims win, so the director declares the
// hour stamp and chapter title before the shot's own labels.
import * as THREE from 'three';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

// text metrics for the register (same faces as style.css)
const FONTS = {
  lab: s => `500 ${s}px Commissioner`, latin: s => `italic 400 ${s}px Newsreader`, clock: s => `300 ${s}px Newsreader`,
  place: s => `500 ${s}px Commissioner`, ttl: s => `italic 300 ${s}px Newsreader`, num: s => `300 ${s}px Newsreader`,
};
const SPACING = { place: 0.14, lab: 0.01 };
const mctx = document.createElement('canvas').getContext('2d');
const mcache = new Map();
function textWidth(cls, size, text) {
  const key = cls + '|' + size.toFixed(1) + '|' + text;
  let w = mcache.get(key);
  if (w == null) {
    mctx.font = (FONTS[cls] || FONTS.lab)(size);
    w = mctx.measureText(text).width + (SPACING[cls] || 0) * size * text.length;
    if (mcache.size > 4000) mcache.clear();
    mcache.set(key, w);
  }
  return w;
}
const PAD = 3;                          // stroke halo + breathing room
const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export class Overlay {
  constructor(svg, camera) {
    this.svg = svg; this.camera = camera;
    this.items = new Map(); this.used = new Set();
    this.W = 1600; this.H = 900;
    this.v = new THREE.Vector3();
    this.claims = []; this.keeps = [];
    this.subsEl = document.getElementById('subs');
  }
  resize(w, h) { this.W = w; this.H = h; this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`); }
  get k() { return Math.max(0.62, Math.min(1.25, Math.min(this.W / 1600, this.H / 900) * 1.05)); }
  get portrait() { return this.H > this.W; }
  fs(size) { return Math.max(12, size * this.k); }
  px(size) { return this.fs(size) + 'px'; }
  // 3D → screen px (null if behind)
  project(p) {
    this.v.copy(p).project(this.camera);
    if (this.v.z > 1) return null;
    return [(this.v.x * 0.5 + 0.5) * this.W, (-this.v.y * 0.5 + 0.5) * this.H];
  }
  // ---- layout register ----
  keep(id, box) { this.keeps.push({ id, ...box }); }
  claim(id, box) { this.claims.push({ id, ...box }); }
  free(box) {
    if (box.x0 < 4 || box.y0 < 4 || box.x1 > this.W - 4 || box.y1 > this.H - 4) return false;
    for (const c of this.keeps) if (hit(box, c)) return false;
    for (const c of this.claims) if (hit(box, c)) return false;
    return true;
  }
  // first candidate (a list of box groups) whose boxes are all free, or -1
  placeFree(cands) {
    for (let i = 0; i < cands.length; i++) if (cands[i].every(b => this.free(b))) return i;
    return -1;
  }
  textBox(cls, size, text, x, y, anchor) {
    const w = textWidth(cls, size, text);
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    return { x0: x0 - PAD, x1: x0 + w + PAD, y0: y - size * 0.82 - PAD, y1: y + size * 0.26 + PAD };
  }
  begin() {
    this.used.clear(); this.claims = []; this.keeps = [];
    // the subtitle band: two lines at the highest position they take (player bar shown)
    const fsz = parseFloat(getComputedStyle(this.subsEl).fontSize) || 21;
    const bottom = this.W <= 700 ? 100 : Math.min(132, Math.max(104, this.H * 0.15));
    const bw = Math.min(this.W * 0.92, 980);
    this.keep('subtitles', { x0: (this.W - bw) / 2, x1: (this.W + bw) / 2, y0: this.H - bottom - fsz * 1.42 * 2 - 10, y1: this.H });
  }
  end() { for (const [id, it] of this.items) if (!this.used.has(id)) { if (it.g.style.display !== 'none') it.g.style.display = 'none'; } }
  // every text box drawn this frame (for dev/layout-check.mjs)
  get boxes() { return { claims: this.claims.map(c => ({ ...c })), keeps: this.keeps.map(c => ({ ...c })) }; }
  item(id, make) {
    let it = this.items.get(id);
    if (!it) { const g = el('g', {}, this.svg); it = { g, ...make(g) }; this.items.set(id, it); }
    this.used.add(id);
    if (it.g.style.display === 'none') it.g.style.display = '';
    return it;
  }
  // leader label: anchor (screen [x,y] or THREE.Vector3), text, latin, dir: [dx,dy] offset of the text
  label(id, anchor, text, { latin = '', dir = [80, -60], op = 1, ink = 'light', size = 1 } = {}) {
    const a = anchor && anchor.isVector3 ? this.project(anchor) : anchor;
    if (!a || op <= 0.01) return;
    if (a[0] < 0 || a[0] > this.W || a[1] < 0 || a[1] > this.H) return;
    const k = this.k * size;
    if (this.portrait) latin = '';
    const fsT = Math.max(12, 18 * k), fsL = Math.max(12, 16 * k);
    const [dx, dy] = [dir[0] * k, dir[1] * k];
    const tries = [[dx, dy], [-dx, dy], [dx, -dy], [-dx, -dy], [dx * 1.6, dy * 1.5], [-dx * 1.6, dy * 1.5], [dx, dy * 2.2], [-dx, dy * 2.2], [dx * 0.6, dy * 0.7], [-dx * 0.6, dy * 0.7]];
    const layouts = tries.map(([ox, oy]) => {
      const right = ox >= 0, tx = a[0] + ox, ty = a[1] + oy, anchorT = right ? 'start' : 'end';
      const boxes = [this.textBox('lab', fsT, text, tx, ty - 3 * k, anchorT)];
      if (latin) boxes.push(this.textBox('latin', fsL, latin, tx, ty + Math.max(15, 17 * k), anchorT));
      return { right, tx, ty, anchorT, boxes };
    });
    const i = this.placeFree(layouts.map(l => l.boxes));
    if (i < 0) return;                                   // no free place: better unsaid than on top of something
    const L = layouts[i];
    L.boxes.forEach((b, j) => this.claim(id + (j ? ':latin' : ''), b));
    const it = this.item(id, g => ({
      line: el('path', { class: 'lead' }, g), dot: el('circle', { r: 2.6, class: 'dot' }, g),
      t: el('text', { class: 'lab' }, g), l: el('text', { class: 'latin' }, g),
    }));
    it.g.setAttribute('class', 'fg ' + ink);
    it.g.style.opacity = op;
    it.dot.setAttribute('cx', a[0]); it.dot.setAttribute('cy', a[1]);
    const lx = L.tx + (L.right ? -6 : 6);
    it.line.setAttribute('d', `M${a[0]},${a[1]} L${lx},${L.ty}`);
    it.t.setAttribute('x', L.tx); it.t.setAttribute('y', L.ty - 3 * k);
    it.t.setAttribute('text-anchor', L.anchorT);
    it.t.style.fontSize = fsT + 'px';
    if (it.t.textContent !== text) it.t.textContent = text;
    it.l.setAttribute('x', L.tx); it.l.setAttribute('y', L.ty + Math.max(15, 17 * k));
    it.l.setAttribute('text-anchor', L.anchorT);
    it.l.style.fontSize = fsL + 'px';
    if (it.l.textContent !== latin) it.l.textContent = latin;
  }
  // free text at screen position; moved up/down a line (then two) if its place is taken
  text(id, x, y, text, { cls = 'lab', op = 1, anchor = 'start', size = 18, ink = 'light', keep = false, shifts = null } = {}) {
    if (op <= 0.01) return;
    if (this.portrait && !keep && cls === 'latin' && size < 15) return;      // fewer labels on phones
    const f = this.fs(size), lh = f * 1.35;
    const offs = shifts || [0, lh, -lh, 2 * lh, -2 * lh];
    const cands = offs.map(o => [this.textBox(cls, f, text, x, y + o, anchor)]);
    const i = this.placeFree(cands);
    if (i < 0) return;
    this.claim(id, cands[i][0]);
    const it = this.item(id, g => ({ t: el('text', {}, g) }));
    it.g.setAttribute('class', 'fg ' + ink);
    it.t.setAttribute('class', cls);
    it.g.style.opacity = op;
    it.t.setAttribute('x', x); it.t.setAttribute('y', y + offs[i]); it.t.setAttribute('text-anchor', anchor);
    it.t.style.fontSize = f + 'px';
    if (it.t.textContent !== text) it.t.textContent = text;
  }
  // polyline / path in screen px
  path(id, d, { cls = 'diag', op = 1, ink = 'light', dash = null, len = null } = {}) {
    if (op <= 0.01) return;
    const it = this.item(id, g => ({ p: el('path', {}, g) }));
    it.g.setAttribute('class', 'fg ' + ink);
    it.g.style.opacity = op;
    it.p.setAttribute('class', cls);
    it.p.setAttribute('d', d);
    if (len != null) { it.p.setAttribute('pathLength', 1); it.p.style.strokeDasharray = `${len} 1`; }
    else if (dash) it.p.style.strokeDasharray = dash; else it.p.style.strokeDasharray = '';
  }
  circle(id, x, y, r, { cls = 'diag', op = 1, ink = 'light' } = {}) {
    if (op <= 0.01) return;
    const it = this.item(id, g => ({ c: el('circle', {}, g) }));
    it.g.setAttribute('class', 'fg ' + ink); it.g.style.opacity = op;
    it.c.setAttribute('class', cls); it.c.setAttribute('cx', x); it.c.setAttribute('cy', y); it.c.setAttribute('r', r);
  }
  // scale bar of `cm` centimetres at depth of point p (world), labelled
  scale(id, p, cm, txt, { op = 1, ink = 'light', at = null } = {}) {
    if (op <= 0.01) return;
    const a = this.project(p); if (!a) return;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).multiplyScalar(cm).add(p);
    const b = this.project(right); if (!b) return;
    const w = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [x, y] = at || [this.W * 0.06, this.H * (this.portrait ? 0.62 : 0.68)];
    const f = this.fs(15);
    const box = this.textBox('latin', f, txt, x, y + 20 * this.k, 'start');
    const barBox = { x0: x - 2, x1: x + w + 2, y0: y - 7, y1: y + 2 };
    if (!this.free(box) || !this.free(barBox)) return;
    this.claim(id, box);
    const it = this.item(id, g => ({ bar: el('path', { class: 'bar' }, g), t: el('text', { class: 'latin' }, g) }));
    it.g.setAttribute('class', 'fg ' + ink); it.g.style.opacity = op;
    it.bar.setAttribute('d', `M${x},${y - 5} L${x},${y} L${x + w},${y} L${x + w},${y - 5}`);
    it.t.setAttribute('x', x); it.t.setAttribute('y', y + 20 * this.k); it.t.style.fontSize = f + 'px';
    if (it.t.textContent !== txt) it.t.textContent = txt;
  }
  // hour stamp, top left: "05.40 · şafak"
  stamp(clock, place, op) {
    if (op <= 0.01) return;
    const k = this.k;
    const x = this.W * 0.045, y = this.H * 0.085 + 16 * k;
    const fc = this.fs(30), fp = this.fs(17), gap = Math.max(26 * k, fc * 0.3 + fp * 1.15);
    this.claim('stamp', this.textBox('clock', fc, clock, x, y, 'start'));
    this.claim('stamp:place', this.textBox('place', fp, place, x, y + gap, 'start'));
    const it = this.item('stamp', g => ({ c: el('text', { class: 'clock' }, g), p: el('text', { class: 'place' }, g), r: el('path', { class: 'rule' }, g) }));
    it.g.setAttribute('class', 'fg light'); it.g.style.opacity = op;
    it.c.setAttribute('x', x); it.c.setAttribute('y', y); it.c.style.fontSize = fc + 'px';
    if (it.c.textContent !== clock) it.c.textContent = clock;
    it.p.setAttribute('x', x); it.p.setAttribute('y', y + gap); it.p.style.fontSize = fp + 'px';
    if (it.p.textContent !== place) it.p.textContent = place;
    it.r.setAttribute('d', `M${x},${y + gap + fp * 0.7} L${x + 46 * k},${y + gap + fp * 0.7}`);
  }
  // chapter title (lower left third, above the subtitle band) or the big film title (centre).
  // A dark, soft-edged band sits behind it and arrives before the letters (craft.md → 15).
  title(text, sub, op, { big = false, band = null } = {}) {
    if (op <= 0.01 && !(band > 0.01)) return;
    const k = this.k * (big ? 1.9 : 1);
    const x = big ? this.W / 2 : this.W * 0.045, y = big ? this.H * 0.42 : this.H * (this.portrait ? 0.6 : 0.64);
    const ft = Math.min(this.W * (big ? 0.085 : 0.075), Math.max(22, 40 * k)), fsub = Math.max(13, 17 * k);
    const anchor = big ? 'middle' : 'start';
    this.claim('title', this.textBox('ttl', ft, text, x, y, anchor));
    if (sub) this.claim('title:sub', this.textBox('latin', fsub, sub, x, y + 30 * k, anchor));
    const it = this.item('title', g => {
      const defs = el('defs', {}, g);
      const lg = el('linearGradient', { id: 'titleBand', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      for (const [o, a] of [[0, 0], [0.22, 0.78], [0.78, 0.78], [1, 0]]) el('stop', { offset: o, 'stop-color': '#120C08', 'stop-opacity': a }, lg);
      const lh = el('linearGradient', { id: 'titleBandH', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
      for (const [o, a] of [[0, 0.7], [0.6, 0.45], [1, 0]]) el('stop', { offset: o, 'stop-color': '#120C08', 'stop-opacity': a }, lh);
      return { band: el('rect', {}, g), t: el('text', { class: 'ttl' }, g), s: el('text', { class: 'latin' }, g) };
    });
    it.g.setAttribute('class', 'fg light'); it.g.style.opacity = 1;
    it.band.style.opacity = band ?? op;
    it.t.style.opacity = op; it.s.style.opacity = op;
    if (big) {
      const bh = ft * 1.25 + fsub * 1.6;
      it.band.setAttribute('x', 0); it.band.setAttribute('width', this.W);
      it.band.setAttribute('y', y - ft * 1.05 - bh * 0.25); it.band.setAttribute('height', bh * 1.5 + ft * 0.3); it.band.setAttribute('fill', 'url(#titleBand)');
    } else {
      it.band.setAttribute('x', 0); it.band.setAttribute('width', Math.min(this.W, textWidth('ttl', ft, text) + x + 160 * k));
      it.band.setAttribute('y', y - ft * 1.1); it.band.setAttribute('height', ft * 1.6); it.band.setAttribute('fill', 'url(#titleBandH)');
    }
    for (const e of [it.t, it.s]) e.setAttribute('text-anchor', anchor);
    it.t.setAttribute('x', x); it.t.setAttribute('y', y); it.t.style.fontSize = ft + 'px';
    if (it.t.textContent !== text) it.t.textContent = text;
    it.s.setAttribute('x', x); it.s.setAttribute('y', y + 30 * k); it.s.style.fontSize = fsub + 'px';
    if (it.s.textContent !== sub) it.s.textContent = sub;
  }
}
