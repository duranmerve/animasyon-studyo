// Scenes 6–11: the onion, the iron ash, the collapse and the supernova (one continuous plate),
// SN 1987A, what remains, and us.

const LAYERS = [['H', 0.81], ['He', 0.535], ['C', 0.39], ['Ne', 0.285], ['O', 0.2], ['Si', 0.125], ['Fe', 0.045]];
const RING = [1.0, 0.62, 0.45, 0.33, 0.24, 0.16, 0.09];
const BURN = [['H', '7 milyon yıl', 'h'], ['He', '700 bin yıl', 'c'], ['C', '600 yıl', 'c'], ['Ne', '1 yıl', 'si'], ['O', '6 ay', 'si'], ['Si', '1–2 gün', 'si']];

// ---------------------------------------------------------------------------------------------
// 6–8 · one plate from the onion to the explosion (iron and collapse continue it without a cut)
function heavy(t, sec, ctx) {
  const k = K(t, sec, ctx), P = k.P;
  const c = (n, id) => k.c(n, id), at = (n, id, d = 0.9, e = ease.inOut, off = 0) => ramp(t, c(n, id) + off, d, e);
  const C = P([-0.2, 0.02], [0, -0.32]), R = P(0.36, 0.42);
  const rFe0 = RING[6] * R;
  // --- onion
  const appear = ramp(t, ctx.S.onion.start + 0.3, 1.6);
  const cut = at('squeeze', 'onion', 1.8);
  let layers = 1 + at('helium', 'onion', 1.0) + 4 * at('carbon', 'onion', 4.5);
  const fe = at('iron', 'onion', 1.6);
  if (fe > 0) layers = 6;
  // --- iron: zoom into the core
  const zIron = at('ash', 'iron', 3.2, ease.inOut, -1.0);
  // --- collapse
  const fall = at('fall', 'collapse', 1.5, ease.in);
  const rFe = rFe0 * fe * (1 - 0.9 * fall);
  const ns = at('neutron', 'collapse', 0.6);
  const bounce = at('bounce', 'collapse', 2.4, ease.out);
  const tb = c('boom', 'collapse');
  const flash = ramp(t, tb - 0.2, 1.3, ease.out) * (1 - ramp(t, tb + 2.0, 6.0, ease.inOut) * 0.85);
  const after = ramp(t, tb + 0.6, 5, ease.out);
  const pull = ramp(t, tb - 0.4, 3.2, ease.inOut);
  const z = lerpLog(lerpLog(1, 3.4, zIron), P(0.92, 0.95), pull);
  const cam = { x: lerp(lerp(0, C[0], zIron), P(0.2, 0), pull), y: lerp(lerp(0.04, C[1], zIron), P(0.04, 0.12), pull), z, seed: 61 };
  const secGain = (1 - ramp(t, tb, 1.0)) * cut;
  const objs = [];
  if (cut < 1) objs.push(star(C[0], C[1], R, { b: 1.35 * appear * (1 - cut), gran: 6, seed: 7, halo: 0.7 * appear * (1 - cut) }));
  if (secGain > 0) objs.push({ type: SECTION, x: C[0], y: C[1], r: R, p: [layers, lerp(0.9, 0.35, fe) * (1 - fall), rFe > 0.001 ? rFe / R : 0, 5, secGain * lerp(1.05, 0.5, zIron), 0, 0] });
  if (ns > 0 && t < tb + 1.5) objs.push(star(C[0], C[1], 0.0035, { b: 2.4 * ns, halo: 2.2, seed: 3 }));
  if (bounce > 0 && t < tb + 0.4) objs.push({ type: SHOCK, x: C[0], y: C[1], r: lerp(0.01, R * 0.95, bounce), p: [0.25 * bounce, 0.9, 0.5 * bounce, 2] });
  if (flash > 0) objs.push({ type: SHOCK, x: C[0], y: C[1], r: lerp(R * 0.6, R * 2.1, after), p: [3.4 * flash, 1.2 * flash, 1.1 * flash * (1 - after * 0.6), 6] });
  if (after > 0) objs.push({ type: NEBULA, x: C[0], y: C[1], r: lerp(R * 0.8, R * 1.5, after), p: [0.22, 0.75 * after * (1 - 0.45 * at('crumb', 'collapse', 2)), 0.7, 12, 0.1, 0.5, 0.75 * (1 - after * 0.5)] });
  const no = t < ctx.S.iron.start ? 'LV. 06 · SOĞAN' : t < ctx.S.collapse.start ? 'LV. 07 · KÜL' : 'LV. 08 · ÇÖKÜŞ';
  return plate(no, {
    cam, objs, stars: 0.75 * (1 - 0.6 * zIron * (1 - pull)), bleach: 0.88 * flash * (1 - after * 0.7),
    draw(O) {
      const onionA = 1 - at('ash', 'iron', 1.0, ease.inOut, -1.0);
      // ring outlines + layer labels
      const ringsP = at('layers', 'onion', 2.4);
      for (let i = 1; i < 7; i++) {
        if (i > layers) break;
        const vis = clamp(layers - i + 1) * (1 - ramp(t, tb, 0.6));
        if (i === 6 && fe <= 0) continue;
        circle(O, C[0], C[1], (i === 6 ? rFe / R : RING[i]) * R, { prog: ringsP > 0 ? ringsP : 0.0001 + vis, w: 1, a: 0.55 * vis, seed: 40 + i });
      }
      const onionL = at('onion', 'onion', 1.6);
      LAYERS.forEach(([n, rr], i) => {
        if (i > layers - 1 + 0.5 && n !== 'Fe') return;
        if (n === 'Fe' && fe <= 0) return;
        const a = (n === 'Fe' ? fe : onionL) * onionA;
        if (a <= 0) return;
        const ang = -0.5 + i * 0.12;
        const px = C[0] + Math.cos(ang) * rr * R, py = C[1] + Math.sin(ang) * rr * R;
        const lx = C[0] + R * 1.12, ly = C[1] - R * 0.55 + i * R * 0.17;
        pen(O, [[px, py], [lx - 0.01, ly]], { w: 0.9, a: 0.6 * a, prog: a, jit: 0.3, seed: 60 + i });
        text(O, n, lx, ly, { kind: 'monob', size: 18, a, prog: a, id: 'L' + n, c: n === 'Fe' ? 'w' : 'w' });
      });
      label(O, 'sc', 'ölçeksiz şema', C[0], C[1] + R, { size: 12, a: 0.7 * onionL * onionA, sides: ['b'] });
      // burn times: each fuel lasts far less than the one before
      const clk = at('clock', 'onion', 1.2);
      if (clk > 0 && onionA > 0) {
        const X = P(C[0] + R * 1.55, -0.5), Y = P(C[1] - R * 0.62, 0.32);
        textS(O, 'her yakıt ne kadar dayanır', O.x(X), O.y(Y), { kind: 'hand', size: 30, prog: clk, a: onionA, id: 'bt' });
        BURN.forEach(([n, d, cue], i) => {
          const a = at(cue, 'onion', 0.8, ease.out, i * 0.25 - (cue === 'c' ? 0.3 : cue === 'si' ? 0.75 : 0)) * onionA;
          if (a <= 0) return;
          const y = Y + 0.06 + i * 0.055;
          clockIcon(O, X + 0.015, y, 0.016, [0.02, 0.1, 0.4, 1.2, 2.2, 4.5][i], t, a, a);
          textS(O, `${n}`, O.x(X + 0.045), O.y(y), { kind: 'monob', size: 17, a, id: 'bn' + i });
          textS(O, d, O.x(X + 0.105), O.y(y), { kind: 'mono', size: 17, a, prog: a, id: 'bd' + i, c: n === 'Si' ? 'o' : 'w' });
        });
      }
      // iron: ash, not fuel
      const za = 1 - pull;
      const ash = at('ash', 'iron', 1.0);
      label(O, 'fe', 'demir: yakıt değil, kül', C[0], C[1] - rFe0 * 1.6, { kind: 'hand', size: 34, prog: ash, a: ash * za * (1 - at('fall', 'collapse', 0.5)), sides: ['t'] });
      const gv = at('gave', 'iron', 1.0), cs = at('cost', 'iron', 1.0);
      const nx = C[0] - rFe0 * 3.4, ny = C[1] - rFe0 * 0.4;
      const fadeNotes = 1 - at('small', 'iron', 0.8);
      textS(O, 'H, He, C … kaynaşınca: + enerji', O.x(nx), O.y(ny), { kind: 'mono', size: 16, align: 'right', prog: gv, a: gv * fadeNotes, id: 'gv', c: 'o' });
      textS(O, 'Fe kaynaşınca: − enerji', O.x(nx), O.y(ny + rFe0 * 0.5), { kind: 'mono', size: 16, align: 'right', prog: cs, a: cs * fadeNotes, id: 'cs' });
      // the outward push dies away, arrow by arrow
      const fd = at('fade', 'iron', 3.0);
      if (zIron > 0.2 && fall < 0.05) arrowRing(O, C[0], C[1], rFe0 * 1.25, { n: 8, dir: 'out', c: 'o', a: 0.95 * zIron, len: 0.8, prog: 1, skip: i => fd * 9 > i + 0.5 + hash(i) * 0.5 });
      const sm = at('small', 'iron', 1.2), hv = at('heavy', 'iron', 1.0);
      if (sm > 0) {
        earth(O, C[0] + rFe0 * 3.2, C[1], rFe0 * 1.3, sm, 0.8 * (1 - at('fall', 'collapse', 0.6)));
        label(O, 'ear', 'Dünya', C[0] + rFe0 * 3.2, C[1] - rFe0 * 1.3, { size: 15, prog: sm, a: sm * (1 - at('fall', 'collapse', 0.6)), sides: ['t'] });
        label(O, 'cmp', 'Dünya’dan küçük', C[0], C[1] + rFe0 * 1.4, { size: 16, prog: sm, a: sm * (1 - at('fall', 'collapse', 0.6)), sides: ['b'] });
        label(O, 'hv', 'ama ~1,4 Güneş kütlesi', C[0], C[1] + rFe0 * 2.1, { size: 16, prog: hv, a: hv * (1 - at('fall', 'collapse', 0.6)), sides: ['b'] });
      }
      // nothing holds it now: only gravity's arrows, creeping in during the silence
      const hd = at('hold', 'iron', 1.2);
      const creep = ramp(t, c('hold', 'iron') + 1, 4.5, ease.in);
      if (hd > 0 && t < tb) arrowRing(O, C[0], C[1], Math.max(rFe, rFe0 * 0.05) * (1.25 - 0.12 * creep), { n: 10, dir: 'in', prog: hd, a: 0.92, len: lerp(0.9, 1.6, fall), phase: 0.3, w: 1.8 });
      // collapse: a stopwatch and the numbers
      const fl = at('fall', 'collapse', 0.4);
      if (fl > 0 && t < tb) {
        const sw = (0.1 * ease.in(clamp((t - c('fall', 'collapse')) / 1.5))).toFixed(3).replace('.', ',');
        textS(O, `t = ${sw} sn`, O.x(C[0] + rFe0 * 2.2), O.y(C[1] - rFe0 * 1.6), { kind: 'mono', size: 22, a: fl, id: 'sw' });
        label(O, 'shr', 'binlerce km → birkaç on km', C[0], C[1] + rFe0 * 1.5, { size: 16, prog: at('shrink', 'collapse', 1.0), sides: ['b'] });
        label(O, 'spd', 'düşüş: ışık hızının ~%10’u', C[0], C[1] + rFe0 * 2.1, { size: 16, prog: at('speed', 'collapse', 1.0), sides: ['b'] });
        const nn = at('neutron', 'collapse', 1.0);
        label(O, 'pen', 'proton + elektron → nötron', C[0], C[1] - rFe0 * 0.9, { size: 16, prog: nn, a: nn * (1 - at('bounce', 'collapse', 0.6)), sides: ['t', 'tr'] });
        const sf = at('stiff', 'collapse', 0.8);
        circle(O, C[0], C[1], 0.008, { prog: sf, w: 2, a: 0.95 * (1 - at('bounce', 'collapse', 1.2)), seed: 9 });
        label(O, 'bnc', 'geri seker → şok dalgası', C[0], C[1] - R * 0.5 * bounce, { kind: 'hand', size: 28, prog: at('bounce', 'collapse', 0.8), a: 1 - ramp(t, tb - 0.3, 0.4), sides: ['t'] });
      }
      // the supernova and the energy budget
      const nm = at('name', 'collapse', 1.0);
      textS(O, 'süpernova', O.W * P(0.18, 0.5), O.H * P(0.18, 0.16), { kind: 'hand', size: 76, c: 'o', align: P('left', 'center'), prog: nm, a: nm * (1 - at('crumb', 'collapse', 1.2) * 0.5), halo: 0.9, id: 'sn' });
      const cr = at('crumb', 'collapse', 1.2);
      if (cr > 0) {
        const GX = P(0.5, -0.27), GY = P(-0.2, 0.42), gs = P(0.028, 0.05);
        const nuK = at('nu', 'collapse', 3.5, ease.in);
        for (let i = 0; i < 100; i++) {
          const gx = GX + (i % 10) * gs, gy = GY + Math.floor(i / 10) * gs;
          const p = clamp(cr * 1.8 - i / 100 * 0.8);
          if (i === 0) { dot(O, gx, gy, 5.5, 'o', p); continue; }
          const fly = clamp(nuK * 1.5 - hash(i) * 0.5);
          const x = gx + fly * fly * 1.6;
          if (fly > 0) pen(O, [[x - 0.05 * fly, gy], [x, gy]], { w: 0.8, a: 0.45 * p * (1 - fly), jit: 0.1 });
          circle(O, x, gy, gs * 0.24, { prog: p, w: 0.9, a: 0.65 * (1 - fly * 0.9), seed: i, dash: [2, 3] });
        }
        label(O, 'l1', 'gördüğümüz her şey: ışık, patlama', GX, GY, { size: 15, prog: cr, a: cr, sides: P(['l', 't'], ['t']), c: 'o', lead: true, gap: 0.015 });
        const nn = at('ninety', 'collapse', 1.0);
        label(O, 'l99', '%99: nötrinolar', GX + gs * 4.5, GY + gs * 9.5, { size: 17, prog: nn, a: nn, sides: ['b'], gap: 0.02 });
        const un = at('unseen', 'collapse', 1.0);
        label(O, 'nu', 'görünmez · neredeyse hiçbir şeye çarpmaz', GX + gs * 4.5, GY + gs * 10.4, { size: 14, prog: un, a: un * 0.9, sides: ['b'], gap: 0.02 });
      }
    },
  });
}
SCENES.onion = heavy; SCENES.iron = heavy; SCENES.collapse = heavy;

