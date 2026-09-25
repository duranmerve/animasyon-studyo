// What happens on the map in every chapter. All of it is a pure function of time:
//   CAMS[id](cue)            camera keyframes [local time, {x, y, span}, move duration]
//   SFX[id](cue)             sound effects [local time, type, arg]
//   SCENES[id].state(...)    lasting changes to the world (armies, ships, breaches…), applied in order
//   SCENES[id].draw…         overlays of that chapter only (labels, arrows, panels)
// cue('name') is the moment the narrator reaches @name in the chapter text (seconds into the chapter).
import * as G from './geo.js';
import { INK, PAPER, GOLD, GOLD_LT, RED, PURPLE, SEA, STONE, FONT, FONT_SC, toScreen, worldTransform, screenTransform, smooth01, drawRumeliHisar } from './paint.js';

const PAPER2 = '#F7EEDB', RED_DK = '#7E1F18', BROWN = '#6A5238';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ramp = (t, t0, d = 1) => smooth01(t0, t0 + d, t);
// visible between a and b with soft edges
const win = (t, a, b, fin = 0.6, fout = 0.6) => Math.min(ramp(t, a, fin), 1 - ramp(t, b - fout, fout));
const cam = (lat, lon, span) => { const [x, y] = G.P(lat, lon); return { x, y, span }; };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// text scale from the screen size
const U = v => (v.W < 700 ? 0.86 : clamp(Math.min(v.W, v.H * 1.78) / 1600, 0.9, 1.3));

