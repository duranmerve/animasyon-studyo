// ============================================================
//  CAFÉ — a real (GLB) person picks up a lokum, bites, chews;
//  then an x-ray view shows the teeth, tongue and the way down.
// ============================================================
let AVATAR = null; // gltf, loaded once at boot
async function loadAvatar() {
  const bin = Uint8Array.from(atob(AVATAR_GLB_B64), c => c.charCodeAt(0)).buffer;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  AVATAR = await new Promise((res, rej) => loader.parse(bin, '', res, rej));
}

function woodTex() {
  if (TEXCACHE.has('wood')) return TEXCACHE.get('wood');
  const S = 512, c = canvasOf(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data, pn = periodicNoise(33);
  const a = srgbBytes(0x2e160b), b = srgbBytes(0x5a3018), h = srgbBytes(0x7a4424);
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    const u = xx / S, v = yy / S;
    const ring = 0.5 + 0.5 * Math.sin((u * 7 + 0.5 * pn(u * 2, v * 1, 2, 1) + 0.15 * pn(u * 8, v * 30, 8, 30)) * TAU);
    const k = 0.35 + 0.35 * Math.pow(ring, 3), g = 0.5 + 0.5 * pn(u * 90, v * 3, 90, 3);
    const i = (yy * S + xx) * 4;
    for (let q = 0; q < 3; q++) d[i + q] = lerp(lerp(a[q], b[q], k), h[q], g * 0.25);
    d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const res = { map: texFromCanvas(c, true) }; TEXCACHE.set('wood', res); return res;
}
function latheOf(profile, seg = 64) { return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg); }

