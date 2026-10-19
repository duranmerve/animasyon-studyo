// Scenes: one function per section, (t, sec, ctx) → plate descriptor { no, cam, objs, stars, gain, …, draw(O) }.
// Pure functions of story time. Cue times come from the voice (sec.cue), shown CUE_LEAD earlier.

export const SCENES = {};
const { STAR, SECTION, NEBULA, SHOCK, GIANT, CRAB, HOLE, CLOUD, GALAXY } = OBJ;

function K(t, sec, ctx) {
  const c = (k, id) => (id ? ctx.S[id] : sec).cue[k] - CUE_LEAD;
  return {
    t, lt: t - sec.start, port: ctx.port, c,
    at: (k, d = 0.9, e = ease.inOut, off = 0, id) => ramp(t, c(k, id) + off, d, e),
    after: (k, id) => t >= c(k, id),
    P: (l, p) => (ctx.port ? p : l),
  };
}
function plate(no, extra) {
  return { no, cam: { x: 0, y: 0.04, z: 1, seed: 1 }, objs: [], stars: 1, gain: 1, density: 1, wash: 0, bleach: 0, vignette: 0.35, draw() { }, ...extra };
}
const star = (x, y, r, { b = 1.3, acc = 0, gran = 0, seed = 1, halo = 1, flick = 0, side = 0 } = {}) => ({ type: STAR, x, y, r, p: [b, acc, gran, seed, halo, flick, 0], side });

