# Yazıcının İçinde

Renkli, çok işlevli bir lazer yazıcının yan tarafı kesilip açılmış 3D modeli. Bir okul gazetesi sayfası bilgisayardan yazıcıya gidiyor, dört renkte basılıyor, sonra tarayıcıda taranıp siyah-beyaz fotokopisi çekiliyor. Son olarak orijinal ile kopyaları ve kopyaların kopyalarını büyüteçle karşılaştırıyoruz. Yaklaşık 7 dakika, 16 bölüm. Sonunda serbest keşif modu açılıyor: sahne döndürülebiliyor, sayfaların üzerinde gezinen büyüteçle farklar incelenebiliyor.

## Anlattıkları

| # | Bölüm | İçerik |
|---|---|---|
| 1 | Kesit | Yazıcının bölümleri: tarayıcı, lazer ünitesi, kartuşlar, fırın, tepsiler |
| 2 | Ekrandan yazıcıya | Dizüstünde "Yazdır", veri paketleri kabloyla yazıcıya gider |
| 3 | Sayfa noktalara bölünür | İşlemci kartı, 600 dpi ≈ 35 milyon nokta, yarım ton, CMYK ayrımı |
| 4 | Kâğıt yola çıkar | Alma makarası (D biçimli), ayırma pedi, kıvrık yol, hizalama makaraları |
| 5 | Tambur yüklenir | Işığa duyarlı tambur, şarj silindiri, yaklaşık −600 V |
| 6 | Lazer görüntüyü çizer | Lazer diyotu, çokgen ayna, yönlendirme aynaları, gizli görüntü, ayna görüntüsü, kızılötesi notu |
| 7 | Toner yapışır | Toner taneleri (5–10 µm), geliştirme silindiri, yüklerin itmesi ve çekmesi |
| 8 | Kâğıda aktarılır | Aktarım silindiri (+), sarı → macenta → camgöbeği → siyah katmanları |
| 9 | Tambur temizlenir | Temizleme bıçağı, atık toner, bir sayfada 3 turdan fazla dönen tambur |
| 10 | Fırında erir | 180–200 °C ısıtma silindiri, baskı silindiri, liflere eriyen toner |
| 11 | Çıktı | Yüzü aşağı çıkış, büyüteçte dolu siyah yazı ve CMYK rozet deseni |
| 12 | Fotokopi: tarama | Cam, ışık çubuğu, tam ve yarım hızlı ayna arabaları, mercek, CCD, 0–255 değerleri |
| 13 | Kopya basılır | Aynı lazer süreci, yalnızca siyah tambur |
| 14 | Kopyada ne değişti? | Gri tonlar, hare (moiré), kaybolan açık tonlar, ince çizgiler, toz, kenar gölgesi, eğiklik |
| 15 | Kopyanın kopyası | 1., 2., 4. ve 8. kuşak kopyalar yan yana |
| 16 | Özet | Altı adım ve kserografinin kısa tarihi |

## Nasıl çalışıyor

- **Her şey kodla üretiliyor.** Yazıcı, dizüstü, masa, gazete sayfası (fotoğraf dahil), şemalar ve sesler; hiçbir görsel ya da ses dosyası yok.
- **Baskı ve fotokopi gerçekten hesaplanıyor** (`src/page/pipeline.js`, GPU üzerinde):
  1. Sayfa CMYK'ye ayrılıp dört açılı yarım ton ızgarasıyla (15°, 75°, 0°, 45°) noktalanıyor.
  2. Tarama: basılı sayfanın yansıması okunuyor. Mercek bulanıklığı, otomatik pozlama eğrisi, hafif eğiklik, kapak gölgesi, camdaki toz ve sensör gürültüsü ekleniyor.
  3. Kopya: gri görüntü farklı sıklıkta, tek renkli bir ızgarayla yeniden noktalanıyor. Hare deseni, kaybolan açık tonlar ve kalınlaşan koyular elle çizilmiyor, bu işlemden kendiliğinden çıkıyor.
  4. Kopyanın kopyası aynı işlemi tekrarlıyor (1, 2, 4 ve 8. kuşak).
