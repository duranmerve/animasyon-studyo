// ============================================================
//  HEART — SDF chambers (surface nets), beating walls, valves
// ============================================================
function makeValve(n, C, A, Ra, L, color) {
  const e1 = Math.abs(A.y) < 0.9 ? V3(0, 1, 0).cross(A).normalize() : V3(1, 0, 0).cross(A).normalize();
  const e2 = V3().crossVectors(A, e1).normalize();
  const NP = 14, NR = 8, per = (NP + 1) * (NR + 1);
  const pos = new Float32Array(per * n * 3); const idx = [];
  for (let j = 0; j < n; j++) for (let a = 0; a < NP; a++) for (let b = 0; b < NR; b++) {
    const o = j * per, i0 = o + a * (NR + 1) + b, i1 = i0 + NR + 1; idx.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, sheen: 1, sheenColor: new THREE.Color(0xfff0f0), clearcoat: 0.6, transparent: true, opacity: 0.93, side: THREE.DoubleSide, emissive: new THREE.Color(color).multiplyScalar(0.12) });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  const edge = []; // free-edge points for chordae
  const update = (k) => {
    edge.length = 0;
    for (let j = 0; j < n; j++) {
      const g = 0.05, f0 = j / n * TAU + g, f1 = (j + 1) / n * TAU - g;
      for (let a = 0; a <= NP; a++) {
        const f = lerp(f0, f1, a / NP), mid = Math.abs(a / NP - 0.5) * 2, len = L * (1 - 0.35 * mid * mid);
        const cf = Math.cos(f), sf = Math.sin(f);
        for (let b = 0; b <= NR; b++) {
          const r = b / NR;
          const radO = Ra * (1 - 0.1 * r), axO = r * len;
          const radC = Ra * (1 - r) * (1 + 0.12 * Math.sin(Math.PI * r)), axC = r * len * 0.12 - 0.35 * Math.sin(Math.PI * r) * (1 - mid * 0.6);
          const rad = lerp(radC, radO, k), ax = lerp(axC, axO, k);
          const ii = (j * per + a * (NR + 1) + b) * 3;
          pos[ii] = C.x + (e1.x * cf + e2.x * sf) * rad + A.x * ax;
          pos[ii + 1] = C.y + (e1.y * cf + e2.y * sf) * rad + A.y * ax;
          pos[ii + 2] = C.z + (e1.z * cf + e2.z * sf) * rad + A.z * ax;
          if (b === NR && a % 3 === 1) edge.push(new THREE.Vector3(pos[ii], pos[ii + 1], pos[ii + 2]));
        }
      }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  };
  update(1);
  return { mesh, update, edge, e1, e2 };
}

