---
name: animation
description: Yeni eğitim animasyonu yapar (araştırma, treatment, anlatım, ses, altyazı, kod, eleştiri, test, commit ve push)
argument-hint: <konu ve istekler, ör. "bal arısının bir günü, belgesel" ya da "TCP el sıkışması, lise">
disable-model-invocation: true
---

Kullanıcının isteği:

> $ARGUMENTS

İstek boşsa yalnızca "Hangi konuda animasyon yapayım?" diye sor ve dur. Doluysa aşağıdaki aşamaları sırayla uygula. `CLAUDE.md` kesin kurallardır. Kullanıcı beklemez: soru sorma, karar ver, sonunda gerekçeni anlat. Bir aşamada yalnızca o aşamanın dosyaları okunur; **hiçbir aşamada başka bir animasyonun klasörü açılmaz.**

## Aşama 0: karar

- **Tür:** belgesel / açıklayıcı / yazılım / tarih / çocuklar. İstekte yoksa konuya ve kitleye göre seç. Belgesel → `animations/documentary/`, ötekiler konu kategorisine.
- **Kitle, süre, ses:** yoksa seç. Süre 6–10 dk; anlatıcı sesi konuya göre (`npm run voice -- voices`; belgesel için derin/yaşlı erkek O9, O10, O33; canlı anlatı için O1).
- Klasörü aç: `npm run new -- <kategori>/<slug> "<Başlık>"`. Başlangıç saatini not et (`date "+%Y-%m-%d %H:%M:%S"`).

## Aşama 1: araştırma → `RESEARCH.md`

Birden çok güvenilir kaynak; her sayı ve tarih iki kaynaktan; "şaşırtan şeyler" ve "yaygın yanlışlar" ayrı listeler; emin olunmayanlar temkinli ifadeyle. Kaynak adı + adres + verdiği bilgi.

## Aşama 2: treatment → `TREATMENT.md` (yaratıcı aşama)

Bu aşamada **yalnızca** şunlar okunur: `CLAUDE.md`, tür kartı `formats/<tür>.md`, `docs/style-ledger.md` (tekrarı önlemek için), `RESEARCH.md`. Teknik dosyalar (`craft.md`, `pipeline-tech.md`, `documentary-tech.md`) bu aşamada **okunmaz**.

Zevk brief'i:

> Bu konuyu bir daha görülmemiş, onu olduğundan kolay göstermeyen, sinematik ve estetik seçimleri sonuçta görülen bir eğitim filmi olarak tasarla. İlk akla gelen çözüm herkesin çözümüdür; önce beş farklı görsel dünya tart, konuyu en doğru ve en güçlü gösterecek olanı seç. Dekoratif taklit kabul edilmez: her görsel karar konudan çıkmalı. Her bölümde izleyicinin aklında kalacak tek bir kare olmalı.

`TREATMENT.md` içeriği (tek sayfa):
1. **Çekirdek cümle:** izleyici sonunda neyi anlamış olmalı?
2. **Beş görsel dünya:** her biri farklı teknik ailesi, palet ailesi, kamera dili ve sahne düzeniyle; ikişer cümle. Tür kartındaki uzaydan **farklı noktalar**.
3. **Seçim ve gerekçe:** "videoda en güçlü görünür", "konuyu en doğru anlatır", "bir günde kodla yapılır" ölçütleriyle. `style-ledger.md`'deki aynı türden önceki videolarla palet / doku / kamera-sahne düzeninden en az ikisinin farklı olduğunu yaz.
4. **Kimlik kartı:** palet (5–7 renk, tek vurgu), doku ve malzeme dili, ışık, kamera dili, yazı tipleri (Google Fonts), hareket karakteri, ses dünyası, arayüz dili.
5. **Kahraman sahneler:** bölüm başına bir "akılda kalacak kare" (6–12 bölüm). Her biri için: ne görünür, neden unutulmaz, teknik kısa notu.
6. **Riskler:** en zor iki sahne ve yedek planı.

