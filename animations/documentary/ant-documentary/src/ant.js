// A black garden ant (Lasius niger) worker, built from lofted parts at true scale (1 unit = 1 mm):
// head with compound eyes and elbowed 12-segment antennae (scape + 11-segment funiculus),
// mesosoma, single scale-like petiole, banded gaster, six legs (coxa, femur, tibia, 5-part tarsus).
// Parts are instanced, so dozens of ants cost the same draw calls as one.
// Walking: an alternating tripod gait computed from distance travelled (pure function of s),
// each leg solved with two-bone IK onto the ground.
import { TransformNode, Vector3, Quaternion, Matrix, PBRMaterial, Color3 } from '@babylonjs/core';
import { loft, tube, hairs, meshFrom, plate, warp } from './geom.js';
import { chitinNormal, eyeNormal } from './textures.js';
import { clamp } from './noise.js';

// uniform Catmull-Rom through samples → f(s), s in [0,1]
export function spline(vals) {
  const n = vals.length - 1;
  return s => {
    const x = clamp(s) * n, i = Math.min(n - 1, Math.floor(x)), t = x - i;
    const p0 = vals[Math.max(0, i - 1)], p1 = vals[i], p2 = vals[i + 1], p3 = vals[Math.min(n, i + 2)];
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  };
}

const HAIR = [1, 1, 1];

export function antMaterials(scene) {
  const nrm = chitinNormal(scene);
  const mk = (name, albedo, { rough = 0.42, coat = 0.55, coatRough = 0.18, bump = 0.35, translucent = 0 } = {}) => {
    const m = new PBRMaterial(name, scene);
    m.albedoColor = new Color3(...albedo);
    m.metallic = 0; m.roughness = rough;
    m.clearCoat.isEnabled = coat > 0; m.clearCoat.intensity = coat; m.clearCoat.roughness = coatRough;
    if (bump) { m.bumpTexture = nrm; m.bumpTexture.level = bump; m.bumpTexture.uScale = 3; m.bumpTexture.vScale = 3; }
    if (translucent && !(window.__off || new Set()).has('sss')) {
      m.subSurface.isTranslucencyEnabled = true;
      m.subSurface.translucencyIntensity = translucent;
      m.subSurface.tintColor = new Color3(0.75, 0.35, 0.12);
      m.subSurface.maximumThickness = 0.5;
    }
    // silky, not plastic: a very fine bump on the clear coat spreads the sheen; no sparkling aliasing
    if (coat > 0) { m.clearCoat.bumpTexture = nrm; }
    m.enableSpecularAntiAliasing = true;
    m.environmentIntensity = 0.9;
    return m;
  };
  const hair = new PBRMaterial('ant-hair', scene);
  hair.albedoColor = new Color3(0.32, 0.27, 0.2); hair.metallic = 0; hair.roughness = 0.5;
  hair.subSurface.isTranslucencyEnabled = true; hair.subSurface.translucencyIntensity = 0.5; hair.subSurface.tintColor = new Color3(1, 0.75, 0.45);
  const eye = new PBRMaterial('ant-eye', scene);
  eye.albedoColor = new Color3(0.012, 0.01, 0.009); eye.metallic = 0; eye.roughness = 0.12;
  eye.bumpTexture = eyeNormal(scene); eye.bumpTexture.level = 1.1;
  eye.clearCoat.isEnabled = true; eye.clearCoat.intensity = 1; eye.clearCoat.roughness = 0.04;
  eye.iridescence.isEnabled = true; eye.iridescence.intensity = 0.35; eye.iridescence.minimumThickness = 280; eye.iridescence.maximumThickness = 520;
  return {
    head: mk('ant-head', [0.05, 0.036, 0.028], { rough: 0.55, coat: 0.3, coatRough: 0.28, bump: 0.6 }),
    body: mk('ant-body', [0.058, 0.04, 0.03], { rough: 0.55, coat: 0.3, coatRough: 0.28, bump: 0.6 }),
    gaster: mk('ant-gaster', [0.042, 0.031, 0.026], { rough: 0.45, coat: 0.45, coatRough: 0.2, bump: 0.45 }),
    leg: mk('ant-leg', [0.045, 0.03, 0.021], { rough: 0.5, coat: 0.3, bump: 0.3, translucent: 0.25 }),
    mandible: mk('ant-mand', [0.06, 0.035, 0.02], { rough: 0.35, coat: 0.6, bump: 0.1, translucent: 0.15 }),
    eye, hair,
  };
}

