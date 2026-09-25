// ============================================================
//  CORE — math, noise, procedural textures, geometry builders
// ============================================================
const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const sstep = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = t => 1 - Math.pow(1 - t, 3);
const ei = t => t * t * t;
const win = (t, a, b, f = 0.4) => sstep(a, a + f, t) * (1 - sstep(b - f, b, t));
const frac = x => x - Math.floor(x);
const wrap = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));
function rngOf(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const QUALITY = (() => {
  const small = Math.min(innerWidth, innerHeight) < 600;
  const cores = navigator.hardwareConcurrency || 4;
  return small || cores <= 4 ? 0.6 : 1;
})();

// keyframes: keys = [[t, a, b, c...], ...] → eased interpolation (per segment)
function kf(t, keys, ease = eio) {
  if (t <= keys[0][0]) return keys[0].length === 2 ? keys[0][1] : keys[0].slice(1);
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last.length === 2 ? last[1] : last.slice(1);
  let i = 0; while (t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1]; const u = ease((t - a[0]) / (b[0] - a[0]));
  if (a.length === 2) return lerp(a[1], b[1], u);
  const out = []; for (let k = 1; k < a.length; k++) out.push(lerp(a[k], b[k], u)); return out;
}
// Smooth path through timed 3D keys [[t,x,y,z],...]: cubic Hermite with time-aware tangents,
// so velocity is continuous across keys (no speed jumps); starts and ends at rest.
function splTangent(keys, i, k) {
  const n = keys.length;
  if (i <= 0 || i >= n - 1) return 0;
  const h0 = keys[i][0] - keys[i - 1][0], h1 = keys[i + 1][0] - keys[i][0];
  const d0 = (keys[i][k] - keys[i - 1][k]) / h0, d1 = (keys[i + 1][k] - keys[i][k]) / h1;
  return (d0 * h1 + d1 * h0) / (h0 + h1);
}
function spl(t, keys, out = new THREE.Vector3()) {
  const n = keys.length;
  if (t <= keys[0][0]) return out.set(keys[0][1], keys[0][2], keys[0][3]);
  if (t >= keys[n - 1][0]) return out.set(keys[n - 1][1], keys[n - 1][2], keys[n - 1][3]);
  let i = 0; while (t > keys[i + 1][0]) i++;
  const p1 = keys[i], p2 = keys[i + 1], h = p2[0] - p1[0];
  const u = (t - p1[0]) / h, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  for (let k = 1; k <= 3; k++) {
    const v = h00 * p1[k] + h10 * h * splTangent(keys, i, k) + h01 * p2[k] + h11 * h * splTangent(keys, i + 1, k);
    if (k === 1) out.x = v; else if (k === 2) out.y = v; else out.z = v;
  }
  return out;
}
// numeric integral of f over [0, t] (for flows whose speed varies over time)
function integ(f, t, n = 48) { if (t <= 0) return 0; const h = t / n; let s = 0.5 * (f(0) + f(t)); for (let i = 1; i < n; i++) s += f(i * h); return s * h; }
const _e = new THREE.Euler();
function stepVal(t, list) { let v = list[0][1]; for (const [k, s] of list) if (t >= k) v = s; return v; }

// ---------------- Simplex noise 3D ----------------
const noise3 = (() => {
  const g = [1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1];
  const p = new Uint8Array(256), r = rngOf(1337);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm[i] = (perm[i] % 12) * 3; }
  const F3 = 1 / 3, G3 = 1 / 6;
  return (x, y, z) => {
    const s = (x + y + z) * F3; const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3; const x0 = x - i + t, y0 = y - j + t, z0 = z - k + t;
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } }
    else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0, tt, q;
    tt = 0.6 - x0 * x0 - y0 * y0 - z0 * z0; if (tt > 0) { q = pm[ii + perm[jj + perm[kk]]]; tt *= tt; n += tt * tt * (g[q] * x0 + g[q + 1] * y0 + g[q + 2] * z0); }
    tt = 0.6 - x1 * x1 - y1 * y1 - z1 * z1; if (tt > 0) { q = pm[ii + i1 + perm[jj + j1 + perm[kk + k1]]]; tt *= tt; n += tt * tt * (g[q] * x1 + g[q + 1] * y1 + g[q + 2] * z1); }
    tt = 0.6 - x2 * x2 - y2 * y2 - z2 * z2; if (tt > 0) { q = pm[ii + i2 + perm[jj + j2 + perm[kk + k2]]]; tt *= tt; n += tt * tt * (g[q] * x2 + g[q + 1] * y2 + g[q + 2] * z2); }
    tt = 0.6 - x3 * x3 - y3 * y3 - z3 * z3; if (tt > 0) { q = pm[ii + 1 + perm[jj + 1 + perm[kk + 1]]]; tt *= tt; n += tt * tt * (g[q] * x3 + g[q + 1] * y3 + g[q + 2] * z3); }
    return 32 * n;
  };
})();
const fbm3 = (x, y, z, o = 4) => { let a = 0, amp = 0.5, f = 1; for (let i = 0; i < o; i++) { a += amp * noise3(x * f, y * f, z * f); f *= 2.03; amp *= 0.5; } return a; };

