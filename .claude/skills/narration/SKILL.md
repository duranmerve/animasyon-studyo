---
name: narration
description: Video türüne göre anlatım metni yazar (belgesel, açıklayıcı, yazılım, tarih, çocuklar için); yeni bir animasyonun anlatımı yazılırken ya da "ders kitabı okunuyor gibi" duran bir metin elden geçirilirken kullanılır.
---

# Anlatım metni yazma

Amaç: izleyicinin kulağına yazılmış, resimle birlikte çalışan, merak uyandırıp sonunda karşılığını veren bir anlatım. Ders kitabı cümlesi değil, bir insanın anlattığı hikâye.

Bu klasördeki dosyalar:
- `retention.md`: türden bağımsız, izleyiciyi tutma teknikleri (kanca, açık döngü, ritim, bölüm sonları, final).
- `formats/*.md`: her video türünün kendi sesi, yapısı ve önce/sonra örneği.
- `sources.md`: kuralların dayandığı kaynaklar.

## 1. Türü seç

| Tür | Ne zaman | Dosya |
|---|---|---|
| Belgesel | Doğa, hayvanlar, bir canlının/ortamın içinden bakış; izleyicinin hayret etmesi amaç | `formats/documentary.md` |
| Açıklayıcı | Bilim ya da genel bir "nasıl/neden" sorusu; sezgi kurmak, yanlış bir inancı düzeltmek | `formats/explainer.md` |
| Yazılım | Bir teknolojinin içi, protokol, çerçeve, algoritma; hedef kitle kod yazan ya da yazmayı öğrenen biri | `formats/software.md` |
| Tarih | Olaylar, kişiler, dönemler; zaman içinde ilerleyen bir anlatı | `formats/history.md` |
| Çocuklar | Yaklaşık 8–12 yaş; dil ve tempo her şeyden önce gelir | `formats/kids.md` |

Karışık konularda ana türü seç, diğerinden en çok iki teknik al. Örnek: "Karıncalar nasıl yol bulur?" belgeseldir ama feromon izinin mantığını anlatırken açıklayıcının "saf fikir → neden yetmez" adımını kullanabilir. Hedef kitle çocuksa `kids.md` kuralları her zaman üstte kalır.

## 2. Kulak için Türkçe: evrensel kurallar

Bu kurallar her türde geçerlidir; tür dosyaları bunların üstüne ekler.