// ---------- template: one source mesh per part ----------
export function buildAntTemplate(scene, mats) {
  const T = {};
  const OFF = window.__off || new Set();
  const hide = m => { m.isVisible = false; m.isPickable = false; return m; };
  const meshFrom0 = meshFrom;
  const meshFromF = (n, sc, parts) => meshFrom0(n, sc, OFF.has('hairs') ? parts.filter(p => p.mat !== mats.hair) : parts);

  // head: broad, flattened, slightly heart-shaped from above; spine along +z from neck (0) to clypeus (0.95)
  {
    const w = spline([0.08, 0.38, 0.44, 0.45, 0.44, 0.42, 0.38, 0.3, 0.1]);
    const h = spline([0.07, 0.19, 0.225, 0.23, 0.225, 0.2, 0.17, 0.12, 0.04]);
    const yc = spline([0, 0.02, 0.03, 0.03, 0.025, 0.015, 0, -0.02, -0.04]);
    const vd = loft({
      n: 40, m: 36, p: 3.0,
      center: s => [0, yc(s), s * 0.95],
      rx: (s, th) => w(s) * (1 - 0.1 * Math.max(0, -Math.sin(th))),  // underside a bit narrower
      ry: (s, th) => h(s) * (Math.sin(th) < 0 ? 0.85 : 1),
    });
    // posterior margin slightly emarginate (concave) and a frontal groove: small warps
    warp(vd, (x, y, z) => {
      const back = Math.exp(-z * 14) * Math.exp(-x * x * 30) * 0.05;
      return [x, y, z + back];
    });
    const hr = hairs(vd, 60, { seed: 3, len: 0.09, r0: 0.0032, lean: 0.9, filter: (s, th) => Math.sin(th) > 0.1 && s > 0.1 && s < 0.9, color: HAIR });
    const clyp = hairs(vd, 16, { seed: 4, len: 0.12, r0: 0.003, lean: 0.3, filter: (s, th) => s > 0.86 && Math.sin(th) > -0.2, color: HAIR });
    T.head = hide(meshFromF('head', scene, [{ vd, mat: mats.head }, { vd: hr, mat: mats.hair }, { vd: clyp, mat: mats.hair }]));
  }
  // compound eye: an ellipsoid dome covered with hexagonal facets
  {
    const vd = loft({ n: 24, m: 24, center: s => [0, 0, (s - 0.5) * 0.22], rx: s => Math.sin(Math.PI * s) ** 0.8 * 0.075, ry: s => Math.sin(Math.PI * s) ** 0.8 * 0.1 });
    // project uv so facets cover the dome evenly
    for (let i = 0; i < vd.uvs.length / 2; i++) { vd.uvs[i * 2] = vd.positions[i * 3 + 2] / 0.28 + 0.5; vd.uvs[i * 2 + 1] = vd.positions[i * 3 + 1] / 0.28 + 0.5; }
    T.eye = hide(meshFromF('eye', scene, [{ vd, mat: mats.eye }]));
  }
  // mandibles: triangular blades with a toothed cutting edge; hinge at origin
  for (const side of [1, -1]) {
    const teeth = [];
    const tip = [-0.24, 0.3], base = [-0.05, 0.02];
    const k = 7;
    for (let i = 0; i <= k; i++) {
      const t = i / k;
      const x = tip[0] + (base[0] - tip[0]) * t, z = tip[1] + (base[1] - tip[1]) * t;
      const d = (i % 2 === 1 && i < k) ? 0.022 * (1 - t * 0.5) : 0;
      teeth.push([x - d * 0.8, z + d * 0.6]);
    }
    const outline = [[0.05, -0.03], [0.07, 0.08], [0.03, 0.18], [-0.07, 0.27], [-0.16, 0.31], ...teeth, [0.0, -0.04]];
    const vd = plate(outline.map(([x, z]) => [x * side * 0.85, z * 0.85]), 0.035, { bulge: 0.008 });
    // curve the blade downward toward the tip
    warp(vd, (x, y, z) => [x, y - z * z * 0.35, z]);
    const hr = hairs(Object.assign(tube(s => [0, 0, 0], () => 0.001, { n: 3, m: 3 }), {}), 0, {});
    T['mand' + (side > 0 ? 'R' : 'L')] = hide(meshFromF('mand', scene, [{ vd, mat: mats.mandible }]));
    void hr;
  }
  // antenna scape: slender, curved, thickening toward the elbow; along +z, length 0.86
  {
    const vd = tube(s => [0, Math.sin(s * Math.PI) * 0.03, s * 0.86], s => 0.026 + 0.018 * s * s + (s < 0.06 ? 0.015 * (1 - s / 0.06) : 0), { n: 26, m: 12 });
    const hr = hairs(vd, 40, { seed: 7, len: 0.05, r0: 0.003, lean: 1.1, color: HAIR });
    T.scape = hide(meshFromF('scape', scene, [{ vd, mat: mats.leg }, { vd: hr, mat: mats.hair }]));
  }
  // funiculus: 11 bead-like segments, last one longest, gently curving down; length ~1.08
  {
    const L = 1.08;
    const bounds = []; let acc = 0;
    const lens = [0.1, 0.08, 0.085, 0.085, 0.09, 0.09, 0.095, 0.095, 0.1, 0.1, 0.16];
    const tot = lens.reduce((a, b) => a + b, 0);
    for (const l of lens) { bounds.push([acc / tot, (acc + l) / tot]); acc += l; }
    const r = s => {
      const seg = bounds.find(b => s >= b[0] && s <= b[1]) || bounds[bounds.length - 1];
      const u = (s - seg[0]) / (seg[1] - seg[0]);
      const base = 0.03 + 0.022 * s;
      const tip = s > 0.95 ? Math.sqrt(Math.max(0, (1 - s) / 0.05)) : 1;
      return base * (0.82 + 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8))) * tip;
    };
    const vd = tube(s => [0, -Math.sin(s * 1.2) * 0.12 * s, s * L], r, { n: 120, m: 12 });
    const hr = hairs(vd, 150, { seed: 8, len: 0.035, r0: 0.0025, lean: 1.0, color: HAIR });
    T.funiculus = hide(meshFromF('funiculus', scene, [{ vd, mat: mats.leg }, { vd: hr, mat: mats.hair }]));
  }
  // mesosoma: pronotum, mesonotum, metanotal groove, rounded propodeum; spine from rear (0) to neck (1)
  {
    const top = spline([0.03, 0.15, 0.19, 0.13, 0.17, 0.23, 0.27, 0.25, 0.14, 0.04]);
    const bot = spline([-0.03, -0.13, -0.18, -0.19, -0.2, -0.2, -0.19, -0.16, -0.1, -0.03]);
    const wid = spline([0.05, 0.18, 0.2, 0.19, 0.21, 0.26, 0.3, 0.29, 0.18, 0.07]);
    const vd = loft({
      n: 48, m: 32, p: 2.4,
      center: s => [0, (top(s) + bot(s)) / 2, -0.58 + s * 1.2],
      rx: (s) => wid(s), ry: (s) => (top(s) - bot(s)) / 2,
    });
    const hr = hairs(vd, 50, { seed: 9, len: 0.11, r0: 0.0035, lean: 0.7, filter: (s, th) => Math.sin(th) > 0.5, color: HAIR });
    const fine = hairs(vd, 120, { seed: 10, len: 0.04, r0: 0.003, lean: 1.3, filter: (s, th) => Math.sin(th) > -0.3, color: HAIR });
    T.meso = hide(meshFromF('meso', scene, [{ vd, mat: mats.body }, { vd: hr, mat: mats.hair }, { vd: fine, mat: mats.hair }]));
  }
  // petiole: a single upright scale on a short stalk (Formicinae)
  {
    const w = spline([0.07, 0.1, 0.16, 0.19, 0.18, 0.14, 0.02]);
    const th = spline([0.06, 0.06, 0.055, 0.05, 0.045, 0.04, 0.01]);
    const vd = loft({ n: 24, m: 20, up: [0, 0, 1], center: s => [0, -0.12 + s * 0.46, -s * 0.05], rx: s => w(s), ry: s => th(s) });
    const hr = hairs(vd, 10, { seed: 12, len: 0.08, r0: 0.004, lean: 0.2, filter: s => s > 0.85, color: HAIR });
    T.petiole = hide(meshFromF('petiole', scene, [{ vd, mat: mats.body }, { vd: hr, mat: mats.hair }]));
  }
  // gaster: large oval with overlapping tergites (lighter hind margins); spine from petiole (0) back to acidopore (1)
  {
    const w = spline([0.06, 0.3, 0.43, 0.48, 0.48, 0.44, 0.36, 0.22, 0.03]);
    const h = spline([0.06, 0.27, 0.38, 0.42, 0.42, 0.38, 0.3, 0.18, 0.03]);
    const bands = [0.24, 0.45, 0.63, 0.79, 0.9];
    const step = s => { let v = 0; for (const b of bands) { const d = s - b; if (d > -0.035 && d < 0) v += 0.035 * (1 + d / 0.035); } return v; };
    const margin = s => { let v = 0; for (const b of bands) { const d = b - s; if (d >= 0 && d < 0.03) v = Math.max(v, 1 - d / 0.03); } return v; };
    const vd = loft({
      n: 90, m: 40, p: 2.1,
      center: s => [0, 0.04 * Math.sin(s * Math.PI) - s * 0.12, -s * 1.42],
      rx: s => w(s) * (1 + step(s)), ry: (s, t) => h(s) * (1 + step(s)) * (Math.sin(t) < 0 ? 0.9 : 1),
      color: (s) => { const m = margin(s); return [1 + m * 0.9, 1 + m * 0.65, 1 + m * 0.45]; },
    });
    const erect = hairs(vd, 80, { seed: 13, len: 0.13, r0: 0.0035, lean: 0.45, filter: (s, t) => Math.sin(t) > 0.0 && s > 0.12, color: HAIR });
    const pub = hairs(vd, 380, { seed: 14, len: 0.05, r0: 0.0028, lean: 1.35, filter: (s, t) => s > 0.08, color: HAIR });
    const fringe = hairs(vd, 24, { seed: 15, len: 0.1, r0: 0.004, lean: 0.9, filter: s => s > 0.93, color: HAIR });
    T.gaster = hide(meshFromF('gaster', scene, [{ vd, mat: mats.gaster }, { vd: erect, mat: mats.hair }, { vd: pub, mat: mats.hair }, { vd: fringe, mat: mats.hair }]));
  }
  // leg segments, unit length along +z (scaled by the IK solution)
  {
    const coxa = tube(s => [0, 0, s], s => (0.085 - 0.03 * s) * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.1 + 0.08)), 0.3), { n: 14, m: 14 });
    T.coxa = hide(meshFromF('coxa', scene, [{ vd: coxa, mat: mats.leg }]));
    const femur = tube(s => [0, Math.sin(s * Math.PI) * 0.03, s], s => (0.04 + 0.022 * Math.sin(Math.PI * Math.pow(s, 0.8))) * (s < 0.04 ? 0.6 + s * 10 : 1) * (s > 0.97 ? Math.sqrt((1 - s) / 0.03) * 0.6 + 0.4 : 1), { n: 24, m: 12 });
    const fh = hairs(femur, 30, { seed: 16, len: 0.04, r0: 0.003, lean: 1.1, color: HAIR });
    T.femur = hide(meshFromF('femur', scene, [{ vd: femur, mat: mats.leg }, { vd: fh, mat: mats.hair }]));
    const tibia = tube(s => [0, 0, s], s => (0.026 + 0.018 * s) * (s > 0.97 ? Math.sqrt((1 - s) / 0.03) * 0.6 + 0.4 : 1), { n: 20, m: 10 });
    const th = hairs(tibia, 40, { seed: 17, len: 0.045, r0: 0.003, lean: 1.0, color: HAIR });
    // apical spur
    const spur = tube(s => [0.02 * s, -0.03 - 0.02 * s, 0.97 + s * 0.12], s => 0.009 * (1 - s), { n: 5, m: 5 });
    T.tibia = hide(meshFromF('tibia', scene, [{ vd: tibia, mat: mats.leg }, { vd: spur, mat: mats.leg }, { vd: th, mat: mats.hair }]));
    // tarsus: long basitarsus + 4 short segments, claws
    const cuts = [0, 0.45, 0.6, 0.72, 0.83, 1];
    const tr = s => {
      let k = 0; while (k < 4 && s > cuts[k + 1]) k++;
      const u = (s - cuts[k]) / (cuts[k + 1] - cuts[k]);
      return (0.024 - 0.006 * s) * (0.75 + 0.25 * Math.sin(Math.PI * Math.pow(u, 0.7))) * (s > 0.985 ? 0.5 : 1);
    };
    const tars = tube(s => [0, 0, s], tr, { n: 60, m: 10 });
    const tah = hairs(tars, 45, { seed: 18, len: 0.035, r0: 0.0025, lean: 1.0, color: HAIR });
    const claws = [-1, 1].map(k => tube(s => [k * 0.012, -0.03 * s * s, 1 + s * 0.06], s => 0.008 * (1 - s * 0.9), { n: 6, m: 5 }));
    T.tarsus = hide(meshFromF('tarsus', scene, [{ vd: tars, mat: mats.leg }, { vd: claws[0], mat: mats.leg }, { vd: claws[1], mat: mats.leg }, { vd: tah, mat: mats.hair }]));
  }
  return T;
}

