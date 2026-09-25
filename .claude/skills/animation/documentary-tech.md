# Belgesel tekniği (yeniden kullanılabilir)

> Üretim aşamasında okunur (SKILL.md → Aşama 4). Treatment aşamasında okunmaz: görünüm kararları oradan önce, konudan çıkarak verilir.

Depoda görsel stil animasyondan animasyona değişir; ama **belgesel türünün tekniği** (kamera dili, oynatıcı, zamanlama, ses, kalite kademeleri) ortaktır ve yeni belgesellerde yeniden kullanılır. Referans uygulama: `animations/documentary/ant-documentary/`. Yeni bir belgesel yaparken bu klasörü **okumak ve teknik modüllerini kopyalamak serbesttir**; kopyalanmaması gereken şey görsel dünyanın kendisidir (karınca, toprak, renk paleti, yazı tipleri, sahne düzeni). Bu, `CLAUDE.md` "sıfırdan tasarla" kuralının belgesel türü için tanımlı istisnasıdır.

## Neyi kopyala, neyi yeniden tasarla

| Modül | Dosya | Kopyala? | Not |
|---|---|---|---|
| Oynatıcı ve saat (kayıt izleyen hikâye zamanı, bölüm sonu davranışı, atlama, CC/N düğmeleri, hatırlanan seçimler) | `src/main.js` | **Evet** | Tuzakları çözülmüş; yeniden yazma. |
| Zaman çizelgesi ve kelime ipuçları (`cues`, `pre`/`post` sessizlikler) | `src/timeline.js`, `src/script.js` yapısı | **Evet** | Metin ve ipuçları konuya göre yeniden yazılır. |
| Altyazı (iki satır, kelime kelime açılma) | `src/subs.js` | **Evet** | Yazı tipi ve renk animasyona göre. |
| Sinema hattı: HDRI ışık, temasta sertleşen gölge, alan derinliği, bloom, ACES, gren, kademeli kalite (`setTier`) | `src/env.js` | **Evet** | Güneşin yönü, renk eğrileri, pozlama konuya göre ayarlanır; HDRI konuya uygun seçilir (Poly Haven, CC0). |
| Lens katmanı (bokeh diskleri) | `src/vision.js` → `createLens` | Evet | Temas gölgesi kapalı bırakılmalı (leke yapıyor). |
| Belgesel kamera dili: uzun objektif dönüşümü, el titremesi, `shots()` sıralayıcı, `chase()`/`orbit()` | `src/director.js` üst kısmı | **Evet** (yardımcılar) | Çekimlerin kendisi konuya göre kurulur. |
| Ses dünyası (rüzgâr, kuş, yaylı doku, efektler, anlatımda kısılma; hem canlı hem `OfflineAudioContext`) | `src/sound.js` | Evet, ama sesler konuya göre yeniden tasarlanır | Yeni ortam yeni ses ister (deniz, orman, kovan…). |
| Etiket ve ölçek çubuğu katmanı | `src/overlay.js`, `src/style.css` | Evet | Yazı tipi ve renkler yeniden seçilir. |
| Prosedürel doku ve loft/kıl geometri araçları | `src/textures.js`, `src/geom.js` | Evet (araç) | Yeni canlı yeni geometri ister; araçlar aynı kalabilir. |
| Karınca, toprak, çim, yuva, laboratuvar | `src/ant.js`, `world.js`, `nest.js`, `lab.js`, `critters.js` | **Hayır** | Yalnızca yöntem örneği olarak oku (spline loft, tripod yürüyüş, IK, yüzeye oturtma). |
| Geliştirme testleri (temas sayfası, oynatma, bölüm sonu, kare maliyeti, gerçek fps, poster) | `dev/*.mjs` | **Evet** | Port numarasını değiştir. |
| Yerleşim denetimi (gerçek DOM kutularından yazı×yazı, yazı×altyazı, kenar payı) ve başlık kontrast ölçümü | `honeybee-day/dev/layout-check.mjs`, `dev/contrast.mjs` | **Evet** | Etiket katmanı `claim/placeFree` kaydıyla yazılmalı (`honeybee-day/src/overlay.js` referans). |

## Yeni belgeselde sırayla

1. Konunun canlısı ve ortamı için `RESEARCH.md`; `narration` skillinin belgesel dosyasıyla `NARRATION.md` ve `src/script.js`.
2. `env.js`'yi kopyala; ışık yönünü, HDRI'ı ve renk eğrilerini ortama göre değiştir (gece ormanı, deniz altı, kovan içi hepsi başka ışık ister).
3. Canlıyı `geom.js` araçlarıyla sıfırdan modelle; gerçek ölçek (1 birim = 1 mm ya da 1 cm) ve doğru anatomi. Yürüyüş/uçuş/yüzüş hareketini zamanın saf fonksiyonu olarak kur.
4. Ortamı bölgelere ayır (kum taneleri gibi binlerce küçük nesne için `chunk` düzeni), böylece kamera görmediğini çizmez.
5. `director.js`'deki yardımcılarla bölüm bölüm çekimleri kur: uzun objektif, yavaş kaydırma, sabit kadraj, seyrek odak kaydırma; her olay bir `cue` kelimesine bağlı.
6. Kalite kademelerini ve otomatik seçiciyi koru; `dev/fpstest.mjs` ile her kademede fps ölç (bkz. `craft.md` → Performans).
7. Ses dünyasını ortama göre yeniden yaz.
