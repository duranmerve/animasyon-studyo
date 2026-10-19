# Bir Yıldız Nasıl Ölür?

Gökyüzünde yan yana iki yıldız: biri Güneş kadar, öteki ondan 25 kat ağır. İkisi de ölecek; biri beyaz cüce olarak sessizce sönecek, öteki çöküp süpernova olarak patlayacak ve kanımızdaki demiri uzaya saçacak. Hangisinin ne olacağını tek bir sayı belirliyor: **kütle**. Yaklaşık 8 dakikalık, anlatımlı ve altyazılı bir açıklayıcı animasyon.

Bütün film **siyanotip** levhalarda geçiyor: ışığın kendisiyle basılan Prusya mavisi fotoğraf kâğıtları, beyaz kalem notları, tek vurgu olarak füzyon turuncusu. Yıldızlar ışıklarıyla levhayı pozlar; süpernova levhayı aşırı pozlayıp kâğıdı beyaza yakar; kara deliğin olduğu yer, ışık kaçamadığı için pozlanmadan kalır. Sanat yönü ve gerekçesi: [TREATMENT.md](TREATMENT.md). Kaynaklar: [RESEARCH.md](RESEARCH.md). Anlatım ve beat sheet: [NARRATION.md](NARRATION.md).

## Bölümler

| # | Bölüm | Akılda kalan kare |
|---|---|---|
| 1 | İki yıldız | Aynı levhada A (1 M☉) ve B (25 M☉), aralarında "?" kutusu |
| 2 | Bir çekişme | Üstü çizilen "ateş topu"; yıldız kesitinde içe beyaz, dışa turuncu oklar: denge |
| 3 | Tek sayı | Güneş'in ömrü bir günlük kâğıt şerit; B'nin bütün hayatı ilk dakika |
| 4 | Kırmızı dev | Şişen Güneş Merkür'ün ve Venüs'ün yörüngelerini siliyor; Dünya'nın yanında "?" |
| 5 | Sessiz son | Mürekkep gibi açılan gezegenimsi bulutsu; Dünya boyunda beyaz cüce; bir çay kaşığı = bir fil |
| 6 | Soğan | Katman katman yanma kabukları; her yakıtın süresi: 7 milyon yıl → 1–2 gün |
| 7 | Kül | Demir çekirdek: turuncu oklar birer birer söner, sessizlik |
| 8 | Çöküş | Saniyenin onda biri, geri sekme, levhanın beyaza yanması; 100 noktada %99 nötrino |
| 9 | 1987 | Üç dedektörde 24 tık, ışıktan saatler önce |
| 10 | Geriye kalan | 1054'ün Çin kaydı, Yengeç; şehir üstünde nötron yıldızı; önce/sonra levhasında kaybolan yıldız |
| 11 | Biz | Tozdan bir bulut, Güneş, Dünya ve bir insan; "?" kutusuna "kütle" yazılır |

## Teknik

- **Tek tam ekran WebGL2 gölgelendirici** (`src/gl.js`): her sahne bir "pozlama alanı"; yıldız, kesit, bulutsu, şok, kırmızı dev, Yengeç, kara delik (yıldız alanını büker), toz bulutu ve galaksi nesneleri. Alan, Prusya mavisi emülsiyona (fırçalanmış kenar, kâğıt lifi, aşırı pozlamada beyazlama) tonlanır.
- **Canvas 2D kalem katmanı** (`src/draw.js`, `src/props.js`): titreşen çizgi, oklar, el yazısı açılımı; doku olarak gölgelendiriciye verilir ve kâğıt dişiyle dokulanır. Yazılar yerleşim kaydıyla (`claim/placeFree`) çakışmadan yerleşir; altyazı bandı korunan alandır.
- **Sahneler zamanın saf fonksiyonu** (`src/scenes*.js`); olaylar anlatımın kelime zamanlarına bağlı (`src/script.js` → `cues`). Levha değişimi, yenisinin eskinin üstüne kaymasıyla oluyor; onion → kül → çöküş tek kesintisiz levha.
- **Ses** (`src/audio.js`): drone (yıldızın nefesi), kâğıt hışırtısı, kalem, dedektör tıkları, çöküş, geri sekme, kâğıt yırtılmasına dönüşen patlama; hepsi Web Audio ile sentezlenir. Aynı fonksiyonlar `OfflineAudioContext` ile video sesini üretir. Anlatım: Windows Tolga, hız 0,92, bölüm başına tek kayıt.
- **Oynatıcı** (`src/player.js`): saat kaydı izler, geri gitmez, yüklenirken bekler; kelime kelime iki satırlı altyazı; CC ve anlatım ayrı kapanır, seçim hatırlanır; bölüm çentikli ilerleme, hız, tam ekran, klavye (boşluk, ←/→, Shift+←/→, C, N, F). `?video=1` → `window.__video`.
- **Kalite kademeleri:** `ultra` (video) / `high` / `mid` / `low` / `min` (çözünürlük, kalem katmanı çözünürlüğü, gürültü oktavı). Açılışta ağır anlar senkron ölçülür, bütçeyi tutan ilk kademe seçilir; oynatmada 2,5 sn boyunca kare > 45 ms olursa bir kademe düşülür. `?tier=` ile sabitlenir.

## Komutlar

```
node build.mjs                      # dist/index.html + dist/voice
node dev/make-lines.mjs             # src/script.js → narration/lines.json (ipucu denetimi)
npm run voice -- how-stars-die      # anlatım (yalnız değişen satırlar)
node dev/sheet.mjs --every 9        # temas sayfası (--phone, --times open.burst+1.5,…)
node dev/playtest.mjs play|ends|toggle|fps
node dev/poster.mjs open.number+1.6
npm run verify -- how-stars-die     # renderAt(t) saflığı
npm run video -- how-stars-die      # MP4 + .srt + bölümler
npm run thumbnail -- how-stars-die  # 5 kapak
```

## Ölçümler (bu makine, 1600×900 ve 1280×720, headless Chrome)

| Test | Sonuç |
|---|---|
| fps (8 ağır an × 150 kare) | high 59,1 ort / en kötü an 52,9 · mid 60,2 · low 60,1 · min 60,2 · 50 ms üstü kare 0/1200 her kademede |
| Otomatik seçim | high (senkron ölçüm 25,7 ms < 27 ms bütçe) |
| Gerçek zamanlı oynatma | geri adım 0, ses–görüntü farkı en çok 25 ms, konsol hatası 0 |
| Bölüm sonları (1,25×) | 10/10 geçti, geri adım 0 |
| CC / anlatım | kapanıyor, 8 sn boyunca altyazı yok, kayıtlar sessiz, seçim hatırlanıyor |
| `verify` | 3/3 temiz, `tier=high` temiz |
| Video denemesi 60–75 sn | görüntü + ses akışı, ortalama −18,8 dB, `.srt` ve bölüm listesi doğru |

## Bilinen kısıtlar

- Bu makinede tarayıcının tam dosya indirmeleri (`fetch` ile tam ikili yanıtlar) sistem düzeyinde bir denetimle engelleniyor (yanıt 204, gövde boş; Chrome ve Edge'de aynı, Node'da yok). Video modu anlatımı `<audio>` öğesinin kullandığı standart aralıklı isteğiyle (`Range: bytes=0-`) alıyor; bu istek geçiyor. Ayrıntı: `.claude/skills/animation/pitfalls.md`.
- İç katman kalınlıkları ölçeksiz şemadır (ekranda "ölçeksiz şema" notu var).
