// The meadow, in centimetres: a painted ground, instanced grass blades that sway with the wind
// (story time), and four kinds of wildflower heads drawn in the shader (petal outline, centre,
// and the ultraviolet pattern only a bee sees). One hero flower is built in 3D for close-ups.
import * as THREE from 'three';
import { G, COMMON, toon } from './glsl.js';
import { rng } from './noise.js';

// flower kinds: human colour, centre, ultraviolet pattern (a "bullseye": UV-bright tips, dark centre)
export const KINDS = [
  { name: 'yellow', petals: 5, col: '#e8c332', ctr: '#c7902a', uvTip: 0.95, uvCtr: 0.0, size: 1.6, round: 1.0 },  // buttercup-like
  { name: 'blue', petals: 5, col: '#6f7fd6', ctr: '#e8e0f0', uvTip: 0.35, uvCtr: 0.35, size: 1.3, round: 0.7 },  // borage/phacelia-like
  { name: 'white', petals: 16, col: '#f2f0e8', ctr: '#e0b030', uvTip: 0.0, uvCtr: 0.0, size: 1.7, round: 0.35 }, // daisy-like
  { name: 'red', petals: 5, col: '#c8322a', ctr: '#2a1612', uvTip: 0.0, uvCtr: 0.0, size: 2.0, round: 1.1 },     // no UV: dark to a bee
];

export function groundMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uA: { value: new THREE.Color(opts.a ?? '#6f7d55') }, uB: { value: new THREE.Color(opts.b ?? '#8c9a6e') }, uC: { value: new THREE.Color(opts.c ?? '#5a5238') } },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      uniform vec3 uA, uB, uC; varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        float n = fbm(p * .004) * .6 + fbm(p * .03) * .3 + vnoise(p * .4) * .1;
        vec3 base = mix(uA, uB, smoothstep(.35, .7, n));
        base = mix(base, uC, smoothstep(.62, .8, fbm(p*.011 + 7.)) * .5);
        base *= .85 + .3 * vnoise(p * 1.7);
        base = mix(base, beeColor(base, 0.), beeAmt());
        vec3 V = normalize(cameraPosition - vW);
        vec3 col = shade(base, vec3(0.,1.,0.), V, .8, .0) * cloudShade(vW);
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
}

// grass: a tapered, bent strip; instanced; count set by tier
export function createGrass({ count = 30000, radius = 1500, inner = 0, center = [0, 0], seed = 7, height = [18, 45], avoid = null, color = ['#5e7040', '#9aa66c'] } = {}) {
  const seg = 4;
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], nor = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const v = i / seg, w = 0.5 * (1 - v * 0.92);
    const bend = v * v * 0.35;
    for (const s of [-1, 1]) { pos.push(s * w, v, bend); uv.push(s < 0 ? 0 : 1, v); nor.push(0, 0.4, -1); }
  }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  const mat = toon({ color: '#ffffff', sway: 1, rim: 0.12, aoByHeight: true, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(g, mat, count);
  const R = rng(seed), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const cA = new THREE.Color(color[0]), cB = new THREE.Color(color[1]);
  let n = 0;
  for (let tries = 0; n < count && tries < count * 3; tries++) {
    // denser near the centre
    const r = inner + (radius - inner) * Math.pow(R(), 1.6), a = R() * Math.PI * 2;
    const x = center[0] + Math.cos(a) * r, z = center[1] + Math.sin(a) * r;
    if (avoid && avoid(x, z)) continue;
    const h = height[0] + (height[1] - height[0]) * Math.pow(R(), 1.5);
    e.set((R() - 0.5) * 0.5, R() * Math.PI * 2, (R() - 0.5) * 0.5);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1.4 + R() * 1.4, h, h));
    mesh.setMatrixAt(n, m);
    c.copy(cA).lerp(cB, R()).multiplyScalar(0.85 + R() * 0.3);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  mesh.userData.max = n;
  mesh.frustumCulled = false;
  mesh.setLOD = k => { mesh.count = Math.max(200, Math.floor(mesh.userData.max * k)); };
  return mesh;
}

