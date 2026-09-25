// The narration: one recording per section. Shared by the page and tools/lines.mjs.
// A sentence is either written text with {markers}, or [written, spoken] when the spoken form must be spelled
// out by hand (markers then go in the spoken form). Markers tie scene events to the moment a word is spoken.
// Everything else is turned into its spoken form by PRON below (English terms spelled as a Turk says them).

export const SECTIONS = [
  { id: 'intro', title: 'Tek satır, iki saniye', rail: 0, sentences: [
    'Şu satıra bir bak: {code}SpringApplication.run().',
    'Bir sınıf, {main}bir main metodu ve bu tek satır.',
    'Çalıştırıyorsun{go}, ve yaklaşık iki saniye sonra konsolda şu yazıyor: {started}Tomcat, 8080 portunda başladı.',
    'Sen hiçbir sunucu kurmadın, {q}hiçbir nesneyi new ile yaratmadın.',
    'Peki {freeze}o iki saniyede ne oldu?',
    'Bu videoda o anı {slow}bin kat yavaşlatıp içini açacağız.',
  ] },
  { id: 'spring', title: 'Spring ve Boot', rail: 0, sentences: [
    'Önce bir ayrım yapalım.',
    ["Spring, 2000'lerin başından beri Java dünyasının temel çatısı: nesneleri yöneten bir konteyner, üstünde de web, veri erişimi ve güvenlik modülleri.",
      '{spring}spring, iki binlerin başından beri cava dünyasının temel çatısı: {core}nesneleri yöneten bir konteyner, {mods}üstünde de veb, veri erişimi ve güvenlik modülleri.'],
    'Ama bir Spring uygulamasını ayağa kaldırmak eskiden {xml}uzun XML dosyaları, {server}ayrıca kurulan bir sunucu ve bolca ayar demekti.',
    '{boot}Spring Boot, bu yükü üstlenmek için geldi.',
    'Yeni bir çatı değil: {same}altta yine aynı Spring çalışıyor.',
    'Boot yalnızca onu senin yerine, {defaults}akıllı ve değiştirilebilir varsayılanlarla kuruyor.',
  ] },
  { id: 'container', title: 'Konteyner ve bean', rail: 2, sentences: [
    'Her şeyin merkezinde bir kap var: {ctx}ApplicationContext, yani uygulama bağlamı.',
    'Normalde bir nesneye ihtiyacın olduğunda onu {new}kendin new ile yaratırsın.',
    "Spring'de {ioc}bu işi konteyner yapar; buna kontrolün tersine çevrilmesi denir.",
    'Konteynerin yönettiği her nesneye {bean}bean diyoruz.',
    'Ama konteyner nesneleri hemen üretmez. Önce her biri için {def}bir tarif çıkarır: {d1}hangi sınıf, {d2}hangi kapsam, {d3}neye bağımlı.',
    'Bu tarifin adı {bd}BeanDefinition.',
    'Nesneler {make}ancak bütün tarifler hazır olduktan sonra, sırayla üretilir.',
  ] },
  { id: 'di', title: 'Bağımlılık enjeksiyonu', rail: 2, sentences: [
    'Peki bu nesneler birbirini nasıl buluyor?',
    'Diyelim ki {g1}OrderController bir OrderService istiyor; {g2}OrderService de bir OrderRepository ve bir PaymentClient istiyor.',
    'Sen yalnızca {ctor}kurucu metotta neye ihtiyacın olduğunu yazıyorsun.',
    'Konteyner bağımlılık grafiğini çıkarır ve {b1}en alttan başlar: önce repository ve istemci, {b2}sonra servis, {b3}en son controller.',
    'Her nesneyi kurarken gereken parçayı {plug}içine takar. Buna bağımlılık enjeksiyonu diyoruz.',
    'Sınıfın tek bir kurucu metodu varsa {auto}@Autowired yazmana bile gerek yok.',
    ["Bir de uyarı: A, B'yi; B de A'yı istiyorsa, ikisinden hangisi önce kurulacak?",
      'bir de uyarı: {cyc}a, beyi; be de a’yı istiyorsa, ikisinden hangisi önce kurulacak?'],
    'Hiçbiri. Spring Boot {err}böyle bir döngüde uygulamayı hiç başlatmaz; döngüsel bağımlılık varsayılan olarak yasaktır.',
  ] },
  { id: 'lifecycle', title: "Bir bean'in doğumu", rail: 2, sentences: [
    "Bir bean'in doğumu tek adımda olmaz. Onu {belt}bir montaj bandı gibi düşün.",
    '{s1}Önce kurucu metot çağrılır ve çıplak nesne oluşur.',
    '{s2}Sonra bağımlılıkları doldurulur.',
    'Ardından {s3}BeanPostProcessor denen işçiler nesneyi elden geçirir; {s4}araya, @PostConstruct ile işaretlediğin başlangıç metodu girer.',
    'Son istasyonda önemli bir şey olabilir: {s5}işlemci nesneyi olduğu gibi bırakmak yerine, onu saran bir vekil, yani {proxy}proxy döndürebilir.',
    'Konteynere kaydedilen artık {reg}bu vekildir.',
    '{ann}@Transactional, @Async, @Cacheable gibi notasyonların hepsi bu kapıdan çalışır.',
    "Ve varsayılan kapsam {single}singleton: her bean'den uygulama boyunca tek bir tane olur.",
  ] },
  { id: 'annotation', title: '@SpringBootApplication', rail: 2, sentences: [
    'Şimdi ana sınıfa dönelim. Üstündeki {ann}@SpringBootApplication notasyonunu açarsan, {open}içinden üç notasyon çıkar.',
    '{a1}@SpringBootConfiguration: bu sınıf bir yapılandırma sınıfıdır, içinde bean tanımlayabilirsin.',
    '{a2}@ComponentScan: bu sınıfın paketinden başla, alt paketleri tara, işaretli sınıfları bul.',
    '{a3}@EnableAutoConfiguration: gerisini Boot halletsin.',
    'Burada sık düşülen bir tuzak var: tarama {down}yalnızca ana sınıfın paketinden aşağı iner.',
    "Ana paketin dışına koyduğun bir servis {miss}hiç bulunmaz, ve uygulama o bean'i bulamadığını söyleyerek durur.",
  ] },
  { id: 'autoconfig', title: 'Otomatik yapılandırma', rail: 2, sentences: [
    'Sihir sandığımız şeyin asıl yeri burası.',
    "Boot'un her modülünde {file}AutoConfiguration.imports adında bir dosya var. İçinde {list}aday sınıfların bir listesi durur.",
    'Hepsi birlikte yüzü aşkın aday. Boot {test}bunların her birini koşullarla sınar.',
    "{c1}@ConditionalOnClass: şu sınıf classpath'te var mı? Tomcat'in sınıfları yoksa, {c1x}web sunucusu yapılandırması hiç devreye girmez.",
    '{c2}@ConditionalOnProperty: ayarlarda şu özellik açık mı?',
    "Ve en önemlisi {c3}@ConditionalOnMissingBean: kullanıcı bu türde bir bean'i zaten tanımlamış mı?",
    "Senin tanımların her zaman önce işlenir. {mine}Kendi DataSource'unu tanımladıysan, {back}Boot geri çekilir ve kendi varsayılanını kurmaz.",
    'Yani bu iş bir tahmin değil, {chain}bir koşullar zinciri.',
  ] },
  { id: 'starters', title: 'Starter ve classpath', rail: 1, sentences: [
    "Peki classpath'e ne gireceğine kim karar veriyor? {you}Sen, bağımlılıklarla.",
    '{pom}spring-boot-starter-webmvc gibi bir starter, kendi başına {empty}neredeyse boş bir pakettir.',
    'Asıl işi {fan}bir bağımlılık demeti getirmek: {f1}Spring MVC, {f2}gömülü Tomcat, {f3}Jackson.',
    'Pom dosyasına bir satır eklersin, {cp}classpath değişir, {flip}ve koşullar bu kez başka türlü sonuçlanır.',
    'İçeride ne olduğunu görmek istersen, uygulamayı {debug}--debug bayrağıyla başlat.',
    'Boot sana {report}koşulların değerlendirildiği bir rapor basar: {pos}hangi yapılandırma neden çalıştı, {neg}hangisi neden çalışmadı, tek tek.',
  ] },
  { id: 'run', title: 'run() ağır çekimde', rail: 2, sentences: [
    'Artık {start}run metodunu ağır çekimde izleyebiliriz.',
    '{e1}Birinci adım: ortamı hazırla. {env}Komut satırı, ortam değişkenleri ve ayar dosyaları birleşip tek bir Environment olur.',
    "{e2}İkinci adım: uygulamanın türüne karar ver. Classpath'te servlet varsa, {servlet}bu bir servlet web uygulamasıdır.",
    '{e3}Üçüncü adım: bağlamı oluştur ve refresh et. {heart}İşin kalbi burası.',
    '{r1}Önce yapılandırma sınıfları okunur, tarama yapılır, otomatik yapılandırmalar eklenir {r1b}ve bütün tarifler çıkar.',
    '{r2}Sonra işlemciler kaydedilir, {r3}ve gömülü Tomcat yaratılır.',
    "{r4}Ardından bütün singleton bean'ler üretilir. {r5}En sonunda Tomcat portu açar.",
    "{e4}Dördüncü adım: CommandLineRunner ve ApplicationRunner'lar çalışır.",
    'Ve {ready}ApplicationReadyEvent yayınlanır. {up}Uygulama hazır.',
  ] },
  { id: 'request', title: 'Bir isteğin yolculuğu', rail: 3, sentences: [
    ['Uygulama ayakta. Şimdi bir istek gelsin: GET /orders/42.', 'uygulama ayakta. şimdi {req}bir istek gelsin: get, orders, kırk iki.'],
    ["İstek önce Tomcat'e ulaşır. Tomcat onu havuzdaki bir iş parçacığına verir; varsayılan olarak en çok 200 tane.",
      'istek önce {tomcat}tomkete ulaşır. tomket onu {pool}havuzdaki bir iş parçacığına verir; {max}varsayılan olarak en çok iki yüz tane.'],
    'Bu iş parçacığı, {carry}isteği baştan sona taşıyacak.',
    'Önce {filt}filtre zincirinden geçer. {sec}Spring Security de aslında buradaki bir filtredir.',
    "Sonra tek bir kapıya varır: {ds}DispatcherServlet. Spring MVC'deki bütün istekler, {front}bu ön kontrolcüden geçer.",
    "DispatcherServlet {hm}handler mapping'e sorar: bu adres kimin? {ans}Cevap: OrderController'daki getOrder metodu.",
    ['Argüman çözücüler adresteki 42’yi okur, Long tipine çevirir ve metodu çağırır.',
      '{arg}argüman çözücüler adresteki kırk ikiyi okur, {long}long tipine çevirir {call}ve metodu çağırır.'],
  ] },
  { id: 'data', title: 'Servisten veritabanına', rail: 3, sentences: [
    'Controller servise gider. Ama dikkat: {px}elindeki servis gerçek nesne değil, onu saran proxy.',
    'Metot @Transactional olduğu için {tx}proxy önce bir işlem başlatır, {real}sonra gerçek servise geçer.',
    "Servis {repo}repository'yi çağırır. OrderRepository'yi sen yazmadın: {iface}yalnızca bir arayüz tanımladın, {gen}Spring Data onun gerçekleştirmesini çalışma anında üretti.",
    "{hib}findById, Hibernate üzerinden SQL'e çevrilir. {hik}Bağlantı HikariCP havuzundan ödünç alınır; {ten}havuzda varsayılan olarak on bağlantı var.",
    '{db}Sorgu veritabanına gider, {row}satır döner, {ret}bağlantı havuza geri bırakılır.',
    "{commit}Proxy işlemi onaylar. {json}Controller'ın döndürdüğü Java nesnesini Jackson JSON'a çevirir, {back}ve yanıt aynı yoldan geri döner.",
    'Bütün bu yolculuk {ms}çoğu zaman birkaç milisaniye sürer.',
  ] },
  { id: 'selfcall', title: 'Proxy tuzağı', rail: 3, sentences: [
    "Proxy'yi anlamak, {intro}en sık görülen hatalardan birini de açıklar.",
    "Dışarıdan gelen çağrı {out}önce proxy'ye uğrar; {begin}işlem orada başlar.",
    'Ama aynı sınıfın içindeki bir metot, @Transactional işaretli komşusunu {self}this üzerinden çağırırsa, {none}işlem başlamaz.',
    "Çünkü çağrı {skip}proxy'ye hiç uğramaz, doğrudan nesnenin içinde kalır. {gate}Notasyon orada, ama onu uygulayan kapı atlanmıştır.",
    "Çözüm, {fix}o metodu başka bir bean'e taşımak, {fix2}ya da işlemi dışarıdaki çağrıda başlatmak.",
  ] },
  { id: 'config', title: 'Ayar katmanları', rail: 1, sentences: [
    'Tek bir jar dosyası, farklı ortamlarda farklı davranmalı. {layers}Boot bunun için ayarları katman katman okur.',
    "{l1}En altta, jar'ın içindeki application.properties var. {l2}Üstüne profil dosyası gelir, örneğin application-prod.",
    '{l3}Onun üstünde ortam değişkenleri, {l4}en üstte de komut satırı argümanları.',
    'Bir anahtar birden çok katmanda varsa, {win}en üstteki kazanır.',
    '{env}SERVER_PORT adlı ortam değişkeni server.port ayarını ezer; {relax}gevşek bağlama sayesinde yazım farkı sorun olmaz.',
    'Ayarları tek tek okumak yerine {cp}@ConfigurationProperties ile bir sınıfa bağlayabilirsin; {safe}böylece tip güvenliği ve doğrulama da kazanırsın.',
  ] },
  { id: 'jar', title: "Jar'ın içi ve Actuator", rail: 4, sentences: [
    'Son durak paketleme. Maven ya da Gradle eklentisi, uygulamanı {jar}tek bir çalıştırılabilir jar yapar.',
    "İçinde {cls}senin sınıfların, {lib}bütün bağımlılık jar'ları, {ldr}ve küçük bir başlatıcı var.",
    "java -jar dediğinde {man}önce bu başlatıcı çalışır, {nest}iç içe jar'lardan classpath'i kurar {start}ve senin main metodunu çağırır.",
    'Tomcat zaten içeride olduğu için {notom}sunucuya ayrıca Tomcat kurmana gerek yok.',
    '{act}Actuator eklersen uygulama kendini de anlatır: {health}health, metrics, info gibi uç noktalarla sağlığını ve ölçümlerini dışarı açar.',
  ] },
  { id: 'outro', title: 'Sihir yok', rail: 4, sentences: [
    'Başa dönelim. O iki saniyede {rec}Boot ortamı okudu, ana paketini taradı, adayları koşullarla eledi, tarifleri çıkardı.',
    "{rec2}Nesneleri bağımlılık sırasıyla üretti, gerekenleri proxy ile sardı, {rec3}Tomcat'i başlattı ve kapıyı açtı.",
    'Sihir yok. {p1}Bir konteyner, {p2}bir koşullar zinciri, {p3}ve iyi seçilmiş varsayılanlar.',
    '{over}Hepsinin üzerine yazabilirsin.',
    'Bir dahaki hatada {end}nereye bakacağını artık biliyorsun.',
  ] },
];