function heartWorld(side) {
  const R = side === 'R';
  const scene = new THREE.Scene();
  const fogC = R ? 0x220306 : 0x2a0305;
  scene.background = new THREE.Color(fogC); scene.fog = new THREE.FogExp2(fogC, 0.028);
  let sdf, min, max, A1c, V1c, valves = [], papTips = [], guide, gRad;
  if (R) {
    const RA = V3(0, 0, 0), RV = V3(4.6, -6.4, 7.4);
    const dir = RV.clone().sub(RA).normalize(); const Cv = RA.clone().addScaledVector(dir, 5.2);
    const Ap = V3(-1.2, 11, 1).normalize(); const Cp = V3(2.6, 1.0, 10.6).addScaledVector(Ap, 0.8);
    const e1 = V3(0, 1, 0).cross(dir).normalize(), e2 = V3().crossVectors(dir, e1);
    const paps = [0.5, 2.6, 4.7].map(f => { const e = e1.clone().multiplyScalar(Math.cos(f)).addScaledVector(e2, Math.sin(f)); const tip = Cv.clone().addScaledVector(dir, 3.1).addScaledVector(e, 1.25); const base = tip.clone().addScaledVector(dir, 2.4).addScaledVector(e, 1.5); return { tip, base }; });
    papTips = paps.map(p => p.tip);
    sdf = (x, y, z) => {
      let d = sdEllipsoid(x, y, z, 0, 0, 0, 4.2, 4.0, 3.8);
      d = smin(d, sdCapsule(x, y, z, 0, -15, 0, 0, -2.5, 0, 1.35), 1.2);
      d = smin(d, sdCapsule(x, y, z, 0, 2.5, 0, 0, 11, 0, 1.25), 1.2);
      d = smin(d, sdCapsule(x, y, z, 0, 0, 0, RV.x, RV.y, RV.z, 1.75), 1.0);
      d = smin(d, sdEllipsoid(x, y, z, RV.x, RV.y, RV.z, 4.0, 4.6, 3.8), 1.2);
      d = smin(d, sdCapsule(x, y, z, RV.x, RV.y, RV.z, 2.6, 1.0, 10.6, 1.7), 1.2);
      d = smin(d, sdCapsule(x, y, z, 2.6, 1.0, 10.6, 1.4, 13, 11.7, 1.5), 1.0);
      for (const p of paps) d = smax(d, -sdCone(x, y, z, p.base.x, p.base.y, p.base.z, p.tip.x, p.tip.y, p.tip.z, 0.75, 0.25), 0.35);
      return d;
    };
    min = V3(-6, -15.5, -6); max = V3(10.5, 13.5, 14.5);
    A1c = RA; V1c = RV;
    valves.push({ ...makeValve(3, Cv, dir, 1.72, 2.0, 0xf2cfc8), kind: 'av', C: Cv });
    valves.push({ ...makeValve(3, Cp, Ap, 1.42, 1.3, 0xf2cfc8), kind: 'sl', C: Cp });
    guide = [V3(0, -14.5, 0), V3(0, -7, 0.1), V3(0, -1.5, 0.2), V3(1.0, -1.7, 1.6), Cv.clone(), V3(4.0, -5.4, 6.4), V3(4.3, -5.0, 8.6), V3(3.3, -1.4, 10.1), Cp.clone(), V3(1.9, 8, 11.3), V3(1.5, 12.5, 11.7)];
    gRad = [1.0, 1.1, 3.0, 2.6, 1.3, 2.8, 2.4, 1.3, 1.1, 1.2, 1.2];
  } else {
    const LA = V3(0, 0, 0), LV = V3(4.2, -7.4, 5.4);
    const dir = LV.clone().sub(LA).normalize(); const Cm = LA.clone().addScaledVector(dir, 4.5);
    const Aa = V3(0, 5.1, 0.6).normalize(); const Ca = V3(1.6, -0.6, 8.2).addScaledVector(Aa, 0.7);
    const e1 = V3(0, 1, 0).cross(dir).normalize(), e2 = V3().crossVectors(dir, e1);
    const paps = [1.0, 4.1].map(f => { const e = e1.clone().multiplyScalar(Math.cos(f)).addScaledVector(e2, Math.sin(f)); const tip = Cm.clone().addScaledVector(dir, 3.3).addScaledVector(e, 1.2); const base = tip.clone().addScaledVector(dir, 2.6).addScaledVector(e, 1.4); return { tip, base }; });
    papTips = paps.map(p => p.tip);
    const arch = [[1.6, -0.6, 8.2], [1.6, 4.5, 8.8], [0.2, 7.2, 7.4], [-3.2, 7.4, 4.6], [-5.2, 4.8, 2.6], [-5.6, -9, 1.8]];
    sdf = (x, y, z) => {
      let d = sdEllipsoid(x, y, z, 0, 0, 0, 3.6, 3.2, 3.4);
      d = smin(d, sdCapsule(x, y, z, -10, 1.5, -1, -2.5, 0.6, -0.4, 1.1), 1.0);
      d = smin(d, sdCapsule(x, y, z, -9, -2.6, 1.6, -2.5, -0.8, 0.5, 1.0), 1.0);
      d = smin(d, sdCapsule(x, y, z, 0, 0, 0, LV.x, LV.y, LV.z, 1.75), 1.0);
      d = smin(d, sdEllipsoid(x, y, z, LV.x, LV.y, LV.z, 3.6, 5.8, 3.4), 1.2);
      d = smin(d, sdCapsule(x, y, z, LV.x, LV.y, LV.z, 1.6, -0.6, 8.2, 1.45), 1.2);
      for (let k = 0; k < arch.length - 1; k++) d = smin(d, sdCapsule(x, y, z, ...arch[k], ...arch[k + 1], k < 3 ? 1.6 : 1.5), 0.8);
      d = smin(d, sdCapsule(x, y, z, 0.9, 7.0, 7.9, 1.8, 16, 8.4, 0.85), 0.6);
      d = smin(d, sdCapsule(x, y, z, -1.3, 7.7, 6.2, -1.6, 17, 6.4, 0.72), 0.6);
      d = smin(d, sdCapsule(x, y, z, -3.3, 7.6, 4.5, -4.8, 16, 4.2, 0.75), 0.6);
      for (const p of paps) d = smax(d, -sdCone(x, y, z, p.base.x, p.base.y, p.base.z, p.tip.x, p.tip.y, p.tip.z, 0.8, 0.28), 0.35);
      return d;
    };
    min = V3(-11, -15, -3); max = V3(9, 17.5, 11);
    A1c = LA; V1c = LV;
    valves.push({ ...makeValve(2, Cm, dir, 1.7, 2.2, 0xf6d6cc), kind: 'av', C: Cm });
    valves.push({ ...makeValve(3, Ca, Aa, 1.45, 1.3, 0xf6d6cc), kind: 'sl', C: Ca });
    guide = [V3(-9.5, 1.5, -1), V3(-2.5, 0.6, -0.4), V3(0, 0, 0), Cm.clone(), V3(3.6, -6.2, 4.8), V3(3.4, -3.8, 7.4), Ca.clone(), V3(1.6, 4.3, 8.7), V3(0.4, 6.9, 7.6), V3(-1.3, 8.0, 6.2), V3(-1.5, 11.5, 6.3), V3(-1.6, 16, 6.4)];
    gRad = [0.9, 1.0, 2.6, 1.3, 2.8, 1.8, 1.1, 1.3, 1.3, 0.8, 0.6, 0.6];
  }
  const cell = QUALITY < 1 ? 0.36 : 0.28;
  const geo = surfaceNets(sdf, min, max, cell);
  const P = geo.attributes.position, n = P.count;
  const mask = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const g = new THREE.Vector3(), e = 0.06, cA = new THREE.Color(R ? 0x8a1a24 : 0xa01c26), cB = new THREE.Color(R ? 0xd85a66 : 0xf06a72), cC = new THREE.Color(0xf2b4b0), tc = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    g.set(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)).normalize();
    const dA = Math.hypot(x - A1c.x, y - A1c.y, z - A1c.z), dV = Math.hypot(x - V1c.x, y - V1c.y, z - V1c.z);
    const wA = sstep(6.5, 3, dA), wV = sstep(7.5, 3.2, dV);
    const rid = Math.pow(1 - Math.abs(noise3(x * 0.55, y * 0.55 + (R ? 0 : 7), z * 0.55)), 5);
    const rid2 = Math.pow(1 - Math.abs(noise3(x * 1.3 + 3, y * 1.3, z * 1.3)), 6);
    const disp = -(0.38 * rid * (wA * 0.8 + wV) + 0.12 * rid2 * wV) - 0.05 * noise3(x * 2, y * 2, z * 2);
    P.setXYZ(i, x + g.x * disp, y + g.y * disp, z + g.z * disp);
    mask[i * 2] = wA; mask[i * 2 + 1] = wV;
    tc.copy(cA).lerp(cB, clamp(0.35 + rid * 0.8 + rid2 * 0.3)).lerp(cC, 0.18 * sstep(0.6, 1, rid2));
    col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
  }
  geo.setAttribute('aMask', new THREE.BufferAttribute(mask, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  { const N = geo.attributes.normal; let dot = 0; for (let i = 0; i < n; i += 37) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); g.set(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)); dot += g.x * N.getX(i) + g.y * N.getY(i) + g.z * N.getZ(i); } if (dot < 0) { const I = geo.index.array; for (let i = 0; i < I.length; i += 3) { const tmp = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = tmp; } geo.index.needsUpdate = true; geo.computeVertexNormals(); } }
  const mat = wetMat({ color: 0xffffff, vc: true, rough: 0.36, ccr: 0.12, sheen: 0.6, sheenColor: 0xff8090 });
  const pu = addNormalPulse(mat);
  scene.add(new THREE.Mesh(geo, mat));
  valves.forEach(v => scene.add(v.mesh));
  // chordae tendineae
  const av = valves[0];
  const chPos = new Float32Array(av.edge.length * 6);
  const chGeo = new THREE.BufferGeometry(); chGeo.setAttribute('position', new THREE.BufferAttribute(chPos, 3));
  const chordae = new THREE.LineSegments(chGeo, new THREE.LineBasicMaterial({ color: 0xffe8e0, transparent: true, opacity: 0.85 })); chordae.frustumCulled = false; scene.add(chordae);
  // blood flow along guide
  const gc = new THREE.CatmullRomCurve3(guide, false, 'centripetal');
  const GF = pathFrames(gc, 400, V3(0, 0, 1));
  const gS = guide.map(p => GF.nearestS(p));
  const gR = s => { let i = 0; while (i < gS.length - 2 && gS[i + 1] < s) i++; return lerp(gRad[i], gRad[i + 1], sstep(0, 1, inv(gS[i], gS[i + 1], s))); };
  const NR = Math.round(200 * QUALITY);
  const rbc = new THREE.InstancedMesh(rbcGeo(), rbcMat(R ? 0x7a0a16 : 0xd8142a, R ? 0xff5060 : 0xff8090), NR); rbc.frustumCulled = false; scene.add(rbc);
  const rItems = flowItems(NR, R ? 31 : 32, { rMax: 0.9, scale: 0.34, spin: 2 });
  const hero = heroGlucose(); hero.scale.setScalar(0.3); scene.add(hero);
  scene.add(motes(Math.round(1400 * QUALITY), (v, r) => { const s = r() * GF.L; GF.pt(s, r() * TAU, gR(s) * 1.3 * Math.sqrt(r()), v); }, { color: 0xffc8b0, color2: 0xffffff, size: 0.035, drift: 0.25, opacity: 0.4 }));
  scene.add(new THREE.HemisphereLight(R ? 0xd05060 : 0xe06070, 0x300608, 1.8));
  const inner = new THREE.PointLight(R ? 0xff6a70 : 0xff8a80, 4, 16, 1.2); inner.position.copy(V1c); scene.add(inner);
  return { scene, pu, valves, av, papTips, chordae, GF, gS, gR, rbc, rItems, hero, lamp: [11, 30, 0xfff0ee, 1.15], post: { bloom: 0.6, thr: 0.85 } };
}
defWorld('heartR', () => heartWorld('R'));
defWorld('heartL', () => heartWorld('L'));

