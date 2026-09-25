// Draws the printed page (a school newspaper) into a 2D canvas.
// Everything is painted with code: masthead, two text columns, a sunset lighthouse "photo",
// and a test strip (grey wedge, colour patches, fine lines, shrinking text) that shows copy losses.
// Page units are millimetres on an A4 sheet (210 × 297); features are exported in page UV (top = 0).

export const PAGE_W_MM = 210;
export const PAGE_H_MM = 297;
export const TEX_W = 1536;
export const TEX_H = Math.round(TEX_W * PAGE_H_MM / PAGE_W_MM); // 2172

const K = TEX_W / PAGE_W_MM; // px per mm
const mm = v => v * K;

// Regions of interest in page UV (u → right, v → down), used by loupes and labels.
export const FEATURES = {
  masthead: { u: 0.5, v: 0.08 },
  headline: { u: 0.3, v: 0.175 },
  photo: { u0: 14 / 210, v0: 66 / 297, u1: 196 / 210, v1: 160 / 297 },
  lighthouse: { u: (14 + 182 * 0.722) / 210, v: (66 + 94 * 0.4) / 297 },
  lantern: { u: (14 + 182 * 0.722) / 210, v: (66 + 94 * 0.195) / 297 },
  sea: { u: (14 + 182 * 0.5) / 210, v: (66 + 94 * 0.86) / 297 },
  sky: { u: (14 + 182 * 0.45) / 210, v: (66 + 94 * 0.38) / 297 },
  sun: { u: (14 + 182 * 0.3) / 210, v: (66 + 94 * 0.6) / 297 },
  text: { u: 30 / 210, v: 190 / 297 },
  letter: { u: 20.5 / 210, v: 177.5 / 297 },
  wedge: { u: 60 / 210, v: 253 / 297 },
  wedgeLight: { u: 27 / 210, v: 253 / 297 },
  patches: { u: 156 / 210, v: 253 / 297 },
  lines: { u: 45 / 210, v: 272 / 297 },
  tiny: { u: 150 / 210, v: 275 / 297 },
  corner: { u: 0.035, v: 0.03 },
};

const FONT_HEAD = '"Playfair Display", Georgia, serif';
const FONT_BODY = '"Source Serif 4", Georgia, serif';
const FONT_SANS = '"Lexend", Arial, sans-serif';

export async function loadPageFonts() {
  const specs = [
    `900 60px ${FONT_HEAD}`, `700 60px ${FONT_HEAD}`, `italic 400 30px ${FONT_HEAD}`,
    `400 24px ${FONT_BODY}`, `italic 400 24px ${FONT_BODY}`, `600 24px ${FONT_BODY}`,
    `400 20px ${FONT_SANS}`, `600 20px ${FONT_SANS}`,
  ];
  const all = Promise.all(specs.map(s => document.fonts.load(s, 'ĞÜŞİÖÇğüşıöç')).concat(document.fonts.ready));
  await Promise.race([all, new Promise(r => setTimeout(r, 5000))]);
}