1. **Kulak için yaz.** İzleyici geri dönüp okuyamaz. Her cümle bir kerede anlaşılmalı. Sesli okuyunca tökezlediğin yer, TTS'in de tökezleyeceği yerdir.
2. **Cümle uzunluğu 8–20 kelime.** Türkçe kelimeler eklerle uzadığı için çoğu cümleyi 8–14 kelimede tut; 20'yi geçen cümleyi böl. Ara sıra 3–5 kelimelik kısa cümle ritmi kırar ("Ve iz kaybolur.").
3. **Bir cümle, bir fikir.** "…ve …, ayrıca …" zinciri gördüğünde iki cümleye ayır. Yan cümleleri (-dığı, -en, -ken) üst üste yığma; bir sıfat-fiil yeter.
4. **Özne ve eylem erken gelsin.** Türkçede fiil sondadır; bu yüzden özneden fiile giden yol kısa olmalı. Uzun ön ekli tamlamalarla başlama ("Yuvanın kuzeydoğusunda, sabah güneşinin ilk ışıklarının düştüğü…"). Sahneyi ayrı kısa cümleyle kur.
5. **Etken çatı.** "Yaprak işçiler tarafından taşınır" değil, "İşçiler yaprağı taşır". Edilgen çatı enerjiyi söndürür.
6. **Somut, sonra soyut.** Önce bir karınca, bir istek, bir asker; sonra genel kural. Tanımla başlama; tanım varış noktasıdır.
7. **Göster, sonra adlandır.** Önce izleyici olayı görsün ve anlasın, adını en son koy: "Yere bir iz bırakıyor. Kokulu bir iz… Bilim insanları buna feromon der." Terimi önce söyleyip sonra açıklamak ders kitabı düzenidir.
8. **Sayılar sözcükle.** `lines.json` → `say` alanında rakam, sembol, kısaltma olmaz: "1.200" → "bin iki yüz", "%40" → "yüzde kırk", "2 mm" → "iki milimetre", "MÖ 331" → "milattan önce üç yüz otuz bir". Büyük sayıyı yuvarla ve karşılaştırmaya çevir ("yaklaşık bin iki yüz" ya da "bir futbol sahasını dolduracak kadar"). Bir cümlede en çok bir sayı. Ekrandaki metin (altyazı, etiket) rakamlı kalabilir.
9. **Parantez yok.** Parantez kulakta duyulmaz. İçindekini ayrı cümle yap ya da at.
10. **Liste okuma yok.** "A, B, C, D ve E" diye sayma. En fazla üç öğe; fazlası varsa ekranda göster, sesle birini seç ve anlat.
11. **Kısaltmaları söylenişe çevir.** "DNA" → "de-en-a", "HTTP" → "ha-te-te-pe", "vb." → "ve benzeri". Ayrıntı `formats/software.md` içinde.
12. **Görüleni söyleme, görülmeyeni söyle.** Ekranda karınca yürüyorsa "Karınca yürüyor" deme. Neden yürüdüğünü, nereye gittiğini, ne bilmediğini söyle.
13. **Konuşma dili, sohbet tonu.** "Siz"/"biz" kullanmak öğrenmeyi artırır (Mayer'in kişiselleştirme ilkesi). Yine de laubali değil; öğretmen değil, anlatıcı.
14. **Altyazıyla yarışma.** Ekrana anlatımla aynı uzun cümleyi yazma (fazlalık ilkesi). Ekrandaki metin etiket, sayı ya da tek bir anahtar sözcük olsun.

## 2b. Yapay zekâ gibi okunmamak

İzleyici "bunu makine yazmış" hissederse güven biter. Kalıpları sesli okumada yakala ve sil:

- **Davet kalıpları:** "Gelin birlikte keşfedelim", "Hazır mısınız?", "Bu yolculukta…", "Şimdi daha yakından bakalım". Belgeselde anlatıcı davet etmez, gösterir.
- **Boş vurgu:** "önemli bir rol oynar", "kritik öneme sahip", "büyüleyici", "inanılmaz", "muhteşem". Etkileyici olan gerçeği söyle, sıfatı izleyici koysun.
- **Üçlü sıralamalar ve simetrik cümleler:** "hızlı, güçlü ve dayanıklı" gibi ritmik üçlemeler her paragrafta tekrarlanınca makine sesi verir. En çok bir tane, gerekirse.
- **Her cümlede benzetme:** "tıpkı … gibi" zinciri. Videoda tek ana benzetme, birkaç küçük.
- **Özetleyen kapanış cümleleri:** "Kısacası…", "Sonuç olarak…", "Görüldüğü gibi…". Bölüm, bir görüntüyle ya da yeni bir soruyla biter; özet yalnızca finalde.
- **Ders kitabı tanımları:** "X, Y'nin Z'sidir" ile başlayan cümle. Önce olay, sonra ad.
- **Tekdüze cümle uzunluğu:** hepsi 12 kelime. Kısa–uzun–kısa; ara sıra üç kelimelik cümle.
- **Aşırı kesinlik ya da aşırı yumuşatma:** her cümlede "olabilir" ya da her cümlede "kesinlikle" değil; bilinen düz, tartışmalı ölçülü.
- **Ses kontrolü:** metni bir insana, sohbet ederken söyler miydin? Söylemezdin ise yeniden yaz.

## 3. Yazma süreci

Adımları atlamadan, sırayla uygula.

1. **Araştırma notları.** Kaynaklardan madde madde, her maddenin yanında kaynağıyla. Burada liste serbesttir; metinde değil. Ayrıca "şaşırtan şeyler" ve "yaygın yanlış inanışlar" diye iki ayrı liste tut; kanca ve sürprizler buradan çıkar.
2. **Tek cümlelik çekirdek.** Videonun söylediği tek şeyi yaz: "Tek bir karınca pek az şey bilir; ama koloni, binlerce küçük koku izi sayesinde yolu birlikte bulur." Her bölüm bu cümleye hizmet etmeli. Hizmet etmeyen bilgi, ne kadar ilginç olursa olsun, çıkar.
3. **Bölüm başına beat sheet.** Her satır üç sütun: **resim** (ekranda ne var) · **cümle** (anlatıcı ne diyor ya da susuyor) · **duygu** (izleyici ne hissetmeli: merak, gerilim, rahatlama, hayret, "aha"). Her bölümün bir sorusu ve bir ödülü olsun. Sessiz beat'leri de yaz ("— sessizlik, 3 sn —").
4. **Taslak.** Türün dosyasındaki sesle yaz. `retention.md` içindeki kanca ve açık döngüleri yerleştir.
5. **Sesli oku ve süre ölç.** Metni yüksek sesle oku ya da TTS'e okut. Depodaki kayıtlardan ölçülen gerçek hız (Whisper kelime sayısı / süre): O33 hız 0,9 → dakikada ~135 kelime; O9 0,88–0,95 → ~135–145; O1 0,92 → ~140–150. Süreyi buna göre tahmin et (ör. 25 saniyelik bölüm ≈ 55–60 kelime), ama resmin nefes alacağı sessizlikleri ayrıca ekle: belgeselde bölümün %15–25'i konuşmasız geçebilir. Gerçek süreyi `narration/manifest.json`'dan oku.
6. **Yüzde 20 kes.** İlk taslak her zaman uzundur. Aynı şeyi iki kez söyleyen cümleleri, resmin zaten gösterdiğini anlatan cümleleri, "aslında", "oldukça", "çok önemli bir" gibi dolguları sil. Kestikten sonra bir kez daha sesli oku.
7. **Sahne ipuçlarını işaretle.** Sahne olayları Whisper kelime zamanlarına bağlanır. Animasyonun metin dosyasında her bölümün `cues` alanı olay adını, yazılı metindeki bir ifadenin başlangıcına bağlar: `cues: { queen: 'Kraliçe burada' }`. İfade bölümde **bir kez geçmeli ve belirgin olmalı**; olay, anlatıcı o ifadeye geldiği anda başlar. Olayı cümlenin sonuna değil, ilgili kelimeye bağla. "Bu", "şimdi", "burada" gibi sık kelimelerle başlayan kısa ifadeleri ipucu yapma. Beat sheet'te `⟨ipucu: Kraliçe burada → kraliçe görünür⟩` diye işaretle.
8. **TTS kontrolü.** `npm run voice -- <slug>` sonunda listelenen şüpheli cümleleri düzelt: genelde bir kısaltma, yabancı kelime ya da okunamayan bir sayıdır.

### Beat sheet örneği

```
Bölüm 2 — "İz" · soru: Yiyeceği bulan tek işçi, yüzlerce işçiyi oraya nasıl götürür? · ödül: feromon izi
| resim                                   | cümle                                                   | duygu      |
|-----------------------------------------|---------------------------------------------------------|------------|
| işçi bir tohum buluyor, yakın plan      | "Bir tohum. Tek başına taşıyamayacağı kadar büyük."      | merak      |
| işçi yuvaya dönüyor, karnı yere değiyor  | "Dönüş yolunda, karnını yere sürtüyor."                  | merak      |
| — sessizlik, 3 sn: yol boyunca hiçbir şey görünmüyor —  |                                         | gerilim    |
| iz, renkli bir çizgi olarak belirir      | ⟨ipucu: görünmez⟩ "Bizim için görünmez bir çizgi."       | hayret     |
| yüzlerce işçi çizgiyi izliyor            | "Kokulu bir iz. Bilim insanları buna feromon der."       | aha        |
| iz, güneşte soluklaşıyor                 | "Ama bu iz, sonsuza kadar kalmıyor."                     | ileri çeker|
```

### Sık hatalar ve düzeltmeleri

| Ders kitabı hâli | Anlatım hâli |
|---|---|
| "X, Y'nin Z'sidir." (tanımla açılış) | Önce olayı göster, adını sonda koy. |
| "…olmaktadır", "…edilmektedir" | Etken, şimdiki zaman: "…oluyor", "…ediyor". |
| "Üç tür vardır: A, B ve C." | Birini seç, hikâyesini anlat; öbürlerini ekranda göster. |
| "Oldukça önemli bir rol oynar." | Rolü somut söyle: "Bu iz olmasa, işçiler yiyeceğe giden yolu bulamaz." |
| "Bu videoda … öğreneceğiz." | İlk cümle soru ya da tuhaflık. |
| "Sonuç olarak şunu söyleyebiliriz ki…" | Son cümle bir görüntü ya da açılış sorusunun cevabı. |
| Ekranda görünenin tarifi | Görünmeyenin söylenmesi: neden, sonra ne olacak, ölçek, risk. |

## 4. Son kontrol listesi

- [ ] İlk 15 saniyede bir soru, bir tuhaflık ya da bir tehlike var mı? Başlık/kapakta verilen söz ilk dakikada karşılanmaya başlıyor mu?
- [ ] Tek cümlelik çekirdek yazıldı mı ve her bölüm ona hizmet ediyor mu?
- [ ] Hiçbir cümle 20 kelimeyi geçmiyor mu? Ortalama 8–14 mü? Kısa-uzun cümleler karışık mı?
- [ ] `say` alanında rakam, parantez, kısaltma, sembol kalmadı mı?
- [ ] Hiçbir yerde üçten fazla öğe sesle sayılmıyor mu?
- [ ] Anlatıcı ekranda görüneni tekrar etmiyor, görünmeyeni mi anlatıyor?
- [ ] Her terim önce gösterilip sonra adlandırılıyor mu? Bir cümlede en çok bir yeni terim mi var?
- [ ] Açılan her merak döngüsü kapanıyor mu? Final, açılıştaki soruya cevap veriyor mu?
- [ ] 30–60 saniyede bir ritim değişiyor mu (soru, sessizlik, ölçek değişimi, sürpriz)?
- [ ] Bilimsel/tarihsel iddialar kaynaklı mı; belirsiz olanlar "muhtemelen", "bilim insanları … düşünüyor" gibi ölçülü dille mi?
- [ ] Sesli okundu, TTS'in şüpheli bulduğu cümleler düzeltildi mi?
- [ ] Her sahne olayının bölümde bir kez geçen bir ipucu kelimesi var mı?
- [ ] Metin yüzde 20 kısaltıldıktan sonra hâlâ akıyor mu?
