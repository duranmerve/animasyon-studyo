# Treatment: Bal Arısının Bir Günü

**Logline:** Hayatının son haftasındaki bir toplayıcı arı, bir gün boyunca gökyüzünü pusula yapar, bizim göremediğimiz renklerde çiçek bulur ve eve dönüp gördüklerini zifiri karanlıkta, dans ederek anlatır.

## 1. Çekirdek cümle

Susam tanesi kadar bir beyin, gökyüzündeki ışığı okuyup iki kilometre ötedeki bir çiçeği bulur ve o yeri karanlıkta, dokunarak ve titreşerek başkalarına tarif eder. İzleyici sonunda şunu anlamış olmalı: **dans, gökyüzünün karanlığa çevrilmiş bir haritasıdır** (açı = güneşe göre yön, süre = uzaklık, "yukarı" = güneş).

## 2. Beş görsel dünya

1. **Gravür defteri.** 19. yüzyıl doğa tarihi levhası gibi mürekkep çizgisi ve tarama gölgesiyle canlanan bir saha defteri; tek renk bal sarısı. Kamera sayfa üstünde kaydırma; gerçekçilik yerine açıklık.
2. **Kuş bakışı topografya.** Bütün gün yukarıdan, eş yükselti eğrili açık renk bir harita; arı bir iz, güneş bir gölge açısı. Soğuk kâğıt paleti, hep üstten tek plan.
3. **Mum ve kehribar.** Her şey balmumunun içinden geçen ışıkla aydınlanır: koyu kovan, yarı saydam altın, alt yüzey saçılması. Makro, sığ alan derinliği, dar kadraj; dış dünya yalnız mumdan süzülen bir leke.
4. **Gökyüzü ve karanlık (iki göz).** Dışarısı gökyüzü baskın, geniş, pastel sabahtan beyaz öğleye, gül rengi akşama dönen stilize bir çayır; içerisi neredeyse siyah, yalnız mumun kenar ışığı ve titreşimin görünür kıldığı bir kovan. Arının gözüne geçildiğinde görüntü altıgen omatidyum mozaiğine kırılır; bizim göremediğimiz her şey (UV desenleri, polarize gök, dansın vektörü) tek bir **ultraviyole mor** ile çizilir.
5. **Termal / algı haritası.** Kovan içini ısı, dışarıyı koku bulutlarıyla gösteren yapay renkli bilimsel görüntüleme estetiği; ızgara, ölçek, laboratuvar monitörü dili.

## 3. Seçim ve gerekçe

**Seçilen: 4, "Gökyüzü ve karanlık".**

- **Videoda en güçlü görünür:** gökyüzü baskın geniş planlarla zifiri karanlık kovan arasındaki ışık sıçraması her bölümde kendiliğinden bir "vay" anı verir; altıgen göz geçişi yalnızca bu konuda anlamlı bir numaradır.
- **Konuyu en doğru anlatır:** hikâyenin özü tam olarak bu iki dünyanın arasındaki çeviridir: dışarıda ışık, güneş, polarizasyon; içeride karanlık, dokunma, titreşim, yerçekimi. Mor, "bizim göremediğimiz bilgi" demektir; dans vektörü, UV desen ve polarizasyon aynı renkle birbirine bağlanır. Altıgen hem gözün hem peteğin biçimi olduğu için dekor değil, konudan çıkar.
- **Bir günde kodla yapılır:** Three.js; gök kubbe shader'ı, örneklenmiş (instanced) çiçek ve ot, sis, basit bloom, prosedürel arı (küre/kapsül + kıl kabuğu + damar çizili kanat shader'ı), petek için altıgen SDF shader'ı, göz görüşü için ekran uzayı altıgen post efekti. Gravür (1) çizgi kalitesi uzun sürer, termal (5) duygudan yoksun, topografya (2) ölçeği hiç hissettirmez, kehribar (3) dışarıyı ve gökyüzünü, yani konunun yarısını, gösteremez.

