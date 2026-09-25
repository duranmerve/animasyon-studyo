# Araştırma notları: Spring Boot'un İçi

Hedef kitle: Java bilen, Spring Boot kullanan ya da kullanmaya başlayan yazılımcılar. Amaç "nasıl kullanılır" değil, "içeride ne olur": konteyner, otomatik yapılandırma, açılış sırası, istek yolculuğu. Sürüm bilgileri Eylül 2026 itibarıyla (Spring Boot 4.1, Spring Framework 7).

## Kaynaklar

| Kaynak | Adres | Verdiği bilgi |
|---|---|---|
| Spring Boot Reference: Creating Your Own Auto-configuration | https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html | Adaylar `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` dosyasında, satır başına bir sınıf. Koşul notasyonları (`@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`, `@ConditionalOnWebApplication` …). Otomatik yapılandırmalar kullanıcı tanımlarından **sonra** yüklenir, bu yüzden `@ConditionalOnMissingBean` kullanıcının bean'i varken geri çekilir. |
| Spring Boot Reference: Auto-configuration | https://docs.spring.io/spring-boot/reference/using/auto-configuration.html | Otomatik yapılandırma "non-invasive": kendi bean'ini tanımlayınca varsayılan geri çekilir; `--debug` ile koşul değerlendirme raporu. |
| Spring Boot Reference: Externalized Configuration | https://docs.spring.io/spring-boot/reference/features/external-config.html | Öncelik sırası (düşükten yükseğe): varsayılanlar → `@PropertySource` → config data (application.properties) → random → **OS ortam değişkenleri** → Java sistem özellikleri → … → **komut satırı argümanları** → test özellikleri. Config dosyaları: jar içi → jar içi profil → jar dışı → jar dışı profil. Gevşek bağlama (relaxed binding): `SPRING_CONFIG_NAME` ↔ `spring.config.name`. `@ConfigurationProperties`. |
| Spring Boot Reference: The Executable Jar Format | https://docs.spring.io/spring-boot/specification/executable-jar/index.html | `BOOT-INF/classes`, `BOOT-INF/lib`, `classpath.idx`, `org/springframework/boot/loader/…`; `MANIFEST.MF` → `Main-Class: …JarLauncher`, `Start-Class: <uygulama sınıfı>`. (Boot 3.2'den beri paket `org.springframework.boot.loader.launch`; ekranda yalnızca `JarLauncher` yazıyor.) |
| Spring blog: Spring Boot 4.0.0 available now (20 Kasım 2025) | https://spring.io/blog/2025/11/20/spring-boot-4-0-0-available-now/ | Boot 4, Spring Framework 7 üzerinde; kod tabanı modüllere bölündü. |
| Spring blog: Modularizing Spring Boot | https://spring.io/blog/2025/10/28/modularizing-spring-boot/ | Tek `spring-boot-autoconfigure` jar'ı 70'ten fazla modüle bölündü; her modülün kendi `AutoConfiguration.imports` dosyası var. |
| Spring Boot 4.0 Migration Guide | https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide | `spring-boot-starter-web` → `spring-boot-starter-webmvc` (eskisi hâlâ var ama kullanımdan kalkıyor). Jackson 3 varsayılan. Java 17 en düşük sürüm. |
| Baeldung: Spring Boot 4 & Spring Framework 7 | https://www.baeldung.com/spring-boot-4-spring-framework-7 | Jackson 3, Java 17 tabanı; ikinci doğrulama. |
| HikariCP README | https://github.com/brettwooldridge/hikaricp | `maximumPoolSize` varsayılanı 10. Spring Boot'ta varsayılan havuz HikariCP. |
| Spring Boot common properties + Baeldung "Configuring Thread Pools for Java Web Servers" | https://docs.spring.io/spring-boot/appendix/application-properties/index.html · https://www.baeldung.com/java-web-thread-pool-config | `server.tomcat.threads.max` = 200, `min-spare` = 10. `server.port` = 8080. |
| Spring Framework Reference: Bean lifecycle, BeanPostProcessor | https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html · https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html | Sıra: örnekleme → bağımlılıkların doldurulması → Aware arayüzleri → `postProcessBeforeInitialization` → `@PostConstruct` / `afterPropertiesSet` → `postProcessAfterInitialization`. AOP otomatik proxy'si BeanPostProcessor olarak çalışır ve **after** aşamasında sarmalayıcıyı döndürür. Varsayılan kapsam singleton. |
| Spring Framework Reference: Understanding AOP Proxies / Declarative transactions | https://docs.spring.io/spring-framework/reference/core/aop/proxying.html · https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html | Proxy modunda yalnızca dışarıdan proxy üzerinden gelen çağrılar yakalanır; `this` üzerinden aynı sınıf içi çağrı (self-invocation) `@Transactional`'ı devreye sokmaz. Boot, varsayılan olarak sınıf tabanlı (CGLIB) proxy kullanır. |
| Spring Framework Reference: DispatcherServlet | https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html | Ön kontrolcü (front controller); `HandlerMapping` → `HandlerAdapter`; argüman çözücüler; `HttpMessageConverter` ile gövde ↔ JSON. `@ControllerAdvice` ile hata işleme. |
| Spring Boot Reference: SpringApplication, Application events | https://docs.spring.io/spring-boot/reference/features/spring-application.html | Olay sırası: `ApplicationStartingEvent` → `ApplicationEnvironmentPreparedEvent` → `ApplicationContextInitializedEvent` → `ApplicationPreparedEvent` → refresh → `ApplicationStartedEvent` → runner'lar → `ApplicationReadyEvent`. Uygulama türü (servlet / reactive / none) classpath'ten belirlenir. `--debug`. |
| Spring Boot 2.6 Release Notes | https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.6-Release-Notes | Döngüsel bağımlılıklar varsayılan olarak yasak (`spring.main.allow-circular-references=false`). |
| Spring Framework Reference: Dependency injection | https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html | Tek kurucu metodu olan sınıfta `@Autowired` gerekmez (Spring 4.3'ten beri). Constructor injection önerilir. |
| Spring Data JPA Reference: Query methods | https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html | Repository yalnızca arayüzdür; gerçekleştirmesi çalışma anında proxy olarak üretilir (arkada `SimpleJpaRepository`); metot adından sorgu türetilir. |

## Doğrulanan sayılar

- `server.port` 8080 · Tomcat en çok 200 iş parçacığı · Hikari havuzu en çok 10 bağlantı.
- Spring Framework 1.0: Mart 2004. Spring Boot 1.0: Nisan 2014. Boot 4.0: Kasım 2025; güncel 4.1.
- Otomatik yapılandırma aday sayısı: Boot 3'te tek dosyada ~150 civarı; Boot 4'te modüllere dağıldı. Anlatımda "yüzlerce" değil "yüzden fazla" diye temkinli söylendi.
- Açılış süresi (~2 sn) örnektir; donanıma ve uygulamaya göre değişir. Ekrandaki log satırları temsilîdir.

## Yaygın yanlış bilinenler (animasyonda düzeltilenler)

1. **"Spring Boot ayrı bir çatı / sihir."** Aslında altta aynı Spring konteyneri çalışır; Boot yalnızca koşullu varsayılanlar ekler. Her varsayılan ezilebilir, `--debug` raporu kararların gerekçesini gösterir.
2. **"@Transactional yazınca her yerde çalışır."** Proxy üzerinden gelmeyen (self-invocation) çağrıda çalışmaz.
3. **"Ana sınıfın yeri önemsiz."** Tarama ana sınıfın paketinden aşağı iner; dışarıdaki bileşen bulunmaz.
4. **"Repository sınıfını ben yazdım."** Yalnızca arayüzü yazdın; sınıfı Spring Data çalışma anında üretir.
5. **"Starter bir kütüphanedir."** Starter neredeyse boş bir bağımlılık demetidir; asıl etkisi classpath'i değiştirip koşulları çevirmesidir.
