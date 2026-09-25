// ============================================================
//  LARGE INTESTINE — haustra, taeniae, microbiota, water absorption
// ============================================================
defWorld('colon', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c0906); scene.fog = new THREE.FogExp2(0x1c0906, 0.045);
  const tex = tissueTex('colon', { c0: 0x76302a, c1: 0xd49282, c2: 0xf8d6c4, scale: 3, veins: 44, fine: 0.35, bump: 1.6, seed: 91, veinColor: 'rgba(120,20,30,0.5)' });
  const pts = [V3(0, -10, 0), V3(0, 0, -1), V3(1, 8, -2), V3(8, 11, -3), V3(18, 11, -2), V3(26, 8, -1), V3(27, -2, 0), V3(26, -12, 1), V3(22, -18, 3), V3(16, -20, 5), V3(14, -26, 6), V3(14, -32, 6.5)];
  const F = pathFrames(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 900, V3(0, 0, 1));
  const L = F.L;
  const base = s => (s > L - 14 ? lerp(3.0, 3.4, sstep(L - 14, L - 8, s)) : 3.0) * (1 - 0.72 * sstep(L - 4, L - 0.8, s));
  const prof = (s, th) => {
    const h = Math.pow(0.5 + 0.5 * Math.sin(s * 1.3 + 0.5 * noise3(s * 0.1, 0, 3)), 1.4);
    let r = base(s) * (0.86 + 0.24 * h);
    const tw = s * 0.05; let tb = 0; for (let k = 0; k < 3; k++) { let d = Math.abs(((th - tw - k * TAU / 3) % TAU + TAU) % TAU); d = Math.min(d, TAU - d); tb += Math.exp(-d * d / 0.03); }
    r *= 1 - 0.13 * tb * (1 - sstep(L - 12, L - 6, s));
    return r * (1 + 0.03 * noise3(Math.cos(th) * 2, Math.sin(th) * 2, s * 0.3));
  };
  const mat = wetMat({ tex, repeat: [1, 1], nScale: 0.7, rough: 0.34, ccr: 0.1, sheenColor: 0xffc0a8 });
  const wu = addTubeMotion(mat);
  scene.add(new THREE.Mesh(tubeGeo(F, prof, { radial: 90, uvU: 0.1, uvV: 3 }), mat));
  // microbiota
  const bm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, clearcoat: 0.6, sheen: 1, sheenColor: new THREE.Color(0xffffff), emissive: new THREE.Color(0x303030), emissiveIntensity: 0.6 });
  const NBr = Math.round(260 * QUALITY), NBc = Math.round(180 * QUALITY);
  const rods = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.08, 0.3, 4, 8), bm, NBr); rods.frustumCulled = false; scene.add(rods);
  const cocci = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), bm.clone(), NBc); cocci.frustumCulled = false; scene.add(cocci);
  const pal = [0x5ab8a8, 0x9a78d0, 0xd89a60, 0x8ab860, 0xd07890].map(c => new THREE.Color(c));
  const br = rngOf(3);
  for (let i = 0; i < NBr; i++) rods.setColorAt(i, pal[Math.floor(br() * 5)]);
  for (let i = 0; i < NBc; i++) cocci.setColorAt(i, pal[Math.floor(br() * 5)]);
  const rI = flowItems(NBr, 51, { rMax: 0.93, scale: 0.62, spin: 2 }), cI = flowItems(NBc, 52, { rMax: 0.93, scale: 0.62, spin: 1 });
  // pistachio fibres
  const fibMat = new THREE.MeshPhysicalMaterial({ color: 0x8a9a48, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xd8e8a0), emissive: new THREE.Color(0x222a08), emissiveIntensity: 0.6 });
  const fibers = []; const fr = rngOf(8);
  for (let k = 0; k < 16; k++) {
    const s = 10 + k * 3.6; const f = F.at(s); const c = F.pt(s, fr() * TAU, 1.5 + 0.9 * fr());
    const cps = []; for (let j = 0; j < 8; j++) cps.push(c.clone().add(V3(Math.cos(j * 1.3 + k) * 0.5, Math.sin(j * 1.1) * 0.5, j * 0.25 - 1).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), f.t))));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cps), 40, 0.045, 6), fibMat); scene.add(m); fibers.push({ m, s, c });
  }
  // water droplets moving into the wall
  const drop = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0xa8dcff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.7, emissive: new THREE.Color(0x3a8ad0), emissiveIntensity: 0.8 }), 160);
  drop.frustumCulled = false; scene.add(drop);
  const dr = rngOf(6); const dd = Array.from({ length: 160 }, () => ({ s: dr(), th: dr() * TAU, ph: dr(), v: 0.25 + dr() * 0.3 }));
  // gas bubbles
  const gas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xf0fff0, roughness: 0, clearcoat: 1, transparent: true, opacity: 0.28, depthWrite: false }), 40); gas.frustumCulled = false; scene.add(gas);
  const gI = flowItems(40, 53, { rMax: 0.7, scale: 1, spin: 0.3 });
  // waste mass (tasteful)
  const wasteMat = new THREE.MeshPhysicalMaterial({ color: 0x6a4a2c, roughness: 0.7, sheen: 0.6, sheenColor: new THREE.Color(0xa08050), clearcoat: 0.2 });
  const waste = new THREE.Mesh(blobGeo(1.3, 4, 0.35, 11), wasteMat); waste.scale.set(1, 0.8, 1.5); scene.add(waste);
  const exitGlow = halo(0xfff2e0, 9, 0); exitGlow.position.copy(F.P[F.n]).addScaledVector(F.T[F.n], 1.5); scene.add(exitGlow);
  const exitL = new THREE.PointLight(0xfff0e0, 0, 25, 1.2); exitL.position.copy(exitGlow.position); scene.add(exitL);
  scene.add(motes(Math.round(1200 * QUALITY), (v, r) => { const s = r() * L; F.pt(s, r() * TAU, 2.6 * Math.sqrt(r()), v); }, { color: 0xffe0b0, color2: 0xd0ffd0, size: 0.04, drift: 0.25, opacity: 0.45 }));
  scene.add(new THREE.HemisphereLight(0xc07860, 0x201008, 1.2));
  return { scene, F, L, prof, base, wu, rods, cocci, rI, cI, fibers, drop, dd, gas, gI, waste, exitGlow, exitL, lamp: [5.5, 26, 0xfff4ea, 1.2], post: { bloom: 0.6, thr: 0.85 } };
});

