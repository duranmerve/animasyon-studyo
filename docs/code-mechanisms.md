# Kodla üretilen animasyonlarda işe yarayan mekanizmalar: dokuz deponun kaynak okuması

Tarih: 26 Eylül 2026. Dokuz depo `git clone --depth 1` ile indirildi ve kaynak dosyaları doğrudan okundu (README pazarlaması değil, `src/`, `scripts/`, `SKILL.md`, `references/`). Her depo için: dosya haritası, somut mekanizmalar, kullandıkları sayılar, otomatik kalite kapıları ve bizim boru hattımıza (tarayıcıda `renderAt(t)` / `draw(t)` saf zaman fonksiyonu, Babylon.js / Three.js / Canvas 2D, headless Chrome + ffmpeg ile `tools/render-video.mjs`, sayfada çevrimdışı üretilen Web Audio film sesi, Whisper kelime zamanlı Türkçe anlatım) aktarılabilecekler.

Kod alıntıları yalnızca MIT lisanslı depolardan ve en çok 15 satır. Lisansı belirsiz depolar (PDoomVideo, Austerlitz) düzyazı ve sözde kodla anlatıldı; onlardan satır kopyalanmadı.

| # | Depo | Lisans | Çalışır kod mu, belge mi? |
|---|---|---|---|
| 1 | JohnHeibel/PDoomVideo | LICENSE dosyası yok; `package.json` "ISC" diyor. Belirsiz sayıldı, alıntı yapılmadı | Çalışır: p5.brush + puppeteer |
| 2 | iart-ai/javascript-animation-skills | MIT | Çalışır: skill + render/denetim betikleri + şablon |
| 3 | klsoen/opus-js-animations | MIT | Çalışır: skill + CDP tabanlı araçlar + şablon |
| 4 | ektogamat/threejs-conference | MIT (Anderson Mancini, Sunag); modeller/varlıklar ayrı | Çalışır: WebGPU + TSL uygulaması |
| 5 | gkren22/cinematic-3d-website | MIT | Yalnızca belge (SKILL + 7 referans); çalışır kod yok |
| 6 | JonathanBeck1/claude-studio-toolkit | MIT | Belge + komut/ajan istemleri + 4 GLSL parçası; "ether" motoruna atıf yapar ama motor depoda değil |
| 7 | WinterArc21/Battle-of-Austerlitz-Film | Lisans yok | Çalışır: WebGL2 + Playwright + Kokoro + NumPy miksaj |
| 8 | CK42BB/procedural-clouds-threejs | MIT | Yalnızca belge (SKILL + iki referans); GLSL/WGSL parçaları belge içinde |
| 9 | AmitSubhash/3brown1blue | MIT | Çalışır: Python CLI + Manim skill; "18 kural" `prompts.py` içinde |

---

## 1. PDoomVideo (156,6 s müzik videosu, p5.brush sulu boya)

### Dosya haritası

| Dosya | Görev |
|---|---|
| `ANIMATION_GUIDE.md` | Alt ajanlara verilen brifing: bölüm dosyası sözleşmesi, çizim API'si, karakter API'si, stil kuralları, kontrol komutları |
| `STORYBOARD.md` | Çekim listesi; her satır: zaman, söz, çekim, çıkış geçişi; bölüm paletleri |
| `src/core.js` | Sabitler (W, H, BPM, BEAT, OFF, BOIL, DUR), palet, easing seti, `kf`, `pulse`, `seg`, kamera, harf kuyruğu, kâğıt ve gren, `paint()` sarmalayıcı, `renderAt(t)` ve `renderSheet()` |
| `src/timeline.js` | `chapter()` kaydı, `drawWorld(t)` (çekim seçimi), fırça silme geçişleri, köşe göstergesi, karaoke bandı |
| `src/clawd.js`, `src/cast.js`, `src/props.js` | Karakterler (poz, yüz, şapka, kancalar), `mood()` ve `move()`/`dancer()`, sahne dekorları |
| `src/lyrics.js` | `[başlangıç, bitiş, metin]` üçlüleri |
| `src/ch/c01…c09` | Bölüm başına bir IIFE dosyası; her biri bir alt ajan tarafından yazılmış |
| `studio.html` | Tek sayfa: p5 tuvali gizli, 2B kompozitör tuvali görünür, kaydırıcı |
| `render.mjs` | puppeteer-core sürücüsü: sheet, stills, clip, frames (paralel, sürdürülebilir), encode |

### Mekanizmalar

1. **Bölüm = IIFE, çekim = `fn(t, lt, dur)`.** `chapter(name, start, end, [[t0, fn], …])` kaydeder. Zaman çizelgesi `t`'ye göre bölümü ve çekimi bulur, çekimi `fn(t, t - t0, sonrakiT0 - t0)` ile çağırır. Çekim fonksiyonu kareyi arka plan dahil tamamen boyar. Yardımcılar IIFE içinde özel kalır, dolayısıyla paralel ajanların ad çakışması olmaz.
2. **Saflık kuralı ve "boil".** Kareler paralel ve sırasız üretilir; `Math.random()` yasak. Nesne başına kararlı rastgelelik `hash(i)` (sin tabanlı), el çizimi titremesi `jit(a)` ile; p5 tohumu her karede `1000 + floor(t · BOIL)` olarak yeniden atanır (BOIL = 12/s), böylece çizgi el çizimi gibi "kaynar" ama aynı `t` her zaman aynı kareyi verir.
3. **Vuruş ızgarası.** BPM 88 → BEAT 0,682 s, OFF 0,21 s (ilk vuruş). `bpOf(t) = (t − OFF)/BEAT`. `pulse(t, k=6) = exp(−frac(bpOf(t)) · k)`: vuruşta 1, sonra üstel söner; `pulse2` sekizlikte. Kılavuz: "önemli hareketi 0,21 + n × 0,682 zamanlarına koy". Pompa kolu `pumpH(t)`: vuruşun ilk %78'inde yükselir (smoothstep), son %22'sinde düşer (easeIn), yani darbe tam vuruşa iner.
4. **Easing seti ve `kf`.** `ease` (smoothstep), `easeOut` (1 − (1−x)³), `easeIn` (x³), `backOut` (s = 1,9 aşımlı), `elasticOut`, artı `lerp`, `clamp`, `frac`, `wob(t, f, ph)` (sinüs), `seg(t, a, b)` (0..1 ilerleme). `kf(t, [[t0, v0], [t1, v1], …], easeFn)` parça parça eased anahtar kare; değerler sayı ya da dizi olabilir. Kamera sarsıntısı `shakeXY` 24 fps'e kilitli hash'tir (kare içinde titremez).
5. **Kamera tek seviye.** `camBegin(cx, cy, zoom, rot)` dünya noktasını ekran merkezine koyar; `camEnd()` şart. Harfler ayrı bir kuyruğa alınır, kamera dönüşümü onlara `toScreen()` ile uygulanır ve çekimden sonra 2B kompozitöre çizilir (gren altında). `flushLetters()` çağrısı harfleri tabloya gömer ki sonraki boya (silme geçişi) üstünü örtsün.
6. **Tek `paint(pts, o)` sarmalayıcısı.** Bir çağrı = düz `wash` (karakterler) + sulu boya `fill` (`bleed` 0,05–0,3, `tex` 0,3–0,9, `border` 0,2–0,8; arka plan ve ışık) + isteğe bağlı `hatch` + tek sürekli konik `ink` kontur (`sw` 0,4–2). Geometri üreticileri (`rectPts`, `ellPts`, `rrPts`, `starPts`, `heartPts`) noktaları jitter'lı verir. Kâğıt dokusu ve vinyet bir kez üretilir ve her kare `multiply` ile çarpılır.
7. **Karakter "ruh hâli" ve dans.** `mood(t, [[t0, 'normal'], [t1, 'scared', 'sweat'], …])`: değişimden sonraki 0,16 s göz kısılır ve gövde −0,14 squash "take" yapar, 0,16–0,4 s arasında geri sıçrar, emote 0,05–0,3 s'de açılır 1,4–1,7 s'de kapanır. Yüzler asla anında değişmez. `move(style, t, seed)`: `bounce, hop, roof, sway, spin, wave, walk, run, idle, stomp, shimmy, mix` — hepsi `bpOf(t)`'den türeyen `dy, sq, aL, aR, rot, dx` ofsetleri; `hit = max(0, 1 − bf·3,5)` vuruşta squash. `dancer()` = `clawd()` + `move()`.
8. **Karaoke bandı.** Söz aktifken alt bantta (y ≈ 975–1070) mürekkep rengi kutu 0,18 s'de büyür, 0,12 s'de kapanır; kelimeler `sung = clamp((t−a)/singDur) · harfSayısı` ile soldan sağa `clip()` ile boyanır; `singDur = min(b−a−0,1, 0,45 + 0,075·harf)`. Kılavuz: "yüzler y 960 üstünde kalsın".
9. **Bölüm geçişi: fırça silme.** 1,5 / 38,5 / 73,0 / 109,4 s'de ±0,3 s pencerede 5 kalın boya şeridi −0,1 rad eğimle soldan girer (p < 0,5 örter), sahne tam örtüldüğünde değişir, p ≥ 0,5'te şeritler sağa çekilir. Şerit renkleri bölüm paletinden.
10. **Render sürücüsü.** `--sheet=t1,t2,…` bir JPEG'de kontak tablosu (her hücreye zaman damgası ve ms/kare basılır), `--stills`, `--clip=a:b` (MJPEG → ffmpeg borusu), `--frames=a:b --workers=4` (her işçi sıradaki eksik kare indeksini çeker, `.tmp` yazıp `rename` eder; 1000 bayttan küçük dosyalar bozuk sayılıp yeniden üretilir → sürdürülebilir), `--encode` (libx264, `-preset slow -crf 17`, AAC 192k, faststart). Chrome bayrakları: `--ignore-gpu-blocklist --use-angle=d3d11 --enable-gpu-rasterization --disable-renderer-backgrounding --disable-background-timer-throttling`. `gpuInfo()` ile gerçek GPU'nun kullanıldığı doğrulanır.

### Sayılar

1920×1080, 24 fps, 156,6 s; BPM 88; BOIL 12/s; çekim uzunluğu 1,4–4 s; dans çekimlerinde ana karakter kare yüksekliğinin ~%40'ı; kare bütçesi ≤ 2,5 s, asla 4 s üstü; "yüzlerce şekil iyi, binlercesi değil"; karakter kontur kalınlığı 0,8–1,6; boyut kılavuzu u ≈ 6–10 (minik), 16–22 (normal), 30–60 (yakın plan).

### Kalite kapıları

Otomatik test yok; kapı "sheet'i Read aracıyla aç ve bak"tır. Kontrol listesi: her çekimin ilk ve son karesi + birkaç ara kare; darbe çevresinde 0,1 s adımlarla hareket okunuyor mu; bölüme giriş-çıkış geçişleri; karaoke bandı altında önemli bir şey var mı. Render günlüğü ms/kare basar (performans kapısı).

### Bize aktarılacak

`chapter/shot(t, lt, dur)` sözleşmesi, `pulse/kf/easing` seti, mood-take mekaniği, paralel sürdürülebilir kare üretimi ve `renderSheet` doğrudan bizim `renderAt(t)` modeline uyar. Karaoke bandı bizim Whisper kelime zamanlı altyazımızla aynı ilkedir (kelime kelime açılan boyama).

---

## 2. javascript-animation-skills (iart.ai; sıfır varlıklı Canvas 2D filmler + sentez müzik)

### Dosya haritası

