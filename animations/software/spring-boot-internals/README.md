# Spring Boot'un İçi

`SpringApplication.run()` satırının arkasındaki yaklaşık iki saniye ağır çekimde. Solda o an konuşulan kod, sağda aynı anın teknik çizimi. Yazılımcılar için: Spring Boot'u "nasıl kullanılır" diye değil, "içeride ne olur" diye anlatır. Güncel sürüm bilgileri Spring Boot 4.1 / Spring Framework 7'ye göredir.

**İzle:** https://duranmerve.github.io/animasyon-studyo/spring-boot-internals/

## Bölümler

| # | Bölüm | Ne anlatıyor |
|---|---|---|
| 1 | Tek satır, iki saniye | Gerçek hızda akan açılış logları; zaman durur ve bin kat yavaşlar |
| 2 | Spring ve Boot | Boot yeni bir çatı değil: aynı Spring'in üstünde değiştirilebilir varsayılanlar |
| 3 | Konteyner ve bean | ApplicationContext, kontrolün tersine çevrilmesi, BeanDefinition (tarif ≠ nesne) |
| 4 | Bağımlılık enjeksiyonu | Bağımlılık grafiği, aşağıdan yukarı kurulum sırası, `@Autowired` gerekmeyen tek kurucu, döngüsel bağımlılık hatası |
| 5 | Bir bean'in doğumu | Montaj bandı: kurucu → enjeksiyon → BeanPostProcessor → `@PostConstruct` → proxy; singleton kayıt defteri |
| 6 | @SpringBootApplication | Üç notasyona patlatılmış görünüş; component scan'in yalnızca ana paketten aşağı inmesi |
| 7 | Otomatik yapılandırma | `AutoConfiguration.imports`, `@ConditionalOnClass`, `@ConditionalOnProperty`, `@ConditionalOnMissingBean`: senin bean'in kazanır |
| 8 | Starter ve classpath | Starter bir bağımlılık demetidir; classpath değişince koşullar çevrilir; `--debug` raporu |
| 9 | run() ağır çekimde | Environment → uygulama türü → `refresh()` adımları (gömülü Tomcat, singleton'lar) → runner'lar → ApplicationReadyEvent |
| 10 | Bir isteğin yolculuğu | Tomcat iş parçacığı, filtre zinciri, DispatcherServlet, HandlerMapping, argüman çözücü |
| 11 | Servisten veritabanına | `@Transactional` proxy'si, Spring Data'nın ürettiği repository, Hibernate, HikariCP, Jackson |
| 12 | Proxy tuzağı | `this` üzerinden çağrıda (self-invocation) işlem başlamaz; çözüm |
| 13 | Ayar katmanları | Property kaynaklarının önceliği, profiller, gevşek bağlama, `@ConfigurationProperties` |
| 14 | Jar'ın içi ve Actuator | Çalıştırılabilir jar: `BOOT-INF`, `JarLauncher`, iç içe jar'lar; `/actuator/health` |
| 15 | Sihir yok | Özet: konteyner, koşullar, varsayılanlar |

## Teknik

- **Canvas 2D**, kütüphane yok. Kod sayfası da tuvale çizilir (sözdizimi renklendirmesi `src/draw.js`). Sahne durumu zamanın saf fonksiyonudur: `draw(g, t, S)`.
- **Anlatım:** `src/narration.js` tek kaynak. Cümlelerdeki `{işaret}`ler sahne olaylarını söylenen kelimeye bağlar; `PRON` sözlüğü İngilizce terimleri Türkçe okunuşa çevirir (ekrandaki metin değişmez). Ses: OmniVoice O9 (orta yaş, derin erkek sesi), bölüm başına tek kayıt.
- **Zamanlama:** `src/timeline.js` Whisper kelime zamanlarından (manifest → `words`) parçalı doğrusal bir eşleme kurar; işaretler ve altyazı kelimeleri buna göre zamanlanır.
- **Oynatıcı:** `src/main.js`. Saat kayıttır: hikâye zamanı kaydı izler, geri gitmez, kayıt yüklenirken bekler, çalan kayıt ortasında sarılmaz. Altyazı en çok iki satır, kelime kelime açılır; altyazı (C) ve anlatım (N) ayrı ayrı kapatılır, seçim hatırlanır. Efekt sesleri Web Audio ile üretilir (`src/sfx.js`).
- **Video:** `?video=1` → `window.__video` (bkz. kök README).

## Komutlar

```
node tools/lines.mjs [--print]          # narration/lines.json (söylenecek metin) üretir
npm run voice -- spring-boot-internals  # kökte: kayıtlar + Whisper kelime zamanları
node build.mjs                          # dist/
node tools/shots.mjs [--size 390x844] [bölüm@işaret+sn …]   # ekran görüntüleri + temas sayfası
node tools/playtest.mjs [saniye]        # gerçek zamanlı oynatma testi (takılma, sarma, geri gitme, CC/N)
npm run video -- spring-boot-internals  # kökte: YouTube MP4 + SRT + bölümler
npm run thumbnail -- spring-boot-internals
```

Kaynaklar ve doğrulanan sayılar: [RESEARCH.md](RESEARCH.md) · Tasarım kararları: [DESIGN.md](DESIGN.md)
