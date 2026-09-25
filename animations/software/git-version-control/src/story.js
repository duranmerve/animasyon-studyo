// Narration of every chapter. One chapter = one recording.
//   @name       a scene cue: fires when the narrator starts the next word
//   {shown|said} text that is shown one way and spoken another (numbers, dates)
// Git words are respelled for the Turkish voice by SAY below (screen text stays as written).

export const CHAPTERS = [
  { id: 'intro', title: 'Ödev son, son iki, gerçekten son', text:
    'Bilgisayarında hiç böyle bir klasör oldu mu? @files Ödev son. Ödev son iki. Ödev gerçekten son. @q Hangisi en yenisi? Dün sildiğin paragraf hangisinde kaldı? İki arkadaş aynı dosyayı değiştirince kimin hâli kalacak? @order Bu karmaşayı çözen bir araç var: @git Git. @map Birazdan bu dağınık dosyaları tek bir hatta dizeceğiz. Hattın her durağı, projenin bir anı olacak.' },

  { id: 'history', title: '2005: Birkaç günde doğan araç', text:
    'Hikâye @y2005 {2005|iki bin beş} yılında başlıyor. @linux Binlerce gönüllünün birlikte yazdığı Linux çekirdeği, o güne kadar ücretsiz kullandığı ticari bir sürüm kontrol aracını kaybediyor. @linus Linux\'un yaratıcısı Linus Torvalds, kendi aracını yazmaya {3 Nisan\'da|üç nisanda} başlıyor. @self {7 Nisan\'da|yedi nisanda}, yani dört gün sonra, Git kendi kodunu kendisi saklamaya başlıyor. @survey Bugün anketlerde yazılımcıların yüzde doksandan fazlası Git kullandığını söylüyor. @github Küçük bir not: Git, senin bilgisayarında çalışan bir araç. @hub GitHub gibi siteler ise Git depolarını internette saklayan hizmetler. İkisi aynı şey değil.' },

  { id: 'repo', title: 'Depo: projenin hafızası', text:
    'Elif ile Can, bilim şenliği için küçük bir oyun yazıyor: @game Yıldız Avcısı. Şimdilik ikisi de Elif\'in bilgisayarında çalışıyor. @folder Proje klasöründe üç dosya var. @init Elif bu klasörde git init komutunu çalıştırıyor @dotgit ve içinde gizli bir .git klasörü beliriyor. @memory İşte depo bu: projenin bütün geçmişi bu klasörde, Elif\'in kendi bilgisayarında duruyor. İnternete bile gerek yok.' },

  { id: 'stage', title: 'Üç alan: masa, sahne, albüm', text:
    'Git\'te bir dosya üç yerden birinde olabilir. @work Çalışma klasörü, dosyaları düzenlediğin masan. @stage Hazırlık alanı, fotoğraf çekilmeden önce kadraja girenlerin durduğu sahne. @repo Depo ise çekilen fotoğrafların albümü. @add Elif, git add komutuyla oyunun üç dosyasını sahneye çıkarıyor. @notes Not dosyası ise masada kalıyor. @choose Bir sonraki fotoğrafa neyin gireceğini sen seçersin; bu ara adım bunun için var.' },

  { id: 'commit', title: 'Commit: projenin fotoğrafı', text:
    'Şimdi deklanşöre basma zamanı: @cmd git commit. @flash Git, sahnedeki dosyaların o anki hâlini bir fotoğraf gibi saklıyor. @meta Fotoğrafın arkasına bir not düşülüyor: kim çekti, ne zaman çekti ve kısa bir açıklama. @hash Her commit\'e bir de kimlik veriliyor: içeriğinden hesaplanan, kırk karakterlik bir parmak izi. @short Günlük kullanımda ilk yedi karakteri yeter. @station Haritamızın ilk durağı da böylece doğuyor.' },

  { id: 'snapshot', title: 'Fark mı, fotoğraf mı?', text:
    '@b Can oyuna bir skor tablosu ekliyor ve yeni bir commit yapıyor. @myth Çoğumuz Git\'in yalnızca değişen satırları, yani farkları sakladığını sanırız. @truth Aslında Git her commit\'te projenin tamamının fotoğrafını çeker. @waste Peki bu yer israfı değil mi? @same Değil, çünkü değişmeyen dosyalar yeniden kopyalanmaz. @link Yeni fotoğraf, onların depoda zaten duran hâlini gösterir. @new Yalnızca değişen oyun dosyası yeni olarak saklanır.' },

  { id: 'chain', title: 'Zincir: her durak bir öncekini bilir', text:
    '@c Bir commit daha: gökyüzüne yıldızlar ekleniyor. @parent Her commit, kendinden önceki commit\'in kimliğini de içinde taşır. Buna ebeveyn denir. @chain Böylece commit\'ler geriye doğru uzanan bir zincir oluşturur. @tamper Bir deneme yapalım: ilk commit\'teki tek bir harfi gizlice değiştirelim. @cascade Onun parmak izi değişir. Onu içinde taşıyan sonraki commit\'in parmak izi de değişir, @cascade2 ondan sonrakinin de. @safe Bu yüzden geçmiş, fark edilmeden değiştirilemez.' },

  { id: 'time', title: 'Zamanda yolculuk', text:
    '@here Git, şu an nerede durduğunu HEAD adlı bir işaretle bilir. Haritadaki "buradasınız" noktası gibi. @checkout Elif ilk sürümü merak ediyor ve git checkout ile o durağa gidiyor. @revert Klasördeki dosyalar bir anda o günkü hâline dönüyor: skor yok, yıldızlar yok. @back Sonra git switch main ile en yeni hâle geri dönüyor. @nothingLost Hiçbir şey kaybolmadı; bütün duraklar hâlâ haritada.' },

  { id: 'branch', title: 'Dal: 41 baytlık bir etiket', text:
    'Elif oyuna bir kalkan eklemek istiyor, ama çalışan sürümü bozmak istemiyor. @create Bunun için yeni bir dal açıyor: git switch -c kalkan. @myth Dal deyince projenin bir kopyası akla gelebilir. @zoom Oysa dal, yalnızca bir commit\'i gösteren küçük bir etikettir. @bytes Diskte kırk bir baytlık bir dosya: kırk karakterlik parmak izi ve bir satır sonu. @headFollows HEAD artık kalkan dalını gösteriyor. @d Elif yeni commit\'ler yaptıkça @e kalkan etiketi de onlarla birlikte ilerliyor. @mainStays main ise olduğu yerde bekliyor.' },

  { id: 'ff', title: 'Birleştirme: ileri sarma', text:
    'Kalkan hazır. @switch Elif main dalına dönüyor @merge ve git merge kalkan diyor. @check main\'den sonra yeni bir commit yapılmamış; yol dümdüz tek bir çizgi. @slide Bu durumda Git yeni bir şey üretmez, yalnızca main etiketini ileri kaydırır. @ff Buna ileri sarma, İngilizcesiyle fast-forward denir.' },

  { id: 'merge', title: 'İki yolun buluşması', text:
    'Şimdi yollar ayrılıyor. @ses Elif, ses adlı bir dalda oyuna müzik ekliyor. @title Aynı sırada Can, main dalında bir başlık ekranı hazırlıyor. @fork Hat ikiye ayrıldı. @merge Can ses dalını birleştirmek istediğinde Git üç fotoğrafa bakar: @base iki dalın ayrıldığı ortak ata @tips ve iki dalın son hâlleri. @auto Değişiklikler farklı yerlerde olduğu için Git hepsini kendisi birleştirir @mcommit ve iki ebeveyni olan bir birleştirme commit\'i oluşturur. Tıpkı iki hattın buluştuğu bir aktarma durağı gibi.' },

  { id: 'conflict', title: 'Çakışma: aynı satır, iki fikir', text:
    'Bazen iki yol aynı yere dokunur. @kolay Elif, kolay-mod dalında geminin hızını üçe düşürüyor. @hiz8 Can ise main dalında aynı satırı sekiz yapıyor. @merge Birleştirme zamanı gelince @stop Git duruyor: aynı satır için iki farklı cevap var ve hangisinin doğru olduğunu bilemez. @myth Çakışma bir hata ya da bozulma değildir. @human Git yalnızca kararı bir insana bırakır.' },

  { id: 'resolve', title: 'Çakışmayı çözmek', text:
    'Git, dosyaya iki hâli de yazar ve araya işaretler koyar. @top Küçüktür işaretlerinin altında senin dalındaki hâl var. @mid Eşittir çizgisi ikisini ayırır. @bottom Büyüktür işaretlerinin üstünde ise birleştirilen dalın hâli. @edit Elif ile Can konuşup ikisini de kapsayan bir çözüm yazıyor: kolay modda hız üç, normalde sekiz. @marks İşaretler siliniyor. @addc Sonra git add ve git commit. @done Birleştirme tamam; hat yeniden tek.' },

  { id: 'remote', title: 'Uzak depo: herkesin elinde bütün harita', text:
    'Buraya kadar her şey tek bir bilgisayardaydı. @server Ekip için internette ortak bir depo açılıyor; buna uzak depo denir. @upload Elif bütün geçmişi oraya gönderiyor. @clone Can da git clone ile bu depoyu kendi bilgisayarına kopyalıyor. @full Gelen yalnızca son hâl değil, bütün harita, bütün geçmiş. @origin Kopyalandığı yerin adı da varsayılan olarak origin. @distributed Yani her bilgisayarda tam bir kopya var. Git bu yüzden dağıtık bir sistemdir.' },

  { id: 'sync', title: 'push ve pull: haritayı paylaşmak', text:
    '@j Can evde yeni bir seviye ekleyip commit ediyor. Bu commit şimdilik yalnızca Can\'ın bilgisayarında. @k Bu sırada Elif de kendi değişikliğini git push ile uzak depoya gönderiyor. @canPush Can da göndermeye çalışıyor, @rejected ama uzak depo reddediyor: orada Can\'ın bilmediği yeni bir commit var. @pull Can önce git pull yapıyor. Pull aslında iki adımdır: @fetch fetch ile yenilikleri indirir, @mergeIt merge ile kendi işiyle birleştirir. @pushOk Şimdi git push başarılı. @elifPull Elif de bir pull yaptığında üç kopyanın haritası yine aynı olur.' },

  { id: 'summary', title: 'Hattın haritası', text:
    'Hadi yolculuğu toparlayalım. @s1 Commit, projenin bir fotoğrafıdır. @s2 Dal, bir commit\'i gösteren küçük bir etikettir. @s3 Merge iki yolu birleştirir; @s4 aynı satır iki kez değiştiyse son söz senindir. @s5 Push ve pull ise haritayı ekip arkadaşlarınla paylaşır. @answer Artık ödev son, ödev son iki diye dosya çoğaltmana gerek yok. @final Bütün geçmiş tek bir hatta, istediğin durakta seni bekliyor.' },
];

