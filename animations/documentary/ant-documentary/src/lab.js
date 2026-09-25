// The double-bridge experiment (Goss, Aron, Deneubourg & Pasteels 1989), re-enacted on a lab
// table: nest box → fork → a short and a long branch → fork → food. Each ant chooses a branch
// with Deneubourg's rule P(short) = (k+Cs)^n / ((k+Cs)^n + (k+Cl)^n) and marks the branch it walks.
// The whole run is simulated once at start (fixed seed), then read back as a function of time.
import { MeshBuilder, PBRMaterial, StandardMaterial, Color3, Vector3, TransformNode, Mesh, VertexData } from '@babylonjs/core';
import { rng, clamp } from './noise.js';
import { tube, meshFrom } from './geom.js';

export const LAB_O = new Vector3(4000, 0, 0);
const H = 3; // bridge height above the table
const P = {
  nest: [-80, 0], forkA: [-46, 0], forkB: [46, 0], food: [80, 0],
  long: [[-46, 0], [-31, 54], [31, 54], [46, 0]],
};
function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
function polyAt(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (s <= l || i === pts.length - 1) { const t = clamp(s / l); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, Math.atan2(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])]; }
    s -= l;
  }
}
const ROUTE = {
  s: [P.nest, P.forkA, P.forkB, P.food],
  l: [P.nest, ...P.long, P.food],
};
const LEN = { s: polyLen(ROUTE.s), l: polyLen(ROUTE.l) };
export const BRANCH_LEN = { short: polyLen([P.forkA, P.forkB]), long: polyLen(P.long) };

export function simulate({ n = 64, seconds = 60, dt = 0.05, seed = 7, K = 5, N = 2, speed = 17 } = {}) {
  const R = rng(seed);
  const ants = [];
  for (let i = 0; i < n; i++) ants.push({ st: 'nest', timer: i * 0.33 + R() * 0.2, br: 's', s: 0, dir: 1, sp: speed * (0.88 + R() * 0.24), lane: (R() - 0.5) * 2.6 });
  let Cs = 0, Cl = 0;
  const frames = [], choices = [];
  const steps = Math.ceil(seconds / dt);
  for (let k = 0; k <= steps; k++) {
    const t = k * dt;
    Cs *= Math.exp(-0.01 * dt); Cl *= Math.exp(-0.01 * dt);
    const fr = new Float32Array(n * 4);
    ants.forEach((a, i) => {
      if (a.st === 'nest' || a.st === 'food') {
        a.timer -= dt;
        if (a.timer <= 0) {
          if (a.st === 'nest') {
            const ws = Math.pow(K + Cs, N), wl = Math.pow(K + Cl, N);
            a.br = R() < ws / (ws + wl) ? 's' : 'l';
            choices.push([t, a.br]);
            a.dir = 1; a.s = 0; a.st = 'walk'; a.marked = false;
          } else { a.dir = -1; a.s = LEN[a.br]; a.st = 'walk'; a.marked = false; }
        }
      } else {
        a.s += a.dir * a.sp * dt;
        const bStart = 34, bEnd = LEN[a.br] - 34;
        const past = a.dir > 0 ? a.s > bEnd : a.s < bStart;
        if (past && !a.marked) { a.marked = true; if (a.br === 's') Cs += 1; else Cl += 1; }
        if (a.dir > 0 && a.s >= LEN[a.br]) { a.st = 'food'; a.timer = 0.9 + R() * 0.6; a.s = LEN[a.br]; }
        if (a.dir < 0 && a.s <= 0) { a.st = 'nest'; a.timer = 0.6 + R() * 0.8; a.s = 0; }
      }
      const vis = a.st === 'walk' || a.st === 'food' ? 1 : 0;
      const [x, z, yaw] = polyAt(ROUTE[a.br], clamp(a.s, 0, LEN[a.br]));
      fr[i * 4] = x; fr[i * 4 + 1] = z; fr[i * 4 + 2] = a.dir > 0 ? yaw : yaw + Math.PI; fr[i * 4 + 3] = vis ? a.sp * (a.st === 'walk' ? 1 : 0) : -1;
    });
    frames.push({ fr, Cs, Cl });
  }
  // walked distance per ant (for the gait) integrated per frame
  const dist = frames.map(() => new Float32Array(n));
  for (let k = 1; k < frames.length; k++) for (let i = 0; i < n; i++) dist[k][i] = dist[k - 1][i] + Math.max(0, frames[k].fr[i * 4 + 3]) * dt;
  return { n, dt, frames, dist, choices, lane: ants.map(a => a.lane) };
}