// ---------- leg layout (ant space, mm; ground at y=0, body node at y=BODY_Y) ----------
const BODY_Y = 0.6;
// hip = coxa base in body space; coxa dir; femur/tibia/tarsus lengths; neutral foot on ground (ant space)
const LEGS = [
  { name: 'L1', side: -1, hip: [-0.1, -0.16, 0.42], coxa: [-0.25, -0.9, 0.35], cl: 0.32, f: 0.92, t: 0.8, ta: 0.82, foot: [-1.45, 1.75], phase: 0.0 },
  { name: 'R1', side: 1, hip: [0.1, -0.16, 0.42], coxa: [0.25, -0.9, 0.35], cl: 0.32, f: 0.92, t: 0.8, ta: 0.82, foot: [1.45, 1.75], phase: 0.5 },
  { name: 'L2', side: -1, hip: [-0.15, -0.19, 0.06], coxa: [-0.6, -0.8, 0.0], cl: 0.24, f: 0.95, t: 0.86, ta: 0.9, foot: [-2.05, 0.1], phase: 0.5 },
  { name: 'R2', side: 1, hip: [0.15, -0.19, 0.06], coxa: [0.6, -0.8, 0.0], cl: 0.24, f: 0.95, t: 0.86, ta: 0.9, foot: [2.05, 0.1], phase: 0.0 },
  { name: 'L3', side: -1, hip: [-0.16, -0.18, -0.28], coxa: [-0.55, -0.8, -0.25], cl: 0.26, f: 1.12, t: 1.05, ta: 1.1, foot: [-1.8, -1.95], phase: 0.02 },
  { name: 'R3', side: 1, hip: [0.16, -0.18, -0.28], coxa: [0.55, -0.8, -0.25], cl: 0.26, f: 1.12, t: 1.05, ta: 1.1, foot: [1.8, -1.95], phase: 0.52 },
];

