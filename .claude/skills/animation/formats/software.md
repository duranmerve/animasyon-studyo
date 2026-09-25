# Tür kartı: yazılım ve sistem içi (görsel tasarım uzayı)

Bu kart bir tarif değil, sınırdır: içinden bir nokta seçilir ve `TREATMENT.md`'de gerekçelenir. Anlatım sesi `narration/formats/software.md`.

## Türün değişmezleri

- Somut senaryo ekranda: bir kullanıcı, bir istek, bir hata. Soyut kutulardan önce gerçek bir örnek.
- **Durum değişimi görünür:** bir değişken, bir satır, bir paket; her adımda neyin değiştiği vurgulanır, gerisi sabit.
- Aynı anda en çok üç bileşen aktif; ötekiler sönük. Kod parçası ≤ 6 satır, ≤ 40 karakter, okunacak kadar kalır; anlatıcı kodu okumaz.
- Akış yönü tutarlı (soldan sağa ya da yukarıdan aşağı). Ölçek atlaması (sistem → bayt) güçlü bir andır.

## Tasarım uzayı

| Eksen | Seçenekler |
|---|---|
| Teknik ailesi | SVG + GSAP (düğüm-kenar, `stroke-dashoffset` paket yolculuğu) · Canvas 2D `draw(ctx,t)` · izometrik SVG/Canvas (`x'=(x−y)cos30°, y'=(x+y)sin30°−z`) · toon 3B kesit (donanım içi) · "terminal sineması" (yazı makinesi, monospace) |
| Görsel dil | siyah tuval + beyaz çizgi + tek vurgu (teknik çizim) · izometrik şehir/fabrika benzetmesi · metro/şebeke haritası · kağıt üstü el çizimi diyagram · devre kartı/röntgen · 8-bit/piksel (retro bilgisayar) |
| Palet ailesi | siyah + beyaz + tek neon · koyu lacivert + turuncu vurgu · krem + mürekkep + kırmızı vurgu · terminal yeşili/amber |
| Kamera | sabit tahta, öğeler gelir · izometrik yavaş kaydırma · sürekli zoom-through (istekten transistöre) · yan kesit |
| Yapı | senaryo → saf fikir → çöküş → gerçek mekanizma → ödünleşim · bir isteğin yolculuğu · iki sistemin yarışı · zaman ekseninde bir hata |

Referanslar: el çizimi Canvas "tarayıcı nasıl çalışır" tarzı açıklayıcılar; siyah zemin çizgi sanat RAG filmi; izometrik paket akışı; `docs/opus-code-animation-survey.md` → 5. Depoda önceki yazılım animasyonları (metro haritası, konteyner kesiti) `style-ledger.md`'de: **tekrar etme**.

## Bu türde "ucuz" görünen şeyler

Kutu-ok şeması, her şeyin aynı anda parlaması, kodun ekranda okunmaya çalışılması, jargon duvarı, sabit kamera + fade metin, yerleşik "teknoloji" yazı tipi.
