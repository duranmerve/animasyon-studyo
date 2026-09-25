// The director: every frame is a pure function of story time. Chapter functions choose the set,
// the hour of the day (light), the camera (witness camera: fixed tripod, slow slides, long lens),
// the bee's pose and the field-guide overlay. Shots start 0.4 s before their cue word.
import * as THREE from 'three';
import { G } from './glsl.js';
import { createSky } from './sky.js';
import { createBee, contactShadow } from './bee.js';
import { createTreeSet, TRUNK_R, HOLE } from './tree.js';
import { createMeadowSet } from './meadow.js';
import { createMapSet } from './map.js';
import { createHiveSet, createCellSet, createTunnelSet } from './comb.js';
import { clamp, lerp, smooth, ease, easeOut, easeIn } from './noise.js';
import { TOD, mixTOD } from './tod.js';
import { chapters } from './shots.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createDirector({ scene, camera, overlay, tl, video }) {
  const sky = createSky(); scene.add(sky.mesh);
  const sets = { tree: createTreeSet(), meadow: createMeadowSet(), map: createMapSet(), hive: createHiveSet(), cell: createCellSet(), tunnel: createTunnelSet() };
  for (const s of Object.values(sets)) { s.visible = false; scene.add(s); }
  const bee = createBee(); scene.add(bee.root);
  const bee2 = createBee(); scene.add(bee2.root);
  const shadow = contactShadow(1.5); scene.add(shadow);
  let lod = 1;

  const ctx = {
    THREE, V, sets, bee, bee2, shadow, sky, overlay, camera, tl, video,
    useSet(name) { for (const k in sets) sets[k].visible = k === name; },
    addSet(name, set) { set.visible = false; sets[name] = set; scene.add(set); if (set.setLOD) set.setLOD(lod); },
    // witness camera: position, target, vertical fov at 16:9 (kept by horizontal angle on portrait)
    cam(pos, target, fov = 25, near, far) {
      camera.position.copy(pos);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);
      const aspect = camera.aspect;
      let f = fov;
      if (aspect < 1.2) {
        // keep ~62% of the desktop horizontal angle on tall screens
        const h = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * 16 / 9) * 0.62;
        f = 2 * Math.atan(Math.tan(h / 2) / aspect) * 180 / Math.PI;
      }
      camera.fov = f;
      const d = pos.distanceTo(target);
      camera.near = near ?? Math.max(0.02, d * 0.02);
      camera.far = far ?? 60000;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    },
    tod(p) { return applyTOD(p); },
    // every shot of every chapter: its start and each cue word (for warming up all looks)
    allShotTimes() { const out = []; for (const c of tl.chapters) { out.push(c.start + 0.3); for (const v of Object.values(c.cues)) out.push(c.start + v + 0.3); out.push(c.start + c.dur - 0.2); } return out; },
  };

  function applyTOD(p) {
    // world compass: north = -X, east = -Z, south = +X (the hole faces south, as most wild nests do)
    const el = p.sunEl * Math.PI / 180, az = (p.sunAz - 90) * Math.PI / 180;
    G.uSunDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    G.uSunCol.value.copy(p.sunCol);
    G.uSkyAmb.value.copy(p.skyAmb); G.uGndAmb.value.copy(p.gndAmb);
    G.uFogCol.value.copy(p.fog); G.uFogDen.value = p.fogDen; G.uFogStart.value = p.fogStart ?? 0;
    G.uRimCol.value.copy(p.rimCol); G.uRim.value = p.rim;
    G.uDark.value = p.dark ?? 0; G.uWind.value = p.wind ?? 1;
    const s = sky.u;
    s.uZen.value.copy(p.zen); s.uHor.value.copy(p.hor); s.uGlow.value.copy(p.glow); s.uGlowK.value = p.glowK;
    s.uCloud.value = p.cloud; s.uCloudCol.value.copy(p.cloudCol); s.uCloudShade.value.copy(p.cloudShade);
    s.uRidgeA.value.copy(p.ridgeA); s.uRidgeB.value.copy(p.ridgeB); s.uGround.value.copy(p.ground);
    s.uStars.value = p.stars ?? 0; s.uHaze.value = p.haze ?? 0.5; s.uDisc.value = p.disc ?? 1;
    s.uCloudOver.value = p.cloudOver ?? 0; s.uPol.value = p.pol ?? 0; s.uRidgeH.value = p.ridgeH ?? 1;
    sky.mesh.visible = !(p.noSky);
    return { bloom: p.bloom, th: p.th, expo: p.expo, lift: p.lift, gain: p.gain, sat: p.sat, vig: p.vig, grain: p.grain };
  }

  const CH = chapters(ctx);

  function update(t) {
    const { ch, u } = tl.at(t);
    G.uT.value = t;
    G.uBee.value = 0; G.uSplit.value = 0; G.uCloudSh.value = 0;
    overlay.begin();
    bee.root.visible = false; bee2.root.visible = false; shadow.visible = false;
    // every piece of set state a shot may touch starts from the same values each frame,
    // so a frame never depends on what was drawn before it (renderAt purity)
    const hv = sets.hive.userData, cs = sets.cell.userData;
    hv.heat.material.uniforms.uAmt.value = 0; hv.heat.scale.setScalar(1); hv.heat.position.set(0, 0, 0.6);
    hv.rings.material.uniforms.uAmt.value = 0; hv.rings.material.uniforms.uPh.value = 0; hv.rings.scale.setScalar(1); hv.rings.position.set(0, 0, 0.5);
    hv.mat.uniforms.uFocus.value.set(0, 0, 0); hv.mat.uniforms.uFocusR.value = 8; hv.mat.uniforms.uSense.value = 0.5;
    for (const c of cs.caps) { c.visible = true; c.scale.setScalar(1); c.material.uniforms.uBack.value = 0; }
    cs.cap.visible = false; cs.cap.scale.setScalar(1); cs.cap.material.uniforms.uBack.value = 0;
    cs.wallMat.uniforms.uGlow.value = 1; cs.nectar.material.uniforms.uThick.value = 0; cs.nectar.position.set(0, 0, -cs.depth + 0.12);
    sky.u.uPol.value = 0;
    const S = { look: {} };
    // the hour stamp and the chapter title claim their places first (layout register)
    overlay.stamp(ch.clock, ch.place, (ch.index === 0 ? 0 : 1) * smooth(0.2, 1.0, u) * (1 - smooth(5.5, 7, u)));
    if (ch.index > 0 && u < 5.8) { const op = smooth(0.5, 1.3, u) * (1 - smooth(4.5, 5.8, u)); overlay.title(ch.title, '', op, { band: Math.min(1, op * 1.6) }); }
    (CH[ch.id] || CH._fallback)(u, ch, S);
    const look = S.look;
    // hour stamp at the start of each chapter, and the chapter title after the first
    const hold = ch.index === 0 ? 0 : 1;
    overlay.end();
    return { ch, u, look };
  }

  return {
    update,
    setTier(name) {
      lod = { ultra: 1, high: 1, mid: 0.7, low: 0.45, min: 0.28 }[name];
      for (const s of Object.values(sets)) if (s.setLOD) s.setLOD(lod);
      const fur = { ultra: 12, high: 12, mid: 8, low: 5, min: 3 }[name]; bee.setFur(fur); bee2.setFur(Math.min(fur, 6));
    },
    heavy: CH._heavy || [['safak', 0.2], ['cayir', 0.5], ['dans', 0.5]],
    allShotTimes: () => ctx.allShotTimes(),
    posterTime() { return CH._poster ? CH._poster() : 5; },
  };
}
