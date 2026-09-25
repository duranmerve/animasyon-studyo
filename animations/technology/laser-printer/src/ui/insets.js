// Close-up diagrams drawn in 2D beside the 3D view: what happens at the scale of charges,
// toner grains and paper fibres. Each draw function returns { title, caption }.
const W = 480, H = 360;
const INK = '#15171c', PAPER = '#fbf8f0', GREEN = '#2f7a55', GREEN2 = '#9cc7a9', BLUE = '#1e7fe0', RED = '#ff3b2f', ORANGE = '#ff8a3c', ALU = '#b9bec5';
const TONER = { C: '#00a0df', M: '#e5007d', Y: '#ffd400', K: '#1b1c20' };

export class Insets {
  constructor(canvas, contentCanvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.content = contentCanvas;
    this.resize();
    this.prepLetter();
    this.prepPhoto();
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.c.width = W * dpr; this.c.height = H * dpr;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  prepLetter() {
    const n = 20, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.font = `600 ${n * 1.05}px "Source Serif 4", Georgia, serif`; g.textAlign = 'center';
    g.fillText('a', n / 2, n * 0.8);
    const d = g.getImageData(0, 0, n, n).data;
    this.letter = { n, cells: Array.from({ length: n * n }, (_, i) => d[i * 4 + 3] / 255) };
  }
  prepPhoto() {
    // crop around the lighthouse from the page, as CMYK tone grids
    const src = this.content, cw = 64, ch = 48;
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d');
    const sx = src.width * (14 + 182 * 0.56) / 210, sy = src.height * (66 + 94 * 0.12) / 297;
    const sw = src.width * (182 * 0.34) / 210, sh = sw * ch / cw;
    g.drawImage(src, sx, sy, sw, sh, 0, 0, cw, ch);
    const d = g.getImageData(0, 0, cw, ch).data;
    const tone = { C: [], M: [], Y: [], K: [] };
    for (let i = 0; i < cw * ch; i++) {
      const r = d[i * 4] / 255, gg = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
      const k = Math.min(1 - r, 1 - gg, 1 - b);
      const s = k > 0.999 ? 0 : 1 / (1 - k);
      tone.C.push((1 - r - k) * s); tone.M.push((1 - gg - k) * s); tone.Y.push((1 - b - k) * s); tone.K.push(k);
    }
    this.photo = { cw, ch, tone, img: c };
  }

  draw(kind, lt, q, extra) {
    const g = this.g;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const fn = this[kind];
    return fn ? fn.call(this, g, lt, q, extra || {}) : { title: '', caption: '' };
  }

  // ------------------------------------------------------------ RIP / halftone / CMYK
  raster(g, lt, q) {
    if (q <= 0) {
      g.fillStyle = INK; g.font = '600 190px "Source Serif 4", Georgia, serif'; g.textAlign = 'center';
      g.fillText('a', 110, 250);
      arrow(g, 205, 180, 250, 180);
      const n = this.letter.n, s = 10, x0 = 262, y0 = 80;
      const shown = Math.min(n * n, Math.floor(lt * 90));
      for (let i = 0; i < n * n; i++) {
        const x = i % n, y = (i / n) | 0;
        const on = this.letter.cells[i] > 0.45;
        g.fillStyle = i < shown && on ? INK : '#f1efe9';
        g.fillRect(x0 + x * s, y0 + y * s, s - 1, s - 1);
      }
      label(g, 'Yazı', 110, 300); label(g, 'Nokta ızgarası', 362, 300);
      return { title: 'İşlemci: sayfayı noktalara çevirir', caption: 'Her harf, kareli bir ızgarada boyanacak ya da boş kalacak noktalara dönüşür.' };
    }
    if (q === 1) {
      // A4 outline with the dot counts
      const pw = 150, ph = 212, px = 50, py = 60;
      g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(px, py, pw, ph);
      g.fillStyle = '#f4f1e9'; g.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      const z = 0.5 + 0.5 * Math.sin(lt * 1.2);
      g.strokeStyle = RED; g.lineWidth = 2; g.strokeRect(px + 20, py + 30, 26, 26);
      g.beginPath(); g.moveTo(px + 46, py + 30); g.lineTo(260, 60); g.moveTo(px + 46, py + 56); g.lineTo(260, 290); g.stroke();
      const cells = 12 + Math.round(z * 8), gs = 230 / cells;
      for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
        g.fillStyle = (x + y * 3) % 7 < 3 ? INK : '#e7e4dc';
        g.beginPath(); g.arc(260 + (x + 0.5) * gs, 60 + (y + 0.5) * gs, gs * 0.36, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = INK; g.font = '600 15px Lexend'; g.textAlign = 'center';
      g.fillText('4 960 nokta', px + pw / 2, py - 12);
      g.save(); g.translate(px - 14, py + ph / 2); g.rotate(-Math.PI / 2); g.fillText('7 016 nokta', 0, 0); g.restore();
      g.font = '700 22px Lexend'; g.fillText('≈ 35 milyon', px + pw / 2, py + ph + 36);
      return { title: '600 dpi = inç başına 600 nokta', caption: '1 inç 2,54 cm’dir. A4 sayfa 4 960 × 7 016 ≈ 35 milyon noktadan oluşur.' };
    }
    if (q === 2) {
      const x0 = 40, x1 = 440;
      const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
      g.fillStyle = gr; g.fillRect(x0, 60, x1 - x0, 70); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(x0, 60, x1 - x0, 70);
      arrow(g, 240, 145, 240, 180);
      const cell = 16;
      for (let y = 0; y < 5; y++) for (let x = 0; x < 25; x++) {
        const t = (x + 0.5) / 25, r = cell * 0.5 * Math.sqrt(t) * 1.13 * Math.min(1, 0.2 + lt * 0.5);
        g.fillStyle = INK; g.beginPath(); g.arc(x0 + (x + 0.5) * cell, 200 + (y + 0.5) * cell, Math.min(cell * 0.72, r), 0, Math.PI * 2); g.fill();
      }
      g.strokeRect(x0, 200, x1 - x0, 80);
      label(g, 'İstenen ton', 240, 50); label(g, 'Yazıcının yaptığı: yalnızca siyah noktalar', 240, 312);
      return { title: 'Yarım ton (raster)', caption: 'Gri, aslında boyutu değişen siyah noktalardır. Uzaktan bakınca göz onları karıştırır.' };
    }
    // q3: CMYK separation of the photo
    const { cw, ch, tone } = this.photo;
    const tw = 140, th = 105;
    g.imageSmoothingEnabled = true;
    g.drawImage(this.photo.img, 20, 30, tw, th);
    label(g, 'Fotoğraf', 20 + tw / 2, 152);
    const chans = [['C', 15, 'Camgöbeği'], ['M', 75, 'Macenta'], ['Y', 0, 'Sarı'], ['K', 45, 'Siyah']];
    const reveal = Math.min(1, lt / 2.5);
    chans.forEach(([k, ang, name], i) => {
      const x = 190 + (i % 2) * 150, y = 30 + ((i / 2) | 0) * 150;
      halftoneTile(g, tone[k], cw, ch, x, y, tw, th, ang, TONER[k], 7, 'multiply', reveal);
      g.strokeStyle = '#ddd'; g.lineWidth = 1; g.strokeRect(x, y, tw, th);
      label(g, name, x + tw / 2, y + th + 17);
    });
    // composite
    const cx = 20, cy = 190;
    chans.forEach(([k, ang]) => halftoneTile(g, tone[k], cw, ch, cx, cy, tw, th, ang, TONER[k], 7, 'multiply', reveal));
    g.strokeStyle = '#ddd'; g.strokeRect(cx, cy, tw, th);
    label(g, 'Dördü üst üste', cx + tw / 2, cy + th + 17);
    return { title: 'Dört renge ayırma: CMYK', caption: 'Her renk katmanı ayrı bir açıyla noktalanır. Üst üste basılınca bütün renkler ortaya çıkar.' };
  }

  // ------------------------------------------------------------ drum surface helpers
  surface(g, y, h = 46) {
    g.fillStyle = ALU; g.fillRect(0, y + h * 0.55, W, h * 0.45);
    g.fillStyle = GREEN; g.fillRect(0, y, W, h * 0.55);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, y, W, 3);
  }
  surfaceLegend(g, y) {
    g.font = '500 13px Lexend'; g.textAlign = 'left';
    g.fillStyle = '#fff'; g.fillText('ışığa duyarlı katman', 10, y + 18);
    g.fillStyle = INK; g.fillText('alüminyum tambur', 10, y + 40);
  }

  charge(g, lt) {
    const y = 210, v = 38;
    this.surface(g, y);
    // charge roller
    const rx = 120;
    g.fillStyle = '#34363b'; g.beginPath(); g.arc(rx, y - 52, 52, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = -lt * 1.5 + i; g.beginPath(); g.moveTo(rx + Math.cos(a) * 20, y - 52 + Math.sin(a) * 20); g.lineTo(rx + Math.cos(a) * 44, y - 52 + Math.sin(a) * 44); g.stroke(); }
    label(g, 'Şarj silindiri', rx, y - 118);
    // charges passing under the roller appear
    for (let i = 0; i < 30; i++) {
      const x = ((i * 22 + lt * v) % (W + 22)) - 11;
      if (x > rx + 2) minus(g, x, y + 11, 8, BLUE);
    }
    arrow(g, 300, y + 80, 380, y + 80);
    g.fillStyle = INK; g.font = '500 14px Lexend'; g.textAlign = 'center'; g.fillText('dönme yönü', 340, y + 104);
    g.font = '700 28px Lexend'; g.fillStyle = BLUE; g.fillText('−600 V', 360, 120);
    this.surfaceLegend(g, y);
    return { title: 'Yakından: tambur yüzeyi', caption: 'Silindirin geçtiği her yer eşit miktarda eksi yükle kaplanır.' };
  }

  laser(g, lt, q) {
    const y = 210, v = 40, bx = 240;
    this.surface(g, y);
    const pattern = [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0];
    // each charge site i passes the beam at a known time; it is erased if the pattern says so
    for (let i = 0; i < 40; i++) {
      const x = ((i * 22 + lt * v) % (W + 22)) - 11;
      const lap = Math.floor((i * 22 + lt * v) / (W + 22));
      const bit = pattern[(i + lap * 5) % pattern.length];
      if (x > bx && bit) { g.fillStyle = 'rgba(255,138,60,0.45)'; g.beginPath(); g.arc(x, y + 12, 10, 0, Math.PI * 2); g.fill(); }
      else minus(g, x, y + 11, 8, BLUE);
    }
    // beam firing when an "on" site is under it
    let firing = false;
    for (let i = 0; i < 40; i++) {
      const x = ((i * 22 + lt * v) % (W + 22)) - 11, lap = Math.floor((i * 22 + lt * v) / (W + 22));
      if (Math.abs(x - bx) < 9 && pattern[(i + lap * 5) % pattern.length]) firing = true;
    }
    g.strokeStyle = firing ? RED : 'rgba(255,59,47,0.15)'; g.lineWidth = firing ? 6 : 3;
    g.beginPath(); g.moveTo(bx, 20); g.lineTo(bx, y); g.stroke();
    if (firing) { g.fillStyle = 'rgba(255,80,60,0.35)'; g.beginPath(); g.arc(bx, y + 4, 18, 0, Math.PI * 2); g.fill(); }
    label(g, firing ? 'lazer: açık' : 'lazer: kapalı', bx + 70, 40);
    this.surfaceLegend(g, y);
    if (q >= 3) {
      g.fillStyle = 'rgba(255,255,255,0.94)'; g.fillRect(0, 0, W, 175);
      g.font = '700 110px "Playfair Display", Georgia, serif'; g.textAlign = 'center';
      g.save(); g.translate(120, 125); g.scale(-1, 1); g.fillStyle = GREEN; g.fillText('R', 0, 0); g.restore();
      g.fillStyle = INK; g.fillText('R', 360, 125);
      arrow(g, 195, 90, 285, 90);
      g.font = '500 14px Lexend'; g.fillText('tamburda', 120, 160); g.fillText('kâğıtta', 360, 160);
    }
    const caps = [
      'Işın her satırı tambur boyunca bir uçtan öbür uca tarar.',
      'Işık düşen noktada yük akıp gider; karanlıkta kalan noktalar yüklü kalır.',
      'Yüklü ve yüksüz noktalar görünmeyen bir görüntü oluşturur: gizli görüntü.',
      'Mühür gibi: tamburdaki görüntü ters, kâğıda geçince düz olur.',
      'Gerçek yazıcılarda ışın çoğu zaman kızılötesidir, gözle görülmez.',
    ];
    return { title: 'Yakından: lazer ve yük', caption: caps[Math.max(0, Math.min(4, q))] };
  }

  develop(g, lt, q) {
    const y = 250, v = 26;
    this.surface(g, y, 40);
    const pattern = [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0];
    const sites = [];
    for (let i = 0; i < 40; i++) {
      const x = ((i * 22 + lt * v) % (W + 22)) - 11, lap = Math.floor((i * 22 + lt * v) / (W + 22));
      const erased = pattern[(i + lap * 5) % pattern.length];
      sites.push({ x, erased });
      if (erased) { g.fillStyle = 'rgba(255,138,60,0.35)'; g.beginPath(); g.arc(x, y + 10, 9, 0, Math.PI * 2); g.fill(); }
      else minus(g, x, y + 10, 7, BLUE);
    }
    // developer roller band at the top carrying grains
    g.fillStyle = '#2d2f34'; g.fillRect(0, 0, W, 46);
    label(g, 'Geliştirme silindiri', 100, 64, '#fff', INK);
    // grains: each column releases grains; over erased sites they land and stay
    for (let k = 0; k < 22; k++) {
      const col = sites[(k * 7) % sites.length];
      const ph = (lt * 0.55 + k * 0.37) % 1;
      const x = col.x;
      let yy;
      if (col.erased) yy = 44 + (y - 58) * Math.min(1, ph * 1.4);
      else yy = 44 + (y - 58) * 0.55 * Math.sin(Math.PI * ph);
      grain(g, x + ((k % 3) - 1) * 4, yy, 8);
    }
    // grains already stuck on erased sites
    sites.forEach(s => { if (s.erased && s.x > -10 && s.x < W + 10) { grain(g, s.x - 5, y - 4, 7); grain(g, s.x + 5, y - 5, 7); } });
    if (q === 0) {
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(0, 70, W, 110);
      g.fillStyle = '#c8a27a'; g.fillRect(40, 95, 400, 70);
      g.fillStyle = INK; g.font = '500 14px Lexend'; g.textAlign = 'left'; g.fillText('saç teli ≈ 70 µm', 50, 88);
      for (let i = 0; i < 6; i++) grain(g, 70 + i * 16, 130, 3.5);
      g.fillStyle = '#fff'; g.fillText('toner taneleri ≈ 7 µm', 180, 135);
    }
    const caps = [
      'Bir toner tanesi saç telinden yaklaşık on kat incedir.',
      'Silindir tanelere eksi yük verir ve onları tamburun hemen yanına getirir.',
      'Eksi yük eksi yükü iter: taneler yalnızca yükü silinmiş noktalara tutunur.',
      'Gizli görüntü artık tozdan, görünür bir görüntü.',
    ];
    return { title: 'Yakından: toner taneleri', caption: caps[Math.max(0, Math.min(3, q))] };
  }

  transfer(g, lt, q) {
    // drum on top, paper in the middle, transfer roller below
    const dy = 40, py = 170, ry = 250;
    this.surface(g, dy, 40);
    g.fillStyle = '#f6f1e3'; g.fillRect(0, py, W, 26); g.strokeStyle = '#d8cfb8'; g.strokeRect(-1, py, W + 2, 26);
    g.fillStyle = '#3b4a58'; g.fillRect(0, ry, W, 80);
    for (let i = 0; i < 16; i++) plus(g, 20 + i * 30, ry + 40, 9, '#ffcf5a');
    label(g, 'Aktarım silindiri (+)', W / 2, ry + 100, INK, '#fff');
    label(g, 'Kâğıt', 440, py + 13, INK, '#f6f1e3');
    const ph = (lt * 0.45) % 1;
    const layers = q >= 1 ? ['Y', 'M', 'C'] : [];
    for (let i = 0; i < 14; i++) {
      const x = 25 + i * 32;
      // earlier colour layers already on the paper
      layers.forEach((c, j) => { g.globalAlpha = 0.85; g.fillStyle = TONER[c]; g.beginPath(); g.arc(x + (j - 1) * 5, py + 8 - j * 2, 6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; });
      if (i % 3 === 2) continue;
      const t = Math.min(1, Math.max(0, (ph - i * 0.02) * 1.8));
      const yy = dy - 6 + (py - dy - 2) * t + 0;
      grain(g, x, yy + 6, 7);
    }
    const caps = [
      'Kâğıdın altındaki artı yük, eksi yüklü toneri tamburdan kâğıda çeker.',
      'Sarı, macenta ve camgöbeği katmanları kâğıtta hazır bekliyor.',
      'Siyah son katman olarak üstlerine eklenir.',
      'Toz henüz yapışmadı; kâğıdın üstünde gevşekçe duruyor.',
    ];
    return { title: 'Yakından: aktarım', caption: caps[Math.max(0, Math.min(3, q))] };
  }

  clean(g, lt) {
    const y = 200, v = 34;
    this.surface(g, y);
    const bx = 300;
    // leftover grains travelling to the blade and falling into the bin
    for (let i = 0; i < 9; i++) {
      const s = (i * 53 + lt * v) % (W + 60) - 30;
      if (s < bx) grain(g, s, y - 7, 7);
      else { const f = (s - bx) / 60; grain(g, bx + 10 + f * 14, y - 7 + f * f * 110, 7); }
    }
    g.fillStyle = '#6b6f76';
    g.beginPath(); g.moveTo(bx, y + 1); g.lineTo(bx + 90, y - 110); g.lineTo(bx + 110, y - 100); g.lineTo(bx + 14, y + 1); g.closePath(); g.fill();
    label(g, 'Temizleme bıçağı', bx + 60, y - 130);
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(bx + 5, y + 60, 120, 70);
    g.fillStyle = '#2b2d31'; g.fillRect(bx + 8, y + 108, 114, 19);
    label(g, 'Atık bölmesi', bx + 65, y + 150);
    // recharging after the blade
    g.fillStyle = 'rgba(30,127,224,0.12)'; g.fillRect(0, y - 60, 120, 60);
    this.surfaceLegend(g, y);
    return { title: 'Yakından: temizleme', caption: 'Kalan taneler kazınır; temizlenen yüzey bir sonraki tur için yeniden yüklenir.' };
  }

  fuse(g, lt, q) {
    const u = Math.min(1, lt / 5);
    const temp = Math.round(25 + 170 * Math.min(1, lt / 3));
    // heat roller
    const gr = g.createLinearGradient(0, 0, 0, 90);
    gr.addColorStop(0, '#ff6a2a'); gr.addColorStop(1, '#ffb070');
    g.fillStyle = gr; g.fillRect(0, 0, W, 70);
    label(g, `Isıtma silindiri · ${temp} °C`, 150, 90, '#fff', '#c84a12');
    // paper fibres (cross-section)
    g.fillStyle = '#f3ecd9'; g.fillRect(0, 200, W, 160);
    g.strokeStyle = '#d9cba6'; g.lineWidth = 3;
    for (let r = 0; r < 7; r++) { g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, 214 + r * 20 + Math.sin(x * 0.05 + r * 1.7) * 5); g.stroke(); }
    label(g, 'Kâğıt lifleri', 400, 340, INK, '#f3ecd9');
    // grains melting into the fibres
    for (let i = 0; i < 16; i++) {
      const x = 24 + i * 28 + (i % 2) * 6;
      const r = 9;
      const melt = Math.min(1, Math.max(0, (u - 0.15) * 1.6));
      const rx = r * (1 + melt * 0.9), ry = r * (1 - melt * 0.55);
      const yy = 190 - r + melt * 16;
      g.fillStyle = TONER.K; g.beginPath(); g.ellipse(x, yy, rx, ry, 0, 0, Math.PI * 2); g.fill();
      if (melt > 0.5) { g.fillStyle = 'rgba(27,28,32,0.5)'; g.fillRect(x - rx * 0.8, yy + ry * 0.4, rx * 1.6, 8 * melt); }
    }
    // pressure arrow
    arrow(g, 440, 110, 440, 170);
    g.fillStyle = INK; g.font = '500 14px Lexend'; g.textAlign = 'center'; g.fillText('basınç', 440, 100);
    return { title: 'Yakından: eritme', caption: q >= 1 ? 'Soğuyan plastik liflere sıkıca tutunur; artık silinmez.' : 'Isı tozu eritir, basınç onu liflerin arasına iter.' };
  }

  scan(g, lt, q, extra) {
    const s = extra.scan;
    if (!s) return { title: 'Sensörün gördüğü', caption: '' };
    const prog = extra.progress ?? 0;
    const iw = 160, ih = Math.round(iw * s.h / s.w), ix = 12, iy = (H - ih) / 2;
    if (!this.scanImg) {
      const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
      const cg = c.getContext('2d'); const id = cg.createImageData(s.w, s.h);
      for (let i = 0; i < s.w * s.h; i++) { const v = s.data[i]; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
      cg.putImageData(id, 0, 0); this.scanImg = c;
    }
    g.fillStyle = '#e9e7e2'; g.fillRect(ix, iy, iw, ih);
    const rows = Math.floor(prog * s.h);
    if (rows > 0) g.drawImage(this.scanImg, 0, 0, s.w, rows, ix, iy, iw, rows * ih / s.h);
    g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(ix, iy, iw, ih);
    const row = Math.min(s.h - 1, rows);
    const ly = iy + row * ih / s.h;
    if (prog > 0 && prog < 1) { g.strokeStyle = BLUE; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ix - 4, ly); g.lineTo(ix + iw + 4, ly); g.stroke(); }
    // graph of the current row
    const gx = 200, gy = 40, gw = 265, gh = 200;
    g.strokeStyle = '#ccc'; g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const yy = gy + gh * i / 4; g.beginPath(); g.moveTo(gx, yy); g.lineTo(gx + gw, yy); g.stroke(); }
    g.fillStyle = INK; g.font = '500 13px "JetBrains Mono", monospace'; g.textAlign = 'right';
    g.fillText('255', gx - 6, gy + 4); g.fillText('0', gx - 6, gy + gh + 4);
    g.textAlign = 'left'; g.font = '500 13px Lexend';
    g.fillText('beyaz', gx + gw - 44, gy - 8); g.fillText('siyah', gx + gw - 40, gy + gh + 18);
    if (prog > 0) {
      g.strokeStyle = BLUE; g.lineWidth = 1.6; g.beginPath();
      for (let x = 0; x < s.w; x++) { const v = s.data[row * s.w + x]; const px = gx + x * gw / s.w, py = gy + gh - v / 255 * gh; x ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
      // a few numbers
      g.font = '500 16px "JetBrains Mono", monospace'; g.fillStyle = INK; g.textAlign = 'left';
      const nums = [0.1, 0.3, 0.5, 0.7, 0.9].map(f => String(s.data[row * s.w + Math.floor(f * s.w)]).padStart(3, ' '));
      g.fillText(nums.join('  '), gx, gy + gh + 50);
      g.font = '500 13px Lexend'; g.fillStyle = '#6a6d75'; g.fillText('bu satırdan örnek değerler', gx, gy + gh + 72);
    }
    const caps = ['', 'Lamba satır satır ilerlerken sensör parlaklığı ölçer.', 'Her satırdaki binlerce nokta tek tek ölçülür.', 'Sayılar 0 (siyah) ile 255 (beyaz) arasında.'];
    return { title: 'Sensörün gördüğü', caption: caps[Math.max(1, Math.min(3, q))] };
  }

  summary(g, lt) {
    const cx = 200, cy = 170, R = 72;
    const steps = [
      ['1', 'Yükle', 120], ['2', 'Işıkla çiz', 45], ['3', 'Tozla', -20], ['4', 'Aktar', -90], ['6', 'Temizle', 190],
    ];
    const on = Math.floor(lt / 1.3) % 6;
    // paper line and fuser
    g.fillStyle = '#f3ecd9'; g.fillRect(0, cy + R + 6, W, 14);
    g.fillStyle = '#ff8a3c'; g.beginPath(); g.arc(420, cy + R - 12, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6b6f76'; g.beginPath(); g.arc(420, cy + R + 46, 26, 0, Math.PI * 2); g.fill();
    badge(g, 420, cy + R - 60, '5', 'Erit', on === 4);
    // drum
    g.fillStyle = GREEN; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = GREEN2; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R - 10, 0.2, 1.4); g.stroke();
    steps.forEach(([n, name, a]) => {
      const r = a * Math.PI / 180;
      const x = cx + Math.cos(r) * (R + 58), y = cy - Math.sin(r) * (R + 50);
      g.strokeStyle = '#bbb'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + Math.cos(r) * R, cy - Math.sin(r) * R); g.lineTo(x, y); g.stroke();
      badge(g, x, y, n, name, on === Number(n) - 1);
    });
    arrow(g, cx - 20, cy - 10, cx + 20, cy - 10);
    return { title: 'Altı adım', caption: 'Yükle → ışıkla çiz → tozla → aktar → erit → temizle. Her sayfada, her tamburda.' };
  }
}

