---
name: video
description: Bir animasyonun YouTube paketini masaüstüne çıkarır (MP4, altyazı, bölümler, kapak görselleri, açıklama)
argument-hint: <animasyon adı ya da slug, ör. "git hattı" ya da "fall-of-constantinople"> [altyazı gömülü] [aralık]
disable-model-invocation: true
---

Kullanıcının isteği:

> $ARGUMENTS

İstek boşsa `animations/*/*/animation.json` dosyalarındaki başlıkları listele, "Hangisinin videosunu çıkarayım?" diye sor ve dur.

## Amaç

Seçilen animasyon için YouTube'a yüklemeye hazır bir paket hazırla ve `C:\Users\Eyüp\Desktop\YouTube\<slug>\` klasörüne koy. Kullanıcı beklemeden çalışmanı istiyor; soru sorma, sonunda neyi neden seçtiğini kısaca anlat. İlk iş başlangıç saatini `date` ile not et.

## Yardımcı dosyalar

- [../animation/craft.md](../animation/craft.md): kapakların ana görseli için ışık, derinlik ve doku teknikleri.
- [../animation/pitfalls.md](../animation/pitfalls.md): bilinen tuzaklar (kapak ve video bölümleri dahil). Yeni bulduklarını ekle.
- [../animation/critique.md](../animation/critique.md): kapak temas sayfası turu.

## Adımlar

1. **Animasyonu bul.** Animasyonlar `animations/<kategori>/<slug>/` altında. İstekteki adı `animation.json` → `title` ya da `slug` ile eşleştir (Türkçe karakter ve büyük/küçük harf farkını önemseme). Araçlara yalnızca slug verilir. Kapaktaki konu etiketi kategoriden gelir (`tools/lib/animations.mjs` → `CATEGORIES[kategori].cover`, ör. YAZILIM).

2. **Video arayüzünü denetle.** Kök `README.md` ("YouTube videosu") ve `tools/render-video.mjs` şunları ister. Sayfa `?video=1` ile açılınca:
   - `window.__video = { duration, renderAt(t), prepareSound(from, to) → parça sayısı, soundChunk(i) → base64 WAV, srt(from, to) → metin, chapters(from) → [{ t, title }] }`
   - `window.__ready = true`
   - Oynatıcı arayüzü ve canlı altyazı gizli olmalı.

   Eksik varsa **yalnızca o animasyonun klasöründe** tamamla:
   - Film sesi `OfflineAudioContext` ile üretilir. Anlatım kayıtları kendi zamanlarına, efektler canlı sayfadakiyle aynı sentezle yerleştirilir; anlatım sırasında efektler kısılır.
   - Görüntü `renderAt(t)` ile kesin olarak çizilir; aynı `t` her zaman aynı kareyi verir.

   Önce kısa bir deneme yap (`npm run video -- <slug> --from 60 --to 75`) ve şunlara bak:
   - `ffprobe` ile görüntü ve ses akışı var mı,
   - `volumedetect` ile ses seviyesi makul mü (ortalama yaklaşık −14 ile −22 dB arası),
   - `.srt` ve bölüm listesi doğru mu,
   - `ffmpeg` ile birkaç kare çıkarıp bak.

3. **Kapak görselleri (5 tane, kanal kimliğiyle).** Animasyon klasöründe `thumbnail.html` yoksa oluştur. Sözleşme `tools/thumbnail.mjs` dosyasının başında yazılı: `?v=<n>` ile 1280×720 bir `#root` çizilir, `window.__thumbs` ve `window.__thumbReady` ayarlanır.
   - **Kanal kimliği ortak:** her kapak `assets/thumbnail-kit/kit.js` kitini kullanır. Sabit olanlar: sol taraftaki koyu panel, sol üstte "ANİMASYON LAB" işareti ve konu etiketi (YAZILIM, TARİH, BİYOLOJİ…), sol altta Anton yazı tipiyle büyük başlık ve sarı vurgu kelimesi, sarı çizgi, altında kısa açıklama satırı, sağ altta süre etiketi, renk işleme ve film greni. Bunlara dokunma; bütün kanal tek elden çıkmış gibi görünmeli.
   - **Ana görsel animasyona özgü:** her kapakta animasyon ana görseli kendi konusundan ve görsel dilinden çizer. Görselin ağırlığı sağ tarafta olsun; sol alt başlığa kalır. Tamamen kodla çizilir (perspektif, ışık saçılması, alan derinliği, bokeh, doku); telifli görsel ve logo yok. Kit bunun için yardımcılar da sunar (`bloom`, `depthOfField`, `bokeh`, `drawQuad`).
   - **5 farklı konsept:** sinematik bir genel sahne; konunun en çarpıcı anı; şaşırtıcı bir sayı ya da bilgi; bir yanlış bilinen ya da "önce/sonra" karşılaştırması; konunun kahramanı ya da bir yakın plan.
   - **Başlık:** en çok 3–4 kelime, büyük harflerle ve doğru Türkçeyle yazılır (İ/I; marka adları GIT gibi). Vurgulanacak kelime `*yıldız*` içine alınır. Küçük boyutta (320×180) da okunmalı.
   - `npm run thumbnail -- <slug>` ile üret. Beşini bir temas sayfasında yan yana koyup acımasız bir sanat yönetmeni gibi bak ve birkaç tur iyileştir: taşan ya da çakışan öğe, başlığın altına giren görsel, boş alan kalmasın.

4. **Tam videoyu üret.** `npm run video -- <slug>` komutunu arka planda çalıştır. Süre yaklaşık videonun 1,5–2 katıdır. Kullanıcı istemişse `--subs burn` ile altyazılı sürüm de üret. Beklerken 5. adımı hazırla.

5. **YouTube metni** (`youtube.txt`):
   - 2–3 başlık önerisi (merak uyandıran, 70 karakterden kısa),
   - açıklama: 2–3 cümlelik özet, bölüm listesi (`renders/<slug>-chapters.txt`), "Kaynaklar" (animasyonun `RESEARCH.md` dosyasından kısa liste), canlı sayfa bağlantısı (`https://duranmerve.github.io/animasyon-studyo/<slug>/`),
   - 10–15 etiket.

6. **Masaüstüne kopyala** (`C:\Users\Eyüp\Desktop\YouTube\<slug>\`):
   - `<slug>.mp4`, varsa altyazılı sürüm,
   - `<slug>.srt`,
   - `bolumler.txt`,
   - `kapak-1-….jpg` … `kapak-5-….jpg`,
   - `youtube.txt`.

   Son MP4'ü yine `ffprobe` ile denetle: süre animasyonla aynı olmalı, ses akışı bulunmalı.

7. **Kodu commit edip `main`'e push et.** Bu, video arayüzü ya da `thumbnail.html` gibi kod değişiklikleridir. `renders/` git'e girmez. Commit mesajı Türkçe olsun; bu komutu çalıştırmak bunun için onay sayılır.

8. **Son mesaj:**
   - masaüstü klasörünün yolu ve dosya listesi (boyutlarıyla),
   - videonun süresi,
   - kapak konseptlerinin kısa tarifi ve hangisini önerdiğin,
   - başlangıç ve bitiş saati.