// deterministic random
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function drawPage(canvas) {
  canvas.width = TEX_W; canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.textBaseline = 'alphabetic';

  // ---- masthead
  const ink = '#111111';
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = `900 ${mm(12.5)}px ${FONT_HEAD}`;
  ctx.fillText('KÜÇÜK BİLİM GAZETESİ', mm(105), mm(25));
  ctx.fillRect(mm(14), mm(29), mm(182), mm(1.1));
  ctx.fillRect(mm(14), mm(31), mm(182), mm(0.35));
  ctx.font = `600 ${mm(3.1)}px ${FONT_SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText('SAYI 12', mm(14), mm(36.2));
  ctx.textAlign = 'center';
  ctx.fillText('OKUL BİLİM KULÜBÜ', mm(105), mm(36.2));
  ctx.textAlign = 'right';
  ctx.fillText('24 EYLÜL 2026', mm(196), mm(36.2));
  ctx.fillRect(mm(14), mm(38.4), mm(182), mm(0.35));

  // ---- headline + deck
  ctx.textAlign = 'left';
  ctx.font = `700 ${mm(11)}px ${FONT_HEAD}`;
  ctx.fillText('Işıkla yazan makine', mm(14), mm(51.5));
  ctx.font = `italic 400 ${mm(4.5)}px ${FONT_HEAD}`;
  ctx.fillStyle = '#333333';
  ctx.fillText('Lazer yazıcı bir sayfayı nasıl basar, fotokopi makinesi onu nasıl kopyalar?', mm(14), mm(59.5));

  // ---- photo
  const px = mm(14), py = mm(66), pw = mm(182), ph = mm(94);
  paintPhoto(ctx, px, py, pw, ph);
  ctx.fillStyle = ink;
  ctx.font = `italic 400 ${mm(2.9)}px ${FONT_BODY}`;
  ctx.fillText('Gün batımında deniz feneri. Renkli baskıda bu fotoğraf dört toner renginin minik noktalarından oluşur.', mm(14), mm(165));

  // ---- body text, two justified columns
  ctx.fillStyle = ink;
  const colW = mm(86), gap = mm(10), top = mm(176), lh = mm(4.75);
  const bodyFont = `400 ${mm(3.35)}px ${FONT_BODY}`;
  const col1 = [
    'Fotokopinin temelini Amerikalı fizikçi ve patent avukatı Chester Carlson attı. Carlson, 22 Ekim 1938\'de New York\'taki küçük laboratuvarında ilk kopyasını çekti. Cam bir levhaya “10-22-38 ASTORIA” yazmıştı. Yönteme, Yunanca “kuru yazı” anlamına gelen kserografi adı verildi.',
    'Bugünkü lazer yazıcılar da aynı ilkeyle çalışır. Işığa duyarlı bir tambur önce elektrikle yüklenir, sonra lazer ışığı yazılacak noktaların yükünü siler.',
  ];
  const col2 = [
    'Toner tozu yalnızca bu noktalara tutunur ve sıcak silindirlerle kâğıda eritilir. İlk lazer yazıcıyı 1971\'de Xerox\'ta Gary Starkweather geliştirdi; bir fotokopi makinesinin ışığını bilgisayarın yönettiği bir lazerle değiştirdi.',
    'Fotokopi makinesi ise sayfayı önce tarar, sonra aynı yöntemle yeniden basar. Büyüteçle bakarsanız renklerin minik noktalardan oluştuğunu görebilirsiniz.',
  ];
  // drop cap on the first paragraph
  ctx.font = `700 ${mm(11.4)}px ${FONT_HEAD}`;
  ctx.fillText('F', mm(14), top + lh * 1.72);
  const dropW = mm(8.2);
  let y = top;
  ctx.font = bodyFont;
  col1.forEach((p, i) => {
    y = paragraph(ctx, i === 0 ? p.slice(1) : p, mm(14), y, colW, lh, i === 0 ? { lines: 2, indent: dropW } : null) + lh * 0.45;
  });
  y = top;
  col2.forEach(p => { y = paragraph(ctx, p, mm(14) + colW + gap, y, colW, lh) + lh * 0.45; });
  ctx.fillRect(mm(14) + colW + gap / 2 - mm(0.12), top - mm(3.5), mm(0.25), mm(65));

  // ---- test strip
  const ty = mm(243);
  ctx.fillRect(mm(14), ty, mm(182), mm(0.35));
  ctx.font = `600 ${mm(2.6)}px ${FONT_SANS}`;
  ctx.fillText('BASKI TEST ŞERİDİ', mm(14), ty + mm(4.4));
  // grey wedge 0..100 %
  const wx = mm(14), wy = ty + mm(6.2), ww = mm(92), wh = mm(10);
  for (let i = 0; i <= 10; i++) {
    const g = Math.round(255 * (1 - i / 10));
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(wx + ww * i / 11, wy, ww / 11 + 0.5, wh);
  }
  ctx.strokeStyle = ink; ctx.lineWidth = mm(0.18);
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.fillStyle = ink;
  ctx.font = `400 ${mm(2.1)}px ${FONT_SANS}`;
  ctx.textAlign = 'center';
  for (let i = 0; i <= 10; i++) ctx.fillText(`${i * 10}`, wx + ww * (i + 0.5) / 11, wy + wh + mm(3));
  // colour patches C M Y K R G B
  const patches = [['#00a0e0', 'C'], ['#e0007a', 'M'], ['#ffe400', 'Y'], ['#111111', 'K'], ['#e02020', 'R'], ['#20a040', 'G'], ['#2040a0', 'B']];
  const cx0 = mm(113), cw = mm(83) / 7;
  patches.forEach(([c, l], i) => {
    ctx.fillStyle = c; ctx.fillRect(cx0 + i * cw + mm(0.4), wy, cw - mm(0.8), wh);
    ctx.fillStyle = ink; ctx.fillText(l, cx0 + (i + 0.5) * cw, wy + wh + mm(3));
  });
  // fine lines: groups of decreasing width
  ctx.textAlign = 'left';
  const ly = ty + mm(24), lhh = mm(9);
  const widths = [0.5, 0.35, 0.25, 0.18, 0.12, 0.08];
  let lx = mm(14);
  widths.forEach(w => {
    ctx.fillStyle = ink;
    for (let j = 0; j < 5; j++) ctx.fillRect(lx + j * mm(w * 2), ly, Math.max(1, mm(w)), lhh);
    ctx.font = `400 ${mm(2)}px ${FONT_SANS}`;
    ctx.fillText(`${String(w).replace('.', ',')}`, lx, ly + lhh + mm(3));
    lx += mm(w * 10) + mm(6.5);
  });
  // tiny text ladder
  const sizes = [9, 7, 6, 5, 4, 3];
  let sy = ty + mm(25);
  ctx.fillStyle = ink;
  sizes.forEach(pt => {
    ctx.font = `400 ${mm(pt * 0.3528)}px ${FONT_BODY}`;
    ctx.fillText(`${pt} punto: Kopyada küçük yazılar zor okunur.`, mm(113), sy);
    sy += mm(pt * 0.3528 * 1.35 + 0.8);
  });

  // ---- footer
  ctx.fillStyle = '#555555';
  ctx.font = `400 ${mm(2.4)}px ${FONT_SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('— 1 —', mm(105), mm(290));
  ctx.textAlign = 'left';
}

// word-wrapped, justified paragraph; returns the next baseline
function paragraph(ctx, text, x, y, w, lh, drop) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = [];
  const widthFor = n => (drop && n < drop.lines ? w - drop.indent : w);
  for (const word of words) {
    const test = [...cur, word].join(' ');
    if (ctx.measureText(test).width > widthFor(lines.length) && cur.length) { lines.push(cur); cur = [word]; }
    else cur.push(word);
  }
  if (cur.length) lines.push(cur);
  lines.forEach((ws, i) => {
    const lw = widthFor(i), lx = x + (w - lw);
    y += lh;
    if (i === lines.length - 1 || ws.length === 1) { ctx.fillText(ws.join(' '), lx, y); return; }
    const total = ws.reduce((a, s) => a + ctx.measureText(s).width, 0);
    const sp = (lw - total) / (ws.length - 1);
    let cx = lx;
    ws.forEach(s => { ctx.fillText(s, cx, y); cx += ctx.measureText(s).width + sp; });
  });
  return y;
}

