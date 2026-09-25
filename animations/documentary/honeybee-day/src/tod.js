// Hours of the bee's day as light presets (one data object each), mixed smoothly.
// Palette (TREATMENT.md): chalk #E6ECEF · noon sky #9FBCD3 · sage #8C9A6E · hive soot #120C08 ·
// wax #D9A441 · dusk rose #C98272 · accent UV violet #8B5CF6 (only for what bees see and we don't).
import * as THREE from 'three';

const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

export const TOD = {
  dawn: {
    sunEl: 2, sunAz: 62, sunCol: C('#ffb98a', 1.25), skyAmb: C('#8b9dbd', 0.55), gndAmb: C('#6b5a55', 0.35),
    fog: C('#c3c0c8'), fogDen: 0.0003, rimCol: C('#ffc48e'), rim: 0.85,
    zen: C('#5d7496'), hor: C('#d4b9b2'), glow: C('#ffbf8a'), glowK: 1.1, cloud: 0.42, disc: 0.35, cloudCol: C('#f4d9c8'), cloudShade: C('#8f97aa'),
    ridgeA: C('#8f98ab'), ridgeB: C('#4f5a66'), ground: C('#5d6552'), haze: 0.55,
    bloom: 0.35, th: 0.85, expo: 0.92, lift: [0.015, 0.01, 0.025], gain: [1, 0.98, 0.97], sat: 0.95, vig: 0.38, grain: 0.035,
  },
  morning: {
    sunEl: 20, sunAz: 85, sunCol: C('#ffe4c0', 1.55), skyAmb: C('#a7bdd2', 0.62), gndAmb: C('#72704f', 0.45),
    fog: C('#d3dde5'), fogDen: 0.0002, fogStart: 350, rimCol: C('#fff0d8'), rim: 0.55,
    zen: C('#7fa2c6'), hor: C('#d9e3ea'), glow: C('#fff0d6'), glowK: 0.45, cloud: 0.35, cloudCol: C('#ffffff'), cloudShade: C('#aeb8c4'),
    ridgeA: C('#9fb0bb'), ridgeB: C('#667660'), ground: C('#86956a'), haze: 0.4,
    bloom: 0.3, th: 0.95, expo: 1.0, lift: [0.01, 0.012, 0.018], gain: [1, 1, 1], sat: 1.0, vig: 0.32, grain: 0.03,
  },
  day: {
    sunEl: 45, sunAz: 125, sunCol: C('#fff4e2', 1.7), skyAmb: C('#b3c7d8', 0.66), gndAmb: C('#76734f', 0.48),
    fog: C('#d6e0e8'), fogDen: 0.00017, fogStart: 350, rimCol: C('#ffffff'), rim: 0.4,
    zen: C('#86a9c9'), hor: C('#dbe4ea'), glow: C('#fff6e4'), glowK: 0.4, cloud: 0.33, cloudCol: C('#ffffff'), cloudShade: C('#b7c2cc'),
    ridgeA: C('#a3b3be'), ridgeB: C('#6a7a5f'), ground: C('#86956a'), haze: 0.38,
    bloom: 0.26, th: 1.0, expo: 0.98, lift: [0.01, 0.012, 0.016], gain: [1, 1, 1], sat: 1.02, vig: 0.3, grain: 0.028,
  },
  noon: {
    sunEl: 60, sunAz: 175, sunCol: C('#fff7ea', 1.75), skyAmb: C('#b3c7d8', 0.68), gndAmb: C('#76734f', 0.5),
    fog: C('#d8e1e8'), fogDen: 0.00016, fogStart: 350, rimCol: C('#ffffff'), rim: 0.35,
    zen: C('#93b4cf'), hor: C('#E6ECEF'), glow: C('#fff8ea'), glowK: 0.5, cloud: 0.3, cloudCol: C('#ffffff'), cloudShade: C('#b7c2cc'),
    ridgeA: C('#adbcc5'), ridgeB: C('#768468'), ground: C('#8c9a6e'), haze: 0.5,
    bloom: 0.24, th: 1.0, expo: 0.96, lift: [0.01, 0.012, 0.016], gain: [1, 1, 1], sat: 1.0, vig: 0.3, grain: 0.028,
  },
  dusk: {
    sunEl: 1.5, sunAz: 302, sunCol: C('#ff9f78', 1.25), skyAmb: C('#8a86a8', 0.5), gndAmb: C('#5d4a4a', 0.32),
    fog: C('#8d7b88'), fogDen: 0.00012, rimCol: C('#ffab80'), rim: 0.9,
    zen: C('#5f6d97'), hor: C('#C98272'), glow: C('#ffb088'), glowK: 1.0, cloud: 0.35, cloudCol: C('#e9a792'), cloudShade: C('#6d6687'),
    ridgeA: C('#8a7c92'), ridgeB: C('#4d4a5a'), ground: C('#5f5c52'), haze: 0.7,
    bloom: 0.38, th: 0.85, expo: 1.05, lift: [0.025, 0.012, 0.03], gain: [1, 0.96, 0.95], sat: 0.95, vig: 0.4, grain: 0.035,
  },
  night: {
    sunEl: 35, sunAz: 150, sunCol: C('#8ea0cc', 0.32), skyAmb: C('#34405e', 0.5), gndAmb: C('#1c1a22', 0.4),
    fog: C('#1a2133'), fogDen: 0.00045, rimCol: C('#9fb2e0'), rim: 0.6,
    zen: C('#0b1224'), hor: C('#2a3150'), glow: C('#c0cae8'), glowK: 0.12, cloud: 0.15, cloudCol: C('#3a4360'), cloudShade: C('#1a2034'),
    ridgeA: C('#1c2338'), ridgeB: C('#0f141f'), ground: C('#141820'), haze: 0.6, stars: 1, disc: 0,
    bloom: 0.45, th: 0.7, expo: 1.1, lift: [0.01, 0.012, 0.03], gain: [0.95, 0.97, 1.05], sat: 0.85, vig: 0.45, grain: 0.04,
  },
  // inside the hive: no daylight; wax edges and warmth are the only light
  hive: {
    sunEl: 55, sunAz: 100, sunCol: C('#d9a441', 0.5), skyAmb: C('#4a3420', 0.6), gndAmb: C('#1a0f08', 0.3),
    fog: C('#120C08'), fogDen: 0.012, fogStart: 20, rimCol: C('#e8a94c'), rim: 0.6, dark: 0.6,
    zen: C('#120C08'), hor: C('#120C08'), glow: C('#000000'), glowK: 0, cloud: 0, cloudCol: C('#000'), cloudShade: C('#000'),
    ridgeA: C('#120C08'), ridgeB: C('#120C08'), ground: C('#120C08'), haze: 0, noSky: true,
    bloom: 0.45, th: 0.6, expo: 0.95, lift: [0.012, 0.006, 0.0], gain: [1.02, 0.98, 0.92], sat: 0.95, vig: 0.5, grain: 0.04,
  },
};

const lerpC = (a, b, t) => a.clone().lerp(b, t);
export function mixTOD(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (x === undefined) { o[k] = y; continue; } if (y === undefined) { o[k] = x; continue; }
    if (x.isColor) o[k] = lerpC(x, y, t);
    else if (Array.isArray(x)) o[k] = x.map((v, i) => v + (y[i] - v) * t);
    else if (typeof x === 'number') o[k] = x + (y - x) * t;
    else o[k] = t < 0.5 ? x : y;
  }
  return o;
}