// How Git words are read aloud (stem → spoken); a suffix after an apostrophe is glued on
const SAY = [
  [/^commit/i, 'komit'], [/^merge/i, 'mörç'], [/^push/i, 'puş'], [/^pull/i, 'pul'], [/^fetch/i, 'feç'],
  [/^switch/i, 'suviç'], [/^checkout/i, 'çekaut'], [/^clone/i, 'klon'], [/^main/i, 'meyn'], [/^HEAD/, 'hed'],
  [/^origin/i, 'orijin'], [/^add$/i, 'ed'], [/^GitHub/i, 'githab'], [/^Linux/i, 'linuks'], [/^fast-forward/i, 'fast forvırd'],
  [/^\.git$/i, 'nokta git'], [/^-c$/, 'tire ce'], [/^kolay-mod/i, 'kolay mod'],
];
export function spoken(word) {
  const m = word.match(/^(["“(]*)(.*?)([.,;:!?"”)]*)$/);
  let [, pre, core, post] = m;
  for (const [re, rep] of SAY) if (re.test(core)) { core = core.replace(re, rep).replace(/'/g, ''); break; }
  return pre.replace(/["“]/g, '') + core + post.replace(/["”]/g, '');
}

// → { words: [{ w (shown), s (spoken), s0 (char offset in said text) }], said, cues: { name: s0 } }
export function parse(text) {
  const words = [], cues = {}, pending = [];
  const re = /\{([^|}]*)\|([^}]*)\}|(\S+)/g;
  let said = '', m;
  const push = (w, s) => {
    const s0 = said.length ? said.length + 1 : 0;
    said += (said.length ? ' ' : '') + s;
    for (const c of pending.splice(0)) cues[c] = s0;
    words.push({ w, s, s0 });
  };
  while ((m = re.exec(text))) {
    if (m[3] && m[3].startsWith('@')) { pending.push(m[3].slice(1)); continue; }
    if (m[1] !== undefined) {
      // a {shown|said} group: shown words share the spoken span
      const shown = m[1].split(' '), s = m[2];
      const s0 = said.length ? said.length + 1 : 0;
      said += (said.length ? ' ' : '') + s;
      for (const c of pending.splice(0)) cues[c] = s0;
      // glue trailing punctuation that follows the group directly (e.g. "{7 Nisan'da|…},")
      const tail = text.slice(re.lastIndex).match(/^[.,;:!?]+/);
      if (tail) { shown[shown.length - 1] += tail[0]; said += tail[0]; re.lastIndex += tail[0].length; }
      shown.forEach((w, i) => words.push({ w, s: i ? '' : s, s0: s0 + Math.round(s.length * i / shown.length) }));
      continue;
    }
    push(m[3], spoken(m[3]));
  }
  for (const c of pending) cues[c] = said.length;
  return { words, said, cues };
}
