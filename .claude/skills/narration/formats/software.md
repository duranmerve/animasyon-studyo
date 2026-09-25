# Yazılım sesi (programlama ve teknolojinin içi)

Gelenek: Fireship'in hızı, ByteByteGo'nun adım adım diyagramları, Julia Evans'ın "çoğu bilgisayar konusu aslında zor değil, sadece iyi anlatılmamış" tutumu. Anlatıcı, deneyimli ve sabırlı bir mühendis arkadaştır: jargonla etkilemeye çalışmaz, makinenin içini açıp gösterir.

## Temel ilke: senaryo önce

Kavramla değil, bir olayla başla: bir istek, bir tıklama, bir hata, bir çökme. İzleyici bir paketin ya da bir değişkenin yolculuğunu izlesin.
- ✗ "Önbellek, sık erişilen verilerin daha hızlı bir depolama katmanında tutulmasıdır."
- ✓ "Ayşe ürün sayfasını açıyor. Sunucu, veritabanına aynı soruyu bu dakika içinde dört bininci kez soruyor."

## Yapı: sorun → saf fikir → neden çöker → gerçek mekanizma

1. **Somut senaryo (0–30 sn).** Bir kullanıcı, bir istek, bir sonuç. Mümkünse bir şey ters gidiyor.
2. **Sorun.** Tek cümle: "Sayfa üç saniyede açılıyor. Çok yavaş."
3. **Saf fikir.** İzleyicinin de aklına gelecek ilk çözüm: "Sonucu bir yere yazalım, bir daha sormayalım."
4. **Neden çöker.** Saf fikrin kırıldığı durum: "Fiyat değişirse? Ayşe eski fiyatı görür."
5. **Gerçek mekanizma.** Endüstrinin çözümü, adım adım. Her adım bir önceki çöküşe cevap.
6. **Bedeli.** Her çözümün bir ödünleşimi vardır; bir cümleyle söyle: "Karşılığında, bazen birkaç saniye eski veri göreceğiz."
7. **Senaryoya dönüş.** Ayşe'nin isteği artık nasıl akıyor; baştaki süre ile sondaki süre.

Bu yapı açıklayıcı türündeki "önce yanlış inanış" ilkesinin yazılımdaki karşılığıdır: saf fikir, izleyicinin kafasındaki modeldir.

## Zihinsel modeller ve durum değişimi

- Her bölümde izleyicinin kafasında tek bir resim kur: bir kuyruk, bir tablo, bir kutu ve oklar. ByteByteGo'nun gücü budur: akış, bileşenler arasındaki etkileşim görünür.
- **Durumu adım adım göster.** Bellekteki bir değer, bir kuyruğun uzunluğu, bir sayaç. Anlatım her adımda neyin değiştiğini söyler, resim değişikliği vurgular: "Sayaç bir oldu. İkinci istek geldi. Hâlâ bir." (Burada sesli okunan sayılar yazıyla.)
- Aynı anda en çok üç bileşen konuşsun. Fazlası varsa ötekileri soluklaştır.
- Zamanı yavaşlat: gerçekte milisaniyede olanı saniyelere yay ve bunu söyle: "Bunu yavaşlatalım."

## Jargon duvarından kaçınmak

- Bir cümlede en çok bir terim. Terimi önce göster, sonra adlandır: "Sunucu bu cevabı bir kenara koyuyor. Buna önbellek diyoruz, İngilizcesiyle keş."
- Yaygın Türkçe karşılığı olan terimi Türkçe söyle (istek, yanıt, önbellek, iş parçacığı, veritabanı), İngilizcesini ilk geçişte bir kez ver. Karşılığı yerleşmemiş olanı (commit, thread pool, container) İngilizce bırak ama söylenişini yaz.
- Kısaltmanın açılımını okuma; ne yaptığını söyle. "HTTP, HyperText Transfer Protocol'dür" yerine "tarayıcıyla sunucunun konuştuğu dil".
- Ekranda kod gösterebilirsin; sesle kodu okuma. Kodun ne yaptığını söyle: `if (user == null) return 401;` → "Kullanıcı yoksa kapıyı kapatıyor."