const tmpM = new Matrix();
const UP = new Vector3(0, 1, 0);

function placeSeg(inst, a, b, size, up = UP) {
  const d = b.subtract(a);
  const len = d.length();
  inst.position.copyFrom(a);
  if (!inst.rotationQuaternion) inst.rotationQuaternion = new Quaternion();
  const Z = d.scale(1 / len);
  let X = Vector3.Cross(up, Z);
  if (X.lengthSquared() < 1e-8) X = Vector3.Cross(new Vector3(1, 0, 0), Z);
  X.normalize();
  const Y = Vector3.Cross(Z, X).normalize();
  Quaternion.RotationQuaternionFromAxisToRef(X, Y, Z, inst.rotationQuaternion);
  inst.scaling.set(size, size, len);
}

export class Ant {
  // opts: size (1 = worker ~4.3 mm), queen (bigger thorax and gaster, wing scars)
  constructor(T, scene, { size = 1, queen = false, name = 'ant' } = {}) {
    this.size = size; this.queen = queen; this.T = T;
    this.root = new TransformNode(name, scene);
    this.body = new TransformNode(name + '-body', scene); this.body.parent = this.root;
    this.body.position.y = BODY_Y;
    const inst = (m, parent) => { const i = m.createInstance(name + '-' + m.name); i.parent = parent || null; i.isPickable = false; return i; };
    this.all = [];
    const keep = i => { this.all.push(i); return i; };
    // head
    this.neck = new TransformNode(name + '-neck', scene); this.neck.parent = this.body;
    this.neck.position.set(0, 0.1, 0.64);
    this.head = keep(inst(T.head, this.neck));
    this.eyes = [-1, 1].map(k => { const e = keep(inst(T.eye, this.neck)); e.position.set(0.405 * k, 0.05, 0.5); e.rotation.y = k * 0.25; return e; });
    this.mands = [-1, 1].map(k => {
      const n = new TransformNode(name + '-mh', scene); n.parent = this.neck; n.position.set(0.17 * k, -0.12, 0.84);
      keep(inst(k > 0 ? T.mandR : T.mandL, n)); return n;
    });
    this.antennae = [-1, 1].map(k => {
      const sock = new TransformNode(name + '-sock', scene); sock.parent = this.neck; sock.position.set(0.13 * k, 0.1, 0.74);
      keep(inst(T.scape, sock));
      const elbow = new TransformNode(name + '-elbow', scene); elbow.parent = sock; elbow.position.set(0, 0, 0.86);
      keep(inst(T.funiculus, elbow));
      return { sock, elbow, k };
    });
    this.meso = keep(inst(T.meso, this.body));
    this.pet = keep(inst(T.petiole, this.body)); this.pet.position.set(0, -0.02, -0.68);
    this.gasterNode = new TransformNode(name + '-gn', scene); this.gasterNode.parent = this.body; this.gasterNode.position.set(0, 0.0, -0.78);
    this.gaster = keep(inst(T.gaster, this.gasterNode));
    if (queen) {
      // a queen: much larger mesosoma (flight muscles) and gaster (ovaries)
      this.meso.scaling.set(1.25, 1.45, 1.3);
      this.gaster.scaling.set(1.55, 1.5, 1.7);
      this.gasterNode.position.z = -0.95;
      this.pet.position.z = -0.8;
      this.neck.position.z = 0.8;
    }
    this.legs = LEGS.map(L => ({
      L,
      coxa: keep(inst(T.coxa)), femur: keep(inst(T.femur)), tibia: keep(inst(T.tibia)), tarsus: keep(inst(T.tarsus)),
    }));
    this.root.scaling.setAll(size);
    this.visible = true;
  }

