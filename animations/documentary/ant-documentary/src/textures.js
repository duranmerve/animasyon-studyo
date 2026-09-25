// Procedural textures: every surface (soil, chitin, compound eye, leaves) is drawn here from noise,
// no image files. Height maps are turned into normal maps so the macro light can rake across them.
import { RawTexture, Texture, Constants } from '@babylonjs/core';
import { tfbm, tnoise, rng, clamp } from './noise.js';

function raw(scene, data, w, h, { wrap = true } = {}) {
  const t = new RawTexture(data, w, h, Constants.TEXTUREFORMAT_RGBA, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  t.wrapU = t.wrapV = wrap ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE;
  t.anisotropicFilteringLevel = 8;
  return t;
}

// height (Float32Array w*h, 0..1) → tangent-space normal map (RGBA bytes)
function heightToNormal(hgt, w, h, strength, wrap = true) {
  const out = new Uint8Array(w * h * 4);
  const at = (x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = clamp(x, 0, w - 1); y = clamp(y, 0, h - 1); }
    return hgt[y * w + x];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    let nx = -dx, ny = -dy, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4;
    out[i] = (nx * 0.5 + 0.5) * 255; out[i + 1] = (ny * 0.5 + 0.5) * 255; out[i + 2] = (nz * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  return out;
}

// Chitin microsculpture: fine shagreen of tiny cells with pits where hairs stand (Lasius cuticle).
export function chitinNormal(scene, size = 512) {
  const h = new Float32Array(size * size);
  const R = rng(11);
  const pits = [];
  for (let i = 0; i < 900; i++) pits.push([R() * size, R() * size, 1.2 + R() * 1.6]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    // reticulate cells: absolute value of noise gives ridge lines
    const cells = 1 - Math.abs(tnoise(u * 48, v * 48, 48, 3) * 2 - 1);
    const fine = tfbm(u * 96, v * 96, 96, 2, 5);
    h[y * size + x] = cells * 0.55 + fine * 0.45;
  }
  for (const [px, py, r] of pits) {
    for (let y = Math.floor(py - r - 1); y <= py + r + 1; y++) for (let x = Math.floor(px - r - 1); x <= px + r + 1; x++) {
      const d = Math.hypot(x - px, y - py);
      if (d < r) { const xx = (x + size) % size, yy = (y + size) % size; h[yy * size + xx] -= 0.6 * (1 - d / r); }
    }
  }
  return raw(scene, heightToNormal(h, size, size, 2.2), size, size);
}

// Compound eye: a hexagonal lattice of domed facets (ommatidia). cols × rows facets over the texture.
export function eyeNormal(scene, size = 512, cols = 18) {
  const h = new Float32Array(size * size);
  const dx = size / cols, dy = dx * Math.sqrt(3) / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.round(y / dy);
    let best = 1e9;
    for (let r = row - 1; r <= row + 1; r++) {
      const off = (r & 1) ? dx / 2 : 0;
      const c = Math.round((x - off) / dx);
      for (let cc = c - 1; cc <= c + 1; cc++) {
        const d = Math.hypot(x - (cc * dx + off), y - r * dy);
        if (d < best) best = d;
      }
    }
    const t = clamp(best / (dx * 0.55));
    h[y * size + x] = Math.sqrt(Math.max(0, 1 - t * t));
  }
  return raw(scene, heightToNormal(h, size, size, 3.5, false), size, size, { wrap: false });
}

// Soil: fine silt with scattered mineral flecks and organic crumbs. Returns { albedo, normal }.
export function soilTextures(scene, size = 1024) {
  const h = new Float32Array(size * size);
  const col = new Uint8Array(size * size * 4);
  const R = rng(21);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const big = tfbm(u * 6, v * 6, 6, 4, 1);
    const mid = tfbm(u * 40, v * 40, 40, 3, 2);
    const fine = tnoise(u * 300, v * 300, 300, 3);
    const crumbs = Math.pow(tnoise(u * 90, v * 90, 90, 9), 3);
    h[y * size + x] = big * 0.3 + mid * 0.45 + fine * 0.15 + crumbs * 0.4;
    const i = (y * size + x) * 4;
    const warm = 0.75 + big * 0.5;
    const shade = 0.55 + mid * 0.6 + fine * 0.2;
    col[i] = clamp(92 * warm * shade + crumbs * 40, 0, 255);
    col[i + 1] = clamp(68 * warm * shade + crumbs * 22, 0, 255);
    col[i + 2] = clamp(48 * shade * (0.9 + big * 0.2), 0, 255);
    col[i + 3] = 255;
  }
  // mineral flecks: pale quartz, dark mica, rusty grains
  for (let k = 0; k < 5000; k++) {
    const px = R() * size, py = R() * size, r = 0.5 + R() * 1.4;
    const kind = R();
    const c = kind < 0.45 ? [150, 132, 110] : kind < 0.7 ? [40, 30, 24] : kind < 0.9 ? [130, 84, 50] : [175, 165, 150];
    for (let y = Math.floor(py - r); y <= py + r; y++) for (let x = Math.floor(px - r); x <= px + r; x++) {
      const d = Math.hypot(x - px, y - py) / r;
      if (d > 1) continue;
      const xx = (x + size) % size, yy = (y + size) % size, i = (yy * size + xx) * 4, a = (1 - d * d) * 0.85;
      col[i] = col[i] * (1 - a) + c[0] * a; col[i + 1] = col[i + 1] * (1 - a) + c[1] * a; col[i + 2] = col[i + 2] * (1 - a) + c[2] * a;
      h[yy * size + xx] += 0.25 * (1 - d * d);
    }
  }
  return { albedo: raw(scene, col, size, size), normal: raw(scene, heightToNormal(h, size, size, 5), size, size) };
}

