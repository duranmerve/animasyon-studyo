# Anlatıcı sesleri

Animasyonların anlatım sesleri. `npm run voice -- <slug> --voice <id>` ile seçilir; seçim animasyonun `narration/lines.json` dosyasında (`"voice"`) kalır. Hepsi yerelde üretilir, hepsinin lisansı ticari kullanıma (reklamlı YouTube dahil) açıktır ve atıf şartı yoktur.

| id | kod | ses | motor |
|---|---|---|---|
| `omni-erkek-derin` | O9 | Erkek, orta yaş, derin | OmniVoice |
| `omni-erkek-yasli` | O10 | Erkek, yaşlı | OmniVoice |
| `omni-kadin-genc` | O1 | Kadın, genç | OmniVoice |
| `omni-kadin-yasli` | O5 | Kadın, yaşlı | OmniVoice |
| `omni-erkek-orta-yas-tiz` | O32 | Erkek, orta yaş, tiz | OmniVoice |
| `omni-erkek-yasli-derin` | O33 | Erkek, yaşlı, çok derin | OmniVoice |
| `omni-erkek-yasli-derin-2` | O34 | Erkek, yaşlı, çok derin (2) | OmniVoice |
| `supertonic-kadin-1` | S1 | Kadın (F1) | Supertonic 3 |
| `supertonic-kadin-2` | S2 | Kadın (F2) | Supertonic 3 |
| `supertonic-kadin-5` | S5 | Kadın (F5) | Supertonic 3 |
| `supertonic-erkek-1` | S6 | Erkek (M1) | Supertonic 3 |
| `supertonic-erkek-2` | S7 | Erkek (M2) | Supertonic 3 |
| `supertonic-erkek-5` | S10 | Erkek (M5) | Supertonic 3 |
| `chatterbox-kadin` | C1 | Kadın, kendi sesi | Chatterbox v2 |
| `chatterbox-kadin-genc` | C2 | Kadın, genç (O1 tınısı) | Chatterbox v2 |
| `chatterbox-erkek-derin` | C5 | Erkek, derin (O9 tınısı) | Chatterbox v2 |
| `chatterbox3-kadin` | C6 | Kadın, kendi sesi | Chatterbox v3 |
| `chatterbox3-erkek-derin` | C9 | Erkek, derin (O9 tınısı) | Chatterbox v3 |
| `ema-kadin` | E1 | Kadın, Türkçeye özel | EMA-TTS |

## Motorlar

Kurulum `C:\ProgramData\tts_lab` altında; her motorun ayrı bir Python ortamı ve `tools/tts/` altında bir çalışanı var. Her kayıt Whisper ile dinlenip denetlenir, bozuk çıkan yeniden üretilir.

| motor | lisans | ortam | çalışan | not |
|---|---|---|---|---|
| OmniVoice | Apache 2.0 | `omni` | `omnivoice_worker.py` | Kısa, temiz bir kayıttan kopyalayarak konuşur (64 adım) |
| Supertonic 3 | OpenRAIL-M | `stonic` | `supertonic_worker.py` | Hazır sesler, ekran kartı gerekmez |
| Chatterbox Multilingual | MIT (duyulmayan filigran ekler) | `cbox` | `chatterbox_worker.py` | v2 ve v3 ağırlıkları; kendi sesi ya da bir kaydın tınısı |
| EMA-TTS | Apache 2.0 | `ema` | `ema_worker.py` | Tek sabit Türkçe kadın sesi, çok hızlı |

## OmniVoice nasıl kullanılıyor

OmniVoice'un ses tasarımı (tarifle ses üretme) yalnızca Çince ve İngilizceyle eğitilmiştir; Türkçede doğrudan tasarlanan sesler gürültülü ve düşük kaliteli olabiliyor. Bu yüzden:

1. Ses bir kez tasarlanır (cinsiyet, yaş, ses tonu).
2. Çıkan kayıttan 7–8 saniyelik bir parça kesilir, gürültüsü temizlenir (`omnivoice/*.wav`, metni `catalog.json` → `ref_text`).
3. Her cümle bu kısa kayıttan kopyalanarak, 64 adımla üretilir. Model yazarlarının önerisi de budur: 3–10 saniyelik temiz bir referans.

Bu dosyalar her sesin kimliğidir; değiştirilirse ses değişir ve animasyonların anlatımı yeniden üretilir.

Chatterbox'ın O1 ve O9 tınılı sesleri, seçim yapılırken dinlenen örneklerdeki gibi 13 saniyelik orijinal kayıtları (`chatterbox/ref-*.wav`) kullanır.

Denenen öteki modellerin örnekleri, karşılaştırması ve elenme nedenleri masaüstündeki `ses-ornekleri` sayfasındadır.
