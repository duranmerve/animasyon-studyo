// Geometry builders: organic lofted shapes (the ant's body parts, aphids, stems), tapered tubes
// and hairs. A loft sweeps a (super)elliptic cross-section along a spine whose radii change.
import { Mesh, VertexData, Vector3, SubMesh, MultiMaterial } from '@babylonjs/core';
import { rng } from './noise.js';

// opts: n rings, m segments, center(s)→[x,y,z], rx(s,θ), ry(s,θ), p (superellipse exponent),
// color(s,θ)→[r,g,b], up [x,y,z] reference for the cross-section frame
export function loft(o) {
  const n = o.n || 32, m = o.m || 24, p = o.p || 2;
  const up0 = new Vector3(...(o.up || [0, 1, 0]));
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const rings = [];
  const C = s => new Vector3(...o.center(Math.min(1, Math.max(0, s))));
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1);
    const c = C(s);
    const T = C(s + 0.002).subtract(C(s - 0.002)).normalize();
    let N = up0.subtract(T.scale(Vector3.Dot(up0, T)));
    if (N.length() < 1e-4) N = new Vector3(1, 0, 0);
    N.normalize();
    const X = Vector3.Cross(N, T).normalize();
    rings.push({ s, c, T, N, X });
    for (let j = 0; j <= m; j++) {
      const th = (j / m) * Math.PI * 2;
      const cs = Math.cos(th), sn = Math.sin(th);
      const cx = Math.sign(cs) * Math.pow(Math.abs(cs), 2 / p), cy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / p);
      const rx = o.rx(s, th), ry = o.ry(s, th);
      const v = c.add(X.scale(rx * cx)).add(N.scale(ry * cy));
      pos.push(v.x, v.y, v.z);
      uv.push(j / m, s);
      const cc = o.color ? o.color(s, th) : [1, 1, 1];
      col.push(cc[0], cc[1], cc[2], 1);
    }
  }
  const W = m + 1;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) {
    const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  // pole caps
  const cap = (ring, dir) => {
    const c = ring.c.add(ring.T.scale(dir * 1e-4));
    const k = pos.length / 3;
    pos.push(c.x, c.y, c.z); uv.push(0.5, ring.s);
    const cc = o.color ? o.color(ring.s, 0) : [1, 1, 1]; col.push(cc[0], cc[1], cc[2], 1);
    const base = (ring === rings[0] ? 0 : (n - 1) * W);
    for (let j = 0; j < m; j++) dir < 0 ? idx.push(k, base + j, base + j + 1) : idx.push(k, base + j + 1, base + j);
  };
  cap(rings[0], -1); cap(rings[n - 1], 1);
  orient(pos, idx, rings[Math.floor(n / 2)].c, Math.floor(n / 2) * W);
  VertexData.ComputeNormals(pos, idx, nor);
  const vd = new VertexData();
  vd.positions = pos; vd.indices = idx; vd.normals = nor; vd.uvs = uv; vd.colors = col;
  vd._rings = rings; vd._W = W; vd._n = n; vd._m = m;
  return vd;
}

// make sure triangles face outward (normal of a mid-ring vertex points away from the spine)
function orient(pos, idx, center, vi) {
  const nor = [];
  VertexData.ComputeNormals(pos, idx, nor);
  const v = new Vector3(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]).subtract(center);
  const nn = new Vector3(nor[vi * 3], nor[vi * 3 + 1], nor[vi * 3 + 2]);
  if (Vector3.Dot(v, nn) < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
}

// tapered tube along a polyline-like function, radius r(s)
export function tube(center, r, { n = 16, m = 10, color, up } = {}) {
  return loft({ n, m, center, rx: s => r(s), ry: s => r(s), color, up });
}

