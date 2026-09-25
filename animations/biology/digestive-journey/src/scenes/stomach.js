// ============================================================
//  STOMACH — J-shaped chamber, gastric juice, churning, pylorus
// ============================================================
defWorld('stomach', () => {
  const scene = new THREE.Scene();
  const FOG_AIR = new THREE.Color(0x24080a), FOG_ACID = new THREE.Color(0x283008);
  scene.background = FOG_AIR.clone();
  scene.fog = new THREE.FogExp2(FOG_AIR.clone(), 0.03);
  const tex = tissueTex('gastric', { c0: 0x741820, c1: 0xc4585c, c2: 0xf2a896, scale: 3, veins: 18, pits: 80, fine: 0.5, bump: 2.6, seed: 12 });
  const pts = [V3(-0.5, 8.2, 0), V3(0.3, 5.5, 0), V3(0.6, 1.5, 0), V3(0, -3, 0), V3(-2.6, -6.4, 0), V3(-6.4, -6.9, 0), V3(-9.6, -5.0, 0), V3(-12.5, -3.4, 0)];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const F = pathFrames(curve, 520, V3(1, 0, 0));
  const sB = F.nearestS(pts[3]), sA = F.nearestS(pts[5]), sP = F.nearestS(pts[6]);
  const R = 5.3;
  const radius = s => {
    let r;
    if (s < R) r = Math.sqrt(Math.max(0.0004, R * R - (R - s) * (R - s))) * 1.08;
    else if (s < sB) r = 5.75;
    else if (s < sA) r = lerp(5.75, 3.2, eio(inv(sB, sA, s)));
    else if (s < sP) r = lerp(3.2, 0.8, Math.pow(inv(sA, sP, s), 0.8));
    else r = lerp(0.8, 1.4, sstep(sP, sP + 1.2, s));
    return r;
  };
  const prof = (s, th) => {
    const r = radius(s);
    const ru = sstep(2, 6, s) * (1 - sstep(sP - 1, sP, s));
    const ridge = Math.pow(0.5 + 0.5 * Math.sin(th * 13 + 2.2 * noise3(s * 0.12, Math.cos(th), Math.sin(th))), 5);
    const n = 0.05 * noise3(Math.cos(th) * 2 + s * 0.2, Math.sin(th) * 2, s * 0.2);
    return r * (1 - 0.1 * ridge * ru + n);
  };
  const mat = wetMat({ tex, repeat: [1, 1], nScale: 0.9, rough: 0.42, sheenColor: 0xffb09a });
  const wu = addTubeMotion(mat);
  scene.add(new THREE.Mesh(tubeGeo(F, prof, { radial: 110, uvU: 0.12, uvV: 5 }), mat));
  // cardia opening (behind the camera at the start)
  const LEVEL = -2.8;
  // gastric juice surface
  const liqMat = new THREE.MeshPhysicalMaterial({ color: 0xc9cf5c, transparent: true, opacity: 0.5, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color(0x3a4410), emissiveIntensity: 0.6 });
  const lu = { uTime: { value: 0 } };
  liqMat.onBeforeCompile = sh => { sh.uniforms.uTime = lu.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += 0.09*sin(position.x*1.3+uTime*1.7)+0.07*sin(position.y*1.7-uTime*1.3)+0.04*sin((position.x+position.y)*3.1+uTime*2.3);'); };
  const liq = new THREE.Mesh(new THREE.PlaneGeometry(40, 40, 120, 120), liqMat); liq.rotation.x = -Math.PI / 2; liq.position.y = LEVEL; scene.add(liq);
  // bubbles
  const bubMat = new THREE.MeshPhysicalMaterial({ color: 0xf2ffd0, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.4, emissive: new THREE.Color(0x98a840), emissiveIntensity: 0.35, depthWrite: false });
  const NB = Math.round(220 * QUALITY);
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), bubMat, NB); bubbles.frustumCulled = false; scene.add(bubbles);
  const br = rngOf(44), bub = [];
  for (let i = 0; i < NB; i++) { const s = lerp(sB - 2, sP - 1, br()); const th = br() * TAU; const p = F.pt(s, th, radius(s) * 0.85 * Math.sqrt(br())); bub.push({ x: p.x, z: p.z, y0: Math.min(p.y, LEVEL - 0.2), sp: 0.4 + br() * 0.9, ph: br(), r: 0.03 + br() * 0.1 }); }
  // hero bolus + chyme
  const bolusMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 1, sheenColor: new THREE.Color(0xffd0dc), emissive: new THREE.Color(0xc03060), emissiveIntensity: 0.12, transparent: true });
  const bolus = new THREE.Mesh(blobGeo(0.9, 5, 0.2, 5, sweetColors), bolusMat); scene.add(bolus);
  const NC = Math.round(1800 * QUALITY);
  const chyme = motes(NC, v => v.set(0, 0, 0), { color: 0xffb8c8, color2: 0xf6e0b8, size: 0.09, drift: 0, opacity: 0.9, near: 0.1 }); scene.add(chyme);
  const cr = rngOf(52), cdat = []; for (let i = 0; i < NC; i++) cdat.push({ a: cr() * TAU, r: Math.pow(cr(), 0.6), h: cr() * 2 - 1, sp: 0.4 + cr(), e: cr() });
  const clumpMat = new THREE.MeshPhysicalMaterial({ color: 0xa88878, vertexColors: true, roughness: 0.5, clearcoat: 0.6 });
  const clumps = new THREE.InstancedMesh(blobGeo(0.2, 2, 0.4, 3, sweetColors), clumpMat, 70); clumps.frustumCulled = false; scene.add(clumps);
  const pepsin = new THREE.InstancedMesh(enzymeGeo(5), enzymeMat(0x6dffa0), 14); pepsin.frustumCulled = false; scene.add(pepsin);
  const pist = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 1), pistachioMat(), 10); pist.frustumCulled = false; scene.add(pist);
  // secretion sparkles on walls
  scene.add(motes(Math.round(1400 * QUALITY), (v, r) => { const s = lerp(3, sP, r()); F.pt(s, r() * TAU, radius(s) * 0.93, v); }, { color: 0xd8ff9a, color2: 0xffffff, size: 0.05, drift: 0.12, opacity: 0.55 }));
  scene.add(motes(Math.round(900 * QUALITY), (v, r) => { const s = lerp(1, sP, r()); F.pt(s, r() * TAU, radius(s) * 0.7 * Math.sqrt(r()), v); }, { color: 0xfff0c0, color2: 0xc8e070, size: 0.03, drift: 0.25, opacity: 0.5 }));
  // pylorus glow & lights
  const fP = F.at(sP);
  const pyGlow = halo(0xffc07a, 3.5, 0.0); pyGlow.position.copy(fP.p).addScaledVector(fP.t, 1.4); scene.add(pyGlow);
  scene.add(new THREE.HemisphereLight(0xb05060, 0x2a3008, 1.1));
  const acidL = new THREE.PointLight(0xd6e070, 6, 22, 1.2); acidL.position.set(-1, -5, 0); scene.add(acidL);
  const topL = new THREE.PointLight(0xffc0b0, 4, 20, 1.2); topL.position.set(0, 5, 2); scene.add(topL);
  return { scene, F, sB, sA, sP, radius, wu, lu, LEVEL, bubbles, bub, bolus, chyme, cdat, clumps, pepsin, pist, pyGlow, fP, FOG_AIR, FOG_ACID, lamp: [5, 30, 0xfff2e8, 1.2], post: { bloom: 0.55, thr: 0.85 } };
});

