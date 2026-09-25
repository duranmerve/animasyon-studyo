// ============================================================
//  BRAIN — carotid, blood-brain barrier, neurons, whole-brain reveal
// ============================================================
function brainCloud(count, seed) {
  const r = rngOf(seed);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), sd = new Float32Array(count);
  const cCortex = new THREE.Color(0xc98ad8), cDeep = new THREE.Color(0x7a5ac8), cCereb = new THREE.Color(0xe08aa8), cStem = new THREE.Color(0x9a78d0), tmp = new THREE.Color();
  const g = () => { let u = 0; for (let k = 0; k < 3; k++) u += r(); return u / 1.5 - 1; };
  for (let i = 0; i < count; i++) {
    const u = r(); let x, y, z; const d = V3(g(), g(), g()).normalize();
    if (u < 0.8) {
      const sx = r() < 0.5 ? -1 : 1;
      if (d.x * sx < 0) d.x *= 0.25;
      const gy = Math.abs(noise3(d.x * 5.2 + sx * 7, d.y * 5.2, d.z * 5.2));
      let k = 1 - 0.07 * (1 - sstep(0.03, 0.2, gy)); k *= 1 - Math.pow(r(), 3) * 0.14;
      x = sx * 34 + d.x * 36 * k; y = d.y * 46 * k + (d.y < 0 ? d.y * 4 : 0); z = d.z * 80 * k;
      if (y < -28 && z < -20) y = -28 + (y + 28) * 0.3;
      tmp.copy(cCortex).lerp(cDeep, 1 - k);
    } else if (u < 0.93) {
      const k = 1 - 0.06 * Math.abs(Math.sin(d.y * 34 + d.z * 3));
      x = d.x * 46 * k; y = -36 + d.y * 19 * k; z = -54 + d.z * 27 * k; tmp.copy(cCereb);
    } else {
      const a = r() * TAU, h = r(); x = Math.cos(a) * 10 * (1 - h * 0.3); y = -28 - h * 48; z = -22 - h * 8 + Math.sin(a) * 9; tmp.copy(cStem);
    }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b; size[i] = 0.9 + r() * 1.3; sd[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uOpacity: { value: 0 }, uWave: { value: 1 }, uFocus: { value: V3(31, 22, 66) } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aSeed; uniform float uTime,uScale,uOpacity,uWave; uniform vec3 uFocus; varying vec3 vC; varying float vA;
      void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; float z=max(-mv.z,.1);
        float d=distance(position,uFocus); float ring=mod(uTime*55.,240.); float wave=uWave*(1.-smoothstep(0.,18.,abs(d-ring)))*(1.-ring/260.);
        float spark=step(.992,fract(aSeed*91.37+uTime*.23+sin(aSeed*40.)*.1));
        float b=.55+.45*sin(uTime*1.1+position.y*.06+position.z*.045+aSeed*2.);
        vC=aColor*(.35+.45*b)+vec3(1.,.72,.34)*(wave*2.4+spark*2.);
        gl_PointSize=clamp(aSize*uScale/z,.6,9.); vA=uOpacity; }`,
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 c=gl_PointCoord-.5; float a=1.-smoothstep(0.,.5,length(c)); gl_FragColor=vec4(vC*a*a*vA,1.); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.userData.cloud = true;
  return pts;
}
const BRAIN_O = V3(-25, -20, -66), NRC = V3(6, 2, 0);

defWorld('brain', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a0508); scene.fog = new THREE.FogExp2(0x2a0508, 0.05);
  // carotid → arteriole → capillary
  const pts = [V3(0, -48, 4), V3(0, -38, 3), V3(1, -28, 2), V3(0, -19, 1), V3(1, -13.5, 0.6), V3(2, -9, 0.4), V3(3.2, -5.6, 0.2), V3(4.2, -2.6, 0)];
  const F = pathFrames(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 500, V3(0, 0, 1));
  const s1 = F.nearestS(pts[3]), s2 = F.nearestS(pts[5]);
  const radius = s => s < s1 ? 1.7 : s < s2 ? lerp(1.7, 0.8, sstep(s1, s2, s)) : 0.8;
  const prof = (s, th) => radius(s) * (1 + 0.04 * noise3(Math.cos(th) * 2, Math.sin(th) * 2, s * 0.4));
  const vMat = wetMat({ tex: vesselTex(), repeat: [1, 1], rough: 0.34, transparent: true, opacity: 1, sheenColor: 0xff7080 });
  const vu = addTubeMotion(vMat);
  const vessel = new THREE.Mesh(tubeGeo(F, prof, { radial: 56, uvU: 0.14, uvV: 2 }), vMat); scene.add(vessel);
  const NR = Math.round(260 * QUALITY);
  const rbc = new THREE.InstancedMesh(rbcGeo(), rbcMat(0xd8142a, 0xff8090), NR); rbc.frustumCulled = false; scene.add(rbc);
  const rItems = flowItems(NR, 41, { rMax: 0.85, scale: 0.36, spin: 2 });
  // astrocytes wrapping the capillary
  const astroMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: new THREE.Color(0x5ab0ff), emissiveIntensity: 0.9, roughness: 0.4 });
  const astroParts = []; const ar = rngOf(12); const astroSomas = [];
  for (let k = 0; k < 6; k++) {
    const s = s2 + 0.6 + k * (F.L - s2 - 1) / 6; const f = F.at(s); const th = ar() * TAU;
    const soma = f.p.clone().addScaledVector(f.b, Math.cos(th) * 2.8).addScaledVector(f.u, Math.sin(th) * 2.8);
    astroSomas.push(soma);
    const sg = new THREE.SphereGeometry(0.42, 16, 12); sg.translate(soma.x, soma.y, soma.z); astroParts.push(sg);
    for (let j = 0; j < 8; j++) {
      const toWall = j < 4; let end;
      if (toWall) { const s2b = s + (j - 1.5) * 0.7; const th2 = th + (ar() - 0.5) * 1.2; end = F.pt(s2b, th2, 0.86); }
      else end = soma.clone().add(V3(ar() - 0.5, ar() - 0.5, ar() - 0.5).normalize().multiplyScalar(2 + ar() * 2));
      const mid = soma.clone().lerp(end, 0.5).add(V3(ar() - 0.5, ar() - 0.5, ar() - 0.5).multiplyScalar(0.8));
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([soma, mid, end]), 12, toWall ? 0.09 : 0.06, 5); astroParts.push(tg);
      if (toWall) { const foot = new THREE.SphereGeometry(0.3, 10, 8); foot.scale(1, 0.35, 1); const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), end.clone().sub(F.at(clamp(s + (j - 1.5) * 0.7, 0, F.L)).p).normalize()); foot.applyQuaternion(q); foot.translate(end.x, end.y, end.z); astroParts.push(foot); }
    }
  }
  const astro = new THREE.Mesh(BGU.mergeGeometries(astroParts.map(g => { g.deleteAttribute('uv'); return g; })), astroMat); scene.add(astro);
  // GLUT1 on the capillary wall
  const sG = F.L - 1.2, thG = 0.6; const gPos = F.pt(sG, thG, 0.82);
  const glut1 = new THREE.Group(); glut1.position.copy(gPos); glut1.quaternion.setFromUnitVectors(V3(0, 1, 0), gPos.clone().sub(F.at(sG).p).normalize()); scene.add(glut1);
  const gm = new THREE.MeshStandardMaterial({ color: 0x7dffb0, emissive: new THREE.Color(0x40ff90), emissiveIntensity: 1.6 });
  glut1.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 24).rotateX(Math.PI / 2), gm)); glut1.add(halo(0x7dffb0, 1.3, 0.8));
  // neurons
  const nr = rngOf(77);
  const somas = [V3(7.4, 0.6, 1.4)];
  while (somas.length < Math.round(40 * (QUALITY < 1 ? 0.75 : 1))) {
    const p = NRC.clone().add(V3((nr() - 0.5) * 30, (nr() - 0.5) * 22, (nr() - 0.5) * 30));
    if (somas.every(q => q.distanceTo(p) > 4) && p.distanceTo(V3(3, -4, 0)) > 4) somas.push(p);
  }
  const dend = [];
  const branch = (p, d, len, rad, depth) => {
    const cps = [p.clone()]; const q = p.clone(), dir = d.clone();
    for (let k = 0; k < 4; k++) { dir.add(V3(nr() - 0.5, nr() - 0.5, nr() - 0.5).multiplyScalar(0.7)).normalize(); q.addScaledVector(dir, len / 4); cps.push(q.clone()); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cps), 8, rad, 5); tg.deleteAttribute('uv'); dend.push(tg);
    if (depth < 2) for (let b = 0; b < 2; b++) branch(q, dir.clone().add(V3(nr() - 0.5, nr() - 0.5, nr() - 0.5)).normalize(), len * 0.62, rad * 0.62, depth + 1);
  };
  somas.forEach(sp => { const n = 5 + Math.floor(nr() * 3); for (let k = 0; k < n; k++) { const d = V3(nr() - 0.5, nr() - 0.5, nr() - 0.5).normalize(); branch(sp.clone().addScaledVector(d, 0.5), d, 2.2 + nr() * 1.4, 0.1, 0); } });
  const dendMat = new THREE.MeshStandardMaterial({ color: 0xd8a0e8, emissive: new THREE.Color(0x8a4ab8), emissiveIntensity: 0.55, roughness: 0.5 });
  const dendrites = new THREE.Mesh(BGU.mergeGeometries(dend), dendMat); scene.add(dendrites);
  // axons (graph)
  const edges = []; const axParts = [];
  somas.forEach((sp, i) => {
    const near = somas.map((q, j) => [q.distanceTo(sp), j]).filter(([d, j]) => j !== i).sort((a, b) => a[0] - b[0]);
    const targets = [near[1 + Math.floor(nr() * 3)][1]]; if (nr() < 0.6) targets.push(near[Math.floor(nr() * 2)][1]); if (i === 0) targets.push(near[0][1], near[2][1]);
    for (const j of targets) {
      const a = sp, b = somas[j]; const m1 = a.clone().lerp(b, 0.33).add(V3(nr() - 0.5, nr() - 0.5, nr() - 0.5).multiplyScalar(4)); const m2 = a.clone().lerp(b, 0.66).add(V3(nr() - 0.5, nr() - 0.5, nr() - 0.5).multiplyScalar(4));
      const c = new THREE.CatmullRomCurve3([a, m1, m2, b]); const samp = c.getSpacedPoints(40); const len = c.getLength();
      const tg = new THREE.TubeGeometry(c, 40, 0.05, 5); tg.deleteAttribute('uv'); axParts.push(tg);
      edges.push({ a: i, b: j, samp, len });
    }
  });
  const axMat = new THREE.MeshStandardMaterial({ color: 0xf0c8ff, emissive: new THREE.Color(0xb070ff), emissiveIntensity: 0.7, roughness: 0.4 });
  const axons = new THREE.Mesh(BGU.mergeGeometries(axParts), axMat); scene.add(axons);
  const somaMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, emissive: new THREE.Color(0x3a1a48), emissiveIntensity: 1 }), somas.length);
  somas.forEach((p, i) => { const k = i === 0 ? 0.8 : 0.5 + nr() * 0.32; _m4.compose(p, _q.identity(), _s.set(k, k * 0.9, k)); somaMesh.setMatrixAt(i, _m4); somaMesh.setColorAt(i, new THREE.Color(1, 0.6, 0.9)); });
  scene.add(somaMesh);
  // firing schedule (BFS from neuron 0)
  const tf = somas.map(() => Infinity); tf[0] = 16.6; const queue = [0];
  while (queue.length) { const i = queue.shift(); for (const e of edges) if (e.a === i) { const t2 = tf[i] + e.len / 14 + 0.12; if (t2 < tf[e.b]) { tf[e.b] = t2; queue.push(e.b); } } }
  for (let i = 0; i < tf.length; i++) if (!isFinite(tf[i])) tf[i] = 18 + nr() * 4;
  const NP = edges.length * 3;
  const pulses = motes(NP, v => v.set(0, -999, 0), { color: 0xffe6a0, color2: 0xffffff, size: 0.55, drift: 0, opacity: 1, near: 0.2 }); scene.add(pulses);
  // mitochondria inside neuron 0 + ATP sparks
  const mitoMat = new THREE.MeshStandardMaterial({ color: 0xff9060, emissive: new THREE.Color(0xff6030), emissiveIntensity: 0.9 });
  const mitos = [0, 1, 2].map(k => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.36, 4, 8), mitoMat); m.position.copy(somas[0]).add(V3(Math.cos(k * 2.1) * 0.5, Math.sin(k * 2.1) * 0.35, 0.4)); m.rotation.set(k, k * 2, 0); scene.add(m); return m; });
  const atpN = 90; const atp = motes(atpN, v => v.set(0, -999, 0), { color: 0xffe070, color2: 0xffffff, size: 0.05, drift: 0, opacity: 1, near: 0.05 }); scene.add(atp);
  const atpDir = []; { const r = rngOf(3); for (let i = 0; i < atpN; i++) atpDir.push(V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(1 + r() * 3)); }
  const hero = heroGlucose(); hero.scale.setScalar(0.28); scene.add(hero);
  // whole brain
  const cloud = brainCloud(Math.round(60000 * QUALITY), 5); cloud.position.copy(BRAIN_O); scene.add(cloud);
  const dust = motes(Math.round(1500 * QUALITY), (v, r) => v.set(NRC.x + (r() - 0.5) * 50, NRC.y + (r() - 0.5) * 40, NRC.z + (r() - 0.5) * 50), { color: 0xc0a0ff, color2: 0xffc8e8, size: 0.06, drift: 0.4, opacity: 0.5 }); scene.add(dust);
  scene.add(new THREE.HemisphereLight(0xa070c0, 0x200410, 1.0));
  const nl = new THREE.PointLight(0xd0a0ff, 6, 40, 1.1); nl.position.copy(NRC); scene.add(nl);
  return { scene, axons, dendrites, F, s1, s2, radius, vu, vessel, vMat, rbc, rItems, astro, astroSomas, glut1, gPos, sG, somas, somaMesh, edges, tf, pulses, mitos, atp, atpDir, hero, cloud, dust, lamp: [5, 24, 0xfff0f6, 1.2], post: { bloom: 0.85, thr: 0.72, radius: 0.7 } };
});

const _col = new THREE.Color();
defChapter({
  order: 12, id: 'brain', n: 12, name: 'Beyin', latin: 'Cerebrum · encephalon', blurb: 'Glikoz, düşüncelerimizin yakıtıdır.',
  world: 'brain', dur: 31, route: 'brain', mapOn: ['brain'], fadeColor: 0x07030a, fadeOutDur: 1.2,
  leg: ['kalpten ~5 sn', 'Glikoz kan-beyin bariyerini geçer, nöronlarda ATP enerjisine dönüşür.'],
  clock: [1798, 1812], ph: 7.4, scale: [[0, '~5 mm'], [6, '~10 µm'], [12, '~100 µm'], [23, '~1 cm'], [26, '~15 cm']], state: [[0, 'Glikoz (kanda)'], [11, 'Glikoz (beyin dokusu)'], [15.8, 'ATP enerjisi']],
  loc: [[0, 'Şah damarı'], [6, 'Beyin kılcalı'], [11, 'Beyin dokusu'], [15.2, 'Nöron'], [23, 'Beyin']],
  cues: [
    [0.3, 'Şah damarı boyunca yukarı, beyne tırmanıyoruz.'],
    [5.6, 'Beyindeki kılcal damarlar özel bir duvarla korunur: kan-beyin bariyeri. Astrosit hücreleri bu duvarı sarar.'],
    [10.2, 'Glikoz, GLUT1 adlı kapıdan geçerek beyin dokusuna giriyor.'],
    [14.2, 'Bir nöron glikozu içeri alıyor; mitokondriler onu yakıp ATP enerjisi üretiyor.'],
    [18.4, 'Bu enerjiyle elektrik sinyalleri ateşlenir: bir düşünce, bir anı, bir tat…'],
    [23, 'Beyin vücut ağırlığının yalnızca %2’si kadardır ama enerjinin yaklaşık %20’sini kullanır.'],
    [27, 'Az önce yediğin besin, şu an bir düşünceye güç veriyor.'],
  ],
  banner: [27.4, 31, 'Besin, düşünceye dönüştü'],
  facts: [['Nöron sayısı', '~86 milyar'], ['Günlük glikoz', '~120 g'], ['Enerji payı', 'vücudun ~%20’si']],
  labels: [
    { t0: 0.8, t1: 5, text: 'Şah damarı', sub: 'karotis arter', at: w => w.F.pt(w._sc + 4, 0.8, w.radius(w._sc + 4) * 0.95, _v1), dx: 70, dy: -40 },
    { t0: 6, t1: 10.4, text: 'Kan-beyin bariyeri', sub: 'seçici duvar', at: w => w.F.pt(w._sc + 2.2, 2.6, 0.8, _v2), dx: -80, dy: -40 },
    { t0: 7, t1: 11, text: 'Astrosit', sub: 'destek hücresi', at: w => w.astroSomas[3], dx: 70, dy: -40 },
    { t0: 9.6, t1: 12, text: 'GLUT1 kapısı', at: w => w.gPos, dx: 70, dy: 40, hero: true },
    { t0: 12.4, t1: 16, text: 'Nöron', sub: 'sinir hücresi', at: w => w.somas[0], dx: 80, dy: -50, hero: true },
    { t0: 15, t1: 17.8, text: 'Mitokondri', at: w => w.mitos[1].position, dx: -70, dy: -40 },
    { t0: 15.9, t1: 18.2, text: 'ATP', sub: 'hücrenin enerji parası', at: w => _v3.copy(w.somas[0]).add(_v1.set(0.6, 1.4, 0.5)), dx: 70, dy: -40, hero: true },
    { t0: 17.6, t1: 21.4, text: 'Akson', sub: 'sinyal kablosu', at: w => w.edges[0].samp[20], dx: -70, dy: 40 },
    { t0: 18.6, t1: 22, text: 'Sinaps', sub: 'nöronlar arası bağlantı', at: w => w.somas[w.edges[1].b], dx: 70, dy: 40 },
    { t0: 25.6, t1: 31, text: 'Beyin', sub: '~1,4 kg', at: () => _v1.copy(BRAIN_O).add(_v2.set(0, 50, 0)), dx: 70, dy: -40 },
  ],
  events: [[10.8, 'pop'], [15.2, 'pop'], [15.8, 'shimmer'], [16.6, 'zap'], [17, 'zap'], [17.4, 'zap'], [18, 'zap'], [18.6, 'zap'], [22.4, 'whoosh'], [27.4, 'shimmer']],
  audio: { amb: [300, 0.12], flow: [420, 0.3], heart: 0.4, pad: 0.07 },
  update(t, w) {
    const { F } = w;
    camera.far = 2400;
    const beat = Math.exp(-frac(T / 0.86) * 5);
    w.vu.uTime.value = T; w.vu.uPulse.value = -0.05 * beat * (1 - sstep(4, 8, t)); w.vu.uBreathA.value = 0;
    // stage A/B: in vessel
    const sC = t < 6 ? lerp(2, w.s1 + 1, inv(0, 6, t)) : lerp(w.s1 + 1, w.sG - 1.7, eo(inv(6, 10.4, t)));
    w._sc = sC;
    placeFlow(w.rbc, F, w.rItems, T, sC, { avoidR: 1.7, travel: integ(x => lerp(9, 2.2, sstep(4, 8, x)), t), back: 3, ahead: 22, radius: s => w.radius(s) * 0.9 });
    w.rbc.visible = t < 13;
    w.vMat.opacity = lerp(1, 0.4, sstep(5, 8, t)) * (1 - sstep(20, 23, t));
    w.vMat.transparent = true; w.vMat.depthWrite = t < 5;
    // hero path
    const fh = F.at(Math.min(sC + 1.8, w.sG));
    let hp;
    if (t < 10.4) hp = _v1.copy(fh.p).addScaledVector(fh.b, 0.2);
    else hp = spl(t, [[10.4, ...F.at(w.sG).p.toArray()], [11.2, ...w.gPos.toArray()], [12, ...w.gPos.clone().add(V3(0.3, 0.8, 0.3)).toArray()], [15.2, ...w.somas[0].toArray()]], _v1);
    w.hero.position.copy(hp); w.hero.rotation.set(T, T * 0.7, 0);
    const burn = sstep(15.2, 16.2, t); w.hero.scale.setScalar(0.28 * (1 - burn)); w.hero.visible = burn < 0.99;
    // ATP sparks
    const ap = w.atp.geometry.attributes.position; const at = t - 15.8;
    for (let i = 0; i < ap.count; i++) { const d = w.atpDir[i]; const k = at > 0 ? eo(clamp(at / 1.6)) : 0; ap.setXYZ(i, w.somas[0].x + d.x * k, w.somas[0].y + d.y * k, w.somas[0].z + d.z * k); }
    ap.needsUpdate = true; w.atp.material.uniforms.uOpacity.value = at > 0 ? Math.exp(-at * 0.8) : 0;
    // neuron firing
    const fireLvl = i => { let v = 0; for (let k = 0; k < 5; k++) { const ft = w.tf[i] + k * 3.1; if (t >= ft) v = Math.max(v, Math.exp(-(t - ft) * 3)); } return v; };
    for (let i = 0; i < w.somas.length; i++) { const f = fireLvl(i); const dim = 1 - sstep(23, 27, t) * 0.85; _col.setRGB((0.85 + f * 3.2) * dim, (0.6 + f * 2.6) * dim, (0.85 + f * 1.6) * dim); w.somaMesh.setColorAt(i, _col); }
    w.somaMesh.instanceColor.needsUpdate = true;
    const pp = w.pulses.geometry.attributes.position; let pi = 0;
    for (const e of w.edges) for (let k = 0; k < 3; k++) {
      const st = w.tf[e.a] + k * 3.1, dur = e.len / 14; const u = (t - st) / dur;
      if (u > 0 && u < 1) { const f = u * 40, i0 = Math.floor(f), fr = f - i0; const a = e.samp[i0], b = e.samp[Math.min(40, i0 + 1)]; pp.setXYZ(pi, lerp(a.x, b.x, fr), lerp(a.y, b.y, fr), lerp(a.z, b.z, fr)); }
      else pp.setXYZ(pi, 0, -999, 0);
      pi++;
    }
    pp.needsUpdate = true;
    // brain cloud reveal
    const reveal = sstep(21.5, 25.5, t);
    w.cloud.material.uniforms.uOpacity.value = reveal; w.cloud.material.uniforms.uTime.value = t > 16.6 ? t - 16.6 : 0;
    w.cloud.material.uniforms.uWave.value = sstep(22, 24, t);
    w.cloud.material.uniforms.uScale.value = (VH * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(66) / 2));
    w.dust.material.uniforms.uOpacity.value = 0.5 * (1 - reveal);
    const netK = 1 - sstep(24, 28, t); w.axons.material.emissiveIntensity = 0.7 * netK + 0.1; w.pulses.material.uniforms.uOpacity.value = netK; w.dendrites.material.emissiveIntensity = 0.55 * netK + 0.08;
    // fog / background by stage
    const inNet = sstep(10, 13, t);
    _c1.set(0x2a0508).lerp(_col.set(0x0c0614), inNet);
    w.scene.background.copy(_c1); w.scene.fog.color.copy(_c1);
    w.scene.fog.density = lerp(0.05, 0.022, inNet) * (1 - sstep(21, 24, t));
    // camera
    let cp, look;
    if (t < 10.4) {
      const fc = F.at(sC); cp = _v2.copy(fc.p).addScaledVector(fc.u, 0.25 * w.radius(sC)); look = _v3.copy(F.at(sC + 3).p).lerp(w.hero.position, 0.4);
      aim(camera, cp, look, fc.u);
    } else {
      const s0 = w.somas[0];
      const pull = t > 21.5 ? (Math.exp(4.2 * eio(inv(21.5, 30, t))) - 1) / (Math.exp(4.2) - 1) : 0;
      const near = spl(t, [[10.4, ...F.at(w.sG - 1.7).p.toArray()], [12, w.gPos.x - 1.4, w.gPos.y + 1.6, w.gPos.z + 2.2], [14.6, s0.x - 3, s0.y + 1.2, s0.z + 3.4], [16.6, s0.x - 2.8, s0.y + 1.3, s0.z + 4.0], [21.5, s0.x - 7, s0.y + 4, s0.z + 9]], _v2);
      const far = BRAIN_O.clone().add(V3(112, 72, 150));
      cp = near.clone().lerp(far, pull);
      const lookNear = t < 15.2 ? w.hero.position.clone() : s0.clone().lerp(NRC, sstep(17, 21, t));
      look = lookNear.lerp(BRAIN_O.clone().add(V3(0, -22, 0)), sstep(22, 27, t));
      aim(camera, cp, look);
    }
    camera.fov = 66;
  },
  post: t => ({ bloom: 0.8 - sstep(22, 26, t) * 0.25, thr: 0.74, radius: 0.7, flash: win(t, 10.8, 11.5, 0.3) * 0.4 + win(t, 15.7, 16.4, 0.3) * 0.5 }),
});