function heartBeat(t, P = 1) {
  const ph = frac(t / P);
  const vSys = sstep(0.17, 0.26, ph) * (1 - sstep(0.46, 0.56, ph));
  const aSys = sstep(0.0, 0.05, ph) * (1 - sstep(0.1, 0.17, ph));
  const slOpen = sstep(0.22, 0.28, ph) * (1 - sstep(0.47, 0.53, ph));
  // distance the blood has travelled: steady drift plus one surge per systole (never jumps)
  const surge = Math.floor(t / P) + sstep(0.17, 0.52, ph);
  return { ph, vSys, aSys, avOpen: 1 - vSys, slOpen, surge };
}
const _hv1 = new THREE.Vector3(), _hv2 = new THREE.Vector3();
function transportUp(t, camKeys, lookKeys, up0, N = 90) {
  const up = up0.clone();
  for (let k = 1; k <= N; k++) { const tt = t * k / N; const d = spl(tt, lookKeys, _hv1).sub(spl(tt, camKeys, _hv2)).normalize(); up.addScaledVector(d, -up.dot(d)).normalize(); }
  return up;
}
function heartUpdate(w, t, hb, camKeys, lookKeys, up0) {
  const cp = spl(t, camKeys); const lk = spl(t, lookKeys, new THREE.Vector3());
  // valves stay open while the camera slips through them
  const nearAV = sstep(3.0, 1.1, cp.distanceTo(w.valves[0].C)), nearSL = sstep(2.6, 1.0, cp.distanceTo(w.valves[1].C));
  const vSys = hb.vSys * (1 - nearAV);
  w.pu.uA.value = 0.24 * hb.aSys; w.pu.uB.value = 0.5 * vSys; w.pu.uTime.value = T;
  w.valves[0].update(Math.max(1 - vSys, nearAV)); w.valves[1].update(Math.max(hb.slOpen, nearSL));
  const pos = w.chordae.geometry.attributes.position; const E = w.av.edge;
  for (let i = 0; i < E.length; i++) { let best = w.papTips[0], bd = 1e9; for (const tp of w.papTips) { const d = tp.distanceToSquared(E[i]); if (d < bd) { bd = d; best = tp; } } pos.setXYZ(i * 2, E[i].x, E[i].y, E[i].z); pos.setXYZ(i * 2 + 1, best.x, best.y, best.z); }
  pos.needsUpdate = true;
  const shake = vSys * 0.03; cp.x += Math.sin(T * 47) * shake; cp.y += Math.cos(T * 53) * shake;
  const sc = w.GF.nearestS(cp);
  placeFlow(w.rbc, w.GF, w.rItems, T, sc, { travel: 3 * T + 2.4 * hb.surge, back: 5, ahead: 22, radius: s => w.gR(s), avoid: cp, avoidR: 1.8 });
  const fh = w.GF.at(clamp(sc + 2.4, 0, w.GF.L)); w.hero.position.copy(fh.p).addScaledVector(fh.b, 0.3); w.hero.rotation.set(T, T * 0.6, 0);
  aim(camera, cp, lk, transportUp(t, camKeys, lookKeys, up0));
}

