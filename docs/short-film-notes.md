# Kısa film notları: "KOR" incelemesi

Kaynak: X, @FornYapayZeka, 23 Eylül 2026 (https://x.com/FornYapayZeka/status/2102868722998501654). Opus 5.5'e verilen brief ve çıkan 40 saniyelik sözsüz kısa film. Video 1920×1080, 40,5 sn; ilk karede altta bir ilerleme çubuğu görünüyor: tarayıcıda çalışan, kodla yazılmış bir sahnenin kaydı (bizimkiyle aynı yöntem). Sesi doğrulamadım.

## Verilen brief (birebir)

> Yapabileceğin en etkileyici kısa kod animasyonunu üret. Hikâye, karakter, görsel dil ve süreyi sen seç. Sözsüz izleyen biri başlangıç, değişim ve sonucu anlayabilsin; güçlü bir doruk anı olsun. Hareketli slayt gösterisi yerine sahneleme, zamanlama ve karakter/nesne davranışı olan bitmiş bir kısa film istiyorum.
>
> Yaratıcı seçimler senin: sahne, sanat yönü, kamera, mekanik, teknoloji ve etkileşimi önceden belirlenmiş sıradan kalıplara sıkıştırma. İlk akla gelen sıradan web demosuyla yetinme: önce kendi alanında birkaç fikri kısaca tart, videoda en güçlü görünecek özgün olanı seç, sonra onu çalışan bir ürüne dönüştür. Konuyu olduğundan kolay gösteren dekoratif taklit kabul edilmez. Sinematik ve estetik seçimler sonuçta görülsün.

Brief'in işe yarayan parçaları:
1. **Ölçüt veriyor, çözüm vermiyor:** "sözsüz anlaşılsın", "doruk anı olsun", "slayt değil film". Ne yapılacağını değil, neyin başarı sayılacağını söylüyor.
2. **İlk fikri yasaklıyor:** "birkaç fikri tart, videoda en güçlü görüneni seç". Bu tek cümle sonucu en çok değiştiren şey.
3. **Taklidi yasaklıyor:** "dekoratif taklit kabul edilmez"; yani parlak ama boş sahne olmaz.
4. **Özgürlük veriyor:** süre, karakter, teknoloji serbest. Kapsam küçük tutulmuş (tek fikir), bu yüzden özen sığmış.

## Filmde ne var

| Zaman | Ne oluyor | Neden işe yarıyor |
|---|---|---|
| 0–10 sn | Karlı gece, rüzgâr, çıplak ağaç. Yuvarlak, atkılı bir yaratık ağaca doğru yürüyor; ağaçta tek bir küçük ışık. | Durum tek karede okunuyor: soğuk, karanlık, tek umut. Alçak açı, arkadan ışık, kar parçacıkları. |
| 10–18 sn | Yakın plan: yaratık ışığa bakıyor, tereddüt, uzanıyor. | Karakter davranışı: bakış, duraksama. Kamera karakterin arkasından, omuz üstü. |
| 18–24 sn | Dokunuş: ışık ağaçtan köklere, oradan bütün ovaya damar gibi yayılıyor. | **Doruk anı** (~%55–60): bir dönüşüm mekaniği (ışığın yayılması), geniş plan, bloom tam güç. |
| 24–36 sn | Gökyüzü altına dönüyor; ağaçlar yeşeriyor; yaratık geniş ovada ışığın içinde duruyor. | İki durumlu palet: mavi-gri → altın. Sonuç geniş planla veriliyor. |
| 36–40 sn | Siyah, "K O R" başlık kartı, "yeniden" düğmesi. | Kısa, sessiz kapanış; ad anlamı sonradan veriyor (kor = köz). |

Görsel kararlar: karakter küre + iki kulak + atkı (yalnızca ikincil hareket için); ağız yok. Dağ siluetleri, çıplak ağaçlar, kar/parçacık sistemi, hacimsel ışık, gren. Kamera dönmüyor; 8–10 kesme.

## Bizim için çıkarımlar

- Bu tür bir işi vermek için ayrı bir giriş kapısı gerekiyordu: `/short` skilli (`.claude/skills/short/SKILL.md`). `/animation` her zaman eğitim anlatımına gider; kısa film başka bir sözleşmedir.
- Brief yazarken: ölçüt ver, çözüm verme; "ilk fikri seçme, birkaçını tart" ve "dekoratif taklit yok" cümlelerini koy; kapsamı tek fikirle sınırla.
- Teknik olarak yeni bir şey gerekmiyor: belgesel sinema hattı (ışık, alan derinliği, gren, kalite kademeleri), Web Audio ses, `render-video` sözleşmesi aynen kullanılır. Fark, hikâye disiplininde ve karakter davranışında.