// Hairs (setae) standing on a lofted surface. filter(s,θ) chooses where; returns VertexData.
// Each hair is a thin 3-sided cone leaning back along the spine (-T), like real ant setae.
export function hairs(vd, count, { seed = 1, len = 0.1, jitter = 0.5, lean = 0.6, r0 = 0.006, filter = () => true, curve = 0.3, color = [1, 1, 1] } = {}) {
  const R = rng(seed);
  const P = vd.positions, Nn = vd.normals, rings = vd._rings, W = vd._W, n = vd._n, m = vd._m;
  const pos = [], idx = [], col = [], uv = [];
  let made = 0, tries = 0;
  while (made < count && tries < count * 40) {
    tries++;
    const i = 1 + Math.floor(R() * (n - 2)), j = Math.floor(R() * m);
    const s = i / (n - 1), th = (j / m) * Math.PI * 2;
    if (!filter(s, th, R)) continue;
    const k = i * W + j;
    const base = new Vector3(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]);
    const nr = new Vector3(Nn[k * 3], Nn[k * 3 + 1], Nn[k * 3 + 2]).normalize();
    const T = rings[i].T;
    const L = len * (1 - jitter / 2 + R() * jitter);
    const lean1 = lean * (0.7 + R() * 0.6);
    const dir = nr.scale(Math.cos(lean1)).add(T.scale(-Math.sin(lean1))).normalize();
    // side vectors
    let sx = Vector3.Cross(dir, T); if (sx.length() < 1e-4) sx = Vector3.Cross(dir, new Vector3(0, 1, 0)); sx.normalize();
    const sy = Vector3.Cross(dir, sx).normalize();
    const segs = 3, k0 = pos.length / 3;
    // two-segment curved hair: base ring, mid ring, tip
    const mid = base.add(dir.scale(L * 0.5)).add(T.scale(-L * curve * 0.15));
    const tip = base.add(dir.scale(L)).add(T.scale(-L * curve * 0.45)).add(nr.scale(-L * curve * 0.1));
    const ringAt = (c, r) => { for (let q = 0; q < segs; q++) { const a = (q / segs) * Math.PI * 2; const v = c.add(sx.scale(Math.cos(a) * r)).add(sy.scale(Math.sin(a) * r)); pos.push(v.x, v.y, v.z); col.push(...color, 1); uv.push(q / segs, 0); } };
    ringAt(base.subtract(nr.scale(r0)), r0);
    ringAt(mid, r0 * 0.6);
    pos.push(tip.x, tip.y, tip.z); col.push(...color, 1); uv.push(0, 1);
    for (let q = 0; q < segs; q++) {
      const a = k0 + q, b = k0 + (q + 1) % segs, c = a + segs, d = b + segs;
      idx.push(a, b, c, b, d, c);
      idx.push(c, d, k0 + segs * 2);
    }
    made++;
  }
  const nor = [];
  VertexData.ComputeNormals(pos, idx, nor);
  const out = new VertexData();
  out.positions = pos; out.indices = idx; out.normals = nor; out.colors = col; out.uvs = uv;
  return out;
}

// combine several VertexData into one mesh; parts: [{ vd, mat }] with distinct materials → submeshes
export function meshFrom(name, scene, parts, { multi } = {}) {
  const mats = [...new Set(parts.map(p => p.mat))];
  const all = { positions: [], indices: [], normals: [], uvs: [], colors: [] };
  const ranges = [];
  // group by material so each material is one submesh
  for (const mat of mats) {
    const start = all.indices.length;
    for (const p of parts.filter(q => q.mat === mat)) {
      const off = all.positions.length / 3;
      all.positions.push(...p.vd.positions);
      all.normals.push(...p.vd.normals);
      all.uvs.push(...(p.vd.uvs || new Array(p.vd.positions.length / 3 * 2).fill(0)));
      all.colors.push(...(p.vd.colors || new Array(p.vd.positions.length / 3 * 4).fill(1)));
      for (const i of p.vd.indices) all.indices.push(i + off);
    }
    ranges.push([start, all.indices.length - start]);
  }
  const mesh = new Mesh(name, scene);
  const vd = new VertexData();
  Object.assign(vd, all);
  vd.applyToMesh(mesh, false);
  if (mats.length === 1) mesh.material = mats[0];
  else {
    const mm = multi || new MultiMaterial(name + '-mm', scene);
    mm.subMaterials = mats;
    mesh.material = mm;
    mesh.subMeshes = [];
    const nv = all.positions.length / 3;
    ranges.forEach(([start, count], i) => new SubMesh(i, 0, nv, start, count, mesh));
  }
  mesh.useVertexColors = true;
  return mesh;
}

// transform a VertexData in place by a function on positions (normals recomputed)
export function warp(vd, f) {
  for (let i = 0; i < vd.positions.length; i += 3) {
    const r = f(vd.positions[i], vd.positions[i + 1], vd.positions[i + 2]);
    vd.positions[i] = r[0]; vd.positions[i + 1] = r[1]; vd.positions[i + 2] = r[2];
  }
  const nor = [];
  VertexData.ComputeNormals(vd.positions, vd.indices, nor);
  vd.normals = nor;
  return vd;
}

// flat shape with thickness (mandibles, petiole scale): outline [[x,z],...] star-shaped around its centroid
export function plate(outline, thick, { color = [1, 1, 1], bulge = 0 } = {}) {
  const pos = [], idx = [], col = [], uv = [];
  const cx = outline.reduce((a, p) => a + p[0], 0) / outline.length, cz = outline.reduce((a, p) => a + p[1], 0) / outline.length;
  const n = outline.length;
  const push = (x, y, z) => { pos.push(x, y, z); col.push(...color, 1); uv.push(x, z); };
  push(cx, thick / 2 + bulge, cz); // 0 top center
  push(cx, -thick / 2 - bulge * 0.5, cz); // 1 bottom center
  for (const [x, z] of outline) push(x, thick / 2, z);   // 2..n+1 top rim
  for (const [x, z] of outline) push(x, -thick / 2, z);  // n+2.. bottom rim
  for (let i = 0; i < n; i++) {
    const a = 2 + i, b = 2 + (i + 1) % n, c = 2 + n + i, d = 2 + n + (i + 1) % n;
    idx.push(0, b, a, 1, c, d, a, b, c, b, d, c);
  }
  const nor = [];
  orient(pos, idx, new Vector3(cx, 0, cz), 2);
  VertexData.ComputeNormals(pos, idx, nor);
  const vd = new VertexData();
  vd.positions = pos; vd.indices = idx; vd.normals = nor; vd.colors = col; vd.uvs = uv;
  return vd;
}