// periodic value noise for tileable textures
function periodicNoise(seed) {
  const r = rngOf(seed), P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = r() * 2 - 1;
  return (x, y, px, py) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    const a = P[y0 * 256 + x0], b = P[y0 * 256 + x1], c = P[y1 * 256 + x0], d = P[y1 * 256 + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function cellular(seed, n) {
  const r = rngOf(seed), P = new Float32Array(n * n * 2);
  for (let i = 0; i < P.length; i++) P[i] = 0.12 + r() * 0.76;
  return (u, v) => {
    const x = u * n, y = v * n, xi = Math.floor(x), yi = Math.floor(y);
    let f1 = 9, f2 = 9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy, wx = ((cx % n) + n) % n, wy = ((cy % n) + n) % n, k = (wy * n + wx) * 2;
      const ddx = cx + P[k] - x, ddy = cy + P[k + 1] - y, d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    return [f1, f2];
  };
}

// ---------------- Procedural textures ----------------
const TEXCACHE = new Map();
let MAX_ANISO = 4;
function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texFromCanvas(c, srgb) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAX_ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function hexRGB(h) { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; } // sRGB bytes (Color stores linear; convert back)
function srgbBytes(h) { const c = new THREE.Color(); c.setHex(h, THREE.SRGBColorSpace); const o = {}; c.getRGB(o, THREE.SRGBColorSpace); return [o.r * 255, o.g * 255, o.b * 255]; }

/**
 * Tissue texture: {map, normal}. opts:
 *  c0 dark, c1 base, c2 light (hex), scale (noise cells), veins count, spots (papillae density),
 *  cells (voronoi n), ridges (stripe freq along u), fine (grain amount), bump strength
 */
function tissueTex(key, o) {
  if (TEXCACHE.has(key)) return TEXCACHE.get(key);
  const S = o.size || 512, seed = o.seed || 1;
  const pn = periodicNoise(seed), pn2 = periodicNoise(seed + 7);
  const cell = o.cells ? cellular(seed + 3, o.cells) : null;
  const spot = o.spots ? cellular(seed + 11, o.spots) : null;
  const pit = o.pits ? cellular(seed + 17, o.pits) : null;
  const H = new Float32Array(S * S), M = new Float32Array(S * S);
  const sc = o.scale || 4;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    let m = 0, amp = 0.5, f = sc;
    for (let k = 0; k < 5; k++) { m += amp * pn(u * f, v * f, f, f); f *= 2; amp *= 0.5; }
    let h = m * 0.6;
    let fine = 0; { let f2 = sc * 8, a2 = 0.5; for (let k = 0; k < 3; k++) { fine += a2 * pn2(u * f2, v * f2, f2, f2); f2 *= 2; a2 *= 0.5; } }
    h += fine * (o.fine ?? 0.5);
    if (cell) { const [f1, f2] = cell(u, v); const edge = sstep(0.0, 0.09, f2 - f1); h += (edge - 1) * 0.9 + (1 - f1) * 0.25; m = m * 0.5 + (edge - 0.5) * 0.35 + f1 * -0.2; }
    if (spot) { const [f1] = spot(u, v); const b = sstep(0.34, 0.0, f1); h += b * 0.8; m += b * 0.45; }
    if (pit) { const [f1] = pit(u, v); const b = sstep(0.15, 0.0, f1); h -= b * 0.6; m -= b * 0.3; }
    if (o.ridges) { const r = Math.pow(0.5 + 0.5 * Math.sin((v * o.ridges + m * 0.6) * TAU), 3); h += r * 0.7; m += r * 0.2; }
    H[y * S + x] = h; M[y * S + x] = m;
  }
  // colour
  const c = canvasOf(S, S), ctx = c.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
  const C0 = srgbBytes(o.c0), C1 = srgbBytes(o.c1), C2 = srgbBytes(o.c2);
  for (let i = 0; i < S * S; i++) {
    const m = M[i];
    const a = sstep(-0.45, 0.05, m), b = sstep(0.05, 0.5, m);
    let r = lerp(C0[0], C1[0], a), g = lerp(C0[1], C1[1], a), bl = lerp(C0[2], C1[2], a);
    r = lerp(r, C2[0], b); g = lerp(g, C2[1], b); bl = lerp(bl, C2[2], b);
    const gr = (H[i] - M[i] * 0.6) * 18 * (o.grain ?? 1);
    d[i * 4] = clamp(r + gr, 0, 255); d[i * 4 + 1] = clamp(g + gr * 0.8, 0, 255); d[i * 4 + 2] = clamp(bl + gr * 0.8, 0, 255); d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (o.veins) {
    const r = rngOf(seed + 99);
    ctx.lineCap = 'round';
    for (let n = 0; n < o.veins; n++) {
      const segs = [];
      const walk = (x, y, ang, w, depth) => {
        let len = 0;
        const steps = 14 + Math.floor(r() * 18);
        for (let s = 0; s < steps; s++) {
          const nx = x + Math.cos(ang) * 7, ny = y + Math.sin(ang) * 7;
          segs.push([x, y, nx, ny, w]);
          x = nx; y = ny; ang += (r() - 0.5) * 0.7; w *= 0.965; len++;
          if (depth < 3 && r() < 0.09) walk(x, y, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), w * 0.7, depth + 1);
        }
      };
      walk(r() * S, r() * S, r() * TAU, 1.2 + r() * 2.4, 0);
      for (const [ox, oy] of [[0,0],[S,0],[-S,0],[0,S],[0,-S],[S,S],[-S,-S],[S,-S],[-S,S]]) {
        for (const [x0, y0, x1, y1, w] of segs) {
          ctx.strokeStyle = o.veinColor || 'rgba(110,10,30,0.45)'; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(x0 + ox, y0 + oy); ctx.lineTo(x1 + ox, y1 + oy); ctx.stroke();
        }
      }
    }
  }
  // normal from height
  const nc = canvasOf(S, S), nctx = nc.getContext('2d'), nimg = nctx.createImageData(S, S), nd = nimg.data;
  const st = o.bump ?? 2.4;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const l = H[y * S + ((x - 1 + S) % S)], rr = H[y * S + ((x + 1) % S)], up = H[((y - 1 + S) % S) * S + x], dn = H[((y + 1) % S) * S + x];
    let nx = (l - rr) * st, ny = (dn - up) * st, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    const i = (y * S + x) * 4; nd[i] = (nx * 0.5 + 0.5) * 255; nd[i + 1] = (ny * 0.5 + 0.5) * 255; nd[i + 2] = (nz * 0.5 + 0.5) * 255; nd[i + 3] = 255;
  }
  nctx.putImageData(nimg, 0, 0);
  const res = { map: texFromCanvas(c, true), normal: texFromCanvas(nc, false) };
  TEXCACHE.set(key, res);
  return res;
}

