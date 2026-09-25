// Inside the hollow (centimetres): a vertical comb in the XY plane (up = +Y, facing +Z) painted in
// a shader — capped brood, a ring of pollen, nectar and capped honey above — lit only by the glow
// of its wax edges and a soft "sense light" around what the story follows. A crowd of workers,
// the vibration rings of the dance, the warmth of a heater bee. Also: a macro cluster of cells
// (nectar → honey) and the patterned tunnel of the distance experiments.
import * as THREE from 'three';
import { G, COMMON, toon } from './glsl.js';
import { createCrowd } from './bee.js';
import { createGrass, createFlowers, groundMaterial } from './meadow.js';
import { rng } from './noise.js';

export const CELL = 0.54;                        // worker cell, flat to flat (cm)
export const COMB = { w: 70, h: 46 };

function combMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uFocus: { value: new THREE.Vector3() }, uFocusR: { value: 8 }, uSense: { value: 0.5 } },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      uniform vec3 uFocus; uniform float uFocusR, uSense; varying vec3 vW;
      void main(){
        vec2 p = vW.xy / ${CELL.toFixed(3)};
        // hex lattice (rows horizontal)
        vec2 r = vec2(1., 1.7320508), h = r * .5;
        vec2 a = mod(p, r) - h, b = mod(p - h, r) - h;
        vec2 gv = dot(a,a) < dot(b,b) ? a : b;
        vec2 id = p - gv;
        vec2 q = abs(gv);
        float d = max(dot(q, normalize(vec2(1., 1.7320508))), q.x);   // 0 centre → .5 wall
        float wall = smoothstep(.43, .49, d);
        float hc = hash21(floor(id * 7.13));
        vec2 c = id * ${CELL.toFixed(3)};
        // regions of a brood comb
        float brood = smoothstep(1.05, .95, length((c - vec2(0., -5.)) / vec2(19., 13.)) + (fbm(c * .12) - .5) * .25);
        float pollenR = smoothstep(1.3, 1.15, length((c - vec2(0., -5.)) / vec2(19., 13.)) + (fbm(c * .1 + 3.) - .5) * .3) * (1. - brood);
        float honeyTop = smoothstep(8., 14., c.y + (fbm(c * .08) - .5) * 6.);
        vec3 col; float spec = 0.; float dome = 0.;
        float rr = d * 2.;
        if (brood > .5) {
          if (hc < .975) { col = vec3(.5,.34,.17) * (.8 + .25 * vnoise(p * 9.)); dome = 1.; }       // capped brood
          else { col = mix(vec3(.06,.04,.02), vec3(.7,.66,.58), smoothstep(.3, .22, abs(rr - .45))); }   // open cell: a curled larva
        } else if (pollenR > .5 && hc < .75) {
          vec3 pc = hc < .25 ? vec3(.85,.55,.12) : hc < .5 ? vec3(.8,.7,.2) : vec3(.62,.32,.12);
          col = pc * (.75 + .35 * vnoise(p * 14.));
        } else if (honeyTop > .5 && hc < .8) {
          col = vec3(.86,.78,.55) * (.85 + .2 * vnoise(p * 11.)); dome = .35;                 // capped honey
        } else if (hc < .6) {
          col = vec3(.55,.3,.06); spec = 1.;                                                   // nectar, open
        } else {
          col = vec3(.1,.06,.03) * (1. - rr * .5);                                             // empty
        }
        col *= mix(.55, 1., rr) + dome * (1. - rr) * .35;
        vec3 wax = vec3(.85,.62,.28);
        col = mix(col, wax, wall);
        // light: almost nothing, except the glow of the wax edges and the sense light
        float focus = exp(-pow(length(vW.xy - uFocus.xy) / uFocusR, 2.));
        float lightK = mix(.035, .85, focus) * (.12 + uSense * .8);
        vec3 N = normalize(vec3(gv * (wall + dome * (1. - wall)) * 1.4, 1.));
        vec3 V = normalize(cameraPosition - vW);
        vec3 L = normalize(vec3(.3, .7, .8));
        float dif = max(dot(N, L), 0.);
        vec3 lit = col * (.18 + .9 * dif) * lightK;
        lit += wax * wall * .06 * (.35 + focus);
        lit += vec3(1., .78, .45) * spec * pow(max(dot(reflect(-L, N), V), 0.), 26.) * .9 * lightK;
        lit = mix(lit, beeColor(lit, 0.), beeAmt());
        gl_FragColor = vec4(fogIt(lit, length(cameraPosition - vW)), 1.);
      }`,
  });
}

// expanding rings of vibration around the dancer (additive, UV violet)
function ringMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uAmt: { value: 0 }, uPh: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`${COMMON} uniform float uAmt, uPh; varying vec2 vUv;
      void main(){ float r = length(vUv - .5) * 2.;
        float w = 0.; for (int i = 0; i < 3; i++) { float k = fract(uPh * 1.4 + float(i) / 3.); w += smoothstep(.035, 0., abs(r - k)) * (1. - k); }
        float a = w * uAmt * smoothstep(1., .8, r);
        gl_FragColor = vec4(uUV * 1.6 * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}
function glowMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uAmt: { value: 0 }, uCol: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uAmt; uniform vec3 uCol; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float a = pow(max(0., 1. - r), 2.2) * uAmt; gl_FragColor = vec4(uCol * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

export function createHiveSet() {
  const set = new THREE.Group();
  const mat = combMaterial();
  const comb = new THREE.Mesh(new THREE.PlaneGeometry(COMB.w, COMB.h, 1, 1), mat);
  set.add(comb);
  // the next comb behind, and the cavity walls, barely there
  const back = new THREE.Mesh(new THREE.PlaneGeometry(COMB.w * 1.4, COMB.h * 1.4), toon({ color: '#1a0f07', rim: 0.2 }));
  back.position.z = -3.2; set.add(back);
  const crowd = createCrowd(420);
  set.add(crowd.group);
  const rings = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), ringMaterial()); rings.renderOrder = 5; set.add(rings);
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), glowMaterial('#ff9a3a')); heat.renderOrder = 5; set.add(heat);
  // crowd layout: fixed homes, slow wandering (pure function of time)
  const R = rng(17);
  const homes = [];
  for (let i = 0; i < 420; i++) {
    let x, y; do { x = (R() - 0.5) * COMB.w * 0.92; y = (R() - 0.5) * COMB.h * 0.9; } while (R() > 0.35 + 0.65 * Math.exp(-((x / 18) ** 2 + ((y + 4) / 13) ** 2)));
    homes.push({ x, y, th: R() * 6.28, w: 0.1 + R() * 0.25, ph: R() * 6.28, a: 0.3 + R() * 0.9, s: 0.95 + R() * 0.1 });
  }
  const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), qz = new THREE.Quaternion();
  const Z = new THREE.Vector3(0, 0, 1);
  const onComb = (x, y, th, s = 1) => { qz.setFromAxisAngle(Z, th); q.copy(qz).multiply(qx); return new THREE.Matrix4().compose(new THREE.Vector3(x, y, 0.3), q.clone(), new THREE.Vector3(s, s, s)); };
  // t: story time; clear: {x,y,r} arena kept free; extra: list of matrices to add first; n: how many
  function crowdAt(t, { clear = null, extra = [], n = 420 } = {}) {
    const list = [...extra];
    for (let i = 0; i < homes.length && list.length < n; i++) {
      const h = homes[i];
      const x = h.x + Math.sin(t * h.w + h.ph) * h.a, y = h.y + Math.cos(t * h.w * 0.8 + h.ph * 1.3) * h.a;
      if (clear && Math.hypot(x - clear.x, y - clear.y) < clear.r) continue;
      list.push(onComb(x, y, h.th + 0.5 * Math.sin(t * h.w * 1.7 + h.ph), h.s));
    }
    crowd.set(list);
  }
  set.userData = { mat, crowd, rings, heat, crowdAt, onComb };
  set.setLOD = k => { set.userData.maxCrowd = Math.floor(120 + 300 * k); };
  set.userData.maxCrowd = 420;
  return set;
}

