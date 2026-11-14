# APPLY — Kaynak tabanlı planlama migration'ları (0032+)

0028–0031 için bkz. [KOC-OGRENCI-KURULUM.md](./KOC-OGRENCI-KURULUM.md).

## 1. Önce yedek

Supabase → Database → Backups. Ayrıca SQL Editor'den CSV olarak dışa al:

- `tasks`
- `task_results`
- `sources`

## 2. Çalıştırma sırası (Supabase → SQL Editor)

| # | Dosya | Ne yapar |
|---|---|---|
| 1 | `0032_student_readonly_tasks.sql` | Öğrencinin `tasks` yazma politikaları kalkar (yalnızca SELECT). |
| 2 | `0033_task_results_done_on.sql` | `task_results.done_on`: görevin gerçekten yapıldığı gün (İstanbul saati, trigger). |
| 3 | `0034_source_tree.sql` | Kaynak ağacı: `sources` genişler; `topics`, `source_series`, `source_sections`, `source_items`, `task_items`, `task_actions`; `tasks` ve `task_results`'a yeni sütunlar. Mevcut her kaynağa "Konu Testleri / Tümü" bölümü ve testleri açılır; 0029'da elle bağlanmış görevler bağını korur. |
| 4 | `0035_topics_seed.sql` | Ortak konu listesi (TYT/AYT Mat, Geo, Fiz, Kim, Biy; LGS Mat, Fen). Düzenleyip yeniden çalıştırılabilir. |
| 5 | `0036_source_marks.sql` | Elle işaretler: `source_item_marks` (test), `source_range_marks` (soru/sayfa/ders). |

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
- [ ] Kaynaklar → mevcut kitap "Konu Testleri / Tümü" bölümüyle görünüyor; Düzenle → içindekileri
      yaz (ör. `Üslü Sayılar | 1-74`, `Köklü Sayılar | 8 test`), önizlemede konular eşleşiyor,
      eşleşmeyen "yeni konu · ekle" ile eklenebiliyor
- [ ] Bölüm sınırı değiştirilip kaydedilince bağlı görevler kopmuyor (kutucuk rengi aynı kalıyor);
      bağlı bir bölüm silinecekse form uyarıyor
- [ ] Kaynak detayında kutucuk seç (tık, shift+tık) → "Çözüldü": kutucuk yeşil + ✎ ikonu; yüzde artıyor
- [ ] Sağ tık / uzun basma ile tek kutucuk menüsü açılıyor
- [ ] Sayfa birimli kaynakta "1-52" yaz → Çözüldü: çubukta 1-52 yeşil
- [ ] Katalogda kutucuk seç → "Güne ekle" → gün + eylem: görev "BilgiSarmal … | 39 - 42. Testler | Çöz"
      başlığıyla oluşuyor ve **kutucuklar sarıya dönüyor**
- [ ] Planlama → "Katalog" yan paneli açılıyor; günün altındaki "Kaynaktan ekle" paneli o gün seçili
      açıyor, sıradaki boş testler önceden seçili; masaüstünde kutucuğu güne sürükleyince görev oluşuyor
- [ ] Panel ve sayfa sayfası: "Kesin aralık" sıradaki aralıkla dolu, miktar değişince bitiş güncelleniyor;
      "İlerlet" ~10 sayfa ile görev oluşuyor
- [ ] **Kaynaktan eklenen görev öğrencide tamamlanınca ilerleme artıyor** (kutucuk yeşil, yüzde artar)
- [ ] Öğrenci: İzle + Feynman görevinde anlama + Feynman notu; İlerlet görevinde bitiş noktası zorunlu;
      çok testli görev "Yarım kaldı" → testleri işaretleyince yalnızca işaretlenenler yeşil, kalanı kırmızı
- [ ] Koç: İlerlet görevinde "Hedef ~10 sayfa → 8 sayfa ilerledi (126-133)"
- [ ] Görev silinince kutucuk eski rengine dönüyor
