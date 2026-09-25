# Bilinen tuzaklar

Biçim: **belirti** → neden → çözüm. Her oturum sonunda yeni bulunanlar eklenir. Aynı konu varsa yenisini ekleme, var olanı güncelle.

## Oynatıcı ve altyazı

- **CC kapalıyken altyazı hâlâ görünüyor** → altyazının geçiş kodu her karede satır içi `opacity` yazıyor ve CSS'teki gizleme sınıfını eziyor → gizlemeyi `display: none` ile yap ve her karede CC durumuna bak. Testi tarayıcıda yap: düğmeye bas, 8 saniye boyunca altyazının görünüp görünmediğini ölç.
- **Altyazıda tek kelime kalıyor** → gerçek bir hata değil: kelimeler söylendikçe açılıyor. Ekran görüntüsü alırken bunu hata sanma.
- **Başlat ekranının arkası boş** → oynatma başlamadan `t = 0` çiziliyor → başlamadan önce animasyonun en güçlü karesini (ör. finali) arka planda göster.
- **Konsolda 404 hatası** → sayfanın favicon'u yok → satır içi bir SVG favicon ekle.

- **Bölüm sonunda ses başa dönüyor, görüntü donuyor** → kayıt, görüntü bölüm sonuna varmadan birkaç yüz ms önce bitiyor; `paused` olan kayda "durmuş" diye `play()` deniyor, bitmiş kayıt baştan çalıyor, geri gitmeyen görüntü sesi bekleyip donuyor → `ended` olan (ya da sonuna gelmiş) kaydı "bitti" say, bir daha `play()` deme, hikâyeyi saatle ilerlet; yalnızca kullanıcı atlayınca yeniden konumlandır. Testte kaydı %6 hızlı çaldırıp her bölüm sonunu dene (`dev/endtest.mjs fast`).

- **İzleyicinin bilgisayarında animasyon donuyor** → kalite sabit "yüksek", makine yetişmiyor; ölçümde yük tek efekte değil binlerce küçük nesneye (16 bin kum tanesi × 290 üçgen) yayılmıştı → çalışma anında değişen kalite kademeleri + açılışta otomatik seçim + oynatmada düşürme; küçük nesneleri bölgelere ayır ve geometrisini kabalaştır; düşük kademede gölge listesinden çıkar. `dev/perftest.mjs` ve `dev/fpstest.mjs` ile ölç (`craft.md` → 8).
- **Senkron kare ölçümü gerçek fps'ten kötümser** → `readPixels` GPU boru hattını boşaltır → eşiği buna göre koy (27 ms senkron ≈ 50+ fps oynatma) ve gerçek fps'i ayrıca rAF ile ölç.

- **`renderAt(t)` aynı anda farklı piksel veriyor (saflık testi başarısız)** → Babylon `PostProcess` `reusable=true` ile kurulmuş; yeniden kullanılabilir katman iki dokuyu dönüşümlü kullanır, kare öncekine bağlanır → `reusable=false`; katmanı kademe değişiminde takıp çıkarırken `camera._postProcesses.includes(pp)` ile koru. `npm run verify -- <slug>` her kademede (`--query tier=…`) çalıştır.

## Sahne ve kamera

