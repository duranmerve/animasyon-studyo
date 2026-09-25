// Documentary graphics over the 3D view: field-guide labels with leader lines anchored to 3D
// points, the chapter card, a live scale bar and diagram panels. Rebuilt every frame from the
// story time (items not requested this frame are hidden), so any moment can be drawn exactly.
import { Vector3, Matrix } from '@babylonjs/core';

const NS = 'http://www.w3.org/2000/svg';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];

export class Overlay {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.svg = document.getElementById('lines');
    this.labelsEl = document.getElementById('labels');
    this.panelsEl = document.getElementById('panels');
    this.card = document.getElementById('card');
    this.scale = document.getElementById('scalebar');
    this.fadeEl = document.getElementById('fade');
    this.items = new Map();
    this.panels = new Map();
    this.used = new Set();
    this.W = 1; this.H = 1;
  }
  get mobile() { return this.W < 700; }
  resize(w, h) { this.W = w; this.H = h; this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`); }

  begin() {
    this.used.clear();
    this.vp = this.camera.viewport.toGlobal(this.W, this.H);
    this.tm = this.scene.getTransformMatrix();
  }
  // world point → screen [x, y, visible]
  project(p) {
    const v = Vector3.Project(p, Matrix.IdentityReadOnly, this.tm, this.vp);
    return [v.x, v.y, v.z > 0 && v.z < 1];
  }

  // label anchored at a 3D point (or a screen point [x,y]); off = [dx,dy] from anchor in px (scaled on phones)
  label(id, { at, text, sub = '', cls = '', off = [60, -40], op = 1, dot = true, line = true }) {
    if (op <= 0.01) return;
    this.used.add(id);
    let it = this.items.get(id);
    if (!it) {
      const el = document.createElement('div'); el.className = 'lab';
      this.labelsEl.appendChild(el);
      const ln = document.createElementNS(NS, 'polyline');
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 2.6);
      this.svg.appendChild(ln); this.svg.appendChild(c);
      it = { el, ln, c, key: '' };
      this.items.set(id, it);
    }
    const key = text + '|' + sub + '|' + cls;
    if (it.key !== key) {
      it.key = key;
      it.el.className = 'lab ' + cls;
      it.el.innerHTML = `<div class="t">${text}</div>${sub ? `<div class="s">${sub}</div>` : ''}`;
      it.w = null;
    }
    const [ax, ay, vis] = Array.isArray(at) ? [at[0], at[1], true] : this.project(at);
    if (!vis) { it.el.style.opacity = 0; it.ln.style.opacity = 0; it.c.style.opacity = 0; return; }
    const k = this.mobile ? 0.6 : 1;
    const dx = off[0] * k, dy = off[1] * k;
    if (it.w == null) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
    let tx = ax + dx, ty = ay + dy;
    // text block: to the right of the line end if dx >= 0, else to the left
    let lx = dx >= 0 ? tx + 6 : tx - it.w - 6, ly = ty - it.h / 2;
    if (!line) { lx = cls.includes('center') ? ax - it.w / 2 : lx; ly = ay - it.h / 2; }
    lx = Math.max(10, Math.min(this.W - it.w - 10, lx));
    ly = Math.max(10, Math.min(this.H - it.h - 10, ly));
    it.el.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
    it.el.style.opacity = op;
    if (line) {
      const bx = dx >= 0 ? lx - 6 : lx + it.w + 6;
      it.ln.setAttribute('points', `${ax.toFixed(1)},${ay.toFixed(1)} ${bx.toFixed(1)},${(ly + it.h / 2).toFixed(1)}`);
      it.ln.style.opacity = op * 0.9;
      it.ln.setAttribute('class', cls.includes('gold') ? 'gold' : '');
    } else it.ln.style.opacity = 0;
    it.c.setAttribute('cx', ax.toFixed(1)); it.c.setAttribute('cy', ay.toFixed(1));
    it.c.style.opacity = dot && line ? op : 0;
    it.c.setAttribute('class', cls.includes('gold') ? 'gold' : '');
  }

  // measuring line between two 3D points with end ticks and a caption
  measure(id, a, b, { text, op = 1, cls = 'gold', side = 1, pad = 14 }) {
    if (op <= 0.01) return;
    this.used.add(id);
    let it = this.items.get(id);
    if (!it) {
      const g = document.createElementNS(NS, 'path');
      const el = document.createElement('div'); el.className = 'lab';
      this.svg.appendChild(g); this.labelsEl.appendChild(el);
      it = { g, el, key: '', measure: true };
      this.items.set(id, it);
    }
    if (it.key !== text + cls) { it.key = text + cls; it.el.className = 'lab center ' + cls; it.el.innerHTML = `<div class="t">${text}</div>`; it.w = null; }
    const [x1, y1, v1] = this.project(a), [x2, y2, v2] = this.project(b);
    if (!v1 || !v2) { it.g.style.opacity = 0; it.el.style.opacity = 0; return; }
    let nx = -(y2 - y1), ny = x2 - x1; const l = Math.hypot(nx, ny) || 1; nx = nx / l * side; ny = ny / l * side;
    const o = pad, tk = 6;
    const X1 = x1 + nx * o, Y1 = y1 + ny * o, X2 = x2 + nx * o, Y2 = y2 + ny * o;
    it.g.setAttribute('d', `M${X1 - nx * tk},${Y1 - ny * tk} L${X1 + nx * tk},${Y1 + ny * tk} M${X1},${Y1} L${X2},${Y2} M${X2 - nx * tk},${Y2 - ny * tk} L${X2 + nx * tk},${Y2 + ny * tk}`);
    it.g.setAttribute('class', cls.includes('gold') ? 'gold' : '');
    it.g.style.opacity = op; it.g.style.strokeWidth = 1.6;
    if (it.w == null) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
    const mx = (X1 + X2) / 2 + nx * (it.h * 0.7 + 6), my = (Y1 + Y2) / 2 + ny * (it.h * 0.7 + 6);
    it.el.style.transform = `translate(${(mx - it.w / 2).toFixed(1)}px, ${(my - it.h / 2).toFixed(1)}px)`;
    it.el.style.opacity = op;
  }

  // custom panel: create(el) once, update(el, op) every frame it is used
  panel(id, op, create, update) {
    if (op <= 0.01) return;
    this.used.add(id);
    let p = this.panels.get(id);
    if (!p) { const el = document.createElement('div'); el.className = 'panel'; this.panelsEl.appendChild(el); create(el, this); p = { el }; this.panels.set(id, p); }
    p.el.style.opacity = op;
    update && update(p.el, op, this);
  }

  chapterCard(ch, u) {
    const inT = ch.id === 'acilis' ? -1 : 0.25, hold = 4.2;
    const op = inT < 0 ? 0 : Math.min(1, (u - inT) / 0.6) * Math.min(1, Math.max(0, (inT + hold - u) / 0.8));
    if (this._cardFor !== ch.id) {
      this._cardFor = ch.id;
      this.card.querySelector('.num').textContent = 'BÖLÜM ' + ROMAN[ch.index];
      this.card.querySelector('.ttl').textContent = ch.title;
    }
    this.card.style.opacity = Math.max(0, op);
    this.card.style.transform = `translateY(${(1 - Math.min(1, Math.max(0, op))) * 10}px)`;
  }

  // scale bar for the focus distance (mm)
  scaleBar(dist, op = 1) {
    if (op <= 0.01 || !dist) { this.scale.style.opacity = 0; return; }
    const pxPerMm = this.camera.fovMode === 1 ? (this.W / 2) / Math.tan(this.camera.fov / 2) / dist : (this.H / 2) / Math.tan(this.camera.fov / 2) / dist;
    const target = this.mobile ? 70 : 110;
    const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    let mm = steps[0];
    for (const s of steps) if (s * pxPerMm <= target * 1.5) mm = s;
    const px = mm * pxPerMm;
    this.scale.querySelector('.bar').style.width = px.toFixed(1) + 'px';
    const txt = mm >= 10 ? `${mm / 10} cm` : `${String(mm).replace('.', ',')} mm`;
    this.scale.querySelector('.txt').textContent = txt;
    this.scale.style.opacity = op;
  }

  fade(v) { this.fadeEl.style.opacity = v; }

  end() {
    for (const [id, it] of this.items) if (!this.used.has(id)) {
      it.el.style.opacity = 0;
      if (it.ln) it.ln.style.opacity = 0;
      if (it.c) it.c.style.opacity = 0;
      if (it.g) it.g.style.opacity = 0;
    }
    for (const [id, p] of this.panels) if (!this.used.has(id)) p.el.style.opacity = 0;
  }
}
