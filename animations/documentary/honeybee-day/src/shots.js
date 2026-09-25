// Shots, chapter by chapter. Each chapter function paints the whole frame from (u = seconds into
// the chapter): set, light, camera, bee, overlay. Nothing depends on the previous frame.
import * as THREE from 'three';
import { G } from './glsl.js';
import { TOD, mixTOD } from './tod.js';
import { HOLE_R, HOLE } from './tree.js';
const TRUNK_R = HOLE_R;
import { clamp, lerp, smooth, ease, easeOut, easeIn } from './noise.js';
import { HERO_SPOTS, KINDS } from './meadow.js';
import { meadowAt } from './map.js';
import { CELL } from './comb.js';
import { DANCE } from './sound.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DANCE_C = V(4, 2, 0), DANCE_PHI = 40 * Math.PI / 180;
const LEAD = 0.4;                      // see before you hear: shots start a little before their word
export const env = (u, a, b, c, d) => smooth(a, b, u) * (1 - smooth(c, d, u));
// pick the active shot: list of [start, fn]; fn(lt, dur, u)
function seq(u, list, end) {
  let k = 0;
  for (let i = 0; i < list.length; i++) if (u >= list[i][0]) k = i;
  const s = list[k][0], e = k + 1 < list.length ? list[k + 1][0] : end;
  return list[k][1](u - s, e - s, u);
}
const vlerp = (a, b, t) => a.clone().lerp(b, t);
// hole geometry helpers (tree set, cm)
const HOLE_FLOOR = HOLE.y - HOLE.h + 0.25;
const holeLip = (x = 0) => V(TRUNK_R + 1.5 + x, HOLE_FLOOR, 0);
const LIP = { n: V(0, 1, 0), d: HOLE_FLOOR };
const COMB = { n: V(0, 0, 1), d: 0.02 };
const flat = y => ({ n: V(0, 1, 0), d: y });

