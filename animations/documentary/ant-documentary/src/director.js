// The film: for every story time t, place the actors, the camera, the lights and the graphics.
// Each chapter is a pure function of its local time u; events start at word cues (C.name).
import { Vector3, Quaternion, Color3, Color4, MeshBuilder, Matrix, PBRMaterial, TransformNode, ReflectionProbe, RenderTargetTexture } from '@babylonjs/core';
import { Ant, antennaMotion, groundFrame, groundSurf, groundPath, travel } from './ant.js';
import { groundH, makeBlade, grainMesh } from './world.js';
import { NEST_O, CHAMBERS, nestPath, nestSurf, nestFrame } from './nest.js';
import { LAB_O, simulate, shortShare } from './lab.js';
import { buildAphid, buildLadybird, buildSeed, buildPlant, buildBrood, dropMaterial } from './critters.js';
import { createRibbon } from './vision.js';
import { clamp, ease, easeOut, easeIn, lerp, smooth, rng } from './noise.js';

const V = (x, y, z) => new Vector3(x, y, z);
const ramp = (u, a, d) => ease(clamp((u - a) / d));
const win = (u, a, b, fi = 0.5, fo = 0.5) => clamp((u - a) / fi) * clamp((b - u) / fo);
const G = groundH;
const gsurf = groundSurf(G);
const onG = (x, z, dy = 0) => V(x, G(x, z) + dy, z);

// camera description: { pos, target, fov }
const cam = (pos, target, fov = 0.72) => ({ pos, target, fov });
const LENS = 0.62;
const orbit = (target, az, el, r, fov = 0.72) => cam(target.add(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).scale(r)), target, fov);
const mixCam = (a, b, k) => cam(Vector3.Lerp(a.pos, b.pos, k), Vector3.Lerp(a.target, b.target, k), lerp(a.fov, b.fov, k));
// behind/side of an ant frame: back (mm behind), side (mm to the right), up (mm)
const chase = (f, back, side, up, ahead = 1.5, fov = 0.72) => {
  const X = Vector3.Cross(f.up, f.fwd).normalize();
  const tgt = f.pos.add(f.up.scale(0.6)).add(f.fwd.scale(ahead));
  return cam(f.pos.add(f.fwd.scale(-back)).add(X.scale(side)).add(f.up.scale(up)), tgt, fov);
};
// shot sequence: [[t0, fn(u) → cam, blend]]; blends from the previous shot when blend > 0
function shots(u, list) {
  let k = 0;
  for (let i = 0; i < list.length; i++) if (u >= list[i][0]) k = i;
  const [t0, fn, blend = 0] = list[k];
  const c = fn(u);
  if (blend > 0 && k > 0 && u - t0 < blend) return mixCam(list[k - 1][1](u), c, ease((u - t0) / blend));
  return c;
}

