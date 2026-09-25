# Maliyet ve süre

Bu animasyon Claude Code (VS Code eklentisi) ile tek oturumda yapıldı.

| | |
|---|---|
| Başlangıç | 25 Eylül 2026, 13:07 |
| Bitiş | 25 Eylül 2026, 13:44 |
| Süre | yaklaşık 37 dakika (araştırma, tasarım, anlatım, ses, kod, ekran görüntüsü turları ve oynatma testi) |
| Model | Claude Opus 5.5 |
| Ödeme | Abonelik (API kredisi kullanılmadı) |

## Kullanım (`/usage` çıktısı, iş bittikten sonra)

```
You are currently using your subscription to power your Claude Code usage

Current session: 12% used · resets Sep 25, 2pm (Europe/Istanbul)
Current week (all models): 40% used · resets Sep 30, 11am (Europe/Istanbul)
Current week (Fable): 0% used · resets Sep 30, 11am (Europe/Istanbul)
```

- Oturum sınırının **%12**'si kullanıldı.
- Haftalık %40 değeri bütün hafta boyunca yapılan işlerin toplamıdır, yalnızca bu animasyonun değil.

## Token ve dolar

Abonelikle çalışırken VS Code eklentisi token sayısını ve dolar karşılığını göstermiyor (`/cost` yerine `/usage` yüzdeleri var). Bu yüzden token ve dolar bilgisi kaydedilemedi; tahmin yazılmadı.

## Yerel işler (ücretsiz)

- Anlatım sesi yerelde OmniVoice ile üretildi (16 kayıt, toplam 6 dk 8 sn), Whisper ile denetlendi. Dış servis kullanılmadı.