// Grass blade: parallel veins along the length (v axis), slightly lighter midrib, waxy speckle.
export function bladeTextures(scene, w = 256, hgt = 1024) {
  const h = new Float32Array(w * hgt);
  const col = new Uint8Array(w * hgt * 4);
  for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / hgt;
    const veins = Math.pow(Math.abs(Math.sin(u * Math.PI * 14 + tnoise(u * 4, v * 3, 4, 7) * 0.8)), 6);
    const mid = Math.exp(-Math.pow((u - 0.5) / 0.035, 2));
    const speck = tnoise(u * 120, v * 480, 120, 4);
    h[y * w + x] = 0.5 - veins * 0.35 + mid * 0.5 + speck * 0.08;
    const i = (y * w + x) * 4;
    const g = 0.85 + veins * 0.12 + mid * 0.2 + (speck - 0.5) * 0.1;
    col[i] = clamp(255 * g); col[i + 1] = clamp(255 * g); col[i + 2] = clamp(255 * g); col[i + 3] = 255;
  }
  return { tint: raw(scene, col, w, hgt), normal: raw(scene, heightToNormal(h, w, hgt, 1.6), w, hgt) };
}

// Generic organic bump (leaf litter, stems, seeds, aphid skin): soft fbm.
export function organicNormal(scene, size = 256, scale = 12, strength = 2, seed = 31) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
    h[y * size + x] = tfbm(x / size * scale, y / size * scale, scale, 4, seed);
  return raw(scene, heightToNormal(h, size, size, strength), size, size);
}

// Dead leaf: veined, blotched brown with a darker network (tint map, multiply with albedo colour).
export function leafTint(scene, size = 512) {
  const col = new Uint8Array(size * size * 4);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const blot = tfbm(u * 5, v * 5, 5, 5, 41);
    const net = 1 - Math.abs(tnoise(u * 30, v * 30, 30, 42) * 2 - 1);
    const midrib = Math.exp(-Math.pow((u - 0.5) / 0.02, 2));
    const side = Math.exp(-Math.pow(((Math.abs(u - 0.5) * 1.3 + v * 0.6) % 0.12 - 0.06) / 0.008, 2));
    const vein = Math.max(midrib, side * 0.7, Math.pow(net, 8) * 0.5);
    h[y * size + x] = vein * 0.7 + blot * 0.3;
    const i = (y * size + x) * 4;
    const b = 0.7 + blot * 0.5 - vein * 0.25;
    col[i] = clamp(255 * b); col[i + 1] = clamp(235 * b * (0.9 + blot * 0.15)); col[i + 2] = clamp(210 * b); col[i + 3] = 255;
  }
  return { tint: raw(scene, col, size, size), normal: raw(scene, heightToNormal(h, size, size, 3), size, size) };
}
