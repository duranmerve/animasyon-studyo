// Channel thumbnail kit: the shared YouTube identity of every video on the channel.
// An animation draws its own hero picture (full bleed, 1280×720, weight on the right side);
// brand() then adds what stays the same on every cover: the dark left panel, the channel mark and
// topic chip, the big title with its yellow accent line, the duration sticker, grading and grain.
//   import * as kit from '/_kit/kit.js';
//   const ctx = kit.layer(); ...draw...; kit.brand({ title: 'ÇAKIŞMA!', accent: 'Git neden durur?', topic: 'YAZILIM', minutes: 6 });
export const W = 1280, H = 720;
export const DPR = Math.min(2, Number(new URLSearchParams(location.search).get('dpr')) || 2);
export const BRAND = { yellow: '#FFD23F', ink: '#0B0D14', white: '#FFFFFF', name: 'ANİMASYON LAB' };

const css = document.createElement('link');
css.rel = 'stylesheet';
css.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Barlow:ital,wght@0,600;0,700;0,800;0,900;1,800&family=Barlow+Condensed:wght@700;800;900&family=JetBrains+Mono:wght@700;800&display=swap';
const cssLoaded = new Promise(r => { css.onload = r; css.onerror = r; });
document.head.appendChild(css);
const style = document.createElement('style');
style.textContent = `
html,body{margin:0;background:#000;overflow:hidden}
#root{position:relative;width:${W}px;height:${H}px;overflow:hidden;font-family:Barlow,sans-serif}
#root canvas{position:absolute;inset:0;width:${W}px;height:${H}px}
#root .t{position:absolute;white-space:nowrap}
.kit-grain{position:absolute;inset:0;pointer-events:none;opacity:.12;mix-blend-mode:overlay;z-index:90;
 background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.kit-fx{position:absolute;inset:0;pointer-events:none}
.kit-mark{position:absolute;left:34px;top:30px;display:flex;align-items:center;gap:12px;z-index:95}
.kit-logo{width:44px;height:44px;border-radius:50%;background:${BRAND.yellow};position:relative;box-shadow:0 4px 18px rgba(0,0,0,.5)}
.kit-logo::before{content:'';position:absolute;left:17px;top:12px;border-left:15px solid ${BRAND.ink};border-top:10px solid transparent;border-bottom:10px solid transparent}
.kit-logo::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:3px solid rgba(255,210,63,.55)}
.kit-name{font:900 22px/1 Barlow;letter-spacing:.14em;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.8)}
.kit-topic{font:800 16px/1 Barlow;letter-spacing:.16em;color:${BRAND.ink};background:${BRAND.yellow};padding:7px 11px 6px;border-radius:5px}
.kit-title{position:absolute;left:44px;bottom:118px;z-index:95;font-family:Anton,'Barlow Condensed',sans-serif;color:#fff;line-height:.92;
 letter-spacing:.5px;text-shadow:0 6px 0 rgba(0,0,0,.55),0 12px 40px rgba(0,0,0,.7);max-width:720px;white-space:normal}
.kit-title em{font-style:normal;color:${BRAND.yellow}}
.kit-bar{position:absolute;left:46px;bottom:98px;height:9px;width:150px;background:${BRAND.yellow};z-index:95;box-shadow:0 4px 14px rgba(0,0,0,.5)}
.kit-accent{position:absolute;left:46px;bottom:42px;z-index:95;font:800 34px/1 Barlow;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.9)}
.kit-min{position:absolute;right:30px;bottom:28px;z-index:95;font:900 26px/1 Barlow;color:${BRAND.ink};background:${BRAND.yellow};padding:10px 14px;border-radius:8px;
 transform:rotate(-3deg);box-shadow:0 8px 22px rgba(0,0,0,.55)}
`;
document.head.appendChild(style);

