// Sky dome that follows the camera: gradient by hour, sun disc and glow, drifting clouds, two
// distant ridges (hills and a tree line) painted into the dome, stars at night, and, for the
// bee's eye, the polarisation pattern of the sky: rings around the sun, strongest 90° away.
import * as THREE from 'three';
import { G, COMMON } from './glsl.js';

export function createSky() {
  const u = {
    ...G,
    uZen: { value: new THREE.Color('#9FBCD3') }, uHor: { value: new THREE.Color('#E6ECEF') },
    uGlow: { value: new THREE.Color('#fff1d8') }, uGlowK: { value: 0.6 }, uDisc: { value: 1 },
    uCloud: { value: 0.35 }, uCloudCol: { value: new THREE.Color('#ffffff') }, uCloudShade: { value: new THREE.Color('#aab4c0') },
    uRidgeA: { value: new THREE.Color('#9fb0b8') }, uRidgeB: { value: new THREE.Color('#6f7f72') }, uGround: { value: new THREE.Color('#7d8a6a') },
    uRidgeH: { value: 1 }, uStars: { value: 0 }, uPol: { value: 0 }, uHaze: { value: 0.5 }, uSeedAz: { value: 0 },
    uCloudOver: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      ${COMMON}
      uniform vec3 uZen, uHor, uGlow, uCloudCol, uCloudShade, uRidgeA, uRidgeB, uGround;
      uniform float uGlowK, uDisc, uCloud, uRidgeH, uStars, uPol, uHaze, uSeedAz, uCloudOver;
      varying vec3 vD;
      float ridge(float az, float base, float amp, float fr, float seed){
        return base + amp * (fbm(vec2(az*fr + seed, seed)) - .5) + amp*.35*(vnoise(vec2(az*fr*7. + seed, 1.)) - .5);
      }
      void main(){
        vec3 d = normalize(vD);
        float el = d.y;
        float az = atan(d.x, -d.z) + uSeedAz;
        float sd = max(dot(d, uSunDir), 0.);
        // gradient
        float t = pow(clamp(el, 0., 1.), .55);
        vec3 col = mix(uHor, uZen, t);
        col += uGlow * uGlowK * (pow(sd, 6.) * .55 + pow(sd, 48.) * .8 + pow(sd, 2.) * .3 * (1. - t));
        // clouds on a plane above
        float cl = 0.;
        if (el > 0.) {
          vec2 cp = d.xz / (el + .12) * 1.4 + vec2(uT*.004, uT*.0015);
          float n = fbm(cp) * .7 + fbm(cp*3.1 + 4.) * .3;
          cl = smoothstep(1. - uCloud, 1.08 - uCloud*.6, n) * smoothstep(0., .25, el);
          vec3 cc = mix(uCloudShade, uCloudCol, smoothstep(.3, .9, fbm(cp*2. + uSunDir.xz*1.5)));
          cc += uGlow * pow(sd, 8.) * .6;
          col = mix(col, cc, cl * .9);
        }
        // sun disc (hidden behind cloud cover)
        float disc = smoothstep(.9994, .99975, sd) * uDisc * (1. - uCloudOver);
        col += uGlow * disc * 6.;
        col = mix(col, mix(uCloudShade, uCloudCol, .5 + .5*sd), uCloudOver * smoothstep(.95, .999, sd) * .85);
        // stars
        if (uStars > 0.) {
          vec3 q = d * 260.;
          vec3 cell = floor(q);
          float h = hash21(cell.xy + cell.z*17.3);
          float st = step(.985, h) * smoothstep(.45, 0., length(fract(q) - .5));
          col += vec3(.85,.9,1.) * st * uStars * smoothstep(0., .15, el) * (.5 + .5*hash21(cell.yz));
        }
        // bee view of the sky: ultraviolet-rich, then the polarisation rings
        float bee = beeAmt();
        col = mix(col, beeColor(col, .28 + .3*t), bee);
        float ang = acos(clamp(dot(d, uSunDir), -1., 1.));
        float degree = pow(sin(ang), 2.) / (1. + pow(cos(ang), 2.));
        vec3 ax = normalize(uSunDir);
        vec3 tA = normalize(cross(ax, abs(ax.y) < .95 ? vec3(0,1,0) : vec3(1,0,0)));
        vec3 tB = cross(ax, tA);
        float phi = atan(dot(d, tB), dot(d, tA));
        float ring = abs(fract(ang * 5.) - .5);
        float line = smoothstep(.2, .1, ring);
        float dash = smoothstep(.1, .25, abs(fract(phi * 10. / 6.2831 * (1. + floor(ang*9.)*.35)) - .5));
        float pol = line * mix(1., dash, .25) * degree * uPol * smoothstep(-.02, .06, el) * (1. - cl * .92);
        col = mix(col, vec3(.85,.75,1.) * 1.6, pol);
        // distant hills and tree line, then the ground below the horizon
        float hA = ridge(az, .035 * uRidgeH, .05 * uRidgeH, .9, 3.);
        float hB = ridge(az, .012 * uRidgeH, .035 * uRidgeH, 1.7, 11.);
        float treeTex = vnoise(vec2(az*260., el*420.));
        vec3 ra = mix(uRidgeA, col, .35 * uHaze);
        vec3 rb = uRidgeB * (.85 + .3*treeTex);
        ra = mix(ra, beeColor(ra, 0.), bee);
        rb = mix(rb, beeColor(rb, 0.), bee);
        col = mix(col, ra, smoothstep(hA + .002, hA - .002, el));
        col = mix(col, rb, smoothstep(hB + .002, hB - .002, el));
        vec3 g = mix(uGround, uHor, .55 * uHaze);
        g = mix(g, beeColor(g, 0.), bee);
        col = mix(col, g, smoothstep(.001, -.004, el));
        gl_FragColor = vec4(col, 1.);
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  mesh.onBeforeRender = (r, s, cam) => { mesh.position.copy(cam.position); mesh.scale.setScalar(cam.far * 0.9); mesh.updateMatrixWorld(); };
  return { mesh, u };
}
