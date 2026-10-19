// The cyanotype plate: one full-screen fragment shader. Every scene is an "exposure field" (how much light
// fell on the plate at each point) built from a few procedural objects; the shader tones that exposure into
// Prussian blue emulsion on cream paper, adds the single accent (fusion orange) and composites the white
// pencil overlay (a 2D canvas uploaded as a texture).

export const OBJ = { STAR: 1, SECTION: 2, NEBULA: 3, SHOCK: 4, GIANT: 5, CRAB: 6, HOLE: 7, CLOUD: 8, GALAXY: 9 };
export const MAX_OBJ = 8;

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 frag;
uniform vec2 uRes;          // buffer px
uniform float uU;           // world unit in buffer px (zoom 1)
uniform vec4 uCam[2];       // x, y, zoom, plate seed
uniform vec4 uObj[${2 * MAX_OBJ * 3}];
uniform vec4 uPl[2];        // starAmt, gain, emulsion density, wash (lighter brush)
uniform vec4 uPl2[2];       // burn (bleach), split x (world), split offset (right half repeats the left sky), vignette
uniform vec4 uSlide;        // boundary px, active, shadow, -
uniform vec4 uFx;           // grain seed, grain amount, octaves, time
uniform sampler2D uOver;

const vec3 INK = vec3(0.031, 0.102, 0.200);
const vec3 PRU = vec3(0.071, 0.227, 0.420);
const vec3 MID = vec3(0.435, 0.612, 0.761);
const vec3 WHT = vec3(0.863, 0.922, 0.949);
const vec3 PAP = vec3(0.937, 0.902, 0.824);
const vec3 ORA = vec3(1.000, 0.416, 0.169);

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; int oct = int(uFx.z);
  for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3; a *= 0.5; }
  return s; }
float ridge(vec2 p){ float s = 0.0, a = 0.5; int oct = int(uFx.z);
  for (int i = 0; i < 6; i++) { if (i >= oct) break; float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0); s += a * n * n; p = mat2(1.7, 1.1, -1.1, 1.7) * p + 3.1; a *= 0.5; }
  return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// photographic star images: round discs with halation, size by brightness
float starLayer(vec2 p, float cell, float prob, float seed, float px){
  vec2 g = p / cell; vec2 id = floor(g); vec2 f = fract(g);
  float h = h21(id + seed);
  if (h > prob) return 0.0;
  float b = pow(h21(id * 1.7 + seed + 3.1), 5.0);
  vec2 c = vec2(0.3) + 0.4 * vec2(h21(id + 11.0 + seed), h21(id + 23.0 + seed));
  float d = length(f - c) * cell;
  float rs = max(px * 1.1, cell * (0.012 + 0.05 * b));
  return (0.35 + 1.6 * b) * exp(-d * d / (rs * rs)) + b * 0.22 * exp(-d / (rs * 1.8)) * smoothstep(cell * 0.28, cell * 0.12, d);
}
float stars(vec2 p, float seed, float px){
  return starLayer(p, 0.028, 0.32, seed, px) * 0.55 + starLayer(p + 0.37, 0.085, 0.42, seed + 5.0, px) + starLayer(p + 1.3, 0.21, 0.35, seed + 9.0, px) * 1.3;
}