// the stages of the run() rail at the top of the screen
export const RAIL = ['ortam', 'classpath', 'refresh()', 'istek', 'paket'];

// English terms → how they are said (case-sensitive, longest first). A following apostrophe is dropped:
// "Tomcat'e" → "tomkete".
const PRON = {
  'SpringApplication.run()': 'spring eplikeyşın nokta ran',
  '@SpringBootApplication': 'et spring but eplikeyşın',
  '@SpringBootConfiguration': 'et spring but konfigüreyşın',
  '@EnableAutoConfiguration': 'et enebıl oto konfigüreyşın',
  '@ComponentScan': 'et komponent sken',
  '@ConditionalOnClass': 'et kondişınıl on klas',
  '@ConditionalOnProperty': 'et kondişınıl on propırti',
  '@ConditionalOnMissingBean': 'et kondişınıl on mising bin',
  '@ConfigurationProperties': 'et konfigüreyşın propırtiz',
  '@Autowired': 'et otovayırd',
  '@PostConstruct': 'et post konstrakt',
  '@Transactional': 'et trenzekşınıl',
  '@Async': 'et eysink',
  '@Cacheable': 'et keşıbıl',
  'AutoConfiguration.imports': 'oto konfigüreyşın nokta impörts',
  'spring-boot-starter-webmvc': 'spring but startır veb em vi si',
  'application.properties': 'eplikeyşın propırtiz',
  'application-prod': 'eplikeyşın prod',
  'ApplicationContext': 'eplikeyşın kontekst',
  'ApplicationReadyEvent': 'eplikeyşın redi ivent',
  'ApplicationRunner': 'eplikeyşın ranır',
  'CommandLineRunner': 'komand layn ranır',
  'BeanPostProcessor': 'bin post prosesır',
  'BeanDefinition': 'bin definişın',
  'DispatcherServlet': 'dispeçır sörvlet',
  'OrderController': 'ordır kontrolır',
  'OrderService': 'ordır sörvis',
  'OrderRepository': 'ordır ripozitori',
  'PaymentClient': 'peymınt klayınt',
  'Spring Security': 'spring sekyuriti',
  'Spring Boot': 'spring but',
  'Spring Data': 'spring deyta',
  'Spring MVC': 'spring em vi si',
  'handler mapping': 'hendlır meping',
  'Environment': 'envayırınmınt',
  'SERVER_PORT': 'sörvır port',
  'server.port': 'sörvır port',
  'DataSource': 'deyta sors',
  'HikariCP': 'hikari si pi',
  'Hibernate': 'haybırneyt',
  'findById': 'faynd bay ay di',
  'getOrder': 'get ordır',
  'java -jar': 'cava tire car',
  '--debug': 'tire tire dibag',
  'Controller': 'kontrolır',
  'controller': 'kontrolır',
  'repository': 'ripozitori',
  'singleton': 'singılton',
  'classpath': 'klaspet',
  'Classpath': 'klaspet',
  'web': 'veb',
  'Actuator': 'ekçueytır',
  'Jackson': 'ceksın',
  'refresh': 'rifreş',
  'servlet': 'sörvlet',
  'starter': 'startır',
  'metrics': 'metriks',
  'health': 'helt',
  'Tomcat': 'tomket',
  'Gradle': 'greydıl',
  'Maven': 'meyvın',
  'Spring': 'spring',
  'Proxy': 'proksi',
  'proxy': 'proksi',
  'Boot': 'but',
  'bean': 'bin',
  'Java': 'cava',
  'JSON': 'ceysın',
  'Long': 'long',
  'main': 'meyn',
  'this': 'dis',
  'SQL': 'es kü el',
  'XML': 'iks em el',
  'jar': 'car',
  'Pom': 'pom',
  'new': 'nyu',
  'run': 'ran',
  '8080': 'sekiz bin seksen',
};
const KEYS = Object.keys(PRON).sort((a, b) => b.length - a.length);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PRON_RE = new RegExp(`(^|[^A-Za-z0-9_@.\\-])(${KEYS.map(esc).join('|')})(?![A-Za-z0-9_])('?)`, 'g');
const spoken = s => s.replace(PRON_RE, (m, pre, key) => pre + PRON[key]);

const MARK = /\{([a-z0-9]+)\}/g;

// → { say, sayLen, marks: {key: charPos in say}, sentences: [{ tx, from, to }] } (from/to: char range in say)
export function parseSection(sec) {
  let say = '';
  const marks = {}, sentences = [];
  for (const s of sec.sentences) {
    const [written, spokenForm] = Array.isArray(s) ? s : [s, null];
    const tx = written.replace(MARK, '');
    if (say) say += ' ';
    const from = say.length;
    // markers are placed in the spoken form; each piece between markers is converted on its own
    const src = spokenForm ?? written;
    const parts = src.split(MARK);             // text, key, text, key, …
    for (let i = 0; i < parts.length; i++) {
      if (i % 2) { marks[parts[i]] = say.length; continue; }
      say += spokenForm ? parts[i] : spoken(parts[i]);
    }
    sentences.push({ tx, from, to: say.length });
  }
  return { say, sayLen: say.length, marks, sentences };
}