| Dosya | Görev |
|---|---|
| `skills/javascript-animation/SKILL.md` | Akış: brief → look/sound brief → vuruş ızgarası ve storyboard **veri olarak** → starter'dan inşa → öz denetim → render → teslim |
| `references/storyboard.md` | Tempo seçimi, bölüm şekilleri, tür başına çekim süresi tablosu, blocking ("tek dünya, çok kamera"), süreklilik kuralları, `EVENTS` |
| `references/techniques.md` | 7 çizim tekniği (mürekkep, resimli kitap, riso spot renk, tek çizgi gravür, kelime dolgusu, keçeli kalem, sinematik düz + blueprint), derinlik hilesi, Canvas tuzakları |
| `references/qc.md` | Öz denetim listesi (kareler, şekiller, storyboard uyumu, sahneleme, yönetmen geçişi, hareket, olgular) |
| `references/character.md`, `forms.md` | Karakter sayfası, çapa noktaları; tür yapıları (hikâye, açıklayıcı, ambient, döngü, etkileşimli) |
| `templates/starter.html` | Çizim kütüphanesi + `withCamera` + `claim/placeFree` + storyboard verisi + `draw(frame)` |
| `scripts/render.mjs` | Playwright: MP4 / stills / kontak tablosu; `CUES` sidecar; `SCORE` çevrimdışı WAV + mux |
| `scripts/asset-audit.mjs` | Statik regex taraması + canlı ağ isteği kaydı → sıfır varlık kanıtı |
| `scripts/layout-check.mjs` | `window.LAYOUT` kutularını 0,1 s adımla okur, metin çakışmalarını zamanlarıyla listeler |
| `skills/soundtrack/SKILL.md` | İki şablon (groove, score), müziğin resmi izleme kuralları, startle ölçümleri |
| `soundtrack/scripts/sync-check.mjs` | MP4'ten kesme/olay tespiti + ses onset tespiti → OFF-BEAT / STARTLE |
| `soundtrack/templates/groove.js`, `score.js` | Web Audio enstrüman kitleri, harmoni tabloları, ~24 SFX, tempo haritası |

### Mekanizmalar

1. **Sözleşme: `draw(frame)` saf, `FRAMES`, `FPS`, `?render`.** Önizleme döngüsü yalnızca `?render` yokken çalışır. Rastgelelik `rng(seed)` (mulberry32) ve `hash2(a, b)`; `vnoise` değer gürültüsü.

2. **Boil: her 4 karede bir.** "Her kare değişen titreme gürültü gibi okunur; ~7,5 değişim/s el çizimi gibi okunur."
```js
BOIL = LOOK.boil ? Math.floor(frame / LOOK.boil) : 0;   // boil 4 = wobble redrawn ~7.5x/sec
```

3. **Mürekkep çizgisi: iki geçiş, iki frekanslı gürültü.**
```js
function jit(x, y, seed, amp) {
  const s = seed * 13.37;
  return [
    x + (vnoise(x * .012 + s, y * .012) - .5) * 2 * amp + (vnoise(x * .09 + s, y * .09 + 7) - .5) * amp * .6,
    y + (vnoise(x * .012, y * .012 + s + 50) - .5) * 2 * amp + (vnoise(x * .09 + 3, y * .09 + s) - .5) * amp * .6,
  ];
}
function ink(pts, o = {}) {
  const { w = 4, col = INK, closed = false, amp = 2, seed = 0, passes = 2, alpha = 1 } = o;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    ctx.globalAlpha = alpha * (p ? .45 : 1);
    ctx.lineWidth = w * (p ? .55 : 1);
    tracePath(J(pts, seed + p * .41, amp * (p ? 1.4 : 1)), closed);
    ctx.stroke();
  }
  ctx.restore();
}
```
`tracePath` noktaları quadratic ile orta noktalardan geçirerek yumuşatır; `resample(step 9–12 px)` uzun kenarları jitter alabilsin diye böler. `hatch` gap 11, alfa 0,35; `withShadow` aynı şekli 9 px ofsetle yarı saydam mürekkeple önce çizer.

4. **Resimli kitap şekli (`shape`).** Dolgu → alt-sağa koyu kenar (tint 0,8 ile doldur, şekli %7/%9 yukarı-sola kaydırıp yeniden doldur) → 10 açık fırça darbesi (alfa 0,1–0,2, kalınlık 6–16) → kontur dolgunun koyu tonu (`tint(col, .6)`), asla siyah. `blush()` radyal gradyan (gradyanı dönüşümden **sonra** kur; aksi hâlde kayar).

5. **Tek dünya, çok kamera + yerleşim kaydı.**
```js
function withCamera(cam, fn) {  // cam = { cx, cy, k }
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cam.k, cam.k); ctx.translate(-cam.cx, -cam.cy);
  const px = PX; PX = 1 / cam.k; fn(); PX = px; ctx.restore();
}
function claim(id, kind, x, y, w, h) {  // kind: 'text' | 'keep'; box in the current transform
  const m = ctx.getTransform(), P = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
    .map(([a, c]) => [m.a * a + m.c * c + m.e, m.b * a + m.d * c + m.f]);
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  LAYOUT.push({ id, kind, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
}
function placeFree(w, h, candidates) {  // first candidate box [x, y] that overlaps nothing claimed so far
  const free = ([x, y]) => LAYOUT.every(o => x + w <= o.x || o.x + o.w <= x || y + h <= o.y || o.y + o.h <= y);
  return candidates.find(free) || candidates[0];
}
```
`PX` kamera altında çizgi kalınlığını ekranda sabit tutar. Her `draw` başında `LAYOUT = []`, sonunda `window.LAYOUT = LAYOUT`.