const _c1 = new THREE.Color();
defChapter({
  order: 4, id: 'stomach', n: 4, name: 'Mide', latin: 'Gaster · ventriculus', blurb: 'Asit ve kas gücüyle lokmayı bulamaç kıvamına getirir.',
  leg: ['30 dk – 4 sa', 'Asit ve pepsin lokmayı kimus denen bulamaca dönüştürür.'], world: 'stomach', dur: 26, route: 'stomach', mapOn: ['stomach'], fadeColor: 0x3a2010,
  clock: [30, 1200], ph: [[0, 7], [3.5, 6], [8, 2.3], [26, 2]], scale: '~15 cm', state: [[0, 'Lokma'], [8, 'Çözünüyor'], [15, 'Kimus (bulamaç)']], loc: [[0, 'Mide ağzı'], [4, 'Mide gövdesi'], [15, 'Mide çıkışı (antrum)'], [21, 'Pilor']],
  cues: [
    [0.3, 'Mideye ulaştık. İçerisi asidik mide özsuyuyla dolu.'],
    [4.6, 'Hidroklorik asit (HCl), midenin pH değerini 1,5–3,5’e indirir; mikropların çoğu burada ölür.'],
    [9.6, 'Tükürükteki amilaz bu asitte etkisini yitirir. Pepsin enzimi ise fıstıktaki proteinleri parçalar.'],
    [15.2, 'Mide duvarı dalga dalga kasılıp içeriği çalkalar. Besin artık kimus denen koyu bir bulamaç.'],
    [20.6, 'Mide kapısı (pilor) aralanır ve kimusu azar azar ince bağırsağa bırakır.'],
  ],
  facts: [['Hacim', '~1–1,5 L (4 L’ye kadar genişler)'], ['Asitlik', 'pH 1,5–3,5'], ['Kalış süresi', 'Şekerliler hızlı; karışık öğün 2–4 sa']],
  labels: [
    { t0: 1.2, t1: 5.4, text: 'Mide özsuyu', sub: 'hidroklorik asit · HCl', at: w => _v1.set(0.2, w.LEVEL, 0.2), dx: 70, dy: -60, hero: true },
    { t0: 4.8, t1: 9.2, text: 'Mide kıvrımları', sub: 'rugae', at: w => w.F.pt(w.sB - 3, 0.3, w.radius(w.sB - 3) * 0.9, _v2), dx: -70, dy: -50 },
    { t0: 9.6, t1: 14.6, text: 'Pepsin', sub: 'proteinleri parçalar', at: w => { w.pepsin.getMatrixAt(3, _m4); return _v3.setFromMatrixPosition(_m4); }, dx: 70, dy: -50, hero: true },
    { t0: 10.5, t1: 15, text: 'Mukus tabakası', sub: 'mideyi kendi asidinden korur', at: w => w.F.pt(w.sB + 1, 2.4, w.radius(w.sB + 1) * 0.92, _v2), dx: -80, dy: 40 },
    { t0: 15.4, t1: 20.4, text: 'Kimus', sub: 'yarı sindirilmiş bulamaç', at: w => w.bolus.position, dx: 70, dy: -50, hero: true },
    { t0: 20.6, t1: 25.6, text: 'Pilor', sub: 'mide kapısı', at: w => w.fP.p, dx: 70, dy: -40 },
  ],
  events: [[4, 'splash'], [6, 'bubbles'], [9, 'bubbles'], [12.5, 'bubbles'], [16, 'squish'], [19, 'squish'], [20.8, 'valve'], [23.1, 'valve'], [25.3, 'whoosh']],
  audio: { amb: [300, 0.26], heart: 0.1 },
  update(t, w) {
    const { F } = w;
    w.wu.uTime.value = T; w.lu.uTime.value = T;
    // churning waves travelling toward the pylorus
    const k1 = frac(t / 6.5), k2 = frac(t / 6.5 + 0.5);
    w.wu.uWaveC.value = lerp(w.sB - 4, w.sP, k1); w.wu.uWaveA.value = 0.1 + 0.05 * sstep(12, 16, t); w.wu.uWaveW.value = 2.2;
    w.wu.uWave2C.value = lerp(w.sB - 4, w.sP, k2); w.wu.uWave2A.value = 0.08; w.wu.uWave2W.value = 2.2;
    w.wu.uBreathA.value = 0.015;
    // pylorus opening pulses
    const open = Math.max(win(t, 20.4, 21.6, 0.3), win(t, 22.7, 23.9, 0.3), sstep(24.8, 25.4, t));
    w.wu.uBulgeC.value = w.sP; w.wu.uBulgeW.value = 0.7; w.wu.uBulgeA.value = open * 0.9;
    w.pyGlow.material.opacity = 0.25 + open * 0.6;
    // bolus path
    const bp = spl(t, [[0, -4.1, 4.0, 1.1], [1.6, -2.6, 2.7, 1.0], [3.0, -0.7, 0.1, 0.8], [4.0, 0.3, -2.8, 0.6], [8, 0.2, -4.2, 0.3], [14, -1.6, -5.0, 0.2], [19, -4.6, -5.6, 0.0], [23, -7.8, -5.3, 0], [25.6, -9.8, -5.0, 0]]);
    const dis = sstep(6, 16, t);
    w.bolus.position.copy(bp); w.bolus.rotation.set(t * 0.5, t * 0.3, t * 0.2);
    w.bolus.scale.setScalar(lerp(0.95, 0.28, dis)); w.bolus.material.opacity = 1 - sstep(15, 19, t) * 0.8;
    // chyme cloud
    const pos = w.chyme.geometry.attributes.position;
    const spread = lerp(0.3, 2.6, dis) * (1 - 0.45 * sstep(19, 25, t));
    for (let i = 0; i < pos.count; i++) {
      const d = w.cdat[i]; const a = d.a + t * d.sp * 0.6; const rr = d.r * spread * (0.4 + 0.6 * sstep(0, 1, dis + d.e * 0.3));
      pos.setXYZ(i, bp.x + Math.cos(a) * rr - (t > 19 ? d.e * 1.5 * sstep(19, 25, t) : 0), bp.y + d.h * rr * 0.6, bp.z + Math.sin(a) * rr);
    }
    pos.needsUpdate = true; w.chyme.material.uniforms.uOpacity.value = sstep(5, 9, t) * 0.9;
    for (let i = 0; i < w.clumps.count; i++) {
      const d = w.cdat[i * 7]; const a = d.a * 3 + t * d.sp * 0.8; const rr = (0.4 + d.r) * spread * 0.8;
      const sc = sstep(7, 11, t) * (0.35 + d.e * 0.5) * (1 - sstep(18, 24, t) * 0.5);
      _p.set(bp.x + Math.cos(a) * rr, bp.y + d.h * rr * 0.5, bp.z + Math.sin(a) * rr); _q.setFromEuler(_e.set(a, t, d.e * 6));
      _m4.compose(_p, _q, _s.set(sc, sc, sc)); w.clumps.setMatrixAt(i, _m4);
    }
    w.clumps.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < w.pepsin.count; i++) {
      const a = i / w.pepsin.count * TAU + t * 0.45, rr = 1.4 + 0.5 * Math.sin(t * 1.3 + i);
      const on = win(t, 8.5, 18, 1.2);
      _p.set(bp.x + Math.cos(a) * rr, bp.y + Math.sin(a * 2 + t) * 0.7, bp.z + Math.sin(a) * rr); _q.setFromEuler(_e.set(t + i, t * 0.8, 0));
      const s = on * 0.15; _m4.compose(_p, _q, _s.set(s, s, s)); w.pepsin.setMatrixAt(i, _m4);
    }
    w.pepsin.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < w.pist.count; i++) {
      const a = i / w.pist.count * TAU - t * 0.3, rr = 0.9 + 0.3 * Math.sin(i * 2.3);
      const s = win(t, 7, 17, 1) * (1 - sstep(10, 16, t) * 0.8);
      _p.set(bp.x + Math.cos(a) * rr, bp.y + Math.sin(a * 3) * 0.4, bp.z + Math.sin(a) * rr); _q.setFromEuler(_e.set(t * 2 + i, t, i));
      _m4.compose(_p, _q, _s.set(s, s * 0.7, s)); w.pist.setMatrixAt(i, _m4);
    }
    w.pist.instanceMatrix.needsUpdate = true;
    // bubbles
    for (let i = 0; i < w.bub.length; i++) {
      const b = w.bub[i]; const H = w.LEVEL - b.y0; const f = frac(b.ph + t * b.sp / Math.max(H, 0.5));
      _p.set(b.x + Math.sin(t * 2 + i) * 0.08, b.y0 + f * H, b.z + Math.cos(t * 1.7 + i) * 0.08);
      const s = b.r * (0.6 + f * 0.6) * (H > 0.3 ? 1 : 0); _m4.compose(_p, _q.identity(), _s.set(s, s, s)); w.bubbles.setMatrixAt(i, _m4);
    }
    w.bubbles.instanceMatrix.needsUpdate = true;
    // camera
    const cp = spl(t, [[0, -1.6, 5.6, 3.4], [3, -2.2, 2.6, 3.8], [5.2, -1.3, -1.2, 3.6], [7.6, -0.7, -3.4, 3.1], [12, 1.9, -4.6, 2.2], [16, 0.9, -5.3, -2.3], [19.2, -2.6, -4.5, 2.1], [22.6, -5.8, -4.9, 1.1], [25.3, -8.7, -5.0, 0.15], [26, -10.4, -4.6, 0]]);
    const look = t < 22 ? _v2.copy(bp) : _v2.copy(bp).lerp(w.fP.p, sstep(22, 24, t));
    aim(camera, cp, look);
    camera.fov = 68;
    // underwater
    const under = sstep(0.25, -0.25, cp.y - w.LEVEL);
    _c1.copy(w.FOG_AIR).lerp(w.FOG_ACID, under);
    w.scene.fog.color.copy(_c1); w.scene.background.copy(_c1); w.scene.fog.density = lerp(0.028, 0.075, under);
  },
  post: t => ({ bloom: 0.55, ca: 0.004 + 0.004 * sstep(7, 8, t) }),
});
