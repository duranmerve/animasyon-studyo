// YouTube covers for Git Hattı: five hero pictures drawn by code, framed by the channel kit
// (assets/thumbnail-kit). thumbnail.html?v=1..5 — rendered by `npm run thumbnail -- git-version-control`.
import { game } from './draw.js';
import * as kit from '/_kit/kit.js';

const { W, H, DPR, rand, lerp, layer, off, bloom, depthOfField, bokeh, drawQuad } = kit;
const COL = { main: '#3D6BFF', kalkan: '#FF9A3C', ses: '#19D3A2', kolay: '#FF3D9A', remote: '#9B7BFF', red: '#FF3B4E' };
const TOPIC = 'YAZILIM', MIN = 6;

export const THUMBS = [
  { id: 'neon', title: 'Neon gece hattı' },
  { id: 'conflict', title: 'Çakışma anı' },
  { id: 'desk', title: 'Masadaki harita' },
  { id: 'bytes', title: 'Dal = 41 bayt' },
  { id: 'chaos', title: 'Dosya kaosuna son' },
];

// ------------------------------------------------------------------ the commit graph (same shape as the film's final map)
const G = (() => {
  const c = [], e = [];
  const add = (id, col, lane, line, parents = [], merge = false) => c.push({ id, col, lane, line, parents, merge });
  add('A', 0, 0, 'main'); add('B', 1, 0, 'main', ['A']); add('C', 2, 0, 'main', ['B']); add('D', 3, 0, 'main', ['C']); add('E', 4, 0, 'main', ['D']);
  add('F', 5, 1, 'ses', ['E']); add('G', 5, 0, 'main', ['E']); add('M', 6, 0, 'main', ['G', 'F'], true);
  add('H', 7, 1, 'kolay', ['M']); add('I', 7, 0, 'main', ['M']); add('R', 8, 0, 'main', ['I', 'H'], true);
  add('K', 9, 1, 'remote', ['R']); add('J', 9, 0, 'main', ['R']); add('N', 10, 0, 'main', ['J', 'K'], true);
  const by = Object.fromEntries(c.map(x => [x.id, x]));
  for (const x of c) x.parents.forEach((p, pi) => {
    const a = by[p], b = x, dy = b.lane - a.lane;
    const pts = !dy ? [[a.col, a.lane], [b.col, b.lane]]
      : pi === 0 ? [[a.col, a.lane], [a.col + 0.7, b.lane], [b.col, b.lane]]
        : [[a.col, a.lane], [b.col - 0.7, a.lane], [b.col, b.lane]];
    e.push({ pts, line: pi === 1 ? a.line : b.line });
  });
  return { c, e, by };
})();
const sample = (pts, step = 0.05) => {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push([lerp(x0, x1, k / n), lerp(y0, y1, k / n)]);
  }
  return out;
};

