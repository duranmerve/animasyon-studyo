// Bird's-eye country around the tree, in metres (map north = -Z, east = +X). A pale painted land:
// field parcels (Voronoi), woods, a stream, hedges. The nest is at the origin; the meadow lies
// 1.5 km away at bearing 210° (SSW) — 40° right of the noon sun, as the dance will say.
import * as THREE from 'three';
import { G, COMMON } from './glsl.js';

export const MEADOW_BEARING = 210, MEADOW_DIST = 1500;
export const meadowAt = () => {
  const a = MEADOW_BEARING * Math.PI / 180;
  return new THREE.Vector3(Math.sin(a) * MEADOW_DIST, 0, -Math.cos(a) * MEADOW_DIST);
};

export function createMapSet() {
  const set = new THREE.Group();
  const m = meadowAt();
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...G, uMeadow: { value: new THREE.Vector2(m.x, m.z) }, uFlow: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`${COMMON}
      uniform vec2 uMeadow; varying vec3 vW;
      vec3 vor(vec2 q){ vec2 ip = floor(q), fp = fract(q); float F1 = 9., F2 = 9.; vec2 id = vec2(0.);
        for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(float(i),float(j)); vec2 o = vec2(hash21(ip+g), hash21(ip+g+7.1));
          float d = length(g + o - fp); if (d < F1) { F2 = F1; F1 = d; id = ip + g; } else if (d < F2) F2 = d; }
        return vec3(F2 - F1, hash21(id), hash21(id + 3.3)); }
      void main(){
        vec2 p = vW.xz;
        vec3 f = vor(p / 140. + vec2(fbm(p*.004), fbm(p*.004+5.))*.6);
        // parcels: sage, pale wheat, fallow, meadow greens
        vec3 c1 = vec3(.42,.48,.3), c2 = vec3(.6,.55,.36), c3 = vec3(.36,.43,.27), c4 = vec3(.52,.47,.32);
        vec3 col = f.y < .3 ? c1 : f.y < .55 ? c2 : f.y < .8 ? c3 : c4;
        // furrows inside ploughed parcels
        float ang = f.z * 3.14;
        float furrow = sin(dot(p, vec2(cos(ang), sin(ang))) * .9) * .5 + .5;
        col *= .94 + .06 * furrow * step(.55, f.y);
        col *= .92 + .12 * fbm(p * .02);
        // hedges along the parcel borders
        float hedge = smoothstep(.06, .02, f.x) * step(.4, fbm(p*.01 + 2.));
        col = mix(col, vec3(.18,.25,.14), hedge * .9);
        // woods
        float wood = smoothstep(.64, .67, fbm(p * .0022 + 11.));
        float crowns = vnoise(p * .12) * .6 + vnoise(p * .31) * .4;
        col = mix(col, vec3(.16,.22,.14) * (.75 + .5 * crowns), wood);
        // a stream
        float sx = p.x - (sin(p.y * .0021) * 380. + sin(p.y * .0057 + 1.) * 90. + 900.);
        float stream = smoothstep(7., 3., abs(sx));
        col = mix(col, vec3(.55,.68,.74), stream);
        col = mix(col, vec3(.4,.5,.36), smoothstep(22., 8., abs(sx)) * (1. - stream) * .5);
        // the flowering meadow
        float md = length(p - uMeadow);
        float mead = smoothstep(260., 200., md + (fbm(p*.01) - .5) * 80.);
        float dots = step(.72, vnoise(p * .9)) * mead;
        col = mix(col, vec3(.6,.72,.45), mead * .7);
        col = mix(col, vec3(.95,.82,.3), dots * .7);
        // soft paper light from the north-west, and a vignette of haze
        col *= .9 + .1 * vnoise(p * .5);
        col = mix(col, uFogCol, .06);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), mat);
  ground.rotation.x = -Math.PI / 2;
  set.add(ground);
  // the linden, seen from above: a dark crown
  const crown = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: '#2f3d28' }));
  crown.rotation.x = -Math.PI / 2; crown.position.y = 0.5; set.add(crown);
  set.userData = { mat };
  return set;
}