function glowTex() {
  if (TEXCACHE.has('glow')) return TEXCACHE.get('glow');
  const c = canvasOf(128, 128), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); TEXCACHE.set('glow', t); return t;
}
function halo(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); return s;
}

// ---------------- Materials ----------------
function wetMat(o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(o.color ?? 0xffffff), roughness: o.rough ?? 0.42, metalness: 0,
    clearcoat: o.cc ?? 1, clearcoatRoughness: o.ccr ?? 0.14,
    sheen: o.sheen ?? 0, sheenColor: new THREE.Color(o.sheenColor ?? 0xff9aa8), sheenRoughness: 0.55,
    side: o.side ?? THREE.DoubleSide, vertexColors: !!o.vc,
    emissive: new THREE.Color(o.emissive ?? 0x000000), emissiveIntensity: o.ei ?? 1,
    transparent: !!o.transparent, opacity: o.opacity ?? 1, depthWrite: o.depthWrite ?? true,
  });
  if (o.tex) {
    const rep = o.repeat || [1, 1];
    if (rep[0] === 1 && rep[1] === 1) { m.map = o.tex.map; m.normalMap = o.tex.normal; } // share one GPU texture
    else {
      const key = rep.join('x'); o.tex.reps ||= {};
      if (!o.tex.reps[key]) { const a = o.tex.map.clone(), b = o.tex.normal.clone(); a.repeat.set(rep[0], rep[1]); b.repeat.set(rep[0], rep[1]); a.needsUpdate = b.needsUpdate = true; o.tex.reps[key] = [a, b]; }
      [m.map, m.normalMap] = o.tex.reps[key];
    }
    const ns = o.nScale ?? 0.8; m.normalScale = new THREE.Vector2(ns, ns);
  }
  return m;
}