// ground-plane camera: graph (col, lane) → ground (X, Z) → screen
function camera({ f = 700, camH = 260, horizon = 250, theta = 1.05, x0 = -350, z0 = 450, colLen = 170, laneLen = 120, reverse = false }) {
  const cs = Math.cos(theta), sn = Math.sin(theta);
  const ground = (col, lane) => {
    const u = (reverse ? 10 - col : col) * colLen, v = lane * laneLen;
    return [x0 + u * cs - v * sn, z0 + u * sn + v * cs];
  };
  const proj = (X, Z) => [W / 2 + X * f / Z, horizon + camH * f / Z, f / Z];
  return { p: (col, lane) => proj(...ground(col, lane)), proj };
}
function neonGraph(ctx, cam, { width = 9 } = {}) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pass of [0, 1]) for (const ed of G.e) {
    const pts = sample(ed.pts, 0.02).map(([c, l]) => cam.p(c, l));
    for (let i = 0; i < pts.length - 1; i += 6) {
      const run = pts.slice(i, i + 7), s0 = run[Math.floor(run.length / 2)][2];
      ctx.beginPath(); run.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (pass === 0) { ctx.strokeStyle = COL[ed.line]; ctx.globalAlpha = 1; ctx.lineWidth = width * s0 * 2.2; }
      else { ctx.strokeStyle = '#EEF2FF'; ctx.globalAlpha = 0.8; ctx.lineWidth = width * s0 * 0.5; }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const c of G.c) {
    const [x, y, s] = cam.p(c.col, c.lane);
    const r = (c.merge ? 19 : 13) * s;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.42);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 6 * s; ctx.strokeStyle = c.merge ? '#FFFFFF' : COL[c.line]; ctx.stroke();
    ctx.restore();
  }
}
function groundGrid(ctx, cam, color, alpha) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1;
  for (let X = -3000; X <= 3000; X += 120) {
    ctx.beginPath();
    for (let Z = 200; Z < 6000; Z += 60) { const [x, y] = cam.proj(X, Z); Z === 200 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.globalAlpha = alpha; ctx.stroke();
  }
  for (let Z = 240; Z < 6000; Z *= 1.12) {
    const [x0, y] = cam.proj(-6000, Z), [x1] = cam.proj(6000, Z);
    ctx.globalAlpha = alpha * Math.min(1, 900 / Z);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  }
  ctx.restore();
}
function skyline(ctx, horizon, seed) {
  const r = rand(seed);
  let x = -20;
  while (x < W + 20) {
    const w = 30 + r() * 70, h = 30 + r() ** 2 * 170;
    const g = ctx.createLinearGradient(0, horizon - h, 0, horizon);
    g.addColorStop(0, '#141238'); g.addColorStop(1, '#0B0A22');
    ctx.fillStyle = g; ctx.fillRect(x, horizon - h, w, h + 2);
    for (let yy = horizon - h + 8; yy < horizon - 6; yy += 9) for (let xx = x + 5; xx < x + w - 6; xx += 8)
      if (r() < 0.16) { ctx.fillStyle = r() < 0.7 ? 'rgba(255,214,140,.75)' : 'rgba(150,190,255,.7)'; ctx.fillRect(xx, yy, 3, 4); }
    x += w + r() * 6;
  }
}
// a flat rectangle rotated in 3D and projected: [tl, tr, br, bl]
function card3d(cx, cy, w, h, rx, ry, rz, f = 1100) {
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => {
    let X = x * Math.cos(rz) - y * Math.sin(rz), Y = x * Math.sin(rz) + y * Math.cos(rz), Z = 0;
    [Y, Z] = [Y * Math.cos(rx) - Z * Math.sin(rx), Y * Math.sin(rx) + Z * Math.cos(rx)];
    [X, Z] = [X * Math.cos(ry) + Z * Math.sin(ry), -X * Math.sin(ry) + Z * Math.cos(ry)];
    const k = f / (f + Z);
    return [cx + X * k, cy + Y * k];
  });
}
const shadowOf = (bg, q, dx, dy, blur, a) => {
  bg.save(); bg.filter = `blur(${blur}px)`; bg.fillStyle = `rgba(0,0,0,${a})`;
  bg.beginPath(); q.map(([x, y]) => [x + dx, y + dy]).forEach(([x, y], i) => (i ? bg.lineTo(x, y) : bg.moveTo(x, y))); bg.fill(); bg.restore();
};

