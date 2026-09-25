// Geography of 1453 Constantinople and the Bosphorus, from real latitudes and longitudes.
// Map units are kilometres: x east, y south, origin near the mouth of the Golden Horn.
// Coastlines follow today's shore roughly; they are smoothed for the painted look.

const LAT0 = 41.02, LON0 = 28.975;
const KX = 111.32 * Math.cos(LAT0 * Math.PI / 180), KY = 110.95;
export const P = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KY];
const pts = list => list.map(([a, b]) => P(a, b));

// Catmull-Rom resampling for smooth, organic coasts
export function smooth(line, steps = 6) {
  const out = [];
  for (let i = 0; i < line.length - 1; i++) {
    const p0 = line[Math.max(0, i - 1)], p1 = line[i], p2 = line[i + 1], p3 = line[Math.min(line.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(line[line.length - 1]);
  return out;
}

// --- Golden Horn: centre line and half widths (km) → both shores
const HORN = [
  [41.0206, 28.9832, 0.3], [41.0228, 28.9705, 0.26], [41.0270, 28.9625, 0.24], [41.0325, 28.9552, 0.24],
  [41.0380, 28.9497, 0.22], [41.0440, 28.9457, 0.21], [41.0500, 28.9422, 0.19], [41.0560, 28.9405, 0.15],
  [41.0620, 28.9425, 0.11], [41.0665, 28.9462, 0.05],
];
const hornC = smooth(HORN.map(([a, b]) => P(a, b)), 5);
const hornW = smooth(HORN.map(h => [h[2], 0]), 5).map(p => p[0]);
const side = sgn => hornC.map((p, i) => {
  const a = hornC[Math.max(0, i - 1)], b = hornC[Math.min(hornC.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [p[0] + sgn * (-dy / l) * hornW[i], p[1] + sgn * (dx / l) * hornW[i]];
});
export const hornSouth = side(-1);   // city side (south-west bank)
export const hornNorth = side(1);    // Galata side
export const hornCentre = hornC;

const marmaraWest = pts([[40.950, 28.70], [40.962, 28.80], [40.968, 28.845], [40.974, 28.868], [40.980, 28.885], [40.986, 28.900], [40.9905, 28.9115]]);
export const peninsulaCoast = smooth(pts([
  [40.9935, 28.9225], [40.9958, 28.9300], [40.9982, 28.9380], [41.0005, 28.9455], [41.0022, 28.9535], [41.0012, 28.9615],
  [41.0006, 28.9690], [41.0025, 28.9758], [41.0047, 28.9812], [41.0086, 28.9852], [41.0126, 28.9872], [41.0166, 28.9862], [41.0188, 28.9828],
]), 5);
const bosphorusEurope = smooth(pts([
  [41.0236, 28.9838], [41.0255, 28.9848], [41.0300, 28.9882], [41.0345, 28.9935], [41.0385, 28.9995], [41.0415, 29.0060],
  [41.0440, 29.0160], [41.0470, 29.0265], [41.0540, 29.0335], [41.0590, 29.0370], [41.0660, 29.0420], [41.0720, 29.0445],
  [41.0780, 29.0440], [41.0820, 29.0500], [41.0845, 29.0570], [41.0900, 29.0590], [41.0960, 29.0575], [41.1050, 29.0565],
  [41.1130, 29.0600], [41.1200, 29.0700], [41.1300, 29.0750], [41.1450, 29.0800],
]), 5);
export const asiaCoast = smooth(pts([
  [40.930, 29.060], [40.9580, 29.0420], [40.9680, 29.0380], [40.9780, 29.0250], [40.9900, 29.0230], [40.9990, 29.0170],
  [41.0080, 29.0110], [41.0180, 29.0072], [41.0265, 29.0122], [41.0320, 29.0230], [41.0365, 29.0300], [41.0430, 29.0370],
  [41.0470, 29.0420], [41.0530, 29.0495], [41.0600, 29.0535], [41.0670, 29.0590], [41.0750, 29.0610], [41.0825, 29.0648],
  [41.0900, 29.0660], [41.0990, 29.0680], [41.1070, 29.0790], [41.1180, 29.0930], [41.1450, 29.1000],
]), 5);

// Europe: Marmara shore → peninsula → Golden Horn in and out → Bosphorus north → back round the west
export const europe = [
  ...marmaraWest, ...peninsulaCoast, ...hornSouth.slice(1), ...hornNorth.slice().reverse(), ...bosphorusEurope,
  P(41.30, 29.08), P(41.30, 28.40), P(40.90, 28.40),
];
export const asia = [...asiaCoast, P(41.30, 29.10), P(41.30, 29.60), P(40.80, 29.60), P(40.80, 29.08)];
export const europeBosphorus = bosphorusEurope;

// --- Theodosian land walls, Marmara (south) to the Golden Horn (north)
export const landWalls = smooth(pts([
  [40.9935, 28.9225], [40.9985, 28.9195], [41.0040, 28.9170], [41.0085, 28.9160], [41.0140, 28.9175], [41.0185, 28.9195],
  [41.0215, 28.9217], [41.0250, 28.9262], [41.0295, 28.9335], [41.0330, 28.9385], [41.0362, 28.9377], [41.0398, 28.9388],
]), 6).concat([hornSouth[Math.round(hornSouth.length * 0.52)]]);
export const blachernaeFrom = 0.8;   // share of the land wall line where Blachernae (no moat) begins
export const seaWallMarmara = peninsulaCoast;
export const seaWallHorn = hornSouth.slice(0, Math.round(hornSouth.length * 0.52) + 1);

export const PLACES = {
  sophia: P(41.0086, 28.9802), hippodrome: P(41.0058, 28.9755), blachernae: P(41.0345, 28.9405),
  apostles: P(41.0195, 28.9497), goldenGate: P(40.9950, 28.9230), romanus: P(41.0215, 28.9217),
  lycus: P(41.0247, 28.9258), charisius: P(41.0295, 28.9335), galataTower: P(41.0256, 28.9741),
  camp: P(41.0192, 28.9060), rumeliHisar: P(41.0850, 29.0548), anadoluHisar: P(41.0823, 29.0668),
  rumeliShore: P(41.0845, 29.0570), anadoluShore: P(41.0825, 29.0648),
  doubleColumns: P(41.0395, 28.9990), fleetAnchor: P(41.0405, 29.0080), zaganos: P(41.0405, 28.9600),
  karaca: P(41.0385, 28.9280), ishak: P(41.0060, 28.9040), uskudar: P(41.0250, 29.0200), kadikoy: P(40.9900, 29.0300),
  marmaraSea: P(40.9800, 28.9600), bosphorus: P(41.0600, 29.0450), hornMid: hornC[Math.round(hornC.length * 0.45)],
  galata: P(41.0250, 28.9760), edirneDir: P(41.0500, 28.8700),
};

// the Genoese colony of Galata, a small walled town on the far bank
const nearestOn = (line, [x, y]) => line.reduce((b, p) => (Math.hypot(p[0] - x, p[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? p : b));
export const galataWall = smooth([
  nearestOn(hornNorth, P(41.0240, 28.9690)), P(41.0262, 28.9712), P(41.0275, 28.9742), P(41.0270, 28.9788), nearestOn(bosphorusEurope, P(41.0258, 28.9835)),
], 4);

// The Mese (main street) from Hagia Sophia out to the Charisius gate
export const mese = smooth(pts([
  [41.0086, 28.9795], [41.0092, 28.9745], [41.0088, 28.9712], [41.0102, 28.9640], [41.0125, 28.9580],
  [41.0145, 28.9552], [41.0195, 28.9497], [41.0240, 28.9425], [41.0295, 28.9338],
]), 5);

// chain across the mouth of the Golden Horn: city bank → Galata
export const chain = [hornSouth[1], [hornNorth[1][0] + 0.02, hornNorth[1][1] + 0.01]];

// overland route of the ships: Double Columns (Dolmabahçe) over the ridge to Kasımpaşa
const kasimpasa = hornNorth[Math.round(hornNorth.length * 0.3)];
export const shipRoute = smooth([
  P(41.0386, 29.0002), P(41.0398, 28.9935), P(41.0385, 28.9878), P(41.0375, 28.9815), P(41.0368, 28.9745), P(41.0355, 28.9690), kasimpasa,
], 8);

// hills (soft painted mounds) — centre, radius km
export const HILLS = [
  [P(41.0370, 28.9850), 0.9], [P(41.0450, 28.9700), 1.1], [P(41.0550, 28.9950), 1.2], [P(41.0700, 29.0150), 1.3],
  [P(41.0900, 29.0350), 1.4], [P(41.0180, 28.8900), 1.2], [P(41.0000, 28.8750), 1.1], [P(41.0450, 28.9150), 1.0],
  [P(41.0300, 29.0450), 1.0], [P(41.0550, 29.0750), 1.3], [P(41.0850, 29.0900), 1.4], [P(41.0050, 29.0400), 1.0],
  [P(41.1100, 29.0350), 1.4], [P(41.0620, 28.9600), 0.9],
];

export function lineLength(line) {
  let L = 0;
  for (let i = 1; i < line.length; i++) L += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  return L;
}
// point and direction at share f of a polyline
export function along(line, f) {
  const total = lineLength(line);
  let want = Math.max(0, Math.min(1, f)) * total;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (want <= l || i === line.length - 1) {
      const t = l ? Math.min(1, want / l) : 0;
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    want -= l;
  }
  const z = line[line.length - 1];
  return { x: z[0], y: z[1], ang: 0 };
}
// the part of a polyline between shares f0 and f1
export function slice(line, f0, f1) {
  const total = lineLength(line), out = [];
  let acc = 0;
  const a0 = f0 * total, a1 = f1 * total;
  const s = along(line, f0);
  out.push([s.x, s.y]);
  for (let i = 1; i < line.length; i++) {
    acc += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    if (acc > a0 && acc < a1) out.push(line[i]);
  }
  const e = along(line, f1);
  out.push([e.x, e.y]);
  return out;
}

// point-in-polygon for scattering houses and trees
export function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// the walled city as a polygon (land walls + Marmara coast + Golden Horn bank)
export const cityPoly = [...landWalls, ...seaWallHorn.slice().reverse(), ...peninsulaCoast.slice().reverse()];
