// The surface world at true scale (mm): soil with sand grains as boulders, grass tufts as towers,
// dew drops, leaf litter, a sugar drop (food) and the nest entrance. Height is an analytic
// function so ants can put their feet on it anywhere.
import {
  Mesh, MeshBuilder, VertexData, PBRMaterial, Color3, Matrix, Quaternion, Vector3, TransformNode,
  StandardMaterial,
} from '@babylonjs/core';
import { fbm, rng, clamp, smooth } from './noise.js';
import { soilTextures, bladeTextures, leafTint, organicNormal } from './textures.js';
import { loft, tube, meshFrom, warp } from './geom.js';

// ---- terrain height (mm) ----
export const NEST = { x: 0, z: 0 };
export function groundH(x, z) {
  let h = 2.2 * (fbm(x / 70 + 3, z / 70 + 7, 4, 1) - 0.5) + 0.5 * (fbm(x / 14, z / 14, 3, 2) - 0.5) + 0.1 * (fbm(x / 2.6, z / 2.6, 2, 3) - 0.5);
  // nest mound: a low crater of excavated soil around the entrance
  const d = Math.hypot(x - NEST.x, z - NEST.z);
  h += 1.1 * Math.exp(-Math.pow((d - 3.2) / 2.2, 2)) - 1.6 * Math.exp(-Math.pow(d / 1.3, 2));
  return h;
}

// paths the protagonist and her sisters walk (kept clear of big pebbles)
export const STAGE = { x: 6, z: 2, r: 36 };

function grainMesh(scene, seed, detail) {
  const s = MeshBuilder.CreateSphere('grain' + seed, { diameter: 2, segments: detail }, scene);
  const p = s.getVerticesData('position');
  const R = rng(seed);
  const a = [R() * 9, R() * 9, R() * 9];
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    const n = 1 + 0.28 * (fbm(x * 1.3 + a[0], y * 1.3 + z * 0.7 + a[1], 3, seed) - 0.5) * 2 + 0.06 * Math.sin(x * 7 + a[2]);
    // flatten facets a little (angular, weathered grains)
    p[i] = x * n; p[i + 1] = y * n * 0.8; p[i + 2] = z * n;
  }
  s.setVerticesData('position', p);
  const nor = []; VertexData.ComputeNormals(p, s.getIndices(), nor); s.setVerticesData('normal', nor);
  return s;
}