export function createDirector(ctx) {
  const { scene, camera, env, world, nest, lab, T, overlay, mosaic, smell, tl, quality } = ctx;
  const { sun, sunDir, fill, shadows, fitShadow, setFocus, pipe } = env;
  const sky = scene.getMeshByName('sky');

  // ---------------- actors ----------------
  const ants = [];
  const mkAnt = (o) => { const a = new Ant(T, scene, o); ants.push(a); for (const i of a.all) shadows.addShadowCaster(i); return a; };
  const hero = mkAnt({ name: 'hero' });
  const sis = mkAnt({ name: 'sister' });
  const foe = mkAnt({ name: 'stranger', size: 1.08 });
  const crew = Array.from({ length: 12 }, (_, i) => mkAnt({ name: 'crew' + i, size: 0.92 + (i % 5) * 0.035 }));
  const queen = mkAnt({ name: 'queen', queen: true, size: 1.45 });
  const labAnts = Array.from({ length: 56 }, (_, i) => mkAnt({ name: 'lab' + i, size: 0.72 }));
  const hideAll = () => ants.forEach(a => a.setVisible(false));

  // hero props
  const seed = buildSeed(scene); seed.setEnabled(false); shadows.addShadowCaster(seed);
  const honeyMat = dropMaterial(scene, 'honey'), waterMat = dropMaterial(scene, 'water');
  const honey = MeshBuilder.CreateSphere('honey', { diameter: 1, segments: 24 }, scene); honey.material = honeyMat; honey.setEnabled(false);
  const shareDrop = MeshBuilder.CreateSphere('share', { diameter: 1, segments: 20 }, scene); shareDrop.material = honeyMat; shareDrop.setEnabled(false);
  const rain = MeshBuilder.CreateSphere('rain', { diameter: 1, segments: 32 }, scene); rain.material = waterMat; rain.setEnabled(false);
  const splash = MeshBuilder.CreateSphere('splash', { diameter: 1, segments: 10 }, scene); splash.material = waterMat; splash.setEnabled(false);
  const SPL = 26; const splBuf = new Float32Array(SPL * 16); splash.thinInstanceSetBuffer('matrix', splBuf, 16, false);
  const R0 = rng(4); const splDirs = Array.from({ length: SPL }, () => ({ a: R0() * 6.28, v: 18 + R0() * 26, up: 16 + R0() * 30, s: 0.12 + R0() * 0.3 }));

  // hero grains for the opening (big ones in the foreground)
  const grainMat = scene.getMaterialByName('grain');
  const heroGrains = [];
  const HG = [[-3.2, 15.4, 1.1, [0.7, 0.66, 0.6]], [-1.2, 17.8, 0.8, [0.45, 0.33, 0.24]], [-4.6, 19.5, 0.9, [0.2, 0.17, 0.15]], [0.8, 20.6, 0.6, [0.62, 0.5, 0.4]], [12.5, 1.0, 1.0, [0.66, 0.62, 0.56]]];
  HG.forEach(([x, z, r, c], i) => {
    const g = grainMesh(scene, 40 + i, 18);
    const m = new PBRMaterial('hg' + i, scene); m.albedoColor = new Color3(...c); m.metallic = 0; m.roughness = 0.55; m.bumpTexture = grainMat.bumpTexture;
    m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.2;
    g.material = m; g.scaling.set(r, r * 0.9, r * 1.1); g.position = onG(x, z, r * 0.45); g.rotation.y = i;
    g.parent = world.root; g.receiveShadows = true; shadows.addShadowCaster(g);
    heroGrains.push({ g, x, z, r });
  });

  // hero blades: one to measure (olcek), one to fall from (fizik)
  const scaleBlade = makeBlade(scene, world.grassMat, { x: 17.5, z: 13.5, L: 75, W: 4.2, bend: 0.25, yaw: 2.6, lean: 0.12, name: 'scaleBlade' });
  const fallBlade = makeBlade(scene, world.grassMat, { x: 27, z: -15, L: 58, W: 4.4, bend: 0.9, yaw: -0.4, lean: 0.45, name: 'fallBlade' });
  for (const b of [scaleBlade, fallBlade]) { b.mesh.parent = null; shadows.addShadowCaster(b.mesh); }

  // plant with aphids and a ladybird (chapter "ciftlik")
  const PLANT = V(-22, G(-22, 22) - 0.5, 22);
  const plant = buildPlant(scene, { height: 70, radius: 1.5 });
  plant.root.position.copyFrom(PLANT); plant.root.rotation.y = 0.4;
  plant.parts.forEach(p => { shadows.addShadowCaster(p); p.receiveShadows = true; });
  plant.root.computeWorldMatrix(true);
  const PW = () => plant.root.getWorldMatrix();
  const stemAxis = s => Vector3.TransformCoordinates(V(...plant.bend(s)), PW());
  const stemFrame = (s, th, down = true) => {
    const a = stemAxis(s), a2 = stemAxis(s + 0.004);
    const along = a2.subtract(a).normalize();
    let ref = V(Math.cos(th), 0, Math.sin(th));
    const radial = ref.subtract(along.scale(Vector3.Dot(ref, along))).normalize();
    const r = plant.radius(s);
    return { pos: a.add(radial.scale(r)), up: radial, fwd: down ? along.scale(-1) : along };
  };
  const stemSurf = { project: v => {
    // nearest axis point by sampling
    let best = 0, bd = 1e9;
    for (let s = 0; s <= 1; s += 0.01) { const d = Vector3.DistanceSquared(stemAxis(s), v); if (d < bd) { bd = d; best = s; } }
    const a = stemAxis(best), dir = v.subtract(a); const along = stemAxis(best + 0.004).subtract(a).normalize();
    const rad = dir.subtract(along.scale(Vector3.Dot(dir, along))).normalize();
    return a.add(rad.scale(plant.radius(best)));
  } };
  const aphid = buildAphid(scene);
  const aphids = [];
  const AR = rng(12);
  for (let i = 0; i < 16; i++) {
    const s = 0.24 + AR() * 0.16, th = 1.2 + (AR() - 0.5) * 2.2;
    const f = stemFrame(s, th, true);
    const inst = aphid.createInstance('aph' + i);
    const sz = i === 0 ? 1.05 : 0.55 + AR() * 0.45;
    const X = Vector3.Cross(f.up, f.fwd).normalize(), Z = Vector3.Cross(X, f.up).normalize();
    inst.position = f.pos.add(f.up.scale(-0.12 * sz)); inst.rotationQuaternion = Quaternion.RotationQuaternionFromAxis(X, f.up, Z);
    inst.scaling.setAll(sz);
    shadows.addShadowCaster(inst);
    aphids.push({ inst, s, th, sz, f });
  }
  const mainAphid = aphids[0];
  const ladybird = buildLadybird(scene); ladybird.setEnabled(false); shadows.addShadowCaster(ladybird);
  const setPlant = v => { plant.root.setEnabled(v); aphids.forEach(a => a.inst.setEnabled(v)); };

  // brood in the nest
  const brood = buildBrood(scene);
  const nestItems = [];
  const put = (mesh, x, y, z, rot = [0, 0, 0], s = 1) => {
    const i = mesh.createInstance(mesh.name + nestItems.length); i.position = NEST_O.add(V(x, y, z)); i.rotation.set(...rot); i.scaling.setAll(s);
    shadows.addShadowCaster(i); nestItems.push(i); return i;
  };
  const BR = rng(33);
  const floorY = (ch, x, zf = 0.45) => { const c = CHAMBERS[ch]; const q = 1 - ((x - c.c[0]) / c.rx) ** 2 - zf * zf; return c.c[1] - c.ry * Math.sqrt(Math.max(0, q)); };
  // eggs: clumps in the brood chamber and at the queen
  for (let i = 0; i < 46; i++) {
    const atQueen = i >= 26;
    const x = atQueen ? -20 + BR() * 3.5 : -41 + BR() * 5, z = 1.4 + BR() * 2.6;
    put(brood.egg, x, floorY(atQueen ? 'queen' : 'brood', x, 0.4) + 0.3 + BR() * 0.3 + (i % 5) * 0.06, z, [BR() * 3, BR() * 3, 0], 0.9 + BR() * 0.3);
  }
  const larvae = [];
  for (let i = 0; i < 7; i++) { const x = -34 + i * 2.6, z = 2 + BR() * 1.5; larvae.push(put(brood.larva, x, floorY('brood', x, 0.4) + 0.75, z, [0, BR() * 6, 0.2], 0.65 + BR() * 0.5)); }
  for (let i = 0; i < 9; i++) { const x = 12 + i * 2.3, z = 2.2 + (i % 2) * 1.5; put(brood.cocoon, x, floorY('cocoon', x, 0.4) + 0.8, z, [0, 0.3 + BR() * 0.4, 0.08], 1); }
  const setNestItems = v => nestItems.forEach(i => i.setEnabled(v));

  // pheromone ribbon from the food back to the nest
  const FOOD = world.FOOD;
  const alongTrail = (k = 0) => { const c = cam(onG(2 + k * 0.25, 10.5, 1.4), onG(26, 9.5, 0.6), 0.24); c.keepLens = true; return c; };
  const trailPath = groundPath([[FOOD.x - 3.8, FOOD.z - 0.8], [31, 11.5], [24, 9.6], [17, 7], [10, 4.4], [4, 1.8], [0.4, 0.2]], G);
  const ribbon = createRibbon(scene, 'trail', trailPath.at, trailPath.len, { width: 1.1 });
  const oldTrail = groundPath([[-30, 30], [-20, 20], [-10, 8], [-2, 1]], G);
  const ribbon2 = createRibbon(scene, 'trail2', oldTrail.at, oldTrail.len, { width: 0.6 });

  // the big dew drop refracts the real surroundings: a cube map rendered once from its centre
  const dew0 = world.dewList[0];
  const probe = new ReflectionProbe('dewProbe', quality === 'low' ? 256 : 512, scene, true);
  probe.position = V(dew0.x, dew0.y + dew0.d * 0.41, dew0.z);
  probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  probe.cubeTexture.samples = 4;
  for (const m of scene.meshes) if (m.isDescendantOf(world.root) && !/^(dew|mote|food)$/.test(m.name)) probe.renderList.push(m);
  if (sky) probe.renderList.push(sky);
  world.dewMat.subSurface.refractionTexture = probe.cubeTexture;
  probe.cubeTexture.level = 2.2;

  // lab simulation (run once)
  const sim = simulate({ n: labAnts.length, seconds: 70 });

  // ---------------- per-frame helpers ----------------
  let S; // frame state
  const applyCam = c0 => {
    // documentary lens: a longer focal length (narrower view) with the camera moved back so the
    // subject keeps its size; flatter perspective, softer background. Very wide overviews keep theirs.
    let c = c0;
    if (c0.fov > 0.32 && !c0.keepLens) {
      const f2 = c0.fov * LENS;
      const k = Math.tan(c0.fov / 2) / Math.tan(f2 / 2);
      let pos = c0.target.add(c0.pos.subtract(c0.target).scale(k));
      if (world.root.isEnabled() && Math.abs(pos.x) < 1400 && Math.abs(pos.z) < 1400) { const gy = G(pos.x, pos.z) + 0.35; if (pos.y < gy) pos.y = gy; }
      c = cam(pos, c0.target, f2);
    }
    // a hint of handheld: slow, low-frequency drift, proportional to distance
    const d0 = Vector3.Distance(c.pos, c.target), tt = S.t;
    const hh = V(Math.sin(tt * 0.61) + 0.5 * Math.sin(tt * 1.37 + 1), Math.sin(tt * 0.53 + 2) + 0.5 * Math.sin(tt * 1.19), Math.sin(tt * 0.47 + 4)).scale(d0 * 0.0035);
    const ht = V(Math.sin(tt * 0.71 + 3), Math.sin(tt * 0.67 + 5), Math.sin(tt * 0.59)).scale(d0 * 0.002);
    c = cam(c.pos.add(hh), c.target.add(ht), c.fov);
    camera.position.copyFrom(c.pos); camera.setTarget(c.target);
    // portrait screens: keep a (slightly cropped) landscape width instead of a narrow slice
    const asp = scene.getEngine().getAspectRatio(camera);
    if (asp < 1) { camera.fovMode = 1; camera.fov = 2 * Math.atan(Math.tan(c.fov / 2) * 16 / 9 * 0.62); }
    else { camera.fovMode = 0; camera.fov = c.fov; }
    const d = Vector3.Distance(c.pos, c.target);
    camera.minZ = clamp(d * 0.015, 0.01, 2); camera.maxZ = Math.max(4000, d * 400);
    camera.computeWorldMatrix(true); scene.updateTransformMatrix(true);
    S.dist = d;
  };
  const surfaceLook = () => {
    world.setVisible(true); nest.setVisible(false); lab.setVisible(false); sky.setEnabled(true);
    sun.direction = sunDir.scale(-1); sun.intensity = 4.2; sun.diffuse = new Color3(1, 0.86, 0.66);
    fill.intensity = 0.12; scene.environmentIntensity = 1;
    setPlant(true); setNestItems(false);
    scaleBlade.mesh.setEnabled(true); fallBlade.mesh.setEnabled(true);
  };
  const nestLook = () => {
    world.setVisible(false); nest.setVisible(true); lab.setVisible(false); sky.setEnabled(false);
    scene.clearColor = new Color4(0.01, 0.006, 0.004, 1);
    const d = V(-0.3, -0.45, 1).normalize(); sun.direction = d; sun.intensity = 4.6; sun.diffuse = new Color3(1, 0.7, 0.5);
    fill.intensity = 0.2; scene.environmentIntensity = 0.45;
    setPlant(false); setNestItems(true); scaleBlade.mesh.setEnabled(false); fallBlade.mesh.setEnabled(false);
  };
  const labLook = () => {
    world.setVisible(false); nest.setVisible(false); lab.setVisible(true); sky.setEnabled(false);
    scene.clearColor = new Color4(0.18, 0.18, 0.19, 1);
    sun.direction = V(0.2, -1, 0.35).normalize(); sun.intensity = 2.1; sun.diffuse = new Color3(1, 0.98, 0.95);
    fill.intensity = 0.5; scene.environmentIntensity = 0.8;
    setPlant(false); setNestItems(false); scaleBlade.mesh.setEnabled(false); fallBlade.mesh.setEnabled(false);
  };
  // stand an ant on the ground at x,z facing yaw (degrees of freedom for small idle motions)
  const stand = (a, x, z, yaw, t, extra = {}) => {
    a.setVisible(true);
    const f = groundFrame(x, z, yaw, G);
    a.pose({ ...f, s: 0, moving: 0, surf: gsurf, ant: antennaMotion(t, a.size * 7, 0.8), ...extra });
    return f;
  };
  // stop-start walking: speed along the path swells and dips (short runs, brief pauses)
  const stopStart = s => Math.max(0, s - 0.8 * Math.sin(s * 2 * Math.PI / 6.5) * 6.5 / (2 * Math.PI));
  const walk = (a, path, s0, t, extra = {}) => {
    a.setVisible(true);
    const s = path.len ? Math.min(path.len, stopStart(s0)) : stopStart(s0);
    const f = path.at(s);
    a.pose({ ...f, s, path: path.at, surf: gsurf, stride: 1.5, ant: antennaMotion(t, a.size * 7), ...extra });
    return f;
  };
  const headPt = (a, z = 0.9) => a.worldPoint(0, 0.05, z, a.neck);
  const eyePt = (a, k = 1) => a.worldPoint(0.42 * k, 0.05, 0.5, a.neck);
  const gasterPt = (a, z = -0.7) => a.worldPoint(0, 0.1, z, a.gasterNode);
  const mesoPt = a => a.worldPoint(0, 0.2, 0.1);

  const smellOff = () => { smell.hideAll(); ribbon.show(0, 0, 0); ribbon2.show(0, 0, 0); };

  // ---------------- chapters ----------------
  const heroPath1 = groundPath([[0.3, 0.2], [2.5, 0.8], [6, 1.5], [10, 2.1], [14, 3.4], [19, 6.2], [24, 8.2], [30, 9.8], [36, 10.6]], G);

  const CH = {};

  CH.acilis = (u, C, ch) => {
    surfaceLook();
    // hero: first standing at the nest rim, then walking out
    const tWalk = C.resident - 0.8;
    const s = Math.max(0, travel(u - tWalk, [[0, 0], [1.2, 2.6]]));
    let f;
    if (u < C.rocks) f = stand(hero, -2, 9, 1.1, u, { headPitch: -0.05 });
    else f = walk(hero, heroPath1, s, u, { moving: u > tWalk ? 1 : 0 });
    const eye = eyePt(hero, 1);
    const eyeOut = eye.subtract(hero.worldPoint(0, 0.05, 0.5, hero.neck)).normalize();
    const c = shots(u, [
      [0, uu => {
        const k = ease(clamp((uu - 0.6) / (C.rocks - 1.2)));
        const d = lerp(0.42, 3.4, Math.pow(k, 1.6));
        const side = Vector3.Cross(eyeOut, V(0, 1, 0)).normalize();
        return cam(eye.add(eyeOut.scale(d)).add(side.scale(d * 0.35 * k)).add(V(0, d * 0.25, 0)), eye.add(V(0, -0.1 * k, 0)).add(side.scale(-0.4 * k)), 0.55);
      }],
      [C.rocks, uu => { const k = (uu - C.rocks); return cam(onG(-7 + k * 0.35, 13.2 + k * 0.5, 0.75), onG(1.5 + k * 0.25, 21.5, 0.4), 0.78); }],
      [C.towers, uu => { const k = ease(clamp((uu - C.towers) / 3.2)); return cam(onG(-4.5, 9.5, 1.0), V(-13, lerp(6, 44, k), 22), 0.8); }, 1.4],
      [C.resident, uu => { const fa = heroPath1.at(s); return cam(onG(7.5, 1.2, 1.9), fa.pos.add(V(0, 0.5, 0)), 0.6); }],
      [C.size - 0.3, uu => chase(heroPath1.at(s), 1.2, 7.5, 1.6, 0.4, 0.62), 1.0],
      [C.follow, uu => chase(heroPath1.at(s), 7.5, 3.2, 2.2, 3, 0.7), 1.6],
    ]);
    applyCam(c);
    S.macro = u < C.rocks ? 3.2 : 2.2;
    if (u >= C.rocks && u < C.towers) { S.focus = Vector3.Distance(c.pos, heroGrains[0].g.position); }
    // title
    const tOp = win(u, 0.9, 4.4, 0.9, 0.9);
    overlay.panel('title', tOp, el => {
      el.style.cssText += 'left:clamp(20px,6vw,90px);top:50%;transform:translateY(-50%);';
      el.innerHTML = `<div style="font:600 13px var(--sans);letter-spacing:.3em;color:var(--gold)">MAKRO BELGESEL</div><div style="font-family:var(--serif);font-style:italic;font-weight:320;font-size:clamp(40px,6.4vw,92px);line-height:.98;margin-top:14px;text-shadow:0 0 30px rgba(0,0,0,.6)">Karıncanın<br>Gözünde Hayat</div>`;
    });
    S.fade = 1 - clamp(u / 1.1);
    if (u >= C.grains - 0.2 && u < C.towers) overlay.label('grain', { at: heroGrains[0].g.position.add(V(0, 0.9, 0)), text: 'kum tanesi', sub: 'yaklaşık 1 mm', off: [70, -60], op: win(u, C.grains, C.towers, 0.4, 0.4) });
    if (u >= C.towers && u < C.resident) overlay.label('blade', { at: V(-13, 30, 22), text: 'çim yaprağı', sub: '5–12 cm', off: [80, 20], op: win(u, C.towers + 1.2, C.resident, 0.5, 0.4) });
    if (u >= C.size) {
      const a = gasterPt(hero, -1.4), b = headPt(hero, 1.05);
      overlay.measure('antlen', a, b, { text: '4–5 mm', op: win(u, C.size, C.follow + 0.4, 0.4, 0.5), side: -1, pad: 26 });
    }
    S.scale = u > C.rocks ? 0.9 : 0;
  };

  CH.olcek = (u, C, ch) => {
    surfaceLook();
    const s0 = 7;
    const s = s0 + travel(u, [[0, 2.6]]);
    let c;
    if (u < C.blade) {
      const f = walk(hero, heroPath1, s, u);
      c = chase(f, 1.5, -7, 1.4, 0.5, 0.62);
    } else if (u < C.grain) {
      // at the foot of the measuring blade, looking up
      const f = stand(hero, 15.2, 10.2, 0.9, u);
      const top = scaleBlade.at(0.98).pos, base = scaleBlade.at(0).pos;
      const k = ease(clamp((u - C.blade) / 2.6));
      c = cam(Vector3.Lerp(onG(9.5, 3.5, 2.2), base.add(V(-62, 30, -70)), k), Vector3.Lerp(f.pos.add(V(0, 1, 0)), Vector3.Lerp(base, top, 0.5), k), lerp(0.7, 0.8, k)); c.keepLens = true;
      applyCam(c);
      const op = win(u, C.blade + 1.2, C.grain, 0.5, 0.4);
      overlay.measure('bladeM', base.add(V(0, 0.6, 0)), top, { text: '7,5 cm', op, side: 1, pad: 18 });
      overlay.label('bladeH', { at: Vector3.Lerp(base, top, 0.62), text: 'insan ölçeğinde: 32 m', sub: 'on katlı bir bina', cls: 'gold', off: [-90, 0], op });
      overlay.label('bladeAnt', { at: f.pos.add(V(0, 0.8, 0)), text: 'karınca', off: [-70, 40], op });
    } else if (u < C.drop) {
      const g = heroGrains[4];
      const f = stand(hero, g.x - 3.2, g.z - 0.2, Math.PI / 2 - 0.1, u, { headPitch: -0.1 });
      c = cam(onG(g.x - 1.8, g.z - 7.5, 1.1), onG(g.x - 1.5, g.z, 0.8), 0.7);
      applyCam(c);
      const op = win(u, C.grain + 0.6, C.drop, 0.4, 0.4);
      overlay.measure('grainM', onG(g.x, g.z - 1.1, 0), onG(g.x, g.z - 1.1, g.r * 1.8), { text: '2 mm', op, side: 1, pad: 40 });
      overlay.label('grainH', { at: onG(g.x, g.z, g.r * 1.8), text: 'insan ölçeğinde: 85 cm', sub: 'bele kadar gelen bir kaya', cls: 'gold', off: [90, -50], op });
    } else if (u < C.go) {
      const d = world.dewList[0];
      const f = stand(hero, d.x - 3.3, d.z - 1.5, 1.1, u, { headPitch: 0.1 });
      c = cam(onG(d.x - 4.5, d.z - 8.5, 1.6), onG(d.x - 1.6, d.z - 0.3, 1.1), 0.68);
      applyCam(c);
      const op = win(u, C.drop + 0.6, C.go + 0.2, 0.4, 0.4);
      overlay.measure('dropM', V(d.x - d.d / 2, d.y + d.d * 0.41, d.z), V(d.x + d.d / 2, d.y + d.d * 0.41, d.z), { text: '3 mm', op, side: -1, pad: 44 });
      overlay.label('dropH', { at: V(d.x, d.y + d.d * 0.8, d.z), text: 'bir su küresi', sub: 'neredeyse karıncanın boyu kadar', cls: 'gold', off: [100, -40], op });
    } else {
      const f = walk(hero, heroPath1, 16 + travel(u - C.go, [[0, 2.6]]), u);
      const k = ease(clamp((u - C.go) / 5));
      c = cam(f.pos.add(V(lerp(-5, -26, k), lerp(3, 26, k), lerp(-8, -30, k))), f.pos.add(V(0, 0.5, 0)), 0.7);
    }
    applyCam(c);
    S.macro = 2.2; S.scale = 1;
    // ×425 comparison
    overlay.panel('x425', win(u, C.human, C.blade + 0.4, 0.5, 0.5), el => {
      el.style.cssText += 'right:clamp(16px,4vw,60px);top:clamp(70px,14vh,140px);';
      el.innerHTML = `<svg width="260" height="170" viewBox="0 0 260 170" style="overflow:visible">
        <g fill="#f3ebdd" stroke="none">
          <ellipse cx="34" cy="148" rx="9" ry="5"/><ellipse cx="48" cy="147" rx="5" ry="3.5"/><ellipse cx="58" cy="146" rx="5" ry="4.5"/>
          <path d="M200 22 a10 10 0 1 1 0.1 0 Z"/><path d="M188 38 h24 l6 52 h-8 l-4 -36 v76 h-9 v-44 h-2 v44 h-9 v-76 l-4 36 h-8 z"/>
        </g>
        <path d="M70 146 C 110 146, 140 100, 176 90" stroke="#f2c46b" stroke-width="1.6" fill="none" marker-end="url(#ah)"/>
        <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#f2c46b"/></marker></defs>
        <text x="24" y="168" fill="#f3ebdd" font-family="Hanken Grotesk" font-size="15">4 mm</text>
        <text x="182" y="168" fill="#f3ebdd" font-family="Hanken Grotesk" font-size="15">1,7 m</text>
        <text x="102" y="104" fill="#f2c46b" font-family="Fraunces" font-style="italic" font-size="30">×425</text>
      </svg>`;
    });
  };

  CH.beden = (u, C, ch) => {
    surfaceLook();
    const X0 = -9, Z0 = -6;
    const idle = u;
    // exploded view: head forward, petiole + gaster back
    const ex = ramp(u, C.fused, 1.6) * (1 - ramp(u, C.armor, 1.4));
    const f = stand(hero, X0, Z0, 0.3, idle, { headPitch: -0.12 });
    hero.neck.position.z = 0.64 + ex * 0.9;
    hero.pet.position.z = -0.68 - ex * 0.45;
    hero.gasterNode.position.z = -0.78 - ex * 1.0;
    // camera: slow orbit, then a clean profile for the exploded view
    const tgt = f.pos.add(V(0, 0.6, 0));
    const az = lerp(-2.2, -1.2, clamp(u / C.fused)) ;
    const c = shots(u, [
      [0, uu => orbit(tgt, -2.4 + uu * 0.05, 0.42, 8.8, 0.62)],
      [C.fused - 0.6, uu => orbit(tgt.add(V(0.15, 0, 0)), 0.3 - Math.PI / 2 + 0.25 + (uu - C.fused) * 0.012, 0.16, 10.5, 0.62), 1.6],
      [C.armor, uu => orbit(tgt, -1.0 + (uu - C.armor) * 0.05, 0.5, 8.5, 0.62), 1.6],
    ]);
    applyCam(c);
    S.macro = 1.6; S.scale = 1;
    const p = {
      head: headPt(hero, 0.45), meso: mesoPt(hero), prop: hero.worldPoint(0, 0.15, -0.42), pet: hero.worldPoint(0, 0.25, 0, hero.pet), gas: gasterPt(hero, -0.6),
    };
    overlay.label('female', { at: p.head, text: 'işçi · dişi', sub: 'yuvadaki bütün işçiler dişidir', off: [-80, -70], op: win(u, C.female + 0.3, C.school, 0.4, 0.4) });
    // textbook model first
    const tb = win(u, C.parts, C.fused + 0.2, 0.3, 0.4);
    overlay.label('tb-h', { at: p.head, text: 'baş', off: [0, -80], op: tb });
    overlay.label('tb-t', { at: p.meso, text: 'göğüs', off: [0, -90], op: tb });
    overlay.label('tb-a', { at: p.gas, text: 'karın', off: [0, -80], op: tb });
    // real ant anatomy
    const an = win(u, C.fused + 1.0, C.armor + 0.4, 0.5, 0.5);
    overlay.label('a-h', { at: p.head, text: 'baş', off: [20, -90], op: an });
    overlay.label('a-m', { at: p.meso, text: 'mezozoma', sub: 'göğüs + karnın 1. halkası', cls: 'gold', off: [-40, -110], op: win(u, C.meso - 0.4, C.armor + 0.4, 0.5, 0.5) });
    overlay.label('a-p', { at: p.prop, text: 'propodeum', sub: 'göğse kaynaşmış 1. karın halkası', off: [-30, 90], op: win(u, C.fused + 1.4, C.waist + 1.2, 0.5, 0.5) });
    overlay.label('a-w', { at: p.pet, text: 'bel (petiyol)', sub: 'karnın 2. halkası', cls: 'gold', off: [30, 100], op: win(u, C.waist, C.armor + 0.4, 0.4, 0.5) });
    overlay.label('a-g', { at: p.gas, text: 'gaster', sub: 'karnın geri kalanı', off: [40, -90], op: win(u, C.waist + 1.2, C.armor + 0.4, 0.5, 0.5) });
    const legsOp = win(u, C.legs, C.armor + 0.3, 0.4, 0.4);
    if (legsOp > 0) for (const [i, leg] of [0, 2, 4].map(k => [k, hero.legs[k]])) overlay.label('leg' + i, { at: leg.coxa.position, text: i === 2 ? 'altı bacağın hepsi mezozomada' : '', off: i === 2 ? [0, 110] : [0, 0], op: legsOp, line: i === 2 });
    overlay.label('armor', { at: gasterPt(hero, -0.9).add(V(0, 0.3, 0)), text: 'dış iskelet: kitin', sub: 'kemik yok, sert bir zırh', off: [70, -70], op: win(u, C.armor + 0.4, C.breath, 0.4, 0.4) });
    const br = win(u, C.breath, ch.dur, 0.4, 0.5);
    if (br > 0) {
      overlay.label('sp1', { at: hero.worldPoint(0.2, 0.05, -0.42), text: 'solunum delikleri', sub: 'hava borucuklarla (trake) dağılır', off: [60, 80], op: br });
      overlay.label('sp2', { at: hero.worldPoint(0.34, 0.05, -0.3, hero.gasterNode), text: '', off: [0, 0], op: br, line: false });
      overlay.label('sp3', { at: hero.worldPoint(0.36, 0.05, -0.55, hero.gasterNode), text: '', off: [0, 0], op: br, line: false });
    }
  };

  CH.gozler = (u, C, ch) => {
    surfaceLook();
    const f = stand(hero, -2, 9, 1.1, u, { headPitch: -0.12, headYaw: 0.05 * Math.sin(u * 0.7) });
    const eye = eyePt(hero, 1);
    const eyeOut = eye.subtract(hero.worldPoint(0, 0.05, 0.5, hero.neck)).normalize();
    // POV for the mosaic: from the hero's head, looking at a sister walking toward it
    const povPath = groundPath([[10.5, 15.3], [6.5, 13.2], [3.4, 11.7], [1.6, 10.8]], G);
    const sisS = travel(u - C.point + 1, [[0, 2.4]]);
    if (u > C.mosaic - 3) walk(sis, povPath, Math.min(povPath.len, sisS), u);
    const c = shots(u, [
      [0, uu => orbit(eye, 0.9 + uu * 0.03, 0.2, 5.5, 0.6)],
      [C.eye, uu => { const d = lerp(2.2, 1.2, ease((uu - C.eye) / 3)); return cam(eye.add(eyeOut.scale(d)).add(V(0, d * 0.3, 0)), eye, 0.6); }, 1.2],
      [C.facets, uu => { const d = lerp(0.9, 0.42, ease((uu - C.facets) / 3)); return cam(eye.add(eyeOut.scale(d)).add(V(0, d * 0.2, 0)), eye, 0.55); }, 1.2],
      [C.point - 0.2, uu => { const h = headPt(hero, 0.7); const fw = f.fwd; return cam(h.add(V(0, 0.25, 0)).add(fw.scale(0.4)), h.add(fw.scale(12)).add(V(0, -0.6, 0)), 1.1); }],
    ]);
    applyCam(c);
    S.macro = u < C.point ? 3 : 0.4;
    S.scale = u < C.point ? 1 : 0;
    overlay.label('ceye', { at: eye, text: 'bileşik göz', off: [-90, -70], op: win(u, C.eye + 0.3, C.facets, 0.4, 0.4) });
    overlay.label('omm', { at: eye.add(V(0, 0.02, 0)), text: 'ommatidyum', sub: 'her biri ayrı bir mercek', off: [-110, -80], op: win(u, C.facets + 0.6, C.point - 0.3, 0.4, 0.3) });
    // ≈100 facets graphic
    overlay.panel('hex100', win(u, C.hundred, C.point - 0.2, 0.4, 0.3), el => {
      el.style.cssText += 'right:clamp(16px,5vw,80px);top:50%;transform:translateY(-50%);text-align:center;';
      let h = '';
      for (let i = 0; i < 100; i++) { const r = Math.floor(i / 10), q = i % 10; const x = q * 17 + (r % 2) * 8.5, y = r * 14.7; h += `<polygon class="hx" style="opacity:0" points="${[0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 6 + k * Math.PI / 3; return (x + 9 + 8.2 * Math.cos(a)).toFixed(1) + ',' + (y + 9 + 8.2 * Math.sin(a)).toFixed(1); }).join(' ')}" fill="rgba(242,196,107,.18)" stroke="#f2c46b" stroke-width="1"/>`; }
      el.innerHTML = `<svg width="190" height="160" viewBox="0 0 190 160">${h}</svg><div style="font-family:var(--serif);font-size:40px;margin-top:6px;text-shadow:0 0 10px #000">≈ 100</div><div style="font-size:15px;opacity:.85;text-shadow:0 0 8px #000">mercek · her gözde</div>`;
    }, el => { const k = clamp((u - C.hundred) / 1.6); el.querySelectorAll('.hx').forEach((p, i) => { p.style.opacity = i / 100 < k ? 1 : 0; }); });
    // mosaic wipe
    const split = u < C.point ? 1 : u < C.blur ? lerp(1, 0.5, ease((u - C.point) / 1.2)) : lerp(0.5, 0, ease((u - C.blur) / 1.2));
    const back = ramp(u, ch.dur - 1.6, 1.2);
    mosaic.split = lerp(split, 1, back); mosaic.amount = u > C.point - 0.1 ? 1 : 0; mosaic.cols = 13;
    const lab = win(u, C.point + 0.6, C.blur + 0.2, 0.4, 0.4);
    overlay.panel('splitL', lab, el => { el.className = 'panel split-lbl'; el.style.left = 'clamp(12px,3vw,40px)'; el.innerHTML = '<span class="lg">BİZİM GÖRDÜĞÜMÜZ</span><span class="sh">BİZ</span>'; });
    overlay.panel('splitR', lab, el => { el.className = 'panel split-lbl'; el.style.right = 'clamp(12px,3vw,40px)'; el.innerHTML = '<span class="lg">KARINCANIN GÖRDÜĞÜ <span style="opacity:.7;font-weight:400">(yaklaşık)</span></span><span class="sh">KARINCA</span>'; });
    overlay.panel('divider', mosaic.split < 0.995 && mosaic.split > 0.005 ? 0.9 : 0, el => { el.className = 'panel divider'; }, el => { el.style.left = (mosaic.split * 100).toFixed(2) + '%'; });
  };

  CH.koku = (u, C, ch) => {
    surfaceLook();
    const tap = 1 + 0.6 * win(u, 0, C.map, 0.5, 0.5);
    // grooming: the right antenna is pulled down and drawn through the comb on the foreleg
    const groom = win(u, 0.4, C.senses - 0.3, 0.6, 0.6);
    const am = antennaMotion(u * 1.3, 3, tap);
    if (groom > 0) am[1] = am[1].map((v, i) => lerp(v, [0.35, 0.45, 0.9, 1.25][i], groom));
    let f = stand(hero, -2, 9, 1.1, u, { headPitch: -0.2 + 0.08 * Math.sin(u * 1.3) + 0.25 * groom, headYaw: 0.2 * groom, ant: am });
    if (groom > 0) {
      hero.antennae[1].elbow.computeWorldMatrix(true);
      const stroke = 0.5 + 0.45 * Math.sin(u * 7);          // the leg slides along the flagellum
      const onAnt = Vector3.TransformCoordinates(V(0, -0.1, 0.15 + stroke * 0.75), hero.antennae[1].elbow.getWorldMatrix());
      const rest = hero.legs[1].tarsus.position.add(V(0, 0, 0));
      f = stand(hero, -2, 9, 1.1, u, { headPitch: -0.2 + 0.08 * Math.sin(u * 1.3) + 0.25 * groom, headYaw: 0.2 * groom, ant: am, bodyPitch: -0.12 * groom, footWorld: { R1: Vector3.Lerp(rest, onAnt, groom) } });
    }
    const antTip = hero.antennae[1].elbow;
    antTip.computeWorldMatrix(true);
    const elbow = Vector3.TransformCoordinates(V(0, 0, 0), antTip.getWorldMatrix());
    const mid = Vector3.TransformCoordinates(V(0, -0.05, 0.55), antTip.getWorldMatrix());
    const tipP = Vector3.TransformCoordinates(V(0, -0.12, 1.05), antTip.getWorldMatrix());
    const h = headPt(hero, 0.6);
    const c = shots(u, [
      [0, uu => orbit(h, 2.4 + uu * 0.04, 0.35, 6.5, 0.6)],
      [C.antenna, uu => { const k = uu - C.antenna; return cam(mid.add(V(1.6, 1.1, 1.8 - k * 0.05)), Vector3.Lerp(elbow, tipP, 0.4), 0.6); }, 1.3],
      [C.genes, uu => orbit(h, 2.0 + (uu - C.genes) * 0.05, 0.3, 7, 0.62), 1.2],
      [C.map - 0.4, uu => { const k = ease(clamp((uu - C.map + 0.4) / 3)); return cam(V(lerp(10, -4, k), lerp(4, 30, k), lerp(-4, -30, k)), V(lerp(6, 16, k), 0, lerp(6, 10, k)), 0.75); }, 1.8],
    ]);
    applyCam(c);
    S.macro = u < C.map ? 2.2 : 0.9; S.scale = u < C.map ? 1 : 0.8;
    overlay.label('elbow', { at: elbow, text: 'dirsek', off: [-80, -60], op: win(u, C.antenna + 0.5, C.senses, 0.4, 0.4) });
    overlay.label('segs', { at: mid, text: 'anten: 12 halka', sub: 'uzun bir sap + 11 halkalı kamçı', cls: 'gold', off: [70, 70], op: win(u, C.antenna + 1, C.senses + 0.2, 0.4, 0.4) });
    const senses = ['koku', 'tat', 'dokunma', 'nem', 'sıcaklık', 'titreşim'];
    const sd = C.genes - C.senses;
    senses.forEach((w, i) => overlay.label('sn' + i, { at: tipP, text: w, off: [-150 + (i % 3) * 110, -150 + Math.floor(i / 3) * 44], op: win(u, C.senses + i * sd / 7, C.genes, 0.3, 0.4), line: false, cls: 'center' }));
    overlay.panel('genes', win(u, C.genes, C.map, 0.5, 0.4), el => {
      el.style.cssText += 'left:clamp(16px,5vw,80px);top:clamp(70px,16vh,160px);width:min(420px,80vw);text-shadow:0 0 8px #000';
      const row = (n, v, w, c) => `<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:15px"><span>${n}</span><span style="font-family:var(--serif);font-size:18px">${v}</span></div><div style="height:8px;background:rgba(243,235,221,.15);margin-top:5px"><div class="gb" data-w="${w}" style="height:100%;width:0;background:${c}"></div></div></div>`;
      el.innerHTML = `<div style="font:600 13px var(--sans);letter-spacing:.22em;color:var(--gold);margin-bottom:6px">KOKU ALMA GENLERİ</div>${row('Karıncalar', '300–400+', 100, '#f2c46b')}${row('Bal arısı', '≈ 170', 42, 'rgba(243,235,221,.7)')}${row('Meyve sineği', '≈ 60', 15, 'rgba(243,235,221,.7)')}`;
    }, el => { const k = ease(clamp((u - C.genes - 0.3) / 1.5)); el.querySelectorAll('.gb').forEach(b => b.style.width = (b.dataset.w * k) + '%'); });
    // smell vision
    const sm = ramp(u, C.map - 0.2, 1.5);
    mosaic.dim = sm * 0.7;
    if (sm > 0) smellField(u, sm, { food: true, colony: true, trails: true });
    overlay.label('map', { at: onG(20, 9, 1), text: 'koku haritası', sub: 'feromon izleri · yiyecek · yuva kokusu', off: [60, -90], op: win(u, C.map + 1.4, ch.dur, 0.5, 0.6) });
  };

  // odour field shared by chapters
  function smellField(u, amt, o) {
    if (o.colony) {
      const pf = []; const Rr = rng(5);
      for (let i = 0; i < 70; i++) { const a = Rr() * 6.28, r = Math.pow(Rr(), 0.6) * 9; const y = 0.5 + Rr() * 3 + Math.sin(u * 0.3 + i) * 0.4; pf.push({ x: Math.cos(a + u * 0.03) * r, y: G(0, 0) + y, z: Math.sin(a + u * 0.03) * r, s: 2 + Rr() * 3 }); }
      smell.set('colony', pf, camera, 0.3 * amt);
    }
    if (o.food) {
      const pf = []; const Rr = rng(6);
      for (let i = 0; i < 90; i++) { const k = ((i / 90) + u * 0.04) % 1; const d = k * 30; const spread = 0.8 + k * 5; pf.push({ x: FOOD.x - d * 0.7 + (Rr() - 0.5) * spread, y: G(FOOD.x, FOOD.z) + 0.6 + k * 3 + Rr() * 1.5, z: FOOD.z - d * 0.4 + (Rr() - 0.5) * spread * 1.4, s: 1.2 + k * 3.5 }); }
      smell.set('food', pf, camera, 0.38 * amt);
    }
    if (o.trails) { ribbon2.show(0, oldTrail.len, 0.55 * amt); ribbon.show(0, trailPath.len, 0.45 * amt); }
  }

  CH.kimlik = (u, C, ch) => {
    surfaceLook();
    // hero from the left, sister from the right; meet at (−12, 4)
    const mx = -12, mz = 4;
    const pa = groundPath([[mx - 14, mz - 2], [mx - 1.6, mz]], G), pb = groundPath([[mx + 14, mz + 3], [mx + 1.6, mz]], G);
    const meet = C.touch - 0.4;
    const sa = Math.min(pa.len, travel(u - meet + pa.len / 3, [[0, 3]]));
    const sb = u < C.mate + 0.6 ? Math.min(pb.len, travel(u - meet + pb.len / 3, [[0, 3]])) : pb.len;
    const tt = win(u, meet, C.mate + 0.6, 0.4, 0.4);
    const antTouch = [[0.45, -0.15, 0.7, 0.2], [0.45, -0.15, 0.7, 0.2]];
    const mixA = (a, b, k) => a.map((r, i) => r.map((v, j) => lerp(v, b[i][j], k)));
    walk(hero, pa, sa, u, { moving: sa < pa.len ? 1 : 0, ant: mixA(antennaMotion(u, 1), antTouch.map((r, i) => r.map((v, j) => v + 0.12 * Math.sin(u * 9 + i + j))), tt) });
    if (u < C.mate + 0.6) walk(sis, pb, sb, u, { moving: sb < pb.len ? 1 : 0, ant: mixA(antennaMotion(u, 2), antTouch.map((r, i) => r.map((v, j) => v + 0.12 * Math.sin(u * 8 + i * 2 + j))), tt) });
    else { // sister walks on past
      const pc = groundPath([[mx + 1.6, mz], [mx + 3, mz - 3], [mx + 10, mz - 12]], G);
      walk(sis, pc, travel(u - C.mate - 0.6, [[0, 1], [1, 3]]), u);
    }
    // stranger arrives, meets the hero, both bristle, stranger turns away
    const foeIn = groundPath([[mx - 6, mz + 14], [mx - 3.5, mz + 3.5], [mx - 2.5, mz + 1.8]], G);
    const foeOut = groundPath([[mx - 2.5, mz + 1.8], [mx - 4, mz + 5], [mx - 12, mz + 16]], G);
    const fin = C.foe - 1.6;
    if (u > fin) {
      if (u < C.card) walk(foe, foeIn, Math.min(foeIn.len, travel(u - fin, [[0, 4]])), u, { moving: travel(u - fin, [[0, 4]]) < foeIn.len ? 1 : 0, mand: 0.1 + 0.6 * win(u, C.foe, C.card, 0.3, 0.3) });
      else walk(foe, foeOut, travel(u - C.card, [[0, 1], [1, 5]]), u);
    }
    // hero reacts: mandibles open, body raised
    const threat = win(u, C.foe + 0.3, C.card + 0.8, 0.3, 0.5);
    hero.pose && null;
    const tgt = onG(mx, mz, 0.7);
    const c = shots(u, [
      [0, uu => cam(onG(mx - 2, mz - 13, 3), onG(mx, mz, 0.6), 0.62)],
      [C.touch - 0.2, uu => cam(onG(mx + 0.3, mz - 5.8, 1.4), onG(mx, mz, 0.9), 0.55), 1],
      [C.foe - 0.8, uu => orbit(tgt.add(V(-1.2, 0, 1)), -0.6 + (uu - C.foe) * 0.04, 0.3, 8, 0.62), 1.2],
      [C.card + 1, uu => orbit(tgt.add(V(-1, 0, 1)), -0.3 + (uu - C.card) * 0.05, 0.5, 11, 0.62), 1.4],
    ]);
    // re-pose hero with threat posture (after camera choice: hero stays where it is)
    if (threat > 0) {
      const f = pa.at(sa);
      const yawTo = Math.atan2((mx - 2.5) - f.pos.x, (mz + 1.8) - f.pos.z);
      const fr = groundFrame(f.pos.x, f.pos.z, lerp(Math.atan2(f.fwd.x, f.fwd.z), yawTo, threat), G);
      hero.pose({ ...fr, s: sa, moving: 0, surf: gsurf, mand: 0.1 + 0.8 * threat, bodyH: 0.15 * threat, bodyPitch: -0.12 * threat, gaster: 0.35 * threat, ant: antennaMotion(u * 1.6, 1) });
    }
    applyCam(c);
    S.macro = 1.2; S.scale = 1; S.focus = Vector3.Distance(c.pos, hero.root.position);
    const aura = win(u, C.odor, C.card + 1.5, 0.6, 0.6);
    mosaic.dim = aura * 0.55;
    if (aura > 0) {
      const col = [], red = [];
      const Rr = rng(9);
      const addAura = (a, arr) => { for (let i = 0; i < 14; i++) { const p = a.worldPoint((Rr() - 0.5) * 1.4, 0.3 + Rr() * 0.5, -1.8 + Rr() * 3.4); arr.push({ x: p.x + Math.sin(u + i) * 0.1, y: p.y, z: p.z, s: 0.45 + Rr() * 0.5 }); } };
      addAura(hero, col); if (sis.visible) addAura(sis, col); if (foe.visible) addAura(foe, red);
      smell.set('colony', col, camera, 0.22 * aura); smell.set('foe', red, camera, 0.28 * aura);
    }
    overlay.label('odor', { at: mesoPt(hero), text: 'koloni kokusu', sub: 'zırhı kaplayan ince, yağlı tabaka', cls: 'teal', off: [-40, -100], op: win(u, C.odor + 0.3, C.mate, 0.4, 0.3) });
    overlay.label('mate', { at: headPt(sis, 0.4), text: 'yuvadaş ✓', cls: 'teal', off: [60, -70], op: win(u, C.mate, C.foe - 0.6, 0.3, 0.4) });
    if (foe.visible) overlay.label('foe', { at: headPt(foe, 0.4), text: 'yabancı ✕', sub: 'başka bir koloninin kokusu', cls: 'red', off: [-60, -80], op: win(u, C.foe + 0.4, C.card + 0.6, 0.3, 0.4) });
    overlay.label('card', { at: mesoPt(hero), text: 'kimlik kartı = koku', cls: 'big center', off: [0, -120], op: win(u, C.card + 0.6, ch.dur, 0.4, 0.5), line: false });
  };

  CH.iz = (u, C, ch) => {
    surfaceLook();
    const approach = groundPath([[FOOD.x - 16, FOOD.z - 9], [FOOD.x - 9, FOOD.z - 4], [FOOD.x - 4.6, FOOD.z - 1.1]], G);
    const turn = groundPath([[FOOD.x - 4.6, FOOD.z - 1.1], [FOOD.x - 5.4, FOOD.z - 0.2], [FOOD.x - 6.5, FOOD.z - 0.5]], G);
    const drinkEnd = C.lay - 0.6;
    const fill = 1 + 0.2 * ramp(u, C.drink, 3);
    let hf, sBack = 0;
    if (u < C.find + 1) hf = walk(hero, approach, Math.min(approach.len, travel(u + 0.2, [[0, 2.6]])), u, { moving: travel(u + 0.2, [[0, 2.6]]) < approach.len ? 1 : 0 });
    else if (u < drinkEnd) { const fr = approach.at(approach.len); hf = fr; hero.setVisible(true); hero.pose({ ...fr, s: approach.len, moving: 0, surf: gsurf, headPitch: 0.35 * ramp(u, C.find + 1, 0.8), mand: 0.45, fill, ant: antennaMotion(u * 1.4, 1, 0.6) }); }
    else { sBack = travel(u - drinkEnd, [[0, 0.8], [1, 3]]); hf = walk(hero, trailPath, sBack, u, { fill: 1.2, gaster: 0.25 + 0.22 * Math.max(0, Math.sin(sBack * 2.2)) }); }
    // recruits follow the trail out to the food
    const nR = 9;
    for (let i = 0; i < crew.length; i++) {
      const a = crew[i];
      if (i >= nR || u < C.recruit - 0.5) { a.setVisible(false); continue; }
      const start = C.recruit - 0.5 + i * 1.1;
      const sOut = trailPath.len - travel(u - start, [[0, 3.2 + (i % 3) * 0.3]]);
      if (u < start || sOut < 0.5) { a.setVisible(false); continue; }
      // walking the path backwards (nest → food): flip the frame
      const fr = trailPath.at(sOut);
      const lat = Math.sin(i * 2.3 + u * 0.7) * 0.5;
      const X = Vector3.Cross(fr.up, fr.fwd).normalize();
      const pathRev = s => { const q = trailPath.at(trailPath.len - s); const Xq = Vector3.Cross(q.up, q.fwd).normalize(); return { pos: q.pos.add(Xq.scale(lat)), fwd: q.fwd.scale(-1), up: q.up }; };
      const sw = trailPath.len - sOut;
      const fp = pathRev(sw);
      a.setVisible(true);
      a.pose({ ...fp, s: sw, path: pathRev, surf: gsurf, stride: 1.5, ant: antennaMotion(u, i + 3), headPitch: 0.15 });
    }
    // the drop gets smaller as the source runs out (time-lapse)
    const gone = ramp(u, C.fade, 3.5);
    world.food.scaling.set(7 * (1 - gone * 0.95), 2.3 * (1 - gone * 0.9), 5.5 * (1 - gone * 0.95));
    // pheromone ribbon from the food back toward the hero
    const smv = ramp(u, C.lay - 0.5, 1.2);
    mosaic.dim = smv * (u > C.recruit ? 0.25 : 0.6) * (1 - ramp(u, ch.dur - 1.2, 1));
    const strength = 0.6 + 0.4 * ramp(u, C.reinforce, 2);
    ribbon.show(0, u < drinkEnd ? 0 : Math.min(trailPath.len, sBack + 0.2), smv * strength * (1 - ramp(u, C.fade + 0.5, 4)));
    if (smv > 0) {
      const pf = []; const Rr = rng(8);
      const upTo = Math.min(trailPath.len, sBack);
      const np = Math.min(120, Math.floor(upTo * 2.5)); for (let i = 0; i < np; i++) { const s = Rr() * upTo; const fr = trailPath.at(s); pf.push({ x: fr.pos.x + (Rr() - 0.5) * 1.2, y: fr.pos.y + 0.3 + Rr() * 1.4 + Math.sin(u * 0.8 + i) * 0.2, z: fr.pos.z + (Rr() - 0.5) * 1.2, s: 0.8 + Rr() * 1.6 }); }
      smell.set('trail', pf, camera, 0.07 * smv * strength * (1 - ramp(u, C.fade + 0.5, 4)));
    }
    const c = shots(u, [
      [0, uu => chase(hf, 6, -4, 2.4, 3, 0.66)],
      [C.find + 0.8, uu => cam(onG(FOOD.x - 4.2, FOOD.z - 6.8, 1.6), onG(FOOD.x - 4.2, FOOD.z - 1, 0.7), 0.6), 1.2],
      [C.lay + 0.2, uu => chase(hf, -5, -4, 3.2, 0, 0.68), 1.4],
      [C.recruit, uu => alongTrail(uu - C.recruit), 1.6],
    ]);
    applyCam(c);
    S.macro = u < C.recruit ? 1.8 : 0.7; S.scale = 1;
    overlay.label('crop', { at: gasterPt(hero, -0.5), text: 'kursak', sub: 'yuvaya taşınan "sosyal mide"', cls: 'gold', off: [-70, -80], op: win(u, C.drink + 0.3, C.lay, 0.4, 0.4) });
    overlay.label('pher', { at: trailPath.at(Math.max(0.5, sBack - 3)).pos, text: 'feromon izi', sub: 'bağırsaktan gelen bir koku', cls: 'violet', off: [60, 70], op: win(u, C.trail, C.recruit, 0.4, 0.4) });
    overlay.label('evap', { at: trailPath.at(trailPath.len * 0.5).pos, text: 'bir saat içinde büyük ölçüde uçar', cls: 'violet', off: [40, -90], op: win(u, C.fade + 0.8, ch.dur, 0.5, 0.5) });
    overlay.label('lapse', { at: [overlay.W - 30, 30], text: 'hızlandırılmış', off: [0, 0], line: false, cls: 'right', op: win(u, C.fade, ch.dur, 0.4, 0.4) });
  };

  CH.kisayol = (u, C, ch) => {
    const inLab = u >= C.exp - 0.2;
    if (!inLab) {
      surfaceLook();
      // the busy trail seen from above
      const nR = 10;
      for (let i = 0; i < crew.length; i++) {
        const a = crew[i]; if (i >= nR) { a.setVisible(false); continue; }
        const s = ((i * 6.3 + u * 3.2) % trailPath.len);
        const dir = i % 2 ? 1 : -1;
        const ss = dir > 0 ? s : trailPath.len - s;
        const pathD = dir > 0 ? trailPath.at : (q => { const f = trailPath.at(trailPath.len - q); return { ...f, fwd: f.fwd.scale(-1) }; });
        a.setVisible(true); const fp = pathD(dir > 0 ? ss : s);
        a.pose({ ...fp, s: dir > 0 ? ss : s, path: pathD, surf: gsurf, ant: antennaMotion(u, i) });
      }
      applyCam(alongTrail(u));
      ribbon.show(0, trailPath.len, 0.35);
      mosaic.dim = 0.3;
      S.macro = 0.5; S.scale = 0.8;
      S.fade = ramp(u, C.exp - 0.9, 0.7);
      return;
    }
    labLook();
    S.fade = 1 - ramp(u, C.exp - 0.2, 0.8);
    const simT = Math.max(0, (u - C.bridges + 1) * 1.9);
    const k = Math.min(sim.frames.length - 1, Math.floor(simT / sim.dt));
    const fr = sim.frames[k];
    const Hh = 3;
    labAnts.forEach((a, i) => {
      const x = fr.fr[i * 4], z = fr.fr[i * 4 + 1], yaw = fr.fr[i * 4 + 2], sp = fr.fr[i * 4 + 3];
      if (sp < 0 || simT <= 0) { a.setVisible(false); return; }
      const lane = sim.lane[i];
      const fw = V(Math.sin(yaw), 0, Math.cos(yaw));
      const X = V(fw.z, 0, -fw.x);
      const pos = LAB_O.add(V(x, Hh, z)).add(X.scale(lane));
      const dist = sim.dist[k][i];
      const path = s => ({ pos: pos.add(fw.scale(s - dist)), fwd: fw, up: V(0, 1, 0) });
      a.setVisible(true);
      a.pose({ pos, fwd: fw, up: V(0, 1, 0), s: dist, path, surf: { project: v => V(v.x, LAB_O.y + Hh, v.z) }, stride: 1.5, moving: sp > 0 ? 1 : 0, ant: antennaMotion(u, i) });
    });
    // pheromone on the branches
    const Cs = fr.Cs, Cl = fr.Cl;
    lab.tintS.material.alpha = clamp(Cs / 40) * 0.6; lab.tintL.material.alpha = clamp(Cl / 40) * 0.6;
    const c = shots(u, [
      [C.exp - 0.2, uu => { const q = ease(clamp((uu - C.exp) / 7)); return cam(LAB_O.add(V(lerp(-150, -20, q), lerp(60, 150, q), lerp(-90, -120, q))), LAB_O.add(V(lerp(-60, 0, q), 0, lerp(0, 22, q))), 0.72); }],
      [C.faster, uu => cam(LAB_O.add(V(-78 + (uu - C.faster) * 2, 55, -40)), LAB_O.add(V(-30, 0, 16)), 0.72), 2],
      [C.win, uu => cam(LAB_O.add(V(-10 + (uu - C.win) * 2, 150, -110)), LAB_O.add(V(0, 0, 22)), 0.72), 2.5],
    ]);
    applyCam(c);
    S.macro = 0.35; S.scale = 0;
    const lbl = win(u, C.bridges, C.win, 0.5, 0.5);
    overlay.label('lnest', { at: LAB_O.add(V(-104, 17, 0)), text: 'yuva', off: [0, -60], op: lbl });
    overlay.label('lfood', { at: LAB_O.add(V(104, 5, 0)), text: 'yiyecek', off: [0, -60], op: lbl });
    overlay.label('lshort', { at: LAB_O.add(V(0, 3, 0)), text: 'kısa köprü', cls: 'gold', off: [0, 70], op: lbl });
    overlay.label('llong', { at: LAB_O.add(V(0, 3, 54)), text: 'uzun köprü', sub: 'yaklaşık iki kat', off: [0, -60], op: lbl });
    overlay.label('lref', { at: [30, overlay.H - 40], text: 'Goss ve ark. (1989) deneyinin canlandırması', off: [0, 0], line: false, op: win(u, C.exp + 0.5, ch.dur, 0.5, 0.5) * 0.8 });
    const share = shortShare(sim, simT, 9);
    overlay.panel('share', win(u, C.split, ch.dur, 0.5, 0.6), el => {
      el.style.cssText += 'right:clamp(16px,4vw,60px);top:clamp(20px,5vh,50px);width:min(300px,70vw);text-shadow:0 0 8px #000';
      el.innerHTML = `<div style="font:600 12px var(--sans);letter-spacing:.2em;color:var(--gold)">SON KARARLAR</div><div style="display:flex;height:12px;margin:8px 0 6px;background:rgba(243,235,221,.15)"><div class="bs" style="background:#f2c46b;width:50%"></div><div class="bl" style="background:rgba(243,235,221,.55);flex:1"></div></div><div style="display:flex;justify-content:space-between;font-size:15px"><span>kısa <b class="ps">50</b>%</span><span>uzun <b class="pl">50</b>%</span></div><div style="font-size:12px;opacity:.7;margin-top:4px">hızlandırılmış</div>`;
    }, el => { const v = share == null ? 0.5 : share; el.querySelector('.bs').style.width = (v * 100).toFixed(0) + '%'; el.querySelector('.ps').textContent = Math.round(v * 100); el.querySelector('.pl').textContent = 100 - Math.round(v * 100); });
    overlay.panel('noleader', win(u, C.noleader, C.self, 0.4, 0.4), el => { el.classList.add('toptxt'); el.style.cssText += 'left:50%;top:clamp(20px,8vh,70px);transform:translateX(-50%);font-family:var(--serif);font-size:clamp(20px,2.6vw,32px);font-style:italic;white-space:nowrap;text-shadow:0 0 12px #000'; el.textContent = 'lider yok · harita yok · plan yok'; });
    overlay.panel('selforg', win(u, C.self, ch.dur, 0.5, 0.6), el => { el.classList.add('toptxt'); el.style.cssText += 'left:50%;top:clamp(20px,8vh,70px);transform:translateX(-50%);text-align:center;text-shadow:0 0 12px #000'; el.innerHTML = '<div style="font:600 12px var(--sans);letter-spacing:.3em;color:var(--gold)">BUNA DENİR Kİ</div><div style="font-family:var(--serif);font-size:clamp(26px,3.4vw,44px);font-style:italic;margin-top:6px">kendiliğinden örgütlenme</div>'; });
  };

  CH.guc = (u, C, ch) => {
    surfaceLook();
    const p = groundPath([[-24, -8], [-16, -5], [-8, -2.6], [-2, -0.6]], G);
    const s = travel(u, [[0, 2.2]]);
    const f = walk(hero, p, s % p.len, u, { headPitch: -0.28, mand: 0.55, bodyH: 0.05 });
    // seed held in the mandibles, lifted up in front
    seed.setEnabled(true);
    seed.parent = hero.neck; seed.position.set(0, 0.35, 1.9); seed.rotation.set(-0.95, 0.15, 0.2); seed.scaling.setAll(1);
    const dimK = win(u, C.double - 0.3, C.giant + 0.2, 0.6, 0.6);
    const c = shots(u, [
      [0, uu => chase(f, 2, 6.5, 1.6, 0.8, 0.62)],
      [C.double - 0.4, uu => chase(f, 7, 9, 5, 0, 0.7), 1.6],
      [C.giant, uu => chase(f, -6, 5, 2, 0, 0.62), 1.4],
    ]);
    applyCam(c);
    S.macro = 1.8; S.scale = 1;
    S.fade = dimK * 0.55;
    overlay.label('load', { at: seed.getAbsolutePosition(), text: 'tohum', sub: 'bazı karıncalar ağırlıklarının onlarca katını taşır', off: [60, -80], op: win(u, C.carry + 0.4, C.double - 0.4, 0.4, 0.4) });
    overlay.panel('cube', dimK, el => {
      el.style.cssText += 'left:50%;top:48%;transform:translate(-50%,-50%);text-align:center;width:min(760px,94vw);padding:28px 10px;text-shadow:0 0 10px #000;background:radial-gradient(closest-side,rgba(8,6,4,.78),rgba(8,6,4,.5) 60%,rgba(8,6,4,0))';
      const cube = (x, y, a, cls) => { const h = a * 0.5; return `<g class="${cls}" transform="translate(${x},${y})"><path d="M0 ${h} L${a} ${h} L${a} ${h + a} L0 ${h + a} Z" fill="rgba(242,196,107,.22)" stroke="#f2c46b"/><path d="M0 ${h} L${h} 0 L${a + h} 0 L${a} ${h} Z" fill="rgba(242,196,107,.12)" stroke="#f2c46b"/><path d="M${a} ${h} L${a + h} 0 L${a + h} ${a} L${a} ${h + a} Z" fill="rgba(242,196,107,.3)" stroke="#f2c46b"/></g>`; };
      el.innerHTML = `<svg viewBox="0 0 520 240" width="100%" style="max-width:520px">${cube(40, 110, 60, 'c1')}${cube(230, 20, 120, 'c2')}<text x="70" y="232" fill="#f3ebdd" font-size="18" text-anchor="middle" font-family="Hanken Grotesk">boy ×1</text><text x="320" y="232" fill="#f3ebdd" font-size="18" text-anchor="middle" font-family="Hanken Grotesk">boy ×2</text></svg>
      <div style="display:flex;justify-content:center;gap:clamp(18px,4vw,48px);margin-top:8px;font-size:clamp(16px,1.8vw,21px)"><div class="r1">kas kesiti (güç) <b style="color:var(--gold);font-family:var(--serif);font-size:1.5em">×4</b></div><div class="r2">hacim (ağırlık) <b style="color:var(--gold);font-family:var(--serif);font-size:1.5em">×8</b></div></div>
      <div class="r3" style="margin-top:10px;font-family:var(--serif);font-style:italic;font-size:clamp(18px,2vw,24px)">boy büyüdükçe ağırlık, güçten hızlı artar</div>`;
    }, el => {
      el.querySelector('.c2').style.opacity = clamp((u - C.double - 0.3) / 0.8);
      el.querySelector('.r1').style.opacity = clamp((u - C.area) / 0.5);
      el.querySelector('.r2').style.opacity = clamp((u - C.volume) / 0.5);
      el.querySelector('.r3').style.opacity = clamp((u - C.faster) / 0.6);
    });
    overlay.panel('myth', win(u, C.giant + 0.4, ch.dur, 0.4, 0.5), el => {
      el.style.cssText += 'left:clamp(16px,5vw,80px);top:clamp(24px,10vh,90px);text-shadow:0 0 10px #000';
      el.innerHTML = `<div style="font:600 12px var(--sans);letter-spacing:.25em;color:#ff9a86">YAYGIN YANLIŞ</div><div style="font-family:var(--serif);font-size:clamp(20px,2.4vw,30px);margin-top:6px;text-decoration:line-through;text-decoration-color:#ff9a86;text-decoration-thickness:2px">"İnsan boyunda karınca araba kaldırırdı"</div><div style="font-size:16px;margin-top:6px;opacity:.9">kendi ağırlığını bile zor taşırdı</div>`;
    });
  };

  CH.fizik = (u, C, ch) => {
    surfaceLook();
    const vStand = 0.72;
    const bf = fallBlade.at(vStand, 0.1);
    const tFall = C.fall + 0.3;
    const ground = onG(bf.pos.x + 1.5, bf.pos.z - 1, 0);
    let c;
    if (u < tFall) {
      // on the blade near its arching tip
      const f = { pos: bf.pos, up: bf.up, fwd: bf.along };
      hero.setVisible(true);
      hero.pose({ ...f, s: 0, moving: 0, surf: { project: v => v.subtract(bf.up.scale(Vector3.Dot(v.subtract(bf.pos), bf.up))) }, ant: antennaMotion(u, 2) });
      c = cam(bf.pos.add(bf.up.scale(3)).add(V(-6, 1, -5)), bf.pos, 0.62);
    } else if (u < C.land + 1.4) {
      // slow-motion fall: tumbling, legs spread, drifting
      const T = u - tFall, Tl = C.land - tFall;
      const k = clamp(T / Tl);
      const pos = Vector3.Lerp(bf.pos, ground.add(V(0, 0.6, 0)), easeIn(Math.min(1, k * 0.9 + k * k * 0.1)));
      pos.x += Math.sin(T * 1.5) * 0.8;
      const landed = u >= C.land;
      const q = landed ? Quaternion.Identity() : Quaternion.RotationYawPitchRoll(T * 1.1, Math.sin(T * 1.7) * 1.2, T * 0.9);
      hero.setVisible(true);
      const spread = { L1: [-1.6, -0.2, 1.8], R1: [1.6, -0.2, 1.8], L2: [-2.2, -0.2, 0.1], R2: [2.2, -0.2, 0.1], L3: [-1.9, -0.2, -1.9], R3: [1.9, -0.2, -1.9] };
      if (!landed) hero.pose({ pos, up: V(0, 1, 0), fwd: V(0.3, 0, 1).normalize(), extraRot: q, s: 0, moving: 0, feetLocal: spread, ant: [[0.9, -0.6, 0.6, 0.2], [0.9, -0.6, 0.6, 0.2]] });
      else { const fg = groundFrame(ground.x, ground.z, 0.6, G); hero.pose({ ...fg, s: 0, moving: 0, surf: gsurf, ant: antennaMotion(u, 2), bodyH: 0.12 * Math.exp(-(u - C.land) * 6) * Math.abs(Math.sin((u - C.land) * 16)) }); }
      c = cam(Vector3.Lerp(bf.pos.add(V(-7, 2, -6)), ground.add(V(-7, 2.4, -7)), ease(k)), landed ? ground.add(V(0, 0.6, 0)) : pos, 0.66);
    } else if (u < C.tension) {
      const walkP = groundPath([[ground.x, ground.z], [ground.x + 4, ground.z + 4], [world.dewList[0].x - 3.6, world.dewList[0].z - 1.6]], G);
      const f = walk(hero, walkP, Math.min(walkP.len, travel(u - C.land - 1.4, [[0, 3]])), u);
      c = cam(onG(f.pos.x - 6, f.pos.z - 9, 3.5), f.pos.add(V(1.5, 0.5, 1.5)), 0.7);
    } else {
      // at the dew drop: a foreleg touching the surface, then drinking
      const d = world.dewList[0];
      const f = groundFrame(d.x - 2.9, d.z - 1.3, 1.05, G);
      hero.setVisible(true);
      const sip = ramp(u, C.sip, 0.8);
      hero.pose({ ...f, s: 0, moving: 0, surf: gsurf, headPitch: 0.25 * sip, mand: 0.2 + 0.3 * sip, ant: antennaMotion(u, 5, 0.5), footOffset: { R1: V(0.35, 0.25 * (1 - sip), 0.25) } });
      c = cam(onG(d.x - 3.8, d.z - 6.2, 1.3), onG(d.x - 1.8, d.z - 0.9, 0.8), 0.55);
    }
    // the raindrop: falls beside the ant, splashes into a crown
    const tr = C.rain - 0.3;
    const dropAt = onG(ground.x + 5, ground.z + 3.5, 0);
    rain.setEnabled(false); splash.setEnabled(false);
    if (u > tr - 1.2 && u < C.tension) {
      const T = u - tr;
      if (T < 0) { rain.setEnabled(true); rain.scaling.set(3, 3.3, 3); rain.position = dropAt.add(V(0, 1.6 - T * 22, 0)); }
      else {
        const sp = clamp(T / 1.4);
        splash.setEnabled(T < 1.6);
        const tmp = new Matrix();
        splDirs.forEach((d, i) => {
          const tt = T * 0.28;
          const p = dropAt.add(V(Math.cos(d.a) * d.v * tt, Math.max(0, d.up * tt - 49 * tt * tt), Math.sin(d.a) * d.v * tt));
          const sc = d.s * (1 - sp * 0.6);
          Matrix.ComposeToRef(V(sc, sc, sc), Quaternion.Identity(), p, tmp); splBuf.set(tmp.m, i * 16);
        });
        splash.thinInstanceBufferUpdated('matrix');
        rain.setEnabled(T < 0.9); rain.scaling.set(3 + sp * 3, Math.max(0.2, 3 * (1 - sp * 2)), 3 + sp * 3); rain.position = dropAt.add(V(0, 0.2, 0));
      }
      if (u > tr - 1.2 && u < tr + 2.4) c = cam(onG(dropAt.x - 5, dropAt.z - 11, 3.2), dropAt.add(V(-2, 1.4, 0)), 0.72);
    }
    applyCam(c);
    S.macro = 1.8; S.scale = 1;
    overlay.label('drag', { at: hero.worldPoint(0, 0.5, 0), text: 'hava direnci', sub: 'limit hız düşük: saatte birkaç km', off: [70, -60], op: win(u, C.fall + 0.8, C.land, 0.4, 0.3) });
    overlay.label('safe', { at: hero.worldPoint(0, 0.5, 0), text: 'yara almadan yoluna devam', off: [70, -60], op: win(u, C.land + 0.2, C.water, 0.3, 0.4) });
    overlay.label('rainL', { at: dropAt.add(V(0, 3.4, 0)), text: 'yağmur damlası: 4–14 mg', sub: 'bir işçi karınca yaklaşık 2 mg', cls: 'gold', off: [70, -70], op: win(u, C.rain - 0.2, C.tension, 0.3, 0.4) });
    const d = world.dewList[0];
    overlay.label('tens', { at: V(d.x - d.d / 2, d.y + 0.5, d.z - 0.5), text: 'yüzey gerilimi', sub: 'su, küçük bir canlıyı tutabilir', off: [-40, -110], op: win(u, C.tension + 0.3, ch.dur, 0.4, 0.5) });
  };

  CH.ciftlik = (u, C, ch) => {
    surfaceLook();
    const a0 = mainAphid;
    // hero walks up the stem to the aphid, strokes it, drinks the drop
    const sAph = a0.s - 0.012, thH = a0.th + 0.55;
    const sHero = lerp(0.13, sAph - 0.02, ease(clamp(u / (C.stroke - 0.4))));
    const stemPath = sv => stemFrame(clamp(sv / plant.height, 0, 1), thH, false);
    const heroS = sHero * plant.height;
    const guard = win(u, C.guard, C.mutual + 0.6, 0.4, 0.8);
    const gs = heroS - guard * 3.2;
    const drum = win(u, C.stroke, C.guard, 0.3, 0.3);
    const fr = stemPath(gs);
    hero.setVisible(true);
    hero.pose({ ...fr, s: gs, path: stemPath, surf: stemSurf, stride: 1.4, moving: u < C.stroke - 0.4 || (guard > 0 && guard < 1) ? 1 : 0, headYaw: -0.35 * drum, headPitch: 0.2 * drum + 0.2 * ramp(u, C.drop + 0.8, 0.5) * (1 - guard), mand: 0.1 + 0.6 * guard + 0.3 * ramp(u, C.drop + 0.8, 0.4),
      ant: drum > 0 ? [[0.35, 0.1 + 0.25 * Math.sin(u * 14), 0.6, 0.6], [0.2, 0.1 + 0.25 * Math.sin(u * 14 + 1.5), 0.5, 0.6]] : antennaMotion(u, 4) });
    // other ants tending the colony
    for (let i = 0; i < 3; i++) {
      const a = crew[i]; const th = a0.th - 1.2 + i * 1.3; const sv = (0.2 + 0.07 * i) * plant.height + Math.sin(u * 0.5 + i) * 1.2;
      const f2 = stemFrame(sv / plant.height, th, i % 2 === 0);
      a.setVisible(true); a.pose({ ...f2, s: 0, moving: 0, surf: stemSurf, ant: antennaMotion(u, i + 7) });
    }
    // honeydew drop at the aphid's rear
    const grow = ramp(u, C.honeydew, 2.2), drink = ramp(u, C.drop + 1.0, 1.4);
    const aphRear = a0.inst.position.add(a0.f.fwd.scale(-1.25 * a0.sz)).add(a0.f.up.scale(0.45 * a0.sz));
    honey.setEnabled(grow > 0.01 && drink < 0.99);
    const hs = 0.55 * grow * (1 - drink);
    honey.scaling.setAll(Math.max(0.001, hs)); honey.position = aphRear.add(a0.f.fwd.scale(-hs * 0.4));
    // ladybird comes up the stem, then turns away
    const lb = u > C.guard - 2;
    ladybird.setEnabled(lb && u < ch.dur);
    if (lb) {
      const come = ease(clamp((u - C.guard + 2) / 2.6)), leave = ease(clamp((u - C.guard - 2.2) / 3));
      const sv = lerp(0.02, (sHero * plant.height - 9) / plant.height, come) - leave * 0.1;
      const f3 = stemFrame(clamp(sv, 0.01, 1), thH + 0.3, leave < 0.5 ? false : true);
      const X = Vector3.Cross(f3.up, f3.fwd).normalize(), Z = Vector3.Cross(X, f3.up).normalize();
      ladybird.position = f3.pos.add(f3.up.scale(1.1)); ladybird.rotationQuaternion = Quaternion.RotationQuaternionFromAxis(X, f3.up, Z);
      ladybird.scaling.setAll(0.95);
    }
    const aPos = a0.inst.position;
    const c = shots(u, [
      [0, uu => cam(PLANT.add(V(26, 16 + uu * 0.3, -30)), PLANT.add(V(0, 20, 0)), 0.72)],
      [C.aphids, uu => cam(aPos.add(a0.f.up.scale(11)).add(V(0, 2 + (uu - C.aphids) * 0.15, 0)), aPos.add(V(0, 1, 0)), 0.62), 1.4],
      [C.stroke - 0.5, uu => cam(Vector3.Lerp(aPos, fr.pos, 0.5).add(a0.f.up.scale(9)).add(V(0, 1.5, 0)), Vector3.Lerp(aPos, fr.pos, 0.5), 0.6), 1.2],
      [C.guard - 0.3, uu => cam(fr.pos.add(fr.up.scale(22)).add(V(0, -3, 0)), fr.pos.add(V(0, -6, 0)), 0.72), 1.4],
      [C.mutual, uu => cam(PLANT.add(V(22, 28, -26)), PLANT.add(V(0, 21, 0)), 0.7), 1.6],
    ]);
    applyCam(c);
    S.macro = 1.6; S.scale = 1;
    overlay.label('aph', { at: aPos.add(a0.f.up.scale(1)), text: 'yaprak bitleri', sub: '<i>Aphis fabae</i>', off: [80, -60], op: win(u, C.aphids + 0.5, C.honeydew, 0.4, 0.4) });
    overlay.label('sap', { at: a0.inst.position.add(a0.f.fwd.scale(0.9 * a0.sz)), text: 'özsu', sub: 'şekerce zengin, proteince fakir', off: [-100, 50], op: win(u, C.sap + 0.2, C.honeydew + 0.5, 0.4, 0.4) });
    overlay.label('hdew', { at: honey.position, text: 'ballı çiy', sub: 'fazla şeker', cls: 'gold', off: [80, 50], op: win(u, C.honeydew + 0.8, C.drop + 1.4, 0.4, 0.4) });
    overlay.label('ladyL', { at: ladybird.position, text: 'uğur böceği', sub: 'yaprak bitlerinin avcısı', cls: 'red', off: [80, 40], op: win(u, C.guard + 0.3, C.mutual, 0.4, 0.4) });
    overlay.label('mut', { at: aPos, text: 'mutualizm', sub: 'iki taraf da kazançlı', cls: 'big', off: [120, -90], op: win(u, C.mutual + 0.8, ch.dur, 0.5, 0.5) });
  };

  CH.yuva = (u, C, ch) => {
    const tIn = Math.max(2.4, C.city - 0.7);
    if (u < tIn) {
      surfaceLook();
      const p = groundPath([[9, 5], [5, 2.6], [2, 0.9], [0, 0]], G);
      const f = walk(hero, p, Math.min(p.len, travel(u, [[0, 3]])), u, { fill: 1.2 });
      applyCam(chase(f, 3, -6, 2.2, 1, 0.62));
      S.macro = 1.8; S.scale = 1;
      S.fade = ramp(u, tIn - 1.2, 1.1);
      return;
    }
    nestLook();
    S.fade = 1 - ramp(u, tIn, 0.9);
    // walking ants in the nest
    const heroRoute = nestPath([[-1, -6, 0.8], [-3, -15, 0.9], [-10, -23, 0.9], [-20, -30, 1.4], [-30, -36.8, 2.4], [-40, -52, 1.2], [-44, -60.8, 2]]);
    const hs = Math.min(heroRoute.len, travel(u - tIn, [[0, 4.2]]));
    const shareT = C.share - 0.5;
    const nFr = heroRoute.at(heroRoute.len);
    if (u < shareT) {
      const f = heroRoute.at(hs);
      hero.setVisible(true);
      hero.pose({ ...f, s: hs, path: heroRoute.at, surf: nestSurf, fill: 1.2, moving: hs < heroRoute.len ? 1 : 0, ant: antennaMotion(u, 1) });
    } else {
      const P0 = NEST_O.add(V(-45.2, -61.5, 2)), P1 = NEST_O.add(V(-42.1, -61.5, 2));
      const f = nestFrame(-45.2, -61.2, 2, 0);
      hero.setVisible(true); hero.pose({ ...f, s: 0, moving: 0, surf: nestSurf, mand: 0.45, headPitch: 0.1, fill: lerp(1.2, 1.05, ramp(u, C.share, 4)), ant: antennaMotion(u * 1.5, 1, 0.6) });
      const f2 = nestFrame(-40.6, -61.2, 2, Math.PI);
      sis.setVisible(true); sis.pose({ ...f2, s: 0, moving: 0, surf: nestSurf, mand: 0.45, headPitch: 0.1, fill: lerp(1, 1.12, ramp(u, C.share, 4)), ant: antennaMotion(u * 1.5, 2, 0.6) });
      shareDrop.setEnabled(true); shareDrop.scaling.setAll(0.3 + 0.05 * Math.sin(u * 3)); shareDrop.position = Vector3.Lerp(headPt(hero, 1.0), headPt(sis, 1.0), 0.5);
    }
    if (u < shareT) shareDrop.setEnabled(false);
    // queen with attendants
    const qf = nestFrame(-9, -73, 2.4, 0);
    queen.setVisible(true); queen.pose({ ...qf, s: 0, moving: 0, surf: nestSurf, ant: antennaMotion(u * 0.7, 9, 0.5) });
    const nurses = [[-1, -72.5, 2.4, Math.PI], [-16, -71, 2, 0.2], [-30, -36.6, 2.2, 0.4], [-24, -36.9, 2.2, Math.PI - 0.3], [18, -48.7, 2, 0.1]];
    nurses.forEach(([x, y, z, yaw], i) => { const a = crew[i]; const f = nestFrame(x, y, z, yaw); a.setVisible(true); a.pose({ ...f, s: 0, moving: 0, surf: nestSurf, headPitch: 0.25, ant: antennaMotion(u * 1.3, i + 11, 0.8) }); });
    // foragers climbing out
    const upRoute = nestPath([[4, -30, 0.5], [0, -22, 0.8], [-3, -15, 0.8], [-1, -6, 0.6], [0, 1, 0]]);
    for (let i = 0; i < 3; i++) {
      const a = crew[5 + i]; const sv = ((u - tIn) * 3.4 + i * 9) % upRoute.len;
      const f = upRoute.at(sv); a.setVisible(true); a.pose({ ...f, s: sv, path: upRoute.at, surf: nestSurf, ant: antennaMotion(u, i + 20) });
    }
    const Q = NEST_O.add(V(-6, -69, 0)), B = NEST_O.add(V(-30, -34, 0)), K = NEST_O.add(V(22, -45, 0)), PN = NEST_O.add(V(-44, -59, 0));
    const c = shots(u, [
      [tIn, uu => { const k = ease(clamp((uu - tIn) / 7)); return cam(NEST_O.add(V(lerp(-6, -8, k), lerp(-22, -36, k), lerp(-40, -118, k))), NEST_O.add(V(lerp(-4, -8, k), lerp(-24, -40, k), 0)), 0.7); }],
      [C.queen, uu => cam(Q.add(V(4 + (uu - C.queen) * 0.3, 2.5, -24)), Q.add(V(-1, -1.5, 2)), 0.62), 1.6],
      [C.brood, uu => cam(B.add(V(-2 + (uu - C.brood) * 0.9, 2.2, -26)), B.add(V((uu - C.brood) * 0.9 - 2, -1.5, 2)), 0.62), 1.6],
      [C.cocoon, uu => cam(K.add(V(-2 + (uu - C.cocoon) * 0.6, 2.4, -24)), K.add(V((uu - C.cocoon) * 0.6 - 2, -2, 2)), 0.62), 1.4],
      [C.young, uu => cam(B.add(V(4, 2, -20)), B.add(V(3, -2.2, 2)), 0.62), 1.4],
      [C.old, uu => cam(NEST_O.add(V(4, -14, -40)), NEST_O.add(V(0, -18, 0)), 0.62), 1.4],
      [C.share - 0.6, uu => cam(PN.add(V(0.5 + (uu - C.share) * 0.1, 0.4, -12)), PN.add(V(-0.6, -2.4, 2)), 0.55), 1.4],
    ]);
    applyCam(c);
    S.macro = 1.3; S.scale = 1;
    const city = win(u, C.city + 0.5, C.queen, 0.5, 0.4);
    overlay.label('nq', { at: Q, text: 'kraliçe odası', off: [80, 60], op: city });
    overlay.label('nb', { at: B, text: 'yavru odası', off: [-60, -70], op: city });
    overlay.label('nk', { at: K, text: 'koza odası', off: [60, -70], op: city });
    overlay.label('nt', { at: NEST_O.add(V(2, -30, 0)), text: 'tüneller', off: [80, -20], op: city });
    overlay.label('queenL', { at: queen.worldPoint(0, 0.5, 0), text: 'kraliçe', sub: 'tek işi yumurtlamak', cls: 'gold', off: [70, -80], op: win(u, C.queen + 0.4, C.record, 0.4, 0.4) });
    overlay.panel('record', win(u, C.record, C.brood, 0.4, 0.4), el => {
      el.style.cssText += 'right:clamp(16px,5vw,80px);top:clamp(24px,12vh,110px);text-align:right;text-shadow:0 0 12px #000';
      el.innerHTML = '<div style="font-family:var(--serif);font-size:clamp(46px,6vw,78px);line-height:1">28¾ yıl</div><div style="font-size:16px;margin-top:6px">laboratuvarda yaşayan bir kraliçe</div><div style="font-size:14px;opacity:.75">bilinen en uzun böcek ömürlerinden</div>';
    });
    const bl = win(u, C.brood + 0.4, C.young, 0.4, 0.4);
    overlay.label('egg', { at: NEST_O.add(V(-38, floorY('brood', -38, 0.4) + 0.6, 2)), text: 'yumurta', off: [-50, -70], op: win(u, C.brood + 0.4, C.cocoon, 0.4, 0.4) });
    overlay.label('larva', { at: larvae[3].position, text: 'larva', off: [40, -80], op: win(u, C.brood + 1.4, C.cocoon, 0.4, 0.4) });
    overlay.label('pupa', { at: NEST_O.add(V(21, floorY('cocoon', 21, 0.4) + 1.5, 2.5)), text: 'pupa (ipek koza içinde)', off: [40, -80], op: win(u, C.cocoon - 0.2, C.young, 0.4, 0.4) });
    overlay.panel('mythE', win(u, C.cocoon + 0.3, C.young, 0.4, 0.4), el => {
      el.style.cssText += 'left:clamp(16px,5vw,80px);top:clamp(24px,10vh,90px);text-shadow:0 0 10px #000';
      el.innerHTML = `<div style="font:600 12px var(--sans);letter-spacing:.25em;color:#ff9a86">YAYGIN YANLIŞ</div><div style="font-family:var(--serif);font-size:clamp(20px,2.4vw,30px);margin-top:6px"><span style="text-decoration:line-through;text-decoration-color:#ff9a86">"karınca yumurtası"</span> → koza</div>`;
    });
    overlay.label('young', { at: crew[2].worldPoint(0, 0.4, 0), text: 'genç işçiler: bakıcı', sub: 'yuvanın içinde', cls: 'teal', off: [60, -80], op: win(u, C.young + 0.3, C.old, 0.4, 0.4) });
    overlay.label('old', { at: crew[6].worldPoint(0, 0.4, 0), text: 'yaşlı işçiler: toplayıcı', sub: 'dışarısı en tehlikeli yer', cls: 'gold', off: [70, -40], op: win(u, C.old + 0.2, C.share - 0.4, 0.4, 0.4) });
    overlay.label('troph', { at: shareDrop.position, text: 'ağızdan ağıza paylaşım', sub: 'trofalaksi', cls: 'gold', off: [60, -80], op: win(u, C.share + 0.3, C.hundred, 0.4, 0.4) });
    overlay.panel('net', win(u, C.hundred, ch.dur, 0.5, 0.5), el => {
      el.style.cssText += 'right:clamp(16px,5vw,80px);top:50%;transform:translateY(-50%);text-align:center;text-shadow:0 0 10px #000';
      const R = rng(3); let h = '<circle cx="110" cy="110" r="7" fill="#f2c46b"/>';
      for (let i = 0; i < 100; i++) { const a = i * 2.39996, r = 16 + Math.sqrt(i) * 9.2; const x = 110 + Math.cos(a) * r, y = 110 + Math.sin(a) * r; h += `<line class="nl" x1="110" y1="110" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(242,196,107,.25)" stroke-width=".7" style="opacity:0"/><circle class="nd" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#f3ebdd" style="opacity:0"/>`; }
      el.innerHTML = `<svg width="220" height="220" viewBox="0 0 220 220">${h}</svg><div style="font-family:var(--serif);font-size:30px">1 → 100</div><div style="font-size:15px;opacity:.85">yuvadaşa dağılabilir</div>`;
    }, el => { const k = clamp((u - C.hundred - 0.2) / 2.2); el.querySelectorAll('.nd').forEach((d, i) => d.style.opacity = i / 100 < k ? 1 : 0); el.querySelectorAll('.nl').forEach((d, i) => d.style.opacity = i / 100 < k ? 1 : 0); });
  };

  CH.kapanis = (u, C, ch) => {
    surfaceLook();
    const f = stand(hero, -2, 9, 1.1, u, { headPitch: -0.1 });
    const eye = eyePt(hero, 1);
    const eyeOut = eye.subtract(hero.worldPoint(0, 0.05, 0.5, hero.neck)).normalize();
    // trail traffic for the wide shots
    for (let i = 0; i < crew.length; i++) {
      const a = crew[i];
      const s = ((i * 4.1 + u * 3.2) % trailPath.len);
      const dir = i % 2 ? 1 : -1;
      const pathD = dir > 0 ? trailPath.at : (q => { const fq = trailPath.at(trailPath.len - q); return { ...fq, fwd: fq.fwd.scale(-1) }; });
      a.setVisible(true); const fp = pathD(s);
      a.pose({ ...fp, s, path: pathD, surf: gsurf, ant: antennaMotion(u, i) });
    }
    const up = ease(clamp((u - C.count + 1) / 9));
    const c = shots(u, [
      [0, uu => { const d = lerp(1.6, 0.6, ease(uu / 3)); return cam(eye.add(eyeOut.scale(d)).add(V(0, d * 0.25, 0)), eye, 0.55); }],
      [C.world, uu => cam(onG(-6 + (uu - C.world) * 0.3, 12.5, 0.8), onG(2, 21, 0.4), 0.78), 1.2],
      [C.together, uu => alongTrail(uu - C.together), 1.4],
      [C.count - 1, uu => { const a = alongTrail(uu - C.together); const c = cam(Vector3.Lerp(a.pos, V(16, 520, -330), up), Vector3.Lerp(a.target, V(8, 0, 4), up), lerp(0.24, 0.75, up)); c.keepLens = true; return c; }, 1.4],
    ]);
    applyCam(c);
    S.macro = u < C.world ? 3 : u < C.count ? 1.6 : lerp(1.2, 0.15, up); S.scale = u < C.count ? 1 : 1 - up;
    // quick mosaic callback
    mosaic.split = u > C.mosaic && u < C.world ? lerp(1, 0.5, ease((u - C.mosaic) / 0.8)) * 1 + 0 : 1;
    if (u >= C.world - 0.6 && u < C.world) mosaic.split = lerp(0.5, 1, ease((u - C.world + 0.6) / 0.6));
    mosaic.amount = u > C.mosaic && u < C.world ? 1 : 0; mosaic.cols = 13;
    overlay.panel('divider', mosaic.amount > 0 && mosaic.split < 0.995 ? 0.9 : 0, el => { el.className = 'panel divider'; }, el => { el.style.left = (mosaic.split * 100).toFixed(2) + '%'; });
    if (u > C.together && u < C.count) { ribbon.show(0, trailPath.len, 0.4 * win(u, C.together, C.count, 0.5, 0.5)); }
    overlay.panel('count', win(u, C.count + 0.4, C.remember + 1.2, 0.6, 0.6), el => {
      el.style.cssText += 'left:50%;top:40%;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;text-shadow:0 0 16px #000';
      el.innerHTML = '<div style="font-family:var(--serif);font-size:clamp(28px,5vw,64px);letter-spacing:.02em">≈ 20 000 000 000 000 000</div><div style="font-size:clamp(16px,1.8vw,21px);margin-top:8px">yirmi katrilyon karınca</div>';
    });
    const endOp = ramp(u, ch.dur - 4.8, 1.2);
    overlay.panel('end', endOp, el => {
      el.style.cssText += 'left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;';
      el.innerHTML = '<div style="font-family:var(--serif);font-style:italic;font-weight:320;font-size:clamp(38px,5.6vw,76px);line-height:1">Karıncanın Gözünde Hayat</div><div style="margin-top:18px;font-size:14px;letter-spacing:.3em;color:var(--gold)">ANİMASYON LAB</div><div style="margin-top:22px;font-size:13px;opacity:.7;max-width:560px;line-height:1.5">Bilgiler: AntWiki, Britannica, Schultheiss ve ark. 2022 (PNAS), Goss ve ark. 1989, Beckers ve ark. 1992–93, Kutter ve Stumper 1969 ve diğerleri. Ayrıntılı kaynaklar README’de.</div>';
    });
    S.fade = endOp * 0.75;
  };

  // ---------------- main update ----------------
  let lastCh = null;
  function update(t) {
    const { ch, u } = tl.at(t);
    const C = ch.cues;
    S = { macro: 2, focus: null, scale: 1, fade: 0, dist: 10, t };
    hideAll();
    // reset shared state
    mosaic.split = 1; mosaic.amount = 0; mosaic.dim = 0;
    smellOff();
    seed.setEnabled(false); seed.parent = null;
    honey.setEnabled(false); rain.setEnabled(false); splash.setEnabled(false); ladybird.setEnabled(false); shareDrop.setEnabled(false);
    world.food.scaling.set(7, 2.3, 5.5);
    hero.neck.position.z = 0.64; hero.pet.position.z = -0.68; hero.gasterNode.position.z = -0.78;
    lab.tintS.material.alpha = 0; lab.tintL.material.alpha = 0;
    scene.clearColor = new Color4(0.02, 0.015, 0.01, 1);
    overlay.begin();
    (CH[ch.id] || CH.acilis)(u, C, ch);
    // the two hero blades exist only in their own chapters (elsewhere they block the lens)
    if (world.root.isEnabled()) { scaleBlade.mesh.setEnabled(ch.id === 'olcek'); fallBlade.mesh.setEnabled(ch.id === 'fizik'); }
    // wind in the grass, pollen
    if (world.root.isEnabled()) { world.placeBlades(t); world.placeMotes(t); }
    // focus, shadows, scale bar, fades
    const focus = S.focus ?? S.dist;
    setFocus(focus, S.macro);
    const tgt = camera.getTarget();
    fitShadow(tgt, clamp(S.dist * 0.9, 6, 160));
    overlay.chapterCard(ch, u);
    overlay.scaleBar(focus, S.scale * 0.9);
    // dip to black between chapters
    const edge = Math.max(clamp(1 - u / 0.45), clamp(1 - (ch.dur - u) / 0.35)) * (ch.index > 0 ? 1 : 0);
    const endEdge = ch.index === tl.chapters.length - 1 ? 0 : 1;
    overlay.fade(Math.max(S.fade, Math.min(1, edge * (u < 1 ? 0.85 : 0.85 * endEdge))));
    overlay.end();
    lastCh = ch;
    return { ch, u };
  }

  // an attractive still for the start screen
  function poster(t) { return update(t); }

  return { update, poster, hero, sim };
}