  setVisible(v) {
    if (v === this.visible) return;
    this.visible = v;
    for (const i of this.all) i.setEnabled(v);
  }

  // st: { pos, fwd, up } frame on a surface (see groundFrame), s = distance walked, stride,
  //   path(s) → frame (for foot placement while walking), surf.project(v) puts a point on the surface,
  //   moving (0 = standing), headPitch/headYaw, ant: antenna angles, gaster, mand, bodyH, lift,
  //   feetLocal: foot points in ant space (overrides the gait, e.g. while falling), spread,
//   footWorld: { L1: Vector3 } puts single feet at world points (grooming)
  pose(st) {
    if (!this.visible) return;
    const size = this.size;
    const up = st.up.clone().normalize();
    const X = Vector3.Cross(up, st.fwd).normalize();
    const Z = Vector3.Cross(X, up).normalize();
    const gait = (st.s || 0) / ((st.stride || 1.5) * size);
    const mv = st.moving ?? 1;
    const bob = Math.sin(gait * Math.PI * 4) * 0.015 * mv;
    this.root.position.copyFrom(st.pos.add(up.scale(st.lift || 0)));
    if (!this.root.rotationQuaternion) this.root.rotationQuaternion = new Quaternion();
    Quaternion.RotationQuaternionFromAxisToRef(X, up, Z, this.root.rotationQuaternion);
    if (st.extraRot) this.root.rotationQuaternion.multiplyInPlace(st.extraRot);
    this.body.position.y = BODY_Y + bob + (st.bodyH || 0);
    this.body.rotation.set(-0.04 + (st.bodyPitch || 0), Math.sin(gait * Math.PI * 2) * 0.02 * mv + (st.bodyYaw || 0), Math.sin(gait * Math.PI * 2) * 0.02 * mv + (st.bodyRoll || 0));
    this.neck.rotation.set(0.32 + (st.headPitch || 0), st.headYaw || 0, st.headRoll || 0);
    this.gasterNode.rotation.set(-0.12 + (st.gaster || 0), 0, 0);
    if (!this.queen) this.gaster.scaling.setAll(st.fill || 1);
    const mo = st.mand ?? 0.1;
    this.mands[0].rotation.y = -mo * 0.9; this.mands[1].rotation.y = mo * 0.9;
    const A = st.ant || [[0.7, -0.35, 1.2, 0.5], [0.7, -0.35, 1.2, 0.5]];
    for (const a of this.antennae) {
      const [yaw, pit, elIn, elDown] = A[a.k < 0 ? 0 : 1];
      // scape swings forward/out/up from the socket; funiculus bends inward and down at the elbow
      a.sock.rotation.set(pit, a.k * yaw, 0);
      a.elbow.rotation.set(elDown, -a.k * elIn, 0);
    }
    this.root.computeWorldMatrix(true); this.body.computeWorldMatrix(true);
    this._legs(st, gait);
  }

