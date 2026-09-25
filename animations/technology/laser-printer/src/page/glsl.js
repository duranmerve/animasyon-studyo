// Shared GLSL: toner colours, CMYK compositing, halftone screens, noise.
// Coverage textures store per-channel toner coverage (0..1): RGBA = C, M, Y, K for colour prints,
// R = K for black-and-white copies. Colour values here are display (sRGB-like) values.

export const GLSL_COMMON = /* glsl */ `
const vec3 PAPER = vec3(0.968, 0.958, 0.93);
const vec3 TONER_C = vec3(0.0, 0.62, 0.88);
const vec3 TONER_M = vec3(0.88, 0.09, 0.50);
const vec3 TONER_Y = vec3(1.0, 0.90, 0.06);
const vec3 TONER_K = vec3(0.085, 0.085, 0.095);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}

// reflectance of paper carrying the given toner coverage
vec3 composite(vec4 cov) {
  vec3 c = PAPER;
  c *= mix(vec3(1.0), TONER_C, cov.r);
  c *= mix(vec3(1.0), TONER_M, cov.g);
  c *= mix(vec3(1.0), TONER_Y, cov.b);
  c *= mix(vec3(1.0), TONER_K, cov.a);
  return c;
}

// Euclidean-dot screen: spot function in [-1, 1] for pixel position px (pixels),
// screen angle (radians) and period (pixels per cell).
float spotFn(vec2 px, float angle, float period) {
  float c = cos(angle), s = sin(angle);
  vec2 q = vec2(c * px.x - s * px.y, s * px.x + c * px.y) * (6.2831853 / period);
  return 0.5 * (cos(q.x) + cos(q.y));
}
// amplitude-modulated halftone: returns toner coverage for requested tone v
float halftone(float v, vec2 px, float angle, float period, float jitter) {
  if (v < 0.004) return 0.0;
  if (v > 0.996) return 1.0;
  float spot = spotFn(px, angle, period);
  float T = 1.0 - 2.0 * v + jitter;
  return smoothstep(T - 0.16, T + 0.16, spot);
}
`;
