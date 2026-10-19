// Shared pencil props: anything that appears in two scenes lives here so it looks the same everywhere.
// All drawn in world coordinates around (x, y) with size s, revealed by prog.

// arrows around a circle: dir 'in' points at the surface from outside, 'out' from inside
export function arrowRing(O, x, y, r, { n = 12, dir = 'in', c = 'w', prog = 1, a = 0.9, len = 0.35, phase = 0, w = 1.6, stagger = 0.5, skip = null, scale = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    if (skip && skip(i)) continue;
    const ang = phase + i * Math.PI * 2 / n;
    const p = clamp((prog * (1 + stagger) - stagger * i / n));
    if (p <= 0) continue;
    const L = r * len * scale;
    const [r0, r1] = dir === 'in' ? [r * 1.08 + L, r * 1.08] : [r * 0.92 - L, r * 0.92];
    arrow(O, x + Math.cos(ang) * r0, y + Math.sin(ang) * r0, x + Math.cos(ang) * r1, y + Math.sin(ang) * r1, { prog: ease.out(p), c, a, w, head: Math.max(0.012, L * 0.32), seed: i * 3 + (dir === 'in' ? 1 : 2) });
  }
}

// a children's-book fire ball: the wrong model
export function fireBall(O, x, y, s, prog, a = 0.9) {
  const pts = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n, ang = Math.PI * 0.5 + t * Math.PI * 2;
    const flame = Math.max(0, -Math.sin(ang)) ** 2;     // flames lick upwards
    const rr = s * (1 + 0.55 * flame * (0.6 + 0.4 * Math.sin(i * 2.7)) + 0.06 * Math.sin(i * 1.9));
    pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 1.05]);
  }
  pen(O, pts, { w: 1.8, prog, a, seed: 31 });
  pen(O, pts.map(([px, py]) => [x + (px - x) * 0.55, y + 0.15 * s + (py - y) * 0.55]), { w: 1.3, prog: clamp(prog * 1.4 - 0.4), a: a * 0.8, seed: 32 });
}

export function spoon(O, x, y, s, prog, a = 0.9) {
  // bowl + handle
  circle(O, x, y, s * 0.32, { sx: 1.45, prog: clamp(prog * 2), a, w: 1.6, seed: 41 });
  pen(O, [[x + s * 0.45, y - s * 0.02], [x + s * 0.8, y - s * 0.1], [x + s * 1.35, y - s * 0.16], [x + s * 1.45, y - s * 0.12]], { w: 1.6, prog: clamp(prog * 2 - 1), a, seed: 42 });
}

export function elephant(O, x, y, s, prog, a = 0.9) {
  const P = [[-0.9, 0.1], [-0.95, -0.25], [-0.6, -0.5], [0.1, -0.55], [0.55, -0.42], [0.75, -0.25], [0.9, 0.05], [1.0, 0.35], [0.95, 0.6], [0.85, 0.62], [0.8, 0.35], [0.72, 0.15], [0.62, 0.35], [0.62, 0.75], [0.45, 0.75], [0.45, 0.32], [-0.2, 0.32], [-0.2, 0.75], [-0.37, 0.75], [-0.4, 0.3], [-0.62, 0.3], [-0.62, 0.75], [-0.8, 0.75], [-0.85, 0.3], [-0.9, 0.1]];
  pen(O, P.map(([px, py]) => [x + px * s, y + py * s]), { w: 1.6, prog, a, seed: 51 });
  circle(O, x + 0.62 * s, y - 0.22 * s, s * 0.035, { prog: clamp(prog * 3 - 2), a, w: 1.2, seed: 52 });
  pen(O, [[x + 0.42 * s, y - 0.42 * s], [x + 0.3 * s, y - 0.05 * s], [x + 0.5 * s, y + 0.05 * s]], { w: 1.2, prog: clamp(prog * 2 - 1), a: a * 0.7, seed: 53 });
}

// Earth as a pencil globe: outline + a couple of continent squiggles
export function earth(O, x, y, r, prog, a = 0.9) {
  circle(O, x, y, r, { prog, a, w: 1.5, seed: 61 });
  const k = clamp(prog * 2 - 1);
  pen(O, [[x - r * 0.6, y - r * 0.3], [x - r * 0.2, y - r * 0.5], [x + r * 0.1, y - r * 0.2], [x - r * 0.1, y + r * 0.2], [x - r * 0.45, y + r * 0.1]], { w: 1.1, prog: k, a: a * 0.7, seed: 62 });
  pen(O, [[x + r * 0.3, y + r * 0.1], [x + r * 0.6, y + r * 0.25], [x + r * 0.45, y + r * 0.55], [x + r * 0.2, y + r * 0.45]], { w: 1.1, prog: k, a: a * 0.7, seed: 63 });
}

