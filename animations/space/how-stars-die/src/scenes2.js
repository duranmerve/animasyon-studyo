// Scenes 2–5: the tug of war, mass, the red giant, the quiet end.

// ---------------------------------------------------------------------------------------------
// 2 · A tug of war (wrong model: a fire ball → right model: gravity vs fusion pressure)
SCENES.balance = (t, sec, ctx) => {
  const k = K(t, sec, ctx), { at, P } = k;
  const S = P([0.18, 0.0], [0, 0.18]), R = P(0.25, 0.33);
  const F0 = P([0, -0.02], [0, -0.35]), F1 = P([-0.62, -0.25], [-0.36, -0.82]);
  const inside = at('inside', 1.6);
  const fire = at('fire', 1.8), fx = lerp(F0[0], F1[0], inside), fy = lerp(F0[1], F1[1], inside), fs = lerp(P(0.17, 0.2), P(0.07, 0.08), inside);
  const zIn = at('fusion', 1.6) * (1 - at('push', 1.4, ease.inOut, -0.6));
  const breath = Math.sin(t * 1.3) * 0.012 * at('balance', 1.5);
  const showStar = inside;
  const objs = [];
  if (showStar > 0) objs.push({ type: SECTION, x: S[0], y: S[1], r: R * (1 + breath), p: [1, 0.25 + 0.75 * at('fusion', 2), 0, 3, 1.05 * showStar, 0, 0] });
  const aha = at('aha', 0.8), dim = 1 - 0.75 * aha * (1 - at('lose', 0.8));
  return plate('LV. 02 · ÇEKİŞME', {
    cam: { x: lerp(0, S[0], zIn), y: lerp(0.04, S[1], zIn), z: lerpLog(1, 3.2, zIn), seed: 21 },
    objs, stars: 0.75, gain: 1,
    draw(O) {
      // the wrong model, kept but dimmed once corrected
      const fa = 0.92 * (1 - 0.72 * inside);
      fireBall(O, fx, fy, fs, fire, fa);
      const lb = label(O, 'fire', 'yanan bir ateş topu?', fx, fy + fs * 1.15, { kind: 'hand', size: lerp(34, 22, inside), prog: at('fire', 1.2, ease.out, 0.4), a: fa, sides: ['b'] });
      const ox = label(O, 'o2', 'uzayda oksijen yok', fx, fy - fs * 1.75, { size: lerp(18, 14, inside), prog: at('cross', 1.0), a: fa, sides: ['t', 'r'] });
      strike(O, lb, at('cross', 0.8, ease.out, 0.5), { a: 0.95 * fa });
      const yr = label(O, 'yr', '4,6 milyar yıl yanan ateş?', fx + fs * 1.4, fy, { size: lerp(18, 14, inside), prog: at('years', 1.0), a: fa * (1 - inside * 0.4), sides: P(['r'], ['r', 'b']) });
      strike(O, yr, at('years', 0.8, ease.out, 1.0), { a: 0.95 * fa });
      if (showStar <= 0) return;
      const r = R * (1 + breath);
      circle(O, S[0], S[1], r, { prog: inside, w: 1.3, a: 0.7, seed: 5 });
      // gravity: inward, white, ease-in like a falling thing
      const g = at('gravity', 2.2, ease.out);
      const pulse = 1 + 0.08 * Math.sin(t * 1.3) * at('balance', 1);
      arrowRing(O, S[0], S[1], r, { n: 12, dir: 'in', prog: g, a: 0.9 * dim, len: 0.38 * pulse, phase: 0.26 });
      label(O, 'grav', 'kütle çekimi: içe', S[0] + P(r * 1.15, 0), S[1] - r * P(1.25, 1.45), { size: 18, prog: at('gravity', 1, ease.out, 0.5), a: dim, sides: ['tr', 't', 'r'] });
      // fusion in the core: nuclei meeting
      const fu = at('fusion', 1.2) * (1 - at('push', 1.0, ease.inOut, 1.0));
      if (fu > 0) {
        for (let i = 0; i < 9; i++) {
          const ph = (t * 0.55 + hash(i * 17) * 3) % 1.6;
          const ang = hash(i * 5 + 1) * 6.283, rr = r * 0.08 * (0.3 + hash(i * 3 + 2));
          const cx = S[0] + Math.cos(ang) * rr, cy = S[1] + Math.sin(ang) * rr, d = r * 0.04 * Math.max(0, 1 - ph / 0.8);
          if (ph < 0.8) { dot(O, cx - d, cy, 2.2, 'w', 0.9 * fu); dot(O, cx + d, cy, 2.2, 'w', 0.9 * fu); }
          else if (ph < 1.1) dot(O, cx, cy, 3.6 * (1.1 - ph) / 0.3 + 2, 'o', fu * 0.95);
        }
        label(O, 'hhe', 'hidrojen + hidrojen … → helyum', S[0], S[1] + r * 0.18, { size: 15, prog: at('fusion', 1, ease.out, 0.8), a: fu, sides: ['b'] });
      }
      const nm = at('name', 0.9) * (1 - at('push', 0.8, ease.inOut, 1.2));
      label(O, 'fus', 'füzyon', S[0], S[1] - r * 0.17, { kind: 'hand', size: 30, c: 'o', prog: nm, a: nm, sides: ['t'] });
      // pressure: outward, orange, eases out like something pushing
      const pu = at('push', 2.2, ease.out);
      const loseK = at('lose', 1.4);
      const shrink = 1 - 0.55 * loseK * (0.5 + 0.5 * Math.sin(t * 9));
      arrowRing(O, S[0], S[1], r, { n: 12, dir: 'out', c: 'o', prog: pu, a: 0.95 * Math.max(dim, 0.4), len: 0.38 * pulse * shrink, phase: 0.26 });
      label(O, 'push', 'füzyonun basıncı: dışa', S[0] + P(r * 0.0, 0), S[1] + r * 1.55, { size: 18, c: 'o', prog: at('push', 1, ease.out, 0.6), a: dim, sides: ['b', 'br'] });
      // the quiet "aha": one word
      label(O, 'aha', 'denge', S[0] + P(-r * 1.9, 0), S[1] + P(0, -r * 2.0), { kind: 'hand', size: 54, prog: aha, a: aha * (1 - loseK * 0.5), sides: ['l', 't'], halo: 0.7 });
    },
  });
};