defWorld('intro', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0705);
  scene.fog = new THREE.Fog(0x0d0705, 3.5, 9);
  try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); } catch (e) {}
  scene.environmentIntensity = 0.32;

  // ---- room: floor, back wall, warm bokeh lights ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x24140c, roughness: 0.7, map: woodTex().map }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.95 }));
  wall.position.set(0, 3, -2.4); scene.add(wall);
  const bokeh = new THREE.Group(); scene.add(bokeh);
  const br = rngOf(17);
  for (let i = 0; i < 26; i++) { const s = halo(br() < 0.7 ? 0xffb060 : 0xffe0a0, 0.25 + br() * 0.5, 0.25 + br() * 0.35); s.position.set((br() - 0.5) * 6, 0.9 + br() * 2.2, -2.2 + br() * 0.4); bokeh.add(s); }
  // hanging lamp above the table
  const lampShade = new THREE.Mesh(latheOf([[0.001, 0.0], [0.05, 0.0], [0.16, -0.12], [0.165, -0.13], [0.001, -0.13]]), new THREE.MeshStandardMaterial({ color: 0x1a2a24, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }));
  lampShade.position.set(0, 1.75, 0.5); scene.add(lampShade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.3) }));
  bulb.position.set(0, 1.63, 0.5); scene.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.4), new THREE.MeshStandardMaterial({ color: 0x111111 })); cord.position.set(0, 2.45, 0.5); scene.add(cord);

  // ---- table, chair, plate, sweets, tea ----
  const wood = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: woodTex().map, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 64), wood); top.position.set(0, 0.725, 0.52); top.receiveShadow = true; top.castShadow = true; scene.add(top);
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.8 });
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 16), metal); leg.position.set(0, 0.36, 0.52); scene.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.02, 32), metal); foot.position.set(0, 0.01, 0.52); scene.add(foot);
  const chairBack = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.03, 3, 0.012), wood); chairBack.position.set(0, 0.78, -0.2); chairBack.rotation.x = -0.1; scene.add(chairBack);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.03, 0.42, 3, 0.012), wood); seat.position.set(0, 0.45, 0.02); scene.add(seat);
  const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xfbf7f2, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  const PLATE = V3(-0.11, 0.741, 0.5);
  const plate = new THREE.Mesh(latheOf([[0.001, 0.0], [0.05, 0.0], [0.055, 0.004], [0.075, 0.007], [0.095, 0.013], [0.098, 0.015], [0.094, 0.016], [0.07, 0.009], [0.05, 0.006], [0.001, 0.006]]), porcelain);
  plate.position.copy(PLATE); plate.castShadow = plate.receiveShadow = true; scene.add(plate);
  const goldRim = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.0012, 6, 64), new THREE.MeshStandardMaterial({ color: 0xd8a84a, metalness: 1, roughness: 0.3 }));
  goldRim.rotation.x = Math.PI / 2; goldRim.position.copy(PLATE).add(V3(0, 0.0152, 0)); scene.add(goldRim);
  const LS = 0.023;
  const sweets = [];
  const spots = [[0.0, 0.0, 0.3], [0.03, 0.022, 1.1], [-0.028, 0.02, 2.0], [0.024, -0.026, 0.7], [-0.022, -0.028, 2.6]];
  spots.forEach(([dx, dz, ry], i) => { const l = makeSweet(LS); l.position.copy(PLATE).add(V3(dx, 0.006 + LS * 0.45, dz)); l.rotation.y = ry; l.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(l); sweets.push(l); });
  const hero = sweets[0]; const heroHome = hero.position.clone();
  // tea: tulip glass on a saucer
  const TEA = V3(0.15, 0.741, 0.56);
  const saucer = new THREE.Mesh(latheOf([[0.001, 0], [0.03, 0], [0.05, 0.006], [0.058, 0.01], [0.056, 0.011], [0.03, 0.005], [0.001, 0.005]]), new THREE.MeshPhysicalMaterial({ color: 0xb8142a, roughness: 0.2, clearcoat: 1 }));
  saucer.position.copy(TEA); saucer.castShadow = true; scene.add(saucer);
  const glassProfile = [[0.001, 0.006], [0.021, 0.006], [0.024, 0.012], [0.027, 0.03], [0.022, 0.05], [0.021, 0.062], [0.026, 0.085], [0.029, 0.098], [0.0285, 0.1]];
  const glass = new THREE.Mesh(latheOf(glassProfile), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.92, roughness: 0.03, thickness: 0.004, ior: 1.5, side: THREE.DoubleSide, envMapIntensity: 2.2, clearcoat: 1, specularIntensity: 1 }));
  glass.position.copy(TEA); scene.add(glass);
  const tea = new THREE.Mesh(latheOf([[0.001, 0.008], [0.019, 0.008], [0.022, 0.012], [0.025, 0.03], [0.02, 0.05], [0.019, 0.062], [0.024, 0.082], [0.001, 0.082]]),
    new THREE.MeshPhysicalMaterial({ color: 0xa8300c, roughness: 0.08, clearcoat: 1, emissive: new THREE.Color(0x3a0a00), emissiveIntensity: 1 }));
  tea.position.copy(TEA); scene.add(tea);
  const steam = motes(40, (v, r) => v.set((r() - 0.5) * 0.025, r() * 0.12, (r() - 0.5) * 0.025), { color: 0xfff2e6, size: 0.03, drift: 0.012, opacity: 0.07, near: 0.02 });
  steam.position.copy(TEA).add(V3(0, 0.1, 0)); scene.add(steam);

  // ---- the person ----
  const gl = AVATAR; const root = gl.scene; scene.add(root);
  root.position.set(0, -0.487, 0);
  const meshes = [];
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const m = o.material; m.envMapIntensity = 0.8;
      if (!/Teeth|Tongue/.test(o.name)) {
        const x = m.clone(); x.transparent = true; x.depthWrite = false; x.alphaTest = 0; x.side = THREE.DoubleSide;
        x.emissive = new THREE.Color(0x40182a); x.emissiveIntensity = 1;
        o.userData.solid = m; o.userData.xray = x;
      }
      meshes.push(o);
    }
  });
  const B = n => root.getObjectByName(n);
  const bones = []; root.traverse(o => { if (o.isBone) bones.push(o); });
  const rest = new Map(bones.map(b => [b, b.quaternion.clone()]));
  root.updateMatrixWorld(true);
  const restWQ = new Map(bones.map(b => [b, b.getWorldQuaternion(new THREE.Quaternion())]));
  const morphMeshes = meshes.filter(m => m.morphTargetDictionary);
  const face = (name, v) => { for (const m of morphMeshes) { const i = m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; } };
  const FACE_KEYS = ['jawOpen', 'mouthOpen', 'mouthClose', 'jawLeft', 'jawRight', 'cheekPuff', 'mouthSmile', 'eyeBlinkLeft', 'eyeBlinkRight', 'eyesLookDown', 'eyeLookDownLeft', 'eyeLookDownRight', 'mouthFunnel', 'mouthRollLower', 'browInnerUp', 'mouthPucker', 'eyeSquintLeft', 'eyeSquintRight'];
  // mouth reference (front of the teeth) in head space
  const head = B('Head');
  const teethBox = new THREE.Box3().setFromObject(B('Teeth_Mesh'));
  const mouthLocal = head.worldToLocal(V3((teethBox.min.x + teethBox.max.x) / 2, (teethBox.min.y + teethBox.max.y) / 2, teethBox.max.z));
  const molarLocal = head.worldToLocal(V3(teethBox.max.x - 0.006, (teethBox.min.y + teethBox.max.y) / 2, teethBox.min.z + 0.012));
  const mouthCenterLocal = head.worldToLocal(teethBox.getCenter(new THREE.Vector3()));

  // finger rigs: curl axes in each bone's local frame (derived from the rest pose)
  const fingerSet = side => {
    const S = side === 'R' ? 'Right' : 'Left', curlW = V3(0, 0, side === 'R' ? 1 : -1);
    const f = {};
    for (const fn of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) f[fn] = [1, 2, 3].map(k => B(`${S}Hand${fn}${k}`));
    const axis = b => curlW.clone().applyQuaternion(restWQ.get(b).clone().invert()).normalize();
    f.axes = new Map(); for (const fn of ['Index', 'Middle', 'Ring', 'Pinky']) f[fn].forEach(b => f.axes.set(b, axis(b)));
    return f;
  };
  const FR = fingerSet('R'), FL = fingerSet('L');
  const tip = segs => { const a = segs[1].getWorldPosition(new THREE.Vector3()), b = segs[2].getWorldPosition(new THREE.Vector3()); return b.clone().addScaledVector(b.clone().sub(a), 0.9); };
  // thumb opposition axis (rest pose)
  const thumbAxisW = (() => { const t1 = FR.Thumb[0].getWorldPosition(V3()), tt = tip(FR.Thumb), it = tip(FR.Index); return V3().crossVectors(tt.clone().sub(t1), it.clone().sub(t1)).normalize(); })();
  FR.thumbAxes = FR.Thumb.map(b => thumbAxisW.clone().applyQuaternion(restWQ.get(b).clone().invert()).normalize());

  // ---- pose helpers ----
  const _a = new THREE.Quaternion(), _b = new THREE.Quaternion(), _c = new THREE.Quaternion(), _w1 = new THREE.Vector3(), _w2 = new THREE.Vector3(), _w3 = new THREE.Vector3();
  const setWorldQuat = (bone, wq) => { bone.parent.getWorldQuaternion(_a); bone.quaternion.copy(_a.invert().multiply(wq)); bone.updateMatrixWorld(true); };
  const rotWorld = (bone, axis, ang) => { bone.getWorldQuaternion(_b); setWorldQuat(bone, _c.setFromAxisAngle(axis, ang).multiply(_b)); };
  const aimBone = (bone, childPos, target) => {
    bone.getWorldPosition(_w1);
    const cur = _w2.copy(childPos).sub(_w1).normalize(), des = _w3.copy(target).sub(_w1).normalize();
    bone.getWorldQuaternion(_b); setWorldQuat(bone, _c.setFromUnitVectors(cur, des).multiply(_b));
  };
  const ik2 = (upper, lower, end, target, pole) => {
    const a = upper.getWorldPosition(V3()), b = lower.getWorldPosition(V3()), c = end.getWorldPosition(V3());
    const lab = a.distanceTo(b), lbc = b.distanceTo(c);
    const d = target.clone().sub(a); const lat = clamp(d.length(), 0.02, lab + lbc - 0.002); d.normalize();
    const ang = Math.acos(clamp((lab * lab + lat * lat - lbc * lbc) / (2 * lab * lat), -1, 1));
    const pn = pole.clone().sub(a); pn.addScaledVector(d, -pn.dot(d)).normalize();
    const elbow = a.clone().addScaledVector(d, Math.cos(ang) * lab).addScaledVector(pn, Math.sin(ang) * lab);
    aimBone(upper, b, elbow);
    aimBone(lower, end.getWorldPosition(V3()), a.clone().addScaledVector(d, lat));
  };
  // hand orientation from a (finger direction, palm normal) pair, relative to the rest pose
  const handQuat = (side, fDes, nDes) => {
    const fr = V3(side === 'R' ? -1 : 1, 0, 0), nr = V3(0, -1, 0);
    const basis = (f, n) => { f = f.clone().normalize(); n = n.clone().addScaledVector(f, -n.dot(f)).normalize(); return new THREE.Matrix4().makeBasis(f, n, V3().crossVectors(f, n)); };
    const R = basis(fDes, nDes).multiply(basis(fr, nr).transpose());
    return new THREE.Quaternion().setFromRotationMatrix(R).multiply(restWQ.get(B(side === 'R' ? 'RightHand' : 'LeftHand')));
  };
  const curlFingers = (F, amt, pinch, thumbAng) => {
    const base = [[0.25, 0.4, 0.25], [0.5, 0.7, 0.45]];
    for (const fn of ['Index', 'Middle', 'Ring', 'Pinky']) {
      const k = fn === 'Index' ? lerp(amt * 0.5, 0.55, pinch) : lerp(amt, 1.0, pinch * 0.8) * (fn === 'Pinky' ? 1.1 : 1);
      F[fn].forEach((b, j) => b.quaternion.multiply(_a.setFromAxisAngle(F.axes.get(b), base[1][j] * k)));
    }
    if (F.thumbAxes) F.Thumb.forEach((b, j) => b.quaternion.multiply(_a.setFromAxisAngle(F.thumbAxes[j], thumbAng * [0.55, 0.3, 0.2][j])));
  };
  // hand keys (finger dir, palm normal)
  const HQ = {
    restR: handQuat('R', V3(0.35, -0.12, 1), V3(0, -1, 0.1)),
    pick: handQuat('R', V3(0.25, -0.8, 0.55), V3(0.1, -0.5, -0.85)),
    mouth: handQuat('R', V3(0.85, 0.3, -0.25), V3(0.15, -0.35, -0.9)),
    restL: handQuat('L', V3(-0.35, -0.12, 1), V3(0, -1, 0.1)),
  };
  // find how far to swing the thumb so thumb and index tips hold a lokum-sized gap
  let thumbPinch = 0.9;
  {
    let best = 1e9;
    for (let a = 0; a <= 1.6; a += 0.04) {
      rest.forEach((q, b) => b.quaternion.copy(q)); curlFingers(FR, 0.3, 1, a); root.updateMatrixWorld(true);
      const e = Math.abs(tip(FR.Thumb).distanceTo(tip(FR.Index)) - LS * 0.95);
      if (e < best) { best = e; thumbPinch = a; }
    }
  }

  // ---- inside view: route from mouth to chest, chewed bits ----
  const routeMat = new THREE.ShaderMaterial({
    uniforms: { uProg: { value: -1 }, uGlow: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uProg,uGlow; varying vec2 vUv; void main(){ float c=exp(-pow((vUv.x-uProg)*10.,2.)); vec3 col=vec3(1.,.42,.55)*uGlow*.8+vec3(1.,.8,.35)*c*2.6*uGlow; gl_FragColor=vec4(col,1.); }',
  });
  const trachMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uGlow; varying vec2 vUv; void main(){ float r=.55+.45*step(.5,fract(vUv.x*34.)); gl_FragColor=vec4(vec3(.4,.7,1.)*uGlow*r*.45,1.); }',
  });
  let route = null, trachea = null;
  const bits = new THREE.Group(); head.add(bits);
  const bitMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.4, clearcoat: 0.8, sheen: 1, sheenColor: new THREE.Color(0xffe0ea), emissive: new THREE.Color(0xc03060), emissiveIntensity: 0.15 });
  const bitGeo = blobGeo(1, 2, 0.35, 4, sweetColors);
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(bitGeo, bitMat); const side = i % 2 ? 1 : -1; m.position.copy(molarLocal).multiply(V3(side, 1, 1)).add(V3(-side * 0.004 * (i % 3), 0.002 * (i % 4), 0.006 * Math.floor(i / 2) - 0.008)); m.scale.setScalar(0.0045 + 0.002 * (i % 3)); bits.add(m); }
  const bolus = new THREE.Mesh(blobGeo(1, 3, 0.2, 5, sweetColors), bitMat); bolus.scale.setScalar(0.009); scene.add(bolus);

  // ---- lights ----
  const key = new THREE.DirectionalLight(0xffe2c4, 2.6); key.position.set(1.1, 2.3, 1.7); key.target.position.set(0, 0.9, 0.3);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -0.9, right: 0.9, top: 1.1, bottom: -0.6, near: 0.5, far: 5 });
  scene.add(key, key.target);
  const rimL = new THREE.DirectionalLight(0xffa860, 1.8); rimL.position.set(-1.6, 1.9, -1.4); scene.add(rimL);
  const lampL = new THREE.PointLight(0xffc488, 1.6, 3, 1.6); lampL.position.set(0, 1.6, 0.5); scene.add(lampL);
  scene.add(new THREE.HemisphereLight(0xffe2c8, 0x1a0c06, 0.45));

  const w = { scene, root, B, rest, face, FACE_KEYS, head, mouthLocal, mouthCenterLocal, molarLocal, FR, FL, tip, curlFingers, thumbPinch, HQ, ik2, aimBone, rotWorld, setWorldQuat, hero, heroHome, sweets, steam, meshes, routeMat, trachMat, bits, bolus, LS,
    lamp: [0, 1], post: { bloom: 0.35, thr: 0.95, barrel: 0.015, ca: 0.0015, vig: 0.85, grain: 0.02 } };

  // route tube is built from the chewing pose so it sits inside the neck
  cafePose(w, 13.2);
  const mouthW = head.localToWorld(mouthCenterLocal.clone());
  const at = (bn, off) => B(bn).localToWorld(off.clone());
  const pts = [mouthW, head.localToWorld(mouthCenterLocal.clone().add(V3(0, -0.012, -0.06))), at('Neck', V3(0, 0.02, 0.025)), at('Neck', V3(0, -0.06, 0.02)), at('Spine2', V3(0, 0.02, 0.035)), at('Spine2', V3(0, -0.12, 0.03)), at('Spine1', V3(0, -0.04, 0.02))];
  route = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0062, 10), routeMat); scene.add(route);
  w.routeCurve = new THREE.CatmullRomCurve3(pts);
  const tp = [head.localToWorld(mouthCenterLocal.clone().add(V3(0, -0.035, -0.03))), at('Neck', V3(0, 0.0, 0.06)), at('Spine2', V3(0, 0.03, 0.075)), at('Spine2', V3(0, -0.08, 0.07))];
  trachea = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tp), 80, 0.0068, 10), trachMat); scene.add(trachea);
  w.labelPts = { larynx: tp[0].clone(), eso: pts[3].clone(), trach: tp[1].clone() };
  return w;
});

