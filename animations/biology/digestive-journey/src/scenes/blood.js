// ============================================================
//  BLOOD — portal vein → liver sinusoid, lung capillaries
// ============================================================
function glycogenTree(seed, n = 70) {
  const r = rngOf(seed); const nodes = [{ p: V3(0, 0, 0), d: V3(0, 1, 0), parent: -1, depth: 0 }];
  for (let i = 1; i < n; i++) {
    const pi = Math.max(0, i - 1 - Math.floor(r() * Math.min(i, 6)) * (r() < 0.35 ? 1 : 0));
    const par = nodes[pi]; const d = par.d.clone().add(V3(r() - 0.5, r() - 0.3, r() - 0.5).multiplyScalar(0.9)).normalize();
    nodes.push({ p: par.p.clone().addScaledVector(d, 0.2), d, parent: pi, depth: par.depth + 1 });
  }
  return nodes;
}
defWorld('liver', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x250407); scene.fog = new THREE.FogExp2(0x250407, 0.055);
  const pts = [V3(0, 0, 0), V3(2, 1, -8), V3(-1, 0, -16), V3(1, -1, -24), V3(0, 0, -30), V3(0.6, 0.3, -34), V3(-0.4, 0, -39), V3(0.3, -0.2, -44), V3(0, 0, -48), V3(0, 0.5, -55)];
  const F = pathFrames(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 640, V3(0, 1, 0));
  const s1 = F.nearestS(pts[4]), s2 = F.nearestS(pts[7]);
  const radius = s => s < s1 - 2 ? 2.2 : s < s1 + 1 ? lerp(2.2, 1.1, sstep(s1 - 2, s1 + 1, s)) : s < s2 ? 1.1 : lerp(1.1, 1.9, sstep(s2, s2 + 2.5, s));
  const prof = (s, th) => radius(s) * (1 + 0.04 * noise3(Math.cos(th) * 2, Math.sin(th) * 2, s * 0.3));
  const tint = s => { const k = win(s, s1 - 1, s2 + 1, 2); return [lerp(1, 1.15, k), lerp(1, 0.78, k), lerp(1, 0.62, k)]; };
  const mat = wetMat({ tex: vesselTex(), repeat: [1, 1], rough: 0.38, vc: true, sheenColor: 0xff6a7a });
  const wu = addTubeMotion(mat);
  scene.add(new THREE.Mesh(tubeGeo(F, prof, { radial: 64, uvU: 0.15, uvV: 2, color: tint }), mat));
  // hepatocytes lining the sinusoid
  const hepMat = new THREE.MeshPhysicalMaterial({ color: 0xa4503e, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0xffa080), clearcoat: 0.5, emissive: new THREE.Color(0x3a1008), emissiveIntensity: 0.5 });
  const hepG = new RoundedBoxGeometry(1, 1, 1, 3, 0.28);
  const hp = []; const hr = rngOf(19);
  for (let s = s1 + 0.6; s < s2 - 0.3; s += 0.72) for (let k = 0; k < 9; k++) { const th = k / 9 * TAU + s * 0.7 + hr() * 0.3; hp.push([s, th, 0.55 + hr() * 0.25]); }
  const hep = new THREE.InstancedMesh(hepG, hepMat, hp.length);
  hp.forEach(([s, th, k], i) => { const f = F.at(s); F.pt(s, th, radius(s) + 0.18, _p); _q.setFromUnitVectors(V3(0, 0, 1), _v1.copy(f.p).sub(_p).normalize()); _s.set(k * 1.1, k * 1.1, k * 0.9); _m4.compose(_p, _q, _s); hep.setMatrixAt(i, _m4); });
  scene.add(hep);
  // glycogen trees
  const trees = [];
  const gMat = new THREE.MeshStandardMaterial({ color: 0xffd070, emissive: new THREE.Color(0xffa820), emissiveIntensity: 0.4, roughness: 0.4 });
  [[s1 + 3.2, 0.6, 7], [s1 + 6.8, 2.8, 8], [s1 + 10.4, 4.6, 9], [s1 + 12.6, 1.3, 10]].forEach(([s, th, seed]) => {
    const nodes = glycogenTree(seed, 64);
    const base = F.pt(s, th, radius(s) * 0.93); const f = F.at(s); const nIn = _v1.copy(f.p).sub(base).normalize().clone();
    const grp = new THREE.Group(); grp.position.copy(base); const yA = f.t.clone().addScaledVector(nIn, -f.t.dot(nIn)).normalize(); const xA = V3().crossVectors(yA, nIn); grp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, nIn)); grp.position.addScaledVector(yA, -0.9); scene.add(grp);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), gMat, nodes.length); im.frustumCulled = false; grp.add(im);
    const lp = []; nodes.forEach((nd, i) => { if (nd.parent >= 0) { const q = nodes[nd.parent].p; lp.push(q.x, q.y, q.z, nd.p.x, nd.p.y, nd.p.z); } });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.8 })); grp.add(lines);
    trees.push({ nodes, im, lines, grp, s });
  });
  // blood contents
  const NR = Math.round(240 * QUALITY);
  const rbc = new THREE.InstancedMesh(rbcGeo(), rbcMat(0x8e0c1a, 0xff5060), NR); rbc.frustumCulled = false; scene.add(rbc);
  const rItems = flowItems(NR, 21, { rMax: 0.85, scale: 0.42, spin: 1.5 });
  const G = sugarGeos();
  const glc = new THREE.InstancedMesh(G.glc, moleculeMat(0xffb830, 0.5), 40); glc.frustumCulled = false; scene.add(glc);
  const gItems = flowItems(40, 22, { rMax: 0.8, scale: 0.2, spin: 1 });
  const fru = new THREE.InstancedMesh(G.fru, moleculeMat(0xff8030, 0.5), 26); fru.frustumCulled = false; scene.add(fru);
  const fItems = flowItems(26, 23, { rMax: 0.8, scale: 0.2, spin: 1 });
  const plt = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 12, 8).scale(1, 0.35, 1), new THREE.MeshPhysicalMaterial({ color: 0xf0c8a0, roughness: 0.5, sheen: 1, emissive: new THREE.Color(0x402010) }), 40); plt.frustumCulled = false; scene.add(plt);
  const pItems = flowItems(40, 24, { rMax: 0.85, scale: 0.16, spin: 2 });
  const wbcMat = new THREE.MeshPhysicalMaterial({ color: 0xe8e0f8, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xd0c0ff), clearcoat: 0.3, emissive: new THREE.Color(0x201838), emissiveIntensity: 0.6 });
  const wbc = [0, 1, 2].map(i => { const m = new THREE.Mesh(blobGeo(0.7, 3, 0.3, 20 + i), wbcMat); scene.add(m); return m; });
  const hero = heroGlucose(); hero.scale.setScalar(0.3); scene.add(hero);
  scene.add(motes(Math.round(1200 * QUALITY), (v, r) => { const s = r() * F.L; F.pt(s, r() * TAU, radius(s) * 0.9 * Math.sqrt(r()), v); }, { color: 0xffd0a0, color2: 0xffffff, size: 0.03, drift: 0.2, opacity: 0.45 }));
  scene.add(new THREE.HemisphereLight(0xc04050, 0x200406, 1.1));
  const warm = new THREE.PointLight(0xffa060, 1.5, 14, 1.2); warm.position.copy(F.at(s1 + 7).p); scene.add(warm);
  return { scene, F, s1, s2, radius, wu, trees, rbc, rItems, glc, gItems, fru, fItems, plt, pItems, wbc, hero, lamp: [4.5, 20, 0xfff0ee, 1.2], post: { bloom: 0.7, thr: 0.82 } };
});

