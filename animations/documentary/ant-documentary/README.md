# Karıncanın Gözünde Hayat · Belgesel Sürümü

Karınca animasyonunun ilk sürümünün (`ant-eye-view`, artık kaldırıldı; git geçmişinde duruyor) iki araştırmanın sonucuyla yeniden yapılmış sürümü: anlatım `.claude/skills/narration` belgesel skilliyle yeniden yazıldı (beat sheet: `NARRATION.md`), görüntü `REALISM.md` önerileriyle gerçekçileştirildi.

## İlk sürümden farkı

- **Anlatım (belgesel sesi):** şimdiki zaman ve tek bir kahraman; açılışta bir soru ("Akşam olmadan yuvaya geri dönebilecek mi?") ve yuva bölümünde cevabı; görüntünün zaten gösterdiğini söyleyen cümleler çıktı; üçten uzun sesli listeler kaldırıldı; terimler "göster, sonra adlandır" sırasıyla; bölüm başı ve sonlarında resmin konuştuğu sessizlikler. 817 → 740 kelime, anlatım 6 dk 1 sn → 5 dk 18 sn.
- **Kamera:** uzun objektif (dar açı, kamera geride, arka plan sıkışır), belli belirsiz el titremesi, iz boyunca yerden bakan tele çekim.
- **Işık:** gerçek bir çayır HDRI'ı ile ortam ışığı (Poly Haven `meadow_2`, CC0, `public/env/`), temasta sertleşen yumuşak gölgeler.
- **Çiy damlası:** ortam küpü yerine sahnenin kendisini kırar (damlanın merkezinden bir kez çizilen yansıma sondası); içinde ters dönmüş çim ve toprak görünür.
- **Karınca:** ipeksi kitin (şeffaf cila katmanında ince doku, parlama yumuşatma), dur-kalk yürüyüş, ara ara yere vuran antenler.
- **Son işleme:** keskinleştirme kapalı, renk sapması ve kenar karartması azaltıldı, bloom eşiği yükseltildi. Odak dışındaki küçük parıltılar lens gibi diske (kadraj kenarında kedi gözüne) dönüşür (`src/vision.js` → `createLens`).
- **Davranış:** koku bölümünün başında karınca ön bacağıyla antenini sıvazlayarak temizler.
- **Denenip bırakılanlar:** zamansal kenar yumuşatma (TAA) zamanda atlanan karelerde hayalet bırakıyor; ekran uzayı temas gölgesi pürüzsüz yüzeylerde leke yapıyor. İkisi de kapalı (ayrıntı: `.claude/skills/animation/pitfalls.md`).

**İzle:** https://duranmerve.github.io/animasyon-studyo/ant-documentary/

Makro bir belgesel: bir siyah bahçe karıncası (*Lasius niger*) işçisini bir gün boyunca izleyen, sesli anlatımlı ve kelime kelime altyazılı yaklaşık 7 dakikalık 3B animasyon. Dünya gerçek ölçekte kuruldu (1 birim = 1 mm): kum taneleri kaya, çim yaprakları kule, çiy damlaları su küresi gibi görünür. Kamera bir makro objektif gibi davranır: sığ alan derinliği, arkadan vuran sabah güneşi, parlayan kıllar.

## Bölümler

| # | Bölüm | Ne anlatıyor |
|---|---|---|
| I | Karıncanın Gözünde Hayat | Gözün peteklerinden geri çekilen kamera; kum taneleri kaya, çimler kule |
| II | Dev Bir Dünya | Ölçek: karınca insan boyuna büyütülse 7,5 cm'lik çim 32 m (on kat), 2 mm'lik kum tanesi 85 cm |
| III | Bir İşçinin Bedeni | İşçilerin hepsi dişi; baş, mezozoma (göğüs + karnın 1. halkası), bel (petiyol, 2. karın halkası), gaster; kitin zırh, solunum delikleri |
| IV | Bulanık Bir Mozaik | Bileşik göz, göz başına yüz kadar ommatidyum; ekran ikiye bölünür: bizim gördüğümüz ve karıncanın gördüğü mozaik |
| V | Antenlerle Görmek | 12 halkalı dirsekli anten; koku, tat, dokunma, nem, sıcaklık, titreşim; koku alma genleri; koku haritası |
| VI | Kimlik Kontrolü | Anten teması, koloni kokusu (kütiküler hidrokarbonlar), yuvadaş ve yabancı |
| VII | Görünmez Yollar | Tatlı damla, kursak, bağırsaktan gelen feromon izi, güçlenen ve bir saat içinde uçan iz |
| VIII | Lidersiz Akıl | İki köprü deneyi (Goss ve ark. 1989) gerçek bir benzetimle; kendiliğinden örgütlenme |
| IX | Küçük ama Güçlü | Tohum taşıyan karınca, kare-küp yasası (kesit ×4, hacim ×8), "araba kaldıran dev karınca" yanlışı |
| X | Küçüklerin Fiziği | Çim yaprağından ağır çekim düşüş, yağmur damlası (4–14 mg) ve karınca (~2 mg), yüzey gerilimi |
| XI | Yaprak Biti Çobanları | *Aphis fabae* kolonisi, ballı çiy, antenle okşama, uğur böceğine karşı koruma, mutualizm |
| XII | Yeraltı Şehri | Yuva kesiti: kraliçe (laboratuvar rekoru 28¾ yıl), yumurta, larva, koza (yanlış bilinen "karınca yumurtası"), yaşa göre iş bölümü, trofalaksi |
| XIII | Ayağımızın Altındaki Dünya | Özet, açılış sorusunun yanıtı, yaklaşık yirmi katrilyon karınca |