// share of choices for the short branch in the last `win` seconds before t
export function shortShare(sim, t, win = 8) {
  const c = sim.choices.filter(([ct]) => ct <= t && ct > t - win);
  if (c.length < 3) return null;
  return c.filter(x => x[1] === 's').length / c.length;
}

export function buildLab(scene, { shadows } = {}) {
  const root = new TransformNode('lab', scene);
  root.position.copyFrom(LAB_O);
  const white = new PBRMaterial('lab-white', scene);
  white.albedoColor = new Color3(0.86, 0.86, 0.84); white.metallic = 0; white.roughness = 0.35;
  const table = MeshBuilder.CreateGround('table', { width: 420, height: 300 }, scene);
  const tm = new PBRMaterial('table', scene); tm.albedoColor = new Color3(0.36, 0.37, 0.38); tm.metallic = 0; tm.roughness = 0.55;
  table.material = tm; table.parent = root; table.receiveShadows = true;
  const strip = (pts, name) => {
    // flat strip of width 6 on small legs, following the polyline
    const L = polyLen(pts), n = Math.ceil(L / 2);
    const pos = [], idx = [], uv = [];
    for (let i = 0; i <= n; i++) {
      const [x, z, yaw] = polyAt(pts, L * i / n);
      const nx = Math.cos(yaw), nz = -Math.sin(yaw);
      for (const [k, y] of [[-5, H], [5, H], [5, H - 1], [-5, H - 1]]) { pos.push(x + nx * k, y, z + nz * k); uv.push(k > 0 ? 1 : 0, i / n * L / 10); }
      if (i < n) { const a = i * 4, b = a + 4; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2, a + 3, b + 3, a, a, b + 3, b); }
    }
    const m = new Mesh(name, scene); const vd = new VertexData(); vd.positions = pos; vd.indices = idx; vd.uvs = uv;
    const nor = []; VertexData.ComputeNormals(pos, idx, nor); vd.normals = nor; vd.applyToMesh(m);
    m.material = white; m.parent = root; m.receiveShadows = true; shadows?.addShadowCaster(m);
    return m;
  };
  strip([P.nest, P.forkA], 'stem1'); strip([P.forkB, P.food], 'stem2');
  const shortM = strip([P.forkA, P.forkB], 'short'); const longM = strip(P.long, 'long');
  // pheromone tint overlays on the branches
  const mkTint = (pts, name) => {
    const m = strip(pts, name);
    const mm = new StandardMaterial(name + 'm', scene);
    mm.emissiveColor = new Color3(0.6, 0.35, 1); mm.disableLighting = true; mm.alpha = 0; mm.diffuseColor = new Color3(0, 0, 0);
    m.material = mm; m.position.y = 0.05; m.scaling.set(1, 1, 1);
    shadows?.removeShadowCaster(m);
    return m;
  };
  const tintS = mkTint([P.forkA, P.forkB], 'tintS'), tintL = mkTint(P.long, 'tintL');
  // nest box (clear plastic with soil) and a food dish
  const box = MeshBuilder.CreateBox('nestbox', { width: 44, height: 16, depth: 44 }, scene);
  const glass = new PBRMaterial('boxglass', scene); glass.metallic = 0; glass.roughness = 0.05; glass.alpha = 0.25; glass.albedoColor = new Color3(0.9, 0.95, 1);
  box.material = glass; box.position.set(-104, 8, 0); box.parent = root;
  const dirt = MeshBuilder.CreateBox('nestdirt', { width: 42, height: 9, depth: 42 }, scene);
  const dm = new PBRMaterial('dirt', scene); dm.albedoColor = new Color3(0.28, 0.2, 0.14); dm.metallic = 0; dm.roughness = 1; dirt.material = dm; dirt.position.set(-104, 4.5, 0); dirt.parent = root;
  const dish = MeshBuilder.CreateCylinder('dish', { diameter: 34, height: 4, tessellation: 64 }, scene);
  dish.material = glass; dish.position.set(104, 2, 0); dish.parent = root;
  const syrup = MeshBuilder.CreateCylinder('dsyrup', { diameter: 26, height: 1.2, tessellation: 64 }, scene);
  const sm = new PBRMaterial('dsyrupm', scene); sm.albedoColor = new Color3(0.8, 0.5, 0.1); sm.metallic = 0; sm.roughness = 0.05; sm.alpha = 0.85;
  syrup.material = sm; syrup.position.set(104, 1.2, 0); syrup.parent = root;
  // ramps from table-level containers up to the bridge
  strip([[-82, 0], [-80, 0]], 'r1');
  return { root, tintS, tintL, H, P, setVisible: v => root.setEnabled(v) };
}
