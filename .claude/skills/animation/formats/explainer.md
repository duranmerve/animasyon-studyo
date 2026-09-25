# Tür kartı: açıklayıcı (bilim, biyoloji, fizik, teknoloji; görsel tasarım uzayı)

Bu kart bir tarif değil, sınırdır: içinden bir nokta seçilir ve `TREATMENT.md`'de gerekçelenir. Anlatım sesi `narration/formats/explainer.md`.

## Türün değişmezleri

- Soru ekranda başlar; her yeni fikir ekrana tek parça girer, öncekiler yerinde kalıp sönükleşir.
- Tek ana benzetme bütün video boyunca aynı görselle geri döner; bozulduğu yer de gösterilir.
- Yanlış model önce çizilir, üstü çizilir, doğrusu kurulur. "Aha" anı sade ve sessiz: tek öğe, duraklama.
- Her hareket bir değişkeni ya da nedeni gösterir; süs için hareket yok. Ölçek karşılaştırması en az bir kez (insan silueti, madeni para, Dünya).

## Tasarım uzayı

| Eksen | Seçenekler |
|---|---|
| Teknik ailesi | Canvas 2D vektör (`draw(ctx,t)`) · SVG + GSAP (keskin çizgi, morph) · toon 3B (Three/Babylon, kesit ve patlatılmış görünüm) · parçacık/alan benzetimi (deterministik) · WebGL akışkan/ısı (ping-pong) |
| Görsel dil | düz vektör + yumuşak gradyan + gren (Kurzgesagt uzayı) · siyah zemin + beyaz çizgi + tek vurgu (bilimsel çizim) · kesit/anatomi atlası · "laboratuvar defteri" (kâğıt, el çizgisi) · nesnelerin içi (röntgen, saydam katman) |
| Palet ailesi | gece laciverti + mavi/sarı vurgu · krem kâğıt + mürekkep · pastel düz renkler · tek renk + neon vurgu · organik (biyoloji: kırmızı/pembe/mor dokular) |
| Kamera | sabit sahne, öğeler gelir · sürekli zoom-through (ölçek yolculuğu) · yandan kesit kamerası · izometrik |
| Yapı | soru → yanlış → doğru → uygulama · ölçek merdiveni · tek deneyin tekrarları · karşılaştırmalı iki dünya |

Referanslar: vektör alanı çizgileri (RK4 streamline), deterministik parçacıklar, kesit ve patlatılmış görünüm, MatCap/toon 3B; `docs/cartoon-style-in-code.md` (stil kuralları), `docs/opus-code-animation-survey.md` → 5 (fizik, doğa). Biyoloji açıklayıcıları belgesel değildir: kahraman bir hücre/organ olabilir, ama dil öğreticidir.

## Bu türde "ucuz" görünen şeyler

Slayt gibi fade ile gelen metin, boş düz zemin, eşzamanlı girişler, lineer easing, her sahnede aynı ortalanmış kompozisyon, benzetmenin sınırının söylenmemesi.