6. **Storyboard veri olarak.** `BPM`, `b(n) = n·BEAT`, `SECTIONS = [[fromBar, toBar, layers]]`, `SHOTS = [{from, to, cam: t => ({cx, cy, k})}]`, blocking sabitleri, `EVENTS = [[saniye, 'sfx']]`, `CUES = SHOTS.slice(1).map(s => s.from)`. Sahne, kamera ve müzik aynı veriyi okur; "resim ve ses yapısal olarak hizalı". Tür başına tempo: 60–80 (ninni/ambient), 85–105 (açıklayıcı), 110–140 (komedi). Çekim süresi tablosu: komedi 1–3 s (30 s'de 12–20 çekim), hikâye 2–5 s, açıklayıcı 3–6 s (çekim başına bir fikir), ambient 5–10 s.

7. **Render: kontak tablosu kesmelerden kaçar.**
```js
const near = t => (info.CUES || []).find(c => Math.abs(t - c) < .35);
for (let t = every / 2; t * info.FPS < info.FRAMES; t += every) {
  const c = near(t);
  frames.push(Math.min(info.FRAMES - 1, Math.round((c !== undefined ? c + .45 : t) * info.FPS)));
}
```
Zaman damgası tarayıcıda basılır (ffmpeg `drawtext` çoğu derlemede yok), tablo `ffmpeg -vf scale=360:-2,tile=CxR` ile. MP4: MJPEG q 0,93 borusu → libx264 crf 18 yuv420p faststart; tek sayı tuval boyutu reddedilir.

8. **Çevrimdışı müzik.** `window.SCORE(ac)` bir `OfflineAudioContext(2, 48000·saniye, 48000)` içinde çalıştırılır, tepe 0,89'a normalize edilip 16 bit WAV yazılır, sessiz MP4'e AAC 192k olarak muxlanır. Önizlemede aynı fonksiyon tıklamayla canlı `AudioContext`'e verilir.

9. **Groove şablonu.** Bar başına katman listesi; kit (`electro/acoustic/keys/percussion`) aynı rolleri farklı seslerle; harmoni tabloları MIDI akor dizileri (`bright` I-IV-V-I, `wistful` vi-IV-I-V, `dreamy` lydian maj7, `tense` harmonik minör, `folk`, `blues`); tohumlu reverb IR'ı (1,6 s, (1−i/n)³ zarf) her render'da aynı; kompresör −12 dB / 3:1; wet 0,22. **Öğrenilmiş kural:** yeni davul katmanı ilk barda yarı şiddette girer (`kv = .5`), çünkü kick+bas birlikte girince +11 dB (startle), kademeli girince +3,5 dB ölçülmüş. SFX tablosu (`click, clack, whooshIn/Out, boing, clank, ding, pop, tick, thud, creak, blip, zip, flag, alarm, step, notify, drip…`) `EVENTS`'ten çağrılır; bilinmeyen ad hata fırlatır.

10. **Score şablonu: tempo haritası.** Her sahne (CUES arası) tam sayıda bar alır (`bars = round((b−a)/bar)`, bar ≈ 2,67 s ≈ 90 bpm), böylece her kesme bir downbeat'e düşer. Akor dizisi sahne sonunda dominant (G) ile biter, kesme tonikte (C) gelir: "kesmeyi ses şiddetiyle değil armoniyle işaretle". Kesme downbeat'inde ekstra vurgu yok (bas 0,10 yerine 0,14 değil), açılış barı yalnızca arkasından bar geliyorsa seyrek, chime 20 ms atakla (asla ürkütmez), son 4 s çözüm akoru.

11. **Sync-check ölçümleri.** Video: 64×64 gri kareler; `detail` (komşu piksel farkı) yerel minimumu + boş kare eşiğinin %12'si → kesme; tek karelik hareket sıçraması (ortalama ×8) → sert kesme. Ses: 12 kHz mono, 10 ms RMS zarfı, flux > yerel ortalamanın 3 katı ve > 0,002 → onset; 120 ms kümeleme; "güçlü" = ±1 s komşular içinde 30. yüzdelik üstü. Her olay için en yakın güçlü onset ofseti ve 0,3 s sonrasının önceki 1 s'ye (ya da son 4 s'nin tipik seviyesine) göre dB sıçraması. **Eşikler:** ±100 ms (≈3 kare) OFF-BEAT; > +6 dB STARTLE; sessizliğe kesme (−10 dB düşüş) geçer; ilk 1 s ve son 0,6 s atlanır.

### Kalite kapıları (otomatik)

`asset-audit` (regex: `<img>`, `<script src>`, `data:` URI, `url()`, `@font-face`, `fetch`, `new Image`, dosya uzantısı, 400+ karakter base64; artı Playwright ile sayfa dışı her ağ isteği) → exit 1; `layout-check` (metin×metin herhangi bir çakışma, metin×keep kısmi çakışma; metin bir keep'in içindeyse serbest; ≥ 4 px) → zaman aralıklarıyla listeler; `sync-check` → OFF-BEAT/STARTLE. Sonra iki göz geçişi: storyboard uyumu (her çekimin aksiyon vuruşundan still) ve yönetmen geçişi (2 fps kontak tablosu: tempo, çerçeve çeşitliliği, ölü kare, her aksiyonun sesi).

### Bize aktarılacak

`claim/placeFree/layout-check` altyazı-kilit noktası çakışmaları için doğrudan; `SCORE → OfflineAudioContext → WAV → mux` bizim `prepareSound/soundChunk`'ın basit hâli; `sync-check` bizim anlatım+SFX karışımına uygulanabilir (CUES = sahne değişimleri); groove/score enstrüman kitleri Türkçe belgesel altı müzik için tohum; kontak tablosunun kesmelerden kaçması.

---

## 3. opus-js-animations (klsoen; yönetmen akışı + saflık testi + kare-kesin export)

### Dosya haritası

| Dosya | Görev |
|---|---|
| `SKILL.md` | Beş konuşma (brief → ses kaynağı ✋ → ses raporu → yön soruları ✋ → treatment ✋), sonra inşa/inceleme/render/teslim |
| `references/directing.md` | Soru bankası, ses raporu şablonu, treatment şablonu (tablo), referans klibi ölçme komutları |
| `references/production.md` | Uzun filmler için çok ajanlı hat: bible, kitler, cold open kanıtı, sahne yönetmenleri, ses ekibi, render çiftliği, süreklilik |
| `references/design.md` | Kamera dili, figürler, ekran metni ölçüleri, gerçek revizyonlardan dersler |
| `references/styles.md` | Stil menüsü; §2 kesme kâğıt stop-motion (iki saat: poz 12/15 fps, kamera her kare), deterministik fizik replay |
| `references/delivery.md` | Yeniden kodlamaya dayanıklı teslim: gren yok, 30 fps, BT.709, `--ss 2` ölçümleri |
| `references/audio.md`, `pitfalls.md`, `shaders.md`, `threejs.md`, `tiles-and-flocks.md`, `painting.md` | Ses hattı, tuzak tablosu, gökyüzü/uzay shader tarifleri, three.js entegrasyonu |
| `assets/film-template.html` | `window.__film` sözleşmesi, `supersample()`, `keyed/env/rng`, dengeli metin sarma, `drawRise`, vinyet+gren, oynatıcı |
| `scripts/lib.mjs` | npm'siz CDP sürücüsü (Node 22 fetch+WebSocket); `?capture=1`; `ready` için yoklama |
| `scripts/verify.mjs` | `seek(t)` saflık testi (hash × 3) |
| `scripts/stills.mjs` | Stills, kontak tablosu, kare kare şerit, 1:1 kırpma |
| `scripts/render.mjs` | Paralel işçiler → segmentler → concat → mux; PNG kayıpsız; BT.709 TV aralığı; `--ss 2` Lanczos |
| `scripts/page_audio.mjs` | `__film.wav()` → WAV + LUFS/true peak okuması |
| `scripts/align_audio.py`, `analyze_audio.py` | Whisper kelime zamanları (nefes noktalarına göre parçalı), spektrogram raporu |

### Mekanizmalar

1. **Sözleşme.** `window.__film = { duration, ready, seek(t), shots, marks }`; `seek(t)` t'de tam kareyi çizer ve t'de saf. URL: `?t=12.5` dondur, `?capture=1` oynatıcı yok, `?ss=2` süper örnekleme. `ready` yalnızca fontlar yüklendikten sonra `true` olur.

2. **Saflık testi (`verify.mjs`).** Aynı t iki kez, sonra `(t + duration/2) % duration`'a "gezin", sonra t'ye soğuk sıçra; üç PNG hash'i eşit olmalı. Sayfa hataları da başarısızlık sayılır.
```js
const hash = async t => {
  const px = await film.ev(`(() => { __film.seek(${t}); const c = document.getElementById('c') || document.querySelector('canvas');
    return c.toDataURL('image/png'); })()`);
  return createHash('sha1').update(px).digest('hex').slice(0, 12);
};
const a = await hash(t), b = await hash(t);
await hash((t + duration / 2) % duration);        // wander off
const c = await hash(t);                           // cold jump back
```
Üçüncü hash'in farklı çıkması "draw simülasyon durumuna yazdı" demektir (pitfalls tablosu).

3. **Anahtar kare ve zarf yardımcıları.**
```js
const env = (t, a, b, c, d) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));
function keyed(t, keys, log = false) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i], k = easeIO((t - t0) / (t1 - t0));
    return log ? v0 * Math.pow(v1 / v0, k) : lerp(v0, v1, k);
  }
  return keys[keys.length - 1][1];
}
```
`log = true` zoom için (çarpımsal; hız ölçekler arasında sabit hissedilir). `design.md`: çok anahtarlı zaman atlamalarında Fritsch–Carlson monoton kübik spline; 3B kamerada "yaw/pitch değil, neyin nerede olacağını anahtarla" (`aim()` çözümü).

4. **Süper örnekleme sarmalayıcısı.** `supersample(ctx, SS)` `setTransform/resetTransform`'u k ile çarpar, `shadowBlur/Offset` ve `filter` içindeki px değerlerini k ile ölçekler; her bake (metin, sprite) SS× çözünürlükte üretilip **film pikseli boyutuyla** çizilir (`drawImage(c, x, y, w, h)`). Ölçüm: 20 s reel açılışında PSNR 39,1 → 45,0 dB (SSIM .985 → .996); Instagram simülasyonu sonrası 32,7 → 33,5 dB; maliyet ~2× (Canvas), 4×'e kadar (shader).

5. **Metin: dengeli sarma + yükselerek netleşme.** `balanced()` aynı satır sayısını koruyan en dar genişliği ikili aramayla bulur (14 iterasyon). Metin fontlar yüklendikten sonra bir kez offscreen tuvale bake edilir (gölge 14 px). `drawRise`: alfa × prog, `blur (1−prog)·7 px`, 16 px yükselme, ~1 s. Ölçüler (1080 genişlik): gövde ~44 px Medium, display 64–80 px, satır ≤ 800 px; 1920'de gövde ~42 px, display 66–72 px, satır ≤ 1300 px. Yoğun çizgi dokusu (yağmur, yıldız izi) üstünde metin için arkada yumuşak koyu havuz.

6. **Grade: vinyet + kare-kilitli gren + fade.** Vinyet radyal 0,35·min → 0,75·max, 0,4 siyah. Gren 3 adet 256² desen, alfa 9/255, `f = round(t·30)`, ofset `(f·97 % 256, f·57 % 256)`, desen `f % 3` → aynı t her zaman aynı gren. Fade: ilk 0,6 s giriş, son 0,8 s çıkış. Teslim için `FILM_GRAIN = 'none'`.

7. **Render: kare-kesin, paralel, BT.709.** Her işçi kendi Chrome'unu açar, kare aralığını PNG olarak ffmpeg'e borular; segmentler `concat -safe 0` ile birleşir; ses `-shortest` ile muxlanır. Filtre: `scale=out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=…` ve `-color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709`; `--ss 2`'de önce `scale=W:H:flags=lanczos+accurate_rnd,format=rgb48le`. CRF 16 preset slow profile high. Yükleme kopyası: `-crf 17 -maxrate 20M -bufsize 40M -g 60`. Ölçüm: animasyonlu gren 116 Mb/s, statik 51, yok 31; yeniden kodlama sonrası SSIM .94 (grensiz) vs .85 (grenli). "Asla ekran kaydı."

8. **Kontak tabloları ve şeritler.** `--every 2 --sheet` tüm film; `--range 6.6:7.2:0.0333 --sheet` bir geçişte kare kare (flash kare avı); `--times 12 --crop x,y,w,h` 1:1 detay (yüzler, el-nesne teması). "Her sheet'i oku; sheet tempoyu yargılayamaz, render'ı da izle."

9. **Ses hizası (`align_audio.py`).** 0,1 s pencerelerde dBFS; −30 dBFS altı diziler nefes noktası; ≥ 3 s aralıklı nefeslerden kesip her parçayı Whisper `word_timestamps=True` ile ayrı transkribe eder ("uzun tek geçiş kayar ve tekrarlı cümleleri birleştirir"). Kelimeler sınır bulmak içindir; ekrana kanonik metin yazılır.

10. **Deterministik fizik replay (styles §2.6).** Her çekim tohumlu durumdan başlar, sabit 60 Hz ile istenen kareye kadar adımlar, 1–2 s pre-roll, `draw` anlık görüntü okur ve durum yazmaz; uzun çekimlerde saniyede bir checkpoint. Stop-motion saati: 30 fps çıkışta poz `floor(t·15)/15`, kamera her kare eased; boil poz başına ±1 px / ±0,003 rad; pozlama titremesi ±%2,5.

11. **Üretim hattı (production.md).** `BIBLE.md` (logline, karakterler, dünya, senaryo + hedef süreler, sahne tablosu, stil kuralları, teknik sözleşme) → kitler paralel (karakter rig, dünya, prop; her biri test sayfası + kontak tablosu + `API.md`) → **cold open'ı son kaliteye kadar kanıtla** (kodlanmış MP4'ten kare decode et) → sahne yönetmenleri paralel (bible + KITS.md + süreklilik sayfası + ölçülmüş diyalog süreleri) → ses ekibi (diyalog ölçümü, besteci, ses tasarımcısı `{t, type, x}` olay listesinden) → render çiftliği (7.200 kare, 27–97 ms/kare, 10 işçi, ~3,5 dk) → 2 s'de bir sheet + her sahne sınırında 1/30 s şerit → süreklilik düzeltmeleri **paylaşılan modüllerle** (aynı nesne iki sahnede "tarif edilerek" değil, tek `drawX()` ile). Mix: −16 LUFS, TP ≤ −1 dBTP; müzik konuşma altında ~10 dB (−18 fazla sessiz).

### Kalite kapıları

`verify.mjs` (saflık, exit 1), `render.mjs` sonrası `ffprobe -count_packets` (kare sayısı = süre × fps, ses akışı var mı), `page_audio.mjs` LUFS/TP okuması (> −1 dBTP "hot" uyarısı), kontak tablo + şerit + kırpma incelemesi; pitfalls tablosu (font yüklenmeden çizim, `pow` NaN karesi bloom ile siyaha çevirir, `Page.navigate` yüklenmeden dönüyor → `ready` yokla, concat göreli yol, vb.).

### Bize aktarılacak

`verify.mjs` mantığı (aynı t üç hash) `tools/render-video.mjs`'e 20 satırla eklenebilir; BT.709 etiketleme ve PNG borusu; treatment tablosu bizim `prompts/new-animation.md` treatment aşamasına birebir şablon; `align_audio.py`'nin nefes-parçalı Whisper yaklaşımı bizim `voice.mjs --words-only` için doğruluk artırıcı; delivery ölçümleri (gren yok, 30 fps, bold 44 px) YouTube için de geçerli.

---

## 4. threejs-conference (Threejs-Punk; WebGPU + TSL sinematik sokak)

### Dosya haritası

| Dosya | Görev |
|---|---|
| `AGENTS.md` | Ajan brifingi: okuma sırası, sert kısıtlar tablosu, dosya yönlendirme tablosu, 4 tarif, doğrulama listesi, "yapma" listesi. "README ile kod çelişirse kod kazanır." |
| `README.md` §Source map | Efekt → dosya → giriş fonksiyonu tablosu |
| `STRIP.md` | Sahneyi 11 adımda soyma sırası; her özellik `null` döner, döngü ve post opsiyonel zincirle çalışır |
| `docs/techniques/*.md` | Çarpışmalı yağmur, ıslak zemin, araba yüzey damlaları derin dalışlar |
| `src/post/postprocessing.js` | `RenderPipeline`: AO ön geçiş (MRT normal), sahne MRT (output + emissive), GTAO, bloom, lensflare, DOF, look, SMAA, gren |
| `src/post/look/cyberpunkLook.js` | Grade uniform'ları ve 6 preset (sis, tint/offset, yeşil bastırma, doygunluk, kontrast, kromatik sapma, vinyet, gren) |
| `src/tsl/edgeChromaticAberration.js`, `boxBlur.js`, `rainGlass.js`, `rainRipples.js`, `surfaceRain.js` | Yeniden kullanılır TSL düğümleri |
| `src/world/weather/createCollisionHeight.js`, `createCollisionRain.js`, `collisionHideObjects.js` | Yükseklik RT + compute yağmur + gizleme listesi |
| `src/runtime/createRenderLoop.js`, `createCameraDirector.js`, `warmup.js` | Kare sırası, kamera modları, shader ısıtma |
| `src/platform/performanceProfile.js`, `adaptiveDpr.js` | Bütçeler; cihaz varsayılanları |
| `.cursor/rules/*.mdc` | "Önce AGENTS.md oku" kuralı; TSL/WebGPU sözleşmeleri |

### Mekanizmalar

1. **Post zinciri (sıra).** `aoPrePass` (kamera kopyası, yağmur ve duman katmanları kapalı, MRT `packNormalToRGB(normalView)`, UnsignedByte) → `scenePass` MRT `{ output, emissive: vec4(emissive, output.a) }` → `ao(depth, normal, cam)` GTAO → `bloom(scenePassEmissive, 2.5, 0.45)` (**bloom girdisi emissive tamponu**, beauty değil) → `lensflare(bloomPass, {threshold .09, ghostSpacing .27, ghostAttenuation 50})` → `gaussianBlur(flare, 4, 4)` → `beauty = color × AO` (+ ayrı yağmur geçişi varsa `rgb·a` eklenir) → DOF: `boxBlurSeparable(beauty, {size 3, separation 2})` ve `blurFactor = smoothstep(36, 75, |viewZ − focusZ|)` ile `mix` → `look.buildComposite(beauty, {bloomContribution})` → `smaa` → `film(grain)`.
```js
const bloomPass = bloom(scenePassEmissive, 2.5, 0.45);
bloomPass.setResolutionScale(performanceProfile.bloomResolutionScale);   // 0.5
const blurFactor = smoothstep(minDistance, maxDistance, scenePassViewZ.sub(focusPointView.z).abs());
beauty = mix(beauty, boxBlurSeparable(beauty, { size: blurSize, separation: blurSpread, premultipliedAlpha: true }), blurFactor);
const preAA = look.buildComposite(beauty, { bloomContribution });
steadyOutputWithSmaa = look.applyFilmGrain(smaa(preAA));
```

2. **Look kompoziti (grade sırası).** Sis: `distanceFog = smoothstep(near, far, viewDistance)`, `skyFog = smoothstep(.68, 1, linearDepth)` (arka plan viewZ güvenilmez), `fogBlend = max(...)·enabled`; bloom katkısı `1 − fogBlend·0.75` ile bastırılır (uzaktaki neon sisin içinde parlamaz). Sonra `tinted = rgb·gradeTint + gradeOffset` → `suppressGreen` (G'yi luma'ya karıştır) → `saturation` → `applyContrast` (luma'ya göre mix) → `gradeMix` ile ham renkle karıştır → kenar kromatik sapması → vinyet `1 − smoothstep(smoothness, 1, len(uv−.5)·1.6)·intensity`.
```js
const fogBlend = max(distanceFog, skyFog).mul(uniforms.fogEnabled);
let hazed = vec4(mix(beauty.rgb, uniforms.fogColor, fogBlend.mul(uniforms.fogAmount)), beauty.a);
if (bloomContribution) hazed = hazed.add(bloomContribution.mul(float(1).sub(fogBlend.mul(uniforms.fogBloomSuppress))));
const tinted = hazed.rgb.mul(uniforms.gradeTint).add(uniforms.gradeOffset);
let gradedRgb = suppressGreen(tinted, uniforms.greenSuppress);
gradedRgb = saturation(gradedRgb, uniforms.saturation);
gradedRgb = applyContrast(gradedRgb, uniforms.contrast);
const graded = vec4(mix(hazed.rgb, gradedRgb, uniforms.gradeMix), hazed.a);
```

3. **Kenar kromatik sapması.** `edgeMask = 1 − 1/(1 + (d·falloff)²)`; R ofseti `offset·(1 + s·0,015)`, B `offset·(1 − s·0,015)`, G sabit; ±0,004 dither eklenir (banding). Merkez temiz, yalnızca kenarlar.

4. **Preset tablosu** (`neonNoir` varsayılan): bloom strength 0,85 + geniş 2,2·0,35, radius max(0,55, 0,85·0,55); lensflare 0,35 / eşik 0,9; sis renk sRGB (0,34, 0,37, 0,47), near 0 far 50, amount 0,8, enabled 0,35; tint (1,02, 0,90, 1,06), offset (0,004, −0,006, 0,008); doygunluk 1,06; kontrast 1,1; yeşil bastırma 0,72; gradeMix 0,7; kromatik 0,8 / falloff 3,5; vinyet 0,8 / 0,64; gren 0,12. `silentHill`: doygunluk 0,42, kontrast 1,91, sis near −20 far 30 amount 1, gren 0,48. `sinCity`: doygunluk 0, kontrast 2, sis mor. Preset = tek nesne; her look bir veri satırıdır.

5. **Performans profili (bütçeler).** `maxPixelRatio 1.5`, bloom yarı çözünürlük, DOF varsayılan **kapalı** (Safari'de her zaman), lensflare yarı çözünürlük blur 4, GTAO yarı çözünürlük 6 örnek radius 0,4 scale 1,7 (TRAA yok → SMAA, zamansal filtre kapalı), zemin yansıması yarı çözünürlük + 1 kare atlama, yağmur 5.000 parçacık / 512² yükseklik RT / 1 kare atlama, duman 50 + 40. Mobil: lensflare, billboard, AO kapalı; Apple: DPR 1,25, adaptif DPR kapalı. Kural: "yeni pahalı iş yarı çözünürlük, kare atlama ya da mesafe solması ile gelir."

6. **GPU yağmur (compute + yükseklik dokusu).** Ortografik tepe kamera dünya `positionWorld`'ü half-float, nearest, mipmapsız 512² RT'ye yazar (yağmur/gökyüzü/duman/uçak gizlenir). Compute: `position += velocity`; XZ kamera merkezli 100×100 hacimde `fract` ile sarılır; `floorY = texture(height, uv).y`; `y < floor + 0,05` ise `hash(instanceIndex + time·1000)` ile yeniden doğar (y 20–35, hız −fallSpeed ± varyans). Çizim tek instanced billboard. Sıçramalar ayrı buffer'da, döngü indeksi değişince yeniden yerleşir. "Damla başına CPU raycast yapma."
```js
If(position.y.lessThan(floorPosition), () => {
  const seed = float(instanceIndex).add(time.mul(1000));
  position.y = hash(seed.add(77.7)).mul(15).add(20);
  position.x = hash(seed.add(11.1)).mul(uRainAreaWidth).sub(uRainHalfW).add(centerPos.x);
  position.z = hash(seed.add(44.4)).mul(uRainAreaHeight).sub(uRainHalfH).add(centerPos.z);
  velocity.y = hash(seed.add(99.9)).mul(uFallSpeedVariance).sub(uFallSpeedVariance.mul(0.5)).sub(uFallSpeed);
});
```

7. **Kare sırası (`createRenderLoop`).** cameraDirector → yükseklik RT (gizleme listesiyle) → yağmur compute → uçaklar → gökyüzü → zemin (ripple miktarı yağmura bağlı) → billboard → araba yüzey yağmuru (yakınlık) → zemin yansıması (frame-skip'e göre) → `pipeline.syncCameras` → DOF odak noktası → `post.render()` → fps örnekle.

8. **Ajan yapısı.** Fabrika fonksiyonları düz nesne döner (`world`, `pipeline`, `cameraDirector`, `renderLoop`); opsiyonel özellik `null` döner ve çağıranlar `?.` kullanır. Yeni post efekti tarifi: `src/tsl/`'e düğüm → `buildBeautyInput / look.buildComposite / rebuildSteadyOutput` içinde bağla → `performanceProfile` bayrağı ekle, pahalıysa varsayılan kapalı/yarı çözünürlük.

### Kalite kapıları

Otomatik test yok. `AGENTS.md` doğrulama listesi: build geçer; WebGPU bağlamı; yağmur çatıdan geçmiyor; yükseklik haritasında yağmur/gökyüzü yok; mobil profilde ölçek düğmesiz tam çözünürlük geçiş yok. `window.__app.perf` ile bayrakları canlı A/B.

### Bize aktarılacak

Bloom'u emissive MRT'den besleme (Babylon'da emissive'i ayrı RT'ye yazıp `BloomEffect`'e vermek, ya da Three'de aynı TSL kalıbı); look preset'i tek veri nesnesi; sis içinde bloom bastırma; kenar kromatik sapması; `performanceProfile` sözleşmesi (headless render'da DPR ve yarı çözünürlük kararları); AGENTS.md şablonu (okuma sırası, dosya yönlendirme, sert kısıtlar, "kod kazanır").

---

## 5. cinematic-3d-website (gkren22; scroll ile sürülen sinematik 3B site — yalnızca belge)

### Dosya haritası

`SKILL.md` (9 adımlı inşa sırası, kalite çıtası, içerik yönü, IP kuralı) + `references/architecture.md` (renderer, worker/offscreen, sahne yöneticisi, kalite katmanları, DPR), `scroll-choreography.md` (Lenis + Theatre.js/GSAP, scrub, hız etkisi), `gpu-particles.md` (TSL compute, yüzey örnekleme, morph), `postprocessing-look.md` (bloom, godrays, grade, gren, tone map, fluid izi), `assets-pipeline.md`, `sound-design.md` (Howler katmanları), `ui-layer.md`. Çalışır kod yok; parçalar belge içinde.

### Mekanizmalar

1. **9 adımlı inşa sırası (dikey dilim).** 1 kabuk + döngü + scroll (kanıt: 4 bölümde scroll ile hareket eden küp) → 2 bölüm-sahne sistemi (kanıt: bölüm başına arka plan/kamera değişimi) → 3 koreografi (Theatre sheet, JSON export, scrub) → 4 hero: GPU parçacık → 5 ortam + varlıklar → 6 look (post) → 7 ses → 8 UI + loader → 9 performans. "Herhangi bir parçayı cilalamadan önce tüm hattın çirkin sürümü çalışsın."

2. **Post sırası ve sayılar.** `sahne → bloom → godrays → grade (overlay/vinyet) → gren → tonemap/çıkış`. Bloom eşik 0,85–1,0 ("tüm kare parlıyorsa amatör işareti #1"), güç 0,8–1,8 bölüm başına anahtarlı, yarı çözünürlük; malzemeler "HDR" yazılır: parlayacaklar emissive 2–8, diğerleri < 1. Godray: yarı çözünürlük okluzyon tamponu + 48–64 tap radyal blur, `decay 0.96`; ucuz seçenek 3–6 sahte hacimsel düzlem. Grade: bölüm başına `overlayColor/opacity` uniform'ları `lerp 0.05` ile; vinyet 0,3–0,5 her zaman açık. Gren: animasyonlu `hash(uv·res + t·60)`, genlik 0,04–0,08 (düşük katmanda statik). ACES exposure ~1; arka plan `#050a14` (siyah değil).
```js
const applyGrade = (c) => {
  c = mix(c, c.mul(vec4(uOverlayColor, 1)), uOverlayOpacity);
  const d = screenUV.sub(0.5).length();
  return c.mul(float(1).sub(d.mul(d).mul(uVignette.mul(2.2))));  // soft corner falloff
};
```

3. **Curl-noise compute parçacıklar.** Storage buffer'lar: position, velocity, targetA/B, seed. Hedefler `MeshSurfaceSampler` ile bir mesh yüzeyinden örneklenir (figür/logo). Her kare: yay `toTarget·attraction·dt`, `curlNoise(pos·0.8 + t·0.1)·turbulence·dt`, kaldırma `(0, 0.02, 0)·dt`, sürtünme `×0.96`. Dilbilgisi: boş bulut attraction 0–0,2 + yüksek türbülans; "yoğunlaşma" attraction 2–4'e ~1 s'de; dağılma attraction 0 + merkezden bir karelik itki. Çizim: additive, `depthWrite false`, yumuşak disk `(1 − |uv−.5|·2)²`, parlaklık bloom eşiğinin üstünde; sıralama gerekmez.
```js
const target = mix(tA, tB, uMorph);
vel.addAssign(target.sub(pos).mul(uAttraction).mul(uDelta));            // spring
vel.addAssign(curlNoise(pos.mul(0.8).add(time.mul(0.1))).mul(uTurbulence).mul(uDelta));
vel.addAssign(vec3(0, 0.02, 0).mul(uDelta));                              // buoyancy
vel.mulAssign(float(0.96));                                               // drag
pos.addAssign(vel);
```
Katmanlar: high 100–200k, med 40–80k (curl her iki karede bir), low 10–30k (curl yerine 2 sinüs oktavı).

4. **Kamera koreografisi.** Scroll = zaman çizelgesinde bir scrub kafası; Lenis lerp 0,08–0,12, üstüne 3B dünya için ikinci yumuşatma 0,08; `sheet.sequence.position = smoothed·DURATION`, asla `play()`. Hız etkisi: roll ≤ 3°, fov +4, türbülans ×(1 + |v|·2), lerp 0,15. Kurallar: ana çizelgede easing yok (scrub ease'dir); dolly > orbit > roll, orbit ≤ 45°/bölüm; bölüm N+1 son %10'da başlar (sert kesme hata gibi okunur); yolculuk boyunca bir sabit çapa; dev'de `?p=0.62` ile park et ve ekran görüntüsü al. Geçişler: pozlama 1 → 0,85 → 1 "nefes"; hızlı scroll'da DPR yarıya.

5. **Kalite katmanları.** `low {maxDPR 1.5, 20k, godrays off, grain static}`, `med {2, 60k, on, on}`, `high {2, 150k, on, on, shadowMap}`; 3 s boyunca fps < 45 ise katman düşür. Bütçe: ilk boyama ≤ 3–4 MB; ses etkileşimden sonra.

6. **Ses katmanları.** Ambient bed (20–30 s döngü, < 400 Hz), bölüm başına döngü (15–30 s), 4–8 olay one-shot (birkaç perde varyantı), 2–3 UI tik (< 60 ms), intro sting; hepsi aynı ton/tempo ailesinde; 800 ms crossfade.

### Kalite kapıları

"Ekran görüntüsü al/ölç, varsayma" listesi: 60 fps M-serisi DPR 2, ≥ 30 fps orta telefon; pop-in yok; scroll ağırlıklı; JS kapalı da metin var; ses jest olmadan çalmaz; reduced-motion; sekme dışında döngü durur. Debug paneliyle her bölümün son ayar ekran görüntüsü depoda "görsel spec" olarak tutulur.

### Bize aktarılacak

Post sırası ve eşikler, bölüm başına grade lerp (bizde sahne başına), curl-noise parçacık dilbilgisi (yoğunlaşma anı belgesel "vurgu" için), kamera kuralları (dolly > orbit, %10 örtüşme, sabit çapa), "görsel spec ekran görüntüsü" pratiği. Scroll/Lenis kısmı bizde `t`'dir.

---

## 6. claude-studio-toolkit (JonathanBeck1; slop listesi, tarifler, eleştirmen ajan)

### Dosya haritası

`skills/ether-threejs/SKILL.md` (kullanım sırası: önce slop listesi), `slop-checklist.md`, `performance.md`, `references.md` (ajans örnekleri), `techniques/` (7: curl-noise-particles, fresnel-iridescence, msdf-typography, persistent-canvas-routing, postprocessing-chain, raymarched-sdf-hero, scroll-camera-choreography), `shaders/` (`curl-noise.glsl`, `fresnel.glsl`, `color-grade.glsl` LUT, `dither.glsl` Bayer 8×8), `commands/threejs-audit.md`, `agents/premium-review.md`, `hooks/` (hatırlatıcılar), `evals/`. Not: tarifler `ether/postfx`, `ether/quality` gibi bir "engine"e atıf yapar; motor depoda yok, yalnızca "raw wiring" ekleri var.

### Mekanizmalar

1. **Slop reddetme listesi (biri işaretliyse yeniden yap).** Hero olarak varsayılan geometri (TorusKnot, Box, Sphere); uniform'suz `MeshStandard/Basic`; yalnız Ambient + Directional varsayılan renk; ürün görüntüleyici dışında `OrbitControls`; anlatısal işlevi olmayan parçacık alanı; post yok; 3B'nin tipografiyle ilgisiz durması; "herhangi bir sitede olabilir"; statik kamera; mobil fps ölçülmemiş. **Zorunlu liste:** en az bir özel shader; composer preset'lerinden biri; GSAP/Lenis ile koreografi; geometri el modeli/prosedürel/ithal; marka paleti bilinçli (bir baskın vurgu, bir karşı nokta); mobil ≥ 30 fps 2 yıllık iPhone; reduced-motion. **Reddedilen bahaneler:** "placeholder, sonra cilalarım", "bloom ekledim yeter" ("yalnız bloom AI-slop imzasıdır"), "kullanıcı geri bildirir" ("kullanıcı son kapıdır, tek kapı değil").

2. **Post zinciri preset'leri.** Tek şekil: `render → efektler → (ACES, hdr ise) → dither`. `hero`: bloom intensity **0,06**, threshold 0,65, smoothing 0,2, mipmapBlur, MEDIUM ("0,06 tavan, başlangıç değil; > 0,15'te tüm parlak alan halelenir"); `night`: 0,38 / 0,62 / 0,25, LARGE, `hdr` kabul eder; `light`: yalnız dither ("açık zeminde bloom zemini bloomlar"). Sıra kuralları: bloom grade'den önce (LUT önce çalışırsa midtone'lar eşiği geçer), grade kromatik sapmadan önce, dither **en son**. Kromatik ofset 0,0015 (> 0,003 "Instagram filtresi"). AA composer'ın `multisampling`'idir; context `antialias` composer varken ölüdür. Tone mapping composer içinde `hdr:true` ile gelir; `renderer.toneMapping` composer'a ulaşmaz.
```js
const composer = new EffectComposer(renderer, { multisampling: 4, frameBufferType: HalfFloatType });
composer.addPass(new RenderPass(scene, camera));
const bloom = new BloomEffect({ intensity: 0.06, luminanceThreshold: 0.65, luminanceSmoothing: 0.2, mipmapBlur: true, kernelSize: KernelSize.MEDIUM });
composer.addPass(new EffectPass(camera, bloom, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new DitherEffect()));
```
Dither: hash gren sRGB transfer üzerinden, her parlaklıkta bir çıkış adımı tepe-tepe (lineerde uygulanırsa karanlıkta birkaç adım olur). Bayer parçası:
```glsl
// Use: color.rgb += (dither8x8(gl_FragCoord.xy) - 0.5) / 64.0;
```

3. **Curl-noise tarifi.** CPU ≤ 5k, FBO ping-pong ≥ 5k; `uFieldScale 0.5 (0.1–2)`, `uSpeed 0.3`, alan evrimi `t·0.1`, `uMaxRadius 3` yeniden doğma, `gl_PointSize × pixelRatio`, `dt` 1/30'a kırp (aksi hâlde ışınlanma), `RGBA32F` render edilemeyebilir → HalfFloat, ilk konumları `DataTexture` ile tohumla (yoksa "çeşme"), render hedefini kaydet/geri yükle. **Uyarı:** "ambient parçacık alanı gerçek bir stüdyo sahibi tarafından 'seizure-y' diye reddedildi; yalnızca tanımlı bir öznenin etrafında vurgu olarak".

4. **Fresnel iridescence.** `fresnel = pow(1 − max(dot(N, V), 0), power)`, 3 duraklı palet; `uFresnelPower 2.5` (0,5–8; 5+ eloksal metal), `uBaseColor` siyaha yakın, `uIntensity > 1` yalnız HDR composer'da; açık geometri `DoubleSide` + `gl_FrontFacing` ile N çevir; DRACO normal düşürür → `computeVertexNormals`, split vertex → önce `mergeVertices`.

5. **MSDF tipografi (troika).** Canvas texture yakınlaşınca bulanır, `TextGeometry` "3B basılmış plastik" okunur; MSDF fragment'ta kenarı yeniden hesaplar. `sdfGlyphSize 64` gövde, hero'da 128 (256 gereksiz, 4× VRAM). `fontSize` kamera görünür yüksekliğine göre hesaplanır (50° fov, z=4 → 3,7 birim).

6. **Bütçeler.** FCP < 1,0 s (sınır 1,5), hero < 2 s, mobil 60 (sınır 30) fps, JS ≤ 200 KB gzip (three hariç), varlık ≤ 1 MB/sayfa, doku ≤ 512 KB KTX2, model ≤ 300 KB DRACO, draw call < 50, üçgen < 200k. DPR `min(dpr, dprCap)`; 1,5 LOW/MID, 2 HIGH. Gölge haritası sanat yönü değilse kapalı.

7. **`/threejs-audit` komutu.** "Önce skill'i çağır; hafızadan denetleme." 6 kategori (slop, bütçe, post, shader, marka-form, Lenis/GSAP), sabit çıktı biçimi: `Files reviewed / [CRITICAL] / [WARN] / [NOTE] / Skill recipes that would help`. Dosya değiştirmez.

8. **`premium-review` ajanı.** Varsayılan karar **NEEDS WORK**; statik denetim temiz ama render çıktısı etkileniyorsa **NEEDS VISUAL VERIFICATION** (salt okunur ajan görsel doğrulama yapamaz, kullanıcıya "şunu şu viewport'ta bak" der); READY nadir. Kapsam = dal farkı. "Passed satırı ne baktığını söyler; 'looks fine' yazılamaz" (no fantasy passes). Kalibrasyon: yanlış pozitif ucuz, kaçırılan slop pahalı.

### Bize aktarılacak

Slop/zorunlu listesi bizim "özgün tasarım" kuralımızın ölçülebilir hâli (Babylon'a çevrilebilir: `StandardMaterial` varsayılan, `ArcRotateCamera` boşta dönme, yalnız hemisferik ışık = slop); composer sıralama kuralları ve 0,06/0,65 gibi kısıtlı bloom değerleri; dither'ı en sona koyma; kritik ajan istem yapısı (varsayılan "olmadı", görsel doğrulama ayrı karar, kanıtlı geçiş satırları).

---

## 7. Battle-of-Austerlitz-Film (WinterArc21; 5 dk tarih filmi, WebGL2, lisans yok → düzyazı)

### Dosya haritası

| Dosya | Görev |
|---|---|
| `web/script.js` | Anlatım, vuruş vuruş: sahne `{ id, pre, tail, beats: [[id, metin, gap]] }` |
| `tools/tts.py` | Kokoro ile her vuruş ayrı WAV; başı/sonu sessizlik kırpma; hash önbelleği; `timings.json` (ölçülmüş süreler) |
| `web/film.js` | `buildTimeline(timings)` + her sahnenin `shots(S)` listesi; kamera yolları, ordular, efektler, tipografi |
| `web/main.js` | t → sahne + çekim seçimi, dissolve, overlay; `window.frameJPEG(T, q)`, `window.READY`, `window.film.total` |
| `web/events.js` | Resimden ses cue'ları türetir: her top, yaylım, dörtnal, ateş; kameraya göre mesafe ve pan |
| `web/engine/renderer.js` | HDR → bloom piramidi → god rays → grade → LDR; `finish()`: Kuwahara, dokuma, gren, vinyet, letterbox |
| `web/engine/shaders.js` | Tüm GLSL (gökyüzü, arazi, gölge, sprite, parçacık, post) |
| `web/engine/sprites.js` | Canvas 2D ile metre biriminde çizilen prosedürel atlas (256 px hücre, 16 sütun): üç ordunun askerleri, IK yürüyüş/dörtnal atlar, toplar, ağaçlar |
| `web/engine/army.js`, `fx.js`, `env.js`, `terrain.js`, `europe.js` | Zamanın saf fonksiyonu olarak formasyon ve parçacıklar; günün saatleri; SRTM arazi (38 m ızgara, 3× dikey abartı); kampanya haritası |
| `tools/mix.py` | NumPy sentez skor + ses tasarımı + anlatım → mix, SRT |
| `tools/render.mjs`, `frames.mjs`, `export.mjs` | Playwright (SwiftShader) → 10 s'lik chunk'lar, sürdürülebilir; stills; cue export |

### Mekanizmalar (düzyazı, kod alıntısı yok)

1. **Anlatım süreleri zaman çizelgesini kurar.** Her vuruş metni TTS ile ayrı seslendirilir ve gerçek süresi ölçülür. `buildTimeline`: sahne başı `pre` sessizlik, her vuruş `ölçülen süre + gap`, sahne sonu `tail`; sahne `beats[id] = [başlangıç, bitiş, metin]` (sahne-yerel). Çekimler `B('n2')[0] − 0,4` gibi **vuruş kimliğine göre** zamanlanır, mutlak saniyeye göre değil; metin değişince yeniden seslendirilir, çizelge kendini günceller. TTS hash önbelleği değişmeyen vuruşları atlar. Bu, bizim `narration/lines.json → manifest.json` akışımızın birebir aynı düşüncesidir.
2. **Çekim = zaman fonksiyonu, tanımlayıcı döner.** Her çekim `{ t, xfade?, fn(t, tl) }`; `fn` bir tanımlayıcı nesne döner: `cam` (Catmull-Rom yolunda eased anahtarlar + hash tabanlı sarsıntı), `env` (gün saati preset'i, ateş ışığı), `center`, `formations` (yol, dosya×sıra, sprite, cadence, jitter, yüz yönü), `fx` (ateş, kor, ışıklar; her biri kendi `t0`'ıyla), `lights` (en çok 12 nokta ışık), `finish` (paint miktarı, fade), `overlay(ctx)` (altyazı/caption çizimi). Motor bu tanımlayıcıdan kareyi çizer; `xfade` iki komşu çekimi iki LDR yuvasına çizip Kuwahara ve final geçişinde karıştırır. Formasyonlar yol boyunca `along(path, t)` ile kapalı formda konumlanır, dolayısıyla herhangi bir kare bağımsız üretilir.
3. **Ses cue'ları resimden türetilir.** `events.js` her çekim için çekimin ortasını probe eder, `fx` listesindeki top/yaylım/çarpma/ateş olaylarının dünya konumunu kameranın `lookAt` tabanına göre `dist` (m), `pan` (sağ vektörle iç çarpım) ve `front` olarak hesaplar; süvari ve davul "bed" olarak çekim boyunca eklenir. `mix.py` her cue'yu `t + dist/343` gecikmesiyle, mesafeye göre alçak geçiren filtreyle ve panlı yerleştirir; bed'lerden çekim başına yalnızca en yakın ikisi tutulur ("aksi hâlde gürültü duvarı"). Müzik konuşma altında %50, efektler %35 kısılır (yumuşatılmış ses zarfına göre). Skor sahne başına tempo ve karakter değiştirir (kampanya 112 bpm ostinato, merkez 132 bpm, buz ağıt).
4. **Post zinciri (HDR → LDR).** HDR renk → yarı çözünürlük downsample (parlaklık eşiği 1,0, `max(l − thr, 0)/l` ile yumuşak kesim) → çeyrek çözünürlük + iki geçişli Gauss (5 tap) → sekizde bir çözünürlük + daha geniş Gauss → god rays (HDR'den güneş ekran konumuna doğru 48 adımlı radyal blur, `max(c − 1,5, 0)`, decay 0,965, güneşten uzaklaştıkça üstel sönüm; güneş kare dışındaysa atlanır) → grade: `bloom = q·0,6 + e·0,8` (iki piramit seviyesi), ACES, isteğe bağlı 2B "plate" karışımı (harita sahneleri), doygunluk, kontrast, lift/gain, gamma. Sahne `env`'i bu uniform'ları sürer (gün saati = grade seti).
5. **Ressamsı final geçişi.** Yarı çözünürlükte Kuwahara: piksel çevresinde 7×7 örnek dört çeyreğe bölünür (her çeyrek 16 örnek), her çeyreğin ortalama ve varyansı hesaplanır, ağırlık `1/(1 + (σ·400)²)` ile en düşük varyanslı çeyrekler kazanır → düz "fırça" bölgeleri, keskin kenarlar korunur; yarıçap 5. Sonra `paint` karışımı (0,45–0,6; gece daha düşük), tuval dokuması (tekrarlı doku, ×0,07·paint), vinyet 0,35 (x 1,3 ile elips), zamanla kayan gren 0,05 (karanlıkta daha çok), letterbox 0,12 (2,35:1), fade. Kuwahara yalnızca `paint > 0` iken çalışır.
6. **Prosedürel sprite atlası.** Askerler, atlar, toplar Canvas 2D ile **metre** biriminde, sağa bakacak şekilde çizilir (shader sola bakanları aynalar); kapsül segment, elips, blob yardımcıları; IK dörtnal/yürüme döngüleri; atlas 256 px hücre × 16 sütun, isim → hücre indeksleri ve metre boyutu. Sprite shader'ı mesafe ve ışığa göre gölgeler. Bu, bir belgeselde "binlerce figür" için GLB yerine kodla çizilmiş instanced billboard yaklaşımıdır.
7. **Render.** Playwright Chromium `--use-angle=swiftshader` (yazılım GPU, ~1,7 s/kare); `window.READY` beklenir; film 10 s'lik chunk'lara bölünür, her işçi sıradaki chunk'ı MJPEG borusuyla libx264 crf 18 `-g fps·4`'e yazar, `.part.mp4 → rename`; var olan segmentler atlanır (sürdürülebilir); concat; mix + SRT `mov_text` altyazı akışı olarak muxlanır (bizim ayrı `.srt` teslimimizle aynı mantık, artı gömülü akış).
8. **Gerçekçilik kararları.** Arazi gerçek SRTM; güneş azimutu 2 Aralık sabahı için gerçek (125–140°), "Austerlitz güneşi" sahnesi bu yüzden Pratzen tepesinin arkasından doğar; ses hızı 343 m/s; README'de sayısal basitleştirmeler açıkça yazılı (dikey 3×, tören üniformaları). Öğrencilere gösterilen içerik için "bilimsel doğruluk + açık basitleştirme notu" örneği.

### Kalite kapıları

Otomatik yok. `frames.mjs` verilen zamanlarda still (ms basar), `DEBUG_ENV` ile ortam parametrelerini kareye enjekte edip deneme; render günlükleri.

### Bize aktarılacak (teknik olarak, kod kopyalamadan)

Ölçülmüş TTS sürelerinden çizelge kurma ve çekimleri vuruş kimliğine bağlama (bizde zaten `manifest.json` var; eksik olan çekimleri `B('id')` ile bağlayan yardımcı); resimden türetilen, mesafe/pan/gecikmeli SFX cue listesi; Kuwahara + dokuma + letterbox "ressamsı" bitiş katmanı (Babylon `PostProcess` ya da Three `ShaderPass` olarak kendi yazımımızla); HDR bloom piramidi + god rays sırası; günün saati = grade seti.

---

## 8. procedural-clouds-threejs (CK42BB; hacimsel bulut skill'i — belge)

### Dosya haritası

`SKILL.md` (mimari: WebGPU raymarch / mesh küme / billboard yolları; gürültü; yoğunluk alanı; raymarch döngüsü; ışık yürüyüşü; aydınlatma modeli; günün saati; god rays; preset'ler; performans; tuzaklar), `cloud-shaders.md` (tam GLSL: fullscreen vertex, raymarch fragment, mesh bulut, god ray post, WGSL 3B gürültü compute, TSL malzeme), `cloud-types.md` (10 cins için parametreler).

### Mekanizmalar

1. **Yoğunluk alanı.** Büyük şekil `fbm(p·0.0003 + rüzgâr·t, 3 oktav)` → `remap(shape, coverage, 1, 0, 1)` (kapsama kontrolü) − detay `fbm(p·0.003 + rüzgâr·t·2, 5 oktav)·detailStrength` (kenar erozyonu), × irtifa zarfı `smoothstep(base, base+200, y)·smoothstep(top, top−200, y)`.
```glsl
float shape = fbm3D(p * 0.0003 + wind * time, 3);
shape = remap(shape, coverageThreshold, 1.0, 0.0, 1.0);
float detail = fbm3D(p * 0.003 + wind * time * 2.0, 5);
float density = shape - detail * detailStrength;
return max(density * altFade, 0.0);
```

2. **Raymarch döngüsü.** Işın-dilim kesişimi (cloudBase/Top), başlangıca hash jitter (banding), `MAX_STEPS 80` (64 kalite / 32 performans), `LIGHT_STEPS 6`; Beer–Lambert `alpha = 1 − exp(−ρ·step·σ)`, öne çarpımlı birikim, `a > 0.98`'de erken çıkış; tabana doğru `mix(0.4, 1, altNorm)` karartma.
```glsl
float jitter = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
float t = slabT.x + jitter * stepSize;
for (int i = 0; i < MAX_STEPS; i++) {
  if (result.a > 0.98 || t > slabT.y) break;
  vec3 p = ro + rd * t; float density = cloudDensity(p);
  if (density > 0.001) {
    float lightEnergy = lightMarch(p);
    vec3 cloudCol = sunColor * lightEnergy * phase + ambientSky * 0.2;
    float alpha = 1.0 - exp(-density * stepSize * absorptionCoeff * 80.0);
    result.rgb += cloudCol * alpha * (1.0 - result.a);
    result.a += alpha * (1.0 - result.a);
  }
  t += stepSize;
}
```

3. **Işık yürüyüşü + "powder".**
```glsl
float lightMarch(vec3 p) {
  float stepL = (cloudTop - p.y) / float(LIGHT_STEPS);
  vec3 lightStep = sunDir * stepL; float accum = 0.0;
  for (int i = 0; i < LIGHT_STEPS; i++) { p += lightStep; accum += max(cloudDensity(p), 0.0) * stepL * 0.001; }
  float beer = exp(-accum * absorptionCoeff);
  float powder = 1.0 - exp(-accum * absorptionCoeff * 2.0);
  return mix(beer, beer * powder, 0.5);
}
```

4. **Henyey–Greenstein iki lob.** `HG(cosθ, g) = (1−g²) / (4π (1 + g² − 2g cosθ)^1.5)`; `phase = HG(.6)·.7 + HG(−.3)·.3` (ileri saçılma = gümüş kenar, geri = yumuşak parıltı). Gümüş kenar ek terimi: güneş yönünde 50 m ötede yoğunluk düşükse `pow(1 − edgeDensity, 2)·pow(max(−cosθ, 0), 2)·0.4`.

5. **Günün saati paleti.** Güneş yüksekliğine göre: < 0 gece (sun `#112244`, ambient `#0a0a1a`, tint `#1a1a2e`); < 0,1 altın saat (`#ff6622`, `#553322`, `#ff8844`); < 0,3 sabah/ikindi (`#ffcc88`, `#667799`, `#ffeedd`); gündüz (`#fff8e7`, `#b0c4de`, `#ffffff`). Tuzak: "gün batımında gri çamur = renk güneş açısına göre tonlanmamış; alçak güneşte saçılmayı artır".

6. **God rays post.** 60 örnek, exposure 0,3, decay 0,96, density 0,8, weight 0,4, güneş ekran konumundan radyal.

7. **Preset'ler.** `clearDay` coverage 0,15 base 2000 top 3000 σ 0,04; `partlyCloudy` 0,45 / 1500–3500; `overcast` 0,85 / 800–2000 σ 0,06 detay 0,2; `dramatic` 0,6 / 1000–6000 σ 0,08 detay 0,5; `sunset` 0,4 / 1500–3000 σ 0,03 güneş 0,05; `highCirrus` 0,3 / 8000–12000 σ 0,01; `mackerelSky` 0,5 / 3000–5000.

8. **Performans.** Çeyrek çözünürlük + bilateral upsample; zamansal yeniden yansıtma (kare başına ışınların 1/4'ü); mavi gürültü jitter; `depthWrite false`; mesafeyle solma; uzak için cubemap'e bake. Mesh küme yolu 20–40 grup, billboard 50+ sprite 60 fps.

### Kalite kapıları

Yok (belge). Tuzak listesi: az oktav = düz bulut (detay için 5+), banding = jitter yok, bulut arazi içinden geçiyor = base kamera+arazi üstünde ve derinlik tamponuyla kompozit.

### Bize aktarılacak

Coğrafya/uzay/belgesel gökyüzü çekimleri için hazır formül seti; çevrimdışı render'da adım sayısını 128'e çıkarıp zamansal hileleri atlayabiliriz (gerçek zaman kaygısı yok). Günün saati paleti bizim "sahne başına grade" verisine girer.

---

## 9. 3brown1blue (AmitSubhash; Manim skill + planlayıcı; kurallar bizim için, Manim isteğe bağlı)

### Dosya haritası

`src/three_b1b/prompts.py` (plan istemi: araştırma → **yanlış kanı analizi** → müfredat → sahne planları → stil sözleşmesi → görsel ilkeler → anlatım; üretim istemi: **18 zorunlu kural**), `skill/SKILL.md` (kural dosyaları dizini), `skill/rules/production-quality.md` (17 bölüm: yerleşim bölgeleri, kapsayıcı sınırları, veri görselleştirme minimumları, yaşam döngüsü, dim vs fade, görsel çeşitlilik denetimi, soru karesi, yoğunluk rampası, render öncesi/sonrası listeler, bilinen hata kalıpları), `explanation-design.md` (Sanderson "Designing Math": ne anlatılacak), `pedagogy-checklist.md` (ne zaman "bitti"), `animation-design-thinking.md` (tempo tablosu, gör-sonra-duy), `scene-planning.md` (yerleşim şablonları, ajan istemi yapısı), `audiences/*.md` (lise/lisans/yüksek lisans/sektör: yanlış kanı kalıpları), `audit_video.py` (statik kaynak denetimi + %10/25/50/75/90 kare çıkarma + rapor), `videos/*` (4 örnek proje: plan.md, storyboard.md, audit_report.md).

### Mekanizmalar

1. **Yanlış kanı motoru (Muller, etki büyüklüğü 0,8).** Plan aşamasında zorunlu adım: hedef kitle ne **yanlış** inanıyor, en yaygın yanlış zihinsel model ne, sezgi nerede kırılıyor. Yapı: yanlış kanıyı önce göster ("evet, mantıklı" dedirt) → onu kıran kanıtı getir → doğru modeli göster → yanlış kanının **neden** var olduğunu açıkla. Üretim kuralı 11: yanlış model önce **ayrı "yanlış" rengiyle** (kırmızı) canlandırılır, sonra doğruya geçilir. Kitleye göre yerleşim: lisede her ana kavram için ve görsel etiketli; yüksek lisansta "uzmanın kestirme yapmaya çalışacağı ilk noktada, başta değil"; sektörde "gerçek karar anına yakın".

2. **18 üretim kuralı (`GENERATE_FROM_PLAN`).** 1 yerleşim şablonu ve güvenli sınırlar x ∈ [−5,5, 5,5], y ∈ [−3,2, 3,2]; 2 `safe_text()` (maks 12 birim, geniş ise ölçekle); 3 çocuklar ebeveyne göre konumlanır; 4 başlıklar yeni içerik bölgeyi kullanmadan `FadeOut`; 5 kare ≥ %50 dolu, çubuk opaklık ≥ 0,6 genişlik ≥ 0,3; 6 bölüm sonunda her şey temizlenir; 7 MathTex'te `$` yok; 8 metne `Write`, şekle `Create`, denklem zincirinde `ReplacementTransform`; 9 alt metin buff ≥ 0,5, öncekini kaldır; 10 updater varken `wait(frozen_frame=False)`; 11 yanlış kanı yayı (yukarıda); 12 kitleye göre tempo (lise uzun bekleme az not; yüksek lisans hızlı yoğun); 13 alan sözleşmeleri (ML: loss eğrisi; fizik: vektör alanı); 14 her `play` üstüne `# NARRATION: "…"` yorumu; 15 renkler adlandırılmış sabit, satır içi hex yok; 16 "görsel çapa" nesneleri bir kez yaratılır, sahneler arası dönüştürülür; 17 denklem zincirleri eşittir işaretinde hizalı; 18 son sahne açılıştaki soruyu yeniden ziyaret eder.

3. **Tempo tablosu.** İlk denklem `Write` 1–2 s, sonra 2–3 s bekle; terim vurgusu 0,5 s + 1 s; denklem dönüşümü 1,5–2 s + 1,5–2 s; `FadeIn` 0,5–1 s + 0,5 s; hat aşaması 0,5 s + 0,3 s; kamera 1,5 s + 1 s; büyük açıklama 1–2 s + 3 s. Her 3–4 animasyonda 1–2 s nefes ("izleyici ~3 yeni görsel değişimi izleyebilir"). Tempo değişsin: rutin hızlı, kilit içgörü yavaş, ana katkıdan sonra en uzun duraklama. **Gör-sonra-duy:** animasyon anlatımdan 0,3–0,5 s önce başlar; 150 kelime/dk = 2,5 kelime/s; 10 kelimelik cümle ~4 s; animasyon cümle bitmeden ~0,5 s önce biter, kalan `wait`.

4. **Yerleşim sistemi.** Kare 14,2×8; adlandırılmış bölgeler (TITLE y ∈ [2,8, 3,5]; MAIN_LEFT/RIGHT x ∈ ±[0,5, 6,5]; BOTTOM y ∈ [−3,5, −2,5]); koordinat bütçesi |x| ≤ 5,5, |y| ≤ 3,2; veri görselleştirme minimumları (çubuk ≥ 0,3×0,2, nokta ≥ 0,06, eksen ≥ %40 genişlik, çizgi opaklık ≥ 0,8); DIM_OPACITY 0,1 (0,3 koyu zeminde hâlâ yarışır); "yanında dim, altında FadeOut" (0,1 bile beyaz metnin altından sızar); minimum font 20 pt; karmaşık zemin üstünde metne 0,7 siyah arka dikdörtgen.

5. **Yapısal denetimler.** Görsel çeşitlilik: ardışık iki sahne aynı tekniği kullanmaz; N ≤ 4 sahnede ≥ 3, 5–8'de ≥ 5, > 8'de ≥ 6 farklı teknik ("etiketli kutu + metin" > %50 ise düz). Soru karesi: her 3 sahnede ≥ 1 (soru → 2–3 s bekle → görsel yanıt). Yoğunluk rampası: sahne 1–2'de 3–5 öğe, 3–5'te 6–10, 6–7'de 10–15, sonda 3–5. Sahneler arası "köprü metni". "3 saniyede anlaşılmayan görseli seçme."

6. **Pedagoji kontrol listesi (Sanderson JMM 2023).** 1 her tanımdan önce motive edici örnek; 2 ispat/türetme yeniden keşfedilebilir hissettirir; 3 kişisel; 4 çekirdek fikirlerin diyagramı var; 5 soyutlamadan önce somut (bir katman aşağıdan başla); 6 öğretimden önce problem (Kapur "üretken başarısızlık"); 7 dinleme nedeni. SoME rubriği: motivasyon, açıklık, yenilik, akılda kalıcılık. "Dürüst el sallama": basitleştirmeyi söyle, "açıkça/bariz" deme.

7. **Açıklama tasarımı.** Bir nesne, birkaç temsil, her biri bir soruya: "neye benziyor?" (ne), "neden doğru olmak istiyor?" (neden; her sembole motivasyon, kural + başlangıç durumu → zamanı ileri oynat), "nasıl kullanılıyor?" (en şaşırtıcı uygulamayla aç). Senaryo listesi: bu sahne hangi tek soruyu yanıtlıyor; hangi temsil; her sembolün varlık nedeni ekranda mı; önce inanç sonra ispat; sonraki sahne aynı nesneyi farklı temsille mi gösteriyor.

### Kalite kapıları (otomatik)

`audit_video.py`: kaynakta `\n` ile merkezlenmiş metin, alt notlarda `Write`, MathTex'te `$`, sınır aşımı koordinatları, başlık yaşam döngüsü, sahne sonu temizliği, dim opaklığı 0,3, `interpolate_color` ok çökmesi, `style` import'u, boş `wait`; sonra her sahnenin %10/25/50/75/90 anlarında kare çıkarıp rapor (metin çakışması, kenar kırpması için göz kontrolü). İki fazlı render testi: `py_compile` → `-ql` 480p15 tüm sahneler → ancak hepsi geçince 1080p.

### Bize aktarılacak

Yanlış kanı yayı (bizim `formats/explainer.md` ve narration skill'ine "önce yanlış sezgi" adımı); tempo tablosu ve gör-sonra-duy 0,3–0,5 s (Whisper kelime zamanına göre sahne olayını kelimeden **önce** tetikleme kuralı); yoğunluk rampası, soru karesi ve görsel çeşitlilik sayımı (treatment inceleme listesi); yerleşim bölgeleri ve DIM 0,1 / "altında FadeOut" kuralları; `# NARRATION:` yorum eşlemesi (bizde `lines.json` id'si).

---

## Bize aktarılacak mekanizmalar

Efor: **D** düşük (bir oturum), **O** orta (bir-iki gün), **Y** yüksek (birkaç gün ya da animasyon başına özel iş). Lisans: kodu doğrudan uyarlayabileceğimiz (MIT) ya da yalnızca fikri alıp kendimiz yazacağımız (belirsiz/yok).

### (a) Zaman ve vuruş

| Mekanizma | Kaynak | Lisans | Efor | Not |
|---|---|---|---|---|
| Vuruş ızgarası `bpOf(t)`, `pulse(t,k)=exp(−frac·k)`, `pulse2`, `beatN` | PDoom | belirsiz (fikir) | D | Anlatım tabanlı videolarda "vuruş" = müzik değil, Whisper kelime/nefes zamanı olabilir; `pulse` aynı formülle çalışır |
| `kf(t, keys, ease)` dizi değerli anahtar kare; `keyed(t, keys, log)` çarpımsal zoom; `env(t, a, b, c, d)` zarf | PDoom / opus | belirsiz / MIT | D | `keyed` ve `env` MIT'den alınır; zoom için log interpolasyon kural olsun |
| Easing seti: smoothstep, easeOut/In (kübik), `backOut` (s 1,7–1,9), `elasticOut`, `easeIO`; monoton kübik spline çok anahtarlı zaman atlamaları için | PDoom / opus / jsanim | MIT çoğu | D | Tek `tools/lib/easing.mjs`? Hayır: CLAUDE.md ortak motor istemiyor; skill içine "önerilen set" olarak yaz, her animasyon kopyalar |
| Boil: titreme tohumu her 4 karede (30 fps → 7,5/s) ya da 12/s; gren kare indeksine kilitli | jsanim / PDoom / opus | MIT | D | Her kare değişen gürültü = "noise", 7,5–12/s = el çizimi |
| Hash tabanlı sarsıntı 24 fps'e kilitli (`shakeXY`) | PDoom | belirsiz (fikir) | D | Kare içi titreme yok, saflık korunur |
| Tempo haritası: her sahne tam sayıda bar, kesme downbeat'e; sahne dominantta biter, kesme tonikte | jsanim score.js | MIT | O | Belgesel altı müziği için; anlatım kelime zamanlarıyla çakışmayan yerleşim |
| Ölçülmüş TTS sürelerinden çizelge (`pre/gap/tail`), çekimler vuruş kimliğine bağlı | Austerlitz | yok (fikir) | D | Bizde `manifest.json` var; eksik olan `B('id')` yardımcısı ve çekim zamanlarını mutlak saniye yerine id'ye bağlama kuralı |
| Gör-sonra-duy: sahne olayı kelimeden 0,3–0,5 s önce | 3b1b | MIT | D | Whisper kelime zamanı − 0,4 s = tetik |

### (b) Çekim yapısı

| Mekanizma | Kaynak | Lisans | Efor | Not |
|---|---|---|---|---|
| `chapter(name, start, end, [[t0, fn]])` + `fn(t, lt, dur)` tüm kareyi boyar; bölüm dosyası IIFE, paralel ajan yazabilir | PDoom | belirsiz (fikir) | D | Bizim `renderAt(t)` içinde çekim seçici; bölüm başına dosya |
| Çekim tanımlayıcı döner (`cam, env, formations, fx, lights, finish, overlay`), motor çizer; `xfade` iki yuva | Austerlitz | yok (fikir) | O | 3B sahnelerde çekim = veri, kamera yolu Catmull-Rom |
| Tek dünya, çok kamera (`withCamera`, `PX` çizgi kalınlığı sabit); süreklilik yapısal | jsanim | MIT | D | 2B açıklayıcılar için doğrudan |
| Storyboard veri olarak (`SHOTS`, `EVENTS`, `CUES`); sahne, kamera, ses aynı veriyi okur | jsanim | MIT | D | `EVENTS` bizim SFX listemiz; `CUES` sahne değişimleri |
| Treatment şablonu tablosu (zaman / söz / ne görüyoruz / ne değişiyor / kamera / ışık / metin) + hook + ending + riskler; onay olmadan inşa yok | opus | MIT | D | `prompts/new-animation.md` treatment aşamasına birebir |
| Uzunluğa göre yapı: < 30 s tek sahne durum değişimi; 30–60 s 1–3 hareket tek set; dakikalar = production | opus | MIT | D | "Her satıra sahne" hatası gerçek müşteri notlarıyla belgeli |
| Odak kuralları: çekim başına bir aksiyon, büyük siluet, her çekimde bir kamera hareketi, kesme üzerinden bir nesne taşınır, ekran yönü korunur | PDoom / jsanim | — | D | Skill metnine |
| Kamera dili: push 1,06–1,12 anchor'lu; dolly > orbit > roll; orbit ≤ 45°; bölüm örtüşmesi %10; "neyin nerede olacağını anahtarla" (`aim()`) | opus / cinematic | MIT | O | 3B'de Babylon için `aim` çözümü yeniden yazılır |
| Mood-take: yüz değişiminde 0,16 s göz kısma + squash, emote 0,05–0,3 s | PDoom | belirsiz (fikir) | O | Çocuk/karakterli animasyonlarda |
| Yanlış kanı yayı: önce yanlış sezgi (ayrı renk), kıran kanıt, doğru model, neden | 3b1b | MIT | D | `formats/explainer.md`'ye |
| Soru karesi her 3 sahnede, yoğunluk rampası, görsel çeşitlilik sayımı | 3b1b | MIT | D | Treatment inceleme listesi |

### (c) 2B çizim kütüphanesi

| Mekanizma | Kaynak | Lisans | Efor | Not |
|---|---|---|---|---|
| Mürekkep çizgisi: iki geçiş (0,55 kalınlık, 0,45 alfa), iki frekanslı `vnoise` jitter, `resample` 9–12 px, quadratic `tracePath` | jsanim | MIT | D | Kopyalanabilir; her animasyon kendi paletini seçer |
| Resimli kitap `shape()`: dolgu, alt-sağ koyu kenar, açık fırça darbeleri, koyu-ton kontur (siyah değil); `blush` | jsanim | MIT | D | |
| Kâğıt: 90k benek + 260 lif + vinyet bir kez; gren `multiply` | jsanim / PDoom | MIT | D | |
| Riso spot renk katmanları (misregistration 4 px, gren 0,18, multiply); tek çizgi gravür (kalınlık ≤ aralık); kelime dolgusu; keçeli kalem dolgusu | jsanim techniques | MIT | O | Her biri ayrı "stil" seçeneği |
| Kesme kâğıt stop-motion kiti: hand-cut kenar (10–16 px'de ±1 px), fibre `source-atop` 0,2–0,45, kontakt gölge 0,22–0,38, rim light; poz 12/15 fps kamera her kare | opus styles §2 | MIT | O | |
| Dengeli satır sarma (`balanced`), metni bir kez bake, yükselerek netleşme (16 px, blur 7→0, 1 s) | opus | MIT | D | Altyazı değil, ekran metni için |
| Ekran metni ölçüleri: 1920'de gövde ~42–44 px Medium, display 66–72; satır ≤ 1300 px; yoğun zemin üstünde koyu havuz | opus delivery/design | MIT | D | CLAUDE.md altyazı 17–23 px ile çelişmez; bu başlık/vurgu metni |
| Süper örnekleme `supersample(ctx, SS)` + `?ss=2` | opus | MIT | O | `render-video.mjs`'e `--ss 2` seçeneği; Lanczos rgb48le |
| Prosedürel sprite atlası (metre biriminde Canvas 2D, IK yürüyüş döngüleri, instanced billboard) | Austerlitz | yok (fikir) | Y | Kalabalık sahneleri için GLB'siz yol |
| Yerleşim bölgeleri, koordinat bütçesi, DIM 0,1, "yanında dim altında FadeOut", min font | 3b1b | MIT | D | 2B açıklayıcı skill kuralı |

### (d) 3B sinematik zincir

| Mekanizma | Kaynak | Lisans | Efor | Not |
|---|---|---|---|---|
| Post sırası: sahne (MRT output + emissive) → AO → bloom(**emissive**) → lensflare → DOF → sis (bloom sis içinde ×0,25) → tint/offset → doygunluk/kontrast → kromatik (kenar) → vinyet → AA → gren | threejs-conference | MIT | O | Three: TSL ile aynen; Babylon: emissive'i ayrı RT'ye yazan ikinci geçiş + `BloomEffect` |
| Kısıtlı bloom: hero 0,06 / eşik 0,65 / smoothing 0,2; night 0,38 / 0,62; açık zeminde bloom yok; dither en son; grade bloom'dan sonra, kromatikten önce | toolkit | MIT | D | "Yalnız bloom = slop" |
| Malzeme HDR yazımı: parlayacaklar emissive 2–8, diğerleri < 1; eşik 0,85–1,0; arka plan `#050a14` | cinematic | MIT | D | |
| Look preset = tek veri nesnesi (6 örnek değer seti) ve sahne başına grade lerp 0,05 | threejs-conference / cinematic | MIT | D | Günün saati paleti (clouds) aynı nesneye girer |
| Kenar kromatik sapması `edgeMask = 1 − 1/(1+(d·f)²)`, ±0,015·s, dither 0,004; ofset ≤ 0,0015–0,003 | threejs-conference / toolkit | MIT | D | |
| DOF: ayrılabilir box blur + `smoothstep(36, 75, |viewZ − focus|)`; çevrimdışıda yarı çözünürlük gerekmez | threejs-conference | MIT | O | Babylon `DepthOfFieldEffect` de var; odak noktası kamera yönetmeninden |
| God rays: yarı çözünürlük okluzyon + 48–64 tap radyal, decay 0,96–0,965, `max(c − 1,5, 0)`, güneş kare dışında atla | cinematic / Austerlitz / clouds | MIT / yok / MIT | O | |
| Curl-noise compute parçacıklar: yay + curl + kaldırma + sürtünme 0,96; hedefler `MeshSurfaceSampler`; additive `depthWrite:false`; yoğunlaşma anı attraction 2–4 | cinematic / toolkit | MIT | O–Y | Babylon: `ComputeShader` (WebGPU) ya da CPU ≤ 5k; "ambient parçacık = slop" uyarısı |
| GPU yağmur/kar: yükseklik RT + compute yeniden doğma, `fract` sarma, 5k parçacık | threejs-conference | MIT | Y | Hava sahneleri |
| Hacimsel bulut: shape fbm 3 oktav ×0,0003 − detay 5 oktav ×0,003; 80/6 adım; Beer + powder; HG(.6)·.7 + HG(−.3)·.3; gümüş kenar; taban karartma 0,4; jitter | clouds | MIT | O | Çevrimdışı render'da adımları artır |
| Ressamsı bitiş: Kuwahara (7×7 → 4 çeyrek, ağırlık 1/(1+(σ·400)²), yarıçap 5, yarı çözünürlük) + dokuma ×0,07 + vinyet 0,35 + gren 0,05 + letterbox 0,12 | Austerlitz | yok (fikir) | O | Kendi shader'ımızı yazarız; Kuwahara literatürde standarttır |
| Bütçe sözleşmesi: DPR üst sınır, yarı çözünürlük bayrakları, kare atlama; headless render için "kalite" profili | threejs-conference / toolkit | MIT | D | `?video=1`'de ayrı profil (tam çözünürlük, DOF açık) |
| Fresnel iridescence, MSDF tipografi (troika) | toolkit | MIT | O | Yalnızca konu gerektirirse |

### (e) Ses

| Mekanizma | Kaynak | Lisans | Efor | Not |
|---|---|---|---|---|
| `SCORE(ac)` → `OfflineAudioContext(2, 48k·s)` → tepe 0,89 normalize → WAV → `-shortest` mux | jsanim render.mjs | MIT | D | Bizim `prepareSound/soundChunk` zaten benzer; bu daha basit tek geçiş |
| Groove: bar başına katman, kit (electro/acoustic/keys/percussion), MIDI harmoni tabloları, tohumlu reverb IR, kompresör −12/3:1; yeni davul katmanı yarı şiddette girer (+11 dB vs +3,5 dB ölçümü) | jsanim groove.js | MIT | O | Belgesel için `keys`/`acoustic` kitleri; Türkçe anlatım altında |
| ~24 sentez SFX (`EVENTS`'ten, bilinmeyen ad hata) | jsanim groove.js | MIT | D | |
| Tempo haritası; kesme armoniyle; downbeat'te ekstra vurgu yok; açılış barı seyrek değil; layer'lar barda bir-iki | jsanim score.js + SKILL | MIT | O | |
| Cut-on-beat doğrulama: ±100 ms OFF-BEAT, > +6 dB STARTLE, sessizliğe kesme geçer | jsanim sync-check | MIT | D | `renders/<slug>.mp4` üzerinde çalıştırılır; CUES = sahne zamanları |
| Resimden türetilmiş SFX cue listesi: `{t, type, dist, pan}`; gecikme `dist/343`; mesafe filtresi; en yakın 2 bed; müzik %50, SFX %35 duck | Austerlitz events.js/mix.py | yok (fikir) | O | 3B belgesellerde olayı sahne verisinden üret |
| Mix hedefi −16 LUFS / −1 dBTP (`loudnorm=I=-16:TP=-1:LRA=11`); müzik konuşma altında ~10 dB; `ebur128` okuması | opus audio.md / page_audio | MIT | D | `render-video.mjs` sonuna LUFS raporu |
| Nefes noktalarından parçalı Whisper (−30 dBFS, 0,1 s, ≥ 3 s aralık) | opus align_audio.py | MIT | D | `voice.mjs --words-only` doğruluğu; uzun tek geçiş kayması bilinen sorun |
| Ses katmanları: bed < 400 Hz, sahne döngüleri, one-shot varyantlar, 800 ms crossfade | cinematic | MIT | D | Tasarım kuralı |

### (f) Kalite kapıları

| Mekanizma | Kaynak | Lisans | Efor | Not |
|---|---|---|---|---|
| Saflık testi: aynı t iki hash + gezin + soğuk sıçra; sayfa hatası = fail | opus verify.mjs | MIT | D | `npm run video -- <slug> --verify`; `renderAt` sözleşmesinin otomatik kanıtı |
| Kontak tablosu: kesmelerden ±0,35 s kaç (+0,45), yarım adımdan başla, zaman damgası tarayıcıda; 1/30 s şeritler geçişlerde; 1:1 kırpma | jsanim / opus / PDoom | MIT | D | `render-video.mjs --sheet 1`, `--range a:b:0.033`, `--crop` |
| `claim/placeFree` + `layout-check` (metin×metin, metin×keep kısmi, ≥ 4 px, 0,1 s adım) | jsanim | MIT | O | Altyazı bandı `keep` olarak claim edilir; sahne metni altyazıyla çakışamaz |
| Asset audit (sıfır varlık kanıtı) | jsanim | MIT | D | Bizde varlık serbest; yine de "istenmeyen dış istek" kontrolü olarak |
| Kare sayısı = süre × fps, ses akışı var, kodlanmış MP4'ten kare decode et | opus | MIT | D | `ffprobe -count_packets` |
| Slop reddetme + zorunlu listeler (Babylon/Three sürümü) | toolkit | MIT | D | "Varsayılan malzeme, boşta dönen kamera, yalnız bloom, herhangi bir sitede olabilir" |
| Eleştirmen ajan istemi: varsayılan NEEDS WORK; NEEDS VISUAL VERIFICATION ayrı karar; `file:line`; "no fantasy passes" | toolkit premium-review | MIT | D | Bizim 7. adım (ekran görüntüsü kontrolü) için ayrı ajan |
| Statik kaynak denetimi + %10/25/50/75/90 kare; iki fazlı render (hızlı düşük kalite → tam) | 3b1b audit_video | MIT | D | |
| QC listesi: her sahne 1 saniyede okunur mu; hiçbir şey havada durmuyor; çizim sırası; karakter tutarlı; sonlar durur; döngü dikişi | jsanim qc.md | MIT | D | |
| Teslim ölçümleri: animasyonlu gren yok (116/51/31 Mb/s; SSIM .94 vs .85), 30 fps, BT.709 TV etiketleme, PNG kayıpsız yakalama, `--ss 2` (PSNR +6 dB) | opus delivery | MIT | D–O | YouTube da yeniden kodlar |
| Kare bütçesi günlüğü (ms/kare), "yüzlerce şekil iyi binlercesi değil" | PDoom | — | D | |

### (g) Ajan iş akışı

| Mekanizma | Kaynak | Lisans | Efor | Not |
|---|---|---|---|---|
| Beş konuşma: brief → ses kaynağı ✋ → ses raporu ("ne duyuyorum") → yön soruları (en çok 4, öneri önce) ✋ → treatment ✋; "just make it" treatment'ı atlatmaz | opus | MIT | D | Bizim treatment aşamasıyla örtüşür; ses raporu bizde Whisper çıktısından |
| `FILM.md`: onaylı treatment + kararlar + "Revisions" (müşterinin kendi sözleriyle) | opus | MIT | D | Animasyon README'sine bölüm |
| Alt ajan brifingi (`ANIMATION_GUIDE.md`): sözleşme, API, stil kuralları, sayılar, kontrol komutları; "yalnız kendi bölüm dosyanı düzenle, ortak dosyada bug varsa bildir" | PDoom | belirsiz (yapı) | D | Uzun animasyonlarda bölüm başına ajan |
| Production hattı: BIBLE → kitler (test sayfası + kontak + `API.md`) → **cold open kanıtı** (ses dahil, MP4'ten kare) → sahne yönetmenleri paralel (süreklilik sayfası) → ses ekibi → render çiftliği → 2 s sheet + sınır şeritleri → paylaşılan modüllerle süreklilik | opus production.md | MIT | O | ≥ 90 s filmler |
| Karakter önce yalnız: ifade/poz sayfası, çapa noktaları (`mouthOf`), tek fonksiyon | jsanim character.md | MIT | D | |
| AGENTS.md: okuma sırası, sert kısıtlar tablosu, dosya yönlendirme, tarifler, doğrulama listesi, "yapma" listesi; "kod kazanır"; opsiyonel özellik `null` döner | threejs-conference | MIT | D | Büyük 3B animasyon klasörlerine |
| STRIP.md: özellikleri sırayla kapatma rehberi (hata ayıklama) | threejs-conference | MIT | D | |
| 9 adımlı dikey dilim: önce tüm hattın çirkin sürümü | cinematic | MIT | D | Yeni animasyon 7. adımdan önce |
| "Görsel spec" ekran görüntüleri depoda; debug paneli ile look "bulunur" | cinematic | MIT | D | Bizde `docs/style-ledger.md`'ye ek |
| Planlayıcı: araştırma → yanlış kanı → müfredat → sahne planı (şablon, çapalar, temizlik, veri) → stil sözleşmesi → anlatım | 3b1b prompts.py | MIT | D | Narration skill ile birleşir |
| Hafızada denetleme; önce skill'i yükle | toolkit | MIT | D | |

### Bulunamayanlar ve uyarılar

- PDoomVideo ve Austerlitz'de LICENSE dosyası yok; bu rapor onlardan kod kopyalamadı, yalnızca teknik anlattı. PDoom `package.json`'ı "ISC" der ama yazar bunu ayrıca beyan etmemiş.
- cinematic-3d-website, procedural-clouds ve claude-studio-toolkit çalışır uygulama içermez; sayılar belge yazarlarının iddiasıdır, ölçülmüş değil (opus ve jsanim'deki dB/PSNR/SSIM sayıları ise ölçüm olarak sunulmuştur).
- claude-studio-toolkit'in tarifleri depoda olmayan bir "ether" motoruna dayanır; yalnızca "raw wiring" ekleri ve 4 GLSL parçası bağımsızdır.
- 3brown1blue'nun "18 kuralı" bir kural dosyası değil, `prompts.py` içindeki üretim istemidir; "wrong intuition first" motoru da plan isteminin 1.5 adımıdır, ayrı kod yoktur.
- threejs-conference'ta otomatik test yok; kalite kapısı bir kontrol listesidir.
