// ============================================================
//  UPPER TRACT — mouth, pharynx, oesophagus (one continuous world)
// ============================================================
const JAW_PIV = V3(0, 0.9, -5.6);
function toothGeo(type) {
  const D = { inc: [0.9, 1.25, 0.42], lat: [0.74, 1.12, 0.4], can: [0.8, 1.35, 0.72], pm: [0.76, 1.0, 0.95], mol: [1.04, 0.95, 1.12] }[type];
  const [w, h, d] = D;
  const g = new RoundedBoxGeometry(w, h, d, 5, Math.min(w, d) * 0.3);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const top = inv(-h * 0.1, h / 2, v.y);
    if (type === 'inc' || type === 'lat') v.z *= lerp(1, 0.4, top * top);
    if (type === 'can') { v.x *= lerp(1, 0.55, top); v.z *= lerp(1, 0.7, top); if (v.y > h * 0.3) v.y += 0.18 * Math.exp(-v.x * v.x / 0.04) * top; }
    if (type === 'pm' || type === 'mol') {
      if (v.y > h / 2 - 0.16) {
        const cusps = type === 'mol' ? [[0.24, 0.25], [-0.24, 0.25], [0.24, -0.25], [-0.24, -0.25]] : [[0, 0.24], [0, -0.24]];
        let c = 0; for (const [cx, cz] of cusps) c += Math.exp(-((v.x - cx) ** 2 + (v.z - cz) ** 2) / 0.035);
        v.y += 0.11 * Math.min(c, 1.2) - 0.06;
      }
    }
    const root = inv(-h / 2, -h * 0.15, v.y); v.x *= lerp(0.78, 1, root); v.z *= lerp(0.8, 1, root);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g.userData.h = h;
  return g;
}
function buildArch(upper) {
  const zf = 5.3, kk = 0.66, zOf = x => zf - kk * x * x;
  const xs = [], as = []; let acc = 0, px = 0;
  for (let i = 0; i <= 600; i++) { const x = (i / 600) * 3.8; if (i) acc += Math.hypot(x - px, zOf(x) - zOf(px)); xs.push(x); as.push(acc); px = x; }
  const xAt = a => { let i = 0; while (i < as.length - 1 && as[i] < a) i++; return xs[i]; };
  const types = ['inc', 'lat', 'can', 'pm', 'pm', 'mol', 'mol', 'mol'];
  const widths = [0.98, 0.78, 0.86, 0.8, 0.76, 1.12, 1.04, 0.98];
  const geos = {}; const parts = [];
  for (const side of [1, -1]) {
    let a = 0.04;
    types.forEach((tp, k) => {
      const mid = a + widths[k] / 2; a += widths[k] + 0.02;
      const x = xAt(mid), z = zOf(x);
      const tan = V3(side, 0, -2 * kk * x).normalize(); // along the arch, away from midline
      const g0 = geos[tp] || (geos[tp] = toothGeo(tp)); const h = g0.userData.h;
      const g = g0.clone();
      const m = new THREE.Matrix4().makeBasis(tan.clone(), V3(0, 1, 0), V3().crossVectors(tan, V3(0, 1, 0)).normalize());
      if (upper) g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
      g.applyMatrix4(m);
      const y = upper ? 0.03 + h / 2 : -0.03 - h / 2;
      g.translate(x * side, y, z);
      if (side < 0) { /* mirror handled by position; teeth are symmetric enough */ }
      parts.push(g);
    });
  }
  const geo = BGU.mergeGeometries(parts); geo.computeBoundingSphere();
  const pts = []; for (let i = -14; i <= 14; i++) { const x = (i / 14) * 3.55; pts.push(V3(x, 0, zOf(Math.abs(x)) - 0.05)); }
  return { geo, curve: new THREE.CatmullRomCurve3(pts), zOf };
}

