// The old linden and its knot hole (centimetres). Trunk axis = +Y at the origin; the hole faces
// +X (east) at HOLE.y. The bark is painted in the shader (fissures, lichen); the hole is cut in
// the shader and lined with a short tunnel whose far end glows with the warmth of the colony.
import * as THREE from 'three';
import { G, COMMON, toon } from './glsl.js';
import { rng, fbm } from './noise.js';
import { createGrass, createFlowers, groundMaterial } from './meadow.js';
import { createCrowd } from './bee.js';

export const TRUNK_R = 38;
export const HOLE = { y: 240, w: 2.3, h: 3.3 };   // half sizes of the opening (cm): ≈ 4.6 × 6.6 cm, a typical wild-nest entrance

export function radiusAt(a, y) {
  const flare = 1 + 0.35 * Math.exp(-Math.max(0, y) / 60);
  const lump = (fbm(Math.cos(a) * 1.3 + 5, y * 0.004, 3, 2) - 0.5) * 0.16 + (fbm(Math.sin(a) * 2.1, y * 0.012, 3, 9) - 0.5) * 0.05;
  // raised callus lip around the hole
  let lip = 0;
  if (Math.cos(a) > 0) {
    const dz = Math.sin(a) * TRUNK_R, dy = y - HOLE.y;
    const e = Math.sqrt((dz / HOLE.w) ** 2 + (dy / HOLE.h) ** 2);
    lip = 1.1 * Math.exp(-((e - 1.3) ** 2) / 0.1) + 0.45 * Math.exp(-((e - 2.1) ** 2) / 0.4);
  }
  return TRUNK_R * flare * (1 + lump) + lip;
}

// trunk surface at the hole (without the lip): the tunnel and the bee's floor start here
export const HOLE_R = (() => { const y = HOLE.y - HOLE.h; const flare = 1 + 0.35 * Math.exp(-y / 60); const lump = (fbm(1.3 + 5, y * 0.004, 3, 2) - 0.5) * 0.16 + (fbm(0, y * 0.012, 3, 9) - 0.5) * 0.05; return TRUNK_R * flare * (1 + lump); })();

function barkMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uHole: { value: new THREE.Vector3(HOLE.y, HOLE.w, HOLE.h) } },
    vertexShader: /* glsl */`attribute vec2 aCyl; varying vec2 vCyl; varying vec3 vW; varying vec3 vN;
      void main(){ vCyl = aCyl; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      uniform vec3 uHole; varying vec2 vCyl; varying vec3 vW; varying vec3 vN;
      vec2 vor(vec2 q, out vec2 cid){
        vec2 ip = floor(q), fp = fract(q);
        float F1 = 9., F2 = 9.; cid = vec2(0.);
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = vec2(hash21(ip + g), hash21(ip + g + 17.3)) * .85 + .075;
          float dd = length((g + o - fp) * vec2(1., .55));
          if (dd < F1) { F2 = F1; F1 = dd; cid = ip + g; } else if (dd < F2) F2 = dd;
        }
        return vec2(F1, F2);
      }
      void main(){
        float a = vCyl.x, y = vCyl.y;
        float e = 10.;
        if (cos(a) > 0.) { float dz = sin(a) * ${HOLE_R.toFixed(2)}, dy = y - uHole.x; e = sqrt(pow(dz/uHole.y, 2.) + pow(dy/uHole.z, 2.)); }
        if (e < 1.) discard;
        float u = a * ${TRUNK_R.toFixed(1)};
        // linden bark: vertically stretched plates (Voronoi cells) split by fissures;
        // close to the camera a finer layer of cracked cork takes over
        vec2 cid;
        vec2 F = vor(vec2(u / 3.2, y / 13.), cid);
        vec2 cid2;
        vec2 Ff = vor(vec2(u / .75, y / 2.1) + 5.3, cid2);
        float near = smoothstep(70., 12., length(cameraPosition - vW));
        float fiss = smoothstep(.02, .16, F.y - F.x + (vnoise(vec2(u, y) * .7) - .5) * .05);
        float fissF = smoothstep(.0, .12, Ff.y - Ff.x);
        float fine = fbm(vec2(u * 1.3, y * .45)) * .6 + fbm(vec2(u * 4.2, y * 1.6)) * .4;
        float dome = 1. - F.x * mix(.5, .15, near);
        float h = fiss * dome * mix(1., fissF * (.75 + .25 * (1. - Ff.x)), near * .85) * (.8 + .25 * fine);
        float tone = hash21(cid) * .5 + hash21(cid2) * .2 * near + fbm(vec2(u / 18., y / 22.) + 2.) * .3;
        vec3 ridge = mix(vec3(.11,.1,.09), vec3(.25,.235,.21), tone) * (.85 + .3 * fine);
        vec3 bark = mix(vec3(.03,.026,.022), ridge, h);
        float lichen = smoothstep(.62, .7, fbm(vec2(u/26., y/24.) + 11.)) * fiss;
        bark = mix(bark, vec3(.36,.39,.33) * (.8 + .3*fine), lichen * .75);
        float moss = smoothstep(90., 0., y) * smoothstep(.45, .6, fbm(vec2(u/20., y/14.) + 4.));
        bark = mix(bark, vec3(.2,.27,.11), moss * .8);
        // the opening: a ring of worn wood glazed with propolis
        float lipK = smoothstep(1.45, 1.02, e);
        float prop = lipK * (.7 + .3 * vnoise(vec2(u, y) * 3.));
        bark = mix(bark, vec3(.12,.055,.025), prop);
        h = mix(h, .9, lipK * .8);
        vec3 N = normalize(vN);
        // bump from the fissure height (screen-space derivatives)
        vec3 dpx = dFdx(vW), dpy = dFdy(vW);
        float hx = dFdx(h), hy = dFdy(h);
        vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
        float det = dot(dpx, r1);
        vec3 grad = sign(det) * (hx * r1 + hy * r2);
        N = normalize(abs(det) * N - grad * mix(3.2, 1.4, near));
        vec3 V = normalize(cameraPosition - vW);
        bark = mix(bark, beeColor(bark, 0.), beeAmt());
        vec3 col = shade(bark, N, V, mix(.35, 1., h), .35);
        col += uSunCol * pow(max(dot(reflect(-uSunDir, N), V), 0.), 30.) * .35 * lipK;
        // warm spill from the hole onto the lip
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
}

function trunkGeometry() {
  const RS = 540;
  // rows: fine around the hole (for the raised lip), coarse far from it
  const ys = [];
  for (let y = -10; y < 200; y += 6) ys.push(y);
  for (let y = 200; y < 228; y += 1) ys.push(y);
  for (let y = 228; y < 252; y += 0.3) ys.push(y);
  for (let y = 252; y < 290; y += 1) ys.push(y);
  for (let y = 290; y < 500; y += 8) ys.push(y);
  for (let y = 500; y <= 1500; y += 40) ys.push(y);
  const HS = ys.length - 1;
  const pos = [], cyl = [], idx = [], uv = [];
  for (let j = 0; j <= HS; j++) {
    const y = ys[j], f = j / HS;
    for (let i = 0; i <= RS; i++) {
      const a = (i / RS) * Math.PI * 2;
      const r = radiusAt(a, y);
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      cyl.push(a, y); uv.push(i / RS, f);
    }
  }
  for (let j = 0; j < HS; j++) for (let i = 0; i < RS; i++) {
    const a = j * (RS + 1) + i, b = a + RS + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCyl', new THREE.Float32BufferAttribute(cyl, 2));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function holeInterior() {
  const grp = new THREE.Group();
  const depth = 22;
  const tube = new THREE.CylinderGeometry(1, 1, depth, 40, 12, true);
  tube.rotateZ(Math.PI / 2);
  tube.scale(1, HOLE.h, HOLE.w);
  // the tunnel narrows and wanders slightly
  const p = tube.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); const k = 1 - 0.18 * ((depth / 2 - x) / depth); p.setY(i, p.getY(i) * k); p.setZ(i, p.getZ(i) * k); }
  tube.computeVertexNormals();
  tube.translate(HOLE_R + 2 - depth / 2, HOLE.y, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...G },
    vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON} varying vec3 vW; varying vec3 vN;
      void main(){
        float d = clamp((${(HOLE_R + 2).toFixed(1)} - vW.x) / 22., 0., 1.);
        float fib = fbm(vec2(vW.x * .6, atan(vW.y - ${HOLE.y.toFixed(1)}, vW.z) * 6.));
        float streak = vnoise(vec2(vW.x * 2.5, atan(vW.y - ${HOLE.y.toFixed(1)}, vW.z) * 14.));
        vec3 wood = vec3(.035,.02,.01) * (.4 + .8*fib) * (.6 + .6*streak) * (1. - smoothstep(0., .3, d));
        vec3 glow = vec3(.95,.6,.2) * pow(d, 4.) * 1.4;
        vec3 col = wood + glow * (.6 + .4*fib);
        col = mix(col, beeColor(col, .0), beeAmt());
        gl_FragColor = vec4(fogIt(col, length(cameraPosition - vW)), 1.);
      }`,
    side: THREE.BackSide,
  });
  grp.add(new THREE.Mesh(tube, mat));
  // back wall: the edge of a comb, glowing wax
  const back = new THREE.PlaneGeometry(HOLE.w * 2.6, HOLE.h * 2.6); back.rotateY(Math.PI / 2);
  back.translate(HOLE_R + 2 - depth + 0.5, HOLE.y, 0);
  const bm = new THREE.ShaderMaterial({
    uniforms: { ...G },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON} varying vec3 vW;
      void main(){
        vec2 p = vW.zy * 3.2;
        vec2 r = vec2(1., 1.732), h = r*.5;
        vec2 a = mod(p, r) - h, b = mod(p - h, r) - h;
        vec2 gv = dot(a,a) < dot(b,b) ? a : b;
        float wall = smoothstep(.36, .5, length(gv));
        vec3 col = mix(vec3(.55,.3,.08), vec3(1.,.7,.28), wall) * 1.1;
        col = mix(col, beeColor(col, 0.), beeAmt());
        gl_FragColor = vec4(fogIt(col, length(cameraPosition - vW)), 1.);
      }`,
  });
  grp.add(new THREE.Mesh(back, bm));
  return grp;
}

// a distant tree: trunk + a few lumpy canopy blobs (toon), for depth layers
function distantTree(R, x, z, s, col) {
  const g = new THREE.Group();
  const tm = toon({ color: '#4a4036', rim: 0.3 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 8, 6), tm); trunk.position.y = 4; g.add(trunk);
  const cm = toon({ color: col, rim: 0.3, mottle: 0.9, flat: true });
  for (let i = 0; i < 16; i++) {
    const b = new THREE.IcosahedronGeometry(1, 3);
    const p = b.attributes.position;
    for (let k = 0; k < p.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(p, k); v.multiplyScalar(1 + (fbm(v.x * 2 + i, v.y * 2 + v.z, 3, 4) - 0.5) * 0.6 + (fbm(v.x * 7 + i, v.y * 7 - v.z * 5, 2, 8) - 0.5) * 0.18); p.setXYZ(k, v.x, v.y, v.z); }
    b.computeVertexNormals();
    const m = new THREE.Mesh(b, cm);
    m.position.set((R() - 0.5) * 8, 8 + R() * 8, (R() - 0.5) * 8); m.scale.setScalar(2 + R() * 2);
    g.add(m);
  }
  g.position.set(x, 0, z); g.scale.setScalar(s);
  return g;
}

// linden leaves (heart-shaped, instanced) on a low branch
function leaves(count, seed, center, spread) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...G },
    vertexShader: /* glsl */`${COMMON} varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying vec3 vC;
      void main(){ vUv = uv; vC = instanceColor; vec4 w = modelMatrix*instanceMatrix*vec4(position,1.);
        w.x += uWind * 1.5 * uv.y * sin(uT*1.7 + w.y*.05 + vC.y*6.); vW = w.xyz;
        vN = normalize(mat3(modelMatrix)*mat3(instanceMatrix)*vec3(0.,0.,1.)); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON} varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying vec3 vC;
      void main(){
        vec2 p = vec2((vUv.x - .5) * 2., vUv.y);
        // heart: two lobes at the base, pointed tip
        float w = sin(3.1416 * pow(p.y, .75)) * .9 * (1. - .15*p.y) + .25 * smoothstep(.3, 0., p.y);
        if (abs(p.x) > w || (p.y < .12 && abs(p.x) < .12 * (1. - p.y/.12))) discard;
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW);
        vec3 base = mix(vec3(.24,.36,.14), vec3(.42,.52,.22), vC.y) * (.9 + .1*cos(abs(p.x)*30. - p.y*18.));
        base *= .85 + .3 * smoothstep(.04, 0., abs(p.x));
        base = mix(base, beeColor(base, 0.), beeAmt());
        vec3 col = shade(base, N, V, 1., .7) + base * .25 * uSunCol * max(0., -dot(N, uSunDir)) * (1. - uDark);
        gl_FragColor = vec4(fogIt(col, length(cameraPosition - vW)), 1.);
      }`,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const R = rng(seed), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const p = new THREE.Vector3(center[0] + (R() - 0.3) * spread[0], center[1] + (R() - 0.5) * spread[1], center[2] + (R() - 0.5) * spread[2]);
    e.set(R() * 6.28, R() * 6.28, R() * 6.28); q.setFromEuler(e);
    const s = 7 + R() * 5;
    m.compose(p, q, new THREE.Vector3(s, s, s)); mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.setRGB(0, R(), 0));
  }
  mesh.frustumCulled = false;
  return mesh;
}

export function createTreeSet() {
  const set = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeometry(), barkMaterial());
  set.add(trunk);
  set.add(holeInterior());
  // a small crowd inside the opening (seen as moving shapes against the glow)
  const crowd = createCrowd(24);
  set.add(crowd.group);
  // ground and grass around the tree
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), groundMaterial());
  ground.rotation.x = -Math.PI / 2; set.add(ground);
  const grass = createGrass({ count: 26000, radius: 1800, inner: 40, center: [300, 0], height: [20, 55], seed: 11 });
  set.add(grass);
  const flowers = createFlowers({ count: 900, radius: 1700, center: [500, 0], seed: 21, heights: [18, 45], mix: [0.3, 0.2, 0.4, 0.1] });
  set.add(flowers);
  // other trees in the mist
  const R = rng(4);
  const far = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const a = -1.4 + R() * 2.8, d = 2200 + R() * 5000;
    far.add(distantTree(R, Math.cos(a) * d + 800, Math.sin(a) * d, 60 + R() * 50, R() < 0.5 ? '#4f6040' : '#5e6c48'));
  }
  // one close neighbour behind (to the north-west) and branches above the hole
  // a few that sit inside the opening shot, behind and beyond the linden
  for (const [x, z, sc, c] of [[-2600, -2200, 55, '#4f6040'], [-3800, -900, 70, '#56663f'], [-1700, -3400, 45, '#5e6c48'], [-5200, -2600, 80, '#4f6040']]) far.add(distantTree(R, x, z, sc, c));
  set.add(far);
  set.userData = { crowd, grass, flowers };
  set.setLOD = k => { grass.setLOD(k); flowers.setLOD(k); };
  return set;
}