  // feet: tripod gait from distance travelled; foot positions stay fixed during stance
  _legs(st, gait) {
    const size = this.size, stride = (st.stride || 1.5) * size, duty = 0.55;
    const bodyW = this.body.getWorldMatrix();
    const rootW = this.root.getWorldMatrix();
    const upW = Vector3.TransformNormal(UP, bodyW).normalize();
    const proj = st.surf ? st.surf.project : (v => v);
    const neutral = (L, f) => {
      const up = f.up, X = Vector3.Cross(up, f.fwd).normalize(), Z = Vector3.Cross(X, up).normalize();
      const qs = this.queen ? 1.15 : 1;
      const p = f.pos.add(X.scale(L.foot[0] * size * qs * (st.spread || 1))).add(Z.scale(L.foot[1] * size * qs));
      return proj(p);
    };
    const here = { pos: st.pos, fwd: st.fwd, up: st.up };
    for (const leg of this.legs) {
      const L = leg.L;
      let foot;
      const sNow = st.s || 0;
      if (st.feetLocal) foot = Vector3.TransformCoordinates(new Vector3(...st.feetLocal[L.name]), rootW);
      else if (!st.path || (st.moving ?? 1) === 0) foot = neutral(L, here);
      else {
        const ph = sNow / stride + L.phase;
        const c = Math.floor(ph), f = ph - c;
        const sMid = cc => (cc + duty / 2 - L.phase) * stride;
        const W0 = neutral(L, st.path(sMid(c)));
        if (f < duty) foot = W0;
        else {
          const W1 = neutral(L, st.path(sMid(c + 1)));
          const q = (f - duty) / (1 - duty), e = q * q * (3 - 2 * q);
          foot = Vector3.Lerp(W0, W1, e).add(upW.scale(Math.sin(Math.PI * q) * 0.32 * size));
        }
      }
      if (st.footOffset && st.footOffset[L.name]) foot = foot.add(st.footOffset[L.name]);
      if (st.footWorld && st.footWorld[L.name]) foot = st.footWorld[L.name];
      const qs = this.queen ? 1.2 : 1;
      const hip = Vector3.TransformCoordinates(new Vector3(L.hip[0] * qs, L.hip[1], L.hip[2] * qs), bodyW);
      const cdir = Vector3.TransformNormal(new Vector3(...L.coxa).normalize(), bodyW).normalize();
      const cEnd = hip.add(cdir.scale(L.cl * size));
      // tarsus lies along the surface, pointing away from the body
      const out0 = foot.subtract(cEnd);
      const out = out0.subtract(upW.scale(Vector3.Dot(out0, upW)));
      const outN = out.length() > 1e-5 ? out.normalize() : Vector3.TransformNormal(new Vector3(L.side, 0, 0), bodyW).normalize();
      const ankle = foot.subtract(outN.scale(L.ta * size * 0.86)).add(upW.scale(L.ta * size * 0.3));
      // two-bone IK: femur + tibia from coxa end to ankle, knee bends out and a little up
      const Lf = L.f * size, Lt = L.t * size;
      const D = ankle.subtract(cEnd);
      let d = D.length();
      const dn = D.scale(1 / d);
      d = clamp(d, Math.abs(Lf - Lt) + 1e-3, Lf + Lt - 1e-3);
      const pole = upW.scale(0.2).add(outN.scale(1));
      const P = pole.subtract(dn.scale(Vector3.Dot(pole, dn))).normalize();
      const ca = clamp((Lf * Lf + d * d - Lt * Lt) / (2 * Lf * d), -1, 1);
      const al = Math.acos(ca);
      const knee = cEnd.add(dn.scale(Lf * Math.cos(al))).add(P.scale(Lf * Math.sin(al)));
      const ankle2 = cEnd.add(dn.scale(d));
      placeSeg(leg.coxa, hip, cEnd, size, upW);
      placeSeg(leg.femur, cEnd, knee, size, upW);
      placeSeg(leg.tibia, knee, ankle2, size, upW);
      placeSeg(leg.tarsus, ankle2, foot, size, upW);
    }
  }

