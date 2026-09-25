// The narration: one chapter = one recording. Markup in text.js ({shown|spoken}, @cue).
// "seal" is the date stamp in the corner; "day" the siege day shown under it (6 April = day 1).

export const CHAPTERS = [
  {
    id: 'question', title: 'Bir Soru', seal: '1453',
    text: `@draw Bir şehir düşünün: üç yanı deniz, bir yanı üç kat surla çevrili. @armies Bin yılı aşkın bir süre boyunca pek çok ordu bu surların önüne geldi ve geri döndü. @crusade Surları zorla aşabilen tek ordu, {1204|bin iki yüz dört} yılında Haçlılar oldu; o da kara surlarından değil, Haliç'teki deniz surlarından. @sultan Sonra {1453|bin dört yüz elli üç} baharında yirmi bir yaşında bir padişah geldi, @days ve şehir elli üç günde düştü. @how Nasıl? Cevap bir kalede, dev bir topta ve bir gecede tepeleri aşan gemilerde saklı.`,
  },
  {
    id: 'city', title: 'Konstantinopolis', seal: '330 – 1453',
    text: `@name Bu şehrin adı o zamanlar Konstantinopolis'ti. @capital {330|Üç yüz otuz} yılında Roma imparatoru Konstantin onu yeni başkent yaptı. @romans Biz bu devlete Bizans deriz, ama halkı kendini hep Romalı saydı; @wolf "Bizans" adı, şehir düştükten yaklaşık yüz yıl sonra yaygınlaştı. @small {1453'te|Bin dört yüz elli üçte} imparatorluk, birkaç ada ve Mora'daki topraklar dışında neredeyse yalnızca bu şehirden ibaretti. @people Bir zamanlar yüz binlerce kişinin yaşadığı şehirde elli binden az insan kalmıştı; @fields surların içinde bağlar, bahçeler, tarlalar vardı.`,
  },
  {
    id: 'walls', title: 'Kara Surları', seal: '413',
    text: `@zoom Şehri karadan koruyan surlara yakından bakalım. @line Beşinci yüzyılda, imparator {II. Theodosius|ikinci Teodosius} zamanında yapılan bu surlar, Haliç'ten Marmara'ya yaklaşık {5,7|beş virgül yedi} kilometre uzanır. @section Asıl gücü ise kesitinde saklı. @moat Önce yirmi metreden geniş bir hendek. @outer Ardından yaklaşık dokuz metrelik dış sur. @inner En arkada on iki metre yüksekliğinde, beş metreye varan kalınlıkta iç sur, @towers üzerinde de doksan altı kule. @layers Bir saldırgan bu üç katı, ok ve taş yağmuru altında, tek tek aşmak zorundaydı.`,
  },
  {
    id: 'sultan', title: 'Genç Padişah', seal: '1451',
    text: `@turn Şimdi karşı tarafa geçelim. @throne {II. Mehmed|İkinci Mehmed}, {1451|bin dört yüz elli bir} yılında, henüz çok gençken, ikinci kez Osmanlı tahtına çıktı. @map Haritaya bakınca derdini anlamak kolay: @halves Osmanlı toprakları Rumeli'de ve Anadolu'da, iki yakada uzanıyordu. @middle Tam ortada ise iki yakayı birbirinden ayıran bu şehir duruyordu. @threat Şehir, yeni bir Haçlı ordusu için kapı, taht kavgaları için de sığınak olabilirdi. @decide Genç padişah onu almaya kararlıydı.`,
  },
  {
    id: 'fortress', title: 'Boğazkesen', seal: '1452',
    text: `@north İlk hamle şehrin kuzeyinde, Boğaz'da yapıldı. @anadolu Anadolu yakasında, büyük dedesi Yıldırım Bayezid'in yaptırdığı Anadolu Hisarı zaten vardı. @build {1452|Bin dört yüz elli iki} baharında Mehmed tam karşısına yeni bir kale kurdurdu. @months Kale dört beş ay gibi kısa bir sürede tamamlandı. @narrow Burası Boğaz'ın en dar yeridir: iki kıyı arası yaklaşık altı yüz altmış metre. @guns İki kıyıdaki toplar, Boğaz'dan geçmek isteyen gemileri durdurabiliyordu. @name Kalenin adı da bunu anlatır: Boğazkesen. @today Bugün ona Rumeli Hisarı diyoruz. @cut Karadeniz'den gelen gemiler artık Osmanlı izni olmadan şehre ulaşamazdı.`,
  },
  {
    id: 'cannon', title: 'Dev Top', seal: '1452 – 1453',
    text: `@urban Bu sırada Urban adında, Macaristan'dan gelen bir top dökümcüsü ortaya çıktı. @offer Önce Bizans imparatoruna gitti, ama imparator istediği ücreti ödeyemedi. @edirne Urban da Edirne'ye, Mehmed'e geldi ve orada dev bir top döktü. @barrel Namlusu sekiz metreye yaklaşıyordu. @ball Attığı taş gülleler yüzlerce kilogram ağırlığındaydı. @oxen Onu şehrin önüne getirmek için altmış öküz gerekti. @slow Ama çok yavaştı: bir kez doldurmak saatler sürüyor, günde ancak birkaç atış yapılabiliyordu. @myth Çoğumuz topun ilk kez burada kullanıldığını sanırız. @before Aslında toplar Avrupa'da yüz yılı aşkın süredir vardı; Osmanlılar da bu şehre karşı {1422'de|bin dört yüz yirmi ikide} top kullanmıştı. @new Yeni olan, bu büyüklükteydi.`,
  },
  {
    id: 'siege', title: 'Kuşatma Başlıyor', seal: '6 Nisan 1453', day: 0,
    text: `@date {6 Nisan 1453|Altı Nisan, bin dört yüz elli üç.} @army Osmanlı ordusu kara surlarının önüne dizildi. @tent Padişahın otağı, surların en zayıf sayılan yerinin, {Lykos|Likos} vadisinin karşısına kuruldu. @count Kuşatanların sayısı tartışmalı; tarihçiler genellikle elli ile seksen bin arasında tahmin ediyor. @def Surların arkasında ise yaklaşık yedi bin savunucu vardı. @gius Aralarında Cenevizli komutan {Giustiniani|Custinyani} ve yanında getirdiği yedi yüz asker de bulunuyordu. @fire Toplar gürledi ve surlar her gün dövülmeye başladı. @night Ama her gece savunucular yıkılan yerleri toprak, taş ve kazıklarla yeniden kapattı.`,
  },
  {
    id: 'chain', title: "Haliç'teki Zincir", seal: '20 Nisan 1453', day: 14,
    text: `@horn Şehrin kuzeyinde, Haliç'e bakan deniz surları vardı. @remember Hatırlarsanız {1204'te|bin iki yüz dörtte} şehri düşüren saldırı buradan gelmişti. @chain Bu kez savunucular Haliç'in ağzına, karşıdaki Galata'ya uzanan kalın bir zincir gerdi. @safe Zincirin arkasında gemileri güvendeydi. @ships Yirmi Nisan'da dört gemi Marmara'dan geldi. @attack Osmanlı donanması onları durdurmaya çalıştı, @tall ama yüksek bordalı gemiler, rüzgârın da yardımıyla, @through saatler süren bir savaştan sonra zincirin arkasına geçmeyi başardı. @hope Şehirde umut yeniden doğdu.`,
  },
  {
    id: 'overland', title: 'Karadan Yürüyen Gemiler', seal: '21–22 Nisan 1453', day: 15.5,
    text: `@answer Mehmed'in cevabı, bu kuşatmanın en akılda kalan anı oldu. @around Zinciri kırmak yerine onu dolaşmaya karar verdi. @logs Galata'nın arkasındaki tepelere kütüklerden bir yol döşendi, kütükler yağlandı. @night Yirmi bir Nisan'ı yirmi ikiye bağlayan gece, gemiler Boğaz'dan karaya çekildi. @climb Öküzlerin ve insanların gücüyle tepeyi tırmandılar, @down öbür yamaçtan da Haliç'e indiler. @dawn Sabah olduğunda savunucular, yetmiş kadar Osmanlı gemisini Haliç'in içinde gördü. @unbroken Zincir hiç kırılmamıştı. @spread Ama artık savunucular Haliç kıyısındaki surları da korumak zorundaydı.`,
  },
  {
    id: 'may', title: 'Uzun Mayıs', seal: 'Mayıs 1453', day: 40,
    text: `@weeks Haftalar geçti. @thin Az sayıdaki savunucu artık hem kara surlarına hem Haliç'e dağılmıştı. @mines Osmanlılar surların altına tüneller kazdı; @counter savunucular bunları karşı tünellerle bulup çökertti. @breach Toplar {Lykos|Likos} vadisinde surlarda büyük gedikler açtı. @repair Gedikler her gece yamanıyordu, ama yamayacak insan azalıyordu. @moon Yirmi iki Mayıs gecesi ay tutuldu; @omen şehirde birçok kişi bunu kötüye yordu. @tired Savunucular yorgun ve uykusuzdu.`,
  },
  {
    id: 'assault', title: 'Son Saldırı', seal: '29 Mayıs 1453', day: 53,
    text: `@date {29 Mayıs|Yirmi dokuz Mayıs}, gece yarısından sonra. @begin Son saldırı başladı. @w1 Önce düzensiz birlikler surlara yüklendi. @w2 Ardından Anadolu birlikleri. @w3 Şafağa doğru da padişahın en seçkin askerleri, yeniçeriler. @gius Tam o sırada {Giustiniani|Custinyani} ağır yaralandı ve savaş alanından çekildi. @collapse Komutanlarının gittiğini gören savunma çözüldü. @flag Osmanlı sancağı surlara dikildi; geleneğe göre bunu ilk yapan Ulubatlı Hasan'dı. @emperor Son imparator {XI. Konstantin|On Birinci Konstantin} de o sabah hayatını kaybetti; nasıl öldüğü kesin bilinmiyor.`,
  },
  {
    id: 'entry', title: 'Şehre Giriş', seal: '29 Mayıs – 1 Haziran 1453', day: 53,
    text: `@enter Aynı gün öğleden sonra Mehmed şehre girdi @sophia ve doğruca Ayasofya'ya gitti. @mosque Dokuz yüz yılı aşkın bu yapı camiye çevrildi; ilk cuma namazı bir Haziran'da kılındı. @plunder Şehir, dönemin savaş geleneğine göre yağmalandı; binlerce kişi öldü ya da esir alındı. @rebuild Sonra Mehmed şehri yeniden kurmaya girişti: @settle imparatorluğun dört bir yanından insanlar getirtti, @patriarch Rum Ortodoks patrikliğini yeniden kurdurdu. @capital Osmanlı başkenti Edirne'den buraya taşındı.`,
  },
  {
    id: 'meaning', title: 'Bir Çağın Sonu', seal: '330 → 1453',
    text: `@rome {330'da|Üç yüz otuzda} başkent olan Doğu Roma, bin yüz yılı aşkın bir süreden sonra sona ermişti. @kayser Mehmed kendini Roma'nın mirasçısı saydı ve {Kayser-i Rum|Kayseri Rum} unvanını kullandı. @fatih Tarih ona bir ad verdi: Fatih, yani fetheden. @age Birçok tarihçi bu olayı, Orta Çağ'ı bitirip Yeni Çağ'ı başlatan olaylardan biri sayar. @scholars Bir kısmı daha önce, bir kısmı fetihten sonra İtalya'ya giden Bizanslı bilginler, Rönesans'ı besleyen eski Yunan eserlerini de yanlarında götürdü. @myth Bir yanlışı da düzeltelim: surlar toplarla yerle bir edilmedi. @standing Kara surlarının büyük bölümü bugün hâlâ ayakta.`,
  },
  {
    id: 'answer', title: 'Elli Üç Gün', seal: '6 Nisan – 29 Mayıs 1453',
    text: `@q Başta sormuştuk: bin yıllık surlar elli üç günde nasıl aşıldı? @s1 Birincisi, Boğaz kesildi ve şehir dışarıdan gelecek yardımdan koparıldı. @s2 İkincisi, dev toplar surları her gün dövdü. @s3 Üçüncüsü, gemiler karadan Haliç'e indi ve zaten az olan savunucular daha da dağıldı. @s4 Dördüncüsü, yorgun savunmaya karşı büyük ve iyi düzenlenmiş son bir saldırı yapıldı. @all Yani fethi tek bir top ya da tek bir gün getirmedi; plan, teknoloji, cesaret ve sabır birlikte getirdi. @istanbul Konstantinopolis'in adı zamanla İstanbul oldu.`,
  },
];