// ------------------------------------------------------------------ 1. neon night line
function neon() {
  const cam = camera({ f: 820, camH: 250, horizon: 262, theta: 0.846, x0: 100, z0: 470, colLen: 338, laneLen: 170, reverse: true });
  const bg = layer(1);
  const sky = bg.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#05061A'); sky.addColorStop(0.36, '#1A0F3D'); sky.addColorStop(0.37, '#0B0822'); sky.addColorStop(1, '#03030C');
  bg.fillStyle = sky; bg.fillRect(0, 0, W, H);
  const hz = bg.createRadialGradient(900, 262, 10, 900, 262, 620);
  hz.addColorStop(0, 'rgba(120,90,255,.55)'); hz.addColorStop(0.4, 'rgba(255,60,154,.18)'); hz.addColorStop(1, 'rgba(0,0,0,0)');
  bg.fillStyle = hz; bg.fillRect(0, 0, W, H);
  skyline(bg, 262, 7);
  bokeh(bg, 40, 3, ['#3D6BFF', '#FF3D9A', '#FFB84D', '#19D3A2'], 40, 250, 6, 42, 0.5);
  groundGrid(bg, cam, '#6E5BFF', 0.22);
  const lines = off();
  neonGraph(lines, cam, { width: 10 });
  bloom(bg, lines, 60, 0.55); bloom(bg, lines, 26, 0.9); bloom(bg, lines, 8, 0.8);
  bg.drawImage(lines.canvas, 0, 0, W, H);
  depthOfField(bg, 250, 470, 6);
  // HEAD: a red beacon on the newest station
  const [hx, hy] = cam.p(10, 0);
  const beam = bg.createLinearGradient(0, hy - 360, 0, hy);
  beam.addColorStop(0, 'rgba(255,59,78,0)'); beam.addColorStop(1, 'rgba(255,59,78,.55)');
  bg.save(); bg.globalCompositeOperation = 'lighter'; bg.fillStyle = beam;
  bg.beginPath(); bg.moveTo(hx - 6, hy); bg.lineTo(hx - 34, hy - 360); bg.lineTo(hx + 34, hy - 360); bg.lineTo(hx + 6, hy); bg.fill(); bg.restore();
  const orb = bg.createRadialGradient(hx - 6, hy - 64, 2, hx, hy - 58, 26);
  orb.addColorStop(0, '#FFD0D4'); orb.addColorStop(0.35, '#FF3B4E'); orb.addColorStop(1, '#6E0010');
  bg.save(); bg.shadowColor = '#FF3B4E'; bg.shadowBlur = 50; bg.fillStyle = orb; bg.beginPath(); bg.arc(hx, hy - 58, 22, 0, Math.PI * 2); bg.fill(); bg.restore();
  bg.fillStyle = '#FF3B4E'; bg.fillRect(hx - 2, hy - 38, 4, 38);
  kit.html('HEAD', { left: `${hx - 38}px`, top: `${hy - 128}px`, font: '800 24px "JetBrains Mono"', color: '#fff', background: '#FF3B4E', padding: '4px 12px', borderRadius: '8px', boxShadow: '0 0 30px rgba(255,59,78,.9)' }, 85);
  kit.brand({ title: 'GIT *HATTI*', accent: 'commit · dal · merge · çakışma', topic: TOPIC, minutes: MIN, tint: '#9B7BFF' });
}