// ---------------------------------------------------------------------------------------------
// 1 · Two stars
SCENES.open = (t, sec, ctx) => {
  const k = K(t, sec, ctx), { at, P } = k;
  const A = P([-0.42, 0.0], [0, -0.5]), B = P([0.4, -0.02], [0, 0.32]);
  const dev = ramp(k.lt, 0.2, 2.6, ease.out);                     // the plate develops
  const back = at('number', 1.4);                                   // previews end: back to now
  const quiet = at('quiet', 2.4) * (1 - back);
  const burstK = at('burst', 1.6, ease.out) * (1 - back);
  const fadeB = ramp(t, k.c('burst') + 2.2, 3.5) * (1 - back);
  const objs = [];
  const rA = lerp(0.048, 0.012, quiet);
  objs.push(star(A[0], A[1], rA, { b: lerp(1.25, 0.95, quiet), halo: lerp(0.9, 0.4, quiet), gran: 3, seed: 2 }));
  if (quiet > 0.01) objs.push({ type: NEBULA, x: A[0], y: A[1], r: 0.075, p: [0.16, 0.4 * quiet, 0.5, 3.0, 0.2, 0.25, 0] });
  objs.push(star(B[0], B[1], 0.082, { b: 1.6, halo: 1.3, gran: 5, seed: 5, flick: 0.18 }));
  if (burstK > 0.001) objs.push({ type: SHOCK, x: B[0], y: B[1], r: lerp(0.05, 0.36, burstK), p: [1.5 * burstK * (1 - fadeB * 0.75), 0.6 * burstK, 0.6 * burstK * (1 - fadeB * 0.6), 4.0] });
  const turn = at('turn', 2.0);
  return plate('LV. 01 · İKİ YILDIZ', {
    cam: { x: lerp(0, A[0], turn), y: lerp(0.04, A[1], turn), z: lerpLog(1, 2.3, turn), seed: 11 },
    objs, gain: dev, stars: 0.9 * dev,
    draw(O) {
      // plate-measuring ticks and pencil circles
      const mark = (p, r, prog, seed) => {
        circle(O, p[0], p[1], r, { prog, w: 1.4, a: 0.85, seed });
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.785; pen(O, [[p[0] + Math.cos(a) * r * 1.25, p[1] + Math.sin(a) * r * 1.25], [p[0] + Math.cos(a) * r * 1.6, p[1] + Math.sin(a) * r * 1.6]], { w: 1.2, a: 0.7 * prog, prog: 1, seed: seed + i }); }
      };
      const pa = at('starA', 1.1), pb = at('starB', 1.1);
      mark(A, 0.1, pa, 3); mark(B, 0.15, pb, 7);
      text(O, 'A', A[0] - 0.13, A[1] - 0.12, { kind: 'hand', size: 34, prog: pa, id: 'A' });
      text(O, 'B', B[0] - 0.18, B[1] - 0.16, { kind: 'hand', size: 34, prog: pb, id: 'B' });
      label(O, 'mA', 'kütle: 1 Güneş', A[0], A[1] + 0.1, { size: 17, prog: ramp(t, k.c('starA') + 0.5, 1.2, ease.out), sides: ['b', 'r'], a: 0.9 });
      label(O, 'mB', 'kütle: 25 Güneş', B[0], B[1] + 0.15, { size: 17, prog: ramp(t, k.c('starB') + 0.5, 1.2, ease.out), sides: ['b', 'r'], a: 0.9 });
      // flash-forward notes: what each will become
      const nq = at('quiet', 1.0) * (1 - back), nb = at('burst', 1.0) * (1 - back);
      label(O, 'qA', 'sessizce söner', A[0], A[1] - 0.1, { kind: 'hand', size: 28, prog: nq, a: nq, sides: ['t', 'l'] });
      label(O, 'qB', 'bir galaksi kadar parlar', P(B[0] - 0.36, B[0]), P(B[1] + 0.33, B[1] - 0.42), { kind: 'hand', size: 30, prog: nb, a: nb, sides: ['l', 'b'], halo: 0.8, gap: 0 });
      // dust → a blood vessel: the iron in us
      const bl = at('blood', 3.2, ease.inOut) * (1 - back);
      if (bl > 0) {
        const V = P([[0.08, 0.3], [0.17, 0.22], [0.27, 0.31], [0.2, 0.38]], [[0.3, 0.72], [0.4, 0.66], [0.47, 0.78], [0.36, 0.85]]);
        pen(O, V, { w: 2.2, a: 0.8 * bl, prog: bl, seed: 9, c: 'w' });
        pen(O, V.map(([x, y]) => [x + 0.012, y + 0.012]), { w: 1.2, a: 0.6 * bl, prog: bl, seed: 10 });
        label(O, 'fe', 'Fe · kanınızdaki demir', V[3][0], V[3][1], { size: 18, prog: ramp(bl, 0.5, 0.5), a: bl, sides: ['l', 'b', 'r'] });
        const ctx2 = O.ctx;
        for (let i = 0; i < 70; i++) {
          const h = hash(i * 13 + 5), f = clamp((bl * 1.6 - h * 0.6));
          if (f <= 0 || f >= 1) continue;
          const q = f;
          const x = lerp(B[0], V[1][0], q) + Math.sin(i * 3.1 + q * 6) * 0.03 * (1 - q), y = lerp(B[1], V[1][1], q) + Math.cos(i * 1.7 + q * 5) * 0.03 * (1 - q);
          ctx2.fillStyle = rgba(i % 9 === 0 ? 'o' : 'w', 0.75 * Math.sin(q * Math.PI));
          ctx2.beginPath(); ctx2.arc(O.x(x), O.y(y), O.fs(1.6, 1) + h * 1.5, 0, 7); ctx2.fill();
        }
      }
      // the open question: one number decides
      const q = at('number', 1.2) * (1 - at('turn', 0.8));
      if (q > 0) {
        const cx = P(0, 0), cy = P(0.02, -0.1), bw = 0.11, bh = 0.13;
        pen(O, [[cx - bw, cy - bh], [cx + bw, cy - bh], [cx + bw, cy + bh], [cx - bw, cy + bh], [cx - bw, cy - bh]], { w: 1.6, prog: q, seed: 4 });
        text(O, '?', cx, cy + 0.01, { kind: 'hand', size: 92, align: 'center', prog: ramp(q, 0.4, 0.6), id: 'q' });
        label(O, 'one', 'tek bir sayı', cx, cy + bh, { size: 17, prog: ramp(q, 0.5, 0.5), sides: ['b'] });
      }
    },
  });
};

