# Odak modu: süre kaydı + pomodoro

**Tarih:** 2026-09-22
**Durum:** Onaylandı, uygulamaya hazır
**Kapsam:** `src/features/zen/`, yeni migration `0021`, İstatistik'e dokunulmaz

---

## 1. Amaç

Odak (Zen) ekranı bugün bir sayaç gösteriyor ama hiçbir şey kaydetmiyor ve
yalnızca yukarı sayıyor. İki ekleme yapılıyor:

1. **Geçirilen süre kaydediliyor** — her odak turu `focus_sessions` tablosuna
   bir satır olarak yazılıyor.
2. **Pomodoro modu** — serbest sayacın yanına, seçilebilir ikinci bir mod.

**Sistem aynı kalıyor, yalnızca ekleme yapılıyor.** Mevcut serbest sayaç
varsayılan davranış olarak korunuyor; Zen'in katman (rota değil) olması,
Esc ile çıkış, arka sayfanın kilitlenmesi, damga tabanlı sayaç — hepsi
değişmeden duruyor.

---

## 2. Neden mevcut kararı geri alıyoruz

`src/features/zen/zen.ts` bugün iki kararı gerekçelendiriyor:

> **Sayaç neden YUKARI sayıyor?** Geri sayan bir sayaç hedef süre ister ve o
> hedefi tutturamamak bir başarısızlık üretir.
>
> **Süre neden KAYDEDİLMİYOR?** Sayaç yalnızca Zen'in AÇIK olduğu süreyi
> ölçüyor — kullanıcı ekranı açık bırakıp kahve içmiş olabilir. Ölçmediğimiz
> bir şeyi kaydetmek, veriyi yalancı yapar.

Bu gerekçeler **iptal edilmiyor, koşulları değişiyor:**

| Eski gerekçe | Ne değişti |
|---|---|
| Hedef süre başarısızlık üretir | Pomodoro **opsiyonel** bir mod. Serbest mod varsayılan kalıyor; hedefi isteyen seçiyor. |
| Ölçtüğümüz şey çalışma süresi değil | **Duraklatma + sekme koruması** eklendi. Ölçülen şey artık gerçekten çalışılan süreye yaklaşıyor, kayıt yalan olmuyor. |

`zen.ts` başındaki yorum bloğu bu iki maddeyi yansıtacak şekilde **yeniden
yazılacak** — projenin gerekçeli yorum sicili, geri alınan bir kararın
sessizce silinmesini değil, neden değiştiğinin yazılmasını gerektiriyor.

---

## 3. Katman ayrımı

`ZenScreen.tsx` şu an 127 satır. Bu eklemelerle tek dosyada ~250 satırı
aşardı; mod seçici ve faz göstergesi ayrı bileşenlere çıkıyor.

| Katman | Dosya | Sorumluluk |
|---|---|---|
| Saf mantık | `zen.ts` | süre biçimleme, net süre hesabı, faz geçişi, tur sayımı — hepsi saf, `Date.now()` çağrısı yok |
| Zaman makinesi | `useFocusTimer.ts` | damga tabanlı tik, duraklat/sürdür, sekme koruması |
| Kalıcılık | `sessions.ts` | `focus_sessions` okuma/yazma, react-query |
| Ekran | `ZenScreen.tsx` | çizim, akış |
| Alt bileşen | `FocusModeToggle.tsx` | serbest/pomodoro + süre profili seçimi |
| Alt bileşen | `PomodoroDots.tsx` | tur göstergesi |

`useZenTimer.ts` → `useFocusTimer.ts` olarak genişliyor (duraklatma durumu
eklendiği için isim artık "timer"dan fazlasını anlatıyor).

Saf mantık / hook ayrımı mevcut desenin aynısı: `now` hep parametre olarak
geçiyor, saat okuyan fonksiyon test edilemez.

---

## 4. Veri modeli — `supabase/migrations/0021_focus_sessions.sql`

```sql
create table public.focus_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete set null,
  task_title  text not null,
  mode        text not null check (mode in ('free','pomodoro')),
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  net_seconds integer not null check (net_seconds >= 0),
  created_at  timestamptz not null default now()
);

create index focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);
```

Yanında RLS politikaları (`0002` deseninin aynısı: select/insert/update/delete,
hepsi `user_id = auth.uid()`).

### 4.1 `task_id` ON DELETE SET NULL + `task_title` kopyası

Görev silinince odak geçmişi silinmemeli. "Bu hafta 12 saat odaklandım"
bilgisi, görevin hâlâ var olmasına bağlı olamaz.

Başlık satıra **kopyalanıyor** ki silinmiş görevin kaydı "(bilinmeyen iş)"
diye okunmasın. Bu, `completed_at`'in `done`'dan ayrı tutulması kararıyla
aynı ruhta: **durum ve tarih ayrı yaşar.**

`task_title` denormalize bir alan ve görev sonradan yeniden adlandırılırsa
eski kayıtta eski ad kalır. Bu **kasıtlı**: oturum, o an neye odaklandığının
kaydı. Sonradan adı değişen bir görevin geçmiş kayıtlarını değiştirmek,
geçmişi yeniden yazmak olurdu.

