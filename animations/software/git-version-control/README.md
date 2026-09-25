# Git Hattı: Sürüm Kontrolü

Git ile sürüm kontrolünü bir **metro haritası** üzerinde anlatan, sesli ve altyazılı bir animasyon (yaklaşık 6,5 dakika). Hedef kitle: lise öğrencileri, üniversitenin ilk yılı ve yazılıma yeni başlayanlar.

Elif ile Can, bilim şenliği için "Yıldız Avcısı" adlı küçük bir oyun yazıyor. Projenin geçmişi bir hat haritası olarak büyüyor: her commit bir durak, her dal kendi renginde bir hat, birleştirme commit'i bir aktarma durağı, HEAD ise kırmızı "buradasınız" noktası. Ekrandaki terminal, o an yapılan işin gerçek Git komutunu ve çıktısını gösterir.

## Bölümler

| # | Bölüm | Ana fikir |
|---|---|---|
| 1 | Ödev son, son iki, gerçekten son | Dağınık "son" dosyaları tek bir hatta dizilir |
| 2 | 2005: Birkaç günde doğan araç | Linux çekirdeği, Linus Torvalds, 3 ve 7 Nisan 2005; %93; Git ≠ GitHub |
| 3 | Depo: projenin hafızası | `git init`, gizli `.git` klasörü, depo yereldir |
| 4 | Üç alan: masa, sahne, albüm | Çalışma klasörü, hazırlık alanı (staging), depo; `git add` |
| 5 | Commit: projenin fotoğrafı | Deklanşör, yazar/zaman/mesaj, 40 karakterlik kimlik, kısa hâli |
| 6 | Fark mı, fotoğraf mı? | Yanlış bilinen: Git farkları değil anlık görüntüleri saklar; değişmeyen dosya yeniden saklanmaz |
| 7 | Zincir: her durak bir öncekini bilir | Ebeveyn kimliği; tek harf değişince bütün kimlikler değişir |
| 8 | Zamanda yolculuk | HEAD, `git checkout`, `git switch main` |
| 9 | Dal: 41 baytlık bir etiket | Yanlış bilinen: dal kopya değildir; `.git/refs/heads/kalkan` |
| 10 | Birleştirme: ileri sarma | Fast-forward: yeni commit yok, etiket kayar |
| 11 | İki yolun buluşması | Üç yollu birleştirme: ortak ata + iki uç → iki ebeveynli commit |
| 12 | Çakışma: aynı satır, iki fikir | Çakışma hata değildir, karar insana kalır |
| 13 | Çakışmayı çözmek | `<<<<<<<`, `=======`, `>>>>>>>`; `git add` + `git commit` |
| 14 | Uzak depo | `git push -u origin main`, `git clone`, `origin`, dağıtık yapı |
| 15 | push ve pull | Reddedilen push, pull = fetch + merge |
| 16 | Hattın haritası | Özet ve açılış sorusunun yanıtı |

Tasarım kararları [DESIGN.md](DESIGN.md), kaynaklar ve doğrulanan bilgiler [RESEARCH.md](RESEARCH.md) dosyasında.

## Teknik

- **Canvas 2D**, paket yok. Bütün sahne tek bir saf fonksiyon: `draw(ctx, W, H, t)` (aynı `t` → aynı kare).
- Anlatım `src/story.js` içinde yazılır. `@işaret` sahne olaylarını kelimelere bağlar, `{ekranda|söylenen}` rakam ve tarihleri söylenişe çevirir; Git sözcüklerinin okunuşu (`commit` → "komit" gibi) aynı dosyada.
- Bölüm başına tek kayıt (OmniVoice, O1 genç kadın sesi, hız 0,92). Sahne ve altyazı zamanları kayıttaki Whisper kelime zamanlarından çıkarılır.
- Oynatırken saat kayıttır: hikâye zamanı sesi izler, geri gitmez, kayıt yüklenirken bekler; çalan kayıt hiç sarılmaz.
- Altyazı en çok iki satır, kelimeler söylendikçe açılır. Altyazı (C) ve anlatım (N) ayrı ayrı kapatılabilir, boyut ayarlanabilir; seçimler hatırlanır.
- Efekt sesleri Web Audio ile üretilir, anlatım sırasında kısılır.
- Video için `?video=1` adresinde `window.__video` (`duration`, `renderAt`, `srt`, `chapters`) hazır; film sesi (`prepareSound`) video istendiğinde eklenecek.

## Komutlar

```
node tools/lines.mjs                          # src/story.js → narration/lines.json
npm run voice -- git-version-control          # (kökte) sesleri üretir, Whisper ile denetler
node build.mjs                                # dist/ (sayfa, modüller, sesler, manifest)
node tools/serve.mjs                          # dist/ klasörünü http://localhost:5178 adresinde açar
node tools/shots.mjs <klasör> 1600x900 commit.flash branch.bytes+1   # ekran görüntüleri
node tools/playtest.mjs 80                    # gerçek zamanlı oynatma testi (takılmalı)
node tools/poster.mjs summary.final           # poster.jpg
```

Klavye: boşluk oynat/duraklat · ←/→ 5 sn · Shift+←/→ bölüm · C altyazı · N anlatım · F tam ekran.
