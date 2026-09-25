// The other living things and objects, modelled at true scale (mm): black bean aphids (Aphis
// fabae), a seven-spot ladybird, a broad-leaved plant stem, a seed, and brood (eggs, larvae,
// cocoons). Static poses, instanced where many are needed.
import { PBRMaterial, Color3, Vector3, Mesh, VertexData, TransformNode, MeshBuilder } from '@babylonjs/core';
import { loft, tube, hairs, meshFrom, warp } from './geom.js';
import { spline } from './ant.js';
import { organicNormal, leafTint } from './textures.js';
import { fbm, rng } from './noise.js';

const mat = (scene, name, albedo, o = {}) => {
  const m = new PBRMaterial(name, scene);
  m.albedoColor = new Color3(...albedo); m.metallic = 0; m.roughness = o.rough ?? 0.6;
  if (o.coat) { m.clearCoat.isEnabled = true; m.clearCoat.intensity = o.coat; m.clearCoat.roughness = o.coatRough ?? 0.15; }
  if (o.trans) { m.subSurface.isTranslucencyEnabled = true; m.subSurface.translucencyIntensity = o.trans; m.subSurface.tintColor = new Color3(...(o.tint || [1, 0.9, 0.7])); }
  if (o.bump) { m.bumpTexture = o.bump; m.bumpTexture.level = o.bumpLevel ?? 0.6; }
  if (o.sheen) { m.sheen.isEnabled = true; m.sheen.intensity = o.sheen; m.sheen.color = new Color3(...(o.sheenColor || [0.6, 0.65, 0.6])); }
  return m;
};

// black bean aphid, ~2.2 mm, head toward +z, lying on its belly (−y), legs splayed
export function buildAphid(scene) {
  const skin = mat(scene, 'aphid', [0.07, 0.08, 0.05], { rough: 0.75, sheen: 0.5, sheenColor: [0.45, 0.5, 0.45], bump: organicNormal(scene, 128, 8, 2, 71), bumpLevel: 0.4 });
  const limb = mat(scene, 'aphid-leg', [0.05, 0.05, 0.035], { rough: 0.6, trans: 0.3, tint: [0.6, 0.7, 0.3] });
  const w = spline([0.05, 0.2, 0.3, 0.38, 0.52, 0.62, 0.64, 0.58, 0.4, 0.15]);
  const h = spline([0.05, 0.16, 0.24, 0.3, 0.42, 0.5, 0.5, 0.44, 0.3, 0.1]);
  const body = loft({ n: 40, m: 28, center: s => [0, 0.45 + 0.08 * Math.sin(s * Math.PI), 1.1 - s * 2.2], rx: s => w(s), ry: s => h(s), p: 2 });
  const parts = [{ vd: body, mat: skin }];
  // siphunculi (cornicles) and cauda
  for (const k of [-1, 1]) parts.push({ vd: tube(s => [k * (0.28 + s * 0.08), 0.8 + s * 0.12, -0.55 - s * 0.35], s => 0.05 * (1 - s * 0.3), { n: 8, m: 8 }), mat: skin });
  parts.push({ vd: tube(s => [0, 0.52 - s * 0.05, -1.08 - s * 0.2], s => 0.07 * (1 - s), { n: 6, m: 8 }), mat: skin });
  // antennae: long, swept back over the body
  for (const k of [-1, 1]) parts.push({ vd: tube(s => [k * (0.12 + s * 0.5), 0.62 + Math.sin(s * 2.4) * 0.35, 1.05 - s * 1.2 + Math.sin(s * 3) * 0.3], s => 0.025 * (1 - s * 0.5), { n: 20, m: 6 }), mat: limb });
  // legs: femur up and out, tibia down to the surface
  const legs = [[0.55, 0.7], [0.1, 0.8], [-0.4, 0.95]];
  for (const [z, len] of legs) for (const k of [-1, 1]) {
    const hip = [k * 0.3, 0.25, z], knee = [k * (0.3 + len * 0.7), 0.6, z + (z > 0 ? 0.35 : -0.2)], foot = [k * (0.3 + len * 1.1), -0.05, z + (z > 0 ? 0.6 : -0.5)];
    parts.push({ vd: tube(s => hip.map((v, i) => v + (knee[i] - v) * s), () => 0.04, { n: 4, m: 6 }), mat: limb });
    parts.push({ vd: tube(s => knee.map((v, i) => v + (foot[i] - v) * s), s => 0.03 * (1 - s * 0.4), { n: 4, m: 6 }), mat: limb });
  }
  // beak (rostrum) pointing down into the plant
  parts.push({ vd: tube(s => [0, 0.3 - s * 0.35, 0.9 - s * 0.15], s => 0.04 * (1 - s * 0.6), { n: 5, m: 6 }), mat: limb });
  const m = meshFrom('aphid', scene, parts);
  m.isVisible = false;
  return m;
}