// Wall motion: squeeze tube vertices toward centreline (needs aCenter/aAlong attributes)
function addTubeMotion(mat) {
  const u = { uTime: { value: 0 }, uWaveC: { value: -1e4 }, uWaveW: { value: 2 }, uWaveA: { value: 0 },
    uBulgeC: { value: -1e4 }, uBulgeW: { value: 1.5 }, uBulgeA: { value: 0 },
    uBreathA: { value: 0.02 }, uBreathF: { value: 1.3 }, uBreathK: { value: 0.35 }, uPulse: { value: 0 },
    uWave2C: { value: -1e4 }, uWave2A: { value: 0 }, uWave2W: { value: 2 } };
  mat.userData.u = u;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aCenter; attribute float aAlong;
uniform float uTime,uWaveC,uWaveW,uWaveA,uBulgeC,uBulgeW,uBulgeA,uBreathA,uBreathF,uBreathK,uPulse,uWave2C,uWave2A,uWave2W;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{ float d=(aAlong-uWaveC)/uWaveW; float k=uWaveA*exp(-d*d);
  float d2=(aAlong-uWave2C)/uWave2W; k+=uWave2A*exp(-d2*d2);
  float b=(aAlong-uBulgeC)/uBulgeW; k-=uBulgeA*exp(-b*b);
  k+=uBreathA*sin(uTime*uBreathF+aAlong*uBreathK)+uPulse;
  transformed=mix(transformed,aCenter,clamp(k,-1.2,0.9)); }`);
    if (prev) prev(sh, r);
  };
  mat.customProgramCacheKey = () => 'tube' + (mat.vertexColors ? 'v' : '') + (mat.map ? 'm' : '');
  return u;
}
// Normal pulse (for SDF chambers): displaces along normal by per-vertex mask
function addNormalPulse(mat) {
  const u = { uA: { value: 0 }, uB: { value: 0 }, uTime: { value: 0 } };
  mat.userData.u = u;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 aMask; uniform float uA,uB,uTime;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
transformed -= objectNormal*(uA*aMask.x+uB*aMask.y + 0.03*sin(uTime*1.7+position.y*.7));`);
  };
  mat.customProgramCacheKey = () => 'npulse';
  return u;
}
// Villus sway for instanced meshes
function addSway(mat, amp = 0.18, freq = 1.6) {
  const u = { uTime: { value: 0 }, uAmp: { value: amp } };
  mat.userData.u = u;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime,uAmp;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
{ vec3 ip=instanceMatrix[3].xyz; float ph=ip.x*1.7+ip.y*2.3+ip.z*1.3; float h=max(position.y,0.);
  float bend=h*h; transformed.x+=sin(uTime*${freq.toFixed(2)}+ph)*uAmp*bend; transformed.z+=cos(uTime*${(freq * 0.8).toFixed(2)}+ph*1.3)*uAmp*bend; }
#endif`);
  };
  mat.customProgramCacheKey = () => 'sway' + amp;
  return u;
}

