// The heroine: a procedural honeybee worker in centimetres (body ≈ 1.2 cm). Frame: +X forward
// (head), +Y dorsal, +Z the bee's right. Parts are jointed groups so a pose is a pure function of
// its parameters: flight (wing blur or slowed strokes), standing, walking, waggle, sleep.
// Also a light instanced bee for the crowd inside the hive.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, COMMON, toon } from './glsl.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- geometry helpers ----------
function ellip(rx, ry, rz, ws = 28, hs = 18) {
  const g = new THREE.SphereGeometry(1, ws, hs); g.scale(rx, ry, rz); return g;
}
// tapered limb along +X from 0 to len
function limb(len, r0, r1, seg = 8) {
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  g.rotateZ(-Math.PI / 2); g.translate(len / 2, 0, 0); return g;
}

// ---------- materials ----------
const CUTICLE = '#241910';
function cuticle(color = CUTICLE, rim = 1) { return toon({ color, rim, beeColor: '#141612' }); }

function abdomenMat() {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uBands: { value: 1 } },
    vertexShader: /* glsl */`varying vec3 vN; varying vec3 vW; varying vec3 vP;
      void main(){ vP = position; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      varying vec3 vN; varying vec3 vW; varying vec3 vP;
      void main(){
        // six visible tergites from front (x=+.3) to tail (x=-.4): amber front plates, dark rear edges, pale hair band at each front
        float s = (0.30 - vP.x) / 0.68 * 6.;
        float seg = floor(s), f = fract(s);
        vec3 amber = vec3(.36,.21,.075), dark = vec3(.07,.05,.035), hair = vec3(.42,.36,.27);
        float dk = smoothstep(.5, .78, f);
        float amberK = seg < 2.5 ? 1. : .35;       // front segments more amber, rear darker (Apis mellifera ligustica/carnica mix)
        vec3 base = mix(mix(dark, amber, amberK), dark, dk);
        base = mix(base, hair, smoothstep(.14, 0., f) * .55);
        base *= .85 + .3 * hash21(floor(vP.xz*vec2(260.,190.)));
        float groove = smoothstep(.0, .045, f) * smoothstep(1., .985, f);
        base *= mix(.3, 1., groove);
        vec3 N = normalize(vN);
        // segment ridges
        vec3 V = normalize(cameraPosition - vW);
        base = mix(base, vec3(.07,.075,.06) + vec3(.02,.01,.06)*(1.-dk), beeAmt());
        vec3 col = shade(base, N, V, 1., 1.);
        float spec = pow(max(dot(reflect(-uSunDir, N), V), 0.), 28.) * .35;
        col += uSunCol * spec * (1. - uDark*.8);
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
}

function eyeMat() {
  return new THREE.ShaderMaterial({
    uniforms: { ...G },
    vertexShader: /* glsl */`varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
        // facet lattice (thousands of ommatidia): hex-ish cells
        vec2 p = vUv * vec2(90., 60.);
        vec2 r = vec2(1., 1.732), h = r*.5;
        vec2 a = mod(p, r) - h, b = mod(p - h, r) - h;
        vec2 gv = dot(a,a) < dot(b,b) ? a : b;
        float facet = smoothstep(.36, .5, length(gv));
        vec3 base = vec3(.035,.028,.024);
        vec3 col = shade(base, N, V, 1., .6);
        // the sky in the eye
        vec3 R = reflect(-V, N);
        vec3 sky = mix(uGndAmb*.6, uSkyAmb*1.2, smoothstep(-.2, .6, R.y));
        float fr = .03 + .3 * pow(1. - max(dot(N,V),0.), 3.);
        col += sky * fr * (1. - facet*.7) * (1. - uDark*.85);
        col += uSunCol * pow(max(dot(R, uSunDir), 0.), 90.) * 1.6 * (1. - facet) * (1. - uDark);
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
}