defWorld('upper', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x160406);
  scene.fog = new THREE.FogExp2(0x1e0508, 0.03);
  const texM = tissueTex('mucosa', { c0: 0x6e1020, c1: 0xbf4456, c2: 0xee98a4, scale: 3, veins: 26, fine: 0.55, bump: 2.2, seed: 3 });
  const texT = tissueTex('tongue', { c0: 0x8a1f30, c1: 0xcf5d6c, c2: 0xf2a2ac, scale: 4, spots: 30, fine: 0.8, bump: 3.4, seed: 7 });

  const pts = [V3(0, 0.1, 9.2), V3(0, 0.1, 4), V3(0, 0.15, 0), V3(0, -0.2, -4), V3(0, -1.3, -6.6), V3(0, -3.6, -7.5), V3(0, -6.6, -7.8), V3(0, -10, -7.9), V3(0.25, -20, -7.7), V3(0.55, -32, -7.4), V3(0.85, -44, -7.1), V3(1.0, -54, -7.0)];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const F = pathFrames(curve, 760, V3(0, 1, 0));
  const S = { m1: F.nearestS(pts[1]), m2: F.nearestS(pts[2]), m3: F.nearestS(pts[3]), oro: F.nearestS(pts[4]), ph: F.nearestS(pts[5]), lar: F.nearestS(pts[6]), ues: F.nearestS(pts[7]), end: F.L };
  const prof = (s, th) => {
    let rx, ry;
    if (s < S.m3) { const a = inv(0, S.m1, s); rx = lerp(2.4, 4.5, eo(a)); ry = lerp(1.9, 2.7, eo(a)); const b = inv(S.m2, S.m3, s); rx = lerp(rx, 3.3, b * b); ry = lerp(ry, 2.5, b); }
    else if (s < S.oro) { const b = eio(inv(S.m3, S.oro, s)); rx = lerp(3.3, 1.95, b); ry = lerp(2.5, 1.85, b); }
    else if (s < S.ues) { const b = inv(S.oro, S.ues, s); rx = lerp(1.95, 1.15, b); ry = lerp(1.85, 1.15, b); }
    else rx = ry = 1.08;
    const n = 0.07 * noise3(Math.cos(th) * 2 + s * 0.3, Math.sin(th) * 2, s * 0.15);
    let fold = 0; if (s > S.ues - 1) fold = sstep(S.ues - 1, S.ues + 2.5, s) * 0.17 * Math.pow(0.5 + 0.5 * Math.cos(th * 7 + 0.9 * noise3(s * 0.15, 0, 1)), 3);
    let rug = 0; if (s < S.m2 + 2) rug = sstep(0.3, 0.9, Math.sin(th)) * 0.045 * Math.sin(s * 3.3) * (1 - inv(S.m2 - 1, S.m2 + 2, s));
    const les = 1 - 0.5 * sstep(S.end - 5, S.end - 1.2, s);
    const k = (1 + n - fold + rug) * les;
    return [rx * k, ry * k];
  };
  const tint = (s) => { const e = sstep(S.ues - 2, S.ues + 6, s), p = win(s, S.oro - 1, S.ues + 1, 2); return [lerp(1, 1.12, e) * (1 - p * 0.12), lerp(1, 1.05, e) * (1 - p * 0.2), lerp(1, 1.05, e) * (1 - p * 0.15)]; };
  const wallMat = wetMat({ tex: texM, repeat: [1, 1], nScale: 0.9, rough: 0.46, vc: true });
  const wu = addTubeMotion(wallMat);
  const wall = new THREE.Mesh(tubeGeo(F, prof, { radial: 72, uvU: 0.22, uvV: 3, color: tint }), wallMat);
  scene.add(wall);
  // lips
  const lipMat = wetMat({ color: 0xd9727e, tex: texM, repeat: [3, 1], rough: 0.4 });
  const lips = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.55, 20, 64), lipMat); lips.position.set(0, 0.1, 9.05); lips.scale.set(1, 0.85, 1); scene.add(lips);

  // teeth
  const toothMat = new THREE.MeshPhysicalMaterial({ color: 0xf1e6d0, roughness: 0.26, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color(0xfff6e8), emissive: new THREE.Color(0x2a2016), emissiveIntensity: 0.4 });
  const up = buildArch(true), lo = buildArch(false);
  const upperTeeth = new THREE.Mesh(up.geo, toothMat); scene.add(upperTeeth);
  const gumMat = wetMat({ color: 0xe48790, tex: texM, repeat: [8, 1], rough: 0.4, nScale: 0.6 });
  const upperGum = new THREE.Mesh(new THREE.TubeGeometry(up.curve, 90, 0.62, 14, false), gumMat); upperGum.position.y = 1.42; upperGum.scale.set(1, 0.9, 1); scene.add(upperGum);
  // jaw group (lower teeth, gum, tongue)
  const jaw = new THREE.Group(); jaw.position.copy(JAW_PIV); scene.add(jaw);
  const lowerTeeth = new THREE.Mesh(lo.geo, toothMat); lowerTeeth.position.sub(JAW_PIV); jaw.add(lowerTeeth);
  const lowerGum = new THREE.Mesh(new THREE.TubeGeometry(lo.curve, 90, 0.62, 14, false), gumMat); lowerGum.position.set(0, -1.42, 0).sub(JAW_PIV); lowerGum.scale.set(1, 0.9, 1); jaw.add(lowerGum);
  const tg = new THREE.SphereGeometry(1, 80, 56); tg.rotateX(Math.PI / 2); { const p = tg.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (v.y > 0) v.y -= 0.14 * Math.exp(-v.x * v.x / 0.05) * v.y; if (v.y < 0) v.y *= 0.6; v.x *= 1 - 0.12 * Math.max(0, v.z); p.setXYZ(i, v.x, v.y, v.z); } tg.computeVertexNormals(); }
  const tongueMat = wetMat({ color: 0xffffff, tex: texT, repeat: [3, 5], nScale: 1.1, rough: 0.55, cc: 0.7, ccr: 0.25 });
  const tongue = new THREE.Mesh(tg, tongueMat); tongue.scale.set(2.3, 0.95, 4.7);
  const tonguePivot = new THREE.Group(); tonguePivot.position.set(0, -1.55, 0.2).sub(JAW_PIV); tonguePivot.add(tongue); jaw.add(tonguePivot);
  // uvula, tonsils, saliva papillae
  const uvMat = wetMat({ color: 0xe0707e, tex: texM, repeat: [1, 1], rough: 0.4 });
  const uvPivot = new THREE.Group(); uvPivot.position.set(0, 2.0, -5.35); scene.add(uvPivot);
  const uvula = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.9, 8, 16), uvMat); uvula.position.y = -0.7; uvPivot.add(uvula);
  for (const sx of [-1, 1]) { const ton = new THREE.Mesh(blobGeo(0.55, 3, 0.25, sx * 3), uvMat); ton.position.set(sx * 1.75, 0.1, -5.6); ton.scale.set(0.8, 1.2, 0.8); scene.add(ton); }
  for (const sx of [-1, 1]) { const pap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), uvMat); pap.position.set(sx * 3.95, 0.85, -0.5); scene.add(pap); }

  // larynx inlet + epiglottis on anterior pharynx wall
  const fL = F.at(S.lar), rL = prof(S.lar, -Math.PI / 2)[1];
  const nIn = fL.u.clone(); // points from anterior wall to lumen centre
  const O = fL.p.clone().addScaledVector(fL.u, -rL * 0.93);
  const holeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; void main(){ float r=length(vUv-.5)*2.; vec3 c=mix(vec3(.01,0.,.003),vec3(.22,.03,.05),smoothstep(.45,1.,r)); gl_FragColor=vec4(c,1.-smoothstep(.82,1.,r)); }' });
  const inlet = new THREE.Group(); inlet.position.copy(O);
  inlet.quaternion.setFromUnitVectors(V3(0, 0, 1), nIn);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.7, 40), holeMat); hole.position.z = 0.02; hole.scale.set(0.8, 1.1, 1); inlet.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.16, 12, 40), uvMat); rim.scale.set(0.85, 1.15, 0.8); rim.position.z = 0.03; inlet.add(rim);
  const cordMat = wetMat({ color: 0xf6d6d6, rough: 0.3 });
  for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.9, 4, 8), cordMat); c.position.set(sx * 0.14, 0, -0.12); c.rotation.z = sx * 0.2; inlet.add(c); }
  scene.add(inlet);
  const leafG = new THREE.PlaneGeometry(1.25, 1.5, 12, 14);
  { const p = leafG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const yn = (y + 0.75) / 1.5; const wdt = Math.pow(Math.sin(Math.PI * (yn * 0.82 + 0.14)), 0.7); p.setXYZ(i, x * wdt, y + 0.75, 0.3 * (x * wdt) ** 2 - 0.05 * yn); } leafG.computeVertexNormals(); }
  const epiMat = wetMat({ color: 0xf0a8b0, tex: texM, repeat: [1, 1], rough: 0.35 });
  const epiBase = new THREE.Group();
  const tIn = fL.t.clone(), bIn = V3().crossVectors(nIn, tIn).normalize();
  epiBase.position.copy(O).addScaledVector(tIn, -0.85).addScaledVector(nIn, 0.05);
  epiBase.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(bIn, nIn, tIn));
  const epi = new THREE.Group(); epiBase.add(epi); epi.add(new THREE.Mesh(leafG, epiMat)); scene.add(epiBase);

  // hero objects
  const sweet = makeSweet(1.25); scene.add(sweet);
  const fragGeo = blobGeo(0.5, 2, 0.35, 2, sweetColors);
  const frags = new THREE.InstancedMesh(fragGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xffe0ea), clearcoat: 0.3, emissive: new THREE.Color(0xc03060), emissiveIntensity: 0.08 }), 42); frags.frustumCulled = false; scene.add(frags);
  const fr = rngOf(31); const fragData = Array.from({ length: 42 }, () => ({ o: V3((fr() - 0.5) * 1.8, (fr() - 0.5), (fr() - 0.5) * 1.8), s: 0.35 + fr() * 0.5, r: V3(fr() * 6, fr() * 6, fr() * 6), ph: fr() * 6 }));
  const bolusMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 1, sheenColor: new THREE.Color(0xffd0dc), emissive: new THREE.Color(0xc03060), emissiveIntensity: 0.12 });
  const bolus = new THREE.Mesh(blobGeo(0.9, 5, 0.2, 5, sweetColors), bolusMat); scene.add(bolus);
  const salMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.45, emissive: new THREE.Color(0x6aa8c8), emissiveIntensity: 0.25, depthWrite: false });
  const saliva = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), salMat, 90); saliva.frustumCulled = false; scene.add(saliva);
  const enz = new THREE.InstancedMesh(enzymeGeo(3), enzymeMat(0x4fd2ff), 12); enz.frustumCulled = false; scene.add(enz);
  const burstN = 320, burst = motes(burstN, (v) => v.set(0, 0, 0), { color: 0xffffff, color2: 0xffd9e6, size: 0.05, drift: 0, near: 0.05 }); scene.add(burst);
  const bdir = []; { const r = rngOf(8); for (let i = 0; i < burstN; i++) bdir.push(V3(r() - 0.5, r() * 0.8 - 0.2, r() - 0.5).normalize().multiplyScalar(0.6 + r() * 2.4)); }
  const floaters = motes(900, (v, r) => { const s = r() * F.L; F.pt(s, r() * TAU, Math.sqrt(r()) * 1.6, v); }, { color: 0xffd0d8, color2: 0xffffff, size: 0.025, drift: 0.12, opacity: 0.55 });
  scene.add(floaters);

  // lights
  scene.add(new THREE.HemisphereLight(0x9a4454, 0x1a0508, 1.3));
  const outside = new THREE.PointLight(0xffe8d8, 5, 18, 1.2); outside.position.set(0, 0.4, 12); scene.add(outside);
  const acid = new THREE.PointLight(0xd8e27a, 0, 16, 1.6); acid.position.copy(F.P[F.n]).addScaledVector(F.T[F.n], 1.2); scene.add(acid);
  const acidGlow = halo(0xe8f08a, 5, 0); acidGlow.position.copy(F.P[F.n]).addScaledVector(F.T[F.n], 2.2); scene.add(acidGlow);

  return { scene, F, S, prof, wu, jaw, tongue, tonguePivot, uvPivot, uvula, epi, O, nIn, tIn, sweet, frags, fragData, bolus, saliva, enz, burst, bdir, acid, acidGlow, upperTeeth, lamp: [5.5, 30, 0xfff0e6, 1.2], post: { bloom: 0.45, thr: 0.9 } };
});