Bilgilerin kaynakları `RESEARCH.md`, tasarım kararları `DESIGN.md` dosyasında.

## Teknik

- **Babylon.js 9** (fiziksel tabanlı malzemeler): kitin için şeffaf cila katmanı ve mikro doku, bacak ve çimlerde yarı saydamlık, çiy ve şurupta kırılma, koddan üretilen ortam ışığı.
- **Sinema son işleme:** alan derinliği (bulanıklık odak uzaklığına göre, "makro" ayarıyla), bloom, ACES ton eşleme, renk eğrileri, kararma, film greni, hafif renk sapması; gölge haritası kameranın baktığı yere oturtulur.
- **Karınca koddan modellendi** (`src/ant.js`): baş, bileşik gözler, 12 halkalı dirsekli antenler, mezozoma, tek pullu bel, bantlı gaster, 6 bacak (koksa, femur, tibya, 5 parçalı tarsus), kıllar. Bacaklar yürüyüş mesafesinden hesaplanan üçlü destek yürüyüşü (tripod gait) ve iki kemikli ters kinematikle yere basar; yüzey düz zemin, bitki sapı, çim yaprağı ya da yuva odası olabilir. Parçalar örneklenir (instancing), onlarca karınca aynı çizim maliyetiyle çizilir.
- **Öteki canlılar ve yerler:** yaprak biti, uğur böceği, tohum, bitki, yumurta, larva, koza (`src/critters.js`); yuva kesiti (`src/nest.js`); iki köprü deneyi, açılışta bir kez çalışan sabit tohumlu bir benzetim (`src/lab.js`).
- **Görme:** bileşik göz mozaiği ve koku görüşü birer son işleme / parçacık katmanı (`src/vision.js`).
- **Zamanlama:** bölüm süresi kayıttan gelir; sahne olayları anlatımdaki kelimelere bağlıdır (`src/script.js` → `cues`, `src/timeline.js`). Sahne durumu zamanın saf fonksiyonudur (`src/director.js`).
- **Ses:** anlatım O33 (OmniVoice, yaşlı ve çok derin erkek sesi), bölüm başına tek kayıt; rüzgâr, kuşlar, yaylı dokusu ve efektler Web Audio ile üretilir, anlatım sırasında kısılır (`src/sound.js`).
- **Oynatıcı:** oynat/duraklat, bölüm atlama, bölüm işaretli ilerleme çubuğu, hız, altyazı (C), anlatım (N), altyazı boyutu, tam ekran (F), klavye (boşluk, oklar). Seçimler hatırlanır.

## Performans ve kalite kademeleri

Görüntü kalitesi çalışma anında beş kademe arasında değişir (`src/env.js` → `setTier`): `ultra` (yalnızca video), `high`, `mid`, `low`, `min`. Sayfa açılırken üç ağır an her kademede ölçülür ve bütçenin altındaki ilk kademe seçilir; oynatma sırasında kareler 2,5 saniye boyunca yavaş kalırsa bir kademe düşülür. `?tier=high` gibi bir parametre seçimi sabitler. Bu makinede (RTX 3050 Ti, 1600×900) gerçek oynatma: high ~27 fps, mid ~39, low ~40, min ~70; otomatik seçim mid/low. Kum taneleri ve toprak topakları 6×6 bölgeye ayrılmıştır; kamera görmediği bölgeyi çizmez.

## Komutlar

```
npm install                          # bu klasörde, bir kez
npm run dev                          # geliştirme sunucusu
npm run build                        # dist/ (sitenin derlediği çıktı)
npm run lines                        # src/script.js → narration/lines.json
```

Depo kökünde:

```
npm run voice -- ant-documentary        # anlatımı üretir (yalnızca değişen bölümler)
npm run build -- ant-documentary        # siteye derler
npm run video -- ant-documentary        # YouTube için MP4 + SRT + bölüm listesi (?video=1 arayüzü)
```

Geliştirme araçları (`dev/`, geliştirme sunucusu 127.0.0.1:5200 üzerinde açıkken):

```
node dev/sheet.mjs <çıktı.jpg> 1600 900 [bölüm…]   # bölümlerden kareler, temas sayfası
node dev/playtest.mjs 40 0                         # gerçek zamanlı oynatma testi (geri gitme, sarma, ses–görüntü farkı)
node dev/toggletest.mjs                            # CC ve anlatım düğmeleri
node dev/endtest.mjs fast                          # her bölüm sonu: kayıt başa dönmüyor, görüntü donmuyor
node dev/perftest.mjs 2 "tier=low"                 # kare maliyeti, bölüm bölüm (update / render / GPU / DOM)
node dev/fpstest.mjs "tier=low" 20 30              # gerçek oynatma fps'i; boş parametre otomatik seçimi gösterir
node dev/poster.mjs fizik sip 1.5                  # poster.jpg
```

Kaliteyi elle seçmek için adrese `?q=low` ya da `?q=high` eklenebilir (telefonda kendiliğinden düşük kalite).