// ---------------------------------------------------------------------------------------------
// 9 · SN 1987A: two dozen neutrinos in thirteen seconds, hours before the light
SCENES.sn1987 = (t, sec, ctx) => {
  const k = K(t, sec, ctx), { at, P } = k;
  const G = P([-0.5, -0.02], [0, -0.78]), SN = [G[0] + P(0.07, 0.06), G[1] + P(0.06, 0.05)];
  const lightK = at('light', 2.2, ease.out);
  const objs = [{ type: GALAXY, x: G[0], y: G[1], r: P(0.27, 0.3), p: [0.75, 4.0, 0.55, 0.45] }];
  if (lightK > 0) objs.push(star(SN[0], SN[1], 0.012, { b: 2.2 * lightK, halo: 2.4 * lightK, seed: 8 }));
  const ticks = neutrinoTicks(ctx.TL);
  return plate('LV. 09 · SN 1987A', {
    cam: { x: 0, y: 0.04, z: 1, seed: 71 }, objs, stars: 0.65,
    draw(O) {
      label(O, 'yr', '23 Şubat 1987', P(0.42, 0), P(-0.42, -1.12), { kind: 'hand', size: 36, prog: at('year', 1.2), sides: ['t', 'b'], gap: 0 });
      label(O, 'lmc', 'Büyük Macellan Bulutu · komşu galaksi', G[0], G[1] + P(0.28, 0.32), { size: 15, prog: at('lmc', 1.2), sides: ['b'] });
      const T = P([[0.12, 0], [0.38, 0], [0.64, 0]], [[-0.38, 0.0], [0, 0.0], [0.38, 0.0]]).map(([x, y]) => [x, y - 0.02]);
      const names = [['Kamiokande-II', 'Japonya'], ['IMB', 'ABD'], ['Baksan', 'SSCB']];
      const tw = P(0.15, 0.22), th = P(0.2, 0.26);
      const tp = at('japan', 1.6);
      const counts = [0, 0, 0];
      T.forEach(([x, y], d) => {
        const p = clamp(tp * 1.6 - d * 0.3);
        tank(O, x, y, tw, th, p, 0.85, d * 10);
        label(O, 'tn' + d, names[d][0], x, y + th / 2 + 0.02, { size: 15, prog: p, a: p, sides: ['b'], gap: 0.01 });
        label(O, 'tc' + d, names[d][1], x, y + th / 2 + 0.055, { size: 13, prog: p, a: 0.75 * p, sides: ['b'], gap: 0.01 });
      });
      for (const tk of ticks) {
        if (t < tk.t) continue;
        counts[tk.d]++;
        const [x, y] = T[tk.d];
        const hx = (hash(tk.d * 50 + tk.i * 3) - 0.5) * tw * 0.75, hy = (hash(tk.d * 50 + tk.i * 3 + 1) - 0.5) * th * 0.8;
        const age = t - tk.t, fl = Math.exp(-age * 3);
        dot(O, x + hx, y + hy, 2.4 + 9 * fl, 'w', 0.5 + 0.5 * fl);
        if (fl > 0.05) dot(O, x + hx, y + hy, 22 * fl, 'w', 0.12 * fl);
      }
      if (at('detect', 0.6) > 0) T.forEach(([x, y], d) => textS(O, `${counts[d]}`, O.x(x), O.y(y - th / 2 - 0.045), { kind: 'monob', size: 24, align: 'center', a: at('detect', 0.6), id: 'cn' + d }));
      const last = ticks.length ? ticks[ticks.length - 1] : null;
      const shownSec = last ? Math.min(12.4, ticks.filter(x => x.t <= t).reduce((m, x) => Math.max(m, x.sec), 0)) : 0;
      label(O, 'clock', `dedektör saati: ${shownSec.toFixed(1).replace('.', ',')} sn`, P(0.38, 0), P(-0.2, -0.28), { size: 16, a: at('detect', 0.6), sides: ['t'], gap: 0.13 });
      const tt = at('twenty', 1.0);
      label(O, 'tot', `toplam ${counts[0] + counts[1] + counts[2]} nötrino`, P(0.38, 0), P(0.22, 0.32), { kind: 'hand', size: 34, prog: tt, a: tt, sides: ['b'] });
      // the light: about three hours later
      const lt = at('light', 1.2);
      label(O, 'lt', '~3 saat sonra: ışık', SN[0], SN[1], { kind: 'hand', size: 30, prog: lt, a: lt, sides: ['r', 'b', 't'], gap: 0.04, lead: true });
      const fl = at('felt', 1.2);
      textS(O, 'önce nötrinolar, sonra ışık', O.W / 2, O.H * P(0.73, 0.68), { kind: 'mono', size: 17, align: 'center', prog: fl, a: fl, id: 'felt' });
    },
  });
};