// flower head shader (instanced quads). instanceColor = (kind/4, random, open)
const FLOWER_FRAG = /* glsl */`
  varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vC;
  uniform vec3 uCols[4]; uniform vec3 uCtrs[4]; uniform vec4 uKind[4]; // petals, uvTip, uvCtr, round
  vec4 flower(vec2 p, int k, float rnd, out float uvAmt, out float ctrMask){
    float r = length(p), a = atan(p.y, p.x) + rnd * 6.28;
    vec4 K = uKind[k];
    float n = K.x;
    float shape = pow(abs(cos(a * n * .5)), K.w);
    float rmax = .42 + .58 * shape;
    rmax *= .94 + .06 * sin(a * 3. + rnd * 20.);
    float petal = smoothstep(rmax + .02, rmax - .02, r);
    ctrMask = smoothstep(.24, .2, r);
    vec3 pc = uCols[k] * (.78 + .22 * smoothstep(0., 1., r));
    // veins
    pc *= .92 + .08 * cos(a * n * 6.);
    vec3 col = mix(pc, uCtrs[k], ctrMask);
    uvAmt = mix(K.z, K.y, smoothstep(.35, .7, r)) * (1. - ctrMask);
    return vec4(col, petal);
  }`;

export function createFlowers({ count = 2500, radius = 1500, center = [0, 0], seed = 3, mix = [0.4, 0.2, 0.25, 0.15], avoid = null, heights = [14, 40] } = {}) {
  const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...G,
      uCols: { value: KINDS.map(k => new THREE.Color(k.col)) },
      uCtrs: { value: KINDS.map(k => new THREE.Color(k.ctr)) },
      uKind: { value: KINDS.map(k => new THREE.Vector4(k.petals, k.uvTip, k.uvCtr, k.round)) },
    },
    vertexShader: /* glsl */`${COMMON}
      varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vC;
      void main(){ vUv = uv; vC = instanceColor;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
        vec4 base = modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
        float hgt = base.y;
        float ph = base.x*.013 + base.z*.017;
        vec2 sway = uWind * hgt * .035 * vec2(sin(uT*1.3 + ph) + .45*sin(uT*2.9 + ph*2.3), .6*cos(uT*1.1 + ph*1.7));
        w.xz += sway;
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.,1.,0.));
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${COMMON}
      ${FLOWER_FRAG}
      void main(){
        int k = int(vC.x * 4. + .5);
        float uvAmt, ctr;
        vec4 f = flower(vUv * 2. - 1., k, vC.y, uvAmt, ctr);
        if (f.a < .5) discard;
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW);
        vec3 base = mix(f.rgb, beeColor(f.rgb, uvAmt), beeAmt());
        vec3 col = shade(base, N, V, 1., .5);
        col += f.rgb * .12 * uSunCol * (1. - uDark);    // translucency
        col *= cloudShade(vW);
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.);
      }`,
    side: THREE.DoubleSide,
  });
  const heads = new THREE.InstancedMesh(geo, mat, count);
  const stemG = new THREE.CylinderGeometry(0.12, 0.16, 1, 4, 1); stemG.translate(0, -0.5, 0);
  const stems = new THREE.InstancedMesh(stemG, toon({ color: '#5d7040', sway: 0.95, rim: 0.5 }), count);
  const R = rng(seed), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const list = [];
  let n = 0;
  for (let tries = 0; n < count && tries < count * 4; tries++) {
    const r = radius * Math.pow(R(), 1.3), a = R() * Math.PI * 2;
    const x = center[0] + Math.cos(a) * r, z = center[1] + Math.sin(a) * r;
    if (avoid && avoid(x, z)) continue;
    // kinds grow in patches
    const patch = Math.floor((Math.sin(x * 0.004) + Math.cos(z * 0.0035) + 2) * 1.2 + R() * 1.6) % 4;
    let kind = R() < 0.55 ? patch : (() => { let u = R(), s = 0; for (let i = 0; i < 4; i++) { s += mix[i]; if (u < s) return i; } return 0; })();
    const K = KINDS[kind];
    const h = heights[0] + (heights[1] - heights[0]) * R();
    const sz = K.size * (0.8 + R() * 0.45);
    e.set(-0.35 + R() * 0.7 - 0.25, R() * 6.28, -0.3 + R() * 0.6);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, h, z), q, new THREE.Vector3(sz, sz, sz));
    heads.setMatrixAt(n, m);
    heads.setColorAt(n, c.setRGB(kind / 4, R(), 1));
    m.compose(new THREE.Vector3(x, h, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
    stems.setMatrixAt(n, m);
    list.push({ x, y: h, z, kind, sz });
    n++;
  }
  heads.count = stems.count = n;
  heads.frustumCulled = stems.frustumCulled = false;
  const group = new THREE.Group(); group.add(stems, heads);
  group.userData.list = list;
  group.setLOD = k => { heads.count = stems.count = Math.max(100, Math.floor(n * k)); };
  return group;
}

