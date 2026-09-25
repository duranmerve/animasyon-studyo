# Tasarım kartı: Spring Boot'un İçi

## Özü tek cümlede

`SpringApplication.run()` satırının arkasındaki "sihir" üç somut şeyden oluşur: nesneleri kuran ve birbirine bağlayan bir **konteyner**, classpath ve ayarlara bakan bir **koşullar zinciri**, ve ezilebilen **varsayılanlar**. Bir istek de bu yapının içinden belli bir yoldan geçer.

## Üç yaklaşım

**A. Saat mekanizması (Three.js, 3B kesit).** ApplicationContext pirinç dişlilerden bir makine gibi çizilir; bean'ler dişliler, bağımlılıklar aktarma kayışlarıdır. Kamera makinenin içinde dolaşır. Güçlü bir ilk izlenim bırakır, ama benzetme yanlış yönlendirir: dişliler sürekli döner, oysa bean'ler bir kez kurulur ve bekler. Koşullu yapılandırma ve istek yolculuğu dişli diliyle anlatılamaz. Ayrıca kod görünmez; yazılımcı izleyici "hangi satır bunu yapıyor?" sorusunun cevabını bulamaz.

**B. Lojistik merkezi (izometrik PixiJS şehri).** İstek bir paket, Tomcat bir kargo kapısı, DispatcherServlet bir ayırma bandıdır. İstek yolculuğu için çok iyi çalışır. Ama konteyner, bean yaşam döngüsü ve koşullar şehir benzetmesine zorla sokulur; derin konular sulanır. Arkadaşın istediği "yapıyı gerçekten anlatan" iş için yüzeyde kalır.

**C. Yavaş çekim tezgâhı: kod ve teknik çizim yan yana (Canvas 2D).** Bütün film, bir Spring Boot uygulamasının açılışındaki yaklaşık iki saniyenin ve tek bir HTTP isteğinin **ağır çekimidir**. Solda kâğıda basılmış gibi duran bir kod sayfası: o an konuşulan satır vurgulanır. Sağda aynı anın teknik çizimi: tarif kâğıtları (BeanDefinition), montaj bandı (yaşam döngüsü), koşul kapıları (otomatik yapılandırma), katmanlı saydam sayfalar (ayar önceliği), kesit görünüşü (jar). Üst şeritte `run()` adımlarını gösteren ince bir ray, izleyiciye hep "açılışın neresindeyiz" diye yol gösterir.

## Seçim: C

İzleyiciler yazılımcı. Onlar için en değerli şey, **notasyonla etkisinin aynı karede** görünmesi: `@ConditionalOnMissingBean` yazan satır vurgulanırken sağda kapının kapanması. Benzetmeler yalnızca yapının gerçekten öyle olduğu yerde kullanılır: BeanDefinition gerçekten bir tariftir (mavi kopya kâğıdı), BeanPostProcessor zinciri gerçekten sırayla işleyen bir banttır, property kaynakları gerçekten üst üste binen katmanlardır. Canvas 2D ile sahne durumu zamanın saf fonksiyonu olur (video için), kod da tuval üzerinde çizildiği için videoda aynen görünür.

## Kimlik

- **Zemin:** sıcak, kırık beyaz teknik çizim kâğıdı, çok ince milimetrik ızgara ve kâğıt lifi. Koyu tema değil: mühendislik defteri hissi.
- **Renkler:**
  - mürekkep `#1C2230`, soluk mürekkep `#5E6575`, kâğıt `#F2EDE3`, kâğıt gölgesi `#DCD4C4`,
  - **tarif mavisi** `#2856B8` (BeanDefinition, yapılandırma: "henüz nesne değil, plan"),
  - **canlı kırmızı** `#E2552E` (şu an işleyen adım, istek paketi),
  - **geçti yeşili** `#2F8A5B` (koşul sağlandı, UP),
  - **proxy kehribarı** `#DC9E1F` (vekil nesnenin kabuğu, notasyonlar),
  - geri çekilen / elenen öğeler: soluk gri, kesik çizgi.
- **Yazı tipleri:** başlık ve arayüz için *Bricolage Grotesque* (karakterli, teknik ama soğuk değil), kod ve etiketler için *JetBrains Mono*. Çizimdeki en küçük yazı 22 birim (telefon yatayda ≥ 12 px).
- **Hareket:** mekanik ve kesin. Öğeler yerine kısa bir yaylanmayla oturur, bantlar sabit hızla akar; önemli anda zaman yavaşlar. Kamera yalnızca istek yolculuğunda ve açılış raylarında gezer.
- **Derinlik:** her nesne kâğıttan kesilmiş kart gibi; sol üstten gelen tek ışık, sağ alta düşen yumuşak gölge. Proxy kabuğu yarı saydam kehribar, iç nesne altından görünür.
- **Ses:** Web Audio ile üretilen kuru mekanik sesler: kâğıt kaydırma, tık, damga, kapı çıtırtısı, alçak bir "tak" (bağımlılık takılınca). Anlatım sırasında kısılır.
- **Arayüz:** alt çubukta bölüm işaretli ince ray; düğmeler mürekkep çizgili, dolgu yok. Altyazı alt karartmanın üstünde gölgeli beyaz.

## "Vay" anları

1. **Açılış:** gerçek hızda iki saniyede akıp giden log satırları, sonra zaman donar ve saat sıfıra sarar: "×1000 ağır çekim".
2. **`@SpringBootApplication` patlatılmış görünüş:** notasyon üç parçaya ayrılır.
3. **Koşul kapıları:** yüzden fazla aday kart kapılardan geçer, çoğu solar; pom'a tek satır eklenince zincirleme bir dalga ile kartlar yeşile döner.
4. **Proxy'nin doğuşu:** bantın son istasyonunda nesne kehribar bir kabukla sarılır; konteynere giren artık kabuktur.
5. **Self-invocation:** dış çağrı kapıdan geçer, `this` çağrısı kabuğun içinden kapıyı atlar.
6. **İstek yolculuğu:** kırmızı paket, bir iş parçacığının elinde Tomcat'ten veritabanına ve JSON olarak geri.
7. **Saydam katmanlar:** dört ayar katmanı üst üste; yukarıdan bakınca yalnızca en üstteki değer görünür.
