// ============================================================
//  DUODENUM + SMALL INTESTINE
// ============================================================
function flowPoints(n, seed, o) {
  const pts = motes(n, v => v.set(0, 0, 0), o); const r = rngOf(seed);
  pts.userData.items = Array.from({ length: n }, () => ({ s: r(), rr: Math.sqrt(r()) * (o.rMax ?? 0.8), th: r() * TAU, v: 0.7 + r() * 0.6 }));
  return pts;
}
function updateFlowPoints(pts, F, time, sc, o) {
  const pos = pts.geometry.attributes.position, items = pts.userData.items;
  const back = o.back ?? 3, ahead = o.ahead ?? 24, span = back + ahead;
  for (let i = 0; i < items.length; i++) {
    const it = items[i]; const rel = wrap(it.s * span + o.speed * time * it.v - sc, -back, ahead); const s = clamp(sc + rel, 0, F.L);
    const R = (o.radius ? o.radius(s) : 1) * it.rr; const th = it.th + (o.swirl ?? 0.2) * time * it.v;
    F.pt(s, th, R, _p); pos.setXYZ(i, _p.x, _p.y, _p.z);
  }
  pos.needsUpdate = true;
}

defWorld('duo', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x22090a); scene.fog = new THREE.FogExp2(0x22090a, 0.06);
  const tex = tissueTex('duo', { c0: 0x80302a, c1: 0xd48468, c2: 0xf8cca4, scale: 4, veins: 10, spots: 90, fine: 0.9, bump: 2.8, seed: 21 });
  const pts = [V3(0, 0, 0), V3(0, -3, -1), V3(1.5, -7, -1.6), V3(5, -9.2, -1.2), V3(9, -8.4, 0), V3(11.6, -5, 1), V3(12.4, -1, 1.4), V3(12.2, 3, 1.6)];
  const F = pathFrames(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 480, V3(1, 0, 0));
  const R0 = 1.65;
  const prof = (s, th) => {
    const fold = Math.pow(0.5 + 0.5 * Math.cos(s * 2.3 + 0.7 * Math.sin(th * 2 + s * 0.5)), 8) * (0.55 + 0.45 * Math.sin(th + s * 0.3));
    return R0 * (1 - 0.24 * fold + 0.05 * noise3(Math.cos(th) * 2, Math.sin(th) * 2, s * 0.3)) * lerp(0.6, 1, sstep(0, 2, s));
  };
  const mat = wetMat({ tex, repeat: [1, 1], nScale: 1.1, rough: 0.5, sheen: 1, sheenColor: 0xffd0b0, ccr: 0.22 });
  const wu = addTubeMotion(mat);
  scene.add(new THREE.Mesh(tubeGeo(F, prof, { radial: 72, uvU: 0.3, uvV: 3 }), mat));
  // ampulla of Vater
  const sV = 8.6, thV = Math.PI * 0.92;
  const fV = F.at(sV); const Opos = F.pt(sV, thV, prof(sV, thV) * 0.92);
  const inward = _v1.copy(fV.p).sub(Opos).normalize().clone();
  const pap = new THREE.Mesh(blobGeo(0.34, 3, 0.15, 7), wetMat({ color: 0xe8a080, rough: 0.35 }));
  pap.position.copy(Opos); pap.scale.set(1, 1, 1); scene.add(pap);
  const ori = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: 0x120304 }));
  ori.position.copy(Opos).addScaledVector(inward, 0.33); ori.lookAt(fV.p); scene.add(ori);
  // flows
  const chyme = flowPoints(Math.round(900 * QUALITY), 3, { color: 0xf5d0b0, color2: 0xffb0c0, size: 0.07, drift: 0.05, opacity: 0.8, rMax: 0.85 }); scene.add(chyme);
  const NS = 500;
  const bile = motes(NS, v => v.set(0, 0, 0), { color: 0xb8e03a, color2: 0xe0c020, size: 0.07, drift: 0.04, opacity: 1 }); scene.add(bile);
  const panc = motes(NS, v => v.set(0, 0, 0), { color: 0x9ad8ff, color2: 0xe0f4ff, size: 0.07, drift: 0.04, opacity: 1 }); scene.add(panc);
  const sr = rngOf(77); const sdat = Array.from({ length: NS }, () => ({ ph: sr(), a: sr() * TAU, r: sr(), v: 0.6 + sr() * 0.8 }));
  // fat droplet → emulsion
  const fatMat = new THREE.MeshPhysicalMaterial({ color: 0xffd35a, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85, emissive: new THREE.Color(0x604008), emissiveIntensity: 0.15 });
  const fat = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), fatMat, 17); fat.frustumCulled = false; scene.add(fat);
  const fr = rngOf(15); const fdat = Array.from({ length: 16 }, () => V3(fr() - 0.5, fr() - 0.5, fr() - 0.5).normalize().multiplyScalar(0.4 + fr() * 0.6));
  // starch chain → maltose
  const ring6 = ringGeo(6, 0.45, { c: 0xfff1d6, o: 0xff6a50 });
  const starch = new THREE.InstancedMesh(ring6, moleculeMat(0xffe0a0, 0.25), 8); starch.frustumCulled = false; scene.add(starch);
  const amy = new THREE.Mesh(enzymeGeo(9), enzymeMat(0x46d6ff)); amy.scale.setScalar(0.34); scene.add(amy);
  scene.add(motes(Math.round(700 * QUALITY), (v, r) => { const s = r() * F.L; F.pt(s, r() * TAU, R0 * 0.8 * Math.sqrt(r()), v); }, { color: 0xffe8c8, size: 0.02, drift: 0.2, opacity: 0.4 }));
  scene.add(new THREE.HemisphereLight(0xc07060, 0x281008, 1.1));
  return { scene, F, prof, wu, sV, Opos, inward, chyme, bile, panc, sdat, fat, fdat, starch, amy, lamp: [4.5, 20, 0xfff2e6, 1.2] };
});

