# Tasarım kartı: Git Hattı

## Özü tek cümlede

Git, projenin her anını bir **fotoğraf** (commit) olarak saklar ve bu fotoğrafları birbirine bağlayarak bir **hat** kurar; dallar bu hat üzerindeki küçük **etiketlerdir**, birleştirme iki yolu bir **aktarma durağında** buluşturur, uzak depo ise aynı haritanın başka bilgisayarlardaki tam kopyasıdır.

İzleyici sonunda şunu anlamış olmalı: commit = fotoğraf (fark değil), dal = 41 baytlık etiket (kopya değil), merge = ileri sarma ya da iki ebeveynli commit, çakışma = hata değil insana bırakılan karar, push/pull = haritayı paylaşmak (pull = fetch + merge).

## Üç yaklaşım

**1. Metro hattı haritası (seçilen).** Commit geçmişi, bir şehrin toplu taşıma haritası gibi çizilir: her commit bir durak, her dal kendi renginde bir hat, birleştirme commit'i iki hattın buluştuğu aktarma durağı, HEAD ise haritalardaki kırmızı "Buradasınız" noktası. Açık renk, çizim masası kâğıdı gibi bir zemin; kalın, 45 derecelik açılarla kıvrılan renkli çizgiler; tabela yazı tipleri. Anlatım bir yolculuk gibi ilerler: ilk durak (ilk commit) doğar, hat uzar, ayrılır, birleşir, sonunda başka şehirlere (uzak depolara) kopyalanır. Hattın yanında ara ara "diyorama" kartları açılır: fotoğraf makinesi, nesne rafı, çakışma editörü, üç bilgisayar.

**2. Karanlık oda ve fotoğraf albümü.** Her şey bir fotoğrafçının karanlık odasında geçer: çalışma klasörü masa, hazırlık alanı kadraj, commit banyo edilen bir fotoğraf, dallar albümden çoğaltılan ayrı ipler, birleştirme iki fotoğrafın üst üste pozlanması. Kırmızı ışık, gümüş tonları, film grenli bir görünüm. Sıcak ve atmosferik ama dallar ve birleştirme gibi grafik yapılar bu dünyada zor okunur; ağaç yapısı kaybolur.

**3. İçeriden bakış: 3B nesne deposu.** Three.js ile `.git` klasörünün içine girilir: blob, tree ve commit nesneleri havada asılı kutular, hash'ler kutuların üzerinde parlıyor; dallar kutulara uzanan ışık huzmeleri. Teknik olarak en doğru "içeriden" bakış, ama yeni başlayan bir öğrenci için soyut ve kalabalık; 3B kamera, anlatılması gereken basit fikirlerin (dal = etiket) önüne geçer.

## Seçim ve gerekçe

**Metro hattı.** Git'in commit grafiği zaten bir hat haritasına benzer: doğrusal ilerleyen, ayrılan ve yeniden buluşan çizgiler. Bu benzetme **yanıltmaz**, tersine yapıyı olduğu gibi gösterir: durak = commit, çizgi = ebeveyn bağı, hattın rengini taşıyan tabela = dal etiketi, "Buradasınız" = HEAD, aktarma durağı = birleştirme commit'i. Lise ve yeni başlayan kitlesi için harita okumak tanıdık bir beceri. Fotoğraf benzetmesi (yaklaşım 2'nin en güçlü yanı) commit anlatımında yardımcı mecaz olarak alınır: deklanşör, kadraj (hazırlık alanı), albüm (depo).

Teknik: **Canvas 2D**, tek bir sahne fonksiyonu `draw(t)`. Harita dünya koordinatlarında durur, kamera anlatımdaki kelimelere bağlı anahtar karelerle gezer; diyorama kartları ekran düzeninde çizilir. Paket yok, derleme yalnızca dosyaları kopyalar.

## Kimlik

- **Zemin:** çizim masası kâğıdı `#F3EFE6`, ince milimetrik ızgara `#E6E0D3`.
- **Mürekkep:** `#1B1F2A` (duraklar, yazılar), soluk `#6E7280`.
- **Hat renkleri:** main `#2350D8` (lacivert-mavi), kalkan `#F28C28` (turuncu), ses `#0FA37F` (yeşil), kolay-mod `#D63384` (pembe-mor). Uzak depo için mor `#6D4BD8`.
- **Buradasınız / HEAD:** kırmızı `#E63946`, nabız gibi atan halka.
- **Terminal:** mürekkep zemin, kâğıt rengi yazı, yeşil istem `#7BD88F`.
- **Yazı tipleri:** Barlow ve Barlow Condensed (otoyol ve toplu taşıma tabelalarından esinlenen, Türkçe karakterli), komutlar ve hash'ler için JetBrains Mono.
- **Hareket:** mekanik ve kesin, tabela gibi; duraklar hafif bir "pop" ile belirir, çizgiler cetvelle çekilir gibi uzar, etiketler raydaki bir vagon gibi kayar. Önemli anlarda kamera yavaşça yaklaşır.
- **Ses dünyası:** Web Audio ile üretilen kısa efektler: deklanşör, durak "pop"u, etiket kayması için hafif bir ray sesi, çakışmada iki tonlu uyarı, push/pull için hava akımı. Anlatım sırasında kısılır.
- **Arayüz:** tabela dili: yuvarlak hat numarası rozeti + bölüm adı, alt kısımda ince hat biçiminde ilerleme çubuğu (bölümler durak olarak), düz ve net düğmeler.

## "Vay" anları

1. Açılışta dağınık "ödev_son_GERCEKTEN_son" dosyalarının tek bir düz hatta dizilmesi.
2. Commit'te deklanşör flaşı, polaroid ve kırk karakterlik parmak izinin slot makinesi gibi dönmesi.
3. İlk commit'te tek harf değişince parmak izlerinin zincirleme kızarması.
4. Dal etiketine kameranın dalıp "41 bayt"lık dosyanın içini göstermesi.
5. İleri sarmada kıvrık turuncu hattın düzleşip ana hatta oturması.
6. Çakışmada iki kod kartının çarpışması, sonra işaretlerin tek tek silinip tek satıra dönüşmesi.
7. Push reddedilince durakların sunucudan sekip geri dönmesi.
