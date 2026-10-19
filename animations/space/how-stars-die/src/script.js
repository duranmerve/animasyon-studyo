// Narration script: one recording per section. `text` is what the subtitles show (digits allowed);
// the spoken form lives in narration/lines.json (built by dev/make-lines.mjs from SAY below).
// cues: event name → a phrase that appears exactly once in `text`; the event starts when it is spoken.
export const SECTIONS = [
  {
    id: 'open', title: 'İki yıldız', pre: 1.6, post: 1.0,
    text: "Gökyüzünde yan yana iki yıldız düşünün. Biri Güneş'imiz kadar. Öteki ondan yirmi beş kat ağır. İkisi de ölecek. Ama biri bir mum gibi sessizce sönecek. Öteki öyle patlayacak ki, birkaç haftalığına bütün bir galaksi kadar parlayacak. Saçtığı tozun bir kısmı, bir gün başka bir gezegende birinin kanında dolaşacak. Hangisinin hangi sonu yaşayacağını tek bir sayı belirliyor. Ama önce, bir yıldızı ayakta tutan şeye bakalım.",
    cues: { starA: "Biri Güneş", starB: 'Öteki ondan', die: 'İkisi de ölecek', quiet: 'bir mum gibi', burst: 'Öteki öyle', blood: 'Saçtığı tozun', number: 'tek bir sayı', turn: 'ayakta tutan' },
  },
  {
    id: 'balance', title: 'Bir çekişme', pre: 0.4, post: 1.2,
    text: "Çoğumuz yıldızı yanan bir ateş topu sanırız. Mantıklı: sıcak, parlak, ışık saçıyor. Ama uzayda ateşi besleyecek oksijen yok. Hiçbir ateş de dört buçuk milyar yıl yanmaz. Yıldızın içinde iki güç çekişiyor. Kütle çekimi bütün o gazı her yönden merkeze çekiyor. Merkezde ise sıkışan hidrojen çekirdekleri birbirine kaynaşıp helyuma dönüşüyor. Bu kaynaşmanın adı füzyon. Açığa çıkan enerji gazı ısıtıyor ve dışarı itiyor. İçe çeken ve dışa iten. İkisi denk kaldıkça yıldız ne çöker ne dağılır. Yani bir yıldız yanmıyor. Dengede duruyor. Ve yakıt bittiği gün, çekim kazanmaya başlıyor.",
    cues: { fire: 'yanan bir ateş', cross: 'oksijen yok', years: 'Hiçbir ateş', inside: 'iki güç', gravity: 'Kütle çekimi', fusion: 'hidrojen çekirdekleri', name: 'adı füzyon', push: 'Açığa çıkan', balance: 'İkisi denk', aha: 'Dengede duruyor', lose: 'yakıt bittiği' },
  },
  {
    id: 'mass', title: 'Tek sayı', pre: 0.5, post: 2.8,
    text: "O tek sayı, kütle. Ağır bir yıldızın daha çok yakıtı var. Sezgimiz daha uzun yaşayacağını söyler. Tam tersi oluyor. Ağır yıldızın çekimi merkezini çok daha sert sıkıştırıyor. Merkez daha çok ısınıyor, füzyon hızlanıyor ve yakıt su gibi akıp gidiyor. Güneş gibi bir yıldız on milyar yıl kadar yaşar. Güneş'imiz dört buçuk milyar yaşında. Ömrünün ortasında. Yirmi beş kat ağır bir yıldızın hidrojeni ise yedi milyon yıl kadar dayanıyor. Güneş'in ömrünü bir günlük bir şerit olarak düşünün. Ağır yıldızın bütün hayatı, bu şeridin ilk dakikasına sığar.",
    cues: { fuel: 'daha çok yakıtı', guess: 'Sezgimiz', twist: 'Tam tersi', squeeze: 'çok daha sert', fast: 'su gibi', strip: 'on milyar yıl', now: 'dört buçuk milyar yaşında', heavy: 'yedi milyon', day: 'bir günlük', minute: 'ilk dakikasına' },
  },
  {
    id: 'giant', title: 'Kırmızı dev', pre: 0.6, post: 1.2,
    text: "Önce hafif olanla, bizim yıldızımızla başlayalım. Beş milyar yıl kadar sonra Güneş'in merkezinde hidrojen azalacak. Çekirdek büzülüp ısınacak ve bu ısı dış katmanları şişirecek. Güneş, bugünkünden yüz kat büyük, soğuk ve kırmızı bir deve dönüşecek. Merkür'ü yutacak. Venüs'ü de. Dünya mı? Bunu bugün kimse kesin bilmiyor. Güneş şişerken kütle de kaybedecek. Çekimi zayıfladıkça gezegenler biraz uzaklaşacak. Bazı hesaplar Dünya'nın yutulduğunu, bazıları kıl payı kurtulduğunu söylüyor. Mars ise güvende.",
    cues: { future: 'Beş milyar', core: 'hidrojen azalacak', swell: 'dış katmanları', giant: 'yüz kat büyük', mercury: "Merkür", venus: "Venüs", earth: 'Dünya mı', unknown: 'kimse kesin', drift: 'gezegenler biraz', split: 'Bazı hesaplar', mars: 'Mars ise' },
  },
  {
    id: 'dwarf', title: 'Sessiz son', pre: 0.6, post: 1.6,
    text: "Kırmızı dev uzun yaşamaz. Dış katmanları yavaş yavaş uzaya savrulur. Ortada kalan sıcak çekirdek bu gazı aydınlatır ve on bin yıl kadar parlayan bir kabuk oluşur. Adı gezegenimsi bulutsu. Gezegenlerle ilgisi yok; eski teleskoplarda gezegene benzediği için. Kabuk dağılınca geriye çekirdek kalır. Bir yıldızın kalbi, Dünya büyüklüğünde bir topa sıkışmış. Bu beyaz cüceden bir çay kaşığı alsanız, birkaç ton gelir. Bir fil kadar. İçinde artık füzyon yok. Yalnızca soğuyor. Öyle yavaş soğuyor ki, evren henüz bir tanesinin bile sönmesini görecek kadar yaşlı değil. Güneş'in sonu bu. Patlama yok.",
    cues: { shed: 'uzaya savrulur', glow: 'gazı aydınlatır', name: 'gezegenimsi bulutsu', scope: 'eski teleskoplarda', core: 'geriye çekirdek', earth: 'Dünya büyüklüğünde', spoon: 'çay kaşığı', elephant: 'Bir fil', cool: 'Yalnızca soğuyor', age: 'evren henüz', end: 'Patlama yok' },
  },
  {
    id: 'onion', title: 'Soğan', pre: 0.8, post: 1.0,
    text: "Ağır yıldıza dönelim. Onun da hidrojeni bitince merkezi büzülür. Ama çekimi o kadar güçlü ki, merkezi daha da sıkıştırıp daha da ısıtır. Ve yeni bir yakıt başlar: helyum, karbona dönüşür. O bitince karbon kaynaşır, ardından daha ağır elementler. Her yeni yakıt merkezde yeni bir katman açar. Yıldızın içi bir soğan gibi dizilir. Ama saat hızlanıyor. Hidrojen yedi milyon yıl yetmişti. Karbon yalnızca birkaç yüz yıl. Silisyum ise bir iki gün. Milyonlarca yıllık bir hayatın son sayfası, bir hafta sonundan kısa sürüyor. Ve silisyumun külü demir.",
    cues: { back: 'Ağır yıldıza', squeeze: 'daha da sıkıştırıp', helium: 'helyum', carbon: 'karbon kaynaşır', layers: 'yeni bir katman', onion: 'bir soğan gibi', clock: 'saat hızlanıyor', h: 'yedi milyon', c: 'birkaç yüz yıl', si: 'Silisyum ise', page: 'son sayfası', iron: 'külü demir' },
  },
  {
    id: 'iron', title: 'Kül', pre: 0.6, post: 2.4, cont: true,
    text: "Demir, yıldız için yakıt değil. Kül. Şimdiye kadar her kaynaşma enerji verdi. Demiri kaynaştırmak ise enerji ister. Merkezde demir biriktikçe, dışa iten güç sessizce kayboluyor. Demir çekirdek Dünya'dan küçük, ama Güneş'ten ağır. Ve artık onu hiçbir şey taşımıyor.",
    cues: { ash: 'Kül.', gave: 'enerji verdi', cost: 'enerji ister', fade: 'sessizce kayboluyor', small: "Dünya'dan küçük", heavy: "Güneş'ten ağır", hold: 'hiçbir şey' },
  },
  {
    id: 'collapse', title: 'Çöküş', pre: 0.3, post: 1.4, cont: true,
    text: "Çöküş saniyenin onda birinden kısa sürüyor. Binlerce kilometrelik çekirdek, birkaç on kilometreye iniyor. Düşerken hızı ışık hızının onda birine yaklaşıyor. Merkez öyle sıkışıyor ki, protonlar elektronları yutup nötrona dönüşüyor. Bu nötron yumağı daha fazla sıkışamaz. Düşen katmanlar ona çarpıp geri sekiyor ve dışarı doğru bir şok dalgası yola çıkıyor. Yıldız patlıyor. Bir süpernova. Tuhaf olan şu: gördüğümüz bütün o ışık, açığa çıkan enerjinin küçük bir kırıntısı. Enerjinin yüzde doksan dokuzunu, neredeyse hiçbir şeye çarpmayan parçacıklar götürüyor. Nötrinolar. Saniyeler içinde, görünmeden.",
    cues: { fall: 'Çöküş', shrink: 'Binlerce kilometrelik', speed: 'ışık hızının', neutron: 'protonlar', stiff: 'nötron yumağı', bounce: 'geri sekiyor', boom: 'Yıldız patlıyor', name: 'Bir süpernova', crumb: 'küçük bir kırıntısı', ninety: 'yüzde doksan', nu: 'Nötrinolar', unseen: 'görünmeden' },
  },
  {
    id: 'sn1987', title: '1987', pre: 0.8, post: 1.4,
    text: "1987'nin şubatında, komşu bir galakside, Büyük Macellan Bulutu'nda bir yıldız böyle öldü. Japonya'da, Amerika'da ve Sovyetler Birliği'nde yerin altındaki dedektörler, on üç saniye içinde iki düzine kadar nötrino yakaladı. Işık ise saatler sonra geldi. İnsanlık bir yıldızın ölümünü, görmeden önce yakalamıştı.",
    cues: { year: 'şubatında', lmc: 'Macellan', japan: 'Japonya', detect: 'dedektörler', twenty: 'iki düzine', light: 'Işık ise', felt: 'görmeden önce' },
  },
  {
    id: 'remnant', title: 'Geriye kalan', pre: 0.6, post: 1.6,
    text: "Bunları gözle de gördük. 1054 yazında Çinli gökbilimciler gökyüzünde yeni bir yıldız kaydetti. Haftalarca gündüz bile göründü. Bugün o noktada genişleyen bir gaz bulutu var: Yengeç Bulutsusu. Ortasında, o yıldızın çekirdeği hâlâ dönüyor. Bir nötron yıldızı. Güneş'ten ağır, ama çapı yirmi kilometre kadar. Bir şehrin üstüne koysanız şehri ancak örter. Ondan bir çay kaşığı, milyarlarca ton gelir. Daha ağır yıldızlarda nötronlar bile çekime dayanamaz. Merkez, ışığın bile kaçamadığı bir noktaya çöker: bir kara delik. Bazı yıldızlar bunu belki patlamadan bile yapıyor. 2009'da hafifçe parlayan dev bir yıldız, birkaç yıl sonraki fotoğraflarda yoktu. Patlama yok, ışık yok. Gökbilimciler, doğrudan bir kara deliğe çöktüğünü düşünüyor.",
    cues: { chinese: 'Çinli', day: 'gündüz bile', crab: 'Yengeç', pulsar: 'çekirdeği hâlâ', size: 'yirmi kilometre', city: 'Bir şehrin', spoon: 'çay kaşığı', heavier: 'Daha ağır yıldızlarda', bh: 'ışığın bile', quiet: 'belki patlamadan', flare: 'hafifçe parlayan', gone: 'fotoğraflarda yoktu', think: 'Gökbilimciler' },
  },
  {
    id: 'us', title: 'Biz', pre: 0.8, post: 3.5,
    text: "Peki patlayan yıldızın saçtığı madde nereye gidiyor? Oksijen, kalsiyum, demir. Hepsi uzaya dağılıyor ve yeni gaz bulutlarına karışıyor. Dört buçuk milyar yıl önce, böyle bir buluttan Güneş doğdu. Sonra Dünya. Sonra biz. Kemiklerinizdeki kalsiyum ve kanınızdaki demir, bir yıldızın içinde yapıldı. Bir yüzükteki altının bir kısmı ise büyük ihtimalle iki nötron yıldızının çarpışmasından geldi. Başa dönelim. Gökyüzünde iki yıldız. Hangisinin nasıl öleceğine tek bir sayı karar veriyor: kütle. Hafif olan sessizce söner. Ağır olan patlar ve yeni dünyaların malzemesini saçar. Bir gün Güneş de sönecek. Ama bizi oluşturan madde, ondan çok önce ölen yıldızlardan geldi.",
    cues: { elems: 'Oksijen', scatter: 'uzaya dağılıyor', cloud: 'gaz bulutlarına', sun: 'Güneş doğdu', earth: 'Sonra Dünya', us: 'Sonra biz', bones: 'Kemiklerinizdeki', gold: 'yüzükteki', back: 'Başa dönelim', mass: 'kütle', light: 'Hafif olan', heavy: 'Ağır olan', sunend: 'Bir gün Güneş', final: 'çok önce' },
  },
];

// Spoken forms for the parts of `text` that a voice must not read literally.
export const SAY = [
  ["1987'nin", 'Bin dokuz yüz seksen yedinin'],
  ['1054 yazında', 'Bin elli dört yazında'],
  ["2009'da", 'İki bin dokuzda'],
];