// ---------------- Path frames & tubes ----------------
function pathFrames(curve, n, up0 = V3(0, 1, 0)) {
  const L = curve.getLength();
  const P = [], T = [], U = [], B = [], S = [];
  let up = up0.clone();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = curve.getPointAt(u), t = curve.getTangentAt(u).normalize();
    up.addScaledVector(t, -up.dot(t));
    if (up.lengthSq() < 1e-8) up = new THREE.Vector3(0, 0, 1).addScaledVector(t, -t.z);
    up.normalize();
    P.push(p); T.push(t); U.push(up.clone()); B.push(new THREE.Vector3().crossVectors(t, up).normalize()); S.push(u * L);
  }
  const F = { P, T, U, B, S, L, n, curve };
  F.at = (s, o = {}) => {
    const f = clamp(s / L, 0, 1) * n; const i = Math.min(n - 1, Math.floor(f)), k = f - i;
    (o.p ||= new THREE.Vector3()).lerpVectors(P[i], P[i + 1], k);
    (o.t ||= new THREE.Vector3()).lerpVectors(T[i], T[i + 1], k).normalize();
    (o.u ||= new THREE.Vector3()).lerpVectors(U[i], U[i + 1], k).normalize();
    (o.b ||= new THREE.Vector3()).lerpVectors(B[i], B[i + 1], k).normalize();
    return o;
  };
  // point inside the tube at arc s, angle th, radius r (absolute)
  F.pt = (s, th, r, out = new THREE.Vector3()) => {
    const f = F.at(s, F._tmp || (F._tmp = {}));
    return out.copy(f.p).addScaledVector(f.b, Math.cos(th) * r).addScaledVector(f.u, Math.sin(th) * r);
  };
  F.nearestS = (p) => { let best = 0, bd = 1e9; for (let i = 0; i <= n; i++) { const d = P[i].distanceToSquared(p); if (d < bd) { bd = d; best = S[i]; } } return best; };
  return F;
}
/** prof(s, th) → radius (number) or [rx, ry]; color(s, th) → [r,g,b] linear (optional) */
function tubeGeo(F, prof, o = {}) {
  const n = F.n, m = o.radial || 64;
  const cnt = (n + 1) * (m + 1);
  const pos = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), cen = new Float32Array(cnt * 3), alo = new Float32Array(cnt);
  const col = o.color ? new Float32Array(cnt * 3) : null;
  const uvU = o.uvU ?? 0.25, uvV = o.uvV ?? 2;
  for (let i = 0; i <= n; i++) {
    const p = F.P[i], u = F.U[i], b = F.B[i], s = F.S[i];
    for (let j = 0; j <= m; j++) {
      const th = (j / m) * TAU, c = Math.cos(th), sn = Math.sin(th);
      let r = prof(s, th, i, j); let rx, ry; if (Array.isArray(r)) { rx = r[0]; ry = r[1]; } else rx = ry = r;
      const k = i * (m + 1) + j;
      pos[k * 3] = p.x + b.x * c * rx + u.x * sn * ry;
      pos[k * 3 + 1] = p.y + b.y * c * rx + u.y * sn * ry;
      pos[k * 3 + 2] = p.z + b.z * c * rx + u.z * sn * ry;
      cen[k * 3] = p.x; cen[k * 3 + 1] = p.y; cen[k * 3 + 2] = p.z; alo[k] = s;
      uv[k * 2] = (j / m) * uvV; uv[k * 2 + 1] = s * uvU;
      if (col) { const cc = o.color(s, th); col[k * 3] = cc[0]; col[k * 3 + 1] = cc[1]; col[k * 3 + 2] = cc[2]; }
    }
  }
  const idx = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a = i * (m + 1) + j, bb = (i + 1) * (m + 1) + j, c = (i + 1) * (m + 1) + j + 1, d = i * (m + 1) + j + 1;
    idx.push(a, bb, d, bb, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aCenter', new THREE.BufferAttribute(cen, 3));
  g.setAttribute('aAlong', new THREE.BufferAttribute(alo, 1));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // weld seam normals
  const nr = g.attributes.normal.array;
  for (let i = 0; i <= n; i++) {
    const a = i * (m + 1), b2 = i * (m + 1) + m;
    for (let q = 0; q < 3; q++) { const v = (nr[a * 3 + q] + nr[b2 * 3 + q]) * 0.5; nr[a * 3 + q] = nr[b2 * 3 + q] = v; }
  }
  g.computeBoundingSphere();
  return g;
}

