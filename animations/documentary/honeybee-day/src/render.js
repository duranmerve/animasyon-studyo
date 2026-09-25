// Render chain: scene → HDR target (MSAA by tier) → bloom from the bright part only (half/quarter
// resolution) → final pass: bee-eye hexagon mosaic (right of the split), colour grade, filmic tone
// curve, vignette, paper grain (still in video). Quality tiers change pixel budget, MSAA and bloom.
import * as THREE from 'three';
import { G } from './glsl.js';

const FS_QUAD = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

export const TIERS = {
  ultra: { pix: 4.2e6, msaa: 4, bloom: 1, lod: 1 },
  high: { pix: 2.1e6, msaa: 4, bloom: 1, lod: 1 },
  mid: { pix: 1.3e6, msaa: 2, bloom: 1, lod: 0.7 },
  low: { pix: 0.75e6, msaa: 0, bloom: 1, lod: 0.45 },
  min: { pix: 0.42e6, msaa: 0, bloom: 0, lod: 0.28 },
};

export function createRenderer(canvas, { video }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', alpha: false });
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const qScene = new THREE.Scene(); qScene.add(quad);
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qScene, qCam); };

  const opt = { type: THREE.HalfFloatType, depthBuffer: true, colorSpace: THREE.LinearSRGBColorSpace };
  let main = new THREE.WebGLRenderTarget(4, 4, { ...opt, samples: 4 });
  const bA = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const bB = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const cA = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const cB = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });

  const bright = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uTh: { value: 1.0 } },
    vertexShader: FS_QUAD,
    fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform float uTh; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c * smoothstep(uTh, uTh*1.8, l), 1.); }`,
    depthTest: false, depthWrite: false,
  });
  const blur = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: FS_QUAD,
    fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
      void main(){ vec3 s = texture2D(tSrc, vUv).rgb * .227;
        s += (texture2D(tSrc, vUv + uDir*1.385).rgb + texture2D(tSrc, vUv - uDir*1.385).rgb) * .316;
        s += (texture2D(tSrc, vUv + uDir*3.231).rgb + texture2D(tSrc, vUv - uDir*3.231).rgb) * .070;
        gl_FragColor = vec4(s, 1.); }`,
    depthTest: false, depthWrite: false,
  });
  const final = new THREE.ShaderMaterial({
    uniforms: {
      tSrc: { value: null }, tB1: { value: null }, tB2: { value: null },
      uBloom: { value: 0.35 }, uExpo: { value: 1 }, uEye: { value: 0 }, uSplit: G.uSplit, uRes: { value: new THREE.Vector2() },
      uCell: { value: 12 }, uGrain: { value: 0.05 }, uSeed: { value: 0 }, uVig: { value: 0.35 },
      uLift: { value: new THREE.Vector3(0, 0, 0) }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1 },
      uFade: { value: 0 }, uFadeCol: { value: new THREE.Color(0, 0, 0) }, uBars: { value: 0 },
      uFg: { value: 0 }, uFgCol: { value: new THREE.Color('#3e4a2c') }, uFgT: { value: 0 }, uFgSeed: { value: 0 },
    },
    vertexShader: FS_QUAD,
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc, tB1, tB2; uniform float uBloom, uExpo, uEye, uSplit, uCell, uGrain, uSeed, uVig, uSat, uFade, uBars, uFg, uFgT, uFgSeed; uniform vec3 uFgCol;
      uniform vec2 uRes; uniform vec3 uLift, uGain, uFadeCol; varying vec2 vUv;
      float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
      // nearest hexagon centre (pointy-top) in pixel space
      vec4 hexCell(vec2 p, float s){
        vec2 r = vec2(1., 1.7320508); vec2 h = r*.5;
        vec2 a = mod(p, r*s) - h*s; vec2 b = mod(p - h*s, r*s) - h*s;
        vec2 gv = dot(a,a) < dot(b,b) ? a : b;
        return vec4(gv, p - gv);
      }
      // soft blades rising from the bottom edge, far out of focus
      vec4 foreground(vec2 uv){
        float asp = uRes.x / uRes.y; vec2 p = vec2(uv.x * asp, uv.y);
        float a = 0.; vec3 col = uFgCol;
        for (int i = 0; i < 9; i++) {
          float fi = float(i) + uFgSeed * 13.;
          float x0 = h21(vec2(fi, 1.3)) * asp;
          float side = step(.5, h21(vec2(fi, 4.1)));
          x0 = mix(x0 * .28, asp - x0 * .28, side);              // keep them near the corners
          float hgt = .14 + .3 * h21(vec2(fi, 2.7));
          float lean = (h21(vec2(fi, 3.9)) - .5) * .5 + .03 * sin(uFgT * 1.1 + fi);
          float y = p.y;
          float cx = x0 + lean * y * y / hgt;
          float w = .045 * (1. - y / hgt) + .004;
          float d = abs(p.x - cx) - w;
          float blade = (1. - smoothstep(-.02, .035, d)) * step(y, hgt);
          a = max(a, blade * (.75 + .25 * h21(vec2(fi, 8.))));
        }
        // bokeh of flowers in the near grass
        vec3 bk = vec3(0.); float ba = 0.;
        for (int i = 0; i < 7; i++) {
          float fi = float(i) + uFgSeed * 7.;
          vec2 c = vec2(h21(vec2(fi, 5.5)) * asp, .03 + .22 * h21(vec2(fi, 6.6)));
          float r = .035 + .04 * h21(vec2(fi, 7.7));
          float disc = 1. - smoothstep(r * .7, r, length(p - c));
          vec3 fc = h21(vec2(fi, 9.)) < .5 ? vec3(.95, .8, .25) : h21(vec2(fi, 10.)) < .5 ? vec3(.8, .25, .2) : vec3(.55, .6, .95);
          bk += fc * disc * .55; ba = max(ba, disc * .5);
        }
        return vec4(mix(col, bk / max(ba, .001), ba * (1. - a)), max(a, ba));
      }
      vec3 filmic(vec3 x){ x *= uExpo; vec3 a = x*(2.51*x+.03), b = x*(2.43*x+.59)+.14; return clamp(a/b, 0., 1.); }
      void main(){
        vec2 px = vUv * uRes;
        vec3 c = texture2D(tSrc, vUv).rgb;
        float eyeOn = uEye * step(uSplit, vUv.x);
        if (eyeOn > 0.001) {
          float s = uCell;
          vec4 hc = hexCell(px, s);
          vec2 cuv = hc.zw / uRes;
          vec3 m = texture2D(tSrc, cuv).rgb * .4;
          m += texture2D(tSrc, cuv + vec2(s*.3, 0.)/uRes).rgb * .15 + texture2D(tSrc, cuv - vec2(s*.3, 0.)/uRes).rgb * .15;
          m += texture2D(tSrc, cuv + vec2(0., s*.3)/uRes).rgb * .15 + texture2D(tSrc, cuv - vec2(0., s*.3)/uRes).rgb * .15;
          // facet: slightly domed, with a thin dark wall
          vec2 g = hc.xy / s;
          float d = max(abs(g.x)*1.1547 * .5 + abs(g.y) * .5 * 1.1547, abs(g.x)*1.1547) ; // approx hex distance 0..~.58
          float wall = smoothstep(.49, .56, length(g) * 1.02 + .0*d);
          float dome = 1. - dot(g,g)*.6;
          m *= dome * (.93 + .14*h21(hc.zw));
          m = mix(m, m*.25, wall);
          c = mix(c, m, eyeOn);
        }
        if (uFg > .001) { vec4 fg = foreground(vUv); c = mix(c, fg.rgb, fg.a * uFg); }
        vec3 bl = texture2D(tB1, vUv).rgb + texture2D(tB2, vUv).rgb * 1.3;
        c += bl * uBloom;
        c = filmic(c);
        c = pow(c, vec3(1./2.2));
        c = c * uGain + uLift * (1. - c);
        float l = dot(c, vec3(.2126,.7152,.0722));
        c = mix(vec3(l), c, uSat);
        vec2 q = vUv - .5; q.x *= uRes.x/uRes.y;
        c *= 1. - uVig * smoothstep(.35, 1.05, length(q));
        float n = h21(px + uSeed*91.7) + h21(px*1.37 - uSeed*53.1) - 1.;
        c += n * uGrain * (.6 + .4*(1.-l));
        c = mix(c, uFadeCol, uFade);
        float bar = uBars * .5 * (1. - (uRes.x/uRes.y) / 2.35 * (uRes.y/uRes.x) * uRes.x / uRes.y);
        if (vUv.y < uBars || vUv.y > 1. - uBars) c = vec3(0.);
        gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
      }`,
    depthTest: false, depthWrite: false,
  });

  let tier = TIERS.high, W = 4, H = 4;
  function size(w, h) {
    const dpr = window.devicePixelRatio || 1;
    let pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    const k = Math.min(1, Math.sqrt(tier.pix / (pw * ph)));
    pw = Math.max(2, Math.round(pw * k)); ph = Math.max(2, Math.round(ph * k));
    renderer.setPixelRatio(1);
    renderer.setSize(pw, ph, false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    W = pw; H = ph;
    main.setSize(pw, ph);
    const bw = Math.max(2, pw >> 1), bh = Math.max(2, ph >> 1);
    bA.setSize(bw, bh); bB.setSize(bw, bh);
    cA.setSize(Math.max(2, pw >> 3), Math.max(2, ph >> 3)); cB.setSize(Math.max(2, pw >> 3), Math.max(2, ph >> 3));
    final.uniforms.uRes.value.set(pw, ph);
    G.uRes.value.set(pw, ph);
  }
  function setTier(name) {
    tier = TIERS[name];
    if (main.samples !== tier.msaa) { main.dispose(); main = new THREE.WebGLRenderTarget(4, 4, { ...opt, samples: tier.msaa }); }
    { const st = canvas.parentElement; size(st.clientWidth || innerWidth, st.clientHeight || innerHeight); }
  }

  // look = { bloom, th, expo, eye, cell, grain, vig, lift, gain, sat, fade, fadeCol }
  function render(scene, camera, look, seed) {
    renderer.setRenderTarget(main);
    renderer.clear();
    renderer.render(scene, camera);
    const hasBloom = tier.bloom && look.bloom > 0.001;
    if (hasBloom) {
      bright.uniforms.tSrc.value = main.texture; bright.uniforms.uTh.value = look.th ?? 1.0;
      pass(bright, bA);
      blur.uniforms.tSrc.value = bA.texture; blur.uniforms.uDir.value.set(1 / bA.width, 0); pass(blur, bB);
      blur.uniforms.tSrc.value = bB.texture; blur.uniforms.uDir.value.set(0, 1 / bA.height); pass(blur, bA);
      blur.uniforms.tSrc.value = bA.texture; blur.uniforms.uDir.value.set(1 / cA.width, 0); pass(blur, cB);
      blur.uniforms.tSrc.value = cB.texture; blur.uniforms.uDir.value.set(0, 1 / cA.height); pass(blur, cA);
      blur.uniforms.tSrc.value = cA.texture; blur.uniforms.uDir.value.set(2 / cA.width, 0); pass(blur, cB);
      blur.uniforms.tSrc.value = cB.texture; blur.uniforms.uDir.value.set(0, 2 / cA.height); pass(blur, cA);
    }
    const f = final.uniforms;
    f.tSrc.value = main.texture; f.tB1.value = bA.texture; f.tB2.value = cA.texture;
    f.uBloom.value = hasBloom ? look.bloom : 0;
    f.uExpo.value = look.expo ?? 1;
    f.uEye.value = look.eye ?? 0;
    f.uCell.value = (look.cell ?? 11) * H / 900;
    f.uGrain.value = look.grain ?? 0.035;
    f.uSeed.value = seed;
    f.uVig.value = look.vig ?? 0.35;
    f.uLift.value.set(...(look.lift ?? [0, 0, 0]));
    f.uGain.value.set(...(look.gain ?? [1, 1, 1]));
    f.uSat.value = look.sat ?? 1;
    f.uFade.value = look.fade ?? 0;
    f.uFadeCol.value.set(look.fadeCol ?? '#000');
    f.uBars.value = look.bars ?? 0;
    f.uFg.value = look.fg ?? 0; f.uFgT.value = look.fgT ?? 0; f.uFgSeed.value = look.fgSeed ?? 0;
    if (look.fgCol) f.uFgCol.value.set(look.fgCol);
    pass(final, null);
  }
  return { renderer, render, size, setTier, get W() { return W; }, get H() { return H; }, gl: renderer.getContext() };
}