// ---------------------------------------------------------------------------------------------
// 3 · One number: mass (more fuel, shorter life) → a lifetime strip; the heavy star's life is its first minute
SCENES.mass = (t, sec, ctx) => {
  const k = K(t, sec, ctx), { at, P } = k;
  const A = P([-0.62, -0.25], [-0.32, -0.75]), B = P([-0.62, 0.0], [-0.32, -0.38]);
  const barX = P(-0.48, -0.18), unit = P(0.03, 0.022);
  const drain = at('fast', 2.6, ease.in);
  const toStrip = at('strip', 1.6);
  const zoomK = at('minute', 3.0, ease.inOut, -1.6);
  const SY = P(0.16, 0.25), SX0 = P(-0.75, -0.52), SX1 = P(0.75, 0.52);
  const sl = SX1 - SX0;
  const cam = { x: lerp(0, SX0 + sl * 0.0007 * 0.75, zoomK), y: 0.04, z: lerpLog(1, 130, zoomK), seed: 31 };
  const top = (1 - 0.85 * toStrip) * (1 - zoomK);
  const objs = [
    star(A[0], A[1], 0.035, { b: 1.2 * top, gran: 3, seed: 2, halo: 0.8 * top }),
    star(B[0], B[1], 0.06, { b: 1.5 * top, gran: 5, seed: 5, halo: 1.1 * top, acc: 0.6 * at('squeeze', 1.4) * top }),
  ];
  return plate('LV. 03 · KÜTLE', {
    cam, objs, stars: 0.7,
    draw(O) {
      const a = top;
      label(O, 'mass', 'kütle', P(-0.62, -0.32), P(-0.42, -1.0), { kind: 'hand', size: 40, prog: ramp(k.lt, 0.6, 1.0), a, sides: ['r'], gap: 0 });
      text(O, 'A · 1 Güneş', A[0] - 0.05, A[1] - 0.07, { kind: 'mono', size: 15, a: a * 0.85, prog: ramp(k.lt, 0.9, 0.8), id: 'la' });
      text(O, 'B · 25 Güneş', B[0] - 0.07, B[1] - 0.095, { kind: 'mono', size: 15, a: a * 0.85, prog: ramp(k.lt, 1.1, 0.8), id: 'lb' });
      // fuel bars, true ratio (1 : 25)
      const fb = at('fuel', 1.6, ease.out);
      const bh = 0.016;
      const bar = (y, n, left, key) => {
        const w = unit * n * fb;
        const x0 = barX, x1 = barX + w * left;
        const ctx2 = O.ctx;
        ctx2.save(); ctx2.fillStyle = rgba('w', 0.55 * a); ctx2.fillRect(O.x(x0), O.y(y - bh / 2), Math.max(0, O.x(x1) - O.x(x0)), O.len(bh)); ctx2.restore();
        pen(O, [[x0, y - bh / 2], [barX + w, y - bh / 2], [barX + w, y + bh / 2], [x0, y + bh / 2], [x0, y - bh / 2]], { w: 1, a: 0.8 * a, prog: fb, seed: key });
      };
      bar(A[1], 1, 1 - drain * 0.02, 1);
      bar(B[1], P(25, 25), 1 - drain * 0.97, 2);
      label(O, 'fuel', 'yakıt', barX, A[1] + 0.035, { size: 15, prog: fb, a: a * 0.8, sides: ['b', 'r'] });
      const gs = label(O, 'guess', 'daha çok yakıt → daha uzun ömür?', P(0.32, 0.1), P(B[1] + 0.09, B[1] + 0.1), { kind: 'hand', size: 28, prog: at('guess', 1.2), a, sides: ['b', 't'] });
      strike(O, gs, at('twist', 0.7, ease.out));
      label(O, 'tw', 'tam tersi', P(0.32, 0.1), P(B[1] + 0.2, B[1] + 0.24), { kind: 'hand', size: 34, c: 'o', prog: at('twist', 0.8, ease.out, 0.4), a: a, sides: ['b'] });
      arrowRing(O, B[0], B[1], 0.06, { n: 8, dir: 'in', prog: at('squeeze', 1.2), a: 0.85 * a, len: 0.75, w: 2.2 });
      label(O, 'fast', 'su gibi akıp gidiyor', barX + unit * 25 * 0.4, B[1] - 0.03, { size: 15, prog: at('fast', 1, ease.out, 0.6), a: a * (1 - toStrip), sides: ['t'] });
      // the lifetime strip: zooms only horizontally (x in world, y and heights in screen px)
      const st = toStrip;
      if (st <= 0) return;
      const sy = O.H / 2 + (SY - 0.04) * O.U, sh = O.fs(26), X = x => O.x(x);
      const ctx2 = O.ctx;
      const xr = Math.min(O.W + 20, X(lerp(SX0, SX1, ease.out(st)))), xl = Math.max(-20, X(SX0));
      ctx2.save(); ctx2.fillStyle = 'rgba(4,12,26,0.35)'; ctx2.fillRect(xl + 4, sy - sh + 5, xr - xl, sh * 2);
      ctx2.fillStyle = rgba('pap', 0.96); ctx2.fillRect(xl, sy - sh, xr - xl, sh * 2); ctx2.restore();
      const dayK = at('day', 1.2);
      const ink = (str, x, y, opt) => textS(O, str, x, y, { kind: 'mono', size: 14, c: 'ink', halo: 0, ...opt });
      const tick = (x, h, a) => { if (x > -5 && x < O.W + 5) penS(O, [[x, sy + sh], [x, sy + sh - h]], { c: 'ink', w: 1, a, jit: 0.2 }); };
      for (let i = 0; i <= 10; i++) {
        const p = clamp(st * 1.6 - i / 10 * 0.6), x = X(SX0 + sl * i / 10);
        tick(x, sh * 0.6, 0.8 * p * (1 - dayK));
        if (i % 2 === 0) ink(`${i}`, x, sy + sh + O.fs(14), { align: 'center', a: p * (1 - dayK) * (1 - zoomK) });
      }
      ink('milyar yıl', X(SX1) - 4, sy - sh - O.fs(14), { align: 'right', a: st * (1 - dayK) * (1 - zoomK), c: 'w', halo: 0.5 });
      for (let i = 0; i <= 24; i++) {
        const x = X(SX0 + sl * i / 24);
        tick(x, i % 6 ? sh * 0.4 : sh * 0.8, 0.85 * dayK);
        if (i % 6 === 0) ink(`${String(i).padStart(2, '0')}:00`, x, sy + sh + O.fs(14), { align: 'center', a: dayK * (1 - zoomK) });
      }
      const minW = sl / 1440, mpx = O.len(minW);
      if (mpx > 8) {
        const vis = clamp((mpx - 8) / 30);
        for (let m = 0; m <= 40; m++) {
          const x = X(SX0 + minW * m);
          if (x > O.W + 5) break;
          tick(x, m % 5 ? sh * 0.35 : sh * 0.7, 0.8 * vis);
          if (m % (mpx > 70 ? 1 : 5) === 0) ink(`00:${String(m).padStart(2, '0')}`, x, sy + sh + O.fs(14), { align: 'center', a: vis, size: 13, c: 'w', halo: 0.5 });
        }
      }
      textS(O, 'Güneş gibi bir yıldız: ~10 milyar yıl', X(SX0), sy - sh - O.fs(14), { kind: 'mono', size: 15, prog: at('strip', 1.2, ease.out, 0.4), a: 1 - zoomK, id: 'st1' });
      // "you are here": 4.6 of 10
      const nw = at('now', 1.0, ease.back), nx = X(SX0 + sl * 0.46);
      if (nw > 0 && zoomK < 1) {
        penS(O, [[nx, sy - sh], [nx, sy + sh]], { c: 'o', w: 2, a: 0.95 * nw * (1 - zoomK) });
        textS(O, 'bugün · 4,6 milyar', nx, sy - sh - O.fs(40), { kind: 'mono', size: 15, align: 'center', prog: nw, a: 1 - zoomK, id: 'now' });
      }
      textS(O, 'bütün ömrü = 1 gün', X(SX0 + sl * 0.62), sy + sh + O.fs(52), { kind: 'hand', size: 30, align: 'center', prog: dayK, a: dayK * (1 - zoomK), id: 'dl' });
      // the heavy star: 7 million years = the first ~minute of the day
      const hv = at('heavy', 1.2);
      const hx0 = X(SX0), hx1 = X(SX0 + sl * 7e6 / 1e10);
      ctx2.save(); ctx2.fillStyle = rgba('o', 0.8 * hv); ctx2.fillRect(hx0, sy - sh, Math.max(2, hx1 - hx0), sh * 2); ctx2.restore();
      if (hv > 0 && zoomK < 0.5) {
        penS(O, [[hx0 + 2, sy - sh - 2], [hx0 + O.fs(40), sy - sh - O.fs(60)]], { w: 1, a: hv * (1 - zoomK * 2) });
        textS(O, 'B: ~7 milyon yıl', hx0 + O.fs(44), sy - sh - O.fs(66), { kind: 'mono', size: 15, prog: hv, a: hv * (1 - zoomK * 2), id: 'hv' });
      }
      const mk = at('minute', 1.2, ease.out, 0.8);
      if (mk > 0) {
        const bx = Math.min(O.W - O.fs(240), Math.max(O.fs(240), (hx0 + hx1) / 2)), by = sy - sh - O.fs(110);
        textS(O, 'B’nin bütün hayatı', bx, by, { kind: 'hand', size: 44, align: 'center', prog: mk, id: 'bh1' });
        textS(O, 'günün ilk dakikası kadar', bx, by + O.fs(42), { kind: 'mono', size: 17, align: 'center', prog: mk, id: 'bh2' });
      }
    },
  });
};

