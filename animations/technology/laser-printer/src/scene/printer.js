// The multifunction colour laser printer, built from primitives as a cutaway model.
// The near side (+Z) is cut open: every part that crosses the cut shows a coral section face.
import * as THREE from 'three';
import {
  DEG, DRUM_R, DRUM_Y, DRUM_X, DRUM_LEN, TONER_RGB, ANG, FUSER_X, REG_X, BELT, SCAN, LID_HINGE,
  D_LASER, PAGE_W, PAGE_L, P_DRUM,
} from './layout.js';
import { makeMaterials, makeDrumMaterial, makePowderMaterial, makeHopperMaterial, makeBeltMaterial } from './materials.js';

const srgbToLin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lin = rgb => rgb.map(srgbToLin);

// ---- small builders
function box(x0, x1, y0, y1, z0, z1, mat, cut) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const m = new THREE.Mesh(g, cut ? [mat, mat, mat, mat, cut, mat] : mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}
// polyline stroked into a closed shape with mitred joints
function strokeShape(points, t) {
  const P = points.map(p => new THREE.Vector2(...p));
  const L = [], R = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[i], c = P[Math.min(P.length - 1, i + 1)];
    const d0 = b.clone().sub(a), d1 = c.clone().sub(b);
    if (d0.lengthSq() < 1e-9) d0.copy(d1);
    if (d1.lengthSq() < 1e-9) d1.copy(d0);
    d0.normalize(); d1.normalize();
    const n0 = new THREE.Vector2(-d0.y, d0.x), n1 = new THREE.Vector2(-d1.y, d1.x);
    const n = n0.clone().add(n1).normalize();
    const k = t / 2 / Math.max(0.3, n.dot(n1));
    L.push(b.clone().addScaledVector(n, k));
    R.push(b.clone().addScaledVector(n, -k));
  }
  const s = new THREE.Shape();
  L.forEach((p, i) => (i ? s.lineTo(p.x, p.y) : s.moveTo(p.x, p.y)));
  for (let i = R.length - 1; i >= 0; i--) s.lineTo(R[i].x, R[i].y);
  s.closePath();
  return s;
}
function arcPoints(cx, cy, r, a0, a1, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * DEG; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}
function extrude(shape, z0, z1, mat, cut) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, z0);
  return new THREE.Mesh(g, cut ? [cut, mat] : mat);
}
function cylinder(r, len, mat, seg = 48, open = false) {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}
// roller on a shaft; returns a group that can be spun with .rotation.z
function roller(r, len, mat, shaftMat, x, y, z = 0, shaftLen = len + 1.6) {
  const g = new THREE.Group();
  g.add(cylinder(r, len, mat, 48));
  const sh = cylinder(Math.min(0.18, r * 0.35), shaftLen, shaftMat, 16);
  g.add(sh);
  g.position.set(x, y, z);
  return g;
}

export class Printer {
  constructor(scene, envReady) {
    this.m = makeMaterials();
    this.root = new THREE.Group();
    scene.add(this.root);
    this.anchors = {};
    this.buildBody();
    this.buildTray();
    this.buildFeed();
    this.buildBelt();
    this.buildStations();
    this.buildLaserUnit();
    this.buildFuser();
    this.buildExit();
    this.buildBoard();
    this.buildScanner();
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.beams.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    this.scanLight.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  }

  // ---------------------------------------------------------------- shell
  buildBody() {
    const { shell, interior, cut, frame } = this.m;
    const Z0 = -12.8, Z1 = 12.8;
    const add = o => (this.root.add(o), o);
    add(box(-23, 22.6, 0, 0.8, Z0, Z1, shell, cut));                // base
    add(box(-23, -22.3, 0.8, 33.2, Z0, Z1, shell, cut));            // left wall
    add(box(21.9, 22.6, 6.0, 30.3, Z0, Z1, shell, cut));            // right wall (above the tray)
    add(box(-14, 22.6, 30.3, 30.9, Z0, Z1, shell, cut));            // output tray deck
    add(box(-23, -14, 32.6, 33.2, Z0, Z1, shell, cut));             // pillar roof
    add(box(-14.6, -14, 31.95, 33.2, Z0, Z1, shell, cut));          // pillar wall above the exit slot
    add(box(-23, 22.6, 0, 33.2, Z0 - 0.6, Z0, interior));          // back plate
    // subtle frame rails on the back plate
    add(box(-22.3, 21.9, 21.2, 21.6, Z0, Z0 + 0.6, frame));
    add(box(-22.3, 21.9, 9.6, 10.0, Z0, Z0 + 0.6, frame));
    // output tray stopper
    add(box(16.5, 17.0, 30.9, 31.6, -9, 9, this.m.shellWarm, cut));
    this.anchors.outputTray = new THREE.Vector3(4, 31.2, 6);
  }