export function buildSurface(scene, { quality = 'high', shadows }) {
  const OFF = window.__off || new Set();
  const root = new TransformNode('surface', scene);
  const R = rng(5);
  const q = quality === 'high' ? 1 : quality === 'mid' ? 0.6 : 0.35;

  // ---- soil ----
  const soil = soilTextures(scene, quality === 'low' ? 512 : 1024);
  const soilMat = new PBRMaterial('soil', scene);
  soilMat.albedoTexture = soil.albedo; soilMat.bumpTexture = soil.normal; soilMat.bumpTexture.level = 1.4;
  soilMat.metallic = 0; soilMat.roughness = 0.93; soilMat.environmentIntensity = 0.7;
  soilMat.albedoColor = new Color3(0.8, 0.68, 0.56);
  for (const t of [soil.albedo, soil.normal]) { t.uScale = t.vScale = 10; }
  const mkGround = (name, size, sub, lower) => {
    const g = MeshBuilder.CreateGround(name, { width: size, height: size, subdivisions: sub, updatable: false }, scene);
    const p = g.getVerticesData('position');
    for (let i = 0; i < p.length; i += 3) p[i + 1] = groundH(p[i], p[i + 2]) - lower(p[i], p[i + 2]);
    g.setVerticesData('position', p);
    const nor = []; VertexData.ComputeNormals(p, g.getIndices(), nor); g.setVerticesData('normal', nor);
    const uv = g.getVerticesData('uv');
    for (let i = 0; i < uv.length; i += 2) { uv[i] = p[i / 2 * 3] / 10; uv[i + 1] = p[i / 2 * 3 + 2] / 10; }
    g.setVerticesData('uv', uv);
    g.material = soilMat; g.receiveShadows = true; g.parent = root; g.isPickable = false;
    return g;
  };
  const FINE = 140;
  mkGround('ground-fine', FINE, quality === 'low' ? 220 : 420, () => 0);
  mkGround('ground-far', 3000, 160, (x, z) => (Math.abs(x) < FINE / 2 - 1 && Math.abs(z) < FINE / 2 - 1) ? 0.4 : 0);
  soil.albedo.uScale = soil.albedo.vScale = 1; soil.normal.uScale = soil.normal.vScale = 1;

  // ---- sand grains and pebbles (thin instances with per-instance colour) ----
  const grainMat = new PBRMaterial('grain', scene);
  grainMat.metallic = 0; grainMat.roughness = 0.62; grainMat.albedoColor = new Color3(1, 1, 1);
  grainMat.bumpTexture = organicNormal(scene, 256, 10, 3, 51); grainMat.bumpTexture.level = 0.6;
  
  const palettes = [
    [0.62, 0.58, 0.52], [0.7, 0.66, 0.6], [0.5, 0.36, 0.26], [0.36, 0.26, 0.19], [0.18, 0.15, 0.13],
    [0.72, 0.52, 0.42], [0.8, 0.77, 0.7], [0.44, 0.4, 0.34], [0.58, 0.42, 0.28],
  ];
  // grains live in a grid of chunks (two detail levels each); a macro shot only draws the chunks in view
  const CH = 6, CHW = FINE / CH;
  const chunkOf = (x, z) => Math.min(CH - 1, Math.floor((x + FINE / 2) / CHW)) + CH * Math.min(CH - 1, Math.floor((z + FINE / 2) / CHW));
  // coarse grains keep some facets; fine sand is a few pixels on screen, a 4-segment blob is enough
  const grainProto = [grainMesh(scene, 1, 8), grainMesh(scene, 3, 4)];
  grainProto.forEach(g => { g.material = grainMat; g.setEnabled(false); });
  const buckets = Array.from({ length: CH * CH * 2 }, () => ({ m: [], c: [] }));
  const N = OFF.has('grains') ? 0 : Math.floor(16000 * q);
  const tmp = new Matrix();
  for (let i = 0; i < N; i++) {
    // denser near the centre, where the camera spends its time
    const rr = Math.pow(R(), 0.8) * FINE * 0.5, an = R() * Math.PI * 2;
    const x = Math.cos(an) * rr, z = Math.sin(an) * rr;
    // radius in mm: mostly fine sand (0.05–0.25 mm), some coarse grains, rare small pebbles
    let size = Math.exp(R.gauss() * 0.6 - 2.3);
    if (R() < 0.03) size *= 3.5;
    size = clamp(size, 0.03, 1.1);
    const dNest = Math.hypot(x, z);
    if (dNest < 1.4 && size > 0.2) continue;
    const bi = chunkOf(x, z) * 2 + (size > 0.25 ? 0 : 1);
    const sc = new Vector3(size * (0.8 + R() * 0.5), size * (0.6 + R() * 0.5), size * (0.8 + R() * 0.5));
    const rot = Quaternion.RotationYawPitchRoll(R() * 6.28, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6);
    const y = groundH(x, z) - sc.y * 0.2;
    Matrix.ComposeToRef(sc, rot, new Vector3(x, y, z), tmp);
    buckets[bi].m.push(...tmp.m);
    const c = R.pick(palettes); const v = 0.85 + R() * 0.3;
    buckets[bi].c.push(c[0] * v, c[1] * v, c[2] * v, 1);
  }
  const grains = [];
  buckets.forEach((bk, i) => {
    if (!bk.m.length) return;
    const g = grainProto[i % 2].clone('grains' + i);
    g.setEnabled(true); g.material = grainMat; g.parent = root; g.isPickable = false; g.receiveShadows = true;
    g.thinInstanceSetBuffer('matrix', new Float32Array(bk.m), 16, true);
    g.thinInstanceSetBuffer('color', new Float32Array(bk.c), 4, true);
    if (i % 2 === 0) { shadows?.addShadowCaster(g); g.metadata = { cheapShadow: true }; }
    grains.push(g);
  });

  // ---- soil crumbs (aggregates): soft, rounded lumps of the same soil ----
  const clodMat = new PBRMaterial('clod', scene);
  clodMat.albedoTexture = soil.albedo; clodMat.bumpTexture = soil.normal;
  clodMat.albedoColor = new Color3(0.62, 0.5, 0.4); clodMat.metallic = 0; clodMat.roughness = 0.95;
  const clod = grainMesh(scene, 9, 6);
  {
    const p = clod.getVerticesData('position');
    for (let i = 0; i < p.length; i += 3) { const k = 1 + 0.18 * (fbm(p[i] * 3, p[i + 1] * 3 + p[i + 2] * 2, 3, 77) - 0.5); p[i] *= k; p[i + 1] *= k * 0.7; p[i + 2] *= k; }
    clod.setVerticesData('position', p);
    const nor = []; VertexData.ComputeNormals(p, clod.getIndices(), nor); clod.setVerticesData('normal', nor);
    const uv = clod.getVerticesData('uv'); for (let i = 0; i < uv.length; i++) uv[i] *= 0.08; clod.setVerticesData('uv', uv);
  }
  const clodData = Array.from({ length: CH * CH }, () => []);
  for (let i = 0; i < (OFF.has('clods') ? 0 : 5000 * q); i++) {
    const rr = Math.pow(R(), 0.7) * FINE * 0.5, an = R() * Math.PI * 2;
    const x = Math.cos(an) * rr, z = Math.sin(an) * rr;
    const size = clamp(Math.exp(R.gauss() * 0.5 - 1.6), 0.08, 0.7);
    Matrix.ComposeToRef(new Vector3(size * (1 + R() * 0.4), size * (0.6 + R() * 0.3), size * (1 + R() * 0.4)), Quaternion.RotationYawPitchRoll(R() * 6.28, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4), new Vector3(x, groundH(x, z) - size * 0.25, z), tmp);
    clodData[chunkOf(x, z)].push(...tmp.m);
  }
  clod.material = clodMat; clod.setEnabled(false);
  clodData.forEach((d, i) => {
    if (!d.length) return;
    const c = clod.clone('clods' + i); c.setEnabled(true); c.parent = root; c.isPickable = false; c.receiveShadows = true;
    c.thinInstanceSetBuffer('matrix', new Float32Array(d), 16, true);
    shadows?.addShadowCaster(c); c.metadata = { cheapShadow: true };
  });

  // ---- grass ----
  const bt = bladeTextures(scene);
  const grassMat = new PBRMaterial('grass', scene);
  grassMat.albedoColor = new Color3(0.13, 0.26, 0.05);
  grassMat.albedoTexture = bt.tint;
  grassMat.bumpTexture = bt.normal; grassMat.bumpTexture.level = 0.8;
  grassMat.metallic = 0; grassMat.roughness = 0.42;
  grassMat.backFaceCulling = false; grassMat.twoSidedLighting = true;
  grassMat.subSurface.isTranslucencyEnabled = !OFF.has('sss'); grassMat.subSurface.translucencyIntensity = 0.7;
  grassMat.subSurface.tintColor = new Color3(0.5, 0.8, 0.15);
  grassMat.clearCoat.isEnabled = true; grassMat.clearCoat.intensity = 0.35; grassMat.clearCoat.roughness = 0.2;
  const blades = [0.25, 0.5, 0.8].map((bend, k) => {
    const pos = [], uv = [], idx = [];
    const S = 24;
    for (let i = 0; i <= S; i++) {
      const v = i / S;
      const w = 0.5 * Math.pow(1 - Math.pow(v, 2.2), 0.6) * (v < 0.03 ? 0.7 + v * 10 : 1);
      const z = bend * v * v, yy = v * (1 - bend * 0.25 * v);
      const fold = 0.12 * w;
      pos.push(-w, yy, z + fold, 0, yy, z, w, yy, z + fold);
      uv.push(0, v, 0.5, v, 1, v);
      if (i < S) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    }
    const m = new Mesh('blade' + k, scene);
    const vd = new VertexData(); vd.positions = pos; vd.indices = idx; vd.uvs = uv;
    const nor = []; VertexData.ComputeNormals(pos, idx, nor); vd.normals = nor;
    vd.applyToMesh(m);
    m.material = grassMat; m.parent = root; m.isPickable = false; m.receiveShadows = true;
    shadows?.addShadowCaster(m);
    m.alwaysSelectAsActiveMesh = true;
    return m;
  });
  // tufts around a clearing; the clearing (paths) stays open
  // an open stage of bare soil around STAGE, grass tufts around its rim and beyond
  const tufts = [
    [-8, 42, 30], [22, 40, 26], [52, 26, 24], [60, -8, 22], [40, -34, 26], [8, -38, 24], [-26, -38, 22], [-48, -16, 28],
    [-52, 14, 24], [-44, 50, 22], [72, 44, 24], [-70, -46, 26], [0, 66, 30], [36, 66, 24], [74, -40, 24], [-72, 30, 26],
  ];
  // the lawn beyond: rings of tufts so wide shots from above stay green
  const RT = rng(77);
  for (let i = 0; i < 70 * (0.5 + 0.5 * q); i++) {
    const a = RT() * 6.28, r = 85 + RT() * 190;
    tufts.push([STAGE.x + Math.cos(a) * r, STAGE.z + Math.sin(a) * r, 16 + Math.floor(RT() * 14)]);
  }
  const bladeData = [[], [], []];
  const bladeInfo = [];
  for (const [tx, tz, n] of tufts) {
    const cnt = OFF.has('grass') ? 0 : Math.round(n * (0.6 + 0.4 * q));
    for (let i = 0; i < cnt; i++) {
      const r = Math.pow(R(), 0.6) * 3.5, a = R() * 6.28;
      const x = tx + Math.cos(a) * r, z = tz + Math.sin(a) * r;
      const dS = Math.hypot(tx - STAGE.x, tz - STAGE.z);
      const near = dS < 90;
      const L = near ? 35 + R() * 45 : 40 + R() * 90, W = 2.4 + R() * 2.6;
      // near the stage the blades lean outward, so shots from above keep the stage open
      const out = Math.atan2(tx - STAGE.x, tz - STAGE.z);
      const yaw = near ? out + (R() - 0.5) * 1.6 : a + (R() - 0.5) * 1.2;
      const lean = near ? 0.05 + R() * 0.25 : (R() - 0.3) * 0.35;
      const k = Math.floor(R() * 3);
      bladeInfo.push({ k, x, z, L, W, yaw, lean, ph: R() * 6.28, i: bladeData[k].length / 16 });
      bladeData[k].push(...new Array(16).fill(0));
    }
  }
  // scattered single blades lying low near the paths
  for (let i = 0; i < 60 * q; i++) {
    const x = (R() - 0.5) * FINE * 0.95, z = (R() - 0.5) * FINE * 0.95;
    if (Math.hypot(x - STAGE.x, z - STAGE.z) < STAGE.r) continue;
    const k = 2;
    bladeInfo.push({ k, x, z, L: 20 + R() * 40, W: 2 + R() * 2, yaw: R() * 6.28, lean: 1.1 + R() * 0.3, ph: R() * 6.28, i: bladeData[k].length / 16 });
    bladeData[k].push(...new Array(16).fill(0));
  }
  blades.forEach((b, k) => b.thinInstanceSetBuffer('matrix', new Float32Array(bladeData[k]), 16, false));
  const bladeBuf = bladeData.map(d => new Float32Array(d));
  const placeBlades = (t) => {
    for (const bi of bladeInfo) {
      const sway = Math.sin(t * 0.9 + bi.ph) * 0.03 + Math.sin(t * 2.3 + bi.ph * 2) * 0.01;
      const rot = Quaternion.RotationYawPitchRoll(bi.yaw, bi.lean + sway, 0);
      Matrix.ComposeToRef(new Vector3(bi.W, bi.L, bi.L), rot, new Vector3(bi.x, groundH(bi.x, bi.z) - 0.5, bi.z), tmp);
      bladeBuf[bi.k].set(tmp.m, bi.i * 16);
    }
    blades.forEach((b, k) => b.thinInstanceBufferUpdated('matrix'));
  };
  blades.forEach((b, k) => b.thinInstanceSetBuffer('matrix', bladeBuf[k], 16, false));
  placeBlades(0);
  // a special blade the protagonist climbs / falls from (chapter "fizik"): near (18, 10)
  const heroBlade = { x: 16, z: 12, L: 70, W: 4, yaw: -0.7, lean: 0.55 };

  // ---- dew drops ----
  const dewMat = new PBRMaterial('dew', scene);
  dewMat.metallic = 0; dewMat.roughness = 0.07; dewMat.albedoColor = new Color3(0.02, 0.02, 0.02);
  dewMat.subSurface.isRefractionEnabled = !OFF.has('dew'); dewMat.subSurface.refractionIntensity = 1;
  dewMat.subSurface.indexOfRefraction = 1.33; dewMat.subSurface.tintColor = new Color3(0.95, 1, 0.97);
  dewMat.environmentIntensity = 0.55; dewMat.specularIntensity = 1.5;
  const dew = MeshBuilder.CreateSphere('dew', { diameter: 1, segments: 32 }, scene);
  dew.material = dewMat; dew.parent = root; dew.isPickable = false;
  const dewData = [];
  const dewList = [];
  const addDew = (x, y, z, d, flat = 0.82) => {
    Matrix.ComposeToRef(new Vector3(d, d * flat, d), Quaternion.Identity(), new Vector3(x, y + d * flat * 0.45, z), tmp);
    dewData.push(...tmp.m); dewList.push({ x, y, z, d });
  };
  // drops on the ground near the route + a big one the ant drinks from
  addDew(9, groundH(9, 6), 6, 3.0);
  addDew(15, groundH(15, 1), 1, 1.2); addDew(-19, groundH(-19, 12), 12, 0.8); addDew(22, groundH(22, -6), -6, 1.8);
  for (let i = 0; i < 80 * q; i++) {
    const x = (R() - 0.5) * 120, z = (R() - 0.5) * 120;
    if (Math.hypot(x - STAGE.x, z - STAGE.z) < STAGE.r * 0.8) continue;
    addDew(x, groundH(x, z), z, 0.3 + Math.pow(R(), 3) * 2.2);
  }
  dew.thinInstanceSetBuffer('matrix', new Float32Array(dewData), 16, true);
  dew.alwaysSelectAsActiveMesh = true;

  // ---- leaf litter and twigs ----
  const lt = leafTint(scene);
  const leafMat = new PBRMaterial('leaf', scene);
  leafMat.albedoTexture = lt.tint; leafMat.bumpTexture = lt.normal; leafMat.albedoColor = new Color3(0.42, 0.27, 0.13);
  leafMat.metallic = 0; leafMat.roughness = 0.7; leafMat.backFaceCulling = false; leafMat.twoSidedLighting = true;
  leafMat.subSurface.isTranslucencyEnabled = true; leafMat.subSurface.translucencyIntensity = 0.6; leafMat.subSurface.tintColor = new Color3(0.9, 0.5, 0.15);
  // a dry, curled leaf: elliptic outline, raised midrib, edges curling up
  const leaf = new Mesh('leaf', scene);
  {
    const pos = [], uv = [], idx = [], U = 16, V = 32;
    for (let j = 0; j <= V; j++) for (let i = 0; i <= U; i++) {
      const u = i / U * 2 - 1, v = j / V;
      const w = 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.02)), 0.75) * (1 - 0.25 * v);
      const x = u * w, z = (v - 0.5) * 1.6;
      const y = 0.35 * u * u * w + 0.06 * Math.sin(v * 9 + u * 2) + 0.05 * (fbm(u * 3, v * 5, 2, 9) - 0.5) + 0.12 * v * v;
      pos.push(x, y, z); uv.push(u * 0.5 + 0.5, v);
      if (i < U && j < V) { const a = j * (U + 1) + i; idx.push(a, a + U + 1, a + 1, a + 1, a + U + 1, a + U + 2); }
    }
    const vd = new VertexData(); vd.positions = pos; vd.indices = idx; vd.uvs = uv;
    const nor = []; VertexData.ComputeNormals(pos, idx, nor); vd.normals = nor; vd.applyToMesh(leaf);
  }
  leaf.material = leafMat; leaf.parent = root; leaf.isPickable = false; leaf.receiveShadows = true;
  shadows?.addShadowCaster(leaf);
  const leafData = [];
  for (let i = 0; i < 26 * q + 6; i++) {
    const x = (R() - 0.5) * 130, z = (R() - 0.5) * 130;
    if (Math.hypot(x - STAGE.x, z - STAGE.z) < STAGE.r || Math.hypot(x + 22, z - 22) < 16) continue;
    const s = 6 + R() * 14;
    Matrix.ComposeToRef(new Vector3(s, s, s), Quaternion.RotationYawPitchRoll(R() * 6.28, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3), new Vector3(x, groundH(x, z) + 0.1, z), tmp);
    leafData.push(...tmp.m);
  }
  leaf.thinInstanceSetBuffer('matrix', new Float32Array(leafData), 16, true);
  leaf.alwaysSelectAsActiveMesh = true;

  const barkMat = new PBRMaterial('bark', scene);
  barkMat.albedoColor = new Color3(0.3, 0.22, 0.15); barkMat.metallic = 0; barkMat.roughness = 0.8;
  barkMat.bumpTexture = organicNormal(scene, 256, 16, 5, 61); barkMat.bumpTexture.vScale = 4;
  const twigs = [[-44, -4, 0.4, 26, 0.9], [44, -24, 2.2, 30, 1.2], [14, -34, 1.1, 18, 0.7]];
  for (const [x, z, yaw, L, r] of twigs) {
    const vd = tube(s => [0, 0, s * L], s => r * (1 - 0.3 * s) * (1 + 0.05 * Math.sin(s * 40)), { n: 40, m: 14 });
    const m = meshFrom('twig', scene, [{ vd, mat: barkMat }]);
    m.position.set(x, groundH(x, z) + r * 0.6, z); m.rotation.y = yaw; m.parent = root; m.receiveShadows = true;
    shadows?.addShadowCaster(m);
  }

  // ---- floating pollen / dust in the sunbeams ----
  const moteMat = new StandardMaterial('mote', scene);
  moteMat.emissiveColor = new Color3(1.4, 1.1, 0.7); moteMat.disableLighting = true; moteMat.alpha = 0.7;
  const mote = MeshBuilder.CreateSphere('mote', { diameter: 1, segments: 6 }, scene);
  mote.material = moteMat; mote.parent = root; mote.isPickable = false;
  const motes = [];
  for (let i = 0; i < 160; i++) motes.push({ x: (R() - 0.5) * 80, y: 2 + R() * 30, z: (R() - 0.5) * 80, s: 0.04 + R() * 0.12, ph: R() * 6.28, sp: 0.2 + R() * 0.6 });
  const moteBuf = new Float32Array(motes.length * 16);
  mote.thinInstanceSetBuffer('matrix', moteBuf, 16, false);
  mote.alwaysSelectAsActiveMesh = true;
  const placeMotes = (t) => {
    motes.forEach((m, i) => {
      const x = m.x + Math.sin(t * 0.13 * m.sp + m.ph) * 6 + t * 0.4 * m.sp;
      const y = m.y + Math.sin(t * 0.21 * m.sp + m.ph * 2) * 3;
      const z = m.z + Math.cos(t * 0.11 * m.sp + m.ph) * 6;
      const xx = ((x + 40) % 80 + 80) % 80 - 40;
      Matrix.ComposeToRef(new Vector3(m.s, m.s, m.s), Quaternion.Identity(), new Vector3(xx, y, z), tmp);
      moteBuf.set(tmp.m, i * 16);
    });
    mote.thinInstanceBufferUpdated('matrix');
  };

  // ---- food: a spilled drop of sugary liquid ----
  const syrupMat = new PBRMaterial('syrup', scene);
  syrupMat.metallic = 0; syrupMat.roughness = 0.05; syrupMat.albedoColor = new Color3(0.55, 0.36, 0.1);
  syrupMat.subSurface.isRefractionEnabled = true; syrupMat.subSurface.indexOfRefraction = 1.45;
  syrupMat.subSurface.tintColor = new Color3(1, 0.82, 0.48); syrupMat.subSurface.tintColorAtDistance = 3;
  syrupMat.subSurface.isTranslucencyEnabled = true; syrupMat.subSurface.translucencyIntensity = 0.8;
  const FOOD = { x: 38, z: 14 };
  const food = MeshBuilder.CreateSphere('food', { diameter: 1, segments: 40 }, scene);
  food.scaling.set(7, 1.6, 5.5); food.position.set(FOOD.x, groundH(FOOD.x, FOOD.z) + 0.3, FOOD.z);
  food.material = syrupMat; food.parent = root; food.isPickable = false;

  return {
    root, groundH, placeBlades, placeMotes, dewList, heroBlade, FOOD, food, grassMat, soilMat, dewMat,
    setVisible: v => root.setEnabled(v),
  };
}