export const root = document.getElementById('root');
export const rand = seed => { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
export const lerp = (a, b, u) => a + (b - a) * u;

// a full-size drawing layer (hi-dpi) / an offscreen one
export function layer(z = 1) {
  const c = document.createElement('canvas');
  c.width = W * DPR; c.height = H * DPR; c.style.zIndex = z;
  root.appendChild(c);
  const ctx = c.getContext('2d'); ctx.scale(DPR, DPR);
  return ctx;
}
export function off(w = W, h = H) {
  const c = document.createElement('canvas'); c.width = w * DPR; c.height = h * DPR;
  const ctx = c.getContext('2d'); ctx.scale(DPR, DPR); return ctx;
}
export function html(s, css2, z = 60) {
  const d = document.createElement('div'); d.className = 't'; d.innerHTML = s; Object.assign(d.style, { zIndex: z }, css2); root.appendChild(d); return d;
}

// light: blurred copy added on top
export function bloom(dst, src, blur, alpha = 1) {
  dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.globalCompositeOperation = 'lighter'; dst.globalAlpha = alpha;
  dst.filter = `blur(${blur * DPR}px)`; dst.drawImage(src.canvas, 0, 0); dst.restore();
}
// depth of field: a blurred copy covers the upper (far) part, fading out between y=from and y=to
export function depthOfField(ctx, from, to, blur) {
  const b = off();
  b.filter = `blur(${blur}px)`; b.drawImage(ctx.canvas, 0, 0, W, H); b.filter = 'none';
  b.globalCompositeOperation = 'destination-in';
  const g = b.createLinearGradient(0, from, 0, to); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(b.canvas, 0, 0); ctx.restore();
}
export function bokeh(ctx, n, seed, colors, yMin, yMax, rMin, rMax, alpha) {
  const r = rand(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = lerp(yMin, yMax, r()), rad = lerp(rMin, rMax, r() ** 2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const c = colors[Math.floor(r() * colors.length)];
    g.addColorStop(0, c + Math.round(alpha * 255 * (0.4 + r() * 0.6)).toString(16).padStart(2, '0'));
    g.addColorStop(0.7, c + '22'); g.addColorStop(1, c + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// perspective texture mapping: draw an image onto any quad (tl, tr, br, bl); returns the (u,v) → screen map
export function homography(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  return (u, v) => { const w = g * u + h * v + 1; return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w]; };
}
function drawTri(ctx, img, s, d) {
  const [[sx0, sy0], [sx1, sy1], [sx2, sy2]] = s, [[dx0, dy0], [dx1, dy1], [dx2, dy2]] = d;
  const a11 = sx1 - sx0, a12 = sx2 - sx0, a21 = sy1 - sy0, a22 = sy2 - sy0, det = a11 * a22 - a12 * a21;
  const i11 = a22 / det, i12 = -a12 / det, i21 = -a21 / det, i22 = a11 / det;
  const b11 = dx1 - dx0, b12 = dx2 - dx0, b21 = dy1 - dy0, b22 = dy2 - dy0;
  const m11 = b11 * i11 + b12 * i21, m12 = b11 * i12 + b12 * i22, m21 = b21 * i11 + b22 * i21, m22 = b21 * i12 + b22 * i22;
  const e = dx0 - (m11 * sx0 + m12 * sy0), f = dy0 - (m21 * sx0 + m22 * sy0);
  const cx = (dx0 + dx1 + dx2) / 3, cy = (dy0 + dy1 + dy2) / 3, grow = p => [p[0] + (p[0] - cx) * 0.04, p[1] + (p[1] - cy) * 0.04];
  ctx.save();
  ctx.beginPath(); d.map(grow).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
  ctx.transform(m11, m21, m12, m22, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
export function drawQuad(ctx, img, iw, ih, q, n = 22) {
  const Hm = homography(q);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n;
    const s = [[u0 * iw, v0 * ih], [u1 * iw, v0 * ih], [u1 * iw, v1 * ih], [u0 * iw, v1 * ih]];
    const d = [Hm(u0, v0), Hm(u1, v0), Hm(u1, v1), Hm(u0, v1)];
    drawTri(ctx, img, [s[0], s[1], s[2]], [d[0], d[1], d[2]]);
    drawTri(ctx, img, [s[0], s[2], s[3]], [d[0], d[2], d[3]]);
  }
  return Hm;
}

// the channel frame
//   title: 'ÇAKIŞMA!' — written in capitals by the caller (Turkish İ/I and brand names like GIT stay right);
//          *word* is drawn in the channel yellow; keep it to 1–4 words
//   accent: one short line under the bar; topic: 'YAZILIM' / 'TARİH' / 'BİYOLOJİ' …; minutes: sticker (optional)
//   tint: colour of the light leak that matches the picture
export function brand({ title, accent = '', topic = '', minutes = null, tint = '#FF7A3D', size = null }) {
  const fx = (bg, z) => { const d = document.createElement('div'); d.className = 'kit-fx'; d.style.background = bg; d.style.zIndex = z; root.appendChild(d); };
  // the dark side the text stands on, a light leak on the other side, cinematic vignette
  fx('linear-gradient(90deg, rgba(5,6,12,.86) 0%, rgba(5,6,12,.62) 30%, rgba(5,6,12,0) 58%)', 80);
  fx('linear-gradient(0deg, rgba(5,6,12,.7) 0%, rgba(5,6,12,0) 38%)', 80);
  fx(`radial-gradient(ellipse at 100% 0%, ${tint}55 0%, ${tint}00 45%)`, 81);
  fx('radial-gradient(ellipse at 55% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)', 82);
  const g = document.createElement('div'); g.className = 'kit-grain'; root.appendChild(g);
  const mark = document.createElement('div'); mark.className = 'kit-mark';
  mark.innerHTML = `<div class="kit-logo"></div><div class="kit-name">${BRAND.name}</div>${topic ? `<div class="kit-topic">${topic}</div>` : ''}`;
  root.appendChild(mark);
  const t = document.createElement('div'); t.className = 'kit-title';
  t.innerHTML = title.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  root.appendChild(t);
  // biggest size that keeps the title within 2 lines and 700 px
  let fs = size || 150;
  t.style.fontSize = fs + 'px';
  while (fs > 60 && (t.scrollWidth > 700 || t.getBoundingClientRect().height > fs * 0.92 * 2.05)) { fs -= 4; t.style.fontSize = fs + 'px'; }
  const bar = document.createElement('div'); bar.className = 'kit-bar'; root.appendChild(bar);
  if (accent) { const a = document.createElement('div'); a.className = 'kit-accent'; a.textContent = accent; root.appendChild(a); }
  else { t.style.bottom = '60px'; bar.style.bottom = '40px'; }
  if (minutes) { const m = document.createElement('div'); m.className = 'kit-min'; m.textContent = `${minutes} DK`; root.appendChild(m); }
}

export async function ready(fontsExtra = []) {
  await Promise.race([cssLoaded, new Promise(r => setTimeout(r, 4000))]);
  await Promise.race([
    Promise.all(['400 100px Anton', '900 22px Barlow', '800 34px Barlow', ...fontsExtra].map(f => document.fonts.load(f))),
    new Promise(r => setTimeout(r, 6000)),
  ]);
}