// seven-spot ladybird, ~7 mm, head toward +z
export function buildLadybird(scene) {
  const spots = [[0, 0.95, -0.2], [0.55, 0.62, 0.35], [-0.55, 0.62, 0.35], [0.7, 0.5, -0.45], [-0.7, 0.5, -0.45], [0.35, 0.55, -0.95], [-0.35, 0.55, -0.95]];
  const elytra = loft({
    n: 40, m: 48,
    center: s => [0, 0, 1.4 - s * 3.3], rx: s => 2.8 * Math.pow(Math.sin(Math.PI * s), 0.55), ry: (s, th) => (Math.sin(th) > 0 ? 2.3 : 0.25) * Math.pow(Math.sin(Math.PI * s), 0.55),
    color: () => [1, 1, 1],
  });
  // spots and the black suture line by vertex colour
  const P = elytra.positions, C = elytra.colors;
  for (let i = 0; i < P.length / 3; i++) {
    const v = new Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    const n = new Vector3(v.x / 2.8, v.y / 2.3, (v.z + 0.25) / 1.65).normalize();
    let black = Math.abs(v.x) < 0.05 && v.y > 0.2;
    for (const s of spots) if (Vector3.Distance(n, new Vector3(...s).normalize()) < (s[0] === 0 ? 0.3 : 0.22)) black = true;
    const c = black ? [0.02, 0.02, 0.02] : [1, 1, 1];
    C[i * 4] = c[0]; C[i * 4 + 1] = c[1]; C[i * 4 + 2] = c[2];
  }
  const red = mat(scene, 'lady-red', [0.75, 0.05, 0.02], { rough: 0.25, coat: 1, coatRough: 0.05 });
  const black = mat(scene, 'lady-black', [0.02, 0.02, 0.02], { rough: 0.3, coat: 0.8, coatRough: 0.08 });
  const white = mat(scene, 'lady-white', [0.85, 0.82, 0.75], { rough: 0.35, coat: 0.6 });
  const pron = loft({ n: 20, m: 30, center: s => [0, 0.5, 1.5 + s * 0.9], rx: s => 1.9 * Math.pow(Math.sin(Math.PI * (0.5 + s * 0.5)), 0.4) + 0.2, ry: (s, th) => (Math.sin(th) > 0 ? 0.9 : 0.3) * Math.pow(Math.sin(Math.PI * (0.5 + s * 0.5)), 0.5) });
  const head = loft({ n: 16, m: 20, center: s => [0, 0.2, 2.25 + s * 0.6], rx: s => 0.8 * Math.sin(Math.PI * s) ** 0.6, ry: s => 0.5 * Math.sin(Math.PI * s) ** 0.6 });
  const patches = [-1, 1].map(k => loft({ n: 10, m: 12, center: s => [k * 1.3, 0.75, 1.85 + s * 0.5], rx: s => 0.42 * Math.sin(Math.PI * s), ry: s => 0.35 * Math.sin(Math.PI * s) }));
  const parts = [{ vd: elytra, mat: red }, { vd: pron, mat: black }, { vd: head, mat: black }, ...patches.map(vd => ({ vd, mat: white }))];
  for (const [z, k] of [[1.4, 1], [1.4, -1], [0.3, 1], [0.3, -1], [-0.8, 1], [-0.8, -1]]) {
    const a = [k * 1.2, -0.2, z], b = [k * 2.4, -0.1, z + 0.4 * Math.sign(z + 0.1)], c = [k * 3.0, -1.05, z + 0.7 * Math.sign(z + 0.1)];
    parts.push({ vd: tube(s => a.map((v, i) => v + (b[i] - v) * s), () => 0.14, { n: 4, m: 8 }), mat: black });
    parts.push({ vd: tube(s => b.map((v, i) => v + (c[i] - v) * s), s => 0.1 * (1 - s * 0.4), { n: 4, m: 8 }), mat: black });
  }
  for (const k of [-1, 1]) parts.push({ vd: tube(s => [k * (0.3 + s * 0.7), 0.3 + s * 0.2, 2.7 + s * 0.7], s => 0.05 + s * 0.05, { n: 6, m: 6 }), mat: black });
  const m = meshFrom('ladybird', scene, parts);
  m.scaling.setAll(1);
  return m;
}