## Türkçe TTS'te kod ve İngilizce terimler

`say` alanı ekrandaki metinden ayrıdır; ekranda doğru yazım, `say` içinde söyleniş. Her yeni terimi `npm run voice` ile dinle; şüpheli listesinde çıkarsa yazımı değiştir.

| Ekranda | `say` içinde (öneri) |
|---|---|
| HTTP, API, SQL, URL | ha-te-te-pe, a-pe-i, es-kü-el, u-er-el |
| JSON, null, cache | ceysın, nal, keş |
| request, thread, commit | rikuest, tred, kamit |
| React, Docker, Spring Boot | riekt, dokır, spring but |
| GET, POST | get isteği, post isteği |
| 404, 200 OK | dört yüz dört, iki yüz, tamam |
| `=>`, `{}`, `::` | okunmaz; anlamı söylenir |
| v2.1, 16 GB, 3 ms | sürüm iki nokta bir, on altı gigabayt, üç milisaniye |

Kurallar:
- Aynı terimi video boyunca hep aynı biçimde söyle; tablo `narration/` klasöründe animasyonun kendi notu olarak tutulabilir.
- Türkçe ekleri söylenişe göre yaz: "keş'e", "tred'ler", "ceysın'ı". Ekrandaki "cache'e" ile karıştırma.
- Harf harf okunan kısaltmalarda Türkçe harf adları kullanılır (a, be, se, de…); topluluğun yerleşik okuyuşu farklıysa onu seç ve tutarlı ol.
- Sembol, tire, eğik çizgi `say` içinde hiç olmasın.

## Hız ve ton

- Yazılım izleyicisi hızlı anlatıma alışkındır; cümleler kısa, geçişler sert olabilir. Ama yeni bir mekanizma anlatılırken yavaşla.
- Hafif, kuru bir mizah işe yarar; ama bir espri bir kavramın yerini almasın.
- "Basitçe", "sadece", "herkes bilir ki" deme. Basit olmayan bir şeyi basit sanan izleyici kendini yetersiz hisseder.

## Görsel dil

Bu dosya yalnızca anlatım sesini tanımlar. Görsel tasarım uzayı `.claude/skills/animation/formats/software.md` içindedir; treatment aşamasında oradan bir nokta seçilir.

## Önce / sonra

**Önce (ders kitabı):**
> Veritabanı indeksi, tablodaki verilere daha hızlı erişim sağlayan bir veri yapısıdır. İndeksler genellikle B-ağacı yapısında tutulur. İndeks kullanıldığında sorgu performansı artar ancak yazma işlemleri yavaşlayabilir.

Sorunlar: tanımla başlıyor; kimsenin bir sorunu yok; "B-ağacı" açıklanmadan söyleniyor; ödünleşim bir yan cümleye sıkıştırılmış.

**Sonra (yazılım):**
> Ayşe arama kutusuna "mavi kupa" yazıyor. Ve bekliyor.
> Veritabanı şu an bir milyon satırı tek tek okuyor. Baştan sona.
> İlk fikir: satırları alfabetik sıralayalım. Sözlükte kelime arar gibi, ortadan başlayalım.
> Ama tablo sıralanırsa, her yeni ürün eklendiğinde bir milyon satırı yeniden dizmemiz gerekir.
> — ⟨ipucu: fihrist → tablonun yanında küçük bir liste belirir⟩ —
> O yüzden tabloya dokunmuyoruz. Yanına küçük bir fihrist yapıyoruz. Yalnızca ürün adı ve satırın yeri.
> Buna indeks diyoruz.
> Arama artık yaklaşık yirmi adımda bitiyor.
> Bedeli: her yeni ürün eklendiğinde fihrist de güncellenecek. Okuma hızlandı, yazma biraz yavaşladı.

Neler değişti: bir kullanıcı ve bir bekleme; saf fikir ve neden çöktüğü; terim göründükten sonra adlandırılıyor; ödünleşim ayrı ve açık bir cümle. (B-ağacı gerekiyorsa bir sonraki bölümün sorusu olur: "Bu fihrist nasıl yirmi adımda aranıyor?")
