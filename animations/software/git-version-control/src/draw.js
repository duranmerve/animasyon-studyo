// Drawing kit: palette, easing and the small pictures the scene is made of.
export const PAPER = '#F3EFE6', GRID = '#E4DDCF', INK = '#1B1F2A', MUTED = '#6E7280', RED = '#E63946', WHITE = '#FFFDF8';
export const LINE = { main: '#2350D8', kalkan: '#F28C28', ses: '#0FA37F', kolay: '#D63384', remote: '#6D4BD8' };
export const LABEL = { main: 'main', kalkan: 'kalkan', ses: 'ses', kolay: 'kolay-mod' };
export const FS = '"Barlow Condensed", "Arial Narrow", sans-serif';
export const FB = 'Barlow, "Segoe UI", Arial, sans-serif';
export const FM = '"JetBrains Mono", Consolas, monospace';

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const eout = u => 1 - Math.pow(1 - u, 3);
export const back = u => { const c = 1.9; return u <= 0 ? 0 : 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
export const ramp = (t, t0, d) => clamp((t - t0) / d);
// visible from a to b with fades
export const win = (t, a, b, fi = 0.5, fo = 0.5) => Math.min(ramp(t, a, fi), 1 - ramp(t, b - fo, fo));

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, s, x, y, font, color, align = 'left', base = 'alphabetic') {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.fillText(s, x, y);
}

// deterministic 40-hex "SHA-1 looking" ids
export function hashOf(seed) {
  let x = 2166136261;
  for (const c of seed) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0;
  let s = '';
  for (let i = 0; i < 40; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; s += (x % 16).toString(16); }
  return s;
}
export const rand = seed => { let x = seed * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };

// hash that "rolls" like a split-flap board and settles left to right
export function rolled(hash, t, t0, dur = 1.0) {
  if (t < t0) return '';
  const u = (t - t0) / dur;
  let s = '';
  for (let i = 0; i < hash.length; i++) {
    const settle = i / hash.length;
    s += u >= settle + 0.12 ? hash[i] : ((Math.floor(t * 30) * 7 + i * 13) % 16).toString(16);
  }
  return s;
}

// a paper sheet with a folded corner
export function fileIcon(ctx, x, y, w, h, color = LINE.main, lines = 4) {
  const f = w * 0.26;
  ctx.save();
  ctx.shadowColor = 'rgba(27,31,42,.16)'; ctx.shadowBlur = w * 0.12; ctx.shadowOffsetY = w * 0.05;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w - f, y); ctx.lineTo(x + w, y + f); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
  ctx.fillStyle = WHITE; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, w * 0.035); ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w - f, y); ctx.lineTo(x + w, y + f); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - f, y); ctx.lineTo(x + w - f, y + f); ctx.lineTo(x + w, y + f); ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
  ctx.strokeRect(x, y + h * 0.78, w, h * 0.22);
  ctx.fillStyle = 'rgba(27,31,42,.28)';
  for (let i = 0; i < lines; i++) ctx.fillRect(x + w * 0.16, y + h * (0.2 + i * 0.13), w * (i % 2 ? 0.46 : 0.62), Math.max(1, h * 0.035));
}

