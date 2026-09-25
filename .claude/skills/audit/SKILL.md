---
name: audit
description: Bitmiş bir animasyonu bağımsız denetler (özgünlük, hikâye, metin, ses, akıcılık, doğruluk, teslim); sonuçları puanlı bir raporla verir. Kullanıcı "/audit <slug>" dediğinde ya da bir animasyonun denetlenmesini istediğinde kullanılır.
argument-hint: <slug, ör. bee-documentary>
disable-model-invocation: true
---

Denetlenecek animasyon: **$ARGUMENTS** (slug; klasör `tools/lib/animations.mjs` → `findAnimation` ile bulunur).

Denetçi işi yapan değildir: varsayılan karar **"düzeltme gerek"**, geçer yalnızca kanıtla (ekran görüntüsü, ölçüm, satır numarası). Ölçütler `CLAUDE.md` → "Kalite: dördü birden" ve "Her video taze bir sanat yönü". Hiçbir bölümü beğenmek için değil kusur bulmak için izle.

## 1. Özgünlük (treatment)

- `TREATMENT.md` var mı; beş görsel dünya gerçekten farklı mı (teknik ailesi, palet, kamera, sahne düzeni), seçim gerekçeli mi?
- `docs/style-ledger.md`'deki aynı türden önceki videoyla karşılaştır: palet ailesi / doku dili / kamera-sahne düzeninden en az ikisi farklı mı? Temas sayfasını önceki videonun posteriyle yan yana koy; "aynı elden çıkmış" hissi var mı?
- Tür kartındaki (`formats/<tür>.md`) hangi nokta seçilmiş; kart tarif gibi mi uygulanmış (kötü) yoksa uzaydan bir nokta mı (iyi)?

## 2. Hikâye ve metin

- `NARRATION.md` ve `src/script.js`: açılış sorusu, kahraman, gerilim, ödül, sonda cevap var mı? Bölüm sonları ileri çekiyor mu?
- Metni sesli oku: `narration/SKILL.md` → 2b'deki yapay zekâ kalıplarını say (davet kalıbı, boş vurgu, üçlü sıralama, her cümlede benzetme, özet kapanışlar). Tür sesi (belgesel: şimdiki zaman, gözlemci, görüleni söylememe) tutuyor mu?
- Doğruluk: anlatımdaki her sayıyı `RESEARCH.md`'de bul; bulunamayanı ve kaynaksızı listele. Bir iki iddiayı bağımsız kaynaktan yeniden doğrula.

## 3. Ses

- `narration/lines.json` → tek ses, bölüm başına tek kayıt; `manifest.json` → kelime zamanları var; Whisper farkı yüksek satır var mı?
- Ortam sesi ve efektler kodla mı (`sound.js` benzeri), anlatımda kısılıyor mu; `?video=1`'de çevrimdışı üretiliyor mu?

## 4. Akıcılık ve teknik (ölçümler; hepsi zorunlu)

Geliştirme sunucusunu aç, sonra `dev/` araçlarıyla ve kök araçlarla:
- `npm run build -- <slug>` ve `npm run verify -- <slug>` (saflık; ayrıca `--query tier=high`).
- `dev/fpstest.mjs` her kademede + otomatik seçim; `dev/perftest.mjs`; hedefler `CLAUDE.md` → 5.
- `dev/playtest.mjs` (geri gitme 0, sarma 0, ses–görüntü < 150 ms, hata 0), `dev/endtest.mjs fast`, `dev/toggletest.mjs`.
- Temas sayfası masaüstü + telefon (`dev/sheet.mjs`); her bölümden en az iki kare; kesmeden kaçan örnekleme.
- `npm run video -- <slug> --from 60 --to 75` çalışıyor mu; video modunda hareketli gren kapalı mı?

## 5. Görsel (temas sayfası üzerinden, `critique.md` listeleriyle)

Slop ret listesi, "ucuz görünme" listesi, okunaklılık (≥ 16 px, telefonda ≥ 12 px), çakışma, boşluk, kalabalık, ışık yönü, kahraman kare treatment'takine ulaşmış mı. Her bulgu: bölüm + zaman + ne + nasıl düzelir.

## 6. Teslim

README (bölümler, komutlar, ölçümler), `poster.jpg`, 5 kapak, kök README satırı, `style-ledger.md` girişi, `COST.md`, `pitfalls.md`'ye eklenen tuzaklar, commit ve canlı adres.

## Rapor

`animations/<kategori>/<slug>/AUDIT.md` dosyasına yaz ve kullanıcıya özetle:
- Altı başlık için 1–5 puan ve tek cümlelik gerekçe; ölçüm tablosu (fps kademeleri, saflık, oynatma).
- **Önce düzeltilecek 5 şey** (etkiye göre sıralı, her biri somut).
- Kuralların işe yaradığı ve yaramadığı yerler: skillerde neyin değişmesi gerektiği (bu, denetimin asıl çıktısıdır).
- Önceki videoyla özgünlük karşılaştırması: aynı mı, farklı mı, neden.

Kod düzeltmesi yapma; denetim raporu yaz. Kullanıcı isterse düzeltmeler ayrı adımdır.