// ---- helpers for mouth choreography ----
const MOL = V3(2.85, 0, -0.25); // lokum spot on right molars
function jawAngle(t) {
  if (t < 2.4) return 0.3;
  if (t < 3.6) return 0.3 - 0.12 * Math.sin(inv(2.4, 3.6, t) * Math.PI);
  if (t < 5.2) return 0.3;
  if (t < 14.2) return 0.03 + 0.27 * (0.5 + 0.5 * Math.cos(TAU * (t - 5.2) / 1.75));
  return lerp(0.3, 0.07, sstep(14.2, 15.5, t));
}
function lowerY(a, z = MOL.z) { const ry = -0.02 - JAW_PIV.y, rz = z - JAW_PIV.z; return JAW_PIV.y + ry * Math.cos(a) - rz * Math.sin(a); }
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
function setJaw(w, a, tongueLift = 0, tongueBack = 0) {
  w.jaw.rotation.x = a;
  w.tonguePivot.position.set(0, -1.55 + tongueLift, 0.2 - tongueBack).sub(JAW_PIV);
  w.tonguePivot.rotation.x = -tongueLift * 0.25;
}

defChapter({
  order: 1, id: 'mouth', n: 1, name: 'Ağız', latin: 'Cavum oris', blurb: 'Dişler parçalar, tükürük yumuşatır, dil karıştırır.',
  leg: ['~20 sn', 'Dişler besini parçalar; tükürükteki amilaz nişastayı sindirmeye başlar.'], world: 'upper', dur: 26, route: 'mouth', mapOn: ['mouth'], fadeColor: 0x2a0610,
  clock: [0, 20], ph: 6.8, scale: '~5 cm', state: [[0, 'Katı parça'], [6.1, 'Ezilmiş parçalar'], [16, 'Lokma (bolus)']], loc: [[0, 'Ağız'], [5, 'Azı dişleri'], [16, 'Dil üstü'], [21, 'Ağız arkası']],
  cues: [
    [0.2, 'Kesici dişler besini keser; dil onu hemen azı dişlerinin arasına iter.'],
    [5.6, 'Azı dişleri bir değirmen gibi çalışır: besin ezilir, küçük parçalara ayrılır.'],
    [10.8, 'Tükürük bezleri devreye girer. Tükürükteki amilaz enzimi nişastayı daha ağızdayken parçalamaya başlar.'],
    [16.2, 'Parçalar tükürükle yoğrulup yumuşak bir top olur. Buna lokma (bolus) denir.'],
    [21, 'Dil lokmayı damağa bastırıp geriye, boğaza doğru iter.'],
  ],
  facts: [['Yetişkinde diş sayısı', '32'], ['Günlük tükürük', '1–1,5 litre'], ['Azı dişlerinde ısırma kuvveti', '70 kg’ı bulabilir']],
  labels: [
    { t0: 0.6, t1: 4.6, text: 'Kesici dişler', sub: 'keser', at: () => _v1.set(0.55, 0.75, 5.1), dx: 70, dy: -50 },
    { t0: 2.2, t1: 8, text: 'Dil', sub: 'besini yönlendirir', at: w => w.tongue.localToWorld(_v2.set(-0.35, 0.95, 0.1)), dx: -70, dy: 40 },
    { t0: 5.6, t1: 10.6, text: 'Azı dişleri', sub: 'öğütür', at: () => _v1.set(3.05, 0.6, -1.2), dx: 60, dy: -60 },
    { t0: 11, t1: 16, text: 'Tükürük', sub: 'amilaz enzimi içerir', at: () => _v3.set(3.9, 0.85, -0.5), dx: -40, dy: -70 },
    { t0: 12, t1: 16, text: 'Amilaz', sub: 'nişastayı parçalar', at: w => { const m = new THREE.Matrix4(); w.enz.getMatrixAt(2, m); return _v2.setFromMatrixPosition(m); }, dx: -80, dy: 50, hero: true },
    { t0: 16.5, t1: 21, text: 'Lokma (bolus)', at: w => w.bolus.position, dx: 60, dy: -56, hero: true },
    { t0: 19.5, t1: 23.5, text: 'Sert damak', at: () => _v1.set(0, 2.45, -1.8), dx: 60, dy: -30 },
    { t0: 21.5, t1: 26, text: 'Küçük dil', sub: 'uvula', at: w => w.uvula.localToWorld(_v3.set(0, -0.6, 0)), dx: 60, dy: -40 },
  ],
  events: [[2.9, 'squish'], [6.05, 'crunch'], [7.8, 'crunch'], [9.55, 'crunch'], [11.3, 'squish'], [13.05, 'squish'], [11, 'drip'], [11.6, 'drip'], [12.3, 'drip'], [22.5, 'gulp']],
  audio: { amb: [220, 0.18], heart: 0.1 },
  enter(w) { w.wu.uWaveA.value = 0; w.wu.uBulgeA.value = 0; w.sweet.visible = true; },
  update(t, w) {
    const a = jawAngle(t);
    const lift = sstep(19.5, 22, t) * 0.45, back = sstep(20, 23, t) * 0.4;
    setJaw(w, a, lift, back);
    w.wu.uTime.value = T; w.wu.uBreathA.value = 0.012;
    w.uvPivot.rotation.x = -sstep(23.5, 25.5, t) * 0.9;
    w.epi.rotation.x = -1.0;
    // lokum
    const L = w.sweet; const H0 = 1.125;
    let lp;
    if (t < 5.2) lp = spl(t, [[0, 0, 0.15, 7.6], [2.3, 0, 0.12, 4.9], [3.7, 0.9, 0.05, 3.2], [5.2, MOL.x, 0, MOL.z]]);
    else lp = _v1.copy(MOL);
    const yl = lowerY(a, lp.z), gap = 0.03 - yl;
    const hh = Math.min(H0, Math.max(0.3, gap));
    L.position.set(lp.x, t < 3.7 ? lp.y : yl + hh / 2, lp.z);
    L.scale.set(1 + (1 - hh / H0) * 0.35, hh / H0, 1 + (1 - hh / H0) * 0.35);
    L.rotation.set(0.1, t < 5.2 ? 0.4 + t * 0.2 : 1.44, 0.05);
    L.visible = t < 6.05;
    // fragments
    const chews = Math.floor((t - 6.05) / 1.75) + 1;
    const frags = w.frags;
    for (let i = 0; i < frags.count; i++) {
      const d = w.fragData[i];
      let sc = 0; const p = _v2;
      if (t >= 6.05 && t < 17.8) {
        const burstK = eo(inv(6.05, 6.6, t));
        const shrink = Math.pow(0.8, Math.max(0, chews - 1));
        const yl2 = lowerY(a), g2 = Math.max(0.2, 0.03 - yl2);
        p.set(MOL.x + d.o.x * 0.75 * burstK * (0.6 + 0.4 * shrink), yl2 + g2 * (0.5 + d.o.y * 0.5), MOL.z + d.o.z * 0.75 * burstK);
        sc = d.s * 0.62 * shrink * (0.7 + 0.3 * burstK);
        const u = sstep(14, 17.5, t + d.ph * 0.08);
        p.lerp(_v3.set(0.3, -0.3, -1.2), u); sc *= 1 - u;
        if (u < 0.01) { const sq = clamp(g2 / (sc * 1.2 + 0.001), 0.35, 1); _s.set(sc, sc * sq, sc); } else _s.set(sc, sc, sc);
      } else _s.set(0, 0, 0);
      _q.setFromEuler(_e.set(d.r.x + t * 0.3, d.r.y, d.r.z));
      _m4.compose(p, _q, _s); frags.setMatrixAt(i, _m4);
    }
    frags.instanceMatrix.needsUpdate = true;
    // sugar burst
    const pos = w.burst.geometry.attributes.position;
    const b0 = t >= 7.8 ? 7.8 : 6.05, bt = t - b0;
    for (let i = 0; i < pos.count; i++) { const d = w.bdir[i]; const k = bt > 0 ? eo(clamp(bt / 1.4)) : 0; pos.setXYZ(i, MOL.x - 0.2 + d.x * k * 0.9, 0.0 + d.y * k * 0.7 - bt * bt * 0.1, MOL.z + d.z * k * 0.9); }
    pos.needsUpdate = true; w.burst.material.uniforms.uOpacity.value = t >= 6.05 ? Math.exp(-bt * 1.1) : 0;
    // bolus
    const bsc = sstep(14.6, 17.2, t);
    const bp = t < 19.5 ? _v3.set(0.3, -0.3 + lift * 0.2, -1.2) : spl(t, [[19.5, 0.3, -0.25, -1.2], [22, 0.1, -0.1, -3.4], [24.5, 0, -0.55, -5.6], [26, 0, -1.25, -6.7]]);
    w.bolus.position.copy(bp); w.bolus.scale.setScalar(bsc * 0.95 + 0.001); w.bolus.rotation.set(t * 0.4, t * 0.25, 0); w.bolus.visible = bsc > 0.01;
    // saliva stream from parotid papilla
    const sal = w.saliva;
    for (let i = 0; i < sal.count; i++) {
      const ph = frac(i / sal.count + t * 0.35), on = win(t, 10.5, 17.5, 1);
      const side = i % 3 === 0 ? -1 : 1;
      const from = _v1.set(side * 3.9, 0.85, -0.5), to = t < 14 ? _v2.set(MOL.x * (side > 0 ? 1 : 0.2), 0.05, MOL.z) : _v2.set(0.3, -0.2, -1.2);
      const p = from.lerp(to, ph); p.y += Math.sin(ph * Math.PI) * 0.35 + Math.sin(i * 7.1) * 0.12; p.x += Math.sin(i * 3.3) * 0.15; p.z += Math.cos(i * 5.1) * 0.2;
      const s = on * (0.5 + 0.8 * frac(i * 0.618)) * (1 - ph * 0.5);
      _m4.compose(p, _q.identity(), _s.set(s, s, s)); sal.setMatrixAt(i, _m4);
    }
    sal.instanceMatrix.needsUpdate = true;
    // amylase enzymes
    for (let i = 0; i < w.enz.count; i++) {
      const on = win(t, 11.5, 19.5, 1); const ang = i / w.enz.count * TAU + t * 0.5;
      const c = t < 15 ? _v1.set(MOL.x - 0.3, 0.1, MOL.z) : _v1.copy(bp);
      const p = _v2.set(c.x + Math.cos(ang) * (0.9 + 0.2 * Math.sin(t * 2 + i)), c.y + 0.35 * Math.sin(ang * 2 + t), c.z + Math.sin(ang) * (0.9 + 0.2 * Math.cos(t * 1.7 + i)));
      _q.setFromEuler(_e.set(t + i, t * 0.7, i)); const s = on * 0.13;
      _m4.compose(p, _q, _s.set(s, s, s)); w.enz.setMatrixAt(i, _m4);
    }
    w.enz.instanceMatrix.needsUpdate = true;
    // camera
    const shake = t > 6 && t < 14 ? Math.exp(-frac((t - 6.075) / 1.75) * 12) * 0.03 : 0;
    const cp = spl(t, [[0, 0, 1.25, 10.6], [2.3, 0.15, 0.95, 7.6], [4.2, 0.6, 0.9, 3.8], [5.8, 0.95, 1.0, 2.35], [13.8, 0.8, 0.95, 2.1], [16.5, 0.35, 0.95, 1.6], [19.5, 0.2, 0.95, 1.0], [22.5, 0.08, 0.72, -1.4], [26, 0, 0.25, -3.9]]);
    const tg = spl(t, [[0, 0, 0.1, 5], [2.3, 0, 0.1, 3.8], [4.2, 1.9, -0.1, 0.8], [5.8, 2.75, -0.25, -0.35], [13.8, 2.6, -0.2, -0.4], [16.5, 0.6, -0.4, -1.2], [19.5, 0.3, -0.3, -1.4], [22.5, 0.1, -0.3, -3.8], [26, 0, -1.1, -6.6]]);
    cp.y += shake * Math.sin(t * 80);
    aim(camera, cp, tg);
    camera.fov = 62;
  },
});

