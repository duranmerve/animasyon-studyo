// Shared geometry of the machine (units: centimetres). The cutaway is in the XY plane,
// the paper width runs along Z. The paper path is one arc-length parameterised curve:
// s = 0 is where the leading edge of the top sheet rests in the tray.
import * as THREE from 'three';

export const PAGE_L = 29.7;
export const PAGE_W = 21.0;
export const DEG = Math.PI / 180;

// drums: yellow, magenta, cyan, black (the order the paper meets them)
export const DRUM_R = 1.5;
export const DRUM_Y = 13.25 + DRUM_R + 0.03;
export const DRUM_X = [8.25, 2.75, -2.75, -8.25];
export const DRUM_LEN = 22.4;
export const TONER_NAMES = ['Sarı', 'Macenta', 'Camgöbeği', 'Siyah'];
export const TONER_RGB = [[1.0, 0.86, 0.05], [0.86, 0.06, 0.45], [0.0, 0.58, 0.86], [0.07, 0.07, 0.08]];
export const TONER_CHANNEL = [2, 1, 0, 3]; // index into CMYK coverage (R=C, G=M, B=Y, A=K)

// angular stations around a drum (radians, measured CCW from +X, drum turns clockwise)
export const ANG = { contact: -90 * DEG, developer: -20 * DEG, laser: 45 * DEG, charge: 120 * DEG, blade: 190 * DEG };
// upstream arc distance from the transfer contact to each station
const up = a => DRUM_R * ((a - ANG.contact + 2 * Math.PI) % (2 * Math.PI));
export const D_DEV = up(ANG.developer);
export const D_LASER = up(ANG.laser);
export const D_CHARGE = up(ANG.charge);
export const D_BLADE = up(ANG.blade);
export const DRUM_CIRC = 2 * Math.PI * DRUM_R;

export const FUSER_X = -15.5;
export const REG_X = 14.0;
export const BELT = { x0: -12.6, x1: 12.6, r: 0.8, top: 13.22 };
export const SCAN = { glassY: 38.3, cornerX: -15.2, cornerZ: -10.8, x0: -15.6, x1: 15.0 };
export const LID_HINGE = { y: 38.35, z: -13.0 };

// ---- the paper path
const segs = [];
const line = (a, b) => segs.push({ type: 'line', a: new THREE.Vector2(...a), b: new THREE.Vector2(...b) });
const arc = (c, r, a0, a1) => segs.push({ type: 'arc', c: new THREE.Vector2(...c), r, a0: a0 * DEG, a1: a1 * DEG });
line([-60, 4.6], [16, 4.6]);
arc([16, 8.925], 4.325, -90, 90);
line([16, 13.25], [-17.5, 13.25]);
arc([-17.5, 15.75], 2.5, -90, -180);
line([-20, 15.75], [-20, 28.5]);
arc([-17.5, 28.5], 2.5, 180, 90);
line([-17.5, 31], [80, 31]);

const STEP = 0.05;
const pts = [];
for (const sg of segs) {
  const len = sg.type === 'line' ? sg.a.distanceTo(sg.b) : Math.abs(sg.a1 - sg.a0) * sg.r;
  const n = Math.max(2, Math.ceil(len / STEP));
  for (let i = pts.length ? 1 : 0; i <= n; i++) {
    const t = i / n;
    if (sg.type === 'line') pts.push(sg.a.clone().lerp(sg.b, t));
    else { const a = sg.a0 + (sg.a1 - sg.a0) * t; pts.push(new THREE.Vector2(sg.c.x + sg.r * Math.cos(a), sg.c.y + sg.r * Math.sin(a))); }
  }
}
const cum = [0];
for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
// shift so that s = 0 at the resting leading edge (x = 14.85 on the tray line)
const S0 = 14.85 + 60;
for (let i = 0; i < cum.length; i++) cum[i] -= S0;

function locate(s) {
  let lo = 0, hi = cum.length - 1;
  if (s <= cum[0]) return [0, 0];
  if (s >= cum[hi]) return [hi - 1, 1];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  return [lo, (s - cum[lo]) / (cum[lo + 1] - cum[lo])];
}
export function pathPoint(s, out = new THREE.Vector2()) {
  const [i, f] = locate(s);
  return out.copy(pts[i]).lerp(pts[i + 1], f);
}
export function pathTangent(s, out = new THREE.Vector2()) {
  const [i] = locate(s);
  return out.copy(pts[i + 1]).sub(pts[i]).normalize();
}
// s of a point on the long horizontal run (y = 13.25, heading −x)
const S_RUN = cum[pts.findIndex(p => Math.abs(p.x - 16) < 1e-6 && Math.abs(p.y - 13.25) < 1e-6)];
export const sAtRunX = x => S_RUN + (16 - x);
export const S_REG = sAtRunX(REG_X);
export const S_WAIT = S_REG + 0.25;
export const P_DRUM = DRUM_X.map(sAtRunX);
export const S_FUSER = sAtRunX(FUSER_X);
export const S_EXIT = S_RUN + 33.5 + Math.PI * 2.5 / 2 + 12.75 + Math.PI * 2.5 / 2 + 1.7; // exit rollers at x = −15.8
export const LEAD_FINAL = S_EXIT + PAGE_L + 0.6; // tail clears the exit rollers
// virtual lead where each drum's laser writes the first row
export const LV_LASER_START = P_DRUM.map(p => p - D_LASER);
