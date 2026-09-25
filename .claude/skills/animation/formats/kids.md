# Tür kartı: çocuklar için (8–12 yaş; görsel tasarım uzayı)

Bu kart bir tarif değil, sınırdır: içinden bir nokta seçilir ve `TREATMENT.md`'de gerekçelenir. Anlatım sesi `narration/formats/kids.md`.

## Türün değişmezleri

- Tek odak: ekranda aynı anda tek yeni şey. Yeni kelime ekranda büyük ve kısa, üç kez tekrar.
- Bir karakter ya da kahraman (hayvan, damla, robot) izleyiciyle konuşuyormuş gibi kameraya döner; bilimsel olarak yanlış davranmaz.
- Soru anında ekran 2–3 sn bekler. Yazılar büyük (masaüstünde ≥ 22 px), hareket yumuşak, ani ses ve parlama yok.
- Squash & stretch ve vuruşa kilitli hareket serbest; her çekimde tek eylem, büyük siluet.

## Tasarım uzayı

| Eksen | Seçenekler |
|---|---|
| Teknik ailesi | Canvas 2D düz vektör (`draw(ctx,t)`) · SVG kukla karakter (gruplu rig, IK, göz kırpma/nefes idle) · resimli kitap sulu boya (tohumlu fırça + kâğıt) · toon 3B oyuncak dünyası (MeshToon, yumuşak gölge) · kesme kâğıt |
| Görsel dil | kalın renk düz vektör · sulu boya resimli kitap · oyuncak/kil dünyası · tahta üstü tebeşir · pelüş/keçe dokusu |
| Palet ailesi | doygun ana renkler + beyaz · pastel şeker · orman yeşili + sıcak sarı · gece + parıltılı yıldız |
| Kamera | sabit sahne, karakter oynar · yavaş yatay kaydırma (yolculuk) · büyüteç zoom (küçük dünya) |
| Yapı | soru → tahmin → deneme → keşif → nakarat · bir günlük macera · üç deneme bir başarı |

Referanslar: sevimli/canlı vuruşa kilitli Canvas filmleri ("her çekimde bir şey olsun, büyük siluet, tek odak eylemi"), `docs/cartoon-style-in-code.md` (karakter rig, viseme, easing), `docs/opus-code-animation-survey.md` → 5.

## Bu türde "ucuz" görünen şeyler

Statik karakter, kötü lip-sync (ağız yoksa daha iyi), aynı anda çok öğe, küçük yazı, hızlı kesme, yetişkin belgeseli tonu.
