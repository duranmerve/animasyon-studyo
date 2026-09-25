// Materials of the machine and the special shaders (drum surface, belt, toner powder).
import * as THREE from 'three';
import { GLSL_COMMON } from '../page/glsl.js';
import { DRUM_R, D_DEV, D_LASER, D_CHARGE, D_BLADE, DRUM_CIRC, PAGE_L, PAGE_W } from './layout.js';

export function makeMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    shell: new THREE.MeshPhysicalMaterial({ color: 0xe8e6e1, roughness: 0.46, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    shellWarm: new THREE.MeshPhysicalMaterial({ color: 0xd9d6cf, roughness: 0.5, clearcoat: 0.2 }),
    interior: std({ color: 0x24272b, roughness: 0.85 }),
    frame: std({ color: 0x3a3f45, roughness: 0.6, metalness: 0.4 }),
    cut: std({ color: 0xff6a3c, roughness: 0.55, emissive: 0x401000, emissiveIntensity: 0.6 }),
    metal: std({ color: 0xc4c8ce, roughness: 0.3, metalness: 1.0 }),
    darkMetal: std({ color: 0x70767e, roughness: 0.42, metalness: 0.85 }),
    rubber: std({ color: 0x1e1f21, roughness: 0.92 }),
    rubberGray: std({ color: 0x5b5e63, roughness: 0.88 }),
    foam: std({ color: 0x3b4a58, roughness: 1.0 }),
    cartridge: std({ color: 0x1d1f22, roughness: 0.5 }),
    mirror: std({ color: 0xffffff, roughness: 0.04, metalness: 1.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xd8f0f4, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.5 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }),
    pad: std({ color: 0xf2f1ec, roughness: 0.95 }),
    cork: std({ color: 0xa06d44, roughness: 0.95 }),
    pcb: std({ color: 0x1f5a3a, roughness: 0.55 }),
    chip: std({ color: 0x151618, roughness: 0.4 }),
    gold: std({ color: 0xd9a441, roughness: 0.3, metalness: 1 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    heat: new THREE.MeshBasicMaterial({ color: 0xff7a2a }),
    desk: std({ color: 0xd8d2c8, roughness: 0.82 }),
    laptop: std({ color: 0xb9bcc1, roughness: 0.35, metalness: 0.7 }),
    laptopDark: std({ color: 0x1b1c1f, roughness: 0.5 }),
    cable: std({ color: 0x2b2d31, roughness: 0.6 }),
  };
}

// ---------------------------------------------------------------------------
// The photoconductor drum. Everything on its surface is computed from the process position:
// which page row a surface point carries, and whether it is charged, exposed, toned or cleaned.
export function makeDrumMaterial(tonerLinear) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2c6a4c, roughness: 0.3, metalness: 0.15 });
  const uniforms = {
    uSep: { value: null }, uMono: { value: 0 }, uChan: { value: 3 },
    uAlpha: { value: 0 }, uYk: { value: -100 }, uSince: { value: 0 }, uActive: { value: 0 },
    uToner: { value: new THREE.Color(...tonerLinear) }, uCharges: { value: 0 }, uLatent: { value: 0 },
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
${GLSL_COMMON}
varying vec3 vLocalP;
uniform sampler2D uSep; uniform float uMono; uniform int uChan;
uniform float uAlpha, uYk, uSince, uActive, uCharges, uLatent;
uniform vec3 uToner;
float drumCov(float row, float u) {
  if (row < 0.0 || row > ${PAGE_L.toFixed(2)} || u < 0.0 || u > 1.0) return 0.0;
  vec4 s = texture(uSep, vec2(u, 1.0 - row / ${PAGE_L.toFixed(2)}));
  if (uMono > 0.5) return uChan == 3 ? s.r : 0.0;
  return uChan == 0 ? s.r : uChan == 1 ? s.g : uChan == 2 ? s.b : s.a;
}
float gToner = 0.0; vec3 gGlow = vec3(0.0);
`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float phi = atan(vLocalP.y, vLocalP.x);
  float theta = phi + uAlpha;
  float d = ${DRUM_R.toFixed(3)} * mod(theta + 1.5707963, 6.2831853);
  float u = 0.5 - vLocalP.z / ${PAGE_W.toFixed(2)};
  float row = d < ${D_BLADE.toFixed(4)} ? uYk + d : uYk - (${DRUM_CIRC.toFixed(4)} - d);
  float cov = uActive > 0.5 ? drumCov(row, u) : 0.0;
  float toned = d < ${D_DEV.toFixed(4)} ? cov : (d > ${D_BLADE.toFixed(4)} ? cov * 0.07 : 0.0);
  float exposed = d < ${D_LASER.toFixed(4)} ? cov : 0.0;
  float charged = (uActive > 0.5 && d < ${D_CHARGE.toFixed(4)} && uSince >= ${D_CHARGE.toFixed(4)} - d) ? 1.0 - smoothstep(0.3, 0.7, exposed) : 0.0;
  // toner powder
  float grain = hash12(floor(vec2(phi * 900.0, vLocalP.z * 140.0)));
  vec3 tonerCol = uToner * (0.85 + 0.3 * grain);
  diffuseColor.rgb = mix(diffuseColor.rgb, tonerCol, toned);
  gToner = toned;
  // electrical picture made visible: minus signs where charge sits, a warm tint where the laser erased it
  vec2 g = vec2(vLocalP.z / 0.5, phi * ${DRUM_R.toFixed(3)} / 0.5);
  g.x += 0.5 * mod(floor(g.y), 2.0);
  vec2 f = fract(g) - 0.5;
  float aa = max(fwidth(g.x), fwidth(g.y));
  float minus = smoothstep(0.17 + aa, 0.17 - aa, abs(f.x)) * smoothstep(0.045 + aa, 0.045 - aa, abs(f.y));
  float fade = 1.0 - smoothstep(0.06, 0.2, aa);
  gGlow = vec3(0.3, 0.7, 1.0) * minus * charged * uCharges * fade * 0.9 * (1.0 - toned);
  gGlow += vec3(0.25, 0.65, 1.0) * charged * uCharges * 0.04;
  float lat = d >= ${D_DEV.toFixed(4)} && d < ${D_LASER.toFixed(4)} ? cov : 0.0;
  gGlow += vec3(1.0, 0.42, 0.15) * lat * uLatent * 0.55;
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.95, gToner);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gGlow;');
  };
  return mat;
}

// A roller carrying a thin layer of toner powder (developer roller) or just a textured rubber skin.
export function makePowderMaterial(colorLinear, base = 0x222326) {
  const mat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.9 });
  const uniforms = { uToner: { value: new THREE.Color(...colorLinear) }, uAmount: { value: 1 } };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
${GLSL_COMMON}
varying vec3 vLocalP; uniform vec3 uToner; uniform float uAmount;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float phi = atan(vLocalP.y, vLocalP.x);
  float n = hash12(floor(vec2(phi * 500.0, vLocalP.z * 90.0)));
  float n2 = vnoise(vec2(phi * 40.0, vLocalP.z * 8.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, uToner * (0.7 + 0.5 * n) * (0.85 + 0.3 * n2), uAmount);
}`);
  };
  return mat;
}