// ---------------------------------------------------------------------------------------------
// 4 · The red giant: swelling over the orbits; Mercury, Venus gone; Earth: nobody knows
SCENES.giant = (t, sec, ctx) => {
  const k = K(t, sec, ctx), { at, P } = k;
  const C = P([-0.22, 0.03], [0, -0.05]), AU = P(0.3, 0.36), TILT = 0.5;
  const swell = at('swell', 3.5, ease.inOut);
  let R = lerp(0.006, 0.34, swell);                        // in AU
  R = lerp(R, 0.47, at('mercury', 1.6));
  R = lerp(R, 0.8, at('venus', 2.2));
  R = lerp(R, 0.99 + 0.03 * Math.sin(t * 0.9), at('earth', 2.6));
  const drift = at('drift', 3, ease.inOut);
  const orb = [
    { n: 'Merkür', a: 0.39, sp: 1.2, cue: 'mercury' },
    { n: 'Venüs', a: 0.72, sp: 0.62, cue: 'venus' },
    { n: 'Dünya', a: 1.0 * (1 + 0.1 * drift), sp: 0.42, cue: 'earth' },
    { n: 'Mars', a: 1.52 * (1 + 0.1 * drift), sp: 0.3, cue: 'mars' },
  ];
  const isGiant = swell > 0.02;
  const objs = isGiant ? [{ type: GIANT, x: C[0], y: C[1], r: Math.max(0.012, R * AU), p: [lerp(1.3, 0.85, swell), 3.2, 0.1 + 0.08 * swell, 6] }] : [];
  if (swell < 0.3) objs.push(star(C[0], C[1], 0.016, { b: 1.5 * (1 - swell / 0.3), acc: 0.5 * (1 - at('core', 1.5)), gran: 2, seed: 4 }));
  return plate('LV. 04 · KIRMIZI DEV', {
    cam: { x: 0, y: 0.04, z: 1, seed: 41 }, objs, stars: 0.8,
    draw(O) {
      const Rw = R * AU;
      // counter: from today to +5 billion years
      const fu = at('future', 2.2, ease.inOut);
      textS(O, `+${(5 * fu).toFixed(1).replace('.', ',')} milyar yıl`, O.W - O.fs(60), O.fs(70), { kind: 'mono', size: 20, align: 'right', prog: ramp(k.lt, 0.5, 0.6), id: 'ctr' });
      orb.forEach((p, i) => {
        const gone = p.cue === 'mercury' || p.cue === 'venus' ? at(p.cue, 1.4) : 0;
        const a = (1 - gone) * ramp(k.lt, 0.4 + i * 0.25, 1.2);
        if (a <= 0.01) return;
        const ra = p.a * AU;
        const pts = [];
        const dash = p.cue === 'earth' && at('earth', 0.6) > 0.5;
        for (let j = 0; j <= 120; j++) {
          const ang = j / 120 * Math.PI * 2;
          const x = C[0] + Math.cos(ang) * ra, y = C[1] + Math.sin(ang) * ra * TILT;
          const inside = Math.hypot(x - C[0], y - C[1]) < Rw * 0.98;
          if (inside) { if (pts.length > 1) pen(O, pts.slice(), { w: 1.1, a: 0.7 * a, dash: dash ? [6, 6] : null, seed: i }); pts.length = 0; continue; }
          pts.push([x, y]);
        }
        if (pts.length > 1) pen(O, pts, { w: 1.1, a: 0.7 * a, dash: dash ? [6, 6] : null, seed: i });
        const ang = 1.9 + t * 0.06 * p.sp + i * 1.7;
        const px = C[0] + Math.cos(ang) * ra, py = C[1] + Math.sin(ang) * ra * TILT;
        const inside = Math.hypot(px - C[0], py - C[1]) < Rw;
        if (!inside || p.cue === 'earth') {
          dot(O, px, py, p.cue === 'earth' ? 3.4 : 2.6, 'w', 0.95 * a);
          label(O, 'pl' + i, p.n, px, py, { size: 15, a: a * 0.95, sides: ['t', 'b', 'r', 'l'], gap: 0.012 });
        }
        if (p.cue === 'earth') {
          const q = at('earth', 0.8, ease.back);
          label(O, 'eq', '?', px, py, { kind: 'hand', size: 54, a: q, prog: q, sides: ['tr', 'r', 't'], gap: 0.03 });
          const sp = at('split', 1.0);
          if (sp > 0) {
            label(O, 'e1', 'yutulur mu?', px, py + 0.05, { kind: 'hand', size: 24, a: sp, prog: sp, sides: ['b', 'bl'] });
            label(O, 'e2', 'kıl payı kurtulur mu?', px, py, { kind: 'hand', size: 24, a: sp, prog: ramp(sp, 0.4, 0.6), sides: ['br', 'r', 'bl'], gap: 0.09 });
          }
        }
        if (p.cue === 'mars') {
          const m = at('mars', 0.8);
          label(O, 'safe', 'güvende', px, py, { kind: 'hand', size: 26, a: m, prog: m, sides: ['r', 'b', 'l'], gap: 0.04 });
        }
      });
      // the Sun loses mass: a thin outflow
      if (drift > 0) for (let i = 0; i < 40; i++) {
        const h = hash(i * 7 + 11), ph = (t * 0.06 + h) % 1, ang = hash(i * 3) * 6.283;
        const rr = Rw * (1.02 + ph * 0.9);
        dot(O, C[0] + Math.cos(ang) * rr, C[1] + Math.sin(ang) * rr * 0.85, 1.2, 'w', 0.5 * drift * (1 - ph));
      }
      const gl = at('giant', 1.2);
      label(O, 'gnt', 'bugünkünden ~100 kat büyük', C[0], C[1] - Rw * 0.86, { kind: 'hand', size: 28, prog: gl, a: gl * (1 - at('unknown', 1)), sides: ['t'], gap: 0.02 });
      label(O, 'unk', 'Dünya’nın akıbeti: kimse kesin bilmiyor', P(0.42, 0), P(-0.36, 0.52), { size: 16, prog: at('unknown', 1.2), sides: ['b', 'l', 't'] });
      label(O, 'drf', 'Güneş kütle kaybeder → gezegenler uzaklaşır', P(0.42, 0), P(-0.28, 0.6), { size: 15, prog: at('drift', 1.2), a: 0.9, sides: ['b', 'l', 't'] });
    },
  });
};

