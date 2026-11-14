# Koç / Öğrenci — kurulum ve kontrol listesi

## 1. Migration'ları sırayla çalıştır (Supabase → SQL Editor)

Önce yedek al (Database → Backups). Sonra sırayla:

1. `supabase/migrations/0028_roles_and_results.sql`: roller, görev sonuçları, günlük form, koç notu
2. `supabase/migrations/0029_sources.sql`: kaynaklar (kitaplar)
3. `supabase/migrations/0030_gap_items.sql`: eksik konu havuzu
4. `supabase/migrations/0031_student_denemeler.sql`: koçun öğrenci denemelerini okuması

Her birinin `.down.sql` dosyası geri alma içindir. Geri alırken **ters sırayla** çalıştırılır.
Mevcut hesap otomatik olarak **koç** olur. Mevcut görevler koçta kalır.

> Kod, migration'lardan **önce** de yayınlanabilir. Tablolar yokken uygulama
> eskisi gibi tek kullanıcılı çalışır ("Bağlı öğrenci yok" kartı görünür).

## 2. Öğrenci hesabını aç

1. Supabase → Authentication → **Add user**: kardeşin e-postası ve bir parola.
2. SQL Editor:
   ```sql
   select public.link_student('kardes@ornek.com', 'koc@ornek.com');
   ```
3. Kardeşin giriş yapınca doğrudan `/ogrenci/bugun` ekranına düşer.

İsteğe bağlı: bugüne kadar **koç hesabına** girilmiş denemeler kardeşine aitse:
```sql
select public.move_denemeler_to_student('kardes@ornek.com', 'koc@ornek.com');
```

## 3. Rotalar

| Koç | Öğrenci |
|---|---|
| `/koc/panel`: Panel | `/ogrenci/bugun`: Bugün (görevler, sonuç, günlük form) |
| `/koc/planlama` (+ Hedefler, Özet, **Kaynaklar**) | `/ogrenci/gecmis`: son 30 gün |
| `/koc/ogrenci`: eksik konu havuzu + son 30 gün | `/ogrenci/denemeler` |
| `/koc/arsiv`, `/koc/istatistik` | |

Eski adresler (`/planlama`, `/bugun`…) yeni yerlerine yönlenir.
Koç `/ogrenci/*` adresini **salt okunur önizleme** olarak açar (menüde "Öğrenci gözüyle önizle").

## 4. Uyarı eşikleri

`src/features/alerts/thresholds.ts` dosyasındaki sayıları değiştirmek yeterlidir.

## 5. Elle kontrol listesi (migration sonrası, iki hesapla)

- [ ] Koç girişi → `/koc/panel`; öğrenci girişi → `/ogrenci/bugun`
- [ ] Öğrenci adres çubuğuna `/koc/planlama` yazınca kendi ekranına döner
- [ ] Öğrenci bir görevi işaretleyince koçun Planlama'sında üstü çizili görünür
- [ ] Öğrenci D/Y/B girer → koç kartında "23D 3Y · 22.25 net · …" görünür
- [ ] Öğrenci günlük formu doldurur → koçun gün başlığında "Form ✓" çıkar
- [ ] Koç bir güne not yazar → öğrenci "Koçtan notlar"da görür
- [ ] Öğrenci "eksik konu" yazar → `/koc/ogrenci` havuzunda görünür;
      "Göreve çevir" → görev tamamlanınca konu "Kapandı" olur
- [ ] Öğrenci gelecek günde form/sonuç giremez