// ---------------------------------------------------------------------------------------------
// 10 · What remains: 1054 and the Crab, a neutron star over a city, a black hole, a star that vanished
SCENES.remnant = (t, sec, ctx) => {
  const k = K(t, sec, ctx), { at, P } = k;
  const C = P([0.18, -0.02], [0, -0.15]);
  const st = at('chinese', 1.2), crab = at('crab', 3.0);
  const zIn = at('size', 3.0, ease.inOut, -0.6) * (1 - at('heavier', 2.2, ease.inOut));
  const holeK = at('bh', 2.0, ease.out) * (1 - at('quiet', 1.4));
  const split = at('quiet', 1.4);
  const objs = [];
  const pulse = Math.pow(0.5 + 0.5 * Math.cos(t * 2 * Math.PI * 1.6), 6);
  const fadeEarly = 1 - at('heavier', 1.2);
  if (st > 0 && crab < 1) objs.push(star(C[0], C[1], 0.016, { b: 2.6 * st * (1 - crab), halo: 2.8 * st * (1 - crab), seed: 13 }));
  if (crab > 0) objs.push({ type: CRAB, x: C[0], y: C[1], r: lerp(0.08, 0.23, crab), p: [0.95 * crab * fadeEarly * (1 - 0.92 * zIn), 4.2, 0.5, 0.15] });
  if (at('pulsar', 0.6) > 0 && fadeEarly > 0) objs.push(star(C[0], C[1], zIn > 0.3 ? 0.0022 : 0.003, { b: (1.4 + 1.3 * pulse * (1 - zIn)) * at('pulsar', 0.6) * fadeEarly * (1 - 0.6 * zIn), halo: 1.2 * (1 - zIn * 0.95), seed: 14 }));
  if (holeK > 0) objs.push({ type: HOLE, x: P(0, 0), y: 0.02, r: 0.11 * holeK, p: [1.0 * holeK] });
  const XL = P([-0.4, 0.0], [-0.3, -0.2]), OFF = P(0.8, 0.6);
  if (split > 0) objs.push(star(XL[0], XL[1], 0.009, { b: (1.6 + 0.8 * at('flare', 1.4) * (1 - at('flare', 2, ease.inOut, 2.5))) * split, halo: 1.3 * split, seed: 15, side: -1 }));
  const z = lerpLog(1, 95, zIn);
  return plate('LV. 10 · GERİYE KALAN', {
    cam: { x: lerp(0, C[0], zIn) * (1 - split), y: lerp(0.04, C[1], zIn), z, seed: 81 },
    objs, stars: 0.8, split: P(0, 0) + 0.0001, splitOffset: split > 0.5 ? OFF : 0,
    draw(O) {
      // the Chinese record, on a paper slip in the margin
      const ch = st * (1 - at('size', 1.0));
      if (ch > 0 && !O.port) {
        paperRect(O, -0.82, -0.38, -0.46, -0.06, ch);
        const ink = (s, y, p, sz = 16, kind = 'mono') => text(O, s, -0.79, y, { kind, size: sz, c: 'ink', halo: 0, prog: p, a: ch });
        ink('1054', -0.32, ch, 30, 'hand');
        ink('Çin kayıtları', -0.26, ch);
        ink('“konuk yıldız”', -0.21, ramp(ch, 0.3, 0.7));
        ink('~23 gün gündüz göründü', -0.15, at('day', 1.2), 15);
        ink('Venüs’le kıyaslandı', -0.1, at('day', 1.2, ease.inOut, 0.6), 15);
      } else if (ch > 0) {
        label(O, 'ch', '1054 · Çin kayıtları: “konuk yıldız”', C[0], C[1] - 0.25, { size: 15, prog: ch, a: ch, sides: ['t'] });
      }
      const cl = at('crab', 1.2) * (1 - at('size', 0.8));
      label(O, 'crab', 'Yengeç Bulutsusu', C[0], C[1] + 0.2, { kind: 'hand', size: 36, prog: cl, a: cl, sides: ['b', 'br'] });
      // lighthouse beams
      const pb = at('pulsar', 0.8) * (1 - zIn) * fadeEarly;
      if (pb > 0) {
        const ang = t * 2.3;
        for (const s of [0, Math.PI]) pen(O, [[C[0] + Math.cos(ang + s) * 0.012, C[1] + Math.sin(ang + s) * 0.012], [C[0] + Math.cos(ang + s) * 0.16, C[1] + Math.sin(ang + s) * 0.16]], { w: 1, a: 0.5 * pb, jit: 0.2 });
        label(O, 'ns', 'nötron yıldızı: hâlâ dönüyor', C[0], C[1], { size: 15, prog: pb, a: pb, sides: ['tr', 'r'], gap: 0.06 });
      }
      // zoomed in: a neutron star over a city
      if (zIn > 0.35) {
        const a = clamp((zIn - 0.35) / 0.4) * fadeEarly;
        const rN = 0.0022, cityR = 0.0028;
        city(O, C[0], C[1], cityR, at('city', 2.0), 0.7 * a);
        const ctx2 = O.ctx, X = O.x(C[0]), Y = O.y(C[1]), RR = O.len(rN);
        const g = ctx2.createRadialGradient(X - RR * 0.3, Y - RR * 0.3, RR * 0.1, X, Y, RR);
        g.addColorStop(0, rgba('w', 0.98 * a)); g.addColorStop(1, rgba('mid', 0.9 * a));
        ctx2.fillStyle = g; ctx2.beginPath(); ctx2.arc(X, Y, RR, 0, 7); ctx2.fill();
        circle(O, C[0], C[1], rN, { a: a, w: 1.6, seed: 5 });
        const rl = at('size', 1.0, ease.out, 1.6);
        pen(O, [[C[0] - rN, C[1] + rN * 1.25], [C[0] + rN, C[1] + rN * 1.25]], { w: 1.4, a: a * rl, prog: rl });
        label(O, 'km', '≈ 20 km', C[0], C[1] + rN * 1.25, { size: 16, prog: rl, a: a, sides: ['b'], gap: 0.0002 });
        label(O, 'sun', 'Güneş’ten ağır', C[0], C[1] - rN, { kind: 'hand', size: 28, prog: rl, a: a, sides: ['t'], gap: 0.0003 });
        label(O, 'cty', 'bir şehir', C[0] + cityR * 0.7, C[1] - cityR * 0.7, { size: 15, prog: at('city', 1), a: a, sides: ['tr', 'r'], gap: 0.0001 });
        const sp = at('spoon', 1.4);
        if (sp > 0) {
          const sx = C[0] + cityR * 1.5, sy = C[1] + cityR * 0.4;
          spoon(O, sx, sy, cityR * 0.35, sp, a);
          label(O, 'spt', 'bir çay kaşığı = milyarlarca ton', sx + cityR * 0.25, sy + cityR * 0.15, { size: 16, prog: sp, a: a * sp, sides: ['b', 'r'], gap: 0.0002 });
        }
      }
      // a black hole: no light escapes, so the plate stays unexposed there
      const hk = at('bh', 1.2) * (1 - at('quiet', 1.0));
      label(O, 'bh', 'kara delik: ışık kaçamaz, levha pozlanmaz', 0, 0.02 + 0.14, { kind: 'mono', size: 16, prog: hk, a: hk, sides: ['b'] });
      label(O, 'hv', 'daha ağır yıldızlar', 0, 0.02 - 0.16, { kind: 'hand', size: 34, prog: at('heavier', 1.2, ease.inOut, 0.6), a: hk, sides: ['t'] });
      // before / after
      if (split > 0) {
        const XR = [XL[0] + OFF, XL[1]];
        pen(O, [[0, P(-0.48, -0.55)], [0, P(0.4, 0.2)]], { w: 1.4, a: 0.8 * split, prog: split, seed: 3 });
        text(O, '2009', XL[0], P(-0.36, -0.42), { kind: 'hand', size: P(40, 30), align: 'center', prog: split, a: split, id: 'y1' });
        text(O, P('birkaç yıl sonra', 'sonra'), XR[0], P(-0.36, -0.42), { kind: 'hand', size: P(40, 30), align: 'center', prog: at('gone', 1.0, ease.inOut, -1.2), a: split, id: 'y2' });
        circle(O, XL[0], XL[1], 0.04, { prog: at('flare', 1), w: 1.3, a: 0.8, seed: 21 });
        const gn = at('gone', 1.2);
        circle(O, XR[0], XR[1], 0.04, { prog: gn, w: 1.3, a: 0.85, seed: 22, dash: [5, 5] });
        label(O, 'gone', 'yok', XR[0], XR[1], { kind: 'hand', size: 34, prog: gn, a: gn, sides: ['r', 'b'], gap: 0.05 });
        const th = at('think', 1.4);
        if (O.port) { textS(O, 'N6946-BH1 · ~25 Güneş kütleli dev', O.W / 2, O.y(0.32), { kind: 'mono', size: 13, align: 'center', prog: th, a: th, id: 'think' }); textS(O, 'patlamadan kara delik? (aday)', O.W / 2, O.y(0.32) + O.fs(22), { kind: 'mono', size: 13, align: 'center', prog: th, a: th, id: 'think2' }); }
        else textS(O, 'N6946-BH1 · ~25 Güneş kütleli dev · patlamadan kara delik? (aday)', O.W / 2, O.y(0.3), { kind: 'mono', size: 15, align: 'center', prog: th, a: th, id: 'think' });
      }
    },
  });
};

