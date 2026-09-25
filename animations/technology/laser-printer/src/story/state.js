// Everything that moves is a pure function of story time T, so any moment can be shown directly.
import * as THREE from 'three';
import { clamp01, lerp, smooth, smoother, seg } from './timeline.js';
import { S_WAIT, LEAD_FINAL, SCAN, PAGE_L, pathPoint } from '../scene/layout.js';
import { basisQuat } from '../scene/sheet.js';
import { FEATURES } from '../page/content.js';

// ---- rigid sheet poses
const pose = (p, q) => ({ p: new THREE.Vector3(...p), q });
const trayCentre = pathPoint(LEAD_FINAL - PAGE_L / 2);
export const POSES = {
  tray: pose([trayCentre.x, trayCentre.y + 0.02, 0], basisQuat([0, 0, -1], [0, -1, 0], [-1, 0, 0])),
  pulled: pose([trayCentre.x + 27, trayCentre.y + 0.6, 0], basisQuat([0, 0, -1], [0, -1, 0], [-1, 0, 0])),
  reveal: (() => {
    const Y = new THREE.Vector3(0.06, 0.1, 1).normalize();
    const X = new THREE.Vector3(0, 1, 0).cross(Y).normalize();
    const Z = X.clone().cross(Y);
    return pose([40, 24, 16], basisQuat(X.toArray(), Y.toArray(), Z.toArray()));
  })(),
  aboveGlass: pose([-0.35, 47, 4], basisQuat([0, 0, 1], [0, -1, 0], [1, 0, 0])),
  glass: pose([SCAN.cornerX + PAGE_L / 2, SCAN.glassY + 0.02, SCAN.cornerZ + 10.5], basisQuat([0, 0, 1], [0, -1, 0], [1, 0, 0])),
  deskL: pose([-12.5, 0.06, 37.5], new THREE.Quaternion()),
  deskR: pose([12.5, 0.06, 37.5], new THREE.Quaternion()),
  row: [-50, -25, 0, 25, 50].map(x => pose([x, 0.06, 40], new THREE.Quaternion())),
};
POSES.lifted = pose([-0.35, 50, 16], POSES.glass.q.clone());

const _q = new THREE.Quaternion();
function blend(A, B, t, lift = 0, bow = 0) {
  const e = smoother(t);
  const p = A.p.clone().lerp(B.p, e);
  p.y += lift * Math.sin(Math.PI * e);
  _q.copy(A.q).slerp(B.q, e);
  return { p, q: _q.clone(), bow: bow * Math.sin(Math.PI * e) };
}
// walk a list of [u0, u1, poseA, poseB, lift, bow] segments
function poseTrack(u, steps) {
  let cur = { p: steps[0][2].p.clone(), q: steps[0][2].q.clone(), bow: 0 };
  for (const [a, b, A, B, lift = 0, bow = 0] of steps) {
    if (u < a) break;
    cur = blend(A, B, seg(u, a, b), lift, bow);
  }
  return cur;
}