- **Hareket eden işaretçi (paket, nokta) kutuların içinden geçip yazıları örtüyor** → yol, istasyon kutularının ortasından çizilmiş → paketi kutuların altından ya da üstünden giden ayrı bir hat üzerinde yürüt, istasyonları hatta kısa dikey çizgilerle bağla.
- **Kod paneli satırı kenardan taşıyor** → sabit yazı boyutu, uzun satır → kod sayfasında yazı boyutunu en uzun satıra göre küçült (alt sınırla); örnek kodu yine de ≤ 40 karakterlik satırlarla yaz.
- **Damga yazının üstüne düşünce okunmuyor** → damganın içi saydam → damgaya kâğıt renginde bir dolgu ver.
- **Çizim sırası yüzünden nesne kayboluyor** (raf, üstüne konan nesneyi örtüyor) → kap önce, içine konan sonra çizilir.
- **Yazılar çizgilerle kesişiyor** (durak adlarını birleşme çizgisi kesiyor) → yazının arkasında kontur yok → zemin renginde `strokeText` ile halo ver.
- **Etiketin altındaki bağlantı çizgisi dev gibi uzuyor** → çizgi hedef istasyona kadar çekiliyor, etiket ise kayarken arada kalıyor → bağlantı çizgisini sabit uzunlukta çiz.
- **Yakınlaşınca açıklama kartı anlatılan öğenin üstüne düşüyor** → kart ekranın ortasında → kamerayı öğeyi aşağıda tutacak biçimde kaydır, kartı üste koy ve ok ile öğeye bağla.
- **Mavi ile turuncu karışınca çamur gibi gri çıkıyor** → iki rengi RGB'de karıştırmak → karıştırma; yeni rengi eski rengin üstüne artan opaklıkla bindir.
- **Kullanılmayan dal etiketleri ekranı kalabalıklaştırıyor** → hepsi tam parlaklıkta kalıyor → işi biten etiketleri soldur.
- **Telefonda harita yazıları okunmuyor** → yatay görünüm için ayarlanmış kamera genişliği dikeyde de kullanılıyor → dikey ekranda görünen genişliği daralt (yaklaşık ×0,62); yan kenarlardan biraz kırpılmasına izin ver.
- **Açılışta dosya adları üst üste biniyor** → konumlar tamamen rastgele → ızgaraya oturtulmuş, hafifçe oynatılmış rastgele konumlar kullan.

- **Headless Chrome'da WebGL bağlamı düşüyor (context lost)** → Babylon `CascadedShadowGenerator` ekran kartı sürecini çökertiyor → kameranın baktığı yere oturtulan tek bir `ShadowGenerator` kullan (ışığın `ortho*` sınırlarını her karede ayarla).
- **Rastgele dağıtılmış çimler, yapraklar, çubuklar çekimlerin önünü kapatıyor** → 3B dünyada her nesne rastgele konumda → olayların geçtiği bir "sahne alanı" tanımla, dağınık nesneleri ve uzun çimleri onun dışına koy, kenardaki çimleri dışa eğ. Temas sayfasıyla her bölümü kontrol et.
- **Uzun objektife geçince kameranın önüne çim, taş ya da özel bir sahne nesnesi giriyor** → kamera konudan uzaklaşınca aradaki nesneler kadraja giriyor → yalnızca tek bölümde gereken nesneleri (özel yapraklar) o bölümde göster; sorunlu çekimi `keepLens` ile eski açıda tut.
- **Sahneyi kıran damlanın içi basamaklı görünüyor** → yansıma sondası kenar yumuşatmasız çiziliyor → sondaya 512 çözünürlük ve `cubeTexture.samples = 4` ver, damlaya çok hafif pürüz (0,07).
- **TAA açınca atlamalarda hayalet görüntü** → zamansal kenar yumuşatma önceki kareleri biriktiriyor; zamanda atlanan karede (bölüm atlama, video `renderAt`) üst üste biniyor → sahne durumu zamanın saf fonksiyonu olan animasyonlarda TAA kullanma; MSAA yeterli.
- **Ekran uzayı temas gölgesi pürüzsüz yüzeylerde leke ve bant bırakıyor** → alan derinliği sonrası, düz derinlikle hesaplanıyor → kullanma ya da DOF'tan önce ve yalnızca keskin bölgede uygula; gerçek gölge haritasında `useContactHardeningShadow` daha güvenli.
- **Bokeh katmanı büyük beyaz yüzeyleri patlatıyor** → eşik yalnızca parlaklığa bakıyor → çevresinden belirgin parlak küçük noktalarla sınırla (yerel kontrast).
- **Kuş bakışı çekimde kamera çimlerin içinde kalıyor** → kamera en uzun yaprak boyundan alçakta → kamerayı çok yükseğe al ve dar görüş açısı (tele) kullan.
- **Makro ölçekte kum taneleri karıncayı yutuyor** → ikosfer yarıçapı "boyut" diye kullanılmış (çap iki katı) → gerçek boyutları mm olarak yaz, çoğunu ince kum (0,05–0,25 mm yarıçap) yap, iri taneleri seyrek tut.
- **Telefonda (dikey) 3B sahne dar bir dilim gibi görünüyor** → düşey görüş açısı sabit → dikey ekranda `fovMode` yatay yap, yatay açıyı masaüstünün ~0,62'si al; ölçek çubuğunu da buna göre hesapla.