// ---------------------------------------------------------------------------
// The "photograph": a sunset lighthouse on a rocky headland, painted procedurally.
function paintPhoto(ctx, X, Y, W, H) {
  const c = document.createElement('canvas');
  c.width = Math.round(W); c.height = Math.round(H);
  const g = c.getContext('2d');
  const r = rng(1938);
  const hz = 0.64 * H; // horizon

  // sky
  let gr = g.createLinearGradient(0, 0, 0, hz);
  gr.addColorStop(0, '#1b1f5a'); gr.addColorStop(0.35, '#4a347e'); gr.addColorStop(0.62, '#b8506a');
  gr.addColorStop(0.86, '#ee7d4f'); gr.addColorStop(1, '#ffc26a');
  g.fillStyle = gr; g.fillRect(0, 0, W, hz + 2);
  // sun glow
  const sx = 0.3 * W, sy = 0.605 * H;
  gr = g.createRadialGradient(sx, sy, 0, sx, sy, 0.42 * W);
  gr.addColorStop(0, 'rgba(255,214,140,0.85)'); gr.addColorStop(0.25, 'rgba(255,170,100,0.35)'); gr.addColorStop(1, 'rgba(255,140,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, hz);
  // clouds: soft streaks
  g.save();
  g.filter = `blur(${Math.round(W * 0.006)}px)`;
  for (let i = 0; i < 16; i++) {
    const cy = (0.12 + r() * 0.42) * H, cxp = r() * W, cw = (0.12 + r() * 0.3) * W, ch = (0.012 + r() * 0.03) * H;
    const low = cy / hz;
    g.fillStyle = `rgba(${Math.round(90 + 150 * low)},${Math.round(50 + 70 * low)},${Math.round(110 - 30 * low)},${0.35 + r() * 0.3})`;
    g.beginPath(); g.ellipse(cxp, cy, cw, ch, (r() - 0.5) * 0.08, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(255,${Math.round(150 + 60 * low)},110,${0.25 + 0.3 * low})`;
    g.beginPath(); g.ellipse(cxp + cw * 0.1, cy + ch * 0.7, cw * 0.8, ch * 0.45, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  // sun disc
  g.fillStyle = '#fff4cf';
  g.beginPath(); g.arc(sx, sy, 0.045 * W, 0, Math.PI * 2); g.fill();

  // sea
  gr = g.createLinearGradient(0, hz, 0, H);
  gr.addColorStop(0, '#5a4a86'); gr.addColorStop(0.18, '#2c4c7e'); gr.addColorStop(0.6, '#1f3d6a'); gr.addColorStop(1, '#122849');
  g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
  // wave lines
  for (let i = 0; i < 260; i++) {
    const wy = hz + Math.pow(r(), 1.4) * (H - hz), wl = (0.01 + r() * 0.05) * W * (0.4 + (wy - hz) / (H - hz));
    const wx = r() * W;
    g.strokeStyle = r() < 0.5 ? 'rgba(10,20,45,0.35)' : 'rgba(120,140,200,0.18)';
    g.lineWidth = 1 + (wy - hz) / (H - hz) * 3;
    g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + wl / 2, wy - 2, wx + wl, wy); g.stroke();
  }
  // sun reflection column
  for (let i = 0; i < 180; i++) {
    const t = Math.pow(r(), 0.8);
    const wy = hz + 2 + t * (H - hz) * 0.95;
    const spread = 0.03 * W + t * 0.1 * W;
    const wx = sx + (r() - 0.5) * 2 * spread * (0.3 + r());
    const wl = (0.006 + r() * 0.03) * W * (1 - t * 0.5);
    g.strokeStyle = `rgba(255,${Math.round(200 - t * 60)},${Math.round(130 - t * 50)},${0.75 * (1 - t) + 0.1})`;
    g.lineWidth = 1.2 + t * 3;
    g.beginPath(); g.moveTo(wx - wl / 2, wy); g.lineTo(wx + wl / 2, wy); g.stroke();
  }

  // headland on the right
  const cliff = [[0.5, 0.7], [0.56, 0.64], [0.6, 0.6], [0.64, 0.555], [0.7, 0.535], [0.77, 0.53], [0.84, 0.545], [0.92, 0.56], [1.0, 0.575], [1.0, 1.0], [0.62, 1.0], [0.54, 0.86]];
  gr = g.createLinearGradient(0, 0.52 * H, 0, H);
  gr.addColorStop(0, '#3a2724'); gr.addColorStop(0.4, '#221619'); gr.addColorStop(1, '#0e0a0e');
  g.fillStyle = gr;
  g.beginPath(); cliff.forEach(([a, b], i) => (i ? g.lineTo(a * W, b * H) : g.moveTo(a * W, b * H))); g.closePath(); g.fill();
  // rock facets
  for (let i = 0; i < 70; i++) {
    const a = 0.53 + r() * 0.47, b = 0.6 + r() * 0.4;
    g.fillStyle = r() < 0.5 ? 'rgba(90,55,45,0.35)' : 'rgba(0,0,0,0.3)';
    g.beginPath(); g.moveTo(a * W, b * H); g.lineTo((a + 0.02 + r() * 0.03) * W, (b + 0.01) * H); g.lineTo((a + 0.01) * W, (b + 0.04 + r() * 0.04) * H); g.fill();
  }
  // grass on top
  gr = g.createLinearGradient(0, 0.52 * H, 0, 0.6 * H);
  gr.addColorStop(0, '#6f9a45'); gr.addColorStop(1, '#2d4f26');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(0.6 * W, 0.6 * H); g.lineTo(0.64 * W, 0.553 * H); g.lineTo(0.7 * W, 0.533 * H); g.lineTo(0.77 * W, 0.528 * H);
  g.lineTo(0.84 * W, 0.543 * H); g.lineTo(0.92 * W, 0.558 * H); g.lineTo(1.0 * W, 0.573 * H); g.lineTo(1.0 * W, 0.6 * H);
  g.bezierCurveTo(0.9 * W, 0.59 * H, 0.75 * W, 0.575 * H, 0.6 * W, 0.6 * H); g.fill();
  // rim light from the sun
  g.strokeStyle = 'rgba(255,170,90,0.7)'; g.lineWidth = W * 0.003;
  g.beginPath(); g.moveTo(0.5 * W, 0.7 * H); g.lineTo(0.56 * W, 0.64 * H); g.lineTo(0.6 * W, 0.6 * H); g.lineTo(0.64 * W, 0.553 * H); g.stroke();
  // surf at the foot of the cliff
  for (let i = 0; i < 60; i++) {
    const a = 0.5 + r() * 0.08, b = 0.69 + r() * 0.2;
    g.fillStyle = `rgba(230,220,255,${0.2 + r() * 0.35})`;
    g.beginPath(); g.ellipse(a * W + (b - 0.69) * W * 0.3, b * H, W * (0.004 + r() * 0.01), H * 0.003, 0, 0, Math.PI * 2); g.fill();
  }

  // keeper's house
  const hx = 0.775 * W, hy = 0.53 * H;
  g.fillStyle = '#e9e1d2'; g.fillRect(hx, hy - 0.05 * H, 0.07 * W, 0.05 * H);
  g.fillStyle = '#b8b0a4'; g.fillRect(hx + 0.045 * W, hy - 0.05 * H, 0.025 * W, 0.05 * H);
  g.fillStyle = '#a2262a';
  g.beginPath(); g.moveTo(hx - 0.006 * W, hy - 0.05 * H); g.lineTo(hx + 0.035 * W, hy - 0.085 * H); g.lineTo(hx + 0.076 * W, hy - 0.05 * H); g.fill();
  g.fillStyle = '#ffd98a'; g.fillRect(hx + 0.015 * W, hy - 0.035 * H, 0.012 * W, 0.016 * H);

  // lighthouse tower
  const lx = 0.722 * W, base = 0.545 * H, topY = 0.24 * H; // top of tower
  const bw = 0.07 * W, tw = 0.046 * W;
  const tower = (t) => ({ y: base + (topY - base) * t, w: bw + (tw - bw) * t });
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const a = tower(i / bands), b = tower((i + 1) / bands);
    const grd = g.createLinearGradient(lx - a.w / 2, 0, lx + a.w / 2, 0);
    if (i % 2 === 0) { grd.addColorStop(0, '#f2b39a'); grd.addColorStop(0.35, '#d8342f'); grd.addColorStop(1, '#6e1418'); }
    else { grd.addColorStop(0, '#fff3e4'); grd.addColorStop(0.35, '#eee4d6'); grd.addColorStop(1, '#8c7f86'); }
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(lx - a.w / 2, a.y); g.lineTo(lx + a.w / 2, a.y); g.lineTo(lx + b.w / 2, b.y + 0.5); g.lineTo(lx - b.w / 2, b.y + 0.5); g.fill();
  }
  // gallery, lantern, dome
  const gy = topY;
  g.fillStyle = '#1b1416'; g.fillRect(lx - tw * 0.72, gy - 0.012 * H, tw * 1.44, 0.014 * H);
  g.strokeStyle = '#1b1416'; g.lineWidth = 2;
  for (let i = 0; i <= 6; i++) { const x = lx - tw * 0.7 + i * tw * 1.4 / 6; g.beginPath(); g.moveTo(x, gy - 0.012 * H); g.lineTo(x, gy - 0.03 * H); g.stroke(); }
  g.beginPath(); g.moveTo(lx - tw * 0.72, gy - 0.03 * H); g.lineTo(lx + tw * 0.72, gy - 0.03 * H); g.stroke();
  const lanternTop = gy - 0.07 * H;
  // beam cones
  const ly = gy - 0.045 * H;
  for (const dir of [-1, 1]) {
    const bg = g.createLinearGradient(lx, ly, lx + dir * 0.5 * W, ly);
    bg.addColorStop(0, 'rgba(255,245,190,0.75)'); bg.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = bg;
    g.beginPath(); g.moveTo(lx, ly - 0.008 * H); g.lineTo(lx + dir * 0.5 * W, ly - (dir > 0 ? 0.05 : 0.09) * H); g.lineTo(lx + dir * 0.5 * W, ly + 0.05 * H); g.lineTo(lx, ly + 0.008 * H); g.fill();
  }
  const lg = g.createRadialGradient(lx, ly, 0, lx, ly, tw * 1.6);
  lg.addColorStop(0, 'rgba(255,255,230,1)'); lg.addColorStop(0.3, 'rgba(255,230,150,0.8)'); lg.addColorStop(1, 'rgba(255,200,100,0)');
  g.fillStyle = lg; g.beginPath(); g.arc(lx, ly, tw * 1.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff6c8'; g.fillRect(lx - tw * 0.45, lanternTop + 0.01 * H, tw * 0.9, gy - 0.03 * H - lanternTop - 0.01 * H);
  g.strokeStyle = '#2a1c1c'; g.lineWidth = 2;
  for (let i = 0; i <= 3; i++) { const x = lx - tw * 0.45 + i * tw * 0.3; g.beginPath(); g.moveTo(x, lanternTop + 0.01 * H); g.lineTo(x, gy - 0.03 * H); g.stroke(); }
  g.fillStyle = '#7a1a1e';
  g.beginPath(); g.moveTo(lx - tw * 0.55, lanternTop + 0.012 * H); g.quadraticCurveTo(lx, lanternTop - 0.03 * H, lx + tw * 0.55, lanternTop + 0.012 * H); g.fill();
  g.fillStyle = '#1b1416'; g.fillRect(lx - 1.5, lanternTop - 0.035 * H, 3, 0.02 * H);
  // door + windows
  g.fillStyle = '#2a1a1a'; g.fillRect(lx - bw * 0.12, base - 0.05 * H, bw * 0.24, 0.05 * H);
  g.fillStyle = '#1e1416'; g.fillRect(lx - bw * 0.07, base - 0.2 * H, bw * 0.14, 0.022 * H);

  // birds
  g.strokeStyle = '#1d1426'; g.lineWidth = W * 0.0022; g.lineCap = 'round';
  [[0.14, 0.2, 1], [0.19, 0.24, 0.8], [0.24, 0.18, 0.9], [0.42, 0.3, 0.6], [0.47, 0.27, 0.55]].forEach(([a, b, s]) => {
    const bx = a * W, by = b * H, bs = 0.018 * W * s;
    g.beginPath(); g.moveTo(bx - bs, by - bs * 0.3); g.quadraticCurveTo(bx - bs * 0.4, by - bs * 0.55, bx, by);
    g.quadraticCurveTo(bx + bs * 0.4, by - bs * 0.55, bx + bs, by - bs * 0.3); g.stroke();
  });

  // photographic grain + slight vignette
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  const rr = rng(22);
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4, xx = p % c.width, yy = (p / c.width) | 0;
    const vx = xx / c.width - 0.5, vy = yy / c.height - 0.5;
    const vig = 1 - 0.28 * (vx * vx + vy * vy) * 2;
    const n = (rr() - 0.5) * 14;
    d[i] = Math.max(0, Math.min(255, d[i] * vig + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * vig + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * vig + n));
  }
  g.putImageData(img, 0, 0);
  ctx.drawImage(c, X, Y, W, H);
}