// ------------------------------------------------------------------------------------------ drawing helpers
const pt = p => (Array.isArray(p) ? p : [p.x, p.y]);
function label(ctx, v, at, text, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.01) return;
  const [sx, sy] = toScreen(v, ...pt(at));
  screenTransform(ctx, v);
  const size = (o.size || 18) * U(v);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || (o.sc ? 700 : 600)} ${size}px ${o.sc ? FONT_SC : FONT}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  const dx = (o.dx || 0) * U(v), dy = (o.dy || 0) * U(v);
  if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
  if (o.halo !== false) { ctx.lineWidth = size * 0.32; ctx.lineJoin = 'round'; ctx.strokeStyle = o.haloColor || 'rgba(247,238,219,0.92)'; ctx.strokeText(text, sx + dx, sy + dy); }
  ctx.fillStyle = o.color || INK; ctx.fillText(text, sx + dx, sy + dy);
  ctx.restore();
}
// a small paper tag with a leader line to a point on the map
function tag(ctx, v, at, text, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.01) return;
  const [sx, sy] = toScreen(v, ...pt(at)), u = U(v);
  const out = Math.max(0, -sx, sx - v.W, -sy, sy - (v.H - 58));
  if (out > 40) return;
  screenTransform(ctx, v);
  ctx.save(); ctx.globalAlpha *= a * (1 - out / 40);
  const size = (o.size || 18) * u;
  ctx.font = `${o.weight || 700} ${size}px ${FONT}`;
  const lines = String(text).split('\n');
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 18 * u, th = lines.length * size * 1.15 + 10 * u;
  const dx = (o.dx ?? 0) * u, dy = (o.dy ?? -46) * u;
  let bx = sx + dx - tw / 2, by = sy + dy - th / 2;
  bx = clamp(bx, 8, v.W - tw - 8); by = clamp(by, 8, v.H - th - 70);
  ctx.strokeStyle = o.color || INK; ctx.lineWidth = 1.4 * u;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(clamp(sx, bx + 6, bx + tw - 6), by + (sy > by + th / 2 ? th : 0)); ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy, 3.2 * u, 0, Math.PI * 2); ctx.fillStyle = o.color || INK; ctx.fill();
  ctx.shadowColor = 'rgba(43,29,20,0.35)'; ctx.shadowBlur = 8 * u; ctx.shadowOffsetY = 2 * u;
  ctx.fillStyle = o.fill || PAPER2; ctx.fillRect(bx, by, tw, th);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = o.border || GOLD; ctx.lineWidth = 1.2 * u; ctx.strokeRect(bx + 2.5 * u, by + 2.5 * u, tw - 5 * u, th - 5 * u);
  ctx.fillStyle = o.color || INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, bx + tw / 2, by + 5 * u + size * 1.15 * (i + 0.5)));
  ctx.restore();
}
// an inked arrow along a world polyline, drawn up to share p
function arrow(ctx, v, line, p, o = {}) {
  if (p <= 0.001) return;
  const part = G.slice(line, 0, clamp(p));
  screenTransform(ctx, v);
  const pts = part.map(([x, y]) => toScreen(v, x, y)), u = U(v);
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  const w = (o.width || 5) * u;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = o.halo || 'rgba(247,238,219,0.85)'; ctx.lineWidth = w + 4 * u;
  if (o.dash) ctx.setLineDash(o.dash.map(d => d * u));
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.strokeStyle = o.color || RED; ctx.lineWidth = w; ctx.stroke();
  ctx.setLineDash([]);
  if (o.head !== false && pts.length > 1) {
    const [x1, y1] = pts[pts.length - 1];
    let k = pts.length - 2; while (k > 0 && Math.hypot(pts[k][0] - x1, pts[k][1] - y1) < 6) k--;
    const [x0, y0] = pts[k], ang = Math.atan2(y1 - y0, x1 - x0), hs = w * 2.6;
    ctx.fillStyle = o.color || RED;
    ctx.beginPath(); ctx.moveTo(x1 + Math.cos(ang) * hs * 0.6, y1 + Math.sin(ang) * hs * 0.6);
    ctx.lineTo(x1 + Math.cos(ang + 2.5) * hs, y1 + Math.sin(ang + 2.5) * hs); ctx.lineTo(x1 + Math.cos(ang - 2.5) * hs, y1 + Math.sin(ang - 2.5) * hs); ctx.closePath();
    ctx.strokeStyle = o.halo || 'rgba(247,238,219,0.85)'; ctx.lineWidth = 2 * u; ctx.stroke(); ctx.fill();
  }
  ctx.restore();
}
function ring(ctx, v, at, t, o = {}) {
  const [sx, sy] = toScreen(v, ...pt(at)), u = U(v);
  screenTransform(ctx, v);
  ctx.save();
  for (let k = 0; k < 2; k++) {
    const f = ((t * 0.7 + k * 0.5) % 1);
    ctx.globalAlpha = (o.alpha ?? 1) * (1 - f) * 0.9;
    ctx.strokeStyle = o.color || GOLD; ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.arc(sx, sy, (o.r || 18) * u * (0.6 + f * 1.4), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
// big stamped word (screen centre or at a map point)
function stamp(ctx, v, text, p, o = {}) {
  if (p <= 0.01) return;
  screenTransform(ctx, v);
  const u = U(v), size = (o.size || 64) * u;
  let [sx, sy] = o.at ? toScreen(v, ...pt(o.at)) : [v.vx, v.vy];
  sx += (o.dx || 0) * u; sy += (o.dy || 0) * u;
  const k = 1 + (1 - ramp(p, 0, 0.35)) * 0.5;
  ctx.save(); ctx.globalAlpha *= clamp(p * 2.5) * (o.alpha ?? 1);
  ctx.translate(sx, sy); ctx.scale(k, k); ctx.rotate(o.rot ?? -0.04);
  ctx.font = `800 ${size}px ${o.sc ? FONT_SC : FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (o.spacing) ctx.letterSpacing = o.spacing * u + 'px';
  const w = ctx.measureText(text).width;
  if (o.box !== false) {
    ctx.fillStyle = 'rgba(247,238,219,0.9)'; ctx.fillRect(-w / 2 - size * 0.35, -size * 0.66, w + size * 0.7, size * 1.3);
    ctx.strokeStyle = o.color || RED; ctx.lineWidth = size * 0.06; ctx.strokeRect(-w / 2 - size * 0.25, -size * 0.56, w + size * 0.5, size * 1.1);
  } else { ctx.lineWidth = size * 0.18; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(247,238,219,0.9)'; ctx.strokeText(text, 0, size * 0.04); }
  ctx.fillStyle = o.color || RED; ctx.fillText(text, 0, size * 0.04);
  ctx.restore();
}
// galley or tall ship, px size, facing angle
function ship(ctx, v, x, y, ang, color, o = {}) {
  const [sx, sy] = toScreen(v, x, y), u = U(v);
  const k = (o.size || 1) * clamp(v.s / 260, 0.55, 1.4) * u;
  screenTransform(ctx, v);
  ctx.save(); ctx.translate(sx, sy); ctx.globalAlpha *= o.alpha ?? 1;
  const flip = Math.cos(ang) < 0 ? -1 : 1;
  ctx.scale(flip * k, k);
  ctx.lineWidth = 1.2 / k; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  if (o.tall) {   // carrack: high hull, two sails
    ctx.fillStyle = '#7A4A2A';
    ctx.beginPath(); ctx.moveTo(-17, -6); ctx.lineTo(17, -8); ctx.quadraticCurveTo(14, 4, 8, 5); ctx.lineTo(-10, 5); ctx.quadraticCurveTo(-16, 2, -17, -6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F4EAD2';
    ctx.beginPath(); ctx.rect(-3, -30, 12, 20); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(-12, -22, 7, 13); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(2, -36, 6, 4);
  } else {        // galley: long low hull, oars, lateen sail
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(18, -3); ctx.quadraticCurveTo(12, 4, 5, 4); ctx.lineTo(-12, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (let i = -10; i <= 10; i += 4) { ctx.moveTo(i, 3); ctx.lineTo(i - 3, 9); } ctx.stroke();
    ctx.fillStyle = '#F4EAD2';
    ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(1, -20); ctx.lineTo(12, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (o.lantern) { ctx.fillStyle = '#FFD27A'; ctx.beginPath(); ctx.arc(14, -6, 2.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function glow(ctx, v, x, y, r, a, color = '255,200,110') {
  const [sx, sy] = toScreen(v, x, y);
  screenTransform(ctx, v);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.restore();
}
// Ottoman tent (red or white) and banners
function tent(ctx, v, x, y, k, color = '#F2E6CC') {
  const [sx, sy] = toScreen(v, x, y), u = U(v) * k * clamp(v.s / 300, 0.6, 1.5);
  screenTransform(ctx, v);
  ctx.save(); ctx.translate(sx, sy); ctx.scale(u, u);
  ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 1 / u;
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-6, -6); ctx.lineTo(0, -12); ctx.lineTo(6, -6); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color === RED ? GOLD : RED; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(0, -12); ctx.lineTo(6, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (color === RED) { ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, -13.5, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.stroke(); }
  ctx.restore();
}
function banner(ctx, v, x, y, k, color = RED, wave = 0) {
  const [sx, sy] = toScreen(v, x, y), u = U(v) * k * clamp(v.s / 300, 0.6, 1.5);
  screenTransform(ctx, v);
  ctx.save(); ctx.translate(sx, sy); ctx.scale(u, u);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3 / u;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
  ctx.fillStyle = color;
  const w = Math.sin(wave) * 2;
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(7, -22 + w, 14, -19); ctx.lineTo(0, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function dots(ctx, v, list, color, r) {
  screenTransform(ctx, v);
  const u = U(v);
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = 'rgba(247,238,219,0.9)'; ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  for (const [x, y] of list) { const [sx, sy] = toScreen(v, x, y); ctx.moveTo(sx + r * u, sy); ctx.arc(sx, sy, r * u, 0, Math.PI * 2); }
  ctx.fill(); ctx.stroke(); ctx.restore();
}
// offset a polyline sideways (km, + = right of travel direction)
function offset(line, d) {
  return line.map((p, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] - dy / l * d, p[1] + dx / l * d];
  });
}
const outside = offset(G.landWalls, -0.55);    // Ottoman lines west of the walls
const guns = offset(G.landWalls, -0.28);

// ------------------------------------------------------------------------------------------ panel ("levha")
function panel(ctx, r, open, fn) {
  const a = smooth01(0, 1, open);
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(r.side === 'right' ? (1 - a) * 30 : 0, r.side === 'top' ? (1 - a) * -20 : 0);
  ctx.shadowColor = 'rgba(43,29,20,0.45)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
  ctx.fillStyle = PAPER2; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.strokeRect(r.x + 7, r.y + 7, r.w - 14, r.h - 14);
  ctx.lineWidth = 0.8; ctx.strokeRect(r.x + 12, r.y + 12, r.w - 24, r.h - 24);
  ctx.fillStyle = GOLD;
  for (const [cx, cy] of [[r.x + 7, r.y + 7], [r.x + r.w - 7, r.y + 7], [r.x + 7, r.y + r.h - 7], [r.x + r.w - 7, r.y + r.h - 7]]) {
    ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 6, cy); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.rect(r.x + 13, r.y + 13, r.w - 26, r.h - 26); ctx.clip();
  const q = { x: r.x + 22, y: r.y + 20, w: r.w - 44, h: r.h - 40 };
  q.fs = k => Math.max(14, q.w * k);
  q.X = f => q.x + f * q.w; q.Y = f => q.y + f * q.h;
  fn(q);
  ctx.restore();
}
function ptext(ctx, q, text, fx, fy, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  const size = o.px || q.fs(o.k || 0.045);
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 600} ${size}px ${o.sc ? FONT_SC : FONT}`;
  ctx.fillStyle = o.color || INK; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
  ctx.fillText(text, q.X(fx), q.Y(fy));
  if (o.strike) { const w = ctx.measureText(text).width, x0 = o.align === 'center' ? q.X(fx) - w / 2 : q.X(fx); ctx.strokeStyle = RED; ctx.lineWidth = size * 0.1; ctx.beginPath(); ctx.moveTo(x0 - 4, q.Y(fy) - size * 0.32); ctx.lineTo(x0 - 4 + (w + 8) * o.strike, q.Y(fy) - size * 0.32); ctx.stroke(); }
  ctx.restore();
}
function ptitle(ctx, q, text, sub, a = 1) {
  ptext(ctx, q, text, 0, 0.075, { k: 0.062, weight: 800, alpha: a });
  if (sub) ptext(ctx, q, sub, 0, 0.14, { k: 0.036, sc: true, color: BROWN, weight: 500, alpha: a });
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(q.X(0), q.Y(sub ? 0.175 : 0.11)); ctx.lineTo(q.X(1), q.Y(sub ? 0.175 : 0.11)); ctx.stroke(); ctx.restore();
}
function human(ctx, x, y, h, color = INK) {   // standing figure, feet at (x, y), height h px
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.2, h * 0.07); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y - h * 0.9, h * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y - h * 0.78); ctx.lineTo(x, y - h * 0.42); ctx.moveTo(x, y - h * 0.42); ctx.lineTo(x - h * 0.12, y); ctx.moveTo(x, y - h * 0.42); ctx.lineTo(x + h * 0.12, y);
  ctx.moveTo(x - h * 0.16, y - h * 0.55); ctx.lineTo(x, y - h * 0.72); ctx.lineTo(x + h * 0.16, y - h * 0.55); ctx.stroke();
  ctx.restore();
}
function dim(ctx, x0, y0, x1, y1, text, size, o = {}) {   // dimension line with end ticks
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = o.color || RED; ctx.fillStyle = o.color || RED; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  const ang = Math.atan2(y1 - y0, x1 - x0), n = [Math.cos(ang + Math.PI / 2) * 6, Math.sin(ang + Math.PI / 2) * 6];
  ctx.moveTo(x0 - n[0], y0 - n[1]); ctx.lineTo(x0 + n[0], y0 + n[1]); ctx.moveTo(x1 - n[0], y1 - n[1]); ctx.lineTo(x1 + n[0], y1 + n[1]); ctx.stroke();
  ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  const tx = (x0 + x1) / 2 + (o.tdx || 0), ty = (y0 + y1) / 2 + (o.tdy ?? -size * 0.75);
  ctx.lineWidth = size * 0.3; ctx.strokeStyle = PAPER2; ctx.lineJoin = 'round'; ctx.strokeText(text, tx, ty); ctx.fillText(text, tx, ty);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------ the world over time
export function worldState(chapters, T) {
  const st = {
    map: { reveal: 1, fields: 0.55, rumeliHisar: 0, sophiaMosque: 0 },
    night: 0, army: 0, tent: 0, guns: 0, firing: 0, def: 0, defHorn: 0, chain: 0, allied: 0,
    fleetAnchor: 0, hornFleet: 0, breach: 0, stockade: 0, flags: 0, flagSpread: 0, cityOttoman: 0, T,
  };
  for (const ch of chapters) {
    if (ch.start > T) break;
    const lt = Math.min(T - ch.start, ch.dur);
    SCENES[ch.id].state?.(st, lt, ch.cue, ch);
  }
  return st;
}

export function drawWorld(ctx, v, st, T) {
  const u = U(v);
  // breach at the Lycus valley and the stockade that plugged it
  if (st.breach > 0) {
    worldTransform(ctx, v);
    for (const f of [0.535, 0.56, 0.585]) {
      const p = G.along(G.landWalls, f);
      ctx.fillStyle = '#B9A47C'; ctx.strokeStyle = INK; ctx.lineWidth = 1 / v.s;
      const r = 0.035 * st.breach;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.3, r, 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (st.stockade > 0) {
        ctx.globalAlpha = st.stockade; ctx.strokeStyle = '#6B4424'; ctx.lineWidth = Math.max(3 / v.s, 0.012);
        ctx.beginPath(); ctx.moveTo(p.x - 0.03, p.y - 0.035); ctx.lineTo(p.x + 0.02, p.y + 0.035); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  }
  // chain across the Golden Horn
  if (st.chain > 0) {
    worldTransform(ctx, v);
    const [a, b] = G.chain, n = 26, gap = st.chainGap || 0;
    ctx.lineWidth = Math.max(1.4 / v.s, 0.005); ctx.strokeStyle = '#3B3530';
    for (let i = 0; i < n * st.chain; i++) {
      const f = (i + 0.5) / n;
      if (gap > 0 && Math.abs(f - 0.55) < gap * 0.18) continue;
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f + Math.sin(f * Math.PI) * 0.03;
      ctx.beginPath(); ctx.ellipse(x, y, 0.009, 0.005, Math.atan2(b[1] - a[1], b[0] - a[0]) + (i % 2) * 1.2, 0, Math.PI * 2); ctx.stroke();
    }
    // floats (wooden buoys) that held the chain
    ctx.fillStyle = '#8A5A34';
    for (let i = 1; i < 6 * st.chain; i++) { const f = i / 6; if (gap > 0 && Math.abs(f - 0.55) < gap * 0.18) continue; const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f + Math.sin(f * Math.PI) * 0.03; ctx.fillRect(x - 0.012, y - 0.006, 0.024, 0.012); }
  }
  // defenders' ships behind the chain
  if (st.allied > 0) for (let k = 0; k < 8; k++) {
    const p = G.along(G.hornCentre, 0.07 + k * 0.022);
    ship(ctx, v, p.x + (k % 2 ? 0.07 : -0.07), p.y + (k % 2 ? 0.03 : -0.02), Math.PI, k < 3 ? PURPLE : '#8C6A2A', { alpha: st.allied, size: 0.8 });
  }
  // Ottoman fleet at the Double Columns (Dolmabahçe) and later inside the Golden Horn
  if (st.fleetAnchor > 0) for (let k = 0; k < 12; k++) {
    const [x, y] = G.PLACES.fleetAnchor;
    ship(ctx, v, x + (k % 4) * 0.12 - 0.1 + hash(k) * 0.05, y + Math.floor(k / 4) * 0.1 + 0.08, k % 2 ? 0 : Math.PI, RED, { alpha: st.fleetAnchor * (k < 12 - (st.fleetLeft || 0) * 12 ? 1 : 0), size: 0.75 });
  }
  if (st.hornFleet > 0) for (let k = 0; k < 14; k++) {
    const p = G.along(G.hornCentre, 0.26 + (k % 7) * 0.035);
    ship(ctx, v, p.x + (k < 7 ? 0.06 : -0.05), p.y + (k < 7 ? -0.05 : 0.04), k % 2 ? 0 : Math.PI, RED, { alpha: st.hornFleet, size: 0.75 });
  }
  // army along the walls: soldiers in ranks near the moat, a sea of tents behind them
  if (st.army > 0) {
    worldTransform(ctx, v);
    // formations: blocks of soldiers in ranks, parallel to the wall
    const pts = [], sp = Math.max(0.014, 5.5 / v.s);
    for (let j = 0; j < 17; j++) {
      const f = 0.05 + j * 0.056;
      if (f > st.army * 1.02) continue;
      const c = G.along(offset(G.landWalls, -0.42 - (j % 2) * 0.1), f);
      const ax = Math.cos(c.ang), ay = Math.sin(c.ang);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) {
        const a = (k - 4) * sp, b = (r - 1.5) * sp * 1.1;
        pts.push([c.x + ax * a - ay * b, c.y + ay * a + ax * b]);
      }
    }
    dots(ctx, v, pts, RED, 2.2 * clamp(v.s / 300, 0.8, 1.4));
    const tents = [];
    for (let i = 0; i < 90; i++) {
      const f = 0.02 + (i % 30) / 29 * 0.96 + (hash(i) - 0.5) * 0.02;
      if (f > st.army * 1.05) continue;
      const row = Math.floor(i / 30);
      const q = G.along(offset(G.landWalls, -0.75 - row * 0.28 - hash(i + 3) * 0.12), clamp(f));
      tents.push([q.x, q.y, i]);
    }
    tents.sort((a, b) => a[1] - b[1]);
    for (const [x, y, i] of tents) {
      tent(ctx, v, x, y, 0.9 + hash(i + 3) * 0.4, i % 7 === 0 ? '#E9C9A0' : '#F2E6CC');
      if (i % 5 === 0) banner(ctx, v, x + 0.04, y - 0.01, 0.9, RED, st.T * 2 + i);
    }
  }
  if (st.tent > 0) {   // the sultan's pavilion (otağ): large red tent with gold finial
    const [x, y] = G.PLACES.camp;
    ctx.save(); ctx.globalAlpha = st.tent;
    // the imperial compound: a red cloth enclosure (zokak) around the pavilion
    worldTransform(ctx, v);
    const rw = 0.16, rh = 0.09;
    ctx.fillStyle = 'rgba(179,54,43,0.15)'; ctx.strokeStyle = RED; ctx.lineWidth = Math.max(3 / v.s, 0.006);
    ctx.fillRect(x - rw, y - rh, rw * 2, rh * 2); ctx.strokeRect(x - rw, y - rh, rw * 2, rh * 2);
    tent(ctx, v, x - 0.09, y - 0.03, 1.3); tent(ctx, v, x + 0.1, y - 0.02, 1.3);
    tent(ctx, v, x, y + 0.03, 2.6, RED); tent(ctx, v, x - 0.1, y + 0.07, 1.2); tent(ctx, v, x + 0.11, y + 0.075, 1.2);
    banner(ctx, v, x + 0.05, y + 0.02, 1.7, RED, st.T * 2); ctx.restore();
  }
  // cannon batteries and their shots (a deterministic rhythm of flashes and smoke)
  if (st.guns > 0) {
    for (let i = 0; i < 9; i++) {
      const f = 0.1 + i * 0.1 + (i >= 4 && i <= 5 ? -0.02 : 0);
      const p = G.along(guns, f);
      const [sx, sy] = toScreen(v, p.x, p.y), k = clamp(v.s / 300, 0.5, 1.6) * u;
      screenTransform(ctx, v);
      ctx.save(); ctx.globalAlpha = st.guns; ctx.translate(sx, sy);
      const wpt = G.along(G.landWalls, f), [wx, wy] = toScreen(v, wpt.x, wpt.y);
      ctx.rotate(Math.atan2(wy - sy, wx - sx));
      const big = i === 4, L = (big ? 30 : 20) * k, R = (big ? 6 : 4.2) * k;
      ctx.fillStyle = '#6B4424'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.fillRect(-L * 0.55, -R * 1.5, L * 1.05, R * 3); ctx.strokeRect(-L * 0.55, -R * 1.5, L * 1.05, R * 3);
      const bg = ctx.createLinearGradient(0, -R, 0, R); bg.addColorStop(0, '#D9B061'); bg.addColorStop(0.5, '#A57B36'); bg.addColorStop(1, '#6E5028');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-L * 0.5, -R); ctx.lineTo(L * 0.5, -R * 0.85); ctx.lineTo(L * 0.5, R * 0.85); ctx.lineTo(-L * 0.5, R); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(L * 0.5, 0, R * 0.25, R * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (st.firing > 0) {
        const period = 5.5 + hash(i) * 3, ph = ((T + hash(i + 9) * 9) % period) / period, age = ph * period;
        const w = G.along(G.landWalls, f), tgt = toScreen(v, w.x, w.y);
        if (age < 0.22) { glow(ctx, v, p.x, p.y, 52 * k, 0.95 * st.firing, '255,190,90'); }
        if (age > 0.02 && age < 0.4) {   // the stone ball's flight
          const f2 = (age - 0.02) / 0.38, [bx0, by0] = toScreen(v, p.x, p.y);
          const bx = bx0 + (tgt[0] - bx0) * f2, by = by0 + (tgt[1] - by0) * f2 - Math.sin(Math.PI * f2) * 30 * k;
          screenTransform(ctx, v); ctx.save(); ctx.globalAlpha = st.firing; ctx.fillStyle = '#3A3530'; ctx.beginPath(); ctx.arc(bx, by, 3.2 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (age < 3.5) {   // smoke rising
          screenTransform(ctx, v);
          ctx.save(); ctx.globalAlpha = st.firing * 0.55 * (1 - age / 3.5);
          ctx.fillStyle = '#F4EFE6';
          for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.arc(sx + s * 6 * k + age * 5 * k, sy - age * 12 * k - s * 5 * k, (6 + age * 6 + s * 2) * k, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
        if (age > 0.38 && age < 1.2) {   // impact dust on the wall
          screenTransform(ctx, v);
          ctx.save(); ctx.globalAlpha = st.firing * (1 - (age - 0.38) / 0.82) * 0.8; ctx.fillStyle = '#C9B48A';
          for (let s2 = 0; s2 < 3; s2++) { ctx.beginPath(); ctx.arc(tgt[0] + (s2 - 1) * 8 * k, tgt[1] - s2 * 5 * k, (6 + (age - 0.38) * 26) * k, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
        }
      }
    }
  }
  // defenders: purple dots on the land walls; some move to the Golden Horn walls
  if (st.def > 0) {
    const pts = [], hornPts = [];
    const n = 44, moved = Math.round(n * 0.35 * st.defHorn);
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      if (i % Math.max(1, Math.round(n / Math.max(1, moved))) === 0 && hornPts.length < moved) {
        const w = G.along(G.landWalls, f), h = G.along(offset(G.seaWallHorn, -0.06), 0.1 + hornPts.length / Math.max(1, moved) * 0.85);
        const e = st.defHorn;
        hornPts.push([w.x + (h.x - w.x) * e, w.y + (h.y - w.y) * e]);
      } else { const w = G.along(offset(G.landWalls, 0.05), f); pts.push([w.x, w.y]); }
    }
    ctx.save(); ctx.globalAlpha = st.def * (1 - (st.defRout || 0));
    const dr = 3.4 * clamp(v.s / 300, 0.8, 1.5); dots(ctx, v, pts, PURPLE, dr); dots(ctx, v, hornPts, PURPLE, dr);
    ctx.restore();
  }
  // Ottoman flags on the towers after the final assault, spreading from the Lycus valley
  if (st.flags > 0) {
    for (let i = 0; i < 24; i++) {
      const f = 0.56 + (i % 2 ? 1 : -1) * Math.floor(i / 2) * 0.035;
      if (f < 0.02 || f > 0.98) continue;
      const d = Math.abs(f - 0.56) / 0.4;
      if (d > st.flagSpread) continue;
      const p = G.along(G.landWalls, f);
      banner(ctx, v, p.x, p.y, 1.5, RED, T * 3 + i);
    }
  }
  if (st.pour > 0) {   // troops streaming through the breach into the city
    const b = G.along(G.landWalls, 0.56), pts = [];
    for (let i = 0; i < 140; i++) {
      const ang = (hash(i) - 0.5) * 1.7 + 0.25, d = st.pour * (0.15 + hash(i + 40) * 1.1) - hash(i + 80) * 0.25;
      if (d <= 0) continue;
      pts.push([b.x + Math.cos(ang) * d, b.y + Math.sin(ang) * d * 0.9]);
    }
    dots(ctx, v, pts, RED, 2.6 * clamp(v.s / 300, 0.8, 1.4));
  }
}

// ------------------------------------------------------------------------------------------ region sketch (for the sultan chapter)
const LL = (lat, lon) => [lon, lat];
const R_EUROPE = [[44.6, 24.8], [44.6, 28.75], [44.17, 28.66], [43.8, 28.6], [43.4, 28.35], [43.2, 27.95], [42.9, 27.9], [42.5, 27.5], [42.35, 27.75], [42.1, 27.95], [41.87, 28.03], [41.6, 28.2], [41.35, 28.68], [41.22, 29.08], [41.1, 29.05], [41.0, 28.98], [41.03, 28.6], [41.07, 28.25], [40.97, 27.5], [40.83, 27.2], [40.6, 27.1], [40.41, 26.67], [40.15, 26.38], [40.05, 26.2], [40.25, 26.22], [40.48, 26.6], [40.62, 26.9], [40.72, 26.5], [40.72, 26.08], [40.85, 25.87], [40.9, 25.3], [40.93, 24.8]].map(p => LL(...p));
const R_ASIA = [[41.2, 29.12], [41.18, 29.6], [41.12, 30.2], [41.1, 30.7], [41.28, 31.42], [41.6, 32.1], [41.75, 32.4], [41.95, 33.2], [42.0, 34.0], [37.5, 34.0], [37.5, 26.5], [38.3, 26.3], [38.67, 26.75], [39.3, 26.7], [39.58, 27.0], [39.48, 26.07], [39.9, 26.15], [40.15, 26.4], [40.35, 26.7], [40.4, 27.3], [40.5, 27.8], [40.35, 27.97], [40.37, 28.5], [40.37, 28.88], [40.43, 29.1], [40.62, 29.15], [40.72, 29.9], [40.78, 29.5], [40.82, 29.3], [40.9, 29.18], [40.99, 29.03], [41.03, 29.02], [41.12, 29.08]].map(p => LL(...p));
function regionMap(ctx, q, box, o) {
  const lon0 = 25.3, lon1 = 32.0, lat0 = 39.1, lat1 = 43.9, kx = Math.cos(41 * Math.PI / 180);
  const sw = (lon1 - lon0) * kx, sh = lat1 - lat0, s = Math.min(box.w / sw, box.h / sh);
  const ox = box.x + (box.w - sw * s) / 2, oy = box.y + (box.h - sh * s) / 2;
  const X = ([lon, lat]) => [ox + (lon - lon0) * kx * s, oy + (lat1 - lat) * s];
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, sw * s, sh * s); ctx.clip();
  ctx.fillStyle = SEA; ctx.fillRect(ox, oy, sw * s, sh * s);
  const poly = pts => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = X(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
  for (const land of [R_EUROPE, R_ASIA]) { poly(land); ctx.fillStyle = '#E2C993'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke(); }
  // Ottoman lands: hatching on both sides (Anatolia roughly west of 32°E)
  const hatch = (land, a, clipLon) => {
    if (a <= 0) return;
    ctx.save(); poly(land); ctx.clip();
    if (clipLon) { const [cx] = X([clipLon, 40]); ctx.beginPath(); ctx.rect(ox, oy, cx - ox, sh * s); ctx.clip(); }
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(179,54,43,0.28)'; ctx.fillRect(ox, oy, sw * s, sh * s);
    ctx.strokeStyle = 'rgba(179,54,43,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); for (let d = -sh * s; d < sw * s; d += 9) { ctx.moveTo(ox + d, oy + sh * s); ctx.lineTo(ox + d + sh * s, oy); } ctx.stroke();
    ctx.restore();
  };
  hatch(R_EUROPE, o.rum, 0); hatch(R_ASIA, o.ana, 0);
  ctx.restore();
  const fs = Math.max(14, box.w * 0.05);
  const txt = (t, p, c, size = fs, w = 800, halo = true) => { const [x, y] = X(p); ctx.save(); ctx.font = `${w} ${size}px ${FONT_SC}`; ctx.textAlign = 'center'; ctx.lineWidth = halo ? size * 0.28 : 0.01; ctx.strokeStyle = 'rgba(247,238,219,0.9)'; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); ctx.fillStyle = c; ctx.fillText(t, x, y); ctx.restore(); };
  if (o.rum > 0.3) txt('RUMELİ', LL(42.45, 26.95), RED_DK);
  if (o.ana > 0.3) txt('ANADOLU', LL(39.4, 30.75), RED_DK);
  txt('Karadeniz', LL(43.1, 30.4), '#DCE8F5', fs * 0.8, 600, false);
  txt('Ege', LL(39.45, 25.7), '#DCE8F5', fs * 0.72, 600, false);
  const dot = (p, c, r, t, dx = 0, dy = -14) => { const [x, y] = X(p); ctx.fillStyle = c; ctx.strokeStyle = PAPER2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (t) { ctx.save(); ctx.font = `700 ${fs * 0.72}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(247,238,219,0.95)'; ctx.strokeText(t, x + dx, y + dy); ctx.fillStyle = INK; ctx.fillText(t, x + dx, y + dy); ctx.restore(); } return [x, y]; };
  dot(LL(41.68, 26.56), RED, 5, 'Edirne', 0, -12);
  dot(LL(40.19, 29.06), RED, 5, 'Bursa', 0, 22);
  const [cx, cy] = X(LL(41.01, 28.97));
  if (o.city > 0) { ctx.save(); ctx.globalAlpha = o.city; ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 12 + 8 * Math.sin(o.t * 4) ** 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  dot(LL(41.01, 28.97), PURPLE, 7, o.city > 0.3 ? 'Konstantinopolis' : '', 0, -16);
  return X;
}

// ------------------------------------------------------------------------------------------ cameras
const REGION = cam(41.045, 28.99, 16), CITY = cam(41.016, 28.953, 7.5), WALLS = cam(41.018, 28.925, 10.5), LYCUS = cam(41.0235, 28.925, 2.4);
export const CAMS = {
  question: c => [[0, cam(41.035, 28.99, 14), 1], [c('armies'), cam(41.018, 28.93, 9), 4.5], [c('crusade'), cam(41.03, 28.955, 5.2), 3], [c('sultan'), cam(41.02, 28.925, 9), 3], [c('how') - 0.3, cam(41.045, 28.99, 14.5), 3.5]],
  city: c => [[0.3, CITY, 3], [c('people'), cam(41.015, 28.95, 7), 2.5], [c('fields'), cam(41.013, 28.945, 5.2), 3]],
  walls: c => [[0, LYCUS, 3], [c('line') + 0.3, WALLS, 3], [c('section') - 0.2, cam(41.0237, 28.9245, 1.5), 3]],
  sultan: c => [[0, REGION, 3.5]],
  fortress: c => [[0, cam(41.06, 29.03, 7.5), 3.2], [c('anadolu') - 0.3, cam(41.0845, 29.0605, 3), 3], [c('narrow'), cam(41.0838, 29.061, 2.3), 2.2], [c('cut'), cam(41.075, 29.045, 8), 3.5]],
  cannon: c => [[0, cam(41.022, 28.912, 5.5), 3], [c('oxen'), cam(41.024, 28.905, 4.2), 3], [c('myth'), cam(41.02, 28.92, 6), 3]],
  siege: c => [[0, WALLS, 3], [c('tent') - 0.2, cam(41.0205, 28.914, 3), 2.8], [c('count'), cam(41.018, 28.918, 10.5), 2.8], [c('fire'), cam(41.0235, 28.922, 2.6), 3]],
  chain: c => [[0, cam(41.03, 28.958, 5.2), 3], [c('chain') - 0.2, cam(41.0212, 28.9795, 1.7), 3], [c('ships'), cam(41.013, 28.985, 4.4), 3], [c('through'), cam(41.02, 28.978, 2.4), 2.8]],
  overland: c => [[0, cam(41.035, 28.982, 4.4), 3], [c('dawn'), cam(41.031, 28.966, 4.6), 3], [c('spread'), cam(41.024, 28.952, 7.2), 3]],
  may: c => [[0, cam(41.022, 28.94, 7.4), 3], [c('mines') - 0.2, cam(41.031, 28.934, 2.4), 3], [c('breach'), LYCUS, 2.8], [c('moon'), cam(41.022, 28.935, 5), 3]],
  assault: c => [[0, cam(41.0235, 28.922, 3.2), 3], [c('gius'), cam(41.0232, 28.9245, 1.8), 2.6], [c('flag'), cam(41.024, 28.927, 2.8), 2.6], [c('emperor'), cam(41.021, 28.935, 5.2), 3]],
  entry: c => [[0, cam(41.018, 28.955, 6.5), 3], [c('sophia'), cam(41.0105, 28.975, 2.2), 3.2], [c('plunder'), cam(41.016, 28.953, 7), 3], [c('capital'), cam(41.03, 28.96, 14), 3.5]],
  meaning: c => [[0, cam(41.03, 28.975, 11), 3], [c('myth'), WALLS, 3]],
  answer: c => [[0, cam(41.052, 28.992, 18.5), 3.5], [c('s1'), cam(41.051, 28.99, 17.5), c('all') - c('s1')], [c('istanbul'), cam(41.018, 28.962, 8.5), 4]],
};

export const SFX = {
  question: c => [[c('armies') + 0.5, 'drum', 2], [c('crusade'), 'bell', 0.5], [c('days'), 'stamp']],
  city: c => [[c('capital'), 'swish'], [c('romans'), 'bell', 0.4], [c('people'), 'swish']],
  walls: c => [[c('section'), 'swish'], [c('moat'), 'stamp'], [c('outer'), 'stamp'], [c('inner'), 'stamp'], [c('towers'), 'stamp']],
  sultan: c => [[c('throne'), 'swish'], [c('decide'), 'drum', 3]],
  fortress: c => [[c('build'), 'stamp'], [c('guns'), 'boom', 0.6], [c('guns') + 1.1, 'boom', 0.5], [c('name'), 'stamp']],
  cannon: c => [[c('urban'), 'swish'], [c('barrel'), 'stamp'], [c('slow'), 'boom', 1], [c('myth'), 'swish']],
  siege: c => [[c('army'), 'drum', 4], [c('fire'), 'boom', 1], [c('fire') + 1.6, 'boom', 0.8], [c('fire') + 2.7, 'boom', 0.7]],
  chain: c => [[c('chain'), 'chain'], [c('attack'), 'drum', 3], [c('through'), 'chain'], [c('hope'), 'bell', 0.6]],
  overland: c => [[c('logs'), 'creak'], [c('climb'), 'creak'], [c('down'), 'creak'], [c('dawn'), 'drum', 2]],
  may: c => [[c('breach'), 'boom', 1], [c('breach') + 1.4, 'boom', 0.8], [c('moon'), 'bell', 0.3]],
  assault: c => [[c('begin'), 'drum', 6], [c('w1'), 'roar', 3], [c('w2'), 'roar', 3], [c('w3'), 'drum', 5], [c('w3') + 0.3, 'roar', 4], [c('flag'), 'drum', 3]],
  entry: c => [[c('sophia'), 'swish'], [c('capital'), 'stamp']],
  meaning: c => [[c('rome'), 'swish'], [c('fatih'), 'stamp'], [c('myth'), 'swish']],
  answer: c => [[c('s1'), 'stamp'], [c('s2'), 'stamp'], [c('s3'), 'stamp'], [c('s4'), 'stamp'], [c('istanbul'), 'bell', 0.5]],
};

// ------------------------------------------------------------------------------------------ chapters
const shipsInMarmara = G.P(41.0020, 28.9960);
const fourShipsPath = [G.P(40.998, 28.998), G.P(41.009, 28.995), G.P(41.017, 28.9905), G.P(41.0205, 28.984), G.P(41.0215, 28.9775), G.P(41.0235, 28.9715)];
const edirneRoad = [G.P(41.045, 28.83), G.P(41.035, 28.87), G.P(41.027, 28.89), G.P(41.022, 28.903)];

export const SCENES = {
  // 1 ─ a city drawn in ink, a question
  question: {
    state(st, lt, c) { st.map.reveal = ramp(lt, 0.2, Math.max(4, c('armies') - 0.4)); },
    draw(ctx, v, lt, c) {
      // many armies came and turned back
      const a1 = win(lt, c('armies'), c('crusade') + 0.4);
      for (let k = 0; k < 5; k++) {
        const f = 0.1 + k * 0.2, w = G.along(G.landWalls, f);
        const t0 = c('armies') + 0.3 + k * 0.4, p = ramp(lt, t0, 1.4);
        const start = [w.x - 2.6, w.y + (k - 2) * 0.45], end = [w.x - 0.22, w.y];
        arrow(ctx, v, G.smooth([start, [w.x - 1.3, w.y + (k - 2) * 0.15], end], 6), p, { color: '#6B5A48', width: 5, alpha: a1 * (1 - 0.6 * ramp(lt, t0 + 1.6, 0.8)) });
        if (p >= 1) stamp(ctx, v, '✕', a1 * ramp(lt, t0 + 1.4, 0.3), { at: [w.x - 0.12, w.y], size: 26, box: false, color: '#6B5A48' });
      }
      // 1204: the crusaders came over the Golden Horn sea walls
      const a2 = win(lt, c('crusade'), c('sultan') + 0.2);
      if (a2 > 0) {
        const p = G.along(G.seaWallHorn, 0.72);
        arrow(ctx, v, [[p.x + 0.55, p.y - 0.55], [p.x + 0.25, p.y - 0.3], [p.x + 0.05, p.y - 0.06]], ramp(lt, c('crusade') + 0.2, 1.2), { color: '#6B5A48', width: 5, alpha: a2 });
        worldTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = a2 * (0.5 + 0.5 * Math.sin(lt * 3) ** 2); ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 12 / v.s; ctx.lineCap = 'round';
        ctx.beginPath(); G.seaWallHorn.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
        tag(ctx, v, [p.x + 0.4, p.y - 0.45], '1204 · Haçlılar\nHaliç deniz surlarından', { alpha: a2, dy: -60, dx: 40 });
      }
      // 1453: the sultan arrives from the west
      const a3 = win(lt, c('sultan'), c('how'));
      if (a3 > 0) {
        const w = G.PLACES.romanus;
        arrow(ctx, v, G.smooth([[w[0] - 4.2, w[1] - 1.4], [w[0] - 2.4, w[1] - 0.4], [w[0] - 0.45, w[1]]], 6), ramp(lt, c('sultan') + 0.2, 1.8), { color: RED, width: 7, alpha: a3 });
        tag(ctx, v, [w[0] - 2.6, w[1] - 0.5], '1453 · II. Mehmed', { alpha: a3 * ramp(lt, c('sultan') + 0.8, 0.6), color: RED_DK, dy: -50 });
        stamp(ctx, v, '53 gün', ramp(lt, c('days'), 0.8) * a3, { size: 70, at: G.P(41.01, 28.95), dy: 0 });
      }
      // three clues
      const a4 = ramp(lt, c('how') + 0.8, 0.8);
      if (a4 > 0) {
        const clues = [[G.PLACES.rumeliHisar, 'bir kale', 0], [G.PLACES.camp, 'dev bir top', 0.7], [G.shipRoute[Math.floor(G.shipRoute.length / 2)], 'tepeleri aşan gemiler', 1.4]];
        const tw = c('how') + 1.2;
        for (const [p, t, d] of clues) {
          const a = ramp(lt, tw + d, 0.6);
          ring(ctx, v, p, lt, { alpha: a, r: 16 });
          tag(ctx, v, p, t, { alpha: a, dy: -44, size: 19 });
        }
      }
    },
    drawTop(ctx, v, lt, c) {
      // title over the map while the ink is drawn
      const a = win(lt, 0.5, c('armies') + 0.2, 1.2, 0.9);
      if (a <= 0) return;
      screenTransform(ctx, v);
      const u = U(v), cx = v.W / 2, cy = v.H * (v.W < v.H ? 0.36 : 0.42);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const size = Math.min(92 * u, v.W * 0.12);
      ctx.font = `800 ${size}px ${FONT}`;
      ctx.lineWidth = size * 0.2; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(247,238,219,0.94)'; ctx.strokeText("İstanbul'un Fethi", cx, cy);
      ctx.fillStyle = INK; ctx.fillText("İstanbul'un Fethi", cx, cy);
      ctx.font = `800 ${size * 0.5}px ${FONT_SC}`; ctx.letterSpacing = size * 0.06 + 'px';
      ctx.strokeText('1453', cx, cy + size * 0.85); ctx.fillStyle = RED; ctx.fillText('1453', cx, cy + size * 0.85);
      ctx.restore();
    },
  },

  // 2 ─ Constantinople: Roman, and shrunken
  city: {
    state(st, lt, c) { st.map.fields = 0.55 + 0.45 * ramp(lt, c('fields'), 1.2); },
    panel: (lt, c) => win(lt, c('capital') - 0.3, c('fields') + 0.1, 0.8, 0.8),
    drawPanel(ctx, r, lt, c, open) {
      panel(ctx, r, open, q => {
        const pageB = ramp(lt, c('people') - 0.2, 0.6), pageA = 1 - pageB;
        if (pageA > 0) {
          ptitle(ctx, q, 'Konstantinopolis', 'Doğu Roma İmparatorluğu', pageA);
          ptext(ctx, q, '330', 0.5, 0.42, { k: 0.2, weight: 800, align: 'center', color: RED, alpha: pageA * ramp(lt, c('capital'), 0.6) });
          ptext(ctx, q, 'Roma\u2019nın yeni başkenti', 0.5, 0.52, { k: 0.05, align: 'center', italic: true, alpha: pageA * ramp(lt, c('capital') + 0.5, 0.6) });
          const ar = ramp(lt, c('romans'), 0.6) * pageA;
          ptext(ctx, q, 'Halk kendine ne diyordu?', 0.5, 0.66, { k: 0.04, align: 'center', color: BROWN, alpha: ar });
          ptext(ctx, q, 'Rhomaioi · “Romalılar”', 0.5, 0.75, { k: 0.058, weight: 800, align: 'center', alpha: ar });
          const aw = ramp(lt, c('wolf'), 0.6) * pageA;
          ptext(ctx, q, '“Bizans” adı ~1557\u2019de yaygınlaştı', 0.5, 0.88, { k: 0.043, align: 'center', color: PURPLE, alpha: aw });
          const as = ramp(lt, c('small'), 0.6) * pageA;
          ptext(ctx, q, '1453: geriye neredeyse yalnızca şehir kalmıştı', 0.5, 0.97, { k: 0.036, align: 'center', color: RED_DK, alpha: as, italic: true });
        }
        if (pageB > 0) {
          ptitle(ctx, q, 'Küçülen şehir', 'nüfus (tahmini)', pageB);
          // a hundred dots at the peak, fewer than ten left
          const shrink = ramp(lt, c('people') + 1.6, 2.4);
          const cols = 20, rows = 5, cw = q.w / cols, y0 = q.y + q.h * 0.33;
          ctx.save(); ctx.globalAlpha *= pageB;
          for (let i = 0; i < cols * rows; i++) {
            const keep = i < 9;
            const a = keep ? 1 : 1 - clamp(shrink * 1.4 - hash(i) * 0.4);
            if (a <= 0) continue;
            ctx.globalAlpha = pageB * a;
            human(ctx, q.x + (i % cols + 0.5) * cw, y0 + Math.floor(i / cols) * cw * 1.35 + cw, cw * 0.95, keep ? PURPLE : '#8C7A66');
          }
          ctx.restore();
          ptext(ctx, q, 'en parlak döneminde: yüz binlerce', 0, 0.84, { k: 0.042, color: BROWN, alpha: pageB });
          ptext(ctx, q, '1453: 50 binden az', 0, 0.95, { k: 0.058, weight: 800, color: PURPLE, alpha: pageB * ramp(lt, c('people') + 2.2, 0.8) });
        }
      });
    },
    draw(ctx, v, lt, c) {
      const a = win(lt, c('name') - 0.2, c('capital') + 1.5);
      label(ctx, v, G.P(41.013, 28.95), 'KONSTANTİNOPOLİS', { size: 30, sc: true, weight: 800, color: PURPLE, alpha: a, spacing: 4 });
      const af = ramp(lt, c('fields'), 0.8);
      if (af > 0) {
        tag(ctx, v, G.P(41.009, 28.938), 'surların içinde bağlar,\nbahçeler, tarlalar', { alpha: af, dy: -70 });
        label(ctx, v, G.P(40.996, 28.955), 'Marmara', { alpha: af * 0.8, italic: true, size: 18, color: '#E6EEF8', halo: false });
      }
    },
  },

  // 3 ─ the land walls and their cross-section
  walls: {
    panel: (lt, c) => ramp(lt, c('section'), 0.8) * (1 - ramp(lt, 999, 1)),
    drawPanel(ctx, r, lt, c, open) {
      panel(ctx, r, open, q => {
        ptitle(ctx, q, 'Surun kesiti', 'dıştan (batı) içe (doğu)');
        // metres → px: about 62 m across, 22 m up
        const m = Math.min(q.w / 64, q.h * 0.5 / 28), gy = q.y + q.h * 0.76, x0 = q.x + (q.w - 62 * m) / 2;
        const X = mm => x0 + mm * m, Y = mm => gy - mm * m;
        ctx.save();
        // ground
        ctx.fillStyle = '#D9BE86'; ctx.fillRect(q.x, gy, q.w, q.h * 0.22);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
        const aMoat = ramp(lt, c('moat'), 0.8), aOut = ramp(lt, c('outer'), 0.8), aIn = ramp(lt, c('inner'), 0.8), aTw = ramp(lt, c('towers'), 0.8);
        // moat: 20 m wide
        ctx.globalAlpha = aMoat;
        ctx.fillStyle = SEA; ctx.beginPath(); ctx.moveTo(X(2), gy); ctx.lineTo(X(4), Y(-6)); ctx.lineTo(X(20), Y(-6)); ctx.lineTo(X(22), gy); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6E9AD0'; ctx.fillRect(X(3.2), Y(-2.2), 17.6 * m, 1.2);
        ctx.fillStyle = STONE; ctx.fillRect(X(22), Y(2), 1.2 * m, 2 * m); ctx.strokeRect(X(22), Y(2), 1.2 * m, 2 * m);   // low breastwork
        dim(ctx, X(2), Y(-8), X(22), Y(-8), '20 m+', q.fs(0.042), { tdy: q.fs(0.042) * 0.9, alpha: aMoat });
        ptext(ctx, q, 'hendek', (X(12) - q.x) / q.w, (Y(4.5) - q.y) / q.h, { k: 0.042, align: 'center', alpha: aMoat, weight: 700 });
        // outer wall: ~9 m, 2 m thick, with a tower
        ctx.globalAlpha = aOut;
        ctx.fillStyle = STONE; ctx.fillRect(X(36), Y(9), 2 * m, 9 * m); ctx.strokeRect(X(36), Y(9), 2 * m, 9 * m);
        ctx.fillRect(X(35), Y(11.5), 4 * m, 2.5 * m); ctx.strokeRect(X(35), Y(11.5), 4 * m, 2.5 * m);
        for (let i = 0; i < 3; i++) { ctx.fillRect(X(35 + i * 1.5), Y(12.5), 0.9 * m, 1 * m); ctx.strokeRect(X(35 + i * 1.5), Y(12.5), 0.9 * m, 1 * m); }
        dim(ctx, X(40.5), gy, X(40.5), Y(9), '~9 m', q.fs(0.042), { tdx: q.fs(0.042) * 1.4, tdy: 0, alpha: aOut });
        ptext(ctx, q, 'dış sur', (X(37) - q.x) / q.w, (Y(14.5) - q.y) / q.h, { k: 0.042, align: 'center', alpha: aOut, weight: 700 });
        // inner wall: 12 m high, ~5 m thick, tower on top
        ctx.globalAlpha = aIn;
        ctx.fillStyle = '#E7D8B6'; ctx.fillRect(X(53), Y(12), 5 * m, 12 * m); ctx.strokeRect(X(53), Y(12), 5 * m, 12 * m);
        for (let i = 0; i < 4; i++) { ctx.fillRect(X(53 + i * 1.35), Y(13), 0.8 * m, 1 * m); ctx.strokeRect(X(53 + i * 1.35), Y(13), 0.8 * m, 1 * m); }
        ctx.strokeStyle = 'rgba(43,29,20,0.35)'; ctx.lineWidth = 1;
        for (let yy = 1; yy < 12; yy += 1.5) { ctx.beginPath(); ctx.moveTo(X(53), Y(yy)); ctx.lineTo(X(58), Y(yy)); ctx.stroke(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
        dim(ctx, X(50.5), gy, X(50.5), Y(12), '12 m', q.fs(0.042), { tdx: -q.fs(0.042) * 1.1, tdy: -6 * m - q.fs(0.042) * 0.2, alpha: aIn });
        dim(ctx, X(53), Y(15.6), X(58), Y(15.6), '~5 m', q.fs(0.036), { alpha: aIn * (1 - aTw) });
        ptext(ctx, q, 'iç sur', (X(55.5) - q.x) / q.w, (Y(-2.4) - q.y) / q.h, { k: 0.042, align: 'center', alpha: aIn, weight: 700 });
        // tower on the inner wall
        ctx.globalAlpha = aTw;
        ctx.fillStyle = '#E7D8B6'; ctx.fillRect(X(52), Y(19), 7 * m, 7 * m); ctx.strokeRect(X(52), Y(19), 7 * m, 7 * m);
        for (let i = 0; i < 4; i++) { ctx.fillRect(X(52 + i * 1.9), Y(20), 1.1 * m, 1 * m); ctx.strokeRect(X(52 + i * 1.9), Y(20), 1.1 * m, 1 * m); }
        ctx.fillStyle = INK; ctx.fillRect(X(55), Y(16.5), 0.8 * m, 1.6 * m);
        ptext(ctx, q, '96 kule', (X(55.5) - q.x) / q.w, (Y(21.2) - q.y) / q.h, { k: 0.05, align: 'center', color: RED, weight: 800, alpha: aTw });
        // a person for scale
        ctx.globalAlpha = 1;
        human(ctx, X(28.5), gy, 1.75 * m, RED_DK);
        ptext(ctx, q, 'insan', (X(28.5) - q.x) / q.w, (gy - 1.75 * m - q.fs(0.034) * 0.6 - q.y) / q.h, { k: 0.032, align: 'center', color: RED_DK, weight: 700 });
        // the attacker's path over all three
        const aL = ramp(lt, c('layers'), 2.2);
        if (aL > 0) {
          const path = [[X(-1), gy - 4], [X(3), Y(-5)], [X(21), Y(-5)], [X(23), Y(4)], [X(35), Y(11)], [X(45), gy - 4], [X(53), Y(14)]];
          ctx.globalAlpha = 1; ctx.setLineDash([8, 6]); ctx.strokeStyle = RED; ctx.lineWidth = 3;
          const L = path.reduce((s, p, i) => s + (i ? Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0), 0);
          ctx.beginPath(); let acc = 0;
          for (let i = 0; i < path.length; i++) {
            if (!i) { ctx.moveTo(...path[0]); continue; }
            const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
            if (acc + seg > L * aL) { const t = (L * aL - acc) / seg; ctx.lineTo(path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t); break; }
            ctx.lineTo(...path[i]); acc += seg;
          }
          ctx.stroke(); ctx.setLineDash([]);
          ptext(ctx, q, 'üç kat engel', 1, 0.27, { k: 0.05, weight: 800, color: RED, align: 'right' });
          ptext(ctx, q, 'hendek → dış sur → iç sur', 1, 0.34, { k: 0.036, weight: 600, color: BROWN, align: 'right', italic: true });
        }
        ctx.restore();
      });
    },
    draw(ctx, v, lt, c) {
      // the line of the walls, Golden Horn to Marmara
      const a = win(lt, c('line'), c('section') + 0.3);
      if (a > 0) {
        worldTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 9 / v.s; ctx.lineCap = 'round';
        const part = G.slice(G.landWalls, 0, ramp(lt, c('line') + 0.4, 3));
        ctx.beginPath(); part.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
        const s = G.landWalls[0], e = G.landWalls[G.landWalls.length - 1];
        label(ctx, v, [s[0] - 0.3, s[1] + 0.35], 'Marmara', { alpha: a, italic: true, size: 20, color: '#E6EEF8', halo: false });
        label(ctx, v, [e[0] + 0.5, e[1] - 0.35], 'Haliç', { alpha: a, italic: true, size: 20, color: '#E6EEF8', halo: false });
        tag(ctx, v, G.along(G.landWalls, 0.5), 'Kara surları · ~5,7 km\nV. yüzyıl (413)', { alpha: a * ramp(lt, c('line') + 1.5, 0.6), dx: -150, dy: 0 });
      }
    },
  },

  // 4 ─ the young sultan and why the city mattered
  sultan: {
    panel: (lt, c) => win(lt, c('throne') - 0.4, 999, 0.9),
    drawPanel(ctx, r, lt, c, open, ch) {
      panel(ctx, r, open, q => {
        ptitle(ctx, q, 'II. Mehmed', 'Osmanlı padişahı');
        // life strip: three moments, evenly spaced
        const y = q.Y(0.24), fsz = q.fs(0.04);
        ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.X(0.02), y); ctx.lineTo(q.X(0.98), y); ctx.stroke();
        [[1432, 'doğdu', 0.12, 0], [1451, 'tahta çıktı', 0.5, 0.4], [1453, '21 yaşında', 0.88, 0.9]].forEach(([yv, t2, fx, d]) => {
          ctx.globalAlpha = ramp(lt, c('throne') + d, 0.5); ctx.fillStyle = yv === 1453 ? RED : INK;
          ctx.beginPath(); ctx.arc(q.X(fx), y, 5, 0, Math.PI * 2); ctx.fill();
          ctx.textAlign = 'center'; ctx.font = `800 ${fsz}px ${FONT}`; ctx.fillText(String(yv), q.X(fx), y - 12);
          ctx.font = `600 ${fsz * 0.88}px ${FONT}`; ctx.fillText(t2, q.X(fx), y + fsz * 1.2);
        });
        ctx.restore();
        // region sketch
        const am = ramp(lt, c('map') - 0.2, 0.8);
        ctx.save(); ctx.globalAlpha *= am;
        regionMap(ctx, q, { x: q.x, y: q.Y(0.33), w: q.w, h: q.h * 0.58 }, { rum: ramp(lt, c('halves'), 1), ana: ramp(lt, c('halves') + 0.8, 1), city: ramp(lt, c('middle'), 0.6), t: lt });
        ctx.restore();
        const at = ramp(lt, c('threat'), 0.6) * (1 - ramp(lt, c('decide'), 0.4));
        if (at > 0) {
          ptext(ctx, q, 'Haçlılara kapı · taht kavgalarına sığınak', 0.5, 0.995, { k: 0.037, align: 'center', color: PURPLE, weight: 700, alpha: at });
        }
        const ad = ramp(lt, c('decide'), 0.5);
        if (ad > 0) ptext(ctx, q, 'Hedef: Konstantinopolis', 0.5, 0.995, { k: 0.046, align: 'center', color: RED, weight: 800, alpha: ad });
      });
    },
    draw(ctx, v, lt, c) {
      const a = win(lt, 0, c('map'));
      label(ctx, v, G.P(41.06, 28.9), 'RUMELİ', { alpha: a * 0.9, sc: true, size: 26, color: RED_DK, spacing: 6 });
      label(ctx, v, G.P(41.0, 29.06), 'ANADOLU', { alpha: a * 0.9, sc: true, size: 26, color: RED_DK, spacing: 6 });
    },
  },

  // 5 ─ Rumeli Hisarı cuts the Bosphorus
  fortress: {
    state(st, lt, c) { st.map.rumeliHisar = ramp(lt, c('build'), Math.max(2, c('narrow') - c('build'))); },
    draw(ctx, v, lt, c) {
      const A = G.PLACES.anadoluHisar, R = G.PLACES.rumeliHisar, u = U(v);
      tag(ctx, v, A, 'Anadolu Hisarı\nYıldırım Bayezid, 1390\u2019lar', { alpha: win(lt, c('anadolu'), c('narrow') + 0.2), dx: 70, dy: -60 });
      tag(ctx, v, R, 'Yeni kale · 1452', { alpha: win(lt, c('build'), c('narrow') + 0.2), dx: -80, dy: -70, color: RED_DK });
      const am = win(lt, c('months'), c('narrow') + 0.2);
      if (am > 0) {
        const f = ramp(lt, c('months'), 2.2);
        const months = ['Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos'];
        label(ctx, v, [R[0] - 0.3, R[1] + 0.42], months[Math.min(5, Math.floor(f * 5.99))] + ' 1452', { alpha: am, size: 26, weight: 800, color: RED });
        label(ctx, v, [R[0] - 0.3, R[1] + 0.58], '4–5 ayda tamamlandı', { alpha: am * ramp(lt, c('months') + 1.4, 0.5), size: 18 });
      }
      // the narrowest point: ~660 m
      const an = win(lt, c('narrow'), c('cut') - 0.2);
      if (an > 0) {
        const a0 = G.PLACES.rumeliShore, b0 = G.PLACES.anadoluShore;
        const [x0, y0] = toScreen(v, ...a0), [x1, y1] = toScreen(v, ...b0);
        screenTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = an;
        const f = ramp(lt, c('narrow') + 0.3, 1.2);
        ctx.strokeStyle = PAPER2; ctx.lineWidth = 7 * u; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f); ctx.stroke();
        dim(ctx, x0, y0, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, f > 0.95 ? '≈ 660 m' : '', 30 * u, { color: RED, tdy: 44 * u });
        ctx.restore();
      }
      // guns on both shores: crossing fire and a ship that cannot pass
      const ag = win(lt, c('guns'), c('cut') - 0.2);
      if (ag > 0) {
        const a0 = G.PLACES.rumeliShore, b0 = G.PLACES.anadoluShore;
        const mid = [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2];
        for (const [from, bend] of [[a0, -0.25], [b0, 0.25]]) {
          const ln = G.smooth([from, [(from[0] + mid[0]) / 2 + bend * 0.2, (from[1] + mid[1]) / 2 - 0.25], [mid[0], mid[1] - 0.02]], 8);
          arrow(ctx, v, ln, ramp(lt, c('guns') + (bend > 0 ? 0.5 : 0.2), 0.9), { color: RED, width: 3, dash: [7, 6], alpha: ag });
        }
        const sp = ramp(lt, c('guns'), 2.6);
        ship(ctx, v, mid[0] + 0.02, mid[1] - 0.55 + sp * 0.35, Math.PI / 2, '#8C6A2A', { alpha: ag, tall: true, size: 1.2 });
        if (sp > 0.95) stamp(ctx, v, '✕', ag, { at: [mid[0] + 0.02, mid[1] - 0.2], size: 40, box: false });
      }
      stamp(ctx, v, 'BOĞAZKESEN', win(lt, c('name'), c('cut') + 0.4) , { size: 56, sc: true, spacing: 4, at: G.P(41.093, 29.061), dy: -20 });
      label(ctx, v, G.P(41.093, 29.061), 'bugün: Rumeli Hisarı', { alpha: win(lt, c('today'), c('cut') + 0.4), size: 22, dy: 36 * 1, italic: true, weight: 700 });
      // no help from the Black Sea without the sultan's leave
      const ac = ramp(lt, c('cut'), 0.8);
      if (ac > 0) {
        arrow(ctx, v, [G.P(41.14, 29.075), G.P(41.12, 29.068), G.P(41.1, 29.063), G.P(41.09, 29.061)], ramp(lt, c('cut') + 0.2, 1.4), { color: '#8C6A2A', width: 6, alpha: ac, head: false });
        const b = G.P(41.089, 29.061);
        const [bx, by] = toScreen(v, ...b); screenTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = ac * ramp(lt, c('cut') + 1.4, 0.4); ctx.strokeStyle = RED; ctx.lineWidth = 7 * u; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx - 20 * u, by); ctx.lineTo(bx + 20 * u, by); ctx.stroke(); ctx.restore();
        label(ctx, v, G.P(41.135, 29.07), '↑ Karadeniz', { alpha: ac, size: 22, italic: true, color: '#E6EEF8', halo: false, dx: 60 });
      }
    },
  },

  // 6 ─ Urban's great gun
  cannon: {
    state(st, lt, c) { st.guns = ramp(lt, c('oxen') + 2.5, 1.5); },
    panel: (lt, c) => win(lt, c('urban') - 0.3, 999, 0.8),
    drawPanel(ctx, r, lt, c, open) {
      panel(ctx, r, open, q => {
        const pB = ramp(lt, c('barrel') - 0.3, 0.5), pC = ramp(lt, c('myth') - 0.2, 0.5);
        const pA = 1 - pB, pb = pB * (1 - pC);
        if (pA > 0) {
          ptitle(ctx, q, 'Dökümcü Urban', 'Macaristan Krallığı\u2019ndan', pA);
          const ao = ramp(lt, c('offer'), 0.6) * pA;
          ptext(ctx, q, 'Bizans imparatoru', 0.25, 0.36, { k: 0.045, weight: 800, color: PURPLE, align: 'center', alpha: ao });
          ptext(ctx, q, 'ücreti ödeyemedi', 0.25, 0.44, { k: 0.04, align: 'center', alpha: ao, italic: true });
          ptext(ctx, q, '✕', 0.25, 0.6, { k: 0.12, align: 'center', color: RED, alpha: ramp(lt, c('offer') + 1.2, 0.4) * pA, weight: 800 });
          const ae = ramp(lt, c('edirne'), 0.6) * pA;
          ptext(ctx, q, 'II. Mehmed', 0.75, 0.36, { k: 0.045, weight: 800, color: RED, align: 'center', alpha: ae });
          ptext(ctx, q, 'Edirne\u2019de dev top', 0.75, 0.44, { k: 0.04, align: 'center', alpha: ae, italic: true });
          ptext(ctx, q, '✓', 0.75, 0.6, { k: 0.12, align: 'center', color: '#3E6B2E', alpha: ramp(lt, c('edirne') + 1, 0.4) * pA, weight: 800 });
          ctx.save(); ctx.globalAlpha *= ae; ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.X(0.5), q.Y(0.3)); ctx.lineTo(q.X(0.5), q.Y(0.66)); ctx.stroke(); ctx.restore();
        }
        if (pb > 0) {
          ptitle(ctx, q, 'Dev top', 'ölçekli çizim', pb);
          const m = q.w / 11, gy = q.Y(0.5), x0 = q.X(0.02);
          ctx.save(); ctx.globalAlpha *= pb;
          ctx.fillStyle = '#D9BE86'; ctx.fillRect(q.x, gy, q.w, 4);
          // barrel ~8 m on a timber bed
          const L = 8 * ramp(lt, c('barrel'), 1.2);
          ctx.fillStyle = '#6B4424'; ctx.fillRect(x0, gy - 0.35 * m, 8.4 * m, 0.35 * m);
          const g = ctx.createLinearGradient(0, gy - 1.3 * m, 0, gy - 0.3 * m); g.addColorStop(0, '#C9A25A'); g.addColorStop(0.5, '#A07A3A'); g.addColorStop(1, '#6E5028');
          ctx.fillStyle = g; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x0, gy - 0.4 * m); ctx.lineTo(x0, gy - 1.25 * m); ctx.lineTo(x0 + L * m, gy - 1.12 * m); ctx.lineTo(x0 + L * m, gy - 0.5 * m); ctx.closePath(); ctx.fill(); ctx.stroke();
          for (let i = 1; i < L; i += 1.6) { ctx.beginPath(); ctx.moveTo(x0 + i * m, gy - 1.24 * m + i * 0.016 * m); ctx.lineTo(x0 + i * m, gy - 0.42 * m); ctx.stroke(); }
          if (L > 7.9) dim(ctx, x0, gy - 1.6 * m, x0 + 8 * m, gy - 1.6 * m, 'namlu ≈ 8 m', q.fs(0.046));
          const hx = q.X(0.94);
          human(ctx, hx, gy, 1.75 * m, RED_DK);
          ptext(ctx, q, 'insan', 0.94, (gy - 1.75 * m - q.fs(0.034) * 0.7 - q.y) / q.h, { k: 0.034, align: 'center', color: RED_DK, weight: 700 });
          // stone ball, between the muzzle and the person
          const ab = ramp(lt, c('ball'), 0.7);
          if (ab > 0) {
            ctx.globalAlpha = pb * ab; const bx = q.X(0.83), br = 0.36 * m;
            ctx.fillStyle = '#A9A399'; ctx.beginPath(); ctx.arc(bx, gy - br, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(bx - br * 0.3, gy - br * 1.35, br * 0.3, 0, Math.PI * 2); ctx.fill();
            ptext(ctx, q, 'taş gülle', 0.83, (gy + q.fs(0.04) * 1.25 - q.y) / q.h, { k: 0.034, align: 'center', weight: 700 });
            ptext(ctx, q, 'yüzlerce kg', 0.83, (gy + q.fs(0.04) * 2.35 - q.y) / q.h, { k: 0.032, align: 'center', color: BROWN });
          }
          // sixty oxen: a herd of glyphs
          const ao = ramp(lt, c('oxen'), 0.6);
          if (ao > 0) {
            ctx.globalAlpha = pb * ao;
            const cols = 15, cw = q.w / cols, n = Math.round(60 * ramp(lt, c('oxen'), 2));
            for (let i = 0; i < n; i++) ox(ctx, q.x + (i % cols + 0.5) * cw, q.Y(0.68) + Math.floor(i / cols) * cw * 0.62, cw * 0.86);
            ctx.globalAlpha = pb * ramp(lt, c('oxen') + 1.8, 0.5);
            ptext(ctx, q, '60 öküz', 0, 0.96, { k: 0.055, weight: 800, color: RED });
          }
          const as = ramp(lt, c('slow'), 0.6);
          ctx.globalAlpha = pb * as;
          ptext(ctx, q, 'bir atış için saatler · günde birkaç atış', 1, 0.96, { k: 0.034, align: 'right', color: BROWN, weight: 700 });
          ctx.restore();
        }
        if (pC > 0) {
          ptitle(ctx, q, 'Sık yapılan bir yanlış', '', pC);
          ptext(ctx, q, 'Top ilk kez 1453\u2019te kullanıldı', 0.5, 0.26, { k: 0.048, align: 'center', weight: 700, alpha: pC, strike: ramp(lt, c('before'), 0.7) });
          const rows = [['1320’ler', 'Avrupa’da ilk toplar', INK, 0], ['1422', 'Osmanlılar bu şehre karşı top kullandı', PURPLE, 1.6], ['1453', 'yeni olan: topların büyüklüğü', RED, 3.2]];
          ctx.save();
          const x0 = q.X(0.06), y0 = q.Y(0.42), dy = q.h * 0.16, fz = q.fs(0.045);
          ctx.globalAlpha *= pC * ramp(lt, c('before'), 0.5); ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(x0, y0 - dy * 0.3); ctx.lineTo(x0, y0 + dy * 2.3); ctx.stroke();
          rows.forEach(([y, t2, col, d], k) => {
            ctx.globalAlpha = pC * ramp(lt, c('before') + d, 0.5);
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0 + k * dy, 7, 0, Math.PI * 2); ctx.fill();
            ctx.font = `800 ${fz * 1.15}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(y, x0 + 22, y0 + k * dy);
            ctx.font = `600 ${fz * 0.92}px ${FONT}`; ctx.fillText(t2, x0 + 22 + fz * 4.2, y0 + k * dy);
          });
          if (ramp(lt, c('new'), 0.5) > 0) { ctx.globalAlpha = pC * ramp(lt, c('new'), 0.5); ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.strokeRect(x0 - 16, y0 + 2 * dy - dy * 0.38, q.w * 0.97, dy * 0.76); }
          ctx.restore();
        }
      });
    },
    draw(ctx, v, lt, c) {
      // oxen haul the great gun toward the walls
      const ao = win(lt, c('oxen'), c('myth') + 0.3);
      if (ao > 0) {
        arrow(ctx, v, edirneRoad, 1, { color: '#8C6A2A', width: 4, dash: [10, 8], head: false, alpha: ao * 0.8 });
        const f = ramp(lt, c('oxen'), 5);
        const p = G.along(edirneRoad, 0.15 + f * 0.8);
        worldTransform(ctx, v);
        for (let k = 0; k < 6; k++) {
          const q = G.along(edirneRoad, 0.15 + f * 0.8 + 0.02 + k * 0.014);
          const [sx, sy] = toScreen(v, q.x, q.y); screenTransform(ctx, v); ctx.save(); ctx.globalAlpha = ao; ox(ctx, sx, sy, 16 * U(v)); ctx.restore();
        }
        const [sx, sy] = toScreen(v, p.x, p.y); screenTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = ao; ctx.translate(sx, sy); ctx.rotate(p.ang); ctx.fillStyle = '#A07A3A'; ctx.strokeStyle = INK; ctx.fillRect(-26 * U(v), -5 * U(v), 30 * U(v), 10 * U(v)); ctx.strokeRect(-26 * U(v), -5 * U(v), 30 * U(v), 10 * U(v)); ctx.restore();
        label(ctx, v, [edirneRoad[0][0], edirneRoad[0][1] - 0.15], '← Edirne', { alpha: ao, size: 20, weight: 700 });
      }
    },
  },

  // 7 ─ 6 April: the siege begins
  siege: {
    state(st, lt, c) {
      st.army = ramp(lt, c('army'), 3.5); st.tent = ramp(lt, c('tent'), 0.8); st.def = ramp(lt, c('def'), 1);
      st.firing = ramp(lt, c('fire'), 0.4); st.guns = 1; st.fleetAnchor = ramp(lt, c('army'), 2);
      st.breach = 0.5 * ramp(lt, c('fire') + 1, 2); st.night = 0.75 * win(lt, c('night'), 999, 1.2); st.stockade = ramp(lt, c('night') + 1, 1.5);
      if (lt > c('night')) st.firing *= 1 - ramp(lt, c('night'), 1);
    },
    panel: (lt, c) => win(lt, c('count') - 0.2, c('fire') - 0.2, 0.8, 0.7),
    drawPanel(ctx, r, lt, c, open) {
      panel(ctx, r, open, q => {
        ptitle(ctx, q, 'Karşı karşıya', 'her simge ≈ 1000 kişi');
        const cols = 16, cw = q.w / cols, h = cw * 1.05;
        const ac = ramp(lt, c('count'), 0.6);
        ptext(ctx, q, 'Kuşatanlar: 50–80 bin (tahmin)', 0, 0.25, { k: 0.042, weight: 800, color: RED, alpha: ac });
        const n = Math.round(80 * ramp(lt, c('count') + 0.3, 2.4));
        ctx.save();
        for (let i = 0; i < n; i++) { ctx.globalAlpha = ac * (i < 50 ? 1 : 0.35); human(ctx, q.x + (i % cols + 0.5) * cw, q.Y(0.28) + (Math.floor(i / cols) + 1) * h, h * 0.85, RED); }
        const ad = ramp(lt, c('def'), 0.6);
        ctx.globalAlpha = ad;
        ptext(ctx, q, 'Savunucular: ~7 bin', 0, 0.83, { k: 0.042, weight: 800, color: PURPLE });
        for (let i = 0; i < 7; i++) human(ctx, q.x + (i + 0.5) * cw, q.Y(0.84) + h, h * 0.85, PURPLE);
        const ag = ramp(lt, c('gius'), 0.6);
        if (ag > 0) {
          ctx.globalAlpha = ag; ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.strokeRect(q.x + 6 * cw + 1, q.Y(0.84) + 2, cw * 0.72, h + 2);
          ptext(ctx, q, '← Giustiniani ve 700 asker', (7.2 * cw) / q.w, 0.84 + (h * 0.7) / q.h, { k: 0.036, weight: 700, color: BROWN, alpha: 1 });
        }
        ctx.restore();
      });
    },
    draw(ctx, v, lt, c) {
      tag(ctx, v, G.PLACES.camp, 'Otağ\n(padişahın çadırı)', { alpha: win(lt, c('tent') + 0.3, c('count')), dx: -30, dy: -80, color: RED_DK });
      tag(ctx, v, G.PLACES.lycus, 'Lykos vadisi', { alpha: win(lt, c('tent') + 0.8, c('count')), dx: 90, dy: -40 });
      label(ctx, v, G.P(41.04, 28.9), 'Osmanlı ordusu', { alpha: win(lt, c('army') + 1, c('tent')), size: 26, weight: 800, color: RED_DK });
      const an = ramp(lt, c('night'), 1);
      if (an > 0) tag(ctx, v, G.along(G.landWalls, 0.56), 'gece onarım:\ntoprak, taş, kazık', { alpha: an, dx: 110, dy: -30 });
    },
    drawNight(ctx, v, lt, c) {
      const an = ramp(lt, c('night') + 0.5, 1);
      for (let k = 0; k < 7; k++) {
        const p = G.along(offset(G.landWalls, 0.04 + hash(k) * 0.05), 0.53 + k * 0.012);
        glow(ctx, v, p.x, p.y, 22 * U(v) * (0.8 + 0.3 * Math.sin(lt * 5 + k)), 0.6 * an);
      }
    },
  },

  // 8 ─ the chain and the four ships
  chain: {
    state(st, lt, c) {
      st.night = 0.75 * (1 - ramp(lt, 0, 1.5)); st.stockade = 1; st.firing = 0.5 * ramp(lt, 1, 1);
      st.chain = ramp(lt, c('chain'), 2); st.allied = ramp(lt, c('safe'), 1);
      const pass = ramp(lt, c('through') - 0.6, 3.2);
      st.chainGap = win(lt, c('through') - 0.8, c('through') + 3, 0.6, 0.8);
      st.fourShips = { f: ramp(lt, c('ships'), c('through') + 3 - c('ships')), pass };
    },
    draw(ctx, v, lt, c, st) {
      const ah = win(lt, c('horn'), c('chain') + 0.4);
      if (ah > 0) {
        worldTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = ah * (0.55 + 0.45 * Math.sin(lt * 3) ** 2); ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 11 / v.s; ctx.lineCap = 'round';
        ctx.beginPath(); G.seaWallHorn.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
        tag(ctx, v, G.along(G.seaWallHorn, 0.72), 'Haliç deniz surları\n1204\u2019te buradan aşıldı', { alpha: ramp(lt, c('remember'), 0.6) * ah, dx: 60, dy: -80 });
        label(ctx, v, G.PLACES.hornMid, 'HALİÇ', { alpha: ah, sc: true, size: 24, color: '#E6EEF8', halo: false, spacing: 6, dy: -4 });
      }
      tag(ctx, v, [(G.chain[0][0] + G.chain[1][0]) / 2, (G.chain[0][1] + G.chain[1][1]) / 2 + 0.02], 'zincir', { alpha: win(lt, c('chain') + 0.6, c('ships')), dx: 70, dy: 50 });
      tag(ctx, v, G.PLACES.galata, 'Galata (Cenevizliler)', { alpha: win(lt, c('chain') + 1, c('ships')), dx: 40, dy: -70 });
      // four tall ships from the Marmara, Ottoman galleys swarming them
      const fs = st.fourShips;
      if (lt >= c('ships') - 0.5) {
        const f = fs.f, a = ramp(lt, c('ships') - 0.5, 0.6);
        const path = G.smooth(fourShipsPath, 6);
        for (let k = 0; k < 4; k++) {
          const p = G.along(path, clamp(f * 1.02 - k * 0.03));
          ship(ctx, v, p.x + (k % 2) * 0.05, p.y + (k > 1 ? 0.05 : 0), p.ang, k === 3 ? PURPLE : '#8C6A2A', { tall: true, size: 1.35, alpha: a });
        }
        const at = win(lt, c('attack'), c('through') + 1.2);
        if (at > 0) {
          const lead = G.along(path, clamp(f * 1.02));
          for (let k = 0; k < 10; k++) {
            const ang = k / 10 * Math.PI * 2 + lt * 0.2, rr = 0.22 + hash(k) * 0.1;
            const tx = lead.x + Math.cos(ang) * rr, ty = lead.y + Math.sin(ang) * rr * 0.8;
            const from = [G.PLACES.fleetAnchor[0] - 0.2, G.PLACES.fleetAnchor[1] + 0.3];
            const e = ramp(lt, c('attack') + k * 0.08, 1.4);
            if (G.inside(G.europe, tx, ty)) continue;
            ship(ctx, v, from[0] + (tx - from[0]) * e, from[1] + (ty - from[1]) * e, ang + Math.PI / 2, RED, { alpha: at, size: 0.8 });
          }
          if (lt > c('attack') + 1) glow(ctx, v, lead.x, lead.y, 40 * U(v) * (0.7 + 0.3 * Math.sin(lt * 9)), 0.5 * at, '255,150,80');
        }
        tag(ctx, v, G.along(path, clamp(f)), '20 Nisan · dört gemi', { alpha: win(lt, c('ships') + 0.5, c('attack') + 0.5), dx: 90, dy: 20 });
        tag(ctx, v, G.along(path, clamp(f)), 'yüksek bordalı gemiler', { alpha: win(lt, c('tall'), c('through')), dx: 100, dy: 30 });
      }
      stamp(ctx, v, 'Umut', ramp(lt, c('hope'), 0.6), { size: 50, at: G.along(G.hornCentre, 0.12), dx: 0, dy: -60, color: PURPLE });
    },
  },

  // 9 ─ the ships go over the hill
  overland: {
    state(st, lt, c) {
      st.chain = 1; st.allied = 1; st.firing = 0.3;
      st.night = 0.85 * win(lt, c('night') - 0.4, c('dawn') + 0.8, 1.4, 1.8);
      st.fleetLeft = ramp(lt, c('night'), c('dawn') - c('night'));
      st.hornFleet = ramp(lt, c('dawn') - 0.2, 1.4);
      st.defHorn = ramp(lt, c('spread'), 2.4);
    },
    panel: (lt, c) => win(lt, c('climb') - 0.3, c('dawn') + 0.3, 0.8, 0.8),
    drawPanel(ctx, r, lt, c, open) {
      panel(ctx, r, open, q => {
        ptitle(ctx, q, 'Tepenin kesiti', 'Haliç ← sırt ← Boğaz');
        const gy = q.Y(0.84), X = f => q.X(1 - f), H = f => Math.sin(Math.PI * clamp(f)) ** 1.3 * q.h * 0.42 * (1 - 0.15 * f);
        ctx.save();
        ctx.fillStyle = SEA; ctx.fillRect(q.x, gy, q.w * 0.12, q.h * 0.2); ctx.fillRect(q.X(0.88), gy, q.w * 0.12, q.h * 0.2);
        ctx.fillStyle = '#D9BE86'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(X(0.1), gy + q.h * 0.2);
        for (let i = 0; i <= 60; i++) { const f = i / 60; ctx.lineTo(X(0.1 + f * 0.8), gy - H(f)); }
        ctx.lineTo(X(0.9), gy + q.h * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
        // log track
        ctx.strokeStyle = '#6B4424'; ctx.lineWidth = 2.5;
        for (let i = 1; i < 30; i++) { const f = i / 30, x = X(0.1 + f * 0.8), y = gy - H(f); ctx.beginPath(); ctx.moveTo(x - 4, y - 1); ctx.lineTo(x + 4, y + 1); ctx.stroke(); }
        // trees on the ridge
        for (let i = 0; i < 9; i++) { const f = 0.15 + i * 0.085, x = X(0.1 + f * 0.8) + 10, y = gy - H(f) - 2; ctx.fillStyle = '#2C4A33'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 6, y - 12, x, y - 22); ctx.quadraticCurveTo(x + 6, y - 12, x, y); ctx.fill(); }
        // the ship on the profile, following the lead ship on the map
        const f = ramp(lt, c('night'), c('dawn') - c('night'));
        const sx = X(0.1 + f * 0.8), sy = gy - H(f), f2 = clamp(f + 0.01);
        const ang = Math.atan2((gy - H(f2)) - sy, X(0.1 + f2 * 0.8) - sx);
        ctx.save(); ctx.translate(sx, sy - 6); ctx.rotate(ang - Math.PI); const k = q.w / 260;
        ctx.scale(-k * 1.6, k * 1.6); ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(18, -3); ctx.quadraticCurveTo(12, 4, 5, 4); ctx.lineTo(-12, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#F4EAD2'; ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(1, -20); ctx.lineTo(12, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        // haulers
        for (let i = 0; i < 5; i++) { const ff = clamp(f + 0.03 + i * 0.02); human(ctx, X(0.1 + ff * 0.8), gy - H(ff), q.h * 0.05, INK); }
        ptext(ctx, q, 'Haliç', 0.06, 0.93, { k: 0.036, weight: 700, color: PAPER2, align: 'center' });
        ptext(ctx, q, 'Boğaz', 0.94, 0.93, { k: 0.036, weight: 700, color: PAPER2, align: 'center' });
        ptext(ctx, q, 'kütükler yağlandı', 0.5, 0.27, { k: 0.04, align: 'center', italic: true, color: BROWN });
        ctx.restore();
      });
    },
    draw(ctx, v, lt, c) {
      const ar = ramp(lt, c('around'), 1.6);
      if (ar > 0) {
        arrow(ctx, v, G.shipRoute, ar, { color: RED_DK, width: 4, dash: [9, 7], alpha: 1 - ramp(lt, c('spread'), 1) * 0.7 });
        label(ctx, v, G.along(G.shipRoute, 0.45), '≈ 3 km', { alpha: win(lt, c('around') + 1, c('night')), size: 22, weight: 800, color: RED_DK, dy: -26 });
        tag(ctx, v, G.shipRoute[0], 'Dolmabahçe', { alpha: win(lt, c('around') + 0.4, c('night') + 1), dx: 70, dy: 40, size: 17 });
        tag(ctx, v, G.shipRoute[G.shipRoute.length - 1], 'Kasımpaşa', { alpha: win(lt, c('around') + 1.2, c('night') + 1), dx: -60, dy: 50, size: 17 });
      }
      const al = ramp(lt, c('logs'), 1.5);
      if (al > 0) {
        worldTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = '#6B4424'; ctx.lineWidth = 2.2 / v.s;
        const n = Math.round(46 * al);
        ctx.beginPath();
        for (let i = 1; i < n; i++) { const p = G.along(G.shipRoute, i / 46), nx = -Math.sin(p.ang) * 0.03, ny = Math.cos(p.ang) * 0.03; ctx.moveTo(p.x - nx, p.y - ny); ctx.lineTo(p.x + nx, p.y + ny); }
        ctx.stroke(); ctx.restore();
      }
      this.ships(ctx, v, lt, c, false);
      const ad = ramp(lt, c('dawn') + 0.4, 0.8);
      if (ad > 0) stamp(ctx, v, '~70 gemi Haliç\u2019te', ad * (1 - ramp(lt, c('spread') + 0.5, 0.6)), { size: 40, at: G.along(G.hornCentre, 0.32), dy: 70 });
      const au = win(lt, c('unbroken'), c('spread') + 1.5);
      if (au > 0) { ring(ctx, v, G.chain[0], lt, { alpha: au, r: 24 }); tag(ctx, v, G.chain[1], 'zincir sağlam', { alpha: au, dx: 60, dy: -50 }); }
      const as = ramp(lt, c('spread') + 0.4, 0.8);
      if (as > 0) tag(ctx, v, G.along(G.seaWallHorn, 0.55), 'savunucular Haliç\nsurlarına da dağıldı', { alpha: as, dx: -120, dy: -70, color: PURPLE });
    },
    ships(ctx, v, lt, c, lamps) {
      const t0 = c('night'), t1 = c('dawn');
      if (lt < t0 - 0.3 || lt > t1 + 0.6) return;
      const a = win(lt, t0 - 0.3, t1 + 0.6, 0.5, 0.6);
      for (let k = 0; k < 9; k++) {
        const f = clamp((lt - t0) / (t1 - t0) * 1.35 - k * 0.045);
        if (f <= 0 || f >= 1) continue;
        const p = G.along(G.shipRoute, f);
        if (lamps) glow(ctx, v, p.x, p.y, 24 * U(v), 0.75 * a);
        else ship(ctx, v, p.x, p.y, p.ang, RED, { alpha: a, size: 1.25, lantern: true });
      }
    },
    drawNight(ctx, v, lt, c) { this.ships(ctx, v, lt, c, true); this.ships(ctx, v, lt, c, false); },
  },

  // 10 ─ May: mines, breaches, the eclipse
  may: {
    state(st, lt, c) {
      st.hornFleet = 1; st.fleetLeft = 1; st.defHorn = 1; st.firing = 0.8; st.breach = 0.5 + 0.5 * ramp(lt, c('breach'), 1.5);
      st.stockade = 1 - 0.6 * win(lt, c('breach'), c('repair'), 0.4, 0.8);
      st.night = 0.8 * ramp(lt, c('moon') - 0.3, 1.2);
    },
    draw(ctx, v, lt, c) {
      const at = win(lt, c('thin'), c('mines'));
      if (at > 0) tag(ctx, v, G.along(G.landWalls, 0.35), 'az sayıda savunucu,\nçok uzun surlar', { alpha: at, dx: 130, dy: 20, color: PURPLE });
      // tunnels under the walls near Blachernae and counter-tunnels
      const am = win(lt, c('mines'), c('breach') + 0.3);
      if (am > 0) {
        for (let k = 0; k < 3; k++) {
          const f = 0.72 + k * 0.07, w = G.along(G.landWalls, f);
          arrow(ctx, v, [[w.x - 0.45, w.y + 0.05], [w.x - 0.2, w.y + 0.02], [w.x + 0.02, w.y]], ramp(lt, c('mines') + k * 0.3, 1.4), { color: '#7A5230', width: 3.5, dash: [5, 5], alpha: am });
          arrow(ctx, v, [[w.x + 0.3, w.y - 0.05], [w.x + 0.1, w.y - 0.02], [w.x + 0.02, w.y]], ramp(lt, c('counter') + k * 0.3, 1.2), { color: PURPLE, width: 3.5, dash: [5, 5], alpha: am });
          if (lt > c('counter') + 1.3 + k * 0.3) stamp(ctx, v, '✕', am, { at: [w.x + 0.02, w.y], size: 30, box: false, color: PURPLE });
        }
        tag(ctx, v, G.along(G.landWalls, 0.79), 'tüneller ve karşı tüneller', { alpha: am, dx: -170, dy: -40 });
      }
      const ab = win(lt, c('breach'), c('moon'));
      if (ab > 0) {
        ring(ctx, v, G.PLACES.lycus, lt, { alpha: ab, color: RED, r: 26 });
        tag(ctx, v, G.PLACES.lycus, 'Lykos vadisinde gedikler', { alpha: ab, dx: 120, dy: -40, color: RED_DK });
        tag(ctx, v, G.along(G.landWalls, 0.6), 'her gece yamanıyor', { alpha: ramp(lt, c('repair'), 0.5) * ab, dx: 120, dy: 50 });
      }
    },
    drawTop(ctx, v, lt, c) {
      // a partial eclipse of the moon, 22 May 1453
      const a = ramp(lt, c('moon') - 0.2, 1);
      if (a <= 0) return;
      screenTransform(ctx, v);
      const u = U(v), r = 46 * u;
      const cx = v.W < v.H ? v.W - r - 24 : v.W * 0.62, cy = v.W < v.H ? 150 + r : v.H * 0.24;
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 3); g.addColorStop(0, 'rgba(255,240,200,0.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
      ctx.fillStyle = '#F6EBCB'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      const e = ramp(lt, c('moon') + 0.3, 2.6);
      ctx.fillStyle = 'rgba(110,40,30,0.88)'; ctx.beginPath(); ctx.arc(cx - r * 2.1 + e * r * 1.35, cy + r * 0.25, r * 1.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.font = `700 ${18 * u}px ${FONT_SC}`; ctx.textAlign = 'center'; ctx.fillStyle = '#F6EBCB';
      ctx.fillText('22 Mayıs · ay tutulması', cx, cy + r + 26 * u);
      ctx.restore();
    },
  },

  // 11 ─ 29 May: the final assault
  assault: {
    state(st, lt, c) {
      st.night = 0.8 * (1 - ramp(lt, c('w3') + 1, c('flag') - c('w3') + 1));
      st.firing = 1; st.stockade = 1; st.breach = 1;
      st.defRout = ramp(lt, c('collapse'), 2) * 0.85;
      st.flags = ramp(lt, c('flag'), 0.5); st.flagSpread = ramp(lt, c('flag'), c('emperor') - c('flag') + 3); st.pour = ramp(lt, c('collapse') + 0.5, 6);
    },
    draw(ctx, v, lt, c) {
      const waves = [['w1', '#9A6A5A', '1. dalga: düzensiz birlikler', 0.62], ['w2', RED, '2. dalga: Anadolu birlikleri', 0.5], ['w3', RED_DK, '3. dalga: yeniçeriler', 0.56]];
      waves.forEach(([cue, col, text, f], k) => {
        const end = k < 2 ? c(waves[k + 1][0]) + 0.9 : c('gius') + 2.5;
        const a = win(lt, c(cue), end, 0.5, 0.8);
        if (a <= 0) return;
        for (let j = -1; j <= 1; j++) {
          const w = G.along(G.landWalls, f + j * 0.025);
          arrow(ctx, v, [[w.x - 0.62, w.y + j * 0.04], [w.x - 0.3, w.y + j * 0.015], [w.x - 0.07, w.y]], ramp(lt, c(cue) + Math.abs(j) * 0.15, 1.1), { color: col, width: k === 2 ? 7 : 5.5, alpha: a });
        }
        const w = G.along(G.landWalls, f);
        tag(ctx, v, [w.x - 0.62, w.y], text, { alpha: a, dx: -40, dy: -60, color: col === '#9A6A5A' ? INK : col });
      });
      // Giustiniani wounded
      const ag = win(lt, c('gius') - 0.3, c('flag') + 0.5);
      if (ag > 0) {
        const w = G.along(offset(G.landWalls, 0.08), 0.555), back = ramp(lt, c('gius') + 1.2, 2.5);
        const x = w.x + back * 0.35, y = w.y - back * 0.05;
        dots(ctx, v, [[x, y]], GOLD, 7);
        tag(ctx, v, [x, y], 'Giustiniani yaralandı', { alpha: ag, dx: 120, dy: -50 });
      }
      label(ctx, v, G.along(offset(G.landWalls, 0.45), 0.56), 'savunma çözüldü', { alpha: win(lt, c('collapse') + 0.3, c('flag') + 0.4), size: 24, weight: 800, color: PURPLE });
      const af = win(lt, c('flag') + 0.3, c('emperor') + 0.2);
      if (af > 0) tag(ctx, v, G.along(G.landWalls, 0.56), 'Osmanlı sancağı surlarda\n(geleneğe göre ilk: Ulubatlı Hasan)', { alpha: af, dx: 150, dy: -80, color: RED_DK });
      const ae = ramp(lt, c('emperor'), 0.8);
      if (ae > 0) tag(ctx, v, G.along(offset(G.landWalls, 0.35), 0.5), 'XI. Konstantin, son imparator\nölümünün nasıl olduğu bilinmiyor', { alpha: ae, dx: 120, dy: 90, color: PURPLE });
    },
    drawNight(ctx, v, lt, c) {
      const a = win(lt, 0, c('flag') + 1);
      for (let k = 0; k < 16; k++) {
        const w = G.along(offset(G.landWalls, -0.1 - hash(k) * 0.4), 0.45 + hash(k + 5) * 0.2);
        glow(ctx, v, w.x, w.y, 11 * U(v) * (0.75 + 0.25 * Math.sin(lt * 6 + k)), 0.7 * a, '255,170,90');
      }
    },
  },

  // 12 ─ the entry, Hagia Sophia, a new capital
  entry: {
    state(st, lt, c) {
      st.flags = 1; st.flagSpread = 1; st.def = 0; st.pour = 1 - ramp(lt, c('plunder'), 3); st.army = 1 - ramp(lt, c('rebuild'), 2); st.firing = 0; st.guns = 1 - ramp(lt, 0, 2);
      st.map.sophiaMosque = ramp(lt, c('mosque'), 2);
    },
    draw(ctx, v, lt, c) {
      const ae = ramp(lt, c('enter'), 3);
      if (ae > 0) arrow(ctx, v, G.mese.slice().reverse(), ae, { color: RED, width: 6, alpha: 1 - ramp(lt, c('plunder'), 1) * 0.8 });
      tag(ctx, v, G.PLACES.sophia, 'Ayasofya · 537', { alpha: win(lt, c('sophia'), c('mosque') + 0.2), dx: -200, dy: -200 });
      tag(ctx, v, G.PLACES.sophia, 'cami oldu\nilk cuma namazı: 1 Haziran 1453', { alpha: win(lt, c('mosque') + 0.4, c('plunder') + 0.4), dx: -150, dy: -100, color: RED_DK });
      // smoke over the quarters
      const ap = win(lt, c('plunder'), c('rebuild') + 0.8);
      if (ap > 0) {
        screenTransform(ctx, v);
        for (let k = 0; k < 7; k++) {
          const p = G.P(41.005 + hash(k) * 0.025, 28.93 + hash(k + 2) * 0.05);
          const [sx, sy] = toScreen(v, ...p);
          ctx.save(); ctx.globalAlpha = ap * 0.45; ctx.fillStyle = '#5C5048';
          for (let s = 0; s < 4; s++) { const tt = (lt * 0.3 + s * 0.25 + hash(k)) % 1; ctx.globalAlpha = ap * 0.4 * (1 - tt); ctx.beginPath(); ctx.arc(sx + tt * 20, sy - tt * 60, 8 + tt * 18, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
      }
      // new settlers from every side
      const as = win(lt, c('settle'), 999);
      if (as > 0) {
        const tgt = G.P(41.015, 28.955);
        for (const [from, d] of [[G.P(41.05, 28.86), 0], [G.P(40.985, 28.88), 0.3], [G.P(41.0, 29.04), 0.6], [G.P(41.06, 29.0), 0.9]]) {
          arrow(ctx, v, G.smooth([from, [(from[0] + tgt[0]) / 2, (from[1] + tgt[1]) / 2 - 0.15], [tgt[0] + (from[0] - tgt[0]) * 0.25, tgt[1] + (from[1] - tgt[1]) * 0.25]], 5), ramp(lt, c('settle') + d, 1.2), { color: '#3E6B2E', width: 4.5, alpha: as * (1 - ramp(lt, c('capital'), 1)) });
        }
        label(ctx, v, G.P(41.052, 28.875), 'yeni yerleşenler', { alpha: as * (1 - ramp(lt, c('capital'), 1)), size: 20, weight: 700, color: '#2E5222' });
      }
      tag(ctx, v, G.PLACES.apostles, 'Rum Ortodoks Patrikhanesi', { alpha: win(lt, c('patriarch'), c('capital') + 0.5), dx: 40, dy: -80, color: PURPLE });
      const ac = ramp(lt, c('capital'), 0.8);
      if (ac > 0) {
        arrow(ctx, v, G.smooth([G.P(41.09, 28.84), G.P(41.06, 28.9), G.P(41.03, 28.935)], 6), ramp(lt, c('capital') + 0.2, 1.4), { color: RED, width: 7, alpha: ac });
        tag(ctx, v, G.P(41.09, 28.84), 'Başkent:\nEdirne → İstanbul', { alpha: ac, dx: 60, dy: -30, color: RED_DK, size: 20 });
      }
    },
  },

  // 13 ─ what it meant
  meaning: {
    state(st, lt, c) { st.map.sophiaMosque = 1; st.flags = 1 - ramp(lt, c('myth'), 1); st.flagSpread = 1; st.army = 0; st.guns = 0; },
    panel: (lt, c) => win(lt, c('rome') - 0.4, c('myth') + 0.2, 0.8, 0.8),
    drawPanel(ctx, r, lt, c, open) {
      panel(ctx, r, open, q => {
        ptitle(ctx, q, 'Bin yüz yılı aşkın', 'Doğu Roma 330 → 1453');
        const y = q.Y(0.34), ax = q.X(0.03), bx = q.X(0.97);
        const yr = yv => ax + (yv - 300) / (1640 - 300) * (bx - ax);
        const f = ramp(lt, c('rome'), 2.2);
        ctx.save();
        ctx.fillStyle = 'rgba(94,47,107,0.25)'; ctx.fillRect(yr(330), y - 9, (yr(1453) - yr(330)) * f, 18);
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(bx, y); ctx.stroke();
        const fz = q.fs(0.036);
        for (const [yv, t, up] of [[330, 'başkent', 1], [413, 'surlar', 0], [537, 'Ayasofya', 1], [1204, 'Haçlılar', 1], [1453, 'fetih', 0], [1557, '“Bizans” adı', 1]]) {
          const a = ramp(lt, c('rome') + (yv - 330) / 1200 * 2.2, 0.4);
          ctx.globalAlpha = a; ctx.fillStyle = yv === 1453 ? RED : INK;
          ctx.beginPath(); ctx.arc(yr(yv), y, 5, 0, Math.PI * 2); ctx.fill();
          ctx.font = `800 ${fz}px ${FONT}`; ctx.textAlign = 'center';
          ctx.fillText(String(yv), yr(yv), up ? y - 16 : y + fz + 12);
          ctx.font = `600 ${fz * 0.85}px ${FONT}`;
          ctx.fillText(t, yr(yv), up ? y - 16 - fz : y + fz * 2 + 12);
        }
        ctx.restore();
        const ak = ramp(lt, c('kayser'), 0.6);
        ptext(ctx, q, 'Kayser-i Rum', 0.5, 0.58, { k: 0.07, align: 'center', weight: 800, color: RED, alpha: ak });
        ptext(ctx, q, '“Roma\u2019nın Kayseri”', 0.5, 0.645, { k: 0.038, align: 'center', italic: true, alpha: ak });
        ptext(ctx, q, 'Fatih · “fetheden”', 0.5, 0.74, { k: 0.05, align: 'center', weight: 800, alpha: ramp(lt, c('fatih'), 0.6) });
        const aa = ramp(lt, c('age'), 0.6);
        if (aa > 0) {
          ctx.save(); ctx.globalAlpha *= aa;
          const yy = q.Y(0.83), mid = q.X(0.55);
          ctx.fillStyle = 'rgba(106,82,56,0.25)'; ctx.fillRect(q.x, yy - 14, mid - q.x, 28);
          ctx.fillStyle = 'rgba(179,54,43,0.25)'; ctx.fillRect(mid, yy - 14, q.X(1) - mid, 28);
          ctx.font = `700 ${q.fs(0.038)}px ${FONT_SC}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('Orta Çağ', (q.x + mid) / 2, yy); ctx.fillText('Yeni Çağ', (mid + q.X(1)) / 2, yy);
          ctx.fillStyle = RED; ctx.fillRect(mid - 1.5, yy - 20, 3, 40);
          ctx.restore();
          ptext(ctx, q, 'birçok tarihçiye göre', 0.5, 0.92, { k: 0.032, align: 'center', italic: true, color: BROWN, alpha: aa });
        }
        ptext(ctx, q, 'bilginler İtalya\u2019ya → Rönesans', 0.5, 0.995, { k: 0.038, align: 'center', weight: 700, color: PURPLE, alpha: ramp(lt, c('scholars'), 0.6) });
      });
    },
    draw(ctx, v, lt, c) {
      const am = ramp(lt, c('myth'), 0.8);
      if (am > 0) {
        stamp(ctx, v, 'Surlar yerle bir edildi', am * (1 - ramp(lt, c('standing') + 0.6, 0.6)), { size: 34, at: G.P(41.035, 28.9), color: INK });
        const s = ramp(lt, c('myth') + 1.4, 0.6) * (1 - ramp(lt, c('standing') + 0.6, 0.6));
        if (s > 0) {
          const [sx, sy] = toScreen(v, ...G.P(41.035, 28.9)); screenTransform(ctx, v);
          ctx.save(); ctx.globalAlpha = s; ctx.strokeStyle = RED; ctx.lineWidth = 5 * U(v); ctx.beginPath(); ctx.moveTo(sx - 200 * U(v) * s, sy); ctx.lineTo(sx + 200 * U(v) * s, sy); ctx.stroke(); ctx.restore();
        }
      }
      const as = ramp(lt, c('standing'), 1);
      if (as > 0) {
        worldTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = as * (0.6 + 0.4 * Math.sin(lt * 2.5) ** 2); ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 10 / v.s; ctx.lineCap = 'round';
        ctx.beginPath(); G.landWalls.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
        tag(ctx, v, G.along(G.landWalls, 0.45), 'kara surlarının büyük bölümü\nbugün hâlâ ayakta', { alpha: as, dx: -170, dy: -40 });
      }
    },
  },

  // 14 ─ the answer, in four steps
  answer: {
    state(st, lt, c) { st.map.sophiaMosque = 1; st.map.rumeliHisar = 1; st.hornFleet = ramp(lt, c('s3'), 1) * (1 - ramp(lt, c('all'), 1.5)); },
    draw(ctx, v, lt, c) {
      const steps = [
        ['s1', G.P(41.084, 29.06), 'Boğaz kesildi'], ['s2', G.along(guns, 0.4), 'toplar surları dövdü'],
        ['s3', G.along(G.shipRoute, 0.6), 'gemiler Haliç\u2019e indi'], ['s4', G.PLACES.lycus, 'son saldırı'],
      ];
      const endFade = 1 - ramp(lt, c('istanbul'), 1.2);
      steps.forEach(([cue, p0, text], k) => {
        const a = ramp(lt, c(cue), 0.6) * endFade;
        if (a <= 0) return;
        const p = Array.isArray(p0) ? p0 : [p0.x, p0.y];
        const [sx, sy] = toScreen(v, ...p), u = U(v);
        screenTransform(ctx, v);
        ctx.save(); ctx.globalAlpha = a;
        const r = 20 * u;
        ctx.fillStyle = RED; ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 3 * u;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFF5E4'; ctx.font = `800 ${24 * u}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(k + 1), sx, sy + 1);
        ctx.restore();
        tag(ctx, v, p, text, { alpha: a, dy: k === 1 ? 0 : -58, dx: k === 1 ? -150 : k === 3 ? -20 : 0, size: 19 });
      });
      const ai = ramp(lt, c('istanbul'), 1.6);
      if (ai > 0) {
        label(ctx, v, G.P(41.022, 28.952), 'Konstantinopolis', { alpha: ai * (1 - ramp(lt, c('istanbul') + 1.8, 1.2)), size: 30, italic: true, color: PURPLE, dy: -40 });
        stamp(ctx, v, 'İSTANBUL', ramp(lt, c('istanbul') + 1.6, 1.2), { size: 64, sc: true, spacing: 8, at: G.P(41.013, 28.95), box: false, color: RED_DK, rot: 0 });
      }
    },
  },
};

// a small ox glyph (side view), centred at (x, y), width w
function ox(ctx, x, y, w) {
  ctx.save(); ctx.translate(x, y); const k = w / 22; ctx.scale(k, k);
  ctx.fillStyle = '#7A5234'; ctx.strokeStyle = INK; ctx.lineWidth = 0.9 / k; ctx.lineCap = 'round';
  // legs
  ctx.beginPath(); for (const lx of [-7, -4, 4, 7]) { ctx.moveTo(lx, 2); ctx.lineTo(lx, 7.5); } ctx.lineWidth = 1.8; ctx.stroke(); ctx.lineWidth = 0.9 / k;
  // body with shoulder hump
  ctx.beginPath(); ctx.moveTo(-9, -1); ctx.quadraticCurveTo(-9, -5, -4, -5); ctx.lineTo(3, -5); ctx.quadraticCurveTo(5, -7.5, 7, -5); ctx.quadraticCurveTo(9, -4, 9, 0); ctx.quadraticCurveTo(9, 3.5, 5, 3.5); ctx.lineTo(-6, 3.5); ctx.quadraticCurveTo(-9, 3.5, -9, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  // head, lowered, with horns
  ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(12.5, -0.5); ctx.quadraticCurveTo(13.5, 2, 11.5, 2.5); ctx.lineTo(8.5, 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#EFE2C4'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(10, -1.8); ctx.quadraticCurveTo(10.5, -5, 13, -5); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.9 / k; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.quadraticCurveTo(-11.5, 0, -10.5, 4); ctx.stroke();
  // yoke
  ctx.fillStyle = '#C9A25A'; ctx.fillRect(6.5, -7.2, 1.6, 4);
  ctx.restore();
}
