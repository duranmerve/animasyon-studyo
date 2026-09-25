// The nest in cross-section, like an observation cut: a vertical face of soil (z = 0 plane, soil
// behind it at z > 0) with half-open chambers and tunnels. Ants walk on the inner shells.
// Everything lives around NEST_O, far from the surface set.
import { Mesh, VertexData, PBRMaterial, Color3, Vector3, TransformNode, Matrix, Quaternion } from '@babylonjs/core';
import { fbm, rng, clamp } from './noise.js';
import { soilTextures, organicNormal } from './textures.js';
import { tube, meshFrom } from './geom.js';

export const NEST_O = new Vector3(-4000, 0, 0);

// chambers: ellipsoids centred on the cut plane; tunnels: capsules (radius r) between points
export const CHAMBERS = {
  brood: { c: [-30, -33], rx: 14, ry: 4.6, rz: 5.5 },
  cocoon: { c: [22, -45], rx: 15, ry: 4.8, rz: 5.5 },
  queen: { c: [-6, -69], rx: 12.5, ry: 5.2, rz: 6 },
  pantry: { c: [-44, -58], rx: 9, ry: 4, rz: 5 },
};
export const TUNNELS = [
  [[0, 2], [-1, -8], [-4, -18]],
  [[-4, -18], [-14, -24], [-22, -30]],
  [[-4, -18], [4, -30], [11, -42]],
  [[11, -42], [6, -54], [-2, -64]],
  [[-36, -34], [-40, -46], [-43, -55]],
];
const TR = 1.9;

function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy));
  return [Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t), t];
}

// how deep the cut face is carved at (x, y)
export function carve(x, y) {
  let d = 0;
  for (const ch of Object.values(CHAMBERS)) {
    const q = ((x - ch.c[0]) / ch.rx) ** 2 + ((y - ch.c[1]) / ch.ry) ** 2;
    if (q < 1) d = Math.max(d, ch.rz * Math.sqrt(1 - q));
  }
  for (const t of TUNNELS) for (let i = 0; i < t.length - 1; i++) {
    const [dd] = segDist(x, y, t[i], t[i + 1]);
    if (dd < TR) d = Math.max(d, Math.sqrt(TR * TR - dd * dd) * 1.1);
  }
  return d;
}

// put a point (local nest coords) onto the nearest inner shell; returns { p, n } (n points inward)
export function shell(v) {
  let best = null;
  for (const ch of Object.values(CHAMBERS)) {
    const r = new Vector3(ch.rx, ch.ry, ch.rz), c = new Vector3(ch.c[0], ch.c[1], 0);
    const u = v.subtract(c); const un = new Vector3(u.x / r.x, u.y / r.y, u.z / r.z);
    const l = un.length(); if (l < 1e-6) continue;
    const p = c.add(new Vector3(un.x / l * r.x, un.y / l * r.y, un.z / l * r.z));
    const n = new Vector3(-(p.x - c.x) / (r.x * r.x), -(p.y - c.y) / (r.y * r.y), -(p.z - c.z) / (r.z * r.z)).normalize();
    const d = Vector3.Distance(p, v) * (l < 1.25 ? 1 : 3);
    if (!best || d < best.d) best = { p, n, d };
  }
  for (const t of TUNNELS) for (let i = 0; i < t.length - 1; i++) {
    const [, tt] = segDist(v.x, v.y, t[i], t[i + 1]);
    const ax = new Vector3(t[i][0] + (t[i + 1][0] - t[i][0]) * tt, t[i][1] + (t[i + 1][1] - t[i][1]) * tt, 0);
    const u = v.subtract(ax); const l = u.length(); if (l < 1e-6) continue;
    const p = ax.add(u.scale(TR / l)); const n = u.scale(-1 / l);
    const d = Math.abs(l - TR);
    if (!best || d < best.d) best = { p, n, d };
  }
  return best;
}