  // a point in ant space → world (for labels and attachments)
  worldPoint(x, y, z, node = this.body) { node.computeWorldMatrix(true); return Vector3.TransformCoordinates(new Vector3(x, y, z), node.getWorldMatrix()); }

  dispose() { this.root.dispose(); for (const i of this.all) i.dispose(); }
}

// antenna motion helper: sweeping and tapping, deterministic in t
export function antennaMotion(t, seed = 0, amt = 1) {
  const a = (k, f, p) => Math.sin(t * f + p + seed * 1.7 + k);
  // each antenna sweeps on its own rhythm and now and then taps the ground (a quick downward flick)
  const tap = (f, p) => Math.pow(Math.max(0, Math.sin(t * f + p + seed)), 10);
  const one = (o, f) => [0.75 + 0.22 * a(o, 2.1, 0) * amt, -0.3 + 0.18 * a(o + 1, 3.3, 1) * amt + 0.28 * tap(f, o) * amt, 1.25 + 0.25 * a(o + 2, 2.7, 2) * amt, 0.55 + 0.3 * a(o + 3, 3.9, 0.3) * amt + 0.45 * tap(f, o) * amt];
  return [one(0, 4.1), one(5, 3.3)];
}

// frame on the terrain: position on ground, forward from yaw projected on the slope, normal up
export function groundFrame(x, z, yaw, g) {
  const e = 0.6;
  const h = g(x, z);
  const nx = g(x - e, z) - g(x + e, z), nz = g(x, z - e) - g(x, z + e);
  const up = new Vector3(nx, 2 * e, nz).normalize();
  const f0 = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const fwd = f0.subtract(up.scale(Vector3.Dot(f0, up))).normalize();
  return { pos: new Vector3(x, h, z), fwd, up };
}
export const groundSurf = g => ({ project: v => new Vector3(v.x, g(v.x, v.z), v.z) });