// a hero flower with real petals (for macro shots); same colours and UV pattern
export function createHeroFlower(kind = 0) {
  const K = KINDS[kind];
  const g = new THREE.Group();
  const petalMat = new THREE.ShaderMaterial({
    uniforms: { ...G, uCol: { value: new THREE.Color(K.col) }, uUVt: { value: K.uvTip }, uUVc: { value: K.uvCtr } },
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      uniform vec3 uCol; uniform float uUVt, uUVc; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        // petal outline in uv: v along petal (0 base .. 1 tip), u across
        float v = vUv.y, u = (vUv.x - .5) * 2.;
        float w = sin(3.1416 * pow(v, .8)) * (.55 + .45*v);
        if (abs(u) > w) discard;
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW);
        vec3 base = uCol * (.8 + .2*v) * (.93 + .07*cos(u*40.));
        base = mix(base, base*1.1 + .05, pow(1. - abs(u)/max(w,.01), 6.) * .0);
        float uvA = mix(uUVc, uUVt, smoothstep(.35, .65, v));
        base = mix(base, beeColor(base, uvA), beeAmt());
        vec3 col = shade(base, N, V, mix(.7, 1., v), .6) + uCol * .1 * uSunCol * (1. - uDark);
        float spec = pow(max(dot(reflect(-uSunDir, N), V), 0.), 40.) * .25;
        col += uSunCol * spec;
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.);
      }`,
    side: THREE.DoubleSide,
  });
  const n = K.petals;
  for (let i = 0; i < n; i++) {
    const pg = new THREE.PlaneGeometry(1.1, 1.25, 6, 8); pg.translate(0, 0.625, 0);
    const p = pg.attributes.position;
    for (let j = 0; j < p.count; j++) { const y = p.getY(j), x = p.getX(j); p.setZ(j, -0.18 * y * y + 0.12 * x * x * (1 + y)); }
    pg.computeVertexNormals();
    pg.rotateX(-Math.PI / 2 + 0.25);
    pg.rotateY(i / n * Math.PI * 2);
    const mesh = new THREE.Mesh(pg, petalMat); g.add(mesh);
  }
  const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: K.ctr, rim: 0.4 }));
  ctr.scale.y = 0.55; g.add(ctr);
  // stamens
  const st = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 6, 4), toon({ color: '#d8a030', rim: 0.3 }), 40);
  const R = rng(5), m = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = 0.18 + R() * 0.2; m.makeTranslation(Math.cos(a) * r, 0.16 + R() * 0.06, Math.sin(a) * r); st.setMatrixAt(i, m); }
  g.add(st);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 40, 6), toon({ color: '#5d7040', rim: 0.5 })); stem.position.y = -20; g.add(stem);
  return g;
}

// the meadow a kilometre and a half from the tree: flowers in patches, a few trees at the edge,
// hero flowers at fixed spots for the close-ups (HERO[i] = { pos, kind, group })
export const HERO_SPOTS = [
  { pos: [0, 30, 0], kind: 0 },        // the yellow flower of the close-ups (UV bullseye)
  { pos: [22, 27, -14], kind: 0 },
  { pos: [-18, 33, 12], kind: 3 },     // a red one beside it
  { pos: [40, 26, 18], kind: 0 },
  { pos: [-34, 29, -26], kind: 1 },
];
export function createMeadowSet({ distantTree } = {}) {
  const set = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), groundMaterial({ a: '#62703f', b: '#8c9a6e', c: '#6d6340' }));
  ground.rotation.x = -Math.PI / 2; set.add(ground);
  const clear = (x, z) => HERO_SPOTS.some(h => Math.hypot(x - h.pos[0], z - h.pos[2]) < 26) || Math.hypot(x + 66, z - 92) < 60 || Math.hypot(x + 20, z - 140) < 50;
  const grass = createGrass({ count: 42000, radius: 2400, inner: 0, center: [0, 0], height: [8, 26], seed: 31, avoid: clear, color: ['#4d6232', '#8a9a58'] });
  set.add(grass);
  const turf = createGrass({ count: 9000, radius: 170, inner: 0, center: [0, 40], height: [3, 9], seed: 37, avoid: (x, z) => !clear(x, z), color: ['#4d6232', '#7f914f'] });
  set.add(turf);
  const flowers = createFlowers({ count: 3800, radius: 2200, center: [0, 0], seed: 41, heights: [16, 36], avoid: clear, mix: [0.38, 0.22, 0.25, 0.15] });
  set.add(flowers);
  const heroes = HERO_SPOTS.map(h => {
    const f = createHeroFlower(h.kind);
    f.position.set(...h.pos); f.rotation.set(-0.12, h.pos[0] * 0.1, 0.1); f.scale.setScalar(KINDS[h.kind].size);
    set.add(f); return f;
  });
  set.userData = { grass, flowers, heroes };
  set.setLOD = k => { grass.setLOD(k); turf.setLOD(k); flowers.setLOD(k); };
  return set;
}
