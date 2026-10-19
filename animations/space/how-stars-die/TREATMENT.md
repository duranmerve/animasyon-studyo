# Treatment: Bir Yıldız Nasıl Ölür?

**Tür:** açıklayıcı (uzay) · **Kitle:** meraklı lise öğrencisi ve yetişkin · **Süre:** ~7 dk · **Ses:** windows-tolga

**Logline:** Gökyüzünde yan yana iki yıldız var. İkisi de ölecek: biri sessizce sönecek, öteki bir galaksi kadar parlayacak ve kanımızdaki demiri uzaya saçacak. Hangisinin ne olacağını tek bir sayı belirler.

## 1. Çekirdek cümle

Bir yıldız, içe çeken kütle çekimiyle dışa iten basınç arasındaki uzun bir çekişmedir. Yakıt bittiğinde kimin kazanacağını yıldızın **kütlesi** belirler: hafif yıldız beyaz cüce olarak söner, ağır yıldız çöker, patlar ve yaşamın yapıldığı elementleri saçar.

## 2. Beş görsel dünya

1. **Kurzgesagt uzayı.** Gece laciverti, yumuşak gradyanlı düz vektör yıldızlar, sarı-mavi vurgu, gren. Herkesin ilk çözümü; uzayı olduğundan "sevimli" ve tanıdık gösterir.
2. **Hertzsprung–Russell arazisi.** HR diyagramı üç boyutlu bir topoğrafyaya döner; yıldızlar haritada yürüyen yolculardır. Doğru ama soyut; patlama anı haritada küçük bir nokta olarak kalır.
3. **Termal yanlış renk.** Siyah zemin, ısı kamerası rampası (mor→sarı→beyaz), yıldız iç kesitleri bilimsel ölçüm gibi. Güçlü ama "gösterim ekranı" soğukluğunda; insan elinin izi yok.
4. **Siyanotip: güneş baskısı.** Bütün film, ışığın kendisiyle basılan Prusya mavisi siyanotip levhalarında geçer: mavi emülsiyon, beyaz pozlanmamış çizgiler, fırça kenarlı kâğıt. Yıldızlar ışığı levhaya yakarak "kendi resmini çizer"; süpernova levhayı aşırı pozlar ve yakar.
5. **Çekirdek fırını kesiti.** Yandan sabit kesit kamerası, WebGL ısı/konveksiyon benzetimi, sıcak turuncu tonlar. Kesit çok bilgi verir, ama bütün film tek bir kazan içinde geçer ve kapanıştaki "biz" kısmına bağlanmaz.

## 3. Seçim ve gerekçe: **4, Siyanotip**

- **Videoda en güçlü görünür:** tek renkli bir dünya, tek vurgu rengini (enerjinin turuncusu) kazandığında kesinlikle göze çarpar. Süpernovanın levhayı beyaza yakması ekranda daha önce görülmemiş bir an olur.
- **Konuyu en doğru anlatır:** siyanotip ışıkla yapılan bir görüntüdür. Gökbilim de yıldız ışığını fotoğraf levhasında incelemekle büyüdü; levha, ölçüm ve not dili konudan çıkıyor. "Işık kaçamazsa levha karanlık kalır" (kara delik) görsel olarak gerçek bir pozlama mantığıdır.
- **Bir günde kodla yapılır:** her sahne tam ekran bir WebGL parça gölgelendiricisi (prosedürel yıldız, bulutsu, kesit), üstüne Canvas 2D'de beyaz kalem çizimi ve yazı katmanı. Son işlem tek bir "siyanotip tonlama" geçişi; ağır 3B yok.
- **Stil defteriyle fark:** önceki açıklayıcılar `digestive-journey` (Three.js 3B, kırmızı-pembe organik palet, iç organ yolculuğu kamerası) ve `laser-printer` (Three.js teknik kesit, makine içi). Bu film **palet** (Prusya mavisi tek renk + turuncu vurgu), **doku** (kâğıt lifi, fırçalanmış emülsiyon, beyaz kalem) ve **kamera/sahne düzeni** (ışık masasında levhalar, büyüteçle yaklaşma, levha değişimi) bakımından üçünde de farklı.

## 4. Kimlik kartı

