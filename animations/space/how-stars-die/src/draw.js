// White-pencil overlay: everything drawn on top of the plate (lines, arrows, notes, labels).
// World coordinates: y down, landscape visible height = 1. A layout registry keeps text from colliding.

export const INKC = { w: [232, 242, 247], o: [255, 106, 43], ink: [8, 26, 51], pap: [239, 230, 210], mid: [111, 156, 194] };
export const rgba = (c, a) => `rgba(${INKC[c][0]},${INKC[c][1]},${INKC[c][2]},${a})`;
const FONTS = { hand: 'italic 400 {s}px "Instrument Serif", Georgia, serif', title: '400 {s}px "Instrument Serif", Georgia, serif', mono: '400 {s}px "IBM Plex Mono", Consolas, monospace', monob: '500 {s}px "IBM Plex Mono", Consolas, monospace' };

export function makeOverlay() {
  const O = {
    ctx: null, W: 0, H: 0, U: 1, port: false, S: 1, t: 0, cam: { x: 0, y: 0, z: 1 }, boil: 0, boxes: [], log: null,
    begin(ctx, W, H, U, port, t) {
      O.ctx = ctx; O.W = W; O.H = H; O.U = U; O.port = port; O.t = t;
      O.S = port ? Math.min(W / 640, H / 1100) : Math.min(W / 1600, H / 900);
      O.boil = Math.floor(t * 8);
      O.boxes = [];
      O.keep('subs', subsBox(W, H, port));
    },
    setCam(c) { O.cam = c; },
    x(x) { return O.W / 2 + (x - O.cam.x) * O.U * O.cam.z; },
    y(y) { return O.H / 2 + (y - O.cam.y) * O.U * O.cam.z; },
    len(l) { return l * O.U * O.cam.z; },
    fs(px, min = 12) { return Math.max(min, px * O.S); },
    // ---- layout registry
    keep(id, b) { O.boxes.push({ id, kind: 'keep', ...b }); },
    claim(id, b) { O.boxes.push({ id, kind: 'text', ...b }); if (O.log) O.log.push({ id, t: O.t, ...b }); },
    free(b) { return !O.boxes.some(o => b.x < o.x + o.w + 4 && b.x + b.w + 4 > o.x && b.y < o.y + o.h + 4 && b.y + b.h + 4 > o.y); },
    // first candidate box that collides with nothing (falls back to the first)
    placeFree(cands) { for (const c of cands) if (O.free(c) && c.x > 6 && c.y > 6 && c.x + c.w < O.W - 6 && c.y + c.h < O.H - 6) return c; return cands[0]; },
  };
  return O;
}

export function subsBox(W, H, port) { const h = port ? H * 0.2 : H * 0.17; return { x: 0, y: H - h, w: W, h }; }

// ---- strokes -------------------------------------------------------------------------------
function wob(i, seed) { const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; }

// polyline in screen px; prog draws it on from the start
export function penS(O, pts, { w = 2, a = 0.92, c = 'w', prog = 1, jit = 0.9, seed = 1, dash = null, tip = false } = {}) {
  if (prog <= 0 || a <= 0.003 || pts.length < 2) return;
  const ctx = O.ctx;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1] * Math.min(1, prog);
  const path = [];
  for (let i = 0; i < pts.length; i++) {
    const j = jit * O.S * 1.2, s = seed + O.boil * 0.37;
    if (cum[i] <= L) path.push([pts[i][0] + wob(i, s) * j, pts[i][1] + wob(i + 99, s) * j]);
    else { const k = (L - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); path.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]); break; }
  }
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash.map(d => d * O.S));
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p[0] + pass * 0.7, p[1] + pass * 0.5) : ctx.moveTo(p[0] + pass * 0.7, p[1] + pass * 0.5)));
    ctx.strokeStyle = rgba(c, pass ? a * 0.32 : a);
    ctx.lineWidth = Math.max(1, (pass ? w * 0.55 : w) * O.S * 1.4);
    ctx.stroke();
  }
  if (tip && prog < 1) { const p = path[path.length - 1]; ctx.fillStyle = rgba(c, a); ctx.beginPath(); ctx.arc(p[0], p[1], w * O.S * 1.6, 0, 7); ctx.fill(); }
  ctx.restore();
}
// world-space polyline
export function pen(O, pts, opt) { penS(O, pts.map(p => [O.x(p[0]), O.y(p[1])]), opt); }

export function circle(O, x, y, r, opt = {}) {
  const n = Math.max(24, Math.min(140, Math.round(O.len(r) * 0.5)));
  const a0 = opt.a0 ?? -Math.PI / 2, sweep = opt.sweep ?? Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + sweep * i / n; const rr = r * (1 + (opt.wob || 0) * wob(i, 7)); pts.push([x + Math.cos(a) * rr * (opt.sx || 1), y + Math.sin(a) * rr]); }
  pen(O, pts, opt);
}

