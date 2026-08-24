-- ═══════════════════════════════════════════════════════════════════
-- 0013 — Göreve kendi rengi
--
-- BİR KEZ ÇALIŞTIRIN. `add column` kullanır; ikinci çalıştırma
-- "already exists" hatası verir (0001–0012 de böyledir).
--
-- ── Kategori rengi neden YETMEDİ? ──
-- 0008 rengi KATEGORİYE bağladı ve gerekçesi sağlamdı: renk bir
-- kimliktir ve o kimliği taşıyan şey kategoridir. Ama zaman ızgarası
-- (0006'nın start_time'ı üzerine kurulan yüzey) bu varsayımı kırdı:
-- ızgarada renk artık "bu iş hangi kategoriden" değil, "bu blok
-- diğerlerinden nasıl ayrılıyor" sorusunu cevaplıyor. Aynı kategoriden
-- beş bloğu yan yana koyduğunuzda kategori rengi hiçbir şeyi ayırmaz.
--
-- Kategoriyi DEĞİŞTİRMEK bir çözüm değildi: kategori ay dağılımını
-- besliyor ve görsel bir ayrım uğruna kategori uydurmak o grafiği
-- yalancı yapardı.
--
-- ── Neden NULLABLE ve varsayılansız? ──
-- null = "kategorinden devral" ve bu BİRİNCİ SINIF bir durumdur —
-- mevcut görevlerin tamamı ve gelecekte oluşturulacakların çoğu böyle
-- kalacak. `not null default 0` yazmak her görevi sessizce MAVİ yapar
-- ve kategori renginin devralınması diye bir şey kalmazdı.
-- (start_time'ın null olmasıyla aynı ruhta — 0006.)
--
-- ── Neden yine 8 slotluk palet? ──
-- categories.color_slot, plan_goals.color_slot, week_goals.color_slot
-- ve routines.color_slot ile AYNI kısıt. Serbest hex gerekçesi
-- src/lib/ui/colors.ts'in başında: palet koyu zeminde kontrast ve renk
-- körlüğü ayrımı için doğrulanmıştır ve colors.contrast.test.ts onu
-- her `npm test`te ölçer. Açık uçlu bir seçici o garantiyi çöpe atardı.
-- ═══════════════════════════════════════════════════════════════════

alter table public.tasks
  add column color_slot smallint
    check (color_slot is null or color_slot between 0 and 7);

comment on column public.tasks.color_slot is
  'Görevin KENDİ rengi (0..7, src/lib/ui/colors.ts paleti). null → kategori renginden devralınır. Kategori de yoksa nötr.';

-- Yeni index YOK — 0006 ve 0008'deki gerekçenin aynısı. Hiçbir sorgu
-- bu sütunla FİLTRELEMİYOR: useTasks() tüm görevleri tek seferde çeker
-- ve renk çözümü istemcide, bellekte yapılır (src/features/tasks/color.ts).

-- RLS DEĞİŞMEZ: mevcut tasks policy'leri satırın tamamını kapsar,
-- sütun bazlı değildir.
