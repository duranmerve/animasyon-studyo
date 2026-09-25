# Denetim: Bal Arısının Bir Günü (honeybee-day)

Denetçi: Fable 5.1, 2026-09-26. Yapan: Opus 5.5 (yeni kurallarla ilk deneme). Yöntem: `/audit` (özgünlük, hikâye ve metin, ses, akıcılık, görsel, teslim); ölçümler bu makinede (RTX 3050 Ti, headless Chrome 1600×900).

## Puanlar

| Başlık | Puan | Gerekçe |
|---|---|---|
| Özgünlük | **5/5** | Karınca belgeselinden bambaşka bir dünya: stilize ramp gölgeleme, gök baskın geniş planlar, siyah kovan + mum, tek vurgu UV moru, altıgen göz geçişi, günün saatleriyle yapı, O9 ses, Newsreader/Commissioner. Treatment'ta beş dünya gerçekten farklı; ledger karşılaştırması yazılı ve doğru. Tür kartı tarif gibi değil, uzaydan bir nokta olarak kullanılmış. |
| Hikâye ve metin | **4,5/5** | Açılış sorusu ("Bunu nasıl yapıyor?"), tek kahraman (son haftasındaki toplayıcı), cevap 8. bölümde, finalde geri çağrı. Şimdiki zaman, gözlemci ses, görüleni tekrar etmeme, sessizlikler (`pre`/`post`). Yapay zekâ kalıbı bulunamadı. 12 sayı denetlendi, hepsi `RESEARCH.md`'de; tünel deneyinin tartışmalı sayıları bilinçli olarak verilmemiş (doğru karar). Eksi: "Kovanın İçi" bölümü art arda dört olguyu yığıyor (35 derece, ısıtıcılar, altıgen, mum maliyeti); tek soru etrafında toplanabilirdi. |
| Ses | **4/5** | Tek ses (O9, 0,9), bölüm başına tek kayıt, 140 kelime/dk, Whisper farkı ≤ %3; ortam sesleri kodla (`sound.js`) ve anlatımda kısılıyor. Kayıtları dinlemedim; ölçümle değerlendirdim. |
| Akıcılık ve teknik | **4/5** | Oynatma: geri gitme 0, kayıt ortası sarma 0, ortalama ses–görüntü farkı 15 ms, hata 0. Bölüm sonları 11/11 temiz, CC/N düğmeleri doğru. Gerçek fps: otomatik seçim `high` → 40 fps (README 60–100 diyor; bende düşük çıktı), `low` 90, `min` 124; 15 sn'de 50 ms üstü 6–8 kare (bölüm/kayıt yüklenirken). Saflık testi: ilk çalıştırmada 2/9 aralıklı hata, sonraki iki çalıştırmada 0/9 → geç yüklenen bir kaynak (doku/shader) var; video render'ında tek bir yanlış kare riski. |
| Görsel | **3,5/5** | Güçlü: kovan içi (siyah zemin, mum kenar ışığı, dans halkaları), bölünmüş ekran çiçek, harita/odometre, kapaklar. Zayıf: arı modeli geniş planlarda oyuncak gibi (düz çubuk bacaklar, keskin eklemler, çiçeğe basmayan ayaklar, uçuşta gölgesiz ve "yapıştırılmış"); çayır geniş planları boş ve kontrastsız (ön plan yok, hava perspektifi zayıf); tünel sahnesi soyut damalı blok, dünyanın içinden çıkmıyor; başlık kartı soluk gökte okunmuyor; telefonda etiketler okunmayacak kadar küçük. |
| Teslim | **5/5** | README (ölçümlerle), poster, 5 kapak (kanal kimliği doğru, başlıklar güçlü), kök tablo, stil defteri girişi, COST, video denemesi, commit ve yayın. |

**Genel:** 4,3/5. Kurallar işe yaradı: özgünlük ve metin belirgin biçimde iyi; görsel taraf, özellikle canlının kendisi, hâlâ en zayıf halka.

## Ölçümler