defChapter({
  order: 8, id: 'liver', n: 8, name: 'Karaciğer', latin: 'Hepar', blurb: 'Bağırsaktan gelen kanın ilk durağı: vücudun kimya fabrikası.',
  world: 'liver', dur: 22, route: 'liver', mapOn: ['liver'], fadeColor: 0x2a0406,
  leg: ['saniyeler', 'Kapı toplardamarı kanı önce karaciğere getirir; fazla glikoz glikojen olarak depolanır.'],
  clock: [1765, 1780], ph: 7.4, scale: [[0, '~1 cm'], [9, '~20 µm']], state: 'Glikoz (kanda)', loc: [[0, 'Kapı toplardamarı'], [9, 'Karaciğer sinüzoidi'], [19, 'Merkez ven']],
  cues: [
    [0.3, 'Bağırsaktan gelen kan önce kapı toplardamarıyla karaciğere taşınır.'],
    [4.8, 'Alyuvarlar, akyuvarlar, glikozlar ve diğer besinler birlikte akıyor.'],
    [9.6, 'Karaciğer hücreleri fazla glikozu yakalayıp glikojen adlı dallı zincirler halinde depolar.'],
    [15.2, 'Fruktozun büyük kısmı da burada işlenir. Bizim glikoz ise yoluna devam ediyor.'],
  ],
  facts: [['Ağırlık', '~1,5 kg'], ['Glikojen deposu', '~100 g'], ['Görev sayısı', '500’den fazla']],
  labels: [
    { t0: 0.8, t1: 5, text: 'Kapı toplardamarı', sub: 'portal ven', at: w => w.F.pt(w._sc + 5, 0.6, w.radius(w._sc + 5) * 0.95, _v1), dx: 70, dy: -50 },
    { t0: 4.8, t1: 9, text: 'Alyuvar', at: w => { w.rbc.getMatrixAt(w._near || 0, _m4); return _v2.setFromMatrixPosition(_m4); }, dx: -70, dy: -40 },
    { t0: 5.4, t1: 9.2, text: 'Akyuvar', sub: 'bağışıklık hücresi', at: w => w.wbc[0].position, dx: 70, dy: 40 },
    { t0: 9.6, t1: 13.6, text: 'Karaciğer hücreleri', sub: 'hepatositler', at: w => w.F.pt(w._sc + 2.5, 3.6, w.radius(w._sc + 2.5), _v3), dx: -70, dy: 40 },
    { t0: 10.6, t1: 16, text: 'Glikojen', sub: 'depo şekeri', at: w => w.trees[1].grp.position, dx: 70, dy: -50, hero: true },
    { t0: 16, t1: 20.4, text: 'Glikoz', sub: 'yola devam', at: w => w.hero.position, dx: 70, dy: -50, hero: true },
  ],
  events: [[9.4, 'whoosh'], [11, 'ping'], [13, 'ping']],
  audio: { amb: [240, 0.12], flow: [360, 0.3], heart: 0.45 },
  beat: 0.86,
  update(t, w) {
    const { F } = w;
    const bt = T; const beat = Math.exp(-frac(bt / 0.86) * 5);
    w.wu.uTime.value = T; w.wu.uBreathA.value = 0; w.wu.uPulse.value = -0.04 * beat;
    const sH = t < 9 ? lerp(3, w.s1 - 0.5, eio(inv(0, 9, t)) * 0.5 + inv(0, 9, t) * 0.5) : t < 19 ? lerp(w.s1 - 0.5, w.s2 + 0.5, inv(9, 19, t)) : lerp(w.s2 + 0.5, w.s2 + 7, eio(inv(19, 22, t)));
    const fh = F.at(sH);
    w.hero.position.copy(fh.p).addScaledVector(fh.u, 0.2 * Math.sin(t * 1.3)).addScaledVector(fh.b, 0.25 * Math.cos(t * 0.9)); w.hero.rotation.set(t, t * 0.6, 0);
    const back = t < 9 ? 2.6 : 1.7;
    const sc = sH - back; w._sc = sc;
    const flowSp = 4.2 * (0.8 + 0.4 * beat);
    const rad = s => w.radius(s) * 0.92;
    const fcam = F.at(sc); const camP = _v3.copy(fcam.p).addScaledVector(fcam.u, 0.3).clone();
    placeFlow(w.rbc, F, w.rItems, t, sc, { speed: 3.6, back: 3, ahead: 20, radius: rad, avoid: camP, avoidR: 1.6 });
    placeFlow(w.glc, F, w.gItems, t, sc, { speed: 3.4, back: 3, ahead: 20, radius: rad });
    placeFlow(w.fru, F, w.fItems, t, sc, { speed: 3.3, back: 3, ahead: 20, radius: rad });
    placeFlow(w.plt, F, w.pItems, t, sc, { speed: 3.5, back: 3, ahead: 20, radius: rad });
    w.wbc.forEach((m, i) => { const s = wrap(8 + i * 9 + t * 2.6, 0, w.s1 - 1); F.pt(s, 1.2 + i * 2.1, w.radius(s) * 0.62, m.position); m.rotation.set(t * 0.8 + i, t * 0.5, 0); });
    w._near = 7;
    // glycogen growth
    w.trees.forEach((tr, k) => {
      const g = sstep(9.5 + k * 1.4, 14 + k * 1.4, t); const n = tr.nodes.length;
      for (let i = 0; i < n; i++) { const vis = clamp(g * n - i); const s = vis; _m4.compose(tr.nodes[i].p, _q.identity(), _s.set(s, s, s)); tr.im.setMatrixAt(i, _m4); }
      tr.im.instanceMatrix.needsUpdate = true; tr.lines.geometry.setDrawRange(0, Math.floor(g * (n - 1)) * 2);
      tr.grp.scale.set(0.9, 0.9, 0.16);
    });
    const fc = F.at(sc);
    aim(camera, _v1.copy(fc.p).addScaledVector(fc.u, 0.3), w.hero.position, fc.u);
    camera.fov = 68;
  },
});

