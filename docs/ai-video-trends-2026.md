# Yapay zekâ ile video üretimi: 2025–2026'da insanlar gerçekte ne kullanıyor?

*Araştırma tarihi: 26 Eylül 2026. Bu belge, X/Twitter, YouTube, Reddit, Hacker News ve bloglarda "yapay zekâ ile yapıldı" diye paylaşılan belgesel, açıklayıcı ve eğitim videolarının arkasındaki araçları, bunların ücretsiz/yerel/ücretli durumunu ve bizim (4 GB VRAM'li dizüstü, ücretli API yok, Claude Code) için gerçekçi bir yol haritasını toplar. Kanıtın zayıf olduğu yerler açıkça belirtilmiştir.*

---

> **Karar (26 Eylül 2026):** Kullanıcı üretken görsel/video/ses modellerini (ücretsiz katmanlar dahil) kullanmamaya karar verdi; bu rapordaki 2b/2c, 4 (bulut ve ücretli) ve 7c bölümleri **uygulanmayacak**, yalnızca sektörü anlamak için duruyor. Geçerli yol: kodla üretim (`docs/cartoon-style-in-code.md`, `.claude/skills/animation/documentary-tech.md`).

## 1. Özet

1. X'te dolaşan "çok kaliteli yapay zekâ belgeseli" gönderilerinin büyük çoğunluğu **kodla yapılmıyor**; senaryo LLM'den, kareler bir görüntü modelinden (Midjourney, Nano Banana Pro, Flux), hareket bir **üretken video modelinden** (Veo 3.1, Kling 2.5/3.0, Seedance 2.0, Sora 2), ses ElevenLabs'tan, kurgu CapCut/Premiere/DaVinci'den geliyor.
2. Bu iş akışının "kalite" kaynağı model değil, **görüntüden videoya (image‑to‑video) disiplini**: önce tutarlı bir görsel dünya kuruluyor, her plan 5–8 saniyelik klipler hâlinde üretiliyor, sonra sinema diliyle kurgulanıyor.
3. Kodla üretilen tarafta 2026'nın iki büyük dalgası **Remotion Agent Skills** (Ocak 2026, Claude Code ile; X'te milyonlarca görüntülenme, 8 haftada 150 bin kurulum) ve **Claude + Manim** (3Blue1Brown tarzı; onlarca skill/MCP sunucusu) oldu. Yeni gelen üçüncüsü HeyGen'in **HyperFrames**'i (HTML+GSAP → MP4, Apache‑2.0).
4. **Blender** tarafı resmîleşti: Anthropic 28 Nisan 2026'da "Claude for Creative Work" ile Blender'ın kendi geliştirdiği MCP bağlayıcısını duyurdu; ama topluluk deneyimi net: Claude ile Blender **sahne kurma, ışık, malzeme, betikleme** için iyi, **organik model/karakter üretmek** için kötü.
5. Bizim mevcut yaklaşımımız (tarayıcıda prosedürel 3B, Babylon/Three) X'te neredeyse hiç görünmüyor; görünenler ya Remotion/Manim gibi 2B hareketli grafik ya da üretken video. Karınca belgeseli gibi fotogerçekçi doğa sahneleri için tarayıcı motoru yapısal olarak dezavantajlı (yol izleme yok, kürk/alt yüzey saçılımı zayıf, GI yok).
6. 4 GB VRAM ile **yerel üretken video pratikte yok**: Wan 2.1/2.2 1.3B GGUF ile 4–6 GB'da 480p/kısa klipler "çalışıyor" ama yavaş ve düşük kalite; LTX‑2 en az 12 GB, önerilen 24 GB+. Yerel görüntü modelleri de (Flux.2 Klein 4B GGUF, Z‑Image Turbo) 4 GB'da sınırda.
7. Ücretsiz katmanlarda gerçekten kullanılabilir olanlar: **Google AI Studio (Veo 3/3.1, 720p, filigransız, hız sınırlı)** ve **Google Flow (günde 50 kredi, SynthID)**; Kling/Hailuo/PixVerse günlük kredi veriyor ama filigranlı ve ticari kullanım kapalı. Grok Imagine'in ücretsiz katmanı Mart 2026'da kalktı; Sora ücretsiz katmanı Ocak 2026'da kapandı.
8. "Kaliteli" görünüm tarif edilebilir: belgesel kamera dili (makro, sığ alan derinliği, yavaş dolly), tek bir renk düzeltme LUT'u, gerçek ses tasarımı (ortam sesi + foley + müzik), 8–12 saniyede plan değiştiren tempo, kelime kelime altyazı, tutarlı ana karakter, 16:9 uzun + 9:16 kısa versiyon, bakımlı kapak.
9. Türkçe YouTube'da yapay zekâ görselli "belgesel/hikâye" kanalları var (webtekno'nun haber yaptığı yapay zekâ "true crime" kanalı, ekşi sözlük'te anılan "Yitik Efsaneler" gibi) ama bunlar bilimsel eğitim değil, hacim üretimi; kanıt zayıf ve örnek alınacak kalitede bir Türkçe bilim kanalı **bulunamadı**. Bu bir boşluk.
10. Bize öneri: **anlatım/kurgu/altyazı hattımızı koru**, doğa belgeselinde fotogerçekçilik için **Blender (Cycles, 4 GB'a göre optimize) + Claude'un yazdığı Python betikleri**ne geç, açıklayıcılar için **Remotion (Agent Skills) + Manim**'i ekle, Babylon/Three'yi **etkileşimli web sayfası** için tut, üretken videoyu yalnızca kullanıcı onayıyla ve **yalnızca Google AI Studio'nun filigransız katmanıyla, "yapay zekâ ile üretildi" etiketiyle, B‑roll** olarak kullan.

---

## 2. İnsanlar gerçekte ne kullanıyor?

### 2a. Kodla üretilen animasyon (Claude/LLM + kod)

| Araç | Ne için | 2026'daki yeri | Kaynak |
|---|---|---|---|
| **Remotion** (React → MP4) | Hareketli grafik, açıklayıcı, altyazı, alt bant, kinetik tipografi, harita animasyonu | Ocak 2026'da resmî **Agent Skills** (`npx skills add remotion-dev/skills`); Remotion'ın X gönderisi günlerde 6 milyon+ görüntülenme; 8 haftada 150 bin kurulum; kullanıcı tabanının dörtte üçü kod yazmayanlar oldu | [remotion.dev/docs/ai/skills](https://www.remotion.dev/docs/ai/skills), [X: @Remotion](https://x.com/Remotion/status/2013626968386765291), [ngram.com](https://www.ngram.com/blog/remotion-skills-sh-ai-video-creation), [startuphub.ai](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/remotion-ai-video-makes-production-code-from-plain-prompts) |
| **Manim** (Python) | Matematik, algoritma, makale açıklayıcıları (3Blue1Brown tarzı) | "Claude + Manim" ayrı bir tür oldu: `manim-claude` (PyPI, Mart 2026), `3brown1blue` (27 kural dosyası), `manim-skill`, Manim MCP sunucusu, Animo masaüstü uygulaması; 3b1b'nin kendi `videos` deposunda `CLAUDE.md` var | [pypi manim-claude](https://pypi.org/project/manim-claude/), [AmitSubhash/3brown1blue](https://github.com/AmitSubhash/3brown1blue), [Yusuke710/manim-skill](https://github.com/Yusuke710/manim-skill), [3b1b/videos CLAUDE.md](https://github.com/3b1b/videos/blob/master/CLAUDE.md), [Manim MCP (Medium)](https://medium.com/@omchoksi108/i-built-a-public-manim-mcp-server-now-claude-can-produce-real-3blue1brown-videos-on-demand-050995551c4e) |
| **HyperFrames** (HeyGen, HTML+GSAP → MP4) | Ajanlar için tasarlanmış "video = HTML" çerçevesi; CSS, GSAP, Lottie, Three.js sahneleri | Apache‑2.0, Claude Code/Cursor/Gemini CLI skill'leri hazır geliyor; Remotion'a rakip olarak 2026 ortasında yükseldi | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes), [themenonlab](https://themenonlab.blog/blog/hyperframes-claude-code-writes-renders-videos) |
| **Motion Canvas** (TS, Canvas 2D) | Teknik açıklayıcı, kod animasyonu | Kullanılıyor ama resmî skill ekosistemi yok; toplulukta "Claude ile daha çok elle yönlendirme gerekir" görüşü | [trybuildpilot karşılaştırma](https://trybuildpilot.com/363-remotion-vs-motion-canvas-vs-revideo-2026), [voyageragent](https://voyageragent.ai/blog/remotion-alternatives) |
| **Blender** (Python/MCP) | 3B sahne, ışık, malzeme, prosedürel arazi/kaya/ağaç, render | Anthropic'in resmî bağlayıcısı (Nisan 2026); toplulukta "prototip aracı, organik model ve rig için değil" | [anthropic.com/news/claude-for-creative-work](https://www.anthropic.com/news/claude-for-creative-work), [MindStudio değerlendirmesi](https://www.mindstudio.ai/blog/claude-blender-mcp-real-world-performance), [9to5mac](https://9to5mac.com/2026/04/28/anthropic-releases-9-new-claude-connectors-for-creative-tools-including-blender-and-adobe/) |
| Three.js / p5.js / Canvas | Web'de etkileşimli sahne | Var ama X'te "video" olarak nadiren paylaşılıyor; daha çok web deneyimi | [mindstudio: 3D websites](https://www.mindstudio.ai/blog/animated-3d-websites-claude-code-ai-video-generation) |
| GSAP / Lottie / Rive / Theatre.js | UI ve web hareketi | Ajan skill'leri var (MotionLoom, web-animation-skills) ama video üretimi için ana akım değil | [MotionLoom](https://github.com/lenhonbp/MotionLoom), [iart-ai/web-animation-skills](https://github.com/iart-ai/web-animation-skills) |
| Godot / Unreal MCP | Oyun sahneleri | Var ama eğitim videosu üretiminde kayda değer örnek bulunamadı | — |

**Bütünleşik "makaleden videoya" hatları** (bizim hattımıza en yakın olanlar):

- `AbigaleD/paper-explainer-video`: makale PDF → 5–8 sahne → Manim 1080p60 + edge‑tts ses + sentez BGM + Live2D sunucu; makale başına 22–28 dk. — [github](https://github.com/AbigaleD/paper-explainer-video)
- `prabaljainn/ig-explainer`: konu → 9:16 açıklayıcı; satır satır yerel TTS, anlatıma zamanlanmış Remotion ya da Manim sahneleri, 8/10 puana kadar döngü yapan bağımsız eleştirmen ajan — [github](https://github.com/prabaljainn/ig-explainer)
- `calesthio/OpenMontage`: 12 üretim hattı, 700+ skill dosyasıyla "ajanı stüdyoya çevir" projesi — [github](https://github.com/calesthio/OpenMontage)
- `haidrrrry/claude-remotion-skill`: B‑roll, altyazı, ses tasarımı, film greni, Ken Burns, kelime eşzamanlı altyazı; "render et → kareleri incele → düzelt → yeniden render" döngüsü — [github](https://github.com/haidrrrry/claude-remotion-skill)

### 2b. Üretken video/görüntü modelleri ("yapay zekâ belgeseli" hattı)

Dürüst tespit: X'te "AI documentary", "AI nature film" diye viral olan içeriklerin ezici çoğunluğu bu hattır, kod değil. Tipik zincir:

1. **Senaryo + plan listesi**: ChatGPT/Claude (plan başına prompt, kamera, ışık, ruh hâli).
2. **Kareler**: Midjourney v7, **Nano Banana Pro / Nano Banana 2** (Gemini görüntü; karakter tutarlılığı için referans görsel), Flux. Storyboard "aynı prompt + aynı karakter referansı" ile kuruluyor. — [pctechmag: Nano Banana 2 + Veo 3.1](https://pctechmag.com/2026/04/nano-banana-2-veo-3-1-the-ultimate-ai-drama-workflow/), [n8n şablonu](https://n8n.io/workflows/11594-creating-consistent-character-videos-with-veo-31-gpt-4o-and-google-nanobanana/), [apiyi storyboard rehberi](https://help.apiyi.com/en/nano-banana-pro-ai-video-storyboard-character-consistency-guide-en.html)
3. **Hareket**: görüntüden videoya (image‑to‑video) **Veo 3.1** (8 sn, 1080p, sesli), **Kling 2.5/3.0** (ucuz, 15 sn'ye kadar), **Seedance 2.0** (Şubat 2026), **Sora 2**, Runway Gen‑4.5, Hailuo/MiniMax, Luma. Açık ağırlıklı: **Wan 2.2/2.6**, **LTX‑2.3/2.5**, HunyuanVideo. — [modelslab fiyat kıyası](https://modelslab.com/blog/api/veo-3-1-vs-kling-3-sora-2-ai-video-api-cost-2026), [Wikipedia: Veo](https://en.wikipedia.org/wiki/Veo_(text-to-video_model))
4. **Ses**: ElevenLabs v3 (anlatım), Suno v5.5 / Udio (müzik), Epidemic/Artlist (kütüphane).
5. **Kurgu**: CapCut, Premiere, DaVinci Resolve; renk düzeltme, film greni, altyazı burada.
6. **Ölçekleme**: Topaz Video (4K).

Örnekler ve tartışmalar:

- "MIND TUNNELS" kısa filmi: Kling 2.1 + Veo 3 + Midjourney + ElevenLabs v3 + HeyGen; künyede araçlar tek tek yazılı. — [YouTube](https://www.youtube.com/watch?v=NB2xq-mzAkI)
- "My AI Filmmaking Workflow: Kling, Veo & Nano Banana" — [YouTube](https://www.youtube.com/watch?v=31GR1pXlB1g)
- "I Recreated a Viral Animated Documentary with Kling AI" — [YouTube](https://www.youtube.com/watch?v=wYaCJjqh8Mk)
- **Doğa belgeseli tarafında asıl viral olan "hayvan sırtında mini kamera" (karınca, akrep, kirpi yuvaya giriyor) Shorts'ları**: Şubat 2026'da açılan bir kanal 53 videoyla 14,5 milyon görüntülenme; anlatım yok, 9:16, "ham belgesel görünümü, sinema efekti yok". Bu içerikler doğrulama kuruluşları ve Maryland DNR gibi kurumlarca "yanıltıcı" diye eleştiriliyor. — [vuela.ai analizi](https://vuela.ai/blog/ai-animal-video-14-million-views-ai-generated), [Maryland DNR rehberi](https://news.maryland.gov/dnr/2026/04/27/is-that-real-a-guide-to-identifying-fake-wildlife-videos-created-with-generative-ai/), [Outside Online](https://www.outsideonline.com/outdoor-adventure/environment/ai-wildlife-video/), [A‑Z Animals](https://a-z-animals.com/articles/how-ai-generated-animal-videos-mislead-millions-about-nature/)
- YouTube'un Ocak 2026 "AI slop" temizliği: 16 kanal, 4,7 milyar görüntülenme, ~10 milyon $/yıl; International Documentary Association'ın "yapay zekâ belgeselinde 9 kırmızı bayrak" yazısı. — [HackerNoon](https://hackernoon.com/youtubes-ai-slop-crackdown-cant-tell-a-directed-ai-film-from-a-bot-farm), [documentary.org](https://www.documentary.org/column/synthesis-9-red-flags-look-ai-documentaries-2026)

**Bizim için önemli sonuç:** Öğrencilere gösterilen bir bilim belgeselinde üretken video modeliyle "gerçekmiş gibi" hayvan davranışı üretmek bilimsel doğruluk riski taşır (model biyolojiyi bilmez; bacak sayısı, anten hareketi, yuva yapısı uydurulur). Bu hat, bizim kısıtlarımızla (ücretli API yok, doğruluk şart) uyuşmuyor; olsa olsa atmosfer B‑roll'u için.

### 2c. Hibrit

En olgun üretimler ikisini birleştiriyor: LLM senaryo + storyboard + promptları yazıyor; ajan Remotion/Manim/Blender'ı sürüyor (metin, diyagram, kesin sayı ve zamanlama); üretken video yalnızca "atmosfer" planlarında. Örnekler: `haidrrrry/claude-remotion-skill` (B‑roll + altyazı + ses tasarımı), OpenMontage, ElevenLabs Flows (tek tuvalde hat kurma). Sektör rehberleri de "tek sekmede film olmaz; NLE'de kurgu şart" diyor. — [interestingengineering](https://interestingengineering.com/ai-robotics/ai-tools-filmmaking-movies), [ElevenLabs Flows](https://elevenlabsmagazine.com/elevenlabs-flows-guide-2026/)

---

## 3. Claude Code ile öne çıkan iş akışları

1. **Remotion Agent Skills** — `npx skills add remotion-dev/skills`; kompozisyon, tipografi, ses, yazı tipi, altyazı, harita (Mapbox/MapLibre/Cesium), 3B, Mediabunny, render. Resmî belge: [remotion.dev/docs/ai/skills](https://www.remotion.dev/docs/ai/skills), [coding-agents rehberi](https://www.remotion.dev/docs/ai/coding-agents). Jonny Burger'ın başlangıç kılavuzu: [X](https://x.com/JNYBGR/status/2015708193167479209). Not: Remotion'ın lisansı şirketler için ücretli olabilir (bireysel/küçük ekip ücretsiz); kullanmadan önce lisans sayfasına bakılmalı.
2. **Claude + Manim** — 3b1b deposundaki `CLAUDE.md` Grant Sanderson'ın kendi deposunda Claude Code'a kurallar veriyor (VGroup, `.arrange()`, `Tex()`); toplulukta `manim-claude`, `3brown1blue`, `manim-skill` (Planla → Kodla → Render → Yinele). Logan Yang'ın "Claude Code ile 3b1b tarzı kısa manim videosu" meydan okuması X'te dolaştı: [X](https://x.com/logancyang/status/2022153014124195913).
3. **Blender bağlayıcısı (resmî)** — Anthropic, 28 Nisan 2026: Blender ekibinin yazdığı MCP sunucusu; sahne analizi, betikleme, toplu değişiklik, prosedürel animasyon. Anthropic Blender Development Fund'a bağış yaptı. [anthropic.com](https://www.anthropic.com/news/claude-for-creative-work). Topluluk: `minihellboy/claude-blender` [github](https://github.com/minihellboy/claude-blender), `blender-mcp` [site](https://blender-mcp.com/). Değerlendirme: "MCP hızlı yineleme için; tek seferlik iş için elle yazılmış Python daha güvenilir; Geometry Nodes kırılgan; sculpt yok." [MindStudio](https://www.mindstudio.ai/blog/claude-blender-mcp-real-world-performance)
4. **HyperFrames** — HeyGen'in Apache‑2.0 çerçevesi; Claude Code eklentisi hazır. [github](https://github.com/heygen-com/hyperframes)
5. **Makaleden videoya ve eleştirmen döngüsü** — `paper-explainer-video`, `ig-explainer` (bağımsız eleştirmen ajanla 8/10'a kadar yineleme). Bu "render → kare kontrolü → düzelt" döngüsü bizim 7. adımımızla (headless Chrome ekran görüntüsü) aynı fikir; sistemleştirilebilir.
6. Anthropic'in kendi "video yapan Claude Code" demosu **bulunamadı**; resmî iletişim Blender/Adobe bağlayıcıları ve "Claude Code Live" webinarları üzerinden. [Partner Series](https://www.anthropic.com/webinars/claude-code-live)

---

## 4. Ücretsiz / yerel / ücretli tablo

Fiyatlar Eylül 2026 itibarıyla kaynaklardan; değişkenlik yüksek.

### Yerel / açık ağırlıklı

| Araç | VRAM | Lisans | Filigran | 4 GB RTX 3050 Ti'da durum |
|---|---|---|---|---|
| **Blender 4.x** (EEVEE Next / Cycles) | EEVEE Next tipik 3,7–4 GB; Cycles sahneye bağlı, taşarsa CPU'ya düşer | GPL, çıktı serbest | Yok | **Çalışır.** Küçük sahne, 1080p, 512 tile, düşük örnek + OIDN denoise; kürk/partikül azaltılmalı. [devtalk EEVEE Next](https://devtalk.blender.org/t/blender-4-2-eevee-next-feedback/31813?page=45), [iRender düşük donanım ipuçları](https://irendering.net/blender-cycles-optimization-tips-for-low-end-pc-2025/), [renderjuice RTX 3050](https://www.renderjuice.com/gpus/rtx-3050-for-blender) |
| **Remotion** | GPU gerekmez (Chrome) | Bireysel/≤3 kişi ücretsiz, şirket lisansı ücretli | Yok | Çalışır |
| **Manim CE** | GPU gerekmez | MIT | Yok | Çalışır |
| **HyperFrames** | GPU gerekmez | Apache‑2.0 | Yok | Çalışır |
| **Motion Canvas** | GPU gerekmez | MIT | Yok | Çalışır |
| **Wan 2.1/2.2 1.3B** (GGUF) | 4–6 GB | Apache‑2.0 | Yok | **Sınırda.** Civitai'de "RTX 3050 Laptop 4 GB" iş akışı var; 480p, birkaç saniye, dakikalar sürer, kalite düşük. [willitrunai](https://willitrunai.com/blog/wan-2-2-vram-requirements), [Civitai 4 GB akışı](https://civitai.com/models/1309674/wan21gguf-only-4gb-vram-comfyui-workflow) |
| Wan 2.2 5B / 14B | 8–12 GB / 6–24 GB (FP8+offload) | Apache‑2.0 | Yok | **Çalışmaz** (RAM offload ile belki, saatler) |
| **Wan2GP** ("GPU‑poor" arayüzü) | "en az 6 GB" | Ücretsiz | Yok | 4 GB resmen desteklenmiyor. [github](https://github.com/deepbeepmeep/Wan2GP) |
| **LTX‑Video 2B** (0.9.x) | FP16 12 GB, FP8 ~12 GB min | ltx‑video‑research (araştırma) | Yok | **Çalışmaz.** [willitrunai LTX](https://willitrunai.com/video-models/ltx-video-2-3) |
| **LTX‑2 / 2.3 / 2.5** | resmî 24–32 GB, distil FP8 12–16 GB | Apache‑2.0 (ağırlıklar) | Yok | **Çalışmaz.** [thundercompute](https://www.thundercompute.com/blog/ltx-2-3-comfyui), [NVIDIA](https://www.nvidia.com/en-sg/geforce/news/rtx-ai-video-generation-guide/) |
| HunyuanVideo / CogVideoX 2B | 12 GB+ / ~8–11 GB | Apache‑2.0 | Yok | Çalışmaz / sınırda |
| **Flux.2 Klein 4B** (GGUF) | 12 GB önerilen; GGUF ~6–7 GB | Apache‑2.0 | Yok | Sınırda (Q3–Q4 GGUF + offload). [comfy blog](https://blog.comfy.org/p/flux2-klein-4b-fast-local-image-editing), [unsloth GGUF](https://huggingface.co/unsloth/FLUX.2-klein-4B-GGUF) |
| Z‑Image Turbo 6B | 16 GB tasarım hedefi | açık | Yok | Çalışmaz |
| Hunyuan3D 2.1 (görüntüden 3B model) | 10 GB+ | Tencent topluluk lisansı (AB/İngiltere/Kore hariç) | Yok | Çalışmaz; ayrıca lisans coğrafi kısıtlı. [github](https://github.com/tencent-hunyuan/hunyuan3d-2.1) |

### Bulut ücretsiz katmanları (Nisan–Eylül 2026 kaynakları)

| Servis | Ücretsiz ne veriyor | Filigran | Ticari/YouTube | Kaynak |
|---|---|---|---|---|
| **Google AI Studio (Veo 3 / 3.1)** | Hız sınırlı, tükenmeyen; 720p | **Yok** (SynthID görünmez) | ToS'a bak; kaynaklar "izin verici" diyor | [aivideobootcamp](https://aivideobootcamp.com/blog/free-ai-video-tools-2026/) |
| **Google Flow** | Günde 50 kredi (bölgeye bağlı) | SynthID | Belirsiz | [diyai](https://diyai.io/ai-tools/video-generation/google-veo-pricing/) |
| Gemini API (Veo 3.1) | **Ücretsiz katman yok**; ~0,10 $/sn (720p), 0,03 $/sn Lite | Yok | Evet | [ai.google.dev pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Kling | ~66 kredi/gün (~6 video), 720p | Var | Hayır | [aivideobootcamp](https://aivideobootcamp.com/blog/free-ai-video-tools-2026/) |
| Hailuo | ~3 video/gün, 6 sn | Var | Hayır | aynı |
| PixVerse | ~60 kredi/gün | Değişken | Sınırlı | aynı |
| Runway | 125 kredi, tek seferlik (~25 sn toplam) | Var | Hayır | aynı |
| Luma / Pika | Tek seferlik, taslak kalite | Var | Hayır | aynı |
| **Sora** | Ücretsiz katman **10 Ocak 2026'da kapandı**; Plus 1000 kredi/ay, 720p; C2PA filigranı yalnız Pro'da (200 $/ay) kalkıyor | Var | Plus'ta sınırlı | [eesel](https://www.eesel.ai/blog/sora-2-pricing), [cliprise](https://www.cliprise.app/learn/guides/getting-started/how-to-use-sora-2-for-free-2026) |
| **Grok Imagine** | Ücretsiz katman **19 Mart 2026'da kaldırıldı**; SuperGrok ~30 $/ay | Var (kaldırmak yasak) | Ücretli planda evet | [grokautomate](https://grokautomate.com/blog/how-to-use-grok-imagine-for-free), [therundown](https://www.therundown.ai/tools/grok-imagine) |
| Meshy (3B model) | Ücretsiz çıktılar CC BY 4.0 (atıf zorunlu) | — | Atıfla | [rapiddirect](https://www.rapiddirect.com/blog/best-8-ai-3d-model-generators/) |

### Ücretli (yaklaşık)

| Servis | Fiyat | Kaynak |
|---|---|---|
| Veo 3.1 API | 0,10–0,40 $/sn (Fast 0,15 $/sn; 1080p 0,40 $/sn) | [modelslab](https://modelslab.com/blog/api/veo-3-1-vs-kling-3-sora-2-ai-video-api-cost-2026), [buildmvpfast](https://www.buildmvpfast.com/api-costs/ai-video) |
| Kling 3.0 API | ~0,09–0,14 $/sn | aynı |
| Sora 2 / 2 Pro | 0,30–0,75 $/sn | aynı |
| Runway Gen‑4.5 | kredi sistemi, ~1,50 $/klip | aynı |
| ElevenLabs | Starter 5 $/ay'dan; ticari lisans için Creator 22 $/ay | (genel bilgi; doğrulama: elevenlabs.io/pricing) |
| Suno | Pro 10 $/ay (ticari hak), Premier 30 $/ay | [eesel Suno](https://www.eesel.ai/blog/suno-review), [dynamoi](https://dynamoi.com/learn/ai-music-distribution/suno-commercial-rights-explained) |
| Udio | Standard 10 $/ay, Pro 30 $/ay | [tldl](https://www.tldl.io/blog/suno-vs-udio-comparison) |
| Epidemic Sound | Creator 9,99 $/ay, Pro 16,99 $/ay | [epidemicsound pricing](https://www.epidemicsound.com/pricing/) |
| Topaz Video | ~39 $/ay (yıllık), Studio 399 $/yıl; güçlü GPU ister | [topazlabs pricing](https://www.topazlabs.com/pricing), [videoproc](https://www.videoproc.com/resource/topaz-video-ai-review.htm) |
| Midjourney | 10 $/ay'dan | (genel bilgi) |

**Ücretsiz müzik/ses alternatifleri (bizim kısıtlara uygun):** Free Music Archive / CC0 kütüphaneleri, Pixabay Music, YouTube Audio Library, freesound.org (CC0 filtresi); yerel açık müzik modelleri (ACE‑Step, Stable Audio Open) 4 GB'da sınırda ama kısa ortam sesleri için denenebilir.

---

## 5. "Kaliteli" görünümün tarif edilebilir bileşenleri

Viral parçaları izleyince "kalite" hissi araçtan çok şu kararlardan geliyor:

1. **Sinema referansı ve kamera dili.** Belgesellerde (Planet Earth / Microcosmos) makro objektif, sığ alan derinliği, yavaş dolly/parallax, ışığa karşı (backlit) çekimler, "kamera hayvanın yanında" hissi. Üretken video prompt'ları da bu kelimelerle yazılıyor ("macro lens, shallow DoF, golden hour, slow dolly-in"). Bizim Babylon sahnesinde DoF ve HDRI var; eksik olan **hacimsel ışık (god rays), alt yüzey saçılımı (SSS), kürk/tüy ve atmosferik pus.**
2. **Tek bir renk düzeltmesi.** Bütün planlara aynı LUT (hafif teal‑orange ya da doğal sıcak), hafif vinyet, ince film greni, 2.39:1 bantları (isteğe bağlı). Remotion skill'i bile "color grade + film grain" içeriyor. ffmpeg ile `lut3d` filtresi ücretsiz.
3. **Ses tasarımı ≥ görüntü.** Ortam sesi (rüzgâr, böcek vızıltısı, yaprak), foley (adım, tıkırtı), ses perspektifi (yakın plan daha "kuru"), müzik altta ve duygusal noktalarda yükselen. Anlatım ses seviyesi −16 LUFS civarı, müzik −25/−30 LUFS. Sessiz doğa planlarında anlatımı susturmak ("let it breathe").
4. **Tempo.** 16:9 uzun videoda plan uzunluğu 4–8 sn, açıklayıcıda 2–5 sn; her 20–40 sn'de bir "pattern interrupt" (yeni açı, yakın plan, metin kartı). İlk 10 saniyede kanca. Bu bizim `retention.md` ile örtüşüyor.
5. **Format.** 16:9 ana video + aynı sahnelerden 9:16 kesitler (Shorts); Shorts'ta metin büyük, altyazı ortada‑altta, ilk 2 saniyede görsel hareket. Viral doğa Shorts'ları 9:16 ve anlatımsız.
6. **Altyazı.** Kelime kelime açılan (karaoke) altyazı, 2 satır, kutu yok. Bizde var.
7. **Tutarlı karakter / dünya.** Aynı karınca, aynı bahçe, aynı ışık; üretken video hattında bunu Nano Banana referans görselleri sağlıyor; bizde prosedürel model doğal olarak tutarlı — bu bir avantaj.
8. **Kapak ve başlık.** Tek yüz/nesne, 3–5 kelime, yüksek kontrast; kanal kimliği tutarlı. Bizde thumbnail‑kit var.
9. **Çözünürlük ve keskinlik.** 1080p yeterli; 4K, Topaz ile ölçekleniyor ama ücretli. Ücretsiz alternatif: Blender'dan doğrudan 4K render (yavaş) ya da Real‑ESRGAN (ücretsiz, 4 GB'da çalışır, video için kare kare).
10. **"Gerçek" hissini veren küçük kusurlar.** Hafif kamera titremesi, odak arayışı (rack focus), lens kiri/bokeh, hareket bulanıklığı. Bunlar Babylon'da post‑process olarak da eklenebilir; Blender'da doğal.

Kaynaklar: [fluxnote doğa kanalı rehberi](https://fluxnote.io/blog/how-to-start-a-nature-documentary-youtube-channel-with-ai-in-2026), [vuela.ai analiz](https://vuela.ai/blog/ai-animal-video-14-million-views-ai-generated), [haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill), [techsy iş akışı](https://techsy.io/en/blog/how-to-use-ai-in-video-production).

---

## 6. Türkçe kanallar

Kanıt zayıf; bulunanlar:

- **Yapay zekâ "true crime" kanalı** (webtekno haberi): tamamen kurgu suç hikâyeleri, ChatGPT senaryo, "yapay zekâ parodisi" etiketi izlenmeyi düşürdüğü için kaldırılmış. Bilimsel içerik değil. — [webtekno](https://www.webtekno.com/yapay-zeka-hikayeleri-youtube-kanali-h155753.html)
- **"Yitik Efsaneler"** ve benzeri kanallar ekşi sözlük'te ChatGPT + CapCut ile üretilen içerik kanallarına örnek olarak anılıyor; araç ayrıntısı yok. — [ekşi sözlük başlığı](https://eksisozluk.com/yapay-zeka-ile-youtube-kanali-acmak--7939364)
- **Startupsole "YouTube Otomasyonu 2026"** rehberi Türkçe hat olarak ElevenLabs (Türkçe ses), Midjourney (kapak), InVideo/Pictory (video), n8n (otomasyon), CapCut (kurgu) öneriyor; kanal örneği vermiyor. — [startupsole](https://startupsole.com/youtube-otomasyonu)
- Türkçe **Veo 3 / Kling eğitim videoları** çok, ama bunlar aracı anlatıyor, belgesel üretmiyor. — [Veo 3 Türkçe](https://www.youtube.com/watch?v=2Q30xANoQq0), [Kling Türkçe inceleme](https://www.youtube.com/watch?v=FWwQvUuC8CA)
- Büyük Türkçe bilim kanalları (Evrim Ağacı, Barış Özcan) yapay zekâ görselini ana üretim yöntemi olarak kullanmıyor; Evrim Ağacı yapay zekâ üretimi metin içerikle ilgili tartışma yaşadı. — [yenisafak](https://www.yenisafak.com/teknoloji/evrim-agaci-sitesi-yapay-zeka-uretimi-iceriklerle-2-milyon-tiklanmaya-ulasti-google-buna-nasil-izin-veriyor-4800400)
- Türkçe ses için toplulukta tekrar eden görüş: "Türkçe ses klonlamada ElevenLabs en iyisi"; bizim OmniVoice/Whisper hattımız bu açıdan yerel ve ücretsiz bir istisna.

**Sonuç:** Türkçe'de kodla üretilmiş, bilimsel olarak denetlenmiş, anlatımlı eğitim belgeseli yapan bir kanal bulamadım. Bu boşluk bizim lehimize; ama "yapay zekâ ile yapıldı" algısı Türkçe izleyicide olumsuz olabilir (webtekno haberindeki gözlem), bu yüzden vurgu "kodla ve bilimsel danışmanlıkla yapıldı" olmalı.

---

## 7. Bize öneri: somut iş akışı ve nedeni

### Ne değişmesin

- Anlatım skill'i, OmniVoice + Whisper kelime zamanları, iki satırlı altyazı, `render-video.mjs`, kapak kiti. Bunlar X'teki "kaliteli" parçaların çoğunda **yok** ya da ücretli (ElevenLabs). Bu bizim farkımız.
- Bilimsel doğruluk denetimi. Üretken video hattının en zayıf noktası bu.

### (a) Doğa belgeselleri: Blender'a geçiş (fotogerçekçilik için)

Neden: Karınca gibi makro doğa sahnesinde tarayıcı rasterizasyonu, yol izlemeli (Cycles) SSS, kürk, hacimsel ışık ve gerçek DoF'un yanında hep "oyun grafiği" gibi kalır. Blender ücretsiz, yerel, Claude Code Python'la tamamen sürebiliyor ve Anthropic resmî bağlayıcı çıkardı.

Somut hat:

1. **Sahne kurulumu Claude'un yazdığı `bpy` betikleriyle** (MCP değil; tek seferlik, tekrarlanabilir, sürüm kontrolüne girer; MindStudio'nun "elle yazılmış betik daha güvenilir" tespiti). Betikler `animations/documentary/<slug>/blender/` altında; `build` komutu `blender -b scene.blend -P render.py`.
2. **Karınca modeli**: prosedürel değil, Blender'da metaball/Skin modifier + Subdivision + Displace ile gövde; bacaklar Bezier eğrisi + Bevel; anten ve kıllar Hair Curves (Geometry Nodes yerine eski parçacık kıl sistemi — GN "kırılgan" uyarısı). Claude'un organik modelde zayıf olduğu biliniyor; bu yüzden **yeniden kullanılabilir tek bir karınca rigi** üretilip elle düzeltilmeli, sonra her sahnede çağrılmalı.
3. **Render**: Cycles GPU (OptiX), 1080p, 64–128 örnek + OIDN denoise, tile 512, dokular ≤2K, sahne başına 1–2 milyon üçgen sınırı; VRAM taşarsa Cycles otomatik CPU'ya düşer (yavaşlar ama biter). Test: 10 saniyelik plan (240 kare) gecelik render. EEVEE Next 4 GB'da sınırda, Cycles küçük sahnede daha güvenilir.
4. **Kamera dili betikle**: makro lens (f/2.8, 50–100 mm eşdeğeri), rack focus keyframe'leri, hafif noise kamera sallanması, volumetrik "god rays" (Volume Scatter, düşük yoğunluk).
5. **Renk ve ses post‑prodüksiyonu ffmpeg'de**: tek LUT, gren, vinyet; ortam sesi freesound CC0; müzik CC0/YouTube Audio Library.
6. **Etkileşimli web sayfası için Babylon sürümü kalsın**: belgeselin web sayfası tarayıcıda (hafif model), YouTube videosu Blender render'ından. Aynı anlatım/altyazı dosyaları ikisini besler.

Beklenen kazanç: X'teki üretken‑video belgesellerinin "sinema" hissinin büyük kısmı (ışık, DoF, malzeme) elde edilir; bilimsel kontrol bizde kalır; sıfır maliyet. Bedeli: render süresi (saatler) ve ilk model için elle çalışma.

### (b) Bilim / yazılım açıklayıcıları: Remotion + Manim

- **Remotion Agent Skills** kur (`npx skills add remotion-dev/skills`), tipografi, alt bant, diyagram geçişleri, kelime eşzamanlı altyazı bileşenlerini kanal kimliğine göre bir kez tasarla (renk/yazı tipi her animasyonda farklı olabilir; bileşen mantığı ortak). Lisans: bireysel kullanım ücretsiz, doğrula.
- **Manim CE** matematik/algoritma sahneleri için (`manim-claude` ya da `3brown1blue` kural setini `.claude/skills/` içine kopyalayıp Türkçe metin kurallarımızla birleştir).
- Yazılım konularında (Spring Boot gibi) Remotion'da gerçek kod bloklarının vurgulanması, terminal animasyonu ve akış diyagramları; 3B gerekmez.
- **Eleştirmen döngüsü**: `ig-explainer`'daki gibi bağımsız bir "izleyici" ajanı her render sonrası kareleri puanlasın (okunabilirlik, tempo, altyazı çakışması) — 7. adımdaki ekran görüntüsü kontrolünü sistemleştirir.

### (c) Üretken video: yalnızca kullanıcı onayıyla, dar kapsamda

- Yerelde 4 GB ile üretken video **denemeye değmez** (Wan 1.3B 480p, düşük kalite, dakikalar/klip).
- Kullanıcı isterse tek uygun ücretsiz seçenek **Google AI Studio (Veo 3.1, 720p, filigransız, hız sınırlı)**: yalnızca atmosfer B‑roll'u (bulut, yağmur, yaprak sallanması), asla hayvan davranışı ya da bilimsel iddia taşıyan plan. Videoda "bazı geçiş planları yapay zekâ ile üretildi" notu; YouTube'un "değiştirilmiş/sentetik içerik" işareti.
- Görsel storyboard için Nano Banana (Gemini uygulaması, ücretsiz katman) yalnız **ön tasarım** amaçlı; çıktı videoya girmez.

### Öncelik sırası (en büyük kalite sıçraması → en küçük)

1. Ses tasarımı + renk düzeltme + tempo (sıfır maliyet, bir haftada; mevcut karınca videosuna bile uygulanabilir).
2. Blender/Cycles ile fotogerçekçi doğa render'ı (2–4 hafta öğrenme + gecelik render'lar).
3. Remotion + Manim ile açıklayıcı motion‑graphics kalitesi (1–2 hafta).
4. Eleştirmen ajan döngüsü (birkaç gün).
5. Üretken B‑roll (yalnızca onayla, isteğe bağlı).

---

## 8. Kaynaklar

**Kodla üretim / Claude Code**
- Remotion Agent Skills belgesi: https://www.remotion.dev/docs/ai/skills
- Remotion coding agents rehberi: https://www.remotion.dev/docs/ai/coding-agents
- Remotion duyuru gönderisi (X): https://x.com/Remotion/status/2013626968386765291
- Jonny Burger başlangıç kılavuzu (X): https://x.com/JNYBGR/status/2015708193167479209
- Remotion 150K kurulum analizi: https://www.ngram.com/blog/remotion-skills-sh-ai-video-creation
- StartupHub Remotion haberi: https://www.startuphub.ai/ai-news/artificial-intelligence/2026/remotion-ai-video-makes-production-code-from-plain-prompts
- haidrrrry/claude-remotion-skill: https://github.com/haidrrrry/claude-remotion-skill
- OpenReplay "Making Videos with Claude Code and Remotion": https://blog.openreplay.com/making-videos-claude-code-remotion/
- HyperFrames (HeyGen): https://github.com/heygen-com/hyperframes
- HyperFrames yazısı: https://themenonlab.blog/blog/hyperframes-claude-code-writes-renders-videos
- OpenMontage: https://github.com/calesthio/OpenMontage
- manim-claude (PyPI): https://pypi.org/project/manim-claude/
- 3brown1blue skill: https://github.com/AmitSubhash/3brown1blue
- Yusuke710/manim-skill: https://github.com/Yusuke710/manim-skill
- 3b1b/videos CLAUDE.md: https://github.com/3b1b/videos/blob/master/CLAUDE.md
- Manim MCP sunucusu (Medium): https://medium.com/@omchoksi108/i-built-a-public-manim-mcp-server-now-claude-can-produce-real-3blue1brown-videos-on-demand-050995551c4e
- Animo (Claude Code + Manim): https://animo.video/claude-code-manim
- Logan Yang Manim meydan okuması (X): https://x.com/logancyang/status/2022153014124195913
- paper-explainer-video: https://github.com/AbigaleD/paper-explainer-video
- ig-explainer: https://github.com/prabaljainn/ig-explainer
- Remotion vs Motion Canvas vs Revideo: https://trybuildpilot.com/363-remotion-vs-motion-canvas-vs-revideo-2026
- Remotion alternatifleri (Voyager): https://voyageragent.ai/blog/remotion-alternatives
- MotionLoom: https://github.com/lenhonbp/MotionLoom
- web-animation-skills: https://github.com/iart-ai/web-animation-skills

**Blender**
- Anthropic "Claude for Creative Work": https://www.anthropic.com/news/claude-for-creative-work
- 9to5Mac haberi: https://9to5mac.com/2026/04/28/anthropic-releases-9-new-claude-connectors-for-creative-tools-including-blender-and-adobe/
- MindStudio Blender MCP değerlendirmesi: https://www.mindstudio.ai/blog/claude-blender-mcp-real-world-performance
- minihellboy/claude-blender: https://github.com/minihellboy/claude-blender
- blender-mcp: https://blender-mcp.com/
- CLSkills Claude + Blender iş akışı: https://clskillshub.com/blog/claude-blender-3d-modeling-workflow
- EEVEE Next VRAM geri bildirimi: https://devtalk.blender.org/t/blender-4-2-eevee-next-feedback/31813?page=45
- Cycles düşük donanım ipuçları: https://irendering.net/blender-cycles-optimization-tips-for-low-end-pc-2025/
- RTX 3050 Blender ölçümleri: https://www.renderjuice.com/gpus/rtx-3050-for-blender

**Üretken video / görüntü**
- Veo (Wikipedia): https://en.wikipedia.org/wiki/Veo_(text-to-video_model)
- Gemini API fiyatları: https://ai.google.dev/gemini-api/docs/pricing
- Google Veo fiyat rehberi: https://diyai.io/ai-tools/video-generation/google-veo-pricing/
- Ücretsiz yapay zekâ video araçları (Nisan 2026): https://aivideobootcamp.com/blog/free-ai-video-tools-2026/
- API fiyat kıyası (Veo/Kling/Sora): https://modelslab.com/blog/api/veo-3-1-vs-kling-3-sora-2-ai-video-api-cost-2026
- API fiyat tablosu: https://www.buildmvpfast.com/api-costs/ai-video
- Sora 2 fiyat/ücretsiz durumu: https://www.eesel.ai/blog/sora-2-pricing , https://www.cliprise.app/learn/guides/getting-started/how-to-use-sora-2-for-free-2026
- Grok Imagine ücretsiz katmanın kalkması: https://grokautomate.com/blog/how-to-use-grok-imagine-for-free , https://www.therundown.ai/tools/grok-imagine
- Nano Banana 2 + Veo 3.1 iş akışı: https://pctechmag.com/2026/04/nano-banana-2-veo-3-1-the-ultimate-ai-drama-workflow/
- n8n tutarlı karakter şablonu: https://n8n.io/workflows/11594-creating-consistent-character-videos-with-veo-31-gpt-4o-and-google-nanobanana/
- Storyboard tutarlılık rehberi: https://help.apiyi.com/en/nano-banana-pro-ai-video-storyboard-character-consistency-guide-en.html
- MIND TUNNELS (araç künyeli kısa film): https://www.youtube.com/watch?v=NB2xq-mzAkI
- AI filmmaking workflow (Kling/Veo/Nano Banana): https://www.youtube.com/watch?v=31GR1pXlB1g
- Kling ile belgesel yeniden yapımı: https://www.youtube.com/watch?v=wYaCJjqh8Mk
- Yapay zekâ ile film yapımı 2026: https://interestingengineering.com/ai-robotics/ai-tools-filmmaking-movies
- ElevenLabs Flows: https://elevenlabsmagazine.com/elevenlabs-flows-guide-2026/

**Yerel modeller / VRAM**
- Wan 2.1/2.2 VRAM rehberi: https://willitrunai.com/blog/wan-2-2-vram-requirements
- Civitai Wan 2.1 GGUF 4 GB iş akışı: https://civitai.com/models/1309674/wan21gguf-only-4gb-vram-comfyui-workflow
- Wan2GP: https://github.com/deepbeepmeep/Wan2GP
- LTX Video 2B VRAM: https://willitrunai.com/video-models/ltx-video-2-3
- LTX‑2.3 ComfyUI rehberi: https://www.thundercompute.com/blog/ltx-2-3-comfyui
- NVIDIA LTX‑2 hızlı başlangıç: https://www.nvidia.com/en-sg/geforce/news/rtx-ai-video-generation-guide/
- Yerel video karşılaştırması (Wan vs LTX): https://insiderllm.com/guides/local-ai-video-generation/
- Flux.2 Klein: https://blog.comfy.org/p/flux2-klein-4b-fast-local-image-editing , https://huggingface.co/unsloth/FLUX.2-klein-4B-GGUF
- Hunyuan3D 2.1: https://github.com/tencent-hunyuan/hunyuan3d-2.1

**Kalite bileşenleri, slop tartışması**
- vuela.ai "14 milyon görüntülenme" analizi: https://vuela.ai/blog/ai-animal-video-14-million-views-ai-generated
- FluxNote doğa kanalı rehberi: https://fluxnote.io/blog/how-to-start-a-nature-documentary-youtube-channel-with-ai-in-2026
- Maryland DNR sahte doğa videosu rehberi: https://news.maryland.gov/dnr/2026/04/27/is-that-real-a-guide-to-identifying-fake-wildlife-videos-created-with-generative-ai/
- Outside Online: https://www.outsideonline.com/outdoor-adventure/environment/ai-wildlife-video/
- A‑Z Animals: https://a-z-animals.com/articles/how-ai-generated-animal-videos-mislead-millions-about-nature/
- HackerNoon YouTube slop temizliği: https://hackernoon.com/youtubes-ai-slop-crackdown-cant-tell-a-directed-ai-film-from-a-bot-farm
- IDA "9 kırmızı bayrak": https://www.documentary.org/column/synthesis-9-red-flags-look-ai-documentaries-2026
- Suno fiyat/lisans: https://www.eesel.ai/blog/suno-review , https://dynamoi.com/learn/ai-music-distribution/suno-commercial-rights-explained
- Udio vs Suno: https://www.tldl.io/blog/suno-vs-udio-comparison
- Epidemic Sound fiyat: https://www.epidemicsound.com/pricing/
- Topaz fiyat: https://www.topazlabs.com/pricing , https://www.videoproc.com/resource/topaz-video-ai-review.htm

**Türkçe**
- webtekno yapay zekâ hikâye kanalı haberi: https://www.webtekno.com/yapay-zeka-hikayeleri-youtube-kanali-h155753.html
- ekşi sözlük "yapay zeka ile youtube kanalı açmak": https://eksisozluk.com/yapay-zeka-ile-youtube-kanali-acmak--7939364
- Startupsole YouTube otomasyonu 2026: https://startupsole.com/youtube-otomasyonu
- Veo 3 Türkçe anlatım: https://www.youtube.com/watch?v=2Q30xANoQq0
- Kling Türkçe inceleme: https://www.youtube.com/watch?v=FWwQvUuC8CA
- Evrim Ağacı yapay zekâ içerik tartışması: https://www.yenisafak.com/teknoloji/evrim-agaci-sitesi-yapay-zeka-uretimi-iceriklerle-2-milyon-tiklanmaya-ulasti-google-buna-nasil-izin-veriyor-4800400
