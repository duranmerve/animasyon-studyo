// GPU simulation of printing and photocopying the page.
//   content (RGB) ──RIP──▶ original coverage (CMYK halftone, RGBA)
//   coverage ──scan──▶ grey image (blur, tone curve, skew, lid shadow, dust, noise)
//   grey ──copy RIP──▶ copy coverage (K halftone at a different screen, R)
// Copies of copies repeat scan + copy RIP, so losses really accumulate.
import * as THREE from 'three';
import { GLSL_COMMON } from './glsl.js';
import { TEX_W, TEX_H } from './content.js';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const SEP_FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uContent;
uniform vec2 uRes;
uniform float uPeriod;
varying vec2 vUv;
void main() {
  vec2 px = vUv * uRes;
  vec3 rgb = texture(uContent, vUv).rgb;
  vec3 cmy = 1.0 - rgb;
  float k = min(cmy.r, min(cmy.g, cmy.b));          // full grey-component replacement
  vec3 c3 = k > 0.999 ? vec3(0.0) : (cmy - k) / (1.0 - k);
  // toner granularity: rough dot edges
  vec2 cell = floor(px);
  float j0 = (hash12(cell) - 0.5) * 0.35 + (vnoise(px * 0.45) - 0.5) * 0.3;
  float j1 = (hash12(cell + 17.0) - 0.5) * 0.35 + (vnoise(px * 0.45 + 9.0) - 0.5) * 0.3;
  float j2 = (hash12(cell + 41.0) - 0.5) * 0.35 + (vnoise(px * 0.45 + 23.0) - 0.5) * 0.3;
  float j3 = (hash12(cell + 73.0) - 0.5) * 0.3 + (vnoise(px * 0.45 + 51.0) - 0.5) * 0.25;
  vec4 cov;
  cov.r = halftone(c3.r, px, radians(15.0), uPeriod, j0);
  cov.g = halftone(c3.g, px, radians(75.0), uPeriod, j1);
  cov.b = halftone(c3.b, px, radians(0.0), uPeriod, j2);
  cov.a = halftone(k, px, radians(45.0), uPeriod, j3);
  gl_FragColor = cov;
}
`;

const SCAN_FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uSrc;
uniform float uMono;       // source is a black-and-white copy (R = K coverage)
uniform vec2 uRes;
uniform mat3 uXf;          // glass uv -> source page uv
uniform float uSeed;
uniform vec3 uDust[28];    // glass uv + radius (uv units)
varying vec2 vUv;

float pageReflectance(vec2 uv) {
  // outside the sheet the scanner sees the white lid; right at the sheet edge a thin gap shadow
  vec2 d2 = max(max(-uv, uv - 1.0), 0.0) * vec2(21.0, 29.7); // cm outside the page
  float outside = length(d2);
  if (outside > 0.0) {
    return mix(0.28, 0.9, smoothstep(0.0, 0.28, outside));
  }
  vec4 s = texture(uSrc, uv);
  vec4 cov = uMono > 0.5 ? vec4(0.0, 0.0, 0.0, s.r) : s;
  vec3 c = composite(cov);
  return dot(c, vec3(0.25, 0.62, 0.13));
}

void main() {
  vec2 uv = (uXf * vec3(vUv, 1.0)).xy;
  vec2 texel = 1.0 / uRes;
  // scanner optics blur (lens MTF + sensor aperture)
  float g = pageReflectance(uv) * 0.2;
  const int N = 12;
  float r = 1.1;
  for (int i = 0; i < N; i++) {
    float a = float(i) * 2.39996 + 0.4;
    float rr = r * sqrt((float(i) + 0.5) / float(N)) * 1.6;
    g += pageReflectance(uv + vec2(cos(a), sin(a)) * rr * texel) * (0.8 / float(N));
  }
  // copier auto-exposure: push paper to white, deepen mid-tones
  g = clamp((g - 0.06) / (0.86 - 0.06), 0.0, 1.0);
  g = pow(g, 1.06);
  // dust on the glass (same place every time)
  for (int i = 0; i < 28; i++) {
    vec2 dd = (vUv - uDust[i].xy) * vec2(1.0, 29.7 / 21.0);
    float k = smoothstep(uDust[i].z, uDust[i].z * 0.35, length(dd));
    g *= 1.0 - 0.9 * k;
  }
  // sensor noise
  g += (hash12(vUv * uRes + uSeed * 31.7) - 0.5) * 0.035;
  gl_FragColor = vec4(vec3(clamp(g, 0.0, 1.0)), 1.0);
}
`;