| Test | Sonuç |
|---|---|
| `playtest` 30 sn, 33 yapay takılma | geri 0 · sarma 0 · ort. fark 15 ms · en çok 423 ms · hata 0 |
| `endtest fast` | 11/11 bölüm: yeniden başlama 0, geri 0 |
| `toggletest` | CC kapalıyken altyazı 0 kare; ses kapalıyken saat akıyor; seçim hatırlanıyor |
| `fpstest` | auto→high 40 fps (8 yavaş kare) · high 44 · low 90 · min 124 |
| `verify` (saflık) | 1. çalıştırma 2/9 HATA (t=31, t=186), 2. ve 3. çalıştırma 0/9 |

## Önce düzeltilecek 5 şey

1. **Arı modeli (yakın ve geniş planlar):** bacaklara eklem ve incelme, kıvrık tarsus, çiçeğe ve peteğe **değen** ayaklar; uçuşta çimde yumuşak temas gölgesi ve kanat hareket bulanıklığı; gövde kapsülüne segment çizgileri. Kare: `gok 7.2`, `yuk 5.4`, `hafta 7.6`.
2. **Çayır geniş planları:** ön plana odak dışı ot ve çiçek katmanı, uzak katmanlarda hava perspektifi (doygunluk düşer), gökte bulut/ışık değişimi; her geniş planda bir odak (arı ya da güneş). Kare: `cayir 6.9`, `yuk 18.2`.
3. **Okunaklılık:** başlık kartı (`safak 22.3`) soluk gök üstünde kayboluyor → koyu şerit ya da gölge; telefonda etiketler ≥ 12 px ve daha az etiket.
4. **Tünel deneyi sahnesi (`donus 18.9`):** damalı blok yerine dünyanın içinde bir tünel (şeritli iç yüzey, dışarıda çayır), deneyin özü aynı görsel dille.
5. **Saflık ve yük:** ilk render'da geç yüklenen kaynağı bul (büyük olasılıkla bölüm başına ilk çizimde shader/doku); ısınmada her bölümün her görünümünü bir kez çiz. `verify` skill'de 3 kez çalıştırılsın. `high` kademede 8 yavaş kare için eşik biraz yükseltilebilir (`mid` seçtirmek) ya da bölüm geçişinde kayıt önyüklemesi daha erken.

## Kuralların işe yaradığı ve yaramadığı yerler

- **İşe yaradı:** treatment aşaması (beş dünya, gerekçeli seçim, ledger kontrolü); tür kartı uzay olarak; anlatım skilli (soru–kahraman–cevap yapısı, sessizlikler, yapay zekâ kalıbı yok, sayılar kaynaklı, tartışmalı sayıyı vermeme); performans kademeleri ve testler; teslim listesi eksiksiz.
- **Yetmedi:** `craft.md`'de **canlı modelleme asgarisi** yok (eklemli uzuvlar, temas eden ayaklar, temas gölgesi, siluet okunurluğu) → eklenmeli. **Geniş plan kompozisyonu** kuralı yok (ön plan katmanı, hava perspektifi, odak) → tür kartına ve slop listesine "boş ufuk, ön plansız geniş plan, havada asılı canlı" eklenmeli. Erken eleştiri turu bunları yakalamamış → `critique.md`'ye "canlıyı 1:1 kırp, ayaklar yere değiyor mu?" maddesi.
- **Belirsiz:** README'deki fps sayıları benimkinden yüksek; ölçüm koşulu (pencere boyutu, headless) README'ye yazılmalı.

## Karıncayla karşılaştırma

Yan yana konunca aynı elden çıkmış gibi durmuyor: biri fotogerçekçi makro ve toprak tonları, öteki stilize, gök baskın, siyah–mum–mor. Teknik ortak (oynatıcı, altyazı, kademeler), dünya farklı. Kanal için istenen buydu.

---

# İkinci denetim (düzeltmelerden sonra, commit 017e9c2)

Bağımsız yeniden ölçüm (aynı makine, aynı araçlar):

