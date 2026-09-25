// Magnifier: renders a circular close-up of a simulated sheet straight from its coverage texture.
import * as THREE from 'three';
import { GLSL_COMMON } from '../page/glsl.js';

const FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uTex; uniform float uMono; uniform vec2 uCenter; uniform float uSpan; uniform float uFull;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  vec2 cm = p * uSpan * 0.5;
  vec2 pg = uCenter + vec2(cm.x / 21.0, -cm.y / 29.7);
  vec3 col;
  if (pg.x < 0.0 || pg.x > 1.0 || pg.y < 0.0 || pg.y > 1.0) col = vec3(0.84, 0.82, 0.78);
  else {
    vec4 s = texture(uTex, vec2(pg.x, 1.0 - pg.y));
    vec4 cov = uMono > 0.5 ? vec4(0.0, 0.0, 0.0, s.r) : s;
    col = composite(cov);
    col *= 0.965 + 0.035 * fbm(pg * vec2(900.0, 1270.0));
  }
  col *= 1.0 - 0.18 * smoothstep(0.75, 1.0, r);
  gl_FragColor = vec4(col, 1.0);
}`;

export class LoupeRenderer {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FRAG,
      uniforms: { uTex: { value: null }, uMono: { value: 0 }, uCenter: { value: new THREE.Vector2() }, uSpan: { value: 1 }, uFull: { value: 1 } },
      depthTest: false, depthWrite: false,
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    q.frustumCulled = false;
    this.scene.add(q);
  }
  // x, y: top-left in CSS pixels; size: diameter in CSS pixels
  draw(renderer, x, y, size, tex, mono, u, v, span) {
    const H = renderer.domElement.clientHeight;
    const gy = H - y - size;
    this.mat.uniforms.uTex.value = tex; this.mat.uniforms.uMono.value = mono ? 1 : 0;
    this.mat.uniforms.uCenter.value.set(u, v); this.mat.uniforms.uSpan.value = span;
    renderer.setViewport(x, gy, size, size);
    renderer.setScissor(x, gy, size, size);
    renderer.setScissorTest(true);
    renderer.render(this.scene, this.cam);
    renderer.setScissorTest(false);
  }
}
