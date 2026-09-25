// The painted map: a miniature-style bird's-eye view of the city, drawn with Canvas 2D.
// Everything here is a pure function of the camera and a few options (no time-dependent state).
import * as G from './geo.js';

export const INK = '#2B1D14', PAPER = '#EFE2C4', EARTH = '#E2C993', EARTH_DK = '#CFAE6E', SEA = '#1E4A7E', SEA_LT = '#7FA7D6',
  GOLD = '#C29A3A', GOLD_LT = '#E3C46E', RED = '#B3362B', PURPLE = '#5E2F6B', GREEN = '#6E8F4E', CYPRESS = '#2C4A33', STONE = '#D8C7A2';
export const FONT = "'Alegreya', 'Georgia', serif", FONT_SC = "'Alegreya SC', 'Alegreya', 'Georgia', serif";

// seeded random so every frame paints the same map
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const S = {};   // precomputed scatter (houses, trees, fields)

export function initMap() {
  const r = rng(1453);
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  // settlements inside the walls in 1453: separate quarters with open land between them
  const quarters = [
    [G.P(41.0105, 28.9760), 0.55, 90], [G.P(41.0175, 28.9660), 0.5, 70], [G.P(41.0250, 28.9560), 0.42, 60],
    [G.P(41.0335, 28.9450), 0.35, 45], [G.P(41.0000, 28.9300), 0.4, 38], [G.P(41.0035, 28.9570), 0.35, 30],
    [G.P(41.0190, 28.9480), 0.3, 26], [G.P(41.0120, 28.9400), 0.3, 18],
  ];
  S.houses = [];
  for (const [c, rad, n] of quarters) for (let i = 0; i < n * 1.6 && S.houses.length < 800; i++) {
    const x = c[0] + gauss() * rad, y = c[1] + gauss() * rad * 0.8;
    if (G.inside(G.cityPoly, x, y) && distToLine(G.landWalls, x, y) > 0.12 && !near(S.houses, x, y, 0.055)) S.houses.push([x, y, r(), r() < 0.08]);
  }
  // Galata, Üsküdar and villages on the Bosphorus
  S.galata = [];
  const gpoly = [...G.galataWall, ...G.hornNorth.slice(0, 7)];
  for (let i = 0; i < 400; i++) {
    const x = -0.8 + r() * 1.5, y = -1.0 + r() * 0.8;
    if (G.inside(gpoly, x, y) && G.inside(G.europe, x, y) && !near(S.galata, x, y, 0.045)) S.galata.push([x, y, r(), false]);
  }
  S.villages = [];
  for (const [c, rad, n] of [[G.PLACES.uskudar, 0.4, 26], [G.P(41.042, 29.006), 0.25, 8], [G.P(41.078, 29.047), 0.2, 6], [G.P(41.0985, 29.070), 0.2, 6], [G.P(40.992, 29.032), 0.3, 12], [G.P(41.047, 28.934), 0.25, 8]])
    for (let i = 0; i < n * 2; i++) {
      const x = c[0] + gauss() * rad, y = c[1] + gauss() * rad * 0.8;
      const land = G.inside(G.europe, x, y) || G.inside(G.asia, x, y);
      if (land && !G.inside(G.cityPoly, x, y) && !near(S.villages, x, y, 0.07)) S.villages.push([x, y, r(), false]);
    }
  // fields and vineyards inside the walls (the city had shrunk)
  S.fields = [];
  for (let i = 0; i < 160; i++) {
    const x = -4.3 + r() * 5.2, y = -2.2 + r() * 4.6;
    if (G.inside(G.cityPoly, x, y) && distToLine(G.landWalls, x, y) > 0.2 && !near(S.houses, x, y, 0.16) && !near(S.fields, x, y, 0.28))
      S.fields.push([x, y, 0.1 + r() * 0.12, 0.06 + r() * 0.08, (r() - 0.5) * 0.9, r()]);
  }
  // hills as painted mounds: a few bumps per hill; trees gather in groves on their slopes
  S.hills = [];
  for (const [c, rad] of G.HILLS) {
    const n = 2 + Math.floor(r() * 3), bumps = [];
    for (let k = 0; k < n; k++) bumps.push([c[0] + (k - (n - 1) / 2) * rad * 0.5 + (r() - 0.5) * rad * 0.2, c[1] + (r() - 0.5) * rad * 0.25, rad * (0.35 + r() * 0.2), rad * (0.28 + r() * 0.18)]);
    bumps.sort((a, b) => a[1] - b[1]);
    S.hills.push(...bumps);
  }
  S.hills = S.hills.filter(([x, y]) => (G.inside(G.europe, x, y) || G.inside(G.asia, x, y)) && !G.inside(G.cityPoly, x, y));
  S.hills.sort((a, b) => a[1] - b[1]);
  S.trees = [];
  const grove = (cx, cy, rad, n) => {
    for (let i = 0; i < n * 3 && n > 0; i++) {
      const x = cx + gauss() * rad, y = cy + gauss() * rad * 0.6;
      const land = G.inside(G.europe, x, y) || G.inside(G.asia, x, y);
      if (!land || G.inside(G.cityPoly, x, y) || G.inside(gpoly, x, y) || near(S.trees, x, y, 0.07)) continue;
      S.trees.push([x, y, r() < 0.6 ? 1 : 0, 0.8 + r() * 0.45]); n--;
    }
  };
  for (const [x, y, w, h] of S.hills) grove(x + w * 0.3, y - h * 0.1, w * 0.45, 5 + Math.floor(r() * 5));
  for (let i = 0; i < 60; i++) grove(-9 + r() * 20, -11 + r() * 15, 0.25, 3);
  for (let i = 0; i < 26; i++) grove(-9 + r() * 5.5, -4 + r() * 8, 0.3, 4);
  // orchards and gardens inside the walls: round trees only
  S.gardens = [];
  for (let i = 0; i < 900 && S.gardens.length < 260; i++) {
    const x = -4.3 + r() * 5.2, y = -2.2 + r() * 4.6;
    if (!G.inside(G.cityPoly, x, y) || distToLine(G.landWalls, x, y) < 0.15 || near(S.houses, x, y, 0.1) || near(S.gardens, x, y, 0.06)) continue;
    if (S.fields.some(f => Math.hypot(f[0] - x, f[1] - y) < 0.16)) continue;
    const cl = Math.sin(x * 3.1) * Math.cos(y * 2.7);
    if (cl < 0.15) continue;
    S.gardens.push([x, y, 0, 0.8 + r() * 0.3]);
  }
  // watercolour washes on the land
  S.washes = [];
  for (let i = 0; i < 40; i++) S.washes.push([-10 + r() * 22, -12 + r() * 18, 0.8 + r() * 1.8, r()]);
  for (const [x, y] of [[G.PLACES.camp[0], G.PLACES.camp[1]]]) S.trees = S.trees.filter(t => Math.hypot(t[0] - x, t[1] - y) > 0.5);
  S.trees.sort((a, b) => a[1] - b[1]);
  S.houses.sort((a, b) => a[1] - b[1]);
  S.waves = makeWaveTile();
  S.paper = makePaperTile();
  S.landLen = G.lineLength(G.europe.slice(0, -3)) + G.lineLength(G.asia.slice(0, -4));
}
function near(list, x, y, d) { for (const p of list) if (Math.abs(p[0] - x) < d && Math.abs(p[1] - y) < d) return true; return false; }
function distToLine(line, x, y) {
  let best = 1e9;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i];
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l));
    best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y));
  }
  return best;
}

