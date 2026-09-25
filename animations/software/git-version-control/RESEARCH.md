# Araştırma notları

Hedef kitle: lise öğrencileri, üniversitenin ilk yılı ve yazılıma yeni başlayanlar. Bilişim teknolojileri / yazılım derslerinde "sürüm kontrolü" genelde proje çalışmalarında ilk kez karşılaşılan bir konu; bu yüzden komut ayrıntısı değil, kavramların doğru zihinsel modeli hedeflendi.

## Kaynaklar

| Kaynak | Adres | Kullanılan bilgi |
|---|---|---|
| Pro Git (Chacon & Straub), 1.2 "A Short History of Git" | https://git-scm.com/book/en/v2/Getting-Started-A-Short-History-of-Git | 2005; Linux çekirdeği topluluğu ile BitKeeper şirketi arasındaki ilişkinin bozulması ve aracın ücretsiz kullanım hakkının kaldırılması; Linus Torvalds; hedefler (hız, dağıtık yapı, dallanma) |
| Pro Git 1.3 "What is Git?" | https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F | Git farkları değil **anlık görüntüleri** (snapshot) saklar; değişmeyen dosya yeniden saklanmaz, öncekine bağlantı verilir; SHA-1 kırk onaltılık karakter, içerikten hesaplanır; üç durum (modified, staged, committed); işlemlerin çoğu yereldir |
| Pro Git 3.1 "Branches in a Nutshell" | https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell | Dal, bir commit'i gösteren hafif, hareket eden bir işaretçidir; 40 karakter + satır sonu = **41 bayt**lık dosya; HEAD o an bulunulan dalı gösterir; commit nesnesi ebeveyn(ler)ini gösterir: ilk commit'te 0, normalde 1, birleştirmede 2+ |
| Pro Git 3.2 "Basic Branching and Merging" | https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging | Fast-forward: ayrılmış iş yoksa işaretçi ileri kaydırılır; üç yollu birleştirme: iki uç + ortak ata; birleştirme commit'inin birden çok ebeveyni vardır; çakışma işaretleri `<<<<<<< HEAD`, `=======`, `>>>>>>> dal` (üstteki HEAD'deki hâl, alttaki birleştirilen dal); çözümden sonra `git add` ve `git commit` |
| Pro Git 2.5 "Working with Remotes" | https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes | `origin` klonlanan sunucunun varsayılan adıdır; `fetch` yalnızca indirir, birleştirmez; `pull` = fetch + merge; başkası önce gönderdiyse push reddedilir, önce onun işini alıp birleştirmek gerekir |
| Wikipedia, "Git" | https://en.wikipedia.org/wiki/Git | Geliştirme 3 Nisan 2005'te başladı, 6 Nisan'da duyuruldu, 7 Nisan'da Git kendi kaynak kodunu saklamaya başladı (self-hosting) |
| GitHub Blog, "Git turns 20: A Q&A with Linus Torvalds" (2025) | https://github.blog/open-source/git/git-turns-20-a-qa-with-linus-torvalds/ | İlk günlerin anlatımı; ilk commit mesajı "the information manager from hell" (7 Nisan 2005, e83c516) |
| Stack Overflow Developer Survey 2022 ve blog yazısı "Beyond Git" | https://survey.stackoverflow.co/2022/ · https://stackoverflow.blog/2023/01/09/beyond-git-the-other-version-control-systems-developers-use/ | Ankete katılan geliştiricilerin yaklaşık %93'ü Git kullanıyor (70 000'den fazla katılımcı) → anlatımda "yüzde doksandan fazlası" |
| Git 2.23 sürüm notları (GitHub Blog "Highlights from Git 2.23") | https://github.blog/open-source/git/highlights-from-git-2-23/ | `git switch` ve `git restore` 2019'da eklendi; dal değiştirmek için önerilen komut `git switch` |
| Git 2.34 sürüm notları | https://github.blog/open-source/git/highlights-from-git-2-34/ | Varsayılan birleştirme stratejisi `ort` → çıktıda "Merge made by the 'ort' strategy." |

## Yaygın yanlış bilinenler (animasyonda düzeltilenler)

1. **"Git yalnızca farkları saklar."** Kavramsal olarak her commit projenin tamamının anlık görüntüsüdür; değişmeyen dosyalar yeniden kopyalanmaz, aynı nesneye bağlanır. (Not: Git disk tasarrufu için paket dosyalarında ayrıca sıkıştırma ve delta kullanır; bu bir depolama ayrıntısıdır, modeli değiştirmez. Anlatımda "fotoğraf" dili bu yüzden doğrudur.)
2. **"Dal açmak projeyi kopyalar."** Dal 41 baytlık bir dosyadır (`.git/refs/heads/<ad>`), bir commit'in kimliğini tutar.
3. **"Çakışma bir hatadır."** Git, aynı satıra iki farklı değişiklik geldiğinde hangisinin doğru olduğunu bilemez ve kararı insana bırakır.
4. **"Git ile GitHub aynı şey."** Git yerel bir araçtır; GitHub ve benzerleri Git depolarını barındıran hizmetlerdir.
5. **"commit edince iş sunucuya gider."** Commit yereldir; `push` edilene kadar yalnızca kendi bilgisayarındadır.
6. **"pull sadece indirir."** pull = fetch + merge.

## Anlatımdaki ayrıntıların dayanağı

- Commit'te yazar, zaman, mesaj ve ebeveyn bilgisi saklanır (Pro Git 3.1). Hash, commit içeriğinden (ağaç + ebeveyn + yazar + mesaj) hesaplandığı için eski bir commit değişirse sonraki bütün commit'lerin kimliği değişir → "geçmiş fark edilmeden değiştirilemez".
- Kısaltılmış hash: günlük kullanımda ilk 7 karakter (`git log --oneline` varsayılanı yaklaşık 7).
- `git checkout <hash>` eski bir commit'e gider (HEAD doğrudan commit'i gösterir, "detached HEAD"); `git switch main` ile geri dönülür.
- `git switch -c kalkan` dal açıp ona geçer; HEAD artık `ref: refs/heads/kalkan`.
- Çıktı metinleri Git'in gerçek İngilizce çıktılarından kısaltılarak alındı (`Initialized empty Git repository…`, `Fast-forward`, `CONFLICT (content): Merge conflict in oyun.js`, `! [rejected] main -> main (fetch first)`).
- Örnek uzak adres `example.com` (belgeler için ayrılmış alan adı), gerçek bir kurum değil.

## Temkinli ifadeler

- Torvalds'ın "birkaç günde" yazdığı ifadesi, 3 Nisan başlangıç ve 7 Nisan self-hosting tarihlerine dayanır; "on günde yazıldı" gibi yuvarlak bir iddia kullanılmadı.
- Anket oranı "yüzde doksandan fazlası" olarak yuvarlandı.