**Stil defterine göre (ant-documentary ile):**
- *Palet ailesi farklı:* orada sabah altını + toprak kahvesi + çim yeşili; burada soluk gök mavisi / tebeşir beyazı + kovan siyahı + mum sarısı, tek vurgu UV moru.
- *Doku dili farklı:* orada fotogerçekçi kitin mikro dokusu ve ıslak çiy; burada ramp gölgeli yumuşak boyalı yüzeyler, sis ve mumun yarı saydamlığı; gerçekçi mikro doku yok.
- *Kamera ve sahne düzeni farklı:* orada yerden, el titremeli uzun objektif ve yüzey → yuva kesiti → laboratuvar; burada gökyüzüne yer açan alçak açı geniş planlar, sabit sehpa + yavaş kaydırma, düzen "bir günün saatleri" (şafak, sabah, öğle, ikindi, akşam, gece), dışarı ve içeri dönüşümlü. Laboratuvar ve kesit yok.
- Ses de farklı: anlatıcı O9 (orada O33).

## 4. Kimlik kartı

| | |
|---|---|
| **Palet** | Gök tebeşiri `#E6ECEF` · Öğle göğü `#9FBCD3` · Çayır adaçayı `#8C9A6E` · Kovan isi `#120C08` · Mum `#D9A441` · Akşam gülü `#C98272` · **Vurgu: UV moru `#8B5CF6`** (yalnızca arının görüp bizim göremediği bilgi) |
| **Doku / malzeme** | Ramp (3 basamak) gölgeli yumuşak yüzeyler; hava perspektifi sisi; arı gövdesinde kıl kabuğu (shell) ve kenar ışığı; kanatta ince damar ve hafif yanardöner; mumda yarı saydam altın ve kenar parıltısı; ince, sabit bir kâğıt greni (video modunda sabit). |
| **Işık** | Günün saati belirleyici: mavi şafak → beyaz öğle → gül akşam → mor-lacivert gece. Kovanda tek ışık kaynağı yok: mumun kendi kenar parıltısı ve titreşimin bıraktığı mor halkalar. |
| **Kamera dili** | Tanık: sabit sehpa, çok yavaş kaydırma, uzun objektif sıkıştırması; kadrajın üçte ikisi gökyüzü olan alçak geniş planlar; arı kadraja girer çıkar. Dönen kamera yok. Ağır çekim yalnız kanat vuruşu ve sallanım için. Arının gözüne geçiş: altıgen mozaik kırılması. |
| **Yazı** | Başlık ve Latince adlar: *Newsreader* (italik); etiket, arayüz: *Commissioner*. Saha rehberi etiketleri: ince çizgi + ad + ölçek çubuğu; kutu yok. Bölüm başında saat damgası ("05.42 · şafak"). |
| **Hareket karakteri** | Dış dünya ağır ve rüzgârlı (otların gecikmeli salınımı); arı hızlı, küçük düzeltmelerle; kovan içi kalabalık ama yavaş kaynayan. Sallanım 15 Hz'lik gerçek titreşim hissi (ağır çekimde görünür). |
| **Ses dünyası** | Anlatıcı O9, alçak ve sakin. Dışarıda rüzgâr (süzülmüş gürültü), seyrek kuş cıvıltısı (FM), yanımızdan geçen arının Doppler'li vızıltısı (~230 Hz testere dalgası, süzgeçli). İçeride koloninin kalın uğultusu, dans anında 250 Hz'lik darbeler. Gece cırcır böceği. Müzik yok denecek kadar az: tek, yavaş bir drone. |
| **Arayüz** | Koyu cam değil: gök tebeşiri üstüne ince çizgili, köşesiz; oynatma çubuğu bölüm saat damgalarıyla işaretli (bir günün saatleri). |

## 5. Kahraman sahneler (bölüm başına bir kare)

