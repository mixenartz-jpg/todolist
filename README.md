# Kero YKS

YKS hazırlığı için kişisel koçluk uygulaması. İki döngüyü birlikte
tutar:

- **Günlük disiplin** — rutin × gün matrisi, günlük görevler, notlar
- **Sınav ölçümü** — deneme kaydı, net takibi, yanlış defteri ve
  aralıklı tekrar

Koçluk döngüsü şöyle kapanır: *deneme gir → net gör → yanlışları
fotoğrafla → tekrar kuyruğuna düşsün.*

## Kurulum

### 1. Supabase projesi oluştur

1. [supabase.com](https://supabase.com) → **New project** (ücretsiz katman yeterli)
2. Proje açılınca **SQL Editor**'e git ve `supabase/migrations/`
   altındaki dosyaları **numara sırasıyla** çalıştır (`0001`'den
   sonuncuya). Sıra önemlidir: sonraki dosyalar öncekilerin tablo ve
   trigger'larına dayanır.
   `0020` bir **storage bucket'ı** oluşturur (`deneme-gorselleri`) —
   yanlış fotoğrafları oraya yüklenir. Bucket **özeldir** ve okuma
   yalnızca imzalı URL ile yapılır; panelde "public" işaretlenmemeli.
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

**Net saklanmaz, türetilir.** `denemeler` tablosunda `net` sütunu
yoktur; net `doğru − yanlış / 4` ile ders satırlarından hesaplanır
(`features/deneme/net.ts`). Saklansaydı `dogru` güncellenip net
güncellenmediğinde yalan söyleyebilen ikinci bir doğruluk kaynağı
olurdu — `entries.done`'un olmamasıyla aynı disiplin. Net **negatif
olabilir** ve sıfıra kırpılmaz: ÖSYM de kırpmıyor, kırpmak kötü giden
iki denemeyi ekranda aynı gösterirdi.

**Yanlış görselleri imzalı URL ile okunur.** Satırda `image_path`
duruyor, URL değil. İmzalı URL bir saat yaşar; satıra yazılsaydı
ertesi gün açılan sayfada kırık görsel olurdu. Yükleme yolu
`<user_id>/<uuid>.webp` ve bu bir **güvenlik sınırıdır** — storage
politikaları ilk segmenti `auth.uid()` ile karşılaştırır.

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

**Görevler taşınır, kaybolmaz.** Tamamlanmamış bir görev tarihi geçince
sessizce kaybolmaz; bugünün listesinde "17 Ağustos tarihinden taşındı"
etiketiyle görünmeye devam eder. Kaybolan görev, uygulamayı güvenilmez
yapar.

**Seri birimi rutin tipine göre değişir.** Günlük ve belirli-gün
rutinlerinde **gün**, esnek rutinlerde **hafta/ay** sayılır. Arayüzde
birim daima yazılır — birimsiz bir "5" kullanıcı tarafından gün sanılır.
İki tolerans: bugün henüz işaretlenmediyse seri kırılmaz (gün bitmedi),
esnek rutinde içinde bulunulan dönem de kırmaz.

**Grafikler renge bağlı değil.** Isı haritası ve trend grafiğinin
tablo görünümü var; her değer metinle de okunabilir. Grafikler tek
seri + seçici etiketleme kullanır: sekiz rutini tek grafiğe koymak
"hangisi arttı" sorusunu gömerdi, bu yüzden rutin karşılaştırması
tablo olarak sunulur.

## Durum

**Faz 1 tamamlandı** — matris, rutin yönetimi (CRUD + arşiv), işaretleme
(optimistic), klavye gezinme, auth, PWA.

**Faz 2 tamamlandı** — Bugün ekranı (büyük dokunma hedefleri, sayısal
stepper), tek seferlik görevler (tarihli + tarihsiz, erteleme,
taşınanlar), günlük not + 5 seviyeli ruh hali (autosave), takvim
(yoğunluk tonlaması, gün detay paneli).

**Faz 3 tamamlandı** — İstatistik ekranı: özet kartları, süren seri
kartları (doğru birimle + son 14 gün şeridi), haftalık trend grafiği,
yıllık ısı haritası (53×7), rutin döküm tablosu. Tarih aralığı filtresi
(30/90 gün, bu yıl, tümü) tüm görünümleri birlikte kapsar.

**Deneme takibi tamamlandı** — `/istatistik/denemeler` altında:

- **Kayıt** — tür seçilince ders satırları kendiliğinden gelir, iki
  sayı girilince üçüncüsü (boş) türetilir, net her tuşta canlı
  hesaplanır. Hedef: bir deneme ~30 saniyede girilsin.
- **Trend** — TYT/AYT/branş/YDT **ayrı çizgiler**. 120 soruluk TYT ile
  40 soruluk branş aynı eksende ortalanırsa branş günü grafikte çöküş
  gibi görünürdü.
- **Yanlış defteri** — Ctrl+V ile ekran görüntüsü yapıştırılır, WebP'ye
  sıkıştırılıp özel bucket'a yüklenir, layout shift olmadan çizilir.
- **Hata sepeti** — beş kova (bilgi/işlem/dikkat/süre/strateji) ve
  baskın kovanın **reçetesi**. Dağılımı göstermek yetmez; ne
  çalışılacağını söylemek gerekir.
- **Tekrar kuyruğu** — 1-3-7-21 gün merdiveni, vadesi gelenler Bugün
  ekranında. Dördüncü tekrardan sonra yanlış mezun olur ve dürtmeyi
  bırakır.