// a single hero grass blade with a known surface, so an ant can stand on it.
// Returns the mesh and at(v, u) → { pos, up, along } in world space (v 0..1 base→tip, u −1..1 across)
export function makeBlade(scene, material, { x, z, L = 60, W = 4, bend = 0.8, yaw = 0, lean = 0.4, name = 'heroBlade' }) {
  const local = (v, u) => {
    const w = 0.5 * Math.pow(1 - Math.pow(v, 2.2), 0.6);
    const yy = v * (1 - bend * 0.25 * v), zz = bend * v * v + 0.12 * w * Math.abs(u);
    return new Vector3(u * w * W, yy * L, zz * L);
  };
  const S = 40, pos = [], uv = [], idx = [];
  for (let i = 0; i <= S; i++) {
    const v = i / S;
    for (const u of [-1, 0, 1]) { const p = local(v, u); pos.push(p.x, p.y, p.z); uv.push((u + 1) / 2, v); }
    if (i < S) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
  }
  const m = new Mesh(name, scene);
  const vd = new VertexData(); vd.positions = pos; vd.indices = idx; vd.uvs = uv;
  const nor = []; VertexData.ComputeNormals(pos, idx, nor); vd.normals = nor; vd.applyToMesh(m);
  m.material = material; m.receiveShadows = true; m.isPickable = false;
  const base = new Vector3(x, groundH(x, z) - 0.5, z);
  m.position.copyFrom(base); m.rotation.set(lean, yaw, 0);
  m.computeWorldMatrix(true);
  const W4 = m.getWorldMatrix();
  const at = (v, u = 0) => {
    const p = Vector3.TransformCoordinates(local(v, u), W4);
    const pv = Vector3.TransformCoordinates(local(Math.min(1, v + 0.01), u), W4);
    const pu = Vector3.TransformCoordinates(local(v, u + 0.05), W4);
    const along = pv.subtract(p).normalize(), across = pu.subtract(p).normalize();
    let up = Vector3.Cross(along, across).normalize();
    if (up.y < 0) up = up.scale(-1);
    return { pos: p, up, along };
  };
  return { mesh: m, at };
}

export { grainMesh };