defChapter({
  order: 5, id: 'duo', n: 5, name: 'Onikiparmak Bağırsağı', latin: 'Duodenum', blurb: 'Safra ve pankreas özsuyu burada devreye girer.',
  leg: ['dakikalar', 'Safra ve pankreas özsuyu gelir; asit nötrlenir, nişasta maltoza kesilir.'], world: 'duo', dur: 19, route: 'duo', mapOn: ['stomach', 'pancreas', 'liver'], mapWhere: 'Onikiparmak b.', fadeColor: 0x3a2010,
  clock: [1200, 1500], ph: [[0, 2.2], [9, 5.5], [15, 7.2], [19, 7.4]], scale: '~3 cm', state: [[0, 'Kimus'], [9, 'Kimus + safra'], [13, 'Maltoz, yağ damlacıkları']], loc: [[0, 'Onikiparmak bağırsağı'], [5, 'Vater kabarcığı']],
  cues: [
    [0.3, 'İnce bağırsağın ilk bölümü: onikiparmak bağırsağı. Adı, uzunluğunun yaklaşık on iki parmak eni olmasından gelir.'],
    [5.4, 'Karaciğerin ürettiği safra ve pankreas özsuyu buraya dökülür.'],
    [9.4, 'Pankreastan gelen bikarbonat asidi nötrler; safra ise yağları küçük damlacıklara böler.'],
    [14, 'Pankreas amilazı, nişasta zincirlerini ikili şeker parçalarına (maltoz) keser.'],
  ],
  facts: [['Uzunluk', '~25 cm'], ['pH', '2’den 7’ye yükselir'], ['Günlük safra', '~0,5–1 L']],
  labels: [
    { t0: 4.8, t1: 9.4, text: 'Vater kabarcığı', sub: 'safra + pankreas kanalı', at: w => w.Opos, dx: -80, dy: -40 },
    { t0: 6, t1: 10.5, text: 'Safra', sub: 'karaciğerden', at: w => w.bile.geometry.attributes.position.array.length ? _v2.fromArray(w.bile.geometry.attributes.position.array, 3 * 40) : null, dx: 70, dy: -50 },
    { t0: 6.4, t1: 10.5, text: 'Pankreas özsuyu', sub: 'bikarbonat + enzimler', at: w => _v3.fromArray(w.panc.geometry.attributes.position.array, 3 * 60), dx: 70, dy: 50 },
    { t0: 9.8, t1: 13.8, text: 'Yağ damlacıkları', sub: 'safra ile emülsiyon', at: w => { w.fat.getMatrixAt(3, _m4); return _v1.setFromMatrixPosition(_m4); }, dx: -80, dy: -40, hero: true },
    { t0: 14, t1: 19, text: 'Nişasta → maltoz', sub: 'moleküller büyütüldü', at: w => { w.starch.getMatrixAt(2, _m4); return _v1.setFromMatrixPosition(_m4); }, dx: 70, dy: -50, hero: true },
    { t0: 14.6, t1: 19, text: 'Pankreas amilazı', at: w => w.amy.position, dx: -70, dy: 50 },
  ],
  events: [[5.2, 'bubbles'], [10.6, 'pop'], [10.8, 'pop'], [11, 'pop'], [15.6, 'zap']],
  audio: { amb: [280, 0.24], heart: 0.1 },
  update(t, w) {
    const { F } = w;
    w.wu.uTime.value = T; w.wu.uBreathA.value = 0.02;
    const sc = lerp(0.6, 17.5, eio(inv(0, 19, t)) * 0.7 + inv(0, 19, t) * 0.3) - 1.6 * win(t, 4, 17, 2);
    w.wu.uWaveC.value = sc - 3 + frac(t / 4) * 1.5; w.wu.uWaveA.value = 0.12; w.wu.uWaveW.value = 1.2;
    updateFlowPoints(w.chyme, F, t, sc, { speed: 1.6, radius: s => w.prof(s, 0) * 0.85, back: 3, ahead: 18 });
    // secretions from ampulla
    const on = sstep(4.6, 6, t);
    const bp = w.bile.geometry.attributes.position, pp = w.panc.geometry.attributes.position;
    const fo = {};
    for (let i = 0; i < w.sdat.length; i++) {
      const d = w.sdat[i];
      for (const [arr, off] of [[bp, 0], [pp, 0.5]]) {
        const age = frac(d.ph + off * 0.13 + t * 0.35 * d.v);
        const u1 = Math.min(1, age / 0.2);
        const sAlong = w.sV + Math.max(0, age - 0.2) * 9;
        F.at(sAlong, fo);
        const spread = (0.15 + age * 1.1) * d.r;
        const th = d.a + off * 2;
        _p.copy(w.Opos).addScaledVector(w.inward, u1 * 1.1).lerp(fo.p, sstep(0.15, 0.45, age)).addScaledVector(fo.b, Math.cos(th) * spread).addScaledVector(fo.u, Math.sin(th) * spread);
        if (t - 4.6 < age / (0.35 * d.v)) _p.set(0, -999, 0);
        arr.setXYZ(i, _p.x, _p.y, _p.z);
      }
    }
    bp.needsUpdate = pp.needsUpdate = true;
    w.bile.material.uniforms.uOpacity.value = on; w.panc.material.uniforms.uOpacity.value = on;
    // fat droplet emulsification near s = 12
    const f12 = F.at(12.4); const fc = f12.p.clone().addScaledVector(f12.u, -0.75).addScaledVector(f12.b, 0.5); const e = sstep(10.4, 12.4, t);
    for (let i = 0; i < 17; i++) {
      let s, p = _p;
      if (i === 16) { s = 0.46 * (1 - e); p.copy(fc); }
      else { s = e * (0.09 + 0.06 * frac(i * 0.37)); p.copy(fc).addScaledVector(w.fdat[i], e * 0.75); p.y += Math.sin(t * 2 + i) * 0.05; }
      _m4.compose(p, _q.identity(), _s.set(s, s, s)); w.fat.setMatrixAt(i, _m4);
    }
    w.fat.instanceMatrix.needsUpdate = true;
    // starch chain at s = 15.5
    const f15 = F.at(15.2); const cut = sstep(15.4, 17.2, t);
    for (let i = 0; i < 8; i++) {
      const pair = Math.floor(i / 2), sgn = pair - 1.5;
      _p.copy(f15.p).addScaledVector(f15.b, (i - 3.5) * 0.52 + sgn * cut * 0.7).addScaledVector(f15.u, Math.sin(i * 0.9 + t) * 0.12 + sgn * cut * 0.25 * Math.sin(pair * 2.1)).addScaledVector(f15.t, Math.cos(i * 0.7) * 0.15);
      _q.setFromEuler(_e.set(i * 0.8 + t * 0.2, 0.4, 0));
      const s = sstep(12.5, 13.5, t) * 0.62; _m4.compose(_p, _q, _s.set(s, s, s)); w.starch.setMatrixAt(i, _m4);
    }
    w.starch.instanceMatrix.needsUpdate = true;
    w.amy.position.copy(f15.p).addScaledVector(f15.u, lerp(1.4, 0.45, sstep(13.5, 15.4, t))).addScaledVector(f15.b, lerp(1.3, 0, sstep(13.5, 15.4, t)));
    w.amy.rotation.set(t, t * 0.6, 0); w.amy.visible = t > 12.8;
    // camera
    const fcam = F.at(sc);
    const tgS = t > 9.6 && t < 14 ? 12.4 : t >= 14 ? 15.2 : sc + 4;
    const look = _v2.copy(F.at(Math.max(tgS, sc + 1.2)).p);
    if (t > 4.5 && t < 9.5) look.lerp(w.Opos, win(t, 4.5, 9.5, 1.2) * 0.8);
    aim(camera, _v1.copy(fcam.p).addScaledVector(fcam.u, 0.25), look, fcam.u);
    camera.fov = 70;
  },
});