const HR_CAM = [[0, 0, -12.5, 0.2], [3.4, 0, -3.4, 0.4], [5.4, -1.2, -0.4, -1.4], [7.2, -0.4, -0.6, -0.2], [8.4, 0.9, -1.5, 1.5], [9.6, 2.2, -3.1, 3.6], [10.8, 3.0, -4.3, 5.0], [12.4, 4.4, -6.6, 6.2], [13.6, 4.2, -5.4, 8.2], [14.8, 3.6, -2.9, 9.6], [16, 2.55, 1.9, 10.7], [17.3, 2.3, 4.2, 10.9], [20, 1.5, 11.8, 11.6]];
const HR_LOOK = [[0, 0, -2, 0.2], [3.4, 0.5, 2, 0.5], [5.4, 1.8, -2.4, 2.8], [7.2, 2.2, -3.1, 3.6], [8.4, 2.6, -3.6, 4.2], [9.6, 3.4, -4.8, 5.6], [10.8, 4.2, -6.2, 7], [12.4, 3.0, -3.4, 5.2], [13.6, 2.6, 1, 10.4], [14.8, 2.5, 2.5, 10.7], [16, 2.3, 5, 11], [17.3, 2.1, 7, 11.2], [20, 1.4, 16, 11.8]];
defChapter({
  order: 9, id: 'heartR', n: 9, name: 'Kalp', latin: 'Cor · sağ kalp', blurb: 'Kan, kalbin sağ tarafından akciğerlere pompalanır.',
  world: 'heartR', dur: 20, route: 'heart', mapOn: ['heart'], fadeColor: 0x220306,
  leg: ['~1 atım', 'Sağ kulakçık ve karıncık kanı akciğerlere pompalar.'],
  clock: [1780, 1788], ph: 7.4, scale: '~5 cm', state: 'Glikoz (kanda)', loc: [[0, 'Alt ana toplardamar'], [3.5, 'Sağ kulakçık'], [9.2, 'Triküspit kapakçık'], [10.4, 'Sağ karıncık'], [16, 'Akciğer atardamarı']],
  beat: 1, beatT: t => t,
  cues: [
    [0.3, 'Karaciğerden çıkan kan alt ana toplardamarla kalbe ulaşıyor.'],
    [4.4, 'Burası sağ kulakçık. Vücudun dört bir yanından gelen, oksijeni azalmış kan burada toplanır.'],
    [8.6, 'Üç yapraklı kapakçık (triküspit) açılıyor; sağ karıncığa geçiyoruz.'],
    [13.8, 'Karıncık kasılıyor! Kan, akciğer atardamarına fırlatılıyor.'],
  ],
  facts: [['Kalp atışı', 'dakikada ~60–100'], ['Günde', '~100.000 atım'], ['Pompaladığı kan', 'dakikada ~5 L']],
  labels: [
    { t0: 0.6, t1: 3.6, text: 'Alt ana toplardamar', sub: 'vena cava inferior', at: () => _v1.set(1.2, -8, 0), dx: 70, dy: -40 },
    { t0: 3.8, t1: 7.6, text: 'Sağ kulakçık', at: () => _v2.set(-2.4, 1.2, -1.4), dx: -70, dy: -50 },
    { t0: 4.6, t1: 7.6, text: 'Üst ana toplardamar', at: () => _v3.set(0, 4.5, 0), dx: 70, dy: -40 },
    { t0: 6.4, t1: 9.6, text: 'Triküspit kapakçık', at: w => w.valves[0].C, dx: 70, dy: 40, hero: true },
    { t0: 10.8, t1: 13.4, text: 'Kiriş iplikleri', sub: 'kapakçığı tutar', at: w => w.papTips[1], dx: -70, dy: 40 },
    { t0: 11, t1: 13.8, text: 'Sağ karıncık', at: () => _v1.set(5.8, -7.6, 8.4), dx: 70, dy: -40 },
    { t0: 13.8, t1: 16, text: 'Pulmoner kapakçık', at: w => w.valves[1].C, dx: 70, dy: -40, hero: true },
    { t0: 16.4, t1: 19.6, text: 'Akciğer atardamarı', sub: 'akciğerlere gider', at: () => _v2.set(1.6, 9.5, 11.4), dx: 70, dy: -40 },
  ],
  events: [[15.25, 'boom']],
  audio: { amb: [180, 0.14], flow: [320, 0.35], heart: 1 },
  update(t, w) { heartUpdate(w, t, heartBeat(t, 1), HR_CAM, HR_LOOK, V3(0, 0, -1)); },
});

