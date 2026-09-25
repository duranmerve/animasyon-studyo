// ============================================================
//  LOKUM factory (shared by the café scene and the mouth)
// ============================================================
function sweetTex() {
  if (TEXCACHE.has('sweet')) return TEXCACHE.get('sweet');
  const S = 512, pn = periodicNoise(21), pn2 = periodicNoise(22);
  const c = canvasOf(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
  const H = new Float32Array(S * S);
  const base = srgbBytes(0xef7fa6), deep = srgbBytes(0xd4507f), sugar = srgbBytes(0xfff4f7);
  const r = rngOf(4);
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    const u = xx / S, v = yy / S;
    const m = 0.6 * pn(u * 5, v * 5, 5, 5) + 0.3 * pn(u * 11, v * 11, 11, 11);
    const cover = sstep(-0.25, 0.45, m + 0.25 * pn2(u * 40, v * 40, 40, 40)); // powdered sugar coverage
    const grain = pn2(u * 128, v * 128, 128, 128);
    const k = clamp(cover * 0.75 + (grain > 0.35 ? 0.35 : 0));
    const i = (yy * S + xx) * 4;
    const t2 = sstep(-0.4, 0.4, m);
    for (let q = 0; q < 3; q++) d[i + q] = lerp(lerp(deep[q], base[q], t2), sugar[q], k);
    d[i + 3] = 255; H[yy * S + xx] = k * 0.8 + grain * 0.4;
  }
  x.putImageData(img, 0, 0);
  // sugar crystals sparkle
  for (let k = 0; k < 2600; k++) { x.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`; const s = 0.6 + r() * 1.6; x.fillRect(r() * S, r() * S, s, s); }
  const nc = canvasOf(S, S), nx = nc.getContext('2d'), ni = nx.createImageData(S, S), nd = ni.data;
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    const l = H[yy * S + ((xx - 1 + S) % S)], rr = H[yy * S + ((xx + 1) % S)], up = H[((yy - 1 + S) % S) * S + xx], dn = H[((yy + 1) % S) * S + xx];
    let a = (l - rr) * 3, b = (dn - up) * 3, cz = 1; const L = Math.hypot(a, b, cz);
    const i = (yy * S + xx) * 4; nd[i] = (a / L * 0.5 + 0.5) * 255; nd[i + 1] = (b / L * 0.5 + 0.5) * 255; nd[i + 2] = (cz / L * 0.5 + 0.5) * 255; nd[i + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);
  const res = { map: texFromCanvas(c, true), normal: texFromCanvas(nc, false) };
  TEXCACHE.set('sweet', res); return res;
}
function sweetMat() {
  const tx = sweetTex();
  return new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: tx.map, normalMap: tx.normal, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.66, clearcoat: 0.12, clearcoatRoughness: 0.5,
    sheen: 1, sheenColor: new THREE.Color(0xffe6ef), sheenRoughness: 0.8, emissive: new THREE.Color(0xd23a6a), emissiveIntensity: 0.1 });
}
function pistachioMat() { return new THREE.MeshPhysicalMaterial({ color: 0x86b04a, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0xc8f080), emissive: new THREE.Color(0x2c4a10), emissiveIntensity: 0.25 }); }
function makeSweet(size = 1) {
  const grp = new THREE.Group();
  const g = new RoundedBoxGeometry(size, size * 0.9, size, 6, size * 0.16);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + 0.035 * noise3(v.x * 3 / size, v.y * 3 / size, v.z * 3 / size); v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  const body = new THREE.Mesh(g, sweetMat()); grp.add(body);
  const pm = pistachioMat(), r = rngOf(9);
  for (let k = 0; k < 9; k++) {
    const ch = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (0.06 + r() * 0.05), 0), pm);
    const face = Math.floor(r() * 6), a = (r() - 0.5) * 0.7 * size, b = (r() - 0.5) * 0.7 * size, h = size * 0.46;
    const pos = [[h, a, b], [-h, a, b], [a, h * 0.9, b], [a, -h * 0.9, b], [a, b, h], [a, b, -h]][face];
    ch.position.set(...pos); ch.rotation.set(r() * 6, r() * 6, r() * 6); ch.scale.set(1, 0.6, 1.3); grp.add(ch);
  }
  grp.userData.body = body;
  return grp;
}