| Test | Önce | Sonra |
|---|---|---|
| `verify` (saflık) | 1. çalıştırmada 2/9 hata | 4 çalıştırma (9+9+9+4 an) hepsi temiz |
| `fpstest` auto (`high`) | 40 fps, 15 sn'de 8 yavaş kare | **63 fps, 2 yavaş kare** (ikisi de "İzle"den sonraki ilk 3 sn) |
| `fpstest` `min` | 124 fps | 142 fps |
| `playtest` | fark 15 ms | fark 14 ms, geri 0, sarma 0, hata 0 |
| `endtest fast` | 11/11 | 11/11 |

Kare kare (denetimin işaret ettiği anlar):
1. **Arı modeli:** eklemli ve incelen bacaklar, uçuşta altına katlanmış, altında yumuşak gölge; çiçekte ayaklar taç yaprağa basıyor; karın halkalı. Oyuncak hissi büyük ölçüde gitti. Kalan: ağız parçaları basit, bacaklarda kıl yok (yapanın da not ettiği gibi).
2. **Çayır geniş planları:** ön planda odak dışı ot ve çiçek, daha yoğun çiçek, bulut gölgesi. Daha iyi; ama sis hâlâ ağır, uzak plan kontrastsız. Kısmen.
3. **Okunaklılık:** telefon etiketleri 12 px ve seyrek, iyi. Başlık kartı hâlâ soluk gök üstünde düşük kontrast (şerit fazla yumuşak). Kısmen. Yeni bulgu: "Son Hafta" bölümünde kariyer altıgenlerinin alt yazıları ("bakıcılık", "mum, petek", "bekçilik", "toplayıcılık") birbirine giriyor; yerleşim kaydı olmadığının kanıtı.
4. **Tünel:** çayırın ortasında şeritli ahşap koridor, aynı ışık ve ön plan. Dünyanın içinde; iyi.
5. **Saflık ve yük:** iki gerçek neden bulunmuş (sıfırlanmayan parıltı/halka durumu; erken "hazır" işareti) ve düzeltilmiş; ölçümler doğruluyor.

**Puan güncellemesi:** Görsel 3,5 → **4**; Akıcılık 4 → **5**. Genel **4,6/5**.

**Kalan üç şey (sonraki tur):** başlık kartı kontrastı; kariyer etiketlerinin çakışması (yerleşim kaydı); çayırda sis ve uzak plan kontrastı.

**Kurallara işlenenler:** canlı modelleme asgarisi ve geniş plan kompozisyonu (`craft.md`), "canlıyı 1:1 kırp, ayaklar değiyor mu, etiketler çakışıyor mu" (`critique.md`), `verify` ×3 ve yerleşim kaydı zorunlu (`SKILL.md`), tür kartına geniş plan kuralı.

---

# Üçüncü denetim (commit 7bda04c)

Bağımsız ölçüm: saflık 3×9 temiz; `layout-check` 3713 karede 10 759 yazı kutusu, çakışma 0 / altyazıya giren 0 / kenar payı ihlali 0; `contrast` başlık kartı 10,5:1; otomatik `high` 66–80 fps, 15 sn'de 1–2 yavaş kare (yalnızca başlangıç), `min` 142 fps; oynatma fark 14 ms, geri 0, sarma 0, hata 0; bölüm sonları 11/11.

Kareler: başlık kartı koyu şerit üstünde net (masaüstü ve telefon); kariyer altıgenlerinin adları iki sıraya ayrılmış, çakışma yok; çayırda uzak sırtlar ve çiçekler seçiliyor, ön plan katmanı duruyor, arı kadrajın odağı. Üç kusur da kapandı.

**Son puan: Görsel 4,5 · Akıcılık 5 · Özgünlük 5 · Hikâye/metin 4,5 · Ses 4 · Teslim 5 → 4,7/5.** Yayına uygun. Kalan küçük şeyler (ağız parçaları, bacak kılları, "çiçek sadakati" planında arının küçük kalması) sonraki belgesellerde `craft.md` → 14 ile kendiliğinden ele alınır.

**Kurallara katkı:** `dev/layout-check.mjs` (gerçek DOM kutularından çakışma denetimi) ve `dev/contrast.mjs` (yazı arkası zemin kontrastı) sonraki animasyonlar için referans araç; `documentary-tech.md` tablosuna eklendi.