// ---------------- Surface nets (SDF → mesh) ----------------
function surfaceNets(sdf, min, max, cell) {
  const nx = Math.ceil((max.x - min.x) / cell) + 1, ny = Math.ceil((max.y - min.y) / cell) + 1, nz = Math.ceil((max.z - min.z) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    F[i + nx * (j + ny * k)] = sdf(min.x + i * cell, min.y + j * cell, min.z + k * cell);
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const vid = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [];
  const corner = [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const edges = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const f = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const [a, b, d] = corner[c]; f[c] = F[(i + a) + nx * ((j + b) + ny * (k + d))]; if (f[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [e0, e1] of edges) {
      if ((f[e0] < 0) === (f[e1] < 0)) continue;
      const t = f[e0] / (f[e0] - f[e1]); const A = corner[e0], B = corner[e1];
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; cnt++;
    }
    vid[i + cx * (j + cy * k)] = pos.length / 3;
    pos.push(min.x + (i + sx / cnt) * cell, min.y + (j + sy / cnt) * cell, min.z + (k + sz / cnt) * cell);
  }
  const idx = [];
  const V = (i, j, k) => vid[i + cx * (j + cy * k)];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = F[i + nx * (j + ny * k)] < 0;
    if (i < cx && j > 0 && k > 0 && j < cy && k < cz) {
      const v1 = F[(i + 1) + nx * (j + ny * k)] < 0;
      if (v0 !== v1) quad(V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k), v0);
    }
    if (j < cy && i > 0 && k > 0 && i < cx && k < cz) {
      const v1 = F[i + nx * ((j + 1) + ny * k)] < 0;
      if (v0 !== v1) quad(V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1), v0);
    }
    if (k < cz && i > 0 && j > 0 && i < cx && j < cy) {
      const v1 = F[i + nx * (j + ny * (k + 1))] < 0;
      if (v0 !== v1) quad(V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k), v0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
// SDF primitives
const sdSphere = (x, y, z, cx, cy, cz, r) => { const a = x - cx, b = y - cy, c = z - cz; return Math.sqrt(a * a + b * b + c * c) - r; };
function sdCapsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az;
  const h = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz));
  const qx = px - dx * h, qy = py - dy * h, qz = pz - dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - r;
}
// tapered capsule (r at a → rb at b)
function sdCone(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
  const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az;
  const h = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz));
  const qx = px - dx * h, qy = py - dy * h, qz = pz - dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - lerp(ra, rb, h);
}
const sdEllipsoid = (x, y, z, cx, cy, cz, rx, ry, rz) => { const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz; return (Math.sqrt(a * a + b * b + c * c) - 1) * Math.min(rx, ry, rz); };
// more accurate ellipsoid distance (Quilez) for detailed shapes
const sdEll = (x, y, z, cx, cy, cz, rx, ry, rz) => { const px = x - cx, py = y - cy, pz = z - cz; const a = px / rx, b = py / ry, c = pz / rz, k0 = Math.sqrt(a * a + b * b + c * c); const a2 = a / rx, b2 = b / ry, c2 = c / rz, k1 = Math.sqrt(a2 * a2 + b2 * b2 + c2 * c2); return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz); };
const smax = (a, b, k) => -smin(-a, -b, k);
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); };