// Deterministic pose for time t (bones reset to rest every frame)
function cafePose(w, t) {
  const { B, rest, FR, FL, HQ } = w;
  rest.forEach((q, b) => b.quaternion.copy(q));
  w.root.updateMatrixWorld(true);
  // sit: lean forward a little, thighs forward, shins down
  const X = V3(1, 0, 0), Y = V3(0, 1, 0);
  w.rotWorld(B('Spine'), X, 0.1 + 0.03 * Math.sin(t * 0.9)); // breathing sway
  w.rotWorld(B('Spine2'), X, 0.02 * Math.sin(t * 1.7));
  for (const s of ['Left', 'Right']) {
    const sx = s === 'Left' ? 1 : -1;
    const hip = B(s + 'UpLeg').getWorldPosition(V3());
    const knee = hip.clone().add(V3(sx * 0.03, -0.02, 0.42)), foot = knee.clone().add(V3(sx * 0.01, -0.42, 0.04));
    w.aimBone(B(s + 'UpLeg'), B(s + 'Leg').getWorldPosition(V3()), knee);
    w.aimBone(B(s + 'Leg'), B(s + 'Foot').getWorldPosition(V3()), foot);
  }
  // head: look at the plate while picking, forward while eating
  const lookDown = win(t, 2.6, 6.2, 0.9) * 0.34 + win(t, 6.8, 8.6, 0.5) * 0.08;
  const chew = t > 9.0 && t < 15.6 ? 0.5 - 0.5 * Math.cos(TAU * (t - 9.0) / 0.78) : 0;
  w.rotWorld(B('Neck'), X, lookDown * 0.45 + 0.03 * chew);
  w.rotWorld(B('Head'), X, lookDown * 0.55 - 0.05 + 0.015 * chew);
  w.rotWorld(B('Head'), Y, -0.08 * win(t, 3, 6, 1) + 0.05 * Math.sin(t * 0.37));
  // left forearm rests on the table
  const tableY = 0.741;
  const sL = B('LeftArm').getWorldPosition(V3());
  w.setWorldQuat(B('LeftHand'), HQ.restL);
  w.ik2(B('LeftArm'), B('LeftForeArm'), B('LeftHand'), V3(0.17, tableY + 0.03, 0.4), sL.clone().add(V3(0.4, -0.5, -0.2)));
  w.setWorldQuat(B('LeftHand'), HQ.restL);
  FL.Index.forEach(b => b.quaternion.multiply(_q.setFromAxisAngle(FL.axes.get(b), 0.25)));
  for (const fn of ['Middle', 'Ring', 'Pinky']) FL[fn].forEach(b => b.quaternion.multiply(_q.setFromAxisAngle(FL.axes.get(b), 0.35)));
  // right hand: rest → reach plate → pinch → lift to mouth → bite → back to rest
  const mouth = w.head.localToWorld(w.mouthLocal.clone());
  const plateTop = w.heroHome.clone().add(V3(0, w.LS * 0.5, 0));
  const restP = V3(-0.19, tableY + 0.035, 0.38);
  const lipP = mouth.clone().add(V3(-0.002, -0.004, 0.045));
  const inP = mouth.clone().add(V3(-0.001, -0.004, 0.012));
  const keys = [[0, ...restP.toArray()], [3.2, ...restP.toArray()], [4.5, ...plateTop.clone().add(V3(0.0, 0.06, 0.02)).toArray()], [5.2, ...plateTop.toArray()], [5.6, ...plateTop.toArray()], [6.4, ...plateTop.clone().add(V3(0.02, 0.2, -0.05)).toArray()], [7.4, ...lipP.toArray()], [8.1, ...inP.toArray()], [8.5, ...inP.toArray()], [9.2, ...lipP.clone().add(V3(-0.05, -0.08, 0.06)).toArray()], [10.6, ...restP.toArray()]];
  const pinchTarget = spl(t, keys);
  let hq;
  if (t < 3.2) hq = HQ.restR;
  else if (t < 5.2) hq = _q2.copy(HQ.restR).slerp(HQ.pick, sstep(3.2, 5.0, t));
  else if (t < 7.4) hq = _q2.copy(HQ.pick).slerp(HQ.mouth, sstep(5.6, 7.2, t));
  else if (t < 9.2) hq = HQ.mouth;
  else hq = _q2.copy(HQ.mouth).slerp(HQ.restR, sstep(8.8, 10.4, t));
  hq = hq.clone();
  const pinch = sstep(4.9, 5.3, t) * (1 - sstep(8.4, 8.9, t));
  const openAmt = 0.3 * (1 - win(t, 3.6, 5.1, 0.6));
  const applyHand = () => { w.setWorldQuat(B('RightHand'), hq); FR.Index.concat(FR.Middle, FR.Ring, FR.Pinky, FR.Thumb).forEach(b => b.quaternion.copy(rest.get(b))); w.curlFingers(FR, openAmt, pinch, w.thumbPinch * lerp(0.35, 1, pinch)); w.root.updateMatrixWorld(true); };
  applyHand();
  const pinchPt = () => w.tip(FR.Thumb).lerp(w.tip(FR.Index), 0.5);
  const sR = B('RightArm').getWorldPosition(V3()), pole = sR.clone().add(V3(-0.35, -0.55, -0.15));
  for (let it = 0; it < 2; it++) {
    const off = pinchPt().sub(B('RightHand').getWorldPosition(V3()));
    w.ik2(B('RightArm'), B('RightForeArm'), B('RightHand'), pinchTarget.clone().sub(off), pole);
    applyHand();
  }
  w.pinchPoint = pinchPt();
  w.mouthW = mouth; w.chew = chew;
}