// ---------------- Lungs ----------------
function fresnelMat(color, power = 2.2, intensity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uP: { value: power }, uI: { value: intensity }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.); vW=wp.xyz; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uP,uI,uTime; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f=pow(clamp(1.-abs(dot(normalize(vN),normalize(vV))),0.,1.),uP); float web=0.5+0.5*sin(vW.x*3.1+uTime*.6)*sin(vW.y*2.7)*sin(vW.z*3.3); gl_FragColor=vec4(uColor*(f*uI+0.04+0.05*web*f),1.); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}
defWorld('lungs', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0610); scene.fog = new THREE.FogExp2(0x0e0610, 0.035);
  const pts = []; for (let i = 0; i <= 12; i++) pts.push(V3(Math.sin(i * 0.9) * 3.2, Math.cos(i * 0.7) * 2.4, -i * 4));
  const F = pathFrames(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 500, V3(0, 1, 0));
  const capR = 0.78;
  const capMat = wetMat({ tex: vesselTex(), repeat: [1, 1], rough: 0.3, transparent: true, opacity: 0.28, depthWrite: false, sheenColor: 0xff8090 });
  scene.add(new THREE.Mesh(tubeGeo(F, (s, th) => capR * (1 + 0.04 * noise3(Math.cos(th), Math.sin(th), s * 0.5)), { radial: 40, uvU: 0.2, uvV: 1 }), capMat));
  // alveoli
  const alvMat = fresnelMat(0x8fd2ff, 2.6, 0.7);
  const alvIn = new THREE.MeshPhysicalMaterial({ color: 0x9ac8e8, transparent: true, opacity: 0.08, roughness: 0.2, depthWrite: false, side: THREE.BackSide });
  const alv = []; const ar = rngOf(5);
  for (let i = 0; i < 30; i++) {
    const s = 1 + i * (F.L - 2) / 30; const f = F.at(s); const th = (3.62 + ar() * (TAU - 1.8)) % TAU; const R = 2.2 + ar() * 1.6;
    const c = f.p.clone().addScaledVector(f.b, Math.cos(th) * (R + capR + 0.25)).addScaledVector(f.u, Math.sin(th) * (R + capR + 0.25));
    const m = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), alvMat); m.position.copy(c); scene.add(m);
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 32, 20), alvIn); m2.position.copy(c); scene.add(m2);
    alv.push({ c, R, s, th });
  }
  // RBC single file
  const NR = 34; const rbc = new THREE.InstancedMesh(rbcGeo(), rbcMat(0xffffff, 0xff7080), NR); rbc.frustumCulled = false; scene.add(rbc);
  rbc.setColorAt(0, new THREE.Color(1, 1, 1)); rbc.material.emissive.set(0x1a0206);
  const O2 = new THREE.InstancedMesh(BGU.mergeGeometries([new THREE.SphereGeometry(0.09, 10, 8).translate(-0.07, 0, 0), new THREE.SphereGeometry(0.09, 10, 8).translate(0.07, 0, 0)]), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: new THREE.Color(0x60b8ff), emissiveIntensity: 2 }), 160);
  O2.frustumCulled = false; scene.add(O2);
  const CO2 = new THREE.InstancedMesh(BGU.mergeGeometries([new THREE.SphereGeometry(0.09, 10, 8), new THREE.SphereGeometry(0.075, 10, 8).translate(-0.14, 0, 0), new THREE.SphereGeometry(0.075, 10, 8).translate(0.14, 0, 0)]), new THREE.MeshStandardMaterial({ color: 0x8a8298, emissive: new THREE.Color(0x3a3448), emissiveIntensity: 1 }), 80);
  CO2.frustumCulled = false; scene.add(CO2);
  const gr = rngOf(9); const gas = Array.from({ length: 160 }, () => ({ a: Math.floor(gr() * 30), ph: gr(), v: 0.3 + gr() * 0.5, o: V3(gr() - 0.5, gr() - 0.5, gr() - 0.5).normalize() }));
  const hero = heroGlucose(); hero.scale.setScalar(0.22); scene.add(hero);
  scene.add(motes(Math.round(700 * QUALITY), (v, r) => { const s = r() * F.L; F.pt(s, r() * TAU, 6 + r() * 6, v); }, { color: 0x9ad8ff, color2: 0xffffff, size: 0.05, drift: 0.3, opacity: 0.4 }));
  scene.add(new THREE.HemisphereLight(0x8ab0d0, 0x300810, 1.1));
  const blue = new THREE.PointLight(0x9ad8ff, 6, 30, 1.2); scene.add(blue);
  return { scene, F, alv, alvMat, rbc, O2, CO2, gas, hero, blue, lamp: [4, 16, 0xffffff, 1.2], post: { bloom: 0.85, thr: 0.75 } };
});
const DEOX = new THREE.Color(0x4a0612), OXY = new THREE.Color(0xe8162a), _cc = new THREE.Color();
defChapter({
  order: 10, id: 'lungs', n: 10, name: 'Akciğerler', latin: 'Pulmones', blurb: 'Kan oksijen alır, karbondioksit bırakır.',
  world: 'lungs', dur: 16, route: 'lungs', mapOn: ['lungL', 'lungR'], fadeColor: 0x10060e,
  leg: ['~1 sn', 'Alyuvarlar oksijen yükler, karbondioksit nefesle atılır.'],
  clock: [1788, 1792], ph: 7.4, scale: '~10 µm', state: 'Glikoz (kanda)', loc: [[0, 'Akciğer kılcalı'], [5, 'Alveol duvarı']],
  cues: [
    [0.3, 'Akciğer kılcalları o kadar incedir ki alyuvarlar tek sıra halinde geçer.'],
    [4.6, 'Hava keseciklerindeki (alveol) oksijen kana geçer; alyuvarlar parlak kırmızıya döner.'],
    [9.8, 'Karbondioksit ise kandan çıkıp nefesle dışarı atılır. Glikozumuz burada sadece yolcu.'],
  ],
  facts: [['Alveol sayısı', '~300–500 milyon'], ['Alveol yüzeyi', '~70 m²'], ['Günde soluduğumuz hava', '~11.000 L']],
  labels: [
    { t0: 1, t1: 6, text: 'Alveol', sub: 'hava keseciği', at: w => w.alv[w._ai].c, dx: 70, dy: -50 },
    { t0: 4.8, t1: 9.6, text: 'Oksijen (O₂)', at: w => { w.O2.getMatrixAt(w._oi, _m4); return _v1.setFromMatrixPosition(_m4); }, dx: -70, dy: -40, hero: true },
    { t0: 7, t1: 11.4, text: 'Alyuvar', sub: 'oksijen yükledi', at: w => { w.rbc.getMatrixAt(w._ri, _m4); return _v2.setFromMatrixPosition(_m4); }, dx: 70, dy: 40 },
    { t0: 10, t1: 14.6, text: 'Karbondioksit (CO₂)', sub: 'nefesle dışarı', at: w => { w.CO2.getMatrixAt(w._ci, _m4); return _v3.setFromMatrixPosition(_m4); }, dx: -70, dy: 40 },
  ],
  events: [[2, 'bubbles'], [8, 'bubbles']],
  audio: { amb: [500, 0.16], flow: [700, 0.2], heart: 0.35, pad: 0.03 },
  update(t, w) {
    const { F } = w;
    const sH = lerp(2, F.L - 6, inv(0, 16, t));
    const sc = sH - 1.6;
    const breathe = 1 + 0.03 * Math.sin(t * 1.4);
    w.alvMat.uniforms.uTime.value = T;
    const flc = F.at(sc + 1.2); const camP = flc.p.clone().addScaledVector(flc.b, -1.7).addScaledVector(flc.u, 0.7);
    // RBC single file moving slightly faster than the hero
    for (let i = 0; i < w.rbc.count; i++) {
      const s = clamp(sc - 3 + wrap(i * 1.25 + t * 2.4 - (sc - 3), 0, 42), 0, F.L);
      const f = F.at(s); _p.copy(f.p).addScaledVector(f.u, 0.05 * Math.sin(i));
      _q.setFromUnitVectors(V3(0, 1, 0), f.t).multiply(_q2.setFromAxisAngle(V3(0, 1, 0), i + t)); _q.multiply(_q2.setFromAxisAngle(V3(1, 0, 0), 0.4 * Math.sin(t * 2 + i)));
      const kk = 0.55 * sstep(0.5, 1.4, _p.distanceTo(camP)); _m4.compose(_p, _q, _s.set(kk, kk, kk)); w.rbc.setMatrixAt(i, _m4);
      const ox = sstep(8, 30, s + (t > 4 ? (t - 4) * 1.2 : 0)); _cc.copy(DEOX).lerp(OXY, ox); w.rbc.setColorAt(i, _cc);
      if (i === 0) w._ri = 0;
      if (Math.abs(s - (sc + 4)) < 0.7) w._ri = i;
    }
    w.rbc.instanceMatrix.needsUpdate = true; w.rbc.instanceColor.needsUpdate = true;
    // gases: O2 alveolus → capillary, CO2 capillary → alveolus
    let ai = 0, bd = 1e9; w.alv.forEach((a, i) => { const d = Math.abs(a.s - (sc + 5)); if (d < bd) { bd = d; ai = i; } }); w._ai = ai;
    w._oi = 0; w._ci = 0;
    for (let i = 0; i < w.gas.length; i++) {
      const g = w.gas[i]; const a = w.alv[g.a]; const f = F.at(a.s);
      const from = _v1.copy(a.c).addScaledVector(g.o, a.R * 0.7); const to = _v2.copy(f.p);
      const u = frac(g.ph + t * g.v * 0.5);
      if (i < 120) { _p.copy(from).lerp(to, eio(u)); const s = sstep(3, 5, t) * 0.8 * Math.sin(u * Math.PI); _q.setFromEuler(_e.set(u * 6, i, 0)); _m4.compose(_p, _q, _s.set(s, s, s)); w.O2.setMatrixAt(i, _m4); if (Math.abs(a.s - sc - 4) < 3 && u > 0.3 && u < 0.7) w._oi = i; }
      if (i < 80) { _p.copy(to).lerp(from, eio(u)); const s = sstep(9, 11, t) * 0.8 * Math.sin(u * Math.PI); _q.setFromEuler(_e.set(i, u * 5, 0)); _m4.compose(_p, _q, _s.set(s, s, s)); w.CO2.setMatrixAt(i, _m4); if (Math.abs(a.s - sc - 4) < 3 && u > 0.3 && u < 0.7) w._ci = i; }
    }
    for (let i = 120; i < 160; i++) { _m4.compose(_p.set(0, -999, 0), _q, _s.set(0, 0, 0)); w.O2.setMatrixAt(i, _m4); }
    w.O2.instanceMatrix.needsUpdate = true; w.CO2.instanceMatrix.needsUpdate = true;
    const fh = F.at(sH); w.hero.position.copy(fh.p).addScaledVector(fh.b, 0.28); w.hero.rotation.set(t, t * 0.7, 0);
    w.blue.position.copy(F.at(sc + 6).p).add(_v3.set(0, 3, 0));
    const fc = F.at(sc);
    const fl = F.at(sc + 1.2); aim(camera, _v1.copy(fl.p).addScaledVector(fl.b, -1.7).addScaledVector(fl.u, 0.7), _v2.copy(F.at(sc + 2.2).p), fl.u);
    camera.fov = 72 * breathe;
  },
});