defChapter({
  order: 2, id: 'pharynx', n: 2, name: 'Yutak', latin: 'Pharynx', blurb: 'Yutma refleksi: bir saniyeden kısa süren kusursuz bir koreografi.',
  leg: ['~1 sn', 'Gırtlak kapağı soluk borusunu kapatır; lokma yemek borusuna geçer.'], world: 'upper', dur: 12, route: 'pharynx', mapOn: ['mouth', 'eso'], mapWhere: 'Boğaz',
  clock: [20, 21.5], ph: 7, scale: '~3 cm', state: 'Lokma (bolus)', loc: [[0, 'Yutak'], [5, 'Gırtlak kapağı'], [9, 'Yemek borusu girişi']],
  cues: [
    [0.2, 'Yutkunma başladı. Bundan sonrası isteğimiz dışında, refleksle olur.'],
    [3.3, 'Yumuşak damak yükselip burun yolunu kapatır.'],
    [6.2, 'Gırtlak kapağı (epiglot) soluk borusunun üstüne kapanır; lokma yanlış yola sapamaz.'],
    [9.4, 'Bu sırada nefes bir anlığına durur. Lokma yemek borusuna kayar.'],
  ],
  facts: [['Yutma süresi', '~1 saniye'], ['Günde yutkunma', '~600 kez'], ['Yutakta kesişen iki yol', 'hava ve besin']],
  labels: [
    { t0: 0.8, t1: 5, text: 'Yumuşak damak', sub: 'burun yolunu kapatır', at: w => w.uvula.localToWorld(_v1.set(0, 0.2, 0)), dx: 70, dy: -40 },
    { t0: 3.6, t1: 9, text: 'Gırtlak kapağı', sub: 'epiglot', at: w => w.epi.localToWorld(_v2.set(0, 1.2, 0.2)), dx: 70, dy: 40, hero: true },
    { t0: 5.2, t1: 9.6, text: 'Soluk borusu', sub: 'şimdilik kapalı', at: w => w.O, dx: -80, dy: 50 },
    { t0: 9, t1: 12, text: 'Yemek borusu girişi', at: w => w.F.P[Math.round(w.S.ues / w.F.L * w.F.n)], dx: 70, dy: -40 },
  ],
  events: [[0.3, 'gulp'], [4.6, 'valve'], [7.2, 'gulp']],
  audio: { amb: [200, 0.2], heart: 0.1 },
  enter(w) { w.sweet.visible = false; w.frags.visible = true; },
  update(t, w) {
    const { F, S } = w;
    setJaw(w, 0.06, 0.45 * (1 - sstep(6, 11, t)), 0.4);
    w.uvPivot.rotation.x = -0.9 * (1 - sstep(8, 11, t));
    w.epi.rotation.x = lerp(-1.0, 1.52, sstep(3.6, 5.4, t)) * (1 - sstep(10.2, 11.8, t)) + -1.0 * sstep(10.2, 11.8, t);
    w.wu.uTime.value = T; w.wu.uWaveA.value = 0;
    const sB = lerp(S.oro - 0.4, S.ues + 3, eio(inv(0, 11.5, t)));
    const f = F.at(sB); const r = w.prof(sB, Math.PI / 2)[1];
    w.bolus.position.copy(f.p).addScaledVector(f.u, r * 0.3); w.bolus.scale.setScalar(0.72); w.bolus.rotation.set(T * 0.5, T * 0.3, 0); w.bolus.visible = true;
    w.wu.uBulgeC.value = sB; w.wu.uBulgeA.value = 0.18 * sstep(S.ph, S.ues, sB); w.wu.uBulgeW.value = 1.3;
    const sC = sB - lerp(3.6, 3.0, inv(0, 12, t));
    const fc = F.at(sC); const rc = w.prof(sC, Math.PI / 2)[1];
    const cp = _v1.copy(fc.p).addScaledVector(fc.u, rc * 0.55);
    const tg = _v2.copy(w.bolus.position).addScaledVector(F.at(sB + 1.5).t, 0.4).addScaledVector(fc.u, -1.1);
    aim(camera, cp, tg, fc.u);
    camera.fov = 66;
    w.frags.visible = false;
  },
});