export function arrow(O, x1, y1, x2, y2, opt = {}) {
  const prog = opt.prog ?? 1;
  if (prog <= 0) return;
  const xe = x1 + (x2 - x1) * prog, ye = y1 + (y2 - y1) * prog;
  pen(O, [[x1, y1], [(x1 + xe) / 2, (y1 + ye) / 2], [xe, ye]], { ...opt, prog: 1 });
  const ang = Math.atan2(ye - y1, xe - x1), hl = opt.head ?? 0.022;
  const hx = O.x(xe), hy = O.y(ye), h = O.len(hl);
  penS(O, [[hx - Math.cos(ang - 0.45) * h, hy - Math.sin(ang - 0.45) * h], [hx, hy], [hx - Math.cos(ang + 0.45) * h, hy - Math.sin(ang + 0.45) * h]], { ...opt, prog: 1, jit: 0.4 });
}

// ---- text ----------------------------------------------------------------------------------
export function font(O, kind, size) { return FONTS[kind].replace('{s}', size.toFixed(1)); }
export function measure(O, str, kind, size) { O.ctx.font = font(O, kind, size); return O.ctx.measureText(str).width; }

// text at screen px. prog reveals it left→right like handwriting. Returns its box.
export function textS(O, str, x, y, { kind = 'hand', size = 30, c = 'w', a = 1, align = 'left', prog = 1, halo = 0.55, id = null, spacing = 0, base = 'middle' } = {}) {
  if (a <= 0.003 || prog <= 0) return null;
  const ctx = O.ctx, s = O.fs(size, kind.startsWith('mono') ? 11 : 14);
  ctx.save();
  ctx.font = font(O, kind, s);
  if (spacing) ctx.letterSpacing = `${spacing * s}px`;
  const wdt = ctx.measureText(str).width;
  const x0 = align === 'center' ? x - wdt / 2 : align === 'right' ? x - wdt : x;
  const box = { x: x0 - 2, y: y - s * 0.62, w: wdt + 4, h: s * 1.24 };
  if (id) O.claim(id, box);
  if (prog < 1) { ctx.beginPath(); ctx.rect(x0 - s, y - s * 2, s + wdt * prog, s * 4); ctx.clip(); }
  ctx.textBaseline = base; ctx.textAlign = 'left';
  if (halo > 0) { ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('ink', halo * a); ctx.lineWidth = s * 0.16; ctx.strokeText(str, x0, y); }
  ctx.fillStyle = rgba(c, a);
  ctx.fillText(str, x0, y);
  ctx.restore();
  return box;
}
export function text(O, str, x, y, opt) { return textS(O, str, O.x(x), O.y(y), opt); }

// a label near a world point: tries several sides, avoids registered boxes
export function label(O, id, str, x, y, { kind = 'mono', size = 18, c = 'w', a = 1, prog = 1, gap = 0.03, sides = ['r', 'l', 't', 'b'], lead = false, halo = 0.55 } = {}) {
  if (a <= 0.003 || prog <= 0) return null;
  const s = O.fs(size, kind.startsWith('mono') ? 11 : 14);
  const w = measure(O, str, kind, s) + 4, h = s * 1.24;
  const px = O.x(x), py = O.y(y), g = O.len(gap) + 6;
  const C = { r: { x: px + g, y: py - h / 2 }, l: { x: px - g - w, y: py - h / 2 }, t: { x: px - w / 2, y: py - g - h }, b: { x: px - w / 2, y: py + g },
    tr: { x: px + g * 0.7, y: py - g * 0.7 - h }, br: { x: px + g * 0.7, y: py + g * 0.7 }, tl: { x: px - g * 0.7 - w, y: py - g * 0.7 - h }, bl: { x: px - g * 0.7 - w, y: py + g * 0.7 } };
  const box = O.placeFree(sides.map(k => ({ ...C[k], w, h })));
  O.claim(id, box);
  if (lead) {
    const cx = Math.max(box.x, Math.min(px, box.x + box.w)), cy = Math.max(box.y, Math.min(py, box.y + box.h));
    const d = Math.hypot(cx - px, cy - py);
    if (d > 8) penS(O, [[px + (cx - px) * 0.18, py + (cy - py) * 0.18], [cx - (cx - px) * 8 / d, cy - (cy - py) * 8 / d]], { w: 1, a: a * 0.7, prog, jit: 0.3 });
  }
  textS(O, str, box.x + 2, box.y + h / 2, { kind, size, c, a, prog, halo });
  return box;
}

// strike-through scribble over a box (the wrong model gets crossed out, not erased)
export function strike(O, box, prog, { c = 'o', a = 0.95, seed = 3 } = {}) {
  if (!box || prog <= 0) return;
  const y = box.y + box.h * 0.55;
  penS(O, [[box.x - 6, y + 3], [box.x + box.w * 0.5, y - 2], [box.x + box.w + 6, y - 4]], { w: 2.2, c, a, prog: Math.min(1, prog * 2), seed });
  if (prog > 0.5) penS(O, [[box.x - 4, y - 5], [box.x + box.w + 4, y + 5]], { w: 1.6, c, a: a * 0.8, prog: (prog - 0.5) * 2, seed: seed + 1 });
}