// ---------------- Small intestine ----------------
defWorld('jejunum', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x200709); scene.fog = new THREE.FogExp2(0x200709, 0.055);
  const tex = tissueTex('jej', { c0: 0x86283a, c1: 0xd9707e, c2: 0xf7b8b8, scale: 4, veins: 12, spots: 110, fine: 1, bump: 3, seed: 31 });
  const pts = [V3(0, 0, 0), V3(3, -1, -6), V3(0, -1.5, -12), V3(-4, 0, -18), V3(-2, 1.5, -24), V3(2, 0.5, -30), V3(1, -1, -36), V3(-1, 0, -42)];
  const F = pathFrames(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 600, V3(0, 1, 0));
  const R0 = 1.95;
  const prof = (s, th) => { const fold = Math.pow(0.5 + 0.5 * Math.cos(s * 1.9 + 0.5 * Math.sin(th * 3)), 10); return R0 * (1 - 0.3 * fold + 0.04 * noise3(Math.cos(th) * 2, Math.sin(th) * 2, s * 0.25)); };
  const mat = wetMat({ tex, repeat: [1, 1], nScale: 1, rough: 0.5, sheen: 1, sheenColor: 0xffc0c8 });
  const wu = addTubeMotion(mat);
  scene.add(new THREE.Mesh(tubeGeo(F, prof, { radial: 80, uvU: 0.3, uvV: 3 }), mat));
  // villi carpet
  const vg = new THREE.CapsuleGeometry(0.06, 0.34, 3, 7); vg.translate(0, 0.23, 0);
  const vMat = new THREE.MeshPhysicalMaterial({ color: 0xea9aa2, roughness: 0.45, sheen: 1, sheenColor: new THREE.Color(0xffc4c8), clearcoat: 0.5, clearcoatRoughness: 0.3, emissive: new THREE.Color(0x501018), emissiveIntensity: 0.3 });
  const vu = addSway(vMat, 0.25, 1.4);
  const NV = Math.round(11000 * QUALITY);
  const villi = new THREE.InstancedMesh(vg, vMat, NV); villi.frustumCulled = false;
  const vr = rngOf(90); const up = V3(0, 1, 0);
  for (let i = 0; i < NV; i++) {
    const s = 0.5 + vr() * (F.L - 1), th = vr() * TAU; const r = prof(s, th);
    F.pt(s, th, r * 0.985, _p); const c = F.at(s).p; const n = _v1.copy(c).sub(_p).normalize();
    _q.setFromUnitVectors(up, n); const k = 0.8 + vr() * 0.5; _s.set(k, k * (0.8 + vr() * 0.5), k);
    _m4.compose(_p, _q, _s); villi.setMatrixAt(i, _m4);
  }
  scene.add(villi);
  // hero villus with visible capillaries
  const sH = 34, thH = -Math.PI / 2 + 0.2; const rH = prof(sH, thH);
  const baseH = F.pt(sH, thH, rH * 0.98); const nH = F.at(sH).p.clone().sub(baseH).normalize();
  const hero = new THREE.Group(); hero.position.copy(baseH); hero.quaternion.setFromUnitVectors(up, nH); scene.add(hero);
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.6, 10, 24), new THREE.MeshPhysicalMaterial({ color: 0xf2a6ae, roughness: 0.3, transparent: true, opacity: 0.42, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color(0xffd0d8), depthWrite: false, side: THREE.DoubleSide }));
  shell.position.y = 1.1; hero.add(shell);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: new THREE.Color(0xff1020), emissiveIntensity: 1.2 });
  for (let k = 0; k < 6; k++) {
    const a0 = k / 6 * TAU; const cps = []; for (let j = 0; j <= 24; j++) { const y = j / 24 * 2.0; const a = a0 + y * 1.6; cps.push(V3(Math.cos(a) * 0.24, 0.2 + y * (j < 20 ? 1 : 1), Math.sin(a) * 0.24)); }
    hero.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cps), 40, 0.02, 5), capMat));
  }
  const lacteal = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 1.3, 6, 10), new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: new THREE.Color(0xfff0d0), emissiveIntensity: 0.6 })); lacteal.position.y = 1.0; hero.add(lacteal);
  const heroTop = new THREE.Object3D(); heroTop.position.y = 2.0; hero.add(heroTop);
  const heroCap = new THREE.Object3D(); heroCap.position.set(0.24, 1.2, 0); hero.add(heroCap);
  // floating nutrients
  const chyme = flowPoints(Math.round(900 * QUALITY), 5, { color: 0xffe0c0, color2: 0xffc0d0, size: 0.06, drift: 0.05, opacity: 0.7, rMax: 0.7 }); scene.add(chyme);
  const sugar = flowPoints(Math.round(500 * QUALITY), 6, { color: 0xffd060, color2: 0xffa040, size: 0.05, drift: 0.12, opacity: 1, rMax: 0.95 }); scene.add(sugar);
  scene.add(new THREE.HemisphereLight(0xc0606a, 0x28080c, 1.1));
  return { scene, F, prof, wu, vu, villi, hero, heroTop, heroCap, baseH, nH, sH, chyme, sugar, lamp: [4.5, 20, 0xfff2ea, 1.2] };
});