// miniature waves: rows of small curls, as in Ottoman painted maps
function makeWaveTile() {
  const c = document.createElement('canvas'); c.width = 96; c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(160,196,236,0.55)'; g.lineWidth = 1.6; g.lineCap = 'round';
  const curl = (x, y) => { g.beginPath(); g.moveTo(x - 12, y + 3); g.bezierCurveTo(x - 7, y - 5, x + 2, y - 6, x + 5, y - 1); g.bezierCurveTo(x + 7, y + 3, x + 2, y + 5, x - 0.5, y + 2); g.stroke(); };
  curl(24, 20); curl(72, 20); curl(0, 52); curl(48, 52); curl(96, 52);
  g.strokeStyle = 'rgba(12,32,70,0.35)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(40, 34); g.quadraticCurveTo(46, 30, 52, 34); g.stroke();
  g.beginPath(); g.moveTo(88, 2); g.quadraticCurveTo(94, -2, 100, 2); g.moveTo(-8, 2); g.quadraticCurveTo(-2, -2, 4, 2); g.stroke();
  return c;
}
function makePaperTile() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), img = g.createImageData(256, 256), r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 40 + (r() < 0.004 ? -60 : 0);
    img.data[i] = v; img.data[i + 1] = v * 0.97; img.data[i + 2] = v * 0.9; img.data[i + 3] = 26;
  }
  g.putImageData(img, 0, 0);
  // faint fibres
  g.strokeStyle = 'rgba(90,60,30,0.06)';
  for (let i = 0; i < 60; i++) { const x = r() * 256, y = r() * 256, a = r() * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); }
  return c;
}

