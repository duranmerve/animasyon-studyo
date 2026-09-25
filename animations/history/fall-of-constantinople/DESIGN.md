# Tasarım kartı: İstanbul'un Fethi (1453)

## Konunun özü

Bin yıl boyunca karadan aşılamamış bir şehir, 1453'te elli üç günde düştü, çünkü Mehmed tek bir silaha güvenmedi. Önce Boğaz'ı kesti, sonra surları dev toplarla dövdü, gemileri karadan geçirip Haliç'e indirdi ve az sayıdaki savunucuyu dağıttı. En sonunda da yorgun savunmaya karşı son bir saldırı yaptı. İzleyici sonunda bu dört adımı haritanın üzerinde **görmüş** ve yaygın yanlışları düzeltmiş olmalı.

## Üç yaklaşım

**A. Canlanan minyatür harita.** Matrakçı Nasuh'un 1537'de çizdiği İstanbul minyatürünün dünyasından ilham alan, kuşbakışı ve düz boyalı bir harita. Deniz lacivert, üzerinde kıvrım kıvrım dalgalar var. Kara aharlı kâğıt renginde, üzerinde servi ağaçları ve kırmızı çatılı evler duruyor. Kamera bu tek büyük haritanın üzerinde gezinir; kalelerin kurulduğunu, ordunun dizildiğini, gemilerin tepeyi aştığını haritanın üzerinde görürüz. Kesitler ve ölçek karşılaştırmaları, kitap sayfasına eklenmiş "levhalar" gibi açılır. Teknik olarak Canvas 2D ve prosedürel çizim kullanılır, kıyılar gerçek enlem ve boylamlardan çizilir.

**B. Masa üstü diorama (3B).** Three.js ile yarımadanın kabartmalı bir maketi yapılır. Kamera tilt-shift bulanıklığıyla maketin üzerinde uçar. Surların kesiti 3B olarak açılır, gemiler fizik benzeri bir hareketle tepeye çekilir. Etkileyici olurdu, ama harita okumayı (neyin nerede olduğu, mesafeler) güçleştirir. Ayrıca gerçek bir kabartma verisi olmadan uydurma bir arazi ortaya çıkar.

**C. İki kronikçinin defteri.** Ekran ikiye bölünür. Solda Bizanslı bir tanığın (Sphrantzes ya da Barbaro), sağda Osmanlı tarafının (Tursun Bey) günlüğü yazılır. Kuşatma gün gün, iki gözden anlatılır. İnsanî ve tarafsız bir anlatı olurdu, ama mekânı (Boğaz, Haliç, tepeler) göstermez; oysa bu fethin kilit fikri coğrafyadır.

## Seçim: A, canlanan minyatür harita

Fethin bütün hikâyesi coğrafyadır: Boğaz'ın en dar yeri, Haliç'in ağzındaki zincir, Galata'nın arkasındaki tepeler, Lykos vadisi. Bunları anlatmanın en doğru yolu, gerçek kıyı çizgileriyle çizilmiş tek bir haritada kalmak ve kamerayı anlatıcının söylediği yere götürmektir. Minyatür üslubu hem dönemin ve şehrin kendi resim geleneğidir (Matrakçı'nın haritası fetihten yalnızca seksen yıl sonra çizildi), hem de her şeyi düz renkler ve net sembollerle gösterdiği için öğrenciye harita okumayı kolaylaştırır. 3B diorama daha gösterişli olurdu ama daha az öğretirdi.

## Kimlik

- **Renkler:** aharlı kâğıt `#EFE2C4`, toprak aşı boyası `#D9B779`, lacivert deniz `#1E4A7E` ve dalga çizgileri `#7FA7D6`, varak altın `#C29A3A`. Osmanlı tarafı zincifre kırmızısı `#B3362B`, savunucular erguvan moru `#5E2F6B`. Yeşillik `#4E7A45`, servi `#2C4A33`, mürekkep kahvesi `#2B1D14`.
- **Yazı:** Alegreya (başlık ve altyazı; kaligrafik kökenli, Türkçe karakterleri tam), Alegreya SC (harita etiketleri ve tarih mühürleri). Eski yazı karakterindeki rakamlar yıllara el yazması havası verir.
- **Hareket:** ağır, belgesel. Kamera harita üzerinde yumuşak ivmeyle kayar. Bir şey belirirken mürekkep gibi çizilerek gelir (çizgi uzunluğu açılır), renk sonradan dolar. Gece sahneleri (gemiler, son saldırı) haritanın üzerine lacivert bir gece örtüsü çeker; şafakta renk geri gelir.
- **Levhalar:** kesit, ölçek ve sayı karşılaştırmaları haritanın üstünde, altın çerçeveli kâğıt levhalarda açılır: surun kesiti (bir insan boyuyla), top ile insan, savunucu ve kuşatan sayıları, zaman şeridi.
- **Tarih mührü:** sol üstte bölüm adı ve tarih, kuşatma başladıktan sonra da "kuşatmanın N. günü" sayacı. Zamanın geçtiği duygusu bu sayaçtan gelir.
- **Ses dünyası:** Web Audio ile üretilir. Uzakta deniz uğultusu ve alçak bir dem sesi, top atışları için boğuk gümbürtü, zincir için metal şıngırtısı, son saldırıda kös davulu. Anlatım konuşurken efektler kısılır.
- **Arayüz:** altta mürekkep kahvesi bir şerit, altın ayrıntılar, bölüm çentikli ilerleme çubuğu. Altyazı haritanın altındaki koyu kahve karartmanın üzerinde fildişi renginde, kelime kelime açılır.
- **Anlatıcı:** O33, yaşlı ve çok derin erkek sesi. Bir kronikçinin, yaşlı bir tarih öğretmeninin sesi gibi.

## "Vay" anları

1. **Açılış:** boş kâğıda mürekkeple kıyılar çizilir, sonra deniz ve kara boyanır. Şehir sanki o an resmediliyor.
2. **Surun kesiti:** harita surun üstüne yaklaşır, ardından bir levha açılır. Hendek, dış sur ve iç sur bir insan boyuyla karşılaştırılarak katman katman kurulur.
3. **Boğazkesen:** kamera Boğaz'ın en dar yerine uçar. İki kalenin atış alanları suyun üzerinde kesişir, aradaki 660 metre ölçülür.
4. **Karadan yürüyen gemiler:** harita geceye döner. Gemiler Dolmabahçe'den tepeyi tırmanır ve fener ışıklarıyla Kasımpaşa'ya iner. Yan levhada yükselti kesiti ve tepeyi aşan gemi görünür. Şafakta Haliç yetmiş gemiyle dolmuştur.
5. **Zaman şeridi:** 330'dan 1453'e uzanan bin yüz yıllık bir şerit; 1204 ve 1557 üzerinde işaretlidir.
