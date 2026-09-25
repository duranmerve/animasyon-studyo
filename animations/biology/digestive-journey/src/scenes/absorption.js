// ============================================================
//  ABSORPTION — brush border, transporters, enterocyte, capillary
// ============================================================
let _geoCache = {};
function sugarGeos() {
  if (_geoCache.glc) return _geoCache;
  _geoCache.glc = ringGeo(6, 0.5, { c: 0xffd070, o: 0xff5a40 });
  _geoCache.fru = ringGeo(5, 0.45, { c: 0xffa050, o: 0xff5a40 });
  _geoCache.suc = linkGeo(ringGeo(6, 0.5, { c: 0xfff4e4, o: 0xff5a40 }), [-0.62, 0, 0], ringGeo(5, 0.45, { c: 0xfff4e4, o: 0xff5a40 }), [0.62, 0, 0]);
  return _geoCache;
}
function heroGlucose() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(sugarGeos().glc, moleculeMat(0xffb830, 1.1)); g.add(m);
  const h = halo(0xffc54d, 3.2, 0.9); g.add(h);
  g.userData.halo = h;
  return g;
}
function vesselTex() { return tissueTex('endo', { c0: 0x3c040c, c1: 0x8e1624, c2: 0xd04858, scale: 3, cells: 10, veins: 0, fine: 0.4, bump: 1.6, seed: 41 }); }

