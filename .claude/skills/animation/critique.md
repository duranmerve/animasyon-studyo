# Sanat yönetmeni turu

Amaç işi beğenmek değil, kusur bulmak. Her tur: görüntü al → kusurları yaz → düzelt → yeniden görüntü al. **En az üç tur; ilki ilk üç bölüm kodlanır kodlanmaz** (geç kalan eleştiri pahalıdır: "treatment'ı değiştirmek bir dakika, filmi değiştirmek bir saat"). Her turda `TREATMENT.md`'deki kahraman kareyle karşılaştır: o kare gerçekten o mu oldu?

## Nasıl bakılır

1. **Temas sayfası:** her bölümden 1–2 anın ekran görüntüsünü al ve bir ızgarada yan yana birleştir. Ayrı ayrı bakınca görünmeyen tekrarlar, boş kareler ve kopukluklar böyle görünür. Masaüstü (1600×900) ve telefon (390×844) için ayrı ayrı yap.
2. **Anın doğru olduğundan emin ol:** görüntüyü bir işaretin biraz sonrasından al (`bolum.isaret+1.5`). Geçiş ortası kareleri de ayrıca kontrol et.
3. **Küçük boyut testi:** kapakları 320×180'e, sahneleri telefon genişliğine küçült. Ana fikir ve başlık hâlâ okunuyor mu?

## Her karede sorulacaklar

- **Odak:** Göz ilk nereye gidiyor? Anlatıcının o an söylediği şeye mi?
- **Okunaklık:** Her yazı ≥ 16 px mi (telefonda ≥ 12 px)? Kontrast yeterli mi? Yazıyı bir çizgi ya da görsel kesiyor mu?
- **Çakışma:** İki öğe üst üste biniyor mu? Bir öğe kadrajdan ya da panelden taşıyor mu? Kart anlatılan öğenin üstüne düşmüş mü?
- **Boşluk:** Kare boş ya da sıkıcı mı? Ekranın yarısı hiçbir şey anlatmadan duruyor mu?
- **Kalabalık:** İşi bitmiş öğeler ekranda mı kaldı? Etiketler aynı anda fazla mı?
- **Doğruluk:** Ekrandaki sayı, terim ve komut anlatımla ve `RESEARCH.md` ile aynı mı?
- **Ucuzluk:** Düz kutu, jenerik ikon, varsayılan gölge, rastgele renk var mı? Işık yönü, doku ya da derinlik eklenebilir mi?
- **Süreklilik:** Bölümden bölüme geçişte kamera ve öğeler sıçrıyor mu, yoksa akıyor mu?
- **Özgünlük:** Bu kare depodaki başka bir animasyona benziyor mu? Benziyorsa farklılaştır.

## Kapak için ek sorular

- Başlık en çok 3–4 kelime mi? Küçük boyutta okunuyor mu?
- Ana görsel sağda mı, başlığın altına giriyor mu?
- Beş konsept birbirinden gerçekten farklı mı? Hepsi aynı kanal kimliğini taşıyor mu (`assets/thumbnail-kit`)?
- Görsel "yapay zekâyla üretilmiş gibi" zengin mi (ışık, derinlik, doku), yoksa düz bir çizim gibi mi duruyor?

## "Slop" ret listesi (her turda; kaynak claude-studio-toolkit, MIT)

Şunlardan biri varsa kare geçmez: varsayılan geometri/malzeme (ayarlanmamış küre, MeshStandard gri), boş yörünge dönüşü, "yalnızca bloom" parlaklığı, her yerde aynı vurgu rengi, ortalanmış tek nesne + düz zemin, "herhangi bir sitede olabilir" hissi, fade ile gelen metin, sabit kamera + sabit ışık. Zorunlu liste: konudan çıkan görsel dil, ışık yönü, en az üç derinlik katmanı, ikincil hareket, bir "kahraman kare".

## Eleştirmen ajan kalıbı

Temas sayfasını inceleyen ajanın (ya da kendi ikinci geçişinin) kuralları: varsayılan karar **"DÜZELTME GEREK"**; "geçer" yalnızca kanıtla; görülemeyen şey için ayrı "GÖRSEL DOĞRULAMA GEREK" etiketi; her bulgu `dosya:satır` ile; **hayali geçer yok** (ekran görüntüsü olmadan hiçbir sahne onaylanmaz). Bulgular treatment'taki kahraman kareyle karşılaştırılır.

## Öğretici mimari (3b1b kuralları, MIT)

- Yanlış sezgi **önce ve ayrı renkte** gösterilir, sonra düzeltilir; düzeltmede yanlış olan sönükleşir (DIM ≈ 0,1), silinmez.
- Her 3 sahnede bir soru karesi; bilgi yoğunluğu rampa gibi artar, tek sıçrama yok.
- Yan öğeler sönükleşir, altta kalanlar solar; ekranda aynı anda tek yeni fikir.

## Canlı ve yerleşim turu (her turda)

- Canlıyı 1:1 kırp: bacaklar eklemli mi, ayaklar yüzeye değiyor mu, altında gölge var mı, uçuşta uzuvlar katlı mı, baş okunuyor mu? (`craft.md` → 14)
- Etiketler ve yazılar birbirine giriyor mu? Yerleşim kaydı (`claim/placeFree`, `craft.md` → 12) çalışıyor mu; altyazı bandına giren var mı? Telefon karesinde en küçük yazı ≥ 12 px mi?
- Geniş planda odak var mı, ön plan katmanı var mı, ufkun altı boş mu? (`craft.md` → 15)

## Akıcılık ve "ucuz" görünme turu

- `dev/fpstest.mjs` her kademede: fps ve 50 ms üstü kare sayısı. Zayıf makine için `tier=min` de akıcı mı?
- Bölüm geçişlerinde ve atlamalarda takılma var mı (`dev/endtest.mjs fast`)?
- Easing lineer mi? Her şey aynı anda mı giriyor? Durunca her şey aynı anda mı duruyor? Karakter statik mi? Metin fade ile mi geliyor? Vurguda ses var mı? (`docs/cartoon-style-in-code.md` → 7)
- Metin yapay zekâ kokuyor mu: "Gelin birlikte…", "önemli bir rol oynar", üçlü sıfat listeleri, her cümlede bir benzetme? Sesli oku.

## Tur sonunda

Bulunan ve bir sonraki oturumda da çıkabilecek hataları `pitfalls.md` dosyasına ekle.