### 4.2 `net_seconds` türetilmiyor, yazılıyor

`ended_at - started_at` duraklamaları içerir ve tam da kaçındığımız yalanı
üretir. Net süre istemcide, duraklamalar düşülerek hesaplanıp yazılıyor.

### 4.3 Mola satırı YOK

Tablo yalnızca odak turlarını tutuyor. `mode` sütunu `'break'` değeri
almıyor. "Bugün ne kadar çalıştım" sorusu bu tabloda tek anlamlı kalıyor.

Sonradan gerekirse `check` kısıtı genişletilir — ama bugün ihtiyaç yok
(YAGNI).

### 4.4 Kaç satır üretilir

Her **odak turu bittiğinde** bir satır:

- Serbest modda: Bitti / Çık / sekme kapanışı → bir satır.
- Pomodoro'da: her tur sonu → bir satır. 4 turluk bir seans 4 satır üretir.

"Kaç tur yaptım" sorusu satır sayılarak cevaplanır; ayrı bir `round` sütunu
gerekmez.

### 4.5 Sayfa kapanışı

`visibilitychange` → `hidden` anında `navigator.sendBeacon` ile yazılıyor.

**`beforeunload` DEĞİL:** mobil tarayıcılarda güvenilir şekilde
tetiklenmiyor ve sayfa kapanışını geciktirme riski var.

**Supabase istemcisi DEĞİL:** `supabase-js` `fetch` kullanıyor ve sayfa
kapanırken uçuştaki `fetch` iptal edilir. `sendBeacon` tarayıcıya isteği
sayfa öldükten sonra da göndermesi için söz verir.

Bu, PostgREST uç noktasına **elle kurulan** bir `sendBeacon` çağrısı demek:
`${SUPABASE_URL}/rest/v1/focus_sessions`, `Blob` gövdesi
`application/json`, oturum jetonu sorgu başlığı yerine gövdeyle taşınamadığı
için `apikey` ve `Authorization` başlıkları **gerekiyor** — ancak
`sendBeacon` özel başlık kabul etmiyor.

**Çözüm:** `src/app/api/focus-session/route.ts` adında ince bir Next.js
route handler. `sendBeacon` oraya sade JSON gönderir; route, çerezdeki
oturumu `@/lib/supabase/server` ile okuyup satırı yazar. Çerez otomatik
gittiği için başlık sorunu ortadan kalkar ve `user_id` **sunucuda**
belirlenir — istemcinin göndereceği bir `user_id`'ye güvenmek RLS'i
anlamsız kılardı.

Normal çıkış yolları (Bitti / Çık / tur sonu) bu route'u kullanmaz; onlar
mevcut desenle, `supabase-js` üzerinden yazar. `sendBeacon` yalnızca sayfa
kapanışının kurtarma yolu.

`sendBeacon` sessizce başarısız olabilir. Kabul ediliyor — alternatifi sayfa
kapanışını bir ağ isteğine bağlamak, ki bu daha kötü.

---

## 5. Zaman mantığı ve duraklatma

### 5.1 Net süre

Mevcut damga tabanlı desen (arka plan kısıtlamasına dayanıklı) korunuyor ve
üzerine duraklatma ekleniyor:

```
state: { startedAt, pausedTotal, pausedAt | null }

net(now) = elapsed(startedAt, now)
         - pausedTotal
         - (pausedAt ? elapsed(pausedAt, now) : 0)
```

Hepsi `zen.ts` içinde saf fonksiyon, `now` parametre. Mevcut
`elapsedSeconds`'ın negatifi sıfıra kırpma davranışı korunuyor (sistem saati
geri alınırsa sayaç geriye saymasın).

### 5.2 Sekme koruması

Sekme **60 saniyeden uzun** arka planda kalırsa, sayaç o gizlenme anına geri
dönülerek **otomatik duraklar**. Kaybolan süre net'e sayılmaz.

60 saniye eşiği: sekme değiştirip PDF'e bakmak odağın parçası; on dakika
başka bir şey yapmak değil.

### 5.3 Pomodoro fazı

Üç hazır profil, seçim `localStorage`'da saklanıyor:

| Profil | Odak | Kısa mola | Uzun mola (4 turda bir) |
|---|---|---|---|
| 25 | 25 dk | 5 dk | 15 dk |
| 50 | 50 dk | 10 dk | 20 dk |
| 90 | 90 dk | 20 dk | 30 dk |

**Geri sayım bitince kendiliğinden durur, otomatik geçmez.** "Mola başladı"
ekranı gelir ve kullanıcı başlatır. Otomatik geçiş, masa başından kalkmış
kullanıcının molasını sessizce tüketirdi.

### 5.4 Mola sonu bildirimi

**Yalnızca görsel** — ekran arka planı ve metin değişir. Ses yok, tarayıcı
bildirimi yok. İzin akışı gerekmiyor, hiçbir şey bozulmuyor.