// ------------------------------------------------------------------ 2. the conflict
function conflict() {
  const bg = layer(1);
  const cx = 830, cy = 360;
  const sky = bg.createRadialGradient(cx, cy, 20, cx, cy, 900);
  sky.addColorStop(0, '#3A0A1C'); sky.addColorStop(0.45, '#12061A'); sky.addColorStop(1, '#030208');
  bg.fillStyle = sky; bg.fillRect(0, 0, W, H);
  bokeh(bg, 36, 11, ['#FF3B4E', '#3D6BFF', '#FF3D9A', '#FFB84D'], 0, H, 8, 50, 0.35);
  bg.save(); bg.globalCompositeOperation = 'lighter';
  const rr = rand(5);
  for (let i = 0; i < 26; i++) {
    const a = rr() * Math.PI * 2, len = 300 + rr() * 700, w = 0.02 + rr() * 0.05;
    const g = bg.createRadialGradient(cx, cy, 0, cx, cy, len);
    g.addColorStop(0, 'rgba(255,120,90,.35)'); g.addColorStop(1, 'rgba(255,60,80,0)');
    bg.fillStyle = g; bg.beginPath(); bg.moveTo(cx, cy); bg.arc(cx, cy, len, a - w, a + w); bg.fill();
  }
  bg.restore();
  const lines = off();
  lines.lineCap = 'round';
  const tube = (pts, col) => {
    for (const [lw, c, al] of [[34, col, 1], [10, '#FFFFFF', 0.7]]) {
      lines.globalAlpha = al; lines.strokeStyle = c; lines.lineWidth = lw; lines.lineJoin = 'round';
      lines.beginPath(); pts.forEach(([x, y], i) => (i ? lines.lineTo(x, y) : lines.moveTo(x, y))); lines.stroke();
    }
    lines.globalAlpha = 1;
  };
  tube([[-60, 190], [470, 190], [600, 280], [cx - 40, cy - 6]], COL.main);
  tube([[-60, 520], [470, 520], [600, 430], [cx - 40, cy + 6]], COL.kolay);
  bloom(bg, lines, 30, 1); bloom(bg, lines, 8, 0.8);
  bg.drawImage(lines.canvas, 0, 0, W, H);
  for (const [x, y, c] of [[250, 190, COL.main], [410, 190, COL.main], [250, 520, COL.kolay], [410, 520, COL.kolay]]) {
    bg.save(); bg.shadowColor = c; bg.shadowBlur = 30; bg.fillStyle = '#fff'; bg.beginPath(); bg.arc(x, y, 20, 0, Math.PI * 2); bg.fill();
    bg.lineWidth = 9; bg.strokeStyle = c; bg.stroke(); bg.restore();
  }
  bg.save(); bg.globalCompositeOperation = 'lighter';
  const core = bg.createRadialGradient(cx, cy, 0, cx, cy, 170);
  core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.12, 'rgba(255,220,200,.95)'); core.addColorStop(0.35, 'rgba(255,70,90,.55)'); core.addColorStop(1, 'rgba(255,40,80,0)');
  bg.fillStyle = core; bg.beginPath(); bg.arc(cx, cy, 170, 0, Math.PI * 2); bg.fill();
  const sp = rand(9);
  for (let i = 0; i < 140; i++) {
    const a = sp() * Math.PI * 2, d = 30 + sp() ** 0.6 * 330, l = 8 + sp() * 34;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8;
    bg.strokeStyle = sp() < 0.5 ? 'rgba(255,210,120,.9)' : 'rgba(255,120,140,.85)';
    bg.lineWidth = 1.5 + sp() * 2.5; bg.beginPath(); bg.moveTo(x, y); bg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.8); bg.stroke();
  }
  bg.restore();
  const card = (x, y, rot, col, val, label) => kit.html(
    `<div style="font:700 20px 'JetBrains Mono';color:${col};margin-bottom:8px">${label}</div><div style="font:800 40px 'JetBrains Mono';color:#fff">let hiz = <span style="color:${col}">${val}</span></div>`,
    { left: x + 'px', top: y + 'px', padding: '16px 24px 20px', borderRadius: '16px',
      background: 'linear-gradient(160deg, rgba(40,44,70,.92), rgba(14,15,30,.92))', border: `3px solid ${col}`,
      boxShadow: `0 0 40px ${col}88, 0 30px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.25)`,
      transform: `perspective(900px) rotateY(${rot}deg) rotateZ(${rot / 6}deg)` }, 85);
  card(930, 110, -18, COL.main, 8, 'main');
  card(950, 420, -22, COL.kolay, 3, 'kolay-mod');
  kit.brand({ title: '*ÇAKIŞMA!*', accent: 'Git neden durur, sen ne yaparsın?', topic: TOPIC, minutes: MIN, tint: '#FF3B4E' });
}