export function star(ctx, x, y, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

// The students' game, "Yıldız Avcısı", as it looks in a given commit.
export function game(ctx, x, y, w, h, f, t) {
  ctx.save();
  rr(ctx, x, y, w, h, Math.min(w, h) * 0.04); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#0E1836'); g.addColorStop(1, '#23386E');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (f.sky) {
    const r = rand(7);
    for (let i = 0; i < 46; i++) {
      const sx = x + r() * w, sy = y + r() * h * 0.85, tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
      ctx.fillStyle = `rgba(255,248,220,${0.35 + 0.55 * tw})`;
      const s = (r() < 0.2 ? 2.2 : 1.3) * Math.max(1, w / 260);
      ctx.fillRect(sx, sy, s, s);
    }
  }
  const u = w / 100;
  // collectible star
  const by = y + h * 0.36 + Math.sin(t * 2.4) * h * 0.035;
  star(ctx, x + w * 0.32, by, u * 5.2, '#FFD23F');
  star(ctx, x + w * 0.7, y + h * 0.2 + Math.sin(t * 2 + 1) * h * 0.03, u * 3.4, '#FFD23F');
  // ship
  const sx = x + w * 0.5 + Math.sin(t * 1.3) * w * 0.12, sy = y + h * 0.8;
  if (f.shield) {
    ctx.strokeStyle = `rgba(110,231,255,${0.7 + 0.3 * Math.sin(t * 5)})`; ctx.lineWidth = u * 1.1;
    ctx.beginPath(); ctx.arc(sx, sy - u * 1.5, u * 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(110,231,255,.13)'; ctx.fill();
  }
  ctx.fillStyle = '#FF9F43';
  ctx.beginPath(); ctx.moveTo(sx - u * 2.2, sy + u * 4); ctx.lineTo(sx, sy + u * (7 + Math.sin(t * 20) * 1.2)); ctx.lineTo(sx + u * 2.2, sy + u * 4); ctx.fill();
  ctx.fillStyle = f.ship2 ? '#FF6FB5' : '#F3EFE6';
  ctx.beginPath(); ctx.moveTo(sx, sy - u * 7); ctx.lineTo(sx + u * 5, sy + u * 4.5); ctx.lineTo(sx - u * 5, sy + u * 4.5); ctx.closePath(); ctx.fill();
  const fs = Math.max(8, u * 6.5);
  if (f.score) text(ctx, 'SKOR 120', x + u * 4, y + u * 4 + fs, `700 ${fs}px ${FM}`, '#FFD23F');
  if (f.music) text(ctx, '♪', x + w - u * 5, y + u * 4 + fs * 1.1, `700 ${fs * 1.4}px ${FB}`, '#7BD88F', 'right');
  if (f.title) text(ctx, 'YILDIZ AVCISI', x + w / 2, y + h * 0.6, `800 ${fs * 1.5}px ${FS}`, '#FFFFFF', 'center');
  if (f.level) text(ctx, 'SEVİYE 2', x + w - u * 4, y + h - u * 4,  `700 ${fs}px ${FS}`, '#6EE7FF', 'right');
  if (f.easy) text(ctx, 'KOLAY', x + u * 4, y + h - u * 4, `700 ${fs * 0.9}px ${FS}`, '#FF8FC8');
  ctx.restore();
}

export function polaroid(ctx, x, y, w, f, t, caption, captionColor = INK) {
  const h = w * 1.12, m = w * 0.06;
  ctx.save();
  ctx.shadowColor = 'rgba(27,31,42,.25)'; ctx.shadowBlur = w * 0.08; ctx.shadowOffsetY = w * 0.03;
  ctx.fillStyle = WHITE; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(27,31,42,.25)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  game(ctx, x + m, y + m, w - 2 * m, w * 0.78, f, t);
  if (caption) text(ctx, caption, x + w / 2, y + h - m * 1.3, `600 ${w * 0.1}px ${FB}`, captionColor, 'center');
}

export function laptop(ctx, cx, cy, w, color = INK) {
  const h = w * 0.62;
  rr(ctx, cx - w / 2, cy - h, w, h, w * 0.04); ctx.fillStyle = color; ctx.fill();
  rr(ctx, cx - w / 2 + w * 0.035, cy - h + w * 0.035, w - w * 0.07, h - w * 0.07, w * 0.015); ctx.fillStyle = WHITE; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - w * 0.58, cy + w * 0.005); ctx.lineTo(cx + w * 0.58, cy + w * 0.005); ctx.lineTo(cx + w * 0.52, cy + w * 0.05); ctx.lineTo(cx - w * 0.52, cy + w * 0.05); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  return { x: cx - w / 2 + w * 0.035, y: cy - h + w * 0.035, w: w - w * 0.07, h: h - w * 0.07 };
}

export function server(ctx, cx, cy, w, t) {
  // a screen on top of a small rack: the shared repository
  const h = w * 0.62, rh = w * 0.16, sh = h - rh - w * 0.03;
  rr(ctx, cx - w / 2, cy - h, w, sh, w * 0.04); ctx.fillStyle = '#2B2350'; ctx.fill();
  rr(ctx, cx - w / 2 + w * 0.035, cy - h + w * 0.035, w - w * 0.07, sh - w * 0.07, w * 0.015); ctx.fillStyle = WHITE; ctx.fill();
  for (let k = 0; k < 2; k++) {
    const y = cy - rh + k * rh / 2;
    rr(ctx, cx - w * 0.46, y, w * 0.92, rh / 2 - w * 0.01, w * 0.015); ctx.fillStyle = '#2B2350'; ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = (Math.floor(t * 3 + i * 1.7 + k * 2) % 3) ? '#7BD88F' : '#3E6F4A';
      ctx.beginPath(); ctx.arc(cx - w * 0.38 + i * w * 0.045, y + rh / 4 - w * 0.005, w * 0.011, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx + w * 0.05, y + rh / 4 - w * 0.006, w * 0.34, w * 0.012);
  }
  return { x: cx - w / 2 + w * 0.035, y: cy - h + w * 0.035, w: w - w * 0.07, h: sh - w * 0.07 };
}

// a person without a face: head and shoulders
export function person(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - s * 0.62, s * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.42, s * 0.3, 0, Math.PI, 0); ctx.fill();
}

// word-wrapped text; returns the height used
export function wrap(ctx, s, x, y, maxW, lh, font, color, align = 'left') {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  const words = s.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy - y + lh;
}