// ----------------------------------------------------------------------------------------------
// view: { W, H, dpr, cx, cy, s, vx, vy } — world point (cx, cy) sits at screen (vx, vy), s px per km
export const toScreen = (v, x, y) => [(x - v.cx) * v.s + v.vx, (y - v.cy) * v.s + v.vy];
export function worldTransform(ctx, v) { ctx.setTransform(v.s * v.dpr, 0, 0, v.s * v.dpr, (v.vx - v.cx * v.s) * v.dpr, (v.vy - v.cy * v.s) * v.dpr); }
export function screenTransform(ctx, v) { ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); }

function path(ctx, pts, close) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

// o: { reveal (0..1 ink drawing of the coasts), fields (0..1), sophiaMosque (0..1), wallsDamage (0..1), moatShow }
export function drawMap(ctx, v, o = {}) {
  const reveal = o.reveal ?? 1, px = 1 / v.s;
  worldTransform(ctx, v);
  const fill = smooth01(0.35, 0.85, reveal);
  // sea
  ctx.fillStyle = PAPER; ctx.fillRect(v.cx - 60, v.cy - 60, 120, 120);
  ctx.globalAlpha = fill;
  ctx.fillStyle = SEA; ctx.fillRect(v.cx - 60, v.cy - 60, 120, 120);
  const pat = ctx.createPattern(S.waves, 'repeat');
  const k = Math.max(0.55, Math.min(1.3, v.s / 160));
  pat.setTransform(new DOMMatrix([k * px, 0, 0, k * px, 0, 0]));
  ctx.fillStyle = pat; ctx.fillRect(v.cx - 60, v.cy - 60, 120, 120);
  ctx.globalAlpha = 1;
  // land
  for (const land of [G.europe, G.asia]) {
    path(ctx, land, true);
    ctx.save(); ctx.globalAlpha = fill;
    ctx.fillStyle = EARTH; ctx.fill();
    ctx.restore();
  }
  if (fill > 0) {
    // shallow water glow along the shore
    ctx.save(); ctx.globalAlpha = 0.35 * fill; ctx.strokeStyle = '#9FC1E4'; ctx.lineWidth = 16 * px; ctx.lineJoin = 'round';
    path(ctx, G.europe, true); ctx.stroke(); path(ctx, G.asia, true); ctx.stroke(); ctx.restore();
    for (const land of [G.europe, G.asia]) { path(ctx, land, true); ctx.fillStyle = EARTH; ctx.globalAlpha = fill; ctx.fill(); ctx.globalAlpha = 1; }
    drawHills(ctx, v, fill);
  }
  // inked coastline (drawn stroke by stroke at the start)
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * px; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (reveal < 1) ctx.setLineDash([S.landLen * reveal, S.landLen * 2]);
  path(ctx, G.europe.slice(0, -3)); ctx.stroke();
  if (reveal < 1) ctx.setLineDash([S.landLen * reveal * 0.8, S.landLen * 2]);
  path(ctx, G.asia.slice(0, -4)); ctx.stroke();
  ctx.setLineDash([]);
  // gold rule just inside the coast
  if (fill > 0) {
    ctx.save(); ctx.globalAlpha = 0.55 * fill; ctx.strokeStyle = GOLD; ctx.lineWidth = 1 * px;
    ctx.translate(0, 3.5 * px); path(ctx, G.europe.slice(0, -3)); ctx.stroke(); path(ctx, G.asia.slice(0, -4)); ctx.stroke(); ctx.restore();
  }
  const detail = smooth01(0.7, 1, reveal);
  if (detail <= 0) return;
  ctx.globalAlpha = detail;
  path(ctx, G.cityPoly, true); ctx.fillStyle = 'rgba(250,236,205,0.45)'; ctx.fill();
  drawFields(ctx, v, o.fields ?? 0.6);
  drawWalls(ctx, v, o);
  drawGalata(ctx, v);
  drawHouses(ctx, v, S.houses);
  drawHouses(ctx, v, S.galata);
  drawHouses(ctx, v, S.villages);
  drawSophia(ctx, v, o.sophiaMosque || 0);
  drawChurch(ctx, v, G.PLACES.apostles, 0.9);
  for (const c of CHURCHES) drawChurch(ctx, v, c, 0.7);
  drawHippodrome(ctx, v);
  drawColumn(ctx, v, G.P(41.0087, 28.9712));
  drawPalace(ctx, v, G.PLACES.blachernae);
  drawTrees(ctx, v);
  drawAnadoluHisar(ctx, v);
  if (o.rumeliHisar !== undefined) drawRumeliHisar(ctx, v, o.rumeliHisar);
  ctx.globalAlpha = 1;
  drawNames(ctx, v, detail * (o.names ?? 1));
}

