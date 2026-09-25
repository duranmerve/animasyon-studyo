// The story: chapters, subtitles, camera shots, labels and inset diagrams.
// Chapter length follows from its subtitles (reading speed), so text never flashes past.
// Shot keys: [u (0..1 of the chapter), camera position, look-at target, fov].

export const CHAPTERS = [
  {
    id: 'intro', title: 'Kesit', lead: 0.8,
    cues: [
      'Bu, çok işlevli bir lazer yazıcı. Yazdırabilir, tarayabilir ve fotokopi çekebilir.',
      'Yan tarafını kesip açtık. Bir sayfanın ekrandan kâğıda, sonra da fotokopiye uzanan yolculuğunu içeriden izleyeceğiz.',
    ],
    shots: [[0, [70, 62, 150], [-8, 16, 0], 34], [0.45, [44, 44, 104], [-6, 18, 0], 36], [1, [30, 36, 86], [-4, 18, 0], 38]],
    labels: [
      ['scanner', 'Tarayıcı', 0.45, 1, -40, -40],
      ['laserUnit', 'Lazer ünitesi', 0.5, 1, -80, -10],
      ['cartridgeK', 'Toner kartuşları', 0.55, 1, -60, 20],
      ['fuser', 'Fırın', 0.6, 1, -70, 30],
      ['tray', 'Kâğıt tepsisi', 0.65, 1, 40, 40],
      ['outputTray', 'Çıkış tepsisi', 0.5, 1, 60, -40],
    ],
  },
  {
    id: 'send', title: 'Ekrandan yazıcıya',
    cues: [
      'Bilgisayarda bir okul gazetesi açık: başlık, yazılar, renkli bir fotoğraf ve birkaç test deseni.',
      '“Yazdır” düğmesine basınca sayfa, sayılardan oluşan bir veri olarak kabloyla yazıcıya gönderilir.',
    ],
    shots: [[0.1, [-40, 30, 44], [-54, 12, 6], 34], [0.45, [-38, 27, 42], [-53, 11, 6], 32], [0.62, [-28, 30, 58], [-38, 8, 0], 38], [1, [-8, 26, 58], [-18, 8, -4], 40]],
    labels: [['usb', 'Veri kablosu', 0.7, 1, -40, -50]],
  },
  {
    id: 'raster', title: 'Sayfa noktalara bölünür', inset: 'raster',
    cues: [
      'Yazıcının işlemcisi sayfayı çok küçük noktalardan oluşan bir ızgaraya çevirir.',
      'İnç başına 600 nokta çözünürlükte bir A4 sayfa, yaklaşık 35 milyon noktadan oluşur.',
      'Yazıcı bir noktayı ya boyar ya da boş bırakır. Ara tonlar, boyutu değişen noktalarla taklit edilir. Buna yarım ton (raster) denir.',
      'Renkli fotoğraf dört renge ayrılır: camgöbeği, macenta, sarı ve siyah. Kısaca CMYK.',
    ],
    shots: [[0.12, [-2, 8.8, 16], [-4, 8.5, -11], 40], [1, [-1, 8.9, 15], [-4, 8.5, -11], 38]],
    labels: [['board', 'İşlemci kartı', 0.05, 1, -60, -60]],
  },
  {
    id: 'feed', title: 'Kâğıt yola çıkar', step: -1,
    cues: [
      'Kâğıt alma makarası, destenin en üstteki yaprağını sürtünmeyle kavrayıp ileri iter.',
      'Ayırma pedi alttaki yaprakları geri tutar; böylece iki yaprak birden çekilmez.',
      'Yaprak kıvrık yoldan yukarı çıkar. Hizalama makaraları onu düzeltir ve görüntü hazır olana dek bekletir.',
    ],
    shots: [[0.1, [32, 12, 34], [12, 5, 2], 34], [0.55, [33, 14, 34], [15, 6, 3], 34], [0.75, [32, 20, 34], [16, 10, 3], 36], [1, [28, 21, 30], [15, 12, 3], 34]],
    labels: [
      ['pickup', 'Kâğıt alma makarası', 0.02, 0.5, -30, -70],
      ['stack', 'Kâğıt destesi', 0.05, 0.4, -40, 40],
      ['sepPad', 'Ayırma pedi', 0.35, 0.7, 40, 40],
      ['cturn', 'Kıvrık yol', 0.62, 1, 40, 0],
      ['reg', 'Hizalama makaraları', 0.7, 1, -40, -60],
    ],
  },
  {
    id: 'charge', title: 'Tambur yüklenir', step: 0,
    cues: [
      'Yazıcının kalbi ışığa duyarlı tamburdur. Karanlıkta elektrik yükünü tutar, ışık gördüğü yerde yükünü kaybeder.',
      'Önce şarj silindiri, dönen tamburun yüzeyini eşit biçimde eksi yükle kaplar: yaklaşık eksi 600 volt.',
    ],
    inset: 'charge',
    shots: [[0.12, [-2, 24, 26], [-8.5, 15.5, 5], 30], [1, [-2.6, 23, 24], [-8.7, 15.4, 5], 29]],
    labels: [
      ['drumK', 'Işığa duyarlı tambur', 0.03, 1, 60, -40],
      ['chargeK', 'Şarj silindiri', 0.45, 1, -50, -50],
    ],
  },
  {
    id: 'laser', title: 'Lazer görüntüyü çizer', step: 1,
    cues: [
      'Lazer ışını, dakikada on binlerce devir yapan çokgen bir aynaya çarpar | ve tambur boyunca bir uçtan öbür uca süpürülür.',
      'Işın, boyanacak her noktada yanar, boş kalacak yerlerde söner. Işık düşen noktalarda yük kaybolur.',
      'Böylece tamburda gözle görünmeyen, elektrikten bir görüntü oluşur: gizli görüntü.',
      'Tambur kâğıda bir mühür gibi değeceği için bu görüntü ters, yani ayna görüntüsüdür.',
      'Çoğu yazıcıda bu ışın gözle görülmeyen kızılötesi ışıktır; burada kırmızıyla gösteriyoruz.',
    ],
    inset: 'laser',
    shots: [[0.06, [5, 24.6, 22], [0, 23.8, -2], 36], [0.22, [4, 24.8, 21], [-1, 23.7, -2], 34], [0.36, [-1.5, 24, 24], [-7.5, 16, 4], 30], [1, [-2.5, 23, 22], [-8.2, 15.6, 5], 29]],
    labels: [
      ['polygon', 'Çokgen ayna', 0.02, 0.3, 50, -50],
      ['diode', 'Lazer diyotu', 0.05, 0.3, -60, -30],
      ['foldK', 'Yönlendirme aynası', 0.2, 0.45, -60, -40],
      ['laserHitK', 'Lazer noktası', 0.36, 0.75, 60, -40],
    ],
  },
  {
    id: 'develop', title: 'Toner yapışır', step: 2,
    cues: [
      'Toner, plastik ve boyadan yapılmış çok ince bir tozdur. Taneleri yaklaşık 5 ile 10 mikrometredir; bir saç telinden on kat incedir.',
      'Geliştirme silindiri toner tanelerini eksi yükle yükler ve tambura yaklaştırır.',
      'Taneler hâlâ eksi yüklü bölgelerden itilir, yükü silinmiş noktalara çekilip yapışır.',
      'Görünmeyen elektrik görüntüsü artık görünür bir toz görüntüye dönüştü.',
    ],
    inset: 'develop',
    shots: [[0.1, [0, 19, 22], [-7, 14.5, 5], 28], [1, [-0.8, 18.5, 21], [-7.2, 14.4, 5], 27]],
    labels: [
      ['hopperK', 'Toner haznesi', 0.03, 0.6, 60, -40],
      ['devK', 'Geliştirme silindiri', 0.2, 1, 60, 40],
    ],
  },
  {
    id: 'transfer', title: 'Kâğıda aktarılır', step: 3,
    cues: [
      'Kâğıdın altındaki aktarım silindiri artı yüklüdür. Eksi yüklü toner, tamburdan kâğıda çekilir.',
      'Kâğıt buraya gelmeden önce üç tamburun daha altından geçti: sarı, macenta ve camgöbeği. Her biri kendi rengini bıraktı.',
      'Siyah dördüncü ve son katman. Renkli baskının sırrı, bu dört katmanın üst üste binmesidir.',
      'Şu an toner kâğıdın üstünde yalnızca duruyor; parmağınızı sürseniz dağılır.',
    ],
    inset: 'transfer',
    shots: [[0.08, [-2, 14.5, 24], [-8.2, 13.4, 5], 28], [0.3, [-2.4, 14.5, 23], [-8.4, 13.4, 5], 28], [0.45, [6, 24, 38], [0, 14, 2], 34], [0.72, [6, 25, 38], [0, 14, 2], 34], [1, [-12, 20, 24], [-9.6, 14.8, 5], 30]],
    labels: [
      ['transferK', 'Aktarım silindiri', 0.03, 0.34, 50, 40],
      ['belt', 'Taşıma bandı', 0.4, 0.72, 50, 40],
      ['drum0', 'Sarı', 0.42, 0.72, 0, -50],
      ['drum1', 'Macenta', 0.42, 0.72, 0, -50],
      ['drum2', 'Camgöbeği', 0.42, 0.72, 0, -50],
      ['drum3', 'Siyah', 0.42, 0.72, 0, -50],
    ],
  },
  {
    id: 'clean', title: 'Tambur temizlenir', step: 5,
    cues: [
      'Tamburda kalan birkaç tane, temizleme bıçağıyla kazınır ve atık toner bölmesine düşer.',
      'Temizlenen yüzey yeniden yüklenir. Tambur küçük olduğu için bir sayfa boyunca bu döngü üç kereden fazla tekrarlanır.',
    ],
    inset: 'clean',
    shots: [[0.1, [-17, 20, 20], [-9.6, 14.8, 5], 30], [1, [-16.5, 20.5, 21], [-9.8, 14.8, 5], 30]],
    labels: [
      ['bladeK', 'Temizleme bıçağı', 0.03, 1, -60, -40],
      ['wasteK', 'Atık toner', 0.2, 1, -60, 40],
    ],
  },
  {
    id: 'fuse', title: 'Fırında erir', step: 4,
    cues: [
      'Son durak fırın ünitesi. Yaklaşık 180 ile 200 derecedeki ısıtma silindiri tozu eritir, baskı silindiri de kâğıdın liflerine bastırır.',
      'Eriyen plastik soğuyunca kâğıda kalıcı olarak yapışır. Yazıcıdan çıkan kâğıdın sıcak olmasının nedeni budur.',
    ],
    inset: 'fuse',
    shots: [[0.1, [-8, 18, 26], [-16, 13.3, 4], 30], [0.65, [-8.5, 18, 26], [-16.2, 13.5, 4], 30], [1, [-4, 28, 34], [-15, 24, 2], 38]],
    labels: [
      ['heatRoller', 'Isıtma silindiri', 0.04, 0.8, 60, -40],
      ['pressRoller', 'Baskı silindiri', 0.08, 0.8, 60, 40],
    ],
  },
  {
    id: 'output', title: 'Çıktı', loupe: true,
    cues: [
      'Sayfa, baskılı yüzü aşağı bakacak şekilde çıkış tepsisine iner. Böylece sonraki sayfalar doğru sırayla üst üste dizilir.',
      'Büyüteçle bakalım: yazılar dolu siyah; fotoğraf ise dört renkten, farklı açılarla dizilmiş minik noktalardan oluşuyor.',
      'Açılı nokta ızgaraları üst üste binince | küçük çiçekleri andıran rozet desenleri ortaya çıkar.',
    ],
    shots: [[0.06, [6, 33, 44], [-4, 30.5, 0], 38], [0.3, [8, 34, 46], [2, 30.8, 0], 38], [0.44, [44, 30, 70], [40, 24, 16], 40], [1, [44, 26, 60], [40, 24, 16], 40]],
    labels: [['exit', 'Çıkış makaraları', 0.02, 0.3, -40, -50]],
  },
  {
    id: 'scan', title: 'Fotokopi: tarama', inset: 'scan',
    cues: [
      'Şimdi bu sayfanın fotokopisini çekelim. Kapağı açıp sayfayı baskılı yüzü aşağı gelecek şekilde camın köşesine yerleştiriyoruz.',
      'Camın altındaki ışık çubuğu sayfa boyunca ilerler. Beyaz yerler ışığı geri yansıtır, koyu yerler yutar.',
      'Yansıyan ışık aynalar ve bir mercekten geçip ışık sensörüne ulaşır. İkinci ayna grubu yarı hızla ilerler; böylece ışığın yolu hep aynı uzunlukta kalır.',
      'Sensör her satırı sayılara çevirir: 0 siyah, 255 beyaz. Sayfa, yazıcı için yeniden bir sayı ızgarası olur.',
    ],
    shots: [[0.06, [40, 58, 64], [6, 36, 0], 38], [0.26, [30, 56, 58], [0, 37, 0], 38], [0.32, [-4, 35, 9], [2, 38.3, -4], 55], [0.55, [-3, 35, 9], [3, 38.3, -4], 55], [0.62, [2, 36, 11.5], [14, 35.6, -4], 62], [1, [3, 36, 11.5], [14.5, 35.6, -4], 60]],
    labels: [
      ['glass', 'Tarayıcı camı', 0.05, 0.3, -50, -50],
      ['lens', 'Mercek', 0.62, 1, 40, -50],
      ['ccd', 'Işık sensörü (CCD)', 0.66, 1, 50, 30],
    ],
  },
  {
    id: 'copy', title: 'Kopya basılır', step: -1,
    cues: [
      'Taranan görüntü, bilgisayardan gelen bir belge gibi aynı lazer sürecinden geçer.',
      'Siyah-beyaz kopyada yalnızca siyah tambur çalışır; renkli tamburlar boşta bekler.',
    ],
    shots: [[0.1, [32, 40, 84], [-2, 18, 0], 38], [0.35, [4, 22, 36], [-2, 14, 2], 32], [0.85, [4, 22, 36], [-2, 14, 2], 32], [1, [8, 40, 54], [0, 30, 2], 40]],
    labels: [['drum3', 'Yalnızca siyah', 0.35, 0.95, 0, -60]],
  },
  {
    id: 'compare', title: 'Kopyada ne değişti?', loupe: true,
    cues: [
      'İşte orijinal ve kopyası. İlk bakışta benziyorlar ama yakından bakınca farklar ortaya çıkıyor.',
      'Renkler grinin tonlarına dönüştü. Kırmızı fener ile mavi deniz birbirine çok yakın grilere düştü.',
      'Fotoğraftaki noktalar ikinci kez taranıp yeniden noktalandı. İki nokta ızgarası çakışınca hare (moiré) denen dalgalı desenler çıkar.',
      'En açık tonlar soldu ya da kayboldu, koyu tonlar birbirine karıştı. İnce çizgiler ve minik yazılar bulanıklaştı.',
      'Camdaki toz lekeleri, kenardaki gölge ve hafif bir eğiklik de kopyaya geçti.',
    ],
    shots: [[0.02, [30, 60, 80], [0, 20, 20], 40], [0.2, [0, 72, 72], [0, 0, 41], 40], [1, [0, 70, 70], [0, 0, 41], 40]],
    labels: [],
  },
  {
    id: 'generations', title: 'Kopyanın kopyası', loupe: true,
    cues: [
      'Kopyanın kopyası çekildikçe bu kayıplar birikir. Her kuşakta görüntü biraz daha bozulur.',
      'Sekizinci kopyada fotoğraf tanınmaz hâle geldi; küçük yazılar okunmuyor.',
      'Dijital bir dosya ise kaç kez kopyalanırsa kopyalansın bit bit aynı kalır.',
    ],
    shots: [[0.12, [0, 118, 96], [0, 0, 36], 40], [1, [0, 114, 92], [0, 0, 36], 40]],
    labels: [],
  },
  {
    id: 'summary', title: 'Özet', inset: 'summary',
    cues: [
      'Özetle lazer yazıcı altı adımda çalışır: yükle, ışıkla çiz, tozla, aktar, erit, temizle.',
      'Bu yöntemin adı kserografi, yani “kuru yazı”. Chester Carlson ilk kopyasını 22 Ekim 1938\'de çekti.',
      'Şimdi sıra sizde: sahneyi döndürün, sayfaların üzerinde gezinip büyüteçle farkları kendiniz inceleyin.',
    ],
    shots: [[0.15, [58, 70, 150], [-2, 12, 20], 38], [1, [50, 64, 140], [-2, 12, 20], 38]],
    labels: [],
  },
];

export const STEPS = ['Yükle', 'Işıkla çiz', 'Tozla', 'Aktar', 'Erit', 'Temizle'];

export function cueDuration(text) {
  return Math.max(3.8, 1.3 + text.length / 14.5);
}
