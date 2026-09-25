// Drawing kit for this film: drafting paper, paper-cut cards, ink arrows, labels and the code sheet.
// Every scene is a pure function of time; nothing here keeps animation state.

export const C = {
  paper: '#F2EDE3', paper2: '#E9E2D4', sheet: '#FBF8F2', shade: '#DCD4C4',
  ink: '#1C2230', ink2: '#5E6575', ink3: '#9A9CA6', faint: 'rgba(28,34,48,0.10)',
  blue: '#2856B8', blueSoft: '#DCE5F7', red: '#E2552E', redSoft: '#F9DDD3',
  green: '#2F8A5B', greenSoft: '#D7EDDF', amber: '#DC9E1F', amberDeep: '#A8740A', amberSoft: 'rgba(220,158,31,0.20)',
  term: '#1E2330', termText: '#E8E4D8',
};
export const SANS = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', Consolas, monospace";

// ---------- time helpers ----------
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const eo = k => 1 - Math.pow(1 - clamp(k), 3);
export const eio = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const back = k => { k = clamp(k); const c = 1.5; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const ramp = (t, t0, d = 0.6) => clamp((t - t0) / d);
export const win = (t, a, b, f = 0.4) => Math.min(eo(ramp(t, a, f)), 1 - eo(ramp(t, b - f, f)));
export function rand(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

// ---------- primitives ----------
export function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// paper-cut card: soft shadow down-right (light from the top left), fill, ink outline
export function card(g, x, y, w, h, o = {}) {
  const { fill = C.sheet, stroke = C.ink, lw = 2, r = 10, lift = 1, dash = null, alpha = 1, shadow = true } = o;
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  if (shadow && lift > 0) {
    g.save();
    const s = g.getTransform().a;
    g.shadowColor = 'rgba(70,52,24,0.20)'; g.shadowBlur = 14 * s * lift; g.shadowOffsetX = 4 * s * lift; g.shadowOffsetY = 7 * s * lift;
    rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill();
    g.restore();
  }
  rr(g, x, y, w, h, r);
  g.fillStyle = fill; g.fill();
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; if (dash) g.setLineDash(dash); g.stroke(); }
  g.restore();
}

export function text(g, s, x, y, o = {}) {
  const { size = 24, font = SANS, weight = 500, color = C.ink, align = 'left', base = 'middle', alpha = 1, halo = null, italic = false, max = 0, track = 0 } = o;
  if (alpha <= 0 || !s) return 0;
  g.save();
  g.globalAlpha *= alpha;
  g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`;
  g.textAlign = align; g.textBaseline = base;
  if (track) g.letterSpacing = `${track}px`;
  let w = g.measureText(s).width;
  if (max && w > max) { g.font = `${italic ? 'italic ' : ''}${weight} ${size * max / w}px ${font}`; w = max; }
  if (halo) { g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = halo; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y);
  g.restore();
  return w;
}
export function measure(g, s, size, font = SANS, weight = 500) { g.save(); g.font = `${weight} ${size}px ${font}`; const w = g.measureText(s).width; g.restore(); return w; }

// polyline arrow, drawn up to fraction k of its length
export function arrow(g, pts, o = {}) {
  const { color = C.ink, lw = 2.5, k = 1, head = 12, dash = null, alpha = 1, heads = 'end' } = o;
  if (k <= 0 || alpha <= 0) return;
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let left = total * clamp(k);
  g.save(); g.globalAlpha *= alpha;
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  if (dash) g.setLineDash(dash);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  let end = pts[0], dir = [1, 0];
  for (let i = 1; i < pts.length && left > 0; i++) {
    const a = pts[i - 1], b = pts[i], l = seg[i - 1], u = Math.min(1, left / l);
    end = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    dir = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    g.lineTo(end[0], end[1]); left -= l;
  }
  g.stroke();
  g.setLineDash([]);
  if (head && (heads === 'end' || heads === 'both')) arrowHead(g, end, dir, head);
  if (head && heads === 'both' && k >= 1) { const d0 = [pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]], l0 = Math.hypot(...d0); arrowHead(g, pts[0], [d0[0] / l0, d0[1] / l0], head); }
  g.restore();
}
function arrowHead(g, p, d, s) {
  g.beginPath();
  g.moveTo(p[0] + d[0] * 2, p[1] + d[1] * 2);
  g.lineTo(p[0] - d[0] * s - d[1] * s * 0.55, p[1] - d[1] * s + d[0] * s * 0.55);
  g.lineTo(p[0] - d[0] * s + d[1] * s * 0.55, p[1] - d[1] * s - d[0] * s * 0.55);
  g.closePath(); g.fill();
}
// point at fraction k along a polyline
export function along(pts, k) {
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let left = total * clamp(k);
  for (let i = 1; i < pts.length; i++) {
    if (left <= seg[i - 1]) { const u = seg[i - 1] ? left / seg[i - 1] : 0; return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]; }
    left -= seg[i - 1];
  }
  return pts[pts.length - 1].slice();
}

// small rounded label
export function pill(g, s, x, y, o = {}) {
  const { size = 22, fill = C.ink, color = '#fff', font = MONO, weight = 600, align = 'center', alpha = 1, pad = 12, stroke = null } = o;
  if (alpha <= 0) return 0;
  const w = measure(g, s, size, font, weight) + pad * 2, h = size + pad * 0.9;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.save(); g.globalAlpha *= alpha;
  rr(g, x0, y - h / 2, w, h, h / 2); g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
  g.restore();
  text(g, s, x0 + w / 2, y + 1, { size, font, weight, color, align: 'center', alpha });
  return w;
}

// check / cross marks
export function tick(g, x, y, s, color = C.green, k = 1, lw = 4) {
  if (k <= 0) return;
  arrow(g, [[x - s * 0.5, y], [x - s * 0.15, y + s * 0.38], [x + s * 0.55, y - s * 0.42]], { color, lw, k, head: 0 });
}
export function cross(g, x, y, s, color = C.red, k = 1, lw = 4) {
  if (k <= 0) return;
  arrow(g, [[x - s / 2, y - s / 2], [x + s / 2, y + s / 2]], { color, lw, k: clamp(k * 2), head: 0 });
  arrow(g, [[x + s / 2, y - s / 2], [x - s / 2, y + s / 2]], { color, lw, k: clamp(k * 2 - 1), head: 0 });
}

// a rubber-stamp label that lands from large to its size
export function stamp(g, s, x, y, k, o = {}) {
  if (k <= 0) return;
  const { color = C.red, size = 30, rot = -0.06 } = o;
  const sc = lerp(1.8, 1, eo(k)), a = clamp(k * 3);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.globalAlpha *= a;
  const w = measure(g, s, size, SANS, 800) + 28, h = size + 18;
  rr(g, -w / 2, -h / 2, w, h, 8); g.fillStyle = 'rgba(251,248,242,0.94)'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = color; g.stroke();
  text(g, s, 0, 2, { size, weight: 800, color, align: 'center' });
  g.restore();
}

// the bean: a solid object card with class name; o.proxy wraps it in an amber shell
export function bean(g, name, x, y, w, h, o = {}) {
  const { alpha = 1, fill = C.sheet, sub = null, proxy = 0, ghost = false, color = C.ink, size = 22, lift = 1 } = o;
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  if (proxy > 0) {
    const m = 14 * eo(proxy);
    card(g, x - m, y - m, w + 2 * m, h + 2 * m, { fill: `rgba(220,158,31,${0.22 * proxy})`, stroke: C.amber, lw: 3, r: 16, lift: 0.6 * proxy, alpha: clamp(proxy * 2) });
  }
  card(g, x, y, w, h, { fill: ghost ? 'rgba(251,248,242,0.4)' : fill, stroke: color, dash: ghost ? [7, 6] : null, r: 10, lift: ghost ? 0 : lift, lw: 2.2 });
  text(g, name, x + w / 2, y + (sub ? h / 2 - 11 : h / 2 + 1), { size, weight: 700, font: MONO, align: 'center', color, max: w - 16 });
  if (sub) text(g, sub, x + w / 2, y + h / 2 + 16, { size: 17, font: MONO, align: 'center', color: C.ink2, max: w - 16 });
  g.restore();
}

// a blueprint card: BeanDefinition (a recipe, not an object yet)
export function blueprint(g, x, y, w, h, rows, o = {}) {
  const { alpha = 1, title = 'BeanDefinition', hl = -1, k = 1 } = o;
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  card(g, x, y, w, h, { fill: C.blue, stroke: '#1B3F8C', r: 6, lw: 2 });
  g.save(); rr(g, x, y, w, h, 6); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1;
  for (let gx = x + 12; gx < x + w; gx += 12) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); }
  for (let gy = y + 12; gy < y + h; gy += 12) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.stroke(); }
  g.restore();
  text(g, title, x + 14, y + 20, { size: 16, font: MONO, weight: 700, color: 'rgba(255,255,255,0.75)' });
  rows.forEach((r, i) => {
    const ry = y + 50 + i * 30;
    if (i === hl) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 6, ry - 14, w - 12, 28); }
    text(g, r, x + 14, ry, { size: 19, font: MONO, weight: i === 0 ? 700 : 500, color: '#fff', alpha: clamp(k * rows.length - i), max: w - 28 });
  });
  g.restore();
}

// terminal window
export function terminal(g, x, y, w, h, o = {}) {
  const { alpha = 1, title = '' } = o;
  card(g, x, y, w, h, { fill: C.term, stroke: '#0E1119', r: 12, alpha, lw: 2 });
  g.save(); g.globalAlpha *= alpha;
  ['#E2552E', '#DC9E1F', '#2F8A5B'].forEach((c, i) => { g.beginPath(); g.arc(x + 22 + i * 20, y + 20, 6, 0, 7); g.fillStyle = c; g.fill(); });
  if (title) text(g, title, x + w / 2, y + 21, { size: 16, font: MONO, color: 'rgba(232,228,216,0.55)', align: 'center' });
  g.restore();
}

// ---------- code sheet ----------
const KW = new Set('public private protected class interface record void return new final static import package extends implements if else this throws var true false null default'.split(' '));
const TYPES = /^[A-Z][A-Za-z0-9]*$/;
export function tokens(line, lang) {
  const out = [];
  if (lang === 'xml') {
    const re = /(<\/?[\w.-]+|\/?>|"[^"]*"|[\w.-]+=|[^<>"]+)/g; let m;
    while ((m = re.exec(line))) {
      const s = m[0];
      out.push([s, s.startsWith('<') || s.endsWith('>') ? C.blue : s.startsWith('"') ? C.green : s.endsWith('=') ? C.amberDeep : C.ink]);
    }
    return out;
  }
  if (lang === 'props' || lang === 'sh') {
    const ci = line.indexOf('#');
    if (ci === 0) return [[line, C.ink3, 'i']];
    const m = line.match(/^(\s*)([\w.\-_]+)(=)(.*)$/);
    if (m && lang === 'props') return [[m[1] + m[2], C.blue], [m[3], C.ink2], [m[4], C.green]];
    if (lang === 'sh') { const p = line.startsWith('$ ') ? [['$ ', C.ink3]] : []; return p.concat([[line.replace(/^\$ /, ''), C.ink]]); }
    return [[line, C.ink]];
  }
  const re = /(\/\/.*$|"[^"]*"|@\w+|\b\d+[L]?\b|\b\w+\b|\s+|.)/g; let m;
  while ((m = re.exec(line))) {
    const s = m[0];
    let c = C.ink, st = '';
    if (s.startsWith('//')) { c = C.ink3; st = 'i'; }
    else if (s.startsWith('"')) c = C.green;
    else if (s.startsWith('@')) c = C.amberDeep;
    else if (/^\d/.test(s)) c = C.red;
    else if (KW.has(s)) { c = C.blue; st = 'b'; }
    else if (TYPES.test(s)) c = '#3B2F6B';
    out.push([s, c, st]);
  }
  return out;
}

// draws one code state inside the sheet; hl = [first, last] line (1-based) of the highlight band
export function codeBody(g, st, x, y, w, h, o = {}) {
  const { alpha = 1, hlY = null, hlH = 0, size = 19, reveal = 1, strike = [] } = o;
  if (alpha <= 0) return;
  const lh = size * 1.52;
  g.save(); g.globalAlpha *= alpha;
  rr(g, x, y, w, h, 4); g.clip();
  if (hlY !== null && hlH > 0) {
    g.fillStyle = 'rgba(226,85,46,0.10)'; g.fillRect(x, y + 14 + hlY * lh - 4, w, hlH * lh + 8);
    g.fillStyle = C.red; g.fillRect(x, y + 14 + hlY * lh - 4, 4, hlH * lh + 8);
  }
  const lines = st.code.split('\n');
  const total = lines.reduce((a, l) => a + l.length, 0);
  let budget = reveal >= 1 ? Infinity : Math.floor(total * reveal);
  g.textBaseline = 'middle';
  lines.forEach((ln, i) => {
    const ly = y + 14 + i * lh + lh / 2;
    g.font = `400 ${size * 0.8}px ${MONO}`; g.fillStyle = C.ink3; g.textAlign = 'right';
    g.fillText(String(i + 1), x + 34, ly);
    g.textAlign = 'left';
    let cx = x + 50;
    for (const [s, c, style] of tokens(ln, st.lang)) {
      if (budget <= 0) break;
      const part = s.length > budget ? s.slice(0, budget) : s;
      budget -= s.length;
      g.font = `${style === 'i' ? 'italic ' : ''}${style === 'b' ? 700 : 500} ${size}px ${MONO}`;
      g.fillStyle = c; g.fillText(part, cx, ly);
      cx += g.measureText(part).width;
    }
    if (strike.includes(i + 1)) { g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 48, ly); g.lineTo(cx + 4, ly); g.stroke(); }
  });
  g.restore();
}
