// The narration, in the documentary voice (.claude/skills/narration/formats/documentary.md):
// present tense, one protagonist (a forager in her last week), say what the picture cannot show,
// silences where the picture speaks. One recording per chapter.
// `text` is what the subtitles show, `say` (when given) how the narrator reads it.
// `pre` / `post`: seconds of picture without narration before / after the recording.
// `cues` tie scene events to the moment the narrator reaches a phrase (see timeline.js).
// `clock` is the hour of the bee's day the chapter happens at. Every statement is backed by RESEARCH.md.

export const CHAPTERS = [
  {
    id: 'safak', title: 'Bal Arısının Bir Günü', clock: '05.40', place: 'şafak', pre: 6.0, post: 1.6,
    text: 'Yaşlı bir ıhlamurun gövdesinde bir kovuk. İçeride, zifiri karanlıkta, on binlerce arı yaşıyor. Birazdan içlerinden biri, bir iki kilometre ötedeki çiçeklerin yerini bu karanlıkta ötekilere tarif edecek. Harita yok. Söz yok. Işık bile yok. Bunu nasıl yapıyor? Cevap, onun bir gününde saklı.',
    cues: { tree: 'Yaşlı bir', dark: 'İçeride', one: 'Birazdan', nomap: 'Harita yok', how: 'Bunu nasıl', day: 'Cevap, onun' },
  },
  {
    id: 'hafta', title: 'Son Hafta', clock: '06.10', place: 'kovuk ağzı', pre: 1.8, post: 2.6,
    text: 'Bu işçi üç haftalık. Hayatının ilk yarısını kovanın içinde geçirdi. Önce hücre temizledi. Sonra larvaları besledi, karnındaki bezlerden mum çıkarıp petek ördü. Birkaç gün kapıda bekçilik yaptı. Sonra kısa uçuşlarla kovuğun çevresini ezberledi: ağaçları, ufuk çizgisini, kapının yerini. Şimdi son işine başladı: dışarı çıkıp yiyecek toplamak. Bu işe başlayan bir arı ortalama bir hafta kadar yaşar. Bugün, o haftanın günlerinden biri.',
    cues: { age: 'Bu işçi', clean: 'Önce hücre', nurse: 'Sonra larvaları', wax: 'mum çıkarıp', guard: 'Birkaç gün', orient: 'Sonra kısa', forage: 'Şimdi son', week: 'Bu işe', today: 'Bugün, o' },
  },
  {
    id: 'gok', title: 'Gökyüzü Pusulası', clock: '07.30', place: 'çayır üstü', pre: 2.6, post: 3.6,
    text: 'Hava 12 dereceyi geçince havalanıyor. Kanatları saniyede iki yüzü aşkın kez çarpıyor. Yönünü güneşten alıyor. Ama güneş gökte durmadan kayar; arı bu kaymayı iç saatiyle düzeltir. Peki bulut güneşi kapatırsa? Onun gözünde gökyüzü boş değil. Gözlerinin üst kenarı, göğün ışığında bizim göremediğimiz bir düzeni okur: polarize ışık. Güneşin çevresinde halka halka dizilen bir desen. Bir parça mavi gök, ona güneşin nerede olduğunu söylemeye yeter.',
    say: 'Hava on iki dereceyi geçince havalanıyor. Kanatları saniyede iki yüzü aşkın kez çarpıyor. Yönünü güneşten alıyor. Ama güneş gökte durmadan kayar; arı bu kaymayı iç saatiyle düzeltir. Peki bulut güneşi kapatırsa? Onun gözünde gökyüzü boş değil. Gözlerinin üst kenarı, göğün ışığında bizim göremediğimiz bir düzeni okur: polarize ışık. Güneşin çevresinde halka halka dizilen bir desen. Bir parça mavi gök, ona güneşin nerede olduğunu söylemeye yeter.',
    cues: { takeoff: 'Hava 12', wings: 'Kanatları saniyede', sun: 'Yönünü güneşten', drift: 'Ama güneş', cloud: 'Peki bulut', beeview: 'Onun gözünde', pol: 'polarize ışık', rings: 'Güneşin çevresinde', patch: 'Bir parça' },
  },
  {
    id: 'cayir', title: 'İki Çayır', clock: '09.00', place: 'çayır', pre: 2.2, post: 3.4,
    text: 'Bir buçuk kilometre ötede, çiçek açmış bir çayır. Bizim gördüğümüz bu. Onun gördüğü ise başka. Her bileşik gözü beş binden fazla küçük birimden oluşur; dünya ona ince bir mozaik gibi gelir. Maviyi ve yeşili görür, bir de ultraviyoleyi. Kırmızıyı göremez; kırmızı ona koyu görünür. Bu sarı çiçeğin ortasında ise bizim hiç göremediğimiz bir hedef tahtası var. Nektarın yerini gösteren bir işaret. Bu sabah hangi türle başladıysa, gün boyu çoğunlukla ona sadık kalacak.',
    cues: { meadow: 'Bir buçuk', ours: 'Bizim gördüğümüz', theirs: 'Onun gördüğü', mosaic: 'Her bileşik', uv: 'Maviyi ve', red: 'Kırmızıyı', target: 'Bu sarı çiçeğin', guide: 'Nektarın yerini', constancy: 'Bu sabah hangi' },
  },
  {
    id: 'yuk', title: 'Yük', clock: '10.30', place: 'çiçek', pre: 1.6, post: 2.8,
    text: 'Hortumunu uzatıp nektarı çekiyor. Nektarın çoğu sudur. Onu midesinde değil, ayrı bir kesede taşır: bal midesinde. Bir seferde onlarca, bazen yüzlerce çiçeğe konar. Arka bacaklarında, polen sepeti denen çukurlarda iki küçük topak büyür. Eve dönerken kendi ağırlığının yarısına yakın bir yük taşıyor. Bal yapımı da daha yolda başlıyor: arı, nektarın suyunu uçarken ağzından buharlaştırıyor.',
    cues: { tongue: 'Hortumunu', water: 'Nektarın çoğu', crop: 'Onu midesinde', flowers: 'Bir seferde', pollen: 'Arka bacaklarında', load: 'Eve dönerken', evap: 'Bal yapımı' },
  },
  {
    id: 'donus', title: 'Eve Giden Ok', clock: '11.30', place: 'dönüş', pre: 1.6, post: 2.8,
    text: 'Gidiş yolu dolambaçlıydı. Dönüş yolu dümdüz. Arı, uçtuğu her yönü ve her mesafeyi aklında topluyor; sonunda eve giden oku biliyor. Mesafeyi yorgunluğundan değil, gözünden ölçer. Altından akıp geçen görüntü ne kadar çoksa, yol o kadar uzun. Deneylerde dar ve desenli bir tünelden geçen arılar, gerçekte uçtuklarından çok daha uzun bir yol bildirdi. Şimdi bu yolu başkalarına anlatması gerek.',
    cues: { outbound: 'Gidiş yolu', straight: 'Dönüş yolu', integrate: 'uçtuğu her', arrow: 'eve giden oku', eye: 'Mesafeyi yorgunluğundan', flow: 'Altından akıp', tunnel: 'Deneylerde', tell: 'Şimdi bu yolu' },
  },
  {
    id: 'kovan', title: 'Kovanın İçi', clock: '11.50', place: 'kovuk içi', pre: 2.2, post: 3.6,
    text: 'Hava dışarıda nasıl olursa olsun, yavruların olduğu bölüm 35 derece civarında tutulur. Bazı arılar kanatlarını oynatmadan uçuş kaslarını titreterek ısı üretiyor. Petek, binlerce altıgen hücreden oluşuyor. Altıgen, en az mumla en çok alanı çevreleyen biçim. Mum ucuz değil: bir kilo mum için arılar birkaç kilo bal yakar. Ve burada hiç ışık yok. Bundan sonra olacak her şey dokunarak, koklayarak ve titreşerek olacak.',
    say: 'Hava dışarıda nasıl olursa olsun, yavruların olduğu bölüm otuz beş derece civarında tutulur. Bazı arılar kanatlarını oynatmadan uçuş kaslarını titreterek ısı üretiyor. Petek, binlerce altıgen hücreden oluşuyor. Altıgen, en az mumla en çok alanı çevreleyen biçim. Mum ucuz değil: bir kilo mum için arılar birkaç kilo bal yakar. Ve burada hiç ışık yok. Bundan sonra olacak her şey dokunarak, koklayarak ve titreşerek olacak.',
    cues: { warm: 'Hava dışarıda', heater: 'Bazı arılar', comb: 'Petek, binlerce', hex: 'Altıgen, en az', wax: 'Mum ucuz', nolight: 'Ve burada', senses: 'Bundan sonra' },
  },
  {
    id: 'dans', title: 'Karanlıkta Dans', clock: '12.10', place: 'petek', pre: 2.2, post: 4.0,
    text: 'Kovanda petekler dikey durur. Arı bir peteğin üstünde küçük sekizler çiziyor. Sekizin ortasında düz bir koşu var; bu koşuda karnını hızla sallıyor. Bütün mesaj bu koşuda. Karanlıkta güneş yok, ama yerçekimi var. Peteğin yukarısı, güneşin yönü demek. Çiçekler güneşin 40 derece sağındaysa, koşu da yukarının 40 derece sağına. Koşunun süresi ise uzaklığı söyler. Her saniye kabaca bir kilometre; ama her arının ölçeği biraz farklı.',
    say: 'Kovanda petekler dikey durur. Arı bir peteğin üstünde küçük sekizler çiziyor. Sekizin ortasında düz bir koşu var; bu koşuda karnını hızla sallıyor. Bütün mesaj bu koşuda. Karanlıkta güneş yok, ama yerçekimi var. Peteğin yukarısı, güneşin yönü demek. Çiçekler güneşin kırk derece sağındaysa, koşu da yukarının kırk derece sağına. Koşunun süresi ise uzaklığı söyler. Her saniye kabaca bir kilometre; ama her arının ölçeği biraz farklı.',
    cues: { vertical: 'Kovanda petekler', eight: 'küçük sekizler', run: 'Sekizin ortasında', message: 'Bütün mesaj', gravity: 'Karanlıkta güneş', up: 'Peteğin yukarısı', angle: 'Çiçekler güneşin', duration: 'Koşunun süresi', km: 'Her saniye' },
  },
  {
    id: 'okumak', title: 'Dansı Okumak', clock: '12.20', place: 'petek', pre: 1.4, post: 3.0,
    text: 'Etrafındakiler bu dansı görmüyor. Antenleriyle dansçıya dokunuyor, kanatlarının vızıltısını ve peteğin titreşimini hissediyorlar. Dansçı onlara nektarından da tattırıyor; çiçeğin kokusu böylece yayılıyor. Bu dili ilk çözen, Avusturyalı biyolog Karl von Frisch oldu. 1973\'te Nobel aldı. Ama uzun süre şüphe edildi: arılar belki yalnızca kokuyu izliyordu. 2005\'te araştırmacılar, dansı izleyen arılara minik vericiler takıp onları radarla izledi. Arılar hiç görmedikleri bir yere doğrudan uçtu. Yan rüzgâr onları itince rotalarını düzelttiler.',
    say: 'Etrafındakiler bu dansı görmüyor. Antenleriyle dansçıya dokunuyor, kanatlarının vızıltısını ve peteğin titreşimini hissediyorlar. Dansçı onlara nektarından da tattırıyor; çiçeğin kokusu böylece yayılıyor. Bu dili ilk çözen, Avusturyalı biyolog Karl fon Friş oldu. Bin dokuz yüz yetmiş üçte Nobel aldı. Ama uzun süre şüphe edildi: arılar belki yalnızca kokuyu izliyordu. İki bin beşte araştırmacılar, dansı izleyen arılara minik vericiler takıp onları radarla izledi. Arılar hiç görmedikleri bir yere doğrudan uçtu. Yan rüzgâr onları itince rotalarını düzelttiler.',
    cues: { touch: 'Antenleriyle', taste: 'Dansçı onlara', frisch: 'Bu dili', nobel: 'Nobel aldı', doubt: 'Ama uzun süre', radar: 'araştırmacılar', direct: 'Arılar hiç', wind: 'Yan rüzgâr' },
  },
  {
    id: 'bal', title: 'Nektardan Bala', clock: '12.40', place: 'hücre', pre: 1.4, post: 4.4,
    text: 'Yükünü ağızdan ağıza, genç bir alıcı arıya veriyor. Alıcı damlayı defalarca ağzında açıp kapatıyor; suyu biraz daha uçuruyor. Başındaki bezlerden gelen enzimler şekeri parçalıyor ve balı bozulmaya karşı koruyan bir asit üretiyor. Sonra damla bir hücreye ince bir tabaka halinde yayılıyor. Kanat çırpan arılar üstünden hava akıtıyor. Nektarın çoğu suydu. Su %18\'e inince hücre mumla kapanıyor. Artık bal.',
    say: 'Yükünü ağızdan ağıza, genç bir alıcı arıya veriyor. Alıcı damlayı defalarca ağzında açıp kapatıyor; suyu biraz daha uçuruyor. Başındaki bezlerden gelen enzimler şekeri parçalıyor ve balı bozulmaya karşı koruyan bir asit üretiyor. Sonra damla bir hücreye ince bir tabaka halinde yayılıyor. Kanat çırpan arılar üstünden hava akıtıyor. Nektarın çoğu suydu. Su yüzde on sekize inince hücre mumla kapanıyor. Artık bal.',
    cues: { pass: 'Yükünü ağızdan', bubble: 'Alıcı damlayı', enzyme: 'Başındaki bezlerden', spread: 'Sonra damla', fan: 'Kanat çırpan', water: 'Nektarın çoğu', cap: 'Su %18', honey: 'Artık bal' },
  },
  {
    id: 'gece', title: 'Gece', clock: '20.10', place: 'kovuk', pre: 3.2, post: 7.0,
    text: 'Güneş batarken son seferinden dönüyor. Bugün on kadar sefer yaptı. Gece toplayıcılar uyur. Antenleri sarkar, kasları gevşer, bedeni soğur. Gece uyutulmayan arıların ertesi günkü dansları daha dağınık çıkıyor. Bir arı bütün ömrü boyunca yarım gram kadar bal yapar. Bir çay kaşığının küçük bir parçası. Bu arının belki birkaç günü kaldı. Ama dansını izleyenler, çiçeklerin yolunu artık biliyor. Yarın sabah, kovanın karanlığında, başka bir arı gökyüzünü yeniden dans edecek.',
    cues: { dusk: 'Güneş batarken', trips: 'Bugün on', sleep: 'Gece toplayıcılar', droop: 'Antenleri sarkar', insomnia: 'Gece uyutulmayan', half: 'Bir arı bütün', spoon: 'Bir çay', days: 'Bu arının', know: 'Ama dansını', tomorrow: 'Yarın sabah' },
  },
];