// a city seen from above: blocks along a grid, cut by a river
export function city(O, x, y, r, prog, a = 0.75) {
  const n = 9;
  for (let i = -n; i <= n; i++) {
    const p = clamp(prog * 1.6 - Math.abs(i) / n * 0.6);
    if (p <= 0) continue;
    const off = (hash(i * 7 + 3) - 0.5) * r * 0.05;
    const h = Math.sqrt(Math.max(0, 1 - (i / n) ** 2)) * r;
    pen(O, [[x + i * r / n + off, y - h], [x + i * r / n - off, y + h]], { w: 0.9, prog: p, a: a * (i % 3 === 0 ? 0.9 : 0.45), seed: 70 + i, jit: 0.3 });
    pen(O, [[x - h, y + i * r / n - off], [x + h, y + i * r / n + off]], { w: 0.9, prog: p, a: a * (i % 3 === 0 ? 0.9 : 0.45), seed: 90 + i, jit: 0.3 });
  }
  const riv = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; riv.push([x - r + 2 * r * t, y + Math.sin(t * 5.5 + 1) * r * 0.18 + r * 0.2]); }
  pen(O, riv, { w: 3.2, prog, a: a * 0.9, seed: 99 });
}

// a human figure: the dust becomes someone
export function human(O, x, y, s, prog, a = 0.92) {
  const P = [[0, -1.0], [0.13, -0.97], [0.18, -0.86], [0.13, -0.73], [0.05, -0.68], [0.2, -0.64], [0.33, -0.55], [0.38, -0.15], [0.3, -0.12], [0.26, -0.45], [0.22, -0.1], [0.2, 0.42], [0.22, 0.95], [0.06, 0.95], [0.03, 0.35], [0, 0.2],
    [-0.03, 0.35], [-0.06, 0.95], [-0.22, 0.95], [-0.2, 0.42], [-0.22, -0.1], [-0.26, -0.45], [-0.3, -0.12], [-0.38, -0.15], [-0.33, -0.55], [-0.2, -0.64], [-0.05, -0.68], [-0.13, -0.73], [-0.18, -0.86], [-0.13, -0.97], [0, -1.0]];
  pen(O, P.map(([px, py]) => [x + px * s, y + py * s]), { w: 1.8, prog, a, seed: 81 });
  return P.map(([px, py]) => [x + px * s, y + py * s]);
}

// a water-tank neutrino detector (side view)
export function tank(O, x, y, w, h, prog, a = 0.85, seed = 0) {
  circle(O, x, y - h / 2, w / 2, { sx: 1, prog, a, w: 1.4, seed: 101 + seed, a0: 0, sweep: Math.PI * 2 });
  pen(O, [[x - w / 2, y - h / 2], [x - w / 2, y + h / 2]], { prog, a, w: 1.4, seed: 103 + seed });
  pen(O, [[x + w / 2, y - h / 2], [x + w / 2, y + h / 2]], { prog, a, w: 1.4, seed: 104 + seed });
  circle(O, x, y + h / 2, w / 2, { prog, a: a * 0.9, w: 1.4, seed: 105 + seed, a0: 0, sweep: Math.PI });
}

// eyepiece view: a circle with crosshairs
export function eyepiece(O, x, y, r, prog, a = 0.85) {
  circle(O, x, y, r, { prog, a, w: 1.8, seed: 111 });
  circle(O, x, y, r * 1.06, { prog, a: a * 0.4, w: 1, seed: 112 });
  pen(O, [[x - r * 0.9, y], [x - r * 0.25, y]], { prog: clamp(prog * 2 - 1), a: a * 0.5, w: 1, seed: 113 });
  pen(O, [[x + r * 0.25, y], [x + r * 0.9, y]], { prog: clamp(prog * 2 - 1), a: a * 0.5, w: 1, seed: 114 });
}

// soft dots (dust, nuclei) in screen space
export function dot(O, x, y, rpx, c = 'w', a = 0.8) {
  const ctx = O.ctx;
  ctx.fillStyle = rgba(c, a);
  ctx.beginPath(); ctx.arc(O.x(x), O.y(y), Math.max(0.8, rpx * O.S), 0, 7); ctx.fill();
}

// clock icon whose hand turns at a given speed (revolutions per second)
export function clockIcon(O, x, y, r, speed, t, prog, a = 0.85) {
  circle(O, x, y, r, { prog, a, w: 1.2, seed: 121 });
  if (prog < 0.6) return;
  const ang = -Math.PI / 2 + t * speed * Math.PI * 2;
  pen(O, [[x, y], [x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8]], { w: 1.3, a, jit: 0, seed: 122 });
}

// a cream paper strip with ink: used for the lifetime strip
export function paperRect(O, x0, y0, x1, y1, a = 1) {
  const ctx = O.ctx;
  const X0 = O.x(x0), Y0 = O.y(y0), X1 = O.x(x1), Y1 = O.y(y1);
  ctx.save();
  ctx.fillStyle = `rgba(4,12,26,${0.35 * a})`;
  ctx.fillRect(X0 + 4, Y0 + 5, X1 - X0, Y1 - Y0);
  ctx.fillStyle = rgba('pap', 0.96 * a);
  ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  ctx.restore();
}
