# Tür kartı: tarih (görsel tasarım uzayı)

Bu kart bir tarif değil, sınırdır: içinden bir nokta seçilir ve `TREATMENT.md`'de gerekçelenir. Anlatım sesi `narration/formats/history.md`.

## Türün değişmezleri

- Yer ve zaman her sahnede belli: harita, tarih etiketi ya da dönem nesnesi.
- İnsanlar ve kararlar ekranda: kalabalık yerine bir kişi, bir mektup, bir emir; sonra sonucun geniş planı.
- Harita üzerinde hareket anlatımdaki tarihle birlikte ilerler; belge ve kaynak görünür (alıntı kaynağıyla).
- Dönemin görsel dokusu konuya göre; okunaklılık önce gelir. Tartışmalı konularda tek tarafın görseli "gerçek" gibi sunulmaz.

## Tasarım uzayı

| Eksen | Seçenekler |
|---|---|
| Teknik ailesi | Canvas 2D boyanmış (tohumlu fırça darbeleri + kâğıt) · SVG harita + `getPointAtLength` rota · kâğıt kesme paralaks katmanlar (3–5 derinlik, tek yönlü gölge) · 3B arazi + ressam post (Kuwahara) · gravür/mürekkep shader |
| Görsel dil | minyatür · gravür · parşömen harita · arşiv fotoğrafı (sepya, gren, çizik) · propaganda afişi/ahşap baskı · kâğıt tiyatrosu (cut-out) |
| Palet ailesi | parşömen + mürekkep + tek kırmızı · sepya/gümüş · minyatür (lapis, altın, kırmızı) · gece + meşale · kar/gri + kan kırmızısı |
| Kamera | harita üstünde uçuş · sabit "sahne" (tiyatro) · belge yakın planı → geniş plan · paralaks yatay kaydırma |
| Yapı | kronoloji + gerilim · bir kişinin gözünden · bir kararın sonuçları · iki cephe paralel |

Referanslar: ressam post-process'li 3B muharebe filmleri (Kuwahara + tuval dokusu + gerçek arazi), 16 sahnelik "boyanmış" Canvas videosu, kâğıt harita + `feTurbulence` kenar aşınması; `docs/opus-code-animation-survey.md` → 5. Depoda önceki tarih animasyonu (minyatür harita, 1453) `style-ledger.md`'de: **tekrar etme**.

## Bu türde "ucuz" görünen şeyler

Modern düz vektör harita, ok-ok-ok ordu hareketi, zoom yapılan tek resim, dönem hissi olmayan yazı tipi, "ve sonra" listesi.