const CAFE_CAM = [[0, 0.1, 0.84, 0.86], [2.8, 0.55, 1.2, 1.55], [4.2, -0.5, 1.12, 1.25], [6.2, 0.1, 1.2, 0.92], [7.4, 0.34, 1.19, 0.62], [8.8, 0.3, 1.17, 0.56], [10.8, 0.08, 1.15, 0.6], [12.6, 0.8, 1.13, 0.34], [15.2, 0.86, 1.09, 0.24], [17.2, 0.12, 1.16, 0.46], [19.5, 0.0, 1.162, 0.215]];
const CAFE_LOOK = [[0, -0.1, 0.76, 0.5], [2.8, -0.02, 0.98, 0.35], [4.2, -0.08, 0.93, 0.42], [6.2, -0.04, 1.1, 0.24], [7.4, -0.02, 1.155, 0.2], [8.8, -0.01, 1.15, 0.18], [10.8, 0, 1.14, 0.16], [12.6, 0, 1.12, 0.1], [15.2, 0, 1.06, 0.08], [17.2, 0, 1.15, 0.15], [19.5, 0, 1.16, 0.05]];
defChapter({
  order: 0, id: 'intro', n: 0, name: 'İlk Isırık', latin: 'Ingestio · yiyeceğin alınması', blurb: 'Yolculuk, besinin ağza alınmasıyla başlıyor.',
  world: 'intro', dur: 19.5, route: 'intro', warmTimes: [14], mapOn: ['mouth'], mapWhere: 'Ağız', fadeColor: 0x2a0610, fadeOutDur: 1.6,
  clock: [0, 18], ph: 7, scale: [[0, '~20 cm'], [6.6, '~5 cm']], state: [[0, 'Katı parça'], [8.2, 'Ağızda · ısırıldı'], [9.2, 'Çiğneniyor']], loc: [[0, 'Kafe masası'], [6.6, 'Ağız'], [12.4, 'Ağız · röntgen']],
  cues: [
    [0.3, 'Bir kafede, bir tabak fıstıklı lokum ve bir bardak çay.'],
    [3.4, 'Bir parçayı başparmak ve işaret parmağıyla alıyor. Birazdan bu besinin vücuttaki yolculuğu başlayacak.'],
    [7.0, 'Ağız açılıyor; öndeki kesici dişler onu ısırıp keser.'],
    [9.6, 'Dudaklar kapanır, çene kasları çalışır; azı dişleri besini öğütür.'],
    [12.6, 'İçeriden bakalım: dil lokmayı dişlerin arasına iter, tükürük onu yumuşatır. Sonra lokma yutağa, oradan yemek borusuna iner.'],
    [17.2, 'Şimdi minik bir kamera olup besinle birlikte ağızdan içeri giriyoruz.'],
  ],
  facts: [['Besin', 'Fıstıklı lokum · ~15 g · ~55 kcal'], ['İçindekiler', 'Şeker, nişasta, su, fıstık'], ['Rota', 'Ağız → Mide → Bağırsak → Kan → Beyin']],
  labels: [
    { t0: 3.6, t1: 6.2, text: 'Fıstıklı lokum', sub: '~15 gram', at: w => w.hero.position, dx: 70, dy: -50, hero: true },
    { t0: 7.6, t1: 9.4, text: 'Kesici dişler', sub: 'ısırıp keser', at: w => w.mouthW, dx: 80, dy: 40 },
    { t0: 10, t1: 12.4, text: 'Çene kasları', sub: 'çiğneme hareketi', at: w => w.head.localToWorld(V3(0.055, -0.07, 0.04)), dx: 80, dy: -30 },
    { t0: 12.8, t1: 15.4, text: 'Azı dişleri', sub: 'öğütür', at: w => w.head.localToWorld(w.molarLocal.clone()), dx: 70, dy: -50 },
    { t0: 13.2, t1: 15.8, text: 'Dil', sub: 'lokmayı çevirir', at: w => w.head.localToWorld(w.mouthCenterLocal.clone().add(V3(0, -0.012, -0.01))), dx: 80, dy: 40 },
    { t0: 14.4, t1: 17, text: 'Yutak', at: w => w.labelPts.larynx, dx: -80, dy: -30 },
    { t0: 15, t1: 17.2, text: 'Yemek borusu', sub: 'mideye iner', at: w => w.labelPts.eso, dx: -80, dy: 30, hero: true },
    { t0: 15.4, t1: 17.2, text: 'Soluk borusu', sub: 'akciğerlere', at: w => w.labelPts.trach, dx: 80, dy: 30 },
  ],
  events: [[5.2, 'pop'], [8.15, 'crunch'], [9.4, 'squish'], [10.2, 'squish'], [11, 'squish'], [11.8, 'squish'], [12.5, 'crunch'], [13.3, 'squish'], [15.3, 'gulp'], [17.4, 'whoosh']],
  audio: { amb: [160, 0.06], heart: 0.03 },
  post: t => ({ bloom: 0.35 + 0.25 * sstep(12.4, 13.6, t) * (1 - sstep(16.5, 17.5, t)), thr: 0.95 - 0.2 * sstep(12.4, 13.6, t) }),
  update(t, w) {
    const idle = started ? 0 : REAL;
    const tt = t + (started ? 0 : 0);
    cafePose(w, tt);
    // face
    const F = w.face;
    for (const k of w.FACE_KEYS) F(k, 0);
    const blink = Math.max(win(t, 2.1, 2.3, 0.08), win(t, 6.2, 6.4, 0.08), win(t, 10.5, 10.7, 0.08), win(t, 14.1, 14.3, 0.08), win(t, 18, 18.2, 0.08));
    F('eyeBlinkLeft', 0.12 + 0.88 * blink); F('eyeBlinkRight', 0.12 + 0.88 * blink); F('eyeSquintLeft', 0.15); F('eyeSquintRight', 0.15);
    const look = win(t, 2.6, 6.2, 0.8); F('eyesLookDown', look * 0.55); F('eyeLookDownLeft', look * 0.3); F('eyeLookDownRight', look * 0.3);
    F('mouthSmile', 0.18 * (1 - win(t, 6.6, 16, 1)));
    let jaw = kf(t, [[6.7, 0], [7.4, 0.3], [8.0, 0.3], [8.15, 0.1], [8.35, 0.1], [8.55, 0.22], [8.9, 0.02]]);
    const chew = w.chew;
    if (t > 9.0 && t < 15.6) jaw = 0.03 + 0.15 * chew;
    const dive = sstep(17.4, 18.6, t); jaw = lerp(jaw, 0.34, dive);
    F('jawOpen', jaw); F('mouthOpen', t < 9 ? jaw * 0.35 : dive * 0.3);
    F('mouthClose', t > 9 && t < 15.6 ? jaw * 0.95 : 0);
    const side = Math.sin(TAU * (t - 9.0) / 1.56);
    if (t > 9 && t < 15.6) { F('jawLeft', Math.max(0, side) * 0.25 * chew); F('jawRight', Math.max(0, -side) * 0.25 * chew); F('cheekPuff', 0.1 + 0.08 * chew); }
    F('mouthFunnel', win(t, 7.1, 8.2, 0.3) * 0.12);
    F('browInnerUp', 0.12 * win(t, 8.8, 10, 0.4));
    // lokum: on the plate → between the fingers → into the mouth
    const L = w.hero;
    if (t < 5.25) { L.position.copy(w.heroHome); L.rotation.set(0, 0.3 + idle * 0.2, 0); }
    else { L.position.copy(w.pinchPoint); L.rotation.set(0.2, 0.3 + (t - 5.25) * 0.6, 0.1); }
    if (t > 8.15) { const k = sstep(8.15, 8.6, t); L.position.lerp(w.head.localToWorld(w.mouthCenterLocal.clone()), k); L.scale.setScalar(1 - 0.35 * k); }
    else L.scale.setScalar(1);
    L.visible = t < 8.75;
    // x-ray: skin turns to glass, teeth/tongue/route stay
    const xr = sstep(12.4, 13.4, t) * (1 - sstep(16.6, 17.6, t));
    for (const m of w.meshes) {
      if (!m.userData.xray) continue;
      if (xr < 0.002) { m.material = m.userData.solid; continue; }
      m.material = m.userData.xray;
      const hair = /hair|Eyelash|EyeAO/.test(m.name), eye = /Eye_/.test(m.name), cloth = /look|Body/.test(m.name);
      m.material.opacity = lerp(1, hair ? 0.05 : eye ? 0.5 : cloth ? 0.22 : 0.34, xr);
    }
    w.bits.visible = t > 8.6 && t < 15.4;
    w.bits.children.forEach((b, i) => { b.scale.setScalar((0.0045 + 0.002 * (i % 3)) * (1 - sstep(14.2, 15.2, t))); });
    w.routeMat.uniforms.uGlow.value = xr; w.trachMat.uniforms.uGlow.value = xr;
    const sw = sstep(15.2, 16.8, t);
    w.routeMat.uniforms.uProg.value = t > 15.1 && t < 16.9 ? sw : -1;
    w.bolus.visible = t > 15.1 && t < 16.9; if (w.bolus.visible) w.bolus.position.copy(w.routeCurve.getPointAt(clamp(sw)));
    // camera
    const cp = spl(t, CAFE_CAM), lk = spl(t, CAFE_LOOK, new THREE.Vector3());
    if (!started) { cp.x += Math.sin(idle * 0.3) * 0.02; cp.y += Math.sin(idle * 0.23) * 0.01; }
    if (VW < VH * 0.9) { const back = (1 - sstep(16, 18.5, t)); cp.addScaledVector(cp.clone().sub(lk).normalize(), back * 0.35); }
    aim(camera, cp, lk);
    camera.near = 0.005;
    camera.fov = kf(t, [[0, 30], [2.8, 34], [6.6, 30], [12.6, 32], [17.2, 30], [19.5, 34]]);
    w.steam.position.y = 0.841 + 0.01 * Math.sin(T);
  },
});