// ------------------------------------------------------------------ 3. the paper map on a desk
function paperMap(PW, PH) {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH;
  const x = c.getContext('2d');
  x.fillStyle = '#F4EFE3'; x.fillRect(0, 0, PW, PH);
  const r = rand(21);
  for (let i = 0; i < 26000; i++) { x.fillStyle = `rgba(90,70,40,${r() * 0.05})`; x.fillRect(r() * PW, r() * PH, 1.5, 1.5); }
  x.strokeStyle = 'rgba(160,140,110,.28)'; x.lineWidth = 1.2;
  for (let gx = 0; gx < PW; gx += 40) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, PH); x.stroke(); }
  for (let gy = 0; gy < PH; gy += 40) { x.beginPath(); x.moveTo(0, gy); x.lineTo(PW, gy); x.stroke(); }
  const P = (col, lane) => [120 + col * 175, 300 + lane * 150];
  x.lineCap = 'round'; x.lineJoin = 'round';
  const PC = { main: '#2350D8', ses: '#0FA37F', kolay: '#D63384', remote: '#6D4BD8' };
  for (const ed of G.e) { x.strokeStyle = PC[ed.line]; x.lineWidth = 22; x.beginPath(); ed.pts.map(([a, b]) => P(a, b)).forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke(); }
  const names = { A: 'İlk sürüm', B: 'Skor', C: 'Gökyüzü', D: 'Kalkan', E: 'Süre', F: 'Müzik', G: 'Başlık', M: 'Birleşim', H: 'hiz = 3', I: 'hiz = 8', R: 'Çözüm', K: 'Renkli gemi', J: 'Seviye 2', N: 'pull' };
  for (const cm of G.c) {
    const [px, py] = P(cm.col, cm.lane);
    x.beginPath(); x.arc(px, py, cm.merge ? 26 : 18, 0, Math.PI * 2); x.fillStyle = '#FFFDF8'; x.fill();
    x.lineWidth = cm.merge ? 11 : 9; x.strokeStyle = cm.merge ? '#1B1F2A' : PC[cm.line]; x.stroke();
    x.save(); x.translate(px - 6, py - (cm.lane ? -60 : 44)); if (!cm.lane) x.rotate(-0.6);
    x.font = '700 30px Barlow'; x.fillStyle = '#1B1F2A'; x.textAlign = 'left'; x.fillText(names[cm.id], 0, 0); x.restore();
  }
  x.font = '800 64px "Barlow Condensed"'; x.fillStyle = '#1B1F2A'; x.fillText('YILDIZ AVCISI · HAT HARİTASI', 110, 120);
  x.fillStyle = '#2350D8'; x.fillRect(110, 140, 560, 10);
  return c;
}
function polaroid(bg, x, y, rot, f, cap) {
  const pc = document.createElement('canvas'); pc.width = 260 * DPR; pc.height = 300 * DPR;
  const p = pc.getContext('2d'); p.scale(DPR, DPR);
  p.fillStyle = '#FBF8F0'; p.fillRect(0, 0, 260, 300); game(p, 16, 16, 228, 210, f, 1.3);
  p.font = '600 26px Barlow'; p.fillStyle = '#333'; p.textAlign = 'center'; p.fillText(cap, 130, 272);
  bg.save(); bg.translate(x, y); bg.rotate(rot); bg.shadowColor = 'rgba(0,0,0,.55)'; bg.shadowBlur = 30; bg.shadowOffsetY = 14;
  bg.drawImage(pc, -130, -150, 260, 300); bg.restore();
}
function woodDesk(bg, seed = 4) {
  const wood = bg.createLinearGradient(0, 0, W, H);
  wood.addColorStop(0, '#5A3620'); wood.addColorStop(0.5, '#7A4A2A'); wood.addColorStop(1, '#3C2414');
  bg.fillStyle = wood; bg.fillRect(0, 0, W, H);
  const r = rand(seed);
  for (let i = 0; i < 260; i++) {
    const y = r() * H, a = 0.03 + r() * 0.08;
    bg.strokeStyle = r() < 0.5 ? `rgba(30,15,5,${a})` : `rgba(255,210,160,${a * 0.6})`;
    bg.lineWidth = 0.6 + r() * 2.4;
    bg.beginPath(); bg.moveTo(-10, y);
    for (let xx = 0; xx <= W + 20; xx += 40) bg.lineTo(xx, y + Math.sin(xx * 0.004 + i) * 8 + (xx / W) * 30);
    bg.stroke();
  }
  const light = bg.createRadialGradient(1000, 120, 30, 1000, 120, 900);
  light.addColorStop(0, 'rgba(255,220,160,.55)'); light.addColorStop(0.5, 'rgba(255,190,120,.12)'); light.addColorStop(1, 'rgba(0,0,0,0)');
  bg.fillStyle = light; bg.fillRect(0, 0, W, H);
}
function desk() {
  const bg = layer(1);
  woodDesk(bg);
  const PW = 2200, PH = 680, map = paperMap(PW, PH);
  const quad = [[560, 120], [1250, 140], [1250, 600], [330, 610]];
  shadowOf(bg, quad, 24, 30, 22, 0.55);
  const Hm = drawQuad(bg, map, PW, PH, quad, 26);
  const sh = bg.createLinearGradient(0, 160, 0, 700); sh.addColorStop(0, 'rgba(255,230,190,.10)'); sh.addColorStop(1, 'rgba(40,20,0,.28)');
  bg.save(); bg.beginPath(); quad.forEach(([a, b], i) => (i ? bg.lineTo(a, b) : bg.moveTo(a, b))); bg.clip(); bg.fillStyle = sh; bg.fillRect(0, 0, W, H); bg.restore();
  polaroid(bg, 1180, 600, -0.1, { score: 1, sky: 1, shield: 1, title: 1, music: 1 }, 'başlık ekranı');
  depthOfField(bg, 90, 300, 3.5);
  const [px, py] = Hm((120 + 10 * 175) / PW, 300 / PH);
  bg.save(); bg.filter = 'blur(6px)'; bg.fillStyle = 'rgba(0,0,0,.5)'; bg.beginPath(); bg.ellipse(px + 30, py + 8, 26, 9, 0.3, 0, Math.PI * 2); bg.fill(); bg.restore();
  bg.strokeStyle = '#C9CED8'; bg.lineWidth = 4; bg.beginPath(); bg.moveTo(px, py); bg.lineTo(px + 6, py - 60); bg.stroke();
  const orb = bg.createRadialGradient(px - 4, py - 84, 3, px + 6, py - 72, 34);
  orb.addColorStop(0, '#FFC2C8'); orb.addColorStop(0.3, '#F2283C'); orb.addColorStop(1, '#6A0010');
  bg.fillStyle = orb; bg.beginPath(); bg.arc(px + 6, py - 74, 30, 0, Math.PI * 2); bg.fill();
  kit.html('BURADASINIZ', { left: `${px - 150}px`, top: `${py - 150}px`, font: '900 28px "Barlow Condensed"', color: '#fff', background: '#E63946', padding: '6px 14px', borderRadius: '6px', letterSpacing: '2px', boxShadow: '0 10px 24px rgba(0,0,0,.45)', transform: 'rotate(-4deg)' }, 85);
  kit.brand({ title: "GIT'İ *HARİTAYLA* ANLA", accent: 'bir projenin bütün geçmişi, tek hatta', topic: TOPIC, minutes: MIN, tint: '#FFB45A' });
}