vec2 field(int pl, vec2 w, float px){
  float E = 0.0, A = 0.0, mask = 1.0, absorb = 0.0;
  vec4 cam = uCam[pl];
  float split = uPl2[pl].y;
  float side = sign(w.x - split);
  // before/after plates: the right half shows the same patch of sky as the left
  if (uPl2[pl].z != 0.0 && w.x > split) w.x -= uPl2[pl].z;
  vec2 ws = w;
  int base = pl * ${MAX_OBJ * 3};
  // pass 1: gravitational lenses bend the star field and hide what is behind the horizon
  for (int i = 0; i < ${MAX_OBJ}; i++) {
    vec4 a = uObj[base + i * 3];
    if (a.x != 7.0) continue;
    vec2 d = w - a.yz; float r = length(d) + 1e-5;
    ws = w + d / r * (a.w * a.w * 1.5 / r);
    mask *= smoothstep(a.w * 0.97, a.w * 1.04, r);
  }
  // sky: star positions in world space, parallax capped so deep zooms don't blow stars up
  float k = min(cam.z, 3.0) / cam.z;
  vec2 sp = cam.xy + (ws - cam.xy) * k;
  if (uPl[pl].x > 0.0) E += uPl[pl].x * stars(sp, cam.w, px * k);

  for (int i = 0; i < ${MAX_OBJ}; i++) {
    vec4 a = uObj[base + i * 3], b = uObj[base + i * 3 + 1], c = uObj[base + i * 3 + 2];
    float t = a.x;
    if (t == 0.0) continue;
    // objects tagged for one half of a split plate (before/after comparison)
    if (c.w != 0.0 && side != c.w) continue;
    vec2 q = w - a.yz; float r = a.w; float d = length(q) / r;
    float aa = px / r * 1.5;
    if (t == 1.0) {               // STAR: bright, accent, granulation, seed | halo, flicker, -, side
      if (d > 9.0) continue;
      float disk = smoothstep(1.0 + aa, 1.0 - aa, d);
      float mu = sqrt(max(0.0, 1.0 - d * d));
      float g = b.z > 0.0 ? fbm(q / r * b.z + b.w) : 0.5;
      float I = b.x * (0.62 + 0.38 * mu) * (0.8 + 0.4 * g) * (1.0 + c.y * (vnoise(vec2(uFx.w * 3.0, b.w)) - 0.5));
      float halo = b.x * c.x * (0.5 * exp(-(d - 1.0) * 2.2) + 0.25 / (1.0 + (d - 1.0) * (d - 1.0) * 6.0));
      E += disk * I + (1.0 - disk) * halo;
      A += b.y * (disk * (0.55 + 0.45 * mu) + (1.0 - disk) * 0.6 * exp(-(d - 1.0) * 3.0));
    } else if (t == 2.0) {        // SECTION: layers, core accent, iron core, seed | bright, ring scale, -, -
      if (d > 3.0) continue;
      float disk = smoothstep(1.0 + aa, 1.0 - aa, d);
      float R[7] = float[7](1.0, 0.62, 0.45, 0.33, 0.24, 0.16, 0.09);
      float band = 0.0;
      for (int k = 1; k < 7; k++) { float kk = float(k); if (kk > b.x) break; if (d < R[k]) band = kk; }
      float conv = fbm(q / r * 7.0 + b.w);
      float outer = 1.0 - step(0.5, band);
      float I = 0.38 + 0.42 * (1.0 - d) + 0.10 * mod(band, 2.0) + 0.05 * band / 6.0;
      I *= mix(1.0, 0.75 + 0.5 * conv, outer * (0.6 + 0.4 * smoothstep(0.62, 1.0, d)));
      I *= c.x;
      float fe = b.z;             // iron core: unexposed (ash, gives no light)
      float feMask = fe > 0.0 ? smoothstep(fe * 1.0, fe * 0.92, d) : 0.0;
      E += disk * I * (1.0 - feMask * 0.94) + (1.0 - disk) * c.x * 0.16 * exp(-(d - 1.0) * 4.0);
      float core = exp(-d * d / (0.018 + 0.03 * c.y));
      A += b.y * disk * core * (1.0 - feMask) + b.y * 0.25 * disk * exp(-d * 4.0) * (1.0 - feMask);
      // the shell around a dying iron core still flickers orange
      A += fe > 0.0 ? b.y * 0.8 * exp(-pow((d - fe * 1.15) / (fe * 0.25), 2.0)) * disk : 0.0;
    } else if (t == 3.0) {        // NEBULA: width, bright, warp, seed | lobe, inner, accent, side
      if (d > 2.4) continue;
      vec2 p = q / r; p *= vec2(1.0 - c.x * 0.3, 1.0 + c.x * 0.15);
      vec2 wq = p + b.z * (vec2(fbm(p * 2.6 + b.w), fbm(p * 2.6 + b.w + 7.7)) - 0.5);
      float dd = length(wq);
      float shell = exp(-pow((dd - 1.0) / b.x, 2.0));
      float fil = ridge(wq * 4.0 + b.w);
      float inner = c.y * smoothstep(1.05, 0.0, dd) * (0.35 + 0.65 * fbm(wq * 3.0 + b.w + 2.0));
      E += b.y * (shell * (0.45 + 0.9 * fil) + inner * 0.55);
      A += c.z * shell * fil;
    } else if (t == 4.0) {        // SHOCK: flood, ring, burn edge, seed
      vec2 p = q / r;
      float n = fbm(p * 3.0 + b.w);
      float dd = length(p) * (0.9 + 0.2 * n);
      E += b.x * (1.4 * exp(-dd * dd * 1.6) + 0.4 / (1.0 + dd * dd * 3.0));
      float ring = exp(-pow((dd - 1.0) / 0.045, 2.0));
      float fil = ridge(p * 5.0 + b.w);
      E += b.y * ring * (0.4 + n);
      // the burn: an uneven scorched fringe, strongest where the filaments are
      A += b.z * ring * fil * (0.6 + n) + b.z * 0.12 * exp(-pow((dd - 1.0) / 0.22, 2.0));
    } else if (t == 5.0) {        // GIANT: bright, cells, soft edge, seed
      if (d > 3.0) continue;
      float ang = atan(q.y, q.x);
      float edge = d + b.z * (fbm(vec2(ang * 3.0, uFx.w * 0.05) + b.w) - 0.5);
      float disk = smoothstep(1.0 + b.z * 0.5, 1.0 - b.z * 0.5, edge);
      float mu = sqrt(max(0.0, 1.0 - d * d));
      float cells = fbm(q / r * b.y + b.w + uFx.w * 0.01);
      E += b.x * disk * (0.45 + 0.35 * mu) * (0.55 + 0.9 * cells) + b.x * 0.18 * exp(-max(edge - 1.0, 0.0) * 5.0) * (1.0 - disk);
    } else if (t == 6.0) {        // CRAB: bright, seed, rot, accent
      if (d > 1.8) continue;
      vec2 p = rot(b.z) * (q / r); p.x *= 0.72;
      vec2 wq = p + 0.35 * (vec2(fbm(p * 2.0 + b.y), fbm(p * 2.0 + b.y + 4.0)) - 0.5);
      float dd = length(wq);
      float body = smoothstep(1.0, 0.25, dd);
      float fil = ridge(wq * 5.0 + b.y);
      E += b.x * body * (0.18 + 0.4 * fbm(wq * 3.0 + b.y) + 1.1 * fil * smoothstep(0.15, 0.8, dd));
      A += b.w * body * fil * 0.5;
    } else if (t == 7.0) {        // HOLE: photon ring
      E += b.x * exp(-pow((d - 1.5) / 0.07, 2.0)) * 0.8;
    } else if (t == 8.0) {        // CLOUD: density, glow, seed, collapse
      if (d > 2.0) continue;
      vec2 p = q / r * (1.0 + b.w * 0.0);
      vec2 wq = p + 0.6 * (vec2(fbm(p * 1.8 + b.z), fbm(p * 1.8 + b.z + 5.0)) - 0.5);
      float dd = length(wq);
      float dens = smoothstep(1.0, 0.1, dd) * (0.4 + 0.9 * fbm(wq * 3.5 + b.z));
      absorb = max(absorb, dens * b.x);
      E += b.y * dens * smoothstep(0.2, 0.9, dd) * fbm(wq * 6.0 + b.z + 1.0);
    } else if (t == 9.0) {        // GALAXY: bright, seed, elong, rot
      if (d > 1.6) continue;
      vec2 p = rot(b.w) * (q / r); p.x /= max(0.3, b.z);
      float dd = length(p + 0.25 * (vec2(fbm(p * 2.0 + b.y), fbm(p * 2.0 + b.y + 3.0)) - 0.5));
      float body = smoothstep(1.0, 0.0, dd);
      E += b.x * body * (0.25 * fbm(p * 4.0 + b.y) + 0.6 * starLayer(q, 0.006, 0.5, b.y, px));
    }
  }
  E *= uPl[pl].y;
  E = E * (1.0 - absorb * 0.92);
  return vec2(E * mask, A * mask);
}

