// The narration, written with the documentary voice (.claude/skills/narration/formats/documentary.md):
// present tense, one protagonist, say what the picture cannot show, questions that open early and
// pay off later, and silences where the picture speaks. One recording per chapter.
// `text` is what the subtitles show, `say` (when given) how the narrator reads it.
// `pre` / `post`: seconds of picture without narration before / after the recording.
// `cues` tie scene events to the moment the narrator reaches a phrase (see timeline.js).
// Every statement is backed by RESEARCH.md.

export const CHAPTERS = [
  {
    id: 'acilis', title: 'Karıncanın Gözünde Hayat', pre: 4.2, post: 0.8,
    text: 'Sabah. Çimenlerin dibinde, gözümüzün hiç inmediği bir yerde bir dünya uyanıyor. Şu kayalar, aslında kum taneleri. Şu yeşil kuleler, birer çim yaprağı. Ve yuvanın ağzında, bu dünyanın sakinlerinden biri beliriyor. Boyu dört beş milimetre. Akşam olmadan yuvaya geri dönebilecek mi?',
    cues: { rocks: 'Şu kayalar', grains: 'aslında kum', towers: 'Şu yeşil', resident: 'yuvanın ağzında', size: 'Boyu dört', follow: 'Akşam olmadan' },
  },
  {
    id: 'olcek', title: 'Dev Bir Dünya', pre: 1.2,
    text: 'Onun ölçeğinde her şey değişir. Karıncayı bir insan boyuna büyütseydik, 7,5 santimlik bu çim yaprağı otuz metreyi aşan bir kule olurdu. On katlı bir bina. İri bir kum tanesi, belimize gelen bir kaya. Bu çiy damlası ise neredeyse onun boyunda bir su küresi. Önünde uzun bir yol var.',
    say: 'Onun ölçeğinde her şey değişir. Karıncayı bir insan boyuna büyütseydik, yedi buçuk santimlik bu çim yaprağı otuz metreyi aşan bir kule olurdu. On katlı bir bina. İri bir kum tanesi, belimize gelen bir kaya. Bu çiy damlası ise neredeyse onun boyunda bir su küresi. Önünde uzun bir yol var.',
    cues: { human: 'Karıncayı bir insan', blade: 'santimlik bu çim', grain: 'İri bir kum', drop: 'Bu çiy damlası', go: 'Önünde uzun' },
  },
  {
    id: 'beden', title: 'Bir İşçinin Bedeni', pre: 1.5,
    text: 'Bu bir işçi, yani bir dişi; yuvadaki işçilerin hepsi dişidir. Okulda böceklerin üç parçadan oluştuğunu öğreniriz: baş, göğüs, karın. Karıncada sınırlar başka yerden geçer. Göğüs sandığımız parçaya, karnın ilk halkası kaynaşmıştır. Biyologlar bu birleşik parçaya mezozoma der. İnce bel ise karnın ikinci halkası. Altı bacağın hepsi mezozomadan çıkar. İskeleti dışında: kitinden bir zırh. Ve akciğeri yok. Hava, yanlardaki minik deliklerden ince borucuklarla bedene yayılır.',
    cues: { female: 'Bu bir işçi', school: 'Okulda', parts: 'baş, göğüs', fused: 'Göğüs sandığımız', meso: 'mezozoma der', waist: 'İnce bel', legs: 'Altı bacağın', armor: 'İskeleti', breath: 'Ve akciğeri' },
  },
  {
    id: 'gozler', title: 'Bulanık Bir Mozaik', pre: 0.8, post: 0.8,
    text: 'Peki o bizi görebilir mi? Başının iki yanında, parlak iki kubbe var. Her biri, petek gibi dizilmiş minik merceklerden oluşan bir bileşik göz. Her gözde yalnızca yüz kadar mercek. Her mercek, dünyadan tek bir nokta yakalar. Yani karşıdan gelen kardeşini aşağı yukarı böyle görür: bulanık bir nokta mozaiği. Işığı, gölgeyi, bir kıpırtıyı seçer. Ama bir yüzü asla. Bizim gördüğümüzden yüzlerce kat bulanık bir dünya bu.',
    cues: { eye: 'Başının iki', facets: 'Her biri, petek', hundred: 'yalnızca yüz', point: 'Her mercek', mosaic: 'Yani karşıdan', motion: 'Işığı, gölgeyi', blur: 'Bizim gördüğümüzden' },
  },
  {
    id: 'koku', title: 'Antenlerle Görmek', pre: 0.8, post: 1.2,
    text: 'Onun dünyası gözle değil, antenle kurulur. On iki halkalı, dirsekli iki anten hiç durmadan yoklar. Onlarla koklar, tadar, dokunur; nemi ve titreşimi bile hisseder. Karıncalarda koku alma genlerinin sayısı üç yüzü, dört yüzü bulur; bir meyve sineğinde altmış kadardır. Havada, bizim hiç alamadığımız bir harita asılı duruyor. Yuvanın kokusu. Uzaktaki bir tatlının kokusu. Ve eski yolların izleri.',
    cues: { antenna: 'On iki halkalı', senses: 'Onlarla koklar', genes: 'Karıncalarda koku', map: 'Havada' },
  },
  {
    id: 'kimlik', title: 'Kimlik Kontrolü', pre: 0.6, post: 1.4,
    text: 'Karşıdan biri geliyor. Durur, antenler uzanır. Her koloninin kendine özgü bir kokusu var; zırhın üstündeki ince, yağlı bir tabakada saklı. Koku tanıdık: bir yuvadaş. Yollar ayrılır. Ama bu yeni gelen, başka bir yuvadan. Çeneler açılır. Karıncalar kimlik kartlarını üzerlerinde taşır.',
    cues: { touch: 'Durur, antenler', odor: 'Her koloninin', mate: 'Koku tanıdık', foe: 'Ama bu yeni', card: 'Karıncalar kimlik' },
  },
  {
    id: 'iz', title: 'Görünmez Yollar', pre: 0.8, post: 1.8,
    text: 'Ve sonra, bir ödül. Yere dökülmüş tatlı bir damla. Kursağını, yani yuvaya taşıdığı sosyal midesini dolduruyor. Bu tatlının çoğu onun değil, yuvanın. Dönüş yolunda arkasında, bağırsağından gelen görünmez bir koku bırakıyor: bir feromon izi. Yuvada kardeşleri bu izi buluyor. Yiyecek bulan her karınca izi biraz daha tazeliyor. Damla bitince iz yenilenmez; bir saat içinde büyük ölçüde uçup gider. Yol, tam gerektiği kadar yaşar.',
    cues: { find: 'Ve sonra', drink: 'Kursağını', lay: 'Dönüş yolunda', trail: 'bir feromon izi', recruit: 'Yuvada kardeşleri', reinforce: 'Yiyecek bulan', fade: 'Damla bitince', end: 'Yol, tam' },
  },
  {
    id: 'kisayol', title: 'Lidersiz Akıl', pre: 0.6,
    text: 'Kim planlıyor bu yolları? Hiç kimse. Bilim insanları bunu bir laboratuvarda sınadı. Yuvayı yiyeceğe iki köprüyle bağladılar: biri kısa, biri uzun. Başta trafik ikiye bölünür. Ama kısa köprüden gidenler daha çabuk döner, izlerini daha sık tazeler. Koku kısa yolda birikir ve karıncalar giderek oraya kayar. Emir veren bir kraliçe yok. Harita yok. Binlerce küçük karardan akıllıca bir düzen doğuyor. Bunun adı kendiliğinden örgütlenme.',
    cues: { who: 'Kim planlıyor', exp: 'Bilim insanları', bridges: 'Yuvayı yiyeceğe', split: 'Başta trafik', faster: 'Ama kısa', build: 'Koku kısa', win: 'Emir veren', noleader: 'Harita yok', order: 'Binlerce küçük', self: 'Bunun adı' },
  },
  {
    id: 'guc', title: 'Küçük ama Güçlü', pre: 1.0,
    text: 'Öğleye doğru bir tohum. Bazı karıncalar kendi ağırlığının onlarca katını taşıyabilir. Bunun sırrı süper bir güç değil; küçüklüğün kendisi. Bir canlıyı iki kat büyütelim. Kaslarının kesiti dört kat artar, ağırlığı ise sekiz kat. Boy büyüdükçe ağırlık, güçten hep daha hızlı büyür. İnsan boyunda bir karınca araba kaldıramazdı. Büyük olasılıkla kendi ağırlığını bile zor taşırdı.',
    cues: { carry: 'Öğleye doğru', notsuper: 'Bunun sırrı', double: 'Bir canlıyı', area: 'Kaslarının kesiti', volume: 'ağırlığı ise', faster: 'Boy büyüdükçe', giant: 'İnsan boyunda' },
  },
  {
    id: 'fizik', title: 'Küçüklerin Fiziği', pre: 1.6,
    text: 'Küçük olmak fiziği de değiştirir. Bir çim yaprağının ucunda, tek bir yanlış adım. Düşüyor. Ama fazla hızlanamaz; hava onu frenler. Yüksek bir ağaçtan bile düşse çoğu zaman kalkıp yürür. Onun için asıl tehlike su. İri bir yağmur damlası, ondan birkaç kat ağırdır. Ve suyun yüzey gerilimi, küçük bir canlıyı yapışkan bir tuzak gibi tutabilir. Bu yüzden çiy damlasına yaklaşırken temkinli.',
    cues: { fall: 'Düşüyor', land: 'Yüksek bir', water: 'Onun için asıl', rain: 'İri bir yağmur', tension: 'Ve suyun', sip: 'Bu yüzden çiy' },
  },
  {
    id: 'ciftlik', title: 'Yaprak Biti Çobanları', pre: 1.2, post: 1.6,
    text: 'Bir bitki sapında, küçük siyah bir sürü: yaprak bitleri. Bitkinin özsuyunu emerler. Bu su şekerce zengin, ama proteince fakir. Fazla şekeri tatlı damlalar hâlinde dışarı atarlar: ballı çiy. Karıncamız bir biti antenleriyle okşuyor. Ve bit, bir damla veriyor. Karşılığında karıncalar sürüyü avcılardan korur. Bir uğur böceği yaklaşıyor, ama fazla oyalanmıyor. İki taraf da kazançlı. Adı mutualizm.',
    cues: { aphids: 'küçük siyah', sap: 'Bitkinin özsuyunu', honeydew: 'Fazla şekeri', stroke: 'Karıncamız bir biti', drop: 'Ve bit, bir damla', guard: 'Karşılığında', mutual: 'İki taraf' },
  },
  {
    id: 'yuva', title: 'Yeraltı Şehri', pre: 0.8,
    text: 'Akşamüstü. Dolu kursağıyla yuvaya dönüyor. Bugün eve dönmeyi başardı. Toprağın altında, odalardan ve tünellerden bir şehir var. Kraliçe burada. Tek işi yumurtlamak. Laboratuvarda yaşayan bir siyah bahçe karıncası kraliçesi 28 yılı aşarak bir rekor kırdı. Yumurtadan larva çıkar, larva ipek bir koza örer. Karınca yumurtası sandığımız bu beyaz taneler, aslında kozadır. Gençler içeride, yavruların başında. Yaşlandıkça dışarı çıkarlar; en tehlikeli iş en yaşlılara düşer. Taşıdığı tatlıyı ağızdan ağıza paylaşıyor. Tek bir toplayıcının getirdiği besin, yüz kadar yuvadaşa ulaşabilir.',
    say: 'Akşamüstü. Dolu kursağıyla yuvaya dönüyor. Bugün eve dönmeyi başardı. Toprağın altında, odalardan ve tünellerden bir şehir var. Kraliçe burada. Tek işi yumurtlamak. Laboratuvarda yaşayan bir siyah bahçe karıncası kraliçesi yirmi sekiz yılı aşarak bir rekor kırdı. Yumurtadan larva çıkar, larva ipek bir koza örer. Karınca yumurtası sandığımız bu beyaz taneler, aslında kozadır. Gençler içeride, yavruların başında. Yaşlandıkça dışarı çıkarlar; en tehlikeli iş en yaşlılara düşer. Taşıdığı tatlıyı ağızdan ağıza paylaşıyor. Tek bir toplayıcının getirdiği besin, yüz kadar yuvadaşa ulaşabilir.',
    cues: { enter: 'Dolu kursağıyla', city: 'Toprağın altında', queen: 'Kraliçe burada', record: 'Laboratuvarda', brood: 'Yumurtadan', cocoon: 'Karınca yumurtası', young: 'Gençler içeride', old: 'en tehlikeli', share: 'Taşıdığı tatlıyı', hundred: 'Tek bir toplayıcının' },
  },
  {
    id: 'kapanis', title: 'Ayağımızın Altındaki Dünya', pre: 1.0, post: 5.5,
    text: 'Onun gözünden dünya, bulanık bir mozaik. Ama kokulardan örülmüş bir harita. Kum tanelerinin kaya, çiy damlalarının tuzak olduğu bir yer. Tek başına küçük bir canlı. Birlikte, planı olmadan yolunu bulan bir zekâ. Şu anda dünyada yaklaşık yirmi katrilyon karınca yaşıyor. Bir dahaki sefere yere baktığınızda, ayağınızın dibindeki bu dünyayı hatırlayın.',
    cues: { back: 'Onun gözünden', mosaic: 'bulanık bir mozaik', world: 'Kum tanelerinin', together: 'Tek başına', count: 'Şu anda dünyada', remember: 'Bir dahaki' },
  },
];