defChapter({
  order: 3, id: 'eso', n: 3, name: 'Yemek Borusu', latin: 'Oesophagus', blurb: 'Kas halkaları dalga gibi kasılarak lokmayı mideye iter.',
  leg: ['5–8 sn', 'Peristaltik dalgalar lokmayı mideye iter.'], world: 'upper', dur: 14, route: 'eso', mapOn: ['eso'], fadeColor: 0x2c3008,
  clock: [21.5, 29], ph: 7, scale: '~2 cm', state: 'Lokma (bolus)', loc: [[0, 'Yemek borusu'], [11, 'Mide ağzı']],
  cues: [
    [0.2, 'Yemek borusu, yaklaşık 25 santimetrelik kaslı bir tüp.'],
    [3.6, 'Arkadaki kaslar kasılır, öndekiler gevşer: bu dalgaya peristaltizm denir.'],
    [7.6, 'Bu yüzden baş aşağı dursanız bile yutabilirsiniz; yerçekimine ihtiyaç yok.'],
    [10.8, 'Sonunda mide ağzındaki kapı (alt yemek borusu sfinkteri) açılıyor.'],
  ],
  facts: [['Uzunluk', '~25 cm'], ['Geçiş süresi', '5–8 saniye'], ['Hareket', 'Peristaltik dalga']],
  labels: [
    { t0: 0.8, t1: 4.2, text: 'Mukus tabakası', sub: 'kaydırır, korur', at: w => w.F.pt(w._sC + 3.2, 0.3, 0.95, _v1), dx: 70, dy: -40 },
    { t0: 5.4, t1: 10.4, text: 'Peristaltik dalga', sub: 'kas kasılması', at: w => w.F.pt(w.wu.uWaveC.value, 2.2, 0.55, _v2), dx: 70, dy: 50, hero: true },
    { t0: 10.8, t1: 14, text: 'Mide ağzı', sub: 'kardiya · sfinkter', at: w => w.F.P[w.F.n - 18], dx: 70, dy: -40 },
  ],
  events: [[0.4, 'squish'], [4, 'squish'], [8, 'squish'], [12.4, 'whoosh']],
  audio: { amb: [240, 0.22], heart: 0.12 },
  update(t, w) {
    const { F, S } = w;
    setJaw(w, 0.05); w.epi.rotation.x = -1.0; w.uvPivot.rotation.x = 0;
    const sB = lerp(S.ues + 3, S.end + 1.5, inv(0, 13.6, t) * 0.25 + eio(inv(0, 13.6, t)) * 0.75);
    const f = F.at(sB);
    w.bolus.position.copy(f.p); w.bolus.scale.set(1.02, 1.02, 1.2); w.bolus.rotation.set(T * 0.5, T * 0.3, 0); w.bolus.visible = true;
    w.bolus.quaternion.setFromUnitVectors(V3(0, 0, 1), f.t);
    const u = w.wu; u.uTime.value = T; u.uBreathA.value = 0.015;
    u.uBulgeC.value = sB; u.uBulgeA.value = 0.28; u.uBulgeW.value = 1.25;
    const ahead = sstep(4.2, 6.2, t) * (1 - sstep(10, 11.8, t));
    u.uWaveC.value = sB - lerp(3.6, 1.7, ahead); u.uWaveA.value = 0.62; u.uWaveW.value = 1.0;
    u.uWave2C.value = sB - 9 + Math.sin(t) * 0.5; u.uWave2A.value = 0.3; u.uWave2W.value = 1.6;
    const sC = lerp(sB - 2.4, sB + 3.4, ahead) + sstep(11, 14, t) * 1.6;
    w._sC = sC;
    const fc = F.at(sC);
    const cp = _v1.copy(fc.p).addScaledVector(fc.u, 0.18);
    const fwd = _v2.copy(F.at(sC + 3).p);
    const tg = _v3.copy(w.bolus.position).lerp(fwd, t < 5 ? 0.25 : t > 11 ? sstep(11, 13, t) : 0);
    aim(camera, cp, tg, fc.u);
    camera.fov = 70;
    const endK = sstep(9, 14, t);
    w.acid.intensity = endK * 14; w.acidGlow.material.opacity = endK * 0.8;
  },
  post: t => ({ bloom: 0.5 + sstep(11, 14, t) * 0.5, thr: 0.85 }),
});