const COPY_FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uScan;
uniform vec2 uRes;
uniform float uPeriod;
uniform float uSeed;
varying vec2 vUv;
void main() {
  vec2 px = vUv * uRes;
  float v = 1.0 - texture(uScan, vUv).r;
  v = clamp((v - 0.035) / 0.965, 0.0, 1.0);  // lightest tints drop out
  v = pow(v, 0.9);                           // dot gain: darks close up
  vec2 cell = floor(px);
  float j = (hash12(cell + uSeed) - 0.5) * 0.4 + (vnoise(px * 0.5 + uSeed) - 0.5) * 0.35;
  float cov = halftone(v, px, radians(45.0), uPeriod, j);
  // stray toner specks in the background
  vec2 blk = floor(px / 2.5);
  if (hash12(blk + uSeed * 7.13) > 0.99983) cov = max(cov, 0.95);
  gl_FragColor = vec4(cov, 0.0, 0.0, 1.0);
}
`;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const GENERATIONS = [1, 2, 4, 8];

export class PagePipeline {
  constructor(renderer, contentCanvas) {
    this.renderer = renderer;
    const aniso = renderer.capabilities.getMaxAnisotropy();
    const mkRT = (format) => {
      const rt = new THREE.WebGLRenderTarget(TEX_W, TEX_H, {
        format, type: THREE.UnsignedByteType, depthBuffer: false,
        minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true,
      });
      rt.texture.anisotropy = aniso;
      return rt;
    };
    this.contentTex = new THREE.CanvasTexture(contentCanvas);
    this.contentTex.minFilter = THREE.LinearFilter;
    this.contentTex.generateMipmaps = false;
    this.orig = mkRT(THREE.RGBAFormat);
    this.scan = mkRT(THREE.RGBAFormat);
    this.gens = {};
    for (const g of GENERATIONS) this.gens[g] = mkRT(THREE.RedFormat);
    this.tmp = [mkRT(THREE.RedFormat), mkRT(THREE.RedFormat)];

    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    const res = new THREE.Vector2(TEX_W, TEX_H);

    this.sepMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: SEP_FRAG, uniforms: { uContent: { value: this.contentTex }, uRes: { value: res }, uPeriod: { value: 5.6 } } });
    const r = rng(7);
    const dust = [];
    for (let i = 0; i < 28; i++) dust.push(new THREE.Vector3(0.04 + r() * 0.92, 0.04 + r() * 0.92, (0.6 + r() * r() * 3.2) / TEX_W));
    this.scanMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SCAN_FRAG,
      uniforms: { uSrc: { value: null }, uMono: { value: 0 }, uRes: { value: res }, uXf: { value: new THREE.Matrix3() }, uSeed: { value: 0 }, uDust: { value: dust } },
    });
    this.copyMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: COPY_FRAG, uniforms: { uScan: { value: null }, uRes: { value: res }, uPeriod: { value: 4.55 }, uSeed: { value: 0 } } });
  }

  pass(mat, target) {
    this.quad.material = mat;
    const r = this.renderer;
    const prev = r.getRenderTarget();
    r.setRenderTarget(target);
    r.render(this.scene, this.cam);
    r.setRenderTarget(prev);
  }

  // glass uv -> source uv: small rotation about the corner the sheet is pushed into, plus a shift
  placement(gen) {
    const r = rng(100 + gen * 13);
    const ang = (0.18 + r() * 0.22) * (Math.PI / 180) * (r() < 0.5 ? -1 : 1);
    const du = -(0.4 + r() * 0.5) / 210, dv = (0.5 + r() * 0.6) / 297; // sheet sits a little in from the corner
    const aspect = 29.7 / 21;
    // work in cm-like space so the rotation is not skewed by the page aspect
    const m = new THREE.Matrix3();
    const c = Math.cos(ang), s = Math.sin(ang);
    // uv -> (x, y) with y scaled by aspect, rotate around top-left corner (0,1), back to uv
    const toCm = new THREE.Matrix3().set(1, 0, 0, 0, aspect, -aspect, 0, 0, 1); // y' = aspect*(y-1)
    const rot = new THREE.Matrix3().set(c, -s, 0, s, c, 0, 0, 0, 1);
    const back = new THREE.Matrix3().set(1, 0, du, 0, 1 / aspect, 1 + dv, 0, 0, 1);
    m.multiplyMatrices(back, rot).multiply(toCm);
    return m;
  }

  run() {
    this.contentTex.needsUpdate = true;
    this.pass(this.sepMat, this.orig);
    let src = this.orig, mono = 0, ping = 0;
    const maxGen = Math.max(...GENERATIONS);
    for (let g = 1; g <= maxGen; g++) {
      this.scanMat.uniforms.uSrc.value = src.texture;
      this.scanMat.uniforms.uMono.value = mono;
      this.scanMat.uniforms.uXf.value = this.placement(g);
      this.scanMat.uniforms.uSeed.value = g * 1.37;
      this.pass(this.scanMat, this.scan);
      if (g === 1) this.scan1 = this.readScan(); // what the sensor sent for the first copy
      const dst = this.gens[g] || this.tmp[ping];
      if (!this.gens[g]) ping ^= 1;
      this.copyMat.uniforms.uScan.value = this.scan.texture;
      this.copyMat.uniforms.uSeed.value = g * 11.3;
      this.pass(this.copyMat, dst);
      src = dst; mono = 1;
    }
  }

  // grey scan of the first copy, downsampled for the sensor read-out panel
  readScan() {
    const W = TEX_W, H = TEX_H;
    const buf = new Uint8Array(W * H * 4);
    this.renderer.readRenderTargetPixels(this.scan, 0, 0, W, H, buf);
    const dw = 384, dh = Math.round(384 * H / W);
    const out = new Uint8ClampedArray(dw * dh);
    for (let y = 0; y < dh; y++) {
      const sy = H - 1 - Math.floor((y + 0.5) * H / dh); // flip: row 0 = page top
      for (let x = 0; x < dw; x++) {
        const sx = Math.floor((x + 0.5) * W / dw);
        out[y * dw + x] = buf[(sy * W + sx) * 4];
      }
    }
    return { w: dw, h: dh, data: out };
  }

  // K coverage of the original for CPU-side effects (laser flicker, toner particles)
  readOriginalK() {
    const W = TEX_W, H = TEX_H;
    const buf = new Uint8Array(W * H * 4);
    this.renderer.readRenderTargetPixels(this.orig, 0, 0, W, H, buf);
    const dw = 420, dh = Math.round(420 * H / W);
    const out = new Float32Array(dw * dh * 4);
    for (let y = 0; y < dh; y++) {
      const sy = H - 1 - Math.floor((y + 0.5) * H / dh);
      for (let x = 0; x < dw; x++) {
        const sx = Math.floor((x + 0.5) * W / dw), i = (sy * W + sx) * 4, o = (y * dw + x) * 4;
        out[o] = buf[i] / 255; out[o + 1] = buf[i + 1] / 255; out[o + 2] = buf[i + 2] / 255; out[o + 3] = buf[i + 3] / 255;
      }
    }
    return { w: dw, h: dh, data: out, sample(u, v, ch) { if (u < 0 || u > 1 || v < 0 || v > 1) return 0; const x = Math.min(dw - 1, (u * dw) | 0), y = Math.min(dh - 1, (v * dh) | 0); return out[(y * dw + x) * 4 + ch]; } };
  }

  texFor(kind) { return kind === 'orig' ? this.orig.texture : this.gens[kind].texture; }
}