// a grass seed the ant carries (~3.2 mm)
export function buildSeed(scene) {
  const m = mat(scene, 'seed', [0.52, 0.38, 0.2], { rough: 0.55, coat: 0.25, bump: organicNormal(scene, 128, 20, 2, 81), bumpLevel: 0.5 });
  const vd = loft({ n: 30, m: 24, center: s => [0, 0, (s - 0.5) * 3.2], rx: s => 0.75 * Math.pow(Math.sin(Math.PI * s), 0.7), ry: s => 0.6 * Math.pow(Math.sin(Math.PI * s), 0.7) * (1 - 0.15 * Math.cos(s * 3)) });
  warp(vd, (x, y, z) => [x, y - Math.exp(-x * x * 40) * 0.12 * (y > 0 ? 1 : 0), z]);
  const mesh = meshFrom('seed', scene, [{ vd, mat: m }]);
  return mesh;
}

// broad-leaved plant: a stem with fine hairs and two leaves; base at origin, stem along +y
export function buildPlant(scene, { height = 70, radius = 1.5 } = {}) {
  const root = new TransformNode('plant', scene);
  const green = mat(scene, 'stem', [0.16, 0.34, 0.08], { rough: 0.45, trans: 0.6, tint: [0.5, 0.9, 0.2], bump: organicNormal(scene, 128, 24, 1.5, 91), bumpLevel: 0.3, coat: 0.2 });
  const hairMat = mat(scene, 'stem-hair', [0.6, 0.7, 0.5], { rough: 0.4, trans: 1, tint: [0.8, 1, 0.6] });
  const bend = s => [Math.sin(s * 1.6) * 3, s * height, Math.sin(s * 2.2) * 1.5];
  const vd = tube(bend, s => radius * (1.1 - 0.35 * s), { n: 90, m: 20 });
  const hr = hairs(vd, 420, { seed: 5, len: 0.35, r0: 0.02, lean: 0.9, color: [1, 1, 1] });
  const stem = meshFrom('stem', scene, [{ vd, mat: green }, { vd: hr, mat: hairMat }]);
  stem.parent = root;
  // leaves
  const lt = leafTint(scene, 256);
  const leafMat = mat(scene, 'bean-leaf', [0.14, 0.32, 0.07], { rough: 0.5, trans: 1.1, tint: [0.45, 0.95, 0.15], coat: 0.3 });
  leafMat.albedoTexture = lt.tint; leafMat.bumpTexture = lt.normal; leafMat.bumpTexture.level = 0.5;
  leafMat.backFaceCulling = false; leafMat.twoSidedLighting = true;
  const leaf = (L, W, s, yaw, pitch) => {
    const pos = [], uv = [], idx = [], U = 14, V = 30;
    for (let j = 0; j <= V; j++) for (let i = 0; i <= U; i++) {
      const u = i / U * 2 - 1, v = j / V;
      const w = W * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.98 + 0.02)), 0.7);
      pos.push(u * w, -Math.abs(u) * w * 0.15 + v * v * L * 0.15 - 0.02 * L * Math.sin(v * 3), v * L);
      uv.push(u * 0.5 + 0.5, v);
      if (i < U && j < V) { const a = j * (U + 1) + i; idx.push(a, a + U + 1, a + 1, a + 1, a + U + 1, a + U + 2); }
    }
    const m = new Mesh('bleaf', scene);
    const d = new VertexData(); d.positions = pos; d.indices = idx; d.uvs = uv;
    const n = []; VertexData.ComputeNormals(pos, idx, n); d.normals = n; d.applyToMesh(m);
    m.material = leafMat; m.parent = root;
    const p = bend(s); m.position.set(p[0], p[1], p[2]); m.rotation.set(pitch, yaw, 0);
    return m;
  };
  const leaves = [leaf(34, 11, 0.62, 0.9, -0.5), leaf(30, 10, 0.86, -2.1, -0.35), leaf(22, 8, 0.4, -0.3, -0.7)];
  return { root, stem, leaves, bend, radius: s => radius * (1.1 - 0.35 * s), height, parts: [stem, ...leaves] };
}