defChapter({
  order: 6, id: 'jejunum', n: 6, name: 'İnce Bağırsak', latin: 'Jejunum · ileum', blurb: 'Besinlerin neredeyse tamamı burada kana geçer.',
  leg: ['2–4 sa', 'Villuslar besinleri emer; emilimin çoğu burada olur.'], world: 'jejunum', dur: 22, route: 'si', mapOn: ['si'], fadeColor: 0xffd8de, fadeOutDur: 1.2,
  clock: [1500, 1740], ph: 7.2, scale: [[0, '~3 cm'], [15, '~5 mm'], [18.5, '~1 mm'], [20.5, '~0,1 mm']], state: [[0, 'Kimus'], [8, 'Glikoz, fruktoz, maltoz…']], loc: [[0, 'İnce bağırsak'], [15.5, 'Bir villusun yüzeyi']],
  cues: [
    [0.3, 'İnce bağırsak yaklaşık 6–7 metre uzunluğunda; sindirim kanalının en uzun bölümü.'],
    [5.2, 'İç yüzeyi milyonlarca parmaksı çıkıntıyla kaplı: villuslar, yani bağırsak tüyleri.'],
    [10.2, 'Bu kıvrımlar ve tüyler sayesinde emilim yüzeyi yaklaşık 30 metrekareye, küçük bir odanın tabanı kadar alana ulaşır.'],
    [15.6, 'Şimdi bir villusa yaklaşıp moleküllerin dünyasına iniyoruz.'],
  ],
  facts: [['Uzunluk', '~6–7 m'], ['Emilim yüzeyi', '~30 m²'], ['Villus boyu', '~0,5–1 mm']],
  labels: [
    { t0: 2, t1: 6.5, text: 'Kerckring kıvrımları', sub: 'halka şeklinde katlantılar', at: w => w.F.pt(6.5, 0.4, w.prof(6.5, 0.4) * 0.82, _v1), dx: 70, dy: -50 },
    { t0: 5.4, t1: 10.5, text: 'Villuslar', sub: 'bağırsak tüyleri', at: w => w.F.pt(w._sc + 3, -1.2, w.prof(w._sc + 3, -1.2) * 0.86, _v2), dx: -80, dy: 40, hero: true },
    { t0: 9, t1: 14, text: 'Besin molekülleri', sub: 'emilmeyi bekliyor', at: w => _v3.fromArray(w.sugar.geometry.attributes.position.array, 3 * 12), dx: 70, dy: 40 },
    { t0: 16, t1: 20.6, text: 'Villus', sub: 'içinde kılcal damarlar var', at: w => w.heroTop.getWorldPosition(_v1), dx: 70, dy: -50, hero: true },
    { t0: 17.4, t1: 20.6, text: 'Kılcal damar', at: w => w.heroCap.getWorldPosition(_v2), dx: -80, dy: 30 },
  ],
  events: [[1, 'squish'], [8, 'squish'], [15.6, 'shimmer'], [20.6, 'whoosh']],
  audio: { amb: [260, 0.22], heart: 0.1 },
  update(t, w) {
    const { F } = w;
    w.wu.uTime.value = T; w.vu.uTime.value = T; w.wu.uBreathA.value = 0.02;
    const sc = lerp(0.8, 30.5, eio(inv(0, 17.5, t)) * 0.6 + inv(0, 17.5, t) * 0.4);
    w._sc = sc;
    w.wu.uWaveC.value = sc - 2.5 + Math.sin(t * 0.8); w.wu.uWaveA.value = 0.1; w.wu.uWaveW.value = 1.5;
    updateFlowPoints(w.chyme, F, t, sc, { speed: 1.3, radius: s => w.prof(s, 0) * 0.8, back: 3, ahead: 18 });
    updateFlowPoints(w.sugar, F, t, sc, { speed: 1.1, radius: s => w.prof(s, 0) * 0.9, back: 3, ahead: 16, swirl: 0.35 });
    const fc = F.at(sc);
    const pathCam = _v1.copy(fc.p).addScaledVector(fc.u, 0.2);
    const pathLook = _v2.copy(F.at(sc + 4).p);
    const heroTop = w.heroTop.getWorldPosition(_v3);
    const k = sstep(14.5, 19.5, t);
    const close = heroTop.clone().addScaledVector(w.nH, lerp(2.4, 0.3, sstep(17.5, 22, t))).addScaledVector(F.at(w.sH).t, lerp(-1.2, -0.1, sstep(17, 21, t)));
    const cp = pathCam.clone().lerp(close, k);
    const look = pathLook.clone().lerp(w.hero.getWorldPosition(new THREE.Vector3()).addScaledVector(w.nH, 1.2), k);
    aim(camera, cp, look, fc.u);
    camera.fov = lerp(70, 44, sstep(16, 22, t));
  },
  post: t => ({ bloom: 0.55 + sstep(18, 22, t) * 0.6, thr: lerp(0.85, 0.6, sstep(18, 22, t)) }),
});
