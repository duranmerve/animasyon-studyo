// The whole picture as a pure function of story time: draw(ctx, W, H, t).
// A transit map of the commit history lives in world coordinates and is filmed by a camera;
// "diorama" cards for each chapter are laid out on screen around it.
import {
  PAPER, GRID, INK, MUTED, RED, WHITE, LINE, LABEL, FS, FB, FM,
  clamp, lerp, ease, eout, back, ramp, win, rr, text, hashOf, rand, rolled,
  fileIcon, game, polaroid, laptop, server, person, wrap, star,
} from './draw.js';

const SX = 170, SY = 120;
const PRIO = ['main', 'kalkan', 'ses', 'kolay'];

function mix(a, b, u) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`;
}
const alpha = (ctx, a) => { ctx.globalAlpha = clamp(a); };

export function layout(W, H) {
  const portrait = H > W * 1.05;
  if (portrait) {
    const u = clamp(W / 390, 0.8, 1.6), pad = 14 * u;
    const head = 60 * u, term = { x: pad, y: head, w: W - 2 * pad, h: 78 * u };
    const subH = Math.max(150, H * 0.19);
    const stage = { x: pad, y: term.y + term.h + 10 * u, w: W - 2 * pad, h: 0 };
    stage.h = H - subH - stage.y;
    return {
      portrait, u, pad, W, H, head, term, stage,
      left: { x: stage.x, y: stage.y, w: stage.w, h: stage.h * 0.44 },
      right: { x: stage.x, y: stage.y + stage.h * 0.46, w: stage.w, h: stage.h * 0.54 },
    };
  }
  const u = clamp(Math.min(W / 1600, H / 900), 0.5, 1.6), pad = Math.max(20, 44 * u);
  const head = 118 * u;
  const tw = Math.min(640 * u, W * 0.42);
  const term = { x: W - pad - tw, y: 18 * u, w: tw, h: 104 * u };
  const subH = Math.max(150, H * 0.2);
  const stage = { x: pad, y: head + 8 * u, w: W - 2 * pad, h: H - subH - head - 8 * u };
  return {
    portrait, u, pad, W, H, head, term, stage,
    left: { x: stage.x, y: stage.y, w: stage.w * 0.56, h: stage.h },
    right: { x: stage.x + stage.w * 0.58, y: stage.y, w: stage.w * 0.42, h: stage.h },
  };
}

// fit a design box (dw × dh) into a screen rect; returns scale
function box(ctx, r, dw, dh) {
  const s = Math.min(r.w / dw, r.h / dh);
  ctx.translate(r.x + (r.w - dw * s) / 2, r.y + (r.h - dh * s) / 2);
  ctx.scale(s, s);
  return s;
}

export function createScene(tl) {
  const C = (id, n) => tl.cue(id, n);
  const S = id => tl.byId[id].start, E = id => tl.byId[id].end;

  // ---------------------------------------------------------------- commits
  const K = {};
  const def = (id, o) => { K[id] = { id, lane: 0, line: 'main', parents: [], hash: hashOf('yildiz-avcisi/' + id + '/' + (o.msg || '')), ...o }; };
  const f0 = {}, fB = { score: 1 }, fC = { score: 1, sky: 1 }, fD = { ...fC, shield: 1 };
  def('A', { msg: 'İlk sürüm', col: 0, f: f0, at: C('commit', 'station') + 0.2 });
  def('B', { msg: 'Skor tablosu', col: 1, parents: ['A'], f: fB, at: C('snapshot', 'b') + 0.9 });
  def('C', { msg: 'Yıldızlı gökyüzü', col: 2, parents: ['B'], f: fC, at: C('chain', 'c') + 0.6 });
  def('D', { msg: 'Kalkan çizimi', col: 3, lane: 1, line: 'kalkan', parents: ['C'], f: fD, at: C('branch', 'd') + 0.3 });
  def('E', { msg: 'Kalkan süresi', col: 4, lane: 1, line: 'kalkan', parents: ['D'], f: fD, at: C('branch', 'e') + 0.2 });
  def('F', { msg: 'Müzik', col: 5, lane: 1, line: 'ses', parents: ['E'], f: { ...fD, music: 1 }, at: C('merge', 'ses') + 1.2 });
  def('G', { msg: 'Başlık ekranı', col: 5, parents: ['E'], f: { ...fD, title: 1 }, at: C('merge', 'title') + 1.0 });
  def('M', { msg: "Merge 'ses'", col: 6, parents: ['G', 'F'], merge: true, f: { ...fD, music: 1, title: 1 }, at: C('merge', 'mcommit') + 0.2 });
  def('H', { msg: 'hiz = 3', col: 7, lane: 1, line: 'kolay', parents: ['M'], f: { ...fD, music: 1, title: 1, easy: 1 }, at: C('conflict', 'kolay') + 1.2 });
  def('I', { msg: 'hiz = 8', col: 7, parents: ['M'], f: { ...fD, music: 1, title: 1 }, at: C('conflict', 'hiz8') + 1.0 });
  def('R', { msg: "Merge 'kolay-mod'", col: 8, parents: ['I', 'H'], merge: true, f: { ...fD, music: 1, title: 1, easy: 1 }, at: C('resolve', 'done') + 0.3 });
  def('J', { msg: 'Yeni seviye', col: 9, parents: ['R'], f: { ...fD, music: 1, title: 1, level: 1 }, at: S('summary') + 0.05 });
  def('K', { msg: 'Renkli gemi', col: 9, lane: 1, line: 'remote', parents: ['R'], f: { ...fD, music: 1, title: 1, ship2: 1 }, at: S('summary') + 0.05 });
  def('N', { msg: 'Merge (pull)', col: 10, parents: ['J', 'K'], merge: true, f: { ...fD, music: 1, title: 1, level: 1, ship2: 1 }, at: S('summary') + 0.05 });
  const ORDER = Object.keys(K);
  const tFF = C('ff', 'ff');
  const laneOf = (c, t) => ((c.id === 'D' || c.id === 'E') ? 1 - ease(ramp(t, tFF, 1.3)) : c.lane);
  const wpos = (c, t) => [c.col * SX, laneOf(c, t) * SY];
  const lineColor = c => LINE[c.line];
  const blueOver = (c, t) => ((c.id === 'D' || c.id === 'E') ? ease(ramp(t, tFF + 0.3, 1.0)) : 0);
  const short = id => K[id].hash.slice(0, 7);

  // ---------------------------------------------------------------- labels & HEAD
  const LEV = [];
  const lab = (name, t, c) => LEV.push({ name, t, c });
  lab('main', K.A.at, 'A'); lab('main', K.B.at, 'B'); lab('main', K.C.at, 'C');
  lab('main', C('ff', 'slide'), 'D'); lab('main', C('ff', 'slide') + 0.6, 'E');
  lab('main', K.G.at, 'G'); lab('main', K.M.at, 'M'); lab('main', K.I.at, 'I'); lab('main', K.R.at, 'R'); lab('main', K.N.at, 'N');
  lab('kalkan', C('branch', 'create') + 0.3, 'C'); lab('kalkan', K.D.at, 'D'); lab('kalkan', K.E.at, 'E');
  lab('ses', C('merge', 'ses') + 0.3, 'E'); lab('ses', K.F.at, 'F');
  lab('kolay', C('conflict', 'kolay') + 0.3, 'M'); lab('kolay', K.H.at, 'H');
  LEV.sort((a, b) => a.t - b.t);
  const LT = [...new Set(LEV.map(e => e.t))];
  const labelAt = (name, t) => { let c = null; for (const e of LEV) if (e.name === name && e.t <= t) c = e.c; return c; };
  const stackIdx = (name, t) => {
    const c = labelAt(name, t);
    return PRIO.filter(n => PRIO.indexOf(n) < PRIO.indexOf(name) && labelAt(n, t) === c).length;
  };
  const DIM = { kalkan: S('merge'), ses: S('conflict'), kolay: S('remote') };
  const labelsOn = (c, t) => PRIO.filter(n => labelAt(n, t) === c).length;

  const HEV = [
    [C('time', 'here'), { ref: 'main' }], [C('time', 'checkout') + 0.8, { c: 'A' }], [C('time', 'back') + 0.8, { ref: 'main' }],
    [C('branch', 'headFollows'), { ref: 'kalkan' }], [C('ff', 'switch'), { ref: 'main' }],
    [C('merge', 'ses'), { ref: 'ses' }], [C('merge', 'title'), { ref: 'main' }],
    [C('conflict', 'kolay'), { ref: 'kolay' }], [C('conflict', 'hiz8'), { ref: 'main' }],
  ];
  const headAt = t => { let h = null; for (const [ht, v] of HEV) if (ht <= t) h = v; return h; };
  const headCommit = t => { const h = headAt(t); return h ? (h.c || labelAt(h.ref, t)) : labelAt('main', t); };

  // ---------------------------------------------------------------- camera
  const CAM = [
    [0, 'full', 60, -30, 560, 300],
    [C('snapshot', 'b') - 0.6, 'left', 85, -20, 560, 320],
    [S('chain') + 0.3, 'full', 170, 45, 800, 440],
    [S('time') + 0.2, 'left', 170, -25, 680, 380],
    [S('branch') + 0.2, 'full', 300, -10, 980, 440],
    [C('branch', 'zoom') - 0.2, 'full', 340, -80, 250, 150],
    [C('branch', 'headFollows') - 0.4, 'full', 410, 10, 1050, 460],
    [C('ff', 'ff'), 'full', 420, -10, 1000, 420],
    [S('merge') + 0.2, 'left', 800, 20, 820, 420],
    [S('conflict') + 0.2, 'left', 1150, 20, 700, 400],
    [C('resolve', 'done') - 0.3, 'full', 680, 20, 1600, 480],
    [S('summary') + 0.2, 'left', 850, 20, 1950, 520],
    [C('summary', 'final') - 0.2, 'full', 850, 10, 1880, 520],
  ].sort((a, b) => a[0] - b[0]);

  function camera(L, t) {
    const areaRect = a => (a === 'left' ? L.left : L.stage);
    const view = k => {
      const r = areaRect(k[1]);
      return { r, cx: k[2], cy: k[3], s: Math.min(r.w / (k[4] * (L.portrait ? 0.62 : 1)), r.h / k[5]) };
    };
    let i = 0;
    while (i < CAM.length - 1 && CAM[i + 1][0] <= t) i++;
    const cur = view(CAM[i]);
    let v = cur;
    if (i > 0) {
      const prev = view(CAM[i - 1]), u = ease(ramp(t, CAM[i][0], 1.5));
      const r = { x: lerp(prev.r.x, cur.r.x, u), y: lerp(prev.r.y, cur.r.y, u), w: lerp(prev.r.w, cur.r.w, u), h: lerp(prev.r.h, cur.r.h, u) };
      // interpolate in log-scale and keep the world point under the moving centre steady
      const s = Math.exp(lerp(Math.log(prev.s), Math.log(cur.s), u));
      v = { r, cx: lerp(prev.cx, cur.cx, u), cy: lerp(prev.cy, cur.cy, u), s };
    }
    const ox = v.r.x + v.r.w / 2, oy = v.r.y + v.r.h / 2;
    return { s: v.s, P: ([x, y]) => [ox + (x - v.cx) * v.s, oy + (y - v.cy) * v.s], rect: v.r };
  }

  // ---------------------------------------------------------------- the map
  function edgePts(c, p, pi, t) {
    const a = wpos(p, t), b = wpos(c, t), dy = Math.abs(b[1] - a[1]);
    if (dy < 0.5) return [a, b];
    return pi === 0 ? [a, [a[0] + dy, b[1]], b] : [a, [b[0] - dy, a[1]], b];
  }
  function strokePartial(ctx, pts, u) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let left = total * u;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const k = Math.min(1, left / d);
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
      left -= d;
    }
    ctx.stroke();
  }
  const labelFont = s => Math.max(11, 15 * s);
  function labelRaw(name, ta, tp, P, s) {
    const c = labelAt(name, ta);
    if (!c) return null;
    const k = stackIdx(name, ta), f = labelFont(s);
    const p = P(wpos(K[c], tp));
    return [p[0], p[1] - f * 2.3 - k * f * 2.05];
  }
  function labelPos(name, ta, tp, P, s, depth = 0) {
    let i = -1;
    while (i < LT.length - 1 && LT[i + 1] <= ta) i++;
    if (i < 0) return null;
    const target = labelRaw(name, LT[i], tp, P, s);
    if (!target) return null;
    const u = ease(ramp(ta, LT[i], 0.6));
    if (u >= 1 || i === 0 || depth > 8) return target;
    const prev = labelPos(name, LT[i] - 1e-4, tp, P, s, depth + 1);
    return prev ? [lerp(prev[0], target[0], u), lerp(prev[1], target[1], u)] : target;
  }
  function headRaw(h, t, P, s, ctx) {
    const f = labelFont(s);
    if (h.ref) {
      const lp = labelPos(h.ref, t, t, P, s);
      if (!lp) return null;
      ctx.font = `700 ${f}px ${FM}`;
      const w = ctx.measureText(LABEL[h.ref]).width + f * 1.3;
      return [lp[0] - w / 2 - f * 2.6, lp[1]];
    }
    const p = P(wpos(K[h.c], t));
    return [p[0], p[1] - f * 2.3 - labelsOn(h.c, t) * f * 2.05];
  }
  function headPos(t, P, s, ctx) {
    let i = -1;
    while (i < HEV.length - 1 && HEV[i + 1][0] <= t) i++;
    if (i < 0) return null;
    const cur = headRaw(HEV[i][1], t, P, s, ctx);
    const u = ease(ramp(t, HEV[i][0], 0.7));
    if (i === 0 || u >= 1 || !cur) return cur;
    const prev = headRaw(HEV[i - 1][1], t, P, s, ctx);
    return prev ? [lerp(prev[0], cur[0], u), lerp(prev[1], cur[1], u)] : cur;
  }

  function halo(ctx, str, x, y, font, color, w) {
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.strokeStyle = PAPER; ctx.lineWidth = w; ctx.strokeText(str, x, y);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function pill(ctx, x, y, str, bg, f, font = FM) {
    ctx.font = `700 ${f}px ${font}`;
    const w = ctx.measureText(str).width + f * 1.3, h = f * 1.65;
    rr(ctx, x - w / 2, y - h / 2, w, h, h * 0.28); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = WHITE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y + f * 0.06);
    return w;
  }

  function drawMap(ctx, L, t, a) {
    if (a <= 0) return null;
    const cam = camera(L, t), { P, s } = cam;
    ctx.save();
    alpha(ctx, a);
    const vis = ORDER.filter(id => t >= K[id].at - 0.5).map(id => K[id]);
    const lw = clamp(10 * s, 3, 60);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // edges
    for (const c of vis) c.parents.forEach((pid, pi) => {
      const p = K[pid];
      const pts = edgePts(c, p, pi, t).map(P);
      ctx.strokeStyle = pi === 1 ? lineColor(p, t) : lineColor(c, t);
      ctx.lineWidth = lw;
      const du = ease(ramp(t, c.at - 0.5, 0.5));
      strokePartial(ctx, pts, du);
      const bo = pi === 0 ? blueOver(c, t) : 0;
      if (bo > 0) { ctx.save(); ctx.globalAlpha *= bo; ctx.strokeStyle = LINE.main; strokePartial(ctx, pts, du); ctx.restore(); }
    });
    // highlights hooks (drawn under stations)
    extraUnder(ctx, t, P, s);
    // stations
    const showHash = t > C('commit', 'short');
    for (const c of vis) {
      const u = back(ramp(t, c.at, 0.4));
      if (u <= 0) continue;
      const [x, y] = P(wpos(c, t));
      const r = (c.merge ? 17 : 11) * s * u;
      ctx.beginPath(); ctx.arc(x, y, Math.max(r, 0.1), 0, Math.PI * 2);
      ctx.fillStyle = WHITE; ctx.fill();
      ctx.lineWidth = (c.merge ? 6.5 : 5.5) * s * u; ctx.strokeStyle = c.merge ? INK : lineColor(c, t); ctx.stroke();
      if (blueOver(c, t) > 0) { ctx.save(); ctx.globalAlpha *= blueOver(c, t); ctx.strokeStyle = LINE.main; ctx.stroke(); ctx.restore(); }
      const fm = clamp(16 * s, 0, 44), ma = clamp((fm - 9) / 4) * clamp(ramp(t, c.at + 0.1, 0.4));
      if (ma > 0) {
        ctx.globalAlpha = a * ma;
        const below = c.lane === 1 || (c.id === 'D' || c.id === 'E') ? 1 : 1;
        halo(ctx, c.msg, x, y + below * (r + fm * 1.45), `600 ${fm}px ${FB}`, INK, fm * 0.28);
        if (showHash) halo(ctx, short(c.id), x, y + r + fm * 2.55, `500 ${fm * 0.78}px ${FM}`, MUTED, fm * 0.24);
        ctx.globalAlpha = a;
      }
    }
    // HEAD ring ("buradasınız")
    const hc = t >= C('time', 'here') ? headCommit(t) : null;
    if (hc && t < S('remote') || (t >= S('summary') && hc)) {
      const hp = headPos(t, P, s, ctx);
      // ring follows the commit HEAD resolves to, smoothly
      const hcNow = K[hc];
      const [x, y] = P(wpos(hcNow, t));
      const pulse = (t * 1.2) % 1;
      ctx.strokeStyle = RED; ctx.lineWidth = Math.max(2, 3 * s);
      ctx.globalAlpha = a * (1 - pulse);
      ctx.beginPath(); ctx.arc(x, y, (hcNow.merge ? 17 : 11) * s + (8 + pulse * 18) * s, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, (hcNow.merge ? 17 : 11) * s + 7 * s, 0, Math.PI * 2); ctx.stroke();
      if (hp) {
        const f = labelFont(s), ha = ramp(t, C('time', 'here'), 0.4);
        ctx.globalAlpha = a * ha;
        const w = pill(ctx, hp[0], hp[1], 'HEAD', RED, f);
        const h = headAt(t);
        ctx.fillStyle = RED; ctx.beginPath();
        if (h && h.ref) { ctx.moveTo(hp[0] + w / 2 + f * 0.1, hp[1] - f * 0.4); ctx.lineTo(hp[0] + w / 2 + f * 0.75, hp[1]); ctx.lineTo(hp[0] + w / 2 + f * 0.1, hp[1] + f * 0.4); }
        else { ctx.moveTo(hp[0] - f * 0.45, hp[1] + f * 0.8); ctx.lineTo(hp[0], hp[1] + f * 1.4); ctx.lineTo(hp[0] + f * 0.45, hp[1] + f * 0.8); }
        ctx.fill();
        if (t < E('time')) {
          ctx.globalAlpha = a * win(t, C('time', 'here') + 0.8, E('time'));
          text(ctx, 'buradasınız', hp[0], hp[1] - f * 1.5, `italic 600 ${f}px ${FB}`, RED, 'center');
        }
        ctx.globalAlpha = a;
      }
    }
    // branch labels
    for (const name of PRIO) {
      const first = LEV.find(e => e.name === name);
      if (!first || t < first.t) continue;
      const p = labelPos(name, t, t, P, s);
      if (!p) continue;
      const c = K[labelAt(name, t)];
      const f = labelFont(s) * back(ramp(t, first.t, 0.4));
      if (f < 1) continue;
      const k = stackIdx(name, t);
      // stem to the station
      const dim = 1 - 0.65 * ramp(t, DIM[name] || 1e9, 0.8);
      ctx.globalAlpha = a * dim;
      if (k === 0) {
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, 1.6 * s);
        ctx.beginPath(); ctx.moveTo(p[0], p[1] + f * 0.8); ctx.lineTo(p[0], p[1] + f * 2.3 - (c.merge ? 17 : 11) * s - 2 * s); ctx.stroke();
      }
      pill(ctx, p[0], p[1], LABEL[name], name === 'main' ? LINE.main : LINE[name], f);
      ctx.globalAlpha = a;
    }
    extraOver(ctx, t, P, s, L);
    ctx.restore();
    return cam;
  }

  // --- per-chapter additions to the map (under / over)
  function ring(ctx, x, y, r, color, lw, label, f) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash([lw * 1.4, lw * 1.1]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (label) {
      ctx.font = `700 ${f}px ${FB}`;
      const w = ctx.measureText(label).width + f, h = f * 1.6;
      rr(ctx, x - r - w - f * 0.4, y - h / 2 + r * 0.9, w, h, f * 0.3); ctx.fillStyle = color; ctx.fill();
      text(ctx, label, x - r - w / 2 - f * 0.4, y + r * 0.9 + f * 0.36, `700 ${f}px ${FB}`, WHITE, 'center');
    }
  }
  function extraUnder(ctx, t, P, s) {
    // fast-forward: the straight road C → E glows
    const g = win(t, C('ff', 'check'), C('ff', 'ff') + 1.5, 0.5, 0.8);
    if (g > 0) {
      const pts = [K.C, K.D, K.E].map(c => P(wpos(c, t)));
      ctx.save(); ctx.globalAlpha *= g * 0.5; ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = 34 * s;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke(); ctx.restore();
    }
  }
  function extraOver(ctx, t, P, s, L) {
    const f = clamp(14 * s, 11, 30);
    // three-way merge: base and tips
    const mb = win(t, C('merge', 'base'), C('merge', 'mcommit') + 1.2);
    if (mb > 0) {
      ctx.save(); ctx.globalAlpha *= mb;
      const [x, y] = P(wpos(K.E, t)); ring(ctx, x, y, 30 * s, INK, 3 * s, 'ortak ata', f);
      ctx.restore();
    }
    const mt = win(t, C('merge', 'tips'), C('merge', 'mcommit') + 1.2);
    if (mt > 0) {
      ctx.save(); ctx.globalAlpha *= mt;
      for (const id of ['G', 'F']) { const [x, y] = P(wpos(K[id], t)); ring(ctx, x, y, 26 * s, LINE[K[id].line], 3 * s); }
      ctx.restore();
    }
    // conflict: the merge that cannot be made yet
    const cg = win(t, C('conflict', 'merge'), C('resolve', 'done') + 0.2, 0.5, 0.3);
    if (cg > 0) {
      ctx.save(); ctx.globalAlpha *= cg;
      const [x, y] = P([8 * SX, 0]);
      const hot = t > C('conflict', 'stop') ? 1 : 0;
      ctx.strokeStyle = hot ? RED : MUTED; ctx.lineWidth = 3 * s; ctx.setLineDash([6 * s, 6 * s]);
      ctx.beginPath(); ctx.moveTo(...P(wpos(K.I, t))); ctx.lineTo(x, y); ctx.moveTo(...P(wpos(K.H, t))); ctx.lineTo(x - SY * s, P(wpos(K.H, t))[1]); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, 17 * s, 0, Math.PI * 2); ctx.fillStyle = hot ? RED : WHITE; ctx.fill();
      ctx.strokeStyle = hot ? RED : MUTED; ctx.stroke();
      text(ctx, '?', x, y + 7 * s, `800 ${20 * s}px ${FB}`, hot ? WHITE : MUTED, 'center');
      ctx.restore();
    }
    // the first station keeps its photo
    const ph = win(t, C('commit', 'station') + 0.3, E('commit') + 0.3, 0.6, 0.6);
    if (ph > 0) {
      const [x, y] = P(wpos(K.A, t));
      const pw = 96 * s, u = eout(ramp(t, C('commit', 'station') + 0.3, 0.7));
      ctx.save(); ctx.globalAlpha *= ph;
      ctx.strokeStyle = 'rgba(27,31,42,.35)'; ctx.lineWidth = 1.5 * s; ctx.setLineDash([4 * s, 4 * s]);
      ctx.beginPath(); ctx.moveTo(x + 16 * s, y - 8 * s); ctx.lineTo(x + 70 * s, y - 40 * s); ctx.stroke(); ctx.setLineDash([]);
      ctx.translate(x + 70 * s + pw / 2, y - 40 * s - pw * 0.5 + (1 - u) * 20 * s); ctx.rotate(0.05); ctx.scale(u, u);
      polaroid(ctx, -pw / 2, -pw * 0.56, pw, f0, t, 'İlk sürüm');
      ctx.restore();
    }
    // chain chapter: each commit carries its parent's id
    chainCards(ctx, t, P, s);
  }

  // ---------------------------------------------------------------- chain cards
  const tamperHash = { A: hashOf('tampered-A'), B: hashOf('tampered-B'), C: hashOf('tampered-C') };
  function chainCards(ctx, t, P, s) {
    const a = win(t, C('chain', 'parent'), E('chain') + 0.2, 0.6, 0.6);
    if (a <= 0) return;
    const tc = C('chain', 'cascade'), tc2 = C('chain', 'cascade2');
    const mid = (tc + tc2) / 2;
    const idT = { A: tc + 0.3, B: mid, C: tc2 + 0.5 }, parT = { B: mid - 0.7, C: tc2 };
    const ids = ['A', 'B', 'C'];
    const f = 12.5 * s, cw = 134 * s, pad = 9 * s;
    const card = id => { const [x, y] = P(wpos(K[id], t)); return { x: x - cw / 2, y: y + 66 * s, h: (id === 'A' ? 94 : 66) * s }; };
    ctx.save(); ctx.globalAlpha *= a;
    // arrows first: from a card's "ebeveyn" value to the previous card's "kimlik"
    ids.forEach((id, i) => {
      if (!i) return;
      const cur = card(id), prv = card(ids[i - 1]);
      const ar = eout(ramp(t, C('chain', 'parent') + 0.5 + i * 0.35, 0.6));
      if (ar <= 0) return;
      const hot = t > parT[id] ? RED : LINE.main;
      const pulse = t > C('chain', 'chain') && t < C('chain', 'chain') + 3 ? 0.5 + 0.5 * Math.sin((t - C('chain', 'chain')) * 8 - i * 2) : 0;
      const sx = cur.x, sy = cur.y + 48 * s, ex = prv.x + cw, ey = prv.y + 22 * s;
      ctx.strokeStyle = hot; ctx.lineWidth = (2.4 + pulse * 2.2) * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy);
      const qx = lerp(sx, ex, 0.5) - 2 * s, qy = lerp(sy, ey, 0.5);
      ctx.quadraticCurveTo(qx - 14 * s * ar, qy, lerp(sx, ex, ar), lerp(sy, ey, ar)); ctx.stroke();
      if (ar > 0.95) {
        ctx.fillStyle = hot; ctx.beginPath();
        ctx.moveTo(ex - 1 * s, ey); ctx.lineTo(ex + 8 * s, ey - 5 * s); ctx.lineTo(ex + 8 * s, ey + 5 * s); ctx.fill();
      }
    });
    for (const [i, id] of ids.entries()) {
      const { x: cx, y: cy, h: chh } = card(id);
      const pop = eout(ramp(t, C('chain', 'parent') + i * 0.25, 0.5));
      ctx.save(); ctx.translate(0, (1 - pop) * 14 * s); ctx.globalAlpha *= pop;
      rr(ctx, cx, cy, cw, chh, 8 * s); ctx.fillStyle = WHITE; ctx.fill();
      const idChanged = t > idT[id];
      ctx.lineWidth = 2 * s; ctx.strokeStyle = idChanged ? RED : 'rgba(27,31,42,.35)'; ctx.stroke();
      text(ctx, 'kimlik', cx + pad, cy + 26 * s, `600 ${f}px ${FB}`, MUTED);
      const hid = idChanged ? rolled(tamperHash[id], t, idT[id], 0.7).slice(0, 7) : short(id);
      text(ctx, hid, cx + cw - pad, cy + 26 * s, `700 ${f}px ${FM}`, idChanged ? RED : INK, 'right');
      text(ctx, 'ebeveyn', cx + pad, cy + 52 * s, `600 ${f}px ${FB}`, MUTED);
      const parent = ids[i - 1];
      const pChanged = parent && t > parT[id];
      text(ctx, parent ? (pChanged ? tamperHash[parent].slice(0, 7) : short(parent)) : '—', cx + cw - pad, cy + 52 * s, `700 ${f}px ${FM}`, pChanged ? RED : INK, 'right');
      if (id === 'A') {
        // the one letter that gets changed
        const tt = C('chain', 'tamper');
        const flip = t > tt + 1.2;
        ctx.fillStyle = '#EFEAE0'; rr(ctx, cx + pad * 0.6, cy + 62 * s, cw - pad * 1.2, 24 * s, 5 * s); ctx.fill();
        const fnt = `700 ${f}px ${FM}`;
        ctx.font = fnt;
        const base = '"Yıldız Avc', last = flip ? 'i' : 'ı', end = 'sı"';
        const tw = ctx.measureText(base + last + end).width;
        let xx = cx + cw / 2 - tw / 2;
        const yy = cy + 79 * s;
        text(ctx, base, xx, yy, fnt, INK); xx += ctx.measureText(base).width;
        const lx = xx + ctx.measureText(last).width / 2;
        text(ctx, last, xx, yy, fnt, flip ? RED : INK); xx += ctx.measureText(last).width;
        text(ctx, end, xx, yy, fnt, INK);
        if (t > tt && t < tt + 3) {
          ctx.strokeStyle = RED; ctx.lineWidth = 2 * s;
          ctx.beginPath(); ctx.arc(lx, yy - 4 * s, 10 * s * (1 + 0.15 * Math.sin(t * 9)), 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
    }
    // stamp
    const st = win(t, C('chain', 'safe'), E('chain') + 0.2, 0.3, 0.5);
    if (st > 0) {
      const [x, y] = P(wpos(K.C, t));
      const k = lerp(1.5, 1, eout(ramp(t, C('chain', 'safe'), 0.35)));
      ctx.save(); ctx.globalAlpha *= st; ctx.translate(x + 150 * s, y - 60 * s); ctx.rotate(-0.12); ctx.scale(k, k);
      ctx.strokeStyle = RED; ctx.lineWidth = 3.5 * s;
      ctx.font = `800 ${24 * s}px ${FS}`;
      const w = ctx.measureText('FARK EDİLİR!').width + 26 * s;
      rr(ctx, -w / 2, -22 * s, w, 44 * s, 6 * s); ctx.stroke();
      text(ctx, 'FARK EDİLİR!', 0, 9 * s, `800 ${24 * s}px ${FS}`, RED, 'center');
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- dioramas
  const P2 = (L, a, b) => (L.portrait ? b : a);

  // 1. intro: scattered "final" files → one line of stations
  const FILES = ['odev_son.docx', 'odev_son2.docx', 'odev_GERCEKTEN_son.docx', 'odev_son_bunu_kullan.docx', 'odev_eski.docx', 'odev_Can_duzeltti.docx', 'odev_son (1).docx', 'odev_son_hocaya.docx', 'odev_FINAL_v3.docx'];
  const MOMENTS = ['İlk taslak', 'Giriş yazıldı', 'Kaynaklar', 'Grafik eklendi', 'Can düzeltti', 'Yazım hataları', 'Sonuç yazıldı', 'Hocaya gitti', 'Son dokunuş'];
  function intro(ctx, L, t) {
    const a = win(t, S('intro'), E('intro') + 0.2, 0.3, 0.7);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    const [dw, dh] = P2(L, [1200, 560], [600, 860]);
    box(ctx, L.stage, dw, dh);
    const r = rand(3);
    const tf = C('intro', 'files'), tq = C('intro', 'q'), to = C('intro', 'order'), tg = C('intro', 'git'), tm = C('intro', 'map');
    const iw = P2(L, 84, 70), ih = iw * 1.25;
    const lineY = P2(L, 440, 0), n = FILES.length;
    // the line (after "map")
    const lu = ease(ramp(t, tm, 1.3));
    const at = i => (L.portrait ? [150, 210 + i * 76] : [90 + i * 127, lineY]);
    if (lu > 0) {
      ctx.strokeStyle = LINE.main; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(...at(0));
      const e0 = at(0), e1 = at(n - 1);
      ctx.lineTo(lerp(e0[0], e1[0], lu), lerp(e0[1], e1[1], lu)); ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      // jittered grid so the mess stays readable
      const gx = L.portrait ? i % 2 : i % 5, gy = L.portrait ? Math.floor(i / 2) : Math.floor(i / 5);
      const sx = P2(L, 70 + gx * 225 + (gy ? 110 : 0) + r() * 60, 70 + gx * 270 + r() * 60), sy = P2(L, 40 + gy * 210 + r() * 50, 130 + gy * 150 + r() * 40), rot = (r() - 0.5) * 0.6;
      const td = tf + i * 0.16;
      if (t < td) continue;
      const drop = back(ramp(t, td, 0.45));
      const ou = ease(ramp(t, to + i * 0.05, 1.1));
      const [lx, ly] = at(i);
      const x = lerp(sx, lx - iw / 2, ou), y = lerp(sy - (1 - drop) * 120, ly - ih - 34, ou);
      const shrink = 1 - ease(ramp(t, tm + 0.25 + i * 0.1, 0.5));
      ctx.save();
      ctx.globalAlpha *= clamp(drop * 2);
      ctx.translate(x + iw / 2, y + ih / 2); ctx.rotate(rot * (1 - ou)); ctx.scale(shrink, shrink);
      if (shrink > 0.02) fileIcon(ctx, -iw / 2, -ih / 2, iw, ih, i % 3 === 0 ? LINE.main : i % 3 === 1 ? '#5A7BE0' : '#8FA6EE');
      ctx.restore();
      // station replaces the icon
      const st = back(ramp(t, tm + 0.45 + i * 0.1, 0.4));
      if (st > 0) {
        ctx.beginPath(); ctx.arc(lx, ly, 13 * st, 0, Math.PI * 2); ctx.fillStyle = WHITE; ctx.fill();
        ctx.lineWidth = 6 * st; ctx.strokeStyle = LINE.main; ctx.stroke();
      }
      // name: under the icon while scattered, a slanted station name on the line
      const nameY = lerp(y + ih + 26, ly - 30, ou);
      const moment = ramp(t, tm + 1.6 + i * 0.12, 0.5);
      const fnt = P2(L, 19, 20);
      ctx.save();
      if (L.portrait) {
        ctx.translate(lerp(x + iw / 2, lx + 34, ou), lerp(y + ih + 24, ly + 7, ou));
        ctx.textAlign = 'left';
      } else {
        ctx.translate(lerp(x + iw / 2, lx - 4, ou), nameY);
        ctx.rotate(-0.62 * ou);
      }
      ctx.font = `600 ${fnt}px ${FB}`;
      const nm = FILES[i], w0 = ctx.measureText(nm).width;
      const dx = L.portrait ? -w0 / 2 * (1 - ou) : -w0 / 2 * (1 - ou);
      ctx.globalAlpha *= clamp(drop * 2) * (1 - clamp(moment * 3));
      text(ctx, nm, dx, 0, `600 ${fnt}px ${FB}`, INK, 'left');
      ctx.globalAlpha = a * clamp(moment * 2 - 1);
      text(ctx, MOMENTS[i], 0, 0, `700 ${fnt + 2}px ${FB}`, INK, 'left');
      ctx.restore();
    }
    // question marks
    const qa = win(t, tq, to + 0.3, 0.3, 0.4);
    if (qa > 0) {
      const qs = P2(L, [[260, 110], [640, 70], [980, 150], [480, 260]], [[120, 180], [460, 300], [200, 560], [470, 690]]);
      qs.forEach(([x, y], i) => {
        ctx.globalAlpha = a * qa * clamp(ramp(t, tq + i * 0.5, 0.3));
        text(ctx, '?', x, y + Math.sin(t * 3 + i) * 8, `800 ${P2(L, 90, 70)}px ${FS}`, RED, 'center');
      });
      ctx.globalAlpha = a;
    }
    // the name of the tool
    const ga = back(ramp(t, tg, 0.5));
    if (ga > 0) {
      const [gx, gy] = P2(L, [600, 90], [300, 60]);
      ctx.save(); ctx.translate(gx, gy); ctx.scale(ga, ga);
      ctx.font = `800 ${P2(L, 84, 70)}px ${FS}`;
      const w = ctx.measureText('Git').width + 60;
      rr(ctx, -w / 2, -58, w, 104, 18); ctx.fillStyle = INK; ctx.fill();
      text(ctx, 'Git', 0, 26, `800 ${P2(L, 84, 70)}px ${FS}`, PAPER, 'center');
      ctx.restore();
      ctx.globalAlpha = a * ramp(t, tg + 0.5, 0.5);
      text(ctx, 'sürüm kontrol sistemi', gx, gy + P2(L, 82, 78), `600 ${P2(L, 24, 22)}px ${FB}`, MUTED, 'center');
      ctx.globalAlpha = a;
    }
    ctx.restore();
  }

  // 2. history
  function history(ctx, L, t) {
    const a = win(t, S('history') + 0.1, E('history') + 0.2, 0.5, 0.6);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    const [dw, dh] = P2(L, [1200, 560], [600, 860]);
    box(ctx, L.stage, dw, dh);
    const tS = C('history', 'survey'), tG = C('history', 'github');
    // phase 1: 2005, the kernel and four days in April
    const p1 = win(t, S('history'), tS + 0.2, 0.3, 0.6);
    if (p1 > 0) {
      ctx.globalAlpha = a * p1;
      const y5 = ramp(t, C('history', 'y2005'), 0.6);
      ctx.save(); ctx.globalAlpha *= y5;
      const [yx, yy, fs] = P2(L, [60, 330, 230], [300, 190, 170]);
      text(ctx, '2005', yx, yy - (1 - eout(y5)) * 30, `800 ${fs}px ${FS}`, INK, L.portrait ? 'center' : 'left');
      ctx.fillStyle = LINE.main; ctx.fillRect(L.portrait ? 120 : 66, yy + 22, (L.portrait ? 360 : 400) * eout(y5), 12);
      ctx.restore();
      // the Linux kernel: thousands of volunteers
      const la = ramp(t, C('history', 'linux'), 0.6);
      if (la > 0) {
        const [bx, by, bw, bh] = P2(L, [560, 30, 600, 220], [40, 250, 520, 250]);
        ctx.globalAlpha = a * p1 * la;
        rr(ctx, bx, by, bw, bh, 16); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = 'rgba(27,31,42,.2)'; ctx.lineWidth = 2; ctx.stroke();
        text(ctx, 'Linux çekirdeği', bx + 24, by + 44, `700 ${30}px ${FS}`, INK);
        text(ctx, 'binlerce gönüllü geliştirici', bx + 24, by + 74, `500 20px ${FB}`, MUTED);
        const rr2 = rand(11);
        const cnt = Math.floor(260 * eout(ramp(t, C('history', 'linux'), 2.2)));
        for (let i = 0; i < cnt; i++) {
          const dx = bx + 24 + rr2() * (bw - 48), dy = by + 96 + rr2() * (bh - 116);
          ctx.fillStyle = [LINE.main, LINE.kalkan, LINE.ses, LINE.kolay][i % 4];
          ctx.beginPath(); ctx.arc(dx, dy, 3.2, 0, Math.PI * 2); ctx.fill();
        }
        // losing the free licence
        const lo = back(ramp(t, C('history', 'linux') + 3.2, 0.4));
        if (lo > 0) {
          ctx.save(); ctx.translate(bx + bw - 140, by + 50); ctx.rotate(0.06); ctx.scale(lo, lo);
          rr(ctx, -118, -24, 236, 48, 8); ctx.fillStyle = RED; ctx.fill();
          text(ctx, 'ücretsiz lisans bitti', 0, 8, `700 22px ${FB}`, WHITE, 'center');
          ctx.restore();
        }
      }
      // calendar
      const tile = (x, y, day, line1, line2, t0) => {
        const u = back(ramp(t, t0, 0.5));
        if (u <= 0) return;
        ctx.save(); ctx.translate(x + 120, y + 90); ctx.scale(u, u); ctx.translate(-120, -90);
        rr(ctx, 0, 0, 240, 180, 14); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.save(); rr(ctx, 0, 0, 240, 44, 14); ctx.clip(); ctx.fillStyle = RED; ctx.fillRect(0, 0, 240, 44); ctx.restore();
        text(ctx, 'NİSAN 2005', 120, 31, `700 22px ${FS}`, WHITE, 'center');
        text(ctx, day, 120, 116, `800 70px ${FS}`, INK, 'center');
        text(ctx, line1, 120, 146, `600 17px ${FB}`, INK, 'center');
        text(ctx, line2, 120, 168, `600 17px ${FB}`, MUTED, 'center');
        ctx.restore();
      };
      const [c1x, c1y, c2x, c2y] = P2(L, [580, 330, 900, 330], [30, 560, 330, 560]);
      const tl1 = C('history', 'linus'), tl2 = C('history', 'self');
      ctx.globalAlpha = a * p1;
      tile(c1x, c1y - 60, '3', 'Linus Torvalds', 'yazmaya başlıyor', tl1);
      tile(c2x, c2y - 60, '7', 'Git kendi kodunu', 'Git ile saklıyor', tl2);
      const ar = ramp(t, tl2 + 0.6, 0.6);
      if (ar > 0) {
        ctx.globalAlpha = a * p1 * ar;
        ctx.strokeStyle = LINE.main; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(c1x + 250, c1y + 30); ctx.lineTo(c1x + 250 + (c2x - c1x - 260) * eout(ar), c1y + 30); ctx.stroke();
        text(ctx, '4 gün', (c1x + c2x + 240) / 2, c1y + 10, `700 26px ${FS}`, LINE.main, 'center');
      }
    }
    // phase 2: more than nine in ten developers
    const p2 = win(t, tS, tG + 0.2, 0.5, 0.5);
    if (p2 > 0) {
      ctx.globalAlpha = a * p2;
      const [gx, gy, cell] = P2(L, [150, 60, 44], [80, 60, 44]);
      const fill = Math.floor(93 * eout(ramp(t, tS + 0.4, 2.2)));
      for (let i = 0; i < 100; i++) {
        const x = gx + (i % 10) * cell, y = gy + Math.floor(i / 10) * cell;
        ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.36, 0, Math.PI * 2);
        ctx.fillStyle = i < fill ? LINE.main : GRID; ctx.fill();
      }
      const [tx, ty] = P2(L, [650, 230], [300, 590]);
      const al = L.portrait ? 'center' : 'left';
      text(ctx, `%${fill}`, tx, ty, `800 150px ${FS}`, INK, al);
      text(ctx, 'geliştirici Git kullanıyor', tx, ty + 50, `600 30px ${FB}`, INK, al);
      text(ctx, '2022 Stack Overflow geliştirici anketi,', tx, ty + 96, `500 21px ${FB}`, MUTED, al);
      text(ctx, '70 000’den fazla katılımcı', tx, ty + 124, `500 21px ${FB}`, MUTED, al);
    }
    // phase 3: Git ≠ GitHub
    const p3 = ramp(t, tG, 0.5);
    if (p3 > 0) {
      ctx.globalAlpha = a * p3;
      const card = (x, y, w, h, title, sub, icon, t0) => {
        const u = eout(ramp(t, t0, 0.6));
        if (u <= 0) return;
        ctx.save(); ctx.globalAlpha *= u; ctx.translate(0, (1 - u) * 30);
        rr(ctx, x, y, w, h, 18); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        icon(x + w / 2, y + 170);
        text(ctx, title, x + w / 2, y + 250, `800 44px ${FS}`, INK, 'center');
        wrap(ctx, sub, x + w / 2, y + 290, w - 60, 28, `500 22px ${FB}`, MUTED, 'center');
        ctx.restore();
      };
      const [ax, ay, bx2, by2, w, h] = P2(L, [80, 60, 700, 60, 420, 380], [60, 20, 60, 450, 480, 380]);
      card(ax, ay, w, h, 'Git', 'senin bilgisayarında çalışan araç', (x, y) => { laptop(ctx, x, y, 170); text(ctx, 'git', x, y - 40, `800 40px ${FS}`, INK, 'center'); }, tG);
      card(bx2, by2, w, h, 'GitHub, GitLab…', 'Git depolarını internette saklayan hizmetler', (x, y) => { server(ctx, x, y, 170, t); }, C('history', 'hub'));
      const ne = ramp(t, C('history', 'hub') + 0.3, 0.4);
      ctx.globalAlpha = a * p3 * ne;
      const [nx, ny] = P2(L, [600, 280], [300, 440]);
      text(ctx, '≠', nx, ny, `800 110px ${FB}`, RED, 'center');
    }
    ctx.restore();
  }

  // 3. repository: the project folder and the hidden .git
  function repo(ctx, L, t) {
    const a = win(t, S('repo') + 0.1, E('repo') + 0.2, 0.5, 0.6);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    const [dw, dh] = P2(L, [1200, 560], [600, 900]);
    box(ctx, L.stage, dw, dh);
    const tg = C('repo', 'game');
    // the game window
    const [gx, gy, gw] = P2(L, [650, 40, 500], [60, 10, 480]);
    const gu = eout(ramp(t, S('repo') + 0.3, 0.7));
    ctx.save(); ctx.globalAlpha *= gu; ctx.translate(0, (1 - gu) * 20);
    rr(ctx, gx, gy, gw, gw * 0.72 + 44, 14); ctx.fillStyle = INK; ctx.fill();
    text(ctx, 'Yıldız Avcısı', gx + 20, gy + 30, `700 22px ${FB}`, PAPER);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(gx + gw - 26 - i * 22, gy + 22, 6, 0, Math.PI * 2); ctx.fillStyle = ['#FF6B6B', '#FFD23F', '#7BD88F'][i]; ctx.fill(); }
    game(ctx, gx + 8, gy + 44, gw - 16, gw * 0.72 - 8, f0, t);
    const ta = ramp(t, tg, 0.5);
    ctx.globalAlpha *= ta;
    text(ctx, 'YILDIZ AVCISI', gx + gw / 2, gy + 44 + gw * 0.46, `800 ${gw * 0.1}px ${FS}`, '#FFFFFF', 'center');
    ctx.restore();
    // Elif and Can
    const [px, py] = P2(L, [720, 500], [150, 425]);
    [['Elif', LINE.kalkan], ['Can', LINE.ses]].forEach(([nm, col], i) => {
      const u = back(ramp(t, S('repo') + 0.8 + i * 0.25, 0.5));
      if (u <= 0) return;
      ctx.save(); ctx.translate(px + i * 190, py); ctx.scale(u, u);
      person(ctx, 0, 10, 58, col);
      text(ctx, nm, 42, 8, `700 30px ${FS}`, INK, 'left');
      ctx.restore();
    });
    // folder window
    const [fx, fy, fw] = P2(L, [40, 50, 540], [40, 480, 520]);
    const fu = eout(ramp(t, C('repo', 'folder') - 0.2, 0.6));
    if (fu > 0) {
      ctx.save(); ctx.globalAlpha *= fu;
      const dotA = eout(ramp(t, C('repo', 'dotgit'), 0.6));
      const rows = 3 + dotA;
      const fh = 80 + rows * 78 + 20;
      rr(ctx, fx, fy, fw, fh, 14); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); rr(ctx, fx, fy, fw, 54, 14); ctx.clip(); ctx.fillStyle = '#E9E3D6'; ctx.fillRect(fx, fy, fw, 54); ctx.restore();
      text(ctx, '📁  yildiz-avcisi/', fx + 22, fy + 36, `700 24px ${FM}`, INK);
      const files = [['index.html', 'sayfa'], ['stil.css', 'renkler'], ['oyun.js', 'oyunun kodu']];
      files.forEach(([nm, what], i) => {
        const ru = eout(ramp(t, C('repo', 'folder') + i * 0.25, 0.5));
        const y = fy + 70 + (i + dotA) * 78;
        ctx.save(); ctx.globalAlpha *= ru;
        fileIcon(ctx, fx + 26, y + 6, 44, 56, [LINE.kalkan, LINE.kolay, LINE.main][i], 3);
        text(ctx, nm, fx + 92, y + 34, `700 26px ${FM}`, INK);
        text(ctx, what, fx + 92, y + 60, `500 19px ${FB}`, MUTED);
        ctx.restore();
      });
      if (dotA > 0) {
        const y = fy + 70;
        const mem = ramp(t, C('repo', 'memory'), 0.6);
        ctx.save(); ctx.globalAlpha *= dotA;
        rr(ctx, fx + 16, y, fw - 32, 70, 10);
        ctx.fillStyle = mix('#F3EFE6', '#DCE5FB', mem); ctx.fill();
        ctx.setLineDash([8, 6]); ctx.strokeStyle = LINE.main; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
        // a tiny metro line inside the vault
        ctx.strokeStyle = LINE.main; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(fx + 36, y + 35); ctx.lineTo(fx + 80, y + 35); ctx.stroke();
        [36, 58, 80].forEach(xx => { ctx.beginPath(); ctx.arc(fx + xx, y + 35, 6, 0, Math.PI * 2); ctx.fillStyle = WHITE; ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); });
        text(ctx, '.git/', fx + 104, y + 44, `700 28px ${FM}`, LINE.main);
        ctx.globalAlpha *= 1 - mem;
        text(ctx, 'gizli', fx + fw - 34, y + 43, `italic 600 21px ${FB}`, MUTED, 'right');
        ctx.globalAlpha = a * fu * dotA * mem;
        text(ctx, 'bütün geçmiş burada', fx + fw - 34, y + 43, `700 21px ${FB}`, LINE.main, 'right');
        ctx.restore();
      }
      // no internet needed
      const ni = ramp(t, C('repo', 'memory') + 3.2, 0.5);
      if (ni > 0) {
        ctx.globalAlpha = a * fu * ni;
        const [nx, ny] = [fx + 26, fy + fh + 44];
        text(ctx, '✓ internet gerekmez: depo senin bilgisayarında', nx, ny, `600 21px ${FB}`, LINE.ses);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 4–5. three areas, the shutter, the photo, the id
  function zones(ctx, L, t) {
    const tst = C('commit', 'station');
    const a = win(t, S('stage') + 0.1, tst + 0.7, 0.5, 0.7);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    const [dw, dh] = P2(L, [1200, 590], [600, 980]);
    box(ctx, L.stage, dw, dh);
    const zoneRect = i => P2(L, [30 + i * 390, 20, 360, 470], [10, 10 + i * 290, 580, 270]);
    const names = [['Çalışma klasörü', 'masa'], ['Hazırlık alanı', 'sahne · staging'], ['Depo', 'albüm · .git']];
    const zt = [C('stage', 'work'), C('stage', 'stage'), C('stage', 'repo')];
    const col = [INK, LINE.kalkan, LINE.main];
    names.forEach(([n1, n2], i) => {
      const u = eout(ramp(t, zt[i] - 0.1, 0.6));
      if (u <= 0) return;
      const [x, y, w, h] = zoneRect(i);
      ctx.save(); ctx.globalAlpha *= u; ctx.translate(0, (1 - u) * 20);
      rr(ctx, x, y, w, h, 18); ctx.fillStyle = 'rgba(255,253,248,.75)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = col[i]; ctx.stroke();
      ctx.fillStyle = col[i]; ctx.beginPath(); ctx.arc(x + 34, y + 38, 17, 0, Math.PI * 2); ctx.fill();
      text(ctx, String(i + 1), x + 34, y + 47, `800 24px ${FS}`, WHITE, 'center');
      text(ctx, n1, x + 62, y + 48, `700 32px ${FS}`, INK);
      text(ctx, n2, x + w - 18, y + 46, `italic 500 19px ${FB}`, MUTED, 'right');
      ctx.restore();
    });
    // stage frame (kadraj) corners
    const [sx, sy, sw, sh] = zoneRect(1);
    const frameA = ramp(t, zt[1], 0.6);
    const flash = C('commit', 'flash');
    if (frameA > 0 && t < flash + 0.3) {
      const choose = t > C('stage', 'choose') && t < C('stage', 'choose') + 2.5 ? 0.5 + 0.5 * Math.sin((t - C('stage', 'choose')) * 7) : 0;
      ctx.save(); ctx.globalAlpha *= frameA;
      ctx.strokeStyle = LINE.kalkan; ctx.lineWidth = 5 + choose * 3; ctx.lineCap = 'round';
      const fx = sx + 22, fy = sy + 72, fw = sw - 44, fh = sh - 92, c = 30;
      [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]].forEach(([x, y, dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(x + dx * c, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * c); ctx.stroke();
      });
      ctx.restore();
    }
    // file chips
    const FILEZ = [['index.html', LINE.kalkan], ['stil.css', LINE.kolay], ['oyun.js', LINE.main], ['notlar.txt', MUTED]];
    const tadd = C('stage', 'add');
    const slot = (zone, k) => {
      const [x, y, w] = zoneRect(zone);
      return L.portrait ? [x + 24 + (k % 2) * 280, y + 90 + Math.floor(k / 2) * 76] : [x + 30, y + 92 + k * 88];
    };
    const chipW = P2(L, 300, 262);
    FILEZ.forEach(([nm, c], k) => {
      const appear = eout(ramp(t, zt[0] + 0.3 + k * 0.15, 0.5));
      if (appear <= 0) return;
      let p = slot(0, k);
      if (k < 3) {
        const mu = ease(ramp(t, tadd + 0.4 + k * 0.3, 0.8));
        const q = slot(1, k);
        p = [lerp(p[0], q[0], mu), lerp(p[1], q[1], mu) - Math.sin(mu * Math.PI) * 50];
        if (t > flash) return;
      }
      ctx.save(); ctx.globalAlpha *= appear;
      const jig = k === 3 && t > C('stage', 'notes') && t < C('stage', 'notes') + 1.4 ? Math.sin((t - C('stage', 'notes')) * 26) * 4 : 0;
      rr(ctx, p[0] + jig, p[1], chipW, 64, 10); ctx.fillStyle = WHITE; ctx.fill();
      ctx.strokeStyle = 'rgba(27,31,42,.25)'; ctx.lineWidth = 2; ctx.stroke();
      fileIcon(ctx, p[0] + jig + 14, p[1] + 9, 36, 46, c, 3);
      text(ctx, nm, p[0] + jig + 66, p[1] + 41, `700 23px ${FM}`, k === 3 ? MUTED : INK);
      ctx.restore();
    });
    // shutter flash → polaroid flies to the album
    if (t > flash) {
      const [ax, ay, aw, ah] = zoneRect(2);
      const pw = P2(L, 170, 150);
      const from = P2(L, [sx + sw / 2 - pw / 2, sy + 90], [sx + sw / 2 - pw / 2 - 150, sy + 60]);
      const to = P2(L, [ax + aw / 2 - pw / 2, ay + 80], [ax + 30, ay + 64]);
      const fu = ease(ramp(t, flash + 0.5, 1.0));
      const x = lerp(from[0], to[0], fu), y = lerp(from[1], to[1], fu) - Math.sin(fu * Math.PI) * 60;
      ctx.save(); ctx.translate(x + pw / 2, y + pw * 0.56); ctx.rotate(lerp(-0.08, 0.04, fu)); ctx.translate(-pw / 2, -pw * 0.56);
      polaroid(ctx, 0, 0, pw, f0, t, 'İlk sürüm');
      ctx.restore();
      // the note on the back
      const mt = ramp(t, C('commit', 'meta'), 0.5);
      if (mt > 0) {
        ctx.save(); ctx.globalAlpha *= mt;
        const [nx, ny] = P2(L, [ax + 24, ay + 290], [ax + 210, ay + 60]);
        const rows = [['yazar', 'Elif'], ['zaman', '25 Eylül, 14:02'], ['mesaj', 'İlk sürüm'], ['ebeveyn', 'yok (ilk)']];
        rows.forEach(([k, v], i) => {
          const ru = ramp(t, C('commit', 'meta') + i * 0.45, 0.4);
          ctx.globalAlpha = a * mt * ru;
          text(ctx, k, nx, ny + i * 38, `600 19px ${FB}`, MUTED);
          text(ctx, v, nx + 96, ny + i * 38, `700 21px ${FB}`, INK);
        });
        ctx.restore();
      }
    }
    // the id: 40 hex characters, then the short 7
    const th = C('commit', 'hash');
    if (t > th) {
      const hu = ramp(t, th, 0.4);
      const h = rolled(K.A.hash, t, th + 0.2, 1.6) || '';
      const sh = ramp(t, C('commit', 'short'), 0.6);
      ctx.save(); ctx.globalAlpha *= hu;
      const fs2 = P2(L, 29, 27);
      ctx.font = `700 ${fs2}px ${FM}`;
      const cw = ctx.measureText('0').width;
      const lines = L.portrait ? [h.slice(0, 20), h.slice(20)] : [h];
      const [hx, hy] = P2(L, [600, 552], [300, 960]);
      lines.forEach((ln, li) => {
        const x0 = hx - (L.portrait ? 20 : 40) * cw / 2, y0 = hy - (lines.length - 1 - li) * fs2 * 1.3;
        for (let i = 0; i < ln.length; i++) {
          const gi = li * 20 + i;
          ctx.globalAlpha = a * hu * (gi < 7 ? 1 : 1 - 0.7 * sh);
          text(ctx, ln[i], x0 + i * cw, y0, `700 ${fs2}px ${FM}`, gi < 7 && sh > 0 ? LINE.main : INK);
        }
        if (li === 0 && sh > 0) {
          ctx.globalAlpha = a * sh; ctx.strokeStyle = LINE.main; ctx.lineWidth = 3;
          rr(ctx, x0 - 8, y0 - fs2 * 0.95, cw * 7 + 16, fs2 * 1.35, 8); ctx.stroke();
        }
      });
      ctx.globalAlpha = a * hu;
      text(ctx, P2(L, 'kimlik · 40 karakter', 'kimlik · 40 karakter'), hx, hy - (L.portrait ? 2 : 1) * fs2 * 1.3 - 4, `600 19px ${FB}`, MUTED, 'center');
      ctx.restore();
    }
    ctx.restore();
    // the white flash over everything
    const fl = 1 - ramp(t, flash, 0.55);
    if (t > flash && fl > 0) { ctx.save(); ctx.globalAlpha = fl * 0.9; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, L.W, L.H); ctx.restore(); }
  }

  // 6. snapshot: full photos, shared objects
  function snapshot(ctx, L, t) {
    const a = win(t, S('snapshot') + 0.2, E('snapshot') + 0.2, 0.6, 0.6);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    box(ctx, L.right, 540, 570);
    const tb = C('snapshot', 'b'), tmy = C('snapshot', 'myth'), ttr = C('snapshot', 'truth'), twa = C('snapshot', 'waste'), tsa = C('snapshot', 'same'), tli = C('snapshot', 'link'), tne = C('snapshot', 'new');
    const files = ['index.html', 'stil.css', 'oyun.js'];
    const frame = (x, id, title, rowsA) => {
      rr(ctx, x, 20, 250, 220, 14); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      text(ctx, id, x + 16, 52, `700 21px ${FM}`, LINE.main);
      text(ctx, title, x + 16, 80, `700 24px ${FS}`, INK);
      files.forEach((f, i) => {
        ctx.save(); ctx.globalAlpha *= rowsA;
        rr(ctx, x + 14, 98 + i * 44, 222, 36, 7); ctx.fillStyle = i === 2 && id === short('B') ? '#DCE5FB' : '#EFEAE0'; ctx.fill();
        text(ctx, f, x + 28, 123 + i * 44, `600 19px ${FM}`, INK);
        ctx.restore();
      });
    };
    frame(10, short('A'), 'İlk sürüm', 1);
    const bu = eout(ramp(t, tb + 0.4, 0.6));
    if (bu > 0) {
      ctx.save(); ctx.globalAlpha *= bu;
      frame(280, short('B'), 'Skor tablosu', ramp(t, ttr + 0.3, 0.6));
      // myth: "only the difference?"
      const my = win(t, tmy, ttr + 1.4, 0.4, 0.5);
      if (my > 0) {
        ctx.save(); ctx.globalAlpha *= my;
        rr(ctx, 294, 100, 222, 124, 10); ctx.fillStyle = '#F1FAF4'; ctx.fill(); ctx.strokeStyle = LINE.ses; ctx.lineWidth = 2; ctx.stroke();
        text(ctx, 'yalnızca fark?', 308, 128, `italic 600 19px ${FB}`, MUTED);
        text(ctx, '+ let skor = 0', 308, 162, `600 18px ${FM}`, LINE.ses);
        text(ctx, '+ skoruCiz()', 308, 194, `600 18px ${FM}`, LINE.ses);
        const x = ramp(t, ttr, 0.4);
        if (x > 0) { ctx.strokeStyle = RED; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(300, 110); ctx.lineTo(300 + 210 * x, 110 + 104 * x); ctx.stroke(); }
        ctx.restore();
      }
      const tag = eout(ramp(t, ttr + 0.8, 0.5));
      if (tag > 0) { ctx.globalAlpha *= tag; pill(ctx, 470, 52, 'tam fotoğraf', LINE.main, 17, FB); }
      ctx.restore();
    }
    // the question and the answer
    const qa = win(t, twa, tsa + 0.2, 0.4, 0.3);
    if (qa > 0) { ctx.globalAlpha = a * qa; text(ctx, 'Her seferinde her şey kopyalanırsa?', 270, 560, `600 22px ${FB}`, RED, 'center'); }
    const an = ramp(t, tsa, 0.4);
    if (an > 0) { ctx.globalAlpha = a * an; text(ctx, 'Değişmeyen dosya tekrar saklanmaz.', 270, 560, `700 22px ${FB}`, LINE.ses, 'center'); }
    ctx.globalAlpha = a;
    // stored files
    const shA = ramp(t, ttr + 0.3, 0.6);
    if (shA > 0) {
      ctx.globalAlpha = a * shA;
      const boxTop = 372;
      // links from each photo's file to the stored file it uses
      const link = (fx, bi, col, u, w) => {
        if (u <= 0) return;
        const ex = 74 + bi * 130, ey = boxTop - 4;
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(fx, 242);
        for (let k = 1; k <= 24; k++) {
          const v = (k / 24) * u, m = 1 - v;
          ctx.lineTo(m * m * m * fx + 3 * m * m * v * fx + 3 * m * v * v * ex + v * v * v * ex, m * m * m * 242 + 3 * m * m * v * 305 + 3 * m * v * v * 305 + v * v * v * ey);
        }
        ctx.stroke();
        if (u > 0.97) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex, ey + 2); ctx.lineTo(ex - 7, ey - 10); ctx.lineTo(ex + 7, ey - 10); ctx.fill(); }
      };
      ctx.globalAlpha = a * shA * 0.45;
      [60, 135, 210].forEach((x, i) => link(x, i, INK, 1, 2.5));
      ctx.globalAlpha = a * shA;
      const lu = ease(ramp(t, tli, 0.8));
      link(330, 0, LINE.main, lu, 4); link(405, 1, LINE.main, lu, 4);
      link(480, 3, LINE.main, ease(ramp(t, tne + 0.3, 0.7)), 4);
      const boxes = [['index.html', 1], ['stil.css', 1], ['oyun.js', 1], ['oyun.js', 2]];
      boxes.forEach(([nm, v], i) => {
        const bu2 = i < 3 ? 1 : back(ramp(t, tne, 0.5));
        if (bu2 <= 0) return;
        const x = 14 + i * 130, y = boxTop;
        ctx.save(); ctx.translate(x + 60, y + 50); ctx.scale(bu2, bu2); ctx.translate(-x - 60, -y - 50);
        rr(ctx, x, y, 120, 92, 8); ctx.fillStyle = i === 3 ? '#DCE5FB' : '#E9E3D6'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        text(ctx, nm, x + 60, y + 42, `700 16px ${FM}`, INK, 'center');
        text(ctx, v === 1 ? 'sürüm 1' : 'sürüm 2', x + 60, y + 70, `600 16px ${FB}`, v === 1 ? MUTED : LINE.main, 'center');
        ctx.restore();
      });
      ctx.fillStyle = INK; ctx.fillRect(10, boxTop + 96, 520, 5);
      text(ctx, 'depoda saklanan dosyalar', 270, boxTop + 126, `700 20px ${FS}`, MUTED, 'center');
    }
    ctx.restore();
  }

  // 8. time travel: the working folder follows HEAD
  function timePanel(ctx, L, t) {
    const a = win(t, S('time') + 0.3, E('time') + 0.1, 0.6, 0.5);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    box(ctx, L.right, 520, 500);
    rr(ctx, 10, 20, 500, 420, 16); ctx.fillStyle = INK; ctx.fill();
    text(ctx, 'çalışma klasörü şu an', 30, 58, `700 22px ${FB}`, PAPER);
    const tc = C('time', 'checkout') + 1.0, tbk = C('time', 'back') + 1.0;
    const old = t > tc && t < tbk + 0.6;
    const wipe = t < tbk ? ramp(t, tc, 0.7) : 1 - ramp(t, tbk, 0.7);
    const gx = 26, gy = 76, gw = 468, gh = 300;
    game(ctx, gx, gy, gw, gh, fC, t);
    if (wipe > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw * ease(wipe), gh); ctx.clip();
      game(ctx, gx, gy, gw, gh, f0, t);
      ctx.restore();
      ctx.fillStyle = RED; ctx.fillRect(gx + gw * ease(wipe) - 2, gy, 4, gh);
    }
    const cur = wipe > 0.5 ? 'A' : 'C';
    text(ctx, short(cur), 30, 416, `700 22px ${FM}`, '#9DB4FF');
    text(ctx, K[cur].msg, 150, 416, `700 24px ${FB}`, PAPER);
    const lost = ramp(t, C('time', 'nothingLost'), 0.5);
    if (lost > 0) { ctx.globalAlpha = a * lost; text(ctx, '✓ hiçbir şey kaybolmadı', 260, 480, `700 24px ${FB}`, LINE.ses, 'center'); }
    ctx.restore();
  }

  // 9. branch: the copy myth and the 41-byte file
  function branchOverlay(ctx, L, t) {
    const my = win(t, C('branch', 'myth'), C('branch', 'zoom') + 0.9, 0.5, 0.5);
    if (my > 0) {
      ctx.save(); alpha(ctx, my);
      const r = L.portrait ? { x: L.stage.x, y: L.stage.y + L.stage.h * 0.55, w: L.stage.w, h: L.stage.h * 0.45 } : { x: L.stage.x + L.stage.w * 0.62, y: L.stage.y + L.stage.h * 0.45, w: L.stage.w * 0.38, h: L.stage.h * 0.55 };
      box(ctx, r, 440, 300);
      rr(ctx, 10, 10, 420, 280, 16); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = 'rgba(27,31,42,.25)'; ctx.lineWidth = 2; ctx.stroke();
      text(ctx, 'bütün projenin kopyası mı?', 220, 52, `700 24px ${FB}`, INK, 'center');
      for (let i = 0; i < 5; i++) {
        const u = eout(ramp(t, C('branch', 'myth') + 0.2 + i * 0.15, 0.4));
        ctx.save(); ctx.globalAlpha *= u; ctx.translate(90 + i * 22, 90 + i * 16);
        rr(ctx, 0, 0, 200, 130, 10); ctx.fillStyle = '#E9E3D6'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        if (i === 4) text(ctx, 'yildiz-avcisi/', 14, 30, `600 16px ${FM}`, INK);
        ctx.restore();
      }
      const x = ramp(t, C('branch', 'zoom'), 0.35);
      if (x > 0) {
        ctx.strokeStyle = RED; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(110, 90); ctx.lineTo(110 + 230 * x, 90 + 170 * x); ctx.moveTo(340, 90); ctx.lineTo(340 - 230 * x, 90 + 170 * x); ctx.stroke();
      }
      ctx.restore();
    }
    const by = win(t, C('branch', 'zoom') + 0.9, C('branch', 'headFollows') - 0.2, 0.5, 0.5);
    if (by > 0) {
      ctx.save(); alpha(ctx, by);
      const r = L.portrait ? { x: L.stage.x, y: L.stage.y, w: L.stage.w, h: L.stage.h * 0.36 } : { x: L.stage.x + L.stage.w * 0.14, y: L.stage.y, w: L.stage.w * 0.72, h: L.stage.h * 0.4 };
      const s = box(ctx, r, 900, 230);
      ctx.translate(0, (1 - eout(by)) * 20);
      rr(ctx, 10, 10, 880, 200, 16); ctx.fillStyle = INK; ctx.fill();
      ctx.beginPath(); ctx.moveTo(430, 208); ctx.lineTo(450, 230); ctx.lineTo(470, 208); ctx.fill();
      text(ctx, '.git/refs/heads/kalkan', 40, 60, `700 26px ${FM}`, LINE.kalkan);
      const tb = C('branch', 'bytes');
      const n = Math.floor(41 * ramp(t, tb, 1.6));
      const h = K.C.hash;
      text(ctx, h.slice(0, Math.min(40, n)) + (n >= 41 ? '↵' : ''), 40, 118, `600 25px ${FM}`, PAPER);
      if (t > tb) text(ctx, `${n} bayt`, 860, 190, `800 64px ${FS}`, n >= 41 ? '#FFD23F' : PAPER, 'right');
      text(ctx, '40 karakterlik parmak izi + satır sonu', 40, 186, `500 21px ${FB}`, '#B9BCC8');
      ctx.restore();
    }
    // fast-forward stamp
    const ff = win(t, C('ff', 'ff') + 0.3, E('ff') + 0.3, 0.3, 0.5);
    if (ff > 0) {
      ctx.save(); alpha(ctx, ff);
      const r = L.portrait ? { x: L.stage.x, y: L.stage.y + L.stage.h * 0.66, w: L.stage.w, h: L.stage.h * 0.3 } : { x: L.stage.x + L.stage.w * 0.3, y: L.stage.y + L.stage.h * 0.66, w: L.stage.w * 0.4, h: L.stage.h * 0.3 };
      box(ctx, r, 520, 120);
      const sc = lerp(1.4, 1, eout(ramp(t, C('ff', 'ff') + 0.3, 0.3)));
      ctx.translate(260, 60); ctx.scale(sc, sc); ctx.rotate(-0.04);
      rr(ctx, -240, -48, 480, 96, 12); ctx.strokeStyle = LINE.main; ctx.lineWidth = 5; ctx.stroke();
      text(ctx, 'FAST-FORWARD', 0, 2, `800 44px ${FS}`, LINE.main, 'center');
      text(ctx, 'ileri sarma: yeni commit yok, etiket kayar', 0, 34, `600 19px ${FB}`, INK, 'center');
      ctx.restore();
    }
    // "one straight road"
    const ch = win(t, C('ff', 'check') + 0.3, C('ff', 'slide') + 1.5, 0.4, 0.5);
    if (ch > 0) {
      ctx.save(); alpha(ctx, ch);
      const r = L.portrait ? { x: L.stage.x, y: L.stage.y, w: L.stage.w, h: L.stage.h * 0.16 } : { x: L.stage.x + L.stage.w * 0.3, y: L.stage.y, w: L.stage.w * 0.4, h: L.stage.h * 0.2 };
      box(ctx, r, 520, 80);
      text(ctx, 'main → kalkan: tek, düz bir yol', 260, 50, `700 30px ${FB}`, INK, 'center');
      ctx.restore();
    }
  }

  // 11. three-way merge: base, two tips → result
  function mergePanel(ctx, L, t) {
    const a = win(t, C('merge', 'merge'), E('merge') + 0.2, 0.5, 0.6);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    box(ctx, L.right, 540, 620);
    const pw = 150;
    const tb = C('merge', 'base'), tt = C('merge', 'tips'), ta = C('merge', 'auto'), tm = C('merge', 'mcommit');
    const ph = (x, y, id, cap, col, t0) => {
      const u = back(ramp(t, t0, 0.5));
      if (u <= 0) return;
      ctx.save(); ctx.translate(x + pw / 2, y + pw * 0.56); ctx.scale(u, u); ctx.translate(-pw / 2, -pw * 0.56);
      polaroid(ctx, 0, 0, pw, K[id].f, t, cap, col);
      ctx.restore();
    };
    const arrow = (x1, y1, x2, y2, col, u) => {
      if (u <= 0) return;
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const x = lerp(x1, x2, u), y = lerp(y1, y2, u);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
      if (u > 0.9) { const ang = Math.atan2(y2 - y1, x2 - x1); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(ang - 0.5) * 14, y2 - Math.sin(ang - 0.5) * 14); ctx.lineTo(x2 - Math.cos(ang + 0.5) * 14, y2 - Math.sin(ang + 0.5) * 14); ctx.fill(); }
    };
    text(ctx, 'Git üç fotoğrafa bakar', 270, 26, `700 26px ${FS}`, INK, 'center');
    ph(195, 40, 'E', 'ortak ata', INK, tb);
    arrow(215, 215, 120, 250, MUTED, ramp(t, tt, 0.4));
    arrow(325, 215, 420, 250, MUTED, ramp(t, tt, 0.4));
    ph(20, 250, 'G', 'main', LINE.main, tt + 0.1);
    ph(370, 250, 'F', 'ses', LINE.ses, tt + 0.5);
    arrow(120, 430, 215, 450, LINE.main, ramp(t, ta, 0.5));
    arrow(420, 430, 325, 450, LINE.ses, ramp(t, ta + 0.2, 0.5));
    ph(195, 440, 'M', 'birleşim', INK, ta + 0.7);
    const ca = ramp(t, ta + 1.2, 0.5);
    if (ca > 0) {
      ctx.globalAlpha = a * ca;
      text(ctx, 'başlık ← main', 20, 470 + 40, `600 20px ${FM}`, LINE.main);
      text(ctx, 'müzik ← ses', 520, 470 + 40, `600 20px ${FM}`, LINE.ses, 'right');
    }
    ctx.restore();
  }

  // 12. conflict: two versions of the same line
  function conflictPanel(ctx, L, t) {
    const a = win(t, C('conflict', 'merge') - 0.2, E('conflict') + 0.1, 0.5, 0.5);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    box(ctx, L.right, 540, 600);
    const tst = C('conflict', 'stop');
    const u = ease(ramp(t, C('conflict', 'merge'), Math.max(0.5, tst - C('conflict', 'merge'))));
    const shake = t > tst && t < tst + 0.6 ? Math.sin((t - tst) * 60) * 7 * (1 - (t - tst) / 0.6) : 0;
    const card = (x, y, title, val, col, bg) => {
      rr(ctx, x, y, 380, 118, 12); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
      text(ctx, title, x + 18, y + 34, `700 21px ${FM}`, col);
      text(ctx, 'oyun.js', x + 362, y + 34, `500 18px ${FB}`, MUTED, 'right');
      rr(ctx, x + 10, y + 52, 360, 50, 7); ctx.fillStyle = bg; ctx.fill();
      text(ctx, '12', x + 24, y + 85, `500 18px ${FM}`, MUTED);
      text(ctx, `let hiz = ${val}`, x + 70, y + 86, `700 25px ${FM}`, INK);
    };
    card(80 - (1 - u) * 90 + shake, 20, 'main', 8, LINE.main, '#DCE5FB');
    card(80 + (1 - u) * 90 - shake, 160, 'kolay-mod', 3, LINE.kolay, '#F9DDEB');
    // the same line, two answers
    const hot = ramp(t, tst, 0.3);
    if (hot > 0) {
      ctx.globalAlpha = a * hot;
      ctx.strokeStyle = RED; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(472, 97); ctx.lineTo(500, 97); ctx.lineTo(500, 237); ctx.lineTo(472, 237); ctx.stroke();
      text(ctx, '≠', 522, 180, `800 40px ${FB}`, RED, 'center');
      ctx.globalAlpha = a;
    }
    const st = back(ramp(t, tst, 0.4));
    if (st > 0) {
      ctx.save(); ctx.translate(270, 345); ctx.scale(st, st); ctx.rotate(-0.04);
      rr(ctx, -150, -36, 300, 72, 10); ctx.fillStyle = RED; ctx.fill();
      text(ctx, 'ÇAKIŞMA', 0, 17, `800 50px ${FS}`, WHITE, 'center');
      ctx.restore();
      ctx.globalAlpha = a * ramp(t, tst + 0.6, 0.5);
      text(ctx, 'aynı satır, iki farklı değer', 270, 412, `600 22px ${FB}`, INK, 'center');
    }
    const my = ramp(t, C('conflict', 'myth'), 0.5);
    if (my > 0) { ctx.globalAlpha = a * my; text(ctx, '✓ hata değil, bozulma değil', 270, 460, `700 25px ${FB}`, LINE.ses, 'center'); }
    const hu = eout(ramp(t, C('conflict', 'human'), 0.6));
    if (hu > 0) {
      ctx.globalAlpha = a * hu;
      ctx.save(); ctx.translate(0, (1 - hu) * 16);
      person(ctx, 180, 585, 84, INK);
      rr(ctx, 232, 506, 220, 62, 14); ctx.fillStyle = '#FFD23F'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(244, 550); ctx.lineTo(216, 566); ctx.lineTo(254, 560); ctx.fill();
      text(ctx, 'Karar senin.', 342, 547, `800 30px ${FS}`, INK, 'center');
      ctx.restore();
    }
    ctx.restore();
  }

  // 13. the conflict markers and how they go away
  function resolvePanel(ctx, L, t) {
    const a = win(t, S('resolve'), C('resolve', 'done') + 0.2, 0.5, 0.5);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    box(ctx, L.right, 560, 520);
    rr(ctx, 0, 10, 560, 480, 16); ctx.fillStyle = INK; ctx.fill();
    text(ctx, 'oyun.js', 24, 48, `700 22px ${FM}`, PAPER);
    text(ctx, 'birleştirme sürüyor', 536, 48, `italic 500 18px ${FB}`, '#B9BCC8', 'right');
    const te = C('resolve', 'edit'), tmk = C('resolve', 'marks');
    const gone = ease(ramp(t, tmk, 0.8));
    const newLine = ease(ramp(t, te + 0.4, 0.6));
    const oldGone = ease(ramp(t, te + 0.2, 0.6));
    const rows = [
      { s: '// geminin hızı', c: '#8A90A2' },
      { s: '<<<<<<< HEAD', c: '#9DB4FF', mark: 1, hl: 'top' },
      { s: 'let hiz = 8', c: PAPER, hl: 'top', old: 1 },
      { s: '=======', c: '#FFD23F', mark: 1, hl: 'mid' },
      { s: 'let hiz = 3', c: PAPER, hl: 'bottom', old: 1 },
      { s: '>>>>>>> kolay-mod', c: '#FF8FC8', mark: 1, hl: 'bottom' },
      { s: 'gemi.x += yon * hiz', c: PAPER },
    ];
    const hlT = { top: C('resolve', 'top'), mid: C('resolve', 'mid'), bottom: C('resolve', 'bottom') };
    const hlCol = { top: 'rgba(35,80,216,.35)', mid: 'rgba(255,210,63,.25)', bottom: 'rgba(214,51,132,.35)' };
    let y = 80, ln = 10;
    const typed = 'let hiz = kolayMod ? 3 : 8';
    rows.forEach((r, i) => {
      let h = 48;
      if (r.mark) h *= 1 - gone;
      if (r.old) h *= 1 - oldGone;
      if (i === 2) {
        // the new line takes the place of the two old ones
        const nh = 48 * newLine;
        if (nh > 1) {
          const n = Math.floor(typed.length * ramp(t, te + 0.5, 1.4));
          rr(ctx, 16, y + 4, 528, nh - 8, 6); ctx.fillStyle = 'rgba(15,163,127,.3)'; ctx.fill();
          ctx.save(); ctx.globalAlpha *= newLine;
          text(ctx, typed.slice(0, n) + (n < typed.length && Math.floor(t * 3) % 2 ? '▍' : ''), 80, y + 32, `700 22px ${FM}`, PAPER);
          ctx.restore();
          y += nh;
        }
      }
      if (h < 1) return;
      ctx.save(); ctx.beginPath(); ctx.rect(0, y, 560, h); ctx.clip();
      if (r.hl && t > hlT[r.hl]) {
        ctx.globalAlpha *= ramp(t, hlT[r.hl], 0.4) * (1 - oldGone * (r.old ? 1 : 0));
        rr(ctx, 16, y + 4, 528, 40, 6); ctx.fillStyle = hlCol[r.hl]; ctx.fill();
        ctx.globalAlpha = a;
      }
      ctx.globalAlpha = a * (r.mark ? 1 - gone : r.old ? 1 - oldGone : 1);
      text(ctx, String(ln), 30, y + 32, `500 18px ${FM}`, '#6B7185');
      text(ctx, r.s, 80, y + 32, `700 22px ${FM}`, r.c);
      if (r.mark && gone > 0) { ctx.fillStyle = RED; ctx.fillRect(80, y + 24, ctx.measureText(r.s).width * clamp(gone * 3), 3); }
      ctx.restore();
      y += h; ln++;
    });
    // side notes
    const note = (key, str, col, yy) => {
      const u = win(t, hlT[key] + 0.2, te + 0.3, 0.4, 0.4);
      if (u <= 0) return;
      ctx.globalAlpha = a * u;
      text(ctx, str, 536, yy, `700 19px ${FB}`, col, 'right');
    };
    note('top', '↑ senin dalın (main)', '#9DB4FF', 128);
    note('bottom', '↓ birleştirilen dal (kolay-mod)', '#FF8FC8', 468);
    ctx.globalAlpha = a;
    const ok = ramp(t, C('resolve', 'addc') + 1.0, 0.5);
    if (ok > 0) { ctx.globalAlpha = a * ok; text(ctx, '✓ çözüldü', 536, 470, `800 26px ${FS}`, '#7BD88F', 'right'); }
    ctx.restore();
  }

  // 14–15. three computers, each with the whole map
  const MINI = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'M', 'H', 'I', 'R'];
  function remote(ctx, L, t) {
    const a = win(t, S('remote') + 0.1, E('sync') + 0.2, 0.6, 0.6);
    if (a <= 0) return;
    ctx.save(); alpha(ctx, a);
    const [dw, dh] = P2(L, [1200, 600], [600, 920]);
    box(ctx, L.stage, dw, dh);
    const W0 = P2(L, 360, 330);
    const pos = P2(L, { srv: [600, 240], elif: [220, 560], can: [980, 560] }, { srv: [300, 250], elif: [300, 560], can: [300, 880] });
    const tsv = C('remote', 'server'), tup = C('remote', 'upload'), tcl = C('remote', 'clone');
    const appear = { elif: S('remote') + 0.2, srv: tsv, can: tcl - 0.4 };
    // which commits each machine holds, and when they arrived
    const FL = 0.7;   // flight time
    const arrive = { elif: {}, srv: {}, can: {} };
    MINI.forEach((id, i) => { arrive.elif[id] = -1; arrive.srv[id] = tup + 0.3 + i * 0.13 + FL; arrive.can[id] = tcl + 0.6 + i * 0.13 + FL; });
    const tj = C('sync', 'j'), tk = C('sync', 'k'), tcp = C('sync', 'canPush'), trj = C('sync', 'rejected'), tfe = C('sync', 'fetch'), tmi = C('sync', 'mergeIt'), tpo = C('sync', 'pushOk'), tep = C('sync', 'elifPull');
    arrive.can.J = tj + 0.3; arrive.elif.K = tk + 0.2; arrive.srv.K = tk + 1.2 + FL;
    arrive.can.K = tfe + 0.3 + FL; arrive.can.N = tmi + 0.4;
    arrive.srv.J = tpo + 0.3 + FL; arrive.srv.N = tpo + 0.5 + FL;
    arrive.elif.J = tep + 0.4 + FL; arrive.elif.N = tep + 0.6 + FL;
    const flights = [];
    MINI.forEach((id, i) => { flights.push(['elif', 'srv', id, tup + 0.3 + i * 0.13]); flights.push(['srv', 'can', id, tcl + 0.6 + i * 0.13]); });
    flights.push(['elif', 'srv', 'K', tk + 1.2], ['srv', 'can', 'K', tfe + 0.3], ['can', 'srv', 'J', tpo + 0.3], ['can', 'srv', 'N', tpo + 0.5], ['srv', 'elif', 'J', tep + 0.4], ['srv', 'elif', 'N', tep + 0.6]);
    const screens = {};
    // machines
    for (const m of ['elif', 'srv', 'can']) {
      const u = eout(ramp(t, appear[m], 0.6));
      if (u <= 0) continue;
      const [x, y] = pos[m];
      ctx.save(); ctx.globalAlpha *= u; ctx.translate(0, (1 - u) * 24);
      const sc = m === 'srv' ? server(ctx, x, y, W0, t) : laptop(ctx, x, y, W0, INK);
      screens[m] = sc;
      const nm = m === 'srv' ? 'uzak depo' : m === 'elif' ? 'Elif' : 'Can';
      const [nx, ny, al] = m === 'srv' ? P2(L, [x, y - W0 * 0.62 - 16, 'center'], [x + W0 / 2 + 14, y - W0 * 0.3, 'left']) : P2(L, [x, y + 52, 'center'], [x + W0 / 2 + 22, y - W0 * 0.3, 'left']);
      text(ctx, nm, nx, ny, `800 ${P2(L, 32, 30)}px ${FS}`, m === 'srv' ? LINE.remote : INK, al);
      ctx.restore();
    }
    // the mini maps
    const miniPos = (sc, id) => {
      const c = K[id], cols = 11;
      return [sc.x + 18 + (c.col / (cols - 1)) * (sc.w - 36), sc.y + sc.h * 0.42 + (id === 'D' || id === 'E' ? 0 : c.lane) * sc.h * 0.3];
    };
    const has = (m, id) => arrive[m][id] !== undefined && t >= arrive[m][id];
    for (const m of Object.keys(screens)) {
      const sc = screens[m];
      ctx.save(); ctx.globalAlpha *= eout(ramp(t, appear[m], 0.6));
      ctx.lineCap = 'round';
      for (const id of [...MINI, 'J', 'K', 'N']) {
        if (!has(m, id)) continue;
        const c = K[id];
        c.parents.forEach((pid, pi) => {
          if (!has(m, pid)) return;
          const a2 = miniPos(sc, pid), b2 = miniPos(sc, id);
          ctx.strokeStyle = pi === 1 ? LINE[K[pid].line] : (id === 'D' || id === 'E' ? LINE.main : LINE[c.line]);
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(...a2);
          if (Math.abs(a2[1] - b2[1]) > 1) ctx.lineTo(pi === 0 ? a2[0] + (b2[0] - a2[0]) * 0.5 : a2[0] + (b2[0] - a2[0]) * 0.5, pi === 0 ? b2[1] : a2[1]);
          ctx.lineTo(...b2); ctx.stroke();
        });
      }
      for (const id of [...MINI, 'J', 'K', 'N']) {
        if (!has(m, id)) continue;
        const p = miniPos(sc, id), pop = back(ramp(t, arrive[m][id], 0.3));
        ctx.beginPath(); ctx.arc(p[0], p[1], (K[id].merge ? 7 : 5) * pop, 0, Math.PI * 2); ctx.fillStyle = WHITE; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = K[id].merge ? INK : (id === 'D' || id === 'E' ? LINE.main : LINE[K[id].line]); ctx.stroke();
      }
      // empty server at first
      if (m === 'srv' && t < arrive.srv.A) text(ctx, 'boş depo', sc.x + sc.w / 2, sc.y + sc.h / 2 + 8, `italic 600 22px ${FB}`, MUTED, 'center');
      ctx.restore();
    }
    // flights
    for (const [from, to, id, t0] of flights) {
      const u = ramp(t, t0, FL);
      if (u <= 0 || u >= 1 || !screens[from] || !screens[to]) continue;
      const p0 = miniPos(screens[from], id), p1 = miniPos(screens[to], id);
      const e = ease(u), x = lerp(p0[0], p1[0], e), y = lerp(p0[1], p1[1], e) - Math.sin(e * Math.PI) * 80;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = K[id].line === 'remote' ? LINE.remote : LINE.main; ctx.fill();
      ctx.strokeStyle = WHITE; ctx.lineWidth = 3; ctx.stroke();
    }
    // the rejected push bounces back
    if (screens.can && screens.srv) {
      const u = ramp(t, tcp + 0.3, 0.8), bk = ramp(t, trj, 0.6);
      if (u > 0 && bk < 1) {
        const p0 = miniPos(screens.can, 'J'), p1 = [screens.srv.x + screens.srv.w / 2, screens.srv.y + screens.srv.h + 20];
        const e = ease(u) * (1 - ease(bk));
        const x = lerp(p0[0], p1[0], e), y = lerp(p0[1], p1[1], e) - Math.sin(e * Math.PI) * 60;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fillStyle = LINE.main; ctx.fill(); ctx.strokeStyle = WHITE; ctx.lineWidth = 3; ctx.stroke();
      }
      const rj = win(t, trj, tfe, 0.3, 0.5);
      if (rj > 0) {
        const [x, y] = P2(L, [pos.srv[0] + W0 / 2 + 130, pos.srv[1] - 100], [pos.srv[0] + 90, pos.srv[1] - 120]);
        ctx.save(); ctx.globalAlpha *= rj; ctx.translate(x, y); ctx.rotate(-0.06); ctx.scale(lerp(1.4, 1, eout(ramp(t, trj, 0.3))), lerp(1.4, 1, eout(ramp(t, trj, 0.3))));
        rr(ctx, -130, -30, 260, 60, 10); ctx.fillStyle = RED; ctx.fill();
        text(ctx, 'REDDEDİLDİ', 0, 14, `800 38px ${FS}`, WHITE, 'center');
        ctx.restore();
      }
    }
    // tags
    const tagAt = (str, col, x, y, u) => { if (u <= 0) return; ctx.save(); ctx.globalAlpha *= u; pill(ctx, x, y, str, col, 20, FB); ctx.restore(); };
    tagAt('origin', LINE.remote, ...P2(L, [pos.srv[0], pos.srv[1] + 30], [pos.srv[0] - W0 / 2 + 50, pos.srv[1] + 28]), ramp(t, C('remote', 'origin'), 0.4));
    const full = win(t, C('remote', 'full'), S('sync') + 0.3, 0.4, 0.5);
    const dist = win(t, C('remote', 'distributed'), S('sync') + 0.3, 0.4, 0.5);
    for (const m of ['elif', 'srv', 'can']) {
      const [x, y] = pos[m];
      if (full > 0 && screens[m]) { const sc = screens[m]; ctx.save(); ctx.globalAlpha *= full * (0.5 + 0.5 * Math.sin(t * 5)); ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = 6; rr(ctx, sc.x - 4, sc.y - 4, sc.w + 8, sc.h + 8, 8); ctx.stroke(); ctx.restore(); }
      if (dist > 0) tagAt('✓ tam kopya', LINE.ses, ...(m === 'srv' ? P2(L, [x + W0 / 2 + 90, y - 110], [x - W0 / 2 + 70, y - 190]) : P2(L, [x, y + 96], [x - W0 / 2 + 70, y - 205])), dist);
    }
    const only = win(t, tj + 1.0, tk + 0.3, 0.4, 0.5);
    tagAt('yalnızca burada', LINE.main, ...P2(L, [pos.can[0], pos.can[1] + 96], [pos.can[0] + 70, pos.can[1] - 235]), only);
    const same = ramp(t, tep + 1.5, 0.5);
    if (same > 0) tagAt('üç kopya da aynı', LINE.ses, ...P2(L, [600, 420], [300, 400]), same);
    ctx.restore();
  }

  // 16. summary legend
  function summary(ctx, L, t) {
    const a = win(t, S('summary') + 0.3, C('summary', 'final') + 0.2, 0.6, 0.6);
    if (a > 0) {
      ctx.save(); alpha(ctx, a);
      box(ctx, L.right, 540, 560);
      const rows = [
        ['s1', 'Commit', 'projenin bir fotoğrafı', (x, y) => { ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fillStyle = WHITE; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = LINE.main; ctx.stroke(); }],
        ['s2', 'Dal', "bir commit'i gösteren etiket", (x, y) => pill(ctx, x, y, 'main', LINE.main, 18)],
        ['s3', 'Merge', 'iki yolun buluştuğu durak', (x, y) => { ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fillStyle = WHITE; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke(); }],
        ['s4', 'Çakışma', 'aynı satır: son söz senin', (x, y) => { ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fillStyle = RED; ctx.fill(); text(ctx, '!', x, y + 11, `800 32px ${FB}`, WHITE, 'center'); }],
        ['s5', 'push · pull', 'haritayı ekiple paylaşmak', (x, y) => { text(ctx, '⇅', x, y + 16, `800 46px ${FB}`, LINE.remote, 'center'); }],
      ];
      rows.forEach(([cue, title, sub, icon], i) => {
        const u = eout(ramp(t, C('summary', cue), 0.5));
        if (u <= 0) return;
        const y = 50 + i * 104;
        ctx.save(); ctx.globalAlpha *= u; ctx.translate((1 - u) * 30, 0);
        icon(52, y + 20);
        text(ctx, title, 110, y + 18, `800 36px ${FS}`, INK);
        text(ctx, sub, 110, y + 50, `500 23px ${FB}`, MUTED);
        ctx.restore();
      });
      ctx.restore();
    }
    // the old "final" files dissolve
    const an = win(t, C('summary', 'answer'), C('summary', 'final') + 0.4, 0.4, 0.6);
    if (an > 0) {
      ctx.save(); alpha(ctx, an);
      box(ctx, L.left, 900, 600);
      const r = rand(5);
      FILES.slice(0, 5).forEach((nm, i) => {
        const x = 20 + (i % 3) * 300 + (i > 2 ? 150 : 0), y = 430 + Math.floor(i / 3) * 80 - ramp(t, C('summary', 'answer') + i * 0.1, 3) * 30;
        ctx.save(); ctx.translate(x, y); ctx.rotate((r() - 0.5) * 0.4);
        ctx.font = `600 20px ${FB}`;
        const cw2 = ctx.measureText(nm).width + 28;
        rr(ctx, -10, -30, cw2, 44, 8); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = 'rgba(27,31,42,.3)'; ctx.lineWidth = 2; ctx.stroke();
        text(ctx, nm, 4, 0, `600 20px ${FB}`, MUTED);
        const k = ramp(t, C('summary', 'answer') + 0.6 + i * 0.15, 0.3);
        ctx.strokeStyle = RED; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4 + (cw2 - 12) * k, -8); ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }
    // final title
    const fi = ramp(t, C('summary', 'final') + 0.3, 0.8);
    if (fi > 0) {
      ctx.save(); alpha(ctx, fi);
      const r = { x: L.stage.x, y: L.stage.y, w: L.stage.w, h: L.stage.h * 0.3 };
      box(ctx, r, 800, 140);
      const sc = lerp(0.9, 1, eout(fi));
      ctx.translate(400, 70); ctx.scale(sc, sc);
      rr(ctx, -250, -54, 500, 108, 20); ctx.fillStyle = INK; ctx.fill();
      ctx.beginPath(); ctx.arc(-190, 0, 26, 0, Math.PI * 2); ctx.fillStyle = WHITE; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = LINE.main; ctx.stroke();
      text(ctx, 'Git Hattı', 30, 26, `800 76px ${FS}`, PAPER, 'center');
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- terminal
  const TERM = [];
  const cmd = (t, who, c, out = [], outAt) => TERM.push({ t, who, c, out, outAt });
  cmd(C('repo', 'init') + 0.1, 'elif', 'git init', ['Initialized empty Git repository in ~/yildiz-avcisi/.git/'], C('repo', 'dotgit'));
  cmd(C('stage', 'add'), 'elif', 'git add index.html stil.css oyun.js');
  cmd(C('commit', 'cmd'), 'elif', 'git commit -m "İlk sürüm"', [`[main (root-commit) ${short('A')}] İlk sürüm`, ' 3 files changed, 64 insertions(+)'], C('commit', 'flash') + 0.3);
  cmd(C('snapshot', 'b'), 'can', 'git add oyun.js');
  cmd(C('snapshot', 'b') + 1.6, 'can', 'git commit -m "Skor tablosu"', [`[main ${short('B')}] Skor tablosu`, ' 1 file changed, 12 insertions(+)']);
  cmd(C('chain', 'c'), 'elif', 'git commit -m "Yıldızlı gökyüzü"', [`[main ${short('C')}] Yıldızlı gökyüzü`]);
  cmd(C('chain', 'chain'), 'elif', 'git log --oneline', [`${short('C')} Yıldızlı gökyüzü`, `${short('B')} Skor tablosu`, `${short('A')} İlk sürüm`]);
  cmd(C('time', 'checkout'), 'elif', `git checkout ${short('A')}`, [`HEAD is now at ${short('A')} İlk sürüm`]);
  cmd(C('time', 'back'), 'elif', 'git switch main', ["Switched to branch 'main'"]);
  cmd(C('branch', 'create'), 'elif', 'git switch -c kalkan', ["Switched to a new branch 'kalkan'"]);
  cmd(C('branch', 'bytes') - 0.4, 'elif', 'cat .git/refs/heads/kalkan', [K.C.hash]);
  cmd(C('branch', 'd') - 0.4, 'elif', 'git commit -m "Kalkan çizimi"');
  cmd(C('branch', 'e') - 0.2, 'elif', 'git commit -m "Kalkan süresi"');
  cmd(C('ff', 'switch'), 'elif', 'git switch main');
  cmd(C('ff', 'merge'), 'elif', 'git merge kalkan', [`Updating ${short('C')}..${short('E')}`, 'Fast-forward'], C('ff', 'slide'));
  cmd(C('merge', 'ses'), 'elif', 'git switch -c ses');
  cmd(C('merge', 'ses') + 1.3, 'elif', 'git commit -m "Müzik"');
  cmd(C('merge', 'title'), 'can', 'git switch main');
  cmd(C('merge', 'title') + 1.1, 'can', 'git commit -m "Başlık ekranı"');
  cmd(C('merge', 'merge'), 'can', 'git merge ses', ["Merge made by the 'ort' strategy."], C('merge', 'mcommit'));
  cmd(C('conflict', 'kolay'), 'elif', 'git switch -c kolay-mod');
  cmd(C('conflict', 'kolay') + 1.3, 'elif', 'git commit -m "hiz = 3"');
  cmd(C('conflict', 'hiz8'), 'can', 'git switch main');
  cmd(C('conflict', 'hiz8') + 1.1, 'can', 'git commit -m "hiz = 8"');
  cmd(C('conflict', 'merge'), 'can', 'git merge kolay-mod', ['Auto-merging oyun.js', 'CONFLICT (content): Merge conflict in oyun.js', 'Automatic merge failed; fix conflicts and then commit the result.'], C('conflict', 'stop'));
  cmd(C('resolve', 'addc'), 'can', 'git add oyun.js');
  cmd(C('resolve', 'addc') + 1.0, 'can', 'git commit', [`[main ${short('R')}] Merge branch 'kolay-mod'`], C('resolve', 'done'));
  cmd(C('remote', 'upload') - 0.8, 'elif', 'git remote add origin https://example.com/yildiz-avcisi.git');
  cmd(C('remote', 'upload') + 0.4, 'elif', 'git push -u origin main', ['To https://example.com/yildiz-avcisi.git', ' * [new branch]      main -> main']);
  cmd(C('remote', 'clone'), 'can', 'git clone https://example.com/yildiz-avcisi.git', ["Cloning into 'yildiz-avcisi'...", 'done.']);
  cmd(C('sync', 'j'), 'can', 'git commit -m "Yeni seviye"');
  cmd(C('sync', 'k'), 'elif', 'git commit -m "Renkli gemi"');
  cmd(C('sync', 'k') + 1.1, 'elif', 'git push', ['   ' + short('R') + '..' + short('K') + '  main -> main']);
  cmd(C('sync', 'canPush'), 'can', 'git push', [' ! [rejected]        main -> main (fetch first)', "error: failed to push some refs"], C('sync', 'rejected'));
  cmd(C('sync', 'pull'), 'can', 'git pull', [`   ${short('R')}..${short('K')}  main -> origin/main`, "Merge made by the 'ort' strategy."], C('sync', 'mergeIt'));
  cmd(C('sync', 'pushOk'), 'can', 'git push', ['   ' + short('K') + '..' + short('N') + '  main -> main']);
  cmd(C('sync', 'elifPull'), 'elif', 'git pull', [`Updating ${short('K')}..${short('N')}`, 'Fast-forward']);
  TERM.sort((a, b) => a.t - b.t);

  function terminal(ctx, L, t) {
    const ch = tl.at(t);
    const entries = TERM.filter(e => e.t <= t && tl.at(e.t) === ch);
    const first = TERM.find(e => tl.at(e.t) === ch);
    if (!first) return;
    const a = win(t, first.t - 0.8, ch.end + 0.1, 0.4, 0.5);
    if (a <= 0) return;
    const r = L.term, u = L.u;
    ctx.save(); ctx.globalAlpha = a;
    rr(ctx, r.x, r.y, r.w, r.h, 10 * u); ctx.fillStyle = INK; ctx.fill();
    const fs = (L.portrait ? 12.5 : 14) * u, lh = fs * 1.38;
    ctx.font = `500 ${fs}px ${FM}`;
    const cw = ctx.measureText('0').width;
    const maxC = Math.floor((r.w - 28 * u) / cw);
    const lines = [];
    for (const e of entries) {
      const dur = Math.min(1.1, e.c.length * 0.035);
      const n = Math.floor(e.c.length * ramp(t, e.t, dur));
      const prompt = e.who === 'can' ? 'can $ ' : 'elif $ ';
      const typing = n < e.c.length;
      lines.push({ p: prompt, s: e.c.slice(0, n) + (typing || (e === entries[entries.length - 1] && !e.out.length && Math.floor(t * 2) % 2) ? '▍' : ''), who: e.who });
      const ot = e.outAt !== undefined ? e.outAt : e.t + dur + 0.3;
      e.out.forEach((o, i) => { if (t >= ot + i * 0.15) lines.push({ s: o, out: 1, warn: /CONFLICT|rejected|error|failed/.test(o) }); });
    }
    // wrap long lines by characters
    const rows = [];
    for (const l of lines) {
      const full = (l.p || '') + l.s;
      for (let i = 0; i < Math.max(1, full.length); i += maxC) rows.push({ ...l, txt: full.slice(i, i + maxC), first: i === 0 });
    }
    const maxRows = Math.max(1, Math.floor((r.h - 14 * u) / lh));
    const vis = rows.slice(-maxRows);
    ctx.save(); rr(ctx, r.x, r.y, r.w, r.h, 10 * u); ctx.clip();
    vis.forEach((row, i) => {
      const y = r.y + 10 * u + fs + i * lh;
      let x = r.x + 14 * u;
      if (row.p && row.first) {
        text(ctx, row.p, x, y, `700 ${fs}px ${FM}`, row.who === 'can' ? '#6EE7C8' : '#FFB86B');
        x += ctx.measureText(row.p).width;
        text(ctx, row.txt.slice(row.p.length), x, y, `500 ${fs}px ${FM}`, PAPER);
      } else text(ctx, row.txt, x, y, `500 ${fs}px ${FM}`, row.warn ? '#FF8A8A' : '#B9BCC8');
    });
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- chapter sign
  const SIGN = [LINE.main, LINE.kalkan, LINE.ses, LINE.kolay, LINE.remote];
  function sign(ctx, L, t) {
    const ch = tl.at(t), u = L.u;
    const inA = eout(ramp(t, ch.start, 0.6)), out = ramp(t, ch.end - 0.35, 0.35);
    const a = inA * (1 - out);
    if (a <= 0) return;
    const f = (L.portrait ? 22 : 34) * u;
    const r = f * 0.78;
    const x = L.pad, y = L.portrait ? 32 * u : 62 * u;
    ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - inA) * -20, 0);
    ctx.beginPath(); ctx.arc(x + r, y, r, 0, Math.PI * 2); ctx.fillStyle = SIGN[ch.i % SIGN.length]; ctx.fill();
    text(ctx, String(ch.n), x + r, y + f * 0.36, `800 ${f}px ${FS}`, WHITE, 'center');
    const maxW = (L.portrait ? L.W - L.pad * 2 : L.term.x - L.pad * 2) - r * 2 - 14 * u;
    let fs = f;
    ctx.font = `700 ${fs}px ${FS}`;
    while (ctx.measureText(ch.title).width > maxW && fs > 12) { fs -= 1; ctx.font = `700 ${fs}px ${FS}`; }
    text(ctx, ch.title, x + r * 2 + 14 * u, y + fs * 0.36, `700 ${fs}px ${FS}`, INK);
    ctx.restore();
  }

  // ---------------------------------------------------------------- frame
  function paper(ctx, L) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, L.W, L.H);
    const g = 32 * L.u;
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (L.W / 2) % g; x < L.W; x += g) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, L.H); }
    for (let y = 0; y < L.H; y += g) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(L.W, Math.round(y) + 0.5); }
    ctx.stroke();
  }

  function draw(ctx, W, H, t) {
    const L = layout(W, H);
    paper(ctx, L);
    const mapA = win(t, C('commit', 'station') - 0.4, S('remote') + 0.4, 0.6, 0.6) + ramp(t, S('summary'), 0.8);
    intro(ctx, L, t);
    history(ctx, L, t);
    repo(ctx, L, t);
    drawMap(ctx, L, t, clamp(mapA));
    zones(ctx, L, t);
    snapshot(ctx, L, t);
    timePanel(ctx, L, t);
    branchOverlay(ctx, L, t);
    mergePanel(ctx, L, t);
    conflictPanel(ctx, L, t);
    resolvePanel(ctx, L, t);
    remote(ctx, L, t);
    summary(ctx, L, t);
    terminal(ctx, L, t);
    sign(ctx, L, t);
  }

  // sound effects, tied to the same cues
  const SFX = [];
  const fx = (t, type) => SFX.push([t, type]);
  for (let i = 0; i < 9; i++) fx(C('intro', 'files') + i * 0.16, 'tick');
  fx(C('intro', 'order'), 'whoosh'); fx(C('intro', 'git'), 'pop'); fx(C('intro', 'map'), 'chime');
  fx(C('repo', 'dotgit'), 'pop'); fx(C('stage', 'add') + 0.4, 'whoosh');
  fx(C('commit', 'flash'), 'shutter'); fx(C('commit', 'hash') + 0.2, 'roll'); fx(C('commit', 'short'), 'tick');
  for (const id of ORDER) if (id !== 'J' && id !== 'K' && id !== 'N') fx(K[id].at, K[id].merge ? 'chime' : 'pop');
  fx(C('chain', 'cascade') + 0.3, 'alert'); fx(C('chain', 'cascade2') + 0.5, 'alert'); fx(C('chain', 'safe'), 'stamp');
  fx(C('time', 'checkout') + 0.8, 'rail'); fx(C('time', 'checkout') + 1.0, 'whoosh'); fx(C('time', 'back') + 0.8, 'rail');
  fx(C('branch', 'create') + 0.3, 'pop'); fx(C('branch', 'zoom'), 'whoosh'); fx(C('branch', 'bytes') + 1.6, 'tick');
  fx(C('ff', 'slide'), 'rail'); fx(C('ff', 'ff'), 'chime');
  fx(C('conflict', 'stop'), 'alert'); fx(C('resolve', 'marks'), 'whoosh');
  fx(C('remote', 'upload') + 0.3, 'whoosh'); fx(C('remote', 'clone') + 0.6, 'whoosh');
  fx(C('sync', 'rejected'), 'alert'); fx(C('sync', 'fetch') + 0.3, 'whoosh'); fx(C('sync', 'pushOk') + 0.3, 'whoosh'); fx(C('sync', 'elifPull') + 1.5, 'chime');
  fx(C('summary', 'final') + 0.3, 'chime');
  SFX.sort((a, b) => a[0] - b[0]);

  return { draw, sfx: SFX, layout };
}
