---
name: yap
description: Tek satırlık bir konudan baştan sona animasyon üretir, main'e pushlar ve GitHub Pages'te yayına girdiğini doğrular; kullanıcıya soru sormaz
argument-hint: <konu, ör. "Körfez nasıl oluşur?">
disable-model-invocation: true
---

Konu:

> $ARGUMENTS

Konu boşsa yalnızca "Hangi konuda animasyon yapayım?" diye sor ve dur.

Doluysa `.claude/skills/animation/SKILL.md` dosyasını oku ve bütün aşamalarını bu konu için sırayla uygula. İstek metni olarak yukarıdaki konuyu kullan. Ek olarak şu kurallar geçerli:

- **Soru sorma.** Kullanıcının teknik bilgisi yok. Tür, kitle, süre ve görsel tarzı sen seç; gerekçesini sonda kısaca yaz.
- **Baştan sona otonom bitir:** araştırma, treatment, anlatım, ses, kod, eleştiri turları, testler, kapaklar, README'ler. Hata çıkarsa kendin çöz; çözemediğin bir şey kalırsa son mesajda sade bir dille belirt.
- **Anlatım sesi `windows-tolga`** (bu bilgisayarda GPU yok).
- **Commit ve push:** Türkçe commit at ve `main`'e pushla. Bu komut onay sayılır. Yalnızca bu animasyona ait dosyaları, kök `README.md`'deki satırı ve `docs/style-ledger.md` ile `pitfalls.md` eklerini commit'e kat.
- **Yayını doğrula:** Push'tan sonra GitHub Pages iş akışı (`.github/workflows/pages.yml`) siteyi kurar. `gh` bu bilgisayarda kurulu değil; bunun yerine `curl -s "https://api.github.com/repos/duranmerve/animasyon-studyo/actions/runs?per_page=1"` ile son çalışmanın `status` ve `conclusion` alanlarını birkaç dakikada bir kontrol et (en çok ~15 dk). `success` olunca `https://duranmerve.github.io/animasyon-studyo/<slug>/` adresinin 200 döndüğünü doğrula. İş akışı başarısız olursa hatanın nedenini bul, düzelt ve yeniden pushla.
- **Son mesaj kısa ve sade olsun:** canlı adres, videonun ne anlattığı (iki-üç cümle), varsa bilinen sorunlar. Teknik terim kullanma.