export function chapters(X) {
  const { bee, overlay: O, sets } = X;
  const cue = (ch, k) => ch.cues[k] - LEAD;
  const put = (pose) => { bee.root.visible = true; bee.pose(pose); bee.root.updateMatrixWorld(true); };
  const headW = () => bee.parts.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.06, 0, 0).applyQuaternion(bee.root.quaternion));
  const fwd = yaw => V(Math.cos(yaw), 0, -Math.sin(yaw));
  const side = yaw => V(Math.sin(yaw), 0, Math.cos(yaw));
  const flyShadow = (p, gy, yaw = 0) => { const h = Math.max(0, p.y - gy); shadowAt(V(p.x, gy + 0.05, p.z), yaw, 0.42 * Math.exp(-h / 28), 1 + h * 0.05); };
  const shadowAt = (p, yaw = 0, op = 0.5, s = 1) => { X.shadow.visible = true; X.shadow.position.copy(p); X.shadow.rotation.set(0, yaw, 0); X.shadow.material.uniforms.uOp.value = op; X.shadow.scale.setScalar(s); };
  // the crowd behind the hole: a few bees wandering on the glowing comb edge
  const holeCrowd = (u, n = 9) => {
    const c = sets.tree.userData.crowd, list = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Matrix4();
      const ph = i * 1.7, sp = 0.18 + (i % 5) * 0.05;
      const y = HOLE.y + Math.sin(u * sp + ph) * 3.2 + (i % 3 - 1) * 1.4;
      const z = Math.cos(u * sp * 0.8 + ph * 1.3) * 3.4;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(u * 0.5 + i) * 1.5 + i, 0, -Math.PI / 2, 'XYZ'));
      m.compose(V(HOLE_R + 2 - 22 + 1.4, y, z), q, V(1, 1, 1));
      list.push(m);
    }
    c.set(list);
  };

  // ---- the dance: a figure of eight on the vertical comb; waggle run 40° right of "up" ----
  const hvU = () => sets.hive.userData;
  const DANCE_RUN = DANCE.run, DANCE_CYCLE = DANCE.cycle;
  const danceAt = (tt, slow = false) => {
    const dir = V(Math.sin(DANCE_PHI), Math.cos(DANCE_PHI), 0), perp = V(dir.y, -dir.x, 0);
    const Sx = DANCE_C.clone().sub(dir.clone().multiplyScalar(0.9)), E = DANCE_C.clone().add(dir.clone().multiplyScalar(0.9));
    if (tt < 0) {
      const k = clamp(1 + tt / 3);
      const pos = Sx.clone().add(V(-3 * (1 - k), -2 * (1 - k), 0));
      return { pos, head: Math.atan2(2, 3), wag: 0, waggle: 0, runT: 0 };
    }
    const c = Math.floor(tt / DANCE_CYCLE), f = tt - c * DANCE_CYCLE;
    if (f < DANCE_RUN) {
      const k = f / DANCE_RUN;
      const w = Math.sin(2 * Math.PI * (slow ? 13 : 6.5) * f);
      const pos = Sx.clone().lerp(E, k).add(perp.clone().multiplyScalar(0.05 * w));
      return { pos, head: Math.atan2(dir.y, dir.x), wag: 0.32 * w, waggle: 1, runT: f };
    }
    const g = (f - DANCE_RUN) / (DANCE_CYCLE - DANCE_RUN), th = Math.PI * g, sg = c % 2 ? 1 : -1;
    const pos = DANCE_C.clone().add(dir.clone().multiplyScalar(0.9 * Math.cos(th))).add(perp.clone().multiplyScalar(sg * 0.9 * Math.sin(th)));
    const tg = dir.clone().multiplyScalar(-Math.sin(th)).add(perp.clone().multiplyScalar(sg * Math.cos(th)));
    return { pos, head: Math.atan2(tg.y, tg.x), wag: 0, waggle: 0, runT: 0 };
  };
  const followers = (dz, t) => {
    const out = [];
    const offs = [[-1.3, 0.55], [-1.3, -0.55], [-0.2, 1.0], [-0.2, -1.0], [-2.2, 0.0], [0.9, 1.1]];
    const ch = Math.cos(dz.head), sh = Math.sin(dz.head);
    offs.forEach(([a, b], i) => {
      const lag = 0.15 * Math.sin(t * 1.3 + i);
      const x = dz.pos.x + (a + lag) * ch - b * sh, y = dz.pos.y + (a + lag) * sh + b * ch;
      out.push(hvU().onComb(x, y, Math.atan2(dz.pos.y - y, dz.pos.x - x) + 0.15 * Math.sin(t * 2 + i)));
    });
    return out;
  };
  // the outbound search flight on the map (metres): wandering, then small loops among flowers
  const outPath = s => {
    const m = meadowAt();
    const base = m.clone().multiplyScalar(Math.min(1, s * 1.08));
    const perp = V(-m.z, 0, m.x).normalize();
    const wob = Math.sin(Math.PI * Math.min(1, s * 1.08)) * (Math.sin(s * 9.4) * 260 + Math.sin(s * 23 + 1) * 70);
    const loops = s > 0.9 ? (s - 0.9) * 10 : 0;
    return base.add(perp.multiplyScalar(wob)).add(V(Math.cos(loops * 12) * 60 * loops, 0, Math.sin(loops * 12) * 60 * loops));
  };

  return {
    _heavy: [['safak', 0.15], ['cayir', 0.6], ['dans', 0.5], ['kovan', 0.9]],
    _poster() { const c = X.tl.chapters[0]; return c.start + c.cues.one + 2.5; },

    // 1 · dawn at the knot hole: the question
    safak(u, ch, S) {
      X.useSet('tree');
      S.look = X.tod(TOD.dawn);
      holeCrowd(u);
      seq(u, [
        [0, (lt, d) => {
          // wide: the old linden in dawn mist, its hole glowing; a slow slide in
          const k = ease(lt / d);
          const from = V(980, 38, 700), to = V(820, 42, 600);
          X.cam(vlerp(from, to, k), V(-60, 175, -260), 26);
          S.look.fade = 1 - smooth(0, 3.2, u);
        }],
        [cue(ch, 'dark'), (lt, d) => {
          // the opening: warmth inside, shapes moving against it
          const k = ease(lt / d);
          X.cam(V(TRUNK_R + lerp(95, 75, k), HOLE.y + 6, lerp(26, 20, k)), V(TRUNK_R - 6, HOLE.y - 1, 0), 18);
        }],
        [cue(ch, 'one'), (lt, d) => {
          // she walks out onto the lip, rim-lit by the dawn
          const walk = clamp(lt / 3.2);
          const x = lerp(-9, 1.5, easeOut(walk));
          const p = holeLip(x); p.y += 0.3;
          put({ mode: walk < 1 ? 'walk' : 'stand', plane: LIP, t: u, pos: p, yaw: 0.1 * Math.sin(u * 0.4), stride: x * 3.2 });
          shadowAt(holeLip(x + 0.05).add(V(0, 0.02, 0)), 0, 0.45);
          const k = ease(lt / d);
          X.cam(V(TRUNK_R + lerp(17, 14, k), HOLE_FLOOR + 2.2, lerp(9, 7, k)), V(TRUNK_R - 0.5, HOLE_FLOOR + 1.4, 0), 20, 0.3, 30000);
        }],
        [cue(ch, 'nomap'), (lt, d) => {
          // she lifts off; the camera stays
          const up = easeIn(clamp((lt - 1.4) / 2.2));
          const p = holeLip(1.5 + up * 14); p.y += 0.3 + up * 16;
          put({ mode: up > 0 ? 'fly' : 'stand', plane: LIP, t: u, pos: p, pitch: up * 0.3, wing: up > 0 ? 'blur' : 'fold' });
          if (up < 0.1) shadowAt(holeLip(1.55), 0, 0.45 * (1 - up * 10));
          X.cam(V(TRUNK_R + 14, HOLE_FLOOR + 2.2, 7), V(TRUNK_R + 1, HOLE_FLOOR + 1.6, 0), 20, 0.3, 30000);
        }],
        [cue(ch, 'how'), (lt, d) => {
          // a dot against the whole sky
          const k = lt / d;
          const cp = V(700, 60, 300);
          const b = V(560 - k * 220, 330 + k * 120, 120 - k * 60);
          put({ mode: 'fly', t: u, pos: b, yaw: 2.6, scale: 1.4 });
          X.cam(cp, V(300, 420 + k * 20, -120), 30);
        }],
      ], ch.dur);
      const tDay = ch.cues.how;
      { const out = 1 - smooth(ch.dur - 0.8, ch.dur, u); O.title('Bal Arısının Bir Günü', 'Apis mellifera', smooth(tDay + 0.35, tDay + 1.0, u) * out, { big: true, band: smooth(tDay - 0.2, tDay + 0.35, u) * out }); }
      S.noTitle = true;
    },

    // 2 · who she is: three weeks old, her last job
    hafta(u, ch, S) {
      X.useSet('tree');
      S.look = X.tod(mixTOD(TOD.dawn, TOD.morning, 0.25));
      holeCrowd(u + 40);
      seq(u, [
        [0, (lt, d) => {
          // her face: the compound eye holds the sky
          const p = holeLip(1.4); p.y += 0.3;
          put({ mode: 'stand', plane: LIP, t: u, pos: p, yaw: -0.35, ant: 1 });
          shadowAt(holeLip(1.45), -0.35, 0.45);
          const k = ease(lt / d);
          const head = headW();
          const cp = head.clone().add(fwd(-0.35).multiplyScalar(lerp(4.4, 3.8, k))).add(side(-0.35).multiplyScalar(lerp(-2.2, -1.8, k))).add(V(0, 0.45, 0));
          X.cam(cp, head.clone().add(V(0, -0.05, 0)), 18, 0.2, 30000);
        }],
        [cue(ch, 'orient'), (lt, d) => {
          // orientation flights: facing the tree, arcs widening in front of the hole
          const tt = lt;
          const w = 12 + tt * 9;
          const pos = a => V(TRUNK_R + 16 + w * 0.5 * (1 - Math.cos(a * 0.7)), HOLE.y + 8 + Math.sin(a * 1.3) * (6 + tt * 2), Math.sin(a) * w);
          const a = tt * 1.9;
          const p = pos(a), q = pos(a + 0.05);
          put({ mode: 'fly', t: u, pos: p, yaw: Math.PI + 0.35 * Math.sin(a) });
          X.cam(V(TRUNK_R + 125, HOLE.y + 10, 80), V(TRUNK_R + 24, HOLE.y + 6, 4), 26);
          // fading trail of her recent path
          let d2 = '';
          for (let i = 0; i <= 40; i++) { const s = a - i * 0.06; if (s < 0) break; const sp = O.project(pos(s)); if (!sp) continue; d2 += (d2 ? 'L' : 'M') + sp[0].toFixed(1) + ',' + sp[1].toFixed(1); }
          O.path('orientTrail', d2, { op: 0.75 * smooth(0.3, 1.2, lt), dash: '3 5' });
          O.label('orientL', p, 'yönelim uçuşu', { dir: [-120, -70], op: env(lt, 0.8, 1.6, d - 1, d) });
        }],
        [cue(ch, 'forage'), (lt, d) => {
          // on the lip again, turned to the open air; then away
          const up = easeIn(clamp((lt - (d - 2.4)) / 2.2));
          const p = holeLip(1.5 + up * 18); p.y += 0.3 + up * 10;
          const turn = ease(clamp(lt / 2.5));
          put({ mode: up > 0 ? 'fly' : 'stand', plane: LIP, t: u, pos: p, yaw: lerp(1.2, 0, turn), wing: up > 0 ? 'blur' : 'fold' });
          if (up < 0.1) shadowAt(holeLip(1.5), lerp(1.2, 0, turn), 0.45);
          X.cam(V(TRUNK_R + 17, HOLE_FLOOR + 3.5, 19), V(TRUNK_R + 3, HOLE_FLOOR + 1.6, 0), 22, 0.3, 30000);
        }],
      ], ch.dur);
      // her life so far: five cells, one job each
      const jobs = [['temizlik', '1–3'], ['bakıcılık', '3–12'], ['mum, petek', '12–18'], ['bekçilik', '18–21'], ['toplayıcılık', '21+']];
      const keys = ['clean', 'nurse', 'wax', 'guard', 'forage'];
      const show = env(u, cue(ch, 'clean'), cue(ch, 'clean') + 0.8, ch.dur - 1.5, ch.dur - 0.4);
      if (show > 0.01) {
        const k = O.k, W = O.W, H = O.H;
        const r = 27 * k, gap = r * 2.05;
        const x0 = O.portrait ? W / 2 - gap * 2 : W - W * 0.05 - gap * 4 - r, y0 = O.portrait ? H * 0.2 : H * 0.14;
        keys.forEach((key, i) => {
          const t0 = cue(ch, key);
          const on = smooth(t0, t0 + 0.6, u);
          const next = i < 4 ? smooth(cue(ch, keys[i + 1]), cue(ch, keys[i + 1]) + 0.6, u) : 0;
          const x = x0 + i * gap, y = y0;
          let d = '';
          for (let j = 0; j < 6; j++) { const a = Math.PI / 6 + j * Math.PI / 3; d += (j ? 'L' : 'M') + (x + Math.cos(a) * r).toFixed(1) + ',' + (y + Math.sin(a) * r).toFixed(1); }
          d += 'Z';
          const lit = on * (1 - next * 0.75);
          O.path('job' + i, d, { op: show * (0.35 + 0.65 * on), ink: i === 4 && on > 0.5 ? 'wax' : 'light' });
          O.path('jobF' + i, d, { cls: 'diag fill', op: show * lit * 0.55, ink: 'wax' });
          if (!O.portrait || i === 0 || i === 4 || on * (1 - next) > 0.5) O.text('jobT' + i, x, y + r + 20 * k, jobs[i][0], { op: show * (0.4 + 0.6 * on), anchor: 'middle', size: 14, keep: true });
          O.text('jobD' + i, x, y - r - 9 * k, jobs[i][1], { cls: 'latin', op: show * (0.3 + 0.5 * on), anchor: 'middle', size: 13 });
        });
        O.text('jobDay', x0 + gap * 4 + r * 0.2, y0 - r - 26 * k, 'gün', { cls: 'latin', op: show * 0.6, anchor: 'middle', size: 12 });
        const wk = env(u, cue(ch, 'week'), cue(ch, 'week') + 0.8, ch.dur - 1.5, ch.dur - 0.4);
        O.text('jobWeek', x0 + gap * 4, y0 + r + 44 * k, '≈ 1 hafta', { cls: 'latin', op: wk, anchor: 'middle', size: 16, ink: 'wax' });
      }
    },

    // 3 · morning flight: the sun as a compass, then the sky as a bee sees it
    gok(u, ch, S) {
      X.useSet('meadow');
      let tod = TOD.morning;
      // time-lapse of the sun sliding across the sky (the drift she corrects with her clock)
      const drift = smooth(cue(ch, 'drift'), cue(ch, 'drift') + 3.5, u);
      tod = { ...tod, sunAz: tod.sunAz + drift * 28, sunEl: tod.sunEl + drift * 9 };
      const cloud = smooth(cue(ch, 'cloud'), cue(ch, 'cloud') + 2.5, u);
      const patch = smooth(cue(ch, 'patch'), cue(ch, 'patch') + 2, u);
      tod = { ...tod, cloudOver: cloud, cloud: lerp(0.35, 0.62, cloud) + patch * 0.2 };
      S.look = X.tod(tod);
      G.uCloudSh.value = 0.55;
      const sunDir = G.uSunDir.value.clone();
      seq(u, [
        [0, (lt, d) => {
          // low over the meadow, most of the frame is sky; she crosses it
          const k = lt / d;
          X.cam(V(0, 22, 420), V(-40, 150, -300), 34);
          const bp0 = V(lerp(-260, 220, k), lerp(34, 120, k), lerp(40, -60, k));
          put({ mode: 'fly', t: u, pos: bp0, yaw: -0.2, pitch: 0.12, scale: 1 });
          flyShadow(bp0, 14, -0.2);
          S.look.fade = 1 - smooth(0, 0.6, u);
          Object.assign(S.look, { fg: 0.9, fgT: u, fgSeed: 1 });
        }],
        [cue(ch, 'wings'), (lt, d) => {
          // slowed down a hundredfold: each stroke sweeps about a quarter turn
          const p = V(lerp(-6, 6, lt / d), 140, 0);
          put({ mode: 'fly', t: lt, pos: p, yaw: 0, pitch: 0.1, wing: 'slow', slowHz: 1.6 });
          X.cam(p.clone().add(V(-1.6, 0.9, 5.2)), p.clone().add(V(0.2, 0.15, 0)), 22, 0.2, 60000);
          O.label('wingL', p.clone().add(V(-0.2, 0.5, 0.4)), 'saniyede ≈ 230 vuruş', { latin: 'ağır çekim: yüz kat yavaş', dir: [-150, -90], op: env(lt, 0.8, 1.5, d - 0.8, d) });
        }],
        [cue(ch, 'sun'), (lt, d, uu) => {
          // she holds a bearing relative to the sun
          const k = lt / d;
          const cp = V(0, 30, 300);
          const b = V(lerp(-30, 60, k), lerp(90, 130, k), lerp(120, -80, k));
          put({ mode: 'fly', t: u, pos: b, yaw: 1.2, pitch: 0.1 });
          X.cam(cp, V(-30, 160, -300), 36);
          Object.assign(S.look, { fg: 0.85, fgT: u, fgSeed: 2 });
          const sp = O.project(cp.clone().add(sunDir.clone().multiplyScalar(5000)));
          const bp = O.project(b);
          const hp = O.project(b.clone().add(V(Math.cos(1.2), 0, -Math.sin(1.2)).multiplyScalar(260)));
          const op = env(uu, cue(ch, 'sun') + 0.6, cue(ch, 'sun') + 1.4, cue(ch, 'cloud') + 1.5, cue(ch, 'cloud') + 2.5);
          if (sp && bp && hp) {
            O.path('sunRay', `M${bp[0]},${bp[1]} L${sp[0]},${sp[1]}`, { op: op * 0.8, dash: '4 6' });
            O.path('heading', `M${bp[0]},${bp[1]} L${hp[0]},${hp[1]}`, { op, cls: 'diag thick', ink: 'uv' });
            const a1 = Math.atan2(sp[1] - bp[1], sp[0] - bp[0]), a2 = Math.atan2(hp[1] - bp[1], hp[0] - bp[0]);
            const r = 70 * O.k;
            let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
            const pts = []; for (let i = 0; i <= 24; i++) { const a = a1 + da * i / 24; pts.push(`${(bp[0] + Math.cos(a) * r).toFixed(1)},${(bp[1] + Math.sin(a) * r).toFixed(1)}`); }
            O.path('arc', 'M' + pts.join('L'), { op });
            const am = a1 + da / 2;
            O.text('arcT', bp[0] + Math.cos(am) * (r + 26 * O.k), bp[1] + Math.sin(am) * (r + 26 * O.k), 'güneşe göre açı', { op, anchor: 'middle', size: 16 });
            O.text('clockT', sp[0], sp[1] + 46 * O.k, drift > 0.02 ? 'güneş kayıyor · arı iç saatiyle düzeltiyor' : 'güneş', { op: op * (drift > 0.02 ? 1 : 0.8), anchor: 'middle', size: 15, cls: 'latin' });
          }
        }],
        [cue(ch, 'beeview'), (lt, d, uu) => {
          // through her eyes: ultraviolet sky, hexagon mosaic, the polarisation rings
          const cp = V(0, 60, 200);
          X.cam(cp, cp.clone().add(sunDir.clone().multiplyScalar(100)).add(V(0, 20, 0)), 70);
          const k = smooth(0, 1.1, lt);
          G.uBee.value = k; S.look.eye = k; S.look.cell = 9;
          X.sky.u.uPol.value = smooth(cue(ch, 'pol') - cue(ch, 'beeview'), cue(ch, 'pol') - cue(ch, 'beeview') + 1.5, lt) * (0.7 + 0.5 * smooth(cue(ch, 'rings') - cue(ch, 'beeview'), cue(ch, 'rings') - cue(ch, 'beeview') + 1.2, lt));
          const sp = O.project(cp.clone().add(sunDir.clone().multiplyScalar(5000)));
          if (sp) O.label('sunHid', sp, 'güneş, bulutun ardında', { dir: [110, 70], op: env(uu, cue(ch, 'rings') + 0.6, cue(ch, 'rings') + 1.4, ch.dur - 1, ch.dur), ink: 'uv' });
          O.text('polT', O.W * 0.5, O.H * 0.12, 'polarize ışık', { op: env(uu, cue(ch, 'pol') + 0.4, cue(ch, 'pol') + 1.2, ch.dur - 1, ch.dur), anchor: 'middle', size: 22, ink: 'uv' });
        }],
      ], ch.dur);
    },

    // 4 · two meadows: ours, and hers
    cayir(u, ch, S) {
      X.useSet('meadow');
      S.look = X.tod(TOD.day);
      G.uCloudSh.value = 0.6;
      const H = sets.meadow.userData.heroes;
      const flowerTop = i => H[i].position.clone().add(V(0, 0.4, 0));
      seq(u, [
        [0, (lt, d) => {
          const k = ease(lt / d);
          X.cam(V(lerp(-12, -10, k), 42, lerp(32, 29, k)), V(-2, 31, 0), 30);
          const land = flowerTop(0).add(V(0, -0.1, 0));
          const a = clamp(lt / (d * 0.9));
          const p = V(-40, 48, -30).lerp(land, easeOut(a)).add(V(0, Math.sin(a * Math.PI) * 10, 0));
          put({ mode: a < 1 ? 'fly' : 'stand', plane: flat(land.y - 0.3), t: u, pos: a < 1 ? p : land, yaw: 0.35, pitch: 0.1 * (1 - a) });
          flyShadow(a < 1 ? p : land, land.y - 0.3, 0.35);
          Object.assign(S.look, { fg: 1, fgT: u, fgSeed: 3 });
        }],
        [cue(ch, 'ours'), (lt, d, uu) => {
          const k = ease(clamp((uu - cue(ch, 'ours')) / (cue(ch, 'target') - cue(ch, 'ours'))));
          X.cam(V(lerp(-26, -23, k), 58, lerp(46, 42, k)), V(3, 28, -3), 32);
          { const land = flowerTop(0).add(V(0, -0.1, 0)); put({ mode: 'stand', plane: flat(land.y - 0.3), t: u, pos: land, yaw: 0.35, ant: 0.8 }); shadowAt(V(land.x, land.y - 0.28, land.z), 0.35, 0.4); }
          Object.assign(S.look, { fg: 0.7, fgT: u, fgSeed: 7 });
          const w = smooth(cue(ch, 'theirs'), cue(ch, 'theirs') + 1.3, uu);
          G.uSplit.value = lerp(1, 0.5, w); G.uBee.value = w > 0 ? 1 : 0; S.look.eye = w > 0 ? 1 : 0;
          S.look.cell = 11 + 5 * env(uu, cue(ch, 'mosaic'), cue(ch, 'mosaic') + 0.8, cue(ch, 'mosaic') + 2.5, cue(ch, 'mosaic') + 3.5);
          if (w > 0.01) {
            const x = O.W * G.uSplit.value;
            O.path('divider', `M${x},0 L${x},${O.H}`, { op: w });
            O.text('oursT', x - 22 * O.k, O.H * 0.1, 'bizim gözümüz', { op: w, anchor: 'end', size: 17 });
            O.text('theirsT', x + 22 * O.k, O.H * 0.1, 'arının gözü', { op: w, anchor: 'start', size: 17, ink: 'uv' });
          }
          O.label('uvL', flowerTop(1), 'ultraviyole', { dir: [90, -80], op: env(uu, cue(ch, 'uv') + 0.4, cue(ch, 'uv') + 1.2, cue(ch, 'target') - 0.3, cue(ch, 'target')), ink: 'uv' });
          O.label('redL', flowerTop(2), 'kırmızı → koyu', { dir: [70, 90], op: env(uu, cue(ch, 'red') + 0.3, cue(ch, 'red') + 1.1, cue(ch, 'target') - 0.3, cue(ch, 'target')) });
        }],
        [cue(ch, 'target'), (lt, d, uu) => {
          // the yellow flower, split through its heart
          const f = flowerTop(0);
          const k = ease(clamp(lt / 6));
          X.cam(f.clone().add(V(lerp(-9, -7, k), lerp(13, 12, k), lerp(8, 6.5, k))), f.clone().add(V(0.3, -0.3, 0)), 24, 0.3);
          G.uSplit.value = 0.5; G.uBee.value = 1; S.look.eye = 1; S.look.cell = 10;
          const x = O.W * 0.5;
          O.path('divider', `M${x},0 L${x},${O.H}`, { op: 1 - smooth(d - 1, d, lt) });
          O.label('guideL', f.clone().add(V(0.4, 0.1, 0.3)), 'nektar işareti', { latin: 'yalnızca ultraviyolede', dir: [150, -110], op: env(uu, cue(ch, 'guide') + 0.3, cue(ch, 'guide') + 1.1, d + cue(ch, 'target') - 0.8, d + cue(ch, 'target')), ink: 'uv' });
          if (lt > d - 1) { G.uSplit.value = lerp(0.5, 1, smooth(d - 1, d, lt)); }
        }],
        [cue(ch, 'constancy'), (lt, d) => {
          // flower constancy: from yellow to yellow
          const route = [0, 1, 3, 0].map(i => flowerTop(i));
          const seg = route.length - 1;
          const k = clamp(lt / (d - 0.5)) * seg;
          const i = Math.min(seg - 1, Math.floor(k)), f = k - i;
          const hop = Math.sin(Math.PI * f);
          const p = route[i].clone().lerp(route[i + 1], ease(f)).add(V(0, 0.2 + hop * 9, 0));
          const gy = lerp(route[i].y, route[i + 1].y, ease(f)) - 0.1;
          const dir = route[i + 1].clone().sub(route[i]);
          put({ mode: hop > 0.15 ? 'fly' : 'stand', plane: flat(gy), t: u, pos: p, yaw: Math.atan2(-dir.z, dir.x), wing: hop > 0.15 ? 'blur' : 'fold' });
          flyShadow(p, gy, Math.atan2(-dir.z, dir.x));
          X.cam(p.clone().add(V(-16, 12, 22)), p.clone().lerp(V(14, 28, 0), 0.35), 32, 0.5);
          Object.assign(S.look, { fg: 0.6, fgT: u, fgSeed: 4 });
          let dd = '';
          route.forEach((r, j) => { const s = O.project(r); if (s) dd += (j ? 'L' : 'M') + s[0].toFixed(1) + ',' + s[1].toFixed(1); });
          O.path('route', dd, { op: 0.8 * smooth(0.3, 1.2, lt), dash: '3 6', ink: 'uv' });
          O.label('constL', route[1], 'hep aynı tür', { latin: 'çiçek sadakati', dir: [110, -70], op: env(lt, 1, 1.8, d - 0.8, d) });
        }],
      ], ch.dur);
    },

    // 5 · the load: nectar, the honey stomach, pollen, the way home
    yuk(u, ch, S) {
      X.useSet('meadow');
      S.look = X.tod(mixTOD(TOD.day, TOD.noon, 0.3));
      G.uCloudSh.value = 0.55;
      const H = sets.meadow.userData.heroes;
      const f0 = H[0].position.clone();
      const top = f0.y + 0.3;
      const onFlower = V(f0.x + 0.1, top + 0.3, f0.z);
      const FL = flat(top);
      seq(u, [
        [0, (lt, d, uu) => {
          // drinking: the tongue goes down into the flower
          const pr = smooth(0.2, 1.6, lt);
          put({ mode: 'stand', plane: FL, t: u, pos: onFlower, yaw: 0.4, pitch: -0.12, prob: pr * 0.75, ant: 0.6, crop: smooth(cue(ch, 'crop') + 0.2, cue(ch, 'crop') + 1, uu) * (1 - smooth(cue(ch, 'flowers') - 0.4, cue(ch, 'flowers'), uu)) });
          const head = headW();
          const k = ease(lt / d);
          X.cam(head.clone().add(V(lerp(-2.4, -2.9, k), 1.1, lerp(3.6, 4.2, k))), head.clone().add(V(-0.35, -0.15, 0)), 24, 0.2);
          O.label('waterL', head.clone().add(V(0.25, -0.55, 0.1)), 'nektar: çoğu su', { dir: [-160, 90], op: env(uu, cue(ch, 'water') + 0.2, cue(ch, 'water') + 1, cue(ch, 'crop') - 0.2, cue(ch, 'crop') + 0.3) });
          const cw = bee.parts.crop.getWorldPosition(new THREE.Vector3());
          O.label('cropL', cw, 'bal midesi', { latin: 'sindirim midesinden ayrı', dir: [-150, -90], op: env(uu, cue(ch, 'crop') + 0.5, cue(ch, 'crop') + 1.3, cue(ch, 'flowers') - 0.6, cue(ch, 'flowers')), ink: 'wax' });
        }],
        [cue(ch, 'flowers'), (lt, d) => {
          // many flowers per trip (time-lapse from above)
          const list = sets.meadow.userData.flowers.userData.list.filter(f => f.kind === 0 && Math.hypot(f.x - 120, f.z + 60) < 160).slice(0, 12);
          const n = list.length - 1, k = clamp(lt / d) * n;
          const i = Math.min(n - 1, Math.floor(k)), f = k - i;
          const a = V(list[i].x, list[i].y + 0.3, list[i].z), b = V(list[i + 1].x, list[i + 1].y + 0.3, list[i + 1].z);
          const hop = Math.sin(Math.PI * f);
          const pp = a.clone().lerp(b, ease(f)).add(V(0, hop * 12, 0)); flyShadow(pp, lerp(list[i].y, list[i + 1].y, ease(f)));
          put({ mode: hop > 0.1 ? 'fly' : 'stand', plane: flat(lerp(list[i].y, list[i + 1].y, ease(f))), t: u, pos: pp, yaw: Math.atan2(-(b.z - a.z), b.x - a.x), pollen: 0.2 + 0.3 * clamp(lt / d) });
          X.cam(pp.clone().add(V(-10, 26, 24)), pp.clone(), 34, 0.5);
          let dd = '';
          for (let j = 0; j <= Math.min(n, i + 1); j++) { const s = O.project(V(list[j].x, list[j].y, list[j].z)); if (s) dd += (dd ? 'L' : 'M') + s[0].toFixed(1) + ',' + s[1].toFixed(1); }
          O.path('visits', dd, { op: 0.7, dash: '2 5' });
          O.text('visitsT', O.W * 0.06, O.H * 0.2, 'bir seferde onlarca, bazen yüzlerce çiçek', { op: env(lt, 0.8, 1.6, d - 0.6, d), size: 18 });
        }],
        [cue(ch, 'pollen'), (lt, d, uu) => {
          // pollen baskets on the hind legs fill
          const g = 0.25 + 0.75 * smooth(0.3, d - 0.5, lt);
          put({ mode: 'stand', plane: FL, t: u, pos: onFlower, yaw: 2.2, pitch: -0.05, pollen: g, ant: 0.8 });
          const L = bee.parts.legs.find(l => l.pollen && l.s > 0) || bee.parts.legs.find(l => l.pollen);
          const pw = L.pollen.getWorldPosition(new THREE.Vector3());
          X.cam(pw.clone().add(V(0.8, 0.6, 3.4)), pw.clone().add(V(0.3, 0.15, 0)), 26, 0.2);
          O.label('pollenL', pw, 'polen sepeti', { latin: 'corbicula', dir: [120, -100], op: env(lt, 0.8, 1.5, d - 0.6, d), ink: 'wax' });
        }],
        [cue(ch, 'load'), (lt, d) => {
          // heavy take-off
          const up = easeIn(clamp((lt - 0.8) / (d - 0.8)));
          const p = onFlower.clone().add(V(up * 20, up * 26, -up * 6));
          flyShadow(p, top, 0.3);
          put({ mode: up > 0 ? 'fly' : 'stand', plane: FL, t: u, pos: p, yaw: 0.3, pitch: 0.18 * up, pollen: 1, wing: up > 0 ? 'blur' : 'fold' });
          const follow = onFlower.clone().lerp(p, 0.85);
          X.cam(follow.clone().add(V(-6, 2.5, 13)), follow.clone().add(V(1, 0.5, 0)), 28, 0.3);
          Object.assign(S.look, { fg: 0.8, fgT: u, fgSeed: 5 });
          O.label('loadL', p.clone().add(V(0, 0.4, 0)), 'dönüş yükü', { latin: 'kendi ağırlığının yarısına yakın', dir: [-150, -80], op: env(lt, 0.8, 1.6, d - 0.5, d) });
          O.scale('sc1', onFlower, 1, '1 cm', { op: env(lt, 0.4, 1, d - 0.5, d) });
        }],
        [cue(ch, 'evap'), (lt, d) => {
          // on the wing, a droplet at the mouth: water leaves before she is home
          const p = V(lerp(-4, 4, lt / d), 160, 0);
          const pulse = 0.6 + 0.4 * Math.sin(lt * 2.2);
          put({ mode: 'fly', t: u, pos: p, yaw: 0, pitch: 0.12, pollen: 1, drop: pulse });
          X.cam(p.clone().add(V(0.4, 0.3, 4.4)), p.clone().add(V(0.35, -0.05, 0)), 22, 0.2, 60000);
          const dw = bee.parts.drop.getWorldPosition(new THREE.Vector3());
          O.label('evapL', dw, 'nektar koyulaşıyor', { latin: 'su, uçarken buharlaşıyor', dir: [110, 80], op: env(lt, 0.6, 1.4, d - 0.5, d), ink: 'wax' });
        }],
      ], ch.dur);
    },

    // 6 · the way home: a winding way out, a straight line back; distance measured by the eye
    donus(u, ch, S) {
      seq(u, [
        [0, (lt, d, uu) => {
          X.useSet('map');
          S.look = X.tod(TOD.noon);
          const m = meadowAt(), mid = m.clone().multiplyScalar(0.5);
          const k = ease(clamp(uu / (cue(ch, 'eye') - 0.2)));
          X.cam(V(mid.x + 100, lerp(4300, 3900, k), mid.z + 1100), mid.clone().add(V(0, 0, 60)), 30, 50, 20000);
          const tOut = smooth(0.2, cue(ch, 'straight') - 0.2, uu);
          const pts = [];
          const N = 90;
          for (let i = 0; i <= N * tOut; i++) pts.push(outPath(i / N));
          const ds = pts.map(p => O.project(p)).filter(Boolean).map((s, i) => (i ? 'L' : 'M') + s[0].toFixed(1) + ',' + s[1].toFixed(1)).join('');
          O.path('outbound', ds, { op: 0.9, dash: '3 5' });
          const cur = pts[pts.length - 1] || outPath(0);
          const cs = O.project(cur), ns = O.project(V(0, 0, 0)), ms = O.project(m);
          if (cs) O.circle('beeDot', cs[0], cs[1], 4.5 * O.k, { cls: 'diag fill', ink: 'wax' });
          // path integration: the home vector, updated at every step
          const integ = smooth(cue(ch, 'integrate'), cue(ch, 'integrate') + 0.6, uu) * (1 - smooth(cue(ch, 'straight'), cue(ch, 'straight') + 0.5, uu) * 0);
          if (cs && ns) O.path('homeVec', `M${cs[0]},${cs[1]} L${ns[0]},${ns[1]}`, { op: integ * 0.9, ink: 'uv', dash: '6 5' });
          const back = smooth(cue(ch, 'straight'), cue(ch, 'straight') + 1.8, uu);
          if (ms && ns && back > 0) {
            const e = [lerp(ms[0], ns[0], back), lerp(ms[1], ns[1], back)];
            O.path('homeLine', `M${ms[0]},${ms[1]} L${e[0]},${e[1]}`, { cls: 'diag thick', ink: 'uv', op: 1 });
            const ar = smooth(cue(ch, 'arrow'), cue(ch, 'arrow') + 0.5, uu);
            if (ar > 0) { const ang = Math.atan2(ns[1] - ms[1], ns[0] - ms[0]), L = 18 * O.k; O.path('homeHead', `M${ns[0] - Math.cos(ang - 0.4) * L},${ns[1] - Math.sin(ang - 0.4) * L} L${ns[0]},${ns[1]} L${ns[0] - Math.cos(ang + 0.4) * L},${ns[1] - Math.sin(ang + 0.4) * L}`, { cls: 'diag thick', ink: 'uv', op: ar }); }
          }
          if (ns) O.label('nestL', V(0, 0, 0), 'kovuk', { latin: 'ıhlamur', dir: [70, -60], op: smooth(0.3, 1, uu) });
          if (ms) O.label('meadowL', m, 'çayır', { latin: '≈ 1,5 km', dir: [-90, 60], op: smooth(0.3, 1, uu) });
          O.text('integT', O.W * 0.06, O.H * 0.2, 'her dönüşü, her mesafeyi topluyor', { op: env(uu, cue(ch, 'integrate') + 0.4, cue(ch, 'integrate') + 1.2, cue(ch, 'eye') - 0.6, cue(ch, 'eye')), size: 18 });
        }],
        [cue(ch, 'eye'), (lt, d, uu) => {
          // low over the meadow: the ground streams through her eyes
          X.useSet('meadow');
          S.look = X.tod(TOD.noon);
          const x = -400 + lt * 520;
          const p = V(x, 60, -300);
          put({ mode: 'fly', t: u, pos: p, yaw: 0, pitch: 0.08, pollen: 1 });
          X.cam(p.clone().add(V(-3, 2.2, 13)), p.clone().add(V(1.5, -1.2, 0)), 30, 0.5);
          G.uCloudSh.value = 0.5; flyShadow(p, 8);
          const flow = env(uu, cue(ch, 'flow') - 0.2, cue(ch, 'flow') + 0.6, ch.cues.tunnel - 0.8, ch.cues.tunnel - 0.4);
          for (let i = 0; i < 7; i++) {
            const y = O.H * (0.68 + i * 0.035), ph = ((lt * (1.2 + i * 0.25) + i * 0.37) % 1);
            const x0 = O.W * (1.05 - ph * 1.3), len = O.W * 0.12 * (1 + i * 0.1);
            O.path('flow' + i, `M${x0},${y} L${x0 + len},${y}`, { op: flow * 0.7, ink: 'uv' });
          }
          O.text('flowT', O.W * 0.06, O.H * 0.2, 'akan görüntü = kat edilen yol', { op: flow, size: 19, ink: 'uv' });
        }],
        [cue(ch, 'tunnel'), (lt, d, uu) => {
          // the corridor that fooled her
          X.useSet('tunnel');
          S.look = X.tod(TOD.noon);
          G.uCloudSh.value = 0.5;
          const T = sets.tunnel.userData;
          const x = 20 + lt / d * (T.L - 60);
          const p = V(x, T.y0 + T.H * 0.55, 0);
          put({ mode: 'fly', t: u, pos: p, yaw: 0, pitch: 0.06 });
          X.cam(V(x - 20, T.y0 + T.H + 30, 16), p.clone().add(V(9, -2, 0)), 34, 0.5);
          Object.assign(S.look, { fg: 0.7, fgT: u, fgSeed: 6 });
          const op = env(lt, 0.8, 1.5, d - 0.5, d);
          O.text('tunT', O.W * 0.06, O.H * 0.16, 'dar, desenli bir tünel', { op, size: 19 });
          const k = O.k, x0 = O.W * 0.06, y0 = O.H * 0.24;
          const g = smooth(1.5, 3.5, lt);
          O.path('barReal', `M${x0},${y0} L${x0 + 60 * k},${y0}`, { cls: 'diag thick', op: op * g });
          O.text('barRealT', x0 + 70 * k, y0 + 5 * k, 'gerçek yol', { op: op * g, size: 15, cls: 'latin' });
          O.path('barTold', `M${x0},${y0 + 30 * k} L${x0 + 60 * k + 360 * k * smooth(2.5, 5, lt)},${y0 + 30 * k}`, { cls: 'diag thick', ink: 'uv', op: op * g });
          O.text('barToldT', x0 + (70 + 360 * smooth(2.5, 5, lt)) * k, y0 + 35 * k, 'dansında bildirdiği', { op: op * g, size: 15, cls: 'latin', ink: 'uv' });
        }],
        [cue(ch, 'tell'), (lt, d) => {
          // home: she lands on the lip at noon
          X.useSet('tree');
          S.look = X.tod(TOD.noon);
          const k = easeOut(clamp(lt / 2.6));
          const p = holeLip(1.5).add(V((1 - k) * 22, 0.3 + (1 - k) * 12, (1 - k) * 18));
          put({ mode: k < 1 ? 'fly' : 'walk', plane: LIP, t: u, pos: k < 1 ? p : holeLip(1.5 - (lt - 2.6) * 1.2).add(V(0, 0.3, 0)), yaw: Math.PI, pollen: 1, stride: lt * 4, wing: k < 1 ? 'blur' : 'fold' });
          if (k >= 1) shadowAt(holeLip(1.5 - (lt - 2.6) * 1.2), Math.PI, 0.4);
          X.cam(V(TRUNK_R + 17, HOLE_FLOOR + 3.5, 19), V(TRUNK_R + 3, HOLE_FLOOR + 1.6, 0), 24, 0.3, 30000);
        }],
      ], ch.dur);
    },

    // 7 · inside: warmth, wax, and no light at all
    kovan(u, ch, S) {
      const hv = sets.hive.userData;
      seq(u, [
        [0, (lt, d, uu) => {
          X.useSet('hive');
          S.look = X.tod(TOD.hive);
          hv.mat.uniforms.uFocus.value.set(0, -5, 0); hv.mat.uniforms.uFocusR.value = 16; hv.mat.uniforms.uSense.value = 0.55;
          hv.crowdAt(u, { n: hv.maxCrowd });
          const k = ease(lt / d);
          X.cam(V(lerp(-6, -3, k), lerp(-2, -3, k), lerp(34, 26, k)), V(0, -5, 0), 30, 0.5, 400);
          hv.heat.position.set(0, -5, 0.6); hv.heat.scale.setScalar(16); hv.heat.material.uniforms.uAmt.value = 0.22 * smooth(cue(ch, 'warm') + 0.3, cue(ch, 'warm') + 1.5, uu);
          O.label('warmL', V(4, -2, 0.5), 'yavru alanı', { latin: '≈ 35 °C', dir: [120, -90], op: env(uu, cue(ch, 'warm') + 0.6, cue(ch, 'warm') + 1.4, cue(ch, 'heater') - 0.4, cue(ch, 'heater')), ink: 'wax' });
          S.look.fade = 1 - smooth(0, 1.2, u);
        }],
        [cue(ch, 'heater'), (lt, d) => {
          X.useSet('hive');
          S.look = X.tod(TOD.hive);
          const at = V(-2.1, -6.2, 0);
          hv.mat.uniforms.uFocus.value.copy(at); hv.mat.uniforms.uFocusR.value = 5; hv.mat.uniforms.uSense.value = 0.55;
          hv.crowdAt(u, { clear: { x: at.x, y: at.y, r: 1.4 }, n: 140 });
          const q = new THREE.Quaternion().setFromRotationMatrix(hv.onComb(0, 0, 1.2));
          put({ mode: 'stand', t: u * 0.3, pos: at.clone().add(V(0, 0, 0.32)), quat: q, ant: 0.3 });
          const pulse = 0.6 + 0.4 * Math.sin(lt * 5.2);
          const tw = bee.parts.thorax.getWorldPosition(new THREE.Vector3());
          hv.heat.position.copy(tw).add(V(0, 0, 0.3)); hv.heat.scale.setScalar(1.3); hv.heat.material.uniforms.uAmt.value = 0.9 * pulse * smooth(0.4, 1.4, lt);
          X.cam(at.clone().add(V(1.2, -1.6, 4.2)), at.clone().add(V(0, 0.1, 0)), 28, 0.2, 400);
          O.label('heatL', tw, 'ısıtıcı arı', { latin: 'kanatlar durur, uçuş kasları titrer', dir: [120, -100], op: env(lt, 0.8, 1.6, d - 0.6, d), ink: 'wax' });
        }],
        [cue(ch, 'comb'), (lt, d, uu) => {
          X.useSet('hive');
          S.look = X.tod(TOD.hive);
          hv.heat.material.uniforms.uAmt.value = 0;
          const sense = lerp(0.55, 0.12, smooth(cue(ch, 'nolight'), cue(ch, 'nolight') + 2.5, uu));
          hv.mat.uniforms.uFocus.value.set(3, 2, 0); hv.mat.uniforms.uFocusR.value = lerp(24, 9, smooth(cue(ch, 'hex'), cue(ch, 'hex') + 1.5, uu)); hv.mat.uniforms.uSense.value = sense;
          hv.crowdAt(u, { n: hv.maxCrowd });
          const kz = smooth(cue(ch, 'hex') - 0.4, cue(ch, 'hex') + 1.6, uu) * (1 - smooth(cue(ch, 'nolight') - 0.5, cue(ch, 'nolight') + 1.5, uu));
          X.cam(V(lerp(0, 3.4, kz), lerp(0, 2.6, kz), lerp(62, 7, kz)), V(lerp(0, 3, kz), lerp(-2, 2, kz), 0), 32, 0.3, 500);
          // one cell outlined, and the claim
          const c = V(3 + 0.27, 2 + 0.156, 0.02);
          const hexOp = env(uu, cue(ch, 'hex') + 1, cue(ch, 'hex') + 1.8, cue(ch, 'nolight') - 0.4, cue(ch, 'nolight'));
          if (hexOp > 0) {
            let dd = '';
            for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const s = O.project(c.clone().add(V(Math.cos(a) * CELL / Math.sqrt(3) * 1.0, Math.sin(a) * CELL / Math.sqrt(3), 0))); if (s) dd += (i ? 'L' : 'M') + s[0].toFixed(1) + ',' + s[1].toFixed(1); }
            O.path('hexOut', dd, { cls: 'diag thick', ink: 'wax', op: hexOp });
            O.label('hexL', c.clone().add(V(0.3, 0.2, 0)), 'altıgen', { latin: 'en az mumla en çok alan', dir: [130, -90], op: hexOp, ink: 'wax' });
          }
          O.text('waxT', O.W * 0.06, O.H * 0.2, '1 kg mum ≈ birkaç kg bal', { op: env(uu, cue(ch, 'wax') + 0.3, cue(ch, 'wax') + 1.1, cue(ch, 'nolight') - 0.3, cue(ch, 'nolight') + 0.2), size: 19, ink: 'wax' });
          // senses: faint rings here and there
          const sn = smooth(cue(ch, 'senses'), cue(ch, 'senses') + 1.5, uu);
          hv.rings.position.set(5, 3, 0.5); hv.rings.scale.setScalar(1.2); hv.rings.material.uniforms.uAmt.value = sn * 0.6; hv.rings.material.uniforms.uPh.value = u;
        }],
      ], ch.dur);
    },

    // 8 · the dance in the dark
    dans(u, ch, S) {
      X.useSet('hive');
      S.look = X.tod(TOD.hive);
      const hv = sets.hive.userData;
      const t0 = cue(ch, 'eight');
      // slow motion from the "run" cue to the "gravity" cue (dance time runs at a third)
      const slowA = cue(ch, 'run'), slowB = cue(ch, 'gravity');
      const dT = u < slowA ? u : u < slowB ? slowA + (u - slowA) * 0.35 : slowA + (slowB - slowA) * 0.35 + (u - slowB);
      const slow = u >= slowA && u < slowB;
      const dz = danceAt(dT - t0, slow);
      const D = dz.pos;
      hv.mat.uniforms.uFocus.value.copy(DANCE_C); hv.mat.uniforms.uFocusR.value = 6; hv.mat.uniforms.uSense.value = 0.4;
      hv.crowdAt(u, { clear: { x: DANCE_C.x, y: DANCE_C.y, r: 2.4 }, extra: followers(dz, u), n: hv.maxCrowd });
      put({ mode: 'dance', t: dT, pos: D.clone().add(V(0, 0, 0.32)), plane: COMB, quat: new THREE.Quaternion().setFromRotationMatrix(hv.onComb(0, 0, dz.head)), wag: dz.wag, stride: dT * 9, ant: 0.7 });
      hv.rings.position.set(D.x, D.y, 0.5); hv.rings.scale.setScalar(1); hv.rings.material.uniforms.uAmt.value = dz.waggle * smooth(t0, t0 + 1, u); hv.rings.material.uniforms.uPh.value = dT * (slow ? 0.35 : 1);
      seq(u, [
        [0, (lt, d) => { X.cam(V(DANCE_C.x - 2, DANCE_C.y - 3, 17), DANCE_C.clone().add(V(0, 0.3, 0)), 30, 0.3, 300); O.label('vertL', V(DANCE_C.x - 5, DANCE_C.y + 3, 0), 'dikey petek', { dir: [-90, -70], op: env(lt, 0.8, 1.6, d - 0.4, d), ink: 'wax' }); }],
        [cue(ch, 'run'), (lt, d) => { X.cam(D.clone().add(V(-1.8, -2.4, 5.2)), D.clone().add(V(0, 0.2, 0)), 30, 0.2, 300); O.text('slowT', O.W * 0.06, O.H * 0.2, 'ağır çekim', { op: env(lt, 0.3, 0.9, d - 0.5, d), size: 16, cls: 'latin' }); }],
        [cue(ch, 'gravity'), () => { X.cam(V(DANCE_C.x, DANCE_C.y, 13), DANCE_C.clone(), 34, 0.3, 300); }],
      ], ch.dur);
      // the figure-eight trace
      const tr = env(u, t0 + 1.5, t0 + 3, cue(ch, 'run') - 0.3, cue(ch, 'run')) + env(u, cue(ch, 'gravity'), cue(ch, 'gravity') + 1, ch.dur - 1, ch.dur) * 0.6;
      if (tr > 0) {
        let dd = '';
        for (let i = 0; i <= 80; i++) { const s = O.project(danceAt(i / 80 * DANCE_CYCLE * 2).pos); if (s) dd += (i ? 'L' : 'M') + s[0].toFixed(1) + ',' + s[1].toFixed(1); }
        O.path('eight', dd, { op: tr * 0.8, ink: 'uv', dash: '3 5' });
      }
      // up = sun, and the angle
      const cs = O.project(DANCE_C);
      const gOp = env(u, cue(ch, 'gravity') + 0.3, cue(ch, 'gravity') + 1, ch.dur - 1, ch.dur);
      if (cs && gOp > 0) {
        const k = O.k, L = 150 * k;
        const upOp = smooth(cue(ch, 'up'), cue(ch, 'up') + 0.8, u);
        O.path('gravA', `M${cs[0] - L * 1.1},${cs[1] - L * 0.5} L${cs[0] - L * 1.1},${cs[1] + L * 0.6} M${cs[0] - L * 1.1 - 8 * k},${cs[1] + L * 0.6 - 12 * k} L${cs[0] - L * 1.1},${cs[1] + L * 0.6} L${cs[0] - L * 1.1 + 8 * k},${cs[1] + L * 0.6 - 12 * k}`, { op: gOp * (1 - upOp * 0.6) });
        O.text('gravT', cs[0] - L * 1.1 - 12 * k, cs[1] + L * 0.25, 'yerçekimi', { op: gOp * (1 - upOp * 0.6), anchor: 'end', size: 16 });
        O.path('upLine', `M${cs[0]},${cs[1]} L${cs[0]},${cs[1] - L}`, { op: gOp * upOp, cls: 'diag thick' });
        O.circle('sunIcon', cs[0], cs[1] - L - 16 * k, 9 * k, { op: gOp * upOp, cls: 'diag thick', ink: 'wax' });
        O.text('upT', cs[0] + 18 * k, cs[1] - L - 10 * k, 'yukarı = güneş', { op: gOp * upOp, size: 17, ink: 'wax' });
        const aOp = smooth(cue(ch, 'angle'), cue(ch, 'angle') + 0.8, u);
        if (aOp > 0) {
          const phi = DANCE_PHI;
          O.path('runLine', `M${cs[0]},${cs[1]} L${cs[0] + Math.sin(phi) * L},${cs[1] - Math.cos(phi) * L}`, { op: gOp * aOp, cls: 'diag thick', ink: 'uv' });
          const pts = []; for (let i = 0; i <= 20; i++) { const a = phi * i / 20; pts.push(`${(cs[0] + Math.sin(a) * L * 0.55).toFixed(1)},${(cs[1] - Math.cos(a) * L * 0.55).toFixed(1)}`); }
          O.path('angArc', 'M' + pts.join('L'), { op: gOp * aOp, ink: 'uv' });
          O.text('angT', cs[0] + Math.sin(phi / 2) * L * 0.72, cs[1] - Math.cos(phi / 2) * L * 0.72, '40°', { op: gOp * aOp, size: 20, anchor: 'middle', ink: 'uv', cls: 'num' });
          // outside, seen from above: the same angle between the sun and the flowers
          const ix = O.portrait ? O.W * 0.5 : O.W * 0.82, iy = O.H * (O.portrait ? 0.2 : 0.26), R = 78 * k;
          O.circle('inset', ix, iy, R, { op: gOp * aOp * 0.8 });
          O.text('insetT', ix, iy + R + 24 * k, 'dışarıda', { op: gOp * aOp, anchor: 'middle', size: 15, cls: 'latin' });
          O.circle('insetSun', ix, iy - R * 0.8, 8 * k, { op: gOp * aOp, cls: 'diag thick', ink: 'wax' });
          O.path('insetRun', `M${ix},${iy} L${ix + Math.sin(phi) * R * 0.85},${iy - Math.cos(phi) * R * 0.85}`, { op: gOp * aOp, cls: 'diag thick', ink: 'uv' });
          O.path('insetSunL', `M${ix},${iy} L${ix},${iy - R * 0.68}`, { op: gOp * aOp, dash: '3 4' });
          O.text('insetFl', ix + Math.sin(phi) * R * 1.05 + 6 * k, iy - Math.cos(phi) * R * 1.05, 'çiçekler', { op: gOp * aOp, size: 14 });
        }
        const dOp = smooth(cue(ch, 'duration'), cue(ch, 'duration') + 0.6, u);
        if (dOp > 0) {
          const secs = dz.waggle > 0.5 ? dz.runT : DANCE_RUN;
          O.text('durT', O.W * 0.06, O.H * 0.2, `sallanım: ${secs.toFixed(1).replace('.', ',')} sn`, { op: dOp, size: 22, cls: 'num', ink: 'uv' });
          O.text('kmT', O.W * 0.06, O.H * 0.2 + 30 * k, 'her saniye ≈ 1 km (kabaca)', { op: smooth(cue(ch, 'km'), cue(ch, 'km') + 0.6, u) * dOp, size: 16, cls: 'latin' });
        }
      }
    },

    // 9 · reading the dance: touch, sound, taste; then the proof by radar
    okumak(u, ch, S) {
      const hv = sets.hive.userData;
      seq(u, [
        [0, (lt, d, uu) => {
          X.useSet('hive');
          S.look = X.tod(TOD.hive);
          const dT = uu + 60;
          const dz = danceAt(dT);
          hv.mat.uniforms.uFocus.value.copy(dz.pos); hv.mat.uniforms.uFocusR.value = 4; hv.mat.uniforms.uSense.value = 0.45;
          const taste = env(uu, cue(ch, 'taste'), cue(ch, 'taste') + 0.5, cue(ch, 'frisch') - 0.5, cue(ch, 'frisch'));
          hv.crowdAt(u, { clear: { x: DANCE_C.x, y: DANCE_C.y, r: 2.4 }, extra: followers(dz, u), n: hv.maxCrowd });
          put({ mode: 'dance', t: dT, pos: dz.pos.clone().add(V(0, 0, 0.32)), plane: COMB, quat: new THREE.Quaternion().setFromRotationMatrix(hv.onComb(0, 0, dz.head)), wag: dz.wag * (1 - taste), stride: dT * 9, ant: 0.7, drop: taste * 0.8 });
          hv.rings.position.set(dz.pos.x, dz.pos.y, 0.5); hv.rings.material.uniforms.uAmt.value = dz.waggle * (1 - taste); hv.rings.material.uniforms.uPh.value = dT;
          X.cam(dz.pos.clone().add(V(-1.5, -2.2, 5.6)), dz.pos.clone().add(V(0, 0.2, 0)), 30, 0.2, 300);
          O.label('humL', dz.pos.clone().add(V(-0.5, 0.2, 0.5)), '≈ 250 Hz vızıltı', { latin: 'antenle dokunuş · petekte titreşim', dir: [-140, -100], op: env(uu, cue(ch, 'touch') + 0.3, cue(ch, 'touch') + 1.1, cue(ch, 'taste') - 0.3, cue(ch, 'taste')), ink: 'uv' });
          O.label('tasteL', bee.parts.drop.getWorldPosition(new THREE.Vector3()), 'çiçeğin kokusu', { latin: 'ağızdan ağıza bir damla', dir: [130, -80], op: taste, ink: 'wax' });
        }],
        [cue(ch, 'frisch'), (lt, d, uu) => {
          X.useSet('hive');
          S.look = X.tod(TOD.hive);
          const dT = uu + 60;
          const dz = danceAt(dT);
          hv.mat.uniforms.uFocus.value.copy(DANCE_C); hv.mat.uniforms.uFocusR.value = 7; hv.mat.uniforms.uSense.value = 0.3;
          hv.crowdAt(u, { clear: { x: DANCE_C.x, y: DANCE_C.y, r: 2.4 }, extra: followers(dz, u), n: hv.maxCrowd });
          put({ mode: 'dance', t: dT, pos: dz.pos.clone().add(V(0, 0, 0.32)), plane: COMB, quat: new THREE.Quaternion().setFromRotationMatrix(hv.onComb(0, 0, dz.head)), wag: dz.wag, stride: dT * 9 });
          hv.rings.position.set(dz.pos.x, dz.pos.y, 0.5); hv.rings.material.uniforms.uAmt.value = dz.waggle * 0.7; hv.rings.material.uniforms.uPh.value = dT;
          X.cam(V(DANCE_C.x + 3, DANCE_C.y - 1, 20), DANCE_C.clone().add(V(2, 0, 0)), 30, 0.3, 300);
          const op = env(lt, 0.4, 1.2, d - 0.6, d);
          O.title('Karl von Frisch', 'Nobel 1973 · Lorenz ve Tinbergen ile', op, {});
          O.text('doubtT', O.W * 0.06, O.H * 0.2, 'koku mu, dans mı?', { op: env(uu, cue(ch, 'doubt') + 0.2, cue(ch, 'doubt') + 1, d + cue(ch, 'frisch') - 0.5, d + cue(ch, 'frisch')), size: 24, cls: 'ttl' });
          S.noTitle = true;
        }],
        [cue(ch, 'radar'), (lt, d, uu) => {
          X.useSet('map');
          S.look = X.tod(TOD.noon);
          const m = meadowAt(), mid = m.clone().multiplyScalar(0.5);
          X.cam(V(mid.x + 60, 3700, mid.z + 1000), mid.clone().add(V(0, 0, 60)), 30, 50, 20000);
          const ns = O.project(V(0, 0, 0)), ms = O.project(m);
          if (ns) O.label('nestL2', V(0, 0, 0), 'kovuk', { latin: 'radar', dir: [70, -60], op: 1 });
          if (ms) O.label('meadowL2', m, 'çayır', { latin: 'hiç görmedikleri yer', dir: [-90, 60], op: 1 });
          const windOp = smooth(cue(ch, 'wind') - 0.3, cue(ch, 'wind') + 0.8, uu);
          // recruits' tracks: pushed sideways by a west wind, then corrected
          for (let r = 0; r < 5; r++) {
            const start = r * 0.9;
            const prog = clamp((lt - start) / 5.5);
            if (prog <= 0) continue;
            let dd = '';
            for (let i = 0; i <= 50 * prog; i++) {
              const s = i / 50;
              const drift = Math.sin(Math.PI * s) * (60 + r * 22) * (1 - s * 0.7);
              const perp = V(-m.z, 0, m.x).normalize();
              const p = m.clone().multiplyScalar(s).add(perp.multiplyScalar(drift + (r - 2) * 18 * s));
              const sp = O.project(p); if (sp) dd += (dd ? 'L' : 'M') + sp[0].toFixed(1) + ',' + sp[1].toFixed(1);
            }
            O.path('track' + r, dd, { op: 0.85, ink: 'uv' });
          }
          for (let i = 0; i < 4; i++) {
            const y = O.H * (0.3 + i * 0.12), x0 = O.W * 0.1 + ((lt * 60 + i * 90) % (O.W * 0.18));
            O.path('wind' + i, `M${x0},${y} L${x0 + 60 * O.k},${y} M${x0 + 50 * O.k},${y - 6 * O.k} L${x0 + 60 * O.k},${y} L${x0 + 50 * O.k},${y + 6 * O.k}`, { op: windOp * 0.8 });
          }
          O.text('windT', O.W * 0.1, O.H * 0.26, 'yan rüzgâr', { op: windOp, size: 16, cls: 'latin' });
          O.text('radarT', O.W * 0.06, O.H * 0.16, 'radar izleri, 2005', { op: env(lt, 0.4, 1.2, d - 0.5, d), size: 19 });
        }],
      ], ch.dur);
    },

    // 10 · nectar becomes honey
    bal(u, ch, S) {
      seq(u, [
        [0, (lt, d, uu) => {
          X.useSet('hive');
          S.look = X.tod(TOD.hive);
          const hv = sets.hive.userData;
          const at = V(9, 7, 0);
          hv.mat.uniforms.uFocus.value.copy(at); hv.mat.uniforms.uFocusR.value = 4; hv.mat.uniforms.uSense.value = 0.55;
          hv.crowdAt(u, { clear: { x: at.x, y: at.y, r: 2 }, n: 160 });
          hv.rings.material.uniforms.uAmt.value = 0;
          const q1 = new THREE.Quaternion().setFromRotationMatrix(hv.onComb(0, 0, 0)), q2 = new THREE.Quaternion().setFromRotationMatrix(hv.onComb(0, 0, Math.PI));
          const pass = env(uu, 0.3, 1, cue(ch, 'bubble') - 0.2, cue(ch, 'bubble') + 0.2);
          put({ mode: 'stand', t: u, pos: at.clone().add(V(-0.72, 0, 0.32)), quat: q1, ant: 0.5, drop: pass * 0.8, pollen: 1 });
          X.bee2.root.visible = true;
          const bub = smooth(cue(ch, 'bubble'), cue(ch, 'bubble') + 0.5, uu);
          X.bee2.pose({ mode: 'stand', plane: COMB, t: u + 3, pos: at.clone().add(V(0.72, 0, 0.32)), quat: q2, ant: 0.5, drop: bub * (0.55 + 0.45 * Math.sin(lt * 2.4)), prob: 0.25 * pass });
          X.bee2.root.updateMatrixWorld(true);
          X.cam(at.clone().add(V(0.2, -1.6, 4.6)), at.clone().add(V(0, 0.1, 0)), 28, 0.2, 300);
          O.label('passL', at.clone().add(V(0, -0.2, 0.4)), 'ağızdan ağıza', { latin: 'toplayıcıdan alıcıya', dir: [-130, 90], op: env(uu, 0.6, 1.4, cue(ch, 'bubble') - 0.3, cue(ch, 'bubble')), ink: 'wax' });
          O.label('enzL', X.bee2.parts.drop.getWorldPosition(new THREE.Vector3()), 'invertaz · glukoz oksidaz', { latin: 'şekeri parçalar, asit üretir', dir: [110, -100], op: env(uu, cue(ch, 'enzyme') + 0.3, cue(ch, 'enzyme') + 1.1, cue(ch, 'spread') - 0.4, cue(ch, 'spread')), ink: 'wax' });
        }],
        [cue(ch, 'spread'), (lt, d, uu) => {
          X.useSet('cell');
          S.look = X.tod(TOD.hive);
          const cs = sets.cell.userData;
          const dry = smooth(cue(ch, 'water'), cue(ch, 'cap') + 0.5, uu);
          cs.nectar.position.set(0, 0, -cs.depth + lerp(0.12, 0.7, smooth(0.2, 2.5, lt)));
          cs.nectar.material.uniforms.uThick.value = dry;
          const capK = smooth(cue(ch, 'cap'), cue(ch, 'cap') + 2.2, uu);
          cs.cap.visible = capK > 0.01; cs.cap.scale.setScalar(Math.max(0.01, capK));
          const back = smooth(cue(ch, 'honey'), cue(ch, 'honey') + 1.5, uu);
          for (const c of [...cs.caps, cs.cap]) c.material.uniforms.uBack.value = back * (0.6 + 0.4 * ((c.userData.i ?? 0) % 3) / 2);
          cs.caps.forEach((c, i) => { const k2 = smooth(cue(ch, 'cap') + 0.8 + (i % 7) * 0.25, cue(ch, 'cap') + 1.6 + (i % 7) * 0.25, uu); c.visible = k2 > 0.01; c.scale.setScalar(Math.max(0.01, k2)); });
          cs.wallMat.uniforms.uGlow.value = 1 + back * 0.6;
          const k = ease(lt / d);
          X.cam(V(lerp(0.9, 0.5, k), lerp(-1.6, -1.2, k), lerp(2.2, 1.6, k)), V(0, 0, -0.45), 34, 0.05, 50);
          // fanners at the rim
          const fan = smooth(cue(ch, 'fan') - 0.2, cue(ch, 'fan') + 0.5, uu) * (1 - smooth(cue(ch, 'cap') - 0.3, cue(ch, 'cap') + 0.3, uu));
          if (fan > 0) {
            put({ mode: 'stand', t: u, pos: V(-0.2, 1.05, 0.32), plane: COMB, quat: new THREE.Quaternion().setFromRotationMatrix(sets.hive.userData.onComb(0, 0, -1.6)), wing: 'blur', ant: 0.3 });
            for (let i = 0; i < 4; i++) {
              const s = O.project(V(-0.5 + i * 0.25, 0.9 - ((lt * 0.8 + i * 0.3) % 1) * 1.2, 0.3));
              if (s) O.path('air' + i, `M${s[0]},${s[1]} l${10 * O.k},${22 * O.k}`, { op: fan * 0.7, dash: '3 5' });
            }
            O.text('fanT', O.W * 0.06, O.H * 0.2, 'kanat çırpan arılar hava akıtıyor', { op: fan, size: 17 });
          }
          // water gauge
          const gOp = env(uu, cue(ch, 'water'), cue(ch, 'water') + 0.6, ch.dur - 1.2, ch.dur - 0.5);
          if (gOp > 0) {
            const k2 = O.k, x0 = O.W * (O.portrait ? 0.1 : 0.62), y0 = O.H * 0.16, W = O.W * (O.portrait ? 0.8 : 0.32);
            const px = v => x0 + W * (1 - v / 100);
            O.path('gBar', `M${x0},${y0} L${x0 + W},${y0}`, { op: gOp });
            const marks = [[75, 'çiçekte'], [36, 'kovana varışta'], [18, 'bal']];
            marks.forEach(([v, lab], i) => {
              O.path('gTick' + i, `M${px(v)},${y0 - 6 * k2} L${px(v)},${y0 + 6 * k2}`, { op: gOp });
              O.text('gLab' + i, px(v), y0 + 24 * k2, `%${v} · ${lab}`, { op: gOp * 0.9, anchor: 'middle', size: 13, cls: 'latin' });
            });
            const cur = lerp(36, 18, dry);
            O.circle('gDot', px(cur), y0, 6 * k2, { op: gOp, cls: 'diag fill', ink: 'wax' });
            O.text('gTitle', x0, y0 - 16 * k2, 'su oranı', { op: gOp, size: 15 });
          }
          O.label('honeyL', V(0.47, 0.27, 0.02), 'bal', { latin: 'mumla sırlanmış', dir: [120, -80], op: smooth(cue(ch, 'honey') + 0.5, cue(ch, 'honey') + 1.3, uu), ink: 'wax' });
          S.noTitle = S.noTitle;
        }],
      ], ch.dur);
    },

    // 11 · night: sleep, and a language that outlives her
    gece(u, ch, S) {
      seq(u, [
        [0, (lt, d, uu) => {
          X.useSet('tree');
          S.look = X.tod(mixTOD(TOD.dusk, TOD.night, smooth(2, d, lt) * 0.35));
          const k = clamp(lt / 5);
          const p = holeLip(1.5).add(V(lerp(260, 0, easeOut(k)), 0.3 + lerp(90, 0, easeOut(k)), lerp(180, 0, easeOut(k))));
          if (k < 1) put({ mode: 'fly', t: u, pos: p, yaw: Math.PI + 0.6, pollen: 0.8 });
          X.cam(V(TRUNK_R + 420, 120, 460), V(0, 215, 0), 26);
          const tOp = env(uu, cue(ch, 'trips') + 0.2, cue(ch, 'trips') + 1, cue(ch, 'sleep') - 0.4, cue(ch, 'sleep'));
          if (tOp > 0) {
            for (let i = 0; i < 10; i++) { const x = O.W * 0.06 + i * 16 * O.k, y = O.H * 0.2; O.path('trip' + i, `M${x},${y} L${x},${y - 22 * O.k}`, { op: tOp * smooth(i * 0.12, i * 0.12 + 0.2, uu - cue(ch, 'trips')), cls: 'diag thick', ink: 'wax' }); }
            O.text('tripT', O.W * 0.06, O.H * 0.2 + 26 * O.k, 'bugün ≈ 10 sefer', { op: tOp, size: 16, cls: 'latin' });
          }
          S.look.fade = 0;
        }],
        [cue(ch, 'sleep'), (lt, d, uu) => {
          X.useSet('hive');
          S.look = X.tod({ ...TOD.hive, expo: 1.0 });
          const hv = sets.hive.userData;
          const at = V(-24, 12, 0);
          hv.mat.uniforms.uFocus.value.copy(at); hv.mat.uniforms.uFocusR.value = 4.5; hv.mat.uniforms.uSense.value = 0.3;
          hv.crowdAt(u * 0.15, { clear: { x: at.x, y: at.y, r: 1.5 }, n: 120 });
          hv.rings.material.uniforms.uAmt.value = 0; hv.heat.material.uniforms.uAmt.value = 0;
          const droop = smooth(cue(ch, 'droop'), cue(ch, 'droop') + 3, uu);
          put({ mode: droop > 0.5 ? 'sleep' : 'stand', t: u * (1 - droop * 0.9), pos: at.clone().add(V(0, 0, 0.3)), plane: COMB, quat: new THREE.Quaternion().setFromRotationMatrix(hv.onComb(0, 0, -2.2)), droop, ant: 1 - droop });
          const zoom = smooth(cue(ch, 'days') - 0.5, cue(ch, 'days') + 2, uu);
          X.cam(at.clone().add(V(lerp(2, 1.2, zoom), lerp(-2.4, -1.4, zoom), lerp(5.5, 3.2, zoom))), at.clone().add(V(0, 0.1, 0)), 28, 0.2, 300);
          O.label('sleepL', headW(), 'uyku', { latin: 'antenler sarkık, kaslar gevşek', dir: [120, -90], op: env(uu, cue(ch, 'droop') + 1, cue(ch, 'droop') + 1.8, cue(ch, 'insomnia') - 0.3, cue(ch, 'insomnia')) });
          // sleepy dances scatter more (angle spread of waggle runs)
          const iOp = env(uu, cue(ch, 'insomnia') + 0.3, cue(ch, 'insomnia') + 1.1, cue(ch, 'half') - 0.3, cue(ch, 'half'));
          if (iOp > 0) {
            const k = O.k;
            [[13.8, 'uyumuş', 0.33], [16.5, 'uykusuz', 0.67]].forEach(([sd, lab, fx], j) => {
              const cx = O.W * (O.portrait ? fx : 0.62 + (fx - 0.33) * 0.45), cy = O.H * 0.3, L = 80 * k;
              let dd = '';
              for (let i = -6; i <= 6; i++) { const a = (i / 3) * sd * Math.PI / 180; dd += `M${cx},${cy} L${cx + Math.sin(a) * L},${cy - Math.cos(a) * L}`; }
              O.path('fan' + j, dd, { op: iOp * 0.8, ink: 'uv' });
              O.text('fanT' + j, cx, cy + 24 * k, lab, { op: iOp, anchor: 'middle', size: 15 });
            });
            O.text('fanH', O.W * (O.portrait ? 0.5 : 0.73), O.H * 0.3 - 104 * O.k, 'dans açılarının dağılımı', { op: iOp, anchor: 'middle', size: 14, cls: 'latin' });
          }
          // a lifetime of honey: a teaspoon and a drop
          const sOp = env(uu, cue(ch, 'half') + 0.3, cue(ch, 'half') + 1.1, cue(ch, 'days') - 0.2, cue(ch, 'days') + 0.4);
          if (sOp > 0) {
            const k = O.k, cx = O.W * (O.portrait ? 0.5 : 0.7), cy = O.H * 0.3;
            O.path('spoon', `M${cx - 150 * k},${cy} C${cx - 110 * k},${cy - 8 * k} ${cx - 60 * k},${cy - 10 * k} ${cx - 30 * k},${cy - 6 * k} C${cx - 10 * k},${cy - 36 * k} ${cx + 70 * k},${cy - 36 * k} ${cx + 80 * k},${cy} C${cx + 70 * k},${cy + 36 * k} ${cx - 10 * k},${cy + 36 * k} ${cx - 30 * k},${cy + 6 * k} C${cx - 60 * k},${cy + 10 * k} ${cx - 110 * k},${cy + 8 * k} ${cx - 150 * k},${cy}`, { op: sOp });
            O.circle('spoonDrop', cx + 26 * k, cy, 5 * k, { op: sOp, cls: 'diag fill', ink: 'wax' });
            O.text('spoonT', cx + 26 * k, cy + 58 * k, 'bir ömür: ≈ 0,5 g bal', { op: sOp, anchor: 'middle', size: 17, ink: 'wax' });
          }
        }],
        [cue(ch, 'tomorrow'), (lt, d) => {
          // the linden under the stars; where the sun will rise, a faint violet line
          X.useSet('tree');
          S.look = X.tod(TOD.night);
          const k = ease(clamp(lt / d));
          X.cam(V(lerp(700, 1150, k), lerp(70, 90, k), lerp(560, 900, k)), V(-100, 230, -200), 30);
          const sr = O.project(V(-4000, 0, -9000));
          const hz = O.H * 0.63;
          O.path('dawnLine', `M${O.W * 0.55},${hz} L${O.W * 0.95},${hz}`, { op: 0.5 * smooth(1, 4, lt), ink: 'uv' });
          { const out = 1 - smooth(d - 0.8, d, lt); O.title('Bal Arısının Bir Günü', 'Apis mellifera', smooth(d - 4.6, d - 3.6, lt) * out, { big: true, band: smooth(d - 5.2, d - 4.4, lt) * out }); }
          S.look.fade = smooth(d - 1, d, lt);
          S.noTitle = true;
        }],
      ], ch.dur);
    },

    _fallback(u, ch, S) {
      X.useSet('tree');
      S.look = X.tod(TOD.day);
      X.cam(V(900, 120, 500), V(0, 220, -30), 24);
    },
  };
}