Bu aşamanın sonunda kod yazılmaz. Otonom oturumda treatment kendi kendine onaylanır; kullanıcı varsa gösterilir.

## Aşama 3: anlatım → `NARRATION.md`, `src/script.js`

`../narration/SKILL.md` + `../narration/formats/<tür>.md` + `../narration/retention.md`. Beat sheet (resim · cümle · duygu · ipucu), metin, sesli okuma süresi, %20 kesme, "yapay zekâ gibi okunmamak" kontrolü. Sonra `npm run voice -- <slug>`; şüpheli satırları düzelt.

## Aşama 4: üretim

Şimdi okunur: `pipeline-tech.md` (ortak teknik: zamanlama, altyazı, oynatıcı, video sözleşmesi), `craft.md` (teknik alet çantası, performans), `pitfalls.md`, ve türün teknik kartı varsa (`documentary-tech.md`: hangi modül kopyalanır). Treatment'taki kimlik kartı bağlayıcıdır; teknik dosyalar görünüme karışmaz.

Sıra: **soğuk açılışı uçtan uca kanıtla** (ilk bölüm: görüntü + ses + altyazı + video sözleşmesi çalışır durumda) → kalan kahraman sahneler (iki sahnede görünen her şey ortak modül; tutarlılık sayfası tek yerde) → oynatıcı → ses dünyası → kalite kademeleri. Yerleşim kaydı **zorunlu**: ekran yazıları `claim/placeFree` ile, altyazı bandı korunan alan, çakışma denetimi (`craft.md` → 12). Canlı varsa `craft.md` → 14 asgarisi, geniş planlar için → 15.

## Aşama 5: eleştiri döngüsü (en az üç tur, erken)

İlk üç bölüm kodlanır kodlanmaz `critique.md` ile temas sayfası turu; sonra her yeni bölüm grubunda. Masaüstü (1600×900) ve telefon (390×844). Kusur listesi → düzeltme → yeniden görüntü. "Ucuz görünme" listesi ve "yapay zekâ metni" kontrolü her turda.

## Aşama 6: testler (hepsi geçmeli)

- Gerçek zamanlı oynatma: geri gitme 0, kayıt ortasında sarma 0, ses–görüntü farkı < 150 ms, konsol hatası 0.
- Bölüm sonları (`dev/endtest.mjs fast`): kayıt başa dönmüyor, görüntü donmuyor.
- Performans: her kademede fps (`dev/fpstest.mjs`), kare maliyeti (`dev/perftest.mjs`); otomatik seçim çalışıyor.
- CC ve anlatım düğmeleri gerçekten kapanıp açılıyor; seçim hatırlanıyor.
- `npm run verify -- <slug>` **üç kez art arda** temiz (aralıklı hatalar geç yüklenen kaynak ya da sıfırlanmayan durumdur); `--query tier=high` ile de.
- `npm run video -- <slug> --from 60 --to 75` kısa deneme; video modunda hareketli gren kapalı.

## Aşama 7: teslim

- `README.md` (ne anlattığı, bölümler, teknik, komutlar, performans ölçümleri), `poster.jpg`, 5 kapak (`thumbnail.html`, `npm run thumbnail -- <slug>`; kurallar `../video/SKILL.md` 3. adım), kök `README.md` tablosuna satır, `docs/style-ledger.md`'ye bu videonun beş satırlık kimlik özeti.
- Yeni tuzakları `pitfalls.md`'ye ekle. `COST.md` (başlangıç, bitiş, model, yerel ses; token bilgisi kullanıcı `/usage` verirse).
- Kökte `npm run build -- <slug>`; Türkçe commit; `main`'e push (bu komut onay sayılır; animasyona ait olmayan değişiklikleri katma).
- Son mesaj: canlı adres, saatler, kararların gerekçesi, bilinen kısıtlar.
