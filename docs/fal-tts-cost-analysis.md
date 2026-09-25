# fal.ai ile seslendirme: maliyet analizi ve deneme planı

> **Durum:** Beklemede. Kullanıcı fal.ai API anahtarını daha sonra verecek; deneme ondan sonra yapılacak.
> Hazırlanma tarihi: 25 Eylül 2026. Fiyatlar o gün fal.ai sayfalarından kontrol edildi.

Şu an anlatım sesleri yerelde, ücretsiz olarak üretiliyor (OmniVoice + Whisper, `tools/voice.mjs`). Bu belge, seslendirmeyi fal.ai üzerindeki ücretli bir TTS servisine taşımanın maliyetini ve denemenin nasıl yapılacağını özetliyor.

## 1. Seslendirme metinleri nerede

Her animasyonun metni `animations/<kategori>/<slug>/narration/lines.json` dosyasının `lines[].say` alanında durur.

- Metin zaten okunacak hâliyle yazılıdır: rakamlar sözcüğe çevrilmiş, kısaltmalar söylenişe göre düzenlenmiştir.
- Sahne notu, kod ya da zaman damgası içermez. Karakter sayısı doğrudan bu alandan alınabilir.
- Her satır bir bölümün anlatımının tamamıdır, yani bölüm başına tek kayıt üretilir.

## 2. Karakter sayıları (boşluklar dahil)

| Video | Bölüm | Karakter | Ses süresi | Karakter/dk |
|---|---|---|---|---|
| Sindirim Yolculuğu (`digestive-journey`) | 14 | 4.927 | 4,86 dk | 1.014 |
| Yazıcının İçinde (`laser-printer`) | 16 | 5.040 | 5,28 dk | 955 |
| İstanbul'un Fethi (`fall-of-constantinople`) | 14 | 7.019 | 7,37 dk | 952 |
| Git Hattı (`git-version-control`) | 16 | 6.294 | 6,13 dk | 1.027 |
| **Ortalama** | | **5.820** | | **~985** |

Projede ölçülen oran dakikada **~985 karakter**. Buna göre tahminler:

- 5 dakikalık video: **~4.925 karakter**
- 10 dakikalık video: **~9.850 karakter**

## 3. fal.ai fiyatları (25 Eylül 2026)