// brood: egg, larva, cocoon
export function buildBrood(scene) {
  const eggMat = mat(scene, 'egg', [0.92, 0.9, 0.82], { rough: 0.2, coat: 0.6, trans: 1, tint: [1, 0.95, 0.85] });
  const larvaMat = mat(scene, 'larva', [0.9, 0.86, 0.74], { rough: 0.35, coat: 0.3, trans: 1.2, tint: [1, 0.85, 0.6] });
  const cocoonMat = mat(scene, 'cocoon', [0.78, 0.66, 0.46], { rough: 0.8, bump: organicNormal(scene, 128, 40, 3, 101), bumpLevel: 0.7, sheen: 0.4, sheenColor: [0.9, 0.85, 0.7] });
  const spotMat = mat(scene, 'meconium', [0.08, 0.06, 0.05], { rough: 0.6 });
  const egg = meshFrom('egg', scene, [{ vd: loft({ n: 16, m: 16, center: s => [0, 0, (s - 0.5) * 0.55], rx: s => 0.19 * Math.sin(Math.PI * s) ** 0.6, ry: s => 0.17 * Math.sin(Math.PI * s) ** 0.6 }), mat: eggMat }]);
  // larva: a plump, segmented C-shaped grub with a small head
  const lv = loft({
    n: 60, m: 22,
    center: s => { const a = -1.2 + s * 2.6; return [0, Math.cos(a) * 0.9 - 0.2, Math.sin(a) * 1.0]; },
    rx: s => (0.55 * Math.pow(Math.sin(Math.PI * (0.08 + s * 0.9)), 0.7)) * (1 + 0.05 * Math.sin(s * 70)),
    ry: s => (0.5 * Math.pow(Math.sin(Math.PI * (0.08 + s * 0.9)), 0.7)) * (1 + 0.05 * Math.sin(s * 70)),
    up: [1, 0, 0],
  });
  const lh = hairs(lv, 60, { seed: 3, len: 0.12, r0: 0.01, lean: 0.3, color: [1, 1, 1] });
  const larva = meshFrom('larva', scene, [{ vd: lv, mat: larvaMat }, { vd: lh, mat: larvaMat }]);
  const cc = loft({ n: 30, m: 24, center: s => [0, 0, (s - 0.5) * 3.6], rx: s => 0.8 * Math.sin(Math.PI * s) ** 0.55, ry: s => 0.78 * Math.sin(Math.PI * s) ** 0.55 });
  const spot = loft({ n: 10, m: 12, center: s => [0, 0, -1.72 + s * 0.12], rx: s => 0.3 * Math.sin(Math.PI * s) ** 0.5, ry: s => 0.3 * Math.sin(Math.PI * s) ** 0.5 });
  const cocoon = meshFrom('cocoon', scene, [{ vd: cc, mat: cocoonMat }, { vd: spot, mat: spotMat }]);
  for (const m of [egg, larva, cocoon]) m.isVisible = false;
  return { egg, larva, cocoon };
}

// a drop of honeydew / water: shared material factory
export function dropMaterial(scene, kind = 'honey') {
  const m = new PBRMaterial('drop-' + kind, scene);
  m.metallic = 0; m.roughness = 0.03;
  m.albedoColor = kind === 'honey' ? new Color3(0.3, 0.2, 0.05) : new Color3(0.02, 0.02, 0.02);
  m.subSurface.isRefractionEnabled = true; m.subSurface.indexOfRefraction = kind === 'honey' ? 1.4 : 1.33;
  m.subSurface.tintColor = kind === 'honey' ? new Color3(1, 0.85, 0.5) : new Color3(0.96, 1, 0.98);
  m.environmentIntensity = 1.2;
  return m;
}