defChapter({
  order: 13, id: 'colon', n: 13, name: 'Kalın Bağırsak', latin: 'Intestinum crassum', blurb: 'Sindirilemeyenler için son durak: su geri alınır, bakteriler iş başında.',
  world: 'colon', dur: 23, route: 'colon', mapOn: ['colon'], fadeColor: 0x0a0406, fadeOutDur: 1.4,
  leg: ['10–40 sa', 'Lifler bakterilerce mayalanır, su geri emilir, atık vücuttan atılır.'],
  clock: [6 * 3600, 30 * 3600], ph: [[0, 6.0], [23, 6.9]], scale: '~6 cm', state: [[0, 'Lifler ve atıklar'], [11, 'Katılaşan atık']], loc: [[0, 'Çıkan kolon'], [6, 'Enine kolon'], [11, 'İnen kolon'], [17, 'Rektum']],
  cues: [
    [0.3, 'Peki besinin geri kalanı? Fıstığın lifleri gibi sindirilemeyen kısımlar kalın bağırsağa ulaşır.'],
    [5.4, 'Burada trilyonlarca bakteri yaşar. Lifleri mayalayıp vücuda faydalı kısa zincirli yağ asitleri üretirler.'],
    [10.8, 'Kalın bağırsak içerikteki suyun büyük kısmını geri emer; atık yavaş yavaş katılaşır.'],
    [16.4, 'Yolculuğun son durağı rektum. Bir iki gün içinde geriye kalanlar vücuttan atılır.'],
  ],
  facts: [['Uzunluk', '~1,5 m'], ['Bağırsak bakterisi', '~38 trilyon'], ['Geçiş süresi', '~10–40 saat']],
  labels: [
    { t0: 1, t1: 5.2, text: 'Haustra', sub: 'kalın bağırsak cepleri', at: w => w.F.pt(w._sc + 6, 1.1, w.prof(w._sc + 6, 1.1) * 0.95, _v1), dx: 70, dy: -50 },
    { t0: 5.6, t1: 10.4, text: 'Bağırsak bakterileri', sub: 'mikrobiyota', at: w => { w.rods.getMatrixAt(w._bi, _m4); return _v2.setFromMatrixPosition(_m4); }, dx: -80, dy: -40, hero: true },
    { t0: 6.4, t1: 10.8, text: 'Lifler', sub: 'fıstıktan kalan', at: w => w._fib, dx: 70, dy: 40 },
    { t0: 10.8, t1: 15.4, text: 'Su emilimi', sub: 'su bağırsak duvarına geçer', at: w => { w.drop.getMatrixAt(w._di, _m4); return _v3.setFromMatrixPosition(_m4); }, dx: 70, dy: -40 },
    { t0: 14.6, t1: 19, text: 'Atık', sub: 'katılaşıyor', at: w => w.waste.position, dx: -70, dy: 40 },
    { t0: 17.4, t1: 21.8, text: 'Rektum', sub: 'son durak', at: w => w.F.pt(w.L - 7, 2.0, w.base(w.L - 7) * 0.9, _v1), dx: 70, dy: -40 },
  ],
  events: [[2, 'squish'], [7, 'bubbles'], [12, 'drip'], [12.6, 'drip'], [13.2, 'drip'], [18, 'squish']],
  audio: { amb: [240, 0.22], heart: 0.08 },
  update(t, w) {
    const { F, L } = w;
    const sc = lerp(2, L - 7.5, inv(0, 21.5, t) * 0.55 + eio(inv(0, 21.5, t)) * 0.45) + sstep(21, 23, t) * 2.8;
    w._sc = sc;
    w.wu.uTime.value = T; w.wu.uBreathA.value = 0.02; w.wu.uWaveC.value = sc - 4 + Math.sin(t * 0.5) * 2; w.wu.uWaveA.value = 0.08; w.wu.uWaveW.value = 3;
    const rad = s => w.base(s) * 0.85;
    placeFlow(w.rods, F, w.rI, T, sc, { speed: 0.5, back: 3, ahead: 20, radius: rad, swirl: 0.1, scaleFn: () => 1 });
    placeFlow(w.cocci, F, w.cI, T, sc, { speed: 0.45, back: 3, ahead: 20, radius: rad, swirl: 0.1 });
    placeFlow(w.gas, F, w.gI, T, sc, { speed: 0.3, back: 3, ahead: 18, radius: rad, scaleFn: it => 0.1 + 0.25 * frac(it.ph) });
    w._bi = 3;
    let fb = null, fd = 1e9; for (const f of w.fibers) { const d = f.s - sc - 4; if (d > 0 && d < fd) { fd = d; fb = f.c; } } w._fib = fb || w.fibers[0].c;
    // droplets move from lumen to wall
    let di = 0;
    for (let i = 0; i < w.dd.length; i++) {
      const d = w.dd[i]; const s = sc + 1 + d.s * 14; const u = frac(d.ph + t * d.v);
      const r = lerp(0.4, w.prof(s, d.th) * 0.98, eio(u)); F.pt(s, d.th, r, _p);
      const sz = sstep(9.6, 11, t) * (1 - sstep(0.85, 1, u)) * (0.6 + 0.6 * d.ph);
      _m4.compose(_p, _q.identity(), _s.set(sz, sz, sz)); w.drop.setMatrixAt(i, _m4);
      if (u > 0.3 && u < 0.6 && d.s < 0.4) di = i;
    }
    w._di = di; w.drop.instanceMatrix.needsUpdate = true;
    const ws = sc + 5.5 + 0.4 * Math.sin(t); const fw = F.at(ws); w.waste.position.copy(fw.p).addScaledVector(fw.u, -0.6); w.waste.quaternion.setFromUnitVectors(V3(0, 0, 1), fw.t); w.waste.visible = t > 13;
    w.waste.scale.setScalar(sstep(13, 15, t)); w.waste.scale.z *= 1.5;
    const endK = sstep(17, 23, t); w.exitGlow.material.opacity = endK * 0.9; w.exitL.intensity = endK * 12;
    const fc = F.at(sc);
    aim(camera, _v1.copy(fc.p).addScaledVector(fc.u, 0.4), _v2.copy(F.at(sc + 4).p), fc.u);
    camera.fov = 70;
  },
});