export function makeState(tl) {
  const cu = (id, n) => tl.cueU(id, n);
  const LV1_BEFORE_OUT = 58;
  const LV1_END = LEAD_FINAL + 12;

  return function state(T) {
    const ph = id => tl.ph(id, T);
    const st = { T };
    const f = ph('feed'), ch = ph('charge'), la = ph('laser'), dv = ph('develop'), tr = ph('transfer'), cl = ph('clean'), fu = ph('fuse'), ou = ph('output');
    const sc = ph('scan'), cp = ph('copy'), cmp = ph('compare'), ge = ph('generations');
    const chap = tl.chapterAt(T);
    st.chapter = chap;

    // ---- job 1: the original in colour
    const outLand = cu('output', 1) * 0.92;
    const lv1 = 8 * smooth(seg(f, 0.35, 1)) + 5 * seg(ch, 0.08, 0.82) + 21 * smoother(seg(ch, 0.82, 1)) + 4 * la + 2.5 * dv + 3.5 * tr + 4 * cl + 10 * fu
      + (LV1_END - LV1_BEFORE_OUT) * smooth(seg(ou, 0, outLand));
    const feed1 = S_WAIT * smoother(seg(f, 0.04, 0.8));
    const lead1 = lv1 >= S_WAIT ? Math.min(lv1, LEAD_FINAL) : feed1;

    // ---- job 2: the black-and-white copy
    const lv2 = 16 * smooth(seg(cp, 0.02, 0.15)) + (LEAD_FINAL + 6 - 16) * smooth(seg(cp, 0.17, 0.95));
    const feed2 = S_WAIT * smoother(seg(cp, 0.0, 0.14));
    const lead2 = lv2 >= S_WAIT ? Math.min(lv2, LEAD_FINAL) : feed2;

    const job2 = T >= tl.byId.copy.start;
    st.job = job2 ? 2 : 1;
    st.lv = job2 ? lv2 : lv1;
    st.lvStart = job2 ? 0 : 8;
    st.drumTravel = job2 ? LV1_END + lv2 : lv1;
    st.mono = job2;
    st.drumActive = job2 ? [0, 0, 0, 1] : [1, 1, 1, 1];
    st.feedTravel = job2 ? lead2 : lead1;
    st.pickupAngle = 2 * Math.PI * (smooth(seg(f, 0.02, 0.35)) + smooth(seg(cp, 0.0, 0.08)));
    const unitOn = (T >= tl.byId.charge.start && T < tl.byId.output.end) || (cp > 0 && cp < 1);
    st.polygonAngle = unitOn ? T * 31 : 0;
    st.sweep = ((st.lv * 7) % 1 + 1) % 1;
    st.laserVis = unitOn ? 1 : 0;
    st.showCharges = Math.max(smooth(seg(ch, 0.25, 0.4)) * (1 - tl.ph('transfer', T)), 0);
    st.showLatent = (la > 0.15 ? 1 : smooth(seg(la, 0, 0.15))) * (1 - smooth(seg(tr, 0, 0.3)));
    st.fuserHeat = (T >= tl.byId.feed.start && T < tl.byId.scan.start) || (cp > 0 && cp < 1) ? 1 : 0.15;
    st.boardGlow = chap.id === 'raster' ? 0.55 + 0.35 * Math.sin(T * 6) : chap.id === 'send' ? 0.6 * seg(ph('send'), 0.85, 1) : cp > 0 && cp < 0.3 ? 0.5 : 0;

    // ---- scanner
    const scanA = cu('scan', 1) - 0.02, scanB = 0.9;
    const xsProg = seg(sc, scanA, scanB);
    const home = SCAN.x0 - 1.8;
    st.scanX = sc < scanA ? home : sc < scanB ? lerp(SCAN.x0, SCAN.x1, xsProg) : lerp(SCAN.x1, home, smooth(seg(sc, scanB, 1)));
    st.lampOn = sc > scanA - 0.015 && sc < scanB ? 1 : 0;
    st.scanLightVis = 1;
    st.leak = 1;
    st.scanProgress = xsProg;
    st.lidAngle = 72 * Math.PI / 180 * (smooth(seg(sc, 0.0, 0.05)) * (1 - smooth(seg(sc, 0.19, 0.25))) + smooth(seg(cmp, 0.0, 0.05)) * (1 - smooth(seg(cmp, 0.2, 0.27))));

    // ---- sheet 1 (original)
    const outA = cu('output', 1) - 0.06;
    let s1;
    if (T < tl.byId.output.start || ou < outA) s1 = { mode: 'path', lead: lead1 };
    else if (T < tl.byId.scan.start) s1 = { mode: 'pose', ...poseTrack(ou, [[outA, outA + 0.07, POSES.tray, POSES.pulled], [outA + 0.07, outA + 0.17, POSES.pulled, POSES.reveal, 6, 1.6]]) };
    else if (T < tl.byId.compare.start) s1 = { mode: 'pose', ...poseTrack(sc, [[0.015, 0.12, POSES.reveal, POSES.aboveGlass, 5, 1.8], [0.12, 0.18, POSES.aboveGlass, POSES.glass, 0, 0.8]]) };
    else if (T < tl.byId.generations.start) s1 = { mode: 'pose', ...poseTrack(cmp, [[0.03, 0.1, POSES.glass, POSES.lifted, 0, 0.8], [0.1, 0.2, POSES.lifted, POSES.deskL, 10, 2]]) };
    else s1 = { mode: 'pose', ...poseTrack(ge, [[0.0, 0.1, POSES.deskL, POSES.row[0], 6, 1]]) };
    s1.full = s1.mode === 'pose';
    s1.lead = s1.lead ?? LEAD_FINAL;
    s1.scanOn = st.lampOn;
    st.sheet1 = s1;

    // ---- sheet 2 (copy)
    let s2 = { mode: 'path', lead: lead2, visible: T >= tl.byId.copy.start };
    if (T >= tl.byId.compare.start && T < tl.byId.generations.start) s2 = { mode: 'pose', visible: true, ...poseTrack(cmp, [[0.07, 0.12, POSES.tray, POSES.pulled], [0.12, 0.22, POSES.pulled, POSES.deskR, 12, 2]]) };
    else if (T >= tl.byId.generations.start) s2 = { mode: 'pose', visible: true, ...poseTrack(ge, [[0.02, 0.12, POSES.deskR, POSES.row[1], 6, 1]]) };
    s2.full = s2.mode === 'pose';
    st.sheet2 = s2;

    // ---- later generations dropping onto the desk
    st.gens = [2, 4, 8].map((g, i) => {
      const a = 0.1 + i * 0.05, t = seg(ge, a, a + 0.1);
      const P = POSES.row[i + 2];
      const from = { p: P.p.clone().add(new THREE.Vector3(0, 30, -30)), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0.1)) };
      const b = blend(from, P, t, 0, 1.5);
      return { gen: g, visible: T >= tl.byId.generations.start && t > 0, ...b };
    });

    // ---- computer and data
    const se = ph('send');
    st.cursor = { x: lerp(0.3, 0.745, smooth(seg(se, 0.12, cu('send', 1) - 0.04))), y: lerp(0.7, 0.845, smooth(seg(se, 0.12, cu('send', 1) - 0.04))) };
    st.pressed = se > cu('send', 1) - 0.03 && se < cu('send', 1) + 0.04;
    st.printing = se > cu('send', 1) - 0.03 && se < 1;
    st.packets = se > 0 && se < 1 ? seg(se, cu('send', 1), 1) : 0;

    // ---- loupes (magnifier call-outs)
    st.loupes = loupesAt(T, tl, chap);
    return st;
  };
}

