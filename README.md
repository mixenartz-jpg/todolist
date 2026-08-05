# Rutin

Kişisel rutin ve görev takip uygulaması. Ana ekran **rutin × gün matrisi**:
rutinler satır, ayın günleri sütun, hücrelere tıklayarak işaretlenir.

## Kurulum

### 1. Supabase projesi oluştur

1. [supabase.com](https://supabase.com) → **New project** (ücretsiz katman yeterli)
2. Proje açılınca **SQL Editor**'e git ve şu üç dosyayı **sırayla** çalıştır:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_triggers.sql`
3. **Project Settings → API** bölümünden şu iki değeri kopyala:
   - Project URL
   - `anon` / `publishable` key

> `service_role` anahtarını **asla** kopyalama. Row Level Security'yi
> tamamen bypass eder ve tek güvenlik katmanı odur.

### 2. Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyala ve doldur:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Çalıştır

```bash
npm install
npm run dev
```

`http://localhost:3000` → giriş ekranı. **Hesap oluştur** ile kaydol,
e-postandaki doğrulama bağlantısına tıkla, sonra giriş yap.

### 4. Vercel'e deploy (telefondan erişim için)

```bash
npx vercel
```

Vercel panelinde aynı iki ortam değişkenini ekle. Deploy sonrası
telefonda siteyi aç → tarayıcı menüsünden **Ana ekrana ekle** — uygulama
gibi çalışır (PWA).

## Rutin tipleri

| Tip | Örnek | Nasıl sayılır |
|---|---|---|
| Her gün | Meditasyon | Her gün zorunlu |
| Belirli günler | Pzt/Çrş/Cum spor | Yalnızca o günler zorunlu |
| Esnek | Haftada 3 kez koşu | Hangi gün olduğu önemsiz, sayı tutar |
| Sayısal hedef | Günde 8 bardak su | Yukarıdakilerle birleşir |

**Tamamlanma kuralı:** `değer >= hedef`. 8 bardak hedefinde 5 bardak
içmek o günü tamamlamaz — matriste yarı dolu hücre olarak görünür ve
günlük skora kısmi katkı yapar, ama seriyi kırar.

**Seri (streak) birimi:** Günlük ve belirli-gün rutinlerinde **gün**;
esnek rutinlerde **hafta/ay** (orada yükümlülük dönem bazlıdır).

## Klavye kısayolları (matris)

| Tuş | İşlev |
|---|---|
| Ok tuşları | Hücreler arası gezin (satır sonunda sarar) |
| `Home` / `End` | Satır başı / sonu |
| `Ctrl+Home` / `Ctrl+End` | İlk / son hücre |
| `Space` / `Enter` | İşaretle (sayısalda bir artır) |
| `0`–`9` | Doğrudan değer gir |
| `+` / `-` | Bir artır / azalt |
| `Backspace` | Kaydı sil |
| `T` | Bugüne atla |

## Geliştirme

```bash
npm run dev        # geliştirme sunucusu
npm test           # saf mantık testleri
npm run typecheck  # tip kontrolü
npm run lint       # ESLint
npm run build      # üretim derlemesi
```

## Mimari notlar

**Tarih kuralı.** Takvim tarihi `DateStr` (`'YYYY-MM-DD'` string) tipidir.
`Date` nesnesi yalnızca `src/lib/date/` içinde kurulur. Türkiye UTC+3
olduğu için `toISOString()` ile tarih çıkarmak gece 00:00–03:00 arası
önceki günü verirdi — kullanıcı 00:30'da işaretler, kayıt düne düşerdi.

**Program geçmişi.** Rutinin programı `routines` tablosunda değil,
zamana bağlı `routine_schedules` tablosunda tutulur. Bir rutin "her
gün"den "Pzt/Çrş/Cum"a çevrildiğinde, program yerinde güncellenseydi
geçmişteki tüm Salılar geriye dönük "zorunlu değildi" olur, yüzdeler
zıplar ve kırılmış seriler kendiliğinden iyileşirdi.

**Tamamlanma türetilir.** `entries` tablosunda `done` sütunu yoktur;
tamamlanma `value >= target`'tan hesaplanır. İki ayrı doğruluk kaynağı
kaçınılmaz olarak birbirinden ayrışır.

**Renkler doğrulanmıştır.** 8 rutin kimlik rengi ve 4 adımlı yoğunluk
rampası renk körlüğü ayrımı, kontrast ve açıklık bandı kontrollerinden
geçirilmiştir. Slot **sırası** güvenlik mekanizmasıdır — değiştirilmemeli.
Bu değerler `globals.css` içinde `@theme` DIŞINDA, gerçek `:root`
bloğunda tanımlıdır: Tailwind v4 `@theme` değişkenlerini bir sınıf
adında geçmiyorlarsa çıktıdan budar, bunlar ise yalnızca inline
`style` içinde kullanılır.

**İstatistikler istemcide.** Bir yılın girdileri (~2.000-4.000 satır)
tek bir `Map`'e sığar; seri hesapları milisaniyeler sürer. Sunucu
tarafı pencere fonksiyonları, matrisin zaten ihtiyaç duyduğu istemci
mantığının ikinci bir kopyası olurdu.

## Durum

**Faz 1 tamamlandı** — matris, rutin yönetimi (CRUD + arşiv), işaretleme
(optimistic), klavye gezinme, auth, PWA.

**Faz 2** — Bugün ekranı, tek seferlik görevler, günlük not/mood, takvim.

**Faz 3** — İstatistik ekranı: seri kartları, yıllık ısı haritası,
tamamlanma yüzdeleri, trend grafikleri. (Hesaplama mantığı `features/stats/`
içinde hazır ve testli; ekran kalıyor.)