// ---------------- Shared object factories ----------------
let _rbcGeo = null;
function rbcGeo() {
  if (_rbcGeo) return _rbcGeo;
  const pts = [], N = 22;
  const z = r => 0.5 * Math.sqrt(Math.max(0, 1 - r * r)) * (0.207 + 2.002 * r * r - 1.122 * r * r * r * r);
  for (let i = 0; i <= N; i++) { const r = Math.sin((i / N) * Math.PI / 2); pts.push(new THREE.Vector2(Math.max(r, 0.001), z(r) + 0.02)); }
  for (let i = N; i >= 0; i--) { const r = Math.sin((i / N) * Math.PI / 2); pts.push(new THREE.Vector2(Math.max(r, 0.001), -z(r) - 0.02)); }
  const g = new THREE.LatheGeometry(pts, 36); g.computeVertexNormals();
  _rbcGeo = g; return g;
}
function rbcMat(c = 0xb3101f, sheen = 0xff6070) {
  return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.4, emissive: new THREE.Color(c).multiplyScalar(0.12) });
}
// sugar ring: n=6 glucose, n=5 fructose
function ringGeo(n, R = 0.5, o = {}) {
  const parts = [];
  const tube = o.tube ?? 0.075;
  const colC = new THREE.Color(o.c ?? 0xffffff), colO = new THREE.Color(o.o ?? 0xff5a4a), colH = new THREE.Color(o.h ?? 0xffffff);
  const paint = (g, c) => { const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const tor = new THREE.TorusGeometry(R, tube, 6, n); parts.push(paint(tor, colC));
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU, x = Math.cos(a) * R, y = Math.sin(a) * R;
    const s = new THREE.SphereGeometry(k === 0 ? 0.16 : 0.14, 14, 10); s.translate(x, y, 0); parts.push(paint(s, k === 0 ? colO : colC));
    if (k !== 0) {
      const dir = new THREE.Vector3(x, y, (k % 2 ? 0.5 : -0.5) * R).normalize();
      const cyl = new THREE.CylinderGeometry(0.035, 0.035, 0.32, 6); cyl.translate(0, 0.16, 0);
      cyl.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir)); cyl.translate(x, y, 0); parts.push(paint(cyl, colC));
      const ox = new THREE.SphereGeometry(0.09, 10, 8); const e = dir.clone().multiplyScalar(0.34); ox.translate(x + e.x, y + e.y, e.z); parts.push(paint(ox, colO));
    }
  }
  return BGU.mergeGeometries(parts);
}
function linkGeo(gA, oA, gB, oB) {
  const a = gA.clone().translate(...oA), b = gB.clone().translate(...oB);
  const mid = new THREE.SphereGeometry(0.12, 10, 8); mid.translate((oA[0] + oB[0]) / 2, (oA[1] + oB[1]) / 2 + 0.05, (oA[2] + oB[2]) / 2);
  const cc = new Float32Array(mid.attributes.position.count * 3); const co = new THREE.Color(0xff5a4a);
  for (let i = 0; i < cc.length; i += 3) { cc[i] = co.r; cc[i + 1] = co.g; cc[i + 2] = co.b; } mid.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  return BGU.mergeGeometries([a, b, mid]);
}
function moleculeMat(color, glow = 0.35) {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.35, metalness: 0.05, emissive: new THREE.Color(color), emissiveIntensity: glow });
}
// enzyme blob with an active-site cleft
function smoothed(g) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); const m = BGU.mergeVertices(g, 1e-4); m.computeVertexNormals(); return m; }
function enzymeGeo(seed = 1) {
  const g = new THREE.IcosahedronGeometry(1, 4); const p = g.attributes.position; const v = new THREE.Vector3();
  const notch = V3(1, 0.3, 0).normalize();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let r = 1 + 0.16 * noise3(v.x * 1.8 + seed, v.y * 1.8, v.z * 1.8) + 0.08 * noise3(v.x * 4, v.y * 4 + seed, v.z * 4);
    const d = v.distanceTo(notch); r -= 0.42 * Math.exp(-d * d / 0.09);
    v.multiplyScalar(r); p.setXYZ(i, v.x, v.y, v.z);
  }
  return smoothed(g);
}
function enzymeMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 1, sheenColor: new THREE.Color(color).offsetHSL(0, 0, 0.2), emissive: new THREE.Color(color), emissiveIntensity: 0.35 });
}
// blob (bolus / droplets) geometry with noise
function blobGeo(r = 1, detail = 5, amp = 0.12, seed = 0, colorFn = null) {
  const g0 = new THREE.IcosahedronGeometry(r, detail); const p = g0.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); const k = 1 + amp * fbm3(n.x * 1.6 + seed, n.y * 1.6, n.z * 1.6, 3); v.copy(n).multiplyScalar(r * k); p.setXYZ(i, v.x, v.y, v.z); }
  const g = detail > 1 ? smoothed(g0) : (g0.computeVertexNormals(), g0);
  if (colorFn) { const q = g.attributes.position, col = new Float32Array(q.count * 3); for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i).normalize(); const cc = colorFn(v); col[i * 3] = cc[0]; col[i * 3 + 1] = cc[1]; col[i * 3 + 2] = cc[2]; } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  return g;
}
const _pink = new THREE.Color(0xe8789e), _sug = new THREE.Color(0xfff0f4), _pis = new THREE.Color(0x8fb850);
function sweetColors(v) { const n = noise3(v.x * 3.1, v.y * 3.1, v.z * 3.1) + 0.5 * noise3(v.x * 9, v.y * 9, v.z * 9); const k = sstep(0.1, 0.5, n); const pz = sstep(0.62, 0.7, noise3(v.x * 6 + 9, v.y * 6, v.z * 6)); const c = _pink.clone().lerp(_sug, k * 0.8).lerp(_pis, pz * 0.9); return [c.r, c.g, c.b]; }