// which region to magnify, on which sheet, at each subtitle
function loupesAt(T, tl, chap) {
  const q = chap.cues.findIndex(c => T >= c.start - 0.2 && T < c.end + 0.35);
  const L = (sheet, feat, span, dx, dy, label, du = 0, dv = 0) => ({ sheet, u: FEATURES[feat].u + du, v: FEATURES[feat].v + dv, span, dx, dy, label });
  const reveal = tl.ph('output', T) > tl.cueU('output', 1) + 0.08;
  if (chap.id === 'output' && reveal) {
    if (q === 1) return [L('s1', 'letter', 1.6, -0.22, -0.2, 'Yazı: dolu siyah toner'), L('s1', 'sky', 0.9, 0.2, 0.16, 'Fotoğraf: renkli noktalar')];
    if (q === 2) return [L('s1', 'lantern', 0.75, -0.2, 0.05, 'Rozet deseni', 0.01, 0.03)];
  }
  if (chap.id === 'compare' && tl.ph('compare', T) > 0.23) {
    if (q === 1) return [L('s1', 'lighthouse', 4.2, -0.45, 0, 'Orijinal'), L('s2', 'lighthouse', 4.2, 0.45, 0, 'Kopya')];
    if (q === 2) return [L('s1', 'sea', 1.6, -0.45, 0, 'Orijinal'), L('s2', 'sea', 1.6, 0.45, 0, 'Kopya: hare deseni')];
    if (q === 3) return [L('s1', 'tiny', 3.4, -0.4, -0.2, 'Orijinal'), L('s2', 'tiny', 3.4, 0.4, -0.2, 'Kopya'), L('s1', 'wedgeLight', 3.0, -0.4, 0.02, 'Açık tonlar'), L('s2', 'wedgeLight', 3.0, 0.4, 0.02, 'Kopyada soldu')];
    if (q === 4) return [L('s2', 'corner', 4.5, 0.42, -0.1, 'Kenar gölgesi ve eğiklik'), L('s2', 'text', 5.0, 0.42, 0.14, 'Toz lekeleri', -0.02, 0.05)];
  }
  if (chap.id === 'generations' && tl.ph('generations', T) > 0.32) {
    const names = ['Orijinal', '1. kopya', '2. kopya', '4. kopya', '8. kopya'];
    const keys = ['s1', 's2', 'g2', 'g4', 'g8'];
    const feat = q === 1 ? 'tiny' : 'lighthouse';
    const span = q === 1 ? 3.6 : 4.2;
    return keys.map((k) => L(k, feat, span, 0, -0.27, null));
  }
  return [];
}