// ------------------------------------------------------------------ 4. a branch is a 41-byte label
function bytes() {
  const bg = layer(1);
  const sky = bg.createRadialGradient(900, 300, 20, 900, 300, 900);
  sky.addColorStop(0, '#12345A'); sky.addColorStop(0.5, '#08182E'); sky.addColorStop(1, '#02060D');
  bg.fillStyle = sky; bg.fillRect(0, 0, W, H);
  const cam = camera({ f: 800, camH: 260, horizon: 330, theta: 0, x0: 0, z0: 400 });
  groundGrid(bg, cam, '#4FA3FF', 0.18);
  // the 40-character id raining behind
  const r = rand(17);
  bg.save(); bg.font = '700 18px "JetBrains Mono"';
  for (let i = 0; i < 90; i++) {
    const x = 560 + r() * 720, y = r() * 330, a = 0.05 + r() * 0.22;
    let s = ''; for (let k = 0; k < 18; k++) s += '0123456789abcdef'[Math.floor(r() * 16)];
    bg.fillStyle = `rgba(120,190,255,${a})`; bg.fillText(s, x, y);
  }
  bg.restore();
  bokeh(bg, 24, 21, ['#4FA3FF', '#FF9A3C', '#FFD23F'], 0, 400, 6, 40, 0.4);
  // giant glowing "41"
  const big = off();
  big.font = '400 470px Anton'; big.textAlign = 'center'; big.textBaseline = 'alphabetic';
  big.lineWidth = 10; big.strokeStyle = '#FF9A3C'; big.strokeText('41', 1090, 470);
  big.fillStyle = 'rgba(255,154,60,.10)'; big.fillText('41', 1090, 470);
  bloom(bg, big, 30, 0.9); bloom(bg, big, 8, 0.8); bg.drawImage(big.canvas, 0, 0, W, H);
  // the luggage tag "kalkan", hanging in front
  const tag = document.createElement('canvas'); tag.width = 620; tag.height = 250;
  const t = tag.getContext('2d');
  const tg = t.createLinearGradient(0, 0, 0, 250); tg.addColorStop(0, '#FFB25C'); tg.addColorStop(1, '#E07214');
  t.fillStyle = tg; t.beginPath(); t.moveTo(90, 0); t.lineTo(600, 0); t.quadraticCurveTo(620, 0, 620, 20); t.lineTo(620, 230); t.quadraticCurveTo(620, 250, 600, 250); t.lineTo(90, 250); t.lineTo(0, 125); t.closePath(); t.fill();
  t.fillStyle = '#FFE3C2'; t.beginPath(); t.arc(80, 125, 22, 0, Math.PI * 2); t.fill();
  t.fillStyle = '#0B0D14'; t.beginPath(); t.arc(80, 125, 13, 0, Math.PI * 2); t.fill();
  t.fillStyle = '#FFFFFF'; t.font = '800 112px "JetBrains Mono"'; t.textBaseline = 'middle'; t.fillText('kalkan', 150, 118);
  t.fillStyle = 'rgba(11,13,20,.55)'; t.font = '700 26px "JetBrains Mono"'; t.fillText('.git/refs/heads/kalkan', 156, 206);
  const q = card3d(880, 300, 480, 194, 0.25, -0.55, -0.12);
  shadowOf(bg, q, 30, 60, 24, 0.6);
  drawQuad(bg, tag, 620, 250, q, 18);
  const hole = [lerp(q[0][0], q[3][0], 0.5) + 36, lerp(q[0][1], q[3][1], 0.5)];
  bg.strokeStyle = 'rgba(255,240,220,.85)'; bg.lineWidth = 3;
  bg.beginPath(); bg.moveTo(hole[0], hole[1]); bg.quadraticCurveTo(hole[0] - 90, hole[1] - 140, hole[0] - 40, -20); bg.stroke();
  kit.brand({ title: 'DAL = *41 BAYT*', accent: 'kopya değil, küçük bir etiket', topic: TOPIC, minutes: MIN, tint: '#FF9A3C' });
}

