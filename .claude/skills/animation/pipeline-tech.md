# Ortak teknik (her animasyonda aynı kalitede)

Görünüm animasyona özeldir; aşağıdaki **teknik** ise değişmez. Üretim aşamasında okunur.

## Ses ve zamanlama

- Anlatım `narration/lines.json` ile üretilir (`npm run voice -- <slug>`): `{ "voice", "speed", "out": "public/voice", "manifest": "narration/manifest.json", "lines": [{ "id", "say" }] }`. **Bölüm başına tek kayıt.** `say` söylendiği gibi yazılır: rakamlar sözcük, parantez yok, kısaltmalar okunuşuyla; ekrandaki metin değişmez. Araç yalnızca değişen satırları üretir, Whisper ile denetler, şüpheli satırları listeler: düzelt.
- `manifest.json` → her kayıt için `file`, `dur`, `words` (Whisper kelime zamanları `[başlangıç, bitiş, kelime]`). Kayıtlar git'e girer.
- Bölüm süresi = giriş payı (~0,6 sn + bölümün `pre` sessizliği) + kayıt + nefes (~0,9 sn + `post`). Kayıt yoksa yedek: 1,3 sn + karakter/14,5.
- **Sahne olayları kelimelere bağlanır:** `cues: { olay: 'metindeki ifade' }`; yazılı ifadenin karakter oranı, Whisper kelimelerinin kümülatif karakter oranı üzerinden kayıt zamanına çevrilir (parçalı doğrusal). İfade bölümde bir kez geçmeli; "bu", "şimdi" gibi sık kelimelerle başlamamalı.
- **Saat kayıttır:** kayıt çalarken hikâye zamanı `currentTime`'ı izler (küçük fark yumuşak, büyük fark tek konumlandırma); hiç geri gitmez; `readyState < 3` ya da `seeking` iken bekler; çalan kayıt kare takıldı diye sarılmaz. **Sonuna gelmiş kayıt bitmiş sayılır, bir daha `play()` çağrılmaz;** kalan süre saatle akar. Ses görüntünün 1,5 sn'den fazla gerisindeyse bir kez görüntüye çekilir. Hız değişiminde `playbackRate` + `preservesPitch`. Geçerli ve sonraki bölüm önyüklenir, uzaktakiler bırakılır.

## Altyazı

- En çok iki satır; parça ~90 karakter, satır ~44; bölme sırası cümle sonu → virgül → bağlaç. Kelimeler baştan yerleşik ama görünmez; anlatıcı söyledikçe açılır (opaklık + hafif kayma + bulanıklıktan netleşme); satırlar yeniden dizilmez.
- Stil animasyona uyar ama okunaklı: kutu yok, altta yumuşak karartma, gölgeli açık yazı, masaüstünde ~17–23 px; boyut seçimi (küçük/orta/büyük) ayarlardan, `localStorage`.
- CC (C) ve anlatım (N) ayrı ayrı açılıp kapanır; gizleme `display: none` ile (satır içi opaklık CSS'i ezmesin); seçim hatırlanır.

## Oynatıcı

Başlangıç ekranı + Başlat (otomatik oynatma engeli); oynat/duraklat, bölüm atlama, bölüm çentikli ilerleme çubuğu, hız, tam ekran, klavye (boşluk, oklar, C, N, F); telefonda kullanılabilir. Başlat ekranının arkasında animasyonun en güçlü karesi. Satır içi SVG favicon (404 yok). Efektler Web Audio ile üretilir, anlatımda kısılır; aynı sentez fonksiyonu `OfflineAudioContext` ile video sesini üretir.

## Sahne durumu ve video

- `durum = f(t)`: aynı t aynı kare; rastgelelik sabit tohumlu. Oynatmada atlamayı, videoda kare kare çizmeyi bu sağlar.
- `?video=1` ile `window.__video = { duration, renderAt(t), prepareSound(from, to) → parça sayısı, soundChunk(i) → base64 WAV, srt(from, to), chapters(from) → [{ t, title }] }` ve hazır olunca `window.__ready = true`. `npm run video -- <slug>` (kök `tools/render-video.mjs`).
- Ağır sahneler ve shader'lar başlangıç ekranında ısıtılır; çözünürlük oynatma sırasında yalnızca kademe değişiminde değişir.

## Kalite kademeleri (bkz. `craft.md` → 8)

`ultra` (video) / `high` / `mid` / `low` / `min`; çalışma anında değişebilir; açılışta ölçüp seç; oynatmada düş; `?tier=` ile sabitlenebilir. Testler: `dev/perftest.mjs`, `dev/fpstest.mjs`, `dev/playtest.mjs`, `dev/endtest.mjs`, `dev/toggletest.mjs`, `dev/sheet.mjs` (temas sayfası), `dev/poster.mjs`. Referans uygulama: `animations/documentary/ant-documentary/dev/`.

## Ses tasarımı kuralları (kodla; kaynak `docs/code-mechanisms.md` (e))

- **Tempo haritası:** bölümler tam ölçü sayısıyla; kesme, dominanttan sonra tonikte iner; **kesmenin üstüne vurgu koyma** (kesme duyulur, ürkütmez). Yeni davul/katman **yarı güçle** girer (+3,5 dB, +11 dB değil).
- **Karışım hedefleri:** −16 LUFS bütünleşik, −1 dBTP tepe; müzik konuşmanın ~10 dB altında; anlatımda kısma (ducking) 0,4 sn zaman sabitiyle.
- **Denetim (`sync-check` fikri):** görsel olayların ses vuruşuna uzaklığı ±100 ms içinde; olaya girişte > 6 dB sıçrama = ürkütme, hata; kesmeden sessizliğe geçiş serbest.
- Ortam katmanı + karakter sesleri + vurgular; her bir efekt hem canlı `AudioContext` hem `OfflineAudioContext` ile aynı fonksiyondan üretilir.

## Teslim ve video kalitesi (kaynak `docs/code-mechanisms.md` → delivery)

- Video 30 fps, kareler kayıpsız PNG yakalanır, ffmpeg BT.709 TV aralığı etiketiyle (`scale=out_color_matrix=bt709`, `setparams`). Süper örnekleme (`--ss 2`) sunulursa PSNR ~6 dB artar.
- **Yüklenen videoda hareketli gren yok:** YouTube yeniden kodlamada gren bit hızını yiyor ve bulanıklaşıyor (SSIM 0,94 → 0,85). Web sayfasında hareketli gren serbest; `?video=1` modunda gren sabit ya da kapalı.
- **Saflık testi:** `npm run verify -- <slug>` — `renderAt(t)` aynı t'de ve uzaktan geri atlayınca aynı pikselleri vermeli; sayfa hatası olmamalı. Başarısızsa: `Math.random`, kare sayacı, kalıcı durum, zamanla biriken parçacık.
- **Temas sayfası kesmeden kaçar:** her N saniyede, N/2 kaydırmayla örnekle; örnek bir kesmenin ±0,35 sn içindeyse kesme + 0,45 sn'ye kaydır; kare zamanı tarayıcıda karenin üstüne basılır. Her bölüm sınırında 1/30 sn'lik şeritler (flaş kare avı) ve yüz/el için 1:1 kırpmalar.
