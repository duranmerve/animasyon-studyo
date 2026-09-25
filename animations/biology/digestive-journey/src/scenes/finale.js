// ============================================================
//  FINALE — orbiting brain cloud behind the summary
// ============================================================
defWorld('finale', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07030a);
  const cloud = brainCloud(Math.round(70000 * QUALITY), 5); scene.add(cloud);
  cloud.material.uniforms.uOpacity.value = 1;
  const stars = motes(1500, (v, r) => { const d = V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(); v.copy(d).multiplyScalar(400 + r() * 600); }, { color: 0xc0a0ff, color2: 0xffd0e0, size: 2.2, drift: 3, opacity: 0.6 });
  scene.add(stars);
  return { scene, cloud, lamp: [0, 1], post: { bloom: 0.9, thr: 0.6, radius: 0.75, barrel: 0.02, ca: 0.002 } };
});
defChapter({
  order: 14, id: 'final', n: null, name: 'Yolculuğun Özeti', latin: '', blurb: '', world: 'finale', dur: 30, route: 'brain', mapOn: [], fadeInDur: 1.2,
  clock: [30 * 3600, 30 * 3600], ph: 7.4, scale: '', state: '', audio: { amb: [200, 0.05], pad: 0.08, heart: 0 },
  update(t, w) {
    camera.far = 3000;
    const a = REAL * 0.07 + 0.6;
    aim(camera, _v1.set(Math.sin(a) * 330, 70 + Math.sin(REAL * 0.05) * 40, Math.cos(a) * 330), _v2.set(VW > 900 ? -40 : 0, -8, 0));
    camera.fov = 50;
    const u = w.cloud.material.uniforms; u.uTime.value = REAL; u.uWave.value = 1; u.uFocus.value.set(31, 22, 66);
    u.uScale.value = (VH * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  },
});