// quiet place names that are always on the map
const NAMES = [
  ['Marmara Denizi', G.P(40.985, 28.965), 'sea', 22], ['Boğaz', G.P(41.058, 29.043), 'sea', 20], ['Haliç', G.P(41.047, 28.9455), 'sea', 16],
  ['Galata', G.P(41.0285, 28.973), 'town', 15], ['Üsküdar', G.P(41.0205, 29.022), 'town', 15], ['Kadıköy', G.P(40.986, 29.04), 'town', 14],
];
function drawNames(ctx, v, a) {
  if (a <= 0.01) return;
  screenTransform(ctx, v);
  const u = v.W < 700 ? 0.85 : Math.max(0.9, Math.min(1.25, Math.min(v.W, v.H * 1.78) / 1600));
  ctx.save(); ctx.globalAlpha = a * 0.9; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [t, [x, y], kind, size] of NAMES) {
    const [sx, sy] = toScreen(v, x, y);
    if (sx < -100 || sx > v.W + 100 || sy < -50 || sy > v.H + 50) continue;
    if (kind === 'sea') { ctx.font = `italic 500 ${size * u}px ${FONT}`; ctx.letterSpacing = 3 * u + 'px'; ctx.fillStyle = 'rgba(226,236,248,0.85)'; ctx.fillText(t, sx, sy); }
    else { ctx.font = `700 ${size * u}px ${FONT_SC}`; ctx.letterSpacing = '1px'; ctx.lineWidth = 4 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(247,238,219,0.85)'; ctx.strokeText(t, sx, sy); ctx.fillStyle = 'rgba(43,29,20,0.8)'; ctx.fillText(t, sx, sy); }
  }
  ctx.restore();
  worldTransform(ctx, v);
}