- **Tambur yüzeyi durumsuz bir gölgelendiriciyle çiziliyor** (`src/scene/materials.js`): yüzeydeki her noktanın hangi sayfa satırını taşıdığı ve yüklü, pozlanmış, tonerli ya da temizlenmiş olduğu kâğıdın ilerleyişinden hesaplanıyor. Tamburdaki görüntü bu yüzden doğal olarak ters (ayna görüntüsü) çıkıyor.
- **Zaman çizelgesi:** her şey hikâye zamanının saf bir fonksiyonu (`src/story/state.js`), bu yüzden istenen ana doğrudan atlanabiliyor. Bölüm süreleri altyazıların okunma süresinden hesaplanıyor.
- **Seslendirme:** her bölüm yerel OmniVoice ile, O9 sesiyle (derin erkek anlatıcı) tek parça, kesintisiz bir kayıt olarak okunmuş (`public/voice/<bölüm>.mp3`) ve Whisper ile denetlenmiş. Altyazıların ve sahnelerin zamanı kayıttaki kelime zamanlarından hesaplanıyor; uzun cümleler sesle birlikte ilerleyen iki satırlık parçalara bölünüyor. Oynatırken kayıt saat görevi görüyor: görüntü sesi izliyor, hiç geri gitmiyor, kayıt yüklenirken bekliyor; atlama, duraklatma ve hız değişikliğinde ses ile görüntü birlikte kalıyor; anlatım sırasında makine sesleri kısılıyor.
- **Makine sesleri:** Web Audio ile sentezleniyor. Aynı kod video için bütün film sesini çevrimdışı üretiyor.

## Ayarlar

Alt çubuktaki **CC** düğmesi (ya da C tuşu) altyazıyı açıp kapatır. Dişli simgesindeki panelde sesli anlatım, altyazı, altyazı boyutu (küçük, orta, büyük), makine sesleri ve hız ayarlanır. Seçimler tarayıcıda hatırlanır. Başlangıç ekranında da anlatım ve altyazı seçilebilir.

## Kısayollar

Boşluk: oynat / duraklat · ← →: bölüm · C: altyazı · N: anlatım · M: ses · F: tam ekran

## Komutlar

```
npm install
npm run dev        # geliştirme sunucusu
npm run build      # dist/ klasörüne derler
```

### Seslendirme (altyazı metni değişince)

`src/story/script.js` içindeki altyazılar hem ekrana hem seslendirmeye gider. Söyleniş farklı olacaksa (kısaltma, parantez, yabancı ad) `src/story/spoken.js` içindeki kurala eklenir. Altyazının bölüneceği yer `|` ile elle işaretlenebilir; işaret ekranda görünmez.

```
node tools/lines.mjs                  # narration/lines.json: söylenecek satırlar
cd ../.. && npm run voice -- laser-printer   # yalnızca değişen satırları yeniden seslendirir
npm run voice -- laser-printer --voice omni-kadin-genc   # başka bir sesle
```

### YouTube videosu

Depo kökünde:

```
npm run video -- laser-printer                  # renders/laser-printer.mp4 + .srt + -chapters.txt
npm run video -- laser-printer --subs burn      # altyazısı görüntüye gömülü sürüm
npm run video -- laser-printer --from 90 --to 120   # yalnızca bir aralık (deneme için)
```

MP4 altyazısızdır; `.srt` dosyası YouTube Studio'da *Altyazılar → Dosya yükle → Zamanlamalı* ile eklenir, izleyici altyazıyı kendisi açıp kapatır. `-chapters.txt` açıklamaya yapıştırılınca YouTube bölümleri oluşur. 1080p 30 kare/sn; bu makinede yaklaşık 20 dakika sürer.

### Yerel kontroller

Sayfa parametreleri: `?ch=<bölüm>&t=<saniye>` (ör. `?ch=laser&t=20`), `ui=0` arayüzü gizler, `play=1` hemen oynatır, `cam=x,y,z,hx,hy,hz,fov` kamerayı sabitler, `video=1` video modunu açar.

```
node tools/shot.mjs <klasör> 1600x900 "ch=transfer&t=19" "ch=compare&t=14"   # ekran görüntüsü
node tools/check-player.mjs --from 80 --secs 60   # canlı oynatma: yapay takılmalarla anlatımın atlamadığını ölçer
node tools/perf-run.mjs                            # her karenin maliyeti; ilk kullanımda sıçrayan kareleri listeler
```

### Altyazı

Altyazının kelimeleri anlatıcı onları söyledikçe tek tek açılır. Her kaydın kelime zamanları Whisper ile çıkarılıp `narration/manifest.json` dosyasına yazılır (`npm run voice -- laser-printer --words-only`). Stil kutusuz: altta yumuşak bir karartma, gölgeli beyaz yazı.