// ---------------------------------------------------------------------------------------------
// 5 · The quiet end: planetary nebula, the white dwarf the size of Earth, a teaspoon = an elephant
SCENES.dwarf = (t, sec, ctx) => {
  const k = K(t, sec, ctx), { at, P } = k;
  const C = P([-0.12, 0.0], [0, -0.1]);
  const shed = at('shed', 4.0, ease.out);
  const glow = at('glow', 3.0);
  const coreK = at('core', 3.5, ease.inOut);
  const zoom = at('earth', 3.0, ease.inOut, -1.2);
  const cool = at('cool', 9, ease.inOut);
  const neb = (1 - coreK * 0.85);
  const objs = [];
  if (shed < 1) objs.push({ type: GIANT, x: C[0], y: C[1], r: lerp(0.3, 0.14, shed), p: [0.85 * (1 - shed), 3.2, 0.18, 6] });
  objs.push({ type: NEBULA, x: C[0], y: C[1], r: lerp(0.26, 0.36, shed) * (1 + 0.5 * coreK), p: [lerp(0.35, 0.16, shed), (0.2 + 0.85 * glow) * neb * shed, 0.55, 8.3, 0.35, 0.55, 0] });
  objs.push(star(C[0], C[1], 0.011, { b: lerp(1.1, 2.0, glow) * lerp(1, 0.55, cool) * lerp(1, 0.7, zoom), halo: lerp(1.6, 0.25, zoom), seed: 9 }));
  const zc = lerpLog(1, 9, zoom);
  return plate('LV. 05 · SESSİZ SON', {
    cam: { x: lerp(0, C[0] + 0.03, zoom), y: lerp(0.04, C[1] + 0.004, zoom), z: zc, seed: 51 }, objs, stars: 0.7, wash: 0.1,
    draw(O) {
      const nm = at('name', 1.2) * (1 - zoom);
      label(O, 'pn', 'gezegenimsi bulutsu', C[0], C[1] - 0.38, { kind: 'hand', size: 40, prog: nm, a: nm, sides: ['t', 'r'] });
      // eyepiece: why "planetary"
      const sc = at('scope', 1.2) * (1 - at('core', 0.8));
      if (sc > 0) {
        const E = P([0.6, -0.12], [0, 0.55]), er = P(0.13, 0.15);
        eyepiece(O, E[0], E[1], er, sc);
        const ctx2 = O.ctx, x = O.x(E[0]), y = O.y(E[1]), rr = O.len(er * 0.22);
        const g = ctx2.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, rgba('w', 0.75 * sc)); g.addColorStop(0.75, rgba('w', 0.45 * sc)); g.addColorStop(1, rgba('w', 0));
        ctx2.fillStyle = g; ctx2.beginPath(); ctx2.arc(x, y, rr, 0, 7); ctx2.fill();
        label(O, 'eyeT', '1780’ler · teleskopta bir gezegen gibi', E[0], E[1] + er, { size: 15, prog: sc, a: sc, sides: ['b'] });
      }
      // zoomed: the dwarf next to Earth (same size), then the teaspoon and the elephant
      const ez = at('earth', 1.4, ease.out, 0.8);
      if (ez > 0) {
        const r = 0.011;
        earth(O, C[0] + 0.045, C[1], r, ez);
        label(O, 'dw', 'beyaz cüce', C[0], C[1] - r, { size: 15, prog: ez, a: ez, sides: ['t', 'tl'], gap: 0.005 });
        label(O, 'ea', 'Dünya', C[0] + 0.045, C[1] - r, { size: 15, prog: ez, a: ez, sides: ['t', 'tr'], gap: 0.005 });
        const sp = at('spoon', 1.2), el = at('elephant', 1.4);
        const sx = C[0] + P(-0.02, 0.0), sy = C[1] + 0.03;
        if (sp > 0) {
          spoon(O, sx - 0.006, sy + 0.002, 0.008, sp);
          label(O, 'sp', 'bir çay kaşığı', sx, sy + 0.008, { size: 15, prog: sp, a: sp, sides: ['b', 'bl'], gap: 0.003 });
          text(O, '=', sx + 0.022, sy + 0.002, { kind: 'hand', size: 40, a: el, prog: el, align: 'center', id: 'eq' });
          elephant(O, sx + 0.04, sy, 0.009, el);
          label(O, 'elt', 'birkaç ton', sx + 0.04, sy + 0.007, { size: 15, prog: el, a: el, sides: ['b', 'br'], gap: 0.003 });
        }
        const cl = at('cool', 1.2);
        label(O, 'cool', 'füzyon yok · yalnızca soğuyor', C[0], C[1] + 0.012, { size: 15, prog: cl, a: cl * (1 - at('end', 1)), sides: ['b'], gap: 0.003 });
        const ag = at('age', 1.2);
        label(O, 'age', 'soğuması trilyonlarca yıl sürer', C[0], C[1] - 0.03, { size: 15, prog: ag, a: ag * (1 - at('end', 1)), sides: ['t'] });
        const en = at('end', 1.0);
        textS(O, 'Patlama yok.', O.W / 2, O.H * P(0.2, 0.18), { kind: 'hand', size: 54, align: 'center', prog: en, a: en, id: 'end' });
      }
    },
  });
};
