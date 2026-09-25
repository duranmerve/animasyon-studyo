# Animasyon Stüdyo — kesin kurallar

Bu depo bir YouTube kanalının eğitim animasyonlarını üretir. Her video **kendi sanat yönüyle** yapılır; kanalın ortak kimliği yalnızca teknikte ve kapaklardadır. Bu dosya yalnızca kesin kuralları taşır; süreç ve teknik ayrıntı ilgili adımda okunan skill dosyalarındadır.

## Giriş kapıları

- `/animation <konu>`: anlatımlı, altyazılı eğitim animasyonu, 6–10 dakika. Süreç: `.claude/skills/animation/SKILL.md`.
- `/short [brief]`: sözsüz sinematik kısa film, 30–90 sn. Süreç: `.claude/skills/short/SKILL.md`.
- `/audit <slug>`: bitmiş animasyonun bağımsız denetimi (özgünlük, hikâye, metin, ses, akıcılık, teslim) → `AUDIT.md`. Süreç: `.claude/skills/audit/SKILL.md`.

## 1. Yalnızca kod

Sahne, karakter, hareket, ses efektleri, müzik ve altyazı Claude'un yazdığı kodla üretilir. Üretken görsel/video/ses modeli yok (ücretsiz katmanlar dahil; öneri olarak da geçmez). Anlatım sesi yalnızca yerel TTS (`tools/voice.mjs`). Serbest: ücretsiz CDN kütüphanesi ve yazı tipi, CC0 veri dosyası (HDRI, doku; kaynağı README'ye). Ücretli servis yok; dışarıya veri göndermeden önce sor.

## 2. Her video taze bir sanat yönü

- Kodlamadan önce bir **treatment** yazılır (`TREATMENT.md`): logline, görsel dünya, palet, doku, kamera dili, yazı, ses, 6–8 kahraman sahne. Yaratıcı kararların hepsi burada verilir; bu adımda yalnızca `CLAUDE.md`, tür kartı ve kısa zevk brief'i okunur.
- **Başka animasyonların kodu, sahnesi, paleti, yazı tipi açılmaz, taklit edilmez.** Aynı türün **teknik** modülleri (oynatıcı, zamanlama, altyazı, ses hattı, kalite kademeleri) kopyalanabilir; görsel dünya kopyalanamaz. Ayrım: `.claude/skills/animation/documentary-tech.md` gibi teknik kartlar.
- Aynı türde önceki videoyla en az şu üçünden ikisi farklı olmalı: palet ailesi, doku/malzeme dili, kamera ve sahne düzeni. Yayınlanan videoların kimlik özeti `docs/style-ledger.md` içindedir; yalnızca **tekrarı önlemek için** okunur, örnek almak için değil.
- Tür kartları (`.claude/skills/animation/formats/`) bir **tasarım uzayı** tarif eder; içinden bir nokta seçilir ve gerekçelenir. Kart, tarif değil sınırdır.

## 3. Kalite: dördü birden

1. **Görsel:** türe uygun, özenli, ucuz görünmeyen dünya (ışık, derinlik, doku, easing, ikincil hareket, kamera dili).
2. **Hikâye:** izleyiciyi saran anlatı: açılış sorusu, kahraman, gerilim, ödül, cevap. `.claude/skills/narration/`.
3. **Metin insan yazmış gibi:** belgesel belgesel gibi, yazılım yazılım gibi; yapay zekâ kalıpları yok; sesli okunup kesilmiş.
4. **Ses ve akıcılık:** aynı anlatıcı sesi baştan sona, bölüm başına tek kayıt, kodla üretilen ince ortam sesleri; ve **hiç donmama** (madde 5).

Bilimsel ve tarihsel doğruluk pazarlıksızdır: her sayı `RESEARCH.md`'deki bir kaynağa dayanır; emin olunmayan yuvarlak ve temkinli söylenir.

## 4. Klasörler ve adlar

- `animations/<kategori>/<slug>/`; kategori İngilizce (biology, history, geography, physics, chemistry, math, space, technology, software, documentary, short; liste `tools/lib/animations.mjs`). Belgeseller konusu ne olursa olsun `documentary/` altında. Slug bütün depoda tek; adres `…/animasyon-studyo/<slug>/`.
- `npm run new -- <kategori>/<slug> "<Başlık>"` boş klasör açar. `animation.json`: `slug`, `title`, `description`, `format`, `tech`, `build`, `output`. `build` klasörde çalışır ve `output`'a kendi başına açılan `index.html` üretir.
- Yalnızca kendi klasöründe çalış; başka animasyonun dosyasına dokunma. Kök `README.md` tablosuna satır ekle.
- Arayüz metni, README ve commit Türkçe (düzgün Türkçe karakter); kod tanımlayıcıları ve dosya adları İngilizce.

## 5. Donma yasak

İzleyicinin bilgisayarı bizimkinden zayıftır. Çalışma anında değişen kalite kademeleri, açılışta otomatik seçim, oynatmada düşürme; video her zaman en üst kademede. Her kademede fps ölçülür; hedef orta makinede ≥ 50, en düşük kademede zayıf makinede ≥ 30, 50 ms üstü kare ≈ 0. Ayrıntı: `craft.md` → Performans.

## 6. Ortak teknik (değişmez)

Bölüm başına tek ses kaydı; hikâye zamanı kaydı izler, geri gitmez, yüklenirken bekler; altyazı iki satır, kelime kelime, Whisper zamanlarından; CC ve anlatım ayrı ayrı kapanır, seçim hatırlanır; sahne durumu zamanın saf fonksiyonu; `?video=1` ile `window.__video` sözleşmesi. Ayrıntı: `.claude/skills/animation/pipeline-tech.md`.

## 7. Yerel araçlar

Chrome `C:/Program Files/Google/Chrome/Application/chrome.exe`; ffmpeg PATH'te; OmniVoice + Whisper `C:\ProgramData\tts_lab` (RTX 3050 Ti 4 GB). Ortak araçlar: `tools/voice.mjs`, `tools/render-video.mjs`, `tools/thumbnail.mjs` (+ `assets/thumbnail-kit`, kanal kimliği), `tools/build-site.mjs`, `assets/avatars/` (yalnızca gerçek insan karakteri gerekirse).