| Model | 1.000 karakter | Türkçe desteği | Sayfa |
|---|---|---|---|
| ElevenLabs Eleven v3 | 0,10 $ | var | [fal.ai](https://fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3) |
| ElevenLabs Multilingual v2 | 0,10 $ | var | [fal.ai](https://fal.ai/models/fal-ai/elevenlabs/tts/multilingual-v2) |
| ElevenLabs Turbo v2.5 | 0,05 $ | var | [fal.ai](https://fal.ai/models/fal-ai/elevenlabs/tts/turbo-v2.5) |
| MiniMax Speech 2.8 HD | 0,10 $ | sayfada belirtilmiyor, denenmeli | [fal.ai](https://fal.ai/models/fal-ai/minimax/speech-2.8-hd) |
| Inworld TTS-1.5 Max | 0,01 $ | sayfada belirtilmiyor, denenmeli | [fal.ai](https://fal.ai/models/fal-ai/inworld-tts) |
| Gemini 3.1 Flash TTS | 0,05 $ | "80'den fazla dil" deniyor, Türkçe açıkça yazmıyor, denenmeli | [fal.ai](https://fal.ai/models/fal-ai/gemini-3.1-flash-tts) |

## 4. Video başına maliyet

Her hücrede üç değer var: ek pay yok / %50 ek pay / %100 ek pay. Ek pay, beğenilmeyen kayıtların yeniden üretilmesi içindir.

| Fiyat grubu | 5 dk video | 10 dk video |
|---|---|---|
| 0,10 $ (Eleven v3, Multilingual v2, MiniMax HD) | 0,49 / 0,74 / 0,99 $ | 0,99 / 1,48 / 1,97 $ |
| 0,05 $ (Turbo v2.5, Gemini 3.1 Flash) | 0,25 / 0,37 / 0,49 $ | 0,49 / 0,74 / 0,99 $ |
| 0,01 $ (Inworld 1.5 Max) | 0,05 / 0,07 / 0,10 $ | 0,10 / 0,15 / 0,20 $ |

Mevcut videolar 0,10 $ fiyatla, ek pay olmadan: Sindirim 0,49 $, Yazıcı 0,50 $, Fetih 0,70 $, Git Hattı 0,63 $.

## 5. Aylık maliyet

Her hücrede ayda 10 / 20 / 40 video için tutar var.

**5 dakikalık videolar**

| Fiyat grubu | ek pay yok | %50 ek pay | %100 ek pay |
|---|---|---|---|
| 0,10 $ | 4,93 / 9,85 / 19,70 $ | 7,39 / 14,78 / 29,55 $ | 9,85 / 19,70 / 39,40 $ |
| 0,05 $ | 2,46 / 4,93 / 9,85 $ | 3,69 / 7,39 / 14,78 $ | 4,93 / 9,85 / 19,70 $ |
| 0,01 $ | 0,49 / 0,99 / 1,97 $ | 0,74 / 1,48 / 2,96 $ | 0,99 / 1,97 / 3,94 $ |

**10 dakikalık videolar**

| Fiyat grubu | ek pay yok | %50 ek pay | %100 ek pay |
|---|---|---|---|
| 0,10 $ | 9,85 / 19,70 / 39,40 $ | 14,78 / 29,55 / 59,10 $ | 19,70 / 39,40 / 78,80 $ |
| 0,05 $ | 4,93 / 9,85 / 19,70 $ | 7,39 / 14,78 / 29,55 $ | 9,85 / 19,70 / 39,40 $ |
| 0,01 $ | 0,99 / 1,97 / 3,94 $ | 1,48 / 2,96 / 5,91 $ | 1,97 / 3,94 / 7,88 $ |

**Ek pay neden %100'e yakın düşünülmeli:**

- Kayıtlar bölüm başına tek parça üretilir. Beğenilmeyen tek bir cümle için bütün bölüm (300–500 karakter) yeniden üretilir.
- `voice.mjs`, Whisper'ın şüpheli bulduğu kayıtları kendiliğinden tekrar dener. Harici bir serviste her deneme ücretlidir; deneme sayısının sınırlanması gerekir.

## 6. Ön değerlendirme

En kötü durumda bile, yani ayda 40 tane 10 dakikalık video ve %100 ek payla, aylık tutar yaklaşık 79 $. Asıl belirsizlik fiyat değil, modellerin Türkçe kalitesi.

- **Kalite öncelikliyse:** ElevenLabs Eleven v3 veya Multilingual v2. Türkçe desteği bilinen, en doğal seçenekler.
- **Fiyat–kalite dengesi:** Gemini 3.1 Flash TTS (0,05 $). Önce Türkçe denemesi yapılmalı.
- **Turbo v2.5:** yarı fiyatına, Multilingual v2'den biraz daha düz bir ses.
- **Inworld 1.5 Max:** en ucuzu, ama Türkçe desteği doğrulanmadı. Denemeden seçilmemeli.
- **MiniMax HD:** ElevenLabs ile aynı fiyatta, Türkçe desteği belirtilmiyor. Belirgin bir üstünlüğü görünmüyor.

## 7. Deneme planı (API anahtarı gelince)

1. **Anahtarın saklanması.** Anahtar yalnızca ortam değişkeninde tutulur (`FAL_KEY`). Hiçbir dosyaya yazılmaz, git'e girmez.
2. **Ortak metin.** Bütün modellere aynı metin verilir. Git Hattı'nın bir bölümü uygun olur, örneğin `ff` (~450 karakter) ya da `commit` (~420 karakter). Bu metinde Git terimleri, rakamlar ve Türkçe karakterler bir arada var.
3. **Denenecek modeller.** Eleven v3, Multilingual v2, Turbo v2.5, Gemini 3.1 Flash, Inworld 1.5 Max ve MiniMax HD, birer kez. Toplam maliyet 0,25 $'ın altında kalır.
4. **Karşılaştırma.**
   - Aynı bölümün mevcut OmniVoice kaydıyla (O1) yan yana dinlenir.
   - Whisper ile hata oranı ölçülür; `voice.mjs` bunu zaten yapıyor.
   - Süre ve dakikadaki karakter sayısı not edilir.
   - Sonuçlar bir karşılaştırma sayfasında sunulur.
5. **Karar verilirse yapılacaklar.**
   - `CLAUDE.md` içindeki "ücretli dış servis kullanma" kuralı güncellenir.
   - `tools/voice.mjs` dosyasına bir fal.ai motoru eklenir.
   - Otomatik yeniden deneme sayısı sınırlanır.
   - Ticari kullanım ve lisans koşulları model bazında kontrol edilir.

## 8. Önerilen yardımcı betik (henüz yazılmadı)

`tools/cost-estimate.mjs`:

- **Girdi:** bir animasyonun adı (onun `lines.json` dosyasını okur) ya da herhangi bir `.txt` / `.json` dosyası.
- **Çıktı:** karakter sayısı (boşluklu ve boşluksuz), ~985 karakter/dk ile tahmini süre ve model bazında maliyet tablosu (ek pay yok / %50 / %100).
- **Seçenekler:**
  - `--videos 10,20,40` ile aylık toplamlar
  - `--all` ile bütün animasyonlar
- Fiyatlar betiğin başında tek bir tabloda durur, kolayca güncellenir.
