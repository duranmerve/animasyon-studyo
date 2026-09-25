# Opus 5.5 ile kodla üretilen animasyonlar: alan taraması

Tarih: 26 Eylül 2026. Kapsam: Eylül 2025 – Eylül 2026 arasında, özellikle Claude Opus 5.5 / Claude Code ile **yalnızca kod yazdırarak** (Three.js, Canvas 2D, WebGL/WebGPU, p5, Remotion, Manim, SVG/CSS) üretilmiş animasyonlar, kısa filmler ve etkileşimli sahneler. Görsel/video üretim modelleriyle (Veo, Sora, Kling, Midjourney) yapılan işler kapsam dışıdır.

---

## 1. Özet

- Opus 5.5 (22 Eylül 2026'da çıktı) ile birlikte X'te bir dalga oluştu: "Claude her kareyi JavaScript ile çizdi" başlıklı 20–60 saniyelik kısa filmler. Bunların büyük çoğunluğu **iki teknik aileden** biriyle yapılıyor:
  1. **Canvas 2D "draw(ctx, t)" filmleri:** tek bir HTML dosyası; her kare yalnızca zamanın saf bir fonksiyonu (durum tutulmaz, `Math.random()` yok, tohumlu rastgelelik var); müzik Web Audio ile aynı sayfada sentezleniyor; headless Chrome kare kare `seek(t)` ile ekran görüntüsü alıyor, ffmpeg MP4'e çeviriyor. Kevin Ngo, Addy Osmani, Voxyz, Higgsfield, PDoomVideo, @AIMevzulari'nin "16 sahne" videosu bu ailedendir.
  2. **Three.js sahneleri:** çoğu CDN'den yüklenen tek dosya, tüm nesneler prosedürel (model/doku yok), bloom + vignette + film grain gibi post-processing, day/night döngüsü, sinematik kamera. Meng To'nun tekne sahnesi, Vib3Coded'ın korsan gemisi, "Whitespace" katedral filmi, Shimecki'nin 8 saatlik Pixar-vari filmi bu ailedendir. Daha ileri işler WebGPU + TSL (compute particle, godrays) kullanıyor ama bunlar çoğunlukla profesyonellerin (ektogamat gibi) elle kurduğu depolardır.
- KOR benzeri kısa filmlerde **sır kütüphane değil, iş akışı**: kısa bir brief → Claude'un kendi yazdığı "treatment/storyboard" ve stil rehberi → paralel alt ajanlarla sahne sahne kod → contact sheet (2 fps kare tablosu) ile Claude'un kendi kendini eleştirmesi → ikinci geçiş. PDoomVideo ve iart/klsoen skillleri bu döngüyü kodlamıştır.
- "Tek atış" ifadesi neredeyse her zaman **tek oturum** demektir, tek deneme değil. Kamuya açık işlerin çoğu 1–8 saat, 10–175 dolar arası maliyet bildiriyor ve ikinci geçişte "düzeltme" olduğunu itiraf ediyor. Başarısız denemeler paylaşılmıyor.
- Bizim kanalımız için en uygulanabilir yol: **Canvas 2D / SVG kare kare motoru + kendi anlatım hattımız** (sesi zaten yerelde üretiyoruz). Three.js'i belgesel ve fizik gibi derinlik gerektiren kategorilerde, prosedürel + toon/ressam post-process ile kullanmak; matematikte Manim; yazılımda Remotion/Motion Canvas tarzı "siyah tuval + çizgi sanat" tercih etmek.

---

## 2. Örnekler

| # | Ne | Teknik | Brief görünüyor mu? | Kod bağlantısı |
|---|----|--------|---------------------|----------------|
| 1 | **KOR** — 40 sn sözsüz 3D kısa (karlı gece, atkılı yuvarlak yaratık, ağaçtan yayılan ışık). @FornYapayZeka, 23 Eyl, 50 bin görüntülenme | Yalnızca "Opus 5.5" ve "astronomik ucuz maliyet" söyleniyor; görüntüden Three.js + bloom + kar parçacığı + emissive ışık yayılımı tahmin edilebilir | Hayır (ne prompt ne süreç) | Yok. [x.com/FornYapayZeka/status/2102868722998501654](https://x.com/FornYapayZeka/status/2102868722998501654) |
| 2 | **"Süpernovadan buharlaşan kara deliklere" 16 sahne** — @AIMevzulari, 25 Eyl. Toby Ord risk tahminleriyle biten 50 sn | Canvas 2D; "binlerce prosedürel fırça darbesi ve kâğıt dokusu"; 3D kütüphanesi yok; müzik kodla sentez; TR/EN ses Higgsfield + Claude MCP (bu kısım harici) | Kısmen: "tek atımda, 1 saate yakın"; Higgsfield'ın "past and future of our world, no image or video models" briefinden esinlenmiş | Yok. [x.com/AIMevzulari/status/2103386522510573967](https://x.com/AIMevzulari/status/2103386522510573967) |
| 3 | **"What do you love?"** — Kevin Ngo, 28 sn kare kare hikâye, 626 bin görüntülenme, 6 bin beğeni | Canvas 2D `draw(ctx,t)`, Web Audio müzik, 2160×2160 kare kare render | Hikâye özeti var, prompt yok | Yok. [x.com/kevin_t_ngo/status/2102437977435893771](https://x.com/kevin_t_ngo/status/2102437977435893771) |
| 4 | **"How browsers work in 40 seconds"** — Addy Osmani (Anthropic DevRel), el çizimi tarzı açıklayıcı, 206 bin görüntülenme | Canvas 2D kare kare JS | Hayır | Yok. [x.com/addyosmani/status/2103009037164110327](https://x.com/addyosmani/status/2103009037164110327) |
| 5 | **"small print"** — Voxyz, 29 sn kısa; hikâye + kareler + müzik tamamı model | JS animasyon (HyperFrames ile render), Python ile müzik sentezi, tek index.html; "saniye saniye izleyip tekrar cilaladı" | "Tek satır kod yazmadım" — prompt yok | Yok. [x.com/Voxyz_ai/status/2102531681450119426](https://x.com/Voxyz_ai/status/2102531681450119426) |
| 6 | **"I'm Upping My P(doom)" müzik videosu** — John Heibel, 156 sn sulu boya | p5.js + p5.brush; `render.mjs` headless Chrome paralel kare render + ffmpeg; Opus kendi `ANIMATION_GUIDE.md` ve `STORYBOARD.md`'sini yazıp alt ajanları yönetti; iki nesil | Evet: "Clawd karakterini kullan, her söz için görsel olarak ilginç geçiş" + ikinci geçişte "p5 fırça darbeleri, her sahne bir sonrakine aksın" | [github.com/JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) (lisans belirtilmemiş) |
| 7 | **Battle of Austerlitz** — 5 dk tarihî savaş filmi; gerçek SRTM yükseklik verisi, tarihe uygun güneş açısı; 90 dk geliştirme + 4 saat render, 40 $ | Saf WebGL2 + GLSL (Three.js değil); arazi/bulut shader'ları; **Kuwahara filtresi** ile ressam görünümü + tuval dokusu + grain; prosedürel sprite atlası (asker/at); Kokoro TTS; Python ile müzik; mesafeye göre ses gecikmesi | Kısmen (süreç ve pipeline README'de) | [github.com/WinterArc21/Battle-of-Austerlitz-Film](https://github.com/WinterArc21/Battle-of-Austerlitz-Film) (lisans yok). Tweet: [x.com/i/status/2103116235009347650](https://x.com/i/status/2103116235009347650) |
| 8 | **History of AI (3 dk)** — @kimmonismus, "Attention is all you need"den AGI'ye | Remotion (React/TS, ~7.400 satır), SVG + Canvas görseller, açık kaynak TTS, Python ile müzik | Evet: "no stock footage, no image or video generators: every frame rendered from code" | Yok. [x.com/kimmonismus/status/2102844654169575547](https://x.com/kimmonismus/status/2102844654169575547) |
| 9 | **Western civilization (2 dk)** — @IterIntellectus, 11,4 milyon görüntülenme | Mimari ve dönemler üzerinden diyagramatik kodlu animasyon (tür açıklanmadı; görünüşe göre Canvas/SVG) | "i asked claude to make a video on western civilization" — bu kadar | Yok. [x.com/IterIntellectus/status/2103212539895017864](https://x.com/IterIntellectus/status/2103212539895017864) |
| 10 | **Whitespace / 余白** — 36 sn dikey katedral filmi: "busy/deadline" yazan gri küpler vitrayı kapatır, sonra çözülür ve renkli ışık yere düşer | Three.js, 1080×1920 30 fps kare kare; vitray deseni hem pencere hem yer projeksiyonu için tek kaynaktan; renk soluktan mücevher tonlarına | **Evet, ayrıntılı** (çözünürlük, fps, ışık hesabı, renk gidişatı, "insan figürü yok") | Yok. [x.com/i/status/2103145567945986461](https://x.com/i/status/2103145567945986461) |
| 11 | **Sakura vadisinde tekne** — Meng To, oynanabilir Three.js; dinamik hava, gece/gündüz, su yansımaları, 3D karakterler; 453 bin görüntülenme | Three.js; su yansıma/fizik; "saatlerce yineleme" | Hayır | Canlı: [valley.mengto.here.now](https://valley.mengto.here.now); kaynak yok. [x.com/MengTo/status/2102760783344189761](https://x.com/MengTo/status/2102760783344189761) |
| 12 | **Gün batımında korsan gemisi** — Vib3Coded; Opus 5.5 ile GPT-6 Astra karşılaştırması ("Opus ışık, yelken ve köpüklü izde daha sinematik") | Three.js tek HTML; okyanus shader'ı, gün batımı ışığı, köpük/wake, kamera hareketi, renk düzenlemesi | Evet: uzun madde madde brief (gemi, yelken, arma, köpük, wake, parçacık, kamera, kompozisyon, atmosferik derinlik, color grading, ekran yazısı yok) | Yok. [x.com/Vib3Coded/status/2102533729746882985](https://x.com/Vib3Coded/status/2102533729746882985) |
| 13 | **Pixar-vari 90'lar çizgi filmi (3:49)** — Shimecki; 7 sa 58 dk, 173,23 $ | Three.js, sesli | Evet: "imagine a story. And then using threejs I want you to create full animation, Pixar-level quality 90s cartoon" | Yok. [x.com/i/status/2102788223835463902](https://x.com/i/status/2102788223835463902) |
| 14 | **Kum animasyonu: ABD'nin 250 yılı (2 dk)** — Michael Guo; seslendirme + efektler | 2D Canvas, prosedürel ses | "tek basit prompt" — prompt görselde | Yok. [x.com/Michaelzsguo/status/2102592355165782312](https://x.com/Michaelzsguo/status/2102592355165782312) |
| 15 | **Cam mozaik filmi (80 sn)** — Chris Riley; 127 bin görüntülenme | WebGL2 + vanilla JS; "cam ve altın varak mozaik, sürü davranışıyla hareket eden karolar" | Prompt videoda gösteriliyor | Yok. [x.com/LCSlates/status/2102503027340988559](https://x.com/LCSlates/status/2102503027340988559) |
| 16 | **Piksel büyücü** — Majid Manzarpour; 426 bin görüntülenme | Saf JS piksel ızgarası 128×96, 24 renklik palet, durum makinesi, parçacıklar | Evet (ayrı gönderide) | Yok. [x.com/majidmanzarpour/status/2102476258948927543](https://x.com/majidmanzarpour/status/2102476258948927543) |
| 17 | **Su döngüsü (seamless loop)** — Higgsfield | Three.js, tek HTML, zaman çizelgeli, son sahne başa bağlanıyor | Evet: "Create a seamless looping animation of the water cycle, entirely in code." | Yok. [x.com/i/status/2102781807179735211](https://x.com/i/status/2102781807179735211) |
| 18 | **A Cosmic Journey (95 sn)** — @rege_dev; Sagan'ın "Pale Blue Dot" anlatımı üstüne | Kare kare, zaman çizelgesi, SFX ve ses tasarımı kodla | "Nasıl yapıldı: yorumlarda" | Yok. [x.com/rege_dev/status/2103022926752854201](https://x.com/rege_dev/status/2103022926752854201) |
| 19 | **Motion design showreel (15 sn)** — ajith_io / Dev Khanna; kinetik tipografi, akışkan sim, Bauhaus, müzik | Three.js | Evet: "make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel" | Yok. [x.com/i/status/2103504887439065439](https://x.com/i/status/2103504887439065439) |
| 20 | **Cycle of Life (20 sn loop)** — Loïc; çocukluktan ölüme aynı kişi | Three.js motion graphics | Evet (aynı showreel kalıbı + "kesip başa döngü") | Yok. [x.com/i/status/2103428454355980558](https://x.com/i/status/2103428454355980558) |
| 21 | **Neon Euler akışkan sim** — @theailoser | Saf WebGL 1/2, özel fragment shader'lar, vortisite, kromatik sapma, bloom, glassmorphism HUD, tek HTML | "İlk prompttan, düzeltmesiz" | Yok. [x.com/i/status/2102565611473661963](https://x.com/i/status/2102565611473661963) |
| 22 | **Bugatti Chiron prosedürel** — Sree; 1.466 satır | Three.js, model/doku/asset yok | Evet: "build a Bugatti Chiron Super Sport in Three.js. No 3D model. No textures. No assets." | Yok. [x.com/i/status/2102828216289566725](https://x.com/i/status/2102828216289566725) |
| 23 | **Üç oyun tek cümleyle** — pelikan bisiklet, FPS, yarış | Three.js modüler `src/` (11–18 dosya) → esbuild ile tek HTML (700–840 KB); tüm mesh/doku/ses prosedürel; Claude Code, 1M bağlam, `xhigh` çaba; headless tarayıcıda 320 sn soak test + alt ajan kod incelemesi | Evet (tek cümlelik promptlar README'de) | [github.com/chandan0000001/by_opus](https://github.com/chandan0000001/by_opus), [github.com/riba2534/claude-opus-5-5-demo](https://github.com/riba2534/claude-opus-5-5-demo) (ticari değil) |
| 24 | **100 HTML dosyası** — Mia; jeneratif sanat, fizik sim, orrery, sarkaç dalgası, mürekkep (sumi) sim, tipografi | Tek dosya, harici bağımlılık yok, CSS/JS/SVG | Evet: her kartın promptu görünür | [miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files](https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/) |
| 25 | **"Tek satır düzeltmeni istemiştim"** — iart.ai komedi kısa; 81 KB tek HTML; ikinci yineleme ("director review" uygulandı) | Canvas 2D + Web Audio; contact sheet ile öz-eleştiri | Evet (blogda) | [github.com/iart-ai/javascript-animation-skills](https://github.com/iart-ai/javascript-animation-skills) (MIT) |
| 26 | **iart.ai 6 açıklayıcı** (GPS, Enter'a bastıktan sonraki yarım saniye, AI tarihi, Ay'ın evreleri, uyku öncesi Ay masalı...) | Canvas 2D + sentez müzik; hareket/kesme istatistikleriyle ölçülmüş | Evet: kısa, platform+süre+kitle belirten cümleler | [iart.ai/blog/canvas-animation-examples](https://www.iart.ai/blog/canvas-animation-examples) |
| 27 | **Opus'un "kendi yaptığı" 30 sn Kung Fu Panda tarzı montaj**, **Rube Goldberg makinesi (özel fizik)**, **kalabalık tahliye simülasyonu** vb. 33 örnek | Three.js ağırlıklı | Çoğunda prompt var | [github.com/TripoGrowthLab/awesome-opus-5-5-prompts](https://github.com/TripoGrowthLab/awesome-opus-5-5-prompts) (MIT, kürasyon) |
| 28 | **Edwin Hayward'ın 30 sn sahnesi** | Saf JS/CSS/HTML | Evet: "Build a gorgeous animation using only pure JS, CSS, HTML. It should be an entertaining and recognisable scene, detailed, and the full animation should last at least 30s with a number of complex graphical elements." | Yok. [x.com/edwinhayward/status/2102569255657259036](https://x.com/edwinhayward/status/2102569255657259036) |

**Gözlem:** 28 örneğin yalnızca 6'sının kodu açık. Viral olanların (Ngo, Osmani, IterIntellectus, Meng To) hiçbirinin kaynak kodu ya da tam promptu yok. Kodu açık olanlar (PDoomVideo, Austerlitz, by_opus, iart skill) tekniği ve iş akışını öğrenmek için yeterli.

---

## 3. Kullanılan depolar ve şablonlar

### Kare kare "video-as-code" hatları (bize en uygun)

| Depo | Ne | Lisans |
|------|----|--------|
| [iart-ai/javascript-animation-skills](https://github.com/iart-ai/javascript-animation-skills) | Claude Code skilli: `draw(ctx,t)` çizim kütüphanesi (el çizimi mürekkep, illüstrasyon, metin-şekil), Playwright ile seek-and-render → MP4, contact sheet, "sıfır asset" denetimi; ayrı **soundtrack** skilli: Web Audio, dört enstrüman kiti, her sahne kesmesini vuruşa oturtan tempo haritası, A/V senkron doğrulaması | MIT |
| [klsoen/opus-js-animations](https://github.com/klsoen/opus-js-animations) | "Brief → ses → dinleme analizi → yön soruları → sahne sahne treatment → onay → render" akışı; `seek(t)` sözleşmesi; Canvas 2D + WebGL shader (varsayılan), Three.js ve raymarch seçenekleri; paralel headless Chrome işçileri; her iddia render edilmiş karede doğrulanır | MIT |
| [JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) | p5.brush sulu boya müzik videosu; `render.mjs` paralel kare render; Opus'un alt ajanlar için yazdığı `ANIMATION_GUIDE.md` (bkz. bölüm 4) | Belirtilmemiş |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | HTML/CSS + GSAP/Three.js/Lottie/WAAPI adaptörleriyle deterministik MP4; Claude skilleri (`/faceless-explainer`, `/music-to-video`) | Apache 2.0 |
| [WinterArc21/Battle-of-Austerlitz-Film](https://github.com/WinterArc21/Battle-of-Austerlitz-Film) | WebGL2 + GLSL, Kuwahara ressam filtresi, prosedürel sprite atlası, gerçek arazi verisi, Kokoro TTS, Python müzik, altyazı, ffmpeg | Belirtilmemiş |
| [Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer) | Konu → araştırma → anlatım+TTS → storyboard → paralel ajanlarla shot bileşenleri → Remotion render → QC; siyah tuval, beyaz çizgi sanat + mor vurgu, bölüm ilerleme çubuğu, kelime sınırına hizalı altyazı | **PolyForm Noncommercial** (ticari kullanım izin ister) |
| [haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill), Remotion resmî agent skills | Remotion ile motion graphics, altyazı, B-roll | Remotion'un kendisi şirketler için ücretli lisans ister (bireysel/küçük ekip ücretsiz) |
| [apoorvlathey/motion-canvas-skills](https://github.com/apoorvlathey/motion-canvas-skills) | Motion Canvas (TypeScript generator tabanlı vektör animasyon) için skill | MIT (Motion Canvas kendisi MIT) |

### Matematik

| Depo | Ne | Lisans |
|------|----|--------|
| [iart-ai/manim-skills](https://github.com/iart-ai/manim-skills) | Manim CE: MathTex morph, grafik, updater; "önce bir kare render et, sonra tümünü" döngüsü | MIT |
| [AmitSubhash/3brown1blue](https://github.com/AmitSubhash/3brown1blue) | 24 kural dosyası, 18 üretim kuralı (yerleşim, konteyner güvenliği, geçiş), 7 alan (matematik, fizik, biyoloji…), lise/lisans/lisansüstü seviyeye göre anlatım, "yanlış sezgiyi önce göster sonra düzelt" motoru | MIT |
| [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) | Manim CE + ManimGL örnek/kural koleksiyonu | (depoda kontrol edilmeli) |

### Three.js / WebGPU sinematik kalite

| Depo | Ne | Lisans |
|------|----|--------|
| [ektogamat/threejs-conference](https://github.com/ektogamat/threejs-conference) (Anderson Mancini + Sunag) | WebGPU + TSL siberpunk sokak: GTAO, bloom (yarı çözünürlükte, emissive kanaldan), DOF, kromatik sapma, renk düzenlemesi; compute shader ile çatıları tanıyan GPU yağmuru; BVH çarpışma; **AGENTS.md** ile ajanlara okuma sırası ve teknik tarifler | MIT (kod); asset'ler ayrı |
| [gkren22/cinematic-3d-website](https://github.com/gkren22/cinematic-3d-website) | Claude skilli: 9 adımlı yapım sırası; Lenis + Theatre.js/GSAP kamera koreografisi; MeshSurfaceSampler'dan compute GPU parçacıkları (curl noise, morph); bloom, godrays, grain, vignette, bölüm başına color grade | MIT |
| [JonathanBeck1/claude-studio-toolkit](https://github.com/JonathanBeck1/claude-studio-toolkit) | "slop" ret listesi + zorunlu liste; 7 tarif: curl-noise parçacık, fresnel iridescence, MSDF tipografi, postprocessing zinciri, raymarched SDF kahraman nesne, scroll kamera; `/threejs-audit`; varsayılanı "NEEDS WORK" olan salt-okunur inceleme ajanı | MIT |
| [CK42BB/procedural-clouds-threejs](https://github.com/CK42BB/procedural-clouds-threejs), [procedural-landscapes-threejs](https://github.com/CK42BB/procedural-landscapes-threejs) | Beer-Lambert + Henyey-Greenstein hacimsel bulut raymarch, ışık marş ile öz-gölge, günün saati paleti; chunk'lı LOD arazi, WebGPU compute + WebGL2 yedeği | (depoda kontrol edilmeli) |
| [Impertio-Studio/Three.js-Claude-Skill-Package](https://github.com/Impertio-Studio/Three.js-Claude-Skill-Package), [CloudAI-X/threejs-skills](https://github.com/cloudai-x/threejs-skills) | Three.js/R3F/drei/postprocessing/WebGPU için deterministik skill setleri | MIT |
| pmndrs [react-postprocessing](https://github.com/pmndrs/react-postprocessing) + drei | R3F post-processing (bloom, DOF, godrays, SSAO, noise, vignette) | MIT |
| Three.js resmî örnekler: [webgpu_compute_particles_fluid](https://threejs.org/examples/webgpu_compute_particles_fluid.html), TSL `godrays` düğümü | 200 bin parçacıklı compute, godrays | MIT |
| Öğretici kaynaklar: Maxime Heckel "[Real-time cloudscapes with volumetric raymarching](https://blog.maximeheckel.com/posts/real-time-cloudscapes-with-volumetric-raymarching/)", "[Field guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/)"; Wawa Sensei "[fake godrays](https://wawasensei.dev/tuto/how-to-build-godrays)", "[GPGPU particles with TSL](https://wawasensei.dev/courses/react-three-fiber/lessons/tsl-gpgpu)" | Claude'a "bu yazıdaki tekniği uygula" diye verilebilir | Makale |

**Not:** Battle of Austerlitz ve PDoomVideo lisans belirtmediği için kodları doğrudan kopyalanmaz; tekniklerini (Kuwahara, sprite atlası, chapter-IIFE düzeni) kendi yazımımızda kullanmak serbesttir.

---

## 4. İyi sonuç veren brief kalıpları

### 4.1 Viral işlerin promptları şaşırtıcı derecede kısa, ama "iş tanımı" net

- Higgsfield: *"Create a seamless looping animation of the water cycle, entirely in code."*
- ajith_io / Loïc: *"make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel"* — "kendini kanıtla" çerçevesi modelin cesaretini artırıyor gibi.
- Sree: *"build a Bugatti Chiron Super Sport in Three.js. No 3D model. No textures. No assets."* — "asset yok" kısıtı, her şeyi prosedürel kurmaya zorluyor ve tek dosya çıkmasını sağlıyor.
- Edwin Hayward: *"…an entertaining and recognisable scene, detailed, and the full animation should last at least 30s with a number of complex graphical elements."*
- iart.ai bulgusu: *"subject matters more than style"* — platform (dikey/yatay), **kesin süre**, **hedef kitle** ve **ekranda geçmesi gereken tam metin**, moodboard'dan daha iyi sonuç veriyor. Örnek: *"Why is the sky blue? A 20-second explainer in 1950s science textbook style."*

### 4.2 Ayrıntılı, teknik brief (Whitespace ve Vib3Coded tarzı)

"Whitespace" katedral filminin promptu şunları sabitliyor: 1080×1920 @ 30 fps, kare kare render, ışığın vitraydan hesaplanıp yere de düşmesi (tek kaynaktan iki kullanım), renk gidişatı (soluk → mücevher), **insan figürü yok**, metafor tek cümlede ("zenginlik boşlukta yaşar"). Vib3Coded korsan gemisi briefi madde madde: gemi, okyanus, gökyüzü, ışık, malzeme, yelken, arma, top, köpük, wake, parçacık, animasyon, kamera, kompozisyon, atmosferik derinlik, color grading, **ekran yazısı yok**. Ortak nokta: **"ne göreceğim" değil "sahne hangi kurallara uyacak"** anlatılıyor.

### 4.3 Claude'un kendi yazdığı stil rehberi (PDoomVideo `ANIMATION_GUIDE.md`) — en somut kalite çubuğu

Kullanıcının tek satırlık yönü: *"cute, cartoony, fun colors, lively animation, something happening in every shot, be brave and ambitious."* Opus bundan alt ajanlar için şu kuralları türetti (alıntı):
- *"Each chapter is one file in `src/ch/`, wrapped in an IIFE so its helpers stay private"*; shot fonksiyonu `(t, lt, dur)` alır ve *"must paint the entire frame, background included"*.
- *"pure function of `t`: no state that carries between frames, and no `Math.random()`"* — `hash(i)` ile kararlı rastgelelik, `jit(a)` ile el titremesi.
- *"hand-painted watercolour and ink, like a picture book"*; *"Texture comes from fills and occasional hatch, not from noise"*; saf siyah/beyaz yok, `PAL.ink`/`PAL.cream`.
- *"everything moves: cameras drift or push, characters bounce on the beat"*; vuruşlar `0.21 + n × 0.682` s; squash-stretch, anticipation, `backOut`/`elasticOut`.
- *"one clear focal action per shot, with a big silhouette"*; shot 1,4–4 sn, *"the gag must read instantly"*; altyazı bandı y 975–1070, yüzler y 960 üstünde.
- Performans bütçesi: kare başına ≤ 2,5 s, *"hundreds [of fills] are fine, thousands are not"*.
- Kalite döngüsü: *"Iterate until each shot looks good: charming, readable, lively, on-model. Fix whatever looks off: scale, contrast, clutter, stiffness."*

Bizim için ders: **briefi kısa tut, ama Claude'dan önce böyle bir rehber + storyboard yazmasını iste, onayla, sonra üretime geç.**

### 4.4 Yönetmen akışı (klsoen/opus-js-animations)

*"A treatment costs a minute to change; a film costs an hour"* → önce brief'in geri yansıtılması, sesin analizi (tempo, doruk anları), stil/tempo/2D-3D/metin soruları, sahne sahne treatment; *"Nothing is built until you say go."* Sonra: her kare `seek(t)` ile saflık testi, contact sheet, *"every claim about the film gets checked on rendered frames"*, *"muted intelligibility"* (sessiz izlense de anlaşılmalı; metin yalnızca doğrular).

### 4.5 Öz-eleştiri döngüsü (screenshot → critique → fix)

- iart.ai: ilk taslaklar *"director-level review via contact sheets"* ister; tipik hatalar *"childish outlines, text layering problems, static sequences, jarring audio hits"*. Onay sırası: bir kare → 8–12 karelik seyrek contact sheet → tam aralık.
- Aakash Gupta: Puppeteer/Playwright skilliyle Claude kendi çıktısını render edip taşma ölçer, siz görmeden üç tur düzeltir ([medium](https://aakashgupta.medium.com/i-stopped-giving-claude-code-feedback-i-made-it-review-its-own-output-94fb351cc80a)).
- claude-studio-toolkit: inceleme ajanının varsayılan hükmü *"NEEDS WORK"*; dosya:satır referanslı punch list.
- by_opus: 320 sn headless soak test + bağımsız alt ajan kod incelemesi (12 uç durum buldu).

### 4.6 "Slop"a karşı somut yasaklar

Promptessor rehberi: *"Broad instructions such as 'avoid generic AI design' can simply cause Opus 5.5 to swap one default style for another."* Bunun yerine somut liste: *"no cream backgrounds, no gradient headlines, no decorative italics, no pill buttons everywhere."* Görsel işlerde karşılığı: "gökyüzü gradyanı + ortada bir küre + bloom" gibi klişe sahneleri açıkça yasaklamak; referans film/ressam adı vermek ("Kurosawa'nın kar sahnesi gibi kontrast", "Moebius çizgisi").

### 4.7 Opus 5.5 hakkında söylenenler

- Anthropic: oyun yapımı testinde *"scored higher than any other model on the strength of its graphics and polish."*
- Lenny's Newsletter kör testi: haftayı Opus 5.5 kazandı; *"the character SVG results completely overturned my prediction"*; video kurgu kategorisinde tüm modeller zayıf.
- HN "Opus 5.5 is good at explainer videos": *"tasteful"*, süreklilik ve sembolizmi anlıyor; ama *"move too quickly for someone unfamiliar with the subject"*, *"kept repeating the same point"*, *"strung together not in a way that unfolds naturally"* — **anlatı temposu ve pedagoji hâlâ insan işi**.
- Mario Galaxy klonu (53 gün, 76 bin satır): Claude 3D **seviye/nesne yerleşiminde tamamen başarısız**; uzun CLAUDE.md'de kuralları atlıyor (yalnızca sert kurallar kalsın).
- iart.ai: viral filmler karelerin %85–98'inde hareket, saniyede en az bir kesme içeriyor; açıklayıcılar ise %25–40 hareketle daha yavaş — *"motion profiles correlate with content genre, not quality."*

---

## 5. Kategorilere göre stil önerileri ve referanslar

| Kategori | Önerilen stil | Referans | Anahtar kod tekniği |
|----------|---------------|----------|---------------------|
| **Doğa belgeseli** | (a) Stilize prosedürel Three.js: yumuşak toon/half-lambert malzeme + hacimsel sis + ince bloom; (b) makro için SDF raymarch böcek/bitki + DOF | Meng To vadi sahnesi; ektogamat threejs-conference (post zinciri); CK42BB bulut/arazi; Maxime Heckel hacimsel bulut yazısı | Sahne: `MeshToonMaterial` ya da özel ramp shader; `MeshSurfaceSampler` ile bitki örtüsü instancing; fog + godrays (TSL `godrays`); post: bloom (yalnızca emissive), DOF (bokeh), grain, vignette, LUT. Kamera: Theatre.js/GSAP keyframe, "belgesel" için yavaş dolly + rack focus. Kare kare render (`seek(t)`) ile 60 fps'yi zorlamak gerekmez |
| **Yazılım / teknoloji iç yapısı** | Siyah tuval + beyaz çizgi sanat + tek vurgu rengi (anything2explainer), ya da izometrik SVG kutular + paket akışı; "terminal sineması" | Addy Osmani "How browsers work" (el çizimi Canvas); iart "half second after Enter"; anything2explainer RAG filmi | Canvas 2D `draw(ctx,t)` ya da SVG + GSAP: düğüm-kenar grafiği, `stroke-dashoffset` ile paket yolculuğu, izometrik projeksiyon (`x' = (x−y)·cos30, y' = (x+y)·sin30 − z`), yazı makinesi efekti; her sahne bir "shot" fonksiyonu; Remotion/Motion Canvas kullanılacaksa `useCurrentFrame` ile deterministik |
| **Tarih** | Kâğıt harita + mürekkep gravür + parallax kesik kâğıt; ya da Austerlitz gibi ressam post-process'li 3D | Battle of Austerlitz (Kuwahara + tuval dokusu + gerçek arazi); @AIMevzulari 16 sahne (fırça darbesi + kâğıt dokusu); IterIntellectus "Western civilization" (diyagramatik) | Kuwahara / anisotropic Kuwahara post shader; tohumlu fırça darbesi yığınları (p5.brush ya da kendi `strokes(seed)`); kâğıt: değer gürültüsü + vignette + hafif sararma; harita: SVG yolları `getPointAtLength` ile ilerleyen rota, `feTurbulence` ile kenar aşınması; parallax: 3–5 katman `translate(depth·cameraX)` |
| **Fizik** | Temiz vektör + alan çizgileri + parçacık; gerektiğinde gerçek sim | iart "GPS explainer"; theailoser Euler akışkan (GPU); Mia'nın sarkaç dalgası/orrery; Rube Goldberg (özel fizik) | Canvas 2D: vektör alanı çizgileri (RK4 ile streamline), parçacıkları `hash(i)` ile deterministik başlat; ağır simler için WebGL ping-pong texture (fluid, N-body); eğri çizimi `quadraticCurveTo`; ölçek ve birim etiketleri ekranda tam metin olarak briefte verilir |
| **Matematik** | Manim/3b1b; ya da aynı dil Canvas'ta (koyu zemin, mavi/sarı vurgu, MathTex morph) | 3brown1blue skilli (seviyeye göre anlatım, "yanlış sezgiyi önce göster"); iart manim-skills | Manim CE: `Transform`/`TransformMatchingTex`, `ValueTracker` + updater, `Axes`; "önce bir kare render et" döngüsü; Türkçe metin için LaTeX'te `\usepackage[turkish]{babel}` ya da `Text()` |
| **Çocuklar** | Düz vektör, kalın renk, karakter odaklı, squash-stretch, vuruşa bağlı hareket; "resimli kitap" sulu boya | Kevin Ngo "What do you love?"; PDoomVideo (sulu boya + ANIMATION_GUIDE kuralları); iart "Ay yıldızları yatırıyor"; Higgsfield su döngüsü (loop) | Canvas 2D: karakter = birkaç yuvarlatılmış şekil + göz/ağız durum makinesi; `dancer()` benzeri hareket kütüphanesi (bounce, hop, sway); `elasticOut`/`backOut`; büyük siluet, shot başına tek eylem; müzik tempo haritası → kesmeler vuruşta |
| **Kısa film (KOR tarzı)** | Tek karakter, tek dönüşüm, sözsüz; Three.js gece sahnesi + kar + emissive ışık yayılımı | KOR; Whitespace katedral; Voxyz "small print" | Kar: `Points` + curl noise ya da instancing; ışığın yayılması: emissive malzeme + bloom threshold animasyonu, `PointLight` yoğunluk eğrisi; karakter: prosedürel küre + torus (atkı) + sinüs "nefes"; kamera: iki üç sabit plan, yavaş push-in; post: bloom, hafif DOF, mavi-turuncu grade, vignette; 30 fps kare kare render |

Formatlarımızla ilişki: `.claude/skills/narration/formats/*.md` anlatım temposunu belirler; yukarıdaki stiller yalnızca görsel dil önerisidir, her animasyon yine sıfırdan tasarlanır.

---

## 6. Abartı mı gerçek mi

**Gerçek olan**
- Teknik yeniden üretilebilir: `draw(ctx,t)` + headless Chrome + ffmpeg hattı MIT lisanslı skillerde açık; tek HTML Three.js sahneleri gerçekten tek oturumda çıkıyor (by_opus depoları bunu kanıtlıyor).
- Opus 5.5 önceki modellere göre görsel "tat", süreklilik ve sembolizmde belirgin ilerlemiş; SVG karakter ve Three.js ayrıntısı bağımsız testlerde de öne çıkıyor.

**Abartılı ya da gizli olan**
- **"Tek atış" = tek oturum.** PDoomVideo README'si "iki nesil" diyor; Voxyz "saniye saniye tekrar cilaladı"; Shimecki 8 saat / 173 $; Austerlitz 90 dk + 4 saat render / 40 $; Lens Lab 86 dk / 25,66 $. Orcarouter: *"the prompt was one message but the work was not one pass."* Maliyet raporları da tutarsız (Blender kale: 199.600 çıktı tokenı 3,99 $ eder, bildirilen 13,30 $).
- **Seçim yanlılığı:** başarısız denemeler aynı paraya mal olur, paylaşılmaz. Higgsfield, Tripo, Hyper3D gibi vitrinlerin çoğu ticari platform tanıtımıdır; @AIMevzulari'nin sesi Higgsfield'dan (kod dışı).
- **Render hilesi (aslında iyi bir hile):** viral filmlerin hiçbiri gerçek zamanlı değil; kare kare offline render olduğu için tarayıcıda 2 saniyede çizilen kare bile 30 fps'de akıcı görünür. Bizim `render-video.mjs` hattımız zaten bu mantıkta.
- **Gizli el işi:** Mario Galaxy klonunda 87 plan dokümanı, 164 satır CLAUDE.md, özel skilller; nesne yerleşimi elle. Ngo ve Osmani sürecini açıklamıyor.
- **Pedagoji zayıf:** HN yorumları açıklayıcıların hızlı aktığını, tekrara düştüğünü söylüyor. Kanal için değer, bizim anlatım ve tempo kararlarımızda; model bunu vermiyor.
- **Kod kalitesi ve içerik doğruluğu denetlenmiyor:** hiçbir örnek fact-check geçişi bildirmiyor (orcarouter). Öğrencilere gösterilecek içerikte bu bize kalıyor.

**Pratik sonuç:** KOR düzeyinde 40 saniyelik bir kısa için gerçekçi bütçe: brief + treatment 15 dk, ilk üretim 30–60 dk, iki contact-sheet turu 30–60 dk, offline render 10–30 dk; toplam 2–3 saat ve birkaç on dolar token. Bunun altında "tek atış" iddiası cherry-pick'tir.

---

## 7. Kaynaklar

X gönderileri
- https://x.com/FornYapayZeka/status/2102868722998501654 (KOR)
- https://x.com/AIMevzulari/status/2103386522510573967 (16 sahne)
- https://x.com/kevin_t_ngo/status/2102437977435893771
- https://x.com/addyosmani/status/2103009037164110327
- https://x.com/Voxyz_ai/status/2102531681450119426
- https://x.com/kimmonismus/status/2102844654169575547
- https://x.com/IterIntellectus/status/2103212539895017864
- https://x.com/i/status/2103145567945986461 (Whitespace)
- https://x.com/i/status/2103116235009347650 (Austerlitz)
- https://x.com/MengTo/status/2102760783344189761
- https://x.com/Vib3Coded/status/2102533729746882985
- https://x.com/i/status/2102788223835463902 (Shimecki)
- https://x.com/Michaelzsguo/status/2102592355165782312
- https://x.com/LCSlates/status/2102503027340988559
- https://x.com/majidmanzarpour/status/2102476258948927543
- https://x.com/i/status/2102781807179735211 (Higgsfield su döngüsü)
- https://x.com/rege_dev/status/2103022926752854201
- https://x.com/i/status/2103504887439065439 · https://x.com/i/status/2103428454355980558 (showreel kalıbı)
- https://x.com/i/status/2102565611473661963 · https://x.com/i/status/2102828216289566725
- https://x.com/edwinhayward/status/2102569255657259036
- https://x.com/Hesamation/status/2102472597170528449
- https://x.com/EricBuess/status/2103226548413182366 (derleme)

Depolar ve skiller
- https://github.com/iart-ai/javascript-animation-skills · https://github.com/iart-ai/manim-skills
- https://github.com/klsoen/opus-js-animations
- https://github.com/JohnHeibel/PDoomVideo (ANIMATION_GUIDE.md, STORYBOARD.md)
- https://github.com/WinterArc21/Battle-of-Austerlitz-Film
- https://github.com/chandan0000001/by_opus · https://github.com/riba2534/claude-opus-5-5-demo
- https://github.com/heygen-com/hyperframes
- https://github.com/Vincentwei1021/anything2explainer
- https://github.com/haidrrrry/claude-remotion-skill · https://github.com/apoorvlathey/motion-canvas-skills
- https://github.com/AmitSubhash/3brown1blue · https://github.com/adithya-s-k/manim_skill
- https://github.com/ektogamat/threejs-conference
- https://github.com/gkren22/cinematic-3d-website
- https://github.com/JonathanBeck1/claude-studio-toolkit
- https://github.com/CK42BB/procedural-clouds-threejs · https://github.com/CK42BB/procedural-landscapes-threejs
- https://github.com/Impertio-Studio/Three.js-Claude-Skill-Package · https://github.com/cloudai-x/threejs-skills
- https://github.com/pmndrs/react-postprocessing
- https://github.com/TripoGrowthLab/awesome-opus-5-5-prompts · https://github.com/magiccreator-ai/awesome-claude-opus-5-5-demos
- https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/
- https://github.com/MAX-786/claude-3d-harness (Blender; kare onay döngüsü fikri)

Yazılar ve tartışmalar
- https://www.iart.ai/blog/ai-javascript-animation · https://www.iart.ai/blog/canvas-animation-examples
- https://www.orcarouter.ai/blog/claude-opus-5-5-demo-cost · https://www.orcarouter.ai/blog/claude-opus-5-5-video-plan-one-shot · https://www.orcarouter.ai/blog/claude-opus-5-5-code-rendered-ai-history-film
- https://newfacedesign.com/blog/claude-opus-5-5-art-animation-from-code
- https://favtutor.com/claude-opus-5-5-real-examples/
- https://promptessor.com/blog/claude-opus-5-5-prompting-guide
- https://www.lennysnewsletter.com/p/opus-55-vs-gpt-6-sol-which-model
- https://www.mindstudio.ai/blog/opus-5-5-vs-gpt-6-sol
- https://news.ycombinator.com/item?id=49836374 (Opus 5.5 explainer videoları) · https://news.ycombinator.com/item?id=47600002 (Mario Galaxy, 53 gün)
- https://aakashgupta.medium.com/i-stopped-giving-claude-code-feedback-i-made-it-review-its-own-output-94fb351cc80a
- https://www.anthropic.com/news/claude-opus-5-5
- https://blog.maximeheckel.com/posts/real-time-cloudscapes-with-volumetric-raymarching/ · https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/
- https://wawasensei.dev/tuto/how-to-build-godrays · https://wawasensei.dev/courses/react-three-fiber/lessons/tsl-gpgpu