1. **05.40 Şafak — Kovuk.** Yaşlı bir ıhlamur gövdesinde budak deliği; içerden mum sarısı sıcak bir ışıma, dışarıda mavi şafak ve sis; tek arı deliğin ağzında, gökyüzüne karşı siluet. *Neden:* iki dünyanın sınırı tek karede. *Teknik:* gövde silindiri + gürültü yer değiştirme + ramp; delik içi emissive; sis; gök shader'ı.
2. **06.10 Son hafta — Yüz.** Arının yüzü yakın: bileşik gözün altıgen yüzeyinde gökyüzünün yansıması, antenler havayı yokluyor; arkada hayatının dört evresi petek hücrelerinde birer birer sönen ışıklar (temizlik, bakıcılık, mum, bekçilik) ve beşinci hücre yanıyor: toplayıcı. *Teknik:* prosedürel arı başı; göz shader'ında altıgen + yansıma.
3. **07.30 Gökyüzü pusulası.** Alçak açı, kadrajın çoğu gökyüzü; arının gözüne geçince gök kubbeye mor polarizasyon çizgileri güneşin çevresinde halkalar halinde belirir; bulut güneşi kapatsa da desen durur. *Teknik:* kubbe shader'ında e-vektör alanı (güneşe göre teğet çizgiler), altıgen post.
4. **09.00 Çiçek — iki göz.** Aynı çayır, perde ortadan ikiye ayrılır: solda bizim gördüğümüz, sağda arının altıgen mozaiği: kırmızı gelincik kararır, sarı çiçeklerin ortasında mor bir hedef tahtası belirir. *Teknik:* örneklenmiş çiçekler; bee-view uniform'u ile renk eşlemesi (UV kanalı); ekran bölme.
5. **11.30 Eve dönüş — Harita.** Kuş bakışı soluk bir arazi; arının gidişi kıvrık bir iz, dönüşü tek, düz bir mor çizgi; yerde akan görüntü "odometre". *Teknik:* üstten ortografik kamera, prosedürel arazi dokusu, iz çizgisi.
6. **12.10 Karanlıkta dans.** Zifiri petek; dansçının etrafında titreşim halkaları (mor) ve dokunan antenler; üstte ince bir çizgiyle "yukarı = güneş", dansın açısı dışarıdaki güneş açısıyla üst üste biner. *Teknik:* petek SDF shader'ı; dansçı sekiz yolu; halka shader'ı; bölünmüş kompozisyon.
7. **14.00 Radar ve alıcılar.** Dansı izleyen acemi arıların radar izleri, rüzgâra rağmen aynı çiçek tarlasına yakınsıyor (Riley 2005); ardından içeride ağızdan ağıza nektar geçişi. *Teknik:* harita modülü tekrar; iz çizgileri; arı örnekleri.
8. **16.30 Nektardan bala.** Tek hücrenin makrosu: ince tabaka nektar, yelpazelenen kanatların hava akımı, su oranı sayacı %80'den %18'e iner; hücre mumla kapanır ve arkadan ışık alır. *Teknik:* hücre SDF + sıvı yüzeyi, kanat örnekleri, sayaç.
9. **20.10 Gece.** Kovuk dışarıdan, lacivert gök ve yıldızlar; içeride uyuyan arının antenleri yavaşça sarkıyor. Son kare: gökte sabah olacak yerde silik bir mor çizgi. *Teknik:* gece gök shader'ı, yıldız noktaları; uyku duruşu animasyonu.

## 6. Riskler

- **Prosedürel arının yakın planı** "oyuncak" görünebilir. Yedek: yakın planda arıyı kenar ışığıyla siluete yakın tutmak, kılları kabuk + fresnel ile vermek, ağız parçalarını ayrıntılamak yerine gözü ve antenleri öne çıkarmak; yakın plan süresini kısaltıp geniş planları çoğaltmak.
- **Kovan içindeki kalabalık** (yüzlerce arı) performans ve okunabilirlik riski. Yedek: kadrajdaki arı sayısını kademeye bağlamak (düşük kademede örnek sayısı az), karanlıkta çoğu arıyı yalnız kenar ışığıyla çizmek; dansçı ve 4–5 izleyici tam ayrıntılı, kalanlar basit.