defWorld('absorb', () => {
  const scene = new THREE.Scene();
  const FOG_TOP = new THREE.Color(0x2a0f24), FOG_CELL = new THREE.Color(0x2a1238), FOG_BLOOD = new THREE.Color(0x2a0508);
  scene.background = FOG_TOP.clone(); scene.fog = new THREE.FogExp2(FOG_TOP.clone(), 0.05);
  const G = sugarGeos();
  const memTex = tissueTex('membrane', { c0: 0x5a2a58, c1: 0xb67aa6, c2: 0xf0c8e0, scale: 5, spots: 140, fine: 0.6, bump: 2.2, seed: 61 });
  const memMat = wetMat({ tex: memTex, repeat: [8, 8], rough: 0.45, sheen: 1, sheenColor: 0xffc8ec, transparent: true, opacity: 0.88 });
  const apical = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), memMat); apical.rotation.x = -Math.PI / 2; scene.add(apical);
  const basal = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), memMat.clone()); basal.rotation.x = -Math.PI / 2; basal.position.y = -10; scene.add(basal);
  // microvilli forest
  const mvg = new THREE.CapsuleGeometry(0.075, 1.15, 2, 6); mvg.translate(0, 0.65, 0);
  const mvMat = new THREE.MeshPhysicalMaterial({ color: 0xd49ac4, roughness: 0.4, sheen: 1, sheenColor: new THREE.Color(0xffd6f0), clearcoat: 0.6, emissive: new THREE.Color(0x3a1238), emissiveIntensity: 0.4 });
  const mu = addSway(mvMat, 0.05, 1.1);
  const pts = []; const sp = 0.23;
  for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) { const x = i * sp + (j % 2) * sp / 2, z = j * sp * 0.866; if (x * x + z * z < 62 && (Math.hypot(x - 0.4, z - 0.1) > 0.34)) pts.push([x, z]); }
  const NM = Math.round(pts.length * (QUALITY < 1 ? 0.7 : 1));
  const mv = new THREE.InstancedMesh(mvg, mvMat, NM); mv.frustumCulled = false;
  const r = rngOf(71);
  for (let i = 0; i < NM; i++) { const [x, z] = pts[i]; _p.set(x + (r() - 0.5) * 0.05, 0, z + (r() - 0.5) * 0.05); _q.setFromEuler(_e.set((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12)); const k = 0.9 + r() * 0.25; _s.set(1, k, 1); _m4.compose(_p, _q, _s); mv.setMatrixAt(i, _m4); }
  scene.add(mv);
  scene.add(motes(Math.round(1600 * QUALITY), (v, r) => v.set((r() - 0.5) * 16, 1.35 + r() * 0.5, (r() - 0.5) * 16), { color: 0xe0b0ff, color2: 0xffffff, size: 0.04, drift: 0.05, opacity: 0.5 }));
  // sucrase enzymes on tips
  const suc = new THREE.InstancedMesh(enzymeGeo(11), enzymeMat(0xb36bff), 24); suc.frustumCulled = false;
  const er = rngOf(5);
  const enzPos = [V3(0.3, 1.5, 0.2)]; for (let i = 1; i < 24; i++) enzPos.push(V3((er() - 0.5) * 9, 1.45 + er() * 0.1, (er() - 0.5) * 9));
  enzPos.forEach((p, i) => { _q.setFromEuler(_e.set(er() * 6, er() * 6, 0)); _m4.compose(p, _q, _s.set(0.22, 0.22, 0.22)); suc.setMatrixAt(i, _m4); });
  scene.add(suc);
  // drifting sucrose molecules
  const sucN = 18; const sucs = new THREE.InstancedMesh(G.suc, moleculeMat(0xfff0e0, 0.25), sucN); sucs.frustumCulled = false; scene.add(sucs);
  const sd = Array.from({ length: sucN }, () => ({ p: V3((er() - 0.5) * 12, 2.4 + er() * 3.5, (er() - 0.5) * 12), a: er() * 6, v: 0.2 + er() * 0.3 }));
  // hero
  const heroSuc = new THREE.Mesh(G.suc, moleculeMat(0xfff0e0, 0.45)); heroSuc.scale.setScalar(0.42); scene.add(heroSuc);
  const hero = heroGlucose(); hero.scale.setScalar(0.42); scene.add(hero);
  const fru = new THREE.Mesh(G.fru, moleculeMat(0xff8a30, 0.8)); fru.scale.setScalar(0.42); scene.add(fru);
  // transporters
  const sglt = new THREE.Group(); sglt.position.set(0.4, 0.0, 0.1); scene.add(sglt);
  const trMat = c => new THREE.MeshStandardMaterial({ color: c, emissive: new THREE.Color(c), emissiveIntensity: 1.4, roughness: 0.3 });
  const t1 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 12, 32), trMat(0x45e0ff)); t1.rotation.x = Math.PI / 2; sglt.add(t1);
  for (let k = 0; k < 5; k++) { const lobe = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.35, 4, 8), trMat(0x2aa8d8)); const a = k / 5 * TAU; lobe.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3); sglt.add(lobe); }
  const sgHalo = halo(0x60e8ff, 1.6, 0.6); sglt.add(sgHalo);
  const glut2 = new THREE.Group(); glut2.position.set(0.8, -10, 0.3); scene.add(glut2);
  const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 12, 32), trMat(0x6dff8a)); t2.rotation.x = Math.PI / 2; glut2.add(t2);
  for (let k = 0; k < 5; k++) { const lobe = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.35, 4, 8), trMat(0x3ac860)); const a = k / 5 * TAU; lobe.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3); glut2.add(lobe); }
  glut2.add(halo(0x7dff9a, 1.6, 0.6));
  const na = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 12, 8), trMat(0xc070ff), 6); na.frustumCulled = false; scene.add(na);
  // cytoplasm: mitochondria, ER, nucleus
  const mitoTex = tissueTex('mito', { c0: 0x6a1c1a, c1: 0xd87052, c2: 0xffc4a0, scale: 3, ridges: 9, fine: 0.3, bump: 3, seed: 81 });
  const mitoMat = wetMat({ tex: mitoTex, repeat: [2, 1], rough: 0.4, emissive: 0x401008, ei: 0.5, sheen: 0.6, sheenColor: 0xffb090 });
  const mitos = [];
  const mpos = [[2.6, -3, -1.5], [-2.2, -4.5, 1.2], [3.4, -6.4, 1.6], [-1.4, -7.4, -2.4], [1.8, -2.2, 3.4], [-3.4, -2.6, -2.6], [4.2, -8.2, -2.2], [-2.8, -8.8, 2.6]];
  for (const [x, y, z] of mpos) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.3, 8, 16), mitoMat); m.position.set(x, y, z); m.rotation.set(er() * 3, er() * 3, er() * 3); scene.add(m); mitos.push(m); }
  const nucTex = tissueTex('nuc', { c0: 0x2a1450, c1: 0x6a48b0, c2: 0xb8a0f0, scale: 4, pits: 30, fine: 0.4, bump: 2, seed: 83 });
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(3, 48, 32), wetMat({ tex: nucTex, repeat: [3, 2], rough: 0.4, emissive: 0x201040, ei: 0.6 })); nucleus.position.set(-6.5, -6, -6); scene.add(nucleus);
  const erMat = new THREE.MeshPhysicalMaterial({ color: 0xd070a0, transparent: true, opacity: 0.35, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color(0x401030), emissiveIntensity: 0.5 });
  for (let k = 0; k < 4; k++) { const g = new THREE.PlaneGeometry(7, 1.4, 60, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 1.6 + k) * 0.35); g.computeVertexNormals(); const m = new THREE.Mesh(g, erMat); m.position.set(-4 + k * 1.2, -3.5 - k * 1.6, 3.5 - k * 2.2); m.rotation.set(0.4, k, 0.2); scene.add(m); }
  scene.add(motes(Math.round(900 * QUALITY), (v, r) => v.set((r() - 0.5) * 18, -0.4 - r() * 9.2, (r() - 0.5) * 18), { color: 0xe0a0ff, color2: 0xffd0e8, size: 0.05, drift: 0.2, opacity: 0.55 }));
  // capillary below
  const cpts = [V3(-16, -13.2, 0.3), V3(-5, -13.3, 0.25), V3(5, -13.1, 0.35), V3(16, -13.2, 0.3)];
  const CF = pathFrames(new THREE.CatmullRomCurve3(cpts), 200, V3(0, 1, 0));
  const capR = 1.4;
  const capMat = wetMat({ tex: vesselTex(), repeat: [1, 1], rough: 0.35, transparent: true, opacity: 0.55, depthWrite: false, sheenColor: 0xff6070 });
  const cap = new THREE.Mesh(tubeGeo(CF, (s, th) => capR * (1 + 0.03 * noise3(Math.cos(th), Math.sin(th), s * 0.4)), { radial: 48, uvU: 0.15, uvV: 1 }), capMat); scene.add(cap);
  const NR = 46; const rbc = new THREE.InstancedMesh(rbcGeo(), rbcMat(), NR); rbc.frustumCulled = false; scene.add(rbc);
  const rItems = flowItems(NR, 13, { rMax: 0.55, scale: 0.55, spin: 1.2 });
  scene.add(motes(Math.round(500 * QUALITY), (v, r) => { CF.pt(r() * CF.L, r() * TAU, capR * 0.9 * Math.sqrt(r()), v); }, { color: 0xffe0a0, size: 0.03, drift: 0.2, opacity: 0.5 }));
  scene.add(motes(600, (v, r) => v.set((r() - 0.5) * 30, -10.5 - r() * 7, (r() - 0.5) * 30), { color: 0xff9aa0, size: 0.03, drift: 0.3, opacity: 0.35 }));
  // lights
  const top = new THREE.PointLight(0xffd8f0, 6, 30, 1.2); top.position.set(2, 7, 3); scene.add(top);
  const mid = new THREE.PointLight(0xc080ff, 4, 20, 1.2); mid.position.set(0, -5, 2); scene.add(mid);
  const low = new THREE.PointLight(0xff4050, 6, 20, 1.2); low.position.set(1, -12, 3); scene.add(low);
  scene.add(new THREE.HemisphereLight(0x8a5a9a, 0x200810, 1));
  return { scene, mu, sucs, sd, heroSuc, hero, fru, sglt, sgHalo, glut2, na, mitos, nucleus, CF, rbc, rItems, FOG_TOP, FOG_CELL, FOG_BLOOD, lamp: [4, 20, 0xfff2f4, 1.2], post: { bloom: 0.7, thr: 0.8 } };
});