const HL_CAM = [[0, -7.5, 1.3, -0.9], [2.6, -2.4, 0.5, -0.3], [4.4, -0.6, 0.6, 0.2], [5.8, 0.9, -1.5, 1.2], [7, 1.84, -3.24, 2.36], [8.2, 2.6, -4.6, 3.4], [9.8, 3.6, -7.2, 5.0], [11, 3.3, -3.6, 7.0], [12.2, 1.75, -0.2, 8.25], [13.2, 1.6, 2.6, 8.6], [14.4, 0.9, 6.3, 8.1], [15.4, -0.8, 7.4, 6.7], [16.2, -1.35, 9.2, 6.25], [17, -1.55, 12, 6.4]];
const HL_LOOK = [[0, 0, 0.3, 0], [2.6, 1.84, -3.2, 2.36], [4.4, 1.84, -3.24, 2.36], [5.8, 3, -5.4, 3.9], [7, 3.6, -6.4, 4.7], [8.2, 4.2, -7.6, 5.4], [9.8, 2.4, -2.8, 7.4], [11, 1.6, 0.4, 8.3], [12.2, 1.5, 3.4, 8.6], [13.2, 1.4, 6, 8.5], [14.4, -1.2, 7.8, 6.4], [15.4, -1.4, 9.6, 6.3], [16.2, -1.5, 12.5, 6.35], [17, -1.6, 17, 6.4]];
defChapter({
  order: 11, id: 'heartL', n: 11, name: 'Sol Kalp ve Aort', latin: 'Ventriculus sinister · aorta', blurb: 'Sol karıncık, kanı tüm vücuda güçle pompalar.',
  world: 'heartL', dur: 17, route: 'aorta', mapOn: ['heart'], mapWhere: 'Aort', fadeColor: 0x2a0305,
  leg: ['~1 atım', 'Sol karıncık oksijenli kanı aorta, oradan şah damarına pompalar.'],
  clock: [1792, 1798], ph: 7.4, scale: '~3 cm', state: 'Glikoz (kanda)', loc: [[0, 'Sol kulakçık'], [6.6, 'Mitral kapakçık'], [7.6, 'Sol karıncık'], [12, 'Aort'], [15.2, 'Sol şah damarı']],
  beat: 0.95, beatT: t => t,
  cues: [
    [0.3, 'Oksijen yüklü kan akciğer toplardamarlarıyla sol kulakçığa döner.'],
    [4.4, 'İki yapraklı mitral kapakçıktan sol karıncığa iniyoruz.'],
    [8.8, 'Sol karıncık kalbin en güçlü odasıdır. Kasılınca kan aorta fışkırır.'],
    [13.4, 'Aort kavsinden ayrılan şah damarına sapıyoruz: rota beyin!'],
  ],
  facts: [['Aort çapı', '~2,5 cm'], ['Aortta kan hızı', '~1 m/sn’ye kadar'], ['Kanın vücudu dolaşması', '~1 dakika']],
  labels: [
    { t0: 0.6, t1: 4, text: 'Sol kulakçık', at: () => _v1.set(-1.6, 1.4, 1.6), dx: -70, dy: -40 },
    { t0: 3.8, t1: 7, text: 'Mitral kapakçık', sub: 'iki yapraklı', at: w => w.valves[0].C, dx: 70, dy: 40, hero: true },
    { t0: 8, t1: 10.8, text: 'Sol karıncık', sub: 'en kalın duvarlı oda', at: () => _v2.set(5.2, -9.2, 6.2), dx: 70, dy: -40 },
    { t0: 10, t1: 12.2, text: 'Aort kapakçığı', at: w => w.valves[1].C, dx: 70, dy: -40, hero: true },
    { t0: 12.8, t1: 15, text: 'Aort kavsi', at: () => _v3.set(-1.4, 8.4, 6.8), dx: -80, dy: -30 },
    { t0: 14.4, t1: 17, text: 'Sol şah damarı', sub: 'karotis · beyne', at: () => _v1.set(-1.5, 10.5, 6.3), dx: 70, dy: -40, hero: true },
  ],
  events: [[11.6, 'boom']],
  audio: { amb: [200, 0.14], flow: [380, 0.4], heart: 1 },
  update(t, w) { heartUpdate(w, t, heartBeat(t, 0.95), HL_CAM, HL_LOOK, V3(0, 1, 0)); },
});