  // ---------------------------------------------------------------- paper tray
  buildTray() {
    const { shellWarm, cut, interior } = this.m;
    const g = new THREE.Group();
    g.add(box(-17, 21.9, 0.8, 1.2, -11.6, 11.6, shellWarm, cut));   // tray floor
    g.add(box(-16.2, -15.6, 1.2, 5.8, -11.6, 11.6, shellWarm, cut)); // rear stop
    g.add(box(21.9, 23.6, 0.8, 6.0, -12.8, 12.8, this.m.shell, cut)); // tray front / handle
    g.add(box(23.2, 23.9, 2.2, 4.4, -6, 6, interior));                 // grip recess
    g.add(box(-11.6, -11.2, 1.2, 5.2, -11.6, -10.8, shellWarm));      // side guide
    // paper stack with visible sheet edges
    const c = document.createElement('canvas'); c.width = 16; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, 16, 256);
    for (let i = 0; i < 256; i += 2) { x.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`; x.fillRect(0, i, 16, 1); }
    const edge = new THREE.CanvasTexture(c); edge.colorSpace = THREE.SRGBColorSpace; edge.wrapS = edge.wrapT = THREE.RepeatWrapping;
    const top = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.9 });
    const side = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: edge });
    const stack = box(-14.85, 14.85, 1.25, 4.55, -10.5, 10.5, top);
    stack.material = [side, side, top, top, side, side];
    g.add(stack);
    this.root.add(g);
    this.anchors.stack = new THREE.Vector3(-4, 4.4, 8);
    this.anchors.tray = new THREE.Vector3(18, 2.5, 11);
  }

  // ---------------------------------------------------------------- pickup, separation, C-turn, registration
  buildFeed() {
    const { rubber, darkMetal, metal, cork, frame, cut, shellWarm } = this.m;
    const rubberSpeck = makePowderMaterial([0.09, 0.09, 0.1], 0x1c1d1f);
    rubberSpeck.userData.uniforms.uToner.value.setRGB(0.05, 0.05, 0.055);
    // D-shaped pickup roller
    const d = new THREE.Shape();
    const r = 1.1;
    d.absarc(0, 0, r, -50 * DEG, 230 * DEG, false);
    d.closePath();
    const dGeo = new THREE.ExtrudeGeometry(d, { depth: 3.2, bevelEnabled: false, curveSegments: 32 });
    const pick = new THREE.Group();
    for (const z of [-5.2, 2.0]) { const m = new THREE.Mesh(dGeo, rubberSpeck); m.position.z = z; pick.add(m); }
    pick.add(cylinder(0.2, 23, darkMetal, 16));
    pick.position.set(13.2, 5.75, 0);
    this.root.add(pick);
    this.pickup = pick;
    // separation pad
    const pad = box(-0.45, 0.45, -0.2, 0.2, -3, 3, cork);
    pad.position.set(15.9, 5.0, 0); pad.rotation.z = 50 * DEG;
    this.root.add(pad);
    // C-turn guides
    const outer = strokeShape(arcPoints(16, 8.925, 4.325 + 0.45, -80, 80), 0.18);
    const inner = strokeShape(arcPoints(16, 8.925, 4.325 - 0.45, -70, 70), 0.18);
    this.root.add(extrude(outer, -11.4, 11.4, frame, cut));
    this.root.add(extrude(inner, -11.4, 11.4, frame, cut));
    // feed roller pair in the turn
    this.turnRollers = [
      roller(0.5, 20, rubberSpeck, darkMetal, 16 + 4.325 + 0.53, 8.925),
      roller(0.45, 20, metal, darkMetal, 16 + 4.325 - 0.48, 8.925),
    ];
    this.turnRollers.forEach(o => this.root.add(o));
    // registration rollers
    this.regRollers = [
      roller(0.6, 22, metal, darkMetal, REG_X, 13.25 + 0.62),
      roller(0.6, 22, rubberSpeck, darkMetal, REG_X, 13.25 - 0.62),
    ];
    this.regRollers.forEach(o => this.root.add(o));
    // entry guide plate before the belt
    this.root.add(box(12.9, 13.5, 12.3, 12.6, -11, 11, shellWarm));
    this.anchors.pickup = new THREE.Vector3(13.2, 6.9, 5.2);
    this.anchors.sepPad = new THREE.Vector3(15.9, 5.2, 3);
    this.anchors.reg = new THREE.Vector3(REG_X, 13.9, 10);
    this.anchors.cturn = new THREE.Vector3(20.8, 8.9, 10);
  }

  // ---------------------------------------------------------------- belt + transfer rollers
  buildBelt() {
    const { darkMetal, metal } = this.m;
    const beltMat = makeBeltMaterial();
    this.beltMat = beltMat;
    const cy = BELT.top - BELT.r;
    const perim = [];
    const N = 120;
    const straight = BELT.x1 - BELT.x0;
    const total = 2 * straight + 2 * Math.PI * BELT.r;
    // walk the stadium: top run (x1 → x0), left half circle, bottom run, right half circle
    for (let i = 0; i <= N; i++) {
      const t = i / N * total;
      let x, y;
      if (t < straight) { x = BELT.x1 - t; y = BELT.top; }
      else if (t < straight + Math.PI * BELT.r) { const a = 90 * DEG + (t - straight) / BELT.r; x = BELT.x0 + BELT.r * Math.cos(a); y = cy + BELT.r * Math.sin(a); }
      else if (t < 2 * straight + Math.PI * BELT.r) { x = BELT.x0 + (t - straight - Math.PI * BELT.r); y = cy - BELT.r; }
      else { const a = -90 * DEG + (t - 2 * straight - Math.PI * BELT.r) / BELT.r; x = BELT.x1 + BELT.r * Math.cos(a); y = cy + BELT.r * Math.sin(a); }
      perim.push([x, y, t]);
    }
    const pos = [], uv = [], idx = [];
    const W = 11.6;
    perim.forEach(([x, y, t]) => { pos.push(x, y, -W, x, y, W); uv.push(t, -W, t, W); });
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    this.root.add(new THREE.Mesh(g, beltMat));
    this.beltRollers = [roller(BELT.r - 0.05, 23.4, darkMetal, darkMetal, BELT.x0, cy), roller(BELT.r - 0.05, 23.4, darkMetal, darkMetal, BELT.x1, cy)];
    this.beltRollers.forEach(o => this.root.add(o));
    this.transferRollers = DRUM_X.map(x => { const o = roller(0.5, 22, this.m.foam, metal, x, BELT.top - 0.06 - 0.5); this.root.add(o); return o; });
    this.anchors.belt = new THREE.Vector3(5.5, 12.6, 11);
    this.anchors.transferK = new THREE.Vector3(DRUM_X[3], 12.2, 9);
  }

  // ---------------------------------------------------------------- four imaging stations
  buildStations() {
    const { cartridge, cut, metal, darkMetal, rubberGray } = this.m;
    this.drums = []; this.devRollers = []; this.chargeRollers = []; this.agitators = [];
    const ZC = 2.0; // housings are cut away in front of this plane to show the drum
    DRUM_X.forEach((x0, k) => {
      const tl = lin(TONER_RGB[k]);
      const g = new THREE.Group();
      g.position.set(x0, DRUM_Y, 0);
      this.root.add(g);
      // housing profile (relative to the drum centre)
      const left = strokeShape([[-1.25, -1.28], [-2.35, -1.28], [-2.35, 3.2], [0.55, 3.2], [0.55, 1.72]], 0.14);
      const right = strokeShape([[1.62, 0.78], [1.62, 5.8], [2.95, 5.8], [2.95, -0.9], [2.35, -1.42], [1.4, -1.42]], 0.14);
      g.add(extrude(left, -11.4, ZC, cartridge, cut));
      g.add(extrude(right, -11.4, ZC, cartridge, cut));
      // toner-coloured label on the hopper top
      const lab = box(1.62, 2.95, 5.87, 5.95, -11.4, ZC, new THREE.MeshStandardMaterial({ color: new THREE.Color(...tl), roughness: 0.45 }));
      g.add(lab);
      // hopper contents (cut with the housing)
      const hop = box(1.72, 2.86, -0.35, 4.3, -11.3, ZC, makeHopperMaterial(tl));
      g.add(hop);
      const hopTop = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 13.3, 6, 30), hop.material);
      hopTop.rotation.x = -Math.PI / 2; hopTop.position.set(2.29, 4.3, -11.3 + 13.3 / 2);
      g.add(hopTop);
      // agitator paddle
      const ag = new THREE.Group();
      ag.add(box(-0.05, 0.05, -0.45, 0.45, -11, ZC - 0.2, darkMetal));
      ag.position.set(2.29, 2.6, 0);
      g.add(ag); this.agitators.push(ag);
      // drum
      const drumMat = makeDrumMaterial(tl);
      const drum = new THREE.Group();
      const dg = new THREE.CylinderGeometry(DRUM_R, DRUM_R, DRUM_LEN, 180, 1, true);
      dg.rotateX(Math.PI / 2);
      drum.add(new THREE.Mesh(dg, drumMat));
      // end flanges with a gear on the far end
      const flangeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(...tl).lerp(new THREE.Color(0.03, 0.03, 0.035), 0.55), roughness: 0.45 });
      const f0 = cylinder(DRUM_R * 0.8, 0.25, flangeMat, 40); f0.position.z = DRUM_LEN / 2; drum.add(f0);
      const gear = new THREE.Mesh(new THREE.CylinderGeometry(DRUM_R * 1.1, DRUM_R * 1.1, 0.6, 36, 1), flangeMat);
      gear.rotation.x = Math.PI / 2; gear.position.z = -DRUM_LEN / 2 - 0.3; drum.add(gear);
      const hub = cylinder(0.35, 0.3, metal, 20); hub.position.z = DRUM_LEN / 2 + 0.1; drum.add(hub);
      // alignment notch so the rotation reads at a glance
      const notch = box(-0.08, 0.08, DRUM_R * 0.55, DRUM_R * 0.92, DRUM_LEN / 2 + 0.12, DRUM_LEN / 2 + 0.2, darkMetal);
      drum.add(notch);
      g.add(drum);
      this.drums.push({ group: drum, mat: drumMat, x: x0 });
      // charge roller
      const ca = ANG.charge, cr = 0.45;
      const charge = roller(cr, DRUM_LEN - 0.6, makePowderMaterial([0.12, 0.12, 0.13], 0x2a2b2e), metal, (DRUM_R + cr) * Math.cos(ca), (DRUM_R + cr) * Math.sin(ca));
      g.add(charge); this.chargeRollers.push(charge);
      // developer roller with a toner layer
      const da = ANG.developer, dr = 0.55;
      const devMat = makePowderMaterial(tl, 0x303134);
      const dev = roller(dr, DRUM_LEN - 0.8, devMat, metal, (DRUM_R + dr + 0.06) * Math.cos(da), (DRUM_R + dr + 0.06) * Math.sin(da));
      g.add(dev); this.devRollers.push(dev);
      // doctor blade on the developer roller
      const doc = box(-0.03, 0.03, 0, 0.8, -11, ZC - 0.1, metal);
      doc.position.set(dev.position.x + 0.52, dev.position.y + 0.25, 0); doc.rotation.z = 20 * DEG;
      g.add(doc);
      // cleaning blade (urethane on a metal holder) + waste bin floor pile
      const ba = ANG.blade;
      const tip = new THREE.Vector2(DRUM_R * Math.cos(ba), DRUM_R * Math.sin(ba));
      const blade = box(-0.05, 0.05, 0, 1.25, -11.2, ZC - 0.1, rubberGray);
      blade.position.set(tip.x - 0.02, tip.y, 0); blade.rotation.z = 28 * DEG;
      g.add(blade);
      const holder = box(-0.12, 0.12, 0.85, 1.6, -11.2, ZC - 0.1, metal);
      holder.position.copy(blade.position); holder.rotation.z = 28 * DEG;
      g.add(holder);
      const waste = box(-2.25, -1.45, -1.2, -0.75, -11.2, ZC - 0.1, makeHopperMaterial(tl.map(v => v * 0.6)));
      g.add(waste);
      // anchors in world space
      const w = (x, y, z) => new THREE.Vector3(x0 + x, DRUM_Y + y, z);
      this.anchors[`drum${k}`] = w(0, DRUM_R, 6);
      if (k === 3) {
        this.anchors.drumK = w(-0.3, DRUM_R * 0.9, 7);
        this.anchors.chargeK = w(charge.position.x, charge.position.y + cr, 6);
        this.anchors.devK = w(dev.position.x + 0.2, dev.position.y - 0.3, 6);
        this.anchors.hopperK = w(2.29, 4.4, 1);
        this.anchors.bladeK = w(tip.x - 0.4, tip.y + 0.5, 6);
        this.anchors.wasteK = w(-1.85, -0.9, 1);
        this.anchors.laserHitK = w(DRUM_R * Math.cos(ANG.laser), DRUM_R * Math.sin(ANG.laser), 6);
        this.anchors.contactK = w(0, -DRUM_R, 8);
      }
    });
    this.anchors.cartridgeK = new THREE.Vector3(DRUM_X[3] + 2.3, DRUM_Y + 5.9, 1);
  }

  // ---------------------------------------------------------------- laser scanning unit
  buildLaserUnit() {
    const { shell, cut, interior, darkMetal, mirror, lens, frame } = this.m;
    const Y0 = 22.0, Y1 = 25.6, ZC = 1.0;
    const u = new THREE.Group();
    this.root.add(u);
    u.add(box(-13, 13, Y0, Y0 + 0.3, -11.8, ZC, frame, cut));       // floor with slits (visual only)
    u.add(box(-13, 13, Y1 - 0.3, Y1, -11.8, ZC, shell, cut));        // lid
    u.add(box(-13, -12.6, Y0 + 0.3, Y1 - 0.3, -11.8, ZC, shell, cut));
    u.add(box(12.6, 13, Y0 + 0.3, Y1 - 0.3, -11.8, ZC, shell, cut));
    u.add(box(-13, 13, Y0 + 0.3, Y1 - 0.3, -11.8, -11.4, interior));
    // polygon mirror: hexagonal prism on a motor
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.42, 6, 1), mirror);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.5, 32), darkMetal);
    motor.position.set(0, Y0 + 0.55, -1.5);
    hex.position.set(0, 23.6, -1.5);
    u.add(motor, hex);
    this.polygon = hex;
    // laser diode module
    const diode = box(-0.5, 0.5, 23.2, 24.0, -10.8, -9.2, darkMetal);
    u.add(diode);
    // f-theta lenses (long, curved) either side of the polygon
    for (const x of [-4, 4]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 20.5, 32, 1, false, x < 0 ? Math.PI * 0.5 : Math.PI * 1.5, Math.PI), lens);
      l.rotation.x = Math.PI / 2; l.scale.set(0.45, 1, 1);
      l.position.set(x, 23.6, -1.5);
      u.add(l);
    }
    // fold mirrors above each drum
    this.foldX = DRUM_X.map(x => x + DRUM_R * Math.cos(ANG.laser));
    this.foldX.forEach(x => {
      const m = box(-0.05, 0.05, -0.55, 0.55, -11.2, ZC - 0.1, mirror);
      m.position.set(x, 23.6, 0); m.rotation.z = (x < 0 ? -45 : 45) * DEG;
      u.add(m);
    });
    this.anchors.polygon = new THREE.Vector3(0, 24.1, -1.5);
    this.anchors.laserUnit = new THREE.Vector3(-8, 25.6, 0);
    this.anchors.diode = new THREE.Vector3(0, 24.0, -9.5);
    this.anchors.foldK = new THREE.Vector3(this.foldX[3], 24.2, 0);

    // beams (additive)
    this.beams = new THREE.Group();
    this.root.add(this.beams);
    const add = (o) => (this.beams.add(o), o);
    const beamMat = () => new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.laser = DRUM_X.map((dx, k) => {
      const fx = this.foldX[k];
      const hitY = DRUM_Y + DRUM_R * Math.sin(ANG.laser);
      // fan from the polygon to the fold mirror line
      const fanG = new THREE.BufferGeometry();
      fanG.setAttribute('position', new THREE.Float32BufferAttribute([0, 23.6, -1.5, fx, 23.6, -PAGE_W / 2, fx, 23.6, PAGE_W / 2], 3));
      const fan = add(new THREE.Mesh(fanG, beamMat()));
      // falling curtain from the fold mirror to the drum
      const cur = add(new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, 23.6 - hitY), beamMat()));
      cur.rotation.y = Math.PI / 2; cur.position.set(fx, (23.6 + hitY) / 2, 0);
      // bright moving rays
      const rayMat = new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const down = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8, 1, true), rayMat));
      const across = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 8, 1, true), rayMat));
      const spot = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff6040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
      spot.scale.setScalar(1.4);
      return { fan, cur, down, across, spot, rayMat, fx, hitY };
    });
    const src = new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.diodeRay = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1, true), src));
    placeRod(this.diodeRay, new THREE.Vector3(0, 23.6, -9.4), new THREE.Vector3(0, 23.6, -1.5));
  }

  // ---------------------------------------------------------------- fuser
  buildFuser() {
    const { metal, darkMetal, cut, rubberGray } = this.m;
    const x = FUSER_X;
    const top = strokeShape([[x - 1.8, 13.75], [x - 1.8, 16.6], [x + 1.9, 16.6], [x + 1.9, 13.75]], 0.16);
    const bot = strokeShape([[x - 1.8, 12.75], [x - 1.8, 10.55], [x + 1.9, 10.55], [x + 1.9, 12.75]], 0.16);
    this.root.add(extrude(top, -11.8, 11.8, darkMetal, cut));
    this.root.add(extrude(bot, -11.8, 11.8, darkMetal, cut));
    // heat roller: hollow sleeve with a halogen lamp inside
    const heatG = new THREE.Group();
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide, emissive: 0xff4a10, emissiveIntensity: 0 });
    heatG.add(cylinder(1.2, 22.6, sleeveMat, 48, true));
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb060 });
    const lamp = cylinder(0.14, 23.4, lampMat, 12);
    heatG.add(lamp);
    heatG.position.set(x, 13.25 + 1.22, 0);
    this.root.add(heatG);
    this.heatRoller = heatG; this.heatMat = sleeveMat; this.lampMat = lampMat;
    const pressMat = makePowderMaterial([0.2, 0.2, 0.21], 0x444547);
    this.pressRoller = roller(1.2, 22.6, pressMat, metal, x, 13.25 - 1.22);
    this.root.add(this.pressRoller);
    this.anchors.fuser = new THREE.Vector3(x, 15.7, 9);
    this.anchors.heatRoller = new THREE.Vector3(x, 15.5, 10);
    this.anchors.pressRoller = new THREE.Vector3(x, 10.9, 10);
    // guide plates on the vertical run
    this.root.add(extrude(strokeShape([[-20.45, 17], [-20.45, 28]], 0.14), -11, 11, this.m.frame, cut));
    this.root.add(extrude(strokeShape([[-19.55, 18], [-19.55, 27.5]], 0.14), -11, 11, this.m.frame, cut));
    this.root.add(extrude(strokeShape(arcPoints(-17.5, 15.75, 2.95, -100, -180, 12), 0.14), -11, 11, this.m.frame, cut));
    this.root.add(extrude(strokeShape(arcPoints(-17.5, 28.5, 2.95, 180, 95, 12), 0.14), -11, 11, this.m.frame, cut));
  }

  buildExit() {
    const { metal, darkMetal } = this.m;
    const rub = makePowderMaterial([0.08, 0.08, 0.09], 0x1c1d1f);
    this.exitRollers = [roller(0.5, 21.5, rub, darkMetal, -15.8, 31 + 0.52), roller(0.5, 21.5, metal, darkMetal, -15.8, 31 - 0.52)];
    this.exitRollers.forEach(o => this.root.add(o));
    this.anchors.exit = new THREE.Vector3(-15.8, 31.8, 10);
  }

  // ---------------------------------------------------------------- formatter board ("brain")
  buildBoard() {
    const { pcb, chip, gold } = this.m;
    const g = new THREE.Group();
    g.add(box(-12, 6, 6.2, 10.8, -12.2, -12.0, pcb));
    g.add(box(-6, -2.5, 7.2, 10.0, -12.0, -11.6, chip));      // processor
    g.add(box(-1.5, 1.5, 7.2, 8.4, -12.0, -11.75, chip));     // memory
    g.add(box(-1.5, 1.5, 8.8, 10.0, -12.0, -11.75, chip));
    g.add(box(2.5, 4.5, 7.0, 8.2, -12.0, -11.8, chip));
    g.add(box(-11.2, -9.2, 7.4, 9.4, -12.0, -11.3, this.m.darkMetal)); // USB socket
    for (let i = 0; i < 18; i++) g.add(box(-9 + i * 0.8, -8.85 + i * 0.8, 6.4, 6.9, -12.0, -11.95, gold));
    this.root.add(g);
    this.boardGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.8), new THREE.MeshBasicMaterial({ color: 0x46b8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.boardGlow.position.set(-4.25, 8.6, -11.55);
    this.root.add(this.boardGlow);
    this.anchors.board = new THREE.Vector3(-4.2, 10.0, -11.5);
    this.anchors.usb = new THREE.Vector3(-10.2, 8.4, -11.3);
  }

  // ---------------------------------------------------------------- flatbed scanner + lid
  buildScanner() {
    const { shell, cut, interior, metal, mirror, glass, darkMetal, pad, lens, frame } = this.m;
    const Z0 = -13, Z1 = 13;
    const add = o => (this.root.add(o), o);
    add(box(-23, 22.6, 33.8, 34.3, Z0, Z1, shell, cut));
    add(box(-23, -22.4, 34.3, 38.3, Z0, Z1, shell, cut));
    add(box(22.0, 22.6, 34.3, 38.3, Z0, Z1, shell, cut));
    add(box(-23, 22.6, 34.3, 38.3, Z0, Z0 + 0.6, interior));
    add(box(-22.4, 22.0, 34.3, 34.34, Z0 + 0.6, 12.4, interior));   // dark liner so the light path reads
    add(box(-22.4, -16, 37.86, 37.9, Z0 + 0.6, 12.4, interior));
    add(box(17, 22.0, 37.86, 37.9, Z0 + 0.6, 12.4, interior));
    add(box(-22.4, -22.36, 34.34, 37.86, Z0 + 0.6, 12.4, interior));
    add(box(21.96, 22.0, 34.34, 37.86, Z0 + 0.6, 12.4, interior));
    add(box(-22.4, -16, 37.9, 38.3, Z0, Z1, shell, cut));
    add(box(17, 22.0, 37.9, 38.3, Z0, Z1, shell, cut));
    add(box(-16, 17, 37.9, 38.3, Z0, -11.8, shell));
    add(box(-16, 17, 37.9, 38.3, 12.0, Z1, shell, cut));
    const gl = add(box(-16, 17, 37.95, 38.28, -11.8, 12.0, glass));
    gl.castShadow = false; gl.renderOrder = 2;
    // reference corner arrow on the frame
    const arrow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 3), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    arrow.rotation.x = -Math.PI / 2; arrow.rotation.z = Math.PI; arrow.position.set(-16.7, 38.31, -12.2);
    add(arrow);
    // rails
    add(box(-21.8, 21.4, 34.3, 34.7, -11.6, -11.0, metal));
    // fixed lens + CCD
    const lensBarrel = cylinder(0.55, 1.6, darkMetal, 24); lensBarrel.rotation.set(0, Math.PI / 2, 0); lensBarrel.position.set(19, 34.9, 0);
    add(lensBarrel);
    const lensGlass = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), lens); lensGlass.scale.set(0.35, 1, 1); lensGlass.position.set(18.15, 34.9, 0);
    add(lensGlass);
    add(box(20.3, 20.5, 34.4, 35.5, -1.4, 1.4, this.m.pcb));
    add(box(20.2, 20.3, 34.75, 35.05, -1.0, 1.0, this.m.chip));
    // full-rate carriage: lamp + first mirror
    const c1 = new THREE.Group();
    c1.add(box(-0.9, 0.9, 36.1, 36.3, -11.6, 11.6, frame));
    c1.add(box(0.6, 0.9, 36.3, 37.6, -11.6, 11.6, darkMetal));
    const lampBar = box(0.35, 0.75, 37.55, 37.8, -11.4, 11.4, this.m.lamp);
    c1.add(lampBar);
    const m1 = box(-0.03, 0.03, -0.6, 0.6, -11.3, 11.3, mirror); m1.position.set(0, 36.9, 0); m1.rotation.z = -45 * DEG; c1.add(m1);
    add(c1);
    this.carriage1 = c1; this.lampBar = lampBar;
    // half-rate carriage: two mirrors
    const c2 = new THREE.Group();
    c2.add(box(-0.7, 0.7, 34.5, 34.7, -11.6, 11.6, frame));
    const m2 = box(-0.03, 0.03, -0.55, 0.55, -11.3, 11.3, mirror); m2.position.set(0, 36.9, 0); m2.rotation.z = -45 * DEG; c2.add(m2);
    const m3 = box(-0.03, 0.03, -0.55, 0.55, -11.3, 11.3, mirror); m3.position.set(0, 34.9 + 0.35, 0); m3.rotation.z = 45 * DEG; c2.add(m3);
    c2.add(box(-0.6, -0.45, 34.7, 37.4, -11.6, 11.6, darkMetal));
    add(c2);
    this.carriage2 = c2;
    // light path ribbons
    this.scanLight = new THREE.Group();
    add(this.scanLight);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.lightMat = lightMat;
    this.lightGeo = new THREE.BufferGeometry();
    this.lightGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(5 * 4 * 3), 3));
    const li = [];
    for (let s = 0; s < 5; s++) { const a = s * 4; li.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.lightGeo.setIndex(li);
    const lm = new THREE.Mesh(this.lightGeo, lightMat); lm.frustumCulled = false;
    this.scanLight.add(lm);
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xd8f2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.lampGlow = new THREE.Sprite(glowMat); this.lampGlow.scale.set(6, 3, 1);
    this.scanLight.add(this.lampGlow);
    // lid, hinged along the back edge
    const lid = new THREE.Group();
    lid.position.set(0, LID_HINGE.y, LID_HINGE.z);
    const lidBody = box(-23, 22.6, 0.05, 1.7, 0, 26, shell, cut);
    lid.add(lidBody);
    const underside = new THREE.Mesh(new THREE.PlaneGeometry(33.5, 24.2), pad);
    underside.rotation.x = Math.PI / 2; underside.position.set(0.5, 0.04, 13);
    lid.add(underside);
    add(lid);
    this.lid = lid;
    // light leaking around the lid while scanning
    this.leak = new THREE.Mesh(new THREE.PlaneGeometry(45, 1.2), new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.leak.position.set(-0.2, 38.6, 13.05);
    add(this.leak);
    this.anchors.glass = new THREE.Vector3(-4, 38.3, 8);
    this.anchors.lid = new THREE.Vector3(10, 40.5, 0);
    this.anchors.lens = new THREE.Vector3(18.6, 35.5, 2);
    this.anchors.ccd = new THREE.Vector3(20.4, 35.5, 1.4);
    this.anchors.scanner = new THREE.Vector3(-20, 38.3, 12);
  }

  // ---------------------------------------------------------------- per-frame state
  update(st, time, covSampler) {
    const lv = st.lv;
    // drums
    const drumTravel = st.drumTravel;
    this.drums.forEach((d, k) => {
      d.group.rotation.z = -drumTravel / DRUM_R;
      const u = d.mat.userData.uniforms;
      u.uSep.value = st.sepTex; u.uMono.value = st.mono ? 1 : 0;
      u.uChan.value = [2, 1, 0, 3][k];
      u.uAlpha.value = -drumTravel / DRUM_R;
      u.uYk.value = lv - P_DRUM[k];
      u.uSince.value = lv - st.lvStart;
      u.uActive.value = st.drumActive[k] ? 1 : 0;
      u.uCharges.value = st.showCharges;
      u.uLatent.value = st.showLatent;
      this.chargeRollers[k].rotation.z = drumTravel / 0.45;
      this.devRollers[k].rotation.z = drumTravel / 0.55;
      this.agitators[k].rotation.z = drumTravel * 0.35;
      this.transferRollers[k].rotation.z = drumTravel / 0.5;
    });
    this.beltMat.userData.uniforms.uOffset.value = drumTravel;
    this.beltRollers.forEach(r => (r.rotation.z = drumTravel / (BELT.r - 0.05)));
    // paper feeding rollers follow the sheet
    const feed = st.feedTravel;
    this.pickup.rotation.z = st.pickupAngle;
    this.turnRollers[0].rotation.z = feed / 0.5; this.turnRollers[1].rotation.z = -feed / 0.45;
    this.regRollers[0].rotation.z = feed / 0.6; this.regRollers[1].rotation.z = -feed / 0.6;
    this.heatRoller.rotation.z = drumTravel / 1.2; this.pressRoller.rotation.z = -drumTravel / 1.2;
    this.exitRollers[0].rotation.z = feed / 0.5; this.exitRollers[1].rotation.z = -feed / 0.5;
    // fuser heat
    this.heatMat.emissiveIntensity = st.fuserHeat * 0.12;
    this.lampMat.color.setRGB(1, 0.45 + 0.35 * st.fuserHeat, 0.15 + 0.3 * st.fuserHeat).multiplyScalar(0.3 + 1.4 * st.fuserHeat);
    // polygon mirror
    this.polygon.rotation.y = st.polygonAngle;
    // laser beams
    const vis = st.laserVis;
    let anyOn = 0;
    this.laser.forEach((L, k) => {
      const row = lv - P_DRUM[k] + D_LASER;
      const writing = st.drumActive[k] && row >= 0 && row <= PAGE_L;
      const sweep = st.sweep;
      const z = -PAGE_W / 2 + PAGE_W * sweep;
      const u = 0.5 - z / PAGE_W;
      const ch = [2, 1, 0, 3][k];
      const cov = writing && covSampler ? covSampler(u, row / PAGE_L, ch, st.mono) : 0;
      const on = writing ? (cov > 0.4 ? 1 : 0.08) : 0;
      anyOn = Math.max(anyOn, writing ? 1 : 0);
      L.fan.material.opacity = writing ? 0.1 * vis : 0;
      L.cur.material.opacity = writing ? 0.07 * vis : 0;
      L.rayMat.opacity = on * vis;
      placeRod(L.down, new THREE.Vector3(L.fx, 23.6, z), new THREE.Vector3(L.fx, L.hitY, z));
      placeRod(L.across, new THREE.Vector3(0, 23.6, -1.5), new THREE.Vector3(L.fx, 23.6, z));
      L.spot.position.set(L.fx + 0.05, L.hitY + 0.05, z);
      L.spot.material.opacity = on * vis;
    });
    this.diodeRay.material.opacity = anyOn * vis;
    // board activity
    this.boardGlow.material.opacity = st.boardGlow;
    // scanner
    const xs = st.scanX;
    const xh = (xs - 18) / 2;
    this.carriage1.position.x = xs;
    this.carriage2.position.x = xh;
    this.lampBar.material.color.setScalar(st.lampOn ? 1 : 0.25);
    const lo = st.lampOn * st.scanLightVis;
    this.lightMat.opacity = 0.4 * lo;
    this.lampGlow.material.opacity = 0.9 * st.lampOn;
    this.lampGlow.position.set(xs + 0.4, 38.0, 9);
    this.leak.material.opacity = 0;
    this.leak.position.x = xs;
    this.leak.scale.x = 0.12;
    const P = this.lightGeo.attributes.position.array;
    const W = PAGE_W / 2;
    const quad = (i, a, b, wa, wb) => {
      const o = i * 12;
      P.set([a.x, a.y, -wa, a.x, a.y, wa, b.x, b.y, -wb, b.x, b.y, wb], o);
    };
    const v = (x, y) => new THREE.Vector2(x, y);
    quad(0, v(xs, 38.0), v(xs, 36.9), W, W);
    quad(1, v(xs, 36.9), v(xh, 36.9), W, W);
    quad(2, v(xh, 36.9), v(xh, 35.25), W, W * 0.92);
    quad(3, v(xh, 35.25), v(18.2, 34.95), W * 0.92, 0.35);
    quad(4, v(18.2, 34.95), v(20.25, 34.9), 0.35, 0.9);
    this.lightGeo.attributes.position.needsUpdate = true;
    // lid
    this.lid.rotation.x = -st.lidAngle;
  }
}

// ---- helpers shared with other modules
let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
export function placeRod(mesh, a, b) {
  _d.subVectors(b, a);
  const len = _d.length();
  mesh.position.copy(a).addScaledVector(_d, 0.5);
  mesh.scale.set(1, Math.max(1e-4, len), 1);
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(_up, _d.normalize());
}