export function buildNest(scene, { quality = 'high', shadows } = {}) {
  const root = new TransformNode('nest', scene);
  root.position.copyFrom(NEST_O);
  const X0 = -75, X1 = 75, Y0 = -95, Y1 = 1.5;
  const step = quality === 'low' ? 0.5 : 0.3;
  const nx = Math.round((X1 - X0) / step), ny = Math.round((Y1 - Y0) / step);
  const pos = [], uv = [], col = [], idx = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = X0 + i * step, y = Y0 + j * step;
    const c = carve(x, y);
    const rough = 0.25 * (fbm(x / 1.5, y / 1.5, 3, 5) - 0.5) + 0.5 * (fbm(x / 8, y / 8, 2, 6) - 0.5);
    const z = c > 0 ? c + rough * 0.4 : rough * 0.6;
    const yy = y > 0 ? 0 + (fbm(x / 6, 1, 2, 9) - 0.5) * 1.2 : y;
    pos.push(x, yy, z);
    uv.push(x / 9, y / 9);
    // horizons: dark humus on top, lighter subsoil below, a pale band; cavities a touch darker
    const depth = -y;
    const top = Math.exp(-depth / 14);
    const band = Math.exp(-(((depth - 58) / 6) ** 2)) * 0.25;
    const nz = fbm(x / 5, y / 5, 3, 7);
    let r = 0.62 + 0.25 * (1 - top) + band + (nz - 0.5) * 0.25, g = 0.5 + 0.2 * (1 - top) + band * 0.9 + (nz - 0.5) * 0.2, b = 0.4 + 0.12 * (1 - top) + band * 0.7 + (nz - 0.5) * 0.15;
    if (c > 0) { const k = 0.3 + 0.7 * Math.pow(1 - Math.min(1, c / 6), 1.5); r *= k; g *= k * 0.95; b *= k * 0.9; }
    else { const e = Math.max(carve(x + 0.8, y), carve(x - 0.8, y), carve(x, y + 0.8), carve(x, y - 0.8)); if (e > 0) { r *= 1.18; g *= 1.14; b *= 1.08; } }
    col.push(r, g, b, 1);
    if (i < nx && j < ny) { const a = j * (nx + 1) + i; idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2); }
  }
  const face = new Mesh('nest-face', scene);
  const vd = new VertexData(); vd.positions = pos; vd.indices = idx; vd.uvs = uv; vd.colors = col;
  const nor = []; VertexData.ComputeNormals(pos, idx, nor); vd.normals = nor;
  // make sure normals face the camera (−z)
  if (nor[2] > 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } VertexData.ComputeNormals(pos, idx, nor); vd.normals = nor; }
  vd.applyToMesh(face);
  const soil = soilTextures(scene, 512);
  const m = new PBRMaterial('nest-soil', scene);
  m.albedoTexture = soil.albedo; m.bumpTexture = soil.normal; m.bumpTexture.level = 1.2;
  m.albedoColor = new Color3(1.0, 0.86, 0.7); m.metallic = 0; m.roughness = 0.95;
  face.material = m; face.useVertexColors = true; face.parent = root; face.receiveShadows = true;
  shadows?.addShadowCaster(face);

  // grass and a strip of daylight above the surface line
  const R = rng(17);
  const rootMat = new PBRMaterial('roots', scene);
  rootMat.albedoColor = new Color3(0.55, 0.42, 0.3); rootMat.metallic = 0; rootMat.roughness = 0.7;
  rootMat.subSurface.isTranslucencyEnabled = true; rootMat.subSurface.translucencyIntensity = 0.4;
  const rootParts = [];
  for (let k = 0; k < 10; k++) {
    let x = -70 + R() * 140, y = 0, z = 0.1;
    const pts = [[x, y, z]];
    for (let s = 0; s < 14; s++) { x += (R() - 0.5) * 6; y -= 2 + R() * 4; if (carve(x, y) > 0) break; pts.push([x, y, 0.1 + R() * 0.2]); }
    if (pts.length < 3) continue;
    const L = pts.length - 1;
    const r0 = 0.15 + R() * 0.3;
    rootParts.push({ vd: tube(s => { const f = s * L, i = Math.min(L - 1, Math.floor(f)), t = f - i; return pts[i].map((v, q) => v + (pts[i + 1][q] - v) * t); }, s => r0 * (1 - s * 0.8), { n: 40, m: 8 }), mat: rootMat });
  }
  const roots = meshFrom('roots', scene, rootParts); roots.parent = root;

  // pebbles embedded in the face
  const peb = new PBRMaterial('peb', scene);
  peb.albedoColor = new Color3(0.55, 0.5, 0.44); peb.metallic = 0; peb.roughness = 0.6; peb.bumpTexture = organicNormal(scene, 128, 10, 3, 55);
  const pebParts = [];
  for (let k = 0; k < 70; k++) {
    const x = X0 + R() * (X1 - X0), y = Y0 + R() * (-Y0 - 3);
    if (carve(x, y) > 0 || carve(x + 2, y) > 0 || carve(x - 2, y) > 0) continue;
    const r = 0.4 + Math.pow(R(), 3) * 3;
    pebParts.push({ vd: tube(s => [x, y, (s - 0.5) * r * 1.2 - r * 0.25], s => r * Math.sin(Math.PI * s) ** 0.6 * (0.8 + 0.2 * Math.sin(s * 7 + k)), { n: 10, m: 12 }), mat: peb });
  }
  const pebbles = meshFrom('pebbles', scene, pebParts); pebbles.parent = root;
  return { root, face, setVisible: v => root.setEnabled(v) };
}

// walking frame inside the nest along a list of local points (world frame returned)
export function nestPath(pts) {
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 16; k++) {
    const t = k / 16; dense.push(pts[i].map((v, q) => v + (pts[i + 1][q] - v) * t));
  }
  dense.push(pts[pts.length - 1]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(...dense[i].map((v, q) => v - dense[i - 1][q])));
  const len = acc[acc.length - 1];
  const at = s => {
    s = clamp(s, 0, len);
    let lo = 0, hi = acc.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; }
    const t = (s - acc[lo]) / Math.max(1e-6, acc[hi] - acc[lo]);
    const p = new Vector3(...dense[lo].map((v, q) => v + (dense[hi][q] - v) * t));
    const sh = shell(p);
    const d = new Vector3(...dense[hi].map((v, q) => v - dense[lo][q]));
    const fwd = d.subtract(sh.n.scale(Vector3.Dot(d, sh.n))).normalize();
    return { pos: sh.p.add(NEST_O), fwd, up: sh.n };
  };
  return { len, at };
}
export const nestSurf = { project: v => shell(v.subtract(NEST_O)).p.add(NEST_O) };
export const nestFrame = (x, y, z, yaw = 0) => {
  const sh = shell(new Vector3(x, y, z));
  const f0 = new Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  const fwd = f0.subtract(sh.n.scale(Vector3.Dot(f0, sh.n))).normalize();
  return { pos: sh.p.add(NEST_O), fwd, up: sh.n };
};