// ---------------------------------------------------------------------------------------------
// 11 · Us: the dust becomes a cloud, a Sun, an Earth, a person; back to the two stars
SCENES.us = (t, sec, ctx) => {
  const k = K(t, sec, ctx), { at, P } = k;
  const N0 = P([-0.5, 0.0], [0, -0.7]), CL = P([0.42, 0.0], [0, 0.35]);
  const scatter = at('scatter', 4.0, ease.inOut);
  const cloudK = at('cloud', 2.5);
  const sunK = at('sun', 2.4, ease.out);
  const usK = at('us', 2.2);
  const backK = at('back', 2.4);
  const A = P([-0.42, 0.0], [0, -0.5]), B = P([0.4, -0.02], [0, 0.32]);
  const SUN = P([0.5, -0.24], [0.3, -0.85]);
  const sunPos = [lerp(CL[0], SUN[0], usK), lerp(CL[1], SUN[1], usK)];
  const pre = 1 - backK;
  const objs = [];
  if (scatter < 1 && pre > 0) objs.push({ type: NEBULA, x: N0[0], y: N0[1], r: lerp(0.22, 0.34, scatter), p: [0.22, (1 - scatter) * 0.95 * pre, 0.7, 12, 0.1, 0.4, 0.5 * (1 - scatter)] });
  if (cloudK > 0 && pre > 0) objs.push({ type: CLOUD, x: CL[0], y: CL[1], r: lerp(0.3, 0.16, sunK), p: [0.75 * cloudK * (1 - usK) * pre, 0.35 * cloudK * pre, 3.3, 0] });
  if (sunK > 0 && pre > 0) objs.push(star(sunPos[0], sunPos[1], lerp(0.01, 0.026, sunK), { b: 1.5 * sunK * pre, gran: 3, halo: 1.2, seed: 22 }));
  const dimA = 1 - 0.65 * at('sunend', 4.5);
  if (backK > 0) {
    objs.push(star(A[0], A[1], 0.048, { b: 1.25 * backK * dimA, halo: 0.9 * backK * dimA, gran: 3, seed: 2 }));
    objs.push(star(B[0], B[1], 0.082, { b: 1.6 * backK, halo: 1.3 * backK, gran: 5, seed: 5, flick: 0.18 }));
  }
  const fin = at('final', 3.0);
  return plate('LV. 11 · BİZ', {
    cam: { x: 0, y: 0.04, z: 1, seed: 11 }, objs, stars: 0.8, gain: 1,
    draw(O) {
      // elements leave the remnant and drift into a new cloud
      const el = at('elems', 1.2) * pre;
      const names = ['O', 'Ca', 'Fe', 'C', 'Si', 'O', 'Fe', 'Ca'];
      names.forEach((n, i) => {
        const a = el * (1 - at('sun', 1.5)) * clamp(el * 3 - i * 0.2);
        if (a <= 0) return;
        const h = hash(i * 9 + 1), h2 = hash(i * 9 + 2);
        const x0 = N0[0] + (h - 0.5) * 0.3, y0 = N0[1] + (h2 - 0.5) * 0.3;
        const x1 = CL[0] + (h - 0.5) * 0.25, y1 = CL[1] + (h2 - 0.5) * 0.25;
        const q = ease.inOut(scatter * 0.85 + cloudK * 0.15);
        text(O, n, lerp(x0, x1, q), lerp(y0, y1, q) + Math.sin(t * 0.7 + i) * 0.01, { kind: 'monob', size: 19, a: a * (i < 3 ? 1 : 0.7), align: 'center', id: 'el' + i });
      });
      label(O, 'gs', 'yeni bir gaz bulutu', CL[0], CL[1] - 0.3, { kind: 'hand', size: 32, prog: cloudK, a: cloudK * (1 - sunK) * pre, sides: ['t'] });
      const sn = at('sun', 1.2) * pre;
      label(O, 'gn', 'Güneş · 4,6 milyar yıl önce', sunPos[0], sunPos[1], { size: 16, prog: sn, a: sn, sides: ['b', 'r', 'l'], gap: 0.04 });
      const ea = at('earth', 1.2) * pre;
      if (ea > 0) {
        const ang = 2.2 + t * 0.15, rr = 0.11;
        circle(O, sunPos[0], sunPos[1], rr, { sx: 1.6, prog: ea, w: 1, a: 0.6 * ea, seed: 7 });
        const ex = sunPos[0] + Math.cos(ang) * rr * 1.6, ey = sunPos[1] + Math.sin(ang) * rr;
        dot(O, ex, ey, 3.2, 'w', ea);
        label(O, 'dn', 'Dünya', ex, ey, { size: 15, prog: ea, a: ea, sides: ['b', 'r'], gap: 0.015 });
      }
      // a person, drawn from the same dust
      if (usK > 0 && pre > 0) {
        const H = P([-0.08, 0.0], [-0.12, 0.05]), s = P(0.27, 0.36);
        const a = usK * pre;
        const pts = human(O, H[0], H[1], s, usK, 0.95 * a);
        { const g = O.ctx; g.save(); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(O.x(x), O.y(y)) : g.moveTo(O.x(x), O.y(y)))); g.closePath(); g.fillStyle = rgba('w', 0.13 * a); g.fill(); g.restore(); }
        for (let i = 0; i < 90; i++) {
          const h = hash(i * 11 + 4), f = clamp(usK * 1.8 - h * 0.8);
          if (f <= 0 || f >= 1) continue;
          const p = pts[Math.floor(h * pts.length) % pts.length];
          const x = lerp(sunPos[0], p[0], ease.out(f)), y = lerp(sunPos[1], p[1], ease.out(f));
          dot(O, x, y, 1.4, i % 11 === 0 ? 'o' : 'w', 0.8 * Math.sin(f * Math.PI) * pre);
        }
        const bn = at('bones', 1.2) * pre;
        label(O, 'ca', 'Ca · kemiklerinizde', H[0] - s * 0.15, H[1] + s * 0.6, { size: 16, prog: bn, a: bn, sides: P(['l'], ['r', 'b']), lead: true, gap: 0.08 });
        label(O, 'fe', 'Fe · kanınızda', H[0] + s * 0.05, H[1] - s * 0.45, { size: 16, prog: at('bones', 1.2, ease.inOut, 1.0) * pre, a: bn, sides: ['r'], lead: true, gap: 0.12 });
        const gd = at('gold', 1.2) * pre;
        if (gd > 0) {
          circle(O, H[0] + s * 0.36, H[1] - s * 0.1, 0.012, { prog: gd, w: 1.6, a: gd, seed: 17 });
          label(O, 'au', 'Au · büyük ihtimalle iki nötron yıldızının çarpışması', H[0] + s * 0.36, H[1] - s * 0.1, { size: 15, prog: gd, a: gd, sides: ['r', 'br', 'b'], lead: true, gap: 0.05 });
        }
      }
      // back to the opening plate: the answer goes into the box
      if (backK > 0) {
        const mark = (p, r, prog, seed) => {
          circle(O, p[0], p[1], r, { prog, w: 1.4, a: 0.85, seed });
          for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.785; pen(O, [[p[0] + Math.cos(a) * r * 1.25, p[1] + Math.sin(a) * r * 1.25], [p[0] + Math.cos(a) * r * 1.6, p[1] + Math.sin(a) * r * 1.6]], { w: 1.2, a: 0.7 * prog, seed: seed + i }); }
        };
        mark(A, 0.1, backK, 3); mark(B, 0.15, backK, 7);
        text(O, 'A', A[0] - 0.13, A[1] - 0.12, { kind: 'hand', size: 34, a: backK, id: 'A' });
        text(O, 'B', B[0] - 0.18, B[1] - 0.16, { kind: 'hand', size: 34, a: backK, id: 'B' });
        const cx = P(0, 0), cy = P(0.02, -0.1), bw = P(0.13, 0.17), bh = 0.09;
        pen(O, [[cx - bw, cy - bh], [cx + bw, cy - bh], [cx + bw, cy + bh], [cx - bw, cy + bh], [cx - bw, cy - bh]], { w: 1.6, prog: backK, seed: 4 });
        const ms = at('mass', 1.0, ease.out);
        text(O, 'kütle', cx, cy + 0.005, { kind: 'hand', size: 58, align: 'center', prog: ms, id: 'q' });
        const la = at('light', 1.2), lb = at('heavy', 1.2);
        label(O, 'ra', 'hafif → beyaz cüce', A[0], A[1] + 0.12, { size: 17, prog: la, a: la, sides: ['b', 'r'] });
        label(O, 'rb1', 'ağır → süpernova', B[0], B[1] + 0.17, { size: 17, prog: lb, a: lb, sides: ['b', 'l'] });
        label(O, 'rb2', '→ nötron yıldızı ya da kara delik', B[0], B[1] + 0.22, { size: 15, prog: at('heavy', 1.2, ease.inOut, 1.0), a: lb, sides: ['b', 'l'], gap: 0.04 });
      }
      if (fin > 0) {
        textS(O, 'Bir Yıldız Nasıl Ölür?', O.W / 2, O.H * P(0.2, 0.16), { kind: 'hand', size: 46, align: 'center', prog: fin, a: fin, id: 'fin' });
        textS(O, 'siyanotip levhalar · kodla çizildi', O.W / 2, O.H * P(0.2, 0.16) + O.fs(40), { kind: 'mono', size: 13, align: 'center', a: fin * 0.75, id: 'fin2', spacing: 0.1 });
      }
    },
  });
};