---

## 6. Ekran

```
┌─────────────────────────────────┐
│            ODAK                 │
│                                 │
│   Matematik — Limit testi       │
│                                 │
│     [ Serbest ]  [ Pomodoro ]   │  ← oturum başlamadan önce
│          25 · 50 · 90           │  ← pomodoro seçiliyse
│                                 │
│           24:13                 │  ← tabular, accent, glow
│        ● ● ○ ○  tur 2/4         │  ← pomodoro'da
│                                 │
│  ⏸ Duraklat   [Bitti]    Çık    │
│                                 │
│   bugün 1s 42dk odaklandın      │  ← küçük, ink-2
└─────────────────────────────────┘
```

### 6.1 Boşluk sözü korunuyor

`ZenScreen` yorumu bugün şunu yazıyor: "Üçüncü bir seçenek eklemek, modun
kendisini çürütürdü."

Eklenen her şey bu kuralı gözetiyor — ya **oturum başlamadan önce** görünüyor
(mod seçici; sayaç çalışınca kayboluyor) ya da **durum bildiriyor**
(noktalar, bugün toplamı), eylem sunmuyor.

Yeni *eylem* yalnızca bir tane: **Duraklat.** Bu kuralı ihlal etmiyor çünkü
kaçış yolu değil, dürüstlük aracı: kaydedilen sürenin gerçek olmasını o
sağlıyor.

### 6.2 Duraklatılmış görünüm

Sayaç **soluklaşıyor ve glow sönüyor.** Durmuş bir sayacın parlaması yalan
söyler. (Işımanın izinli olduğu dört yerden biri bu sayaç — durdurulduğunda
o izin düşüyor.)

### 6.3 "Bugün toplam"

`focus_sessions`'tan react-query ile okunuyor; oturum bitince invalidate
ediliyor. Gün sınırı **istemcide** türetiliyor — `completed_at` / `0017`
kararıyla tutarlı: damga saklanır, gün saf fonksiyonda hesaplanır.

---

## 7. Test

Proje deseni korunuyor: **saf modül testi, React test kütüphanesi yok.**

`zen.test.ts` genişliyor:

- duraklat → sürdür → net süre doğru mu
- çoklu duraklatma birikimi
- duraklatılmışken `net` sabit kalıyor mu
- sistem saati geri alınırsa (negatif fark sıfıra kırpılıyor mu)
- sekme boşluğunun net'ten düşülmesi (60 sn eşiği: 59 sn sayılır, 61 sn düşer)
- faz geçişi: odak → kısa mola → odak → ... → 4. turda uzun mola
- tur sayacı
- üç profilin (25/50/90) mola sırası
- `formatElapsed` mevcut testleri değişmeden geçiyor

---

## 8. Hata yönetimi

**Kayıt yazılamazsa oturum yine de kapanır** ve toast çıkar. Odaktan çıkmayı
ağa bağlamak, odak modunun yapabileceği en kötü hata olurdu.

`sendBeacon` sessiz başarısız olur; bu kabul ediliyor (bkz. 4.5).

---

## 9. Kapsam dışı (YAGNI)

Bilerek yapılmayanlar:

- **İstatistik sekmesine grafik** — süre görünürlüğü şimdilik yalnızca odak
  ekranındaki "bugün toplam". Veri tabloda birikiyor; grafik istendiğinde
  ayrı bir iş olarak eklenir.
- **Arşivde görev başına süre** — aynı gerekçe.
- **Mola süresi kaydı** — bkz. 4.3.
- **Tam ayarlanabilir pomodoro süresi** — üç profil yetiyor.
- **Ses / tarayıcı bildirimi** — bkz. 5.4.
- **Duraklatılmış oturumun sayfa yenilemesinden sağ çıkması** — kapanışta
  kaydedilip sonlanıyor; `localStorage`'da aktif oturum taşınmıyor.

---

## 10. Dosya listesi

**Yeni:**

- `supabase/migrations/0021_focus_sessions.sql`
- `src/app/api/focus-session/route.ts` (yalnızca `sendBeacon` kurtarma yolu, bkz. 4.5)
- `src/features/zen/useFocusTimer.ts` (eski `useZenTimer.ts` yerine)
- `src/features/zen/sessions.ts`
- `src/features/zen/FocusModeToggle.tsx`
- `src/features/zen/PomodoroDots.tsx`

**Değişen:**

- `src/features/zen/zen.ts` — yorum bloğu yeniden yazılıyor, saf mantık ekleniyor
- `src/features/zen/zen.test.ts` — genişliyor
- `src/features/zen/ZenScreen.tsx` — mod akışı, duraklat, bugün toplamı
- `src/features/zen/zen.css` — duraklatılmış / mola durumları
- `src/lib/db/database.types.ts` — `focus_sessions` tipi
- `src/lib/query/keys.ts` — `qk.focusSessions()`

**Silinen:**

- `src/features/zen/useZenTimer.ts` (yerini `useFocusTimer.ts` alıyor)
