# Çizgi film görünümünü kodla yakalamak

Tarih: 2026-09-26. Kapsam: yalnızca kod ile (Babylon.js / Three.js / Canvas 2D / SVG / CSS, gerekirse Remotion, Motion Canvas, Manim, Blender-Python) üretilen anlatımlı eğitim animasyonları. Üretken görsel/video/ses modelleri ve ücretli servisler kapsam dışıdır; bu belgede seçenek olarak bile geçmez.

## 1. Özet

Kurzgesagt, TED-Ed, MinuteEarth gibi kanalların "cilalı" görünümü iki şeyden gelir: **çok sayıda elle çizilmiş varlık** (Kurzgesagt'ta 10 dakikalık videoda ~200 özgün çizim, 2–3 illüstratörün 8–12 haftası) ve **animasyon zanaatı** (2–3 animatörün 8–10 haftası; videoya özel müzik ve ses tasarımı) [10.studio]. Kod ile bunun ilk yarısını (elle çizim yoğunluğu) yakalayamayız; ikinci yarısını (zamanlama, easing, kademeli giriş, ikincil hareket, kamera, ses) büyük ölçüde yakalayabiliriz. Sonuç olarak gerçekçi hedef şudur:

- **Ulaşılabilir:** Kurzgesagt'ın "düz vektör + yumuşak gradyan + grain" **sahne dili**; TED-Ed/MinuteEarth tarzı geometrik, az detaylı karakterler; kâğıt kesme (paper cut-out) tarih sahneleri; haritalar; toon-shaded 3B (Three.js `MeshToonMaterial` + dış hat); yazılım/sistem açıklayıcıları (ByteByteGo, Fireship tipi). Bunların hepsi geometrik ilkellerden (yuvarlatılmış dikdörtgen, daire, bezier) kurulabildiği için Claude'un kodla üretebileceği alandadır.
- **Ulaşılamaz (kodla):** Elle çizilmiş organik karakterler, çok pozlu (frame-by-frame) hareket, karmaşık yüz oyunculuğu, "çizim" hissi veren fırça dokusu. Bu alanda kodla üretilen her şey "ikonik/geometrik" kalır; bunu bir stil kararı olarak kabullenmek, taklit etmeye çalışmaktan iyi sonuç verir.

**Somut öneri (bu depo için):**

1. **Teknolojiyi değiştirme, disiplini değiştir.** Depodaki mevcut düzen (tarayıcıda çalışan sahne + `?video=1` ile Puppeteer'ın `renderAt(t)` çağırarak kare kare MP4 üretmesi, `tools/render-video.mjs`) zaten Remotion'un yaptığı şeyin özüdür: deterministik, zaman sürümlü sahne. Eksik olan araç değil, **stil kuralları ve animasyon ilkeleri**dir (bölüm 3, 7).
2. **2B animasyonlar için varsayılan:** SVG (az öğe, keskin metin, filtreler) ya da Canvas 2D (çok öğe, parçacık, grain). 3B gerekiyorsa Three.js/Babylon toon shading. Bu depoda her animasyon zaten kendi tekniğini seçiyor; bu belge yalnızca seçim gerekçelerini verir.
3. **Karakter için:** SVG grup hiyerarşili "kukla" (cut-out) rig; 2 eklemli kollar/bacaklar için analitik IK; göz kırpma + nefes idle döngüsü; Whisper kelime zamanlarından basit viseme (A/B/C/D/E/F) ağız değişimi. Kurzgesagt'ın kuşları gibi **ağzı olmayan ya da çok basit ağızlı** karakterler seç; en ucuz görünen şey kötü lip-sync'tir.
4. **Ucuz görünmemek için beş kural** (bölüm 7): asla lineer easing; her sahnede en az üç derinlik katmanı ve dokulu arka plan; kademeli (stagger) giriş; her ana harekete ikincil hareket; her vurguya ses efekti.
5. Remotion'ı **isteğe bağlı** tut: bireyler ve 3 kişiye kadar ekipler için ücretsizdir ama açık kaynak değildir; mevcut Puppeteer hattı aynı işi görüyor. Motion Canvas (MIT) TypeScript'le zamanlama-odaklı açıklayıcılar için düşünülebilir; Manim yalnızca matematik/algoritma sahneleri için.

## 2. Araçlar

| Araç | Verdiği görünüm | Claude ile ne kadar iyi | Lisans | Tarayıcıda mı, offline mı |
|---|---|---|---|---|
| **SVG + CSS/WAAPI/JS** (elle yazılmış) | Düz vektör, keskin metin, gradyan, `feTurbulence` grain, `feDropShadow`. Kurzgesagt/TED-Ed sahne dili için en doğrudan yol. | Çok iyi. LLM'ler SVG'yi doğrudan yazar; Claude Opus 4.6 geçerlilik (render olma) açısından neredeyse kusursuz, ama "stil aktarımı"nda zayıf (SVGenius). Pelikan-bisiklet benchmark'ı da gösteriyor: yapı iyi, organik detay zayıf. | Tarayıcı standardı; lisans yok | İkisi de. Bu deponun Puppeteer hattı doğrudan çalışır. |
| **Canvas 2D** (elle yazılmış) | Aynı düz vektör görünümü, artı parçacık, grain, yüzlerce/binlerce nesne; metin biraz daha yumuşak. | Çok iyi; deterministik `draw(t)` yazmak Claude için doğal. | Tarayıcı standardı | İkisi de. |
| **GSAP** (+ MorphSVG, DrawSVG, SplitText) | Zamanlama/easing motoru; görünümü belirlemez. Morph geçişleri, çizgi çizilme, harf harf tipografi. | Çok iyi; belgeler geniş, `web-animation-skills` gibi Claude Code skill'leri var. | Nisan 2025'ten beri tüm eklentiler dahil ticari kullanımda ücretsiz (Webflow) | İkisi de (deterministik seek için `timeline.time(t)`). |
| **Motion (motion.dev)** | Yay (spring) fiziği, GPU'da transform/opacity animasyonu. | Resmî "Motion AI Kit" skill/MCP'si var. | MIT | Tarayıcı. |
| **Remotion** (React) | Tarayıcıda çizilebilen her şey (CSS, SVG, Canvas, Three). Motion-graphics sahneleri, altyazı, geçişler için hazır bileşenler. | Çok iyi; Ocak 2026'da resmî Agent Skills ile Claude Code'a yönelik en çok belge/örnek üreten ekosistem. Belgeler `.md` olarak sunuluyor. | **Açık kaynak değil**; bireyler, ≤3 çalışanlı şirketler ve kâr amacı gütmeyenler için ücretsiz (ticari dahil). Sonrası ücretli. | Offline MP4 (headless Chrome, 150 kare 1080p ≈ 8–15 sn); aynı bileşen `<Player>` ile tarayıcıda oynar. |
| **Motion Canvas** | Canvas tabanlı, TypeScript generator'larla akış; teknik/vektör açıklayıcılar, kod sahneleri. Zaman olaylarını editörde sürükleyerek anlatıma oturtma özelliği. | İyi; API küçük ve tutarlı, ama Remotion kadar skill/örnek yok. | MIT (GPL'e geçiş tartışıldı, "süresiz ertelendi") | Offline (editörden render). Tarayıcı oynatıcısı v4'te kaldırılacak; yerine Lottie dışa aktarımı planlanıyor. |
| **Revideo** (Motion Canvas çatalı) | Motion Canvas + sunucu render API'si. | Orta. | MIT | Offline. |
| **Manim Community** | 3Blue1Brown görünümü: siyah zemin, matematiksel nesneler, dönüşümler. | İyi; Manimator, TheoremExplainAgent (ACL 2025), generative-manim gibi LLM hatları var. Matematik dışı "çizgi film" için uygun değil. | MIT | Offline (Python → MP4). |
| **p5.js / Pixi.js** | p5: üretken/parçacık sahneleri. Pixi v8: WebGL/WebGPU 2B, binlerce sprite, filtreler, Spine/DragonBones iskelet desteği. | İyi; ikisi de çok belgelenmiş. | p5 LGPL, Pixi MIT | Tarayıcı (kare yakalama ile offline). |
| **Lottie / dotLottie** | After Effects'ten dışa aktarılan vektör animasyon oynatma. Kod ile üretmek pratik değil (JSON şeması ağır). | Zayıf (elle JSON). Bizim için yalnızca hazır varlık oynatmak. | lottie-web, dotLottie SDK'ları MIT | Tarayıcı. |
| **Rive** | Etkileşimli durum makineli karakter/ikon animasyonu. Editör gerekir (ücretsiz plan var ama dışa aktarım Cadet 9 $/ay). | Zayıf (kodla üretilmez). | Runtimes MIT; editör kapalı, format özel | Tarayıcı. Bizim akışa uymaz. |
| **Theatre.js** | Web için zaman çizelgesi editörü; Three.js sahnelerini elle ayarlamak için. | Orta. 1.0 için geliştirme özel depoya taşındı; topluluk sürdürülebilirliğinden emin değil. | Apache-2.0 | Tarayıcı. |
| **Three.js toon** (`MeshToonMaterial` + gradyan haritası + `OutlineEffect`/ters hull) | Cel-shaded 3B: 2–3 kademeli gölge, siyah dış hat. Basit modeller + toon = "çizgi film 3B". MatCap ile boyalı görünüm. | İyi; sbcode ve resmî örnekler var. Modelleme kod ile sınırlı (ilkeller, extrude edilmiş SVG, GLB yükleme). | MIT | Tarayıcı (bu depo ile offline). |
| **Babylon.js** | Aynı; toon için özel shader/NodeMaterial gerekir, hazır malzeme yok. | İyi. | Apache-2.0 | Tarayıcı. |
| **Blender + Python** (Grease Pencil 3, Line Art modifier, Freestyle, toon shader) | En "gerçek" 2B/2.5B çizgi film görünümü: kalem çizgisi, çizgi kalınlığı, kâğıt dokusu, 3B kamera. `blender -b dosya.blend --python betik.py -a` ile headless render. | Orta. bpy API'sini Claude bilir ama GP3 API'si 4.3'te yeniden yazıldı; deneme-yanılma gerekir; sonucu tarayıcıda gösteremeyiz, yalnızca MP4. | GPL (üretilen video serbest) | Yalnızca offline. |
| **CSS animasyon** | UI-vari geçişler, tipografi. | Çok iyi. | — | Tarayıcı; `?video=1` ile deterministik seek için WAAPI `currentTime` kullanılmalı. |

**Karar:** Bu depo için ana yol SVG/Canvas + GSAP (isteğe bağlı) + Three.js toon (3B gerektiğinde), mevcut `render-video.mjs` ile MP4. Remotion ve Motion Canvas yalnızca tamamen offline üretilecek, siteye etkileşimli sürümü koyulmayacak videolar için düşünülür. Blender-Python yalnızca "kalem çizgisi" görünümü şart olduğunda ve web sürümü istenmediğinde.

## 3. Çizgi film görsel dili: kodla yeniden üretilecek kurallar

Kaynaklar: Kurzgesagt'ın kendi Skillshare dersi ve "How to Kurzgesagt?" üçlemesi (şekil/çizgi, gölgeleme/tonlama, renk/kontrast), TED-Ed "Animation Basics" koleksiyonu (zamanlama ve aralık), 12 animasyon ilkesinin motion graphics'e uyarlanması.

**Şekil ve çizgi**
- Her nesne 2–5 yuvarlatılmış ilkelden kurulur (`rx` verilmiş dikdörtgen, daire, kapsül, bezier). Keskin köşe yalnızca "tehlike/teknoloji" anlamı taşıyacaksa.
- Dış hat ya **hiç yok** (Kurzgesagt) ya da **her yerde aynı kalınlıkta ve palete ait koyu bir ton** (siyah değil). Karışım yapma. SVG'de `vector-effect="non-scaling-stroke"` ile ölçek değişse de kalınlık sabit kalır.
- Kurzgesagt'ın gölgeleme yaklaşımı: nesnenin üstüne aynı şeklin biraz kaydırılmış, biraz koyu bir kopyası (offset shape) ya da `clipPath` ile kesilmiş koyu bir yarım; bulanık gölge (`blur`) yok. Işık yönü tüm sahnede tek ve sabit (genelde sol-üst).
- "Rim light": kenarın aksi tarafında ince açık şerit. Kodla: aynı şekli 2 px içeri kaydırıp açık tonla, orijinalle kes.

**Renk**
- Sahne başına 5–7 renk: 1 zemin, 2 ana, 1–2 ara, 1 vurgu. Vurgu rengi (genelde sıcak: turuncu/sarı/magenta) yalnızca anlatıcının o an bahsettiği şeyde.
- Düz renk yerine **iki durak noktalı yumuşak gradyan** (ana ton → %10 koyu). Gradyan yönü ışıkla aynı.
- Zemin asla tek düz renk değil: büyük radyal gradyan (merkez açık) + grain. Uzak katmanlar zemine doğru soluyor (atmosferik perspektif: doygunluk ve kontrast düşer).
- Palet dosyada tek yerde tanımlanır (CSS değişkenleri); Claude'a "yeni renk icat etme" kuralı verilir.

**Doku**
- Grain: `feTurbulence type="fractalNoise" baseFrequency≈0.8–1.2` + `feColorMatrix` ile alfa düşürülmüş bir üst katman (`mix-blend-mode: overlay/soft-light`, %6–12 opaklık). Filtre animasyon sırasında yeniden hesaplanmasın diye grain **hareket etmeyen ayrı bir tam ekran katman** olarak durur (Canvas'ta bir kez üretilip `drawImage` ile bindirilir).
- Kâğıt kesme stili: her katmana `feDropShadow` (dx 0, dy 4–8, blur 6–10, %25 siyah) + hafif kâğıt dokusu. Katmanlar arasında gölge, derinlik hissinin tamamı.

**Derinlik ve kamera**
- En az üç katman: arka plan (yavaş), orta (sahne), ön (hızlı, bulanık ya da koyu siluet). Kamera hareketi tek bir `transform` ile katmanlara farklı çarpanla uygulanır (paralaks).
- Kamera hareketleri yavaş ve sürekli: 10 saniyede %5 zoom gibi "nefes alan" sahne; ani kesmeler yalnızca vurgu için.
- Geçişler: aynı şeklin başka bir şekle morph olması (GSAP MorphSVG ya da eşit nokta sayılı path'ler), bir nesnenin içine zoom-through, renk bloğuyla wipe. "Fade to black" en son çare.

**Hareket (12 ilkenin motion graphics'e uyarlanması)**
- **Easing:** Lineer hareket "ucuz" okunur (fiziksel hiçbir şey sabit hızla hareket etmez). Giriş `easeOutBack`/`easeOutExpo`, çıkış `easeInCubic`, konum değişimi `easeInOut`. Yay (spring) fizikli hareket hemen "canlı" görünür (Motion.dev, GSAP `elastic`, ya da elle sönümlü yay).
- **Squash & stretch:** Bir nesne hızlanırken hareket yönünde %5–10 uzar, dururken %5–10 basılır; hacim korunur (x×y sabit). Küçük değerler yeter; abartı çocuk türüne aittir.
- **Anticipation:** Zıplamadan önce çökme, hareketten önce ters yönde küçük kayma (80–120 ms).
- **Follow-through / overlapping:** Gövde durduktan sonra saç, anten, kuyruk, pelerin, kablo 1–2 salınım daha yapar; farklı parçalar farklı gecikmeyle durur.
- **Stagger:** Liste, ikon grubu, harfler 40–80 ms arayla girer; asla hep birlikte.
- **Arc:** El, top, kuş düz çizgide değil yay üzerinde gider (bezier üzerinde ilerleme).
- **Timing:** Bir sahnede aynı anda en fazla bir "ana" hareket; anlatım bir şeyi söylediğinde 100–300 ms sonra görünür (ses önde, görüntü izler).
- **Tipografi bir karakterdir:** Anahtar kelime ekrana harf harf/kelime kelime (SplitText) gelir, vurgu renginde, hafif ölçek animasyonuyla, sonra sahneye bağlanır. Metin blokları asla düz "fade in" ile gelmez.

## 4. Kodla karakter animasyonu

**Kukla (cut-out) rig — birkaç saatte kurulabilir**
- Karakter SVG `<g>` hiyerarşisi: gövde → baş → gözler/kaşlar/ağız; gövde → üst kol → alt kol → el; gövde → kalça → bacak → ayak. Her grup için pivot (`transform-origin` ya da `translate(pivot) rotate() translate(-pivot)`).
- Poz = eklem açıları sözlüğü; pozlar arası geçiş easing'li tween. 6–8 poz (nötr, işaret etme, şaşırma, düşünme, yürüme A/B, düşme) çoğu açıklayıcı için yeter.
- **IK:** 2 eklemli kol/bacak için analitik çözüm (kosinüs teoremi) 20 satırdır; "el şu noktaya uzansın" demeyi sağlar. Daha fazlası (FABRIK) nadiren gerekir.
- **Idle:** göz kırpma (rastgele 2–6 sn arayla, 120 ms kapanış), nefes (gövde `scaleY` %1–2, 3–4 sn periyot), hafif baş salınımı, ağırlık aktarma. Bunlar olmadan karakter "ölü" görünür; bunlarla görünüm bir anda dolar.
- **İfade durumları:** Kaşların açısı/yüksekliği + göz ölçeği + ağız path'i üçlüsü ile 5–6 ifade (nötr, mutlu, üzgün, şaşkın, kızgın, düşünceli); path'ler eşit nokta sayılı tutulursa morph edilir.
- **Yürüme döngüsü:** Prosedürel: bacak açısı `sin(t)`, karşı bacak faz farkı π, kalça dikey `|sin(2t)|`, kollar bacakların tersi fazda. Yandan bakış için 1 saatlik iş; 3/4 açı elle ayar ister.
- **Lip-sync:** Whisper kelime zamanlarımız var (`manifest.json → words`). Harf sınıfından viseme çıkarma (ünlüler: a→A/açık, e-i→genişçe, o-u→yuvarlak; b-m-p→kapalı; f-v→diş-dudak; diğer ünsüzler→hafif açık), kelime süresi harflere orantılı bölünür. Rhubarb Lip Sync (MIT, komut satırı; WASM portu da var) ses dosyasından doğrudan A–F(+G,H,X) ağız şekli zamanları verir ve çok daha doğrudur; altı ağız SVG'si çizmek yeter. Ağız değişimleri anlık (kesme) olur, tween edilmez; %10–20 gecikme toleranslı.
- **Gerçekçi beklenti:** Kurzgesagt kuşları gibi **ağzı olmayan** karakterler ya da yalnızca gövde/göz/kaş ile konuşan karakterler ("point-and-react") çok daha güvenli. Tam yüz oyunculuğu, elle çizilmiş dönüşler, karmaşık kıyafet/saç fiziği, ince el hareketleri gerçek animatör ister; kodla yapılan her denemesi yapay görünür.

**3B karakter:** Depodaki Avaturn avatarları + ARKit/viseme blendshape'leri toon shader ile "stilize gerçekçi" kalır; çizgi film görünümü için düşük poligonlu, büyük kafalı bir model gerekir; kodla modellenmez.

## 5. Türe göre stil ve referans kanallar

| Tür | Uygun stil (kodla) | Referans kanallar ve neden işe yaradıkları |
|---|---|---|
| **Belgesel** (doğa, tarih, toplum) | Stilize belgesel yapılıyor ve iyi çalışıyor: Kurzgesagt'ın hayvan videoları (karınca, hidra, tardigrad) düz vektörle "kamera" duygusu verir. Kodla: geniş katmanlı ortamlar, yavaş kamera, atmosferik perspektif, gerçekçi ölçek karşılaştırmaları, az konuşan karakterler. | Kurzgesagt (hayvan/doğa serileri: ölçek, tempo, ciddi ton + sevimli şekil); MinuteEarth (kalem-kağıt hissi, elle çizilmiş görünümde ama çok basit şekiller, her cümlede bir görsel fikir); Animalogic (gerçek görüntü, stilize değil; anlatım ritmi referansı). |
| **Bilim açıklayıcı** | Kurzgesagt sahne dili tam burada: ikonlar, diyagramlar, ölçek, süreç akışı, "bir karakter yolculuğu" (hücre, foton, virüs). | Kurzgesagt; MinutePhysics (tek renk, el çizimi hızlı skeç — kodla en kolay taklit edilen kanallardan: beyaz zemin, siyah çizgi, iki vurgu rengi); Primer (toon-shaded basit 3B "blob" karakterler + simülasyon; Three.js toon ile doğrudan ulaşılabilir). |
| **Yazılım/sistem açıklayıcı** | Koyu zemin, ikonlaştırılmış bileşenler, animasyonlu bağlantılar, akış boyunca ilerleyen paketler, kod bloklarının vurgulanması. En "kod-dostu" tür. | ByteByteGo (teknoloji ikonları, sıralı ortaya çıkış, çok az yazı, akış animasyonu); Fireship (hızlı kesme, stok ikon + kısa metin, ses tasarımı ve mizah taşır; görselleri çoğunlukla sabit); Motion Canvas'ın kendi yapımcısı aarthificial (kod/algoritma açıklayıcıları — aracın ne için yapıldığını gösterir). |
| **Tarih** | Kâğıt kesme (katman + gölge + doku), haritalar üzerinde ok/hareket, sınır morph'u, dönemin renk paleti (sepya, bez dokusu), kesik pozlu kuklalar. | OverSimplified (kasıtlı basit çubuk-adam kuklalar, mizah ve ritim; "kodla yapılabilir" hissini en çok veren kanal); Armchair Historian (tam boyanmış karakterler + harita; karakter kısmı ulaşılmaz, harita kısmı ulaşılabilir); Extra History (Extra Credits — düz vektör, gölgesiz, güçlü siluet); History Matters (10 dakikada ülke tarihi, en basit kuklalar). |
| **Çocuk** | Büyük, yuvarlak, doygun renkli şekiller; abartılı squash & stretch; yüzü olan her nesne; yavaş tempo; tekrar. | Peekaboo Kidz / Dr. Binocs (tek anlatıcı karakter + basit sahneler); Cocomelon (3B, yumuşak toon; ulaşılabilir değil ama renk/tempo referansı); TED-Ed'in genç izleyiciye dönük bölümleri. |

Ortak gözlem: bu kanalların hiçbiri "çok detaylı" değil; hepsi **tutarlı** ve **ritmi ses ile birebir** oturmuş. Kodun avantajı da tutarlılıktır (aynı fonksiyon her nesneyi aynı biçimde çizer); dezavantajı ritimdir (ses zamanlarını sahne zamanına bağlamak elle ayar ister — depodaki Whisper kelime zamanları bunu çözer).

## 6. Performans

Hedef: sıradan dizüstü (iGPU) üzerinde 1080p'de 60 fps; hiç donma.

- **SVG:** Yüzlerce öğeye kadar sorunsuz; birkaç bine doğru hızla bozulur. Her karede `d`, `cx`, `r` gibi geometri niteliklerini değiştirmek layout/paint tetikler; **`transform` ve `opacity`** (CSS/WAAPI ile) compositor'da çalışır. **SVG filtreleri** (blur, turbulence, drop shadow) animasyon sırasında her karede yeniden hesaplanır — filtre uygulanan öğeyi ya da çocuklarını hareket ettirme; filtreyi sabit bir katmana koy. SMIL kullanma (tarayıcıların yatırımı yok).
- **Canvas 2D:** Binlerce nesnede 60 fps; parçacık, grain, yumuşak gradyanlar, çok katmanlı sahneler için varsayılan. Sabit katmanları (arka plan, grain) ayrı offscreen canvas'lara bir kez çiz, her karede `drawImage` ile bindir. Yazı keskinliği için `devicePixelRatio` ölçekle.
- **WebGL/WebGPU (Pixi, Three):** 10 binlerce nesnede bile sabit; toon shading, post-process dış hat, MatCap için gerekli. Bedeli: metin ve UI'yi ayrı DOM katmanında tutmak; iGPU'larda post-process (outline pass) 1080p'de 2–4 ms yer, üst üste 3 pass'ten kaçın.
- **Genel kurallar:** Tek bir `requestAnimationFrame` döngüsü; DOM okuma (`getBBox`, `offsetWidth`) ve yazmayı karıştırma (layout thrashing); okumaları toplu yap ya da geometriyi baştan hesapla. `will-change: transform` yalnızca gerçekten hareket eden 10–20 katmana; hepsine verme (bellek). Grain'i `mix-blend-mode` ile tam ekran DOM katmanı yapmak iGPU'da pahalı olabilir; Canvas'ta bir kez üretilmiş noise görüntüsü daha ucuz. **OffscreenCanvas + Worker** ana iş parçacığı meşgulken (altyazı DOM güncellemesi, ses yükleme) animasyonun takılmamasını sağlar; karmaşıklığa değer mi, animasyona göre karar ver.
- **Deterministik zaman:** Her şey `t` (saniye) fonksiyonu olmalı; `Date.now()`/delta birikimi yok. Böylece aynı kod tarayıcıda 60 fps oynar, `render-video.mjs` ile kare kare MP4 olur ve ses ile kayması olmaz. CSS animasyonları kullanılıyorsa WAAPI `animation.currentTime` ile seek edilebilir olmalı.
- **Offline + hafif web sürümü:** Ağır efektler (yoğun grain, blur, çok parçacık, 3B post-process) `?video=1` modunda açılır, web sürümünde kapatılır ya da azaltılır (ör. parçacık sayısı 5 kat düşük, grain statik). Remotion bu ayrımı `<Player>`/render ile aynı bileşende yapar; bizde tek bir `quality` bayrağı aynı işi görür.

## 7. Ucuz görünmemenin listesi

| Ucuz görünen şey | Neden | Somut düzeltme |
|---|---|---|
| Lineer ya da varsayılan `ease` | Fiziksel hiçbir şey sabit hızla gitmez | Giriş `easeOutExpo`/`back`, çıkış `easeIn`, konum `easeInOut`, tepki hareketleri yay (spring). Palet gibi easing seti de tek dosyada tanımlanır. |
| Her şeyin aynı anda girmesi | Göz nereye bakacağını bilemez | 40–80 ms stagger; ana nesne önce, destekleyiciler sonra. |
| Hareket durunca her şeyin aynı anda durması | Ağırlık yok | Follow-through: eklentiler (saç, kuyruk, kablo) 1–2 sönümlü salınım daha; küçük overshoot (%3–5). |
| Boş, düz renk arka plan | Sahne yok, "slayt" var | Radyal gradyan + grain + en az bir arka ve bir ön katman; uzak katmanlar soluk. |
| Her yerde aynı kalın siyah dış hat ya da karışık kalınlıklar | Klip-art hissi | Ya hiç dış hat ya da paletten koyu ton, sabit kalınlık, `non-scaling-stroke`. |
| Bulanık `box-shadow`/`blur` gölgeler | Web UI hissi | Offset şekil gölgesi (kesik, sert kenar) ya da kâğıt kesme için tek yönlü yumuşak drop shadow. |
| Statik karakter | Ölü görünür | Blink + nefes + ağırlık aktarma idle döngüsü her karakterde varsayılan. |
| Kötü lip-sync | Uncanny | Ya ağız yok ya da Rhubarb/viseme ile 6 ağız şekli, kesmeli geçiş. |
| Metnin fade ile gelmesi | Slayt hissi | Kelime/harf stagger, vurgu rengi, ölçek 0.9→1 ile "yerleşme". |
| Sessiz vurgular | Kurzgesagt'ta her anahtar kelimede "boom", her geçişte whoosh var | Kısa SFX kütüphanesi (CC0: freesound/kenney), anlatım altında düşük müzik, ses düzeyi otomasyonu (ducking). Bu tek başına algılanan kaliteyi en çok artıran maddedir. |
| Sabit kamera | Statik | 10–20 sn'de %3–5 yavaş zoom/pan; vurguda hızlı push-in (200 ms, easeOut). |
| Rastgele renkler | Tutarsız marka | 5–7 renk, tek vurgu; Claude'a palet dışı renk yasağı. |
| Her sahnede aynı kompozisyon (ortada nesne) | Tekdüze | Üçler kuralı, asimetri, boş alanı kasıtlı kullanma; en az üç farklı kadraj ölçeği (geniş/orta/yakın). |
| İkonların gerçek dünyayla ölçeksiz olması | Öğretici değeri düşer | Ölçek karşılaştırma sahneleri (insan silueti, madeni para, Dünya). |

## 8. Kaynaklar

Araçlar ve lisanslar
- Remotion lisans ve fiyat: https://www.remotion.dev/docs/license/pricing ve SSS https://www.remotion.dev/docs/license/faq ; lisans metni https://github.com/remotion-dev/remotion/blob/main/LICENSE.md ; AI belgeleri https://www.remotion.dev/docs/ai/
- Remotion + Claude Code skill'i (topluluk): https://github.com/haidrrrry/claude-remotion-skill ; Remotion Agent Skills haberi: https://www.startuphub.ai/ai-news/artificial-intelligence/2026/remotion-ai-video-makes-production-code-from-plain-prompts ; deneyim yazısı: https://louisedesadeleer.substack.com/p/how-i-make-custom-motion-graphics
- Remotion vs Motion Canvas vs Revideo: https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026 ; https://rendercomp.com/blog/remotion-vs-motion-canvas-comparison/ ; https://cameledge.com/post/productivity/remotion-vs-motion-canvas
- Motion Canvas: https://github.com/motion-canvas/motion-canvas ; lisans tartışması (MIT'de kaldı): https://github.com/orgs/motion-canvas/discussions/1015 ; Manim'den geçiş notları: https://slama.dev/motion-canvas/introduction/
- Manim Community (MIT): https://github.com/ManimCommunity/manim ; LLM hatları: Manimator https://arxiv.org/html/2507.14306v1 , generative-manim https://github.com/marcelo-earth/generative-manim , manim-generator https://github.com/makefinks/manim-generator
- GSAP ücretsiz: https://webflow.com/blog/gsap-becomes-free ; https://gsap.com/community/standard-license/
- Motion AI Kit (skill/MCP): https://motion.dev/docs/ai-kit ; Web animasyon skill'leri: https://github.com/iart-ai/web-animation-skills
- Theatre.js: https://github.com/theatre-js/theatre ; sürdürülebilirlik sorusu: https://github.com/theatre-js/theatre/issues/504
- Rive runtime'ları (MIT) ve fiyat: https://github.com/rive-app/rive-wasm ; https://rive.app/docs/account-admin/pricing ; Rive vs Lottie: https://unicornicons.com/learn/rive-vs-lottie
- dotLottie (MIT): https://github.com/lottiefiles/dotlottie-web
- Pixi.js v8 + Spine: https://pixijs.com/blog/pixi-js-hearts-spine ; DragonBones (ücretsiz) örneği: https://alcalyn.github.io/pixijs-dragonbones/
- Three.js toon: https://threejs.org/docs/#api/en/materials/MeshToonMaterial ; https://sbcode.net/threejs/meshtoonmaterial/ ; özel toon shader: https://www.maya-ndljk.com/blog/threejs-basic-toon-shader ; OutlinePass: https://threejs.org/examples/webgl_postprocessing_outline.html ; tam kenar dış hat post-process: https://discourse.threejs.org/t/how-to-render-full-outlines-as-a-post-process-tutorial/22674 ; Babylon'da outline: https://forum.babylonjs.com/t/tips-on-how-to-create-something-like-three-postprocessing-outline-in-babylon-js/31907
- Blender komut satırı: https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html ; Grease Pencil 4.3 notları (API yeniden yazıldı): https://developer.blender.org/docs/release_notes/4.3/grease_pencil/ ; Line Art modifier: https://docs.blender.org/manual/en/latest/grease_pencil/modifiers/generate/line_art.html ; Freestyle→GP betiği: https://github.com/legend-of-wind/Freestyle-to-GreasePencil-blender ; GP scripting: https://blenderartists.org/t/blender-2-8-grease-pencil-scripting-and-generative-art/1150108
- LLM'lerin SVG çizme kalitesi: https://simonwillison.net/2025/Nov/25/llm-svg-generation-benchmark/ ; https://github.com/simonw/pelican-bicycle ; SVGenius: https://arxiv.org/html/2506.03139v1

Stil ve süreç
- Kurzgesagt süreç: https://10.studio/the-incredible-amount-of-work-behind-kurzgesagts-beautiful-animated-videos/ ; https://medium.com/@savytecharticles/animated-video-production-how-kurzgesagt-videos-are-made-and-why-they-are-so-fascinating-f2b8a8abe0a3 ; Skillshare dersi: https://www.skillshare.com/en/classes/motion-graphics-with-kurzgesagt-part-1/631970755 ; hakkında: https://kurzgesagt.org/what-we-do?visit=videos
- "How to Kurzgesagt?" üçlemesi: şekil/çizgi https://www.youtube.com/watch?v=rs_BiKgpSPM , gölge/tonlama https://www.youtube.com/watch?v=ByYNLEl160M , renk/kontrast https://www.youtube.com/watch?v=_VrNiya8kLg ; karakter tutorial: https://www.youtube.com/watch?v=6VxIVgevGrY
- TED-Ed süreç ve animasyon temelleri: https://ed.ted.com/lessons/making-a-ted-ed-lesson-animation ; https://ed.ted.com/lessons/making-a-ted-ed-lesson-creative-process ; https://ed.ted.com/ted_ed_collections/animation-basics ; https://blog.ed.ted.com/2016/04/28/8-facts-i-learned-by-animating-ted-ed-lessons/ ; TED-Ed tarzı rehber: https://graphicmama.com/blog/how-cartoon-animation-ted-ed/
- 12 ilke → motion graphics/UI: https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design ; https://www.motiontheagency.com/blog/12-principles-of-animation ; https://www.animaker.com/hub/12-principles-of-animation/
- Ucuz görünme nedenleri: https://promohyper.com/blog/motion-graphics-video-maker ; https://blog.hansoninc.com/easing-excessiveness-and-pace-in-motion-design/ ; https://olafmotion.com/tutorials/how-to-create-expensive-brand-animations/ ; https://www.artemisiacollege.com/feeds/blog/secondary-motion-animation-example
- Grain/doku: https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/ ; https://css-tricks.com/grainy-gradients/ ; https://www.fffuel.co/nnnoise/
- Kâğıt kesme: https://ishadeed.com/article/thinking-about-the-cut-out-effect/ ; https://freefrontend.com/css-paper-effects/
- Kanallar: ByteByteGo tarzı https://dev.to/rahishsaifi/how-to-create-bytebytego-like-animated-diagrams-for-free-4ece ; Fireship süreç https://www.youtube.com/watch?v=N6-Q2dgodLs ; tarih kanalları https://www.tastyedits.com/top-history-channels-youtube/ , https://vidpros.com/best-history-youtube-channels/ ; bilim kanalları https://motionaptitude.substack.com/p/5-top-science-education-youtube-channels ; çocuk kanalları https://graphicmama.com/blog/best-educational-cartoon-channels/ ; Kurzgesagt hayvan videoları https://logicface.co.uk/5-kurzgesagt-videos-about-animals/

Karakter animasyonu
- Rhubarb Lip Sync (MIT): https://github.com/DanielSWolf/rhubarb-lip-sync ; WASM portu https://github.com/danieloquelis/rhubarb-lip-sync-wasm ; tarayıcı viseme motoru https://github.com/Amoner/lipsync-engine
- Cut-out (kukla) animasyon: https://en.wikipedia.org/wiki/Cutout_animation ; 2B rig teknikleri https://educationalvoice.co.uk/2d-rigging-techniques/

Performans
- SVG vs Canvas vs WebGL: https://dev.to/vitalf/svg-vs-canvas-vs-webgl-for-diagram-viewers-tradeoffs-bottlenecks-and-how-to-measure-34n7 ; https://www.yworks.com/blog/svg-canvas-webgl ; https://css-tricks.com/weighing-svg-animation-techniques-benchmarks/ ; https://motion.dev/docs/svg-animation ; https://oreillymedia.github.io/Using_SVG/extras/ch19-performance.html
- Compositor-only özellikler ve layout thrashing: https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count ; https://web.dev/articles/animations-guide ; https://motion.dev/magazine/web-animation-performance-tier-list
- OffscreenCanvas: https://web.dev/articles/offscreen-canvas ; https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- Remotion Player (aynı bileşen, tarayıcı/offline): https://www.remotion.dev/docs/player/player