// seven cells in 3D for the nectar-to-honey close-up: walls, bottoms, nectar surface, wax cap
export function createCellSet() {
  const set = new THREE.Group();
  const Rc = CELL / Math.sqrt(3);                 // circumradius
  const depth = 1.1;
  const wallMat = new THREE.ShaderMaterial({
    uniforms: { ...G, uGlow: { value: 1 } },
    vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON} uniform float uGlow; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
        float lip = smoothstep(.12, 0., abs(vW.z));
        float depthK = clamp(-vW.z / ${depth.toFixed(2)}, 0., 1.);
        vec3 wax = vec3(.9,.66,.3) * (.85 + .2 * vnoise(vW.xy * 60. + vW.z * 40.));
        float trans = pow(1. - abs(dot(N, V)), 1.5);
        vec3 col = wax * (.04 + .3 * trans + .45 * lip) * uGlow * (1. - depthK * .75);
        gl_FragColor = vec4(fogIt(col, length(cameraPosition - vW)), 1.); }`,
    side: THREE.DoubleSide,
  });
  const centres = [[0, 0]];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; centres.push([Math.cos(a) * CELL, Math.sin(a) * CELL]); }
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const r = i % 2 ? CELL * 2 : CELL * Math.sqrt(3); centres.push([Math.cos(a + (i % 2 ? Math.PI / 6 : 0)) * r, Math.sin(a + (i % 2 ? Math.PI / 6 : 0)) * r]); }
  const walls = [];
  for (const [cx, cy] of centres) {
    for (let k = 0; k < 6; k++) {
      const a0 = k * Math.PI / 3, a1 = a0 + Math.PI / 3;
      const p0 = [cx + Math.cos(a0) * Rc, cy + Math.sin(a0) * Rc], p1 = [cx + Math.cos(a1) * Rc, cy + Math.sin(a1) * Rc];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, 0, ...p1, 0, ...p1, -depth, ...p0, -depth], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
      walls.push(g);
    }
  }
  const wallMesh = new THREE.Mesh(mergeAll(walls), wallMat); set.add(wallMesh);
  // bottoms
  const hexG = new THREE.CircleGeometry(Rc * 0.98, 6);
  const bottomMat = toon({ color: '#3a2008', rim: 0.2 });
  const honeyMat = toon({ color: '#c07818', rim: 1.2, emit: '#2a1403' });
  const caps = [];
  centres.forEach(([cx, cy], i) => {
    const b = new THREE.Mesh(hexG, bottomMat); b.position.set(cx, cy, -depth); set.add(b);
    if (i > 0) {
      // neighbours: some capped honey already, glowing when lit from behind
      const c = new THREE.Mesh(new THREE.CircleGeometry(Rc * 0.9, 6), capMaterial()); c.position.set(cx, cy, 0.01); c.userData.i = i; set.add(c); caps.push(c);
      const n = new THREE.Mesh(new THREE.CircleGeometry(Rc * 0.95, 6), honeyMat); n.position.set(cx, cy, -depth + 0.15 + ((i * 37) % 7) / 7 * 0.6); set.add(n);
    }
  });
  // the nectar in the centre cell: its level and a glossy surface
  const nectar = new THREE.Mesh(new THREE.CircleGeometry(Rc * 0.97, 6), nectarMaterial());
  set.add(nectar);
  const cap = new THREE.Mesh(hexG, capMaterial()); cap.position.set(0, 0, 0.012); set.add(cap);
  set.userData = { nectar, cap, caps, wallMat, depth, centres };
  return set;
}
function mergeAll(list) {
  const pos = [], idx = [], uv = []; let off = 0;
  for (const g of list) { const p = g.attributes.position.array, u = g.attributes.uv.array; pos.push(...p); uv.push(...u); for (const i of g.index.array) idx.push(i + off); off += p.length / 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function nectarMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uThick: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON} uniform float uThick; varying vec3 vW; varying vec2 vUv;
      void main(){ vec3 V = normalize(cameraPosition - vW); vec3 N = vec3(0.,0.,1.);
        float r = length(vUv - .5) * 2.;
        vec3 thin = vec3(.75,.5,.14), thick = vec3(.62,.3,.04);
        vec3 col = mix(thin, thick, uThick) * (.35 + .4 * (1. - r));
        float fr = pow(1. - max(dot(N, V), 0.), 3.);
        col += vec3(1., .85, .55) * (fr * .6 + pow(max(0., 1. - length(vUv - vec2(.35,.65)) * 3.), 6.) * .9);
        col += vec3(.9,.5,.1) * .15;
        gl_FragColor = vec4(fogIt(col, length(cameraPosition - vW)), 1.); }`,
  });
}
function capMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uBack: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON} uniform float uBack; varying vec3 vW; varying vec2 vUv;
      void main(){ float r = length(vUv - .5) * 2.;
        float tex = vnoise(vW.xy * 90.) * .6 + vnoise(vW.xy * 260.) * .4;
        vec3 col = vec3(.9,.8,.56) * (.12 + .16 * tex) * (1.05 - r * .3);
        col += vec3(1., .62, .18) * uBack * (.8 - r * .4) * (.8 + .3 * tex);
        gl_FragColor = vec4(fogIt(col, length(cameraPosition - vW)), 1.); }`,
  });
}

// the tunnel of the odometer experiments, standing in a meadow: a narrow wooden corridor whose
// inner walls carry vertical stripes, an open roof of thin slats, a sugar dish at the far end.
export function createTunnelSet() {
  const set = new THREE.Group();
  const L = 600, W = 22, Hh = 22, T = 1.6;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), groundMaterial({ a: '#62703f', b: '#8c9a6e', c: '#6d6340' }));
  ground.rotation.x = -Math.PI / 2; set.add(ground);
  const grass = createGrass({ count: 26000, radius: 1400, center: [300, 0], height: [8, 30], seed: 57, avoid: (x, z) => x > -30 && x < L + 30 && Math.abs(z) < 30, color: ['#4d6232', '#8a9a58'] });
  set.add(grass);
  const flowers = createFlowers({ count: 1400, radius: 1300, center: [300, 0], seed: 61, heights: [14, 34], avoid: (x, z) => x > -30 && x < L + 30 && Math.abs(z) < 34 });
  set.add(flowers);
  // walls: stripes inside (widths vary a little, like the printed patterns), painted wood outside
  const wallMat = new THREE.ShaderMaterial({
    uniforms: { ...G },
    vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON} varying vec3 vW; varying vec3 vN;
      void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
        float inside = max(step(0., -N.z * sign(vW.z)) * step(.5, abs(N.z)), step(.5, N.y) * step(vW.y, 15.) * step(abs(vW.z), 11.));           // faces that look into the corridor
        float cell = floor(vW.x / 2.4);
        float st = step(.5, fract(vW.x / 2.4 + hash11(cell) * .35));
        vec3 stripes = mix(vec3(.16,.15,.12), vec3(.86,.84,.76), st);
        vec3 wood = vec3(.72,.66,.54) * (.85 + .15 * fbm(vW.xy * vec2(.08, 1.2)));
        vec3 base = mix(wood, stripes, inside);
        base = mix(base, beeColor(base, 0.), beeAmt());
        vec3 col = shade(base, N, V, mix(1., .75, inside), .4) * cloudShade(vW);
        gl_FragColor = vec4(fogIt(col, length(cameraPosition - vW)), 1.); }`,
  });
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(L, Hh, T), wallMat); w.position.set(L / 2, Hh / 2, s * (W / 2 + T / 2)); set.add(w); }
  const floorM = new THREE.Mesh(new THREE.BoxGeometry(L, T, W + 2 * T), wallMat); floorM.position.set(L / 2, -T / 2 + 0.01, 0); set.add(floorM);
  const slatM = toon({ color: '#c7b995', rim: 0.4 });
  for (let x = 0; x <= L; x += 40) { const sl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, W + 2 * T), slatM); sl.position.set(x, Hh + 0.6, 0); set.add(sl); }
  for (const s of [-1, 1]) for (let x = 20; x < L; x += 120) { const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 2), slatM); leg.position.set(x, -7, s * (W / 2 + T)); set.add(leg); }
  set.position.y = 14;                                            // raised on short legs above the grass
  grass.position.y = flowers.position.y = ground.position.y = -14;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(4, 3.4, 1.2, 24), toon({ color: '#d9a441', rim: 1, emit: '#2a1a04' })); dish.position.set(L - 12, 0.6, 0); set.add(dish);
  set.userData = { L, W, H: Hh, y0: 14 };
  set.setLOD = k => { grass.setLOD(k); flowers.setLOD(k); };
  return set;
}