// ---- drawing helpers
function minus(g, x, y, s, col) { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x - s * 0.6, y); g.lineTo(x + s * 0.6, y); g.stroke(); }
function plus(g, x, y, s, col) { minus(g, x, y, s, col); g.beginPath(); g.moveTo(x, y - s * 0.6); g.lineTo(x, y + s * 0.6); g.stroke(); }
function grain(g, x, y, r) {
  g.fillStyle = TONER.K; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  if (r > 5) { g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - r * 0.45, y); g.lineTo(x + r * 0.45, y); g.stroke(); }
}
function arrow(g, x0, y0, x1, y1) {
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 11 * Math.cos(a - 0.45), y1 - 11 * Math.sin(a - 0.45)); g.lineTo(x1 - 11 * Math.cos(a + 0.45), y1 - 11 * Math.sin(a + 0.45)); g.closePath(); g.fill();
}
function label(g, text, x, y, col = INK, bg = null) {
  g.font = '600 14px Lexend'; g.textAlign = 'center';
  if (bg) { const w = g.measureText(text).width + 16; g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - 15, w, 22, 11); g.fill(); }
  g.fillStyle = col; g.fillText(text, x, y);
}
function badge(g, x, y, n, name, on) {
  g.fillStyle = on ? INK : '#fff'; g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = on ? '#ffd400' : INK; g.font = '600 14px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(n, x, y + 5);
  g.fillStyle = INK; g.font = `${on ? 700 : 500} 14px Lexend`; g.fillText(name, x, y + 33);
}
// rotated halftone of a tone grid, drawn as dots of one toner colour
function halftoneTile(g, tone, cw, ch, x, y, w, h, angDeg, color, period, blend, reveal = 1) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.globalCompositeOperation = blend;
  g.fillStyle = color;
  const a = angDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const R = Math.hypot(w, h);
  for (let i = -R / period; i < R / period; i++) for (let j = -R / period; j < R / period; j++) {
    const px = x + w / 2 + (i * ca - j * sa) * period, py = y + h / 2 + (i * sa + j * ca) * period;
    if (px < x - period || px > x + w + period || py < y - period || py > y + h + period) continue;
    if ((px - x) / w > reveal) continue;
    const tx = Math.min(cw - 1, Math.max(0, Math.floor((px - x) / w * cw))), ty = Math.min(ch - 1, Math.max(0, Math.floor((py - y) / h * ch)));
    const t = Math.max(0, Math.min(1, tone[ty * cw + tx]));
    if (t < 0.02) continue;
    g.beginPath(); g.arc(px, py, period * 0.62 * Math.sqrt(t), 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