- **Three.js ShaderMaterial'da ortak GLSL parçası vertex shader'da derlenmiyor** (`gl_FragCoord` tanımsız) → ortak parçada fragment'e özel bir fonksiyon var → o ifadeyi fonksiyon yerine `#define` makrosu yap; yalnızca kullanıldığı yerde açılır.
- **Kendi yazdığın gövde geometrisinin içi görünüyor, içindeki nesneler dışarı taşıyor** → indeks sırası ters, ön yüzler kırpılıyor → üçgen sırasını çevir; ilk ekran görüntüsünde "dışarıdaki nesne neden içeriyi gösteriyor?" diye bak.
- **Şafakta yatay zemin öğlen gibi aydınlık** → yarım-Lambert (`N·L*0.5+0.5`) ramp alçak güneşte bile yarı ışık veriyor → ramp girdisi düz `N·L` olsun.
- **İnce otlar kenar ışığıyla bembeyaz, çayır samana dönüyor** → her yüzeye aynı rim katsayısı → ince, çift yüzlü geometride rim'i ~0,1'e indir.
- **Arı gözü (altıgen mozaik) içinde ince çizgiler kayboluyor** → hücre ortalaması 1–2 px çizgiyi siliyor → mozaikte gösterilecek deseni hücreden kalın çiz, kesik çizgi yerine sürekli çizgi kullan.
- **Makro ölçekte ağaç kabuğu "karikatür tahta" gibi** → `abs(fbm-.5)` eş-yükselti çizgisi üretir → gerilmiş Voronoi levhaları (F2−F1 yarık) ve kameraya yaklaşınca devreye giren ikinci, ince Voronoi katmanı.
- **Kovan "zifiri karanlık" diye anlatılıyor ama bej ve aydınlık görünüyor** → petek kendi ışığını, arılar genel ışığı kullanıyor, pozlama yüksek → odak dışını ~%4'e düşür, yalnız mum kenarlarına zayıf ışıma bırak; kovan ön ayarında pozlamayı indir.
- **`node -e "…"` içindeki şablon dizgesi `${…}` ya da ters tırnak yüzünden bozuluyor** → bash çift tırnağı kaçışları yiyor → yama betiğini Write aracıyla dosyaya yaz, `node dosya.cjs` ile çalıştır.

- **`verify` ilk çalıştırmada aralıklı hata veriyor, sonrakilerde geçiyor; hatalı olan o andaki ilk kare** → (a) bir çekimin dokunduğu set durumu (parıltı, halka, kapak, odak ışığı) başka çekimde sıfırlanmıyor; (b) `__ready` yazı tipleri ve yerleşim oturmadan veriliyor → her karenin başında set durumunu varsayılana döndür; ısınmada her bölümün her ipucu anını bir kez çiz; video modunda `document.fonts.ready` + iki rAF + yeniden boyutlandırmadan sonra `__ready` ver. Verify'ı art arda 3 kez çalıştır.
- **Kayıt başlarken bir kare takılıyor (50–70 ms)** → ses öğesinin ilk `play()`ı çözücüyü ana iş parçacığında hazırlıyor → sonraki kayıt `canplaythrough` olunca sessizce bir kez çal-durdur, `currentTime = 0`.
- **Prosedürel böcek "oyuncak" gibi** → düz çubuk bacaklar, keskin eklemler, zemine basmayan ayaklar, uçuşta gölgesiz ve sarkık bacaklar → eklem düğümleri, incelen segmentler, çok parçalı kıvrık tarsus; ayakları dünya düzlemine (`plane: { n, d }`) izdüşür, IK ile diz; uçuşta bacakları gövde altına katla; yere yüksekliğe göre solan yumuşak gölge; hızlı kanadı vuruş yayına dağılmış soluk kopyalarla çiz.
- **Geniş plan boş ve düz** → ön plan yok, uzak katman yakınla aynı doygunlukta, tek ışık → son işlemde odak dışı ön plan katmanı, uzaklıkla doygunluğu düşen sis (`fogStart` ile yakın net), sürüklenen bulut gölgesi; her geniş planda tek odak (canlı ya da güneş).
- **Telefonda etiket ekrandan taşıyor, yazılar okunmuyor** → sabit ofsetli etiket ve `size*k` ölçeği → en küçük 12 px, ikincil (Latince) satırları dikey ekranda gizle, taşacak etiketi ters yöne çevir, büyük başlığı genişliğe göre sınırla.