// Prussian-blue emulsion on paper. Returns color; edge = 1 inside the coated area.
vec3 plate(int pl, vec2 sp, vec2 sz, vec2 E, out float coat){
  float m = 0.028 * min(sz.x, sz.y);
  vec2 dEdge = min(sp, sz - sp);
  float edgeD = min(dEdge.x, dEdge.y);
  // brush-coated edge: ragged along the border, streaked across
  float along = dEdge.x < dEdge.y ? sp.y : sp.x;
  float al = along / sz.y;
  float rag = m * (0.5 + 0.8 * vnoise(vec2(al * 9.0, float(pl) + uCam[pl].w)) + 0.35 * vnoise(vec2(al * 31.0, 3.0)) + 0.12 * vnoise(vec2(al * 120.0, 5.0)));
  coat = smoothstep(rag - 1.2, rag + 1.8, edgeD);
  vec2 u = sp / sz.y;
  float dens = uPl[pl].z;
  // brush marks: long, slightly diagonal strokes of uneven coating (not scanlines)
  vec2 bu = mat2(0.99, -0.12, 0.12, 0.99) * u;
  float brush = vnoise(vec2(bu.x * 0.9, bu.y * 14.0) + uCam[pl].w) * 0.65 + vnoise(vec2(bu.x * 2.2, bu.y * 34.0)) * 0.35;
  float cloud = fbm(u * 2.2 + uCam[pl].w * 3.0);
  float wash = uPl[pl].w;
  float density = clamp(dens * (0.86 + 0.18 * cloud + 0.045 * brush) - wash * smoothstep(0.35, 0.8, cloud), 0.0, 1.2);
  // dry-brush zone near the edge: thinner coat
  density *= mix(0.55 + 0.35 * brush, 1.0, smoothstep(rag, rag + m * 1.6, edgeD));
  vec3 base = mix(MID * 0.9, PRU, smoothstep(0.35, 0.85, density));
  base = mix(base, INK, smoothstep(0.9, 1.15, density));
  // exposure → tone (photographic shoulder)
  float D = 1.0 - exp(-1.5 * max(E.x, 0.0));
  vec3 col = mix(base, MID, smoothstep(0.0, 0.55, D));
  col = mix(col, WHT, smoothstep(0.42, 0.93, D));
  // overexposure bleaches the plate back to bare paper
  float bleach = smoothstep(1.3, 2.6, E.x) + uPl2[pl].x;
  col = mix(col, PAP * 1.02, clamp(bleach, 0.0, 1.0));
  float acc = clamp(E.y, 0.0, 1.5);
  col = mix(col, ORA, clamp(acc, 0.0, 1.0) * 0.88);
  col += ORA * 0.22 * acc * acc;
  // bare paper outside the coat, with fibres
  float fib = vnoise(vec2(sp.x * 0.9, sp.y * 0.12)) * 0.5 + vnoise(sp * 0.35) * 0.5;
  vec3 paper = PAP * (0.94 + 0.06 * fib) - vec3(0.0, 0.01, 0.03) * vnoise(sp * 0.02);
  // a faint blue bleed where the coat ends
  paper = mix(paper, MID, 0.18 * smoothstep(rag + m * 0.8, rag, edgeD) * (1.0 - coat));
  return mix(paper, col, coat);
}

