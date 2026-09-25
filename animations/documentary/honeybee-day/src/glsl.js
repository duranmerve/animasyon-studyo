// Shared shader code and the one material family of the film: soft three-step ramp shading,
// hemisphere ambient, rim light, aerial fog, and the "bee view" (what a honeybee sees:
// red goes dark, ultraviolet shows up as the violet accent). Everything reads the global
// uniforms in G, which the director sets once per frame.
import * as THREE from 'three';

export const G = {
  uT: { value: 0 },                        // story time (wind, flutter: pure function of time)
  uSunDir: { value: new THREE.Vector3(0.4, 0.5, 0.3).normalize() },
  uSunCol: { value: new THREE.Color(1, 0.95, 0.85) },
  uSkyAmb: { value: new THREE.Color(0.55, 0.62, 0.7) },
  uGndAmb: { value: new THREE.Color(0.3, 0.28, 0.2) },
  uFogCol: { value: new THREE.Color(0.85, 0.88, 0.9) },
  uFogDen: { value: 0.0006 },
  uFogStart: { value: 0 },
  uBee: { value: 0 },                      // 0 = our eyes, 1 = bee eyes
  uSplit: { value: 0 },                    // bee view applies right of this screen x (0..1)
  uRes: { value: new THREE.Vector2(1600, 900) },
  uRimCol: { value: new THREE.Color(1, 0.9, 0.75) },
  uRim: { value: 0.35 },
  uWind: { value: 1 },
  uDark: { value: 0 },                     // hive darkness: ambient falls to almost nothing
  uUV: { value: new THREE.Color('#8B5CF6') },
  uCloudSh: { value: 0 },
};

export const COMMON = /* glsl */`
uniform float uT; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uSkyAmb; uniform vec3 uGndAmb;
uniform vec3 uFogCol; uniform float uFogDen; uniform float uFogStart; uniform float uBee; uniform float uSplit; uniform vec2 uRes;
uniform vec3 uRimCol; uniform float uRim; uniform float uWind; uniform float uDark; uniform vec3 uUV; uniform float uCloudSh;
float hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,3.7); a*=.5; } return s/.9375; }
#define beeAmt() (uBee * step(uSplit, gl_FragCoord.x / uRes.x))
// how a colour looks to a bee: no red receptor; green and blue kept, ultraviolet reflectance -> violet
vec3 beeColor(vec3 c, float uvRefl){
  vec3 b = vec3(c.r*.12 + c.g*.16, c.g*.78 + c.b*.08, c.b*.95 + c.g*.05);
  return mix(b, uUV*1.15, clamp(uvRefl,0.,1.));
}
float ramp(float ndl){ return smoothstep(-.03, .1, ndl)*.5 + smoothstep(.28, .5, ndl)*.5; }
vec3 shade(vec3 base, vec3 N, vec3 V, float ao, float rimK){
  float r = ramp(dot(N, uSunDir));
  vec3 amb = mix(uGndAmb, uSkyAmb, N.y*.5+.5) * mix(1., .08, uDark);
  vec3 col = base * (amb*ao + uSunCol*r);
  float rim = pow(1. - max(dot(N, V), 0.), 3.);
  col += uRimCol * rim * rimK * uRim * (.35 + .65*ao);
  return col;
}
float cloudShade(vec3 w){ if (uCloudSh <= 0.) return 1.; float n = fbm(w.xz * .00035 + vec2(uT * .018, uT * .007)); return mix(1., .62, uCloudSh * smoothstep(.45, .62, n)); }
vec3 fogIt(vec3 col, float dist){
  float f = clamp(1. - exp(-max(0., dist - uFogStart) * uFogDen), 0., 1.);
  // aerial perspective: saturation and contrast fall with distance first, then the haze;
  // the far layer is dimmed, never erased (at most 78% haze)
  float l = dot(col, vec3(.3, .59, .11));
  col = mix(col, vec3(l), f * .55);
  col = mix(col, vec3(dot(uFogCol, vec3(.3,.59,.11))) * .5 + col * .5, f * .3);
  return mix(col, uFogCol, f * .78);
}
`;

// generic toon material. opts: color, beeColor (or uv reflectance), rim, instanced colours, wind sway
export function toon(opts = {}) {
  const u = {
    ...G,
    uCol: { value: new THREE.Color(opts.color ?? '#888') },
    uUVr: { value: opts.uv ?? 0 },
    uRimK: { value: opts.rim ?? 1 },
    uEmit: { value: new THREE.Color(opts.emit ?? '#000') },
    uSway: { value: opts.sway ?? 0 },
    uAlpha: { value: opts.alpha ?? 1 },
  };
  if (opts.beeColor) u.uBeeCol = { value: new THREE.Color(opts.beeColor) };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      ${COMMON}
      uniform float uSway;
      varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vH;
      #ifdef USE_INSTANCING_COLOR
      #else
      #endif
      void main(){
        vec3 p = position;
        vH = uv.y;
        #ifdef USE_INSTANCING
          mat4 im = instanceMatrix;
        #else
          mat4 im = mat4(1.);
        #endif
        vec4 w = modelMatrix * im * vec4(p, 1.);
        if (uSway > 0.) {
          float k = uSway * uv.y * uv.y;
          float ph = w.x*.013 + w.z*.017;
          w.x += k * uWind * (sin(uT*1.3 + ph) + .45*sin(uT*2.9 + ph*2.3));
          w.z += k * uWind * .6 * cos(uT*1.1 + ph*1.7);
        }
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * mat3(im) * normal);
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #else
          vC = vec3(1.);
        #endif
        #ifdef USE_COLOR
          vC *= color;
        #endif
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      ${COMMON}
      uniform vec3 uCol; uniform float uUVr; uniform float uRimK; uniform vec3 uEmit; uniform float uAlpha;
      ${opts.beeColor ? 'uniform vec3 uBeeCol;' : ''}
      varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vH;
      void main(){
        if (uAlpha < .99) { float d = hash21(floor(gl_FragCoord.xy)); if (d > uAlpha) discard; }
        vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
        if (!gl_FrontFacing) N = -N;
        vec3 base = uCol * vC;
        ${opts.mottle ? 'float mt = fbm(vW.xz * ' + opts.mottle.toFixed(4) + ' + vW.y * ' + (opts.mottle * 1.3).toFixed(4) + '); base *= .5 + .9 * mt; float gaps = smoothstep(.28, .22, mt);' : 'float gaps = 0.;'}
        ${opts.beeColor ? 'vec3 bc = uBeeCol * vC;' : 'vec3 bc = beeColor(base, uUVr);'}
        base = mix(base, bc, beeAmt());
        float ao = ${opts.aoByHeight ? 'mix(.45, 1., smoothstep(0., .8, vH))' : '1.'};
        ${opts.flat ? 'vec3 col = base * mix(uGndAmb * .8, uSkyAmb * .75 + uSunCol * .12, N.y * .5 + .5) * (1. - gaps*.4);' : 'vec3 col = (shade(base, N, V, ao * (1. - gaps*.5), uRimK) + uEmit) * cloudShade(vW);'}
        col = fogIt(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.);
      }`,
    side: opts.side ?? THREE.FrontSide,
    vertexColors: !!opts.vertexColors,
  });
  return m;
}