// ------------------------------------------------------------------ 5. the "final_final" chaos, cut by one clean line
function chaos() {
  const bg = layer(1);
  const sky = bg.createLinearGradient(0, 0, W, H);
  sky.addColorStop(0, '#1A1020'); sky.addColorStop(0.6, '#2A1426'); sky.addColorStop(1, '#0A0610');
  bg.fillStyle = sky; bg.fillRect(0, 0, W, H);
  const warm = bg.createRadialGradient(980, 300, 10, 980, 300, 700);
  warm.addColorStop(0, 'rgba(255,170,90,.35)'); warm.addColorStop(1, 'rgba(0,0,0,0)');
  bg.fillStyle = warm; bg.fillRect(0, 0, W, H);
  bokeh(bg, 30, 31, ['#FFB84D', '#FF3D9A', '#3D6BFF'], 0, H, 8, 44, 0.3);
  const names = ['odev_son.docx', 'odev_son2.docx', 'odev_GERCEKTEN_son.docx', 'odev_son_bunu_kullan.docx', 'odev_FINAL_v3.docx', 'odev_son (1).docx', 'odev_eski.docx', 'odev_Can_duzeltti.docx'];
  const doc = (name, crossed) => {
    const c = document.createElement('canvas'); c.width = 420; c.height = 540;
    const x = c.getContext('2d');
    x.fillStyle = '#FBF8F2'; x.fillRect(0, 0, 420, 540);
    x.fillStyle = '#2B5BD7'; x.fillRect(0, 0, 420, 70);
    x.fillStyle = 'rgba(30,30,40,.22)';
    for (let i = 0; i < 11; i++) x.fillRect(34, 110 + i * 30, 300 + ((i * 53) % 60), 10);
    x.fillStyle = '#1B1F2A'; x.font = '700 34px Barlow';
    const base = name.replace('.docx', ''), cut = base.indexOf('_', 5);
    x.fillText(cut > 0 ? base.slice(0, cut) : base, 34, 470); if (cut > 0) x.fillText(base.slice(cut) + '.docx', 34, 510);
    if (crossed) { x.strokeStyle = '#E63946'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, 120); x.lineTo(380, 420); x.moveTo(380, 120); x.lineTo(40, 420); x.stroke(); }
    return c;
  };
  const r = rand(8);
  const spots = [[700, 170], [980, 150], [1180, 230], [760, 470], [1040, 430], [1230, 520], [900, 640], [620, 330]];
  spots.forEach(([cx, cy], i) => {
    const q = card3d(cx, cy, 170 + r() * 40, 220 + r() * 50, (r() - 0.5) * 1.1, (r() - 0.5) * 1.3, (r() - 0.5) * 0.9);
    shadowOf(bg, q, 16, 26, 14, 0.55);
    drawQuad(bg, doc(names[i], i % 3 !== 1), 420, 540, q, 10);
  });
  depthOfField(bg, 0, 260, 3);
  // one clean glowing line cuts through the mess
  const lines = off();
  lines.lineCap = 'round';
  const pts = [[560, 620], [760, 520], [960, 420], [1160, 320], [1340, 230]];
  for (const [lw, c, a] of [[30, '#3D6BFF', 1], [9, '#EEF2FF', 0.85]]) { lines.globalAlpha = a; lines.strokeStyle = c; lines.lineWidth = lw; lines.beginPath(); pts.forEach(([x, y], i) => (i ? lines.lineTo(x, y) : lines.moveTo(x, y))); lines.stroke(); }
  lines.globalAlpha = 1;
  for (const [x, y] of pts.slice(0, 4)) { lines.fillStyle = '#fff'; lines.beginPath(); lines.arc(x, y, 17, 0, Math.PI * 2); lines.fill(); lines.lineWidth = 8; lines.strokeStyle = '#3D6BFF'; lines.stroke(); }
  bloom(bg, lines, 40, 0.9); bloom(bg, lines, 10, 0.8); bg.drawImage(lines.canvas, 0, 0, W, H);
  kit.brand({ title: 'BUNA *SON!*', accent: 'Git ile sürüm kontrolü', topic: TOPIC, minutes: MIN, tint: '#FFB45A' });
}

// ------------------------------------------------------------------
const v = Math.max(1, Math.min(THUMBS.length, Number(new URLSearchParams(location.search).get('v')) || 1));
await kit.ready(['800 40px "JetBrains Mono"', '800 64px "Barlow Condensed"', '700 30px Barlow', '600 26px Barlow']);
({ neon, conflict, desk, bytes, chaos })[THUMBS[v - 1].id]();
window.__thumbs = { count: THUMBS.length, list: THUMBS };
window.__thumbReady = true;
