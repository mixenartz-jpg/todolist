# APPLY — Kaynak tabanlı planlama migration'ları (0032+)

0028–0031 için bkz. [KOC-OGRENCI-KURULUM.md](./KOC-OGRENCI-KURULUM.md).

## 1. Önce yedek

Supabase → Database → Backups. Ayrıca SQL Editor'den CSV olarak dışa al:

- `tasks`
- `task_results`

## 2. Çalıştırma sırası (Supabase → SQL Editor)

| # | Dosya | Ne yapar |
|---|---|---|
| 1 | `0032_student_readonly_tasks.sql` | Öğrencinin `tasks` yazma politikaları kalkar (yalnızca SELECT). |
| 2 | `0033_task_results_done_on.sql` | `task_results.done_on`: görevin gerçekten yapıldığı gün (İstanbul saati, trigger). |

Hepsi yalnızca ekleme/kısıtlama yapar; satır silmez. Geri almak için `.down.sql`
dosyalarını **ters sırayla** çalıştır.

> Kod migration'lardan önce yayınlanırsa: `done_on` sütunu yokken "erken yapıldı"
> rozeti çıkmaz, Panel'deki "bugün erken yapıldı" satırı hata verir. Önce migration.

## 3. Kontrol listesi (iki hesapla)

- [ ] Öğrenci görev ekleyemiyor: Bugün ekranında "Ek çalışma" yok; SQL ile
      denense bile `new row violates row-level security policy` döner
- [ ] Öğrenci gelecek günün görevini işaretleyebiliyor (yarının çipine bas → tamamla)
- [ ] Koç Planlama/Gün görünümünde o görevde "erken yapıldı (14 Kas)" rozetini görüyor
- [ ] Panel → Bugün: görevler ✓ ◐ ✗ ○ ikonlarıyla, sonuç girilenlerde tek satır özet;
      erken yapılan görev altta ayrı satırda
- [ ] Günlük yüzde planlanan güne göre: yarının görevi bugün yapılınca bugünün yüzdesi değişmiyor