// ---------------- Point sprites (motes, plasma, dust) ----------------
function motes(count, place, o = {}) {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), seed = new Float32Array(count);
  const r = rngOf(o.seed || 5); const c1 = new THREE.Color(o.color ?? 0xffe0d0), c2 = new THREE.Color(o.color2 ?? o.color ?? 0xffe0d0); const tmp = new THREE.Color(); const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    place(v, r, i); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    tmp.copy(c1).lerp(c2, r()); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    size[i] = (o.size ?? 0.05) * (0.4 + r() * 1.2); seed[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uDrift: { value: o.drift ?? 0.15 }, uOpacity: { value: o.opacity ?? 1 }, uNear: { value: o.near ?? 0.15 } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aSeed; uniform float uTime,uScale,uDrift,uNear; varying vec3 vC; varying float vA;
      void main(){ vec3 p=position+uDrift*vec3(sin(uTime*.7+aSeed*37.),sin(uTime*.53+aSeed*91.),cos(uTime*.61+aSeed*47.));
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; float z=max(-mv.z,.001);
        gl_PointSize=clamp(aSize*uScale/z,0.,90.); vC=aColor; vA=smoothstep(uNear*.3,uNear,z)*(0.75+0.25*sin(uTime*2.+aSeed*50.)); }`,
    fragmentShader: `varying vec3 vC; varying float vA; uniform float uOpacity; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=1.-smoothstep(0.,.5,d); a*=a; gl_FragColor=vec4(vC*a*vA*uOpacity,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.motes = true;
  return pts;
}

// ---------------- Instanced flow along a path (RBCs etc.) ----------------
function flowItems(count, seed, o = {}) {
  const r = rngOf(seed), items = [];
  for (let i = 0; i < count; i++) items.push({ s: r(), rr: Math.sqrt(r()) * (o.rMax ?? 0.8), th: r() * TAU, ax: V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), sp: (r() - 0.5) * (o.spin ?? 2), ph: r() * TAU, sc: (o.scale ?? 1) * (0.85 + r() * 0.3), v: 0.8 + r() * 0.4 });
  return items;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _fo = {};
/**
 * places items along frames F around camera arc position sc: window [sc-back, sc+ahead]
 * radius(s) gives tube radius, speed = flow speed (units/s)
 */
function placeFlow(mesh, F, items, time, sc, o) {
  const back = o.back ?? 4, ahead = o.ahead ?? 30, span = back + ahead;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const prof = 1 - 0.55 * it.rr * it.rr;
    const dist = o.travel ?? o.speed * time;
    let rel = wrap(it.s * span + dist * it.v * prof - sc, -back, ahead);
    const s = clamp(sc + rel, 0, F.L);
    const R = (o.radius ? o.radius(s) : 1) * it.rr;
    const th = it.th + (o.swirl ?? 0) * time;
    F.at(s, _fo);
    _p.copy(_fo.p).addScaledVector(_fo.b, Math.cos(th) * R).addScaledVector(_fo.u, Math.sin(th) * R);
    if (o.offset) o.offset(_p, it, s, time);
    _q.setFromAxisAngle(it.ax, it.ph + it.sp * time);
    let sc2 = it.sc * (o.scaleFn ? o.scaleFn(it, s, rel) : 1);
    const av = o.avoid || camera.position, aR = o.avoidR ?? 1.4; if (aR > 0) sc2 *= sstep(aR * 0.45, aR, _p.distanceTo(av));
    _s.set(sc2, sc2, sc2);
    _m4.compose(_p, _q, _s); mesh.setMatrixAt(i, _m4);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

// look helper
function aim(cam, pos, target, up) {
  cam.position.copy(pos); if (up) cam.up.copy(up); else cam.up.set(0, 1, 0); cam.lookAt(target);
}
// dispose all GPU resources in a scene (textures shared via cache are kept)
function disposeScene(scene) {
  scene.traverse(o => {
    if (o.geometry && o.geometry !== _rbcGeo) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      for (const k of ['map', 'normalMap']) if (m[k] && m[k].userData?.own) m[k].dispose();
      m.dispose();
    });
  });
}