void main(){
  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  int pl = 0;
  vec2 lp = sp;
  if (uSlide.y > 0.5 && sp.x > uSlide.x) { pl = 1; lp.x = sp.x - uSlide.x; }
  vec4 cam = uCam[pl];
  float px = 1.0 / (uU * cam.z);
  vec2 w = cam.xy + (lp - uRes * 0.5) * px;
  vec2 E = field(pl, w, px);
  float coat;
  vec3 col = plate(pl, lp, uRes, E, coat);
  // the incoming sheet casts a soft shadow on the one below
  if (uSlide.y > 0.5 && pl == 0) col *= 1.0 - uSlide.z * exp(-(uSlide.x - sp.x) / (uRes.y * 0.02)) * step(sp.x, uSlide.x);
  // white pencil overlay, textured by the paper tooth
  vec4 o = texture(uOver, gl_FragCoord.xy / uRes * vec2(1.0, -1.0) + vec2(0.0, 1.0));
  float tooth = 0.72 + 0.28 * vnoise(sp * 0.55 + 4.0);
  col = col * (1.0 - o.a * tooth) + o.rgb * tooth;
  // light table falloff + grain (grain seed is frozen in video mode)
  vec2 uv = sp / uRes - 0.5;
  col *= 1.0 - uPl2[pl].w * pow(length(uv * vec2(1.0, uRes.y / uRes.x)) * 1.25, 2.6);
  float g = h21(sp + uFx.x * 17.0) - 0.5;
  col += g * uFx.y * (0.6 + 0.4 * coat);
  frag = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 yok');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { res: U('uRes'), unit: U('uU'), cam: U('uCam'), obj: U('uObj'), pl: U('uPl'), pl2: U('uPl2'), slide: U('uSlide'), fx: U('uFx'), over: U('uOver') };
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.uniform1i(u.over, 0);
  const objArr = new Float32Array(2 * MAX_OBJ * 12);
  return {
    gl,
    // plates: [{ cam:{x,y,z,seed}, objs:[{type,x,y,r,p:[8], side}], stars, gain, density, wash, bleach, split, vignette }]
    draw(plates, slide, fx, overlayCanvas, unit) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.unit, unit);
      const cam = new Float32Array(8), pl = new Float32Array(8), pl2 = new Float32Array(8);
      objArr.fill(0);
      plates.forEach((p, i) => {
        if (!p) return;
        cam.set([p.cam.x, p.cam.y, p.cam.z, p.cam.seed || 0], i * 4);
        pl.set([p.stars ?? 1, p.gain ?? 1, p.density ?? 1, p.wash ?? 0], i * 4);
        pl2.set([p.bleach ?? 0, p.split ?? 0, p.splitOffset ?? 0, p.vignette ?? 0.35], i * 4);
        (p.objs || []).slice(0, MAX_OBJ).forEach((o, k) => {
          const q = o.p || [];
          objArr.set([o.type, o.x, o.y, o.r, q[0] || 0, q[1] || 0, q[2] || 0, q[3] || 0, q[4] || 0, q[5] || 0, q[6] || 0, o.side || 0], (i * MAX_OBJ + k) * 12);
        });
      });
      gl.uniform4fv(u.cam, cam);
      gl.uniform4fv(u.pl, pl);
      gl.uniform4fv(u.pl2, pl2);
      gl.uniform4fv(u.obj, objArr);
      gl.uniform4f(u.slide, slide.x, slide.active ? 1 : 0, slide.shadow || 0.35, 0);
      gl.uniform4f(u.fx, fx.grainSeed, fx.grain, fx.octaves, fx.time);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, overlayCanvas);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
