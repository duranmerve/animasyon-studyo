# İstanbul'un Fethi (1453)

Bin yıllık surlar elli üç günde nasıl aşıldı? Bu animasyon, 1453 kuşatmasını canlanan bir minyatür harita üzerinde anlatıyor. Harita, Matrakçı Nasuh'un İstanbul minyatürlerinin dünyasından esinlenir ve kıyıları gerçek enlem-boylamlardan çizilmiştir. Kamera anlatıcının söylediği yere gider; kesitler ve ölçek karşılaştırmaları haritanın üstünde altın çerçeveli "levhalar" olarak açılır.

Hedef kitle lise öğrencileri (9–10. sınıf tarih) ve genel izleyicidir. Süre yaklaşık 7,5 dakikadır. Sesli anlatım ve kelime kelime açılan altyazı vardır; ikisi ayrı ayrı açılıp kapatılabilir.

## Bölümler

| # | Bölüm | Ne anlatıyor |
|---|---|---|
| 1 | Bir Soru | Mürekkeple çizilen şehir. Surları zorla aşan tek ordu 1204'teki Haçlılardı, o da Haliç tarafından. Merak sorusu burada sorulur. |
| 2 | Konstantinopolis | 330'da başkent olur. Halk kendini Romalı sayar, "Bizans" adı sonradan çıkmıştır. 1453'te nüfus 50 binin altına düşmüş, surların içinde tarlalar vardır. |
| 3 | Kara Surları | 5,7 km'lik surlar ve kesit levhası: hendek, dış sur, iç sur, 96 kule ve ölçek için bir insan. |
| 4 | Genç Padişah | II. Mehmed ve Rumeli ile Anadolu'yu gösteren bölge levhası: şehir iki yakanın tam ortasındadır. |
| 5 | Boğazkesen | Rumeli Hisarı'nın yükselişi, Boğaz'ın en dar yeri (~660 m) ve iki kıyıdan çapraz atış. |
| 6 | Dev Top | Urban'ın topu ölçekli çizilir (≈8 m), yanında 60 öküz. "Top ilk kez 1453'te kullanıldı" yanlışı burada düzeltilir. |
| 7 | Kuşatma Başlıyor | 6 Nisan: ordu dizilir, otağ kurulur. Kuşatan ve savunan sayıları karşılaştırılır, topların atış ritmi ve gece onarımları gösterilir. |
| 8 | Haliç'teki Zincir | Zincir halka halka gerilir. 20 Nisan'da dört yüksek bordalı gemi ablukayı yarar. |
| 9 | Karadan Yürüyen Gemiler | Gece fenerli gemiler Dolmabahçe'den tepeyi aşar; yanda tepenin kesiti görülür. Şafakta Haliç yetmiş gemiyle dolmuştur, zincir ise hiç kırılmamıştır. |
| 10 | Uzun Mayıs | Tüneller ve karşı tüneller, Lykos vadisindeki gedikler, 22 Mayıs ay tutulması. |
| 11 | Son Saldırı | 29 Mayıs: üç dalga saldırı, Giustiniani'nin yaralanması, gedikten içeri akan birlikler ve surlardaki sancaklar. |
| 12 | Şehre Giriş | Ayasofya'ya uzanan yol, cami ve ilk cuma namazı, yağma, yeniden iskân, patrikhane ve yeni başkent. |
| 13 | Bir Çağın Sonu | 330'dan 1453'e zaman şeridi, Kayser-i Rum, Fatih ve Orta Çağ ile Yeni Çağ ayrımı. "Surlar yerle bir edildi" yanlışı düzeltilir. |
| 14 | Elli Üç Gün | Dört adımlık özet haritanın üzerinde toplanır ve şehrin adı İstanbul olur. |

Kaynaklar ve doğrulanan bilgiler `RESEARCH.md` dosyasında, tasarım kararları `DESIGN.md` dosyasındadır.

## Teknik

- Canvas 2D ve düz ES modülleri kullanılır; paket ya da derleyici yoktur. Bütün görseller kodla çizilir: kıyılar (`src/geo.js`), minyatür harita (`src/paint.js`), bölümlerin olayları ve levhaları (`src/scenes.js`).
- Sahne durumu zamanın saf bir fonksiyonudur. Kalıcı değişiklikler (ordu, gemiler, gedikler, sancaklar) `worldState(T)` içinde bölüm bölüm hesaplanır, bu yüzden her ana atlanabilir.
- Anlatım `src/story.js` dosyasındadır. `{ekranda|söylenen}` işaretiyle ekrandaki metin ile okunuş ayrılır. `@olay` işaretleri sahne olaylarını kayıttaki kelime zamanlarına bağlar (`src/text.js`).
- Oynatırken saat kayıttır. Hikâye zamanı sesi izler, hiç geri gitmez, kayıt yüklenirken bekler. Bir kayıt gelmezse ya da bozuksa 6 saniye sonra sessiz devam eder.
- Altyazı en çok iki satırdır ve kelimeler anlatıcı söyledikçe açılır. Kısayollar: C altyazı, N anlatım, boşluk oynat, ← → bölüm, F tam ekran. Ayarlarda altyazı boyutu, hız ve efekt sesleri değiştirilebilir; seçimler hatırlanır.
- Efekt sesleri (top, zincir, kös, çan, gıcırtı) Web Audio ile üretilir ve anlatım sırasında kısılır.

## Komutlar

```
node tools/lines.mjs                               # story.js → narration/lines.json (söylenecek metin)
npm run voice -- fall-of-constantinople            # depo kökünde: kayıtlar (O33, hız 0.9) + Whisper kelime zamanları
node build.mjs                                     # dist/ (sayfa, modüller, kayıtlar, narration.json)
npm run build -- fall-of-constantinople            # depo kökünde: siteye ekler
node tools/shoot.mjs <klasör> siege:@fire+2 walls:12 [--phone|--desktop]   # ekran görüntüleri
node tools/playtest.mjs sultan 70                  # gerçek zamanlı oynatma testi (yapay takılmalarla)
```

Sayfa parametreleri: `?ch=<bölüm>&t=<sn>` bir andan başlatır, `?autoplay=1` başlat düğmesini atlar, `?shot=1` başlangıç kartını gizler, `?poster=1` arayüzü gizler.

Video henüz üretilmedi. Sahne durumu zamanın fonksiyonu olduğu için `window.__video` sözleşmesi sonradan eklenebilir.