function drawHills(ctx, v, a) {
  const px = 1 / v.s;
  // soft washes first, on land only
  ctx.save(); ctx.beginPath();
  for (const land of [G.europe, G.asia]) { ctx.moveTo(land[0][0], land[0][1]); for (const [x, y] of land) ctx.lineTo(x, y); ctx.closePath(); }
  ctx.clip();
  for (const [x, y, rad, k] of S.washes) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const c = k < 0.5 ? '205,178,120' : '226,208,160';
    g.addColorStop(0, `rgba(${c},${0.35 * a})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.restore();
  // mounds standing on the map, back to front, each with a light top and ink crest
  for (const [x, y, w, h] of S.hills) {
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, y - h, 0, y);
    g.addColorStop(0, '#B7BE78'); g.addColorStop(0.55, '#C9C686'); g.addColorStop(1, 'rgba(226,201,147,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.bezierCurveTo(x - w * 0.8, y - h * 0.9, x - w * 0.35, y - h * 1.05, x, y - h); ctx.bezierCurveTo(x + w * 0.4, y - h * 0.95, x + w * 0.85, y - h * 0.7, x + w, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(70,60,30,0.6)'; ctx.lineWidth = 1.3 * px;
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.bezierCurveTo(x - w * 0.8, y - h * 0.9, x - w * 0.35, y - h * 1.05, x, y - h); ctx.bezierCurveTo(x + w * 0.4, y - h * 0.95, x + w * 0.85, y - h * 0.7, x + w, y); ctx.stroke();
    // shading strokes on the right flank
    ctx.strokeStyle = 'rgba(90,80,40,0.28)'; ctx.lineWidth = 1 * px; ctx.beginPath();
    for (let i = 1; i <= 5; i++) { const f = 0.3 + i * 0.11, sx = x + w * f, sy = y - h * (1 - f * f) * 0.9; ctx.moveTo(sx, sy + h * 0.05); ctx.lineTo(sx - w * 0.06, sy + h * 0.28); }
    ctx.stroke();
    ctx.restore();
  }
}

function drawFields(ctx, v, a) {
  if (a <= 0) return;
  const px = 1 / v.s;
  ctx.save(); ctx.globalAlpha *= a;
  for (const [x, y, w, h, rot, kind] of S.fields) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = kind < 0.5 ? '#B9BF7A' : '#C7B46A'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(80,90,40,0.55)'; ctx.lineWidth = 0.8 * px;
    ctx.beginPath();
    const rows = kind < 0.5 ? 5 : 4;
    for (let i = 1; i < rows; i++) { const yy = -h / 2 + h * i / rows; ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,45,20,0.5)'; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

// houses stand upright on the map, like in a miniature: cream wall, red roof
function drawHouses(ctx, v, list) {
  const L = v.cx - v.W / 2 / v.s - 0.2, R = v.cx + v.W / 2 / v.s + 0.2, T = v.cy - v.H / v.s, B = v.cy + v.H / v.s;
  // icon size in pixels: grows with zoom but never drops below legible
  const w = Math.max(6.5, Math.min(22, v.s * 0.036)), h = w * 0.62, step = v.s < 110 ? 2 : 1;
  const vis = [];
  for (let i = 0; i < list.length; i += step) { const p = list[i]; if (p[0] > L && p[0] < R && p[1] > T && p[1] < B) vis.push(p); }
  const sc = vis.map(([x, y, r, church]) => { const [sx, sy] = toScreen(v, x, y); return [sx, sy, r, church]; });
  screenTransform(ctx, v);
  ctx.beginPath(); for (const [x, y, r] of sc) { const ww = w * (0.8 + r * 0.5); ctx.rect(x - ww / 2, y - h, ww, h); }
  ctx.fillStyle = '#F4E9D0'; ctx.fill();
  ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(43,29,20,0.75)'; ctx.stroke();
  ctx.beginPath();
  for (const [x, y, r] of sc) { const ww = w * (0.8 + r * 0.5); ctx.moveTo(x - ww / 2 - 1, y - h); ctx.lineTo(x - ww * 0.3, y - h - w * 0.42); ctx.lineTo(x + ww * 0.3, y - h - w * 0.42); ctx.lineTo(x + ww / 2 + 1, y - h); ctx.closePath(); }
  ctx.fillStyle = '#B8452F'; ctx.fill(); ctx.stroke();
  if (w > 8) { ctx.beginPath(); for (const [x, y, r] of sc) ctx.rect(x - w * 0.1 + (r - 0.5) * w * 0.3, y - h * 0.62, w * 0.2, h * 0.42); ctx.fillStyle = 'rgba(43,29,20,0.75)'; ctx.fill(); }
  worldTransform(ctx, v);
  for (const [x, y, r, church] of vis) if (church) drawChurch(ctx, v, [x + 0.02, y - 0.01], 0.55);
}

function drawChurch(ctx, v, [x, y], k) {
  const px = 1 / v.s, w = 0.09 * k, h = 0.05 * k;
  ctx.fillStyle = '#F1E4C6'; ctx.strokeStyle = INK; ctx.lineWidth = 0.8 * px;
  ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8C9AA6';
  ctx.beginPath(); ctx.arc(x, y - h, w * 0.3, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - h - w * 0.3); ctx.lineTo(x, y - h - w * 0.45); ctx.stroke();
}

const CHURCHES = [G.P(41.0215, 28.9555), G.P(41.0312, 28.9395), G.P(40.9985, 28.9285), G.P(41.0293, 28.9467), G.P(41.0165, 28.9420), G.P(41.0060, 28.9690)];
function drawHippodrome(ctx, v) {
  const [x, y] = G.PLACES.hippodrome, px = 1 / v.s, L = 0.45, w = 0.11;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35);
  ctx.fillStyle = '#E6D3A6'; ctx.strokeStyle = INK; ctx.lineWidth = 1 * px;
  ctx.beginPath(); ctx.moveTo(-L / 2, -w / 2); ctx.lineTo(L / 2 - w / 2, -w / 2); ctx.arc(L / 2 - w / 2, 0, w / 2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-L / 2, w / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-L * 0.38, 0); ctx.lineTo(L * 0.3, 0); ctx.stroke();
  ctx.restore();
}
function drawColumn(ctx, v, [x, y]) {
  const px = 1 / v.s, h = 0.14;
  ctx.fillStyle = '#9A6A55'; ctx.strokeStyle = INK; ctx.lineWidth = 0.9 * px;
  ctx.beginPath(); ctx.rect(x - 0.008, y - h, 0.016, h); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(x - 0.014, y - 0.012, 0.028, 0.012); ctx.fill(); ctx.stroke();
}
function drawPalace(ctx, v, [x, y]) {
  const px = 1 / v.s, w = 0.16, h = 0.075;
  ctx.fillStyle = '#EADBB8'; ctx.strokeStyle = INK; ctx.lineWidth = 0.9 * px;
  ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PURPLE;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.rect(x - w / 2 + 0.012 + i * 0.05, y - h * 0.7, 0.018, 0.03); ctx.fill(); }
  ctx.fillStyle = '#B8452F';
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 0.01, y - h); ctx.lineTo(x - w * 0.3, y - h - 0.03); ctx.lineTo(x + w * 0.3, y - h - 0.03); ctx.lineTo(x + w / 2 + 0.01, y - h); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// Hagia Sophia: great dome with half domes and buttresses; mosque = minaret + crescent finial
function drawSophia(ctx, v, mosque) {
  const [x, y] = G.PLACES.sophia, px = 1 / v.s, s = 0.26;
  ctx.save(); ctx.lineWidth = 1 * px; ctx.strokeStyle = INK;
  ctx.fillStyle = '#E9D6AE';
  ctx.beginPath(); ctx.rect(x - s * 0.62, y - s * 0.3, s * 1.24, s * 0.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E2CBA0';
  ctx.beginPath(); ctx.rect(x - s * 0.72, y - s * 0.38, s * 0.14, s * 0.38); ctx.rect(x + s * 0.58, y - s * 0.38, s * 0.14, s * 0.38); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7E8E9C';
  ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.2, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + s * 0.3, y - s * 0.3, s * 0.2, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E9D6AE'; ctx.beginPath(); ctx.rect(x - s * 0.3, y - s * 0.46, s * 0.6, s * 0.16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8B9AA8'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.46, s * 0.3, s * 0.26, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  // windows ring
  ctx.fillStyle = INK;
  for (let i = 0; i < 9; i++) ctx.fillRect(x - s * 0.26 + i * s * 0.065, y - s * 0.43, s * 0.025, s * 0.07);
  if (mosque > 0) {
    const mh = s * 1.05 * mosque;
    ctx.fillStyle = '#F2E6CC';
    ctx.beginPath(); ctx.rect(x + s * 0.8, y - mh, s * 0.07, mh); ctx.fill(); ctx.stroke();
    if (mosque > 0.9) {
      ctx.fillStyle = '#7E8E9C'; ctx.beginPath(); ctx.moveTo(x + s * 0.79, y - mh); ctx.lineTo(x + s * 0.835, y - mh - s * 0.16); ctx.lineTo(x + s * 0.88, y - mh); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x, y - s * 0.8, s * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8B9AA8'; ctx.beginPath(); ctx.arc(x + s * 0.02, y - s * 0.81, s * 0.037, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.4 * px;
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.72); ctx.lineTo(x, y - s * 0.84); ctx.moveTo(x - s * 0.04, y - s * 0.8); ctx.lineTo(x + s * 0.04, y - s * 0.8); ctx.stroke();
  }
  ctx.restore();
}

function drawTrees(ctx, v) {
  const L = v.cx - v.W / 2 / v.s - 0.3, R = v.cx + v.W / 2 / v.s + 0.3, T = v.cy - v.H / v.s, B = v.cy + v.H / v.s;
  const u = Math.max(8, Math.min(26, v.s * 0.05));
  const vis = S.trees.concat(S.gardens).filter(([x, y]) => x > L && x < R && y > T && y < B).map(([x, y, cyp, k]) => [...toScreen(v, x, y), cyp, k]);
  screenTransform(ctx, v);
  ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(25,35,18,0.8)';
  ctx.beginPath();
  for (const [x, y, cyp, k] of vis) if (!cyp) { const r = u * 0.42 * k; ctx.moveTo(x + r, y - r * 1.2); ctx.arc(x, y - r * 1.2, r, 0, Math.PI * 2); }
  ctx.fillStyle = '#5E8544'; ctx.fill(); ctx.stroke();
  ctx.beginPath();
  for (const [x, y, cyp, k] of vis) if (!cyp) { const r = u * 0.42 * k; ctx.moveTo(x - r * 0.2, y - r * 1.5); ctx.arc(x - r * 0.25, y - r * 1.45, r * 0.35, 0, Math.PI * 2); }
  ctx.fillStyle = 'rgba(190,210,130,0.55)'; ctx.fill();
  ctx.beginPath();
  for (const [x, y, cyp, k] of vis) if (cyp) { const hh = u * 1.25 * k, w = u * 0.24 * k; ctx.moveTo(x, y); ctx.quadraticCurveTo(x - w * 1.3, y - hh * 0.45, x, y - hh); ctx.quadraticCurveTo(x + w * 1.3, y - hh * 0.45, x, y); }
  ctx.fillStyle = CYPRESS; ctx.fill(); ctx.stroke();
  worldTransform(ctx, v);
}

// Theodosian walls: moat, outer wall, inner wall with towers; Blachernae without moat
function drawWalls(ctx, v, o) {
  const px = 1 / v.s, W = G.landWalls;
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  // moat outside (west)
  const moat = G.slice(W, 0, G.blachernaeFrom).map(([x, y]) => [x - 0.07, y]);
  ctx.strokeStyle = '#3F6E8E'; ctx.lineWidth = Math.max(2 * px, 0.028); path(ctx, moat); ctx.stroke();
  ctx.strokeStyle = 'rgba(160,196,236,0.6)'; ctx.lineWidth = Math.max(0.8 * px, 0.008); path(ctx, moat); ctx.stroke();
  // outer and inner walls
  const outer = G.slice(W, 0, 0.97).map(([x, y]) => [x - 0.035, y]);
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3 * px, 0.022); path(ctx, outer); ctx.stroke();
  ctx.strokeStyle = STONE; ctx.lineWidth = Math.max(1.6 * px, 0.014); path(ctx, outer); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(4.5 * px, 0.034); path(ctx, W); ctx.stroke();
  ctx.strokeStyle = '#E7D8B6'; ctx.lineWidth = Math.max(2.6 * px, 0.024); path(ctx, W); ctx.stroke();
  // sea walls
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.6 * px, 0.016);
  const inset = (line, d) => line.map((p, i) => { const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * d, p[1] + dx / l * d]; });
  const sm = inset(G.seaWallMarmara, -0.03), sh = inset(G.seaWallHorn, -0.03);
  path(ctx, sm); ctx.stroke(); path(ctx, sh); ctx.stroke();
  ctx.strokeStyle = STONE; ctx.lineWidth = Math.max(1.3 * px, 0.009); path(ctx, sm); ctx.stroke(); path(ctx, sh); ctx.stroke();
  // towers (96 on the inner land wall)
  const tw = Math.max(3.6 * px, 0.03);
  if (tw * v.s >= 3) {
    ctx.fillStyle = '#EFE2C4'; ctx.strokeStyle = INK; ctx.lineWidth = 0.9 * px;
    const n = 96;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const p = G.along(W, (i + 0.5) / n); ctx.rect(p.x - tw / 2, p.y - tw / 2, tw, tw); }
    ctx.fill(); ctx.stroke();
    if (tw * v.s > 9) {   // upright square towers with merlons when close
      const th = tw * 1.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = G.along(W, (i + 0.5) / n); ctx.rect(p.x - tw * 0.55, p.y - th, tw * 1.1, th); }
      ctx.fillStyle = '#E4D3AE'; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = G.along(W, (i + 0.5) / n); for (let k = 0; k < 3; k++) ctx.rect(p.x - tw * 0.55 + k * tw * 0.4, p.y - th - tw * 0.25, tw * 0.3, tw * 0.25); }
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = G.along(W, (i + 0.5) / n); ctx.rect(p.x - tw * 0.1, p.y - th * 0.7, tw * 0.2, tw * 0.35); }
      ctx.fillStyle = INK; ctx.fill();
    }
  }
}

function drawGalata(ctx, v) {
  const px = 1 / v.s;
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.4 * px, 0.014); path(ctx, G.galataWall); ctx.stroke();
  ctx.strokeStyle = STONE; ctx.lineWidth = Math.max(1.2 * px, 0.008); path(ctx, G.galataWall); ctx.stroke();
  const [x, y] = G.PLACES.galataTower, s = 0.1;
  ctx.fillStyle = '#E9D9B2'; ctx.strokeStyle = INK; ctx.lineWidth = 0.9 * px;
  ctx.beginPath(); ctx.rect(x - s * 0.22, y - s * 1.2, s * 0.44, s * 1.2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#B8452F'; ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 1.2); ctx.lineTo(x, y - s * 1.75); ctx.lineTo(x + s * 0.3, y - s * 1.2); ctx.closePath(); ctx.fill(); ctx.stroke();
}

function tower(ctx, px, x, y, w, h, roof) {
  ctx.fillStyle = STONE; ctx.strokeStyle = INK; ctx.lineWidth = 1 * px;
  ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.fill(); ctx.stroke();
  // stone courses
  ctx.save(); ctx.strokeStyle = 'rgba(43,29,20,0.28)'; ctx.lineWidth = 0.8 * px; ctx.beginPath();
  for (let yy = y - h * 0.12; yy > y - h; yy -= h * 0.12) { ctx.moveTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy); }
  ctx.stroke(); ctx.restore();
  ctx.fillStyle = INK; ctx.fillRect(x - w * 0.08, y - h * 0.62, w * 0.16, h * 0.14); ctx.fillRect(x - w * 0.08, y - h * 0.35, w * 0.16, h * 0.12);
  if (roof) { ctx.fillStyle = '#7E8E9C'; ctx.beginPath(); ctx.moveTo(x - w * 0.62, y - h); ctx.lineTo(x, y - h - w * 0.95); ctx.lineTo(x + w * 0.62, y - h); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else { ctx.fillStyle = STONE; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.rect(x - w / 2 + k * w * 0.27, y - h - w * 0.14, w * 0.19, w * 0.14); ctx.fill(); ctx.stroke(); } }
}
function curtain(ctx, px, pts, th) {
  ctx.fillStyle = '#CDBB94'; ctx.strokeStyle = INK; ctx.lineWidth = 1 * px;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by - th); ctx.lineTo(ax, ay - th); ctx.closePath(); ctx.fill(); ctx.stroke();
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / (th * 0.5)));
    for (let k = 0; k < n; k += 2) { const f = k / n, g = (k + 0.7) / n; ctx.beginPath(); ctx.moveTo(ax + (bx - ax) * f, ay + (by - ay) * f - th); ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f - th * 1.25); ctx.lineTo(ax + (bx - ax) * g, ay + (by - ay) * g - th * 1.25); ctx.lineTo(ax + (bx - ax) * g, ay + (by - ay) * g - th); ctx.fill(); ctx.stroke(); }
  }
}
function drawAnadoluHisar(ctx, v) {
  const [x, y] = G.PLACES.anadoluHisar, px = 1 / v.s, s = 0.1;
  curtain(ctx, px, [[x - s * 1.1, y + s * 0.2], [x - s * 0.9, y - s * 0.5], [x + s * 0.9, y - s * 0.55], [x + s * 1.2, y + s * 0.2]], s * 0.35);
  tower(ctx, px, x, y - s * 0.1, s * 0.6, s * 1.4, false);
}
// Rumeli Hisarı grows from its foundations (p = 0..1): three great towers joined by walls up the slope
export function drawRumeliHisar(ctx, v, p) {
  if (p <= 0) return;
  const [x, y] = G.PLACES.rumeliHisar, px = 1 / v.s, s = 0.13;
  const g = k => Math.max(0.02, Math.min(1, p * 1.2 - k * 0.1));
  ctx.save();
  const halil = [x + s * 0.9, y + s * 0.35], sarica = [x - s * 1.2, y - s * 0.5], zaganos = [x - s * 0.8, y + s * 1.0];
  curtain(ctx, px, [halil, [x + s * 0.2, y - s * 0.6], sarica, [x - s * 1.6, y + s * 0.3], zaganos, [x + s * 0.3, y + s * 1.1], halil], s * 0.4 * g(0));
  tower(ctx, px, ...sarica, s * 0.75, s * 1.9 * g(1), p > 0.9);
  tower(ctx, px, ...zaganos, s * 0.6, s * 1.4 * g(2), p > 0.9);
  tower(ctx, px, ...halil, s * 0.65, s * 1.6 * g(3), p > 0.9);
  ctx.restore();
}
function crenels(ctx, x, y, w, h) { const n = 4; ctx.beginPath(); for (let i = 0; i < n; i++) if (i % 2 === 0) ctx.rect(x + w * i / n, y - h, w / n, h); ctx.fillStyle = STONE; ctx.fill(); ctx.stroke(); }

export function paperGrain(ctx, v) {
  screenTransform(ctx, v);
  ctx.fillStyle = ctx.createPattern(S.paper, 'repeat');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillRect(0, 0, v.W, v.H);
  ctx.globalCompositeOperation = 'source-over';
}

export function smooth01(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
