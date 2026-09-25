// Studio around the machine: desk, laptop with a live screen, the data cable,
// data packets, toner particles at the developer nip and steam from the fuser.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DRUM_R, DRUM_Y, DRUM_X, ANG, P_DRUM, D_DEV, PAGE_W, PAGE_L } from './layout.js';
import { glowTexture } from './printer.js';

export function setupStudio(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.background = new THREE.Color(0xe4e0d8);
  scene.fog = new THREE.Fog(0xe4e0d8, 260, 620);

  const hemi = new THREE.HemisphereLight(0xfff8ee, 0x8a8478, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff3e2, 2.3);
  key.position.set(60, 110, 90);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const s = key.shadow.camera; s.left = -90; s.right = 90; s.top = 90; s.bottom = -60; s.near = 20; s.far = 320;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.05;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7);
  fill.position.set(-80, 40, 60);
  scene.add(fill);
  // a soft light inside the cutaway so the interior reads
  const inside = new THREE.PointLight(0xfff0e0, 380, 70, 1.6);
  inside.position.set(4, 20, 26);
  scene.add(inside);

  // desk with a faint grain
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#d6d0c5'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,80,70'},${Math.random() * 0.05})`; g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 30, 1); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8, 8); tex.anisotropy = 8;
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true;
  scene.add(desk);
  return { key, hemi, fill, inside };
}