function furMat(color, k, len) {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uK: { value: k }, uLen: { value: len }, uCol: { value: new THREE.Color(color) }, uDen: { value: new THREE.Vector2(110, 70) } },
    vertexShader: /* glsl */`uniform float uK; uniform float uLen; uniform float uT;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vec3 p = position + normal * uLen * uK;
        p.y -= uLen * uK * uK * .35;                       // hairs bend down a little
        vec4 w = modelMatrix * vec4(p,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      uniform float uK; uniform vec3 uCol; uniform vec2 uDen;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){
        vec2 q = vUv * uDen;
        vec2 cell = floor(q); vec2 f = fract(q) - .5;
        float h = hash21(cell);
        vec2 off = vec2(hash21(cell+3.1), hash21(cell+7.7)) - .5;
        float rad = .5 * (1. - uK*.85) * (.6 + .4*h);
        if (length(f - off*.3) > rad || h < uK*.35) discard;
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
        vec3 base = uCol * mix(.45, 1.05, uK) * (.8 + .4*h);
        base = mix(base, beeColor(base, .05), beeAmt());
        vec3 col = shade(base, N, V, mix(.5, 1., uK), 1.6);
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
}

// forewing / hindwing outline + venation, drawn once into a canvas
function wingTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d');
  const outline = (w) => {
    x.beginPath();
    x.moveTo(6, 70);
    x.bezierCurveTo(60, 40, 200, 30, 360, 34);
    x.bezierCurveTo(440, 36, 505, 55, 505, 82);
    x.bezierCurveTo(500, 112, 430, 128, 330, 130);
    x.bezierCurveTo(210, 132, 90, 120, 6, 92);
    x.closePath();
  };
  x.clearRect(0, 0, 512, 160);
  outline(); x.fillStyle = 'rgba(255,255,255,0.20)'; x.fill();
  x.strokeStyle = 'rgba(40,28,18,0.95)'; x.lineCap = 'round';
  const v = (w, pts) => { x.lineWidth = w; x.beginPath(); x.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) x.lineTo(...pts[i]); x.stroke(); };
  // costa + subcosta (leading edge), marginal cell, submarginal cells, cubital veins
  v(5, [[6, 70], [120, 44], [240, 36], [300, 38]]);
  v(3, [[10, 80], [140, 60], [250, 52], [300, 50], [385, 52], [440, 70]]);
  v(2.5, [[300, 38], [320, 50]]); v(2.5, [[300, 50], [330, 70], [385, 52]]);
  v(2, [[250, 52], [262, 86], [330, 92], [330, 70]]); v(2, [[262, 86], [290, 110]]);
  v(2, [[140, 60], [160, 96], [262, 86]]); v(2, [[160, 96], [250, 118]]);
  v(2, [[40, 84], [160, 96]]); v(1.6, [[330, 92], [380, 104], [410, 90], [385, 52]]);
  v(1.6, [[90, 100], [120, 118]]);
  outline(); x.lineWidth = 2; x.strokeStyle = 'rgba(40,28,18,0.6)'; x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}
function wingGeometry(len, width) {
  // plane in local frame: span along +Z (0..len), chord along X (front +, back -)
  const g = new THREE.PlaneGeometry(len, width, 8, 2);
  g.rotateX(-Math.PI / 2);          // XY -> XZ, normal +Y
  g.rotateY(Math.PI / 2);           // length along Z
  g.translate(0, 0, len / 2);
  // uv: u along span, v across chord (0 = leading edge)
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) / len, 1 - (p.getX(i) / width + 0.5));
  // shift so the leading edge sits near the joint
  g.translate(-width * 0.18, 0, 0);
  return g;
}
function wingMat(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, tWing: { value: tex }, uOp: { value: 1 } },
    vertexShader: /* glsl */`varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      uniform sampler2D tWing; uniform float uOp; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){
        vec4 tx = texture2D(tWing, vec2(vUv.x, 1. - vUv.y));
        if (tx.a < .02) discard;
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
        float ndv = abs(dot(N, V));
        float fr = pow(1. - ndv, 2.);
        float vein = smoothstep(.25, .8, tx.a);
        vec3 film = .5 + .5*cos(6.2831*(vec3(0., .33, .67) + ndv*1.7 + vUv.x*.6));
        vec3 sky = mix(uGndAmb, uSkyAmb, .7) * (1. - uDark*.85);
        vec3 memb = sky * .35 + film * .22 * (.4 + fr) * (1. - uDark*.7) + uRimCol * fr * .4 * uRim;
        float sun = pow(max(dot(reflect(-uSunDir, N * sign(dot(N,V))), V), 0.), 20.);
        memb += uSunCol * sun * .6 * (1. - uDark);
        vec3 col = mix(memb, vec3(.09,.065,.045), vein);
        float a = mix(.16 + fr*.35, .92, vein) * uOp;
        col = mix(col, beeColor(col, .15), beeAmt());
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
// motion-blurred stroke: a fan covering the stroke arc, faint
function blurFan(len) {
  const g = new THREE.CircleGeometry(len, 24, -Math.PI * 0.36, Math.PI * 0.72);
  g.rotateX(-Math.PI / 2); g.rotateY(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: { ...G, uOp: { value: 0.3 } },
    vertexShader: /* glsl */`varying vec3 vP; varying vec3 vW; void main(){ vP = position; vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON} uniform float uOp; varying vec3 vP; varying vec3 vW;
      void main(){ float r = length(vP.xz) / ${len.toFixed(3)};
        float ang = atan(vP.x, vP.z);
        float edge = smoothstep(.36*3.1416, .2*3.1416, abs(ang));
        float a = uOp * smoothstep(1., .75, r) * smoothstep(.05, .3, r) * (.55 + .45*edge);
        vec3 col = mix(uSkyAmb*.9, vec3(.9), .3) * (1. - uDark*.8) + uRimCol*.15;
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, a); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  return new THREE.Mesh(g, m);
}

// ---------- the hero bee ----------
const X1 = new THREE.Vector3(1, 0, 0);
// place a unit-length (+X) limb from a to b
function aim(mesh, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(X1, d.multiplyScalar(1 / Math.max(1e-6, len)));
  mesh.scale.set(len, 1, 1);
}
// two-bone IK: knee between base and ankle, bending toward pole
function knee(base, ankle, l1, l2, pole) {
  const d = new THREE.Vector3().subVectors(ankle, base);
  let dist = d.length();
  const maxd = (l1 + l2) * 0.999;
  if (dist > maxd) { d.multiplyScalar(maxd / dist); ankle = base.clone().add(d); dist = maxd; }
  const dir = d.clone().normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return { k: base.clone().add(dir.multiplyScalar(a)).add(p.multiplyScalar(h)), ankle };
}

export function createBee({ fur = 10 } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const matC = cuticle();
  const matLeg = cuticle('#2b1d12', 1.1);
  const matJoint = cuticle('#3a2818', 0.9);
  const shells = [];
  const NSH = 12;
  const addFur = (geo, parent, color, len, den) => {
    for (let k = 1; k <= NSH; k++) {
      const m = furMat(color, k / NSH, len); m.uniforms.uDen.value.set(...den);
      const s = new THREE.Mesh(geo, m); s.userData.k = k; parent.add(s); shells.push(s);
    }
  };

  // thorax
  const thorax = new THREE.Mesh(ellip(0.25, 0.22, 0.22), matC);
  thorax.position.set(0.2, 0.06, 0); body.add(thorax);
  addFur(thorax.geometry, thorax, '#8f7b5c', 0.05, [240, 160]);
  // head (pivot at neck)
  const head = new THREE.Group(); head.position.set(0.44, 0.05, 0); body.add(head);
  const skull = new THREE.Mesh(ellip(0.12, 0.19, 0.2), matC); skull.position.set(0.07, -0.01, 0); skull.rotation.z = -0.35; head.add(skull);
  addFur(skull.geometry, skull, '#6e604c', 0.012, [200, 130]);
  const eyeM = eyeMat();
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(ellip(0.08, 0.17, 0.08, 24, 16), eyeM);
    e.position.set(0.055, 0.02, 0.15 * s); e.rotation.set(0.25 * s, -0.25 * s, -0.3); head.add(e);
  }
  for (const [x, z] of [[0.07, 0], [0.03, 0.035], [0.03, -0.035]]) {
    const o = new THREE.Mesh(ellip(0.012, 0.012, 0.012, 10, 8), eyeM); o.position.set(x, 0.165, z); head.add(o);
  }
  const mandMat = cuticle('#3a2614');
  for (const s of [-1, 1]) { const m = new THREE.Mesh(ellip(0.045, 0.02, 0.028, 10, 8), mandMat); m.position.set(0.14, -0.17, 0.035 * s); m.rotation.z = -1.1; head.add(m); }
  const prob = new THREE.Group(); prob.position.set(0.13, -0.18, 0); prob.rotation.z = -1.2; head.add(prob);
  prob.add(new THREE.Mesh(limb(0.5, 0.016, 0.007, 6), cuticle('#4a3018')));
  // a nectar droplet held between the mouthparts (evaporating on the way home, or passed on)
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), toon({ color: '#e0a83a', rim: 2.2, emit: '#3a2204' }));
  drop.position.set(0.16, -0.24, 0); head.add(drop);
  // antennae: scape + flagellum, aimed each frame (in head space)
  const antennae = [];
  const unitLimb = limb(1, 0.013, 0.011, 6);
  for (const s of [-1, 1]) {
    const scape = new THREE.Mesh(unitLimb, matLeg); head.add(scape);
    const flag = new THREE.Mesh(limb(1, 0.012, 0.009, 6), matLeg); head.add(flag);
    antennae.push({ scape, flag, s, base: V3(0.15, 0.06, 0.035 * s) });
  }
  // abdomen (pivot at petiole)
  const abd = new THREE.Group(); abd.position.set(-0.03, 0.02, 0); body.add(abd);
  const abdG = ellip(0.36, 0.2, 0.22, 48, 24);
  { const p = abdG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); const sg = (0.30 - x) / 0.68 * 6; const fr = sg - Math.floor(sg); const k = x < -0.33 ? 1 : 1 - 0.055 * (1 - fr); p.setY(i, p.getY(i) * k); p.setZ(i, p.getZ(i) * k); } abdG.computeVertexNormals(); }
  const abdMesh = new THREE.Mesh(abdG, abdomenMat());
  abdMesh.position.set(-0.36, -0.05, 0); abdMesh.rotation.z = 0.18; abd.add(abdMesh);
  // honey stomach (crop), shown as if seen through the body
  const crop = new THREE.Mesh(ellip(0.13, 0.1, 0.1, 20, 14), new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vV = -mv.xyz; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float uOp; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 1.5); gl_FragColor = vec4(vec3(1., .72, .28) * (1.2 + f), (.25 + .75 * f) * uOp); }',
    transparent: true, depthTest: false, depthWrite: false,
  }));
  crop.position.set(-0.2, -0.02, 0); crop.renderOrder = 20; abd.add(crop);
  const sting = new THREE.Mesh(limb(0.05, 0.01, 0.002, 5), matLeg); sting.position.set(-0.7, -0.1, 0); sting.rotation.z = Math.PI + 0.2; abd.add(sting);
  // wings
  const tex = wingTexture();
  const wings = [];
  for (const s of [-1, 1]) {
    for (const [front, len, wid, x] of [[1, 0.95, 0.3, 0.26], [0, 0.66, 0.2, 0.15]]) {
      const pivot = new THREE.Group(); pivot.position.set(x, front ? 0.25 : 0.235, 0.075 * s); body.add(pivot);
      pivot.rotation.order = 'YXZ';
      const wg = wingGeometry(len, wid); if (s < 0) { wg.scale(1, 1, -1); }
      const wm = wingMat(tex);
      const w = new THREE.Mesh(wg, wm); w.renderOrder = front ? 3 : 2; pivot.add(w);
      const fan = blurFan(len); if (s < 0) fan.scale.z = -1; fan.renderOrder = 4; pivot.add(fan);
      const ghosts = [];
      for (let g = 0; g < 5; g++) {
        const gp = new THREE.Group(); gp.position.copy(pivot.position); gp.rotation.order = 'YXZ'; body.add(gp);
        const gm = wingMat(tex); gm.uniforms.uOp.value = 0.14;
        const gw = new THREE.Mesh(wg, gm); gw.renderOrder = 3; gp.add(gw); ghosts.push({ gp, gm });
      }
      wings.push({ pivot, mesh: w, fan, s, front, mat: wm, ghosts });
    }
  }
  // legs: base on the underside of the thorax; lengths femur / tibia / tarsus
  const legs = [];
  const LEGS = [[0.33, [0.17, 0.17, 0.13]], [0.21, [0.2, 0.2, 0.15]], [0.09, [0.24, 0.26, 0.17]]];
  LEGS.forEach(([x, L], pair) => {
    for (const s of [-1, 1]) {
      const fem = new THREE.Mesh(limb(1, 0.03, 0.02, 8), matLeg);
      const tg = limb(1, 0.018, pair === 2 ? 0.05 : 0.024, 8);
      if (pair === 2) tg.scale(1, 0.55, 1.3);
      const tib = new THREE.Mesh(tg, matLeg);
      const bg = limb(1, 0.02, 0.016, 6); if (pair === 2) bg.scale(1, 0.6, 1.45);
      const tar = new THREE.Mesh(bg, matLeg);                 // basitarsus
      const tar2 = new THREE.Mesh(limb(1, 0.012, 0.009, 5), matLeg);
      const tar3 = new THREE.Mesh(limb(1, 0.009, 0.004, 5), matLeg);
      const knobs = [0.032, 0.024, 0.02].map(r => new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), matJoint));
      body.add(fem, tib, tar, tar2, tar3, ...knobs);
      let pollen = null;
      if (pair === 2) { pollen = new THREE.Mesh(ellip(0.075, 0.06, 0.055, 14, 10), toon({ color: '#c98f2c', rim: 0.8, uv: 0.1 })); body.add(pollen); }
      legs.push({ fem, tib, tar, tar2, tar3, knobs, s, pair, L, base: V3(x, -0.1, 0.075 * s), pollen });
    }
  });

  function setFur(n) { for (const s of shells) s.visible = s.userData.k <= n; }
  setFur(fur);

  // p: { mode: fly|stand|walk|dance|sleep, t, wing: blur|slow|fold, slowHz, yaw, pitch, roll, pos, scale, prob, pollen, wag, droop, ant, stride }
  function pose(p) {
    const t = p.t ?? 0;
    root.position.copy(p.pos ?? V3(0, 0, 0));
    root.rotation.order = 'YZX';
    root.rotation.set(p.roll ?? 0, p.yaw ?? 0, p.pitch ?? 0);
    if (p.quat) root.quaternion.copy(p.quat);
    root.scale.setScalar(p.scale ?? 1);
    root.updateMatrixWorld(true);
    const mode = p.mode ?? 'stand';
    // surface the feet stand on: world plane { n, d } (dot(n, x) = d); default: body-local floor
    const plane = p.plane || null;
    const toPlane = (v, lift = 0) => {
      if (!plane) return v;
      const w = body.localToWorld(v.clone());
      w.addScaledVector(plane.n, plane.d + lift - plane.n.dot(w));
      return body.worldToLocal(w);
    };
    const droop = p.droop ?? 0;
    head.rotation.set(0, 0, -0.12 + 0.04 * Math.sin(t * 0.7) - droop * 0.25);
    // antennae: independent searching rhythms; they sag when she sleeps
    for (const a of antennae) {
      const ph = a.s * 1.3;
      const act = (p.ant ?? 1) * (1 - droop);
      const sw = act * (0.25 * Math.sin(t * 2.1 + ph) + 0.12 * Math.sin(t * 5.3 + ph * 2));
      const sd = V3(0.45 + sw * 0.3, 0.85 - droop * 0.6, a.s * (0.35 + sw * 0.2)).normalize();
      const elbow = a.base.clone().add(sd.multiplyScalar(0.12));
      const fd = V3(0.85, -0.25 - droop * 1.5 + act * 0.15 * Math.sin(t * 2.6 + ph), a.s * (0.4 + 0.15 * Math.sin(t * 1.7 + ph))).normalize();
      const tip = elbow.clone().add(fd.multiplyScalar(0.25));
      aim(a.scape, a.base, elbow); aim(a.flag, elbow, tip);
    }
    crop.material.uniforms.uOp.value = p.crop ?? 0;
    crop.visible = (p.crop ?? 0) > 0.01;
    drop.visible = (p.drop ?? 0) > 0.01;
    drop.scale.setScalar(Math.max(0.01, p.drop ?? 0));
    prob.scale.set(0.02 + (p.prob ?? 0) * 0.98, 1, 1);
    prob.visible = (p.prob ?? 0) > 0.01;
    const wag = p.wag ?? 0;
    abd.rotation.set(0, wag, (mode === 'fly' ? 0.12 : 0) + 0.025 * Math.sin(t * 3.1) - droop * 0.08);
    // wings
    const wmode = p.wing ?? (mode === 'fly' ? 'blur' : 'fold');
    for (const w of wings) {
      w.fan.visible = wmode === 'blur';
      w.mesh.visible = wmode !== 'blur';
      w.mat.uniforms.uOp.value = 1;
      w.ghosts.forEach((g, i) => {
        g.gp.visible = wmode === 'blur';
        if (wmode !== 'blur') return;
        const a = -0.78 + i * 0.39, dv = 0.18 * Math.cos(i * 0.9 + t * 7);
        g.gp.rotation.set(-w.s * (0.12 + dv), -w.s * 0.2 + w.s * a, 0.05 + dv * 0.5);
        g.gm.uniforms.uOp.value = (w.front ? 0.3 : 0.2) * (i === 0 || i === 4 ? 1.3 : 0.8);
      });
      if (wmode === 'fold') {
        // lying flat over the abdomen, tips slightly apart, forewing above hindwing
        w.pivot.rotation.set(w.s * 0.06, -w.s * (w.front ? 1.36 : 1.3), -0.1);
      } else {
        const hz = wmode === 'slow' ? (p.slowHz ?? 2.3) : 230;
        const ph = t * hz * Math.PI * 2 + (w.front ? 0 : 0.3);
        const stroke = wmode === 'blur' ? 0 : Math.sin(ph) * 0.78;       // ≈ 90° stroke
        const dev = wmode === 'blur' ? 0 : Math.cos(ph) * 0.18;
        w.pivot.rotation.set(-w.s * (0.12 + dev), -w.s * 0.2 + w.s * stroke, 0.05 + dev * 0.6);
      }
      w.fan.material.uniforms.uOp.value = w.front ? 0.12 : 0.08;
    }
    // legs: feet targets in body space, IK for the knee
    const walk = mode === 'walk' || mode === 'dance';
    for (const L of legs) {
      const s = L.s, pair = L.pair, [l1, l2, l3] = L.L;
      let foot, ankle, pole;
      if (mode === 'fly') {
        const tr = 0.03 * Math.sin(t * 3 + pair + s);
        const hang = [[0.46, -0.2, 0.12], [0.16, -0.27, 0.16], [-0.2, -0.33, 0.12]][pair];
        ankle = V3(hang[0] + tr, hang[1], hang[2] * s);
        foot = ankle.clone().add(pair === 2 ? V3(-0.12, -0.07, 0) : V3(-0.07, -0.08, s * 0.02));
        pole = V3(pair === 0 ? 0.5 : pair === 1 ? 0.2 : -0.2, 0.3, s * 1);
      } else if (mode === 'sleep') {
        const f = [[0.5, 0.22], [0.18, 0.3], [-0.2, 0.26]][pair];
        foot = V3(f[0] + 0.05, -0.27, f[1] * s * 0.9); ankle = V3(f[0], -0.2, f[1] * s * 0.72);
        pole = V3(0, 1, s * 0.5);
      } else {
        const f = [[0.56, 0.27], [0.17, 0.38], [-0.28, 0.34]][pair];
        const gy = p.ground ?? -0.3;
        const phase = walk ? (p.stride ?? t * 9) + ((pair + (s > 0 ? 1 : 0)) % 2 ? Math.PI : 0) : 0;
        const sw = walk ? Math.sin(phase) : 0, lift = walk ? Math.max(0, Math.cos(phase)) : 0;
        foot = toPlane(V3(f[0] + sw * 0.1, gy, f[1] * s), lift * 0.06);
        // the tarsus lies along the surface, pointing outward-forward, its end curling to the claws
        const out = V3(pair === 0 ? 0.6 : pair === 1 ? 0.1 : -0.55, 0, s * 0.8).normalize();
        ankle = toPlane(foot.clone().addScaledVector(out, -l3 * 0.85), 0.05 + lift * 0.06);
        pole = V3(pair === 0 ? 0.2 : pair === 1 ? 0 : -0.3, 1, s * 0.4);
      }
      const r = knee(L.base, ankle, l1, l2, pole);
      aim(L.fem, L.base, r.k); aim(L.tib, r.k, r.ankle);
      // curved tarsus: quadratic curve from ankle to foot, arched upward
      const mid = r.ankle.clone().lerp(foot, 0.5).add(V3(0, 0.025, 0));
      const bz = u => { const a = r.ankle.clone().lerp(mid, u), b = mid.clone().lerp(foot, u); return a.lerp(b, u); };
      const q1 = bz(0.5), q2 = bz(0.8);
      aim(L.tar, r.ankle, q1); aim(L.tar2, q1, q2); aim(L.tar3, q2, foot);
      L.knobs[0].position.copy(L.base); L.knobs[1].position.copy(r.k); L.knobs[2].position.copy(r.ankle);
      if (L.pollen) {
        const pl = p.pollen ?? 0;
        L.pollen.visible = pl > 0.02;
        L.pollen.position.copy(r.k).lerp(r.ankle, 0.6).add(V3(0, 0, 0.03 * s));
        L.pollen.quaternion.copy(L.tib.quaternion);
        L.pollen.scale.setScalar(Math.max(0.02, pl));
      }
    }
  }
  pose({});
  return { root, pose, setFur, parts: { head, abd, thorax, wings, legs, antennae, prob, crop, drop } };
}

// ---------- a light bee for the crowd (instanced, one draw call for bodies, one for wings) ----------
export function createCrowd(max) {
  const parts = [];
  const col = (g, c) => { const n = g.attributes.position.count; const a = new Float32Array(n * 3); const cc = new THREE.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const th = col(ellip(0.26, 0.23, 0.24, 10, 8), '#9a7c50'); th.translate(0.2, 0.06, 0); parts.push(th);
  const hd = col(ellip(0.12, 0.19, 0.2, 10, 8), '#2a1e14'); hd.translate(0.51, 0.04, 0); parts.push(hd);
  const ab = ellip(0.37, 0.22, 0.25, 14, 8); ab.rotateZ(0.18); ab.translate(-0.39, -0.03, 0);
  {
    const p = ab.attributes.position; const a = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const s = (0.3 - p.getX(i) - 0.39) / 0.68 * 6; const f = s - Math.floor(s); const dk = f > 0.5 ? 1 : 0; const c = dk ? [0.13, 0.085, 0.05] : (s < 3 ? [0.6, 0.37, 0.12] : [0.3, 0.2, 0.1]); a.set(c, i * 3); }
    ab.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts.push(ab);
  }
  for (const s of [-1, 1]) for (const [x, yaw, len] of [[0.34, 0.9, 0.3], [0.22, 0.05, 0.34], [0.1, -0.75, 0.42]]) {
    const g = col(limb(len, 0.03, 0.018, 4), '#1c140d');
    g.rotateZ(-0.9); g.rotateY(-s * (Math.PI / 2 - yaw)); g.translate(x, -0.08, 0.07 * s); parts.push(g);
  }
  for (const s of [-1, 1]) { const g = col(limb(0.3, 0.012, 0.01, 4), '#1c140d'); g.rotateZ(0.5); g.rotateY(-s * 0.5); g.translate(0.58, 0.1, 0.03 * s); parts.push(g); }
  for (const g of parts) { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (g.index) continue; }
  const body = mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g));
  const bodyMat = toon({ color: '#ffffff', vertexColors: true, rim: 1.2, beeColor: '#1a1d18' });
  const bodies = new THREE.InstancedMesh(body, bodyMat, max);
  bodies.frustumCulled = false;
  // folded wings: two narrow quads over the abdomen, screen-door translucent
  const wq = new THREE.CircleGeometry(0.4, 10); wq.scale(1, 0.28, 1); wq.rotateX(-Math.PI / 2);
  const w1 = wq.clone(); w1.rotateY(0.12); w1.translate(-0.3, 0.26, 0.07);
  const w2 = wq.clone(); w2.rotateY(-0.12); w2.translate(-0.3, 0.265, -0.07);
  const wingG = mergeGeometries([w1, w2]);
  const wingMatC = toon({ color: '#5d5a52', rim: 1.2, alpha: 0.55, side: THREE.DoubleSide });
  const wingsI = new THREE.InstancedMesh(wingG, wingMatC, max);
  wingsI.frustumCulled = false;
  const group = new THREE.Group(); group.add(bodies, wingsI);
  const m = new THREE.Matrix4();
  function set(list) {
    const n = Math.min(max, list.length);
    for (let i = 0; i < n; i++) { bodies.setMatrixAt(i, list[i]); wingsI.setMatrixAt(i, list[i]); }
    bodies.count = n; wingsI.count = n;
    bodies.instanceMatrix.needsUpdate = true; wingsI.instanceMatrix.needsUpdate = true;
  }
  return { group, set, m };
}

// soft contact shadow under a standing bee (multiply blend)
export function contactShadow(size = 1.3) {
  const g = new THREE.PlaneGeometry(size, size * 0.62); g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 0.55 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uOp; varying vec2 vUv; void main(){ float d = length((vUv-.5)*2.); float a = smoothstep(1., .1, d) * uOp; gl_FragColor = vec4(vec3(0.), a); }`,
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 1;
  return mesh;
}