// Loose toner in a hopper: a noisy powder surface.
export function makeHopperMaterial(colorLinear) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 });
  const uniforms = { uToner: { value: new THREE.Color(...colorLinear) } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
${GLSL_COMMON}
varying vec3 vWP; uniform vec3 uToner;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float n = fbm(vWP.xy * 3.0 + vWP.z * 0.7);
  float s = hash12(floor(vWP.xy * 60.0 + vWP.z * 13.0));
  diffuseColor.rgb = uToner * (0.62 + 0.5 * n) * (0.9 + 0.2 * s);
}`);
  };
  return mat;
}

// Paper-transport belt: dark, slightly glossy, with a moving seam and fine texture.
export function makeBeltMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, side: THREE.DoubleSide });
  const uniforms = { uOffset: { value: 0 } };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vBeltUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBeltUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
${GLSL_COMMON}
varying vec2 vBeltUv; uniform float uOffset;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float x = vBeltUv.x - uOffset;         // x in cm along the belt
  float seam = smoothstep(0.12, 0.0, abs(mod(x, 55.43) - 1.0));
  float fine = vnoise(vec2(x * 3.0, vBeltUv.y * 0.6));
  diffuseColor.rgb *= 0.85 + 0.25 * fine;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5), seam * 0.6);
}`);
  };
  return mat;
}