- **Palet:** Prusya mavisi `#123a6b` (emülsiyon, ana zemin) · derin mürekkep `#081a33` (en koyu, gölge) · siyan beyazı `#dcebf2` (pozlanmamış çizgi, yıldız) · soluk mavi `#6f9cc2` (ara ton) · kâğıt kreması `#efe6d2` (levha kenarı, kâğıt) · **vurgu: füzyon turuncusu `#ff6a2b`** (yalnızca dışa iten enerji, füzyon ve patlama; kütle çekimi hiçbir zaman turuncu değildir).
- **Doku ve malzeme:** suluboya kâğıt lifi (gürültü), fırçayla sürülmüş emülsiyon kenarları, yıkamada kalan akıntı izleri, levha köşelerinde iğne delikleri ve el yazısı katalog numarası. Hepsi ekran uzayında prosedürel.
- **Işık:** levhanın arkasından ışık masası; aşırı pozlanan yerlerde kâğıt beyaza açılır ve "yanar".
- **Kamera dili:** sabit levha + yavaş büyüteç yakınlaşması; sahne değişimi bir levhanın kayıp yerine yenisinin gelmesiyle olur; ölçek karşılaştırmalarında sürekli yakınlaşma (zoom-through). Kamerayı el sallamaz, tripod gibi durur.
- **Yazı tipleri (Google Fonts):** başlık ve levha notları **Instrument Serif** (italik); ölçümler ve katalog etiketleri **IBM Plex Mono**; altyazı ve arayüz **IBM Plex Sans**.
- **Hareket karakteri:** ağır, yerçekimli; içe düşen her şey hızlanarak (ease-in), dışa iten her şey yavaşlayarak (ease-out) hareket eder. Bu fizik bütün filmin easing kuralıdır. Yazılar kalemle çizilir gibi soldan sağa açılır.
- **Ses dünyası:** düşük, uzun drone (yıldızın "nefesi"); kâğıt hışırtısı ve levha kayışı geçişlerde; çöküşte bütün seslerin bir an kesilmesi (sessizlik); nötrinolar için ince tık sesleri (dedektör); patlama sesli değil, beyaz gürültünün yükselip kâğıt yırtılmasına dönüşmesi.
- **Arayüz dili:** levha kenarı kâğıt kreması çerçeve, köşede katalog etiketi ("Lv. 04 · SN 1987A"), düğmeler Plex Mono küçük harf.

## 5. Kahraman sahneler (bölüm başına akılda kalan kare)

1. **Soğuk açılış · İki yıldız:** tek levhada yan yana iki beyaz leke, kalemle "A · 1 M☉" ve "B · 25 M☉" notları. Biri sessiz ve küçük, öteki sarsıntılı. Unutulmaz çünkü bütün film bu iki notun cevabı. *Teknik:* gölgelendiricide iki prosedürel yıldız; Canvas'ta el yazısı açılımı.
2. **Çekişme:** yanlış model "yanan ateş topu" çizilir, üstü çizilir. Doğrusunda yıldızın kesitinde mavi oklar içe, turuncu oklar dışa eşit uzunlukta durur ve yıldız hafifçe nefes alır. *Teknik:* ok alanı Canvas'ta, nabız sin(t).
3. **Kütle her şeydir:** levhanın altında uzun bir kâğıt şerit: Güneş'in 10 milyar yılı bütün şeridi doldurur, ağır yıldızın ömrü şeridin başında tırnak kadar bir çentiktir. *Teknik:* zoom-through ile şeridin ölçeği.
4. **Güneş'in yaşlılığı:** şişen kırmızı dev (levhada kocaman soluk bir disk) Merkür'ün ve Venüs'ün yörünge çizgilerini siler. Dünya'nın yörüngesi kesik çizgi, yanında soru işareti. *Teknik:* disk yarıçapı = f(t), yörüngelerin silinmesi maskeyle.
5. **Sessiz son:** gezegenimsi bulutsu, suya damlayan mürekkep gibi açılır; merkezde Dünya büyüklüğünde parlak bir nokta. Ölçek: beyaz cüceden bir çay kaşığı = bir fil. *Teknik:* alan gürültüsüyle (domain warp) halka kabuk.
6. **Soğan:** ağır yıldızın kesitinde H, He, C, Ne, O, Si, Fe katmanları; her katmanın yanına süresi yazılır: 7 milyon yıl… 1 gün. Yazılar küçüldükçe saat hızlanır. *Teknik:* eşmerkezli halkalar, Plex Mono sayaç.
7. **Demir:** her şey durur. Merkezde tek, koyu, turuncu ışık vermeyen küre: kül. Sessizlik. Sonra çöküş, saniyeden kısa, ışık hızının onda biri. *Teknik:* zaman genişlemesi (ağır çekim) + ses kesilmesi.
8. **Patlama:** levha beyaza yanar; kâğıdın merkezi kızarıp turuncu kenarla açılır. Ardından 1987: üç dedektörde ~20 tık, ışıktan üç saat önce; 1054'ün Çin kaydı levhanın kenarına not olarak düşer. *Teknik:* aşırı pozlama eğrisi + yanık kenar maskesi.
9. **Geriye ne kalır:** nötron yıldızı bir şehir haritasının üstünde (20 km); ardından iki levha yan yana, "önce" ve "sonra": bir yıldız ikincisinde yok. Patlamadan, sessizce. *Teknik:* levha karşılaştırma düzeni.
10. **Biz:** patlamanın tozu yeni bir bulutsuya, oradan Güneş'e ve Dünya'ya; son karede bir insan silüeti aynı emülsiyonla basılmış, içinde demir (Fe) ve kalsiyum (Ca) notları. Açılıştaki iki yıldız levhasına dönülür: cevap "kütle". *Teknik:* parçacıkların hedef şekle akışı (deterministik).

## 6. Riskler

- **Patlama/yanma anı ucuz bir beyaz flaşa dönüşebilir.** Yedek plan: flaş yerine 3–4 saniyelik pozlama eğrisi (beyaz çekirdek büyür, kenar turuncuya döner, kâğıt dokusu belirginleşir) ve ses kesilmesi; düz beyaz ekran kesinlikle yok.
- **Tek renkli palet uzun videoda monoton kalabilir.** Yedek plan: her bölümde levha kâğıdı ve pozlama yoğunluğu değişir (açık yıkama / koyu emülsiyon / kenar fırçası), turuncu vurgu yalnızca anlamlı anlarda gelir ve beklenir; ölçek sahnelerinde kâğıt kreması daha çok görünür.