// ---------------------------------------------------------------------------
export class Laptop {
  constructor(scene, contentCanvas) {
    this.content = contentCanvas;
    const g = new THREE.Group();
    g.position.set(-54, 0, 6); g.rotation.y = 0.5;
    scene.add(g);
    const alu = new THREE.MeshStandardMaterial({ color: 0xbfc3c8, roughness: 0.32, metalness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.6 });
    const base = new THREE.Mesh(new RoundedBoxGeometry(30, 1.2, 20.5, 3, 0.5), alu);
    base.position.y = 0.6; g.add(base);
    const kb = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), dark); kb.rotation.x = -Math.PI / 2; kb.position.set(0, 1.21, -2.5); g.add(kb);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(10, 5.5), new THREE.MeshStandardMaterial({ color: 0xaeb2b8, roughness: 0.4, metalness: 0.6 }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, 1.215, 5.8); g.add(pad);
    const lid = new THREE.Group(); lid.position.set(0, 1.2, -10); lid.rotation.x = -0.3; g.add(lid);
    const back = new THREE.Mesh(new RoundedBoxGeometry(30, 20.5, 0.7, 3, 0.35), alu); back.position.set(0, 10.25, -0.35); lid.add(back);
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(29.2, 19.7), dark); bezel.position.set(0, 10.25, 0.01); lid.add(bezel);
    this.canvas = document.createElement('canvas'); this.canvas.width = 1280; this.canvas.height = 800;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(27.6, 17.25), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }));
    screen.position.set(0, 10.4, 0.02); lid.add(screen);
    this.group = g;
    this.last = '';
    // cable from the laptop to the printer's data port
    const port = new THREE.Vector3(-15, 0.6, -7).applyMatrix4(g.matrixWorld.compose(g.position, g.quaternion, g.scale));
    const curve = new THREE.CatmullRomCurve3([port, new THREE.Vector3(-40, 0.45, -8), new THREE.Vector3(-31, 0.45, -11), new THREE.Vector3(-25.6, 1.5, -10.2), new THREE.Vector3(-23.3, 8.4, -10.2)]);
    this.curve = curve;
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.55 }));
    cable.castShadow = true; scene.add(cable);
    const plug = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.8), new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.5 }));
    plug.position.set(-23.7, 8.4, -10.2); plug.rotation.y = Math.PI / 2; scene.add(plug);
    // packets
    const pm = new THREE.MeshBasicMaterial({ color: 0x3ec5ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.packets = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), pm);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x3ec5ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(2.6); m.add(halo);
      m.visible = false; scene.add(m); this.packets.push(m);
    }
  }

  update(st) {
    // packets travel along the cable
    this.packets.forEach((m, i) => {
      const t = st.packets * 1.9 - i * 0.06;
      m.visible = t > 0 && t < 1;
      if (m.visible) { this.curve.getPointAt(t, m.position); m.position.y += 0.55; m.rotation.set(t * 9, t * 7, 0); }
    });
    const key = `${st.cursor.x.toFixed(3)}|${st.cursor.y.toFixed(3)}|${st.pressed}|${st.printing}|${Math.round(st.packets * 20)}`;
    if (key !== this.last) { this.last = key; this.draw(st); }
  }

  draw(st) {
    const c = this.canvas, g = c.getContext('2d');
    const W = c.width, H = c.height;
    g.fillStyle = '#2b3a4a'; g.fillRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#34506b'); bg.addColorStop(1, '#1d2b3b');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // window
    g.fillStyle = '#f3f1ec'; roundRect(g, 40, 40, W - 80, H - 90, 14); g.fill();
    g.fillStyle = '#dcd8d0'; roundRect(g, 40, 40, W - 80, 52, 14); g.fill(); g.fillRect(40, 70, W - 80, 22);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(70 + i * 26, 66, 8, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#333'; g.font = '600 22px Lexend, sans-serif'; g.textAlign = 'center';
    g.fillText('gazete-sayi-12.pdf', W / 2, 74);
    // page preview
    const ph = H - 190, pw = ph * 210 / 297, px = 90, py = 118;
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(px + 6, py + 8, pw, ph);
    g.drawImage(this.content, px, py, pw, ph);
    // print dialog
    const dx = 600, dy = 110, dw = 600, dh = 470;
    g.fillStyle = '#ffffff'; roundRect(g, dx, dy, dw, dh, 16); g.fill();
    g.strokeStyle = '#d4d0c8'; g.lineWidth = 2; roundRect(g, dx, dy, dw, dh, 16); g.stroke();
    g.textAlign = 'left'; g.fillStyle = '#1b1c20'; g.font = '700 38px Lexend, sans-serif';
    g.fillText('Yazdır', dx + 36, dy + 64);
    const rows = [['Yazıcı', 'Lazer MFP · renkli'], ['Kopya sayısı', '1'], ['Renk', 'Renkli'], ['Kâğıt', 'A4 · 210 × 297 mm'], ['Kalite', '600 dpi']];
    g.font = '400 25px Lexend, sans-serif';
    rows.forEach(([a, b], i) => {
      const y = dy + 120 + i * 52;
      g.fillStyle = '#6a6c72'; g.fillText(a, dx + 36, y);
      g.fillStyle = '#1b1c20'; g.fillText(b, dx + 250, y);
      g.fillStyle = '#ecebe6'; g.fillRect(dx + 36, y + 20, dw - 72, 2);
    });
    // button
    const bx = W * 0.745 - 110, by = H * 0.845 - 34;
    g.fillStyle = st.pressed ? '#0b5fb8' : '#1677e0'; roundRect(g, bx, by, 220, 68, 14); g.fill();
    g.fillStyle = '#fff'; g.font = '600 30px Lexend, sans-serif'; g.textAlign = 'center';
    g.fillText(st.printing && !st.pressed ? 'Gönderiliyor…' : 'Yazdır', bx + 110, by + 44);
    if (st.printing) {
      g.fillStyle = '#e6e4de'; g.fillRect(dx + 36, dy + dh - 50, dw - 72, 10);
      g.fillStyle = '#1677e0'; g.fillRect(dx + 36, dy + dh - 50, (dw - 72) * Math.min(1, st.packets * 1.25), 10);
      g.fillStyle = '#6a6c72'; g.font = '400 22px Lexend, sans-serif'; g.textAlign = 'left';
      g.fillText(`Yazıcıya gönderiliyor: %${Math.round(Math.min(1, st.packets * 1.25) * 100)}`, dx + 36, dy + dh - 66);
    }
    // cursor
    const cx = st.cursor.x * W, cy = st.cursor.y * H;
    g.save(); g.translate(cx, cy); g.scale(1.6, 1.6);
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.lineTo(6, 17); g.lineTo(10, 26); g.lineTo(14, 24); g.lineTo(10, 15); g.lineTo(17, 15); g.closePath(); g.fill(); g.stroke();
    g.restore();
    this.tex.needsUpdate = true;
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---------------------------------------------------------------------------
// Toner grains leaving the developer roller for the black drum: attracted to erased spots,
// pushed back where the drum is still negatively charged.
export class TonerParticles {
  constructor(scene) {
    const N = 700;
    this.N = N;
    const geo = new THREE.IcosahedronGeometry(0.03, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.25, metalness: 0.2, emissive: 0x0b1320 });
    this.mesh = new THREE.InstancedMesh(geo, mat, N);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.seed = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
  }

  update(st, cov, vis) {
    if (vis <= 0.01 || !cov) { this.mesh.count = 0; return; }
    const k = 3, cx = DRUM_X[k], cy = DRUM_Y;
    const rd = 0.55, a = ANG.developer;
    const dc = new THREE.Vector2(cx + (DRUM_R + rd + 0.06) * Math.cos(a), cy + (DRUM_R + rd + 0.06) * Math.sin(a));
    const yk = st.lv - P_DRUM[k];
    let n = 0;
    for (let i = 0; i < this.N; i++) {
      const [h0, h1, h2, h3] = this.seed[i];
      const ph = ((st.lv * 1.7 + h0) % 1 + 1) % 1;
      const z = 2.4 + h1 * 8.2;
      const u = 0.5 - z / PAGE_W;
      // spot on the drum across the gap
      const spread = (h2 - 0.5) * 0.9; // radians around the nip
      const angD = a + spread * 0.6;
      const drumP = new THREE.Vector2(cx + DRUM_R * Math.cos(angD), cy + DRUM_R * Math.sin(angD));
      const dir = new THREE.Vector2(cx, cy).sub(dc).normalize();
      const angR = Math.atan2(dir.y, dir.x) + spread;
      const devP = new THREE.Vector2(dc.x + rd * Math.cos(angR), dc.y + rd * Math.sin(angR));
      const row = yk + D_DEV + spread * 0.6 * DRUM_R;
      const c = row >= 0 && row <= PAGE_L ? cov(u, row / PAGE_L) : 0;
      let t;
      if (c > 0.45) t = Math.min(1, ph * 1.6);             // jumps across and sticks
      else t = 0.45 * Math.sin(Math.PI * Math.min(1, ph * 1.3)); // lifts off and falls back
      const p = devP.clone().lerp(drumP, t);
      const wob = (h3 - 0.5) * 0.12 * Math.sin(Math.PI * t);
      this._p.set(p.x + wob, p.y + wob * 0.6, z);
      const sc = (c > 0.45 && ph * 1.6 > 1) ? 0.001 : (0.8 + h3 * 0.5) * vis;
      this._s.setScalar(sc);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(n++, this._m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Water vapour leaving the paper after the fuser.
export class Steam {
  constructor(scene) {
    this.sprites = [];
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      scene.add(s); this.sprites.push({ s, h: Math.random(), z: -8 + Math.random() * 18 });
    }
  }
  update(T, vis) {
    this.sprites.forEach(({ s, h, z }) => {
      const ph = ((T * 0.35 + h) % 1);
      s.position.set(-18.5 + Math.sin(ph * 6 + h * 9) * 0.6 - ph * 1.2, 14.2 + ph * 5, z);
      s.scale.setScalar(1.2 + ph * 3.5);
      s.material.opacity = vis * 0.22 * Math.sin(Math.PI * ph);
    });
  }
}
