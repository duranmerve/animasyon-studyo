# Tasarım kartı: Karıncanın Gözünde Hayat

## Konunun özü

İzleyici sonunda şunu anlamış olmalı: **Karınca, bizimkinden bambaşka bir dünyada yaşar.** Gözleri bulanık bir mozaik görür, dünyayı antenleriyle kokular üzerinden kurar, küçük boyu yüzünden fizik onun için başka işler (güç, düşme, su), ve tek başına basit olan bu canlılar, lidersiz bir düzenle akıllıca işler yapar.

## Üç yaklaşım

**A. Makro belgesel (seçilen).** Gerçek ölçekli (1 birim = 1 mm) bir 3B dünya: kum taneleri kaya, çim yaprakları kule, çiy damlaları su küresi. Kamera bir makro objektif gibi davranır: çok sığ alan derinliği, odak kaydırma, sabah güneşinin arkadan vurduğu parlak kıllar ve yarı saydam yapraklar. Anlatıcı bir işçi karıncayı bir gün boyunca izler. Açıklamalar bir doğa belgeselinin grafik bölümü gibi: ince çizgilerle bağlanan etiketler, Latince adlar, köşede canlı bir ölçek çubuğu. Teknik: Babylon.js (fiziksel tabanlı malzemeler, kitin için şeffaf cila katmanı, yarı saydamlık, alan derinliği, bloom, film greni), karınca ve öteki canlılar koddan modellenir.

**B. Doğa defteri.** 19. yüzyıl bir böcek bilimcisinin not defteri: suluboya ve mürekkep çizimleri, SVG ile adım adım çizilen karınca anatomisi, sayfa çevirerek ilerleyen bölümler, el yazısı notlar. Sıcak ve öğretici, ama kullanıcı açıkça **gerçekçi** bir belgesel istedi; bu üslup gerçekliği çizime çevirir.

**C. Karınca kamerası.** Birinci şahıs bakış: izleyici karıncanın gözünden oyun gibi yürür, ekranda koku görüşü, feromon göstergeleri, mozaik görme filtresi sürekli açık. Sürükleyici, ama sürekli bulanık bir mozaik 6 dakika boyunca izlenemez, oyun arayüzü de belgesel duygusunu bozar. Bu fikrin en güçlü anı (karıncanın gözünden bakmak) A'nın içinde bir "vay" anı olarak kullanılır.

## Seçim ve gerekçe

A seçildi: kullanıcı belgesel ve gerçekçilik istedi; konunun özü **ölçek** ve **bakış açısı** olduğu için gerçek boyutlu bir 3B dünya bunu en iyi hissettirir. Makro fotoğrafın dili (sığ derinlik, arkadan ışık, dev görünen kum taneleri) izleyicinin zaten tanıdığı belgesel dilidir ve "küçük olmak ne demek" sorusunu kendi kendine sorar. Depodaki önceki animasyonlar Three.js ve Canvas 2D kullandı; bu animasyon Babylon.js'in PBR ve son işleme hattıyla sinematik bir görünüm kurar, arayüzü de koyu bir teknoloji paneli değil sade bir belgesel yazı düzenidir.

## Kimlik

- **Işık:** sabah güneşi, alçaktan ve arkadan-yandan (sıcak 1.0/0.86/0.66). Kıllar, bacaklar ve çim yaprakları arkadan aydınlanıp parlar; çiy damlalarında güneş parıltısı. Yuva sahnesinde belgesel çekimlerindeki gibi loş, kırmızımsı bir ışık.
- **Renk paleti:** toprak kahvesi (#5c4331), sabah altını (#f2c46b), çim yeşili (#5d8a2c), kitin siyahı (#140f0c), fildişi yazı (#f3ebdd), ballı çiy kehribarı (#e9a93b); koku görüşünde feromon moru (#b58cff), yiyecek kehribarı, koloni kokusu turkuaz (#5fd3c4).
- **Yazı tipleri:** başlıklar ve Latince adlar için *Fraunces* (belgesel jeneriği gibi, yumuşak bir serif; Latince adlar italik). Altyazı ve arayüz için *Hanken Grotesk* (okunaklı, sıcak bir grotesk). İkisi de Türkçe karakterleri destekler.
- **Hareket karakteri:** ağır ve sakin belgesel. Yavaş kaydırmalar (dolly), odak kaydırma (rack focus), gerektiğinde ağır çekim. Bölümler arasında kısa kararma ya da yumuşak geçiş. Karınca gerçek bir yürüyüş düzeniyle (üçlü destek yürüyüşü, tripod gait) adım atar; antenleri sürekli yoklar.
- **Ses dünyası:** Web Audio ile üretilir: çimenlerde rüzgâr (süzülmüş gürültü), seyrek uzak kuş cıvıltıları, yavaş değişen yumuşak bir yaylı dokusu (belgesel müziği), mikrofon karıncaya çok yakınmış gibi minik tıkırtılar. Anlatım sırasında efektler kısılır.
- **Arayüz dili:** alt kısımda ince bir ilerleme çizgisi ve bölüm çentikleri; bölüm açılışında sol altta Roma rakamı ve serif başlık; ekranda açıklamalar ince bir çizgiyle nesneye bağlanan etiketler; sağ altta makro çekimlerdeki gibi canlı bir ölçek çubuğu (1 mm). Cam efekti, neon, istatistik kutusu yok.

## "Vay" anları

1. **Açılış:** kamera karıncanın gözündeki peteklerden geri çekilir; kayalar kum tanesi, kuleler çim yaprağı çıkar.
2. **Ölçek:** karıncanın yanında insan boyuna büyütülmüş karşılaştırma; çim yaprağı on katlı bir binaya dönüşür.
3. **Parçalara ayrılan beden:** karınca döner, baş-mezozoma-bel-gaster ayrılır; "göğüs" sandığımız parçaya kaynaşmış karın halkası vurgulanır.
4. **Karıncanın gözünden:** ekran bir silme çizgisiyle ikiye ayrılır; bir yanda bizim gördüğümüz, öbür yanda yüz kadar ommatidyumun gördüğü bulanık mozaik.
5. **Koku görüşü:** renkler çekilir, yerde görünmez feromon izleri ve koku bulutları belirir.
6. **Lidersiz düzen:** iki köprü deneyinde karıncaların kendiliğinden kısa yolu seçmesi, gerçek bir benzetimle.
7. **Kare-küp yasası:** küp iki katına çıkar, kesit 4, hacim 8 kat büyür.
8. **Düşüş:** çim yaprağından düşen karınca ağır çekimde süzülür, kalkıp yürür.
9. **Yeraltı şehri:** toprağın kesiti açılır; kraliçe, yumurta, larva ve kozalar.