## Ses

- **Kod terimleri (Spring, bean, @Transactional…) yanlış okunuyor** → söyleniş sözlüğü kur (`PRON`: "bean" → "bin", "@Transactional" → "et trenzekşınıl"), kesme işaretinden sonraki eki birleştir ("Tomcat'e" → "tomkete"), ek uyumuna dikkat et ("classpath'e" için "klaspet" → "klaspete"). Whisper doğru okunan İngilizce terimleri İngilizce yazdığı için yüzde 5–10 "fark" normaldir; yalnızca anlamı bozulan kelimeler için satırı yeniden kur.
- **O27 sesi** → kullanıcı "çok kötü" buldu, katalogdan çıkarıldı. Önerme.
- **Oyun, program ya da teknik adı yanlış okunuyor** (commit, merge, HEAD…) → OmniVoice İngilizceyi Türkçe gibi okuyor → söylenecek metinde okunuşu yaz (komit, mörç, hed), ekrandaki metin değişmesin.
- **Türkçe büyük harfle başlayan kelime yanlış okunuyor** → OmniVoice'un bilinen sorunu → `voice.mjs` bunu zaten küçük harfe çeviriyor; elle bir şey yapma.

## Video ve kapak

- **`chapters()` metin döndürünce video aracı çöküyor** → `render-video.mjs` `[{ t, title }]` dizisi bekliyor → sözleşmeyi aynen uygula. `srt(from, to)` ve `chapters(from)` aralığa göre kaydırılmış olmalı.
- **Video aracı bekleyip duruyor** → sayfa `window.__ready = true` ayarlamamış → video modunda bu işareti koy.
- **Kapakta "Git" "GİT" olmuş** → Türkçe sayfada CSS `text-transform: uppercase` → başlıkları elle büyük harfle yaz (GIT, İ ile I doğru).
- **Kapakta ana görsel başlığın altına giriyor** → görselin ağırlığı sol altta → ana görseli sağa yasla; beşini temas sayfasında yan yana kontrol et.
- **Görsel ya da kart kadrajdan taşıyor** → perspektif dörtgeni ekranın dışına çıkıyor → önemli öğeler (işaretçi, etiket) en az 40 px içeride kalsın.

## Araçlar

- **Taşıdıktan sonra "boş" sanılan eski klasörde dosya kalmış** → açık bir geliştirme sunucusu (Vite) `public/` klasörünü kilitli tuttuğu için o klasör taşınmamış; eski klasör silinince ses kayıtları gitti → taşımadan önce sunucuları kapat, sildiğin klasörün gerçekten boş olduğunu `ls -A` ile kontrol et.
- **Klasör taşınırken "Permission denied" hatası** → Windows'ta VS Code ya da bir terminal klasörü açık tutuyor, içindeki dosyalar kilitli değil → klasörü değil içindekileri `mv` ile taşı, sonra `git add -A`. Boş kalan eski klasör zararsızdır.
- **Animasyon bulunamıyor** → animasyonlar `animations/<kategori>/<slug>/` altında → yol yazma; araçlara slug ver (`tools/lib/animations.mjs` → `findAnimation`).

- **Ekran görüntüsü yanlış anı gösteriyor** → `bolum.isaret+0.5` gibi bir ifade noktadan bölünüp `+0` diye okunuyor → bölüm adını yalnızca ilk noktadan ayır.
- **Bash'te `cat > dosya` komutu takılı kalıyor** → heredoc verilmemiş, komut girdi bekliyor → dosyayı Write aracıyla yaz ya da `<<'EOF'` kullan.
- **Headless Chrome'da sayfa yükleme zaman aşımına uğruyor** (`networkidle`) → ses dosyaları akarken ağ hiç boşalmıyor → `waitUntil: 'load'` kullan ve sayfanın hazır işaretini bekle.