// a path over the ground through [x,z] points (Catmull-Rom); returns { len, at(s) → frame }
export function groundPath(pts, g) {
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 20; k++) {
      const t = k / 20, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(pts[pts.length - 1]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const len = acc[acc.length - 1];
  const at = s => {
    const ext = s > len ? s - len : s < 0 ? s : 0;
    s = clamp(s, 0, len);
    let lo = 0, hi = acc.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; }
    const t = (s - acc[lo]) / Math.max(1e-6, acc[hi] - acc[lo]);
    const dx = dense[hi][0] - dense[lo][0], dz = dense[hi][1] - dense[lo][1], dl = Math.hypot(dx, dz) || 1;
    const x = dense[lo][0] + dx * t + dx / dl * ext, z = dense[lo][1] + dz * t + dz / dl * ext;
    return groundFrame(x, z, Math.atan2(dx, dz), g);
  };
  return { len, at, pts };
}

// distance travelled at time t for a speed profile [[t0, v0], [t1, v1], ...] (linear between keys)
export function travel(t, keys) {
  let s = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t0) break;
    const tt = Math.min(t, t1), k = (v1 - v0) / Math.max(1e-6, t1 - t0);
    s += v0 * (tt - t0) + 0.5 * k * (tt - t0) * (tt - t0);
  }
  const last = keys[keys.length - 1];
  if (t > last[0]) s += last[1] * (t - last[0]);
  return s;
}
