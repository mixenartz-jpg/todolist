-- ═══════════════════════════════════════════════════════════════════
-- 0015 — ALINACAKLAR
-- ═══════════════════════════════════════════════════════════════════
--
-- Tarihsiz iş tutmanın bugüne kadarki tek yolu `tasks.due_date is null`
-- idi: Bugün ekranındaki katlanmış "Bir ara" bölümü ve Planlama'daki
-- "Havuz" aynı satırları gösteriyor.
--
-- Ama oradaki satırlar ÇALIŞMA görevleridir. `start_time`,
-- `duration_minutes`, `category_id`, `goal_id`, `color_slot` taşırlar;
-- `buildWeekPlan` onları haftaya yerleştirir, gün ızgarası saatlerine
-- oturtur, kategori filtresi süzer. "Süt al" bu makinenin içine
-- girdiğinde iki taraf da bozuluyor: alınacak kalem havuzda ders
-- görevlerinin arasında kayboluyor, ders görevleri de alışveriş
-- kalemleriyle seyreliyor.
--
-- ── Neden tasks'a bir `kind` sütunu değil? ──
-- O sütun, tasks'a dokunan HER sorguya bir filtre borcu yazardı:
-- gün ızgarası, hafta planı, havuz, gecikenler, istatistik. Biri
-- unutulduğunda alışveriş kalemi bir çalışma ekranında belirir ve
-- hata sessizdir — kimse "eksik filtre"yi görmez, yalnızca yanlış
-- listeyi görür. Ayrı tablo o borcu yapısal olarak imkânsız kılar.
--
-- ── Neden bir KATEGORİ değil? ──
-- Kategori bir ETİKETTİR, satırın tipini değiştirmez: "Alınacaklar"
-- kategorisindeki bir görev hâlâ görevdir, hâlâ havuzda görünür ve
-- hâlâ saat/hedef alanlarını taşır. İstenen ayrım etiket değil, tür.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.shopping_items (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Sınır `tasks.title` ve `week_goals.title` ile aynı (120). Farklı
  -- bir sayı seçmek, kullanıcıya iki ekranda iki farklı sınır
  -- öğretmek olurdu.
  title text not null check (length(trim(title)) between 1 and 120),

  -- Kalemin alındığı an.
  --
  -- `week_goals.completed_at` ile AYNI gerekçe ve bilerek aynı ad:
  -- arşiv "artık takip etmiyorum" (vazgeçme), tamamlanma "bunu
  -- bitirdim" (başarı). Burada istenen ikincisi — işaretlenen kalem
  -- LİSTEDE KALIR, yalnızca üstü çizili görünür ve kullanıcı "bunu
  -- almış mıydım?" sorusunun cevabını görür. Silmek ayrı bir karardır.
  --
  -- `boolean` değil `timestamptz`: "ne zaman alındı" bilgisi bedavaya
  -- gelir (week_goals'taki aynı gerekçe).
  completed_at timestamptz,

  -- Yeni kalem listenin SONUNA eklensin diye. Kullanıcı arayüzünde
  -- yeniden sıralama YOK; bu sütun yalnızca ekleme sırasını kararlı
  -- kılar. `created_at` tek başına yetmezdi: aynı saniyede eklenen iki
  -- kalemin sırası sorgudan sorguya değişebilirdi.
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shopping_items is
  'Tarihsiz alınacaklar listesi. Görev DEĞİLDİR: saati, kategorisi, hedefi ve tarihi yoktur.';
comment on column public.shopping_items.completed_at is
  'Kalemin alındığı an. Arşiv değil bitirme; işaretlenen kalem listede kalır.';

-- Ekranın TEK sorgu şekli: "bu kullanıcının tüm kalemleri, kendi
-- sırasıyla". Tarih sütunu olmadığı için aralık sorgusu da yok —
-- week_goals_user_week_idx'in tarihsiz karşılığı.
create index if not exists shopping_items_user_sort_idx
  on public.shopping_items (user_id, sort_order, created_at);


-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════
-- 0002'nin üç kuralı: `(select auth.uid())` alt sorgu formu,
-- `to authenticated` kapsamı, INSERT/UPDATE'te `with check`.

alter table public.shopping_items enable row level security;

create policy shopping_items_select on public.shopping_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy shopping_items_insert on public.shopping_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy shopping_items_update on public.shopping_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy shopping_items_delete on public.shopping_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- Trigger'lar
-- ═══════════════════════════════════════════════════════════════════
-- İstemci `user_id` göndermez; değer sunucuda oturumdan damgalanır
-- (0003). `updated_at` de aynı yerden bakılır.

create trigger shopping_items_stamp_user_id
  before insert on public.shopping_items
  for each row execute function public.stamp_user_id();

create trigger shopping_items_touch_updated_at
  before update on public.shopping_items
  for each row execute function public.touch_updated_at();
