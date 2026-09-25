// A sheet of paper: a flexible grid that either follows the paper path (bending round rollers)
// or sits at a rigid pose with an optional bow. Its shader shows the toner layers the sheet has
// received so far (per colour), loose powder before the fuser and fused toner after it.
import * as THREE from 'three';
import { GLSL_COMMON } from '../page/glsl.js';
import { PAGE_L, PAGE_W, P_DRUM, S_FUSER, pathPoint } from './layout.js';

const NV = 220, NU = 10;

export class Sheet {
  constructor(scene) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array((NV + 1) * (NU + 1) * 3);
    const uv = new Float32Array((NV + 1) * (NU + 1) * 2);
    const idx = [];
    for (let i = 0; i <= NV; i++) for (let j = 0; j <= NU; j++) {
      const k = i * (NU + 1) + j;
      uv[k * 2] = j / NU; uv[k * 2 + 1] = i / NV; // (u, v from the top)
      if (i < NV && j < NU) { const a = k, b = k + 1, c = k + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.geo = g;
    this.uniforms = {
      uSep: { value: null }, uMono: { value: 0 }, uLead: { value: 0 },
      uPk: { value: new THREE.Vector4(P_DRUM[2], P_DRUM[1], P_DRUM[0], P_DRUM[3]) },
      uActive: { value: new THREE.Vector4(1, 1, 1, 1) }, uFuser: { value: S_FUSER }, uFull: { value: 0 }, uBlank: { value: 1 },
      uScanX: { value: 0 }, uScanOn: { value: 0 },
    };
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, side: THREE.DoubleSide, shadowSide: THREE.BackSide });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vPage; varying vec3 vWorldP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPage = uv; vWorldP = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
${GLSL_COMMON}
varying vec2 vPage; varying vec3 vWorldP;
uniform sampler2D uSep; uniform float uMono, uLead, uFuser, uFull, uBlank, uScanX, uScanOn;
uniform vec4 uPk, uActive;
float gInk = 0.0, gFused = 1.0; vec3 gCol = vec3(1.0);`)
        .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec2 tuv = vec2(vPage.x, 1.0 - vPage.y);
  vec4 s = texture(uSep, tuv);
  vec4 cov = uMono > 0.5 ? vec4(0.0, 0.0, 0.0, s.r) : s;
  float row = vPage.y * ${PAGE_L.toFixed(2)};
  vec4 passed = uFull > 0.5 ? vec4(1.0) : step(vec4(row), vec4(uLead) - uPk);
  cov *= passed * uActive * (1.0 - uBlank);
  gFused = uFull > 0.5 ? 1.0 : step(row, uLead - uFuser);
  gInk = max(max(cov.r, cov.g), max(cov.b, cov.a));
  vec3 col = gl_FrontFacing ? composite(cov) : PAPER * (1.0 - 0.035 * gInk);
  if (gFused < 0.5) col = mix(col, mix(col, PAPER, 0.22), gInk);
  float fiber = 0.95 + 0.05 * fbm(vPage * vec2(380.0, 540.0));
  gCol = col;
  diffuseColor.rgb = pow(col, vec3(2.2)) * fiber;
}`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, gFused > 0.5 ? 0.42 : 1.0, gl_FrontFacing ? gInk : 0.0);')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * 0.1;
{
  float band = exp(-pow((vWorldP.x - uScanX) / 0.45, 2.0));
  float halo = exp(-pow((vWorldP.x - uScanX) / 2.5, 2.0)) * 0.25;
  totalEmissiveRadiance += pow(gCol, vec3(2.2)) * vec3(0.92, 0.98, 1.0) * (band * 1.6 + halo) * uScanOn * (gl_FrontFacing ? 1.0 : 0.15);
}`);
    };
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this._v2 = new THREE.Vector2();
    this._m = new THREE.Matrix4();
    this._p = new THREE.Vector3();
  }

  setSource(tex, mono) { this.uniforms.uSep.value = tex; this.uniforms.uMono.value = mono ? 1 : 0; }

  // follow the paper path with the leading edge at s = lead
  followPath(lead) {
    const P = this.geo.attributes.position.array;
    for (let i = 0; i <= NV; i++) {
      const v = i / NV;
      const p = pathPoint(lead - v * PAGE_L, this._v2);
      for (let j = 0; j <= NU; j++) {
        const k = (i * (NU + 1) + j) * 3;
        P[k] = p.x; P[k + 1] = p.y; P[k + 2] = (0.5 - j / NU) * PAGE_W;
      }
    }
    this.finish();
  }

  // rigid pose: page centre, orientation, bow (cm) along the length and a lift of one end
  setPose(position, quaternion, bow = 0, peel = 0) {
    const P = this.geo.attributes.position.array;
    this._m.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
    for (let i = 0; i <= NV; i++) {
      const v = i / NV, t = 2 * v - 1;
      let y = bow * (t * t - 0.33);
      let z = (v - 0.5) * PAGE_L;
      if (peel > 0) { const e = Math.max(0, v - 0.55) / 0.45; y += peel * e * e * 6; z -= peel * e * e * e * 2; }
      for (let j = 0; j <= NU; j++) {
        const k = (i * (NU + 1) + j) * 3;
        this._p.set((j / NU - 0.5) * PAGE_W, y, z).applyMatrix4(this._m);
        P[k] = this._p.x; P[k + 1] = this._p.y; P[k + 2] = this._p.z;
      }
    }
    this.finish();
  }

  finish() {
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }

  // printed-so-far state
  setPrint({ lead = 0, full = false, blank = false, active = [1, 1, 1, 1], scanX = 0, scanOn = 0 }) {
    const u = this.uniforms;
    u.uLead.value = lead; u.uFull.value = full ? 1 : 0; u.uBlank.value = blank ? 1 : 0;
    u.uActive.value.set(active[0], active[1], active[2], active[3]);
    u.uScanX.value = scanX; u.uScanOn.value = scanOn;
  }
}

// Orientation helpers: images of the sheet's local X (page right), Y (printed side), Z (page down).
export function basisQuat(x, y, z) {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