const GLC_PATH = [[6.9, 0.2, 1.62, 0.3], [9, 0.35, 1.05, 0.3], [11.4, 0.4, 0.45, 0.1], [12.6, 0.4, -0.3, 0.1], [13.8, 0.45, -1.4, 0.15], [18, 0.75, -9.0, 0.3], [19.6, 0.8, -10.6, 0.3], [21.5, 1.0, -12.2, 0.3], [23, 1.8, -13.1, 0.3], [26, 5.2, -13.2, 0.3]];
defChapter({
  order: 7, id: 'absorb', n: 7, name: 'Kana Geçiş', latin: 'Absorptio · emilim', blurb: 'Şeker molekülleri bağırsak hücresinden geçip kana karışır.',
  leg: ['saniyeler', 'Sükroz glikoz ve fruktoza ayrılır; glikoz hücreden geçip kana karışır.'], world: 'absorb', dur: 26, route: 'absorb', mapOn: ['si'], mapWhere: 'Villus', fadeColor: 0x3a0610,
  fadeIn: true, fadeInDur: 1.0,
  clock: [1740, 1765], ph: [[0, 7.2], [12.6, 7.1], [19.6, 7.3], [21, 7.4]], scale: [[0, '~2 µm'], [12.6, '~10 µm'], [19.6, '~8 µm']],
  state: [[0, 'Sükroz (sofra şekeri)'], [6.6, 'Glikoz molekülü']], loc: [[0, 'Fırçamsı kenar'], [12.6, 'Bağırsak hücresi'], [19.6, 'Doku arası'], [21.5, 'Kılcal damar']],
  cues: [
    [0.3, 'Villusun yüzeyi mikrovillus denen çok daha küçük tüylerle kaplı. Artık mikrometre ölçeğindeyiz.'],
    [4.8, 'Besindeki sofra şekeri (sükroz), sükraz enzimiyle ikiye ayrılıyor: glikoz ve fruktoz.'],
    [9.4, 'Kahramanımız artık bu glikoz molekülü. Sodyumla birlikte özel bir kapıdan (SGLT1) hücreye giriyor.'],
    [14.6, 'Hücrenin içinden geçip karşı uçtaki GLUT2 kapısından dışarı çıkıyor.'],
    [20.2, 'Ve kılcal damara giriyor. Besindeki şeker artık kanda!'],
  ],
  banner: [21.8, 25.4, 'Kana karıştı!'],
  facts: [['Sükroz', '= glikoz + fruktoz'], ['Bir mikrovillus', '~1 µm boyunda'], ['Kan şekeri yükselmesi', 'yemekten ~15–30 dk sonra']],
  labels: [
    { t0: 0.6, t1: 4.6, text: 'Mikrovilluslar', sub: 'fırçamsı kenar', at: () => _v1.set(-1.6, 1.3, 1.4), dx: -70, dy: -50 },
    { t0: 2.2, t1: 6.2, text: 'Sükroz', sub: 'sofra şekeri', at: w => w.heroSuc.position, dx: 70, dy: -50, hero: true },
    { t0: 4.8, t1: 8.8, text: 'Sükraz enzimi', at: () => _v2.set(0.3, 1.45, 0.2), dx: -80, dy: 40 },
    { t0: 7, t1: 11.2, text: 'Glikoz', sub: 'kahramanımız', at: w => w.hero.position, dx: 70, dy: -50, hero: true },
    { t0: 7.2, t1: 10.6, text: 'Fruktoz', at: w => w.fru.position, dx: -70, dy: -40 },
    { t0: 10, t1: 13, text: 'SGLT1 kapısı', sub: 'sodyumla birlikte taşır', at: w => w.sglt.position, dx: 80, dy: 30 },
    { t0: 13.8, t1: 17.6, text: 'Mitokondri', sub: 'hücrenin enerji santrali', at: w => w.mitos[0].position, dx: 70, dy: -40 },
    { t0: 14.2, t1: 18.4, text: 'Çekirdek', at: w => w.nucleus.position, dx: -70, dy: -40 },
    { t0: 17.4, t1: 20.4, text: 'GLUT2 kapısı', at: w => w.glut2.position, dx: 80, dy: 30 },
    { t0: 20.4, t1: 24.6, text: 'Kılcal damar', at: () => _v3.set(-1.5, -11.9, 0.3), dx: -80, dy: -40 },
    { t0: 22.4, t1: 26, text: 'Alyuvarlar', sub: 'kırmızı kan hücreleri', at: w => { w.rbc.getMatrixAt(5, _m4); return _v1.setFromMatrixPosition(_m4); }, dx: 70, dy: 50 },
  ],
  events: [[6.5, 'zap'], [6.6, 'ping'], [12.6, 'pop'], [19.6, 'pop'], [21.2, 'whoosh'], [21.9, 'shimmer']],
  audio: { amb: [360, 0.16], flow: [500, 0], heart: 0.18 },
  update(t, w) {
    w.mu.uTime.value = T;
    // sucrose drift
    for (let i = 0; i < w.sd.length; i++) { const d = w.sd[i]; _p.copy(d.p); _p.x += Math.sin(t * d.v + d.a) * 0.6; _p.y += Math.sin(t * d.v * 0.7 + d.a * 2) * 0.3; _p.z += Math.cos(t * d.v + d.a) * 0.6; _q.setFromEuler(_e.set(t * d.v + d.a, t * 0.3, 0)); _m4.compose(_p, _q, _s.set(0.4, 0.4, 0.4)); w.sucs.setMatrixAt(i, _m4); }
    w.sucs.instanceMatrix.needsUpdate = true;
    // hero sucrose → split
    const sp = spl(t, [[0, 1.4, 5.2, -1.6], [3, 0.9, 3.0, -0.6], [5.6, 0.35, 1.9, 0.2], [6.4, 0.3, 1.78, 0.2]]);
    w.heroSuc.position.copy(sp); w.heroSuc.rotation.set(t * 0.5, t * 0.3, 0.2); w.heroSuc.visible = t < 6.5;
    const split = sstep(6.4, 7.2, t);
    const gp = t < 6.9 ? _v1.copy(sp).add(_v2.set(-0.26, 0, 0).applyEuler(w.heroSuc.rotation)).lerp(_v3.set(0.2, 1.62, 0.3), split) : spl(t, GLC_PATH);
    w.hero.position.copy(gp); w.hero.visible = t >= 6.5; w.hero.rotation.set(t * 0.8, t * 0.5, 0);
    w.hero.userData.halo.material.opacity = 0.35 + 0.35 * sstep(6.5, 7.5, t) + 0.2 * Math.sin(t * 3);
    w.fru.position.copy(sp).add(_v2.set(0.26, 0, 0).applyEuler(w.heroSuc.rotation)).add(_v3.set(-1.2, 0.8, 0.9).multiplyScalar(eo(inv(6.5, 11, t)))); w.fru.visible = t >= 6.5 && t < 12; w.fru.rotation.set(t, t * 0.4, 0);
    // transporter glow + Na+
    w.sgHalo.material.opacity = 0.4 + 0.8 * win(t, 11, 13.2, 0.5);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 2; const k = inv(10.4, 13.2, t); const y = lerp(1.2, -0.9, k); _p.set(0.4 + Math.cos(a) * 0.5 * (1 - k * 0.5), y, 0.1 + Math.sin(a) * 0.5 * (1 - k * 0.5)); const s = win(t, 10, 14, 0.6); _m4.compose(_p, _q.identity(), _s.set(s, s, s)); w.na.setMatrixAt(i, _m4); }
    w.na.instanceMatrix.needsUpdate = true;
    w.mitos.forEach((m, i) => { m.rotation.y = i + t * 0.1; m.position.y += Math.sin(t + i) * 0.0015; });
    // capillary RBC flow
    placeFlow(w.rbc, w.CF, w.rItems, t, clamp(gp.x + 16, 0, w.CF.L), { speed: 2.2, back: 12, ahead: 18, radius: () => 1.4 });
    // camera
    const cp = spl(t, [[0, 3.6, 6.6, 5.2], [5, 1.9, 3.2, 2.5], [8, 1.35, 2.5, 1.6], [10.6, 1.05, 1.7, 1.25], [12.2, 0.75, 0.95, 0.75], [13.3, 0.55, -0.5, 0.6], [16, 1.9, -5.0, 2.8], [18.6, 1.3, -8.4, 1.5], [19.7, 1.1, -10.4, 1.0], [21, 0.4, -11.9, 1.1], [22.6, -0.9, -13.05, 0.45], [26, 2.6, -13.2, 0.35]]);
    const look = t < 6.5 ? sp : gp;
    aim(camera, cp, look);
    camera.fov = 64;
    // environment by depth
    const y = cp.y;
    const kCell = sstep(0.3, -0.5, y), kBlood = sstep(-10.2, -11.2, y);
    _c1.copy(w.FOG_TOP).lerp(w.FOG_CELL, kCell).lerp(w.FOG_BLOOD, kBlood);
    w.scene.fog.color.copy(_c1); w.scene.background.copy(_c1); w.scene.fog.density = lerp(0.05, 0.07, kCell) * (1 - kBlood) + 0.06 * kBlood;
  },
  post: t => ({ bloom: 0.75, thr: 0.8, flash: Math.max(win(t, 12.3, 13.1, 0.35), win(t, 19.3, 20.1, 0.35), win(t, 21, 21.8, 0.35)) * 0.32 }),
});
